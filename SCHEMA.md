# Blueprints — formato para LLM

Esta plantilla pinta un blueprint a partir de un único objeto JS llamado `BLUEPRINT` en `data.jsx`. Si le das a un LLM tu **C4** (Context, Containers, Components) y tus **ADRs**, debe devolver un objeto con esta forma exacta — sustituyendo el contenido de `data.jsx` y nada más.

## Forma del objeto

```js
const BLUEPRINT = {
  meta: {
    project: "string",         // nombre visible arriba a la izquierda
    version: "v1.2.3",
    updated: "YYYY-MM-DD",
    owner: "Equipo X",
    description: "Resumen 1–2 frases del sistema."
  },

  // ── C4 L1 — Context ────────────────────────────────────────────
  context: [
    // type: "actor" | "system" | "boundary"
    { id: "ctx.user", type: "actor",  label: "Usuarios",  sublabel: "Web · iOS",  x: 80, y: 200 },
    { id: "ctx.sys",  type: "boundary", label: "Mi Sistema", sublabel: "the system", x: 600, y: 320, w: 540, h: 280 },
    // ...
  ],
  contextEdges: [
    { from: "ctx.user", to: "ctx.sys", label: "HTTPS" }
  ],

  // ── C4 L2 — Containers (lo central) ────────────────────────────
  containers: [
    // type: service | gateway | broker | database | cache | queue
    //       | frontend | external | adr
    {
      id: "c.api", type: "service", label: "API Gateway",
      tech: "Node · Hono",
      x: 1380, y: 600,             // posición en el lienzo (px en mundo)
      adrs: ["ADR-001"]            // opcional · pinta badges
    },
    // ADR como nodo propio:
    {
      id: "adr.001", type: "adr",
      label: "ADR-001",
      title: "Texto corto de la decisión",
      status: "Accepted",          // Proposed | Accepted | Deprecated | Superseded
      date: "2025-09-12",
      x: 540, y: 600
    }
  ],

  containerEdges: [
    // arista normal:
    { from: "c.api", to: "c.db", label: "SQL", protocol: "sql" },
    // arista ADR (se pinta dashed, sin flecha):
    { from: "adr.001", to: "c.api", kind: "adr" }
  ],

  // ── C4 L3 — Components (opcional, por contenedor) ──────────────
  components: {
    "c.api": [
      { id: "cmp.auth", type: "handler", label: "AuthHandler", tech: "JWT", desc: "Valida tokens" },
      // type: handler | worker (afecta color)
    ]
  },
  componentEdges: {
    "c.api": [
      { from: "cmp.auth", to: "cmp.router" }
    ]
  },

  // ── C4 L4 — Code · superficie de API y schemas ─────────────────
  endpoints: {
    "c.api": [
      { method: "GET",  path: "/v1/things",     desc: "list" },
      { method: "POST", path: "/v1/things",     desc: "create" }
    ]
  },
  schemas: {
    "c.db": [
      { table: "things", cols: ["id", "name", "created_at"] }
    ]
  },

  // ── Flows · escenarios extremo-a-extremo (negocio o técnicos) ──
  // Cada flow es una secuencia ordenada de interacciones. Se activan
  // desde el panel "Flows" y resaltan su ruta sobre el lienzo.
  flows: [
    {
      id: "flow.telemetry",                // convención: flow.*
      name: "Sensor telemetry ingestion",  // título humano
      type: "technical",                   // technical | business
      criticality: "critical",             // critical | high | medium | low
      description: "Una frase por flow — qué hace de punta a punta.",

      // Comportamiento esperado · marca el LLM lo que sepa, deja el
      // resto fuera o como string vacío y el editor lo completa.
      sync: false,                         // true = caller espera respuesta
      idempotent: true,
      traceable: true,
      retry: "exponential",                // none | linear | exponential
      timeout: 10000,                      // ms
      expectedLatency: 800,                // ms (p95 objetivo)
      ordering: "per-device",              // strict | per-key | per-device | none

      // Pasos: cada paso es una flecha entre dos nodos del lienzo.
      // `from`/`to` deben ser ids existentes (ctx.* o c.*).
      // `protocol` afecta el color del badge; `label` lo lee el humano.
      steps: [
        { from: "ctx.field",  to: "c.broker",   protocol: "mqtt", label: "publish · QoS 1" },
        { from: "c.broker",   to: "c.ingestor", protocol: "mqtt", label: "subscribe topic/+/telemetry" },
        { from: "c.ingestor", to: "c.tsdb",     protocol: "sql",  label: "INSERT batch" },
        { from: "c.ingestor", to: "c.queue",    protocol: "nats", label: "publish event" }
      ],

      owners:  ["team.platform"],          // ids de owners (ver `owners`)
      projects: ["edge", "data"],          // ids de projects (ver `projects`)
      adrs:    ["adr.001", "adr.003"],     // decisiones que rigen el flow
      triggers: ["sensor sample published"],
      risks:   [],
      gaps:    "Lo que aún no está documentado o se desconoce."
    }
  ]
};
```

