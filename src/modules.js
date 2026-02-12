// ─── Code Samples ────────────────────────────────────────────────────

const modules = {
  "routing.c — Dynamic Wave Routing": {
    category: "Hydraulics",
    difficulty: "advanced",
    tags: ["routing", "dynamic wave", "saint-venant", "hydraulics", "conduit", "momentum", "continuity", "backwater", "surcharge"],
    description: "Solves the 1D Saint-Venant equations (continuity + momentum) for unsteady flow through the drainage network. SWMM5 uses an explicit finite-difference scheme to route flows through conduits, accounting for backwater effects, surcharging, and reverse flow. This is the heart of SWMM5's hydraulic engine.",
    equations: "∂A/∂t + ∂Q/∂x = 0 (continuity); ∂Q/∂t + ∂(Q²/A)/∂x + gA·∂H/∂x + gA·Sf = 0 (momentum)",
    inputs: "Conduit geometry (shape, length, roughness), upstream/downstream node heads, previous timestep flow",
    outputs: "Flow rate in each conduit, velocity, flow depth",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// routing.c — Dynamic Wave Routing
// EPA SWMM5 Engine — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

#include <math.h>

#define GRAVITY 32.2  // ft/s² (use 9.81 for metric)

typedef struct {
    double length;     // conduit length (ft)
    double roughness;  // Manning's n
    double aFull;      // full cross-section area (ft²)
    double width;      // top width at full depth (ft)
} TConduit;

double routing_getFrictionSlope(TConduit* c, double Q,
                                 double area)
{
    double hRadius, sf;

    if (area <= 0.0 || Q == 0.0) return 0.0;

    hRadius = area / c->width;
    sf = c->roughness * Q / (area * pow(hRadius, 2.0/3.0));
    sf = sf * sf;

    if (Q < 0.0) sf = -sf;
    return sf;
}

double routing_getFlow(TConduit* c, double Qold, double area,
                       double hUp, double hDown, double dt)
{
    double dhdx, sf, Qnew;

    if (area <= 0.0) return 0.0;

    dhdx = (hUp - hDown) / c->length;
    sf = routing_getFrictionSlope(c, Qold, area);

    Qnew = Qold + dt * GRAVITY * area * (dhdx - sf);

    if (fabs(Qnew) > area * 50.0)
        Qnew = (Qnew > 0.0) ? area * 50.0 : -area * 50.0;

    return Qnew;
}`,
    rust: `// routing.rs — Dynamic Wave Routing
// SWMM5 Engine in Rust — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

const GRAVITY: f64 = 32.2; // ft/s²

pub struct Conduit {
    pub length: f64,     // conduit length (ft)
    pub roughness: f64,  // Manning's n
    pub a_full: f64,     // full cross-section area (ft²)
    pub width: f64,      // top width at full depth (ft)
}

impl Conduit {
    pub fn friction_slope(&self, q: f64, area: f64) -> f64 {
        if area <= 0.0 || q == 0.0 { return 0.0; }

        let h_radius = area / self.width;
        let sf_base = self.roughness * q
                      / (area * h_radius.powf(2.0 / 3.0));
        let sf = sf_base * sf_base;

        if q < 0.0 { -sf } else { sf }
    }

    pub fn get_flow(&self, q_old: f64, area: f64,
                    h_up: f64, h_down: f64, dt: f64) -> f64 {
        if area <= 0.0 { return 0.0; }

        let dhdx = (h_up - h_down) / self.length;
        let sf = self.friction_slope(q_old, area);

        let q_new = q_old + dt * GRAVITY * area * (dhdx - sf);

        let q_max = area * 50.0;
        q_new.clamp(-q_max, q_max)
    }
}`,
    python: `# routing.py — Dynamic Wave Routing
# SWMM5 Engine in Python — Saint-Venant Equation Solver
# Simplified explicit finite-difference scheme for
# unsteady flow routing through drainage conduits

import math
from dataclasses import dataclass

GRAVITY = 32.2  # ft/s²

@dataclass
class Conduit:
    length: float     # conduit length (ft)
    roughness: float  # Manning's n
    a_full: float     # full cross-section area (ft²)
    width: float      # top width at full depth (ft)

    def friction_slope(self, q: float, area: float) -> float:
        """Compute friction slope via Manning's equation."""
        if area <= 0.0 or q == 0.0:
            return 0.0

        h_radius = area / self.width
        sf_base = (self.roughness * q
                   / (area * h_radius ** (2.0 / 3.0)))
        sf = sf_base * sf_base

        return -sf if q < 0.0 else sf

    def get_flow(self, q_old: float, area: float,
                 h_up: float, h_down: float,
                 dt: float) -> float:
        """Compute updated flow using explicit scheme."""
        if area <= 0.0:
            return 0.0

        dhdx = (h_up - h_down) / self.length
        sf = self.friction_slope(q_old, area)

        q_new = q_old + dt * GRAVITY * area * (dhdx - sf)

        q_max = area * 50.0
        return max(-q_max, min(q_new, q_max))`,
    fortran: `! routing.f90 — Dynamic Wave Routing
! SWMM5 Engine in Fortran — Saint-Venant Equation Solver
! Simplified explicit finite-difference scheme for
! unsteady flow routing through drainage conduits

module routing_module
    implicit none
    real(8), parameter :: GRAVITY = 32.2d0  ! ft/s²

    type :: Conduit
        real(8) :: length      ! conduit length (ft)
        real(8) :: roughness   ! Manning's n
        real(8) :: a_full      ! full cross-section area (ft²)
        real(8) :: width       ! top width at full depth (ft)
    end type Conduit

contains

    function friction_slope(c, Q, area) result(sf)
        type(Conduit), intent(in) :: c
        real(8), intent(in) :: Q, area
        real(8) :: sf, h_radius, sf_base

        if (area <= 0.0d0 .or. Q == 0.0d0) then
            sf = 0.0d0
            return
        end if

        h_radius = area / c%width
        sf_base = c%roughness * Q &
                  / (area * h_radius**(2.0d0/3.0d0))
        sf = sf_base * sf_base

        if (Q < 0.0d0) sf = -sf
    end function friction_slope

    function get_flow(c, Q_old, area, h_up, h_down, &
                      dt) result(Q_new)
        type(Conduit), intent(in) :: c
        real(8), intent(in) :: Q_old, area
        real(8), intent(in) :: h_up, h_down, dt
        real(8) :: Q_new, dhdx, sf, q_max

        if (area <= 0.0d0) then
            Q_new = 0.0d0
            return
        end if

        dhdx = (h_up - h_down) / c%length
        sf = friction_slope(c, Q_old, area)
        Q_new = Q_old + dt * GRAVITY * area * (dhdx - sf)

        q_max = area * 50.0d0
        if (Q_new > q_max) Q_new = q_max
        if (Q_new < -q_max) Q_new = -q_max
    end function get_flow

end module routing_module`,
    julia: `# routing.jl — Dynamic Wave Routing
# SWMM5 Engine in Julia — Saint-Venant Equation Solver
# Simplified explicit finite-difference scheme for
# unsteady flow routing through drainage conduits

const GRAVITY = 32.2  # ft/s²

struct Conduit
    length::Float64      # conduit length (ft)
    roughness::Float64   # Manning's n
    a_full::Float64      # full cross-section area (ft²)
    width::Float64       # top width at full depth (ft)
end

function friction_slope(c::Conduit, Q::Float64,
                        area::Float64)::Float64
    (area ≤ 0.0 || Q == 0.0) && return 0.0

    h_radius = area / c.width
    sf_base = c.roughness * Q / (area * h_radius^(2.0/3.0))
    sf = sf_base * sf_base

    return Q < 0.0 ? -sf : sf
end

function get_flow(c::Conduit, Q_old::Float64, area::Float64,
                  h_up::Float64, h_down::Float64,
                  dt::Float64)::Float64
    area ≤ 0.0 && return 0.0

    dhdx = (h_up - h_down) / c.length
    sf = friction_slope(c, Q_old, area)

    Q_new = Q_old + dt * GRAVITY * area * (dhdx - sf)

    q_max = area * 50.0
    return clamp(Q_new, -q_max, q_max)
end`,
    javascript: `// routing.js — Dynamic Wave Routing
// SWMM5 Engine in JavaScript — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

const GRAVITY = 32.2; // ft/s²

class Conduit {
    constructor(length, roughness, aFull, width) {
        this.length = length;
        this.roughness = roughness;
        this.aFull = aFull;
        this.width = width;
    }

    /** Compute friction slope via Manning's equation */
    frictionSlope(Q, area) {
        if (area <= 0.0 || Q === 0.0) return 0.0;

        const hRadius = area / this.width;
        const sfBase = this.roughness * Q
                       / (area * Math.pow(hRadius, 2.0/3.0));
        const sf = sfBase * sfBase;

        return Q < 0.0 ? -sf : sf;
    }

    /** Compute updated flow using explicit scheme */
    getFlow(Qold, area, hUp, hDown, dt) {
        if (area <= 0.0) return 0.0;

        const dhdx = (hUp - hDown) / this.length;
        const sf = this.frictionSlope(Qold, area);

        let Qnew = Qold + dt * GRAVITY * area * (dhdx - sf);

        const qMax = area * 50.0;
        return Math.max(-qMax, Math.min(Qnew, qMax));
    }
}

export { Conduit, GRAVITY };`,
    go: `// routing.go — Dynamic Wave Routing
// SWMM5 Engine in Go — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

package swmm

import "math"

const Gravity = 32.2 // ft/s²

type Conduit struct {
    Length    float64 // conduit length (ft)
    Roughness float64 // Manning's n
    AFull    float64 // full cross-section area (ft²)
    Width    float64 // top width at full depth (ft)
}

func (c *Conduit) FrictionSlope(Q, area float64) float64 {
    if area <= 0.0 || Q == 0.0 {
        return 0.0
    }

    hRadius := area / c.Width
    sfBase := c.Roughness * Q /
              (area * math.Pow(hRadius, 2.0/3.0))
    sf := sfBase * sfBase

    if Q < 0.0 {
        return -sf
    }
    return sf
}

func (c *Conduit) GetFlow(Qold, area, hUp, hDown,
    dt float64) float64 {

    if area <= 0.0 {
        return 0.0
    }

    dhdx := (hUp - hDown) / c.Length
    sf := c.FrictionSlope(Qold, area)

    Qnew := Qold + dt*Gravity*area*(dhdx-sf)

    qMax := area * 50.0
    if Qnew > qMax {
        Qnew = qMax
    } else if Qnew < -qMax {
        Qnew = -qMax
    }
    return Qnew
}`,
  },
  "dynwave.c — Dynamic Wave Solver": {
    category: "Hydraulics",
    difficulty: "advanced",
    tags: ["dynamic wave", "saint-venant", "momentum", "conduit", "surcharge", "backwater", "unsteady flow", "finite difference"],
    description: "The core solver that advances flows through the drainage network each timestep. Solves the full Saint-Venant equations (continuity + momentum) using an explicit finite-difference scheme. Handles backwater effects, flow reversal, surcharging (when pipes are full and pressurized), and supercritical flow transitions. This is the computational engine that makes SWMM5 capable of modeling complex urban drainage systems.",
    equations: "dQ/dt = gA(H1-H2)/L - gA*Sf - Q|Q|/(A*L)*(A2-A1); Sf = (n*|V|/R^(2/3))^2",
    inputs: "Link geometry, upstream/downstream head, previous flow, Manning's n, time step",
    outputs: "Updated link flow, velocity, Froude number",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// dynwave.c — Dynamic Wave Solver
// EPA SWMM5 Engine — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

#include <math.h>

#define GRAVITY 32.174  // ft/s²

typedef struct {
    double length;      // conduit length (ft)
    double roughness;   // Manning's n
    double aFull;       // full cross-section area (ft²)
    double rFull;       // full hydraulic radius (ft)
    double flow;        // current flow (cfs)
    double newFlow;     // updated flow (cfs)
    double velocity;    // flow velocity (ft/s)
    double froude;      // Froude number
} TLink;

double dynwave_getFrictionSlope(TLink* link, double area,
                                 double velocity)
{
    // Sf = (n * |V| / R^(2/3))^2
    double rh, nv;

    if (area <= 0.0) return 0.0;
    rh = link->rFull * (area / link->aFull);
    if (rh <= 0.0) return 0.0;

    nv = link->roughness * fabs(velocity);
    return (nv * nv) / pow(rh, 4.0 / 3.0);
}

void dynwave_updateFlow(TLink* link, double h1, double h2,
                         double a1, double a2, double dt)
{
    // Explicit momentum equation:
    // dQ/dt = gA(H1-H2)/L - gA*Sf - Q|Q|/(A*L)*(A2-A1)
    double aAvg, velocity, sf, dq;
    double headGrad, fricTerm, convTerm;

    aAvg = 0.5 * (a1 + a2);
    if (aAvg <= 0.0) { link->newFlow = 0.0; return; }

    velocity = link->flow / aAvg;
    sf = dynwave_getFrictionSlope(link, aAvg, velocity);

    // Gravity (pressure) term
    headGrad = GRAVITY * aAvg * (h1 - h2) / link->length;

    // Friction term
    fricTerm = GRAVITY * aAvg * sf;
    if (link->flow < 0.0) fricTerm = -fricTerm;

    // Convective acceleration term
    convTerm = link->flow * fabs(link->flow)
               / (aAvg * link->length) * (a2 - a1);

    dq = (headGrad - fricTerm - convTerm) * dt;
    link->newFlow = link->flow + dq;

    // Clamp flow to full pipe capacity
    double qMax = link->aFull * 25.0;  // practical limit
    if (link->newFlow > qMax) link->newFlow = qMax;
    if (link->newFlow < -qMax) link->newFlow = -qMax;

    // Update velocity and Froude number
    link->velocity = link->newFlow / aAvg;
    double depth = aAvg / link->aFull * (2.0 * link->rFull);
    if (depth > 0.0)
        link->froude = fabs(link->velocity)
                       / sqrt(GRAVITY * depth);
    else
        link->froude = 0.0;
}`,
    rust: `// dynwave.rs — Dynamic Wave Solver
// SWMM5 Engine in Rust — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

const GRAVITY: f64 = 32.174; // ft/s²

pub struct Link {
    pub length: f64,      // conduit length (ft)
    pub roughness: f64,   // Manning's n
    pub a_full: f64,      // full cross-section area (ft²)
    pub r_full: f64,      // full hydraulic radius (ft)
    pub flow: f64,        // current flow (cfs)
    pub new_flow: f64,    // updated flow (cfs)
    pub velocity: f64,    // flow velocity (ft/s)
    pub froude: f64,      // Froude number
}

impl Link {
    /// Sf = (n * |V| / R^(2/3))^2
    pub fn get_friction_slope(&self, area: f64,
                               velocity: f64) -> f64 {
        if area <= 0.0 { return 0.0; }
        let rh = self.r_full * (area / self.a_full);
        if rh <= 0.0 { return 0.0; }

        let nv = self.roughness * velocity.abs();
        (nv * nv) / rh.powf(4.0 / 3.0)
    }

    /// Explicit momentum equation update
    pub fn update_flow(&mut self, h1: f64, h2: f64,
                       a1: f64, a2: f64, dt: f64) {
        let a_avg = 0.5 * (a1 + a2);
        if a_avg <= 0.0 {
            self.new_flow = 0.0;
            return;
        }

        let velocity = self.flow / a_avg;
        let sf = self.get_friction_slope(a_avg, velocity);

        // Gravity (pressure) term
        let head_grad = GRAVITY * a_avg
                        * (h1 - h2) / self.length;

        // Friction term
        let mut fric_term = GRAVITY * a_avg * sf;
        if self.flow < 0.0 { fric_term = -fric_term; }

        // Convective acceleration term
        let conv_term = self.flow * self.flow.abs()
            / (a_avg * self.length) * (a2 - a1);

        let dq = (head_grad - fric_term - conv_term) * dt;
        self.new_flow = self.flow + dq;

        // Clamp flow
        let q_max = self.a_full * 25.0;
        self.new_flow = self.new_flow.clamp(-q_max, q_max);

        // Update velocity and Froude number
        self.velocity = self.new_flow / a_avg;
        let depth = a_avg / self.a_full
                    * (2.0 * self.r_full);
        self.froude = if depth > 0.0 {
            self.velocity.abs() / (GRAVITY * depth).sqrt()
        } else {
            0.0
        };
    }
}`,
    python: `# dynwave.py — Dynamic Wave Solver
# SWMM5 Engine in Python — Saint-Venant Equation Solver
# Solves full momentum equation using explicit
# finite-difference scheme for unsteady conduit flow

import math
from dataclasses import dataclass

GRAVITY = 32.174  # ft/s²

@dataclass
class Link:
    length: float       # conduit length (ft)
    roughness: float    # Manning's n
    a_full: float       # full cross-section area (ft²)
    r_full: float       # full hydraulic radius (ft)
    flow: float         # current flow (cfs)
    new_flow: float = 0.0
    velocity: float = 0.0
    froude: float = 0.0

    def get_friction_slope(self, area: float,
                           velocity: float) -> float:
        """Sf = (n * |V| / R^(2/3))^2"""
        if area <= 0.0:
            return 0.0
        rh = self.r_full * (area / self.a_full)
        if rh <= 0.0:
            return 0.0

        nv = self.roughness * abs(velocity)
        return (nv * nv) / rh ** (4.0 / 3.0)

    def update_flow(self, h1: float, h2: float,
                    a1: float, a2: float, dt: float) -> None:
        """Explicit momentum equation update."""
        a_avg = 0.5 * (a1 + a2)
        if a_avg <= 0.0:
            self.new_flow = 0.0
            return

        velocity = self.flow / a_avg
        sf = self.get_friction_slope(a_avg, velocity)

        # Gravity (pressure) term
        head_grad = GRAVITY * a_avg * (h1 - h2) / self.length

        # Friction term
        fric_term = GRAVITY * a_avg * sf
        if self.flow < 0.0:
            fric_term = -fric_term

        # Convective acceleration term
        conv_term = (self.flow * abs(self.flow)
                     / (a_avg * self.length) * (a2 - a1))

        dq = (head_grad - fric_term - conv_term) * dt
        self.new_flow = self.flow + dq

        # Clamp flow
        q_max = self.a_full * 25.0
        self.new_flow = max(-q_max, min(self.new_flow, q_max))

        # Update velocity and Froude number
        self.velocity = self.new_flow / a_avg
        depth = a_avg / self.a_full * (2.0 * self.r_full)
        if depth > 0.0:
            self.froude = (abs(self.velocity)
                           / math.sqrt(GRAVITY * depth))
        else:
            self.froude = 0.0`,
    fortran: `! dynwave.f90 — Dynamic Wave Solver
! SWMM5 Engine in Fortran — Saint-Venant Equation Solver
! Solves full momentum equation using explicit
! finite-difference scheme for unsteady conduit flow

module dynwave_module
    implicit none

    real(8), parameter :: GRAVITY = 32.174d0  ! ft/s²

    type :: TLink
        real(8) :: length      ! conduit length (ft)
        real(8) :: roughness   ! Manning's n
        real(8) :: a_full      ! full cross-section area (ft²)
        real(8) :: r_full      ! full hydraulic radius (ft)
        real(8) :: flow        ! current flow (cfs)
        real(8) :: new_flow    ! updated flow (cfs)
        real(8) :: velocity    ! flow velocity (ft/s)
        real(8) :: froude      ! Froude number
    end type TLink

contains

    function get_friction_slope(link, area, vel) result(sf)
        type(TLink), intent(in) :: link
        real(8), intent(in) :: area, vel
        real(8) :: sf, rh, nv

        if (area <= 0.0d0) then
            sf = 0.0d0
            return
        end if

        rh = link%r_full * (area / link%a_full)
        if (rh <= 0.0d0) then
            sf = 0.0d0
            return
        end if

        nv = link%roughness * abs(vel)
        sf = (nv * nv) / rh**(4.0d0 / 3.0d0)
    end function get_friction_slope

    subroutine update_flow(link, h1, h2, a1, a2, dt)
        type(TLink), intent(inout) :: link
        real(8), intent(in) :: h1, h2, a1, a2, dt
        real(8) :: a_avg, vel, sf
        real(8) :: head_grad, fric_term, conv_term
        real(8) :: dq, q_max, depth

        a_avg = 0.5d0 * (a1 + a2)
        if (a_avg <= 0.0d0) then
            link%new_flow = 0.0d0
            return
        end if

        vel = link%flow / a_avg
        sf = get_friction_slope(link, a_avg, vel)

        head_grad = GRAVITY * a_avg * (h1 - h2) / link%length
        fric_term = GRAVITY * a_avg * sf
        if (link%flow < 0.0d0) fric_term = -fric_term

        conv_term = link%flow * abs(link%flow) &
                    / (a_avg * link%length) * (a2 - a1)

        dq = (head_grad - fric_term - conv_term) * dt
        link%new_flow = link%flow + dq

        q_max = link%a_full * 25.0d0
        if (link%new_flow > q_max) link%new_flow = q_max
        if (link%new_flow < -q_max) link%new_flow = -q_max

        link%velocity = link%new_flow / a_avg
        depth = a_avg / link%a_full * (2.0d0 * link%r_full)
        if (depth > 0.0d0) then
            link%froude = abs(link%velocity) &
                          / sqrt(GRAVITY * depth)
        else
            link%froude = 0.0d0
        end if
    end subroutine update_flow

end module dynwave_module`,
    julia: `# dynwave.jl — Dynamic Wave Solver
# SWMM5 Engine in Julia — Saint-Venant Equation Solver
# Solves full momentum equation using explicit
# finite-difference scheme for unsteady conduit flow

const GRAVITY = 32.174  # ft/s²

mutable struct Link
    length::Float64      # conduit length (ft)
    roughness::Float64   # Manning's n
    a_full::Float64      # full cross-section area (ft²)
    r_full::Float64      # full hydraulic radius (ft)
    flow::Float64        # current flow (cfs)
    new_flow::Float64    # updated flow (cfs)
    velocity::Float64    # flow velocity (ft/s)
    froude::Float64      # Froude number
end

function get_friction_slope(link::Link, area::Float64,
                            velocity::Float64)::Float64
    """Sf = (n * |V| / R^(2/3))²"""
    area ≤ 0.0 && return 0.0
    rh = link.r_full * (area / link.a_full)
    rh ≤ 0.0 && return 0.0

    nv = link.roughness * abs(velocity)
    return (nv * nv) / rh^(4.0 / 3.0)
end

function update_flow!(link::Link, h1::Float64, h2::Float64,
                      a1::Float64, a2::Float64,
                      dt::Float64)
    """Explicit momentum equation update."""
    a_avg = 0.5 * (a1 + a2)
    if a_avg ≤ 0.0
        link.new_flow = 0.0
        return
    end

    velocity = link.flow / a_avg
    sf = get_friction_slope(link, a_avg, velocity)

    # Gravity (pressure) term
    head_grad = GRAVITY * a_avg * (h1 - h2) / link.length

    # Friction term
    fric_term = GRAVITY * a_avg * sf
    if link.flow < 0.0
        fric_term = -fric_term
    end

    # Convective acceleration term
    conv_term = link.flow * abs(link.flow) /
                (a_avg * link.length) * (a2 - a1)

    dq = (head_grad - fric_term - conv_term) * dt
    link.new_flow = link.flow + dq

    # Clamp flow
    q_max = link.a_full * 25.0
    link.new_flow = clamp(link.new_flow, -q_max, q_max)

    # Update velocity and Froude number
    link.velocity = link.new_flow / a_avg
    depth = a_avg / link.a_full * (2.0 * link.r_full)
    link.froude = depth > 0.0 ?
        abs(link.velocity) / sqrt(GRAVITY * depth) : 0.0
end`,
    javascript: `// dynwave.js — Dynamic Wave Solver
// SWMM5 Engine in JavaScript — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

const GRAVITY = 32.174; // ft/s²

class Link {
    constructor(length, roughness, aFull, rFull, flow) {
        this.length = length;       // conduit length (ft)
        this.roughness = roughness; // Manning's n
        this.aFull = aFull;         // full area (ft²)
        this.rFull = rFull;         // full hydraulic radius (ft)
        this.flow = flow;           // current flow (cfs)
        this.newFlow = 0.0;
        this.velocity = 0.0;
        this.froude = 0.0;
    }

    /** Sf = (n * |V| / R^(2/3))^2 */
    getFrictionSlope(area, velocity) {
        if (area <= 0.0) return 0.0;
        const rh = this.rFull * (area / this.aFull);
        if (rh <= 0.0) return 0.0;

        const nv = this.roughness * Math.abs(velocity);
        return (nv * nv) / Math.pow(rh, 4.0 / 3.0);
    }

    /** Explicit momentum equation update */
    updateFlow(h1, h2, a1, a2, dt) {
        const aAvg = 0.5 * (a1 + a2);
        if (aAvg <= 0.0) {
            this.newFlow = 0.0;
            return;
        }

        const velocity = this.flow / aAvg;
        const sf = this.getFrictionSlope(aAvg, velocity);

        // Gravity (pressure) term
        const headGrad = GRAVITY * aAvg
                         * (h1 - h2) / this.length;

        // Friction term
        let fricTerm = GRAVITY * aAvg * sf;
        if (this.flow < 0.0) fricTerm = -fricTerm;

        // Convective acceleration term
        const convTerm = this.flow * Math.abs(this.flow)
            / (aAvg * this.length) * (a2 - a1);

        const dq = (headGrad - fricTerm - convTerm) * dt;
        this.newFlow = this.flow + dq;

        // Clamp flow
        const qMax = this.aFull * 25.0;
        this.newFlow = Math.max(-qMax,
                       Math.min(this.newFlow, qMax));

        // Update velocity and Froude number
        this.velocity = this.newFlow / aAvg;
        const depth = aAvg / this.aFull * (2.0 * this.rFull);
        this.froude = depth > 0.0
            ? Math.abs(this.velocity)
              / Math.sqrt(GRAVITY * depth)
            : 0.0;
    }
}

export { Link, GRAVITY };`,
    go: `// dynwave.go — Dynamic Wave Solver
// SWMM5 Engine in Go — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

package swmm

import "math"

const Gravity = 32.174 // ft/s²

// Link represents a conduit in the drainage network
type Link struct {
    Length    float64 // conduit length (ft)
    Roughness float64 // Manning's n
    AFull    float64 // full cross-section area (ft²)
    RFull    float64 // full hydraulic radius (ft)
    Flow     float64 // current flow (cfs)
    NewFlow  float64 // updated flow (cfs)
    Velocity float64 // flow velocity (ft/s)
    Froude   float64 // Froude number
}

// GetFrictionSlope computes Sf = (n*|V|/R^(2/3))^2
func (l *Link) GetFrictionSlope(area, velocity float64) float64 {
    if area <= 0.0 {
        return 0.0
    }
    rh := l.RFull * (area / l.AFull)
    if rh <= 0.0 {
        return 0.0
    }

    nv := l.Roughness * math.Abs(velocity)
    return (nv * nv) / math.Pow(rh, 4.0/3.0)
}

// UpdateFlow applies the explicit momentum equation
func (l *Link) UpdateFlow(h1, h2, a1, a2, dt float64) {
    aAvg := 0.5 * (a1 + a2)
    if aAvg <= 0.0 {
        l.NewFlow = 0.0
        return
    }

    velocity := l.Flow / aAvg
    sf := l.GetFrictionSlope(aAvg, velocity)

    // Gravity (pressure) term
    headGrad := Gravity * aAvg * (h1 - h2) / l.Length

    // Friction term
    fricTerm := Gravity * aAvg * sf
    if l.Flow < 0.0 {
        fricTerm = -fricTerm
    }

    // Convective acceleration term
    convTerm := l.Flow * math.Abs(l.Flow) /
        (aAvg * l.Length) * (a2 - a1)

    dq := (headGrad - fricTerm - convTerm) * dt
    l.NewFlow = l.Flow + dq

    // Clamp flow
    qMax := l.AFull * 25.0
    l.NewFlow = math.Max(-qMax, math.Min(l.NewFlow, qMax))

    // Update velocity and Froude number
    l.Velocity = l.NewFlow / aAvg
    depth := aAvg / l.AFull * (2.0 * l.RFull)
    if depth > 0.0 {
        l.Froude = math.Abs(l.Velocity) /
            math.Sqrt(Gravity*depth)
    } else {
        l.Froude = 0.0
    }
}`,
  },
  "flowrout.c — Flow Routing Dispatch": {
    category: "Hydraulics",
    difficulty: "intermediate",
    tags: ["flow routing", "kinematic wave", "dynamic wave", "steady flow", "routing method", "conduit", "dispatch"],
    description: "The traffic controller of SWMM5's hydraulic engine. Dispatches flow calculations to the appropriate routing method — steady flow (simplest), kinematic wave (intermediate), or dynamic wave (full Saint-Venant). Each method trades off computational cost against physical accuracy. Kinematic wave ignores backwater effects but runs faster; dynamic wave captures everything but requires smaller timesteps.",
    equations: "Steady: Q = (1/n)*A*R^(2/3)*S^(1/2); Kinematic: dA/dt + dQ/dx = q_lat; Dynamic: full Saint-Venant",
    inputs: "Routing method selection, conduit properties, time step, boundary conditions",
    outputs: "Routed flow and depth in each conduit",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "PySWMM Wrapper", url: "https://github.com/pyswmm/pyswmm" },
    ],
    c: `// flowrout.c — Flow Routing Dispatch
// EPA SWMM5 Engine — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

#include <math.h>

typedef enum {
    STEADY_FLOW = 0,
    KINWAVE     = 1,
    DYNWAVE     = 2
} TRoutingMethod;

typedef struct {
    double area;        // cross-section area (ft²)
    double radius;      // hydraulic radius (ft)
    double roughness;   // Manning's n
    double slope;       // conduit slope
    double length;      // conduit length (ft)
    double qIn;         // inflow (cfs)
    double qOut;        // outflow (cfs)
    double qLat;        // lateral inflow (cfs)
} TRoutingParams;

double steady_getFlow(TRoutingParams* rp)
{
    // Manning's equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
    if (rp->area <= 0.0 || rp->slope <= 0.0) return 0.0;

    return (1.0 / rp->roughness)
           * rp->area
           * pow(rp->radius, 2.0 / 3.0)
           * sqrt(rp->slope);
}

double kinwave_getFlow(TRoutingParams* rp, double dt)
{
    // Kinematic wave: dA/dt + dQ/dx = q_lat
    // Uses Courant-limited explicit scheme
    double celerity, courant, qNew;

    if (rp->area <= 0.0) return 0.0;

    // Wave celerity from Manning's
    celerity = (5.0 / 3.0) * rp->qIn / rp->area;
    if (celerity <= 0.0) celerity = 0.01;

    courant = celerity * dt / rp->length;
    if (courant > 1.0) courant = 1.0;

    // Explicit update
    qNew = rp->qOut + courant * (rp->qIn - rp->qOut)
           + rp->qLat * rp->length;

    if (qNew < 0.0) qNew = 0.0;
    return qNew;
}

double flowrout_route(TRoutingParams* rp, TRoutingMethod method,
                      double dt)
{
    // Dispatch to the appropriate routing method
    switch (method)
    {
        case STEADY_FLOW:
            return steady_getFlow(rp);

        case KINWAVE:
            return kinwave_getFlow(rp, dt);

        case DYNWAVE:
            // Dynamic wave handled by dynwave.c solver
            return rp->qIn;

        default:
            return 0.0;
    }
}`,
    rust: `// flowrout.rs — Flow Routing Dispatch
// SWMM5 Engine in Rust — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum RoutingMethod {
    SteadyFlow,
    KinWave,
    DynWave,
}

pub struct RoutingParams {
    pub area: f64,       // cross-section area (ft²)
    pub radius: f64,     // hydraulic radius (ft)
    pub roughness: f64,  // Manning's n
    pub slope: f64,      // conduit slope
    pub length: f64,     // conduit length (ft)
    pub q_in: f64,       // inflow (cfs)
    pub q_out: f64,      // outflow (cfs)
    pub q_lat: f64,      // lateral inflow (cfs)
}

impl RoutingParams {
    /// Manning's equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
    pub fn steady_flow(&self) -> f64 {
        if self.area <= 0.0 || self.slope <= 0.0 {
            return 0.0;
        }
        (1.0 / self.roughness)
            * self.area
            * self.radius.powf(2.0 / 3.0)
            * self.slope.sqrt()
    }

    /// Kinematic wave with Courant-limited explicit scheme
    pub fn kinwave_flow(&self, dt: f64) -> f64 {
        if self.area <= 0.0 { return 0.0; }

        let mut celerity = (5.0 / 3.0)
                           * self.q_in / self.area;
        if celerity <= 0.0 { celerity = 0.01; }

        let courant = (celerity * dt / self.length)
                      .min(1.0);

        let q_new = self.q_out
            + courant * (self.q_in - self.q_out)
            + self.q_lat * self.length;

        q_new.max(0.0)
    }

    /// Dispatch to the appropriate routing method
    pub fn route(&self, method: RoutingMethod,
                 dt: f64) -> f64 {
        match method {
            RoutingMethod::SteadyFlow => self.steady_flow(),
            RoutingMethod::KinWave => self.kinwave_flow(dt),
            RoutingMethod::DynWave => self.q_in,
        }
    }
}`,
    python: `# flowrout.py — Flow Routing Dispatch
# SWMM5 Engine in Python — Routing Method Dispatcher
# Dispatches flow calculations to steady, kinematic
# wave, or dynamic wave routing methods

import math
from enum import Enum, auto
from dataclasses import dataclass


class RoutingMethod(Enum):
    STEADY_FLOW = auto()
    KINWAVE = auto()
    DYNWAVE = auto()


@dataclass
class RoutingParams:
    area: float       # cross-section area (ft²)
    radius: float     # hydraulic radius (ft)
    roughness: float  # Manning's n
    slope: float      # conduit slope
    length: float     # conduit length (ft)
    q_in: float       # inflow (cfs)
    q_out: float      # outflow (cfs)
    q_lat: float      # lateral inflow (cfs)

    def steady_flow(self) -> float:
        """Manning's equation: Q = (1/n)*A*R^(2/3)*S^(1/2)."""
        if self.area <= 0.0 or self.slope <= 0.0:
            return 0.0
        return ((1.0 / self.roughness)
                * self.area
                * self.radius ** (2.0 / 3.0)
                * math.sqrt(self.slope))

    def kinwave_flow(self, dt: float) -> float:
        """Kinematic wave with Courant-limited explicit scheme."""
        if self.area <= 0.0:
            return 0.0

        celerity = (5.0 / 3.0) * self.q_in / self.area
        if celerity <= 0.0:
            celerity = 0.01

        courant = min(celerity * dt / self.length, 1.0)

        q_new = (self.q_out
                 + courant * (self.q_in - self.q_out)
                 + self.q_lat * self.length)
        return max(q_new, 0.0)

    def route(self, method: RoutingMethod,
              dt: float) -> float:
        """Dispatch to the appropriate routing method."""
        if method == RoutingMethod.STEADY_FLOW:
            return self.steady_flow()
        elif method == RoutingMethod.KINWAVE:
            return self.kinwave_flow(dt)
        elif method == RoutingMethod.DYNWAVE:
            return self.q_in
        return 0.0`,
    fortran: `! flowrout.f90 — Flow Routing Dispatch
! SWMM5 Engine in Fortran — Routing Method Dispatcher
! Dispatches flow calculations to steady, kinematic
! wave, or dynamic wave routing methods

module flowrout_module
    implicit none

    integer, parameter :: STEADY_FLOW = 0
    integer, parameter :: KINWAVE     = 1
    integer, parameter :: DYNWAVE     = 2

    type :: RoutingParams
        real(8) :: area        ! cross-section area (ft²)
        real(8) :: radius      ! hydraulic radius (ft)
        real(8) :: roughness   ! Manning's n
        real(8) :: slope       ! conduit slope
        real(8) :: length      ! conduit length (ft)
        real(8) :: q_in        ! inflow (cfs)
        real(8) :: q_out       ! outflow (cfs)
        real(8) :: q_lat       ! lateral inflow (cfs)
    end type RoutingParams

contains

    function steady_get_flow(rp) result(q)
        type(RoutingParams), intent(in) :: rp
        real(8) :: q

        if (rp%area <= 0.0d0 .or. rp%slope <= 0.0d0) then
            q = 0.0d0
            return
        end if

        q = (1.0d0 / rp%roughness) &
            * rp%area &
            * rp%radius**(2.0d0 / 3.0d0) &
            * sqrt(rp%slope)
    end function steady_get_flow

    function kinwave_get_flow(rp, dt) result(q_new)
        type(RoutingParams), intent(in) :: rp
        real(8), intent(in) :: dt
        real(8) :: q_new, celerity, courant

        if (rp%area <= 0.0d0) then
            q_new = 0.0d0
            return
        end if

        celerity = (5.0d0 / 3.0d0) * rp%q_in / rp%area
        if (celerity <= 0.0d0) celerity = 0.01d0

        courant = celerity * dt / rp%length
        if (courant > 1.0d0) courant = 1.0d0

        q_new = rp%q_out &
                + courant * (rp%q_in - rp%q_out) &
                + rp%q_lat * rp%length

        if (q_new < 0.0d0) q_new = 0.0d0
    end function kinwave_get_flow

    function flowrout_route(rp, method, dt) result(q)
        type(RoutingParams), intent(in) :: rp
        integer, intent(in) :: method
        real(8), intent(in) :: dt
        real(8) :: q

        select case (method)
        case (STEADY_FLOW)
            q = steady_get_flow(rp)
        case (KINWAVE)
            q = kinwave_get_flow(rp, dt)
        case (DYNWAVE)
            q = rp%q_in
        case default
            q = 0.0d0
        end select
    end function flowrout_route

end module flowrout_module`,
    julia: `# flowrout.jl — Flow Routing Dispatch
# SWMM5 Engine in Julia — Routing Method Dispatcher
# Dispatches flow calculations to steady, kinematic
# wave, or dynamic wave routing methods

@enum RoutingMethod begin
    SteadyFlow
    KinWave
    DynWave
end

struct RoutingParams
    area::Float64       # cross-section area (ft²)
    radius::Float64     # hydraulic radius (ft)
    roughness::Float64  # Manning's n
    slope::Float64      # conduit slope
    length::Float64     # conduit length (ft)
    q_in::Float64       # inflow (cfs)
    q_out::Float64      # outflow (cfs)
    q_lat::Float64      # lateral inflow (cfs)
end

function steady_flow(rp::RoutingParams)::Float64
    """Manning's equation: Q = (1/n)*A*R^(2/3)*S^(1/2)."""
    (rp.area ≤ 0.0 || rp.slope ≤ 0.0) && return 0.0

    return (1.0 / rp.roughness) *
           rp.area *
           rp.radius^(2.0 / 3.0) *
           sqrt(rp.slope)
end

function kinwave_flow(rp::RoutingParams, dt::Float64)::Float64
    """Kinematic wave with Courant-limited explicit scheme."""
    rp.area ≤ 0.0 && return 0.0

    celerity = (5.0 / 3.0) * rp.q_in / rp.area
    if celerity ≤ 0.0
        celerity = 0.01
    end

    courant = min(celerity * dt / rp.length, 1.0)

    q_new = rp.q_out +
            courant * (rp.q_in - rp.q_out) +
            rp.q_lat * rp.length

    return max(q_new, 0.0)
end

function route(rp::RoutingParams, method::RoutingMethod,
               dt::Float64)::Float64
    """Dispatch to the appropriate routing method."""
    if method == SteadyFlow
        return steady_flow(rp)
    elseif method == KinWave
        return kinwave_flow(rp, dt)
    elseif method == DynWave
        return rp.q_in
    end
    return 0.0
end`,
    javascript: `// flowrout.js — Flow Routing Dispatch
// SWMM5 Engine in JavaScript — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

const RoutingMethod = Object.freeze({
    STEADY_FLOW: 0,
    KINWAVE: 1,
    DYNWAVE: 2,
});

class RoutingParams {
    constructor(area, radius, roughness, slope, length,
                qIn, qOut, qLat) {
        this.area = area;           // cross-section area (ft²)
        this.radius = radius;       // hydraulic radius (ft)
        this.roughness = roughness; // Manning's n
        this.slope = slope;         // conduit slope
        this.length = length;       // conduit length (ft)
        this.qIn = qIn;            // inflow (cfs)
        this.qOut = qOut;           // outflow (cfs)
        this.qLat = qLat;           // lateral inflow (cfs)
    }

    /** Manning's equation: Q = (1/n)*A*R^(2/3)*S^(1/2) */
    steadyFlow() {
        if (this.area <= 0.0 || this.slope <= 0.0) return 0.0;

        return (1.0 / this.roughness)
               * this.area
               * Math.pow(this.radius, 2.0 / 3.0)
               * Math.sqrt(this.slope);
    }

    /** Kinematic wave with Courant-limited explicit scheme */
    kinwaveFlow(dt) {
        if (this.area <= 0.0) return 0.0;

        let celerity = (5.0 / 3.0) * this.qIn / this.area;
        if (celerity <= 0.0) celerity = 0.01;

        const courant = Math.min(
            celerity * dt / this.length, 1.0);

        const qNew = this.qOut
            + courant * (this.qIn - this.qOut)
            + this.qLat * this.length;

        return Math.max(qNew, 0.0);
    }

    /** Dispatch to the appropriate routing method */
    route(method, dt) {
        switch (method) {
            case RoutingMethod.STEADY_FLOW:
                return this.steadyFlow();
            case RoutingMethod.KINWAVE:
                return this.kinwaveFlow(dt);
            case RoutingMethod.DYNWAVE:
                return this.qIn;
            default:
                return 0.0;
        }
    }
}

export { RoutingMethod, RoutingParams };`,
    go: `// flowrout.go — Flow Routing Dispatch
// SWMM5 Engine in Go — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

package swmm

import "math"

// RoutingMethod selects the hydraulic routing approach
type RoutingMethod int

const (
    SteadyFlow RoutingMethod = iota
    KinWave
    DynWave
)

// RoutingParams holds conduit properties for routing
type RoutingParams struct {
    Area      float64 // cross-section area (ft²)
    Radius    float64 // hydraulic radius (ft)
    Roughness float64 // Manning's n
    Slope     float64 // conduit slope
    Length    float64 // conduit length (ft)
    QIn       float64 // inflow (cfs)
    QOut      float64 // outflow (cfs)
    QLat      float64 // lateral inflow (cfs)
}

// SteadyGetFlow computes Q = (1/n)*A*R^(2/3)*S^(1/2)
func (rp *RoutingParams) SteadyGetFlow() float64 {
    if rp.Area <= 0.0 || rp.Slope <= 0.0 {
        return 0.0
    }
    return (1.0 / rp.Roughness) *
        rp.Area *
        math.Pow(rp.Radius, 2.0/3.0) *
        math.Sqrt(rp.Slope)
}

// KinwaveGetFlow uses Courant-limited explicit scheme
func (rp *RoutingParams) KinwaveGetFlow(dt float64) float64 {
    if rp.Area <= 0.0 {
        return 0.0
    }

    celerity := (5.0 / 3.0) * rp.QIn / rp.Area
    if celerity <= 0.0 {
        celerity = 0.01
    }

    courant := celerity * dt / rp.Length
    if courant > 1.0 {
        courant = 1.0
    }

    qNew := rp.QOut +
        courant*(rp.QIn-rp.QOut) +
        rp.QLat*rp.Length

    return math.Max(qNew, 0.0)
}

// Route dispatches to the appropriate routing method
func (rp *RoutingParams) Route(method RoutingMethod,
    dt float64) float64 {
    switch method {
    case SteadyFlow:
        return rp.SteadyGetFlow()
    case KinWave:
        return rp.KinwaveGetFlow(dt)
    case DynWave:
        return rp.QIn
    default:
        return 0.0
    }
}`,
  },
  "subcatch.c — Subcatchment Runoff": {
    category: "Hydrology",
    difficulty: "intermediate",
    tags: ["subcatchment", "runoff", "manning", "overland flow", "depression storage", "impervious", "pervious", "nonlinear reservoir"],
    description: "Models how rainfall becomes runoff across the land surface. Each subcatchment is divided into pervious and impervious sub-areas, each treated as a nonlinear reservoir. Water accumulates on the surface, fills depression storage (puddles), infiltrates into pervious soil, and runs off once depth exceeds storage capacity. Uses Manning's equation to compute overland flow rate as a function of ponded depth.",
    equations: "Q = W*S^0.5/n * (d - d_store)^(5/3) (Manning's nonlinear reservoir); d_new = d_old + (rain - evap - infil - runoff)*dt/A",
    inputs: "Subcatchment area, width, slope, Manning's n, depression storage, percent impervious, rainfall, evaporation",
    outputs: "Surface runoff flow rate, ponded depth, infiltration rate",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "PySWMM Wrapper", url: "https://github.com/pyswmm/pyswmm" },
    ],
    c: `// subcatch.c — Subcatchment Runoff
// EPA SWMM5 Engine — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

#include <math.h>

typedef struct {
    double area;          // subcatchment area (ft²)
    double width;         // overland flow width (ft)
    double slope;         // average surface slope
    double nImperv;       // Manning's n, impervious
    double nPerv;         // Manning's n, pervious
    double dStoreImperv;  // depression storage, imperv (ft)
    double dStorePerv;    // depression storage, perv (ft)
    double pctImperv;     // percent impervious (0–1)
    double depth;         // current ponded depth (ft)
} TSubcatch;

double subcatch_getRunoff(TSubcatch* sc, double depth,
                           double nMannings, double dStore)
{
    // Manning's nonlinear reservoir:
    // Q = W * S^0.5 / n * (d - d_store)^(5/3)
    double excess, alpha;

    excess = depth - dStore;
    if (excess <= 0.0) return 0.0;

    alpha = sc->width * sqrt(sc->slope) / nMannings;
    if (alpha <= 0.0) return 0.0;

    return alpha * pow(excess, 5.0 / 3.0);
}

double subcatch_getDepth(double depth, double area,
                          double rain, double evap,
                          double infil, double runoff,
                          double dt)
{
    // Water balance: d_new = d_old + (rain-evap-infil-runoff)*dt/A
    double dNew;

    dNew = depth + (rain - evap - infil - runoff) * dt / area;
    if (dNew < 0.0) dNew = 0.0;

    return dNew;
}

double subcatch_route(TSubcatch* sc, double rain,
                       double evap, double infil, double dt)
{
    // Route runoff over pervious and impervious areas
    double qImperv, qPerv, qTotal;
    double aImperv, aPerv;

    aImperv = sc->area * sc->pctImperv;
    aPerv   = sc->area * (1.0 - sc->pctImperv);

    // Impervious area runoff (no infiltration)
    qImperv = subcatch_getRunoff(sc, sc->depth,
                  sc->nImperv, sc->dStoreImperv);

    // Pervious area runoff (after infiltration)
    qPerv = subcatch_getRunoff(sc, sc->depth,
                sc->nPerv, sc->dStorePerv);

    // Weighted total runoff
    qTotal = sc->pctImperv * qImperv
             + (1.0 - sc->pctImperv) * qPerv;

    // Update ponded depth via water balance
    sc->depth = subcatch_getDepth(sc->depth, sc->area,
                    rain, evap,
                    infil * (1.0 - sc->pctImperv),
                    qTotal, dt);

    return qTotal;
}`,
    rust: `// subcatch.rs — Subcatchment Runoff
// SWMM5 Engine in Rust — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

pub struct Subcatch {
    pub area: f64,           // subcatchment area (ft²)
    pub width: f64,          // overland flow width (ft)
    pub slope: f64,          // average surface slope
    pub n_imperv: f64,       // Manning's n, impervious
    pub n_perv: f64,         // Manning's n, pervious
    pub d_store_imperv: f64, // depression storage, imperv (ft)
    pub d_store_perv: f64,   // depression storage, perv (ft)
    pub pct_imperv: f64,     // percent impervious (0–1)
    pub depth: f64,          // current ponded depth (ft)
}

impl Subcatch {
    /// Manning's nonlinear reservoir:
    /// Q = W * S^0.5 / n * (d - d_store)^(5/3)
    pub fn get_runoff(&self, depth: f64, n_mannings: f64,
                      d_store: f64) -> f64 {
        let excess = depth - d_store;
        if excess <= 0.0 { return 0.0; }

        let alpha = self.width * self.slope.sqrt()
                    / n_mannings;
        if alpha <= 0.0 { return 0.0; }

        alpha * excess.powf(5.0 / 3.0)
    }

    /// Water balance depth update
    fn get_depth(depth: f64, area: f64, rain: f64,
                 evap: f64, infil: f64, runoff: f64,
                 dt: f64) -> f64 {
        let d_new = depth
            + (rain - evap - infil - runoff) * dt / area;
        d_new.max(0.0)
    }

    /// Route runoff over pervious and impervious areas
    pub fn route(&mut self, rain: f64, evap: f64,
                 infil: f64, dt: f64) -> f64 {
        // Impervious area runoff (no infiltration)
        let q_imperv = self.get_runoff(
            self.depth, self.n_imperv, self.d_store_imperv);

        // Pervious area runoff (after infiltration)
        let q_perv = self.get_runoff(
            self.depth, self.n_perv, self.d_store_perv);

        // Weighted total runoff
        let q_total = self.pct_imperv * q_imperv
            + (1.0 - self.pct_imperv) * q_perv;

        // Update ponded depth via water balance
        self.depth = Self::get_depth(
            self.depth, self.area, rain, evap,
            infil * (1.0 - self.pct_imperv),
            q_total, dt);

        q_total
    }
}`,
    python: `# subcatch.py — Subcatchment Runoff
# SWMM5 Engine in Python — Nonlinear Reservoir Surface Runoff
# Models rainfall-runoff using Manning's equation for
# pervious and impervious sub-areas of a subcatchment

import math
from dataclasses import dataclass


@dataclass
class Subcatch:
    area: float           # subcatchment area (ft²)
    width: float          # overland flow width (ft)
    slope: float          # average surface slope
    n_imperv: float       # Manning's n, impervious
    n_perv: float         # Manning's n, pervious
    d_store_imperv: float # depression storage, imperv (ft)
    d_store_perv: float   # depression storage, perv (ft)
    pct_imperv: float     # percent impervious (0–1)
    depth: float = 0.0    # current ponded depth (ft)

    def get_runoff(self, depth: float, n_mannings: float,
                   d_store: float) -> float:
        """Manning's nonlinear reservoir:
        Q = W * S^0.5 / n * (d - d_store)^(5/3)."""
        excess = depth - d_store
        if excess <= 0.0:
            return 0.0

        alpha = (self.width * math.sqrt(self.slope)
                 / n_mannings)
        if alpha <= 0.0:
            return 0.0

        return alpha * excess ** (5.0 / 3.0)

    @staticmethod
    def get_depth(depth: float, area: float, rain: float,
                  evap: float, infil: float, runoff: float,
                  dt: float) -> float:
        """Water balance depth update."""
        d_new = depth + (rain - evap - infil - runoff) * dt / area
        return max(d_new, 0.0)

    def route(self, rain: float, evap: float,
              infil: float, dt: float) -> float:
        """Route runoff over pervious and impervious areas."""
        # Impervious area runoff (no infiltration)
        q_imperv = self.get_runoff(
            self.depth, self.n_imperv, self.d_store_imperv)

        # Pervious area runoff (after infiltration)
        q_perv = self.get_runoff(
            self.depth, self.n_perv, self.d_store_perv)

        # Weighted total runoff
        q_total = (self.pct_imperv * q_imperv
                   + (1.0 - self.pct_imperv) * q_perv)

        # Update ponded depth via water balance
        self.depth = self.get_depth(
            self.depth, self.area, rain, evap,
            infil * (1.0 - self.pct_imperv),
            q_total, dt)

        return q_total`,
    fortran: `! subcatch.f90 — Subcatchment Runoff
! SWMM5 Engine in Fortran — Nonlinear Reservoir Surface Runoff
! Models rainfall-runoff using Manning's equation for
! pervious and impervious sub-areas of a subcatchment

module subcatch_module
    implicit none

    type :: TSubcatch
        real(8) :: area           ! subcatchment area (ft²)
        real(8) :: width          ! overland flow width (ft)
        real(8) :: slope          ! average surface slope
        real(8) :: n_imperv       ! Manning's n, impervious
        real(8) :: n_perv         ! Manning's n, pervious
        real(8) :: d_store_imperv ! depression storage (ft)
        real(8) :: d_store_perv   ! depression storage (ft)
        real(8) :: pct_imperv     ! percent impervious (0–1)
        real(8) :: depth          ! current ponded depth (ft)
    end type TSubcatch

contains

    function subcatch_get_runoff(sc, depth, n_mannings, &
                                 d_store) result(q)
        type(TSubcatch), intent(in) :: sc
        real(8), intent(in) :: depth, n_mannings, d_store
        real(8) :: q, excess, alpha

        excess = depth - d_store
        if (excess <= 0.0d0) then
            q = 0.0d0
            return
        end if

        alpha = sc%width * sqrt(sc%slope) / n_mannings
        if (alpha <= 0.0d0) then
            q = 0.0d0
            return
        end if

        q = alpha * excess**(5.0d0 / 3.0d0)
    end function subcatch_get_runoff

    function subcatch_get_depth(depth, area, rain, evap, &
                                infil, runoff, dt) result(d_new)
        real(8), intent(in) :: depth, area, rain, evap
        real(8), intent(in) :: infil, runoff, dt
        real(8) :: d_new

        d_new = depth + (rain - evap - infil - runoff) &
                * dt / area
        if (d_new < 0.0d0) d_new = 0.0d0
    end function subcatch_get_depth

    subroutine subcatch_route(sc, rain, evap, infil, &
                              dt, q_total)
        type(TSubcatch), intent(inout) :: sc
        real(8), intent(in) :: rain, evap, infil, dt
        real(8), intent(out) :: q_total
        real(8) :: q_imperv, q_perv

        q_imperv = subcatch_get_runoff(sc, sc%depth, &
                       sc%n_imperv, sc%d_store_imperv)

        q_perv = subcatch_get_runoff(sc, sc%depth, &
                     sc%n_perv, sc%d_store_perv)

        q_total = sc%pct_imperv * q_imperv &
                  + (1.0d0 - sc%pct_imperv) * q_perv

        sc%depth = subcatch_get_depth(sc%depth, sc%area, &
                       rain, evap, &
                       infil * (1.0d0 - sc%pct_imperv), &
                       q_total, dt)
    end subroutine subcatch_route

end module subcatch_module`,
    julia: `# subcatch.jl — Subcatchment Runoff
# SWMM5 Engine in Julia — Nonlinear Reservoir Surface Runoff
# Models rainfall-runoff using Manning's equation for
# pervious and impervious sub-areas of a subcatchment

mutable struct Subcatch
    area::Float64           # subcatchment area (ft²)
    width::Float64          # overland flow width (ft)
    slope::Float64          # average surface slope
    n_imperv::Float64       # Manning's n, impervious
    n_perv::Float64         # Manning's n, pervious
    d_store_imperv::Float64 # depression storage (ft)
    d_store_perv::Float64   # depression storage (ft)
    pct_imperv::Float64     # percent impervious (0–1)
    depth::Float64          # current ponded depth (ft)
end

function get_runoff(sc::Subcatch, depth::Float64,
                    n_mannings::Float64,
                    d_store::Float64)::Float64
    """Manning's nonlinear reservoir:
    Q = W * S^0.5 / n * (d - d_store)^(5/3)."""
    excess = depth - d_store
    excess ≤ 0.0 && return 0.0

    alpha = sc.width * sqrt(sc.slope) / n_mannings
    alpha ≤ 0.0 && return 0.0

    return alpha * excess^(5.0 / 3.0)
end

function get_depth(depth::Float64, area::Float64,
                   rain::Float64, evap::Float64,
                   infil::Float64, runoff::Float64,
                   dt::Float64)::Float64
    """Water balance depth update."""
    d_new = depth + (rain - evap - infil - runoff) * dt / area
    return max(d_new, 0.0)
end

function route!(sc::Subcatch, rain::Float64, evap::Float64,
                infil::Float64, dt::Float64)::Float64
    """Route runoff over pervious and impervious areas."""
    # Impervious area runoff (no infiltration)
    q_imperv = get_runoff(sc, sc.depth,
                   sc.n_imperv, sc.d_store_imperv)

    # Pervious area runoff (after infiltration)
    q_perv = get_runoff(sc, sc.depth,
                 sc.n_perv, sc.d_store_perv)

    # Weighted total runoff
    q_total = sc.pct_imperv * q_imperv +
              (1.0 - sc.pct_imperv) * q_perv

    # Update ponded depth via water balance
    sc.depth = get_depth(sc.depth, sc.area, rain, evap,
                   infil * (1.0 - sc.pct_imperv),
                   q_total, dt)

    return q_total
end`,
    javascript: `// subcatch.js — Subcatchment Runoff
// SWMM5 Engine in JavaScript — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

class Subcatch {
    constructor(area, width, slope, nImperv, nPerv,
                dStoreImperv, dStorePerv, pctImperv) {
        this.area = area;                   // ft²
        this.width = width;                 // ft
        this.slope = slope;
        this.nImperv = nImperv;             // Manning's n
        this.nPerv = nPerv;
        this.dStoreImperv = dStoreImperv;   // ft
        this.dStorePerv = dStorePerv;       // ft
        this.pctImperv = pctImperv;         // 0–1
        this.depth = 0.0;                   // ft
    }

    /** Manning's nonlinear reservoir:
     *  Q = W * S^0.5 / n * (d - d_store)^(5/3) */
    getRunoff(depth, nMannings, dStore) {
        const excess = depth - dStore;
        if (excess <= 0.0) return 0.0;

        const alpha = this.width * Math.sqrt(this.slope)
                      / nMannings;
        if (alpha <= 0.0) return 0.0;

        return alpha * Math.pow(excess, 5.0 / 3.0);
    }

    /** Water balance depth update */
    static getDepth(depth, area, rain, evap,
                    infil, runoff, dt) {
        const dNew = depth
            + (rain - evap - infil - runoff) * dt / area;
        return Math.max(dNew, 0.0);
    }

    /** Route runoff over pervious and impervious areas */
    route(rain, evap, infil, dt) {
        // Impervious area runoff (no infiltration)
        const qImperv = this.getRunoff(
            this.depth, this.nImperv, this.dStoreImperv);

        // Pervious area runoff (after infiltration)
        const qPerv = this.getRunoff(
            this.depth, this.nPerv, this.dStorePerv);

        // Weighted total runoff
        const qTotal = this.pctImperv * qImperv
            + (1.0 - this.pctImperv) * qPerv;

        // Update ponded depth via water balance
        this.depth = Subcatch.getDepth(
            this.depth, this.area, rain, evap,
            infil * (1.0 - this.pctImperv), qTotal, dt);

        return qTotal;
    }
}

export { Subcatch };`,
    go: `// subcatch.go — Subcatchment Runoff
// SWMM5 Engine in Go — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

package swmm

import "math"

// Subcatch represents a subcatchment with pervious/impervious areas
type Subcatch struct {
    Area          float64 // subcatchment area (ft²)
    Width         float64 // overland flow width (ft)
    Slope         float64 // average surface slope
    NImperv       float64 // Manning's n, impervious
    NPerv         float64 // Manning's n, pervious
    DStoreImperv  float64 // depression storage, imperv (ft)
    DStorePerv    float64 // depression storage, perv (ft)
    PctImperv     float64 // percent impervious (0–1)
    Depth         float64 // current ponded depth (ft)
}

// GetRunoff computes Q = W*S^0.5/n * (d-d_store)^(5/3)
func (sc *Subcatch) GetRunoff(depth, nMannings,
    dStore float64) float64 {
    excess := depth - dStore
    if excess <= 0.0 {
        return 0.0
    }

    alpha := sc.Width * math.Sqrt(sc.Slope) / nMannings
    if alpha <= 0.0 {
        return 0.0
    }

    return alpha * math.Pow(excess, 5.0/3.0)
}

// GetDepth performs water balance depth update
func GetDepth(depth, area, rain, evap, infil,
    runoff, dt float64) float64 {
    dNew := depth + (rain-evap-infil-runoff)*dt/area
    return math.Max(dNew, 0.0)
}

// Route computes runoff over pervious and impervious areas
func (sc *Subcatch) Route(rain, evap, infil,
    dt float64) float64 {
    // Impervious area runoff (no infiltration)
    qImperv := sc.GetRunoff(
        sc.Depth, sc.NImperv, sc.DStoreImperv)

    // Pervious area runoff (after infiltration)
    qPerv := sc.GetRunoff(
        sc.Depth, sc.NPerv, sc.DStorePerv)

    // Weighted total runoff
    qTotal := sc.PctImperv*qImperv +
        (1.0-sc.PctImperv)*qPerv

    // Update ponded depth via water balance
    sc.Depth = GetDepth(
        sc.Depth, sc.Area, rain, evap,
        infil*(1.0-sc.PctImperv), qTotal, dt)

    return qTotal
}`,
  },
  "infil.c — Infiltration Models": {
    category: "Hydrology",
    difficulty: "intermediate",
    tags: ["infiltration", "horton", "green-ampt", "curve number", "scs", "soil", "permeability", "wetting front"],
    description: "Implements the three infiltration models available in SWMM5: Horton's empirical decay equation, Green-Ampt's physically-based wetting front model, and the SCS Curve Number method. Infiltration determines how much rainfall soaks into soil versus becoming surface runoff — a critical water balance partition.",
    equations: "Horton: f = f_min + (f_max - f_min) * e^(-k*t); Green-Ampt: f = Ks * (1 + ψ·Δθ/F); SCS-CN: S = 1000/CN - 10, Ia = 0.2*S",
    inputs: "Soil properties (conductivity, suction head, porosity), Horton parameters (f0, f_inf, decay), Curve Number",
    outputs: "Infiltration rate (in/hr or mm/hr), cumulative infiltration depth",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "PySWMM Wrapper", url: "https://github.com/pyswmm/pyswmm" },
    ],
    c: `// infil.c — Infiltration Models
// EPA SWMM5 Engine — Horton, Green-Ampt, and SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

#include <math.h>

typedef struct {
    double f0;      // max infiltration rate (in/hr)
    double fInf;    // min infiltration rate (in/hr)
    double decay;   // decay constant (1/hr)
} THorton;

typedef struct {
    double ks;      // saturated hydraulic conductivity
    double psi;     // suction head (in)
    double thetaD;  // moisture deficit (porosity - moisture)
    double F;       // cumulative infiltration (in)
} TGreenAmpt;

double horton_infil(THorton* h, double t)
{
    return h->fInf + (h->f0 - h->fInf) * exp(-h->decay * t);
}

double greenampt_infil(TGreenAmpt* ga, double rainfall,
                        double dt)
{
    double f;

    if (ga->F <= 0.0) ga->F = 0.001;
    f = ga->ks * (1.0 + ga->psi * ga->thetaD / ga->F);
    if (f > rainfall) f = rainfall;

    ga->F += f * dt;
    return f;
}

double cn_infil(double rainfall, double curveNumber)
{
    double S, Ia, Pe;

    if (curveNumber <= 0.0 || curveNumber >= 100.0) return 0.0;

    S = (1000.0 / curveNumber) - 10.0;
    Ia = 0.2 * S;

    if (rainfall <= Ia) return rainfall;

    Pe = (rainfall - Ia) * (rainfall - Ia)
         / (rainfall - Ia + S);
    return rainfall - Pe;
}`,
    rust: `// infil.rs — Infiltration Models
// SWMM5 Engine in Rust — Horton, Green-Ampt, and SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

pub struct Horton {
    pub f0: f64,     // max infiltration rate (in/hr)
    pub f_inf: f64,  // min infiltration rate (in/hr)
    pub decay: f64,  // decay constant (1/hr)
}

pub struct GreenAmpt {
    pub ks: f64,      // saturated hydraulic conductivity
    pub psi: f64,     // suction head (in)
    pub theta_d: f64, // moisture deficit
    pub cum_infil: f64, // cumulative infiltration (in)
}

impl Horton {
    pub fn infiltration(&self, t: f64) -> f64 {
        self.f_inf + (self.f0 - self.f_inf)
                     * (-self.decay * t).exp()
    }
}

impl GreenAmpt {
    pub fn infiltration(&mut self, rainfall: f64,
                        dt: f64) -> f64 {
        if self.cum_infil <= 0.0 { self.cum_infil = 0.001; }

        let f = self.ks * (1.0 + self.psi * self.theta_d
                           / self.cum_infil);
        let f = f.min(rainfall);

        self.cum_infil += f * dt;
        f
    }
}

pub fn cn_infiltration(rainfall: f64, cn: f64) -> f64 {
    if cn <= 0.0 || cn >= 100.0 { return 0.0; }

    let s = (1000.0 / cn) - 10.0;
    let ia = 0.2 * s;

    if rainfall <= ia { return rainfall; }

    let pe = (rainfall - ia).powf(2.0) / (rainfall - ia + s);
    rainfall - pe
}`,
    python: `# infil.py — Infiltration Models
# SWMM5 Engine in Python — Horton, Green-Ampt, and SCS-CN
# Three methods to compute how rainfall infiltrates
# into soil versus becoming surface runoff

import math
from dataclasses import dataclass, field

@dataclass
class Horton:
    f0: float      # max infiltration rate (in/hr)
    f_inf: float   # min infiltration rate (in/hr)
    decay: float   # decay constant (1/hr)

    def infiltration(self, t: float) -> float:
        """Horton exponential decay infiltration."""
        return (self.f_inf + (self.f0 - self.f_inf)
                * math.exp(-self.decay * t))


@dataclass
class GreenAmpt:
    ks: float       # saturated hydraulic conductivity
    psi: float      # suction head (in)
    theta_d: float  # moisture deficit
    cum_infil: float = 0.001  # cumulative infiltration

    def infiltration(self, rainfall: float,
                     dt: float) -> float:
        """Green-Ampt wetting front infiltration."""
        if self.cum_infil <= 0.0:
            self.cum_infil = 0.001

        f = self.ks * (1.0 + self.psi * self.theta_d
                       / self.cum_infil)
        f = min(f, rainfall)

        self.cum_infil += f * dt
        return f


def cn_infiltration(rainfall: float, cn: float) -> float:
    """SCS Curve Number method for infiltration."""
    if cn <= 0.0 or cn >= 100.0:
        return 0.0

    s = (1000.0 / cn) - 10.0
    ia = 0.2 * s

    if rainfall <= ia:
        return rainfall

    pe = (rainfall - ia) ** 2 / (rainfall - ia + s)
    return rainfall - pe`,
    fortran: `! infil.f90 — Infiltration Models
! SWMM5 Engine in Fortran — Horton, Green-Ampt, and SCS-CN
! Three methods to compute how rainfall infiltrates
! into soil versus becoming surface runoff

module infil_module
    implicit none

    type :: Horton
        real(8) :: f0      ! max infiltration rate (in/hr)
        real(8) :: f_inf   ! min infiltration rate (in/hr)
        real(8) :: decay   ! decay constant (1/hr)
    end type Horton

    type :: GreenAmpt
        real(8) :: ks       ! saturated conductivity
        real(8) :: psi      ! suction head (in)
        real(8) :: theta_d  ! moisture deficit
        real(8) :: F        ! cumulative infiltration (in)
    end type GreenAmpt

contains

    function horton_infil(h, t) result(f)
        type(Horton), intent(in) :: h
        real(8), intent(in) :: t
        real(8) :: f

        f = h%f_inf + (h%f0 - h%f_inf) &
            * exp(-h%decay * t)
    end function horton_infil

    function greenampt_infil(ga, rainfall, dt) result(f)
        type(GreenAmpt), intent(inout) :: ga
        real(8), intent(in) :: rainfall, dt
        real(8) :: f

        if (ga%F <= 0.0d0) ga%F = 0.001d0
        f = ga%ks * (1.0d0 + ga%psi * ga%theta_d / ga%F)
        if (f > rainfall) f = rainfall

        ga%F = ga%F + f * dt
    end function greenampt_infil

    function cn_infil(rainfall, curve_number) result(infil)
        real(8), intent(in) :: rainfall, curve_number
        real(8) :: infil, S, Ia, Pe

        if (curve_number <= 0.0d0 .or. &
            curve_number >= 100.0d0) then
            infil = 0.0d0
            return
        end if

        S = (1000.0d0 / curve_number) - 10.0d0
        Ia = 0.2d0 * S

        if (rainfall <= Ia) then
            infil = rainfall
            return
        end if

        Pe = (rainfall - Ia)**2 / (rainfall - Ia + S)
        infil = rainfall - Pe
    end function cn_infil

end module infil_module`,
    julia: `# infil.jl — Infiltration Models
# SWMM5 Engine in Julia — Horton, Green-Ampt, and SCS-CN
# Three methods to compute how rainfall infiltrates
# into soil versus becoming surface runoff

struct Horton
    f0::Float64      # max infiltration rate (in/hr)
    f_inf::Float64   # min infiltration rate (in/hr)
    decay::Float64   # decay constant (1/hr)
end

mutable struct GreenAmpt
    ks::Float64       # saturated conductivity
    psi::Float64      # suction head (in)
    theta_d::Float64  # moisture deficit
    cum_infil::Float64 # cumulative infiltration (in)
end

function infiltration(h::Horton, t::Float64)::Float64
    return h.f_inf + (h.f0 - h.f_inf) * exp(-h.decay * t)
end

function infiltration(ga::GreenAmpt, rainfall::Float64,
                      dt::Float64)::Float64
    ga.cum_infil ≤ 0.0 && (ga.cum_infil = 0.001)

    f = ga.ks * (1.0 + ga.psi * ga.theta_d / ga.cum_infil)
    f = min(f, rainfall)

    ga.cum_infil += f * dt
    return f
end

function cn_infiltration(rainfall::Float64,
                         cn::Float64)::Float64
    (cn ≤ 0.0 || cn ≥ 100.0) && return 0.0

    S = (1000.0 / cn) - 10.0
    Ia = 0.2 * S

    rainfall ≤ Ia && return rainfall

    Pe = (rainfall - Ia)^2 / (rainfall - Ia + S)
    return rainfall - Pe
end`,
    javascript: `// infil.js — Infiltration Models
// SWMM5 Engine in JavaScript — Horton, Green-Ampt, SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

class Horton {
    constructor(f0, fInf, decay) {
        this.f0 = f0;       // max infiltration rate
        this.fInf = fInf;   // min infiltration rate
        this.decay = decay; // decay constant (1/hr)
    }

    /** Horton exponential decay infiltration */
    infiltration(t) {
        return this.fInf + (this.f0 - this.fInf)
               * Math.exp(-this.decay * t);
    }
}

class GreenAmpt {
    constructor(ks, psi, thetaD, cumInfil = 0.001) {
        this.ks = ks;
        this.psi = psi;
        this.thetaD = thetaD;
        this.cumInfil = cumInfil;
    }

    /** Green-Ampt wetting front infiltration */
    infiltration(rainfall, dt) {
        if (this.cumInfil <= 0.0) this.cumInfil = 0.001;

        let f = this.ks * (1.0 + this.psi * this.thetaD
                           / this.cumInfil);
        f = Math.min(f, rainfall);

        this.cumInfil += f * dt;
        return f;
    }
}

/** SCS Curve Number method for infiltration */
function cnInfiltration(rainfall, cn) {
    if (cn <= 0.0 || cn >= 100.0) return 0.0;

    const S = (1000.0 / cn) - 10.0;
    const Ia = 0.2 * S;

    if (rainfall <= Ia) return rainfall;

    const Pe = Math.pow(rainfall - Ia, 2) / (rainfall - Ia + S);
    return rainfall - Pe;
}

export { Horton, GreenAmpt, cnInfiltration };`,
    go: `// infil.go — Infiltration Models
// SWMM5 Engine in Go — Horton, Green-Ampt, and SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

package swmm

import "math"

type HortonInfil struct {
    F0    float64 // max infiltration rate (in/hr)
    FInf  float64 // min infiltration rate (in/hr)
    Decay float64 // decay constant (1/hr)
}

type GreenAmptInfil struct {
    Ks      float64 // saturated conductivity
    Psi     float64 // suction head (in)
    ThetaD  float64 // moisture deficit
    CumInfil float64 // cumulative infiltration (in)
}

func (h *HortonInfil) Infiltration(t float64) float64 {
    return h.FInf + (h.F0-h.FInf)*math.Exp(-h.Decay*t)
}

func (ga *GreenAmptInfil) Infiltration(rainfall,
    dt float64) float64 {

    if ga.CumInfil <= 0.0 {
        ga.CumInfil = 0.001
    }

    f := ga.Ks * (1.0 + ga.Psi*ga.ThetaD/ga.CumInfil)
    if f > rainfall {
        f = rainfall
    }

    ga.CumInfil += f * dt
    return f
}

func CnInfiltration(rainfall, cn float64) float64 {
    if cn <= 0.0 || cn >= 100.0 {
        return 0.0
    }

    s := (1000.0 / cn) - 10.0
    ia := 0.2 * s

    if rainfall <= ia {
        return rainfall
    }

    pe := math.Pow(rainfall-ia, 2) / (rainfall - ia + s)
    return rainfall - pe
}`,
  },
  "lid.c — LID/Green Infrastructure": {
    category: "Hydrology",
    difficulty: "intermediate",
    tags: ["lid", "green infrastructure", "bmp", "bioretention", "rain garden", "permeable pavement", "swale", "low impact development", "stormwater control"],
    description: "Models Low Impact Development (LID) controls that mimic natural hydrology. Implements bioretention cells (rain gardens), permeable pavement, infiltration trenches, and vegetated swales. Each LID has layers (surface, soil, storage, drain) with vertical water movement between them. LID controls reduce runoff volume and peak flows by capturing, storing, and infiltrating stormwater — a growing focus in modern stormwater management.",
    equations: "f_soil = Ks * (1 + psi*deficit/F) (soil infiltration); Q_drain = C * h^n (underdrain flow); Q_surf = W*S^0.5/n * d^(5/3) (surface overflow)",
    inputs: "LID type, surface/soil/storage layer properties, underdrain coefficient, subcatchment area fraction",
    outputs: "Surface runoff reduction, infiltration to native soil, drain outflow, stored volume",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "PySWMM Wrapper", url: "https://github.com/pyswmm/pyswmm" },
    ],
    c: `// lid.c — LID/Green Infrastructure Controls
// EPA SWMM5 Engine — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

#include <math.h>

enum TLidType {
    BIO_CELL,       // bioretention cell / rain garden
    PERM_PAVE,      // permeable pavement
    INFIL_TRENCH,   // infiltration trench
    VEG_SWALE       // vegetated swale
};

typedef struct {
    double depth;        // layer depth (ft)
    double voidFrac;     // void fraction (porosity)
    double conductivity; // hydraulic conductivity (ft/s)
} TLidLayer;

typedef struct {
    enum TLidType type;
    TLidLayer surface;   // surface layer
    TLidLayer soil;      // soil layer
    TLidLayer storage;   // gravel storage layer
    double    drainCoeff;// underdrain coefficient
    double    drainExp;  // underdrain exponent
} TLidUnit;

double lid_getSoilPerc(TLidUnit* lid, double soilMoist,
                       double storageDepth)
{
    // Green-Ampt style percolation from soil to storage
    double deficit, maxStorage, perc;

    deficit = lid->soil.voidFrac - soilMoist;
    if (deficit <= 0.0) return 0.0;

    maxStorage = lid->storage.depth * lid->storage.voidFrac;
    if (storageDepth >= maxStorage) return 0.0;

    perc = lid->soil.conductivity *
           (1.0 + lid->soil.depth * deficit / (soilMoist + 0.001));
    return perc;
}

double lid_getDrainFlow(TLidUnit* lid, double storageDepth)
{
    // Power-law underdrain discharge: Q = C * h^n
    if (lid->drainCoeff <= 0.0) return 0.0;
    if (storageDepth <= 0.0)    return 0.0;

    return lid->drainCoeff * pow(storageDepth, lid->drainExp);
}

double lid_getRunoff(TLidUnit* lid, double rainfall,
                     double surfDepth, double soilMoist,
                     double storageDepth, double dt)
{
    // Overall LID water balance:
    // route through surface -> soil -> storage -> drain
    double soilPerc, drainFlow, overflow;
    double surfInflow, surfCapacity;

    // Percolation from soil to storage
    soilPerc = lid_getSoilPerc(lid, soilMoist, storageDepth);

    // Underdrain outflow from storage
    drainFlow = lid_getDrainFlow(lid, storageDepth);

    // Surface inflow = rainfall minus what soil absorbs
    surfInflow = rainfall - soilPerc;
    if (surfInflow < 0.0) surfInflow = 0.0;

    // Surface overflow (Manning's): Q = W*S^0.5/n * d^(5/3)
    surfCapacity = lid->surface.depth * lid->surface.voidFrac;
    overflow = surfDepth + surfInflow * dt - surfCapacity;
    if (overflow < 0.0) overflow = 0.0;

    return overflow;
}`,
    rust: `// lid.rs — LID/Green Infrastructure Controls
// SWMM5 Engine in Rust — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

#[derive(Clone, Debug, PartialEq)]
pub enum LidType {
    BioCell,       // bioretention cell / rain garden
    PermPave,      // permeable pavement
    InfilTrench,   // infiltration trench
    VegSwale,      // vegetated swale
}

#[derive(Clone, Debug)]
pub struct LidLayer {
    pub depth: f64,        // layer depth (ft)
    pub void_frac: f64,    // void fraction (porosity)
    pub conductivity: f64, // hydraulic conductivity (ft/s)
}

#[derive(Clone, Debug)]
pub struct LidUnit {
    pub lid_type: LidType,
    pub surface: LidLayer,   // surface layer
    pub soil: LidLayer,      // soil layer
    pub storage: LidLayer,   // gravel storage layer
    pub drain_coeff: f64,    // underdrain coefficient
    pub drain_exp: f64,      // underdrain exponent
}

impl LidUnit {
    /// Green-Ampt style percolation from soil to storage
    pub fn get_soil_perc(&self, soil_moist: f64,
                         storage_depth: f64) -> f64 {
        let deficit = self.soil.void_frac - soil_moist;
        if deficit <= 0.0 { return 0.0; }

        let max_storage = self.storage.depth
                          * self.storage.void_frac;
        if storage_depth >= max_storage { return 0.0; }

        self.soil.conductivity
            * (1.0 + self.soil.depth * deficit
               / (soil_moist + 0.001))
    }

    /// Power-law underdrain discharge: Q = C * h^n
    pub fn get_drain_flow(&self, storage_depth: f64) -> f64 {
        if self.drain_coeff <= 0.0 { return 0.0; }
        if storage_depth <= 0.0 { return 0.0; }

        self.drain_coeff * storage_depth.powf(self.drain_exp)
    }

    /// Overall LID water balance:
    /// route through surface -> soil -> storage -> drain
    pub fn get_runoff(&self, rainfall: f64, surf_depth: f64,
                      soil_moist: f64, storage_depth: f64,
                      dt: f64) -> f64 {
        let soil_perc = self.get_soil_perc(
            soil_moist, storage_depth);

        let surf_inflow = (rainfall - soil_perc).max(0.0);

        let surf_capacity = self.surface.depth
                            * self.surface.void_frac;
        let overflow = surf_depth + surf_inflow * dt
                       - surf_capacity;
        overflow.max(0.0)
    }
}`,
    python: `# lid.py — LID/Green Infrastructure Controls
# SWMM5 Engine in Python — Low Impact Development
# Models bioretention, permeable pavement, infiltration
# trenches, and vegetated swales with layered water balance

from dataclasses import dataclass
from enum import Enum, auto


class LidType(Enum):
    BIO_CELL = auto()      # bioretention cell / rain garden
    PERM_PAVE = auto()     # permeable pavement
    INFIL_TRENCH = auto()  # infiltration trench
    VEG_SWALE = auto()     # vegetated swale


@dataclass
class LidLayer:
    depth: float        # layer depth (ft)
    void_frac: float    # void fraction (porosity)
    conductivity: float # hydraulic conductivity (ft/s)


@dataclass
class LidUnit:
    lid_type: LidType
    surface: LidLayer    # surface layer
    soil: LidLayer       # soil layer
    storage: LidLayer    # gravel storage layer
    drain_coeff: float   # underdrain coefficient
    drain_exp: float     # underdrain exponent

    def get_soil_perc(self, soil_moist: float,
                      storage_depth: float) -> float:
        """Green-Ampt style percolation from soil to storage."""
        deficit = self.soil.void_frac - soil_moist
        if deficit <= 0.0:
            return 0.0

        max_storage = self.storage.depth * self.storage.void_frac
        if storage_depth >= max_storage:
            return 0.0

        return self.soil.conductivity * (
            1.0 + self.soil.depth * deficit
            / (soil_moist + 0.001))

    def get_drain_flow(self, storage_depth: float) -> float:
        """Power-law underdrain discharge: Q = C * h^n."""
        if self.drain_coeff <= 0.0:
            return 0.0
        if storage_depth <= 0.0:
            return 0.0
        return self.drain_coeff * storage_depth ** self.drain_exp

    def get_runoff(self, rainfall: float, surf_depth: float,
                   soil_moist: float, storage_depth: float,
                   dt: float) -> float:
        """Overall LID water balance: surface -> soil -> storage -> drain."""
        soil_perc = self.get_soil_perc(soil_moist, storage_depth)

        surf_inflow = max(rainfall - soil_perc, 0.0)

        surf_capacity = self.surface.depth * self.surface.void_frac
        overflow = surf_depth + surf_inflow * dt - surf_capacity
        return max(overflow, 0.0)`,
    fortran: `! lid.f90 — LID/Green Infrastructure Controls
! SWMM5 Engine in Fortran — Low Impact Development
! Models bioretention, permeable pavement, infiltration
! trenches, and vegetated swales with layered water balance

module lid_module
    implicit none

    integer, parameter :: BIO_CELL = 1, PERM_PAVE = 2
    integer, parameter :: INFIL_TRENCH = 3, VEG_SWALE = 4

    type :: LidLayer
        real(8) :: depth        ! layer depth (ft)
        real(8) :: void_frac    ! void fraction (porosity)
        real(8) :: conductivity ! hydraulic conductivity (ft/s)
    end type LidLayer

    type :: LidUnit
        integer  :: lid_type
        type(LidLayer) :: surface   ! surface layer
        type(LidLayer) :: soil      ! soil layer
        type(LidLayer) :: storage   ! gravel storage layer
        real(8) :: drain_coeff      ! underdrain coefficient
        real(8) :: drain_exp        ! underdrain exponent
    end type LidUnit

contains

    function lid_get_soil_perc(lid, soil_moist, &
                               storage_depth) result(perc)
        ! Green-Ampt style percolation from soil to storage
        type(LidUnit), intent(in) :: lid
        real(8), intent(in) :: soil_moist, storage_depth
        real(8) :: perc, deficit, max_storage

        deficit = lid%soil%void_frac - soil_moist
        if (deficit <= 0.0d0) then
            perc = 0.0d0
            return
        end if

        max_storage = lid%storage%depth * lid%storage%void_frac
        if (storage_depth >= max_storage) then
            perc = 0.0d0
            return
        end if

        perc = lid%soil%conductivity * &
               (1.0d0 + lid%soil%depth * deficit &
                / (soil_moist + 0.001d0))
    end function lid_get_soil_perc

    function lid_get_drain_flow(lid, storage_depth) result(flow)
        ! Power-law underdrain discharge: Q = C * h^n
        type(LidUnit), intent(in) :: lid
        real(8), intent(in) :: storage_depth
        real(8) :: flow

        if (lid%drain_coeff <= 0.0d0) then
            flow = 0.0d0
            return
        end if
        if (storage_depth <= 0.0d0) then
            flow = 0.0d0
            return
        end if

        flow = lid%drain_coeff * storage_depth**lid%drain_exp
    end function lid_get_drain_flow

    function lid_get_runoff(lid, rainfall, surf_depth, &
                            soil_moist, storage_depth, &
                            dt) result(overflow)
        ! Overall LID water balance:
        ! route through surface -> soil -> storage -> drain
        type(LidUnit), intent(in) :: lid
        real(8), intent(in) :: rainfall, surf_depth
        real(8), intent(in) :: soil_moist, storage_depth, dt
        real(8) :: overflow, soil_perc, surf_inflow
        real(8) :: surf_capacity

        soil_perc = lid_get_soil_perc(lid, soil_moist, &
                                      storage_depth)

        surf_inflow = rainfall - soil_perc
        if (surf_inflow < 0.0d0) surf_inflow = 0.0d0

        surf_capacity = lid%surface%depth * lid%surface%void_frac
        overflow = surf_depth + surf_inflow * dt - surf_capacity
        if (overflow < 0.0d0) overflow = 0.0d0
    end function lid_get_runoff

end module lid_module`,
    julia: `# lid.jl — LID/Green Infrastructure Controls
# SWMM5 Engine in Julia — Low Impact Development
# Models bioretention, permeable pavement, infiltration
# trenches, and vegetated swales with layered water balance

@enum LidType BIO_CELL PERM_PAVE INFIL_TRENCH VEG_SWALE

struct LidLayer
    depth::Float64        # layer depth (ft)
    void_frac::Float64    # void fraction (porosity)
    conductivity::Float64 # hydraulic conductivity (ft/s)
end

struct LidUnit
    lid_type::LidType
    surface::LidLayer     # surface layer
    soil::LidLayer        # soil layer
    storage::LidLayer     # gravel storage layer
    drain_coeff::Float64  # underdrain coefficient
    drain_exp::Float64    # underdrain exponent
end

function get_soil_perc(lid::LidUnit, soil_moist::Float64,
                       storage_depth::Float64)::Float64
    """Green-Ampt style percolation from soil to storage."""
    deficit = lid.soil.void_frac - soil_moist
    deficit ≤ 0.0 && return 0.0

    max_storage = lid.storage.depth * lid.storage.void_frac
    storage_depth ≥ max_storage && return 0.0

    return lid.soil.conductivity *
           (1.0 + lid.soil.depth * deficit
            / (soil_moist + 0.001))
end

function get_drain_flow(lid::LidUnit,
                        storage_depth::Float64)::Float64
    """Power-law underdrain discharge: Q = C * h^n."""
    lid.drain_coeff ≤ 0.0 && return 0.0
    storage_depth ≤ 0.0 && return 0.0
    return lid.drain_coeff * storage_depth^lid.drain_exp
end

function get_runoff(lid::LidUnit, rainfall::Float64,
                    surf_depth::Float64, soil_moist::Float64,
                    storage_depth::Float64,
                    dt::Float64)::Float64
    """Overall LID water balance: surface → soil → storage → drain."""
    soil_perc = get_soil_perc(lid, soil_moist, storage_depth)

    surf_inflow = max(rainfall - soil_perc, 0.0)

    surf_capacity = lid.surface.depth * lid.surface.void_frac
    overflow = surf_depth + surf_inflow * dt - surf_capacity
    return max(overflow, 0.0)
end`,
    javascript: `// lid.js — LID/Green Infrastructure Controls
// SWMM5 Engine in JavaScript — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

const LidType = Object.freeze({
    BIO_CELL: 0,
    PERM_PAVE: 1,
    INFIL_TRENCH: 2,
    VEG_SWALE: 3,
});

class LidLayer {
    constructor(depth, voidFrac, conductivity) {
        this.depth = depth;            // layer depth (ft)
        this.voidFrac = voidFrac;      // void fraction (porosity)
        this.conductivity = conductivity; // hydraulic conductivity
    }
}

class LidUnit {
    constructor(lidType, surface, soil, storage,
                drainCoeff, drainExp) {
        this.lidType = lidType;
        this.surface = surface;     // surface layer
        this.soil = soil;           // soil layer
        this.storage = storage;     // gravel storage layer
        this.drainCoeff = drainCoeff;
        this.drainExp = drainExp;
    }

    /** Green-Ampt style percolation from soil to storage */
    getSoilPerc(soilMoist, storageDepth) {
        const deficit = this.soil.voidFrac - soilMoist;
        if (deficit <= 0.0) return 0.0;

        const maxStorage = this.storage.depth
                           * this.storage.voidFrac;
        if (storageDepth >= maxStorage) return 0.0;

        return this.soil.conductivity *
               (1.0 + this.soil.depth * deficit
                / (soilMoist + 0.001));
    }

    /** Power-law underdrain discharge: Q = C * h^n */
    getDrainFlow(storageDepth) {
        if (this.drainCoeff <= 0.0) return 0.0;
        if (storageDepth <= 0.0) return 0.0;

        return this.drainCoeff
               * Math.pow(storageDepth, this.drainExp);
    }

    /** Overall LID water balance:
     *  route through surface -> soil -> storage -> drain */
    getRunoff(rainfall, surfDepth, soilMoist,
              storageDepth, dt) {
        const soilPerc = this.getSoilPerc(
            soilMoist, storageDepth);

        const surfInflow = Math.max(rainfall - soilPerc, 0.0);

        const surfCapacity = this.surface.depth
                             * this.surface.voidFrac;
        const overflow = surfDepth + surfInflow * dt
                         - surfCapacity;
        return Math.max(overflow, 0.0);
    }
}

export { LidType, LidLayer, LidUnit };`,
    go: `// lid.go — LID/Green Infrastructure Controls
// SWMM5 Engine in Go — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

package swmm

import "math"

// LidType represents the type of LID control
type LidType int

const (
        BioCell    LidType = iota // bioretention cell / rain garden
        PermPave                  // permeable pavement
        InfilTrench               // infiltration trench
        VegSwale                  // vegetated swale
)

// LidLayer represents a single layer in an LID unit
type LidLayer struct {
        Depth        float64 // layer depth (ft)
        VoidFrac     float64 // void fraction (porosity)
        Conductivity float64 // hydraulic conductivity (ft/s)
}

// LidUnit represents a complete LID control with layers
type LidUnit struct {
        Type       LidType
        Surface    LidLayer // surface layer
        Soil       LidLayer // soil layer
        Storage    LidLayer // gravel storage layer
        DrainCoeff float64  // underdrain coefficient
        DrainExp   float64  // underdrain exponent
}

// GetSoilPerc computes Green-Ampt percolation from soil to storage
func (lid *LidUnit) GetSoilPerc(soilMoist, storageDepth float64) float64 {
        deficit := lid.Soil.VoidFrac - soilMoist
        if deficit <= 0.0 {
                return 0.0
        }

        maxStorage := lid.Storage.Depth * lid.Storage.VoidFrac
        if storageDepth >= maxStorage {
                return 0.0
        }

        return lid.Soil.Conductivity *
                (1.0 + lid.Soil.Depth*deficit/(soilMoist+0.001))
}

// GetDrainFlow computes power-law underdrain discharge: Q = C * h^n
func (lid *LidUnit) GetDrainFlow(storageDepth float64) float64 {
        if lid.DrainCoeff <= 0.0 {
                return 0.0
        }
        if storageDepth <= 0.0 {
                return 0.0
        }
        return lid.DrainCoeff * math.Pow(storageDepth, lid.DrainExp)
}

// GetRunoff computes overall LID water balance:
// route through surface -> soil -> storage -> drain
func (lid *LidUnit) GetRunoff(rainfall, surfDepth, soilMoist,
        storageDepth, dt float64) float64 {

        soilPerc := lid.GetSoilPerc(soilMoist, storageDepth)

        surfInflow := rainfall - soilPerc
        if surfInflow < 0.0 {
                surfInflow = 0.0
        }

        surfCapacity := lid.Surface.Depth * lid.Surface.VoidFrac
        overflow := surfDepth + surfInflow*dt - surfCapacity
        if overflow < 0.0 {
                overflow = 0.0
        }
        return overflow
}`,
  },
  "link.c — Conduit Hydraulics": {
    category: "Hydraulics",
    difficulty: "intermediate",
    tags: ["conduit", "pipe", "manning", "hydraulic radius", "cross section", "circular", "normal depth", "critical depth", "link"],
    description: "Computes the hydraulic properties of conduits (pipes, channels) that carry flow between nodes. For circular pipes, calculates the cross-sectional area, wetted perimeter, hydraulic radius, and top width as functions of flow depth — these geometric relationships are essential for Manning's equation. Also computes normal depth (equilibrium depth for given flow) and critical depth (minimum energy depth) which define flow regimes.",
    equations: "A = r²(theta - sin(theta))/2 (circular); R = A/P; Q = (1/n)*A*R^(2/3)*S^(1/2) (Manning's); y_c = (Q²/(g*T))^(1/3) (critical depth)",
    inputs: "Pipe diameter/geometry, Manning's roughness, slope, flow rate",
    outputs: "Flow area, wetted perimeter, hydraulic radius, top width, normal depth, critical depth",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// link.c — Conduit Hydraulics (Circular Cross Section)
// EPA SWMM5 Engine — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

#include <math.h>

#define GRAVITY 32.174   // ft/s²
#define MAX_ITER 50
#define TOLERANCE 1.0e-6

typedef struct {
    int    type;     // cross-section type (0 = circular)
    double yFull;    // full depth = diameter (ft)
    double aFull;    // full area (ft²)
    double rFull;    // full hydraulic radius (ft)
    double wMax;     // maximum top width (ft)
} TXsect;

double xsect_getArea(TXsect* xs, double depth)
{
    // Circular pipe area from depth using central angle
    double r, yNorm, theta;

    r = xs->yFull / 2.0;
    yNorm = depth / xs->yFull;
    if (yNorm <= 0.0) return 0.0;
    if (yNorm >= 1.0) return xs->aFull;

    theta = 2.0 * acos(1.0 - 2.0 * yNorm);
    return r * r * (theta - sin(theta)) / 2.0;
}

double xsect_getHydRadius(TXsect* xs, double depth)
{
    // Hydraulic radius R = A / P (wetted perimeter)
    double r, yNorm, theta, area, perim;

    r = xs->yFull / 2.0;
    yNorm = depth / xs->yFull;
    if (yNorm <= 0.0) return 0.0;
    if (yNorm >= 1.0) return xs->rFull;

    theta = 2.0 * acos(1.0 - 2.0 * yNorm);
    area  = r * r * (theta - sin(theta)) / 2.0;
    perim = r * theta;
    if (perim <= 0.0) return 0.0;

    return area / perim;
}

double xsect_getNormalDepth(TXsect* xs, double nManning,
                            double slope, double qTarget)
{
    // Iterative: find depth where Manning's Q matches target
    // Q = (1/n) * A * R^(2/3) * S^(1/2)
    double yLo, yHi, yMid, area, hydRad, qCalc;
    int i;

    if (qTarget <= 0.0 || slope <= 0.0) return 0.0;

    yLo = 0.0;
    yHi = xs->yFull;

    for (i = 0; i < MAX_ITER; i++)
    {
        yMid = (yLo + yHi) / 2.0;
        area   = xsect_getArea(xs, yMid);
        hydRad = xsect_getHydRadius(xs, yMid);
        qCalc  = (1.0 / nManning) * area
                 * pow(hydRad, 2.0/3.0) * sqrt(slope);

        if (fabs(qCalc - qTarget) < TOLERANCE) break;
        if (qCalc < qTarget) yLo = yMid;
        else                 yHi = yMid;
    }
    return (yLo + yHi) / 2.0;
}

double xsect_getCriticalDepth(TXsect* xs, double qTarget)
{
    // Iterative: find depth where Froude = 1
    // A³ / T = Q² / g
    double yLo, yHi, yMid, area, r, yNorm, theta;
    double topW, lhs, rhs;
    int i;

    if (qTarget <= 0.0) return 0.0;

    rhs = (qTarget * qTarget) / GRAVITY;
    yLo = 0.0;
    yHi = xs->yFull;

    for (i = 0; i < MAX_ITER; i++)
    {
        yMid  = (yLo + yHi) / 2.0;
        r     = xs->yFull / 2.0;
        yNorm = yMid / xs->yFull;
        if (yNorm <= 0.0) { yLo = yMid; continue; }
        if (yNorm >= 1.0) { yHi = yMid; continue; }

        theta = 2.0 * acos(1.0 - 2.0 * yNorm);
        area  = r * r * (theta - sin(theta)) / 2.0;
        topW  = 2.0 * r * sin(theta / 2.0);

        if (topW <= 0.0) { yLo = yMid; continue; }
        lhs = (area * area * area) / topW;

        if (fabs(lhs - rhs) < TOLERANCE) break;
        if (lhs < rhs) yLo = yMid;
        else           yHi = yMid;
    }
    return (yLo + yHi) / 2.0;
}`,
    rust: `// link.rs — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in Rust — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

const GRAVITY: f64 = 32.174;   // ft/s²
const MAX_ITER: usize = 50;
const TOLERANCE: f64 = 1.0e-6;

#[derive(Clone, Debug)]
pub struct Xsect {
    pub y_full: f64,  // full depth = diameter (ft)
    pub a_full: f64,  // full area (ft²)
    pub r_full: f64,  // full hydraulic radius (ft)
    pub w_max: f64,   // maximum top width (ft)
}

impl Xsect {
    /// Circular pipe area from depth using central angle
    pub fn get_area(&self, depth: f64) -> f64 {
        let r = self.y_full / 2.0;
        let y_norm = depth / self.y_full;
        if y_norm <= 0.0 { return 0.0; }
        if y_norm >= 1.0 { return self.a_full; }

        let theta = 2.0 * (1.0 - 2.0 * y_norm).acos();
        r * r * (theta - theta.sin()) / 2.0
    }

    /// Hydraulic radius R = A / P
    pub fn get_hyd_radius(&self, depth: f64) -> f64 {
        let r = self.y_full / 2.0;
        let y_norm = depth / self.y_full;
        if y_norm <= 0.0 { return 0.0; }
        if y_norm >= 1.0 { return self.r_full; }

        let theta = 2.0 * (1.0 - 2.0 * y_norm).acos();
        let area = r * r * (theta - theta.sin()) / 2.0;
        let perim = r * theta;
        if perim <= 0.0 { return 0.0; }

        area / perim
    }

    /// Find depth where Manning's Q matches target
    pub fn get_normal_depth(&self, n_manning: f64,
                            slope: f64, q_target: f64) -> f64 {
        if q_target <= 0.0 || slope <= 0.0 { return 0.0; }

        let mut y_lo = 0.0_f64;
        let mut y_hi = self.y_full;

        for _ in 0..MAX_ITER {
            let y_mid = (y_lo + y_hi) / 2.0;
            let area = self.get_area(y_mid);
            let hyd_rad = self.get_hyd_radius(y_mid);
            let q_calc = (1.0 / n_manning) * area
                         * hyd_rad.powf(2.0 / 3.0)
                         * slope.sqrt();

            if (q_calc - q_target).abs() < TOLERANCE { break; }
            if q_calc < q_target { y_lo = y_mid; }
            else                 { y_hi = y_mid; }
        }
        (y_lo + y_hi) / 2.0
    }

    /// Find depth where Froude = 1 (critical depth)
    pub fn get_critical_depth(&self, q_target: f64) -> f64 {
        if q_target <= 0.0 { return 0.0; }

        let rhs = (q_target * q_target) / GRAVITY;
        let mut y_lo = 0.0_f64;
        let mut y_hi = self.y_full;

        for _ in 0..MAX_ITER {
            let y_mid = (y_lo + y_hi) / 2.0;
            let r = self.y_full / 2.0;
            let y_norm = y_mid / self.y_full;
            if y_norm <= 0.0 { y_lo = y_mid; continue; }
            if y_norm >= 1.0 { y_hi = y_mid; continue; }

            let theta = 2.0 * (1.0 - 2.0 * y_norm).acos();
            let area = r * r * (theta - theta.sin()) / 2.0;
            let top_w = 2.0 * r * (theta / 2.0).sin();

            if top_w <= 0.0 { y_lo = y_mid; continue; }
            let lhs = area.powi(3) / top_w;

            if (lhs - rhs).abs() < TOLERANCE { break; }
            if lhs < rhs { y_lo = y_mid; }
            else         { y_hi = y_mid; }
        }
        (y_lo + y_hi) / 2.0
    }
}`,
    python: `# link.py — Conduit Hydraulics (Circular Cross Section)
# SWMM5 Engine in Python — Pipe Geometry & Manning's Equation
# Computes area, hydraulic radius, normal depth, and
# critical depth for circular conduits

import math
from dataclasses import dataclass

GRAVITY = 32.174    # ft/s²
MAX_ITER = 50
TOLERANCE = 1.0e-6


@dataclass
class Xsect:
    y_full: float   # full depth = diameter (ft)
    a_full: float   # full area (ft²)
    r_full: float   # full hydraulic radius (ft)
    w_max: float    # maximum top width (ft)

    def get_area(self, depth: float) -> float:
        """Circular pipe area from depth using central angle."""
        r = self.y_full / 2.0
        y_norm = depth / self.y_full
        if y_norm <= 0.0:
            return 0.0
        if y_norm >= 1.0:
            return self.a_full

        theta = 2.0 * math.acos(1.0 - 2.0 * y_norm)
        return r * r * (theta - math.sin(theta)) / 2.0

    def get_hyd_radius(self, depth: float) -> float:
        """Hydraulic radius R = A / P."""
        r = self.y_full / 2.0
        y_norm = depth / self.y_full
        if y_norm <= 0.0:
            return 0.0
        if y_norm >= 1.0:
            return self.r_full

        theta = 2.0 * math.acos(1.0 - 2.0 * y_norm)
        area = r * r * (theta - math.sin(theta)) / 2.0
        perim = r * theta
        if perim <= 0.0:
            return 0.0
        return area / perim

    def get_normal_depth(self, n_manning: float,
                         slope: float,
                         q_target: float) -> float:
        """Find depth where Manning's Q matches target."""
        if q_target <= 0.0 or slope <= 0.0:
            return 0.0

        y_lo, y_hi = 0.0, self.y_full

        for _ in range(MAX_ITER):
            y_mid = (y_lo + y_hi) / 2.0
            area = self.get_area(y_mid)
            hyd_rad = self.get_hyd_radius(y_mid)
            q_calc = ((1.0 / n_manning) * area
                      * hyd_rad ** (2.0 / 3.0)
                      * math.sqrt(slope))

            if abs(q_calc - q_target) < TOLERANCE:
                break
            if q_calc < q_target:
                y_lo = y_mid
            else:
                y_hi = y_mid

        return (y_lo + y_hi) / 2.0

    def get_critical_depth(self, q_target: float) -> float:
        """Find depth where Froude = 1 (critical depth)."""
        if q_target <= 0.0:
            return 0.0

        rhs = (q_target * q_target) / GRAVITY
        y_lo, y_hi = 0.0, self.y_full

        for _ in range(MAX_ITER):
            y_mid = (y_lo + y_hi) / 2.0
            r = self.y_full / 2.0
            y_norm = y_mid / self.y_full
            if y_norm <= 0.0:
                y_lo = y_mid
                continue
            if y_norm >= 1.0:
                y_hi = y_mid
                continue

            theta = 2.0 * math.acos(1.0 - 2.0 * y_norm)
            area = r * r * (theta - math.sin(theta)) / 2.0
            top_w = 2.0 * r * math.sin(theta / 2.0)

            if top_w <= 0.0:
                y_lo = y_mid
                continue
            lhs = area ** 3 / top_w

            if abs(lhs - rhs) < TOLERANCE:
                break
            if lhs < rhs:
                y_lo = y_mid
            else:
                y_hi = y_mid

        return (y_lo + y_hi) / 2.0`,
    fortran: `! link.f90 — Conduit Hydraulics (Circular Cross Section)
! SWMM5 Engine in Fortran — Pipe Geometry & Manning's Equation
! Computes area, hydraulic radius, normal depth, and
! critical depth for circular conduits

module link_module
    implicit none

    real(8), parameter :: GRAVITY = 32.174d0   ! ft/s²
    integer, parameter :: MAX_ITER = 50
    real(8), parameter :: TOL = 1.0d-6

    type :: Xsect
        integer :: xtype     ! cross-section type (0=circular)
        real(8) :: y_full    ! full depth = diameter (ft)
        real(8) :: a_full    ! full area (ft²)
        real(8) :: r_full    ! full hydraulic radius (ft)
        real(8) :: w_max     ! maximum top width (ft)
    end type Xsect

contains

    function xsect_get_area(xs, depth) result(area)
        ! Circular pipe area from depth using central angle
        type(Xsect), intent(in) :: xs
        real(8), intent(in) :: depth
        real(8) :: area, r, y_norm, theta

        r = xs%y_full / 2.0d0
        y_norm = depth / xs%y_full
        if (y_norm <= 0.0d0) then
            area = 0.0d0
            return
        end if
        if (y_norm >= 1.0d0) then
            area = xs%a_full
            return
        end if

        theta = 2.0d0 * acos(1.0d0 - 2.0d0 * y_norm)
        area = r * r * (theta - sin(theta)) / 2.0d0
    end function xsect_get_area

    function xsect_get_hyd_radius(xs, depth) result(hyd_r)
        ! Hydraulic radius R = A / P
        type(Xsect), intent(in) :: xs
        real(8), intent(in) :: depth
        real(8) :: hyd_r, r, y_norm, theta, area, perim

        r = xs%y_full / 2.0d0
        y_norm = depth / xs%y_full
        if (y_norm <= 0.0d0) then
            hyd_r = 0.0d0
            return
        end if
        if (y_norm >= 1.0d0) then
            hyd_r = xs%r_full
            return
        end if

        theta = 2.0d0 * acos(1.0d0 - 2.0d0 * y_norm)
        area  = r * r * (theta - sin(theta)) / 2.0d0
        perim = r * theta
        if (perim <= 0.0d0) then
            hyd_r = 0.0d0
            return
        end if
        hyd_r = area / perim
    end function xsect_get_hyd_radius

    function xsect_get_normal_depth(xs, n_manning, slope, &
                                     q_target) result(depth)
        ! Find depth where Manning's Q matches target
        type(Xsect), intent(in) :: xs
        real(8), intent(in) :: n_manning, slope, q_target
        real(8) :: depth, y_lo, y_hi, y_mid
        real(8) :: area, hyd_r, q_calc
        integer :: i

        if (q_target <= 0.0d0 .or. slope <= 0.0d0) then
            depth = 0.0d0
            return
        end if

        y_lo = 0.0d0
        y_hi = xs%y_full

        do i = 1, MAX_ITER
            y_mid = (y_lo + y_hi) / 2.0d0
            area  = xsect_get_area(xs, y_mid)
            hyd_r = xsect_get_hyd_radius(xs, y_mid)
            q_calc = (1.0d0 / n_manning) * area &
                     * hyd_r**(2.0d0/3.0d0) * sqrt(slope)

            if (abs(q_calc - q_target) < TOL) exit
            if (q_calc < q_target) then
                y_lo = y_mid
            else
                y_hi = y_mid
            end if
        end do
        depth = (y_lo + y_hi) / 2.0d0
    end function xsect_get_normal_depth

    function xsect_get_critical_depth(xs, &
                                       q_target) result(depth)
        ! Find depth where Froude = 1
        type(Xsect), intent(in) :: xs
        real(8), intent(in) :: q_target
        real(8) :: depth, y_lo, y_hi, y_mid
        real(8) :: r, y_norm, theta, area, top_w
        real(8) :: lhs, rhs
        integer :: i

        if (q_target <= 0.0d0) then
            depth = 0.0d0
            return
        end if

        rhs = (q_target * q_target) / GRAVITY
        y_lo = 0.0d0
        y_hi = xs%y_full

        do i = 1, MAX_ITER
            y_mid = (y_lo + y_hi) / 2.0d0
            r = xs%y_full / 2.0d0
            y_norm = y_mid / xs%y_full
            if (y_norm <= 0.0d0) then
                y_lo = y_mid
                cycle
            end if
            if (y_norm >= 1.0d0) then
                y_hi = y_mid
                cycle
            end if

            theta = 2.0d0 * acos(1.0d0 - 2.0d0 * y_norm)
            area  = r * r * (theta - sin(theta)) / 2.0d0
            top_w = 2.0d0 * r * sin(theta / 2.0d0)

            if (top_w <= 0.0d0) then
                y_lo = y_mid
                cycle
            end if
            lhs = area**3 / top_w

            if (abs(lhs - rhs) < TOL) exit
            if (lhs < rhs) then
                y_lo = y_mid
            else
                y_hi = y_mid
            end if
        end do
        depth = (y_lo + y_hi) / 2.0d0
    end function xsect_get_critical_depth

end module link_module`,
    julia: `# link.jl — Conduit Hydraulics (Circular Cross Section)
# SWMM5 Engine in Julia — Pipe Geometry & Manning's Equation
# Computes area, hydraulic radius, normal depth, and
# critical depth for circular conduits

const GRAVITY = 32.174   # ft/s²
const MAX_ITER = 50
const TOLERANCE = 1.0e-6

struct Xsect
    y_full::Float64   # full depth = diameter (ft)
    a_full::Float64   # full area (ft²)
    r_full::Float64   # full hydraulic radius (ft)
    w_max::Float64    # maximum top width (ft)
end

function get_area(xs::Xsect, depth::Float64)::Float64
    """Circular pipe area from depth using central angle."""
    r = xs.y_full / 2.0
    y_norm = depth / xs.y_full
    y_norm ≤ 0.0 && return 0.0
    y_norm ≥ 1.0 && return xs.a_full

    θ = 2.0 * acos(1.0 - 2.0 * y_norm)
    return r * r * (θ - sin(θ)) / 2.0
end

function get_hyd_radius(xs::Xsect, depth::Float64)::Float64
    """Hydraulic radius R = A / P."""
    r = xs.y_full / 2.0
    y_norm = depth / xs.y_full
    y_norm ≤ 0.0 && return 0.0
    y_norm ≥ 1.0 && return xs.r_full

    θ = 2.0 * acos(1.0 - 2.0 * y_norm)
    area = r * r * (θ - sin(θ)) / 2.0
    perim = r * θ
    perim ≤ 0.0 && return 0.0
    return area / perim
end

function get_normal_depth(xs::Xsect, n_manning::Float64,
                          slope::Float64,
                          q_target::Float64)::Float64
    """Find depth where Manning's Q matches target."""
    (q_target ≤ 0.0 || slope ≤ 0.0) && return 0.0

    y_lo, y_hi = 0.0, xs.y_full

    for _ in 1:MAX_ITER
        y_mid = (y_lo + y_hi) / 2.0
        area = get_area(xs, y_mid)
        hyd_r = get_hyd_radius(xs, y_mid)
        q_calc = (1.0 / n_manning) * area *
                 hyd_r^(2.0/3.0) * sqrt(slope)

        abs(q_calc - q_target) < TOLERANCE && break
        if q_calc < q_target
            y_lo = y_mid
        else
            y_hi = y_mid
        end
    end
    return (y_lo + y_hi) / 2.0
end

function get_critical_depth(xs::Xsect,
                            q_target::Float64)::Float64
    """Find depth where Froude = 1 (critical depth)."""
    q_target ≤ 0.0 && return 0.0

    rhs = (q_target * q_target) / GRAVITY
    y_lo, y_hi = 0.0, xs.y_full

    for _ in 1:MAX_ITER
        y_mid = (y_lo + y_hi) / 2.0
        r = xs.y_full / 2.0
        y_norm = y_mid / xs.y_full
        if y_norm ≤ 0.0
            y_lo = y_mid; continue
        end
        if y_norm ≥ 1.0
            y_hi = y_mid; continue
        end

        θ = 2.0 * acos(1.0 - 2.0 * y_norm)
        area = r * r * (θ - sin(θ)) / 2.0
        top_w = 2.0 * r * sin(θ / 2.0)

        if top_w ≤ 0.0
            y_lo = y_mid; continue
        end
        lhs = area^3 / top_w

        abs(lhs - rhs) < TOLERANCE && break
        if lhs < rhs
            y_lo = y_mid
        else
            y_hi = y_mid
        end
    end
    return (y_lo + y_hi) / 2.0
end`,
    javascript: `// link.js — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in JavaScript — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

const GRAVITY = 32.174;    // ft/s²
const MAX_ITER = 50;
const TOLERANCE = 1.0e-6;

class Xsect {
    constructor(yFull, aFull, rFull, wMax) {
        this.yFull = yFull;  // full depth = diameter (ft)
        this.aFull = aFull;  // full area (ft²)
        this.rFull = rFull;  // full hydraulic radius (ft)
        this.wMax = wMax;    // maximum top width (ft)
    }

    /** Circular pipe area from depth using central angle */
    getArea(depth) {
        const r = this.yFull / 2.0;
        const yNorm = depth / this.yFull;
        if (yNorm <= 0.0) return 0.0;
        if (yNorm >= 1.0) return this.aFull;

        const theta = 2.0 * Math.acos(1.0 - 2.0 * yNorm);
        return r * r * (theta - Math.sin(theta)) / 2.0;
    }

    /** Hydraulic radius R = A / P */
    getHydRadius(depth) {
        const r = this.yFull / 2.0;
        const yNorm = depth / this.yFull;
        if (yNorm <= 0.0) return 0.0;
        if (yNorm >= 1.0) return this.rFull;

        const theta = 2.0 * Math.acos(1.0 - 2.0 * yNorm);
        const area = r * r * (theta - Math.sin(theta)) / 2.0;
        const perim = r * theta;
        if (perim <= 0.0) return 0.0;

        return area / perim;
    }

    /** Find depth where Manning's Q matches target */
    getNormalDepth(nManning, slope, qTarget) {
        if (qTarget <= 0.0 || slope <= 0.0) return 0.0;

        let yLo = 0.0;
        let yHi = this.yFull;

        for (let i = 0; i < MAX_ITER; i++) {
            const yMid = (yLo + yHi) / 2.0;
            const area = this.getArea(yMid);
            const hydRad = this.getHydRadius(yMid);
            const qCalc = (1.0 / nManning) * area
                * Math.pow(hydRad, 2.0 / 3.0)
                * Math.sqrt(slope);

            if (Math.abs(qCalc - qTarget) < TOLERANCE) break;
            if (qCalc < qTarget) yLo = yMid;
            else                 yHi = yMid;
        }
        return (yLo + yHi) / 2.0;
    }

    /** Find depth where Froude = 1 (critical depth) */
    getCriticalDepth(qTarget) {
        if (qTarget <= 0.0) return 0.0;

        const rhs = (qTarget * qTarget) / GRAVITY;
        let yLo = 0.0;
        let yHi = this.yFull;

        for (let i = 0; i < MAX_ITER; i++) {
            const yMid = (yLo + yHi) / 2.0;
            const r = this.yFull / 2.0;
            const yNorm = yMid / this.yFull;
            if (yNorm <= 0.0) { yLo = yMid; continue; }
            if (yNorm >= 1.0) { yHi = yMid; continue; }

            const theta = 2.0 * Math.acos(1.0 - 2.0 * yNorm);
            const area = r * r
                * (theta - Math.sin(theta)) / 2.0;
            const topW = 2.0 * r * Math.sin(theta / 2.0);

            if (topW <= 0.0) { yLo = yMid; continue; }
            const lhs = Math.pow(area, 3) / topW;

            if (Math.abs(lhs - rhs) < TOLERANCE) break;
            if (lhs < rhs) yLo = yMid;
            else            yHi = yMid;
        }
        return (yLo + yHi) / 2.0;
    }
}

export { Xsect };`,
    go: `// link.go — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in Go — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

package swmm

import "math"

const (
        Gravity   = 32.174  // ft/s²
        MaxIter   = 50
        Tolerance = 1.0e-6
)

// Xsect represents a circular pipe cross section
type Xsect struct {
        YFull float64 // full depth = diameter (ft)
        AFull float64 // full area (ft²)
        RFull float64 // full hydraulic radius (ft)
        WMax  float64 // maximum top width (ft)
}

// GetArea returns circular pipe area from depth
func (xs *Xsect) GetArea(depth float64) float64 {
        r := xs.YFull / 2.0
        yNorm := depth / xs.YFull
        if yNorm <= 0.0 {
                return 0.0
        }
        if yNorm >= 1.0 {
                return xs.AFull
        }

        theta := 2.0 * math.Acos(1.0-2.0*yNorm)
        return r * r * (theta - math.Sin(theta)) / 2.0
}

// GetHydRadius returns hydraulic radius R = A / P
func (xs *Xsect) GetHydRadius(depth float64) float64 {
        r := xs.YFull / 2.0
        yNorm := depth / xs.YFull
        if yNorm <= 0.0 {
                return 0.0
        }
        if yNorm >= 1.0 {
                return xs.RFull
        }

        theta := 2.0 * math.Acos(1.0-2.0*yNorm)
        area := r * r * (theta - math.Sin(theta)) / 2.0
        perim := r * theta
        if perim <= 0.0 {
                return 0.0
        }
        return area / perim
}

// GetNormalDepth finds depth where Manning's Q matches target
func (xs *Xsect) GetNormalDepth(nManning, slope,
        qTarget float64) float64 {

        if qTarget <= 0.0 || slope <= 0.0 {
                return 0.0
        }

        yLo := 0.0
        yHi := xs.YFull

        for i := 0; i < MaxIter; i++ {
                yMid := (yLo + yHi) / 2.0
                area := xs.GetArea(yMid)
                hydRad := xs.GetHydRadius(yMid)
                qCalc := (1.0 / nManning) * area *
                        math.Pow(hydRad, 2.0/3.0) * math.Sqrt(slope)

                if math.Abs(qCalc-qTarget) < Tolerance {
                        break
                }
                if qCalc < qTarget {
                        yLo = yMid
                } else {
                        yHi = yMid
                }
        }
        return (yLo + yHi) / 2.0
}

// GetCriticalDepth finds depth where Froude = 1
func (xs *Xsect) GetCriticalDepth(qTarget float64) float64 {
        if qTarget <= 0.0 {
                return 0.0
        }

        rhs := (qTarget * qTarget) / Gravity
        yLo := 0.0
        yHi := xs.YFull

        for i := 0; i < MaxIter; i++ {
                yMid := (yLo + yHi) / 2.0
                r := xs.YFull / 2.0
                yNorm := yMid / xs.YFull
                if yNorm <= 0.0 {
                        yLo = yMid
                        continue
                }
                if yNorm >= 1.0 {
                        yHi = yMid
                        continue
                }

                theta := 2.0 * math.Acos(1.0-2.0*yNorm)
                area := r * r * (theta - math.Sin(theta)) / 2.0
                topW := 2.0 * r * math.Sin(theta/2.0)

                if topW <= 0.0 {
                        yLo = yMid
                        continue
                }
                lhs := math.Pow(area, 3) / topW

                if math.Abs(lhs-rhs) < Tolerance {
                        break
                }
                if lhs < rhs {
                        yLo = yMid
                } else {
                        yHi = yMid
                }
        }
        return (yLo + yHi) / 2.0
}`,
  },
  "node.c — Junction & Storage Nodes": {
    category: "Hydraulics",
    difficulty: "intermediate",
    tags: ["node", "junction", "storage", "detention", "volume balance", "water level", "overflow", "head"],
    description: "Nodes are where conduits connect in the drainage network. Junctions are simple connection points where flows combine, while storage nodes model detention ponds, tanks, and other facilities with a depth-area-volume relationship. SWMM5 updates node water levels each timestep by solving a volume balance.",
    equations: "dV/dt = ΣQ_in - ΣQ_out (volume balance); V = f(H) from storage curve; H_new = H_old + (ΣQ_in - ΣQ_out) * dt / A_surf",
    inputs: "Node invert elevation, maximum depth, inflows from conduits, storage curve (depth vs. area)",
    outputs: "Water surface elevation (head), stored volume, overflow rate",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// node.c — Junction & Storage Nodes
// EPA SWMM5 Engine — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

typedef struct {
    double invertEl;   // invert elevation (ft)
    double maxDepth;   // maximum depth (ft)
    double depth;      // current water depth (ft)
    double volume;     // current stored volume (ft³)
    double overflow;   // overflow rate (cfs)
} TNode;

typedef struct {
    double depths[10]; // depth values in storage curve
    double areas[10];  // surface area at each depth (ft²)
    int    nPts;       // number of curve points
} TStorageCurve;

double node_getVolume(TStorageCurve* sc, double depth)
{
    int i;
    double vol = 0.0;

    for (i = 1; i < sc->nPts; i++)
    {
        if (depth <= sc->depths[i])
        {
            double frac = (depth - sc->depths[i-1])
                / (sc->depths[i] - sc->depths[i-1]);
            double aAvg = sc->areas[i-1]
                + frac * (sc->areas[i] - sc->areas[i-1]);
            vol += aAvg * (depth - sc->depths[i-1]);
            return vol;
        }
        vol += 0.5 * (sc->areas[i-1] + sc->areas[i])
               * (sc->depths[i] - sc->depths[i-1]);
    }
    return vol;
}

void node_updateLevel(TNode* node, TStorageCurve* sc,
    double Qin, double Qout, double dt)
{
    double dV, aSurf;
    int i;

    dV = (Qin - Qout) * dt;
    node->volume += dV;
    if (node->volume < 0.0) node->volume = 0.0;

    for (i = 1; i < sc->nPts; i++)
    {
        double v = node_getVolume(sc, sc->depths[i]);
        if (v >= node->volume)
        {
            node->depth = sc->depths[i-1]
                + (node->volume - node_getVolume(sc,
                   sc->depths[i-1]))
                / (0.5 * (sc->areas[i-1] + sc->areas[i]));
            break;
        }
    }

    node->overflow = 0.0;
    if (node->depth > node->maxDepth)
    {
        node->overflow = (node->depth - node->maxDepth)
                         * sc->areas[sc->nPts-1] / dt;
        node->depth = node->maxDepth;
    }
}`,
    rust: `// node.rs — Junction & Storage Nodes
// SWMM5 Engine in Rust — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

pub struct Node {
    pub invert_el: f64,  // invert elevation (ft)
    pub max_depth: f64,  // maximum depth (ft)
    pub depth: f64,      // current water depth (ft)
    pub volume: f64,     // current stored volume (ft³)
    pub overflow: f64,   // overflow rate (cfs)
}

pub struct StorageCurve {
    pub depths: Vec<f64>, // depth values
    pub areas: Vec<f64>,  // surface areas at each depth
}

impl StorageCurve {
    pub fn get_volume(&self, depth: f64) -> f64 {
        let mut vol = 0.0;

        for i in 1..self.depths.len() {
            if depth <= self.depths[i] {
                let frac = (depth - self.depths[i - 1])
                    / (self.depths[i] - self.depths[i - 1]);
                let a_avg = self.areas[i - 1]
                    + frac * (self.areas[i] - self.areas[i - 1]);
                return vol + a_avg * (depth - self.depths[i - 1]);
            }
            vol += 0.5 * (self.areas[i - 1] + self.areas[i])
                   * (self.depths[i] - self.depths[i - 1]);
        }
        vol
    }
}

impl Node {
    pub fn update_level(&mut self, sc: &StorageCurve,
                        q_in: f64, q_out: f64, dt: f64) {
        let dv = (q_in - q_out) * dt;
        self.volume = (self.volume + dv).max(0.0);

        for i in 1..sc.depths.len() {
            let v = sc.get_volume(sc.depths[i]);
            if v >= self.volume {
                let v_prev = sc.get_volume(sc.depths[i - 1]);
                let a_avg = 0.5 * (sc.areas[i - 1] + sc.areas[i]);
                self.depth = sc.depths[i - 1]
                    + (self.volume - v_prev) / a_avg;
                break;
            }
        }

        self.overflow = 0.0;
        if self.depth > self.max_depth {
            let top_area = sc.areas.last().copied()
                           .unwrap_or(1.0);
            self.overflow = (self.depth - self.max_depth)
                            * top_area / dt;
            self.depth = self.max_depth;
        }
    }
}`,
    python: `# node.py — Junction & Storage Nodes
# SWMM5 Engine in Python — Node Water Level Updates
# Volume balance at junctions and storage nodes
# with depth-area relationship and overflow check

from dataclasses import dataclass, field

@dataclass
class StorageCurve:
    depths: list[float]  # depth values
    areas: list[float]   # surface areas at each depth

    def get_volume(self, depth: float) -> float:
        """Trapezoidal integration of storage curve."""
        vol = 0.0
        for i in range(1, len(self.depths)):
            if depth <= self.depths[i]:
                frac = ((depth - self.depths[i - 1])
                    / (self.depths[i] - self.depths[i - 1]))
                a_avg = (self.areas[i - 1]
                    + frac * (self.areas[i] - self.areas[i - 1]))
                return vol + a_avg * (depth - self.depths[i - 1])
            vol += (0.5 * (self.areas[i - 1] + self.areas[i])
                    * (self.depths[i] - self.depths[i - 1]))
        return vol


@dataclass
class Node:
    invert_el: float    # invert elevation (ft)
    max_depth: float    # maximum depth (ft)
    depth: float = 0.0  # current water depth (ft)
    volume: float = 0.0 # current stored volume (ft³)
    overflow: float = 0.0

    def update_level(self, sc: StorageCurve,
                     q_in: float, q_out: float,
                     dt: float) -> None:
        """Update node depth from volume balance."""
        dv = (q_in - q_out) * dt
        self.volume = max(0.0, self.volume + dv)

        for i in range(1, len(sc.depths)):
            v = sc.get_volume(sc.depths[i])
            if v >= self.volume:
                v_prev = sc.get_volume(sc.depths[i - 1])
                a_avg = 0.5 * (sc.areas[i - 1] + sc.areas[i])
                self.depth = (sc.depths[i - 1]
                    + (self.volume - v_prev) / a_avg)
                break

        self.overflow = 0.0
        if self.depth > self.max_depth:
            top_area = sc.areas[-1]
            self.overflow = ((self.depth - self.max_depth)
                             * top_area / dt)
            self.depth = self.max_depth`,
    fortran: `! node.f90 — Junction & Storage Nodes
! SWMM5 Engine in Fortran — Node Water Level Updates
! Volume balance at junctions and storage nodes
! with depth-area relationship and overflow check

module node_module
    implicit none
    integer, parameter :: MAX_PTS = 10

    type :: StorageCurve
        real(8) :: depths(MAX_PTS)
        real(8) :: areas(MAX_PTS)
        integer :: n_pts
    end type StorageCurve

    type :: Node
        real(8) :: invert_el  ! invert elevation (ft)
        real(8) :: max_depth  ! maximum depth (ft)
        real(8) :: depth      ! current water depth (ft)
        real(8) :: volume     ! current stored volume (ft³)
        real(8) :: overflow   ! overflow rate (cfs)
    end type Node

contains

    function get_volume(sc, depth) result(vol)
        type(StorageCurve), intent(in) :: sc
        real(8), intent(in) :: depth
        real(8) :: vol, frac, a_avg
        integer :: i

        vol = 0.0d0
        do i = 2, sc%n_pts
            if (depth <= sc%depths(i)) then
                frac = (depth - sc%depths(i-1)) &
                    / (sc%depths(i) - sc%depths(i-1))
                a_avg = sc%areas(i-1) + frac &
                    * (sc%areas(i) - sc%areas(i-1))
                vol = vol + a_avg &
                    * (depth - sc%depths(i-1))
                return
            end if
            vol = vol + 0.5d0 &
                * (sc%areas(i-1) + sc%areas(i)) &
                * (sc%depths(i) - sc%depths(i-1))
        end do
    end function get_volume

    subroutine update_level(nd, sc, Q_in, Q_out, dt)
        type(Node), intent(inout) :: nd
        type(StorageCurve), intent(in) :: sc
        real(8), intent(in) :: Q_in, Q_out, dt
        real(8) :: dV, v, v_prev, a_avg, top_area
        integer :: i

        dV = (Q_in - Q_out) * dt
        nd%volume = nd%volume + dV
        if (nd%volume < 0.0d0) nd%volume = 0.0d0

        do i = 2, sc%n_pts
            v = get_volume(sc, sc%depths(i))
            if (v >= nd%volume) then
                v_prev = get_volume(sc, sc%depths(i-1))
                a_avg = 0.5d0 * (sc%areas(i-1) + sc%areas(i))
                nd%depth = sc%depths(i-1) &
                    + (nd%volume - v_prev) / a_avg
                exit
            end if
        end do

        nd%overflow = 0.0d0
        if (nd%depth > nd%max_depth) then
            top_area = sc%areas(sc%n_pts)
            nd%overflow = (nd%depth - nd%max_depth) &
                          * top_area / dt
            nd%depth = nd%max_depth
        end if
    end subroutine update_level

end module node_module`,
    julia: `# node.jl — Junction & Storage Nodes
# SWMM5 Engine in Julia — Node Water Level Updates
# Volume balance at junctions and storage nodes
# with depth-area relationship and overflow check

struct StorageCurve
    depths::Vector{Float64}
    areas::Vector{Float64}
end

mutable struct Node
    invert_el::Float64  # invert elevation (ft)
    max_depth::Float64  # maximum depth (ft)
    depth::Float64      # current water depth (ft)
    volume::Float64     # current stored volume (ft³)
    overflow::Float64   # overflow rate (cfs)
end

function get_volume(sc::StorageCurve, depth::Float64)::Float64
    vol = 0.0
    for i in 2:length(sc.depths)
        if depth ≤ sc.depths[i]
            frac = (depth - sc.depths[i-1]) /
                   (sc.depths[i] - sc.depths[i-1])
            a_avg = sc.areas[i-1] +
                    frac * (sc.areas[i] - sc.areas[i-1])
            return vol + a_avg * (depth - sc.depths[i-1])
        end
        vol += 0.5 * (sc.areas[i-1] + sc.areas[i]) *
               (sc.depths[i] - sc.depths[i-1])
    end
    return vol
end

function update_level!(node::Node, sc::StorageCurve,
                       Q_in::Float64, Q_out::Float64,
                       dt::Float64)
    dV = (Q_in - Q_out) * dt
    node.volume = max(0.0, node.volume + dV)

    for i in 2:length(sc.depths)
        v = get_volume(sc, sc.depths[i])
        if v ≥ node.volume
            v_prev = get_volume(sc, sc.depths[i-1])
            a_avg = 0.5 * (sc.areas[i-1] + sc.areas[i])
            node.depth = sc.depths[i-1] +
                         (node.volume - v_prev) / a_avg
            break
        end
    end

    node.overflow = 0.0
    if node.depth > node.max_depth
        top_area = sc.areas[end]
        node.overflow = (node.depth - node.max_depth) *
                        top_area / dt
        node.depth = node.max_depth
    end
end`,
    javascript: `// node.js — Junction & Storage Nodes
// SWMM5 Engine in JavaScript — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

class StorageCurve {
    constructor(depths, areas) {
        this.depths = depths;
        this.areas = areas;
    }

    /** Trapezoidal integration of storage curve */
    getVolume(depth) {
        let vol = 0.0;
        for (let i = 1; i < this.depths.length; i++) {
            if (depth <= this.depths[i]) {
                const frac = (depth - this.depths[i - 1])
                    / (this.depths[i] - this.depths[i - 1]);
                const aAvg = this.areas[i - 1]
                    + frac * (this.areas[i] - this.areas[i - 1]);
                return vol + aAvg * (depth - this.depths[i - 1]);
            }
            vol += 0.5 * (this.areas[i - 1] + this.areas[i])
                   * (this.depths[i] - this.depths[i - 1]);
        }
        return vol;
    }
}

class JunctionNode {
    constructor(invertEl, maxDepth) {
        this.invertEl = invertEl;
        this.maxDepth = maxDepth;
        this.depth = 0.0;
        this.volume = 0.0;
        this.overflow = 0.0;
    }

    /** Update node depth from volume balance */
    updateLevel(sc, Qin, Qout, dt) {
        const dV = (Qin - Qout) * dt;
        this.volume = Math.max(0.0, this.volume + dV);

        for (let i = 1; i < sc.depths.length; i++) {
            const v = sc.getVolume(sc.depths[i]);
            if (v >= this.volume) {
                const vPrev = sc.getVolume(sc.depths[i - 1]);
                const aAvg = 0.5 * (sc.areas[i - 1]
                             + sc.areas[i]);
                this.depth = sc.depths[i - 1]
                    + (this.volume - vPrev) / aAvg;
                break;
            }
        }

        this.overflow = 0.0;
        if (this.depth > this.maxDepth) {
            const topArea = sc.areas[sc.areas.length - 1];
            this.overflow = (this.depth - this.maxDepth)
                            * topArea / dt;
            this.depth = this.maxDepth;
        }
    }
}

export { StorageCurve, JunctionNode };`,
    go: `// node.go — Junction & Storage Nodes
// SWMM5 Engine in Go — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

package swmm

type StorageCurve struct {
    Depths []float64
    Areas  []float64
}

type Node struct {
    InvertEl float64 // invert elevation (ft)
    MaxDepth float64 // maximum depth (ft)
    Depth    float64 // current water depth (ft)
    Volume   float64 // current stored volume (ft³)
    Overflow float64 // overflow rate (cfs)
}

func (sc *StorageCurve) GetVolume(depth float64) float64 {
    vol := 0.0

    for i := 1; i < len(sc.Depths); i++ {
        if depth <= sc.Depths[i] {
            frac := (depth - sc.Depths[i-1]) /
                    (sc.Depths[i] - sc.Depths[i-1])
            aAvg := sc.Areas[i-1] +
                    frac*(sc.Areas[i]-sc.Areas[i-1])
            return vol + aAvg*(depth-sc.Depths[i-1])
        }
        vol += 0.5 * (sc.Areas[i-1] + sc.Areas[i]) *
               (sc.Depths[i] - sc.Depths[i-1])
    }
    return vol
}

func (n *Node) UpdateLevel(sc *StorageCurve,
    Qin, Qout, dt float64) {

    dV := (Qin - Qout) * dt
    n.Volume += dV
    if n.Volume < 0.0 {
        n.Volume = 0.0
    }

    for i := 1; i < len(sc.Depths); i++ {
        v := sc.GetVolume(sc.Depths[i])
        if v >= n.Volume {
            vPrev := sc.GetVolume(sc.Depths[i-1])
            aAvg := 0.5 * (sc.Areas[i-1] + sc.Areas[i])
            n.Depth = sc.Depths[i-1] +
                      (n.Volume-vPrev)/aAvg
            break
        }
    }

    n.Overflow = 0.0
    if n.Depth > n.MaxDepth {
        topArea := sc.Areas[len(sc.Areas)-1]
        n.Overflow = (n.Depth - n.MaxDepth) * topArea / dt
        n.Depth = n.MaxDepth
    }
}`,
  },
  "rain.c — Rainfall Processing": {
    category: "Hydrology",
    difficulty: "accessible",
    tags: ["rainfall", "rain gage", "precipitation", "time series", "intensity", "cumulative", "hyetograph", "storm"],
    description: "Processes raw rainfall data from rain gages into the time-stepped intensities that drive all of SWMM5's hydrology. Handles different input formats (intensity, volume, cumulative depth), time interpolation between recorded values, and unit conversions. Rainfall is the fundamental forcing function — every runoff, infiltration, and routing calculation depends on getting the rain input right.",
    equations: "intensity = dP/dt (volume to intensity); P_t = P_a + (P_b - P_a) * (t - t_a)/(t_b - t_a) (interpolation)",
    inputs: "Rain gage time series, recording interval, data type (intensity/volume/cumulative), units",
    outputs: "Rainfall intensity at each simulation timestep",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "PySWMM Wrapper", url: "https://github.com/pyswmm/pyswmm" },
    ],
    c: `// rain.c — Rainfall Processing
// EPA SWMM5 Engine — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

enum TRainType { INTENSITY, VOLUME, CUMULATIVE };

typedef struct {
    enum TRainType type;     // format of rainfall data
    double interval;         // recording interval (seconds)
    double currentRate;      // current rainfall intensity (in/hr)
    double previousTotal;    // previous cumulative depth (in)
    double unitsFactor;      // conversion factor to in/hr
} TRainGage;

double rain_convertToIntensity(TRainGage* gage, double value)
{
    // Convert any rainfall format to intensity (in/hr)
    double intensity;

    switch (gage->type)
    {
        case INTENSITY:
            intensity = value * gage->unitsFactor;
            break;

        case VOLUME:
            // Volume per interval -> intensity
            if (gage->interval <= 0.0) return 0.0;
            intensity = value * gage->unitsFactor
                        * 3600.0 / gage->interval;
            break;

        case CUMULATIVE:
            // Difference from previous total -> intensity
            intensity = (value - gage->previousTotal)
                        * gage->unitsFactor
                        * 3600.0 / gage->interval;
            gage->previousTotal = value;
            if (intensity < 0.0) intensity = 0.0;
            break;

        default:
            intensity = 0.0;
    }

    return intensity;
}

double rain_interpolate(double rateA, double rateB,
                        double tA, double tB, double t)
{
    // Linear interpolation between two recorded values
    double range = tB - tA;
    if (range <= 0.0) return rateA;

    return rateA + (rateB - rateA) * (t - tA) / range;
}

double rain_getRate(TRainGage* gage, double rawValue,
                    double nextValue, double tA,
                    double tB, double t)
{
    // Main entry: convert, interpolate, return intensity
    double rateA, rateB;

    rateA = rain_convertToIntensity(gage, rawValue);
    rateB = rain_convertToIntensity(gage, nextValue);
    gage->currentRate = rain_interpolate(rateA, rateB,
                                         tA, tB, t);

    return gage->currentRate;
}`,
    rust: `// rain.rs — Rainfall Processing
// SWMM5 Engine in Rust — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

#[derive(Clone, Debug, PartialEq)]
pub enum RainType {
    Intensity,
    Volume,
    Cumulative,
}

#[derive(Clone, Debug)]
pub struct RainGage {
    pub rain_type: RainType,
    pub interval: f64,
    pub current_rate: f64,
    pub previous_total: f64,
    pub units_factor: f64,
}

impl RainGage {
    /// Convert any rainfall format to intensity (in/hr)
    pub fn convert_to_intensity(&mut self, value: f64) -> f64 {
        match self.rain_type {
            RainType::Intensity => value * self.units_factor,

            RainType::Volume => {
                if self.interval <= 0.0 { return 0.0; }
                value * self.units_factor * 3600.0
                    / self.interval
            }

            RainType::Cumulative => {
                if self.interval <= 0.0 { return 0.0; }
                let intensity =
                    (value - self.previous_total)
                    * self.units_factor * 3600.0
                    / self.interval;
                self.previous_total = value;
                intensity.max(0.0)
            }
        }
    }

    /// Main entry: convert, interpolate, return intensity
    pub fn get_rate(&mut self, raw: f64, next: f64,
                    t_a: f64, t_b: f64, t: f64) -> f64 {
        let rate_a = self.convert_to_intensity(raw);
        let rate_b = self.convert_to_intensity(next);
        self.current_rate =
            interpolate(rate_a, rate_b, t_a, t_b, t);
        self.current_rate
    }
}

/// Linear interpolation between two recorded values
pub fn interpolate(rate_a: f64, rate_b: f64,
                   t_a: f64, t_b: f64, t: f64) -> f64 {
    let range = t_b - t_a;
    if range <= 0.0 { return rate_a; }
    rate_a + (rate_b - rate_a) * (t - t_a) / range
}`,
    python: `# rain.py — Rainfall Processing
# SWMM5 Engine in Python — Rain Gage Input Handling
# Converts raw rainfall data to time-stepped intensities
# for driving all hydrologic computations

from dataclasses import dataclass
from enum import Enum, auto


class RainType(Enum):
    INTENSITY = auto()
    VOLUME = auto()
    CUMULATIVE = auto()


@dataclass
class RainGage:
    rain_type: RainType
    interval: float          # recording interval (seconds)
    current_rate: float = 0.0
    previous_total: float = 0.0
    units_factor: float = 1.0

    def convert_to_intensity(self, value: float) -> float:
        """Convert any rainfall format to intensity (in/hr)."""
        if self.rain_type == RainType.INTENSITY:
            return value * self.units_factor

        if self.rain_type == RainType.VOLUME:
            if self.interval <= 0.0:
                return 0.0
            return (value * self.units_factor
                    * 3600.0 / self.interval)

        if self.rain_type == RainType.CUMULATIVE:
            if self.interval <= 0.0:
                return 0.0
            intensity = ((value - self.previous_total)
                         * self.units_factor
                         * 3600.0 / self.interval)
            self.previous_total = value
            return max(intensity, 0.0)

        return 0.0

    def get_rate(self, raw: float, nxt: float,
                 t_a: float, t_b: float, t: float) -> float:
        """Main entry: convert, interpolate, return intensity."""
        rate_a = self.convert_to_intensity(raw)
        rate_b = self.convert_to_intensity(nxt)
        self.current_rate = interpolate(
            rate_a, rate_b, t_a, t_b, t
        )
        return self.current_rate


def interpolate(rate_a: float, rate_b: float,
                t_a: float, t_b: float, t: float) -> float:
    """Linear interpolation between two recorded values."""
    span = t_b - t_a
    if span <= 0.0:
        return rate_a
    return rate_a + (rate_b - rate_a) * (t - t_a) / span`,
    fortran: `! rain.f90 — Rainfall Processing
! SWMM5 Engine in Fortran — Rain Gage Input Handling
! Converts raw rainfall data to time-stepped intensities
! for driving all hydrologic computations

module rain_module
    implicit none

    integer, parameter :: INTENSITY_TYPE   = 1
    integer, parameter :: VOLUME_TYPE      = 2
    integer, parameter :: CUMULATIVE_TYPE  = 3

    type :: RainGage
        integer  :: rain_type        ! data format
        real(8)  :: interval         ! recording interval (s)
        real(8)  :: current_rate     ! current intensity (in/hr)
        real(8)  :: previous_total   ! previous cumul. depth
        real(8)  :: units_factor     ! conversion factor
    end type RainGage

contains

    function convert_to_intensity(gage, value) result(intensity)
        type(RainGage), intent(inout) :: gage
        real(8), intent(in) :: value
        real(8) :: intensity

        select case (gage%rain_type)
        case (INTENSITY_TYPE)
            intensity = value * gage%units_factor

        case (VOLUME_TYPE)
            if (gage%interval <= 0.0d0) then
                intensity = 0.0d0
                return
            end if
            intensity = value * gage%units_factor &
                        * 3600.0d0 / gage%interval

        case (CUMULATIVE_TYPE)
            if (gage%interval <= 0.0d0) then
                intensity = 0.0d0
                return
            end if
            intensity = (value - gage%previous_total) &
                        * gage%units_factor &
                        * 3600.0d0 / gage%interval
            gage%previous_total = value
            if (intensity < 0.0d0) intensity = 0.0d0

        case default
            intensity = 0.0d0
        end select
    end function convert_to_intensity

    function interpolate(rate_a, rate_b, t_a, t_b, t) &
             result(rate)
        real(8), intent(in) :: rate_a, rate_b
        real(8), intent(in) :: t_a, t_b, t
        real(8) :: rate, span

        span = t_b - t_a
        if (span <= 0.0d0) then
            rate = rate_a
            return
        end if
        rate = rate_a + (rate_b - rate_a) &
               * (t - t_a) / span
    end function interpolate

    function get_rate(gage, raw, nxt, t_a, t_b, t) &
             result(rate)
        type(RainGage), intent(inout) :: gage
        real(8), intent(in) :: raw, nxt, t_a, t_b, t
        real(8) :: rate, rate_a, rate_b

        rate_a = convert_to_intensity(gage, raw)
        rate_b = convert_to_intensity(gage, nxt)
        rate = interpolate(rate_a, rate_b, t_a, t_b, t)
        gage%current_rate = rate
    end function get_rate

end module rain_module`,
    julia: `# rain.jl — Rainfall Processing
# SWMM5 Engine in Julia — Rain Gage Input Handling
# Converts raw rainfall data to time-stepped intensities
# for driving all hydrologic computations

@enum RainType INTENSITY VOLUME CUMULATIVE

mutable struct RainGage
    rain_type::RainType
    interval::Float64        # recording interval (seconds)
    current_rate::Float64
    previous_total::Float64
    units_factor::Float64
end

function convert_to_intensity!(gage::RainGage,
                               value::Float64)::Float64
    if gage.rain_type == INTENSITY
        return value * gage.units_factor
    end

    if gage.rain_type == VOLUME
        gage.interval ≤ 0.0 && return 0.0
        return value * gage.units_factor *
               3600.0 / gage.interval
    end

    if gage.rain_type == CUMULATIVE
        gage.interval ≤ 0.0 && return 0.0
        intensity = (value - gage.previous_total) *
                    gage.units_factor *
                    3600.0 / gage.interval
        gage.previous_total = value
        return max(intensity, 0.0)
    end

    return 0.0
end

function interpolate(rate_a::Float64, rate_b::Float64,
                     t_a::Float64, t_b::Float64,
                     t::Float64)::Float64
    span = t_b - t_a
    span ≤ 0.0 && return rate_a
    return rate_a + (rate_b - rate_a) * (t - t_a) / span
end

function get_rate!(gage::RainGage, raw::Float64,
                   nxt::Float64, t_a::Float64,
                   t_b::Float64, t::Float64)::Float64
    rate_a = convert_to_intensity!(gage, raw)
    rate_b = convert_to_intensity!(gage, nxt)
    gage.current_rate = interpolate(rate_a, rate_b,
                                    t_a, t_b, t)
    return gage.current_rate
end`,
    javascript: `// rain.js — Rainfall Processing
// SWMM5 Engine in JavaScript — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

const RainType = Object.freeze({
    INTENSITY: 0,
    VOLUME: 1,
    CUMULATIVE: 2,
});

class RainGage {
    constructor(rainType, interval, unitsFactor = 1.0) {
        this.rainType = rainType;
        this.interval = interval;
        this.currentRate = 0.0;
        this.previousTotal = 0.0;
        this.unitsFactor = unitsFactor;
    }

    /** Convert any rainfall format to intensity (in/hr) */
    convertToIntensity(value) {
        switch (this.rainType) {
            case RainType.INTENSITY:
                return value * this.unitsFactor;

            case RainType.VOLUME:
                if (this.interval <= 0.0) return 0.0;
                return value * this.unitsFactor
                       * 3600.0 / this.interval;

            case RainType.CUMULATIVE: {
                if (this.interval <= 0.0) return 0.0;
                const intensity =
                    (value - this.previousTotal)
                    * this.unitsFactor
                    * 3600.0 / this.interval;
                this.previousTotal = value;
                return Math.max(intensity, 0.0);
            }

            default:
                return 0.0;
        }
    }

    /** Main entry: convert, interpolate, return intensity */
    getRate(raw, next, tA, tB, t) {
        const rateA = this.convertToIntensity(raw);
        const rateB = this.convertToIntensity(next);
        this.currentRate = interpolate(rateA, rateB,
                                       tA, tB, t);
        return this.currentRate;
    }
}

/** Linear interpolation between two recorded values */
function interpolate(rateA, rateB, tA, tB, t) {
    const range = tB - tA;
    if (range <= 0.0) return rateA;
    return rateA + (rateB - rateA) * (t - tA) / range;
}

export { RainType, RainGage, interpolate };`,
    go: `// rain.go — Rainfall Processing
// SWMM5 Engine in Go — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

package swmm

// RainType enumerates rainfall data formats
type RainType int

const (
        IntensityType  RainType = iota
        VolumeType
        CumulativeType
)

// RainGage holds rain gage state and parameters
type RainGage struct {
        Type          RainType
        Interval      float64 // recording interval (seconds)
        CurrentRate   float64 // current intensity (in/hr)
        PreviousTotal float64 // previous cumulative depth
        UnitsFactor   float64 // conversion factor
}

// ConvertToIntensity converts any format to intensity (in/hr)
func (g *RainGage) ConvertToIntensity(value float64) float64 {
        switch g.Type {
        case IntensityType:
                return value * g.UnitsFactor

        case VolumeType:
                if g.Interval <= 0.0 {
                        return 0.0
                }
                return value * g.UnitsFactor * 3600.0 / g.Interval

        case CumulativeType:
                if g.Interval <= 0.0 {
                        return 0.0
                }
                intensity := (value - g.PreviousTotal) *
                        g.UnitsFactor * 3600.0 / g.Interval
                g.PreviousTotal = value
                if intensity < 0.0 {
                        intensity = 0.0
                }
                return intensity

        default:
                return 0.0
        }
}

// Interpolate performs linear interpolation between values
func Interpolate(rateA, rateB, tA, tB, t float64) float64 {
        span := tB - tA
        if span <= 0.0 {
                return rateA
        }
        return rateA + (rateB-rateA)*(t-tA)/span
}

// GetRate converts, interpolates, and returns intensity
func (g *RainGage) GetRate(raw, next, tA, tB,
        t float64) float64 {
        rateA := g.ConvertToIntensity(raw)
        rateB := g.ConvertToIntensity(next)
        g.CurrentRate = Interpolate(rateA, rateB, tA, tB, t)
        return g.CurrentRate
}`,
  },
  "massbal.c — Mass Balance Checking": {
    category: "Quality Assurance",
    difficulty: "accessible",
    tags: ["mass balance", "continuity", "error check", "volume", "conservation", "quality assurance", "water balance", "verification"],
    description: "Tracks every drop of water through the entire simulation to verify conservation of mass. Accumulates total inflows (rainfall, dry weather flow, groundwater, RDII), total outflows (outfalls, evaporation, infiltration loss, exfiltration), and current storage. The continuity error — the difference between what entered and what left plus what's stored — should be near zero. A large error signals numerical instability or a bug. This is SWMM5's built-in quality check.",
    equations: "Error% = 100 * (totalInflow - totalOutflow - deltaStorage) / totalInflow; deltaStorage = finalStorage - initialStorage",
    inputs: "Running totals of all inflows, outflows, and storage volumes over the simulation",
    outputs: "Continuity error percentage for both runoff and routing",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "PySWMM Wrapper", url: "https://github.com/pyswmm/pyswmm" },
    ],
    c: `// massbal.c — Mass Balance Checking
// EPA SWMM5 Engine — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

typedef struct {
    double totalInflow;      // accumulated inflow volume
    double totalOutflow;     // accumulated outflow volume
    double initialStorage;   // storage at simulation start
    double finalStorage;     // storage at current time
    double runoffError;      // runoff continuity error (%)
    double routingError;     // routing continuity error (%)
} TMassBalance;

void massbal_init(TMassBalance* mb)
{
    mb->totalInflow    = 0.0;
    mb->totalOutflow   = 0.0;
    mb->initialStorage = 0.0;
    mb->finalStorage   = 0.0;
    mb->runoffError    = 0.0;
    mb->routingError   = 0.0;
}

void massbal_addInflow(TMassBalance* mb, double volume)
{
    // Accumulate inflow volume from any source
    mb->totalInflow += volume;
}

void massbal_addOutflow(TMassBalance* mb, double volume)
{
    // Accumulate outflow volume from any sink
    mb->totalOutflow += volume;
}

void massbal_updateStorage(TMassBalance* mb,
                           double currentStorage)
{
    // Snapshot the current stored volume
    mb->finalStorage = currentStorage;
}

double massbal_getError(double totalIn, double totalOut,
                        double storageChange)
{
    // Compute continuity error percentage
    // Error% = 100 * (In - Out - dStorage) / In
    double denom;

    denom = totalIn;
    if (denom <= 0.0)
        denom = totalOut + storageChange;
    if (denom <= 0.0) return 0.0;

    return 100.0 * (totalIn - totalOut - storageChange)
           / denom;
}

void massbal_report(TMassBalance* mb)
{
    double deltaStorage;

    deltaStorage = mb->finalStorage - mb->initialStorage;
    mb->runoffError = massbal_getError(
        mb->totalInflow, mb->totalOutflow, deltaStorage);
    mb->routingError = mb->runoffError;

    printf("\\n--- Mass Balance Report ---\\n");
    printf("Total Inflow:    %12.4f\\n", mb->totalInflow);
    printf("Total Outflow:   %12.4f\\n", mb->totalOutflow);
    printf("Initial Storage: %12.4f\\n", mb->initialStorage);
    printf("Final Storage:   %12.4f\\n", mb->finalStorage);
    printf("Runoff Error:    %12.4f %%\\n", mb->runoffError);
    printf("Routing Error:   %12.4f %%\\n", mb->routingError);
}`,
    rust: `// massbal.rs — Mass Balance Checking
// SWMM5 Engine in Rust — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

#[derive(Clone, Debug)]
pub struct MassBalance {
    pub total_inflow: f64,
    pub total_outflow: f64,
    pub initial_storage: f64,
    pub final_storage: f64,
    pub runoff_error: f64,
    pub routing_error: f64,
}

impl MassBalance {
    pub fn new() -> Self {
        Self {
            total_inflow: 0.0,
            total_outflow: 0.0,
            initial_storage: 0.0,
            final_storage: 0.0,
            runoff_error: 0.0,
            routing_error: 0.0,
        }
    }

    /// Accumulate inflow volume from any source
    pub fn add_inflow(&mut self, volume: f64) {
        self.total_inflow += volume;
    }

    /// Accumulate outflow volume from any sink
    pub fn add_outflow(&mut self, volume: f64) {
        self.total_outflow += volume;
    }

    /// Snapshot the current stored volume
    pub fn update_storage(&mut self, current: f64) {
        self.final_storage = current;
    }

    /// Compute and store continuity errors
    pub fn report(&mut self) {
        let delta = self.final_storage
                    - self.initial_storage;
        self.runoff_error = get_error(
            self.total_inflow, self.total_outflow, delta,
        );
        self.routing_error = self.runoff_error;

        println!("\\n--- Mass Balance Report ---");
        println!("Total Inflow:    {:12.4}", self.total_inflow);
        println!("Total Outflow:   {:12.4}", self.total_outflow);
        println!("Initial Storage: {:12.4}",
                 self.initial_storage);
        println!("Final Storage:   {:12.4}",
                 self.final_storage);
        println!("Runoff Error:    {:12.4} %",
                 self.runoff_error);
        println!("Routing Error:   {:12.4} %",
                 self.routing_error);
    }
}

/// Compute continuity error percentage with safe division
pub fn get_error(total_in: f64, total_out: f64,
                 storage_change: f64) -> f64 {
    let mut denom = total_in;
    if denom <= 0.0 {
        denom = total_out + storage_change;
    }
    if denom <= 0.0 { return 0.0; }

    100.0 * (total_in - total_out - storage_change)
          / denom
}`,
    python: `# massbal.py — Mass Balance Checking
# SWMM5 Engine in Python — Continuity Error Tracking
# Tracks all inflows, outflows, and storage to verify
# conservation of mass throughout the simulation

from dataclasses import dataclass, field


@dataclass
class MassBalance:
    total_inflow: float = 0.0
    total_outflow: float = 0.0
    initial_storage: float = 0.0
    final_storage: float = 0.0
    runoff_error: float = 0.0
    routing_error: float = 0.0

    def add_inflow(self, volume: float) -> None:
        """Accumulate inflow volume from any source."""
        self.total_inflow += volume

    def add_outflow(self, volume: float) -> None:
        """Accumulate outflow volume from any sink."""
        self.total_outflow += volume

    def update_storage(self, current: float) -> None:
        """Snapshot the current stored volume."""
        self.final_storage = current

    def report(self) -> str:
        """Compute errors and return summary report."""
        delta = self.final_storage - self.initial_storage
        self.runoff_error = get_error(
            self.total_inflow, self.total_outflow, delta
        )
        self.routing_error = self.runoff_error

        return (
            f"\\n--- Mass Balance Report ---\\n"
            f"Total Inflow:    {self.total_inflow:12.4f}\\n"
            f"Total Outflow:   {self.total_outflow:12.4f}\\n"
            f"Initial Storage: {self.initial_storage:12.4f}\\n"
            f"Final Storage:   {self.final_storage:12.4f}\\n"
            f"Runoff Error:    {self.runoff_error:12.4f} %\\n"
            f"Routing Error:   {self.routing_error:12.4f} %"
        )


def get_error(total_in: float, total_out: float,
              storage_change: float) -> float:
    """Compute continuity error percentage."""
    denom = total_in
    if denom <= 0.0:
        denom = total_out + storage_change
    if denom <= 0.0:
        return 0.0
    return 100.0 * (total_in - total_out
                    - storage_change) / denom`,
    fortran: `! massbal.f90 — Mass Balance Checking
! SWMM5 Engine in Fortran — Continuity Error Tracking
! Tracks all inflows, outflows, and storage to verify
! conservation of mass throughout the simulation

module massbal_module
    implicit none

    type :: MassBalance
        real(8) :: total_inflow    = 0.0d0
        real(8) :: total_outflow   = 0.0d0
        real(8) :: initial_storage = 0.0d0
        real(8) :: final_storage   = 0.0d0
        real(8) :: runoff_error    = 0.0d0
        real(8) :: routing_error   = 0.0d0
    end type MassBalance

contains

    subroutine add_inflow(mb, volume)
        type(MassBalance), intent(inout) :: mb
        real(8), intent(in) :: volume
        mb%total_inflow = mb%total_inflow + volume
    end subroutine add_inflow

    subroutine add_outflow(mb, volume)
        type(MassBalance), intent(inout) :: mb
        real(8), intent(in) :: volume
        mb%total_outflow = mb%total_outflow + volume
    end subroutine add_outflow

    subroutine update_storage(mb, current)
        type(MassBalance), intent(inout) :: mb
        real(8), intent(in) :: current
        mb%final_storage = current
    end subroutine update_storage

    function get_error(total_in, total_out, &
                       storage_change) result(error_pct)
        real(8), intent(in) :: total_in, total_out
        real(8), intent(in) :: storage_change
        real(8) :: error_pct, denom

        denom = total_in
        if (denom <= 0.0d0) then
            denom = total_out + storage_change
        end if
        if (denom <= 0.0d0) then
            error_pct = 0.0d0
            return
        end if

        error_pct = 100.0d0 * (total_in - total_out &
                    - storage_change) / denom
    end function get_error

    subroutine report(mb)
        type(MassBalance), intent(inout) :: mb
        real(8) :: delta

        delta = mb%final_storage - mb%initial_storage
        mb%runoff_error = get_error(mb%total_inflow, &
                          mb%total_outflow, delta)
        mb%routing_error = mb%runoff_error

        write(*,'(A)')       ""
        write(*,'(A)')       "--- Mass Balance Report ---"
        write(*,'(A,F12.4)') "Total Inflow:    ", &
                             mb%total_inflow
        write(*,'(A,F12.4)') "Total Outflow:   ", &
                             mb%total_outflow
        write(*,'(A,F12.4)') "Initial Storage: ", &
                             mb%initial_storage
        write(*,'(A,F12.4)') "Final Storage:   ", &
                             mb%final_storage
        write(*,'(A,F12.4,A)') "Runoff Error:    ", &
                             mb%runoff_error, " %"
        write(*,'(A,F12.4,A)') "Routing Error:   ", &
                             mb%routing_error, " %"
    end subroutine report

end module massbal_module`,
    julia: `# massbal.jl — Mass Balance Checking
# SWMM5 Engine in Julia — Continuity Error Tracking
# Tracks all inflows, outflows, and storage to verify
# conservation of mass throughout the simulation

mutable struct MassBalance
    total_inflow::Float64
    total_outflow::Float64
    initial_storage::Float64
    final_storage::Float64
    runoff_error::Float64
    routing_error::Float64
end

MassBalance() = MassBalance(0.0, 0.0, 0.0, 0.0, 0.0, 0.0)

function add_inflow!(mb::MassBalance, volume::Float64)
    mb.total_inflow += volume
end

function add_outflow!(mb::MassBalance, volume::Float64)
    mb.total_outflow += volume
end

function update_storage!(mb::MassBalance, current::Float64)
    mb.final_storage = current
end

function get_error(total_in::Float64, total_out::Float64,
                   storage_change::Float64)::Float64
    denom = total_in
    if denom ≤ 0.0
        denom = total_out + storage_change
    end
    denom ≤ 0.0 && return 0.0

    return 100.0 * (total_in - total_out
                    - storage_change) / denom
end

function report!(mb::MassBalance)
    delta = mb.final_storage - mb.initial_storage
    mb.runoff_error = get_error(
        mb.total_inflow, mb.total_outflow, delta
    )
    mb.routing_error = mb.runoff_error

    println("\\n--- Mass Balance Report ---")
    @printf("Total Inflow:    %12.4f\\n", mb.total_inflow)
    @printf("Total Outflow:   %12.4f\\n", mb.total_outflow)
    @printf("Initial Storage: %12.4f\\n",
            mb.initial_storage)
    @printf("Final Storage:   %12.4f\\n", mb.final_storage)
    @printf("Runoff Error:    %12.4f %%\\n",
            mb.runoff_error)
    @printf("Routing Error:   %12.4f %%\\n",
            mb.routing_error)
end`,
    javascript: `// massbal.js — Mass Balance Checking
// SWMM5 Engine in JavaScript — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

class MassBalance {
    constructor() {
        this.totalInflow = 0.0;
        this.totalOutflow = 0.0;
        this.initialStorage = 0.0;
        this.finalStorage = 0.0;
        this.runoffError = 0.0;
        this.routingError = 0.0;
    }

    /** Accumulate inflow volume from any source */
    addInflow(volume) {
        this.totalInflow += volume;
    }

    /** Accumulate outflow volume from any sink */
    addOutflow(volume) {
        this.totalOutflow += volume;
    }

    /** Snapshot the current stored volume */
    updateStorage(current) {
        this.finalStorage = current;
    }

    /** Compute errors and return summary report */
    report() {
        const delta = this.finalStorage
                      - this.initialStorage;
        this.runoffError = getError(
            this.totalInflow, this.totalOutflow, delta
        );
        this.routingError = this.runoffError;

        return [
            "",
            "--- Mass Balance Report ---",
            "Total Inflow:    " + this.totalInflow.toFixed(4),
            "Total Outflow:   " + this.totalOutflow.toFixed(4),
            "Initial Storage: " + this.initialStorage.toFixed(4),
            "Final Storage:   " + this.finalStorage.toFixed(4),
            "Runoff Error:    " + this.runoffError.toFixed(4) + " %",
            "Routing Error:   " + this.routingError.toFixed(4) + " %",
        ].join("\n");
    }
}

/** Compute continuity error percentage */
function getError(totalIn, totalOut, storageChange) {
    let denom = totalIn;
    if (denom <= 0.0) {
        denom = totalOut + storageChange;
    }
    if (denom <= 0.0) return 0.0;

    return 100.0 * (totalIn - totalOut - storageChange)
           / denom;
}

export { MassBalance, getError };`,
    go: `// massbal.go — Mass Balance Checking
// SWMM5 Engine in Go — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

package swmm

import "fmt"

// MassBalance tracks all flow volumes for continuity
type MassBalance struct {
        TotalInflow    float64
        TotalOutflow   float64
        InitialStorage float64
        FinalStorage   float64
        RunoffError    float64
        RoutingError   float64
}

// AddInflow accumulates inflow volume from any source
func (mb *MassBalance) AddInflow(volume float64) {
        mb.TotalInflow += volume
}

// AddOutflow accumulates outflow volume from any sink
func (mb *MassBalance) AddOutflow(volume float64) {
        mb.TotalOutflow += volume
}

// UpdateStorage snapshots the current stored volume
func (mb *MassBalance) UpdateStorage(current float64) {
        mb.FinalStorage = current
}

// GetError computes continuity error percentage
func GetError(totalIn, totalOut,
        storageChange float64) float64 {
        denom := totalIn
        if denom <= 0.0 {
                denom = totalOut + storageChange
        }
        if denom <= 0.0 {
                return 0.0
        }
        return 100.0 * (totalIn - totalOut - storageChange) /
                denom
}

// Report computes errors and returns a summary string
func (mb *MassBalance) Report() string {
        delta := mb.FinalStorage - mb.InitialStorage
        mb.RunoffError = GetError(
                mb.TotalInflow, mb.TotalOutflow, delta,
        )
        mb.RoutingError = mb.RunoffError

        return fmt.Sprintf(
                "\\n--- Mass Balance Report ---\\n"+
                        "Total Inflow:    %12.4f\\n"+
                        "Total Outflow:   %12.4f\\n"+
                        "Initial Storage: %12.4f\\n"+
                        "Final Storage:   %12.4f\\n"+
                        "Runoff Error:    %12.4f %%\\n"+
                        "Routing Error:   %12.4f %%",
                mb.TotalInflow, mb.TotalOutflow,
                mb.InitialStorage, mb.FinalStorage,
                mb.RunoffError, mb.RoutingError,
        )
}`,
  },};

