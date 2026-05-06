# ADR-006: Go Broker para Gestión de Conexiones Persistentes de Gateway

**Estado:** ✅ Aceptado

**Fecha:** 2026-02-26

**Decisores:** Tech Lead, Backend Team

---

## Contexto

La enmienda Sprint 4.6 de ADR-002 introdujo un servidor QUIC embebido directamente en el
backend Python/Flask (`app/infrastructure/quic/server.py`). Este diseño es funcional para el
volumen actual, pero tiene un techo de escalado determinado por el modelo de concurrencia de Python.

### Problema: GIL + threads de OS

| Elemento | Python (actual) | Descripción |
|---|---|---|
| Modelo de concurrencia | Thread pool, 512 workers | Un thread OS por conexión de gateway |
| Stack por thread | ~8 MB | 512 threads × 8 MB = 4 GB solo en stacks |
| Paralelismo real | No | El GIL limita a 1 thread ejecutando código Python en cada instante |
| Techo estimado | ~500 gateways | Degradación de heartbeat por context-switching bajo carga |

Para 10 000 gateways, el modelo de threads de OS requiere:

- `10 000 × 8 MB = 80 GB` solo de stacks de thread
- Decenas de miles de context-switches de OS por segundo
- GIL contention en el loop de heartbeat → latencia en detección de desconexión

Aumentar el thread pool es una medida provisional que no resuelve el problema estructural.

### Estado del sistema en la fecha de esta decisión

- QUIC funcional: `app/infrastructure/quic/server.py` + `background.py`
- Thread pool ampliado a 512 como parche provisional (Sprint 4.6)
- Contratos de transporte y presencia documentados:
  - `docs/contracts/transport_heartbeat_contract.md`
  - `docs/contracts/presence_scaling_contract.md`
- Roadmap de presencia por Redis TTL ya previsto en `presence_scaling_contract.md` (pasos 3 y 4)

---

## Decisión

Extraemos toda la gestión de conexiones persistentes de gateways a un **servicio Go independiente**
llamado `hanso-broker`.

### Por qué Go

| Aspecto | Python threads | Go goroutines |
|---|---|---|
| Stack inicial | 8 MB (fijado por OS) | 2 KB (gestionado por runtime Go, crece si hace falta) |
| 10 000 conexiones — RAM de stacks | ~80 GB | ~20 MB |
| Paralelismo real | No (GIL) | Sí (GOMAXPROCS = número de CPUs) |
| Scheduler | OS (costoso, preemptivo) | Go runtime (M:N, barato, cooperativo + preemptivo) |
| Compatibilidad con QUIC | aioquic (Python) | quic-go (Go, RFC 9000) |
| Familiaridad del equipo | Alta | Media |

Go resuelve el problema estructuralmente: sin GIL, sin pool de threads,
1 goroutine por conexión = escala lineal hasta decenas de miles de gateways
con consumo de RAM predecible.

### Principio de diseño: el broker es un adaptador de infraestructura

El broker no contiene lógica de negocio. Es el adaptador outbound de la arquitectura hexagonal
que implementa la conexión QUIC/WebSocket hacia los gateways:

```
Hansō (domain + use cases)
       │
       │ IConnectionBroker (puerto hexagonal)
       │
hanso-broker (adaptador Go — infraestructura pura)
       │
       │ QUIC (UDP:4433) / WebSocket (TCP:443, legacy)
       │
Habaki (gateway agent)
```

La lógica de negocio (provisioning, monitoring, auth, configuración) permanece íntegramente
en Hansō Python. El broker es intercambiable sin tocar los use cases.

---

## Responsabilidades

### hanso-broker (Go)

- Aceptar conexiones QUIC (UDP 4433) y WebSocket (TCP 443, legado)
- 1 goroutine por conexión de gateway — sin pool de threads, sin límite artificial
- Autenticar gateways (`gw_id` + token)
- Heartbeat ping/pong con cada gateway (intervalo 30 s, timeout 90 s)
- Actualizar presencia en Redis: `SETEX gateway:presence:{gw_id} 90 <ISO8601>`
- Mantener el set `gateway:online` en Redis (SADD en connect, SREM en disconnect)
- Publicar eventos a Redis pub/sub en canal `gateway:events`
- Exponer HTTP REST API interna para relay de comandos exec/terminal desde Hansō
- Reenviar métricas recibidas de gateways al canal pub/sub de Redis

### Hansō Python (sin cambios en lógica de negocio)

