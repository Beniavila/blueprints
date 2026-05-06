# 03. Handlers Wirepas

Este documento cubre la cadena Wirepas → logica → cloud definida en `services/wirepas_service.py:94-156`.

## Entrada y filtros previos

Antes de llegar a cualquier handler, `WirepasService.process_message()`:

1. descarta payload vacio (`services/wirepas_service.py:209-211`);
2. toma `node_id=data.source_address` (`services/wirepas_service.py:213`);
3. convierte `data_payload` a lista de bytes (`services/wirepas_service.py:216`);
4. extrae `msg_type=payload[2]` (`services/wirepas_service.py:217-218`);
5. ignora mensajes de sinks `[1,2,3]`, payloads con `payload[0]==128`, `msg_type in [0,160]` y `msg_type==64` (`services/wirepas_service.py:225-227`).

## `CheckNodeHandler`

- Archivo: `handlers/wirepas_handler/unic_handlers/check_node_handler.py:14-151`
- Acepta: `204`, `107`, `111`, `34`, `207`, `208`, `50`
- Payload:
  - en `UNIC_MSG`, usa `payload[3]` como tipo de nodo;
  - en el resto deduce el tipo por `msg_type`.
- Pasos:
  1. si el `msg_type` esta en la whitelist, lanza `init()` en un hilo aparte y deja seguir la cadena (`:47-57`);
  2. consulta si el nodo ya existe en `node_discovery` (`:95`);
  3. si no existe, determina `node_type`, inserta discovery, elimina `lost`, se suscribe a `cl-req/n/{node_id}` y `alarm-res/n/{node_id}`, publica `NEW_NODE` y pide `LUMOS_MAXIMA` a no-solar/no-RGB (`:98-145`).
- Persistencia:
  - `nodes_sqlite_service.put_node_discovered()` (`:122-124`);
  - `nodes_sqlite_service.delete_node_by_id_from_lost_nodes()` (`:125-126`).
- Respuesta:
  - cloud `gw-req/gw/{GW_ID}` con `NEW_NODE` via `CloudMQTTService.publish_node_discovered()` (`services/cloud_mqtt_service.py:174-181`);
  - Wirepas `LUMOS_MAXIMA` via `wni.send_message_to_node()` (`check_node_handler.py:139-145`).

## `UnicMsgHandler`

- Archivo: `handlers/wirepas_handler/unic_msg_handler/unic_msg_handler.py:12-35`
- Acepta: solo `msg_type=50`
- Funcion:
  1. si no es `50`, delega (`:20-21,34-35`);
  2. toma `node_type=payload[3]` (`:23`);
  3. usa `MessagePreparer.prepare()` para fabricar subrequests (`:25`);
  4. usa `HandlerFactory.create_all()` para instanciar handlers especializados (`:28`);
  5. ejecuta cada subhandler sobre su subrequest (`:30-32`).
- Builders:
  - Zhaga DALI: `handlers/wirepas_handler/unic_msg_handler/builders/zhaga_dali_message_builder.py:46-84`
  - Zhaga solar: `handlers/wirepas_handler/unic_msg_handler/builders/zhaga_solar_message_builder.py:23-48`

## `NodeRequestUnixtimeHandler`

- Archivo: `handlers/wirepas_handler/unic_handlers/node_request_unixtime_handler.py:19-116`
- Acepta: `201`
- Payload de entrada: no inspecciona `data`; solo reacciona al `msg_type`.
- Pasos:
  1. calcula `unix_time` actual en 4 bytes big-endian (`:82-84`);
  2. calcula siguiente amanecer y atardecer con `ephem` usando `LATITUDE`/`LONGITUDE` (`:85-95`);
  3. obtiene GMT offset con `get_gmt_time_from_timestamp()` (`:96-98`);
  4. construye `[0,0,201][unix_time_be][sunrise_h][sunrise_m][sunset_h][sunset_m][offset_signed_1B]` (`:99-110`);
  5. responde al nodo por Wirepas (`:115-116`).

## Familia status

### `NodeStatusHandler`

