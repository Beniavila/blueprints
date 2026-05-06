// notes.jsx
// Self-contained notes / tasks system anchored to cards on the canvas.
//
// Persistence: localStorage, keyed by blueprint project name.
// Each note: { id, cardId, project?, text, status, createdAt, updatedAt }
//   - cardId is the original BLUEPRINT.containers[].id (or a __project__ /
//     __ext__ virtual id for L1).
//   - status: "todo" | "doing" | "done"
//
// Components exposed on window:
//   useNotes           — hook: load/save/CRUD notes from localStorage
//   <NotesButton>      — two floating buttons: comment mode toggle + panel toggle
//   <CommentModeBanner>— top banner shown while comment mode is active
//   <NotePin>          — per-card badge (count bubble) that opens the popover
//   <NotePopover>      — card-anchored popover to add/view/status notes
//   <NotesPanel>       — full side panel: list, filters, export/import JSON

const { useState: useNotesState, useMemo: useNotesMemo, useEffect: useNotesEffect } = React;

const STATUS_LABELS = {
  todo:  { label: "Todo",     color: "#FCA5A5" },
  doing: { label: "Doing",    color: "#FCD34D" },
  done:  { label: "Done",     color: "#86EFAC" },
};

function makeNoteId() {
  return "n_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadNotes(blueprintName) {
  try {
    const raw = localStorage.getItem("blueprint.notes." + blueprintName);
    return raw ? JSON.parse(raw) : [];
  } catch (_) { return []; }
}

function saveNotes(blueprintName, notes) {
  try {
    localStorage.setItem("blueprint.notes." + blueprintName, JSON.stringify(notes));
  } catch (_) {}
}

// Small hook to manage notes state with persistence
function useNotes(blueprintName) {
  const [notes, setNotes] = useNotesState(() => loadNotes(blueprintName));
  useNotesEffect(() => { saveNotes(blueprintName, notes); }, [notes, blueprintName]);

  const addNote = (cardId, text, project) => {
    const n = {
      id: makeNoteId(),
      cardId,
      project: project || null,
      text,
      status: "todo",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes((prev) => [...prev, n]);
    return n;
  };
  const updateNote = (id, patch) => {
    setNotes((prev) => prev.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
    ));
  };
  const deleteNote = (id) => setNotes((prev) => prev.filter((n) => n.id !== id));
  const importNotes = (newNotes) => {
    if (!Array.isArray(newNotes)) return;
    setNotes(newNotes);
  };

  return { notes, addNote, updateNote, deleteNote, importNotes, setNotes };
}

// ──────────────────────────────────────────────────────────────────────
// Floating button (bottom-right, sits next to settings)
function NotesButton({ commentMode, onToggleCommentMode, onOpenPanel, T, openPanel, badgeCount }) {
  return (
    <>
      {/* Comment mode toggle — bottom right, above settings */}
      <button
        onClick={onToggleCommentMode}
        title={commentMode ? "Exit comment mode" : "Add notes (click any card)"}
        style={{
          position: "fixed",
          bottom: 24,
          right: 80,
          width: 44, height: 44,
          borderRadius: 22,
          background: commentMode ? T.accent : T.cardBg,
          border: `1px solid ${commentMode ? T.accent : T.cardBorder}`,
          color: commentMode ? T.bg : T.ink,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,.25)",
          zIndex: 30,
          fontSize: 17,
          userSelect: "none",
        }}>
        💬
      </button>

      {/* List/panel toggle */}
      <button
        onClick={onOpenPanel}
        title="Open notes panel"
        style={{
          position: "fixed",
          bottom: 24,
          right: 136,
          width: 44, height: 44,
          borderRadius: 22,
          background: openPanel ? T.accent : T.cardBg,
          border: `1px solid ${openPanel ? T.accent : T.cardBorder}`,
          color: openPanel ? T.bg : T.ink,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,.25)",
          zIndex: 30,
          fontSize: 14,
          fontFamily: "ui-monospace, monospace",
          userSelect: "none",
          fontWeight: 600,
        }}>
        ≡
        {badgeCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 9,
            background: openPanel ? T.bg : T.accent,
            color: openPanel ? T.accent : T.bg,
            fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}>{badgeCount}</span>
        )}
      </button>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Banner shown while in comment mode — explains the interaction.
function CommentModeBanner({ T, onExit }) {
  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      background: T.accent, color: T.bg,
      padding: "8px 16px",
      borderRadius: 20,
      fontFamily: T.fontStack,
      fontSize: 12,
      letterSpacing: ".05em",
      boxShadow: "0 6px 18px rgba(0,0,0,.25)",
      zIndex: 35,
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{ fontWeight: 600 }}>Comment mode</span>
      <span style={{ opacity: .8 }}>· click any card to add a note</span>
      <button onClick={onExit} style={{
        background: "transparent",
        border: `1px solid ${T.bg}66`,
        color: T.bg,
        borderRadius: 12,
        padding: "2px 10px",
        fontSize: 11,
        cursor: "pointer",
        fontFamily: T.fontStack,
      }}>Done</button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Per-card pin — appears on cards that have notes attached.
