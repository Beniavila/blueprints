# C3 — Component Diagram — MQTT Gateway Manager

## Descripción

El MQTT Gateway Manager es el componente encargado de gestionar todas las conexiones MQTT hacia mini gateways y servidores MQTT externos.

Su responsabilidad principal es desacoplar completamente la capa de comunicación (I/O) del procesamiento interno del sistema, garantizando alto throughput, control de ráfagas y estabilidad.

---

## Componentes internos

### 1. Connection Manager

**Responsabilidad**
- Mantener conexiones MQTT activas por servidor (dev, beta, prod, etc.)
- Crear una goroutine independiente por conexión
- Gestionar reconexiones y lifecycle de cada conexión

**Notas**
- Una conexión por servidor MQTT
- Aislamiento total entre servidores

---

### 2. MQTT Connection (por servidor)

**Responsabilidad**
- Recibir mensajes MQTT
- Publicar mensajes MQTT
- Suscribirse a topics necesarios

**Ejecución**
- 1 goroutine por conexión

**Flujo**
- Recibe mensaje → lo delega inmediatamente

---

### 3. Ingress Adapter

**Responsabilidad**
- Adaptar mensajes MQTT entrantes a formato interno
- Normalizar estructura mínima (node_id, gateway_id, payload)

**Entrada**
- Mensajes desde MQTT Connection

**Salida**
- Mensaje interno hacia channel global

---

### 4. Global Channel (Buffer)

**Responsabilidad**
- Actuar como buffer controlado de entrada
- Absorber ráfagas de mensajes
- Aplicar backpressure

**Características**
- Channel compartido global
- Tamaño limitado (configurable)

---

### 5. Dispatcher

**Responsabilidad**
- Leer mensajes del channel global
- Determinar el `node_id`
- Enrutar el mensaje al worker correspondiente

**Notas**
- No ejecuta lógica de negocio
- Solo routing

---

### 6. Node Worker Manager

**Responsabilidad**
- Gestionar workers dinámicos por nodo
- Crear worker si no existe
- Reutilizar worker existente

**Modelo**
- map[node_id] → worker

---

### 7. Node Worker

**Responsabilidad**
- Procesar mensajes de un nodo de forma secuencial
- Mantener estado en memoria del nodo
- Ejecutar pipeline de handlers

**Flujo interno**
1. Load estado (si es nuevo)
2. Normalize mensaje
3. Dispatch a handlers
4. Ejecutar lógica de gateway

**Notas**
- 1 worker por nodo
- Orden garantizado por nodo

---

### 8. State Manager

**Responsabilidad**
- Cargar estado desde Redis al crear worker
- Sincronizar estado durante procesamiento
- Persistir cambios relevantes

**Notas**
- Estado efímero
- Redis como respaldo

---

### 9. Handler Pipeline

**Responsabilidad**
- Ejecutar lógica funcional del gateway

**Estructura**
- Pipeline fijo de handlers:
  - status
  - consumos
  - alarmas
  - otros

**Entrada**
- Evento normalizado

**Salida**
- Acciones (persistencia, publicación, backend)

---

### 10. Egress Adapter

**Responsabilidad**
- Convertir salidas del sistema a mensajes MQTT
- Determinar servidor MQTT destino
- Publicar mensajes

---

## Flujo completo

```text
MQTT Connection (goroutine por servidor)
        ↓
Ingress Adapter
        ↓
Global Channel (buffer)
        ↓
Dispatcher
        ↓
Node Worker Manager
        ↓
Node Worker (por nodo)
        ↓
State Manager + Handler Pipeline
        ↓
Egress Adapter
        ↓
MQTT Connection
```