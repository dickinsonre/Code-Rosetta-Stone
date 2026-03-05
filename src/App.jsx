import { useState, useEffect, useRef, useCallback } from "react";
import { modules, languages, translationNotes } from "./modules.js";
import AppShowcase from "./AppShowcase.jsx";

const playgroundUrls = {
  c: "https://godbolt.org/",
  rust: "https://play.rust-lang.org/",
  python: "https://pynative.com/online-python-code-editor-to-execute-python-code/",
  fortran: "https://godbolt.org/",
  julia: "https://julialang.org/learning/tryjulia/",
  javascript: "https://jsfiddle.net/",
  go: "https://go.dev/play/",
  zig: "https://godbolt.org/",
  cpp: "https://godbolt.org/",
  csharp: "https://dotnetfiddle.net/",
  matlab: "https://matlab.mathworks.com/",
  r: "https://www.mycompiler.io/new/r",
  delphi: "https://www.mycompiler.io/new/pascal",
  typescript: "https://www.typescriptlang.org/play",
  cuda: "https://godbolt.org/",
  wasm: "https://webassembly.sh/",
  mojo: "https://docs.modular.com/mojo/playground",
  java: "https://www.jdoodle.com/online-java-compiler/",
  nim: "https://play.nim-lang.org/",
  ada: "https://www.mycompiler.io/new/ada",
  chapel: "https://ato.pxl.se/run?lang=chapel",
  swift: "https://swiftfiddle.com/",
  kotlin: "https://play.kotlinlang.org/",
};

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
  zig: /\b(const|var|fn|pub|return|if|else|for|while|struct|enum|union|switch|break|continue|defer|try|catch|error|comptime|inline|export|unreachable|undefined|null|void|bool|u8|u16|u32|u64|i8|i16|i32|i64|f32|f64|usize|isize|anytype)\b/g,
  cpp: /\b(class|struct|double|int|void|return|if|else|for|continue|public|private|const|auto|namespace|using|include|template|new|delete|virtual|override|static|bool|float|size_t|std|this|nullptr)\b/g,
  csharp: /\b(class|struct|double|int|void|return|if|else|for|foreach|in|public|private|static|new|var|using|namespace|get|set|this|bool|float|string|readonly|const|override|abstract|virtual|null)\b/g,
  matlab: /\b(function|end|return|if|else|elseif|for|while|switch|case|otherwise|classdef|properties|methods|obj|true|false)\b/g,
  r: /\b(function|return|if|else|for|in|while|library|require|NULL|TRUE|FALSE|NA|c|list|data\.frame|numeric|integer|character|logical)\b/g,
  delphi: /\b(program|unit|uses|type|class|record|var|const|begin|end|function|procedure|result|if|then|else|for|to|do|while|repeat|until|private|public|property|inherited|constructor|destructor|implementation|interface|array|of|integer|double|string|boolean|nil|Self)\b/gi,
  typescript: /\b(class|constructor|this|const|let|var|function|return|if|else|for|of|export|new|get|Math|interface|type|number|string|boolean|void|readonly|private|public|static|extends|implements|enum|as|unknown|any|never)\b/g,
  cuda: /\b(__global__|__device__|__host__|__shared__|void|int|float|double|return|if|else|for|while|threadIdx|blockIdx|blockDim|gridDim|struct|const|static|dim3|sizeof|cudaMalloc|cudaMemcpy|cudaFree|syncthreads)\b/g,
  wasm: /\b(module|func|param|result|local|i32|i64|f32|f64|get|set|call|export|import|memory|table|global|mut|block|loop|br|br_if|return|if|then|else|end|drop|select|unreachable|nop|data|elem|type)\b/g,
  mojo: /\b(fn|def|struct|var|let|return|if|else|for|in|while|import|from|self|Self|Int|Float64|Float32|String|Bool|True|False|None|alias|owned|borrowed|inout|raises|trait|conformance|SIMD|DType)\b/g,
  java: /\b(class|interface|public|private|protected|static|final|void|int|double|float|boolean|long|return|if|else|for|while|new|this|extends|implements|import|package|try|catch|throw|throws|abstract|override|null|super|String)\b/g,
  nim: /\b(proc|func|var|let|const|type|object|return|if|else|elif|for|in|while|import|export|result|float64|int|string|bool|seq|ref|ptr|nil|of|method|template|macro|discard|echo|when)\b/g,
  ada: /\b(procedure|function|package|body|is|begin|end|return|if|then|else|elsif|for|loop|while|in|out|type|record|new|use|with|constant|access|range|Float|Integer|Boolean|String|null|not|and|or|pragma|declare|array|of|exception|raise|when|others|private|limited)\b/gi,
  chapel: /\b(proc|var|const|ref|param|type|record|class|module|use|import|return|if|else|for|in|while|do|forall|coforall|begin|on|real|int|bool|string|domain|range|config|iter|yield|sync|atomic|serial|reduce|scan|writeln)\b/g,
  swift: /\b(struct|class|func|var|let|return|if|else|for|in|while|import|self|Self|init|mutating|public|private|static|guard|switch|case|default|nil|true|false|Double|Int|Float|String|Bool|Array|protocol|extension|override|throws|try|catch|inout)\b/g,
  kotlin: /\b(class|data|fun|val|var|return|if|else|for|in|while|when|import|package|this|super|object|companion|override|open|abstract|interface|private|public|internal|protected|null|true|false|Double|Int|Float|String|Boolean|Long|is|as|try|catch|throw|constructor)\b/g,
};

