# CLAUDE.md — Blueprints: referencia técnica

Blueprints es un canvas C4 interactivo de página única para visualizar arquitecturas y flujos de telecomunicaciones de proyectos IoT. Permite documentar un ecosistema multi-proyecto con niveles de zoom semánticos (L1–L4), flows arquitecturales animados, decisiones (ADRs), notas y un modo de edición visual que persiste las modificaciones sin tocar el JSON base.

---

## Arquitectura del proyecto

### Sin build step

`Blueprints.html` carga React 18 + Babel standalone desde CDN y evalúa los archivos JSX en el navegador en tiempo de ejecución. No hay compilación, bundler ni dependencias de desarrollo. Los cambios en cualquier `.jsx` son inmediatos: recargar el navegador es suficiente.

### Archivos

| Archivo | Responsabilidad |
|---|---|
| `Blueprints.html` | Punto de entrada. Componente `App`: composición de todos los paneles/modales, estado de UI, coordinación del overlay. |
| `data.jsx` | Objeto `BLUEPRINT` con toda la información del ecosistema. Tratado como seed inmutable. |
| `overlay.jsx` | Store de ediciones del arquitecto (diff sobre `data.jsx`, persiste en `localStorage`). |
| `canvas.jsx` | Canvas pan/zoom, cards C4, edges SVG, flow overlay, HUD, grid, auto-fit. Temas. |
| `flows.jsx` | Panel de flows, `FlowModal` (crear/editar/borrar flows y sus steps). |
| `adrs.jsx` | Panel de Decisions, `AdrModal` (crear/editar/borrar ADRs con vínculos a containers, projects y flows). |
| `containers.jsx` | `EditButton`, `EditModeBanner` (modo normal y connect mode), `ContainerModal`. |
| `edges.jsx` | `EdgeModal` (crear/editar/borrar edges de cualquier tipo). |
| `notes.jsx` | Sistema de notas ancladas a cards: hook `useNotes`, popover, panel lateral. |
| `settings.jsx` | `SettingsPanel`: tema, nivel C4, show externals, flow animation, export/import overlay. |
| `SCHEMA.md` | Formato canónico de `data.jsx` para uso con LLMs. |
| `prompts/` | Prompts por capa (01–06) para generar o actualizar `data.jsx` con un LLM. |
| `docs/` | Documentación fuente de cada proyecto del ecosistema (C4, ADRs, contratos). |

### Globals en `window`

| Global | Quién lo escribe | Quién lo lee |
|---|---|---|
| `window.BLUEPRINT` | `overlay.jsx` (en cada mutación) e initial load de `data.jsx` | Canvas, App, todos los modales |
| `window.__BLUEPRINT_SEED` | `overlay.jsx` (primera carga) | `overlay.jsx` (base para todos los diffs) |
| `window.__BLUEPRINT_COMMENT_MODE` | App | Card `mousedown` |
| `window.__BLUEPRINT_EDIT_MODE` | App | Card `mousedown`, canvas edge click |
| `window.__BLUEPRINT_FIT_VIEW` | `BlueprintCanvas` | `SettingsPanel` (botón "Fit view") |
| `window.__BLUEPRINT_RESET_LAYOUT` | `BlueprintCanvas` | App → `SettingsPanel` |
| `window.overlayHelpers` | `overlay.jsx` | App (generación de ids nuevos) |
| `window.THEMES` | `canvas.jsx` | Externo (consumo opcional) |

### Comunicación entre componentes

No hay event bus ni contexto React global. `App` en `Blueprints.html` orquesta todo el estado de UI. Las cards y el canvas disparan eventos nativos del DOM que `App` escucha:

- `blueprint:card-click` — click en una card (en comment mode o edit mode)
- `blueprint:edge-click` — click en una flecha (solo en edit mode)
- `blueprint:overlay-changed` — overlay store notifica un cambio

Cuando el overlay cambia, escribe `window.BLUEPRINT` de forma síncrona y luego hace bump a `overlay.version` (prop que recibe `BlueprintCanvas`) para forzar el re-render del canvas.

---

## Modelo de datos (`data.jsx`)

El formato completo está en `SCHEMA.md`. Lo que sigue son las convenciones que el código asume.

### Convenciones de IDs