- Leer presencia directamente de Redis: `GET gateway:presence:{gw_id}` (TTL activo = online)
- Listar gateways online: `SMEMBERS gateway:online`
- Suscribirse al canal `gateway:events` para recibir métricas y eventos de conexión/desconexión
- Enviar comandos exec/terminal vía HTTP al broker REST API
- UI, auth, CRUD, configuración, Metal Gear distribution — todo sin cambios

---

## Arquitectura resultante

```
Habaki (gateway)
    │
    │ QUIC UDP:4433  (primary)
    │ WebSocket TCP:443  (legacy, dual-stack permanente)
    │
    ▼
┌─────────────────────────────────────┐
│         hanso-broker (Go)           │
│                                     │
│  goroutine por gateway (2 KB c/u)   │
│  heartbeat + SETEX Redis            │
│  relay exec / terminal              │
│  Expone HTTP :8090                  │
└───────┬─────────────────────────────┘
        │
        ├─── Redis TTL ──────────── gateway:presence:{gw_id}  (TTL 90s)
        ├─── Redis SET ──────────── gateway:online  (SADD/SREM)
        └─── Redis pub/sub ──────── gateway:events  (connected | disconnected | metrics)
                │
                ▼
        ┌─────────────────────┐
        │    Hansō (Python)   │
        │    Flask + Domain   │
        └─────────────────────┘
```

---

## Interfaz Go Broker ↔ Hansō

Ver contrato completo: [`docs/contracts/go_broker_hanso_contract.md`](../../../docs/contracts/go_broker_hanso_contract.md)

La semántica de heartbeat y presencia se apoya además en:

- [`docs/contracts/transport_heartbeat_contract.md`](../../../docs/contracts/transport_heartbeat_contract.md)
- [`docs/contracts/presence_scaling_contract.md`](../../../docs/contracts/presence_scaling_contract.md)

La generación del payload de métricas en el gateway se documenta en:

- [`docs/habaki-metal-gear-integration.md`](../../../docs/habaki-metal-gear-integration.md)

### Presencia (vía Redis — zero coupling directo entre servicios)

```
Clave:   gateway:presence:{gw_id}
Tipo:    STRING con TTL 90 s
Valor:   timestamp ISO 8601 del último heartbeat recibido
Escribe: broker (en cada heartbeat recibido de Habaki)
Lee:     Hansō (GET directo a Redis — sin llamada HTTP al broker)
```

Hansō determina online/offline con un solo `GET` a Redis.
La ruta caliente de presencia no pasa por el broker.

### Eventos y métricas (Redis pub/sub)

```
Canal:   gateway:events
Payload: {"event": "connected|disconnected|metrics", "gw_id": "...", "ts": "...", "data": {...}}
Publica: broker
Lee:     worker background de Hansō
```

### Comandos (HTTP broker API — solo ruta caliente de ejecución)

```
POST /api/gateways/{gw_id}/exec
POST /api/gateways/{gw_id}/terminal/open
GET  /api/gateways/online            (debugging / admin)
GET  /api/gateways/{gw_id}/status   (debugging / admin)
```

---

## Stack tecnológico del broker

| Componente | Tecnología | Motivo |
|---|---|---|
| Lenguaje | Go 1.22+ | Goroutines, sin GIL, GOMAXPROCS |
| QUIC | quic-go | RFC 9000, mantenido activamente, compatible con aioquic |
| Redis client | go-redis v9 | Estándar, connection pooling, pub/sub |
| HTTP API | `net/http` stdlib | Ligero, suficiente para API interna de relay |
| Framing de mensajes | 4 B big-endian + JSON | Idéntico al protocolo actual de Habaki |

---

## Consecuencias

### ✅ Positivo

- **10 000+ gateways sin techo artificial**: goroutines de 2 KB, sin pool de threads
- **RAM predecible**: 10 000 goroutines ≈ 20 MB (vs 80 GB con threads de OS)
- **Paralelismo real**: heartbeat processing en paralelo en todos los cores de CPU
- **Presencia O(1)**: `GET gateway:presence:{gw_id}` desde Hansō sin HTTP round-trip
- **Zero impacto en Habaki**: mismo protocolo QUIC + framing 4 B + JSON
- **Zero impacto en lógica de negocio de Hansō**: solo se reemplaza el adaptador de infraestructura
- **Encaja en arquitectura hexagonal**: broker es adaptador outbound puro (ADR-001)
- **Implementa el roadmap de presencia ya planificado**: pasos 3 y 4 de `presence_scaling_contract.md`

