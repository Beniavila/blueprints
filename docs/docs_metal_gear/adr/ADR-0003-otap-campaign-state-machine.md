---
adr_id: ADR-0003
title: OTAP Ender modelado como máquina de campaña con estado compartido y cleanup
status: accepted
date: 2026-04-30
deciders:
  - gateway-team
tags:
  - otap
  - wirepas
  - state-machine
related_adrs:
  - ADR-0001
  - ADR-0002
  - ADR-0004
  - ADR-0005
supersedes: []
superseded_by: []
external_interfaces:
  consumes:
    - name: Ender OTAP command envelope
      protocol: MQTT + protobuf
      contract: EnvelopeV1 on ender/command/otap/{step}/{gateway_id}
      owner: ender
  publishes:
    - name: Ender OTAP status envelope
      protocol: MQTT + protobuf/json payloads
      contract: ender/status/otap/{step}/{gateway_id}
      owner: ender
internal_components:
  - src/domain/otap/handler.py
  - src/domain/otap/steps/*
  - src/domain/otap/services/*
  - src/domain/otap/protobuf.py
  - src/domain/otap/activity_state.py
---

## Contexto

El proceso OTAP requiere coordinación multi-step y recursos persistentes temporales (firmware local, conexión Wirepas, estado de campaña). Sin un modelo de estado explícito, aparecen campañas huérfanas, timeouts opacos y errores difíciles de limpiar.

## Decisión

Modelar OTAP como máquina de campaña con steps estrictos:

`INVENTORY -> PROPAGATE -> PROCESSING -> COLLECT`

y con mecanismos obligatorios:

- Estado de campaña en memoria (`CampaignState`).
- Estado compartido de actividad OTAP en archivo (`otap_active`) para coordinación con watchdogs.
- Watchdog de campaña para cleanup automático.
- Respuestas tipadas por step en envelope común.

## Consecuencias

### Positivas
- Flujo determinista y observable.
- Mejor recuperación ante errores y campañas incompletas.
- Coordinación segura con procesos paralelos (p. ej. muestreo de nodos watchdog).

### Negativas / trade-offs
- Mayor complejidad de estados y temporización.
- Necesidad de mantener compatibilidad del contrato protobuf.

## Impacto de integración

Para proyectos externos (Ender), la semántica de campaña queda estable:

- comando por step,
- respuesta por step,
- códigos de error consistentes,
- topic naming predecible.

## Verificación

- `OTAPHandler` enruta por step y publica respuesta por topic de status.
- `activity_state.py` marca actividad OTAP para coordinación cruzada.
- Steps encapsulados (`inventory`, `propagate`, `processing`, `collect`).

## Modelo mínimo para esquema

```yaml
entity_type: adr
primary_key: ADR-0003
state_machine:
  states: [inventory, propagate, processing, collect]
  transitions:
    - from: inventory
      to: propagate
    - from: propagate
      to: processing
    - from: processing
      to: collect
edges:
  - type: depends_on
    target: ADR-0002
```
