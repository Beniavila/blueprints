# C4 Nivel 1 — Contexto del Sistema (Metal Gear)

Fecha de revisión: 2026-04-30  
Estado: validado contra código actual y roadmap de refactor.

## Propósito

**Metal Gear** es el agente que corre dentro de cada gateway y ejecuta tres funciones principales:

1. Recibir y ejecutar comandos remotos (legacy y OTAP Ender) vía MQTT.
2. Operar la red Wirepas local para inventario/propagación/procesado/collect de firmware.
3. Vigilar la salud del gateway y publicar estado local para Habaki/Hansō.

## Personas y sistemas externos

- **Equipo de operaciones / plataforma Ender**: dispara campañas OTAP y comandos de control.
- **Cloud MQTT Broker**: canal de comandos legacy (`cl-req/gw/...`) y OTAP Ender (`ender/command/otap/...`).
- **Broker MQTT local del gateway (EMQX/Wirepas)**: canal de comandos locales y transporte para Wirepas SDK.
- **Red Wirepas (sinks + nodos)**: destino de operaciones OTAP y consulta de estado.
- **Habaki Agent**: lee `/tmp/metal-gear-status.json` generado por Metal Gear.
- **Hansō**: backend central que recibe métricas de Habaki.
- **Linux/Systemd/Docker/ModemManager**: plataforma y servicios del host gestionados por Metal Gear.

## Diagrama de contexto

```mermaid
flowchart LR
    Ops[Operaciones / Ender] -->|Campañas OTAP + comandos| Broker[(Cloud MQTT Broker)]
    Broker -->|MQTT topics legacy y OTAP| MG[Metal Gear\n(agente en gateway)]

    MG -->|Control local MQTT| LBroker[(Broker MQTT local)]
    MG -->|Operaciones OTAP\n(via Wirepas SDK)| Wirepas[(Red Wirepas)]

    MG -->|Escribe estado JSON| Habaki[Habaki Agent]
    Habaki -->|Envío de métricas| Hanso[Hansō]

    MG -->|Comandos de sistema| Host[Linux + systemd + Docker + mmcli]
```

## Límites y responsabilidades

### Dentro de Metal Gear
- Orquestación de comandos MQTT.
- Ejecución OTAP Ender (INVENTORY → PROPAGATE → PROCESSING → COLLECT).
- Watchdogs de contenedores, conectividad, timezone, estado Habaki y nodos Wirepas.
- Escritura atómica de estado (`/tmp/metal-gear-status.json`).

### Fuera de Metal Gear
- Persistencia de métricas históricas (Hansō).
- Transporte WAN del estado (Habaki).
- Orquestación de campañas centralizadas (Ender).
- Ejecución real en malla RF (Wirepas network).
