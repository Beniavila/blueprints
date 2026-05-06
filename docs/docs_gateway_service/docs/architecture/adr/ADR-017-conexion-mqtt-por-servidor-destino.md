# ADR-017 — Conexiones MQTT por servidor MQTT destino

## Estado
Aceptado

## Contexto
Gateway-Cloud debe comunicarse con múltiples servidores MQTT (dev, beta, prod, senegal, iot). Cada nodo está asociado a uno de estos servidores y el sistema debe enviar y recibir mensajes en todos ellos de forma concurrente.

## Decisión
Gateway-Cloud mantendrá conexiones MQTT independientes por cada servidor MQTT destino, activas simultáneamente.

## Consecuencias
- Permite procesamiento paralelo por servidor
- Aísla fallos por servidor MQTT
- Facilita el routing por nodo
- Incrementa el número de conexiones activas
- Requiere gestión de lifecycle de múltiples clientes MQTT