function NotePin({ count, T, onClick }) {
  if (!count) return null;
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`${count} note${count === 1 ? "" : "s"}`}
      style={{
        position: "absolute", top: -8, right: -8,
        minWidth: 22, height: 22, padding: "0 6px",
        borderRadius: 11,
        background: T.accent, color: T.bg,
        fontSize: 11, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 3px 8px rgba(0,0,0,.3)",
        cursor: "pointer",
        zIndex: 5,
        fontFamily: T.fontStack,
      }}>
      {count}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Popover that appears next to a card when adding/viewing notes.
function NotePopover({ T, anchorRect, cardLabel, cardId, project, notes, onAdd, onUpdate, onDelete, onClose }) {
  const [draft, setDraft] = useNotesState("");
  if (!anchorRect) return null;

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(cardId, draft.trim(), project);
    setDraft("");
  };

  // Position: place to the right of the card, clamped within viewport.
  const W = 320;
  let left = anchorRect.right + 12;
  let top = anchorRect.top;
  if (left + W > window.innerWidth - 12) left = anchorRect.left - W - 12;
  if (left < 12) left = 12;
  if (top + 320 > window.innerHeight - 12) top = window.innerHeight - 332;
  if (top < 12) top = 12;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left, top,
        width: W,
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 8,
        padding: 14,
        color: T.ink,
        fontFamily: T.fontStack,
        boxShadow: "0 12px 32px rgba(0,0,0,.4)",
        zIndex: 40,
        display: "flex", flexDirection: "column", gap: 10,
        maxHeight: "70vh", overflow: "auto",
      }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", color: T.inkDim,
          }}>Notes on</div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: T.ink,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{cardLabel}</div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: T.inkDim, cursor: "pointer",
          fontSize: 16, padding: 0, lineHeight: 1,
        }}>×</button>
      </div>

      {/* Existing notes */}
      {notes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notes.map((n) => (
            <div key={n.id} style={{
              padding: "8px 10px",
              background: `${T.bg}88`,
              border: `1px solid ${T.cardBorder}`,
              borderRadius: 4,
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                {n.text}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <button key={k}
                      onClick={() => onUpdate(n.id, { status: k })}
                      style={{
                        padding: "2px 8px",
                        fontSize: 9.5,
                        background: n.status === k ? v.color : "transparent",
                        color: n.status === k ? T.bg : T.inkDim,
                        border: `1px solid ${n.status === k ? v.color : T.cardBorder}`,
                        borderRadius: 3,
                        cursor: "pointer",
                        fontFamily: T.fontStack,
                        letterSpacing: ".05em",
                        textTransform: "uppercase",
                        fontWeight: n.status === k ? 700 : 400,
                      }}>{v.label}</button>
                  ))}
                </div>
                <button onClick={() => onDelete(n.id)} style={{
                  background: "none", border: "none", color: T.inkDim, cursor: "pointer",
                  fontSize: 11, padding: 0,
                }}>delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder="New note · cmd/ctrl+enter to submit"
        rows={3}
        style={{
          width: "100%",
          padding: 8,
          background: `${T.bg}88`,
          color: T.ink,
          border: `1px solid ${T.cardBorder}`,
          borderRadius: 4,
          fontFamily: T.fontStack,
          fontSize: 12,
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={submit} disabled={!draft.trim()} style={{
          padding: "6px 14px",
          background: draft.trim() ? T.accent : T.cardBorder,
          color: T.bg,
          border: "none",
          borderRadius: 4,
          cursor: draft.trim() ? "pointer" : "not-allowed",
          fontSize: 11,
          fontFamily: T.fontStack,
          letterSpacing: ".05em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}>Add note</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Side panel — list of all notes in the blueprint, filterable, exportable.
function NotesPanel({ T, notes, blueprintName, projects, cardLabelFor, onUpdate, onDelete, onImport, onClose, onJumpToCard }) {
  const [statusFilter, setStatusFilter] = useNotesState("all");
  const [projectFilter, setProjectFilter] = useNotesState("all");

  const filtered = useNotesMemo(() => {
    return notes.filter((n) => {
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (projectFilter !== "all" && n.project !== projectFilter) return false;
      return true;
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, statusFilter, projectFilter]);

  const counts = useNotesMemo(() => {
    const c = { all: notes.length, todo: 0, doing: 0, done: 0 };
    notes.forEach((n) => { c[n.status] = (c[n.status] || 0) + 1; });
    return c;
  }, [notes]);

  const exportNotes = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${blueprintName}-notes.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importNotesFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (ev) => {
      const f = ev.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const arr = JSON.parse(e.target.result);
          if (!Array.isArray(arr)) throw new Error("not an array");
          if (window.confirm(`Replace current ${notes.length} note(s) with ${arr.length} from file?`)) {
            onImport(arr);
          }
        } catch (err) {
          alert("Could not parse notes file: " + err.message);
        }
      };
      r.readAsText(f);
    };
    input.click();
  };

  const filterBtn = (active) => ({
    padding: "4px 10px",
    fontSize: 10,
    background: active ? T.accent : "transparent",
    color: active ? T.bg : T.inkDim,
    border: `1px solid ${active ? T.accent : T.cardBorder}`,
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: T.fontStack,
    letterSpacing: ".05em",
    textTransform: "uppercase",
    fontWeight: active ? 700 : 400,
  });

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: 16, bottom: 80, right: 16,
        width: 380,
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 8,
        padding: 16,
        color: T.ink,
        fontFamily: T.fontStack,
        boxShadow: "0 12px 32px rgba(0,0,0,.35)",
        zIndex: 31,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: T.inkDim,
          }}>Notes & tasks</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
            {counts.all} {counts.all === 1 ? "note" : "notes"}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: T.inkDim, cursor: "pointer",
          fontSize: 18, padding: 0, lineHeight: 1,
        }}>×</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        <button onClick={() => setStatusFilter("all")} style={filterBtn(statusFilter === "all")}>
          All ({counts.all})
        </button>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => setStatusFilter(k)} style={filterBtn(statusFilter === k)}>
            {v.label} ({counts[k] || 0})
          </button>
        ))}
      </div>
      {projects && projects.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <button onClick={() => setProjectFilter("all")} style={filterBtn(projectFilter === "all")}>
            All projects
          </button>
          {projects.map((p) => (
            <button key={p.id} onClick={() => setProjectFilter(p.id)} style={filterBtn(projectFilter === p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{
            padding: "32px 12px", textAlign: "center", color: T.inkDim, fontSize: 12,
            border: `1px dashed ${T.cardBorder}`, borderRadius: 4,
          }}>
            {notes.length === 0
              ? "No notes yet. Click the 💬 button and then a card to add one."
              : "No notes match the current filters."}
          </div>
        )}
        {filtered.map((n) => {
          const status = STATUS_LABELS[n.status] || STATUS_LABELS.todo;
          return (
            <div key={n.id} style={{
              padding: 10,
              background: `${T.bg}88`,
              border: `1px solid ${T.cardBorder}`,
              borderLeft: `3px solid ${status.color}`,
              borderRadius: 4,
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <button
                  onClick={() => onJumpToCard && onJumpToCard(n.cardId)}
                  style={{
                    background: "none", border: "none", padding: 0,
                    fontSize: 11, color: T.accent, cursor: "pointer",
                    fontFamily: T.fontStack,
                    fontWeight: 600,
                    textAlign: "left",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                  {cardLabelFor(n.cardId)}
                </button>
                <div style={{
                  fontSize: 9, letterSpacing: ".15em", textTransform: "uppercase",
                  color: status.color, flexShrink: 0, fontWeight: 700,
                }}>{status.label}</div>
              </div>
              <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                {n.text}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <button key={k}
                      onClick={() => onUpdate(n.id, { status: k })}
                      title={v.label}
                      style={{
                        width: 20, height: 14,
                        background: n.status === k ? v.color : "transparent",
                        border: `1px solid ${v.color}88`,
                        borderRadius: 2,
                        cursor: "pointer",
                        padding: 0,
                      }}/>
                  ))}
                </div>
                <button onClick={() => onDelete(n.id)} style={{
                  background: "none", border: "none", color: T.inkDim, cursor: "pointer",
                  fontSize: 10, padding: 0,
                }}>delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — export / import */}
      <div style={{ display: "flex", gap: 6, borderTop: `1px solid ${T.cardBorder}`, paddingTop: 10 }}>
        <button onClick={exportNotes} style={{
          flex: 1,
          padding: "6px 10px",
          background: "transparent",
          color: T.ink,
          border: `1px solid ${T.cardBorder}`,
          borderRadius: 3,
          cursor: "pointer",
          fontSize: 10,
          fontFamily: T.fontStack,
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}>Export JSON</button>
        <button onClick={importNotesFile} style={{
          flex: 1,
          padding: "6px 10px",
          background: "transparent",
          color: T.ink,
          border: `1px solid ${T.cardBorder}`,
          borderRadius: 3,
          cursor: "pointer",
          fontSize: 10,
          fontFamily: T.fontStack,
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}>Import JSON</button>
      </div>
    </div>
  );
}

window.useNotes = useNotes;
window.NotesButton = NotesButton;
window.CommentModeBanner = CommentModeBanner;
window.NotePin = NotePin;
window.NotePopover = NotePopover;
window.NotesPanel = NotesPanel;
window.STATUS_LABELS = STATUS_LABELS;
