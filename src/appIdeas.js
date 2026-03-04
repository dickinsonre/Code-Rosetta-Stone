export const appIdeas = [
  {
    id: "c-micro-engine",
    language: "C",
    languageColor: "#555555",
    icon: "\u2699\uFE0F",
    name: "SWMM5 Micro-Engine",
    tagline: "The smallest thing that could possibly simulate stormwater.",
    difficulty: "Medium",
    impact: "High",
    description: "A stripped-down, embeddable SWMM5 engine in ~2,000 lines of pure C. The full SWMM5 engine is 50,000+ lines. A micro-engine that handles the core hydraulic solver (dynamic wave routing for a simple network) in a single .c file would be embeddable in microcontrollers for real-time stormwater control (Arduino, ESP32), compilable anywhere with zero dependencies, and the ultimate teaching implementation.",
    whyThisLanguage: "SWMM5 is already C. But the full engine is 50,000+ lines. A micro-engine distills the core algorithm into its purest form \u2014 portable, embeddable, and understandable. No other language can match C for bare-metal simplicity and universal compilation.",
    features: [
      "Single-file, zero-dependency SWMM5 core",
      "Read a minimal .inp format (10 junctions, 10 conduits)",
      "Dynamic wave routing (simplified Saint-Venant)",
      "Manning's equation friction",
      "Console output of node depths and link flows",
      "< 2,000 lines, compiles with: gcc swmm_micro.c -lm -o swmm",
    ],
    architecture: `swmm_micro.c  \u2014 Single-file, zero-dependency SWMM5 core
\u251C\u2500\u2500 Read a minimal .inp format (10 junctions, 10 conduits)
\u251C\u2500\u2500 Dynamic wave routing (simplified Saint-Venant)
\u251C\u2500\u2500 Manning's equation friction
\u251C\u2500\u2500 Console output of node depths and link flows
\u2514\u2500\u2500 < 2,000 lines, compiles with: gcc swmm_micro.c -lm -o swmm`,
    codeSample: `#include <stdio.h>
#include <math.h>

typedef struct {
    double depth;       // Water depth (ft)
    double inflow;      // External inflow (cfs)
    double area;        // Plan area for storage (ft2)
    int    nLinks;      // Number of connected links
    int    linkIdx[4];  // Connected link indices
} Node;

typedef struct {
    double length;      // Conduit length (ft)
    double roughness;   // Manning's n
    double diameter;    // Pipe diameter (ft)
    double slope;       // Bed slope (ft/ft)
    double flow;        // Current flow (cfs)
    int    upNode;      // Upstream node index
    int    dnNode;      // Downstream node index
} Link;

// Manning's equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
double manningFlow(Link* lk, double depth) {
    if (depth <= 0) return 0.0;
    double y = fmin(depth, lk->diameter);
    double theta = 2.0 * acos(1.0 - 2.0 * y / lk->diameter);
    double area = (lk->diameter * lk->diameter / 4.0) * (theta - sin(theta));
    double perim = lk->diameter * theta / 2.0;
    if (perim <= 0) return 0.0;
    double rh = area / perim;
    return (1.0 / lk->roughness) * area * pow(rh, 2.0/3.0) * sqrt(lk->slope);
}

// Route flow through network for one timestep
void routeFlow(Node nodes[], Link links[], int nNodes,
               int nLinks, double dt) {
    for (int i = 0; i < nLinks; i++) {
        double upDepth = nodes[links[i].upNode].depth;
        links[i].flow = manningFlow(&links[i], upDepth);
    }
    for (int j = 0; j < nNodes; j++) {
        double netFlow = nodes[j].inflow;
        for (int i = 0; i < nLinks; i++) {
            if (links[i].dnNode == j) netFlow += links[i].flow;
            if (links[i].upNode == j) netFlow -= links[i].flow;
        }
        double dV = netFlow * dt;
        nodes[j].depth += dV / fmax(nodes[j].area, 1.0);
        if (nodes[j].depth < 0) nodes[j].depth = 0;
    }
}`,
    codeLang: "c",
  },
  {
    id: "rust-linter",
    language: "Rust",
    languageColor: "#dea584",
    icon: "\uD83D\uDD0D",
    name: "SWMM5 Safety Checker & Linter",
    tagline: "Catch model bugs before SWMM does.",
    difficulty: "Medium",
    impact: "Very High",
    description: "A static analysis tool that reads .inp files and detects errors, warnings, and suspicious parameters before simulation. Rust's entire philosophy is catching errors at compile time. Apply that same ethos to SWMM models \u2014 catch errors before runtime. Rust's strong typing, pattern matching, and zero-cost abstractions make it ideal for building a fast, exhaustive parser/validator.",
    whyThisLanguage: "Rust's entire philosophy is catching errors at compile time. Apply that same ethos to SWMM models \u2014 catch errors before runtime. Strong typing, pattern matching, and zero-cost abstractions make it ideal for building a fast, exhaustive parser/validator. Lint 1,729 models in < 5 seconds.",
    features: [
      "Parse .inp files with zero-copy parsing (nom or winnow)",
      "50+ validation rules covering common model errors",
      "Detect disconnected nodes and inverted slopes",
      "Flag unrealistic Manning's n values",
      "Find subcatchment width vs area inconsistencies",
      "Colored terminal report with severity levels",
      "CI/CD integration: exit code 1 on errors",
      "Blazing fast: lint 1,729 models in < 5 seconds",
    ],
    architecture: `swmm-lint
\u251C\u2500\u2500 Parse .inp files with zero-copy parsing (nom or winnow)
\u251C\u2500\u2500 50+ validation rules:
\u2502   \u251C\u2500\u2500 Disconnected nodes
\u2502   \u251C\u2500\u2500 Inverted slopes (downstream higher than upstream)
\u2502   \u251C\u2500\u2500 Unrealistic Manning's n values
\u2502   \u251C\u2500\u2500 Subcatchment width vs area inconsistencies
\u2502   \u251C\u2500\u2500 Missing rain gages
\u2502   \u251C\u2500\u2500 Circular dependencies in controls
\u2502   \u2514\u2500\u2500 Conduit capacity < DWF (guaranteed surcharging)
\u251C\u2500\u2500 Output: colored terminal report with severity levels
\u251C\u2500\u2500 CI/CD integration: exit code 1 on errors
\u2514\u2500\u2500 Blazing fast: lint 1,729 models in < 5 seconds`,
    codeSample: `use std::collections::HashSet;

#[derive(Debug, Clone)]
pub struct LintWarning {
    pub severity: Severity,
    pub rule: &'static str,
    pub message: String,
    pub location: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Severity { Error, Warning, Info }

pub struct SwmmModel {
    pub nodes: Vec<Node>,
    pub links: Vec<Link>,
    pub subcatchments: Vec<Subcatch>,
}

pub fn lint_model(model: &SwmmModel) -> Vec<LintWarning> {
    let mut warnings = Vec::new();

    // Rule: Disconnected nodes
    let connected: HashSet<&str> = model.links.iter()
        .flat_map(|l| vec![l.from_node.as_str(), l.to_node.as_str()])
        .collect();
    for node in &model.nodes {
        if !connected.contains(node.id.as_str()) {
            warnings.push(LintWarning {
                severity: Severity::Error,
                rule: "E001",
                message: format!("Node '{}' is disconnected", node.id),
                location: Some(node.id.clone()),
            });
        }
    }

    // Rule: Inverted slopes
    for link in &model.links {
        let up = model.find_node(&link.from_node);
        let dn = model.find_node(&link.to_node);
        if let (Some(u), Some(d)) = (up, dn) {
            if u.invert < d.invert {
                warnings.push(LintWarning {
                    severity: Severity::Warning,
                    rule: "W003",
                    message: format!(
                        "Link '{}': adverse slope ({:.2} -> {:.2})",
                        link.id, u.invert, d.invert
                    ),
                    location: Some(link.id.clone()),
                });
            }
        }
    }

    // Rule: Unrealistic Manning's n
    for link in &model.links {
        if link.roughness < 0.008 || link.roughness > 0.035 {
            warnings.push(LintWarning {
                severity: Severity::Warning,
                rule: "W007",
                message: format!(
                    "Link '{}': Manning's n={:.4} outside typical range",
                    link.id, link.roughness
                ),
                location: Some(link.id.clone()),
            });
        }
    }

    warnings
}`,
    codeLang: "rust",
  },
  {
    id: "python-orchestrator",
    language: "Python",
    languageColor: "#3572A5",
    icon: "\uD83D\uDD2C",
    name: "SWMM Scenario Orchestrator",
    tagline: "PySWMM does the running. This does the thinking.",
    difficulty: "Medium",
    impact: "Very High",
    description: "A Jupyter-native scenario management framework that wraps PySWMM with parameter sweeps, calibration, and visualization. Python owns the data science ecosystem. NumPy, pandas, matplotlib, scipy.optimize, Jupyter \u2014 no other language has this stack. Don't rebuild the engine; orchestrate it.",
    whyThisLanguage: "Python owns the data science ecosystem. NumPy, pandas, matplotlib, scipy.optimize, Jupyter \u2014 no other language has this stack. Don't rebuild the engine; orchestrate it. The most natural language for parameter sweeps, calibration workflows, and result visualization.",
    features: [
      "Define parameter sweeps with NumPy ranges",
      "Run all combinations via PySWMM in parallel",
      "Auto-generate comparison dashboards",
      "NSGA-II multi-objective calibration",
      "Export results to CSV and pandas DataFrames",
      "Jupyter-native with inline plots",
      "Sensitivity analysis with tornado diagrams",
      "Scenario diff: compare any two runs side-by-side",
    ],
    architecture: `swmm-orchestrator/
\u251C\u2500\u2500 orchestrator.py      \u2014 Core sweep engine
\u251C\u2500\u2500 calibration.py       \u2014 NSGA-II, SCE-UA, Bayesian
\u251C\u2500\u2500 visualization.py     \u2014 Matplotlib dashboards
\u251C\u2500\u2500 sensitivity.py       \u2014 Sobol, Morris screening
\u251C\u2500\u2500 io_utils.py          \u2014 .inp manipulation, CSV export
\u2514\u2500\u2500 notebooks/
    \u251C\u2500\u2500 quickstart.ipynb
    \u2514\u2500\u2500 calibration_demo.ipynb`,
    codeSample: `import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List
from concurrent.futures import ProcessPoolExecutor

@dataclass
class ParameterSweep:
    base_model: str
    parameters: Dict[str, np.ndarray]
    results: List = field(default_factory=list)

    @property
    def combinations(self):
        keys = list(self.parameters.keys())
        grids = np.meshgrid(*self.parameters.values(), indexing='ij')
        flat = [g.ravel() for g in grids]
        return [
            dict(zip(keys, vals))
            for vals in zip(*flat)
        ]

    def run(self, parallel=True, workers=8):
        combos = self.combinations
        print(f"Running {len(combos)} simulations...")
        if parallel:
            with ProcessPoolExecutor(max_workers=workers) as pool:
                self.results = list(pool.map(
                    self._run_single, combos
                ))
        else:
            self.results = [self._run_single(c) for c in combos]
        return self

    def _run_single(self, params):
        # Modify .inp, run PySWMM, collect results
        from pyswmm import Simulation
        modified_inp = self._apply_params(params)
        with Simulation(modified_inp) as sim:
            for step in sim:
                pass
            return {
                "params": params,
                "continuity_error": sim.flow_routing_error,
                "peak_flows": self._extract_peaks(sim),
            }

    def plot_peak_flows(self):
        import matplotlib.pyplot as plt
        fig, axes = plt.subplots(1, len(self.parameters),
                                 figsize=(5*len(self.parameters), 4))
        for ax, (param, values) in zip(
            np.atleast_1d(axes), self.parameters.items()
        ):
            peaks = [r["peak_flows"]["outfall"] for r in self.results]
            ax.scatter(
                [r["params"][param] for r in self.results],
                peaks, alpha=0.5, s=10
            )
            ax.set_xlabel(param)
            ax.set_ylabel("Peak Flow (cfs)")
            ax.set_title(f"Sensitivity: {param}")
        plt.tight_layout()
        plt.show()`,
    codeLang: "python",
  },
  {
    id: "fortran-hpc",
    language: "Fortran",
    languageColor: "#4d41b1",
    icon: "\u26A1",
    name: "SWMM5 HPC Parallel Solver",
    tagline: "When your model is too big for your patience.",
    difficulty: "High",
    impact: "High",
    description: "A high-performance parallel implementation of the SWMM5 dynamic wave solver using Fortran coarrays and OpenMP. Fortran still dominates HPC numerical computing. Its array operations, coarray parallelism, and decades of compiler optimization make it the fastest option for pure number-crunching on large drainage networks (10,000+ conduits). Benchmark target: solve a 50,000-conduit network 10\u00D7 faster than the C engine on a 64-core workstation.",
    whyThisLanguage: "Fortran still dominates HPC numerical computing. Its array operations, coarray parallelism, and decades of compiler optimization make it the fastest option for pure number-crunching on large drainage networks. No other language comes close for dense numerical linear algebra and parallel array operations.",
    features: [
      "Coarray parallelism: distribute conduits across images",
      "OpenMP threading for inner-loop parallelism",
      "Vectorized Saint-Venant solver with SIMD intrinsics",
      "Solve 50,000 conduits simultaneously",
      "10\u00D7 speedup over serial C engine on 64 cores",
      "MPI-compatible for cluster deployment",
      "BLAS/LAPACK integration for sparse matrix solves",
      "Fortran 2018 standard compliant",
    ],
    architecture: `swmm_hpc/
\u251C\u2500\u2500 swmm_types_mod.f90    \u2014 Derived types (node, link, network)
\u251C\u2500\u2500 swmm_routing_mod.f90  \u2014 Saint-Venant solver with OpenMP
\u251C\u2500\u2500 swmm_parallel_mod.f90 \u2014 Coarray distribution & sync
\u251C\u2500\u2500 swmm_io_mod.f90       \u2014 .inp reader, binary output
\u251C\u2500\u2500 swmm_hpc.f90          \u2014 Main program
\u2514\u2500\u2500 Makefile              \u2014 gfortran -coarray=lib -fopenmp`,
    codeSample: `module swmm_routing_mod
  use omp_lib
  implicit none

  type :: Conduit
    real(8) :: length, roughness, diameter, slope
    real(8) :: flow, area, velocity
    integer :: upstream, downstream
  end type

  type :: Network
    type(Conduit), allocatable :: conduits(:)
    real(8), allocatable :: node_depth(:)
    real(8), allocatable :: node_head(:)
    integer :: n_conduits, n_nodes
  end type

contains

  subroutine route_step(net, dt)
    type(Network), intent(inout) :: net[*]
    real(8), intent(in) :: dt
    integer :: i, img, n_local
    real(8) :: theta, a, p, rh, q

    n_local = net%n_conduits / num_images()
    img = this_image()

    !$omp parallel do private(theta, a, p, rh, q) schedule(dynamic, 64)
    do i = (img-1)*n_local + 1, min(img*n_local, net%n_conduits)
      associate(c => net%conduits(i))
        if (net%node_depth(c%upstream) > 0.0d0) then
          theta = 2.0d0 * acos(1.0d0 - 2.0d0 * &
                  net%node_depth(c%upstream) / c%diameter)
          a = (c%diameter**2 / 4.0d0) * (theta - sin(theta))
          p = c%diameter * theta / 2.0d0
          rh = a / max(p, 1.0d-10)
          q = (1.0d0/c%roughness) * a * rh**(2.0d0/3.0d0) &
              * sqrt(c%slope)
        else
          q = 0.0d0
        end if
        c%flow = q
        c%area = a
        c%velocity = q / max(a, 1.0d-10)
      end associate
    end do
    !$omp end parallel do

    sync all
    if (img == 1) call gather_results(net)
  end subroutine

end module`,
    codeLang: "fortran",
  },
  {
    id: "julia-uq",
    language: "Julia",
    languageColor: "#9558B2",
    icon: "\uD83C\uDFB2",
    name: "SWMM5 Uncertainty Quantification Lab",
    tagline: "Every SWMM parameter is uncertain. Now your model knows it.",
    difficulty: "High",
    impact: "Very High",
    description: "A probabilistic SWMM framework that propagates parameter uncertainty through simulations using Monte Carlo, polynomial chaos, and Bayesian inference. Julia combines MATLAB-like mathematical expressiveness with C-like speed. Its Distributions.jl, Turing.jl (Bayesian), DifferentialEquations.jl, and native Unicode support make probabilistic hydraulics natural and readable.",
    whyThisLanguage: "Julia combines MATLAB-like mathematical expressiveness with C-like speed. Its Distributions.jl, Turing.jl (Bayesian), DifferentialEquations.jl, and native Unicode support make probabilistic hydraulics natural and readable. The only language where you can write P(Q > q) and have it actually compute.",
    features: [
      "Define uncertain parameters with probability distributions",
      "Monte Carlo propagation (10,000+ realizations)",
      "Polynomial chaos expansion for fast UQ",
      "Bayesian calibration via Turing.jl (NUTS sampler)",
      "Exceedance probability curves",
      "95% credible intervals on all outputs",
      "Sobol sensitivity indices",
      "Native Unicode: use \u03B8, \u03C3, \u03BC in actual code",
    ],
    architecture: `SWMMUncertainty.jl/
\u251C\u2500\u2500 src/
\u2502   \u251C\u2500\u2500 SWMMUncertainty.jl  \u2014 Module entry point
\u2502   \u251C\u2500\u2500 model.jl            \u2014 SWMM model wrapper
\u2502   \u251C\u2500\u2500 propagation.jl      \u2014 MC, Latin Hypercube, PCE
\u2502   \u251C\u2500\u2500 calibration.jl      \u2014 Bayesian via Turing.jl
\u2502   \u251C\u2500\u2500 sensitivity.jl      \u2014 Sobol, Morris
\u2502   \u2514\u2500\u2500 plotting.jl         \u2014 Exceedance curves, posteriors
\u2514\u2500\u2500 examples/
    \u2514\u2500\u2500 quickstart.jl`,
    codeSample: `using Distributions, Statistics, Plots

struct UncertainParam
    name::String
    dist::Distribution
end

struct SWMMModel
    inp_path::String
    params::Vector{UncertainParam}
end

function propagate(model::SWMMModel, n_samples::Int)
    results = Vector{Dict{String,Float64}}(undef, n_samples)

    # Latin Hypercube Sampling for better coverage
    samples = [
        quantile(p.dist, (collect(1:n_samples) .- 0.5) ./ n_samples)
        for p in model.params
    ]

    Threads.@threads for i in 1:n_samples
        param_set = Dict(
            model.params[j].name => samples[j][i]
            for j in eachindex(model.params)
        )
        results[i] = run_swmm(model.inp_path, param_set)
    end

    return EnsembleResult(results, model.params)
end

function exceedance_curve(ensemble, variable::String)
    values = sort([r[variable] for r in ensemble.results],
                  rev=true)
    n = length(values)
    prob = collect(1:n) ./ (n + 1)

    plot(values, prob,
        xlabel=variable, ylabel="P(X > x)",
        title="Exceedance Probability",
        legend=false, linewidth=2)
end

function credible_interval(ensemble, variable::String,
                           level::Float64=0.95)
    values = [r[variable] for r in ensemble.results]
    \u03B1 = (1.0 - level) / 2.0
    lo = quantile(values, \u03B1)
    hi = quantile(values, 1.0 - \u03B1)
    \u03BC = mean(values)
    println("$(Int(level*100))% CI: [\$(round(lo,digits=3)), " *
            "\$(round(hi,digits=3))], mean=\$(round(\u03BC,digits=3))")
    return (lower=lo, upper=hi, mean=\u03BC)
end`,
    codeLang: "julia",
  },
  {
    id: "js-visualizer",
    language: "JavaScript",
    languageColor: "#f1e05a",
    icon: "\uD83C\uDF0A",
    name: "SWMM5 Live Network Visualizer",
    tagline: "See your stormwater model breathe.",
    difficulty: "Medium",
    impact: "Very High",
    description: "An interactive, browser-based, real-time visualization of a SWMM network during simulation \u2014 nodes pulse with depth, pipes change color with flow, flooding animates. WebGL, D3.js, Three.js, Canvas API \u2014 JavaScript owns browser-based visualization. No install, works on any device, sharable via URL.",
    whyThisLanguage: "WebGL, D3.js, Three.js, Canvas API \u2014 JavaScript owns browser-based visualization. No install, works on any device, sharable via URL. The only language where your stormwater model can run in a browser tab and be shared with a link.",
    features: [
      "Upload .inp \u2192 auto-render network as interactive graph",
      "Upload .out \u2192 animate simulation results in real-time",
      "Pipe flow velocity color gradient (blue \u2192 red)",
      "Node depth visualization (green \u2192 orange \u2192 red)",
      "Flooding animation with pulsing red halos",
      "Timeline scrubber: drag to any timestep",
      "Click any element \u2192 popup with time-series chart",
      "Export: GIF animation, PNG snapshots, SVG for reports",
    ],
    architecture: `swmm-live-viz/
\u251C\u2500\u2500 index.html           \u2014 Entry point
\u251C\u2500\u2500 src/
\u2502   \u251C\u2500\u2500 parser.js        \u2014 .inp/.out file parser
\u2502   \u251C\u2500\u2500 renderer.js      \u2014 Canvas/WebGL network renderer
\u2502   \u251C\u2500\u2500 animator.js      \u2014 Timestep animation controller
\u2502   \u251C\u2500\u2500 colormap.js      \u2014 Flow/depth color gradients
\u2502   \u251C\u2500\u2500 timeseries.js    \u2014 Click-to-chart popups
\u2502   \u2514\u2500\u2500 exporter.js      \u2014 GIF/PNG/SVG export
\u2514\u2500\u2500 demo/
    \u2514\u2500\u2500 sample_network.inp`,
    codeSample: `class NetworkRenderer {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.nodes = new Map();
    this.links = [];
    this.timestep = 0;
    this.playing = false;
  }

  parseNetwork(inpText) {
    const lines = inpText.split('\\n');
    let section = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[')) {
        section = trimmed.toLowerCase();
        continue;
      }
      if (!trimmed || trimmed.startsWith(';')) continue;
      const parts = trimmed.split(/\\s+/);
      if (section === '[junctions]') {
        this.nodes.set(parts[0], {
          id: parts[0], x: 0, y: 0,
          invert: parseFloat(parts[1]),
          depth: 0, maxDepth: parseFloat(parts[2] || 0),
        });
      }
      if (section === '[conduits]') {
        this.links.push({
          id: parts[0],
          from: parts[1], to: parts[2],
          flow: 0, velocity: 0, capacity: 1,
        });
      }
    }
    this.layoutForceDirected();
  }

  depthColor(ratio) {
    if (ratio < 0.5) {
      const t = ratio * 2;
      return \`rgb(\${Math.round(50+t*205)},\${Math.round(200-t*100)},50)\`;
    }
    const t = (ratio - 0.5) * 2;
    return \`rgb(255,\${Math.round(100-t*100)},\${Math.round(50-t*50)})\`;
  }

  flowColor(ratio) {
    const r = Math.round(50 + ratio * 205);
    const b = Math.round(255 - ratio * 205);
    return \`rgb(\${r},50,\${b})\`;
  }

  render(results) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw links (pipes) with flow-based colors
    for (const link of this.links) {
      const from = this.nodes.get(link.from);
      const to = this.nodes.get(link.to);
      const ratio = Math.min(link.flow / link.capacity, 1);
      ctx.strokeStyle = this.flowColor(ratio);
      ctx.lineWidth = 2 + ratio * 4;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    // Draw nodes with depth-based colors
    for (const [id, node] of this.nodes) {
      const ratio = node.maxDepth > 0
        ? Math.min(node.depth / node.maxDepth, 1) : 0;
      const radius = 6 + ratio * 8;
      ctx.fillStyle = this.depthColor(ratio);
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Flooding halo
      if (node.depth > node.maxDepth && node.maxDepth > 0) {
        ctx.strokeStyle = 'rgba(255,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 6 +
          Math.sin(Date.now()/200) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}`,
    codeLang: "javascript",
  },
  {
    id: "go-api-server",
    language: "Go",
    languageColor: "#00ADD8",
    icon: "\uD83D\uDE80",
    name: "SWMM Model API Server",
    tagline: "SWMM as a service, in a single binary.",
    difficulty: "Medium",
    impact: "High",
    description: "A RESTful API server that accepts SWMM models, runs simulations, and returns structured JSON results \u2014 designed for integration into web apps, dashboards, and microservice architectures. Go excels at networked services \u2014 fast compilation, built-in HTTP server, goroutines for concurrency, single binary deployment, excellent at handling many simultaneous requests.",
    whyThisLanguage: "Go excels at networked services \u2014 fast compilation, built-in HTTP server, goroutines for concurrency, single binary deployment, excellent at handling many simultaneous requests. The language was literally built for this kind of infrastructure.",
    features: [
      "POST /models \u2192 Upload .inp, get model_id",
      "POST /simulate/{id} \u2192 Run SWMM, return job_id",
      "GET /results/{job} \u2192 Structured JSON results",
      "POST /compare \u2192 Compare 2+ models side-by-side",
      "WebSocket /live/{job} \u2192 Stream results during simulation",
      "Handle 100+ simultaneous simulations with goroutines",
      "Single binary deployment: ./swmm-server",
      "Docker image: 12MB Alpine-based",
    ],
    architecture: `swmm-api-server/
\u251C\u2500\u2500 main.go              \u2014 Entry point, router setup
\u251C\u2500\u2500 handlers/
\u2502   \u251C\u2500\u2500 models.go        \u2014 Upload & manage .inp files
\u2502   \u251C\u2500\u2500 simulate.go      \u2014 Queue & run simulations
\u2502   \u251C\u2500\u2500 results.go       \u2014 Fetch & format results
\u2502   \u2514\u2500\u2500 websocket.go     \u2014 Live streaming
\u251C\u2500\u2500 engine/
\u2502   \u2514\u2500\u2500 swmm_wrapper.go  \u2014 CGO binding to libswmm5
\u251C\u2500\u2500 models/
\u2502   \u2514\u2500\u2500 types.go         \u2014 Request/response structs
\u2514\u2500\u2500 Dockerfile           \u2014 12MB Alpine image`,
    codeSample: `package main

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"

    "github.com/google/uuid"
)

type SimJob struct {
    ID       string            \`json:"id"\`
    ModelID  string            \`json:"model_id"\`
    Status   string            \`json:"status"\`
    Results  *SimResults       \`json:"results,omitempty"\`
}

type SimResults struct {
    PeakFlows       map[string]float64 \`json:"peak_flows"\`
    NodeFlooding    map[string]float64 \`json:"node_flooding"\`
    ContinuityError float64            \`json:"continuity_error"\`
}

type Server struct {
    mu     sync.RWMutex
    models map[string][]byte
    jobs   map[string]*SimJob
}

func (s *Server) handleSimulate(w http.ResponseWriter, r *http.Request) {
    var req struct {
        ModelID string \`json:"model_id"\`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request", http.StatusBadRequest)
        return
    }

    s.mu.RLock()
    inp, exists := s.models[req.ModelID]
    s.mu.RUnlock()
    if !exists {
        http.Error(w, "model not found", http.StatusNotFound)
        return
    }

    job := &SimJob{
        ID:      uuid.New().String(),
        ModelID: req.ModelID,
        Status:  "running",
    }

    s.mu.Lock()
    s.jobs[job.ID] = job
    s.mu.Unlock()

    // Run simulation in goroutine
    go func() {
        results := runSWMM(inp)
        s.mu.Lock()
        job.Status = "complete"
        job.Results = results
        s.mu.Unlock()
    }()

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "job_id": job.ID,
        "status": "queued",
    })
}

func (s *Server) handleResults(w http.ResponseWriter, r *http.Request) {
    jobID := r.URL.Query().Get("id")
    s.mu.RLock()
    job, exists := s.jobs[jobID]
    s.mu.RUnlock()
    if !exists {
        http.Error(w, "job not found", http.StatusNotFound)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(job)
}

func main() {
    s := &Server{
        models: make(map[string][]byte),
        jobs:   make(map[string]*SimJob),
    }
    http.HandleFunc("/simulate", s.handleSimulate)
    http.HandleFunc("/results", s.handleResults)
    log.Println("SWMM API Server on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}`,
    codeLang: "go",
  },
  {
    id: "zig-wasm",
    language: "Zig",
    languageColor: "#ec915c",
    icon: "\uD83C\uDF10",
    name: "SWMM5 WASM Engine",
    tagline: "SWMM in your browser. No install. No server. No excuses.",
    difficulty: "High",
    impact: "Very High",
    description: "The SWMM5 hydraulic solver compiled to WebAssembly via Zig, enabling SWMM simulations to run entirely in the browser with no server. Zig has first-class WebAssembly compilation (zig build -target wasm32-freestanding), manual memory control without a GC (critical for WASM performance), C interop for wrapping existing SWMM code, and comptime for eliminating runtime overhead.",
    whyThisLanguage: "Zig has first-class WebAssembly compilation (zig build -target wasm32-freestanding), manual memory control without a GC (critical for WASM performance), C interop for wrapping existing SWMM code, and comptime for eliminating runtime overhead. The ideal language for high-performance browser-native computation.",
    features: [
      "Core SWMM5 solver rewritten in Zig",
      "Compiles to .wasm (~200KB)",
      "JavaScript bindings for browser integration",
      "Runs entirely client-side \u2014 no server needed",
      "60% of native C speed in benchmarks",
      "Works offline (Service Worker + WASM)",
      "Embeddable in any web page with <script> tag",
      "Zero garbage collection pauses",
    ],
    architecture: `swmm-wasm/
\u251C\u2500\u2500 src/
\u2502   \u251C\u2500\u2500 solver.zig       \u2014 Dynamic wave routing core
\u2502   \u251C\u2500\u2500 network.zig      \u2014 Node/link data structures
\u2502   \u251C\u2500\u2500 parser.zig       \u2014 .inp file parser
\u2502   \u251C\u2500\u2500 manning.zig      \u2014 Manning's equation
\u2502   \u2514\u2500\u2500 exports.zig      \u2014 WASM-exported API functions
\u251C\u2500\u2500 js/
\u2502   \u251C\u2500\u2500 swmm-wasm.js     \u2014 JavaScript wrapper class
\u2502   \u2514\u2500\u2500 demo.html        \u2014 Browser demo page
\u251C\u2500\u2500 build.zig            \u2014 Build config (wasm32 target)
\u2514\u2500\u2500 swmm.wasm            \u2014 Compiled output (~200KB)`,
    codeSample: `const std = @import("std");
const math = std.math;

pub const Node = struct {
    depth: f64 = 0,
    invert: f64 = 0,
    max_depth: f64 = 0,
    inflow: f64 = 0,
    area: f64 = 100,
    n_links: u32 = 0,
};

pub const Link = struct {
    length: f64,
    roughness: f64,
    diameter: f64,
    slope: f64,
    flow: f64 = 0,
    upstream: u32,
    downstream: u32,

    pub fn manningFlow(self: *const Link, depth: f64) f64 {
        if (depth <= 0) return 0;
        const y = @min(depth, self.diameter);
        const theta = 2.0 * math.acos(1.0 - 2.0 * y / self.diameter);
        const a = (self.diameter * self.diameter / 4.0) *
                  (theta - @sin(theta));
        const p = self.diameter * theta / 2.0;
        if (p <= 0) return 0;
        const rh = a / p;
        return (1.0 / self.roughness) * a *
               math.pow(f64, rh, 2.0 / 3.0) *
               @sqrt(self.slope);
    }
};

var nodes: [256]Node = undefined;
var links: [256]Link = undefined;
var n_nodes: u32 = 0;
var n_links: u32 = 0;

export fn init() void {
    n_nodes = 0;
    n_links = 0;
}

export fn addNode(invert: f64, max_depth: f64, area: f64) u32 {
    const idx = n_nodes;
    nodes[idx] = Node{
        .invert = invert,
        .max_depth = max_depth,
        .area = area,
    };
    n_nodes += 1;
    return idx;
}

export fn addLink(up: u32, dn: u32, length: f64,
                  roughness: f64, diameter: f64, slope: f64) u32 {
    const idx = n_links;
    links[idx] = Link{
        .upstream = up, .downstream = dn,
        .length = length, .roughness = roughness,
        .diameter = diameter, .slope = slope,
    };
    n_links += 1;
    return idx;
}

export fn routeStep(dt: f64) void {
    var i: u32 = 0;
    while (i < n_links) : (i += 1) {
        const up_depth = nodes[links[i].upstream].depth;
        links[i].flow = links[i].manningFlow(up_depth);
    }
    var j: u32 = 0;
    while (j < n_nodes) : (j += 1) {
        var net_flow = nodes[j].inflow;
        i = 0;
        while (i < n_links) : (i += 1) {
            if (links[i].downstream == j) net_flow += links[i].flow;
            if (links[i].upstream == j) net_flow -= links[i].flow;
        }
        const dv = net_flow * dt;
        nodes[j].depth += dv / @max(nodes[j].area, 1.0);
        if (nodes[j].depth < 0) nodes[j].depth = 0;
    }
}

export fn getNodeDepth(idx: u32) f64 {
    return nodes[idx].depth;
}

export fn getLinkFlow(idx: u32) f64 {
    return links[idx].flow;
}`,
    codeLang: "zig",
  },
  {
    id: "cpp-xsect",
    language: "C++",
    languageColor: "#f34b7d",
    icon: "\u25CE",
    name: "Cross-Section Calculator",
    tagline: "Interactive hydraulic geometry for any pipe shape.",
    difficulty: "Medium",
    impact: "High",
    description: "A real-time cross-section geometry calculator for circular, rectangular, trapezoidal, and triangular channel shapes. Drag the water depth slider to see area, hydraulic radius, wetted perimeter, and top width update instantly with a visual cross-section diagram. Uses the classic \u03B8 = 2\u00B7acos(1-2y/D) formula for circular pipes.",
    whyThisLanguage: "C++ excels at real-time interactive computation with strong typing. The class hierarchy naturally models different cross-section shapes with virtual methods, and template metaprogramming can optimize the geometry calculations at compile time.",
    features: [
      "4 cross-section shapes: circular, rectangular, trapezoidal, triangular",
      "Real-time geometry visualization on canvas",
      "Adjustable dimensions and water depth",
      "Manning's section factor calculation",
      "Hydraulic radius, area, wetted perimeter, top width",
      "Visual water level indicator with fill",
    ],
    architecture: `CrossSectionCalc \u2014 Interactive pipe geometry calculator
\u251C\u2500\u2500 Shape selector (circular, rectangular, trapezoidal, triangular)
\u251C\u2500\u2500 Dimension sliders (diameter/width/height/side slope)
\u251C\u2500\u2500 Water depth slider with real-time update
\u251C\u2500\u2500 Canvas visualization of cross-section with water fill
\u2514\u2500\u2500 Property cards: Area, Rh, P, T, Section Factor`,
    codeSample: `class CircularXsect {
public:
    double diameter;
    
    CircularXsect(double d) : diameter(d) {}
    
    double getArea(double depth) const {
        if (depth <= 0) return 0;
        double y = std::min(depth, diameter);
        double theta = 2.0 * std::acos(1.0 - 2.0*y/diameter);
        return (diameter*diameter/8.0) * (theta - std::sin(theta));
    }
    
    double getHydRadius(double depth) const {
        double area = getArea(depth);
        double perim = getWettedPerim(depth);
        return perim > 0 ? area / perim : 0;
    }
    
    double getWettedPerim(double depth) const {
        if (depth <= 0) return 0;
        double y = std::min(depth, diameter);
        double theta = 2.0 * std::acos(1.0 - 2.0*y/diameter);
        return diameter * theta / 2.0;
    }
    
    double getSectionFactor(double depth) const {
        double a = getArea(depth);
        double r = getHydRadius(depth);
        return a * std::pow(r, 2.0/3.0);
    }
};`,
    codeLang: "c",
  },
  {
    id: "typescript-dashboard",
    language: "TypeScript",
    languageColor: "#3178c6",
    icon: "\uD83D\uDCCA",
    name: "SWMM Model Dashboard",
    tagline: "Type-safe model inspector with tabbed data views.",
    difficulty: "Medium",
    impact: "High",
    description: "A comprehensive model dashboard that displays SWMM network data in organized tabs \u2014 model summary, node table, link table, and simulation results. Run a quick simulation and see node depth time series, flooding alerts, and max flow/depth statistics. Click any node in the table to jump to its result chart.",
    whyThisLanguage: "TypeScript's strong type system catches SWMM data structure errors at compile time. Interfaces for Node, Link, and Subcatchment enforce correct data shapes, and discriminated unions model element types safely. The IDE integration provides autocomplete for every SWMM property.",
    features: [
      "4-tab interface: Summary, Nodes, Links, Results",
      "Model statistics dashboard with element counts",
      "Interactive node/link data tables",
      "Quick simulation with animated progress",
      "Node depth time-series chart on canvas",
      "Flooding detection and alert display",
    ],
    architecture: `ModelDashboard \u2014 Type-safe SWMM model inspector
\u251C\u2500\u2500 Summary tab: element counts, catchment stats, pipe info
\u251C\u2500\u2500 Nodes tab: sortable table with click-to-chart
\u251C\u2500\u2500 Links tab: conduit/pump properties with max flows
\u251C\u2500\u2500 Results tab: time-series canvas + node selector
\u2514\u2500\u2500 Quick Sim: animated 120-step simulation engine`,
    codeSample: `interface SwmmNode {
  id: string;
  type: "junction" | "storage" | "outfall";
  invert: number;
  maxDepth: number;
  depth: number;
}

interface SwmmLink {
  id: string;
  from: string;
  to: string;
  type: "conduit" | "pump" | "orifice";
  length: number;
  diameter: number;
  roughness: number;
}

interface SimResult {
  nodeDepths: Record<string, DepthRecord[]>;
  linkFlows: Record<string, FlowRecord[]>;
  flooding: FloodEvent[];
  maxDepths: Record<string, number>;
  maxFlows: Record<string, number>;
}

function findNodeQual(
  node: SwmmNode,
  inflows: { flow: number; conc: number }[],
  volume: number,
  oldConc: number,
  dt: number
): number {
  const totalQ = inflows.reduce((s, i) => s + i.flow, 0);
  const massIn = inflows.reduce((s, i) => s + i.flow * i.conc, 0);
  return (massIn + volume * oldConc / dt) / (totalQ + volume / dt);
}`,
    codeLang: "typescript",
  },
  {
    id: "matlab-hydrograph",
    language: "MATLAB",
    languageColor: "#e16737",
    icon: "\uD83D\uDCC8",
    name: "SCS Hydrograph Plotter",
    tagline: "Design storm generation with SCS unit hydrograph response.",
    difficulty: "Medium",
    impact: "High",
    description: "Generate design storm hyetographs using 6 different storm distributions (SCS Types I, IA, II, III, Uniform, and Chicago), then compute the runoff response using the SCS Curve Number method and unit hydrograph convolution. See both the rainfall hyetograph and the resulting runoff hydrograph plotted together with peak flow annotation.",
    whyThisLanguage: "MATLAB is the standard for hydrologic engineering analysis. Its matrix operations make convolution trivial, built-in plotting produces publication-quality figures, and every civil engineering student learns MATLAB. The vectorized operations map naturally to time-series rainfall-runoff computations.",
    features: [
      "6 storm distributions: SCS I/IA/II/III, Uniform, Chicago",
      "Adjustable total depth, duration, and time step",
      "SCS Curve Number runoff computation",
      "Unit hydrograph convolution for flow response",
      "Dual canvas: rainfall hyetograph + runoff hydrograph",
      "Peak flow annotation and runoff statistics",
    ],
    architecture: `HydrographPlotter \u2014 Design storm + SCS runoff calculator
\u251C\u2500\u2500 Storm type selector (6 distributions)
\u251C\u2500\u2500 Parameter controls (depth, duration, CN, area, Tc)
\u251C\u2500\u2500 Rainfall hyetograph canvas (bars + cumulative line)
\u251C\u2500\u2500 Runoff hydrograph canvas (area fill + peak marker)
\u2514\u2500\u2500 Summary cards: peak flow, total rainfall, runoff ratio`,
    codeSample: `% SCS Curve Number Runoff Computation
function [Q, Pe] = scs_runoff(P, CN, area_acres, Tc_min)
    S = (1000/CN) - 10;           % potential max retention (in)
    Ia = 0.2 * S;                  % initial abstraction (in)
    
    % Cumulative excess precipitation
    Pe_cum = zeros(size(P));
    P_cum = cumsum(P);
    for i = 1:length(P)
        if P_cum(i) > Ia
            Pe_cum(i) = (P_cum(i) - Ia)^2 / (P_cum(i) - Ia + S);
        end
    end
    Pe = diff([0 Pe_cum]);         % incremental excess
    
    % SCS unit hydrograph
    tp = 0.6 * Tc_min;            % time to peak (min)
    qp = 484 * area_acres / tp;   % peak unit discharge
    tb = 2.67 * tp;               % base time
    t = 0:5:tb;
    uh = qp * (t/tp).^3 .* exp(3*(1 - t/tp));
    
    % Convolution
    Q = conv(Pe, uh) * 0.01;
    Q = Q(1:length(P));
end`,
    codeLang: "python",
  },
  {
    id: "csharp-designstorm",
    language: "C#",
    languageColor: "#178600",
    icon: "\u26C8",
    name: "Design Storm Generator",
    tagline: "IDF curves and alternating block method for any US city.",
    difficulty: "Medium",
    impact: "Very High",
    description: "Generate synthetic design storms using the alternating block method with IDF (Intensity-Duration-Frequency) curve parameters for 8 US cities. Select a city, return period, and duration to produce a design storm hyetograph. Includes interactive IDF curve display showing all return periods.",
    whyThisLanguage: "C# offers robust engineering software patterns with strong typing, LINQ for data processing, and excellent IDE support. The class-based architecture with interfaces models the IDF/storm generation pipeline cleanly, and async patterns handle long simulations without blocking the UI.",
    features: [
      "8 US cities with fitted IDF curve parameters",
      "6 return periods (2, 5, 10, 25, 50, 100-year)",
      "Alternating block method storm generation",
      "Interactive IDF curve display",
      "Adjustable duration and time step",
      "Storm statistics: total depth, peak intensity",
    ],
    architecture: `DesignStormGen \u2014 IDF-based synthetic storm generator
\u251C\u2500\u2500 City selector with IDF parameters
\u251C\u2500\u2500 Return period buttons (2yr \u2013 100yr)
\u251C\u2500\u2500 Duration/timestep sliders
\u251C\u2500\u2500 IDF curves canvas (all return periods)
\u251C\u2500\u2500 Alternating block hyetograph canvas
\u2514\u2500\u2500 Storm statistics cards`,
    codeSample: `public class IdfCurve
{
    public double A { get; set; }
    public double B { get; set; }
    public double N { get; set; }
    
    public double GetIntensity(double duration, int returnPeriod)
    {
        double rpFactor = Math.Log10(returnPeriod);
        return (A * (0.5 + rpFactor * 0.5)) / Math.Pow(duration + B, N);
    }
}

public class AlternatingBlockStorm
{
    public List<double> Generate(IdfCurve idf, int returnPeriod,
                                  double totalDuration, double dt)
    {
        int steps = (int)(totalDuration / dt);
        var depths = new List<double>();
        
        for (int i = 1; i <= steps; i++)
        {
            double dur = i * dt;
            double avgI = idf.GetIntensity(dur, returnPeriod);
            depths.Add(avgI * dur / 60.0);
        }
        
        // Compute incremental depths
        var increments = new List<double> { depths[0] };
        for (int i = 1; i < depths.Count; i++)
            increments.Add(depths[i] - depths[i - 1]);
        
        // Sort descending, place alternating from center
        increments.Sort((a, b) => b.CompareTo(a));
        var result = new double[steps];
        int center = steps / 2;
        for (int i = 0; i < increments.Count; i++)
        {
            int offset = (i + 1) / 2;
            int idx = i % 2 == 0 ? center + offset : center - offset;
            if (idx >= 0 && idx < steps)
                result[idx] = increments[i] / (dt / 60.0);
        }
        return result.ToList();
    }
}`,
    codeLang: "c",
  },
  {
    id: "java-eventlogger",
    language: "Java",
    languageColor: "#b07219",
    icon: "\uD83D\uDCDD",
    name: "Simulation Event Logger",
    tagline: "Real-time event stream with filtering and search.",
    difficulty: "Medium",
    impact: "High",
    description: "A real-time event logging system that captures simulation events as they happen \u2014 flooding, surcharging, pump operations, gate control actions, backflow, and overflow. Events stream in live during simulation with color-coded severity, filterable by type, and searchable by element or description. Includes summary statistics after completion.",
    whyThisLanguage: "Java's enterprise patterns (Observer, Strategy, logging frameworks like SLF4J/Log4j) make it ideal for structured event processing. The type-safe enum system models event categories, and Java's concurrent collections handle real-time event streaming safely across threads.",
    features: [
      "8 event types: Flooding, Surcharge, Dry, Pump On/Off, Overflow, Backflow, Control",
      "Real-time event streaming during simulation",
      "Filter by event type with count badges",
      "Free-text search across element IDs and descriptions",
      "Color-coded severity with icons",
      "Post-simulation summary statistics",
    ],
    architecture: `EventLogger \u2014 Structured simulation event capture
\u251C\u2500\u2500 Event type system (8 categories with icons/colors)
\u251C\u2500\u2500 Simulation engine generating contextual events
\u251C\u2500\u2500 Live streaming display (batched updates)
\u251C\u2500\u2500 Type filter buttons with counts
\u251C\u2500\u2500 Search bar for element/description matching
\u2514\u2500\u2500 Summary grid: event counts by type`,
    codeSample: `public enum EventType {
    FLOODING("Flooding", "\u26A0"),
    SURCHARGE("Surcharge", "\u26A1"),
    PUMP_ON("Pump On", "\u25B6"),
    PUMP_OFF("Pump Off", "\u23F8"),
    OVERFLOW("Overflow", "\u2B06"),
    BACKFLOW("Backflow", "\u21C4"),
    CONTROL("Control", "\u2699");
    
    private final String label;
    private final String icon;
    EventType(String label, String icon) {
        this.label = label;
        this.icon = icon;
    }
}

public class SimEvent {
    private final long timeSeconds;
    private final EventType type;
    private final String elementId;
    private final double value;
    private final String detail;
    
    public SimEvent(long time, EventType type,
                    String element, double value, String detail) {
        this.timeSeconds = time;
        this.type = type;
        this.elementId = element;
        this.value = value;
        this.detail = detail;
    }
}

public class EventLogger {
    private final List<SimEvent> events = new CopyOnWriteArrayList<>();
    private final Map<EventType, AtomicInteger> counts = 
        new ConcurrentHashMap<>();
    
    public void log(SimEvent event) {
        events.add(event);
        counts.computeIfAbsent(event.getType(), 
            k -> new AtomicInteger()).incrementAndGet();
    }
    
    public List<SimEvent> filter(EventType type) {
        return events.stream()
            .filter(e -> e.getType() == type)
            .collect(Collectors.toList());
    }
}`,
    codeLang: "java",
  },
];

