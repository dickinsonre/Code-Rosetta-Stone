import { useState, useMemo } from "react";
import { modules, languages } from "../modules.js";

const typeSafetyRatings = {
  c: 2, rust: 5, python: 1, fortran: 2, julia: 2, javascript: 1, go: 3,
  zig: 4, cpp: 3, csharp: 4, matlab: 1, r: 1, delphi: 3, typescript: 4,
  cuda: 2, wasm: 3, mojo: 4, java: 4, nim: 3, ada: 5, chapel: 3, swift: 4,
  kotlin: 4, ruby: 1, autolisp: 1, commonlisp: 1, clojure: 1, scheme: 1,
  hy: 1, vba: 2, lua: 1, tcl: 1, haskell: 5, scala: 4, dart: 4, elixir: 2,
  ocaml: 5,
};

const paradigmMap = {
  c: "Systems", rust: "Systems", cpp: "Systems", zig: "Systems", go: "Systems",
  ada: "Systems", nim: "Systems", mojo: "Systems",
  fortran: "Scientific", julia: "Scientific", matlab: "Scientific",
  r: "Scientific", chapel: "Scientific",
  javascript: "Web", typescript: "Web", dart: "Web", wasm: "Web",
  csharp: "Web", java: "Web", kotlin: "Web", scala: "Web", swift: "Web",
  haskell: "Functional", ocaml: "Functional", elixir: "Functional",
  clojure: "Functional", scheme: "Functional", commonlisp: "Functional",
  autolisp: "Legacy", vba: "Legacy", delphi: "Legacy", tcl: "Legacy",
  python: "Scripting", ruby: "Scripting", lua: "Scripting",
  perl: "Scripting", hy: "Scripting",
  cuda: "Low-Level",
};

const paradigmColors = {
  Systems: "#e06c75",
  Scientific: "#61afef",
  Web: "#e5c07b",
  Functional: "#c678dd",
  Legacy: "#abb2bf",
  Scripting: "#98c379",
  "Low-Level": "#d19a66",
};