## Reglas para el LLM

1. **Usa los `id` como handles estables.** Convención: `ctx.*`, `c.*`, `adr.*`, `cmp.*`. Las aristas referencian sólo por id.
2. **Posiciónalos en columnas conceptuales.**  Ingreso a la izquierda → core en el centro → datos y frontend a la derecha. Separa filas ~180–200 px, columnas ~340 px.
3. **ADRs como nodos.** Por cada ADR:
   - añade un nodo `type: "adr"` con `label`, `title`, `status`, `date`
   - añade aristas `kind: "adr"` desde el ADR a cada contenedor o componente que toca
   - además, pon `adrs: ["ADR-XYZ"]` en los contenedores afectados (genera los badges)
4. **Mapea tecnologías a `type`** (decide el color): MQTT/Kafka/RabbitMQ → `broker` o `queue`; Redis → `cache`; Postgres/Mongo/Timescale → `database`; React/Vue → `frontend`; cualquier servicio HTTP → `service`; cualquier proxy/edge → `gateway`; SaaS de terceros → `external`.
5. **Densidad sigue al zoom**, no la fuerces:
   - L1 (Context): solo actores y la caja del sistema
   - L2 (Container): cards con tech + ADR badges
   - L3 (Component): cards lista los componentes internos del contenedor
   - L4 (Code): añade endpoints y schemas
6. **Flows = escenarios end-to-end.** Por cada caso técnico o de negocio:
   - declara un objeto en `flows` con id `flow.*`
   - los `steps` son flechas entre nodos del lienzo (`from`/`to` deben ser ids existentes — `ctx.*` para actores, `c.*` para contenedores)
   - rellena lo que sepas (criticality, sync, latency, ordering, gaps); deja vacío lo desconocido — el arquitecto lo completa luego con el editor de flows
   - usa `gaps` para anotar honestamente lo que no está documentado o lo que asumiste; eso ayuda al humano a revisar
7. **Owners y projects** son taxonomía cross-cutting. Si tu C4 menciona equipos o proyectos, decláralos en `owners: [{id, name, color}]` y `projects: [{id, label, color}]` y referéncialos por id desde flows, ADRs (`affects.projects`) y badges.

> **Nota para el humano:** los edges (`contextEdges`, `containerEdges`, `componentEdges`) también se pueden crear, editar y borrar desde la propia app — entra en *Edit mode*, pulsa "+ Connect" para dibujar una nueva conexión, o haz click sobre cualquier flecha existente para editarla o borrarla. Si el LLM se deja una conexión, no hace falta volver a llamarlo: lo arreglas con dos clicks.

## Cómo regenerar el blueprint

1. Pide al LLM: *"Lee este C4 + ADRs. Devuélveme el objeto `BLUEPRINT` siguiendo `SCHEMA.md`. Solo el objeto, válido para `data.jsx`."*
2. Pega el objeto en `data.jsx` (sustituyendo el actual).
3. Recarga la web — el lienzo se redibuja entero.
