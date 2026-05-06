# 02. Contrato de mensajes

## Estructura binaria comun

El contrato base usado por casi todo el repo es:

`[msg_id(2 bytes)][msg_type(1 byte)][data...]`

Referencias:

- lectura del `msg_type` Wirepas: `services/wirepas_service.py:216-219`;
- lectura del `msg_type` cloud: `services/cloud_mqtt_service.py:344-347,363-365`;
- builders `UNIC_MSG`: `handlers/wirepas_handler/unic_msg_handler/builders/base_message_builder.py:6-12`.

Convenciones de serializacion detectadas:

- enteros de 1 byte: valor directo;
- enteros de 2 bytes: `struct.unpack('<H', ...)` / `to_bytes(..., 'little')`;
- enteros de 4 bytes: `struct.unpack('<I', ...)` / `struct.pack('<I', ...)`;
- floats de 4 bytes: `struct.unpack('<f', ...)` / `struct.pack('<f', ...)`;
- timestamps que salen al cloud: epoch local en 4 bytes little-endian (`utils/consumptions.py:301-320`);
- algunos mensajes de tiempo hacia nodo usan big-endian de 4 bytes (`NodeRequestUnixtimeHandler`, `handlers/wirepas_handler/unic_handlers/node_request_unixtime_handler.py:82-110`).

## Constantes Wirepas

| Valor | Nombre | Direccion funcional | Handler asociado |
| --- | --- | --- | --- |
| 1 | `LED_ON` | nodo → gateway | `OldNodeStatusHandler` |
| 2 | `LED_OFF` | nodo → gateway | `OldNodeStatusHandler` |
| 3 | `DIMMING` | nodo → gateway | `OldNodeStatusHandler` |
| 7 | `NODE_STATUS` | nodo → gateway | `NodeStatusHandler` |
| 12 | `ALL_NODE_INFO` | sin uso directo | no usado |
| 28 | `FULL_NODE_STATUS` | sin uso directo | no usado |
| 29 | `NEIGHBORS` | nodo → gateway | `DefaultHandler` |
| 34 | `RGB_STATUS` | nodo → gateway | `RGBStatusHandler` |
| 40 | `RGB_ON` | cloud → nodo | `OnOffSwitchStatusHandler` |
| 41 | `RGB_OFF` | cloud → nodo | `OnOffSwitchStatusHandler` |
| 42 | `LUMOS_MAXIMA` | nodo ↔ gateway | `LumosMaximaHandler` |
| 50 | `UNIC_MSG_TYPE` | nodo → gateway | `UnicMsgHandler` |
| 80 | `SOLAR_BATHERY_THRESHOLD` | nodo → gateway | `BatteryThresholdHandler` |
| 81 | `SETTED_SOLAR_STRATEGY` | nodo → gateway | `SettedSolarStrategyHandler` |
| 92 | `SETTED_SOLAR_STRATEGY_V2` | nodo → gateway | `NodeStrategyHandler` |
| 93 | `GET_SOLAR_STRATEGY` | nodo → gateway | `NodeStrategyHandler` |
| 95 | `GET_KIT` | nodo → gateway | `NodeKitHandler` |
| 100 | `ALPHA_CONSUMPTIONS` | nodo → gateway | `AlphaConsumptionsHandler` |
| 101 | `RAW_COMMAND` | nodo → gateway local | `DefaultHandler` |
| 107 | `SOLAR_STATUS` | nodo → gateway | `SolarStatusHandler` |
| 107 | `SOLAR_RAW_CONSUMPTION` | nodo → gateway | `SolarConsumptionsHandler` |
| 111 | `ALLEGRO_RAW_CONSUMPTION` | nodo → gateway | definido pero no ejecutado |
| 111 | `SECTION_SENSOR` | nodo → gateway | `ConfigSensorHandler` |
| 112 | `CONFIG_SENSOR` | nodo → gateway | `ConfigSensorHandler` |
| 123 | `DALI_VOLTAGE_CURRENT_CC` | nodo → gateway | `RecoverDaliLostConsumptionsHandler` |
| 124 | `DALI_TEMPERATURE_VOLTAGE_CA` | nodo → gateway | `RecoverDaliLostConsumptionsHandler` |
| 125 | `DALI_POWER_FACTOR_APPARENT_POWER` | nodo → gateway | `RecoverDaliLostConsumptionsHandler` |
| 160 | sin nombre | nodo ignorado | filtrado en `WirepasService.process_message()` |
| 201 | `NODE_REQUEST_UNIXTIME` | nodo → gateway | `NodeRequestUnixtimeHandler` |
| 202 | `ALARM_NODE` / `NODE_ALARM` | nodo → gateway | `AlarmsToNodeHandler` / V2 en `UNIC_MSG` |
| 203 | `RESOLVED_ALARM_NODE` | cloud → nodo | `AlarmsToCloudHandler` |
| 204 | `DALI_RAW_CONSUMPTION` | nodo → gateway | `DaliConsumptionsHandler` |
| 207 | `DALI_ALLEGRO_RAW_CONSUMPTION` | nodo → gateway | `DaliAllegroConsumptionsHandler` |
| 208 | `DALI_STATUS_RAW_CONSUMPTIONS` | nodo → gateway | `StatusRawConsumptionsHandler` |

