import { useState, useRef, useEffect, useCallback } from "react";

const STORM_TYPES = {
  scs2: { label: "SCS Type II", peakPos: 0.375, peakFrac: 0.34, desc: "Midwest US thunderstorm" },
  scs1: { label: "SCS Type I", peakPos: 0.5, peakFrac: 0.24, desc: "Pacific maritime climate" },
  scs1a: { label: "SCS Type IA", peakPos: 0.5, peakFrac: 0.20, desc: "Coastal Pacific Northwest" },
  scs3: { label: "SCS Type III", peakPos: 0.5, peakFrac: 0.25, desc: "Gulf of Mexico & Atlantic" },
  uniform: { label: "Uniform", peakPos: 0.5, peakFrac: 0.05, desc: "Constant intensity" },
  chicago: { label: "Chicago Storm", peakPos: 0.4, peakFrac: 0.30, desc: "Synthetic design storm" },
};

function generateRainfall(type, totalDepth, duration, dt) {
  const steps = Math.floor(duration / dt);
  const storm = STORM_TYPES[type];
  const data = [];
  let cumulative = 0;

  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    let intensity;

    if (type === "uniform") {
      intensity = totalDepth / (duration / 60);
    } else {
      const dist = Math.abs(t - storm.peakPos);
      const peak = totalDepth * storm.peakFrac / (dt / 60);
      const decay = type === "chicago" ? 3.5 : 4.0;
      intensity = peak * Math.exp(-decay * dist * dist / (0.1 * 0.1));
      intensity = Math.max(intensity, totalDepth * 0.01 / (dt / 60));
    }

    cumulative += intensity * (dt / 60);
    data.push({ time: (i * dt) / 60, intensity, cumulative });
  }

  const scale = totalDepth / cumulative;
  cumulative = 0;
  data.forEach(d => {
    d.intensity *= scale;
    cumulative += d.intensity * (dt / 60);
    d.cumulative = cumulative;
  });

  return data;
}

function generateRunoff(rainfall, cn, area, tc) {
  const S = (1000 / cn) - 10;
  const Ia = 0.2 * S;
  const data = [];
  let totalRain = 0;
  let totalExcess = 0;

  const unitHydro = [];
  const tp = 0.6 * tc;
  const qp = 484 * area / tp;
  const tbh = 2.67 * tp;
  for (let i = 0; i < Math.ceil(tbh); i++) {
    const t = i / tbh;
    unitHydro.push(qp * Math.pow(t, 3) * Math.exp(3 * (1 - t)));
  }

  const excessArr = [];
  rainfall.forEach((r, i) => {
    totalRain += r.intensity * (5 / 60);
    const pe = totalRain > Ia ? Math.pow(totalRain - Ia, 2) / (totalRain - Ia + S) : 0;
    const incExcess = pe - totalExcess;
    totalExcess = pe;
    excessArr.push(Math.max(0, incExcess));
  });

  for (let i = 0; i < rainfall.length; i++) {
    let flow = 0;
    for (let j = 0; j < excessArr.length && j <= i; j++) {
      const uhIdx = i - j;
      if (uhIdx < unitHydro.length) {
        flow += excessArr[j] * unitHydro[uhIdx] * 0.01;
      }
    }
    data.push({ time: rainfall[i].time, flow: Math.max(0, flow) });
  }

  return data;
}

