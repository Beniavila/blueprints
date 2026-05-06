# Scheduler v1 — Contrato y modelo temporal

Estado: documento contractual (sin código). Fuente de verdad para implementación.

## Propósito
Definir cuándo y por qué el scheduler actúa, sin mezclar lógica de ejecución (worker).

## Estados temporales (clasificación lógica, no persistida)
- **scheduled**: campaña con `scheduled_at > now`.
- **ready**: `scheduled_at <= now`, aún no arrancada.
- **running**: step en curso (estado de campaña persistido).
- **stuck**: running pero el step superó `step_timeout_at`. No es estado de DB; es una alerta operativa.
- **done / failed / canceled**: terminales; el scheduler no interviene.

## Responsabilidades del scheduler (v1)
- **Sí hace**
  - Cada tick (y en el arranque): detectar campañas `ready` y publicar el job del step actual.
  - En arranque: aplicar la misma lógica del tick (rehidratación).
  - Campañas retrasadas (`scheduled_at` en el pasado sin arrancar): tratarlas como `ready` y publicarlas.
  - Campañas `stuck` (rule v1: `now > step_timeout_at`): republicar el job del step actual de forma idempotente (no marca failed).
- **No hace**
  - No cierra steps ni avanza fases (eso es worker).
  - No interpreta callbacks MQTT ni estados de gateways.
  - No toca campañas terminales.
  - No inspecciona backpressure de NATS (confía en idempotencia y el siguiente tick).

## Relación scheduler ↔ worker
- Scheduler inicia el step según reloj (publica job).
- Worker ejecuta, decide cierre/avance de step y publica siguiente step.
- Idempotencia: re-publicar es seguro (dedupe por `idempotency_key` + `job_executions`).
- Backpressure: si NATS está saturado, el tick siguiente reintentará; no hay inspección de stream en v1.

## Reglas de tiempo (v1)
- Tick periódico (intervalo configurable).
- `ready`: `scheduled_at <= now` y campaña no iniciada.
- `stuck`: `now > step_timeout_at` del step actual → republicar job actual.
- No se marca `failed` por timeout en scheduler v1; solo reenvía para “despertar” al worker.

## Entregable
Documento contractual (este archivo). Implementación en tickets posteriores.
