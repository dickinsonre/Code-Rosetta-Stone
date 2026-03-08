# SWMM5 Rosetta Stone

## Overview
The SWMM5 Rosetta Stone is an interactive, multi-language code comparison viewer for the EPA Storm Water Management Model (SWMM5) and EPA EPANET 2.2 engine algorithms. It translates every core algorithm from both EPA engines into multiple programming languages (up to 37 for SWMM5 and 23 for EPANET). This project provides side-by-side code viewing with synchronized scrolling, syntax highlighting, and AI-powered assistance for 2,425 individual code translations (1,850 SWMM5 + 575 EPANET). Its purpose is to facilitate understanding and comparison of these critical water modeling algorithms across various programming paradigms, aiming to foster broader adoption and development within the water resources engineering community.

## User Preferences
- Iterative development with clear, modular code.
- Functional programming patterns where appropriate.
- Review proposed approach before major changes or new features.
- Detailed explanations of complex solutions.

## System Architecture

### Runtime Environment
- **Frontend**: React 19 SPA served by Vite 7 on port **5000**.
- **Backend**: Express.js 5 server on port **3001** handling API, engine process management, and AI chat proxy.
- **Proxy**: Vite proxies `/api/*` requests to the backend.
- **Development Setup**: `npm run dev` concurrently runs both frontend and backend.
- **Replit Modules & Nix Packages**: Utilizes a wide array of language runtimes and compilers to support diverse engine implementations, including `nodejs-20`, `python-3.11`, `rust-stable`, `go-1.25`, `java-graalvm22.3`, `wasm-pack`, `gfortran`, `zig`, `nim`, `ghc`, `tcl`, `scala`, `kotlin`, `dart`, `elixir`, `ocaml`, `R`, `fpc`, `sbcl`, `racket`, `gnat`.

### Core Features and Design
- **Multi-language Code Comparison**: Displays 50 SWMM5 and 25 EPANET modules, each translated into numerous languages, side-by-side with synchronized scrolling and line-hover highlighting.
- **Interactive Module Information**: Each module includes a description, category, difficulty rating, equations, inputs, and outputs, with interactive dependency diagrams.
- **SWMM5 Engine Runner**: Supports 41 engine implementations (14 real, 26 live proxies, 1 concept) allowing users to upload `.inp` files and receive `.rpt` reports.
- **SWMM5 Code Browser**: Provides a viewer for the full source code of 11 standalone engine implementations with syntax highlighting and search.
- **SWMM Apps Showcase**: A collection of 13 interactive application concepts demonstrating SWMM5 principles in various programming paradigms.
- **MicroGPTs**: Six embedded neural network trainers focusing on specific SWMM5-related hydrological and hydraulic concepts.
- **AI Chat Integration**: A floating AI chat component powered by Anthropic Claude, accessible across all tabs, offering real-time assistance.
- **Theming**: Six distinct color themes (Dark, Light, UF Gators, Auburn, Oregon State, EPA) are available for UI customization.
- **Responsive Design**: Adapts layout for desktop and mobile viewports, ensuring usability across devices.
- **Custom Syntax Highlighting**: A custom `highlightCode` function supports all 37 languages, tokenizing code for keywords, strings, comments, numbers, and types.
- **Engine Process Management**: The backend manages child processes for various engine implementations, handling compilation and execution.
- **Data Structure**: Code translations and module metadata are stored in `src/modules.js` and `src/epanetModules.js`, which are large JavaScript objects containing code strings and descriptive data.

### Architectural Patterns
- **SPA Architecture**: React frontend communicates with an Express.js backend via RESTful APIs.
- **Proxy-based Engine Integration**: Many engines are exposed via dedicated HTTP servers, which the main Express backend proxies requests to.
- **Direct Engine Execution**: Some engines, particularly those compiled or requiring specific interpreters, are run directly as child processes by the Express backend.
- **WASM Integration**: A Rust-based SWMM5 engine compiled to WebAssembly allows for client-side execution within the browser.

### API Routes
A comprehensive set of API routes (`/api/run-swmm-*`) facilitates running simulations with various engine implementations, fetching engine source code (`/api/engine-source/:lang`), and interacting with the AI chat (`/api/chat`). All engine run routes handle `multipart/form-data` for `.inp` file uploads.

## External Dependencies

### Node.js Packages
- `react`, `react-dom`: UI development.
- `vite`, `@vitejs/plugin-react`: Frontend tooling (dev server, bundler).
- `express`, `multer`: Backend API and file uploads.
- `@anthropic-ai/sdk`: Client for Anthropic Claude AI.
- `openai`: Replit AI integrations.
- `zod`, `drizzle-zod`, `zod-validation-error`: Schema validation.
- `p-limit`, `p-retry`: Utility for concurrency control and retries.

### Python Libraries
- `swmm-toolkit`: Python bindings for the EPA SWMM5 C library, used for running the official EPA engine.

### AI Integration
- **Provider**: Anthropic Claude, accessed via Replit AI Integrations.
- **Model**: `claude-sonnet-4-6`.
- **Environment Variables**: `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`.

### External Web Services (iframes)
- `micro-gpt-swmm.replit.app`: External MicroGPT trainer for Manning's Equation.
- PySWMM Explorer: External PySWMM application.
- SWMManywhere Explorer: External SWMManywhere application.
- HydroCouple Explorer: External HydroCouple application.