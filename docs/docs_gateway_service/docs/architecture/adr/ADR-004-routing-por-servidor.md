# ADR-004 — Routing por servidor MQTT destino

## Estado
Aceptado

## Contexto
Gateway-Cloud solo necesita saber a qué servidor enviar cada nodo.

## Decisión
El routing se basa en el servidor MQTT destino por nodo.

## Consecuencias
- La partición del sistema se basa en servidor
- El backend gestiona organizaciones