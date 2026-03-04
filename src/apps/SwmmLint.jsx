import { useState } from "react";

const SAMPLE_INP = `[TITLE]
Example SWMM Model with Issues

[JUNCTIONS]
;ID    Elev   MaxDepth
J1     120.0  6.0
J2     115.0  6.0
J3     118.0  8.0
J4     110.0  0.0
J5     105.0  10.0
J_orphan 100.0 5.0

[OUTFALLS]
Out1   95.0   FREE

[CONDUITS]
;ID  From  To   Length  Roughness  Diameter
C1   J1    J2   400     0.013      2.0
C2   J2    J3   300     0.013      1.5
C3   J3    J4   200     0.005      2.0
C4   J4    J5   350     0.040      1.0
C5   J5    Out1 500     0.013      3.0

[SUBCATCHMENTS]
;ID     RainGage  Outlet  Area   Imperv  Width
S1      RG1       J1      25.0   65.0    100
S2      *         J2      15.0   50.0    500
S3      RG1       J3      40.0   102.0   200

[RAINGAGES]
;ID   Format  Interval  SCF  Source
RG1   VOLUME  0:05      1.0  TIMESERIES TS1`;

function lintModel(text) {
  const warnings = [];
  const lines = text.split("\n");
  let section = null;
  const nodes = {};
  const outfalls = {};
  const links = [];
  const subcatchments = [];
  const raingages = {};
  const connectedNodes = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) { section = trimmed.toLowerCase(); continue; }
    if (!trimmed || trimmed.startsWith(";")) continue;
    const parts = trimmed.split(/\s+/);

    if (section === "[junctions]" && parts.length >= 2) {
      nodes[parts[0]] = { id: parts[0], elev: parseFloat(parts[1]), maxDepth: parseFloat(parts[2] || 0), line: lines.indexOf(line) + 1 };
    }
    if (section === "[outfalls]" && parts.length >= 2) {
      outfalls[parts[0]] = { id: parts[0], elev: parseFloat(parts[1]), line: lines.indexOf(line) + 1 };
    }
    if (section === "[conduits]" && parts.length >= 6) {
      links.push({ id: parts[0], from: parts[1], to: parts[2], length: parseFloat(parts[3]), roughness: parseFloat(parts[4]), diameter: parseFloat(parts[5]), line: lines.indexOf(line) + 1 });
      connectedNodes.add(parts[1]);
      connectedNodes.add(parts[2]);
    }
    if (section === "[subcatchments]" && parts.length >= 6) {
      subcatchments.push({ id: parts[0], raingage: parts[1], outlet: parts[2], area: parseFloat(parts[3]), imperv: parseFloat(parts[4]), width: parseFloat(parts[5]), line: lines.indexOf(line) + 1 });
    }
    if (section === "[raingages]" && parts.length >= 4) {
      raingages[parts[0]] = { id: parts[0], line: lines.indexOf(line) + 1 };
    }
  }

  const allNodes = { ...nodes, ...outfalls };

  for (const [id, node] of Object.entries(nodes)) {
    if (!connectedNodes.has(id)) {
      warnings.push({ severity: "error", rule: "E001", message: `Node '${id}' is disconnected from the network`, location: `Line ${node.line}` });
    }
  }

  for (const link of links) {
    if (!allNodes[link.from]) {
      warnings.push({ severity: "error", rule: "E002", message: `Link '${link.id}': upstream node '${link.from}' not found`, location: `Line ${link.line}` });
    }
    if (!allNodes[link.to]) {
      warnings.push({ severity: "error", rule: "E003", message: `Link '${link.id}': downstream node '${link.to}' not found`, location: `Line ${link.line}` });
    }
  }

  for (const link of links) {
    const up = allNodes[link.from];
    const dn = allNodes[link.to];
    if (up && dn && up.elev < dn.elev) {
      warnings.push({ severity: "warning", rule: "W001", message: `Link '${link.id}': adverse slope (${up.elev} -> ${dn.elev})`, location: `Line ${link.line}` });
    }
  }

  for (const link of links) {
    if (link.roughness < 0.008) {
      warnings.push({ severity: "warning", rule: "W002", message: `Link '${link.id}': Manning's n=${link.roughness} is unusually low (< 0.008)`, location: `Line ${link.line}` });
    }
    if (link.roughness > 0.035) {
      warnings.push({ severity: "warning", rule: "W003", message: `Link '${link.id}': Manning's n=${link.roughness} is unusually high (> 0.035)`, location: `Line ${link.line}` });
    }
  }

  for (const link of links) {
    const up = allNodes[link.from];
    const dn = allNodes[link.to];
    if (up && dn) {
      const slope = (up.elev - dn.elev) / link.length;
      if (slope > 0) {
        const theta = Math.PI * 2;
        const fullArea = Math.PI * Math.pow(link.diameter / 2, 2);
        const rh = link.diameter / 4;
        const cap = (1 / link.roughness) * fullArea * Math.pow(rh, 2 / 3) * Math.sqrt(slope);
        if (cap < 1.0) {
          warnings.push({ severity: "info", rule: "I001", message: `Link '${link.id}': full-pipe capacity is only ${cap.toFixed(2)} cfs`, location: `Line ${link.line}` });
        }
      }
    }
  }

  for (const node of Object.values(nodes)) {
    if (node.maxDepth <= 0) {
      warnings.push({ severity: "warning", rule: "W004", message: `Node '${node.id}': max depth is 0 or missing`, location: `Line ${node.line}` });
    }
  }

  for (const sc of subcatchments) {
    if (sc.raingage === "*" || (!raingages[sc.raingage])) {
      warnings.push({ severity: "error", rule: "E004", message: `Subcatchment '${sc.id}': rain gage '${sc.raingage}' not found`, location: `Line ${sc.line}` });
    }
    if (sc.imperv > 100) {
      warnings.push({ severity: "error", rule: "E005", message: `Subcatchment '${sc.id}': imperviousness ${sc.imperv}% exceeds 100%`, location: `Line ${sc.line}` });
    }
    if (sc.area > 0 && sc.width > 0) {
      const ratio = sc.width / (sc.area * 43560);
      if (sc.width > sc.area * 500) {
        warnings.push({ severity: "warning", rule: "W005", message: `Subcatchment '${sc.id}': width ${sc.width} seems large relative to area ${sc.area} ac`, location: `Line ${sc.line}` });
      }
    }
  }

  warnings.sort((a, b) => {
    const ord = { error: 0, warning: 1, info: 2 };
    return (ord[a.severity] || 3) - (ord[b.severity] || 3);
  });
  return warnings;
}

