# Paso 4 · C4 L3 / L4 — Components, ComponentEdges, Endpoints, Schemas (opcional)

> **Este paso es opcional.** Genera L3/L4 **solo para los containers que el humano pida explícitamente**. No es necesario hacerlo para todos.

## Contexto previo

Pega el `BLUEPRINT` actual:

```js
const BLUEPRINT = { /* meta, owners, projects, context, containers, containerEdges */ };
```

## Tu tarea

Para los containers indicados, devuelve los siguientes campos (solo los que apliquen):

```js
{
  components: {
    "c.api": [
      // type: "handler" | "worker" (afecta color)
      { id: "cmp.auth",   type: "handler", label: "AuthHandler",  tech: "JWT",   desc: "Valida tokens" },
      { id: "cmp.router", type: "handler", label: "Router",       tech: "Hono",  desc: "Despacha a handlers" }
    ]
  },

  componentEdges: {
    "c.api": [
      { from: "cmp.auth", to: "cmp.router" }
    ]
  },

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
  }
}
```

## Reglas

1. **Solo containers pedidos.** Si te dicen "haz L3 para `c.api` y `c.ingestor`", no toques los demás.
2. **Ids de componente**: `cmp.*` y deben ser únicos a nivel global, no solo dentro del container.
3. **`endpoints`** solo para containers `service`/`gateway`/`frontend`. Para `database` usa `schemas`.
4. **`schemas`** una entrada por tabla/colección, columnas como strings simples.
5. **No infieras endpoints** que no estén en el código o en la doc. Es preferible dejar la lista corta y precisa.

## Si te falta información

> Para L3 de `c.api` necesito saber:
> - ¿Qué handlers tiene? (lo más útil sería un `ls` de la carpeta `routes/` o `handlers/`)
> - ¿Hay middleware destacable que merezca ser un `cmp.*` propio?
>
> Para L4 de `c.db`:
> - ¿Cuáles son las tablas principales? Con 4–6 me basta para el panel.
