// adrs.jsx — Decisions panel + ADR modal CRUD.
//
// The panel is the architect's working surface for ADRs: list, filter, create,
// edit, delete, link/unlink to containers. All persistence runs through the
// overlay store, which keeps data.jsx untouched and stores diffs in
// localStorage.
//
// We expose three React components on window:
//   - DecisionsButton  : floating bottom-right toggle
//   - DecisionsPanel   : right-side panel (when open)
//   - AdrModal         : full editor overlay
//
// And one App-level coordinator hook is intentionally left to Blueprints.html
// so panel/modal state can compose with the existing notes flow.

const STATUSES = ["proposed", "accepted", "obsolete", "superseded"];

function StatusDot({ status, T }) {
  const colors = {
    proposed:   "#FCD34D",
    accepted:   "#86EFAC",
    obsolete:   "#9CA3AF",
    superseded: "#A78BFA",
  };
  return (
    <span style={{
      width: 7, height: 7, borderRadius: "50%",
      background: colors[status] || "#6B7280",
      display: "inline-block", flexShrink: 0,
    }} />
  );
}

// ── Floating button (bottom-right, sits above settings) ──
function DecisionsButton({ T, open, onClick, badgeCount }) {
  return (
    <button onClick={onClick} title="Decisions"
      style={{
        position: "fixed", right: 192, bottom: 24, zIndex: 60,
        width: 44, height: 44, borderRadius: 22,
        background: open ? T.accent : T.bg,
        border: `1px solid ${open ? T.accent : T.cardBorder}`,
        color: open ? "#0a1d3a" : T.ink,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,.35)",
        fontSize: 18, fontFamily: T.titleStack, fontWeight: 700,
      }}>
      §
      {badgeCount > 0 && (
        <span style={{
          position: "absolute", top: -4, right: -4,
          minWidth: 18, height: 18, padding: "0 5px",
          borderRadius: 9, background: "#F87171", color: "#fff",
          fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: T.titleStack,
        }}>{badgeCount}</span>
      )}
    </button>
  );
}

