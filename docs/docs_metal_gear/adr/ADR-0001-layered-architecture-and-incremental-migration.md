---
adr_id: ADR-0001
title: Arquitectura por capas con migración incremental desde runtime legacy
status: accepted
date: 2026-04-30
deciders:
  - gateway-team
tags:
  - architecture
  - migration
  - domain-driven
related_adrs:
  - ADR-0002
  - ADR-0003
  - ADR-0004
  - ADR-0005
supersedes: []
superseded_by: []
external_interfaces:
  consumes: []
  publishes: []
internal_components:
  - main.py
  - src/domain/*
  - src/application/*
  - src/infrastructure/*
  - models/mqtt_client.py
---

## Contexto

El proyecto evolucionó desde un runtime monolítico (`main.py` + `models/mqtt_client.py`) hacia una separación por capas en `src/domain`, `src/application` y `src/infrastructure`. La migración no podía ser big-bang por riesgo operativo en gateways en campo.

## Decisión

Adoptar arquitectura por capas con puertos/adaptadores, manteniendo temporalmente un runtime legacy activo mientras se incorporan capacidades nuevas sobre módulos refactorizados.

- Lógica de negocio en `domain`.
- Orquestación en `application`.
- Integraciones concretas en `infrastructure`.
- Compatibilidad operativa durante transición con entrypoint actual en `main.py`.

## Consecuencias

### Positivas
- Menor acoplamiento y mejor testabilidad.
- Evolución de funcionalidades nuevas sin romper flota instalada.
- Camino claro para retirar legacy por fases.

### Negativas / trade-offs
- Duplicidad temporal de caminos de ejecución.
- Mayor coste documental para distinguir estado final vs estado transitorio.

## Impacto de integración

Este ADR define la frontera base para integraciones: proyectos externos deben integrarse por contratos de interfaz (MQTT/topics, estado JSON y servicios de sistema), no por módulos internos concretos.

## Verificación

- Existe estructura por capas en `src/*`.
- El runtime legacy sigue operativo y usa componentes del nuevo stack.
- Las nuevas capacidades (OTAP Ender, watchdogs) ya se apoyan en módulos de `src`.

## Modelo mínimo para esquema

```yaml
entity_type: adr
primary_key: ADR-0001
edges:
  - type: relates_to
    target: ADR-0002
  - type: relates_to
    target: ADR-0003
  - type: relates_to
    target: ADR-0004
  - type: relates_to
    target: ADR-0005
```
