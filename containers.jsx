// containers.jsx — Container modal CRUD + edit mode UI.
//
// Mirrors the ADR editor pattern: modal-based, opaque background, persistence
// via the overlay store. Edit mode is an explicit App-level toggle (button in
// bottom-right, similar to Comment mode) so the cards' default behaviour
// (drag, click-to-comment) stays intact.

const CONTAINER_TYPES = [
  "service", "gateway", "broker", "queue", "database",
  "cache", "frontend", "external",
];

// ── Floating Edit button ──
function EditButton({ T, active, onClick }) {
  return (
    <button onClick={onClick} title="Edit mode (toggle to edit cards)"
      style={{
        position: "fixed", right: 248, bottom: 24, zIndex: 60,
        width: 44, height: 44, borderRadius: 22,
        background: active ? T.accent : T.bg,
        border: `1px solid ${active ? T.accent : T.cardBorder}`,
        color: active ? "#0a1d3a" : T.ink,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,.35)",
        fontSize: 16, fontFamily: T.titleStack, fontWeight: 700,
      }}>✎</button>
  );
}

// ── Edit mode banner (top, like the Comment banner) ──
// In normal edit mode it shows "+ New container" and "+ Connect".
// When connect mode is active, the banner morphs into a guidance strip
// telling the user to click a source / target node.
function EditModeBanner({ T, onCreate, onExit, connectMode, onStartConnect, onCancelConnect }) {
  if (connectMode) {
    return (
      <div style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        background: T.bg, color: T.ink,
        padding: "8px 14px",
        borderRadius: 22,
        border: `1px solid #ffb347`,
        fontFamily: T.titleStack, fontSize: 12,
        display: "flex", alignItems: "center", gap: 12,
        zIndex: 65, boxShadow: "0 4px 16px rgba(0,0,0,.35)",
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffb347" }} />
        <span style={{ letterSpacing: ".05em" }}>
          {connectMode.sourceId
            ? <>Connect · source: <b style={{ fontFamily: "JetBrains Mono, monospace" }}>{connectMode.sourceId}</b> · click target</>
            : <>Connect · click source node</>}
        </span>
        <button onClick={onCancelConnect} style={{
          background: "transparent", color: T.ink,
          border: `1px solid ${T.cardBorder}`, borderRadius: 4,
          padding: "4px 10px", cursor: "pointer",
          fontFamily: T.titleStack, fontSize: 11,
        }}>Cancel (Esc)</button>
      </div>
    );
  }
  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      background: T.bg, color: T.ink,
      padding: "8px 14px",
      borderRadius: 22,
      border: `1px solid ${T.accent}`,
      fontFamily: T.titleStack, fontSize: 12,
      display: "flex", alignItems: "center", gap: 12,
      zIndex: 65, boxShadow: "0 4px 16px rgba(0,0,0,.35)",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: T.accent,
      }} />
      <span style={{ letterSpacing: ".05em" }}>Edit mode · click any card to edit</span>
      <button onClick={onCreate} style={{
        background: T.accent, color: "#0a1d3a",
        border: "none", borderRadius: 4,
        padding: "4px 10px", fontWeight: 700, cursor: "pointer",
        fontFamily: T.titleStack, fontSize: 11,
      }}>+ New container</button>
      <button onClick={onStartConnect} style={{
        background: "transparent", color: T.ink,
        border: `1px solid ${T.accent}`, borderRadius: 4,
        padding: "4px 10px", cursor: "pointer",
        fontFamily: T.titleStack, fontSize: 11,
      }}>+ Connect</button>
      <button onClick={onExit} style={{
        background: "transparent", color: T.ink,
        border: `1px solid ${T.cardBorder}`, borderRadius: 4,
        padding: "4px 10px", cursor: "pointer",
        fontFamily: T.titleStack, fontSize: 11,
      }}>Exit (Esc)</button>
    </div>
  );
}

