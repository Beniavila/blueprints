# ADR-005: Exposición de métricas Prometheus vía HTTP

## Estado
Aceptada

## Contexto
Es necesario monitorear el estado y rendimiento de Hermes, incluyendo tiempos de confirmación, estado de gateways y otros KPIs. Prometheus es el estándar de facto para monitoreo en entornos cloud-native.

## Decisión
Se decidió exponer métricas Prometheus a través de un endpoint HTTP, utilizando la librería oficial de Prometheus para Go.

## Consecuencias
- Permite la integración sencilla con sistemas de monitoreo existentes.
- Facilita la observabilidad y el diagnóstico de problemas en producción.
- Añade una pequeña sobrecarga de recursos por el servidor HTTP de métricas.
- El diseño es extensible para nuevas métricas según necesidades futuras.
