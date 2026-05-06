# ADR-002: Uso de MQTT como bus de eventos principal

## Estado
Aceptada

## Contexto
Hermes debe integrarse con dispositivos IoT y sistemas externos de manera desacoplada y eficiente. MQTT es un protocolo ampliamente adoptado en IoT, soporta calidad de servicio, y permite comunicación asíncrona y escalable.

## Decisión
Se eligió MQTT como el bus de eventos principal para la recepción y envío de mensajes entre Hermes, dispositivos IoT y otros sistemas.

## Consecuencias
- Permite desacoplar Hermes de los dispositivos y sistemas externos.
- Facilita la escalabilidad y la integración con otros servicios.
- Requiere gestión de reconexión, suscripciones y control de calidad de servicio.
- La lógica de negocio debe adaptarse a la naturaleza asíncrona y orientada a eventos de MQTT.
