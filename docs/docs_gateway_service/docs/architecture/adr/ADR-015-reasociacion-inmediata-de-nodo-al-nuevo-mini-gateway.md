# ADR-015 — Reasociación inmediata de nodo al nuevo mini gateway

## Estado
Aceptado

## Contexto
Un nodo puede ser visto de nuevo por un mini gateway distinto. El backend debe reflejar siempre el gateway real que está enviando los datos. Además, el topic de publicación de la información del nodo usa el id del gateway.

## Decisión
Cuando un nodo sea visto por un mini gateway distinto, Gateway-Cloud actualizará inmediatamente la asociación nodo ↔ mini gateway al nuevo gateway detectado.

## Consecuencias
- El backend refleja siempre el gateway real que está viendo el nodo
- El topic de publicación se alinea con el gateway actual
- No se mantiene espera ni estado de conflicto
- La reasociación forma parte del flujo normal de redescubrimiento