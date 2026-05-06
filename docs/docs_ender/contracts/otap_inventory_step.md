# OTAP Inventory Step y Sequence Number

## 1. Purpose

Este documento define el step INVENTORY y el concepto de `sequence_number` en el flujo OTAP.

El step INVENTORY permite a Ender:

- Recopilar información de los nodos activos antes de iniciar el OTAP
- Determinar el `sequence_number` correcto para la campaña
- Obtener datos de observabilidad (`app_area_id`, nodos totales por gateway)

---

## 2. Flujo OTAP Completo

```
INVENTORY → PROPAGATE → PROCESSING → COLLECT → DONE
```

| Step       | Timeout                        | Descripción                                      |
|------------|--------------------------------|--------------------------------------------------|
| INVENTORY  | `inventory_timeout`            | Recopilar info de nodos y sequence numbers       |
| PROPAGATE  | `propagate_time + margin`      | Distribuir firmware a los nodos                  |
| PROCESSING | `processing_time + margin`     | Nodos procesan e instalan el firmware            |
| COLLECT    | `collect_timeout`              | Recopilar resultados finales                     |

---

## 3. Sequence Number

### 3.1 Concepto

El `sequence_number` es un identificador incremental que indica qué versión de OTAP ha recibido un nodo.

- Cada gateway reporta el `sequence_number` más alto de sus nodos en INVENTORY
- Ender calcula: `max(sequence_numbers) + 1` como el sequence de la campaña
- En PROPAGATE, Ender envía este nuevo `sequence_number`
- Solo los nodos con `sequence < nuevo_sequence` se actualizan

### 3.2 Ejemplo

```
INVENTORY responses:
  gw-1: sequence_number = 33, nodes = 18, app_area_id = 123
  gw-2: sequence_number = 34, nodes = 150, app_area_id = 456
  gw-3: sequence_number = 34, nodes = 10, app_area_id = 456

Ender calcula: max(33, 34, 34) + 1 = 35

PROPAGATE envía: sequence_number = 35
  → Nodos con seq < 35 se actualizan
  → Nodos con seq >= 35 no hacen nada
```

### 3.3 Almacenamiento

El `sequence_number` calculado se almacena en la campaña:

```go
type Campaign struct {
    // ... otros campos
    SequenceNumber int  // Calculado en INVENTORY, usado en PROPAGATE
}
```

Este valor vive durante el ciclo de vida de la campaña y se elimina junto con ella.

---

## 4. Retry OTAP

### 4.1 Condiciones para habilitar retry

El botón de "Reintentar OTAP" se habilita si:

1. **Algún gateway falló** (status = `failed`)
2. **Algún nodo no tiene el sequence correcto** (en COLLECT, `seq != campaign.SequenceNumber`)

### 4.2 Condiciones para deshabilitar retry

El retry NO está disponible si:

- Todos los gateways tienen status = `success`
- Todos los nodos reportan el `sequence_number` correcto
- La versión de firmware es la esperada

### 4.3 Comportamiento del retry

Al reintentar:

1. **NO se incrementa** el `sequence_number` (se usa el mismo, ej: 35)
2. Se modifica la fecha de scheduling
3. Los nodos que ya tienen seq=35 **no vuelven a actualizar**
4. Los nodos que quedaron en seq=34 ahora sí se actualizan

---

## 5. Contratos MQTT

### 5.1 Command: Ender → Gateway

**Topic**: `ender/command/otap/inventory/{gateway_id}`

**Payload**: `InventoryCommandPayload`

```protobuf
message InventoryCommandPayload {
  string campaign_id = 1;
}
```

### 5.2 Response: Gateway → Ender

**Topic**: `ender/status/otap/inventory/{gateway_id}`

**event_type**: `otap.inventory.completed` | `otap.inventory.failed`

#### 5.2.1 Success Payload

```protobuf
message InventoryCompletedPayload {
  string step = 1;              // siempre "inventory"
  int32 duration_seconds = 2;
  int32 nodes_total = 3;
  int32 app_area_id = 4;        // observabilidad, uso futuro
  int32 sequence_number = 5;    // max sequence de los nodos del gateway
}
```

**Ejemplo JSON** (para documentación):

