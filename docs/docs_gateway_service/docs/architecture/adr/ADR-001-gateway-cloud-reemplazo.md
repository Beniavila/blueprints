# ADR-001 — Gateway-Cloud cubre las telecomunicaciones de instalaciones con mini gateways

## Estado
Aceptado (actualizado por ADR-034)

## Contexto
Las instalaciones pequeñas no justifican el coste de un gateway completo, pero requieren la misma funcionalidad. El gateway tradicional de calle y el gateway-cloud comparten la misma lógica de handlers, lo que implicaría duplicación y coste de mantenimiento doble si esa lógica se implementara en ambos proyectos.

## Decisión
Gateway-Cloud actúa como **capa de telecomunicaciones**: recibe mensajes MQTT de los mini gateways y del backend, gestiona el routing hacia los brokers MQTT y backends correspondientes, y delega toda la lógica de negocio al **Logic Engine** (contenedor independiente, repo separado) vía gRPC.

Gateway-Cloud no contiene lógica de handlers, cálculo de consumos ni decisiones de persistencia. Esa responsabilidad recae exclusivamente en el Logic Engine.

## Consecuencias
- Centralización de las telecomunicaciones en cloud
- La lógica de negocio reside en un único lugar (Logic Engine), compartida con el gateway de calle
- Cualquier cambio en handlers o reglas de procesamiento solo requiere actualizar el Logic Engine
- Aumento de carga en cloud
- Necesidad de escalar horizontalmente
- Se introduce dependencia de red gRPC inter-contenedor (aceptable dado que son co-ubicados)