// ── Right-side panel: list + filters ──
function DecisionsPanel({ T, adrs, owners, projects, onOpen, onClose, onCreate }) {
  const { useState, useMemo } = React;
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter,  setOwnerFilter]  = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return adrs.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (ownerFilter  !== "all" && a.owner  !== ownerFilter)  return false;
      if (search) {
        const q = search.toLowerCase();
        if (!a.title.toLowerCase().includes(q) &&
            !(a.id && a.id.toLowerCase().includes(q)) &&
            !(a.context || "").toLowerCase().includes(q) &&
            !(a.decision || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [adrs, statusFilter, ownerFilter, search]);

  const ownerName = (id) => {
    const o = owners.find((x) => x.id === id);
    return o ? o.name : "—";
  };

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 420, zIndex: 55,
      background: T.bg, borderLeft: `1px solid ${T.cardBorder}`,
      display: "flex", flexDirection: "column",
      fontFamily: T.titleStack, color: T.ink,
      boxShadow: "-8px 0 24px rgba(0,0,0,.35)",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 18px 12px",
        borderBottom: `1px solid ${T.cardBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase",
            color: T.inkDim, marginBottom: 4,
          }}>Architecture</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Decisions</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCreate} style={btnPrimary(T)} title="New ADR">+ New</button>
          <button onClick={onClose} style={btnGhost(T)}>×</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        padding: "10px 18px", display: "flex", flexDirection: "column", gap: 8,
        borderBottom: `1px solid ${T.cardBorder}`,
      }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, id, context…"
          style={input(T)} />
        <div style={{ display: "flex", gap: 8 }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={select(T)}>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} style={select(T)}>
            <option value="all">All owners</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 10, color: T.inkDim, letterSpacing: ".05em" }}>
          {filtered.length} of {adrs.length}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "24px 18px", color: T.inkDim, fontSize: 12, textAlign: "center" }}>
            No decisions match the filters.
          </div>
        )}
        {filtered.map((a) => {
          const num = (a.id.match(/(\d+)$/) || [])[1] || "";
          const label = num ? `ADR-${num.padStart(3, "0")}` : a.id;
          const containerCount = ((a.affects && a.affects.containers) || []).length;
          return (
            <button key={a.id} onClick={() => onOpen(a.id)} style={{
              width: "100%", textAlign: "left",
              padding: "12px 18px", border: "none",
              background: "transparent", color: T.ink, cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 4,
              borderBottom: `1px solid ${T.cardBorder}`,
              fontFamily: T.titleStack,
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusDot status={a.status} T={T} />
                <span style={{ fontSize: 11, fontWeight: 700, color: T.adrInk }}>{label}</span>
                <span style={{ fontSize: 9, color: T.inkDim, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  {a.status}
                </span>
                {a.supersededBy && (
                  <span style={{
                    fontSize: 9, color: "#A78BFA",
                    background: "rgba(167,139,250,0.1)", padding: "1px 6px",
                    borderRadius: 3, letterSpacing: ".05em",
                  }}>↳ {a.supersededBy}</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{a.title}</div>
              <div style={{
                display: "flex", gap: 10, fontSize: 10, color: T.inkDim,
                alignItems: "center",
              }}>
                <span>{a.date || "—"}</span>
                <span>·</span>
                <span>{ownerName(a.owner)}</span>
                {containerCount > 0 && <>
                  <span>·</span>
                  <span>{containerCount} container{containerCount > 1 ? "s" : ""}</span>
                </>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Full-screen modal: edit one ADR ──
function AdrModal({ T, adr, isNew, owners, projects, containers, onSave, onDelete, onClose }) {
  const { useState } = React;
  const [draft, setDraft] = useState(() => ({
    id: adr.id || "",
    title: adr.title || "",
    status: adr.status || "proposed",
    date: adr.date || new Date().toISOString().slice(0, 10),
    owner: adr.owner || "",
    context: adr.context || "",
    decision: adr.decision || "",
    consequences: adr.consequences || "",
    alternatives: adr.alternatives || [],
    tradeoffs: adr.tradeoffs || "",
    relatedAdrs: adr.relatedAdrs || [],
    supersededBy: adr.supersededBy || null,
    reviewDate: adr.reviewDate || "",
    affects: {
      projects:   (adr.affects && adr.affects.projects)   || [],
      containers: (adr.affects && adr.affects.containers) || [],
      flows:      (adr.affects && adr.affects.flows)      || [],
    },
  }));

  const setField = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setAffects = (k, v) => setDraft((d) => ({ ...d, affects: { ...d.affects, [k]: v } }));

  const toggleContainer = (id) => {
    const cur = draft.affects.containers;
    setAffects("containers", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };
  const toggleProject = (id) => {
    const cur = draft.affects.projects;
    setAffects("projects", cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  const num = (draft.id.match(/(\d+)$/) || [])[1] || "";
  const label = num ? `ADR-${num.padStart(3, "0")}` : draft.id;

  const onAltsChange = (e) => {
    setField("alternatives", e.target.value.split("\n").filter(Boolean));
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
        width: "min(820px, 100%)", maxHeight: "90vh",
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
            }}>{isNew ? "New decision" : "Decision"}</span>
            <span style={{ fontSize: 14, color: T.adrInk, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
              {label}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {!isNew && (
              <button onClick={() => {
                if (confirm(`Delete ${label}? This can't be undone.`)) onDelete(draft.id);
              }} style={btnDanger(T)}>Delete</button>
            )}
            <button onClick={() => onSave(draft)} style={btnPrimary(T)}>Save</button>
            <button onClick={onClose} style={btnGhost(T)}>Cancel</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Title">
            <input value={draft.title} onChange={(e) => setField("title", e.target.value)} style={input(T)} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Status">
              <select value={draft.status} onChange={(e) => setField("status", e.target.value)} style={select(T)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={draft.date} onChange={(e) => setField("date", e.target.value)} style={input(T)} />
            </Field>
            <Field label="Owner (team)">
              <select value={draft.owner} onChange={(e) => setField("owner", e.target.value)} style={select(T)}>
                <option value="">—</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Context" hint="What problem are we solving? Why now?">
            <textarea value={draft.context} onChange={(e) => setField("context", e.target.value)}
              rows={3} style={textarea(T)} />
          </Field>

          <Field label="Decision" hint="The choice we're making. Be specific.">
            <textarea value={draft.decision} onChange={(e) => setField("decision", e.target.value)}
              rows={3} style={textarea(T)} />
          </Field>

          <Field label="Consequences" hint="Both the good and the bad.">
            <textarea value={draft.consequences} onChange={(e) => setField("consequences", e.target.value)}
              rows={2} style={textarea(T)} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Alternatives considered" hint="One per line">
              <textarea value={draft.alternatives.join("\n")} onChange={onAltsChange}
                rows={3} style={textarea(T)} />
            </Field>
            <Field label="Trade-offs">
              <textarea value={draft.tradeoffs} onChange={(e) => setField("tradeoffs", e.target.value)}
                rows={3} style={textarea(T)} />
            </Field>
          </div>

          {/* Affects */}
          <div style={{ borderTop: `1px solid ${T.cardBorder}`, paddingTop: 14 }}>
            <div style={{
              fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
              color: T.inkDim, marginBottom: 4,
            }}>Affects</div>
            <div style={{ fontSize: 11, color: T.inkDim, marginBottom: 12 }}>
              Click to link this ADR to projects and containers.
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: 11, color: T.ink, marginBottom: 6,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontWeight: 700 }}>Projects</span>
                <span style={{ color: T.inkDim, fontSize: 10 }}>
                  {draft.affects.projects.length} of {projects.length} selected
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {projects.map((p) => {
                  const on = draft.affects.projects.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => toggleProject(p.id)}
                      style={chipStyle(T, on, p.color)}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 11, color: T.ink, marginBottom: 6,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontWeight: 700 }}>Containers</span>
                <span style={{ color: T.inkDim, fontSize: 10 }}>
                  {draft.affects.containers.length} of {containers.length} selected · click chips to toggle
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {containers.map((c) => {
                  const on = draft.affects.containers.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleContainer(c.id)}
                      style={chipStyle(T, on)}>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: `1px solid ${T.cardBorder}`, paddingTop: 14 }}>
            <Field label="Review date">
              <input type="date" value={draft.reviewDate || ""} onChange={(e) => setField("reviewDate", e.target.value)} style={input(T)} />
            </Field>
            <Field label="Superseded by (ADR id)">
              <input value={draft.supersededBy || ""} onChange={(e) => setField("supersededBy", e.target.value || null)}
                placeholder="adr.005" style={input(T)} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tiny visual helpers ──
