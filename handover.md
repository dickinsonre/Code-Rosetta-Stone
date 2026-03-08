# SWMM5 Rosetta Stone — Project Handover Document

---

## 1. Project Overview

The SWMM5 Rosetta Stone is an interactive, multi-language code comparison viewer for two EPA water modeling engines:

- **EPA SWMM5** (Storm Water Management Model) — stormwater/drainage simulation
- **EPA EPANET 2.2** — pressurized water distribution network analysis

The application translates every core algorithm from both engines into multiple programming languages and presents them side-by-side with synchronized scrolling, syntax highlighting, module dependency diagrams, and AI-powered assistance.

### Key Statistics

| Metric | Count |
|--------|-------|
| Total code translations | 2,425 |
| SWMM5 engine modules | 50 |
| EPANET engine modules | 25 |
| SWMM5 programming languages | 37 |
| EPANET programming languages | 23 |
| Standalone engine implementations | 26 directories |
| Engine runner entries (UI) | 41 (14 real, 26 proxy, 1 concept) |
| SWMM app concepts | 13 |
| Neural network trainers (MicroGPTs) | 6 |
| Embedded explorers (iframes) | 3 |
| Color themes | 6 |
| Translation notes (language pairs) | 300+ |
| Backend API routes | 28 |
| Total source lines (src/) | ~132,885 |
| Largest file | `src/modules.js` (102,594 lines, 3.0 MB) |

---

## 2. Runtime Environment

### Servers

| Server | Port | Technology | Purpose |
|--------|------|------------|---------|
| Vite dev server | 5000 | Vite 7 + React 19 | Frontend SPA, proxies `/api/*` to backend |
| Express backend | 3001 | Express.js 5 | API routes, engine process management, AI chat |
| Go engine | 3002 | Go 1.25 | SWMM5 simulation (8.6 MB binary) |
| Python engine | 3003 | Python 3.11 | Pure Python SWMM5 simulation |
| C engine | 3004 | GCC | Standalone C SWMM5 (30 KB binary) |
| C++ engine | 3005 | G++ (C++17) | OOP C++ SWMM5 (75 KB binary) |
| TypeScript engine | 3006 | Bun runtime | Type-safe SWMM5 simulation |
| Rust native engine | 3007 | Rust (stable) | Fastest engine (505 KB binary) |
| Perl engine | 3008 | Perl 5 | Regex-powered INP parser |
| Ruby engine | 3009 | Ruby 3.2 | WEBrick HTTP server |
| Java engine | 3011 | GraalVM 22.3 | Enterprise OOP engine |
| Kotlin engine | 3012 | Kotlin/JVM | JAR-based engine (4.7 MB) |
| Scala engine | 3013 | Scala | Functional/OOP hybrid |
| Nim engine | 3014 | Nim | Python-like compiled engine |
| Zig engine | 3015 | Zig | Safety-focused systems engine |
| Dart engine | 3016 | Dart | AOT-compiled engine (6.6 MB) |
| Tcl engine | 3017 | Tcl | Scripted engine |
| Racket engine | 3018 | Racket | Scheme-family engine |
| Elixir engine | 3019 | Elixir | BEAM VM engine |

### How to Start

```bash
npm run dev
```

This runs `node server.js & vite --host 0.0.0.0 --port 5000` — the Express backend and Vite dev server start in parallel. The backend automatically spawns engine child processes on their assigned ports.

### Replit Configuration (`.replit`)

**Modules**: `nodejs-20`, `python-3.11`, `rust-stable`, `go-1.25`, `ruby-3.2`, `java-graalvm22.3`, `lua-5.2`

**Nix packages**: `wasm-pack`, `luasocket`, `gfortran`, `zig`, `nim`, `ghc`, `tcl`, `scala`, `kotlin`, `dart`, `elixir`, `ocaml`, `R`, `fpc`, `sbcl`, `racket`, `gnat`

### Vite Configuration (`vite.config.js`)

