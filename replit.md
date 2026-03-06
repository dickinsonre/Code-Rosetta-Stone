# SWMM5 Rosetta Stone

## Overview
The SWMM5 Rosetta Stone project is an interactive, multi-language code comparison viewer for the EPA Storm Water Management Model (SWMM5) and EPA EPANET engine algorithms. Its primary purpose is to provide a comprehensive resource for understanding how these water modeling algorithms are implemented across 37 programming languages for SWMM5 and 23 for EPANET. The project aims to consolidate and present a vast array of code implementations, interactive applications, and AI assistance in a single, accessible platform. This project serves as a valuable educational and development tool for environmental engineers, hydrologists, and software developers working with water infrastructure modeling.

## User Preferences
I prefer iterative development with clear, modular code. Please use functional programming patterns where appropriate. Before implementing major changes or new features, I would like to review the proposed approach. I appreciate detailed explanations of complex solutions.

## System Architecture
The application is a single-page React application built with Vite. It features a tabbed interface for different functionalities, including code comparison ("Rosetta Stone", "EPANET"), engine execution ("SWMM5 Engines"), code browsing ("SWMM5 Code"), interactive applications ("SWMM Apps"), neural network trainers ("MicroGPTs"), and an AI assistant ("AI Chat").

**UI/UX Decisions:**
- **Layout:** Responsive mobile layout (panels stack vertically below 900px).
- **Theming:** 6 color themes (Dark, Light, UF Gators, Auburn, Oregon State, EPA) with colors driven by theme tokens.
- **Code Visualization:** Custom syntax highlighting, synchronized scrolling between code panels, line-by-line correspondence highlighting on hover, and code search with match highlighting.
- **Navigation:** Module dependency diagrams (SVG graph), contextual navigation links to related apps.

**Technical Implementations & Feature Specifications:**
- **Code Comparison:** Displays 50 SWMM5 modules across 37 languages and 25 EPANET modules across 23 languages. Modules are categorized (Hydraulics, Hydrology, Water Quality, Operations, Numerical, Data Processing). The EPANET tab uses the same horizontal layout as the Rosetta Stone tab with LEFT/RIGHT language selectors, synchronized scrolling, code search, and module dependency diagrams.
- **SWMM5 Engines:** Provides an interface to run SWMM5 simulations using 41 different engine implementations (14 real, 26 live proxies, 1 concept). Users can upload `.inp` files and view `.rpt` reports. Real engines include implementations in C, Rust, Python, Go, JavaScript, C++, TypeScript, Perl, Ruby, Lua, and Java.
- **SWMM5 Code Browser:** Allows browsing of full source code for 11 standalone engine implementations with search and line numbers.
- **SWMM Apps:** Showcases 13 language-native SWMM app concepts with interactive components.
- **MicroGPTs:** Integrates 6 embedded neural network trainers for various SWMM equations (e.g., Manning's Equation, Hydrology).
- **AI Chat:** A Claude-powered AI assistant accessible via a floating icon in the bottom-right corner (available on all tabs). Opens as an overlay panel with streaming responses and markdown rendering.
- **Module Information:** Enriched descriptions with category badges, difficulty ratings, equations, inputs/outputs, and ecosystem links.
- **Search & Filter:** Functionality to find modules by concept, equation, tag, or description.
- **Translation Notes:** Provides notes for over 300 language pairs.

**System Design Choices:**
- **Data Structure:** Module data, including code samples and metadata, is managed in `src/modules.js` and `src/epanetModules.js`.
- **Backend:** An Express.js backend (`server.js`) handles API requests, including running SWMM5 simulations, proxying requests to various language-specific engine processes, and managing the AI chat.
- **Engine Execution:** Real engines are implemented as separate executables or scripts, spawned as child processes by the Express backend. These engines run on dedicated ports (e.g., Go on 3002, Python on 3003). Proxy engines leverage the EPA C engine.
- **WASM Integration:** Rust engine compiled to WebAssembly for browser-native execution.
- **Frontend Framework:** React with Vite for development and bundling.

## External Dependencies
- **Backend:**
    - `express`: Web framework for Node.js.
    - `multer`: Middleware for handling `multipart/form-data`, primarily for file uploads.
    - `@anthropic-ai/sdk`: For interacting with Claude AI (via Replit AI Integrations).
    - `openai`: For Replit AI Integrations.
- **Python (for `swmm-toolkit` engine execution):**
    - `swmm-toolkit`: Bindings for the EPA SWMM5 engine.
- **Rust (for `swmm5-rs` WASM engine):**
    - `wasm-bindgen`: For JavaScript interoperability.
- **AI Services:**
    - Claude (Anthropic): Used for the AI Chat functionality via Replit AI Integrations.
- **Embedded Explorers:**
    - PySWMM Explorer (via iframe)
    - SWMManywhere Explorer (via iframe)
    - HydroCouple Explorer (via iframe)