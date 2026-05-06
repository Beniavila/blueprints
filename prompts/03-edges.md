# Paso 3 · C4 L2 — ContainerEdges (las conexiones)

> Si prefieres declarar las conexiones a mano en la app, puedes saltarte este paso: en *Edit mode* tienes "+ Connect" para crear edges y click sobre cualquier flecha para editarla o borrarla. Este prompt es útil cuando ya tienes la documentación escrita y quieres un primer pase.

## Contexto previo

Pega el `BLUEPRINT` actual (con `meta`, `context`, `containers` ya validados):

```js
const BLUEPRINT = { /* meta, owners, projects, context, contextEdges, containers */ };
```

## Tu tarea

Devuelve **solo** `containerEdges`: la lista de conexiones entre containers, y entre actores externos (`ctx.*`) y containers.

## Forma exacta del output

```js
containerEdges: [
  // Conexión normal (flecha sólida con label):
  { from: "c.api", to: "c.db", label: "SQL", protocol: "sql" },

  // Actor externo → container:
  { from: "ctx.user", to: "c.web", label: "HTTPS" },

  // Container → SaaS externo:
  { from: "c.api", to: "c.stripe", label: "REST", protocol: "https" }
]
```

`protocol` afecta el color del badge. Valores típicos: `http`, `https`, `mqtt`, `grpc`, `nats`, `sql`, `kafka`, `amqp`, `ws`, `webhook`, `sftp`, `tcp`, `udp`.

## Reglas

1. **Solo declara conexiones que aparezcan en la documentación.** Una flecha es una afirmación: "estos dos componentes hablan entre sí". Si no lo viste escrito, no lo dibujes.
2. **Direccionalidad importa**: `from` es quien inicia la llamada. Una API que lee Postgres es `c.api → c.db`, no al revés.
3. **No dupliques**: si A llama a B con dos protocolos distintos en momentos distintos, declara dos edges separados con labels claros (`"sync read"`, `"async event"`).
4. **No incluyas edges de tipo ADR** — eso es paso 5.
5. **No declares pasos de un flow como edges** — los flows se declaran aparte (paso 6) y comparten estructura pero tienen vida propia.

## Si te falta información

**Este es el paso donde más fácilmente un LLM inventa.** Antes de devolver nada, lista todas las conexiones que has inferido **pero no estaban explícitas** en la doc, y pregúntame por ellas:

> En la doc no encontré explícitamente cómo se conectan estos pares, pero parecía implícito:
> - `c.api` → `c.cache`: ¿el API lee de Redis o no usa cache?
> - `c.worker` → `c.queue`: ¿el worker consume de NATS o de Kafka?
>
> ¿Confirmas, descarto, o tengo que mirar otro documento?

Cuando confirme, devuelve el JSON solo con las edges confirmadas.
