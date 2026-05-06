# ADR-003: Move Provisioning Away From Ansible-Over-SSH

**Status:** Accepted as target direction, partially implemented  
**Date:** 2026-02-16  
**Last updated:** 2026-04-30

---

## Why this ADR exists

The original provisioning model depended on:

- reverse SSH tunnel availability
- manual port management
- `ansible-playbook` execution from the backend

That model creates too much coupling between connectivity, provisioning and troubleshooting. The architectural direction to replace it is still correct.

What is no longer correct is pretending that the migration is already complete.

---

## Current Runtime State

Today the codebase contains two provisioning/update families:

### Legacy path

- `/provision` still runs `ansible-playbook`
- inventory is generated dynamically
- status is tracked in legacy repositories/log files

Reference:

- [app/controllers/provisioning_controller.py](/home/jarvis/projects/hanso/app/controllers/provisioning_controller.py:115)

### Newer path

- bootstrap and QUIC-oriented flows exist
- software updates run as async command plans over broker connectivity
- `metal_gear`, `gateway_service` and `habaki` updates already use the new orchestration model

References:

- [app/application/use_cases/gateway/quic_provision_gateway_use_case.py](/home/jarvis/projects/hanso/app/application/use_cases/gateway/quic_provision_gateway_use_case.py:1)
- [app/application/use_cases/software_update/start_software_update_use_case.py](/home/jarvis/projects/hanso/app/application/use_cases/software_update/start_software_update_use_case.py:1)
- [app/controllers/software_updates_controller.py](/home/jarvis/projects/hanso/app/controllers/software_updates_controller.py:67)

The real status is therefore hybrid, not finished migration.

---

## Decision

Provisioning and operational rollout should move toward direct command-plan execution over the gateway reverse connection instead of Ansible-over-SSH.

### Intended properties

- No dependency on SSH tunnel readiness as the primary happy path.
- Better progress reporting.
- Better traceability per command/job.
- Reuse of the same broker connectivity used for monitoring and remote operations.

---

## What has already been achieved

### Achieved

- Broker-based command execution exists.
- Async job streaming exists.
- Update plans for multiple package types exist.
- QUIC-oriented bootstrap/provisioning use cases exist in the application layer.

### Not achieved yet

- The legacy `/provision` endpoint has not been retired.
- Ansible playbooks still exist and are still executed.
- Shared operational state still spans SQLite, filesystem logs and newer job flows.

---

## Revised interpretation of this ADR

This ADR should be read as:

> "Ansible-over-SSH is no longer the desired long-term provisioning architecture."

It should not be read as:

> "The codebase no longer contains Ansible provisioning."

That second statement is false today.

---

## Practical Architecture Today

```text
Legacy provisioning
  Hansō -> ansible-playbook -> SSH tunnel -> gateway

Newer operational/update flows
  Hansō -> broker HTTP API -> connected gateway
```

The migration is directional and incremental.

---

## Consequences

### Positive

- The target architecture is still the right one.
- Newer flows already demonstrate that command-plan execution works.
- Updates and remote operations benefit from the same connectivity plane.

### Ongoing cost

- Two provisioning models must still be understood and maintained.
- Docs and runbooks must call out which path each operation uses.
- Incidents can still involve SSH/Ansible even though the strategic direction moved away from them.

---

## Follow-up Work Still Needed

1. Decide whether `/provision` will be migrated or explicitly kept as a break-glass path.
2. Unify progress/logging semantics between legacy provisioning and newer async jobs.
3. Reduce dependence on host-side port management where the QUIC path is already sufficient.

---

## Related ADRs

- [ADR-002](./002_websocket_gateway_management.md): reverse gateway connectivity is the transport foundation.
- [ADR-006](./006_go_broker_connection_management.md): Go broker is the production connectivity/runtime layer.
