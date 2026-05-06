# 08. Watchdogs

## Inventario

Solo hay dos watchdogs activos:

- `CheckNodesKeepaliveWatchdog` (`services/watchdogs/check_nodes_keepalive_watchdog.py:14-255`)
- `CheckConsumptionLostWatchdog` (`services/watchdogs/check_consumption_lost_watchdog.py:12-175`)

Ambos se arrancan desde `main.py:138-152`.

## `CheckNodesKeepaliveWatchdog`

- Archivo: `services/watchdogs/check_nodes_keepalive_watchdog.py:14-255`
- Cadencia: cada `30 s` por defecto (`:15-18,49-58`)
- Servicios usados:
  - `cloud_mqtt_service.mqtt` (`:35-47`)
  - `wirepas_service.wni` (`:41-42`)
  - `node_consumptions_sqlite_service`
  - `nodes_sqlite_service`
  - `node_status_sqlite_service`

### Trigger

Para cada nodo en `node_discovery`, lee `last_seen` (`:60-83`).

- si no existe `last_seen`, trata el nodo como muerto (`:89-92`);
- si `now - last_seen > 900 s`, ejecuta `death_node_method()` (`:86-88`).

### Accion al morir

Fuente: `services/watchdogs/check_nodes_keepalive_watchdog.py:118-168`

1. si ya estaba en `lost_nodes`, solo borra discovery/status y termina (`:123-127`);
2. lee `consumptions_type` y ultimo estado (`:133-139`);
3. escribe estado `DEATH_NODE` en status/RGB (`:141,206-214`);
4. fuerza calculo de consumos pendientes (`:142,231-245`);
5. inserta el nodo en `lost_nodes` (`:145,195-196`);
6. borra discovery, last_seen, status y movement sensor (`:146,216-229`);
7. publica a cloud un estado de muerte:
   - RGB: `[0,0,34,0,0,0,0]`
   - resto: `[0,0,33,0,0]` con `DEATH_NODE=0` en el campo estado (`:184-193`);
8. desuscribe `cl-req/n/{node_id}` (`:151-152`).

### Observaciones

- `init_send_all_consums_calculates()` se llama antes de borrar, pero hoy no hace nada (`utils/consumptions.py:363-370`).
- `death_node=900` no es el valor enviado al cloud; es solo el umbral temporal (`check_nodes_keepalive_watchdog.py:21-22`).

## `CheckConsumptionLostWatchdog`

- Archivo: `services/watchdogs/check_consumption_lost_watchdog.py:12-175`
- Cadencia: cada `25 s` por defecto (`:13-16,54-61`)
- Dominio: solo recuperacion de DALI perdido.

### Flags monitorizadas

Fuente: `services/watchdogs/check_consumption_lost_watchdog.py:23-43`

- `dali_voltage_current_cc_flag`
- `dali_temperature_voltage_ca_flag`
- `dali_power_factor_apparent_power_flag`

Cada una corresponde a dos campos perdidos:

- `voltage_cc_pcb`, `current_cc_pcb`
- `temperature_driver`, `voltage_net_ca`
- `power_factor`, `apparent_power`

### Trigger

1. lee todas las flags activas via `get_flags()` (`:63-67`);
2. agrupa por `node_id` y cuenta measurements unicos (`:70-98`);
3. procesa un nodo si:
   - tiene las 3 flags, o
   - tiene alguna y la primera supera `25 s` (`:99-118`).

### Accion

1. `ConsumptionProcessor.process_lost_consumptions(node_id)` recompone el raw principal (`:126-131`);
2. borra flags (`:138-140`);
3. borra tablas `*_lost` asociadas (`:142-149`);
4. relanza `CalculateConsumptionsService.init()` con `consumptions_type='dali_consumptions'` (`:154-172`).

## Contrato para fase 2

Estos watchdogs no pertenecen a telecom. Dependen solo de:

- lectura/escritura de status, raw, coeficientes y discovery;
- capacidad de publicar al cloud;
- acceso a `wirepas_service` solo en el watchdog de keepalive para un "second chance" no usado en el flujo principal (`services/watchdogs/check_nodes_keepalive_watchdog.py:251-255`).
