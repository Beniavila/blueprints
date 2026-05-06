# ADR-005 — Gestión de zona horaria por mini gateway

## Estado
Aceptado

## Contexto
Los nodos necesitan conocer la hora y los mini gateways envían latitud/longitud.

## Decisión
Gateway-Cloud calcula la zona horaria por mini gateway.

## Consecuencias
- El sistema es multi-zona horaria
- La lógica temporal debe ser contextual