const sevColors = { error: "#e45649", warning: "#e8a735", info: "#61afef" };
const sevIcons = { error: "\u2716", warning: "\u26A0", info: "\u2139" };

export default function SwmmLint({ theme }) {
  const t = theme;
  const [inp, setInp] = useState(SAMPLE_INP);
  const [results, setResults] = useState(null);

  const handleLint = () => { setResults(lintModel(inp)); };

  const errors = results ? results.filter(r => r.severity === "error").length : 0;
  const warns = results ? results.filter(r => r.severity === "warning").length : 0;
  const infos = results ? results.filter(r => r.severity === "info").length : 0;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <button onClick={handleLint} style={{
          padding: "8px 24px", borderRadius: 6, border: "none", cursor: "pointer",
          background: "#dea584", color: "#1a1a1a", fontWeight: 700, fontSize: 13,
        }}>Lint Model</button>
        {results && (
          <span style={{ fontSize: 12, fontFamily: "monospace", color: t.textMuted }}>
            <span style={{ color: sevColors.error }}>{errors} errors</span>{" | "}
            <span style={{ color: sevColors.warning }}>{warns} warnings</span>{" | "}
            <span style={{ color: sevColors.info }}>{infos} info</span>
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, minHeight: 350 }}>
        <div>
          <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>
            SWMM .inp File
          </div>
          <textarea value={inp} onChange={e => setInp(e.target.value)} spellCheck={false} style={{
            width: "100%", height: 380, resize: "vertical", fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, lineHeight: 1.5, padding: 12, borderRadius: 8, border: `1px solid ${t.border}`,
            background: t.panelBg, color: t.text, outline: "none",
          }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>
            Lint Results
          </div>
          <div style={{
            height: 380, overflow: "auto", borderRadius: 8, border: `1px solid ${t.border}`,
            background: t.panelBg, padding: 8,
          }}>
            {!results && <div style={{ color: t.textMuted, fontSize: 13, padding: 12 }}>Click "Lint Model" to analyze...</div>}
            {results && results.length === 0 && (
              <div style={{ color: "#50a14f", fontSize: 13, padding: 12, fontWeight: 600 }}>No issues found.</div>
            )}
            {results && results.map((r, i) => (
              <div key={i} style={{
                padding: "8px 10px", borderBottom: `1px solid ${t.border}`, fontSize: 12,
                display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <span style={{ color: sevColors[r.severity], fontSize: 14, flexShrink: 0 }}>{sevIcons[r.severity]}</span>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: sevColors[r.severity],
                    fontFamily: "monospace", marginRight: 6,
                  }}>{r.rule}</span>
                  <span style={{ color: t.text }}>{r.message}</span>
                  {r.location && <span style={{ color: t.textMuted, fontSize: 10, marginLeft: 8 }}>{r.location}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