- React plugin enabled
- Host: `0.0.0.0`, port: `5000`
- `allowedHosts: true` (required for Replit's proxy/iframe preview)
- Proxy: `/api` → `http://localhost:3001`
- WASM files included as assets (`assetsInclude: ['**/*.wasm']`)

---

## 3. Complete File Structure

```
/                                    Root
├── server.js                        Express backend (545 lines)
├── index.html                       Vite entry HTML
├── vite.config.js                   Vite config
├── package.json                     Node dependencies (type: "module")
├── package-lock.json                Lock file
├── .replit                          Replit config (modules, nix, workflows)
├── replit.md                        Agent memory file (project summary)
├── handover.md                      THIS FILE — full project handover
├── SWMM5_Rosetta_Stone_Newsletter.txt  LinkedIn newsletter content
├── main.py                          Python helper
├── run_swmm.py                      Python SWMM5 runner (swmm-toolkit)
├── pyproject.toml                   Python project config
├── .gitignore                       Git ignore rules
│
├── src/                             Frontend source
│   ├── main.jsx                     React entry point (renders <App />)
│   ├── App.jsx                      Main app (1,658 lines) — tabs, themes, Rosetta Stone
│   ├── EpanetRosettaStone.jsx       EPANET tab (452 lines)
│   ├── codeComponents.jsx           Shared UI components (362 lines)
│   ├── modules.js                   SWMM5 data (102,594 lines / 3.0 MB)
│   ├── epanetModules.js             EPANET data (17,172 lines / 500 KB)
│   ├── appIdeas.js                  SWMM app concept definitions
│   ├── AppShowcase.jsx              App showcase component
│   │
│   ├── apps/                        Tab-specific components
│   │   ├── SwmmEngineRunner.jsx     Engine runner (4,008 lines)
│   │   ├── SwmmCodeViewer.jsx       Code browser (623 lines)
│   │   ├── AiChat.jsx               AI chat (307 lines)
│   │   ├── ModelDashboard.jsx       Dashboard app (349 lines)
│   │   ├── HydrographPlotter.jsx    Hydrograph plotter (342 lines)
│   │   ├── DesignStormGen.jsx       Design storm generator (297 lines)
│   │   ├── CrossSectionCalc.jsx     Cross-section calculator (288 lines)
│   │   ├── EventLogger.jsx          Event logger (249 lines)
│   │   ├── NetworkVisualizer.jsx    Network visualizer (237 lines)
│   │   ├── SwmmLint.jsx             SWMM linter (224 lines)
│   │   ├── MicroEngine.jsx          Micro engine (219 lines)
│   │   ├── ScenarioOrchestrator.jsx Scenario runner (212 lines)
│   │   ├── UncertaintyLab.jsx       Uncertainty lab (208 lines)
│   │   ├── WasmEngine.jsx           WASM engine UI (206 lines)
│   │   ├── HpcSolver.jsx            HPC solver (173 lines)
│   │   ├── ApiServer.jsx            API server concept (115 lines)
│   │   ├── EngineBenchmark.jsx      Engine benchmark dashboard (434 lines)
│   │   ├── LanguageLeaderboard.jsx  Language leaderboard (288 lines)
│   │   ├── TranslationHeatmap.jsx   Translation difficulty heatmap (398 lines)
│   │   ├── ModuleQuiz.jsx           Algorithm quiz (846 lines)
│   │   └── EngineBuildGuide.jsx     Engine build instructions (617 lines)
│   │
│   └── engines/                     Browser-side engine assets
│       ├── swmm5-js.js              JavaScript SWMM5 engine (runs in browser)
│       └── wasm/
│           └── swmm5_rs_bg.wasm     Rust→WASM engine (140 KB)
│
├── public/                          Static assets served by Vite
│   ├── sample.inp                   Default SWMM5 input file
│   ├── Greenville_all_SWMM5_Features.inp  Full-featured demo input
│   ├── user1.inp ... user5.inp      Uploaded user input files
│   ├── partial-flow-microgpt.html   MicroGPT: partial flow curves
│   ├── rtk-microgpt-v2.html         MicroGPT: RTK hydrology
│   ├── idf-muskingum-microgpt.html  MicroGPT: IDF/Muskingum routing
│   ├── swmm5-hydrology-microgpt-v2.html  MicroGPT: hydrology
│   └── swmm5-groundwater-microgpt.html   MicroGPT: groundwater
│
├── swmm5-go/                        Go engine (8.3 MB total)
│   ├── main.go                      42,520 lines — full SWMM5 in Go
│   ├── go.mod                       Module definition
│   └── swmm5-go                     Compiled binary (8.6 MB)
│
├── swmm5-py/                        Pure Python engine (32 KB)
│   └── swmm5_engine.py              Zero-dependency SWMM5
│
├── swmm5-c/                         C standalone engine (60 KB)
│   ├── swmm5_engine.c               26,637 bytes source
│   └── swmm5-c                      30 KB binary
│
├── swmm5-cpp/                       C++ OOP engine (108 KB)
│   ├── swmm5_engine.cpp             25,756 bytes source
│   └── swmm5-cpp                    75 KB binary
│
├── swmm5-ts/                        TypeScript/Bun engine (20 KB)
│   └── swmm5_engine.ts              19,439 bytes
│
├── swmm5-rust-native/               Rust native engine (2.8 MB)
│   ├── src/main.rs                  Source
│   ├── Cargo.toml                   Rust manifest
│   └── target/release/              Compiled binary (505 KB)
│
├── swmm5-rs/                        Rust→WASM engine (107 MB w/ build cache)
│   ├── src/                         lib.rs, infil.rs, input.rs, routing.rs, etc.
│   └── pkg/                         WASM build output
│       ├── swmm5_rs_bg.wasm         140 KB WASM binary
│       ├── swmm5_rs.js              JS glue code
│       └── swmm5_rs.d.ts            TypeScript declarations
│
├── swmm5-perl/                      Perl engine (20 KB)
│   └── swmm5_engine.pl
├── swmm5-ruby/                      Ruby engine (16 KB)
│   └── swmm5_engine.rb
├── swmm5-lua/                       Lua engine (16 KB)
│   └── swmm5_engine.lua
├── swmm5-java/                      Java engine (80 KB)
│   ├── SwmmEngine.java              21,715 bytes source
│   └── SwmmEngine.class + inner classes
├── swmm5-kotlin/                    Kotlin engine (4.7 MB)
│   ├── SwmmEngine.kt                18,686 bytes
│   └── SwmmEngine.jar               4.8 MB JAR
├── swmm5-scala/                     Scala engine (20 KB)
│   └── SwmmEngine.scala
├── swmm5-nim/                       Nim engine (284 KB)
│   ├── swmm5_engine.nim
│   └── swmm5-nim                    270 KB binary
├── swmm5-zig/                       Zig engine (7.8 MB)
│   ├── swmm5_engine.zig             28,076 bytes
│   └── swmm5_engine                 3.7 MB binary
├── swmm5-dart/                      Dart engine (6.6 MB)
│   ├── swmm5_engine.dart
│   └── swmm5-dart                   6.8 MB AOT binary
├── swmm5-tcl/                       Tcl engine (24 KB)
│   └── swmm5_engine.tcl
├── swmm5-racket/                    Racket engine (24 KB)
│   └── swmm5_engine.rkt
├── swmm5-elixir/                    Elixir engine (20 KB)
│   └── swmm5_engine.exs
├── swmm5-fortran/                   Fortran engine (64 KB)
│   ├── swmm5_engine.f90
│   └── swmm5-fortran                38 KB binary
├── swmm5-haskell/                   Haskell engine (3.4 MB)
│   ├── swmm5_engine.hs              18,606 bytes
│   └── swmm5-haskell                3 MB binary
├── swmm5-ocaml/                     OCaml engine (1.4 MB)
│   └── swmm5_engine.ml + binary
├── swmm5-ada/                       Ada engine (1.3 MB)
│   ├── swmm5_engine.adb             12,419 bytes
│   └── swmm5-ada                    1.2 MB binary
├── swmm5-pascal/                    Pascal engine (976 KB)
│   └── swmm5_engine.pas + binary
├── swmm5-lisp/                      Common Lisp engine (20 KB)
│   └── swmm5_engine.lisp
└── swmm5-r/                         R engine (16 KB)
    └── swmm5_engine.R
```

---

## 4. Frontend Architecture

### Tab Navigation

The app has 9 tabs rendered in `App.jsx`, plus a floating AI chat overlay:

| Tab | State Value | Component/Location | Description |
|-----|-------------|-------------------|-------------|
| Rosetta Stone | `rosetta` | Inline in `App.jsx` | SWMM5 code comparison (50 modules × 37 langs) |
| SWMM5 Engines | `engine` | `SwmmEngineRunner.jsx` | Upload .inp → run simulation → view .rpt |
| SWMM5 Code | `code` | `SwmmCodeViewer.jsx` | Browse 11 engine source files |
| SWMM Apps | `swmmapps` | `AppShowcase.jsx` | 13 interactive app concepts |
| MicroGPTs | `microgpt` | Inline in `App.jsx` (iframes) | 6 neural network trainers |
| PySWMM | `pyswmm` | Inline iframe | External PySWMM explorer |
| SWMManywhere | `swmmanywhere` | Inline iframe | External SWMManywhere explorer |
| HydroCouple | `hydrocouple` | Inline iframe | External HydroCouple explorer |
| EPANET | `epanet` | `EpanetRosettaStone.jsx` | EPANET code comparison (25 modules × 23 langs) |
| Benchmark | `benchmark` | `EngineBenchmark.jsx` | Run all engines on same .inp, compare time/accuracy |
| Leaderboard | `leaderboard` | `LanguageLeaderboard.jsx` | Rank 37 languages by conciseness/type safety |
| Heatmap | `heatmap` | `TranslationHeatmap.jsx` | 50×37 difficulty heatmap vs C reference |
| Quiz | `quiz` | `ModuleQuiz.jsx` | 30 multiple-choice algorithm questions |
| Build Guide | `buildguide` | `EngineBuildGuide.jsx` | Build instructions for all 26 engines |
| AI Chat | (floating) | `AiChat.jsx` | Floating overlay, always accessible |

### Shared Components (`src/codeComponents.jsx`)

This file is the single source of truth imported by both `App.jsx` and `EpanetRosettaStone.jsx`:

- **`CodePanel`** — Renders syntax-highlighted code with line numbers, scroll synchronization via refs, hover-to-highlight corresponding lines in the other panel, search match highlighting, "Copy" button, and "Try Online" link
- **`ModuleInfoPanel`** — Displays module description, category badge (colored), difficulty badge (Beginner/Intermediate/Advanced with emoji), equations in math notation, inputs list, and outputs list
- **`difficultyConfig`** — Maps difficulty levels to colors and emojis: Beginner (green, seedling), Intermediate (orange, fire), Advanced (red, rocket)
- **`playgroundUrls`** — Maps language IDs to online playground URLs (e.g., Rust Playground, Go Playground, TypeScript Playground, Replit, etc.)
- **`highlightCode(code, langId)`** — Custom syntax highlighter that tokenizes code for all 37 languages using regex patterns for keywords, strings, comments, numbers, types, and function names. Returns HTML with `<span>` elements styled by theme token classes.

### Theming System

6 color themes defined in `App.jsx`, each providing a full set of token colors:

| Theme | Description |
|-------|-------------|
| Dark | Default dark theme |
| Light | White/light background |
| UF Gators | University of Florida (orange/blue) |
| Auburn | Auburn University (navy/orange) |
| Oregon State | Oregon State University (black/orange) |
| EPA | EPA branding (blue/white) |

Each theme object contains: `bg`, `panel`, `text`, `textDim`, `accent`, `border`, `headerBg`, `tabBg`, `tabActive`, `tabHover`, `codeBg`, `codeText`, `keyword`, `string`, `comment`, `number`, `type`, `function`.

Theme selector is a moon/sun toggle icon in the top-right of the tab bar, cycling through all 6 themes.

---

## 5. Rosetta Stone Tab (SWMM5) — Detailed

**Location**: Inline rendering in `App.jsx` when `activeTab === "rosetta"`
**Data source**: `src/modules.js` — exports `modules`, `languages`, `translationNotes`

### Layout (top to bottom)

1. **Header bar**: S5 logo icon | "SWMM5 Rosetta Stone" title | "50 Modules × 37 Languages" subtitle | Module search input
2. **Module buttons**: Horizontal scrollable row of 50 module buttons (`mod-btn` class), active module highlighted
3. **Module info**: Description paragraph, category badge, difficulty badge, equations, inputs, outputs
4. **Dependency diagram** (toggleable): Interactive SVG graph (`MODULE_GRAPH`) showing module call relationships — nodes colored by category, edges as lines, clickable nodes navigate to that module
5. **LEFT language selector**: Horizontal row of 37 language buttons with colored dot indicators, active language highlighted
6. **RIGHT language selector**: Same row, independent selection
7. **Code search bar**: "SEARCH CODE" input, finds matches in both panels, displays match count
8. **Side-by-side code panels**: Two `CodePanel` components — left panel shows LEFT language, right panel shows RIGHT language
9. **Translation notes**: When both languages are selected, displays contextual notes about translating between those languages (e.g., "C to Rust: ownership replaces manual malloc/free")

### SWMM5 Module Categories

| Category | Count | Modules |
|----------|-------|---------|
| Hydraulics | 14 | routing, dynwave, flowrout, link, kinwave, forcmain, culvert, roadway, xsect, shape, transect, dwflow, node, runoff |
| Hydrology | 12 | subcatch, infil, lid, lidproc, rain, gage, gwater, climate, snow, rdii, inflow, landuse |
| Data Processing | 15 | input, output, report, stats, statsrpt, project, table, datetime, controls, massbal, hotstart, iface, keywords, hash, mempool, swmm5 |
| Numerical | 4 | odesolve, findroot, mathexpr, toposort |
| Water Quality | 3 | qualrout, surfqual, treatmnt |
| Quality Assurance | 1 | massbal |
| Operations | 1 | exfil |

### Complete SWMM5 Module List (50)

1. `routing.c` — Dynamic Wave Routing
2. `dynwave.c` — Dynamic Wave Solver
3. `flowrout.c` — Flow Routing Dispatch
4. `subcatch.c` — Subcatchment Runoff
5. `infil.c` — Infiltration Models (Horton, Green-Ampt, SCS Curve Number)
6. `lid.c` — LID/Green Infrastructure
7. `link.c` — Conduit Hydraulics
8. `node.c` — Junction & Storage Nodes
9. `rain.c` — Rainfall Processing
10. `massbal.c` — Mass Balance Checking
11. `gwater.c` — Groundwater Flow
12. `xsect.c` — Cross-Section Geometry
13. `climate.c` — Climate/Evaporation Processing
14. `controls.c` — Rule-Based Controls
15. `qualrout.c` — Water Quality Routing
16. `kinwave.c` — Kinematic Wave Routing
17. `rdii.c` — Rainfall-Dependent I&I
18. `treatmnt.c` — Water Quality Treatment
19. `snow.c` — Snowpack/Snowmelt
20. `dwflow.c` — Steady/Normal Flow Initialization
21. `hotstart.c` — Simulation State Save/Restore
22. `iface.c` — Interface File Handling
23. `culvert.c` — Culvert Inlet/Outlet Control
24. `forcmain.c` — Pressurized Force Main Flow
25. `roadway.c` — Roadway/Street Overtopping Flow
26. `runoff.c` — Surface Runoff Generation
27. `gage.c` — Rain Gauge Management
28. `landuse.c` — Land Use & Pollutant Buildup
29. `surfqual.c` — Surface Water Quality/Washoff
30. `inflow.c` — External Inflow Handling
31. `odesolve.c` — ODE Solver (Runge-Kutta)
32. `findroot.c` — Root Finding (Bisection/Ridder)
33. `mathexpr.c` — Mathematical Expression Parser
34. `shape.c` — Normalized Cross-Section Shapes
35. `transect.c` — Irregular Channel Transects
36. `output.c` — Binary Output File Writing
37. `input.c` — INP File Parsing
38. `report.c` — Simulation Report Generation
39. `project.c` — Project Data Management
40. `stats.c` — Runtime Statistics Collection
41. `statsrpt.c` — Statistics Reporting
42. `table.c` — Lookup Table & Curves
43. `datetime.c` — Date/Time Utilities
44. `exfil.c` — Conduit Exfiltration
45. `lidproc.c` — LID Process Simulation
46. `toposort.c` — Topological Sorting of Network
47. `hash.c` — Hash Table
48. `mempool.c` — Memory Pool Allocator
49. `keywords.c` — Keyword/Token Lookup
50. `swmm5.c` — Main Simulation API

### 37 SWMM5 Languages

C, Rust, Python, Fortran, Julia, JavaScript, Go, Zig, C++, C#, MATLAB, R, Delphi, TypeScript, CUDA, WAT/WASM, Mojo, Java, Nim, Ada, Chapel, Swift, Kotlin, Ruby, AutoLISP, Common Lisp, Clojure, Scheme, Hy, VBA, Lua, Tcl, Haskell, Scala, Dart, Elixir, OCaml

---

## 6. EPANET Tab — Detailed

**Location**: `src/EpanetRosettaStone.jsx`
**Data source**: `src/epanetModules.js` — exports `epanetModules`, `epanetLanguages`, `EPANET_MODULE_GRAPH`, `epanetCategories`

### Layout

Mirrors the Rosetta Stone tab exactly:
1. Header bar with EN logo, "EPANET 2.2 Rosetta Stone" title, "25 Modules × 23 Languages" subtitle, module search
2. Module buttons (25 modules)
3. Module info panel with category/difficulty badges
4. Dependency diagram (toggleable SVG using `EPANET_MODULE_GRAPH`)
5. LEFT/RIGHT language selectors (23 languages each)
6. Code search bar with match count
7. Side-by-side code panels with synchronized scrolling

### EPANET Module Categories

| Category | Count | Modules |
|----------|-------|---------|
| Core Solver | 3 | hydraul (GGA), smatrix (Cholesky), genmmd (minimum degree) |
| Network Elements | 6 | pipe, pump, valve, tank, node, pattern |
| Water Quality | 3 | quality, qualreact, qualroute |
| Controls | 2 | rules, controls |
| Parser / IO | 4 | input, output, report, inpfile |
| Infrastructure | 5 | project, hash, mempool, types, epanet |
| Numerical | 2 | linsolve, newton |

### Complete EPANET Module List (25)

1. `hydraul.c` — Hydraulic Solver (GGA) — Global Gradient Algorithm with Hazen-Williams headloss, Jacobian assembly, Newton iteration
2. `smatrix.c` — Sparse Matrix Solver — Cholesky LLT factorization, forward/back substitution
3. `genmmd.c` — Minimum Degree Ordering — Graph ordering to minimize sparse matrix fill-in
4. `pipe.c` — Pipe Head Loss — Hazen-Williams, Darcy-Weisbach (Colebrook-White), Chezy-Manning
5. `pump.c` — Pump Modeling — Pump curve H = A - B*Q^C, energy P = gamma*Q*H/eff
6. `valve.c` — Valve Modeling — PRV, PSV, FCV, TCV, GPV valve types
7. `tank.c` — Tank Level Tracking — Volume-area curves, mixing models
8. `node.c` — Junction Demand/Head — Emitter flows, demand-driven analysis
9. `pattern.c` — Time Patterns — Interpolation and multiplier lookups
10. `quality.c` — Water Quality Solver — Lagrangian transport, reactions, mixing
11. `qualreact.c` — Chemical Reactions — Bulk/wall decay kinetics, chlorine
12. `qualroute.c` — Quality Routing — Segment advection through pipe network
13. `rules.c` — Rule-Based Controls — IF-THEN-ELSE evaluation
14. `controls.c` — Simple Controls — Time/level controls for pumps and valves
15. `input.c` — INP File Parser — Section-based tokenization
16. `output.c` — Binary Output Writer — Time step results serialization
17. `report.c` — Text Report Writer — Statistics summary generation
18. `inpfile.c` — Input File Utilities — Read/write helpers
19. `project.c` — Project Data Structures — Initialization and management
20. `hash.c` — Hash Table — Fast node/link ID lookup
21. `mempool.c` — Memory Pool — Efficient block allocation
22. `types.c` — Type Definitions — Node, Link, Pump, Valve, Tank, Pattern, Curve
23. `epanet.c` — Main API — Open, solve hydraulics, solve quality, close
24. `linsolve.c` — Linear Solver — LU decomposition with pivoting
25. `newton.c` — Newton-Raphson Manager — Convergence, line search, damping

### 23 EPANET Languages

C, Rust, Python, Julia, MATLAB, JavaScript, Go, Fortran, TypeScript, C++, C#, Java, Kotlin, Swift, Zig, Nim, Ruby, Scala, Dart, Haskell, OCaml, Lua, Elixir

### EPANET Data Structure (`epanetModules.js`)

```javascript
export const epanetModules = {
  "hydraul.c — Hydraulic Solver (GGA)": {
    category: "Core Solver",
    difficulty: "Advanced",
    description: "...",
    equations: "...",
    inputs: "...",
    outputs: "...",
    c: `// C reference implementation ...`,
    rust: `// Rust implementation ...`,
    python: `# Python implementation ...`,
    // ... 23 language keys total, each containing a template literal of code
  },
  // ... 25 module entries total
};

