# Issues de desarrollo — gateway-cloud

11 issues para implementar gateway-cloud en Go, uno por componente del diagrama C2.

Para crearlos desde tu máquina:
```bash
gh issue create --title "..." --body "$(cat <<'EOF'
...
EOF
)"
```

---

## Fase 1 — Sin dependencias entre sí (empezar aquí)

### Issue 1 · `[scaffold] Estructura base del proyecto Go`

**Labels**: `scaffold`, `infra`

Crear la estructura inicial del proyecto sin lógica de negocio. Todo lo que necesitan los demás issues para arrancar.

**Incluye**:
- `go.mod` con módulo `github.com/smartec-lighting/gateway-cloud`
- Dependencias base: `github.com/eclipse/paho.mqtt.golang`, `google.golang.org/grpc`, `github.com/redis/go-redis/v9`, `github.com/spf13/viper`
- Estructura de directorios:
  ```
  cmd/gateway-cloud/main.go      ← entrypoint vacío
  internal/
    config/      ← carga de configuración
    mqtt/        ← conexiones MQTT
    redis/       ← cliente Redis
    discovery/   ← discovery & association
    resolution/  ← node resolution
    worker/      ← node worker manager + dispatcher
    engine/      ← logic engine gRPC client
    egress/      ← MQTT egress / server router
    backend/     ← backend connector
  proto/                         ← definiciones .proto
  docker-compose.yml             ← stub con servicios: gateway-cloud, redis, logic-engine (mock)
  Makefile                       ← targets: build, test, proto
  config.example.yaml
  ```
- `config.example.yaml` documentado: MQTT servers, Redis URL, Logic Engine gRPC address, backends list, timezone config
- `Dockerfile` multi-stage (build + runtime mínimo)

**Criterios de aceptación**:
- [ ] `go build ./...` pasa sin errores
- [ ] `go test ./...` pasa
- [ ] `make proto` compila los .proto (aunque estén vacíos)
- [ ] `docker build` produce imagen funcional

**ADRs**: ADR-009, ADR-034

---

### Issue 2 · `[redis] Cliente Redis para estado de telecomunicaciones`

**Labels**: `component`, `infra`

Implementar el cliente Redis con las operaciones de estado telecom de gateway-cloud. **Solo** estado de telecomunicaciones: asociaciones `nodo↔minigateway` y resoluciones `nodo→servidor MQTT`. El estado de negocio (consumos, alarmas) es responsabilidad del Logic Engine.

**Incluye** (`internal/redis/`):
- `client.go`: inicialización go-redis con configuración (URL, pool size, timeouts)
- `store.go`: interfaz `TelecomStore`:
  ```go
  SetNodeGateway(ctx context.Context, nodeID, gatewayID string) error
  GetNodeGateway(ctx context.Context, nodeID string) (string, error)
  SetNodeServer(ctx context.Context, nodeID, serverURL string) error
  GetNodeServer(ctx context.Context, nodeID string) (string, error)
  DeleteNodeGateway(ctx context.Context, nodeID string) error
  ```
- `store_redis.go`: implementación real
- `store_mock.go`: implementación mock para tests de otros componentes
- Tests unitarios (con testcontainers Redis o mock)

**Criterios de aceptación**:
- [ ] Interfaz `TelecomStore` definida y exportada
- [ ] Implementación real conecta y opera correctamente
- [ ] Mock disponible para tests externos
- [ ] `go test ./internal/redis/...` pasa

**ADRs**: ADR-012, ADR-013, ADR-015

---

### Issue 6 · `[engine] Cliente gRPC hacia el Logic Engine`

**Labels**: `component`, `grpc`

Implementar el cliente gRPC que gateway-cloud usa para delegar la lógica de negocio al Logic Engine. Incluye definición del contrato `.proto` y el cliente Go generado.

