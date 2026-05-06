# ADR-006 — No pérdida ni duplicación de datos

## Estado
Aceptado

## Contexto
El sistema no puede perder ni duplicar información.

## Decisión
Se garantiza procesamiento sin pérdida ni duplicación.

## Consecuencias
- Necesidad de idempotencia
- Control estricto de entrega
- Mayor complejidad técnica