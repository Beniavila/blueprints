# C4 Level 3 – Backend Components (Ender)

Este documento describe los componentes internos del Backend de Ender.  
Refina la vista de contenedores del Level 2 y muestra cómo se estructura la lógica interna del sistema.

Ender no ejecuta el OTAP en los nodos.  
El gateway es quien realiza realmente el proceso OTAP.  
Ender se encarga de **coordinar**, **secuenciar pasos**, **almacenar firmware**, **comunicarse por HTTP y MQTT con servidores externos**, **publicar trabajos** y **actualizar el estado de la campaña**.

---

## Vista principal de Componentes

```mermaid
graph TD

    %% APIs
    campaignAPI["CampaignAPI<br/>Define campañas (server + organización), recibe firmware, inicia flujos"]
    nodeAPI["NodeAPI<br/>Consulta nodos y metadatos"]
    gatewayAPI["GatewayAPI<br/>Consulta gateways disponibles en servidor externo"]
    firmwareAPI["FirmwareAPI<br/>Gestión de firmware (upload, metadata)"]

    %% Core Services
    campaignService["CampaignService<br/>Orquestación del flujo OTAP<br/>usa server_id + organización"]
    nodeService["NodeService<br/>Información de nodos (tipo, versión, metadata)"]
    firmwareService["FirmwareService<br/>Gestión de firmware<br/>metadata + URL MinIO"]
    gatewayService["GatewayService<br/>Consulta gateways vía backend externo (HTTP)"]

    %% Server Configuration
    serverRegistry["ServerRegistry<br/>Devuelve configuración del servidor elegido<br/>(HTTP base URL, MQTT broker)"]

    %% External Adapters
    remoteBackend["RemoteBackendAdapter (HTTP)<br/>Consulta gateways del servidor remoto"]
    mqttAdapter["MQTTGatewayAdapter<br/>Envia comandos OTAP por MQTT<br/>según server_id elegido"]

    %% Storage
    minio[("MinIO<br/>Almacenamiento de firmware OTAP")]
    db[("Postgres<br/>Campañas, nodos, logs, firmware")]

    %% Execution
    scheduler["Scheduler<br/>Activa campañas programadas"]
    jobProducer["JobProducer<br/>Publica jobs OTAP en NATS"]
    worker["WorkerOTAP<br/>Ejecuta pasos OTAP secuenciales<br/>usa MQTTGatewayAdapter"]

    %% NATS
    nats["NATS JetStream<br/>Jobs OTAP, reintentos, consumers"]


    %% --- Relaciones API → Services ---
    campaignAPI --> campaignService
    nodeAPI --> nodeService
    firmwareAPI --> firmwareService
    gatewayAPI --> gatewayService

    %% --- Server registry usage ---
    campaignService --> serverRegistry
    gatewayService --> serverRegistry

    %% --- Gateway discovery ---
    serverRegistry --> remoteBackend
    gatewayService --> remoteBackend

    %% --- Execution pipeline ---
    campaignService --> scheduler
    scheduler --> jobProducer
    jobProducer --> nats
    nats --> worker

    %% --- Worker interactions ---
    worker --> mqttAdapter
    worker --> firmwareService
    worker --> campaignService
    worker --> db
    worker --> minio
```

---

## Descripción de componentes

### CampaignAPI

- Punto de entrada principal para el frontend:

    - Crea campañas

    - Recibe firmware

    - Permite seleccionar servidor remoto + organización

    - Lanza campañas manuales

    - Consulta su estado


### NodeAPI

- Consulta nodos locales (solo metadatos):

    - tipo

    - versión

    - estado

    - configuración


### GatewayAPI

- Permite:

    - listar gateways de la organización en el servidor remoto seleccionado

    - consultar su estado (si el backend remoto lo ofrece)

    - Esta API NO habla con gateways directamente.


### CampaignService (núcleo del backend)

- Responsable de:

    - Secuenciar el OTAP

    - Validar respuestas del gateway

    - Gestionar timeouts y reintentos

    - Interactuar con MinIO para firmware

    - Interactuar con ServerRegistry para obtener información de servidores

    - Publicar jobs NATS

- Avanzar pasos según confirmaciones del Worker OTAP

- Es el orquestador real dentro de Ender.


### NodeService

- Consulta nodos de la base de datos

- No implementa validaciones de compatibilidad (eso lo hace el gateway)

- FirmwareService

- Guarda firmware en MinIO

- Mantiene metadatos en DB

- Expone URL segura para el gateway

- No valida compatibilidad


### ServerRegistry

- Responsable de:

    - devolver información del servidor seleccionado por el usuario

- proporcionar:

    - HTTP base URL para consultar gateways

    - MQTT broker del servidor

    - asegurar que el server_id es válido

Ejemplos:

```sginx
prod → https://prod-backend/api + mqtt.prod.server
senegal → https://senegal-backend/api + mqtt.senegal.server
```

### RemoteBackendAdapter (HTTP)

- Responsable de:

    - consultar gateways de una organización en el servidor remoto seleccionado

    - obtener información de estado si procede


### MQTTGatewayAdapter

- Publica comandos OTAP al topic adecuado del gateway

- Escucha respuestas

- Maneja timeouts y errores

- Está aislado del modelo Wirepas interno

- Se conecta al MQTT broker correspondiente a server_id

- Scheduler

- Activa campañas programadas → crea jobs OTAP.


### JobProducer

- Publica pasos OTAP en NATS JetStream. 
- Cada mensaje representa un paso de la campaña.


### WorkerOTAP

Ejecuta la secuencia:

```perl
step1 → confirmar → update state → step2 → confirmar …
```

Y además:

- descarga firmware desde MinIO

- usa MQTTGatewayAdapter

- actualiza DB

- alimenta logs y progreso


### Repositories

Repos para Campaign, Node, Gateway, Firmware, Logs.


### Flujo OTAP Simplificado

```mermaid
sequenceDiagram
    participant User
    participant CampaignAPI
    participant CampaignService
    participant ServerRegistry
    participant RemoteBackend
    participant Scheduler
    participant JobProducer
    participant NATS
    participant Worker
    participant MQTTGateway
    participant DB

    User->>CampaignAPI: Crear campaña (server + organization) + subir firmware
    CampaignAPI->>CampaignService: Registrar campaña
    CampaignService->>DB: Guardar campaña + metadata firmware

    CampaignService->>ServerRegistry: Obtener config del servidor
    ServerRegistry->>RemoteBackend: Pedir lista de gateways (HTTP)

    Scheduler->>CampaignService: Campaña programada
    CampaignService->>JobProducer: Crear Job OTAP
    JobProducer->>NATS: Publicar Job

    NATS->>Worker: Recibir Job
    Worker->>MQTTGateway: Ejecutar Paso OTAP
    MQTTGateway->>Worker: Confirmación
    Worker->>DB: Guardar estado
```

---

[Volver al README](../../README.md)
