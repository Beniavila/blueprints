# ADR-05: Serialización y cifrado de mensajes MQTT (protobuf + AES-GCM)

## 1. Contexto

Ender orquesta campañas OTAP recibiendo eventos MQTT de gateways y publicando comandos OTAP. Los mensajes deben:

- Minimizar tamaño (coste de SIM/datos en gateways).
- Ser independientes del lenguaje (gateway en Python, backend en Go).
- Proteger el contenido incluso si alguien inspecciona el broker MQTT.
- Mantener el contrato ya definido en `docs/contracts/mqtt_gateway.md`.

Opciones previas: JSON legible (simple pero grande), solo TLS en broker (protege tránsito, pero el broker ve el payload), protobuf sin cifrado (binario pero visible si se conoce el schema).

---

## 2. Decisión

- **Wire format:** 
    - Protobuf binario (EnvelopeV1 + payload OTAP) como formato único en MQTT.

- **Cifrado:** 
    - AES-GCM (128/256) sobre todo el payload protobuf antes de publicar/tras consumir. 
    - TLS en MQTT puede coexistir pero no sustituye el cifrado de payload.

- **Helpers:** 
    - `internal/util/proto` para construir/parsear envelopes; 
    - `internal/util/codec` para codificar/decodificar (Noop o AES-GCM).

- **Configuración:** 
    - clave simétrica base64 (`MQTT_PAYLOAD_KEY`) por entorno; si está vacía, no hay cifrado (solo para desarrollo/local).

---

## 3. Alternativas consideradas

### JSON + TLS únicamente
- ✔ Simplicidad y visibilidad para depurar.
- ❌ Mensajes más grandes; el broker sigue viendo todo.

### Protobuf sin cifrado
- ✔ Eficiente en tamaño, multi-lenguaje.
- ❌ Cualquiera con el `.proto` puede leer el payload capturado en el broker.

### Cifrar solo `data` y dejar metadatos en claro
- ✔ Permite routing/filtrado por `event_type`.
- ❌ Metadatos expuestos; se opta por cifrar todo el envelope para máxima privacidad (el topic ya lleva el step).

### Algoritmos alternativos (ChaCha20-Poly1305, AES-CBC)
- ❌ Sin ventaja clara en este contexto; GCM ofrece AEAD estándar y soporte nativo en Go/Python.

---

## 4. Consecuencias

### Positivas
- Mensajes más pequeños que JSON; overhead de cifrado conocido (~nonce+tag 28B sobre el protobuf).
- Payload ilegible en el broker o capturas si no se posee la clave.
- Contrato único cross-language (Go/Python) con `.proto` compartido.
- Cambio de codec o de formato encapsulado (helpers centralizados).

### Negativas
- Gestión de claves simétricas (rotación, distribución por entorno).
- Observabilidad directa en el broker limitada (se necesitan herramientas que descifren).
- Un paso extra de CPU por cifrado/descifrado (asumido aceptable).

---

## 5. Estado futuro

- Añadir soporte explícito a TLS en broker en todos los entornos (defensa en profundidad).
- Rotación de claves y `key_id` en el envelope para migraciones sin downtime.
- Posible `oneof` en EnvelopeV1 para evitar doble marshal si el contrato evoluciona.
- Herramientas de debug que descifren/decodifiquen con clave de entorno para observabilidad controlada.

---

[Volver al README](../../README.md)
