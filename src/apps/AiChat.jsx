import { useState, useRef, useEffect } from "react";

export default function AiChat({ theme: t, embedded }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setStreamText("");

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Request failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              full += data.content;
              setStreamText(full);
            }
            if (data.error) throw new Error(data.error);
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: full }]);
      setStreamText("");
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
      setStreamText("");
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const renderMarkdown = (text) => {
    const parts = [];
    let i = 0;
    const lines = text.split("\n");
    let inCode = false;
    let codeLang = "";
    let codeLines = [];

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (line.startsWith("```")) {
        if (!inCode) {
          inCode = true;
          codeLang = line.slice(3).trim();
          codeLines = [];
        } else {
          parts.push(
            <pre key={i++} style={{
              background: t.bg, border: `1px solid ${t.border}`, borderRadius: 6,
              padding: "10px 14px", margin: "8px 0", overflowX: "auto",
              fontSize: 12, lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace",
              color: t.text,
            }}>
              {codeLang && <div style={{ color: t.textDim, fontSize: 10, marginBottom: 4 }}>{codeLang}</div>}
              <code>{codeLines.join("\n")}</code>
            </pre>
          );
          inCode = false;
          codeLang = "";
          codeLines = [];
        }
        continue;
      }
      if (inCode) {
        codeLines.push(line);
        continue;
      }

      const formatInline = (str) => {
        const result = [];
        let last = 0;
        const rx = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
        let m;
        while ((m = rx.exec(str)) !== null) {
          if (m.index > last) result.push(str.slice(last, m.index));
          if (m[1]) result.push(<code key={i++} style={{ background: t.bg, padding: "1px 5px", borderRadius: 3, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: t.accent }}>{m[1]}</code>);
          else if (m[2]) result.push(<strong key={i++}>{m[2]}</strong>);
          else if (m[3]) result.push(<em key={i++}>{m[3]}</em>);
          last = m.index + m[0].length;
        }
        if (last < str.length) result.push(str.slice(last));
        return result;
      };

      if (line.startsWith("### ")) {
        parts.push(<h4 key={i++} style={{ margin: "10px 0 4px", fontSize: 14, color: t.text }}>{formatInline(line.slice(4))}</h4>);
      } else if (line.startsWith("## ")) {
        parts.push(<h3 key={i++} style={{ margin: "12px 0 4px", fontSize: 15, color: t.text }}>{formatInline(line.slice(3))}</h3>);
      } else if (line.startsWith("# ")) {
        parts.push(<h2 key={i++} style={{ margin: "14px 0 6px", fontSize: 16, color: t.text }}>{formatInline(line.slice(2))}</h2>);
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        parts.push(<div key={i++} style={{ paddingLeft: 16, margin: "2px 0" }}><span style={{ color: t.accent }}>{"  \u2022 "}</span>{formatInline(line.slice(2))}</div>);
      } else if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s/)[1];
        parts.push(<div key={i++} style={{ paddingLeft: 16, margin: "2px 0" }}><span style={{ color: t.accent }}>{num}. </span>{formatInline(line.replace(/^\d+\.\s/, ""))}</div>);
      } else if (line.trim() === "") {
        parts.push(<div key={i++} style={{ height: 6 }} />);
      } else {
        parts.push(<div key={i++} style={{ margin: "2px 0" }}>{formatInline(line)}</div>);
      }
    }
    if (inCode && codeLines.length > 0) {
      parts.push(
        <pre key={i++} style={{
          background: t.bg, border: `1px solid ${t.border}`, borderRadius: 6,
          padding: "10px 14px", margin: "8px 0", overflowX: "auto",
          fontSize: 12, lineHeight: 1.5, fontFamily: "'JetBrains Mono', monospace", color: t.text,
        }}>
          {codeLang && <div style={{ color: t.textDim, fontSize: 10, marginBottom: 4 }}>{codeLang}</div>}
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
    }
    return parts;
  };

  const suggestions = [
    "How does Horton infiltration work across the engine implementations?",
    "Compare Manning's equation in C vs Rust vs Python",
    "What is the Global Gradient Algorithm in EPANET?",
    "How does dynamic wave routing differ from kinematic wave?",
    "Explain the SWMM5 INP file format",
    "Show me how the Rust WASM engine parses cross-sections",
  ];

  return (
    <div style={{
      width: "100%", height: embedded ? "100%" : "calc(100vh - 46px)", display: "flex", flexDirection: "column",
      background: t.bg,
    }}>
      <div style={{
        flex: 1, overflowY: "auto", padding: embedded ? "12px 14px" : "16px 24px",
        display: "flex", flexDirection: "column", gap: embedded ? 8 : 12,
      }}>
        {messages.length === 0 && !loading && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: 36, opacity: 0.3 }}>{"\uD83E\uDD16"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.text, fontFamily: "'JetBrains Mono', monospace" }}>
              SWMM5 / EPANET AI Assistant
            </div>
            <div style={{ fontSize: 13, color: t.textDim, textAlign: "center", maxWidth: 500, lineHeight: 1.5 }}>
              Powered by Claude. Ask about any algorithm, engine implementation, or water modeling concept.
              I have access to all {">"}25 engine source files in this project.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 600, justifyContent: "center", marginTop: 8 }}>
              {suggestions.map((s, idx) => (
                <button key={idx} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  style={{
                    padding: "6px 12px", borderRadius: 16, border: `1px solid ${t.border}`,
                    background: t.panelBg, color: t.textDim, fontSize: 11, cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = t.accent; e.target.style.color = t.accent; }}
                  onMouseLeave={e => { e.target.style.borderColor = t.border; e.target.style.color = t.textDim; }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "100%",
          }}>
            <div style={{
              maxWidth: msg.role === "user" ? "70%" : "85%",
              padding: "10px 14px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? t.accent : t.panelBg,
              color: msg.role === "user" ? "#fff" : t.text,
              fontSize: 13, lineHeight: 1.6,
              border: msg.role === "user" ? "none" : `1px solid ${t.border}`,
              fontFamily: msg.role === "user" ? "inherit" : "'JetBrains Mono', monospace",
            }}>
              {msg.role === "user" ? msg.content : renderMarkdown(msg.content)}
            </div>
          </div>
        ))}

        {loading && streamText && (
          <div style={{ display: "flex", justifyContent: "flex-start", maxWidth: "100%" }}>
            <div style={{
              maxWidth: "85%", padding: "10px 14px",
              borderRadius: "16px 16px 16px 4px",
              background: t.panelBg, color: t.text,
              fontSize: 13, lineHeight: 1.6,
              border: `1px solid ${t.border}`,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {renderMarkdown(streamText)}
              <span style={{ display: "inline-block", width: 6, height: 14, background: t.accent, animation: "blink 1s infinite", marginLeft: 2, verticalAlign: "text-bottom" }} />
            </div>
          </div>
        )}

        {loading && !streamText && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "10px 14px", borderRadius: "16px 16px 16px 4px",
              background: t.panelBg, border: `1px solid ${t.border}`,
              color: t.textDim, fontSize: 13,
            }}>
              <span style={{ animation: "pulse 1.5s infinite" }}>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div style={{
        padding: embedded ? "8px 14px" : "12px 24px", borderTop: `1px solid ${t.border}`,
        background: t.panelBg, display: "flex", gap: 8, alignItems: "flex-end",
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask about SWMM5/EPANET code, algorithms, or implementations..."
          rows={1}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 12,
            border: `1px solid ${t.border}`, background: t.bg, color: t.text,
            fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
            resize: "none", outline: "none", minHeight: 40, maxHeight: 120,
            lineHeight: 1.4,
          }}
          onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: loading || !input.trim() ? t.border : t.accent,
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "'JetBrains Mono', monospace", height: 40,
            opacity: loading || !input.trim() ? 0.5 : 1,
            transition: "all 0.2s",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setStreamText(""); }}
            style={{
              padding: "10px 14px", borderRadius: 12, border: `1px solid ${t.border}`,
              background: "transparent", color: t.textDim, fontSize: 13, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", height: 40,
            }}
            title="Clear chat"
          >Clear</button>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
