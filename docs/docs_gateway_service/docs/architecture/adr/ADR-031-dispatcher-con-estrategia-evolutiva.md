# ADR-031 — Estrategia de concurrencia del Dispatcher

## Estado
Aceptado

## Contexto
El Dispatcher es responsable de enrutar mensajes desde el channel global hacia los workers por nodo. Este componente es crítico en el flujo de entrada del sistema.

El routing consiste principalmente en:
- lookup de node_id en estructura en memoria
- creación de worker si no existe
- envío del mensaje al worker

Estas operaciones son ligeras en coste computacional.

## Decisión
Se implementará inicialmente un único dispatcher (una goroutine) encargado de leer del channel global y enrutar mensajes a los workers.

Se deja preparada la posibilidad de evolucionar a múltiples dispatchers (pool de goroutines) si se detecta que este componente se convierte en cuello de botella.

## Consecuencias
- Simplicidad en la implementación inicial
- Ausencia de problemas de concurrencia en estructuras compartidas
- Facilidad de debug y trazabilidad

## Estrategia de evolución
Si el dispatcher se convierte en cuello de botella:

- Se podrá migrar a un modelo con múltiples dispatchers leyendo del mismo channel
- Será necesario:
  - proteger el acceso al mapa de workers (sync.Map o mutex)
  - garantizar consistencia en la creación de workers
- El cambio será local al componente Dispatcher sin afectar al resto del sistema

## Métrica de activación
Se considerará evolucionar cuando:

- el channel global acumule backlog de forma sostenida
- la latencia de entrada aumente
- CPU infrautilizada mientras el dispatcher está saturado