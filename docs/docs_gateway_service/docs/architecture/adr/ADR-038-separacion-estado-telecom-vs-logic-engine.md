# ADR-038 — Separación de estado: telecom vs Logic Engine durante la convivencia

## Estado
Aceptado

## Contexto

Durante la convivencia entre el gateway Python y el Logic Engine
(definida en ADR-035: sombra → canary → takeover), ambos componentes
viven en la misma máquina y comparten infraestructura: las 5 bases
SQLite, una instancia Redis, los puertos MQTT y la red Wirepas. Si no
delimitamos qué responsabilidad sobre el estado tiene cada uno, el
sistema entra fácilmente en doble escritura, locks bloqueantes y
divergencias silenciosas que invalidan la comparación de paridad.

Esta ADR fija qué estado es responsabilidad de telecom (queda en el
gateway Python y, en el futuro, en el adaptador telecom equivalente),
qué estado es responsabilidad del Logic Engine, y qué reglas se
aplican durante cada modo de convivencia.

## Decisión

### Mapa de responsabilidades

#### Estado de telecomunicaciones (queda en el gateway Python)

| Estado | Detalle | Persistencia |
|---|---|---|
| Conexiones cloud MQTT | sockets activos, sesión, ack pendientes, retries | memoria + paho-mqtt |
| Conexiones MQTT local | broker local, suscripciones del lado del nodo | memoria |
| Subscripciones cloud activas | mapa `topic → callback`, recordatorio de re-suscripción tras reconexión | memoria |
| Wirepas Network Interface (WNI) | sink, network, encrypt, callbacks | memoria + librería wmm |
| Credenciales | broker, usuario, contraseña, sink id, network id | `config/config_file.py` |
| Tracking de delivery | deque de mensajes pendientes, retry thread | memoria + ficheros JSON locales |
| Identidad del gateway | `GW_ID` como configuración del proceso | env / config |

Ninguna de estas piezas está en SQLite ni en Redis. Permanecen como
estado del proceso telecom. El Logic Engine no las conoce ni puede
modificarlas directamente; las afecta sólo emitiendo acciones
(`Subscribe`, `Unsubscribe`, `PublishCloud`, `SendWirepas`,
`PublishLocal`).

#### Estado de negocio (pasa a ser del Logic Engine)

| Dominio | Tablas SQLite | Claves Redis |
|---|---|---|
| Discovery y vida del nodo | `node_discovery`, `lost_nodes`, `lumos_maxima`, `movement_sensor`, `node_neighbors` (`nodes.db`) | `node:discovery:*`, `node:lost:*`, `node:lumos:*`, `node:movement_sensor:*` |
| Estado funcional del nodo | `led_status_dimming`, `rgb_status`, `last_seen` (`node_status.db`) | `node:status:*`, `node:rgb_status:*`, `node:last_seen:*` |
| Estrategia y kit | `strategy_status`, `kit_status` (`node_strategy.db`) | `node:strategy:*`, `node:kit:*` |
| Alarmas | `alarm_status`, `alarm_list_integers` (`node_alarms.db`) | `node:alarm:*`, `node:list_alarm_integers:*` |
| Consumos crudos y coeficientes | 9 tablas de `node_consumptions.db` (raw, coef, flags, lost) | `node:consumption:{measurement}:*` |
| Reloj funcional de los watchdogs | (no persistido; en memoria del Logic Engine) | — |

Todas las tablas y claves listadas pertenecen funcionalmente al
Logic Engine. La convivencia regula quién escribe en cada momento, no
quién es responsable.

#### Configuración compartida

`GW_ID`, `LATITUDE`, `LONGITUDE`, `TIMEZONE` viajan con la lógica
porque el Logic Engine los usa para `NodeRequestUnixtimeHandler`,
`SendPositioning`, conversión de estrategias UTC, etc. El resto de
config queda en telecom.

### Reglas por modo de convivencia

#### Modo sombra

- **Python escribe**: sí, exactamente como hoy.
- **Logic Engine escribe**: no. Construye el plan de escrituras
  (`Plan()`) pero no lo aplica (`Apply()`). El comparador (ADR-036)
  inspecciona el plan en memoria.
- **Lecturas**: ambos pueden leer libremente. El Logic Engine puede
  abrir las mismas bases en modo lector y consultar Redis sin
  restricciones.
- **Acciones de salida**: Python publica/envía como hoy; las acciones
  computadas por el Logic Engine no se ejecutan.

Riesgo principal: ninguno funcional, sólo coste de cómputo y latencia.

#### Modo canary

- **Mensajes canary**:
  - Python no procesa el mensaje en absoluto (lo identifica y desvía).
  - El Logic Engine procesa, escribe SQLite/Redis y devuelve acciones.
  - El gateway Python ejecuta esas acciones por cuenta del Logic Engine.
- **Mensajes no canary**: Python procesa íntegro como hoy.
- **Doble escritura**: prohibida. Cada mensaje genera escrituras de un
  solo lado.
- **Lecturas durante canary**: si Python lee un registro escrito por el
  Logic Engine (o viceversa) ambos deben ver el mismo dato. SQLite
  garantiza esto con WAL + `busy_timeout=30s`. Redis lo garantiza
  natural\-mente.
