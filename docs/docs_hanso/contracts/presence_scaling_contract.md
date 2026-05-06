# Contrato de Presencia y Escalado (miles de gateways)

## 1. Objetivo

Definir un modelo sostenible para **10k+ gateways** manteniendo:

- deteccion fiable de `online/offline`
- coste controlado de red y backend
- comportamiento determinista ante reconexiones masivas

## 2. Principios

- Un solo estado canonico de presencia por gateway.
- Heartbeat ligero y estable.
- Persistencia de presencia separada de persistencia de metricas.

## 3. Contrato recomendado (target)

### 3.1 Heartbeat canonico

- Direccion principal: **Habaki -> Hanso** (`ping` o `heartbeat`).
- Hanso responde `pong`/`ack` sin payload pesado.
- Intervalo recomendado: `30s` (o `60s` en entornos estables).

### 3.2 Presencia por TTL

- Hanso actualiza `last_seen` al recibir heartbeat.
- Estado:
  - `online` si `now - last_seen <= ttl`
  - `offline` si `now - last_seen > ttl`
- `ttl` recomendado: `90s` (intervalo x3).

### 3.3 Almacen de presencia

- Para gran escala: Redis (clave por `gw_id` con TTL), no SQL por heartbeat.
- SQL/Postgres/SQLite queda para historico y consultas de negocio, no para latido cada 30s.

### 3.4 Metricas desacopladas

- Produccion: cada `15-30 min` (segun coste de datos LTE).
- Diagnostico temporal: `30-60s`.
- Las metricas no determinan presencia del canal.

## 4. Reconexion y tormentas

- Backoff exponencial + jitter aleatorio en Habaki.
- Evitar reconexion sincronizada de miles de nodos tras caida de red regional.
- Recomendado:
  - base: `5s`
  - max: `300s`
  - jitter: `0-20%`

## 5. SLO de presencia recomendados

- Deteccion de desconexion: `< 120s`.
- Reaparicion en UI tras recuperacion de red: `< 90s`.
- Exito de reconexion automatica sin accion manual: `>= 99%`.

## 6. Contrato de observabilidad

Metrica minima a exponer:

- `connected_gateways`
- `heartbeat_rx_rate`
- `heartbeat_timeout_rate`
- `reconnect_attempt_rate`
- `gateway_online_transitions_total`

Alertas minimas:

- incremento anomalo de `timeout_rate` por cluster/pais
- caida brusca de `connected_gateways`

## 7. Compatibilidad con estado actual

Estado actual (transitorio):

- heartbeat bidireccional `ping/pong`
- presencia apoyada en sesion activa en Hanso

Roadmap recomendado:

1. estabilizar reconexion y timeouts de sesion
2. consolidar presencia por `last_seen + ttl`
3. mover presencia caliente a Redis TTL
4. dejar SQL para historico/reporting

## 8. Implementacion: Go broker (ADR-006, 2026-02-26)

Los pasos 3 y 4 del roadmap anterior se implementan mediante `hanso-broker`,
un servicio Go independiente que gestiona todas las conexiones QUIC/WebSocket de gateways.

Distribucion de responsabilidades:

- `hanso-broker` (Go): escribe `SETEX gateway:presence:{gw_id} 90` en cada heartbeat.
  Mantiene `gateway:online` (SET Redis). Publica en `gateway:events` (pub/sub).
- Hanso (Python): lee presencia directamente de Redis (sin llamada HTTP al broker
  para la ruta caliente). Suscribe a `gateway:events` para persistir metricas en DB.

Resultado: presencia O(1) via Redis TTL, sin SQL en la ruta caliente de heartbeat.

Ver contrato de interfaz completo: `docs/contracts/go_broker_hanso_contract.md`
Ver decision de arquitectura: `docs/adr/006_go_broker_connection_management.md`
