# Documentacion Fase 1: logica extraible del gateway

Esta carpeta documenta la logica funcional e implementativa que hoy vive dentro del gateway y que en la fase 2 deberia salir a un paquete Python compartido. El objetivo no es explicar MQTT/Wirepas, sino dejar fijado el contrato de:

- handlers de entrada y salida;
- calculo de consumos y coeficientes;
- persistencia SQLite;
- cache Redis;
- watchdogs;
- frontera telecomunicaciones ↔ logica.

Dirigido a:

- quien vaya a extraer la logica a un paquete comun;
- quien necesite reimplementar handlers o calculos sin releer todo el repo;
- quien tenga que mantener el gateway sin mezclar telecom con negocio.

## Indice

- [01-architecture.md](./01-architecture.md): vision global, flujos y cadena de responsabilidad.
- [02-message-contract.md](./02-message-contract.md): contrato binario, `msg_type`, serializacion y offsets comunes.
- [03-handlers-wirepas.md](./03-handlers-wirepas.md): handlers Wirepas → cloud/gateway.
- [04-handlers-cloud.md](./04-handlers-cloud.md): handlers cloud → nodo/gateway.
- [05-consumptions-calculations.md](./05-consumptions-calculations.md): pipeline raw → coeficientes.
- [06-database-schema.md](./06-database-schema.md): 5 SQLite, tablas, claves y API publica.
- [07-redis-cache.md](./07-redis-cache.md): claves, patron write-through/read-through e invalidacion.
- [08-watchdogs.md](./08-watchdogs.md): watchdogs y triggers.
- [09-coupling-points.md](./09-coupling-points.md): frontera para la fase 2.
- [10-known-issues-todos.md](./10-known-issues-todos.md): discrepancias y TODOs a resolver en la extraccion.

## Tabla maestra Wirepas → handler

| msg_type | Constante | Handler actual | Notas |
| --- | --- | --- | --- |
| 3 | `DIMMING` | `OldNodeStatusHandler` | `handlers/wirepas_handler/status_handler/old_node_status_handler.py:31` |
| 7 | `NODE_STATUS` | `NodeStatusHandler` | `handlers/wirepas_handler/status_handler/node_status_handler.py:31` |
| 29 | `NEIGHBORS` | `DefaultHandler` | Persiste snapshot de vecinos |
| 34 | `RGB_STATUS` | `RGBStatusHandler` | `handlers/wirepas_handler/status_handler/rgb_status_handler.py:37` |
| 42 | `LUMOS_MAXIMA` | `LumosMaximaHandler` | `handlers/wirepas_handler/consumptions_handler/lumos_maxima_handler.py:50` |
| 50 | `UNIC_MSG_TYPE` | `UnicMsgHandler` | Descompone un payload compacto en submensajes |
| 80 | `SOLAR_BATHERY_THRESHOLD` | `BatteryThresholdHandler` | Reenvio transparente a cloud |
| 81 | `SETTED_SOLAR_STRATEGY` | `SettedSolarStrategyHandler` | Reenvio transparente a cloud |
| 92 | `SETTED_SOLAR_STRATEGY_V2` | `NodeStrategyHandler` | Marca estrategia solar como completa |
| 95 | `GET_KIT` | `NodeKitHandler` | Marca kit solar como completo |
| 100 | `ALPHA_CONSUMPTIONS` | `AlphaConsumptionsHandler` | Guarda en `alpha_consumptions` |
| 101 | `RAW_COMMAND` | `DefaultHandler` | Reenvio a MQTT local `gateway/command/wirepas/{GW_ID}` |
| 107 | `SOLAR_STATUS` / `SOLAR_RAW_CONSUMPTION` | `SolarStatusHandler` o `SolarConsumptionsHandler` | Depende del punto de entrada; ambos usan 107 |
| 111 | `ALLEGRO_RAW_CONSUMPTION` / `SECTION_SENSOR` | `ConfigSensorHandler` en la cadena normal | `AllegroConsumptionsHandler.can_handle()` esta desactivado (`False`) |
| 112 | `CONFIG_SENSOR` | `ConfigSensorHandler` | Reenvio a cloud con timestamp |
| 123 | `DALI_VOLTAGE_CURRENT_CC` | `RecoverDaliLostConsumptionsHandler` | Perdidos |
| 124 | `DALI_TEMPERATURE_VOLTAGE_CA` | `RecoverDaliLostConsumptionsHandler` | Perdidos |
| 125 | `DALI_POWER_FACTOR_APPARENT_POWER` | `RecoverDaliLostConsumptionsHandler` | Perdidos |
| 201 | `NODE_REQUEST_UNIXTIME` | `NodeRequestUnixtimeHandler` | Responde por Wirepas |
| 202 | `ALARM_NODE` | `AlarmsToNodeHandler` | En `UNIC_MSG` se usa `AlarmsToNodeV2Handler` |
| 204 | `DALI_RAW_CONSUMPTION` | `DaliConsumptionsHandler` | `handlers/wirepas_handler/consumptions_handler/dali_consumptions_handler.py:61` |
| 207 | `DALI_ALLEGRO_RAW_CONSUMPTION` | `DaliAllegroConsumptionsHandler` | `handlers/wirepas_handler/consumptions_handler/dali_allegro_consumptions_handler.py:43` |
| 208 | `DALI_STATUS_RAW_CONSUMPTIONS` | `StatusRawConsumptionsHandler` | Divide en status + consumo DALI |
| otros `READ_*`/`WRITE_*` | constantes 84-91 | `DefaultHandler` | Reenvio a cloud |