const commentPatterns = {
  c: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  rust: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  python: /(#.*$|"""[\s\S]*?"""|'''[\s\S]*?''')/gm,
  fortran: /(!.*$)/gm,
  julia: /(#.*$|"""[\s\S]*?""")/gm,
  javascript: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  go: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  zig: /(\/\/.*$)/gm,
  cpp: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  csharp: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  matlab: /(%.*$|%\{[\s\S]*?%\})/gm,
  r: /(#.*$)/gm,
  delphi: /(\{[\s\S]*?\}|\/\/.*$|\(\*[\s\S]*?\*\))/gm,
  typescript: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  cuda: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  wasm: /(;;.*$)/gm,
  mojo: /(#.*$|"""[\s\S]*?"""|'''[\s\S]*?''')/gm,
  java: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  nim: /(#.*$|#\[[\s\S]*?\]#)/gm,
  ada: /(--.*$)/gm,
  chapel: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  swift: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  kotlin: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
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

function CodePanel({ code, langId, label, color, t, scrollRef, onScroll, highlightedLine, onLineHover, onLineLeave, codeSearch, playgroundUrl }) {
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

  const searchLower = codeSearch ? codeSearch.toLowerCase() : "";

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
        {playgroundUrl && (
          <a href={playgroundUrl} target="_blank" rel="noopener noreferrer"
            title="Try this language online"
            style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
              border: `1px solid ${t.accent}44`, background: t.accent + "11",
              color: t.accent, textDecoration: "none", cursor: "pointer",
            }}>Try Online \u2197</a>
        )}
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
        {lines.map((line, i) => {
          const isHighlighted = highlightedLine === i;
          const isSearchMatch = searchLower && line.toLowerCase().includes(searchLower);
          return (
            <div key={i}
              onMouseEnter={() => onLineHover && onLineHover(i)}
              onMouseLeave={() => onLineLeave && onLineLeave()}
              style={{
                display: "flex",
                minHeight: 20,
                paddingRight: 16,
                background: isSearchMatch ? (t.accent + "22") : isHighlighted ? (t.accent + "0d") : "transparent",
                borderLeft: isSearchMatch ? `3px solid ${t.accent}` : isHighlighted ? `3px solid ${t.accent}44` : "3px solid transparent",
                cursor: "pointer",
                transition: "background 0.1s",
              }}>
              <span style={{
                width: 44,
                flexShrink: 0,
                textAlign: "right",
                paddingRight: 14,
                color: isSearchMatch ? t.accent : t.lineNum,
                userSelect: "none",
                fontSize: 11,
                fontWeight: isSearchMatch ? 700 : 400,
              }}>{i + 1}</span>
              <span
                style={{ color: t.text, whiteSpace: "pre" }}
                dangerouslySetInnerHTML={{
                  __html: highlightCode(line, langId),
                }}
              />
            </div>
          );
        })}
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

const themeOrder = ["dark", "light", "uf", "auburn", "oregonstate", "epa"];
const themeLabels = {
  dark: "Dark", light: "Light", uf: "UF Gators",
  auburn: "Auburn", oregonstate: "Oregon State", epa: "EPA",
};
const themeIcons = {
  dark: "\u263E", light: "\u2600", uf: "\uD83D\uDC0A",
  auburn: "\uD83D\uDC2F", oregonstate: "\uD83E\uDDAB", epa: "\uD83C\uDF0E",
};

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
  uf: {
    bg: "#001438",
    text: "#d4dce8",
    textBright: "#f0f4fa",
    textMuted: "#7a8da8",
    textDim: "#5a6f8a",
    textFaint: "#2e4060",
    panelBg: "#001a48",
    panelHeader: "#002060",
    border: "#1a3560",
    borderLight: "#102850",
    borderSubtle: "#001a48",
    activeBg: "#102850",
    activeBorder: "#2a4570",
    hoverBg: "#0a2248",
    modActiveBg: "#1a2d55",
    notesBg: "#001640",
    accent: "#FA4616",
    accentAlt: "#0021A5",
    scrollThumb: "#1a3560",
    scrollThumbHover: "#2a4570",
    lineNum: "#2e4060",
    cm: "#5a6f8a",
    kw: "#FA4616",
    st: "#6db86b",
    nu: "#e8a735",
    fn: "#4d8fef",
  },
  auburn: {
    bg: "#0C1A2E",
    text: "#d0d8e4",
    textBright: "#eef2f8",
    textMuted: "#7888a0",
    textDim: "#586878",
    textFaint: "#2c3c52",
    panelBg: "#0f1f35",
    panelHeader: "#152840",
    border: "#1e3350",
    borderLight: "#142a42",
    borderSubtle: "#0f1f35",
    activeBg: "#142a42",
    activeBorder: "#2a4060",
    hoverBg: "#112438",
    modActiveBg: "#1a2e48",
    notesBg: "#0d1c30",
    accent: "#DD550C",
    accentAlt: "#0C2340",
    scrollThumb: "#1e3350",
    scrollThumbHover: "#2a4060",
    lineNum: "#2c3c52",
    cm: "#586878",
    kw: "#DD550C",
    st: "#6db86b",
    nu: "#e8a735",
    fn: "#5a9cd6",
  },
  oregonstate: {
    bg: "#0a0a0a",
    text: "#d0d0d0",
    textBright: "#f0f0f0",
    textMuted: "#808080",
    textDim: "#606060",
    textFaint: "#383838",
    panelBg: "#111111",
    panelHeader: "#1a1a1a",
    border: "#2a2a2a",
    borderLight: "#1e1e1e",
    borderSubtle: "#151515",
    activeBg: "#1e1e1e",
    activeBorder: "#3a3a3a",
    hoverBg: "#181818",
    modActiveBg: "#1c1810",
    notesBg: "#0f0f0f",
    accent: "#D73F09",
    accentAlt: "#8B4513",
    scrollThumb: "#2a2a2a",
    scrollThumbHover: "#3a3a3a",
    lineNum: "#383838",
    cm: "#606060",
    kw: "#D73F09",
    st: "#7cb342",
    nu: "#e09030",
    fn: "#d4853a",
  },
  epa: {
    bg: "#f4f8f5",
    text: "#1a2e22",
    textBright: "#0a1810",
    textMuted: "#4a6858",
    textDim: "#6a8878",
    textFaint: "#b0c8b8",
    panelBg: "#ffffff",
    panelHeader: "#e8f0ea",
    border: "#c0d8c8",
    borderLight: "#d8e8dc",
    borderSubtle: "#e8f0ec",
    activeBg: "#d8e8dc",
    activeBorder: "#90b0a0",
    hoverBg: "#e0ece4",
    modActiveBg: "#d0e4d8",
    notesBg: "#eaf4ee",
    accent: "#0071BC",
    accentAlt: "#2E8540",
    scrollThumb: "#b0c8b8",
    scrollThumbHover: "#90b0a0",
    lineNum: "#a0b8a8",
    cm: "#6a8878",
    kw: "#2E8540",
    st: "#0071BC",
    nu: "#c45500",
    fn: "#0071BC",
  },
};

// ─── Module Dependency Diagram ───────────────────────────────────────

const MODULE_GRAPH = {
  nodes: [
    { id: "rain.c", label: "rain.c", category: "Data", x: 60, y: 40 },
    { id: "climate.c", label: "climate.c", category: "Hydrology", x: 200, y: 40 },
    { id: "subcatch.c", label: "subcatch.c", category: "Hydrology", x: 130, y: 120 },
    { id: "infil.c", label: "infil.c", category: "Hydrology", x: 30, y: 180 },
    { id: "lid.c", label: "lid.c", category: "Hydrology", x: 30, y: 120 },
    { id: "gwater.c", label: "gwater.c", category: "Hydrology", x: 250, y: 120 },
    { id: "node.c", label: "node.c", category: "Hydraulics", x: 200, y: 210 },
    { id: "link.c", label: "link.c", category: "Hydraulics", x: 340, y: 210 },
    { id: "xsect.c", label: "xsect.c", category: "Hydraulics", x: 450, y: 150 },
    { id: "flowrout.c", label: "flowrout.c", category: "Hydraulics", x: 340, y: 290 },
    { id: "routing.c", label: "routing.c", category: "Hydraulics", x: 200, y: 290 },
    { id: "dynwave.c", label: "dynwave.c", category: "Hydraulics", x: 270, y: 370 },
    { id: "kinwave.c", label: "kinwave.c", category: "Hydraulics", x: 420, y: 370 },
    { id: "controls.c", label: "controls.c", category: "Operations", x: 450, y: 280 },
    { id: "qualrout.c", label: "qualrout.c", category: "Quality", x: 80, y: 370 },
    { id: "massbal.c", label: "massbal.c", category: "Data", x: 80, y: 290 },
    { id: "rdii.c", label: "rdii.c", category: "Hydrology", x: 340, y: 40 },
    { id: "treatmnt.c", label: "treatmnt.c", category: "Quality", x: 80, y: 450 },
    { id: "snow.c", label: "snow.c", category: "Hydrology", x: 340, y: 120 },
    { id: "dwflow.c", label: "dwflow.c", category: "Hydraulics", x: 340, y: 450 },
    { id: "hotstart.c", label: "hotstart.c", category: "Data", x: 450, y: 450 },
    { id: "iface.c", label: "iface.c", category: "Data", x: 450, y: 40 },
  ],
  edges: [
    { from: "rain.c", to: "subcatch.c", label: "rainfall" },
    { from: "climate.c", to: "subcatch.c", label: "ET" },
    { from: "infil.c", to: "subcatch.c", label: "infiltration" },
    { from: "lid.c", to: "subcatch.c", label: "storage" },
    { from: "subcatch.c", to: "node.c", label: "runoff" },
    { from: "gwater.c", to: "node.c", label: "lateral flow" },
    { from: "climate.c", to: "gwater.c", label: "ET" },
    { from: "node.c", to: "routing.c", label: "heads" },
    { from: "link.c", to: "routing.c", label: "flows" },
    { from: "xsect.c", to: "link.c", label: "geometry" },
    { from: "xsect.c", to: "dynwave.c", label: "A, Rh" },
    { from: "routing.c", to: "flowrout.c", label: "dispatch" },
    { from: "flowrout.c", to: "dynwave.c", label: "full solve" },
    { from: "flowrout.c", to: "kinwave.c", label: "simple solve" },
    { from: "dynwave.c", to: "node.c", label: "update" },
    { from: "kinwave.c", to: "node.c", label: "update" },
    { from: "controls.c", to: "link.c", label: "settings" },
    { from: "node.c", to: "controls.c", label: "state" },
    { from: "routing.c", to: "qualrout.c", label: "flows" },
    { from: "node.c", to: "qualrout.c", label: "volumes" },
    { from: "node.c", to: "massbal.c", label: "totals" },
    { from: "routing.c", to: "massbal.c", label: "totals" },
    { from: "rain.c", to: "rdii.c", label: "rainfall" },
    { from: "rdii.c", to: "node.c", label: "RDII flow" },
    { from: "snow.c", to: "subcatch.c", label: "snowmelt" },
    { from: "climate.c", to: "snow.c", label: "temperature" },
    { from: "qualrout.c", to: "treatmnt.c", label: "pollutants" },
    { from: "dwflow.c", to: "dynwave.c", label: "init" },
    { from: "dwflow.c", to: "kinwave.c", label: "init" },
    { from: "iface.c", to: "node.c", label: "inflows" },
  ],
};

const catColors = { Hydraulics: "#61afef", Hydrology: "#98c379", Quality: "#c678dd", Operations: "#e5c07b", Data: "#56b6c2" };

function ModuleDependencyDiagram({ t, onClickModule }) {
  const scale = 1.2;
  const W = 560 * scale, H = 520 * scale;

  return (
    <div style={{ overflowX: "auto", padding: "0 20px" }}>
      <svg width={W} height={H} viewBox={`0 0 ${560} ${520}`} style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={t.textDim} />
          </marker>
        </defs>
        {MODULE_GRAPH.edges.map((e, i) => {
          const from = MODULE_GRAPH.nodes.find(n => n.id === e.from);
          const to = MODULE_GRAPH.nodes.find(n => n.id === e.to);
          if (!from || !to) return null;
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          return (
            <g key={i}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={t.textFaint} strokeWidth={1.2} markerEnd="url(#arrowhead)" opacity={0.6} />
              <text x={mx} y={my - 4} textAnchor="middle" fontSize={7} fill={t.textDim} fontFamily="sans-serif">{e.label}</text>
            </g>
          );
        })}
        {MODULE_GRAPH.nodes.map(n => {
          const col = catColors[n.category] || t.accent;
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
        <g transform="translate(10, 420)">
          {Object.entries(catColors).map(([cat, col], i) => (
            <g key={cat} transform={`translate(${i * 100}, 0)`}>
              <circle cx={6} cy={-3} r={5} fill={col + "44"} stroke={col} strokeWidth={1} />
              <text x={14} y={0} fontSize={8} fill={t.textMuted} fontFamily="sans-serif">{cat}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

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
  const [activeGPT, setActiveGPT] = useState("microgpt");
  const [highlightedLine, setHighlightedLine] = useState(-1);
  const [codeSearch, setCodeSearch] = useState("");
  const [showDepDiagram, setShowDepDiagram] = useState(false);

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
  const shareText = `Compare EPA SWMM5 stormwater algorithms across ${languages.length} programming languages — from C to Rust, Python, MATLAB, CUDA, and more. The SWMM5 Rosetta Stone:`;
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
          className={`app-tab ${activeTab === "swmmapps" ? "active" : ""}`}
          onClick={() => setActiveTab("swmmapps")}
        >
          <span style={{ fontSize: 15 }}>{"\uD83D\uDEE0\uFE0F"}</span>
          SWMM Apps
        </button>
        <button
          className={`app-tab ${activeTab === "microgpt" ? "active" : ""}`}
          onClick={() => setActiveTab("microgpt")}
        >
          <span style={{ fontSize: 15 }}>{"\uD83E\uDDE0"}</span>
          MicroGPTs
        </button>
        <button
          className={`app-tab ${activeTab === "pyswmm" ? "active" : ""}`}
          onClick={() => setActiveTab("pyswmm")}
        >
          <span style={{ fontSize: 15 }}>{"\uD83D\uDC0D"}</span>
          PySWMM
        </button>
        <button
          className={`app-tab ${activeTab === "hydrocouple" ? "active" : ""}`}
          onClick={() => setActiveTab("hydrocouple")}
        >
          <span style={{ fontSize: 15 }}>{"\uD83D\uDCA7"}</span>
          HydroCouple
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", paddingRight: 12 }}>
          <button
            className="theme-toggle"
            onClick={() => {
              const idx = themeOrder.indexOf(theme);
              setTheme(themeOrder[(idx + 1) % themeOrder.length]);
            }}
            title={`Theme: ${themeLabels[theme]} — click to switch`}
            style={{ width: "auto", height: 30, fontSize: 13, padding: "0 10px", gap: 4, display: "inline-flex", alignItems: "center" }}
          >
            <span style={{ fontSize: 16 }}>{themeIcons[theme]}</span>
            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{themeLabels[theme]}</span>
          </button>
        </div>
      </div>

      {/* MicroGPTs Tab */}
      {activeTab === "microgpt" && (
        <div style={{ width: "100%", height: "calc(100vh - 46px)", display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", gap: 0, background: t.headerBg, borderBottom: `1px solid ${t.border}`,
            overflowX: "auto", flexShrink: 0,
          }}>
            {[
              { id: "microgpt", label: "Manning's Equation", icon: "\uD83E\uDDE0" },
              { id: "partialflow", label: "Partial-Flow", icon: "\uD83D\uDD35" },
              { id: "rtk", label: "RTK/RDII", icon: "\uD83D\uDCC8" },
              { id: "hydrology", label: "Hydrology", icon: "\uD83C\uDF27\uFE0F" },
              { id: "groundwater", label: "Groundwater", icon: "\uD83D\uDCA7" },
              { id: "idfmusk", label: "IDF & Muskingum", icon: "\u26C8\uFE0F" },
            ].map(gpt => (
              <button key={gpt.id}
                onClick={() => setActiveGPT(gpt.id)}
                style={{
                  padding: "8px 14px", border: "none", cursor: "pointer",
                  background: activeGPT === gpt.id ? t.accent + "22" : "transparent",
                  borderBottom: activeGPT === gpt.id ? `2px solid ${t.accent}` : "2px solid transparent",
                  color: activeGPT === gpt.id ? t.accent : t.textDim,
                  fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
                  whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 13 }}>{gpt.icon}</span>{gpt.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {activeGPT === "microgpt" && <iframe src="https://micro-gpt-swmm.replit.app" style={{ width: "100%", height: "100%", border: "none" }} title="Manning's Equation MicroGPT" allow="clipboard-read; clipboard-write" />}
            {activeGPT === "partialflow" && <iframe src="/partial-flow-microgpt.html" style={{ width: "100%", height: "100%", border: "none" }} title="Partial-Flow MicroGPT" />}
            {activeGPT === "rtk" && <iframe src="/rtk-microgpt-v2.html" style={{ width: "100%", height: "100%", border: "none" }} title="RTK MicroGPT v2" />}
            {activeGPT === "hydrology" && <iframe src="/swmm5-hydrology-microgpt-v2.html" style={{ width: "100%", height: "100%", border: "none" }} title="Hydrology MicroGPT v2" />}
            {activeGPT === "groundwater" && <iframe src="/swmm5-groundwater-microgpt.html" style={{ width: "100%", height: "100%", border: "none" }} title="Groundwater MicroGPT" />}
            {activeGPT === "idfmusk" && <iframe src="/idf-muskingum-microgpt.html" style={{ width: "100%", height: "100%", border: "none" }} title="IDF & Muskingum MicroGPT" />}
          </div>
        </div>
      )}

      {/* PySWMM Tab */}
      {activeTab === "pyswmm" && (
        <div style={{ width: "100%", height: "calc(100vh - 46px)", overflow: "hidden" }}>
          <iframe
            src="https://pyswmm-explorer.replit.app"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title="PySWMM Explorer"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}

      {/* HydroCouple Tab */}
      {activeTab === "hydrocouple" && (
        <div style={{ width: "100%", height: "calc(100vh - 46px)", overflow: "hidden" }}>
          <iframe
            src="https://hydro-couple-explorer.replit.app"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            title="HydroCouple Explorer"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}

      {/* SWMM Apps Tab */}
      {activeTab === "swmmapps" && <AppShowcase theme={t} />}

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
            {" "}&mdash; the world's most widely-used stormwater model &mdash; translated from the original C engine into {languages.length} programming languages. Compare how different paradigms handle hydrologic and hydraulic computations side-by-side.
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
            }}>{moduleKeys.length} of 25+ engine modules</span>
            <span style={{
              fontSize: 12, color: t.textDim, padding: "4px 10px",
              borderRadius: 6, background: t.notesBg, border: `1px solid ${t.border}`,
            }}>{languages.length} languages</span>
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
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setShowDepDiagram(!showDepDiagram)}
              style={{
                padding: "4px 10px", borderRadius: 6, border: `1px solid ${t.border}`,
                background: showDepDiagram ? t.modActiveBg : "transparent",
                color: showDepDiagram ? t.accent : t.textDim,
                cursor: "pointer", fontSize: 11, whiteSpace: "nowrap",
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {showDepDiagram ? "▾" : "▸"} Diagram
            </button>
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
      </div>

      {/* Module Info Panel */}
      {showModuleInfo && <ModuleInfoPanel mod={mod} t={t} show={showModuleInfo} />}

      {/* Module Dependency Diagram */}
      {showDepDiagram && (
        <div style={{ padding: "16px 0", borderBottom: `1px solid ${t.borderSubtle}` }}>
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Module Interconnections</span>
            <span style={{ fontSize: 11, color: t.textDim, marginLeft: 8 }}>Click a module to select it</span>
          </div>
          <ModuleDependencyDiagram t={t} onClickModule={(id) => {
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

      {/* Code Search Bar */}
      <div style={{
        padding: "8px 20px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderBottom: `1px solid ${t.borderSubtle}`,
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
        {codeSearch && (() => {
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
        height: isMobile ? "auto" : "calc(100vh - 320px)",
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
            highlightedLine={highlightedLine}
            onLineHover={(i) => setHighlightedLine(i)}
            onLineLeave={() => setHighlightedLine(-1)}
            codeSearch={codeSearch}
            playgroundUrl={playgroundUrls[leftLang]}
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
        <span>{moduleKeys.length} Modules &bull; {languages.length} Languages</span>
        <span>&bull;</span>
        <span>v2.0 &mdash; March 2026</span>
        <span>&bull;</span>
        <a href="https://www.epa.gov/water-research/storm-water-management-model-swmm"
          target="_blank" rel="noopener noreferrer"
          style={{ color: t.textDim, textDecoration: "none" }}>swmm5.org</a>
      </div>

      </>}
    </div>
  );
}
