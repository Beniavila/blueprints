# ADR-007: Remote Software Updates and Command Plans

**Status:** Accepted  
**Date:** 2026-04-30

---

## Context

Hansō already executes several remote operational workflows over connected gateways:

- Metal Gear updates
- `gateway_service` updates
- Habaki updates
- command-template execution

Before consolidation, these flows tended to drift toward controller-heavy implementations with duplicated job orchestration, streaming and shell-plan assembly.

At the same time, the system already had the right transport foundation:

- broker-mediated remote execution
- asynchronous jobs
- SSE log streaming
- artifact delivery through MinIO

The missing part was to treat all these operations as one architectural family instead of unrelated features.

---

## Decision

Hansō will model remote operational actions as **command plans executed through a common gateway command executor**.

This decision applies to:

- software updates
- batch updates
- saved command templates
- future remote maintenance actions that are step-based and streamable

---

## Architectural Principles

### 1. Thin controllers

Controllers validate HTTP input, enforce access and delegate to use cases.

They should not own:

- command-plan construction
- remote execution transport details
- artifact URL generation
- job lifecycle internals

### 2. Common execution port

Remote execution goes through a single application port:

- `IGatewayCommandExecutor`

Current implementation:

- broker-backed adapter through `BrokerCommandExecutor`

This keeps software rollout logic independent from broker HTTP details.

### 3. Job-oriented execution

Long-running remote operations must be represented as jobs with:

- `job_id`
- streamed logs
- final success/failure state
- step-by-step output

### 4. Command-plan abstraction

Different operational workflows should compile to the same conceptual structure:

- ordered steps
- timeout per step
- critical/non-critical behavior
- per-gateway execution result

---

## Current Implementation Shape

The architecture is already materially present in the codebase:

- `StartSoftwareUpdateUseCase`
- `StreamJobOutputUseCase`
- `IGatewayCommandExecutor`
- `IArtifactUrlProvider`
- `IJobStore`
- command template management use cases

Relevant runtime entrypoints:

- `POST /gateways/software-updates/start`
- `POST /gateways/software-updates/batch-start`
- `GET /gateways/software-updates/stream/<job_id>`
- command-template CRUD and run endpoints

Supported package/update families today:

- `metal_gear`
- `gateway_service`
- `habaki`

---

## Responsibilities by Layer

### Controllers

- parse request
- authorize
- invoke use case
- return JSON or SSE

### Application use cases

- validate operation semantics
- resolve artifact/image references
- build execution plan
- create and finish jobs
- stream logs
- coordinate batch behavior

### Infrastructure adapters

- execute commands on gateways through broker connectivity
- generate presigned artifact URLs
- persist/stream job output
- query version repositories

---

## Consequences

### Positive

- One execution model for updates and prefixed command workflows.
- Less duplication across controllers.
- Easier addition of new remote operational actions.
- Better observability through shared job/log semantics.
- Clean fit with broker-based connectivity and MinIO-backed artifacts.

### Tradeoffs

- Some legacy update/provisioning flows still coexist outside this model.
- The abstraction is only valuable if new features keep using it instead of bypassing it in controllers.

---

## Explicit Non-Goals

This ADR does not claim that all provisioning has already been migrated.

In particular:

- legacy Ansible provisioning still exists
- SSH-era paths are not fully retired

This ADR covers the architectural family of **broker-connected remote software/update operations**, not every bootstrap path in the repository.

---

## Related Documents

- [ADR-003](./003_eliminate_ansible.md) — migration away from Ansible-over-SSH
- [ADR-006](./006_go_broker_connection_management.md) — broker runtime used by the executor
- `docs/gateway_updates_architecture_plan.md` — broader design notes and implementation planning
