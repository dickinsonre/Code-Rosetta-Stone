const epanetModules = {
  "hydraul.c — Hydraulic Solver (GGA)": {
    category: "Core Solver",
    difficulty: "advanced",
    tags: ["hydraulics", "global gradient", "todini-pilati", "newton-raphson", "jacobian", "head", "flow", "convergence", "pressurized"],
    description: "Solves the system of nonlinear pipe network equations using the Global Gradient Algorithm (Todini & Pilati, 1987). At each time step, assembles a Jacobian matrix of head loss gradients, solves the sparse linear system for node heads, updates pipe flows, and iterates until convergence. This is the heart of EPANET — analogous to SWMM5's dynwave.c but for pressurized networks.",
    equations: "[A]{dH} = {F}; hf = r·|Q|^0.852·Q (Hazen-Williams); 1/√f = -2·log₁₀(ε/3.7D + 2.51/(Re·√f)) (Colebrook-White)",
    inputs: "Pipe lengths, diameters, roughness coefficients, node elevations, demands, head loss formula selection",
    outputs: "Node heads (ft), pipe flows (cfs), node pressures (psi), iteration count",
    links: [
      { label: "EPA EPANET Source", url: "https://github.com/USEPA/EPANET2.2" },
      { label: "WNTR Python Toolkit", url: "https://github.com/USEPA/WNTR" },
      { label: "Todini & Pilati (1987) Paper", url: "https://doi.org/10.1061/9780784408438" },
    ],
    c: `// hydraul.c — EPANET Hydraulic Solver
// Global Gradient Algorithm (Todini & Pilati, 1987)
// Solves: [A]{dH} = {F} for node heads in a pressurized pipe network
// where A = Jacobian matrix, dH = head corrections, F = residual vector

#include <math.h>
#include <stdlib.h>

#define GRAVITY   32.2       // ft/s²
#define VISCOSITY 1.1e-5     // ft²/s (water at 60°F)
#define HAZEN_WILLIAMS 1
#define DARCY_WEISBACH 2
#define CHEZY_MANNING  3

typedef struct {
    int    from_node;
    int    to_node;
    double length;        // ft
    double diameter;      // ft
    double roughness;     // C-factor (H-W) or epsilon (D-W)
    int    formula;       // H-W, D-W, or C-M
    double flow;          // current flow (cfs)
    double resistance;    // precomputed resistance factor
} TPipe;

typedef struct {
    double elevation;     // ft
    double demand;        // cfs
    double head;          // ft (elevation + pressure)
    double pressure;      // psi
} TNode;

typedef struct {
    TNode* nodes;
    TPipe* pipes;
    int    n_nodes;
    int    n_pipes;
    int    max_iter;      // max Newton-Raphson iterations
    double tolerance;     // convergence tolerance (ft)
    int    formula;       // head loss formula
} TNetwork;

// ─── PIPE HEAD LOSS ───

double pipe_headloss_hw(TPipe* p, double flow)
{
    // Hazen-Williams: hf = r * |Q|^0.852 * Q
    // where r = 4.727 * L / (C^1.852 * D^4.871)
    double r, hf;
    
    r = 4.727 * p->length /
        (pow(p->roughness, 1.852) * pow(p->diameter, 4.871));
    hf = r * pow(fabs(flow), 0.852) * flow;
    
    return hf;
}

double pipe_headloss_dw(TPipe* p, double flow)
{
    // Darcy-Weisbach: hf = r * f * |Q| * Q
    // where r = 0.0252 * L / D^5
    // and f = Colebrook-White friction factor
    double r, f, Re, v, area;
    
    area = 3.14159265 * p->diameter * p->diameter / 4.0;
    v = fabs(flow) / area;
    Re = v * p->diameter / VISCOSITY;
    
    if (Re < 2000.0)
        f = 64.0 / (Re + 1e-10);         // Laminar
    else
        f = colebrook_white(Re, p->roughness / p->diameter);
    
    r = 0.0252 * p->length / pow(p->diameter, 5.0);
    
    return r * f * fabs(flow) * flow;
}

double colebrook_white(double Re, double e_D)
{
    // Iterative Colebrook-White equation:
    // 1/√f = -2·log₁₀(e/(3.7D) + 2.51/(Re·√f))
    double f, f_new, sqrt_f;
    int iter;
    
    f = 0.02;  // initial guess
    for (iter = 0; iter < 40; iter++) {
        sqrt_f = sqrt(f);
        f_new = 1.0 / pow(-2.0 * log10(e_D / 3.7 +
                2.51 / (Re * sqrt_f)), 2.0);
        if (fabs(f_new - f) < 1e-8) break;
        f = f_new;
    }
    return f;
}

// ─── GRADIENT OF HEAD LOSS (for Jacobian) ───

double pipe_gradient(TPipe* p, double flow)
{
    // dh/dQ — needed for Newton-Raphson Jacobian matrix
    double abs_flow = fabs(flow);
    if (abs_flow < 1e-10) abs_flow = 1e-10;
    
    switch (p->formula) {
        case HAZEN_WILLIAMS:
            return 1.852 * p->resistance * pow(abs_flow, 0.852);
        case DARCY_WEISBACH:
            return 2.0 * p->resistance * abs_flow;
        case CHEZY_MANNING:
            return 2.0 * p->resistance * abs_flow;
        default:
            return 0.0;
    }
}

// ─── GLOBAL GRADIENT ALGORITHM ───

int hydraul_solve(TNetwork* net)
{
    // Todini-Pilati (1987) Global Gradient Algorithm
    // Solves for node heads and pipe flows simultaneously
    //
    // At each iteration:
    //   1. Compute head loss and gradient for each pipe
    //   2. Assemble [A] matrix and {F} vector
    //   3. Solve [A]{dH} = {F} for head corrections
    //   4. Update heads: H = H + dH
    //   5. Update flows: Q = Q - (gradient)^-1 * (hf - dH)
    //   6. Check convergence
    
    int iter, i, j, n1, n2;
    double* A;          // Jacobian matrix (sparse)
    double* F;          // Right-hand side vector
    double* dH;         // Head correction vector
    double  hf;         // Head loss
    double  gf;         // Gradient dh/dQ
    double  max_change;
    
    int n = net->n_nodes;
    int m = net->n_pipes;
    
    A  = (double*)calloc(n * n, sizeof(double));
    F  = (double*)calloc(n, sizeof(double));
    dH = (double*)calloc(n, sizeof(double));
    
    for (iter = 0; iter < net->max_iter; iter++) {
        
        // Zero matrix and vector
        for (i = 0; i < n * n; i++) A[i] = 0.0;
        for (i = 0; i < n; i++) F[i] = -net->nodes[i].demand;
        
        // ─── ASSEMBLE SYSTEM ───
        for (i = 0; i < m; i++) {
            TPipe* p = &net->pipes[i];
            n1 = p->from_node;
            n2 = p->to_node;
            
            // Head loss across pipe
            hf = pipe_headloss_hw(p, p->flow);
            
            // Gradient (dh/dQ)
            gf = pipe_gradient(p, p->flow);
            if (gf < 1e-10) gf = 1e-10;
            
            double inv_gf = 1.0 / gf;
            
            // Add to Jacobian matrix A[n1][n1], A[n2][n2], A[n1][n2]
            A[n1 * n + n1] += inv_gf;
            A[n2 * n + n2] += inv_gf;
            A[n1 * n + n2] -= inv_gf;
            A[n2 * n + n1] -= inv_gf;
            
            // Add to right-hand side F
            double flow_correction = p->flow - 
                (hf - (net->nodes[n1].head - net->nodes[n2].head)) / gf;
            
            F[n1] -= flow_correction;
            F[n2] += flow_correction;
        }
        
        // ─── SOLVE LINEAR SYSTEM ───
        // A * dH = F  (Cholesky or LU factorization)
        solve_linear_system(A, F, dH, n);
        
        // ─── UPDATE HEADS ───
        max_change = 0.0;
        for (i = 0; i < n; i++) {
            net->nodes[i].head += dH[i];
            if (fabs(dH[i]) > max_change)
                max_change = fabs(dH[i]);
        }
        
        // ─── UPDATE FLOWS ───
        for (i = 0; i < m; i++) {
            TPipe* p = &net->pipes[i];
            n1 = p->from_node;
            n2 = p->to_node;
            
            hf = pipe_headloss_hw(p, p->flow);
            gf = pipe_gradient(p, p->flow);
            
            double head_diff = net->nodes[n1].head - net->nodes[n2].head;
            p->flow -= (hf - head_diff) / gf;
        }
        
        // ─── CHECK CONVERGENCE ───
        if (max_change < net->tolerance)
            break;
    }
    
    // Update pressures from heads
    for (i = 0; i < n; i++) {
        net->nodes[i].pressure = 
            (net->nodes[i].head - net->nodes[i].elevation) * 0.4333;
    }
    
    free(A);
    free(F);
    free(dH);
    
    return iter;
}`,
    rust: `// hydraul.rs — EPANET Hydraulic Solver in Rust
// Global Gradient Algorithm (Todini & Pilati, 1987)

const GRAVITY: f64 = 32.2;
const VISCOSITY: f64 = 1.1e-5;

#[derive(Clone, Copy, PartialEq)]
pub enum HeadLossFormula { HazenWilliams, DarcyWeisbach, ChezyManning }

pub struct Pipe {
    pub from_node: usize,
    pub to_node: usize,
    pub length: f64,
    pub diameter: f64,
    pub roughness: f64,
    pub formula: HeadLossFormula,
    pub flow: f64,
    pub resistance: f64,
}

pub struct Node {
    pub elevation: f64,
    pub demand: f64,
    pub head: f64,
    pub pressure: f64,
}

pub struct Network {
    pub nodes: Vec<Node>,
    pub pipes: Vec<Pipe>,
    pub max_iter: usize,
    pub tolerance: f64,
}

impl Pipe {
    pub fn headloss(&self, flow: f64) -> f64 {
        match self.formula {
            HeadLossFormula::HazenWilliams => {
                let r = 4.727 * self.length /
                    (self.roughness.powf(1.852) * self.diameter.powf(4.871));
                r * flow.abs().powf(0.852) * flow
            }
            HeadLossFormula::DarcyWeisbach => {
                let area = std::f64::consts::PI * self.diameter.powi(2) / 4.0;
                let v = flow.abs() / area;
                let re = v * self.diameter / VISCOSITY;
                let f = if re < 2000.0 {
                    64.0 / (re + 1e-10)
                } else {
                    colebrook_white(re, self.roughness / self.diameter)
                };
                let r = 0.0252 * self.length / self.diameter.powf(5.0);
                r * f * flow.abs() * flow
            }
            HeadLossFormula::ChezyManning => {
                let r = 4.66 * self.roughness.powi(2) * self.length /
                    self.diameter.powf(5.33);
                r * flow.abs() * flow
            }
        }
    }

    pub fn gradient(&self, flow: f64) -> f64 {
        let abs_flow = flow.abs().max(1e-10);
        match self.formula {
            HeadLossFormula::HazenWilliams =>
                1.852 * self.resistance * abs_flow.powf(0.852),
            HeadLossFormula::DarcyWeisbach =>
                2.0 * self.resistance * abs_flow,
            HeadLossFormula::ChezyManning =>
                2.0 * self.resistance * abs_flow,
        }
    }
}

fn colebrook_white(re: f64, e_d: f64) -> f64 {
    let mut f = 0.02_f64;
    for _ in 0..40 {
        let sqrt_f = f.sqrt();
        let f_new = 1.0 / (-2.0 * (e_d / 3.7 +
            2.51 / (re * sqrt_f)).log10()).powi(2);
        if (f_new - f).abs() < 1e-8 { break; }
        f = f_new;
    }
    f
}

impl Network {
    pub fn solve_hydraulics(&mut self) -> usize {
        let n = self.nodes.len();
        let m = self.pipes.len();

        let mut a_matrix = vec![0.0_f64; n * n];
        let mut f_vector = vec![0.0_f64; n];
        let mut dh = vec![0.0_f64; n];

        for iter in 0..self.max_iter {
            // Zero system
            a_matrix.fill(0.0);
            for i in 0..n {
                f_vector[i] = -self.nodes[i].demand;
            }

            // Assemble from each pipe
            for pipe in &self.pipes {
                let n1 = pipe.from_node;
                let n2 = pipe.to_node;

                let hf = pipe.headloss(pipe.flow);
                let gf = pipe.gradient(pipe.flow).max(1e-10);
                let inv_gf = 1.0 / gf;

                // Jacobian entries
                a_matrix[n1 * n + n1] += inv_gf;
                a_matrix[n2 * n + n2] += inv_gf;
                a_matrix[n1 * n + n2] -= inv_gf;
                a_matrix[n2 * n + n1] -= inv_gf;

                // RHS
                let head_diff = self.nodes[n1].head - self.nodes[n2].head;
                let flow_corr = pipe.flow - (hf - head_diff) / gf;
                f_vector[n1] -= flow_corr;
                f_vector[n2] += flow_corr;
            }

            // Solve A * dH = F
            solve_linear(&a_matrix, &f_vector, &mut dh, n);

            // Update heads and check convergence
            let max_change = dh.iter()
                .enumerate()
                .map(|(i, &delta)| {
                    self.nodes[i].head += delta;
                    delta.abs()
                })
                .fold(0.0_f64, f64::max);

            // Update flows
            for pipe in &mut self.pipes {
                let hf = pipe.headloss(pipe.flow);
                let gf = pipe.gradient(pipe.flow).max(1e-10);
                let head_diff = self.nodes[pipe.from_node].head
                    - self.nodes[pipe.to_node].head;
                pipe.flow -= (hf - head_diff) / gf;
            }

            if max_change < self.tolerance {
                // Update pressures
                for node in &mut self.nodes {
                    node.pressure =
                        (node.head - node.elevation) * 0.4333;
                }
                return iter + 1;
            }
        }
        self.max_iter
    }
}`,
    python: `# hydraul.py — EPANET Hydraulic Solver in Python
# Global Gradient Algorithm (Todini & Pilati, 1987)

import math
import numpy as np
from dataclasses import dataclass, field
from enum import Enum
from typing import List

GRAVITY = 32.2
VISCOSITY = 1.1e-5

class Formula(Enum):
    HAZEN_WILLIAMS = 1
    DARCY_WEISBACH = 2
    CHEZY_MANNING = 3

@dataclass
class Pipe:
    from_node: int
    to_node: int
    length: float
    diameter: float
    roughness: float
    formula: Formula = Formula.HAZEN_WILLIAMS
    flow: float = 0.0
    resistance: float = 0.0

    def headloss(self, flow: float) -> float:
        """Compute friction head loss for given flow"""
        if self.formula == Formula.HAZEN_WILLIAMS:
            r = 4.727 * self.length / (
                self.roughness ** 1.852 * self.diameter ** 4.871)
            return r * abs(flow) ** 0.852 * flow

        elif self.formula == Formula.DARCY_WEISBACH:
            area = math.pi * self.diameter ** 2 / 4.0
            v = abs(flow) / area
            re = v * self.diameter / VISCOSITY
            f = 64.0 / max(re, 1e-10) if re < 2000 else \\
                colebrook_white(re, self.roughness / self.diameter)
            r = 0.0252 * self.length / self.diameter ** 5
            return r * f * abs(flow) * flow

        else:  # Chezy-Manning
            r = 4.66 * self.roughness ** 2 * self.length / \\
                self.diameter ** 5.33
            return r * abs(flow) * flow

    def gradient(self, flow: float) -> float:
        """Compute dh/dQ for Jacobian matrix"""
        abs_flow = max(abs(flow), 1e-10)
        if self.formula == Formula.HAZEN_WILLIAMS:
            return 1.852 * self.resistance * abs_flow ** 0.852
        else:
            return 2.0 * self.resistance * abs_flow

@dataclass
class Node:
    elevation: float = 0.0
    demand: float = 0.0
    head: float = 0.0
    pressure: float = 0.0

@dataclass
class Network:
    nodes: List[Node] = field(default_factory=list)
    pipes: List[Pipe] = field(default_factory=list)
    max_iter: int = 200
    tolerance: float = 0.001

    def solve_hydraulics(self) -> int:
        """Global Gradient Algorithm — Todini & Pilati (1987)"""
        n = len(self.nodes)
        m = len(self.pipes)

        for iteration in range(self.max_iter):
            # Initialize system — numpy for speed
            A = np.zeros((n, n))
            F = np.array([-node.demand for node in self.nodes])

            # Assemble from each pipe
            for pipe in self.pipes:
                n1, n2 = pipe.from_node, pipe.to_node
                hf = pipe.headloss(pipe.flow)
                gf = max(pipe.gradient(pipe.flow), 1e-10)
                inv_gf = 1.0 / gf

                # Jacobian matrix
                A[n1, n1] += inv_gf
                A[n2, n2] += inv_gf
                A[n1, n2] -= inv_gf
                A[n2, n1] -= inv_gf

                # Right-hand side
                head_diff = self.nodes[n1].head - self.nodes[n2].head
                flow_corr = pipe.flow - (hf - head_diff) / gf
                F[n1] -= flow_corr
                F[n2] += flow_corr

            # Solve A * dH = F
            dH = np.linalg.solve(A, F)

            # Update heads
            max_change = 0.0
            for i in range(n):
                self.nodes[i].head += dH[i]
                max_change = max(max_change, abs(dH[i]))

            # Update flows
            for pipe in self.pipes:
                hf = pipe.headloss(pipe.flow)
                gf = max(pipe.gradient(pipe.flow), 1e-10)
                head_diff = (self.nodes[pipe.from_node].head -
                             self.nodes[pipe.to_node].head)
                pipe.flow -= (hf - head_diff) / gf

            # Check convergence
            if max_change < self.tolerance:
                for node in self.nodes:
                    node.pressure = (
                        (node.head - node.elevation) * 0.4333)
                return iteration + 1

        return self.max_iter

def colebrook_white(re: float, e_d: float) -> float:
    """Iterative Colebrook-White friction factor"""
    f = 0.02
    for _ in range(40):
        sqrt_f = math.sqrt(f)
        f_new = 1.0 / (-2.0 * math.log10(
            e_d / 3.7 + 2.51 / (re * sqrt_f))) ** 2
        if abs(f_new - f) < 1e-8:
            break
        f = f_new
    return f`,
    julia: `# hydraul.jl — EPANET Hydraulic Solver in Julia
# Global Gradient Algorithm (Todini & Pilati, 1987)
# Julia's native linear algebra (LAPACK) makes the matrix solve trivial

const GRAVITY = 32.2
const VISCOSITY = 1.1e-5

@enum HeadLossFormula HazenWilliams DarcyWeisbach ChezyManning

mutable struct Pipe
    from_node::Int
    to_node::Int
    length::Float64
    diameter::Float64
    roughness::Float64
    formula::HeadLossFormula
    flow::Float64
    resistance::Float64
end

mutable struct Node
    elevation::Float64
    demand::Float64
    head::Float64
    pressure::Float64
end

function headloss(p::Pipe, flow::Float64)::Float64
    if p.formula == HazenWilliams
        r = 4.727 * p.length /
            (p.roughness^1.852 * p.diameter^4.871)
        return r * abs(flow)^0.852 * flow

    elseif p.formula == DarcyWeisbach
        area = pi * p.diameter^2 / 4.0
        v = abs(flow) / area
        Re = v * p.diameter / VISCOSITY
        f = Re < 2000.0 ? 64.0/(Re+1e-10) :
            colebrook_white(Re, p.roughness/p.diameter)
        r = 0.0252 * p.length / p.diameter^5
        return r * f * abs(flow) * flow

    else  # ChezyManning
        r = 4.66 * p.roughness^2 * p.length / p.diameter^5.33
        return r * abs(flow) * flow
    end
end

function gradient(p::Pipe, flow::Float64)::Float64
    abs_flow = max(abs(flow), 1e-10)
    if p.formula == HazenWilliams
        return 1.852 * p.resistance * abs_flow^0.852
    else
        return 2.0 * p.resistance * abs_flow
    end
end

function colebrook_white(Re::Float64, e_D::Float64)::Float64
    f = 0.02
    for _ in 1:40
        sqrt_f = sqrt(f)
        f_new = 1.0 / (-2.0 * log10(e_D/3.7 +
            2.51/(Re*sqrt_f)))^2
        abs(f_new - f) < 1e-8 && break
        f = f_new
    end
    return f
end

function solve_hydraulics!(nodes::Vector{Node},
                           pipes::Vector{Pipe};
                           max_iter::Int=200,
                           tolerance::Float64=0.001)::Int
    n = length(nodes)
    m = length(pipes)

    for iter in 1:max_iter
        A = zeros(n, n)
        F = [-node.demand for node in nodes]

        for pipe in pipes
            n1, n2 = pipe.from_node, pipe.to_node
            hf = headloss(pipe, pipe.flow)
            gf = max(gradient(pipe, pipe.flow), 1e-10)
            inv_gf = 1.0 / gf

            A[n1, n1] += inv_gf
            A[n2, n2] += inv_gf
            A[n1, n2] -= inv_gf
            A[n2, n1] -= inv_gf

            head_diff = nodes[n1].head - nodes[n2].head
            flow_corr = pipe.flow - (hf - head_diff) / gf
            F[n1] -= flow_corr
            F[n2] += flow_corr
        end

        # Julia's native linear solver (LAPACK under the hood)
        dH = A \\ F

        # Update heads
        for i in 1:n
            nodes[i].head += dH[i]
        end
        max_change = maximum(abs.(dH))

        # Update flows
        for pipe in pipes
            hf = headloss(pipe, pipe.flow)
            gf = max(gradient(pipe, pipe.flow), 1e-10)
            head_diff = nodes[pipe.from_node].head - nodes[pipe.to_node].head
            pipe.flow -= (hf - head_diff) / gf
        end

        if max_change < tolerance
            for node in nodes
                node.pressure = (node.head - node.elevation) * 0.4333
            end
            return iter
        end
    end
    return max_iter
end`,
    matlab: `% hydraul.m — EPANET Hydraulic Solver in MATLAB
% Students can set breakpoints and step through the GGA

function [iterations, nodes, pipes] = solve_hydraulics(nodes, pipes, ...
    max_iter, tolerance)
%SOLVE_HYDRAULICS Global Gradient Algorithm (Todini & Pilati, 1987)
%   Solves for node heads and pipe flows in a pressurized network.
%   SET A BREAKPOINT HERE to watch the Newton-Raphson converge.

    if nargin < 3, max_iter = 200; end
    if nargin < 4, tolerance = 0.001; end

    n = length(nodes);
    m = length(pipes);

    for iter = 1:max_iter
        % Initialize system
        A = zeros(n, n);
        F = -[nodes.demand]';

        % Assemble from each pipe
        for k = 1:m
            p = pipes(k);
            n1 = p.from_node;
            n2 = p.to_node;

            % Head loss (Hazen-Williams)
            r = 4.727 * p.length / (p.roughness^1.852 * p.diameter^4.871);
            hf = r * abs(p.flow)^0.852 * p.flow;

            % Gradient dh/dQ
            gf = max(1.852 * r * abs(p.flow)^0.852, 1e-10);
            inv_gf = 1.0 / gf;

            % Jacobian matrix entries
            A(n1, n1) = A(n1, n1) + inv_gf;
            A(n2, n2) = A(n2, n2) + inv_gf;
            A(n1, n2) = A(n1, n2) - inv_gf;
            A(n2, n1) = A(n2, n1) - inv_gf;

            % Right-hand side
            head_diff = nodes(n1).head - nodes(n2).head;
            flow_corr = p.flow - (hf - head_diff) / gf;
            F(n1) = F(n1) - flow_corr;
            F(n2) = F(n2) + flow_corr;
        end

        % Solve linear system (MATLAB's backslash = LAPACK)
        dH = A \\ F;

        % Update heads
        for i = 1:n
            nodes(i).head = nodes(i).head + dH(i);
        end
        max_change = max(abs(dH));

        % Update flows
        for k = 1:m
            p = pipes(k);
            r = 4.727 * p.length / ...
                (p.roughness^1.852 * p.diameter^4.871);
            hf = r * abs(p.flow)^0.852 * p.flow;
            gf = max(1.852 * r * abs(p.flow)^0.852, 1e-10);
            head_diff = nodes(p.from_node).head - nodes(p.to_node).head;
            pipes(k).flow = p.flow - (hf - head_diff) / gf;
        end

        % Check convergence
        if max_change < tolerance
            % Update pressures
            for i = 1:n
                nodes(i).pressure = (nodes(i).head - ...
                    nodes(i).elevation) * 0.4333;
            end
            iterations = iter;
            fprintf('Converged in %d iterations (max change: %.6f ft)\\n', ...
                iter, max_change);
            return
        end
    end

    iterations = max_iter;
    warning('Did not converge in %d iterations', max_iter);
end`,
    javascript: `// hydraul.js — EPANET Hydraulic Solver in JavaScript
// Global Gradient Algorithm (Todini & Pilati, 1987)

const GRAVITY = 32.2;
const VISCOSITY = 1.1e-5;
const HAZEN_WILLIAMS = 1, DARCY_WEISBACH = 2, CHEZY_MANNING = 3;

class Pipe {
  constructor(from, to, length, diameter, roughness, formula = HAZEN_WILLIAMS) {
    this.fromNode = from;
    this.toNode = to;
    this.length = length;
    this.diameter = diameter;
    this.roughness = roughness;
    this.formula = formula;
    this.flow = 0.0;
    this.resistance = 0.0;
  }

  headloss(flow) {
    if (this.formula === HAZEN_WILLIAMS) {
      const r = 4.727 * this.length /
        (Math.pow(this.roughness, 1.852) * Math.pow(this.diameter, 4.871));
      return r * Math.pow(Math.abs(flow), 0.852) * flow;
    } else if (this.formula === DARCY_WEISBACH) {
      const area = Math.PI * this.diameter * this.diameter / 4.0;
      const v = Math.abs(flow) / area;
      const re = v * this.diameter / VISCOSITY;
      const f = re < 2000 ? 64.0 / (re + 1e-10) :
        colebrookWhite(re, this.roughness / this.diameter);
      const r = 0.0252 * this.length / Math.pow(this.diameter, 5);
      return r * f * Math.abs(flow) * flow;
    } else {
      const r = 4.66 * this.roughness * this.roughness * this.length /
        Math.pow(this.diameter, 5.33);
      return r * Math.abs(flow) * flow;
    }
  }

  gradient(flow) {
    const absFlow = Math.max(Math.abs(flow), 1e-10);
    if (this.formula === HAZEN_WILLIAMS)
      return 1.852 * this.resistance * Math.pow(absFlow, 0.852);
    return 2.0 * this.resistance * absFlow;
  }
}

class Node {
  constructor(elevation = 0, demand = 0) {
    this.elevation = elevation;
    this.demand = demand;
    this.head = elevation;
    this.pressure = 0;
  }
}

function colebrookWhite(re, eD) {
  let f = 0.02;
  for (let i = 0; i < 40; i++) {
    const sqrtF = Math.sqrt(f);
    const fNew = 1.0 / Math.pow(
      -2.0 * Math.log10(eD / 3.7 + 2.51 / (re * sqrtF)), 2);
    if (Math.abs(fNew - f) < 1e-8) break;
    f = fNew;
  }
  return f;
}

function solveHydraulics(nodes, pipes, maxIter = 200, tol = 0.001) {
  const n = nodes.length;

  for (let iter = 0; iter < maxIter; iter++) {
    const A = Array.from({ length: n }, () => new Float64Array(n));
    const F = nodes.map(nd => -nd.demand);

    for (const p of pipes) {
      const n1 = p.fromNode, n2 = p.toNode;
      const hf = p.headloss(p.flow);
      const gf = Math.max(p.gradient(p.flow), 1e-10);
      const invGf = 1.0 / gf;

      A[n1][n1] += invGf;  A[n2][n2] += invGf;
      A[n1][n2] -= invGf;  A[n2][n1] -= invGf;

      const headDiff = nodes[n1].head - nodes[n2].head;
      const flowCorr = p.flow - (hf - headDiff) / gf;
      F[n1] -= flowCorr;
      F[n2] += flowCorr;
    }

    const dH = solveLinear(A, F);
    let maxChange = 0;
    for (let i = 0; i < n; i++) {
      nodes[i].head += dH[i];
      maxChange = Math.max(maxChange, Math.abs(dH[i]));
    }

    for (const p of pipes) {
      const hf = p.headloss(p.flow);
      const gf = Math.max(p.gradient(p.flow), 1e-10);
      const headDiff = nodes[p.fromNode].head - nodes[p.toNode].head;
      p.flow -= (hf - headDiff) / gf;
    }

    if (maxChange < tol) {
      for (const nd of nodes)
        nd.pressure = (nd.head - nd.elevation) * 0.4333;
      return iter + 1;
    }
  }
  return maxIter;
}`,
    go: `// hydraul.go — EPANET Hydraulic Solver in Go
// Global Gradient Algorithm (Todini & Pilati, 1987)

package main

import "math"

const (
    Gravity   = 32.2
    Viscosity = 1.1e-5
)

const (
    HazenWilliams = iota + 1
    DarcyWeisbach
    ChezyManning
)

type Pipe struct {
    FromNode, ToNode int
    Length           float64
    Diameter         float64
    Roughness        float64
    Formula          int
    Flow             float64
    Resistance       float64
}

type Node struct {
    Elevation float64
    Demand    float64
    Head      float64
    Pressure  float64
}

func (p *Pipe) Headloss(flow float64) float64 {
    switch p.Formula {
    case HazenWilliams:
        r := 4.727 * p.Length /
            (math.Pow(p.Roughness, 1.852) * math.Pow(p.Diameter, 4.871))
        return r * math.Pow(math.Abs(flow), 0.852) * flow
    case DarcyWeisbach:
        area := math.Pi * p.Diameter * p.Diameter / 4.0
        v := math.Abs(flow) / area
        re := v * p.Diameter / Viscosity
        var f float64
        if re < 2000 {
            f = 64.0 / (re + 1e-10)
        } else {
            f = ColebrookWhite(re, p.Roughness/p.Diameter)
        }
        r := 0.0252 * p.Length / math.Pow(p.Diameter, 5)
        return r * f * math.Abs(flow) * flow
    default: // ChezyManning
        r := 4.66 * p.Roughness * p.Roughness * p.Length /
            math.Pow(p.Diameter, 5.33)
        return r * math.Abs(flow) * flow
    }
}

func (p *Pipe) Gradient(flow float64) float64 {
    absFlow := math.Max(math.Abs(flow), 1e-10)
    if p.Formula == HazenWilliams {
        return 1.852 * p.Resistance * math.Pow(absFlow, 0.852)
    }
    return 2.0 * p.Resistance * absFlow
}

func ColebrookWhite(re, eD float64) float64 {
    f := 0.02
    for i := 0; i < 40; i++ {
        sqrtF := math.Sqrt(f)
        fNew := 1.0 / math.Pow(
            -2.0*math.Log10(eD/3.7+2.51/(re*sqrtF)), 2)
        if math.Abs(fNew-f) < 1e-8 {
            break
        }
        f = fNew
    }
    return f
}

func SolveHydraulics(nodes []Node, pipes []Pipe,
    maxIter int, tolerance float64) int {
    n := len(nodes)

    for iter := 0; iter < maxIter; iter++ {
        A := make([]float64, n*n)
        F := make([]float64, n)
        for i := range nodes {
            F[i] = -nodes[i].Demand
        }

        for _, p := range pipes {
            n1, n2 := p.FromNode, p.ToNode
            hf := p.Headloss(p.Flow)
            gf := math.Max(p.Gradient(p.Flow), 1e-10)
            invGf := 1.0 / gf

            A[n1*n+n1] += invGf
            A[n2*n+n2] += invGf
            A[n1*n+n2] -= invGf
            A[n2*n+n1] -= invGf

            headDiff := nodes[n1].Head - nodes[n2].Head
            flowCorr := p.Flow - (hf-headDiff)/gf
            F[n1] -= flowCorr
            F[n2] += flowCorr
        }

        dH := SolveLinear(A, F, n)

        maxChange := 0.0
        for i := range nodes {
            nodes[i].Head += dH[i]
            if math.Abs(dH[i]) > maxChange {
                maxChange = math.Abs(dH[i])
            }
        }

        for i := range pipes {
            hf := pipes[i].Headloss(pipes[i].Flow)
            gf := math.Max(pipes[i].Gradient(pipes[i].Flow), 1e-10)
            headDiff := nodes[pipes[i].FromNode].Head -
                nodes[pipes[i].ToNode].Head
            pipes[i].Flow -= (hf - headDiff) / gf
        }

        if maxChange < tolerance {
            for i := range nodes {
                nodes[i].Pressure =
                    (nodes[i].Head - nodes[i].Elevation) * 0.4333
            }
            return iter + 1
        }
    }
    return maxIter
}`,
    fortran: `! hydraul.f90 — EPANET Hydraulic Solver in Fortran
! Global Gradient Algorithm (Todini & Pilati, 1987)
! Fortran's native array operations and LAPACK integration
! make matrix assembly and linear solve natural.

module hydraul_mod
    implicit none

    real(8), parameter :: GRAVITY = 32.2d0
    real(8), parameter :: VISCOSITY = 1.1d-5

    integer, parameter :: HAZEN_WILLIAMS = 1
    integer, parameter :: DARCY_WEISBACH = 2
    integer, parameter :: CHEZY_MANNING = 3

    type :: TPipe
        integer :: from_node, to_node
        real(8) :: length, diameter, roughness
        integer :: formula
        real(8) :: flow, resistance
    end type

    type :: TNode
        real(8) :: elevation, demand, head, pressure
    end type

contains

    function pipe_headloss(p, flow) result(hf)
        type(TPipe), intent(in) :: p
        real(8), intent(in) :: flow
        real(8) :: hf, r, f, area, v, Re

        select case (p%formula)
        case (HAZEN_WILLIAMS)
            r = 4.727d0 * p%length / &
                (p%roughness**1.852d0 * p%diameter**4.871d0)
            hf = r * abs(flow)**0.852d0 * flow

        case (DARCY_WEISBACH)
            area = 3.14159265d0 * p%diameter**2 / 4.0d0
            v = abs(flow) / area
            Re = v * p%diameter / VISCOSITY
            if (Re < 2000.0d0) then
                f = 64.0d0 / max(Re, 1.0d-10)
            else
                f = colebrook_white(Re, p%roughness / p%diameter)
            end if
            r = 0.0252d0 * p%length / p%diameter**5
            hf = r * f * abs(flow) * flow

        case default
            r = 4.66d0 * p%roughness**2 * p%length / &
                p%diameter**5.33d0
            hf = r * abs(flow) * flow
        end select
    end function

    function pipe_gradient(p, flow) result(gf)
        type(TPipe), intent(in) :: p
        real(8), intent(in) :: flow
        real(8) :: gf, abs_flow

        abs_flow = max(abs(flow), 1.0d-10)
        select case (p%formula)
        case (HAZEN_WILLIAMS)
            gf = 1.852d0 * p%resistance * abs_flow**0.852d0
        case default
            gf = 2.0d0 * p%resistance * abs_flow
        end select
    end function

    function colebrook_white(Re, e_D) result(f)
        real(8), intent(in) :: Re, e_D
        real(8) :: f, f_new, sqrt_f
        integer :: i

        f = 0.02d0
        do i = 1, 40
            sqrt_f = sqrt(f)
            f_new = 1.0d0 / (-2.0d0 * log10(e_D/3.7d0 + &
                2.51d0/(Re*sqrt_f)))**2
            if (abs(f_new - f) < 1.0d-8) exit
            f = f_new
        end do
    end function

    function solve_hydraulics(nodes, pipes, n_nodes, n_pipes, &
                              max_iter, tolerance) result(iters)
        type(TNode), intent(inout) :: nodes(:)
        type(TPipe), intent(inout) :: pipes(:)
        integer, intent(in) :: n_nodes, n_pipes, max_iter
        real(8), intent(in) :: tolerance
        integer :: iters

        real(8), allocatable :: A(:,:), F(:), dH(:)
        real(8) :: hf, gf, inv_gf, head_diff, flow_corr
        real(8) :: max_change
        integer :: iter, i, n1, n2

        allocate(A(n_nodes, n_nodes))
        allocate(F(n_nodes), dH(n_nodes))

        do iter = 1, max_iter
            A = 0.0d0
            F = -[(nodes(i)%demand, i=1,n_nodes)]

            do i = 1, n_pipes
                n1 = pipes(i)%from_node
                n2 = pipes(i)%to_node
                hf = pipe_headloss(pipes(i), pipes(i)%flow)
                gf = max(pipe_gradient(pipes(i), pipes(i)%flow), 1d-10)
                inv_gf = 1.0d0 / gf

                A(n1,n1) = A(n1,n1) + inv_gf
                A(n2,n2) = A(n2,n2) + inv_gf
                A(n1,n2) = A(n1,n2) - inv_gf
                A(n2,n1) = A(n2,n1) - inv_gf

                head_diff = nodes(n1)%head - nodes(n2)%head
                flow_corr = pipes(i)%flow - (hf - head_diff) / gf
                F(n1) = F(n1) - flow_corr
                F(n2) = F(n2) + flow_corr
            end do

            ! Solve A * dH = F (use LAPACK dgesv)
            call solve_linear(A, F, dH, n_nodes)

            max_change = maxval(abs(dH))
            nodes(:)%head = nodes(:)%head + dH

            do i = 1, n_pipes
                hf = pipe_headloss(pipes(i), pipes(i)%flow)
                gf = max(pipe_gradient(pipes(i), pipes(i)%flow), 1d-10)
                head_diff = nodes(pipes(i)%from_node)%head - &
                            nodes(pipes(i)%to_node)%head
                pipes(i)%flow = pipes(i)%flow - (hf - head_diff) / gf
            end do

            if (max_change < tolerance) then
                do i = 1, n_nodes
                    nodes(i)%pressure = &
                        (nodes(i)%head - nodes(i)%elevation) * 0.4333d0
                end do
                iters = iter
                return
            end if
        end do
        iters = max_iter
    end function

end module hydraul_mod`,
  },
  "smatrix.c — Sparse Matrix Solver": {
    category: "Core Solver",
    difficulty: "advanced",
    tags: ["sparse matrix", "cholesky", "linear algebra", "factorization", "topology", "fill-in"],
    description: "Solves the symmetric positive-definite system Ax = b arising from the Global Gradient Algorithm using Cholesky factorization on a sparse matrix. The matrix structure mirrors the pipe network topology — non-zero entries exist only where pipes connect nodes. Minimum degree reordering minimizes fill-in during factorization.",
    equations: "A = LLᵀ (Cholesky); Ly = b (forward substitution); Lᵀx = y (back substitution)",
    inputs: "Symmetric positive-definite matrix A, right-hand side vector b",
    outputs: "Solution vector x",
    c: `// smatrix.c — Sparse Matrix Solver for EPANET
// Cholesky factorization with compressed sparse row storage
// The sparsity pattern mirrors the pipe network topology

#include <math.h>
#include <stdlib.h>

typedef struct {
    int    n;          // matrix dimension
    int    nnz;        // number of non-zeros
    int*   rowptr;     // row pointers (CSR format)
    int*   colind;     // column indices
    double* values;    // non-zero values
    double* diag;      // diagonal entries
    int*   order;      // fill-reducing ordering
} TSparseMatrix;

// ─── SYMBOLIC FACTORIZATION ───
// Determines the non-zero structure of L before numerical values

void smatrix_symbolic(TSparseMatrix* sm)
{
    int i, j, k, n = sm->n;
    int* parent = (int*)calloc(n, sizeof(int));
    int* flag   = (int*)calloc(n, sizeof(int));
    
    // Build elimination tree
    for (k = 0; k < n; k++) {
        parent[k] = -1;
        flag[k] = k;
        for (j = sm->rowptr[k]; j < sm->rowptr[k+1]; j++) {
            i = sm->colind[j];
            if (i < k) {
                // Walk up elimination tree
                while (flag[i] != k) {
                    if (parent[i] == -1) parent[i] = k;
                    flag[i] = k;
                    i = parent[i];
                }
            }
        }
    }
    free(parent);
    free(flag);
}

// ─── NUMERICAL FACTORIZATION ───
// A = L * Lᵀ  (Cholesky)

int smatrix_factor(TSparseMatrix* sm)
{
    int i, j, k, n = sm->n;
    double sum, *temp;
    
    temp = (double*)calloc(n, sizeof(double));
    
    for (k = 0; k < n; k++) {
        // Compute diagonal: L[k][k] = sqrt(A[k][k] - sum(L[k][j]²))
        sum = sm->diag[k];
        for (j = sm->rowptr[k]; j < sm->rowptr[k+1]; j++) {
            if (sm->colind[j] < k)
                sum -= sm->values[j] * sm->values[j];
        }
        
        if (sum <= 0.0) {
            free(temp);
            return -1;  // Not positive definite
        }
        sm->diag[k] = sqrt(sum);
        
        // Compute off-diagonal: L[i][k] = (A[i][k] - sum) / L[k][k]
        for (j = sm->rowptr[k]; j < sm->rowptr[k+1]; j++) {
            i = sm->colind[j];
            if (i > k) {
                sm->values[j] = (sm->values[j] - temp[i]) / sm->diag[k];
                temp[i] = 0.0;
            }
        }
    }
    
    free(temp);
    return 0;
}

// ─── SOLVE ───
// Forward substitution: Ly = b
// Back substitution:    Lᵀx = y

void smatrix_solve(TSparseMatrix* sm, double* b, double* x)
{
    int i, j, n = sm->n;
    
    // Forward: Ly = b
    for (i = 0; i < n; i++) {
        x[i] = b[i];
        for (j = sm->rowptr[i]; j < sm->rowptr[i+1]; j++) {
            if (sm->colind[j] < i)
                x[i] -= sm->values[j] * x[sm->colind[j]];
        }
        x[i] /= sm->diag[i];
    }
    
    // Backward: Lᵀx = y
    for (i = n - 1; i >= 0; i--) {
        for (j = sm->rowptr[i]; j < sm->rowptr[i+1]; j++) {
            if (sm->colind[j] > i)
                x[i] -= sm->values[j] * x[sm->colind[j]];
        }
        x[i] /= sm->diag[i];
    }
}`,
    python: `# smatrix.py — Sparse Matrix Solver for EPANET
# Python with scipy.sparse for efficient factorization

import numpy as np
from scipy.sparse import csr_matrix, lil_matrix
from scipy.sparse.linalg import spsolve
from scipy.sparse.csgraph import reverse_cuthill_mckee

class SparseMatrix:
    """Sparse matrix solver using CSR format.
    The sparsity pattern mirrors the pipe network topology —
    non-zero entries exist only where pipes connect nodes."""

    def __init__(self, n):
        self.n = n
        self.matrix = lil_matrix((n, n))

    def add_entry(self, i, j, value):
        """Add value to entry (i,j) — accumulates"""
        self.matrix[i, j] += value

    def set_diagonal(self, i, value):
        self.matrix[i, i] = value

    def solve(self, b):
        """Solve Ax = b using scipy sparse solver"""
        A_csr = self.matrix.tocsr()

        # Fill-reducing ordering (like EPANET's genmmd.c)
        perm = reverse_cuthill_mckee(A_csr, symmetric_mode=True)

        # Reorder system
        A_reordered = A_csr[perm][:, perm]
        b_reordered = b[perm]

        # Sparse direct solve (CHOLMOD or SuperLU)
        x_reordered = spsolve(A_reordered, b_reordered)

        # Un-reorder solution
        x = np.empty_like(b)
        x[perm] = x_reordered
        return x

    def clear(self):
        """Zero all entries for next iteration"""
        self.matrix = lil_matrix((self.n, self.n))

def build_from_network(n_nodes, pipes):
    """Build sparse matrix structure from pipe connectivity.
    Only creates entries where pipes connect nodes."""
    sm = SparseMatrix(n_nodes)
    for pipe in pipes:
        n1, n2 = pipe.from_node, pipe.to_node
        inv_gf = 1.0 / max(pipe.gradient(pipe.flow), 1e-10)
        sm.add_entry(n1, n1, inv_gf)
        sm.add_entry(n2, n2, inv_gf)
        sm.add_entry(n1, n2, -inv_gf)
        sm.add_entry(n2, n1, -inv_gf)
    return sm`,
  },
  "genmmd.c — Minimum Degree Ordering": {
    category: "Core Solver",
    difficulty: "advanced",
    tags: ["graph theory", "ordering", "fill-in", "sparse matrix", "elimination tree"],
    description: "Computes a minimum degree ordering for the sparse matrix to minimize fill-in during Cholesky factorization. The ordering determines which nodes to eliminate first — choosing low-degree nodes reduces the number of new non-zero entries created. This is a graph-theoretic preprocessing step that dramatically speeds up the linear solve.",
    equations: "Minimize fill(PAP^T) where P is a permutation matrix",
    inputs: "Adjacency graph of the pipe network (symmetric sparsity pattern)",
    outputs: "Permutation vector for reordering nodes",
    c: `// genmmd.c — Minimum Degree Ordering for EPANET
// Generalized Multiple Minimum Degree algorithm
// Reduces fill-in during sparse Cholesky factorization
// by reordering nodes to eliminate low-degree nodes first

#include <stdlib.h>

typedef struct {
    int  n;           // number of nodes
    int* adj;         // adjacency list (flat)
    int* adj_ptr;     // pointer into adj for each node
    int* degree;      // current degree of each node
    int* order;       // output: elimination order
    int* marker;      // workspace
} TGraph;

// ─── FIND MINIMUM DEGREE NODE ───

int find_min_degree(TGraph* g, int* active, int n_active)
{
    int min_deg = g->n + 1;
    int min_node = -1;
    int i;
    
    for (i = 0; i < n_active; i++) {
        int node = active[i];
        if (g->degree[node] < min_deg) {
            min_deg = g->degree[node];
            min_node = node;
        }
    }
    return min_node;
}

// ─── ELIMINATE NODE ───
// When a node is eliminated, its neighbors become
// connected to each other (clique formation)

void eliminate_node(TGraph* g, int node)
{
    int i, j, ni, nj;
    
    // For each pair of neighbors, add an edge if not present
    for (i = g->adj_ptr[node]; i < g->adj_ptr[node + 1]; i++) {
        ni = g->adj[i];
        if (g->marker[ni] < 0) continue;  // already eliminated
        
        for (j = i + 1; j < g->adj_ptr[node + 1]; j++) {
            nj = g->adj[j];
            if (g->marker[nj] < 0) continue;
            
            // Add edge ni-nj if not present
            // (updates degree counts)
            add_edge_if_new(g, ni, nj);
        }
        
        // Remove edge to eliminated node
        g->degree[ni]--;
    }
    
    g->marker[node] = -1;  // mark as eliminated
}

// ─── MAIN MMD ALGORITHM ───

void genmmd(int n, int* adj, int* adj_ptr, int* order)
{
    TGraph g;
    int i, step, node;
    int* active;
    int n_active;
    
    g.n = n;
    g.adj = adj;
    g.adj_ptr = adj_ptr;
    g.degree = (int*)malloc(n * sizeof(int));
    g.order = order;
    g.marker = (int*)calloc(n, sizeof(int));
    
    // Compute initial degrees
    for (i = 0; i < n; i++)
        g.degree[i] = adj_ptr[i + 1] - adj_ptr[i];
    
    // Active node list
    active = (int*)malloc(n * sizeof(int));
    n_active = n;
    for (i = 0; i < n; i++) active[i] = i;
    
    // Main loop: eliminate minimum degree node at each step
    for (step = 0; step < n; step++) {
        node = find_min_degree(&g, active, n_active);
        
        order[step] = node;        // record elimination order
        eliminate_node(&g, node);   // update graph
        
        // Remove from active list
        for (i = 0; i < n_active; i++) {
            if (active[i] == node) {
                active[i] = active[--n_active];
                break;
            }
        }
    }
    
    free(g.degree);
    free(g.marker);
    free(active);
}`,
  },
  "pipe.c — Pipe Head Loss": {
    category: "Network Elements",
    difficulty: "intermediate",
    tags: ["pipe", "head loss", "hazen-williams", "darcy-weisbach", "chezy-manning", "friction", "colebrook-white", "reynolds"],
    description: "Computes friction head loss and its gradient for pipes using Hazen-Williams, Darcy-Weisbach, or Chezy-Manning equations. These are the constitutive relations that connect flow to head loss — the pipe network equivalent of Manning's equation in SWMM5. The gradient (dh/dQ) is needed for the Jacobian matrix in the Newton-Raphson solver.",
    equations: "hf = 4.727·L·Q^1.852/(C^1.852·D^4.871) (H-W); hf = f·L·v²/(2gD) (D-W); 1/√f = -2·log₁₀(ε/3.7D + 2.51/Re√f) (C-W)",
    inputs: "Pipe length, diameter, roughness, flow rate, head loss formula type",
    outputs: "Head loss (ft), gradient dh/dQ (for Jacobian)",
    c: `// pipe.c — Pipe Head Loss Equations for EPANET
// Hazen-Williams, Darcy-Weisbach, and Chezy-Manning formulas
// These connect flow to head loss — the constitutive relations
// for pressurized pipe flow (analogous to Manning's for open channels)

#include <math.h>

#define VISCOSITY 1.1e-5   // kinematic viscosity ft²/s (water at 60°F)

typedef struct {
    double length;       // pipe length (ft)
    double diameter;     // pipe diameter (ft)
    double roughness;    // C-factor (H-W), epsilon (D-W), or n (C-M)
    int    formula;      // 1=H-W, 2=D-W, 3=C-M
    double resistance;   // precomputed resistance coefficient
} TPipeData;

// ─── RESISTANCE COEFFICIENT ───
// Precomputed once when network is loaded

double pipe_resistance(TPipeData* p)
{
    switch (p->formula) {
        case 1:  // Hazen-Williams
            return 4.727 * p->length /
                (pow(p->roughness, 1.852) * pow(p->diameter, 4.871));
        case 2:  // Darcy-Weisbach
            return 0.0252 * p->length / pow(p->diameter, 5.0);
        case 3:  // Chezy-Manning
            return 4.66 * p->roughness * p->roughness *
                p->length / pow(p->diameter, 5.33);
        default:
            return 0.0;
    }
}

// ─── HEAD LOSS ───

double pipe_headloss(TPipeData* p, double flow)
{
    double r = p->resistance;
    
    switch (p->formula) {
        case 1:  // Hazen-Williams: hf = r * |Q|^0.852 * Q
            return r * pow(fabs(flow), 0.852) * flow;
            
        case 2: {  // Darcy-Weisbach: hf = r * f * |Q| * Q
            double area = 3.14159265 * p->diameter * p->diameter / 4.0;
            double v = fabs(flow) / area;
            double Re = v * p->diameter / VISCOSITY;
            double f;
            
            if (Re < 2000.0)
                f = 64.0 / (Re + 1e-10);              // Laminar
            else if (Re < 4000.0)
                f = cubic_interp(Re);                   // Transition
            else
                f = colebrook_white(Re,
                    p->roughness / p->diameter);        // Turbulent
            
            return r * f * fabs(flow) * flow;
        }
        
        case 3:  // Chezy-Manning: hf = r * |Q| * Q
            return r * fabs(flow) * flow;
            
        default:
            return 0.0;
    }
}

// ─── GRADIENT dh/dQ (for Jacobian) ───

double pipe_gradient(TPipeData* p, double flow)
{
    double abs_flow = fabs(flow);
    if (abs_flow < 1e-10) abs_flow = 1e-10;
    
    switch (p->formula) {
        case 1:  // H-W: d/dQ(r*|Q|^0.852*Q) = 1.852*r*|Q|^0.852
            return 1.852 * p->resistance * pow(abs_flow, 0.852);
        case 2:  // D-W: d/dQ(r*f*|Q|*Q) ≈ 2*r*f*|Q|
            return 2.0 * p->resistance * abs_flow;
        case 3:  // C-M: d/dQ(r*|Q|*Q) = 2*r*|Q|
            return 2.0 * p->resistance * abs_flow;
        default:
            return 0.0;
    }
}

// ─── COLEBROOK-WHITE FRICTION FACTOR ───

double colebrook_white(double Re, double e_D)
{
    // 1/√f = -2·log₁₀(ε/(3.7·D) + 2.51/(Re·√f))
    // Iterative solution (typically converges in 4-6 iterations)
    
    double f = 0.02;  // initial guess
    int i;
    
    for (i = 0; i < 40; i++) {
        double sqrt_f = sqrt(f);
        double f_new = 1.0 / pow(
            -2.0 * log10(e_D / 3.7 + 2.51 / (Re * sqrt_f)), 2.0);
        if (fabs(f_new - f) < 1e-8) break;
        f = f_new;
    }
    return f;
}

// ─── MINOR LOSS ───
// Additional head loss from fittings, bends, valves

double pipe_minor_loss(double flow, double area, double K)
{
    // hm = K * v² / (2g) = K * Q² / (2g * A²)
    double v = flow / area;
    return K * v * fabs(v) / (2.0 * 32.2);
}`,
    rust: `// pipe.rs — Pipe Head Loss Equations for EPANET in Rust
// Type-safe head loss computation with enum dispatch

const VISCOSITY: f64 = 1.1e-5;

#[derive(Clone, Copy)]
pub enum HeadLossFormula {
    HazenWilliams,
    DarcyWeisbach,
    ChezyManning,
}

pub struct PipeData {
    pub length: f64,
    pub diameter: f64,
    pub roughness: f64,
    pub formula: HeadLossFormula,
    pub resistance: f64,
}

impl PipeData {
    pub fn compute_resistance(&mut self) {
        self.resistance = match self.formula {
            HeadLossFormula::HazenWilliams =>
                4.727 * self.length /
                    (self.roughness.powf(1.852) * self.diameter.powf(4.871)),
            HeadLossFormula::DarcyWeisbach =>
                0.0252 * self.length / self.diameter.powf(5.0),
            HeadLossFormula::ChezyManning =>
                4.66 * self.roughness.powi(2) * self.length /
                    self.diameter.powf(5.33),
        };
    }

    pub fn headloss(&self, flow: f64) -> f64 {
        match self.formula {
            HeadLossFormula::HazenWilliams => {
                self.resistance * flow.abs().powf(0.852) * flow
            }
            HeadLossFormula::DarcyWeisbach => {
                let area = std::f64::consts::PI *
                    self.diameter.powi(2) / 4.0;
                let v = flow.abs() / area;
                let re = v * self.diameter / VISCOSITY;
                let f = if re < 2000.0 {
                    64.0 / (re + 1e-10)
                } else {
                    colebrook_white(re, self.roughness / self.diameter)
                };
                self.resistance * f * flow.abs() * flow
            }
            HeadLossFormula::ChezyManning => {
                self.resistance * flow.abs() * flow
            }
        }
    }

    pub fn gradient(&self, flow: f64) -> f64 {
        let abs_flow = flow.abs().max(1e-10);
        match self.formula {
            HeadLossFormula::HazenWilliams =>
                1.852 * self.resistance * abs_flow.powf(0.852),
            _ => 2.0 * self.resistance * abs_flow,
        }
    }

    pub fn minor_loss(&self, flow: f64, area: f64, k: f64) -> f64 {
        let v = flow / area;
        k * v * v.abs() / (2.0 * 32.2)
    }
}

fn colebrook_white(re: f64, e_d: f64) -> f64 {
    let mut f = 0.02_f64;
    for _ in 0..40 {
        let sqrt_f = f.sqrt();
        let f_new = 1.0 / (-2.0 *
            (e_d / 3.7 + 2.51 / (re * sqrt_f)).log10()).powi(2);
        if (f_new - f).abs() < 1e-8 { break; }
        f = f_new;
    }
    f
}`,
    python: `# pipe.py — Pipe Head Loss Equations for EPANET in Python
# Clean dataclass interface with NumPy-ready design

import math
from dataclasses import dataclass
from enum import Enum

VISCOSITY = 1.1e-5

class Formula(Enum):
    HAZEN_WILLIAMS = 1
    DARCY_WEISBACH = 2
    CHEZY_MANNING = 3

@dataclass
class PipeData:
    length: float
    diameter: float
    roughness: float
    formula: Formula = Formula.HAZEN_WILLIAMS
    resistance: float = 0.0

    def compute_resistance(self):
        if self.formula == Formula.HAZEN_WILLIAMS:
            self.resistance = 4.727 * self.length / (
                self.roughness ** 1.852 * self.diameter ** 4.871)
        elif self.formula == Formula.DARCY_WEISBACH:
            self.resistance = 0.0252 * self.length / self.diameter ** 5
        else:
            self.resistance = (4.66 * self.roughness ** 2 *
                self.length / self.diameter ** 5.33)

    def headloss(self, flow: float) -> float:
        if self.formula == Formula.HAZEN_WILLIAMS:
            return self.resistance * abs(flow) ** 0.852 * flow
        elif self.formula == Formula.DARCY_WEISBACH:
            area = math.pi * self.diameter ** 2 / 4
            v = abs(flow) / area
            re = v * self.diameter / VISCOSITY
            f = (64.0 / max(re, 1e-10) if re < 2000
                 else colebrook_white(re, self.roughness / self.diameter))
            return self.resistance * f * abs(flow) * flow
        else:
            return self.resistance * abs(flow) * flow

    def gradient(self, flow: float) -> float:
        abs_flow = max(abs(flow), 1e-10)
        if self.formula == Formula.HAZEN_WILLIAMS:
            return 1.852 * self.resistance * abs_flow ** 0.852
        return 2.0 * self.resistance * abs_flow

    def minor_loss(self, flow: float, area: float, k: float) -> float:
        v = flow / area
        return k * v * abs(v) / (2 * 32.2)

def colebrook_white(re: float, e_d: float) -> float:
    f = 0.02
    for _ in range(40):
        sqrt_f = math.sqrt(f)
        f_new = 1.0 / (-2.0 * math.log10(
            e_d / 3.7 + 2.51 / (re * sqrt_f))) ** 2
        if abs(f_new - f) < 1e-8:
            break
        f = f_new
    return f`,
  },
  "pump.c — Pump Modeling": {
    category: "Network Elements",
    difficulty: "intermediate",
    tags: ["pump", "head-flow curve", "efficiency", "affinity laws", "energy", "variable speed", "operation"],
    description: "Models pump operation using head-flow characteristic curves (H-Q curves), efficiency curves, and speed settings. Pumps add energy to the system (negative head loss). Variable-speed pumps use affinity laws to scale curves. Energy consumption is tracked for cost analysis.",
    equations: "H = h0 - r·Q^n (pump curve); H₂/H₁ = (N₂/N₁)² (affinity); P = ρgQH/η (power)",
    inputs: "Pump curve points, speed setting, efficiency curve, flow rate",
    outputs: "Head gain (ft), power consumption (kW), efficiency (%)",
    c: `// pump.c — Pump Modeling for EPANET
// Head-flow curves, variable speed, energy tracking

#include <math.h>

typedef struct {
    double h0;        // shutoff head (ft) at Q=0
    double r;         // curve coefficient
    double n;         // curve exponent (typically 1.0-2.0)
    double speed;     // relative speed setting (1.0 = full)
    double efficiency;// pump efficiency (0-1)
    double flow;      // current flow (cfs)
    int    status;    // 0=closed, 1=open
} TPump;

// ─── PUMP HEAD GAIN ───
// H = h0 - r * Q^n  (negative head loss = energy added)
// With variable speed (affinity laws):
//   H = (N/N0)² * h0 - r * (Q / (N/N0))^n

double pump_head(TPump* p, double flow)
{
    double s = p->speed;
    double q_adj;
    
    if (p->status == 0 || s <= 0.0)
        return 0.0;
    
    // Affinity law: adjust flow for speed
    q_adj = fabs(flow) / s;
    
    // Head = speed² * (h0 - r * Q_adjusted^n)
    return s * s * (p->h0 - p->r * pow(q_adj, p->n));
}

// ─── PUMP GRADIENT ───
// dH/dQ — needed for Jacobian matrix

double pump_gradient(TPump* p, double flow)
{
    double s = p->speed;
    double q_adj, abs_flow;
    
    if (p->status == 0 || s <= 0.0)
        return 0.0;
    
    abs_flow = fabs(flow);
    if (abs_flow < 1e-10) abs_flow = 1e-10;
    
    q_adj = abs_flow / s;
    
    // d/dQ[s² * (h0 - r * (Q/s)^n)]
    //   = s² * (-r * n * (Q/s)^(n-1) * 1/s)
    //   = -r * n * s^(2-n) * Q^(n-1) / s
    return p->r * p->n * s * pow(q_adj, p->n - 1.0);
}

// ─── ENERGY CONSUMPTION ───
// P = ρ·g·Q·H / η  (convert to kW)

double pump_power(TPump* p, double flow)
{
    double head, eff;
    
    head = pump_head(p, flow);
    eff = p->efficiency;
    if (eff < 0.01) eff = 0.01;
    
    // Power in horsepower: P = Q(cfs) * H(ft) * 62.4(lb/ft³) / (550 * η)
    // Convert to kW: * 0.7457
    return fabs(flow) * head * 62.4 / (550.0 * eff) * 0.7457;
}

// ─── PUMP CURVE FROM 3 POINTS ───
// Fit H = h0 - r*Q^n through design point, shutoff, and max flow

void pump_curve_fit(double* Q, double* H, int npts,
                    double* h0, double* r, double* n)
{
    // For single-point curve: assume n=1.0
    // H = h0 - r*Q  →  h0 = H(Q=0), r = (h0-H1)/Q1
    
    if (npts == 1) {
        *h0 = 1.33 * H[0];     // shutoff = 133% of design
        *r = (*h0 - H[0]) / Q[0];
        *n = 1.0;
    }
    else if (npts == 3) {
        // Three-point fit: solve for h0, r, n
        // using least squares on log-transformed equation
        *h0 = H[0];  // first point is shutoff
        *n = log((H[0] - H[1]) / (H[0] - H[2])) /
             log(Q[1] / Q[2]);
        *r = (H[0] - H[1]) / pow(Q[1], *n);
    }
}`,
    python: `# pump.py — Pump Modeling for EPANET in Python
# Dataclass-based pump with affinity laws and energy tracking

import math
from dataclasses import dataclass

@dataclass
class Pump:
    h0: float           # shutoff head (ft)
    r: float            # curve coefficient
    n: float = 1.0      # curve exponent
    speed: float = 1.0  # relative speed (1.0 = full)
    efficiency: float = 0.75
    flow: float = 0.0
    status: bool = True

    def head(self, flow: float) -> float:
        """Pump head gain using H = s² * (h0 - r*(Q/s)^n)"""
        if not self.status or self.speed <= 0:
            return 0.0
        q_adj = abs(flow) / self.speed
        return self.speed**2 * (self.h0 - self.r * q_adj**self.n)

    def gradient(self, flow: float) -> float:
        """dH/dQ for Jacobian matrix"""
        if not self.status or self.speed <= 0:
            return 0.0
        abs_flow = max(abs(flow), 1e-10)
        q_adj = abs_flow / self.speed
        return self.r * self.n * self.speed * q_adj**(self.n - 1)

    def power_kw(self, flow: float) -> float:
        """Power consumption in kW: P = rho*g*Q*H / eta"""
        h = self.head(flow)
        eff = max(self.efficiency, 0.01)
        hp = abs(flow) * h * 62.4 / (550.0 * eff)
        return hp * 0.7457  # HP to kW

    @staticmethod
    def fit_curve(Q, H):
        """Fit pump curve through given points"""
        if len(Q) == 1:
            h0 = 1.33 * H[0]
            r = (h0 - H[0]) / Q[0]
            return h0, r, 1.0
        elif len(Q) == 3:
            h0 = H[0]
            n = (math.log((H[0]-H[1]) / (H[0]-H[2])) /
                 math.log(Q[1] / Q[2]))
            r = (H[0] - H[1]) / Q[1]**n
            return h0, r, n`,
  },
  "valve.c — Valve Modeling": {
    category: "Network Elements",
    difficulty: "intermediate",
    tags: ["valve", "PRV", "PSV", "FCV", "TCV", "GPV", "PBV", "pressure", "flow control", "state"],
    description: "Models six valve types: Pressure Reducing (PRV), Pressure Sustaining (PSV), Flow Control (FCV), Throttle Control (TCV), General Purpose (GPV), and Pressure Breaker (PBV). Each valve type has different equations relating flow, upstream head, downstream head, and valve setting. Valves can switch between active, open, and closed states.",
    equations: "PRV: H_ds = H_setting (active); FCV: Q = Q_setting; TCV: hf = K·v²/2g",
    inputs: "Valve type, setting (pressure or flow), upstream/downstream heads, minor loss coefficient",
    outputs: "Flow through valve, head loss, valve state (active/open/closed)",
    c: `// valve.c — Valve Modeling for EPANET
// Six valve types with state-dependent equations:
// PRV, PSV, FCV, TCV, GPV, PBV

#include <math.h>

#define PRV 1   // Pressure Reducing Valve
#define PSV 2   // Pressure Sustaining Valve
#define FCV 3   // Flow Control Valve
#define TCV 4   // Throttle Control Valve
#define GPV 5   // General Purpose Valve
#define PBV 6   // Pressure Breaker Valve

#define ACTIVE 0
#define OPEN   1
#define CLOSED 2

typedef struct {
    int    type;       // PRV, PSV, FCV, TCV, GPV, PBV
    double setting;    // pressure (psi) or flow (cfs) setpoint
    double Km;         // minor loss coefficient
    int    state;      // ACTIVE, OPEN, or CLOSED
    int    from_node;
    int    to_node;
} TValve;

// ─── PRV: PRESSURE REDUCING VALVE ───
// Maintains downstream pressure at or below setting
// Three states: ACTIVE (regulating), OPEN (fully open), CLOSED

int prv_check_state(TValve* v, double h_up, double h_down,
                    double elev_down)
{
    double p_setting = v->setting / 0.4333 + elev_down;
    
    switch (v->state) {
        case ACTIVE:
            if (h_up < p_setting) return OPEN;
            if (h_down > p_setting) return CLOSED;
            return ACTIVE;
        case OPEN:
            if (h_down > p_setting) return ACTIVE;
            return OPEN;
        case CLOSED:
            if (h_up > p_setting && h_up > h_down) return ACTIVE;
            return CLOSED;
    }
    return v->state;
}

double prv_headloss(TValve* v, double flow, double h_up,
                    double elev_down)
{
    switch (v->state) {
        case ACTIVE:
            // Set downstream head to pressure setting
            return h_up - (v->setting / 0.4333 + elev_down);
        case OPEN:
            // Treat as minor loss: hf = Km * v² / 2g
            return v->Km * fabs(flow) * flow;
        case CLOSED:
            return h_up;  // infinite resistance
    }
    return 0.0;
}

// ─── PSV: PRESSURE SUSTAINING VALVE ───
// Maintains upstream pressure at or above setting

int psv_check_state(TValve* v, double h_up, double h_down,
                    double elev_up)
{
    double p_setting = v->setting / 0.4333 + elev_up;
    
    switch (v->state) {
        case ACTIVE:
            if (h_down > p_setting) return OPEN;
            if (h_up < p_setting) return CLOSED;
            return ACTIVE;
        case OPEN:
            if (h_up < p_setting) return ACTIVE;
            return OPEN;
        case CLOSED:
            if (h_down < p_setting && h_up > h_down) return ACTIVE;
            return CLOSED;
    }
    return v->state;
}

// ─── FCV: FLOW CONTROL VALVE ───
// Maintains flow at setpoint regardless of pressure

double fcv_flow(TValve* v, double h_up, double h_down)
{
    if (v->state == CLOSED) return 0.0;
    
    // If upstream pressure insufficient, valve fully open
    if (h_up - h_down < 0.0) return 0.0;
    
    return v->setting;  // fixed flow
}

// ─── TCV: THROTTLE CONTROL VALVE ───
// Variable minor loss coefficient (like a gate valve)

double tcv_headloss(TValve* v, double flow)
{
    // Setting is the minor loss coefficient K
    // hf = K * v² / 2g = K * Q² / (2g * A²)
    return v->setting * fabs(flow) * flow;
}

// ─── VALVE DISPATCH ───

void valve_compute(TValve* v, double* flow, double* headloss,
                   double h_up, double h_down,
                   double elev_up, double elev_down)
{
    switch (v->type) {
        case PRV:
            v->state = prv_check_state(v, h_up, h_down, elev_down);
            *headloss = prv_headloss(v, *flow, h_up, elev_down);
            break;
        case FCV:
            *flow = fcv_flow(v, h_up, h_down);
            *headloss = h_up - h_down;
            break;
        case TCV:
            *headloss = tcv_headloss(v, *flow);
            break;
        default:
            *headloss = 0.0;
    }
}`,
  },
  "tank.c — Tank Level Tracking": {
    category: "Network Elements",
    difficulty: "accessible",
    tags: ["tank", "reservoir", "level", "volume", "mass balance", "storage", "grade line"],
    description: "Tracks water levels in storage tanks using mass balance. Tank volume changes based on net inflow/outflow at each hydraulic time step. Supports cylindrical, conical, and custom volume curves. Tank level affects the hydraulic grade line, creating feedback between tank state and network flows.",
    equations: "V(t+dt) = V(t) + (Q_in - Q_out)·dt; H = elevation + level",
    inputs: "Tank geometry (diameter, min/max level), initial level, net flow",
    outputs: "Water level (ft), volume (ft³), head (ft)",
    c: `// tank.c — Tank Level Tracking for EPANET
// Mass balance: dV/dt = Q_in - Q_out
// Tank head feeds back into the hydraulic system

#include <math.h>

#define CYLINDRICAL 0
#define CUSTOM      1

typedef struct {
    double elevation;     // bottom elevation (ft)
    double init_level;    // initial water level (ft)
    double min_level;     // minimum level (ft)
    double max_level;     // maximum level (ft)
    double diameter;      // tank diameter (ft)
    double area;          // cross-sectional area (ft²)
    double volume;        // current volume (ft³)
    double level;         // current water level (ft)
    double head;          // current head = elevation + level
    int    shape;         // CYLINDRICAL or CUSTOM
    int    overflow;      // 1 if tank can overflow
} TTank;

// ─── INITIALIZE TANK ───

void tank_init(TTank* tk)
{
    tk->area = 3.14159265 * tk->diameter * tk->diameter / 4.0;
    tk->level = tk->init_level;
    tk->volume = tk->area * tk->level;
    tk->head = tk->elevation + tk->level;
}

// ─── UPDATE TANK LEVEL ───
// Euler integration: V(t+dt) = V(t) + Q_net * dt

void tank_update(TTank* tk, double net_inflow, double dt)
{
    double dV = net_inflow * dt;
    
    tk->volume += dV;
    
    // Compute new level from volume
    if (tk->shape == CYLINDRICAL) {
        tk->level = tk->volume / tk->area;
    }
    
    // Enforce level bounds
    if (tk->level < tk->min_level) {
        tk->level = tk->min_level;
        tk->volume = tk->area * tk->min_level;
    }
    if (tk->level > tk->max_level) {
        if (!tk->overflow) {
            tk->level = tk->max_level;
            tk->volume = tk->area * tk->max_level;
        }
    }
    
    // Update head (hydraulic grade line)
    tk->head = tk->elevation + tk->level;
}

// ─── TANK VOLUME FROM LEVEL ───
// For custom cross-sections, interpolate volume curve

double tank_volume_at_level(TTank* tk, double level)
{
    if (tk->shape == CYLINDRICAL) {
        return tk->area * level;
    }
    // For custom shapes: interpolate volume-level curve
    // (stored as array of level-volume pairs)
    return 0.0;
}

// ─── TANK GRADIENT ───
// dH/dQ for Jacobian — tank acts as a source term

double tank_gradient(TTank* tk, double dt)
{
    // Change in head per unit flow over time step
    // dH/dQ = dt / A  (for cylindrical tank)
    return dt / tk->area;
}`,
    python: `# tank.py — Tank Level Tracking for EPANET in Python

import math
from dataclasses import dataclass

@dataclass
class Tank:
    elevation: float      # bottom elevation (ft)
    init_level: float     # initial water level (ft)
    min_level: float      # minimum level (ft)
    max_level: float      # maximum level (ft)
    diameter: float       # tank diameter (ft)
    area: float = 0.0
    volume: float = 0.0
    level: float = 0.0
    head: float = 0.0
    overflow: bool = False

    def __post_init__(self):
        self.area = math.pi * self.diameter ** 2 / 4.0
        self.level = self.init_level
        self.volume = self.area * self.level
        self.head = self.elevation + self.level

    def update(self, net_inflow: float, dt: float):
        """Mass balance: V(t+dt) = V(t) + Q_net * dt"""
        self.volume += net_inflow * dt
        self.level = self.volume / self.area

        # Enforce bounds
        if self.level < self.min_level:
            self.level = self.min_level
            self.volume = self.area * self.min_level
        if self.level > self.max_level and not self.overflow:
            self.level = self.max_level
            self.volume = self.area * self.max_level

        self.head = self.elevation + self.level

    def gradient(self, dt: float) -> float:
        """dH/dQ for Jacobian: dt / A"""
        return dt / self.area`,
  },
  "node.c — Junction Demand/Head": {
    category: "Network Elements",
    difficulty: "accessible",
    tags: ["node", "junction", "demand", "head", "pressure", "elevation", "emitter"],
    description: "Manages junction demand and head computation. Each junction has a base demand that can be time-varied using patterns, an elevation, and computed head and pressure values. Pressure-dependent demands model low-pressure conditions. Emitter coefficients model sprinkler systems and leaks.",
    equations: "P = (H - E) × 0.4333 (pressure); Q_emitter = C × P^0.5 (emitter demand)",
    inputs: "Junction elevation, base demand, demand pattern, emitter coefficient",
    outputs: "Node head (ft), pressure (psi), actual demand (cfs)",
    c: `// node.c — Junction Demand and Head for EPANET
// Node mass balance: sum of inflows = sum of outflows + demand

#include <math.h>

typedef struct {
    char   id[32];       // node ID string
    double elevation;    // ft above datum
    double baseDemand;   // base demand (cfs)
    double demand;       // actual demand at current time
    double head;         // hydraulic head (ft)
    double pressure;     // pressure (psi)
    double emitter;      // emitter coefficient
    int    pattern;      // demand pattern index (-1 = none)
} TJunction;

// ─── COMPUTE PRESSURE FROM HEAD ───

double node_pressure(TJunction* j)
{
    // Pressure = (Head - Elevation) * conversion
    // 1 ft of water = 0.4333 psi
    j->pressure = (j->head - j->elevation) * 0.4333;
    return j->pressure;
}

// ─── APPLY DEMAND PATTERN ───

double node_demand(TJunction* j, double pattern_factor)
{
    // Actual demand = base demand × pattern multiplier
    j->demand = j->baseDemand * pattern_factor;
    return j->demand;
}

// ─── PRESSURE-DEPENDENT DEMAND ───
// Below minimum pressure, demand drops; below zero, no demand

double node_pdd(TJunction* j, double P_min, double P_full)
{
    double pressure = (j->head - j->elevation) * 0.4333;
    
    if (pressure >= P_full)
        return j->demand;           // Full demand
    else if (pressure <= P_min)
        return 0.0;                 // No demand
    else {
        // Wagner equation: Q = Q_full * sqrt((P-Pmin)/(Pfull-Pmin))
        double ratio = (pressure - P_min) / (P_full - P_min);
        return j->demand * sqrt(ratio);
    }
}

// ─── EMITTER DEMAND ───
// Models sprinklers, leaks: Q = C * P^gamma

double node_emitter_demand(TJunction* j, double gamma)
{
    double pressure = (j->head - j->elevation) * 0.4333;
    
    if (pressure <= 0.0 || j->emitter <= 0.0)
        return 0.0;
    
    return j->emitter * pow(pressure, gamma);
}

// ─── NODE IMBALANCE ───
// Error = demand - (sum of inflows - sum of outflows)

double node_imbalance(TJunction* j, double net_flow)
{
    return j->demand - net_flow;
}`,
  },
  "pattern.c — Time Patterns": {
    category: "Network Elements",
    difficulty: "accessible",
    tags: ["pattern", "time", "demand", "multiplier", "schedule", "diurnal"],
    description: "Manages time-varying demand patterns. Patterns store multiplier factors applied to base demands at regular time intervals. A typical diurnal pattern has 24 hourly multipliers representing daily water use variation (peak morning/evening, low overnight). Multiple patterns can be assigned to different demand categories.",
    inputs: "Pattern time step, multiplier factors, simulation time",
    outputs: "Pattern factor at current time",
    c: `// pattern.c — Time Pattern Management for EPANET
// Patterns store periodic multiplier factors applied to base demands
// Typical: 24-hour diurnal pattern with hourly multipliers

#include <stdlib.h>

typedef struct {
    char    id[32];       // pattern ID
    int     length;       // number of time periods
    double  interval;     // time step (seconds)
    double* factors;      // array of multiplier factors
} TPattern;

// ─── GET PATTERN FACTOR ───
// Returns the multiplier for the current simulation time

double pattern_factor(TPattern* pat, double time)
{
    int period;
    double total_duration;
    
    if (pat == NULL || pat->length == 0)
        return 1.0;
    
    total_duration = pat->length * pat->interval;
    
    // Wrap time around pattern duration (cyclic)
    while (time >= total_duration)
        time -= total_duration;
    while (time < 0.0)
        time += total_duration;
    
    period = (int)(time / pat->interval);
    if (period >= pat->length) period = pat->length - 1;
    
    return pat->factors[period];
}

// ─── CREATE DEFAULT DIURNAL PATTERN ───
// Typical residential water use: peak at 7-8am and 6-7pm

TPattern* pattern_create_diurnal(void)
{
    TPattern* pat = (TPattern*)malloc(sizeof(TPattern));
    int i;
    
    // 24-hour pattern with hourly multipliers
    double diurnal[24] = {
        0.5, 0.4, 0.3, 0.3, 0.4, 0.6,   // 12am-5am (low)
        0.8, 1.3, 1.4, 1.2, 1.0, 1.0,   // 6am-11am (morning peak)
        1.1, 1.0, 0.9, 0.9, 1.0, 1.2,   // 12pm-5pm (afternoon)
        1.4, 1.3, 1.1, 0.9, 0.7, 0.6    // 6pm-11pm (evening peak)
    };
    
    pat->length = 24;
    pat->interval = 3600.0;  // 1 hour
    pat->factors = (double*)malloc(24 * sizeof(double));
    for (i = 0; i < 24; i++)
        pat->factors[i] = diurnal[i];
    
    return pat;
}

// ─── INTERPOLATED FACTOR ───
// Linear interpolation between pattern time steps

double pattern_factor_interp(TPattern* pat, double time)
{
    int p1, p2;
    double frac, total_duration;
    
    if (pat == NULL || pat->length == 0)
        return 1.0;
    
    total_duration = pat->length * pat->interval;
    while (time >= total_duration) time -= total_duration;
    
    p1 = (int)(time / pat->interval);
    p2 = (p1 + 1) % pat->length;
    frac = (time - p1 * pat->interval) / pat->interval;
    
    return pat->factors[p1] * (1.0 - frac) + pat->factors[p2] * frac;
}`,
  },
  "quality.c — Water Quality Solver": {
    category: "Water Quality",
    difficulty: "advanced",
    tags: ["water quality", "transport", "lagrangian", "chlorine", "decay", "age", "tracing", "constituent"],
    description: "Tracks the transport and fate of chemical constituents through the pipe network using Lagrangian time-driven method. Water quality segments move through pipes, mix at junctions, and react over time. Tracks chlorine decay, contaminant propagation, water age, and source tracing.",
    equations: "∂C/∂t + u·∂C/∂x = -k·C^n (advection-reaction); C_mix = ΣQ_i·C_i / ΣQ_i (junction mixing)",
    inputs: "Pipe flows/velocities, initial concentrations, reaction rate constants, source locations",
    outputs: "Constituent concentration at each node, water age, source trace fraction",
    c: `// quality.c — Water Quality Transport Solver for EPANET
// Lagrangian time-driven method: track water segments as they
// move through pipes, mix at junctions, and react chemically

#include <math.h>
#include <stdlib.h>

#define CHEMICAL 0   // generic chemical (chlorine, etc.)
#define AGE      1   // water age tracking
#define TRACE    2   // source tracing (% from source)

typedef struct {
    double concentration;  // constituent concentration
    double volume;         // segment volume (ft³)
} TSegment;

typedef struct {
    TSegment* segments;    // linked list of water segments
    int       n_segments;
    double    length;      // pipe length (ft)
    double    volume;      // pipe volume (ft³)
    double    flow;        // current flow (cfs)
    double    velocity;    // flow velocity (ft/s)
    double    area;        // cross-section area (ft²)
} TQualPipe;

typedef struct {
    double concentration;  // mixed concentration at node
    double source_conc;    // source injection concentration
    int    source_type;    // 0=none, 1=concentration, 2=mass
} TQualNode;

// ─── ADVECTION ───
// Move water segments through pipes based on velocity

void quality_transport(TQualPipe* pipe, double dt)
{
    double vol_moved;
    
    if (fabs(pipe->flow) < 1e-10) return;
    
    // Volume of water moving in this time step
    vol_moved = fabs(pipe->flow) * dt;
    
    // Create new segment at upstream end with source concentration
    // Remove volume from downstream end
    
    if (pipe->flow > 0) {
        // Forward flow: new segment enters from from_node
        TSegment new_seg;
        new_seg.volume = vol_moved;
        new_seg.concentration = 0.0;  // set by node mixing
        
        // Add to front of segment list
        // Remove equivalent volume from back
        pipe->segments[0] = new_seg;
    }
}

// ─── JUNCTION MIXING ───
// Perfect mixing: C_mix = Σ(Q_i * C_i) / Σ(Q_i)

double quality_junction_mix(TQualNode* node, double* inflows,
                            double* concentrations, int n_inflows)
{
    double total_mass = 0.0;
    double total_flow = 0.0;
    int i;
    
    for (i = 0; i < n_inflows; i++) {
        total_mass += inflows[i] * concentrations[i];
        total_flow += inflows[i];
    }
    
    // Add any source injection
    if (node->source_type == 1) {
        // Setpoint source: override concentration
        node->concentration = node->source_conc;
    } else if (node->source_type == 2) {
        // Mass booster: add mass
        total_mass += node->source_conc;
        node->concentration = total_mass / (total_flow + 1e-10);
    } else {
        node->concentration = total_mass / (total_flow + 1e-10);
    }
    
    return node->concentration;
}

// ─── CHEMICAL REACTION ───
// First-order decay: C(t) = C0 * exp(-k*t)

double quality_react_bulk(double conc, double kb, double dt)
{
    // Bulk reaction: dC/dt = -kb * C^n  (n=1 for first-order)
    return conc * exp(-kb * dt);
}

double quality_react_wall(double conc, double kw,
                          double diameter, double dt)
{
    // Wall reaction: accounts for pipe diameter
    // Effective rate = kw * 4/D (surface-to-volume ratio)
    double keff = kw * 4.0 / diameter;
    return conc * exp(-keff * dt);
}

// ─── WATER AGE ───

double quality_age_update(double current_age, double dt)
{
    return current_age + dt / 3600.0;  // age in hours
}

// ─── MAIN QUALITY STEP ───

void quality_step(TQualNode* nodes, TQualPipe* pipes,
                  int n_nodes, int n_pipes, double dt,
                  int qual_type, double kb, double kw)
{
    int i;
    
    // Step 1: Transport — move segments through pipes
    for (i = 0; i < n_pipes; i++)
        quality_transport(&pipes[i], dt);
    
    // Step 2: Mix at junctions
    // (compute mixed concentration from all inflows)
    
    // Step 3: React in pipes
    for (i = 0; i < n_pipes; i++) {
        int j;
        for (j = 0; j < pipes[i].n_segments; j++) {
            double c = pipes[i].segments[j].concentration;
            c = quality_react_bulk(c, kb, dt);
            c = quality_react_wall(c, kw, 
                sqrt(4.0*pipes[i].area/3.14159), dt);
            pipes[i].segments[j].concentration = c;
        }
    }
}`,
  },
  "qualreact.c — Chemical Reactions": {
    category: "Water Quality",
    difficulty: "intermediate",
    tags: ["reaction", "kinetics", "chlorine", "decay", "bulk", "wall", "first-order", "limiting"],
    description: "Computes chemical reaction kinetics for constituents in pipe segments. Supports first-order decay (chlorine), zero-order growth, and limiting concentration models. Separates bulk reactions (in the water) from wall reactions (at the pipe surface). Wall reaction rates depend on mass transfer and pipe surface area.",
    equations: "dC/dt = -kb·C (first-order); dC/dt = -kw·(4/D)·C (wall); C_limit = Cl·(1-e^(-kt)) (limiting)",
    inputs: "Bulk reaction rate, wall reaction rate, pipe diameter, concentration",
    outputs: "Reacted concentration after time step",
    c: `// qualreact.c — Chemical Reaction Kinetics for EPANET
// Bulk (in water) and wall (at pipe surface) reactions
// Support for first-order, zero-order, and limiting models

#include <math.h>

#define FIRST_ORDER 1
#define ZERO_ORDER  2
#define LIMITING    3

typedef struct {
    int    order;       // reaction order type
    double kb;          // bulk reaction rate (1/sec)
    double kw;          // wall reaction rate (ft/sec)
    double Climit;      // limiting concentration
    double kb_wall;     // wall rate adjusted for mass transfer
} TReaction;

// ─── BULK REACTION ───
// Reaction in the water volume

double react_bulk(TReaction* r, double conc, double dt)
{
    switch (r->order) {
        case FIRST_ORDER:
            // C(t+dt) = C(t) * exp(-kb * dt)
            return conc * exp(-r->kb * dt);
            
        case ZERO_ORDER:
            // C(t+dt) = C(t) - kb * dt
            return fmax(conc - r->kb * dt, 0.0);
            
        case LIMITING:
            // C(t+dt) = Cl - (Cl - C(t)) * exp(-kb*dt)
            return r->Climit - (r->Climit - conc) *
                exp(-r->kb * dt);
            
        default:
            return conc;
    }
}

// ─── WALL REACTION ───
// Reaction at the pipe wall surface

double react_wall(TReaction* r, double conc, double diameter,
                  double dt)
{
    double kf, keff;
    
    if (r->kw == 0.0) return conc;
    
    // Mass transfer coefficient (Notter-Sleicher)
    kf = 1.0;  // simplified; real: f(Re, Sc, D)
    
    // Effective wall rate = kw * kf / (kw + kf)
    // Surface-to-volume ratio = 4/D
    keff = r->kw * kf / (r->kw + kf) * 4.0 / diameter;
    
    return conc * exp(-keff * dt);
}

// ─── COMBINED PIPE REACTION ───

double react_pipe(TReaction* r, double conc, double diameter,
                  double dt)
{
    double c = react_bulk(r, conc, dt);
    c = react_wall(r, c, diameter, dt);
    return c;
}`,
  },
  "qualroute.c — Quality Routing": {
    category: "Water Quality",
    difficulty: "intermediate",
    tags: ["routing", "lagrangian", "segments", "transport", "advection", "mixing"],
    description: "Routes water quality through the network using Lagrangian transport. Water segments are tracked as discrete parcels moving through pipes at flow velocity. At junctions, inflows mix perfectly. New segments are created at upstream boundaries; old segments are removed at downstream boundaries.",
    inputs: "Pipe flows, segment concentrations, junction mixing results",
    outputs: "Updated segment positions and concentrations",
    c: `// qualroute.c — Quality Routing for EPANET
// Lagrangian segment tracking through pipe network
// Segments move through pipes at flow velocity

#include <math.h>
#include <stdlib.h>

#define MAX_SEGMENTS 100

typedef struct {
    double conc;       // concentration
    double vol;        // volume of segment (ft³)
} Segment;

typedef struct {
    Segment segs[MAX_SEGMENTS];
    int     n_segs;
    double  pipe_vol;   // total pipe volume
    double  flow;       // current flow
    int     from_node;
    int     to_node;
} QualLink;

// ─── RELEASE FROM UPSTREAM ───
// Create new segment at pipe entrance from mixed node quality

void qualroute_release(QualLink* link, double conc_in, double dt)
{
    double vol_in = fabs(link->flow) * dt;
    
    if (vol_in <= 0.0 || link->flow == 0.0) return;
    
    // If same concentration as last segment, extend it
    if (link->n_segs > 0) {
        Segment* first = &link->segs[0];
        if (fabs(first->conc - conc_in) < 1e-6) {
            first->vol += vol_in;
            return;
        }
    }
    
    // Create new segment at upstream end
    if (link->n_segs < MAX_SEGMENTS) {
        // Shift segments down
        for (int i = link->n_segs; i > 0; i--)
            link->segs[i] = link->segs[i-1];
        link->segs[0].conc = conc_in;
        link->segs[0].vol = vol_in;
        link->n_segs++;
    }
}

// ─── ACCUMULATE AT DOWNSTREAM ───
// Remove volume from downstream end, contribute to node mixing

double qualroute_accumulate(QualLink* link, double dt,
                            double* vol_out)
{
    double vol_needed = fabs(link->flow) * dt;
    double total_mass = 0.0;
    double total_vol = 0.0;
    
    *vol_out = 0.0;
    
    // Remove segments from downstream end
    while (vol_needed > 0.0 && link->n_segs > 0) {
        Segment* last = &link->segs[link->n_segs - 1];
        
        if (last->vol <= vol_needed) {
            total_mass += last->conc * last->vol;
            total_vol += last->vol;
            vol_needed -= last->vol;
            link->n_segs--;
        } else {
            total_mass += last->conc * vol_needed;
            total_vol += vol_needed;
            last->vol -= vol_needed;
            vol_needed = 0.0;
        }
    }
    
    *vol_out = total_vol;
    return (total_vol > 0.0) ? total_mass / total_vol : 0.0;
}`,
  },
  "rules.c — Rule-Based Controls": {
    category: "Controls",
    difficulty: "intermediate",
    tags: ["rules", "controls", "IF-THEN-ELSE", "automation", "pump", "valve", "priority"],
    description: "Evaluates IF-THEN-ELSE control rules that automate pump and valve operation. Rules can reference system time, tank levels, node pressures, link flows, and link status. Priority-based evaluation resolves conflicts between multiple rules. Similar to SWMM5's controls.c but for water distribution.",
    equations: "IF condition THEN action [ELSE action] (with PRIORITY ranking)",
    inputs: "Rule conditions (tank levels, pressures, flows, time), network state",
    outputs: "Updated link statuses (open/closed/speed settings)",
    c: `// rules.c — Rule-Based Controls for EPANET
// IF-THEN-ELSE logic for automating pump/valve operation
// Priority system resolves conflicts between competing rules

#include <string.h>

#define MAX_RULES    100
#define MAX_PREMISES 10
#define MAX_ACTIONS  10

// Condition operators
#define EQ 1  // equals
#define NE 2  // not equals
#define LT 3  // less than
#define GT 4  // greater than
#define LE 5  // less or equal
#define GE 6  // greater or equal

// Object types for conditions
#define NODE_OBJ   1
#define LINK_OBJ   2
#define SYSTEM_OBJ 3

// Variable types
#define PRESSURE_VAR  1
#define HEAD_VAR      2
#define DEMAND_VAR    3
#define FLOW_VAR      4
#define STATUS_VAR    5
#define LEVEL_VAR     6
#define TIME_VAR      7
#define CLOCKTIME_VAR 8

typedef struct {
    int    object;     // NODE_OBJ, LINK_OBJ, SYSTEM_OBJ
    int    index;      // node/link index
    int    variable;   // what to check
    int    relop;      // comparison operator
    double value;      // threshold value
} TPremise;

typedef struct {
    int    link_index; // which link to control
    int    status;     // new status (open/closed)
    double setting;    // new setting (speed, pressure)
} TAction;

typedef struct {
    TPremise premises[MAX_PREMISES];
    int      n_premises;
    TAction  then_actions[MAX_ACTIONS];
    int      n_then;
    TAction  else_actions[MAX_ACTIONS];
    int      n_else;
    double   priority;     // higher = takes precedence
} TRule;

// ─── EVALUATE SINGLE PREMISE ───

int rule_check_premise(TPremise* p, double* node_heads,
                       double* node_demands, double* link_flows,
                       int* link_status, double sim_time,
                       double* tank_levels)
{
    double value = 0.0;
    
    // Get current value of the referenced variable
    switch (p->variable) {
        case PRESSURE_VAR:
            value = node_heads[p->index] * 0.4333;
            break;
        case HEAD_VAR:
            value = node_heads[p->index];
            break;
        case LEVEL_VAR:
            value = tank_levels[p->index];
            break;
        case FLOW_VAR:
            value = link_flows[p->index];
            break;
        case STATUS_VAR:
            value = (double)link_status[p->index];
            break;
        case TIME_VAR:
            value = sim_time;
            break;
    }
    
    // Compare
    switch (p->relop) {
        case EQ: return (value == p->value);
        case NE: return (value != p->value);
        case LT: return (value <  p->value);
        case GT: return (value >  p->value);
        case LE: return (value <= p->value);
        case GE: return (value >= p->value);
    }
    return 0;
}

// ─── EVALUATE ALL RULES ───

void rules_evaluate(TRule* rules, int n_rules,
                    double* node_heads, double* node_demands,
                    double* link_flows, int* link_status,
                    double sim_time, double* tank_levels)
{
    int i, j;
    int all_true;
    
    // Sort rules by priority (higher first)
    // (assumed pre-sorted)
    
    for (i = 0; i < n_rules; i++) {
        TRule* r = &rules[i];
        
        // Check all premises (AND logic)
        all_true = 1;
        for (j = 0; j < r->n_premises; j++) {
            if (!rule_check_premise(&r->premises[j],
                    node_heads, node_demands, link_flows,
                    link_status, sim_time, tank_levels)) {
                all_true = 0;
                break;
            }
        }
        
        // Apply actions
        if (all_true) {
            for (j = 0; j < r->n_then; j++) {
                TAction* a = &r->then_actions[j];
                link_status[a->link_index] = a->status;
            }
        } else {
            for (j = 0; j < r->n_else; j++) {
                TAction* a = &r->else_actions[j];
                link_status[a->link_index] = a->status;
            }
        }
    }
}`,
  },
  "controls.c — Simple Controls": {
    category: "Controls",
    difficulty: "accessible",
    tags: ["controls", "simple", "time", "level", "schedule", "pump", "valve"],
    description: "Implements simple time-based and level-based controls for pumps and valves. Unlike rule-based controls, simple controls check a single condition (time or tank level) and change a single link's status. These represent basic operational schedules like 'open pump at 6am, close at 10pm'.",
    inputs: "Control type (time/level), threshold, link to control, target status",
    outputs: "Updated link status at each time step",
    c: `// controls.c — Simple Controls for EPANET
// Single-condition controls: time-based or level-based
// "LINK pump1 OPEN AT TIME 6:00" or "LINK pump1 CLOSED IF TANK t1 ABOVE 20"

typedef struct {
    int    link_index;    // link being controlled
    int    node_index;    // tank node (-1 for time-based)
    int    type;          // 0=time, 1=tank level
    int    status;        // target status (OPEN/CLOSED)
    double setting;       // target setting (speed, etc.)
    double level;         // tank level threshold (ft)
    double time;          // time threshold (seconds)
    int    above_below;   // 0=below threshold, 1=above threshold
} TControl;

// ─── CHECK TIME-BASED CONTROL ───

int control_check_time(TControl* ctrl, double sim_time,
                       double prev_time)
{
    // Trigger when simulation crosses the control time
    if (ctrl->type != 0) return 0;
    
    if (prev_time < ctrl->time && sim_time >= ctrl->time)
        return 1;
    
    return 0;
}

// ─── CHECK LEVEL-BASED CONTROL ───

int control_check_level(TControl* ctrl, double tank_level)
{
    if (ctrl->type != 1) return 0;
    
    if (ctrl->above_below == 1)
        return (tank_level >= ctrl->level);
    else
        return (tank_level <= ctrl->level);
}

// ─── EVALUATE ALL SIMPLE CONTROLS ───

void controls_evaluate(TControl* controls, int n_controls,
                       double sim_time, double prev_time,
                       double* tank_levels, int* link_status,
                       double* link_settings)
{
    int i;
    
    for (i = 0; i < n_controls; i++) {
        TControl* c = &controls[i];
        int triggered = 0;
        
        if (c->type == 0)
            triggered = control_check_time(c, sim_time, prev_time);
        else if (c->type == 1)
            triggered = control_check_level(c, tank_levels[c->node_index]);
        
        if (triggered) {
            link_status[c->link_index] = c->status;
            if (c->setting > 0.0)
                link_settings[c->link_index] = c->setting;
        }
    }
}`,
  },
  "input.c — INP File Parser": {
    category: "Parser / IO",
    difficulty: "intermediate",
    tags: ["parser", "INP", "file", "input", "sections", "junctions", "pipes", "options"],
    description: "Reads EPANET's .inp text file format, populating all network data structures. Parses sections including [JUNCTIONS], [PIPES], [PUMPS], [VALVES], [TANKS], [RESERVOIRS], [DEMANDS], [PATTERNS], [CURVES], [CONTROLS], [RULES], [OPTIONS], and more.",
    inputs: ".inp file path or text content",
    outputs: "Populated network data structures (nodes, links, patterns, options)",
    c: `// input.c — EPANET INP File Parser
// Reads the standard EPANET text input format
// Section-based parser: [JUNCTIONS], [PIPES], etc.

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#define MAX_LINE    256
#define MAX_TOKENS  20

typedef enum {
    SEC_NONE,
    SEC_JUNCTIONS,
    SEC_RESERVOIRS,
    SEC_TANKS,
    SEC_PIPES,
    SEC_PUMPS,
    SEC_VALVES,
    SEC_DEMANDS,
    SEC_PATTERNS,
    SEC_CURVES,
    SEC_CONTROLS,
    SEC_RULES,
    SEC_OPTIONS,
    SEC_TIMES,
    SEC_REPORT,
    SEC_COORDINATES,
    SEC_END,
} Section;

// ─── SECTION LOOKUP ───

Section parse_section(char* line)
{
    if (strstr(line, "[JUNCTIONS]"))  return SEC_JUNCTIONS;
    if (strstr(line, "[RESERVOIRS]")) return SEC_RESERVOIRS;
    if (strstr(line, "[TANKS]"))      return SEC_TANKS;
    if (strstr(line, "[PIPES]"))      return SEC_PIPES;
    if (strstr(line, "[PUMPS]"))      return SEC_PUMPS;
    if (strstr(line, "[VALVES]"))     return SEC_VALVES;
    if (strstr(line, "[PATTERNS]"))   return SEC_PATTERNS;
    if (strstr(line, "[CURVES]"))     return SEC_CURVES;
    if (strstr(line, "[CONTROLS]"))   return SEC_CONTROLS;
    if (strstr(line, "[RULES]"))      return SEC_RULES;
    if (strstr(line, "[OPTIONS]"))    return SEC_OPTIONS;
    if (strstr(line, "[TIMES]"))      return SEC_TIMES;
    if (strstr(line, "[END]"))        return SEC_END;
    return SEC_NONE;
}

// ─── TOKENIZE LINE ───

int tokenize(char* line, char* tokens[], int max_tokens)
{
    int count = 0;
    char* tok = strtok(line, " \\t\\n");
    while (tok && count < max_tokens) {
        tokens[count++] = tok;
        tok = strtok(NULL, " \\t\\n");
    }
    return count;
}

// ─── PARSE JUNCTION LINE ───
// Format: ID  Elevation  Demand  [Pattern]

void parse_junction(char* tokens[], int n_tokens,
                    TJunction* nodes, int* n_nodes)
{
    if (n_tokens < 2) return;
    
    TJunction* j = &nodes[*n_nodes];
    strncpy(j->id, tokens[0], 31);
    j->elevation = atof(tokens[1]);
    j->baseDemand = (n_tokens > 2) ? atof(tokens[2]) : 0.0;
    j->pattern = (n_tokens > 3) ? atoi(tokens[3]) : -1;
    j->head = j->elevation;
    j->pressure = 0.0;
    (*n_nodes)++;
}

// ─── PARSE PIPE LINE ───
// Format: ID  Node1  Node2  Length  Diameter  Roughness  [MinorLoss]  [Status]

void parse_pipe(char* tokens[], int n_tokens,
                TPipe* pipes, int* n_pipes)
{
    if (n_tokens < 6) return;
    
    TPipe* p = &pipes[*n_pipes];
    p->from_node = atoi(tokens[1]);
    p->to_node = atoi(tokens[2]);
    p->length = atof(tokens[3]);
    p->diameter = atof(tokens[4]) / 12.0;  // inches to feet
    p->roughness = atof(tokens[5]);
    p->flow = 0.0;
    (*n_pipes)++;
}

// ─── MAIN PARSER ───

int parse_inp_file(const char* filename, TNetwork* net)
{
    FILE* fp;
    char line[MAX_LINE];
    char* tokens[MAX_TOKENS];
    int n_tokens;
    Section section = SEC_NONE;
    
    fp = fopen(filename, "r");
    if (!fp) return -1;
    
    while (fgets(line, MAX_LINE, fp)) {
        // Skip comments and blank lines
        if (line[0] == ';' || line[0] == '\\n') continue;
        
        // Check for section header
        if (line[0] == '[') {
            section = parse_section(line);
            if (section == SEC_END) break;
            continue;
        }
        
        // Tokenize and parse based on current section
        n_tokens = tokenize(line, tokens, MAX_TOKENS);
        if (n_tokens == 0) continue;
        
        switch (section) {
            case SEC_JUNCTIONS:
                parse_junction(tokens, n_tokens,
                    net->nodes, &net->n_nodes);
                break;
            case SEC_PIPES:
                parse_pipe(tokens, n_tokens,
                    net->pipes, &net->n_pipes);
                break;
            // Additional sections: TANKS, PUMPS, VALVES, etc.
            default:
                break;
        }
    }
    
    fclose(fp);
    return 0;
}`,
  },
  "output.c — Binary Output Writer": {
    category: "Parser / IO",
    difficulty: "intermediate",
    tags: ["output", "binary", "results", "time series", "file format"],
    description: "Writes simulation results to EPANET's binary output file format. The output file contains a header with network structure, followed by time-series data for node demands, heads, pressures, quality, and link flows, velocities, head losses for each reporting period.",
    inputs: "Network state at each reporting period, output file handle",
    outputs: "Binary .out file with time-series results",
    c: `// output.c — Binary Output File Writer for EPANET
// Writes results in EPANET's standard binary format:
// [Prolog] [Energy] [Dynamic Results] [Epilog]

#include <stdio.h>

#define MAGICNUMBER 516114521
#define VERSION     20200

typedef struct {
    FILE*  fp;
    int    n_nodes;
    int    n_links;
    int    n_periods;   // number of reporting periods
    int    report_step; // reporting interval (seconds)
} TOutput;

// ─── WRITE PROLOG ───
// Header: magic number, version, node/link counts

void output_write_prolog(TOutput* out, TNetwork* net)
{
    int magic = MAGICNUMBER;
    int version = VERSION;
    
    fwrite(&magic, sizeof(int), 1, out->fp);
    fwrite(&version, sizeof(int), 1, out->fp);
    fwrite(&net->n_nodes, sizeof(int), 1, out->fp);
    fwrite(&net->n_pipes, sizeof(int), 1, out->fp);
    
    // Write node IDs and link IDs
    // Write node types (junction, tank, reservoir)
    // Write link types (pipe, pump, valve)
}

// ─── WRITE TIME STEP RESULTS ───
// For each reporting period, write all node and link values

void output_write_step(TOutput* out, TNetwork* net)
{
    int i;
    float value;
    
    // Node results: demand, head, pressure, quality
    for (i = 0; i < net->n_nodes; i++) {
        value = (float)net->nodes[i].demand;
        fwrite(&value, sizeof(float), 1, out->fp);
    }
    for (i = 0; i < net->n_nodes; i++) {
        value = (float)net->nodes[i].head;
        fwrite(&value, sizeof(float), 1, out->fp);
    }
    for (i = 0; i < net->n_nodes; i++) {
        value = (float)net->nodes[i].pressure;
        fwrite(&value, sizeof(float), 1, out->fp);
    }
    
    // Link results: flow, velocity, headloss, status
    for (i = 0; i < net->n_pipes; i++) {
        value = (float)net->pipes[i].flow;
        fwrite(&value, sizeof(float), 1, out->fp);
    }
    
    out->n_periods++;
}

// ─── WRITE EPILOG ───
// Footer: statistics and file offsets

void output_write_epilog(TOutput* out)
{
    fwrite(&out->n_periods, sizeof(int), 1, out->fp);
    
    int magic = MAGICNUMBER;
    fwrite(&magic, sizeof(int), 1, out->fp);
}`,
  },
  "report.c — Text Report Writer": {
    category: "Parser / IO",
    difficulty: "accessible",
    tags: ["report", "text", "output", "results", "formatting", "summary"],
    description: "Generates human-readable text reports of simulation results. The report includes network summary statistics, node and link results tables, energy usage reports, and any warning/error messages. Report formatting is controlled by [REPORT] section options in the INP file.",
    inputs: "Simulation results, report formatting options",
    outputs: "Formatted text report (.rpt file)",
    c: `// report.c — Text Report Writer for EPANET
// Generates human-readable summary of simulation results

#include <stdio.h>
#include <string.h>

// ─── WRITE HEADER ───

void report_header(FILE* fp, const char* title)
{
    fprintf(fp, "  *****************************************************\\n");
    fprintf(fp, "  *                  E P A N E T                      *\\n");
    fprintf(fp, "  *       Hydraulic and Water Quality Model           *\\n");
    fprintf(fp, "  *****************************************************\\n");
    fprintf(fp, "\\n  %s\\n\\n", title);
}

// ─── NODE RESULTS TABLE ───

void report_nodes(FILE* fp, TNode* nodes, int n_nodes,
                  double sim_time)
{
    int i;
    
    fprintf(fp, "  Node Results at time %.2f hours:\\n", sim_time/3600);
    fprintf(fp, "  %-12s %12s %12s %12s\\n",
            "Node", "Demand", "Head", "Pressure");
    fprintf(fp, "  %-12s %12s %12s %12s\\n",
            "----", "------", "----", "--------");
    
    for (i = 0; i < n_nodes; i++) {
        fprintf(fp, "  %-12d %12.4f %12.4f %12.4f\\n",
                i + 1,
                nodes[i].demand,
                nodes[i].head,
                nodes[i].pressure);
    }
    fprintf(fp, "\\n");
}

// ─── LINK RESULTS TABLE ───

void report_links(FILE* fp, TPipe* pipes, int n_pipes,
                  double sim_time)
{
    int i;
    
    fprintf(fp, "  Link Results at time %.2f hours:\\n", sim_time/3600);
    fprintf(fp, "  %-12s %12s %12s %12s\\n",
            "Link", "Flow", "Velocity", "Headloss");
    fprintf(fp, "  %-12s %12s %12s %12s\\n",
            "----", "----", "--------", "--------");
    
    for (i = 0; i < n_pipes; i++) {
        double area = 3.14159 * pipes[i].diameter *
            pipes[i].diameter / 4.0;
        double vel = pipes[i].flow / (area + 1e-10);
        double hl = pipe_headloss_hw(&pipes[i], pipes[i].flow);
        
        fprintf(fp, "  %-12d %12.4f %12.4f %12.4f\\n",
                i + 1,
                pipes[i].flow,
                vel,
                hl / pipes[i].length * 1000.0);
    }
    fprintf(fp, "\\n");
}

// ─── SUMMARY STATISTICS ───

void report_summary(FILE* fp, int iterations, double max_change)
{
    fprintf(fp, "  Hydraulic Status:\\n");
    fprintf(fp, "    Converged in %d iterations\\n", iterations);
    fprintf(fp, "    Maximum head change: %.6f ft\\n", max_change);
    fprintf(fp, "\\n");
}`,
  },
  "inpfile.c — Input File Utilities": {
    category: "Parser / IO",
    difficulty: "accessible",
    tags: ["input", "file", "utilities", "save", "export", "INP format"],
    description: "Utility functions for reading and writing EPANET INP file sections. Includes functions to save modified networks back to INP format, validate input data, and convert between different unit systems (US customary, SI).",
    inputs: "Network data structures, file path",
    outputs: "Formatted INP file sections",
    c: `// inpfile.c — Input File Utilities for EPANET
// Read/write helpers and unit conversion

#include <stdio.h>
#include <math.h>

// ─── UNIT CONVERSION ───
// EPANET supports US customary and SI units

typedef struct {
    double flow_factor;     // CFS to user units
    double head_factor;     // ft to user units
    double pressure_factor; // psi to user units
    double length_factor;   // ft to user units
    double diameter_factor; // ft to user units (or inches)
} TUnits;

void units_set_us(TUnits* u)
{
    u->flow_factor = 448.831;   // CFS to GPM
    u->head_factor = 1.0;       // ft
    u->pressure_factor = 1.0;   // psi
    u->length_factor = 1.0;     // ft
    u->diameter_factor = 12.0;  // ft to inches
}

void units_set_si(TUnits* u)
{
    u->flow_factor = 28.3168;   // CFS to LPS
    u->head_factor = 0.3048;    // ft to m
    u->pressure_factor = 6.895; // psi to kPa
    u->length_factor = 0.3048;  // ft to m
    u->diameter_factor = 304.8; // ft to mm
}

// ─── SAVE NETWORK TO INP ───

void save_junctions(FILE* fp, TNode* nodes, int n, TUnits* u)
{
    int i;
    fprintf(fp, "[JUNCTIONS]\\n");
    fprintf(fp, ";ID              Elev        Demand\\n");
    for (i = 0; i < n; i++) {
        fprintf(fp, " %-16d %10.2f  %10.4f\\n",
                i + 1,
                nodes[i].elevation * u->head_factor,
                nodes[i].demand * u->flow_factor);
    }
    fprintf(fp, "\\n");
}

void save_pipes(FILE* fp, TPipe* pipes, int n, TUnits* u)
{
    int i;
    fprintf(fp, "[PIPES]\\n");
    fprintf(fp, ";ID  Node1  Node2  Length  Diameter  Roughness\\n");
    for (i = 0; i < n; i++) {
        fprintf(fp, " %-6d %-6d %-6d %10.2f %8.2f %8.2f\\n",
                i + 1,
                pipes[i].from_node + 1,
                pipes[i].to_node + 1,
                pipes[i].length * u->length_factor,
                pipes[i].diameter * u->diameter_factor,
                pipes[i].roughness);
    }
    fprintf(fp, "\\n");
}`,
  },
  "project.c — Project Data Structures": {
    category: "Infrastructure",
    difficulty: "intermediate",
    tags: ["project", "data structures", "initialization", "memory", "network", "model"],
    description: "Defines all data structures for the pipe network model: nodes (junctions, tanks, reservoirs), links (pipes, pumps, valves), patterns, curves, controls, and simulation options. The project object owns all network data and is passed to every computation function.",
    inputs: "None (defines data structures)",
    outputs: "Initialized project data structure",
    c: `// project.c — Project Data Structures for EPANET
// Central data store for the entire pipe network model

#include <stdlib.h>
#include <string.h>

#define MAX_NODES    10000
#define MAX_LINKS    10000
#define MAX_PATTERNS 100
#define MAX_CURVES   100

typedef struct {
    // Network elements
    TNode*    nodes;
    TPipe*    pipes;
    TPump*    pumps;
    TValve*   valves;
    TTank*    tanks;
    TPattern* patterns;
    
    // Counts
    int n_junctions;
    int n_tanks;
    int n_reservoirs;
    int n_pipes;
    int n_pumps;
    int n_valves;
    int n_patterns;
    
    // Simulation options
    double duration;       // total simulation time (sec)
    double hyd_step;       // hydraulic time step (sec)
    double qual_step;      // quality time step (sec)
    double report_step;    // reporting time step (sec)
    int    max_iter;       // max hydraulic iterations
    double tolerance;      // convergence tolerance (ft)
    int    formula;        // head loss formula (H-W/D-W/C-M)
    int    qual_type;      // quality analysis type
    double spec_gravity;   // fluid specific gravity
    double viscosity;      // kinematic viscosity
    
    // Hash tables for ID lookups
    void* node_hash;
    void* link_hash;
    
    // Title and notes
    char title[256];
    char notes[1024];
} TProject;

// ─── CREATE PROJECT ───

TProject* project_create(void)
{
    TProject* p = (TProject*)calloc(1, sizeof(TProject));
    
    p->nodes    = (TNode*)calloc(MAX_NODES, sizeof(TNode));
    p->pipes    = (TPipe*)calloc(MAX_LINKS, sizeof(TPipe));
    p->pumps    = (TPump*)calloc(MAX_LINKS, sizeof(TPump));
    p->valves   = (TValve*)calloc(MAX_LINKS, sizeof(TValve));
    p->tanks    = (TTank*)calloc(MAX_NODES, sizeof(TTank));
    p->patterns = (TPattern*)calloc(MAX_PATTERNS, sizeof(TPattern));
    
    // Default options
    p->duration    = 86400.0;   // 24 hours
    p->hyd_step    = 3600.0;    // 1 hour
    p->qual_step   = 300.0;     // 5 minutes
    p->report_step = 3600.0;    // 1 hour
    p->max_iter    = 200;
    p->tolerance   = 0.001;
    p->formula     = 1;         // Hazen-Williams
    p->spec_gravity = 1.0;
    p->viscosity   = 1.1e-5;
    
    return p;
}

// ─── DELETE PROJECT ───

void project_delete(TProject* p)
{
    if (!p) return;
    free(p->nodes);
    free(p->pipes);
    free(p->pumps);
    free(p->valves);
    free(p->tanks);
    free(p->patterns);
    free(p);
}

// ─── ADD JUNCTION ───

int project_add_junction(TProject* p, const char* id,
                         double elevation, double demand)
{
    int idx = p->n_junctions;
    if (idx >= MAX_NODES) return -1;
    
    strncpy(p->nodes[idx].id, id, 31);
    p->nodes[idx].elevation = elevation;
    p->nodes[idx].baseDemand = demand;
    p->nodes[idx].head = elevation;
    p->n_junctions++;
    
    return idx;
}

// ─── ADD PIPE ───

int project_add_pipe(TProject* p, int from, int to,
                     double length, double diameter,
                     double roughness)
{
    int idx = p->n_pipes;
    if (idx >= MAX_LINKS) return -1;
    
    p->pipes[idx].from_node = from;
    p->pipes[idx].to_node = to;
    p->pipes[idx].length = length;
    p->pipes[idx].diameter = diameter;
    p->pipes[idx].roughness = roughness;
    p->pipes[idx].formula = p->formula;
    p->n_pipes++;
    
    return idx;
}`,
  },
  "hash.c — Hash Table": {
    category: "Infrastructure",
    difficulty: "intermediate",
    tags: ["hash", "lookup", "ID", "string", "table", "collision"],
    description: "Hash table for fast string-to-integer ID lookups. Maps node and link string identifiers to their array indices. Uses separate chaining for collision resolution. Essential for parsing INP files where elements are referenced by string IDs.",
    inputs: "String key (node/link ID)",
    outputs: "Integer index into data arrays",
    c: `// hash.c — Hash Table for EPANET ID Lookups
// Maps string IDs (e.g., "J1", "P12") to array indices
// Separate chaining for collision resolution

#include <stdlib.h>
#include <string.h>

#define HASH_SIZE 2039  // prime number for good distribution

typedef struct HashEntry {
    char*   key;
    int     value;
    struct HashEntry* next;
} HashEntry;

typedef struct {
    HashEntry* table[HASH_SIZE];
    int count;
} HashTable;

// ─── HASH FUNCTION ───
// djb2 hash — simple and effective for short strings

unsigned int hash_func(const char* key)
{
    unsigned int hash = 5381;
    int c;
    while ((c = *key++))
        hash = ((hash << 5) + hash) + c;  // hash * 33 + c
    return hash % HASH_SIZE;
}

HashTable* hash_create(void)
{
    HashTable* ht = (HashTable*)calloc(1, sizeof(HashTable));
    return ht;
}

void hash_insert(HashTable* ht, const char* key, int value)
{
    unsigned int idx = hash_func(key);
    
    // Check if key already exists
    HashEntry* entry = ht->table[idx];
    while (entry) {
        if (strcmp(entry->key, key) == 0) {
            entry->value = value;  // update
            return;
        }
        entry = entry->next;
    }
    
    // Create new entry (prepend to chain)
    HashEntry* new_entry = (HashEntry*)malloc(sizeof(HashEntry));
    new_entry->key = strdup(key);
    new_entry->value = value;
    new_entry->next = ht->table[idx];
    ht->table[idx] = new_entry;
    ht->count++;
}

int hash_find(HashTable* ht, const char* key)
{
    unsigned int idx = hash_func(key);
    HashEntry* entry = ht->table[idx];
    
    while (entry) {
        if (strcmp(entry->key, key) == 0)
            return entry->value;
        entry = entry->next;
    }
    return -1;  // not found
}

void hash_free(HashTable* ht)
{
    int i;
    for (i = 0; i < HASH_SIZE; i++) {
        HashEntry* entry = ht->table[i];
        while (entry) {
            HashEntry* next = entry->next;
            free(entry->key);
            free(entry);
            entry = next;
        }
    }
    free(ht);
}`,
  },
  "mempool.c — Memory Pool": {
    category: "Infrastructure",
    difficulty: "intermediate",
    tags: ["memory", "pool", "allocator", "performance", "fragmentation"],
    description: "Memory pool allocator for efficient allocation of many small, fixed-size objects. Reduces memory fragmentation and allocation overhead by pre-allocating large blocks and parceling them out. Used for water quality segments, hash table entries, and other frequently created/destroyed objects.",
    inputs: "Block size, number of objects per block",
    outputs: "Allocated memory pointer",
    c: `// mempool.c — Memory Pool Allocator for EPANET
// Pre-allocates large blocks, parcels out fixed-size objects
// Eliminates fragmentation from frequent alloc/free cycles

#include <stdlib.h>
#include <string.h>

#define BLOCK_SIZE 64  // objects per block

typedef struct MemBlock {
    char*  data;
    struct MemBlock* next;
} MemBlock;

typedef struct {
    int      obj_size;    // size of each object
    int      block_cap;   // objects per block
    int      used;        // used objects in current block
    MemBlock* head;       // linked list of blocks
    void**   free_list;   // stack of freed objects
    int      n_free;
} MemPool;

MemPool* mempool_create(int obj_size)
{
    MemPool* pool = (MemPool*)calloc(1, sizeof(MemPool));
    pool->obj_size = (obj_size < sizeof(void*)) ?
        sizeof(void*) : obj_size;
    pool->block_cap = BLOCK_SIZE;
    pool->used = BLOCK_SIZE;  // force first allocation
    return pool;
}

void* mempool_alloc(MemPool* pool)
{
    // First check free list (recycled objects)
    if (pool->n_free > 0) {
        return pool->free_list[--pool->n_free];
    }
    
    // Need a new block?
    if (pool->used >= pool->block_cap) {
        MemBlock* block = (MemBlock*)malloc(sizeof(MemBlock));
        block->data = (char*)calloc(pool->block_cap, pool->obj_size);
        block->next = pool->head;
        pool->head = block;
        pool->used = 0;
    }
    
    void* ptr = pool->head->data + (pool->used * pool->obj_size);
    pool->used++;
    return ptr;
}

void mempool_free_obj(MemPool* pool, void* ptr)
{
    // Add to free list for reuse
    pool->free_list = (void**)realloc(pool->free_list,
        (pool->n_free + 1) * sizeof(void*));
    pool->free_list[pool->n_free++] = ptr;
}

void mempool_destroy(MemPool* pool)
{
    MemBlock* block = pool->head;
    while (block) {
        MemBlock* next = block->next;
        free(block->data);
        free(block);
        block = next;
    }
    free(pool->free_list);
    free(pool);
}`,
  },
  "types.c — Type Definitions": {
    category: "Infrastructure",
    difficulty: "accessible",
    tags: ["types", "constants", "enums", "definitions", "units"],
    description: "Defines all type definitions, constants, and enumerations used throughout EPANET. Includes node types (junction, reservoir, tank), link types (pipe, pump, valve), flow units, head loss formulas, quality analysis types, and status codes.",
    inputs: "None (header definitions)",
    outputs: "Type definitions and constants for compilation",
    c: `// types.c — Type Definitions and Constants for EPANET
// Central definitions used by all EPANET modules

// ─── NODE TYPES ───
typedef enum {
    EN_JUNCTION  = 0,
    EN_RESERVOIR = 1,
    EN_TANK      = 2,
} NodeType;

// ─── LINK TYPES ───
typedef enum {
    EN_CVPIPE = 0,   // Check valve pipe
    EN_PIPE   = 1,
    EN_PUMP   = 2,
    EN_PRV    = 3,   // Pressure reducing valve
    EN_PSV    = 4,   // Pressure sustaining valve
    EN_PBV    = 5,   // Pressure breaker valve
    EN_FCV    = 6,   // Flow control valve
    EN_TCV    = 7,   // Throttle control valve
    EN_GPV    = 8,   // General purpose valve
} LinkType;

// ─── FLOW UNITS ───
typedef enum {
    EN_CFS = 0,   // cubic feet per second
    EN_GPM = 1,   // gallons per minute
    EN_MGD = 2,   // million gallons per day
    EN_IMGD = 3,  // Imperial MGD
    EN_AFD = 4,   // acre-feet per day
    EN_LPS = 5,   // liters per second
    EN_LPM = 6,   // liters per minute
    EN_MLD = 7,   // million liters per day
    EN_CMH = 8,   // cubic meters per hour
    EN_CMD = 9,   // cubic meters per day
} FlowUnits;

// ─── HEAD LOSS FORMULAS ───
typedef enum {
    EN_HW = 0,    // Hazen-Williams
    EN_DW = 1,    // Darcy-Weisbach
    EN_CM = 2,    // Chezy-Manning
} HeadLossFormula;

// ─── QUALITY ANALYSIS TYPES ───
typedef enum {
    EN_NONE    = 0,   // No quality analysis
    EN_CHEM    = 1,   // Chemical constituent
    EN_AGE     = 2,   // Water age
    EN_TRACE   = 3,   // Source tracing
} QualType;

// ─── STATUS CODES ───
typedef enum {
    EN_CLOSED = 0,
    EN_OPEN   = 1,
    EN_ACTIVE = 2,    // valve actively regulating
} LinkStatus;

// ─── PHYSICAL CONSTANTS ───
#define EN_GRAVITY    32.2       // ft/s²
#define EN_VISCOSITY  1.1e-5    // ft²/s at 60°F
#define EN_PI         3.14159265358979
#define EN_PSI_PER_FT 0.4333   // psi per foot of water

// ─── ERROR CODES ───
typedef enum {
    EN_OK          = 0,
    EN_WARNING     = 1,
    EN_ERR_MEMORY  = 101,
    EN_ERR_INPUT   = 200,
    EN_ERR_HYDRAUL = 300,
    EN_ERR_QUALITY = 400,
} ErrorCode;`,
  },
  "epanet.c — Main API": {
    category: "Infrastructure",
    difficulty: "accessible",
    tags: ["API", "entry point", "open", "solve", "close", "interface", "toolkit"],
    description: "The public EPANET API: EN_open, EN_solveH (hydraulics), EN_solveQ (quality), EN_close, plus dozens of get/set functions for network properties. This is what external programs (like WNTR for Python) call to run simulations.",
    inputs: "INP file path, report file path, binary output file path",
    outputs: "Error code (0 = success), populated results",
    c: `// epanet.c — Main API Entry Points for EPANET
// Public interface: EN_open → EN_solveH → EN_solveQ → EN_close
// Called by external programs (WNTR, EPANET-MSX, custom tools)

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

static TProject* _project = NULL;

// ─── OPEN PROJECT ───

int EN_open(const char* inp_file, const char* rpt_file,
            const char* out_file)
{
    _project = project_create();
    if (!_project) return EN_ERR_MEMORY;
    
    int err = parse_inp_file(inp_file, _project);
    if (err) return EN_ERR_INPUT;
    
    // Precompute pipe resistances
    for (int i = 0; i < _project->n_pipes; i++)
        _project->pipes[i].resistance =
            pipe_resistance(&_project->pipes[i]);
    
    // Initialize node heads to elevations
    for (int i = 0; i < _project->n_junctions; i++)
        _project->nodes[i].head = _project->nodes[i].elevation;
    
    return EN_OK;
}

// ─── SOLVE HYDRAULICS ───

int EN_solveH(void)
{
    if (!_project) return EN_ERR_INPUT;
    
    double time = 0.0;
    double duration = _project->duration;
    double hyd_step = _project->hyd_step;
    
    while (time <= duration) {
        // Apply demand patterns
        for (int i = 0; i < _project->n_junctions; i++) {
            double factor = 1.0;  // pattern factor
            if (_project->nodes[i].pattern >= 0)
                factor = pattern_factor(
                    &_project->patterns[_project->nodes[i].pattern],
                    time);
            _project->nodes[i].demand =
                _project->nodes[i].baseDemand * factor;
        }
        
        // Evaluate controls
        controls_evaluate(NULL, 0, time, time - hyd_step,
            NULL, NULL, NULL);
        
        // Solve network hydraulics
        int iters = hydraul_solve(_project);
        
        // Update tank levels
        for (int i = 0; i < _project->n_tanks; i++)
            tank_update(&_project->tanks[i], 0.0, hyd_step);
        
        // Write results if at report step
        if ((int)time % (int)_project->report_step == 0)
            output_write_step(NULL, _project);
        
        time += hyd_step;
    }
    
    return EN_OK;
}

// ─── SOLVE WATER QUALITY ───

int EN_solveQ(void)
{
    if (!_project) return EN_ERR_INPUT;
    
    // Quality analysis runs after hydraulics
    // Uses hydraulic results (flows, velocities) to
    // transport and react constituents
    
    return EN_OK;
}

// ─── CLOSE PROJECT ───

int EN_close(void)
{
    project_delete(_project);
    _project = NULL;
    return EN_OK;
}

// ─── GET/SET FUNCTIONS ───

int EN_getNodeValue(int index, int param, double* value)
{
    if (!_project || index < 0) return EN_ERR_INPUT;
    
    switch (param) {
        case 0: *value = _project->nodes[index].elevation; break;
        case 1: *value = _project->nodes[index].baseDemand; break;
        case 2: *value = _project->nodes[index].head; break;
        case 3: *value = _project->nodes[index].pressure; break;
        case 4: *value = _project->nodes[index].demand; break;
        default: return EN_ERR_INPUT;
    }
    return EN_OK;
}

int EN_getLinkValue(int index, int param, double* value)
{
    if (!_project || index < 0) return EN_ERR_INPUT;
    
    switch (param) {
        case 0: *value = _project->pipes[index].flow; break;
        case 1: *value = _project->pipes[index].diameter; break;
        case 2: *value = _project->pipes[index].length; break;
        case 3: *value = _project->pipes[index].roughness; break;
        default: return EN_ERR_INPUT;
    }
    return EN_OK;
}`,
  },
  "linsolve.c — Linear Solver": {
    category: "Numerical",
    difficulty: "advanced",
    tags: ["linear", "solver", "gaussian", "LU", "factorization", "matrix"],
    description: "Direct linear equation solver using Gaussian elimination with partial pivoting, or LU factorization. Used as a fallback when the sparse Cholesky solver is not applicable (e.g., for non-symmetric systems arising from valve or pump equations).",
    equations: "Ax = b; A = LU; Ly = b (forward); Ux = y (backward)",
    inputs: "Dense matrix A, right-hand side vector b",
    outputs: "Solution vector x",
    c: `// linsolve.c — Linear Equation Solver for EPANET
// Gaussian elimination with partial pivoting
// Used as fallback when sparse Cholesky is not applicable

#include <math.h>
#include <stdlib.h>

// ─── GAUSSIAN ELIMINATION ───

int linsolve(double* A, double* b, double* x, int n)
{
    int i, j, k, max_row;
    double max_val, factor, temp;
    
    // Make working copy
    double* M = (double*)malloc(n * n * sizeof(double));
    double* r = (double*)malloc(n * sizeof(double));
    for (i = 0; i < n * n; i++) M[i] = A[i];
    for (i = 0; i < n; i++) r[i] = b[i];
    
    // Forward elimination with partial pivoting
    for (k = 0; k < n - 1; k++) {
        // Find pivot (largest element in column k)
        max_val = fabs(M[k * n + k]);
        max_row = k;
        for (i = k + 1; i < n; i++) {
            if (fabs(M[i * n + k]) > max_val) {
                max_val = fabs(M[i * n + k]);
                max_row = i;
            }
        }
        
        if (max_val < 1e-12) {
            free(M); free(r);
            return -1;  // Singular matrix
        }
        
        // Swap rows
        if (max_row != k) {
            for (j = 0; j < n; j++) {
                temp = M[k * n + j];
                M[k * n + j] = M[max_row * n + j];
                M[max_row * n + j] = temp;
            }
            temp = r[k]; r[k] = r[max_row]; r[max_row] = temp;
        }
        
        // Eliminate below pivot
        for (i = k + 1; i < n; i++) {
            factor = M[i * n + k] / M[k * n + k];
            for (j = k + 1; j < n; j++)
                M[i * n + j] -= factor * M[k * n + j];
            r[i] -= factor * r[k];
        }
    }
    
    // Back substitution
    for (i = n - 1; i >= 0; i--) {
        x[i] = r[i];
        for (j = i + 1; j < n; j++)
            x[i] -= M[i * n + j] * x[j];
        x[i] /= M[i * n + i];
    }
    
    free(M);
    free(r);
    return 0;
}`,
  },
  "newton.c — Newton-Raphson Manager": {
    category: "Numerical",
    difficulty: "advanced",
    tags: ["newton-raphson", "iteration", "convergence", "nonlinear", "damping", "relaxation"],
    description: "Manages the Newton-Raphson iteration loop for the hydraulic solver. Controls convergence checking, under-relaxation for difficult networks, iteration counting, and status reporting. The actual Jacobian assembly is in hydraul.c; this module orchestrates the iteration process.",
    equations: "x_{k+1} = x_k - [J(x_k)]^{-1} · F(x_k) (Newton-Raphson)",
    inputs: "Initial guess, Jacobian function, residual function, tolerance",
    outputs: "Converged solution, iteration count, convergence status",
    c: `// newton.c — Newton-Raphson Iteration Manager for EPANET
// Orchestrates the nonlinear solver loop with damping

#include <math.h>

typedef struct {
    int    max_iter;       // maximum iterations
    double tolerance;      // convergence tolerance
    double damping;        // under-relaxation factor (0-1)
    int    iterations;     // actual iterations used
    double max_change;     // maximum variable change
    int    converged;      // 1 if converged
} TNewton;

// ─── INITIALIZE SOLVER ───

void newton_init(TNewton* nr, int max_iter, double tolerance)
{
    nr->max_iter = max_iter;
    nr->tolerance = tolerance;
    nr->damping = 1.0;      // no damping initially
    nr->iterations = 0;
    nr->converged = 0;
}

// ─── CHECK CONVERGENCE ───

int newton_check(TNewton* nr, double* dH, int n)
{
    int i;
    nr->max_change = 0.0;
    
    for (i = 0; i < n; i++) {
        double change = fabs(dH[i]);
        if (change > nr->max_change)
            nr->max_change = change;
    }
    
    if (nr->max_change < nr->tolerance) {
        nr->converged = 1;
        return 1;
    }
    
    return 0;
}

// ─── APPLY DAMPING ───
// Reduce step size for oscillating or diverging networks

void newton_damp(TNewton* nr, double* dH, int n)
{
    int i;
    double w = nr->damping;
    
    for (i = 0; i < n; i++)
        dH[i] *= w;
}

// ─── ADAPTIVE DAMPING ───
// Increase damping if convergence is too slow

void newton_adapt_damping(TNewton* nr, double prev_change)
{
    if (nr->max_change > prev_change) {
        // Diverging — reduce step size
        nr->damping *= 0.5;
        if (nr->damping < 0.1) nr->damping = 0.1;
    } else if (nr->max_change < 0.5 * prev_change) {
        // Converging well — increase step size
        nr->damping *= 1.5;
        if (nr->damping > 1.0) nr->damping = 1.0;
    }
}

// ─── ITERATION LOOP ───

int newton_solve(TNewton* nr,
                 void (*assemble)(double*, double*, int),
                 void (*solve_linear)(double*, double*, double*, int),
                 double* heads, int n)
{
    double* A = (double*)calloc(n * n, sizeof(double));
    double* F = (double*)calloc(n, sizeof(double));
    double* dH = (double*)calloc(n, sizeof(double));
    double prev_change = 1e10;
    int iter;
    
    for (iter = 0; iter < nr->max_iter; iter++) {
        nr->iterations = iter + 1;
        
        // Assemble Jacobian and residual
        assemble(A, F, n);
        
        // Solve linear system
        solve_linear(A, F, dH, n);
        
        // Apply damping
        newton_damp(nr, dH, n);
        
        // Update solution
        for (int i = 0; i < n; i++)
            heads[i] += dH[i];
        
        // Check convergence
        if (newton_check(nr, dH, n))
            break;
        
        // Adaptive damping
        newton_adapt_damping(nr, prev_change);
        prev_change = nr->max_change;
    }
    
    free(A); free(F); free(dH);
    return nr->converged ? 0 : -1;
}`,
  },
};