- **Concurrencia**: ADR-020 (orden por `node_id`) sigue vigente. El
  ruteo canary debe partir por `node_id` o por familia, nunca por
  porcentaje aleatorio sin afinidad de nodo.

Riesgo principal: lock contention en SQLite si Python y Logic Engine
escriben simultáneamente en bases distintas con transacciones largas.
Mitigación: transacciones cortas, WAL, `busy_timeout` ya configurado.

#### Modo takeover

- **Familia migrada**: Python sólo actúa como adaptador telecom. El
  Logic Engine es el único writer.
- **Familias aún no migradas**: Python sigue escribiendo. La frontera
  va por familia, no por base.
- **Una vez todas las familias en takeover**: Python deja de tocar
  SQLite y Redis salvo para suscripciones de telecom (que se mueven a
  estado interno del proceso, no a las bases). Se elimina el código de
  escritura Python en commits separados.

### Suscripciones MQTT como caso especial

Las suscripciones (`cl-req/n/*`, `alarm-res/n/*`) son responsabilidad
de telecom; viven en su `paho-mqtt` client. Pero los handlers de
discovery (`CheckNodeHandler`) y de borrado de nodo
(`DeleteOldNodeHandler`) deciden cuándo añadirlas y quitarlas. El
Logic Engine no las gestiona directamente: emite acciones `Subscribe`
y `Unsubscribe` que telecom ejecuta.

Durante la convivencia esto significa:

- en sombra, las suscripciones siguen gestionadas exclusivamente por
  Python; las acciones `Subscribe`/`Unsubscribe` que produce el Logic
  Engine no se ejecutan, sólo se comparan;
- en canary, las acciones de suscripción producidas por mensajes
  canary se ejecutan en el cliente MQTT de telecom igual que cualquier
  otra acción;
- en takeover, idéntico al canary pero a nivel de familia completa.

No se permite que el Logic Engine abra su propio cliente MQTT durante
la convivencia. La centralización de las suscripciones en un único
cliente evita estados inconsistentes (mensajes recibidos por una sesión
y procesados por otra).

### Estado del watchdog

Los dos watchdogs actuales (keepalive y consumption_lost) siguen
corriendo en el gateway Python durante toda la fase sombra y la fase
canary inicial. La razón: si ambos lados ejecutan watchdogs sobre las
mismas tablas, doblamos efectos sobre nodos que cumplen condición
(doble `DEATH_NODE` publicado, doble `lost_nodes` insertado).

Cuando una familia se migre a takeover, el watchdog correspondiente:

- se mueve al Logic Engine;
- se desactiva en Python con un flag explícito;
- se valida en sombra primero, ejecutando ambos en paralelo y
  registrando que el Logic Engine produciría las mismas acciones que
  Python. Sólo cuando esa paridad es estable se desactiva el lado
  Python.

### Reglas operativas concretas

1. **Sólo un writer por mensaje**. Sombra y canary deben garantizar que
   cada mensaje es escrito por un solo lado.
2. **Reads sin coordinación**. Ambos lados pueden leer en cualquier
   momento; SQLite (WAL) y Redis lo soportan.
3. **Sin escrituras transitivas inesperadas**. El Logic Engine no
   escribe en BDs si está en modo sombra, ni siquiera por
   conveniencia (cache pre-warming, métricas internas, etc.).
4. **Cualquier escritura del Logic Engine deja huella en logs**. Para
   que el modo canary sea auditable, cada escritura emitida lleva
   `request_id` correlacionado con el `LogicRequest` que la generó.
5. **No hay doble watchdog**. Mientras Python tenga el watchdog activo
   para una familia, el Logic Engine no lo ejecuta sobre la misma
   familia. Hay un periodo de paridad en sombra antes de transferir.

## Consecuencias

- El Logic Engine necesita una capa de repositorios con dos modos de
  ejecución: `Plan()` (no aplica, devuelve la lista de operaciones que
  haría) y `Apply()` (las ejecuta). Sin esa separación el modo sombra
  no puede cumplir la regla de "sólo Python escribe".
- El gateway Python necesita identificar los mensajes canary antes de
  procesarlos para evitar la doble escritura. La identificación tiene
  que ser barata (lookup por `msg_type` o por `node_id`) y vivir en el
  punto de entrada (`on_message`/`on_data_rx`).
- La transición de cada watchdog implica un mini-proyecto: paridad en
  sombra, movimiento del código al Logic Engine, desactivación
  explícita en Python. Está cubierta por ADR-035 dentro del
  flujo "sombra → canary → takeover" aplicado al watchdog en
  cuestión.
- En el estado final (post-takeover global), el gateway Python pierde
  toda lógica de negocio: queda como un proceso de telecom puro que
  recibe bytes, llama gRPC y ejecuta acciones. Esa simplificación es
  el resultado natural de aplicar las reglas anteriores.

## Relación con otros ADRs

- ADR-009: arquitectura modular con core compartido.
- ADR-034: delegación de lógica de negocio al Logic Engine vía gRPC.
- ADR-035: estrategia de integración sombra/canary/takeover.
- ADR-036: comparador de paridad (consume el `Plan()` definido aquí).
- ADR-037: tabla de tolerancias.
- `docs/09-coupling-points.md`: el reparto de archivos físicos entre
  gateway y paquete que esta ADR formaliza desde la perspectiva de
  estado.
