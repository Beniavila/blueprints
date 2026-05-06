# 09. Puntos de acoplamiento telecom ↔ logica

Este archivo define la frontera que la fase 2 deberia convertir en API explicita del paquete compartido.

## Entradas actuales a la logica

### Desde Wirepas

Punto de entrada: `WirepasService.process_message()` (`services/wirepas_service.py:205-245`).

Contrato actual:

1. telecom recibe `data` desde `WirepasNetworkInterface`;
2. traduce a `MessageRequest`;
3. llama `first_handler.handle(request)` (`services/wirepas_service.py:229-245`).

La logica solo necesita:

- `node_id`
- `payload`
- `msg_type`
- `travel_time_ms`
- acceso a servicios de persistencia/cache
- un puerto de salida para publicar a cloud y, en algunos casos, responder por Wirepas o MQTT local

### Desde cloud MQTT

Puntos de entrada:

- `CloudMQTTService.msg_to_node()` (`services/cloud_mqtt_service.py:333-350`)
- `CloudMQTTService.msg_to_gateway()` (`services/cloud_mqtt_service.py:352-370`)

Contrato actual:

1. telecom recibe `topic` y `msg.payload`;
2. extrae `node_id` desde topic si aplica;
3. crea `MessageRequest`;
4. llama a:
   - `first_handler_to_node.handle(request)` o
   - `first_handler_to_gateway.handle(request)`.

## Setup de handlers

Hoy el ensamblado vive dentro de telecom:

- Wirepas: `services/wirepas_service.py:62-159`
- Cloud a nodo: `services/cloud_mqtt_service.py:251-307`
- Cloud a gateway: `services/cloud_mqtt_service.py:309-321`

En la fase 2, esa construccion deberia salir a una factoría del paquete compartido, algo como:

```python
wirepas_entrypoint = logic.build_wirepas_chain(deps)
cloud_node_entrypoint = logic.build_cloud_node_chain(deps)
cloud_gw_entrypoint = logic.build_cloud_gateway_chain(deps)
```

## Salidas que la logica hoy exige a telecom

### Publicar al cloud

Usos reales:

- status: `gw-req/n/{node_id}` (`handlers/wirepas_handler/status_handler/node_status_handler.py:61-64`)
- consumos coeficientes: `gw-req/n/{node_id}` (`services/calculate_consumptions_service.py:258-274`)
- nuevo nodo: `gw-req/gw/{GW_ID}` (`services/cloud_mqtt_service.py:174-181`)
- respuestas/confirmaciones: `gw-res/n/{node_id}` (`NodeStrategyHandler`, `NodeKitHandler`, `SettedSolarStrategyHandler`, `BatteryThresholdHandler`)
- alarmas: `alarm/n/{node_id}` (`handlers/wirepas_handler/unic_handlers/alarms_to_node_handler.py:133-137`)

API minima propuesta:

```python
class CloudPublisherPort:
    def publish(self, topic: str, payload: bytes, qos: int = 2) -> None: ...
    def subscribe(self, topic: str, qos: int = 2) -> None: ...
    def unsubscribe(self, topic: str) -> None: ...
```

### Publicar al nodo Wirepas

Usos reales:

- `NodeRequestUnixtimeHandler`
- `OnOffSwitchStatusHandler`
- `NewStrategyHandler`
- `NewSolarStrategyHandler`
- `AlarmsToCloudHandler`
- `KitHandler`
- `DeleteOldNodeHandler` no envia al nodo, pero depende de la existencia del puerto Wirepas en otros handlers.

API minima propuesta:

```python
class WirepasPort:
    def send_message_to_node(self, node_id: int | str, payload: bytes, src_ep: int = 1, dst_ep: int = 1) -> None: ...
```

### Publicar a MQTT local

Solo se usa hoy para `RAW_COMMAND`:

- `handlers/wirepas_handler/default_handler.py:168-182`

API minima:

```python
class LocalPublisherPort:
    def publish(self, topic: str, payload: bytes, qos: int = 0) -> None: ...
```

## Dependencias de logica

### `ServicesRequest`

Fuente: `models/services_request.py:4-35`

Campos que deberian quedarse como dependencias del paquete:

- `redis_service`
- `nodes_sqlite_service`
- `node_consumptions_sqlite_service`
- `node_status_sqlite_service`
- `node_strategy_sqlite_service`
- `node_alarms_sqlite_service`
- `cloud_mqtt_service` solo como puerto de salida
- `local_mqtt_service` solo para `RAW_COMMAND`
- `wirepas_service` solo como puerto de salida

