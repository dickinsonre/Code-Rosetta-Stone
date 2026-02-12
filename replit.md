# SWMM5 Rosetta Stone

## Overview
An interactive multi-language code comparison viewer for EPA SWMM5 (Storm Water Management Model) engine algorithms. Shows the same SWMM5 algorithms implemented side-by-side in 7 programming languages: C, Rust, Python, Fortran, Julia, JavaScript, and Go.

## Current State
- Fully functional single-page React application
- Two SWMM5 modules available: RDII (RTK Unit Hydrograph) and Surface Runoff
- Custom syntax highlighting with token-based stashing to prevent regex conflicts
- Dark/light theme toggle
- Synchronized scrolling between code panels
- Copy-to-clipboard per code panel
- Responsive mobile layout (panels stack vertically below 900px)
- Enriched module descriptions with category badges, difficulty ratings, equations, inputs/outputs, and ecosystem links

## Project Architecture
- **Framework**: React + Vite
- **Structure**: Single component app in `src/App.jsx`
- **Entry**: `src/main.jsx` -> `src/App.jsx` (SWMM5CodeViewer component)
- **Port**: 5000 (Vite dev server)
- **Deployment**: Static site (vite build -> dist/)

## Key Technical Decisions
- Custom syntax highlighter using token placeholder approach (`%%TOK%%`) to prevent comment/string/keyword regex patterns from interfering with each other
- All code samples are inline in the component (no external data files)
- Theme system uses a `themes` object with dark/light variants, all colors driven by theme tokens
- Scroll sync uses ratio-based approach with requestAnimationFrame lock to prevent feedback loops
- Clipboard API with execCommand fallback for non-secure contexts
- No external dependencies beyond React and Vite
