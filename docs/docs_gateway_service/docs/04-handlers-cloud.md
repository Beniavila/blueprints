# 04. Handlers cloud

Este documento cubre la entrada MQTT cloud definida en `services/cloud_mqtt_service.py:251-370`.

## Entrada comun

`CloudMQTTService.on_message()` separa por topic (`services/cloud_mqtt_service.py:323-331`):

- `cl-*/n/{node_id}` → `msg_to_node()`;
- `cl-*/gw/{GW_ID}` → `msg_to_gateway()`.

En ambos casos:

- `payload_bytes = msg.payload`;
- `payload = [byte for byte in msg.payload]`;
- `msg_type = payload[2]`;
- se crea `MessageRequest` con los servicios ya inicializados (`services/cloud_mqtt_service.py:333-370`).

## `OnOffSwitchStatusHandler`

- Archivo: `handlers/cloud_mqtt_handler/on_off_switch_status_handler.py:9-58`
- Acepta: `1`, `2`, `3`, `40`, `41`
- Funcion:
  - reenvia el `payload_bytes` original al nodo 3 veces con pausa de `0.333 s` (`:53-58`).
- Persistencia: ninguna.
- Telecom saliente:
  - `wni.send_message_to_node(node_id, payload_bytes)` (`:56-58`).

## `NewStrategyHandler`

- Archivo: `handlers/cloud_mqtt_handler/new_strategy_handler.py:20-217`
- Acepta: `15`
- Payload:
  - `[3:7]` `strategy_id` little-endian (`:65-66`);
  - `[14:27]` contiene pares `hora,minuto` que el handler transforma a UTC, saltando valores `98`, `99`, `254` (`:106-127`);
  - al enviar al nodo anade `offset` GMT en 1 byte (`:128-136`).
- Pasos:
  1. si la estrategia ya existe, solo manda confirmacion a cloud (`:82-90`);
  2. si no existe, guarda WAITING en Redis (`:103-105`);
  3. convierte horas locales a UTC segun `TIMEZONE` (`:106-127`);
  4. calcula offset GMT (`:128-130`);
  5. envia el payload modificado al nodo (`:131-136`);
  6. pide `GET_STRATEGY` al nodo (`:138-140`);
  7. hace polling hasta 5x5 iteraciones con sleeps de `2 s` y `5 s`, esperando que otro handler marque COMPLETE (`:142-166`);
  8. si queda COMPLETE, vuelve a escribir COMPLETE; si no, borra WAITING (`:151-188`).
- Persistencia:
  - `node_strategy_sqlite_service.put_strategy_waiting_to()` en Redis (`:103-105`);
  - `put_strategy_complete_to()` en Redis+SQLite (`:178-182`);
  - `delete_strategy_waiting_by()` (`:184-188`).
- Respuesta:
  - `gw-res/n/{node_id}` con `[0,0,15][strategy_id 4B][timestamp 4B]` (`:190-217`).

## `NewSolarStrategyHandler`

- Archivo: `handlers/cloud_mqtt_handler/new_solar_strategy_handler.py:20-188`
- Acepta: `92`
- Diferencias respecto a `NewStrategyHandler`:
  - no transforma horas ni anade GMT offset (`:101-107`);
  - espera mucho mas: `save_strategy_wait_time=30`, `time_to_sleep=30` (`:28-31`);
  - para validar pide `GET_SOLAR_STRATEGY` (`:108-111`).
- Persistencia/respuesta:
  - misma semantica WAITING → COMPLETE → `gw-res/n/{node_id}` con `[0,0,92][strategy_id][timestamp]` (`:161-188`).

## `RequestRawConsumptionHandler`

- Archivo: `handlers/cloud_mqtt_handler/request_raw_consumption_handler.py:14-141`
- Acepta: `109`, `110`
- Logica:
  1. traduce `109 -> solar_consumptions`, `110 -> dali_consumptions` (`:82-91`);
  2. define una lista de campos a empaquetar (`:93-107`);
  3. lee el ultimo raw via `get_last_raw_consums_by_node_id_and_consum_type()` (`:112-114`);
  4. empaqueta cada campo con `struct.pack()` y lo concatena al prefijo `[msg_id,msg_type]` (`:116-129`);
  5. anade timestamp local de 4 bytes (`:130-133`);
  6. publica a `gw-res/n/{node_id}` (`:134-141`).
- Observaciones:
  - solar empaqueta `SOC`, `driver_state`, `battery_voltage`, `charge_power`, `luminaire_power`;
  - DALI pretende empaquetar `active_power`, pero esa columna no existe en la tabla real; hoy es una discrepancia del codigo (`:104-107`).

