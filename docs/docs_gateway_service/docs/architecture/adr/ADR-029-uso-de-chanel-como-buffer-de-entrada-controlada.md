# ADR-029 — Uso de channel como buffer de entrada controlado

## Estado
Aceptado

## Contexto
El sistema recibe mensajes en ráfagas desde múltiples mini gateways a través de conexiones MQTT concurrentes. Se requiere alto throughput sin comprometer la estabilidad del sistema.

## Decisión
Los mensajes entrantes se insertarán en un channel interno con buffer limitado antes de ser procesados por el pipeline.

## Consecuencias
- Se controla el flujo de entrada (backpressure)
- Se evita explosión de goroutines
- Se mantiene estabilidad bajo carga
- Se introduce una pequeña latencia controlada
- El tamaño del buffer se convierte en parámetro crítico de tuning