**Incluye**:
- `proto/logic_engine.proto`:
  ```protobuf
  syntax = "proto3";
  package logicengine;

  enum EventType {
    NODE_MESSAGE    = 0;
    BACKEND_COMMAND = 1;
    NODE_TIMEOUT    = 2;
  }

  enum ActionType {
    SEND_TO_BACKEND = 0;
    SEND_TO_NODE    = 1;
    IGNORE          = 2;
  }

  message MessageRequest {
    string    node_id    = 1;
    string    gateway_id = 2;
    EventType event_type = 3;
    bytes     payload    = 4;
  }

  message Action {
    ActionType type    = 1;
    bytes      payload = 2;
  }

  message ActionList {
    repeated Action actions = 1;
  }

  service LogicEngine {
    rpc Process(MessageRequest) returns (ActionList);
  }
  ```
- Código generado en `proto/` vía `make proto`
- `internal/engine/client.go`: interfaz `EngineClient`:
  ```go
  Process(ctx context.Context, req *MessageRequest) (*ActionList, error)
  ```
- `internal/engine/grpc_client.go`: implementación real (connection pool, retry, timeout)
- `internal/engine/mock_client.go`: mock configurable para tests
- Tests con mock gRPC server

**Criterios de aceptación**:
- [ ] `make proto` genera código sin errores
- [ ] Cliente conecta y recibe `ActionList` correctamente
- [ ] Mock configurable por test (permite definir respuesta fija)
- [ ] `go test ./internal/engine/...` pasa

**ADRs**: ADR-034; ver también `doc/c4/c3-logic-engine-interface.md`

---

### Issue 7 · `[mqtt] Pool de conexiones MQTT con QoS2`

**Labels**: `component`, `mqtt`

Implementar la gestión de conexiones MQTT. Una conexión por servidor MQTT destino, reutilizada por todos los nodos asociados a ese servidor. Bidireccional (publish + subscribe). QoS2 por defecto para garantía de entrega exactly-once.

**Incluye** (`internal/mqtt/`):
- `connection.go`: struct `MQTTConnection` con:
  - `Publish(topic string, payload []byte) error` — QoS2
  - `Subscribe(topic string, handler MessageHandler) error` — QoS2
  - Callback `onPublish`: broker ACK → avanzar cola de mensajes pendientes → enviar siguiente
  - Reconexión automática; al reconectar, reanuda cola pendiente
- `pool.go`: `ConnectionPool.GetOrCreate(serverURL string) (*MQTTConnection, error)` — una sola conexión por URL
- `types.go`: `MessageHandler`, `IncomingMessage{Topic, Payload, ServerURL}`
- Tests con mosquitto (testcontainers): publish QoS2, subscribe QoS2, reconexión

> **Nota**: revisar el comportamiento de `paho.mqtt.golang` con QoS2 y el callback `OnPublish`/`PublishComplete` — puede variar por versión de librería.

**Criterios de aceptación**:
- [ ] Una sola conexión por servidor URL (reutilizada)
- [ ] Publish y subscribe usan QoS2 por defecto
- [ ] `onPublish` avanza cola correctamente tras ACK
- [ ] Reconexión automática sin pérdida de mensajes en cola
- [ ] `go test ./internal/mqtt/...` pasa

**ADRs**: ADR-006, ADR-016, ADR-017, ADR-027

---

## Fase 2 — Dependen de Fase 1

### Issue 3 · `[backend] Cliente HTTP para consulta y notificación de backends`

**Labels**: `component`

**Dep**: Issue 1 (scaffold)

Implementar el cliente HTTP hacia los backends. Dos responsabilidades: resolver nodos (a qué servidor MQTT pertenece un nodo) y enviar notificaciones (acciones `SEND_TO_BACKEND` del Logic Engine).

**Incluye** (`internal/backend/`):
- `client.go`: interfaz `BackendClient`:
  ```go
  ResolveNode(ctx context.Context, nodeID string) (serverURL string, found bool, err error)
  SendEvent(ctx context.Context, payload []byte) error
  ```
