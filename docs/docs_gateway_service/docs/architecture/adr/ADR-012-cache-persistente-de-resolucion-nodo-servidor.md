# ADR-012 — Cache persistente de resolución nodo → servidor MQTT

## Estado
Aceptado

## Contexto
La resolución de nodo requiere consultas secuenciales a múltiples backends, lo que introduce latencia y carga innecesaria si se repite frecuentemente.

## Decisión
Se almacenará de forma persistente la asociación nodo → servidor MQTT una vez resuelta.

## Consecuencias
- Se evita repetir búsquedas costosas
- Se reduce latencia en operación normal
- Se introduce necesidad de gestión de consistencia del cache
- Se debe definir estrategia de actualización si un nodo cambia de servidor