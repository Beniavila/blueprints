# ADR-001: Uso de almacenamiento en memoria para entidades temporales

## Estado
Aceptada

## Contexto
Hermes gestiona alarmas, asignaciones de movimiento y estrategias que requieren procesamiento rápido y reintentos periódicos. Estas entidades tienen una vida útil corta y no requieren persistencia a largo plazo.

## Decisión
Se decidió implementar los stores de alarmas, movimientos y estrategias como estructuras en memoria (`MemoryAlarmStore`, `MemoryMovementStore`, `MemoryStrategyStore`).

## Consecuencias
- Simplicidad y velocidad en el acceso a datos temporales.
- No hay persistencia tras reinicio del proceso.
- Adecuado para escenarios donde la fiabilidad depende de la confirmación rápida y la reintentos automáticos.
- Si se requiere persistencia futura, será necesario migrar a un almacenamiento externo.