| Prefijo | Tipo | Ejemplo |
|---|---|---|
| `ctx.*` | Nodo de contexto L1 (actor, system, boundary) | `ctx.user`, `ctx.sys` |
| `c.*` | Container L2 | `c.api`, `c.broker` |
| `cmp.*` | Component L3 | `cmp.auth` |
| `adr.*` | ADR / Decisión | `adr.001` |
| `flow.*` | Flow arquitectural | `flow.telemetry` |

En blueprints multi-proyecto los `ctx.*` llevan prefijo de proyecto: `hanso.ctx.operators`, `mg.ctx.sys`. Los ids de containers de distintos proyectos comparten el espacio plano de `containers[]`, así que los prefijos de proyecto evitan colisiones: `gw.c.manager`, `ender.c.frontend`.

### ADRs vs `adrCatalog`

Hay dos formas de declarar ADRs en el BLUEPRINT:

- **`adrs: []`** — array de objetos completos (`id`, `label`, `title`, `status`, `date`, `context`, `decision`, `consequences`, `alternatives`, `tradeoffs`, `affects`, `relatedAdrs`, `supersededBy`). Es el formato principal.
- **`adrCatalog: {}`** — objeto `{id → {label, title, status, date}}` simplificado. Solo metadatos; útil si los ADRs completos viven en otro sistema y solo necesitas los badges.

Los ADRs **no son nodos del canvas**. Nunca pongas containers de `type: "adr"` — el código los oculta silenciosamente.

Los statuses válidos son **en minúsculas**: `proposed`, `accepted`, `obsolete`, `superseded`. El código normaliza `"deprecated"` → `"obsolete"` para compatibilidad con datos legacy.

### Overlay (ediciones del arquitecto)

El overlay es un diff en `localStorage` que se aplica sobre `window.__BLUEPRINT_SEED` para producir `window.BLUEPRINT`. Tiene seis secciones:

```
adrs:           { byId, created, deleted }
containers:     { byId, created, deleted }
flows:          { byId, created, deleted }
contextEdges:   { patched, created, deleted }
containerEdges: { patched, created, deleted }
componentEdges: { patched, created, deleted }
```

Las edges usan clave compuesta `from__to` (no tienen id estable). Para `componentEdges` la clave incluye el container: `containerId::from__to`.

**Claves de localStorage:**

| Clave | Contenido |
|---|---|
| `blueprint.overlay.<project>` | Diff de entidades y edges |
| `blueprint.layout.v2.<project>` | Overrides de posición por nodo |
| `blueprint.notes.<project>` | Notas ancladas a cards |
| `blueprint.settings` | Tema, nivel C4, showExternals, flowAnimate |

El sufijo `v2` en la clave de layout invalida entradas antiguas escritas cuando los project cards usaban un algoritmo de posición por centroide (distinto del grid actual).

---

## Features

### Canvas C4 (`canvas.jsx`)

**Niveles C4 y zoom automático:**

| Nivel | Label | Zoom (auto) | Contenido |
|---|---|---|---|
| context | L1 | < 0.30 | Project cards grandes + actores externos en columna |
| container | L2 | 0.30 – 0.70 | Cards de servicio con tech, owner badge, ADR badges |
| component | L3 | 0.70 – 1.50 | Cards expandidas con lista de componentes internos |
| code | L4 | ≥ 1.50 | Componentes + endpoints + schemas |

El nivel puede fijarse manualmente en Settings (anula el zoom automático). El C4 ladder derecho que era una alternativa anterior ha sido eliminado; Settings es el único punto de control.

**Temas disponibles:** `blueprint` (azul oscuro, JetBrains Mono), `paper` (papel, courier), `dark` (negro puro, Inter).

**Edge routing:**
Las flechas anclan al borde real de cada card vía `offsetHeight` medido en DOM en el momento del render, no a la altura estimada del nodo. Esto es necesario porque las cards crecen con el contenido (listas de ADRs, componentes). El `ResizeObserver` actualiza el mapa `cardHeights` cuando una card cambia de tamaño, lo que provoca un nuevo cálculo de los paths.

**Flow overlay:**
Cuando un flow está activo, sus paths se dibujan en un SVG separado con `zIndex: 4`, por encima del layer de cards. Esto los hace visibles cuando cruzan nodos intermedios. Las cards no participantes se atenúan a opacity 0.22; las participantes tienen un glow del color de criticidad.

