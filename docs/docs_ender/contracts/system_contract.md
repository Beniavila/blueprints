# Contrato del sistema – Ender

## 1. Purpose

Ender es un orquestador de OTAP para redes de luminarias basadas en Wirepas.

- Ender NO ejecuta el OTAP en los nodos.
- Ender NO conoce la lógica interna de Wirepas.
- Ender NO decide compatibilidad de firmware con nodos.

### El objetivo de Ender es:

- Orquestar campañas OTAP a nivel organización + servidor

- Coordinar múltiples gateways por campaña

- Secuenciar pasos OTAP de forma determinista

- Gestionar estado, tiempos y fallos

- Proporcionar observabilidad completa del proceso

- Permitir reintentos eficientes sin repetir trabajo innecesario

### Ender actúa como fuente de verdad del estado de una campaña OTAP, mientras que:

- El gateway ejecuta el OTAP real

- Los nodos reflejan si han aplicado o no el firmware

- Wirepas gestiona la propagación mesh

---

## 2. Core Invariants (Reglas Inmutables)

Estas reglas NO deben romperse.
Cualquier cambio futuro debe respetarlas.

### 2.1 Separación de responsabilidades

- Worker:

    - Envía comandos OTAP

    - NO espera respuestas MQTT

    - NO bloquea ejecución

- GatewayAdapter:

    - Escucha MQTT

    - Traduce mensajes a eventos de dominio

    - Actualiza estado vía CampaignService

- CampaignService:

    - Es la única fuente de verdad

    - Decide estados, pasos y expiraciones

    - NO depende de transporte (MQTT, NATS, HTTP)

### 2.2 Modelo asíncrono estricto

- MQTT es asíncrono

- NATS es asíncrono

- Ningún componente espera respuestas síncronas externas

- El sistema es eventualmente consistente

### 2.3 Avance de pasos OTAP

- Un step solo avanza cuando:

    - Todos los gateways válidos han respondido

    - El tiempo del step ha expirado

- Un gateway en estado failed:

    - NO bloquea la campaña

    - NO recibe más pasos

- La campaña siempre finaliza:

    - con gateways success

    - con gateways failed

    - con una mezcla de ambos

### 2.4 Control temporal explícito

- Cada step tiene:

    - StartedAt

    - TimeoutAt

- El tiempo es una primera clase del dominio

- Un step puede cerrarse por timeout, no solo por éxito

### 2.5 Inmutabilidad de decisiones OTAP

- El Sequence se calcula una vez por campaña

- En retries:

    - se reutiliza el mismo Sequence

    - los nodos ya actualizados no reinstalan firmware

### 2.6 Aislamiento entre campañas

- Cada campaña es independiente

- No se comparten gateways entre campañas activas

- No se mezclan estados ni eventos entre campañas

### 2.7 Tolerancia a fallos

- Fallos parciales son esperables

- Un gateway puede:

    - fallar por error

    - fallar por timeout

- Todo fallo se registra

- Ningún fallo silencioso es aceptable

---

## 3. OTAP lifecycle

Esta sección define el comportamiento operativo completo de una campaña OTAP en Ender.
No describe implementación; describe qué ocurre y cuándo.

### 3.1 Creación de campaña

Una campaña OTAP se crea con los siguientes datos inmutables durante su ejecución:

- Organización

- Servidor (entorno)

- Lista fija de Gateways

- Firmware (ID + URL)

- AppAreaID (tipo de nodo)

- Sequence

- PropagateTime

- ProcessingTime

- TimeoutMargin (segundos adicionales de ventana para propagate/processing)

- CollectTimeout (segundos totales para collect; si es 0 se usa el default del sistema)

- ScheduledAt

Al crear la campaña:

- El estado es CampaignPending

- No se envía ningún comando a gateways

- No se inicia ningún step

### 3.2 Inicio de campaña (Scheduled Start)

Cuando now >= ScheduledAt:

- La campaña pasa a CampaignRunning

- Se calcula el Sequence (una sola vez)

- Se inicia el primer step: Propagate

- Se registra StartedAt

- Se inicializa el estado de todos los gateways como pending

### 3.3 Step 1 — Propagate

**Objetivo:**
Distribuir el firmware por la red mesh.

**Acciones:**

- Ender envía el comando propagate a todos los gateways válidos

- Se establece StepMeta.StartedAt

- Se calcula StepMeta.TimeoutAt = StartedAt + PropagateTime + TimeoutMargin

- El timeout del step incluye una ventana adicional de gracia para permitir la recepción de respuestas una vez finalizado el tiempo de propagación en los gateways.

**Durante el step:**

- Los gateways responden de forma asíncrona vía MQTT

- Cada gateway puede pasar a:

    - success

    - failed

    - permanecer pending

**Cierre del step:**

- El step se considera cerrado cuando:

    - todos los gateways válidos han respondido

    - se alcanza TimeoutAt

Los gateways que no respondan antes del timeout:

- se marcan como failed

- no reciben pasos posteriores

### 3.4 Step 2 — Processing

**Objetivo:**
Instalar el firmware en los nodos.

**Acciones:**

- Se inicia tras cerrar Propagate

- Ender envía el comando processing solo a gateways válidos

- Se recalcula StepMeta.TimeoutAt = StartedAt + ProcessingTime

- El timeout del step incluye una ventana adicional posterior al tiempo de procesamiento del gateway, durante la cual Ender espera respuestas asíncronas antes de cerrar el step.

**Comportamiento:**

