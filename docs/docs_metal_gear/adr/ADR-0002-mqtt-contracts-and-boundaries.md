---
adr_id: ADR-0002
title: Contratos MQTT separados por dominio (legacy, OTAP Ender y comandos locales)
status: accepted
date: 2026-04-30
deciders:
  - gateway-team
tags:
  - mqtt
  - integration
  - contracts
related_adrs:
  - ADR-0001
  - ADR-0003
  - ADR-0005
supersedes: []
superseded_by: []
external_interfaces:
  consumes:
    - name: Legacy cloud commands
      protocol: MQTT
      contract: cl-req/gw/{gw_id}, cl-req/gw/gateway_data
      owner: cloud-platform
    - name: Ender OTAP commands
      protocol: MQTT
      contract: ender/command/otap/{step}/{gateway_id}
      owner: ender
    - name: Local wirepas commands
      protocol: MQTT
      contract: gateway/command/wirepas/{gw_id}
      owner: local-stack
  publishes:
    - name: Legacy cloud responses
      protocol: MQTT
      contract: cl-res/gw/gateway_data
      owner: cloud-platform
    - name: Ender OTAP status
      protocol: MQTT
      contract: ender/status/otap/{step}/{gateway_id}
      owner: ender
    - name: Local command acknowledgements
      protocol: MQTT
      contract: gateway/response/wirepas/{gw_id}
      owner: local-stack
internal_components:
  - models/mqtt_client.py
  - src/application/services/mqtt_service.py
  - src/application/services/local_command_service.py
  - src/domain/constants.py
---

## Contexto

Metal Gear debe convivir con tres flujos distintos de mensajería MQTT: legacy cloud, OTAP nuevo de Ender y operación local del gateway. Mezclarlos en un solo contrato genera ambigüedad y acoplamiento con clientes externos.

## Decisión

Separar contratos MQTT por dominio funcional y mantener topics explícitos e independientes.

- Legacy: discovery/comandos históricos.
- Ender OTAP: campañas protobuf con flujo de steps.
- Local: operaciones de mantenimiento y ACK JSON/raw.

## Consecuencias

### Positivas
- Integración externa clara por tipo de consumidor.
- Menos riesgo de romper compatibilidad de clientes existentes.
- Facilita observabilidad por canal.

### Negativas / trade-offs
- Mayor número de subscriptions y rutas de manejo.
- Necesidad de versionado y disciplina de contrato por canal.

## Impacto de integración

Proyectos externos se conectan por su dominio:

- Plataforma cloud legacy solo usa `cl-req/*` y `cl-res/*`.
- Ender usa exclusivamente `ender/command/otap/*` y `ender/status/otap/*`.
- Stack local usa `gateway/command/wirepas/*` y `gateway/response/wirepas/*`.

## Verificación

- Suscripciones y publicaciones separadas en runtime.
- `MQTTTopics` centraliza parte del naming de contrato.
- `LocalCommandService` procesa el canal local de forma aislada.

## Modelo mínimo para esquema

```yaml
entity_type: adr
primary_key: ADR-0002
interfaces:
  consumes_count: 3
  publishes_count: 3
edges:
  - type: depends_on
    target: ADR-0001
  - type: informs
    target: ADR-0003
```
