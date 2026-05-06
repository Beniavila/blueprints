# ADR-002: Reverse Gateway Connectivity via WebSocket / QUIC

**Status:** Accepted, later revised, partially implemented as a hybrid system  
**Date:** 2026-02-16  
**Last updated:** 2026-04-30

---

## Why this ADR exists

This decision replaced the original model of "one SSH reverse tunnel and one port per gateway" with a persistent reverse connection initiated by the gateway itself.

That decision still stands.

What changed afterwards is the implementation shape:

- WebSocket was the first target transport.
- QUIC later became the primary transport.
- The in-process Python QUIC server was then replaced in production by `hanso-broker` in Go.
- Legacy SSH and some Ansible provisioning paths still coexist with the new model.

This ADR is therefore about the connectivity decision, not about claiming that every legacy path has already been removed.

---

## Current Runtime State

As of 2026-04-30:

1. Gateways connect primarily through QUIC to `hanso-broker` on `UDP 4433`.
2. WebSocket remains as a compatibility path for legacy gateways.
3. Presence is maintained in Redis, not in Flask process memory.
4. Exec and terminal relay are implemented today through the broker HTTP API.
5. Legacy SSH tunnel infrastructure still exists for some operational and provisioning flows.

Habaki remains intentionally narrow in scope:

- it owns connectivity, reconnection and relay
- it does not own monitoring business logic
- metrics payload generation belongs to Metal Gear / gateway-side software

The authoritative production path is:

```text
Gateway (Habaki)
  -> QUIC / WebSocket
  -> hanso-broker (Go)
  -> Redis presence + events
  -> Hansō (Flask) for UI, orchestration and persistence
```

---

## Decision

Hansō will use reverse gateway connectivity instead of inbound SSH-per-port as the primary control plane.

### Core principles

- Gateways initiate the connection.
- Operators never need direct inbound network reachability to field gateways.
- The connection is long-lived and bidirectional.
- The transport is abstracted from business logic.

---

## Revisions

### Revision 1: Habaki as the connection agent

Habaki became the small, durable connection agent, decoupled from frequent Metal Gear updates.

### Revision 2: QUIC becomes primary

QUIC superseded WebSocket as the preferred transport for field connectivity because it handles LTE/mobile scenarios better.

### Revision 3: Broker extracted from Flask runtime

The production implementation moved from an embedded Python QUIC server to a dedicated Go broker (`ADR-006`).

This means the original "Flask keeps the connection registry in memory" model is no longer the production architecture.

---

## What is implemented today

### Presence and online state

- Broker writes `gateway:presence:{gw_id}` with TTL in Redis.
- Broker also maintains `gateway:online`.
- Hansō reads presence indirectly from Redis-backed services.

### Metrics path

- Habaki relays metrics generated outside itself.
- Broker publishes `gateway:events`.
- Hansō consumes those events and persists metrics in PostgreSQL.
- The stable gateway-side integration model is documented in `docs/habaki-metal-gear-integration.md`.

### Remote operations

- Command execution is implemented.
- Terminal relay is implemented.
- Both go through broker HTTP API.

### Monitoring views

- QUIC monitoring is the main live monitoring experience.
- Legacy monitoring and SSH-era pieces still exist in parallel.

---

## What is not fully retired

The original SSH world has not disappeared completely.

Still present:

- `gateway_ports`
- host-side `port_service`
- SSH tunnel checks in some views
- Ansible provisioning endpoint `/provision`

So the real system is hybrid:

```text
Primary path:   QUIC/WebSocket broker connectivity
Legacy path:    SSH tunnel + port management + Ansible provisioning
```

That hybrid state must be documented explicitly because it affects debugging and operations.

---

## Operational Notes

### Metrics source file

The current documented source path for Habaki-consumed status is `/tmp/metal-gear-status.json`, configurable via `HABAKI_METAL_GEAR_STATUS`.

Older references to `/var/habaki/status.json` are historical and should not be treated as the current default.

### Authentication model

- Gateway auth is handled by the broker with `gw_id` and token.
- Operator auth is separate and remains session-based in Flask.

---

## Related Contracts

- `docs/contracts/transport_heartbeat_contract.md`
- `docs/contracts/presence_scaling_contract.md`
- `docs/contracts/go_broker_hanso_contract.md`
- `docs/habaki-metal-gear-integration.md`

---

## Consequences

### Positive

- Scales better than SSH-per-port.
- Works for NATed gateways.
- Enables broker-mediated exec and terminal access.
- Decouples connection handling from gateway business logic.

### Tradeoffs

- Requires Redis and broker coordination.
- Introduces a hybrid period where both broker-based and SSH-era mechanisms coexist.
- Operational docs must distinguish primary path from legacy fallback.

---

## Relationship to Other ADRs

- [ADR-006](./006_go_broker_connection_management.md): production broker implementation.
- [ADR-003](./003_eliminate_ansible.md): provisioning migration; still incomplete.
- [ADR-001](./001_hexagonal_architecture.md): business logic remains separated from transport adapters.
