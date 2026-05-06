# ADR-028 — Delegación de procesamiento fuera de la goroutine de conexión MQTT

## Estado
Aceptado

## Contexto
Cada conexión MQTT se gestiona mediante una goroutine. Los mensajes entrantes pueden ser frecuentes y con carga variable.

## Decisión
La goroutine de la conexión MQTT solo se encargará de recibir y enviar mensajes, delegando inmediatamente el procesamiento a otras goroutines del pipeline.

## Consecuencias
- Se evita bloquear la conexión MQTT
- Mejora el throughput del sistema
- Se desacopla I/O de procesamiento
- Se incrementa el número de goroutines (controlado)