**Auto-fit:**
Cuando el nivel cambia, el canvas calcula la transformación para encuadrar todos los nodos visibles dentro del viewport. Se ejecuta una sola vez por nivel (trackeado con `lastFittedLevel` ref) para no interrumpir el pan/zoom manual posterior.

**Project drag:**
En L2+, el label de cada project group es draggable y mueve todos sus containers a la vez, manteniendo su posición relativa.

---

### Decisions / ADRs (`adrs.jsx`)

Panel lateral (botón §, abajo a la derecha). Lista, filtra, crea, edita y borra ADRs.

Cada ADR tiene metadatos (título, status, fecha, owner), cuerpo ADR clásico (context, decision, consequences, alternatives, tradeoffs) y vínculos a projects, containers y flows que afecta.

Las cards muestran una sección "Decisions" en L2+ con badges `label · status` clickables que abren el modal en modo edición. En L3/L4 se muestra además el título completo.

**Lookup de ADRs:** el canvas construye un índice `adrIndex` fusionando `BP.adrs[]` y `BP.adrCatalog`. Los containers referencian ADRs por id (`adrs: ["adr.001"]`); el índice resuelve el objeto completo en render.

**Status pipeline:** `proposed → accepted → obsolete | superseded`

---

### Notes & Comments (`notes.jsx`)

Notas ligeras ancladas a cards individuales, persistidas en `localStorage`.

Dos modos de acceso:
- **Comment mode** (botón 💬): activa un flag global `window.__BLUEPRINT_COMMENT_MODE`. Al hacer click en cualquier card se abre un popover de notas en lugar de iniciar un drag.
- **Notes panel** (botón ≡): lista global de todas las notas, filtrable por status (todo/doing/done) y proyecto. Incluye Export/Import JSON para backup.

Los pins (número sobre la card) son elementos posicionados en world space para que sigan el pan/zoom. Al hacer click, App resuelve la rect real del elemento en el DOM para posicionar el popover en coordenadas de viewport.

Comment mode y Edit mode son mutuamente exclusivos.

---

### Owners & Projects

- **`projects[]`** agrupa containers en franjas visuales con color propio (L2+). Aparece como "project card" grande en L1.
- **`owners[]`** muestra un colored dot badge en cada card de container. El color se asigna de forma determinista por hash del id (no requiere campo `color` en el owner).
- En L1, cada proyecto muestra un resumen: número de containers por tipo (`typeCounts`) y total.

---

### Flows arquitecturales (`flows.jsx`)

Los flows documentan escenarios end-to-end, técnicos o de negocio. Son la "capa de razonamiento" sobre el grafo de containers.

**Activar un flow:** click en el flow en el panel → el canvas aplica el overlay descrito arriba.

**Animación (`flowAnimate` en Settings):**
- `sync: false` (async): `stroke-dashoffset` animado sobre el path (marching ants)
- `sync: true` (sync): una esfera recorre el path con `<animateMotion>`

**Campos del flow que no se renderizan en el panel** (solo en FlowModal): `idempotent`, `traceable`, `retry`, `timeout`. Se editan y persisten, pero la lista del panel solo muestra `name`, `criticality`, `sync`, número de steps, `description`, owners y projects.

**Filtros del panel:** criticality, owner, sync/async, texto libre (busca en id + name + description + gaps).

---

### Edit mode (`containers.jsx`, `edges.jsx`, `adrs.jsx`, `flows.jsx`)

Botón ✎ (abajo a la derecha). Mutuamente exclusivo con Comment mode.

Al activarse, aparece un banner superior con las acciones disponibles:

| Acción | Cómo |
|---|---|
| Editar container | Click en cualquier card → `ContainerModal` |
| Crear container | Botón "+ New container" en el banner |
| Crear edge | Botón "+ Connect" → click source → click target → `EdgeModal` pre-rellenado |
| Editar/borrar edge | Click en cualquier flecha (línea o label) → `EdgeModal` |
| Crear/editar ADR | Panel Decisions → "+ New" o click en un ADR existente |
| Crear/editar flow | Panel Flows → "+ New" o botón "edit" en un flow |

