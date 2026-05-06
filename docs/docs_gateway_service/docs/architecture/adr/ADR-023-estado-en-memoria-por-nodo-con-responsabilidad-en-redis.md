# ADR-023 — Estado en memoria por nodo con respaldo en Redis

## Estado
Supersedido por ADR-034

## Contexto
El sistema requiere acceso rápido al estado del nodo para tomar decisiones en tiempo real (por ejemplo, cambios de estado que disparan cálculos de consumos). Actualmente este estado se almacena en Redis.

## Decisión
Cada worker de nodo mantendrá el estado en memoria mientras esté activo, utilizando Redis como respaldo persistente y fuente de recuperación.

## Consecuencias
- Acceso ultra rápido al estado durante procesamiento
- Reducción de latencia en handlers
- Redis actúa como fuente de verdad distribuida
- Se requiere sincronización entre memoria y Redis
- Se debe definir estrategia de inicialización y limpieza de estado en memoria

## Nota de supersesión

Con la adopción de ADR-034, el estado de negocio por nodo (consumos raw, alarmas, estado de sesión) pasa a ser responsabilidad del **Logic Engine**. Gateway-Cloud conserva en Redis únicamente estado de telecomunicaciones: asociación `nodo ↔ mini gateway` (ADR-015) y resolución `nodo → servidor MQTT` (ADR-012). La estrategia de estado en memoria descrita en este ADR aplica al Logic Engine, no a Gateway-Cloud.