export const epanetLanguages = [
  { id: "c", label: "C", ext: ".c", color: "#555555", desc: "Reference implementation (EPANET 2.2)" },
  { id: "rust", label: "Rust", ext: ".rs", color: "#dea584", desc: "Memory-safe systems language" },
  // ... 23 entries, each with id, label, ext, color, desc
];

export const EPANET_MODULE_GRAPH = {
  nodes: [
    { id: "hydraul", x: 400, y: 100, category: "Core Solver" },
    // ... positioned nodes for SVG rendering
  ],
  edges: [
    { from: "hydraul", to: "smatrix" },
    // ... dependency relationships
  ]
};

export const epanetCategories = {
  "Core Solver": "#4fc3f7",
  "Network Elements": "#81c784",
  "Water Quality": "#ce93d8",
  "Controls": "#ffb74d",
  "Parser / IO": "#90a4ae",
  "Infrastructure": "#a1887f",
  "Numerical": "#e57373"
};
```

---

## 7. SWMM5 Engines Tab — Detailed

**Location**: `src/apps/SwmmEngineRunner.jsx` (4,008 lines)

### How It Works

1. User selects an engine from 41 options (listed as cards with status badges)
2. User uploads a `.inp` file (SWMM5 simulation input)
3. Frontend sends `POST /api/run-swmm-{lang}` with the file as `multipart/form-data`
4. Backend routes the file to the appropriate engine process
5. Engine returns a `.rpt` report
6. Frontend displays the report text

### 14 Real Engines

These are fully functional standalone SWMM5 implementations:

| # | Engine | Language | Binary Size | Key Feature |
|---|--------|----------|------------|-------------|
| 1 | EPA SWMM5 | C (via Python bindings) | N/A | Official reference, regulatory standard |
| 2 | PySWMM | Python | N/A | Step-by-step control, real-time monitoring |
| 3 | Rust WASM | Rust→WASM | 140 KB | Runs in browser, zero server dependency |
| 4 | Go Native | Go | 8.6 MB | Sub-millisecond simulation, port 3002 |
| 5 | Pure Python | Python | N/A | Zero dependencies, most readable |
| 6 | C Standalone | C (GCC) | 30 KB | Smallest binary, POSIX sockets |
| 7 | C++ OOP | C++ (G++) | 75 KB | C++17, RAII, STL containers |
| 8 | TypeScript/Bun | TypeScript | N/A | Type-safe, Bun runtime speed |
| 9 | Rust Native | Rust | 505 KB | Fastest engine, zero dependencies |
| 10 | Perl | Perl | N/A | Regex-powered INP parser |
| 11 | Ruby | Ruby | N/A | WEBrick HTTP, class-based design |
| 12 | Lua | Lua | N/A | 200 KB footprint, embedded-friendly |
| 13 | Java | Java | N/A | Enterprise OOP, JVM |
| 14 | Julia | Julia | N/A | JIT-compiled, near-C speed |

### Engine Process Management (in `server.js`)

The `startChildEngine(name, cmd, args, envOverrides)` function:
- Spawns a child process with `child_process.spawn()`
- Passes port via environment variable (e.g., `GO_ENGINE_PORT=3002`)
- Attaches stdout/stderr logging with `[EngineName]` prefix
- Handles process exit and error events

The `proxyToEngine(name, port, req, res)` function:
- Forwards the uploaded `.inp` file body to the engine's HTTP endpoint
- Receives the `.rpt` response and returns it to the client
- Uses Node.js `http.request()` for proxying

Engines fall into three execution patterns:
1. **HTTP server engines** (Go, Python, C, C++, TS, Rust, Perl, Ruby, Java, Kotlin, Scala, Nim, Zig, Dart, Tcl, Racket, Elixir) — spawned as long-running HTTP servers, requests proxied to them
2. **Direct execution engines** (Fortran, R, OCaml, Haskell, Pascal, Lisp, Ada, Lua) — spawned as one-shot processes with the `.inp` file, stdout captured as `.rpt`
3. **Browser engine** (Rust WASM) — runs entirely client-side via `WasmEngine.jsx`

---

## 8. SWMM5 Code Browser Tab

**Location**: `src/apps/SwmmCodeViewer.jsx` (623 lines)

- Browse full source code for 11 standalone engine implementations
- Syntax highlighting with line numbers
- Code search within files (find in file)
- Source loaded via `GET /api/engine-source/:lang`
- Available engines for browsing: Go, Python, C, C++, TypeScript, Rust, Perl, Ruby, Lua, Java, Haskell

---

## 9. SWMM Apps Tab

**Location**: `src/AppShowcase.jsx` + individual components in `src/apps/`

13 interactive application concepts demonstrating SWMM5 principles:

| Component | Description |
|-----------|-------------|
| ModelDashboard | Dashboard for monitoring simulation status |
| HydrographPlotter | Interactive hydrograph visualization |
| CrossSectionCalc | Pipe cross-section geometry calculator |
| DesignStormGen | Design storm hyetograph generator |
| EventLogger | Simulation event logging interface |
| NetworkVisualizer | Pipe network graph visualization |
| SwmmLint | SWMM5 input file validator/linter |
| MicroEngine | Minimal SWMM5 engine concept |
| ScenarioOrchestrator | Multi-scenario comparison runner |
| UncertaintyLab | Parameter uncertainty analysis |
| WasmEngine | Browser-native WASM engine UI |
| HpcSolver | High-performance computing solver concept |
| ApiServer | REST API server concept |

---

## 10. MicroGPTs Tab

**Location**: Inline in `App.jsx` (iframe rendering based on `activeGPT` state)

6 neural network trainers that learn SWMM5 equations from data:

| ID | Name | Source | Equation |
|----|------|--------|----------|
| `microgpt` | Manning's Equation | `micro-gpt-swmm.replit.app` (external) | V = (1/n) × R^(2/3) × S^(1/2) |
| `partialflow` | Partial Flow | `/partial-flow-microgpt.html` | Depth/diameter vs flow/full-flow ratio |
| `rtk` | RTK Hydrology | `/rtk-microgpt-v2.html` | Unit hydrograph R, T, K parameters |
| `idfmusk` | IDF/Muskingum | `/idf-muskingum-microgpt.html` | IDF curves + Muskingum routing |
| `hydrology` | Hydrology | `/swmm5-hydrology-microgpt-v2.html` | General hydrology equations |
| `groundwater` | Groundwater | `/swmm5-groundwater-microgpt.html` | Groundwater flow equations |

---

## 11. AI Chat (Floating Overlay)

**Location**: `src/apps/AiChat.jsx` (307 lines), rendered in `App.jsx`

### UI

- **Trigger**: Floating circular button (52px) in bottom-right corner, `z-index: 999`, robot emoji icon
- **Overlay**: Fixed-position panel (400px wide, 70vh tall), `z-index: 1000`, positioned above the trigger button
- **Close**: X button in the overlay header
- **Availability**: Visible and accessible on all tabs simultaneously
- **`embedded` prop**: When `true`, uses compact layout mode (no internal padding/header)

### Backend

- **Route**: `POST /api/chat`
- **Request body**: `{ messages: [{ role: "user", content: "..." }, ...] }`
- **Response**: Server-Sent Events (SSE) streaming — Claude's response is streamed token-by-token
- **Provider**: Anthropic Claude via Replit AI Integrations
- **Model**: `claude-sonnet-4-6`
- **SDK**: `@anthropic-ai/sdk` v0.78.0
- **Environment variables**:
  - `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — API key (managed by Replit integration)
  - `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Base URL (managed by Replit integration)

### Features

- Streaming responses (tokens appear as they're generated)
- Markdown rendering in responses
- Message history maintained in React state
- Auto-scroll to latest message
- Context-aware (can discuss SWMM5/EPANET algorithms, code, and water modeling)

---

## 12. Backend API Routes (`server.js`)

### Engine Simulation Routes

All accept `POST` with `multipart/form-data` containing field `inpFile`:

| Route | Engine | Execution Method |
|-------|--------|-----------------|
| `/api/run-swmm` | EPA SWMM5 (C via Python) | Direct: runs `run_swmm.py` |
| `/api/run-swmm-go` | Go | Proxy → port 3002 |
| `/api/run-swmm-python` | Pure Python | Proxy → port 3003 |
| `/api/run-swmm-c` | C Standalone | Proxy → port 3004 |
| `/api/run-swmm-cpp` | C++ OOP | Proxy → port 3005 |
| `/api/run-swmm-ts` | TypeScript/Bun | Proxy → port 3006 |
| `/api/run-swmm-rust-native` | Rust Native | Proxy → port 3007 |
| `/api/run-swmm-perl` | Perl | Proxy → port 3008 |
| `/api/run-swmm-ruby` | Ruby | Proxy → port 3009 |
| `/api/run-swmm-java` | Java | Proxy → port 3011 |
| `/api/run-swmm-lua` | Lua | Direct execution |
| `/api/run-swmm-kotlin` | Kotlin | Proxy → port 3012 |
| `/api/run-swmm-scala` | Scala | Proxy → port 3013 |
| `/api/run-swmm-nim` | Nim | Proxy → port 3014 |
| `/api/run-swmm-zig` | Zig | Proxy → port 3015 |
| `/api/run-swmm-dart` | Dart | Proxy → port 3016 |
| `/api/run-swmm-tcl` | Tcl | Proxy → port 3017 |
| `/api/run-swmm-racket` | Racket | Proxy → port 3018 |
| `/api/run-swmm-elixir` | Elixir | Proxy → port 3019 |
| `/api/run-swmm-fortran` | Fortran | Direct: runs binary |
| `/api/run-swmm-r` | R | Direct: runs R script |
| `/api/run-swmm-ocaml` | OCaml | Direct: runs binary |
| `/api/run-swmm-haskell` | Haskell | Direct: runs binary |
| `/api/run-swmm-pascal` | Pascal | Direct: runs binary |
| `/api/run-swmm-lisp` | Common Lisp | Direct: runs SBCL script |
| `/api/run-swmm-ada` | Ada | Direct: runs binary |

### Other Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/engine-source/:lang` | Returns the source file contents for an engine (used by Code Browser tab) |
| POST | `/api/chat` | AI chat — accepts `{ messages }`, streams Claude SSE response |

