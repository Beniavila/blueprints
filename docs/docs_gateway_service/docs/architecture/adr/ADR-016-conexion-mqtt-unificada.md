# ADR-016 — Conexión MQTT unificada

## Estado
Aceptado

## Contexto
Gateway-Cloud necesita recibir datos de mini gateways y enviar comandos hacia ellos, así como publicar y suscribirse a brokers MQTT asociados a nodos.

## Decisión
Se utilizará una única conexión MQTT bidireccional por contenedor para gestionar tanto la ingestión de datos como el envío de comandos.

## Consecuencias
- Simplifica la gestión de conexiones
- Reduce overhead de recursos
- Centraliza control de comunicación MQTT
- Aumenta el acoplamiento entre ingestión y publicación
- Requiere control interno de rutas de mensajes