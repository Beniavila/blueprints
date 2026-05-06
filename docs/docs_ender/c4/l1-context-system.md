## Descripción del sistema

Ender es un orquestador de campañas OTAP para redes Wirepas.
Permite a operadores planificar y supervisar actualizaciones de nodos/luminarias a través de gateways.
El sistema contiene un Frontend (React) y un Backend (Go), que gestionan campañas, nodos, gateways y organizaciones.
Ender se comunica con los gateways mediante las librerías OTAP proporcionadas por Wirepas y almacena el estado en Postgres.

## Actores externos

Operador / Técnico: usa la UI para planificar campañas y revisar estados.

Gateways Wirepas: reciben órdenes OTAP y reportan estados.

Nodos / Luminarias: dispositivos finales que reciben la actualización mediante la red mesh.

---

## Diagrama C4 Level 1

```mermaid
graph TD

    %% Personas
    user["Operador / Tecnico / Usuario"]

    %% Sistema principal dividido
    subgraph Ender - OTAP Orchestrator System
        fe["Frontend React<br/>Interfaz de usuario"]
        api["API Go<br/>Endpoints y validacion"]
        be["Backend Core Go<br/>Logica OTAP y gestion"]
        db[("Postgres<br/>Persistencia")]
    end

    %% Sistemas externos
    gw["Gateways"]
    nodes["Nodos"]

    %% Flujo principal
    user -->|Usa interfaz web| fe
    fe -->|HTTP JSON| api
    api -->|Invoca logica OTAP| be
    be -->|Lectura / Escritura| db
    be -->|Ordena OTAP y consulta estados| gw
    gw -->|OTAP| nodes

```

---

[Volver al README](../../README.md)