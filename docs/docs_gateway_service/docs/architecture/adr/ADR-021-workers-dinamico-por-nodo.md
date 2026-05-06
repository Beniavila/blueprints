# ADR-021 — Workers dinámicos por nodo

## Estado
Aceptado

## Contexto
El sistema debe adaptarse dinámicamente a la aparición de nuevos nodos sin preconfiguración ni límites rígidos.

## Decisión
Los workers se crearán dinámicamente por nodo bajo demanda, cuando se detecte actividad para ese nodo.

## Consecuencias
- Escalado automático según carga real
- No se desperdician recursos en nodos inactivos
- Se requiere mecanismo de limpieza de workers inactivos
- Se debe controlar el crecimiento para evitar exceso de goroutines