# SWMM5 Rosetta Stone

## Overview
An interactive multi-language code comparison viewer for EPA SWMM5 (Storm Water Management Model) engine algorithms. Shows the same SWMM5 algorithms implemented side-by-side in 23 programming languages: C, Rust, Python, Fortran, Julia, JavaScript, Go, Zig, C++, C#, MATLAB, R, Delphi/Pascal, TypeScript, CUDA, WebAssembly/WAT, Mojo, Java, Nim, Ada, Chapel, Swift, and Kotlin.

## Current State
- Fully functional single-page React application with tabbed interface
- Six top-level tabs: "Rosetta Stone" (code comparison), "MicroGPT" (embedded SWMM5 MicroGPT via iframe), "SWMManywhere" (embedded SWMManywhere urban drainage synthesizer via iframe), "PySWMM" (embedded PySWMM Explorer via iframe), "HydroCouple" (embedded HydroCouple Explorer via iframe), and "SWMM Apps" (interactive showcase of 8 language-native SWMM application concepts)
- Sixteen SWMM5 modules organized by engineering priority:
  - Hydraulics: routing.c (Dynamic Wave Routing), dynwave.c (Dynamic Wave Solver), flowrout.c (Flow Routing Dispatch), kinwave.c (Kinematic Wave Routing), xsect.c (Cross-Section Geometry), link.c (Conduit Hydraulics), node.c (Junction & Storage Nodes)
  - Hydrology: subcatch.c (Subcatchment Runoff), infil.c (Infiltration Models), lid.c (LID/Green Infrastructure), gwater.c (Groundwater Flow), climate.c (Climate/Evaporation Processing)
  - Water Quality: qualrout.c (Water Quality Routing)
  - Operations: controls.c (Rule-Based Controls)
  - Data Processing: rain.c (Rainfall Processing), massbal.c (Mass Balance Checking)
- 23 languages organized in tiers:
  - Core: C, Rust, Python, Fortran, Julia, JavaScript, Go, Zig
  - Tier 1 (SWMM community): C++, C#, MATLAB, R, Delphi/Pascal
  - Tier 2 (broadening audience): TypeScript, CUDA, WebAssembly/WAT, Mojo, Java
  - Tier 3 (niche but defensible): Nim, Ada, Chapel, Swift, Kotlin
- Custom syntax highlighting with token-based stashing to prevent regex conflicts
- 6 color themes: Dark, Light, UF Gators (orange/blue), Auburn (burnt orange/navy), Oregon State (orange/black), EPA (blue/green)
- Synchronized scrolling between code panels
- Copy-to-clipboard per code panel (with execCommand fallback)
- Responsive mobile layout (panels stack vertically below 900px)
- Enriched module descriptions with category badges, difficulty ratings, equations, inputs/outputs, and ecosystem links
- Landing/About section with project overview and EPA SWMM5 link
- Search/Filter to find modules by concept, equation, tag, or description
- Share buttons (LinkedIn, Twitter/X) with pre-formatted posts
- Per-language-pair translation notes (253 pairs covering all 23 languages)

## Project Architecture
- **Framework**: React + Vite
- **Structure**: 
  - `src/modules.js` — All module data (code samples for 23 languages × 16 modules, metadata, languages array, 253 translation notes)
  - `src/App.jsx` — UI components, themes, syntax highlighting for 23 languages, main app
  - `src/AppShowcase.jsx` — SWMM Apps tab: interactive showcase of 8 language-native SWMM app concepts with expandable cards, code samples, and summary matrix
  - `src/appIdeas.js` — Data for 8 language-specific SWMM app ideas (C, Rust, Python, Fortran, Julia, JavaScript, Go, Zig)
  - `src/apps/MicroEngine.jsx` — C Micro-Engine: interactive SWMM simulation with canvas network visualization
  - `src/apps/SwmmLint.jsx` — Rust Linter: .inp file validator with 10+ rules, split-panel editor/results
  - `src/apps/ScenarioOrchestrator.jsx` — Python Orchestrator: parameter sweep UI with sensitivity charts
  - `src/apps/HpcSolver.jsx` — Fortran HPC: animated parallel speedup benchmark visualization
  - `src/apps/UncertaintyLab.jsx` — Julia UQ Lab: Monte Carlo simulation with exceedance probability curves
  - `src/apps/NetworkVisualizer.jsx` — JavaScript Visualizer: animated network with flow/depth colors, timeline scrubber
  - `src/apps/ApiServer.jsx` — Go API Server: interactive REST endpoint explorer with simulated responses
  - `src/apps/WasmEngine.jsx` — Zig WASM Engine: browser-based SWMM solver with performance metrics
  - `src/main.jsx` — Entry point
- **Entry**: `src/main.jsx` -> `src/App.jsx` (SWMM5CodeViewer component)
- **Port**: 5000 (Vite dev server)
- **Deployment**: Static site (vite build -> dist/)

## Key Technical Decisions
- Custom syntax highlighter using token placeholder approach (`%%TOK%%`) to prevent comment/string/keyword regex patterns from interfering with each other
- Module data extracted to separate `src/modules.js` file with tags array for search support
- Theme system uses a `themes` object with dark/light variants, all colors driven by theme tokens
- Scroll sync uses ratio-based approach with requestAnimationFrame lock to prevent feedback loops
- Clipboard API with execCommand fallback for non-secure contexts
- Search filters modules by name, description, category, equations, inputs/outputs, and tags
- Share buttons use standard LinkedIn/Twitter intent URLs (no API keys needed)
- Translation notes use sorted language-pair keys (e.g., "c-rust", "python-julia") looked up via [left, right].sort().join("-")
- No external dependencies beyond React and Vite
