import { useState, useRef, useEffect, useCallback } from "react";

const DEMO_NETWORK = {
  nodes: [
    { id: "J1", x: 100, y: 80, invert: 10.0, maxDepth: 6.0, depth: 0, inflow: 5.0, area: 200 },
    { id: "J2", x: 280, y: 140, invert: 8.0, maxDepth: 6.0, depth: 0, inflow: 2.0, area: 200 },
    { id: "J3", x: 460, y: 80, invert: 6.0, maxDepth: 8.0, depth: 0, inflow: 0.0, area: 300 },
    { id: "J4", x: 280, y: 260, invert: 5.0, maxDepth: 10.0, depth: 0, inflow: 3.0, area: 250 },
    { id: "Out", x: 560, y: 200, invert: 2.0, maxDepth: 15.0, depth: 0, inflow: 0.0, area: 500 },
  ],
  links: [
    { id: "C1", from: "J1", to: "J2", roughness: 0.013, diameter: 2.0, length: 200 },
    { id: "C2", from: "J2", to: "J3", roughness: 0.013, diameter: 2.5, length: 200 },
    { id: "C3", from: "J2", to: "J4", roughness: 0.015, diameter: 2.0, length: 150 },
    { id: "C4", from: "J3", to: "Out", roughness: 0.013, diameter: 3.0, length: 150 },
    { id: "C5", from: "J4", to: "Out", roughness: 0.013, diameter: 2.5, length: 200 },
  ],
};

function manningFlow(roughness, diameter, slope, depth) {
  if (depth <= 0 || slope <= 0) return 0;
  const y = Math.min(depth, diameter);
  const theta = 2 * Math.acos(1 - 2 * y / diameter);
  const area = (diameter * diameter / 4) * (theta - Math.sin(theta));
  const perim = diameter * theta / 2;
  if (perim <= 0) return 0;
  const rh = area / perim;
  return (1 / roughness) * area * Math.pow(rh, 2 / 3) * Math.sqrt(slope);
}

function simulateStep(nodes, links, dt) {
  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);
  const flows = links.map(lk => {
    const up = nodeMap[lk.from];
    const dn = nodeMap[lk.to];
    const slope = Math.max((up.invert + up.depth - dn.invert - dn.depth) / lk.length, 0.0001);
    return { ...lk, flow: manningFlow(lk.roughness, lk.diameter, slope, up.depth) };
  });
  const newNodes = nodes.map(n => {
    let netFlow = n.inflow;
    flows.forEach(f => {
      if (f.to === n.id) netFlow += f.flow;
      if (f.from === n.id) netFlow -= f.flow;
    });
    const newDepth = Math.max(0, n.depth + (netFlow * dt) / Math.max(n.area, 1));
    return { ...n, depth: Math.min(newDepth, n.maxDepth * 1.2) };
  });
  return { nodes: newNodes, links: flows };
}

