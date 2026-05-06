# ADR-03: Elección de NATS JetStream como sistema de colas para Ender

## 1. Contexto

Ender es un orquestador de campañas OTAP (Over-The-Air Programming) para redes Wirepas.  
Cada campaña está compuesta por múltiples fases (distribución de firmware, despliegue, aplicación, verificación), que pueden durar horas y requieren:

- ejecución asíncrona  
- reintentos controlados  
- persistencia del estado  
- robustez ante fallos  
- escalabilidad horizontal  
- integración eficiente con Go  
- manejo concurrente de múltiples organizaciones  

El backend de Ender necesita un sistema que permita:

1. Planificación diferida (campañas programadas)  
2. Envío de trabajos (jobs) a workers OTAP  
3. Persistencia real de cada job  
4. Garantías de entrega  
5. Reintentos automáticos o manuales  
6. Escalado dinámico de workers  
7. Baja latencia para notificar progreso en tiempo real al frontend  

Redis fue descartado por falta de persistencia fiable y por no estar diseñado para workflows críticos.  
RabbitMQ es una alternativa madura, pero su arquitectura es más pesada y menos adecuada para escenarios IoT modernos.

---

## 2. Decisión

Adoptar **NATS JetStream** como broker de mensajería principal de Ender, tanto para:

- distribución de trabajos OTAP (jobs)  
- publicación de eventos de progreso (event stream)  

Cada campaña OTAP se representa como un conjunto de jobs persistentes en un stream de JetStream.  
Los workers OTAP en Go consumen estos jobs, ejecutan fases y publican eventos de estado/logs.

---

## 3. Alternativas consideradas

### Redis (listas / streams)
- ❌ Falta de persistencia transaccional sólida  
- ❌ Sin dead-letter queue nativa  
- ❌ No apto para trabajos de larga duración  
- ✔ Rápido, pero insuficiente para este dominio

### RabbitMQ
- ✔ Fiable y muy probado  
- ✔ Modelo claro de ack/retry/DLQ  
- ❌ Menos eficiente que NATS en IoT  
- ❌ Clustering más complejo  
- ❌ Integración menos natural con Go

### Kafka
- ❌ Overkill para este tamaño de sistema  
- ❌ Requiere infraestructura pesada  
- ❌ No es ideal para trabajos individuales sino para flujos de datos

---

## 4. Consecuencias

### Positivas
- Workers OTAP altamente escalables y desacoplados  
- Persistencia fuerte de jobs y eventos OTAP  
- Reintentos automáticos mediante JetStream consumers  
- Baja latencia para notificaciones en tiempo real  
- Clustering y HA simples  
- Integración excelente con Go (SDK oficial)  
- Preparado para cargas IoT masivas

### Negativas
- Requiere aprendizaje inicial de JetStream  
- Se introduce un componente adicional a operar  
- No es tan conocido como RabbitMQ para algunos equipos

---

## 5. Estado futuro

Si Ender evoluciona hacia una plataforma IoT más amplia (gestión de telemetría, comandos, alarmas), NATS JetStream servirá como base para:

- event-driven architecture  
- streams de telemetría  
- control distribuido  
- escalado geográfico

---

**Conclusión:**  
NATS JetStream ofrece la mejor combinación de fiabilidad, simplicidad operativa, escalabilidad y adecuación al contexto IoT del sistema, y por eso se adopta como base del sistema de colas y eventos de Ender.

---

[Volver al README](../../README.md)