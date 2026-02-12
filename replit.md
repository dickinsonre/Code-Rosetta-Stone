# SWMM5 Rosetta Stone

## Overview
An interactive multi-language code comparison viewer for EPA SWMM5 (Storm Water Management Model) engine algorithms. Shows the same SWMM5 algorithms implemented side-by-side in 7 programming languages: C, Rust, Python, Fortran, Julia, JavaScript, and Go.

## Current State
- Fully functional single-page React application
- Ten SWMM5 modules organized by engineering priority:
  - routing.c (Dynamic Wave Routing), dynwave.c (Dynamic Wave Solver), flowrout.c (Flow Routing Dispatch)
  - subcatch.c (Subcatchment Runoff), infil.c (Infiltration Models), lid.c (LID/Green Infrastructure)
  - link.c (Conduit Hydraulics), node.c (Junction & Storage Nodes)
  - rain.c (Rainfall Processing), massbal.c (Mass Balance Checking)
- Custom syntax highlighting with token-based stashing to prevent regex conflicts
- Dark/light theme toggle
- Synchronized scrolling between code panels
- Copy-to-clipboard per code panel (with execCommand fallback)
- Responsive mobile layout (panels stack vertically below 900px)
- Enriched module descriptions with category badges, difficulty ratings, equations, inputs/outputs, and ecosystem links
- Landing/About section with project overview and EPA SWMM5 link
- Search/Filter to find modules by concept, equation, tag, or description
- Share buttons (LinkedIn, Twitter/X) with pre-formatted posts
- Per-language-pair translation notes (21 pairs covering all 7 languages)

## Project Architecture
- **Framework**: React + Vite
- **Structure**: 
  - `src/modules.js` — All module data (~5100 lines: code samples, metadata, languages, translation notes with 21 language-pair keys)
  - `src/App.jsx` — UI components, themes, syntax highlighting, main app (~860 lines)
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
