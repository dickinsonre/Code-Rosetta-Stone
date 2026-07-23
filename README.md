# Code-Rosetta-Stone

A multi-language SWMM5 engine comparison lab: the same hydraulic modeling logic implemented side by side across 25-plus programming languages, plus a live simulation runner and an EPANET code viewer.

Live app: https://replit.com/@robertdickinson/Code-Rosetta-Stone

## What's inside

The repository holds a per-language folder for each SWMM5 implementation, including C, C++, Rust, Go, Java, Kotlin, Python, TypeScript, Ruby, Haskell, OCaml, Racket, Lisp, Fortran, Pascal, Perl, R, Scala, Tcl, Zig, Nim, Lua, Dart, Elixir, and Ada. A browser-based interface lets you browse and compare these implementations, run selected engines and view their reports, and explore an EPANET code viewer alongside the SWMM5 material. The app also includes an AI chatbot and audio features layered on top of the code-comparison core.

Not every language folder is a fully runnable engine; several are reference implementations or code views rather than live simulators. Treat swmm5-c, swmm5-rs, swmm5-rust-native, and swmm5-ts as the most actively wired-up engines, and the rest as comparison/reference material until noted otherwise.

## Why this exists

Seeing the same hydraulic modeling logic expressed in 25 languages is a useful way to understand SWMM5's core algorithms independent of any one language's idioms, and a way to explore which language ecosystems are realistic ports for a modern SWMM engine.

## Tech stack

Primarily JavaScript/Node with a Vite front end, plus a Python-based simulation path (main.py, run_swmm.py) for engine execution. Originally built and hosted on Replit.

## Getting started

git clone https://github.com/dickinsonre/Code-Rosetta-Stone.git
cd Code-Rosetta-Stone
npm install
npm run dev

If you need the Python-based simulation tools, also set up the environment described in pyproject.toml.

## Author

Robert Dickinson. 50+ years in hydraulic modeling, co-author of SWMM3, Chair of the SWMM5+ Technical Advisory Committee at CIMM.org. More at swmm5.org.
