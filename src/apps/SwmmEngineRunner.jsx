import React, { useState, useRef, useCallback } from 'react';

const SAMPLE_MODELS = [
  { name: "Simple 3-Node Network", file: "/sample.inp", desc: "2 subcatchments, 3 junctions, 1 outfall — 6-hour storm with dynamic wave routing" },
  { name: "Greenville (All Features)", file: "/Greenville_all_SWMM5_Features.inp", desc: "Full-featured Greenville model with LID usage, Green-Ampt infiltration, dynamic wave routing — 14,000+ lines" },
];

const ENGINES = [
  {
    id: "epa-swmm5",
    name: "EPA SWMM5 (C Engine)",
    lang: "C / Python",
    icon: "\u2699\uFE0F",
    color: "#61afef",
    status: "live",
    version: "v5.2.4",
    desc: "Official EPA Storm Water Management Model engine. Compiled C library accessed via Python swmm-toolkit bindings. Industry standard for regulatory compliance.",
    effort: "Ready now",
    impact: "Production-grade simulations. Regulatory compliance. Reference results.",
  },
  {
    id: "rust-swmm5",
    name: "Rust SWMM5 Engine",
    lang: "Rust",
    icon: "\uD83E\uDD80",
    color: "#dea584",
    status: "concept",
    version: "concept",
    desc: "Memory-safe, C-speed, WASM-compilable. Could replace both the C engine AND the browser WASM engine. Compile to native, WASM, or ARM/mobile from one codebase.",
    effort: "1-2 weeks",
    impact: "Memory-safe SWMM5. WASM. Native. Mobile. Everything.",
    code: `// swmm5-rs — Rust SWMM5 Engine
// Cargo.toml dependencies: none (pure Rust)
//
// swmm5-rs/
// \u251C\u2500\u2500 Cargo.toml
// \u251C\u2500\u2500 src/
// \u2502   \u251C\u2500\u2500 lib.rs          \u2190 public API
// \u2502   \u251C\u2500\u2500 swmm5.rs        \u2190 main loop (from swmm5.c)
// \u2502   \u251C\u2500\u2500 project.rs      \u2190 data structures (from project.c)
// \u2502   \u251C\u2500\u2500 input.rs        \u2190 INP parser (from input.c)
// \u2502   \u251C\u2500\u2500 output.rs       \u2190 .out writer (from output.c)
// \u2502   \u251C\u2500\u2500 report.rs       \u2190 .rpt writer (from report.c)
// \u2502   \u251C\u2500\u2500 datetime.rs     \u2190 time handling (from datetime.c)
// \u2502   \u251C\u2500\u2500 routing.rs      \u2190 dynamic wave (from routing.c)
// \u2502   \u251C\u2500\u2500 dynwave.rs      \u2190 (from dynwave.c)
// \u2502   \u251C\u2500\u2500 node.rs         \u2190 (from node.c)
// \u2502   \u251C\u2500\u2500 link.rs         \u2190 (from link.c)
// \u2502   \u251C\u2500\u2500 xsect.rs        \u2190 (from xsect.c)
// \u2502   \u251C\u2500\u2500 ... (all 50 modules)
// \u2502   \u2514\u2500\u2500 keywords.rs     \u2190 (from keywords.c)
// \u2514\u2500\u2500 tests/

pub mod project;
pub mod input;
pub mod output;
pub mod report;
pub mod routing;
pub mod dynwave;
pub mod kinwave;
pub mod flowrout;
pub mod node;
pub mod link;
pub mod xsect;
// ... all 50 modules

use project::Project;

pub struct Simulation {
    project: Project,
    elapsed: f64,
    running: bool,
}

impl Simulation {
    pub fn open(inp_path: &str) -> Result<Self, SwmmError> {
        let project = input::parse_inp(inp_path)?;
        Ok(Simulation { project, elapsed: 0.0, running: false })
    }

    pub fn start(&mut self) -> Result<(), SwmmError> {
        self.project.initialize()?;
        self.running = true;
        Ok(())
    }

    pub fn step(&mut self) -> Result<f64, SwmmError> {
        if !self.running { return Ok(0.0); }
        let dt = routing::get_timestep(&self.project);
        routing::execute(&mut self.project, dt)?;
        self.elapsed += dt;
        if self.elapsed >= self.project.total_duration {
            self.running = false;
        }
        Ok(self.elapsed)
    }

    pub fn end_sim(&mut self) -> Result<(), SwmmError> {
        report::write_report(&self.project)?;
        output::write_output(&self.project)?;
        self.running = false;
        Ok(())
    }

    pub fn close(self) -> Result<(), SwmmError> {
        Ok(()) // Rust's ownership system handles cleanup
    }
}

// Usage:
fn main() -> Result<(), SwmmError> {
    let mut sim = Simulation::open("model.inp")?;
    sim.start()?;
    loop {
        let elapsed = sim.step()?;
        if elapsed == 0.0 { break; }
    }
    sim.end_sim()?;
    sim.close()?;
    Ok(())
}

// Compilation targets:
//   cargo build --release           \u2192 native binary
//   cargo build --target wasm32     \u2192 browser engine
//   cargo build --target aarch64    \u2192 ARM/mobile`,
  },
  {
    id: "julia-swmm5",
    name: "Julia SWMM5 Engine",
    lang: "Julia",
    icon: "\uD83D\uDFE2",
    color: "#9558b2",
    status: "concept",
    version: "concept",
    desc: "Scientific computing engine with JIT compilation for near-C speed. Native uncertainty quantification via Distributions.jl. Monte Carlo simulations trivial to implement.",
    effort: "1-2 weeks",
    impact: "SWMM5 in the Julia ecosystem. UQ built-in.",
    code: `module SWMM5

using Distributions

# All 50 modules from the Rosetta Stone translations
include("project.jl")    # from project.c \u2014 data structures
include("input.jl")      # from input.c \u2014 INP parser
include("datetime.jl")   # from datetime.c \u2014 time handling
include("keywords.jl")   # from keywords.c \u2014 token lookup
include("hash.jl")       # from hash.c \u2014 name\u2192index lookup
include("mempool.jl")    # from mempool.c \u2014 memory allocator
include("table.jl")      # from table.c \u2014 curve interpolation
include("toposort.jl")   # from toposort.c \u2014 network ordering
include("xsect.jl")      # from xsect.c \u2014 cross-section geometry
include("shape.jl")      # from shape.c \u2014 shape functions
include("transect.jl")   # from transect.c \u2014 irregular channels
include("infil.jl")      # from infil.c \u2014 infiltration models
include("subcatch.jl")   # from subcatch.c \u2014 subcatchment runoff
include("runoff.jl")     # from runoff.c \u2014 surface runoff
include("lid.jl")        # from lid.c \u2014 LID controls
include("lidproc.jl")    # from lidproc.c \u2014 LID processes
include("gwater.jl")     # from gwater.c \u2014 groundwater
include("climate.jl")    # from climate.c \u2014 climate data
include("rain.jl")       # from rain.c \u2014 rainfall processing
include("gage.jl")       # from gage.c \u2014 rain gage management
include("snow.jl")       # from snow.c \u2014 snowmelt
include("rdii.jl")       # from rdii.c \u2014 rainfall-dependent I&I
include("landuse.jl")    # from landuse.c \u2014 buildup/washoff
include("node.jl")       # from node.c \u2014 junction/storage nodes
include("link.jl")       # from link.c \u2014 conduit hydraulics
include("culvert.jl")    # from culvert.c \u2014 culvert equations
include("forcmain.jl")   # from forcmain.c \u2014 force main friction
include("roadway.jl")    # from roadway.c \u2014 roadway overtopping
include("exfil.jl")      # from exfil.c \u2014 conduit exfiltration
include("routing.jl")    # from routing.c \u2014 flow routing
include("flowrout.jl")   # from flowrout.c \u2014 routing dispatch
include("dynwave.jl")    # from dynwave.c \u2014 dynamic wave solver
include("kinwave.jl")    # from kinwave.c \u2014 kinematic wave
include("dwflow.jl")     # from dwflow.c \u2014 steady flow init
include("controls.jl")   # from controls.c \u2014 rule-based controls
include("mathexpr.jl")   # from mathexpr.c \u2014 expression parser
include("qualrout.jl")   # from qualrout.c \u2014 quality routing
include("treatmnt.jl")   # from treatmnt.c \u2014 treatment functions
include("surfqual.jl")   # from surfqual.c \u2014 surface quality
include("inflow.jl")     # from inflow.c \u2014 external inflows
include("odesolve.jl")   # from odesolve.c \u2014 ODE solver (RK5)
include("findroot.jl")   # from findroot.c \u2014 root finding
include("massbal.jl")    # from massbal.c \u2014 mass balance
include("stats.jl")      # from stats.c \u2014 statistics
include("statsrpt.jl")   # from statsrpt.c \u2014 stats reporting
include("output.jl")     # from output.c \u2014 binary output
include("report.jl")     # from report.c \u2014 text report
include("hotstart.jl")   # from hotstart.c \u2014 state save/restore
include("iface.jl")      # from iface.c \u2014 interface files
include("swmm5.jl")      # from swmm5.c \u2014 main simulation API

function run(inp_file::String; kwargs...)
    project = parse_inp(inp_file; kwargs...)
    initialize!(project)
    while !finished(project)
        step!(project)
    end
    finalize!(project)
    return results(project)
end

export run, parse_inp, initialize!, step!, results

end # module SWMM5

# \u2500\u2500\u2500 Deterministic Run \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
using .SWMM5
result = SWMM5.run("model.inp")
println("Peak flow at Out1: ", result.links["C3"].peak_flow, " CFS")

# \u2500\u2500\u2500 Monte Carlo with Uncertainty \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
using Distributions

results = [
    SWMM5.run("model.inp",
        manning_n = rand(Normal(0.013, 0.002)),
        imperv_pct = rand(Uniform(40, 60)),
        infil_rate = rand(LogNormal(log(3.0), 0.3))
    )
    for _ in 1:10_000
]

peak_flows = [r.links["C3"].peak_flow for r in results]
println("Mean peak flow: ", mean(peak_flows), " CFS")
println("95th percentile: ", quantile(peak_flows, 0.95), " CFS")
println("P(flooding): ", mean(peak_flows .> 15.0) * 100, "%")`,
  },
  {
    id: "cuda-swmm5",
    name: "CUDA GPU Engine",
    lang: "CUDA C++",
    icon: "\uD83D\uDE80",
    color: "#76b900",
    status: "concept",
    version: "concept",
    desc: "GPU-accelerated SWMM5. Run 10,000-conduit networks at real-time speed. Each GPU thread solves one conduit simultaneously. Research frontier for digital twins.",
    effort: "3-4 weeks",
    impact: "100-1000x speedup for large networks. Real-time digital twin capability.",
    code: `// cuda-swmm5 \u2014 GPU-Accelerated SWMM5 Engine
// Compile: nvcc -O3 -o swmm5_gpu swmm5_gpu.cu

#include <cuda_runtime.h>
#include <stdio.h>
#include <math.h>

// \u2500\u2500\u2500 GPU Data Structures (from project.c) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
typedef struct {
    double flow, depth, velocity;
    double area, hRad, width;
    double qFull, aFull;
    double roughness, length;
    int    upNode, dnNode;
} Conduit;

typedef struct {
    double head, depth, volume;
    double inflow, outflow, overflow;
    double invertElev, fullDepth;
    double pondedArea;
} Node;

// \u2500\u2500\u2500 GPU Kernel: Dynamic Wave Routing (from dynwave.c) \u2500\u2500\u2500
__global__ void dynwave_step(
    Conduit* conduits, Node* nodes,
    int n_links, double dt)
{
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n_links) return;

    Conduit* c = &conduits[i];
    Node* upN   = &nodes[c->upNode];
    Node* dnN   = &nodes[c->dnNode];

    // Saint-Venant momentum equation
    double dh = upN->head - dnN->head;
    double slope = dh / c->length;
    double Rh = (c->area > 0) ? c->area / (c->width + 2.0 * c->depth) : 0;

    // Manning's equation for friction slope
    double Sf = (c->flow > 0)
        ? c->roughness * c->roughness * c->flow * fabs(c->flow)
          / (pow(c->area, 10.0/3.0) * pow(Rh, 4.0/3.0) + 1e-30)
        : 0.0;

    // Update flow: explicit finite difference
    double dQ = 9.81 * c->area * (slope - Sf) * dt;
    c->flow += dQ;

    // Enforce capacity limits
    if (fabs(c->flow) > c->qFull * 1.5)
        c->flow = copysign(c->qFull * 1.5, c->flow);

    // Update depth and velocity
    c->velocity = (c->area > 1e-6) ? c->flow / c->area : 0;
}

// \u2500\u2500\u2500 GPU Kernel: Node Volume Update (from node.c) \u2500\u2500\u2500
__global__ void update_nodes(
    Node* nodes, Conduit* conduits,
    int n_nodes, int n_links, double dt)
{
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i >= n_nodes) return;

    Node* n = &nodes[i];
    double netFlow = n->inflow;

    // Sum flows from all connected conduits
    for (int j = 0; j < n_links; j++) {
        if (conduits[j].dnNode == i)
            netFlow += conduits[j].flow;   // inflow
        if (conduits[j].upNode == i)
            netFlow -= conduits[j].flow;   // outflow
    }

    n->volume += netFlow * dt;
    if (n->volume < 0) n->volume = 0;

    // Update depth from volume
    n->depth = n->volume / (n->pondedArea + 1e-6);

    // Check for flooding
    if (n->depth > n->fullDepth) {
        n->overflow = (n->depth - n->fullDepth) * n->pondedArea / dt;
        n->depth = n->fullDepth;
        n->volume = n->fullDepth * n->pondedArea;
    } else {
        n->overflow = 0;
    }
    n->head = n->invertElev + n->depth;
}

// \u2500\u2500\u2500 Host: Main Simulation Loop (from swmm5.c) \u2500\u2500\u2500\u2500\u2500\u2500
int main(int argc, char* argv[]) {
    // Parse INP file on CPU (from input.c)
    int n_nodes, n_links;
    Node*    h_nodes;
    Conduit* h_conduits;
    parse_inp(argv[1], &h_nodes, &n_nodes, &h_conduits, &n_links);

    // Allocate GPU memory
    Node*    d_nodes;
    Conduit* d_conduits;
    cudaMalloc(&d_nodes,    n_nodes * sizeof(Node));
    cudaMalloc(&d_conduits, n_links * sizeof(Conduit));

    // Copy to GPU
    cudaMemcpy(d_nodes, h_nodes, n_nodes*sizeof(Node),
               cudaMemcpyHostToDevice);
    cudaMemcpy(d_conduits, h_conduits, n_links*sizeof(Conduit),
               cudaMemcpyHostToDevice);

    int link_blocks = (n_links + 255) / 256;
    int node_blocks = (n_nodes + 255) / 256;
    double dt = 30.0;  // 30-second routing step
    double elapsed = 0, total = 86400.0; // 24 hours

    printf("GPU SWMM5: %d nodes, %d links\\n", n_nodes, n_links);
    printf("Launching kernels...\\n");

    while (elapsed < total) {
        // ALL conduits solved in parallel on GPU
        dynwave_step<<<link_blocks, 256>>>(
            d_conduits, d_nodes, n_links, dt);

        // ALL nodes updated in parallel on GPU
        update_nodes<<<node_blocks, 256>>>(
            d_nodes, d_conduits, n_nodes, n_links, dt);

        cudaDeviceSynchronize();
        elapsed += dt;
    }

    // Copy results back to CPU
    cudaMemcpy(h_nodes, d_nodes, n_nodes*sizeof(Node),
               cudaMemcpyDeviceToHost);

    printf("Simulation complete: %.0f sec in %.3f ms\\n",
           total, gpu_elapsed_ms);

    // Write report (from report.c)
    write_report("model.rpt", h_nodes, n_nodes, h_conduits, n_links);

    cudaFree(d_nodes);
    cudaFree(d_conduits);
    return 0;
}`,
  },
  {
    id: "matlab-swmm5",
    name: "MATLAB SWMM5 Engine",
    lang: "MATLAB",
    icon: "\uD83D\uDCCA",
    color: "#e16737",
    status: "concept",
    version: "concept",
    desc: "Every university. Every hydraulics classroom. Students can read and modify the engine, set breakpoints, and plot results natively with MATLAB's visualization tools.",
    effort: "2-3 weeks",
    impact: "Transformative for education. Students can set breakpoints IN the SWMM5 engine.",
    code: `%% MATLAB SWMM5 Engine
%  All 50 modules translated from the Rosetta Stone
%
%  swmm5-matlab/
%  \u251C\u2500\u2500 swmm5_run.m         \u2190 main entry (from swmm5.c)
%  \u251C\u2500\u2500 swmm5_parse.m       \u2190 INP parser (from input.c)
%  \u251C\u2500\u2500 swmm5_init.m        \u2190 initialization (from project.c)
%  \u251C\u2500\u2500 swmm5_step.m        \u2190 timestep (from routing.c)
%  \u251C\u2500\u2500 swmm5_report.m      \u2190 reporting (from report.c)
%  \u251C\u2500\u2500 dynwave_solve.m     \u2190 dynamic wave (from dynwave.c)
%  \u251C\u2500\u2500 kinwave_solve.m     \u2190 kinematic wave (from kinwave.c)
%  \u251C\u2500\u2500 xsect_props.m       \u2190 cross-sections (from xsect.c)
%  \u251C\u2500\u2500 infil_horton.m      \u2190 infiltration (from infil.c)
%  \u251C\u2500\u2500 ... (all 50 modules)
%  \u2514\u2500\u2500 tests/

function results = swmm5_run(inp_file)
    % Parse the .inp file
    project = swmm5_parse(inp_file);

    % Initialize all subsystems
    project = swmm5_init(project);

    % Topological sort for routing order
    project.order = toposort(project.nodes, project.links);

    % Main simulation loop
    t = project.start_time;
    dt = project.routing_step;
    step = 0;

    fprintf('MATLAB SWMM5 Engine\\n');
    fprintf('Nodes: %d, Links: %d, Subcatchments: %d\\n', ...
        length(project.nodes), length(project.links), ...
        length(project.subcatchments));

    while t < project.end_time
        step = step + 1;

        % Rainfall & runoff (from subcatch.c, runoff.c, infil.c)
        for i = 1:length(project.subcatchments)
            sc = project.subcatchments(i);
            rain = gage_rainfall(project.gages(sc.gage), t);
            infil = infil_rate(sc.infil_params, t, dt);
            sc.runoff = runoff_compute(sc, rain, infil, dt);
            project.subcatchments(i) = sc;
        end

        % Flow routing (from routing.c, dynwave.c)
        for idx = project.order
            link = project.links(idx);
            upNode = project.nodes(link.upNode);
            dnNode = project.nodes(link.dnNode);

            % Cross-section properties (from xsect.c)
            [A, Rh, W] = xsect_props(link.xsect, link.depth);

            % Dynamic wave solver (from dynwave.c)
            link.flow = dynwave_solve(link, upNode, dnNode, A, Rh, dt);

            project.links(idx) = link;
        end

        % Update node depths (from node.c)
        project.nodes = node_update(project.nodes, project.links, dt);

        % Mass balance (from massbal.c)
        project.massbal = massbal_update(project.massbal, ...
            project.nodes, project.links, dt);

        % Statistics (from stats.c)
        project.stats = stats_update(project.stats, ...
            project.nodes, project.links, t);

        t = t + dt;
    end

    % Generate report (from report.c, statsrpt.c)
    results = swmm5_report(project);
end

% \u2500\u2500\u2500 Usage: Run and Plot \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
results = swmm5_run('model.inp');

figure('Name', 'SWMM5 MATLAB Engine Results');

subplot(2,2,1);
plot(results.time, results.node('J1').depth, 'b-', 'LineWidth', 1.5);
xlabel('Time (hr)'); ylabel('Depth (ft)');
title('Node J1 Water Depth'); grid on;

subplot(2,2,2);
plot(results.time, results.link('C1').flow, 'r-', 'LineWidth', 1.5);
xlabel('Time (hr)'); ylabel('Flow (CFS)');
title('Conduit C1 Flow Rate'); grid on;

subplot(2,2,3);
bar(categorical({results.nodes.id}), [results.nodes.peak_depth]);
ylabel('Peak Depth (ft)'); title('Node Peak Depths');

subplot(2,2,4);
pie([results.massbal.runoff, results.massbal.infiltration, ...
     results.massbal.evaporation], ...
    {'Runoff', 'Infiltration', 'Evaporation'});
title('Water Balance');

sgtitle(sprintf('Continuity Error: %.2f%%', results.continuity_error));`,
  },
  {
    id: "js-swmm5",
    name: "JavaScript/TypeScript Engine",
    lang: "TypeScript",
    icon: "\uD83C\uDF10",
    color: "#f7df1e",
    status: "concept",
    version: "concept",
    desc: "Runs in every browser natively. No WASM needed. Powers simulation apps directly. Publish as an npm package: npm install swmm5.",
    effort: "1-2 weeks",
    impact: "SWMM5 as an npm package. Universal browser engine.",
    code: `// swmm5-js \u2014 TypeScript SWMM5 Engine
// npm install swmm5
//
// swmm5-js/
// \u251C\u2500\u2500 package.json
// \u251C\u2500\u2500 src/
// \u2502   \u251C\u2500\u2500 index.ts         \u2190 public API
// \u2502   \u251C\u2500\u2500 engine.ts        \u2190 main loop (from swmm5.c)
// \u2502   \u251C\u2500\u2500 project.ts       \u2190 data structures (from project.c)
// \u2502   \u251C\u2500\u2500 parser.ts        \u2190 INP parser (from input.c)
// \u2502   \u251C\u2500\u2500 output.ts        \u2190 result formatting (from report.c)
// \u2502   \u251C\u2500\u2500 routing.ts       \u2190 flow routing (from routing.c)
// \u2502   \u251C\u2500\u2500 dynwave.ts       \u2190 dynamic wave (from dynwave.c)
// \u2502   \u251C\u2500\u2500 ... (all 50 modules)
// \u2502   \u2514\u2500\u2500 keywords.ts
// \u2514\u2500\u2500 tests/

interface Node {
  id: string;
  invertElev: number;
  maxDepth: number;
  depth: number;
  head: number;
  inflow: number;
  overflow: number;
  volume: number;
  peakDepth: number;
}

interface Link {
  id: string;
  upNode: string;
  dnNode: string;
  length: number;
  roughness: number;
  flow: number;
  depth: number;
  velocity: number;
  peakFlow: number;
  xsect: CrossSection;
}

interface SimResults {
  node(id: string): NodeResult;
  link(id: string): LinkResult;
  continuityError: number;
  time: number[];
}

export class Simulation {
  private project: Project;
  private elapsed = 0;
  private running = false;

  constructor(inpText: string) {
    this.project = parseInp(inpText);   // from input.c
  }

  run(): SimResults {
    this.project.initialize();           // from project.c
    topoSort(this.project);              // from toposort.c
    this.running = true;

    while (this.running) {
      const dt = this.project.routingStep;

      // Hydrology: subcatchment runoff
      for (const sc of this.project.subcatchments) {
        const rain = gageRainfall(sc.gage, this.elapsed);
        const infil = infilRate(sc.infiltration, dt);
        sc.runoff = computeRunoff(sc, rain, infil, dt);
      }

      // Hydraulics: flow routing (from routing.c)
      for (const linkIdx of this.project.routingOrder) {
        const link = this.project.links[linkIdx];
        const upNode = this.project.nodes[link.upNode];
        const dnNode = this.project.nodes[link.dnNode];

        // Cross-section geometry (from xsect.c)
        const { area, hydRad, width } = xsectProps(link.xsect, link.depth);

        // Dynamic wave (from dynwave.c)
        link.flow = dynwaveSolve(link, upNode, dnNode, area, hydRad, dt);
      }

      // Node updates (from node.c)
      updateNodes(this.project.nodes, this.project.links, dt);

      // Mass balance (from massbal.c)
      updateMassBalance(this.project, dt);

      this.elapsed += dt;
      if (this.elapsed >= this.project.totalDuration) {
        this.running = false;
      }
    }

    return this.project.getResults();
  }
}

// \u2500\u2500\u2500 Usage: Browser \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
import { Simulation } from 'swmm5';

const sim = new Simulation(inpFileText);
const results = sim.run();
console.log("Peak flow:", results.link("C1").peakFlow, "CFS");
console.log("Continuity error:", results.continuityError, "%");

// \u2500\u2500\u2500 Usage: Node.js \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
import { readFileSync } from 'fs';
import { Simulation } from 'swmm5';

const inp = readFileSync('model.inp', 'utf8');
const results = new Simulation(inp).run();

// Works everywhere: Browser, Node.js, Deno, Bun
// No compilation, no WASM, no binary dependencies`,
  },
  {
    id: "wasm-swmm5",
    name: "WebAssembly (WAT) Engine",
    lang: "WAT/WASM",
    icon: "\uD83D\uDFEA",
    color: "#654ff0",
    status: "concept",
    version: "concept",
    desc: "Universal runtime engine. Runs in any WASM host: browsers, Node.js, Edge workers, Cloudflare, embedded devices. The Rosetta Stone already has the WAT translations.",
    effort: "2-3 weeks",
    impact: "Universal runtime. Browser, server, edge, embedded \u2014 anywhere WASM runs.",
    code: `;; swmm5.wat \u2014 WebAssembly Text Format SWMM5 Engine
;; Compile: wat2wasm swmm5.wat -o swmm5.wasm
;;
;; The Rosetta Stone already has WAT translations for all 50 modules.
;; This engine wires them together into a runnable WASM module.

(module
  ;; === Memory: flat byte array for all SWMM5 data ===
  (memory (export "memory") 256)  ;; 16 MB initial

  ;; === Memory Layout ===
  ;; 0x00000 - 0x0FFFF : Node data (up to 1000 nodes x 64 bytes)
  ;; 0x10000 - 0x1FFFF : Link data (up to 1000 links x 96 bytes)
  ;; 0x20000 - 0x2FFFF : Subcatchment data
  ;; 0x30000 - 0x3FFFF : Time series / tables
  ;; 0x40000 - 0x4FFFF : Results buffer

  ;; === Node struct offsets (64 bytes each) ===
  ;; 0: invertElev (f64), 8: fullDepth (f64)
  ;; 16: depth (f64), 24: head (f64)
  ;; 32: volume (f64), 40: inflow (f64)
  ;; 48: overflow (f64), 56: pondedArea (f64)

  ;; === Global state ===
  (global $n_nodes (mut i32) (i32.const 0))
  (global $n_links (mut i32) (i32.const 0))
  (global $elapsed (mut f64) (f64.const 0))
  (global $total_duration (mut f64) (f64.const 0))
  (global $dt (mut f64) (f64.const 30.0))

  ;; === Cross-section properties (from xsect.c) ===
  (func $xsect_area_circular
    (param $diameter f64) (param $depth f64) (result f64)
    (local $theta f64)
    (local $r f64)
    (local.set $r (f64.div (local.get $diameter) (f64.const 2.0)))
    (local.set $theta
      (f64.mul (f64.const 2.0)
        (call $acos
          (f64.div
            (f64.sub (local.get $r) (local.get $depth))
            (local.get $r)))))
    (f64.mul
      (f64.mul (local.get $r) (local.get $r))
      (f64.div
        (f64.sub (local.get $theta) (call $sin (local.get $theta)))
        (f64.const 2.0)))
  )

  ;; === Manning's equation (from dynwave.c) ===
  (func $manning_flow
    (param $area f64) (param $hydRad f64)
    (param $slope f64) (param $roughness f64)
    (result f64)
    ;; Q = (1/n) * A * R^(2/3) * S^(1/2)
    (f64.mul
      (f64.div (f64.const 1.0) (local.get $roughness))
      (f64.mul
        (local.get $area)
        (f64.mul
          (call $pow (local.get $hydRad)
            (f64.div (f64.const 2.0) (f64.const 3.0)))
          (call $sqrt (call $fabs (local.get $slope))))))
  )

  ;; === Dynamic wave routing step (from dynwave.c) ===
  (func $dynwave_step (export "dynwave_step")
    (param $link_idx i32) (param $dt f64)
    (local $link_ptr i32)
    (local $upNode_ptr i32) (local $dnNode_ptr i32)
    (local $dh f64) (local $slope f64)
    (local $area f64) (local $hydRad f64)
    (local $Sf f64) (local $dQ f64) (local $flow f64)

    ;; Calculate link memory address
    (local.set $link_ptr
      (i32.add (i32.const 0x10000)
        (i32.mul (local.get $link_idx) (i32.const 96))))

    ;; Head difference = upstream.head - downstream.head
    (local.set $dh
      (f64.sub
        (f64.load offset=24 (local.get $upNode_ptr))
        (f64.load offset=24 (local.get $dnNode_ptr))))

    ;; Slope = dh / length
    (local.set $slope
      (f64.div (local.get $dh)
        (f64.load offset=16 (local.get $link_ptr))))

    ;; Flow update: Q += g * A * (S0 - Sf) * dt
    (local.set $dQ
      (f64.mul (f64.const 9.81)
        (f64.mul (local.get $area)
          (f64.mul
            (f64.sub (local.get $slope) (local.get $Sf))
            (local.get $dt)))))

    ;; Store updated flow
    (f64.store offset=0 (local.get $link_ptr)
      (f64.add (local.get $flow) (local.get $dQ)))
  )

  ;; === Main simulation loop (from swmm5.c) ===
  (func $swmm_step (export "swmm_step") (result f64)
    (local $i i32)

    ;; Route flow through all links
    (local.set $i (i32.const 0))
    (block $break
      (loop $loop
        (br_if $break (i32.ge_u (local.get $i) (global.get $n_links)))
        (call $dynwave_step (local.get $i) (global.get $dt))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $loop)))

    ;; Update elapsed time
    (global.set $elapsed
      (f64.add (global.get $elapsed) (global.get $dt)))
    (global.get $elapsed)
  )

  ;; === Exported API ===
  (func $swmm_open (export "swmm_open") (param $n i32) (param $l i32)
    (global.set $n_nodes (local.get $n))
    (global.set $n_links (local.get $l)))

  (func $swmm_start (export "swmm_start") (param $duration f64)
    (global.set $total_duration (local.get $duration))
    (global.set $elapsed (f64.const 0)))

  ;; Host usage (JavaScript):
  ;; const wasm = await WebAssembly.instantiate(wasmBytes);
  ;; const { swmm_open, swmm_start, swmm_step, memory } = wasm.instance.exports;
  ;; swmm_open(n_nodes, n_links);
  ;; swmm_start(86400.0);  // 24-hour simulation
  ;; while (swmm_step() < 86400.0) { /* progress */ }
  ;; // Read results from memory buffer

  ;; Math imports from host
  (import "math" "sqrt" (func $sqrt (param f64) (result f64)))
  (import "math" "pow"  (func $pow  (param f64 f64) (result f64)))
  (import "math" "sin"  (func $sin  (param f64) (result f64)))
  (import "math" "acos" (func $acos (param f64) (result f64)))
  (import "math" "fabs" (func $fabs (param f64) (result f64)))
)`,
  },
];

