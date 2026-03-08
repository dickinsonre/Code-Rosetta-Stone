import React, { useState, useRef } from 'react';

const ENGINES = [
  { id: 'epa', name: 'EPA SWMM5 (C)', route: '/api/run-swmm', color: '#61afef' },
  { id: 'go', name: 'Go', route: '/api/run-swmm-go', color: '#00ADD8' },
  { id: 'python', name: 'Python', route: '/api/run-swmm-python', color: '#3776ab' },
  { id: 'c', name: 'C', route: '/api/run-swmm-c', color: '#555555' },
  { id: 'cpp', name: 'C++', route: '/api/run-swmm-cpp', color: '#00599C' },
  { id: 'ts', name: 'TypeScript', route: '/api/run-swmm-ts', color: '#3178c6' },
  { id: 'rust', name: 'Rust Native', route: '/api/run-swmm-rust-native', color: '#dea584' },
  { id: 'perl', name: 'Perl', route: '/api/run-swmm-perl', color: '#39457E' },
  { id: 'ruby', name: 'Ruby', route: '/api/run-swmm-ruby', color: '#CC342D' },
  { id: 'java', name: 'Java', route: '/api/run-swmm-java', color: '#b07219' },
  { id: 'lua', name: 'Lua', route: '/api/run-swmm-lua', color: '#000080' },
];

const SAMPLE_MODELS = [
  { name: 'sample.inp (Default)', file: '/sample.inp' },
  { name: 'User1 — Steep Urban', file: '/user1.inp' },
  { name: 'User2 — Storage Network', file: '/user2.inp' },
  { name: 'User3 — Dual Drainage', file: '/user3.inp' },
  { name: 'User4 — Large Urban', file: '/user4.inp' },
  { name: 'User5 — Complex Drainage', file: '/user5.inp' },
];

function parseContinuityError(rpt) {
  if (!rpt) return null;
  const patterns = [
    /(?:Flow|Runoff|Routing)\s+(?:Quantity\s+)?Continuity.*?(?:Continuity Error|Error)\s*[(%:]*\s*([-\d.]+)\s*%?/gis,
    /Continuity\s+Error\s*\(?%?\)?\s*[.]*\s*([-\d.]+)/gi,
  ];
  let worst = null;
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(rpt)) !== null) {
      const val = parseFloat(m[1]);
      if (!isNaN(val) && (worst === null || Math.abs(val) > Math.abs(worst))) {
        worst = val;
      }
    }
  }
  return worst;
}

function parsePeakFlow(rpt) {
  if (!rpt) return null;
  const m = rpt.match(/(?:Peak|Maximum|Max)\s+(?:Runoff|Flow|Discharge)\s*[=:]\s*([-\d.]+)/i);
  if (m) return parseFloat(m[1]);
  const lines = rpt.split('\n');
  for (const line of lines) {
    if (/peak.*flow|max.*flow/i.test(line)) {
      const nums = line.match(/([-\d.]+)/g);
      if (nums && nums.length > 0) return parseFloat(nums[nums.length - 1]);
    }
  }
  return null;
}

