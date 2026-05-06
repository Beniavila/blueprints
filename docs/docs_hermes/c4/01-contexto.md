# C4 Nivel 1: Diagrama de Contexto

## Descripción general
Hermes es un sistema de backend orientado a la gestión de alarmas, movimientos y estrategias para dispositivos IoT, comunicándose principalmente a través de MQTT. El sistema está pensado para operar en entornos de producción, beta y desarrollo, y se integra con brokers MQTT externos.

## Actores principales
- **Usuario Operador**: Interactúa indirectamente a través de sistemas de monitoreo o dashboards conectados al broker MQTT.
- **Broker MQTT**: Sistema externo que envía y recibe mensajes de dispositivos IoT.
- **Dispositivos IoT**: Sensores y actuadores que publican y reciben mensajes MQTT.
- **Hermes**: Sistema central que procesa, almacena y reintenta operaciones sobre alarmas, movimientos y estrategias.

## Relaciones
- Hermes se conecta al broker MQTT para recibir y enviar mensajes.
- Los dispositivos IoT publican eventos (alarmas, movimientos, estrategias) al broker MQTT.
- Hermes procesa estos eventos y puede responder o reenviar mensajes a través del broker MQTT.
- Los operadores pueden consultar el estado de los dispositivos y alarmas a través de sistemas conectados al broker MQTT.

## Diagrama (texto)

```
+----------------+         +----------------+         +----------------+
| Dispositivos   |<------->|   Broker MQTT  |<------->|     Hermes     |
|    IoT         |         +----------------+         +----------------+
+----------------+                                         |
                                                          |
                                                +----------------------+
                                                | Usuario/Operador     |
                                                +----------------------+
```

## Notas
- Hermes es un consumidor y productor de mensajes MQTT.
- El sistema está diseñado para alta concurrencia y procesamiento en memoria.
- La configuración y credenciales se gestionan por entorno.
