import React, { useEffect, useRef, useState } from "react";

function ToolbarMenu({ id, title, openMenuId, onToggle, children }) {
  const isOpen = openMenuId === id;

  return (
    <div className="relative" data-interactive="true">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={`cursor-pointer border rounded-sm px-3 py-1 text-blue-100 select-none ${
          isOpen ? "border-cyan-300 bg-blue-800" : "border-blue-500 bg-blue-900 hover:bg-blue-800"
        }`}
      >
        {title}
      </button>

      {isOpen ? (
        <div className="absolute mt-1 min-w-56 border border-blue-500 bg-blue-950/95 p-2 z-40 shadow-xl space-y-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({ label, onClick, disabled = false, tone = "normal" }) {
  const toneClass = tone === "danger"
    ? "border-red-400 text-red-200 hover:bg-red-900/40"
    : "border-blue-500 text-blue-100 hover:bg-blue-800";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left border rounded-sm px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed ${toneClass}`}
    >
      {label}
    </button>
  );
}

export function TopToolbar({
  zoomLabel,
  canAddChild,
  canManageChildren,
  canAlignSelection,
  connectMode,
  onAddParent,
  onAddChild,
  onDelete,
  onAutoSizeParent,
  onArrangeChildren,
  onAlignHorizontal,
  onAlignVertical,
  onToggleConnect
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const toolbarRef = useRef(null);

  const toggleMenu = (menuId) => {
    setOpenMenuId((current) => (current === menuId ? null : menuId));
  };

  const closeMenus = () => setOpenMenuId(null);

  const runAndClose = (action) => () => {
    action();
    closeMenus();
  };

  useEffect(() => {
    const handleOutsidePointerDown = (event) => {
      if (!toolbarRef.current?.contains(event.target)) {
        closeMenus();
      }
    };

    window.addEventListener("pointerdown", handleOutsidePointerDown);
    return () => window.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, []);

  return (
    <div
      ref={toolbarRef}
      data-interactive="true"
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute left-72 top-0 right-0 h-12 z-20 border-b border-blue-500 bg-blue-950/90 flex items-center justify-between px-4 font-mono text-xs"
    >
      <div className="flex items-center gap-2">
        <ToolbarMenu id="create" title="Crear" openMenuId={openMenuId} onToggle={toggleMenu}>
          <MenuButton label="+ Cuadro madre" onClick={runAndClose(onAddParent)} />
          <MenuButton label="+ Mini-cuadro dentro" onClick={runAndClose(onAddChild)} disabled={!canAddChild} />
          <MenuButton label="Eliminar seleccionado" onClick={runAndClose(onDelete)} tone="danger" />
        </ToolbarMenu>

        <ToolbarMenu id="arrange" title="Ordenar / Alinear" openMenuId={openMenuId} onToggle={toggleMenu}>
          <MenuButton
            label="Ordenar mini-cuadros en fila"
            onClick={runAndClose(onArrangeChildren)}
            disabled={!canManageChildren}
          />
          <MenuButton
            label="Autoajustar cuadro madre"
            onClick={runAndClose(onAutoSizeParent)}
            disabled={!canManageChildren}
          />
          <MenuButton
            label="Alinear horizontal"
            onClick={runAndClose(onAlignHorizontal)}
            disabled={!canAlignSelection}
          />
          <MenuButton
            label="Alinear vertical"
            onClick={runAndClose(onAlignVertical)}
            disabled={!canAlignSelection}
          />
        </ToolbarMenu>

        <ToolbarMenu id="connect" title="Conectar" openMenuId={openMenuId} onToggle={toggleMenu}>
          <MenuButton
            label={connectMode ? "Modo conectar: activo" : "Activar modo conectar"}
            onClick={runAndClose(onToggleConnect)}
          />
        </ToolbarMenu>
      </div>

      <div className="text-cyan-200">{zoomLabel}</div>
    </div>
  );
}
