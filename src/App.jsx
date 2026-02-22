import { useState, useEffect, useRef } from "react";
import { modules, languages, translationNotes } from "./modules.js";

// ─── Code Samples (moved to modules.js) ─────────────────────────────

// ─── Syntax Highlighting ─────────────────────────────────────────────

const keywordSets = {
  c: /\b(typedef|struct|double|int|void|return|if|else|for|continue)\b/g,
  rust: /\b(pub|fn|struct|let|if|return|impl|self|use|mut|const|for|in|f64|usize|Self)\b/g,
  python: /\b(class|def|self|return|if|else|for|in|import|from|float|int|list|continue|property|min)\b/g,
  fortran: /\b(module|implicit|none|type|real|integer|function|result|end|if|then|return|do|contains|intent|in|cycle|use|subroutine|call)\b/g,
  julia: /\b(struct|function|end|return|if|for|in|Float64|Int|Vector|import|using|const|module|export)\b/g,
  javascript: /\b(class|constructor|this|const|let|var|function|return|if|else|for|of|export|new|get|Math)\b/g,
  go: /\b(package|import|type|struct|func|return|if|for|float64|int|var|range|continue)\b/g,
};

const commentPatterns = {
  c: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  rust: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  python: /(#.*$|"""[\s\S]*?"""|'''[\s\S]*?''')/gm,
  fortran: /(!.*$)/gm,
  julia: /(#.*$|"""[\s\S]*?""")/gm,
  javascript: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  go: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
};

const stringPattern = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
const numberPattern = /\b(\d+\.?\d*(?:[eE][+-]?\d+)?(?:d0|d\d)?)\b/g;

function highlightCode(code, langId) {
  let html = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const tokens = [];
  function stash(match) {
    const id = `%%TOK${tokens.length}%%`;
    tokens.push(match);
    return id;
  }

  const commentRe = commentPatterns[langId];
  if (commentRe) {
    html = html.replace(commentRe, (m) => stash(`<span class="cm">${m}</span>`));
  }

  html = html.replace(stringPattern, (m) => stash(`<span class="st">${m}</span>`));

  const kwRe = keywordSets[langId];
  if (kwRe) {
    html = html.replace(kwRe, (m) => stash(`<span class="kw">${m}</span>`));
  }

  html = html.replace(numberPattern, (m) => stash(`<span class="nu">${m}</span>`));

  html = html.replace(/%%TOK(\d+)%%/g, (_, i) => tokens[parseInt(i)]);

  return html;
}

// ─── Difficulty Badge ────────────────────────────────────────────────

const difficultyConfig = {
  accessible: { label: "Accessible", color: "#50a14f", icon: "\u{1F7E2}" },
  intermediate: { label: "Intermediate", color: "#c18401", icon: "\u{1F7E1}" },
  advanced: { label: "Advanced", color: "#e45649", icon: "\u{1F534}" },
};

// ─── Components ──────────────────────────────────────────────────────

function CodePanel({ code, langId, label, color, t, scrollRef, onScroll }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      borderRadius: 8,
      overflow: "hidden",
      border: `1px solid ${t.border}`,
      background: t.panelBg,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: t.panelHeader,
        borderBottom: `1px solid ${t.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: color, boxShadow: `0 0 6px ${color}55`,
        }} />
        <span style={{
          fontSize: 13, fontWeight: 600, color: t.text,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          letterSpacing: 0.5,
        }}>{label}</span>
        <button
          onClick={handleCopy}
          title="Copy code"
          style={{
            marginLeft: "auto",
            padding: "3px 8px",
            borderRadius: 4,
            border: `1px solid ${t.border}`,
            background: copied ? t.accent + "22" : "transparent",
            color: copied ? t.accent : t.textDim,
            cursor: "pointer",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            transition: "all 0.2s",
          }}
        >
          {copied ? "\u2713 Copied" : "Copy"}
        </button>
      </div>
      <div ref={scrollRef} onScroll={onScroll} style={{
        flex: 1,
        overflow: "auto",
        padding: "12px 0",
        fontSize: 12.5,
        lineHeight: 1.65,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', monospace",
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            display: "flex",
            minHeight: 20,
            paddingRight: 16,
          }}>
            <span style={{
              width: 44,
              flexShrink: 0,
              textAlign: "right",
              paddingRight: 14,
              color: t.lineNum,
              userSelect: "none",
              fontSize: 11,
            }}>{i + 1}</span>
            <span
              style={{ color: t.text, whiteSpace: "pre" }}
              dangerouslySetInnerHTML={{
                __html: highlightCode(line, langId),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleInfoPanel({ mod, t, show, onToggle }) {
  if (!show) return null;

  const diff = difficultyConfig[mod.difficulty] || difficultyConfig.intermediate;

  return (
    <div style={{
      margin: "0 20px",
      padding: "16px 20px",
      background: t.notesBg,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.7,
      color: t.textMuted,
    }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{
          padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
          background: t.accent + "18", color: t.accent, border: `1px solid ${t.accent}33`,
        }}>{mod.category}</span>
        <span style={{
          padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
          background: diff.color + "18", color: diff.color, border: `1px solid ${diff.color}33`,
        }}>{diff.icon} {diff.label}</span>
      </div>

      {mod.equations && (
        <div style={{ marginBottom: 8 }}>
          <strong style={{ color: t.accentAlt }}>Equations: </strong>
          <code style={{
            fontSize: 12, background: t.panelBg, padding: "2px 6px",
            borderRadius: 4, fontFamily: "'JetBrains Mono', monospace",
          }}>{mod.equations}</code>
        </div>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
        {mod.inputs && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: t.textBright, fontSize: 12 }}>Inputs: </strong>
            <span style={{ fontSize: 12 }}>{mod.inputs}</span>
          </div>
        )}
        {mod.outputs && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: t.textBright, fontSize: 12 }}>Outputs: </strong>
            <span style={{ fontSize: 12 }}>{mod.outputs}</span>
          </div>
        )}
      </div>

      {mod.links && mod.links.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          {mod.links.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 11, color: t.accent, textDecoration: "none",
                padding: "3px 10px", borderRadius: 4,
                border: `1px solid ${t.accent}33`, background: t.accent + "08",
              }}
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Themes ──────────────────────────────────────────────────────────

const themes = {
  dark: {
    bg: "#0d0f17",
    text: "#c8ccd8",
    textBright: "#e8ecf4",
    textMuted: "#6b7185",
    textDim: "#5c6370",
    textFaint: "#3a3f52",
    panelBg: "#12141c",
    panelHeader: "#1a1d28",
    border: "#2a2e3a",
    borderLight: "#1e2130",
    borderSubtle: "#1a1d28",
    activeBg: "#1e2130",
    activeBorder: "#3a3f55",
    hoverBg: "#1a1d28",
    modActiveBg: "#1a1d2e",
    notesBg: "#141620",
    accent: "#61afef",
    accentAlt: "#c678dd",
    scrollThumb: "#2a2e3a",
    scrollThumbHover: "#3a3f55",
    lineNum: "#3a3f52",
    cm: "#5c6370",
    kw: "#c678dd",
    st: "#98c379",
    nu: "#d19a66",
    fn: "#61afef",
  },
  light: {
    bg: "#f5f6f8",
    text: "#383a42",
    textBright: "#1a1c23",
    textMuted: "#696d80",
    textDim: "#8a8e9c",
    textFaint: "#b0b4c0",
    panelBg: "#ffffff",
    panelHeader: "#f0f1f4",
    border: "#d5d8e0",
    borderLight: "#e4e6eb",
    borderSubtle: "#ecedf0",
    activeBg: "#e8eaf0",
    activeBorder: "#b0b4c8",
    hoverBg: "#ecedf2",
    modActiveBg: "#e6ecf8",
    notesBg: "#f0f4fc",
    accent: "#4078c0",
    accentAlt: "#a626a4",
    scrollThumb: "#c8ccd5",
    scrollThumbHover: "#a0a4b0",
    lineNum: "#b0b4c0",
    cm: "#8a8e9c",
    kw: "#a626a4",
    st: "#50a14f",
    nu: "#c18401",
    fn: "#4078c0",
  },
};

// ─── Main App ────────────────────────────────────────────────────────

export default function SWMM5CodeViewer() {
  const moduleKeys = Object.keys(modules);
  const [selectedModule, setSelectedModule] = useState(moduleKeys[0]);
  const [leftLang, setLeftLang] = useState("c");
  const [rightLang, setRightLang] = useState("rust");
  const [showNotes, setShowNotes] = useState(true);
  const [showModuleInfo, setShowModuleInfo] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [isMobile, setIsMobile] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("rosetta");

  const leftScrollRef = useRef(null);
  const rightScrollRef = useRef(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = moduleKeys.filter((key) => {
        const q = searchQuery.toLowerCase();
        const m = modules[key];
        return (
          key.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.equations && m.equations.toLowerCase().includes(q)) ||
          (m.inputs && m.inputs.toLowerCase().includes(q)) ||
          (m.outputs && m.outputs.toLowerCase().includes(q)) ||
          (m.tags && m.tags.some((tag) => tag.toLowerCase().includes(q)))
        );
      });
      if (filtered.length > 0 && !filtered.includes(selectedModule)) {
        setSelectedModule(filtered[0]);
      }
    }
  }, [searchQuery]);

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

  const t = themes[theme];

  const filteredModuleKeys = searchQuery.trim()
    ? moduleKeys.filter((key) => {
        const q = searchQuery.toLowerCase();
        const m = modules[key];
        return (
          key.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
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
  const mod = modules[effectiveModule];
  const leftInfo = languages.find((l) => l.id === leftLang);
  const rightInfo = languages.find((l) => l.id === rightLang);
  const diff = difficultyConfig[mod.difficulty] || difficultyConfig.intermediate;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `Compare EPA SWMM5 stormwater algorithms across 7 programming languages — C, Rust, Python, Fortran, Julia, JavaScript, and Go. The SWMM5 Rosetta Stone:`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: t.bg,
      color: t.text,
      fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
      transition: "background 0.3s, color 0.3s",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .cm { color: ${t.cm} !important; font-style: italic; }
        .kw { color: ${t.kw} !important; }
        .st { color: ${t.st} !important; }
        .nu { color: ${t.nu} !important; }
        .fn { color: ${t.fn} !important; }
        .lang-tab { 
          padding: 7px 14px; border-radius: 6px; border: 1px solid transparent;
          background: transparent; color: ${t.textMuted}; cursor: pointer;
          font-size: 13px; font-weight: 500; transition: all 0.2s;
          font-family: 'JetBrains Mono', monospace;
          display: flex; align-items: center; gap: 6px;
        }
        .lang-tab:hover { color: ${t.text}; background: ${t.hoverBg}; }
        .lang-tab.active { 
          background: ${t.activeBg}; color: ${t.textBright}; 
          border-color: ${t.activeBorder}; 
        }
        .mod-btn {
          padding: 10px 16px; border-radius: 8px; border: 1px solid ${t.border};
          background: transparent; color: ${t.textMuted}; cursor: pointer;
          font-size: 13px; text-align: left; transition: all 0.2s;
          font-family: 'JetBrains Mono', monospace; width: 100%;
        }
        .mod-btn:hover { background: ${t.hoverBg}; color: ${t.text}; }
        .mod-btn.active {
          background: ${t.modActiveBg}; color: ${t.accent};
          border-color: ${t.accent}44;
        }
        .notes-box {
          margin: 0 20px 20px;
          padding: 16px 20px;
          background: ${t.notesBg};
          border: 1px solid ${t.border};
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.7;
          color: ${t.textMuted};
          border-left: 3px solid ${t.accent}44;
        }
        .theme-toggle {
          width: 36px; height: 36px; border-radius: 8px;
          border: 1px solid ${t.border}; background: ${t.panelHeader};
          color: ${t.textMuted}; cursor: pointer; font-size: 18;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .theme-toggle:hover { background: ${t.hoverBg}; color: ${t.text}; }
        .app-tab {
          padding: 10px 20px; border: none; cursor: pointer;
          font-size: 13px; font-weight: 600; transition: all 0.2s;
          font-family: 'IBM Plex Sans', sans-serif;
          background: transparent; color: ${t.textMuted};
          border-bottom: 2px solid transparent;
          display: flex; align-items: center; gap: 6px;
        }
        .app-tab:hover { color: ${t.text}; background: ${t.hoverBg}; }
        .app-tab.active {
          color: ${t.accent}; border-bottom-color: ${t.accent};
          background: ${t.modActiveBg};
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${t.scrollThumbHover}; }
        @media (max-width: 899px) {
          .lang-tab { padding: 5px 8px !important; font-size: 11px !important; }
          .mod-btn { padding: 4px 8px !important; font-size: 11px !important; }
        }
      `}</style>

      {/* Top Tab Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        borderBottom: `1px solid ${t.borderLight}`,
        background: t.panelHeader,
        gap: 0,
      }}>
        <button
          className={`app-tab ${activeTab === "rosetta" ? "active" : ""}`}
          onClick={() => setActiveTab("rosetta")}
        >
          <span style={{
            width: 20, height: 20, borderRadius: 5,
            background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: "#fff",
            fontFamily: "'JetBrains Mono', monospace",
          }}>S5</span>
          Rosetta Stone
        </button>
        <button
          className={`app-tab ${activeTab === "pyswmm4" ? "active" : ""}`}
          onClick={() => setActiveTab("pyswmm4")}
        >
          <span style={{ fontSize: 15 }}>{"\uD83D\uDC0D"}</span>
          PySWMM4
        </button>
        <button
          className={`app-tab ${activeTab === "microgpt" ? "active" : ""}`}
          onClick={() => setActiveTab("microgpt")}
        >
          <span style={{ fontSize: 15 }}>{"\uD83E\uDDE0"}</span>
          MicroGPT
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: 12 }}>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            style={{ width: 30, height: 30, fontSize: 16 }}
          >
            {theme === "dark" ? "\u2600" : "\u263E"}
          </button>
        </div>
      </div>

      {/* PySWMM4 Tab */}
      {activeTab === "pyswmm4" && (
        <div style={{ width: "100%", height: "calc(100vh - 46px)", overflow: "hidden" }}>
          <iframe
            src="https://swmm-explorer-1-robertdickinson.replit.app"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title="SWMM4PyExplorer"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}

      {/* MicroGPT Tab */}
      {activeTab === "microgpt" && (
        <div style={{ width: "100%", height: "calc(100vh - 46px)", overflow: "hidden" }}>
          <iframe
            src="https://micro-gpt-swmm.replit.app"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title="SWMM5 MicroGPT"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}

      {/* Rosetta Stone Tab Content */}
      {activeTab === "rosetta" && <>

      {/* Landing/About Section */}
      {showLanding && (
        <div style={{
          padding: "40px 24px 32px",
          borderBottom: `1px solid ${t.borderLight}`,
          textAlign: "center",
          position: "relative",
        }}>
          <button
            onClick={() => setShowLanding(false)}
            style={{
              position: "absolute", top: 12, right: 16,
              background: "transparent", border: "none",
              color: t.textDim, cursor: "pointer", fontSize: 18,
              padding: 4,
            }}
            title="Dismiss"
          >&times;</button>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 700, color: "#fff",
            fontFamily: "'JetBrains Mono', monospace",
            boxShadow: `0 4px 20px ${t.accent}33`,
          }}>S5</div>
          <h1 style={{
            fontSize: 28, fontWeight: 700, color: t.textBright,
            margin: "0 0 8px", letterSpacing: -0.5,
          }}>SWMM5 Rosetta Stone</h1>
          <p style={{
            fontSize: 15, color: t.textMuted, maxWidth: 680,
            margin: "0 auto 20px", lineHeight: 1.7,
          }}>
            Explore the core algorithms of{" "}
            <a href="https://www.epa.gov/water-research/storm-water-management-model-swmm"
              target="_blank" rel="noopener noreferrer"
              style={{ color: t.accent, textDecoration: "none" }}>EPA SWMM5</a>
            {" "}&mdash; the world's most widely-used stormwater model &mdash; translated from the original C engine into 7 modern programming languages. Compare how different paradigms handle hydrologic and hydraulic computations side-by-side.
          </p>
          <div style={{
            display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20,
          }}>
            {languages.map((lang) => (
              <span key={lang.id} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 12px", borderRadius: 6,
                background: t.panelHeader, border: `1px solid ${t.border}`,
                fontSize: 12, color: t.text,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: lang.color,
                }} />
                {lang.label}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <span style={{
              fontSize: 12, color: t.textDim, padding: "4px 10px",
              borderRadius: 6, background: t.notesBg, border: `1px solid ${t.border}`,
            }}>{moduleKeys.length} algorithm modules</span>
            <span style={{
              fontSize: 12, color: t.textDim, padding: "4px 10px",
              borderRadius: 6, background: t.notesBg, border: `1px solid ${t.border}`,
            }}>7 languages</span>
            <span style={{
              fontSize: 12, color: t.textDim, padding: "4px 10px",
              borderRadius: 6, background: t.notesBg, border: `1px solid ${t.border}`,
            }}>Synchronized scrolling</span>
          </div>
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setShowLanding(false)}
              style={{
                padding: "10px 28px", borderRadius: 8,
                background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
                border: "none", color: "#fff", cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                boxShadow: `0 2px 12px ${t.accent}44`,
                transition: "transform 0.2s",
              }}
            >
              Start Exploring
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        padding: "14px 24px",
        borderBottom: `1px solid ${t.borderLight}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 7,
            background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: "#fff",
            fontFamily: "'JetBrains Mono', monospace",
            cursor: "pointer",
          }} onClick={() => setShowLanding(true)}>S5</div>
          <div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: t.textBright,
              letterSpacing: -0.3, cursor: "pointer",
            }} onClick={() => setShowLanding(true)}>
              SWMM5 Rosetta Stone
            </div>
            <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 1 }}>
              EPA SWMM5 Engine Code — Multi-Language Translation Viewer
            </div>
          </div>
        </div>

        <div style={{
          position: "relative", flex: "0 1 220px", minWidth: 140,
        }}>
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
              onClick={() => { setSelectedModule(key); setShowLanding(false); }}
              style={{ width: "auto", padding: "5px 10px", fontSize: 11 }}
            >
              {key.split("—")[0].trim()}
            </button>
          ))}
          {searchQuery && filteredModuleKeys.length === 0 && (
            <span style={{ fontSize: 11, color: t.textDim, fontStyle: "italic" }}>No matches</span>
          )}
          <div style={{ width: 1, height: 20, background: t.border, margin: "0 4px" }} />
          <a href={linkedInUrl} target="_blank" rel="noopener noreferrer"
            title="Share on LinkedIn"
            style={{
              width: 30, height: 30, borderRadius: 6,
              border: `1px solid ${t.border}`, background: t.panelHeader,
              color: t.textMuted, display: "flex", alignItems: "center",
              justifyContent: "center", textDecoration: "none",
              fontSize: 13, transition: "all 0.2s",
            }}>in</a>
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
            title="Share on X/Twitter"
            style={{
              width: 30, height: 30, borderRadius: 6,
              border: `1px solid ${t.border}`, background: t.panelHeader,
              color: t.textMuted, display: "flex", alignItems: "center",
              justifyContent: "center", textDecoration: "none",
              fontSize: 13, transition: "all 0.2s",
            }}>X</a>
        </div>
      </div>

      {/* Module Description */}
      <div style={{
        padding: "12px 24px",
        fontSize: 13,
        color: t.textMuted,
        borderBottom: `1px solid ${t.borderSubtle}`,
        lineHeight: 1.6,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{
                padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                background: t.accent + "18", color: t.accent, border: `1px solid ${t.accent}33`,
              }}>{mod.category}</span>
              <span style={{
                padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                background: diff.color + "18", color: diff.color, border: `1px solid ${diff.color}33`,
              }}>{diff.icon} {diff.label}</span>
            </div>
            {mod.description}
          </div>
          <button
            onClick={() => setShowModuleInfo(!showModuleInfo)}
            style={{
              padding: "4px 10px", borderRadius: 6, border: `1px solid ${t.border}`,
              background: showModuleInfo ? t.modActiveBg : "transparent",
              color: showModuleInfo ? t.accent : t.textDim,
              cursor: "pointer", fontSize: 11, whiteSpace: "nowrap",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {showModuleInfo ? "▾" : "▸"} Details
          </button>
        </div>
      </div>

      {/* Module Info Panel */}
      {showModuleInfo && <ModuleInfoPanel mod={mod} t={t} show={showModuleInfo} />}

      {/* Language Selectors */}
      <div style={{
        padding: "12px 24px",
        display: "flex",
        gap: 24,
        borderBottom: `1px solid ${t.borderLight}`,
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, color: t.textDim, textTransform: "uppercase",
            letterSpacing: 1.5, fontWeight: 600,
          }}>LEFT</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {languages.map((lang) => (
              <button
                key={lang.id}
                className={`lang-tab ${leftLang === lang.id ? "active" : ""}`}
                onClick={() => setLeftLang(lang.id)}
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
            {languages.map((lang) => (
              <button
                key={lang.id}
                className={`lang-tab ${rightLang === lang.id ? "active" : ""}`}
                onClick={() => setRightLang(lang.id)}
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

        <button
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${showNotes ? t.accent + "44" : t.border}`,
            background: showNotes ? t.modActiveBg : "transparent",
            color: showNotes ? t.accent : t.textMuted,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
          onClick={() => setShowNotes(!showNotes)}
        >
          {showNotes ? "▾" : "▸"} Translation Notes
        </button>
      </div>

      {/* Translation Notes */}
      {showNotes && rightLang !== leftLang && (() => {
        const pairKey = [leftLang, rightLang].sort().join("-");
        const note = translationNotes[pairKey];
        return note ? (
          <div className="notes-box" style={{ margin: "16px 20px 0" }}>
            <strong style={{ color: t.accentAlt }}>
              {leftInfo.label} \u2194 {rightInfo.label}:
            </strong>{" "}
            {note}
          </div>
        ) : null;
      })()}

      {/* Code Panels */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: 12,
        padding: "16px 20px 24px",
        height: isMobile ? "auto" : "calc(100vh - 280px)",
        minHeight: isMobile ? 0 : 400,
      }}>
        <div style={{ flex: 1, minHeight: isMobile ? 350 : 0, display: "flex", flexDirection: "column" }}>
          <CodePanel
            code={mod[leftLang]}
            langId={leftLang}
            label={`${leftInfo.label} ${leftInfo.ext}`}
            color={leftInfo.color}
            t={t}
            scrollRef={leftScrollRef}
            onScroll={handleScrollSync("left")}
          />
        </div>
        {!isMobile && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            flexShrink: 0,
            padding: "0 4px",
          }}>
            <div style={{ color: t.textFaint, fontSize: 18 }}>⇄</div>
          </div>
        )}
        <div style={{ flex: 1, minHeight: isMobile ? 350 : 0, display: "flex", flexDirection: "column" }}>
          <CodePanel
            code={mod[rightLang]}
            langId={rightLang}
            label={`${rightInfo.label} ${rightInfo.ext}`}
            color={rightInfo.color}
            t={t}
            scrollRef={rightScrollRef}
            onScroll={handleScrollSync("right")}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "12px 24px",
        borderTop: `1px solid ${t.borderSubtle}`,
        fontSize: 11,
        color: t.textFaint,
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}>
        <span>SWMM5 Rosetta Stone</span>
        <span>&bull;</span>
        <span>EPA Storm Water Management Model</span>
        <span>&bull;</span>
        <span>{moduleKeys.length} Modules &bull; 7 Languages</span>
        <span>&bull;</span>
        <a href="https://www.epa.gov/water-research/storm-water-management-model-swmm"
          target="_blank" rel="noopener noreferrer"
          style={{ color: t.textDim, textDecoration: "none" }}>swmm5.org</a>
      </div>

      </>}
    </div>
  );
}
