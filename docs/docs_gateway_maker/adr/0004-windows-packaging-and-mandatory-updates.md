# ADR-0004 - Empaquetado Windows con PyInstaller y actualización obligatoria

- Estado: Aceptado
- Fecha: 2026-04-30

## Contexto

La herramienta se distribuye a usuarios operativos que probablemente no ejecutan el proyecto como entorno Python editable. Además, ciertas capacidades relevantes del proyecto dependen de Windows, como la automatización de Word para imprimir etiquetas y el modelo de auto-actualización del ejecutable.

## Decisión

Se decide:

- empaquetar la aplicación para Windows con PyInstaller;
- distribuir un ejecutable `GatewayMaker.exe`;
- consultar al arranque un endpoint `latest.json`;
- bloquear el uso si existe una actualización obligatoria disponible;
- descargar un ZIP, verificar `sha256` y reemplazar el ejecutable mediante un script PowerShell temporal.

## Consecuencias

### Positivas

- Reduce la fricción de instalación para usuarios finales.
- Permite controlar la versión operativa mínima en campo.
- El hash SHA-256 introduce una verificación básica de integridad.
- Mantiene alineada la base instalada cuando hay cambios incompatibles o urgentes.

### Negativas

- El flujo de update es específico de Windows.
- El reemplazo del ejecutable añade complejidad operativa y puntos de fallo.
- La actualización obligatoria puede bloquear el uso ante fallos de red o del backend.
- El proceso depende de artefactos bien formados: ZIP válido y `GatewayMaker.exe` en raíz.

## Alternativas consideradas

- Distribución solo como script Python: insuficiente para usuarios finales operativos.
- Actualizaciones manuales: menor complejidad técnica, peor control de versiones.
- Instalador completo MSI: posible en el futuro, pero con mayor coste de mantenimiento.

## Seguimiento recomendado

Documentar el proceso de publicación de releases y separar mejor la lógica de update del resto de la UI.