const languages = [
  { id: "c", label: "C", ext: ".c", color: "#555555" },
  { id: "rust", label: "Rust", ext: ".rs", color: "#DEA584" },
  { id: "python", label: "Python", ext: ".py", color: "#3572A5" },
  { id: "fortran", label: "Fortran", ext: ".f90", color: "#4d41b1" },
  { id: "julia", label: "Julia", ext: ".jl", color: "#9558B2" },
  { id: "javascript", label: "JavaScript", ext: ".js", color: "#f1e05a" },
  { id: "go", label: "Go", ext: ".go", color: "#00ADD8" },
];

const translationNotes = {
  "c-rust": "Rust enforces memory safety at compile time. The C typedef struct becomes a Rust struct with pub fields. Pointer dereferences (uh->t) become owned references (&self). Manual bounds checking is replaced by .clamp(). C's pow() becomes .powf(), and sqrt() becomes .sqrt(). The nested for loops can be replaced with iterator chains (.iter().map().sum()). No null pointers possible \u2014 the type system prevents it. Mutable state uses &mut self instead of pointer modification.",
  "c-python": "The typedef struct becomes a Python @dataclass with type hints. C's pointer-based access (sc->width) becomes simple dot notation (self.width). Manual memory management disappears entirely. The nested for loops can be replaced with list comprehensions or numpy operations (np.convolve). Python's readability makes the algorithm's intent clearer, though at the cost of runtime performance. Enum classes replace C's #define or enum constants.",
  "c-fortran": "Full circle \u2014 SWMM3 was originally Fortran! The pointer dereference uh->t becomes uh%t using Fortran's derived type syntax. Arrays use 1-based indexing (rainfall(j+1) vs rainfall[j]). The explicit intent(in/inout) declarations make data flow clearer than C's pointer-based approach. The module/contains pattern replaces C's header files. real(8) provides double precision. Subroutines replace functions when modifying arguments in-place.",
  "c-julia": "Julia's multiple dispatch replaces C's function naming conventions \u2014 get_runoff(sc, depth) instead of subcatch_getRunoff(sc, depth). The \u2264 operator is native Unicode syntax. Julia uses 1-based indexing like Fortran. Short-circuit returns (expr && return val) are idiomatic. Structs are immutable by default; use mutable struct when state changes are needed. The ! convention (update_level!) signals mutation to callers.",
  "c-javascript": "The typedef struct becomes a JavaScript class with constructor. C's sqrt() and pow() become Math.sqrt() and Math.pow(). Computed properties use getter syntax (get tBase()). ES module exports make the code ready for browser-based SWMM implementations and WebAssembly integration. Math.max/Math.min replace manual bounds checking. No pointer arithmetic \u2014 everything is reference-based.",
  "c-go": "Go uses exported names (capitalized: GetRunoff vs get_runoff) instead of public/private keywords. Methods are defined outside the struct with receiver syntax (func (s *Subcatch) GetRunoff()). Pointer receivers (*Type) indicate mutation, value receivers indicate pure computation. The math package provides numerical functions. Error handling would typically use multiple returns (result, error). Simple, readable, and fast \u2014 Go's philosophy matches C's directness.",
  "rust-python": "Rust's strict ownership model relaxes into Python's garbage-collected simplicity. Rust's &self/&mut self distinction disappears \u2014 Python methods freely mutate self. Type annotations (f64 \u2192 float) become optional hints rather than compiler-enforced. Pattern matching and Result types become try/except. The performance gap is significant, but Python's readability and ecosystem (numpy, scipy) often compensate.",
  "rust-fortran": "Two high-performance languages with different eras. Rust's ownership/borrowing model replaces Fortran's intent(in/inout) system for controlling data flow. Rust's .iter().map().sum() becomes Fortran's explicit do loops. Both excel at numerical computation, but Rust adds memory safety guarantees that Fortran lacks. Fortran's 1-based arrays vs Rust's 0-based indexing requires careful translation.",
  "rust-julia": "Both are modern systems languages with expressive type systems. Rust's impl blocks become Julia's multiple dispatch functions. Rust's match becomes Julia's if/elseif. Both use Unicode support, but Julia embraces it more fully. Rust guarantees memory safety at compile time; Julia uses garbage collection. Julia's JIT compilation vs Rust's ahead-of-time compilation represents different performance trade-offs.",
  "rust-javascript": "Rust's strict type system and ownership model contrast sharply with JavaScript's dynamic typing. Rust's struct + impl becomes JavaScript's class. Rust's Result/Option types become JavaScript's try/catch or null checks. The .powf() and .sqrt() methods become Math.pow() and Math.sqrt(). Rust compiles to WebAssembly, so these two languages can actually work together in the browser.",
  "rust-go": "Both are modern compiled languages, but with different philosophies. Rust's ownership model vs Go's garbage collector. Rust's impl blocks vs Go's methods defined outside the struct. Both use explicit error handling, but Rust uses Result<T,E> while Go uses multiple returns. Go's simplicity trades some of Rust's safety guarantees for faster development speed.",
  "python-fortran": "Python's dynamic typing meets Fortran's static declarations. Python's @dataclass becomes Fortran's derived type. List comprehensions become do loops. Python's 0-based indexing vs Fortran's 1-based arrays requires index adjustments. Both are widely used in scientific computing, but Fortran's raw numerical performance is typically 10-100x faster. Many engineers use Python for prototyping and Fortran for production.",
  "python-julia": "Two high-level scientific computing languages. Python's @dataclass becomes Julia's struct. Both support Unicode, type hints, and clean mathematical syntax. Julia's multiple dispatch provides a unique alternative to Python's class-based OOP. Julia is compiled (JIT) while Python is interpreted, giving Julia significant speed advantages for numerical work. Both have rich ecosystems for water resources computing.",
  "python-javascript": "Python's @dataclass becomes JavaScript's class with constructor. Python's math module maps to JavaScript's Math object. f-strings become template literals. Both are dynamically typed, but JavaScript's === vs == gotchas don't exist in Python. Python dominates server-side scientific computing; JavaScript enables browser-based visualization and interactive tools.",
  "python-go": "Python's dynamic elegance vs Go's static simplicity. Python's @dataclass becomes Go's struct with exported fields. Python's self becomes Go's receiver parameter. Type hints that Python ignores become Go's enforced static types. Go's explicit error handling (if err != nil) replaces Python's try/except. Go typically runs 10-50x faster than Python for numerical work.",
  "fortran-julia": "Both are 1-based indexing languages with strong numerical computing heritage. Fortran's derived types become Julia's structs. Fortran's module/contains becomes Julia's module/function pattern. Julia's multiple dispatch offers more flexibility than Fortran's module procedures. Both compile to efficient machine code, but Julia adds interactivity through its REPL and JIT compilation.",
  "fortran-javascript": "The oldest and newest languages in our set. Fortran's real(8) becomes JavaScript's native Number (all floats). Fortran's module system becomes ES module exports. do loops become for loops. The mathematical algorithms translate directly, but the language idioms are worlds apart \u2014 Fortran optimizes for numerical arrays, JavaScript for event-driven interactions.",
  "fortran-go": "Both are statically typed compiled languages focused on clarity. Fortran's derived types become Go's structs. Fortran's module procedures become Go's package-level functions with receivers. Fortran's intent(in) becomes Go's value vs pointer receiver convention. Both produce fast binaries, but Go adds built-in concurrency and modern tooling.",
  "julia-javascript": "Julia's scientific computing focus vs JavaScript's web platform. Julia's struct becomes JavaScript's class. Julia's multiple dispatch becomes JavaScript's class methods. Julia's 1-based indexing requires adjustments for JavaScript's 0-based arrays. Julia excels at numerical computation; JavaScript excels at interactive visualization \u2014 combining both via web APIs creates powerful engineering tools.",
  "julia-go": "Julia's expressive scientific syntax vs Go's minimalist engineering approach. Julia's mutable struct becomes Go's struct with pointer receivers. Julia's multiple dispatch becomes Go's explicit method definitions. Julia uses 1-based indexing; Go uses 0-based. Julia's ! convention for mutation becomes Go's pointer receiver convention. Both compile to fast native code.",
  "javascript-go": "Both are modern languages with C-family syntax. JavaScript's class becomes Go's struct + methods. JavaScript's Math.sqrt() becomes Go's math.Sqrt(). JavaScript's dynamic typing becomes Go's static type declarations. JavaScript runs in the browser or Node.js; Go produces standalone binaries. Both have strong ecosystems for web services, making them natural choices for SWMM5 web tools.",
};

export { modules, languages, translationNotes };
