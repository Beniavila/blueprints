# ADR-01: Elección de Go como lenguaje backend

## 1. Contexto

Ender es un orquestador de campañas OTAP (Over-The-Air Programming) para redes de alumbrado público basadas en gateways Wirepas.  
El backend debe coordinar múltiples campañas en paralelo, manejar procesos largos (varios minutos u horas), interactuar con gateways, publicar trabajos en NATS JetStream y ejecutar flujos secuenciales mediante workers.

Requisitos clave del backend:

- Concurrencia real y sencilla.  
- Estabilidad en procesos de larga duración.  
- Despliegue simple y reproducible.  
- Integración fuerte con herramientas cloud-native.  
- Código claro, explícito y fácil de mantener.  
- Binarios autosuficientes, ideales para infraestructura distribuida.  
- Excelente integración con NATS JetStream.

Python, Node.js y otros lenguajes fueron evaluados, pero presentan limitaciones en concurrencia, coste operativo o complejidad innecesaria para workflows críticos.

---

## 2. Decisión

Adoptar **Go** como lenguaje principal del backend de Ender.

El backend incluirá:

- API HTTP  
- Core de servicios  
- Scheduler  
- Workers OTAP  
- Gateway Adapter  
- Integración con NATS JetStream y MinIO  

Todas estas piezas encajan de forma natural con Go y su modelo de concurrencia.

---

## 3. Alternativas consideradas

### Python
- ❌ GIL limita concurrencia real  
- ❌ Workers complejos con asyncio  
- ✔ Buen ecosistema, pero no ideal para pipelines OTAP

### Node.js
- ❌ Single-threaded  
- ❌ No óptimo para procesos largos  
- ✔ Buen rendimiento en IO, pero peor en workflows secuenciales

### Rust
- ✔ Máximo rendimiento  
- ❌ Curva de aprendizaje muy alta  
- ❌ Desarrollo más lento sin necesidad real para este caso

---

## 4. Consecuencias

### Positivas
- Concurrencia simple (goroutines y channels).  
- Binarios rápidos, autosuficientes y fáciles de desplegar.  
- Integración ideal con sistemas cloud-native (NATS, MinIO, Docker).  
- Rendimiento excelente en pipelines de IO y workflows.  
- Código claro, explícito, mantenible.

### Negativas
- Requiere una curva de aprendizaje inicial para desarrolladores nuevos.  

---

## 5. Estado futuro

Go permitirá evolucionar Ender hacia:

- microservicios independientes (si se desea),  
- workers especializados por tipo de campaña,  
- mayor rendimiento en futuros componentes IoT,  
- integración nativa con observabilidad (Prometheus, OpenTelemetry).

**Conclusión:** Go es la elección óptima para un backend robusto, concurrente y mantenible para Ender.


---

[Volver al README](../../README.md)