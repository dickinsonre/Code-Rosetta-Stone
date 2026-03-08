import { useState, useMemo, useRef } from "react";
import { modules, languages } from "../modules.js";

const paradigmMap = {
  c: "Systems", rust: "Systems", go: "Systems", zig: "Systems", cpp: "Systems",
  nim: "Systems", ada: "Systems", pascal: "Systems",
  fortran: "Scientific", julia: "Scientific", matlab: "Scientific", r: "Scientific", chapel: "Scientific",
  python: "Web", javascript: "Web", typescript: "Web", ruby: "Web", dart: "Web", elixir: "Web",
  java: "Enterprise", csharp: "Enterprise", kotlin: "Enterprise", scala: "Enterprise", swift: "Enterprise",
  haskell: "Functional", ocaml: "Functional", clojure: "Functional", scheme: "Functional",
  commonlisp: "Functional", autolisp: "Functional", hy: "Functional",
  lua: "Scripting", tcl: "Scripting", perl: "Scripting", vba: "Scripting",
  cuda: "GPU", wasm: "Low-Level", mojo: "Emerging", delphi: "Legacy",
};

function getDifficultyLevel(langLines, cLines) {
  if (!langLines || !cLines) return null;
  const ratio = langLines / cLines;
  if (langLines < 5) return "stub";
  if (ratio <= 1.5) return "easy";
  if (ratio <= 2.5) return "moderate";
  if (ratio <= 4.0) return "significant";
  return "redesign";
}

const diffColors = {
  reference: "#6b7185",
  easy: "#50a14f",
  moderate: "#c18401",
  significant: "#e07020",
  redesign: "#e45649",
  stub: "#e45649",
  missing: "#2a2e3a",
};

const diffLabels = {
  reference: "Reference (C)",
  easy: "Direct (≤1.5×)",
  moderate: "Moderate (1.5–2.5×)",
  significant: "Significant (2.5–4×)",
  redesign: "Redesign (>4× or stub)",
  missing: "No translation",
};

function getChallengeText(level, langLabel, paradigm) {
  const texts = {
    easy: `${langLabel} maps naturally to the C reference. ${paradigm === "Systems" ? "Similar memory model and control flow." : paradigm === "Functional" ? "Functional idioms still align structurally." : "Straightforward syntactic translation."}`,
    moderate: `${langLabel} requires some restructuring. ${paradigm === "Functional" ? "Imperative loops become recursive patterns or higher-order functions." : paradigm === "Enterprise" ? "Additional boilerplate for classes, getters, and type declarations." : "Different idioms add moderate overhead."}`,
    significant: `${langLabel} needs substantial rework. ${paradigm === "Functional" ? "Mutable state must be threaded through pure functions or monads." : paradigm === "GPU" ? "Kernel launch patterns and memory transfers add complexity." : "Language paradigm differs significantly from procedural C."}`,
    redesign: `${langLabel} requires fundamental redesign. The translation involves rethinking data structures, control flow, and memory management to fit ${paradigm || "this"} paradigm conventions.`,
    stub: `${langLabel} implementation appears to be a stub or placeholder. Full translation pending.`,
  };
  return texts[level] || "";
}

