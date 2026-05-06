# ADR-032 — Gestión de Node Workers con map + mutex

## Estado
Aceptado

## Contexto
El sistema requiere gestionar dinámicamente workers por nodo (`node_id → worker`) en un entorno altamente concurrente.

Las operaciones principales son:
- lectura de worker existente
- creación de worker si no existe
- eliminación de workers inactivos (futuro)

El patrón de uso implica alta rotación de claves (nodos que aparecen y desaparecen) y múltiples escrituras concurrentes.

## Decisión
Se utilizará una estructura `map` protegida con `sync.Mutex` para gestionar los workers por nodo.

## Consecuencias
- Mejor rendimiento que `sync.Map` en escenarios con muchas escrituras
- Mayor control sobre la concurrencia
- Necesidad de gestionar correctamente las secciones críticas

## Regla de implementación (crítica)

El mutex se utilizará exclusivamente para proteger el acceso al mapa.

No se ejecutará lógica de negocio ni procesamiento dentro de la sección crítica.

### Patrón correcto

```go
mu.Lock()
worker, exists := workers[node_id]
if !exists {
    worker = newWorker()
    workers[node_id] = worker
}
mu.Unlock()

worker.process(msg)
```

### Patrón incorrecto

```go
mu.Lock()
worker.process(msg) // ❌ bloquea todo el sistema
mu.Unlock()
``` 

### Consecuencias de incumplimiento

- Bloqueo global del sistema
- Pérdida de throughput
- Aumento de latencia
- Riesgo de deadlocks en evolución futura

### Notas

- El acceso al mapa debe ser lo más corto posible
- Toda lógica pesada debe ejecutarse fuera del lock