export default function SwmmEngineRunner({ theme: t }) {
  const [inpContent, setInpContent] = useState('');
  const [rptContent, setRptContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('epa-swmm5');
  const [showEnginePanel, setShowEnginePanel] = useState(false);
  const fileInputRef = useRef(null);

  const activeEngine = ENGINES.find(e => e.id === selectedEngine);

  const loadFile = useCallback((content, name) => {
    setInpContent(content);
    setFileName(name);
    setRptContent('');
    setError('');
    setStatus('');
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.inp')) {
      setError('Please select a .inp file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => loadFile(ev.target.result, file.name);
    reader.readAsText(file);
  }, [loadFile]);

  const loadSample = useCallback(async (sample) => {
    try {
      setStatus('Loading sample model...');
      const resp = await fetch(sample.file);
      const text = await resp.text();
      loadFile(text, sample.file.split('/').pop());
      setStatus('Sample loaded \u2014 click Run to simulate');
    } catch (err) {
      setError('Failed to load sample: ' + err.message);
    }
  }, [loadFile]);

  const runSimulation = useCallback(async () => {
    if (!inpContent.trim()) {
      setError('No .inp file loaded');
      return;
    }

    if (activeEngine.status === 'concept') {
      setError(activeEngine.name + ' is a concept/roadmap \u2014 use the EPA SWMM5 (C Engine) to run simulations.');
      return;
    }

    setRunning(true);
    setError('');
    setRptContent('');
    setStatus('Running SWMM5 simulation via ' + activeEngine.name + '...');

    try {
      const blob = new Blob([inpContent], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('inpFile', blob, fileName || 'model.inp');

      const resp = await fetch('/api/run-swmm', {
        method: 'POST',
        body: formData,
      });

      const data = await resp.json();

      if (data.success && data.rpt) {
        setRptContent(data.rpt);
        setStatus('Simulation completed successfully via ' + activeEngine.name);
      } else if (data.rpt) {
        setRptContent(data.rpt);
        setError(data.error || 'Simulation completed with warnings');
        setStatus('');
      } else {
        setError(data.error || 'Simulation failed');
        if (data.details) setError(prev => prev + '\n' + data.details);
        setStatus('');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
      setStatus('');
    } finally {
      setRunning(false);
    }
  }, [inpContent, fileName, selectedEngine, activeEngine]);

  const downloadRpt = useCallback(() => {
    if (!rptContent) return;
    const blob = new Blob([rptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName || 'model').replace(/\.inp$/i, '') + '.rpt';
    a.click();
    URL.revokeObjectURL(url);
  }, [rptContent, fileName]);

  return (
    <div style={{
      width: '100%', height: 'calc(100vh - 46px)',
      display: 'flex', flexDirection: 'column',
      background: t.bg, color: t.text,
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 16px',
        background: t.headerBg,
        borderBottom: `1px solid ${t.border}`,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setShowEnginePanel(!showEnginePanel)}
          style={{
            padding: '5px 12px', borderRadius: 6,
            border: `2px solid ${activeEngine.color}`,
            background: activeEngine.color + '18',
            color: t.textBright, cursor: 'pointer',
            fontSize: 12, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          title="Click to switch engines"
        >
          <span style={{ fontSize: 15 }}>{activeEngine.icon}</span>
          <span>{activeEngine.name}</span>
          {activeEngine.status === 'live' && (
            <span style={{
              fontSize: 9, background: '#2ea043', color: '#fff',
              padding: '1px 5px', borderRadius: 3, fontWeight: 700,
            }}>LIVE</span>
          )}
          {activeEngine.status === 'concept' && (
            <span style={{
              fontSize: 9, background: activeEngine.color, color: '#fff',
              padding: '1px 5px', borderRadius: 3, fontWeight: 700,
            }}>CONCEPT</span>
          )}
          <span style={{ fontSize: 10, opacity: 0.6 }}>{showEnginePanel ? '\u25B2' : '\u25BC'}</span>
        </button>

        <div style={{ width: 1, height: 22, background: t.border }} />

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '5px 12px', borderRadius: 6,
            border: `1px solid ${t.border}`,
            background: t.panelBg, color: t.text,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {"\uD83D\uDCC2"} Upload .inp
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".inp"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        {SAMPLE_MODELS.map((s, i) => (
          <button
            key={i}
            onClick={() => loadSample(s)}
            title={s.desc}
            style={{
              padding: '5px 12px', borderRadius: 6,
              border: `1px solid ${t.accent}44`,
              background: t.accent + '15',
              color: t.accent, cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {"\uD83D\uDCCB"} {s.name}
          </button>
        ))}

        <button
          onClick={runSimulation}
          disabled={running || !inpContent.trim()}
          style={{
            padding: '5px 16px', borderRadius: 6, border: 'none',
            background: running || !inpContent.trim() ? t.textDim + '44' : '#2ea043',
            color: '#fff', cursor: running || !inpContent.trim() ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {running ? '\u23F3 Running...' : '\u25B6 Run'}
        </button>

        {rptContent && (
          <button
            onClick={downloadRpt}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none',
              background: t.accent, color: '#fff',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {"\u2B07\uFE0F"} Download .rpt
          </button>
        )}

        {fileName && (
          <span style={{
            fontSize: 11, color: t.textDim, marginLeft: 'auto',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {fileName}
          </span>
        )}
      </div>

      {showEnginePanel && (
        <div style={{
          padding: '12px 16px',
          background: t.headerBg,
          borderBottom: `1px solid ${t.border}`,
          display: 'flex', gap: 12, flexWrap: 'wrap',
        }}>
          {ENGINES.map(engine => (
            <div
              key={engine.id}
              onClick={() => { setSelectedEngine(engine.id); setShowEnginePanel(false); }}
              style={{
                flex: '1 1 280px', maxWidth: 500,
                padding: '12px 16px', borderRadius: 8,
                border: `2px solid ${selectedEngine === engine.id ? engine.color : t.border}`,
                background: selectedEngine === engine.id ? engine.color + '12' : t.panelBg,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{engine.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: t.textBright }}>{engine.name}</span>
                {engine.status === 'live' && (
                  <span style={{
                    fontSize: 9, background: '#2ea043', color: '#fff',
                    padding: '1px 6px', borderRadius: 3, fontWeight: 700,
                  }}>LIVE</span>
                )}
                {engine.status === 'concept' && (
                  <span style={{
                    fontSize: 9, background: engine.color, color: '#fff',
                    padding: '1px 6px', borderRadius: 3, fontWeight: 700,
                  }}>CONCEPT</span>
                )}
                <span style={{
                  fontSize: 10, color: t.textDim, marginLeft: 'auto',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{engine.version}</span>
              </div>
              <div style={{
                fontSize: 11, color: t.textDim, lineHeight: 1.5,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <span style={{
                  fontSize: 10, color: engine.color, fontWeight: 600,
                  background: engine.color + '20', padding: '1px 6px',
                  borderRadius: 3, marginRight: 6,
                }}>{engine.lang}</span>
                {engine.desc}
              </div>
              {engine.effort && (
                <div style={{
                  marginTop: 6, display: 'flex', gap: 8, fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <span style={{
                    color: '#58a6ff', background: '#58a6ff18',
                    padding: '1px 6px', borderRadius: 3,
                  }}>Effort: {engine.effort}</span>
                  <span style={{
                    color: '#3fb950', background: '#3fb95018',
                    padding: '1px 6px', borderRadius: 3, flex: 1,
                  }}>Impact: {engine.impact}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(status || error) && (
        <div style={{
          padding: '6px 16px', fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          background: error ? '#d1242f22' : t.accent + '15',
          color: error ? '#f85149' : t.accent,
          borderBottom: `1px solid ${t.border}`,
          whiteSpace: 'pre-wrap',
        }}>
          {error || status}
        </div>
      )}

      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden',
        flexDirection: window.innerWidth < 900 ? 'column' : 'row',
      }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          borderRight: window.innerWidth >= 900 ? `1px solid ${t.border}` : 'none',
          borderBottom: window.innerWidth < 900 ? `1px solid ${t.border}` : 'none',
        }}>
          <div style={{
            padding: '6px 12px', fontSize: 11, fontWeight: 700,
            color: t.textDim, background: t.headerBg,
            borderBottom: `1px solid ${t.border}`,
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>INPUT (.inp)</span>
            {inpContent && <span style={{ fontWeight: 400 }}>{inpContent.split('\n').length} lines</span>}
          </div>
          <textarea
            value={inpContent}
            onChange={(e) => setInpContent(e.target.value)}
            placeholder="Upload a .inp file or load a sample model to get started..."
            style={{
              flex: 1, width: '100%', resize: 'none',
              background: t.panelBg, color: t.text,
              border: 'none', outline: 'none',
              padding: '10px 14px', fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.6, tabSize: 4,
            }}
            spellCheck={false}
          />
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '6px 12px', fontSize: 11, fontWeight: 700,
            color: t.textDim, background: t.headerBg,
            borderBottom: `1px solid ${t.border}`,
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', justifyContent: 'space-between',
          }}>
            <span>{activeEngine.status === 'concept' ? activeEngine.name.toUpperCase() + ' CODE' : 'REPORT (.rpt)'}</span>
            {activeEngine.status !== 'concept' && rptContent && (
              <span style={{ fontWeight: 400 }}>{rptContent.split('\n').length} lines</span>
            )}
          </div>
          <pre style={{
            flex: 1, overflow: 'auto', margin: 0,
            background: t.panelBg, color: t.text,
            padding: '10px 14px', fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.6, whiteSpace: 'pre',
          }}>
            {activeEngine.status === 'concept' && activeEngine.code ? (
              activeEngine.code
            ) : rptContent ? (
              rptContent
            ) : (
              <span style={{ color: t.textDim, fontStyle: 'italic' }}>
                {inpContent
                  ? 'Click "Run" to simulate and view the report here...'
                  : 'Upload a .inp file or load a sample, then run the simulation...'}
              </span>
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