export default function HydrographPlotter({ theme: t }) {
  const rainCanvasRef = useRef(null);
  const runoffCanvasRef = useRef(null);
  const [stormType, setStormType] = useState("scs2");
  const [totalDepth, setTotalDepth] = useState(3.0);
  const [duration, setDuration] = useState(360);
  const [curveNumber, setCurveNumber] = useState(75);
  const [area, setArea] = useState(100);
  const [tc, setTc] = useState(60);
  const [rainfall, setRainfall] = useState(null);
  const [runoff, setRunoff] = useState(null);

  const handleGenerate = () => {
    const rain = generateRainfall(stormType, totalDepth, duration, 5);
    const flow = generateRunoff(rain, curveNumber, area, tc);
    setRainfall(rain);
    setRunoff(flow);
  };

  const drawRain = useCallback(() => {
    const canvas = rainCanvasRef.current;
    if (!canvas || !rainfall) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const m = { top: 25, right: 50, bottom: 30, left: 50 };
    const pw = W - m.left - m.right;
    const ph = H - m.top - m.bottom;

    const maxI = Math.max(...rainfall.map(r => r.intensity), 0.1);
    const maxC = Math.max(...rainfall.map(r => r.cumulative), 0.1);

    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.left, m.top);
    ctx.lineTo(m.left, H - m.bottom);
    ctx.lineTo(W - m.right, H - m.bottom);
    ctx.stroke();

    ctx.fillStyle = "#61afef";
    const barW = Math.max(1, pw / rainfall.length - 1);
    rainfall.forEach((r, i) => {
      const x = m.left + (i / rainfall.length) * pw;
      const h = (r.intensity / maxI) * ph;
      ctx.fillRect(x, H - m.bottom - h, barW, h);
    });

    ctx.strokeStyle = "#e06c75";
    ctx.lineWidth = 2;
    ctx.beginPath();
    rainfall.forEach((r, i) => {
      const x = m.left + (i / rainfall.length) * pw;
      const y = m.top + (1 - r.cumulative / maxC) * ph;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = t.textMuted;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Time (hr)", W / 2, H - 4);

    ctx.textAlign = "right";
    ctx.fillStyle = "#61afef";
    ctx.fillText(`${maxI.toFixed(1)} in/hr`, m.left - 4, m.top + 10);
    ctx.fillText("0", m.left - 4, H - m.bottom);

    ctx.textAlign = "left";
    ctx.fillStyle = "#e06c75";
    ctx.fillText(`${maxC.toFixed(1)} in`, W - m.right + 4, m.top + 10);

    ctx.fillStyle = "#61afef";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${STORM_TYPES[stormType].label} Rainfall Hyetograph`, m.left, m.top - 8);
  }, [rainfall, t, stormType]);

  const drawRunoff = useCallback(() => {
    const canvas = runoffCanvasRef.current;
    if (!canvas || !runoff) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const m = { top: 25, right: 20, bottom: 30, left: 50 };
    const pw = W - m.left - m.right;
    const ph = H - m.top - m.bottom;

    const maxQ = Math.max(...runoff.map(r => r.flow), 0.1);

    ctx.strokeStyle = t.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.left, m.top);
    ctx.lineTo(m.left, H - m.bottom);
    ctx.lineTo(W - m.right, H - m.bottom);
    ctx.stroke();

    ctx.fillStyle = "#98c37944";
    ctx.beginPath();
    ctx.moveTo(m.left, H - m.bottom);
    runoff.forEach((r, i) => {
      const x = m.left + (i / runoff.length) * pw;
      const y = H - m.bottom - (r.flow / maxQ) * ph;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(m.left + pw, H - m.bottom);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#98c379";
    ctx.lineWidth = 2;
    ctx.beginPath();
    runoff.forEach((r, i) => {
      const x = m.left + (i / runoff.length) * pw;
      const y = H - m.bottom - (r.flow / maxQ) * ph;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const peakFlow = Math.max(...runoff.map(r => r.flow));
    const peakIdx = runoff.findIndex(r => r.flow === peakFlow);
    if (peakIdx >= 0) {
      const px = m.left + (peakIdx / runoff.length) * pw;
      const py = H - m.bottom - (peakFlow / maxQ) * ph;
      ctx.fillStyle = "#e06c75";
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e06c75";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Peak: ${peakFlow.toFixed(1)} cfs @ ${runoff[peakIdx].time.toFixed(0)} min`, px, py - 10);
    }

    ctx.fillStyle = t.textMuted;
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Time (hr)", W / 2, H - 4);

    ctx.textAlign = "right";
    ctx.fillStyle = "#98c379";
    ctx.fillText(`${maxQ.toFixed(1)} cfs`, m.left - 4, m.top + 10);

    ctx.fillStyle = "#98c379";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`SCS Unit Hydrograph Response (CN=${curveNumber})`, m.left, m.top - 8);
  }, [runoff, t, curveNumber]);

  useEffect(() => { drawRain(); }, [drawRain]);
  useEffect(() => { drawRunoff(); }, [drawRunoff]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: "1 1 200px" }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ color: t.textMuted, fontSize: 11, fontWeight: 600 }}>Storm Type</label>
            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              {Object.entries(STORM_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => setStormType(k)} style={{
                  padding: "4px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer",
                  background: stormType === k ? "#61afef" : t.panelHeader, color: stormType === k ? "#fff" : t.text,
                  border: `1px solid ${stormType === k ? "#61afef" : t.border}`,
                }}>{v.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, fontStyle: "italic" }}>
              {STORM_TYPES[stormType].desc}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ color: t.textMuted, fontSize: 11 }}>Total Depth: {totalDepth.toFixed(1)} in</label>
            <input type="range" min={0.5} max={10} step={0.5} value={totalDepth}
              onChange={e => setTotalDepth(+e.target.value)}
              style={{ width: "100%", accentColor: "#61afef" }} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ color: t.textMuted, fontSize: 11 }}>Duration: {duration} min ({(duration/60).toFixed(1)} hr)</label>
            <input type="range" min={60} max={1440} step={60} value={duration}
              onChange={e => setDuration(+e.target.value)}
              style={{ width: "100%", accentColor: "#61afef" }} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ color: t.textMuted, fontSize: 11 }}>SCS Curve Number: {curveNumber}</label>
            <input type="range" min={40} max={98} step={1} value={curveNumber}
              onChange={e => setCurveNumber(+e.target.value)}
              style={{ width: "100%", accentColor: "#98c379" }} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ color: t.textMuted, fontSize: 11 }}>Watershed Area: {area} acres</label>
            <input type="range" min={10} max={500} step={10} value={area}
              onChange={e => setArea(+e.target.value)}
              style={{ width: "100%", accentColor: "#98c379" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ color: t.textMuted, fontSize: 11 }}>Time of Concentration: {tc} min</label>
            <input type="range" min={10} max={180} step={5} value={tc}
              onChange={e => setTc(+e.target.value)}
              style={{ width: "100%", accentColor: "#98c379" }} />
          </div>

          <button onClick={handleGenerate} style={{
            padding: "8px 24px", borderRadius: 6, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 13, background: "#50a14f", color: "#fff", width: "100%",
          }}>Generate Hydrograph</button>
        </div>

        <div style={{ flex: "2 1 400px" }}>
          {!rainfall ? (
            <div style={{ padding: 60, textAlign: "center", color: t.textMuted, fontSize: 13,
              border: `2px dashed ${t.border}`, borderRadius: 8 }}>
              Configure storm parameters and click "Generate Hydrograph"
            </div>
          ) : (
            <div>
              <canvas ref={rainCanvasRef} width={620} height={200} style={{
                background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
                width: "100%", maxWidth: 620, display: "block", marginBottom: 12,
              }} />
              <canvas ref={runoffCanvasRef} width={620} height={220} style={{
                background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
                width: "100%", maxWidth: 620, display: "block",
              }} />
              {runoff && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginTop: 12 }}>
                  {[
                    { label: "Peak Flow", val: `${Math.max(...runoff.map(r => r.flow)).toFixed(1)} cfs`, color: "#e06c75" },
                    { label: "Total Rainfall", val: `${totalDepth.toFixed(1)} in`, color: "#61afef" },
                    { label: "Total Runoff", val: `${(runoff.reduce((s, r) => s + r.flow * 5/60, 0) / area * 12).toFixed(2)} in`, color: "#98c379" },
                    { label: "Runoff Ratio", val: `${((1000/curveNumber - 10) < totalDepth ? ((totalDepth - 0.2*(1000/curveNumber-10))**2 / (totalDepth + 0.8*(1000/curveNumber-10))) / totalDepth * 100 : 0).toFixed(0)}%`, color: "#e5c07b" },
                  ].map((s, i) => (
                    <div key={i} style={{
                      padding: "8px 12px", borderRadius: 6, background: t.panelHeader,
                      border: `1px solid ${t.border}`, textAlign: "center",
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "monospace" }}>{s.val}</div>
                      <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