export default function LanguageLeaderboard({ theme: t }) {
  const [view, setView] = useState("conciseness");

  const stats = useMemo(() => {
    const moduleKeys = Object.keys(modules);
    const langStats = {};

    languages.forEach((lang) => {
      let totalLines = 0;
      let count = 0;
      moduleKeys.forEach((modKey) => {
        const mod = modules[modKey];
        if (mod[lang.id] && typeof mod[lang.id] === "string") {
          totalLines += mod[lang.id].split("\n").length;
          count++;
        }
      });
      langStats[lang.id] = {
        id: lang.id,
        label: lang.label,
        color: lang.color,
        avgLines: count > 0 ? totalLines / count : 0,
        moduleCount: count,
        typeSafety: typeSafetyRatings[lang.id] || 1,
        paradigm: paradigmMap[lang.id] || "Other",
      };
    });

    return langStats;
  }, []);

  const sortedByConciseness = useMemo(() => {
    return Object.values(stats)
      .filter((s) => s.moduleCount > 0)
      .sort((a, b) => a.avgLines - b.avgLines);
  }, [stats]);

  const sortedByTypeSafety = useMemo(() => {
    return Object.values(stats)
      .filter((s) => s.moduleCount > 0)
      .sort((a, b) => b.typeSafety - a.typeSafety || a.avgLines - b.avgLines);
  }, [stats]);

  const groupedByParadigm = useMemo(() => {
    const groups = {};
    Object.values(stats)
      .filter((s) => s.moduleCount > 0)
      .forEach((s) => {
        if (!groups[s.paradigm]) groups[s.paradigm] = [];
        groups[s.paradigm].push(s);
      });
    Object.keys(groups).forEach((k) => {
      groups[k].sort((a, b) => a.avgLines - b.avgLines);
    });
    return groups;
  }, [stats]);

  const maxAvgLines = useMemo(() => {
    return Math.max(...sortedByConciseness.map((s) => s.avgLines), 1);
  }, [sortedByConciseness]);

  const renderStars = (n) => {
    return "★".repeat(n) + "☆".repeat(5 - n);
  };

  const views = [
    { key: "conciseness", label: "Conciseness" },
    { key: "typesafety", label: "Type Safety" },
    { key: "paradigm", label: "By Paradigm" },
  ];

  const renderBar = (value, max, color) => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        height: 18,
        width: `${Math.max((value / max) * 100, 2)}%`,
        background: `linear-gradient(90deg, ${color}cc, ${color}66)`,
        borderRadius: 4,
        transition: "width 0.3s ease",
      }} />
      <span style={{ fontSize: 11, color: t.textDim, whiteSpace: "nowrap" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );

  const renderTable = (data, showParadigm) => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${t.border}` }}>
            <th style={{ padding: "8px 12px", textAlign: "left", color: t.textDim, fontWeight: 600, fontSize: 11 }}>#</th>
            <th style={{ padding: "8px 12px", textAlign: "left", color: t.textDim, fontWeight: 600, fontSize: 11 }}>Language</th>
            <th style={{ padding: "8px 12px", textAlign: "right", color: t.textDim, fontWeight: 600, fontSize: 11 }}>Avg Lines</th>
            <th style={{ padding: "8px 12px", textAlign: "center", color: t.textDim, fontWeight: 600, fontSize: 11 }}>Type Safety</th>
            {showParadigm && <th style={{ padding: "8px 12px", textAlign: "left", color: t.textDim, fontWeight: 600, fontSize: 11 }}>Paradigm</th>}
            <th style={{ padding: "8px 12px", textAlign: "left", color: t.textDim, fontWeight: 600, fontSize: 11, minWidth: 200 }}>Conciseness</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s, i) => (
            <tr key={s.id} style={{
              borderBottom: `1px solid ${t.borderLight || t.border}`,
              background: i % 2 === 0 ? "transparent" : (t.hoverBg || "transparent"),
            }}>
              <td style={{ padding: "8px 12px", color: t.textDim, fontSize: 12 }}>{i + 1}</td>
              <td style={{ padding: "8px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: s.color, flexShrink: 0,
                    boxShadow: `0 0 4px ${s.color}55`,
                  }} />
                  <span style={{ color: t.text, fontWeight: 500 }}>{s.label}</span>
                  <span style={{ color: t.textDim, fontSize: 11 }}>({s.moduleCount})</span>
                </div>
              </td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: t.text, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                {s.avgLines.toFixed(1)}
              </td>
              <td style={{ padding: "8px 12px", textAlign: "center", color: "#e5c07b", fontSize: 12, letterSpacing: 1 }}>
                {renderStars(s.typeSafety)}
              </td>
              {showParadigm && (
                <td style={{ padding: "8px 12px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                    background: (paradigmColors[s.paradigm] || t.accent) + "22",
                    color: paradigmColors[s.paradigm] || t.accent,
                    border: `1px solid ${(paradigmColors[s.paradigm] || t.accent)}33`,
                  }}>{s.paradigm}</span>
                </td>
              )}
              <td style={{ padding: "8px 12px" }}>
                {renderBar(s.avgLines, maxAvgLines, s.color)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ color: t.text, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        🏆 Language Leaderboard
      </h2>
      <p style={{ color: t.textDim, fontSize: 13, marginBottom: 20 }}>
        Rankings computed from {Object.keys(modules).length} SWMM5 module translations across {languages.length} languages
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: `1px solid ${view === v.key ? t.accent : t.border}`,
              background: view === v.key ? t.accent + "22" : "transparent",
              color: view === v.key ? t.accent : t.textDim,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: view === v.key ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "conciseness" && (
        <div style={{
          background: t.panel || t.panelBg,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px",
            background: t.panelHeader,
            borderBottom: `1px solid ${t.border}`,
            fontSize: 13,
            fontWeight: 600,
            color: t.text,
          }}>
            Ranked by Average Lines per Module (fewer = more concise)
          </div>
          {renderTable(sortedByConciseness, true)}
        </div>
      )}

      {view === "typesafety" && (
        <div style={{
          background: t.panel || t.panelBg,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px",
            background: t.panelHeader,
            borderBottom: `1px solid ${t.border}`,
            fontSize: 13,
            fontWeight: 600,
            color: t.text,
          }}>
            Ranked by Type Safety Rating (5 = strongest)
          </div>
          {renderTable(sortedByTypeSafety, true)}
        </div>
      )}

      {view === "paradigm" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(groupedByParadigm)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([paradigm, langs]) => (
              <div key={paradigm} style={{
                background: t.panel || t.panelBg,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "10px 16px",
                  background: t.panelHeader,
                  borderBottom: `1px solid ${t.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: paradigmColors[paradigm] || t.accent,
                    display: "inline-block",
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{paradigm}</span>
                  <span style={{ fontSize: 12, color: t.textDim }}>({langs.length} languages)</span>
                </div>
                {renderTable(langs, false)}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
