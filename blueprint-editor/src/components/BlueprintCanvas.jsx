import React from "react";
import { BlueprintNode } from "./BlueprintNode";
import { CanvasEdges } from "./CanvasEdges";
import { WORKSPACE_GRID_SIZE, WORKSPACE_HEIGHT, WORKSPACE_WIDTH } from "../constants/workspace";

const SIDEBAR_WIDTH = 288; // 72 * 4 (w-72 en Tailwind)
const TOPBAR_HEIGHT = 48;  // h-12

/**
 * El canvas infinito: grid, aristas y nodos.
 * Recibe todos los handlers del exterior para mantener el estado centralizado.
 */
export function BlueprintCanvas({
  nodes,
  childNodesByParentId,
  edges,
  nodeMap,
  selectedId,
  selectedIds,
  connectMode,
  connectSource,
  scale,
  pos,
  onSelect,
  onUpdate,
  onStartDrag,
  onStartResize,
  onConnectClick
}) {
  const transform = `translate(${pos.x + SIDEBAR_WIDTH}px, ${pos.y + TOPBAR_HEIGHT}px) scale(${scale})`;

  return (
    <>
      <div
        data-wheel-zone="canvas"
        className="absolute left-72 top-12 right-0 bottom-0"
      />

      <div
        data-wheel-zone="canvas"
        className="absolute origin-top-left"
        style={{
          width: WORKSPACE_WIDTH,
          height: WORKSPACE_HEIGHT,
          transform
        }}
      >
        <div
          className="absolute inset-0 border border-blue-500/60"
          style={{
            backgroundImage:
              "linear-gradient(rgba(125,211,252,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.13) 1px, transparent 1px)",
            backgroundSize: `${WORKSPACE_GRID_SIZE}px ${WORKSPACE_GRID_SIZE}px`
          }}
        />

        <CanvasEdges edges={edges} nodeMap={nodeMap} width={WORKSPACE_WIDTH} height={WORKSPACE_HEIGHT} />

        <div className="absolute left-24 top-14 font-mono text-cyan-300 text-xs uppercase tracking-widest">
          Master Blueprint Canvas / editable map
        </div>

        {nodes.map((node) => (
          <BlueprintNode
            key={node.id}
            node={node}
            children={childNodesByParentId.get(node.id) ?? []}
            selectedIds={selectedIds}
            connectMode={connectMode}
            connectSource={connectSource}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onStartDrag={onStartDrag}
            onStartResize={onStartResize}
            onConnectClick={onConnectClick}
          />
        ))}
      </div>
    </>
  );
}
