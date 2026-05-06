import { useEffect, useMemo, useState } from "react";
import { createLogger } from "../utils/debugLogger";
import { PARENT_LAYOUT } from "../constants/layout";
import { WORKSPACE_GRID_SIZE, WORKSPACE_HEIGHT, WORKSPACE_WIDTH } from "../constants/workspace";
import { loadActiveProjectBlueprint, saveActiveProjectBlueprint } from "../utils/projectStorage";

const logger = createLogger("BlueprintState");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function snapToGrid(value) {
  return Math.round(value / WORKSPACE_GRID_SIZE) * WORKSPACE_GRID_SIZE;
}

function estimateWrappedLines(text, maxCharsPerLine) {
  const source = String(text ?? "");
  const rawLines = source.split("\n");

  return rawLines.reduce((total, rawLine) => {
    const lineLength = rawLine.length || 1;
    return total + Math.max(1, Math.ceil(lineLength / maxCharsPerLine));
  }, 0);
}

function getChildHeightFromContent(node) {
  const titleLines = estimateWrappedLines(node.title, 18);
  const noteLines = estimateWrappedLines(node.notes, 24);

  const estimatedHeight =
    12 + // top padding visual
    titleLines * 12 +
    8 + // gap título->nota
    noteLines * 12 +
    12; // bottom padding visual

  return Math.max(PARENT_LAYOUT.childHeight, estimatedHeight);
}

function resolveParentId(node) {
  if (!node) return null;
  return node.type === "child" ? node.parentId : node.id;
}

function getRequiredParentSize(nodes, parentNode) {
  const childNodes = nodes.filter(
    (node) => node.type === "child" && node.parentId === parentNode.id
  );

  if (!childNodes.length) {
    return {
      width: PARENT_LAYOUT.minWidth,
      height: PARENT_LAYOUT.minHeight
    };
  }

  const maxRight = Math.max(...childNodes.map((node) => node.x + node.w));
  const maxBottom = Math.max(...childNodes.map((node) => node.y + node.h));

  const rawWidth = Math.max(PARENT_LAYOUT.minWidth, maxRight + PARENT_LAYOUT.sidePadding * 2);
  const childAreaHeight = Math.max(
    PARENT_LAYOUT.childAreaMinHeight,
    maxBottom + PARENT_LAYOUT.sidePadding
  );
  const rawHeight = Math.max(
    PARENT_LAYOUT.minHeight,
    PARENT_LAYOUT.childAreaTop + childAreaHeight + PARENT_LAYOUT.notesHeight + PARENT_LAYOUT.bottomPadding
  );

  return {
    width: clamp(
      rawWidth,
      PARENT_LAYOUT.minWidth,
      Math.max(PARENT_LAYOUT.minWidth, WORKSPACE_WIDTH - parentNode.x)
    ),
    height: clamp(
      rawHeight,
      PARENT_LAYOUT.minHeight,
      Math.max(PARENT_LAYOUT.minHeight, WORKSPACE_HEIGHT - parentNode.y)
    )
  };
}

function updateParentWithAutoSize(nodes, parentId) {
  if (!parentId) return nodes;

  const parentIndex = nodes.findIndex((node) => node.id === parentId && node.type !== "child");
  if (parentIndex === -1) return nodes;

  const parentNode = nodes[parentIndex];
  const required = getRequiredParentSize(nodes, parentNode);
  const boundedWidth = required.width;
  const boundedHeight = required.height;

  if (boundedWidth === parentNode.w && boundedHeight === parentNode.h) {
    return nodes;
  }

  const nextNodes = [...nodes];
  nextNodes[parentIndex] = {
    ...parentNode,
    w: boundedWidth,
    h: boundedHeight
  };
  return nextNodes;
}

function getChildAreaWidth(parentWidth) {
  return Math.max(
    PARENT_LAYOUT.childWidth,
    parentWidth - PARENT_LAYOUT.childContainerInsetX
  );
}