export const summaryMatrix = [
  { language: "C", app: "Micro-Engine (2K lines)", playsTo: "Minimalism, portability, embedded", difficulty: "Medium", impact: "High" },
  { language: "Rust", app: "Model Linter / Safety Checker", playsTo: "Error prevention, parsing, speed", difficulty: "Medium", impact: "Very High" },
  { language: "Python", app: "Scenario Orchestrator", playsTo: "Data science, visualization, ecosystem", difficulty: "Medium", impact: "Very High" },
  { language: "Fortran", app: "HPC Parallel Solver", playsTo: "Raw numerical performance", difficulty: "High", impact: "High" },
  { language: "Julia", app: "Uncertainty Quantification Lab", playsTo: "Math expressiveness + speed", difficulty: "High", impact: "Very High" },
  { language: "JavaScript", app: "Live Network Visualizer", playsTo: "Browser visualization, accessibility", difficulty: "Medium", impact: "Very High" },
  { language: "Go", app: "Model API Server", playsTo: "Networked services, concurrency", difficulty: "Medium", impact: "High" },
  { language: "Zig", app: "WASM Engine", playsTo: "WebAssembly, zero-dependency browser", difficulty: "High", impact: "Very High" },
  { language: "C++", app: "Cross-Section Calculator", playsTo: "OOP geometry, real-time computation", difficulty: "Medium", impact: "High" },
  { language: "TypeScript", app: "Model Dashboard", playsTo: "Type-safe data views, IDE support", difficulty: "Medium", impact: "High" },
  { language: "MATLAB", app: "SCS Hydrograph Plotter", playsTo: "Engineering analysis, convolution", difficulty: "Medium", impact: "High" },
  { language: "C#", app: "Design Storm Generator", playsTo: "IDF curves, engineering software", difficulty: "Medium", impact: "Very High" },
  { language: "Java", app: "Simulation Event Logger", playsTo: "Enterprise patterns, event streaming", difficulty: "Medium", impact: "High" },
];