export default function TranslationHeatmap({ theme: t }) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const gridRef = useRef(null);

  const moduleKeys = useMemo(() => Object.keys(modules), []);
  const langList = useMemo(() => languages, []);

  const { grid, summary } = useMemo(() => {
    let easy = 0, moderate = 0, significant = 0, redesign = 0, total = 0;
    const g = {};

    moduleKeys.forEach((modKey) => {
      const mod = modules[modKey];
      const cCode = mod.c || "";
      const cLines = cCode.split("\n").length;
      g[modKey] = {};

      langList.forEach((lang) => {
        const code = mod[lang.id] || "";
        const lines = code ? code.split("\n").length : 0;

        if (lang.id === "c") {
          g[modKey][lang.id] = { lines: cLines, cLines, level: "reference" };
        } else if (!code) {
          g[modKey][lang.id] = { lines: 0, cLines, level: "missing" };
        } else {
          const level = getDifficultyLevel(lines, cLines);
          g[modKey][lang.id] = { lines, cLines, level };
          if (level === "easy") easy++;
          else if (level === "moderate") moderate++;
          else if (level === "significant") significant++;
          else redesign++;
          total++;
        }
      });
    });

    return {
      grid: g,
      summary: {
        easy, moderate, significant, redesign, total,
        easyPct: total ? ((easy / total) * 100).toFixed(1) : 0,
        moderatePct: total ? ((moderate / total) * 100).toFixed(1) : 0,
        significantPct: total ? ((significant / total) * 100).toFixed(1) : 0,
        redesignPct: total ? ((redesign / total) * 100).toFixed(1) : 0,
      },
    };
  }, [moduleKeys, langList]);

  const shortModName = (key) => {
    const parts = key.split(" — ");
    return parts.length > 1 ? parts[0] : key.substring(0, 20);
  };

  const handleMouseMove = (e) => {
    setTooltipPos({ x: e.clientX + 12, y: e.clientY + 12 });
  };

  const selectedData = selectedCell ? grid[selectedCell.mod]?.[selectedCell.lang] : null;
  const selectedLang = selectedCell ? langList.find((l) => l.id === selectedCell.lang) : null;

  const cellSize = 18;
  const headerHeight = 100;
  const labelWidth = 160;

  return (
    <div style={{ padding: 24, background: t.bg, color: t.text, minHeight: "100vh" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        🗺️ Translation Difficulty Heatmap
      </h2>
      <p style={{ fontSize: 13, color: t.textDim, marginBottom: 20 }}>
        How hard is it to translate each SWMM5 module into {langList.length} languages? Cell color shows line-count ratio vs C reference.
      </p>

      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20,
        padding: "14px 18px", background: t.panelBg || t.panel, borderRadius: 8,
        border: `1px solid ${t.border}`,
      }}>
        {[
          { label: "Direct", pct: summary.easyPct, count: summary.easy, color: diffColors.easy },
          { label: "Moderate", pct: summary.moderatePct, count: summary.moderate, color: diffColors.moderate },
          { label: "Significant", pct: summary.significantPct, count: summary.significant, color: diffColors.significant },
          { label: "Redesign", pct: summary.redesignPct, count: summary.redesign, color: diffColors.redesign },
        ].map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{s.pct}%</span>
            <span style={{ fontSize: 12, color: t.textDim }}>{s.label} ({s.count})</span>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20,
        padding: "10px 18px", background: t.panelBg || t.panel, borderRadius: 8,
        border: `1px solid ${t.border}`,
      }}>
        {Object.entries(diffLabels).map(([key, label]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 3,
              background: diffColors[key],
              border: key === "missing" ? `1px solid ${t.border}` : "none",
            }} />
            <span style={{ fontSize: 11, color: t.textDim }}>{label}</span>
          </div>
        ))}
      </div>

      <div
        ref={gridRef}
        onMouseMove={handleMouseMove}
        style={{
          overflow: "auto",
          maxHeight: "65vh",
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          background: t.panelBg || t.panel,
          position: "relative",
        }}
      >
        <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{
                position: "sticky", top: 0, left: 0, zIndex: 3,
                background: t.panelHeader || t.panelBg || t.panel,
                padding: "4px 8px", minWidth: labelWidth,
                borderBottom: `1px solid ${t.border}`,
                borderRight: `1px solid ${t.border}`,
                fontSize: 10, color: t.textDim, textAlign: "left",
              }}>
                Module \ Language
              </th>
              {langList.map((lang) => (
                <th key={lang.id} style={{
                  position: "sticky", top: 0, zIndex: 2,
                  background: t.panelHeader || t.panelBg || t.panel,
                  padding: "4px 2px",
                  borderBottom: `1px solid ${t.border}`,
                  minWidth: cellSize, maxWidth: cellSize + 4,
                  textAlign: "center",
                }}>
                  <div style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    fontSize: 9,
                    fontWeight: 600,
                    color: lang.color,
                    whiteSpace: "nowrap",
                    height: headerHeight,
                    display: "flex",
                    alignItems: "center",
                  }}>
                    {lang.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {moduleKeys.map((modKey) => (
              <tr key={modKey}>
                <td style={{
                  position: "sticky", left: 0, zIndex: 1,
                  background: t.panelBg || t.panel,
                  padding: "2px 8px",
                  borderBottom: `1px solid ${t.borderLight || t.border}`,
                  borderRight: `1px solid ${t.border}`,
                  fontSize: 10, color: t.textDim,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  maxWidth: labelWidth,
                }}>
                  {shortModName(modKey)}
                </td>
                {langList.map((lang) => {
                  const cell = grid[modKey]?.[lang.id];
                  const level = cell?.level || "missing";
                  const isHovered = hoveredCell?.mod === modKey && hoveredCell?.lang === lang.id;
                  const isSelected = selectedCell?.mod === modKey && selectedCell?.lang === lang.id;
                  return (
                    <td
                      key={lang.id}
                      onMouseEnter={() => setHoveredCell({ mod: modKey, lang: lang.id })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => setSelectedCell(
                        selectedCell?.mod === modKey && selectedCell?.lang === lang.id
                          ? null
                          : { mod: modKey, lang: lang.id }
                      )}
                      style={{
                        padding: 1,
                        borderBottom: `1px solid ${t.borderLight || t.border}20`,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{
                        width: cellSize, height: cellSize,
                        borderRadius: 2,
                        background: diffColors[level],
                        opacity: level === "missing" ? 0.3 : isHovered || isSelected ? 1 : 0.75,
                        border: isSelected ? "2px solid #fff" : isHovered ? `1px solid ${t.text}` : "1px solid transparent",
                        transition: "opacity 0.1s",
                      }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hoveredCell && (() => {
        const cell = grid[hoveredCell.mod]?.[hoveredCell.lang];
        const lang = langList.find((l) => l.id === hoveredCell.lang);
        if (!cell || !lang) return null;
        return (
          <div style={{
            position: "fixed",
            left: tooltipPos.x,
            top: tooltipPos.y,
            zIndex: 9999,
            background: t.panelBg || t.panel || "#1a1d28",
            border: `1px solid ${t.border}`,
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            color: t.text,
            pointerEvents: "none",
            maxWidth: 280,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{lang.label}</div>
            <div style={{ color: t.textDim, marginBottom: 4, fontSize: 11 }}>
              {hoveredCell.mod.split(" — ")[1] || hoveredCell.mod}
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span>Lines: <strong>{cell.lines || "—"}</strong></span>
              <span>C ref: <strong>{cell.cLines}</strong></span>
            </div>
            {cell.level !== "reference" && cell.level !== "missing" && (
              <div style={{ marginTop: 4, fontSize: 11, color: diffColors[cell.level], fontWeight: 600 }}>
                {cell.level === "easy" ? "Direct" : cell.level === "moderate" ? "Moderate" : cell.level === "significant" ? "Significant" : "Redesign"}
                {" "}({(cell.lines / cell.cLines).toFixed(1)}× C)
              </div>
            )}
            {cell.level === "missing" && (
              <div style={{ marginTop: 4, fontSize: 11, color: t.textDim }}>No translation available</div>
            )}
          </div>
        );
      })()}

      {selectedCell && selectedData && selectedLang && (
        <div style={{
          marginTop: 20, padding: "18px 22px",
          background: t.panelBg || t.panel,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <span style={{
                display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                background: selectedLang.color, marginRight: 8,
              }} />
              <strong style={{ fontSize: 15 }}>{selectedLang.label}</strong>
              <span style={{ marginLeft: 12, fontSize: 13, color: t.textDim }}>
                {selectedCell.mod.split(" — ")[1] || selectedCell.mod}
              </span>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              style={{
                background: "transparent", border: `1px solid ${t.border}`,
                color: t.textDim, borderRadius: 4, padding: "4px 10px",
                cursor: "pointer", fontSize: 12,
              }}
            >
              ✕ Close
            </button>
          </div>

          <div style={{ display: "flex", gap: 24, marginBottom: 12, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 12, color: t.textDim }}>Lines: </span>
              <strong>{selectedData.lines || "—"}</strong>
            </div>
            <div>
              <span style={{ fontSize: 12, color: t.textDim }}>C Reference: </span>
              <strong>{selectedData.cLines}</strong>
            </div>
            {selectedData.level !== "reference" && selectedData.level !== "missing" && (
              <div>
                <span style={{ fontSize: 12, color: t.textDim }}>Ratio: </span>
                <strong style={{ color: diffColors[selectedData.level] }}>
                  {(selectedData.lines / selectedData.cLines).toFixed(2)}×
                </strong>
              </div>
            )}
            <div>
              <span style={{
                padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                background: diffColors[selectedData.level] + "22",
                color: diffColors[selectedData.level],
                border: `1px solid ${diffColors[selectedData.level]}44`,
              }}>
                {selectedData.level === "easy" ? "Direct Translation" :
                  selectedData.level === "moderate" ? "Moderate Adaptation" :
                  selectedData.level === "significant" ? "Significant Rework" :
                  selectedData.level === "redesign" || selectedData.level === "stub" ? "Fundamental Redesign" :
                  selectedData.level === "reference" ? "C Reference" : "Missing"}
              </span>
            </div>
          </div>

          {selectedData.level !== "reference" && selectedData.level !== "missing" && (
            <p style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6, margin: 0 }}>
              {getChallengeText(
                selectedData.level,
                selectedLang.label,
                paradigmMap[selectedLang.id] || "General"
              )}
            </p>
          )}
          {selectedData.level === "reference" && (
            <p style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6, margin: 0 }}>
              C is the reference implementation for SWMM5. All other languages are compared against this baseline.
            </p>
          )}
          {selectedData.level === "missing" && (
            <p style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6, margin: 0 }}>
              This module has not yet been translated to {selectedLang.label}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}