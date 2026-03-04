import { useState } from "react";
import { appIdeas, summaryMatrix } from "./appIdeas.js";
import MicroEngine from "./apps/MicroEngine.jsx";
import SwmmLint from "./apps/SwmmLint.jsx";
import ScenarioOrchestrator from "./apps/ScenarioOrchestrator.jsx";
import HpcSolver from "./apps/HpcSolver.jsx";
import UncertaintyLab from "./apps/UncertaintyLab.jsx";
import NetworkVisualizer from "./apps/NetworkVisualizer.jsx";
import ApiServer from "./apps/ApiServer.jsx";
import WasmEngine from "./apps/WasmEngine.jsx";
import CrossSectionCalc from "./apps/CrossSectionCalc.jsx";
import ModelDashboard from "./apps/ModelDashboard.jsx";
import HydrographPlotter from "./apps/HydrographPlotter.jsx";
import DesignStormGen from "./apps/DesignStormGen.jsx";
import EventLogger from "./apps/EventLogger.jsx";

const demoComponents = {
  "c-micro-engine": MicroEngine,
  "rust-linter": SwmmLint,
  "python-orchestrator": ScenarioOrchestrator,
  "fortran-hpc": HpcSolver,
  "julia-uq": UncertaintyLab,
  "js-visualizer": NetworkVisualizer,
  "go-api-server": ApiServer,
  "zig-wasm": WasmEngine,
  "cpp-xsect": CrossSectionCalc,
  "typescript-dashboard": ModelDashboard,
  "matlab-hydrograph": HydrographPlotter,
  "csharp-designstorm": DesignStormGen,
  "java-eventlogger": EventLogger,
};

