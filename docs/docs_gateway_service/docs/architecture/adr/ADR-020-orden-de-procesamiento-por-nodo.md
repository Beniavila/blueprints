# ADR-020 — Orden de procesamiento por nodo

## Estado
Aceptado

## Contexto
Cada mini gateway maneja un número reducido de nodos. Se prioriza consistencia en el procesamiento frente a throughput máximo dentro de cada nodo.

## Decisión
Se garantiza el orden de procesamiento por nodo, permitiendo paralelismo entre nodos dentro del mismo mini gateway.

## Consecuencias
- Se mantiene coherencia en estados y comandos por nodo
- Se evita bloqueo global por gateway
- Se permite paralelismo suficiente dado el bajo número de nodos por gateway
- Requiere partición interna adicional por nodo dentro del flujo del gateway