```json
{
  "version": "1.0",
  "event_type": "otap.inventory.completed",
  "campaign_id": "OTAP-lliça-test-2026-01-01",
  "gateway_id": "gw-12345",
  "timestamp": "2026-01-01T01:23:45Z",
  "data": {
    "step": "inventory",
    "duration_seconds": 5,
    "nodes_total": 150,
    "app_area_id": 456,
    "sequence_number": 34
  }
}
```

#### 5.2.2 Failed Payload

```protobuf
message InventoryFailedPayload {
  string step = 1;              // siempre "inventory"
  string error_code = 2;        // "TIMEOUT" | "INTERNAL_ERROR" | ...
  string error_message = 3;
}
```

---

## 6. COLLECT con Sequence Number

En el step COLLECT, el gateway también reporta el `sequence_number` de cada nodo para verificar la actualización.

### 6.1 Payload actualizado

```protobuf
message CollectCompletedPayload {
  string step = 1;
  int32 duration_seconds = 2;
  int32 nodes_total = 3;
  int32 nodes_updated = 4;
  repeated NodeInfo nodes_updated_list = 5;
  repeated NodeInfo nodes_not_updated_list = 6;
  int32 sequence_number = 7;    // sequence usado en esta campaña
}

message NodeInfo {
  string node_id = 1;
  int32 version = 2;
  int32 sequence_number = 3;    // sequence actual del nodo
}
```

### 6.2 Verificación en UI

El frontend muestra en el History tab del COLLECT:

- `sequence_number` de la campaña
- Lista de nodos actualizados (con su seq)
- Lista de nodos NO actualizados (con su seq)

Esto permite identificar fácilmente qué nodos no recibieron la actualización.

---

## 7. PROPAGATE con Sequence Number

El command de PROPAGATE incluye el `sequence_number` calculado.

### 7.1 Payload actualizado

```protobuf
message PropagateCommandPayload {
  string campaign_id = 1;
  string firmware_url = 2;
  int32 propagate_time = 3;
  int32 sequence_number = 4;    // nuevo: seq calculado en INVENTORY
}
```

---

## 8. Configuración

Nuevos campos de configuración para INVENTORY:

| Campo              | Tipo    | Default | Descripción                           |
|--------------------|---------|---------|---------------------------------------|
| `inventory_timeout`| int     | 30      | Timeout en segundos para INVENTORY    |

**Nota**: INVENTORY no tiene margin adicional ya que es un paso de lectura rápida.

---

## 9. Estimación de Tiempo

La estimación de tiempo total de campaña se calcula como:

```
total = inventory_timeout
      + (propagate_time + margin)
      + (processing_time + margin)
      + collect_timeout
```

---

## 10. Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                         INVENTORY                                │
├─────────────────────────────────────────────────────────────────┤
│  Ender                              Gateway                      │
│    │                                   │                         │
│    ├──── InventoryCommand ────────────►│                         │
│    │     {campaign_id}                 │                         │
│    │                                   │                         │
│    │                            [Query nodes]                    │
│    │                                   │                         │
│    │◄─── InventoryCompleted ──────────┤                         │
│    │     {nodes_total, app_area_id,   │                         │
│    │      sequence_number}            │                         │
│    │                                   │                         │
│  [Collect all gateway responses]       │                         │
│  [Calculate: max(seq) + 1]             │                         │
│  [Store in campaign.SequenceNumber]    │                         │
│    │                                   │                         │
│    ▼                                   │                         │
│  PROPAGATE (with sequence_number)      │                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Cambios Requeridos

### 11.1 Domain

- Añadir `StepInventory` a `OTAPStepType`
- Añadir `SequenceNumber int` a `Campaign`
- Añadir `InventoryTimeout int` a `Campaign`

### 11.2 Proto

- Añadir `InventoryCommandPayload`
- Añadir `InventoryCompletedPayload`
- Actualizar `PropagateCommandPayload` con `sequence_number`
- Actualizar `CollectCompletedPayload` con `sequence_number`
- Actualizar `NodeInfo` con `sequence_number`

### 11.3 Worker

- Procesar step INVENTORY
- Calcular max sequence y guardar en campaña

### 11.4 Frontend

- Mostrar INVENTORY en History
- Mostrar sequence_number en COLLECT results
- Lógica de botón "Reintentar OTAP"

---

[Volver al README](../../README.md)
