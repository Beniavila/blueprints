# ADR-003 — Comunicación asíncrona mediante MQTT

## Estado
Aceptado

## Contexto
Los mensajes tienen cadencias variables y comportamiento irregular.

## Decisión
Toda la comunicación será asíncrona sobre MQTT.

## Consecuencias
- Sistema orientado a eventos
- Necesidad de manejar ráfagas
- Necesidad de control de entrega