Fuente: `constants/wirepas_msg_constants.py:1-82`.

## Constantes cloud

| Valor | Nombre | Direccion funcional | Handler asociado |
| --- | --- | --- | --- |
| 0 | `DEATH_NODE` / `SOLAR_OFF` | gateway → cloud / estado especial | watchdogs / `SolarStatusHandler` |
| 1 | `NODE_ON` | cloud → nodo | `OnOffSwitchStatusHandler` |
| 2 | `NEW_NODE` / `NODE_OFF` / `DISABLE_ALARM` | depende del contexto | `publish_node_discovered`, `OnOffSwitchStatusHandler`, `AlarmsToCloudHandler` |
| 3 | `NODE_DIMMING` | cloud → nodo | `OnOffSwitchStatusHandler` |
| 6 | `DELETE_OLD_NODE` | cloud → gateway/nodo | `DeleteOldNodeHandler` |
| 7 | `SEND_POSITIONING` | cloud → gateway | `SendPositioningHandler` |
| 13 | `STANDAR_STRATEGY_INFO` / `SET_STRATEGY` | cloud ↔ nodo | `NewStrategyHandler` |
| 14 | `SOLAR_STRATEGY_INFO` / `GET_STRATEGY` | cloud ↔ nodo | `NewSolarStrategyHandler` |
| 15 | `NEW_STRATEGY` | cloud ↔ nodo | `NewStrategyHandler` / `NodeStrategyHandler` al confirmar |
| 21 | `STRATEGY_SAVED` | sin uso directo | no usado |
| 27 | `RESTART_NODE` | cloud → nodo | `DefaultHandler` |
| 29 | `NEIGHBORS` | cloud ↔ nodo | `DefaultHandler` |
| 33 | `NODE_STATUS` | gateway → cloud | status normal |
| 34 | `RGB_STATUS` | gateway → cloud | RGB |
| 36 | `DALI_NODE_COEF_CONSUPTIONS` | gateway → cloud | `CalculateConsumptionsService` |
| 37 | `ALLEGRO_NODE_COEF_CONSUPTIONS` | gateway → cloud | `CalculateConsumptionsService` |
| 38 | `DALI_ALLEGRO_NODE_COEF_CONSUPTIONS` | gateway → cloud | `CalculateConsumptionsService` |
| 39 | `NODE_STRATEGY_ADDED` | sin uso directo | no usado |
| 40 | `RGB_ON` | cloud → nodo | `OnOffSwitchStatusHandler` |
| 41 | `RGB_OFF` | cloud → nodo | `OnOffSwitchStatusHandler` |
| 42 | `LUMOS_MAXIMA` | cloud ↔ nodo | `DefaultHandler` / `CheckNodeHandler` |
| 50 | `MOVEMENT_SENSOR` | gateway → cloud | `IsMovementSensorHandler` |
| 80-83 | solar battery threshold/status | cloud ↔ nodo | `DefaultHandler`, `BatteryThresholdHandler` |
| 84-91 | `READ_*`/`WRITE_*` | passthrough | `DefaultHandler` |
| 92 | `NEW_SOLAR_STRATEGY` | cloud ↔ nodo | `NewSolarStrategyHandler`, `NodeStrategyHandler` |
| 93 | `GET_SOLAR_STRATEGY` | gateway → nodo | `NewSolarStrategyHandler` |
| 94 | `SET_KIT_SOLAR` | cloud ↔ nodo | `KitHandler`, `NodeKitHandler` |
| 95 | `GET_KIT` | gateway → nodo | `KitHandler` / `NodeKitHandler` |
| 98 | `RESET_DRIVER_SOLAR` | cloud → nodo | `DefaultHandler` |
| 99 | `STOP_ALL_NODE_TASKS` | cloud → nodo | `DefaultHandler` |
| 107 | `SOLAR_NODE_CONSUMPTION` | semantica cloud | sin handler directo |
| 108 | `SOLAR_NODE_COEF_CONSUPTIONS` | gateway → cloud | `CalculateConsumptionsService` |
| 109 | `REQUEST_SOLAR_CONSUMPTION` | cloud → gateway | `RequestRawConsumptionHandler` |
| 110 | `REQUEST_DALI_CONSUMPTION` | cloud → gateway | `RequestRawConsumptionHandler` |
| 111 | `ALLEGRO_NODE_CONSUMPTION` / `SEND_SECTION` | depende del contexto | `DefaultHandler` / `ConfigSensorHandler` |
| 112 | `SEND_CONFIG_SENSOR` | cloud → nodo | `DefaultHandler` / `ConfigSensorHandler` |
| 202 | `ALARM_NODE` | gateway ↔ cloud | alarmas |
| 203 | `RESOLVED_ALARM_NODE` | cloud → gateway | `AlarmsToCloudHandler` |
| 204 | `DALI_NODE_CONSUMPTION` | semantica cloud | sin handler directo |
| 207 | `DALI_ALLEGRO_NODE_CONSUMPTION` | semantica cloud | sin handler directo |
| 210 | `ALL_CONSUMS` | cloud → gateway | `DefaultHandler` |
| 254 | `BROADCAST` | cloud → Wirepas | `DefaultHandler` |
| 255 | `HEX_COMMANDS` | cloud → Wirepas | `DefaultHandler` |

