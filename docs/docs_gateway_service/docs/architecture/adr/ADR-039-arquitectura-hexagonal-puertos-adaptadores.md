# ADR-039 — Lógica desacoplada de infraestructura: repositorios por dominio

## Estado
Aceptado

## Contexto

El gateway Python original mezcla lógica de negocio con infraestructura: los
handlers acceden directamente a `sqlite3`, redis-py y paho-mqtt sin capa
intermedia. El resultado es que cambiar la base de datos, añadir un test
unitario o implementar el modo sombra (Plan/Apply de ADR-038) requieren tocar
los handlers. Ese acoplamiento bloquea la migración.

El Logic Engine es la oportunidad de no repetir ese error. Esta ADR fija la
convención de capas que se aplica desde el código ya escrito en fase 2
(`internal/repo/sqlite`, `internal/repo/status`, `internal/repo/strategy`) y
que se mantiene para el resto de repositorios y handlers.

## Decisión

El Logic Engine sigue una arquitectura por capas con tres reglas de
dependencia. La regla central es:

> Los handlers (lógica de negocio) no abren conexiones a SQLite ni a Redis.
> Reciben repositorios por inyección. Los repositorios desacoplan a los
> handlers de los detalles de driver y de la topología de bases.

### Estructura adoptada

```
internal/
  repo/
    sqlite/        ← infra compartida (Open, ExecWithRetry, migrations,
                     pragmas WAL, detección busy). NO conoce dominios.
    cache/         ← cliente Redis y constructores de claves.
    nodes/         ← repo de dominio: nodes.db (5 tablas)
    status/        ← repo de dominio: node_status.db (3 tablas)
    strategy/      ← repo de dominio: node_strategy.db (2 tablas)
    alarms/        ← repo de dominio: node_alarms.db (2 tablas)
    consumptions/  ← repo de dominio: node_consumptions.db (9 tablas)

  domain/          ← tipos y reglas de negocio puras (sin I/O)
  dispatch/        ← dispatcher y registro de handlers
  handlers/<area>/ ← handlers por dominio (consumen repos por interfaz)
  runtime/         ← concurrencia, partitioning por node_id
  server/          ← servidor gRPC, wiring de dependencias
```

### Regla de dependencias

```
domain                → (nada de infra)
repo/sqlite           → database/sql (std)  ← infra compartida
repo/cache            → go-redis            ← infra compartida
repo/<dominio>        → repo/sqlite, repo/cache, domain
handlers/<area>       → domain, interfaz pública del repo de dominio
                        (no importa la struct concreta del repo)
dispatch              → domain, handlers
server                → repo/*, dispatch, runtime  ← único lugar de wiring
```

`server/wiring.go` es el único archivo que conoce toda la topología
concreta: abre las bases SQLite, instancia el cliente Redis, construye los
repositorios y los inyecta en los handlers.

### Repositorios como contratos, no como implementación

Cada paquete de repositorio (`internal/repo/<dominio>/`) expone:

1. **Una struct concreta** (`Repo`) con un constructor `New(db *sql.DB,
   cache Cache) (*Repo, error)`.
2. **Una interfaz pública** (`Repository` o nombre específico del dominio)
   que enumera los métodos que los handlers van a invocar.
3. **Una interfaz local `Cache`** mínima con solo `Set`/`Delete`/`Get`
   según necesite el dominio. Es válido que cada repo declare su propio
   subset; Go promueve interfaces pequeñas cerca del consumidor.

Los handlers reciben la **interfaz**, no la struct. Esto permite:

- Tests unitarios con un fake en memoria que implementa la interfaz.
- Decorar el repo con `Plan/Apply` (ADR-038) sin tocar al handler.
- Cambiar el backend (ej. PostgreSQL en cloud edition, ADR-040) sin que el
  handler se entere.

Ejemplo (lo que implementa hoy `internal/repo/status/repo.go`):

