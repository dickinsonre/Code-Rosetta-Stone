import { useState } from "react";

const engines = [
  {
    name: "C",
    dir: "swmm5-c",
    color: "#555555",
    prerequisites: ["gcc (GNU C Compiler)"],
    buildSteps: ["gcc -O2 -o swmm5-c swmm5_engine.c -lm"],
    runCommand: "./swmm5-c",
    binarySize: "~50 KB",
    port: "3004",
    notes: "Reference implementation. Compiles instantly. Uses standard C99 with math library linkage.",
  },
  {
    name: "C++",
    dir: "swmm5-cpp",
    color: "#f34b7d",
    prerequisites: ["g++ (GNU C++ Compiler)", "C++17 support"],
    buildSteps: ["g++ -std=c++17 -O2 -o swmm5-cpp swmm5_engine.cpp"],
    runCommand: "./swmm5-cpp",
    binarySize: "~80 KB",
    port: "3005",
    notes: "Uses modern C++17 features: structured bindings, std::optional, string_view.",
  },
  {
    name: "Go",
    dir: "swmm5-go",
    color: "#00ADD8",
    prerequisites: ["Go 1.21+"],
    buildSteps: ["cd swmm5-go", "go build -o swmm5-go ."],
    runCommand: "./swmm5-go",
    binarySize: "~6 MB",
    port: "3002",
    notes: "Single binary with built-in HTTP server. No external dependencies. Fast compilation.",
  },
  {
    name: "Python",
    dir: "swmm5-py",
    color: "#3572A5",
    prerequisites: ["Python 3.8+", "http.server (stdlib)"],
    buildSteps: ["# No compilation needed"],
    runCommand: "python3 swmm5_engine.py",
    binarySize: "N/A (interpreted)",
    port: "3003",
    notes: "Pure Python implementation. Uses only standard library. Great for prototyping and learning.",
  },
  {
    name: "Rust (Native)",
    dir: "swmm5-rust-native",
    color: "#dea584",
    prerequisites: ["Rust toolchain (rustup)", "Cargo"],
    buildSteps: ["cd swmm5-rust-native", "cargo build --release"],
    runCommand: "./target/release/swmm5-rust-native",
    binarySize: "~2 MB",
    port: "3007",
    notes: "Memory-safe systems language. Zero-cost abstractions. Release build enables full optimizations.",
  },
  {
    name: "Rust (WASM)",
    dir: "swmm5-rs",
    color: "#dea584",
    prerequisites: ["Rust toolchain", "wasm-pack", "wasm32-unknown-unknown target"],
    buildSteps: [
      "rustup target add wasm32-unknown-unknown",
      "cargo install wasm-pack",
      "cd swmm5-rs",
      "wasm-pack build --target web --release",
    ],
    runCommand: "# Import in browser: import init from './pkg/swmm5_rs.js'",
    binarySize: "~200 KB (.wasm)",
    port: "N/A (browser)",
    notes: "Runs entirely in the browser via WebAssembly. Uses wasm-bindgen for JS interop.",
  },
  {
    name: "TypeScript",
    dir: "swmm5-ts",
    color: "#3178c6",
    prerequisites: ["Bun runtime (or Node.js + ts-node)"],
    buildSteps: ["# No compilation needed with Bun"],
    runCommand: "bun run swmm5_engine.ts",
    binarySize: "N/A (interpreted)",
    port: "3006",
    notes: "Type-safe JavaScript. Bun provides native TypeScript execution without transpilation.",
  },
  {
    name: "Perl",
    dir: "swmm5-perl",
    color: "#0298c3",
    prerequisites: ["Perl 5.20+", "HTTP::Daemon (CPAN)", "JSON (CPAN)"],
    buildSteps: ["cpan install HTTP::Daemon JSON"],
    runCommand: "perl swmm5_engine.pl",
    binarySize: "N/A (interpreted)",
    port: "3008",
    notes: "Classic scripting language. Uses HTTP::Daemon for the built-in web server.",
  },
  {
    name: "Ruby",
    dir: "swmm5-ruby",
    color: "#CC342D",
    prerequisites: ["Ruby 3.0+", "WEBrick (stdlib)"],
    buildSteps: ["# No compilation needed"],
    runCommand: "ruby swmm5_engine.rb",
    binarySize: "N/A (interpreted)",
    port: "3009",
    notes: "Elegant syntax. Uses WEBrick HTTP server from standard library.",
  },
  {
    name: "Lua",
    dir: "swmm5-lua",
    color: "#000080",
    prerequisites: ["Lua 5.3+", "luasocket"],
    buildSteps: ["luarocks install luasocket"],
    runCommand: "lua swmm5_engine.lua",
    binarySize: "N/A (interpreted)",
    port: "N/A (stdin/stdout)",
    notes: "Lightweight embeddable scripting language. Reads from stdin, writes JSON to stdout.",
  },
  {
    name: "Java",
    dir: "swmm5-java",
    color: "#b07219",
    prerequisites: ["JDK 11+"],
    buildSteps: ["cd swmm5-java", "javac SwmmEngine.java"],
    runCommand: "java -cp swmm5-java SwmmEngine",
    binarySize: "~20 KB (.class files)",
    port: "3011",
    notes: "Enterprise-grade. Uses built-in com.sun.net.httpserver for HTTP serving.",
  },
  {
    name: "Kotlin",
    dir: "swmm5-kotlin",
    color: "#A97BFF",
    prerequisites: ["Kotlin compiler (kotlinc)", "JDK 11+"],
    buildSteps: ["cd swmm5-kotlin", "kotlinc SwmmEngine.kt -include-runtime -d SwmmEngine.jar"],
    runCommand: "java -jar swmm5-kotlin/SwmmEngine.jar",
    binarySize: "~4 MB (.jar with runtime)",
    port: "3012",
    notes: "Modern JVM language. -include-runtime bundles Kotlin stdlib into the JAR.",
  },
  {
    name: "Scala",
    dir: "swmm5-scala",
    color: "#c22d40",
    prerequisites: ["Scala 3 compiler", "JDK 11+"],
    buildSteps: ["# Scala scripts run directly"],
    runCommand: "scala swmm5-scala/SwmmEngine.scala",
    binarySize: "N/A (script mode)",
    port: "3013",
    notes: "Functional + OOP on JVM. Can run as a script without explicit compilation.",
  },
  {
    name: "Nim",
    dir: "swmm5-nim",
    color: "#ffc200",
    prerequisites: ["Nim 2.0+"],
    buildSteps: ["cd swmm5-nim", "nim compile -d:release -o:swmm5-nim swmm5_engine.nim"],
    runCommand: "./swmm5-nim",
    binarySize: "~150 KB",
    port: "3014",
    notes: "Python-like syntax, C-like performance. Compiles to native code via C backend.",
  },
  {
    name: "Zig",
    dir: "swmm5-zig",
    color: "#ec915c",
    prerequisites: ["Zig 0.11+"],
    buildSteps: ["cd swmm5-zig", "zig build-exe -O ReleaseFast swmm5_engine.zig"],
    runCommand: "./swmm5_engine",
    binarySize: "~500 KB",
    port: "3015",
    notes: "Systems language designed as a better C. No hidden allocations, comptime evaluation.",
  },
  {
    name: "Dart",
    dir: "swmm5-dart",
    color: "#00B4AB",
    prerequisites: ["Dart SDK 3.0+"],
    buildSteps: ["cd swmm5-dart", "dart compile exe swmm5_engine.dart -o swmm5-dart"],
    runCommand: "./swmm5-dart",
    binarySize: "~5 MB",
    port: "3016",
    notes: "AOT-compiled to native. Also powers Flutter. Strong typing with null safety.",
  },
  {
    name: "Tcl",
    dir: "swmm5-tcl",
    color: "#e4cc98",
    prerequisites: ["Tcl 8.6+", "tcllib (for JSON)"],
    buildSteps: ["# No compilation needed"],
    runCommand: "tclsh swmm5_engine.tcl",
    binarySize: "N/A (interpreted)",
    port: "3017",
    notes: "Tool Command Language. Originally designed for embedding. Everything is a string.",
  },
  {
    name: "Racket",
    dir: "swmm5-racket",
    color: "#3c5caa",
    prerequisites: ["Racket 8.0+"],
    buildSteps: ["# No compilation needed"],
    runCommand: "racket swmm5_engine.rkt",
    binarySize: "N/A (interpreted)",
    port: "3018",
    notes: "Scheme-derived language. Excellent for DSL creation. Uses built-in web server.",
  },
  {
    name: "Elixir",
    dir: "swmm5-elixir",
    color: "#6e4a7e",
    prerequisites: ["Elixir 1.14+", "Erlang/OTP 25+"],
    buildSteps: ["# No compilation needed for .exs scripts"],
    runCommand: "elixir swmm5_engine.exs",
    binarySize: "N/A (interpreted)",
    port: "3019",
    notes: "Runs on BEAM VM. Built for concurrency and fault tolerance. Pattern matching syntax.",
  },
  {
    name: "Fortran",
    dir: "swmm5-fortran",
    color: "#4d41b1",
    prerequisites: ["gfortran (GNU Fortran Compiler)"],
    buildSteps: ["cd swmm5-fortran", "gfortran -O2 -o swmm5-fortran swmm5_engine.f90"],
    runCommand: "./swmm5-fortran",
    binarySize: "~100 KB",
    port: "N/A (stdin/stdout)",
    notes: "Scientific computing workhorse. Modern Fortran (F90+) with modules and derived types.",
  },
  {
    name: "Haskell",
    dir: "swmm5-haskell",
    color: "#5e5086",
    prerequisites: ["GHC (Glasgow Haskell Compiler)"],
    buildSteps: ["cd swmm5-haskell", "ghc -O2 -o swmm5-haskell swmm5_engine.hs"],
    runCommand: "./swmm5-haskell",
    binarySize: "~2 MB",
    port: "N/A (stdin/stdout)",
    notes: "Pure functional language with lazy evaluation. Strong static type system with type inference.",
  },
  {
    name: "OCaml",
    dir: "swmm5-ocaml",
    color: "#3be133",
    prerequisites: ["OCaml compiler (ocamlopt)", "ocamlfind"],
    buildSteps: ["cd swmm5-ocaml", "ocamlfind ocamlopt -package str -linkpkg -o swmm5-ocaml swmm5_engine.ml"],
    runCommand: "./swmm5-ocaml",
    binarySize: "~1 MB",
    port: "N/A (stdin/stdout)",
    notes: "ML-family functional language. Native code compilation. Pattern matching and algebraic types.",
  },
  {
    name: "Ada",
    dir: "swmm5-ada",
    color: "#02f88c",
    prerequisites: ["GNAT (GNU Ada compiler)"],
    buildSteps: ["cd swmm5-ada", "gnatmake -O2 -o swmm5-ada swmm5_engine.adb"],
    runCommand: "./swmm5-ada",
    binarySize: "~300 KB",
    port: "N/A (stdin/stdout)",
    notes: "Safety-critical systems language. Strong typing, range types, and contract-based programming.",
  },
  {
    name: "Pascal",
    dir: "swmm5-pascal",
    color: "#E3F171",
    prerequisites: ["Free Pascal Compiler (fpc)"],
    buildSteps: ["cd swmm5-pascal", "fpc -O2 -o swmm5_engine swmm5_engine.pas"],
    runCommand: "./swmm5_engine",
    binarySize: "~200 KB",
    port: "N/A (stdin/stdout)",
    notes: "Structured programming language. Strong typing with readability focus. Delphi-compatible.",
  },
  {
    name: "Common Lisp",
    dir: "swmm5-lisp",
    color: "#3fb68b",
    prerequisites: ["SBCL (Steel Bank Common Lisp)"],
    buildSteps: ["# No compilation needed for script mode"],
    runCommand: "sbcl --script swmm5_engine.lisp",
    binarySize: "N/A (interpreted)",
    port: "N/A (stdin/stdout)",
    notes: "Dynamic, homoiconic language. SBCL provides native compilation. Macro system for metaprogramming.",
  },
  {
    name: "R",
    dir: "swmm5-r",
    color: "#198CE7",
    prerequisites: ["R 4.0+", "jsonlite package"],
    buildSteps: ["Rscript -e 'install.packages(\"jsonlite\", repos=\"https://cran.r-project.org\")'"],
    runCommand: "Rscript swmm5_engine.R",
    binarySize: "N/A (interpreted)",
    port: "N/A (stdin/stdout)",
    notes: "Statistical computing language. Vectorized operations. jsonlite for JSON I/O.",
  },
];

