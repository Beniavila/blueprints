# Paso 5 · ADRs — decisiones arquitectónicas

## Contexto previo

Pega el `BLUEPRINT` actual:

```js
const BLUEPRINT = { /* meta, owners, projects, context, containers, containerEdges, [components/endpoints] */ };
```

## Tu tarea

Lee los ADRs adjuntos y devuelve dos cosas:

1. El campo `adrs` (registro completo de cada decisión).
2. **Adicionalmente**, modifica los containers afectados para incluirlos en su array `adrs: [...]` (esto pinta los badges en cada card del lienzo).

## Forma exacta del output

```js
{
  adrs: [
    {
      id: "adr.001",                           // convención: adr.*
      label: "ADR-001",                        // visible en card y badges
      title: "MQTT como protocolo de ingesta", // título corto
      status: "accepted",                      // proposed | accepted | deprecated | superseded
      date: "2025-09-12",
      owner: "team.platform",                  // id de un owner del paso 1

      context:      "Por qué hubo que decidir esto.",
      decision:     "Qué se decidió.",
      consequences: "Qué implica esto: técnico, operacional, coste.",

      alternatives: ["Kafka directo desde devices", "AMQP via RabbitMQ"],
      tradeoffs:    "Qué se pierde y cómo se mitiga.",

      // A qué partes del sistema afecta esta decisión:
      affects: {
        projects:   ["edge", "backend"],
        containers: ["c.gateway", "c.ingestor", "c.broker"],
        flows:      []                       // se rellena en el paso 6
      },

      relatedAdrs:  ["adr.004"],             // otros ADRs relacionados
      supersededBy: null                     // o "adr.007" si quedó reemplazado
    }
  ]
}
```

Y, en paralelo, indica qué containers añaden el ADR a su badge:

```js
// Modificaciones a containers (devuelve solo los containers que cambian):
{
  "c.gateway":  { adrs: ["adr.001"] },
  "c.ingestor": { adrs: ["adr.001", "adr.003"] },
  "c.broker":   { adrs: ["adr.001", "adr.002"] }
}
```

## Reglas

1. **Un ADR = una decisión.** Si el doc agrupa varias en una página, sepáralas si son lógicamente independientes.
2. **`status`** en minúsculas. `accepted` es el caso más común.
3. **`affects.containers`** debe contener ids reales del paso 2. Si el ADR menciona un container que aún no existe, dilo en preguntas — no inventes.
4. **`affects.flows`** déjalo vacío en este paso; se rellena en el paso 6 cuando ya tenemos los flows declarados.
5. **No crees nodos `type: "adr"` en `containers`** salvo que el humano quiera verlos como cards en el lienzo. Por defecto, los ADRs viven solo en el panel "Decisions". Pregunta antes de añadirlos al lienzo.

## Si te falta información

> Para los ADRs necesito saber:
> - El ADR menciona "el broker": ¿se refiere a `c.broker` o hay otro broker que aún no he documentado?
> - El estado de `ADR-007` no aparece claro: ¿accepted, proposed o deprecated?
> - ¿Quieres que los ADRs aparezcan también como nodos en el lienzo, o solo en el panel Decisions?
