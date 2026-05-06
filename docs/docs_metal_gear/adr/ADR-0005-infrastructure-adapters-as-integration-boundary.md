---
adr_id: ADR-0005
title: Adaptadores de infraestructura como frontera de integración con sistemas externos
status: accepted
date: 2026-04-30
deciders:
  - gateway-team
tags:
  - ports-and-adapters
  - integration
  - security
related_adrs:
  - ADR-0001
  - ADR-0002
  - ADR-0003
  - ADR-0004
supersedes: []
superseded_by: []
external_interfaces:
  consumes:
    - name: Linux host capabilities
      protocol: syscall/cli
      contract: reboot, rtcwake, docker, mmcli, timedatectl
      owner: gateway-os
    - name: Wirepas SDK
      protocol: python-library
      contract: wirepas_mqtt_library APIs
      owner: wirepas
    - name: MQTT brokers
      protocol: MQTT
      contract: paho MQTT API + project topics
      owner: cloud/local
  publishes: []
internal_components:
  - src/application/ports/mqtt_port.py
  - src/application/ports/system_port.py
  - src/application/ports/wirepas_port.py
  - src/infrastructure/mqtt/paho_client.py
  - src/infrastructure/system/linux_adapter.py
  - src/infrastructure/system/timezone_adapter.py
  - src/infrastructure/wirepas/adapter.py
---

## Contexto

Metal Gear interactúa con múltiples tecnologías externas (broker MQTT, OS Linux, Docker, módem, SDK Wirepas). Si la lógica de dominio depende directamente de esas APIs, el sistema se vuelve rígido y difícil de probar.

## Decisión

Aplicar patrón de puertos/adaptadores:

- `application/ports/*` define contratos estables.
- `infrastructure/*` implementa detalles concretos.
- Dominio y servicios consumen interfaces, no librerías concretas.

## Consecuencias

### Positivas
- Aislamiento de cambios en dependencias externas.
- Testing por dobles/mocks en puertos.
- Integración externa más predecible y gobernable.

### Negativas / trade-offs
- Sobrecarga inicial de diseño e implementación.
- Riesgo de fuga de detalles concretos si no se respetan interfaces.

## Impacto de integración

Este ADR define el punto recomendado para integrar otros proyectos:

- por contrato de puerto (si integración es interna al repo), o
- por contrato externo (MQTT topics / JSON status / sistema),

sin acoplarse a clases concretas de infraestructura.

## Verificación

- Existen puertos `MQTTPort`, `SystemPort`, `WirepasPort`.
- Existen adaptadores concretos para esas interfaces.
- Lógica de negocio OTAP y watchdogs usa abstracciones para operaciones del sistema.

## Modelo mínimo para esquema

```yaml
entity_type: adr
primary_key: ADR-0005
ports:
  - MQTTPort
  - SystemPort
  - WirepasPort
edges:
  - type: enables
    target: ADR-0002
  - type: enables
    target: ADR-0004
```