function reflowChildrenInGrid(nodes, parentId, parentWidth) {
  const childNodes = nodes
    .filter((node) => node.type === "child" && node.parentId === parentId)
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));

  if (!childNodes.length) {
    return nodes;
  }

  const usableWidth = getChildAreaWidth(parentWidth);
  const columnWidth = PARENT_LAYOUT.childWidth + PARENT_LAYOUT.childGapX;
  const columns = Math.max(1, Math.floor((usableWidth + PARENT_LAYOUT.childGapX) / columnWidth));

  const updates = new Map();
  childNodes.forEach((childNode, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    updates.set(childNode.id, {
      x: PARENT_LAYOUT.childStartX + column * columnWidth,
      y: PARENT_LAYOUT.childStartY + row * (PARENT_LAYOUT.childHeight + PARENT_LAYOUT.childGapY)
    });
  });

  return nodes.map((node) => {
    if (!updates.has(node.id)) return node;
    return { ...node, ...updates.get(node.id) };
  });
}

function arrangeChildrenInRow(nodes, parentId) {
  let currentX = PARENT_LAYOUT.childStartX;
  let currentY = PARENT_LAYOUT.childStartY;

  const sortedChildren = nodes
    .filter((node) => node.type === "child" && node.parentId === parentId)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (!sortedChildren.length) return nodes;

  const updates = new Map();
  sortedChildren.forEach((childNode) => {
    updates.set(childNode.id, {
      x: currentX,
      y: currentY
    });
    currentX += childNode.w + PARENT_LAYOUT.childGapX;
  });

  const arrangedNodes = nodes.map((node) => {
    if (!updates.has(node.id)) return node;
    return { ...node, ...updates.get(node.id) };
  });

  return updateParentWithAutoSize(arrangedNodes, parentId);
}

function createParentNode(id, worldX, worldY) {
  const w = PARENT_LAYOUT.minWidth;
  const h = PARENT_LAYOUT.minHeight;

  const x = clamp(
    worldX - 240,
    0,
    Math.max(0, WORKSPACE_WIDTH - w)
  );
  const y = clamp(
    worldY - 140,
    0,
    Math.max(0, WORKSPACE_HEIGHT - h)
  );

  return {
    id,
    type: "parent",
    parentId: null,
    title: "NEW BLUEPRINT BLOCK",
    x,
    y,
    w,
    h,
    notes: "",
    items: []
  };
}

function createChildNode(id, parentNode, siblingCount) {
  const column = siblingCount % 2;
  const row = Math.floor(siblingCount / 2);

  return {
    id,
    type: "child",
    parentId: parentNode.id,
    title: `Mini-cuadro ${siblingCount + 1}`,
    x: PARENT_LAYOUT.childStartX + column * (PARENT_LAYOUT.childWidth + PARENT_LAYOUT.childGapX),
    y: PARENT_LAYOUT.childStartY + row * (PARENT_LAYOUT.childHeight + PARENT_LAYOUT.childGapY),
    w: PARENT_LAYOUT.childWidth,
    h: PARENT_LAYOUT.childHeight,
    notes: "Subproceso, paso o módulo interno.",
    items: []
  };
}

/**
 * Hook que centraliza todo el estado del blueprint y las operaciones CRUD
 * sobre nodos y aristas. Separa la lógica de negocio de la UI.
 */