- Archivo: `handlers/wirepas_handler/status_handler/node_status_handler.py:10-64`
- Acepta: `7`
- Payload: `[0,0,7,led_status,dimming]`
- Pasos:
  1. `BaseStatusHandler.init()` actualiza `last_seen` (`handlers/wirepas_handler/status_handler/base_status_handler.py:63-65,133-145`);
  2. recupera `node_type`, lee estado actual y parsea payload (`base_status_handler.py:67-79`);
  3. si hay cambio, calcula consumos pendientes, guarda estado y publica a cloud (`base_status_handler.py:77-83`);
  4. `NodeStatusHandler.get_status()` lee `payload[3]` y `payload[4]` (`node_status_handler.py:34-39`).
- Persistencia:
  - `node_status_sqlite_service.put_led_status_dimming()` (`node_status_handler.py:58-60`).
- Respuesta:
  - `gw-req/n/{node_id}` con `[0,0,33,led_status,dimming]` (`node_status_handler.py:61-64`).

### `OldNodeStatusHandler`

- Archivo: `handlers/wirepas_handler/status_handler/old_node_status_handler.py:10-72`
- Acepta: `1`, `2`, `3`
- Payload:
  - `LED_ON`: sin bytes extra;
  - `LED_OFF`: sin bytes extra;
  - `DIMMING`: usa `payload[3]`.
- Logica:
  - `LED_ON` => `(led_status=1,dimming=100)` (`:36-39`);
  - `LED_OFF` => `(2,0)` (`:40-42`);
  - `DIMMING` => `(1,payload[3])` (`:44-46`).
- Persistencia y salida: identicas a `NodeStatusHandler` (`:65-72`).

### `RGBStatusHandler`

- Archivo: `handlers/wirepas_handler/status_handler/rgb_status_handler.py:11-95`
- Acepta: `34`
- Payload: `[0,0,34,red,green,blue]`
- Logica:
  - si `red=green=blue=0`, considera LED off; en otro caso LED on (`:43-53`);
  - compara con `rgb_status` almacenado y si cambia guarda y publica (`:54-95`).
- Persistencia:
  - `node_status_sqlite_service.put_rgb_status()` (`:85-88`).
- Respuesta:
  - `gw-req/n/{node_id}` con `[0,0,34,led_status,red,green,blue]` (`:90-95`).

### `SolarStatusHandler`

- Archivo: `handlers/wirepas_handler/status_handler/solar_status_handler.py:11-91`
- Acepta: `107` cuando llega por ruta status
- Payload: usa `payload[10]` como byte de estado/dimming (`:35-40`).
- Decodificacion:
  - bit 7 => estado (`:61-63`);
  - bits 0..6 => dimming (`:64-65`);
  - si todos los bytes desde offset 3 valen `254`, marca `BAD_NODE_SOLAR=5` (`:41-50`);
  - si el bit de estado vale `0`, lo normaliza a `LED_OFF=2` (`:52-56`).
- Persistencia/salida:
  - igual que `NodeStatusHandler`, topic `gw-req/n/{node_id}` y msg `NODE_STATUS` (`:84-91`).

## Familia consumptions

### `BaseConsumptionsHandler`

- Archivo: `handlers/wirepas_handler/consumptions_handler/base_consumptions_handler.py:11-168`
- Pipeline comun:
  1. `check_payload()` opcional;
  2. extrae slices definidos en `attributes_dict` (`:92-95`);
  3. decodifica 1/2/4 bytes con `decode_consumptions()` (`:96-110`);
  4. aplica escalado extra en modo `compact` (`:106-108`);
  5. compone `fields` string;
  6. calcula timestamp local `travel_time_ms -> segundos` (`:118-119`);
  7. guarda en SQLite/Redis usando el metodo asociado al measurement (`:127-140`).

### `DaliConsumptionsHandler`

