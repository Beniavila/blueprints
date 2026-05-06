// flows.jsx — Flow panel + flow list + criticality badges.
//
// Flows are ordered sequences of interactions across containers. They are the
// architectural-reasoning lens on top of the container graph: instead of
// asking "what services exist", you ask "what happens when a sensor publishes
// a sample / when an operator clicks a button / when an alert fires".
//
// Sprint 3.1 ships the panel + button + read-only viewer. Sprint 3.2 adds
// the canvas highlight; 3.3 adds the modal CRUD.

const CRIT_LEVELS = ["critical", "high", "medium", "low"];
const CRIT_COLORS = {
  critical: { bg: "rgba(239, 68, 68, 0.18)",  ink: "#fca5a5", dot: "#ef4444" },
  high:     { bg: "rgba(251, 146, 60, 0.18)", ink: "#fdba74", dot: "#fb923c" },
  medium:   { bg: "rgba(250, 204, 21, 0.16)", ink: "#fde68a", dot: "#facc15" },
  low:      { bg: "rgba(132, 204, 22, 0.16)", ink: "#bef264", dot: "#84cc16" },
};

// ── Floating Flows button ──
function FlowsButton({ T, open, onClick, badgeCount, activeFlowId }) {
  return (
    <button onClick={onClick} title="Flows · architectural scenarios"
      style={{
        position: "fixed", right: 304, bottom: 24, zIndex: 60,
        width: 44, height: 44, borderRadius: 22,
        background: open ? T.accent : T.bg,
        border: `1px solid ${open ? T.accent : T.cardBorder}`,
        color: open ? "#0a1d3a" : T.ink,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,.35)",
        fontSize: 18, fontFamily: T.titleStack, fontWeight: 700,
      }}>
      ⟶
      {badgeCount > 0 && !open && (
        <span style={{
          position: "absolute", right: -4, top: -4,
          minWidth: 18, height: 18, padding: "0 5px",
          borderRadius: 9, background: T.accent, color: "#0a1d3a",
          fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: T.titleStack,
        }}>{badgeCount}</span>
      )}
      {activeFlowId && (
        <span style={{
          position: "absolute", right: 50, top: 11,
          padding: "2px 8px",
          borderRadius: 12, background: T.accent, color: "#0a1d3a",
          fontSize: 9.5, fontWeight: 700, letterSpacing: ".08em",
          fontFamily: T.titleStack, textTransform: "uppercase",
          pointerEvents: "none", whiteSpace: "nowrap",
        }}>active</span>
      )}
    </button>
  );
}

// ── Criticality pill (small) ──
function CritPill({ level }) {
  const c = CRIT_COLORS[level] || CRIT_COLORS.medium;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 7px", borderRadius: 999,
      background: c.bg, color: c.ink,
      fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em",
      textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: c.dot }} />
      {level}
    </span>
  );
}

// ── Sync/async tag ──
function SyncTag({ T, sync }) {
  return (
    <span style={{
      padding: "2px 6px", borderRadius: 3,
      background: "rgba(255,255,255,0.06)",
      border: `1px solid ${T.cardBorder}`,
      color: T.inkDim,
      fontSize: 9.5, fontWeight: 600, letterSpacing: ".08em",
      textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace",
    }}>{sync ? "sync" : "async"}</span>
  );
}

