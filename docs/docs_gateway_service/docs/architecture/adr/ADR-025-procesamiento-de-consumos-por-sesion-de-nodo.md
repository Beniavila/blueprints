# ADR-025 — Procesamiento de consumos por sesión de nodo

## Estado
Supersedido por ADR-034

## Contexto
El cálculo de consumos depende del estado acumulado del nodo, pero el sistema no mantiene estado histórico persistente completo.

## Decisión
Los consumos se calcularán al finalizar la sesión de un nodo (cuando se detecta pérdida de conexión). Tras el cálculo, el estado del nodo se limpia, manteniendo únicamente los consumos calculados.

## Consecuencias
- No se requiere estado histórico prolongado
- Se evita acumulación indefinida de datos
- Se simplifica la gestión de memoria y persistencia
- El sistema tolera reinicios sin inconsistencias graves
- El modelo se basa en sesiones independientes por nodo

## Nota de supersesión

Con la adopción de ADR-034, el procesamiento de consumos por sesión pasa a ser responsabilidad del **Logic Engine**. Gateway-Cloud detecta el timeout de inactividad del nodo y notifica al Logic Engine mediante un evento `NODE_TIMEOUT` vía gRPC (ver ADR-033 actualizado y C3). El cálculo final de consumos lo ejecuta el Logic Engine, no Gateway-Cloud.