---

## 13. Data Files — Schema Reference

### `src/modules.js` Structure (102,594 lines)

```javascript
export const modules = {
  "routing.c — Dynamic Wave Routing": {
    category: "Hydraulics",           // Category string
    difficulty: "Advanced",           // "Beginner" | "Intermediate" | "Advanced"
    description: "Controls the ...",  // Multi-line description
    equations: "Q = v × A\n...",      // Governing equations
    inputs: "Conduit properties...",  // Input parameters
    outputs: "Flows, depths...",      // Output results
    c: `// routing.c — ...\n...`,     // C code (template literal)
    rust: `// routing.rs — ...\n...`, // Rust code
    python: `# routing.py — ...\n...`,// Python code
    // ... one key per language (37 total)
    // Each value is a template literal containing the full code translation
  },
  // ... 50 module entries
};

export const languages = [
  {
    id: "c",           // Unique identifier (used as key in module objects)
    label: "C",        // Display label
    ext: ".c",         // File extension
    color: "#555555",  // Dot color in UI
    desc: "Reference implementation"  // Tooltip description
  },
  // ... 37 entries
];

export const translationNotes = {
  "c→rust": "Ownership and borrowing replace manual malloc/free...",
  "python→julia": "Multiple dispatch replaces OOP...",
  // ... 300+ language pair notes
};
```

### `src/epanetModules.js` Structure (17,172 lines)

Same schema as `modules.js` but with 25 modules × 23 languages, plus:

```javascript
export const EPANET_MODULE_GRAPH = {
  nodes: [
    { id: "hydraul", x: 400, y: 100, category: "Core Solver" },
    // ... 25 nodes with x,y positions for SVG layout
  ],
  edges: [
    { from: "hydraul", to: "smatrix" },
    { from: "hydraul", to: "pipe" },
    // ... dependency edges
  ]
};

