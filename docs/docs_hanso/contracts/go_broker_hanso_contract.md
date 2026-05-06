# Contrato: Go Broker ↔ Hansō

## 1. Alcance

Este contrato define la interfaz entre `hanso-broker` (servicio Go de gestión de conexiones
persistentes de gateways) y Hansō (backend Python con lógica de negocio).

Los dos servicios se comunican a través de dos mecanismos complementarios:

1. **Redis**: presencia (TTL) y eventos/métricas (pub/sub) — sin acoplamiento directo entre servicios
2. **HTTP API del broker**: relay de comandos exec/terminal de Hansō hacia gateways

Ver la decisión de arquitectura que origina este contrato: [ADR-006](../adr/006_go_broker_connection_management.md)

---

## 2. Principio de diseño

El broker **no tiene lógica de negocio**. Es un multiplexor de conexiones QUIC/WebSocket:

- Recibe mensajes de Habaki → los pone en Redis o los reenvía a Hansō
- Recibe comandos de Hansō → los reenvía al gateway correspondiente

Hansō **no gestiona conexiones persistentes**. Delega completamente en el broker.

La fuente de verdad de presencia es **Redis**, no el broker ni Hansō.

---

## 3. Presencia (Redis TTL)

### 3.1 Escritura — broker

En cada heartbeat recibido de un gateway (`ping` o `pong`), el broker ejecuta:

```
SETEX gateway:presence:{gw_id} 90 {iso8601_timestamp}
```

| Campo | Valor |
|---|---|
| Clave | `gateway:presence:{gw_id}` |
| TTL | 90 segundos (3 × intervalo de heartbeat de 30 s) |
| Valor | Timestamp ISO 8601 del último heartbeat recibido |

En `connect`:
```
SADD gateway:online {gw_id}
```

En `disconnect`:
```
SREM gateway:online {gw_id}
DEL  gateway:presence:{gw_id}    (opcional — expirará sola)
```

### 3.2 Lectura — Hansō

Hansō determina presencia con operaciones Redis directas. **No llama al broker HTTP para presencia** (ruta caliente).

```
# ¿Está online este gateway?
GET gateway:presence:{gw_id}
  → resultado no nulo + TTL activo → online
  → nil / expirada               → offline

# Lista de gateways online
SMEMBERS gateway:online
  → set de gw_ids actualmente conectados
```

### 3.3 Invariante

Si el broker se reinicia, las claves `gateway:presence:*` con TTL expiran solas en ≤ 90 s.
Hansō detecta correctamente el offline sin coordinación adicional.

---

## 4. Eventos y métricas (Redis pub/sub)

### 4.1 Canal

```
Canal: gateway:events
```

Todos los eventos de ciclo de vida de conexión y las métricas recibidas de gateways
se publican en este único canal.

### 4.2 Tipos de evento

#### `connected`

```json
{
  "event": "connected",
  "gw_id": "gw-abc123",
  "ts": "2026-02-26T12:00:00Z",
  "transport": "quic"
}
```

#### `disconnected`

```json
{
  "event": "disconnected",
  "gw_id": "gw-abc123",
  "ts": "2026-02-26T12:01:30Z",
  "reason": "timeout | error | clean"
}
```

Valores de `reason`:
- `timeout`: no se recibió `pong` dentro de 90 s
- `error`: error de red o de protocolo
- `clean`: gateway cerró la conexión correctamente (`disconnect` message)

#### `metrics`

```json
{
  "event": "metrics",
  "gw_id": "gw-abc123",
  "ts": "2026-02-26T12:00:00Z",
  "data": {
    "disk_usage_pct": 42.5,
    "ram_usage_pct": 61.0,
    "load_1m": 0.8,
    "modem_signal_dbm": -75,
    "wirepas_nodes": 12
  }
}
```

El campo `data` es el contenido del JSON recibido por el broker desde Habaki
(mensaje de tipo `metrics`). El broker lo reenvía sin modificación.

### 4.3 Consumidor en Hansō

Hansō mantiene un worker background suscrito a `gateway:events`:

| Evento | Acción en Hansō |
|---|---|
| `connected` | Registrar en log de conexiones (DB), actualizar `gateways.status = online` |
| `disconnected` | Actualizar `gateways.status = offline`, registrar razón en log |
| `metrics` | Persistir en `gateway_metrics` (hasta 336 registros × gateway = 7 días × 48 lecturas/día) |

---

## 5. HTTP API del broker (relay de comandos)

**Base URL:** `http://hanso-broker:8090`

**Autenticación:** header `X-Internal-Token: {BROKER_INTERNAL_TOKEN}`
(secreto compartido vía variable de entorno; no expuesto fuera de la red Docker interna).

**Nota:** Esta API es exclusivamente interna. Nunca se expone a través de Nginx al exterior.

### 5.1 Health check

```
GET /health

Response 200:
{
  "status": "ok",
  "connected_gateways": 142,
  "uptime_s": 86400
}
```

### 5.2 Lista de gateways online

```
GET /api/gateways/online

Response 200:
{
  "gateways": ["gw-001", "gw-002", "gw-abc123"],
  "count": 3
}
```