- Archivo: `handlers/wirepas_handler/consumptions_handler/dali_consumptions_handler.py:8-78`
- Acepta: `204`
- Payload modo normal:
  - `[3:7]` `voltage_cc_pcb` float LE
  - `[7:11]` `current_cc_pcb`
  - `[11:15]` `temperature_driver`
  - `[15:19]` `voltage_net_ca`
  - `[19:23]` `power_factor`
  - `[23:27]` `apparent_power`
- Payload modo `compact` usado por `UNIC_MSG`:
  - `[3:5]` `voltage_cc_pcb` uint16 /100
  - `[5:7]` `current_cc_pcb` uint16
  - `[7]` `temperature_driver`
  - `[8:10]` `voltage_net_ca` uint16 /100
  - `[10]` `power_factor`
  - `[11:13]` `apparent_power` uint16 /100
- Persistencia:
  - `node_consumptions_sqlite_service.put_raw_dali_consumption_by_node_id()` (`services/node_consumptions_sqlite_service.py:188-206`).

### `SolarConsumptionsHandler`

- Archivo: `handlers/wirepas_handler/consumptions_handler/solar_consumptions_handler.py:10-89`
- Acepta: `107` cuando llega por ruta consumo
- Payload:
  - `[3:5]` `SOC`
  - `[5:7]` `battery_voltage`
  - `[7:9]` `battery_current`
  - `[9]` `driver_state`
  - `[11:13]` `luminaire_power`
  - `[13:15]` `charge_power`
- Particularidades:
  - antes de guardar, fuerza `SolarStatusHandler.handle(request)` (`:51-70`);
  - si todos los campos son `254`, aborta como "bad node" (`:54-65`);
  - `battery_voltage *= 0.1` (`:78-80`).
- Persistencia:
  - `put_raw_solar_consumption_by_node_id()` (`services/node_consumptions_sqlite_service.py:255-273`).

### `AllegroConsumptionsHandler`

- Archivo: `handlers/wirepas_handler/consumptions_handler/allegro_consumptions_handler.py:11-63`
- Acepta: ninguno hoy; `can_handle()` devuelve `False` (`:40-41`).
- Payload previsto:
  - `[3:7]` `voltage_net_ca`
  - `[7:11]` `power_factor`
  - `[11:15]` `apparent_power`
  - `[15:19]` `current_net_ca`
- Si se habilita, truncaria valores con `truncathor()` antes de guardar (`:49-54`).

### `DaliAllegroConsumptionsHandler`

- Archivo: `handlers/wirepas_handler/consumptions_handler/dali_allegro_consumptions_handler.py:8-61`
- Acepta: `207`
- Payload:
  - `[3:7]` `voltage_net_ca`
  - `[7:11]` `power_factor_net_ca`
  - `[11:15]` `apparent_power`
  - `[15:19]` `current_net_ca`
  - `[19:23]` `voltage_pcb_cc`
  - `[23:27]` `current_pcb_cc`
  - `[27:31]` `temperature_driver`
- Persistencia:
  - `put_raw_dali_allegro_consumption_by_node_id()` (`services/node_consumptions_sqlite_service.py:233-250`).

### `LumosMaximaHandler`

- Archivo: `handlers/wirepas_handler/consumptions_handler/lumos_maxima_handler.py:11-68`
- Acepta: `42`
- Payload:
  - `[3]` `dimming`
  - `[4:8]` `lumos_maxima` float LE
- Persistencia:
  - `nodes_sqlite_service.put_lumos_maxima_by_node_id()` (`:67-68`).

### `AlphaConsumptionsHandler`

- Archivo: `handlers/wirepas_handler/consumptions_handler/alpha_consumptions_handler.py:9-77`
- Acepta: `100`
- Payload:
  - `[3:5]` `alpha_previous`
  - `[5:7]` `alpha_current`
  - `[7:9]` `sunset_voltage_previous`
  - `[9:11]` `sunset_voltage_current`
  - `[11:13]` `sunrise_voltage_previous`
  - `[13:15]` `sunrise_voltage_current`
  - `[15:17]` `charge_today`
  - `[17:19]` `consumption_today`
- Persistencia:
  - `put_alpha_consumption_by_node_id()` (`:76-77`).

