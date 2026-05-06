# ADR-02: Elección de Postgres como base de datos

## 1. Contexto

Ender almacena:

- campañas OTAP,  
- gateways,  
- nodos y sus metadatos,  
- estados de ejecución,  
- logs y eventos de proceso,  
- referencias a firmware,  
- datos por organización.

El dominio es fuertemente relacional y requiere:

- consistencia estricta,  
- consultas complejas,  
- trazabilidad histórica,  
- índices eficientes,  
- almacenamiento estructurado y semiestructurado (JSON),  
- fiabilidad ante fallos.

Sistemas NoSQL o bases más simples no cumplen estos requisitos.

---

## 2. Decisión

Adoptar **Postgres** como base de datos principal de Ender.

Postgres almacenará:

- información de campañas  
- nodos y gateways  
- estados de fases OTAP  
- historial de eventos  
- metadatos de firmware  
- pertenencia a organizaciones  

---

## 3. Alternativas consideradas

### MySQL / MariaDB
- ❌ JSON menos potente  
- ❌ Peor soporte para queries complejas  
- ✔ Relacional, pero menos flexible para este dominio

### SQLite
- ❌ No adecuado para concurrencia alta  
- ❌ Limitado para workflows distribuidos  
- ✔ Útil en entornos embebidos, no en este caso

### MongoDB / Document DB
- ❌ No aptos para consistencia fuerte  
- ❌ Difícil gestionar transacciones multi-entidad  
- ✔ Buenos para telemetría, pero no para orquestación crítica

---

## 4. Consecuencias

### Positivas
- ACID fuerte: garantiza consistencia del estado de campañas.  
- JSONB eficiente para estados semiestructurados.  
- Escalabilidad con réplicas y particiones.  
- Integración excelente con Go.  
- Robustez operativa y auditoría avanzada.

### Negativas
- Requiere operar un servidor SQL estándar.  

---

## 5. Estado futuro

Postgres permitirá:

- particiones por organización,  
- materialized views para dashboards,  
- uso de índices GIN para búsquedas rápidas,  
- migración sencilla a clusters HA.

**Conclusión:** Postgres cumple perfectamente las necesidades relacionales, de fiabilidad y de auditoría que requiere Ender.


---

[Volver al README](../../README.md)