*Preferir `SMEMBERS gateway:online` desde Redis para esta consulta.
Este endpoint es para debugging y admin únicamente.*

### 5.3 Estado de un gateway

```
GET /api/gateways/{gw_id}/status

Response 200:
{
  "gw_id": "gw-001",
  "online": true,
  "last_seen": "2026-02-26T12:00:00Z",
  "transport": "quic"
}

Response 404:
{
  "error": "not_found"
}
```

### 5.4 Ejecutar comando en gateway

```
POST /api/gateways/{gw_id}/exec
Content-Type: application/json

Body:
{
  "command": "systemctl restart metal-gear",
  "timeout_s": 30
}

Response 200:
{
  "exit_code": 0,
  "stdout": "...",
  "stderr": ""
}

Response 408:
{
  "error": "timeout",
  "timeout_s": 30
}

Response 503:
{
  "error": "gateway_offline"
}
```

El broker reenvía el comando al gateway como mensaje `exec` (protocolo Habaki),
espera la respuesta `exec_result` y devuelve el resultado a Hansō.

### 5.5 Abrir sesión de terminal

```
POST /api/gateways/{gw_id}/terminal/open

Response 200:
{
  "session_id": "term-abc123",
  "ws_url": "ws://hanso-broker:8090/terminal/term-abc123"
}

Response 503:
{
  "error": "gateway_offline"
}
```

El operador (browser) se conecta directamente al broker via WebSocket para la sesión de terminal.
Hansō actúa únicamente como proxy de autenticación para obtener la `ws_url` inicial.
El tráfico de terminal (stdin/stdout) fluye: browser ↔ broker ↔ Habaki, sin pasar por Hansō.

---

## 6. Timers compartidos

| Parámetro | Valor | Propietario | Descripción |
|---|---|---|---|
| `HEARTBEAT_INTERVAL` | 30 s | broker | Envía `ping` si no hay actividad en la sesión |
| `PONG_TIMEOUT` | 90 s | broker | Cierra la conexión si no recibe `pong` |
| Redis TTL presencia | 90 s | broker | `SETEX` en cada heartbeat recibido |
| Metrics interval | 30 min | Habaki | Independiente del heartbeat; no determina presencia |

Estos valores son coherentes con `transport_heartbeat_contract.md`.

---

## 7. Compatibilidad de protocolo Habaki

El protocolo de comunicación Habaki ↔ broker es **idéntico** al protocolo actual
Habaki ↔ Hansō Python:

- **Transporte**: QUIC (UDP 4433, primario) / WebSocket (TCP 443, legado)
- **Framing**: 4 bytes big-endian (longitud del mensaje) + cuerpo JSON
- **Mensajes**: `auth`, `auth_response`, `ping`, `pong`, `metrics`, `disconnect`
  (definidos en `app/websocket/protocol.py` — el broker implementa el mismo conjunto)

**Habaki no requiere ninguna actualización** al migrar al broker Go.

---

## 8. Invariantes del contrato

- El broker es la **única fuente** que escribe `gateway:presence:{gw_id}` en Redis.
- Hansō es la **única fuente** que escribe en la tabla `gateway_metrics` y actualiza `gateways.status` en DB.
- Un gateway puede estar `online` en Redis pero con métricas con 30 min de antigüedad. Esto es correcto por diseño.
- Si el broker se reinicia, las presencias expiran en Redis ≤ 90 s. Hansō detecta el offline sin coordinación.
- Hansō no debe depender del broker HTTP para determinar presencia; Redis es la fuente de verdad.
- El broker no persiste nada en disco ni en DB. Su estado es efímero.

---

## 9. Variables de entorno

### hanso-broker

| Variable | Descripción | Ejemplo |
|---|---|---|
| `BROKER_QUIC_ADDR` | Dirección QUIC de escucha | `:4433` |
| `BROKER_HTTP_ADDR` | Dirección HTTP API interna | `:8090` |
| `BROKER_REDIS_ADDR` | Conexión a Redis | `redis:6379` |
| `BROKER_INTERNAL_TOKEN` | Token de autenticación interna Hansō → broker | secreto |
| `BROKER_PONG_TIMEOUT_S` | Timeout de pong en segundos | `90` |
| `BROKER_HEARTBEAT_INTERVAL_S` | Intervalo de ping del broker | `30` |
| `BROKER_CERT_FILE` | Certificado TLS para QUIC | `/certs/cert.pem` |
| `BROKER_KEY_FILE` | Clave privada TLS para QUIC | `/certs/key.pem` |

### Hansō (variables relacionadas con el broker)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `BROKER_URL` | URL del broker HTTP API | `http://hanso-broker:8090` |
| `BROKER_INTERNAL_TOKEN` | Token compartido con el broker | secreto |
| `REDIS_URL` | Conexión a Redis (ya existente) | `redis://redis:6379` |

---

*Contratos relacionados:*
- [`transport_heartbeat_contract.md`](./transport_heartbeat_contract.md) — timers y reglas de heartbeat (no cambian)
- [`presence_scaling_contract.md`](./presence_scaling_contract.md) — roadmap de presencia; este contrato implementa los pasos 3 y 4
