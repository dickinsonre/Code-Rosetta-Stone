import { useState } from "react";
import data from "../fullEngines.json";

// Full engines: complete translations of EPA SWMM 5.2.4, each judged byte for byte against EPA.
// The numbers come from src/fullEngines.json, exported from the stored gate runs
// (swmm5-fortran/tools/app/export_rosetta.py). Written with Claude (Anthropic); see the AI note below.

const fmt = (n) => (n == null ? "-" : Number(n).toLocaleString("en-US"));
const mono = "'JetBrains Mono', monospace";

function CopyLine({ text, t }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <code style={{ flex: 1, minWidth: 0, overflowX: "auto", whiteSpace: "pre", background: t.notesBg, border: `1px solid ${t.borderLight}`,
        borderRadius: 6, padding: "6px 8px", fontFamily: mono, fontSize: 12, color: t.textBright }}>{text}</code>
      <button onClick={() => { try { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); } catch (e) {} }}
        style={{ border: `1px solid ${t.border}`, background: t.panelHeader, color: t.text, borderRadius: 6, padding: "5px 9px",
          fontSize: 11, fontFamily: mono, cursor: "pointer" }}>{done ? "copied" : "copy"}</button>
    </div>
  );
}

export default function FullEngines({ theme: t }) {
  const [open, setOpen] = useState(null);
  const gated = data.engines.filter((e) => e.gate.status !== "reference");
  const allSame = gated.every((e) => e.gate.status === "identical");
  const card = { background: t.panelBg, border: `1px solid ${t.border}`, borderRadius: 12, padding: 18, marginBottom: 16 };
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, color: t.textMuted, fontWeight: 600, borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" };
  const td = { padding: "9px 10px", fontSize: 13, color: t.text, borderBottom: `1px solid ${t.borderLight}`, verticalAlign: "top" };

  return (
    <div style={{ height: "calc(100vh - 46px)", overflowY: "auto", background: t.bg, color: t.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 16px 60px" }}>
        <h1 style={{ fontSize: 22, color: t.textBright, margin: "4px 0 6px" }}>Full engines: all of EPA SWMM 5.2.4, byte for byte</h1>
        <p style={{ color: t.textDim, fontSize: 14, lineHeight: 1.6, maxWidth: 820, margin: "0 0 16px" }}>
          The language tabs and engine folders elsewhere in this app are teaching engines, a few hundred lines each.
          These are complete translations of EPA's {fmt(data.engines[0].lines)} lines of C. Each one ran the same {fmt(data.n_models)} models
          from the 1729-SWMM5-Models-2030 corpus and was judged against EPA 5.2.4 itself: the binary <code>.out</code> file byte for byte,
          and the <code>.rpt</code> report line for line except the three lines that print the wall clock.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
          {[["Gate models", fmt(data.n_models), "distinct corpus models"],
            ["Full engines gated", String(gated.length), allSame ? "identical to EPA on every model each ran" : "see the table"],
            [".out bytes compared", fmt(gated[0] && gated[0].gate.out_bytes), "per fully gated engine"],
            [".rpt lines compared", fmt(gated[0] && gated[0].gate.rpt_lines), "per engine, clock lines excluded"]].map(([k, v, n]) => (
            <div key={k} style={{ ...card, marginBottom: 0, padding: 14 }}>
              <div style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: 0.6 }}>{k}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: t.textBright, fontFamily: mono, margin: "4px 0" }}>{v}</div>
              <div style={{ fontSize: 12, color: t.textDim }}>{n}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead><tr>
                <th style={th}>Engine</th><th style={th}>How it was made</th><th style={{ ...th, textAlign: "right" }}>Lines</th>
                <th style={th}>Gate result</th><th style={{ ...th, textAlign: "right" }}>CPU vs EPA</th><th style={th}>Code</th>
              </tr></thead>
              <tbody>
                {data.engines.map((e) => {
                  const g = e.gate;
                  const res = g.status === "reference" ? "the reference"
                    : g.differ ? `${fmt(g.identical)} identical, ${fmt(g.differ)} differ`
                    : g.notrun ? `${fmt(g.identical)} of ${fmt(g.identical)} run identical (${fmt(g.notrun)} not run)`
                    : `${fmt(g.identical)} of ${fmt(g.identical)} identical`;
                  return [
                    <tr key={e.name} onClick={() => setOpen(open === e.name ? null : e.name)} style={{ cursor: "pointer" }}>
                      <td style={td}><div style={{ fontWeight: 700, color: t.textBright }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: mono }}>{e.language}</div></td>
                      <td style={{ ...td, color: t.textDim, maxWidth: 360 }}>{e.how}</td>
                      <td style={{ ...td, textAlign: "right", fontFamily: mono }}>{fmt(e.lines)}</td>
                      <td style={td}><span style={{ fontFamily: mono, fontSize: 12, padding: "2px 8px", borderRadius: 999,
                        background: g.status === "reference" ? t.accentAlt + "22" : g.differ ? "#e4564922" : "#50a14f22",
                        color: g.status === "reference" ? t.accentAlt : g.differ ? "#e45649" : "#6cc070" }}>{res}</span></td>
                      <td style={{ ...td, textAlign: "right", fontFamily: mono }}>{e.name === "EPA" ? "1.00x" : e.cpu ? e.cpu.toFixed(2) + "x" : "-"}</td>
                      <td style={td}><a href={e.repo} target="_blank" rel="noopener noreferrer" onClick={(ev) => ev.stopPropagation()}
                        style={{ color: t.accent, fontSize: 12, fontFamily: mono }}>{e.repo.replace("https://github.com/", "")}</a></td>
                    </tr>,
                    open === e.name && (
                      <tr key={e.name + "-x"}><td colSpan={6} style={{ ...td, background: t.notesBg }}>
                        <div style={{ fontSize: 12, color: t.textMuted }}>Build</div><CopyLine text={e.build} t={t} />
                        <div style={{ fontSize: 12, color: t.textMuted, marginTop: 8 }}>Run</div><CopyLine text={e.run} t={t} />
                        {e.cpu_range && <div style={{ fontSize: 12, color: t.textDim, marginTop: 8 }}>CPU time against EPA over {data.bench_models} benchmark models: {e.cpu_range[0].toFixed(2)}x to {e.cpu_range[1].toFixed(2)}x.</div>}
                      </td></tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: t.textDim, margin: "10px 0 0" }}>Click a row for its build and run commands. {data.python_note} CPU ratios are medians over {data.bench_models} short benchmark models;
            EPA against itself spans {data.noise ? data.noise[0].toFixed(2) + "x to " + data.noise[1].toFixed(2) + "x" : "-"}, so anything inside that band is a tie.
            {data.rust_noise && <> Rust was timed in a run of its own (EPA against itself there: {data.rust_noise[0].toFixed(2)}x to {data.rust_noise[1].toFixed(2)}x).</>}
            {data.tsj_noise && <> TypeScript and Java were timed together in another ({data.tsj_reps} repetitions; EPA against itself: {data.tsj_noise[0].toFixed(2)}x to {data.tsj_noise[1].toFixed(2)}x).</>}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <div style={card}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, color: t.textBright }}>How the test was proved able to fail</h3>
            <p style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6, margin: 0 }}>EPA run a second time matched itself on {data.controls.epa_rerun} control models.
              A Fortran build allowed to fuse multiplies and adds (one rounding step changed, nothing else) differed from EPA on {data.controls.fma} models,
              so the gate does catch a change in the last bit where a model is sensitive to it.</p>
          </div>
          {data.libm_note && <div style={card}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, color: t.textBright }}>The math library comes along</h3>
            <p style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6, margin: 0 }}>{data.libm_note}</p>
          </div>}
          <div style={card}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, color: t.textBright }}>What this does not show</h3>
            <p style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6, margin: 0 }}>Identical to EPA means EPA's answers, right or wrong; no observed data enter anywhere.
              It is one platform (x86-64 Linux, glibc 2.39); on Windows or macOS the math library differs. Paths no gate model reaches, such as routing interface files, are untested.
              The full write-up is the essay <em>{data.essay}</em>, in each repository's <code>docs/</code> folder.</p>
          </div>
          <div style={card}>
            <h3 style={{ margin: "0 0 8px", fontSize: 15, color: t.textBright }}>AI use</h3>
            <p style={{ fontSize: 13, color: t.textDim, lineHeight: 1.6, margin: 0 }}>The C++, Rust, Fortran, C#, Python, TypeScript and Java engines, the translator behind the last five,
              the translations of glibc's math routines that TypeScript and Java carry, the gate, and this tab were made with Claude (Anthropic) at Robert Dickinson's direction.
              The checks are mechanical (byte comparison against EPA 5.2.4, and the math routines against the system library);
              no person has yet reviewed the engines line by line. Data exported {data.built}.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
