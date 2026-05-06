# 10. Bugs y TODOs conocidos

Indice unico de discrepancias detectadas entre docs y codigo real. Cada entrada describe el comportamiento actual y deja pendiente la decision para el paquete compartido (fase 2): replicar tal cual, corregir o eliminar.

## 1. `AllegroConsumptionsHandler` inactivo

- Ubicacion: `handlers/wirepas_handler/consumptions_handler/allegro_consumptions_handler.py:40-41`
- Observado: `can_handle()` devuelve `False` siempre; la linea original esta comentada (`#self.msg_type == msg_const.ALLEGRO_RAW_CONSUMPTION`).
- Consecuencia: `msg_type=111` no se procesa nunca como consumo Allegro; hoy solo lo toma `ConfigSensorHandler` como `SECTION_SENSOR`.
- Decision nuevo paquete: TODO — decidir si se replica desactivado, se elimina el handler o se reactiva con su condicion real.

## 2. `msg_type=107` ambiguo

- Ubicacion: `constants/wirepas_msg_constants.py:6` (`SOLAR_STATUS`) y `:55` (`SOLAR_RAW_CONSUMPTION`).
- Observado: dos constantes distintas comparten el opcode 107. La ruta/handler marca la semantica, no el valor.
- Decision nuevo paquete: TODO — mantener alias o separar en dos opcodes distintos.

## 3. `msg_type=111` dual

- Ubicacion: `constants/wirepas_msg_constants.py:25` (`SECTION_SENSOR`) y `:56` (`ALLEGRO_RAW_CONSUMPTION`).
- Observado: el opcode 111 se usa tanto para `SECTION_SENSOR` (manejado por `ConfigSensorHandler`) como para `ALLEGRO_RAW_CONSUMPTION` (manejado por `AllegroConsumptionsHandler`, inactivo). Relacionado con el punto 1.
- Decision nuevo paquete: TODO — se resuelve junto al punto 1.

## 4. DALI empaqueta `active_power` inexistente

- Ubicacion: `handlers/cloud_mqtt_handler/request_raw_consumption_handler.py:104-107`.
- Observado: para `REQUEST_DALI_CONSUMPTION` se declara `pack_consums = [('active_power', '<f')]`, pero la tabla `dali_consumptions` no guarda `active_power` (ver `services/node_consumptions_sqlite_service.py:191-206`). Guarda `apparent_power`.
- Consecuencia: `prepare_consums()` lanza `KeyError` al acceder `self.raw_consum['active_power']` cuando llega `msg_type=110`.
- Decision nuevo paquete: TODO — presumiblemente corregir a `apparent_power`.

## 5. WAITING solo vive en Redis

- Ubicacion: `services/node_strategy_sqlite_service.py:41-67`.
- Observado: `put_strategy_waiting_to()` y `put_kit_waiting_to()` solo escriben en Redis; no hay `INSERT` en SQLite. Solo los `complete_to()` (lineas 69+) persisten en SQLite.
- Consecuencia: si Redis cae entre WAITING y COMPLETE, se pierde el estado intermedio y `NewStrategyHandler`/`KitHandler` no pueden recuperar el polling tras reinicio.
- Decision nuevo paquete: corregir — `WAITING` debe persistirse tambien en SQLite y cualquier cambio o borrado debe aplicarse tanto en SQLite como en Redis/cache.

## 6. `init_send_all_consums_calculates()` es no-op

- Ubicacion: `utils/consumptions.py:363-370`.
- Observado: la funcion entera esta comentada con un `# TODO: Refactor this function` y retorna `None`.
- Callers actuales: `DefaultHandler` cuando llega `ALL_CONSUMS=210`, `DeleteOldNodeHandler`, y `CheckNodesKeepaliveWatchdog` antes de borrar el nodo.
- Consecuencia: esos 3 flujos hoy no envian los coeficientes pendientes al cloud aunque el codigo lo invoque.
- Decision nuevo paquete: TODO — implementar el refactor pendiente o eliminar la llamada.

## 7. "Second chance" del watchdog de keepalive

- Ubicacion: `services/watchdogs/check_nodes_keepalive_watchdog.py:251-256`.
- Observado: existe `second_chance_to_revive_node()` que envia un mensaje `NEIGHBORS` al nodo presuntamente muerto, pero no se llama desde el flujo principal de `death_node_method()`.
- Consecuencia: codigo potencialmente muerto; la doc 08 lo flagea en la seccion "Contrato para fase 2".
- Decision nuevo paquete: TODO — conservar si se planea reintegrarlo o eliminar.
