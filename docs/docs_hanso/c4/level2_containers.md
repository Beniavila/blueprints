# C4 Level 2: Container Diagram

> **Last updated:** 2026-04-30
> Foto del runtime real. Distingue contenedores productivos, stores auxiliares y piezas legacy que siguen activas.

---

## Container View

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Operators / Admins                                │
│                    Browser (desktop/mobile web)                             │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ HTTPS / SSE / WS
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Hansō system                                   │
│                                                                              │
│  ┌─────────────────────────────┐     ┌────────────────────────────────────┐  │
│  │ nginx                       │     │ hanso (Flask app)                 │  │
│  │ TLS termination             │────▶│ UI + API + auth + orchestration   │  │
│  │ reverse proxy for HTTP      │     │ monitoring + updates + sync       │  │
│  └─────────────────────────────┘     └───────┬──────────────┬────────────┘  │
│                                              │              │               │
│                                              │              │               │
│                              broker HTTP API │              │ Redis pub/sub │
│                                              ▼              ▼               │
│                                   ┌────────────────┐   ┌───────────────┐    │
│                                   │ hanso-broker   │   │ redis         │    │
│                                   │ QUIC / WS      │   │ presence      │    │
│                                   │ exec / terminal│   │ gateway:events│    │
│                                   └──────┬─────────┘   └──────┬────────┘    │
│                                          │                    │             │
│                                          │                    │             │
│                           QUIC / WS from gateways             │             │
│                                          │                    │             │
│        ┌───────────────────────┬─────────┴──────────┬──────────┘             │
│        ▼                       ▼                    ▼                        │
│  ┌───────────────┐      ┌───────────────┐    ┌───────────────┐               │
│  │ postgres      │      │ shared sqlite │    │ minio         │               │
│  │ primary DB    │      │ /data/hanso   │    │ artifacts     │               │
│  └───────────────┘      └───────────────┘    └───────────────┘               │
└──────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                               Gateways                                       │
│ Habaki + Metal Gear + gateway-service + local env/db                         │
└──────────────────────────────────────────────────────────────────────────────┘

