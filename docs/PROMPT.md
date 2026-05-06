# Tarea

Eres un asistente que **añade un proyecto** a un blueprint C4 existente que
representa un ecosistema multi-proyecto.

Voy a darte:
1. El contenido actual de `data.jsx` (ya tiene 1+ proyectos pintados)
2. Documentación del nuevo proyecto a integrar:
   - C4 Model (Context, Containers, Components)
   - ADRs (Architecture Decision Records)
   - Contracts
   - Notas / contexto del stack
3. Cómo se conecta con los proyectos ya existentes

Tu trabajo: producir el **`data.jsx` completo fusionado** que mantenga todo
lo previo y añada el proyecto nuevo correctamente integrado.

## Reglas estrictas

1. **Devuelve solo el código de `data.jsx` completo**. Sin explicaciones, sin
   markdown fences. Empieza por `const BLUEPRINT` y termina con
   `window.BLUEPRINT = BLUEPRINT;`.

2. **No toques los nodos existentes**. No renombres ids, no muevas posiciones
   ya colocadas, no cambies textos. Solo añades cosas nuevas, y como mucho
   añades aristas desde/hacia containers existentes para reflejar las
   conexiones cross-project.

3. **Prefijo de proyecto en los IDs**:
   - Cada proyecto usa su propio prefijo corto: `front.*`, `back.*`, `gw.*`,
     `nodes.*`, `mon.*`, etc.
   - Mantén el prefijo del proyecto que estás añadiendo en TODOS sus nodos.

4. **Layout en franjas horizontales por proyecto**:
   - Cada proyecto vive en una franja de ~1800px de ancho
   - Frontend / clientes: x ≈ 0–1800
   - Backend / BFF / microservicios: x ≈ 1800–3600
   - Gateways / hardware / nodos: x ≈ 3600–5400
   - Servicios de monitorización / observability: x ≈ 5400–7200
   - Mira las x usadas en el `data.jsx` actual y elige una franja libre
   - Dentro de la franja, columnas conceptuales (cliente → servicio → datos)
   - Filas separadas ~180–200 px en `y`

5. **Boundary por proyecto en `context`**:
   - Añade un nodo `type: "boundary"` que envuelva los containers del nuevo
     proyecto, con `label` = nombre del proyecto, `sublabel` = descripción
     corta, y `w`/`h` que cubran su franja
   - Añade actores externos del proyecto si los hay (usuarios, dispositivos)
   - Añade aristas en `contextEdges` entre boundaries cuando los proyectos
     se comunican entre sí

6. **Mapeo tecnología → `type`** (color en el canvas):
   - MQTT, Kafka, RabbitMQ → `broker`
   - NATS, SQS, EventBridge → `queue`
   - Redis, Memcached → `cache`
   - Postgres, Mongo, Timescale, MySQL → `database`
   - React, Vue, Angular, mobile apps → `frontend`
   - Servicios HTTP propios → `service`
   - Reverse proxies, edge gateways → `gateway`
   - SaaS, ERPs, third-party APIs → `external`
   - Workers, cron jobs → componente `worker`
   - Handlers, controllers, routers → componente `handler`

7. **ADRs inline (NO como nodos sueltos)**:
   - **Nunca** crees nodos `type: "adr"` ni aristas `kind: "adr"`.
   - En cada container afectado, añade `adrs: ["ADR-NNN", ...]`.
   - El detalle del ADR se renderiza dentro de la card automáticamente
     desde el array opcional `adrCatalog`. Si quieres que aparezca el título
     completo y el estado al hacer zoom, añade entradas a `adrCatalog`:
     ```js
     adrCatalog: {
       "ADR-007": { label: "ADR-007", title: "...", status: "Accepted", date: "2026-01-15" }
     }
     ```

8. **Interconexiones cross-project (lo más valioso)**:
   - Si el proyecto nuevo se comunica con otro ya existente, añade aristas
     en `containerEdges` con el id del container existente sin tocarlo.
   - Ejemplo: `{ from: "front.spa", to: "back.bff", label: "HTTPS · WSS", protocol: "http" }`
   - Estas aristas son las que el arquitecto quiere ver al alejar el zoom.

9. **Densidad por nivel C4**:
   - L1 (context): solo actores y boundaries
   - L2 (container): cards con tech + ADR badges
   - L3 (component): rellena `components[idContainer]` con handlers/workers
   - L4 (code): rellena `endpoints[idContainer]` y `schemas[idDb]`

10. **Sin inventar**: si la documentación no menciona algo, no lo añadas.

## Documentación del nuevo proyecto

### Cómo se llama
... (nombre + prefijo elegido, ej. "Monitorización — prefijo `mon.*`")

### C4 Model
... (pega el c4.md o describe el sistema en prosa)

### ADRs
... (cada ADR con número, título, estado, fecha y resumen)

### Conexiones con proyectos existentes
... (lista explícita: "front.spa llama a back.api", "mon.collector recibe
métricas de gw.service vía NATS", etc.)

### Notas
... (stack, equipo, restricciones)

## `data.jsx` actual

```js
<<< Pega aquí el contenido completo del data.jsx que ya tienes >>>
```

## Recordatorio del esquema

```js
const BLUEPRINT = {
  meta: { project, version, updated, owner, description },
  context: [ { id, type: "actor"|"system"|"boundary", label, sublabel, x, y, w?, h? } ],
  contextEdges: [ { from, to, label } ],
  containers: [ { id, type, label, tech, x, y, adrs?: ["ADR-NNN"] } ],
  containerEdges: [ { from, to, label, protocol } ],
  components: { [containerId]: [ { id, type: "handler"|"worker", label, tech, desc } ] },
  componentEdges: { [containerId]: [ { from, to } ] },
  endpoints: { [containerId]: [ { method, path, desc } ] },
  schemas: { [containerId]: [ { table, cols: [...] } ] },
  adrCatalog: { "ADR-NNN": { label, title, status, date } },
};

window.BLUEPRINT = BLUEPRINT;
```

Tipos válidos para `containers[].type`:
`service | gateway | broker | database | cache | queue | frontend | external`

Tipos válidos para `context[].type`:
`actor | system | boundary`

Estados válidos para ADR:
`Proposed | Accepted | Deprecated | Superseded`