export default function EngineBuildGuide({ theme: t }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copiedCmd, setCopiedCmd] = useState(null);

  const selected = engines[selectedIdx];

  const handleCopy = async (text, idx) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedCmd(idx);
      setTimeout(() => setCopiedCmd(null), 2000);
    } catch {
      setCopiedCmd(null);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ color: t.text, margin: 0, fontSize: 22 }}>Engine Build Guide</h2>
      <p style={{ color: t.textDim, fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        Step-by-step build and run instructions for all {engines.length} SWMM5 engine implementations
      </p>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{
          width: 240,
          flexShrink: 0,
          background: t.panelBg || t.panel,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 14px",
            background: t.panelHeader,
            borderBottom: `1px solid ${t.border}`,
            fontSize: 12,
            fontWeight: 600,
            color: t.textDim,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}>
            Engines ({engines.length})
          </div>
          <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
            {engines.map((eng, i) => (
              <div
                key={eng.dir}
                onClick={() => setSelectedIdx(i)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: i === selectedIdx ? (t.activeBg || t.hoverBg) : "transparent",
                  borderLeft: i === selectedIdx ? `3px solid ${t.accent}` : "3px solid transparent",
                  borderBottom: `1px solid ${t.borderLight || t.border}22`,
                  transition: "background 0.15s",
                }}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: eng.color,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 13,
                  color: i === selectedIdx ? t.text : t.textDim,
                  fontWeight: i === selectedIdx ? 600 : 400,
                }}>{eng.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          flex: 1,
          minWidth: 0,
          background: t.panelBg || t.panel,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 20px",
            background: t.panelHeader,
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: selected.color,
              boxShadow: `0 0 8px ${selected.color}55`,
            }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{selected.name}</span>
            <span style={{
              fontSize: 12,
              color: t.textDim,
              fontFamily: "'JetBrains Mono', monospace",
              background: (t.codeBg || t.panelBg) + "88",
              padding: "2px 8px",
              borderRadius: 4,
            }}>{selected.dir}/</span>
          </div>

          <div style={{ padding: 20, overflowY: "auto", maxHeight: "calc(100vh - 260px)" }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.accent,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}>Prerequisites</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selected.prerequisites.map((p, i) => (
                  <span key={i} style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    fontSize: 12,
                    background: t.accent + "15",
                    color: t.text,
                    border: `1px solid ${t.accent}33`,
                  }}>{p}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.accent,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}>Build Steps</div>
              <div style={{
                background: t.codeBg || "#1a1d28",
                borderRadius: 6,
                border: `1px solid ${t.border}`,
                overflow: "hidden",
              }}>
                {selected.buildSteps.map((step, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderBottom: i < selected.buildSteps.length - 1 ? `1px solid ${t.border}44` : "none",
                    gap: 8,
                  }}>
                    <span style={{
                      color: t.accent,
                      fontSize: 11,
                      fontWeight: 700,
                      width: 16,
                      flexShrink: 0,
                    }}>{i + 1}.</span>
                    <code style={{
                      flex: 1,
                      fontSize: 13,
                      color: t.codeText || t.text,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}>{step}</code>
                    <button
                      onClick={() => handleCopy(step, `build-${i}`)}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        border: `1px solid ${t.border}`,
                        background: copiedCmd === `build-${i}` ? t.accent + "22" : "transparent",
                        color: copiedCmd === `build-${i}` ? t.accent : t.textDim,
                        cursor: "pointer",
                        fontSize: 10,
                        fontFamily: "'JetBrains Mono', monospace",
                        flexShrink: 0,
                      }}
                    >{copiedCmd === `build-${i}` ? "\u2713" : "Copy"}</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.accent,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 8,
              }}>Run Command</div>
              <div style={{
                background: t.codeBg || "#1a1d28",
                borderRadius: 6,
                border: `1px solid ${t.border}`,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ color: t.accent, fontSize: 14 }}>$</span>
                <code style={{
                  flex: 1,
                  fontSize: 13,
                  color: t.codeText || t.text,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}>{selected.runCommand}</code>
                <button
                  onClick={() => handleCopy(selected.runCommand, "run")}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: `1px solid ${t.border}`,
                    background: copiedCmd === "run" ? t.accent + "22" : "transparent",
                    color: copiedCmd === "run" ? t.accent : t.textDim,
                    cursor: "pointer",
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >{copiedCmd === "run" ? "\u2713" : "Copy"}</button>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}>
              <div style={{
                background: t.codeBg || "#1a1d28",
                borderRadius: 6,
                border: `1px solid ${t.border}`,
                padding: "12px 14px",
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: t.textDim,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}>Binary Size</div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: t.text,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{selected.binarySize}</div>
              </div>
              <div style={{
                background: t.codeBg || "#1a1d28",
                borderRadius: 6,
                border: `1px solid ${t.border}`,
                padding: "12px 14px",
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: t.textDim,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}>Port</div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: t.accent,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{selected.port}</div>
              </div>
            </div>

            <div style={{
              background: t.notesBg || (t.codeBg || "#1a1d28"),
              borderRadius: 6,
              border: `1px solid ${t.border}`,
              padding: "14px 16px",
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6,
              }}>Notes</div>
              <div style={{
                fontSize: 13,
                color: t.text,
                lineHeight: 1.6,
              }}>{selected.notes}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
