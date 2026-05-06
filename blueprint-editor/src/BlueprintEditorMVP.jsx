import React, { useRef } from "react";
import { useBlueprintState } from "./hooks/useBlueprintState";
import { useCanvasControls } from "./hooks/useCanvasControls";
import { Sidebar } from "./components/Sidebar";
import { BlueprintCanvas } from "./components/BlueprintCanvas";
import { TopToolbar } from "./components/TopToolbar";
import { createLogger } from "./utils/debugLogger";

const logger = createLogger("EditorMVP");

/**
 * Orquestador principal del Blueprint Editor.
 * Responsabilidad única: conectar hooks con componentes de UI.
 * Toda la lógica de negocio vive en los hooks; toda la UI en los componentes.
 */
export default function BlueprintEditorMVP() {
  const containerRef = useRef(null);

  const {
    nodes,
    rootNodes,
    edges,
    selectedId,
    selectedIds,
    selectedNode,
    nodeMap,
    childNodesByParentId,
    connectMode,
    connectSource,
    viewport,
    setSelectedId,
    selectNode,
    updateNode,
    addNode,
    deleteNode,
    moveNode,
    resizeNode,
    snapNodeToGrid,
    snapNodeSizeToGrid,
    autoSizeParent,
    arrangeChildrenHorizontally,
    alignSelectedHorizontally,
    alignSelectedVertically,
    toggleConnectMode,
    handleConnectClick
  } = useBlueprintState();

  const {
    scale,
    pos,
    handleCanvasPointerDown,
    handleNodePointerDown,
    handleNodeResizePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    focusNode
  } = useCanvasControls({
    moveNode,
    resizeNode,
    snapNodeToGrid,
    snapNodeSizeToGrid,
    initialViewport: viewport,
    containerRef
  });

  const handleAddParentNode = () => {
    logger.info("Click: + Cuadro madre");
    addNode(
      {
        kind: "parent",
        viewportCenter: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        scale,
        pos
      }
    );
  };

  const handleAddChildNode = () => {
    logger.info("Click: + Mini-cuadro dentro", { selectedId });
    const parentNode = selectedNode?.type === "child"
      ? nodeMap.get(selectedNode.parentId)
      : selectedNode;

    if (!parentNode) {
      logger.warn("No hay cuadro madre seleccionado para crear mini-cuadro");
      return;
    }

    setSelectedId(parentNode.id);
    addNode({ kind: "child", parentId: parentNode.id });
  };

  const handleFocusNode = (node) => {
    logger.info("Focus node", { id: node.id, type: node.type });
    selectNode(node.id);

    if (node.type === "child") {
      const parentNode = nodeMap.get(node.parentId);
      focusNode(parentNode ?? node);
      return;
    }

    focusNode(node);
  };

  const handleFocusNodeFromSidebar = (node, event) => {
    const isMulti = Boolean(event?.shiftKey || event?.ctrlKey || event?.metaKey);

    selectNode(node.id, { multi: isMulti, toggle: isMulti });

    if (node.type === "child") {
      const parentNode = nodeMap.get(node.parentId);
      focusNode(parentNode ?? node);
      return;
    }

    focusNode(node);
  };

  const selectedParentId = selectedNode?.type === "child"
    ? selectedNode.parentId
    : selectedNode?.id;

  return (
    <main
      ref={containerRef}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className="w-full h-screen overflow-hidden bg-blue-950 text-blue-100 relative cursor-grab active:cursor-grabbing select-none"
    >
      <Sidebar
        nodes={rootNodes.map((node) => ({
          ...node,
          children: childNodesByParentId.get(node.id) ?? []
        }))}
        selectedIds={selectedIds}
        selectedNode={selectedNode}
        onFocus={handleFocusNodeFromSidebar}
        onUpdate={updateNode}
      />

      <TopToolbar
        zoomLabel={`Zoom ${(scale * 100).toFixed(0)}%`}
        canAddChild={Boolean(selectedNode)}
        canManageChildren={Boolean(selectedParentId)}
        canAlignSelection={selectedIds.length > 1}
        connectMode={connectMode}
        onAddParent={handleAddParentNode}
        onAddChild={handleAddChildNode}
        onDelete={() => deleteNode(selectedId)}
        onAutoSizeParent={() => autoSizeParent(selectedParentId)}
        onArrangeChildren={() => arrangeChildrenHorizontally(selectedParentId)}
        onAlignHorizontal={alignSelectedHorizontally}
        onAlignVertical={alignSelectedVertically}
        onToggleConnect={toggleConnectMode}
      />

      <BlueprintCanvas
        nodes={rootNodes}
        childNodesByParentId={childNodesByParentId}
        edges={edges}
        nodeMap={nodeMap}
        selectedId={selectedId}
        selectedIds={selectedIds}
        connectMode={connectMode}
        connectSource={connectSource}
        scale={scale}
        pos={pos}
        onSelect={selectNode}
        onUpdate={updateNode}
        onStartDrag={handleNodePointerDown}
        onStartResize={handleNodeResizePointerDown}
        onConnectClick={handleConnectClick}
      />
    </main>
  );
}
