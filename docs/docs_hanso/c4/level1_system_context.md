# C4 Level 1: System Context

> **Last updated:** 2026-04-30
> Refleja el sistema realmente desplegado hoy: broker Go para QUIC, Flask para UI/API, PostgreSQL + SQLite compartida, MinIO y sincronización con portales remotos.

---

## System Context

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         Operators / Admins                           │
│                    Browser (primary) / Mobile browser                │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTPS / Web UI / SSE / WS
                                ▼
                     ┌─────────────────────────────┐
                     │           Hansō             │
                     │  Gateway operations portal  │
                     │  + API + monitoring + OTA   │
                     └──────────────┬──────────────┘
                                    │
             ┌──────────────────────┼──────────────────────────┐
             │                      │                          │
             ▼                      ▼                          ▼
   ┌─────────────────┐   ┌────────────────────┐    ┌──────────────────────┐
   │ hanso-broker    │   │ Data stores        │    │ External services    │
   │ QUIC / WS relay │   │ PostgreSQL         │    │ Smartec portals      │
   │ Redis presence  │   │ Shared SQLite      │    │ Docker Hub registry  │
   └────────┬────────┘   │ Redis              │    │ MinIO object store   │
            │            │ YAML users config   │    └──────────────────────┘
            │            └────────────────────┘
            │
            ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │                       Field gateways                              │
   │ Habaki agent + Metal Gear + gateway-service + local SQLite/env   │
   └───────────────────────────────────────────────────────────────────┘
            │
            ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │                 Wirepas / field devices / sensors                │
   └───────────────────────────────────────────────────────────────────┘
```

---

## Actors

### Operators

- Acceden al portal `/gateways`, monitorización QUIC, terminal web y paneles de versiones.
- Lanzan actualizaciones de `metal_gear`, `gateway_service` y `habaki`.
- Corrigen metadatos de gateways, sincronizan organización/cluster y consultan estado.

### Gateways

- Dispositivos ARM64 detrás de NAT.
- Mantienen conexión persistente con `hanso-broker` vía QUIC (`UDP 4433`) o WebSocket legacy.
- Ejecutan comandos remotos, exponen terminal y envían métricas generadas por Metal Gear / gateway-service.

### Sistemas externos

- Portales remotos `prod`, `senegal`, `beta`, `dev` para resolver organización, servicio y localización.
- Docker Hub para descubrir tags de `gateway_service`.
- MinIO para servir artefactos de Metal Gear y Gateway Maker.

---

## System Purpose

Hansō es la plataforma central de operación de gateways. Hoy combina cuatro responsabilidades principales:

1. Inventario y metadatos
   Guarda `gw_id`, cluster, organización, servicio, versiones y coordenadas, con mezcla de persistencia en PostgreSQL y SQLite compartida.

2. Conectividad y operación remota
   Usa `hanso-broker` para QUIC/WebSocket, terminal web y ejecución de comandos.

3. Monitorización y diagnóstico
   Consume presencia y eventos desde Redis, persiste métricas en PostgreSQL y expone vistas QUIC/retro/legacy para operación.

4. Distribución y updates
   Gestiona versiones de Metal Gear y Gateway Maker, genera URLs firmadas en MinIO y ejecuta planes de actualización sobre gateways online.

---

## External Dependencies

### hanso-broker

- Servicio Go separado para conexiones persistentes de gateways.
- Mantiene presencia en Redis y expone API interna de exec/terminal.

### PostgreSQL

- Base principal de `gateways`, `gateway_metrics`, `metal_gear_versions`, `gateway_maker_*`.

### Shared SQLite

- Sigue siendo necesaria para `gateway_ports`, `gateway_configs`, `gateway_connection_states`, `gateway_sql_query_templates`.
- En producción convive con PostgreSQL; no es solo un artefacto de desarrollo.

### Redis

- Presencia (`gateway:presence:*`, `gateway:online`) y pub/sub (`gateway:events`).
- No se usa hoy como store principal de sesión de operador.

### MinIO

- Almacena artefactos descargables de Metal Gear y Gateway Maker.

### Remote gateway sources

- Hansō consulta portales remotos para resolver `org_id`, `org_name`, `service_id`, `service_name` y localización estimada.

### Port service host-side

- Servicio externo al compose principal para gestión legacy de puertos SSH/túneles.
- Sigue vigente para flujos heredados y compatibilidad operativa.

---

## Security Boundaries

### Operator access

- Login web con sesión Flask en cookie.
- Usuarios almacenados en YAML (`USERS_CONFIG_PATH`) con migración transparente de hash legacy a bcrypt.
- Autorización por rol (`admin` / `user`) y por `allowed_sources`.

### Gateway access

- Autenticación de gateway en el broker con `gw_id` y token.
- Exec/terminal pasan por la API interna del broker.

### Legacy APIs

- Algunos endpoints heredados siguen protegidos por tokens (`API_TOKEN`, `WAIT_SSH_TOKEN`, `GW_LIST_TOKEN`).
- Conviven con el portal autenticado; no toda la superficie HTTP está unificada aún.

---

## Current Scale Shape

| Area | Current shape |
|---|---|
| Gateway transport | QUIC primario, WebSocket legacy |
| Presence | Redis TTL + set de online |
| Metrics | PostgreSQL en prod, SQLite legacy/fallback |
| User auth | Flask session + YAML users |
| Command execution | Broker HTTP API |
| Provisioning | Mixto: bootstrap/QUIC nuevos + Ansible legacy `/provision` |

---

*Next: [Level 2 - Container Diagram](./level2_containers.md)*
