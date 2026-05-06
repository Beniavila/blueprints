# Paso 6 · Flows — escenarios end-to-end

## Contexto previo

Pega el `BLUEPRINT` actual (con todo lo anterior validado):

```js
const BLUEPRINT = { /* todo lo de pasos 1–5 */ };
```

## Tu tarea

Devuelve **solo** el campo `flows`. Cada flow es una secuencia ordenada de interacciones que cuenta una historia completa: técnica (telemetría de extremo a extremo) o de negocio (usuario hace X y le llega Y).

## Forma exacta del output

```js
flows: [
  {
    id: "flow.telemetry",                  // convención: flow.*
    name: "Sensor telemetry ingestion",    // título humano
    type: "technical",                     // technical | business
    criticality: "critical",               // critical | high | medium | low
    description: "Una frase — qué pasa de punta a punta.",

    // Comportamiento esperado. Marca lo que sepas, deja vacío el resto.
    sync: false,                           // ¿el caller espera respuesta?
    idempotent: true,
    traceable: true,
    retry: "exponential",                  // none | linear | exponential
    timeout: 10000,                        // ms
    expectedLatency: 800,                  // ms (p95 objetivo)
    ordering: "per-device",                // strict | per-key | per-device | none

    // Pasos: cada paso es una flecha entre dos nodos del lienzo.
    // `from`/`to` deben ser ids existentes (ctx.* o c.*).
    steps: [
      { from: "ctx.field",  to: "c.broker",   protocol: "mqtt", label: "publish · QoS 1" },
      { from: "c.broker",   to: "c.ingestor", protocol: "mqtt", label: "subscribe topic/+/telemetry" },
      { from: "c.ingestor", to: "c.tsdb",     protocol: "sql",  label: "INSERT batch" },
      { from: "c.ingestor", to: "c.queue",    protocol: "nats", label: "publish event" }
    ],

    owners:   ["team.platform"],           // ids declarados en paso 1
    projects: ["edge", "data"],            // ids declarados en paso 1
    adrs:     ["adr.001", "adr.003"],      // decisiones que rigen el flow

    triggers: ["sensor sample published"], // qué inicia el flow
    risks:    [],
    gaps:     "Lo que aún no está documentado o tuviste que asumir."
  }
]
```

## Reglas

1. **Cada `from`/`to` debe existir** en `context` o `containers`. Si necesitas un nodo que no existe, **detente y pregunta** antes de inventarlo.
2. **Un flow = una historia con principio y fin.** Si el escenario tiene una rama lógica grande (éxito vs error), declara dos flows.
3. **Orden de los steps importa**: el paso 1 es lo primero que ocurre.
4. **`gaps` es obligatorio si asumiste algo.** Es el campo donde dices honestamente "esto no estaba documentado, lo deduje". El arquitecto humano lo revisa después.
5. **Cubre los flows críticos primero.** No intentes documentar 30 flows: 4–8 que cubran los caminos críticos y los happy-paths principales basta.
6. **Adicionalmente**: por cada ADR que rija un flow, añade el id del flow a `adrs[i].affects.flows` (devuélvelo como modificación a la lista de ADRs).

## Si te falta información

> Para los flows necesito saber:
> - ¿Cuáles son los 5–8 escenarios críticos que quieres documentar primero? (ingesta, login, comando, alerta, reporte…)
> - El flow "X" menciona un paso entre A y B, pero no veo edge entre ellos en `containerEdges`. ¿Falta una conexión, o el step pasa por un container intermedio que omití?
> - ¿Qué latencia objetivo tiene el flow Y? La doc no lo dice.

Solo cuando confirmes, devuelve el JSON.