- `http_client.go`: implementación HTTP con retry y timeout configurables
- `multi_backend.go`: implementa `ResolveNode` consultando la lista de backends secuencialmente — para en el primero que encuentra el nodo
- `mock_client.go`: mock para tests
- Tests con `httptest`

**Criterios de aceptación**:
- [ ] `ResolveNode` recorre backends en orden y para al encontrar el nodo
- [ ] Timeout y retry configurables por backend
- [ ] Mock disponible para otros componentes
- [ ] `go test ./internal/backend/...` pasa

**ADRs**: ADR-011, ADR-004

---

### Issue 8 · `[ingress] Recepción y parsing de mensajes MQTT desde mini gateways`

**Labels**: `component`, `mqtt`

**Dep**: Issue 7 (MQTT pool)

Implementar el componente que suscribe el broker de entrada (donde publican los mini gateways), parsea los mensajes al formato del gateway actual, valida campos obligatorios, y los entrega al canal global.

> **IMPORTANTE**: El formato de los mensajes está ya definido e implementado en el gateway de calle existente. **Antes de implementar**, revisar ese repositorio y documentar al inicio de `ingress.go` todos los tipos de mensaje soportados (`msg_id`, estructura del payload, campos obligatorios). La implementación debe cubrir exactamente esos tipos.

**Incluye** (`internal/ingress/`):
- `types.go`: structs Go que reflejan los tipos de mensaje del gateway actual _(a completar tras revisar el gateway de calle)_
- `parser.go`: parseo de payload JSON según `msg_id` o estructura al struct correspondiente
- `ingress.go`: struct `MQTTIngress`:
  - Suscribe al topic de mini gateways (QoS2, usando Issue 7)
  - Parsea con `parser.go`
  - Valida campos obligatorios (`node_id`, `gateway_id` mínimo)
  - Descarta inválidos con log de error, sin crash
  - Publica `IngressMessage{NodeID, GatewayID, EventType, Payload}` al canal global
- Tests: uno por tipo de mensaje del gateway actual + mensajes inválidos descartados

**Criterios de aceptación**:
- [ ] Cubre todos los tipos de mensaje del gateway de calle
- [ ] Mensajes inválidos/desconocidos descartados con log, sin panic
- [ ] No bloquea la goroutine de conexión MQTT
- [ ] Tipos de mensaje documentados en código con referencia al gateway de calle
- [ ] `go test ./internal/ingress/...` pasa, uno por tipo de mensaje

**ADRs**: ADR-028, ADR-029

---

### Issue 10 · `[egress] Publicación en broker MQTT correcto y routing de comandos`

**Labels**: `component`, `mqtt`

**Deps**: Issue 2 (TelecomStore), Issue 7 (ConnectionPool)

Implementar el componente que publica mensajes en el broker MQTT correcto (según `nodo → servidor MQTT`) y suscribe ese broker para recibir comandos del backend hacia nodos.

**Incluye** (`internal/egress/`):
- `router.go`: struct `ServerRouter`:
  - `PublishToNode(ctx context.Context, nodeID string, payload []byte) error`: obtiene `serverURL` vía `TelecomStore`, obtiene conexión del pool, publica en el topic correcto
  - `SubscribeCommands(serverURL string, handler CommandHandler) error`: suscribe el broker MQTT del servidor; los comandos recibidos se introducen al canal global como `BACKEND_COMMAND`
- `types.go`: `CommandHandler`
- Tests con mocks de `ConnectionPool` y `TelecomStore`

**Criterios de aceptación**:
- [ ] Publica en el broker asociado al nodo (no en el de entrada)
- [ ] Comandos del backend entran al flujo como `BACKEND_COMMAND`
- [ ] `go test ./internal/egress/...` pasa

**ADRs**: ADR-004, ADR-016, ADR-017

---

## Fase 3 — Dependen de Fase 2

