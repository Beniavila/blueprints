# Blueprints — formato de data.jsx para LLM

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

  // ── Owners · equipos responsables ─────────────────────────────────
  owners: [
    { id: "team.platform", name: "Platform", color: "#6fb1ff" }
  ],

  // ── Projects · agrupación visual de containers ────────────────────
  projects: [
    { id: "edge", label: "Edge", color: "#ffb86b", description: "Frase corta opcional." }
  ],

  // ── C4 L1 — Context ────────────────────────────────────────────────
  context: [
    // type: "actor" | "system" | "boundary"
    { id: "ctx.user",   type: "actor",    label: "Usuarios",    sublabel: "Web · iOS",         x: 80,  y: 200 },
    { id: "ctx.sys",    type: "boundary", label: "Mi Sistema",  sublabel: "the system",         x: 600, y: 320, w: 540, h: 280 },
    { id: "ctx.legacy", type: "system",   label: "ERP",         sublabel: "sistema externo",    x: 80,  y: 400 },
  ],
  contextEdges: [
    { from: "ctx.user", to: "ctx.sys", label: "HTTPS" }
  ],

  // ── C4 L2 — Containers (el grueso del blueprint) ───────────────────
  // type: service | gateway | broker | database | cache | queue | frontend | external
  containers: [
    {
      id: "c.api", type: "service", label: "API Gateway",
      tech: "Node · Hono",
      project: "edge",           // id de un project (agrupa en franja visual)
      owner: "team.platform",    // id de un owner (muestra badge)
      x: 1380, y: 600,
      adrs: ["adr.001"]          // ids de ADRs que afectan a este container
    },
  ],

  containerEdges: [
    { from: "c.api", to: "c.db", label: "SQL", protocol: "sql" },
    // protocol afecta al badge de color en los flows: http | https | mqtt | grpc |
    // nats | sql | kafka | amqp | ws | webhook | sftp | tcp | udp | rest
  ],

  // ── C4 L3 — Components (opcional, por container) ───────────────────
  components: {
    "c.api": [
      // type: "handler" | "worker"
      { id: "cmp.auth", type: "handler", label: "AuthHandler", tech: "JWT", desc: "Valida tokens" },
    ]
  },
  componentEdges: {
    "c.api": [
      { from: "cmp.auth", to: "cmp.router" }
    ]
  },

  // ── C4 L4 — Code · superficie de API y schemas ─────────────────────
  endpoints: {
    "c.api": [
      { method: "GET",  path: "/v1/things", desc: "list" },
      { method: "POST", path: "/v1/things", desc: "create" }
    ]
  },
  schemas: {
    "c.db": [
      { table: "things", cols: ["id", "name", "created_at"] }
    ]
  },

  // ── ADRs · decisiones arquitectónicas ─────────────────────────────
  // Los ADRs NO son nodos del canvas. Viven en este array y se muestran
  // como badges dentro de cada card afectada (campo `adrs` del container).
  adrs: [
    {
      id: "adr.001",                             // convención: adr.*
      label: "ADR-001",                          // visible en badges y panel
      title: "MQTT como protocolo de ingesta",   // título corto
      status: "accepted",                        // proposed | accepted | obsolete | superseded
      date: "2025-09-12",
      owner: "team.platform",                    // id de un owner

      context:      "Por qué hubo que decidir esto.",
      decision:     "Qué se decidió. Específico.",
      consequences: "Qué implica: técnico, operacional, coste.",

      alternatives: ["Kafka directo desde devices", "AMQP via RabbitMQ"],
      tradeoffs:    "Qué se pierde y cómo se mitiga.",

      affects: {
        projects:   ["edge", "backend"],
        containers: ["c.gateway", "c.ingestor", "c.broker"],
        flows:      ["flow.telemetry"]        // se rellena cuando los flows ya existen
      },

      relatedAdrs:  ["adr.004"],
      supersededBy: null                      // o "adr.007" si fue reemplazado
    }
  ],

  // adrCatalog es un formato alternativo simplificado (solo metadatos).
  // Útil cuando solo necesitas que aparezcan los badges sin el cuerpo completo.
  // Si usas el array `adrs` completo, adrCatalog es innecesario.
  //
  // adrCatalog: {
  //   "ADR-007": { label: "ADR-007", title: "...", status: "accepted", date: "2026-01-15" }
  // },

  // ── Flows · escenarios extremo-a-extremo ───────────────────────────
  // Cada flow es una secuencia ordenada de interacciones. Se activan desde
  // el panel "Flows" y resaltan su ruta sobre el lienzo.
  flows: [
    {
      id: "flow.telemetry",                 // convención: flow.*
      name: "Sensor telemetry ingestion",   // título humano
      type: "technical",                    // technical | business
      criticality: "critical",              // critical | high | medium | low → color del overlay
      description: "Una frase — qué pasa de punta a punta.",

      // Comportamiento esperado. Marca lo que sepas; deja en blanco lo desconocido.
      sync: false,                          // true = caller espera respuesta (flecha sólida)
                                            // false = async (flecha punteada animada)
      idempotent: true,
      traceable: true,
      retry: "exponential",                 // none | linear | exponential
      timeout: 10000,                       // ms
      expectedLatency: 800,                 // ms (p95 objetivo)
      ordering: "per-device",               // strict | per-key | per-device | none

      // Pasos: flechas numeradas entre nodos del lienzo.
      // `from`/`to` deben ser ids existentes en `context` (ctx.*) o `containers` (c.*).
      steps: [
        { from: "ctx.field",  to: "c.broker",   protocol: "mqtt", label: "publish · QoS 1" },
        { from: "c.broker",   to: "c.ingestor", protocol: "mqtt", label: "subscribe topic/+/telemetry" },
        { from: "c.ingestor", to: "c.tsdb",     protocol: "sql",  label: "INSERT batch" },
        { from: "c.ingestor", to: "c.queue",    protocol: "nats", label: "publish event" }
      ],

      owners:   ["team.platform"],
      projects: ["edge", "data"],
      adrs:     ["adr.001", "adr.003"],

      triggers: ["sensor sample published"],
      risks:    [],
      gaps:     "Lo que no está documentado o tuviste que asumir."
    }
  ]
};