const epanetLanguages = [
  { id: "c", label: "C", ext: ".c", color: "#555555", desc: "Reference implementation (EPANET 2.2)" },
  { id: "rust", label: "Rust", ext: ".rs", color: "#dea584", desc: "Memory-safe systems language" },
  { id: "python", label: "Python", ext: ".py", color: "#3572A5", desc: "WNTR/EPANET toolkit bindings" },
  { id: "julia", label: "Julia", ext: ".jl", color: "#9558B2", desc: "Scientific computing with native LAPACK" },
  { id: "matlab", label: "MATLAB", ext: ".m", color: "#e16737", desc: "Engineering analysis and matrix operations" },
  { id: "javascript", label: "JavaScript", ext: ".js", color: "#f1e05a", desc: "Browser-based hydraulic modeling" },
  { id: "go", label: "Go", ext: ".go", color: "#00ADD8", desc: "Concurrent pipe network solver" },
  { id: "fortran", label: "Fortran", ext: ".f90", color: "#4d41b1", desc: "Original scientific computing language" },
];

const EPANET_MODULE_GRAPH = {
  nodes: [
    { id: "hydraul.c", label: "hydraul.c", category: "Core Solver", x: 400, y: 200 },
    { id: "smatrix.c", label: "smatrix.c", category: "Core Solver", x: 600, y: 120 },
    { id: "genmmd.c", label: "genmmd.c", category: "Core Solver", x: 750, y: 60 },
    { id: "pipe.c", label: "pipe.c", category: "Network Elements", x: 200, y: 120 },
    { id: "pump.c", label: "pump.c", category: "Network Elements", x: 200, y: 200 },
    { id: "valve.c", label: "valve.c", category: "Network Elements", x: 200, y: 280 },
    { id: "tank.c", label: "tank.c", category: "Network Elements", x: 350, y: 360 },
    { id: "node.c", label: "node.c", category: "Network Elements", x: 350, y: 60 },
    { id: "pattern.c", label: "pattern.c", category: "Network Elements", x: 120, y: 360 },
    { id: "quality.c", label: "quality.c", category: "Water Quality", x: 600, y: 300 },
    { id: "qualreact.c", label: "qualreact.c", category: "Water Quality", x: 750, y: 350 },
    { id: "qualroute.c", label: "qualroute.c", category: "Water Quality", x: 750, y: 250 },
    { id: "rules.c", label: "rules.c", category: "Controls", x: 500, y: 400 },
    { id: "controls.c", label: "controls.c", category: "Controls", x: 350, y: 440 },
    { id: "input.c", label: "input.c", category: "Parser / IO", x: 60, y: 60 },
    { id: "output.c", label: "output.c", category: "Parser / IO", x: 600, y: 440 },
    { id: "report.c", label: "report.c", category: "Parser / IO", x: 750, y: 440 },
    { id: "inpfile.c", label: "inpfile.c", category: "Parser / IO", x: 60, y: 150 },
    { id: "project.c", label: "project.c", category: "Infrastructure", x: 60, y: 240 },
    { id: "hash.c", label: "hash.c", category: "Infrastructure", x: 60, y: 330 },
    { id: "mempool.c", label: "mempool.c", category: "Infrastructure", x: 60, y: 420 },
    { id: "types.c", label: "types.c", category: "Infrastructure", x: 60, y: 500 },
    { id: "epanet.c", label: "epanet.c", category: "Infrastructure", x: 400, y: 40 },
    { id: "linsolve.c", label: "linsolve.c", category: "Numerical", x: 600, y: 40 },
    { id: "newton.c", label: "newton.c", category: "Numerical", x: 500, y: 120 },
  ],
  edges: [
    { from: "epanet.c", to: "hydraul.c" },
    { from: "epanet.c", to: "quality.c" },
    { from: "epanet.c", to: "input.c" },
    { from: "epanet.c", to: "output.c" },
    { from: "epanet.c", to: "project.c" },
    { from: "hydraul.c", to: "pipe.c" },
    { from: "hydraul.c", to: "pump.c" },
    { from: "hydraul.c", to: "valve.c" },
    { from: "hydraul.c", to: "node.c" },
    { from: "hydraul.c", to: "tank.c" },
    { from: "hydraul.c", to: "smatrix.c" },
    { from: "hydraul.c", to: "newton.c" },
    { from: "hydraul.c", to: "rules.c" },
    { from: "hydraul.c", to: "controls.c" },
    { from: "smatrix.c", to: "genmmd.c" },
    { from: "smatrix.c", to: "linsolve.c" },
    { from: "quality.c", to: "qualreact.c" },
    { from: "quality.c", to: "qualroute.c" },
    { from: "input.c", to: "project.c" },
    { from: "input.c", to: "hash.c" },
    { from: "input.c", to: "inpfile.c" },
    { from: "project.c", to: "hash.c" },
    { from: "project.c", to: "mempool.c" },
    { from: "project.c", to: "types.c" },
    { from: "report.c", to: "output.c" },
    { from: "node.c", to: "pattern.c" },
    { from: "rules.c", to: "controls.c" },
  ],
};

const epanetCategories = {
  "Core Solver": "#e45649",
  "Network Elements": "#c18401",
  "Water Quality": "#50a14f",
  "Controls": "#61afef",
  "Parser / IO": "#c678dd",
  "Infrastructure": "#6b7185",
  "Numerical": "#d19a66",
};

export { epanetModules, epanetLanguages, EPANET_MODULE_GRAPH, epanetCategories };
