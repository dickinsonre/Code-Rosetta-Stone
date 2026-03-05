import React, { useState, useRef, useCallback } from 'react';

const SAMPLE_MODELS = [
  { name: "Simple 3-Node Network", file: "/sample.inp", desc: "2 subcatchments, 3 junctions, 1 outfall — 6-hour storm with dynamic wave routing" },
  { name: "Greenville (All Features)", file: "/Greenville_all_SWMM5_Features.inp", desc: "Full-featured Greenville model with LID usage, Green-Ampt infiltration, dynamic wave routing — 14,000+ lines" },
];

export default function SwmmEngineRunner({ theme: t }) {
  const [inpContent, setInpContent] = useState('');
  const [rptContent, setRptContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);

  const loadFile = useCallback((content, name) => {
    setInpContent(content);
    setFileName(name);
    setRptContent('');
    setError('');
    setStatus('');
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.inp')) {
      setError('Please select a .inp file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => loadFile(ev.target.result, file.name);
    reader.readAsText(file);
  }, [loadFile]);

  const loadSample = useCallback(async (sample) => {
    try {
      setStatus('Loading sample model...');
      const resp = await fetch(sample.file);
      const text = await resp.text();
      loadFile(text, sample.file.split('/').pop());
      setStatus('Sample loaded — click Run to simulate');
    } catch (err) {
      setError('Failed to load sample: ' + err.message);
    }
  }, [loadFile]);

  const runSimulation = useCallback(async () => {
    if (!inpContent.trim()) {
      setError('No .inp file loaded');
      return;
    }

    setRunning(true);
    setError('');
    setRptContent('');
    setStatus('Running SWMM5 simulation...');

    try {
      const blob = new Blob([inpContent], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('inpFile', blob, fileName || 'model.inp');

      const resp = await fetch('/api/run-swmm', {
        method: 'POST',
        body: formData,
      });

      const data = await resp.json();

      if (data.success && data.rpt) {
        setRptContent(data.rpt);
        setStatus('Simulation completed successfully');
      } else if (data.rpt) {
        setRptContent(data.rpt);
        setError(data.error || 'Simulation completed with warnings');
        setStatus('');
      } else {
        setError(data.error || 'Simulation failed');
        if (data.details) setError(prev => prev + '\n' + data.details);
        setStatus('');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      setStatus('');
    } finally {
      setRunning(false);
    }
  }, [inpContent, fileName]);

  const downloadRpt = useCallback(() => {
    if (!rptContent) return;
    const blob = new Blob([rptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName || 'model').replace(/\.inp$/i, '') + '.rpt';
    a.click();
    URL.revokeObjectURL(url);
  }, [rptContent, fileName]);

  return (
    <div style={{
      width: '100%', height: 'calc(100vh - 46px)',
      display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.text,
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        background: t.headerBg,
        borderBottom: `1px solid ${t.border}`,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{"\u2699\uFE0F"}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: t.textBright }}>SWMM5 Engine</span>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '6px 14px', borderRadius: 6,
            border: `1px solid ${t.border}`,
            background: t.panelBg, color: t.text,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {"\uD83D\uDCC2"} Upload .inp
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".inp"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        {SAMPLE_MODELS.map((s, i) => (
          <button
            key={i}
            onClick={() => loadSample(s)}
            title={s.desc}
            style={{
              padding: '6px 14px', borderRadius: 6,
              border: `1px solid ${t.accent}44`,
              background: t.accent + '15',
              color: t.accent, cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {"\uD83D\uDCCB"} {s.name}
          </button>
        ))}

        <button
          onClick={runSimulation}
          disabled={running || !inpContent.trim()}
          style={{
            padding: '6px 18px', borderRadius: 6, border: 'none',
            background: running || !inpContent.trim() ? t.textDim + '44' : '#2ea043',
            color: '#fff', cursor: running || !inpContent.trim() ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {running ? '\u23F3 Running...' : '\u25B6 Run SWMM5'}
        </button>

        {rptContent && (
          <button
            onClick={downloadRpt}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: t.accent, color: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {"\u2B07\uFE0F"} Download .rpt
          </button>
        )}

        {fileName && (
          <span style={{
            fontSize: 11, color: t.textDim, marginLeft: 'auto',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {fileName}
          </span>
        )}
      </div>

      {(status || error) && (
        <div style={{
          padding: '6px 16px', fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          background: error ? '#d1242f22' : t.accent + '15',
          color: error ? '#f85149' : t.accent,
          borderBottom: `1px solid ${t.border}`,
          whiteSpace: 'pre-wrap',
        }}>
          {error || status}
        </div>
      )}

      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden',
        flexDirection: window.innerWidth < 900 ? 'column' : 'row',
      }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          borderRight: window.innerWidth >= 900 ? `1px solid ${t.border}` : 'none',
          borderBottom: window.innerWidth < 900 ? `1px solid ${t.border}` : 'none',
        }}>
          <div style={{
            padding: '6px 12px', fontSize: 11, fontWeight: 700,
            color: t.textDim, background: t.headerBg,
            borderBottom: `1px solid ${t.border}`,
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>INPUT (.inp)</span>
            {inpContent && <span style={{ fontWeight: 400 }}>{inpContent.split('\n').length} lines</span>}
          </div>
          <textarea
            value={inpContent}
            onChange={(e) => setInpContent(e.target.value)}
            placeholder="Upload a .inp file or load a sample model to get started..."
            style={{
              flex: 1, width: '100%', resize: 'none',
              background: t.panelBg, color: t.text,
              border: 'none', outline: 'none',
              padding: '10px 14px', fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.6, tabSize: 4,
            }}
            spellCheck={false}
          />
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '6px 12px', fontSize: 11, fontWeight: 700,
            color: t.textDim, background: t.headerBg,
            borderBottom: `1px solid ${t.border}`,
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>REPORT (.rpt)</span>
            {rptContent && <span style={{ fontWeight: 400 }}>{rptContent.split('\n').length} lines</span>}
          </div>
          <pre style={{
            flex: 1, overflow: 'auto', margin: 0,
            background: t.panelBg, color: t.text,
            padding: '10px 14px', fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.6, whiteSpace: 'pre',
          }}>
            {rptContent || (
              <span style={{ color: t.textDim, fontStyle: 'italic' }}>
                {inpContent
                  ? 'Click "Run SWMM5" to simulate and view the report here...'
                  : 'Upload a .inp file or load a sample, then run the simulation...'}
              </span>
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
