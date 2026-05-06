## C4 Level 2 – Containers (Ender + NATS JetStream)

Este nivel describe cómo se divide Ender internamente y cómo se comunica con los sistemas externos.

Incluye:

- Frontend React

- API (Go)

- Service Layer / Backend Core

- Scheduler

- Worker OTAP

- Postgres

- NATS JetStream

- MinIO

- Gateways Wirepas

- Nodos/luminarias

---

```mermaid
graph TD

    %% FRONTEND
    fe["Frontend React<br/>UI de configuración y monitorización"]

    %% API
    api["API Go<br/>REST/HTTP<br/>Autorización, validación, creación de campañas"]

    %% BACKEND CORE
    core["Backend Core Go<br/>Lógica de campañas, nodos, gateways, estados, validaciones"]

    %% SCHEDULER
    scheduler["Scheduler Go<br/>Activa campañas programadas y crea jobs en NATS"]

    %% WORKER OTAP
    worker["Worker OTAP Go<br/>Ejecuta fases del OTAP, interactúa con gateways, pubblica logs y eventos"]

    %% NATS JETSTREAM
    nats["NATS JetStream<br/>Cola/Stream de trabajos OTAP Persistencia de mensajes, reintentos, consumidores"]

    %% MINIO
    minio[("MinIO<br/>Almacenamiento de firmware OTAP")]

    %% DB
    db[("Postgres<br/>Persistencia de campañas, estados, nodos, logs")]

    %% SISTEMAS EXTERNOS
    gw["Gateways Wirepas<br/>SDK OTAP / API local"]
    nodes["Nodos<br/>Red Mesh Wirepas"]

    %% RELACIONES
    fe -->|HTTP/JSON| api
    api --> core
    core --> db
    core --> minio

    %% Scheduler detecta campañas pendientes
    core --> scheduler
    scheduler -->|Crea Job OTAP| nats

    %% Worker consume job
    nats -->|Entrega Job| worker
    worker -->|Actualiza estado/logs| core
    worker -->|Escribe| db
    worker -->|Carga firmware desde MinIO| minio

    %% Flujo OTAP
    worker -->|Comandos OTAP| gw
    gw -->|Actualiza dispositivos| nodes
```

---

[Volver al README](../../README.md)