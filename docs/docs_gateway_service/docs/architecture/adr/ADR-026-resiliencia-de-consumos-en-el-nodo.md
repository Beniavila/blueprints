# ADR-026 — Resiliencia de consumos en el nodo

## Estado
Supersedido por ADR-034

## Contexto
El sistema debe tolerar desconexiones de gateway sin perder información de consumos.

## Decisión
Los nodos acumulan consumos localmente cuando no tienen conexión con un gateway y los envían al reconectar.

## Consecuencias
- El sistema es resiliente a caídas de gateway
- No se pierde información de consumos
- Se simplifica la lógica de recuperación en Gateway-Cloud
- El edge (nodo) asume responsabilidad de buffering

## Nota de supersesión

Con la adopción de ADR-034, la lógica de resiliencia y recuperación de consumos pasa a ser responsabilidad del **Logic Engine**. Gateway-Cloud reenvía los mensajes acumulados tal como llegan; el Logic Engine los procesa aplicando la lógica de recuperación correspondiente.