export const epanetCategories = {
  "Core Solver": "#4fc3f7",
  "Network Elements": "#81c784",
  "Water Quality": "#ce93d8",
  "Controls": "#ffb74d",
  "Parser / IO": "#90a4ae",
  "Infrastructure": "#a1887f",
  "Numerical": "#e57373"
};
```

---

## 14. Key Implementation Details

### Synchronized Scrolling

Both Rosetta Stone tabs use `onScroll` event handlers on code panel containers. When either panel scrolls:
1. The `scrollTop` of the scrolling panel is read
2. The other panel's `scrollTop` is set to the same value
3. A `scrolling` ref flag prevents infinite scroll loops

This creates line-by-line correspondence between the two code panels.

### Line Hover Highlighting

When hovering over a line in one panel:
1. The line index is calculated from the mouse position
2. That line is highlighted in the current panel
3. The corresponding line (same index) in the other panel is also highlighted
4. This provides visual correspondence for understanding how code maps between languages

### Code Search

1. User types in the search bar
2. Both code panels are searched for the text
3. Matches are highlighted with a background color
4. Match count is displayed (e.g., "3 matches")
5. Search is case-insensitive

### Custom Syntax Highlighting (`highlightCode`)

The function in `codeComponents.jsx`:
1. Takes `(code, langId)` as arguments
2. Selects appropriate keyword list, comment syntax, and string delimiters based on `langId`
3. Tokenizes the code using regex patterns in priority order:
   - Block comments (`/* */`, `{- -}`, `(* *)`, etc.)
   - Line comments (`//`, `#`, `%`, `!`, `--`, `;`)
   - Strings (single/double/backtick with escape handling)
   - Numbers (integer, float, hex `0x`, scientific `1e10`)
   - Keywords (language-specific lists)
   - Types (capitalized identifiers, language-specific)
