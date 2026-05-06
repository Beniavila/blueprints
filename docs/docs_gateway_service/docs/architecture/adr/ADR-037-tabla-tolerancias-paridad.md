# ADR-037 — Tabla de tolerancias de paridad Python ↔ Logic Engine

## Estado
Aceptado

## Contexto

ADR-036 introduce el comparador de paridad y exige que cada diferencia
detectada se clasifique como `bloqueante`, `tolerable` o `sin_diff`. Esa
clasificación depende de una tabla externa que diga, por área, qué
diferencias son aceptables y cuáles no.

Sin esta tabla, el comparador no puede decidir y la migración no puede
avanzar de modo sombra a canary, porque cada diff queda sin etiquetar.

Hay tres categorías de áreas a considerar:

1. **Equivalencia exacta**: el byte/registro/escritura tiene que ser
   idéntico entre Python y Go. Cualquier diferencia es bloqueante.
2. **Tolerancia documentada**: la diferencia es esperada por la
   naturaleza del cálculo o del sistema (orden de operaciones float,
   librerías distintas, relojes). Hay que acotarla con un umbral.
3. **Bugs conocidos del gateway actual**: el comportamiento Python tiene
   defectos documentados (`docs/10-known-issues-todos.md`). Durante la
   convivencia el Logic Engine debe replicar el bug; la corrección se
   decide al pasar a takeover.

## Decisión

Se adopta el principio **equivalencia funcional, no equivalencia de
implementación**: el Logic Engine debe producir el mismo efecto observable
externamente, no necesariamente la misma secuencia interna de operaciones.
El detalle por área se fija en las tablas siguientes.

### Equivalencia exacta (byte-a-byte / registro-a-registro)

Cualquier diferencia en estas áreas es **bloqueante**:

| Área | Detalle |
|---|---|
| Acciones de salida — identidad | `kind`, `topic`, `node_id`, `qos`, `src_ep`, `dst_ep` deben coincidir exactamente. |
| Acciones de salida — orden | Tras la normalización determinista de ADR-036, ambos lados deben emitir el mismo conjunto. |
| Payloads de mensajes simples | Status (msg_type 1, 2, 3, 7, 33, 34), alarmas (202, 203), kit (94, 95), estrategia confirmación (15, 92), positioning (7), RAW command (101), HEX commands (255), broadcast (254), neighbors (29), passthrough READ/WRITE (84-91). |
| Estructura de bytes empaquetada | Tamaños finales de los mensajes de coeficientes: 129 B (DALI), 119 B (Allegro), 153 B (Solar), 159 B (DALI+Allegro). |
| Header de cualquier mensaje | `[msg_id(2B), msg_type(1B)]` siempre exacto. |
| Decodificación de entrada | Bytes parseados desde uplinks Wirepas o cl-req MQTT. |
| Submensajes de UNIC_MSG | La descomposición de `msg_type=50` debe producir la misma lista de submensajes con los mismos opcodes y payloads. |
| Claves SQLite mutadas | Misma tabla, misma clave primaria, mismas columnas escritas. |
| Claves Redis mutadas | Misma clave, mismas operaciones (`SET`/`DEL`). |
| Suscripciones / desuscripciones | `Subscribe`/`Unsubscribe` con el mismo topic. |

### Tolerancias documentadas

| Regla | Ámbito | Tolerancia | Justificación | Cómo se contiene |
|---|---|---|---|---|
| `sunrise_sunset` | `NodeRequestUnixtimeHandler` (msg_type 201) — bytes de sunrise/sunset hh:mm | ±1 minuto | Python usa `ephem` (VSOP87 modificado); Go porta NOAA solar calc (~50 LOC). Precisión astronómica equivalente, redondeo distinto. | Tests de paridad con 50 fechas/lat/lon contra Python; el comparador valida contra ventana ±1 min. |
| `polyfit_float` | Coeficientes en mensajes 36, 37, 38, 108 (DALI/Allegro/Solar/DALI+Allegro) | float64 absoluto ≤ 1e-9 o relativo ≤ 1e-12 (el menor de los dos) | numpy.polyfit (LAPACK) vs gonum (LAPACK puro Go); orden de operaciones distinto. | Comparador parsea los floats del payload y valida contra la tolerancia, no compara los bytes. |
| `consumption_stats` | min/max/avg empaquetados (12 B por serie) | float64 absoluto ≤ 1e-9 | Misma razón que polyfit. | Idem. |
| `derived_consumption` | `saving_watts` y `power_consumption` (no-solar) | float64 relativo ≤ 1e-9 | Derivado de polyfit; la tolerancia se hereda. | Idem. |
| `timestamp_now` | Cualquier `timestamp_localtime` insertado por el handler | Igual al reloj inyectado en el comparador | Para la comparación se inyecta un reloj idéntico a ambos lados (ver ADR-036). | Si la diferencia persiste tras reloj inyectado, es bloqueante. |
| `watchdog_tick_drift` | Momento exacto en el que un watchdog dispara | ≤ 1 intervalo de cadencia (30 s keepalive, 25 s lost) | Los goroutines Go y los hilos Python no tienen el mismo scheduler; se acepta que un nodo que cumple condición de muerte se publique con hasta 1 tick de retraso. | El comparador no compara timestamps de los efectos del watchdog; solo compara que los efectos acaben siendo emitidos en una ventana razonable. |
| `redis_cache_replica` | Claves Redis que solo son réplica de SQLite (cache puro) | Cualquier diferencia en presencia/ausencia | El comparador no las incluye. | Lista explícita en el comparador; se mantiene en sync con `docs/07-redis-cache.md`. |
| `log_only_fields` | `created_at`, `updated_at` y similares no funcionales | Cualquier valor | Son metadatos auxiliares. | Excluidos de la comparación. |

