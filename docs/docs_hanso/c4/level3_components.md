# C4 Level 3: Component Diagram

> **Last updated:** 2026-04-30
> Vista interna del contenedor `hanso` según el código actual, no según el roadmap idealizado.

---

## Component View: `hanso`

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                              hanso (Flask)                              │
│                                                                          │
│  Inbound HTTP/UI                                                         │
│  ┌────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │ Auth + session         │  │ Portal / API controllers              │  │
│  │ auth_controller        │  │ gateway / monitoring / config / OTA   │  │
│  └───────────┬────────────┘  └──────────────────┬─────────────────────┘  │
│              │                                  │                        │
│              ▼                                  ▼                        │
│  ┌────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │ auth_service           │  │ Application services / use cases      │  │
│  │ YAML users + bcrypt    │  │                                        │  │
│  │ Flask session cookie   │  │ - gateway CRUD/bootstrap/migration     │  │
│  └───────────┬────────────┘  │ - monitoring + presence aggregation    │  │
│              │               │ - software updates                     │  │
│              │               │ - command templates                    │  │
│              │               │ - remote metadata sync                 │  │
│              │               └──────────────────┬─────────────────────┘  │
│              │                                  │                        │
│              │                                  ▼                        │
│              │               ┌────────────────────────────────────────┐  │
│              │               │ Infrastructure adapters                │  │
│              │               │                                        │  │
│              │               │ - BrokerCommandExecutor                │  │
│              │               │ - Postgres repositories                │  │
│              │               │ - SQLite repositories/shared state     │  │
│              │               │ - MinIO artifact provider              │  │
│              │               │ - broker_events_worker                 │  │
│              │               └──────┬──────────────┬───────────────┬──┘  │
│              │                      │              │               │     │
│              ▼                      ▼              ▼               ▼     │
│         YAML users            PostgreSQL      Shared SQLite      Redis   │
│                                                    │                    │
│                                                    ▼                    │
│                                           remote portal APIs            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Main Components

### Auth and session layer

**Files**

- [app/services/auth_service.py](/home/jarvis/projects/hanso/app/services/auth_service.py:1)
- [app/controllers/auth_controller.py](/home/jarvis/projects/hanso/app/controllers/auth_controller.py:1)

**Current behavior**

- Users are stored in YAML (`USERS_CONFIG_PATH`).
- Passwords migrate transparently from legacy hashes to bcrypt.
- Operator session is stored in Flask session cookie state, not Redis.
- Access control includes `role` and `allowed_sources`.

---

### Gateway inventory and metadata

**Files**

- [app/controllers/gateway_controller.py](/home/jarvis/projects/hanso/app/controllers/gateway_controller.py:1)
- [app/services/remote_gateway_service.py](/home/jarvis/projects/hanso/app/services/remote_gateway_service.py:1)
- [app/services/gateway_presence_service.py](/home/jarvis/projects/hanso/app/services/gateway_presence_service.py:1)

**Responsibilities**

- CRUD and listing of gateways.
- Merge metadata from PostgreSQL, shared SQLite and live presence.
- Sync org/service/source/location from remote portal APIs.
- Keep overview and QUIC monitoring aligned even when stores diverge.

---

### Monitoring and QUIC operations

**Files**

- [app/controllers/monitoring_quic_controller.py](/home/jarvis/projects/hanso/app/controllers/monitoring_quic_controller.py:1)
- [app/infrastructure/broker_events_worker.py](/home/jarvis/projects/hanso/app/infrastructure/broker_events_worker.py:1)

**Responsibilities**

- Render QUIC monitoring datasets.
- Consume latest metrics from PostgreSQL with SQLite fallback.
- Query broker-derived online state indirectly through Redis-backed services.
- Provide geolocation backfill, cluster diagnostics and SQL-on-gateway utilities.

---

### Remote command execution

**Files**

- [app/infrastructure/execution/broker_command_executor.py](/home/jarvis/projects/hanso/app/infrastructure/execution/broker_command_executor.py:1)
- [app/services/broker_api_service.py](/home/jarvis/projects/hanso/app/services/broker_api_service.py:1)

**Current behavior**

- Main execution path uses broker HTTP API.
- Flask-local WebSocket manager exists as fallback path for non-broker setups.
- Terminal and command execution are already implemented; they are not future-only.

---

### Software update orchestration

**Files**

- [app/controllers/software_updates_controller.py](/home/jarvis/projects/hanso/app/controllers/software_updates_controller.py:1)
- [app/application/use_cases/software_update/start_software_update_use_case.py](/home/jarvis/projects/hanso/app/application/use_cases/software_update/start_software_update_use_case.py:1)

**Responsibilities**

- Start single or batch update jobs.
- Support `metal_gear`, `gateway_service` and `habaki`.
- Stream job logs via SSE.
- Resolve artifacts from MinIO and tags from Docker Hub.

---

### Gateway Maker distribution

**Files**

- [app/controllers/gateway_maker_versions_controller.py](/home/jarvis/projects/hanso/app/controllers/gateway_maker_versions_controller.py:1)

**Responsibilities**

- Manage Gateway Maker versions for Windows/Ubuntu.
- Serve updater metadata and downloads.
- Manage machine enrollment and operational credentials.

---

### Configuration and shared operational state

**Files**

- [app/controllers/config_controller.py](/home/jarvis/projects/hanso/app/controllers/config_controller.py:1)
- [shared/db.py](/home/jarvis/projects/hanso/shared/db.py:1)

**Responsibilities**

- Read/apply gateway `.env` values.
- Persist last-known config snapshots.
- Maintain shared SQLite tables still used by overview, monitoring and ops tooling.

---

### Legacy provisioning

**Files**

- [app/controllers/provisioning_controller.py](/home/jarvis/projects/hanso/app/controllers/provisioning_controller.py:1)
- [ansible/provision_gateway.yml](/home/jarvis/projects/hanso/ansible/provision_gateway.yml:1)

**Current status**

- Still launches `ansible-playbook`.
- Exists alongside newer QUIC/bootstrap/update flows.
- This is the main reason ADR-003 must be read as partially implemented migration, not finished architecture.

---

## Persistence Split

### PostgreSQL

Used for:

- `gateways`
- `gateway_metrics`
- Metal Gear versions
- Gateway Maker versions/credentials/machines

### Shared SQLite

Used for:

- `gateway_ports`
- `gateway_configs`
- `gateway_connection_states`
- `gateway_sql_query_templates`
- monitoring and compatibility data

### YAML

Used for:

- portal users

This split is important enough that the docs should not compress it into a single generic "database" box.

---

## Cross-Cutting Notes

- `dependency-injector` is the active DI mechanism.
- Postgres repositories use `psycopg2` pools, not SQLAlchemy.
- Redis is presence/event infrastructure, not the primary auth/session store.
- Some operational flows are intentionally hybrid because the migration is incomplete.

---

*Previous: [Level 2 - Container Diagram](./level2_containers.md)*
