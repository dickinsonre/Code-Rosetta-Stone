import { useState, useRef, useEffect, useCallback } from "react";

const SAMPLE_NODES = [
  { id: "J1", type: "junction", invert: 10.0, maxDepth: 6, depth: 0 },
  { id: "J2", type: "junction", invert: 8.0, maxDepth: 6, depth: 0 },
  { id: "J3", type: "junction", invert: 6.0, maxDepth: 8, depth: 0 },
  { id: "J4", type: "junction", invert: 5.0, maxDepth: 10, depth: 0 },
  { id: "S1", type: "storage", invert: 4.0, maxDepth: 12, depth: 0, storageArea: 5000 },
  { id: "Out", type: "outfall", invert: 2.0, maxDepth: 15, depth: 0 },
];

const SAMPLE_LINKS = [
  { id: "C1", from: "J1", to: "J2", type: "conduit", length: 400, diameter: 1.5, roughness: 0.013 },
  { id: "C2", from: "J2", to: "J3", type: "conduit", length: 500, diameter: 2.0, roughness: 0.015 },
  { id: "C3", from: "J3", to: "J4", type: "conduit", length: 350, diameter: 2.5, roughness: 0.013 },
  { id: "C4", from: "J4", to: "S1", type: "conduit", length: 300, diameter: 3.0, roughness: 0.014 },
  { id: "C5", from: "S1", to: "Out", type: "conduit", length: 200, diameter: 3.5, roughness: 0.012 },
  { id: "P1", from: "S1", to: "Out", type: "pump", length: 50, diameter: 0, roughness: 0 },
];

const SAMPLE_SUBCATCHMENTS = [
  { id: "S1", area: 10, imperv: 45, width: 400, slope: 1.5, rainGage: "RG1" },
  { id: "S2", area: 15, imperv: 60, width: 500, slope: 2.0, rainGage: "RG1" },
  { id: "S3", area: 8, imperv: 30, width: 300, slope: 1.0, rainGage: "RG1" },
];

function generateTimeSeries(duration, dt, peakTime, peakValue) {
  const steps = Math.floor(duration / dt);
  const data = [];
  for (let i = 0; i < steps; i++) {
    const time = i * dt;
    const t = time / peakTime;
    const val = peakValue * Math.pow(t, 3) * Math.exp(3 * (1 - t));
    data.push({ time: time / 60, value: Math.max(0, val) });
  }
  return data;
}

