# Contrato de mensajería MQTT (payload, cifrado, topics)

## 1. Wire format
- **Formato**: protobuf binario (`EnvelopeV1` + payload OTAP).
- **Cifrado**: AES-GCM (128/256). Se cifra **todo el buffer protobuf** antes de publicar.
  - Clave simétrica base64 (`MQTT_PAYLOAD_KEY`), 16 o 32 bytes.
  - Nonce aleatorio por mensaje (12 bytes, prepend al ciphertext).
  - Tag de autenticación (16 bytes) añadido por GCM.
- TLS del broker se puede usar adicionalmente, pero el payload ya va cifrado E2E.

## 2. EnvelopeV1
Campos (protobuf, `proto/envelope_v1.proto`):
- `version` (string) – contrato de evento, ej. `1.0`.
- `event_type` (string) – ver sección 4.
- `campaign_id` (string)
- `gateway_id` (string)
- `timestamp` (string, RFC3339 UTC)
- `data` (bytes) – payload protobuf del evento (`otap.proto`).

## 3. Payloads soportados (MVP)
Definidos en `proto/otap.proto`:
- `StepCompletedPayload`
  - `step` (`propagate|processing|collect`)
  - `duration_seconds` (int32)
  - `nodes_total` (int32)
  - `nodes_updated` (int32)
- `StepFailedPayload`
  - `step` (`propagate|processing|collect`)
  - `error_code` (string, ej. `TIMEOUT`, `INVALID_FIRMWARE`, `INTERNAL_ERROR`)
  - `error_message` (string, libre; opcional en la práctica)

## 4. event_type (MVP)
- `otap.step.completed`
- `otap.step.failed`

## 5. Topics
- **Commands (Ender → Gateway)**: `ender/command/otap/{step}/{gateway_id}`
  - `step` ∈ `propagate|processing|collect`
  - Payload: EnvelopeV1 + payload específico del comando (por definir en MVP si se envían parámetros adicionales; se puede reutilizar el envelope actual con event_type de comando).
- **Status (Gateway → Ender)**: `ender/status/otap/{step}/{gateway_id}`
  - `step` ∈ `propagate|processing|collect`
  - Payload: EnvelopeV1 + `StepCompletedPayload` o `StepFailedPayload` (según `event_type`).

## 6. Claves y rotación
- Clave simétrica configurada por entorno (`MQTT_PAYLOAD_KEY`, base64).
- No se incluye aún `key_id` en el envelope; rotación requerirá ventana de despliegue coordinada o ampliar el envelope (futuro).

## 7. Resumen operativo
- Gateway y Ender comparten los mismos `.proto` (`proto/envelope_v1.proto`, `proto/otap.proto`).
- Sender: `Marshal(EnvelopeV1)` → `AES-GCM` → publish.
- Listener: `AES-GCM` decode → `Unmarshal(EnvelopeV1)` → `Unmarshal(data)` según `event_type`.

[Volver al README](../../README.md)
