# ADR-003: Separación de Handlers y Workers para procesamiento y reintentos

## Estado
Aceptada

## Contexto
El procesamiento de mensajes entrantes y la gestión de reintentos requieren diferentes patrones de concurrencia y responsabilidad. Los handlers deben ser simples y rápidos, mientras que los reintentos pueden ser gestionados en background.

## Decisión
Se separaron los handlers (procesan mensajes y actualizan el store) de los workers (procesan reintentos periódicos y limpieza de entidades pendientes).

## Consecuencias
- Los handlers pueden responder rápidamente a eventos entrantes.
- Los workers pueden gestionar reintentos y expiraciones sin bloquear el procesamiento principal.
- El sistema es más fácil de mantener y escalar.
- Permite desacoplar la lógica de negocio inmediata de la gestión de fiabilidad y reintentos.
