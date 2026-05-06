---
adr_id: ADR-0000
title: Título de la decisión
status: proposed
date: YYYY-MM-DD
deciders:
  - team
tags:
  - architecture
related_adrs: []
supersedes: []
superseded_by: []
external_interfaces:
  consumes: []
  publishes: []
internal_components: []
---

## Contexto

Problema y restricciones.

## Decisión

Decisión concreta, sin ambigüedad.

## Consecuencias

### Positivas
- ...

### Negativas / trade-offs
- ...

## Impacto de integración

Cómo afecta la comunicación con otros proyectos/sistemas.

## Verificación

Cómo comprobar que la decisión se cumple en runtime/código.

## Modelo mínimo para esquema

```yaml
entity_type: adr
primary_key: adr_id
edges:
  - type: relates_to
    target: ADR-XXXX
```
