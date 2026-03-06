import React, { useState, useEffect, useRef, useCallback } from 'react';

const ENGINE_FILES = [
  {
    id: 'c',
    lang: 'C',
    icon: '\u2699\uFE0F',
    color: '#61afef',
    file: '/api/engine-source/c',
    path: 'swmm5-c/swmm5_engine.c',
    lines: 725,
    size: '30KB binary',
    desc: 'Standalone C engine. POSIX sockets, manual memory, raw HTTP parsing. Compiles to 30KB binary.',
  },
  {
    id: 'cpp',
    lang: 'C++',
    icon: '\uD83D\uDD37',
    color: '#f34b7d',
    file: '/api/engine-source/cpp',
    path: 'swmm5-cpp/swmm5_engine.cpp',
    lines: 626,
    size: '75KB binary',
    desc: 'C++17 OOP engine. Classes, STL containers, RAII. Compiles to 75KB binary.',
  },
  {
    id: 'rust',
    lang: 'Rust',
    icon: '\uD83E\uDD80',
    color: '#dea584',
    file: '/api/engine-source/rust',
    path: 'swmm5-rust-native/src/main.rs',
    lines: 521,
    size: '505KB binary',
    desc: 'Rust native engine. TcpListener HTTP, zero unsafe, ownership model. 505KB binary.',
  },
  {
    id: 'go',
    lang: 'Go',
    icon: '\uD83D\uDC39',
    color: '#00ADD8',
    file: '/api/engine-source/go',
    path: 'swmm5-go/main.go',
    lines: 1068,
    size: '8.6MB binary',
    desc: 'Go native engine. net/http stdlib, goroutine-ready, static binary. 8.6MB.',
  },
  {
    id: 'python',
    lang: 'Python',
    icon: '\uD83D\uDC0D',
    color: '#3776ab',
    file: '/api/engine-source/python',
    path: 'swmm5-py/swmm5_engine.py',
    lines: 823,
    size: 'Interpreted',
    desc: 'Pure Python engine. stdlib-only (http.server, json, math). Zero dependencies.',
  },
  {
    id: 'js',
    lang: 'JavaScript',
    icon: '\uD83C\uDF10',
    color: '#f7df1e',
    file: '/api/engine-source/js',
    path: 'src/engines/swmm5-js.js',
    lines: 847,
    size: 'Browser-native',
    desc: 'Browser-native JS engine. Runs entirely client-side. No server needed.',
  },
  {
    id: 'ts',
    lang: 'TypeScript',
    icon: '\uD83D\uDD35',
    color: '#3178c6',
    file: '/api/engine-source/ts',
    path: 'swmm5-ts/swmm5_engine.ts',
    lines: 510,
    size: 'Bun runtime',
    desc: 'TypeScript/Bun engine. Full type interfaces, Bun.serve() HTTP. Type-safe.',
  },
  {
    id: 'java',
    lang: 'Java',
    icon: '\u2615',
    color: '#ED8B00',
    file: '/api/engine-source/java',
    path: 'swmm5-java/SwmmEngine.java',
    lines: 414,
    size: 'JVM bytecode',
    desc: 'Java 19 engine. ServerSocket HTTP, GraalVM. Cross-platform JAR distribution.',
  },
  {
    id: 'ruby',
    lang: 'Ruby',
    icon: '\uD83D\uDC8E',
    color: '#CC342D',
    file: '/api/engine-source/ruby',
    path: 'swmm5-ruby/swmm5_engine.rb',
    lines: 419,
    size: 'Interpreted',
    desc: 'Ruby 3.2 engine. TCPServer HTTP, blocks and iterators, duck typing.',
  },
  {
    id: 'perl',
    lang: 'Perl',
    icon: '\uD83D\uDC2A',
    color: '#39457E',
    file: '/api/engine-source/perl',
    path: 'swmm5-perl/swmm5_engine.pl',
    lines: 454,
    size: 'Interpreted',
    desc: 'Perl 5.38 engine. IO::Socket::INET, regex parsing, hash-based data.',
  },
  {
    id: 'lua',
    lang: 'Lua',
    icon: '\uD83C\uDF19',
    color: '#000080',
    file: '/api/engine-source/lua',
    path: 'swmm5-lua/swmm5_engine.lua',
    lines: 386,
    size: '<15KB source',
    desc: 'Lua 5.2 CGI engine. stdin/stdout processing. Ultra-lightweight.',
  },
  {
    id: 'kotlin',
    lang: 'Kotlin',
    icon: '\uD83C\uDFAF',
    color: '#A97BFF',
    file: '/api/engine-source/kotlin',
    path: 'swmm5-kotlin/SwmmEngine.kt',
    lines: 346,
    size: 'JVM JAR',
    desc: 'Kotlin/JVM engine. ServerSocket HTTP, data classes, coroutine-ready.',
  },
  {
    id: 'scala',
    lang: 'Scala',
    icon: '\uD83D\uDD34',
    color: '#DC322F',
    file: '/api/engine-source/scala',
    path: 'swmm5-scala/SwmmEngine.scala',
    lines: 303,
    size: 'Interpreted',
    desc: 'Scala 3 engine. ServerSocket HTTP, case classes, functional style.',
  },
  {
    id: 'nim',
    lang: 'Nim',
    icon: '\uD83D\uDC51',
    color: '#FFE953',
    file: '/api/engine-source/nim',
    path: 'swmm5-nim/swmm5_engine.nim',
    lines: 400,
    size: '266KB binary',
    desc: 'Nim engine. Socket HTTP, Python-like syntax, C-speed binary.',
  },
  {
    id: 'zig',
    lang: 'Zig',
    icon: '\u26A1',
    color: '#F7A41D',
    file: '/api/engine-source/zig',
    path: 'swmm5-zig/swmm5_engine.zig',
    lines: 605,
    size: '3.7MB binary',
    desc: 'Zig engine. std.net TCP, comptime safety, zero hidden allocations.',
  },
  {
    id: 'dart',
    lang: 'Dart',
    icon: '\uD83C\uDFAF',
    color: '#00B4AB',
    file: '/api/engine-source/dart',
    path: 'swmm5-dart/swmm5_engine.dart',
    lines: 322,
    size: '6.8MB binary',
    desc: 'Dart engine. HttpServer, async/await, AOT compiled native binary.',
  },
  {
    id: 'tcl',
    lang: 'Tcl',
    icon: '\uD83D\uDD2E',
    color: '#EF5B25',
    file: '/api/engine-source/tcl',
    path: 'swmm5-tcl/swmm5_engine.tcl',
    lines: 413,
    size: 'Interpreted',
    desc: 'Tcl 8.6 engine. Socket server, everything-is-a-string, fileevent I/O.',
  },
  {
    id: 'racket',
    lang: 'Racket',
    icon: '\uD83C\uDFA8',
    color: '#9f1d20',
    file: '/api/engine-source/racket',
    path: 'swmm5-racket/swmm5_engine.rkt',
    lines: 349,
    size: 'Interpreted',
    desc: 'Racket/Scheme engine. tcp-listen, S-expressions, functional paradigm.',
  },
  {
    id: 'elixir',
    lang: 'Elixir',
    icon: '\uD83D\uDCA7',
    color: '#6e4a7e',
    file: '/api/engine-source/elixir',
    path: 'swmm5-elixir/swmm5_engine.exs',
    lines: 389,
    size: 'Interpreted',
    desc: 'Elixir engine. :gen_tcp, pattern matching, functional BEAM VM.',
  },
  {
    id: 'fortran',
    lang: 'Fortran',
    icon: '\uD83D\uDD2C',
    color: '#734f96',
    file: '/api/engine-source/fortran',
    path: 'swmm5-fortran/swmm5_engine.f90',
    lines: 508,
    size: 'CGI binary',
    desc: 'Fortran 2008 CGI engine. stdin/stdout, array operations, scientific computing.',
  },
  {
    id: 'r',
    lang: 'R',
    icon: '\uD83D\uDCCA',
    color: '#276DC3',
    file: '/api/engine-source/r',
    path: 'swmm5-r/swmm5_engine.R',
    lines: 299,
    size: 'Interpreted',
    desc: 'R 4.x CGI engine. stdin/stdout, vectorized operations, statistical computing.',
  },
  {
    id: 'ocaml',
    lang: 'OCaml',
    icon: '\uD83D\uDC2B',
    color: '#EC6813',
    file: '/api/engine-source/ocaml',
    path: 'swmm5-ocaml/swmm5_engine.ml',
    lines: 409,
    size: 'CGI binary',
    desc: 'OCaml CGI engine. stdin/stdout, pattern matching, algebraic data types.',
  },
  {
    id: 'haskell',
    lang: 'Haskell',
    icon: '\u03BB',
    color: '#5D4F85',
    file: '/api/engine-source/haskell',
    path: 'swmm5-haskell/swmm5_engine.hs',
    lines: 330,
    size: 'CGI binary',
    desc: 'Haskell CGI engine. stdin/stdout, pure functional, monadic I/O.',
  },
  {
    id: 'pascal',
    lang: 'Free Pascal',
    icon: '\uD83C\uDFF0',
    color: '#E3F171',
    file: '/api/engine-source/pascal',
    path: 'swmm5-pascal/swmm5_engine.pas',
    lines: 433,
    size: 'CGI binary',
    desc: 'Free Pascal CGI engine. stdin/stdout, Delphi-compatible, structured programming.',
  },
  {
    id: 'lisp',
    lang: 'Common Lisp',
    icon: '\uD83C\uDF00',
    color: '#f5f5f5',
    file: '/api/engine-source/lisp',
    path: 'swmm5-lisp/swmm5_engine.lisp',
    lines: 309,
    size: 'Interpreted',
    desc: 'Common Lisp CGI engine. SBCL runtime, macros, S-expression processing.',
  },
  {
    id: 'ada',
    lang: 'Ada',
    icon: '\uD83D\uDEE1\uFE0F',
    color: '#02f88c',
    file: '/api/engine-source/ada',
    path: 'swmm5-ada/swmm5_engine.adb',
    lines: 285,
    size: 'CGI binary',
    desc: 'Ada 2012 CGI engine. stdin/stdout, strong typing, safety-critical design.',
  },
];

