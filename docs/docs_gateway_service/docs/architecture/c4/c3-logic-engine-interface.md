# C3 — Interfaz Gateway-Cloud ↔ Logic Engine

## Descripción

Este documento describe el contrato de comunicación entre Gateway-Cloud y el
Logic Engine desde la perspectiva de Gateway-Cloud. Los internals del Logic
Engine (pipeline de handlers, gestión de estado de negocio, cálculo de
consumos) se documentan en el repositorio del Logic Engine.

Gateway-Cloud es una capa de telecomunicaciones. Cuando recibe un mensaje que
requiere lógica de negocio, lo delega al Logic Engine vía gRPC y ejecuta las
acciones devueltas.

Este documento refleja la intención arquitectónica y el estado actual del
contrato:

- el **contrato canónico** es `HandleEvent(LogicRequest)`;
- existen **RPC legacy** para facilitar la convivencia inicial con el gateway
  actual y acelerar la migración incremental.

---

## Protocolo

**Transporte**: gRPC  
**Dirección**: Gateway-Cloud (cliente) → Logic Engine (servidor)  
**Patrón**: request/response síncrono por mensaje

---

## RPC canónico

### `HandleEvent(LogicRequest) -> HandleResponse`

Es la interfaz recomendada para nuevos callers y nuevos adaptadores de
telecomunicaciones.

### Request: `LogicRequest`

| Campo | Tipo | Descripción |
|---|---|---|
| `event_type` | `EventType` | Tipo de evento lógico |
| `node_id` | `string` | Identificador del nodo si aplica |
| `gateway_id` | `string` | Identificador del gateway/mini gateway si aplica |
| `payload` | `bytes` | Payload original sin modificar |
| `topic` | `string` | Topic original si el transporte lo tiene |
| `msg_type` | `uint32` | Tipo de mensaje lógico/binario si aplica |
| `travel_time_ms` | `int64` | Tiempo de viaje del mensaje si aplica |
| `transport` | `TransportType` | Origen de transporte del evento |
| `attributes` | `map<string,string>` | Metadatos adicionales del adaptador |

### `EventType`

| Valor | Descripción |
|---|---|
| `NODE_MESSAGE` | Mensaje enviado por un nodo |
| `BACKEND_COMMAND` | Comando enviado desde backend hacia nodo |
| `GATEWAY_COMMAND` | Comando dirigido al gateway/mini gateway |
| `NODE_TIMEOUT` | Evento lógico de timeout/cierre de sesión |
| `INTERNAL_EVENT` | Evento interno emitido por un adaptador o runtime |

### `TransportType`

| Valor | Descripción |
|---|---|
| `TRANSPORT_WIREPAS` | Evento originado en Wirepas |
| `TRANSPORT_MQTT` | Evento originado en MQTT |
| `TRANSPORT_INTERNAL` | Evento interno |
| `TRANSPORT_HTTP` | Evento originado en HTTP |
| `TRANSPORT_GRPC` | Evento originado desde otro servicio gRPC |

---

## RPC legacy de transición

Además del RPC canónico, el proto actual mantiene:

- `HandleWirepasUplink(WirepasUplink)`
- `HandleCloudNodeMessage(CloudMessage)`
- `HandleCloudGatewayMessage(CloudMessage)`

Estos RPC existen para simplificar la primera fase de convivencia con el
gateway actual. Conceptualmente son adaptadores de entrada hacia
`HandleEvent(LogicRequest)`, no el contrato final deseado del Logic Engine.

Gateway-Cloud y el gateway tradicional deberían converger gradualmente a
`HandleEvent`.

---

## Response: `HandleResponse`

Lo que el Logic Engine devuelve a Gateway-Cloud:

| Campo | Tipo | Descripción |
|---|---|---|
| `actions` | `[]Action` | Lista de acciones a ejecutar |
| `error` | `string` | Error lógico serializado; vacío si todo OK |

### `Action`

El proto actual expresa acciones cercanas al adaptador del gateway actual:

| Tipo | Descripción |
|---|---|
| `PublishCloudAction` | Publicar payload a cloud |
| `SendWirepasAction` | Enviar payload al nodo por Wirepas |
| `PublishLocalAction` | Publicar payload en MQTT local |
| `SubscribeAction` | Suscribirse a un topic |
| `UnsubscribeAction` | Desuscribirse de un topic |

Estas acciones siguen siendo válidas para la fase de convivencia, pero deben
entenderse como salida del Logic Engine, no como licencia para meter lógica de
transporte dentro del core.

---

## Casos de uso

### 1. Mensaje de nodo entrante (uplink)

```text
Mini Gateway → [MQTT] → Gateway-Cloud
                              │
                              │ gRPC LogicRequest
                              │ event_type: NODE_MESSAGE
                              │ transport: MQTT
                              ▼
                         Logic Engine
                              │
                              │ HandleResponse
                              ▼
                         Gateway-Cloud
                         ejecuta acciones:
                         - PublishCloudAction
                         - SendWirepasAction
                         - PublishLocalAction
                         - SubscribeAction / UnsubscribeAction
```

### 2. Comando desde backend (downlink)

```text
Backend → [MQTT broker destino] → Gateway-Cloud
                                        │
                                        │ gRPC LogicRequest
                                        │ event_type: BACKEND_COMMAND
                                        │ transport: MQTT
                                        ▼
                                   Logic Engine
                                        │
                                        │ HandleResponse
                                        ▼
                                   Gateway-Cloud
                                   ejecuta acciones devueltas
```

### 3. Timeout de nodo (cierre de sesión)

```text
Node Worker (timeout)
      │
      │ gRPC LogicRequest
      │ event_type: NODE_TIMEOUT
      │ payload: vacío
      │ transport: INTERNAL
      ▼
 Logic Engine
      │  (ejecuta cálculo final de consumos,
      │   cierra sesión del nodo)
      │ HandleResponse
      ▼
 Gateway-Cloud
 ejecuta acciones resultantes
```

---

## Notas

- Gateway-Cloud no interpreta el contenido de negocio del payload, solo lo
  adapta al contrato del Logic Engine y ejecuta las acciones devueltas.
- El Logic Engine es el único responsable de decidir qué hacer con cada
  mensaje.
- El estado de negocio (consumos raw, alarmas en curso, estado de sesión por
  nodo) es responsabilidad del Logic Engine.
- Gateway-Cloud conserva en Redis solo estado de telecomunicaciones:
  `nodo ↔ mini gateway` y `nodo → servidor MQTT`.
- En despliegue estándar, ambos contenedores están en el mismo Docker Compose;
  la latencia gRPC es local.
- Mientras convivan Python y Go, los RPC legacy pueden seguir existiendo, pero
  el contrato hacia el que converge el sistema es `HandleEvent(LogicRequest)`.
