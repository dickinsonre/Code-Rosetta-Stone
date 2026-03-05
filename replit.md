# SWMM5 Rosetta Stone

## Overview
An interactive multi-language code comparison viewer for EPA SWMM5 (Storm Water Management Model) engine algorithms. Shows the same SWMM5 algorithms implemented side-by-side in 23 programming languages: C, Rust, Python, Fortran, Julia, JavaScript, Go, Zig, C++, C#, MATLAB, R, Delphi/Pascal, TypeScript, CUDA, WebAssembly/WAT, Mojo, Java, Nim, Ada, Chapel, Swift, and Kotlin.

## Current State
- Fully functional single-page React application with tabbed interface
- Seven top-level tabs: "Rosetta Stone" (code comparison), "SWMM Apps" (interactive showcase of 13 language-native SWMM app concepts), "MicroGPTs" (6 embedded neural network trainers for SWMM equations), "SWMM5 Engines" (upload .inp files and run EPA SWMM5 simulations, view .rpt reports), "PySWMM" (embedded PySWMM Explorer via iframe), "SWMManywhere" (embedded SWMManywhere Explorer via iframe), "HydroCouple" (embedded HydroCouple Explorer via iframe)
- Fifty SWMM5 modules organized by engineering category:
  - Hydraulics: routing.c, dynwave.c, flowrout.c, kinwave.c, xsect.c, link.c, node.c, dwflow.c, culvert.c, forcmain.c, roadway.c, exfil.c, shape.c, transect.c
  - Hydrology: subcatch.c, infil.c, lid.c, gwater.c, climate.c, rdii.c, snow.c, runoff.c, gage.c, landuse.c, lidproc.c
  - Water Quality: qualrout.c, treatmnt.c, surfqual.c
  - Operations: controls.c
  - Numerical: odesolve.c, findroot.c, mathexpr.c, toposort.c
  - Data Processing: rain.c, massbal.c, hotstart.c, iface.c, inflow.c, output.c, input.c, report.c, project.c, stats.c, statsrpt.c, table.c, datetime.c, hash.c, mempool.c, keywords.c, swmm5.c
- 23 languages organized in tiers:
  - Core: C, Rust, Python, Fortran, Julia, JavaScript, Go, Zig
  - Tier 1 (SWMM community): C++, C#, MATLAB, R, Delphi/Pascal
  - Tier 2 (broadening audience): TypeScript, CUDA, WebAssembly/WAT, Mojo, Java
  - Tier 3 (niche but defensible): Nim, Ada, Chapel, Swift, Kotlin
- MicroGPTs tab with 6 sub-tabs: Manning's Equation, Partial-Flow, RTK/RDII, Hydrology (Green-Ampt/Horton/NLR/SCS), Groundwater, IDF & Muskingum
- Custom syntax highlighting with token-based stashing to prevent regex conflicts
- 6 color themes: Dark, Light, UF Gators (orange/blue), Auburn (burnt orange/navy), Oregon State (orange/black), EPA (blue/green)
- Synchronized scrolling between code panels
- Line-by-line correspondence highlighting (hover a line to highlight same line in both panels)
- Code search across panels with match highlighting and count display
- "Try Online" playground links per language (Godbolt, Rust Playground, Go Playground, etc.)
- Module dependency diagram (SVG graph showing how 50 modules interconnect, clickable to navigate)
- Copy-to-clipboard per code panel (with execCommand fallback)
- Responsive mobile layout (panels stack vertically below 900px)
- Enriched module descriptions with category badges, difficulty ratings, equations, inputs/outputs, and ecosystem links
- Contextual navigation links from modules to related apps (INP MAKER, Simulation Engine, Rain Canvas Studio)
- Landing/About section with project overview and EPA SWMM5 link
- Search/Filter to find modules by concept, equation, tag, or description
- Share buttons (LinkedIn, Twitter/X) with pre-formatted posts
- Per-language-pair translation notes (253 pairs covering all 23 languages, enriched for 5 high-paradigm-distance pairs)
- All module/language counts are dynamic (no hardcoded numbers)
- Version stamp in footer (v2.0 — March 2026)

