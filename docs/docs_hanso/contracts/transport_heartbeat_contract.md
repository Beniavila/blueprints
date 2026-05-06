# Contrato de Transporte y Heartbeat (Hanso <-> Habaki)

## 1. Alcance

Este contrato aplica al canal persistente **QUIC/WebSocket** entre Hanso y Habaki para:

- autenticacion
- presencia (`online/offline`)
- heartbeat (`ping/pong`)
- envio de metricas

## 2. Mensajes del contrato

Mensajes soportados:

- `auth` -> `auth_response`
- `ping`
- `pong`
- `metrics`
- `disconnect`

Notas:

- `ping` puede iniciarlo Hanso o Habaki.
- `pong` siempre es respuesta inmediata al `ping`.
- `metrics` no define presencia por si solo; la presencia depende de actividad del canal.

## 3. Timers y umbrales vigentes

- `HEARTBEAT_INTERVAL` (servidor): `30s`
- `HABAKI_HEARTBEAT_INTERVAL` (agente): `30s` (default)
- `PONG_TIMEOUT` (servidor): `90s`
- `HABAKI_CONN_IDLE_TIMEOUT` (agente): `90s` (default)

## 4. Reglas de estado (contrato funcional)

### 4.1 Estado `online`

Un gateway esta `online` si existe sesion activa en el manager de conexiones.

### 4.2 Transicion a `offline`

Hanso marca `offline` cuando:

- no recibe `pong` dentro de `PONG_TIMEOUT`, o
- el canal se cierra por error de red/protocolo.

### 4.3 Reconexion

Habaki debe:

- detectar canal muerto por timeout/errores de envio o lectura,
- cerrar la sesion local,
- reintentar conexion con backoff (`HABAKI_RECONNECT_BASE` -> `HABAKI_RECONNECT_MAX`),
- reautenticarse y reanudar heartbeat/metricas.

## 5. Casos operativos esperados

### Caso A: corte de red en gateway

Esperado:

1. Habaki deja de recibir respuestas.
2. Hanso agota `PONG_TIMEOUT` y hace `disconnect`.
3. UI muestra gateway `offline`.
4. Al volver red, Habaki reconecta automaticamente.
5. UI vuelve a `online` sin accion manual.

### Caso B: reinicio de Hanso

Esperado:

1. Habaki detecta cierre/timeout del canal.
2. Habaki entra en ciclo de reconexion.
3. Cuando Hanso vuelve, Habaki se reconecta y autentica.

## 6. Logging minimo obligatorio

Para diagnostico de enlace, ambos lados deben registrar:

- conexion/desconexion
- `ping` enviado
- `ping` recibido
- `pong` enviado
- `pong` recibido
- timeout por inactividad

Ejemplos en Hanso:

- `Habaki connected: <gw_id> transport=quic`
- `PING sent to <gw_id> (server heartbeat)`
- `PING received from <gw_id>`
- `PONG sent to <gw_id> (reply to gateway PING)`
- `PONG from <gw_id> (...)`
- `Habaki <gw_id>: no PONG in ... s - closing`

## 7. Invariantes del contrato

- Si no hay sesion activa, Hanso no envia heartbeat a ese gateway.
- Si hay sesion activa, debe existir trafico heartbeat periodico.
- Una sesion sin trafico por encima de timeout debe terminar en reconexion de Habaki.
- `metrics` no sustituye `ping/pong` como criterio de salud del canal.
