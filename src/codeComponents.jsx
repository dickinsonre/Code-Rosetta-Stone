import { useState } from "react";

export const playgroundUrls = {
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
  ruby: "https://try.ruby-lang.org/",
  autolisp: "https://www.autodesk.com/developer-network/platform-technologies/autocad/autolisp",
  commonlisp: "https://www.jdoodle.com/execute-clisp-online/",
  clojure: "https://tryclojure.org/",
  scheme: "https://try.scheme.org/",
  hy: "https://hylang.org/try-hy",
  vba: "https://www.mycompiler.io/new/vb",
  lua: "https://www.lua.org/demo.html",
  tcl: "https://www.mycompiler.io/new/tcl",
  haskell: "https://play.haskell.org/",
  scala: "https://scastie.scala-lang.org/",
  dart: "https://dartpad.dev/",
  elixir: "https://playground.functional.computer/",
  ocaml: "https://try.ocaml.pro/",
};

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
  ruby: /\b(class|module|def|end|return|if|else|elsif|unless|for|in|while|do|begin|rescue|ensure|raise|yield|block_given|require|require_relative|include|extend|attr_accessor|attr_reader|attr_writer|self|super|nil|true|false|puts|print|lambda|proc|case|when|then|until|break|next|retry|redo|and|or|not|defined)\b/g,
  autolisp: /\b(defun|setq|if|progn|cond|while|repeat|foreach|cons|car|cdr|cadr|caddr|list|assoc|subst|nth|length|append|apply|mapcar|lambda|nil|T|princ|strcat|itoa|rtos|getvar|setvar|ssget|ssname|sslength|entget|entmod|command|vl-load-com|vlax-get-acad-object|vla-get)\b/g,
  commonlisp: /\b(defun|defstruct|defpackage|defparameter|defconstant|defvar|defclass|defmethod|defgeneric|let|let\*|setf|if|cond|when|unless|loop|do|dotimes|dolist|progn|block|return-from|values|multiple-value-bind|declare|optimize|speed|safety|type|the|in-package|use-package|export|import|require|nil|t|lambda|funcall|apply|mapcar|format|make-instance|slot-value|with-slots)\b/g,
  clojure: /\b(defn|def|fn|let|if|cond|when|do|loop|recur|for|doseq|dotimes|map|filter|reduce|apply|comp|partial|assoc|dissoc|get|update|conj|cons|first|rest|next|seq|vec|hash-map|set|atom|deref|swap!|reset!|ns|require|use|import|defstruct|defrecord|defprotocol|extend-type|nil|true|false|not|and|or|str|println|prn)\b/g,
  scheme: /\b(define|lambda|let|let\*|letrec|if|cond|when|unless|begin|set!|do|for\/fold|for\/list|for|in-range|match|struct|values|call-with-values|map|filter|fold|apply|cons|car|cdr|list|null\?|pair\?|eq\?|equal\?|display|newline|require|provide|module|define-struct)\b/g,
  hy: /\b(defn|defclass|setv|let|if|cond|when|unless|do|for|while|import|from|return|yield|try|except|raise|with|as|in|not|and|or|is|None|True|False|print|get|assoc|first|rest|cons|list|dict|fn|defmacro|require|of)\b/g,
  vba: /\b(Sub|Function|End|Dim|As|Integer|Long|Double|Single|String|Boolean|Variant|Object|Private|Public|Static|Const|If|Then|Else|ElseIf|For|To|Step|Next|While|Wend|Do|Loop|Until|Select|Case|Set|New|With|Property|Get|Let|Type|Enum|ByVal|ByRef|Optional|ReDim|Preserve|Nothing|True|False|Not|And|Or|Mod|Exit|GoTo|On|Error|Resume|Call|Debug|Print|MsgBox|InputBox)\b/gi,
  lua: /\b(local|function|end|return|if|then|else|elseif|for|in|while|do|repeat|until|and|or|not|nil|true|false|require|module|pairs|ipairs|next|select|table|string|math|io|os|type|tonumber|tostring|print|error|pcall|xpcall|setmetatable|getmetatable|rawset|rawget|self|coroutine)\b/g,
  tcl: /\b(proc|set|if|else|elseif|for|foreach|while|switch|return|expr|puts|gets|open|close|read|write|file|string|list|lindex|lappend|lsort|llength|lrange|lreplace|lsearch|dict|create|get|set|keys|values|namespace|eval|variable|upvar|uplevel|catch|try|package|require|source|info|array|regexp|regsub|format|scan|incr|append|concat|join|split|glob|exec|after|update)\b/g,
  haskell: /\b(module|where|import|qualified|as|hiding|data|type|newtype|class|instance|deriving|Show|Eq|Ord|Num|let|in|if|then|else|case|of|do|return|pure|\-\>|=\>|forall|Int|Integer|Double|Float|Char|String|Bool|IO|Maybe|Just|Nothing|Either|Left|Right|True|False|otherwise|map|filter|foldr|foldl|zip|head|tail|null|length|main|putStrLn|print|show|read)\b/g,
  scala: /\b(object|class|case|trait|extends|with|abstract|override|sealed|final|implicit|lazy|val|var|def|type|return|if|else|for|yield|while|match|new|this|super|import|package|private|protected|public|null|true|false|Int|Double|Float|Long|Boolean|String|Unit|Any|Nothing|Option|Some|None|List|Vector|Map|Set|Seq|Array|Try|Future|println)\b/g,
  dart: /\b(class|abstract|extends|implements|with|mixin|void|int|double|num|bool|String|var|final|const|late|required|return|if|else|for|in|while|do|switch|case|default|break|continue|new|this|super|null|true|false|static|async|await|Future|Stream|List|Map|Set|dynamic|typedef|enum|factory|get|set|import|export|library|part|throw|try|catch|finally|assert|is|as|print)\b/g,
  elixir: /\b(defmodule|def|defp|defstruct|defprotocol|defimpl|defmacro|defguard|do|end|fn|if|else|unless|cond|case|when|with|for|in|import|alias|use|require|raise|try|rescue|catch|after|receive|send|spawn|self|nil|true|false|and|or|not|is_nil|is_integer|is_float|is_binary|is_atom|is_list|is_map|Enum|Map|List|String|IO|Agent|GenServer|Supervisor)\b/g,
  ocaml: /\b(let|in|val|fun|function|match|with|if|then|else|begin|end|for|while|do|done|to|downto|type|of|module|struct|sig|open|include|rec|and|or|not|true|false|ref|mutable|int|float|string|bool|char|unit|list|array|option|Some|None|Ok|Error|failwith|raise|try|assert|print_string|print_int|print_float|Printf|fprintf|sprintf)\b/g,
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
  ruby: /(#.*$|=begin[\s\S]*?=end)/gm,
  autolisp: /(;.*$)/gm,
  commonlisp: /(;.*$|#\|[\s\S]*?\|#)/gm,
  clojure: /(;.*$)/gm,
  scheme: /(;.*$|#\|[\s\S]*?\|#)/gm,
  hy: /(;.*$|#.*$)/gm,
  vba: /('.*$|REM\s.*$)/gmi,
  lua: /(--.*$|--\[\[[\s\S]*?\]\])/gm,
  tcl: /(#.*$)/gm,
  haskell: /(--.*$|\{-[\s\S]*?-\})/gm,
  scala: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  dart: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  elixir: /(#.*$)/gm,
  ocaml: /(\(\*[\s\S]*?\*\))/gm,
};

const stringPattern = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
const numberPattern = /\b(\d+\.?\d*(?:[eE][+-]?\d+)?(?:d0|d\d)?)\b/g;

export function highlightCode(code, langId) {
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

export const difficultyConfig = {
  accessible: { label: "Accessible", color: "#50a14f", icon: "\u{1F7E2}", emoji: "\u{1F7E2}" },
  intermediate: { label: "Intermediate", color: "#c18401", icon: "\u{1F7E1}", emoji: "\u{1F7E1}" },
  advanced: { label: "Advanced", color: "#e45649", icon: "\u{1F534}", emoji: "\u{1F534}" },
};

export function CodePanel({ code, langId, label, color, t, scrollRef, onScroll, highlightedLine, onLineHover, onLineLeave, codeSearch, playgroundUrl }) {
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
            }}>Try Online {"\u2197"}</a>
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

export function ModuleInfoPanel({ mod, t, show, onToggle }) {
  if (!show) return null;

  const diff = difficultyConfig[mod.difficulty] || difficultyConfig.intermediate;

  return (
    <div style={{
      margin: "0 20px",
      padding: "16px 20px",
      background: t.notesBg || t.panelBg,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.7,
      color: t.textMuted || t.textDim,
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
          <strong style={{ color: t.accentAlt || t.accent }}>Equations: </strong>
          <code style={{
            fontSize: 12, background: t.panelBg, padding: "2px 6px",
            borderRadius: 4, fontFamily: "'JetBrains Mono', monospace",
          }}>{mod.equations}</code>
        </div>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
        {mod.inputs && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: t.textBright || t.text, fontSize: 12 }}>Inputs: </strong>
            <span style={{ fontSize: 12 }}>{mod.inputs}</span>
          </div>
        )}
        {mod.outputs && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: t.textBright || t.text, fontSize: 12 }}>Outputs: </strong>
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
              {link.label} {"\u2197"}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