### Issue 4 · `[resolution] Resolución y caché de nodo → servidor MQTT`

**Labels**: `component`

**Deps**: Issue 2 (TelecomStore), Issue 3 (BackendClient)

Implementar la resolución de a qué servidor MQTT pertenece un nodo. Se consultan backends una sola vez, se cachea en Redis permanentemente, y se reutiliza siempre. La asociación no cambia nunca de forma automática.

Se deja una puerta de escape explícita (`ForceReassign`) para casos donde alguien reutiliza un `node_id` en una instalación diferente sin el proceso correcto. **No se invoca desde ningún flujo normal.**

**Incluye** (`internal/resolution/`):
- `resolver.go`: interfaz `NodeResolver`:
  ```go
  Resolve(ctx context.Context, nodeID string) (serverURL string, err error)
  ForceReassign(ctx context.Context, nodeID, newServerURL string) error
  ```
- `cached_resolver.go`:
  - `Resolve`: comprueba Redis → si existe devuelve; si no, consulta backends secuencialmente, guarda (sin TTL) y devuelve
  - `ForceReassign`: sobreescribe directamente en Redis, sin consultar backends ni efectos colaterales
- `mock_resolver.go`: mock para tests
- Tests: hit de caché, miss + resolución, node not found, reasignación forzada sobreescribe correctamente

**Criterios de aceptación**:
- [ ] Nodo en caché → no llama a backends
- [ ] Nodo no en caché → consulta backends en orden y guarda sin TTL
- [ ] `ForceReassign` sobreescribe sin consultar backends
- [ ] `ForceReassign` no se llama desde ningún flujo normal (solo admin/control)
- [ ] `go test ./internal/resolution/...` pasa

**ADRs**: ADR-011, ADR-012, ADR-013, ADR-014

---

### Issue 5 · `[discovery] Registro de avistamientos y asociación nodo ↔ mini gateway`

**Labels**: `component`

**Deps**: Issue 2 (TelecomStore), Issue 4 (NodeResolver)

Implementar el componente que registra cuándo un mini gateway ve a un nodo, actualiza la asociación nodo↔minigateway, y resuelve el servidor MQTT si no está cacheado.

**Incluye** (`internal/discovery/`):
- `discovery.go`: struct `Discovery` con:
  ```go
  ProcessSighting(ctx context.Context, nodeID, gatewayID string) (serverURL string, isNew bool, err error)
  ```
  Lógica:
  1. `TelecomStore.SetNodeGateway(nodeID, gatewayID)` — actualiza siempre, sin condición
  2. `NodeResolver.Resolve(nodeID)` — obtiene servidor (de caché o resolviendo)
  3. Devuelve `serverURL` e `isNew` (true si fue resolución nueva, no de caché)
- Tests: primer avistamiento, reavistamiento mismo gateway, cambio de gateway, reutilización de resolución previa

**Criterios de aceptación**:
- [ ] Asociación `nodo↔gateway` se actualiza en cada avistamiento sin excepción
- [ ] No repite resolución de servidor si ya está en caché
- [ ] `go test ./internal/discovery/...` pasa

**ADRs**: ADR-014, ADR-015

---

### Issue 9 · `[worker] Dispatcher, Node Workers y lifecycle por timeout`

**Labels**: `component`, `core`

**Deps**: Issue 6 (EngineClient), Issue 10 (egress), Issue 3 (backend)

El núcleo de orquestación de gateway-cloud. El Dispatcher lee el canal global y enruta cada mensaje al worker del nodo correcto. Cada Node Worker procesa mensajes secuencialmente, llama al Logic Engine y ejecuta las acciones devueltas. Se destruye por inactividad, enviando antes `NODE_TIMEOUT` al Logic Engine.

**Incluye** (`internal/worker/`):
- `dispatcher.go`: goroutine única que lee `chan IngressMessage`, obtiene o crea el worker del nodo (map+mutex), entrega el mensaje **fuera del mutex**
- `manager.go`: `WorkerManager` con `map[string]*NodeWorker` + `sync.Mutex`
  - Patrón correcto: lock → lookup/create → **unlock** → process (nunca procesar dentro del lock)
