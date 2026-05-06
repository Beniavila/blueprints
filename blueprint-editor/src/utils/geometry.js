/**
 * Devuelve el punto central de un nodo.
 * @param {{ x: number, y: number, w: number, h: number }} node
 * @returns {{ x: number, y: number }}
 */
export function centerOf(node) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

/**
 * Genera un path SVG de curva bezier entre dos puntos.
 * @param {{ x: number, y: number }} a
 * @param {{ x: number, y: number }} b
 * @returns {string}
 */
export function bezierPath(a, b) {
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
}

/**
 * Clamp un valor entre min y max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
