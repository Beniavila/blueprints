# Prompts para generar tu Blueprint con un LLM

El objetivo es que un LLM (cualquiera, también los más económicos) construya tu `data.jsx` **por capas**, no de un tirón. Cada capa valida la anterior; si falta información, el LLM **debe preguntarte** en vez de inventar.

## Cómo usarlos

1. Abre el archivo de la capa que toca y copia el prompt entero a tu LLM.
2. Adjunta tu documentación (C4, diagramas, READMEs, ADRs, lo que tengas) **una sola vez** por sesión — no en cada prompt.
3. Si la capa anterior ya existe, pega el `BLUEPRINT` actual como contexto en el bloque indicado.
4. El LLM devuelve **solo el campo de esa capa** (no el objeto entero). Tú lo mergeas en `data.jsx`.
5. Recarga la web → revisa con los ojos → si falta algo, lo añades con los editores visuales (panel Decisiones, modo Edit, panel Flows).

## Orden recomendado

| # | Archivo | Qué genera | Bloquea hasta |
|---|---|---|---|
| 1 | `01-context.md`   | `meta`, `context`, `contextEdges`, `owners`, `projects` | Confirmas actores, equipos y proyectos. |
| 2 | `02-containers.md`| `containers` (solo nodos, con tech y posición)          | Confirmas que están todos los servicios. |
| 3 | `03-edges.md`     | `containerEdges`                                        | El LLM debe preguntar lo que no encuentre documentado. |
| 4 | `04-components.md`| `components`, `componentEdges`, `endpoints`, `schemas`  | Solo para los containers que pidas. Es opcional. |
| 5 | `05-adrs.md`      | `adrs` + nodos `type: "adr"` + edges `kind: "adr"`      | Asocias cada ADR a containers/projects. |
| 6 | `06-flows.md`     | `flows`                                                  | Steps validados contra ids ya existentes. |

## Por qué por capas

- **Coherencia**: cada paso referencia ids que ya validaste — no se inventa el nombre de un container en L3 que nunca existió en L2.
- **Iteración**: si un paso sale mal, regeneras solo esa capa, no el JSON entero.
- **Coste**: prompts cortos = menos tokens = LLMs baratos cumplen.
- **Honestidad**: cada prompt obliga al LLM a marcar qué asumió. Eso aparece en el campo `gaps` (en flows) o como pregunta directa.

## Referencia completa

El esquema canónico de cada campo está en `../SCHEMA.md`. Estos prompts son la **forma de uso recomendada** del esquema, no una alternativa.
