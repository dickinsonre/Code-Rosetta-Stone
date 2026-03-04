import { useState, useRef, useEffect, useCallback } from "react";

const SAMPLE_NETWORK = {
  nodes: [
    { id: "Inlet_1", x: 80, y: 60, depth: 0, maxDepth: 6, invert: 15 },
    { id: "Inlet_2", x: 80, y: 220, depth: 0, maxDepth: 5, invert: 14 },
    { id: "J1", x: 220, y: 100, depth: 0, maxDepth: 8, invert: 12 },
    { id: "J2", x: 220, y: 220, depth: 0, maxDepth: 6, invert: 11 },
    { id: "J3", x: 370, y: 160, depth: 0, maxDepth: 10, invert: 8 },
    { id: "Storage", x: 500, y: 100, depth: 0, maxDepth: 12, invert: 6 },
    { id: "J4", x: 500, y: 240, depth: 0, maxDepth: 8, invert: 5 },
    { id: "Outfall", x: 620, y: 170, depth: 0, maxDepth: 15, invert: 2 },
  ],
  links: [
    { id: "P1", from: "Inlet_1", to: "J1", flow: 0, capacity: 15 },
    { id: "P2", from: "Inlet_2", to: "J2", flow: 0, capacity: 12 },
    { id: "P3", from: "J1", to: "J3", flow: 0, capacity: 20 },
    { id: "P4", from: "J2", to: "J3", flow: 0, capacity: 18 },
    { id: "P5", from: "J3", to: "Storage", flow: 0, capacity: 25 },
    { id: "P6", from: "J3", to: "J4", flow: 0, capacity: 15 },
    { id: "P7", from: "Storage", to: "Outfall", flow: 0, capacity: 30 },
    { id: "P8", from: "J4", to: "Outfall", flow: 0, capacity: 20 },
  ],
};

function generateTimeseries(nSteps) {
  const steps = [];
  for (let i = 0; i < nSteps; i++) {
    const t = i / nSteps;
    const stormPeak = Math.exp(-((t - 0.35) ** 2) / 0.02) * 1.2;
    const nodes = SAMPLE_NETWORK.nodes.map(n => {
      let depthFrac = stormPeak * (0.3 + Math.random() * 0.2);
      if (n.id.startsWith("Inlet")) depthFrac *= 1.5;
      if (n.id === "Storage") depthFrac *= 0.6;
      if (n.id === "Outfall") depthFrac *= 0.3;
      return { ...n, depth: Math.min(n.maxDepth * depthFrac, n.maxDepth * 1.15) };
    });
    const links = SAMPLE_NETWORK.links.map(l => {
      let flowFrac = stormPeak * (0.4 + Math.random() * 0.3);
      return { ...l, flow: l.capacity * Math.min(flowFrac, 1.1) };
    });
    steps.push({ nodes, links, time: i });
  }
  return steps;
}

