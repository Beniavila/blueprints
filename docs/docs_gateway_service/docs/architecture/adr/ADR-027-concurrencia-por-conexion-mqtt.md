# ADR-027 — Concurrencia por conexión MQTT

## Estado
Aceptado

## Contexto
Gateway-Cloud mantiene múltiples conexiones MQTT simultáneas (dev, beta, prod, etc.) y requiere procesarlas de forma concurrente y aislada.

## Decisión
Cada conexión MQTT se gestionará mediante su propia goroutine independiente.

## Consecuencias
- Aislamiento entre servidores MQTT
- Mejor aprovechamiento de concurrencia en Go
- Evita bloqueos globales
- Simplifica el modelo de ejecución
- Facilita escalado por servidor