## Tabla maestra Cloud → handler

### Cadena a nodo

| msg_type | Constante | Handler actual | Notas |
| --- | --- | --- | --- |
| 1/2/3/40/41 | `NODE_ON`, `NODE_OFF`, `NODE_DIMMING`, `RGB_ON`, `RGB_OFF` | `OnOffSwitchStatusHandler` | Reenvia 3 veces por Wirepas |
| 15 | `NEW_STRATEGY` | `NewStrategyHandler` | Inserta WAITING, transforma horas a UTC, sondea confirmacion |
| 92 | `NEW_SOLAR_STRATEGY` | `NewSolarStrategyHandler` | Igual para estrategia solar |
| 109/110 | `REQUEST_SOLAR_CONSUMPTION`, `REQUEST_DALI_CONSUMPTION` | `RequestRawConsumptionHandler` | Lee ultimo raw desde SQLite/Redis y responde a cloud |
| 203 | `RESOLVED_ALARM_NODE` | `AlarmsToCloudHandler` | Borra alarma y manda `DISABLE_ALARM` al nodo |
| 7 | `SEND_POSITIONING` | `SendPositioningHandler` | Publica lat/lon del GW hacia cloud |
| 6 | `DELETE_OLD_NODE` | `DeleteOldNodeHandler` | Calcula ultimo bloque, borra nodo y desuscribe |
| 94 | `SET_KIT_SOLAR` | `KitHandler` | Inserta WAITING, sondea confirmacion del kit |
| varios | `DefaultHandler` | `handlers/cloud_mqtt_handler/default_handler.py:124` | All-consums, hex, broadcast, restart, panel/battery/pcb, sensor |

### Cadena a gateway

| msg_type | Constante | Handler actual | Notas |
| --- | --- | --- | --- |
| 6 | `DELETE_OLD_NODE` | `DeleteOldNodeHandler` | Reusa la misma logica |
| 7 | `SEND_POSITIONING` | `SendPositioningHandler` | Reusa la misma logica |
| resto validado | `DefaultHandler` | Reenvios y utilidades varias |

## Observaciones de contrato detectadas en el codigo

Las discrepancias y TODOs detectados al contrastar docs con codigo estan centralizados en [10-known-issues-todos.md](./10-known-issues-todos.md).
