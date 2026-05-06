// Global comment-mode flag — when true, clicks on cards open notes popover
// instead of starting a drag. Set externally by App; read by Card mousedown.
window.__BLUEPRINT_COMMENT_MODE = window.__BLUEPRINT_COMMENT_MODE || false;

// Pan/zoom canvas with semantic C4 levels.
// Zoom thresholds map to C4 levels:
//   < 0.30   → Context
//   0.30–0.70 → Container
//   0.70–1.50 → Component
//   ≥ 1.50   → Code
//
// Card density swaps based on the active level.

const { useState, useRef, useEffect, useCallback, useMemo } = React;

// Themes — three distinct visual languages.
const THEMES = {
  blueprint: {
    bg: "#0a1d3a",
    bgGrad: "radial-gradient(ellipse at center, #0e2549 0%, #061229 100%)",
    grid: "rgba(120,180,255,0.10)",
    gridMajor: "rgba(120,180,255,0.18)",
    ink: "#cfe2ff",
    inkDim: "rgba(207,226,255,0.55)",
    accent: "#6fb1ff",
    cardBg: "rgba(8,24,52,0.72)",
    cardBorder: "rgba(120,180,255,0.45)",
    cardBorderStrong: "#6fb1ff",
    edge: "rgba(140,190,255,0.55)",
    edgeStrong: "#9ec8ff",
    adrBg: "rgba(28,18,52,0.7)",
    adrBorder: "rgba(170,140,255,0.55)",
    adrInk: "#d6c9ff",
    boundary: "rgba(120,180,255,0.18)",
    typeColors: {
      service:  "#6fb1ff",
      gateway:  "#7ee0c6",
      broker:   "#ffb86b",
      database: "#b894ff",
      cache:    "#ff8fb1",
      queue:    "#ffd866",
      frontend: "#67e8f9",
      external: "rgba(207,226,255,0.45)",
      handler:  "#7ee0c6",
      worker:   "#ffb86b",
      actor:    "#cfe2ff",
      system:   "#cfe2ff",
      adr:      "#c4a8ff",
    },
    fontStack: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    titleStack: "'JetBrains Mono', ui-monospace, monospace",
  },
  paper: {
    bg: "#f4efe4",
    bgGrad: "#f4efe4",
    grid: "rgba(50,40,30,0.07)",
    gridMajor: "rgba(50,40,30,0.13)",
    ink: "#1d1a14",
    inkDim: "rgba(29,26,20,0.55)",
    accent: "#6b3a1f",
    cardBg: "rgba(252,248,238,0.96)",
    cardBorder: "rgba(29,26,20,0.55)",
    cardBorderStrong: "#1d1a14",
    edge: "rgba(29,26,20,0.55)",
    edgeStrong: "#1d1a14",
    adrBg: "rgba(228,210,180,0.96)",
    adrBorder: "rgba(107,58,31,0.55)",
    adrInk: "#3a1d0c",
    boundary: "rgba(29,26,20,0.06)",
    typeColors: {
      service:  "#3a5a8c",
      gateway:  "#2f6b5a",
      broker:   "#a35a1f",
      database: "#5a3a8c",
      cache:    "#8c3a5a",
      queue:    "#8c6f1f",
      frontend: "#1f6b8c",
      external: "rgba(29,26,20,0.45)",
      handler:  "#2f6b5a",
      worker:   "#a35a1f",
      actor:    "#1d1a14",
      system:   "#1d1a14",
      adr:      "#6b3a1f",
    },
    fontStack: "'iA Writer Quattro', 'Courier New', ui-monospace, monospace",
    titleStack: "'iA Writer Quattro', 'Courier New', ui-monospace, monospace",
  },
  dark: {
    bg: "#08090b",
    bgGrad: "#08090b",
    grid: "rgba(255,255,255,0.04)",
    gridMajor: "rgba(255,255,255,0.07)",
    ink: "#e8e8ea",
    inkDim: "rgba(232,232,234,0.55)",
    accent: "#7ad9ff",
    cardBg: "rgba(20,21,24,0.92)",
    cardBorder: "rgba(255,255,255,0.10)",
    cardBorderStrong: "rgba(255,255,255,0.30)",
    edge: "rgba(255,255,255,0.20)",
    edgeStrong: "rgba(255,255,255,0.55)",
    adrBg: "rgba(28,22,40,0.92)",
    adrBorder: "rgba(170,140,255,0.30)",
    adrInk: "#d6c9ff",
    boundary: "rgba(255,255,255,0.04)",
    typeColors: {
      service:  "#7ad9ff",
      gateway:  "#7af5c6",
      broker:   "#ffb86b",
      database: "#c4a8ff",
      cache:    "#ff8fb1",
      queue:    "#ffe066",
      frontend: "#7ad9ff",
      external: "rgba(232,232,234,0.45)",
      handler:  "#7af5c6",
      worker:   "#ffb86b",
      actor:    "#e8e8ea",
      system:   "#e8e8ea",
      adr:      "#c4a8ff",
    },
    fontStack: "'Inter', ui-sans-serif, system-ui, sans-serif",
    titleStack: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
};

// Zoom → C4 level
const levelForZoom = (z) => {
  if (z < 0.30) return "context";
  if (z < 0.70) return "container";
  if (z < 1.50) return "component";
  return "code";
};

const LEVELS = ["context", "container", "component", "code"];

// ──────────────────────────────────────────────────────────────────────
// Card sizing helpers — sizes grow per level so denser content fits without
// overlap. Layout is also stretched per level via SPREAD multipliers so
// L3/L4 cards don't crash into each other.
const CARD_W_BY_LEVEL  = { context: 220, container: 240, component: 280, code: 320 };
// Heights are minimums — the card itself grows to fit content (auto height).
const CARD_H_BY_LEVEL  = { context: 110, container: "auto", component: "auto", code: "auto" };
const ADR_W_BY_LEVEL   = { context: 0,   container: 200, component: 220, code: 240 };
const ADR_H_BY_LEVEL   = { context: 0,   container: 100, component: 130, code: 150 };
// Deterministic owner color — a tiny hash so each team gets a stable, distinct
// dot color for the badge without needing a palette field on the owner.
const OWNER_PALETTE = [
  "#7DD3FC", "#FCA5A5", "#FCD34D", "#86EFAC", "#C4B5FD",
  "#F0ABFC", "#FDBA74", "#67E8F9", "#A7F3D0", "#FDE68A",
];
function ownerColor(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return OWNER_PALETTE[Math.abs(h) % OWNER_PALETTE.length];
}

function adrStatus(status) {
  const s = String(status || "accepted").toLowerCase();
  if (s === "deprecated") return "obsolete";
  return s;
}

// Multipliers applied to the raw x/y in data.jsx so nodes spread out at deeper
// levels. Context uses its own coordinates so we leave it 1.
const SPREAD_BY_LEVEL  = {
  context:   { sx: 1.00, sy: 1.00 },
  container: { sx: 1.00, sy: 1.00 },
  component: { sx: 1.30, sy: 1.55 },
  code:      { sx: 1.55, sy: 2.10 },
};

// ──────────────────────────────────────────────────────────────────────
// Edge routing — orthogonal-ish with simple rounded elbow
function edgePath(a, b) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;

  // Anchor on the appropriate side of each box
  const dx = bx - ax;
  const dy = by - ay;
  const horiz = Math.abs(dx) > Math.abs(dy);

  let p1, p2;
  if (horiz) {
    p1 = { x: dx > 0 ? a.x + a.w : a.x, y: ay };
    p2 = { x: dx > 0 ? b.x : b.x + b.w, y: by };
  } else {
    p1 = { x: ax, y: dy > 0 ? a.y + a.h : a.y };
    p2 = { x: bx, y: dy > 0 ? b.y : b.y + b.h };
  }
  // Cubic bezier through midpoints
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const c1 = horiz ? { x: mx, y: p1.y } : { x: p1.x, y: my };
  const c2 = horiz ? { x: mx, y: p2.y } : { x: p2.x, y: my };
  return {
    d: `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`,
    mid: { x: mx, y: my },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Card component — density driven by `level`. Drag to reposition.
function Card({ node, level, theme, T, onDrag, adrIndex, ownerIndex, onAdrClick }) {
  const isAdr = node.type === "adr";
  // Hide ADR-typed nodes entirely — ADRs now live inside affected cards as
  // a "Decisions" section. Kept here as a no-op so old data files still load.
  if (isAdr) return null;
  const w = node.w || CARD_W_BY_LEVEL[level];
  const minH = level === "context" ? CARD_H_BY_LEVEL.context : 90;

  // ─── External (actor / system) card — L1 only ───
  if (node._isExternal) {
    const onMouseDownExt = (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      if (window.__BLUEPRINT_COMMENT_MODE || window.__BLUEPRINT_EDIT_MODE) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("blueprint:card-click", {
          detail: { cardId: node.id, cardLabel: node.label, project: null,
                    rect: e.currentTarget.getBoundingClientRect() },
        }));
        return;
      }
      onDrag(node.id, e);
    };
    const consumers = node.consumers || 0;
    const isOriginalActor = node._originalType === "actor";
    return (
      <div
        data-card-id={node.id}
        data-card-label={node.label}
        onMouseDown={onMouseDownExt}
        style={{
          position: "absolute", left: node.x, top: node.y,
          width: node.w, minHeight: node.h,
          background: T.cardBg,
          border: `1px dashed ${T.cardBorder}`,
          borderRadius: 6,
          fontFamily: T.fontStack,
          color: T.ink,
          padding: "10px 12px",
          boxSizing: "border-box",
          display: "flex", flexDirection: "column", gap: 5,
          opacity: 0.92,
          cursor: "grab",
        }}>
        <div style={{
          fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase",
          color: T.inkDim, fontWeight: 600,
        }}>{isOriginalActor ? "Actor" : "External"}</div>
        <div style={{
          fontFamily: T.titleStack, fontSize: 14, fontWeight: 600,
          color: T.ink, lineHeight: 1.2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{node.label}</div>
        {node.sublabel && (
          <div style={{ fontSize: 10.5, color: T.inkDim, lineHeight: 1.4 }}>
            {node.sublabel}
          </div>
        )}
        {consumers > 0 && (
          <div style={{
            marginTop: "auto", paddingTop: 4,
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, color: T.inkDim,
          }}>
            <span style={{
              padding: "2px 6px",
              border: `1px solid ${T.accent}55`,
              background: `${T.accent}15`,
              color: T.accent,
              borderRadius: 3,
              fontWeight: 700,
            }}>{consumers}</span>
            <span style={{ letterSpacing: ".05em" }}>
              consumer{consumers === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>
    );
  }

  // ─── Project card (L1 ecosystem view) ───
  if (node.type === "project") {
    const color = node.color || T.accent;
    const onMouseDownProj = (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      if (window.__BLUEPRINT_COMMENT_MODE || window.__BLUEPRINT_EDIT_MODE) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("blueprint:card-click", {
          detail: { cardId: node.id, cardLabel: node.label,
                    project: node.projectRef ? node.projectRef.id : null,
                    rect: e.currentTarget.getBoundingClientRect() },
        }));
        return;
      }
      onDrag(node.id, e);
    };
    return (
      <div
        data-card-id={node.id}
        data-card-label={node.label}
        data-card-project={node.projectRef ? node.projectRef.id : ""}
        onMouseDown={onMouseDownProj}
        style={{
          position: "absolute", left: node.x, top: node.y,
          width: node.w, minHeight: node.h,
          background: `${color}10`,
          border: `1px solid ${color}55`,
          borderTop: `4px solid ${color}`,
          borderRadius: 10,
          fontFamily: T.fontStack,
          color: T.ink,
          padding: "20px 24px",
          boxSizing: "border-box",
          display: "flex", flexDirection: "column", gap: 12,
          backdropFilter: "blur(2px)",
          cursor: "grab",
        }}>
        <div style={{
          fontSize: 12, letterSpacing: ".26em", textTransform: "uppercase",
          color: color, opacity: 0.95, fontWeight: 600,
        }}>Project</div>
        <div style={{
          fontFamily: T.titleStack, fontSize: 28, fontWeight: 700,
          color: T.ink, lineHeight: 1.1, letterSpacing: "-.005em",
        }}>{node.label}</div>
        {node.sublabel && (
          <div style={{ fontSize: 13, color: T.inkDim, lineHeight: 1.45 }}>
            {node.sublabel}
          </div>
        )}
        <div style={{
          marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${color}33`,
          display: "flex", flexWrap: "wrap", gap: 7,
        }}>
          {Object.entries(node.typeCounts || {}).map(([t, n]) => (
            <div key={t} style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 12, color: T.inkDim,
              padding: "3px 9px",
              border: `1px solid ${T.typeColors[t] || T.ink}55`,
              borderRadius: 4,
              background: `${T.typeColors[t] || T.ink}10`,
            }}>
              <span style={{ color: T.typeColors[t] || T.ink, fontWeight: 700 }}>{n}</span>
              <span style={{ letterSpacing: ".05em" }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{
          fontSize: 11, color: T.inkDim,
        }}>
          {node.containerCount} container{node.containerCount === 1 ? "" : "s"}
        </div>
      </div>
    );
  }

  // Boundary node — a translucent rect in the background
  if (node.type === "boundary") {
    return (
      <div style={{
        position: "absolute", left: node.x, top: node.y,
        width: node.w, height: node.h,
        background: T.boundary,
        border: `1px dashed ${T.cardBorder}`,
        borderRadius: 8,
        pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: 8, left: 12,
          fontFamily: T.titleStack, fontSize: 11, letterSpacing: ".15em",
          color: T.inkDim, textTransform: "uppercase",
        }}>
          {node.label} · {node.sublabel}
        </div>
      </div>
    );
  }

  if (minH === 0) return null;

  const typeColor = T.typeColors[node.type] || T.ink;
  const cardBg = T.cardBg;
  const border = T.cardBorder;
  const ink = T.ink;

  const components = (window.BLUEPRINT.components || {})[node.id];
  const endpoints = (window.BLUEPRINT.endpoints || {})[node.id];
  const schemas = (window.BLUEPRINT.schemas || {})[node.id];

  // Resolve full ADR objects from this node's adrs list using the index
  const adrObjs = (node.adrs || []).map((code) => adrIndex[code]).filter(Boolean);

  const onMouseDownDrag = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    if (window.__BLUEPRINT_COMMENT_MODE || window.__BLUEPRINT_EDIT_MODE) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("blueprint:card-click", {
        detail: { cardId: node.id, cardLabel: node.label,
                  project: node.project || null,
                  rect: e.currentTarget.getBoundingClientRect() },
      }));
      return;
    }
    onDrag(node.id, e);
  };

  return (
    <div
      data-card-id={node.id}
      data-card-label={node.label}
      data-card-project={node.project || ""}
      onMouseDown={onMouseDownDrag}
      style={{
        position: "absolute", left: node.x, top: node.y,
        width: w, minHeight: minH,
        background: cardBg,
        border: `1px solid ${border}`,
        borderTop: `3px solid ${typeColor}`,
        borderRadius: 6,
        fontFamily: T.fontStack,
        color: ink,
        padding: "10px 12px",
        boxSizing: "border-box",
        display: "flex", flexDirection: "column", gap: 6,
        backdropFilter: "blur(2px)",
        cursor: "grab",
      }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <div style={{
          fontFamily: T.titleStack, fontSize: 13, fontWeight: 600,
          letterSpacing: ".01em", color: ink,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{node.label}</div>
        <div style={{
          fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase",
          color: typeColor, flexShrink: 0,
        }}>{node.type}</div>
      </div>

      {/* Subtitle / tech */}
      {(node.sublabel || node.tech) && (
        <div style={{ fontSize: 10.5, color: T.inkDim, letterSpacing: ".02em" }}>
          {node.sublabel || node.tech}
        </div>
      )}

      {/* Owner badge — only at L2+ (where there's room) */}
      {node.owner && ownerIndex && ownerIndex[node.owner] && level !== "context" && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          alignSelf: "flex-start",
          padding: "2px 7px",
          fontSize: 9, letterSpacing: ".06em", textTransform: "uppercase",
          color: T.inkDim,
          border: `1px solid ${T.cardBorder}`,
          borderRadius: 999,
          background: "rgba(255,255,255,0.02)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: ownerColor(node.owner),
            display: "inline-block",
          }} />
          <span style={{ fontWeight: 600 }}>{ownerIndex[node.owner].name}</span>
        </div>
      )}

      {/* Component-level: list components */}
      {level === "component" && components && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4, fontSize: 10 }}>
          {components.slice(0, 6).map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", color: T.inkDim }}>
              <span style={{ color: ink }}>{c.label}</span>
              <span style={{ fontSize: 9, color: T.typeColors[c.type] }}>{c.type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Code-level: full guts */}
      {level === "code" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4, fontSize: 9.5, overflow: "hidden" }}>
          {components && components.map((c) => (
            <div key={c.id} style={{ color: T.inkDim, lineHeight: 1.35 }}>
              <span style={{ color: ink, fontWeight: 600 }}>{c.label}</span>
              <span style={{ color: T.typeColors[c.type], marginLeft: 6, fontSize: 8.5 }}>{c.tech}</span>
              <div style={{ fontSize: 9, color: T.inkDim }}>{c.desc}</div>
            </div>
          ))}
          {endpoints && endpoints.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 6, color: T.inkDim, fontSize: 9.5 }}>
              <span style={{ color: typeColor, fontWeight: 600, minWidth: 32 }}>{e.method}</span>
              <span style={{ color: ink }}>{e.path}</span>
            </div>
          ))}
          {schemas && schemas.map((s, i) => (
            <div key={i} style={{ color: T.inkDim, fontSize: 9.5, lineHeight: 1.35 }}>
              <span style={{ color: ink, fontWeight: 600 }}>{s.table}</span>
              <span style={{ color: T.inkDim, fontSize: 9 }}> ({s.cols.join(", ")})</span>
            </div>
          ))}
        </div>
      )}

      {/* Decisions (ADRs) — embedded inside the card. Compact at L2, expanded at L3/L4. */}
      {adrObjs.length > 0 && (level === "container" || level === "component" || level === "code") && (
        <div style={{
          marginTop: "auto", paddingTop: 6,
          borderTop: `1px dashed ${T.adrBorder}`,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{
            fontSize: 8.5, letterSpacing: ".18em", textTransform: "uppercase",
            color: T.adrInk, opacity: .85,
          }}>Decisions</div>
          {adrObjs.map((a) => (
            <div key={a.label} onMouseDown={(e) => {
              if (onAdrClick) {
                e.stopPropagation();
                e.preventDefault();
                onAdrClick(a.id || a.label);
              }
            }} style={{
              display: "flex", flexDirection: "column", gap: 1,
              cursor: onAdrClick ? "pointer" : "default",
              padding: "2px 4px", margin: "0 -4px",
              borderRadius: 3,
              transition: "background .12s",
            }}
              onMouseEnter={(e) => { if (onAdrClick) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}>
                <span style={{ fontSize: 10, color: T.adrInk, fontWeight: 600 }}>{a.label}</span>
                <span style={{ fontSize: 8.5, color: T.inkDim, letterSpacing: ".05em", textTransform: "uppercase" }}>
                  {a.status}
                </span>
              </div>
              {(level === "component" || level === "code") && (
                <div style={{ fontSize: 9.5, color: T.inkDim, lineHeight: 1.35 }}>
                  {a.title}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Main canvas
function BlueprintCanvas({ themeKey, levelOverride, onSelectLevel, showExternals = true, notesByCard = {}, onPinClick, overlayVersion = 0, onAdrClick, activeFlow = null, flowAnimate = false }) {
  const T = THEMES[themeKey];
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, z: 0.5 });
  const [size, setSize] = useState({ w: 1200, h: 800 });
  // Per-node position overrides — drag the card and we store its new (x,y) here.
  // Keys are node ids; values are { x, y } in world coordinates BEFORE the
  // per-level spread is applied (we divide by sp on drag, so dragging behaves
  // identically across levels).
  // Per-node position overrides — drag a card and its (x,y) is stored here.
  // Persisted to localStorage so manual layouts survive refreshes.
  // Keyed by project name to keep different blueprints isolated.
  // The "v2" suffix invalidates older entries written when project cards
  // used a different (centroid) layout algorithm.
  const STORAGE_KEY = "blueprint.layout.v2." + (window.BLUEPRINT?.meta?.project || "default");
  const [overrides, setOverrides] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  });
  // Persist on every change.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides)); }
    catch (_) {}
  }, [overrides, STORAGE_KEY]);

  // Track viewport size for centered initial framing
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Active level
  const level = levelOverride === "auto" ? levelForZoom(transform.z) : levelOverride;

  // ─── Pan ───
  const panState = useRef(null);
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    panState.current = { x: e.clientX, y: e.clientY, t0: transform };
  };
  useEffect(() => {
    const move = (e) => {
      if (!panState.current) return;
      const { x, y, t0 } = panState.current;
      setTransform({ ...t0, x: t0.x + (e.clientX - x), y: t0.y + (e.clientY - y) });
    };
    const up = () => { panState.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  // ─── Zoom ───
  const onWheel = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0015);
    const newZ = Math.max(0.08, Math.min(3.0, transform.z * factor));
    // Zoom to cursor: keep world point under cursor stable
    const wx = (mx - transform.x) / transform.z;
    const wy = (my - transform.y) / transform.z;
    setTransform({
      x: mx - wx * newZ,
      y: my - wy * newZ,
      z: newZ,
    });
  };
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => onWheel(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  });

  // ─── Pinch via touch ───
  const touchState = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      touchState.current = {
        d0: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2,
        t0: transform,
      };
    } else if (e.touches.length === 1) {
      panState.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t0: transform };
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && touchState.current) {
      e.preventDefault();
      const [a, b] = e.touches;
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const factor = d / touchState.current.d0;
      const t0 = touchState.current.t0;
      const newZ = Math.max(0.08, Math.min(3.0, t0.z * factor));
      const rect = containerRef.current.getBoundingClientRect();
      const mx = touchState.current.cx - rect.left;
      const my = touchState.current.cy - rect.top;
      const wx = (mx - t0.x) / t0.z;
      const wy = (my - t0.y) / t0.z;
      setTransform({ x: mx - wx * newZ, y: my - wy * newZ, z: newZ });
    } else if (e.touches.length === 1 && panState.current) {
      const t = e.touches[0];
      const { x, y, t0 } = panState.current;
      setTransform({ ...t0, x: t0.x + (t.clientX - x), y: t0.y + (t.clientY - y) });
    }
  };
  const onTouchEnd = () => { touchState.current = null; panState.current = null; };

  // ─── Drag a card to reposition (just that card) ───
  // Stores unscaled (pre-spread) coords so it sits where you drop it across levels.
  const onCardDrag = useCallback((nodeId, e) => {
    const sp = SPREAD_BY_LEVEL[level] || { sx: 1, sy: 1 };
    const z = transform.z;
    const startClient = { x: e.clientX, y: e.clientY };
    const BP = window.BLUEPRINT;

    // Virtual project node (L1 ecosystem) — store override under __project__<id>
    if (nodeId.startsWith("__project__") || nodeId.startsWith("__ext__")) {
      const ov = overrides[nodeId];
      // Use the node's currently-rendered position (from layout) as the
      // drag origin. This handles both the grid default and any prior override.
      const renderedNode = nodeMap[nodeId];
      const startX = ov ? ov.x : (renderedNode ? renderedNode.x : 0);
      const startY = ov ? ov.y : (renderedNode ? renderedNode.y : 0);

      const move = (ev) => {
        const dxBase = (ev.clientX - startClient.x) / (z * sp.sx);
        const dyBase = (ev.clientY - startClient.y) / (z * sp.sy);
        setOverrides((prev) => ({
          ...prev,
          [nodeId]: { x: startX + dxBase, y: startY + dyBase },
        }));
      };
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return;
    }

    const baseNode = BP.containers.find((n) => n.id === nodeId);
    if (!baseNode) return;
    const ov = overrides[nodeId];
    const startBase = { x: ov ? ov.x : baseNode.x, y: ov ? ov.y : baseNode.y };

    const move = (ev) => {
      const dxBase = (ev.clientX - startClient.x) / (z * sp.sx);
      const dyBase = (ev.clientY - startClient.y) / (z * sp.sy);
      setOverrides((prev) => ({
        ...prev,
        [nodeId]: { x: startBase.x + dxBase, y: startBase.y + dyBase },
      }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [level, transform.z, overrides]);

  // ─── Drag the project title to move ALL its cards together ───
  const onProjectDrag = useCallback((projectId, e) => {
    e.stopPropagation();
    const sp = SPREAD_BY_LEVEL[level] || { sx: 1, sy: 1 };
    const z = transform.z;
    const startClient = { x: e.clientX, y: e.clientY };
    const BP = window.BLUEPRINT;
    const groupNodes = BP.containers.filter(
      (n) => n.type !== "adr" && n.project === projectId,
    );
    if (groupNodes.length === 0) return;

    const startBase = {};
    groupNodes.forEach((n) => {
      const ov = overrides[n.id];
      startBase[n.id] = { x: ov ? ov.x : n.x, y: ov ? ov.y : n.y };
    });

    const move = (ev) => {
      const dxBase = (ev.clientX - startClient.x) / (z * sp.sx);
      const dyBase = (ev.clientY - startClient.y) / (z * sp.sy);
      setOverrides((prev) => {
        const next = { ...prev };
        groupNodes.forEach((n) => {
          const sb = startBase[n.id];
          next[n.id] = { x: sb.x + dxBase, y: sb.y + dyBase };
        });
        return next;
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }, [level, transform.z, overrides]);

  // Reset all overrides back to data.jsx positions (also clears storage)
  const resetLayout = useCallback(() => {
    setOverrides({});
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }, [STORAGE_KEY]);

  // Expose to App for the external Settings panel button.
  useEffect(() => {
    window.__BLUEPRINT_RESET_LAYOUT = resetLayout;
    return () => { delete window.__BLUEPRINT_RESET_LAYOUT; };
  }, [resetLayout]);

  const { nodes, edges, adrIndex, ownerIndex } = useMemo(() => {
    const BP = window.BLUEPRINT;
    // Build the ADR index. v2 schema: ADRs live in BP.adrs as a global entity,
    // referenced by id from container.adrs[]. We normalize field names so the
    // Card renderer (which expects {label, title, status}) stays unchanged.
    const idx = {};
    Object.entries(BP.adrCatalog || {}).forEach(([id, a]) => {
      idx[id] = {
        id,
        ...a,
        label: a.label || id,
        title: a.title,
        status: adrStatus(a.status),
      };
    });
    (BP.adrs || []).forEach((a) => {
      // v2 has `id` like "adr.001" — synthesize a short uppercase label
      // ("ADR-001") for display while keeping the id as the lookup key.
      const num = (a.id.match(/(\d+)$/) || [])[1] || "";
      const label = a.label || (num ? `ADR-${num.padStart(3, "0")}` : a.id.toUpperCase());
      idx[a.id] = { ...a, label, title: a.title, status: adrStatus(a.status) };
    });
    // Backwards-compat: old data files may still embed ADRs as containers.
    (BP.containers || []).forEach((n) => {
      if (n.type === "adr") idx[n.label] = n;
    });
    // Owner index — id → owner object — for showing badges on cards.
    const ownerIdx = {};
    (BP.owners || []).forEach((o) => { ownerIdx[o.id] = o; });
    if (level === "context") {
      // ECOSYSTEM VIEW — one large card per project on a clean 3-column grid.
      // The L1 is supposed to be readable at a glance, so we use big cards
      // and a deterministic grid layout (NOT a centroid of L2 positions —
      // that produced erratic framing).
      const projects = BP.projects || [];
      const containers = (BP.containers || []).filter((n) => n.type !== "adr");
      const PROJECT_W = 460;
      const PROJECT_H = 230;
      const COLS = Math.min(3, Math.max(1, projects.length));
      const COL_GAP = 80;
      const ROW_GAP = 80;
      const GRID_X0 = 0;
      const GRID_Y0 = 0;

      const projectNodes = projects.map((proj, i) => {
        const members = containers.filter((c) => c.project === proj.id);
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const defaultX = GRID_X0 + col * (PROJECT_W + COL_GAP);
        const defaultY = GRID_Y0 + row * (PROJECT_H + ROW_GAP);

        const ov = overrides[`__project__${proj.id}`];
        const x = ov ? ov.x : defaultX;
        const y = ov ? ov.y : defaultY;

        const typeCounts = {};
        members.forEach((m) => { typeCounts[m.type] = (typeCounts[m.type] || 0) + 1; });

        return {
          id: `__project__${proj.id}`,
          type: "project",
          projectRef: proj,
          label: proj.label,
          sublabel: proj.description || null,
          containerCount: members.length,
          typeCounts,
          color: proj.color,
          x, y, w: PROJECT_W, h: PROJECT_H,
          _isProject: true,
        };
      });

      // External actors & systems — laid out in a column on the RIGHT side
      // of the project grid, so they read as a clearly-subordinate band.
      // Their positions are draggable and persisted under stable override keys.
      const ext = (BP.context || [])
        .filter((n) => n.type === "actor" || n.type === "system");

      // Pre-compute consumer counts per external from containerEdges.
      // An "external" appears in a container edge when one endpoint's id
      // matches the external's id. We count distinct projects that touch it.
      const containerById = {};
      containers.forEach((c) => { containerById[c.id] = c; });
      const consumersByExt = {}; // extId → Set of projectIds
      (BP.containerEdges || []).forEach((e) => {
        if (e.kind === "adr") return;
        // Detect if either end is an external.
        const fromIsExt = ext.find((x) => x.id === e.from);
        const toIsExt = ext.find((x) => x.id === e.to);
        if (!fromIsExt && !toIsExt) return;
        const extNode = fromIsExt || toIsExt;
        const otherEnd = fromIsExt ? e.to : e.from;
        const otherC = containerById[otherEnd];
        if (!otherC) return;
        const projId = otherC.project;
        if (!projId) return;
        if (!consumersByExt[extNode.id]) consumersByExt[extNode.id] = new Set();
        consumersByExt[extNode.id].add(projId);
      });

      const EXT_W = 200, EXT_H = 90, EXT_VGAP = 20;
      // Position externals in a vertical column to the right of the grid
      const gridW = COLS * PROJECT_W + (COLS - 1) * COL_GAP;
      const extColX = GRID_X0 + gridW + 100;
      const externals = ext.map((n, i) => {
        const ov = overrides[`__ext__${n.id}`];
        const defaultX = extColX;
        const defaultY = GRID_Y0 + i * (EXT_H + EXT_VGAP);
        const consumers = consumersByExt[n.id] ? consumersByExt[n.id].size : 0;
        return {
          ...n,
          id: `__ext__${n.id}`,
          _origId: n.id,
          type: "external",
          _originalType: n.type,
          x: ov ? ov.x : defaultX,
          y: ov ? ov.y : defaultY,
          w: EXT_W,
          h: EXT_H,
          _isExternal: true,
          consumers,
        };
      });

      const nodes = showExternals ? [...projectNodes, ...externals] : [...projectNodes];

      // ── Aggregate edges between projects ──
      const projectEdgeMap = {};
      (BP.containerEdges || []).forEach((e) => {
        if (e.kind === "adr") return;
        const fromC = containerById[e.from];
        const toC = containerById[e.to];
        if (!fromC || !toC) return;
        const fromP = fromC.project;
        const toP = toC.project;
        if (!fromP || !toP || fromP === toP) return;
        const key = `${fromP}→${toP}`;
        if (!projectEdgeMap[key]) {
          projectEdgeMap[key] = {
            from: `__project__${fromP}`,
            to: `__project__${toP}`,
            count: 0,
            protocols: new Set(),
          };
        }
        projectEdgeMap[key].count += 1;
        if (e.protocol) projectEdgeMap[key].protocols.add(e.protocol);
      });

      // ── Aggregate edges between externals and projects ──
      // For each containerEdge that touches an external, accumulate the
      // (external, project, direction) triple.
      const extEdgeMap = {};
      (BP.containerEdges || []).forEach((e) => {
        if (e.kind === "adr") return;
        const fromExt = ext.find((x) => x.id === e.from);
        const toExt = ext.find((x) => x.id === e.to);
        if (fromExt && !toExt) {
          const otherC = containerById[e.to];
          if (!otherC || !otherC.project) return;
          const key = `__ext__${fromExt.id}→__project__${otherC.project}`;
          if (!extEdgeMap[key]) {
            extEdgeMap[key] = { from: `__ext__${fromExt.id}`, to: `__project__${otherC.project}`, count: 0, protocols: new Set() };
          }
          extEdgeMap[key].count += 1;
          if (e.protocol) extEdgeMap[key].protocols.add(e.protocol);
        } else if (toExt && !fromExt) {
          const otherC = containerById[e.from];
          if (!otherC || !otherC.project) return;
          const key = `__project__${otherC.project}→__ext__${toExt.id}`;
          if (!extEdgeMap[key]) {
            extEdgeMap[key] = { from: `__project__${otherC.project}`, to: `__ext__${toExt.id}`, count: 0, protocols: new Set() };
          }
          extEdgeMap[key].count += 1;
          if (e.protocol) extEdgeMap[key].protocols.add(e.protocol);
        }
      });

      const projectEdges = [
        ...Object.values(projectEdgeMap),
        ...(showExternals ? Object.values(extEdgeMap) : []),
      ].map((e) => ({
        from: e.from,
        to: e.to,
        label: e.count > 1 ? `${e.count} flows` : "1 flow",
        protocol: [...e.protocols][0] || null,
        weight: e.count,
      }));

      return { nodes, edges: projectEdges, adrIndex: idx, ownerIndex: ownerIdx };
    }
    const sp = SPREAD_BY_LEVEL[level];
    // Filter out ADR-typed container nodes; they are now rendered inline.
    const nodes = BP.containers.filter((n) => n.type !== "adr").map((n) => {
      const ov = overrides[n.id];
      const baseX = ov ? ov.x : n.x;
      const baseY = ov ? ov.y : n.y;
      return {
        ...n,
        x: baseX * sp.sx,
        y: baseY * sp.sy,
        w: CARD_W_BY_LEVEL[level],
        // Approximate height for edge routing — actual card auto-sizes.
        // Estimate: base + adr count * 28 at L3/L4
        h: 130 + (level === "component" || level === "code" ? (n.adrs || []).length * 32 : 0)
           + (level === "code" ? 80 : 0),
      };
    });
    // Drop edges that reference ADR nodes — no more ADR spaghetti
    const edges = (BP.containerEdges || []).filter((e) =>
      e.kind !== "adr" && !e.from.startsWith("adr.") && !e.to.startsWith("adr.")
    );
    return { nodes, edges, adrIndex: idx, ownerIndex: ownerIdx };
  }, [level, overrides, showExternals, overlayVersion]);

  const nodeMap = useMemo(() => {
    const m = {};
    nodes.forEach((n) => { m[n.id] = n; });    return m;
  }, [nodes]);

  // ─── Measured card heights (cards auto-grow with content like ADR lists,
  // so the static `h` from data underestimates them and breaks the project
  // box bbox + edge routing). We observe each card's DOM size via
  // ResizeObserver and stash the height in state. ─────────────────────
  const [cardHeights, setCardHeights] = useState({});
  useEffect(() => {
    const ids = nodes.map((n) => n.id);
    const observers = [];
    const updates = {};
    ids.forEach((id) => {
      const el = document.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
      if (!el) return;
      const ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          const h = e.contentRect.height;
          setCardHeights((prev) => {
            if (Math.abs((prev[id] || 0) - h) < 2) return prev;
            return { ...prev, [id]: h };
          });
        }
      });
      ro.observe(el);
      observers.push(ro);
      // Seed with current height immediately
      updates[id] = el.getBoundingClientRect().height / Math.max(transform.z, 0.01);
    });
    if (Object.keys(updates).length) {
      setCardHeights((prev) => ({ ...prev, ...updates }));
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [nodes]);

  // ─── Auto-fit view to the current level's nodes ───
  // Runs on first mount and when the level changes — so switching from L2 to L1
  // (or vice-versa) doesn't leave the user looking at empty space.
  const lastFittedLevel = useRef(null);
  useEffect(() => {
    if (size.w === 0 || size.h === 0) return;
    if (lastFittedLevel.current === level) return;
    if (nodes.length === 0) return;
    // At L1, frame on project cards + externals so the column on the right
    // is visible too. (We keep a small zoom cap so cards stay legible.)
    const fitNodes = level === "context"
      ? nodes.filter((n) => n._isProject || n._isExternal)
      : nodes;
    if (fitNodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    fitNodes.forEach((n) => {
      const w = n.w || 280;
      const h = n.h || 130;
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + w > maxX) maxX = n.x + w;
      if (n.y + h > maxY) maxY = n.y + h;
    });
    const bw = maxX - minX, bh = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const padding = level === "context" ? 60 : 80;
    // Cap higher at L1 so cards remain readable; smaller cap at deeper levels.
    const zCap = level === "context" ? 0.85 : 1.0;
    const z = Math.min(
      (size.w - padding * 2) / bw,
      (size.h - padding * 2) / bh,
      zCap,
    );
    setTransform({ x: size.w / 2 - cx * z, y: size.h / 2 - cy * z, z });
    lastFittedLevel.current = level;
  }, [level, size.w, size.h, nodes]);

  // World bounds for SVG layer — grow with the spread so deeper levels still fit
  const sp = SPREAD_BY_LEVEL[level] || { sx: 1, sy: 1 };
  const WORLD_W = Math.max(2400, Math.round(2400 * sp.sx));
  const WORLD_H = Math.max(900,  Math.round(900  * sp.sy));

  // Pre-compute edge paths
  const edgePaths = useMemo(() => {
    return edges.map((e, i) => {
      const a = nodeMap[e.from], b = nodeMap[e.to];
      if (!a || !b) return null;
      // Live DOM measurement — offsetHeight is in world coords (pre-transform)
      // and reflects auto-grown content immediately, unlike stale cardHeights.
      const aEl = document.querySelector(`[data-card-id="${CSS.escape(a.id)}"]`);
      const bEl = document.querySelector(`[data-card-id="${CSS.escape(b.id)}"]`);
      const ah = (aEl && aEl.offsetHeight) || cardHeights[a.id] || a.h || 130;
      const bh = (bEl && bEl.offsetHeight) || cardHeights[b.id] || b.h || 130;
      const aMeasured = { ...a, h: ah };
      const bMeasured = { ...b, h: bh };
      // skip context edges that hit the boundary box — let the boundary just sit there
      const { d, mid } = edgePath(aMeasured, bMeasured);
      return { ...e, d, mid, key: i };
    }).filter(Boolean);
  }, [edges, nodeMap, cardHeights]);

  // ─── Active flow overlay ───
  // When the user activates a flow from the Flows panel, we dim everything
  // and re-draw the flow's steps as a numbered, criticality-colored path.
  const CRIT_COLORS = {
    critical: "#ff5555",
    high:     "#ff9933",
    medium:   "#ffcc44",
    low:      "#74d39c",
  };
  const flowOverlay = useMemo(() => {
    if (!activeFlow || !Array.isArray(activeFlow.steps) || activeFlow.steps.length === 0) {
      return { containerSet: null, paths: [], color: null };
    }
    const containerSet = new Set();
    const paths = [];
    const color = CRIT_COLORS[activeFlow.criticality] || CRIT_COLORS.medium;
    const sync = !!activeFlow.sync;
    activeFlow.steps.forEach((s, i) => {
      const a = nodeMap[s.from];
      const b = nodeMap[s.to];
      if (a) containerSet.add(s.from);
      if (b) containerSet.add(s.to);
      if (!a || !b) return;
      // Live DOM measurement — offsetHeight is in world coords (pre-transform)
      // and reflects auto-grown content immediately, unlike stale cardHeights.
      const aEl = document.querySelector(`[data-card-id="${CSS.escape(a.id)}"]`);
      const bEl = document.querySelector(`[data-card-id="${CSS.escape(b.id)}"]`);
      const ah = (aEl && aEl.offsetHeight) || cardHeights[a.id] || a.h || 130;
      const bh = (bEl && bEl.offsetHeight) || cardHeights[b.id] || b.h || 130;
      const { d, mid } = edgePath({ ...a, h: ah }, { ...b, h: bh });
      paths.push({
        d, mid, key: i, n: i + 1, label: s.label || s.protocol || "",
        sync, color,
      });
    });
    return { containerSet, paths, color, sync };
  }, [activeFlow, nodeMap, cardHeights]);
  const isFlowActive = !!flowOverlay.containerSet;

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        position: "absolute", inset: 0,
        background: T.bgGrad,
        cursor: panState.current ? "grabbing" : "grab",
        overflow: "hidden",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* Grid layer — fixed, scales with transform via background-size */}
      <GridLayer T={T} transform={transform} />

      {/* World layer */}
      <div style={{
        position: "absolute", left: 0, top: 0,
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.z})`,
        transformOrigin: "0 0",
        width: WORLD_W, height: WORLD_H,
      }}>
        {/* SVG edges */}
        <svg width={WORLD_W} height={WORLD_H} style={{
          position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible",
        }}>
          <defs>
            <marker id={`arrow-${themeKey}`} viewBox="0 0 10 10" refX="10" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={T.edgeStrong} />
            </marker>
            {isFlowActive && (
              <marker id={`arrow-flow-${themeKey}`} viewBox="0 0 10 10" refX="10" refY="5"
                      markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={flowOverlay.color} />
              </marker>
            )}
          </defs>
          {edgePaths.map((e) => {
            const onEdgeClick = (ev) => {
              if (!window.__BLUEPRINT_EDIT_MODE) return;
              ev.stopPropagation();
              window.dispatchEvent(new CustomEvent("blueprint:edge-click", {
                detail: { edge: { from: e.from, to: e.to, label: e.label, protocol: e.protocol, kind: e.kind } },
              }));
            };
            const isEditable = !!window.__BLUEPRINT_EDIT_MODE;
            return (
            <g key={e.key} style={{ opacity: isFlowActive ? 0.12 : 1, transition: "opacity 200ms" }}>
              {/* Invisible fat hit target for easy clicking in edit mode */}
              <path d={e.d} stroke="transparent" strokeWidth={14} fill="none"
                    style={{ cursor: isEditable ? "pointer" : "default", pointerEvents: isEditable ? "stroke" : "none" }}
                    onClick={onEdgeClick} />
              <path d={e.d}
                    stroke={e.kind === "adr" ? T.adrBorder : T.edge}
                    strokeWidth={e.kind === "adr" ? 1 : (e.weight ? Math.min(1.4 + e.weight * 0.6, 5) : 1.4)}
                    strokeDasharray={e.kind === "adr" ? "4 4" : "0"}
                    fill="none"
                    markerEnd={e.kind === "adr" ? "" : `url(#arrow-${themeKey})`}
                    style={{ pointerEvents: "none" }} />
              {e.label && (
                <g transform={`translate(${e.mid.x},${e.mid.y})`}
                   style={{ cursor: isEditable ? "pointer" : "default", pointerEvents: isEditable ? "auto" : "none" }}
                   onClick={onEdgeClick}>
                  <rect x={-(e.label.length * 3.4)} y={-7} width={e.label.length * 6.8} height={14}
                        fill={T.bg} fillOpacity={0.85} rx={2} />
                  <text textAnchor="middle" dominantBaseline="middle"
                        style={{
                          fill: T.inkDim, fontFamily: T.fontStack,
                          fontSize: 9, letterSpacing: ".02em",
                        }}>
                    {e.label}
                  </text>
                </g>
              )}
            </g>
            );
          })}

        </svg>

        {/* Project group boxes — translucent rectangles behind the cards.
            Bbox derived from measured card heights (cards auto-grow with content)
            via the cardHeights map; falls back to data h when DOM not yet measured. */}
        {(level === "container" || level === "component" || level === "code") &&
          (window.BLUEPRINT.projects || []).map((proj) => {
            // Compute bbox from the project's nodes (live positions, after overrides)
            const groupNodes = nodes.filter((n) => n.project === proj.id);
            if (groupNodes.length === 0) return null;
            const pad = 28;
            const heightOf = (n) => cardHeights[n.id] || n.h || 130;
            const minX = Math.min(...groupNodes.map((n) => n.x)) - pad;
            const minY = Math.min(...groupNodes.map((n) => n.y)) - pad - 22;
            const maxX = Math.max(...groupNodes.map((n) => n.x + n.w)) + pad;
            const maxY = Math.max(...groupNodes.map((n) => n.y + heightOf(n))) + pad;
            const color = proj.color || T.accent;
            return (
              <div key={proj.id} style={{
                position: "absolute",
                left: minX, top: minY,
                width: maxX - minX, height: maxY - minY,
                background: `${color}10`,
                border: `1px solid ${color}33`,
                borderRadius: 10,
                pointerEvents: "none",
              }}>
                <div
                  onMouseDown={(e) => onProjectDrag(proj.id, e)}
                  title="Drag to move the whole project"
                  style={{
                    position: "absolute", top: 4, left: 10,
                    fontFamily: T.titleStack,
                    fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase",
                    color: color, opacity: 0.9,
                    pointerEvents: "auto",
                    cursor: "grab",
                    padding: "3px 8px",
                    borderRadius: 3,
                    userSelect: "none",
                  }}>{proj.label}</div>
              </div>
            );
          })}

        {/* Cards */}
        {nodes.map((n) => {
          const dim = isFlowActive && !flowOverlay.containerSet.has(n.id);
          const highlight = isFlowActive && flowOverlay.containerSet.has(n.id);
          return (
            <div key={n.id} style={{
              opacity: dim ? 0.22 : 1,
              transition: "opacity 200ms",
              filter: highlight ? `drop-shadow(0 0 12px ${flowOverlay.color}aa)` : "none",
            }}>
              <Card node={n} level={level} theme={themeKey} T={T}
                    onDrag={onCardDrag} adrIndex={adrIndex} ownerIndex={ownerIndex}
                    onAdrClick={onAdrClick} />
            </div>
          );
        })}

        {/* Note pins — small badges anchored to cards in world space so they
            pan/zoom with the canvas. Click forwards to App. */}
        {nodes.map((n) => {
          const count = (notesByCard[n.id] || []).length;
          if (!count) return null;
          const w = n.w || 280;
          return (
            <div key={`pin-${n.id}`} style={{
              position: "absolute",
              left: n.x + w - 12,
              top: n.y - 12,
              pointerEvents: "auto",
              zIndex: 5,
            }}>
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPinClick) {
                    const rect = { left: n.x, top: n.y, right: n.x + w, bottom: n.y + (n.h || 130),
                                   width: w, height: n.h || 130 };
                    // We pass world rect; App will resolve to viewport rect via DOM lookup.
                    onPinClick({ cardId: n.id, cardLabel: n.label,
                                 project: n.project || (n.projectRef ? n.projectRef.id : null),
                                 worldRect: rect });
                  }
                }}
                title={`${count} note${count === 1 ? "" : "s"}`}
                style={{
                  minWidth: 22, height: 22, padding: "0 6px",
                  borderRadius: 11,
                  background: T.accent, color: T.bg,
                  fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 3px 8px rgba(0,0,0,.35)",
                  cursor: "pointer",
                  fontFamily: T.fontStack,
                  border: `2px solid ${T.bg}`,
                }}>{count}</div>
            </div>
          );
        })}

        {/* Flow overlay — separate SVG drawn ABOVE cards so flow paths
            visibly cross over intermediate nodes instead of being hidden by them. */}
        {isFlowActive && (
          <svg width={WORLD_W} height={WORLD_H} style={{
            position: "absolute", left: 0, top: 0,
            pointerEvents: "none", overflow: "visible",
            zIndex: 4,
          }}>
            <defs>
              <marker id={`arrow-flow-top-${themeKey}`} viewBox="0 0 10 10" refX="10" refY="5"
                      markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={flowOverlay.color} />
              </marker>
            </defs>
            {flowOverlay.paths.map((p) => (
              <g key={`flow-top-${p.key}`}>
                <path d={p.d}
                      stroke={p.color}
                      strokeWidth={3.2}
                      strokeDasharray={p.sync ? "0" : "8 5"}
                      strokeLinecap="round"
                      fill="none"
                      markerEnd={`url(#arrow-flow-top-${themeKey})`}>
                  {flowAnimate && !p.sync && (
                    <animate attributeName="stroke-dashoffset"
                             from="0" to="-26" dur="1.1s" repeatCount="indefinite" />
                  )}
                </path>
                {flowAnimate && p.sync && (
                  <circle r="4.5" fill={p.color}>
                    <animateMotion dur="1.6s" repeatCount="indefinite" path={p.d} />
                  </circle>
                )}
                {/* Step number badge */}
                <g transform={`translate(${p.mid.x},${p.mid.y})`}>
                  <circle r="11" fill={T.bg} stroke={p.color} strokeWidth="2" />
                  <text textAnchor="middle" dominantBaseline="central"
                        style={{ fill: p.color, fontFamily: T.fontStack,
                                 fontSize: 11, fontWeight: 700 }}>
                    {p.n}
                  </text>
                </g>
                {/* Step label below the number */}
                {p.label && (
                  <g transform={`translate(${p.mid.x},${p.mid.y + 22})`}>
                    <rect x={-(p.label.length * 3.6)} y={-8} width={p.label.length * 7.2} height={16}
                          fill={T.bg} fillOpacity={0.92} stroke={p.color} strokeOpacity={0.4} rx={3} />
                    <text textAnchor="middle" dominantBaseline="middle"
                          style={{
                            fill: T.ink, fontFamily: T.fontStack,
                            fontSize: 10, letterSpacing: ".02em", fontWeight: 600,
                          }}>
                      {p.label}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* HUD */}
      <Hud
        T={T}
        transform={transform}
        level={level}
        levelOverride={levelOverride}
        onSelectLevel={onSelectLevel}
        setTransform={setTransform}
        size={size}
        nodes={nodes}
        hasOverrides={Object.keys(overrides).length > 0}
        onResetLayout={resetLayout}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Grid background — moves and scales with the transform via CSS background tricks.
function GridLayer({ T, transform }) {
  const minor = 40 * transform.z;
  const major = 200 * transform.z;
  const ox = transform.x;
  const oy = transform.y;

  return (
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: `
        linear-gradient(${T.grid} 1px, transparent 1px),
        linear-gradient(90deg, ${T.grid} 1px, transparent 1px),
        linear-gradient(${T.gridMajor} 1px, transparent 1px),
        linear-gradient(90deg, ${T.gridMajor} 1px, transparent 1px)
      `,
      backgroundSize: `${minor}px ${minor}px, ${minor}px ${minor}px, ${major}px ${major}px, ${major}px ${major}px`,
      backgroundPosition: `${ox}px ${oy}px, ${ox}px ${oy}px, ${ox}px ${oy}px, ${ox}px ${oy}px`,
      pointerEvents: "none",
    }} />
  );
}

// ──────────────────────────────────────────────────────────────────────
// HUD — top-left meta + bottom-right zoom/level indicator
function Hud({ T, transform, level, levelOverride, onSelectLevel, setTransform, size, nodes, hasOverrides, onResetLayout }) {
  const BP = window.BLUEPRINT;
  const fitView = () => {
    if (!nodes || nodes.length === 0) {
      const cx = 900, cy = 350, z = 0.5;
      setTransform({ x: size.w / 2 - cx * z, y: size.h / 2 - cy * z, z });
      return;
    }
    // Compute bbox of currently rendered nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      const w = n.w || 280;
      const h = n.h || 130;
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + w > maxX) maxX = n.x + w;
      if (n.y + h > maxY) maxY = n.y + h;
    });
    const bw = maxX - minX, bh = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const padding = 80;
    const z = Math.min(
      (size.w - padding * 2) / bw,
      (size.h - padding * 2) / bh,
      1.2,
    );
    setTransform({ x: size.w / 2 - cx * z, y: size.h / 2 - cy * z, z });
  };
  // Expose fitView so the external Settings panel can trigger it.
  React.useEffect(() => {
    window.__BLUEPRINT_FIT_VIEW = fitView;
    return () => { delete window.__BLUEPRINT_FIT_VIEW; };
  });
  return (
    <>
      {/* Top-left: project meta */}
      <div style={{
        position: "absolute", top: 16, left: 16,
        fontFamily: T.titleStack, color: T.ink,
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: 2,
            background: T.accent, boxShadow: `0 0 10px ${T.accent}`,
          }} />
          <div style={{ fontSize: 11, letterSpacing: ".25em", textTransform: "uppercase", color: T.inkDim }}>
            Blueprint
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6, letterSpacing: ".01em" }}>
          {BP.meta.project}
        </div>
        <div style={{ fontSize: 11, color: T.inkDim, marginTop: 2 }}>
          {BP.meta.version} · updated {BP.meta.updated} · {BP.meta.owner}
        </div>
        <div style={{ fontSize: 11, color: T.inkDim, marginTop: 8, maxWidth: 360, lineHeight: 1.45 }}>
          {BP.meta.description}
        </div>
      </div>

      {/* Top-right corner: legend (offset so it doesn't collide with the ladder) */}
      <Legend T={T} />

      {/* Bottom-left: hint */}
      <div style={{
        position: "absolute", bottom: 16, left: 16,
        fontFamily: T.fontStack, fontSize: 10.5,
        color: T.inkDim, letterSpacing: ".05em",
        pointerEvents: "none", lineHeight: 1.5,
      }}>
        drag canvas to pan · drag a card to move it · scroll to zoom<br />
        zoom out for the system, in for the guts
      </div>
    </>
  );
}

function Legend({ T }) {
  const items = [
    { key: "service", label: "service" },
    { key: "gateway", label: "gateway" },
    { key: "broker", label: "broker / mqtt" },
    { key: "queue", label: "event bus" },
    { key: "database", label: "database" },
    { key: "cache", label: "cache" },
    { key: "frontend", label: "frontend" },
  ];
  return (
    <div style={{
      position: "absolute", left: 16, bottom: 16,
      padding: "10px 12px",
      background: T.cardBg, border: `1px solid ${T.cardBorder}`,
      borderRadius: 4, fontFamily: T.fontStack, fontSize: 10,
      color: T.inkDim, display: "flex", flexDirection: "column", gap: 5,
      letterSpacing: ".02em",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        fontSize: 9.5, letterSpacing: ".2em", textTransform: "uppercase",
        color: T.inkDim, marginBottom: 2,
      }}>Legend</div>
      {items.map((i) => (
        <div key={i.key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 14, height: 2, background: T.typeColors[i.key] }} />
          <span style={{ color: T.ink }}>{i.label}</span>
        </div>
      ))}
    </div>
  );
}

window.BlueprintCanvas = BlueprintCanvas;
window.THEMES = THEMES;
