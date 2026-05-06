const DEBUG_ENABLED = true;

/**
 * Logger simple por dominio para mantener trazas consistentes.
 * SRP: una única responsabilidad (telemetría de depuración).
 */
export function createLogger(scope) {
  const prefix = `[Blueprint:${scope}]`;

  return {
    info(message, payload) {
      if (!DEBUG_ENABLED) return;
      if (payload === undefined) {
        console.info(prefix, message);
        return;
      }
      console.info(prefix, message, payload);
    },
    warn(message, payload) {
      if (!DEBUG_ENABLED) return;
      if (payload === undefined) {
        console.warn(prefix, message);
        return;
      }
      console.warn(prefix, message, payload);
    }
  };
}