4. Returns HTML with themed `<span>` elements

### Module Dependency Diagrams

Both tabs render interactive SVG graphs:
- Nodes: circles with module abbreviations, positioned with x/y coordinates
- Node colors: based on category (from category color map)
- Edges: lines connecting dependent modules
- Interaction: clicking a node navigates to that module
- Toggle: "Show Diagram" / "Hide Diagram" button
- Legend: color key for categories

### Engine File Upload Flow

1. `<input type="file" accept=".inp">` captures the file
2. `FormData` wraps the file as `inpFile` field
3. `fetch()` sends POST to `/api/run-swmm-{engine}` with the FormData
4. `server.js` receives via `multer` middleware → saves to `uploads/` directory
5. For proxy engines: `proxyToEngine()` sends HTTP POST to the engine's port
6. For direct engines: `execFile()` or `spawn()` runs the binary/script with the .inp file path
7. Engine processes the .inp → generates .rpt text
8. Response flows back: engine → server.js → frontend
9. Frontend displays .rpt in a monospace text area

### WASM Engine (Browser-Native)

- Rust source in `swmm5-rs/src/` (lib.rs, infil.rs, input.rs, routing.rs, subcatch.rs, xsect.rs, project.rs, report.rs)
- Compiled via `wasm-pack build` → output in `swmm5-rs/pkg/`
- WASM binary: `swmm5_rs_bg.wasm` (140 KB) + JS glue: `swmm5_rs.js`
- Copied to `src/engines/wasm/` for Vite to serve
- `WasmEngine.jsx` loads the WASM module, accepts .inp file input, runs simulation entirely in-browser
- No server round-trip — all computation happens client-side

