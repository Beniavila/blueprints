# ADR-011 — Resolución distribuida de nodo por búsqueda secuencial en backends

## Estado
Aceptado

## Contexto
Gateway-Cloud necesita determinar a qué servidor MQTT pertenece un nodo. Actualmente no existe un servicio central de resolución, por lo que es necesario consultar múltiples backends (dev, beta, prod, etc.) hasta encontrar el nodo.

## Decisión
Gateway-Cloud realizará consultas secuenciales a los distintos backends hasta encontrar el nodo_id y su servidor asociado.

## Consecuencias
- Aumenta la latencia en fase de descubrimiento
- Incrementa la carga sobre múltiples backends
- Se requiere definir timeout y orden de prioridad de backends
- El proceso de descubrimiento no es inmediato ni determinista
- Se deberá cachear el resultado para evitar búsquedas repetidas