import { useState, useRef, useEffect, useCallback } from "react";

const SHAPES = {
  circular: { label: "Circular Pipe", params: ["diameter"] },
  rectangular: { label: "Rectangular", params: ["width", "height"] },
  trapezoidal: { label: "Trapezoidal", params: ["bottom", "height", "sideSlope"] },
  triangular: { label: "Triangular", params: ["sideSlope", "height"] },
};

function calcCircular(d, y) {
  if (y <= 0) return { area: 0, perimeter: 0, topWidth: 0, hydRadius: 0, theta: 0 };
  y = Math.min(y, d);
  const theta = 2 * Math.acos(1 - 2 * y / d);
  const area = (d * d / 8) * (theta - Math.sin(theta));
  const perimeter = d * theta / 2;
  const topWidth = d * Math.sin(theta / 2);
  const hydRadius = area / perimeter;
  return { area, perimeter, topWidth, hydRadius, theta };
}

function calcRectangular(w, h, y) {
  y = Math.max(0, Math.min(y, h));
  const area = w * y;
  const perimeter = w + 2 * y;
  const topWidth = w;
  const hydRadius = perimeter > 0 ? area / perimeter : 0;
  return { area, perimeter, topWidth, hydRadius, theta: 0 };
}

function calcTrapezoidal(b, h, z, y) {
  y = Math.max(0, Math.min(y, h));
  const area = y * (b + z * y);
  const perimeter = b + 2 * y * Math.sqrt(1 + z * z);
  const topWidth = b + 2 * z * y;
  const hydRadius = perimeter > 0 ? area / perimeter : 0;
  return { area, perimeter, topWidth, hydRadius, theta: 0 };
}

function calcTriangular(z, h, y) {
  y = Math.max(0, Math.min(y, h));
  const area = z * y * y;
  const perimeter = 2 * y * Math.sqrt(1 + z * z);
  const topWidth = 2 * z * y;
  const hydRadius = perimeter > 0 ? area / perimeter : 0;
  return { area, perimeter, topWidth, hydRadius, theta: 0 };
}

function getProps(shape, params, y) {
  if (shape === "circular") return calcCircular(params.diameter || 2, y);
  if (shape === "rectangular") return calcRectangular(params.width || 3, params.height || 2, y);
  if (shape === "trapezoidal") return calcTrapezoidal(params.bottom || 3, params.height || 2, params.sideSlope || 1.5, y);
  if (shape === "triangular") return calcTriangular(params.sideSlope || 1.5, params.height || 2, y);
  return { area: 0, perimeter: 0, topWidth: 0, hydRadius: 0, theta: 0 };
}

