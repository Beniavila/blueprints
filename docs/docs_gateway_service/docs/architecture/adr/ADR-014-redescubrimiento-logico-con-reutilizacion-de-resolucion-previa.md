# ADR-014 — Redescubrimiento lógico con reutilización de resolución previa

## Estado
Aceptado

## Contexto
Cuando un gateway pierde contacto con un nodo, limpia sus datos y comunica ese estado al backend. Si vuelve a ver el nodo, lo reporta de nuevo como redescubierto. Gateway-Cloud debe seguir ese mismo comportamiento, pero puede conservar información útil ya conocida, como el servidor MQTT asociado al nodo.

## Decisión
Cada reaparición de un nodo se tratará como un redescubrimiento lógico del nodo respecto al mini gateway actual, pero reutilizando la resolución persistente nodo → servidor MQTT si ya existe.

## Consecuencias
- Se mantiene compatibilidad funcional con el comportamiento del gateway actual
- Se evita repetir búsquedas de servidor innecesarias
- La asociación nodo ↔ mini gateway puede actualizarse en cada redescubrimiento
- El sistema separa claramente:
  - estado de presencia del nodo
  - estado de resolución del servidor MQTT