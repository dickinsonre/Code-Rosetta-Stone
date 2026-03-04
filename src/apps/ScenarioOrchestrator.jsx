import { useState, useRef, useEffect } from "react";

function runSwmmSimple(imperv, manningN, pipeDiam) {
  const area = 25 * 43560;
  const runoffCoeff = 0.3 + (imperv / 100) * 0.6;
  const rainfall = 2.5;
  const peakRunoff = runoffCoeff * rainfall * area / 43560 * 1.008;
  const theta = Math.PI * 2;
  const fullArea = Math.PI * Math.pow(pipeDiam / 2, 2);
  const rh = pipeDiam / 4;
  const slope = 0.005;
  const capacity = (1 / manningN) * fullArea * Math.pow(rh, 2 / 3) * Math.sqrt(slope);
  const peakFlow = Math.min(peakRunoff, capacity * 1.2);
  const floodDuration = peakRunoff > capacity ? (peakRunoff - capacity) / peakRunoff * 120 : 0;
  const floodVolume = floodDuration > 0 ? (peakRunoff - capacity) * floodDuration * 60 / 43560 : 0;
  return { peakFlow: peakFlow + (Math.random() - 0.5) * 2, floodDuration, floodVolume, capacity, surchargeRatio: peakRunoff / capacity };
}

export default function ScenarioOrchestrator({ theme }) {
  const t = theme;
  const canvasRef = useRef(null);
  const [imperv, setImperv] = useState([25, 95]);
  const [manningN, setManningN] = useState([0.011, 0.013, 0.015]);
  const [pipeDiam, setPipeDiam] = useState([1.0, 1.5, 2.0, 2.5, 3.0]);
  const [results, setResults] = useState(null);
  const [sweepCount, setSweepCount] = useState(0);

  const runSweep = () => {
    const impRange = [];
    for (let v = imperv[0]; v <= imperv[1]; v += 5) impRange.push(v);
    const allResults = [];
    for (const imp of impRange) {
      for (const n of manningN) {
        for (const d of pipeDiam) {
          allResults.push({ imperv: imp, manningN: n, pipeDiam: d, ...runSwmmSimple(imp, n, d) });
        }
      }
    }
    setResults(allResults);
    setSweepCount(allResults.length);
  };

  useEffect(() => {
    if (!results || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const padding = { top: 30, right: 20, bottom: 40, left: 55 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const maxPeak = Math.max(...results.map(r => r.peakFlow));
    const minPeak = Math.min(...results.map(r => r.peakFlow));

    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = t.textMuted;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Imperviousness (%)", w / 2, h - 5);
    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Peak Flow (cfs)", 0, 0);
    ctx.restore();

    for (let i = 0; i <= 4; i++) {
      const val = minPeak + (maxPeak - minPeak) * (i / 4);
      const y = h - padding.bottom - (i / 4) * plotH;
      ctx.fillStyle = t.textFaint;
      ctx.font = "9px monospace";
      ctx.textAlign = "right";
      ctx.fillText(val.toFixed(1), padding.left - 5, y + 3);
      ctx.strokeStyle = `${t.border}88`;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    const colors = ["#61afef", "#e45649", "#50a14f", "#c678dd", "#e8a735"];
    const diamGroups = {};
    results.forEach(r => {
      const key = `n=${r.manningN},d=${r.pipeDiam}`;
      if (!diamGroups[key]) diamGroups[key] = [];
      diamGroups[key].push(r);
    });

    let ci = 0;
    for (const [key, group] of Object.entries(diamGroups)) {
      const sorted = group.sort((a, b) => a.imperv - b.imperv);
      const color = colors[ci % colors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      sorted.forEach((r, i) => {
        const x = padding.left + ((r.imperv - imperv[0]) / (imperv[1] - imperv[0])) * plotW;
        const y = h - padding.bottom - ((r.peakFlow - minPeak) / (maxPeak - minPeak || 1)) * plotH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      sorted.forEach(r => {
        const x = padding.left + ((r.imperv - imperv[0]) / (imperv[1] - imperv[0])) * plotW;
        const y = h - padding.bottom - ((r.peakFlow - minPeak) / (maxPeak - minPeak || 1)) * plotH;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ci++;
    }

    ctx.fillStyle = t.text;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Peak Flow Sensitivity", padding.left, 18);
  }, [results, t, imperv]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>
            Parameters
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: t.text, display: "block", marginBottom: 4 }}>
              Imperviousness Range: {imperv[0]}% - {imperv[1]}%
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="range" min={10} max={95} value={imperv[0]} onChange={e => setImperv([+e.target.value, imperv[1]])} style={{ flex: 1 }} />
              <input type="range" min={10} max={95} value={imperv[1]} onChange={e => setImperv([imperv[0], +e.target.value])} style={{ flex: 1 }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: t.text, display: "block", marginBottom: 4 }}>
              Manning's n values:
            </label>
            {manningN.map((v, i) => (
              <input key={i} type="number" step={0.001} min={0.005} max={0.05} value={v}
                onChange={e => { const n = [...manningN]; n[i] = +e.target.value; setManningN(n); }}
                style={{
                  width: 70, padding: "4px 6px", marginRight: 4, marginBottom: 4, fontSize: 12,
                  background: t.panelBg, color: t.text, border: `1px solid ${t.border}`, borderRadius: 4,
                  fontFamily: "monospace",
                }} />
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: t.text, display: "block", marginBottom: 4 }}>
              Pipe Diameters (ft):
            </label>
            {pipeDiam.map((v, i) => (
              <input key={i} type="number" step={0.5} min={0.5} max={6} value={v}
                onChange={e => { const d = [...pipeDiam]; d[i] = +e.target.value; setPipeDiam(d); }}
                style={{
                  width: 50, padding: "4px 6px", marginRight: 4, marginBottom: 4, fontSize: 12,
                  background: t.panelBg, color: t.text, border: `1px solid ${t.border}`, borderRadius: 4,
                  fontFamily: "monospace",
                }} />
            ))}
          </div>
          <button onClick={runSweep} style={{
            padding: "10px 24px", borderRadius: 6, border: "none", cursor: "pointer",
            background: "#3572A5", color: "#fff", fontWeight: 700, fontSize: 13, width: "100%",
          }}>Run {manningN.length * pipeDiam.length * (Math.floor((imperv[1] - imperv[0]) / 5) + 1)} Scenarios</button>
          {sweepCount > 0 && (
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 8, fontFamily: "monospace" }}>
              Completed {sweepCount} simulations
            </div>
          )}
        </div>
        <div>
          <canvas ref={canvasRef} width={600} height={350} style={{
            background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
            width: "100%", maxWidth: 600, display: "block",
          }} />
          {results && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <div style={{ padding: 10, borderRadius: 6, background: t.panelHeader, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase" }}>Max Peak Flow</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#e45649", fontFamily: "monospace" }}>
                  {Math.max(...results.map(r => r.peakFlow)).toFixed(1)} <span style={{ fontSize: 10, color: t.textMuted }}>cfs</span>
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, background: t.panelHeader, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase" }}>Max Flood Duration</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#e8a735", fontFamily: "monospace" }}>
                  {Math.max(...results.map(r => r.floodDuration)).toFixed(0)} <span style={{ fontSize: 10, color: t.textMuted }}>min</span>
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, background: t.panelHeader, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase" }}>Scenarios w/ Surcharge</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#c678dd", fontFamily: "monospace" }}>
                  {results.filter(r => r.surchargeRatio > 1).length} <span style={{ fontSize: 10, color: t.textMuted }}>/ {results.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
