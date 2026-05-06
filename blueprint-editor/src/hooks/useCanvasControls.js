import { useEffect, useRef, useState } from "react";
import { clamp } from "../utils/geometry";
import { createLogger } from "../utils/debugLogger";
import { saveActiveProjectBlueprint } from "../utils/projectStorage";

const SCALE_MIN = 0.18;
const SCALE_MAX = 1.8;
const ZOOM_IN_FACTOR = 1.1;
const ZOOM_OUT_FACTOR = 0.9;
const INTERACTIVE_SELECTOR = "button, input, textarea, select, label, [data-interactive='true']";
const CANVAS_WHEEL_ZONE_SELECTOR = "[data-wheel-zone='canvas']";
const NODE_DRAG_THRESHOLD_PX = 4;

const logger = createLogger("CanvasControls");

function shouldStartCanvasDrag(event) {
  const target = event.target;

  if (!(target instanceof Element)) {
    return true;
  }

  return !target.closest(INTERACTIVE_SELECTOR);
}

function shouldHandleCanvasWheel(event) {
  const target = event.target;

  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest(INTERACTIVE_SELECTOR)) {
    return false;
  }

  return Boolean(target.closest(CANVAS_WHEEL_ZONE_SELECTOR));
}

/**
 * Hook que gestiona los controles del canvas:
 * - Pan (arrastrar el canvas)
 * - Drag de nodos
 * - Zoom con rueda del ratón
 * - Focus en un nodo concreto
 */
export function useCanvasControls({
  moveNode,
  resizeNode,
  snapNodeToGrid,
  snapNodeSizeToGrid,
  initialViewport,
  containerRef
}) {
  const [scale, setScale] = useState(initialViewport?.scale ?? 0.55);
  const [pos, setPos] = useState(initialViewport?.pos ?? { x: -80, y: -40 });

  const dragCanvasRef = useRef({ active: false, x: 0, y: 0 });
  const dragNodeRef = useRef({ pressed: false, active: false, id: null, x: 0, y: 0 });
  const resizeNodeRef = useRef({ active: false, id: null, x: 0, y: 0 });

  useEffect(() => {
    saveActiveProjectBlueprint({
      viewport: {
        scale,
        pos
      }
    });
  }, [scale, pos]);

  useEffect(() => {
    const handleWindowPointerMove = (event) => {
      if (resizeNodeRef.current.active) {
        const dw = (event.clientX - resizeNodeRef.current.x) / scale;
        const dh = (event.clientY - resizeNodeRef.current.y) / scale;
        resizeNodeRef.current = { ...resizeNodeRef.current, x: event.clientX, y: event.clientY };
        resizeNode(resizeNodeRef.current.id, dw, dh);
        return;
      }

      if (dragNodeRef.current.pressed) {
        const rawDx = event.clientX - dragNodeRef.current.x;
        const rawDy = event.clientY - dragNodeRef.current.y;
        const movedEnough = Math.hypot(rawDx, rawDy) >= NODE_DRAG_THRESHOLD_PX;

        if (!dragNodeRef.current.active && !movedEnough) {
          return;
        }

        if (!dragNodeRef.current.active) {
          dragNodeRef.current = { ...dragNodeRef.current, active: true };
          logger.info("Node drag iniciado", {
            id: dragNodeRef.current.id,
            x: event.clientX,
            y: event.clientY
          });
        }

        const dx = (event.clientX - dragNodeRef.current.x) / scale;
        const dy = (event.clientY - dragNodeRef.current.y) / scale;
        dragNodeRef.current = { ...dragNodeRef.current, x: event.clientX, y: event.clientY };
        moveNode(dragNodeRef.current.id, dx, dy);
        return;
      }

      if (dragCanvasRef.current.active) {
        const dx = event.clientX - dragCanvasRef.current.x;
        const dy = event.clientY - dragCanvasRef.current.y;
        dragCanvasRef.current = { active: true, x: event.clientX, y: event.clientY };
        setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
      }
    };

    const handleWindowPointerUp = () => {
      const draggedId = dragNodeRef.current.active ? dragNodeRef.current.id : null;
      const resizedId = resizeNodeRef.current.active ? resizeNodeRef.current.id : null;

      dragCanvasRef.current.active = false;
      dragNodeRef.current = { pressed: false, active: false, id: null, x: 0, y: 0 };
      resizeNodeRef.current = { active: false, id: null, x: 0, y: 0 };
      logger.info("Pointer up: drag finalizado");

      if (draggedId) {
        snapNodeToGrid?.(draggedId);
      }

      if (resizedId) {
        snapNodeSizeToGrid?.(resizedId);
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [moveNode, resizeNode, scale, snapNodeSizeToGrid, snapNodeToGrid]);

  // ── Canvas pan ─────────────────────────────────────────────────────────────

  const handleCanvasPointerDown = (event) => {
    if (event.button !== 0) return;
    if (!shouldStartCanvasDrag(event)) {
      logger.info("Canvas drag ignorado: target interactivo", {
        tagName: event.target?.tagName,
        className: event.target?.className
      });
      return;
    }

    event.preventDefault();
    dragCanvasRef.current = { active: true, x: event.clientX, y: event.clientY };
    logger.info("Canvas drag iniciado", { x: event.clientX, y: event.clientY });
  };

  // ── Node drag ──────────────────────────────────────────────────────────────

  const handleNodePointerDown = (event, id) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragNodeRef.current = { pressed: true, active: false, id, x: event.clientX, y: event.clientY };
    logger.info("Node pointerdown", { id, x: event.clientX, y: event.clientY });
  };

  const handleNodeResizePointerDown = (event, id) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeNodeRef.current = { active: true, id, x: event.clientX, y: event.clientY };
    logger.info("Node resize iniciado", { id, x: event.clientX, y: event.clientY });
  };

  // ── Pointer move (canvas + node) ───────────────────────────────────────────

  const handlePointerMove = () => {};

  const handlePointerUp = () => {};

  // ── Zoom ───────────────────────────────────────────────────────────────────

  const handleWheel = (event) => {
    if (!shouldHandleCanvasWheel(event)) {
      return;
    }

    event.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const factor = event.deltaY > 0 ? ZOOM_OUT_FACTOR : ZOOM_IN_FACTOR;
    const nextScale = clamp(scale * factor, SCALE_MIN, SCALE_MAX);
    const worldX = (mouseX - pos.x) / scale;
    const worldY = (mouseY - pos.y) / scale;
    setScale(nextScale);
    setPos({ x: mouseX - worldX * nextScale, y: mouseY - worldY * nextScale });
    logger.info("Zoom actualizado", { scale: nextScale });
  };

  // ── Focus on node ──────────────────────────────────────────────────────────

  const focusNode = (node) => {
    if (!node) return;
    setPos({
      x: 520 - (node.x + node.w / 2) * scale,
      y: 360 - (node.y + node.h / 2) * scale
    });
  };

  return {
    scale,
    pos,
    handleCanvasPointerDown,
    handleNodePointerDown,
    handleNodeResizePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    focusNode
  };
}