export default function ModelDashboard({ theme: t }) {
  const canvasRef = useRef(null);
  const [tab, setTab] = useState("summary");
  const [simRunning, setSimRunning] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simResults, setSimResults] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const runRef = useRef(false);

  const nodeStats = {
    junctions: SAMPLE_NODES.filter(n => n.type === "junction").length,
    storage: SAMPLE_NODES.filter(n => n.type === "storage").length,
    outfalls: SAMPLE_NODES.filter(n => n.type === "outfall").length,
  };
  const linkStats = {
    conduits: SAMPLE_LINKS.filter(l => l.type === "conduit").length,
    pumps: SAMPLE_LINKS.filter(l => l.type === "pump").length,
  };
  const totalArea = SAMPLE_SUBCATCHMENTS.reduce((s, c) => s + c.area, 0);
  const avgImperv = SAMPLE_SUBCATCHMENTS.reduce((s, c) => s + c.imperv, 0) / SAMPLE_SUBCATCHMENTS.length;

  const runQuickSim = () => {
    const duration = 120;
    const results = {
      nodeDepths: {},
      linkFlows: {},
      flooding: [],
      maxDepths: {},
      maxFlows: {},
      peakTime: 0,
    };

    SAMPLE_NODES.forEach(n => { results.nodeDepths[n.id] = []; results.maxDepths[n.id] = 0; });
    SAMPLE_LINKS.forEach(l => { results.linkFlows[l.id] = []; results.maxFlows[l.id] = 0; });

    for (let step = 0; step < duration; step++) {
      const t = step / duration;
      const storm = Math.pow(t, 2) * Math.exp(2 * (1 - t)) * 10;

      SAMPLE_NODES.forEach(n => {
        const baseInflow = n.type === "junction" ? storm * (1 + Math.random() * 0.3) : storm * 0.3;
        const d = Math.min(n.maxDepth, baseInflow * 0.5 * Math.sin(Math.PI * t) + Math.random() * 0.5);
        results.nodeDepths[n.id].push({ step, depth: d, time: step });
        if (d > results.maxDepths[n.id]) results.maxDepths[n.id] = d;
        if (d >= n.maxDepth * 0.95) results.flooding.push({ node: n.id, step, depth: d });
      });

      SAMPLE_LINKS.forEach(l => {
        const flow = storm * (1.5 + Math.random() * 0.5) * (l.diameter || 1);
        results.linkFlows[l.id].push({ step, flow, time: step });
        if (flow > results.maxFlows[l.id]) results.maxFlows[l.id] = flow;
      });
    }

    results.peakTime = Math.floor(duration * 0.37);
    return results;
  };

  const handleRun = () => {
    setSimRunning(true);
    setSimStep(0);
    runRef.current = true;
    const results = runQuickSim();
    let step = 0;
    const animate = () => {
      if (!runRef.current) return;
      step++;
      setSimStep(step);
      if (step < 120) {
        setTimeout(animate, 15);
      } else {
        setSimResults(results);
        setSimRunning(false);
        runRef.current = false;
      }
    };
    animate();
  };

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simResults || tab !== "results") return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const margin = { top: 30, right: 20, bottom: 30, left: 50 };
    const pw = W - margin.left - margin.right;
    const ph = H - margin.top - margin.bottom;

    const node = selectedNode || "J1";
    const data = simResults.nodeDepths[node] || [];
    if (data.length === 0) return;

    const maxD = Math.max(...data.map(d => d.depth), 1);

    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, H - margin.bottom);
    ctx.lineTo(W - margin.right, H - margin.bottom);
    ctx.stroke();

    ctx.fillStyle = t.textMuted;
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = (maxD * i / 4);
      const y = H - margin.bottom - (i / 4) * ph;
      ctx.fillText(v.toFixed(1), margin.left - 4, y + 3);
      ctx.strokeStyle = t.border + "44";
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(W - margin.right, y);
      ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.fillText("Time Step", W / 2, H - 4);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Depth (ft)", 0, 0);
    ctx.restore();

    ctx.fillStyle = "#61afef";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Node ${node} - Depth Time Series`, margin.left, margin.top - 10);

    ctx.strokeStyle = "#61afef";
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = margin.left + (i / data.length) * pw;
      const y = H - margin.bottom - (d.depth / maxD) * ph;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = "#61afef22";
    ctx.beginPath();
    ctx.moveTo(margin.left, H - margin.bottom);
    data.forEach((d, i) => {
      const x = margin.left + (i / data.length) * pw;
      const y = H - margin.bottom - (d.depth / maxD) * ph;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(margin.left + pw, H - margin.bottom);
    ctx.closePath();
    ctx.fill();
  }, [simResults, tab, selectedNode, t]);

  useEffect(() => { drawChart(); }, [drawChart]);

  const tabs = [
    { id: "summary", label: "Model Summary" },
    { id: "nodes", label: "Nodes" },
    { id: "links", label: "Links" },
    { id: "results", label: "Results" },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: tab === tb.id ? "#61afef" : t.panelHeader, color: tab === tb.id ? "#fff" : t.text,
            border: `1px solid ${tab === tb.id ? "#61afef" : t.border}`,
          }}>{tb.label}</button>
        ))}
        <button onClick={handleRun} disabled={simRunning} style={{
          padding: "6px 16px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
          background: simRunning ? "#e5c07b" : "#50a14f", color: "#fff", border: "none", marginLeft: "auto",
        }}>{simRunning ? `Simulating... ${simStep}/120` : "Run Quick Sim"}</button>
      </div>

      {tab === "summary" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Junctions", val: nodeStats.junctions, color: "#61afef" },
              { label: "Storage Nodes", val: nodeStats.storage, color: "#c678dd" },
              { label: "Outfalls", val: nodeStats.outfalls, color: "#e06c75" },
              { label: "Conduits", val: linkStats.conduits, color: "#98c379" },
              { label: "Pumps", val: linkStats.pumps, color: "#e5c07b" },
              { label: "Subcatchments", val: SAMPLE_SUBCATCHMENTS.length, color: "#56b6c2" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: 12, borderRadius: 8, background: t.panelHeader,
                border: `1px solid ${t.border}`, textAlign: "center",
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{
            padding: 14, borderRadius: 8, background: t.panelHeader,
            border: `1px solid ${t.border}`, fontFamily: "monospace", fontSize: 11, color: t.text,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#e5c07b" }}>Model Overview</div>
            <div>Total Catchment Area: {totalArea.toFixed(1)} acres</div>
            <div>Average Imperviousness: {avgImperv.toFixed(1)}%</div>
            <div>Total Pipe Length: {SAMPLE_LINKS.reduce((s, l) => s + l.length, 0).toFixed(0)} ft</div>
            <div>Pipe Diameter Range: {Math.min(...SAMPLE_LINKS.filter(l=>l.diameter>0).map(l => l.diameter)).toFixed(1)} - {Math.max(...SAMPLE_LINKS.map(l => l.diameter)).toFixed(1)} ft</div>
          </div>
        </div>
      )}

      {tab === "nodes" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "monospace" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {["ID", "Type", "Invert (ft)", "Max Depth (ft)", "Max Sim Depth"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: t.textMuted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_NODES.map(n => (
                <tr key={n.id} onClick={() => { setSelectedNode(n.id); setTab("results"); }}
                  style={{ borderBottom: `1px solid ${t.border}`, cursor: "pointer" }}
                  onMouseOver={e => e.currentTarget.style.background = t.panelHeader}
                  onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "6px 10px", color: "#61afef", fontWeight: 700 }}>{n.id}</td>
                  <td style={{ padding: "6px 10px", color: t.text }}>{n.type}</td>
                  <td style={{ padding: "6px 10px", color: t.text }}>{n.invert.toFixed(1)}</td>
                  <td style={{ padding: "6px 10px", color: t.text }}>{n.maxDepth}</td>
                  <td style={{ padding: "6px 10px", color: simResults && simResults.maxDepths[n.id] > n.maxDepth * 0.9 ? "#e06c75" : "#98c379" }}>
                    {simResults ? simResults.maxDepths[n.id].toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "links" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "monospace" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.border}` }}>
                {["ID", "Type", "From", "To", "Length (ft)", "Dia (ft)", "n", "Max Flow"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: t.textMuted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_LINKS.map(l => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td style={{ padding: "6px 10px", color: "#98c379", fontWeight: 700 }}>{l.id}</td>
                  <td style={{ padding: "6px 10px", color: t.text }}>{l.type}</td>
                  <td style={{ padding: "6px 10px", color: t.text }}>{l.from}</td>
                  <td style={{ padding: "6px 10px", color: t.text }}>{l.to}</td>
                  <td style={{ padding: "6px 10px", color: t.text }}>{l.length}</td>
                  <td style={{ padding: "6px 10px", color: t.text }}>{l.diameter || "—"}</td>
                  <td style={{ padding: "6px 10px", color: t.text }}>{l.roughness || "—"}</td>
                  <td style={{ padding: "6px 10px", color: "#e5c07b" }}>
                    {simResults ? simResults.maxFlows[l.id].toFixed(2) + " cfs" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "results" && (
        <div>
          {!simResults ? (
            <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 13 }}>
              Click "Run Quick Sim" to generate results
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {SAMPLE_NODES.map(n => (
                  <button key={n.id} onClick={() => setSelectedNode(n.id)} style={{
                    padding: "4px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer",
                    background: selectedNode === n.id ? "#61afef" : t.panelHeader,
                    color: selectedNode === n.id ? "#fff" : t.text,
                    border: `1px solid ${selectedNode === n.id ? "#61afef" : t.border}`,
                  }}>{n.id}</button>
                ))}
              </div>
              <canvas ref={canvasRef} width={660} height={280} style={{
                background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
                width: "100%", maxWidth: 660, display: "block",
              }} />
              {simResults.flooding.length > 0 && (
                <div style={{
                  marginTop: 12, padding: 10, borderRadius: 6,
                  background: "#e06c7522", border: "1px solid #e06c75",
                  fontSize: 11, color: "#e06c75", fontFamily: "monospace",
                }}>
                  Flooding detected at {[...new Set(simResults.flooding.map(f => f.node))].join(", ")}
                  ({simResults.flooding.length} events)
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
