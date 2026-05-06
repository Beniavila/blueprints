import React from "react";
import { bezierPath, centerOf } from "../utils/geometry";
import { PARENT_LAYOUT } from "../constants/layout";

function getAbsoluteNodeRect(node, nodeMap) {
  if (!node) return null;

  if (node.type !== "child") {
    return node;
  }

  const parentNode = nodeMap.get(node.parentId);
  if (!parentNode) {
    return null;
  }

  return {
    ...node,
    x: parentNode.x + node.x,
    y: parentNode.y + PARENT_LAYOUT.childAreaTop + node.y
  };
}

/**
 * Renderiza las aristas (conexiones entre nodos) como paths SVG con flechas.
 *
 * @param {{ edges: Array, nodeMap: Map }} props
 */
export function CanvasEdges({ edges, nodeMap, width, height }) {
  return (
    <svg className="absolute inset-0" width={width} height={height}>
      <defs>
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#7dd3fc" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const from = getAbsoluteNodeRect(nodeMap.get(edge.from), nodeMap);
        const to = getAbsoluteNodeRect(nodeMap.get(edge.to), nodeMap);
        if (!from || !to) return null;

        return (
          <path
            key={edge.id}
            d={bezierPath(centerOf(from), centerOf(to))}
            fill="none"
            stroke="#7dd3fc"
            strokeWidth="2"
            strokeDasharray="6 4"
            markerEnd="url(#arrow)"
          />
        );
      })}
    </svg>
  );
}