```go
package status

type Repository interface {
    PutLedStatusDimming(ctx context.Context, nodeID int64, ledStatus, dimming int) error
    PutRGBStatus(ctx context.Context, nodeID int64, ledStatus int, rgb [3]int) error
    UpdateLastSeen(ctx context.Context, nodeID int64) error
    GetLastLedStatusDimmingByNodeID(ctx context.Context, nodeID int64) (LedStatusDimming, bool, error)
    // ...
}

type Cache interface {
    Set(ctx context.Context, key string, value any) error
    Delete(ctx context.Context, key string) error
}

type Repo struct { ... }   // implementa Repository
func New(db *sql.DB, cache Cache) (*Repo, error) { ... }
```

El handler consumidor recibe `status.Repository`, no `*status.Repo`.

### Plan/Apply como decorador, no como modificación del repo

Para satisfacer el modo sombra (ADR-038), cada repo se puede envolver con un
decorador que captura las operaciones en lugar de aplicarlas:

```
server/wiring.go (modo normal):    handler ← status.Repository ← *status.Repo
server/wiring.go (modo sombra):    handler ← status.Repository ← *PlanningRepo
```

El `PlanningRepo` es un decorador específico por dominio (o genérico vía
interfaz) que vive en `internal/repo/planning` y no necesita modificar al
`status.Repo` original: solo intercepta las llamadas y las acumula en un
`Plan`. El handler no cambia.

### `repo/sqlite` como infra compartida, no como adaptador

El paquete `internal/repo/sqlite` (`Open`, `ExecWithRetry`, `Migrate`,
`IsBusyError`, pragmas WAL) es **infra compartida** entre todos los repos
de dominio. No es un repo de dominio en sí. Sigue una sola regla:

> No contiene SQL específico de ningún dominio.

Las migraciones por base se declaran en `migrations.go` como tablas
agrupadas por nombre lógico de base. Si se añade una columna a una tabla,
la nueva migración se referencia desde el repo de dominio que la usa.

### Prohibiciones explícitas

1. Ningún archivo bajo `internal/handlers/` o `internal/domain/` puede tener
   `import "database/sql"`, `import "modernc.org/sqlite"`, ni
   `import "github.com/redis/go-redis/..."`.
2. Ningún handler puede llamar a `sql.Open` o equivalente: las conexiones se
   crean en `server/wiring.go`.
3. Los repos no devuelven `*sql.Rows` ni tipos del driver: convierten a
   tipos del dominio y devuelven structs propias.

### Verificación en CI

Se añade un test (`internal/repo/lint_test.go` o regla `depguard`) que falla
si los paquetes `domain` o `handlers/*` importan algún paquete prohibido.
Esto hace la convención auto-verificable y evita la degradación gradual.

## Consecuencias

- Los repos ya escritos (`status`, `strategy`) cumplen esta ADR salvo por la
  declaración explícita de la interfaz `Repository`. Se añade en commits
  posteriores antes de empezar los handlers que los consumen.
- Los handlers son testeables con fakes en memoria sin necesidad de SQLite ni
  Redis en CI.
- El modo sombra (Plan/Apply) se implementa como decorador, sin cirugía en
  los handlers.
- Añadir un nuevo backend (PostgreSQL, DynamoDB) es crear un paquete sibling
  (`internal/repo/postgres`) que implementa la misma interfaz `Repository`.
  El dominio no cambia.
- El `server/wiring.go` crece con cada handler nuevo. Es deliberado: la
  topología concreta vive en un único lugar trazable.

## Relación con otros ADRs

- ADR-034: contrato gRPC; el `server` conecta gRPC con el dominio a través de
  los repos.
- ADR-038: Plan/Apply requerido por el modo sombra; esta ADR define cómo se
  implementa ese patrón sin contaminar los handlers.
- ADR-040: la capa de repositorios es el punto donde se aplica el sharding
  por `node_id`; el dominio no sabe si hay uno o cien shards.