export function useBlueprintState() {
  const [persistedProject] = useState(() => loadActiveProjectBlueprint());
  const [nodes, setNodes] = useState(persistedProject.nodes);
  const [edges, setEdges] = useState(persistedProject.edges);
  const [selectedId, setSelectedId] = useState(persistedProject.selectedId);
  const [selectedIds, setSelectedIds] = useState(persistedProject.selectedIds);
  const [connectMode, setConnectMode] = useState(persistedProject.connectMode);
  const [connectSource, setConnectSource] = useState(persistedProject.connectSource);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const nodeMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const rootNodes = useMemo(
    () => nodes.filter((node) => node.type !== "child"),
    [nodes]
  );

  const childNodesByParentId = useMemo(() => {
    const map = new Map();

    nodes.forEach((node) => {
      if (node.type !== "child" || !node.parentId) {
        return;
      }

      const siblings = map.get(node.parentId) ?? [];
      siblings.push(node);
      map.set(node.parentId, siblings);
    });

    return map;
  }, [nodes]);

  useEffect(() => {
    saveActiveProjectBlueprint({
      nodes,
      edges,
      selectedId,
      selectedIds,
      connectMode,
      connectSource
    });
  }, [nodes, edges, selectedId, selectedIds, connectMode, connectSource]);

  // ── Nodos ──────────────────────────────────────────────────────────────────

  const updateNode = (id, patch) => {
    setNodes((prev) => {
      const targetNode = prev.find((node) => node.id === id);

      let nextNodes = prev.map((node) => {
        if (node.id !== id) {
          return node;
        }

        const nextNode = { ...node, ...patch };

        if (
          nextNode.type === "child" &&
          (Object.prototype.hasOwnProperty.call(patch, "notes") ||
            Object.prototype.hasOwnProperty.call(patch, "title"))
        ) {
          return {
            ...nextNode,
            h: getChildHeightFromContent(nextNode)
          };
        }

        return nextNode;
      });

      if (targetNode?.type === "child") {
        nextNodes = updateParentWithAutoSize(nextNodes, targetNode.parentId);
      }

      return nextNodes;
    });
  };

  const setActiveSelection = (id) => {
    if (!id) {
      setSelectedId(null);
      setSelectedIds([]);
      return;
    }

    setSelectedId(id);
    setSelectedIds([id]);
  };

  const selectNode = (id, options = {}) => {
    const { multi = false, toggle = false } = options;

    if (!id) {
      setActiveSelection(null);
      return;
    }

    if (!multi) {
      setActiveSelection(id);
      return;
    }

    setSelectedId(id);
    setSelectedIds((prev) => {
      const hasId = prev.includes(id);
      if (toggle && hasId) {
        const next = prev.filter((value) => value !== id);
        return next.length ? next : [id];
      }

      if (hasId) {
        return prev;
      }

      return [...prev, id];
    });
  };

  const addNode = ({ kind, viewportCenter, scale, pos, parentId }) => {
    const id = `node-${Date.now()}`;

    let node = null;

    if (kind === "child") {
      const parentNode = nodeMap.get(parentId);
      if (!parentNode || parentNode.type === "child") {
        logger.warn("Alta de mini-cuadro cancelada: parent inválido", { parentId });
        return null;
      }

      const siblingCount = childNodesByParentId.get(parentId)?.length ?? 0;
      node = createChildNode(id, parentNode, siblingCount);
    } else {
      const worldX = (viewportCenter.x - pos.x) / scale;
      const worldY = (viewportCenter.y - pos.y) / scale;
      node = createParentNode(id, worldX, worldY);
    }

    setNodes((prev) => {
      const nextNodes = [...prev, node];
      if (kind !== "child") {
        return nextNodes;
      }
      return updateParentWithAutoSize(nextNodes, parentId);
    });
    setActiveSelection(id);
    logger.info("Nodo creado", { id, kind, parentId: node.parentId ?? null });
    return node;
  };

  const deleteNode = (id) => {
    const targetNode = nodeMap.get(id);
    const descendantIds = new Set(
      targetNode?.type === "child"
        ? [id]
        : [id, ...(childNodesByParentId.get(id)?.map((node) => node.id) ?? [])]
    );

    setNodes((prev) => prev.filter((n) => !descendantIds.has(n.id)));
    setEdges((prev) => prev.filter((e) => !descendantIds.has(e.from) && !descendantIds.has(e.to)));
    setSelectedId(null);
    setSelectedIds([]);
    logger.info("Nodo(s) eliminado(s)", { rootId: id, count: descendantIds.size });
  };

  const moveNode = (id, dx, dy) => {
    setNodes((prev) => {
      const targetNode = prev.find((node) => node.id === id);

      const movedNodes = prev.map((n) => {
        if (n.id !== id) {
          return n;
        }

        if (n.type === "child") {
          const parentNode = prev.find((node) => node.id === n.parentId);
          const parentWidth = parentNode?.w ?? PARENT_LAYOUT.minWidth;
          const parentHeight = parentNode?.h ?? PARENT_LAYOUT.minHeight;
          const maxX = Math.max(
            PARENT_LAYOUT.childStartX * 0.5,
            parentWidth - n.w - PARENT_LAYOUT.sidePadding * 0.5
          );
          const maxY = Math.max(
            PARENT_LAYOUT.childStartY * 0.5,
            parentHeight - PARENT_LAYOUT.childAreaTop - n.h - PARENT_LAYOUT.bottomPadding
          );

          return {
            ...n,
            x: clamp(n.x + dx, PARENT_LAYOUT.childStartX * 0.5, maxX),
            y: clamp(n.y + dy, PARENT_LAYOUT.childStartY * 0.5, maxY)
          };
        }

        const nextX = clamp(
          n.x + dx,
          0,
          Math.max(0, WORKSPACE_WIDTH - n.w)
        );
        const nextY = clamp(
          n.y + dy,
          0,
          Math.max(0, WORKSPACE_HEIGHT - n.h)
        );

        return { ...n, x: nextX, y: nextY };
      });

      if (targetNode?.type !== "child") {
        return movedNodes;
      }

      return movedNodes;
    });
  };

  const resizeNode = (id, dw, dh) => {
    setNodes((prev) => {
      const targetNode = prev.find((node) => node.id === id);
      if (!targetNode) {
        return prev;
      }

      if (targetNode.type === "child") {
        const resizedChildren = prev.map((node) => {
          if (node.id !== id) {
            return node;
          }

          const parentNode = prev.find((item) => item.id === node.parentId);
          const parentWidth = parentNode?.w ?? PARENT_LAYOUT.minWidth;
          const parentHeight = parentNode?.h ?? PARENT_LAYOUT.minHeight;
          const maxWidth = Math.max(120, parentWidth - node.x - PARENT_LAYOUT.sidePadding * 0.5);
          const maxHeight = Math.max(
            56,
            parentHeight - PARENT_LAYOUT.childAreaTop - node.y - PARENT_LAYOUT.bottomPadding
          );

          const nextNode = {
            ...node,
            w: clamp(node.w + dw, 120, maxWidth),
            h: clamp(node.h + dh, 56, maxHeight)
          };

          return {
            ...nextNode,
            h: Math.max(nextNode.h, getChildHeightFromContent(nextNode))
          };
        });

        return updateParentWithAutoSize(resizedChildren, targetNode.parentId);
      }

      const maxWidth = Math.max(PARENT_LAYOUT.minWidth, WORKSPACE_WIDTH - targetNode.x);
      const maxHeight = Math.max(PARENT_LAYOUT.minHeight, WORKSPACE_HEIGHT - targetNode.y);

      const nextWidth = clamp(
        targetNode.w + dw,
        PARENT_LAYOUT.minWidth,
        maxWidth
      );
      const nextHeight = clamp(
        targetNode.h + dh,
        PARENT_LAYOUT.minHeight,
        maxHeight
      );
      const isShrinking = nextWidth < targetNode.w || nextHeight < targetNode.h;

      let nextNodes = prev.map((node) => {
        if (node.id !== id) {
          return node;
        }

        return {
          ...node,
          w: nextWidth,
          h: nextHeight
        };
      });

      if (isShrinking) {
        nextNodes = reflowChildrenInGrid(nextNodes, id, nextWidth);
      }

      const resizedParent = nextNodes.find((node) => node.id === id);
      if (!resizedParent) {
        return nextNodes;
      }

      const required = getRequiredParentSize(nextNodes, resizedParent);

      return nextNodes.map((node) => {
        if (node.id !== id) {
          return node;
        }

        return {
          ...node,
          w: Math.max(node.w, required.width),
          h: Math.max(node.h, required.height)
        };
      });
    });
  };

  const snapNodeToGrid = (id) => {
    setNodes((prev) => {
      const targetNode = prev.find((node) => node.id === id);
      if (!targetNode) {
        return prev;
      }

      const snapped = prev.map((node) => {
        if (node.id !== id) {
          return node;
        }

        if (node.type === "child") {
          const parentNode = prev.find((item) => item.id === node.parentId);
          const parentWidth = parentNode?.w ?? PARENT_LAYOUT.minWidth;
          const parentHeight = parentNode?.h ?? PARENT_LAYOUT.minHeight;
          const maxX = Math.max(
            PARENT_LAYOUT.childStartX * 0.5,
            parentWidth - node.w - PARENT_LAYOUT.sidePadding * 0.5
          );
          const maxY = Math.max(
            PARENT_LAYOUT.childStartY * 0.5,
            parentHeight - PARENT_LAYOUT.childAreaTop - node.h - PARENT_LAYOUT.bottomPadding
          );

          return {
            ...node,
            x: clamp(snapToGrid(node.x), PARENT_LAYOUT.childStartX * 0.5, maxX),
            y: clamp(snapToGrid(node.y), PARENT_LAYOUT.childStartY * 0.5, maxY)
          };
        }

        return {
          ...node,
          x: clamp(snapToGrid(node.x), 0, Math.max(0, WORKSPACE_WIDTH - node.w)),
          y: clamp(snapToGrid(node.y), 0, Math.max(0, WORKSPACE_HEIGHT - node.h))
        };
      });

      if (targetNode.type === "child") {
        return snapped;
      }

      return snapped;
    });
  };

  const snapNodeSizeToGrid = (id) => {
    setNodes((prev) => {
      const targetNode = prev.find((node) => node.id === id);
      if (!targetNode) {
        return prev;
      }

      const snapped = prev.map((node) => {
        if (node.id !== id) {
          return node;
        }

        if (node.type === "child") {
          const parentNode = prev.find((item) => item.id === node.parentId);
          const parentWidth = parentNode?.w ?? PARENT_LAYOUT.minWidth;
          const parentHeight = parentNode?.h ?? PARENT_LAYOUT.minHeight;
          const maxWidth = Math.max(120, parentWidth - node.x - PARENT_LAYOUT.sidePadding * 0.5);
          const maxHeight = Math.max(
            56,
            parentHeight - PARENT_LAYOUT.childAreaTop - node.y - PARENT_LAYOUT.bottomPadding
          );

          const nextNode = {
            ...node,
            w: clamp(snapToGrid(node.w), 120, maxWidth),
            h: clamp(snapToGrid(node.h), 56, maxHeight)
          };

          return {
            ...nextNode,
            h: Math.max(nextNode.h, getChildHeightFromContent(nextNode))
          };
        }

        const maxWidth = Math.max(PARENT_LAYOUT.minWidth, WORKSPACE_WIDTH - node.x);
        const maxHeight = Math.max(PARENT_LAYOUT.minHeight, WORKSPACE_HEIGHT - node.y);

        return {
          ...node,
          w: clamp(snapToGrid(node.w), PARENT_LAYOUT.minWidth, maxWidth),
          h: clamp(snapToGrid(node.h), PARENT_LAYOUT.minHeight, maxHeight)
        };
      });

      if (targetNode.type === "child") {
        return updateParentWithAutoSize(snapped, targetNode.parentId);
      }

      const snappedParent = snapped.find((node) => node.id === id);
      if (!snappedParent) {
        return snapped;
      }

      const required = getRequiredParentSize(snapped, snappedParent);

      return snapped.map((node) => {
        if (node.id !== id) {
          return node;
        }

        return {
          ...node,
          w: Math.max(node.w, required.width),
          h: Math.max(node.h, required.height)
        };
      });
    });
  };

  const autoSizeParent = (parentIdOrChildId) => {
    const parentId = resolveParentId(nodeMap.get(parentIdOrChildId));
    if (!parentId) return;

    setNodes((prev) => updateParentWithAutoSize(prev, parentId));
    logger.info("Autoajuste aplicado", { parentId });
  };

  const arrangeChildrenHorizontally = (parentIdOrChildId) => {
    const parentId = resolveParentId(nodeMap.get(parentIdOrChildId));
    if (!parentId) return;

    setNodes((prev) => arrangeChildrenInRow(prev, parentId));
    logger.info("Mini-cuadros alineados en fila", { parentId });
  };

  const alignSelectedHorizontally = () => {
    setNodes((prev) => {
      const selected = prev.filter((node) => selectedIds.includes(node.id));
      if (selected.length < 2) return prev;

      const first = selected.find((node) => node.id === selectedId) ?? selected[0];
      const firstParent = first.type === "child" ? prev.find((node) => node.id === first.parentId) : null;
      const referenceY = first.type === "child"
        ? (firstParent?.y ?? 0) + PARENT_LAYOUT.childAreaTop + first.y
        : first.y;

      const parentIdsToAutoSize = new Set();

      const aligned = prev.map((node) => {
        if (!selectedIds.includes(node.id)) {
          return node;
        }

        if (node.type === "child") {
          const parentNode = prev.find((item) => item.id === node.parentId);
          if (!parentNode) return node;

          parentIdsToAutoSize.add(node.parentId);
          return {
            ...node,
            y: Math.max(
              PARENT_LAYOUT.childStartY * 0.5,
              referenceY - parentNode.y - PARENT_LAYOUT.childAreaTop
            )
          };
        }

        return { ...node, y: referenceY };
      });

      let next = aligned;
      parentIdsToAutoSize.forEach((parentId) => {
        next = updateParentWithAutoSize(next, parentId);
      });

      return next;
    });
  };

  const alignSelectedVertically = () => {
    setNodes((prev) => {
      const selected = prev.filter((node) => selectedIds.includes(node.id));
      if (selected.length < 2) return prev;

      const first = selected.find((node) => node.id === selectedId) ?? selected[0];
      const firstParent = first.type === "child" ? prev.find((node) => node.id === first.parentId) : null;
      const referenceX = first.type === "child"
        ? (firstParent?.x ?? 0) + first.x
        : first.x;

      const parentIdsToAutoSize = new Set();

      const aligned = prev.map((node) => {
        if (!selectedIds.includes(node.id)) {
          return node;
        }

        if (node.type === "child") {
          const parentNode = prev.find((item) => item.id === node.parentId);
          if (!parentNode) return node;

          parentIdsToAutoSize.add(node.parentId);
          return {
            ...node,
            x: Math.max(PARENT_LAYOUT.childStartX * 0.5, referenceX - parentNode.x)
          };
        }

        return { ...node, x: referenceX };
      });

      let next = aligned;
      parentIdsToAutoSize.forEach((parentId) => {
        next = updateParentWithAutoSize(next, parentId);
      });

      return next;
    });
  };

  // ── Conexiones ─────────────────────────────────────────────────────────────

  const toggleConnectMode = () => {
    setConnectMode((v) => !v);
    setConnectSource(null);
  };

  const handleConnectClick = (id) => {
    setActiveSelection(id);
    if (!connectSource) {
      setConnectSource(id);
      return;
    }
    if (connectSource !== id) {
      const edgeExists = edges.some(
        (e) => (e.from === connectSource && e.to === id) || (e.from === id && e.to === connectSource)
      );
      if (!edgeExists) {
        setEdges((prev) => [
          ...prev,
          { id: `edge-${Date.now()}`, from: connectSource, to: id }
        ]);
      }
    }
    setConnectSource(null);
  };

  return {
    // State
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
    viewport: persistedProject.viewport,
    projectId: persistedProject.projectId,
    projectName: persistedProject.projectName,
    folders: persistedProject.folders,
    files: persistedProject.files,
    // Node actions
    setSelectedId: setActiveSelection,
    selectNode,
    setSelectedIds,
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
    // Connection actions
    toggleConnectMode,
    handleConnectClick
  };
}