---

## 15. Responsive Design

**Breakpoint**: 900px viewport width

| Feature | Desktop (>900px) | Mobile (<900px) |
|---------|-----------------|-----------------|
| Code panels | Side-by-side (50/50) | Stacked vertically |
| Module buttons | Horizontal row, wrapping | Horizontal scroll |
| Language selectors | Full row with all languages | Horizontal scroll |
| AI chat overlay | 400px wide panel | Full-width panel |
| Tab bar | All tabs visible | Horizontal scroll |

---

## 16. Dependencies

### Node.js (`package.json`)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.4 | UI framework |
| `react-dom` | ^19.2.4 | React DOM renderer |
| `vite` | ^7.3.1 | Dev server and bundler |
| `@vitejs/plugin-react` | ^5.1.4 | React fast refresh for Vite |
| `express` | ^5.2.1 | Backend API server |
| `multer` | ^2.1.1 | Multipart file upload middleware |
| `@anthropic-ai/sdk` | ^0.78.0 | Claude AI client library |
| `openai` | ^6.27.0 | Replit AI integrations SDK |
| `zod` | ^4.3.6 | Schema validation |
| `drizzle-zod` | ^0.8.3 | Drizzle ORM Zod integration |
| `zod-validation-error` | ^5.0.0 | Human-readable Zod errors |
| `p-limit` | ^7.3.0 | Promise concurrency limiter |
| `p-retry` | ^7.1.1 | Promise retry utility |