function Field({ label, hint, children }) {
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

const input = (T) => ({
  background: "rgba(0,0,0,0.25)",
  border: `1px solid ${T.cardBorder}`,
  borderRadius: 4, color: T.ink,
  padding: "7px 10px", fontSize: 13,
  fontFamily: T.titleStack, outline: "none",
});

const textarea = (T) => ({
  ...input(T),
  resize: "vertical", lineHeight: 1.45, fontSize: 12.5,
});

const select = (T) => ({
  ...input(T), padding: "6px 8px", flex: 1,
});

const btnPrimary = (T) => ({
  background: T.accent, color: "#0a1d3a",
  border: "none", borderRadius: 4,
  padding: "6px 14px", fontWeight: 700, cursor: "pointer",
  fontFamily: T.titleStack, fontSize: 12,
});

const btnGhost = (T) => ({
  background: "transparent", color: T.ink,
  border: `1px solid ${T.cardBorder}`, borderRadius: 4,
  padding: "6px 14px", cursor: "pointer",
  fontFamily: T.titleStack, fontSize: 12,
});

const btnDanger = (T) => ({
  background: "transparent", color: "#F87171",
  border: "1px solid rgba(248,113,113,0.4)", borderRadius: 4,
  padding: "6px 14px", cursor: "pointer",
  fontFamily: T.titleStack, fontSize: 12,
});

const chipStyle = (T, on, accentColor) => ({
  fontSize: 11, padding: "4px 10px", borderRadius: 999,
  border: `1px solid ${on ? (accentColor || T.accent) : T.cardBorder}`,
  background: on ? `${accentColor || T.accent}20` : "transparent",
  color: on ? T.ink : "rgba(180,200,230,.75)",
  cursor: "pointer", fontFamily: T.titleStack,
  letterSpacing: ".01em",
});

window.DecisionsButton = DecisionsButton;
window.DecisionsPanel = DecisionsPanel;
window.AdrModal = AdrModal;
