---
adr_id: ADR-0004
title: Watchdogs como subsistema de resiliencia y telemetría operativa
status: accepted
date: 2026-04-30
deciders:
  - gateway-team
tags:
  - watchdog
  - reliability
  - observability
related_adrs:
  - ADR-0001
  - ADR-0003
  - ADR-0005
supersedes: []
superseded_by: []
external_interfaces:
  consumes: []
  publishes:
    - name: Habaki status file
      protocol: local-file-json
      contract: /tmp/metal-gear-status.json
      owner: habaki
internal_components:
  - src/watchdogs/base.py
  - src/watchdogs/container_watchdog.py
  - src/watchdogs/connectivity_watchdog.py
  - src/watchdogs/timezone_watchdog.py
  - src/watchdogs/habaki_status_watchdog.py
  - src/watchdogs/wirepas_nodes_watchdog.py
---

## Contexto

El gateway debe auto-recuperarse de fallos de conectividad, contenedores o configuración del entorno, y además exponer estado operativo a otros proyectos (Habaki/Hansō).

## Decisión

Estandarizar monitores de fondo sobre `BaseWatchdog` + `WatchdogManager`, y centralizar responsabilidades:

- salud de contenedores,
- conectividad y política de backoff,
- timezone,
- snapshot de estado Habaki,
- muestreo de nodos Wirepas coordinado con OTAP.

## Consecuencias

### Positivas
- Ciclo de vida uniforme (`start`, `stop`, loop controlado).
- Menor duplicación y mejor trazabilidad de errores.
- Export de estado consistente para consumo externo.

### Negativas / trade-offs
- Competencia de recursos si intervalos no se calibran bien.
- Necesidad de coordinación explícita con OTAP para evitar interferencias.

## Impacto de integración

Este ADR define la salida principal de telemetría compartible con otros proyectos en gateway:

- archivo JSON atómico con estado operativo,
- semántica de actualización periódica,
- campos orientados a consumo externo por Habaki.

## Verificación

- Watchdogs registrados y arrancados en runtime.
- `HabakiStatusWatchdog` escribe JSON atómico.
- `WirepasNodesWatchdog` respeta el estado de actividad OTAP.

## Modelo mínimo para esquema

```yaml
entity_type: adr
primary_key: ADR-0004
exports:
  - name: habaki_status
    path: /tmp/metal-gear-status.json
edges:
  - type: constrained_by
    target: ADR-0003
```
