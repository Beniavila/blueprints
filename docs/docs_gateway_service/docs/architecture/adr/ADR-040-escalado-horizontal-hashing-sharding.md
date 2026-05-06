# ADR-040 — Escalado horizontal: consistent hashing por node_id y sharding de BD

## Estado
Aceptado

## Contexto

El Logic Engine se despliega inicialmente como un único proceso (edición
local, un gateway por máquina). Sin embargo, existen instalaciones con miles
de nodos por gateway y requisitos de alta disponibilidad que demandan escalar
horizontalmente: múltiples pods del Logic Engine procesando en paralelo.

El principal riesgo del escalado horizontal en este sistema es violar
ADR-020 (orden de procesamiento por `node_id`): si dos pods procesan mensajes
del mismo nodo simultáneamente, las escrituras en SQLite/Redis pueden
intercalarse y producir estados inconsistentes o efectos duplicados.

Adicionalmente, el rendimiento de SQLite degrada con bases de datos grandes
(>10 M filas por tabla) o con contención de escritura alta. Para la edición
cloud, se necesita una estrategia de partición de datos que mantenga la
latencia de lectura/escritura por debajo de 5 ms p99 independientemente del
tamaño del parque.

## Decisión

Se adoptan dos mecanismos complementarios:

1. **Consistent hashing por `node_id`** para el balanceo de carga entre pods.
2. **Sharding de base de datos por `node_id`** para distribuir el volumen de
   datos entre instancias de base de datos.

Ambos usan la misma función de hash y el mismo espacio de claves, de forma que
un pod siempre accede a los shards que le corresponden y nunca hace queries
cruzadas.

### Consistent hashing para el balanceo de pods

El load balancer (o el cliente gRPC en el gateway Python) usa consistent
hashing sobre `node_id` para determinar a qué pod del Logic Engine enviar
cada `LogicRequest`:

```
shard_index = hash(node_id) % N_SHARDS
pod = shard_to_pod_map[shard_index]
```

Propiedades garantizadas:

- **Afinidad de nodo**: todos los mensajes de un `node_id` dado van siempre
  al mismo pod mientras el número de pods no cambie.
- **ADR-020 preservado**: el orden de procesamiento por nodo se mantiene
  porque un solo pod serializa los mensajes de cada nodo (mediante la cola
  por `node_id` de `runtime/partitioning.go`).
- **Rebalanceo mínimo**: cuando se añade o elimina un pod, solo se reasignan
  los shards del pod afectado. El resto del parque no se ve impactado.

El algoritmo de hashing es `xxhash` (no criptográfico, ~10 GB/s, Go nativo).
El número de shards virtuales es 1024 por defecto; se mapean a pods físicos.

#### Implementación en el cliente (gateway Python)

El gateway Python (adaptador telecom) construye el canal gRPC hacia el pod
correcto usando el `node_id` extraído del mensaje antes de llamar a
`HandleEvent`. El mapa `shard → endpoint` se carga desde configuración y
se refresca sin reinicio.

Para la edición local (un solo pod), el mapa tiene solo una entrada y el
hashing es un no-op.

### Sharding de base de datos

Cada pod del Logic Engine es dueño exclusivo de un rango de shards de datos.
No hay cross-shard queries desde los handlers (regla arquitectural).

#### Edición local (un pod)

Un único conjunto de bases SQLite (las 5 ya definidas en
`docs/06-database-schema.md`) con todas las tablas. Sin sharding. El paquete
`internal/repo/sqlite` (ADR-039) abre cada base con WAL directamente. Esta es
la configuración por defecto y la única soportada durante la convivencia con
el gateway Python.

#### Edición cloud (N pods)

Cada pod tiene asignados `1024/N` shards. La base de datos puede ser:

- **SQLite por shard**: N × conjuntos de bases, uno por shard, en un volumen
  persistente del pod. Simple, sin dependencias externas, adecuado hasta
  ~100 nodos por shard.
- **PostgreSQL particionado**: una instancia compartida (o RDS) con tablas
  particionadas por `shard_index`. Adecuado para parques >10k nodos. Se
  expone como `internal/repo/postgres` implementando las mismas interfaces
  `Repository` de cada dominio (ADR-039).

