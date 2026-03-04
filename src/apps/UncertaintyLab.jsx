import { useState, useRef, useEffect } from "react";

function normalRandom(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function uniformRandom(lo, hi) { return lo + Math.random() * (hi - lo); }

function runMonteCarlo(nSamples, params) {
  const results = [];
  for (let i = 0; i < nSamples; i++) {
    const n = normalRandom(params.manning.mean, params.manning.std);
    const imp = uniformRandom(params.imperv.lo, params.imperv.hi);
    const rain = normalRandom(params.rainfall.mean, params.rainfall.std);
    const manN = Math.max(0.005, n);
    const impFrac = Math.min(100, Math.max(0, imp)) / 100;
    const rainVal = Math.max(0, rain);
    const runoffC = 0.3 + impFrac * 0.6;
    const peakQ = runoffC * rainVal * 25 * 1.008 + normalRandom(0, 2);
    const slope = 0.005;
    const diam = 2.0;
    const area = Math.PI * (diam / 2) ** 2;
    const rh = diam / 4;
    const cap = (1 / manN) * area * Math.pow(rh, 2 / 3) * Math.sqrt(slope);
    const floodVol = peakQ > cap ? (peakQ - cap) * 0.5 : 0;
    results.push({ peakQ: Math.max(0, peakQ), floodVol, capacity: cap, manningN: manN, imperv: imp * 100, rainfall: rainVal });
  }
  return results;
}

export default function UncertaintyLab({ theme }) {
  const t = theme;
  const canvasRef = useRef(null);
  const [nSamples, setNSamples] = useState(5000);
  const [manning, setManning] = useState({ mean: 0.013, std: 0.002 });
  const [imperv, setImperv] = useState({ lo: 45, hi: 75 });
  const [rainfall, setRainfall] = useState({ mean: 2.5, std: 0.8 });
  const [results, setResults] = useState(null);
  const [stats, setStats] = useState(null);

  const run = () => {
    const res = runMonteCarlo(nSamples, { manning, imperv, rainfall });
    setResults(res);
    const peaks = res.map(r => r.peakQ).sort((a, b) => a - b);
    const mean = peaks.reduce((a, b) => a + b, 0) / peaks.length;
    const std = Math.sqrt(peaks.reduce((a, b) => a + (b - mean) ** 2, 0) / peaks.length);
    const p05 = peaks[Math.floor(peaks.length * 0.05)];
    const p50 = peaks[Math.floor(peaks.length * 0.5)];
    const p95 = peaks[Math.floor(peaks.length * 0.95)];
    const floodProb = res.filter(r => r.floodVol > 0).length / res.length * 100;
    setStats({ mean, std, p05, p50, p95, floodProb });
  };

  useEffect(() => {
    if (!results || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const pad = { top: 35, right: 20, bottom: 45, left: 55 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    const peaks = results.map(r => r.peakQ).sort((a, b) => b - a);
    const n = peaks.length;

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
    ctx.fillText("Exceedance Probability: P(Q > q)", pad.left, 20);

    ctx.fillStyle = t.textMuted;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Peak Flow Q (cfs)", w / 2, h - 5);
    ctx.save();
    ctx.translate(14, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("P(Q > q)", 0, 0);
    ctx.restore();

    const maxQ = peaks[0];
    const minQ = peaks[n - 1];

    ctx.strokeStyle = "#9558B2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 500))) {
      const prob = (i + 1) / (n + 1);
      const x = pad.left + ((peaks[i] - minQ) / (maxQ - minQ || 1)) * pw;
      const y = h - pad.bottom - prob * ph;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (stats) {
      [{ val: stats.p05, label: "5%", color: "#50a14f" },
       { val: stats.p50, label: "50%", color: "#e8a735" },
       { val: stats.p95, label: "95%", color: "#e45649" }].forEach(({ val, label, color }) => {
        const x = pad.left + ((val - minQ) / (maxQ - minQ || 1)) * pw;
        ctx.strokeStyle = color;
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, h - pad.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${label}: ${val.toFixed(1)}`, x, h - pad.bottom + 28);
      });
    }
  }, [results, stats, t]);

  const inputStyle = {
    width: 65, padding: "4px 6px", fontSize: 12, borderRadius: 4,
    border: `1px solid ${t.border}`, background: t.panelBg, color: t.text,
    fontFamily: "monospace",
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>
            Uncertain Parameters
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.text, fontWeight: 600, marginBottom: 4 }}>Manning's n ~ Normal</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: t.textMuted }}>
              <span>mean</span><input type="number" step={0.001} value={manning.mean} onChange={e => setManning({ ...manning, mean: +e.target.value })} style={inputStyle} />
              <span>std</span><input type="number" step={0.001} value={manning.std} onChange={e => setManning({ ...manning, std: +e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.text, fontWeight: 600, marginBottom: 4 }}>Imperviousness ~ Uniform(%)</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: t.textMuted }}>
              <span>lo</span><input type="number" value={imperv.lo} onChange={e => setImperv({ ...imperv, lo: +e.target.value })} style={inputStyle} />
              <span>hi</span><input type="number" value={imperv.hi} onChange={e => setImperv({ ...imperv, hi: +e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.text, fontWeight: 600, marginBottom: 4 }}>Rainfall ~ Normal(in)</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: t.textMuted }}>
              <span>mean</span><input type="number" step={0.1} value={rainfall.mean} onChange={e => setRainfall({ ...rainfall, mean: +e.target.value })} style={inputStyle} />
              <span>std</span><input type="number" step={0.1} value={rainfall.std} onChange={e => setRainfall({ ...rainfall, std: +e.target.value })} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: t.text, fontWeight: 600, marginBottom: 4 }}>Samples</div>
            <select value={nSamples} onChange={e => setNSamples(+e.target.value)} style={{
              padding: "6px 10px", borderRadius: 4, border: `1px solid ${t.border}`,
              background: t.panelBg, color: t.text, fontSize: 12, fontFamily: "monospace",
            }}>
              {[1000, 5000, 10000, 25000].map(n => <option key={n} value={n}>{n.toLocaleString()}</option>)}
            </select>
          </div>
          <button onClick={run} style={{
            padding: "10px 24px", borderRadius: 6, border: "none", cursor: "pointer",
            background: "#9558B2", color: "#fff", fontWeight: 700, fontSize: 13, width: "100%",
          }}>Run Monte Carlo</button>
        </div>
        <div>
          <canvas ref={canvasRef} width={600} height={350} style={{
            background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
            width: "100%", maxWidth: 600, display: "block",
          }} />
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
              <div style={{ padding: 10, borderRadius: 6, background: t.panelHeader, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase" }}>Mean Peak Flow</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#9558B2", fontFamily: "monospace" }}>
                  {stats.mean.toFixed(1)} <span style={{ fontSize: 10, color: t.textMuted }}>cfs</span>
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, background: t.panelHeader, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase" }}>95% CI</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e45649", fontFamily: "monospace" }}>
                  [{stats.p05.toFixed(1)}, {stats.p95.toFixed(1)}]
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, background: t.panelHeader, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, color: t.textMuted, textTransform: "uppercase" }}>Flood Probability</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#e8a735", fontFamily: "monospace" }}>
                  {stats.floodProb.toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
