# ADR-019 — Procesamiento concurrente por mini gateway con streaming controlado

## Estado
Aceptado

## Contexto
El sistema debe soportar alto throughput y baja latencia sin introducir cuellos de botella globales. El uso de colas centralizadas introduce latencia y limita escalabilidad.

## Decisión
Los mensajes se procesarán en streaming mediante goroutines, particionando el procesamiento por mini gateway.

Cada mini gateway tendrá su propio flujo de procesamiento concurrente, evitando una cola global.

Se permite el uso de buffers mínimos (canales) a nivel local para evitar bloqueos, pero no se utilizará una cola centralizada.

## Consecuencias
- Alta concurrencia y bajo acoplamiento entre gateways
- Mejor escalabilidad horizontal
- Aislamiento de carga por mini gateway
- Mayor complejidad en control de backpressure
- Riesgo de saturación si no se controla el número de goroutines