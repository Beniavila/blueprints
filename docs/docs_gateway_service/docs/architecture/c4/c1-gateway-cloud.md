# C1 — System Context — Gateway-Cloud

## Descripción

Gateway-Cloud es una capa de telecomunicaciones en la nube para instalaciones pequeñas atendidas por mini gateways.

Recibe de mini gateways la información generada por los nodos, delega el procesamiento al Logic Engine vía gRPC, y distribuye las acciones resultantes: envía datos al backend y comandos al mini gateway correspondiente a través del broker MQTT correcto.

No contiene lógica de negocio propia. Toda la lógica de handlers (clasificación, consumos, alarmas, persistencia) reside en el Logic Engine.

---

## Sistemas externos

### Backend
- Envía comandos asíncronos hacia nodos
- Recibe información procesada (eventos, estados, alarmas, consumos)

### Mini Gateway
- Envía telemetría, estados, consumos y alarmas de los nodos
- Recibe comandos para nodos
- Actúa únicamente como pasarela (sin lógica)

### Broker MQTT destino
- Recibe la información de los nodos desde Gateway-Cloud
- El destino depende del nodo (resolución `nodo → servidor MQTT`)

### Logic Engine
- Recibe mensajes vía gRPC desde Gateway-Cloud
- Aplica la lógica de negocio (handlers, consumos, alarmas, persistencia)
- Devuelve la lista de acciones a ejecutar (`SEND_TO_BACKEND`, `SEND_TO_NODE`, `IGNORE`)
- Contenedor independiente, repositorio separado
- Compartido con el gateway tradicional de calle

### Resolución de zona horaria
- Gateway-Cloud calcula la zona horaria a partir de latitud/longitud del mini gateway

---

## Responsabilidades

- Recibir y enrutar mensajes MQTT desde mini gateways y backends
- Gestionar la asociación `nodo ↔ mini gateway`
- Resolver y cachear `nodo → servidor MQTT`
- Delegar la lógica de negocio al Logic Engine vía gRPC
- Ejecutar las acciones devueltas por el Logic Engine
- Calcular zona horaria por mini gateway
- Gestionar comandos de forma asíncrona
- Soportar ráfagas de eventos
- Garantizar no pérdida ni duplicación de datos

---

## Responsabilidades excluidas

- Lógica de handlers (reside en Logic Engine)
- Cálculo de consumos (reside en Logic Engine)
- Evaluación de alarmas (reside en Logic Engine)
- Decisiones de persistencia (reside en Logic Engine)
- Clasificación por organización (lo hace el backend)
- Trazabilidad avanzada
- Almacenamiento analítico

---

## Diagrama

                    +-------------------+
                    |      Backend      |
                    | comandos / eventos|
                    +---------+---------+
                              |
                              | async commands / processed data
                              v
+----------------+   uplink   +---------------------+   routing/publish   +----------------------+
|  Mini Gateway  +----------->|    Gateway-Cloud    +-------------------->|  Broker MQTT destino |
|  puente MQTT   |            | capa telecom        |                     | por nodo/servidor    |
|  sin lógica    |<-----------+ routing / resolución|<--------------------+----------------------+
+----------------+  downlink  | sin lógica negocio  |
                              +----------+----------+
                                         |
                                         | gRPC (mensaje + event_type)
                                         v
                              +---------------------+
                              |    Logic Engine     |
                              | handlers / consumos |
                              | alarmas / persists. |
                              | (repo separado)     |
                              +---------------------+

---

## Notas

- El mini gateway no contiene lógica de negocio
- Gateway-Cloud no contiene lógica de negocio; la delega al Logic Engine
- El Logic Engine es compartido con el gateway tradicional de calle (única fuente de verdad)
- La comunicación entre Gateway-Cloud y mini gateways es asíncrona sobre MQTT
- La comunicación entre Gateway-Cloud y Logic Engine es síncrona sobre gRPC
- La partición relevante para routing es por servidor MQTT destino
- El sistema debe soportar múltiples zonas horarias simultáneamente
