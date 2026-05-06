# ADR-010 — Partición híbrida por fase del flujo

## Estado
Aceptado

## Contexto
Los nodos son detectados por un mini gateway. Gateway-Cloud registra esa relación, consulta a un backend para resolver a qué servidor pertenece el nodo, guarda esa asociación y, a partir de ese momento, enruta la información y los comandos según el servidor MQTT asociado al nodo.

## Decisión
La partición del sistema será híbrida:

- La fase de descubrimiento y asociación se basa en mini gateway + nodo
- La fase de operación, routing y suscripción se basa en servidor MQTT asociado al nodo

## Consecuencias
- El sistema necesita mantener estado de asociación nodo ↔ mini gateway
- El sistema necesita mantener estado de resolución nodo ↔ servidor MQTT
- La topología de procesamiento no se puede modelar con una única clave de partición
- El diseño de C2 debe separar claramente:
  - ingestión y descubrimiento
  - resolución de destino
  - routing y publicación