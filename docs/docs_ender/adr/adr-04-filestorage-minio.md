# ADR-004: Elección de MinIO como sistema de almacenamiento de firmware OTAP

## 1. Contexto

El sistema Ender necesita almacenar archivos de firmware OTAP para diferentes tipos de nodos.  
Los workflows OTAP requieren acceder varias veces al firmware durante la campaña, especialmente por parte de los workers OTAP encargados de enviar los archivos al gateway.

Requisitos del almacenamiento:

- Funcionamiento completamente local / on-premise (no usar servicios externos).
- Acceso concurrente por múltiples workers.
- APIs claras para subir/descargar firmware.
- Persistencia y trazabilidad de versiones.
- Integración sencilla con Go.
- Preparado para migrar a S3 real en el futuro sin cambiar código.

El almacenamiento en disco local del backend fue descartado por:
- falta de compartición entre workers,
- difícil escalabilidad,
- dependencias en el contenedor.

Postgres como BLOB también descartado por:
- bajo rendimiento para archivos grandes,
- mala práctica en sistemas IoT,
- sobrecarga innecesaria en la base de datos.

---

## 2. Decisión

Adoptar **MinIO** como servidor interno S3-compatible para almacenar firmware OTAP.

Los archivos se guardarán en un bucket dedicado, y cada firmware tendrá metadatos en Postgres:

- tipo de nodo  
- versión  
- checksum  
- tamaño  
- URL S3 interna  
- organización asociada (si aplica)

Los workers OTAP descargarán el archivo desde MinIO cuando necesiten enviarlo al gateway.

---

## 3. Alternativas consideradas

### Disco local
- ❌ No accesible para múltiples workers  
- ❌ No escalable  
- ❌ No versionado

### Amazon S3
- ❌ Requiere servicio externo  
- ❌ No encaja con despliegues on-premise  
- ✔ Misma API que MinIO

### Postgres BLOB
- ❌ Menor rendimiento  
- ❌ Sobre carga en DB  
- ❌ No escalable  
- ❌ Mala práctica para binarios

---

## 4. Consecuencias

### Positivas
- S3-compatible → integración directa con SDK de Go.  
- Fácil de usar en Docker Compose.  
- Workers distribuidos pueden acceder al mismo firmware.  
- Escalable y preparado para producción.  
- Migración futura a S3 trivial.  
- Separación clara de responsabilidades (storage ≠ lógica de negocio).

### Negativas
- Añade un servicio más a desplegar.  
- Necesita gestión de credenciales internas.  

---

## 5. Estado futuro

MinIO permitirá:

- control de versiones de firmware  
- almacenamiento multi-organización  
- auditoría de usos  
- prefirmado de URLs  
- CI/CD de firmware en el futuro

---

**Conclusión:** MinIO es la mejor solución para un almacenamiento interno, escalable y seguro de firmware OTAP en Ender.

---

[Volver al README](../../README.md)