## `AlarmsToCloudHandler`

- Archivo: `handlers/cloud_mqtt_handler/alarms_to_cloud_handler.py:9-75`
- Acepta: `203`
- Payload: `[0,0,203,alarm_id,...]`
- Logica:
  1. toma `alarm_id=payload[3]` (`:65-67`);
  2. borra `alarm_status` y `alarm_list_integers` del nodo (`:59-70`);
  3. genera `[0,0,202,alarm_id,2]`, donde `2` es `DISABLE_ALARM` (`:72-74`);
  4. lo envia al nodo por Wirepas (`:75-76`).

## `SendPositioningHandler`

- Archivo: `handlers/cloud_mqtt_handler/send_positioning_handler.py:13-91`
- Acepta: `7`
- Funcion:
  - toma `LATITUDE` y `LONGITUDE` desde config (`:69-70`);
  - empaqueta ambos en float LE de 4 bytes (`:72-76`);
  - anade timestamp local como uint32 LE (`:82-86`);
  - publica el mensaje resultante a `gw-req/gw/{GW_ID}` (`:89-91`).
- Mensaje generado:
  - `[0,0,7][lat 4B LE][lon 4B LE][timestamp 4B LE]`.

## `DeleteOldNodeHandler`

- Archivo: `handlers/cloud_mqtt_handler/delete_old_node_handler.py:15-100`
- Acepta: `6`
- Payload:
  - toma `node_id` a borrar desde `payload[3:11]` usando `decode_msg_payload()` (`:53-55`).
- Pasos:
  1. fuerza un ultimo calculo de coeficientes con los raws que queden (`:69-79`);
  2. obtiene el tipo de consumo del nodo (`:82-85`);
  3. desuscribe `cl-req/n/{node_id}` (`:86-89`);
  4. borra discovery, lost, lumos, last_seen y status/RGB (`:90-100`);
  5. llama a `init_send_all_consums_calculates()`, que hoy es no-op (`utils/consumptions.py:363-370`).
- Persistencia:
  - `NodesSQLiteService.delete_node_discovery_by_id()`
  - `delete_node_by_id_from_lost_nodes()`
  - `delete_lumos_maxima_by_node_id()`
  - `NodeStatusSQLiteService.delete_last_seen()`
  - `delete_led_status_dimming()` o `delete_rgb_status()`.

## `KitHandler`

- Archivo: `handlers/cloud_mqtt_handler/kit_handler.py:20-181`
- Acepta: `94`
- Payload: `[3:7]` `kit_id`
- Pasos:
  1. si el kit ya existe, solo confirma a cloud (`:80-89`);
  2. si no existe, guarda WAITING en Redis (`:99-100`);
  3. envia el payload tal cual al nodo (`:102-104`);
  4. espera `50 s`, pide `GET_KIT`, y hace polling con sleeps de `50 s` y `30 s` (`:105-153`);
  5. si se confirma, marca COMPLETE y pide `GET_STRATEGY` al nodo (`:118-157`);
  6. si no, borra WAITING (`:129-153`).
- Respuesta:
  - `gw-res/n/{node_id}` con `[0,0,94][kit_id][timestamp]` (`:159-181`).

## `DefaultHandler`

- Archivo: `handlers/cloud_mqtt_handler/default_handler.py:37-175`
- Acepta: `80,81,82,83,27,42,210,29,98,99,255,84..91,254,112,111`
- Casos:
  - `ALL_CONSUMS=210`: llama a `init_send_all_consums_calculates()`, que hoy devuelve `None` (`:127-129`, `utils/consumptions.py:363-370`);
  - `HEX_COMMANDS=255`: toma `source_endpoint=payload_bytes[3]`, `destination_endpoint=payload_bytes[4]`, y envia el resto del payload al nodo (`:144-151`);
  - `BROADCAST=254`: recorta cabecera+2 bytes de endpoints (`payload_bytes[5:]`) y envia a direccion broadcast `4294967295` (`:153-175`);
  - resto: passthrough Wirepas del payload original (`:135-142`).
- Casos de sensor:
  - `SEND_CONFIG_SENSOR=112` y `SEND_SECTION=111` no se transforman; solo se loguean y se envian al nodo (`:139-142`).

## Cadena a gateway

La cadena `setup_handlers_to_gateway()` (`services/cloud_mqtt_service.py:309-318`) reutiliza:

- `DeleteOldNodeHandler`
- `SendPositioningHandler`
- `DefaultHandler`

La diferencia es solo el topic de entrada MQTT. El contrato binario y los efectos son los mismos.
