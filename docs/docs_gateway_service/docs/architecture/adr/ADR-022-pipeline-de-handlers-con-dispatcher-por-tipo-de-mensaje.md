# ADR-022 — Pipeline de handlers con dispatch por tipo de mensaje

## Estado
Supersedido por ADR-034

## Contexto
El sistema recibe dos tipos de mensajes:
- mensaje único (contiene toda la información del nodo)
- mensajes individuales (status, consumos, alarmas, etc.)

La lógica ya está implementada mediante handlers especializados.

## Decisión
Se define un modelo híbrido:

- Un paso inicial de dispatch basado en tipo de mensaje (msg_id o estructura)
- Transformación opcional del mensaje único en sub-eventos
- Ejecución de un pipeline fijo de handlers por tipo de dato

## Consecuencias
- Se mantiene la lógica existente del gateway
- Se elimina la ambigüedad del chain of responsibility
- Se mejora la previsibilidad del sistema
- Se facilita testing y debugging
- Se permite evolución futura hacia paralelismo por tipo de evento

## Nota de supersesión

Este ADR describe el pipeline de handlers que Gateway-Cloud ejecutaría internamente. Con la adopción de ADR-034, dicho pipeline pasa a residir en el **Logic Engine** (repositorio separado). Gateway-Cloud ya no ejecuta handlers directamente: delega el mensaje al Logic Engine vía gRPC y ejecuta las acciones devueltas. El diseño del pipeline sigue siendo válido pero su implementación corresponde al repositorio del Logic Engine.