# Paso 2 · C4 L2 — Containers (solo nodos)

## Contexto previo

Pega aquí el `BLUEPRINT` actual (lo que ya validamos en el paso 1) para que el LLM no se contradiga:

```js
// === BLUEPRINT actual ===
const BLUEPRINT = { /* meta, owners, projects, context, contextEdges */ };
```

## Tu tarea

Devuelve **solo** el campo `containers`. **No** generes `containerEdges` aún — eso es el paso 3.

## Forma exacta del output

```js
containers: [
  {
    id: "c.api",                      // convención: c.*
    type: "service",                  // ver tabla de tipos abajo
    label: "API Gateway",             // nombre humano corto
    tech: "Node · Hono",              // stack principal en una línea
    project: "backend",               // id de un project declarado en paso 1
    x: 1380, y: 600                   // posición en el lienzo
  }
]
```

## Tabla de `type` (decide el color del nodo)

| type        | Cuándo usarlo                                              |
|-------------|------------------------------------------------------------|
| `service`   | Cualquier servicio HTTP/gRPC propio                        |
| `gateway`   | Reverse proxy, edge, API gateway, ingress                  |
| `broker`    | MQTT, Kafka, RabbitMQ (mensajería pub/sub)                 |
| `queue`     | NATS, Redis Streams, SQS (colas de eventos)                |
| `database`  | Postgres, Mongo, Timescale, MySQL                          |
| `cache`     | Redis usado como cache, Memcached                          |
| `frontend`  | SPA web, app móvil, embedded UI                            |
| `external`  | SaaS de terceros (Stripe, PagerDuty, SendGrid…)            |

## Reglas

1. **Un container = una unidad desplegable**. Si dos servicios viven en el mismo proceso, son un solo container.
2. **Posición en columnas conceptuales**: ingreso izquierda → core centro → datos derecha → frontend arriba/al lado. Separa columnas ~340 px y filas ~180 px.
3. **`project`** debe ser un id de los declarados en `projects` (paso 1). Si dudas, pregunta — no asumas.
4. **`tech`** una línea, separa con ` · `. Ej: `"Go · Gin"`, `"Postgres 15 · Timescale"`. No metas versiones a no ser que sean relevantes.
5. **No incluyas ADRs todavía** (eso es el paso 5). Tampoco `adrs: []` en cada container — se añadirá en el paso 5.

## Si te falta información

Antes de devolver el JSON, pregunta:

> Para terminar el paso 2 necesito saber:
> - ¿Hay servicios mencionados en la doc que aún no he listado?
> - ¿Qué stack usa exactamente el container X? (la doc dice "backend" sin más)
> - ¿El componente Y vive en su propio proceso o está embebido en otro?

No inventes containers que no aparezcan claramente en la documentación.