export default function SwmmCodeViewer({ theme }) {
  const t = theme;
  const [selectedLang, setSelectedLang] = useState('c');
  const [sourceCode, setSourceCode] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const codeRef = useRef(null);

  const activeLang = ENGINE_FILES.find(e => e.id === selectedLang) || ENGINE_FILES[0];

  const loadSource = useCallback(async (langId) => {
    if (sourceCode[langId]) return;
    setLoading(true);
    try {
      const eng = ENGINE_FILES.find(e => e.id === langId);
      if (!eng) return;
      const resp = await fetch(eng.file);
      if (resp.ok) {
        const text = await resp.text();
        setSourceCode(prev => ({ ...prev, [langId]: text }));
      }
    } catch (e) {
      console.error('Failed to load source:', e);
    } finally {
      setLoading(false);
    }
  }, [sourceCode]);

  useEffect(() => {
    loadSource(selectedLang);
  }, [selectedLang, loadSource]);

  const code = sourceCode[selectedLang] || '';
  const lines = code.split('\n');

  const matchingLines = searchTerm
    ? lines.reduce((acc, line, i) => {
        if (line.toLowerCase().includes(searchTerm.toLowerCase())) acc.push(i);
        return acc;
      }, [])
    : [];

  const copyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
    } else {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  };

  const totalLines = ENGINE_FILES.reduce((sum, e) => sum + e.lines, 0);

  return (
    <div style={{
      width: '100%', height: 'calc(100vh - 46px)',
      display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.text,
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px',
        background: t.headerBg,
        borderBottom: `1px solid ${t.border}`,
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: t.accent,
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
        }}>
          SWMM5 Source Code
        </span>
        <span style={{
          fontSize: 10, color: t.textDim,
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
        }}>
          {ENGINE_FILES.length} languages {"\u2022"} {totalLines.toLocaleString()} lines
        </span>
        <div style={{ width: 1, height: 20, background: t.border }} />
        {ENGINE_FILES.map(eng => (
          <button
            key={eng.id}
            onClick={() => setSelectedLang(eng.id)}
            title={eng.desc}
            style={{
              padding: '4px 10px', borderRadius: 5,
              border: selectedLang === eng.id ? `2px solid ${eng.color}` : `1px solid ${t.border}`,
              background: selectedLang === eng.id ? eng.color + '20' : 'transparent',
              color: selectedLang === eng.id ? eng.color : t.textDim,
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 13 }}>{eng.icon}</span>
            {eng.lang}
          </button>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px',
        background: t.panelHeader,
        borderBottom: `1px solid ${t.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>{activeLang.icon}</span>
        <span style={{
          fontWeight: 700, fontSize: 14, color: activeLang.color,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {activeLang.lang} SWMM5 Engine
        </span>
        <span style={{
          fontSize: 10, color: t.textDim,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {activeLang.path}
        </span>
        <span style={{
          fontSize: 10, background: activeLang.color + '20',
          color: activeLang.color, padding: '2px 8px',
          borderRadius: 4, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {activeLang.lines} lines
        </span>
        <span style={{
          fontSize: 10, background: t.accent + '20',
          color: t.accent, padding: '2px 8px',
          borderRadius: 4, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {activeLang.size}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search code..."
            style={{
              padding: '4px 10px', borderRadius: 5,
              border: `1px solid ${t.border}`,
              background: t.bg, color: t.text,
              fontSize: 11, width: 180,
              fontFamily: "'JetBrains Mono', monospace",
              outline: 'none',
            }}
          />
          {searchTerm && matchingLines.length > 0 && (
            <span style={{
              fontSize: 10, color: t.accent,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {matchingLines.length} matches
            </span>
          )}
          <button
            onClick={copyCode}
            disabled={!code}
            style={{
              padding: '4px 10px', borderRadius: 5,
              border: `1px solid ${t.border}`,
              background: t.panelBg, color: t.text,
              cursor: code ? 'pointer' : 'not-allowed',
              fontSize: 11, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {"\uD83D\uDCCB"} Copy All
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', flex: 1, overflow: 'hidden',
      }}>
        <div style={{
          width: 240, flexShrink: 0,
          borderRight: `1px solid ${t.border}`,
          overflowY: 'auto',
          background: t.panelBg,
          padding: '8px 0',
        }}>
          <div style={{
            padding: '4px 12px 8px',
            fontSize: 10, fontWeight: 700, color: t.textDim,
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            All Engines ({ENGINE_FILES.length})
          </div>
          {ENGINE_FILES.map(eng => (
            <button
              key={eng.id}
              onClick={() => setSelectedLang(eng.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                width: '100%', padding: '8px 12px',
                border: 'none',
                background: selectedLang === eng.id ? eng.color + '15' : 'transparent',
                borderLeft: selectedLang === eng.id ? `3px solid ${eng.color}` : '3px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{eng.icon}</span>
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: selectedLang === eng.id ? eng.color : t.textBright,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {eng.lang}
                </div>
                <div style={{
                  fontSize: 10, color: t.textDim, marginTop: 2,
                  lineHeight: 1.4,
                }}>
                  {eng.desc}
                </div>
                <div style={{
                  fontSize: 9, color: eng.color, marginTop: 3,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {eng.lines} lines {"\u2022"} {eng.size}
                </div>
              </div>
            </button>
          ))}

          <div style={{
            margin: '12px 12px 8px',
            padding: '10px 12px',
            background: t.accent + '10',
            border: `1px solid ${t.accent}30`,
            borderRadius: 8,
            fontSize: 10,
            lineHeight: 1.6,
            color: t.textDim,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <div style={{ fontWeight: 700, color: t.accent, marginBottom: 4, fontSize: 11 }}>
              About SWMM5 Source Code
            </div>
            Each file is a complete, standalone SWMM5 simulation engine. Every engine implements:
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li>INP file parser (all sections)</li>
              <li>Horton infiltration model</li>
              <li>Manning's equation routing</li>
              <li>Cross-section geometry</li>
              <li>HTTP server or CGI interface</li>
              <li>.rpt report generation</li>
            </ul>
          </div>
        </div>

        <div ref={codeRef} style={{
          flex: 1, overflowY: 'auto', overflowX: 'auto',
          background: t.bg,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          lineHeight: 1.55,
          padding: 0,
        }}>
          {loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: t.textDim, fontSize: 14,
            }}>
              Loading {activeLang.lang} source code...
            </div>
          ) : (
            <table style={{
              borderCollapse: 'collapse',
              width: '100%',
              tableLayout: 'auto',
            }}>
              <tbody>
                {lines.map((line, i) => {
                  const isMatch = searchTerm && matchingLines.includes(i);
                  return (
                    <tr key={i} style={{
                      background: isMatch ? t.accent + '25' : 'transparent',
                    }}>
                      <td style={{
                        padding: '0 12px 0 8px',
                        textAlign: 'right',
                        color: isMatch ? t.accent : t.textDim,
                        userSelect: 'none',
                        width: 50,
                        borderRight: `1px solid ${t.border}`,
                        fontSize: 11,
                        opacity: 0.5,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {i + 1}
                      </td>
                      <td style={{
                        padding: '0 8px 0 12px',
                        whiteSpace: 'pre',
                        color: t.text,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {line}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