### `RecoverDaliLostConsumptionsHandler`

- Archivo: `handlers/wirepas_handler/consumptions_handler/recover_lost_consumptions/recover_dali_lost_consumptions_handler.py:13-239`
- Acepta: `123`, `124`, `125`
- Payload:
  - `[3:43]` primera serie, en bloques de 4 bytes float LE, ignorando `255,255,255,255`
  - `[43:83]` segunda serie, mismo esquema
  - `[-4:]` `time_between_readings` como uint32 LE en ms (`:130-138`)
- Logica:
  1. mapea el `msg_type` a measurement logical (`dali_voltage_current_cc`, etc.) (`:127-128`);
  2. decodifica ambas series (`:140-166`);
  3. calcula `num_repetitions = time_between_readings // 30`, repitiendo cada valor para rellenar huecos a 30 s (`:171-185`);
  4. guarda cada punto en tablas `*_lost` con timestamp retroactivo en pasos de 30 s desde "ahora" (`:204-230`);
  5. crea una flag en `{measurement}_flag` (`:238-239`).
- Persistencia:
  - `put_lost_consumption_by_node_id()` y `create_flag_from_consumption_type_and_node_id()` (`services/node_consumptions_sqlite_service.py:290-328`).

## Familia estrategia / kit / sensores

### `NodeStrategyHandler`

- Archivo: `handlers/wirepas_handler/strategy_handler/node_strategy_handler.py:13-124`
- Acepta: `14`, `93`, `92`
- Payload: `[3:7]` `strategy_id` little-endian decodificado con `decode_msg_payload()` (`:60-64`).
- Logica:
  - si en DB/Redis aparece como WAITING y todavia no COMPLETE, borra el estado previo del nodo, marca COMPLETE y publica confirmacion a cloud (`:70-104`).
- Respuesta:
  - topic `gw-res/n/{node_id}`;
  - msg `[0,0,<15 o 92>][strategy_id 4B LE][timestamp 4B LE]` (`:106-124`).

### `SettedSolarStrategyHandler`

- Archivo: `handlers/wirepas_handler/strategy_handler/setted_solar_strategy_handler.py:10-73`
- Acepta: `81`
- Funcion:
  - solo loguea el payload y lo reenvia a `gw-res/n/{node_id}` sin tocar DB (`:53-73`).

### `NodeKitHandler`

- Archivo: `handlers/wirepas_handler/strategy_handler/node_kit_handler.py:13-97`
- Acepta: `95`
- Payload: `[3:7]` `kit_id`
- Logica:
  - si el kit esta WAITING y no COMPLETE, lo marca COMPLETE y publica confirmacion a cloud (`:59-81`).
- Respuesta:
  - `[0,0,94][kit_id 4B LE][timestamp 4B LE]` a `gw-res/n/{node_id}` (`:83-97`).

### `ConfigSensorHandler`

- Archivo: `handlers/wirepas_handler/movement_sensor_handler/config_sensor_handler.py:10-55`
- Acepta: `112`, `111`
- Logica:
  - anade un byte `1` al final del payload (`:46-51`);
  - anade timestamp local de 4 bytes;
  - publica el resultado a `gw-res/n/{node_id}` (`:53-55`).

### `IsMovementSensorHandler`

- Archivo: `handlers/wirepas_handler/movement_sensor_handler/is_movement_sensor_handler.py:8-122`
- Se usa solo desde `UNIC_MSG` Zhaga DALI.
- Payload: usa `payload[3]` como rol del nodo (`:16,89-99`).
- Logica:
  - reduce los roles Wirepas a `assigned=1` o `unassigned=0` (`:28-41,92-99`);
  - compara contra estado actual guardado en `movement_sensor` (`:86-103`);
  - si cambia o no existia, actualiza SQLite/Redis y publica `[0,0,50,new_status,timestamp]` a `gw-req/n/{node_id}` (`:107-122`).

## Familia alarmas

### `AlarmsToNodeHandler`

