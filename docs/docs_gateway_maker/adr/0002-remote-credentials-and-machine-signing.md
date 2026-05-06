# ADR-0002 - Credenciales runtime remotas y firma de máquina

- Estado: Aceptado
- Fecha: 2026-04-30

## Contexto

La aplicación necesita credenciales válidas para autenticarse contra el gateway durante la secuencia serie. Estas credenciales no deben quedar hardcodeadas como verdad operativa permanente en el binario distribuido. Además, el backend debe poder distinguir qué máquina operadora solicita acceso.

## Decisión

Se decide que las credenciales runtime se obtengan desde un servicio remoto, usando:

- un `token_machine` persistido localmente tras el enrolado;
- una clave privada Ed25519 por máquina operadora;
- cabeceras firmadas (`X-Machine-Id`, `X-Timestamp`, `X-Nonce`, `X-Signature`, `X-Signature-Alg`) para autenticar la petición.

## Consecuencias

### Positivas

- Reduce la exposición de credenciales operativas fijas en el código distribuido.
- Permite trazabilidad y control por máquina enrolada.
- Hace posible rotar credenciales runtime sin redistribuir inmediatamente la aplicación.
- El uso de firma y nonce eleva el nivel de control sobre las solicitudes.

### Negativas

- La aplicación deja de ser plenamente autónoma: depende del backend para operar en condiciones normales.
- Aumenta la complejidad local de persistencia de secretos.
- Requiere gestionar compatibilidad entre Windows Credential Manager y fallback en archivos.

## Alternativas consideradas

- Incluir usuario/contraseña directamente en la app: rechazado por riesgo operativo.
- Solicitar credenciales manualmente al operario: rechazado por fricción y errores humanos.
- Usar solo un token sin firma: insuficiente para vincular la identidad del dispositivo operador.

## Seguimiento recomendado

Definir una política de rotación/revocación y documentar mejor el ciclo de vida del enrolado.
