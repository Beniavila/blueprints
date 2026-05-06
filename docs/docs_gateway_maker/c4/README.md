# Arquitectura C4

Esta carpeta describe la arquitectura del proyecto **Gateway Maker** usando una adaptación ligera del modelo C4.

## Objetivo del sistema

Gateway Maker es una aplicación de escritorio en Python que automatiza la puesta en marcha de gateways conectados por puerto serie. La herramienta:

- detecta el puerto del gateway;
- autentica contra el dispositivo;
- descarga y ejecuta un `autorun.sh` según destino/cluster;
- obtiene credenciales de ejecución desde un backend remoto;
- permite enrolar la máquina operadora;
- imprime etiquetas con `GW_ID` y puerto detectado;
- en Windows, puede aplicar actualizaciones obligatorias del binario distribuido.

## Documentos

- [01. Contexto del sistema](system-context.md)
- [02. Contenedores](container.md)
- [03. Componentes](component-gateway-serial-tool.md)

## Alcance

La arquitectura actual está implementada casi por completo dentro de un único ejecutable/script principal: `gateway_serial_tool.py`. Por eso el modelo C4 se centra más en responsabilidades lógicas e integraciones externas que en una separación fuerte por servicios internos.
