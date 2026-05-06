# ADR-024 — Inicialización de estado por nodo con fallback a Redis

## Estado
Supersedido por ADR-034

## Contexto
El sistema utiliza Redis para almacenar estado de nodos, pero dicho estado es efímero y puede ser reconstruido a partir del flujo de mensajes. Los gateways pueden reiniciarse o perder información, y el sistema debe tolerarlo.

## Decisión
El estado del nodo se carga desde Redis únicamente cuando se crea el worker del nodo. Si no existe estado en Redis, el nodo se trata como nuevo sin necesidad de reconstrucción histórica.

## Consecuencias
- Inicialización rápida del worker
- Simplificación del modelo de estado
- No se requiere consistencia fuerte histórica
- El sistema se apoya en el flujo de eventos para reconstrucción
- Redis actúa como cache operativa, no como fuente crítica de verdad

## Nota de supersesión

Con la adopción de ADR-034, la inicialización de estado de negocio por nodo pasa a ser responsabilidad del **Logic Engine**. Este ADR aplica al Logic Engine, no a Gateway-Cloud. Gateway-Cloud no inicializa ni mantiene estado de negocio.