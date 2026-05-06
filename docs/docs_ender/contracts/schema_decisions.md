# Decisiones de esquema – DB v1

## Objetivo
Persistencia duradera y auditable para campañas OTAP. El esquema v1 fija tablas y constraints mínimas para operar y reiniciar sin perder estado.

## Tablas
### campaigns
- **PK**: `id`
- Campos clave: `name`, `organization`, `server_id`, `status`, `current_step`, `step_started_at`, `step_timeout_at`, `started_at`, `finished_at`
- Tiempos: `propagate_time_seconds`, `processing_time_seconds`, `timeout_margin_seconds`, `collect_timeout_seconds`
- Trazabilidad: `retry_of` (FK a campaigns.id), `firmware_id` (FK a firmwares.id)
- Índice parcial: `idx_campaign_active_scope` UNIQUE (organization, server_id) WHERE status IN ('pending','running') → garantiza 1 campaña activa por scope.

### campaign_gateways
- **PK**: (`campaign_id`, `gateway_id`)
- Campos: `step`, `status`, `error`, `updated_at`
- **FK**: campaign_id → campaigns (ON DELETE CASCADE)
- No se añaden índices secundarios en v1; se pueden agregar (campaign_id, step, status) si se necesita.

### campaign_steps
- **PK**: (`campaign_id`, `step`)
- Campos: `status` (running|completed|timeout|canceled), `started_at`, `timeout_at`, `finished_at`
- **FK**: campaign_id → campaigns (ON DELETE CASCADE)
- Orden cronológico por started_at; índice opcional si hay volumen.

### firmwares
- **PK**: `id`
- Metadata pasiva: `label`, `version`, `url`, `checksum`, `size_bytes`, `created_at`
- **FK**: campaigns.firmware_id → firmwares.id (sin cascada).
- No gestiona artefacto físico (MinIO); sólo metadata y trazabilidad.

### events (auditoría, fuera del alcance del read-model)
- **PK**: `id` (serial)
- Campos: `campaign_id`, `gateway_id`, `event_type`, `payload_json`, `received_at`
- Útil para reconstrucción y debug; no impacta las rutas de lectura.

## Constraints clave
- **Campaña activa**: índice parcial UNIQUE en campaigns (organization, server_id) con status pending/running.
- **Integridad referencial**: `campaign_gateways` y `campaign_steps` ON DELETE CASCADE para limpiar en bloque; `firmwares` sin cascada desde campaigns.

## Racional
- Historial de steps explícito (`campaign_steps`) evita derivaciones y preserva causalidad.
- Estado por gateway persistido (`campaign_gateways`) permite read-model sin lógica.
- Metadata de firmware en DB evita refactors futuros y enlaza con MinIO.
- Índice parcial controla exclusión operativa sin lógica adicional en código.
