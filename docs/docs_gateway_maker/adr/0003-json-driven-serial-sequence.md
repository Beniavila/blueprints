# ADR-0003 - Secuencia serie declarativa en JSON

- Estado: Aceptado
- Fecha: 2026-04-30

## Contexto

El flujo de inicialización del gateway depende de prompts, timeouts, comandos y variantes por destino. Codificar cada variante directamente en Python volvería costoso ajustar shells, prompts o comandos `curl` con el tiempo.

## Decisión

Se decide modelar la secuencia principal como configuración declarativa en `serial_sequence.json`, incluyendo:

- `baudrate` y `read_timeout`;
- `shell_prompt`;
- lista ordenada de `steps` con `expect`, `send`, `timeout`, `expect_after`, `timeout_after` y `post_delay`;
- `curl_templates` por destino.

## Consecuencias

### Positivas

- Ajustes operativos rápidos sin recompilar toda la aplicación.
- Menor fricción para soportar destinos o clusters distintos.
- El código de ejecución (`SerialSequenceRunner`) permanece relativamente genérico.
- Facilita inspección y soporte en campo.

### Negativas

- La configuración sigue siendo poderosa y puede romper el flujo si se edita mal.
- No existe todavía un esquema formal o validación exhaustiva del JSON.
- Parte del conocimiento de negocio queda repartido entre código y configuración.

## Alternativas consideradas

- Hardcodear todo el flujo en Python: más simple al principio, peor para mantenimiento.
- Usar una DSL más compleja: demasiado sofisticado para el tamaño actual del sistema.

## Seguimiento recomendado

Añadir validación de esquema y ejemplos versionados de configuración.
