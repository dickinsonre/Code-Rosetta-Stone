import { useState } from "react";

const ENDPOINTS = [
  { method: "POST", path: "/models", desc: "Upload a .inp model file", body: '{\n  "name": "City_Combined",\n  "format": "inp",\n  "content": "[TITLE]\\nExample Model..."\n}',
    response: '{\n  "model_id": "mod_a1b2c3d4",\n  "name": "City_Combined",\n  "nodes": 47,\n  "links": 52,\n  "subcatchments": 23,\n  "created_at": "2025-03-04T10:30:00Z"\n}' },
  { method: "POST", path: "/simulate/{id}", desc: "Run simulation on uploaded model", body: '{\n  "model_id": "mod_a1b2c3d4",\n  "duration_hours": 24,\n  "report_step": 300,\n  "routing_step": 30\n}',
    response: '{\n  "job_id": "job_x7y8z9",\n  "model_id": "mod_a1b2c3d4",\n  "status": "running",\n  "estimated_time": "12s",\n  "created_at": "2025-03-04T10:31:00Z"\n}' },
  { method: "GET", path: "/results/{job_id}", desc: "Fetch simulation results", body: null,
    response: '{\n  "job_id": "job_x7y8z9",\n  "status": "complete",\n  "wall_time": "8.3s",\n  "results": {\n    "continuity_error": 0.042,\n    "peak_flows": {\n      "Conduit_1": 23.45,\n      "Conduit_2": 18.72,\n      "Conduit_Main": 42.10\n    },\n    "node_flooding": {\n      "Junction_7": {\n        "duration_min": 45,\n        "volume_MG": 0.023\n      }\n    },\n    "max_node_depths": {\n      "Junction_1": 4.2,\n      "Junction_7": 8.1,\n      "Storage_1": 6.8\n    }\n  }\n}' },
  { method: "POST", path: "/compare", desc: "Compare 2+ model results", body: '{\n  "job_ids": [\n    "job_x7y8z9",\n    "job_m4n5o6"\n  ],\n  "metrics": [\n    "peak_flows",\n    "flooding"\n  ]\n}',
    response: '{\n  "comparison": {\n    "peak_flows": {\n      "Conduit_Main": {\n        "job_x7y8z9": 42.10,\n        "job_m4n5o6": 38.55,\n        "diff_pct": -8.4\n      }\n    },\n    "flooding_summary": {\n      "job_x7y8z9": {\n        "nodes_flooded": 1,\n        "total_volume_MG": 0.023\n      },\n      "job_m4n5o6": {\n        "nodes_flooded": 0,\n        "total_volume_MG": 0.0\n      }\n    }\n  }\n}' },
  { method: "GET", path: "/health", desc: "Server health and stats", body: null,
    response: '{\n  "status": "healthy",\n  "version": "1.2.0",\n  "uptime": "3d 14h 22m",\n  "active_jobs": 3,\n  "completed_jobs": 1729,\n  "models_stored": 42,\n  "go_version": "1.22.1",\n  "goroutines": 47\n}' },
  { method: "WS", path: "/live/{job_id}", desc: "WebSocket: stream results during simulation", body: null,
    response: '// WebSocket stream messages:\n{"type":"progress","step":150,"total":2880,"pct":5.2}\n{"type":"node_update","id":"J7","depth":3.42}\n{"type":"link_update","id":"C1","flow":12.8}\n{"type":"flooding","node":"J7","volume":0.001}\n{"type":"complete","wall_time":"8.3s"}' },
];

const methodColors = { GET: "#50a14f", POST: "#61afef", WS: "#c678dd" };

export default function ApiServer({ theme }) {
  const t = theme;
  const [selected, setSelected] = useState(0);
  const [activeResp, setActiveResp] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    setLoading(true);
    setActiveResp(null);
    setTimeout(() => {
      setActiveResp(ENDPOINTS[selected].response);
      setLoading(false);
    }, 600 + Math.random() * 800);
  };

  const ep = ENDPOINTS[selected];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, minHeight: 400 }}>
        <div>
          <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Endpoints
          </div>
          {ENDPOINTS.map((ep, i) => (
            <button key={i} onClick={() => { setSelected(i); setActiveResp(null); }} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px",
              background: selected === i ? t.activeBg : "transparent",
              border: `1px solid ${selected === i ? t.activeBorder : "transparent"}`,
              borderRadius: 6, cursor: "pointer", marginBottom: 4, textAlign: "left",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: "monospace", padding: "2px 6px",
                borderRadius: 3, color: methodColors[ep.method] || t.text,
                background: `${methodColors[ep.method] || t.textMuted}22`,
                minWidth: 36, textAlign: "center",
              }}>{ep.method}</span>
              <div>
                <div style={{ fontSize: 12, color: t.text, fontFamily: "monospace" }}>{ep.path}</div>
                <div style={{ fontSize: 10, color: t.textMuted }}>{ep.desc}</div>
              </div>
            </button>
          ))}
          <div style={{
            marginTop: 16, padding: 12, borderRadius: 8, background: t.panelHeader,
            border: `1px solid ${t.border}`, fontSize: 11, fontFamily: "monospace", color: t.textMuted,
          }}>
            <div style={{ fontWeight: 700, color: t.text, marginBottom: 4 }}>Server Info</div>
            <div>Host: localhost:8080</div>
            <div>Binary: 12MB (Alpine)</div>
            <div>Goroutines: 47 active</div>
            <div>Concurrency: 100+ sims</div>
          </div>
        </div>
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, fontFamily: "monospace", padding: "4px 10px",
              borderRadius: 4, color: methodColors[ep.method], background: `${methodColors[ep.method]}22`,
            }}>{ep.method}</span>
            <span style={{ fontSize: 14, fontFamily: "monospace", color: t.text }}>
              http://localhost:8080{ep.path}
            </span>
            <button onClick={handleSend} disabled={loading} style={{
              marginLeft: "auto", padding: "6px 20px", borderRadius: 6, border: "none", cursor: "pointer",
              background: "#00ADD8", color: "#fff", fontWeight: 700, fontSize: 12,
              opacity: loading ? 0.6 : 1,
            }}>{loading ? "Sending..." : "Send"}</button>
          </div>
          {ep.body && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Request Body</div>
              <pre style={{
                background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 8,
                padding: 14, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                color: t.text, margin: 0, overflow: "auto", lineHeight: 1.5, maxHeight: 160,
              }}>{ep.body}</pre>
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
              Response {activeResp && <span style={{ color: "#50a14f" }}>200 OK</span>}
            </div>
            <pre style={{
              background: t.panelBg, border: `1px solid ${activeResp ? "#50a14f44" : t.border}`, borderRadius: 8,
              padding: 14, fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
              color: activeResp ? "#50a14f" : t.textMuted, margin: 0, overflow: "auto",
              lineHeight: 1.5, minHeight: 150, maxHeight: 300,
              transition: "border-color 0.3s",
            }}>{activeResp || (loading ? "Sending request..." : "Click Send to execute request")}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
