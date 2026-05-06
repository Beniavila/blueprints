# ADR-013 — Asociación nodo → servidor MQTT inmutable

## Estado
Aceptado

## Contexto
Gateway-Cloud resuelve el servidor MQTT asociado a un nodo mediante consultas a múltiples backends y almacena el resultado en cache persistente.

## Decisión
La asociación nodo → servidor MQTT se considera fija e inmutable una vez resuelta.

## Consecuencias
- No es necesario implementar mecanismos de invalidación de cache
- Simplifica el modelo de datos y el routing
- Reduce complejidad operativa
- El sistema asume que un nodo no migrará entre servidores