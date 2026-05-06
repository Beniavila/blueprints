# C4 Nivel 3: Diagrama de Componentes/Clases y Flujos Clave

## Descripción general
Este nivel detalla las clases, structs y flujos principales dentro de Hermes, mostrando cómo interactúan los distintos handlers, workers, stores y el router para procesar eventos de alarmas, movimientos y estrategias.

## Clases y structs principales

### Router
- `Router`: Encaminador de mensajes MQTT. Mantiene un registro de handlers por topic y gestiona la concurrencia mediante un pool de workers.

### Handlers
- `AlarmSetHandler`, `AlarmCompletedHandler`: Procesan la creación y confirmación de alarmas.
- `MovementAssignmentHandler`, `MovementCompletedHandler`: Procesan asignaciones y confirmaciones de movimiento.
- `StrategySetHandler`, `StrategyCompletedHandler`: Procesan la creación y confirmación de estrategias.
- Todos implementan la interfaz `Handler` con el método `Handle(topic, payload)`.

### Workers
- `AlarmRetryWorker`: Reintenta alarmas pendientes periódicamente.
- `MovementRetryWorker`: Reintenta asignaciones de movimiento pendientes y maneja fallos.
- `StrategyRetryWorker`: Reintenta estrategias pendientes y elimina las expiradas.

### Stores (In-Memory)
- `MemoryAlarmStore`: Guarda alarmas pendientes.
- `MemoryMovementStore`: Guarda asignaciones de movimiento pendientes.
- `MemoryStrategyStore`: Guarda estrategias pendientes.

### Modelos
- `Alarm`, `Assignment`, `Strategy`: Representan los datos de cada dominio, con campos como `NodeID`, `Payload`, `Status`, `RetryCount`, `LastAttempt`, etc.

### MQTT Client
- `Client`: Abstracción sobre el cliente MQTT Paho, maneja conexión, reconexión, publicación y suscripción.

### Métricas
- Expuestas mediante Prometheus, incluyendo tiempos de confirmación y estado de gateway.

## Flujos clave

### 1. Procesamiento de mensajes entrantes
- El cliente MQTT recibe un mensaje y lo pasa al `Router`.
- El `Router` busca los handlers registrados para el topic y ejecuta su método `Handle`.
- El handler procesa el mensaje, actualiza el store correspondiente y notifica al worker si es necesario.

### 2. Reintentos y limpieza
- Los workers periódicamente revisan los stores en memoria.
- Si hay elementos pendientes, intentan reenviarlos o los eliminan si expiran.
- Los handlers de confirmación eliminan los elementos confirmados del store.

### 3. Métricas
- Los tiempos de confirmación y otros KPIs se exponen vía HTTP para Prometheus.

## Diagrama (texto)

```
+-------------------+
|     Router        |
+-------------------+
          |
          v
+-------------------+
|     Handler       |<-------------------+
+-------------------+                    |
   |         |         |                  |
   v         v         v                  |
Alarm   Movement   Strategy               |
Handlers Handlers  Handlers               |
   |         |         |                  |
   v         v         v                  |
+-------------------+      +-------------------+
|     Worker        |<---->|     Store         |
+-------------------+      +-------------------+
          |
          v
+-------------------+
|     MQTT Client   |
+-------------------+
          |
          v
+-------------------+
|     Métricas      |
+-------------------+
```

## Notas
- El diseño es extensible: nuevos tipos de handlers o stores pueden añadirse fácilmente.
- El uso de interfaces y workers permite desacoplar el procesamiento y la persistencia.
- El sistema es concurrente y orientado a eventos.