### Bugs conocidos a replicar durante la convivencia

Mientras el modo sombra y el canary estén activos, el Logic Engine debe
replicar el comportamiento del gateway actual incluso cuando ese
comportamiento sea un bug. Los siguientes casos están documentados en
`docs/10-known-issues-todos.md` y se tratan así:

| Bug | Comportamiento esperado del Logic Engine en convivencia | Decisión final |
|---|---|---|
| TODO #1: `AllegroConsumptionsHandler` inactivo | Replicar inactivo (no procesar `msg_type=111` como consumo Allegro). | Se decide al pasar a takeover. |
| TODO #2: opcode 107 dual SOLAR_STATUS/SOLAR_RAW | Distinguir por contexto/canal igual que Python. | Documentar como decisión definitiva en takeover. |
| TODO #3: opcode 111 dual SECTION_SENSOR/ALLEGRO_RAW | Idem. | Idem. |
| TODO #4: DALI empaqueta `active_power` inexistente | Replicar el `KeyError` controlado o el efecto observable equivalente. | Decisión obligatoria en takeover (corregir o eliminar). |
| TODO #5: WAITING solo en Redis | Replicar (no escribir SQLite en estados WAITING). | Idem. |
| TODO #6: `init_send_all_consums_calculates` no-op | Replicar como no-op. | Idem. |
| TODO #7: "second chance" wirepas no usado | No emitir esa acción. | Idem. |

Cada decisión definitiva se documenta como ADR posterior cuando la
familia correspondiente entre en takeover.

### Aplicación operativa por el comparador

El comparador (ADR-036) consume esta tabla así:

1. Para cada diferencia detectada, busca primero si la regla de
   tolerancia aplica al ámbito de la diferencia (campo, opcode, tabla).
2. Si aplica, evalúa la tolerancia. Si está dentro del umbral, marca
   `tolerable` con el nombre de la regla.
3. Si no aplica ninguna regla, marca `bloqueante`.
4. La categoría `tolerable` solo es válida si la regla tiene nombre en
   esta tabla. **No existe la categoría "otros"**: si una diferencia no
   encaja en una regla nombrada, es bloqueante por definición y la tabla
   debe extenderse en un commit explícito antes de poder promover la
   familia.

### Cómo se mantiene esta tabla

- Cada nueva tolerancia se añade en un commit **separado**, que cita el
  caso real que la motiva (idealmente un fixture en `testdata/`).
- Quitar una tolerancia (apretar el umbral) es libre.
- Aflojar un umbral existente requiere ADR aparte.
- Esta tabla es la única fuente de verdad. Si el código del comparador
  cita una tolerancia que no aparece aquí, el código está mal.

## Consecuencias

- El comparador puede clasificar de forma binaria y reproducible. Sin
  esta tabla la clasificación queda al criterio subjetivo del operador.
- El Logic Engine se obliga a empaquetar floats con el mismo formato
  que el gateway (no convertir a otro tipo numérico, mantener
  little-endian, etc.). La tolerancia es del valor numérico, no del
  formato binario.
- Las decisiones sobre TODOs se posponen hasta takeover, lo que evita
  cambios funcionales mezclados con la migración. La migración fija
  comportamiento, la corrección viene después.
- La obligación de "sin categoría 'otros'" añade fricción intencional:
  fuerza a parar y pensar antes de aceptar una desviación nueva como
  tolerable.

## Relación con otros ADRs

- ADR-035: define el flujo sombra → canary → takeover.
- ADR-036: define el comparador y referencia esta tabla.
- `docs/10-known-issues-todos.md`: contiene los bugs cuya replicación
  está cubierta por esta tabla.
- ADRs futuros: cada cierre de TODO en takeover genera su propio ADR
  con la decisión definitiva.