export default function MicroEngine({ theme }) {
  const t = theme;
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState(DEMO_NETWORK.nodes);
  const [links, setLinks] = useState(DEMO_NETWORK.links.map(l => ({ ...l, flow: 0 })));
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState([]);
  const runRef = useRef(false);
  const nodesRef = useRef(nodes);
  const linksRef = useRef(links);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cNodes = nodesRef.current;
    const cLinks = linksRef.current;
    const nodeMap = {};
    cNodes.forEach(n => nodeMap[n.id] = n);

    cLinks.forEach(lk => {
      const from = nodeMap[lk.from], to = nodeMap[lk.to];
      const maxFlow = 20;
      const ratio = Math.min((lk.flow || 0) / maxFlow, 1);
      const r = Math.round(50 + ratio * 205);
      const b = Math.round(255 - ratio * 205);
      ctx.strokeStyle = `rgb(${r},80,${b})`;
      ctx.lineWidth = 2 + ratio * 5;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
      ctx.fillStyle = t.textMuted;
      ctx.font = "10px monospace";
      ctx.fillText(`${(lk.flow || 0).toFixed(1)} cfs`, mx - 20, my - 8);
    });

    cNodes.forEach(n => {
      const ratio = n.maxDepth > 0 ? Math.min(n.depth / n.maxDepth, 1) : 0;
      const radius = 14 + ratio * 10;
      const g = Math.round(200 - ratio * 150);
      const r2 = Math.round(50 + ratio * 205);
      ctx.fillStyle = `rgb(${r2},${g},50)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = t.border;
      ctx.lineWidth = 1;
      ctx.stroke();
      if (n.depth > n.maxDepth) {
        ctx.strokeStyle = "rgba(255,0,0,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(n.id, n.x, n.y + 4);
      ctx.fillStyle = t.textMuted;
      ctx.font = "10px monospace";
      ctx.fillText(`${n.depth.toFixed(2)} ft`, n.x, n.y + radius + 14);
    });
  }, [t]);

  useEffect(() => { draw(); }, [nodes, links, draw]);

  const runSim = useCallback(() => {
    if (!runRef.current) return;
    const dt = 1.0;
    const result = simulateStep(nodesRef.current, linksRef.current, dt);
    nodesRef.current = result.nodes;
    linksRef.current = result.links;
    setNodes(result.nodes);
    setLinks(result.links);
    setStep(s => s + 1);
    setHistory(h => [...h.slice(-200), { step: h.length, nodes: result.nodes.map(n => ({ id: n.id, depth: n.depth })) }]);
    draw();
    if (runRef.current) requestAnimationFrame(runSim);
  }, [draw]);

  const handleStart = () => {
    runRef.current = true;
    setRunning(true);
    requestAnimationFrame(runSim);
  };
  const handleStop = () => { runRef.current = false; setRunning(false); };
  const handleReset = () => {
    runRef.current = false;
    setRunning(false);
    setStep(0);
    setHistory([]);
    const resetNodes = DEMO_NETWORK.nodes.map(n => ({ ...n, depth: 0 }));
    const resetLinks = DEMO_NETWORK.links.map(l => ({ ...l, flow: 0 }));
    nodesRef.current = resetNodes;
    linksRef.current = resetLinks;
    setNodes(resetNodes);
    setLinks(resetLinks);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={running ? handleStop : handleStart} style={{
          padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
          background: running ? "#e45649" : "#50a14f", color: "#fff",
        }}>{running ? "Stop" : "Simulate"}</button>
        <button onClick={handleReset} style={{
          padding: "8px 20px", borderRadius: 6, border: `1px solid ${t.border}`, cursor: "pointer",
          background: t.panelHeader, color: t.text, fontSize: 13,
        }}>Reset</button>
        <button onClick={() => {
          const stormed = nodesRef.current.map(n => n.id !== "Out" ? { ...n, inflow: n.inflow + 10 } : n);
          nodesRef.current = stormed;
          setNodes(stormed);
          setTimeout(() => {
            const restored = nodesRef.current.map((n, i) => ({ ...n, inflow: DEMO_NETWORK.nodes[i].inflow }));
            nodesRef.current = restored;
            setNodes(restored);
          }, 5000);
        }} style={{
          padding: "8px 16px", borderRadius: 6, border: `1px solid ${t.border}`, cursor: "pointer",
          background: "#61afef22", color: "#61afef", fontSize: 13, fontWeight: 600,
        }}>Storm Pulse</button>
        <span style={{ fontSize: 12, color: t.textMuted, fontFamily: "monospace" }}>
          Step: {step} | dt=1.0s
        </span>
      </div>
      <canvas ref={canvasRef} width={660} height={340} style={{
        background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
        width: "100%", maxWidth: 660, display: "block",
      }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 12 }}>
        {nodes.map((n, idx) => (
          <div key={n.id} style={{
            padding: "8px 10px", borderRadius: 6, background: t.panelHeader,
            border: `1px solid ${n.depth > n.maxDepth * 0.9 ? "#e45649" : t.border}`, fontSize: 11, fontFamily: "monospace",
          }}>
            <div style={{ fontWeight: 700, color: t.text }}>{n.id}</div>
            <div style={{ color: n.depth > n.maxDepth * 0.8 ? "#e45649" : t.textMuted }}>Depth: {n.depth.toFixed(3)} ft</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: t.textMuted }}>Q:</span>
              <input type="number" step={1} min={0} max={50} value={n.inflow}
                onChange={e => {
                  const val = Math.max(0, +e.target.value);
                  const updated = nodes.map((nd, i) => i === idx ? { ...nd, inflow: val } : nd);
                  nodesRef.current = updated;
                  setNodes(updated);
                }}
                style={{
                  width: 45, padding: "2px 4px", fontSize: 11, borderRadius: 3,
                  border: `1px solid ${t.border}`, background: t.panelBg, color: t.text,
                  fontFamily: "monospace",
                }} />
              <span style={{ color: t.textMuted, fontSize: 9 }}>cfs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
