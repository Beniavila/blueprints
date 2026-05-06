# ADR-018 — Pipeline de procesamiento compartido

## Estado
Aceptado

## Contexto
Gateway-Cloud mantiene múltiples conexiones MQTT (una por servidor), pero la lógica del gateway es única e independiente del servidor.

## Decisión
Se define un único pipeline de procesamiento compartido para todos los mensajes, independientemente del servidor MQTT de origen o destino.

## Consecuencias
- Se mantiene coherencia con el comportamiento del gateway tradicional
- Se evita duplicación de lógica
- Se simplifica el modelo mental del sistema
- El routing por servidor se realiza en la capa de comunicación, no en la lógica de procesamiento
- Se requiere control interno para evitar bloqueos entre flujos de distintos servidores