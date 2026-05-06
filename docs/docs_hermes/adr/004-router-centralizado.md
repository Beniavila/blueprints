# ADR-004: Uso de un Router centralizado para el despacho de mensajes

## Estado
Aceptada

## Contexto
Hermes debe procesar mensajes de múltiples topics y tipos, permitiendo la extensión y el registro dinámico de handlers. Se requiere un mecanismo flexible para enrutar mensajes a los handlers adecuados.

## Decisión
Se implementó un Router centralizado que permite registrar múltiples handlers por topic y despacha los mensajes recibidos a los handlers correspondientes, gestionando la concurrencia mediante un pool de workers.

## Consecuencias
- Facilita la extensión y el registro de nuevos handlers.
- Permite el procesamiento concurrente y eficiente de mensajes.
- El Router abstrae la lógica de enrutamiento y desacopla los handlers del cliente MQTT.
- El sistema puede escalar el procesamiento ajustando el tamaño del pool de workers.