### Python

- `swmm-toolkit` — Official EPA SWMM5 C library Python bindings (installed in `.pythonlibs/`)
- Used by `run_swmm.py` for the EPA reference engine

### Replit Integrations

- `javascript_anthropic_ai_integrations==2.0.0` — Manages `AI_INTEGRATIONS_ANTHROPIC_API_KEY` and `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- `javascript_openai_ai_integrations==2.0.0` — OpenAI integration (available but secondary)

### External Web Services (iframes)

- `micro-gpt-swmm.replit.app` — Manning's Equation MicroGPT (external Replit app)
- PySWMM Explorer — external
- SWMManywhere Explorer — external
- HydroCouple Explorer — external

---

## 17. Deployment Notes

- The project uses Replit's deployment system
- The `npm run build` command runs `vite build` to produce optimized static assets
- In production, the Express server serves the built static files and handles API routes
- Engine child processes are spawned on startup; compiled binaries must exist in their directories
- WASM engine works in production since it runs client-side
- AI chat requires the Anthropic integration credentials to be present in the deployed environment

---

## 18. Known Architectural Decisions

1. **All code translations in JS files**: The 2,425 code samples are stored as template literals inside `modules.js` (3 MB) and `epanetModules.js` (500 KB). This means they're bundled with the frontend and loaded on page load. This gives instant switching between modules/languages with zero network requests, at the cost of a larger initial bundle.

2. **No database**: All data is static JavaScript. No database is needed. Module metadata, code translations, translation notes, and dependency graphs are all in-memory.

3. **Inline styles**: The entire app uses inline React styles (no CSS files). Theme colors are passed as props/context and applied directly to style attributes.

4. **Single App.jsx**: The main `App.jsx` is 1,658 lines and contains the Rosetta Stone tab, hero section, theme definitions, tab navigation, and several inline tab renderers. Only EPANET and the app-specific components are factored out.

5. **Engine per directory**: Each engine implementation lives in its own `swmm5-{lang}/` directory with source code and (where applicable) compiled binaries checked into the repository.

6. **Port 3010 skipped**: Engine ports go 3002-3009, then 3011-3019. Port 3010 is not used (historical gap).

7. **Custom syntax highlighter**: Rather than using a library like Prism.js or highlight.js, a custom `highlightCode` function handles all 37 languages. This keeps dependencies minimal but means new languages require manual keyword list additions.
