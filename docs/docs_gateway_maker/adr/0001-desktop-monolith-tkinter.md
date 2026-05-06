# ADR-0001 - Aplicación de escritorio monolítica en Python/Tkinter

- Estado: Aceptado
- Fecha: 2026-04-30

## Contexto

La herramienta debe ejecutarse en el equipo del operario, interactuar con puertos serie locales, mostrar una UI sencilla y operar con baja fricción en entornos de fabricación/soporte. También necesita integrarse con impresoras y, en Windows, con Microsoft Word y el almacén de credenciales del sistema.

El código actual concentra la mayor parte de la lógica en `gateway_serial_tool.py`.

## Decisión

Se adopta una **aplicación de escritorio monolítica en Python con Tkinter** como forma principal de entrega y ejecución.

## Consecuencias

### Positivas

- Despliegue simple: un único script en desarrollo y un único `.exe` en distribución.
- Acceso directo a puertos serie, sistema de archivos, procesos y APIs del sistema operativo.
- Tkinter evita introducir un runtime adicional pesado para una UI operativa básica.
- Facilita la ejecución offline parcial cuando el hardware está conectado localmente.

### Negativas

- Alto acoplamiento entre UI, dominio, infraestructura y seguridad.
- Menor testabilidad por la mezcla de responsabilidades.
- Escalado funcional más difícil si crecen flujos, destinos o variantes de hardware.
- La mantenibilidad depende de disciplina interna, no de fronteras modulares fuertes.

## Alternativas consideradas

- Aplicación web local: descartada por complejidad extra para acceso a serie e impresión.
- Reescritura con framework desktop más complejo: no aportaba suficiente valor inmediato.
- Separación en varios servicios/procesos: excesiva para el tamaño y entorno operativo actual.

## Seguimiento recomendado

Extraer gradualmente módulos internos sin romper el modelo de entrega monolítico.
