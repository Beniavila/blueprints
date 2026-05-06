# ADR-035 — Estrategia de integración Logic Engine ↔ gateway: sombra, canary, takeover

## Estado
Aceptado

## Contexto

ADR-034 fija que la lógica de negocio del gateway se extrae al Logic Engine.
Esa migración no puede ser big bang: el gateway Python actual está en
producción, soporta el parque real de nodos y debe seguir funcionando con
normalidad mientras se construye y valida el reemplazo en Go.

Necesitamos una estrategia explícita de integración por fases que permita:

- desarrollar el Logic Engine sin afectar al servicio en producción;
- validar la paridad funcional contra tráfico real antes de redirigir
  cualquier mensaje;
- redirigir tráfico de forma controlada y reversible una vez demostrada la
  equivalencia;
- llegar al estado final donde el gateway Python solo actúa como adaptador
  telecom y toda la lógica vive en el Logic Engine.

Sin esta estrategia, el riesgo es lanzar el reemplazo a ciegas o, en el otro
extremo, no atrevernos a redirigir nunca por miedo a romper paridad.

## Decisión

Se adopta una migración en tres modos secuenciales: **sombra → canary →
takeover**. Cada modo tiene un disparador binario por configuración y
criterios objetivos para promover al siguiente.

### Modo sombra (shadow)

- El gateway Python sigue siendo la fuente de verdad funcional. Procesa
  cada mensaje y aplica todos sus efectos (publicaciones MQTT, escrituras
  SQLite, escrituras Redis).
- Para cada mensaje procesado, el gateway emite además una llamada gRPC al
  Logic Engine con el mismo `LogicRequest`. La respuesta del Logic Engine
  **no se ejecuta**: se compara contra los efectos reales del gateway y se
  loguea el diff.
- Activación: flag `SHADOW_MODE=true` en el gateway Python.
- Riesgo operativo: cero sobre tráfico real. Solo añade carga de cómputo
  duplicado y latencia despreciable porque la comparación es asíncrona.

Criterio para promover a canary:

- 0 diffs bloqueantes en al menos 7 días continuos de tráfico real;
- diffs no bloqueantes documentados y aceptados (ver tabla de tolerancia
  del ADR de paridad);
- cobertura demostrada de los opcodes activos en el parque (no solo los
  más frecuentes).

### Modo canary

- Una porción acotada de mensajes se redirige al Logic Engine y sus
  acciones **sí se ejecutan**. El resto del tráfico sigue procesándose por
  Python.
- La selección del subconjunto canary debe ser determinista y auditable.
  Criterios de selección posibles, en orden de preferencia:
  1. **Por familia de mensaje**: empezar por familias cerradas y de bajo
     riesgo (passthrough, status simples, alarmas resueltas). Las familias
     se promueven una a una.
  2. **Por gateway o instalación**: limitar a un gateway de `dev` o un
     piloto antes de extender al parque.
  3. **Por porcentaje aleatorio estable** (hash sobre `node_id`): solo si
     las dos anteriores no aplican.
- Evita el sampling aleatorio sin partición por nodo: rompería el orden por
  `node_id` que ADR-020 protege.
- Activación: flag `CANARY_FAMILIES=1,2,3,40,41` (lista de opcodes) o
  `CANARY_GATEWAYS=gw-dev-01`.
- Reversibilidad: cada canary debe poder desactivarse al instante sin
  reinicio (reload de config o env).

Criterio para promover a takeover por familia:

- 14 días sin incidencias atribuibles al canary;
- métricas equivalentes de latencia, error rate y consumo eléctrico
  reportado;
- alertas específicas configuradas para detectar divergencia.

### Modo takeover

- Una familia de mensajes ya no pasa por el handler Python: se redirige
  íntegramente al Logic Engine. El handler Python correspondiente se
  marca como deprecado pero se conserva durante una ventana de seguridad.
- El takeover es por familia, no global. Hasta que todas las familias
  estén en takeover, el gateway sigue ejecutando el flujo Python para las
  no migradas.
- Activación: flag `TAKEOVER_FAMILIES=...` que solapa y suplanta al canary
  para esas familias.
- Una vez en takeover estable durante 30 días, se elimina el handler
  Python correspondiente en un commit aparte.

Criterio para finalizar la migración:

- Todas las familias activas del parque están en takeover estable;
- el gateway Python no tiene handlers de negocio, solo adaptador telecom
  + cliente gRPC;
- el shadow mode queda disponible como herramienta de regresión, pero no
  es ya el modo por defecto.

### Direcciones únicas, no bidireccional

La estrategia es unidireccional: sombra → canary → takeover. No se
contempla degradar de takeover a canary o de canary a sombra como modo
operativo normal. Si surge un problema en takeover, se desactiva el flag
para esa familia (vuelta inmediata a Python) y se investiga antes de
reintentar.

### Persistencia y consistencia durante la convivencia

Mientras conviven Python y Logic Engine, ambos acceden a las mismas bases
SQLite y al mismo Redis. Las escrituras concurrentes están serializadas
por `node_id` (ADR-020) y por el `busy_timeout` de SQLite. En sombra el
Logic Engine NO escribe; en canary y takeover sí, pero solo para la
familia/gateway redirigido, evitando doble escritura sobre el mismo
mensaje.

## Consecuencias

- La migración es lenta a propósito: prioriza certeza sobre velocidad. Es
  el precio de no tener un entorno de pre-producción equivalente.
- Cada modo introduce un flag operativo: el operador del gateway puede
  controlar el avance sin necesidad de redeploy si los flags se cargan en
  caliente.
- Se necesita un sistema de comparación de paridad (objeto de ADR
  separado) para que el modo sombra produzca señal útil. Sin él, el modo
  sombra es ruido.
- Las familias que el gateway actual maneja con bugs conocidos
  (ver `docs/10-known-issues-todos.md`) deben decidir explícitamente
  antes del takeover si se replican o se corrigen, porque el takeover
  fija el comportamiento.
- El Logic Engine debe soportar idempotencia funcional: en sombra recibe
  cada mensaje una vez sin efectos; en canary/takeover recibe cada
  mensaje una vez con efectos. No debe haber rutas que generen efectos
  por el simple hecho de que un mensaje se procese dos veces durante la
  transición de modo.

## Relación con otros ADRs

- ADR-009 (core compartido) y ADR-034 (delegación gRPC) son la decisión
  estructural que esta estrategia operativiza.
- ADR-020 (orden por nodo) condiciona los criterios de partición canary.
- El sistema de comparación de paridad referenciado vivirá en un ADR
  posterior dedicado.