### `MessageRequest`

Fuente: `models/message_request.py:5-53`

Campos de dominio:

- `node_id`
- `payload`
- `payload_bytes`
- `msg_type`
- `travel_time_ms`
- `data` solo cuando la logica necesita datos Wirepas completos; hoy casi no se usa fuera de debug/default

## Configuracion compartida

### Necesaria para logica

Fuente: `config/config_file.py:52-58`

- `GW_ID`
- `LONGITUDE`
- `LATITUDE`
- `TIMEZONE`

Tambien usa:

- `WIREPAS_ENCRYPT`, `DIAGNOSTICS` no afectan la logica documentada;
- `CLUSTER`, credenciales MQTT, broker y puertos pertenecen a telecom.

### Propia de telecom

- `CLOUD_MQTT_BROKER`
- `CLOUD_MQTT_USERNAME`
- `CLOUD_MQTT_PASSWORD`
- `MQTT_PORT`
- `LOCAL_MQTT_HOST`
- `LOCAL_MQTT_PORT`
- `LOCAL_MQTT_USERNAME`
- `LOCAL_MQTT_PASSWORD`
- `SINK_ID`
- `WIREPAS_NETWORK`

## Propuesta de API del paquete compartido

Sin implementarla aun, la frontera natural seria:

```python
class GatewayLogic:
    def handle_wirepas_uplink(self, msg: LogicInput) -> None: ...
    def handle_cloud_node_message(self, msg: LogicInput) -> None: ...
    def handle_cloud_gateway_message(self, msg: LogicInput) -> None: ...
```

Donde `LogicInput` seria una version reducida de `MessageRequest`, y el constructor del paquete recibiria:

- puertos de salida (`cloud`, `wirepas`, `local`);
- repositorios (`nodes`, `status`, `consumptions`, `strategy`, `alarms`);
- config funcional (`gw_id`, `timezone`, `latitude`, `longitude`).

## Reparto gateway ↔ paquete compartido

El criterio practico es simple: si un modulo solo necesita bytes de entrada, servicios de persistencia y puertos abstractos de salida, pertenece al paquete compartido. Aplicando ese criterio al arbol actual:

### Sale al paquete compartido

- `handlers/` completo (wirepas + cloud, incluidos builders `UNIC_MSG`).
- `services/calculate_consumptions_service.py`.
- `services/nodes_sqlite_service.py`, `services/node_status_sqlite_service.py`, `services/node_strategy_sqlite_service.py`, `services/node_alarms_sqlite_service.py`, `services/node_consumptions_sqlite_service.py`.
- `services/redis_service.py`, `services/redis_cache_service.py`.
- `services/watchdogs/check_nodes_keepalive_watchdog.py`, `services/watchdogs/check_consumption_lost_watchdog.py`.
- `utils/consumptions.py`, `utils/consumption_processor.py`, `utils/parse_time.py`, `utils/formaters.py`, `utils/flag_processor.py`, `utils/service_response.py`, `utils/logger_color.py`.
- `constants/wirepas_msg_constants.py`, `constants/cloud_msg_constants.py`, `constants/sqlite_constants.py`, `constants/topics.py`, `constants/consumptions_constants.py`.
- `models/message_request.py`, `models/services_request.py`.

### Se queda en gateway (telecom pura + wiring)

- `clients/mqtt_client.py`, `clients/wirepas_client.py`, `clients/sqlite_client.py`, `clients/redis_client.py` (adaptadores concretos de infraestructura).
- `services/cloud_mqtt_service.py`, `services/wirepas_service.py` (conexion, suscripciones, callbacks, setup de la cadena de handlers).
- `services/manager_service.py`, `main.py`, `start.sh`, `setup_arm.py` (arranque y orquestacion).
- `config/config_file.py` en la parte de credenciales/broker/network.
- `utils/test_frequency.py` y `testing*.py` (smoke tests de telecom).

### Config partida

Viajan con la logica al paquete:

- `GW_ID`
- `LONGITUDE`
- `LATITUDE`
- `TIMEZONE`

Permanecen en gateway:

- `CLUSTER`, credenciales y broker MQTT cloud (`CLOUD_MQTT_*`, `MQTT_PORT`).
- MQTT local (`LOCAL_MQTT_*`).
- Red Wirepas (`SINK_ID`, `WIREPAS_NETWORK`, `WIREPAS_ENCRYPT`, `DIAGNOSTICS`).
