# ADR-008 — Persistencia limitada al gateway actual

## Estado
Aceptado

## Contexto
Gateway-Cloud debe replicar comportamiento sin añadir almacenamiento extra.

## Decisión
Se mantiene solo la persistencia existente en el gateway actual.

## Consecuencias
- Evita crecimiento innecesario del sistema
- No se convierte en sistema analítico