# ADR-009 — Arquitectura modular con Logic Engine como core compartido

## Estado
Aceptado (actualizado por ADR-034)

## Contexto
Se requiere mantener coherencia funcional entre gateway tradicional y Gateway-Cloud, evitando duplicación de lógica y permitiendo evolución hacia una versión más modular y optimizada.

## Decisión
Se define una arquitectura basada en:

- Un **Logic Engine** (contenedor Docker independiente, repositorio separado) que contiene la lógica funcional del gateway: handlers, cálculo de consumos, evaluación de alarmas y decisiones de persistencia
- **Gateway-Cloud** actúa como capa de telecomunicaciones y utiliza el Logic Engine vía gRPC para toda la lógica de negocio
- El gateway tradicional de calle usa el mismo Logic Engine, garantizando coherencia funcional entre ambos
- Separación clara de responsabilidades: Gateway-Cloud gestiona telecomunicaciones, Logic Engine gestiona lógica

## Consecuencias
- Se evita duplicar lógica entre gateway y gateway-cloud
- El Logic Engine es la única fuente de verdad para la lógica de negocio
- Se facilita evolución hacia gateway 2.0
- Se permite escalar partes del sistema de forma independiente
- La interfaz entre Gateway-Cloud y Logic Engine está definida por contrato gRPC (ver C3)