- `worker.go`: struct `NodeWorker` con:
  - Canal interno de mensajes
  - Goroutine de procesamiento secuencial
  - Timer de inactividad (reset en cada mensaje)
  - En timeout: `EngineClient.Process(NODE_TIMEOUT)` → ejecutar acciones → `TelecomStore.DeleteNodeGateway` → destruirse y eliminarse del map
  - Por mensaje normal: `EngineClient.Process(NODE_MESSAGE / BACKEND_COMMAND)` → ejecutar acciones vía `ActionExecutor`
- `action_executor.go`: interfaz `ActionExecutor`:
  ```go
  Execute(ctx context.Context, action *Action) error
  ```
  Implementación: switch sobre `ActionType` → `ServerRouter.PublishToNode` o `BackendClient.SendEvent` o no-op
- Tests: creación en primer mensaje, reutilización, timeout + destrucción, `NODE_TIMEOUT` enviado al Logic Engine, mutex nunca bloqueado durante procesamiento

**Criterios de aceptación**:
- [ ] Un solo worker por nodo; orden de procesamiento secuencial garantizado
- [ ] Mutex protege solo el map, nunca el procesamiento del mensaje
- [ ] Timeout envía `NODE_TIMEOUT` al Logic Engine antes de destruirse
- [ ] Worker destruido se elimina del map
- [ ] `go test ./internal/worker/...` pasa, incluyendo test de concurrencia con múltiples nodos

**ADRs**: ADR-019, ADR-020, ADR-021, ADR-028, ADR-029, ADR-030, ADR-031, ADR-032, ADR-033

---

## Fase 4 — Integración

### Issue 11 · `[integration] Wiring, main.go y smoke test end-to-end`

**Labels**: `integration`

**Deps**: todos los anteriores

Conectar todos los componentes en `main.go`, completar `docker-compose.yml` con todos los servicios, y añadir un smoke test de integración E2E.

**Incluye**:
- `cmd/gateway-cloud/main.go`: wiring completo en orden:
  ```
  config → Redis → BackendClient → NodeResolver → Discovery →
  EngineClient → MQTTPool → Ingress → Egress → Dispatcher → WorkerManager → start
  ```
  Graceful shutdown con `signal.NotifyContext`
- `docker-compose.yml` completo:
  - `gateway-cloud` (este servicio)
  - `redis`
  - `logic-engine-mock` (servidor gRPC mock que devuelve `SEND_TO_BACKEND` siempre)
  - `mosquitto` (broker MQTT)
- `config.yaml` de desarrollo con valores por defecto
- `integration_test.go` (build tag `//go:build integration`):
  1. Mini gateway publica mensaje MQTT de test
  2. Gateway-cloud lo procesa, llama al mock del Logic Engine
  3. Mock devuelve `SEND_TO_BACKEND`
  4. Backend mock recibe la notificación
  5. Test verifica el flujo completo

**Criterios de aceptación**:
- [ ] `docker-compose up` arranca todos los servicios sin errores
- [ ] `go test -tags integration ./...` pasa el smoke test
- [ ] `go build ./cmd/gateway-cloud` produce binario funcional
- [ ] Graceful shutdown cierra conexiones limpiamente (sin goroutines huérfanas)

**ADRs**: todos

---

## Resumen de fases y dependencias

```
Fase 1 (paralelo):  #1  #2  #6  #7
Fase 2 (paralelo):  #3  #8  #10          (#8 dep #7) (#10 dep #2,#7) (#3 dep #1)
Fase 3 (paralelo):  #4  #5  #9           (#4 dep #2,#3) (#5 dep #2,#4) (#9 dep #6,#10,#3)
Fase 4:             #11                  (dep todos)
```