**Connect mode:** infiere el tipo de edge por prefijo de ID: dos endpoints `ctx.*` → `contextEdges`; cualquier otro → `containerEdges`. Para `componentEdges` en L3 no hay flujo visual; editar en `data.jsx` o via overlay directo.

El hit target de las flechas es de 14px de ancho (invisible) para facilitar el click.

Todo se guarda vía overlay store. `data.jsx` nunca se toca.

**ESC:** sale del modal o modo más interno en cascada (connect mode → edit mode → flow activo → panels → settings).

---

### Overlay store (`overlay.jsx`)

Patrón "seed + diff":

1. En la primera carga, `overlay.jsx` congela `window.BLUEPRINT` en `window.__BLUEPRINT_SEED`.
2. Cada mutación (upsert/delete de ADR, container, flow, o edge) produce un nuevo overlay y llama a `buildEffectiveBP(seed, overlay)` de forma síncrona, actualizando `window.BLUEPRINT` antes del re-render.
3. El `version` counter del hook fuerza a `BlueprintCanvas` a re-renderizar su `useMemo` de nodos/edges.

**Export/Import** (Settings → sección "Overlay"):
- Export: descarga el JSON del overlay (`blueprint-overlay.json`). No incluye notas ni posiciones.
- Import: file picker, confirmación destructiva, aplica el JSON importado.

---

## Convenciones

### Idioma

- **Código y comentarios in-line**: inglés.
- **Docs operativas** (`SCHEMA.md`, `prompts/`, `CLAUDE.md`, `docs/README.md`): español.

### Naming

- La entidad C4 es siempre "container" en el código y el esquema. Su `type` (`service`, `gateway`…) describe el rol técnico.
- En la UI, los ADRs aparecen como "Decisions" / "Decision" (user-facing). En código y datos se llaman "ADR", `adrs`, `adr.*`.
- Los ids `ctx.*` pertenecen al array `context[]`. En L1, los actores/systems del contexto se muestran como `__ext__*` (virtual), pero ese prefijo nunca se guarda en `data.jsx`. Los steps de flows siempre usan el id original `ctx.*`.

### IDs de edges

Las edges no tienen id propio; se identifican por el par `{from, to}`. Si cambias los endpoints de una edge, el overlay descarta la key vieja y crea una nueva.

---

## Rough edges conocidos

1. **`edgePaths` usa `document.querySelector` en cada render** para leer `offsetHeight` live de las cards. Produce trabajo de DOM en cada re-render. Aceptable para el tamaño actual de blueprints; si el canvas crece a >200 nodos podría ser un bottleneck.

2. **Estimación de `h` previa al ResizeObserver**: la fórmula `130 + adrs.length * 32 + (code ? 80 : 0)` es una heurística. En el primer render, antes de que `ResizeObserver` mida las cards, las flechas pueden no tocar exactamente el borde. Se corrigen en el siguiente frame.

3. **Connect mode no cubre `componentEdges`**: el flujo "+ Connect" solo genera `contextEdges` o `containerEdges`. Para edges en L3 (entre components) hay que editar `data.jsx` directamente o usar `overlay.importOverlay` con un JSON artesanal.

4. **`affects.flows` en ADRs desde seed**: si un ADR en `data.jsx` no declara `affects.flows: []`, el campo estará vacío en el modal y el arquitecto puede añadir flows desde la UI. Si el ADR viene del overlay (creado desde la UI), el campo se inicializa correctamente.

5. **Flows panel no muestra todos los campos**: `idempotent`, `traceable`, `retry`, `timeout`, `expectedLatency` se editan en el `FlowModal` y se persisten, pero no aparecen en la lista del panel de flows. Son útiles para el arquitecto pero no están en la vista rápida.

---

## Atajos de teclado

| Tecla | Acción |
|---|---|
| `Esc` | Sale del modal/modo más interno (cascada de cierre) |
| `Ctrl/Cmd + Enter` | Envía el borrador de nota en el popover |
| Scroll | Zoom in/out centrado en el cursor |
| Drag en canvas (fondo) | Pan |
| Drag en card | Reposiciona esa card en world space |
| Drag en label del proyecto (L2+) | Mueve todos los containers del proyecto |
| Pinch (touch) | Zoom en dispositivos táctiles |
| Pan táctil (1 dedo) | Pan en dispositivos táctiles |