- Igual que Propagate:

    - respuestas asíncronas

    - tolerancia a fallos parciales

    - cierre por éxito o timeout

### 3.5 Step 3 — Collect

**Objetivo:**
Recopilar el resultado final del OTAP.

**Acciones:**

- Ender solicita a cada gateway los resultados finales

- Los gateways envían:

    - lista de nodos actualizados

    - lista de nodos no actualizados

    - metadatos de versión y estado

**Cierre del step:**

- El step se cierra cuando:

    - todos los gateways válidos responden

    - se alcanza un timeout de seguridad

### 3.6 Finalización de campaña

Cuando el step Collect se cierra:

- La campaña se marca como finalizada (FinishedAt)

- El estado global de la campaña no invalida resultados parciales

- Se genera un resumen con:

    - gateways success

    - gateways failed

    - nodos actualizados

    - nodos no actualizados

    - errores registrados

La campaña siempre finaliza, incluso con fallos.

### 3.7 Retry de campaña

Un retry es una nueva campaña que referencia a otra mediante RetryOf.

Reglas del retry:

- Usa el mismo firmware

- Usa el mismo Sequence

- Solo los nodos que no estén actualizados aplicarán el firmware

- Se pueden modificar:

    - tiempos

    - ScheduledAt

### 3.8 Principios clave del lifecycle

- Ningún step bloquea indefinidamente

- Los timeouts son parte del dominio

- Los gateways fallidos no bloquean el sistema

- El OTAP es eventualmente consistente

- El estado siempre es observable

### 3.9 Ciclo de vida y transiciones válidas

Estados de campaña:

- pending → running → success / failed / canceled

Transiciones válidas:

- pending → running (al iniciar la campaña/primer step)
- running → success (step Collect cerrado sin fallos bloqueantes)
- running → failed (fallos/timeout que cierran la campaña)
- running → canceled (cancelación explícita)

Transiciones prohibidas:

- Finalizar (success/failed/canceled) si nunca estuvo running
- Cancelar una campaña ya finalizada (success/failed/canceled)
- Avanzar steps si la campaña no está en running

Exclusión de campañas activas:

- Solo puede existir una campaña pending/running por organización + servidor (entorno).
- success/failed/canceled no bloquean nuevas campañas.

Cancelación manual:

- Se puede cancelar una campaña pending/running.
- Es idempotente: si ya está canceled/success/failed no hace nada.
- Detiene el avance de steps y se ignoran eventos entrantes posteriores.
- Gateways pendientes/in_progress se consideran fallidos con motivo de cancelación.

Retry de campañas:

- Un retry referencia a la campaña original via RetryOf.
- Solo se puede hacer retry de campañas finalizadas (success/failed/canceled).
- Se copian org, server, gateways, firmware, appArea, sequence y tiempos (propagate/processing/timeout).
- Se permite ajustar ScheduledAt y ventanas si se desea, pero la exclusión por org+server sigue aplicando.
- El retry empieza en el step que se configure (propagate/processing/collect) con estado limpio; no mezcla estados con la campaña original.

---

## 4. Failure model

Esta sección define cómo se comporta Ender ante fallos.
El sistema está diseñado para fallar de forma explícita, observable y recuperable.

### 4.1 Fallos de Gateway

Un gateway puede fallar de dos formas:

1. Fallo explícito

    - El gateway responde con error durante un step

    - El error se registra con:

        - step

        - timestamp

        - motivo

2. Fallo por timeout

    - El gateway no responde antes de StepMeta.TimeoutAt

    - Se marca automáticamente como failed

**Consecuencias:**

- El gateway no recibe pasos posteriores

- El fallo no bloquea la campaña

- El fallo queda registrado para análisis y retry

### 4.2 Fallos de Nodo

- Los nodos deciden localmente si aplican el firmware

- Ender no valida compatibilidad

- Un nodo no actualizado:

    - no invalida el gateway

    - no invalida la campaña

    - se registra en el informe final

### 4.3 Fallos de red / conectividad

- MQTT es inherentemente asíncrono

- Los mensajes pueden llegar:

    - tarde

    - duplicados

    - fuera de orden

**Reglas:**

- Mensajes tardíos no reabren steps cerrados

- Mensajes duplicados son idempotentes

- El estado del dominio es la única fuente de verdad

### 4.4 Fallos del Worker

Si un Worker:

- se reinicia

- se cae

- pierde conectividad

**Entonces:**

- No se pierde estado (persistido en DB)

- Otros Workers pueden continuar

- Los jobs NATS pueden reentregarse

- El sistema sigue siendo consistente

### 4.5 Fallos del Scheduler

- Si el Scheduler se cae:

    - no se pierden campañas

    - los checks se reanudan al reiniciar

- Las campañas no se ejecutan fuera de ventana

### 4.6 Fallos de NATS

- JetStream garantiza persistencia

- Los jobs no se pierden

- Reintentos son controlados por el consumidor

- El sistema tolera duplicados

### 4.7 Fallos de almacenamiento

- Fallos de DB impiden avanzar estado

- Ningún step avanza sin persistencia exitosa

- Los errores son visibles y auditables

### 4.8 Principios del modelo de fallo

- Fallar es normal

- Fallar es esperado

- Fallar es observable

- Fallar no debe bloquear el sistema

- Fallar nunca debe ser silencioso

---

## Estado del contrato

Con esta sección, el System Contract de Ender queda completo y estable.

**A partir de ahora:**

- El contrato no cambia salvo decisión consciente

- El código debe alinearse con él

- Cualquier refactor se evalúa contra este documento
