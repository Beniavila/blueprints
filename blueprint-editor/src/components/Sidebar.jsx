import React from "react";
import { PARENT_LAYOUT } from "../constants/layout";

const MINIMAP_WORLD_PADDING = 120;

function buildMinimapEntities(nodes) {
  const entities = [];

  nodes.forEach((node) => {
    entities.push({
      id: node.id,
      type: "parent",
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
      ref: node
    });

    (node.children ?? []).forEach((childNode) => {
      entities.push({
        id: childNode.id,
        type: "child",
        x: node.x + childNode.x,
        y: node.y + PARENT_LAYOUT.childAreaTop + childNode.y,
        w: childNode.w,
        h: childNode.h,
        ref: childNode
      });
    });
  });

  return entities;
}

function getMinimapBounds(entities) {
  if (!entities.length) {
    return {
      minX: 0,
      minY: 0,
      width: 1,
      height: 1
    };
  }

  const minX = Math.min(...entities.map((item) => item.x)) - MINIMAP_WORLD_PADDING;
  const minY = Math.min(...entities.map((item) => item.y)) - MINIMAP_WORLD_PADDING;
  const maxX = Math.max(...entities.map((item) => item.x + item.w)) + MINIMAP_WORLD_PADDING;
  const maxY = Math.max(...entities.map((item) => item.y + item.h)) + MINIMAP_WORLD_PADDING;

  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

// ── Sub-componentes del Sidebar ───────────────────────────────────────────────

function SidebarHeader() {
  return (
    <div className="flex items-center justify-between border-b border-blue-500 pb-3 mb-4">
      <div>
        <div className="text-blue-300 tracking-widest text-[10px]">BUSINESS BLUEPRINT</div>
        <div className="font-bold text-blue-50">Editor MVP</div>
      </div>
      <div className="border border-blue-400 rounded px-2 py-1 text-blue-200">v0.1</div>
    </div>
  );
}

function SidebarNodeList({ nodes, selectedIds, onFocus }) {
  return (
    <div className="mb-5">
      <div className="text-blue-300 tracking-widest text-[10px] mb-2">SECCIONES</div>
      <div className="space-y-2">
        {nodes.map((node) => (
          <div key={node.id} className="space-y-1">
            <button
              onClick={(event) => onFocus(node, event)}
              className={`w-full text-left border rounded-sm px-3 py-2 leading-tight ${
                selectedIds.includes(node.id) ? "border-white bg-blue-800" : "border-blue-600 bg-blue-950"
              }`}
            >
              <div>{node.title}</div>
              <div className="text-[10px] text-blue-300 uppercase tracking-widest">Cuadro madre</div>
            </button>

            {node.children?.length ? (
              <div className="pl-3 space-y-1">
                {node.children.map((childNode) => (
                  <button
                    key={childNode.id}
                    onClick={(event) => onFocus(childNode, event)}
                    className={`w-full text-left border rounded-sm px-3 py-2 leading-tight ${
                      selectedIds.includes(childNode.id) ? "border-cyan-200 bg-blue-800/90" : "border-blue-700 bg-blue-950/80"
                    }`}
                  >
                    <div>{childNode.title}</div>
                    <div className="text-[10px] text-cyan-300 uppercase tracking-widest">Mini-cuadro</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarMinimap({ nodes, selectedIds, onFocus }) {
  const entities = buildMinimapEntities(nodes);
  const bounds = getMinimapBounds(entities);

  const toPercentRect = (entity) => ({
    left: `${((entity.x - bounds.minX) / bounds.width) * 100}%`,
    top: `${((entity.y - bounds.minY) / bounds.height) * 100}%`,
    width: `${Math.max((entity.w / bounds.width) * 100, 1.2)}%`,
    height: `${Math.max((entity.h / bounds.height) * 100, 1.2)}%`
  });

  return (
    <div className="mb-5">
      <div className="text-blue-300 tracking-widest text-[10px] mb-2">MINIMAPA</div>
      <div className="relative w-full h-40 border border-blue-500 bg-blue-900/40 overflow-hidden">
        {entities.map((entity) => (
          <button
            key={entity.id}
            onClick={(event) => onFocus(entity.ref, event)}
            className={`absolute border ${
              entity.type === "parent"
                ? selectedIds.includes(entity.id)
                  ? "border-white bg-cyan-400"
                  : "border-blue-300 bg-blue-700"
                : selectedIds.includes(entity.id)
                  ? "border-cyan-100 bg-cyan-300"
                  : "border-blue-500 bg-blue-800"
            }`}
            style={toPercentRect(entity)}
          />
        ))}
      </div>
    </div>
  );
}

function SidebarNodeEditor({ selectedNode, onUpdate }) {
  return (
    <div>
      <div className="text-blue-300 tracking-widest text-[10px] mb-2">EDITAR SELECCION</div>
      {selectedNode ? (
        <div className="space-y-3">
          <label className="block">
            <span className="text-blue-300">Titulo</span>
            <input
              value={selectedNode.title}
              onChange={(e) => onUpdate(selectedNode.id, { title: e.target.value })}
              className="mt-1 w-full border border-blue-500 bg-blue-900 p-2 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-blue-300">Notas</span>
            <textarea
              value={selectedNode.notes}
              onChange={(e) => onUpdate(selectedNode.id, { notes: e.target.value })}
              className="mt-1 w-full h-20 border border-blue-500 bg-blue-900 p-2 outline-none resize-none"
            />
          </label>
          {selectedNode.type === "child" ? (
            <div className="text-[10px] uppercase tracking-widest text-cyan-300">
              El mini-cuadro pertenece a su cuadro madre; al crear otro se añadirá ahí.
            </div>
          ) : (
            <div className="text-[10px] uppercase tracking-widest text-blue-400">
              Los mini-cuadros se crean dentro del cuadro madre seleccionado.
            </div>
          )}
        </div>
      ) : (
        <div className="text-blue-300">Selecciona un cuadro.</div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * Panel lateral izquierdo con controles, lista de nodos, minimapa y editor.
 */
export function Sidebar({
  nodes,
  selectedIds,
  selectedNode,
  onFocus,
  onUpdate
}) {
  return (
    <aside
      data-interactive="true"
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute left-0 top-0 bottom-0 w-72 z-30 bg-blue-950/95 border-r border-blue-500 p-4 font-mono text-xs overflow-y-auto"
    >
      <SidebarHeader />
      <SidebarNodeList nodes={nodes} selectedIds={selectedIds} onFocus={onFocus} />
      <SidebarMinimap nodes={nodes} selectedIds={selectedIds} onFocus={onFocus} />
      <SidebarNodeEditor selectedNode={selectedNode} onUpdate={onUpdate} />
    </aside>
  );
}
