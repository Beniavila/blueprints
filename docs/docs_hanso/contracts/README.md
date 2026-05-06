# Contratos Hanso-Habaki

Este apartado define contratos operativos entre:

- **Gateway (Habaki)**
- **Servidor Hanso**
- **UI/monitorización**

Objetivo: evitar ambiguedades sobre estados `online/offline`, heartbeat, reconexion y persistencia.

Estos documentos complementan, no sustituyen:

- `docs/adr/002_websocket_gateway_management.md`
- `docs/adr/006_go_broker_connection_management.md`
- `docs/habaki-metal-gear-integration.md`

## Documentos

- `docs/contracts/transport_heartbeat_contract.md`
  - Contrato de mensajes (`ping`, `pong`, `metrics`, `auth`).
  - Maquina de estados de conexion.
  - Casos de corte y reconexion de red.

- `docs/contracts/presence_scaling_contract.md`
  - Contrato de presencia para escalar a miles de gateways.
  - Reglas de TTL/`last_seen`, almacenamiento de presencia y cadencias.

- `docs/contracts/go_broker_hanso_contract.md`
  - Interfaz entre `hanso-broker` y Hansō.
  - Presencia en Redis, eventos pub/sub y HTTP API interna de exec/terminal.
