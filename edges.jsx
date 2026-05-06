/* global React */
// EdgeModal — create/edit/delete a single edge.
// Used for contextEdges, containerEdges and componentEdges (the kind is
// passed in via the `kind` prop). When `isNew` is true, both endpoints are
// editable; when editing an existing edge, the user can still change them
// and we route the save through `replaceEdge` so the old key gets cleaned.
(function (global) {
  const { useState, useMemo } = React;

  const PROTOCOLS = ["http", "https", "mqtt", "grpc", "nats", "sql", "kafka", "amqp", "ws", "webhook", "sftp", "tcp", "udp", "rest"];

  function EdgeModal({
    T, kind, edge, isNew, originalEdge,
    endpoints, // [{id,label}]
    onSave, onDelete, onClose,
  }) {
    const [draft, setDraft] = useState(() => ({
      from: edge.from || "",
      to: edge.to || "",
      label: edge.label || "",
      protocol: edge.protocol || (kind === "componentEdges" ? "" : "http"),
      kind: edge.kind || "", // "adr" | "" — only relevant for containerEdges
    }));

    const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

    const valid = draft.from && draft.to && draft.from !== draft.to;

    const heading = useMemo(() => {
      if (kind === "contextEdges")   return "Context edge";
      if (kind === "containerEdges") return "Container edge";
      if (kind === "componentEdges") return "Component edge";
      return "Edge";
    }, [kind]);

    return (
      <div onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 80, fontFamily: T.titleStack,
        }}>
        <div style={{
          width: 520, background: T.cardBg, color: T.ink,
          border: `1px solid ${T.cardBorder}`, borderRadius: 8,
          padding: 22, display: "flex", flexDirection: "column", gap: 14,
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".22em", textTransform: "uppercase", color: T.inkDim }}>
                {isNew ? "New" : "Edit"}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{heading}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!isNew && (
                <button onClick={() => {
                  if (window.confirm(`Delete this connection (${draft.from} → ${draft.to})?`)) {
                    onDelete(originalEdge);
                  }
                }} style={{
                  background: "transparent", color: "#ff6b6b",
                  border: "1px solid #ff6b6b66", borderRadius: 4,
                  padding: "5px 12px", cursor: "pointer", fontSize: 11.5,
                  fontFamily: T.titleStack,
                }}>Delete</button>
              )}
              <button onClick={() => valid && onSave(draft, originalEdge)}
                disabled={!valid}
                style={{
                  background: T.accent, color: "#0a1d3a",
                  border: "none", borderRadius: 4,
                  padding: "5px 12px", fontWeight: 700, cursor: valid ? "pointer" : "not-allowed",
                  fontFamily: T.titleStack, fontSize: 11.5,
                  opacity: valid ? 1 : 0.45,
                }}>Save</button>
              <button onClick={onClose} style={{
                background: "transparent", color: T.ink,
                border: `1px solid ${T.cardBorder}`, borderRadius: 4,
                padding: "5px 12px", cursor: "pointer",
                fontFamily: T.titleStack, fontSize: 12,
              }}>Cancel</button>
            </div>
          </div>

          {/* From / To */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field T={T} label="From">
              <select value={draft.from} onChange={(e) => set("from", e.target.value)} style={selStyle(T)}>
                <option value="">— choose —</option>
                {endpoints.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </Field>
            <Field T={T} label="To">
              <select value={draft.to} onChange={(e) => set("to", e.target.value)} style={selStyle(T)}>
                <option value="">— choose —</option>
                {endpoints.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </Field>
          </div>
          {draft.from && draft.from === draft.to && (
            <div style={{ fontSize: 11, color: "#ff9933" }}>From and To cannot be the same node.</div>
          )}

          {/* Protocol + label */}
          <Field T={T} label="Protocol">
            <select value={draft.protocol} onChange={(e) => set("protocol", e.target.value)} style={selStyle(T)}>
              <option value="">— none —</option>
              {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field T={T} label="Label">
            <input value={draft.label} onChange={(e) => set("label", e.target.value)}
              placeholder="e.g. publish · QoS 1, REST /v1/things"
              style={inpStyle(T)} />
          </Field>

          {/* containerEdges-only: ADR pseudo-edge toggle */}
          {kind === "containerEdges" && (
            <label style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: T.ink, cursor: "pointer",
              border: `1px solid ${T.cardBorder}`, padding: "8px 10px", borderRadius: 4,
            }}>
              <input type="checkbox" checked={draft.kind === "adr"}
                onChange={(e) => set("kind", e.target.checked ? "adr" : "")}
                style={{ accentColor: T.accent }} />
              <span>ADR association edge (dashed, no arrow)</span>
            </label>
          )}
        </div>
      </div>
    );
  }

  function Field({ T, label, children }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: T.inkDim }}>{label}</div>
        {children}
      </div>
    );
  }

  const inpStyle = (T) => ({
    background: "rgba(0,0,0,0.25)", border: `1px solid ${T.cardBorder}`,
    borderRadius: 4, color: T.ink, padding: "7px 10px", fontSize: 12,
    fontFamily: T.titleStack, outline: "none",
  });
  const selStyle = (T) => ({ ...inpStyle(T), padding: "6px 8px" });

  global.EdgeModal = EdgeModal;
})(window);