// ── Container modal ──
function ContainerModal({ T, container, isNew, owners, projects, adrs, onSave, onDelete, onClose }) {
  const { useState } = React;
  const [draft, setDraft] = useState(() => ({
    id:       container.id || "",
    label:    container.label || "",
    type:     container.type || "service",
    tech:     container.tech || "",
    project:  container.project || "",
    owner:    container.owner || "",
    adrs:     container.adrs || [],
    x:        typeof container.x === "number" ? container.x : 800,
    y:        typeof container.y === "number" ? container.y : 300,
  }));

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const toggleAdr = (id) => {
    const cur = draft.adrs;
    setField("adrs", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const adrLabel = (a) => {
    const num = (a.id.match(/(\d+)$/) || [])[1] || "";
    return num ? `ADR-${num.padStart(3, "0")}` : a.id;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: T.titleStack,
    }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "min(720px, 100%)", maxHeight: "90vh",
        background: T.bg, color: T.ink,
        border: `1px solid ${T.cardBorder}`, borderRadius: 8,
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 22px",
          borderBottom: `1px solid ${T.cardBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase",
              color: T.inkDim,
            }}>{isNew ? "New container" : "Container"}</span>
            <span style={{ fontSize: 13, color: T.ink, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
              {draft.id}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!isNew && (
              <button onClick={() => {
                if (confirm(`Delete ${draft.label || draft.id}? This can't be undone.`)) onDelete(draft.id);
              }} style={cBtnDanger(T)}>Delete</button>
            )}
            <button onClick={() => onSave(draft)} style={cBtnPrimary(T)}>Save</button>
            <button onClick={onClose} style={cBtnGhost(T)}>Cancel</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12 }}>
            <CField label="Label" hint="Display name on the card">
              <input value={draft.label} onChange={(e) => setField("label", e.target.value)} style={cInput(T)} />
            </CField>
            <CField label="Type">
              <select value={draft.type} onChange={(e) => setField("type", e.target.value)} style={cSelect(T)}>
                {CONTAINER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </CField>
          </div>

          <CField label="Tech stack" hint="e.g. 'Go · Fiber' or 'PostgreSQL 15'">
            <input value={draft.tech} onChange={(e) => setField("tech", e.target.value)} style={cInput(T)} />
          </CField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <CField label="Project (group)">
              <select value={draft.project} onChange={(e) => setField("project", e.target.value)} style={cSelect(T)}>
                <option value="">— None (independent) —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </CField>
            <CField label="Owner (team)">
              <select value={draft.owner} onChange={(e) => setField("owner", e.target.value)} style={cSelect(T)}>
                <option value="">—</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </CField>
          </div>

          {/* Linked ADRs */}
          <div style={{ borderTop: `1px solid ${T.cardBorder}`, paddingTop: 14 }}>
            <div style={{
              fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
              color: T.inkDim, marginBottom: 8,
            }}>Linked decisions (ADRs)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {adrs.length === 0 && (
                <div style={{ fontSize: 11, color: T.inkDim }}>No ADRs yet.</div>
              )}
              {adrs.map((a) => {
                const on = draft.adrs.includes(a.id);
                return (
                  <button key={a.id} onClick={() => toggleAdr(a.id)} style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 999,
                    border: `1px solid ${on ? T.adrInk : T.cardBorder}`,
                    background: on ? `${T.adrBg}` : "transparent",
                    color: on ? T.adrInk : "rgba(180,200,230,.75)",
                    cursor: "pointer", fontFamily: T.titleStack,
                    letterSpacing: ".01em",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontWeight: 700 }}>{adrLabel(a)}</span>
                    <span style={{ opacity: .8 }}>{a.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Position (read-only-ish — let user reset to defaults) */}
          <div style={{
            borderTop: `1px solid ${T.cardBorder}`, paddingTop: 14,
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
          }}>
            <CField label="ID" hint="Stable identifier — change with care">
              <input value={draft.id} onChange={(e) => setField("id", e.target.value)}
                disabled={!isNew}
                style={{ ...cInput(T), opacity: isNew ? 1 : 0.7, cursor: isNew ? "text" : "not-allowed" }} />
            </CField>
            <CField label="x">
              <input type="number" value={draft.x} onChange={(e) => setField("x", parseInt(e.target.value, 10) || 0)} style={cInput(T)} />
            </CField>
            <CField label="y">
              <input type="number" value={draft.y} onChange={(e) => setField("y", parseInt(e.target.value, 10) || 0)} style={cInput(T)} />
            </CField>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tiny visual helpers (named to avoid clashing with adrs.jsx) ──
function CField({ label, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(160,180,210,.7)" }}>
        {label}
        {hint && <span style={{ marginLeft: 8, letterSpacing: ".02em", textTransform: "none", opacity: .65 }}>· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

const cInput = (T) => ({
  background: "rgba(0,0,0,0.25)",
  border: `1px solid ${T.cardBorder}`,
  borderRadius: 4, color: T.ink,
  padding: "7px 10px", fontSize: 13,
  fontFamily: T.titleStack, outline: "none",
});

const cSelect = (T) => ({
  ...cInput(T), padding: "6px 8px",
});

const cBtnPrimary = (T) => ({
  background: T.accent, color: "#0a1d3a",
  border: "none", borderRadius: 4,
  padding: "6px 14px", fontWeight: 700, cursor: "pointer",
  fontFamily: T.titleStack, fontSize: 12,
});

const cBtnGhost = (T) => ({
  background: "transparent", color: T.ink,
  border: `1px solid ${T.cardBorder}`, borderRadius: 4,
  padding: "6px 14px", cursor: "pointer",
  fontFamily: T.titleStack, fontSize: 12,
});

const cBtnDanger = (T) => ({
  background: "transparent", color: "#F87171",
  border: "1px solid rgba(248,113,113,0.4)", borderRadius: 4,
  padding: "6px 14px", cursor: "pointer",
  fontFamily: T.titleStack, fontSize: 12,
});

window.EditButton = EditButton;
window.EditModeBanner = EditModeBanner;
window.ContainerModal = ContainerModal;
