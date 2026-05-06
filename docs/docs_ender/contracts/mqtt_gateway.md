# MQTT Gateway ↔ Ender Contract

## 1. Purpose

Este documento define el contrato de eventos MQTT mediante el cual un gateway informa a Ender del progreso y resultado de una campaña OTAP.

Ender utiliza estos eventos para orquestar campañas OTAP a nivel organización y servidor, coordinando múltiples gateways sin conocer la lógica interna del OTAP ni de Wirepas.

Este contrato permite a Ender:

- Recibir confirmaciones de finalización de pasos OTAP por gateway
- Detectar fallos y timeouts de forma determinista
- Mantener el estado global de una campaña como fuente de verdad
- Permanecer desacoplado de la implementación interna del gateway

El contrato define únicamente **qué eventos se emiten y qué significan**, no **cómo** el gateway ejecuta el OTAP.

---

## 2. Core Invariants

### 2.1 Modelo event-driven

- El gateway emite eventos.

- Ender no solicita estados ni hace polling al gateway.

### 2.2 Eventos representan hechos consumados

- Un evento indica que algo ya ocurrió.

- No existen eventos “en progreso” ni “casi terminado”.

### 2.3 Ender confía en el evento

- Ender no valida internamente el resultado del gateway.

- El evento es la fuente de verdad para el estado del paso.

### 2.4 Desacoplamiento de implementación

- El contrato no expone detalles internos (Wirepas, mesh, SDK).

- El gateway es libre de cambiar su implementación sin romper Ender.

### 2.5 Granularidad por gateway

- Los eventos informan del estado por gateway, no por nodo.

- El detalle por nodo se reporta de forma agregada o diferida.

### 2.6 Versionado explícito

- Todo evento incluye version.

- Cambios incompatibles requieren nueva versión del contrato.

### 2.7 Idempotencia

- Ender debe poder procesar eventos duplicados sin efectos colaterales.

- El gateway puede reemitir eventos en caso de duda.

---

## 3. Common Envelope

Todos los eventos emitidos por un gateway DEBEN seguir esta estructura base.

Nota sobre formato:
- El ejemplo se muestra en JSON por legibilidad humana.
- El payload MQTT real debe viajar en binario (protobuf) y opcionalmente cifrado.

```json
{
  "version": "1.0",
  "event_type": "otap.step.completed",
  "campaign_id": "OTAP-lliça-test-2026-01-01",
  "gateway_id": "gw-12345",
  "timestamp": "2026-01-01T01:23:45Z",
  "data": {}
}
```

### Campos:

- **version** (string, obligatorio)
    - Versión del contrato del evento.
    - Permite evolución del protocolo sin romper compatibilidad.

- **event_type** (string, obligatorio)
    - Tipo de evento emitido.
    - Ejemplos:

        - otap.step.completed

        - otap.step.failed

- **campaign_id** (string, obligatorio)
    - Identificador único de la campaña OTAP.

- **gateway_id** (string, obligatorio)
    - Identificador del gateway que emite el evento.

- **timestamp** (string, obligatorio, ISO 8601 UTC)
    - Momento exacto en el que ocurrió el evento en el gateway.

- **data** (object, obligatorio)
    - Payload específico del evento.
    - Su estructura depende de event_type.

### 3.1 Estados del dominio vs evento MQTT

Los eventos MQTT emitidos por los gateways representan hechos consumados, no estados intermedios.

Por este motivos, el contrato MQTT solo contempla resultados finales:

- `"success"`
- `"failed"`

Estados como `"pending"` o `"in_progress"` no se transmiten por MQTT.

Estos estados existen únicamente dentro de Ender como parte de su modelo interno de orquestación, y son gestionados por el 
`CampaignService` en función del tiempo, la secuencia de pasos t los eventos recibidos.

Esta separación garantiza:

- Un modelo event-driven limpio
- Ausencia de polling o sincronizacion implícita
- Idempotencia y simplicidad del contrato

---

## 4. Event Types

Los siguientes tipos de eventos pueden ser emitidos por un gateway hacia Ender.

- `otap.step.completed`  
  El gateway ha finalizado correctamente un paso OTAP concreto.

- `otap.step.failed`  
  El gateway ha fallado al ejecutar un paso OTAP concreto y no continuará con los siguientes pasos.

---

## 5. Event Definitions (payloads)

### 5.1 `otap.step.complete`

Evento emitido cuando un gateway finaliza correctamente un paso OTAP.

```json
{
    "step": "propagate | processing | collect",
    "duration_seconds": 600,
    "nodes_total": 120,
    "nodes_updated": 118
}
```

### Campos

- **step** (string, obligatorio)
    - Paso OTAP que ha finalizado el gateway.

- **duration_seconds** (integer, obligatorio)
    - Tiempo real empleado por el gateway para ejecutar el paso.

- **nodes_total** (integer, obligatorio)
    - Número total de nodos gestionados por el gateway durante la campaña.

- **nodes_updated** (integer, obligatorio)
    - Número de nodos que han aplicado correctamente el firmware tras el paso.

### Semántica

- El evento indica que el gateway no continuará con más trabajo para este paso.

- Ender marca el paso como completado para ese gateway.

- Ender no valida los contadores de nodos; se almacenan para observabilidad.

### 5.2 `otap.step.failed`

Evento emitido cuando un gateway no puede completar un paso OTAP.

```json
{
    "step": "propagate | processing | collect",
    "error_code": "TIMEOUT | INVALID_FIRMWARE | INTERNAL_ERROR",
    "error_message": "Descripcion del error"
}
```

### Campos

- **step** (string, obligatorio)
    - Paso OTAP en el que se produjo el fallo.

- **error_code** (integer, obligatorio)
    - TCódigo de error estable para análisis y automatización futura.

- **error_message** (integer, obligatorio)
    - Descripción legible para los logs.

### Semántica

- El gateway no ejecutará pasos posteriores para esta campaña.

- Ender marca el gateway como failed y lo excluye del resto del flujo.

- El fallo no invalida la campaña completa.

---

## 6. MQTT Topics

Este contrato define los topics MQTT utilizados para la comunicación gateway → Ender.

### 6.1 Topic de eventos OTAP

`ender/commands/otap/{step}/{gateway_id}`

- Variables

    - **`step`**  
        - Paso OTAP a ejecutar (`propagate`, `processing`, `collect`).

    - **`gateway_id`**
        - Identificador único del gateway destino.

- Publicador

    - Ender

- Suscriptor

    - Gateway

### 6.2 Topics de estado (Gateway -> Ender)

`ender/status/otap/{step}/{gateway_id}`

- Variables

    - **`step`**
        - Paso OTAP al que corresponde el evento.
        - Posibles variables:
            - `propagate`
            - `processing`
            - `collect`

    - **`gateway_id`**
        - Identificador único del gateway que emite el evento.

El resultado del paso (success, failed) y cualquier información adicional se indican siempre en el payload del evento.
