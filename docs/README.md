# Cómo añadir un proyecto al Blueprint

Esta carpeta es donde vives la documentación que el LLM va a leer para generar
o actualizar `data.jsx`.

## Estructura recomendada

​```
docs/
  ├── README.md                ← este archivo
  ├── PROMPT.md                ← el prompt completo que le pasas al LLM
  ├── mi-proyecto/
  │   ├── c4.md                ← tu modelo C4 (Context, Containers, Components)
  │   ├── adrs/
  │   │   ├── ADR-001-mqtt.md
  │   │   ├── ADR-002-emqx-cluster.md
  │   │   └── ...
  │   └── extra.md             ← cualquier nota suelta (opcional)
  └── otro-proyecto/
      └── ...
​```

No hace falta que sigas la estructura al pie. Lo importante es que tengas:
- **Una descripción del C4** (aunque sea en prosa o un diagrama exportado)
- **Los ADRs** (Architecture Decision Records) en archivos separados
- Cualquier contexto extra que el LLM deba conocer

## Flujo para generar el blueprint

1. **Pon tu documentación** dentro de `docs/<nombre-proyecto>/`.
2. **Abre** `PROMPT.md` — copia el prompt completo.
3. **Pásaselo a tu LLM** (Claude / ChatGPT / etc.) junto con todos los archivos
   de tu proyecto adjuntos o pegados en el chat.
4. El LLM te devolverá el contenido completo de `data.jsx`.
5. **Reemplaza** el `data.jsx` de la raíz por el que generó.
6. **Recarga** `Blueprints.html` — el lienzo se redibuja entero.

## Tip

Si tu proyecto es grande y no cabe en una sola conversación con el LLM, divídelo:
genera primero solo `meta` + `context` + `containers`, ejecuta para verificar,
y luego pídele que rellene `components`, `endpoints` y `schemas` por contenedor.