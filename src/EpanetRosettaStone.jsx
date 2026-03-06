import { useState, useRef, useEffect, useCallback } from "react";
import { epanetModules, epanetLanguages, EPANET_MODULE_GRAPH, epanetCategories } from "./epanetModules.js";
import { CodePanel, ModuleInfoPanel, difficultyConfig, playgroundUrls, highlightCode } from "./codeComponents.jsx";

function EpanetDependencyDiagram({ t, onClickModule }) {
  const scale = 1.2;
  const W = 900 * scale, H = 500 * scale;

  return (
    <div style={{ overflowX: "auto", padding: "0 20px" }}>
      <svg width={W} height={H} viewBox="0 0 900 500" style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}>
        <defs>
          <marker id="en-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={t.textDim} />
          </marker>
        </defs>
        {EPANET_MODULE_GRAPH.edges.map((e, i) => {
          const from = EPANET_MODULE_GRAPH.nodes.find(n => n.id === e.from);
          const to = EPANET_MODULE_GRAPH.nodes.find(n => n.id === e.to);
          if (!from || !to) return null;
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          return (
            <g key={i}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={t.textFaint} strokeWidth={1.2} markerEnd="url(#en-arrowhead)" opacity={0.6} />
            </g>
          );
        })}
        {EPANET_MODULE_GRAPH.nodes.map(n => {
          const col = epanetCategories[n.category] || t.accent;
          return (
            <g key={n.id} style={{ cursor: "pointer" }} onClick={() => onClickModule && onClickModule(n.id)}>
              <circle cx={n.x} cy={n.y} r={24} fill={col + "22"} stroke={col} strokeWidth={1.5} />
              <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontWeight={600} fill={col} fontFamily="'JetBrains Mono', monospace">
                {n.label.replace(".c", "")}
              </text>
            </g>
          );
        })}
        <g transform="translate(10, 470)">
          {Object.entries(epanetCategories).map(([cat, col], i) => (
            <g key={cat} transform={`translate(${i * 120}, 0)`}>
              <circle cx={6} cy={-3} r={5} fill={col + "44"} stroke={col} strokeWidth={1} />
              <text x={14} y={0} fontSize={8} fill={t.textMuted} fontFamily="sans-serif">{cat}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function EpanetRosettaStone({ theme: t }) {
  const moduleKeys = Object.keys(epanetModules);
  const [selectedModule, setSelectedModule] = useState(moduleKeys[0]);
  const [leftLang, setLeftLang] = useState("c");
  const [rightLang, setRightLang] = useState("rust");
  const [showModuleInfo, setShowModuleInfo] = useState(false);
  const [showDepDiagram, setShowDepDiagram] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedLine, setHighlightedLine] = useState(-1);
  const [codeSearch, setCodeSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const leftScrollRef = useRef(null);
  const rightScrollRef = useRef(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleScrollSync = (source) => () => {
    if (isSyncing.current) return;
    const srcEl = source === "left" ? leftScrollRef.current : rightScrollRef.current;
    const tgtEl = source === "left" ? rightScrollRef.current : leftScrollRef.current;
    if (!srcEl || !tgtEl) return;
    const srcMax = srcEl.scrollHeight - srcEl.clientHeight;
    const tgtMax = tgtEl.scrollHeight - tgtEl.clientHeight;
    if (srcMax <= 0 || tgtMax <= 0) return;
    isSyncing.current = true;
    const ratio = srcEl.scrollTop / srcMax;
    tgtEl.scrollTop = Math.round(ratio * tgtMax);
    requestAnimationFrame(() => { isSyncing.current = false; });
  };

  const filteredModuleKeys = searchQuery.trim()
    ? moduleKeys.filter((key) => {
        const q = searchQuery.toLowerCase();
        const m = epanetModules[key];
        return (
          key.toLowerCase().includes(q) ||
          (m.description && m.description.toLowerCase().includes(q)) ||
          (m.category && m.category.toLowerCase().includes(q)) ||
          (m.equations && m.equations.toLowerCase().includes(q)) ||
          (m.inputs && m.inputs.toLowerCase().includes(q)) ||
          (m.outputs && m.outputs.toLowerCase().includes(q)) ||
          (m.tags && m.tags.some((tag) => tag.toLowerCase().includes(q)))
        );
      })
    : moduleKeys;

  const effectiveModule = filteredModuleKeys.includes(selectedModule)
    ? selectedModule
    : filteredModuleKeys[0] || moduleKeys[0];
  const mod = epanetModules[effectiveModule];
  const leftInfo = epanetLanguages.find((l) => l.id === leftLang) || { label: leftLang, color: "#888", ext: "", desc: "" };
  const rightInfo = epanetLanguages.find((l) => l.id === rightLang) || { label: rightLang, color: "#888", ext: "", desc: "" };
  const diff = difficultyConfig[mod?.difficulty] || difficultyConfig.intermediate;

  return (
    <div style={{ width: "100%", height: "calc(100vh - 46px)", display: "flex", flexDirection: "column", background: t.bg, color: t.text, overflow: "auto" }}>

      {/* Header */}
      <div style={{
        padding: "14px 24px",
        borderBottom: `1px solid ${t.borderLight}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 7,
            background: "linear-gradient(135deg, #0077b6 0%, #00b4d8 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff",
            fontFamily: "'JetBrains Mono', monospace",
          }}>EN</div>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: t.textBright,
              letterSpacing: -0.3,
            }}>
              EPANET 2.2 Rosetta Stone
            </div>
            <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 1 }}>
              {moduleKeys.length} Modules &times; {epanetLanguages.length} Languages &mdash; EPA EPANET Engine Code
            </div>
          </div>
        </div>

        <div style={{ position: "relative", flex: "0 1 220px", minWidth: 140 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules..."
            style={{
              width: "100%", padding: "6px 30px 6px 10px",
              borderRadius: 6, border: `1px solid ${t.border}`,
              background: t.panelBg, color: t.text,
              fontSize: 12, outline: "none",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none",
                color: t.textDim, cursor: "pointer", fontSize: 14, padding: 0,
              }}
            >&times;</button>
          )}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: t.textDim, marginRight: 2 }}>MODULE:</span>
          {filteredModuleKeys.map((key) => (
            <button
              key={key}
              className={`mod-btn ${effectiveModule === key ? "active" : ""}`}
              onClick={() => setSelectedModule(key)}
              style={{ width: "auto", padding: "5px 10px", fontSize: 11 }}
            >
              {key.split("\u2014")[0].trim().split(" \u2014")[0].trim()}
            </button>
          ))}
          {searchQuery && filteredModuleKeys.length === 0 && (
            <span style={{ fontSize: 11, color: t.textDim, fontStyle: "italic" }}>No matches</span>
          )}
        </div>
      </div>

      {/* Module Description */}
      {mod && (
        <div style={{
          padding: "12px 24px",
          fontSize: 13,
          color: t.textMuted,
          borderBottom: `1px solid ${t.borderSubtle || t.border}`,
          lineHeight: 1.6,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{
                  padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                  background: (epanetCategories[mod.category] || t.accent) + "18",
                  color: epanetCategories[mod.category] || t.accent,
                  border: `1px solid ${(epanetCategories[mod.category] || t.accent)}33`,
                }}>{mod.category}</span>
                <span style={{
                  padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                  background: diff.color + "18", color: diff.color, border: `1px solid ${diff.color}33`,
                }}>{diff.icon} {diff.label}</span>
              </div>
              {mod.description}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => setShowDepDiagram(!showDepDiagram)}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: `1px solid ${t.border}`,
                  background: showDepDiagram ? (t.modActiveBg || t.activeBg) : "transparent",
                  color: showDepDiagram ? t.accent : t.textDim,
                  cursor: "pointer", fontSize: 11, whiteSpace: "nowrap",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {showDepDiagram ? "\u25BE" : "\u25B8"} Diagram
              </button>
              <button
                onClick={() => setShowModuleInfo(!showModuleInfo)}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: `1px solid ${t.border}`,
                  background: showModuleInfo ? (t.modActiveBg || t.activeBg) : "transparent",
                  color: showModuleInfo ? t.accent : t.textDim,
                  cursor: "pointer", fontSize: 11, whiteSpace: "nowrap",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {showModuleInfo ? "\u25BE" : "\u25B8"} Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Module Info Panel */}
      {showModuleInfo && mod && <ModuleInfoPanel mod={mod} t={t} show={showModuleInfo} />}

      {/* Dependency Diagram */}
      {showDepDiagram && (
        <div style={{ padding: "16px 0", borderBottom: `1px solid ${t.borderSubtle || t.border}`, flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>EPANET Module Interconnections</span>
            <span style={{ fontSize: 11, color: t.textDim, marginLeft: 8 }}>Click a module to select it</span>
          </div>
          <EpanetDependencyDiagram t={t} onClickModule={(id) => {
            const match = moduleKeys.find(k => k.startsWith(id));
            if (match) { setSelectedModule(match); setShowDepDiagram(false); }
          }} />
        </div>
      )}

      {/* Language Selectors */}
      <div style={{
        padding: "12px 24px",
        display: "flex",
        gap: 24,
        borderBottom: `1px solid ${t.borderLight || t.border}`,
        flexWrap: "wrap",
        alignItems: "center",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, color: t.textDim, textTransform: "uppercase",
            letterSpacing: 1.5, fontWeight: 600,
          }}>LEFT</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {epanetLanguages.map((lang) => (
              <button
                key={lang.id}
                className={`lang-tab ${leftLang === lang.id ? "active" : ""}`}
                onClick={() => setLeftLang(lang.id)}
                title={lang.desc}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: lang.color,
                }} />
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: t.border }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, color: t.textDim, textTransform: "uppercase",
            letterSpacing: 1.5, fontWeight: 600,
          }}>RIGHT</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {epanetLanguages.map((lang) => (
              <button
                key={lang.id}
                className={`lang-tab ${rightLang === lang.id ? "active" : ""}`}
                onClick={() => setRightLang(lang.id)}
                title={lang.desc}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: lang.color,
                }} />
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Code Search Bar */}
      <div style={{
        padding: "8px 20px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderBottom: `1px solid ${t.borderSubtle || t.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, flexShrink: 0 }}>
          Search Code
        </span>
        <div style={{ position: "relative", flex: "0 1 260px", minWidth: 120 }}>
          <input
            type="text"
            value={codeSearch}
            onChange={(e) => setCodeSearch(e.target.value)}
            placeholder="Find in code panels..."
            style={{
              width: "100%", padding: "5px 28px 5px 10px",
              borderRadius: 5, border: `1px solid ${t.border}`,
              background: t.panelBg, color: t.text,
              fontSize: 11, outline: "none",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          />
          {codeSearch && (
            <button onClick={() => setCodeSearch("")} style={{
              position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 13, padding: 0,
            }}>&times;</button>
          )}
        </div>
        {codeSearch && mod && (() => {
          const lCount = (mod[leftLang] || "").split("\n").filter(l => l.toLowerCase().includes(codeSearch.toLowerCase())).length;
          const rCount = (mod[rightLang] || "").split("\n").filter(l => l.toLowerCase().includes(codeSearch.toLowerCase())).length;
          return (
            <span style={{ fontSize: 10, color: t.textDim, fontFamily: "monospace" }}>
              {lCount} + {rCount} matches
            </span>
          );
        })()}
        <span style={{ fontSize: 10, color: t.textFaint, marginLeft: "auto", fontStyle: "italic" }}>
          Hover a line to highlight its counterpart
        </span>
      </div>

      {/* Code Panels */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: 12,
        padding: "16px 20px 24px",
        flex: 1,
        minHeight: isMobile ? 0 : 400,
        overflow: "hidden",
      }}>
        <div style={{ flex: 1, minHeight: isMobile ? 350 : 0, display: "flex", flexDirection: "column" }}>
          <CodePanel
            code={mod?.[leftLang] || `// ${leftInfo.label} implementation coming soon`}
            langId={leftLang}
            label={`${leftInfo.label} ${leftInfo.ext}`}
            color={leftInfo.color}
            t={t}
            scrollRef={leftScrollRef}
            onScroll={handleScrollSync("left")}
            highlightedLine={highlightedLine}
            onLineHover={(i) => setHighlightedLine(i)}
            onLineLeave={() => setHighlightedLine(-1)}
            codeSearch={codeSearch}
            playgroundUrl={playgroundUrls[leftLang]}
          />
        </div>
        {!isMobile && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 4, flexShrink: 0, padding: "0 4px",
          }}>
            <div style={{ color: t.textFaint, fontSize: 18 }}>{"\u21C4"}</div>
          </div>
        )}
        <div style={{ flex: 1, minHeight: isMobile ? 350 : 0, display: "flex", flexDirection: "column" }}>
          <CodePanel
            code={mod?.[rightLang] || `// ${rightInfo.label} implementation coming soon`}
            langId={rightLang}
            label={`${rightInfo.label} ${rightInfo.ext}`}
            color={rightInfo.color}
            t={t}
            scrollRef={rightScrollRef}
            onScroll={handleScrollSync("right")}
            highlightedLine={highlightedLine}
            onLineHover={(i) => setHighlightedLine(i)}
            onLineLeave={() => setHighlightedLine(-1)}
            codeSearch={codeSearch}
            playgroundUrl={playgroundUrls[rightLang]}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "12px 24px",
        borderTop: `1px solid ${t.borderSubtle || t.border}`,
        fontSize: 11,
        color: t.textFaint,
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        flexShrink: 0,
      }}>
        <span>EPANET 2.2 Rosetta Stone</span>
        <span>&bull;</span>
        <span>EPA Water Distribution Network Model</span>
        <span>&bull;</span>
        <span>{moduleKeys.length} Modules &bull; {epanetLanguages.length} Languages</span>
        <span>&bull;</span>
        <a href="https://www.epa.gov/water-research/epanet"
          target="_blank" rel="noopener noreferrer"
          style={{ color: t.textDim, textDecoration: "none" }}>epanet.org</a>
      </div>
    </div>
  );
}
