import { useState, useRef, useEffect, useCallback } from "react";

const IDF_DATA = {
  "Miami, FL": { a: 96.6, b: 13.9, n: 0.786, region: "Southeast" },
  "Houston, TX": { a: 97.5, b: 10.0, n: 0.780, region: "Gulf Coast" },
  "Chicago, IL": { a: 57.2, b: 9.6, n: 0.710, region: "Midwest" },
  "Denver, CO": { a: 39.8, b: 8.0, n: 0.670, region: "Mountain West" },
  "Seattle, WA": { a: 24.3, b: 5.5, n: 0.600, region: "Pacific NW" },
  "New York, NY": { a: 63.5, b: 11.2, n: 0.730, region: "Northeast" },
  "Phoenix, AZ": { a: 45.2, b: 12.0, n: 0.750, region: "Desert SW" },
  "Portland, OR": { a: 27.1, b: 6.2, n: 0.620, region: "Pacific NW" },
};

const RETURN_PERIODS = [2, 5, 10, 25, 50, 100];

function getIntensity(city, duration, returnPeriod) {
  const params = IDF_DATA[city];
  const rpFactor = Math.log(returnPeriod) / Math.log(10);
  return (params.a * (0.5 + rpFactor * 0.5)) / Math.pow(duration + params.b, params.n);
}

function generateAlternatingBlock(city, returnPeriod, totalDuration, dt) {
  const steps = Math.floor(totalDuration / dt);
  const intensities = [];

  for (let i = 1; i <= steps; i++) {
    const dur = i * dt;
    const avgI = getIntensity(city, dur, returnPeriod);
    const totalDepth = avgI * dur / 60;
    intensities.push({ dur, avgI, totalDepth });
  }

  const increments = [];
  for (let i = 0; i < steps; i++) {
    const depth = i === 0 ? intensities[0].totalDepth : intensities[i].totalDepth - intensities[i-1].totalDepth;
    increments.push(Math.max(0, depth));
  }

  increments.sort((a, b) => b - a);
  const result = new Array(steps).fill(0);
  const center = Math.floor(steps / 2);

  for (let i = 0; i < increments.length; i++) {
    const offset = Math.floor((i + 1) / 2);
    const idx = i % 2 === 0 ? center + offset : center - offset;
    if (idx >= 0 && idx < steps) {
      result[idx] = increments[i] / (dt / 60);
    }
  }

  return result.map((intensity, i) => ({
    time: i * dt,
    intensity,
    depth: intensity * (dt / 60),
  }));
}

