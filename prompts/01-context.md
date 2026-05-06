# Paso 1 · Meta + C4 L1 (Context) + Owners + Projects

## Tu tarea

Lee la documentación adjunta (C4, READMEs, diagramas) y devuelve **solo** estos cinco campos del objeto `BLUEPRINT`:

- `meta`
- `owners`
- `projects`
- `context`
- `contextEdges`

No generes containers, components, endpoints, ADRs ni flows en este paso. Eso vendrá después.

## Forma exacta del output

```js
{
  meta: {
    project: "string",          // nombre visible del sistema
    version: "v1.2.3",
    updated: "YYYY-MM-DD",
    owner: "Equipo principal",
    description: "1–2 frases — qué hace el sistema, para quién."
  },

  owners: [
    // Equipos / personas dueñas de partes del sistema.
    // El `color` se usa para badges en la UI.
    { id: "team.platform", name: "Platform",  color: "#7aa6ff" },
    { id: "team.data",     name: "Data",      color: "#9b6bff" }
  ],

  projects: [
    // Agrupaciones de alto nivel (squads, productos, dominios).
    { id: "edge",    label: "Edge",     color: "#7aa6ff" },
    { id: "backend", label: "Backend",  color: "#5ed3a1" },
    { id: "data",    label: "Data",     color: "#9b6bff" }
  ],

  context: [
    // type: "actor" | "system" | "boundary"
    // Coordenadas en píxeles del lienzo. Sugerencia:
    //   actores externos a la izquierda (x ~80)
    //   la caja del sistema en el centro (x ~600, w ~540, h ~280)
    //   sistemas SaaS terceros a la derecha (x ~1200)
    { id: "ctx.user", type: "actor",    label: "Usuarios",   sublabel: "Web · iOS",  x: 80,  y: 200 },
    { id: "ctx.sys",  type: "boundary", label: "Mi Sistema", sublabel: "the system", x: 600, y: 320, w: 540, h: 280 }
  ],

  contextEdges: [
    { from: "ctx.user", to: "ctx.sys", label: "HTTPS" }
  ]
}
```

## Reglas

1. **Ids estables**: `ctx.*` para nodos de contexto, `team.*` para owners, slugs cortos para projects.
2. **Sé conservador**: si la doc menciona 4 actores, declara 4. No inventes "Admin" o "Auditor" si no aparecen.
3. **Posiciona en columnas**: actores izquierda → sistema centro → terceros derecha. Filas separadas ~180–200 px.
4. **Boundary del sistema**: declara **un** nodo `type: "boundary"` que represente "mi sistema" como caja contenedora. Su ancho/alto debe poder envolver visualmente lo que haya dentro (en este paso aún no hay containers, así que estima ~540×280).

## Si te falta información

**No inventes.** Antes de devolver el JSON, lista las preguntas que necesitas resueltas. Por ejemplo:

> Para terminar el paso 1 necesito saber:
> - ¿Hay actores adicionales además de los usuarios finales? (admins, sistemas externos que llaman al API…)
> - ¿Qué equipos son dueños del sistema y cómo se llaman internamente?
> - ¿El sistema interactúa con SaaS terceros (Stripe, SendGrid, PagerDuty…)?

Solo cuando confirme, devuelve el JSON.
