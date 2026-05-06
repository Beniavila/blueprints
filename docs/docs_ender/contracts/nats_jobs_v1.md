# Contrato NATS – OTAP Jobs v1

## Objetivo
Definir subjects, payload y semántica para los jobs OTAP en JetStream (persistentes, reintentables e idempotentes).

## Subjects
- Base: `ender.otap.job.v1`
- Por step (recomendado para routing/backpressure):
  - `ender.otap.job.v1.propagate`
  - `ender.otap.job.v1.processing`
  - `ender.otap.job.v1.collect`

Regla: el `step` en el payload es la fuente de verdad; el step en el subject es solo una ayuda operativa para enrutar y observar.

## Payload (JSON)
```json
{
  "job_id": "ulid-or-uuidv7",
  "campaign_id": "OTAP-123",
  "step": "propagate",
  "attempt": 1,
  "idempotency_key": "OTAP-123:propagate",
  "created_at": "2025-01-10T12:00:00Z"
}
```

### Campos
- `job_id`: identifica esta ejecución concreta del job (cambia en cada retry).
- `campaign_id`: OTAP a procesar.
- `step`: `propagate | processing | collect` (viene en payload y subject).
- `attempt`: entero ≥ 1; incrementa en cada retry.
- `idempotency_key`: identifica la intención lógica (estable). Ejemplo recomendado: `campaign_id + ":" + step`.
- `created_at`: RFC3339 UTC.

## Semántica
- Persistencia: los jobs viven en JetStream (durable).
- Ack explícito: el worker debe ack/nack para controlar retries.
- Retries: re-publicar el mismo payload cambiando `job_id` e incrementando `attempt`.
- Idempotencia: el worker debe usar `idempotency_key` para no duplicar comandos ni avanzar steps dos veces.
- Invariante de paso: el worker consulta el estado persistido de campaña/step antes de publicar comandos o avanzar.

## Invariantes operativas
- No se avanza un step dos veces: el estado en DB es la fuente de verdad.
- No se reenvían comandos si el step ya está cerrado (campaign_steps.status != running).
- Backpressure: separar subjects por step permite escalar/restringir consumidores por fase OTAP.

## Ejemplo de mensaje (propagate)
Subject: `ender.otap.job.v1.propagate`
Payload:
```json
{
  "job_id": "01JABCDEF1234567890",
  "campaign_id": "OTAP-123",
  "step": "propagate",
  "attempt": 1,
  "idempotency_key": "OTAP-123:propagate",
  "created_at": "2025-01-10T12:00:00Z"
}
```