- Archivo: `handlers/wirepas_handler/unic_handlers/alarms_to_node_handler.py:10-137`
- Acepta: `202`
- Payload: `[0,0,202,alarm_id,alarm_status]`
- Logica:
  - cruza el payload con `alarm_status` persistido (`:63-86`);
  - si una alarma nueva llega con status enabled, la confirma al nodo, la guarda, añade timestamp y la informa al cloud (`:79-90`);
  - si llega resuelta y existia, la confirma al nodo, la borra y la informa al cloud (`:72-78,126-137`);
  - si el backend la habia deshabilitado, solo la borra localmente (`:76-78`).
- Persistencia:
  - `put_alarm_to()`, `remove_alarm_by()`, `remove_alarm_integers_by()` (`services/node_alarms_sqlite_service.py:35-152`).
- Respuesta:
  - Wirepas eco del payload al nodo (`:92-94`);
  - cloud `alarm/n/{node_id}` con payload original + timestamp (`:130-137`).

### `AlarmsToNodeV2Handler`

- Archivo: `handlers/wirepas_handler/unic_handlers/alarms_to_node_v2_handler.py:13-100`
- Se usa solo para `UNIC_MSG`.
- Payload: 4 bytes de bitmask `[a1,a2,a3,a4]` sin cabecera (`:52-57`).
- Logica:
  1. lee la ultima lista de enteros desde DB/Redis (`:68-72`);
  2. calcula `xor` byte a byte y bit a bit (`:73-88`);
  3. por cada cambio genera un pseudo-payload clasico `[0,0,202,alarm_number,status]` y delega a `AlarmsToNodeHandler` (`:89-97`);
  4. persiste la nueva lista completa (`:99-100`).

## Handler combinado

### `StatusRawConsumptionsHandler`

- Archivo: `handlers/wirepas_handler/unic_handlers/status_raw_consumptions_handler.py:11-116`
- Acepta: `208`
- Payload:
  - `[3:-2]` consumo DALI
  - `[-2]` dimming
  - `[-1]` status
- Logica:
  - crea un payload virtual de estado `[0,0,7,status,dimming]` y lo pasa a `NodeStatusHandler` (`:81-97`);
  - crea un payload virtual de consumo `[0,0,204,<consumptions>]` y lo pasa a `DaliConsumptionsHandler` (`:99-115`).

## `BatteryThresholdHandler`

- Archivo: `handlers/wirepas_handler/unic_handlers/battery_threshold_handler.py:10-73`
- Acepta: `80`
- Payload:
  - `[3:5]` charge limit voltage
  - `[5:7]` charge return voltage
  - `[7:9]` discharge return voltage
  - `[9:11]` discharge voltage
  - `[11:13]` system voltage
  - `[13:15]` battery type
- Funcion:
  - solo loguea el contenido y reenvia el payload intacto a `gw-res/n/{node_id}` (`:53-73`).

## `DefaultHandler`

- Archivo: `handlers/wirepas_handler/default_handler.py:37-185`
- Acepta efectivamente:
  - `101` `RAW_COMMAND`
  - `29` `NEIGHBORS`
  - `84..91` `READ_*`/`WRITE_*`
- Casos:
  - `RAW_COMMAND`: publica JSON en local MQTT `gateway/command/wirepas/{GW_ID}` (`:168-182`);
  - `NEIGHBORS`: parsea `message_id`, `next_hop_id`, `number_nbors` y bloques de 11 bytes por vecino (`:79-140`), luego persiste con `put_node_neighbors_by_node_id()`;
  - `READ_*`/`WRITE_*`: passthrough a `gw-res/n/{node_id}` (`:143-147`);
  - resto: warning de no manejado (`:151`).

Layout `NEIGHBORS`:

- `[0:2]` `message_id` little-endian
- `[3:7]` `next_hop_id`
- `[7]` `number_nbors`
- por vecino, 11 bytes:
  - `[0:4]` `neighbor_id`
  - `[4]` `rssi`
  - `[5:9]` `last_update`
  - `[9]` `tx_power` signed
  - `[10]` `rx_power` signed
