// settings.jsx
// Self-contained settings panel — replaces the editor's Tweaks button so the
// HTML works the same in local / production as it does inside the editor.
//
// Renders a floating gear button (bottom-right) that opens a slide-in panel
// with: theme, level, show externals, reset layout.

const { useState: useSettingsState } = React;

function SettingsButton({ open, onClick, T }) {
  return (
    <button
      onClick={onClick}
      title={open ? "Close settings" : "Settings"}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 44, height: 44,
        borderRadius: 22,
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        color: T.ink,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 6px 18px rgba(0,0,0,.25)",
        zIndex: 30,
        fontSize: 18,
        userSelect: "none",
      }}>
      <span style={{ display: "block", transform: open ? "rotate(60deg)" : "rotate(0)", transition: "transform .2s" }}>⚙</span>
    </button>
  );
}

function SettingsPanel({ T, settings, setSettings, onResetLayout, onClose }) {
  const fieldStyle = {
    display: "flex", flexDirection: "column", gap: 6,
    fontSize: 11, color: T.inkDim, letterSpacing: ".05em", textTransform: "uppercase",
  };
  const radioRow = {
    display: "flex", gap: 4, padding: 2,
    background: `${T.bg}88`,
    border: `1px solid ${T.cardBorder}`,
    borderRadius: 4,
  };
  const radioBtn = (active) => ({
    flex: 1,
    padding: "6px 10px",
    background: active ? T.accent : "transparent",
    color: active ? T.bg : T.ink,
    border: "none",
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 11,
    fontFamily: T.fontStack,
    letterSpacing: ".02em",
    textTransform: "none",
    fontWeight: active ? 600 : 400,
  });

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: 80,
        right: 24,
        width: 280,
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 8,
        padding: 16,
        color: T.ink,
        fontFamily: T.fontStack,
        boxShadow: "0 12px 32px rgba(0,0,0,.35)",
        zIndex: 31,
        display: "flex", flexDirection: "column", gap: 16,
      }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: T.inkDim,
        }}>Settings</div>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: T.inkDim, cursor: "pointer",
          fontSize: 16, padding: 0, lineHeight: 1,
        }}>×</button>
      </div>

      <div style={fieldStyle}>
        Theme
        <div style={radioRow}>
          {[
            { v: "blueprint", l: "Blueprint" },
            { v: "paper",     l: "Paper" },
            { v: "dark",      l: "Dashboard" },
          ].map((o) => (
            <button key={o.v}
              onClick={() => setSettings({ ...settings, theme: o.v })}
              style={radioBtn(settings.theme === o.v)}>{o.l}</button>
          ))}
        </div>
      </div>

      <div style={fieldStyle}>
        C4 Level
        <div style={radioRow}>
          {[
            { v: "auto",      l: "Auto" },
            { v: "context",   l: "L1" },
            { v: "container", l: "L2" },
            { v: "component", l: "L3" },
            { v: "code",      l: "L4" },
          ].map((o) => (
            <button key={o.v}
              onClick={() => setSettings({ ...settings, level: o.v })}
              style={radioBtn(settings.level === o.v)}>{o.l}</button>
          ))}
        </div>
        <div style={{ fontSize: 9.5, color: T.inkDim, lineHeight: 1.4, textTransform: "none", letterSpacing: 0, marginTop: 2 }}>
          Auto tracks the zoom · L1 ecosystem · L2 containers · L3 components · L4 code
        </div>
      </div>

      <label style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 12, color: T.ink, cursor: "pointer",
      }}>
        <span>Show external systems (L1)</span>
        <input
          type="checkbox"
          checked={!!settings.showExternals}
          onChange={(e) => setSettings({ ...settings, showExternals: e.target.checked })}
          style={{ accentColor: T.accent, cursor: "pointer" }}
        />
      </label>

      <label style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 12, color: T.ink, cursor: "pointer",
      }}>
        <span>Animate active flow</span>
        <input
          type="checkbox"
          checked={!!settings.flowAnimate}
          onChange={(e) => setSettings({ ...settings, flowAnimate: e.target.checked })}
          style={{ accentColor: T.accent, cursor: "pointer" }}
        />
      </label>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => {
            if (typeof window.__BLUEPRINT_FIT_VIEW === "function") {
              window.__BLUEPRINT_FIT_VIEW();
            }
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "transparent",
            color: T.ink,
            border: `1px solid ${T.cardBorder}`,
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            fontFamily: T.fontStack,
            letterSpacing: ".05em",
            textTransform: "uppercase",
          }}>Fit view</button>
        <button
          onClick={() => {
            if (window.confirm("Reset all card positions to their default layout?")) {
              onResetLayout();
            }
          }}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "transparent",
            color: T.inkDim,
            border: `1px solid ${T.cardBorder}`,
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            fontFamily: T.fontStack,
            letterSpacing: ".05em",
            textTransform: "uppercase",
          }}>Reset layout</button>
      </div>

      <div style={{ fontSize: 10, color: T.inkDim, lineHeight: 1.45 }}>
        Settings persist in your browser.
      </div>
    </div>
  );
}

window.SettingsButton = SettingsButton;
window.SettingsPanel = SettingsPanel;
