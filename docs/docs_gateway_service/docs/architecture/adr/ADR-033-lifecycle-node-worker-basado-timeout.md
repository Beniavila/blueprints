# ADR-033 — Lifecycle de Node Worker basado en timeout

## Estado
Aceptado

## Contexto
Los nodos pueden dejar de enviar datos en cualquier momento. El sistema debe detectar la pérdida de un nodo, calcular consumos pendientes y limpiar su estado, replicando el comportamiento del gateway actual.

## Decisión
Cada Node Worker tendrá un mecanismo de timeout basado en inactividad.

Si un nodo no envía mensajes durante un periodo definido:

1. Se considera desconectado
2. Se envía un evento `NODE_TIMEOUT` al Logic Engine vía gRPC
3. El Logic Engine ejecuta el cálculo final de consumos y devuelve las acciones resultantes
4. Gateway-Cloud ejecuta las acciones devueltas (por ejemplo, enviar consumo final al backend)
5. Se limpia el estado de telecomunicaciones del nodo en Redis (asociación `nodo ↔ mini gateway`)
6. El worker se destruye

## Consecuencias
- Liberación automática de recursos
- Evita acumulación de workers inactivos
- Mantiene coherencia con el comportamiento del gateway actual
- El sistema funciona por sesiones de nodo independientes

## Notas de implementación

- El timeout debe reiniciarse en cada mensaje recibido
- El evento `NODE_TIMEOUT` debe enviarse al Logic Engine antes de destruir el worker
- La limpieza de estado en Gateway-Cloud incluye únicamente estado de telecomunicaciones:
  - asociación `nodo ↔ mini gateway`
- El estado de negocio (consumos, alarmas, etc.) lo gestiona y limpia el Logic Engine al recibir el `NODE_TIMEOUT`

## Riesgos

- Timeout demasiado corto → cortes prematuros
- Timeout demasiado largo → consumo innecesario de memoria

## Futuro

- El timeout puede hacerse configurable por tipo de instalación o nodo