## Project Architecture
- **Framework**: React + Vite
- **Structure**: 
  - `src/modules.js` — All module data (code samples for 23 languages × 50 modules, metadata, languages array, 253 translation notes)
  - `src/App.jsx` — UI components, themes, syntax highlighting for 23 languages, main app, MODULE_GRAPH with 50 modules
  - `src/AppShowcase.jsx` — SWMM Apps tab: interactive showcase of 13 language-native SWMM app concepts with expandable cards, code samples, and summary matrix
  - `src/appIdeas.js` — Data for 13 language-specific SWMM app ideas (C, Rust, Python, Fortran, Julia, JavaScript, Go, Zig, C++, TypeScript, MATLAB, C#, Java)
  - `src/apps/MicroEngine.jsx` — C Micro-Engine: interactive SWMM simulation with canvas network visualization
  - `src/apps/SwmmLint.jsx` — Rust Linter: .inp file validator with 10+ rules, split-panel editor/results
  - `src/apps/ScenarioOrchestrator.jsx` — Python Orchestrator: parameter sweep UI with sensitivity charts
  - `src/apps/HpcSolver.jsx` — Fortran HPC: animated parallel speedup benchmark visualization
  - `src/apps/UncertaintyLab.jsx` — Julia UQ Lab: Monte Carlo simulation with exceedance probability curves
  - `src/apps/NetworkVisualizer.jsx` — JavaScript Visualizer: animated network with flow/depth colors, timeline scrubber
  - `src/apps/ApiServer.jsx` — Go API Server: interactive REST endpoint explorer with simulated responses
  - `src/apps/WasmEngine.jsx` — Zig WASM Engine: browser-based SWMM solver with performance metrics
  - `src/apps/CrossSectionCalc.jsx` — C++ Cross-Section Calculator: interactive geometry for 4 pipe shapes with real-time property display
  - `src/apps/ModelDashboard.jsx` — TypeScript Dashboard: tabbed model inspector with node/link tables and simulation results
  - `src/apps/HydrographPlotter.jsx` — MATLAB Hydrograph Plotter: SCS design storm + unit hydrograph runoff computation
  - `src/apps/DesignStormGen.jsx` — C# Design Storm Generator: IDF curves and alternating block method for 8 US cities
  - `src/apps/EventLogger.jsx` — Java Event Logger: real-time simulation event streaming with filtering and search
  - `public/*.html` — 5 standalone MicroGPT HTML apps (partial-flow, rtk-v2, hydrology-v2, groundwater, idf-muskingum)
  - `src/apps/SwmmEngineRunner.jsx` — SWMM5 Engines tab: upload .inp files, run EPA SWMM5 simulations, view/download .rpt reports
  - `server.js` — Express backend API for running SWMM5 simulations via Python swmm-toolkit
  - `run_swmm.py` — Python script that executes SWMM5 simulations using swmm-toolkit solver
  - `public/sample.inp` — Sample 3-node SWMM5 model for testing
  - `src/main.jsx` — Entry point
- **Entry**: `src/main.jsx` -> `src/App.jsx` (SWMM5CodeViewer component)
- **Port**: 5000 (Vite dev server), 3001 (Express backend API)
- **Deployment**: Vite frontend + Express backend (both started via npm run dev)

## Key Technical Decisions
- Custom syntax highlighter using token placeholder approach (`%%TOK%%`) to prevent comment/string/keyword regex patterns from interfering with each other
- Module data extracted to separate `src/modules.js` file with tags array for search support
- Theme system uses a `themes` object with dark/light variants, all colors driven by theme tokens
- Scroll sync uses ratio-based approach with requestAnimationFrame lock to prevent feedback loops
- Clipboard API with execCommand fallback for non-secure contexts
- Search filters modules by name, description, category, equations, inputs/outputs, and tags
- Share buttons use standard LinkedIn/Twitter intent URLs (no API keys needed)
- Translation notes use sorted language-pair keys (e.g., "c-rust", "python-julia") looked up via [left, right].sort().join("-")
- MicroGPTs served as standalone HTML files from public/ directory via Vite, embedded as iframes with sub-tab navigation
- MODULE_GRAPH includes 6 categories: Hydraulics, Hydrology, Quality, Operations, Data, Numerical
- SWMM5 Engines tab uses Express backend (port 3001) proxied through Vite; Python swmm-toolkit runs EPA SWMM5 engine
- Backend dependencies: express, multer (file upload handling)
- Python dependencies: swmm-toolkit (EPA SWMM5 engine bindings)
- No other external dependencies beyond React and Vite