export default function CrossSectionCalc({ theme: t }) {
  const canvasRef = useRef(null);
  const [shape, setShape] = useState("circular");
  const [depth, setDepth] = useState(0.8);
  const [params, setParams] = useState({ diameter: 2, width: 3, height: 2, bottom: 3, sideSlope: 1.5 });

  const maxDepth = shape === "circular" ? params.diameter : params.height || 2;
  const props = getProps(shape, params, depth);

  const drawSection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W * 0.35, H * 0.35) / (maxDepth || 1);

    ctx.strokeStyle = t.text;
    ctx.lineWidth = 2;

    if (shape === "circular") {
      const r = (params.diameter / 2) * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      if (depth > 0) {
        const yPix = cy + r - depth * scale;
        const halfW = Math.sqrt(Math.max(0, r * r - (yPix - cy) * (yPix - cy)));
        ctx.fillStyle = "#61afef44";
        ctx.beginPath();
        ctx.moveTo(cx - halfW, yPix);
        for (let px = cx - halfW; px <= cx + halfW; px += 1) {
          const dy = Math.sqrt(Math.max(0, r * r - (px - cx) * (px - cx)));
          ctx.lineTo(px, cy + dy);
        }
        ctx.lineTo(cx + halfW, yPix);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#61afef";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - halfW, yPix);
        ctx.lineTo(cx + halfW, yPix);
        ctx.stroke();
      }
    } else if (shape === "rectangular") {
      const w2 = (params.width / 2) * scale;
      const h = (params.height) * scale;
      const top = cy - h / 2;
      ctx.strokeStyle = t.text;
      ctx.strokeRect(cx - w2, top, w2 * 2, h);
      if (depth > 0) {
        const waterH = depth * scale;
        ctx.fillStyle = "#61afef44";
        ctx.fillRect(cx - w2, top + h - waterH, w2 * 2, waterH);
        ctx.strokeStyle = "#61afef";
        ctx.beginPath();
        ctx.moveTo(cx - w2, top + h - waterH);
        ctx.lineTo(cx + w2, top + h - waterH);
        ctx.stroke();
      }
    } else if (shape === "trapezoidal") {
      const b2 = (params.bottom / 2) * scale;
      const h = (params.height) * scale;
      const topW = b2 + (params.sideSlope * params.height) * scale;
      const top = cy - h / 2;
      ctx.strokeStyle = t.text;
      ctx.beginPath();
      ctx.moveTo(cx - topW, top);
      ctx.lineTo(cx - b2, top + h);
      ctx.lineTo(cx + b2, top + h);
      ctx.lineTo(cx + topW, top);
      ctx.closePath();
      ctx.stroke();
      if (depth > 0) {
        const wd = depth * scale;
        const bwd = b2 + (params.sideSlope * (params.height - depth)) * scale;
        const wwd = b2 + (params.sideSlope * params.height) * scale;
        const yTop = top + h - wd;
        const halfTopW = b2 + params.sideSlope * depth * scale;
        ctx.fillStyle = "#61afef44";
        ctx.beginPath();
        ctx.moveTo(cx - halfTopW, yTop);
        ctx.lineTo(cx - b2, top + h);
        ctx.lineTo(cx + b2, top + h);
        ctx.lineTo(cx + halfTopW, yTop);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#61afef";
        ctx.beginPath();
        ctx.moveTo(cx - halfTopW, yTop);
        ctx.lineTo(cx + halfTopW, yTop);
        ctx.stroke();
      }
    } else if (shape === "triangular") {
      const h = (params.height) * scale;
      const topW = (params.sideSlope * params.height) * scale;
      const top = cy - h / 2;
      ctx.strokeStyle = t.text;
      ctx.beginPath();
      ctx.moveTo(cx - topW, top);
      ctx.lineTo(cx, top + h);
      ctx.lineTo(cx + topW, top);
      ctx.closePath();
      ctx.stroke();
      if (depth > 0) {
        const wd = depth * scale;
        const halfW = (params.sideSlope * depth) * scale;
        const yTop = top + h - wd;
        ctx.fillStyle = "#61afef44";
        ctx.beginPath();
        ctx.moveTo(cx - halfW, yTop);
        ctx.lineTo(cx, top + h);
        ctx.lineTo(cx + halfW, yTop);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#61afef";
        ctx.beginPath();
        ctx.moveTo(cx - halfW, yTop);
        ctx.lineTo(cx + halfW, yTop);
        ctx.stroke();
      }
    }

    ctx.fillStyle = t.textMuted;
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`y = ${depth.toFixed(2)} ft`, cx, H - 8);

  }, [shape, depth, params, t, maxDepth]);

  useEffect(() => { drawSection(); }, [drawSection]);

  const paramDefs = {
    diameter: { label: "Diameter (ft)", min: 0.5, max: 10, step: 0.25 },
    width: { label: "Width (ft)", min: 0.5, max: 10, step: 0.25 },
    height: { label: "Height (ft)", min: 0.5, max: 10, step: 0.25 },
    bottom: { label: "Bottom Width (ft)", min: 0.5, max: 10, step: 0.25 },
    sideSlope: { label: "Side Slope (H:V)", min: 0.5, max: 5, step: 0.25 },
  };

  const activeParams = SHAPES[shape].params;

  const depthCurve = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * maxDepth;
    const p = getProps(shape, params, y);
    depthCurve.push({ y, ...p });
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: "1 1 300px" }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: t.text, fontSize: 12, fontWeight: 600 }}>Shape</label>
            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
              {Object.entries(SHAPES).map(([k, v]) => (
                <button key={k} onClick={() => { setShape(k); setDepth(Math.min(depth, k === "circular" ? params.diameter : params.height)); }}
                  style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: shape === k ? "#61afef" : t.panelHeader, color: shape === k ? "#fff" : t.text,
                    border: `1px solid ${shape === k ? "#61afef" : t.border}`,
                  }}>{v.label}</button>
              ))}
            </div>
          </div>

          {activeParams.map(p => (
            <div key={p} style={{ marginBottom: 8 }}>
              <label style={{ color: t.textMuted, fontSize: 11 }}>{paramDefs[p].label}: {params[p]}</label>
              <input type="range" min={paramDefs[p].min} max={paramDefs[p].max} step={paramDefs[p].step}
                value={params[p]}
                onChange={e => {
                  const v = +e.target.value;
                  setParams(prev => ({ ...prev, [p]: v }));
                  if (p === "diameter" || p === "height") setDepth(d => Math.min(d, v));
                }}
                style={{ width: "100%", accentColor: "#61afef" }} />
            </div>
          ))}

          <div style={{ marginBottom: 8 }}>
            <label style={{ color: t.textMuted, fontSize: 11 }}>Water Depth: {depth.toFixed(2)} ft</label>
            <input type="range" min={0} max={maxDepth} step={0.01} value={depth}
              onChange={e => setDepth(+e.target.value)}
              style={{ width: "100%", accentColor: "#61afef" }} />
          </div>

          <canvas ref={canvasRef} width={360} height={240} style={{
            background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
            width: "100%", maxWidth: 360, display: "block",
          }} />
        </div>

        <div style={{ flex: "1 1 280px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>Hydraulic Properties</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Area", value: `${props.area.toFixed(4)} ft\u00B2`, color: "#61afef" },
              { label: "Wetted Perimeter", value: `${props.perimeter.toFixed(4)} ft`, color: "#e5c07b" },
              { label: "Top Width", value: `${props.topWidth.toFixed(4)} ft`, color: "#c678dd" },
              { label: "Hydraulic Radius", value: `${props.hydRadius.toFixed(4)} ft`, color: "#98c379" },
              { label: "A/A_full", value: `${(props.area / (getProps(shape, params, maxDepth).area || 1) * 100).toFixed(1)}%`, color: "#56b6c2" },
              ...(shape === "circular" ? [{ label: "\u03B8 (central angle)", value: `${(props.theta * 180 / Math.PI).toFixed(1)}\u00B0`, color: "#e06c75" }] : []),
            ].map((item, i) => (
              <div key={i} style={{
                padding: "10px 12px", borderRadius: 6, background: t.panelHeader,
                border: `1px solid ${t.border}`, fontFamily: "monospace", fontSize: 11,
              }}>
                <div style={{ color: item.color, fontWeight: 700, fontSize: 10, marginBottom: 4 }}>{item.label}</div>
                <div style={{ color: t.text }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 8 }}>
            Manning's Section Factor
          </div>
          <div style={{
            padding: "10px 14px", borderRadius: 6, background: t.panelHeader,
            border: `1px solid ${t.border}`, fontFamily: "monospace", fontSize: 12, color: "#e5c07b",
          }}>
            S = A \u00B7 R^(2/3) = {(props.area * Math.pow(props.hydRadius, 2/3)).toFixed(4)} ft^(8/3)
          </div>
        </div>
      </div>
    </div>
  );
}
