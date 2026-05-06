# Bootstrap JetStream – OTAP Jobs v1

## Objetivo
Crear stream y consumers para los jobs OTAP de forma idempotente.

## Stream
- Name: configurable (ej. `ENDER_OTAP_JOBS`)
- Subjects: `ender.otap.job.v1.*` (propagate/processing/collect)
- Storage: File
- Retention: Limits
- MaxAge: configurable (ej. 48h)
- Replicas: 1 (default; ajustar según cluster)

## Consumers (uno por step)
- Propagate:
  - Durable: `otap-propagate`
  - FilterSubject: `ender.otap.job.v1.propagate`
- Processing:
  - Durable: `otap-processing`
  - FilterSubject: `ender.otap.job.v1.processing`
- Collect:
  - Durable: `otap-collect`
  - FilterSubject: `ender.otap.job.v1.collect`

### Config común
- AckPolicy: explicit
- AckWait: default 60s (configurable)
- MaxAckPending: default 200 (configurable)
- MaxDeliver: configurable (ej. 5-10) — deja pasar a DLQ/manual si supera
- BackOff: opcional (documentado, no obligatorio en v1)
- DeliverPolicy: New

## DLQ (opcional v1)
- Subject sugerido: `ender.otap.job.v1.DLQ`
- Activar via MaxDeliver/BackOff si se desea; no obligatorio en v1.

## Notas de idempotencia y backpressure
- Cada consumer solo procesa su step (propagate/processing/collect) → backpressure por fase OTAP.
- El worker usa `idempotency_key` y estado persistido para no duplicar comandos ni avanzar steps dos veces.
- `MaxAckPending` controla la presión; al alcanzarlo, el publisher se frena.
- Configuración operativa (env sugeridas):
  - `NATS_CONSUMER_BATCH` (default 10)
  - `NATS_MAX_IN_FLIGHT` (default 5)
  - `NATS_FETCH_TIMEOUT_MS` (default 1000)
  - `NATS_ACK_WAIT_SECONDS` (default 60)
  - `NATS_MAX_DELIVER` (default 5; manejar DLQ manual si se supera)

## Contrato de subjects/payload
Referenciar `nats_jobs_v1.md` para el payload e invariantes de jobs.