// ── Flows panel (right side, 460px wide so steps fit) ──
function FlowsPanel({ T, flows, owners, projects, activeFlowId, onActivate, onClear, onOpen, onCreate, onClose }) {
  const { useState, useMemo } = React;

  const [crit,  setCrit]  = useState("all");
  const [owner, setOwner] = useState("all");
  const [mode,  setMode]  = useState("all"); // sync / async / all
  const [q,     setQ]     = useState("");

  const ownerById = useMemo(() => Object.fromEntries((owners || []).map((o) => [o.id, o])), [owners]);
  const projectById = useMemo(() => Object.fromEntries((projects || []).map((p) => [p.id, p])), [projects]);

  const filtered = useMemo(() => {
    return (flows || []).filter((f) => {
      if (crit  !== "all" && f.criticality !== crit) return false;
      if (owner !== "all" && !(f.owners || []).includes(owner)) return false;
      if (mode === "sync" && !f.sync) return false;
      if (mode === "async" && f.sync) return false;
      if (q) {
        const hay = [f.id, f.name, f.description, f.gaps].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [flows, crit, owner, mode, q]);

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 460, zIndex: 55,
      background: T.bg, borderLeft: `1px solid ${T.cardBorder}`,
      display: "flex", flexDirection: "column",
      fontFamily: T.titleStack, color: T.ink,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${T.cardBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".22em", color: T.inkDim, textTransform: "uppercase" }}>
            Architecture
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Flows</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCreate} style={fBtnPrimary(T)}>+ New</button>
          <button onClick={onClose} style={fBtnGhost(T)}>×</button>
        </div>
      </div>

      {/* Active flow strip */}
      {activeFlowId && (
        <div style={{
          padding: "10px 20px",
          background: "rgba(120,180,255,0.08)",
          borderBottom: `1px solid ${T.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 11,
        }}>
          <span style={{ color: T.inkDim }}>
            Highlighting · <span style={{ color: T.ink, fontWeight: 700 }}>
              {(flows.find((f) => f.id === activeFlowId) || {}).name || activeFlowId}
            </span>
          </span>
          <button onClick={onClear} style={{
            background: "transparent", color: T.accent,
            border: "none", cursor: "pointer",
            fontSize: 11, fontFamily: T.titleStack, padding: 0,
            textDecoration: "underline",
          }}>clear</button>
        </div>
      )}

      {/* Filters */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.cardBorder}`, display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          placeholder="Search flow id, name, description..."
          value={q} onChange={(e) => setQ(e.target.value)}
          style={fInput(T)}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <select value={crit}  onChange={(e) => setCrit(e.target.value)}  style={fSelect(T)}>
            <option value="all">All criticalities</option>
            {CRIT_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={owner} onChange={(e) => setOwner(e.target.value)} style={fSelect(T)}>
            <option value="all">All owners</option>
            {(owners || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <select value={mode}  onChange={(e) => setMode(e.target.value)}  style={fSelect(T)}>
            <option value="all">sync + async</option>
            <option value="sync">sync only</option>
            <option value="async">async only</option>
          </select>
        </div>
        <div style={{ fontSize: 10.5, color: T.inkDim, letterSpacing: ".05em" }}>
          {filtered.length} of {flows.length}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {filtered.map((f) => {
          const ownersDisplay = (f.owners || []).map((id) => (ownerById[id] || {}).name).filter(Boolean);
          const projectsDisplay = (f.projects || []).map((id) => (projectById[id] || {}).label).filter(Boolean);
          const isActive = f.id === activeFlowId;
          const crc = CRIT_COLORS[f.criticality] || CRIT_COLORS.medium;
          return (
            <div key={f.id} style={{
              padding: "11px 12px",
              borderBottom: `1px solid ${T.cardBorder}`,
              cursor: "pointer",
              borderLeft: isActive ? `3px solid ${crc.dot}` : "3px solid transparent",
              background: isActive ? "rgba(120,180,255,0.06)" : "transparent",
              transition: "background 120ms",
            }}
              onClick={() => onActivate(f.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <CritPill level={f.criticality} />
                <SyncTag T={T} sync={!!f.sync} />
                <span style={{ marginLeft: "auto", fontSize: 10, color: T.inkDim, fontFamily: "JetBrains Mono, monospace" }}>
                  {(f.steps || []).length} steps
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{f.name}</div>
              <div style={{ fontSize: 11, color: T.inkDim, marginBottom: 6, lineHeight: 1.45 }}>
                {f.description}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10, color: T.inkDim, letterSpacing: ".02em" }}>
                {ownersDisplay.length > 0 && (
                  <span>· {ownersDisplay.join(" · ")}</span>
                )}
                {projectsDisplay.length > 0 && (
                  <span>· {projectsDisplay.join(", ")}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
                <button onClick={(e) => { e.stopPropagation(); onOpen(f.id); }} style={{
                  background: "transparent", color: T.accent,
                  border: `1px solid ${T.cardBorder}`, borderRadius: 3,
                  padding: "2px 8px", fontSize: 10, cursor: "pointer",
                  fontFamily: T.titleStack,
                }}>edit</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 20, fontSize: 11, color: T.inkDim, textAlign: "center" }}>
            No flows match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Style helpers (named to avoid clashing with adrs/containers) ──
const fInput = (T) => ({
  background: "rgba(0,0,0,0.25)",
  border: `1px solid ${T.cardBorder}`,
  borderRadius: 4, color: T.ink,
  padding: "7px 10px", fontSize: 12,
  fontFamily: T.titleStack, outline: "none",
});
const fSelect = (T) => ({ ...fInput(T), padding: "6px 8px" });
const fBtnPrimary = (T) => ({
  background: T.accent, color: "#0a1d3a",
  border: "none", borderRadius: 4,
  padding: "5px 12px", fontWeight: 700, cursor: "pointer",
  fontFamily: T.titleStack, fontSize: 11.5,
});
const fBtnGhost = (T) => ({
  background: "transparent", color: T.ink,
  border: `1px solid ${T.cardBorder}`, borderRadius: 4,
  padding: "5px 12px", cursor: "pointer",
  fontFamily: T.titleStack, fontSize: 12,
});

window.FlowsButton = FlowsButton;
window.FlowsPanel = FlowsPanel;
window.FLOW_CRIT_COLORS = CRIT_COLORS;

// ─────────────────────────────────────────────────────────────────
// Full-screen modal: edit one flow
// Lets the architect tweak meta (name, criticality, sync, owners, projects,
// description) and most importantly — add/edit/reorder/delete the steps that
// make up the flow's path on the canvas.
// ─────────────────────────────────────────────────────────────────
function FlowModal({ T, flow, isNew, owners, projects, containers, externals, onSave, onDelete, onClose }) {
  const { useState, useMemo } = React;

  const [draft, setDraft] = useState(() => ({
    id: flow.id || "flow.new",
    name: flow.name || "",
    type: flow.type || "technical",
    criticality: flow.criticality || "medium",
    description: flow.description || "",
    sync: flow.sync != null ? !!flow.sync : false,
    owners: flow.owners || [],
    projects: flow.projects || [],
    triggers: flow.triggers || [],
    expectedLatency: flow.expectedLatency || 0,
    ordering: flow.ordering || "none",
    gaps: flow.gaps || "",
    steps: (flow.steps || []).map((s) => ({ ...s })),
  }));

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const updateStep = (i, patch) => setDraft((d) => {
    const steps = d.steps.slice();
    steps[i] = { ...steps[i], ...patch };
    return { ...d, steps };
  });
  const addStep = () => setDraft((d) => ({
    ...d,
    steps: [...d.steps, { from: "", to: "", protocol: "http", label: "" }],
  }));
  const removeStep = (i) => setDraft((d) => ({
    ...d,
    steps: d.steps.filter((_, idx) => idx !== i),
  }));
  const moveStep = (i, dir) => setDraft((d) => {
    const j = i + dir;
    if (j < 0 || j >= d.steps.length) return d;
    const steps = d.steps.slice();
    [steps[i], steps[j]] = [steps[j], steps[i]];
    return { ...d, steps };
  });
  const toggleOwner = (id) => setDraft((d) => ({
    ...d,
    owners: d.owners.includes(id) ? d.owners.filter((x) => x !== id) : [...d.owners, id],
  }));
  const toggleProject = (id) => setDraft((d) => ({
    ...d,
    projects: d.projects.includes(id) ? d.projects.filter((x) => x !== id) : [...d.projects, id],
  }));

  // Endpoint options for from/to dropdowns: actors (externals) + every container
  const endpoints = useMemo(() => {
    const list = [];
    (externals || []).forEach((e) => list.push({ id: e.id, label: `${e.label} (actor)` }));
    (containers || []).forEach((c) => list.push({ id: c.id, label: `${c.label} (${c.type})` }));
    return list;
  }, [externals, containers]);

  const PROTOCOLS = ["http", "https", "mqtt", "grpc", "nats", "sql", "kafka", "amqp", "ws", "webhook", "sftp", "tcp", "udp"];
  const CRITS = ["critical", "high", "medium", "low"];
  const ORDERINGS = ["strict", "per-key", "per-device", "none"];

  const stepsValid = draft.steps.length > 0 && draft.steps.every((s) => s.from && s.to);
  const canSave = draft.id && draft.name.trim();

  return (
    <div onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 80, fontFamily: T.titleStack,
      }}>
      <div style={{
        width: 760, maxHeight: "88vh", overflow: "auto",
        background: T.cardBg, color: T.ink,
        border: `1px solid ${T.cardBorder}`, borderRadius: 8,
        padding: 22, display: "flex", flexDirection: "column", gap: 16,
        boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: T.inkDim }}>
              Flow
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
              {draft.id}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!isNew && (
              <button onClick={() => {
                if (window.confirm(`Delete flow "${draft.name || draft.id}"? This cannot be undone.`)) {
                  onDelete(draft.id);
                }
              }} style={{
                background: "transparent", color: "#ff6b6b",
                border: "1px solid #ff6b6b66", borderRadius: 4,
                padding: "6px 12px", cursor: "pointer", fontSize: 12,
                fontFamily: T.titleStack,
              }}>Delete</button>
            )}
            <button onClick={() => canSave && onSave(draft)}
              disabled={!canSave}
              style={{
                ...fBtnPrimary(T),
                opacity: canSave ? 1 : 0.45, cursor: canSave ? "pointer" : "not-allowed",
              }}>Save</button>
            <button onClick={onClose} style={fBtnGhost(T)}>Cancel</button>
          </div>
        </div>

        {/* Meta row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
          <div style={fmField}>
            <label style={fmLabel(T)}>Name</label>
            <input value={draft.name} onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Operator command dispatch"
              style={fInput(T)} />
          </div>
          <div style={fmField}>
            <label style={fmLabel(T)}>Type</label>
            <select value={draft.type} onChange={(e) => setField("type", e.target.value)} style={fSelect(T)}>
              <option value="technical">technical</option>
              <option value="business">business</option>
            </select>
          </div>
          <div style={fmField}>
            <label style={fmLabel(T)}>Criticality</label>
            <select value={draft.criticality} onChange={(e) => setField("criticality", e.target.value)} style={fSelect(T)}>
              {CRITS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={fmField}>
          <label style={fmLabel(T)}>Description</label>
          <textarea value={draft.description} onChange={(e) => setField("description", e.target.value)}
            rows={2}
            placeholder="What does this flow do, end-to-end?"
            style={{ ...fInput(T), resize: "vertical", minHeight: 50, fontFamily: T.titleStack }} />
        </div>

        {/* Meta row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 12, color: T.ink, cursor: "pointer",
            border: `1px solid ${T.cardBorder}`, padding: "8px 10px", borderRadius: 4,
          }}>
            <input type="checkbox" checked={draft.sync}
              onChange={(e) => setField("sync", e.target.checked)}
              style={{ accentColor: T.accent }} />
            <span>Synchronous</span>
          </label>
          <div style={fmField}>
            <label style={fmLabel(T)}>Expected latency (ms)</label>
            <input type="number" value={draft.expectedLatency}
              onChange={(e) => setField("expectedLatency", Number(e.target.value) || 0)}
              style={fInput(T)} />
          </div>
          <div style={fmField}>
            <label style={fmLabel(T)}>Ordering</label>
            <select value={draft.ordering} onChange={(e) => setField("ordering", e.target.value)} style={fSelect(T)}>
              {ORDERINGS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        {/* Owners + Projects */}
        <div style={{ borderTop: `1px solid ${T.cardBorder}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={fmLabel(T)}>Owners</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(owners || []).map((o) => {
                const on = draft.owners.includes(o.id);
                return (
                  <button key={o.id} onClick={() => toggleOwner(o.id)} style={fmChip(T, on)}>
                    {o.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={fmLabel(T)}>Projects touched</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(projects || []).map((p) => {
                const on = draft.projects.includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleProject(p.id)} style={fmChip(T, on, p.color)}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Steps editor */}
        <div style={{ borderTop: `1px solid ${T.cardBorder}`, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: T.ink, fontWeight: 700 }}>Steps</div>
              <div style={{ fontSize: 10.5, color: T.inkDim, marginTop: 2 }}>
                Ordered sequence of interactions. Drag-free reorder via ↑↓ buttons.
                {!stepsValid && draft.steps.length > 0 && (
                  <span style={{ color: "#ff9933", marginLeft: 8 }}>· every step needs from + to</span>
                )}
              </div>
            </div>
            <button onClick={addStep} style={fBtnGhost(T)}>+ Add step</button>
          </div>

          {draft.steps.length === 0 ? (
            <div style={{
              padding: 16, textAlign: "center", color: T.inkDim, fontSize: 12,
              border: `1px dashed ${T.cardBorder}`, borderRadius: 4,
            }}>
              No steps yet. Click "+ Add step" to build the flow's path.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {draft.steps.map((s, i) => (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr 1fr 100px 1.2fr auto",
                  gap: 6, alignItems: "center",
                  padding: 6,
                  background: "rgba(0,0,0,0.18)",
                  border: `1px solid ${T.cardBorder}`,
                  borderRadius: 4,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12,
                    background: T.accent, color: "#0a1d3a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 11, fontFamily: "JetBrains Mono, monospace",
                  }}>{i + 1}</div>
                  <select value={s.from} onChange={(e) => updateStep(i, { from: e.target.value })} style={fSelect(T)}>
                    <option value="">— from —</option>
                    {endpoints.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                  <select value={s.to} onChange={(e) => updateStep(i, { to: e.target.value })} style={fSelect(T)}>
                    <option value="">— to —</option>
                    {endpoints.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </select>
                  <select value={s.protocol || ""} onChange={(e) => updateStep(i, { protocol: e.target.value })} style={fSelect(T)}>
                    {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input value={s.label || ""} onChange={(e) => updateStep(i, { label: e.target.value })}
                    placeholder="label · e.g. publish QoS 1"
                    style={fInput(T)} />
                  <div style={{ display: "flex", gap: 2 }}>
                    <button onClick={() => moveStep(i, -1)} disabled={i === 0}
                      style={fmIconBtn(T, i === 0)} title="Move up">↑</button>
                    <button onClick={() => moveStep(i, +1)} disabled={i === draft.steps.length - 1}
                      style={fmIconBtn(T, i === draft.steps.length - 1)} title="Move down">↓</button>
                    <button onClick={() => removeStep(i)}
                      style={{ ...fmIconBtn(T, false), color: "#ff8080" }} title="Remove step">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gaps / TODO */}
        <div style={fmField}>
          <label style={fmLabel(T)}>Known gaps · documentation TODOs</label>
          <textarea value={draft.gaps} onChange={(e) => setField("gaps", e.target.value)}
            rows={2}
            placeholder="What's still unclear? Surfaces in the architect's review."
            style={{ ...fInput(T), resize: "vertical", minHeight: 44, fontFamily: T.titleStack }} />
        </div>
      </div>
    </div>
  );
}

const fmField = { display: "flex", flexDirection: "column", gap: 4 };
const fmLabel = (T) => ({
  fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: T.inkDim,
});
const fmChip = (T, active, accent) => ({
  background: active ? (accent || T.accent) : "transparent",
  color: active ? "#0a1d3a" : T.ink,
  border: `1px solid ${active ? (accent || T.accent) : T.cardBorder}`,
  borderRadius: 12, padding: "3px 10px",
  fontSize: 11, cursor: "pointer", fontFamily: T.titleStack,
});
const fmIconBtn = (T, disabled) => ({
  background: "transparent",
  color: disabled ? T.inkDim : T.ink,
  border: `1px solid ${T.cardBorder}`,
  borderRadius: 3,
  width: 22, height: 22,
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: 12, lineHeight: 1, padding: 0,
  opacity: disabled ? 0.4 : 1,
});

window.FlowModal = FlowModal;