La selección del backend se hace en `server/wiring.go` según la variable de
entorno `STORAGE_MODE=sqlite_local|sqlite_sharded|postgres`. Los handlers no
ven la diferencia: reciben `status.Repository`, `strategy.Repository`, etc.

#### Regla: sin queries cross-nodo desde handlers

Los handlers no pueden hacer queries que crucen `node_id` (ni joins entre
nodos, ni agregaciones globales). Esta restricción es la que hace posible el
sharding: cada operación de un handler toca solo las filas de un nodo.

Las queries globales (watchdogs que escanean todos los nodos para detectar
inactivos) se ejecutan en el pod coordinador o mediante un proceso separado
que sí tiene visibilidad de todos los shards, pero no desde los handlers de
mensajes.

#### Redis Cluster con hash tags

En la edición cloud, Redis se sustituye por Redis Cluster. Las claves siguen
el patrón:

```
{node_id}:status
{node_id}:strategy
{node_id}:last_seen
```

El `{node_id}` como hash tag garantiza que todas las claves de un nodo van
al mismo slot de Redis Cluster, eliminando operaciones multi-key cross-slot.

### Configuración por entorno

| Variable | Local | Cloud |
|---|---|---|
| `STORAGE_MODE` | `sqlite_local` | `sqlite_sharded` o `postgres` |
| `NUM_SHARDS` | 1 | 1024 (default) |
| `POD_SHARDS` | `0-1023` | rango asignado al pod (ej. `0-255`) |
| `REDIS_MODE` | `single` | `cluster` |
| `LB_ENABLED` | `false` | `true` |

### Watchdogs y coordinación

Los watchdogs (keepalive, consumption_lost) necesitan escanear todos los nodos
y no pueden ejecutarse en cada pod de forma independiente (doble disparo).
Dos opciones según el tamaño del parque:

1. **Pod coordinador designado**: uno de los pods asume el rol de coordinador
   y ejecuta los watchdogs sobre todos los shards. El rol se elige por
   leader election (etcd o Redis RedLock).
2. **Watchdog por shard**: cada pod ejecuta el watchdog solo para sus shards.
   Funciona cuando los watchdogs no necesitan visibilidad cross-shard (que es
   el caso actual: la condición de muerte de un nodo depende solo de ese nodo).

Durante la convivencia (shadow/canary), los watchdogs siguen en Python y esta
decisión no se aplica. Se aplica al migrar el watchdog en takeover.

## Consecuencias

- **Edición local no cambia nada**: el sharding es un no-op con un solo pod.
  La complejidad adicional vive exclusivamente en `server/wiring.go` y en
  los adaptadores; los handlers y el dominio no la ven.
- **Los handlers deben ser stateless por diseño**: si un handler acumula
  estado local entre llamadas del mismo nodo, ese estado se pierde al
  rebalancear. Los handlers ya son stateless por diseño (ADR-039); esta ADR
  lo refuerza como requisito de escalado.
- **El gateway Python necesita un cliente gRPC con hashing**: se añade un
  módulo `clients/logic_engine_client.py` que encapsula la selección de
  endpoint. En edición local apunta a `localhost:50051` directamente.
- **Rebalanceo con cuidado**: durante un rebalanceo (añadir/quitar pod), los
  mensajes de los shards reasignados deben drenarse antes de redirigir.
  El pod entrante no acepta nuevos mensajes de un shard hasta confirmar que
  el pod saliente ha vaciado su cola para ese shard.
- **No se implementa hoy**: esta ADR fija el diseño para edición cloud futura.
  La implementación se activa en la fase de escalado (ROADMAP fase 9+).
  Hoy el código asume siempre `STORAGE_MODE=sqlite_local` y `NUM_SHARDS=1`.

## Relación con otros ADRs

- ADR-020: el consistent hashing preserva el orden por nodo al garantizar
  afinidad entre `node_id` y pod.
- ADR-039: los repositorios (`internal/repo/<dominio>`) son el único lugar
  donde se implementa el sharding; el dominio y los handlers reciben
  interfaces y no conocen la topología.
- ADR-035/038: durante la convivencia (shadow/canary/takeover) se usa siempre
  `sqlite_local`. El sharding se activa post-takeover completo.
- `runtime/partitioning.go`: la serialización por `node_id` dentro de un pod
  es el complemento intra-pod del hashing inter-pod.