export default function EngineBenchmark({ theme: t }) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [currentEngine, setCurrentEngine] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState('/sample.inp');
  const [customFile, setCustomFile] = useState(null);
  const fileRef = useRef(null);

  async function getInpBlob() {
    if (customFile) return customFile;
    const resp = await fetch(selectedModel);
    if (!resp.ok) throw new Error('Failed to load model file');
    const text = await resp.text();
    return new Blob([text], { type: 'text/plain' });
  }

  async function runAllEngines() {
    setRunning(true);
    setResults([]);
    setProgress(0);

    let inpBlob;
    try {
      inpBlob = await getInpBlob();
    } catch (err) {
      setRunning(false);
      setCurrentEngine(null);
      return;
    }
    const engineResults = [];

    for (let i = 0; i < ENGINES.length; i++) {
      const engine = ENGINES[i];
      setCurrentEngine(engine.name);
      setProgress(((i) / ENGINES.length) * 100);

      const formData = new FormData();
      formData.append('inpFile', inpBlob, 'model.inp');

      const start = performance.now();
      let result;
      try {
        const resp = await fetch(engine.route, { method: 'POST', body: formData });
        const elapsed = Math.round(performance.now() - start);
        const data = await resp.json();

        if (resp.ok && (data.success || data.rpt)) {
          const rpt = data.rpt || '';
          result = {
            engine: engine.name,
            id: engine.id,
            color: engine.color,
            time: elapsed,
            continuityError: parseContinuityError(rpt),
            peakFlow: parsePeakFlow(rpt),
            status: 'success',
            error: null,
          };
        } else {
          result = {
            engine: engine.name,
            id: engine.id,
            color: engine.color,
            time: elapsed,
            continuityError: null,
            peakFlow: null,
            status: 'error',
            error: data.error || 'Unknown error',
          };
        }
      } catch (err) {
        const elapsed = Math.round(performance.now() - start);
        result = {
          engine: engine.name,
          id: engine.id,
          color: engine.color,
          time: elapsed,
          continuityError: null,
          peakFlow: null,
          status: 'error',
          error: err.message,
        };
      }

      engineResults.push(result);
      setResults([...engineResults]);
    }

    setProgress(100);
    setCurrentEngine('');
    setRunning(false);
  }

  const sortedByTime = [...results].filter(r => r.status === 'success').sort((a, b) => a.time - b.time);
  const allResults = [...results].sort((a, b) => a.time - b.time);
  const maxTime = Math.max(...sortedByTime.map(r => r.time), 1);

  const successResults = results.filter(r => r.status === 'success' && r.peakFlow !== null);
  const matchingCount = successResults.length > 1
    ? successResults.filter(r => {
        const ref = successResults[0].peakFlow;
        return ref !== null && Math.abs(r.peakFlow - ref) / (Math.abs(ref) || 1) < 0.05;
      }).length
    : 0;

  const continuityResults = results.filter(r => r.status === 'success' && r.continuityError !== null);
  const maxCE = Math.max(...continuityResults.map(r => Math.abs(r.continuityError)), 0.1);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ color: t.text, margin: 0, fontSize: 24 }}>📊 Engine Benchmark Dashboard</h2>
      <p style={{ color: t.textDim, margin: '4px 0 20px', fontSize: 14 }}>
        Run the same .inp model through all available SWMM5 engine implementations and compare performance
      </p>

      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        padding: 16, background: t.panel || t.panelBg, border: `1px solid ${t.border}`,
        borderRadius: 8, marginBottom: 20,
      }}>
        <select
          value={selectedModel}
          onChange={e => { setSelectedModel(e.target.value); setCustomFile(null); }}
          disabled={running}
          style={{
            padding: '8px 12px', borderRadius: 6, border: `1px solid ${t.border}`,
            background: t.codeBg || t.panelBg, color: t.text, fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {SAMPLE_MODELS.map(m => (
            <option key={m.file} value={m.file}>{m.name}</option>
          ))}
        </select>

        <span style={{ color: t.textDim, fontSize: 13 }}>or</span>

        <input
          ref={fileRef}
          type="file"
          accept=".inp"
          onChange={e => { if (e.target.files[0]) setCustomFile(e.target.files[0]); }}
          disabled={running}
          style={{ fontSize: 13, color: t.text }}
        />

        <button
          onClick={runAllEngines}
          disabled={running}
          style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            background: running ? t.textDim : t.accent,
            color: '#fff', fontSize: 14, fontWeight: 600,
            cursor: running ? 'not-allowed' : 'pointer',
            marginLeft: 'auto',
          }}
        >
          {running ? '⏳ Running...' : '🚀 Run All Engines'}
        </button>
      </div>

      {running && (
        <div style={{
          padding: 16, background: t.panel || t.panelBg, border: `1px solid ${t.border}`,
          borderRadius: 8, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>
              Running: {currentEngine}
            </span>
            <span style={{ color: t.textDim, fontSize: 13 }}>
              {results.length}/{ENGINES.length} complete
            </span>
          </div>
          <div style={{
            height: 6, borderRadius: 3, background: t.borderLight || t.border,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3, background: t.accent,
              width: `${progress}%`, transition: 'width 0.3s',
            }} />
          </div>
        </div>
      )}

      {results.length > 0 && successResults.length > 1 && (
        <div style={{
          padding: 12, background: t.accent + '11', border: `1px solid ${t.accent}33`,
          borderRadius: 8, marginBottom: 20, textAlign: 'center',
        }}>
          <span style={{ color: t.accent, fontSize: 14, fontWeight: 600 }}>
            {matchingCount}/{successResults.length} engines produce matching results
            {matchingCount === successResults.length ? ' ✅' : ''}
          </span>
        </div>
      )}

      {allResults.length > 0 && (
        <div style={{
          background: t.panel || t.panelBg, border: `1px solid ${t.border}`,
          borderRadius: 8, overflow: 'hidden', marginBottom: 20,
        }}>
          <div style={{
            padding: '10px 16px', background: t.panelHeader,
            borderBottom: `1px solid ${t.border}`,
            fontWeight: 600, fontSize: 13, color: t.text,
          }}>
            Results — Sorted by Execution Time
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                {['#', 'Engine', 'Time (ms)', 'Continuity Error %', 'Peak Flow', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: 'left', color: t.textDim,
                    fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allResults.map((r, i) => (
                <tr key={r.id} style={{
                  borderBottom: `1px solid ${t.borderLight || t.border}`,
                  background: i === 0 && r.status === 'success' ? t.accent + '08' : 'transparent',
                }}>
                  <td style={{ padding: '8px 12px', color: t.textDim }}>{i + 1}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: r.color, flexShrink: 0,
                      }} />
                      <span style={{ color: t.text, fontWeight: 500 }}>{r.engine}</span>
                    </div>
                  </td>
                  <td style={{
                    padding: '8px 12px', color: t.text,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: i === 0 && r.status === 'success' ? 700 : 400,
                  }}>
                    {r.time}
                  </td>
                  <td style={{
                    padding: '8px 12px',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: r.continuityError !== null
                      ? Math.abs(r.continuityError) < 1 ? '#50a14f' : Math.abs(r.continuityError) < 5 ? '#c18401' : '#e45649'
                      : t.textDim,
                  }}>
                    {r.continuityError !== null ? r.continuityError.toFixed(3) + '%' : '—'}
                  </td>
                  <td style={{
                    padding: '8px 12px', color: t.text,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {r.peakFlow !== null ? r.peakFlow.toFixed(3) : '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {r.status === 'success' ? (
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: '#50a14f22', color: '#50a14f',
                      }}>✓ OK</span>
                    ) : (
                      <span title={r.error} style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: '#e4564922', color: '#e45649', cursor: 'help',
                      }}>✗ Error</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sortedByTime.length > 0 && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            flex: 1, minWidth: 300,
            background: t.panel || t.panelBg, border: `1px solid ${t.border}`,
            borderRadius: 8, overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px', background: t.panelHeader,
              borderBottom: `1px solid ${t.border}`,
              fontWeight: 600, fontSize: 13, color: t.text,
            }}>
              ⏱️ Execution Time (ms)
            </div>
            <div style={{ padding: 16 }}>
              {sortedByTime.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    width: 100, fontSize: 12, color: t.text, fontWeight: 500,
                    textAlign: 'right', flexShrink: 0,
                  }}>{r.engine}</span>
                  <div style={{
                    flex: 1, height: 18, borderRadius: 3,
                    background: t.borderLight || t.border, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: r.color,
                      width: `${Math.max((r.time / maxTime) * 100, 2)}%`,
                      transition: 'width 0.5s',
                    }} />
                  </div>
                  <span style={{
                    width: 60, fontSize: 11, color: t.textDim,
                    fontFamily: "'JetBrains Mono', monospace",
                    textAlign: 'right', flexShrink: 0,
                  }}>{r.time}ms</span>
                </div>
              ))}
            </div>
          </div>

          {continuityResults.length > 0 && (
            <div style={{
              flex: 1, minWidth: 300,
              background: t.panel || t.panelBg, border: `1px solid ${t.border}`,
              borderRadius: 8, overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 16px', background: t.panelHeader,
                borderBottom: `1px solid ${t.border}`,
                fontWeight: 600, fontSize: 13, color: t.text,
              }}>
                🎯 Continuity Error (%)
              </div>
              <div style={{ padding: 16 }}>
                {continuityResults.sort((a, b) => Math.abs(a.continuityError) - Math.abs(b.continuityError)).map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      width: 100, fontSize: 12, color: t.text, fontWeight: 500,
                      textAlign: 'right', flexShrink: 0,
                    }}>{r.engine}</span>
                    <div style={{
                      flex: 1, height: 18, borderRadius: 3,
                      background: t.borderLight || t.border, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: Math.abs(r.continuityError) < 1 ? '#50a14f' : Math.abs(r.continuityError) < 5 ? '#c18401' : '#e45649',
                        width: `${Math.max((Math.abs(r.continuityError) / maxCE) * 100, 2)}%`,
                        transition: 'width 0.5s',
                      }} />
                    </div>
                    <span style={{
                      width: 60, fontSize: 11, color: t.textDim,
                      fontFamily: "'JetBrains Mono', monospace",
                      textAlign: 'right', flexShrink: 0,
                    }}>{Math.abs(r.continuityError).toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {results.length === 0 && !running && (
        <div style={{
          padding: 48, textAlign: 'center', color: t.textDim,
          background: t.panel || t.panelBg, border: `1px solid ${t.border}`,
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>No benchmark results yet</div>
          <div style={{ fontSize: 13 }}>
            Select a model file and click "Run All Engines" to compare performance across all {ENGINES.length} engines
          </div>
        </div>
      )}
    </div>
  );
}