window.BLUEPRINT = BLUEPRINT;
```

## Reglas para el LLM

1. **Usa los `id` como handles estables.** Convenciones: `ctx.*` para contexto, `c.*` para containers, `cmp.*` para components, `adr.*` para ADRs, `flow.*` para flows. En blueprints multi-proyecto prefija con el proyecto: `hanso.ctx.*`, `mg.c.*`.

2. **Posiciona en columnas conceptuales.** Ingreso a la izquierda → core en el centro → datos y frontend a la derecha. Filas ~180–200 px, columnas ~340 px.

3. **ADRs inline, nunca como nodos.** Por cada ADR:
   - añade una entrada en `adrs[]` con `id`, `label`, `title`, `status`, `date`, y cuerpo
   - añade `adrs: ["adr.NNN"]` en cada container afectado (pinta los badges)
   - **no** crees containers de `type: "adr"` ni edges de `kind: "adr"` — el código los ignora

4. **Mapea tecnologías a `type`** (decide el color de la card):
   - MQTT/Kafka/RabbitMQ → `broker`
   - Redis/Memcached → `cache`
   - NATS/SQS → `queue`
   - Postgres/Mongo/Timescale/MySQL → `database`
   - React/Vue/Angular/mobile → `frontend`
   - Servicios HTTP propios → `service`
   - Reverse proxy/edge → `gateway`
   - SaaS/ERP/terceros → `external`

5. **Densidad sigue al nivel C4:**
   - L1 (context): solo actores y boundaries
   - L2 (container): cards con tech + ADR badges + owner badge
   - L3 (component): rellena `components[idContainer]` con handlers/workers
   - L4 (code): rellena `endpoints[idContainer]` y `schemas[idDb]`

6. **Flows = escenarios end-to-end.** Por cada caso técnico o de negocio relevante:
   - declara un objeto en `flows` con id `flow.*`
   - los `steps` son flechas entre nodos (`from`/`to` deben ser ids existentes — `ctx.*` para actores/externos, `c.*` para containers)
   - rellena lo que sepas (`criticality`, `sync`, `latency`, `ordering`); deja vacío lo desconocido
   - usa `gaps` para anotar honestamente lo que asumiste o no está documentado
   - 4–8 flows críticos son suficientes; no documentes todos los caminos

7. **Owners y projects son taxonomía cross-cutting.** Decláralos en `owners[]` y `projects[]` y referéncialos por id desde containers, flows y ADRs.

> **Nota:** las edges (`contextEdges`, `containerEdges`, `componentEdges`) también se pueden crear, editar y borrar desde la propia app — entra en *Edit mode*, pulsa "+ Connect" para dibujar una nueva conexión, o haz click sobre cualquier flecha existente para editarla o borrarla.

## Cómo regenerar el blueprint

1. Pide al LLM: *"Lee este C4 + ADRs. Devuélveme el objeto `BLUEPRINT` siguiendo `SCHEMA.md`. Solo el objeto, válido para `data.jsx`."*
2. Pega el objeto en `data.jsx` (sustituyendo el actual).
3. Recarga `Blueprints.html` — el lienzo se redibuja entero.
