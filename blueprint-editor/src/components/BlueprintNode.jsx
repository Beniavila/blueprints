import React from "react";
import { PARENT_LAYOUT } from "../constants/layout";

// ── Sub-componentes internos ──────────────────────────────────────────────────

function NodeHeader({ title, nodeId, onUpdate }) {
  return (
    <div className="border-b border-blue-500 px-3 py-2 font-mono text-xs font-bold tracking-widest text-blue-100 bg-blue-900/50">
      <input
        value={title}
        onChange={(e) => onUpdate(nodeId, { title: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full bg-transparent outline-none text-center"
      />
    </div>
  );
}

function ParentNotes({ notes }) {
  return (
    <div
      className="absolute left-2 right-2 rounded-sm border border-blue-500/70 bg-blue-900/35 px-3 py-2"
      style={{ top: 44, minHeight: PARENT_LAYOUT.notesHeight }}
    >
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-cyan-300">Notas</div>
      <div className="font-mono text-[10px] leading-tight text-blue-100 whitespace-pre-wrap break-words">
        {notes?.trim() ? notes : <span className="text-blue-400">Añade notas desde el panel lateral.</span>}
      </div>
    </div>
  );
}

function ChildBlueprintNode({
  node,
  selected,
  connectMode,
  connectSource,
  onSelect,
  onConnectClick,
  onUpdate,
  onStartDrag,
  onStartResize
}) {
  const isConnectSource = connectSource === node.id;
  const notesHeight = Math.max(24, node.h - 40);

  return (
    <div
      data-interactive="true"
      onPointerDown={(event) => {
        if (connectMode) {
          event.preventDefault();
          event.stopPropagation();
          onConnectClick(node.id);
          return;
        }

        event.preventDefault();
        onStartDrag(event, node.id);
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (connectMode) {
          return;
        }

        onSelect(node.id, {
          multi: event.shiftKey || event.ctrlKey || event.metaKey,
          toggle: event.shiftKey || event.ctrlKey || event.metaKey
        });
      }}
      className={[
        "absolute rounded-sm border bg-blue-900/80 p-2 text-left shadow-lg cursor-move",
        selected ? "border-cyan-200 ring-2 ring-cyan-300" : "border-blue-500",
        isConnectSource ? "ring-2 ring-cyan-300" : ""
      ].join(" ")}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
    >
      <input
        value={node.title}
        onChange={(e) => onUpdate(node.id, { title: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full bg-transparent outline-none font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-100"
      />
      <textarea
        value={node.notes}
        onChange={(e) => onUpdate(node.id, { notes: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ height: notesHeight }}
        className="mt-1 w-full resize-none overflow-hidden bg-transparent outline-none font-mono text-[10px] leading-tight text-blue-100"
      />

      <button
        type="button"
        data-interactive="true"
        onPointerDown={(event) => {
          event.stopPropagation();
          onStartResize(event, node.id);
        }}
        className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-cyan-300/40 bg-cyan-200/50 opacity-70 hover:opacity-100 cursor-se-resize"
        title="Redimensionar mini-cuadro"
      />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * Representa un bloque individual del blueprint en el canvas.
 *
 * @param {{ node, selected, connectMode, connectSource, onSelect, onUpdate, onStartDrag, onConnectClick }} props
 */
export function BlueprintNode({
  node,
  children = [],
  selectedIds,
  connectMode,
  connectSource,
  onSelect,
  onUpdate,
  onStartDrag,
  onStartResize,
  onConnectClick
}) {
  const isConnectSource = connectSource === node.id;
  const isSelected = selectedIds.includes(node.id);
  const childAreaTop = PARENT_LAYOUT.childAreaTop;
  const childAreaHeight = Math.max(PARENT_LAYOUT.childAreaMinHeight, node.h - childAreaTop - PARENT_LAYOUT.bottomPadding);

  const handleClick = (e) => {
    e.stopPropagation();
    if (connectMode) onConnectClick(node.id);
    else {
      onSelect(node.id, {
        multi: e.shiftKey || e.ctrlKey || e.metaKey,
        toggle: e.shiftKey || e.ctrlKey || e.metaKey
      });
    }
  };

  return (
    <div
      data-interactive="true"
      onPointerDown={(e) => {
        if (connectMode) {
          e.preventDefault();
          e.stopPropagation();
          onConnectClick(node.id);
          return;
        }

        e.preventDefault();
        onStartDrag(e, node.id);
      }}
      onClick={handleClick}
      className={[
        "absolute rounded-sm bg-blue-950 text-blue-100 shadow-xl border",
        isSelected ? "border-white" : "border-blue-400",
        isConnectSource ? "ring-2 ring-cyan-300" : ""
      ].join(" ")}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
    >
      <NodeHeader title={node.title} nodeId={node.id} onUpdate={onUpdate} />
      <ParentNotes notes={node.notes} />

      <div
        className="absolute left-2 right-2"
        style={{ top: childAreaTop, height: childAreaHeight }}
      >
        {children.map((childNode) => (
          <ChildBlueprintNode
            key={childNode.id}
            node={childNode}
              selected={selectedIds.includes(childNode.id)}
            connectMode={connectMode}
            connectSource={connectSource}
            onSelect={onSelect}
            onConnectClick={onConnectClick}
            onUpdate={onUpdate}
            onStartDrag={onStartDrag}
              onStartResize={onStartResize}
          />
        ))}
      </div>

      <button
        type="button"
        data-interactive="true"
        onPointerDown={(event) => {
          event.stopPropagation();
          onStartResize(event, node.id);
        }}
        className="absolute bottom-1 right-1 h-3 w-3 rounded-full border border-cyan-300/40 bg-cyan-200/50 opacity-70 hover:opacity-100 cursor-se-resize"
        title="Redimensionar cuadro madre"
      />
    </div>
  );
}
