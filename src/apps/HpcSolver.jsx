import { useState, useRef, useEffect } from "react";

function simulateBenchmark(nConduits, maxCores) {
  const results = [];
  const baseTime = nConduits * 0.02;
  for (let cores = 1; cores <= maxCores; cores *= 2) {
    const overhead = 1 + Math.log2(cores) * 0.05;
    const parallelFrac = 0.92;
    const speedup = 1 / ((1 - parallelFrac) + parallelFrac / cores) / overhead;
    const wallTime = baseTime / speedup;
    const efficiency = speedup / cores * 100;
    results.push({ cores, speedup, wallTime, efficiency });
  }
  return results;
}

export default function HpcSolver({ theme }) {
  const t = theme;
  const canvasRef = useRef(null);
  const [nConduits, setNConduits] = useState(10000);
  const [maxCores, setMaxCores] = useState(64);
  const [results, setResults] = useState(null);
  const [animStep, setAnimStep] = useState(0);
  const [running, setRunning] = useState(false);

  const runBenchmark = () => {
    setRunning(true);
    setAnimStep(0);
    const res = simulateBenchmark(nConduits, maxCores);
    setResults(res);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setAnimStep(step);
      if (step >= res.length) { clearInterval(interval); setRunning(false); }
    }, 400);
  };

  useEffect(() => {
    if (!results || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const pad = { top: 35, right: 30, bottom: 45, left: 55 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    const maxSpeedup = Math.max(...results.map(r => r.speedup));
    const maxCoresVal = Math.max(...results.map(r => r.cores));

    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, h - pad.bottom);
    ctx.lineTo(w - pad.right, h - pad.bottom);
    ctx.stroke();

    ctx.fillStyle = t.text;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Parallel Speedup: ${nConduits.toLocaleString()} Conduits`, pad.left, 20);

    ctx.fillStyle = t.textMuted;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CPU Cores", w / 2, h - 5);
    ctx.save();
    ctx.translate(14, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Speedup (x)", 0, 0);
    ctx.restore();

    const visibleResults = results.slice(0, animStep);

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = `${t.textMuted}66`;
    ctx.beginPath();
    results.forEach(r => {
      const x = pad.left + (Math.log2(r.cores) / Math.log2(maxCoresVal)) * pw;
      const y = h - pad.bottom - (r.cores / maxCoresVal) * ph;
      if (r.cores === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = t.textFaint;
    ctx.font = "9px monospace";
    ctx.fillText("ideal", w - pad.right - 15, pad.top + 10);

    if (visibleResults.length > 1) {
      ctx.strokeStyle = "#61afef";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      visibleResults.forEach((r, i) => {
        const x = pad.left + (Math.log2(r.cores) / Math.log2(maxCoresVal)) * pw;
        const y = h - pad.bottom - (r.speedup / maxCoresVal) * ph;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    visibleResults.forEach(r => {
      const x = pad.left + (Math.log2(r.cores) / Math.log2(maxCoresVal)) * pw;
      const y = h - pad.bottom - (r.speedup / maxCoresVal) * ph;
      ctx.fillStyle = "#61afef";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = t.text;
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${r.speedup.toFixed(1)}x`, x, y - 10);
      ctx.fillStyle = t.textMuted;
      ctx.fillText(`${r.cores}`, x, h - pad.bottom + 15);
    });

  }, [results, animStep, t, nConduits]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 11, color: t.textMuted, display: "block", marginBottom: 4 }}>Conduits</label>
          <select value={nConduits} onChange={e => setNConduits(+e.target.value)} style={{
            padding: "6px 10px", borderRadius: 4, border: `1px solid ${t.border}`,
            background: t.panelBg, color: t.text, fontSize: 12, fontFamily: "monospace",
          }}>
            {[1000, 5000, 10000, 25000, 50000].map(n => (
              <option key={n} value={n}>{n.toLocaleString()}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: t.textMuted, display: "block", marginBottom: 4 }}>Max Cores</label>
          <select value={maxCores} onChange={e => setMaxCores(+e.target.value)} style={{
            padding: "6px 10px", borderRadius: 4, border: `1px solid ${t.border}`,
            background: t.panelBg, color: t.text, fontSize: 12, fontFamily: "monospace",
          }}>
            {[8, 16, 32, 64, 128].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button onClick={runBenchmark} disabled={running} style={{
          padding: "8px 24px", borderRadius: 6, border: "none", cursor: running ? "default" : "pointer",
          background: running ? t.textMuted : "#4d41b1", color: "#fff", fontWeight: 700, fontSize: 13,
          opacity: running ? 0.7 : 1,
        }}>{running ? "Running..." : "Run Benchmark"}</button>
      </div>
      <canvas ref={canvasRef} width={650} height={350} style={{
        background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
        width: "100%", maxWidth: 650, display: "block",
      }} />
      {results && animStep >= results.length && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 12 }}>
          {results.map(r => (
            <div key={r.cores} style={{
              padding: 10, borderRadius: 6, background: t.panelHeader,
              border: `1px solid ${t.border}`, fontFamily: "monospace", fontSize: 11,
            }}>
              <div style={{ fontWeight: 700, color: t.text }}>{r.cores} cores</div>
              <div style={{ color: "#61afef" }}>{r.speedup.toFixed(2)}x speedup</div>
              <div style={{ color: t.textMuted }}>{r.wallTime.toFixed(1)}s wall time</div>
              <div style={{ color: t.textMuted }}>{r.efficiency.toFixed(0)}% efficiency</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