const highlightSimple = (code, lang) => {
  let html = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tokens = [];
  const stash = (m) => { const id = `%%T${tokens.length}%%`; tokens.push(m); return id; };

  const commentRes = {
    c: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    rust: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    python: /(#.*$)/gm,
    fortran: /(!.*$)/gm,
    julia: /(#.*$)/gm,
    javascript: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    go: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    zig: /(\/\/.*$)/gm,
  };
  const kwRes = {
    c: /\b(typedef|struct|double|int|void|return|if|else|for|continue|include)\b/g,
    rust: /\b(pub|fn|struct|let|if|return|impl|self|use|mut|const|for|in|f64|usize|Self|Vec|enum|match|Some|None)\b/g,
    python: /\b(class|def|self|return|if|else|for|in|import|from|float|int|list|with|as|print|property)\b/g,
    fortran: /\b(module|implicit|none|type|real|integer|function|result|end|if|then|return|do|contains|intent|in|use|subroutine|call|program|associate|allocatable|sync|all)\b/g,
    julia: /\b(struct|function|end|return|if|for|in|Float64|Int|Vector|using|const|module|export|mutable)\b/g,
    javascript: /\b(class|constructor|this|const|let|var|function|return|if|else|for|of|new|get|Math|continue|typeof|parseFloat|parseInt)\b/g,
    go: /\b(package|import|type|struct|func|return|if|for|float64|int|var|range|map|make|string|go|defer)\b/g,
    zig: /\b(const|var|fn|pub|return|if|else|while|struct|export|undefined|void|f64|u32)\b/g,
  };

  const cr = commentRes[lang];
  if (cr) html = html.replace(cr, (m) => stash(`<span style="color:#7f848e">${m}</span>`));
  html = html.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
    (m) => stash(`<span style="color:#98c379">${m}</span>`));
  const kr = kwRes[lang];
  if (kr) html = html.replace(kr, (m) => stash(`<span style="color:#c678dd">${m}</span>`));
  html = html.replace(/\b(\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
    (m) => stash(`<span style="color:#d19a66">${m}</span>`));
  html = html.replace(/%%T(\d+)%%/g, (_, i) => tokens[parseInt(i)]);
  return html;
};

function AppCard({ app, theme, isExpanded, onToggle, showDemo, onToggleDemo }) {
  const t = {
    ...theme,
    cardBg: theme.panelBg,
    tagBg: theme.activeBg,
    codeBg: theme.panelHeader,
    textSecondary: theme.text,
  };
  const impactColors = { "High": "#c18401", "Very High": "#50a14f" };

  return (
    <div style={{
      background: t.cardBg,
      border: `1px solid ${isExpanded ? app.languageColor : t.border}`,
      borderRadius: 12,
      overflow: "hidden",
      transition: "all 0.3s ease",
      cursor: isExpanded ? "default" : "pointer",
      boxShadow: isExpanded ? `0 4px 20px ${app.languageColor}22` : "none",
    }} onClick={() => !isExpanded && onToggle()}>
      <div style={{
        padding: "20px 24px",
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `${app.languageColor}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, flexShrink: 0,
        }}>{app.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
              background: `${app.languageColor}33`, color: app.languageColor,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{app.language}</span>
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 11,
              background: `${impactColors[app.impact] || "#888"}22`,
              color: impactColors[app.impact] || "#888",
            }}>{app.impact} Impact</span>
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 11,
              background: t.tagBg, color: t.textMuted,
            }}>{app.difficulty}</span>
          </div>
          <h3 style={{
            margin: "4px 0 6px", fontSize: 18, fontWeight: 700, color: t.text,
          }}>{app.name}</h3>
          <p style={{
            margin: 0, fontSize: 14, color: app.languageColor,
            fontStyle: "italic", fontWeight: 500,
          }}>"{app.tagline}"</p>
          {!isExpanded && (
            <p style={{
              margin: "8px 0 0", fontSize: 13, color: t.textMuted,
              lineHeight: 1.5, overflow: "hidden",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>{app.description}</p>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }} style={{
          background: "none", border: "none", color: t.textMuted,
          fontSize: 20, cursor: "pointer", padding: 4, flexShrink: 0,
          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }}>{"\u25BC"}</button>
      </div>

      {isExpanded && (
        <div style={{ padding: "0 24px 24px" }}>
          <p style={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.7, margin: "0 0 20px" }}>
            {app.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 20 }}>
            <div>
              <h4 style={{ color: app.languageColor, fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                Why {app.language}?
              </h4>
              <p style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.6, margin: 0 }}>
                {app.whyThisLanguage}
              </p>
            </div>
            <div>
              <h4 style={{ color: app.languageColor, fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                Key Features
              </h4>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: t.textSecondary, lineHeight: 1.8 }}>
                {app.features.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: app.languageColor, fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Architecture
            </h4>
            <pre style={{
              background: t.codeBg, border: `1px solid ${t.border}`, borderRadius: 8,
              padding: 16, fontSize: 12, color: t.textSecondary, lineHeight: 1.6,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              overflow: "auto", margin: 0, whiteSpace: "pre",
            }}>{app.architecture}</pre>
          </div>

          {demoComponents[app.id] && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <h4 style={{ color: app.languageColor, fontSize: 13, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>
                  Interactive Demo
                </h4>
                <button onClick={(e) => { e.stopPropagation(); onToggleDemo(); }} style={{
                  padding: "4px 14px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: showDemo ? `${app.languageColor}22` : t.tagBg,
                  color: showDemo ? app.languageColor : t.textMuted,
                  border: `1px solid ${showDemo ? app.languageColor + "44" : t.border}`,
                }}>{showDemo ? "Hide Demo" : "Launch Demo"}</button>
              </div>
              {showDemo && (
                <div style={{
                  border: `1px solid ${app.languageColor}44`, borderRadius: 8,
                  background: t.codeBg, overflow: "hidden",
                }}>
                  {(() => { const Demo = demoComponents[app.id]; return <Demo theme={t} />; })()}
                </div>
              )}
            </div>
          )}

          <div>
            <h4 style={{ color: app.languageColor, fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Code Sample ({app.language})
            </h4>
            <pre style={{
              background: t.codeBg, border: `1px solid ${t.border}`, borderRadius: 8,
              padding: 16, fontSize: 12, lineHeight: 1.6,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              overflow: "auto", margin: 0, maxHeight: 500,
            }} dangerouslySetInnerHTML={{ __html: highlightSimple(app.codeSample, app.codeLang) }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShowcase({ theme }) {
  const [expandedId, setExpandedId] = useState(null);
  const [demoId, setDemoId] = useState(null);

  const t = {
    ...theme,
    cardBg: theme.panelBg,
    tagBg: theme.activeBg,
    codeBg: theme.panelHeader,
    textSecondary: theme.text,
  };

  return (
    <div style={{ height: "calc(100vh - 46px)", overflow: "auto", background: t.bg }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: t.text, margin: "0 0 8px" }}>
            Language-Native SWMM Apps
          </h1>
          <p style={{ fontSize: 16, color: t.textMuted, margin: "0 0 16px", maxWidth: 700, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Each programming language has unique strengths. These {appIdeas.length} app concepts play to what each language does better than any other &mdash; from C's bare-metal portability to Julia's probabilistic computing.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, background: t.tagBg, color: t.textMuted }}>
              {appIdeas.length} Languages
            </span>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, background: t.tagBg, color: t.textMuted }}>
              {appIdeas.length} App Concepts
            </span>
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, background: t.tagBg, color: t.textMuted }}>
              Full Code Samples
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 36 }}>
          {appIdeas.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              theme={t}
              isExpanded={expandedId === app.id}
              onToggle={() => { setExpandedId(expandedId === app.id ? null : app.id); if (expandedId === app.id) setDemoId(null); }}
              showDemo={demoId === app.id}
              onToggleDemo={() => setDemoId(demoId === app.id ? null : app.id)}
            />
          ))}
        </div>

        <div style={{
          background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 12,
          padding: 24, marginBottom: 36,
        }}>
          <h3 style={{ color: t.text, fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>
            Summary Matrix
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse", fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                  {["Language", "App Idea", "Plays To", "Difficulty", "Impact"].map((h) => (
                    <th key={h} style={{
                      textAlign: "left", padding: "10px 12px", color: t.textMuted,
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryMatrix.map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: `1px solid ${t.border}`,
                    background: i % 2 === 0 ? "transparent" : `${t.border}22`,
                  }}>
                    <td style={{ padding: "10px 12px", color: t.text, fontWeight: 600 }}>{row.language}</td>
                    <td style={{ padding: "10px 12px", color: t.textSecondary }}>{row.app}</td>
                    <td style={{ padding: "10px 12px", color: t.textMuted, fontSize: 12 }}>{row.playsTo}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11,
                        background: row.difficulty === "High" ? "#e4564922" : "#c1840122",
                        color: row.difficulty === "High" ? "#e45649" : "#c18401",
                      }}>{row.difficulty}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 11,
                        background: row.impact === "Very High" ? "#50a14f22" : "#c1840122",
                        color: row.impact === "Very High" ? "#50a14f" : "#c18401",
                      }}>{row.impact}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "16px 0 32px", fontSize: 12, color: t.textMuted }}>
          SWMM5 Rosetta Stone &mdash; Language-Native App Concepts
        </div>
      </div>
    </div>
  );
}