export default function DesignStormGen({ theme: t }) {
  const canvasRef = useRef(null);
  const idfCanvasRef = useRef(null);
  const [city, setCity] = useState("Houston, TX");
  const [returnPeriod, setReturnPeriod] = useState(25);
  const [duration, setDuration] = useState(120);
  const [dt, setDt] = useState(5);
  const [storm, setStorm] = useState(null);

  const handleGenerate = () => {
    const s = generateAlternatingBlock(city, returnPeriod, duration, dt);
    setStorm(s);
  };

  const drawStorm = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !storm) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const m = { top: 30, right: 20, bottom: 35, left: 55 };
    const pw = W - m.left - m.right;
    const ph = H - m.top - m.bottom;

    const maxI = Math.max(...storm.map(s => s.intensity), 0.1);

    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.left, m.top);
    ctx.lineTo(m.left, H - m.bottom);
    ctx.lineTo(W - m.right, H - m.bottom);
    ctx.stroke();

    const barW = Math.max(2, pw / storm.length - 1);
    storm.forEach((s, i) => {
      const x = m.left + (i / storm.length) * pw;
      const h = (s.intensity / maxI) * ph;
      const frac = s.intensity / maxI;
      const r = Math.floor(97 + frac * 127);
      const g = Math.floor(175 - frac * 100);
      const b = Math.floor(239 - frac * 100);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, H - m.bottom - h, barW, h);
    });

    ctx.fillStyle = t.textMuted;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Time (min)", W / 2, H - 6);

    for (let i = 0; i <= 4; i++) {
      const tVal = (i / 4) * duration;
      const x = m.left + (i / 4) * pw;
      ctx.fillText(tVal.toFixed(0), x, H - m.bottom + 14);
    }

    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = (maxI * i / 4);
      const y = H - m.bottom - (i / 4) * ph;
      ctx.fillText(v.toFixed(1), m.left - 4, y + 3);
    }

    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Intensity (in/hr)", 0, 0);
    ctx.restore();

    ctx.fillStyle = "#61afef";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${city} \u2014 ${returnPeriod}-yr, ${duration}-min Alternating Block Storm`, m.left, m.top - 10);

    const totalDepth = storm.reduce((s, d) => s + d.depth, 0);
    const peakI = Math.max(...storm.map(s => s.intensity));
    ctx.font = "10px monospace";
    ctx.fillStyle = "#e5c07b";
    ctx.fillText(`Total: ${totalDepth.toFixed(2)} in | Peak: ${peakI.toFixed(1)} in/hr`, m.left, m.top + 4);
  }, [storm, t, city, returnPeriod, duration]);

  const drawIDF = useCallback(() => {
    const canvas = idfCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const m = { top: 25, right: 20, bottom: 35, left: 45 };
    const pw = W - m.left - m.right;
    const ph = H - m.top - m.bottom;

    const durations = [5, 10, 15, 30, 60, 120, 180, 360];
    const maxDur = 360;

    let maxI = 0;
    RETURN_PERIODS.forEach(rp => {
      durations.forEach(d => {
        maxI = Math.max(maxI, getIntensity(city, d, rp));
      });
    });

    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.left, m.top);
    ctx.lineTo(m.left, H - m.bottom);
    ctx.lineTo(W - m.right, H - m.bottom);
    ctx.stroke();

    const colors = ["#56b6c2", "#98c379", "#e5c07b", "#e06c75", "#c678dd", "#61afef"];
    RETURN_PERIODS.forEach((rp, ri) => {
      ctx.strokeStyle = colors[ri];
      ctx.lineWidth = rp === returnPeriod ? 3 : 1.5;
      ctx.beginPath();
      durations.forEach((d, i) => {
        const intensity = getIntensity(city, d, rp);
        const x = m.left + (Math.log(d) / Math.log(maxDur)) * pw;
        const y = H - m.bottom - (intensity / maxI) * ph;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const lastD = durations[durations.length - 1];
      const lastI = getIntensity(city, lastD, rp);
      const lx = m.left + (Math.log(lastD) / Math.log(maxDur)) * pw + 4;
      const ly = H - m.bottom - (lastI / maxI) * ph;
      ctx.fillStyle = colors[ri];
      ctx.font = "9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${rp}yr`, lx, ly + 3);
    });

    ctx.fillStyle = t.textMuted;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Duration (min, log scale)", W / 2, H - 6);

    ctx.fillStyle = "#61afef";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${city} IDF Curves`, m.left, m.top - 8);
  }, [city, returnPeriod, t]);

  useEffect(() => { drawStorm(); }, [drawStorm]);
  useEffect(() => { drawIDF(); }, [drawIDF]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: "1 1 220px" }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ color: t.textMuted, fontSize: 11, fontWeight: 600 }}>City</label>
            <select value={city} onChange={e => setCity(e.target.value)} style={{
              width: "100%", padding: "6px 8px", borderRadius: 4, fontSize: 11,
              background: t.panelHeader, color: t.text, border: `1px solid ${t.border}`, marginTop: 4,
            }}>
              {Object.entries(IDF_DATA).map(([c, d]) => (
                <option key={c} value={c}>{c} ({d.region})</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ color: t.textMuted, fontSize: 11, fontWeight: 600 }}>Return Period</label>
            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              {RETURN_PERIODS.map(rp => (
                <button key={rp} onClick={() => setReturnPeriod(rp)} style={{
                  padding: "4px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer",
                  background: returnPeriod === rp ? "#61afef" : t.panelHeader,
                  color: returnPeriod === rp ? "#fff" : t.text,
                  border: `1px solid ${returnPeriod === rp ? "#61afef" : t.border}`,
                }}>{rp}-yr</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ color: t.textMuted, fontSize: 11 }}>Duration: {duration} min</label>
            <input type="range" min={30} max={1440} step={30} value={duration}
              onChange={e => setDuration(+e.target.value)}
              style={{ width: "100%", accentColor: "#61afef" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ color: t.textMuted, fontSize: 11 }}>Time Step: {dt} min</label>
            <input type="range" min={5} max={30} step={5} value={dt}
              onChange={e => setDt(+e.target.value)}
              style={{ width: "100%", accentColor: "#61afef" }} />
          </div>

          <button onClick={handleGenerate} style={{
            padding: "8px 24px", borderRadius: 6, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 13, background: "#50a14f", color: "#fff", width: "100%",
          }}>Generate Design Storm</button>

          <canvas ref={idfCanvasRef} width={320} height={200} style={{
            background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
            width: "100%", maxWidth: 320, display: "block", marginTop: 16,
          }} />
        </div>

        <div style={{ flex: "2 1 400px" }}>
          {!storm ? (
            <div style={{ padding: 60, textAlign: "center", color: t.textMuted, fontSize: 13,
              border: `2px dashed ${t.border}`, borderRadius: 8 }}>
              Select city and parameters, then click "Generate Design Storm"
            </div>
          ) : (
            <div>
              <canvas ref={canvasRef} width={620} height={300} style={{
                background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
                width: "100%", maxWidth: 620, display: "block",
              }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 12 }}>
                {[
                  { label: "Total Depth", val: `${storm.reduce((s, d) => s + d.depth, 0).toFixed(2)} in`, color: "#61afef" },
                  { label: "Peak Intensity", val: `${Math.max(...storm.map(s => s.intensity)).toFixed(1)} in/hr`, color: "#e06c75" },
                  { label: "Duration", val: `${duration} min`, color: "#98c379" },
                  { label: "Intervals", val: `${storm.length}`, color: "#e5c07b" },
                  { label: "Return Period", val: `${returnPeriod} yr`, color: "#c678dd" },
                ].map((s, i) => (
                  <div key={i} style={{
                    padding: "8px 10px", borderRadius: 6, background: t.panelHeader,
                    border: `1px solid ${t.border}`, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
