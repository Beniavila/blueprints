# C4 Nivel 2: Diagrama de Contenedores/Componentes

## Descripción general
Hermes está compuesto por varios componentes internos que colaboran para procesar mensajes MQTT relacionados con alarmas, movimientos y estrategias. El sistema es concurrente, orientado a eventos y utiliza almacenamiento en memoria para la gestión de estados temporales.

## Componentes principales

- **main.go (Entrypoint):** Inicializa la configuración, el cliente MQTT, el router y los stores en memoria. Registra los handlers y workers.
- **Config:** Carga y gestiona la configuración desde YAML y variables de entorno.
- **Logger:** Proporciona logging estructurado y coloreado.
- **MQTT Client:** Abstracción sobre el cliente Paho MQTT, maneja la conexión, reconexión y suscripciones.
- **Router:** Encaminador de mensajes MQTT a los handlers correspondientes, con control de concurrencia (pool de workers).
- **Handlers:** Procesan mensajes según el tipo (alarms, movement, strategies), dividiéndose en handlers de registro y de confirmación.
- **Workers:** Ejecutan ciclos de reintentos para alarmas, movimientos y estrategias pendientes.
- **Storage (In-Memory):** Almacena temporalmente alarmas, asignaciones de movimiento y estrategias pendientes.
- **Metrics:** Expone métricas Prometheus sobre el estado y rendimiento del sistema.
- **Utils:** Funciones utilitarias para extracción de IDs y manipulación de datos.

## Relaciones y flujo

1. **Recepción de mensaje MQTT:**
   - El cliente MQTT recibe un mensaje y lo pasa al Router.
2. **Enrutamiento:**
   - El Router identifica el/los handler(s) registrados para el topic y ejecuta su método `Handle`.
3. **Procesamiento:**
   - Los Handlers procesan el mensaje, actualizan el store en memoria y notifican a los workers si es necesario.
4. **Workers:**
   - Los Workers periódicamente revisan el store y reintentan operaciones pendientes (reenviar, limpiar, etc.).
5. **Confirmaciones:**
   - Handlers de confirmación eliminan del store los elementos confirmados.
6. **Métricas:**
   - El componente Metrics expone información relevante vía HTTP para Prometheus.

## Diagrama (texto)

```
+-------------------+
|    main.go        |
+-------------------+
          |
          v
+-------------------+      +-------------------+
|     Config        |<---->|      Logger       |
+-------------------+      +-------------------+
          |
          v
+-------------------+
|   MQTT Client     |<-------------------+
+-------------------+                    |
          |                              |
          v                              |
+-------------------+                    |
|     Router        |--------------------+
+-------------------+
          |
          v
+-------------------+
|    Handlers       |<-------------------+
+-------------------+                    |
          |                              |
          v                              |
+-------------------+      +-------------------+
|    Workers        |<---->|    Storage        |
+-------------------+      +-------------------+
          |
          v
+-------------------+
|     Metrics       |
+-------------------+
```

## Notas
- Todos los stores son en memoria (no persistentes).
- El sistema es altamente concurrente y desacoplado por eventos.
- El Router permite registrar múltiples handlers por topic.
- Los Workers y Handlers colaboran para garantizar la fiabilidad de los procesos.