export default function NetworkVisualizer({ theme }) {
  const t = theme;
  const canvasRef = useRef(null);
  const [timeseries, setTimeseries] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const playRef = useRef(false);
  const stepRef = useRef(0);

  const generate = () => {
    const ts = generateTimeseries(100);
    setTimeseries(ts);
    setCurrentStep(0);
    stepRef.current = 0;
  };

  useEffect(() => { generate(); }, []);

  const draw = useCallback(() => {
    if (!timeseries || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const frame = timeseries[stepRef.current] || timeseries[0];
    const nodeMap = {};
    frame.nodes.forEach(n => nodeMap[n.id] = n);

    frame.links.forEach(lk => {
      const from = nodeMap[lk.from], to = nodeMap[lk.to];
      if (!from || !to) return;
      const ratio = Math.min(lk.flow / lk.capacity, 1);
      const r = Math.round(50 + ratio * 205);
      const b = Math.round(255 - ratio * 205);
      ctx.strokeStyle = `rgb(${r},80,${b})`;
      ctx.lineWidth = 2 + ratio * 6;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      const progress = (Date.now() % 2000) / 2000;
      const dotX = from.x + (to.x - from.x) * progress;
      const dotY = from.y + (to.y - from.y) * progress;
      if (ratio > 0.1) {
        ctx.fillStyle = `rgba(${r},80,${b},0.8)`;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3 + ratio * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
      ctx.fillStyle = t.textMuted;
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${lk.flow.toFixed(1)}`, mx, my - 8);
    });

    frame.nodes.forEach(n => {
      const ratio = n.maxDepth > 0 ? Math.min(n.depth / n.maxDepth, 1) : 0;
      const radius = 12 + ratio * 10;
      let r, g;
      if (ratio < 0.5) { r = Math.round(50 + ratio * 2 * 200); g = Math.round(200 - ratio * 2 * 100); }
      else { r = 255; g = Math.round(100 - (ratio - 0.5) * 2 * 100); }
      ctx.fillStyle = `rgb(${r},${Math.max(0, g)},50)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (selectedNode === n.id) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (n.depth > n.maxDepth) {
        const pulse = Math.sin(Date.now() / 200) * 4 + 6;
        ctx.strokeStyle = `rgba(255,0,0,${0.3 + Math.sin(Date.now() / 300) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(n.id, n.x, n.y + 3);
      ctx.fillStyle = t.textMuted;
      ctx.font = "8px monospace";
      ctx.fillText(`${n.depth.toFixed(1)} ft`, n.x, n.y + radius + 12);
    });

    ctx.fillStyle = t.textMuted;
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`t = ${stepRef.current} min`, 10, 18);
  }, [timeseries, t, selectedNode]);

  useEffect(() => {
    if (!timeseries) return;
    let animId;
    const loop = () => {
      if (playRef.current && timeseries) {
        stepRef.current = (stepRef.current + 1) % timeseries.length;
        setCurrentStep(stepRef.current);
      }
      draw();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [timeseries, draw]);

  const handleCanvasClick = (e) => {
    if (!timeseries) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const frame = timeseries[stepRef.current];
    for (const n of frame.nodes) {
      if (Math.hypot(n.x - cx, n.y - cy) < 20) {
        setSelectedNode(selectedNode === n.id ? null : n.id);
        return;
      }
    }
    setSelectedNode(null);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => { playRef.current = !playRef.current; setPlaying(!playing); }} style={{
          padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer",
          background: playing ? "#e45649" : "#50a14f", color: "#fff", fontWeight: 700, fontSize: 13,
        }}>{playing ? "Pause" : "Play"}</button>
        <button onClick={generate} style={{
          padding: "8px 16px", borderRadius: 6, border: `1px solid ${t.border}`, cursor: "pointer",
          background: t.panelHeader, color: t.text, fontSize: 13,
        }}>New Storm</button>
        {timeseries && (
          <input type="range" min={0} max={timeseries.length - 1} value={currentStep}
            onChange={e => { stepRef.current = +e.target.value; setCurrentStep(+e.target.value); }}
            style={{ flex: 1, minWidth: 100 }} />
        )}
        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "monospace" }}>
          Step {currentStep}/99
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12 }}>
        <canvas ref={canvasRef} width={700} height={320} onClick={handleCanvasClick} style={{
          background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
          width: "100%", cursor: "pointer", display: "block",
        }} />
        <div style={{ fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: t.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Legend</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: t.text, fontWeight: 600, marginBottom: 4 }}>Node Depth</div>
            <div style={{ height: 12, borderRadius: 3, background: "linear-gradient(to right, rgb(50,200,50), rgb(255,100,50), rgb(255,0,50))" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: t.textMuted }}>
              <span>Low</span><span>High</span>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: t.text, fontWeight: 600, marginBottom: 4 }}>Pipe Flow</div>
            <div style={{ height: 12, borderRadius: 3, background: "linear-gradient(to right, rgb(50,80,255), rgb(255,80,50))" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: t.textMuted }}>
              <span>Low</span><span>Capacity</span>
            </div>
          </div>
          <div>
            <div style={{ color: t.text, fontWeight: 600, marginBottom: 4 }}>Flooding</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,0,0,0.5)" }} />
              <span style={{ color: t.textMuted }}>Pulsing halo</span>
            </div>
          </div>
          {selectedNode && timeseries && (
            <div style={{ marginTop: 16, padding: 8, borderRadius: 6, background: t.panelHeader, border: `1px solid ${t.border}` }}>
              <div style={{ fontWeight: 700, color: t.text }}>{selectedNode}</div>
              <div style={{ color: t.textMuted }}>
                Depth: {timeseries[currentStep].nodes.find(n => n.id === selectedNode)?.depth.toFixed(2)} ft
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
