import { useState, useRef, useCallback } from "react";

const EVENT_TYPES = {
  FLOODING: { color: "#e06c75", icon: "\u26A0", label: "Flooding" },
  SURCHARGE: { color: "#e5c07b", icon: "\u26A1", label: "Surcharge" },
  DRY: { color: "#56b6c2", icon: "\u2600", label: "Dry" },
  PUMP_ON: { color: "#98c379", icon: "\u25B6", label: "Pump On" },
  PUMP_OFF: { color: "#abb2bf", icon: "\u23F8", label: "Pump Off" },
  OVERFLOW: { color: "#c678dd", icon: "\u2B06", label: "Overflow" },
  BACKFLOW: { color: "#d19a66", icon: "\u21C4", label: "Backflow" },
  CONTROL: { color: "#61afef", icon: "\u2699", label: "Control Action" },
};

function generateSimEvents(duration, intensity) {
  const events = [];
  const nodes = ["J1", "J2", "J3", "J4", "S1", "Out"];
  const links = ["C1", "C2", "C3", "C4", "P1"];

  for (let step = 0; step < duration; step++) {
    const t = step / duration;
    const stormPhase = Math.pow(t, 2) * Math.exp(2 * (1 - t));

    nodes.forEach(node => {
      const depth = stormPhase * intensity * (3 + Math.random() * 4);
      const maxD = node === "S1" ? 12 : 6;

      if (depth > maxD * 0.95 && Math.random() < 0.3) {
        events.push({
          time: step * 30,
          type: "FLOODING",
          element: node,
          value: depth,
          detail: `Depth ${depth.toFixed(2)} ft exceeds max ${maxD} ft`,
        });
      }
      if (depth > maxD * 0.8 && depth <= maxD * 0.95 && Math.random() < 0.2) {
        events.push({
          time: step * 30,
          type: "SURCHARGE",
          element: node,
          value: depth,
          detail: `Surcharge depth: ${(depth - maxD * 0.7).toFixed(2)} ft above crown`,
        });
      }
    });

    if (stormPhase * intensity > 1.5 && Math.random() < 0.15) {
      const link = links[Math.floor(Math.random() * links.length)];
      events.push({
        time: step * 30,
        type: "BACKFLOW",
        element: link,
        value: -stormPhase * 2,
        detail: `Reverse flow: ${(stormPhase * 2).toFixed(2)} cfs (downstream surcharge)`,
      });
    }

    if (step > duration * 0.3 && step < duration * 0.7 && Math.random() < 0.1) {
      events.push({
        time: step * 30,
        type: "PUMP_ON",
        element: "P1",
        value: 1.0,
        detail: `Pump activated at ${(stormPhase * intensity * 5).toFixed(1)} cfs capacity`,
      });
    }

    if (step > duration * 0.6 && Math.random() < 0.05) {
      events.push({
        time: step * 30,
        type: "CONTROL",
        element: "Gate_1",
        value: 0.5 + Math.random() * 0.5,
        detail: `Gate setting adjusted to ${(50 + Math.random() * 50).toFixed(0)}% open`,
      });
    }

    if (stormPhase * intensity > 2.0 && Math.random() < 0.08) {
      events.push({
        time: step * 30,
        type: "OVERFLOW",
        element: nodes[Math.floor(Math.random() * 4)],
        value: stormPhase * intensity * 3,
        detail: `Surface overflow: ${(stormPhase * intensity * 3).toFixed(2)} cfs to surface`,
      });
    }
  }

  return events.sort((a, b) => a.time - b.time);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function EventLogger({ theme: t }) {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [intensity, setIntensity] = useState(1.0);
  const [running, setRunning] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);
  const runRef = useRef(false);

  const handleRun = () => {
    const allEvents = generateSimEvents(200, intensity);
    setEvents([]);
    setDisplayCount(0);
    setRunning(true);
    runRef.current = true;

    let idx = 0;
    const stream = () => {
      if (!runRef.current || idx >= allEvents.length) {
        setRunning(false);
        runRef.current = false;
        setDisplayCount(allEvents.length);
        setEvents(allEvents);
        return;
      }
      const batch = Math.min(idx + 3, allEvents.length);
      setEvents(allEvents.slice(0, batch));
      setDisplayCount(batch);
      idx = batch;
      setTimeout(stream, 80);
    };
    stream();
  };

  const handleStop = () => {
    runRef.current = false;
    setRunning(false);
  };

  const filtered = events.filter(e => {
    if (filter !== "ALL" && e.type !== filter) return false;
    if (searchTerm && !e.element.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !e.detail.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const typeCounts = {};
  events.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={running ? handleStop : handleRun} style={{
          padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
          background: running ? "#e45649" : "#50a14f", color: "#fff",
        }}>{running ? "Stop" : "Run Simulation"}</button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ color: t.textMuted, fontSize: 11 }}>Intensity:</label>
          <input type="range" min={0.5} max={3.0} step={0.1} value={intensity}
            onChange={e => setIntensity(+e.target.value)}
            style={{ width: 100, accentColor: "#61afef" }} />
          <span style={{ color: t.text, fontSize: 11, fontFamily: "monospace" }}>{intensity.toFixed(1)}x</span>
        </div>

        <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "monospace", marginLeft: "auto" }}>
          {displayCount} events captured
        </span>
      </div>

      {events.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("ALL")} style={{
            padding: "4px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer",
            background: filter === "ALL" ? "#61afef" : t.panelHeader,
            color: filter === "ALL" ? "#fff" : t.text,
            border: `1px solid ${filter === "ALL" ? "#61afef" : t.border}`,
          }}>All ({events.length})</button>
          {Object.entries(EVENT_TYPES).map(([key, val]) => {
            const count = typeCounts[key] || 0;
            if (count === 0) return null;
            return (
              <button key={key} onClick={() => setFilter(key)} style={{
                padding: "4px 10px", borderRadius: 4, fontSize: 10, cursor: "pointer",
                background: filter === key ? val.color : t.panelHeader,
                color: filter === key ? "#fff" : val.color,
                border: `1px solid ${filter === key ? val.color : t.border}`,
              }}>{val.icon} {val.label} ({count})</button>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <input type="text" placeholder="Search events..." value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: "100%", padding: "6px 10px", borderRadius: 4, fontSize: 11,
            background: t.panelBg, color: t.text, border: `1px solid ${t.border}`,
            marginBottom: 12, fontFamily: "monospace", boxSizing: "border-box",
          }} />
      )}

      <div style={{
        maxHeight: 400, overflowY: "auto", border: `1px solid ${t.border}`,
        borderRadius: 8, background: t.panelBg,
      }}>
        {filtered.length === 0 && !running ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 12 }}>
            {events.length === 0 ? "Click 'Run Simulation' to generate events" : "No events match the current filter"}
          </div>
        ) : (
          filtered.slice(-100).map((e, i) => {
            const et = EVENT_TYPES[e.type];
            return (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 12px",
                borderBottom: `1px solid ${t.border}22`, fontSize: 11, fontFamily: "monospace",
              }}>
                <span style={{ color: t.textMuted, whiteSpace: "nowrap", minWidth: 65 }}>{formatTime(e.time)}</span>
                <span style={{
                  padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700,
                  background: et.color + "22", color: et.color, whiteSpace: "nowrap", minWidth: 70, textAlign: "center",
                }}>{et.icon} {et.label}</span>
                <span style={{ color: "#61afef", fontWeight: 700, minWidth: 50 }}>{e.element}</span>
                <span style={{ color: t.text, flex: 1 }}>{e.detail}</span>
              </div>
            );
          })
        )}
      </div>

      {events.length > 0 && !running && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 12 }}>
          {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
            const et = EVENT_TYPES[type];
            return (
              <div key={type} style={{
                padding: "8px 10px", borderRadius: 6, background: t.panelHeader,
                border: `1px solid ${t.border}`, textAlign: "center",
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: et.color }}>{count}</div>
                <div style={{ fontSize: 9, color: t.textMuted }}>{et.icon} {et.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