Fuente: `constants/cloud_msg_constants.py:1-92`.

## Topics de acoplamiento

Fuente: `constants/topics.py:1-15`.

- cloud recibe del gateway:
  - `gw-req/gw/{GW_ID}`
  - `gw-req/n/{node_id}`
  - `gw-res/n/{node_id}`
  - `alarm/n/{node_id}`
- cloud envia al gateway:
  - `cl-req/gw/{GW_ID}`
  - `cl-res/gw/{GW_ID}`
  - `cl-req/n/{node_id}`
  - `cl-res/n/{node_id}`
- bootstrap:
  - `gw-req/gw-init/{GW_ID}`

## `UNIC_MSG` compacto

### Zhaga DALI

Fuente: `handlers/wirepas_handler/unic_msg_handler/builders/zhaga_dali_message_builder.py:8-101`.

Layout:

- `[0:2]` `msg_id`
- `[2]` `msg_type=50`
- `[3]` `node_type`
- `[4:30]` consumos compactos
- `[30]` `dimming`
- `[31]` `status`
- `[32:34]` `lumos_maxima` compacta
- `[34:38]` 4 bytes de alarmas bitmask
- `[38:42]` `strategy_id`
- `[42:46]` `time_between_reads`
- `[46]` rol sensor movimiento
- `[47:51]` firmware
- `[51:55]` diagnostico Wirepas

Submensajes creados:

- status clasico `[0,0,7,status,dimming]`;
- consumo DALI clasico `[0,0,204,<26 bytes compactos reconvertidos>]`;
- lumos maxima `[0,0,42,dimming,<float LE 4B>]`, escalando `raw/10`;
- alarmas V2: solo `[alarm1,alarm2,alarm3,alarm4]`;
- estrategia `[0,0,14,<strategy_id 4B>]`;
- movimiento `[0,0,0,<role>]`.

### Zhaga solar

Fuente: `handlers/wirepas_handler/unic_msg_handler/builders/zhaga_solar_message_builder.py:6-49`.

Layout:

- `[0:2]` `msg_id`
- `[2]` `msg_type=50`
- `[3]` `node_type`
- `[4:16]` consumos solar
- `[16:20]` alarmas
- `[20:24]` `strategy_id`
- `[24:28]` `kit_id`
- `[28:32]` `time_between_reads`
- `[32]` `isMovementSensor`

Submensajes:

- consumos solar `[0,0,107,<12 bytes>]`;
- alarmas `[a1,a2,a3,a4]`;
- estrategia solar `[0,0,93,<strategy_id>]`;
- kit `[0,0,95,<kit_id>]`.
