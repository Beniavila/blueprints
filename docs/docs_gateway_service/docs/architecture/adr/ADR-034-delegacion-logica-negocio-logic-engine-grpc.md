# ADR-034 — Delegación de lógica de negocio al Logic Engine vía gRPC

## Estado
Aceptado

## Contexto

En el diseño original, Gateway-Cloud replicaba completamente la lógica funcional del gateway tradicional de calle (ADR-001). Esto significa que cualquier cambio en los handlers de procesamiento de mensajes (status, consumos, alarmas, etc.) debería aplicarse en dos proyectos distintos: el gateway de calle y el gateway-cloud. Esta duplicación viola los principios DRY (Don't Repeat Yourself) y SOLID, introduce riesgo de inconsistencias y aumenta el coste de mantenimiento.

ADR-009 ya anticipaba la necesidad de un "core compartido" para evitar duplicación de lógica. La presente decisión materializa ese concepto.

## Decisión

Se extrae toda la lógica de negocio de los handlers (procesamiento de mensajes, cálculo de consumos, evaluación de alarmas, decisiones de persistencia) a un contenedor Docker independiente denominado **Logic Engine**, alojado en un repositorio separado.

Gateway-Cloud pasa a ser una **capa pura de telecomunicaciones**: recibe y envía mensajes por MQTT, gestiona el routing por servidor MQTT asociado al nodo, y delega toda la lógica de negocio al Logic Engine mediante llamadas **gRPC**.

### Contrato gRPC

La forma canónica del contrato debe ser un request lógico genérico y una
respuesta basada en acciones. En esta ADR se fija la intención arquitectónica;
el detalle exacto del proto puede evolucionar durante la migración para
convivir con el gateway actual.

Forma conceptual mínima:

```
MessageRequest {
  node_id:       string
  gateway_id:    string
  event_type:    enum (NODE_MESSAGE, BACKEND_COMMAND, NODE_TIMEOUT)
  payload:       bytes
}
```

El Logic Engine responde conceptualmente con:

```
ActionList {
  actions: []Action
}

Action {
  type:    enum (SEND_TO_BACKEND, SEND_TO_NODE, IGNORE)
  payload: bytes
}
```

En la implementación actual del proto puede existir:

- un RPC canónico tipo `HandleEvent(LogicRequest)`;
- RPCs legacy adicionales para simplificar la convivencia con el gateway
  actual.

Gateway-Cloud interpreta cada acción devuelta y la ejecuta a través de su capa de routing:
- `SEND_TO_BACKEND` → publica al backend correspondiente
- `SEND_TO_NODE` → publica al mini gateway del nodo vía MQTT
- `IGNORE` → descarta el mensaje sin acción

### Ubicación del Logic Engine

El Logic Engine es un contenedor independiente con su propio repositorio. Los internals (pipeline de handlers, estado de negocio, cálculo de consumos) se documentan en ese repositorio. Gateway-Cloud solo conoce la interfaz gRPC.

En despliegue local (desarrollo/producción mínima), ambos contenedores corren en el mismo Docker Compose. La latencia de red inter-contenedor es asumida como aceptable dada la co-ubicación.

### Eventos de timeout de nodo

Cuando el node worker de Gateway-Cloud detecta que un nodo ha superado el tiempo de inactividad (ADR-033), en lugar de ejecutar lógica de cierre localmente, envía al Logic Engine un evento `NODE_TIMEOUT` para que ejecute el cierre de sesión del nodo (cálculo final de consumos, etc.) y devuelva las acciones a ejecutar.

## Consecuencias

- Única fuente de verdad para la lógica de negocio: tanto el gateway de calle como Gateway-Cloud usan el mismo Logic Engine
- Gateway-Cloud queda como capa telecom sin lógica de negocio propia
- Los cambios en handlers solo requieren actualizar el repositorio del Logic Engine
- Se introduce dependencia de red inter-contenedor (gRPC): aceptable dado que son co-ubicados
- El testing de lógica y el testing de telecomunicaciones se pueden hacer de forma independiente
- El estado de negocio (consumos raw, alarmas en curso, estado de sesión) pasa a ser responsabilidad del Logic Engine
- Gateway-Cloud conserva en Redis solo estado de telecomunicaciones: asociación `nodo ↔ mini gateway` y resolución `nodo → servidor MQTT`

## ADRs supersedidos por esta decisión

- ADR-022: Pipeline de handlers con dispatch por tipo de mensaje (ahora vive en Logic Engine)
- ADR-023: Estado en memoria por nodo con responsabilidad en Redis (estado de negocio pasa a Logic Engine)
- ADR-024: Inicialización de estado por nodo con fallback de Redis (ídem)
- ADR-025: Procesamiento de consumos por sesión de nodo (ídem)
- ADR-026: Resiliencia de consumos en el nodo (ídem)
