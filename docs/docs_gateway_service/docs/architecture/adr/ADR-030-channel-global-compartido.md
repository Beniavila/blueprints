# ADR-030 — Channel global compartido para entrada de mensajes

## Estado
Aceptado

## Contexto
El sistema recibe mensajes desde múltiples conexiones MQTT concurrentes. Se requiere un mecanismo de entrada controlado que permita gestionar ráfagas sin complejidad innecesaria.

## Decisión
Se utilizará un único channel global compartido para todos los mensajes entrantes, independientemente de la conexión MQTT de origen.

## Consecuencias
- Simplifica la arquitectura
- Centraliza el control de backpressure
- Permite balancear carga entre workers de forma natural
- Evita fragmentación de buffers por conexión
- Puede convertirse en cuello de botella si no se dimensiona correctamente