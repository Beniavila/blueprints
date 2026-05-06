# 07. Cache Redis

## Componentes

Hay dos capas:

- `RedisClient`: wrapper bajo nivel (`clients/redis_client.py:8-89`)
- `RedisService`: adapter ligero usado por los servicios SQLite (`services/redis_service.py:6-59`)

Ademas existe `RedisCacheService` (`services/redis_cache_service.py:7-169`), pero el wiring real del repo usa `RedisClient` + `RedisService` desde `ManagerService.init_redis_service` (`services/manager_service.py:89-101`).

## Configuracion

### `RedisClient`

Fuente: `clients/redis_client.py:8-29`

- `host='redis'`
- `port=6379`
- `db=0`
- `socket_timeout=2.0`

### `RedisCacheService`

Fuente: `services/redis_cache_service.py:7-40`

- `host='redis'`
- `port=6379`
- `db=0`
- `max_retries=15`
- `retry_delay=2.0`
- `socket_timeout=2.0`

## Patron observado

En casi todos los servicios el patron es:

- write-through: SQLite primero, Redis despues;
- read-through: Redis primero, SQLite despues;
- delete-through: borrar SQLite y luego invalidar Redis.

Ejemplo claro en status:

1. `NodeStatusSQLiteService.put_led_status_dimming()` guarda `INSERT OR REPLACE` en SQLite (`services/node_status_sqlite_service.py:64-69`);
2. despues escribe `node:status:{node_id}` en Redis (`services/node_status_sqlite_service.py:54-63`).

Ejemplo claro en consumos raw:

1. `put_raw_dali_consumption_by_node_id()` inserta en SQLite (`services/node_consumptions_sqlite_service.py:188-202`);
2. despues actualiza `node:consumption:dali_consumptions:{node_id}` (`services/node_consumptions_sqlite_service.py:204-206`).

## Esquema de claves

### Nodos

Fuente principal: `services/nodes_sqlite_service.py:200-207,347-355`

- `node:discovery:{id}`
- `node:lost:{id}`
- `node:lumos:{id}`
- `node:movement_sensor:{id}`

Valores:

- discovery: `{"node_type": "..."}`
- lost: `{"death_node": <int>}`
- lumos: `{"max_apparent_power": <float>, "dimming": <float>}`
- movement sensor: `{"status": 0|1}`

### Status

Fuente: `services/node_status_sqlite_service.py:55-62,84-94,117-120`

- `node:status:{id}`
- `node:rgb_status:{id}`
- `node:last_seen:{id}`

Valores:

- status: `{"led_status": <int>, "dimming": <int>, "timestamp": <epoch>}`
- rgb_status: `{"led_status": <int>, "red": <int>, "green": <int>, "blue": <int>, "timestamp": <epoch>}`
- last_seen: entero epoch

### Estrategia / kit

Fuente: `services/node_strategy_sqlite_service.py:41-98`

- `node:strategy:{id}`
- `node:kit:{id}`

Valores:

- strategy: `{"status": "0|1", "strategy_id": <int>}`
- kit: `{"status": "0|1", "kit_id": <int>}`

Nota importante: el estado WAITING solo vive en Redis si no llega a COMPLETE.

### Alarmas

Fuente: `services/node_alarms_sqlite_service.py:35-68`

- `node:alarm:{node_id}:{alarm_id}`
- `node:list_alarm_integers:{node_id}`

Valores:

- alarma individual: `{"alarm_id": <int>, "alarm_status": <int|str>}`
- lista: `{"alarm_integers": "[0,0,0,0]"}` como JSON serializado dentro de otro JSON

### Consumos raw

Fuente: `services/node_consumptions_sqlite_service.py:152-183,343-430,506-529`

- `node:consumption:{measurement}:{node_id}`

Measurements usados:

- `dali_consumptions`
- `allegro_consumptions`
- `dali_allegro_consumptions`
- `solar_consumptions`

Valor:

```json
{
  "values": [
    {
      "timestamp": 1710000000,
      "apparent_power": 12.3,
      "current_cc_pcb": 40.0
    }
  ]
}
```

## Read-through

Ejemplos:

- `NodeStatusSQLiteService.get_last_led_status_dimming_by_node_id()` intenta Redis y si falla consulta SQLite (`services/node_status_sqlite_service.py:149-169`);
- `NodeConsumptionsSQLiteService.get_raw_consums_by_node_id_and_consum_type()` intenta Redis, valida estructura y si no vale recurre a SQLite (`services/node_consumptions_sqlite_service.py:369-430`);
- `NodesSQLiteService.get_nodes_discovered()` intenta agrupar `node:discovery:*` y si no existe consulta SQLite y repuebla Redis (`services/nodes_sqlite_service.py:412-449`).

## Invalidacion

Se borra en ambos niveles.

Ejemplos:

- `NodeStatusSQLiteService.delete_led_status_dimming()` elimina tabla y luego `node:status:{id}` (`services/node_status_sqlite_service.py:218-239`);
- `NodeConsumptionsSQLiteService.delete_raw_consums_by_node_id_and_consum_type()` elimina tabla raw y luego `node:consumption:{consum_type}:{id}` (`services/node_consumptions_sqlite_service.py:577-602`);
- `NodesSQLiteService.delete_node_discovery_by_id()` elimina SQLite y luego `node:discovery:{id}` (`services/nodes_sqlite_service.py:767-780`).

## Diferencias `RedisService` vs `RedisCacheService`

`RedisService`:

- el gateway lo usa realmente;
- delega directamente en `RedisClient`;
- no hace reintentos propios.

`RedisCacheService`:

- incluye `connect()` con hasta 15 reintentos (`services/redis_cache_service.py:17-40`);
- expone `wait_until_ready()`;
- duplica parte de la funcionalidad del servicio real;
- no aparece en `ManagerService`, asi que hoy no forma parte de la ruta principal.