### ⚠️ Negativo

- Go como segundo lenguaje en el stack (el equipo necesita Go básico)
- Despliegue: un servicio extra en Docker Compose (`hanso-broker`)
- CI/CD: pipeline de build Go adicional

### ➡️ Neutral

- Nginx: sin cambios (QUIC sigue en UDP:4433, WebSocket en TCP:443)
- Redis ya era dependencia planificada (ADR-002, `presence_scaling_contract.md`)
- Docker Compose: añadir servicio `hanso-broker` y red interna compartida

---

## Plan de implementación

### Fase 1: Broker mínimo (spike)

1. Servidor QUIC en Go (`quic-go`) que acepta conexiones de Habaki
2. Autenticación de gateway (`gw_id` + token)
3. Heartbeat ping/pong + `SETEX gateway:presence:{gw_id} 90 <ts>`
4. Validar: 100+ conexiones Habaki simultáneas → Redis TTL correctos

### Fase 2: API de relay y eventos

1. Redis pub/sub: publicar `connected`, `disconnected`, `metrics` en `gateway:events`
2. Mantener `gateway:online` (SADD/SREM)
3. Endpoint `POST /api/gateways/{gw_id}/exec` con timeout configurable
4. Endpoint `POST /api/gateways/{gw_id}/terminal/open` (WebSocket relay)

### Fase 3: Integración con Hansō

1. Hansō lee presencia de Redis (en lugar del estado en memoria del servidor QUIC Python)
2. Hansō llama al broker para exec/terminal (en lugar de `GatewayConnectionManager`)
3. Worker background de Hansō suscrito a `gateway:events` para persistir métricas

### Fase 4: Migración y retirada del servidor QUIC Python

1. Tests end-to-end con 10+ Habakis reales apuntando al broker Go
2. Eliminar `app/infrastructure/quic/` del backend Python
3. Retirar el thread pool de 512 workers
4. Actualizar Docker Compose con el nuevo servicio

---

## Alternativas consideradas

### Optimizar Python (threads / asyncio / multiprocessing)

- Multiprocessing: rompe el estado compartido en memoria, requiere IPC complejo
- Gevent / greenlets: concurrencia cooperativa, no paralelismo real en heartbeat
- Techo realista: ~1 000 gateways en condiciones favorables
- **Rechazado**: no resuelve el problema estructural del GIL

### Rust

- Mejor rendimiento en bruto que Go
- Curva de aprendizaje muy alta, sin familiaridad en el equipo
- Tiempo de implementación 3-4× mayor
- **Rechazado**: innecesario para la escala objetivo (10 000 gateways); Go es suficiente

### MQTT broker (Mosquitto / EMQX)

- Diseñado para IoT a gran escala con presencia y pub/sub
- Requeriría cambiar el protocolo de Habaki (QUIC + framing propio → MQTT)
- Pierde el canal bidireccional de relay de comandos exec/terminal
- **Rechazado**: alcance de cambio demasiado grande, rompe Habaki

### Go broker ✅

- Goroutines resuelven el problema estructuralmente
- Compatible con el protocolo actual de Habaki (sin cambios en el agente)
- Zero impacto en la lógica de negocio de Hansō
- Implementa el roadmap de presencia ya planificado
- **Aceptado**

---

## ADRs relacionados

- [ADR-001: Hexagonal Architecture](./001_hexagonal_architecture.md) — el broker es un adaptador outbound; Hansō define el puerto `IConnectionBroker`
- [ADR-002: WebSocket + QUIC para gateways](./002_websocket_gateway_management.md) — transporte QUIC (protocolo Habaki sin cambios)
- [ADR-007: Remote Software Updates and Command Plans](./007_remote_software_updates_and_command_plans.md) — ejecución remota asíncrona sobre gateways conectados

## Contratos relacionados

- [`docs/contracts/transport_heartbeat_contract.md`](../../../docs/contracts/transport_heartbeat_contract.md) — timers y reglas de heartbeat (no cambian)
- [`docs/contracts/presence_scaling_contract.md`](../../../docs/contracts/presence_scaling_contract.md) — roadmap de presencia; este ADR implementa los pasos 3 y 4
- [`docs/contracts/go_broker_hanso_contract.md`](../../../docs/contracts/go_broker_hanso_contract.md) — interfaz completa broker ↔ Hansō

---

**Última actualización:** 2026-04-30
