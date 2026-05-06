# ADR-036 — Sistema de comparación de paridad Python ↔ Logic Engine

## Estado
Aceptado

## Contexto

ADR-035 establece que la migración pasa primero por un **modo sombra** en el
que el gateway Python procesa cada mensaje como hasta ahora y, en paralelo,
el Logic Engine recibe el mismo evento y produce su propio resultado sin
ejecutar efectos. Ese modo solo aporta valor si existe un mecanismo
sistemático que detecte cuándo Python y Logic Engine se comportan distinto.

Sin un sistema de paridad, el modo sombra produce ruido (logs sueltos por
handler, sin agregación, imposible de auditar). Y sin auditoría no podemos
declarar que una familia de mensajes está lista para promover a canary o
takeover.

Esta ADR fija qué comparamos por cada mensaje, en qué formato, dónde se
almacena el diff y qué criterios convierten una diferencia en bloqueante.

## Decisión

Se introduce un **comparador de paridad** del lado del gateway Python,
activado por `SHADOW_MODE=true`. Por cada mensaje procesado, el comparador
ejecuta los siguientes pasos en este orden:

1. captura el resultado funcional del gateway Python (acciones efectivas
   ejecutadas + escrituras observadas en repositorios);
2. construye el `LogicRequest` canónico equivalente al mensaje;
3. invoca el Logic Engine (gRPC) y captura su `HandleResponse` + las
   escrituras simuladas (que no se aplican en modo sombra);
4. compara ambos resultados según las reglas definidas más abajo;
5. emite una entrada al diff log si hay diferencia, con clasificación.

### Qué se compara

Por cada mensaje se comparan tres dimensiones:

- **Acciones de salida**: lista de acciones publicadas/enviadas al
  exterior. Para cada acción se compara `kind`, `topic`/`node_id`,
  `payload` (bytes) y `qos`/`endpoints` cuando apliquen.
- **Escrituras a SQLite**: tablas y registros mutados, con clave primaria
  y campos modificados. No se compara `created_at`/`updated_at` salvo
  que el handler los use como dato funcional.
- **Escrituras a Redis**: claves mutadas y su nuevo valor (JSON
  normalizado). Se ignoran las claves de cache puro que solo replican
  estado de SQLite.

Las escrituras del lado Logic Engine en modo sombra se inspeccionan en
memoria (sin ejecutar) capturando el set de operaciones que la
implementación habría hecho. Esto requiere que el Logic Engine
exponga sus repositorios bajo una capa que distinga `Plan()` de
`Apply()`. La capa concreta se diseña en la fase de repositorios
(ROADMAP fase 2) y la decisión queda anclada aquí.

### Comparación determinista

Antes de comparar:

- las listas de acciones se ordenan por una clave estable
  `(kind, topic|node_id, payload_hex)` para evitar falsos positivos por
  orden de emisión;
- los payloads se comparan como bytes exactos en hex; la
  representación textual se evita;
- los floats se comparan con tolerancia configurable por familia (ver
  ADR de tolerancias);
- los timestamps generados por reloj en el momento del procesamiento
  (`time.now()`) se reemplazan por un reloj inyectado idéntico para los
  dos lados antes de comparar; cualquier divergencia tras ese
  reemplazo se considera real.

### Clasificación de diferencias

Cada diff se etiqueta con una de tres clases:

- **bloqueante**: diferencia funcional real. Acciones distintas,
  payloads distintos en bytes (fuera de tolerancia), escrituras
  distintas. Impide promover la familia a canary.
- **tolerable**: diferencia esperada por la naturaleza del cálculo,
  documentada en la tabla de tolerancias (sunrise/sunset ±1 min,
  coeficientes polyfit float, timing de watchdogs). No bloquea pero se
  contabiliza.
- **sin_diff**: ambos lados producen el mismo resultado.

La tabla de tolerancias y el listado exhaustivo de qué casos son
tolerables vive en un ADR aparte (próximo). El comparador consume esa
tabla; no la define.

### Formato del diff log

Cada diff se escribe como una línea JSON al fichero
`logs/shadow-diff-{YYYY-MM-DD}.jsonl` con la estructura:

```json
{
  "ts": "2026-04-27T10:14:32.123Z",
  "request_id": "uuid",
  "channel": "wirepas|cloud_node|cloud_gw",
  "node_id": "12345",
  "msg_type": 7,
  "event_type": "NODE_MESSAGE",
  "classification": "blocking|tolerable|none",
  "tolerance_rule": "polyfit_float|sunrise_sunset|...",
  "diff": {
    "actions": {
      "python":   [...],
      "go":       [...],
      "missing_in_go":     [...],
      "missing_in_python": [...],
      "mismatched":        [...]
    },
    "sqlite_writes": { ... },
    "redis_writes":  { ... }
  }
}
```

Las entradas con `classification = "none"` no se escriben para evitar
saturar el log; solo se incrementa un contador.

### Métricas agregadas

Se exponen métricas Prometheus (cuando exista la integración) y, en su
ausencia, un contador en memoria volcado al log cada minuto:

- `parity_messages_total{channel,msg_type}`
- `parity_diffs_total{channel,msg_type,classification,tolerance_rule}`
- `parity_blocking_total{channel,msg_type}`
- `parity_compare_latency_seconds` histograma del coste extra del modo
  sombra.

### Política de retención y privacidad

- El diff log se rota diariamente y se conserva 30 días por defecto.
- Los payloads pueden contener identificadores de nodo/instalación pero
  no datos personales; aún así se evita exportar el log fuera del
  entorno operativo sin anonimización.
- En entornos con muchos nodos, se permite muestrear (`SHADOW_SAMPLE_RATE`)
  para no saturar disco. Si el muestreo está activo, las métricas
  agregadas siguen contando todos los mensajes.

### Criterio para promover de sombra a canary

Una familia (combinación `channel × msg_type`) se considera apta para
canary cuando, durante 7 días continuos:

- `parity_blocking_total{channel,msg_type} == 0`;
- el ratio `parity_diffs_total / parity_messages_total` por familia es
  ≤ 0.1% considerando solo clasificaciones bloqueantes;
- las clasificaciones tolerables están todas justificadas por una
  regla de tolerancia conocida (no hay categoría "otros").

## Consecuencias

- El gateway Python necesita un módulo nuevo (`services/shadow_compare`)
  responsable de orquestar la comparación. Es código transitorio: se
  retirará tras el takeover completo.
- El Logic Engine debe exponer un modo de ejecución `dry_run` o equivalente
  donde construye su `HandleResponse` y enumera las escrituras planeadas
  sin aplicarlas. Sin esa capacidad, la comparación de escrituras no es
  posible y el modo sombra se reduce a comparar acciones.
- El coste de cómputo y disco no es despreciable: se prevé hasta 1 GB de
  diff log por día en parques grandes. La rotación + el muestreo lo
  acotan.
- El modo sombra incrementa la latencia por mensaje ~5–15 ms en p99
  (ida-vuelta gRPC + comparación). Aceptable porque no afecta al
  tráfico real (Python sigue procesando primero y publica antes de
  comparar).
- La tabla de tolerancias se vuelve dependencia dura del comparador. Su
  ausencia impide clasificar y, por tanto, promover.

## Relación con otros ADRs

- ADR-034: define el contrato gRPC sobre el que opera la comparación.
- ADR-035: define los modos sombra/canary/takeover; este ADR concreta el
  mecanismo del modo sombra.
- ADR pendiente sobre tabla de tolerancias: alimenta directamente la
  clasificación de diffs.