Adjacent external systems:
- Remote portal APIs: prod / senegal / beta / dev
- Docker Hub registry
- Host-side port_service for legacy SSH tunnel management
```

---

## Containers

### 1. `nginx`

**Technology:** Nginx  
**Purpose:** Public entrypoint for operator traffic

**Responsibilities**

- TLS termination for the web portal.
- Reverse proxy for HTTP/SSE/WebSocket operator traffic to Flask.
- Does not terminate QUIC; gateways connect directly to `hanso-broker` on `UDP 4433`.

**Ports**

- `80/TCP`
- `443/TCP`

---

### 2. `hanso`

**Technology:** Python, Flask, dependency-injector  
**Purpose:** Main application container

**Responsibilities**

- HTML portal and JSON endpoints.
- Session-based operator authentication using Flask cookie sessions and YAML-backed users.
- Gateway inventory and metadata management.
- QUIC monitoring views and metrics aggregation.
- Remote source synchronization (`prod`, `senegal`, `beta`, `dev`).
- Software updates for `metal_gear`, `gateway_service` and `habaki`.
- Gateway Maker version, credential and machine enrollment management.
- Command relay through broker HTTP API.

**Important internal modules**

- `app/controllers/*`
- `app/services/remote_gateway_service.py`
- `app/services/gateway_presence_service.py`
- `app/controllers/software_updates_controller.py`
- `app/controllers/gateway_maker_versions_controller.py`

**Dependencies**

- PostgreSQL for primary business data.
- Shared SQLite for legacy/shared operational state.
- Redis for presence/events.
- MinIO for artifacts.
- `hanso-broker` for exec/terminal and gateway connectivity.

---

### 3. `hanso-broker`

**Technology:** Go  
**Purpose:** Persistent gateway connection broker

**Responsibilities**

- Accept QUIC gateway connections on `UDP 4433`.
- Maintain WebSocket compatibility path for legacy gateways.
- Authenticate gateways.
- Publish presence and events into Redis.
- Expose internal HTTP API for exec and terminal relay.

**Ports**

- `4433/UDP` public
- `8090/TCP` internal

**Notes**

- This is the source of truth for online QUIC gateways.
- Hansō reads presence indirectly through Redis and uses the broker only for active command/session operations.

---

### 4. `postgres`

**Technology:** PostgreSQL 16  
**Purpose:** Primary database

**Current schema focus**

- `gateways`
- `gateway_metrics`
- `metal_gear_versions`
- `gateway_maker_versions`
- `gateway_maker_credentials`
- `gateway_maker_enroll_codes`
- `gateway_maker_machines`

**Notable absence**

- There is no first-class `users` table in the current production schema.
- There is no `provisioning_history` or `provisioning_logs` table in the shipped schema today.

---

### 5. Shared SQLite (`/data/hanso/hanso.db`)

**Technology:** SQLite  
**Purpose:** Shared operational store still required in production

**Current contents**

- `gateway_ports`
- `gateway_configs`
- `gateway_connection_states`
- `gateway_monitoring_settings`
- `gateway_sql_query_templates`
- legacy/local copies of some gateway-related tables

**Why it still exists**

- Port/tunnel management is still legacy.
- Some UI and operational flows still depend on this shared file.
- Production is hybrid, not pure PostgreSQL.

---

### 6. `redis`

**Technology:** Redis 7  
**Purpose:** Presence and event bus

**Keys/channels used**

- `gateway:presence:{gw_id}`
- `gateway:online`
- `gateway:events`

**Clarification**

- Redis is not the main store for operator sessions in the current implementation.
- Flask session cookies remain the effective portal session mechanism.

---

### 7. `minio` and `minio-init`

**Technology:** MinIO  
**Purpose:** Object storage for downloadable artifacts

**Responsibilities**

- Store Metal Gear packages.
- Store Gateway Maker releases.
- Generate presigned URLs for updates/download endpoints.

---

### 8. Host-side `port_service` (outside main compose)

**Technology:** Python service on the host  
**Purpose:** Legacy SSH tunnel/port management

**Status**

- Still active.
- Not part of the main compose file.
- Should be treated as adjacent infrastructure, not removed architecture.

---

## External Systems

### Remote portal APIs

Hansō calls external Smartec portals to resolve:

- organization
- service
- remote source
- estimated location

Configured via:

- `REMOTE_GATEWAY_SOURCES`
- `<SOURCE>_API_BASE`
- `<SOURCE>_GATEWAYS_URL`
- `<SOURCE>_NODES_URL`

### Docker Hub

Used to list and validate `gateway_service` image tags for update workflows.

---

## Main Runtime Flows

### Gateway presence

1. Gateway connects to `hanso-broker`.
2. Broker writes presence and emits events to Redis.
3. Hansō combines Redis presence with PostgreSQL/SQLite metadata for UI views.

### Remote command execution

1. Operator triggers command from Hansō UI/API.
2. Hansō calls broker HTTP API.
3. Broker relays command to the connected gateway.
4. Result returns synchronously to Hansō.

### Metadata synchronization

1. Hansō looks up a `gw_id` in configured remote portal sources.
2. Matching org/service/location data is written to PostgreSQL and `gateway_ports`.
3. UI filters and source-based permissions use those resolved values.

### Software updates

1. Hansō resolves the artifact or image version.
2. It starts an async job plan through `StartSoftwareUpdateUseCase`.
3. Job output streams back to the operator via SSE.

### Legacy provisioning

1. `/provision` still runs Ansible over SSH.
2. Newer QUIC/bootstrap/update flows coexist with that path.
3. Documentation must treat provisioning migration as incomplete.

---

## Gaps And Constraints

- Authentication is not yet centralized in PostgreSQL/Redis.
- SSH/Ansible provisioning has not been fully retired.
- Operational state is split across PostgreSQL and shared SQLite.
- The architecture is intentionally hybrid today; docs should not describe the target state as already finished.

---

*Previous: [Level 1 - System Context](./level1_system_context.md)*  
*Next: [Level 3 - Component Diagram](./level3_components.md)*
