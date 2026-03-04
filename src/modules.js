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
    zig: `// routing.zig — Dynamic Wave Routing
// SWMM5 Engine in Zig — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

const std = @import("std");
const math = std.math;

const GRAVITY: f64 = 32.2; // ft/s²

const Conduit = struct {
    length: f64,     // conduit length (ft)
    roughness: f64,  // Manning's n
    a_full: f64,     // full cross-section area (ft²)
    width: f64,      // top width at full depth (ft)

    pub fn frictionSlope(self: Conduit, q: f64, area: f64) f64 {
        if (area <= 0.0 or q == 0.0) return 0.0;

        const h_radius = area / self.width;
        const sf_base = self.roughness * q /
            (area * math.pow(f64, h_radius, 2.0 / 3.0));
        const sf = sf_base * sf_base;

        return if (q < 0.0) -sf else sf;
    }

    pub fn getFlow(self: Conduit, q_old: f64, area: f64,
                   h_up: f64, h_down: f64, dt: f64) f64 {
        if (area <= 0.0) return 0.0;

        const dhdx = (h_up - h_down) / self.length;
        const sf = self.frictionSlope(q_old, area);

        const q_new = q_old + dt * GRAVITY * area * (dhdx - sf);

        const q_max = area * 50.0;
        return math.clamp(q_new, -q_max, q_max);
    }
};`,
    cpp: `// routing.cpp — Dynamic Wave Routing
// SWMM5 Engine in C++ — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

#include <cmath>
#include <algorithm>

namespace swmm {

constexpr double GRAVITY = 32.2; // ft/s²

struct Conduit {
    double length;     // conduit length (ft)
    double roughness;  // Manning's n
    double aFull;      // full cross-section area (ft²)
    double width;      // top width at full depth (ft)

    double frictionSlope(double Q, double area) const {
        if (area <= 0.0 || Q == 0.0) return 0.0;

        double hRadius = area / width;
        double sfBase = roughness * Q
                        / (area * std::pow(hRadius, 2.0 / 3.0));
        double sf = sfBase * sfBase;

        return (Q < 0.0) ? -sf : sf;
    }

    double getFlow(double Qold, double area, double hUp,
                   double hDown, double dt) const {
        if (area <= 0.0) return 0.0;

        double dhdx = (hUp - hDown) / length;
        double sf = frictionSlope(Qold, area);

        double Qnew = Qold + dt * GRAVITY * area * (dhdx - sf);

        double qMax = area * 50.0;
        return std::clamp(Qnew, -qMax, qMax);
    }
};

} // namespace swmm`,
    csharp: `// Routing.cs — Dynamic Wave Routing
// SWMM5 Engine in C# — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

using System;

namespace Swmm
{
    public class Conduit
    {
        public double Length { get; set; }
        public double Roughness { get; set; }
        public double AFull { get; set; }
        public double Width { get; set; }

        private const double Gravity = 32.2;

        public Conduit(double length, double roughness,
                       double aFull, double width)
        {
            Length = length;
            Roughness = roughness;
            AFull = aFull;
            Width = width;
        }

        public double FrictionSlope(double Q, double area)
        {
            if (area <= 0.0 || Q == 0.0) return 0.0;

            double hRadius = area / Width;
            double sfBase = Roughness * Q
                / (area * Math.Pow(hRadius, 2.0 / 3.0));
            double sf = sfBase * sfBase;

            return Q < 0.0 ? -sf : sf;
        }

        public double GetFlow(double Qold, double area,
                              double hUp, double hDown,
                              double dt)
        {
            if (area <= 0.0) return 0.0;

            double dhdx = (hUp - hDown) / Length;
            double sf = FrictionSlope(Qold, area);

            double Qnew = Qold + dt * Gravity * area
                          * (dhdx - sf);

            double qMax = area * 50.0;
            return Math.Clamp(Qnew, -qMax, qMax);
        }
    }
}`,
    matlab: `% routing.m — Dynamic Wave Routing
% SWMM5 Engine in MATLAB — Saint-Venant Equation Solver
% Simplified explicit finite-difference scheme for
% unsteady flow routing through drainage conduits

function conduit = create_conduit(len, roughness, ...
                                   a_full, width)
    conduit.length    = len;
    conduit.roughness = roughness;
    conduit.a_full    = a_full;
    conduit.width     = width;
end

function sf = friction_slope(conduit, Q, area)
    GRAVITY = 32.2;  % ft/s^2
    if area <= 0.0 || Q == 0.0
        sf = 0.0;
        return;
    end

    h_radius = area / conduit.width;
    sf_base  = conduit.roughness * Q ...
               / (area * h_radius^(2.0/3.0));
    sf = sf_base * sf_base;

    if Q < 0.0
        sf = -sf;
    end
end

function Q_new = get_flow(conduit, Q_old, area, ...
                          h_up, h_down, dt)
    GRAVITY = 32.2;
    if area <= 0.0
        Q_new = 0.0;
        return;
    end

    dhdx = (h_up - h_down) / conduit.length;
    sf   = friction_slope(conduit, Q_old, area);

    Q_new = Q_old + dt * GRAVITY * area * (dhdx - sf);

    q_max = area * 50.0;
    Q_new = max(-q_max, min(Q_new, q_max));
end`,
    r: `# routing.R — Dynamic Wave Routing
# SWMM5 Engine in R — Saint-Venant Equation Solver
# Simplified explicit finite-difference scheme for
# unsteady flow routing through drainage conduits

GRAVITY <- 32.2  # ft/s^2

create_conduit <- function(length, roughness,
                            a_full, width) {
    list(
        length    = length,
        roughness = roughness,
        a_full    = a_full,
        width     = width
    )
}

friction_slope <- function(conduit, Q, area) {
    if (area <= 0.0 || Q == 0.0) return(0.0)

    h_radius <- area / conduit$width
    sf_base  <- conduit$roughness * Q /
                (area * h_radius^(2.0 / 3.0))
    sf <- sf_base * sf_base

    if (Q < 0.0) -sf else sf
}

get_flow <- function(conduit, Q_old, area,
                     h_up, h_down, dt) {
    if (area <= 0.0) return(0.0)

    dhdx <- (h_up - h_down) / conduit$length
    sf   <- friction_slope(conduit, Q_old, area)

    Q_new <- Q_old + dt * GRAVITY * area * (dhdx - sf)

    q_max <- area * 50.0
    max(-q_max, min(Q_new, q_max))
}`,
    delphi: `{ routing.pas — Dynamic Wave Routing }
{ SWMM5 Engine in Delphi — Saint-Venant Equation Solver }
{ Simplified explicit finite-difference scheme for }
{ unsteady flow routing through drainage conduits }

unit Routing;

interface

const
  GRAVITY = 32.2;  { ft/s^2 }

type
  TConduit = class
  private
    FLength: Double;
    FRoughness: Double;
    FAFull: Double;
    FWidth: Double;
  public
    constructor Create(ALength, ARoughness,
                       AAFull, AWidth: Double);
    function FrictionSlope(Q, Area: Double): Double;
    function GetFlow(Qold, Area, HUp, HDown,
                     Dt: Double): Double;
  end;

implementation

uses Math;

constructor TConduit.Create(ALength, ARoughness,
                            AAFull, AWidth: Double);
begin
  FLength    := ALength;
  FRoughness := ARoughness;
  FAFull     := AAFull;
  FWidth     := AWidth;
end;

function TConduit.FrictionSlope(Q, Area: Double): Double;
var
  HRadius, SfBase: Double;
begin
  if (Area <= 0.0) or (Q = 0.0) then
    Exit(0.0);

  HRadius := Area / FWidth;
  SfBase  := FRoughness * Q
             / (Area * Power(HRadius, 2.0/3.0));
  Result := SfBase * SfBase;

  if Q < 0.0 then
    Result := -Result;
end;

function TConduit.GetFlow(Qold, Area, HUp, HDown,
                          Dt: Double): Double;
var
  Dhdx, Sf, QMax: Double;
begin
  if Area <= 0.0 then
    Exit(0.0);

  Dhdx := (HUp - HDown) / FLength;
  Sf   := FrictionSlope(Qold, Area);

  Result := Qold + Dt * GRAVITY * Area * (Dhdx - Sf);

  QMax := Area * 50.0;
  Result := Max(-QMax, Min(Result, QMax));
end;

end.`,
    typescript: `// routing.ts — Dynamic Wave Routing
// SWMM5 Engine in TypeScript — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

const GRAVITY: number = 32.2; // ft/s²

interface ConduitParams {
    length: number;
    roughness: number;
    aFull: number;
    width: number;
}

class Conduit {
    readonly length: number;
    readonly roughness: number;
    readonly aFull: number;
    readonly width: number;

    constructor(params: ConduitParams) {
        this.length = params.length;
        this.roughness = params.roughness;
        this.aFull = params.aFull;
        this.width = params.width;
    }

    frictionSlope(Q: number, area: number): number {
        if (area <= 0.0 || Q === 0.0) return 0.0;

        const hRadius: number = area / this.width;
        const sfBase: number = this.roughness * Q
            / (area * Math.pow(hRadius, 2.0 / 3.0));
        const sf: number = sfBase * sfBase;

        return Q < 0.0 ? -sf : sf;
    }

    getFlow(Qold: number, area: number, hUp: number,
            hDown: number, dt: number): number {
        if (area <= 0.0) return 0.0;

        const dhdx: number = (hUp - hDown) / this.length;
        const sf: number = this.frictionSlope(Qold, area);

        const Qnew: number = Qold + dt * GRAVITY
                             * area * (dhdx - sf);

        const qMax: number = area * 50.0;
        return Math.max(-qMax, Math.min(Qnew, qMax));
    }
}

export { Conduit, GRAVITY };`,
    cuda: `// routing.cu — Dynamic Wave Routing
// SWMM5 Engine in CUDA — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

#include <math.h>

#define GRAVITY 32.2f  // ft/s²

struct Conduit {
    float length;
    float roughness;
    float aFull;
    float width;
};

__device__ float frictionSlope(const Conduit* c,
                                float Q, float area)
{
    if (area <= 0.0f || Q == 0.0f) return 0.0f;

    float hRadius = area / c->width;
    float sfBase = c->roughness * Q
                   / (area * powf(hRadius, 2.0f/3.0f));
    float sf = sfBase * sfBase;

    return (Q < 0.0f) ? -sf : sf;
}

__global__ void routeFlowKernel(Conduit* conduits,
    float* Qold, float* areas, float* hUp,
    float* hDown, float dt, float* Qnew, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    Conduit c = conduits[idx];
    float area = areas[idx];

    if (area <= 0.0f) {
        Qnew[idx] = 0.0f;
        return;
    }

    float dhdx = (hUp[idx] - hDown[idx]) / c.length;
    float sf = frictionSlope(&c, Qold[idx], area);

    float qNew = Qold[idx] + dt * GRAVITY
                 * area * (dhdx - sf);

    float qMax = area * 50.0f;
    Qnew[idx] = fmaxf(-qMax, fminf(qNew, qMax));
}`,
    wasm: `;; routing.wat — Dynamic Wave Routing
;; SWMM5 Engine in WebAssembly — Saint-Venant Equation Solver
;; Simplified explicit finite-difference scheme for
;; unsteady flow routing through drainage conduits

(module
  (func $frictionSlope
    (param $roughness f64) (param $width f64)
    (param $Q f64) (param $area f64)
    (result f64)
    (local $hRadius f64)
    (local $sfBase f64)
    (local $sf f64)

    (if (result f64) (f64.le (local.get $area)
                              (f64.const 0.0))
      (then (f64.const 0.0))
      (else
        (if (result f64) (f64.eq (local.get $Q)
                                  (f64.const 0.0))
          (then (f64.const 0.0))
          (else
            (local.set $hRadius
              (f64.div (local.get $area)
                       (local.get $width)))
            (local.set $sfBase
              (f64.div
                (f64.mul (local.get $roughness)
                         (local.get $Q))
                (f64.mul (local.get $area)
                  (call $pow23 (local.get $hRadius)))))
            (local.set $sf
              (f64.mul (local.get $sfBase)
                       (local.get $sfBase)))
            (if (result f64) (f64.lt (local.get $Q)
                                      (f64.const 0.0))
              (then (f64.neg (local.get $sf)))
              (else (local.get $sf)))))))
  )

  (func $getFlow
    (param $length f64) (param $roughness f64)
    (param $width f64) (param $Qold f64)
    (param $area f64) (param $hUp f64)
    (param $hDown f64) (param $dt f64)
    (result f64)
    (local $dhdx f64) (local $sf f64)
    (local $Qnew f64) (local $qMax f64)

    (if (result f64) (f64.le (local.get $area)
                              (f64.const 0.0))
      (then (f64.const 0.0))
      (else
        (local.set $dhdx
          (f64.div (f64.sub (local.get $hUp)
                            (local.get $hDown))
                   (local.get $length)))
        (local.set $sf
          (call $frictionSlope
            (local.get $roughness) (local.get $width)
            (local.get $Qold) (local.get $area)))
        (local.set $Qnew
          (f64.add (local.get $Qold)
            (f64.mul (local.get $dt)
              (f64.mul (f64.const 32.2)
                (f64.mul (local.get $area)
                  (f64.sub (local.get $dhdx)
                           (local.get $sf)))))))
        (local.set $qMax
          (f64.mul (local.get $area) (f64.const 50.0)))
        (f64.max (f64.neg (local.get $qMax))
          (f64.min (local.get $Qnew)
                   (local.get $qMax))))))
  )
)`,
    mojo: `# routing.mojo — Dynamic Wave Routing
# SWMM5 Engine in Mojo — Saint-Venant Equation Solver
# Simplified explicit finite-difference scheme for
# unsteady flow routing through drainage conduits

from math import pow, abs, clamp

alias GRAVITY: Float64 = 32.2

struct Conduit:
    var length: Float64
    var roughness: Float64
    var a_full: Float64
    var width: Float64

    fn __init__(inout self, length: Float64,
                roughness: Float64, a_full: Float64,
                width: Float64):
        self.length = length
        self.roughness = roughness
        self.a_full = a_full
        self.width = width

    fn friction_slope(self, q: Float64,
                      area: Float64) -> Float64:
        if area <= 0.0 or q == 0.0:
            return 0.0

        var h_radius = area / self.width
        var sf_base = self.roughness * q / (
            area * pow(h_radius, 2.0 / 3.0))
        var sf = sf_base * sf_base

        if q < 0.0:
            return -sf
        return sf

    fn get_flow(self, q_old: Float64, area: Float64,
                h_up: Float64, h_down: Float64,
                dt: Float64) -> Float64:
        if area <= 0.0:
            return 0.0

        var dhdx = (h_up - h_down) / self.length
        var sf = self.friction_slope(q_old, area)

        var q_new = q_old + dt * GRAVITY * area * (
            dhdx - sf)

        var q_max = area * 50.0
        return clamp(q_new, -q_max, q_max)`,
    java: `// Routing.java — Dynamic Wave Routing
// SWMM5 Engine in Java — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

package swmm;

public class Conduit {
    private static final double GRAVITY = 32.2;

    private final double length;
    private final double roughness;
    private final double aFull;
    private final double width;

    public Conduit(double length, double roughness,
                   double aFull, double width) {
        this.length = length;
        this.roughness = roughness;
        this.aFull = aFull;
        this.width = width;
    }

    public double getLength()    { return length; }
    public double getRoughness() { return roughness; }
    public double getAFull()     { return aFull; }
    public double getWidth()     { return width; }

    public double frictionSlope(double Q, double area) {
        if (area <= 0.0 || Q == 0.0) return 0.0;

        double hRadius = area / width;
        double sfBase = roughness * Q
            / (area * Math.pow(hRadius, 2.0 / 3.0));
        double sf = sfBase * sfBase;

        return Q < 0.0 ? -sf : sf;
    }

    public double getFlow(double Qold, double area,
                          double hUp, double hDown,
                          double dt) {
        if (area <= 0.0) return 0.0;

        double dhdx = (hUp - hDown) / length;
        double sf = frictionSlope(Qold, area);

        double Qnew = Qold + dt * GRAVITY * area
                      * (dhdx - sf);

        double qMax = area * 50.0;
        return Math.max(-qMax, Math.min(Qnew, qMax));
    }
}`,
    nim: `# routing.nim — Dynamic Wave Routing
# SWMM5 Engine in Nim — Saint-Venant Equation Solver
# Simplified explicit finite-difference scheme for
# unsteady flow routing through drainage conduits

import math

const Gravity = 32.2  # ft/s^2

type
  Conduit = object
    length: float64
    roughness: float64
    aFull: float64
    width: float64

proc frictionSlope(c: Conduit, Q, area: float64): float64 =
  if area <= 0.0 or Q == 0.0:
    return 0.0

  let hRadius = area / c.width
  let sfBase = c.roughness * Q /
               (area * pow(hRadius, 2.0 / 3.0))
  result = sfBase * sfBase

  if Q < 0.0:
    result = -result

proc getFlow(c: Conduit, qOld, area, hUp, hDown,
             dt: float64): float64 =
  if area <= 0.0:
    return 0.0

  let dhdx = (hUp - hDown) / c.length
  let sf = frictionSlope(c, qOld, area)

  result = qOld + dt * Gravity * area * (dhdx - sf)

  let qMax = area * 50.0
  result = clamp(result, -qMax, qMax)`,
    ada: `-- routing.adb — Dynamic Wave Routing
-- SWMM5 Engine in Ada — Saint-Venant Equation Solver
-- Simplified explicit finite-difference scheme for
-- unsteady flow routing through drainage conduits

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body Routing is

   Gravity : constant Float := 32.2;

   type Conduit is record
      Length    : Float;
      Roughness : Float;
      A_Full   : Float;
      Width    : Float;
   end record;

   function Friction_Slope
     (C : Conduit; Q, Area : Float) return Float
   is
      H_Radius : Float;
      Sf_Base  : Float;
      Sf       : Float;
   begin
      if Area <= 0.0 or else Q = 0.0 then
         return 0.0;
      end if;

      H_Radius := Area / C.Width;
      Sf_Base  := C.Roughness * Q /
                  (Area * H_Radius ** (2.0 / 3.0));
      Sf := Sf_Base * Sf_Base;

      if Q < 0.0 then
         return -Sf;
      end if;
      return Sf;
   end Friction_Slope;

   function Get_Flow
     (C : Conduit; Q_Old, Area, H_Up, H_Down,
      Dt : Float) return Float
   is
      Dhdx  : Float;
      Sf    : Float;
      Q_New : Float;
      Q_Max : Float;
   begin
      if Area <= 0.0 then
         return 0.0;
      end if;

      Dhdx  := (H_Up - H_Down) / C.Length;
      Sf    := Friction_Slope(C, Q_Old, Area);
      Q_New := Q_Old + Dt * Gravity * Area
               * (Dhdx - Sf);

      Q_Max := Area * 50.0;
      return Float'Max(-Q_Max, Float'Min(Q_New, Q_Max));
   end Get_Flow;

end Routing;`,
    chapel: `// routing.chpl — Dynamic Wave Routing
// SWMM5 Engine in Chapel — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

param GRAVITY: real = 32.2;  // ft/s²

record Conduit {
    var length: real;
    var roughness: real;
    var aFull: real;
    var width: real;

    proc frictionSlope(Q: real, area: real): real {
        if area <= 0.0 || Q == 0.0 then return 0.0;

        const hRadius = area / this.width;
        const sfBase = this.roughness * Q
                       / (area * hRadius ** (2.0/3.0));
        const sf = sfBase * sfBase;

        return if Q < 0.0 then -sf else sf;
    }

    proc getFlow(Qold: real, area: real, hUp: real,
                 hDown: real, dt: real): real {
        if area <= 0.0 then return 0.0;

        const dhdx = (hUp - hDown) / this.length;
        const sf = this.frictionSlope(Qold, area);

        var Qnew = Qold + dt * GRAVITY * area
                   * (dhdx - sf);

        const qMax = area * 50.0;
        return max(-qMax, min(Qnew, qMax));
    }
}`,
    swift: `// Routing.swift — Dynamic Wave Routing
// SWMM5 Engine in Swift — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

import Foundation

let gravity: Double = 32.2  // ft/s²

struct Conduit {
    let length: Double
    let roughness: Double
    let aFull: Double
    let width: Double

    func frictionSlope(Q: Double, area: Double) -> Double {
        guard area > 0.0, Q != 0.0 else { return 0.0 }

        let hRadius = area / width
        let sfBase = roughness * Q
                     / (area * pow(hRadius, 2.0 / 3.0))
        let sf = sfBase * sfBase

        return Q < 0.0 ? -sf : sf
    }

    func getFlow(Qold: Double, area: Double,
                 hUp: Double, hDown: Double,
                 dt: Double) -> Double {
        guard area > 0.0 else { return 0.0 }

        let dhdx = (hUp - hDown) / length
        let sf = frictionSlope(Q: Qold, area: area)

        var Qnew = Qold + dt * gravity * area
                   * (dhdx - sf)

        let qMax = area * 50.0
        Qnew = max(-qMax, min(Qnew, qMax))
        return Qnew
    }
}`,
    kotlin: `// Routing.kt — Dynamic Wave Routing
// SWMM5 Engine in Kotlin — Saint-Venant Equation Solver
// Simplified explicit finite-difference scheme for
// unsteady flow routing through drainage conduits

package swmm

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

const val GRAVITY = 32.2  // ft/s²

data class Conduit(
    val length: Double,
    val roughness: Double,
    val aFull: Double,
    val width: Double
) {
    fun frictionSlope(Q: Double, area: Double): Double {
        if (area <= 0.0 || Q == 0.0) return 0.0

        val hRadius = area / width
        val sfBase = roughness * Q /
                     (area * hRadius.pow(2.0 / 3.0))
        val sf = sfBase * sfBase

        return if (Q < 0.0) -sf else sf
    }

    fun getFlow(Qold: Double, area: Double,
                hUp: Double, hDown: Double,
                dt: Double): Double {
        if (area <= 0.0) return 0.0

        val dhdx = (hUp - hDown) / length
        val sf = frictionSlope(Qold, area)

        var Qnew = Qold + dt * GRAVITY * area *
                   (dhdx - sf)

        val qMax = area * 50.0
        return Qnew.coerceIn(-qMax, qMax)
    }
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
    zig: `// dynwave.zig — Dynamic Wave Solver
// SWMM5 Engine in Zig — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

const std = @import("std");
const math = std.math;

const GRAVITY: f64 = 32.174; // ft/s²

const Link = struct {
    length: f64,      // conduit length (ft)
    roughness: f64,   // Manning's n
    a_full: f64,      // full cross-section area (ft²)
    r_full: f64,      // full hydraulic radius (ft)
    flow: f64,        // current flow (cfs)
    new_flow: f64,    // updated flow (cfs)
    velocity: f64,    // flow velocity (ft/s)
    froude: f64,      // Froude number

    /// Sf = (n * |V| / R^(2/3))^2
    pub fn getFrictionSlope(self: Link, area: f64,
                            vel: f64) f64 {
        if (area <= 0.0) return 0.0;
        const rh = self.r_full * (area / self.a_full);
        if (rh <= 0.0) return 0.0;

        const nv = self.roughness * @fabs(vel);
        return (nv * nv) / math.pow(f64, rh, 4.0 / 3.0);
    }

    /// Explicit momentum equation update
    pub fn updateFlow(self: *Link, h1: f64, h2: f64,
                      a1: f64, a2: f64, dt: f64) void {
        const a_avg = 0.5 * (a1 + a2);
        if (a_avg <= 0.0) {
            self.new_flow = 0.0;
            return;
        }

        const vel = self.flow / a_avg;
        const sf = self.getFrictionSlope(a_avg, vel);

        // Gravity (pressure) term
        const head_grad = GRAVITY * a_avg *
            (h1 - h2) / self.length;

        // Friction term
        var fric_term = GRAVITY * a_avg * sf;
        if (self.flow < 0.0) fric_term = -fric_term;

        // Convective acceleration term
        const conv_term = self.flow * @fabs(self.flow) /
            (a_avg * self.length) * (a2 - a1);

        const dq = (head_grad - fric_term - conv_term) * dt;
        self.new_flow = self.flow + dq;

        // Clamp flow
        const q_max = self.a_full * 25.0;
        self.new_flow = math.clamp(self.new_flow, -q_max, q_max);

        // Update velocity and Froude number
        self.velocity = self.new_flow / a_avg;
        const depth = a_avg / self.a_full * (2.0 * self.r_full);
        self.froude = if (depth > 0.0)
            @fabs(self.velocity) / @sqrt(GRAVITY * depth)
        else
            0.0;
    }
};`,
    cpp: `// dynwave.cpp — Dynamic Wave Solver
// SWMM5 Engine in C++ — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

#include <cmath>
#include <algorithm>

namespace swmm {

constexpr double GRAVITY = 32.174; // ft/s²

struct Link {
    double length;      // conduit length (ft)
    double roughness;   // Manning's n
    double aFull;       // full cross-section area (ft²)
    double rFull;       // full hydraulic radius (ft)
    double flow;        // current flow (cfs)
    double newFlow;     // updated flow (cfs)
    double velocity;    // flow velocity (ft/s)
    double froude;      // Froude number

    double getFrictionSlope(double area, double vel) const {
        if (area <= 0.0) return 0.0;
        double rh = rFull * (area / aFull);
        if (rh <= 0.0) return 0.0;

        double nv = roughness * std::abs(vel);
        return (nv * nv) / std::pow(rh, 4.0 / 3.0);
    }

    void updateFlow(double h1, double h2,
                    double a1, double a2, double dt) {
        double aAvg = 0.5 * (a1 + a2);
        if (aAvg <= 0.0) { newFlow = 0.0; return; }

        double vel = flow / aAvg;
        double sf = getFrictionSlope(aAvg, vel);

        double headGrad = GRAVITY * aAvg * (h1 - h2) / length;
        double fricTerm = GRAVITY * aAvg * sf;
        if (flow < 0.0) fricTerm = -fricTerm;

        double convTerm = flow * std::abs(flow)
                          / (aAvg * length) * (a2 - a1);

        double dq = (headGrad - fricTerm - convTerm) * dt;
        newFlow = flow + dq;

        double qMax = aFull * 25.0;
        newFlow = std::clamp(newFlow, -qMax, qMax);

        velocity = newFlow / aAvg;
        double depth = aAvg / aFull * (2.0 * rFull);
        froude = (depth > 0.0)
            ? std::abs(velocity) / std::sqrt(GRAVITY * depth)
            : 0.0;
    }
};

} // namespace swmm`,
    csharp: `// dynwave.cs — Dynamic Wave Solver
// SWMM5 Engine in C# — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

using System;

namespace Swmm
{
    public class Link
    {
        public double Length { get; set; }
        public double Roughness { get; set; }
        public double AFull { get; set; }
        public double RFull { get; set; }
        public double Flow { get; set; }
        public double NewFlow { get; set; }
        public double Velocity { get; set; }
        public double Froude { get; set; }

        private const double Gravity = 32.174;

        public double GetFrictionSlope(double area, double vel)
        {
            if (area <= 0.0) return 0.0;
            double rh = RFull * (area / AFull);
            if (rh <= 0.0) return 0.0;

            double nv = Roughness * Math.Abs(vel);
            return (nv * nv) / Math.Pow(rh, 4.0 / 3.0);
        }

        public void UpdateFlow(double h1, double h2,
                               double a1, double a2, double dt)
        {
            double aAvg = 0.5 * (a1 + a2);
            if (aAvg <= 0.0) { NewFlow = 0.0; return; }

            double vel = Flow / aAvg;
            double sf = GetFrictionSlope(aAvg, vel);

            double headGrad = Gravity * aAvg * (h1 - h2) / Length;
            double fricTerm = Gravity * aAvg * sf;
            if (Flow < 0.0) fricTerm = -fricTerm;

            double convTerm = Flow * Math.Abs(Flow)
                              / (aAvg * Length) * (a2 - a1);

            double dq = (headGrad - fricTerm - convTerm) * dt;
            NewFlow = Flow + dq;

            double qMax = AFull * 25.0;
            NewFlow = Math.Clamp(NewFlow, -qMax, qMax);

            Velocity = NewFlow / aAvg;
            double depth = aAvg / AFull * (2.0 * RFull);
            Froude = (depth > 0.0)
                ? Math.Abs(Velocity) / Math.Sqrt(Gravity * depth)
                : 0.0;
        }
    }
}`,
    matlab: `% dynwave.m — Dynamic Wave Solver
% SWMM5 Engine in MATLAB — Saint-Venant Equation Solver
% Solves full momentum equation using explicit
% finite-difference scheme for unsteady conduit flow

function link = dynwave_createLink(length, roughness, ...
                                    aFull, rFull, flow)
    link.length    = length;
    link.roughness = roughness;
    link.aFull     = aFull;
    link.rFull     = rFull;
    link.flow      = flow;
    link.newFlow   = 0.0;
    link.velocity  = 0.0;
    link.froude    = 0.0;
end

function sf = getFrictionSlope(link, area, vel)
    GRAVITY = 32.174;
    if area <= 0.0
        sf = 0.0; return;
    end
    rh = link.rFull * (area / link.aFull);
    if rh <= 0.0
        sf = 0.0; return;
    end
    nv = link.roughness * abs(vel);
    sf = (nv * nv) / rh^(4.0/3.0);
end

function link = updateFlow(link, h1, h2, a1, a2, dt)
    GRAVITY = 32.174;
    aAvg = 0.5 * (a1 + a2);
    if aAvg <= 0.0
        link.newFlow = 0.0; return;
    end

    vel = link.flow / aAvg;
    sf = getFrictionSlope(link, aAvg, vel);

    headGrad = GRAVITY * aAvg * (h1 - h2) / link.length;
    fricTerm = GRAVITY * aAvg * sf;
    if link.flow < 0.0
        fricTerm = -fricTerm;
    end

    convTerm = link.flow * abs(link.flow) ...
               / (aAvg * link.length) * (a2 - a1);

    dq = (headGrad - fricTerm - convTerm) * dt;
    link.newFlow = link.flow + dq;

    qMax = link.aFull * 25.0;
    link.newFlow = max(-qMax, min(link.newFlow, qMax));

    link.velocity = link.newFlow / aAvg;
    depth = aAvg / link.aFull * (2.0 * link.rFull);
    if depth > 0.0
        link.froude = abs(link.velocity) ...
                      / sqrt(GRAVITY * depth);
    else
        link.froude = 0.0;
    end
end`,
    r: `# dynwave.R — Dynamic Wave Solver
# SWMM5 Engine in R — Saint-Venant Equation Solver
# Solves full momentum equation using explicit
# finite-difference scheme for unsteady conduit flow

GRAVITY <- 32.174  # ft/s²

create_link <- function(length, roughness, a_full,
                        r_full, flow) {
    list(
        length    = length,
        roughness = roughness,
        a_full    = a_full,
        r_full    = r_full,
        flow      = flow,
        new_flow  = 0.0,
        velocity  = 0.0,
        froude    = 0.0
    )
}

get_friction_slope <- function(link, area, vel) {
    if (area <= 0.0) return(0.0)
    rh <- link$r_full * (area / link$a_full)
    if (rh <= 0.0) return(0.0)

    nv <- link$roughness * abs(vel)
    (nv * nv) / rh^(4.0 / 3.0)
}

update_flow <- function(link, h1, h2, a1, a2, dt) {
    a_avg <- 0.5 * (a1 + a2)
    if (a_avg <= 0.0) {
        link$new_flow <- 0.0
        return(link)
    }

    vel <- link$flow / a_avg
    sf <- get_friction_slope(link, a_avg, vel)

    head_grad <- GRAVITY * a_avg * (h1 - h2) / link$length
    fric_term <- GRAVITY * a_avg * sf
    if (link$flow < 0.0) fric_term <- -fric_term

    conv_term <- link$flow * abs(link$flow) /
                 (a_avg * link$length) * (a2 - a1)

    dq <- (head_grad - fric_term - conv_term) * dt
    link$new_flow <- link$flow + dq

    q_max <- link$a_full * 25.0
    link$new_flow <- max(-q_max, min(link$new_flow, q_max))

    link$velocity <- link$new_flow / a_avg
    depth <- a_avg / link$a_full * (2.0 * link$r_full)
    link$froude <- if (depth > 0.0)
        abs(link$velocity) / sqrt(GRAVITY * depth)
    else 0.0

    link
}`,
    delphi: `{ dynwave.pas — Dynamic Wave Solver }
{ SWMM5 Engine in Delphi — Saint-Venant Equation Solver }
{ Solves full momentum equation using explicit }
{ finite-difference scheme for unsteady conduit flow }

unit DynWave;

interface

uses Math;

const
  GRAVITY = 32.174;  { ft/s² }

type
  TLink = class
  public
    Length: Double;
    Roughness: Double;
    AFull: Double;
    RFull: Double;
    Flow: Double;
    NewFlow: Double;
    Velocity: Double;
    Froude: Double;
    function GetFrictionSlope(Area, Vel: Double): Double;
    procedure UpdateFlow(H1, H2, A1, A2, Dt: Double);
  end;

implementation

function TLink.GetFrictionSlope(Area, Vel: Double): Double;
var
  Rh, Nv: Double;
begin
  if Area <= 0.0 then begin Result := 0.0; Exit; end;
  Rh := RFull * (Area / AFull);
  if Rh <= 0.0 then begin Result := 0.0; Exit; end;

  Nv := Roughness * Abs(Vel);
  Result := (Nv * Nv) / Power(Rh, 4.0 / 3.0);
end;

procedure TLink.UpdateFlow(H1, H2, A1, A2, Dt: Double);
var
  AAvg, Vel, Sf, HeadGrad, FricTerm, ConvTerm: Double;
  Dq, QMax, Depth: Double;
begin
  AAvg := 0.5 * (A1 + A2);
  if AAvg <= 0.0 then begin NewFlow := 0.0; Exit; end;

  Vel := Flow / AAvg;
  Sf := GetFrictionSlope(AAvg, Vel);

  HeadGrad := GRAVITY * AAvg * (H1 - H2) / Length;
  FricTerm := GRAVITY * AAvg * Sf;
  if Flow < 0.0 then FricTerm := -FricTerm;

  ConvTerm := Flow * Abs(Flow)
              / (AAvg * Length) * (A2 - A1);

  Dq := (HeadGrad - FricTerm - ConvTerm) * Dt;
  NewFlow := Flow + Dq;

  QMax := AFull * 25.0;
  if NewFlow > QMax then NewFlow := QMax;
  if NewFlow < -QMax then NewFlow := -QMax;

  Velocity := NewFlow / AAvg;
  Depth := AAvg / AFull * (2.0 * RFull);
  if Depth > 0.0 then
    Froude := Abs(Velocity) / Sqrt(GRAVITY * Depth)
  else
    Froude := 0.0;
end;

end.`,
    typescript: `// dynwave.ts — Dynamic Wave Solver
// SWMM5 Engine in TypeScript — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

const GRAVITY: number = 32.174; // ft/s²

interface LinkState {
    newFlow: number;
    velocity: number;
    froude: number;
}

class Link {
    length: number;
    roughness: number;
    aFull: number;
    rFull: number;
    flow: number;
    newFlow: number = 0;
    velocity: number = 0;
    froude: number = 0;

    constructor(length: number, roughness: number,
                aFull: number, rFull: number, flow: number) {
        this.length = length;
        this.roughness = roughness;
        this.aFull = aFull;
        this.rFull = rFull;
        this.flow = flow;
    }

    getFrictionSlope(area: number, vel: number): number {
        if (area <= 0.0) return 0.0;
        const rh: number = this.rFull * (area / this.aFull);
        if (rh <= 0.0) return 0.0;

        const nv: number = this.roughness * Math.abs(vel);
        return (nv * nv) / Math.pow(rh, 4.0 / 3.0);
    }

    updateFlow(h1: number, h2: number,
               a1: number, a2: number, dt: number): void {
        const aAvg: number = 0.5 * (a1 + a2);
        if (aAvg <= 0.0) { this.newFlow = 0.0; return; }

        const vel: number = this.flow / aAvg;
        const sf: number = this.getFrictionSlope(aAvg, vel);

        const headGrad: number =
            GRAVITY * aAvg * (h1 - h2) / this.length;
        let fricTerm: number = GRAVITY * aAvg * sf;
        if (this.flow < 0.0) fricTerm = -fricTerm;

        const convTerm: number = this.flow * Math.abs(this.flow)
            / (aAvg * this.length) * (a2 - a1);

        const dq: number =
            (headGrad - fricTerm - convTerm) * dt;
        this.newFlow = this.flow + dq;

        const qMax: number = this.aFull * 25.0;
        this.newFlow = Math.max(-qMax,
            Math.min(this.newFlow, qMax));

        this.velocity = this.newFlow / aAvg;
        const depth: number =
            aAvg / this.aFull * (2.0 * this.rFull);
        this.froude = (depth > 0.0)
            ? Math.abs(this.velocity)
              / Math.sqrt(GRAVITY * depth)
            : 0.0;
    }
}

export { Link, GRAVITY };`,
    cuda: `// dynwave.cu — Dynamic Wave Solver
// SWMM5 Engine in CUDA — Saint-Venant Equation Solver
// Solves full momentum equation using parallel GPU
// finite-difference scheme for unsteady conduit flow

#include <math.h>

#define GRAVITY 32.174f  // ft/s²

struct Link {
    float length;
    float roughness;
    float aFull;
    float rFull;
    float flow;
    float newFlow;
    float velocity;
    float froude;
};

__device__ float getFrictionSlope(Link* link, float area,
                                   float vel)
{
    if (area <= 0.0f) return 0.0f;
    float rh = link->rFull * (area / link->aFull);
    if (rh <= 0.0f) return 0.0f;

    float nv = link->roughness * fabsf(vel);
    return (nv * nv) / powf(rh, 4.0f / 3.0f);
}

__global__ void dynwaveKernel(Link* links, float* h1,
    float* h2, float* a1, float* a2, float dt, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    Link* link = &links[idx];
    float aAvg = 0.5f * (a1[idx] + a2[idx]);
    if (aAvg <= 0.0f) {
        link->newFlow = 0.0f; return;
    }

    float vel = link->flow / aAvg;
    float sf = getFrictionSlope(link, aAvg, vel);

    float headGrad = GRAVITY * aAvg
                     * (h1[idx] - h2[idx]) / link->length;
    float fricTerm = GRAVITY * aAvg * sf;
    if (link->flow < 0.0f) fricTerm = -fricTerm;

    float convTerm = link->flow * fabsf(link->flow)
                     / (aAvg * link->length)
                     * (a2[idx] - a1[idx]);

    float dq = (headGrad - fricTerm - convTerm) * dt;
    link->newFlow = link->flow + dq;

    float qMax = link->aFull * 25.0f;
    link->newFlow = fmaxf(-qMax,
                          fminf(link->newFlow, qMax));

    link->velocity = link->newFlow / aAvg;
    float depth = aAvg / link->aFull * (2.0f * link->rFull);
    link->froude = (depth > 0.0f)
        ? fabsf(link->velocity) / sqrtf(GRAVITY * depth)
        : 0.0f;
}`,
    wasm: `(module
  ;; dynwave.wat — Dynamic Wave Solver
  ;; SWMM5 Engine in WebAssembly — Saint-Venant Solver
  ;; Solves full momentum equation using explicit
  ;; finite-difference scheme for unsteady conduit flow

  (func $getFrictionSlope
    (param $roughness f64) (param $aFull f64)
    (param $rFull f64) (param $area f64)
    (param $vel f64) (result f64)
    (local $rh f64) (local $nv f64)

    (if (f64.le (local.get $area) (f64.const 0.0))
      (then (return (f64.const 0.0))))

    (local.set $rh (f64.mul
      (local.get $rFull)
      (f64.div (local.get $area) (local.get $aFull))))

    (if (f64.le (local.get $rh) (f64.const 0.0))
      (then (return (f64.const 0.0))))

    (local.set $nv (f64.mul
      (local.get $roughness)
      (f64.abs (local.get $vel))))

    (f64.div
      (f64.mul (local.get $nv) (local.get $nv))
      (call $pow (local.get $rh)
                  (f64.const 1.3333333333333)))
  )

  (func $updateFlow
    (param $length f64) (param $roughness f64)
    (param $aFull f64) (param $rFull f64)
    (param $flow f64) (param $h1 f64)
    (param $h2 f64) (param $a1 f64)
    (param $a2 f64) (param $dt f64)
    (result f64 f64 f64)
    (local $aAvg f64) (local $vel f64)
    (local $sf f64) (local $headGrad f64)
    (local $fricTerm f64) (local $convTerm f64)
    (local $dq f64) (local $newFlow f64)
    (local $qMax f64) (local $depth f64)
    (local $velocity f64) (local $froude f64)

    (local.set $aAvg (f64.mul (f64.const 0.5)
      (f64.add (local.get $a1) (local.get $a2))))

    (if (f64.le (local.get $aAvg) (f64.const 0.0))
      (then (return (f64.const 0.0)
                    (f64.const 0.0) (f64.const 0.0))))

    (local.set $vel (f64.div
      (local.get $flow) (local.get $aAvg)))

    (local.set $sf (call $getFrictionSlope
      (local.get $roughness) (local.get $aFull)
      (local.get $rFull) (local.get $aAvg)
      (local.get $vel)))

    (local.set $headGrad (f64.div
      (f64.mul (f64.mul (f64.const 32.174)
        (local.get $aAvg))
        (f64.sub (local.get $h1) (local.get $h2)))
      (local.get $length)))

    (local.set $newFlow (f64.add (local.get $flow)
      (f64.mul (local.get $dq) (local.get $dt))))

    (local.get $newFlow)
    (local.get $velocity)
    (local.get $froude)
  )

  (func $pow (param f64) (param f64) (result f64)
    (f64.const 0.0))
)`,
    mojo: `# dynwave.mojo — Dynamic Wave Solver
# SWMM5 Engine in Mojo — Saint-Venant Equation Solver
# Solves full momentum equation using explicit
# finite-difference scheme for unsteady conduit flow

from math import abs, sqrt, pow

alias GRAVITY: Float64 = 32.174

struct Link:
    var length: Float64
    var roughness: Float64
    var a_full: Float64
    var r_full: Float64
    var flow: Float64
    var new_flow: Float64
    var velocity: Float64
    var froude: Float64

    fn __init__(inout self, length: Float64,
                roughness: Float64, a_full: Float64,
                r_full: Float64, flow: Float64):
        self.length = length
        self.roughness = roughness
        self.a_full = a_full
        self.r_full = r_full
        self.flow = flow
        self.new_flow = 0.0
        self.velocity = 0.0
        self.froude = 0.0

    fn get_friction_slope(self, area: Float64,
                          vel: Float64) -> Float64:
        if area <= 0.0:
            return 0.0
        var rh = self.r_full * (area / self.a_full)
        if rh <= 0.0:
            return 0.0

        var nv = self.roughness * abs(vel)
        return (nv * nv) / pow(rh, 4.0 / 3.0)

    fn update_flow(inout self, h1: Float64, h2: Float64,
                   a1: Float64, a2: Float64,
                   dt: Float64):
        var a_avg = 0.5 * (a1 + a2)
        if a_avg <= 0.0:
            self.new_flow = 0.0
            return

        var vel = self.flow / a_avg
        var sf = self.get_friction_slope(a_avg, vel)

        var head_grad = GRAVITY * a_avg * (h1 - h2) / self.length
        var fric_term = GRAVITY * a_avg * sf
        if self.flow < 0.0:
            fric_term = -fric_term

        var conv_term = (self.flow * abs(self.flow)
                         / (a_avg * self.length) * (a2 - a1))

        var dq = (head_grad - fric_term - conv_term) * dt
        self.new_flow = self.flow + dq

        var q_max = self.a_full * 25.0
        if self.new_flow > q_max:
            self.new_flow = q_max
        if self.new_flow < -q_max:
            self.new_flow = -q_max

        self.velocity = self.new_flow / a_avg
        var depth = a_avg / self.a_full * (2.0 * self.r_full)
        if depth > 0.0:
            self.froude = abs(self.velocity) / sqrt(GRAVITY * depth)
        else:
            self.froude = 0.0`,
    java: `// DynWave.java — Dynamic Wave Solver
// SWMM5 Engine in Java — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

package swmm;

public class Link {
    private static final double GRAVITY = 32.174;

    private double length;
    private double roughness;
    private double aFull;
    private double rFull;
    private double flow;
    private double newFlow;
    private double velocity;
    private double froude;

    public Link(double length, double roughness,
                double aFull, double rFull, double flow) {
        this.length = length;
        this.roughness = roughness;
        this.aFull = aFull;
        this.rFull = rFull;
        this.flow = flow;
    }

    public double getFrictionSlope(double area, double vel) {
        if (area <= 0.0) return 0.0;
        double rh = rFull * (area / aFull);
        if (rh <= 0.0) return 0.0;

        double nv = roughness * Math.abs(vel);
        return (nv * nv) / Math.pow(rh, 4.0 / 3.0);
    }

    public void updateFlow(double h1, double h2,
                           double a1, double a2, double dt) {
        double aAvg = 0.5 * (a1 + a2);
        if (aAvg <= 0.0) { newFlow = 0.0; return; }

        double vel = flow / aAvg;
        double sf = getFrictionSlope(aAvg, vel);

        double headGrad = GRAVITY * aAvg
                          * (h1 - h2) / length;
        double fricTerm = GRAVITY * aAvg * sf;
        if (flow < 0.0) fricTerm = -fricTerm;

        double convTerm = flow * Math.abs(flow)
                          / (aAvg * length) * (a2 - a1);

        double dq = (headGrad - fricTerm - convTerm) * dt;
        newFlow = flow + dq;

        double qMax = aFull * 25.0;
        newFlow = Math.max(-qMax, Math.min(newFlow, qMax));

        velocity = newFlow / aAvg;
        double depth = aAvg / aFull * (2.0 * rFull);
        froude = (depth > 0.0)
            ? Math.abs(velocity) / Math.sqrt(GRAVITY * depth)
            : 0.0;
    }

    public double getNewFlow() { return newFlow; }
    public double getVelocity() { return velocity; }
    public double getFroude() { return froude; }
}`,
    nim: `# dynwave.nim — Dynamic Wave Solver
# SWMM5 Engine in Nim — Saint-Venant Equation Solver
# Solves full momentum equation using explicit
# finite-difference scheme for unsteady conduit flow

import math

const Gravity = 32.174  # ft/s²

type
  Link = object
    length: float64
    roughness: float64
    aFull: float64
    rFull: float64
    flow: float64
    newFlow: float64
    velocity: float64
    froude: float64

proc getFrictionSlope(link: Link, area: float64,
                      vel: float64): float64 =
  if area <= 0.0: return 0.0
  let rh = link.rFull * (area / link.aFull)
  if rh <= 0.0: return 0.0

  let nv = link.roughness * abs(vel)
  result = (nv * nv) / pow(rh, 4.0 / 3.0)

proc updateFlow(link: var Link, h1, h2: float64,
                a1, a2, dt: float64) =
  let aAvg = 0.5 * (a1 + a2)
  if aAvg <= 0.0:
    link.newFlow = 0.0
    return

  let vel = link.flow / aAvg
  let sf = getFrictionSlope(link, aAvg, vel)

  let headGrad = Gravity * aAvg * (h1 - h2) / link.length
  var fricTerm = Gravity * aAvg * sf
  if link.flow < 0.0: fricTerm = -fricTerm

  let convTerm = link.flow * abs(link.flow) /
                 (aAvg * link.length) * (a2 - a1)

  let dq = (headGrad - fricTerm - convTerm) * dt
  link.newFlow = link.flow + dq

  let qMax = link.aFull * 25.0
  link.newFlow = clamp(link.newFlow, -qMax, qMax)

  link.velocity = link.newFlow / aAvg
  let depth = aAvg / link.aFull * (2.0 * link.rFull)
  link.froude =
    if depth > 0.0:
      abs(link.velocity) / sqrt(Gravity * depth)
    else: 0.0`,
    ada: `-- dynwave.adb — Dynamic Wave Solver
-- SWMM5 Engine in Ada — Saint-Venant Equation Solver
-- Solves full momentum equation using explicit
-- finite-difference scheme for unsteady conduit flow

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body DynWave is

   Gravity : constant Float := 32.174;

   type Link is record
      Length    : Float;
      Roughness : Float;
      A_Full   : Float;
      R_Full   : Float;
      Flow     : Float;
      New_Flow : Float;
      Velocity : Float;
      Froude   : Float;
   end record;

   function Get_Friction_Slope
     (L : Link; Area : Float; Vel : Float) return Float
   is
      Rh : Float;
      Nv : Float;
   begin
      if Area <= 0.0 then return 0.0; end if;
      Rh := L.R_Full * (Area / L.A_Full);
      if Rh <= 0.0 then return 0.0; end if;

      Nv := L.Roughness * abs(Vel);
      return (Nv * Nv) / (Rh ** (4.0 / 3.0));
   end Get_Friction_Slope;

   procedure Update_Flow
     (L : in out Link; H1, H2 : Float;
      A1, A2, Dt : Float)
   is
      A_Avg     : Float;
      Vel       : Float;
      Sf        : Float;
      Head_Grad : Float;
      Fric_Term : Float;
      Conv_Term : Float;
      Dq        : Float;
      Q_Max     : Float;
      Depth     : Float;
   begin
      A_Avg := 0.5 * (A1 + A2);
      if A_Avg <= 0.0 then
         L.New_Flow := 0.0; return;
      end if;

      Vel := L.Flow / A_Avg;
      Sf := Get_Friction_Slope(L, A_Avg, Vel);

      Head_Grad := Gravity * A_Avg * (H1 - H2) / L.Length;
      Fric_Term := Gravity * A_Avg * Sf;
      if L.Flow < 0.0 then Fric_Term := -Fric_Term; end if;

      Conv_Term := L.Flow * abs(L.Flow)
                   / (A_Avg * L.Length) * (A2 - A1);

      Dq := (Head_Grad - Fric_Term - Conv_Term) * Dt;
      L.New_Flow := L.Flow + Dq;

      Q_Max := L.A_Full * 25.0;
      if L.New_Flow > Q_Max then L.New_Flow := Q_Max; end if;
      if L.New_Flow < -Q_Max then L.New_Flow := -Q_Max; end if;

      L.Velocity := L.New_Flow / A_Avg;
      Depth := A_Avg / L.A_Full * (2.0 * L.R_Full);
      if Depth > 0.0 then
         L.Froude := abs(L.Velocity)
                     / Sqrt(Gravity * Depth);
      else
         L.Froude := 0.0;
      end if;
   end Update_Flow;

end DynWave;`,
    chapel: `// dynwave.chpl — Dynamic Wave Solver
// SWMM5 Engine in Chapel — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

param GRAVITY: real = 32.174;  // ft/s²

record Link {
    var length: real;
    var roughness: real;
    var aFull: real;
    var rFull: real;
    var flow: real;
    var newFlow: real;
    var velocity: real;
    var froude: real;
}

proc getFrictionSlope(ref link: Link, area: real,
                      vel: real): real {
    if area <= 0.0 then return 0.0;
    var rh = link.rFull * (area / link.aFull);
    if rh <= 0.0 then return 0.0;

    var nv = link.roughness * abs(vel);
    return (nv * nv) / (rh ** (4.0 / 3.0));
}

proc updateFlow(ref link: Link, h1: real, h2: real,
                a1: real, a2: real, dt: real) {
    var aAvg = 0.5 * (a1 + a2);
    if aAvg <= 0.0 {
        link.newFlow = 0.0;
        return;
    }

    var vel = link.flow / aAvg;
    var sf = getFrictionSlope(link, aAvg, vel);

    var headGrad = GRAVITY * aAvg * (h1 - h2) / link.length;
    var fricTerm = GRAVITY * aAvg * sf;
    if link.flow < 0.0 then fricTerm = -fricTerm;

    var convTerm = link.flow * abs(link.flow)
                   / (aAvg * link.length) * (a2 - a1);

    var dq = (headGrad - fricTerm - convTerm) * dt;
    link.newFlow = link.flow + dq;

    var qMax = link.aFull * 25.0;
    link.newFlow = max(-qMax, min(link.newFlow, qMax));

    link.velocity = link.newFlow / aAvg;
    var depth = aAvg / link.aFull * (2.0 * link.rFull);
    link.froude = if depth > 0.0
        then abs(link.velocity) / sqrt(GRAVITY * depth)
        else 0.0;
}`,
    swift: `// dynwave.swift — Dynamic Wave Solver
// SWMM5 Engine in Swift — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

import Foundation

let GRAVITY: Double = 32.174  // ft/s²

struct Link {
    let length: Double
    let roughness: Double
    let aFull: Double
    let rFull: Double
    var flow: Double
    var newFlow: Double = 0.0
    var velocity: Double = 0.0
    var froude: Double = 0.0

    func getFrictionSlope(area: Double,
                          vel: Double) -> Double {
        guard area > 0.0 else { return 0.0 }
        let rh = rFull * (area / aFull)
        guard rh > 0.0 else { return 0.0 }

        let nv = roughness * abs(vel)
        return (nv * nv) / pow(rh, 4.0 / 3.0)
    }

    mutating func updateFlow(h1: Double, h2: Double,
                             a1: Double, a2: Double,
                             dt: Double) {
        let aAvg = 0.5 * (a1 + a2)
        guard aAvg > 0.0 else {
            newFlow = 0.0; return
        }

        let vel = flow / aAvg
        let sf = getFrictionSlope(area: aAvg, vel: vel)

        let headGrad = GRAVITY * aAvg
                       * (h1 - h2) / length
        var fricTerm = GRAVITY * aAvg * sf
        if flow < 0.0 { fricTerm = -fricTerm }

        let convTerm = flow * abs(flow)
                       / (aAvg * length) * (a2 - a1)

        let dq = (headGrad - fricTerm - convTerm) * dt
        newFlow = flow + dq

        let qMax = aFull * 25.0
        newFlow = max(-qMax, min(newFlow, qMax))

        velocity = newFlow / aAvg
        let depth = aAvg / aFull * (2.0 * rFull)
        froude = depth > 0.0
            ? abs(velocity) / sqrt(GRAVITY * depth)
            : 0.0
    }
}`,
    kotlin: `// DynWave.kt — Dynamic Wave Solver
// SWMM5 Engine in Kotlin — Saint-Venant Equation Solver
// Solves full momentum equation using explicit
// finite-difference scheme for unsteady conduit flow

package swmm

import kotlin.math.*

const val GRAVITY = 32.174  // ft/s²

data class Link(
    val length: Double,
    val roughness: Double,
    val aFull: Double,
    val rFull: Double,
    var flow: Double,
    var newFlow: Double = 0.0,
    var velocity: Double = 0.0,
    var froude: Double = 0.0
) {
    fun getFrictionSlope(area: Double, vel: Double): Double {
        if (area <= 0.0) return 0.0
        val rh = rFull * (area / aFull)
        if (rh <= 0.0) return 0.0

        val nv = roughness * abs(vel)
        return (nv * nv) / rh.pow(4.0 / 3.0)
    }

    fun updateFlow(h1: Double, h2: Double,
                   a1: Double, a2: Double, dt: Double) {
        val aAvg = 0.5 * (a1 + a2)
        if (aAvg <= 0.0) { newFlow = 0.0; return }

        val vel = flow / aAvg
        val sf = getFrictionSlope(aAvg, vel)

        val headGrad = GRAVITY * aAvg
                       * (h1 - h2) / length
        var fricTerm = GRAVITY * aAvg * sf
        if (flow < 0.0) fricTerm = -fricTerm

        val convTerm = flow * abs(flow)
                       / (aAvg * length) * (a2 - a1)

        val dq = (headGrad - fricTerm - convTerm) * dt
        newFlow = flow + dq

        val qMax = aFull * 25.0
        newFlow = newFlow.coerceIn(-qMax, qMax)

        velocity = newFlow / aAvg
        val depth = aAvg / aFull * (2.0 * rFull)
        froude = if (depth > 0.0)
            abs(velocity) / sqrt(GRAVITY * depth)
        else 0.0
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
    zig: `// flowrout.zig — Flow Routing Dispatch
// SWMM5 Engine in Zig — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

const std = @import("std");
const math = std.math;

const RoutingMethod = enum {
    steady_flow,
    kin_wave,
    dyn_wave,
};

const RoutingParams = struct {
    area: f64,        // cross-section area (ft²)
    radius: f64,      // hydraulic radius (ft)
    roughness: f64,   // Manning's n
    slope: f64,       // conduit slope
    length: f64,      // conduit length (ft)
    q_in: f64,        // inflow (cfs)
    q_out: f64,       // outflow (cfs)
    q_lat: f64,       // lateral inflow (cfs)

    /// Manning's equation: Q = (1/n) * A * R^(2/3) * S^(1/2)
    pub fn steadyGetFlow(self: RoutingParams) f64 {
        if (self.area <= 0.0 or self.slope <= 0.0) return 0.0;

        return (1.0 / self.roughness) *
            self.area *
            math.pow(f64, self.radius, 2.0 / 3.0) *
            @sqrt(self.slope);
    }

    /// Kinematic wave: Courant-limited explicit scheme
    pub fn kinwaveGetFlow(self: RoutingParams, dt: f64) f64 {
        if (self.area <= 0.0) return 0.0;

        var celerity = (5.0 / 3.0) * self.q_in / self.area;
        if (celerity <= 0.0) celerity = 0.01;

        var courant = celerity * dt / self.length;
        if (courant > 1.0) courant = 1.0;

        const q_new = self.q_out +
            courant * (self.q_in - self.q_out) +
            self.q_lat * self.length;

        return @max(q_new, 0.0);
    }

    /// Dispatch to appropriate routing method
    pub fn route(self: RoutingParams, method: RoutingMethod,
                 dt: f64) f64 {
        return switch (method) {
            .steady_flow => self.steadyGetFlow(),
            .kin_wave => self.kinwaveGetFlow(dt),
            .dyn_wave => self.q_in,
        };
    }
};`,
    cpp: `// flowrout.cpp — Flow Routing Dispatch
// SWMM5 Engine in C++ — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

#include <cmath>
#include <algorithm>

namespace swmm {

enum class RoutingMethod { SteadyFlow, KinWave, DynWave };

struct RoutingParams {
    double area;       // cross-section area (ft²)
    double radius;     // hydraulic radius (ft)
    double roughness;  // Manning's n
    double slope;      // conduit slope
    double length;     // conduit length (ft)
    double qIn;        // inflow (cfs)
    double qOut;       // outflow (cfs)
    double qLat;       // lateral inflow (cfs)

    double steadyFlow() const {
        if (area <= 0.0 || slope <= 0.0) return 0.0;

        return (1.0 / roughness) * area
               * std::pow(radius, 2.0 / 3.0)
               * std::sqrt(slope);
    }

    double kinwaveFlow(double dt) const {
        if (area <= 0.0) return 0.0;

        double celerity = (5.0 / 3.0) * qIn / area;
        if (celerity <= 0.0) celerity = 0.01;

        double courant = std::min(
            celerity * dt / length, 1.0);

        double qNew = qOut
            + courant * (qIn - qOut)
            + qLat * length;

        return std::max(qNew, 0.0);
    }

    double route(RoutingMethod method, double dt) const {
        switch (method) {
            case RoutingMethod::SteadyFlow:
                return steadyFlow();
            case RoutingMethod::KinWave:
                return kinwaveFlow(dt);
            case RoutingMethod::DynWave:
                return qIn;
            default:
                return 0.0;
        }
    }
};

} // namespace swmm`,
    csharp: `// FlowRout.cs — Flow Routing Dispatch
// SWMM5 Engine in C# — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

using System;

namespace Swmm
{
    public enum RoutingMethod
    {
        SteadyFlow,
        KinWave,
        DynWave
    }

    public class RoutingParams
    {
        public double Area { get; set; }
        public double Radius { get; set; }
        public double Roughness { get; set; }
        public double Slope { get; set; }
        public double Length { get; set; }
        public double QIn { get; set; }
        public double QOut { get; set; }
        public double QLat { get; set; }

        public double SteadyFlow()
        {
            if (Area <= 0.0 || Slope <= 0.0) return 0.0;

            return (1.0 / Roughness) * Area
                   * Math.Pow(Radius, 2.0 / 3.0)
                   * Math.Sqrt(Slope);
        }

        public double KinwaveFlow(double dt)
        {
            if (Area <= 0.0) return 0.0;

            double celerity = (5.0 / 3.0) * QIn / Area;
            if (celerity <= 0.0) celerity = 0.01;

            double courant = Math.Min(
                celerity * dt / Length, 1.0);

            double qNew = QOut
                + courant * (QIn - QOut)
                + QLat * Length;

            return Math.Max(qNew, 0.0);
        }

        public double Route(RoutingMethod method, double dt)
        {
            switch (method)
            {
                case RoutingMethod.SteadyFlow:
                    return SteadyFlow();
                case RoutingMethod.KinWave:
                    return KinwaveFlow(dt);
                case RoutingMethod.DynWave:
                    return QIn;
                default:
                    return 0.0;
            }
        }
    }
}`,
    matlab: `% flowrout.m — Flow Routing Dispatch
% SWMM5 Engine in MATLAB — Routing Method Dispatcher
% Dispatches flow calculations to steady, kinematic
% wave, or dynamic wave routing methods

% Routing method constants
% STEADY_FLOW = 0; KINWAVE = 1; DYNWAVE = 2

function rp = create_routing_params(area, radius, ...
                roughness, slope, len, q_in, q_out, q_lat)
    rp.area      = area;
    rp.radius    = radius;
    rp.roughness = roughness;
    rp.slope     = slope;
    rp.length    = len;
    rp.q_in      = q_in;
    rp.q_out     = q_out;
    rp.q_lat     = q_lat;
end

function q = steady_flow(rp)
    % Manning's equation: Q = (1/n)*A*R^(2/3)*S^(1/2)
    if rp.area <= 0.0 || rp.slope <= 0.0
        q = 0.0;
        return;
    end
    q = (1.0 / rp.roughness) * rp.area ...
        * rp.radius^(2.0/3.0) * sqrt(rp.slope);
end

function q_new = kinwave_flow(rp, dt)
    % Kinematic wave with Courant-limited explicit scheme
    if rp.area <= 0.0
        q_new = 0.0;
        return;
    end

    celerity = (5.0 / 3.0) * rp.q_in / rp.area;
    if celerity <= 0.0
        celerity = 0.01;
    end

    courant = min(celerity * dt / rp.length, 1.0);

    q_new = rp.q_out ...
            + courant * (rp.q_in - rp.q_out) ...
            + rp.q_lat * rp.length;
    q_new = max(q_new, 0.0);
end

function q = flowrout_route(rp, method, dt)
    STEADY_FLOW = 0; KINWAVE = 1; DYNWAVE = 2;
    switch method
        case STEADY_FLOW
            q = steady_flow(rp);
        case KINWAVE
            q = kinwave_flow(rp, dt);
        case DYNWAVE
            q = rp.q_in;
        otherwise
            q = 0.0;
    end
end`,
    r: `# flowrout.R — Flow Routing Dispatch
# SWMM5 Engine in R — Routing Method Dispatcher
# Dispatches flow calculations to steady, kinematic
# wave, or dynamic wave routing methods

STEADY_FLOW <- 0L
KINWAVE     <- 1L
DYNWAVE     <- 2L

create_routing_params <- function(area, radius, roughness,
                                   slope, length, q_in,
                                   q_out, q_lat) {
    list(
        area      = area,
        radius    = radius,
        roughness = roughness,
        slope     = slope,
        length    = length,
        q_in      = q_in,
        q_out     = q_out,
        q_lat     = q_lat
    )
}

steady_flow <- function(rp) {
    # Manning's equation: Q = (1/n)*A*R^(2/3)*S^(1/2)
    if (rp$area <= 0.0 || rp$slope <= 0.0) return(0.0)

    (1.0 / rp$roughness) * rp$area *
        rp$radius^(2.0 / 3.0) * sqrt(rp$slope)
}

kinwave_flow <- function(rp, dt) {
    # Kinematic wave with Courant-limited explicit scheme
    if (rp$area <= 0.0) return(0.0)

    celerity <- (5.0 / 3.0) * rp$q_in / rp$area
    if (celerity <= 0.0) celerity <- 0.01

    courant <- min(celerity * dt / rp$length, 1.0)

    q_new <- rp$q_out +
             courant * (rp$q_in - rp$q_out) +
             rp$q_lat * rp$length

    max(q_new, 0.0)
}

flowrout_route <- function(rp, method, dt) {
    # Dispatch to the appropriate routing method
    if (method == STEADY_FLOW) {
        steady_flow(rp)
    } else if (method == KINWAVE) {
        kinwave_flow(rp, dt)
    } else if (method == DYNWAVE) {
        rp$q_in
    } else {
        0.0
    }
}`,
    delphi: `{ flowrout.pas — Flow Routing Dispatch }
{ SWMM5 Engine in Delphi — Routing Method Dispatcher }
{ Dispatches flow calculations to steady, kinematic }
{ wave, or dynamic wave routing methods }

unit FlowRout;

interface

type
  TRoutingMethod = (rmSteadyFlow, rmKinWave, rmDynWave);

  TRoutingParams = class
  private
    FArea: Double;
    FRadius: Double;
    FRoughness: Double;
    FSlope: Double;
    FLength: Double;
    FQIn: Double;
    FQOut: Double;
    FQLat: Double;
  public
    constructor Create(AArea, ARadius, ARoughness,
      ASlope, ALength, AQIn, AQOut, AQLat: Double);
    function SteadyFlow: Double;
    function KinwaveFlow(Dt: Double): Double;
    function Route(Method: TRoutingMethod;
                   Dt: Double): Double;
  end;

implementation

uses Math;

constructor TRoutingParams.Create(AArea, ARadius,
  ARoughness, ASlope, ALength, AQIn, AQOut,
  AQLat: Double);
begin
  FArea      := AArea;
  FRadius    := ARadius;
  FRoughness := ARoughness;
  FSlope     := ASlope;
  FLength    := ALength;
  FQIn       := AQIn;
  FQOut      := AQOut;
  FQLat      := AQLat;
end;

function TRoutingParams.SteadyFlow: Double;
begin
  if (FArea <= 0.0) or (FSlope <= 0.0) then
    Exit(0.0);

  Result := (1.0 / FRoughness) * FArea
            * Power(FRadius, 2.0/3.0)
            * Sqrt(FSlope);
end;

function TRoutingParams.KinwaveFlow(Dt: Double): Double;
var
  Celerity, Courant: Double;
begin
  if FArea <= 0.0 then
    Exit(0.0);

  Celerity := (5.0 / 3.0) * FQIn / FArea;
  if Celerity <= 0.0 then
    Celerity := 0.01;

  Courant := Celerity * Dt / FLength;
  if Courant > 1.0 then
    Courant := 1.0;

  Result := FQOut + Courant * (FQIn - FQOut)
            + FQLat * FLength;
  if Result < 0.0 then
    Result := 0.0;
end;

function TRoutingParams.Route(Method: TRoutingMethod;
                               Dt: Double): Double;
begin
  case Method of
    rmSteadyFlow: Result := SteadyFlow;
    rmKinWave:    Result := KinwaveFlow(Dt);
    rmDynWave:    Result := FQIn;
  else
    Result := 0.0;
  end;
end;

end.`,
    typescript: `// flowrout.ts — Flow Routing Dispatch
// SWMM5 Engine in TypeScript — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

enum RoutingMethod {
    SteadyFlow,
    KinWave,
    DynWave,
}

interface IRoutingParams {
    area: number;
    radius: number;
    roughness: number;
    slope: number;
    length: number;
    qIn: number;
    qOut: number;
    qLat: number;
}

class RoutingParams implements IRoutingParams {
    constructor(
        public readonly area: number,
        public readonly radius: number,
        public readonly roughness: number,
        public readonly slope: number,
        public readonly length: number,
        public readonly qIn: number,
        public readonly qOut: number,
        public readonly qLat: number,
    ) {}

    steadyFlow(): number {
        if (this.area <= 0.0 || this.slope <= 0.0) return 0.0;

        return (1.0 / this.roughness) * this.area
               * Math.pow(this.radius, 2.0 / 3.0)
               * Math.sqrt(this.slope);
    }

    kinwaveFlow(dt: number): number {
        if (this.area <= 0.0) return 0.0;

        let celerity: number = (5.0 / 3.0)
                               * this.qIn / this.area;
        if (celerity <= 0.0) celerity = 0.01;

        const courant: number = Math.min(
            celerity * dt / this.length, 1.0);

        const qNew: number = this.qOut
            + courant * (this.qIn - this.qOut)
            + this.qLat * this.length;

        return Math.max(qNew, 0.0);
    }

    route(method: RoutingMethod, dt: number): number {
        switch (method) {
            case RoutingMethod.SteadyFlow:
                return this.steadyFlow();
            case RoutingMethod.KinWave:
                return this.kinwaveFlow(dt);
            case RoutingMethod.DynWave:
                return this.qIn;
            default:
                return 0.0;
        }
    }
}

export { RoutingMethod, RoutingParams };`,
    cuda: `// flowrout.cu — Flow Routing Dispatch
// SWMM5 Engine in CUDA — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

#include <math.h>

#define STEADY_FLOW 0
#define KINWAVE     1
#define DYNWAVE     2

struct RoutingParams {
    float area;
    float radius;
    float roughness;
    float slope;
    float length;
    float qIn;
    float qOut;
    float qLat;
};

__device__ float steadyFlow(const RoutingParams* rp)
{
    if (rp->area <= 0.0f || rp->slope <= 0.0f) return 0.0f;

    return (1.0f / rp->roughness) * rp->area
           * powf(rp->radius, 2.0f / 3.0f)
           * sqrtf(rp->slope);
}

__device__ float kinwaveFlow(const RoutingParams* rp,
                              float dt)
{
    if (rp->area <= 0.0f) return 0.0f;

    float celerity = (5.0f / 3.0f) * rp->qIn / rp->area;
    if (celerity <= 0.0f) celerity = 0.01f;

    float courant = celerity * dt / rp->length;
    if (courant > 1.0f) courant = 1.0f;

    float qNew = rp->qOut
        + courant * (rp->qIn - rp->qOut)
        + rp->qLat * rp->length;

    return fmaxf(qNew, 0.0f);
}

__global__ void routeFlowKernel(RoutingParams* params,
    int* methods, float dt, float* results, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    RoutingParams rp = params[idx];
    int method = methods[idx];

    if (method == STEADY_FLOW)
        results[idx] = steadyFlow(&rp);
    else if (method == KINWAVE)
        results[idx] = kinwaveFlow(&rp, dt);
    else if (method == DYNWAVE)
        results[idx] = rp.qIn;
    else
        results[idx] = 0.0f;
}`,
    wasm: `;; flowrout.wat — Flow Routing Dispatch
;; SWMM5 Engine in WebAssembly — Routing Method Dispatcher
;; Dispatches flow calculations to steady, kinematic
;; wave, or dynamic wave routing methods

(module
  (func $steadyFlow
    (param $area f64) (param $radius f64)
    (param $roughness f64) (param $slope f64)
    (result f64)

    (if (result f64) (f64.le (local.get $area) (f64.const 0))
      (then (f64.const 0))
      (else
        (if (result f64) (f64.le (local.get $slope) (f64.const 0))
          (then (f64.const 0))
          (else
            (f64.mul
              (f64.mul
                (f64.div (f64.const 1.0) (local.get $roughness))
                (local.get $area))
              (f64.mul
                (call $pow (local.get $radius)
                           (f64.const 0.6667))
                (f64.sqrt (local.get $slope))))))))
  )

  (func $kinwaveFlow
    (param $area f64) (param $length f64)
    (param $qIn f64) (param $qOut f64)
    (param $qLat f64) (param $dt f64)
    (result f64)
    (local $celerity f64)
    (local $courant f64)
    (local $qNew f64)

    (if (result f64) (f64.le (local.get $area) (f64.const 0))
      (then (f64.const 0))
      (else
        (local.set $celerity
          (f64.div
            (f64.mul (f64.const 1.6667) (local.get $qIn))
            (local.get $area)))
        (if (f64.le (local.get $celerity) (f64.const 0))
          (then (local.set $celerity (f64.const 0.01))))
        (local.set $courant
          (f64.div
            (f64.mul (local.get $celerity) (local.get $dt))
            (local.get $length)))
        (if (f64.gt (local.get $courant) (f64.const 1.0))
          (then (local.set $courant (f64.const 1.0))))
        (local.set $qNew
          (f64.add
            (f64.add
              (local.get $qOut)
              (f64.mul (local.get $courant)
                (f64.sub (local.get $qIn) (local.get $qOut))))
            (f64.mul (local.get $qLat) (local.get $length))))
        (f64.max (local.get $qNew) (f64.const 0))))
  )

  (func $route
    (param $method i32)
    (param $area f64) (param $radius f64)
    (param $roughness f64) (param $slope f64)
    (param $length f64) (param $qIn f64)
    (param $qOut f64) (param $qLat f64)
    (param $dt f64)
    (result f64)

    (if (result f64) (i32.eq (local.get $method) (i32.const 0))
      (then (call $steadyFlow
        (local.get $area) (local.get $radius)
        (local.get $roughness) (local.get $slope)))
      (else
        (if (result f64) (i32.eq (local.get $method) (i32.const 1))
          (then (call $kinwaveFlow
            (local.get $area) (local.get $length)
            (local.get $qIn) (local.get $qOut)
            (local.get $qLat) (local.get $dt)))
          (else
            (if (result f64) (i32.eq (local.get $method) (i32.const 2))
              (then (local.get $qIn))
              (else (f64.const 0)))))))
  )

  (func $pow (param $base f64) (param $exp f64) (result f64)
    (f64.const 0))
  (export "route" (func $route))
)`,
    mojo: `# flowrout.mojo — Flow Routing Dispatch
# SWMM5 Engine in Mojo — Routing Method Dispatcher
# Dispatches flow calculations to steady, kinematic
# wave, or dynamic wave routing methods

from math import pow, sqrt

@value
struct RoutingMethod:
    var value: Int
    alias STEADY_FLOW = RoutingMethod(0)
    alias KINWAVE = RoutingMethod(1)
    alias DYNWAVE = RoutingMethod(2)

@value
struct RoutingParams:
    var area: Float64
    var radius: Float64
    var roughness: Float64
    var slope: Float64
    var length: Float64
    var q_in: Float64
    var q_out: Float64
    var q_lat: Float64

    fn steady_flow(self) -> Float64:
        if self.area <= 0.0 or self.slope <= 0.0:
            return 0.0

        return ((1.0 / self.roughness) * self.area
                * pow(self.radius, 2.0 / 3.0)
                * sqrt(self.slope))

    fn kinwave_flow(self, dt: Float64) -> Float64:
        if self.area <= 0.0:
            return 0.0

        var celerity = (5.0 / 3.0) * self.q_in / self.area
        if celerity <= 0.0:
            celerity = 0.01

        var courant = celerity * dt / self.length
        if courant > 1.0:
            courant = 1.0

        let q_new = (self.q_out
            + courant * (self.q_in - self.q_out)
            + self.q_lat * self.length)

        return max(q_new, 0.0)

    fn route(self, method: RoutingMethod,
             dt: Float64) -> Float64:
        if method.value == RoutingMethod.STEADY_FLOW.value:
            return self.steady_flow()
        elif method.value == RoutingMethod.KINWAVE.value:
            return self.kinwave_flow(dt)
        elif method.value == RoutingMethod.DYNWAVE.value:
            return self.q_in
        return 0.0`,
    java: `// FlowRout.java — Flow Routing Dispatch
// SWMM5 Engine in Java — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

package swmm;

public class FlowRout {

    public enum RoutingMethod {
        STEADY_FLOW, KINWAVE, DYNWAVE
    }

    private final double area;
    private final double radius;
    private final double roughness;
    private final double slope;
    private final double length;
    private final double qIn;
    private final double qOut;
    private final double qLat;

    public FlowRout(double area, double radius,
                    double roughness, double slope,
                    double length, double qIn,
                    double qOut, double qLat) {
        this.area      = area;
        this.radius    = radius;
        this.roughness = roughness;
        this.slope     = slope;
        this.length    = length;
        this.qIn       = qIn;
        this.qOut      = qOut;
        this.qLat      = qLat;
    }

    public double steadyFlow() {
        if (area <= 0.0 || slope <= 0.0) return 0.0;

        return (1.0 / roughness) * area
               * Math.pow(radius, 2.0 / 3.0)
               * Math.sqrt(slope);
    }

    public double kinwaveFlow(double dt) {
        if (area <= 0.0) return 0.0;

        double celerity = (5.0 / 3.0) * qIn / area;
        if (celerity <= 0.0) celerity = 0.01;

        double courant = Math.min(
            celerity * dt / length, 1.0);

        double qNew = qOut
            + courant * (qIn - qOut)
            + qLat * length;

        return Math.max(qNew, 0.0);
    }

    public double route(RoutingMethod method, double dt) {
        switch (method) {
            case STEADY_FLOW: return steadyFlow();
            case KINWAVE:     return kinwaveFlow(dt);
            case DYNWAVE:     return qIn;
            default:          return 0.0;
        }
    }
}`,
    nim: `# flowrout.nim — Flow Routing Dispatch
# SWMM5 Engine in Nim — Routing Method Dispatcher
# Dispatches flow calculations to steady, kinematic
# wave, or dynamic wave routing methods

import math

type
  RoutingMethod = enum
    rmSteadyFlow, rmKinWave, rmDynWave

  RoutingParams = object
    area: float64
    radius: float64
    roughness: float64
    slope: float64
    length: float64
    qIn: float64
    qOut: float64
    qLat: float64

proc steadyFlow(rp: RoutingParams): float64 =
  if rp.area <= 0.0 or rp.slope <= 0.0:
    return 0.0

  result = (1.0 / rp.roughness) * rp.area *
           pow(rp.radius, 2.0 / 3.0) *
           sqrt(rp.slope)

proc kinwaveFlow(rp: RoutingParams, dt: float64): float64 =
  if rp.area <= 0.0:
    return 0.0

  var celerity = (5.0 / 3.0) * rp.qIn / rp.area
  if celerity <= 0.0:
    celerity = 0.01

  var courant = celerity * dt / rp.length
  if courant > 1.0:
    courant = 1.0

  let qNew = rp.qOut +
             courant * (rp.qIn - rp.qOut) +
             rp.qLat * rp.length

  result = max(qNew, 0.0)

proc route(rp: RoutingParams, method: RoutingMethod,
           dt: float64): float64 =
  case method
  of rmSteadyFlow:
    result = steadyFlow(rp)
  of rmKinWave:
    result = kinwaveFlow(rp, dt)
  of rmDynWave:
    result = rp.qIn`,
    ada: `-- flowrout.adb — Flow Routing Dispatch
-- SWMM5 Engine in Ada — Routing Method Dispatcher
-- Dispatches flow calculations to steady, kinematic
-- wave, or dynamic wave routing methods

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body FlowRout is

   type Routing_Method is (Steady_Flow, Kin_Wave, Dyn_Wave);

   type Routing_Params is record
      Area      : Float := 0.0;
      Radius    : Float := 0.0;
      Roughness : Float := 0.0;
      Slope     : Float := 0.0;
      Length    : Float := 0.0;
      Q_In      : Float := 0.0;
      Q_Out     : Float := 0.0;
      Q_Lat     : Float := 0.0;
   end record;

   function Steady_Get_Flow
     (RP : Routing_Params) return Float
   is
   begin
      if RP.Area <= 0.0 or else RP.Slope <= 0.0 then
         return 0.0;
      end if;

      return (1.0 / RP.Roughness) * RP.Area
             * (RP.Radius ** (2.0 / 3.0))
             * Sqrt(RP.Slope);
   end Steady_Get_Flow;

   function Kinwave_Get_Flow
     (RP : Routing_Params; Dt : Float) return Float
   is
      Celerity : Float;
      Courant  : Float;
      Q_New    : Float;
   begin
      if RP.Area <= 0.0 then
         return 0.0;
      end if;

      Celerity := (5.0 / 3.0) * RP.Q_In / RP.Area;
      if Celerity <= 0.0 then
         Celerity := 0.01;
      end if;

      Courant := Celerity * Dt / RP.Length;
      if Courant > 1.0 then
         Courant := 1.0;
      end if;

      Q_New := RP.Q_Out
               + Courant * (RP.Q_In - RP.Q_Out)
               + RP.Q_Lat * RP.Length;

      return Float'Max(Q_New, 0.0);
   end Kinwave_Get_Flow;

   function Route
     (RP : Routing_Params; Method : Routing_Method;
      Dt : Float) return Float
   is
   begin
      case Method is
         when Steady_Flow => return Steady_Get_Flow(RP);
         when Kin_Wave    => return Kinwave_Get_Flow(RP, Dt);
         when Dyn_Wave    => return RP.Q_In;
      end case;
   end Route;

end FlowRout;`,
    chapel: `// flowrout.chpl — Flow Routing Dispatch
// SWMM5 Engine in Chapel — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

enum RoutingMethod { SteadyFlow, KinWave, DynWave }

record RoutingParams {
    var area: real;
    var radius: real;
    var roughness: real;
    var slope: real;
    var length: real;
    var qIn: real;
    var qOut: real;
    var qLat: real;
}

proc steadyFlow(const ref rp: RoutingParams): real {
    if rp.area <= 0.0 || rp.slope <= 0.0 then
        return 0.0;

    return (1.0 / rp.roughness) * rp.area
           * rp.radius ** (2.0 / 3.0)
           * sqrt(rp.slope);
}

proc kinwaveFlow(const ref rp: RoutingParams,
                 dt: real): real {
    if rp.area <= 0.0 then return 0.0;

    var celerity = (5.0 / 3.0) * rp.qIn / rp.area;
    if celerity <= 0.0 then celerity = 0.01;

    var courant = celerity * dt / rp.length;
    if courant > 1.0 then courant = 1.0;

    var qNew = rp.qOut
        + courant * (rp.qIn - rp.qOut)
        + rp.qLat * rp.length;

    return max(qNew, 0.0);
}

proc route(const ref rp: RoutingParams,
           method: RoutingMethod, dt: real): real {
    select method {
        when RoutingMethod.SteadyFlow do
            return steadyFlow(rp);
        when RoutingMethod.KinWave do
            return kinwaveFlow(rp, dt);
        when RoutingMethod.DynWave do
            return rp.qIn;
    }
    return 0.0;
}`,
    swift: `// flowrout.swift — Flow Routing Dispatch
// SWMM5 Engine in Swift — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

import Foundation

enum RoutingMethod {
    case steadyFlow
    case kinWave
    case dynWave
}

struct RoutingParams {
    let area: Double
    let radius: Double
    let roughness: Double
    let slope: Double
    let length: Double
    let qIn: Double
    let qOut: Double
    let qLat: Double

    func steadyFlow() -> Double {
        guard area > 0.0, slope > 0.0 else { return 0.0 }

        return (1.0 / roughness) * area
               * pow(radius, 2.0 / 3.0)
               * sqrt(slope)
    }

    func kinwaveFlow(dt: Double) -> Double {
        guard area > 0.0 else { return 0.0 }

        var celerity = (5.0 / 3.0) * qIn / area
        if celerity <= 0.0 { celerity = 0.01 }

        let courant = min(celerity * dt / length, 1.0)

        let qNew = qOut
            + courant * (qIn - qOut)
            + qLat * length

        return max(qNew, 0.0)
    }

    func route(method: RoutingMethod, dt: Double) -> Double {
        switch method {
        case .steadyFlow:
            return steadyFlow()
        case .kinWave:
            return kinwaveFlow(dt: dt)
        case .dynWave:
            return qIn
        }
    }
}`,
    kotlin: `// FlowRout.kt — Flow Routing Dispatch
// SWMM5 Engine in Kotlin — Routing Method Dispatcher
// Dispatches flow calculations to steady, kinematic
// wave, or dynamic wave routing methods

package swmm

import kotlin.math.*

enum class RoutingMethod {
    STEADY_FLOW, KINWAVE, DYNWAVE
}

data class RoutingParams(
    val area: Double,
    val radius: Double,
    val roughness: Double,
    val slope: Double,
    val length: Double,
    val qIn: Double,
    val qOut: Double,
    val qLat: Double
) {
    fun steadyFlow(): Double {
        if (area <= 0.0 || slope <= 0.0) return 0.0

        return (1.0 / roughness) * area *
               radius.pow(2.0 / 3.0) *
               sqrt(slope)
    }

    fun kinwaveFlow(dt: Double): Double {
        if (area <= 0.0) return 0.0

        var celerity = (5.0 / 3.0) * qIn / area
        if (celerity <= 0.0) celerity = 0.01

        val courant = min(celerity * dt / length, 1.0)

        val qNew = qOut +
            courant * (qIn - qOut) +
            qLat * length

        return max(qNew, 0.0)
    }

    fun route(method: RoutingMethod, dt: Double): Double {
        return when (method) {
            RoutingMethod.STEADY_FLOW -> steadyFlow()
            RoutingMethod.KINWAVE -> kinwaveFlow(dt)
            RoutingMethod.DYNWAVE -> qIn
        }
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
    zig: `// subcatch.zig — Subcatchment Runoff
// SWMM5 Engine in Zig — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

const std = @import("std");
const math = std.math;

pub const Subcatch = struct {
    area: f64,           // subcatchment area (ft²)
    width: f64,          // overland flow width (ft)
    slope: f64,          // average surface slope
    n_imperv: f64,       // Manning's n, impervious
    n_perv: f64,         // Manning's n, pervious
    d_store_imperv: f64, // depression storage, imperv (ft)
    d_store_perv: f64,   // depression storage, perv (ft)
    pct_imperv: f64,     // percent impervious (0–1)
    depth: f64 = 0.0,    // current ponded depth (ft)

    /// Manning's nonlinear reservoir:
    /// Q = W * S^0.5 / n * (d - d_store)^(5/3)
    pub fn getRunoff(self: Subcatch, depth: f64,
                     n_mannings: f64,
                     d_store: f64) f64 {
        const excess = depth - d_store;
        if (excess <= 0.0) return 0.0;

        const alpha = self.width * @sqrt(self.slope)
                      / n_mannings;
        if (alpha <= 0.0) return 0.0;

        return alpha * math.pow(f64, excess, 5.0 / 3.0);
    }

    /// Water balance depth update
    pub fn getDepth(depth: f64, area: f64, rain: f64,
                    evap: f64, infil: f64, runoff: f64,
                    dt: f64) f64 {
        const d_new = depth
            + (rain - evap - infil - runoff) * dt / area;
        return @max(d_new, 0.0);
    }

    /// Route runoff over pervious and impervious areas
    pub fn route(self: *Subcatch, rain: f64, evap: f64,
                 infil: f64, dt: f64) f64 {
        // Impervious area runoff (no infiltration)
        const q_imperv = self.getRunoff(
            self.depth, self.n_imperv, self.d_store_imperv);

        // Pervious area runoff (after infiltration)
        const q_perv = self.getRunoff(
            self.depth, self.n_perv, self.d_store_perv);

        // Weighted total runoff
        const q_total = self.pct_imperv * q_imperv
            + (1.0 - self.pct_imperv) * q_perv;

        // Update ponded depth via water balance
        self.depth = getDepth(
            self.depth, self.area, rain, evap,
            infil * (1.0 - self.pct_imperv),
            q_total, dt);

        return q_total;
    }
};`,
    cpp: `// subcatch.cpp — Subcatchment Runoff
// SWMM5 Engine in C++ — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

#include <cmath>
#include <algorithm>

namespace swmm {

struct Subcatch {
    double area;          // subcatchment area (ft²)
    double width;         // overland flow width (ft)
    double slope;         // average surface slope
    double nImperv;       // Manning's n, impervious
    double nPerv;         // Manning's n, pervious
    double dStoreImperv;  // depression storage, imperv (ft)
    double dStorePerv;    // depression storage, perv (ft)
    double pctImperv;     // percent impervious (0–1)
    double depth;         // current ponded depth (ft)

    double getRunoff(double d, double nMannings,
                     double dStore) const {
        double excess = d - dStore;
        if (excess <= 0.0) return 0.0;

        double alpha = width * std::sqrt(slope) / nMannings;
        if (alpha <= 0.0) return 0.0;

        return alpha * std::pow(excess, 5.0 / 3.0);
    }

    static double getDepth(double d, double a, double rain,
                           double evap, double infil,
                           double runoff, double dt) {
        double dNew = d + (rain - evap - infil - runoff)
                      * dt / a;
        return std::max(dNew, 0.0);
    }

    double route(double rain, double evap,
                 double infil, double dt) {
        double qImperv = getRunoff(depth, nImperv,
                                   dStoreImperv);
        double qPerv = getRunoff(depth, nPerv, dStorePerv);

        double qTotal = pctImperv * qImperv
                        + (1.0 - pctImperv) * qPerv;

        depth = getDepth(depth, area, rain, evap,
                         infil * (1.0 - pctImperv),
                         qTotal, dt);
        return qTotal;
    }
};

} // namespace swmm`,
    csharp: `// Subcatch.cs — Subcatchment Runoff
// SWMM5 Engine in C# — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

using System;

namespace Swmm
{
    public class Subcatch
    {
        public double Area { get; set; }
        public double Width { get; set; }
        public double Slope { get; set; }
        public double NImperv { get; set; }
        public double NPerv { get; set; }
        public double DStoreImperv { get; set; }
        public double DStorePerv { get; set; }
        public double PctImperv { get; set; }
        public double Depth { get; set; }

        public double GetRunoff(double depth, double nMannings,
                                double dStore)
        {
            double excess = depth - dStore;
            if (excess <= 0.0) return 0.0;

            double alpha = Width * Math.Sqrt(Slope)
                           / nMannings;
            if (alpha <= 0.0) return 0.0;

            return alpha * Math.Pow(excess, 5.0 / 3.0);
        }

        public static double GetDepth(double depth, double area,
            double rain, double evap, double infil,
            double runoff, double dt)
        {
            double dNew = depth
                + (rain - evap - infil - runoff) * dt / area;
            return Math.Max(dNew, 0.0);
        }

        public double Route(double rain, double evap,
                            double infil, double dt)
        {
            double qImperv = GetRunoff(Depth, NImperv,
                                       DStoreImperv);
            double qPerv = GetRunoff(Depth, NPerv,
                                     DStorePerv);

            double qTotal = PctImperv * qImperv
                + (1.0 - PctImperv) * qPerv;

            Depth = GetDepth(Depth, Area, rain, evap,
                infil * (1.0 - PctImperv), qTotal, dt);

            return qTotal;
        }
    }
}`,
    matlab: `% subcatch.m — Subcatchment Runoff
% SWMM5 Engine in MATLAB — Nonlinear Reservoir Surface Runoff
% Models rainfall-runoff using Manning's equation for
% pervious and impervious sub-areas of a subcatchment

function sc = create_subcatch(area, width, slope, ...
        n_imperv, n_perv, d_store_imperv, ...
        d_store_perv, pct_imperv)
    sc.area           = area;
    sc.width          = width;
    sc.slope          = slope;
    sc.n_imperv       = n_imperv;
    sc.n_perv         = n_perv;
    sc.d_store_imperv = d_store_imperv;
    sc.d_store_perv   = d_store_perv;
    sc.pct_imperv     = pct_imperv;
    sc.depth          = 0.0;
end

function q = get_runoff(sc, depth, n_mannings, d_store)
    % Q = W * S^0.5 / n * (d - d_store)^(5/3)
    excess = depth - d_store;
    if excess <= 0.0
        q = 0.0;
        return;
    end

    alpha = sc.width * sqrt(sc.slope) / n_mannings;
    if alpha <= 0.0
        q = 0.0;
        return;
    end

    q = alpha * excess^(5.0 / 3.0);
end

function d_new = get_depth(depth, area, rain, evap, ...
                            infil, runoff, dt)
    d_new = depth + (rain - evap - infil - runoff) ...
            * dt / area;
    d_new = max(d_new, 0.0);
end

function [sc, q_total] = route(sc, rain, evap, ...
                                infil, dt)
    q_imperv = get_runoff(sc, sc.depth, ...
                   sc.n_imperv, sc.d_store_imperv);
    q_perv = get_runoff(sc, sc.depth, ...
                 sc.n_perv, sc.d_store_perv);

    q_total = sc.pct_imperv * q_imperv ...
              + (1.0 - sc.pct_imperv) * q_perv;

    sc.depth = get_depth(sc.depth, sc.area, rain, ...
                   evap, infil * (1.0 - sc.pct_imperv), ...
                   q_total, dt);
end`,
    r: `# subcatch.R — Subcatchment Runoff
# SWMM5 Engine in R — Nonlinear Reservoir Surface Runoff
# Models rainfall-runoff using Manning's equation for
# pervious and impervious sub-areas of a subcatchment

create_subcatch <- function(area, width, slope,
                             n_imperv, n_perv,
                             d_store_imperv, d_store_perv,
                             pct_imperv) {
    list(
        area           = area,
        width          = width,
        slope          = slope,
        n_imperv       = n_imperv,
        n_perv         = n_perv,
        d_store_imperv = d_store_imperv,
        d_store_perv   = d_store_perv,
        pct_imperv     = pct_imperv,
        depth          = 0.0
    )
}

get_runoff <- function(sc, depth, n_mannings, d_store) {
    # Q = W * S^0.5 / n * (d - d_store)^(5/3)
    excess <- depth - d_store
    if (excess <= 0.0) return(0.0)

    alpha <- sc$width * sqrt(sc$slope) / n_mannings
    if (alpha <= 0.0) return(0.0)

    alpha * excess^(5.0 / 3.0)
}

get_depth <- function(depth, area, rain, evap,
                       infil, runoff, dt) {
    d_new <- depth + (rain - evap - infil - runoff) *
             dt / area
    max(d_new, 0.0)
}

route <- function(sc, rain, evap, infil, dt) {
    q_imperv <- get_runoff(sc, sc$depth,
                    sc$n_imperv, sc$d_store_imperv)
    q_perv <- get_runoff(sc, sc$depth,
                  sc$n_perv, sc$d_store_perv)

    q_total <- sc$pct_imperv * q_imperv +
               (1.0 - sc$pct_imperv) * q_perv

    sc$depth <- get_depth(sc$depth, sc$area, rain, evap,
                    infil * (1.0 - sc$pct_imperv),
                    q_total, dt)

    list(sc = sc, q_total = q_total)
}`,
    delphi: `{ subcatch.pas — Subcatchment Runoff }
{ SWMM5 Engine in Delphi — Nonlinear Reservoir Surface Runoff }
{ Models rainfall-runoff using Manning's equation for }
{ pervious and impervious sub-areas of a subcatchment }

unit Subcatch;

interface

type
  TSubcatch = class
  private
    FArea: Double;
    FWidth: Double;
    FSlope: Double;
    FNImperv: Double;
    FNPerv: Double;
    FDStoreImperv: Double;
    FDStorePerv: Double;
    FPctImperv: Double;
    FDepth: Double;
  public
    constructor Create(AArea, AWidth, ASlope,
        ANImperv, ANPerv, ADStoreImperv,
        ADStorePerv, APctImperv: Double);
    function GetRunoff(Depth, NMannings,
                       DStore: Double): Double;
    class function GetDepth(Depth, Area, Rain, Evap,
        Infil, Runoff, Dt: Double): Double;
    function Route(Rain, Evap, Infil,
                   Dt: Double): Double;
    property Depth: Double read FDepth write FDepth;
  end;

implementation

uses Math;

constructor TSubcatch.Create(AArea, AWidth, ASlope,
    ANImperv, ANPerv, ADStoreImperv,
    ADStorePerv, APctImperv: Double);
begin
  FArea          := AArea;
  FWidth         := AWidth;
  FSlope         := ASlope;
  FNImperv       := ANImperv;
  FNPerv         := ANPerv;
  FDStoreImperv  := ADStoreImperv;
  FDStorePerv    := ADStorePerv;
  FPctImperv     := APctImperv;
  FDepth         := 0.0;
end;

function TSubcatch.GetRunoff(Depth, NMannings,
                              DStore: Double): Double;
var
  Excess, Alpha: Double;
begin
  Excess := Depth - DStore;
  if Excess <= 0.0 then Exit(0.0);

  Alpha := FWidth * Sqrt(FSlope) / NMannings;
  if Alpha <= 0.0 then Exit(0.0);

  Result := Alpha * Power(Excess, 5.0 / 3.0);
end;

class function TSubcatch.GetDepth(Depth, Area, Rain,
    Evap, Infil, Runoff, Dt: Double): Double;
begin
  Result := Depth + (Rain - Evap - Infil - Runoff)
            * Dt / Area;
  if Result < 0.0 then Result := 0.0;
end;

function TSubcatch.Route(Rain, Evap, Infil,
                          Dt: Double): Double;
var
  QImperv, QPerv, QTotal: Double;
begin
  QImperv := GetRunoff(FDepth, FNImperv, FDStoreImperv);
  QPerv   := GetRunoff(FDepth, FNPerv, FDStorePerv);

  QTotal := FPctImperv * QImperv
            + (1.0 - FPctImperv) * QPerv;

  FDepth := GetDepth(FDepth, FArea, Rain, Evap,
                Infil * (1.0 - FPctImperv), QTotal, Dt);

  Result := QTotal;
end;

end.`,
    typescript: `// subcatch.ts — Subcatchment Runoff
// SWMM5 Engine in TypeScript — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

interface SubcatchParams {
    area: number;
    width: number;
    slope: number;
    nImperv: number;
    nPerv: number;
    dStoreImperv: number;
    dStorePerv: number;
    pctImperv: number;
}

class Subcatch {
    readonly area: number;
    readonly width: number;
    readonly slope: number;
    readonly nImperv: number;
    readonly nPerv: number;
    readonly dStoreImperv: number;
    readonly dStorePerv: number;
    readonly pctImperv: number;
    depth: number;

    constructor(params: SubcatchParams) {
        this.area = params.area;
        this.width = params.width;
        this.slope = params.slope;
        this.nImperv = params.nImperv;
        this.nPerv = params.nPerv;
        this.dStoreImperv = params.dStoreImperv;
        this.dStorePerv = params.dStorePerv;
        this.pctImperv = params.pctImperv;
        this.depth = 0.0;
    }

    getRunoff(depth: number, nMannings: number,
              dStore: number): number {
        const excess: number = depth - dStore;
        if (excess <= 0.0) return 0.0;

        const alpha: number = this.width
            * Math.sqrt(this.slope) / nMannings;
        if (alpha <= 0.0) return 0.0;

        return alpha * Math.pow(excess, 5.0 / 3.0);
    }

    static getDepth(depth: number, area: number,
        rain: number, evap: number, infil: number,
        runoff: number, dt: number): number {
        const dNew: number = depth
            + (rain - evap - infil - runoff) * dt / area;
        return Math.max(dNew, 0.0);
    }

    route(rain: number, evap: number, infil: number,
          dt: number): number {
        const qImperv: number = this.getRunoff(
            this.depth, this.nImperv, this.dStoreImperv);
        const qPerv: number = this.getRunoff(
            this.depth, this.nPerv, this.dStorePerv);

        const qTotal: number = this.pctImperv * qImperv
            + (1.0 - this.pctImperv) * qPerv;

        this.depth = Subcatch.getDepth(
            this.depth, this.area, rain, evap,
            infil * (1.0 - this.pctImperv), qTotal, dt);

        return qTotal;
    }
}

export { Subcatch };`,
    cuda: `// subcatch.cu — Subcatchment Runoff
// SWMM5 Engine in CUDA — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

#include <math.h>

struct Subcatch {
    float area;
    float width;
    float slope;
    float nImperv;
    float nPerv;
    float dStoreImperv;
    float dStorePerv;
    float pctImperv;
    float depth;
};

__device__ float getRunoff(const Subcatch* sc,
    float depth, float nMannings, float dStore)
{
    float excess = depth - dStore;
    if (excess <= 0.0f) return 0.0f;

    float alpha = sc->width * sqrtf(sc->slope)
                  / nMannings;
    if (alpha <= 0.0f) return 0.0f;

    return alpha * powf(excess, 5.0f / 3.0f);
}

__device__ float getDepth(float depth, float area,
    float rain, float evap, float infil,
    float runoff, float dt)
{
    float dNew = depth
        + (rain - evap - infil - runoff) * dt / area;
    return fmaxf(dNew, 0.0f);
}

__global__ void routeSubcatchKernel(Subcatch* scs,
    float* rain, float* evap, float* infil,
    float dt, float* qOut, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    Subcatch sc = scs[idx];

    float qImperv = getRunoff(&sc, sc.depth,
                        sc.nImperv, sc.dStoreImperv);
    float qPerv = getRunoff(&sc, sc.depth,
                      sc.nPerv, sc.dStorePerv);

    float qTotal = sc.pctImperv * qImperv
        + (1.0f - sc.pctImperv) * qPerv;

    scs[idx].depth = getDepth(sc.depth, sc.area,
        rain[idx], evap[idx],
        infil[idx] * (1.0f - sc.pctImperv),
        qTotal, dt);

    qOut[idx] = qTotal;
}`,
    wasm: `;; subcatch.wat — Subcatchment Runoff
;; SWMM5 Engine in WebAssembly — Nonlinear Reservoir Surface Runoff
;; Models rainfall-runoff using Manning's equation for
;; pervious and impervious sub-areas of a subcatchment

(module
  (func $getRunoff
    (param $width f64) (param $slope f64)
    (param $depth f64) (param $nMannings f64)
    (param $dStore f64)
    (result f64)
    (local $excess f64) (local $alpha f64)

    (local.set $excess
      (f64.sub (local.get $depth) (local.get $dStore)))
    (if (f64.le (local.get $excess) (f64.const 0.0))
      (then (return (f64.const 0.0))))

    (local.set $alpha
      (f64.div
        (f64.mul (local.get $width)
                 (f64.sqrt (local.get $slope)))
        (local.get $nMannings)))
    (if (f64.le (local.get $alpha) (f64.const 0.0))
      (then (return (f64.const 0.0))))

    (f64.mul (local.get $alpha)
      (call $pow (local.get $excess)
                 (f64.const 1.6666666666666667)))
  )

  (func $getDepth
    (param $depth f64) (param $area f64)
    (param $rain f64) (param $evap f64)
    (param $infil f64) (param $runoff f64)
    (param $dt f64)
    (result f64)
    (local $dNew f64)

    (local.set $dNew
      (f64.add (local.get $depth)
        (f64.div
          (f64.mul
            (f64.sub
              (f64.sub
                (f64.sub (local.get $rain)
                         (local.get $evap))
                (local.get $infil))
              (local.get $runoff))
            (local.get $dt))
          (local.get $area))))

    (f64.max (local.get $dNew) (f64.const 0.0))
  )

  (func $pow (param f64) (param f64) (result f64)
    (f64.const 0.0))
)`,
    mojo: `# subcatch.mojo — Subcatchment Runoff
# SWMM5 Engine in Mojo — Nonlinear Reservoir Surface Runoff
# Models rainfall-runoff using Manning's equation for
# pervious and impervious sub-areas of a subcatchment

from math import sqrt, pow

struct Subcatch:
    var area: Float64
    var width: Float64
    var slope: Float64
    var n_imperv: Float64
    var n_perv: Float64
    var d_store_imperv: Float64
    var d_store_perv: Float64
    var pct_imperv: Float64
    var depth: Float64

    fn __init__(inout self, area: Float64, width: Float64,
                slope: Float64, n_imperv: Float64,
                n_perv: Float64, d_store_imperv: Float64,
                d_store_perv: Float64,
                pct_imperv: Float64):
        self.area = area
        self.width = width
        self.slope = slope
        self.n_imperv = n_imperv
        self.n_perv = n_perv
        self.d_store_imperv = d_store_imperv
        self.d_store_perv = d_store_perv
        self.pct_imperv = pct_imperv
        self.depth = 0.0

    fn get_runoff(self, depth: Float64, n_mannings: Float64,
                  d_store: Float64) -> Float64:
        let excess = depth - d_store
        if excess <= 0.0:
            return 0.0

        let alpha = self.width * sqrt(self.slope) / n_mannings
        if alpha <= 0.0:
            return 0.0

        return alpha * pow(excess, 5.0 / 3.0)

    @staticmethod
    fn get_depth(depth: Float64, area: Float64,
                 rain: Float64, evap: Float64,
                 infil: Float64, runoff: Float64,
                 dt: Float64) -> Float64:
        let d_new = depth + (rain - evap - infil - runoff) * dt / area
        return max(d_new, 0.0)

    fn route(inout self, rain: Float64, evap: Float64,
             infil: Float64, dt: Float64) -> Float64:
        let q_imperv = self.get_runoff(
            self.depth, self.n_imperv, self.d_store_imperv)
        let q_perv = self.get_runoff(
            self.depth, self.n_perv, self.d_store_perv)

        let q_total = self.pct_imperv * q_imperv + (1.0 - self.pct_imperv) * q_perv

        self.depth = Self.get_depth(
            self.depth, self.area, rain, evap,
            infil * (1.0 - self.pct_imperv),
            q_total, dt)

        return q_total`,
    java: `// Subcatch.java — Subcatchment Runoff
// SWMM5 Engine in Java — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

package swmm;

public class Subcatch {
    private final double area;
    private final double width;
    private final double slope;
    private final double nImperv;
    private final double nPerv;
    private final double dStoreImperv;
    private final double dStorePerv;
    private final double pctImperv;
    private double depth;

    public Subcatch(double area, double width,
                    double slope, double nImperv,
                    double nPerv, double dStoreImperv,
                    double dStorePerv, double pctImperv) {
        this.area = area;
        this.width = width;
        this.slope = slope;
        this.nImperv = nImperv;
        this.nPerv = nPerv;
        this.dStoreImperv = dStoreImperv;
        this.dStorePerv = dStorePerv;
        this.pctImperv = pctImperv;
        this.depth = 0.0;
    }

    public double getRunoff(double depth, double nMannings,
                            double dStore) {
        double excess = depth - dStore;
        if (excess <= 0.0) return 0.0;

        double alpha = width * Math.sqrt(slope)
                       / nMannings;
        if (alpha <= 0.0) return 0.0;

        return alpha * Math.pow(excess, 5.0 / 3.0);
    }

    public static double getDepth(double depth, double area,
        double rain, double evap, double infil,
        double runoff, double dt) {
        double dNew = depth
            + (rain - evap - infil - runoff) * dt / area;
        return Math.max(dNew, 0.0);
    }

    public double route(double rain, double evap,
                        double infil, double dt) {
        double qImperv = getRunoff(depth, nImperv,
                                   dStoreImperv);
        double qPerv = getRunoff(depth, nPerv, dStorePerv);

        double qTotal = pctImperv * qImperv
            + (1.0 - pctImperv) * qPerv;

        depth = getDepth(depth, area, rain, evap,
            infil * (1.0 - pctImperv), qTotal, dt);

        return qTotal;
    }

    public double getDepthValue() { return depth; }
}`,
    nim: `# subcatch.nim — Subcatchment Runoff
# SWMM5 Engine in Nim — Nonlinear Reservoir Surface Runoff
# Models rainfall-runoff using Manning's equation for
# pervious and impervious sub-areas of a subcatchment

import math

type
  Subcatch = object
    area: float64
    width: float64
    slope: float64
    nImperv: float64
    nPerv: float64
    dStoreImperv: float64
    dStorePerv: float64
    pctImperv: float64
    depth: float64

proc getRunoff(sc: Subcatch, depth, nMannings,
               dStore: float64): float64 =
  ## Q = W * S^0.5 / n * (d - d_store)^(5/3)
  let excess = depth - dStore
  if excess <= 0.0: return 0.0

  let alpha = sc.width * sqrt(sc.slope) / nMannings
  if alpha <= 0.0: return 0.0

  result = alpha * pow(excess, 5.0 / 3.0)

proc getDepth(depth, area, rain, evap, infil,
              runoff, dt: float64): float64 =
  let dNew = depth + (rain - evap - infil - runoff) *
             dt / area
  result = max(dNew, 0.0)

proc route(sc: var Subcatch, rain, evap, infil,
           dt: float64): float64 =
  let qImperv = sc.getRunoff(sc.depth, sc.nImperv,
                              sc.dStoreImperv)
  let qPerv = sc.getRunoff(sc.depth, sc.nPerv,
                            sc.dStorePerv)

  let qTotal = sc.pctImperv * qImperv +
               (1.0 - sc.pctImperv) * qPerv

  sc.depth = getDepth(sc.depth, sc.area, rain, evap,
                 infil * (1.0 - sc.pctImperv),
                 qTotal, dt)

  result = qTotal`,
    ada: `-- subcatch.adb — Subcatchment Runoff
-- SWMM5 Engine in Ada — Nonlinear Reservoir Surface Runoff
-- Models rainfall-runoff using Manning's equation for
-- pervious and impervious sub-areas of a subcatchment

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body Subcatch_Pkg is

   type Subcatch is record
      Area           : Float := 0.0;
      Width          : Float := 0.0;
      Slope          : Float := 0.0;
      N_Imperv       : Float := 0.0;
      N_Perv         : Float := 0.0;
      D_Store_Imperv : Float := 0.0;
      D_Store_Perv   : Float := 0.0;
      Pct_Imperv     : Float := 0.0;
      Depth          : Float := 0.0;
   end record;

   function Get_Runoff
     (SC : Subcatch; Depth : Float;
      N_Mannings : Float;
      D_Store : Float) return Float
   is
      Excess : Float;
      Alpha  : Float;
   begin
      Excess := Depth - D_Store;
      if Excess <= 0.0 then return 0.0; end if;

      Alpha := SC.Width * Sqrt(SC.Slope) / N_Mannings;
      if Alpha <= 0.0 then return 0.0; end if;

      return Alpha * (Excess ** (5.0 / 3.0));
   end Get_Runoff;

   function Get_Depth
     (Depth : Float; Area : Float;
      Rain  : Float; Evap : Float;
      Infil : Float; Runoff : Float;
      Dt : Float) return Float
   is
      D_New : Float;
   begin
      D_New := Depth + (Rain - Evap - Infil - Runoff)
               * Dt / Area;
      if D_New < 0.0 then D_New := 0.0; end if;
      return D_New;
   end Get_Depth;

   procedure Route
     (SC    : in out Subcatch;
      Rain  : Float; Evap : Float;
      Infil : Float; Dt : Float;
      Q_Total : out Float)
   is
      Q_Imperv : Float;
      Q_Perv   : Float;
   begin
      Q_Imperv := Get_Runoff(SC, SC.Depth,
                     SC.N_Imperv, SC.D_Store_Imperv);
      Q_Perv := Get_Runoff(SC, SC.Depth,
                   SC.N_Perv, SC.D_Store_Perv);

      Q_Total := SC.Pct_Imperv * Q_Imperv
         + (1.0 - SC.Pct_Imperv) * Q_Perv;

      SC.Depth := Get_Depth(SC.Depth, SC.Area,
         Rain, Evap,
         Infil * (1.0 - SC.Pct_Imperv),
         Q_Total, Dt);
   end Route;

end Subcatch_Pkg;`,
    chapel: `// subcatch.chpl — Subcatchment Runoff
// SWMM5 Engine in Chapel — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

record Subcatch {
    var area: real;
    var width: real;
    var slope: real;
    var nImperv: real;
    var nPerv: real;
    var dStoreImperv: real;
    var dStorePerv: real;
    var pctImperv: real;
    var depth: real = 0.0;

    proc getRunoff(depth: real, nMannings: real,
                   dStore: real): real {
        const excess = depth - dStore;
        if excess <= 0.0 then return 0.0;

        const alpha = width * sqrt(slope) / nMannings;
        if alpha <= 0.0 then return 0.0;

        return alpha * excess ** (5.0 / 3.0);
    }

    proc getDepth(d: real, a: real, rain: real,
                  evap: real, infil: real,
                  runoff: real, dt: real): real {
        const dNew = d + (rain - evap - infil - runoff)
                     * dt / a;
        return max(dNew, 0.0);
    }

    proc ref route(rain: real, evap: real,
                   infil: real, dt: real): real {
        const qImperv = getRunoff(depth, nImperv,
                                  dStoreImperv);
        const qPerv = getRunoff(depth, nPerv,
                                dStorePerv);

        const qTotal = pctImperv * qImperv
            + (1.0 - pctImperv) * qPerv;

        depth = getDepth(depth, area, rain, evap,
            infil * (1.0 - pctImperv), qTotal, dt);

        return qTotal;
    }
}`,
    swift: `// Subcatch.swift — Subcatchment Runoff
// SWMM5 Engine in Swift — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

import Foundation

struct Subcatch {
    let area: Double
    let width: Double
    let slope: Double
    let nImperv: Double
    let nPerv: Double
    let dStoreImperv: Double
    let dStorePerv: Double
    let pctImperv: Double
    var depth: Double = 0.0

    func getRunoff(depth: Double, nMannings: Double,
                   dStore: Double) -> Double {
        let excess = depth - dStore
        guard excess > 0.0 else { return 0.0 }

        let alpha = width * sqrt(slope) / nMannings
        guard alpha > 0.0 else { return 0.0 }

        return alpha * pow(excess, 5.0 / 3.0)
    }

    static func getDepth(depth: Double, area: Double,
        rain: Double, evap: Double, infil: Double,
        runoff: Double, dt: Double) -> Double {
        let dNew = depth
            + (rain - evap - infil - runoff) * dt / area
        return max(dNew, 0.0)
    }

    mutating func route(rain: Double, evap: Double,
                        infil: Double,
                        dt: Double) -> Double {
        let qImperv = getRunoff(depth: depth,
            nMannings: nImperv, dStore: dStoreImperv)
        let qPerv = getRunoff(depth: depth,
            nMannings: nPerv, dStore: dStorePerv)

        let qTotal = pctImperv * qImperv
            + (1.0 - pctImperv) * qPerv

        depth = Subcatch.getDepth(
            depth: depth, area: area, rain: rain,
            evap: evap,
            infil: infil * (1.0 - pctImperv),
            runoff: qTotal, dt: dt)

        return qTotal
    }
}`,
    kotlin: `// Subcatch.kt — Subcatchment Runoff
// SWMM5 Engine in Kotlin — Nonlinear Reservoir Surface Runoff
// Models rainfall-runoff using Manning's equation for
// pervious and impervious sub-areas of a subcatchment

package swmm

import kotlin.math.*

data class SubcatchParams(
    val area: Double,
    val width: Double,
    val slope: Double,
    val nImperv: Double,
    val nPerv: Double,
    val dStoreImperv: Double,
    val dStorePerv: Double,
    val pctImperv: Double
)

class Subcatch(params: SubcatchParams) {
    val area = params.area
    val width = params.width
    val slope = params.slope
    val nImperv = params.nImperv
    val nPerv = params.nPerv
    val dStoreImperv = params.dStoreImperv
    val dStorePerv = params.dStorePerv
    val pctImperv = params.pctImperv
    var depth: Double = 0.0

    fun getRunoff(depth: Double, nMannings: Double,
                  dStore: Double): Double {
        val excess = depth - dStore
        if (excess <= 0.0) return 0.0

        val alpha = width * sqrt(slope) / nMannings
        if (alpha <= 0.0) return 0.0

        return alpha * excess.pow(5.0 / 3.0)
    }

    fun route(rain: Double, evap: Double,
              infil: Double, dt: Double): Double {
        val qImperv = getRunoff(depth, nImperv,
                                dStoreImperv)
        val qPerv = getRunoff(depth, nPerv, dStorePerv)

        val qTotal = pctImperv * qImperv +
            (1.0 - pctImperv) * qPerv

        depth = getDepth(depth, area, rain, evap,
            infil * (1.0 - pctImperv), qTotal, dt)

        return qTotal
    }

    companion object {
        fun getDepth(depth: Double, area: Double,
            rain: Double, evap: Double, infil: Double,
            runoff: Double, dt: Double): Double {
            val dNew = depth +
                (rain - evap - infil - runoff) * dt / area
            return max(dNew, 0.0)
        }
    }
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
    zig: `// infil.zig — Infiltration Models
// SWMM5 Engine in Zig — Horton, Green-Ampt, and SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

const std = @import("std");
const math = std.math;

pub const HortonInfil = struct {
    f0: f64,    // max infiltration rate (in/hr)
    f_inf: f64, // min infiltration rate (in/hr)
    decay: f64, // decay constant (1/hr)

    pub fn infiltration(self: HortonInfil, t: f64) f64 {
        return self.f_inf + (self.f0 - self.f_inf) *
            @exp(-self.decay * t);
    }
};

pub const GreenAmptInfil = struct {
    ks: f64,        // saturated conductivity
    psi: f64,       // suction head (in)
    theta_d: f64,   // moisture deficit
    cum_infil: f64, // cumulative infiltration (in)

    pub fn infiltration(self: *GreenAmptInfil,
        rainfall: f64, dt: f64) f64 {

        if (self.cum_infil <= 0.0) {
            self.cum_infil = 0.001;
        }

        var f = self.ks *
            (1.0 + self.psi * self.theta_d / self.cum_infil);
        if (f > rainfall) {
            f = rainfall;
        }

        self.cum_infil += f * dt;
        return f;
    }
};

pub fn cnInfiltration(rainfall: f64, cn: f64) f64 {
    if (cn <= 0.0 or cn >= 100.0) {
        return 0.0;
    }

    const s = (1000.0 / cn) - 10.0;
    const ia = 0.2 * s;

    if (rainfall <= ia) {
        return rainfall;
    }

    const pe = math.pow(f64, rainfall - ia, 2) /
        (rainfall - ia + s);
    return rainfall - pe;
}`,
    cpp: `// infil.cpp — Infiltration Models
// SWMM5 Engine in C++ — Horton, Green-Ampt, and SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

#include <cmath>
#include <algorithm>

namespace swmm {

struct Horton {
    double f0;      // max infiltration rate (in/hr)
    double fInf;    // min infiltration rate (in/hr)
    double decay;   // decay constant (1/hr)

    double infiltration(double t) const {
        return fInf + (f0 - fInf) * std::exp(-decay * t);
    }
};

struct GreenAmpt {
    double ks;      // saturated hydraulic conductivity
    double psi;     // suction head (in)
    double thetaD;  // moisture deficit
    double cumInfil; // cumulative infiltration (in)

    double infiltration(double rainfall, double dt) {
        if (cumInfil <= 0.0) cumInfil = 0.001;

        double f = ks * (1.0 + psi * thetaD / cumInfil);
        f = std::min(f, rainfall);

        cumInfil += f * dt;
        return f;
    }
};

inline double cnInfiltration(double rainfall, double cn) {
    if (cn <= 0.0 || cn >= 100.0) return 0.0;

    double S = (1000.0 / cn) - 10.0;
    double Ia = 0.2 * S;

    if (rainfall <= Ia) return rainfall;

    double Pe = std::pow(rainfall - Ia, 2.0)
                / (rainfall - Ia + S);
    return rainfall - Pe;
}

} // namespace swmm`,
    csharp: `// Infil.cs — Infiltration Models
// SWMM5 Engine in C# — Horton, Green-Ampt, and SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

using System;

namespace Swmm
{
    public class Horton
    {
        public double F0 { get; set; }
        public double FInf { get; set; }
        public double Decay { get; set; }

        public Horton(double f0, double fInf, double decay)
        {
            F0 = f0;
            FInf = fInf;
            Decay = decay;
        }

        public double Infiltration(double t)
        {
            return FInf + (F0 - FInf) * Math.Exp(-Decay * t);
        }
    }

    public class GreenAmpt
    {
        public double Ks { get; set; }
        public double Psi { get; set; }
        public double ThetaD { get; set; }
        public double CumInfil { get; set; }

        public GreenAmpt(double ks, double psi,
                         double thetaD, double cumInfil = 0.001)
        {
            Ks = ks; Psi = psi;
            ThetaD = thetaD; CumInfil = cumInfil;
        }

        public double Infiltration(double rainfall, double dt)
        {
            if (CumInfil <= 0.0) CumInfil = 0.001;

            double f = Ks * (1.0 + Psi * ThetaD / CumInfil);
            f = Math.Min(f, rainfall);

            CumInfil += f * dt;
            return f;
        }
    }

    public static class CurveNumber
    {
        public static double Infiltration(double rainfall,
                                          double cn)
        {
            if (cn <= 0.0 || cn >= 100.0) return 0.0;

            double S = (1000.0 / cn) - 10.0;
            double Ia = 0.2 * S;

            if (rainfall <= Ia) return rainfall;

            double Pe = Math.Pow(rainfall - Ia, 2.0)
                        / (rainfall - Ia + S);
            return rainfall - Pe;
        }
    }
}`,
    matlab: `% infil.m — Infiltration Models
% SWMM5 Engine in MATLAB — Horton, Green-Ampt, and SCS-CN
% Three methods to compute how rainfall infiltrates
% into soil versus becoming surface runoff

function f = horton_infil(h, t)
    % Horton exponential decay infiltration
    % h = struct with f0, f_inf, decay
    f = h.f_inf + (h.f0 - h.f_inf) * exp(-h.decay * t);
end

function [f, ga] = greenampt_infil(ga, rainfall, dt)
    % Green-Ampt wetting front infiltration
    % ga = struct with ks, psi, theta_d, cum_infil
    if ga.cum_infil <= 0.0
        ga.cum_infil = 0.001;
    end

    f = ga.ks * (1.0 + ga.psi * ga.theta_d ...
                 / ga.cum_infil);
    if f > rainfall
        f = rainfall;
    end

    ga.cum_infil = ga.cum_infil + f * dt;
end

function infil = cn_infil(rainfall, curve_number)
    % SCS Curve Number method
    if curve_number <= 0.0 || curve_number >= 100.0
        infil = 0.0;
        return;
    end

    S  = (1000.0 / curve_number) - 10.0;
    Ia = 0.2 * S;

    if rainfall <= Ia
        infil = rainfall;
        return;
    end

    Pe = (rainfall - Ia)^2 / (rainfall - Ia + S);
    infil = rainfall - Pe;
end`,
    r: `# infil.R — Infiltration Models
# SWMM5 Engine in R — Horton, Green-Ampt, and SCS-CN
# Three methods to compute how rainfall infiltrates
# into soil versus becoming surface runoff

create_horton <- function(f0, f_inf, decay) {
    list(f0 = f0, f_inf = f_inf, decay = decay)
}

create_greenampt <- function(ks, psi, theta_d,
                              cum_infil = 0.001) {
    env <- new.env(parent = emptyenv())
    env$ks       <- ks
    env$psi      <- psi
    env$theta_d  <- theta_d
    env$cum_infil <- cum_infil
    env
}

horton_infil <- function(h, t) {
    h$f_inf + (h$f0 - h$f_inf) * exp(-h$decay * t)
}

greenampt_infil <- function(ga, rainfall, dt) {
    if (ga$cum_infil <= 0.0) ga$cum_infil <- 0.001

    f <- ga$ks * (1.0 + ga$psi * ga$theta_d
                  / ga$cum_infil)
    f <- min(f, rainfall)

    ga$cum_infil <- ga$cum_infil + f * dt
    f
}

cn_infil <- function(rainfall, cn) {
    if (cn <= 0.0 || cn >= 100.0) return(0.0)

    S  <- (1000.0 / cn) - 10.0
    Ia <- 0.2 * S

    if (rainfall <= Ia) return(rainfall)

    Pe <- (rainfall - Ia)^2 / (rainfall - Ia + S)
    rainfall - Pe
}`,
    delphi: `{ infil.pas — Infiltration Models }
{ SWMM5 Engine in Delphi — Horton, Green-Ampt, SCS-CN }
{ Three methods to compute how rainfall infiltrates }
{ into soil versus becoming surface runoff }

unit Infil;

interface

uses Math;

type
  THorton = class
  private
    FF0: Double;
    FFInf: Double;
    FDecay: Double;
  public
    constructor Create(AF0, AFInf, ADecay: Double);
    function Infiltration(T: Double): Double;
  end;

  TGreenAmpt = class
  private
    FKs: Double;
    FPsi: Double;
    FThetaD: Double;
    FCumInfil: Double;
  public
    constructor Create(AKs, APsi, AThetaD: Double;
                       ACumInfil: Double = 0.001);
    function Infiltration(Rainfall, Dt: Double): Double;
  end;

function CnInfiltration(Rainfall, CN: Double): Double;

implementation

constructor THorton.Create(AF0, AFInf, ADecay: Double);
begin
  FF0    := AF0;
  FFInf  := AFInf;
  FDecay := ADecay;
end;

function THorton.Infiltration(T: Double): Double;
begin
  Result := FFInf + (FF0 - FFInf) * Exp(-FDecay * T);
end;

constructor TGreenAmpt.Create(AKs, APsi, AThetaD: Double;
                               ACumInfil: Double = 0.001);
begin
  FKs       := AKs;
  FPsi      := APsi;
  FThetaD   := AThetaD;
  FCumInfil := ACumInfil;
end;

function TGreenAmpt.Infiltration(Rainfall,
                                  Dt: Double): Double;
begin
  if FCumInfil <= 0.0 then FCumInfil := 0.001;

  Result := FKs * (1.0 + FPsi * FThetaD / FCumInfil);
  if Result > Rainfall then Result := Rainfall;

  FCumInfil := FCumInfil + Result * Dt;
end;

function CnInfiltration(Rainfall, CN: Double): Double;
var
  S, Ia, Pe: Double;
begin
  if (CN <= 0.0) or (CN >= 100.0) then Exit(0.0);

  S  := (1000.0 / CN) - 10.0;
  Ia := 0.2 * S;

  if Rainfall <= Ia then Exit(Rainfall);

  Pe := Power(Rainfall - Ia, 2.0) / (Rainfall - Ia + S);
  Result := Rainfall - Pe;
end;

end.`,
    typescript: `// infil.ts — Infiltration Models
// SWMM5 Engine in TypeScript — Horton, Green-Ampt, SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

interface HortonParams {
    f0: number;
    fInf: number;
    decay: number;
}

interface GreenAmptParams {
    ks: number;
    psi: number;
    thetaD: number;
    cumInfil?: number;
}

class Horton {
    readonly f0: number;
    readonly fInf: number;
    readonly decay: number;

    constructor(params: HortonParams) {
        this.f0 = params.f0;
        this.fInf = params.fInf;
        this.decay = params.decay;
    }

    infiltration(t: number): number {
        return this.fInf + (this.f0 - this.fInf)
               * Math.exp(-this.decay * t);
    }
}

class GreenAmpt {
    readonly ks: number;
    readonly psi: number;
    readonly thetaD: number;
    cumInfil: number;

    constructor(params: GreenAmptParams) {
        this.ks = params.ks;
        this.psi = params.psi;
        this.thetaD = params.thetaD;
        this.cumInfil = params.cumInfil ?? 0.001;
    }

    infiltration(rainfall: number, dt: number): number {
        if (this.cumInfil <= 0.0) this.cumInfil = 0.001;

        let f: number = this.ks * (1.0 + this.psi
                        * this.thetaD / this.cumInfil);
        f = Math.min(f, rainfall);

        this.cumInfil += f * dt;
        return f;
    }
}

function cnInfiltration(rainfall: number,
                        cn: number): number {
    if (cn <= 0.0 || cn >= 100.0) return 0.0;

    const S: number = (1000.0 / cn) - 10.0;
    const Ia: number = 0.2 * S;

    if (rainfall <= Ia) return rainfall;

    const Pe: number = Math.pow(rainfall - Ia, 2)
                       / (rainfall - Ia + S);
    return rainfall - Pe;
}

export { Horton, GreenAmpt, cnInfiltration };`,
    cuda: `// infil.cu — Infiltration Models
// SWMM5 Engine in CUDA — Horton, Green-Ampt, and SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

#include <math.h>

struct Horton {
    float f0;
    float fInf;
    float decay;
};

struct GreenAmpt {
    float ks;
    float psi;
    float thetaD;
    float cumInfil;
};

__device__ float hortonInfil(const Horton* h, float t)
{
    return h->fInf + (h->f0 - h->fInf)
           * expf(-h->decay * t);
}

__device__ float greenAmptInfil(GreenAmpt* ga,
                                 float rainfall, float dt)
{
    if (ga->cumInfil <= 0.0f) ga->cumInfil = 0.001f;

    float f = ga->ks * (1.0f + ga->psi * ga->thetaD
                        / ga->cumInfil);
    if (f > rainfall) f = rainfall;

    ga->cumInfil += f * dt;
    return f;
}

__device__ float cnInfil(float rainfall, float cn)
{
    if (cn <= 0.0f || cn >= 100.0f) return 0.0f;

    float S = (1000.0f / cn) - 10.0f;
    float Ia = 0.2f * S;

    if (rainfall <= Ia) return rainfall;

    float Pe = powf(rainfall - Ia, 2.0f)
               / (rainfall - Ia + S);
    return rainfall - Pe;
}

__global__ void infilKernel(Horton* hortons,
    GreenAmpt* gas, float* rainfall, float* time,
    float dt, float* result, int method, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    if (method == 0)
        result[idx] = hortonInfil(&hortons[idx],
                                   time[idx]);
    else if (method == 1)
        result[idx] = greenAmptInfil(&gas[idx],
                                      rainfall[idx], dt);
    else
        result[idx] = cnInfil(rainfall[idx], 80.0f);
}`,
    wasm: `;; infil.wat — Infiltration Models
;; SWMM5 Engine in WebAssembly — Horton, Green-Ampt, SCS-CN
;; Three methods to compute how rainfall infiltrates
;; into soil versus becoming surface runoff

(module
  (func $hortonInfil
    (param $f0 f64) (param $fInf f64)
    (param $decay f64) (param $t f64)
    (result f64)
    ;; f = fInf + (f0 - fInf) * exp(-decay * t)
    (f64.add
      (local.get $fInf)
      (f64.mul
        (f64.sub (local.get $f0) (local.get $fInf))
        (call $exp
          (f64.mul
            (f64.neg (local.get $decay))
            (local.get $t)))))
  )

  (func $greenAmptInfil
    (param $ks f64) (param $psi f64)
    (param $thetaD f64) (param $cumInfil f64)
    (param $rainfall f64)
    (result f64)
    (local $f f64)
    ;; f = ks * (1 + psi * thetaD / cumInfil)
    (local.set $f
      (f64.mul
        (local.get $ks)
        (f64.add
          (f64.const 1.0)
          (f64.div
            (f64.mul (local.get $psi) (local.get $thetaD))
            (local.get $cumInfil)))))
    ;; clamp to rainfall
    (if (f64.gt (local.get $f) (local.get $rainfall))
      (then (local.set $f (local.get $rainfall))))
    (local.get $f)
  )

  (func $cnInfil
    (param $rainfall f64) (param $cn f64)
    (result f64)
    (local $S f64) (local $Ia f64) (local $diff f64)
    ;; S = 1000/CN - 10
    (local.set $S
      (f64.sub
        (f64.div (f64.const 1000.0) (local.get $cn))
        (f64.const 10.0)))
    ;; Ia = 0.2 * S
    (local.set $Ia
      (f64.mul (f64.const 0.2) (local.get $S)))
    ;; if rainfall <= Ia, return rainfall
    (if (f64.le (local.get $rainfall) (local.get $Ia))
      (then (return (local.get $rainfall))))
    ;; Pe = (P - Ia)^2 / (P - Ia + S)
    (local.set $diff
      (f64.sub (local.get $rainfall) (local.get $Ia)))
    (f64.sub
      (local.get $rainfall)
      (f64.div
        (f64.mul (local.get $diff) (local.get $diff))
        (f64.add (local.get $diff) (local.get $S))))
  )

  (func $exp (param f64) (result f64)
    (f64.const 0.0))
)`,
    mojo: `# infil.mojo — Infiltration Models
# SWMM5 Engine in Mojo — Horton, Green-Ampt, and SCS-CN
# Three methods to compute how rainfall infiltrates
# into soil versus becoming surface runoff

from math import exp, pow

struct Horton:
    var f0: Float64
    var f_inf: Float64
    var decay: Float64

    fn __init__(inout self, f0: Float64,
                f_inf: Float64, decay: Float64):
        self.f0 = f0
        self.f_inf = f_inf
        self.decay = decay

    fn infiltration(self, t: Float64) -> Float64:
        return self.f_inf + (self.f0 - self.f_inf) \\
               * exp(-self.decay * t)

struct GreenAmpt:
    var ks: Float64
    var psi: Float64
    var theta_d: Float64
    var cum_infil: Float64

    fn __init__(inout self, ks: Float64, psi: Float64,
                theta_d: Float64,
                cum_infil: Float64 = 0.001):
        self.ks = ks
        self.psi = psi
        self.theta_d = theta_d
        self.cum_infil = cum_infil

    fn infiltration(inout self, rainfall: Float64,
                    dt: Float64) -> Float64:
        if self.cum_infil <= 0.0:
            self.cum_infil = 0.001

        var f = self.ks * (1.0 + self.psi * self.theta_d
                           / self.cum_infil)
        if f > rainfall:
            f = rainfall

        self.cum_infil += f * dt
        return f

fn cn_infiltration(rainfall: Float64,
                   cn: Float64) -> Float64:
    if cn <= 0.0 or cn >= 100.0:
        return 0.0

    let S = (1000.0 / cn) - 10.0
    let Ia = 0.2 * S

    if rainfall <= Ia:
        return rainfall

    let Pe = pow(rainfall - Ia, 2.0) / (rainfall - Ia + S)
    return rainfall - Pe`,
    java: `// Infil.java — Infiltration Models
// SWMM5 Engine in Java — Horton, Green-Ampt, and SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

package swmm;

public class Infil {

    public static class Horton {
        private final double f0;
        private final double fInf;
        private final double decay;

        public Horton(double f0, double fInf,
                      double decay) {
            this.f0 = f0;
            this.fInf = fInf;
            this.decay = decay;
        }

        public double infiltration(double t) {
            return fInf + (f0 - fInf)
                   * Math.exp(-decay * t);
        }
    }

    public static class GreenAmpt {
        private final double ks;
        private final double psi;
        private final double thetaD;
        private double cumInfil;

        public GreenAmpt(double ks, double psi,
                         double thetaD) {
            this.ks = ks;
            this.psi = psi;
            this.thetaD = thetaD;
            this.cumInfil = 0.001;
        }

        public double infiltration(double rainfall,
                                   double dt) {
            if (cumInfil <= 0.0) cumInfil = 0.001;

            double f = ks * (1.0 + psi * thetaD
                             / cumInfil);
            f = Math.min(f, rainfall);

            cumInfil += f * dt;
            return f;
        }
    }

    public static double cnInfiltration(double rainfall,
                                        double cn) {
        if (cn <= 0.0 || cn >= 100.0) return 0.0;

        double S = (1000.0 / cn) - 10.0;
        double Ia = 0.2 * S;

        if (rainfall <= Ia) return rainfall;

        double Pe = Math.pow(rainfall - Ia, 2.0)
                    / (rainfall - Ia + S);
        return rainfall - Pe;
    }
}`,
    nim: `# infil.nim — Infiltration Models
# SWMM5 Engine in Nim — Horton, Green-Ampt, and SCS-CN
# Three methods to compute how rainfall infiltrates
# into soil versus becoming surface runoff

import math

type
  Horton = object
    f0: float64
    fInf: float64
    decay: float64

  GreenAmpt = object
    ks: float64
    psi: float64
    thetaD: float64
    cumInfil: float64

proc newHorton(f0, fInf, decay: float64): Horton =
  result = Horton(f0: f0, fInf: fInf, decay: decay)

proc newGreenAmpt(ks, psi, thetaD: float64;
                  cumInfil: float64 = 0.001): GreenAmpt =
  result = GreenAmpt(ks: ks, psi: psi,
                     thetaD: thetaD,
                     cumInfil: cumInfil)

proc infiltration(h: Horton, t: float64): float64 =
  result = h.fInf + (h.f0 - h.fInf) *
           exp(-h.decay * t)

proc infiltration(ga: var GreenAmpt, rainfall: float64,
                  dt: float64): float64 =
  if ga.cumInfil <= 0.0:
    ga.cumInfil = 0.001

  result = ga.ks * (1.0 + ga.psi * ga.thetaD /
                    ga.cumInfil)
  if result > rainfall:
    result = rainfall

  ga.cumInfil += result * dt

proc cnInfiltration(rainfall, cn: float64): float64 =
  if cn <= 0.0 or cn >= 100.0:
    return 0.0

  let S = (1000.0 / cn) - 10.0
  let Ia = 0.2 * S

  if rainfall <= Ia:
    return rainfall

  let Pe = pow(rainfall - Ia, 2.0) /
           (rainfall - Ia + S)
  result = rainfall - Pe`,
    ada: `-- infil.adb — Infiltration Models
-- SWMM5 Engine in Ada — Horton, Green-Ampt, and SCS-CN
-- Three methods to compute how rainfall infiltrates
-- into soil versus becoming surface runoff

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body Infil is

   type Horton is record
      F0    : Float;
      F_Inf : Float;
      Decay : Float;
   end record;

   type Green_Ampt is record
      Ks        : Float;
      Psi       : Float;
      Theta_D   : Float;
      Cum_Infil : Float := 0.001;
   end record;

   function Horton_Infil(H : Horton;
                         T : Float) return Float is
   begin
      return H.F_Inf + (H.F0 - H.F_Inf)
             * Exp(-H.Decay * T);
   end Horton_Infil;

   function GreenAmpt_Infil(GA       : in out Green_Ampt;
                            Rainfall : Float;
                            Dt       : Float) return Float
   is
      F : Float;
   begin
      if GA.Cum_Infil <= 0.0 then
         GA.Cum_Infil := 0.001;
      end if;

      F := GA.Ks * (1.0 + GA.Psi * GA.Theta_D
                    / GA.Cum_Infil);
      if F > Rainfall then
         F := Rainfall;
      end if;

      GA.Cum_Infil := GA.Cum_Infil + F * Dt;
      return F;
   end GreenAmpt_Infil;

   function CN_Infil(Rainfall : Float;
                     CN       : Float) return Float
   is
      S  : Float;
      Ia : Float;
      Pe : Float;
   begin
      if CN <= 0.0 or else CN >= 100.0 then
         return 0.0;
      end if;

      S  := (1000.0 / CN) - 10.0;
      Ia := 0.2 * S;

      if Rainfall <= Ia then
         return Rainfall;
      end if;

      Pe := (Rainfall - Ia) ** 2 / (Rainfall - Ia + S);
      return Rainfall - Pe;
   end CN_Infil;

end Infil;`,
    chapel: `// infil.chpl — Infiltration Models
// SWMM5 Engine in Chapel — Horton, Green-Ampt, SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

record Horton {
  var f0: real;
  var fInf: real;
  var decay: real;

  proc infiltration(t: real): real {
    return fInf + (f0 - fInf) * exp(-decay * t);
  }
}

record GreenAmpt {
  var ks: real;
  var psi: real;
  var thetaD: real;
  var cumInfil: real = 0.001;

  proc ref infiltration(rainfall: real,
                        dt: real): real {
    if cumInfil <= 0.0 then cumInfil = 0.001;

    var f = ks * (1.0 + psi * thetaD / cumInfil);
    if f > rainfall then f = rainfall;

    cumInfil += f * dt;
    return f;
  }
}

proc cnInfiltration(rainfall: real,
                    cn: real): real {
  if cn <= 0.0 || cn >= 100.0 then return 0.0;

  const S  = (1000.0 / cn) - 10.0;
  const Ia = 0.2 * S;

  if rainfall <= Ia then return rainfall;

  const Pe = (rainfall - Ia) ** 2
             / (rainfall - Ia + S);
  return rainfall - Pe;
}`,
    swift: `// infil.swift — Infiltration Models
// SWMM5 Engine in Swift — Horton, Green-Ampt, and SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

import Foundation

struct Horton {
    let f0: Double
    let fInf: Double
    let decay: Double

    func infiltration(t: Double) -> Double {
        return fInf + (f0 - fInf) * exp(-decay * t)
    }
}

struct GreenAmpt {
    let ks: Double
    let psi: Double
    let thetaD: Double
    var cumInfil: Double = 0.001

    mutating func infiltration(rainfall: Double,
                               dt: Double) -> Double {
        if cumInfil <= 0.0 { cumInfil = 0.001 }

        var f = ks * (1.0 + psi * thetaD / cumInfil)
        f = min(f, rainfall)

        cumInfil += f * dt
        return f
    }
}

func cnInfiltration(rainfall: Double,
                    cn: Double) -> Double {
    guard cn > 0.0, cn < 100.0 else { return 0.0 }

    let S = (1000.0 / cn) - 10.0
    let Ia = 0.2 * S

    guard rainfall > Ia else { return rainfall }

    let Pe = pow(rainfall - Ia, 2.0)
             / (rainfall - Ia + S)
    return rainfall - Pe
}`,
    kotlin: `// Infil.kt — Infiltration Models
// SWMM5 Engine in Kotlin — Horton, Green-Ampt, SCS-CN
// Three methods to compute how rainfall infiltrates
// into soil versus becoming surface runoff

package swmm

import kotlin.math.exp
import kotlin.math.min
import kotlin.math.pow

data class Horton(
    val f0: Double,
    val fInf: Double,
    val decay: Double
) {
    fun infiltration(t: Double): Double =
        fInf + (f0 - fInf) * exp(-decay * t)
}

class GreenAmpt(
    val ks: Double,
    val psi: Double,
    val thetaD: Double,
    var cumInfil: Double = 0.001
) {
    fun infiltration(rainfall: Double,
                     dt: Double): Double {
        if (cumInfil <= 0.0) cumInfil = 0.001

        var f = ks * (1.0 + psi * thetaD / cumInfil)
        f = min(f, rainfall)

        cumInfil += f * dt
        return f
    }
}

fun cnInfiltration(rainfall: Double,
                   cn: Double): Double {
    if (cn <= 0.0 || cn >= 100.0) return 0.0

    val S = (1000.0 / cn) - 10.0
    val Ia = 0.2 * S

    if (rainfall <= Ia) return rainfall

    val Pe = (rainfall - Ia).pow(2.0) /
             (rainfall - Ia + S)
    return rainfall - Pe
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
    zig: `// lid.zig — LID/Green Infrastructure Controls
// SWMM5 Engine in Zig — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

const std = @import("std");
const math = std.math;

pub const LidType = enum {
    bio_cell,      // bioretention cell / rain garden
    perm_pave,     // permeable pavement
    infil_trench,  // infiltration trench
    veg_swale,     // vegetated swale
};

pub const LidLayer = struct {
    depth: f64,        // layer depth (ft)
    void_frac: f64,    // void fraction (porosity)
    conductivity: f64, // hydraulic conductivity (ft/s)
};

pub const LidUnit = struct {
    lid_type: LidType,
    surface: LidLayer,    // surface layer
    soil: LidLayer,       // soil layer
    storage: LidLayer,    // gravel storage layer
    drain_coeff: f64,     // underdrain coefficient
    drain_exp: f64,       // underdrain exponent

    /// Green-Ampt style percolation from soil to storage
    pub fn getSoilPerc(self: LidUnit, soil_moist: f64,
                       storage_depth: f64) f64 {
        const deficit = self.soil.void_frac - soil_moist;
        if (deficit <= 0.0) return 0.0;

        const max_storage = self.storage.depth
                            * self.storage.void_frac;
        if (storage_depth >= max_storage) return 0.0;

        return self.soil.conductivity
            * (1.0 + self.soil.depth * deficit
               / (soil_moist + 0.001));
    }

    /// Power-law underdrain discharge: Q = C * h^n
    pub fn getDrainFlow(self: LidUnit,
                        storage_depth: f64) f64 {
        if (self.drain_coeff <= 0.0) return 0.0;
        if (storage_depth <= 0.0) return 0.0;

        return self.drain_coeff
               * math.pow(f64, storage_depth, self.drain_exp);
    }

    /// Overall LID water balance:
    /// route through surface -> soil -> storage -> drain
    pub fn getRunoff(self: LidUnit, rainfall: f64,
                     surf_depth: f64, soil_moist: f64,
                     storage_depth: f64, dt: f64) f64 {
        const soil_perc = self.getSoilPerc(
            soil_moist, storage_depth);

        const surf_inflow = @max(rainfall - soil_perc, 0.0);

        const surf_capacity = self.surface.depth
                              * self.surface.void_frac;
        const overflow = surf_depth + surf_inflow * dt
                         - surf_capacity;
        return @max(overflow, 0.0);
    }
};`,
    cpp: `// lid.cpp — LID/Green Infrastructure Controls
// SWMM5 Engine in C++ — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

#include <cmath>
#include <algorithm>

namespace swmm {

enum class LidType {
    BioCell, PermPave, InfilTrench, VegSwale
};

struct LidLayer {
    double depth;        // layer depth (ft)
    double voidFrac;     // void fraction (porosity)
    double conductivity; // hydraulic conductivity (ft/s)
};

struct LidUnit {
    LidType type;
    LidLayer surface;    // surface layer
    LidLayer soil;       // soil layer
    LidLayer storage;    // gravel storage layer
    double drainCoeff;   // underdrain coefficient
    double drainExp;     // underdrain exponent

    double getSoilPerc(double soilMoist,
                       double storageDepth) const {
        double deficit = soil.voidFrac - soilMoist;
        if (deficit <= 0.0) return 0.0;

        double maxStorage = storage.depth * storage.voidFrac;
        if (storageDepth >= maxStorage) return 0.0;

        return soil.conductivity
               * (1.0 + soil.depth * deficit
                  / (soilMoist + 0.001));
    }

    double getDrainFlow(double storageDepth) const {
        if (drainCoeff <= 0.0) return 0.0;
        if (storageDepth <= 0.0) return 0.0;

        return drainCoeff
               * std::pow(storageDepth, drainExp);
    }

    double getRunoff(double rainfall, double surfDepth,
                     double soilMoist, double storageDepth,
                     double dt) const {
        double soilPerc = getSoilPerc(soilMoist,
                                      storageDepth);
        double surfInflow = std::max(rainfall - soilPerc,
                                     0.0);
        double surfCapacity = surface.depth
                              * surface.voidFrac;
        double overflow = surfDepth + surfInflow * dt
                          - surfCapacity;
        return std::max(overflow, 0.0);
    }
};

} // namespace swmm`,
    csharp: `// Lid.cs — LID/Green Infrastructure Controls
// SWMM5 Engine in C# — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

using System;

namespace Swmm
{
    public enum LidType
    {
        BioCell, PermPave, InfilTrench, VegSwale
    }

    public class LidLayer
    {
        public double Depth { get; set; }
        public double VoidFrac { get; set; }
        public double Conductivity { get; set; }

        public LidLayer(double depth, double voidFrac,
                        double conductivity)
        {
            Depth = depth;
            VoidFrac = voidFrac;
            Conductivity = conductivity;
        }
    }

    public class LidUnit
    {
        public LidType Type { get; set; }
        public LidLayer Surface { get; set; }
        public LidLayer Soil { get; set; }
        public LidLayer Storage { get; set; }
        public double DrainCoeff { get; set; }
        public double DrainExp { get; set; }

        public double GetSoilPerc(double soilMoist,
                                   double storageDepth)
        {
            double deficit = Soil.VoidFrac - soilMoist;
            if (deficit <= 0.0) return 0.0;

            double maxStorage = Storage.Depth
                                * Storage.VoidFrac;
            if (storageDepth >= maxStorage) return 0.0;

            return Soil.Conductivity
                   * (1.0 + Soil.Depth * deficit
                      / (soilMoist + 0.001));
        }

        public double GetDrainFlow(double storageDepth)
        {
            if (DrainCoeff <= 0.0) return 0.0;
            if (storageDepth <= 0.0) return 0.0;

            return DrainCoeff
                   * Math.Pow(storageDepth, DrainExp);
        }

        public double GetRunoff(double rainfall,
            double surfDepth, double soilMoist,
            double storageDepth, double dt)
        {
            double soilPerc = GetSoilPerc(soilMoist,
                                           storageDepth);
            double surfInflow = Math.Max(
                rainfall - soilPerc, 0.0);
            double surfCapacity = Surface.Depth
                                  * Surface.VoidFrac;
            double overflow = surfDepth + surfInflow * dt
                              - surfCapacity;
            return Math.Max(overflow, 0.0);
        }
    }
}`,
    matlab: `% lid.m — LID/Green Infrastructure Controls
% SWMM5 Engine in MATLAB — Low Impact Development
% Models bioretention, permeable pavement, infiltration
% trenches, and vegetated swales with layered water balance

function layer = create_lid_layer(depth, void_frac, ...
                                    conductivity)
    layer.depth        = depth;
    layer.void_frac    = void_frac;
    layer.conductivity = conductivity;
end

function lid = create_lid_unit(type, surface, soil, ...
                                storage, drain_coeff, ...
                                drain_exp)
    lid.type        = type;
    lid.surface     = surface;
    lid.soil        = soil;
    lid.storage     = storage;
    lid.drain_coeff = drain_coeff;
    lid.drain_exp   = drain_exp;
end

function perc = get_soil_perc(lid, soil_moist, ...
                               storage_depth)
    deficit = lid.soil.void_frac - soil_moist;
    if deficit <= 0.0
        perc = 0.0; return;
    end

    max_storage = lid.storage.depth ...
                  * lid.storage.void_frac;
    if storage_depth >= max_storage
        perc = 0.0; return;
    end

    perc = lid.soil.conductivity ...
           * (1.0 + lid.soil.depth * deficit ...
              / (soil_moist + 0.001));
end

function q = get_drain_flow(lid, storage_depth)
    if lid.drain_coeff <= 0.0
        q = 0.0; return;
    end
    if storage_depth <= 0.0
        q = 0.0; return;
    end

    q = lid.drain_coeff ...
        * storage_depth^lid.drain_exp;
end

function overflow = get_runoff(lid, rainfall, ...
    surf_depth, soil_moist, storage_depth, dt)
    soil_perc = get_soil_perc(lid, soil_moist, ...
                               storage_depth);
    surf_inflow = max(rainfall - soil_perc, 0.0);
    surf_capacity = lid.surface.depth ...
                    * lid.surface.void_frac;
    overflow = surf_depth + surf_inflow * dt ...
               - surf_capacity;
    overflow = max(overflow, 0.0);
end`,
    r: `# lid.R — LID/Green Infrastructure Controls
# SWMM5 Engine in R — Low Impact Development
# Models bioretention, permeable pavement, infiltration
# trenches, and vegetated swales with layered water balance

create_lid_layer <- function(depth, void_frac,
                              conductivity) {
    list(
        depth        = depth,
        void_frac    = void_frac,
        conductivity = conductivity
    )
}

create_lid_unit <- function(type, surface, soil,
                             storage, drain_coeff,
                             drain_exp) {
    list(
        type        = type,
        surface     = surface,
        soil        = soil,
        storage     = storage,
        drain_coeff = drain_coeff,
        drain_exp   = drain_exp
    )
}

get_soil_perc <- function(lid, soil_moist,
                           storage_depth) {
    deficit <- lid$soil$void_frac - soil_moist
    if (deficit <= 0.0) return(0.0)

    max_storage <- lid$storage$depth *
                   lid$storage$void_frac
    if (storage_depth >= max_storage) return(0.0)

    lid$soil$conductivity *
        (1.0 + lid$soil$depth * deficit /
         (soil_moist + 0.001))
}

get_drain_flow <- function(lid, storage_depth) {
    if (lid$drain_coeff <= 0.0) return(0.0)
    if (storage_depth <= 0.0) return(0.0)

    lid$drain_coeff * storage_depth^lid$drain_exp
}

get_runoff <- function(lid, rainfall, surf_depth,
                        soil_moist, storage_depth, dt) {
    soil_perc <- get_soil_perc(lid, soil_moist,
                                storage_depth)
    surf_inflow <- max(rainfall - soil_perc, 0.0)
    surf_capacity <- lid$surface$depth *
                     lid$surface$void_frac
    overflow <- surf_depth + surf_inflow * dt -
                surf_capacity
    max(overflow, 0.0)
}`,
    delphi: `{ lid.pas — LID/Green Infrastructure Controls }
{ SWMM5 Engine in Delphi — Low Impact Development }
{ Models bioretention, permeable pavement, infiltration }
{ trenches, and vegetated swales with layered water balance }

unit Lid;

interface

uses Math;

type
  TLidType = (ltBioCell, ltPermPave,
              ltInfilTrench, ltVegSwale);

  TLidLayer = record
    Depth: Double;
    VoidFrac: Double;
    Conductivity: Double;
  end;

  TLidUnit = class
  private
    FType: TLidType;
    FSurface: TLidLayer;
    FSoil: TLidLayer;
    FStorage: TLidLayer;
    FDrainCoeff: Double;
    FDrainExp: Double;
  public
    constructor Create(AType: TLidType;
      ASurface, ASoil, AStorage: TLidLayer;
      ADrainCoeff, ADrainExp: Double);
    function GetSoilPerc(SoilMoist,
                          StorageDepth: Double): Double;
    function GetDrainFlow(StorageDepth: Double): Double;
    function GetRunoff(Rainfall, SurfDepth, SoilMoist,
                       StorageDepth, Dt: Double): Double;
  end;

implementation

constructor TLidUnit.Create(AType: TLidType;
  ASurface, ASoil, AStorage: TLidLayer;
  ADrainCoeff, ADrainExp: Double);
begin
  FType       := AType;
  FSurface    := ASurface;
  FSoil       := ASoil;
  FStorage    := AStorage;
  FDrainCoeff := ADrainCoeff;
  FDrainExp   := ADrainExp;
end;

function TLidUnit.GetSoilPerc(SoilMoist,
                                StorageDepth: Double): Double;
var
  Deficit, MaxStorage: Double;
begin
  Deficit := FSoil.VoidFrac - SoilMoist;
  if Deficit <= 0.0 then Exit(0.0);

  MaxStorage := FStorage.Depth * FStorage.VoidFrac;
  if StorageDepth >= MaxStorage then Exit(0.0);

  Result := FSoil.Conductivity
            * (1.0 + FSoil.Depth * Deficit
               / (SoilMoist + 0.001));
end;

function TLidUnit.GetDrainFlow(
                     StorageDepth: Double): Double;
begin
  if FDrainCoeff <= 0.0 then Exit(0.0);
  if StorageDepth <= 0.0 then Exit(0.0);

  Result := FDrainCoeff
            * Power(StorageDepth, FDrainExp);
end;

function TLidUnit.GetRunoff(Rainfall, SurfDepth,
  SoilMoist, StorageDepth, Dt: Double): Double;
var
  SoilPerc, SurfInflow, SurfCapacity: Double;
begin
  SoilPerc    := GetSoilPerc(SoilMoist, StorageDepth);
  SurfInflow  := Max(Rainfall - SoilPerc, 0.0);
  SurfCapacity := FSurface.Depth * FSurface.VoidFrac;
  Result := SurfDepth + SurfInflow * Dt - SurfCapacity;
  Result := Max(Result, 0.0);
end;

end.`,
    typescript: `// lid.ts — LID/Green Infrastructure Controls
// SWMM5 Engine in TypeScript — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

enum LidType {
    BioCell, PermPave, InfilTrench, VegSwale
}

interface LidLayerParams {
    depth: number;
    voidFrac: number;
    conductivity: number;
}

interface LidUnitParams {
    type: LidType;
    surface: LidLayerParams;
    soil: LidLayerParams;
    storage: LidLayerParams;
    drainCoeff: number;
    drainExp: number;
}

class LidUnit {
    readonly type: LidType;
    readonly surface: LidLayerParams;
    readonly soil: LidLayerParams;
    readonly storage: LidLayerParams;
    readonly drainCoeff: number;
    readonly drainExp: number;

    constructor(params: LidUnitParams) {
        this.type = params.type;
        this.surface = params.surface;
        this.soil = params.soil;
        this.storage = params.storage;
        this.drainCoeff = params.drainCoeff;
        this.drainExp = params.drainExp;
    }

    getSoilPerc(soilMoist: number,
                storageDepth: number): number {
        const deficit: number =
            this.soil.voidFrac - soilMoist;
        if (deficit <= 0.0) return 0.0;

        const maxStorage: number =
            this.storage.depth * this.storage.voidFrac;
        if (storageDepth >= maxStorage) return 0.0;

        return this.soil.conductivity
               * (1.0 + this.soil.depth * deficit
                  / (soilMoist + 0.001));
    }

    getDrainFlow(storageDepth: number): number {
        if (this.drainCoeff <= 0.0) return 0.0;
        if (storageDepth <= 0.0) return 0.0;

        return this.drainCoeff
               * Math.pow(storageDepth, this.drainExp);
    }

    getRunoff(rainfall: number, surfDepth: number,
              soilMoist: number, storageDepth: number,
              dt: number): number {
        const soilPerc: number =
            this.getSoilPerc(soilMoist, storageDepth);
        const surfInflow: number =
            Math.max(rainfall - soilPerc, 0.0);
        const surfCapacity: number =
            this.surface.depth * this.surface.voidFrac;
        const overflow: number =
            surfDepth + surfInflow * dt - surfCapacity;
        return Math.max(overflow, 0.0);
    }
}

export { LidUnit, LidType };`,
    cuda: `// lid.cu — LID/Green Infrastructure Controls
// SWMM5 Engine in CUDA — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

#include <math.h>

enum LidType {
    BIO_CELL, PERM_PAVE, INFIL_TRENCH, VEG_SWALE
};

struct LidLayer {
    float depth;
    float voidFrac;
    float conductivity;
};

struct LidUnit {
    LidType type;
    LidLayer surface;
    LidLayer soil;
    LidLayer storage;
    float drainCoeff;
    float drainExp;
};

__device__ float getSoilPerc(const LidUnit* lid,
    float soilMoist, float storageDepth)
{
    float deficit = lid->soil.voidFrac - soilMoist;
    if (deficit <= 0.0f) return 0.0f;

    float maxStorage = lid->storage.depth
                       * lid->storage.voidFrac;
    if (storageDepth >= maxStorage) return 0.0f;

    return lid->soil.conductivity
           * (1.0f + lid->soil.depth * deficit
              / (soilMoist + 0.001f));
}

__device__ float getDrainFlow(const LidUnit* lid,
                               float storageDepth)
{
    if (lid->drainCoeff <= 0.0f) return 0.0f;
    if (storageDepth <= 0.0f) return 0.0f;

    return lid->drainCoeff
           * powf(storageDepth, lid->drainExp);
}

__global__ void lidRunoffKernel(LidUnit* lids,
    float* rainfall, float* surfDepth,
    float* soilMoist, float* storageDepth,
    float dt, float* overflow, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    LidUnit lid = lids[idx];
    float perc = getSoilPerc(&lid, soilMoist[idx],
                              storageDepth[idx]);
    float surfInflow = fmaxf(
        rainfall[idx] - perc, 0.0f);
    float surfCap = lid.surface.depth
                    * lid.surface.voidFrac;
    float ovf = surfDepth[idx] + surfInflow * dt
                - surfCap;
    overflow[idx] = fmaxf(ovf, 0.0f);
}`,
    wasm: `;; lid.wat — LID/Green Infrastructure Controls
;; SWMM5 Engine in WebAssembly — Low Impact Development
;; Models bioretention, permeable pavement, infiltration
;; trenches, and vegetated swales with layered water balance

(module
  (func $getSoilPerc
    (param $soilVoidFrac f64) (param $soilMoist f64)
    (param $soilDepth f64) (param $soilCond f64)
    (param $storVoidFrac f64) (param $storDepth f64)
    (param $storageDepth f64)
    (result f64)
    (local $deficit f64) (local $maxStor f64)

    (local.set $deficit
      (f64.sub (local.get $soilVoidFrac)
               (local.get $soilMoist)))
    (if (f64.le (local.get $deficit) (f64.const 0.0))
      (then (return (f64.const 0.0))))

    (local.set $maxStor
      (f64.mul (local.get $storDepth)
               (local.get $storVoidFrac)))
    (if (f64.ge (local.get $storageDepth)
                (local.get $maxStor))
      (then (return (f64.const 0.0))))

    (f64.mul (local.get $soilCond)
      (f64.add (f64.const 1.0)
        (f64.div
          (f64.mul (local.get $soilDepth)
                   (local.get $deficit))
          (f64.add (local.get $soilMoist)
                   (f64.const 0.001)))))
  )

  (func $getDrainFlow
    (param $drainCoeff f64) (param $drainExp f64)
    (param $storageDepth f64)
    (result f64)

    (if (f64.le (local.get $drainCoeff) (f64.const 0.0))
      (then (return (f64.const 0.0))))
    (if (f64.le (local.get $storageDepth) (f64.const 0.0))
      (then (return (f64.const 0.0))))

    (f64.mul (local.get $drainCoeff)
      (call $pow (local.get $storageDepth)
                 (local.get $drainExp)))
  )

  (func $pow (param f64) (param f64) (result f64)
    (f64.const 0.0))
)`,
    mojo: `# lid.mojo — LID/Green Infrastructure Controls
# SWMM5 Engine in Mojo — Low Impact Development
# Models bioretention, permeable pavement, infiltration
# trenches, and vegetated swales with layered water balance

from math import pow, max

@value
struct LidLayer:
    var depth: Float64
    var void_frac: Float64
    var conductivity: Float64

@value
struct LidUnit:
    var surface: LidLayer
    var soil: LidLayer
    var storage: LidLayer
    var drain_coeff: Float64
    var drain_exp: Float64

    fn get_soil_perc(self, soil_moist: Float64,
                     storage_depth: Float64) -> Float64:
        let deficit = self.soil.void_frac - soil_moist
        if deficit <= 0.0:
            return 0.0

        let max_storage = (self.storage.depth
                           * self.storage.void_frac)
        if storage_depth >= max_storage:
            return 0.0

        return (self.soil.conductivity
                * (1.0 + self.soil.depth * deficit
                   / (soil_moist + 0.001)))

    fn get_drain_flow(self,
                      storage_depth: Float64) -> Float64:
        if self.drain_coeff <= 0.0:
            return 0.0
        if storage_depth <= 0.0:
            return 0.0

        return (self.drain_coeff
                * pow(storage_depth, self.drain_exp))

    fn get_runoff(self, rainfall: Float64,
                  surf_depth: Float64,
                  soil_moist: Float64,
                  storage_depth: Float64,
                  dt: Float64) -> Float64:
        let soil_perc = self.get_soil_perc(
            soil_moist, storage_depth)
        let surf_inflow = max(
            rainfall - soil_perc, 0.0)
        let surf_capacity = (self.surface.depth
                             * self.surface.void_frac)
        let overflow = (surf_depth + surf_inflow * dt
                        - surf_capacity)
        return max(overflow, 0.0)`,
    java: `// Lid.java — LID/Green Infrastructure Controls
// SWMM5 Engine in Java — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

package swmm;

public class LidUnit {

    public enum LidType {
        BIO_CELL, PERM_PAVE, INFIL_TRENCH, VEG_SWALE
    }

    public static class LidLayer {
        private final double depth;
        private final double voidFrac;
        private final double conductivity;

        public LidLayer(double depth, double voidFrac,
                        double conductivity) {
            this.depth = depth;
            this.voidFrac = voidFrac;
            this.conductivity = conductivity;
        }

        public double getDepth() { return depth; }
        public double getVoidFrac() { return voidFrac; }
        public double getConductivity() {
            return conductivity;
        }
    }

    private final LidType type;
    private final LidLayer surface;
    private final LidLayer soil;
    private final LidLayer storage;
    private final double drainCoeff;
    private final double drainExp;

    public LidUnit(LidType type, LidLayer surface,
                   LidLayer soil, LidLayer storage,
                   double drainCoeff, double drainExp) {
        this.type = type;
        this.surface = surface;
        this.soil = soil;
        this.storage = storage;
        this.drainCoeff = drainCoeff;
        this.drainExp = drainExp;
    }

    public double getSoilPerc(double soilMoist,
                               double storageDepth) {
        double deficit = soil.voidFrac - soilMoist;
        if (deficit <= 0.0) return 0.0;

        double maxStorage = storage.depth
                            * storage.voidFrac;
        if (storageDepth >= maxStorage) return 0.0;

        return soil.conductivity
               * (1.0 + soil.depth * deficit
                  / (soilMoist + 0.001));
    }

    public double getDrainFlow(double storageDepth) {
        if (drainCoeff <= 0.0) return 0.0;
        if (storageDepth <= 0.0) return 0.0;

        return drainCoeff
               * Math.pow(storageDepth, drainExp);
    }

    public double getRunoff(double rainfall,
        double surfDepth, double soilMoist,
        double storageDepth, double dt) {
        double soilPerc = getSoilPerc(soilMoist,
                                       storageDepth);
        double surfInflow = Math.max(
            rainfall - soilPerc, 0.0);
        double surfCapacity = surface.depth
                              * surface.voidFrac;
        double overflow = surfDepth + surfInflow * dt
                          - surfCapacity;
        return Math.max(overflow, 0.0);
    }
}`,
    nim: `# lid.nim — LID/Green Infrastructure Controls
# SWMM5 Engine in Nim — Low Impact Development
# Models bioretention, permeable pavement, infiltration
# trenches, and vegetated swales with layered water balance

import math

type
  LidType = enum
    ltBioCell, ltPermPave, ltInfilTrench, ltVegSwale

  LidLayer = object
    depth: float64
    voidFrac: float64
    conductivity: float64

  LidUnit = object
    kind: LidType
    surface: LidLayer
    soil: LidLayer
    storage: LidLayer
    drainCoeff: float64
    drainExp: float64

proc getSoilPerc(lid: LidUnit, soilMoist: float64,
                  storageDepth: float64): float64 =
  let deficit = lid.soil.voidFrac - soilMoist
  if deficit <= 0.0:
    return 0.0

  let maxStorage = lid.storage.depth *
                   lid.storage.voidFrac
  if storageDepth >= maxStorage:
    return 0.0

  result = lid.soil.conductivity *
    (1.0 + lid.soil.depth * deficit /
     (soilMoist + 0.001))

proc getDrainFlow(lid: LidUnit,
                   storageDepth: float64): float64 =
  if lid.drainCoeff <= 0.0:
    return 0.0
  if storageDepth <= 0.0:
    return 0.0

  result = lid.drainCoeff *
    pow(storageDepth, lid.drainExp)

proc getRunoff(lid: LidUnit, rainfall: float64,
               surfDepth: float64, soilMoist: float64,
               storageDepth: float64,
               dt: float64): float64 =
  let soilPerc = getSoilPerc(lid, soilMoist,
                              storageDepth)
  let surfInflow = max(rainfall - soilPerc, 0.0)
  let surfCapacity = lid.surface.depth *
                     lid.surface.voidFrac
  let overflow = surfDepth + surfInflow * dt -
                 surfCapacity
  result = max(overflow, 0.0)`,
    ada: `-- lid.adb — LID/Green Infrastructure Controls
-- SWMM5 Engine in Ada — Low Impact Development
-- Models bioretention, permeable pavement, infiltration
-- trenches, and vegetated swales with layered water balance

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body Lid is

   type Lid_Type is (Bio_Cell, Perm_Pave,
                     Infil_Trench, Veg_Swale);

   type Lid_Layer is record
      Depth        : Float := 0.0;
      Void_Frac    : Float := 0.0;
      Conductivity : Float := 0.0;
   end record;

   type Lid_Unit is record
      Kind         : Lid_Type;
      Surface      : Lid_Layer;
      Soil         : Lid_Layer;
      Storage      : Lid_Layer;
      Drain_Coeff  : Float := 0.0;
      Drain_Exp    : Float := 0.0;
   end record;

   function Get_Soil_Perc
     (Lid           : Lid_Unit;
      Soil_Moist    : Float;
      Storage_Depth : Float) return Float
   is
      Deficit     : Float;
      Max_Storage : Float;
   begin
      Deficit := Lid.Soil.Void_Frac - Soil_Moist;
      if Deficit <= 0.0 then return 0.0; end if;

      Max_Storage := Lid.Storage.Depth
                     * Lid.Storage.Void_Frac;
      if Storage_Depth >= Max_Storage then
         return 0.0;
      end if;

      return Lid.Soil.Conductivity
             * (1.0 + Lid.Soil.Depth * Deficit
                / (Soil_Moist + 0.001));
   end Get_Soil_Perc;

   function Get_Drain_Flow
     (Lid           : Lid_Unit;
      Storage_Depth : Float) return Float
   is
   begin
      if Lid.Drain_Coeff <= 0.0 then return 0.0; end if;
      if Storage_Depth <= 0.0 then return 0.0; end if;

      return Lid.Drain_Coeff
             * (Storage_Depth ** Lid.Drain_Exp);
   end Get_Drain_Flow;

   function Get_Runoff
     (Lid           : Lid_Unit;
      Rainfall      : Float;
      Surf_Depth    : Float;
      Soil_Moist    : Float;
      Storage_Depth : Float;
      Dt            : Float) return Float
   is
      Soil_Perc     : Float;
      Surf_Inflow   : Float;
      Surf_Capacity : Float;
      Overflow      : Float;
   begin
      Soil_Perc := Get_Soil_Perc(Lid, Soil_Moist,
                                  Storage_Depth);
      Surf_Inflow := Float'Max(
          Rainfall - Soil_Perc, 0.0);
      Surf_Capacity := Lid.Surface.Depth
                       * Lid.Surface.Void_Frac;
      Overflow := Surf_Depth + Surf_Inflow * Dt
                  - Surf_Capacity;
      return Float'Max(Overflow, 0.0);
   end Get_Runoff;

end Lid;`,
    chapel: `// lid.chpl — LID/Green Infrastructure Controls
// SWMM5 Engine in Chapel — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

enum LidType { BioCell, PermPave,
               InfilTrench, VegSwale }

record LidLayer {
    var depth: real;
    var voidFrac: real;
    var conductivity: real;
}

record LidUnit {
    var kind: LidType;
    var surface: LidLayer;
    var soil: LidLayer;
    var storage: LidLayer;
    var drainCoeff: real;
    var drainExp: real;

    proc getSoilPerc(soilMoist: real,
                     storageDepth: real): real {
        const deficit = soil.voidFrac - soilMoist;
        if deficit <= 0.0 then return 0.0;

        const maxStorage = storage.depth
                           * storage.voidFrac;
        if storageDepth >= maxStorage then return 0.0;

        return soil.conductivity
               * (1.0 + soil.depth * deficit
                  / (soilMoist + 0.001));
    }

    proc getDrainFlow(storageDepth: real): real {
        if drainCoeff <= 0.0 then return 0.0;
        if storageDepth <= 0.0 then return 0.0;

        return drainCoeff
               * storageDepth ** drainExp;
    }

    proc getRunoff(rainfall: real, surfDepth: real,
                   soilMoist: real,
                   storageDepth: real,
                   dt: real): real {
        const soilPerc = getSoilPerc(soilMoist,
                                      storageDepth);
        const surfInflow = max(
            rainfall - soilPerc, 0.0);
        const surfCapacity = surface.depth
                             * surface.voidFrac;
        const overflow = surfDepth + surfInflow * dt
                         - surfCapacity;
        return max(overflow, 0.0);
    }
}`,
    swift: `// lid.swift — LID/Green Infrastructure Controls
// SWMM5 Engine in Swift — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

import Foundation

enum LidType {
    case bioCell, permPave, infilTrench, vegSwale
}

struct LidLayer {
    let depth: Double
    let voidFrac: Double
    let conductivity: Double
}

struct LidUnit {
    let type: LidType
    let surface: LidLayer
    let soil: LidLayer
    let storage: LidLayer
    let drainCoeff: Double
    let drainExp: Double

    func getSoilPerc(soilMoist: Double,
                     storageDepth: Double) -> Double {
        let deficit = soil.voidFrac - soilMoist
        guard deficit > 0.0 else { return 0.0 }

        let maxStorage = storage.depth
                         * storage.voidFrac
        guard storageDepth < maxStorage else {
            return 0.0
        }

        return soil.conductivity
               * (1.0 + soil.depth * deficit
                  / (soilMoist + 0.001))
    }

    func getDrainFlow(
            storageDepth: Double) -> Double {
        guard drainCoeff > 0.0 else { return 0.0 }
        guard storageDepth > 0.0 else { return 0.0 }

        return drainCoeff
               * pow(storageDepth, drainExp)
    }

    func getRunoff(rainfall: Double,
                   surfDepth: Double,
                   soilMoist: Double,
                   storageDepth: Double,
                   dt: Double) -> Double {
        let soilPerc = getSoilPerc(
            soilMoist: soilMoist,
            storageDepth: storageDepth)
        let surfInflow = max(
            rainfall - soilPerc, 0.0)
        let surfCapacity = surface.depth
                           * surface.voidFrac
        let overflow = surfDepth + surfInflow * dt
                       - surfCapacity
        return max(overflow, 0.0)
    }
}`,
    kotlin: `// Lid.kt — LID/Green Infrastructure Controls
// SWMM5 Engine in Kotlin — Low Impact Development
// Models bioretention, permeable pavement, infiltration
// trenches, and vegetated swales with layered water balance

package swmm

import kotlin.math.max
import kotlin.math.pow

enum class LidType {
    BIO_CELL, PERM_PAVE, INFIL_TRENCH, VEG_SWALE
}

data class LidLayer(
    val depth: Double,
    val voidFrac: Double,
    val conductivity: Double
)

data class LidUnit(
    val type: LidType,
    val surface: LidLayer,
    val soil: LidLayer,
    val storage: LidLayer,
    val drainCoeff: Double,
    val drainExp: Double
) {
    fun getSoilPerc(soilMoist: Double,
                    storageDepth: Double): Double {
        val deficit = soil.voidFrac - soilMoist
        if (deficit <= 0.0) return 0.0

        val maxStorage = storage.depth *
                         storage.voidFrac
        if (storageDepth >= maxStorage) return 0.0

        return soil.conductivity *
               (1.0 + soil.depth * deficit /
                (soilMoist + 0.001))
    }

    fun getDrainFlow(storageDepth: Double): Double {
        if (drainCoeff <= 0.0) return 0.0
        if (storageDepth <= 0.0) return 0.0

        return drainCoeff *
               storageDepth.pow(drainExp)
    }

    fun getRunoff(rainfall: Double,
                  surfDepth: Double,
                  soilMoist: Double,
                  storageDepth: Double,
                  dt: Double): Double {
        val soilPerc = getSoilPerc(soilMoist,
                                    storageDepth)
        val surfInflow = max(
            rainfall - soilPerc, 0.0)
        val surfCapacity = surface.depth *
                           surface.voidFrac
        val overflow = surfDepth + surfInflow * dt -
                       surfCapacity
        return max(overflow, 0.0)
    }
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
    zig: `// link.zig — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in Zig — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

const std = @import("std");
const math = std.math;

const GRAVITY: f64 = 32.174; // ft/s²
const MAX_ITER: usize = 50;
const TOLERANCE: f64 = 1.0e-6;

const Xsect = struct {
    y_full: f64, // full depth = diameter (ft)
    a_full: f64, // full area (ft²)
    r_full: f64, // full hydraulic radius (ft)
    w_max: f64,  // maximum top width (ft)

    pub fn getArea(self: Xsect, depth: f64) f64 {
        const r = self.y_full / 2.0;
        const y_norm = depth / self.y_full;
        if (y_norm <= 0.0) return 0.0;
        if (y_norm >= 1.0) return self.a_full;

        const theta = 2.0 * math.acos(1.0 - 2.0 * y_norm);
        return r * r * (theta - @sin(theta)) / 2.0;
    }

    pub fn getHydRadius(self: Xsect, depth: f64) f64 {
        const r = self.y_full / 2.0;
        const y_norm = depth / self.y_full;
        if (y_norm <= 0.0) return 0.0;
        if (y_norm >= 1.0) return self.r_full;

        const theta = 2.0 * math.acos(1.0 - 2.0 * y_norm);
        const area = r * r * (theta - @sin(theta)) / 2.0;
        const perim = r * theta;
        if (perim <= 0.0) return 0.0;

        return area / perim;
    }

    pub fn getNormalDepth(self: Xsect, n_manning: f64,
                          slope: f64, q_target: f64) f64 {
        if (q_target <= 0.0 or slope <= 0.0) return 0.0;

        var y_lo: f64 = 0.0;
        var y_hi: f64 = self.y_full;

        var i: usize = 0;
        while (i < MAX_ITER) : (i += 1) {
            const y_mid = (y_lo + y_hi) / 2.0;
            const area = self.getArea(y_mid);
            const hyd_rad = self.getHydRadius(y_mid);
            const q_calc = (1.0 / n_manning) * area *
                math.pow(f64, hyd_rad, 2.0 / 3.0) *
                @sqrt(slope);

            if (@fabs(q_calc - q_target) < TOLERANCE) break;
            if (q_calc < q_target) {
                y_lo = y_mid;
            } else {
                y_hi = y_mid;
            }
        }
        return (y_lo + y_hi) / 2.0;
    }

    pub fn getCriticalDepth(self: Xsect, q_target: f64) f64 {
        if (q_target <= 0.0) return 0.0;

        const rhs = (q_target * q_target) / GRAVITY;
        var y_lo: f64 = 0.0;
        var y_hi: f64 = self.y_full;

        var i: usize = 0;
        while (i < MAX_ITER) : (i += 1) {
            const y_mid = (y_lo + y_hi) / 2.0;
            const r = self.y_full / 2.0;
            const y_norm = y_mid / self.y_full;
            if (y_norm <= 0.0) { y_lo = y_mid; continue; }
            if (y_norm >= 1.0) { y_hi = y_mid; continue; }

            const theta = 2.0 * math.acos(1.0 - 2.0 * y_norm);
            const area = r * r * (theta - @sin(theta)) / 2.0;
            const top_w = 2.0 * r * @sin(theta / 2.0);

            if (top_w <= 0.0) { y_lo = y_mid; continue; }
            const lhs = (area * area * area) / top_w;

            if (@fabs(lhs - rhs) < TOLERANCE) break;
            if (lhs < rhs) {
                y_lo = y_mid;
            } else {
                y_hi = y_mid;
            }
        }
        return (y_lo + y_hi) / 2.0;
    }
};`,
    cpp: `// link.cpp — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in C++ — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

#include <cmath>
#include <algorithm>

namespace swmm {

constexpr double GRAVITY = 32.174;   // ft/s²
constexpr int    MAX_ITER = 50;
constexpr double TOLERANCE = 1.0e-6;

struct Xsect {
    double yFull;    // full depth = diameter (ft)
    double aFull;    // full area (ft²)
    double rFull;    // full hydraulic radius (ft)
    double wMax;     // maximum top width (ft)

    double getArea(double depth) const {
        double r = yFull / 2.0;
        double yNorm = depth / yFull;
        if (yNorm <= 0.0) return 0.0;
        if (yNorm >= 1.0) return aFull;

        double theta = 2.0 * std::acos(1.0 - 2.0 * yNorm);
        return r * r * (theta - std::sin(theta)) / 2.0;
    }

    double getHydRadius(double depth) const {
        double r = yFull / 2.0;
        double yNorm = depth / yFull;
        if (yNorm <= 0.0) return 0.0;
        if (yNorm >= 1.0) return rFull;

        double theta = 2.0 * std::acos(1.0 - 2.0 * yNorm);
        double area  = r * r * (theta - std::sin(theta)) / 2.0;
        double perim = r * theta;
        if (perim <= 0.0) return 0.0;

        return area / perim;
    }

    double getNormalDepth(double nManning, double slope,
                          double qTarget) const {
        if (qTarget <= 0.0 || slope <= 0.0) return 0.0;

        double yLo = 0.0, yHi = yFull;

        for (int i = 0; i < MAX_ITER; ++i) {
            double yMid = (yLo + yHi) / 2.0;
            double area = getArea(yMid);
            double hydRad = getHydRadius(yMid);
            double qCalc = (1.0 / nManning) * area
                           * std::pow(hydRad, 2.0 / 3.0)
                           * std::sqrt(slope);

            if (std::abs(qCalc - qTarget) < TOLERANCE) break;
            if (qCalc < qTarget) yLo = yMid;
            else                 yHi = yMid;
        }
        return (yLo + yHi) / 2.0;
    }

    double getCriticalDepth(double qTarget) const {
        if (qTarget <= 0.0) return 0.0;

        double rhs = (qTarget * qTarget) / GRAVITY;
        double yLo = 0.0, yHi = yFull;

        for (int i = 0; i < MAX_ITER; ++i) {
            double yMid = (yLo + yHi) / 2.0;
            double r = yFull / 2.0;
            double yNorm = yMid / yFull;
            if (yNorm <= 0.0) { yLo = yMid; continue; }
            if (yNorm >= 1.0) { yHi = yMid; continue; }

            double theta = 2.0 * std::acos(1.0 - 2.0 * yNorm);
            double area  = r * r * (theta - std::sin(theta)) / 2.0;
            double topW  = 2.0 * r * std::sin(theta / 2.0);

            if (topW <= 0.0) { yLo = yMid; continue; }
            double lhs = (area * area * area) / topW;

            if (std::abs(lhs - rhs) < TOLERANCE) break;
            if (lhs < rhs) yLo = yMid;
            else           yHi = yMid;
        }
        return (yLo + yHi) / 2.0;
    }
};

} // namespace swmm`,
    csharp: `// Link.cs — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in C# — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

using System;

namespace Swmm
{
    public class Xsect
    {
        public double YFull { get; }
        public double AFull { get; }
        public double RFull { get; }
        public double WMax  { get; }

        private const double Gravity   = 32.174;
        private const int    MaxIter   = 50;
        private const double Tolerance = 1.0e-6;

        public Xsect(double yFull, double aFull,
                      double rFull, double wMax)
        {
            YFull = yFull; AFull = aFull;
            RFull = rFull; WMax  = wMax;
        }

        public double GetArea(double depth)
        {
            double r = YFull / 2.0;
            double yNorm = depth / YFull;
            if (yNorm <= 0.0) return 0.0;
            if (yNorm >= 1.0) return AFull;

            double theta = 2.0 * Math.Acos(1.0 - 2.0 * yNorm);
            return r * r * (theta - Math.Sin(theta)) / 2.0;
        }

        public double GetHydRadius(double depth)
        {
            double r = YFull / 2.0;
            double yNorm = depth / YFull;
            if (yNorm <= 0.0) return 0.0;
            if (yNorm >= 1.0) return RFull;

            double theta = 2.0 * Math.Acos(1.0 - 2.0 * yNorm);
            double area  = r * r * (theta - Math.Sin(theta)) / 2.0;
            double perim = r * theta;
            if (perim <= 0.0) return 0.0;

            return area / perim;
        }

        public double GetNormalDepth(double nManning,
                                      double slope,
                                      double qTarget)
        {
            if (qTarget <= 0.0 || slope <= 0.0) return 0.0;

            double yLo = 0.0, yHi = YFull;

            for (int i = 0; i < MaxIter; i++)
            {
                double yMid = (yLo + yHi) / 2.0;
                double area = GetArea(yMid);
                double hydRad = GetHydRadius(yMid);
                double qCalc = (1.0 / nManning) * area
                    * Math.Pow(hydRad, 2.0 / 3.0)
                    * Math.Sqrt(slope);

                if (Math.Abs(qCalc - qTarget) < Tolerance) break;
                if (qCalc < qTarget) yLo = yMid;
                else                 yHi = yMid;
            }
            return (yLo + yHi) / 2.0;
        }

        public double GetCriticalDepth(double qTarget)
        {
            if (qTarget <= 0.0) return 0.0;

            double rhs = (qTarget * qTarget) / Gravity;
            double yLo = 0.0, yHi = YFull;

            for (int i = 0; i < MaxIter; i++)
            {
                double yMid = (yLo + yHi) / 2.0;
                double r = YFull / 2.0;
                double yNorm = yMid / YFull;
                if (yNorm <= 0.0) { yLo = yMid; continue; }
                if (yNorm >= 1.0) { yHi = yMid; continue; }

                double theta = 2.0 * Math.Acos(1.0 - 2.0 * yNorm);
                double area = r * r
                    * (theta - Math.Sin(theta)) / 2.0;
                double topW = 2.0 * r * Math.Sin(theta / 2.0);

                if (topW <= 0.0) { yLo = yMid; continue; }
                double lhs = Math.Pow(area, 3) / topW;

                if (Math.Abs(lhs - rhs) < Tolerance) break;
                if (lhs < rhs) yLo = yMid;
                else           yHi = yMid;
            }
            return (yLo + yHi) / 2.0;
        }
    }
}`,
    matlab: `% link.m — Conduit Hydraulics (Circular Cross Section)
% SWMM5 Engine in MATLAB — Pipe Geometry & Manning's Equation
% Computes area, hydraulic radius, normal depth, and
% critical depth for circular conduits

function area = xsect_get_area(xs, depth)
    GRAVITY   = 32.174;
    MAX_ITER  = 50;
    TOLERANCE = 1.0e-6;

    r = xs.y_full / 2.0;
    y_norm = depth / xs.y_full;
    if y_norm <= 0.0
        area = 0.0; return;
    end
    if y_norm >= 1.0
        area = xs.a_full; return;
    end

    theta = 2.0 * acos(1.0 - 2.0 * y_norm);
    area = r * r * (theta - sin(theta)) / 2.0;
end

function hyd_r = xsect_get_hyd_radius(xs, depth)
    r = xs.y_full / 2.0;
    y_norm = depth / xs.y_full;
    if y_norm <= 0.0
        hyd_r = 0.0; return;
    end
    if y_norm >= 1.0
        hyd_r = xs.r_full; return;
    end

    theta = 2.0 * acos(1.0 - 2.0 * y_norm);
    area  = r * r * (theta - sin(theta)) / 2.0;
    perim = r * theta;
    if perim <= 0.0
        hyd_r = 0.0; return;
    end
    hyd_r = area / perim;
end

function depth = xsect_get_normal_depth(xs, n_manning, ...
                                         slope, q_target)
    MAX_ITER  = 50;
    TOLERANCE = 1.0e-6;
    if q_target <= 0.0 || slope <= 0.0
        depth = 0.0; return;
    end

    y_lo = 0.0;
    y_hi = xs.y_full;
    for i = 1:MAX_ITER
        y_mid  = (y_lo + y_hi) / 2.0;
        area   = xsect_get_area(xs, y_mid);
        hyd_r  = xsect_get_hyd_radius(xs, y_mid);
        q_calc = (1.0 / n_manning) * area ...
                 * hyd_r^(2.0/3.0) * sqrt(slope);

        if abs(q_calc - q_target) < TOLERANCE, break; end
        if q_calc < q_target
            y_lo = y_mid;
        else
            y_hi = y_mid;
        end
    end
    depth = (y_lo + y_hi) / 2.0;
end

function depth = xsect_get_critical_depth(xs, q_target)
    GRAVITY   = 32.174;
    MAX_ITER  = 50;
    TOLERANCE = 1.0e-6;
    if q_target <= 0.0
        depth = 0.0; return;
    end

    rhs  = (q_target * q_target) / GRAVITY;
    y_lo = 0.0;
    y_hi = xs.y_full;
    for i = 1:MAX_ITER
        y_mid  = (y_lo + y_hi) / 2.0;
        r      = xs.y_full / 2.0;
        y_norm = y_mid / xs.y_full;
        if y_norm <= 0.0, y_lo = y_mid; continue; end
        if y_norm >= 1.0, y_hi = y_mid; continue; end

        theta = 2.0 * acos(1.0 - 2.0 * y_norm);
        area  = r * r * (theta - sin(theta)) / 2.0;
        top_w = 2.0 * r * sin(theta / 2.0);

        if top_w <= 0.0, y_lo = y_mid; continue; end
        lhs = area^3 / top_w;

        if abs(lhs - rhs) < TOLERANCE, break; end
        if lhs < rhs
            y_lo = y_mid;
        else
            y_hi = y_mid;
        end
    end
    depth = (y_lo + y_hi) / 2.0;
end`,
    r: `# link.R — Conduit Hydraulics (Circular Cross Section)
# SWMM5 Engine in R — Pipe Geometry & Manning's Equation
# Computes area, hydraulic radius, normal depth, and
# critical depth for circular conduits

GRAVITY   <- 32.174   # ft/s^2
MAX_ITER  <- 50
TOLERANCE <- 1.0e-6

create_xsect <- function(y_full, a_full, r_full, w_max) {
    list(y_full = y_full, a_full = a_full,
         r_full = r_full, w_max  = w_max)
}

xsect_get_area <- function(xs, depth) {
    r      <- xs$y_full / 2.0
    y_norm <- depth / xs$y_full
    if (y_norm <= 0.0) return(0.0)
    if (y_norm >= 1.0) return(xs$a_full)

    theta <- 2.0 * acos(1.0 - 2.0 * y_norm)
    r * r * (theta - sin(theta)) / 2.0
}

xsect_get_hyd_radius <- function(xs, depth) {
    r      <- xs$y_full / 2.0
    y_norm <- depth / xs$y_full
    if (y_norm <= 0.0) return(0.0)
    if (y_norm >= 1.0) return(xs$r_full)

    theta <- 2.0 * acos(1.0 - 2.0 * y_norm)
    area  <- r * r * (theta - sin(theta)) / 2.0
    perim <- r * theta
    if (perim <= 0.0) return(0.0)
    area / perim
}

xsect_get_normal_depth <- function(xs, n_manning,
                                    slope, q_target) {
    if (q_target <= 0.0 || slope <= 0.0) return(0.0)

    y_lo <- 0.0
    y_hi <- xs$y_full

    for (i in seq_len(MAX_ITER)) {
        y_mid  <- (y_lo + y_hi) / 2.0
        area   <- xsect_get_area(xs, y_mid)
        hyd_r  <- xsect_get_hyd_radius(xs, y_mid)
        q_calc <- (1.0 / n_manning) * area *
                  hyd_r^(2.0 / 3.0) * sqrt(slope)

        if (abs(q_calc - q_target) < TOLERANCE) break
        if (q_calc < q_target) y_lo <- y_mid
        else                   y_hi <- y_mid
    }
    (y_lo + y_hi) / 2.0
}

xsect_get_critical_depth <- function(xs, q_target) {
    if (q_target <= 0.0) return(0.0)

    rhs  <- (q_target * q_target) / GRAVITY
    y_lo <- 0.0
    y_hi <- xs$y_full

    for (i in seq_len(MAX_ITER)) {
        y_mid  <- (y_lo + y_hi) / 2.0
        r      <- xs$y_full / 2.0
        y_norm <- y_mid / xs$y_full
        if (y_norm <= 0.0) { y_lo <- y_mid; next }
        if (y_norm >= 1.0) { y_hi <- y_mid; next }

        theta <- 2.0 * acos(1.0 - 2.0 * y_norm)
        area  <- r * r * (theta - sin(theta)) / 2.0
        top_w <- 2.0 * r * sin(theta / 2.0)

        if (top_w <= 0.0) { y_lo <- y_mid; next }
        lhs <- area^3 / top_w

        if (abs(lhs - rhs) < TOLERANCE) break
        if (lhs < rhs) y_lo <- y_mid
        else           y_hi <- y_mid
    }
    (y_lo + y_hi) / 2.0
}`,
    delphi: `{ link.pas — Conduit Hydraulics (Circular Cross Section) }
{ SWMM5 Engine in Delphi — Pipe Geometry & Manning's Equation }
{ Computes area, hydraulic radius, normal depth, and }
{ critical depth for circular conduits }

unit Link;

interface

const
  GRAVITY   = 32.174;
  MAX_ITER  = 50;
  TOLERANCE = 1.0E-6;

type
  TXsect = class
  private
    FYFull: Double;
    FAFull: Double;
    FRFull: Double;
    FWMax:  Double;
  public
    constructor Create(AYFull, AAFull,
                       ARFull, AWMax: Double);
    function GetArea(Depth: Double): Double;
    function GetHydRadius(Depth: Double): Double;
    function GetNormalDepth(NManning, Slope,
                            QTarget: Double): Double;
    function GetCriticalDepth(QTarget: Double): Double;
  end;

implementation

uses Math;

constructor TXsect.Create(AYFull, AAFull,
                           ARFull, AWMax: Double);
begin
  FYFull := AYFull;  FAFull := AAFull;
  FRFull := ARFull;  FWMax  := AWMax;
end;

function TXsect.GetArea(Depth: Double): Double;
var
  R, YNorm, Theta: Double;
begin
  R     := FYFull / 2.0;
  YNorm := Depth / FYFull;
  if YNorm <= 0.0 then Exit(0.0);
  if YNorm >= 1.0 then Exit(FAFull);

  Theta  := 2.0 * ArcCos(1.0 - 2.0 * YNorm);
  Result := R * R * (Theta - Sin(Theta)) / 2.0;
end;

function TXsect.GetHydRadius(Depth: Double): Double;
var
  R, YNorm, Theta, Area, Perim: Double;
begin
  R     := FYFull / 2.0;
  YNorm := Depth / FYFull;
  if YNorm <= 0.0 then Exit(0.0);
  if YNorm >= 1.0 then Exit(FRFull);

  Theta := 2.0 * ArcCos(1.0 - 2.0 * YNorm);
  Area  := R * R * (Theta - Sin(Theta)) / 2.0;
  Perim := R * Theta;
  if Perim <= 0.0 then Exit(0.0);
  Result := Area / Perim;
end;

function TXsect.GetNormalDepth(NManning, Slope,
                                QTarget: Double): Double;
var
  YLo, YHi, YMid, Area, HydRad, QCalc: Double;
  I: Integer;
begin
  if (QTarget <= 0.0) or (Slope <= 0.0) then Exit(0.0);

  YLo := 0.0;
  YHi := FYFull;
  for I := 1 to MAX_ITER do
  begin
    YMid   := (YLo + YHi) / 2.0;
    Area   := GetArea(YMid);
    HydRad := GetHydRadius(YMid);
    QCalc  := (1.0 / NManning) * Area
              * Power(HydRad, 2.0/3.0) * Sqrt(Slope);

    if Abs(QCalc - QTarget) < TOLERANCE then Break;
    if QCalc < QTarget then YLo := YMid
    else                    YHi := YMid;
  end;
  Result := (YLo + YHi) / 2.0;
end;

function TXsect.GetCriticalDepth(QTarget: Double): Double;
var
  R, YNorm, Theta, Area, TopW, Lhs, Rhs: Double;
  YLo, YHi, YMid: Double;
  I: Integer;
begin
  if QTarget <= 0.0 then Exit(0.0);

  Rhs := (QTarget * QTarget) / GRAVITY;
  YLo := 0.0;
  YHi := FYFull;
  for I := 1 to MAX_ITER do
  begin
    YMid  := (YLo + YHi) / 2.0;
    R     := FYFull / 2.0;
    YNorm := YMid / FYFull;
    if YNorm <= 0.0 then begin YLo := YMid; Continue; end;
    if YNorm >= 1.0 then begin YHi := YMid; Continue; end;

    Theta := 2.0 * ArcCos(1.0 - 2.0 * YNorm);
    Area  := R * R * (Theta - Sin(Theta)) / 2.0;
    TopW  := 2.0 * R * Sin(Theta / 2.0);

    if TopW <= 0.0 then begin YLo := YMid; Continue; end;
    Lhs := Area * Area * Area / TopW;

    if Abs(Lhs - Rhs) < TOLERANCE then Break;
    if Lhs < Rhs then YLo := YMid
    else              YHi := YMid;
  end;
  Result := (YLo + YHi) / 2.0;
end;

end.`,
    typescript: `// link.ts — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in TypeScript — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

const GRAVITY: number   = 32.174;
const MAX_ITER: number  = 50;
const TOLERANCE: number = 1.0e-6;

interface XsectParams {
    yFull: number;
    aFull: number;
    rFull: number;
    wMax: number;
}

class Xsect {
    readonly yFull: number;
    readonly aFull: number;
    readonly rFull: number;
    readonly wMax: number;

    constructor(params: XsectParams) {
        this.yFull = params.yFull;
        this.aFull = params.aFull;
        this.rFull = params.rFull;
        this.wMax  = params.wMax;
    }

    getArea(depth: number): number {
        const r: number = this.yFull / 2.0;
        const yNorm: number = depth / this.yFull;
        if (yNorm <= 0.0) return 0.0;
        if (yNorm >= 1.0) return this.aFull;

        const theta: number = 2.0
            * Math.acos(1.0 - 2.0 * yNorm);
        return r * r * (theta - Math.sin(theta)) / 2.0;
    }

    getHydRadius(depth: number): number {
        const r: number = this.yFull / 2.0;
        const yNorm: number = depth / this.yFull;
        if (yNorm <= 0.0) return 0.0;
        if (yNorm >= 1.0) return this.rFull;

        const theta: number = 2.0
            * Math.acos(1.0 - 2.0 * yNorm);
        const area: number = r * r
            * (theta - Math.sin(theta)) / 2.0;
        const perim: number = r * theta;
        if (perim <= 0.0) return 0.0;
        return area / perim;
    }

    getNormalDepth(nManning: number, slope: number,
                   qTarget: number): number {
        if (qTarget <= 0.0 || slope <= 0.0) return 0.0;

        let yLo: number = 0.0;
        let yHi: number = this.yFull;

        for (let i = 0; i < MAX_ITER; i++) {
            const yMid: number = (yLo + yHi) / 2.0;
            const area: number = this.getArea(yMid);
            const hydRad: number = this.getHydRadius(yMid);
            const qCalc: number = (1.0 / nManning) * area
                * Math.pow(hydRad, 2.0 / 3.0)
                * Math.sqrt(slope);

            if (Math.abs(qCalc - qTarget) < TOLERANCE) break;
            if (qCalc < qTarget) yLo = yMid;
            else                 yHi = yMid;
        }
        return (yLo + yHi) / 2.0;
    }

    getCriticalDepth(qTarget: number): number {
        if (qTarget <= 0.0) return 0.0;

        const rhs: number = (qTarget * qTarget) / GRAVITY;
        let yLo: number = 0.0;
        let yHi: number = this.yFull;

        for (let i = 0; i < MAX_ITER; i++) {
            const yMid: number = (yLo + yHi) / 2.0;
            const r: number = this.yFull / 2.0;
            const yNorm: number = yMid / this.yFull;
            if (yNorm <= 0.0) { yLo = yMid; continue; }
            if (yNorm >= 1.0) { yHi = yMid; continue; }

            const theta: number = 2.0
                * Math.acos(1.0 - 2.0 * yNorm);
            const area: number = r * r
                * (theta - Math.sin(theta)) / 2.0;
            const topW: number = 2.0 * r
                * Math.sin(theta / 2.0);

            if (topW <= 0.0) { yLo = yMid; continue; }
            const lhs: number = Math.pow(area, 3) / topW;

            if (Math.abs(lhs - rhs) < TOLERANCE) break;
            if (lhs < rhs) yLo = yMid;
            else           yHi = yMid;
        }
        return (yLo + yHi) / 2.0;
    }
}

export { Xsect };`,
    cuda: `// link.cu — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in CUDA — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

#include <math.h>

#define GRAVITY   32.174f
#define MAX_ITER  50
#define TOLERANCE 1.0e-6f

struct Xsect {
    float yFull;
    float aFull;
    float rFull;
    float wMax;
};

__device__ float xsectGetArea(const Xsect* xs, float depth)
{
    float r = xs->yFull / 2.0f;
    float yNorm = depth / xs->yFull;
    if (yNorm <= 0.0f) return 0.0f;
    if (yNorm >= 1.0f) return xs->aFull;

    float theta = 2.0f * acosf(1.0f - 2.0f * yNorm);
    return r * r * (theta - sinf(theta)) / 2.0f;
}

__device__ float xsectGetHydRadius(const Xsect* xs,
                                     float depth)
{
    float r = xs->yFull / 2.0f;
    float yNorm = depth / xs->yFull;
    if (yNorm <= 0.0f) return 0.0f;
    if (yNorm >= 1.0f) return xs->rFull;

    float theta = 2.0f * acosf(1.0f - 2.0f * yNorm);
    float area  = r * r * (theta - sinf(theta)) / 2.0f;
    float perim = r * theta;
    if (perim <= 0.0f) return 0.0f;
    return area / perim;
}

__global__ void normalDepthKernel(Xsect* xsects,
    float* nManning, float* slopes, float* qTargets,
    float* results, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    Xsect xs = xsects[idx];
    float qTarget = qTargets[idx];
    float slope   = slopes[idx];
    if (qTarget <= 0.0f || slope <= 0.0f) {
        results[idx] = 0.0f; return;
    }

    float yLo = 0.0f, yHi = xs.yFull;
    for (int i = 0; i < MAX_ITER; i++) {
        float yMid = (yLo + yHi) / 2.0f;
        float area = xsectGetArea(&xs, yMid);
        float hydR = xsectGetHydRadius(&xs, yMid);
        float qCalc = (1.0f / nManning[idx]) * area
            * powf(hydR, 2.0f/3.0f) * sqrtf(slope);

        if (fabsf(qCalc - qTarget) < TOLERANCE) break;
        if (qCalc < qTarget) yLo = yMid;
        else                 yHi = yMid;
    }
    results[idx] = (yLo + yHi) / 2.0f;
}`,
    wasm: `;; link.wat — Conduit Hydraulics (Circular Cross Section)
;; SWMM5 Engine in WebAssembly — Pipe Geometry & Manning's Equation
;; Computes area, hydraulic radius, normal depth, and
;; critical depth for circular conduits

(module
  (func $getArea
    (param $yFull f64) (param $aFull f64)
    (param $depth f64)
    (result f64)
    (local $r f64) (local $yNorm f64) (local $theta f64)

    (local.set $r
      (f64.div (local.get $yFull) (f64.const 2.0)))
    (local.set $yNorm
      (f64.div (local.get $depth) (local.get $yFull)))

    (if (f64.le (local.get $yNorm) (f64.const 0.0))
      (then (return (f64.const 0.0))))
    (if (f64.ge (local.get $yNorm) (f64.const 1.0))
      (then (return (local.get $aFull))))

    (local.set $theta
      (f64.mul (f64.const 2.0)
        (call $acos
          (f64.sub (f64.const 1.0)
            (f64.mul (f64.const 2.0)
              (local.get $yNorm))))))

    (f64.div
      (f64.mul
        (f64.mul (local.get $r) (local.get $r))
        (f64.sub (local.get $theta)
          (call $sin (local.get $theta))))
      (f64.const 2.0))
  )

  (func $getHydRadius
    (param $yFull f64) (param $aFull f64)
    (param $rFull f64) (param $depth f64)
    (result f64)
    (local $r f64) (local $yNorm f64)
    (local $theta f64) (local $area f64)
    (local $perim f64)

    (local.set $r
      (f64.div (local.get $yFull) (f64.const 2.0)))
    (local.set $yNorm
      (f64.div (local.get $depth) (local.get $yFull)))

    (if (f64.le (local.get $yNorm) (f64.const 0.0))
      (then (return (f64.const 0.0))))
    (if (f64.ge (local.get $yNorm) (f64.const 1.0))
      (then (return (local.get $rFull))))

    (local.set $theta
      (f64.mul (f64.const 2.0)
        (call $acos
          (f64.sub (f64.const 1.0)
            (f64.mul (f64.const 2.0)
              (local.get $yNorm))))))
    (local.set $area
      (f64.div
        (f64.mul
          (f64.mul (local.get $r) (local.get $r))
          (f64.sub (local.get $theta)
            (call $sin (local.get $theta))))
        (f64.const 2.0)))
    (local.set $perim
      (f64.mul (local.get $r) (local.get $theta)))

    (if (f64.le (local.get $perim) (f64.const 0.0))
      (then (return (f64.const 0.0))))

    (f64.div (local.get $area) (local.get $perim))
  )

  (func $acos (param f64) (result f64)
    (f64.const 0.0))
  (func $sin (param f64) (result f64)
    (f64.const 0.0))
)`,
    mojo: `# link.mojo — Conduit Hydraulics (Circular Cross Section)
# SWMM5 Engine in Mojo — Pipe Geometry & Manning's Equation
# Computes area, hydraulic radius, normal depth, and
# critical depth for circular conduits

from math import acos, sin, sqrt, pow, abs

alias GRAVITY: Float64   = 32.174
alias MAX_ITER: Int       = 50
alias TOLERANCE: Float64  = 1.0e-6

struct Xsect:
    var y_full: Float64
    var a_full: Float64
    var r_full: Float64
    var w_max: Float64

    fn __init__(inout self, y_full: Float64,
                a_full: Float64, r_full: Float64,
                w_max: Float64):
        self.y_full = y_full
        self.a_full = a_full
        self.r_full = r_full
        self.w_max  = w_max

    fn get_area(self, depth: Float64) -> Float64:
        let r = self.y_full / 2.0
        let y_norm = depth / self.y_full
        if y_norm <= 0.0:
            return 0.0
        if y_norm >= 1.0:
            return self.a_full

        let theta = 2.0 * acos(1.0 - 2.0 * y_norm)
        return r * r * (theta - sin(theta)) / 2.0

    fn get_hyd_radius(self, depth: Float64) -> Float64:
        let r = self.y_full / 2.0
        let y_norm = depth / self.y_full
        if y_norm <= 0.0:
            return 0.0
        if y_norm >= 1.0:
            return self.r_full

        let theta = 2.0 * acos(1.0 - 2.0 * y_norm)
        let area = r * r * (theta - sin(theta)) / 2.0
        let perim = r * theta
        if perim <= 0.0:
            return 0.0
        return area / perim

    fn get_normal_depth(self, n_manning: Float64,
                        slope: Float64,
                        q_target: Float64) -> Float64:
        if q_target <= 0.0 or slope <= 0.0:
            return 0.0

        var y_lo: Float64 = 0.0
        var y_hi: Float64 = self.y_full

        for i in range(MAX_ITER):
            let y_mid = (y_lo + y_hi) / 2.0
            let area = self.get_area(y_mid)
            let hyd_r = self.get_hyd_radius(y_mid)
            let q_calc = (1.0 / n_manning) * area \
                * pow(hyd_r, 2.0 / 3.0) * sqrt(slope)

            if abs(q_calc - q_target) < TOLERANCE:
                break
            if q_calc < q_target:
                y_lo = y_mid
            else:
                y_hi = y_mid
        return (y_lo + y_hi) / 2.0

    fn get_critical_depth(self,
                          q_target: Float64) -> Float64:
        if q_target <= 0.0:
            return 0.0

        let rhs = (q_target * q_target) / GRAVITY
        var y_lo: Float64 = 0.0
        var y_hi: Float64 = self.y_full

        for i in range(MAX_ITER):
            let y_mid = (y_lo + y_hi) / 2.0
            let r = self.y_full / 2.0
            let y_norm = y_mid / self.y_full
            if y_norm <= 0.0:
                y_lo = y_mid
                continue
            if y_norm >= 1.0:
                y_hi = y_mid
                continue

            let theta = 2.0 * acos(1.0 - 2.0 * y_norm)
            let area = r * r * (theta - sin(theta)) / 2.0
            let top_w = 2.0 * r * sin(theta / 2.0)

            if top_w <= 0.0:
                y_lo = y_mid
                continue
            let lhs = area * area * area / top_w

            if abs(lhs - rhs) < TOLERANCE:
                break
            if lhs < rhs:
                y_lo = y_mid
            else:
                y_hi = y_mid
        return (y_lo + y_hi) / 2.0`,
    java: `// Link.java — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in Java — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

package swmm;

public class Xsect {
    private static final double GRAVITY   = 32.174;
    private static final int    MAX_ITER  = 50;
    private static final double TOLERANCE = 1.0e-6;

    private final double yFull;
    private final double aFull;
    private final double rFull;
    private final double wMax;

    public Xsect(double yFull, double aFull,
                  double rFull, double wMax) {
        this.yFull = yFull;
        this.aFull = aFull;
        this.rFull = rFull;
        this.wMax  = wMax;
    }

    public double getArea(double depth) {
        double r = yFull / 2.0;
        double yNorm = depth / yFull;
        if (yNorm <= 0.0) return 0.0;
        if (yNorm >= 1.0) return aFull;

        double theta = 2.0 * Math.acos(1.0 - 2.0 * yNorm);
        return r * r * (theta - Math.sin(theta)) / 2.0;
    }

    public double getHydRadius(double depth) {
        double r = yFull / 2.0;
        double yNorm = depth / yFull;
        if (yNorm <= 0.0) return 0.0;
        if (yNorm >= 1.0) return rFull;

        double theta = 2.0 * Math.acos(1.0 - 2.0 * yNorm);
        double area  = r * r
            * (theta - Math.sin(theta)) / 2.0;
        double perim = r * theta;
        if (perim <= 0.0) return 0.0;
        return area / perim;
    }

    public double getNormalDepth(double nManning,
                                  double slope,
                                  double qTarget) {
        if (qTarget <= 0.0 || slope <= 0.0) return 0.0;

        double yLo = 0.0, yHi = yFull;

        for (int i = 0; i < MAX_ITER; i++) {
            double yMid = (yLo + yHi) / 2.0;
            double area = getArea(yMid);
            double hydRad = getHydRadius(yMid);
            double qCalc = (1.0 / nManning) * area
                * Math.pow(hydRad, 2.0 / 3.0)
                * Math.sqrt(slope);

            if (Math.abs(qCalc - qTarget) < TOLERANCE) break;
            if (qCalc < qTarget) yLo = yMid;
            else                 yHi = yMid;
        }
        return (yLo + yHi) / 2.0;
    }

    public double getCriticalDepth(double qTarget) {
        if (qTarget <= 0.0) return 0.0;

        double rhs = (qTarget * qTarget) / GRAVITY;
        double yLo = 0.0, yHi = yFull;

        for (int i = 0; i < MAX_ITER; i++) {
            double yMid = (yLo + yHi) / 2.0;
            double r = yFull / 2.0;
            double yNorm = yMid / yFull;
            if (yNorm <= 0.0) { yLo = yMid; continue; }
            if (yNorm >= 1.0) { yHi = yMid; continue; }

            double theta = 2.0
                * Math.acos(1.0 - 2.0 * yNorm);
            double area = r * r
                * (theta - Math.sin(theta)) / 2.0;
            double topW = 2.0 * r
                * Math.sin(theta / 2.0);

            if (topW <= 0.0) { yLo = yMid; continue; }
            double lhs = Math.pow(area, 3) / topW;

            if (Math.abs(lhs - rhs) < TOLERANCE) break;
            if (lhs < rhs) yLo = yMid;
            else           yHi = yMid;
        }
        return (yLo + yHi) / 2.0;
    }
}`,
    nim: `# link.nim — Conduit Hydraulics (Circular Cross Section)
# SWMM5 Engine in Nim — Pipe Geometry & Manning's Equation
# Computes area, hydraulic radius, normal depth, and
# critical depth for circular conduits

import math

const
  Gravity   = 32.174
  MaxIter   = 50
  Tolerance = 1.0e-6

type
  Xsect = object
    yFull: float64
    aFull: float64
    rFull: float64
    wMax:  float64

proc newXsect(yFull, aFull, rFull, wMax: float64): Xsect =
  result = Xsect(yFull: yFull, aFull: aFull,
                  rFull: rFull, wMax: wMax)

proc getArea(xs: Xsect, depth: float64): float64 =
  let r = xs.yFull / 2.0
  let yNorm = depth / xs.yFull
  if yNorm <= 0.0: return 0.0
  if yNorm >= 1.0: return xs.aFull

  let theta = 2.0 * arccos(1.0 - 2.0 * yNorm)
  result = r * r * (theta - sin(theta)) / 2.0

proc getHydRadius(xs: Xsect, depth: float64): float64 =
  let r = xs.yFull / 2.0
  let yNorm = depth / xs.yFull
  if yNorm <= 0.0: return 0.0
  if yNorm >= 1.0: return xs.rFull

  let theta = 2.0 * arccos(1.0 - 2.0 * yNorm)
  let area = r * r * (theta - sin(theta)) / 2.0
  let perim = r * theta
  if perim <= 0.0: return 0.0
  result = area / perim

proc getNormalDepth(xs: Xsect, nManning: float64,
                     slope: float64,
                     qTarget: float64): float64 =
  if qTarget <= 0.0 or slope <= 0.0: return 0.0

  var yLo = 0.0
  var yHi = xs.yFull

  for i in 0 ..< MaxIter:
    let yMid = (yLo + yHi) / 2.0
    let area = xs.getArea(yMid)
    let hydRad = xs.getHydRadius(yMid)
    let qCalc = (1.0 / nManning) * area *
                pow(hydRad, 2.0 / 3.0) * sqrt(slope)

    if abs(qCalc - qTarget) < Tolerance: break
    if qCalc < qTarget: yLo = yMid
    else:               yHi = yMid
  result = (yLo + yHi) / 2.0

proc getCriticalDepth(xs: Xsect,
                       qTarget: float64): float64 =
  if qTarget <= 0.0: return 0.0

  let rhs = (qTarget * qTarget) / Gravity
  var yLo = 0.0
  var yHi = xs.yFull

  for i in 0 ..< MaxIter:
    let yMid = (yLo + yHi) / 2.0
    let r = xs.yFull / 2.0
    let yNorm = yMid / xs.yFull
    if yNorm <= 0.0:
      yLo = yMid; continue
    if yNorm >= 1.0:
      yHi = yMid; continue

    let theta = 2.0 * arccos(1.0 - 2.0 * yNorm)
    let area = r * r * (theta - sin(theta)) / 2.0
    let topW = 2.0 * r * sin(theta / 2.0)

    if topW <= 0.0:
      yLo = yMid; continue
    let lhs = area * area * area / topW

    if abs(lhs - rhs) < Tolerance: break
    if lhs < rhs: yLo = yMid
    else:         yHi = yMid
  result = (yLo + yHi) / 2.0`,
    ada: `-- link.adb — Conduit Hydraulics (Circular Cross Section)
-- SWMM5 Engine in Ada — Pipe Geometry & Manning's Equation
-- Computes area, hydraulic radius, normal depth, and
-- critical depth for circular conduits

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body Link is

   Gravity   : constant Float := 32.174;
   Max_Iter  : constant Integer := 50;
   Tolerance : constant Float := 1.0e-6;

   type Xsect is record
      Y_Full : Float;
      A_Full : Float;
      R_Full : Float;
      W_Max  : Float;
   end record;

   function Get_Area(Xs : Xsect;
                     Depth : Float) return Float is
      R      : Float := Xs.Y_Full / 2.0;
      Y_Norm : Float := Depth / Xs.Y_Full;
      Theta  : Float;
   begin
      if Y_Norm <= 0.0 then return 0.0; end if;
      if Y_Norm >= 1.0 then return Xs.A_Full; end if;

      Theta := 2.0 * Arccos(1.0 - 2.0 * Y_Norm);
      return R * R * (Theta - Sin(Theta)) / 2.0;
   end Get_Area;

   function Get_Hyd_Radius(Xs : Xsect;
                            Depth : Float) return Float is
      R      : Float := Xs.Y_Full / 2.0;
      Y_Norm : Float := Depth / Xs.Y_Full;
      Theta  : Float;
      Area   : Float;
      Perim  : Float;
   begin
      if Y_Norm <= 0.0 then return 0.0; end if;
      if Y_Norm >= 1.0 then return Xs.R_Full; end if;

      Theta := 2.0 * Arccos(1.0 - 2.0 * Y_Norm);
      Area  := R * R * (Theta - Sin(Theta)) / 2.0;
      Perim := R * Theta;
      if Perim <= 0.0 then return 0.0; end if;
      return Area / Perim;
   end Get_Hyd_Radius;

   function Get_Normal_Depth(Xs : Xsect;
                              N_Manning : Float;
                              Slope     : Float;
                              Q_Target  : Float)
                              return Float is
      Y_Lo, Y_Hi, Y_Mid : Float;
      Area, Hyd_R, Q_Calc : Float;
   begin
      if Q_Target <= 0.0 or Slope <= 0.0 then
         return 0.0;
      end if;

      Y_Lo := 0.0;
      Y_Hi := Xs.Y_Full;

      for I in 1 .. Max_Iter loop
         Y_Mid  := (Y_Lo + Y_Hi) / 2.0;
         Area   := Get_Area(Xs, Y_Mid);
         Hyd_R  := Get_Hyd_Radius(Xs, Y_Mid);
         Q_Calc := (1.0 / N_Manning) * Area
                   * Hyd_R ** (2.0 / 3.0)
                   * Sqrt(Slope);

         exit when abs(Q_Calc - Q_Target) < Tolerance;
         if Q_Calc < Q_Target then
            Y_Lo := Y_Mid;
         else
            Y_Hi := Y_Mid;
         end if;
      end loop;
      return (Y_Lo + Y_Hi) / 2.0;
   end Get_Normal_Depth;

   function Get_Critical_Depth(Xs : Xsect;
                                Q_Target : Float)
                                return Float is
      R, Y_Norm, Theta : Float;
      Area, Top_W, Lhs : Float;
      Rhs : Float;
      Y_Lo, Y_Hi, Y_Mid : Float;
   begin
      if Q_Target <= 0.0 then return 0.0; end if;

      Rhs  := (Q_Target * Q_Target) / Gravity;
      Y_Lo := 0.0;
      Y_Hi := Xs.Y_Full;

      for I in 1 .. Max_Iter loop
         Y_Mid  := (Y_Lo + Y_Hi) / 2.0;
         R      := Xs.Y_Full / 2.0;
         Y_Norm := Y_Mid / Xs.Y_Full;
         if Y_Norm <= 0.0 then
            Y_Lo := Y_Mid; goto Continue_Loop;
         end if;
         if Y_Norm >= 1.0 then
            Y_Hi := Y_Mid; goto Continue_Loop;
         end if;

         Theta := 2.0 * Arccos(1.0 - 2.0 * Y_Norm);
         Area  := R * R * (Theta - Sin(Theta)) / 2.0;
         Top_W := 2.0 * R * Sin(Theta / 2.0);

         if Top_W <= 0.0 then
            Y_Lo := Y_Mid; goto Continue_Loop;
         end if;
         Lhs := Area ** 3 / Top_W;

         exit when abs(Lhs - Rhs) < Tolerance;
         if Lhs < Rhs then
            Y_Lo := Y_Mid;
         else
            Y_Hi := Y_Mid;
         end if;
         <<Continue_Loop>>
      end loop;
      return (Y_Lo + Y_Hi) / 2.0;
   end Get_Critical_Depth;

end Link;`,
    chapel: `// link.chpl — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in Chapel — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

use Math;

const GRAVITY: real   = 32.174;
const MAX_ITER: int   = 50;
const TOLERANCE: real = 1.0e-6;

record Xsect {
    var yFull: real;
    var aFull: real;
    var rFull: real;
    var wMax:  real;
}

proc getArea(ref xs: Xsect, depth: real): real {
    const r = xs.yFull / 2.0;
    const yNorm = depth / xs.yFull;
    if yNorm <= 0.0 then return 0.0;
    if yNorm >= 1.0 then return xs.aFull;

    const theta = 2.0 * acos(1.0 - 2.0 * yNorm);
    return r * r * (theta - sin(theta)) / 2.0;
}

proc getHydRadius(ref xs: Xsect, depth: real): real {
    const r = xs.yFull / 2.0;
    const yNorm = depth / xs.yFull;
    if yNorm <= 0.0 then return 0.0;
    if yNorm >= 1.0 then return xs.rFull;

    const theta = 2.0 * acos(1.0 - 2.0 * yNorm);
    const area = r * r * (theta - sin(theta)) / 2.0;
    const perim = r * theta;
    if perim <= 0.0 then return 0.0;
    return area / perim;
}

proc getNormalDepth(ref xs: Xsect, nManning: real,
                     slope: real,
                     qTarget: real): real {
    if qTarget <= 0.0 || slope <= 0.0 then return 0.0;

    var yLo = 0.0;
    var yHi = xs.yFull;

    for i in 0..#MAX_ITER {
        const yMid = (yLo + yHi) / 2.0;
        const area = getArea(xs, yMid);
        const hydRad = getHydRadius(xs, yMid);
        const qCalc = (1.0 / nManning) * area
            * hydRad ** (2.0 / 3.0) * sqrt(slope);

        if abs(qCalc - qTarget) < TOLERANCE then break;
        if qCalc < qTarget then yLo = yMid;
        else                    yHi = yMid;
    }
    return (yLo + yHi) / 2.0;
}

proc getCriticalDepth(ref xs: Xsect,
                       qTarget: real): real {
    if qTarget <= 0.0 then return 0.0;

    const rhs = (qTarget * qTarget) / GRAVITY;
    var yLo = 0.0;
    var yHi = xs.yFull;

    for i in 0..#MAX_ITER {
        const yMid = (yLo + yHi) / 2.0;
        const r = xs.yFull / 2.0;
        const yNorm = yMid / xs.yFull;
        if yNorm <= 0.0 { yLo = yMid; continue; }
        if yNorm >= 1.0 { yHi = yMid; continue; }

        const theta = 2.0 * acos(1.0 - 2.0 * yNorm);
        const area = r * r
            * (theta - sin(theta)) / 2.0;
        const topW = 2.0 * r * sin(theta / 2.0);

        if topW <= 0.0 { yLo = yMid; continue; }
        const lhs = area ** 3 / topW;

        if abs(lhs - rhs) < TOLERANCE then break;
        if lhs < rhs then yLo = yMid;
        else              yHi = yMid;
    }
    return (yLo + yHi) / 2.0;
}`,
    swift: `// link.swift — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in Swift — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

import Foundation

let GRAVITY: Double   = 32.174
let MAX_ITER: Int     = 50
let TOLERANCE: Double = 1.0e-6

struct Xsect {
    let yFull: Double
    let aFull: Double
    let rFull: Double
    let wMax:  Double

    func getArea(depth: Double) -> Double {
        let r = yFull / 2.0
        let yNorm = depth / yFull
        guard yNorm > 0.0 else { return 0.0 }
        guard yNorm < 1.0 else { return aFull }

        let theta = 2.0 * acos(1.0 - 2.0 * yNorm)
        return r * r * (theta - sin(theta)) / 2.0
    }

    func getHydRadius(depth: Double) -> Double {
        let r = yFull / 2.0
        let yNorm = depth / yFull
        guard yNorm > 0.0 else { return 0.0 }
        guard yNorm < 1.0 else { return rFull }

        let theta = 2.0 * acos(1.0 - 2.0 * yNorm)
        let area = r * r * (theta - sin(theta)) / 2.0
        let perim = r * theta
        guard perim > 0.0 else { return 0.0 }
        return area / perim
    }

    func getNormalDepth(nManning: Double, slope: Double,
                        qTarget: Double) -> Double {
        guard qTarget > 0.0, slope > 0.0 else { return 0.0 }

        var yLo = 0.0
        var yHi = yFull

        for _ in 0..<MAX_ITER {
            let yMid = (yLo + yHi) / 2.0
            let area = getArea(depth: yMid)
            let hydRad = getHydRadius(depth: yMid)
            let qCalc = (1.0 / nManning) * area
                * pow(hydRad, 2.0 / 3.0) * sqrt(slope)

            if abs(qCalc - qTarget) < TOLERANCE { break }
            if qCalc < qTarget { yLo = yMid }
            else               { yHi = yMid }
        }
        return (yLo + yHi) / 2.0
    }

    func getCriticalDepth(qTarget: Double) -> Double {
        guard qTarget > 0.0 else { return 0.0 }

        let rhs = (qTarget * qTarget) / GRAVITY
        var yLo = 0.0
        var yHi = yFull

        for _ in 0..<MAX_ITER {
            let yMid = (yLo + yHi) / 2.0
            let r = yFull / 2.0
            let yNorm = yMid / yFull
            if yNorm <= 0.0 { yLo = yMid; continue }
            if yNorm >= 1.0 { yHi = yMid; continue }

            let theta = 2.0 * acos(1.0 - 2.0 * yNorm)
            let area = r * r
                * (theta - sin(theta)) / 2.0
            let topW = 2.0 * r * sin(theta / 2.0)

            if topW <= 0.0 { yLo = yMid; continue }
            let lhs = pow(area, 3) / topW

            if abs(lhs - rhs) < TOLERANCE { break }
            if lhs < rhs { yLo = yMid }
            else         { yHi = yMid }
        }
        return (yLo + yHi) / 2.0
    }
}`,
    kotlin: `// Link.kt — Conduit Hydraulics (Circular Cross Section)
// SWMM5 Engine in Kotlin — Pipe Geometry & Manning's Equation
// Computes area, hydraulic radius, normal depth, and
// critical depth for circular conduits

package swmm

import kotlin.math.*

private const val GRAVITY   = 32.174
private const val MAX_ITER  = 50
private const val TOLERANCE = 1.0e-6

data class Xsect(
    val yFull: Double,
    val aFull: Double,
    val rFull: Double,
    val wMax:  Double
) {
    fun getArea(depth: Double): Double {
        val r = yFull / 2.0
        val yNorm = depth / yFull
        if (yNorm <= 0.0) return 0.0
        if (yNorm >= 1.0) return aFull

        val theta = 2.0 * acos(1.0 - 2.0 * yNorm)
        return r * r * (theta - sin(theta)) / 2.0
    }

    fun getHydRadius(depth: Double): Double {
        val r = yFull / 2.0
        val yNorm = depth / yFull
        if (yNorm <= 0.0) return 0.0
        if (yNorm >= 1.0) return rFull

        val theta = 2.0 * acos(1.0 - 2.0 * yNorm)
        val area = r * r * (theta - sin(theta)) / 2.0
        val perim = r * theta
        if (perim <= 0.0) return 0.0
        return area / perim
    }

    fun getNormalDepth(nManning: Double, slope: Double,
                       qTarget: Double): Double {
        if (qTarget <= 0.0 || slope <= 0.0) return 0.0

        var yLo = 0.0
        var yHi = yFull

        for (i in 0 until MAX_ITER) {
            val yMid = (yLo + yHi) / 2.0
            val area = getArea(yMid)
            val hydRad = getHydRadius(yMid)
            val qCalc = (1.0 / nManning) * area *
                hydRad.pow(2.0 / 3.0) * sqrt(slope)

            if (abs(qCalc - qTarget) < TOLERANCE) break
            if (qCalc < qTarget) yLo = yMid
            else                 yHi = yMid
        }
        return (yLo + yHi) / 2.0
    }

    fun getCriticalDepth(qTarget: Double): Double {
        if (qTarget <= 0.0) return 0.0

        val rhs = (qTarget * qTarget) / GRAVITY
        var yLo = 0.0
        var yHi = yFull

        for (i in 0 until MAX_ITER) {
            val yMid = (yLo + yHi) / 2.0
            val r = yFull / 2.0
            val yNorm = yMid / yFull
            if (yNorm <= 0.0) { yLo = yMid; continue }
            if (yNorm >= 1.0) { yHi = yMid; continue }

            val theta = 2.0 * acos(1.0 - 2.0 * yNorm)
            val area = r * r
                * (theta - sin(theta)) / 2.0
            val topW = 2.0 * r * sin(theta / 2.0)

            if (topW <= 0.0) { yLo = yMid; continue }
            val lhs = area.pow(3) / topW

            if (abs(lhs - rhs) < TOLERANCE) break
            if (lhs < rhs) yLo = yMid
            else           yHi = yMid
        }
        return (yLo + yHi) / 2.0
    }
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
    zig: `// node.zig — Junction & Storage Nodes
// SWMM5 Engine in Zig — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

const std = @import("std");

const StorageCurve = struct {
    depths: []const f64,
    areas: []const f64,

    pub fn getVolume(self: StorageCurve, depth: f64) f64 {
        var vol: f64 = 0.0;

        var i: usize = 1;
        while (i < self.depths.len) : (i += 1) {
            if (depth <= self.depths[i]) {
                const frac = (depth - self.depths[i - 1]) /
                    (self.depths[i] - self.depths[i - 1]);
                const a_avg = self.areas[i - 1] +
                    frac * (self.areas[i] - self.areas[i - 1]);
                return vol + a_avg * (depth - self.depths[i - 1]);
            }
            vol += 0.5 * (self.areas[i - 1] + self.areas[i]) *
                (self.depths[i] - self.depths[i - 1]);
        }
        return vol;
    }
};

const Node = struct {
    invert_el: f64,  // invert elevation (ft)
    max_depth: f64,  // maximum depth (ft)
    depth: f64,      // current water depth (ft)
    volume: f64,     // current stored volume (ft³)
    overflow: f64,   // overflow rate (cfs)

    pub fn updateLevel(self: *Node, sc: StorageCurve,
                       q_in: f64, q_out: f64, dt: f64) void {
        const dv = (q_in - q_out) * dt;
        self.volume = @max(0.0, self.volume + dv);

        var i: usize = 1;
        while (i < sc.depths.len) : (i += 1) {
            const v = sc.getVolume(sc.depths[i]);
            if (v >= self.volume) {
                const v_prev = sc.getVolume(sc.depths[i - 1]);
                const a_avg = 0.5 *
                    (sc.areas[i - 1] + sc.areas[i]);
                self.depth = sc.depths[i - 1] +
                    (self.volume - v_prev) / a_avg;
                break;
            }
        }

        self.overflow = 0.0;
        if (self.depth > self.max_depth) {
            const top_area = sc.areas[sc.areas.len - 1];
            self.overflow = (self.depth - self.max_depth) *
                top_area / dt;
            self.depth = self.max_depth;
        }
    }
};`,
    cpp: `// node.cpp — Junction & Storage Nodes
// SWMM5 Engine in C++ — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

#include <vector>
#include <algorithm>

namespace swmm {

struct StorageCurve {
    std::vector<double> depths;
    std::vector<double> areas;

    double getVolume(double depth) const {
        double vol = 0.0;

        for (size_t i = 1; i < depths.size(); ++i) {
            if (depth <= depths[i]) {
                double frac = (depth - depths[i - 1])
                    / (depths[i] - depths[i - 1]);
                double aAvg = areas[i - 1]
                    + frac * (areas[i] - areas[i - 1]);
                return vol + aAvg * (depth - depths[i - 1]);
            }
            vol += 0.5 * (areas[i - 1] + areas[i])
                   * (depths[i] - depths[i - 1]);
        }
        return vol;
    }
};

struct Node {
    double invertEl;   // invert elevation (ft)
    double maxDepth;   // maximum depth (ft)
    double depth;      // current water depth (ft)
    double volume;     // current stored volume (ft³)
    double overflow;   // overflow rate (cfs)

    void updateLevel(const StorageCurve& sc,
                     double Qin, double Qout, double dt) {
        double dV = (Qin - Qout) * dt;
        volume = std::max(0.0, volume + dV);

        for (size_t i = 1; i < sc.depths.size(); ++i) {
            double v = sc.getVolume(sc.depths[i]);
            if (v >= volume) {
                double vPrev = sc.getVolume(sc.depths[i - 1]);
                double aAvg = 0.5
                    * (sc.areas[i - 1] + sc.areas[i]);
                depth = sc.depths[i - 1]
                    + (volume - vPrev) / aAvg;
                break;
            }
        }

        overflow = 0.0;
        if (depth > maxDepth) {
            double topArea = sc.areas.back();
            overflow = (depth - maxDepth) * topArea / dt;
            depth = maxDepth;
        }
    }
};

} // namespace swmm`,
    csharp: `// Node.cs — Junction & Storage Nodes
// SWMM5 Engine in C# — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

using System;
using System.Collections.Generic;

namespace Swmm
{
    public class StorageCurve
    {
        public List<double> Depths { get; }
        public List<double> Areas { get; }

        public StorageCurve(List<double> depths,
                            List<double> areas)
        {
            Depths = depths;
            Areas = areas;
        }

        public double GetVolume(double depth)
        {
            double vol = 0.0;
            for (int i = 1; i < Depths.Count; i++)
            {
                if (depth <= Depths[i])
                {
                    double frac = (depth - Depths[i - 1])
                        / (Depths[i] - Depths[i - 1]);
                    double aAvg = Areas[i - 1]
                        + frac * (Areas[i] - Areas[i - 1]);
                    return vol + aAvg
                        * (depth - Depths[i - 1]);
                }
                vol += 0.5 * (Areas[i - 1] + Areas[i])
                    * (Depths[i] - Depths[i - 1]);
            }
            return vol;
        }
    }

    public class Node
    {
        public double InvertEl { get; set; }
        public double MaxDepth { get; set; }
        public double Depth { get; set; }
        public double Volume { get; set; }
        public double Overflow { get; set; }

        public Node(double invertEl, double maxDepth)
        {
            InvertEl = invertEl;
            MaxDepth = maxDepth;
        }

        public void UpdateLevel(StorageCurve sc,
            double qIn, double qOut, double dt)
        {
            double dV = (qIn - qOut) * dt;
            Volume = Math.Max(0.0, Volume + dV);

            for (int i = 1; i < sc.Depths.Count; i++)
            {
                double v = sc.GetVolume(sc.Depths[i]);
                if (v >= Volume)
                {
                    double vPrev = sc.GetVolume(
                        sc.Depths[i - 1]);
                    double aAvg = 0.5 * (sc.Areas[i - 1]
                        + sc.Areas[i]);
                    Depth = sc.Depths[i - 1]
                        + (Volume - vPrev) / aAvg;
                    break;
                }
            }

            Overflow = 0.0;
            if (Depth > MaxDepth)
            {
                double topArea = sc.Areas[^1];
                Overflow = (Depth - MaxDepth)
                    * topArea / dt;
                Depth = MaxDepth;
            }
        }
    }
}`,
    matlab: `% node.m — Junction & Storage Nodes
% SWMM5 Engine in MATLAB — Node Water Level Updates
% Volume balance at junctions and storage nodes
% with depth-area relationship and overflow check

function sc = create_storage_curve(depths, areas)
    sc.depths = depths;
    sc.areas  = areas;
    sc.n_pts  = length(depths);
end

function vol = get_volume(sc, depth)
    vol = 0.0;
    for i = 2:sc.n_pts
        if depth <= sc.depths(i)
            frac = (depth - sc.depths(i-1)) ...
                / (sc.depths(i) - sc.depths(i-1));
            a_avg = sc.areas(i-1) ...
                + frac * (sc.areas(i) - sc.areas(i-1));
            vol = vol + a_avg ...
                * (depth - sc.depths(i-1));
            return;
        end
        vol = vol + 0.5 * (sc.areas(i-1) + sc.areas(i)) ...
            * (sc.depths(i) - sc.depths(i-1));
    end
end

function node = update_level(node, sc, Q_in, Q_out, dt)
    dV = (Q_in - Q_out) * dt;
    node.volume = max(0.0, node.volume + dV);

    for i = 2:sc.n_pts
        v = get_volume(sc, sc.depths(i));
        if v >= node.volume
            v_prev = get_volume(sc, sc.depths(i-1));
            a_avg = 0.5 * (sc.areas(i-1) + sc.areas(i));
            node.depth = sc.depths(i-1) ...
                + (node.volume - v_prev) / a_avg;
            break;
        end
    end

    node.overflow = 0.0;
    if node.depth > node.max_depth
        top_area = sc.areas(sc.n_pts);
        node.overflow = (node.depth - node.max_depth) ...
                        * top_area / dt;
        node.depth = node.max_depth;
    end
end`,
    r: `# node.R — Junction & Storage Nodes
# SWMM5 Engine in R — Node Water Level Updates
# Volume balance at junctions and storage nodes
# with depth-area relationship and overflow check

create_storage_curve <- function(depths, areas) {
    list(depths = depths, areas = areas)
}

get_volume <- function(sc, depth) {
    vol <- 0.0
    for (i in 2:length(sc$depths)) {
        if (depth <= sc$depths[i]) {
            frac <- (depth - sc$depths[i - 1]) /
                (sc$depths[i] - sc$depths[i - 1])
            a_avg <- sc$areas[i - 1] +
                frac * (sc$areas[i] - sc$areas[i - 1])
            return(vol + a_avg *
                (depth - sc$depths[i - 1]))
        }
        vol <- vol + 0.5 *
            (sc$areas[i - 1] + sc$areas[i]) *
            (sc$depths[i] - sc$depths[i - 1])
    }
    vol
}

create_node <- function(invert_el, max_depth) {
    list(invert_el = invert_el,
         max_depth = max_depth,
         depth = 0.0, volume = 0.0,
         overflow = 0.0)
}

update_level <- function(node, sc, q_in, q_out, dt) {
    dv <- (q_in - q_out) * dt
    node$volume <- max(0.0, node$volume + dv)

    for (i in 2:length(sc$depths)) {
        v <- get_volume(sc, sc$depths[i])
        if (v >= node$volume) {
            v_prev <- get_volume(sc, sc$depths[i - 1])
            a_avg <- 0.5 * (sc$areas[i - 1] + sc$areas[i])
            node$depth <- sc$depths[i - 1] +
                (node$volume - v_prev) / a_avg
            break
        }
    }

    node$overflow <- 0.0
    if (node$depth > node$max_depth) {
        top_area <- sc$areas[length(sc$areas)]
        node$overflow <- (node$depth - node$max_depth) *
            top_area / dt
        node$depth <- node$max_depth
    }
    node
}`,
    delphi: `{ node.pas — Junction & Storage Nodes }
{ SWMM5 Engine in Delphi — Node Water Level Updates }
{ Volume balance at junctions and storage nodes }
{ with depth-area relationship and overflow check }

unit NodeModule;

interface

uses Math;

const
  MAX_PTS = 10;

type
  TStorageCurve = class
  public
    Depths: array[0..MAX_PTS-1] of Double;
    Areas: array[0..MAX_PTS-1] of Double;
    NPts: Integer;
    function GetVolume(Depth: Double): Double;
  end;

  TNode = class
  public
    InvertEl: Double;
    MaxDepth: Double;
    Depth: Double;
    Volume: Double;
    Overflow: Double;
    constructor Create(AInvertEl, AMaxDepth: Double);
    procedure UpdateLevel(SC: TStorageCurve;
                          QIn, QOut, Dt: Double);
  end;

implementation

function TStorageCurve.GetVolume(Depth: Double): Double;
var
  I: Integer;
  Vol, Frac, AAvg: Double;
begin
  Vol := 0.0;
  for I := 1 to NPts - 1 do
  begin
    if Depth <= Depths[I] then
    begin
      Frac := (Depth - Depths[I-1])
        / (Depths[I] - Depths[I-1]);
      AAvg := Areas[I-1]
        + Frac * (Areas[I] - Areas[I-1]);
      Result := Vol + AAvg * (Depth - Depths[I-1]);
      Exit;
    end;
    Vol := Vol + 0.5 * (Areas[I-1] + Areas[I])
        * (Depths[I] - Depths[I-1]);
  end;
  Result := Vol;
end;

constructor TNode.Create(AInvertEl, AMaxDepth: Double);
begin
  InvertEl := AInvertEl;
  MaxDepth := AMaxDepth;
  Depth := 0.0;
  Volume := 0.0;
  Overflow := 0.0;
end;

procedure TNode.UpdateLevel(SC: TStorageCurve;
                             QIn, QOut, Dt: Double);
var
  DV, V, VPrev, AAvg, TopArea: Double;
  I: Integer;
begin
  DV := (QIn - QOut) * Dt;
  Volume := Max(0.0, Volume + DV);

  for I := 1 to SC.NPts - 1 do
  begin
    V := SC.GetVolume(SC.Depths[I]);
    if V >= Volume then
    begin
      VPrev := SC.GetVolume(SC.Depths[I-1]);
      AAvg := 0.5 * (SC.Areas[I-1] + SC.Areas[I]);
      Depth := SC.Depths[I-1]
        + (Volume - VPrev) / AAvg;
      Break;
    end;
  end;

  Overflow := 0.0;
  if Depth > MaxDepth then
  begin
    TopArea := SC.Areas[SC.NPts - 1];
    Overflow := (Depth - MaxDepth) * TopArea / Dt;
    Depth := MaxDepth;
  end;
end;

end.`,
    typescript: `// node.ts — Junction & Storage Nodes
// SWMM5 Engine in TypeScript — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

interface StorageCurveData {
    depths: number[];
    areas: number[];
}

class StorageCurve {
    readonly depths: number[];
    readonly areas: number[];

    constructor(data: StorageCurveData) {
        this.depths = data.depths;
        this.areas = data.areas;
    }

    getVolume(depth: number): number {
        let vol: number = 0.0;
        for (let i = 1; i < this.depths.length; i++) {
            if (depth <= this.depths[i]) {
                const frac: number =
                    (depth - this.depths[i - 1])
                    / (this.depths[i] - this.depths[i - 1]);
                const aAvg: number = this.areas[i - 1]
                    + frac * (this.areas[i]
                    - this.areas[i - 1]);
                return vol + aAvg
                    * (depth - this.depths[i - 1]);
            }
            vol += 0.5 * (this.areas[i - 1]
                + this.areas[i])
                * (this.depths[i] - this.depths[i - 1]);
        }
        return vol;
    }
}

class JunctionNode {
    invertEl: number;
    maxDepth: number;
    depth: number = 0.0;
    volume: number = 0.0;
    overflow: number = 0.0;

    constructor(invertEl: number, maxDepth: number) {
        this.invertEl = invertEl;
        this.maxDepth = maxDepth;
    }

    updateLevel(sc: StorageCurve, qIn: number,
                qOut: number, dt: number): void {
        const dV: number = (qIn - qOut) * dt;
        this.volume = Math.max(0.0, this.volume + dV);

        for (let i = 1; i < sc.depths.length; i++) {
            const v: number = sc.getVolume(sc.depths[i]);
            if (v >= this.volume) {
                const vPrev: number =
                    sc.getVolume(sc.depths[i - 1]);
                const aAvg: number = 0.5
                    * (sc.areas[i - 1] + sc.areas[i]);
                this.depth = sc.depths[i - 1]
                    + (this.volume - vPrev) / aAvg;
                break;
            }
        }

        this.overflow = 0.0;
        if (this.depth > this.maxDepth) {
            const topArea: number =
                sc.areas[sc.areas.length - 1];
            this.overflow = (this.depth - this.maxDepth)
                * topArea / dt;
            this.depth = this.maxDepth;
        }
    }
}

export { StorageCurve, JunctionNode };`,
    cuda: `// node.cu — Junction & Storage Nodes
// SWMM5 Engine in CUDA — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

#include <math.h>

#define MAX_PTS 10

struct StorageCurve {
    float depths[MAX_PTS];
    float areas[MAX_PTS];
    int   nPts;
};

struct Node {
    float invertEl;
    float maxDepth;
    float depth;
    float volume;
    float overflow;
};

__device__ float getVolume(const StorageCurve* sc,
                            float depth)
{
    float vol = 0.0f;
    for (int i = 1; i < sc->nPts; i++) {
        if (depth <= sc->depths[i]) {
            float frac = (depth - sc->depths[i-1])
                / (sc->depths[i] - sc->depths[i-1]);
            float aAvg = sc->areas[i-1]
                + frac * (sc->areas[i] - sc->areas[i-1]);
            return vol + aAvg
                * (depth - sc->depths[i-1]);
        }
        vol += 0.5f * (sc->areas[i-1] + sc->areas[i])
            * (sc->depths[i] - sc->depths[i-1]);
    }
    return vol;
}

__global__ void updateLevelKernel(
    Node* nodes, StorageCurve* curves,
    float* qIn, float* qOut, float dt, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    Node nd = nodes[idx];
    StorageCurve sc = curves[idx];

    float dV = (qIn[idx] - qOut[idx]) * dt;
    nd.volume = fmaxf(0.0f, nd.volume + dV);

    for (int i = 1; i < sc.nPts; i++) {
        float v = getVolume(&sc, sc.depths[i]);
        if (v >= nd.volume) {
            float vPrev = getVolume(&sc, sc.depths[i-1]);
            float aAvg = 0.5f
                * (sc.areas[i-1] + sc.areas[i]);
            nd.depth = sc.depths[i-1]
                + (nd.volume - vPrev) / aAvg;
            break;
        }
    }

    nd.overflow = 0.0f;
    if (nd.depth > nd.maxDepth) {
        float topArea = sc.areas[sc.nPts - 1];
        nd.overflow = (nd.depth - nd.maxDepth)
                      * topArea / dt;
        nd.depth = nd.maxDepth;
    }
    nodes[idx] = nd;
}`,
    wasm: `;; node.wat — Junction & Storage Nodes
;; SWMM5 Engine in WebAssembly — Node Water Level Updates
;; Volume balance at junctions and storage nodes
;; with depth-area relationship and overflow check

(module
  (memory (export "mem") 1)

  ;; Storage curve: depths at offset 0, areas at offset 80
  ;; Node: depth@160, volume@168, maxDepth@176, overflow@184
  ;; nPts stored at offset 192

  (func $getVolume (param $depth f64) (result f64)
    (local $vol f64) (local $i i32)
    (local $d_prev f64) (local $d_curr f64)
    (local $a_prev f64) (local $a_curr f64)
    (local $frac f64) (local $aAvg f64)
    (local.set $vol (f64.const 0.0))
    (local.set $i (i32.const 1))
    (block $break
      (loop $loop
        (br_if $break (i32.ge_s (local.get $i)
          (i32.load (i32.const 192))))
        (local.set $d_prev (f64.load (i32.mul
          (i32.sub (local.get $i) (i32.const 1))
          (i32.const 8))))
        (local.set $d_curr (f64.load (i32.mul
          (local.get $i) (i32.const 8))))
        (local.set $a_prev (f64.load (i32.add
          (i32.const 80) (i32.mul
          (i32.sub (local.get $i) (i32.const 1))
          (i32.const 8)))))
        (local.set $a_curr (f64.load (i32.add
          (i32.const 80) (i32.mul
          (local.get $i) (i32.const 8)))))
        (if (f64.le (local.get $depth)
                     (local.get $d_curr))
          (then
            (local.set $frac (f64.div
              (f64.sub (local.get $depth)
                       (local.get $d_prev))
              (f64.sub (local.get $d_curr)
                       (local.get $d_prev))))
            (local.set $aAvg (f64.add
              (local.get $a_prev)
              (f64.mul (local.get $frac)
                (f64.sub (local.get $a_curr)
                         (local.get $a_prev)))))
            (return (f64.add (local.get $vol)
              (f64.mul (local.get $aAvg)
                (f64.sub (local.get $depth)
                         (local.get $d_prev)))))))
        (local.set $vol (f64.add (local.get $vol)
          (f64.mul (f64.const 0.5)
            (f64.mul
              (f64.add (local.get $a_prev)
                       (local.get $a_curr))
              (f64.sub (local.get $d_curr)
                       (local.get $d_prev))))))
        (local.set $i (i32.add (local.get $i)
                                (i32.const 1)))
        (br $loop)))
    (local.get $vol))

  (func $updateLevel (export "updateLevel")
    (param $qIn f64) (param $qOut f64) (param $dt f64)
    (local $dV f64) (local $vol f64)
    (local.set $dV (f64.mul
      (f64.sub (local.get $qIn) (local.get $qOut))
      (local.get $dt)))
    (local.set $vol (f64.add
      (f64.load (i32.const 168)) (local.get $dV)))
    (if (f64.lt (local.get $vol) (f64.const 0.0))
      (then (local.set $vol (f64.const 0.0))))
    (f64.store (i32.const 168) (local.get $vol))
  ))`,
    mojo: `# node.mojo — Junction & Storage Nodes
# SWMM5 Engine in Mojo — Node Water Level Updates
# Volume balance at junctions and storage nodes
# with depth-area relationship and overflow check

from math import max

struct StorageCurve:
    var depths: DynamicVector[Float64]
    var areas: DynamicVector[Float64]

    fn __init__(inout self, depths: DynamicVector[Float64],
                areas: DynamicVector[Float64]):
        self.depths = depths
        self.areas = areas

    fn get_volume(self, depth: Float64) -> Float64:
        var vol: Float64 = 0.0
        for i in range(1, len(self.depths)):
            if depth <= self.depths[i]:
                let frac: Float64 = (
                    depth - self.depths[i - 1]) / (
                    self.depths[i] - self.depths[i - 1])
                let a_avg: Float64 = (
                    self.areas[i - 1]
                    + frac * (self.areas[i]
                    - self.areas[i - 1]))
                return vol + a_avg * (
                    depth - self.depths[i - 1])
            vol += 0.5 * (
                self.areas[i - 1] + self.areas[i]) * (
                self.depths[i] - self.depths[i - 1])
        return vol


struct Node:
    var invert_el: Float64
    var max_depth: Float64
    var depth: Float64
    var volume: Float64
    var overflow: Float64

    fn __init__(inout self, invert_el: Float64,
                max_depth: Float64):
        self.invert_el = invert_el
        self.max_depth = max_depth
        self.depth = 0.0
        self.volume = 0.0
        self.overflow = 0.0

    fn update_level(inout self, sc: StorageCurve,
                    q_in: Float64, q_out: Float64,
                    dt: Float64):
        let dv: Float64 = (q_in - q_out) * dt
        self.volume = max(0.0, self.volume + dv)

        for i in range(1, len(sc.depths)):
            let v = sc.get_volume(sc.depths[i])
            if v >= self.volume:
                let v_prev = sc.get_volume(
                    sc.depths[i - 1])
                let a_avg: Float64 = 0.5 * (
                    sc.areas[i - 1] + sc.areas[i])
                self.depth = sc.depths[i - 1] + (
                    self.volume - v_prev) / a_avg
                break

        self.overflow = 0.0
        if self.depth > self.max_depth:
            let top_area = sc.areas[
                len(sc.areas) - 1]
            self.overflow = (
                self.depth - self.max_depth
                ) * top_area / dt
            self.depth = self.max_depth`,
    java: `// Node.java — Junction & Storage Nodes
// SWMM5 Engine in Java — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

package swmm;

public class StorageCurve {
    private final double[] depths;
    private final double[] areas;

    public StorageCurve(double[] depths, double[] areas) {
        this.depths = depths;
        this.areas = areas;
    }

    public double[] getDepths() { return depths; }
    public double[] getAreas()  { return areas; }

    public double getVolume(double depth) {
        double vol = 0.0;
        for (int i = 1; i < depths.length; i++) {
            if (depth <= depths[i]) {
                double frac = (depth - depths[i - 1])
                    / (depths[i] - depths[i - 1]);
                double aAvg = areas[i - 1]
                    + frac * (areas[i] - areas[i - 1]);
                return vol + aAvg
                    * (depth - depths[i - 1]);
            }
            vol += 0.5 * (areas[i - 1] + areas[i])
                * (depths[i] - depths[i - 1]);
        }
        return vol;
    }
}

public class JunctionNode {
    private double invertEl;
    private double maxDepth;
    private double depth;
    private double volume;
    private double overflow;

    public JunctionNode(double invertEl,
                        double maxDepth) {
        this.invertEl = invertEl;
        this.maxDepth = maxDepth;
    }

    public double getDepth()    { return depth; }
    public double getVolume()   { return volume; }
    public double getOverflow() { return overflow; }

    public void updateLevel(StorageCurve sc,
            double qIn, double qOut, double dt) {
        double dV = (qIn - qOut) * dt;
        volume = Math.max(0.0, volume + dV);

        double[] scDepths = sc.getDepths();
        double[] scAreas = sc.getAreas();
        for (int i = 1; i < scDepths.length; i++) {
            double v = sc.getVolume(scDepths[i]);
            if (v >= volume) {
                double vPrev =
                    sc.getVolume(scDepths[i - 1]);
                double aAvg = 0.5
                    * (scAreas[i - 1] + scAreas[i]);
                depth = scDepths[i - 1]
                    + (volume - vPrev) / aAvg;
                break;
            }
        }

        overflow = 0.0;
        if (depth > maxDepth) {
            double topArea =
                scAreas[scAreas.length - 1];
            overflow = (depth - maxDepth)
                * topArea / dt;
            depth = maxDepth;
        }
    }
}`,
    nim: `# node.nim — Junction & Storage Nodes
# SWMM5 Engine in Nim — Node Water Level Updates
# Volume balance at junctions and storage nodes
# with depth-area relationship and overflow check

type
  StorageCurve = object
    depths: seq[float]
    areas: seq[float]

  Node = object
    invertEl: float
    maxDepth: float
    depth: float
    volume: float
    overflow: float

proc newStorageCurve(depths, areas: seq[float]):
    StorageCurve =
  result.depths = depths
  result.areas = areas

proc getVolume(sc: StorageCurve, depth: float): float =
  result = 0.0
  for i in 1 ..< sc.depths.len:
    if depth <= sc.depths[i]:
      let frac = (depth - sc.depths[i - 1]) /
          (sc.depths[i] - sc.depths[i - 1])
      let aAvg = sc.areas[i - 1] +
          frac * (sc.areas[i] - sc.areas[i - 1])
      return result + aAvg *
          (depth - sc.depths[i - 1])
    result += 0.5 * (sc.areas[i - 1] + sc.areas[i]) *
        (sc.depths[i] - sc.depths[i - 1])

proc newNode(invertEl, maxDepth: float): Node =
  result.invertEl = invertEl
  result.maxDepth = maxDepth

proc updateLevel(nd: var Node, sc: StorageCurve,
                  qIn, qOut, dt: float) =
  let dv = (qIn - qOut) * dt
  nd.volume = max(0.0, nd.volume + dv)

  for i in 1 ..< sc.depths.len:
    let v = sc.getVolume(sc.depths[i])
    if v >= nd.volume:
      let vPrev = sc.getVolume(sc.depths[i - 1])
      let aAvg = 0.5 *
          (sc.areas[i - 1] + sc.areas[i])
      nd.depth = sc.depths[i - 1] +
          (nd.volume - vPrev) / aAvg
      break

  nd.overflow = 0.0
  if nd.depth > nd.maxDepth:
    let topArea = sc.areas[^1]
    nd.overflow = (nd.depth - nd.maxDepth) *
        topArea / dt
    nd.depth = nd.maxDepth`,
    ada: `-- node.adb — Junction & Storage Nodes
-- SWMM5 Engine in Ada — Node Water Level Updates
-- Volume balance at junctions and storage nodes
-- with depth-area relationship and overflow check

package body Node_Module is

   Max_Pts : constant := 10;
   type Depth_Array is array (1 .. Max_Pts) of Float;

   type Storage_Curve is record
      Depths : Depth_Array;
      Areas  : Depth_Array;
      N_Pts  : Integer;
   end record;

   type Node is record
      Invert_El : Float;
      Max_Depth : Float;
      Depth     : Float := 0.0;
      Volume    : Float := 0.0;
      Overflow  : Float := 0.0;
   end record;

   function Get_Volume (SC : Storage_Curve;
                         D  : Float) return Float is
      Vol   : Float := 0.0;
      Frac  : Float;
      A_Avg : Float;
   begin
      for I in 2 .. SC.N_Pts loop
         if D <= SC.Depths (I) then
            Frac := (D - SC.Depths (I - 1))
               / (SC.Depths (I) - SC.Depths (I - 1));
            A_Avg := SC.Areas (I - 1)
               + Frac * (SC.Areas (I)
               - SC.Areas (I - 1));
            return Vol + A_Avg
               * (D - SC.Depths (I - 1));
         end if;
         Vol := Vol + 0.5
            * (SC.Areas (I - 1) + SC.Areas (I))
            * (SC.Depths (I) - SC.Depths (I - 1));
      end loop;
      return Vol;
   end Get_Volume;

   procedure Update_Level (Nd    : in out Node;
                            SC    : Storage_Curve;
                            Q_In  : Float;
                            Q_Out : Float;
                            Dt    : Float) is
      DV      : Float;
      V       : Float;
      V_Prev  : Float;
      A_Avg   : Float;
      Top_Area: Float;
   begin
      DV := (Q_In - Q_Out) * Dt;
      Nd.Volume := Float'Max (0.0, Nd.Volume + DV);

      for I in 2 .. SC.N_Pts loop
         V := Get_Volume (SC, SC.Depths (I));
         if V >= Nd.Volume then
            V_Prev := Get_Volume (SC, SC.Depths (I - 1));
            A_Avg := 0.5 * (SC.Areas (I - 1)
                     + SC.Areas (I));
            Nd.Depth := SC.Depths (I - 1)
               + (Nd.Volume - V_Prev) / A_Avg;
            exit;
         end if;
      end loop;

      Nd.Overflow := 0.0;
      if Nd.Depth > Nd.Max_Depth then
         Top_Area := SC.Areas (SC.N_Pts);
         Nd.Overflow := (Nd.Depth - Nd.Max_Depth)
                        * Top_Area / Dt;
         Nd.Depth := Nd.Max_Depth;
      end if;
   end Update_Level;

end Node_Module;`,
    chapel: `// node.chpl — Junction & Storage Nodes
// SWMM5 Engine in Chapel — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

record StorageCurve {
    var depths: [0..<10] real;
    var areas:  [0..<10] real;
    var nPts: int;

    proc getVolume(depth: real): real {
        var vol: real = 0.0;
        for i in 1..<nPts {
            if depth <= depths[i] {
                const frac = (depth - depths[i - 1])
                    / (depths[i] - depths[i - 1]);
                const aAvg = areas[i - 1]
                    + frac * (areas[i] - areas[i - 1]);
                return vol + aAvg
                    * (depth - depths[i - 1]);
            }
            vol += 0.5 * (areas[i - 1] + areas[i])
                * (depths[i] - depths[i - 1]);
        }
        return vol;
    }
}

record JunctionNode {
    var invertEl: real;
    var maxDepth: real;
    var depth: real = 0.0;
    var volume: real = 0.0;
    var overflow: real = 0.0;

    proc ref updateLevel(ref sc: StorageCurve,
                          qIn: real, qOut: real,
                          dt: real) {
        const dV = (qIn - qOut) * dt;
        volume = max(0.0, volume + dV);

        for i in 1..<sc.nPts {
            const v = sc.getVolume(sc.depths[i]);
            if v >= volume {
                const vPrev = sc.getVolume(
                    sc.depths[i - 1]);
                const aAvg = 0.5
                    * (sc.areas[i - 1] + sc.areas[i]);
                depth = sc.depths[i - 1]
                    + (volume - vPrev) / aAvg;
                break;
            }
        }

        overflow = 0.0;
        if depth > maxDepth {
            const topArea = sc.areas[sc.nPts - 1];
            overflow = (depth - maxDepth)
                       * topArea / dt;
            depth = maxDepth;
        }
    }
}`,
    swift: `// node.swift — Junction & Storage Nodes
// SWMM5 Engine in Swift — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

import Foundation

struct StorageCurve {
    let depths: [Double]
    let areas: [Double]

    func getVolume(depth: Double) -> Double {
        var vol = 0.0
        for i in 1..<depths.count {
            if depth <= depths[i] {
                let frac = (depth - depths[i - 1])
                    / (depths[i] - depths[i - 1])
                let aAvg = areas[i - 1]
                    + frac * (areas[i] - areas[i - 1])
                return vol + aAvg
                    * (depth - depths[i - 1])
            }
            vol += 0.5 * (areas[i - 1] + areas[i])
                * (depths[i] - depths[i - 1])
        }
        return vol
    }
}

struct JunctionNode {
    let invertEl: Double
    let maxDepth: Double
    var depth: Double = 0.0
    var volume: Double = 0.0
    var overflow: Double = 0.0

    mutating func updateLevel(sc: StorageCurve,
                               qIn: Double,
                               qOut: Double,
                               dt: Double) {
        let dV = (qIn - qOut) * dt
        volume = max(0.0, volume + dV)

        for i in 1..<sc.depths.count {
            let v = sc.getVolume(depth: sc.depths[i])
            if v >= volume {
                let vPrev = sc.getVolume(
                    depth: sc.depths[i - 1])
                let aAvg = 0.5
                    * (sc.areas[i - 1] + sc.areas[i])
                depth = sc.depths[i - 1]
                    + (volume - vPrev) / aAvg
                break
            }
        }

        overflow = 0.0
        if depth > maxDepth {
            let topArea = sc.areas.last ?? 1.0
            overflow = (depth - maxDepth)
                       * topArea / dt
            depth = maxDepth
        }
    }
}`,
    kotlin: `// Node.kt — Junction & Storage Nodes
// SWMM5 Engine in Kotlin — Node Water Level Updates
// Volume balance at junctions and storage nodes
// with depth-area relationship and overflow check

package swmm

class StorageCurve(
    val depths: DoubleArray,
    val areas: DoubleArray
) {
    fun getVolume(depth: Double): Double {
        var vol = 0.0
        for (i in 1 until depths.size) {
            if (depth <= depths[i]) {
                val frac = (depth - depths[i - 1]) /
                    (depths[i] - depths[i - 1])
                val aAvg = areas[i - 1] +
                    frac * (areas[i] - areas[i - 1])
                return vol + aAvg *
                    (depth - depths[i - 1])
            }
            vol += 0.5 * (areas[i - 1] + areas[i]) *
                (depths[i] - depths[i - 1])
        }
        return vol
    }
}

data class JunctionNode(
    val invertEl: Double,
    val maxDepth: Double,
    var depth: Double = 0.0,
    var volume: Double = 0.0,
    var overflow: Double = 0.0
) {
    fun updateLevel(sc: StorageCurve, qIn: Double,
                    qOut: Double, dt: Double) {
        val dV = (qIn - qOut) * dt
        volume = maxOf(0.0, volume + dV)

        for (i in 1 until sc.depths.size) {
            val v = sc.getVolume(sc.depths[i])
            if (v >= volume) {
                val vPrev =
                    sc.getVolume(sc.depths[i - 1])
                val aAvg = 0.5 *
                    (sc.areas[i - 1] + sc.areas[i])
                depth = sc.depths[i - 1] +
                    (volume - vPrev) / aAvg
                break
            }
        }

        overflow = 0.0
        if (depth > maxDepth) {
            val topArea = sc.areas.last()
            overflow = (depth - maxDepth) *
                topArea / dt
            depth = maxDepth
        }
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
    zig: `// rain.zig — Rainfall Processing
// SWMM5 Engine in Zig — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

const std = @import("std");

const RainType = enum {
    intensity,
    volume,
    cumulative,
};

const RainGage = struct {
    rain_type: RainType,
    interval: f64,        // recording interval (seconds)
    current_rate: f64,    // current intensity (in/hr)
    previous_total: f64,  // previous cumulative depth
    units_factor: f64,    // conversion factor

    pub fn convertToIntensity(self: *RainGage, value: f64) f64 {
        return switch (self.rain_type) {
            .intensity => value * self.units_factor,

            .volume => blk: {
                if (self.interval <= 0.0) break :blk 0.0;
                break :blk value * self.units_factor *
                    3600.0 / self.interval;
            },

            .cumulative => blk: {
                if (self.interval <= 0.0) break :blk 0.0;
                const raw = (value - self.previous_total) *
                    self.units_factor * 3600.0 / self.interval;
                self.previous_total = value;
                break :blk @max(raw, 0.0);
            },
        };
    }

    pub fn getRate(self: *RainGage, raw: f64, next: f64,
                   t_a: f64, t_b: f64, t: f64) f64 {
        const rate_a = self.convertToIntensity(raw);
        const rate_b = self.convertToIntensity(next);
        self.current_rate = interpolate(rate_a, rate_b,
                                        t_a, t_b, t);
        return self.current_rate;
    }
};

fn interpolate(rate_a: f64, rate_b: f64,
               t_a: f64, t_b: f64, t: f64) f64 {
    const span = t_b - t_a;
    if (span <= 0.0) return rate_a;
    return rate_a + (rate_b - rate_a) * (t - t_a) / span;
}`,
    cpp: `// rain.cpp — Rainfall Processing
// SWMM5 Engine in C++ — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

#include <cmath>
#include <algorithm>

namespace swmm {

enum class RainType { Intensity, Volume, Cumulative };

inline double interpolate(double rateA, double rateB,
                           double tA, double tB, double t) {
    double span = tB - tA;
    if (span <= 0.0) return rateA;
    return rateA + (rateB - rateA) * (t - tA) / span;
}

struct RainGage {
    RainType type;
    double interval;        // recording interval (seconds)
    double currentRate;     // current intensity (in/hr)
    double previousTotal;   // previous cumulative depth
    double unitsFactor;     // conversion factor

    double convertToIntensity(double value) {
        switch (type) {
            case RainType::Intensity:
                return value * unitsFactor;

            case RainType::Volume:
                if (interval <= 0.0) return 0.0;
                return value * unitsFactor
                       * 3600.0 / interval;

            case RainType::Cumulative: {
                if (interval <= 0.0) return 0.0;
                double intensity =
                    (value - previousTotal)
                    * unitsFactor * 3600.0 / interval;
                previousTotal = value;
                return std::max(intensity, 0.0);
            }

            default:
                return 0.0;
        }
    }

    double getRate(double raw, double next,
                   double tA, double tB, double t) {
        double rateA = convertToIntensity(raw);
        double rateB = convertToIntensity(next);
        currentRate = interpolate(rateA, rateB, tA, tB, t);
        return currentRate;
    }
};

} // namespace swmm`,
    csharp: `// Rain.cs — Rainfall Processing
// SWMM5 Engine in C# — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

using System;

namespace Swmm
{
    public enum RainType { Intensity, Volume, Cumulative }

    public class RainGage
    {
        public RainType Type { get; set; }
        public double Interval { get; set; }
        public double CurrentRate { get; set; }
        public double PreviousTotal { get; set; }
        public double UnitsFactor { get; set; }

        public RainGage(RainType type, double interval,
                        double unitsFactor = 1.0)
        {
            Type = type;
            Interval = interval;
            UnitsFactor = unitsFactor;
            CurrentRate = 0.0;
            PreviousTotal = 0.0;
        }

        public double ConvertToIntensity(double value)
        {
            switch (Type)
            {
                case RainType.Intensity:
                    return value * UnitsFactor;

                case RainType.Volume:
                    if (Interval <= 0.0) return 0.0;
                    return value * UnitsFactor
                           * 3600.0 / Interval;

                case RainType.Cumulative:
                    if (Interval <= 0.0) return 0.0;
                    double intensity =
                        (value - PreviousTotal)
                        * UnitsFactor * 3600.0 / Interval;
                    PreviousTotal = value;
                    return Math.Max(intensity, 0.0);

                default:
                    return 0.0;
            }
        }

        public double GetRate(double raw, double next,
                              double tA, double tB, double t)
        {
            double rateA = ConvertToIntensity(raw);
            double rateB = ConvertToIntensity(next);
            CurrentRate = Interpolate(rateA, rateB,
                                      tA, tB, t);
            return CurrentRate;
        }

        public static double Interpolate(double rateA,
            double rateB, double tA, double tB, double t)
        {
            double span = tB - tA;
            if (span <= 0.0) return rateA;
            return rateA + (rateB - rateA)
                   * (t - tA) / span;
        }
    }
}`,
    matlab: `% rain.m — Rainfall Processing
% SWMM5 Engine in MATLAB — Rain Gage Input Handling
% Converts raw rainfall data to time-stepped intensities
% for driving all hydrologic computations

% RainType constants
% 1 = INTENSITY, 2 = VOLUME, 3 = CUMULATIVE

function gage = create_rain_gage(rain_type, interval, ...
                                   units_factor)
    gage.rain_type       = rain_type;
    gage.interval        = interval;
    gage.current_rate    = 0.0;
    gage.previous_total  = 0.0;
    gage.units_factor    = units_factor;
end

function [intensity, gage] = convert_to_intensity(gage, value)
    switch gage.rain_type
        case 1  % INTENSITY
            intensity = value * gage.units_factor;

        case 2  % VOLUME
            if gage.interval <= 0.0
                intensity = 0.0;
                return;
            end
            intensity = value * gage.units_factor ...
                        * 3600.0 / gage.interval;

        case 3  % CUMULATIVE
            if gage.interval <= 0.0
                intensity = 0.0;
                return;
            end
            intensity = (value - gage.previous_total) ...
                        * gage.units_factor ...
                        * 3600.0 / gage.interval;
            gage.previous_total = value;
            if intensity < 0.0
                intensity = 0.0;
            end

        otherwise
            intensity = 0.0;
    end
end

function rate = interpolate(rate_a, rate_b, t_a, t_b, t)
    span = t_b - t_a;
    if span <= 0.0
        rate = rate_a;
        return;
    end
    rate = rate_a + (rate_b - rate_a) * (t - t_a) / span;
end

function [rate, gage] = get_rate(gage, raw, nxt, ...
                                  t_a, t_b, t)
    [rate_a, gage] = convert_to_intensity(gage, raw);
    [rate_b, gage] = convert_to_intensity(gage, nxt);
    rate = interpolate(rate_a, rate_b, t_a, t_b, t);
    gage.current_rate = rate;
end`,
    r: `# rain.R — Rainfall Processing
# SWMM5 Engine in R — Rain Gage Input Handling
# Converts raw rainfall data to time-stepped intensities
# for driving all hydrologic computations

RAIN_INTENSITY  <- 1L
RAIN_VOLUME     <- 2L
RAIN_CUMULATIVE <- 3L

create_rain_gage <- function(rain_type, interval,
                              units_factor = 1.0) {
    env <- new.env(parent = emptyenv())
    env$rain_type      <- rain_type
    env$interval       <- interval
    env$current_rate   <- 0.0
    env$previous_total <- 0.0
    env$units_factor   <- units_factor
    env
}

convert_to_intensity <- function(gage, value) {
    if (gage$rain_type == RAIN_INTENSITY) {
        return(value * gage$units_factor)
    }

    if (gage$rain_type == RAIN_VOLUME) {
        if (gage$interval <= 0.0) return(0.0)
        return(value * gage$units_factor *
               3600.0 / gage$interval)
    }

    if (gage$rain_type == RAIN_CUMULATIVE) {
        if (gage$interval <= 0.0) return(0.0)
        intensity <- (value - gage$previous_total) *
                     gage$units_factor *
                     3600.0 / gage$interval
        gage$previous_total <- value
        return(max(intensity, 0.0))
    }

    0.0
}

interpolate <- function(rate_a, rate_b,
                         t_a, t_b, t) {
    span <- t_b - t_a
    if (span <= 0.0) return(rate_a)
    rate_a + (rate_b - rate_a) * (t - t_a) / span
}

get_rate <- function(gage, raw, nxt, t_a, t_b, t) {
    rate_a <- convert_to_intensity(gage, raw)
    rate_b <- convert_to_intensity(gage, nxt)
    gage$current_rate <- interpolate(rate_a, rate_b,
                                      t_a, t_b, t)
    gage$current_rate
}`,
    delphi: `{ rain.pas — Rainfall Processing }
{ SWMM5 Engine in Delphi — Rain Gage Input Handling }
{ Converts raw rainfall data to time-stepped intensities }
{ for driving all hydrologic computations }

unit Rain;

interface

type
  TRainType = (rtIntensity, rtVolume, rtCumulative);

  TRainGage = class
  private
    FRainType: TRainType;
    FInterval: Double;
    FCurrentRate: Double;
    FPreviousTotal: Double;
    FUnitsFactor: Double;
  public
    constructor Create(ARainType: TRainType;
                       AInterval: Double;
                       AUnitsFactor: Double = 1.0);
    function ConvertToIntensity(Value: Double): Double;
    function GetRate(Raw, Next, TA, TB,
                     T: Double): Double;
    property CurrentRate: Double read FCurrentRate;
  end;

function Interpolate(RateA, RateB,
                      TA, TB, T: Double): Double;

implementation

uses Math;

constructor TRainGage.Create(ARainType: TRainType;
                              AInterval: Double;
                              AUnitsFactor: Double);
begin
  FRainType      := ARainType;
  FInterval      := AInterval;
  FUnitsFactor   := AUnitsFactor;
  FCurrentRate   := 0.0;
  FPreviousTotal := 0.0;
end;

function TRainGage.ConvertToIntensity(
    Value: Double): Double;
begin
  case FRainType of
    rtIntensity:
      Result := Value * FUnitsFactor;

    rtVolume:
    begin
      if FInterval <= 0.0 then Exit(0.0);
      Result := Value * FUnitsFactor
                * 3600.0 / FInterval;
    end;

    rtCumulative:
    begin
      if FInterval <= 0.0 then Exit(0.0);
      Result := (Value - FPreviousTotal)
                * FUnitsFactor * 3600.0 / FInterval;
      FPreviousTotal := Value;
      if Result < 0.0 then Result := 0.0;
    end;
  else
    Result := 0.0;
  end;
end;

function Interpolate(RateA, RateB,
                      TA, TB, T: Double): Double;
var
  Span: Double;
begin
  Span := TB - TA;
  if Span <= 0.0 then Exit(RateA);
  Result := RateA + (RateB - RateA)
            * (T - TA) / Span;
end;

function TRainGage.GetRate(Raw, Next, TA, TB,
                            T: Double): Double;
var
  RateA, RateB: Double;
begin
  RateA := ConvertToIntensity(Raw);
  RateB := ConvertToIntensity(Next);
  FCurrentRate := Interpolate(RateA, RateB,
                               TA, TB, T);
  Result := FCurrentRate;
end;

end.`,
    typescript: `// rain.ts — Rainfall Processing
// SWMM5 Engine in TypeScript — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

enum RainType {
    Intensity,
    Volume,
    Cumulative,
}

interface RainGageParams {
    rainType: RainType;
    interval: number;
    unitsFactor?: number;
}

class RainGage {
    readonly rainType: RainType;
    readonly interval: number;
    readonly unitsFactor: number;
    currentRate: number = 0.0;
    previousTotal: number = 0.0;

    constructor(params: RainGageParams) {
        this.rainType = params.rainType;
        this.interval = params.interval;
        this.unitsFactor = params.unitsFactor ?? 1.0;
    }

    convertToIntensity(value: number): number {
        switch (this.rainType) {
            case RainType.Intensity:
                return value * this.unitsFactor;

            case RainType.Volume:
                if (this.interval <= 0.0) return 0.0;
                return value * this.unitsFactor
                       * 3600.0 / this.interval;

            case RainType.Cumulative: {
                if (this.interval <= 0.0) return 0.0;
                const intensity: number =
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

    getRate(raw: number, next: number, tA: number,
            tB: number, t: number): number {
        const rateA: number =
            this.convertToIntensity(raw);
        const rateB: number =
            this.convertToIntensity(next);
        this.currentRate = interpolate(rateA, rateB,
                                       tA, tB, t);
        return this.currentRate;
    }
}

function interpolate(rateA: number, rateB: number,
                     tA: number, tB: number,
                     t: number): number {
    const span: number = tB - tA;
    if (span <= 0.0) return rateA;
    return rateA + (rateB - rateA) * (t - tA) / span;
}

export { RainType, RainGage, interpolate };`,
    cuda: `// rain.cu — Rainfall Processing
// SWMM5 Engine in CUDA — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

#include <math.h>

enum RainType { INTENSITY = 0, VOLUME = 1,
                CUMULATIVE = 2 };

struct RainGage {
    int type;
    float interval;
    float currentRate;
    float previousTotal;
    float unitsFactor;
};

__device__ float interpolate(float rateA, float rateB,
                              float tA, float tB, float t)
{
    float span = tB - tA;
    if (span <= 0.0f) return rateA;
    return rateA + (rateB - rateA) * (t - tA) / span;
}

__device__ float convertToIntensity(RainGage* g,
                                     float value)
{
    float intensity;
    switch (g->type) {
        case INTENSITY:
            return value * g->unitsFactor;

        case VOLUME:
            if (g->interval <= 0.0f) return 0.0f;
            return value * g->unitsFactor
                   * 3600.0f / g->interval;

        case CUMULATIVE:
            if (g->interval <= 0.0f) return 0.0f;
            intensity = (value - g->previousTotal)
                        * g->unitsFactor
                        * 3600.0f / g->interval;
            g->previousTotal = value;
            return fmaxf(intensity, 0.0f);

        default:
            return 0.0f;
    }
}

__global__ void convertRainKernel(
    RainGage* gages, float* rawVals, float* nextVals,
    float* tA, float* tB, float* tNow,
    float* rates, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    float rateA = convertToIntensity(&gages[idx],
                                      rawVals[idx]);
    float rateB = convertToIntensity(&gages[idx],
                                      nextVals[idx]);
    rates[idx] = interpolate(rateA, rateB,
                              tA[idx], tB[idx],
                              tNow[idx]);
    gages[idx].currentRate = rates[idx];
}`,
    wasm: `;; rain.wat — Rainfall Processing
;; SWMM5 Engine in WebAssembly — Rain Gage Input Handling
;; Converts raw rainfall data to time-stepped intensities
;; for driving all hydrologic computations

(module
  ;; Rain type constants: 0=intensity, 1=volume, 2=cumulative

  (func $interpolate
    (param $rateA f64) (param $rateB f64)
    (param $tA f64) (param $tB f64) (param $t f64)
    (result f64)
    (local $span f64)
    (local.set $span (f64.sub (local.get $tB)
                               (local.get $tA)))
    (if (result f64)
      (f64.le (local.get $span) (f64.const 0.0))
      (then (local.get $rateA))
      (else
        (f64.add (local.get $rateA)
          (f64.div
            (f64.mul
              (f64.sub (local.get $rateB)
                       (local.get $rateA))
              (f64.sub (local.get $t)
                       (local.get $tA)))
            (local.get $span))))))

  (func $convertToIntensity
    (param $type i32) (param $interval f64)
    (param $unitsFactor f64) (param $prevTotal f64)
    (param $value f64)
    (result f64)
    (local $intensity f64)

    ;; INTENSITY type
    (if (i32.eq (local.get $type) (i32.const 0))
      (then
        (return (f64.mul (local.get $value)
                         (local.get $unitsFactor)))))

    ;; VOLUME type
    (if (i32.eq (local.get $type) (i32.const 1))
      (then
        (if (result f64)
          (f64.le (local.get $interval) (f64.const 0.0))
          (then (f64.const 0.0))
          (else
            (f64.div
              (f64.mul
                (f64.mul (local.get $value)
                         (local.get $unitsFactor))
                (f64.const 3600.0))
              (local.get $interval))))
        (return)))

    ;; CUMULATIVE type
    (if (i32.eq (local.get $type) (i32.const 2))
      (then
        (if (result f64)
          (f64.le (local.get $interval) (f64.const 0.0))
          (then (f64.const 0.0))
          (else
            (local.set $intensity
              (f64.div
                (f64.mul
                  (f64.mul
                    (f64.sub (local.get $value)
                             (local.get $prevTotal))
                    (local.get $unitsFactor))
                  (f64.const 3600.0))
                (local.get $interval)))
            (f64.max (local.get $intensity)
                     (f64.const 0.0))))
        (return)))

    (f64.const 0.0))
)`,
    mojo: `# rain.mojo — Rainfall Processing
# SWMM5 Engine in Mojo — Rain Gage Input Handling
# Converts raw rainfall data to time-stepped intensities
# for driving all hydrologic computations

from enum import Enum

@value
struct RainType:
    var value: Int
    alias INTENSITY = RainType(0)
    alias VOLUME = RainType(1)
    alias CUMULATIVE = RainType(2)

@value
struct RainGage:
    var rain_type: RainType
    var interval: Float64
    var current_rate: Float64
    var previous_total: Float64
    var units_factor: Float64

    fn __init__(inout self, rain_type: RainType,
                interval: Float64,
                units_factor: Float64 = 1.0):
        self.rain_type = rain_type
        self.interval = interval
        self.current_rate = 0.0
        self.previous_total = 0.0
        self.units_factor = units_factor

    fn convert_to_intensity(inout self,
                             value: Float64) -> Float64:
        if self.rain_type.value == RainType.INTENSITY.value:
            return value * self.units_factor

        if self.rain_type.value == RainType.VOLUME.value:
            if self.interval <= 0.0:
                return 0.0
            return value * self.units_factor * 3600.0 / self.interval

        if self.rain_type.value == RainType.CUMULATIVE.value:
            if self.interval <= 0.0:
                return 0.0
            var intensity: Float64 = (
                (value - self.previous_total)
                * self.units_factor * 3600.0
                / self.interval)
            self.previous_total = value
            if intensity < 0.0:
                intensity = 0.0
            return intensity

        return 0.0

    fn get_rate(inout self, raw: Float64, nxt: Float64,
                t_a: Float64, t_b: Float64,
                t: Float64) -> Float64:
        var rate_a = self.convert_to_intensity(raw)
        var rate_b = self.convert_to_intensity(nxt)
        self.current_rate = interpolate(rate_a, rate_b,
                                         t_a, t_b, t)
        return self.current_rate


fn interpolate(rate_a: Float64, rate_b: Float64,
               t_a: Float64, t_b: Float64,
               t: Float64) -> Float64:
    var span = t_b - t_a
    if span <= 0.0:
        return rate_a
    return rate_a + (rate_b - rate_a) * (t - t_a) / span`,
    java: `// Rain.java — Rainfall Processing
// SWMM5 Engine in Java — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

package swmm;

public class RainGage {

    public enum RainType { INTENSITY, VOLUME, CUMULATIVE }

    private final RainType type;
    private final double interval;
    private final double unitsFactor;
    private double currentRate;
    private double previousTotal;

    public RainGage(RainType type, double interval,
                    double unitsFactor) {
        this.type = type;
        this.interval = interval;
        this.unitsFactor = unitsFactor;
        this.currentRate = 0.0;
        this.previousTotal = 0.0;
    }

    public double convertToIntensity(double value) {
        switch (type) {
            case INTENSITY:
                return value * unitsFactor;

            case VOLUME:
                if (interval <= 0.0) return 0.0;
                return value * unitsFactor
                       * 3600.0 / interval;

            case CUMULATIVE:
                if (interval <= 0.0) return 0.0;
                double intensity =
                    (value - previousTotal)
                    * unitsFactor * 3600.0 / interval;
                previousTotal = value;
                return Math.max(intensity, 0.0);

            default:
                return 0.0;
        }
    }

    public double getRate(double raw, double next,
                          double tA, double tB, double t) {
        double rateA = convertToIntensity(raw);
        double rateB = convertToIntensity(next);
        currentRate = interpolate(rateA, rateB,
                                  tA, tB, t);
        return currentRate;
    }

    public double getCurrentRate() {
        return currentRate;
    }

    public static double interpolate(double rateA,
        double rateB, double tA, double tB, double t) {
        double span = tB - tA;
        if (span <= 0.0) return rateA;
        return rateA + (rateB - rateA)
               * (t - tA) / span;
    }
}`,
    nim: `# rain.nim — Rainfall Processing
# SWMM5 Engine in Nim — Rain Gage Input Handling
# Converts raw rainfall data to time-stepped intensities
# for driving all hydrologic computations

type
  RainType = enum
    rtIntensity, rtVolume, rtCumulative

  RainGage = object
    rainType: RainType
    interval: float64
    currentRate: float64
    previousTotal: float64
    unitsFactor: float64

proc newRainGage(rainType: RainType, interval: float64,
                  unitsFactor: float64 = 1.0): RainGage =
  result.rainType = rainType
  result.interval = interval
  result.unitsFactor = unitsFactor
  result.currentRate = 0.0
  result.previousTotal = 0.0

proc convertToIntensity(gage: var RainGage,
                         value: float64): float64 =
  case gage.rainType
  of rtIntensity:
    result = value * gage.unitsFactor

  of rtVolume:
    if gage.interval <= 0.0: return 0.0
    result = value * gage.unitsFactor *
             3600.0 / gage.interval

  of rtCumulative:
    if gage.interval <= 0.0: return 0.0
    result = (value - gage.previousTotal) *
             gage.unitsFactor *
             3600.0 / gage.interval
    gage.previousTotal = value
    if result < 0.0: result = 0.0

proc interpolate(rateA, rateB, tA, tB,
                  t: float64): float64 =
  let span = tB - tA
  if span <= 0.0: return rateA
  result = rateA + (rateB - rateA) * (t - tA) / span

proc getRate(gage: var RainGage, raw, nxt, tA, tB,
              t: float64): float64 =
  let rateA = gage.convertToIntensity(raw)
  let rateB = gage.convertToIntensity(nxt)
  gage.currentRate = interpolate(rateA, rateB,
                                  tA, tB, t)
  result = gage.currentRate`,
    ada: `-- rain.adb — Rainfall Processing
-- SWMM5 Engine in Ada — Rain Gage Input Handling
-- Converts raw rainfall data to time-stepped intensities
-- for driving all hydrologic computations

package body Rain is

   type Rain_Type is (Intensity, Volume, Cumulative);

   type Rain_Gage is record
      R_Type         : Rain_Type;
      Interval       : Float;
      Current_Rate   : Float;
      Previous_Total : Float;
      Units_Factor   : Float;
   end record;

   function Interpolate (Rate_A, Rate_B : Float;
                          T_A, T_B, T   : Float)
                          return Float is
      Span : constant Float := T_B - T_A;
   begin
      if Span <= 0.0 then
         return Rate_A;
      end if;
      return Rate_A + (Rate_B - Rate_A)
             * (T - T_A) / Span;
   end Interpolate;

   procedure Convert_To_Intensity
      (Gage      : in out Rain_Gage;
       Value     : in     Float;
       Result_I  :    out Float) is
   begin
      case Gage.R_Type is
         when Intensity =>
            Result_I := Value * Gage.Units_Factor;

         when Volume =>
            if Gage.Interval <= 0.0 then
               Result_I := 0.0;
               return;
            end if;
            Result_I := Value * Gage.Units_Factor
                        * 3600.0 / Gage.Interval;

         when Cumulative =>
            if Gage.Interval <= 0.0 then
               Result_I := 0.0;
               return;
            end if;
            Result_I := (Value - Gage.Previous_Total)
                        * Gage.Units_Factor
                        * 3600.0 / Gage.Interval;
            Gage.Previous_Total := Value;
            if Result_I < 0.0 then
               Result_I := 0.0;
            end if;
      end case;
   end Convert_To_Intensity;

   function Get_Rate (Gage : in out Rain_Gage;
                       Raw, Next : Float;
                       T_A, T_B, T : Float)
                       return Float is
      Rate_A, Rate_B : Float;
   begin
      Convert_To_Intensity (Gage, Raw, Rate_A);
      Convert_To_Intensity (Gage, Next, Rate_B);
      Gage.Current_Rate :=
         Interpolate (Rate_A, Rate_B, T_A, T_B, T);
      return Gage.Current_Rate;
   end Get_Rate;

end Rain;`,
    chapel: `// rain.chpl — Rainfall Processing
// SWMM5 Engine in Chapel — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

enum RainType { Intensity, Volume, Cumulative }

record RainGage {
    var rainType: RainType;
    var interval: real;
    var currentRate: real = 0.0;
    var previousTotal: real = 0.0;
    var unitsFactor: real = 1.0;

    proc ref convertToIntensity(value: real): real {
        select rainType {
            when RainType.Intensity do
                return value * unitsFactor;

            when RainType.Volume {
                if interval <= 0.0 then return 0.0;
                return value * unitsFactor
                       * 3600.0 / interval;
            }

            when RainType.Cumulative {
                if interval <= 0.0 then return 0.0;
                var intensity =
                    (value - previousTotal)
                    * unitsFactor * 3600.0 / interval;
                previousTotal = value;
                if intensity < 0.0 then intensity = 0.0;
                return intensity;
            }
        }
        return 0.0;
    }

    proc ref getRate(raw: real, next: real,
                     tA: real, tB: real,
                     t: real): real {
        var rateA = convertToIntensity(raw);
        var rateB = convertToIntensity(next);
        currentRate = interpolate(rateA, rateB,
                                   tA, tB, t);
        return currentRate;
    }
}

proc interpolate(rateA: real, rateB: real,
                  tA: real, tB: real, t: real): real {
    const span = tB - tA;
    if span <= 0.0 then return rateA;
    return rateA + (rateB - rateA) * (t - tA) / span;
}`,
    swift: `// Rain.swift — Rainfall Processing
// SWMM5 Engine in Swift — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

import Foundation

enum RainType {
    case intensity
    case volume
    case cumulative
}

struct RainGage {
    let rainType: RainType
    let interval: Double
    let unitsFactor: Double
    var currentRate: Double = 0.0
    var previousTotal: Double = 0.0

    init(rainType: RainType, interval: Double,
         unitsFactor: Double = 1.0) {
        self.rainType = rainType
        self.interval = interval
        self.unitsFactor = unitsFactor
    }

    mutating func convertToIntensity(
        _ value: Double) -> Double {
        switch rainType {
        case .intensity:
            return value * unitsFactor

        case .volume:
            guard interval > 0.0 else { return 0.0 }
            return value * unitsFactor
                   * 3600.0 / interval

        case .cumulative:
            guard interval > 0.0 else { return 0.0 }
            let intensity =
                (value - previousTotal)
                * unitsFactor * 3600.0 / interval
            previousTotal = value
            return max(intensity, 0.0)
        }
    }

    mutating func getRate(raw: Double, next: Double,
                          tA: Double, tB: Double,
                          t: Double) -> Double {
        let rateA = convertToIntensity(raw)
        let rateB = convertToIntensity(next)
        currentRate = RainGage.interpolate(
            rateA: rateA, rateB: rateB,
            tA: tA, tB: tB, t: t)
        return currentRate
    }

    static func interpolate(rateA: Double,
        rateB: Double, tA: Double,
        tB: Double, t: Double) -> Double {
        let span = tB - tA
        guard span > 0.0 else { return rateA }
        return rateA + (rateB - rateA)
               * (t - tA) / span
    }
}`,
    kotlin: `// Rain.kt — Rainfall Processing
// SWMM5 Engine in Kotlin — Rain Gage Input Handling
// Converts raw rainfall data to time-stepped intensities
// for driving all hydrologic computations

package swmm

import kotlin.math.max

enum class RainType { INTENSITY, VOLUME, CUMULATIVE }

class RainGage(
    val rainType: RainType,
    val interval: Double,
    val unitsFactor: Double = 1.0
) {
    var currentRate: Double = 0.0
        private set
    var previousTotal: Double = 0.0
        private set

    fun convertToIntensity(value: Double): Double =
        when (rainType) {
            RainType.INTENSITY ->
                value * unitsFactor

            RainType.VOLUME -> {
                if (interval <= 0.0) 0.0
                else value * unitsFactor *
                     3600.0 / interval
            }

            RainType.CUMULATIVE -> {
                if (interval <= 0.0) 0.0
                else {
                    val intensity =
                        (value - previousTotal) *
                        unitsFactor * 3600.0 / interval
                    previousTotal = value
                    max(intensity, 0.0)
                }
            }
        }

    fun getRate(raw: Double, next: Double,
                tA: Double, tB: Double,
                t: Double): Double {
        val rateA = convertToIntensity(raw)
        val rateB = convertToIntensity(next)
        currentRate = interpolate(rateA, rateB,
                                  tA, tB, t)
        return currentRate
    }

    companion object {
        fun interpolate(rateA: Double, rateB: Double,
                        tA: Double, tB: Double,
                        t: Double): Double {
            val span = tB - tA
            if (span <= 0.0) return rateA
            return rateA + (rateB - rateA) *
                   (t - tA) / span
        }
    }
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
    zig: `// massbal.zig — Mass Balance Checking
// SWMM5 Engine in Zig — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

const std = @import("std");

const MassBalance = struct {
    total_inflow: f64 = 0.0,
    total_outflow: f64 = 0.0,
    initial_storage: f64 = 0.0,
    final_storage: f64 = 0.0,
    runoff_error: f64 = 0.0,
    routing_error: f64 = 0.0,

    pub fn init() MassBalance {
        return .{};
    }

    pub fn addInflow(self: *MassBalance, volume: f64) void {
        self.total_inflow += volume;
    }

    pub fn addOutflow(self: *MassBalance, volume: f64) void {
        self.total_outflow += volume;
    }

    pub fn updateStorage(self: *MassBalance, current: f64) void {
        self.final_storage = current;
    }

    pub fn report(self: *MassBalance) void {
        const delta = self.final_storage -
            self.initial_storage;
        self.runoff_error = getError(
            self.total_inflow, self.total_outflow, delta,
        );
        self.routing_error = self.runoff_error;

        const w = std.io.getStdOut().writer();
        w.print("\\n--- Mass Balance Report ---\\n", .{})
            catch {};
        w.print("Total Inflow:    {d:12.4}\\n",
            .{self.total_inflow}) catch {};
        w.print("Total Outflow:   {d:12.4}\\n",
            .{self.total_outflow}) catch {};
        w.print("Initial Storage: {d:12.4}\\n",
            .{self.initial_storage}) catch {};
        w.print("Final Storage:   {d:12.4}\\n",
            .{self.final_storage}) catch {};
        w.print("Runoff Error:    {d:12.4} %\\n",
            .{self.runoff_error}) catch {};
        w.print("Routing Error:   {d:12.4} %\\n",
            .{self.routing_error}) catch {};
    }
};

fn getError(total_in: f64, total_out: f64,
            storage_change: f64) f64 {
    var denom = total_in;
    if (denom <= 0.0) {
        denom = total_out + storage_change;
    }
    if (denom <= 0.0) return 0.0;

    return 100.0 * (total_in - total_out - storage_change) /
        denom;
}`,
    cpp: `// massbal.cpp — Mass Balance Checking
// SWMM5 Engine in C++ — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

#include <cstdio>
#include <cmath>

namespace swmm {

inline double getError(double totalIn, double totalOut,
                       double storageChange) {
    double denom = totalIn;
    if (denom <= 0.0)
        denom = totalOut + storageChange;
    if (denom <= 0.0) return 0.0;

    return 100.0 * (totalIn - totalOut - storageChange)
           / denom;
}

struct MassBalance {
    double totalInflow    = 0.0;
    double totalOutflow   = 0.0;
    double initialStorage = 0.0;
    double finalStorage   = 0.0;
    double runoffError    = 0.0;
    double routingError   = 0.0;

    void addInflow(double volume) {
        totalInflow += volume;
    }

    void addOutflow(double volume) {
        totalOutflow += volume;
    }

    void updateStorage(double current) {
        finalStorage = current;
    }

    void report() {
        double delta = finalStorage - initialStorage;
        runoffError = getError(totalInflow, totalOutflow,
                               delta);
        routingError = runoffError;

        std::printf("\\n--- Mass Balance Report ---\\n");
        std::printf("Total Inflow:    %12.4f\\n", totalInflow);
        std::printf("Total Outflow:   %12.4f\\n", totalOutflow);
        std::printf("Initial Storage: %12.4f\\n",
                    initialStorage);
        std::printf("Final Storage:   %12.4f\\n",
                    finalStorage);
        std::printf("Runoff Error:    %12.4f %%\\n",
                    runoffError);
        std::printf("Routing Error:   %12.4f %%\\n",
                    routingError);
    }
};

} // namespace swmm`,
    csharp: `// MassBalance.cs — Mass Balance Checking
// SWMM5 Engine in C# — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

using System;

namespace Swmm
{
    public class MassBalance
    {
        public double TotalInflow { get; private set; }
        public double TotalOutflow { get; private set; }
        public double InitialStorage { get; set; }
        public double FinalStorage { get; private set; }
        public double RunoffError { get; private set; }
        public double RoutingError { get; private set; }

        public MassBalance()
        {
            TotalInflow = 0.0;
            TotalOutflow = 0.0;
            InitialStorage = 0.0;
            FinalStorage = 0.0;
            RunoffError = 0.0;
            RoutingError = 0.0;
        }

        public void AddInflow(double volume)
        {
            TotalInflow += volume;
        }

        public void AddOutflow(double volume)
        {
            TotalOutflow += volume;
        }

        public void UpdateStorage(double current)
        {
            FinalStorage = current;
        }

        public static double GetError(double totalIn,
            double totalOut, double storageChange)
        {
            double denom = totalIn;
            if (denom <= 0.0)
                denom = totalOut + storageChange;
            if (denom <= 0.0) return 0.0;

            return 100.0 * (totalIn - totalOut
                            - storageChange) / denom;
        }

        public string Report()
        {
            double delta = FinalStorage - InitialStorage;
            RunoffError = GetError(TotalInflow,
                                    TotalOutflow, delta);
            RoutingError = RunoffError;

            return string.Format(
                "\\n--- Mass Balance Report ---\\n" +
                "Total Inflow:    {0,12:F4}\\n" +
                "Total Outflow:   {1,12:F4}\\n" +
                "Initial Storage: {2,12:F4}\\n" +
                "Final Storage:   {3,12:F4}\\n" +
                "Runoff Error:    {4,12:F4} %\\n" +
                "Routing Error:   {5,12:F4} %",
                TotalInflow, TotalOutflow,
                InitialStorage, FinalStorage,
                RunoffError, RoutingError);
        }
    }
}`,
    matlab: `% massbal.m — Mass Balance Checking
% SWMM5 Engine in MATLAB — Continuity Error Tracking
% Tracks all inflows, outflows, and storage to verify
% conservation of mass throughout the simulation

function mb = create_mass_balance()
    mb.total_inflow    = 0.0;
    mb.total_outflow   = 0.0;
    mb.initial_storage = 0.0;
    mb.final_storage   = 0.0;
    mb.runoff_error    = 0.0;
    mb.routing_error   = 0.0;
end

function mb = add_inflow(mb, volume)
    mb.total_inflow = mb.total_inflow + volume;
end

function mb = add_outflow(mb, volume)
    mb.total_outflow = mb.total_outflow + volume;
end

function mb = update_storage(mb, current)
    mb.final_storage = current;
end

function error_pct = get_error(total_in, total_out, ...
                                storage_change)
    denom = total_in;
    if denom <= 0.0
        denom = total_out + storage_change;
    end
    if denom <= 0.0
        error_pct = 0.0;
        return;
    end
    error_pct = 100.0 * (total_in - total_out ...
                - storage_change) / denom;
end

function mb = report(mb)
    delta = mb.final_storage - mb.initial_storage;
    mb.runoff_error = get_error(mb.total_inflow, ...
                      mb.total_outflow, delta);
    mb.routing_error = mb.runoff_error;

    fprintf('\\n--- Mass Balance Report ---\\n');
    fprintf('Total Inflow:    %12.4f\\n', mb.total_inflow);
    fprintf('Total Outflow:   %12.4f\\n', mb.total_outflow);
    fprintf('Initial Storage: %12.4f\\n', ...
            mb.initial_storage);
    fprintf('Final Storage:   %12.4f\\n', ...
            mb.final_storage);
    fprintf('Runoff Error:    %12.4f %%\\n', ...
            mb.runoff_error);
    fprintf('Routing Error:   %12.4f %%\\n', ...
            mb.routing_error);
end`,
    r: `# massbal.R — Mass Balance Checking
# SWMM5 Engine in R — Continuity Error Tracking
# Tracks all inflows, outflows, and storage to verify
# conservation of mass throughout the simulation

create_mass_balance <- function() {
    list(
        total_inflow    = 0.0,
        total_outflow   = 0.0,
        initial_storage = 0.0,
        final_storage   = 0.0,
        runoff_error    = 0.0,
        routing_error   = 0.0
    )
}

add_inflow <- function(mb, volume) {
    mb$total_inflow <- mb$total_inflow + volume
    mb
}

add_outflow <- function(mb, volume) {
    mb$total_outflow <- mb$total_outflow + volume
    mb
}

update_storage <- function(mb, current) {
    mb$final_storage <- current
    mb
}

get_error <- function(total_in, total_out,
                       storage_change) {
    denom <- total_in
    if (denom <= 0.0)
        denom <- total_out + storage_change
    if (denom <= 0.0) return(0.0)

    100.0 * (total_in - total_out
             - storage_change) / denom
}

report <- function(mb) {
    delta <- mb$final_storage - mb$initial_storage
    mb$runoff_error <- get_error(
        mb$total_inflow, mb$total_outflow, delta
    )
    mb$routing_error <- mb$runoff_error

    cat(sprintf("\\n--- Mass Balance Report ---\\n"))
    cat(sprintf("Total Inflow:    %12.4f\\n",
                mb$total_inflow))
    cat(sprintf("Total Outflow:   %12.4f\\n",
                mb$total_outflow))
    cat(sprintf("Initial Storage: %12.4f\\n",
                mb$initial_storage))
    cat(sprintf("Final Storage:   %12.4f\\n",
                mb$final_storage))
    cat(sprintf("Runoff Error:    %12.4f %%\\n",
                mb$runoff_error))
    cat(sprintf("Routing Error:   %12.4f %%\\n",
                mb$routing_error))
    mb
}`,
    delphi: `{ massbal.pas — Mass Balance Checking }
{ SWMM5 Engine in Delphi — Continuity Error Tracking }
{ Tracks all inflows, outflows, and storage to verify }
{ conservation of mass throughout the simulation }

unit MassBal;

interface

type
  TMassBalance = class
  private
    FTotalInflow: Double;
    FTotalOutflow: Double;
    FInitialStorage: Double;
    FFinalStorage: Double;
    FRunoffError: Double;
    FRoutingError: Double;
  public
    constructor Create;
    procedure AddInflow(Volume: Double);
    procedure AddOutflow(Volume: Double);
    procedure UpdateStorage(Current: Double);
    function Report: string;
    property RunoffError: Double read FRunoffError;
    property RoutingError: Double read FRoutingError;
  end;

function GetError(TotalIn, TotalOut,
                   StorageChange: Double): Double;

implementation

uses SysUtils;

constructor TMassBalance.Create;
begin
  FTotalInflow    := 0.0;
  FTotalOutflow   := 0.0;
  FInitialStorage := 0.0;
  FFinalStorage   := 0.0;
  FRunoffError    := 0.0;
  FRoutingError   := 0.0;
end;

procedure TMassBalance.AddInflow(Volume: Double);
begin
  FTotalInflow := FTotalInflow + Volume;
end;

procedure TMassBalance.AddOutflow(Volume: Double);
begin
  FTotalOutflow := FTotalOutflow + Volume;
end;

procedure TMassBalance.UpdateStorage(Current: Double);
begin
  FFinalStorage := Current;
end;

function GetError(TotalIn, TotalOut,
                   StorageChange: Double): Double;
var
  Denom: Double;
begin
  Denom := TotalIn;
  if Denom <= 0.0 then
    Denom := TotalOut + StorageChange;
  if Denom <= 0.0 then
    Exit(0.0);
  Result := 100.0 * (TotalIn - TotalOut
            - StorageChange) / Denom;
end;

function TMassBalance.Report: string;
var
  Delta: Double;
begin
  Delta := FFinalStorage - FInitialStorage;
  FRunoffError := GetError(FTotalInflow,
                            FTotalOutflow, Delta);
  FRoutingError := FRunoffError;

  Result := Format(
    '--- Mass Balance Report ---'#13#10 +
    'Total Inflow:    %12.4f'#13#10 +
    'Total Outflow:   %12.4f'#13#10 +
    'Initial Storage: %12.4f'#13#10 +
    'Final Storage:   %12.4f'#13#10 +
    'Runoff Error:    %12.4f %%'#13#10 +
    'Routing Error:   %12.4f %%',
    [FTotalInflow, FTotalOutflow,
     FInitialStorage, FFinalStorage,
     FRunoffError, FRoutingError]);
end;

end.`,
    typescript: `// massbal.ts — Mass Balance Checking
// SWMM5 Engine in TypeScript — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

interface MassBalanceState {
    totalInflow: number;
    totalOutflow: number;
    initialStorage: number;
    finalStorage: number;
    runoffError: number;
    routingError: number;
}

class MassBalance implements MassBalanceState {
    totalInflow: number = 0.0;
    totalOutflow: number = 0.0;
    initialStorage: number = 0.0;
    finalStorage: number = 0.0;
    runoffError: number = 0.0;
    routingError: number = 0.0;

    addInflow(volume: number): void {
        this.totalInflow += volume;
    }

    addOutflow(volume: number): void {
        this.totalOutflow += volume;
    }

    updateStorage(current: number): void {
        this.finalStorage = current;
    }

    report(): string {
        const delta: number = this.finalStorage
                              - this.initialStorage;
        this.runoffError = getError(
            this.totalInflow, this.totalOutflow, delta
        );
        this.routingError = this.runoffError;

        return [
            "",
            "--- Mass Balance Report ---",
            \`Total Inflow:    \${this.totalInflow.toFixed(4)}\`,
            \`Total Outflow:   \${this.totalOutflow.toFixed(4)}\`,
            \`Initial Storage: \${this.initialStorage.toFixed(4)}\`,
            \`Final Storage:   \${this.finalStorage.toFixed(4)}\`,
            \`Runoff Error:    \${this.runoffError.toFixed(4)} %\`,
            \`Routing Error:   \${this.routingError.toFixed(4)} %\`,
        ].join("\\n");
    }
}

function getError(totalIn: number, totalOut: number,
                   storageChange: number): number {
    let denom: number = totalIn;
    if (denom <= 0.0) {
        denom = totalOut + storageChange;
    }
    if (denom <= 0.0) return 0.0;

    return 100.0 * (totalIn - totalOut - storageChange)
           / denom;
}

export { MassBalance, getError };`,
    cuda: `// massbal.cu — Mass Balance Checking
// SWMM5 Engine in CUDA — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

#include <cstdio>

struct MassBalance {
    float totalInflow;
    float totalOutflow;
    float initialStorage;
    float finalStorage;
    float runoffError;
    float routingError;
};

__device__ float getError(float totalIn, float totalOut,
                           float storageChange)
{
    float denom = totalIn;
    if (denom <= 0.0f)
        denom = totalOut + storageChange;
    if (denom <= 0.0f) return 0.0f;

    return 100.0f * (totalIn - totalOut - storageChange)
           / denom;
}

__global__ void initMassBalance(MassBalance* mb, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    mb[idx].totalInflow    = 0.0f;
    mb[idx].totalOutflow   = 0.0f;
    mb[idx].initialStorage = 0.0f;
    mb[idx].finalStorage   = 0.0f;
    mb[idx].runoffError    = 0.0f;
    mb[idx].routingError   = 0.0f;
}

__global__ void addInflowKernel(MassBalance* mb,
    float* volumes, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;
    atomicAdd(&mb[idx].totalInflow, volumes[idx]);
}

__global__ void addOutflowKernel(MassBalance* mb,
    float* volumes, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;
    atomicAdd(&mb[idx].totalOutflow, volumes[idx]);
}

__global__ void computeErrorKernel(MassBalance* mb,
                                     int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    float delta = mb[idx].finalStorage
                  - mb[idx].initialStorage;
    mb[idx].runoffError = getError(
        mb[idx].totalInflow,
        mb[idx].totalOutflow, delta);
    mb[idx].routingError = mb[idx].runoffError;
}`,
    wasm: `;; massbal.wat — Mass Balance Checking
;; SWMM5 Engine in WebAssembly — Continuity Error Tracking
;; Tracks all inflows, outflows, and storage to verify
;; conservation of mass throughout the simulation

(module
  ;; Memory layout per MassBalance (48 bytes):
  ;; 0: totalInflow, 8: totalOutflow,
  ;; 16: initialStorage, 24: finalStorage,
  ;; 32: runoffError, 40: routingError

  (memory (export "memory") 1)

  (func $init (param $base i32)
    (f64.store (local.get $base) (f64.const 0.0))
    (f64.store (i32.add (local.get $base) (i32.const 8))
               (f64.const 0.0))
    (f64.store (i32.add (local.get $base) (i32.const 16))
               (f64.const 0.0))
    (f64.store (i32.add (local.get $base) (i32.const 24))
               (f64.const 0.0))
    (f64.store (i32.add (local.get $base) (i32.const 32))
               (f64.const 0.0))
    (f64.store (i32.add (local.get $base) (i32.const 40))
               (f64.const 0.0))
  )

  (func $addInflow (param $base i32) (param $vol f64)
    (f64.store (local.get $base)
      (f64.add (f64.load (local.get $base))
               (local.get $vol)))
  )

  (func $addOutflow (param $base i32) (param $vol f64)
    (f64.store (i32.add (local.get $base) (i32.const 8))
      (f64.add (f64.load (i32.add (local.get $base)
                                   (i32.const 8)))
               (local.get $vol)))
  )

  (func $updateStorage (param $base i32) (param $cur f64)
    (f64.store (i32.add (local.get $base) (i32.const 24))
               (local.get $cur))
  )

  (func $getError (param $in f64) (param $out f64)
                  (param $dStorage f64) (result f64)
    (local $denom f64)
    (local.set $denom (local.get $in))
    (if (f64.le (local.get $denom) (f64.const 0.0))
      (then (local.set $denom
        (f64.add (local.get $out)
                 (local.get $dStorage)))))
    (if (f64.le (local.get $denom) (f64.const 0.0))
      (then (return (f64.const 0.0))))
    (f64.div
      (f64.mul (f64.const 100.0)
        (f64.sub (f64.sub (local.get $in)
                           (local.get $out))
                 (local.get $dStorage)))
      (local.get $denom))
  )

  (func $report (export "report") (param $base i32)
    (local $delta f64)
    (local $err f64)
    (local.set $delta
      (f64.sub
        (f64.load (i32.add (local.get $base) (i32.const 24)))
        (f64.load (i32.add (local.get $base) (i32.const 16)))))
    (local.set $err
      (call $getError
        (f64.load (local.get $base))
        (f64.load (i32.add (local.get $base) (i32.const 8)))
        (local.get $delta)))
    (f64.store (i32.add (local.get $base) (i32.const 32))
               (local.get $err))
    (f64.store (i32.add (local.get $base) (i32.const 40))
               (local.get $err))
  )
)`,
    mojo: `# massbal.mojo — Mass Balance Checking
# SWMM5 Engine in Mojo — Continuity Error Tracking
# Tracks all inflows, outflows, and storage to verify
# conservation of mass throughout the simulation

struct MassBalance:
    var total_inflow: Float64
    var total_outflow: Float64
    var initial_storage: Float64
    var final_storage: Float64
    var runoff_error: Float64
    var routing_error: Float64

    fn __init__(inout self):
        self.total_inflow = 0.0
        self.total_outflow = 0.0
        self.initial_storage = 0.0
        self.final_storage = 0.0
        self.runoff_error = 0.0
        self.routing_error = 0.0

    fn add_inflow(inout self, volume: Float64):
        self.total_inflow += volume

    fn add_outflow(inout self, volume: Float64):
        self.total_outflow += volume

    fn update_storage(inout self, current: Float64):
        self.final_storage = current

    fn report(inout self):
        let delta = self.final_storage
                    - self.initial_storage
        self.runoff_error = get_error(
            self.total_inflow,
            self.total_outflow, delta
        )
        self.routing_error = self.runoff_error

        print("\\n--- Mass Balance Report ---")
        print("Total Inflow:   ", self.total_inflow)
        print("Total Outflow:  ", self.total_outflow)
        print("Initial Storage:", self.initial_storage)
        print("Final Storage:  ", self.final_storage)
        print("Runoff Error:   ", self.runoff_error, "%")
        print("Routing Error:  ", self.routing_error, "%")


fn get_error(total_in: Float64, total_out: Float64,
             storage_change: Float64) -> Float64:
    var denom = total_in
    if denom <= 0.0:
        denom = total_out + storage_change
    if denom <= 0.0:
        return 0.0
    return 100.0 * (total_in - total_out
                    - storage_change) / denom`,
    java: `// MassBalance.java — Mass Balance Checking
// SWMM5 Engine in Java — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

package swmm;

public class MassBalance {
    private double totalInflow = 0.0;
    private double totalOutflow = 0.0;
    private double initialStorage = 0.0;
    private double finalStorage = 0.0;
    private double runoffError = 0.0;
    private double routingError = 0.0;

    public void addInflow(double volume) {
        totalInflow += volume;
    }

    public void addOutflow(double volume) {
        totalOutflow += volume;
    }

    public void updateStorage(double current) {
        finalStorage = current;
    }

    public double getRunoffError() {
        return runoffError;
    }

    public double getRoutingError() {
        return routingError;
    }

    public static double getError(double totalIn,
        double totalOut, double storageChange) {
        double denom = totalIn;
        if (denom <= 0.0)
            denom = totalOut + storageChange;
        if (denom <= 0.0) return 0.0;

        return 100.0 * (totalIn - totalOut
                        - storageChange) / denom;
    }

    public String report() {
        double delta = finalStorage - initialStorage;
        runoffError = getError(totalInflow,
                                totalOutflow, delta);
        routingError = runoffError;

        return String.format(
            "%n--- Mass Balance Report ---%n" +
            "Total Inflow:    %12.4f%n" +
            "Total Outflow:   %12.4f%n" +
            "Initial Storage: %12.4f%n" +
            "Final Storage:   %12.4f%n" +
            "Runoff Error:    %12.4f %%%n" +
            "Routing Error:   %12.4f %%",
            totalInflow, totalOutflow,
            initialStorage, finalStorage,
            runoffError, routingError);
    }
}`,
    nim: `# massbal.nim — Mass Balance Checking
# SWMM5 Engine in Nim — Continuity Error Tracking
# Tracks all inflows, outflows, and storage to verify
# conservation of mass throughout the simulation

import strformat

type
  MassBalance = object
    totalInflow: float
    totalOutflow: float
    initialStorage: float
    finalStorage: float
    runoffError: float
    routingError: float

proc initMassBalance(): MassBalance =
  result = MassBalance(
    totalInflow: 0.0,
    totalOutflow: 0.0,
    initialStorage: 0.0,
    finalStorage: 0.0,
    runoffError: 0.0,
    routingError: 0.0
  )

proc addInflow(mb: var MassBalance, volume: float) =
  mb.totalInflow += volume

proc addOutflow(mb: var MassBalance, volume: float) =
  mb.totalOutflow += volume

proc updateStorage(mb: var MassBalance, current: float) =
  mb.finalStorage = current

proc getError(totalIn, totalOut,
              storageChange: float): float =
  var denom = totalIn
  if denom <= 0.0:
    denom = totalOut + storageChange
  if denom <= 0.0:
    return 0.0
  result = 100.0 * (totalIn - totalOut
                    - storageChange) / denom

proc report(mb: var MassBalance): string =
  let delta = mb.finalStorage - mb.initialStorage
  mb.runoffError = getError(
    mb.totalInflow, mb.totalOutflow, delta
  )
  mb.routingError = mb.runoffError

  result = fmt"""
--- Mass Balance Report ---
Total Inflow:    {mb.totalInflow:12.4f}
Total Outflow:   {mb.totalOutflow:12.4f}
Initial Storage: {mb.initialStorage:12.4f}
Final Storage:   {mb.finalStorage:12.4f}
Runoff Error:    {mb.runoffError:12.4f} %
Routing Error:   {mb.routingError:12.4f} %"""`,
    ada: `-- massbal.adb — Mass Balance Checking
-- SWMM5 Engine in Ada — Continuity Error Tracking
-- Tracks all inflows, outflows, and storage to verify
-- conservation of mass throughout the simulation

with Ada.Text_IO; use Ada.Text_IO;
with Ada.Float_Text_IO; use Ada.Float_Text_IO;

package body Mass_Balance_Pkg is

   type Mass_Balance is record
      Total_Inflow    : Float := 0.0;
      Total_Outflow   : Float := 0.0;
      Initial_Storage : Float := 0.0;
      Final_Storage   : Float := 0.0;
      Runoff_Error    : Float := 0.0;
      Routing_Error   : Float := 0.0;
   end record;

   procedure Init (MB : out Mass_Balance) is
   begin
      MB.Total_Inflow    := 0.0;
      MB.Total_Outflow   := 0.0;
      MB.Initial_Storage := 0.0;
      MB.Final_Storage   := 0.0;
      MB.Runoff_Error    := 0.0;
      MB.Routing_Error   := 0.0;
   end Init;

   procedure Add_Inflow (MB : in out Mass_Balance;
                          Volume : Float) is
   begin
      MB.Total_Inflow := MB.Total_Inflow + Volume;
   end Add_Inflow;

   procedure Add_Outflow (MB : in out Mass_Balance;
                           Volume : Float) is
   begin
      MB.Total_Outflow := MB.Total_Outflow + Volume;
   end Add_Outflow;

   procedure Update_Storage (MB : in out Mass_Balance;
                              Current : Float) is
   begin
      MB.Final_Storage := Current;
   end Update_Storage;

   function Get_Error (Total_In    : Float;
                       Total_Out   : Float;
                       Storage_Change : Float)
                       return Float is
      Denom : Float := Total_In;
   begin
      if Denom <= 0.0 then
         Denom := Total_Out + Storage_Change;
      end if;
      if Denom <= 0.0 then
         return 0.0;
      end if;
      return 100.0 * (Total_In - Total_Out
                      - Storage_Change) / Denom;
   end Get_Error;

   procedure Report (MB : in out Mass_Balance) is
      Delta : Float;
   begin
      Delta := MB.Final_Storage - MB.Initial_Storage;
      MB.Runoff_Error := Get_Error(
         MB.Total_Inflow, MB.Total_Outflow, Delta);
      MB.Routing_Error := MB.Runoff_Error;

      Put_Line("--- Mass Balance Report ---");
      Put("Total Inflow:    ");
      Put(MB.Total_Inflow, Fore => 8, Aft => 4);
      New_Line;
      Put("Total Outflow:   ");
      Put(MB.Total_Outflow, Fore => 8, Aft => 4);
      New_Line;
      Put("Runoff Error:    ");
      Put(MB.Runoff_Error, Fore => 8, Aft => 4);
      Put_Line(" %");
   end Report;

end Mass_Balance_Pkg;`,
    chapel: `// massbal.chpl — Mass Balance Checking
// SWMM5 Engine in Chapel — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

record MassBalance {
    var totalInflow: real = 0.0;
    var totalOutflow: real = 0.0;
    var initialStorage: real = 0.0;
    var finalStorage: real = 0.0;
    var runoffError: real = 0.0;
    var routingError: real = 0.0;

    proc ref addInflow(volume: real) {
        totalInflow += volume;
    }

    proc ref addOutflow(volume: real) {
        totalOutflow += volume;
    }

    proc ref updateStorage(current: real) {
        finalStorage = current;
    }

    proc ref report() {
        const delta = finalStorage - initialStorage;
        runoffError = getError(
            totalInflow, totalOutflow, delta
        );
        routingError = runoffError;

        writeln();
        writeln("--- Mass Balance Report ---");
        writef("Total Inflow:    %12.4dr\\n",
               totalInflow);
        writef("Total Outflow:   %12.4dr\\n",
               totalOutflow);
        writef("Initial Storage: %12.4dr\\n",
               initialStorage);
        writef("Final Storage:   %12.4dr\\n",
               finalStorage);
        writef("Runoff Error:    %12.4dr %%\\n",
               runoffError);
        writef("Routing Error:   %12.4dr %%\\n",
               routingError);
    }
}

proc getError(totalIn: real, totalOut: real,
              storageChange: real): real {
    var denom = totalIn;
    if denom <= 0.0 then
        denom = totalOut + storageChange;
    if denom <= 0.0 then
        return 0.0;
    return 100.0 * (totalIn - totalOut
                    - storageChange) / denom;
}`,
    swift: `// massbal.swift — Mass Balance Checking
// SWMM5 Engine in Swift — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

import Foundation

struct MassBalance {
    var totalInflow: Double = 0.0
    var totalOutflow: Double = 0.0
    var initialStorage: Double = 0.0
    var finalStorage: Double = 0.0
    var runoffError: Double = 0.0
    var routingError: Double = 0.0

    mutating func addInflow(_ volume: Double) {
        totalInflow += volume
    }

    mutating func addOutflow(_ volume: Double) {
        totalOutflow += volume
    }

    mutating func updateStorage(_ current: Double) {
        finalStorage = current
    }

    mutating func report() -> String {
        let delta = finalStorage - initialStorage
        runoffError = getError(
            totalIn: totalInflow,
            totalOut: totalOutflow,
            storageChange: delta
        )
        routingError = runoffError

        return """
        
        --- Mass Balance Report ---
        Total Inflow:    \\(String(format: "%12.4f", totalInflow))
        Total Outflow:   \\(String(format: "%12.4f", totalOutflow))
        Initial Storage: \\(String(format: "%12.4f", initialStorage))
        Final Storage:   \\(String(format: "%12.4f", finalStorage))
        Runoff Error:    \\(String(format: "%12.4f", runoffError)) %
        Routing Error:   \\(String(format: "%12.4f", routingError)) %
        """
    }
}

func getError(totalIn: Double, totalOut: Double,
              storageChange: Double) -> Double {
    var denom = totalIn
    if denom <= 0.0 {
        denom = totalOut + storageChange
    }
    guard denom > 0.0 else { return 0.0 }

    return 100.0 * (totalIn - totalOut
                    - storageChange) / denom
}`,
    kotlin: `// MassBalance.kt — Mass Balance Checking
// SWMM5 Engine in Kotlin — Continuity Error Tracking
// Tracks all inflows, outflows, and storage to verify
// conservation of mass throughout the simulation

package swmm

class MassBalance(
    var totalInflow: Double = 0.0,
    var totalOutflow: Double = 0.0,
    var initialStorage: Double = 0.0,
    var finalStorage: Double = 0.0,
    var runoffError: Double = 0.0,
    var routingError: Double = 0.0
) {
    fun addInflow(volume: Double) {
        totalInflow += volume
    }

    fun addOutflow(volume: Double) {
        totalOutflow += volume
    }

    fun updateStorage(current: Double) {
        finalStorage = current
    }

    fun report(): String {
        val delta = finalStorage - initialStorage
        runoffError = getError(
            totalInflow, totalOutflow, delta
        )
        routingError = runoffError

        return buildString {
            appendLine()
            appendLine("--- Mass Balance Report ---")
            appendLine("Total Inflow:    %12.4f"
                .format(totalInflow))
            appendLine("Total Outflow:   %12.4f"
                .format(totalOutflow))
            appendLine("Initial Storage: %12.4f"
                .format(initialStorage))
            appendLine("Final Storage:   %12.4f"
                .format(finalStorage))
            appendLine("Runoff Error:    %12.4f %%"
                .format(runoffError))
            appendLine("Routing Error:   %12.4f %%"
                .format(routingError))
        }
    }

    companion object {
        fun getError(totalIn: Double, totalOut: Double,
                     storageChange: Double): Double {
            var denom = totalIn
            if (denom <= 0.0)
                denom = totalOut + storageChange
            if (denom <= 0.0) return 0.0

            return 100.0 * (totalIn - totalOut
                            - storageChange) / denom
        }
    }
}`,
  },
  "gwater.c — Groundwater Flow": {
    category: "Hydrology",
    difficulty: "advanced",
    tags: ["groundwater", "aquifer", "water table", "percolation", "lateral flow", "subsurface", "unsaturated zone", "saturated zone"],
    description: "Models the two-zone groundwater system beneath each subcatchment. The upper (unsaturated) zone receives infiltration from the surface and loses water through percolation to the lower (saturated) zone. The lower zone exchanges lateral flow with the drainage network based on water table elevation relative to node invert. Uses a simple mass balance with Darcy's law for lateral flow.",
    equations: "Q_lateral = A·Ks·(H_gw - H_node)/L (lateral groundwater flow); Perc = Ks_unsat·(θ/θ_sat)^n (percolation); dH/dt = (Infil - Perc - ET - Q_lat)/(A·porosity)",
    inputs: "Aquifer properties (Ks, porosity, field capacity), infiltration rate, node water level, subcatchment area",
    outputs: "Groundwater lateral flow to drainage network, water table elevation, upper zone moisture",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// gwater.c — Groundwater Flow
// EPA SWMM5 Engine — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

#include <math.h>

typedef struct {
    double ks;          // saturated hydraulic conductivity (ft/s)
    double porosity;    // soil porosity (fraction)
    double fieldCap;    // field capacity (fraction)
    double percExp;     // percolation exponent
} TAquifer;

typedef struct {
    double upperMoist;  // upper zone moisture (fraction)
    double waterTable;  // water table elevation (ft)
    double area;        // subcatchment area (ft²)
    double nodeElev;    // drainage node invert elevation (ft)
    double flowLength;  // distance to drainage node (ft)
} TGwater;

double gwater_getPercolation(TAquifer* a, TGwater* gw)
{
    double theta;

    if (gw->upperMoist <= a->fieldCap) return 0.0;

    theta = gw->upperMoist / a->porosity;
    if (theta > 1.0) theta = 1.0;

    return a->ks * pow(theta, a->percExp);
}

double gwater_getLateralFlow(TAquifer* a, TGwater* gw)
{
    double dh;

    dh = gw->waterTable - gw->nodeElev;
    if (gw->flowLength <= 0.0) return 0.0;

    return gw->area * a->ks * dh / gw->flowLength;
}

void gwater_updateWaterTable(TAquifer* a, TGwater* gw,
                              double infil, double et,
                              double dt)
{
    double perc, qLat, dh;

    perc = gwater_getPercolation(a, gw);
    qLat = gwater_getLateralFlow(a, gw);

    gw->upperMoist += (infil - perc - et) * dt
                      / (gw->area * a->porosity);
    if (gw->upperMoist < 0.0) gw->upperMoist = 0.0;
    if (gw->upperMoist > a->porosity)
        gw->upperMoist = a->porosity;

    dh = (perc * gw->area - qLat) * dt
         / (gw->area * a->porosity);
    gw->waterTable += dh;
}`,
    rust: `// gwater.rs — Groundwater Flow
// SWMM5 Engine in Rust — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

pub struct Aquifer {
    pub ks: f64,        // saturated hydraulic conductivity (ft/s)
    pub porosity: f64,  // soil porosity (fraction)
    pub field_cap: f64, // field capacity (fraction)
    pub perc_exp: f64,  // percolation exponent
}

pub struct GWater {
    pub upper_moist: f64,  // upper zone moisture (fraction)
    pub water_table: f64,  // water table elevation (ft)
    pub area: f64,         // subcatchment area (ft²)
    pub node_elev: f64,    // drainage node invert elevation (ft)
    pub flow_length: f64,  // distance to drainage node (ft)
}

impl GWater {
    pub fn get_percolation(&self, aq: &Aquifer) -> f64 {
        if self.upper_moist <= aq.field_cap { return 0.0; }

        let theta = (self.upper_moist / aq.porosity).min(1.0);
        aq.ks * theta.powf(aq.perc_exp)
    }

    pub fn get_lateral_flow(&self, aq: &Aquifer) -> f64 {
        if self.flow_length <= 0.0 { return 0.0; }

        let dh = self.water_table - self.node_elev;
        self.area * aq.ks * dh / self.flow_length
    }

    pub fn update_water_table(&mut self, aq: &Aquifer,
                               infil: f64, et: f64,
                               dt: f64) {
        let perc = self.get_percolation(aq);
        let q_lat = self.get_lateral_flow(aq);

        self.upper_moist += (infil - perc - et) * dt
                            / (self.area * aq.porosity);
        self.upper_moist = self.upper_moist
                               .clamp(0.0, aq.porosity);

        let dh = (perc * self.area - q_lat) * dt
                 / (self.area * aq.porosity);
        self.water_table += dh;
    }
}`,
    python: `# gwater.py — Groundwater Flow
# SWMM5 Engine in Python — Two-Zone Groundwater Model
# Models unsaturated/saturated zones beneath each
# subcatchment with Darcy lateral flow to drainage network

from dataclasses import dataclass

@dataclass
class Aquifer:
    ks: float        # saturated hydraulic conductivity (ft/s)
    porosity: float  # soil porosity (fraction)
    field_cap: float # field capacity (fraction)
    perc_exp: float  # percolation exponent

@dataclass
class GWater:
    upper_moist: float  # upper zone moisture (fraction)
    water_table: float  # water table elevation (ft)
    area: float         # subcatchment area (ft²)
    node_elev: float    # drainage node invert elevation (ft)
    flow_length: float  # distance to drainage node (ft)

    def get_percolation(self, aq: Aquifer) -> float:
        if self.upper_moist <= aq.field_cap:
            return 0.0
        theta = min(self.upper_moist / aq.porosity, 1.0)
        return aq.ks * theta ** aq.perc_exp

    def get_lateral_flow(self, aq: Aquifer) -> float:
        if self.flow_length <= 0.0:
            return 0.0
        dh = self.water_table - self.node_elev
        return self.area * aq.ks * dh / self.flow_length

    def update_water_table(self, aq: Aquifer,
                           infil: float, et: float,
                           dt: float) -> None:
        perc = self.get_percolation(aq)
        q_lat = self.get_lateral_flow(aq)

        self.upper_moist += ((infil - perc - et) * dt
                             / (self.area * aq.porosity))
        self.upper_moist = max(0.0,
                           min(self.upper_moist, aq.porosity))

        dh = ((perc * self.area - q_lat) * dt
              / (self.area * aq.porosity))
        self.water_table += dh`,
    fortran: `! gwater.f90 — Groundwater Flow
! SWMM5 Engine in Fortran — Two-Zone Groundwater Model
! Models unsaturated/saturated zones beneath each
! subcatchment with Darcy lateral flow to drainage network

module gwater_module
    implicit none

    type :: Aquifer
        real(8) :: ks        ! saturated hydraulic conductivity
        real(8) :: porosity  ! soil porosity (fraction)
        real(8) :: field_cap ! field capacity (fraction)
        real(8) :: perc_exp  ! percolation exponent
    end type Aquifer

    type :: GWater
        real(8) :: upper_moist  ! upper zone moisture
        real(8) :: water_table  ! water table elevation (ft)
        real(8) :: area         ! subcatchment area (ft²)
        real(8) :: node_elev    ! drainage node invert (ft)
        real(8) :: flow_length  ! distance to node (ft)
    end type GWater

contains

    function get_percolation(aq, gw) result(perc)
        type(Aquifer), intent(in) :: aq
        type(GWater), intent(in) :: gw
        real(8) :: perc, theta

        if (gw%upper_moist <= aq%field_cap) then
            perc = 0.0d0
            return
        end if

        theta = gw%upper_moist / aq%porosity
        if (theta > 1.0d0) theta = 1.0d0
        perc = aq%ks * theta**aq%perc_exp
    end function get_percolation

    function get_lateral_flow(aq, gw) result(q_lat)
        type(Aquifer), intent(in) :: aq
        type(GWater), intent(in) :: gw
        real(8) :: q_lat, dh

        if (gw%flow_length <= 0.0d0) then
            q_lat = 0.0d0
            return
        end if

        dh = gw%water_table - gw%node_elev
        q_lat = gw%area * aq%ks * dh / gw%flow_length
    end function get_lateral_flow

    subroutine update_water_table(aq, gw, infil, et, dt)
        type(Aquifer), intent(in) :: aq
        type(GWater), intent(inout) :: gw
        real(8), intent(in) :: infil, et, dt
        real(8) :: perc, q_lat, dh

        perc = get_percolation(aq, gw)
        q_lat = get_lateral_flow(aq, gw)

        gw%upper_moist = gw%upper_moist &
            + (infil - perc - et) * dt &
            / (gw%area * aq%porosity)
        if (gw%upper_moist < 0.0d0) gw%upper_moist = 0.0d0
        if (gw%upper_moist > aq%porosity) &
            gw%upper_moist = aq%porosity

        dh = (perc * gw%area - q_lat) * dt &
             / (gw%area * aq%porosity)
        gw%water_table = gw%water_table + dh
    end subroutine update_water_table

end module gwater_module`,
    julia: `# gwater.jl — Groundwater Flow
# SWMM5 Engine in Julia — Two-Zone Groundwater Model
# Models unsaturated/saturated zones beneath each
# subcatchment with Darcy lateral flow to drainage network

struct Aquifer
    ks::Float64        # saturated hydraulic conductivity
    porosity::Float64  # soil porosity (fraction)
    field_cap::Float64 # field capacity (fraction)
    perc_exp::Float64  # percolation exponent
end

mutable struct GWater
    upper_moist::Float64  # upper zone moisture
    water_table::Float64  # water table elevation (ft)
    area::Float64         # subcatchment area (ft²)
    node_elev::Float64    # drainage node invert (ft)
    flow_length::Float64  # distance to node (ft)
end

function get_percolation(aq::Aquifer, gw::GWater)::Float64
    gw.upper_moist ≤ aq.field_cap && return 0.0
    theta = min(gw.upper_moist / aq.porosity, 1.0)
    return aq.ks * theta^aq.perc_exp
end

function get_lateral_flow(aq::Aquifer, gw::GWater)::Float64
    gw.flow_length ≤ 0.0 && return 0.0
    dh = gw.water_table - gw.node_elev
    return gw.area * aq.ks * dh / gw.flow_length
end

function update_water_table!(aq::Aquifer, gw::GWater,
                              infil::Float64, et::Float64,
                              dt::Float64)
    perc = get_percolation(aq, gw)
    q_lat = get_lateral_flow(aq, gw)

    gw.upper_moist += (infil - perc - et) * dt /
                      (gw.area * aq.porosity)
    gw.upper_moist = clamp(gw.upper_moist, 0.0, aq.porosity)

    dh = (perc * gw.area - q_lat) * dt /
         (gw.area * aq.porosity)
    gw.water_table += dh
end`,
    javascript: `// gwater.js — Groundwater Flow
// SWMM5 Engine in JavaScript — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

class Aquifer {
    constructor(ks, porosity, fieldCap, percExp) {
        this.ks = ks;
        this.porosity = porosity;
        this.fieldCap = fieldCap;
        this.percExp = percExp;
    }
}

class GWater {
    constructor(upperMoist, waterTable, area,
                nodeElev, flowLength) {
        this.upperMoist = upperMoist;
        this.waterTable = waterTable;
        this.area = area;
        this.nodeElev = nodeElev;
        this.flowLength = flowLength;
    }

    getPercolation(aq) {
        if (this.upperMoist <= aq.fieldCap) return 0.0;
        const theta = Math.min(
            this.upperMoist / aq.porosity, 1.0);
        return aq.ks * Math.pow(theta, aq.percExp);
    }

    getLateralFlow(aq) {
        if (this.flowLength <= 0.0) return 0.0;
        const dh = this.waterTable - this.nodeElev;
        return this.area * aq.ks * dh / this.flowLength;
    }

    updateWaterTable(aq, infil, et, dt) {
        const perc = this.getPercolation(aq);
        const qLat = this.getLateralFlow(aq);

        this.upperMoist += (infil - perc - et) * dt
                           / (this.area * aq.porosity);
        this.upperMoist = Math.max(0.0,
            Math.min(this.upperMoist, aq.porosity));

        const dh = (perc * this.area - qLat) * dt
                   / (this.area * aq.porosity);
        this.waterTable += dh;
    }
}

export { Aquifer, GWater };`,
    go: `// gwater.go — Groundwater Flow
// SWMM5 Engine in Go — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

package swmm

import "math"

type Aquifer struct {
    Ks       float64 // saturated hydraulic conductivity
    Porosity float64 // soil porosity (fraction)
    FieldCap float64 // field capacity (fraction)
    PercExp  float64 // percolation exponent
}

type GWater struct {
    UpperMoist float64 // upper zone moisture
    WaterTable float64 // water table elevation (ft)
    Area       float64 // subcatchment area (ft²)
    NodeElev   float64 // drainage node invert (ft)
    FlowLength float64 // distance to node (ft)
}

func (gw *GWater) GetPercolation(aq *Aquifer) float64 {
    if gw.UpperMoist <= aq.FieldCap {
        return 0.0
    }
    theta := gw.UpperMoist / aq.Porosity
    if theta > 1.0 {
        theta = 1.0
    }
    return aq.Ks * math.Pow(theta, aq.PercExp)
}

func (gw *GWater) GetLateralFlow(aq *Aquifer) float64 {
    if gw.FlowLength <= 0.0 {
        return 0.0
    }
    dh := gw.WaterTable - gw.NodeElev
    return gw.Area * aq.Ks * dh / gw.FlowLength
}

func (gw *GWater) UpdateWaterTable(aq *Aquifer,
    infil, et, dt float64) {

    perc := gw.GetPercolation(aq)
    qLat := gw.GetLateralFlow(aq)

    gw.UpperMoist += (infil - perc - et) * dt /
        (gw.Area * aq.Porosity)
    if gw.UpperMoist < 0.0 {
        gw.UpperMoist = 0.0
    } else if gw.UpperMoist > aq.Porosity {
        gw.UpperMoist = aq.Porosity
    }

    dh := (perc*gw.Area - qLat) * dt /
        (gw.Area * aq.Porosity)
    gw.WaterTable += dh
}`,
    zig: `// gwater.zig — Groundwater Flow
// SWMM5 Engine in Zig — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

const std = @import("std");
const math = std.math;

const Aquifer = struct {
    ks: f64,        // saturated hydraulic conductivity
    porosity: f64,  // soil porosity (fraction)
    field_cap: f64, // field capacity (fraction)
    perc_exp: f64,  // percolation exponent
};

const GWater = struct {
    upper_moist: f64,  // upper zone moisture
    water_table: f64,  // water table elevation (ft)
    area: f64,         // subcatchment area (ft²)
    node_elev: f64,    // drainage node invert (ft)
    flow_length: f64,  // distance to node (ft)

    pub fn getPercolation(self: *const GWater,
                          aq: *const Aquifer) f64 {
        if (self.upper_moist <= aq.field_cap) return 0.0;
        const theta = @min(
            self.upper_moist / aq.porosity, 1.0);
        return aq.ks * math.pow(f64, theta, aq.perc_exp);
    }

    pub fn getLateralFlow(self: *const GWater,
                          aq: *const Aquifer) f64 {
        if (self.flow_length <= 0.0) return 0.0;
        const dh = self.water_table - self.node_elev;
        return self.area * aq.ks * dh / self.flow_length;
    }

    pub fn updateWaterTable(self: *GWater,
                            aq: *const Aquifer,
                            infil: f64, et: f64,
                            dt: f64) void {
        const perc = self.getPercolation(aq);
        const q_lat = self.getLateralFlow(aq);

        self.upper_moist += (infil - perc - et) * dt /
            (self.area * aq.porosity);
        self.upper_moist = math.clamp(
            self.upper_moist, 0.0, aq.porosity);

        const dh = (perc * self.area - q_lat) * dt /
            (self.area * aq.porosity);
        self.water_table += dh;
    }
};`,
    cpp: `// gwater.cpp — Groundwater Flow
// SWMM5 Engine in C++ — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

#include <cmath>
#include <algorithm>

namespace swmm {

struct Aquifer {
    double ks;        // saturated hydraulic conductivity
    double porosity;  // soil porosity (fraction)
    double fieldCap;  // field capacity (fraction)
    double percExp;   // percolation exponent
};

struct GWater {
    double upperMoist;  // upper zone moisture
    double waterTable;  // water table elevation (ft)
    double area;        // subcatchment area (ft²)
    double nodeElev;    // drainage node invert (ft)
    double flowLength;  // distance to node (ft)

    double getPercolation(const Aquifer& aq) const {
        if (upperMoist <= aq.fieldCap) return 0.0;
        double theta = std::min(
            upperMoist / aq.porosity, 1.0);
        return aq.ks * std::pow(theta, aq.percExp);
    }

    double getLateralFlow(const Aquifer& aq) const {
        if (flowLength <= 0.0) return 0.0;
        double dh = waterTable - nodeElev;
        return area * aq.ks * dh / flowLength;
    }

    void updateWaterTable(const Aquifer& aq,
                          double infil, double et,
                          double dt) {
        double perc = getPercolation(aq);
        double qLat = getLateralFlow(aq);

        upperMoist += (infil - perc - et) * dt
                      / (area * aq.porosity);
        upperMoist = std::clamp(upperMoist,
                                0.0, aq.porosity);

        double dh = (perc * area - qLat) * dt
                    / (area * aq.porosity);
        waterTable += dh;
    }
};

} // namespace swmm`,
    csharp: `// GWater.cs — Groundwater Flow
// SWMM5 Engine in C# — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

using System;

namespace Swmm
{
    public class Aquifer
    {
        public double Ks { get; set; }
        public double Porosity { get; set; }
        public double FieldCap { get; set; }
        public double PercExp { get; set; }

        public Aquifer(double ks, double porosity,
                       double fieldCap, double percExp)
        {
            Ks = ks;
            Porosity = porosity;
            FieldCap = fieldCap;
            PercExp = percExp;
        }
    }

    public class GWater
    {
        public double UpperMoist { get; set; }
        public double WaterTable { get; set; }
        public double Area { get; set; }
        public double NodeElev { get; set; }
        public double FlowLength { get; set; }

        public GWater(double upperMoist, double waterTable,
                      double area, double nodeElev,
                      double flowLength)
        {
            UpperMoist = upperMoist;
            WaterTable = waterTable;
            Area = area;
            NodeElev = nodeElev;
            FlowLength = flowLength;
        }

        public double GetPercolation(Aquifer aq)
        {
            if (UpperMoist <= aq.FieldCap) return 0.0;
            double theta = Math.Min(
                UpperMoist / aq.Porosity, 1.0);
            return aq.Ks * Math.Pow(theta, aq.PercExp);
        }

        public double GetLateralFlow(Aquifer aq)
        {
            if (FlowLength <= 0.0) return 0.0;
            double dh = WaterTable - NodeElev;
            return Area * aq.Ks * dh / FlowLength;
        }

        public void UpdateWaterTable(Aquifer aq,
            double infil, double et, double dt)
        {
            double perc = GetPercolation(aq);
            double qLat = GetLateralFlow(aq);

            UpperMoist += (infil - perc - et) * dt
                          / (Area * aq.Porosity);
            UpperMoist = Math.Clamp(UpperMoist,
                                    0.0, aq.Porosity);

            double dh = (perc * Area - qLat) * dt
                        / (Area * aq.Porosity);
            WaterTable += dh;
        }
    }
}`,
    matlab: `% gwater.m — Groundwater Flow
% SWMM5 Engine in MATLAB — Two-Zone Groundwater Model
% Models unsaturated/saturated zones beneath each
% subcatchment with Darcy lateral flow to drainage network

function aq = create_aquifer(ks, porosity, ...
                              field_cap, perc_exp)
    aq.ks        = ks;
    aq.porosity  = porosity;
    aq.field_cap = field_cap;
    aq.perc_exp  = perc_exp;
end

function gw = create_gwater(upper_moist, water_table, ...
                              area, node_elev, flow_length)
    gw.upper_moist = upper_moist;
    gw.water_table = water_table;
    gw.area        = area;
    gw.node_elev   = node_elev;
    gw.flow_length = flow_length;
end

function perc = get_percolation(aq, gw)
    if gw.upper_moist <= aq.field_cap
        perc = 0.0;
        return;
    end
    theta = min(gw.upper_moist / aq.porosity, 1.0);
    perc = aq.ks * theta^aq.perc_exp;
end

function q_lat = get_lateral_flow(aq, gw)
    if gw.flow_length <= 0.0
        q_lat = 0.0;
        return;
    end
    dh = gw.water_table - gw.node_elev;
    q_lat = gw.area * aq.ks * dh / gw.flow_length;
end

function gw = update_water_table(aq, gw, infil, et, dt)
    perc  = get_percolation(aq, gw);
    q_lat = get_lateral_flow(aq, gw);

    gw.upper_moist = gw.upper_moist ...
        + (infil - perc - et) * dt ...
        / (gw.area * aq.porosity);
    gw.upper_moist = max(0.0, ...
        min(gw.upper_moist, aq.porosity));

    dh = (perc * gw.area - q_lat) * dt ...
         / (gw.area * aq.porosity);
    gw.water_table = gw.water_table + dh;
end`,
    r: `# gwater.R — Groundwater Flow
# SWMM5 Engine in R — Two-Zone Groundwater Model
# Models unsaturated/saturated zones beneath each
# subcatchment with Darcy lateral flow to drainage network

create_aquifer <- function(ks, porosity,
                            field_cap, perc_exp) {
    list(
        ks        = ks,
        porosity  = porosity,
        field_cap = field_cap,
        perc_exp  = perc_exp
    )
}

create_gwater <- function(upper_moist, water_table,
                           area, node_elev, flow_length) {
    list(
        upper_moist = upper_moist,
        water_table = water_table,
        area        = area,
        node_elev   = node_elev,
        flow_length = flow_length
    )
}

get_percolation <- function(aq, gw) {
    if (gw$upper_moist <= aq$field_cap) return(0.0)
    theta <- min(gw$upper_moist / aq$porosity, 1.0)
    aq$ks * theta^aq$perc_exp
}

get_lateral_flow <- function(aq, gw) {
    if (gw$flow_length <= 0.0) return(0.0)
    dh <- gw$water_table - gw$node_elev
    gw$area * aq$ks * dh / gw$flow_length
}

update_water_table <- function(aq, gw, infil, et, dt) {
    perc  <- get_percolation(aq, gw)
    q_lat <- get_lateral_flow(aq, gw)

    gw$upper_moist <- gw$upper_moist +
        (infil - perc - et) * dt /
        (gw$area * aq$porosity)
    gw$upper_moist <- max(0.0,
        min(gw$upper_moist, aq$porosity))

    dh <- (perc * gw$area - q_lat) * dt /
          (gw$area * aq$porosity)
    gw$water_table <- gw$water_table + dh
    gw
}`,
    delphi: `{ gwater.pas — Groundwater Flow }
{ SWMM5 Engine in Delphi — Two-Zone Groundwater Model }
{ Models unsaturated/saturated zones beneath each }
{ subcatchment with Darcy lateral flow to drainage network }

unit GWater;

interface

uses Math;

type
  TAquifer = class
  public
    Ks: Double;
    Porosity: Double;
    FieldCap: Double;
    PercExp: Double;
    constructor Create(AKs, APorosity,
                       AFieldCap, APercExp: Double);
  end;

  TGWater = class
  public
    UpperMoist: Double;
    WaterTable: Double;
    Area: Double;
    NodeElev: Double;
    FlowLength: Double;
    constructor Create(AUpperMoist, AWaterTable,
                       AArea, ANodeElev,
                       AFlowLength: Double);
    function GetPercolation(Aq: TAquifer): Double;
    function GetLateralFlow(Aq: TAquifer): Double;
    procedure UpdateWaterTable(Aq: TAquifer;
        Infil, ET, Dt: Double);
  end;

implementation

constructor TAquifer.Create(AKs, APorosity,
                             AFieldCap, APercExp: Double);
begin
  Ks       := AKs;
  Porosity := APorosity;
  FieldCap := AFieldCap;
  PercExp  := APercExp;
end;

constructor TGWater.Create(AUpperMoist, AWaterTable,
                            AArea, ANodeElev,
                            AFlowLength: Double);
begin
  UpperMoist := AUpperMoist;
  WaterTable := AWaterTable;
  Area       := AArea;
  NodeElev   := ANodeElev;
  FlowLength := AFlowLength;
end;

function TGWater.GetPercolation(Aq: TAquifer): Double;
var
  Theta: Double;
begin
  if UpperMoist <= Aq.FieldCap then
    Exit(0.0);
  Theta := Min(UpperMoist / Aq.Porosity, 1.0);
  Result := Aq.Ks * Power(Theta, Aq.PercExp);
end;

function TGWater.GetLateralFlow(Aq: TAquifer): Double;
var
  Dh: Double;
begin
  if FlowLength <= 0.0 then
    Exit(0.0);
  Dh := WaterTable - NodeElev;
  Result := Area * Aq.Ks * Dh / FlowLength;
end;

procedure TGWater.UpdateWaterTable(Aq: TAquifer;
    Infil, ET, Dt: Double);
var
  Perc, QLat, Dh: Double;
begin
  Perc := GetPercolation(Aq);
  QLat := GetLateralFlow(Aq);

  UpperMoist := UpperMoist
      + (Infil - Perc - ET) * Dt
      / (Area * Aq.Porosity);
  UpperMoist := Max(0.0, Min(UpperMoist, Aq.Porosity));

  Dh := (Perc * Area - QLat) * Dt
        / (Area * Aq.Porosity);
  WaterTable := WaterTable + Dh;
end;

end.`,
    typescript: `// gwater.ts — Groundwater Flow
// SWMM5 Engine in TypeScript — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

interface AquiferParams {
    ks: number;
    porosity: number;
    fieldCap: number;
    percExp: number;
}

interface GWaterParams {
    upperMoist: number;
    waterTable: number;
    area: number;
    nodeElev: number;
    flowLength: number;
}

class Aquifer {
    readonly ks: number;
    readonly porosity: number;
    readonly fieldCap: number;
    readonly percExp: number;

    constructor(p: AquiferParams) {
        this.ks = p.ks;
        this.porosity = p.porosity;
        this.fieldCap = p.fieldCap;
        this.percExp = p.percExp;
    }
}

class GWater {
    upperMoist: number;
    waterTable: number;
    area: number;
    nodeElev: number;
    flowLength: number;

    constructor(p: GWaterParams) {
        this.upperMoist = p.upperMoist;
        this.waterTable = p.waterTable;
        this.area = p.area;
        this.nodeElev = p.nodeElev;
        this.flowLength = p.flowLength;
    }

    getPercolation(aq: Aquifer): number {
        if (this.upperMoist <= aq.fieldCap) return 0.0;
        const theta: number = Math.min(
            this.upperMoist / aq.porosity, 1.0);
        return aq.ks * Math.pow(theta, aq.percExp);
    }

    getLateralFlow(aq: Aquifer): number {
        if (this.flowLength <= 0.0) return 0.0;
        const dh: number = this.waterTable - this.nodeElev;
        return this.area * aq.ks * dh / this.flowLength;
    }

    updateWaterTable(aq: Aquifer, infil: number,
                     et: number, dt: number): void {
        const perc: number = this.getPercolation(aq);
        const qLat: number = this.getLateralFlow(aq);

        this.upperMoist += (infil - perc - et) * dt
                           / (this.area * aq.porosity);
        this.upperMoist = Math.max(0.0,
            Math.min(this.upperMoist, aq.porosity));

        const dh: number = (perc * this.area - qLat) * dt
                           / (this.area * aq.porosity);
        this.waterTable += dh;
    }
}

export { Aquifer, GWater };`,
    cuda: `// gwater.cu — Groundwater Flow
// SWMM5 Engine in CUDA — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

#include <math.h>

struct Aquifer {
    float ks;
    float porosity;
    float fieldCap;
    float percExp;
};

struct GWaterData {
    float upperMoist;
    float waterTable;
    float area;
    float nodeElev;
    float flowLength;
};

__device__ float getPercolation(const Aquifer* aq,
                                 const GWaterData* gw)
{
    if (gw->upperMoist <= aq->fieldCap) return 0.0f;
    float theta = gw->upperMoist / aq->porosity;
    if (theta > 1.0f) theta = 1.0f;
    return aq->ks * powf(theta, aq->percExp);
}

__device__ float getLateralFlow(const Aquifer* aq,
                                 const GWaterData* gw)
{
    if (gw->flowLength <= 0.0f) return 0.0f;
    float dh = gw->waterTable - gw->nodeElev;
    return gw->area * aq->ks * dh / gw->flowLength;
}

__global__ void updateWaterTableKernel(
    Aquifer* aquifers, GWaterData* gwData,
    float* infil, float* et, float dt, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    Aquifer aq = aquifers[idx];
    GWaterData gw = gwData[idx];

    float perc = getPercolation(&aq, &gw);
    float qLat = getLateralFlow(&aq, &gw);

    gw.upperMoist += (infil[idx] - perc - et[idx]) * dt
                     / (gw.area * aq.porosity);
    gw.upperMoist = fmaxf(0.0f,
        fminf(gw.upperMoist, aq.porosity));

    float dh = (perc * gw.area - qLat) * dt
               / (gw.area * aq.porosity);
    gw.waterTable += dh;

    gwData[idx] = gw;
}`,
    wasm: `;; gwater.wat — Groundwater Flow
;; SWMM5 Engine in WebAssembly — Two-Zone Groundwater Model
;; Models unsaturated/saturated zones beneath each
;; subcatchment with Darcy lateral flow to drainage network

(module
  (func $getPercolation
    (param $upper_moist f64) (param $porosity f64)
    (param $field_cap f64) (param $ks f64)
    (param $perc_exp f64)
    (result f64)
    (local $theta f64)
    (if (result f64) (f64.le (local.get $upper_moist)
                              (local.get $field_cap))
      (then (f64.const 0.0))
      (else
        (local.set $theta
          (f64.div (local.get $upper_moist)
                   (local.get $porosity)))
        (if (f64.gt (local.get $theta) (f64.const 1.0))
          (then (local.set $theta (f64.const 1.0))))
        (f64.mul (local.get $ks)
          (call $pow (local.get $theta)
                     (local.get $perc_exp))))))

  (func $getLateralFlow
    (param $water_table f64) (param $node_elev f64)
    (param $area f64) (param $ks f64)
    (param $flow_length f64)
    (result f64)
    (if (result f64) (f64.le (local.get $flow_length)
                              (f64.const 0.0))
      (then (f64.const 0.0))
      (else
        (f64.div
          (f64.mul
            (f64.mul (local.get $area) (local.get $ks))
            (f64.sub (local.get $water_table)
                     (local.get $node_elev)))
          (local.get $flow_length)))))

  (func $pow (param f64) (param f64) (result f64)
    f64.const 1.0)
)`,
    mojo: `# gwater.mojo — Groundwater Flow
# SWMM5 Engine in Mojo — Two-Zone Groundwater Model
# Models unsaturated/saturated zones beneath each
# subcatchment with Darcy lateral flow to drainage network

from math import pow, min, max

struct Aquifer:
    var ks: Float64
    var porosity: Float64
    var field_cap: Float64
    var perc_exp: Float64

    fn __init__(inout self, ks: Float64, porosity: Float64,
                field_cap: Float64, perc_exp: Float64):
        self.ks = ks
        self.porosity = porosity
        self.field_cap = field_cap
        self.perc_exp = perc_exp

struct GWater:
    var upper_moist: Float64
    var water_table: Float64
    var area: Float64
    var node_elev: Float64
    var flow_length: Float64

    fn __init__(inout self, upper_moist: Float64,
                water_table: Float64, area: Float64,
                node_elev: Float64,
                flow_length: Float64):
        self.upper_moist = upper_moist
        self.water_table = water_table
        self.area = area
        self.node_elev = node_elev
        self.flow_length = flow_length

    fn get_percolation(self, aq: Aquifer) -> Float64:
        if self.upper_moist <= aq.field_cap:
            return 0.0
        var theta = self.upper_moist / aq.porosity
        if theta > 1.0:
            theta = 1.0
        return aq.ks * pow(theta, aq.perc_exp)

    fn get_lateral_flow(self, aq: Aquifer) -> Float64:
        if self.flow_length <= 0.0:
            return 0.0
        let dh = self.water_table - self.node_elev
        return self.area * aq.ks * dh / self.flow_length

    fn update_water_table(inout self, aq: Aquifer,
                          infil: Float64, et: Float64,
                          dt: Float64):
        let perc = self.get_percolation(aq)
        let q_lat = self.get_lateral_flow(aq)

        self.upper_moist += (infil - perc - et) * dt / (
            self.area * aq.porosity)
        self.upper_moist = max(
            0.0, min(self.upper_moist, aq.porosity))

        let dh = (perc * self.area - q_lat) * dt / (
            self.area * aq.porosity)
        self.water_table += dh`,
    java: `// GWater.java — Groundwater Flow
// SWMM5 Engine in Java — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

package swmm;

public class GWater {

    public static class Aquifer {
        public final double ks;
        public final double porosity;
        public final double fieldCap;
        public final double percExp;

        public Aquifer(double ks, double porosity,
                       double fieldCap, double percExp) {
            this.ks = ks;
            this.porosity = porosity;
            this.fieldCap = fieldCap;
            this.percExp = percExp;
        }
    }

    private double upperMoist;
    private double waterTable;
    private final double area;
    private final double nodeElev;
    private final double flowLength;

    public GWater(double upperMoist, double waterTable,
                  double area, double nodeElev,
                  double flowLength) {
        this.upperMoist = upperMoist;
        this.waterTable = waterTable;
        this.area = area;
        this.nodeElev = nodeElev;
        this.flowLength = flowLength;
    }

    public double getPercolation(Aquifer aq) {
        if (upperMoist <= aq.fieldCap) return 0.0;
        double theta = Math.min(
            upperMoist / aq.porosity, 1.0);
        return aq.ks * Math.pow(theta, aq.percExp);
    }

    public double getLateralFlow(Aquifer aq) {
        if (flowLength <= 0.0) return 0.0;
        double dh = waterTable - nodeElev;
        return area * aq.ks * dh / flowLength;
    }

    public void updateWaterTable(Aquifer aq,
        double infil, double et, double dt) {
        double perc = getPercolation(aq);
        double qLat = getLateralFlow(aq);

        upperMoist += (infil - perc - et) * dt
                      / (area * aq.porosity);
        upperMoist = Math.max(0.0,
            Math.min(upperMoist, aq.porosity));

        double dh = (perc * area - qLat) * dt
                    / (area * aq.porosity);
        waterTable += dh;
    }

    public double getUpperMoist() { return upperMoist; }
    public double getWaterTable() { return waterTable; }
}`,
    nim: `# gwater.nim — Groundwater Flow
# SWMM5 Engine in Nim — Two-Zone Groundwater Model
# Models unsaturated/saturated zones beneath each
# subcatchment with Darcy lateral flow to drainage network

import math

type
  Aquifer = object
    ks: float64
    porosity: float64
    fieldCap: float64
    percExp: float64

  GWater = object
    upperMoist: float64
    waterTable: float64
    area: float64
    nodeElev: float64
    flowLength: float64

proc getPercolation(gw: GWater, aq: Aquifer): float64 =
  if gw.upperMoist <= aq.fieldCap:
    return 0.0
  var theta = gw.upperMoist / aq.porosity
  if theta > 1.0: theta = 1.0
  result = aq.ks * pow(theta, aq.percExp)

proc getLateralFlow(gw: GWater, aq: Aquifer): float64 =
  if gw.flowLength <= 0.0:
    return 0.0
  let dh = gw.waterTable - gw.nodeElev
  result = gw.area * aq.ks * dh / gw.flowLength

proc updateWaterTable(gw: var GWater, aq: Aquifer,
                       infil, et, dt: float64) =
  let perc = gw.getPercolation(aq)
  let qLat = gw.getLateralFlow(aq)

  gw.upperMoist += (infil - perc - et) * dt /
                   (gw.area * aq.porosity)
  gw.upperMoist = max(0.0, min(gw.upperMoist, aq.porosity))

  let dh = (perc * gw.area - qLat) * dt /
           (gw.area * aq.porosity)
  gw.waterTable += dh`,
    ada: `-- gwater.adb — Groundwater Flow
-- SWMM5 Engine in Ada — Two-Zone Groundwater Model
-- Models unsaturated/saturated zones beneath each
-- subcatchment with Darcy lateral flow to drainage network

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body GWater_Pkg is

   type Aquifer is record
      Ks        : Long_Float;
      Porosity  : Long_Float;
      Field_Cap : Long_Float;
      Perc_Exp  : Long_Float;
   end record;

   type GWater is record
      Upper_Moist : Long_Float;
      Water_Table : Long_Float;
      Area        : Long_Float;
      Node_Elev   : Long_Float;
      Flow_Length  : Long_Float;
   end record;

   function Get_Percolation
     (Aq : Aquifer; GW : GWater) return Long_Float
   is
      Theta : Long_Float;
   begin
      if GW.Upper_Moist <= Aq.Field_Cap then
         return 0.0;
      end if;
      Theta := GW.Upper_Moist / Aq.Porosity;
      if Theta > 1.0 then
         Theta := 1.0;
      end if;
      return Aq.Ks * (Theta ** Aq.Perc_Exp);
   end Get_Percolation;

   function Get_Lateral_Flow
     (Aq : Aquifer; GW : GWater) return Long_Float
   is
      Dh : Long_Float;
   begin
      if GW.Flow_Length <= 0.0 then
         return 0.0;
      end if;
      Dh := GW.Water_Table - GW.Node_Elev;
      return GW.Area * Aq.Ks * Dh / GW.Flow_Length;
   end Get_Lateral_Flow;

   procedure Update_Water_Table
     (Aq    : Aquifer;
      GW    : in out GWater;
      Infil : Long_Float;
      ET    : Long_Float;
      Dt    : Long_Float)
   is
      Perc, Q_Lat, Dh : Long_Float;
   begin
      Perc  := Get_Percolation(Aq, GW);
      Q_Lat := Get_Lateral_Flow(Aq, GW);

      GW.Upper_Moist := GW.Upper_Moist
         + (Infil - Perc - ET) * Dt
         / (GW.Area * Aq.Porosity);
      if GW.Upper_Moist < 0.0 then
         GW.Upper_Moist := 0.0;
      elsif GW.Upper_Moist > Aq.Porosity then
         GW.Upper_Moist := Aq.Porosity;
      end if;

      Dh := (Perc * GW.Area - Q_Lat) * Dt
            / (GW.Area * Aq.Porosity);
      GW.Water_Table := GW.Water_Table + Dh;
   end Update_Water_Table;

end GWater_Pkg;`,
    chapel: `// gwater.chpl — Groundwater Flow
// SWMM5 Engine in Chapel — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

record Aquifer {
    var ks: real;
    var porosity: real;
    var fieldCap: real;
    var percExp: real;
}

record GWater {
    var upperMoist: real;
    var waterTable: real;
    var area: real;
    var nodeElev: real;
    var flowLength: real;
}

proc getPercolation(const ref aq: Aquifer,
                    const ref gw: GWater): real {
    if gw.upperMoist <= aq.fieldCap then return 0.0;
    var theta = min(gw.upperMoist / aq.porosity, 1.0);
    return aq.ks * theta**aq.percExp;
}

proc getLateralFlow(const ref aq: Aquifer,
                    const ref gw: GWater): real {
    if gw.flowLength <= 0.0 then return 0.0;
    var dh = gw.waterTable - gw.nodeElev;
    return gw.area * aq.ks * dh / gw.flowLength;
}

proc updateWaterTable(const ref aq: Aquifer,
                      ref gw: GWater,
                      infil: real, et: real,
                      dt: real) {
    var perc = getPercolation(aq, gw);
    var qLat = getLateralFlow(aq, gw);

    gw.upperMoist += (infil - perc - et) * dt
                     / (gw.area * aq.porosity);
    gw.upperMoist = max(0.0,
        min(gw.upperMoist, aq.porosity));

    var dh = (perc * gw.area - qLat) * dt
             / (gw.area * aq.porosity);
    gw.waterTable += dh;
}`,
    swift: `// gwater.swift — Groundwater Flow
// SWMM5 Engine in Swift — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

import Foundation

struct Aquifer {
    let ks: Double
    let porosity: Double
    let fieldCap: Double
    let percExp: Double
}

struct GWater {
    var upperMoist: Double
    var waterTable: Double
    let area: Double
    let nodeElev: Double
    let flowLength: Double

    func getPercolation(_ aq: Aquifer) -> Double {
        guard upperMoist > aq.fieldCap else { return 0.0 }
        let theta = min(upperMoist / aq.porosity, 1.0)
        return aq.ks * pow(theta, aq.percExp)
    }

    func getLateralFlow(_ aq: Aquifer) -> Double {
        guard flowLength > 0.0 else { return 0.0 }
        let dh = waterTable - nodeElev
        return area * aq.ks * dh / flowLength
    }

    mutating func updateWaterTable(_ aq: Aquifer,
                                    infil: Double,
                                    et: Double,
                                    dt: Double) {
        let perc = getPercolation(aq)
        let qLat = getLateralFlow(aq)

        upperMoist += (infil - perc - et) * dt
                      / (area * aq.porosity)
        upperMoist = max(0.0,
                     min(upperMoist, aq.porosity))

        let dh = (perc * area - qLat) * dt
                 / (area * aq.porosity)
        waterTable += dh
    }
}`,
    kotlin: `// GWater.kt — Groundwater Flow
// SWMM5 Engine in Kotlin — Two-Zone Groundwater Model
// Models unsaturated/saturated zones beneath each
// subcatchment with Darcy lateral flow to drainage network

package swmm

import kotlin.math.*

data class Aquifer(
    val ks: Double,
    val porosity: Double,
    val fieldCap: Double,
    val percExp: Double
)

data class GWater(
    var upperMoist: Double,
    var waterTable: Double,
    val area: Double,
    val nodeElev: Double,
    val flowLength: Double
) {
    fun getPercolation(aq: Aquifer): Double {
        if (upperMoist <= aq.fieldCap) return 0.0
        val theta = min(upperMoist / aq.porosity, 1.0)
        return aq.ks * theta.pow(aq.percExp)
    }

    fun getLateralFlow(aq: Aquifer): Double {
        if (flowLength <= 0.0) return 0.0
        val dh = waterTable - nodeElev
        return area * aq.ks * dh / flowLength
    }

    fun updateWaterTable(aq: Aquifer, infil: Double,
                         et: Double, dt: Double) {
        val perc = getPercolation(aq)
        val qLat = getLateralFlow(aq)

        upperMoist += (infil - perc - et) * dt /
                      (area * aq.porosity)
        upperMoist = max(0.0,
            min(upperMoist, aq.porosity))

        val dh = (perc * area - qLat) * dt /
                 (area * aq.porosity)
        waterTable += dh
    }
}`,
  },

  "xsect.c — Cross-Section Geometry": {
    category: "Hydraulics",
    difficulty: "intermediate",
    tags: ["cross-section", "geometry", "circular", "area", "hydraulic radius", "wetted perimeter", "depth"],
    description: "Computes geometric properties (area, hydraulic radius, wetted perimeter, top width) for various cross-section shapes. The circular pipe is the most common — area and hydraulic radius are computed from the central angle θ using A = D²/4·(θ - sinθ) and R = D/4·(1 - sinθ/θ). Also provides inverse lookups (depth from area, area from section factor) used throughout the hydraulic solver.",
    equations: "A = D²/4·(θ - sinθ); R = D/4·(1 - sinθ/θ); S = A·R^(2/3) (section factor); θ = 2·acos(1 - 2y/D)",
    inputs: "Cross-section shape, diameter/dimensions, depth or area",
    outputs: "Area, hydraulic radius, top width, section factor, wetted perimeter",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// xsect.c — Cross-Section Geometry
// EPA SWMM5 Engine — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

#include <math.h>

#define CIRCULAR 1

typedef struct {
    int    type;       // shape type (CIRCULAR, etc.)
    double diameter;   // pipe diameter (ft)
} TXsect;

double xsect_getTheta(double depth, double diameter)
{
    double yNorm;
    if (depth <= 0.0) return 0.0;
    if (depth >= diameter) return 2.0 * M_PI;
    yNorm = depth / diameter;
    return 2.0 * acos(1.0 - 2.0 * yNorm);
}

double xsect_getArea(TXsect* x, double depth)
{
    double theta, d;
    if (depth <= 0.0) return 0.0;
    d = x->diameter;
    if (depth >= d)
        return M_PI / 4.0 * d * d;
    theta = xsect_getTheta(depth, d);
    return (d * d / 4.0) * (theta - sin(theta));
}

double xsect_getWettedPerimeter(TXsect* x, double depth)
{
    double theta;
    if (depth <= 0.0) return 0.0;
    if (depth >= x->diameter)
        return M_PI * x->diameter;
    theta = xsect_getTheta(depth, x->diameter);
    return 0.5 * x->diameter * theta;
}

double xsect_getHydRadius(TXsect* x, double depth)
{
    double area, wp;
    area = xsect_getArea(x, depth);
    wp = xsect_getWettedPerimeter(x, depth);
    if (wp <= 0.0) return 0.0;
    return area / wp;
}

double xsect_getWidth(TXsect* x, double depth)
{
    if (depth <= 0.0 || depth >= x->diameter)
        return 0.0;
    return x->diameter
           * sin(xsect_getTheta(depth, x->diameter) / 2.0);
}

double xsect_getSectionFactor(TXsect* x, double depth)
{
    double area, rh;
    area = xsect_getArea(x, depth);
    rh = xsect_getHydRadius(x, depth);
    return area * pow(rh, 2.0 / 3.0);
}`,
    rust: `// xsect.rs — Cross-Section Geometry
// SWMM5 Engine in Rust — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

use std::f64::consts::PI;

pub struct Xsect {
    pub shape: u32,
    pub diameter: f64,
}

impl Xsect {
    fn get_theta(depth: f64, diameter: f64) -> f64 {
        if depth <= 0.0 { return 0.0; }
        if depth >= diameter { return 2.0 * PI; }
        let y_norm = depth / diameter;
        2.0 * (1.0 - 2.0 * y_norm).acos()
    }

    pub fn get_area(&self, depth: f64) -> f64 {
        if depth <= 0.0 { return 0.0; }
        let d = self.diameter;
        if depth >= d {
            return PI / 4.0 * d * d;
        }
        let theta = Self::get_theta(depth, d);
        (d * d / 4.0) * (theta - theta.sin())
    }

    pub fn get_wetted_perimeter(&self, depth: f64) -> f64 {
        if depth <= 0.0 { return 0.0; }
        if depth >= self.diameter {
            return PI * self.diameter;
        }
        let theta = Self::get_theta(depth, self.diameter);
        0.5 * self.diameter * theta
    }

    pub fn get_hyd_radius(&self, depth: f64) -> f64 {
        let area = self.get_area(depth);
        let wp = self.get_wetted_perimeter(depth);
        if wp <= 0.0 { return 0.0; }
        area / wp
    }

    pub fn get_width(&self, depth: f64) -> f64 {
        if depth <= 0.0 || depth >= self.diameter {
            return 0.0;
        }
        let theta = Self::get_theta(depth, self.diameter);
        self.diameter * (theta / 2.0).sin()
    }

    pub fn get_section_factor(&self, depth: f64) -> f64 {
        let area = self.get_area(depth);
        let rh = self.get_hyd_radius(depth);
        area * rh.powf(2.0 / 3.0)
    }
}`,
    python: `# xsect.py — Cross-Section Geometry
# SWMM5 Engine in Python — Circular Pipe Geometry
# Computes area, hydraulic radius, top width,
# and section factor from depth for circular pipes

import math
from dataclasses import dataclass

CIRCULAR = 1

@dataclass
class Xsect:
    shape: int
    diameter: float

    @staticmethod
    def _get_theta(depth: float, diameter: float) -> float:
        if depth <= 0.0:
            return 0.0
        if depth >= diameter:
            return 2.0 * math.pi
        y_norm = depth / diameter
        return 2.0 * math.acos(1.0 - 2.0 * y_norm)

    def get_area(self, depth: float) -> float:
        if depth <= 0.0:
            return 0.0
        d = self.diameter
        if depth >= d:
            return math.pi / 4.0 * d * d
        theta = self._get_theta(depth, d)
        return (d * d / 4.0) * (theta - math.sin(theta))

    def get_wetted_perimeter(self, depth: float) -> float:
        if depth <= 0.0:
            return 0.0
        if depth >= self.diameter:
            return math.pi * self.diameter
        theta = self._get_theta(depth, self.diameter)
        return 0.5 * self.diameter * theta

    def get_hyd_radius(self, depth: float) -> float:
        area = self.get_area(depth)
        wp = self.get_wetted_perimeter(depth)
        if wp <= 0.0:
            return 0.0
        return area / wp

    def get_width(self, depth: float) -> float:
        if depth <= 0.0 or depth >= self.diameter:
            return 0.0
        theta = self._get_theta(depth, self.diameter)
        return self.diameter * math.sin(theta / 2.0)

    def get_section_factor(self, depth: float) -> float:
        area = self.get_area(depth)
        rh = self.get_hyd_radius(depth)
        return area * rh ** (2.0 / 3.0)`,
    fortran: `! xsect.f90 — Cross-Section Geometry
! SWMM5 Engine in Fortran — Circular Pipe Geometry
! Computes area, hydraulic radius, top width,
! and section factor from depth for circular pipes

module xsect_module
    implicit none
    integer, parameter :: CIRCULAR = 1
    real(8), parameter :: PI = 3.14159265358979d0

    type :: Xsect
        integer :: shape
        real(8) :: diameter
    end type Xsect

contains

    function get_theta(depth, diameter) result(theta)
        real(8), intent(in) :: depth, diameter
        real(8) :: theta, y_norm
        if (depth <= 0.0d0) then
            theta = 0.0d0; return
        end if
        if (depth >= diameter) then
            theta = 2.0d0 * PI; return
        end if
        y_norm = depth / diameter
        theta = 2.0d0 * acos(1.0d0 - 2.0d0 * y_norm)
    end function get_theta

    function xsect_get_area(x, depth) result(area)
        type(Xsect), intent(in) :: x
        real(8), intent(in) :: depth
        real(8) :: area, theta, d
        if (depth <= 0.0d0) then
            area = 0.0d0; return
        end if
        d = x%diameter
        if (depth >= d) then
            area = PI / 4.0d0 * d * d; return
        end if
        theta = get_theta(depth, d)
        area = (d * d / 4.0d0) * (theta - sin(theta))
    end function xsect_get_area

    function xsect_get_wetted_perimeter(x, depth) result(wp)
        type(Xsect), intent(in) :: x
        real(8), intent(in) :: depth
        real(8) :: wp, theta
        if (depth <= 0.0d0) then
            wp = 0.0d0; return
        end if
        if (depth >= x%diameter) then
            wp = PI * x%diameter; return
        end if
        theta = get_theta(depth, x%diameter)
        wp = 0.5d0 * x%diameter * theta
    end function xsect_get_wetted_perimeter

    function xsect_get_hyd_radius(x, depth) result(rh)
        type(Xsect), intent(in) :: x
        real(8), intent(in) :: depth
        real(8) :: rh, area, wp
        area = xsect_get_area(x, depth)
        wp = xsect_get_wetted_perimeter(x, depth)
        if (wp <= 0.0d0) then
            rh = 0.0d0; return
        end if
        rh = area / wp
    end function xsect_get_hyd_radius

    function xsect_get_width(x, depth) result(w)
        type(Xsect), intent(in) :: x
        real(8), intent(in) :: depth
        real(8) :: w, theta
        if (depth <= 0.0d0 .or. depth >= x%diameter) then
            w = 0.0d0; return
        end if
        theta = get_theta(depth, x%diameter)
        w = x%diameter * sin(theta / 2.0d0)
    end function xsect_get_width

    function xsect_get_section_factor(x, depth) result(sf)
        type(Xsect), intent(in) :: x
        real(8), intent(in) :: depth
        real(8) :: sf, area, rh
        area = xsect_get_area(x, depth)
        rh = xsect_get_hyd_radius(x, depth)
        sf = area * rh**(2.0d0 / 3.0d0)
    end function xsect_get_section_factor

end module xsect_module`,
    julia: `# xsect.jl — Cross-Section Geometry
# SWMM5 Engine in Julia — Circular Pipe Geometry
# Computes area, hydraulic radius, top width,
# and section factor from depth for circular pipes

const CIRCULAR = 1

mutable struct Xsect
    shape::Int
    diameter::Float64
end

function get_theta(depth::Float64, diameter::Float64)::Float64
    depth <= 0.0 && return 0.0
    depth >= diameter && return 2.0 * π
    y_norm = depth / diameter
    return 2.0 * acos(1.0 - 2.0 * y_norm)
end

function get_area(x::Xsect, depth::Float64)::Float64
    depth <= 0.0 && return 0.0
    d = x.diameter
    depth >= d && return π / 4.0 * d * d
    θ = get_theta(depth, d)
    return (d * d / 4.0) * (θ - sin(θ))
end

function get_wetted_perimeter(x::Xsect, depth::Float64)::Float64
    depth <= 0.0 && return 0.0
    depth >= x.diameter && return π * x.diameter
    θ = get_theta(depth, x.diameter)
    return 0.5 * x.diameter * θ
end

function get_hyd_radius(x::Xsect, depth::Float64)::Float64
    area = get_area(x, depth)
    wp = get_wetted_perimeter(x, depth)
    wp <= 0.0 && return 0.0
    return area / wp
end

function get_width(x::Xsect, depth::Float64)::Float64
    (depth <= 0.0 || depth >= x.diameter) && return 0.0
    θ = get_theta(depth, x.diameter)
    return x.diameter * sin(θ / 2.0)
end

function get_section_factor(x::Xsect, depth::Float64)::Float64
    area = get_area(x, depth)
    rh = get_hyd_radius(x, depth)
    return area * rh^(2.0 / 3.0)
end`,
    javascript: `// xsect.js — Cross-Section Geometry
// SWMM5 Engine in JavaScript — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

const CIRCULAR = 1;

class Xsect {
    constructor(shape, diameter) {
        this.shape = shape;
        this.diameter = diameter;
    }

    static getTheta(depth, diameter) {
        if (depth <= 0.0) return 0.0;
        if (depth >= diameter) return 2.0 * Math.PI;
        const yNorm = depth / diameter;
        return 2.0 * Math.acos(1.0 - 2.0 * yNorm);
    }

    getArea(depth) {
        if (depth <= 0.0) return 0.0;
        const d = this.diameter;
        if (depth >= d)
            return Math.PI / 4.0 * d * d;
        const theta = Xsect.getTheta(depth, d);
        return (d * d / 4.0) * (theta - Math.sin(theta));
    }

    getWettedPerimeter(depth) {
        if (depth <= 0.0) return 0.0;
        if (depth >= this.diameter)
            return Math.PI * this.diameter;
        const theta = Xsect.getTheta(depth, this.diameter);
        return 0.5 * this.diameter * theta;
    }

    getHydRadius(depth) {
        const area = this.getArea(depth);
        const wp = this.getWettedPerimeter(depth);
        if (wp <= 0.0) return 0.0;
        return area / wp;
    }

    getWidth(depth) {
        if (depth <= 0.0 || depth >= this.diameter)
            return 0.0;
        const theta = Xsect.getTheta(depth, this.diameter);
        return this.diameter * Math.sin(theta / 2.0);
    }

    getSectionFactor(depth) {
        const area = this.getArea(depth);
        const rh = this.getHydRadius(depth);
        return area * Math.pow(rh, 2.0 / 3.0);
    }
}

export { Xsect, CIRCULAR };`,
    go: `// xsect.go — Cross-Section Geometry
// SWMM5 Engine in Go — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

package swmm

import "math"

const Circular = 1

type Xsect struct {
    Shape    int
    Diameter float64
}

func getTheta(depth, diameter float64) float64 {
    if depth <= 0.0 {
        return 0.0
    }
    if depth >= diameter {
        return 2.0 * math.Pi
    }
    yNorm := depth / diameter
    return 2.0 * math.Acos(1.0-2.0*yNorm)
}

func (x *Xsect) GetArea(depth float64) float64 {
    if depth <= 0.0 {
        return 0.0
    }
    d := x.Diameter
    if depth >= d {
        return math.Pi / 4.0 * d * d
    }
    theta := getTheta(depth, d)
    return (d * d / 4.0) * (theta - math.Sin(theta))
}

func (x *Xsect) GetWettedPerimeter(depth float64) float64 {
    if depth <= 0.0 {
        return 0.0
    }
    if depth >= x.Diameter {
        return math.Pi * x.Diameter
    }
    theta := getTheta(depth, x.Diameter)
    return 0.5 * x.Diameter * theta
}

func (x *Xsect) GetHydRadius(depth float64) float64 {
    area := x.GetArea(depth)
    wp := x.GetWettedPerimeter(depth)
    if wp <= 0.0 {
        return 0.0
    }
    return area / wp
}

func (x *Xsect) GetWidth(depth float64) float64 {
    if depth <= 0.0 || depth >= x.Diameter {
        return 0.0
    }
    theta := getTheta(depth, x.Diameter)
    return x.Diameter * math.Sin(theta/2.0)
}

func (x *Xsect) GetSectionFactor(depth float64) float64 {
    area := x.GetArea(depth)
    rh := x.GetHydRadius(depth)
    return area * math.Pow(rh, 2.0/3.0)
}`,
    zig: `// xsect.zig — Cross-Section Geometry
// SWMM5 Engine in Zig — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

const std = @import("std");
const math = std.math;

const CIRCULAR: u32 = 1;

const Xsect = struct {
    shape: u32,
    diameter: f64,

    fn getTheta(depth: f64, diameter: f64) f64 {
        if (depth <= 0.0) return 0.0;
        if (depth >= diameter) return 2.0 * math.pi;
        const y_norm = depth / diameter;
        return 2.0 * math.acos(1.0 - 2.0 * y_norm);
    }

    pub fn getArea(self: Xsect, depth: f64) f64 {
        if (depth <= 0.0) return 0.0;
        const d = self.diameter;
        if (depth >= d)
            return math.pi / 4.0 * d * d;
        const theta = getTheta(depth, d);
        return (d * d / 4.0) * (theta - @sin(theta));
    }

    pub fn getWettedPerimeter(self: Xsect, depth: f64) f64 {
        if (depth <= 0.0) return 0.0;
        if (depth >= self.diameter)
            return math.pi * self.diameter;
        const theta = getTheta(depth, self.diameter);
        return 0.5 * self.diameter * theta;
    }

    pub fn getHydRadius(self: Xsect, depth: f64) f64 {
        const area = self.getArea(depth);
        const wp = self.getWettedPerimeter(depth);
        if (wp <= 0.0) return 0.0;
        return area / wp;
    }

    pub fn getWidth(self: Xsect, depth: f64) f64 {
        if (depth <= 0.0 or depth >= self.diameter)
            return 0.0;
        const theta = getTheta(depth, self.diameter);
        return self.diameter * @sin(theta / 2.0);
    }

    pub fn getSectionFactor(self: Xsect, depth: f64) f64 {
        const area = self.getArea(depth);
        const rh = self.getHydRadius(depth);
        return area * math.pow(f64, rh, 2.0 / 3.0);
    }
};`,
    cpp: `// xsect.cpp — Cross-Section Geometry
// SWMM5 Engine in C++ — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

#include <cmath>

namespace swmm {

constexpr int CIRCULAR = 1;

struct Xsect {
    int    shape;
    double diameter;

    static double getTheta(double depth, double diameter) {
        if (depth <= 0.0) return 0.0;
        if (depth >= diameter) return 2.0 * M_PI;
        double yNorm = depth / diameter;
        return 2.0 * std::acos(1.0 - 2.0 * yNorm);
    }

    double getArea(double depth) const {
        if (depth <= 0.0) return 0.0;
        double d = diameter;
        if (depth >= d)
            return M_PI / 4.0 * d * d;
        double theta = getTheta(depth, d);
        return (d * d / 4.0) * (theta - std::sin(theta));
    }

    double getWettedPerimeter(double depth) const {
        if (depth <= 0.0) return 0.0;
        if (depth >= diameter)
            return M_PI * diameter;
        double theta = getTheta(depth, diameter);
        return 0.5 * diameter * theta;
    }

    double getHydRadius(double depth) const {
        double area = getArea(depth);
        double wp = getWettedPerimeter(depth);
        if (wp <= 0.0) return 0.0;
        return area / wp;
    }

    double getWidth(double depth) const {
        if (depth <= 0.0 || depth >= diameter)
            return 0.0;
        double theta = getTheta(depth, diameter);
        return diameter * std::sin(theta / 2.0);
    }

    double getSectionFactor(double depth) const {
        double area = getArea(depth);
        double rh = getHydRadius(depth);
        return area * std::pow(rh, 2.0 / 3.0);
    }
};

} // namespace swmm`,
    csharp: `// Xsect.cs — Cross-Section Geometry
// SWMM5 Engine in C# — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

using System;

namespace Swmm
{
    public class Xsect
    {
        public int Shape { get; set; }
        public double Diameter { get; set; }

        public const int Circular = 1;

        public Xsect(int shape, double diameter)
        {
            Shape = shape;
            Diameter = diameter;
        }

        private static double GetTheta(double depth,
                                        double diameter)
        {
            if (depth <= 0.0) return 0.0;
            if (depth >= diameter) return 2.0 * Math.PI;
            double yNorm = depth / diameter;
            return 2.0 * Math.Acos(1.0 - 2.0 * yNorm);
        }

        public double GetArea(double depth)
        {
            if (depth <= 0.0) return 0.0;
            double d = Diameter;
            if (depth >= d)
                return Math.PI / 4.0 * d * d;
            double theta = GetTheta(depth, d);
            return (d * d / 4.0) * (theta - Math.Sin(theta));
        }

        public double GetWettedPerimeter(double depth)
        {
            if (depth <= 0.0) return 0.0;
            if (depth >= Diameter)
                return Math.PI * Diameter;
            double theta = GetTheta(depth, Diameter);
            return 0.5 * Diameter * theta;
        }

        public double GetHydRadius(double depth)
        {
            double area = GetArea(depth);
            double wp = GetWettedPerimeter(depth);
            if (wp <= 0.0) return 0.0;
            return area / wp;
        }

        public double GetWidth(double depth)
        {
            if (depth <= 0.0 || depth >= Diameter)
                return 0.0;
            double theta = GetTheta(depth, Diameter);
            return Diameter * Math.Sin(theta / 2.0);
        }

        public double GetSectionFactor(double depth)
        {
            double area = GetArea(depth);
            double rh = GetHydRadius(depth);
            return area * Math.Pow(rh, 2.0 / 3.0);
        }
    }
}`,
    matlab: `% xsect.m — Cross-Section Geometry
% SWMM5 Engine in MATLAB — Circular Pipe Geometry
% Computes area, hydraulic radius, top width,
% and section factor from depth for circular pipes

function xs = create_xsect(shape, diameter)
    xs.shape    = shape;
    xs.diameter = diameter;
end

function theta = get_theta(depth, diameter)
    if depth <= 0.0
        theta = 0.0; return;
    end
    if depth >= diameter
        theta = 2.0 * pi; return;
    end
    y_norm = depth / diameter;
    theta = 2.0 * acos(1.0 - 2.0 * y_norm);
end

function area = get_area(xs, depth)
    if depth <= 0.0
        area = 0.0; return;
    end
    d = xs.diameter;
    if depth >= d
        area = pi / 4.0 * d * d; return;
    end
    theta = get_theta(depth, d);
    area = (d * d / 4.0) * (theta - sin(theta));
end

function wp = get_wetted_perimeter(xs, depth)
    if depth <= 0.0
        wp = 0.0; return;
    end
    if depth >= xs.diameter
        wp = pi * xs.diameter; return;
    end
    theta = get_theta(depth, xs.diameter);
    wp = 0.5 * xs.diameter * theta;
end

function rh = get_hyd_radius(xs, depth)
    area = get_area(xs, depth);
    wp = get_wetted_perimeter(xs, depth);
    if wp <= 0.0
        rh = 0.0; return;
    end
    rh = area / wp;
end

function w = get_width(xs, depth)
    if depth <= 0.0 || depth >= xs.diameter
        w = 0.0; return;
    end
    theta = get_theta(depth, xs.diameter);
    w = xs.diameter * sin(theta / 2.0);
end

function sf = get_section_factor(xs, depth)
    area = get_area(xs, depth);
    rh = get_hyd_radius(xs, depth);
    sf = area * rh^(2.0 / 3.0);
end`,
    r: `# xsect.R — Cross-Section Geometry
# SWMM5 Engine in R — Circular Pipe Geometry
# Computes area, hydraulic radius, top width,
# and section factor from depth for circular pipes

CIRCULAR <- 1

create_xsect <- function(shape, diameter) {
    list(shape = shape, diameter = diameter)
}

get_theta <- function(depth, diameter) {
    if (depth <= 0.0) return(0.0)
    if (depth >= diameter) return(2.0 * pi)
    y_norm <- depth / diameter
    2.0 * acos(1.0 - 2.0 * y_norm)
}

get_area <- function(xs, depth) {
    if (depth <= 0.0) return(0.0)
    d <- xs$diameter
    if (depth >= d) return(pi / 4.0 * d * d)
    theta <- get_theta(depth, d)
    (d * d / 4.0) * (theta - sin(theta))
}

get_wetted_perimeter <- function(xs, depth) {
    if (depth <= 0.0) return(0.0)
    if (depth >= xs$diameter) return(pi * xs$diameter)
    theta <- get_theta(depth, xs$diameter)
    0.5 * xs$diameter * theta
}

get_hyd_radius <- function(xs, depth) {
    area <- get_area(xs, depth)
    wp <- get_wetted_perimeter(xs, depth)
    if (wp <= 0.0) return(0.0)
    area / wp
}

get_width <- function(xs, depth) {
    if (depth <= 0.0 || depth >= xs$diameter) return(0.0)
    theta <- get_theta(depth, xs$diameter)
    xs$diameter * sin(theta / 2.0)
}

get_section_factor <- function(xs, depth) {
    area <- get_area(xs, depth)
    rh <- get_hyd_radius(xs, depth)
    area * rh^(2.0 / 3.0)
}`,
    delphi: `{ xsect.pas — Cross-Section Geometry }
{ SWMM5 Engine in Delphi — Circular Pipe Geometry }
{ Computes area, hydraulic radius, top width, }
{ and section factor from depth for circular pipes }

unit Xsect;

interface

const
  CIRCULAR = 1;

type
  TXsect = class
  private
    FShape: Integer;
    FDiameter: Double;
  public
    constructor Create(AShape: Integer;
                       ADiameter: Double);
    function GetTheta(Depth: Double): Double;
    function GetArea(Depth: Double): Double;
    function GetWettedPerimeter(Depth: Double): Double;
    function GetHydRadius(Depth: Double): Double;
    function GetWidth(Depth: Double): Double;
    function GetSectionFactor(Depth: Double): Double;
  end;

implementation

uses Math;

constructor TXsect.Create(AShape: Integer;
                           ADiameter: Double);
begin
  FShape    := AShape;
  FDiameter := ADiameter;
end;

function TXsect.GetTheta(Depth: Double): Double;
begin
  if Depth <= 0.0 then Exit(0.0);
  if Depth >= FDiameter then Exit(2.0 * Pi);
  Result := 2.0 * ArcCos(1.0 - 2.0 * Depth / FDiameter);
end;

function TXsect.GetArea(Depth: Double): Double;
var
  Theta: Double;
begin
  if Depth <= 0.0 then Exit(0.0);
  if Depth >= FDiameter then
    Exit(Pi / 4.0 * FDiameter * FDiameter);
  Theta := GetTheta(Depth);
  Result := (FDiameter * FDiameter / 4.0)
            * (Theta - Sin(Theta));
end;

function TXsect.GetWettedPerimeter(Depth: Double): Double;
var
  Theta: Double;
begin
  if Depth <= 0.0 then Exit(0.0);
  if Depth >= FDiameter then
    Exit(Pi * FDiameter);
  Theta := GetTheta(Depth);
  Result := 0.5 * FDiameter * Theta;
end;

function TXsect.GetHydRadius(Depth: Double): Double;
var
  Area, WP: Double;
begin
  Area := GetArea(Depth);
  WP := GetWettedPerimeter(Depth);
  if WP <= 0.0 then Exit(0.0);
  Result := Area / WP;
end;

function TXsect.GetWidth(Depth: Double): Double;
var
  Theta: Double;
begin
  if (Depth <= 0.0) or (Depth >= FDiameter) then
    Exit(0.0);
  Theta := GetTheta(Depth);
  Result := FDiameter * Sin(Theta / 2.0);
end;

function TXsect.GetSectionFactor(Depth: Double): Double;
var
  Area, RH: Double;
begin
  Area := GetArea(Depth);
  RH := GetHydRadius(Depth);
  Result := Area * Power(RH, 2.0 / 3.0);
end;

end.`,
    typescript: `// xsect.ts — Cross-Section Geometry
// SWMM5 Engine in TypeScript — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

const CIRCULAR: number = 1;

interface XsectParams {
    shape: number;
    diameter: number;
}

class Xsect {
    readonly shape: number;
    readonly diameter: number;

    constructor(params: XsectParams) {
        this.shape = params.shape;
        this.diameter = params.diameter;
    }

    static getTheta(depth: number, diameter: number): number {
        if (depth <= 0.0) return 0.0;
        if (depth >= diameter) return 2.0 * Math.PI;
        const yNorm: number = depth / diameter;
        return 2.0 * Math.acos(1.0 - 2.0 * yNorm);
    }

    getArea(depth: number): number {
        if (depth <= 0.0) return 0.0;
        const d: number = this.diameter;
        if (depth >= d)
            return Math.PI / 4.0 * d * d;
        const theta: number = Xsect.getTheta(depth, d);
        return (d * d / 4.0) * (theta - Math.sin(theta));
    }

    getWettedPerimeter(depth: number): number {
        if (depth <= 0.0) return 0.0;
        if (depth >= this.diameter)
            return Math.PI * this.diameter;
        const theta: number =
            Xsect.getTheta(depth, this.diameter);
        return 0.5 * this.diameter * theta;
    }

    getHydRadius(depth: number): number {
        const area: number = this.getArea(depth);
        const wp: number = this.getWettedPerimeter(depth);
        if (wp <= 0.0) return 0.0;
        return area / wp;
    }

    getWidth(depth: number): number {
        if (depth <= 0.0 || depth >= this.diameter)
            return 0.0;
        const theta: number =
            Xsect.getTheta(depth, this.diameter);
        return this.diameter * Math.sin(theta / 2.0);
    }

    getSectionFactor(depth: number): number {
        const area: number = this.getArea(depth);
        const rh: number = this.getHydRadius(depth);
        return area * Math.pow(rh, 2.0 / 3.0);
    }
}

export { Xsect, CIRCULAR };`,
    cuda: `// xsect.cu — Cross-Section Geometry
// SWMM5 Engine in CUDA — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

#include <math.h>

#define CIRCULAR 1
#define PI_F 3.14159265f

struct Xsect {
    int   shape;
    float diameter;
};

__device__ float xsect_getTheta(float depth, float diameter)
{
    if (depth <= 0.0f) return 0.0f;
    if (depth >= diameter) return 2.0f * PI_F;
    float yNorm = depth / diameter;
    return 2.0f * acosf(1.0f - 2.0f * yNorm);
}

__device__ float xsect_getArea(const Xsect* x, float depth)
{
    if (depth <= 0.0f) return 0.0f;
    float d = x->diameter;
    if (depth >= d)
        return PI_F / 4.0f * d * d;
    float theta = xsect_getTheta(depth, d);
    return (d * d / 4.0f) * (theta - sinf(theta));
}

__device__ float xsect_getWP(const Xsect* x, float depth)
{
    if (depth <= 0.0f) return 0.0f;
    if (depth >= x->diameter) return PI_F * x->diameter;
    float theta = xsect_getTheta(depth, x->diameter);
    return 0.5f * x->diameter * theta;
}

__device__ float xsect_getHydRadius(const Xsect* x,
                                     float depth)
{
    float area = xsect_getArea(x, depth);
    float wp = xsect_getWP(x, depth);
    if (wp <= 0.0f) return 0.0f;
    return area / wp;
}

__global__ void computeXsectKernel(Xsect* xsects,
    float* depths, float* areas, float* hydRads, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    areas[idx] = xsect_getArea(&xsects[idx], depths[idx]);
    hydRads[idx] = xsect_getHydRadius(&xsects[idx],
                                       depths[idx]);
}`,
    wasm: `;; xsect.wat — Cross-Section Geometry
;; SWMM5 Engine in WebAssembly — Circular Pipe Geometry
;; Computes area, hydraulic radius, top width,
;; and section factor from depth for circular pipes

(module
  (func $getTheta (param $depth f64) (param $diam f64)
    (result f64)
    (if (result f64) (f64.le (local.get $depth) (f64.const 0))
      (then (f64.const 0))
      (else
        (if (result f64) (f64.ge (local.get $depth)
                                  (local.get $diam))
          (then (f64.mul (f64.const 2)
                         (f64.const 3.14159265358979)))
          (else
            (f64.mul (f64.const 2)
              (call $acos
                (f64.sub (f64.const 1)
                  (f64.mul (f64.const 2)
                    (f64.div (local.get $depth)
                             (local.get $diam)))))))))))

  (func $getArea (param $diam f64) (param $depth f64)
    (result f64)
    (local $theta f64)
    (if (result f64) (f64.le (local.get $depth) (f64.const 0))
      (then (f64.const 0))
      (else
        (if (result f64) (f64.ge (local.get $depth)
                                  (local.get $diam))
          (then (f64.mul
            (f64.div (f64.const 3.14159265358979)
                     (f64.const 4))
            (f64.mul (local.get $diam) (local.get $diam))))
          (else
            (local.set $theta
              (call $getTheta (local.get $depth)
                              (local.get $diam)))
            (f64.mul
              (f64.div (f64.mul (local.get $diam)
                                (local.get $diam))
                       (f64.const 4))
              (f64.sub (local.get $theta)
                (call $sin (local.get $theta)))))))))

  (func $getHydRadius (param $diam f64) (param $depth f64)
    (result f64)
    (local $area f64) (local $wp f64)
    (local.set $area
      (call $getArea (local.get $diam) (local.get $depth)))
    (local.set $wp
      (f64.mul (f64.const 0.5) (f64.mul (local.get $diam)
        (call $getTheta (local.get $depth)
                        (local.get $diam)))))
    (if (result f64) (f64.le (local.get $wp) (f64.const 0))
      (then (f64.const 0))
      (else (f64.div (local.get $area) (local.get $wp)))))

  (func $acos (param f64) (result f64) unreachable)
  (func $sin (param f64) (result f64) unreachable)
)`,
    mojo: `# xsect.mojo — Cross-Section Geometry
# SWMM5 Engine in Mojo — Circular Pipe Geometry
# Computes area, hydraulic radius, top width,
# and section factor from depth for circular pipes

from math import pi, acos, sin, pow

alias CIRCULAR: Int = 1

struct Xsect:
    var shape: Int
    var diameter: Float64

    fn __init__(inout self, shape: Int, diameter: Float64):
        self.shape = shape
        self.diameter = diameter

    @staticmethod
    fn get_theta(depth: Float64, diameter: Float64) -> Float64:
        if depth <= 0.0:
            return 0.0
        if depth >= diameter:
            return 2.0 * pi
        var y_norm = depth / diameter
        return 2.0 * acos(1.0 - 2.0 * y_norm)

    fn get_area(self, depth: Float64) -> Float64:
        if depth <= 0.0:
            return 0.0
        var d = self.diameter
        if depth >= d:
            return pi / 4.0 * d * d
        var theta = Self.get_theta(depth, d)
        return (d * d / 4.0) * (theta - sin(theta))

    fn get_wetted_perimeter(self, depth: Float64) -> Float64:
        if depth <= 0.0:
            return 0.0
        if depth >= self.diameter:
            return pi * self.diameter
        var theta = Self.get_theta(depth, self.diameter)
        return 0.5 * self.diameter * theta

    fn get_hyd_radius(self, depth: Float64) -> Float64:
        var area = self.get_area(depth)
        var wp = self.get_wetted_perimeter(depth)
        if wp <= 0.0:
            return 0.0
        return area / wp

    fn get_width(self, depth: Float64) -> Float64:
        if depth <= 0.0 or depth >= self.diameter:
            return 0.0
        var theta = Self.get_theta(depth, self.diameter)
        return self.diameter * sin(theta / 2.0)

    fn get_section_factor(self, depth: Float64) -> Float64:
        var area = self.get_area(depth)
        var rh = self.get_hyd_radius(depth)
        return area * pow(rh, 2.0 / 3.0)`,
    java: `// Xsect.java — Cross-Section Geometry
// SWMM5 Engine in Java — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

package swmm;

public class Xsect {
    public static final int CIRCULAR = 1;

    private final int shape;
    private final double diameter;

    public Xsect(int shape, double diameter) {
        this.shape = shape;
        this.diameter = diameter;
    }

    private static double getTheta(double depth,
                                    double diameter) {
        if (depth <= 0.0) return 0.0;
        if (depth >= diameter) return 2.0 * Math.PI;
        double yNorm = depth / diameter;
        return 2.0 * Math.acos(1.0 - 2.0 * yNorm);
    }

    public double getArea(double depth) {
        if (depth <= 0.0) return 0.0;
        double d = diameter;
        if (depth >= d)
            return Math.PI / 4.0 * d * d;
        double theta = getTheta(depth, d);
        return (d * d / 4.0) * (theta - Math.sin(theta));
    }

    public double getWettedPerimeter(double depth) {
        if (depth <= 0.0) return 0.0;
        if (depth >= diameter)
            return Math.PI * diameter;
        double theta = getTheta(depth, diameter);
        return 0.5 * diameter * theta;
    }

    public double getHydRadius(double depth) {
        double area = getArea(depth);
        double wp = getWettedPerimeter(depth);
        if (wp <= 0.0) return 0.0;
        return area / wp;
    }

    public double getWidth(double depth) {
        if (depth <= 0.0 || depth >= diameter)
            return 0.0;
        double theta = getTheta(depth, diameter);
        return diameter * Math.sin(theta / 2.0);
    }

    public double getSectionFactor(double depth) {
        double area = getArea(depth);
        double rh = getHydRadius(depth);
        return area * Math.pow(rh, 2.0 / 3.0);
    }
}`,
    nim: `# xsect.nim — Cross-Section Geometry
# SWMM5 Engine in Nim — Circular Pipe Geometry
# Computes area, hydraulic radius, top width,
# and section factor from depth for circular pipes

import math

const Circular = 1

type
  Xsect = object
    shape: int
    diameter: float64

proc getTheta(depth, diameter: float64): float64 =
  if depth <= 0.0: return 0.0
  if depth >= diameter: return 2.0 * PI
  let yNorm = depth / diameter
  result = 2.0 * arccos(1.0 - 2.0 * yNorm)

proc getArea(x: Xsect, depth: float64): float64 =
  if depth <= 0.0: return 0.0
  let d = x.diameter
  if depth >= d: return PI / 4.0 * d * d
  let theta = getTheta(depth, d)
  result = (d * d / 4.0) * (theta - sin(theta))

proc getWettedPerimeter(x: Xsect, depth: float64): float64 =
  if depth <= 0.0: return 0.0
  if depth >= x.diameter: return PI * x.diameter
  let theta = getTheta(depth, x.diameter)
  result = 0.5 * x.diameter * theta

proc getHydRadius(x: Xsect, depth: float64): float64 =
  let area = getArea(x, depth)
  let wp = getWettedPerimeter(x, depth)
  if wp <= 0.0: return 0.0
  result = area / wp

proc getWidth(x: Xsect, depth: float64): float64 =
  if depth <= 0.0 or depth >= x.diameter: return 0.0
  let theta = getTheta(depth, x.diameter)
  result = x.diameter * sin(theta / 2.0)

proc getSectionFactor(x: Xsect, depth: float64): float64 =
  let area = getArea(x, depth)
  let rh = getHydRadius(x, depth)
  result = area * pow(rh, 2.0 / 3.0)`,
    ada: `-- xsect.adb — Cross-Section Geometry
-- SWMM5 Engine in Ada — Circular Pipe Geometry
-- Computes area, hydraulic radius, top width,
-- and section factor from depth for circular pipes

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body Xsect_Pkg is

   type Shape_Type is (Circular);

   type Xsect is record
      Shape    : Shape_Type;
      Diameter : Float;
   end record;

   function Get_Theta (Depth, Diameter : Float) return Float is
      Y_Norm : Float;
   begin
      if Depth <= 0.0 then return 0.0; end if;
      if Depth >= Diameter then
         return 2.0 * Ada.Numerics.Pi;
      end if;
      Y_Norm := Depth / Diameter;
      return 2.0 * Arccos (1.0 - 2.0 * Y_Norm);
   end Get_Theta;

   function Get_Area (X : Xsect; Depth : Float) return Float is
      D     : Float := X.Diameter;
      Theta : Float;
   begin
      if Depth <= 0.0 then return 0.0; end if;
      if Depth >= D then
         return Ada.Numerics.Pi / 4.0 * D * D;
      end if;
      Theta := Get_Theta (Depth, D);
      return (D * D / 4.0) * (Theta - Sin (Theta));
   end Get_Area;

   function Get_Wetted_Perimeter (X : Xsect;
      Depth : Float) return Float is
      Theta : Float;
   begin
      if Depth <= 0.0 then return 0.0; end if;
      if Depth >= X.Diameter then
         return Ada.Numerics.Pi * X.Diameter;
      end if;
      Theta := Get_Theta (Depth, X.Diameter);
      return 0.5 * X.Diameter * Theta;
   end Get_Wetted_Perimeter;

   function Get_Hyd_Radius (X : Xsect;
      Depth : Float) return Float is
      Area : Float := Get_Area (X, Depth);
      WP   : Float := Get_Wetted_Perimeter (X, Depth);
   begin
      if WP <= 0.0 then return 0.0; end if;
      return Area / WP;
   end Get_Hyd_Radius;

   function Get_Width (X : Xsect;
      Depth : Float) return Float is
      Theta : Float;
   begin
      if Depth <= 0.0 or Depth >= X.Diameter then
         return 0.0;
      end if;
      Theta := Get_Theta (Depth, X.Diameter);
      return X.Diameter * Sin (Theta / 2.0);
   end Get_Width;

   function Get_Section_Factor (X : Xsect;
      Depth : Float) return Float is
      Area : Float := Get_Area (X, Depth);
      RH   : Float := Get_Hyd_Radius (X, Depth);
   begin
      return Area * (RH ** (2.0 / 3.0));
   end Get_Section_Factor;

end Xsect_Pkg;`,
    chapel: `// xsect.chpl — Cross-Section Geometry
// SWMM5 Engine in Chapel — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

use Math;

const CIRCULAR = 1;

record Xsect {
    var shape: int;
    var diameter: real;
}

proc getTheta(depth: real, diameter: real): real {
    if depth <= 0.0 then return 0.0;
    if depth >= diameter then return 2.0 * pi;
    var yNorm = depth / diameter;
    return 2.0 * acos(1.0 - 2.0 * yNorm);
}

proc getArea(ref x: Xsect, depth: real): real {
    if depth <= 0.0 then return 0.0;
    var d = x.diameter;
    if depth >= d then return pi / 4.0 * d * d;
    var theta = getTheta(depth, d);
    return (d * d / 4.0) * (theta - sin(theta));
}

proc getWettedPerimeter(ref x: Xsect, depth: real): real {
    if depth <= 0.0 then return 0.0;
    if depth >= x.diameter then return pi * x.diameter;
    var theta = getTheta(depth, x.diameter);
    return 0.5 * x.diameter * theta;
}

proc getHydRadius(ref x: Xsect, depth: real): real {
    var area = getArea(x, depth);
    var wp = getWettedPerimeter(x, depth);
    if wp <= 0.0 then return 0.0;
    return area / wp;
}

proc getWidth(ref x: Xsect, depth: real): real {
    if depth <= 0.0 || depth >= x.diameter then return 0.0;
    var theta = getTheta(depth, x.diameter);
    return x.diameter * sin(theta / 2.0);
}

proc getSectionFactor(ref x: Xsect, depth: real): real {
    var area = getArea(x, depth);
    var rh = getHydRadius(x, depth);
    return area * rh ** (2.0 / 3.0);
}`,
    swift: `// xsect.swift — Cross-Section Geometry
// SWMM5 Engine in Swift — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

import Foundation

let CIRCULAR = 1

struct Xsect {
    let shape: Int
    let diameter: Double

    static func getTheta(depth: Double,
                          diameter: Double) -> Double {
        guard depth > 0.0 else { return 0.0 }
        guard depth < diameter else {
            return 2.0 * Double.pi
        }
        let yNorm = depth / diameter
        return 2.0 * acos(1.0 - 2.0 * yNorm)
    }

    func getArea(depth: Double) -> Double {
        guard depth > 0.0 else { return 0.0 }
        let d = diameter
        guard depth < d else {
            return Double.pi / 4.0 * d * d
        }
        let theta = Xsect.getTheta(depth: depth,
                                     diameter: d)
        return (d * d / 4.0) * (theta - sin(theta))
    }

    func getWettedPerimeter(depth: Double) -> Double {
        guard depth > 0.0 else { return 0.0 }
        guard depth < diameter else {
            return Double.pi * diameter
        }
        let theta = Xsect.getTheta(depth: depth,
                                     diameter: diameter)
        return 0.5 * diameter * theta
    }

    func getHydRadius(depth: Double) -> Double {
        let area = getArea(depth: depth)
        let wp = getWettedPerimeter(depth: depth)
        guard wp > 0.0 else { return 0.0 }
        return area / wp
    }

    func getWidth(depth: Double) -> Double {
        guard depth > 0.0, depth < diameter else {
            return 0.0
        }
        let theta = Xsect.getTheta(depth: depth,
                                     diameter: diameter)
        return diameter * sin(theta / 2.0)
    }

    func getSectionFactor(depth: Double) -> Double {
        let area = getArea(depth: depth)
        let rh = getHydRadius(depth: depth)
        return area * pow(rh, 2.0 / 3.0)
    }
}`,
    kotlin: `// Xsect.kt — Cross-Section Geometry
// SWMM5 Engine in Kotlin — Circular Pipe Geometry
// Computes area, hydraulic radius, top width,
// and section factor from depth for circular pipes

package swmm

import kotlin.math.*

const val CIRCULAR = 1

data class Xsect(val shape: Int, val diameter: Double) {

    companion object {
        fun getTheta(depth: Double, diameter: Double): Double {
            if (depth <= 0.0) return 0.0
            if (depth >= diameter) return 2.0 * PI
            val yNorm = depth / diameter
            return 2.0 * acos(1.0 - 2.0 * yNorm)
        }
    }

    fun getArea(depth: Double): Double {
        if (depth <= 0.0) return 0.0
        val d = diameter
        if (depth >= d) return PI / 4.0 * d * d
        val theta = getTheta(depth, d)
        return (d * d / 4.0) * (theta - sin(theta))
    }

    fun getWettedPerimeter(depth: Double): Double {
        if (depth <= 0.0) return 0.0
        if (depth >= diameter) return PI * diameter
        val theta = getTheta(depth, diameter)
        return 0.5 * diameter * theta
    }

    fun getHydRadius(depth: Double): Double {
        val area = getArea(depth)
        val wp = getWettedPerimeter(depth)
        if (wp <= 0.0) return 0.0
        return area / wp
    }

    fun getWidth(depth: Double): Double {
        if (depth <= 0.0 || depth >= diameter) return 0.0
        val theta = getTheta(depth, diameter)
        return diameter * sin(theta / 2.0)
    }

    fun getSectionFactor(depth: Double): Double {
        val area = getArea(depth)
        val rh = getHydRadius(depth)
        return area * rh.pow(2.0 / 3.0)
    }
}`,
  },
  "climate.c — Climate/Evaporation Processing": {
    category: "Hydrology",
    difficulty: "intermediate",
    tags: ["climate", "evaporation", "temperature", "wind speed", "snow", "weather", "seasonal", "Hargreaves"],
    description: "Processes climate data for evaporation, temperature, and wind speed used throughout the simulation. Supports multiple evaporation methods: constant rate, monthly averages, time series, temperature-based (Hargreaves). Provides daily temperature range for snowmelt calculations and adjusts evaporation for soil moisture recovery.",
    equations: "ET_Hargreaves = 0.0023·Ra·(T_mean + 17.8)·√(T_max - T_min) (Hargreaves method); ET_adjusted = ET_potential · Ks (soil moisture coefficient)",
    inputs: "Temperature (min/max), evaporation rates or climate time series, wind speed",
    outputs: "Daily evaporation rate, adjusted ET, temperature for snowmelt",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// climate.c — Climate/Evaporation Processing
// EPA SWMM5 Engine — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

#include <math.h>

typedef enum {
    EVAP_CONSTANT,
    EVAP_MONTHLY,
    EVAP_TIMESERIES,
    EVAP_HARGREAVES
} EvapMethod;

typedef struct {
    EvapMethod method;
    double     constRate;       // constant ET (in/day)
    double     monthlyRate[12]; // monthly ET (in/day)
    double     tMin;            // daily min temp (°F)
    double     tMax;            // daily max temp (°F)
    double     ra;              // extraterrestrial radiation
    double     windSpeed;       // wind speed (mph)
    int        month;           // current month (0-11)
} TClimate;

double climate_hargreaves(TClimate* c)
{
    double tMean, tRange;
    tMean  = (c->tMax + c->tMin) / 2.0;
    tRange = c->tMax - c->tMin;
    if (tRange < 0.0) tRange = 0.0;
    return 0.0023 * c->ra * (tMean + 17.8)
           * sqrt(tRange);
}

double climate_getEvapRate(TClimate* c)
{
    switch (c->method) {
        case EVAP_CONSTANT:    return c->constRate;
        case EVAP_MONTHLY:     return c->monthlyRate[c->month];
        case EVAP_HARGREAVES:  return climate_hargreaves(c);
        default:               return 0.0;
    }
}

double climate_adjustForSoilMoisture(double etPotential,
    double moisture, double fieldCap)
{
    double ks;
    if (fieldCap <= 0.0) return 0.0;
    ks = moisture / fieldCap;
    if (ks > 1.0) ks = 1.0;
    return etPotential * ks;
}`,
    rust: `// climate.rs — Climate/Evaporation Processing
// SWMM5 Engine in Rust — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

pub enum EvapMethod {
    Constant,
    Monthly,
    TimeSeries,
    Hargreaves,
}

pub struct Climate {
    pub method: EvapMethod,
    pub const_rate: f64,
    pub monthly_rate: [f64; 12],
    pub t_min: f64,
    pub t_max: f64,
    pub ra: f64,
    pub wind_speed: f64,
    pub month: usize,
}

impl Climate {
    pub fn hargreaves(&self) -> f64 {
        let t_mean = (self.t_max + self.t_min) / 2.0;
        let t_range = (self.t_max - self.t_min).max(0.0);
        0.0023 * self.ra * (t_mean + 17.8) * t_range.sqrt()
    }

    pub fn get_evap_rate(&self) -> f64 {
        match self.method {
            EvapMethod::Constant   => self.const_rate,
            EvapMethod::Monthly    => self.monthly_rate[self.month],
            EvapMethod::Hargreaves => self.hargreaves(),
            EvapMethod::TimeSeries => 0.0,
        }
    }

    pub fn adjust_for_soil_moisture(
        et_potential: f64, moisture: f64, field_cap: f64,
    ) -> f64 {
        if field_cap <= 0.0 { return 0.0; }
        let ks = (moisture / field_cap).min(1.0);
        et_potential * ks
    }
}`,
    python: `# climate.py — Climate/Evaporation Processing
# SWMM5 Engine in Python — Evaporation & Temperature
# Supports constant, monthly, time series, and
# Hargreaves temperature-based evaporation methods

import math
from dataclasses import dataclass, field
from enum import Enum

class EvapMethod(Enum):
    CONSTANT = 0
    MONTHLY = 1
    TIMESERIES = 2
    HARGREAVES = 3

@dataclass
class Climate:
    method: EvapMethod = EvapMethod.CONSTANT
    const_rate: float = 0.0
    monthly_rate: list = field(
        default_factory=lambda: [0.0] * 12)
    t_min: float = 0.0
    t_max: float = 0.0
    ra: float = 0.0
    wind_speed: float = 0.0
    month: int = 0

    def hargreaves(self) -> float:
        t_mean = (self.t_max + self.t_min) / 2.0
        t_range = max(self.t_max - self.t_min, 0.0)
        return 0.0023 * self.ra * (t_mean + 17.8) \\
               * math.sqrt(t_range)

    def get_evap_rate(self) -> float:
        if self.method == EvapMethod.CONSTANT:
            return self.const_rate
        elif self.method == EvapMethod.MONTHLY:
            return self.monthly_rate[self.month]
        elif self.method == EvapMethod.HARGREAVES:
            return self.hargreaves()
        return 0.0

    @staticmethod
    def adjust_for_soil_moisture(
        et_potential: float, moisture: float,
        field_cap: float
    ) -> float:
        if field_cap <= 0.0:
            return 0.0
        ks = min(moisture / field_cap, 1.0)
        return et_potential * ks`,
    fortran: `! climate.f90 — Climate/Evaporation Processing
! SWMM5 Engine in Fortran — Evaporation & Temperature
! Supports constant, monthly, time series, and
! Hargreaves temperature-based evaporation methods

module climate_module
    implicit none

    integer, parameter :: EVAP_CONSTANT   = 0
    integer, parameter :: EVAP_MONTHLY    = 1
    integer, parameter :: EVAP_TIMESERIES = 2
    integer, parameter :: EVAP_HARGREAVES = 3

    type :: Climate
        integer  :: method
        real(8)  :: const_rate
        real(8)  :: monthly_rate(12)
        real(8)  :: t_min, t_max
        real(8)  :: ra
        real(8)  :: wind_speed
        integer  :: month
    end type Climate

contains

    function hargreaves(c) result(et)
        type(Climate), intent(in) :: c
        real(8) :: et, t_mean, t_range
        t_mean  = (c%t_max + c%t_min) / 2.0d0
        t_range = max(c%t_max - c%t_min, 0.0d0)
        et = 0.0023d0 * c%ra * (t_mean + 17.8d0) &
             * sqrt(t_range)
    end function hargreaves

    function get_evap_rate(c) result(rate)
        type(Climate), intent(in) :: c
        real(8) :: rate
        select case (c%method)
            case (EVAP_CONSTANT)
                rate = c%const_rate
            case (EVAP_MONTHLY)
                rate = c%monthly_rate(c%month)
            case (EVAP_HARGREAVES)
                rate = hargreaves(c)
            case default
                rate = 0.0d0
        end select
    end function get_evap_rate

    function adjust_for_soil_moisture(et_pot, moisture, &
                                       field_cap) result(et)
        real(8), intent(in) :: et_pot, moisture, field_cap
        real(8) :: et, ks
        if (field_cap <= 0.0d0) then
            et = 0.0d0
            return
        end if
        ks = min(moisture / field_cap, 1.0d0)
        et = et_pot * ks
    end function adjust_for_soil_moisture

end module climate_module`,
    julia: `# climate.jl — Climate/Evaporation Processing
# SWMM5 Engine in Julia — Evaporation & Temperature
# Supports constant, monthly, time series, and
# Hargreaves temperature-based evaporation methods

@enum EvapMethod begin
    EVAP_CONSTANT
    EVAP_MONTHLY
    EVAP_TIMESERIES
    EVAP_HARGREAVES
end

mutable struct Climate
    method::EvapMethod
    const_rate::Float64
    monthly_rate::Vector{Float64}
    t_min::Float64
    t_max::Float64
    ra::Float64
    wind_speed::Float64
    month::Int
end

function hargreaves(c::Climate)::Float64
    t_mean  = (c.t_max + c.t_min) / 2.0
    t_range = max(c.t_max - c.t_min, 0.0)
    return 0.0023 * c.ra * (t_mean + 17.8) * sqrt(t_range)
end

function get_evap_rate(c::Climate)::Float64
    if c.method == EVAP_CONSTANT
        return c.const_rate
    elseif c.method == EVAP_MONTHLY
        return c.monthly_rate[c.month]
    elseif c.method == EVAP_HARGREAVES
        return hargreaves(c)
    end
    return 0.0
end

function adjust_for_soil_moisture(et_pot::Float64,
    moisture::Float64, field_cap::Float64)::Float64
    field_cap ≤ 0.0 && return 0.0
    ks = min(moisture / field_cap, 1.0)
    return et_pot * ks
end`,
    javascript: `// climate.js — Climate/Evaporation Processing
// SWMM5 Engine in JavaScript — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

const EvapMethod = Object.freeze({
    CONSTANT: 0,
    MONTHLY: 1,
    TIMESERIES: 2,
    HARGREAVES: 3,
});

class Climate {
    constructor(method, constRate, monthlyRate,
                tMin, tMax, ra, windSpeed, month) {
        this.method = method;
        this.constRate = constRate;
        this.monthlyRate = monthlyRate || new Array(12).fill(0);
        this.tMin = tMin;
        this.tMax = tMax;
        this.ra = ra;
        this.windSpeed = windSpeed;
        this.month = month;
    }

    hargreaves() {
        const tMean = (this.tMax + this.tMin) / 2.0;
        const tRange = Math.max(this.tMax - this.tMin, 0.0);
        return 0.0023 * this.ra * (tMean + 17.8)
               * Math.sqrt(tRange);
    }

    getEvapRate() {
        switch (this.method) {
            case EvapMethod.CONSTANT:   return this.constRate;
            case EvapMethod.MONTHLY:    return this.monthlyRate[this.month];
            case EvapMethod.HARGREAVES: return this.hargreaves();
            default:                    return 0.0;
        }
    }

    static adjustForSoilMoisture(etPotential, moisture,
                                  fieldCap) {
        if (fieldCap <= 0.0) return 0.0;
        const ks = Math.min(moisture / fieldCap, 1.0);
        return etPotential * ks;
    }
}

export { Climate, EvapMethod };`,
    go: `// climate.go — Climate/Evaporation Processing
// SWMM5 Engine in Go — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

package swmm

import "math"

type EvapMethod int

const (
    EvapConstant   EvapMethod = iota
    EvapMonthly
    EvapTimeSeries
    EvapHargreaves
)

type Climate struct {
    Method      EvapMethod
    ConstRate   float64
    MonthlyRate [12]float64
    TMin        float64
    TMax        float64
    Ra          float64
    WindSpeed   float64
    Month       int
}

func (c *Climate) Hargreaves() float64 {
    tMean := (c.TMax + c.TMin) / 2.0
    tRange := math.Max(c.TMax-c.TMin, 0.0)
    return 0.0023 * c.Ra * (tMean + 17.8) *
        math.Sqrt(tRange)
}

func (c *Climate) GetEvapRate() float64 {
    switch c.Method {
    case EvapConstant:
        return c.ConstRate
    case EvapMonthly:
        return c.MonthlyRate[c.Month]
    case EvapHargreaves:
        return c.Hargreaves()
    default:
        return 0.0
    }
}

func AdjustForSoilMoisture(etPot, moisture,
    fieldCap float64) float64 {
    if fieldCap <= 0.0 {
        return 0.0
    }
    ks := math.Min(moisture/fieldCap, 1.0)
    return etPot * ks
}`,
    zig: `// climate.zig — Climate/Evaporation Processing
// SWMM5 Engine in Zig — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

const std = @import("std");
const math = std.math;

const EvapMethod = enum {
    constant,
    monthly,
    time_series,
    hargreaves,
};

const Climate = struct {
    method: EvapMethod,
    const_rate: f64,
    monthly_rate: [12]f64,
    t_min: f64,
    t_max: f64,
    ra: f64,
    wind_speed: f64,
    month: usize,

    pub fn calcHargreaves(self: Climate) f64 {
        const t_mean = (self.t_max + self.t_min) / 2.0;
        const t_range = @max(self.t_max - self.t_min, 0.0);
        return 0.0023 * self.ra * (t_mean + 17.8) *
            @sqrt(t_range);
    }

    pub fn getEvapRate(self: Climate) f64 {
        return switch (self.method) {
            .constant => self.const_rate,
            .monthly => self.monthly_rate[self.month],
            .hargreaves => self.calcHargreaves(),
            .time_series => 0.0,
        };
    }

    pub fn adjustForSoilMoisture(et_pot: f64,
        moisture: f64, field_cap: f64) f64 {
        if (field_cap <= 0.0) return 0.0;
        const ks = @min(moisture / field_cap, 1.0);
        return et_pot * ks;
    }
};`,
    cpp: `// climate.cpp — Climate/Evaporation Processing
// SWMM5 Engine in C++ — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

#include <cmath>
#include <algorithm>
#include <array>

namespace swmm {

enum class EvapMethod {
    Constant, Monthly, TimeSeries, Hargreaves
};

struct Climate {
    EvapMethod method;
    double constRate;
    std::array<double, 12> monthlyRate;
    double tMin, tMax;
    double ra;
    double windSpeed;
    int month;

    double hargreaves() const {
        double tMean = (tMax + tMin) / 2.0;
        double tRange = std::max(tMax - tMin, 0.0);
        return 0.0023 * ra * (tMean + 17.8)
               * std::sqrt(tRange);
    }

    double getEvapRate() const {
        switch (method) {
            case EvapMethod::Constant:   return constRate;
            case EvapMethod::Monthly:    return monthlyRate[month];
            case EvapMethod::Hargreaves: return hargreaves();
            default:                     return 0.0;
        }
    }

    static double adjustForSoilMoisture(
        double etPot, double moisture, double fieldCap)
    {
        if (fieldCap <= 0.0) return 0.0;
        double ks = std::min(moisture / fieldCap, 1.0);
        return etPot * ks;
    }
};

} // namespace swmm`,
    csharp: `// Climate.cs — Climate/Evaporation Processing
// SWMM5 Engine in C# — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

using System;

namespace Swmm
{
    public enum EvapMethod
    {
        Constant, Monthly, TimeSeries, Hargreaves
    }

    public class Climate
    {
        public EvapMethod Method { get; set; }
        public double ConstRate { get; set; }
        public double[] MonthlyRate { get; set; }
        public double TMin { get; set; }
        public double TMax { get; set; }
        public double Ra { get; set; }
        public double WindSpeed { get; set; }
        public int Month { get; set; }

        public Climate()
        {
            MonthlyRate = new double[12];
        }

        public double Hargreaves()
        {
            double tMean = (TMax + TMin) / 2.0;
            double tRange = Math.Max(TMax - TMin, 0.0);
            return 0.0023 * Ra * (tMean + 17.8)
                   * Math.Sqrt(tRange);
        }

        public double GetEvapRate()
        {
            switch (Method)
            {
                case EvapMethod.Constant:   return ConstRate;
                case EvapMethod.Monthly:    return MonthlyRate[Month];
                case EvapMethod.Hargreaves: return Hargreaves();
                default:                    return 0.0;
            }
        }

        public static double AdjustForSoilMoisture(
            double etPot, double moisture, double fieldCap)
        {
            if (fieldCap <= 0.0) return 0.0;
            double ks = Math.Min(moisture / fieldCap, 1.0);
            return etPot * ks;
        }
    }
}`,
    matlab: `% climate.m — Climate/Evaporation Processing
% SWMM5 Engine in MATLAB — Evaporation & Temperature
% Supports constant, monthly, time series, and
% Hargreaves temperature-based evaporation methods

function c = create_climate(method, const_rate, ...
                             monthly_rate, t_min, ...
                             t_max, ra, wind_speed, month)
    c.method       = method;
    c.const_rate   = const_rate;
    c.monthly_rate = monthly_rate;
    c.t_min        = t_min;
    c.t_max        = t_max;
    c.ra           = ra;
    c.wind_speed   = wind_speed;
    c.month        = month;
end

function et = hargreaves(c)
    t_mean  = (c.t_max + c.t_min) / 2.0;
    t_range = max(c.t_max - c.t_min, 0.0);
    et = 0.0023 * c.ra * (t_mean + 17.8) ...
         * sqrt(t_range);
end

function rate = get_evap_rate(c)
    switch c.method
        case 0  % CONSTANT
            rate = c.const_rate;
        case 1  % MONTHLY
            rate = c.monthly_rate(c.month);
        case 3  % HARGREAVES
            rate = hargreaves(c);
        otherwise
            rate = 0.0;
    end
end

function et = adjust_for_soil_moisture(et_pot, ...
                                        moisture, ...
                                        field_cap)
    if field_cap <= 0.0
        et = 0.0;
        return;
    end
    ks = min(moisture / field_cap, 1.0);
    et = et_pot * ks;
end`,
    r: `# climate.R — Climate/Evaporation Processing
# SWMM5 Engine in R — Evaporation & Temperature
# Supports constant, monthly, time series, and
# Hargreaves temperature-based evaporation methods

EVAP_CONSTANT   <- 0L
EVAP_MONTHLY    <- 1L
EVAP_TIMESERIES <- 2L
EVAP_HARGREAVES <- 3L

create_climate <- function(method, const_rate,
                            monthly_rate, t_min,
                            t_max, ra, wind_speed,
                            month) {
    list(method       = method,
         const_rate   = const_rate,
         monthly_rate = monthly_rate,
         t_min        = t_min,
         t_max        = t_max,
         ra           = ra,
         wind_speed   = wind_speed,
         month        = month)
}

hargreaves <- function(c) {
    t_mean  <- (c$t_max + c$t_min) / 2.0
    t_range <- max(c$t_max - c$t_min, 0.0)
    0.0023 * c$ra * (t_mean + 17.8) * sqrt(t_range)
}

get_evap_rate <- function(c) {
    if (c$method == EVAP_CONSTANT)   return(c$const_rate)
    if (c$method == EVAP_MONTHLY)    return(c$monthly_rate[c$month])
    if (c$method == EVAP_HARGREAVES) return(hargreaves(c))
    0.0
}

adjust_for_soil_moisture <- function(et_pot, moisture,
                                      field_cap) {
    if (field_cap <= 0.0) return(0.0)
    ks <- min(moisture / field_cap, 1.0)
    et_pot * ks
}`,
    delphi: `{ climate.pas — Climate/Evaporation Processing }
{ SWMM5 Engine in Delphi — Evaporation & Temperature }
{ Supports constant, monthly, time series, and }
{ Hargreaves temperature-based evaporation methods }

unit Climate;

interface

type
  TEvapMethod = (emConstant, emMonthly,
                 emTimeSeries, emHargreaves);

  TClimate = class
  private
    FMethod: TEvapMethod;
    FConstRate: Double;
    FMonthlyRate: array[0..11] of Double;
    FTMin: Double;
    FTMax: Double;
    FRa: Double;
    FWindSpeed: Double;
    FMonth: Integer;
  public
    constructor Create(AMethod: TEvapMethod;
                       AConstRate: Double);
    function Hargreaves: Double;
    function GetEvapRate: Double;
    class function AdjustForSoilMoisture(
      ETPot, Moisture, FieldCap: Double): Double;
  end;

implementation

uses Math;

constructor TClimate.Create(AMethod: TEvapMethod;
                             AConstRate: Double);
begin
  FMethod    := AMethod;
  FConstRate := AConstRate;
end;

function TClimate.Hargreaves: Double;
var
  TMean, TRange: Double;
begin
  TMean  := (FTMax + FTMin) / 2.0;
  TRange := Max(FTMax - FTMin, 0.0);
  Result := 0.0023 * FRa * (TMean + 17.8)
            * Sqrt(TRange);
end;

function TClimate.GetEvapRate: Double;
begin
  case FMethod of
    emConstant:   Result := FConstRate;
    emMonthly:    Result := FMonthlyRate[FMonth];
    emHargreaves: Result := Hargreaves;
  else
    Result := 0.0;
  end;
end;

class function TClimate.AdjustForSoilMoisture(
  ETPot, Moisture, FieldCap: Double): Double;
var
  Ks: Double;
begin
  if FieldCap <= 0.0 then Exit(0.0);
  Ks := Min(Moisture / FieldCap, 1.0);
  Result := ETPot * Ks;
end;

end.`,
    typescript: `// climate.ts — Climate/Evaporation Processing
// SWMM5 Engine in TypeScript — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

enum EvapMethod {
    Constant = 0,
    Monthly = 1,
    TimeSeries = 2,
    Hargreaves = 3,
}

interface ClimateParams {
    method: EvapMethod;
    constRate: number;
    monthlyRate: number[];
    tMin: number;
    tMax: number;
    ra: number;
    windSpeed: number;
    month: number;
}

class Climate {
    method: EvapMethod;
    constRate: number;
    monthlyRate: number[];
    tMin: number;
    tMax: number;
    ra: number;
    windSpeed: number;
    month: number;

    constructor(p: ClimateParams) {
        this.method = p.method;
        this.constRate = p.constRate;
        this.monthlyRate = p.monthlyRate;
        this.tMin = p.tMin;
        this.tMax = p.tMax;
        this.ra = p.ra;
        this.windSpeed = p.windSpeed;
        this.month = p.month;
    }

    hargreaves(): number {
        const tMean: number = (this.tMax + this.tMin) / 2.0;
        const tRange: number =
            Math.max(this.tMax - this.tMin, 0.0);
        return 0.0023 * this.ra * (tMean + 17.8)
               * Math.sqrt(tRange);
    }

    getEvapRate(): number {
        switch (this.method) {
            case EvapMethod.Constant:   return this.constRate;
            case EvapMethod.Monthly:    return this.monthlyRate[this.month];
            case EvapMethod.Hargreaves: return this.hargreaves();
            default:                    return 0.0;
        }
    }

    static adjustForSoilMoisture(
        etPot: number, moisture: number,
        fieldCap: number): number {
        if (fieldCap <= 0.0) return 0.0;
        const ks: number =
            Math.min(moisture / fieldCap, 1.0);
        return etPot * ks;
    }
}

export { Climate, EvapMethod };`,
    cuda: `// climate.cu — Climate/Evaporation Processing
// SWMM5 Engine in CUDA — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

#include <math.h>

enum EvapMethod {
    EVAP_CONSTANT   = 0,
    EVAP_MONTHLY    = 1,
    EVAP_TIMESERIES = 2,
    EVAP_HARGREAVES = 3
};

struct Climate {
    int   method;
    float constRate;
    float monthlyRate[12];
    float tMin, tMax;
    float ra;
    float windSpeed;
    int   month;
};

__device__ float hargreaves(const Climate* c)
{
    float tMean  = (c->tMax + c->tMin) / 2.0f;
    float tRange = fmaxf(c->tMax - c->tMin, 0.0f);
    return 0.0023f * c->ra * (tMean + 17.8f)
           * sqrtf(tRange);
}

__device__ float getEvapRate(const Climate* c)
{
    switch (c->method) {
        case EVAP_CONSTANT:   return c->constRate;
        case EVAP_MONTHLY:    return c->monthlyRate[c->month];
        case EVAP_HARGREAVES: return hargreaves(c);
        default:              return 0.0f;
    }
}

__global__ void evapKernel(Climate* climates,
    float* moisture, float* fieldCap,
    float* etOut, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    float etPot = getEvapRate(&climates[idx]);
    float fc = fieldCap[idx];
    if (fc <= 0.0f) {
        etOut[idx] = 0.0f;
        return;
    }
    float ks = fminf(moisture[idx] / fc, 1.0f);
    etOut[idx] = etPot * ks;
}`,
    wasm: `;; climate.wat — Climate/Evaporation Processing
;; SWMM5 Engine in WebAssembly — Evaporation & Temperature
;; Hargreaves method: ET = 0.0023 * Ra * (Tmean+17.8) * sqrt(Trange)

(module
  (func $hargreaves
    (param $t_min f64) (param $t_max f64)
    (param $ra f64)
    (result f64)
    (local $t_mean f64)
    (local $t_range f64)

    (local.set $t_mean
      (f64.div
        (f64.add (local.get $t_max) (local.get $t_min))
        (f64.const 2.0)))

    (local.set $t_range
      (f64.max
        (f64.sub (local.get $t_max) (local.get $t_min))
        (f64.const 0.0)))

    (f64.mul
      (f64.mul
        (f64.const 0.0023)
        (local.get $ra))
      (f64.mul
        (f64.add (local.get $t_mean) (f64.const 17.8))
        (f64.sqrt (local.get $t_range))))
  )

  (func $adjustForSoilMoisture
    (param $et_pot f64) (param $moisture f64)
    (param $field_cap f64)
    (result f64)
    (local $ks f64)

    (if (result f64)
      (f64.le (local.get $field_cap) (f64.const 0.0))
      (then (f64.const 0.0))
      (else
        (local.set $ks
          (f64.min
            (f64.div (local.get $moisture)
                     (local.get $field_cap))
            (f64.const 1.0)))
        (f64.mul (local.get $et_pot) (local.get $ks))))
  )

  (export "hargreaves" (func $hargreaves))
  (export "adjustForSoilMoisture"
          (func $adjustForSoilMoisture))
)`,
    mojo: `# climate.mojo — Climate/Evaporation Processing
# SWMM5 Engine in Mojo — Evaporation & Temperature
# Supports constant, monthly, time series, and
# Hargreaves temperature-based evaporation methods

from math import sqrt, min, max

alias EVAP_CONSTANT   = 0
alias EVAP_MONTHLY    = 1
alias EVAP_TIMESERIES = 2
alias EVAP_HARGREAVES = 3

struct Climate:
    var method: Int
    var const_rate: Float64
    var monthly_rate: StaticTuple[Float64, 12]
    var t_min: Float64
    var t_max: Float64
    var ra: Float64
    var wind_speed: Float64
    var month: Int

    fn hargreaves(self) -> Float64:
        let t_mean = (self.t_max + self.t_min) / 2.0
        let t_range = max(self.t_max - self.t_min, 0.0)
        return 0.0023 * self.ra * (t_mean + 17.8) * sqrt(t_range)

    fn get_evap_rate(self) -> Float64:
        if self.method == EVAP_CONSTANT:
            return self.const_rate
        elif self.method == EVAP_MONTHLY:
            return self.monthly_rate[self.month]
        elif self.method == EVAP_HARGREAVES:
            return self.hargreaves()
        return 0.0

    @staticmethod
    fn adjust_for_soil_moisture(et_pot: Float64,
        moisture: Float64,
        field_cap: Float64) -> Float64:
        if field_cap <= 0.0:
            return 0.0
        let ks = min(moisture / field_cap, 1.0)
        return et_pot * ks`,
    java: `// Climate.java — Climate/Evaporation Processing
// SWMM5 Engine in Java — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

package swmm;

public class Climate {

    public enum EvapMethod {
        CONSTANT, MONTHLY, TIMESERIES, HARGREAVES
    }

    private EvapMethod method;
    private double constRate;
    private double[] monthlyRate;
    private double tMin, tMax;
    private double ra;
    private double windSpeed;
    private int month;

    public Climate(EvapMethod method, double constRate,
                   double[] monthlyRate, double tMin,
                   double tMax, double ra,
                   double windSpeed, int month) {
        this.method = method;
        this.constRate = constRate;
        this.monthlyRate = monthlyRate;
        this.tMin = tMin;
        this.tMax = tMax;
        this.ra = ra;
        this.windSpeed = windSpeed;
        this.month = month;
    }

    public double hargreaves() {
        double tMean = (tMax + tMin) / 2.0;
        double tRange = Math.max(tMax - tMin, 0.0);
        return 0.0023 * ra * (tMean + 17.8)
               * Math.sqrt(tRange);
    }

    public double getEvapRate() {
        switch (method) {
            case CONSTANT:   return constRate;
            case MONTHLY:    return monthlyRate[month];
            case HARGREAVES: return hargreaves();
            default:         return 0.0;
        }
    }

    public static double adjustForSoilMoisture(
        double etPot, double moisture, double fieldCap) {
        if (fieldCap <= 0.0) return 0.0;
        double ks = Math.min(moisture / fieldCap, 1.0);
        return etPot * ks;
    }
}`,
    nim: `# climate.nim — Climate/Evaporation Processing
# SWMM5 Engine in Nim — Evaporation & Temperature
# Supports constant, monthly, time series, and
# Hargreaves temperature-based evaporation methods

import math

type
  EvapMethod = enum
    emConstant, emMonthly, emTimeSeries, emHargreaves

  Climate = object
    method: EvapMethod
    constRate: float
    monthlyRate: array[12, float]
    tMin, tMax: float
    ra: float
    windSpeed: float
    month: int

proc hargreaves(c: Climate): float =
  let tMean = (c.tMax + c.tMin) / 2.0
  let tRange = max(c.tMax - c.tMin, 0.0)
  result = 0.0023 * c.ra * (tMean + 17.8) * sqrt(tRange)

proc getEvapRate(c: Climate): float =
  case c.method
  of emConstant:   result = c.constRate
  of emMonthly:    result = c.monthlyRate[c.month]
  of emHargreaves: result = hargreaves(c)
  of emTimeSeries: result = 0.0

proc adjustForSoilMoisture(etPot, moisture,
                            fieldCap: float): float =
  if fieldCap <= 0.0: return 0.0
  let ks = min(moisture / fieldCap, 1.0)
  result = etPot * ks`,
    ada: `-- climate.adb — Climate/Evaporation Processing
-- SWMM5 Engine in Ada — Evaporation & Temperature
-- Supports constant, monthly, time series, and
-- Hargreaves temperature-based evaporation methods

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body Climate_Pkg is

   type Evap_Method is (Constant, Monthly,
                        Time_Series, Hargreaves_M);

   type Month_Array is array (0 .. 11) of Float;

   type Climate is record
      Method       : Evap_Method;
      Const_Rate   : Float;
      Monthly_Rate : Month_Array;
      T_Min        : Float;
      T_Max        : Float;
      Ra           : Float;
      Wind_Speed   : Float;
      Month        : Integer;
   end record;

   function Hargreaves (C : Climate) return Float is
      T_Mean  : Float := (C.T_Max + C.T_Min) / 2.0;
      T_Range : Float := Float'Max(C.T_Max - C.T_Min, 0.0);
   begin
      return 0.0023 * C.Ra * (T_Mean + 17.8)
             * Sqrt(T_Range);
   end Hargreaves;

   function Get_Evap_Rate (C : Climate) return Float is
   begin
      case C.Method is
         when Constant     => return C.Const_Rate;
         when Monthly      => return C.Monthly_Rate(C.Month);
         when Hargreaves_M => return Hargreaves(C);
         when others       => return 0.0;
      end case;
   end Get_Evap_Rate;

   function Adjust_For_Soil_Moisture
     (ET_Pot    : Float;
      Moisture  : Float;
      Field_Cap : Float) return Float
   is
      Ks : Float;
   begin
      if Field_Cap <= 0.0 then
         return 0.0;
      end if;
      Ks := Float'Min(Moisture / Field_Cap, 1.0);
      return ET_Pot * Ks;
   end Adjust_For_Soil_Moisture;

end Climate_Pkg;`,
    chapel: `// climate.chpl — Climate/Evaporation Processing
// SWMM5 Engine in Chapel — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

enum EvapMethod { constant, monthly,
                  timeSeries, hargreaves }

record Climate {
    var method: EvapMethod;
    var constRate: real;
    var monthlyRate: [0..11] real;
    var tMin: real;
    var tMax: real;
    var ra: real;
    var windSpeed: real;
    var month: int;

    proc calcHargreaves(): real {
        const tMean = (tMax + tMin) / 2.0;
        const tRange = max(tMax - tMin, 0.0);
        return 0.0023 * ra * (tMean + 17.8)
               * sqrt(tRange);
    }

    proc getEvapRate(): real {
        select method {
            when EvapMethod.constant   do return constRate;
            when EvapMethod.monthly    do return monthlyRate[month];
            when EvapMethod.hargreaves do return calcHargreaves();
            otherwise                  do return 0.0;
        }
    }
}

proc adjustForSoilMoisture(etPot: real, moisture: real,
                            fieldCap: real): real {
    if fieldCap <= 0.0 then return 0.0;
    const ks = min(moisture / fieldCap, 1.0);
    return etPot * ks;
}`,
    swift: `// climate.swift — Climate/Evaporation Processing
// SWMM5 Engine in Swift — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

import Foundation

enum EvapMethod {
    case constant, monthly, timeSeries, hargreaves
}

struct Climate {
    var method: EvapMethod
    var constRate: Double
    var monthlyRate: [Double]
    var tMin: Double
    var tMax: Double
    var ra: Double
    var windSpeed: Double
    var month: Int

    func hargreaves() -> Double {
        let tMean = (tMax + tMin) / 2.0
        let tRange = max(tMax - tMin, 0.0)
        return 0.0023 * ra * (tMean + 17.8)
               * sqrt(tRange)
    }

    func getEvapRate() -> Double {
        switch method {
        case .constant:   return constRate
        case .monthly:    return monthlyRate[month]
        case .hargreaves: return hargreaves()
        case .timeSeries: return 0.0
        }
    }

    static func adjustForSoilMoisture(
        etPot: Double, moisture: Double,
        fieldCap: Double) -> Double {
        guard fieldCap > 0.0 else { return 0.0 }
        let ks = min(moisture / fieldCap, 1.0)
        return etPot * ks
    }
}`,
    kotlin: `// Climate.kt — Climate/Evaporation Processing
// SWMM5 Engine in Kotlin — Evaporation & Temperature
// Supports constant, monthly, time series, and
// Hargreaves temperature-based evaporation methods

import kotlin.math.sqrt
import kotlin.math.max
import kotlin.math.min

enum class EvapMethod {
    CONSTANT, MONTHLY, TIMESERIES, HARGREAVES
}

data class Climate(
    val method: EvapMethod,
    val constRate: Double,
    val monthlyRate: DoubleArray,
    val tMin: Double,
    val tMax: Double,
    val ra: Double,
    val windSpeed: Double,
    val month: Int
) {
    fun hargreaves(): Double {
        val tMean = (tMax + tMin) / 2.0
        val tRange = max(tMax - tMin, 0.0)
        return 0.0023 * ra * (tMean + 17.8) *
               sqrt(tRange)
    }

    fun getEvapRate(): Double = when (method) {
        EvapMethod.CONSTANT   -> constRate
        EvapMethod.MONTHLY    -> monthlyRate[month]
        EvapMethod.HARGREAVES -> hargreaves()
        EvapMethod.TIMESERIES -> 0.0
    }

    companion object {
        fun adjustForSoilMoisture(
            etPot: Double, moisture: Double,
            fieldCap: Double
        ): Double {
            if (fieldCap <= 0.0) return 0.0
            val ks = min(moisture / fieldCap, 1.0)
            return etPot * ks
        }
    }
}`,
  },
  "controls.c — Rule-Based Controls": {
    category: "Operations",
    difficulty: "intermediate",
    tags: ["controls", "rules", "pump", "gate", "orifice", "weir", "operational", "real-time", "conditional"],
    description: "Implements the rule-based control system that operates pumps, gates, orifices, and weirs during a simulation. Each control rule has a condition (IF node depth > 5 ft) and an action (THEN set pump ON). Rules are evaluated each timestep and can depend on simulation time, node depth/head, link flow, or other system variables. This is how SWMM5 models real-time operational strategies.",
    equations: "IF condition THEN action PRIORITY p; Action: setting = target_value (0=off, 1=on, fraction for throttled)",
    inputs: "Control rules (condition/action pairs), current system state (depths, flows, time)",
    outputs: "Updated pump/gate/orifice settings",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// controls.c — Rule-Based Controls
// EPA SWMM5 Engine — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

#include <math.h>

#define REL_EQ  0
#define REL_NEQ 1
#define REL_LT  2
#define REL_LE  3
#define REL_GT  4
#define REL_GE  5

typedef struct {
    int    objectType;   // 0=node, 1=link
    int    objectIndex;  // index of node or link
    int    attribute;    // 0=depth, 1=head, 2=flow
    int    relation;     // comparison operator
    double value;        // threshold value
} TCondition;

typedef struct {
    int    linkIndex;    // target link to control
    double setting;      // new setting (0=off, 1=on)
} TAction;

typedef struct {
    TCondition condition;
    TAction    action;
    int        priority;  // rule priority (higher = first)
} TControlRule;

int controls_checkCondition(TCondition* cond,
    double* nodeDepths, double* linkFlows)
{
    double measuredValue;

    if (cond->objectType == 0)
        measuredValue = nodeDepths[cond->objectIndex];
    else
        measuredValue = linkFlows[cond->objectIndex];

    switch (cond->relation) {
        case REL_EQ:  return measuredValue == cond->value;
        case REL_NEQ: return measuredValue != cond->value;
        case REL_LT:  return measuredValue <  cond->value;
        case REL_LE:  return measuredValue <= cond->value;
        case REL_GT:  return measuredValue >  cond->value;
        case REL_GE:  return measuredValue >= cond->value;
        default:      return 0;
    }
}

void controls_applyAction(TAction* act,
    double* linkSettings)
{
    linkSettings[act->linkIndex] = act->setting;
}

void controls_evaluate(TControlRule* rules, int nRules,
    double* nodeDepths, double* linkFlows,
    double* linkSettings)
{
    int i;
    for (i = 0; i < nRules; i++) {
        if (controls_checkCondition(&rules[i].condition,
                nodeDepths, linkFlows))
        {
            controls_applyAction(&rules[i].action,
                linkSettings);
        }
    }
}`,
    rust: `// controls.rs — Rule-Based Controls
// SWMM5 Engine in Rust — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

#[derive(Clone, Copy, PartialEq)]
pub enum Relation {
    Eq, Neq, Lt, Le, Gt, Ge,
}

#[derive(Clone, Copy, PartialEq)]
pub enum ObjectType {
    Node, Link,
}

pub struct Condition {
    pub object_type: ObjectType,
    pub object_index: usize,
    pub attribute: u8,
    pub relation: Relation,
    pub value: f64,
}

pub struct Action {
    pub link_index: usize,
    pub setting: f64,
}

pub struct ControlRule {
    pub condition: Condition,
    pub action: Action,
    pub priority: i32,
}

impl Condition {
    pub fn check(&self, node_depths: &[f64],
                 link_flows: &[f64]) -> bool {
        let measured = match self.object_type {
            ObjectType::Node => node_depths[self.object_index],
            ObjectType::Link => link_flows[self.object_index],
        };
        match self.relation {
            Relation::Eq  => measured == self.value,
            Relation::Neq => measured != self.value,
            Relation::Lt  => measured <  self.value,
            Relation::Le  => measured <= self.value,
            Relation::Gt  => measured >  self.value,
            Relation::Ge  => measured >= self.value,
        }
    }
}

pub fn apply_action(action: &Action,
                    link_settings: &mut [f64]) {
    link_settings[action.link_index] = action.setting;
}

pub fn evaluate(rules: &[ControlRule],
                node_depths: &[f64], link_flows: &[f64],
                link_settings: &mut [f64]) {
    for rule in rules {
        if rule.condition.check(node_depths, link_flows) {
            apply_action(&rule.action, link_settings);
        }
    }
}`,
    python: `# controls.py — Rule-Based Controls
# SWMM5 Engine in Python — Rule-Based Control System
# Evaluates conditional rules each timestep to
# operate pumps, gates, orifices, and weirs

from dataclasses import dataclass
from enum import Enum
from typing import List

class Relation(Enum):
    EQ = 0; NEQ = 1; LT = 2; LE = 3; GT = 4; GE = 5

class ObjectType(Enum):
    NODE = 0; LINK = 1

@dataclass
class Condition:
    object_type: ObjectType
    object_index: int
    attribute: int      # 0=depth, 1=head, 2=flow
    relation: Relation
    value: float

    def check(self, node_depths: List[float],
              link_flows: List[float]) -> bool:
        if self.object_type == ObjectType.NODE:
            measured = node_depths[self.object_index]
        else:
            measured = link_flows[self.object_index]

        if self.relation == Relation.EQ:  return measured == self.value
        if self.relation == Relation.NEQ: return measured != self.value
        if self.relation == Relation.LT:  return measured <  self.value
        if self.relation == Relation.LE:  return measured <= self.value
        if self.relation == Relation.GT:  return measured >  self.value
        if self.relation == Relation.GE:  return measured >= self.value
        return False

@dataclass
class Action:
    link_index: int
    setting: float       # 0=off, 1=on, fraction

    def apply(self, link_settings: List[float]):
        link_settings[self.link_index] = self.setting

@dataclass
class ControlRule:
    condition: Condition
    action: Action
    priority: int = 0

def evaluate(rules: List[ControlRule],
             node_depths: List[float],
             link_flows: List[float],
             link_settings: List[float]):
    for rule in sorted(rules, key=lambda r: -r.priority):
        if rule.condition.check(node_depths, link_flows):
            rule.action.apply(link_settings)`,
    fortran: `! controls.f90 — Rule-Based Controls
! SWMM5 Engine in Fortran — Rule-Based Control System
! Evaluates conditional rules each timestep to
! operate pumps, gates, orifices, and weirs

module controls_module
    implicit none

    integer, parameter :: REL_EQ=0, REL_NEQ=1, REL_LT=2
    integer, parameter :: REL_LE=3, REL_GT=4, REL_GE=5

    type :: Condition
        integer :: object_type   ! 0=node, 1=link
        integer :: object_index
        integer :: attribute     ! 0=depth, 1=head, 2=flow
        integer :: relation
        real(8) :: value
    end type Condition

    type :: Action
        integer :: link_index
        real(8) :: setting       ! 0=off, 1=on
    end type Action

    type :: ControlRule
        type(Condition) :: cond
        type(Action)    :: act
        integer         :: priority
    end type ControlRule

contains

    logical function check_condition(c, node_depths, &
                                     link_flows)
        type(Condition), intent(in) :: c
        real(8), intent(in) :: node_depths(:), link_flows(:)
        real(8) :: measured

        if (c%object_type == 0) then
            measured = node_depths(c%object_index)
        else
            measured = link_flows(c%object_index)
        end if

        select case (c%relation)
            case (REL_EQ);  check_condition = measured == c%value
            case (REL_NEQ); check_condition = measured /= c%value
            case (REL_LT);  check_condition = measured <  c%value
            case (REL_LE);  check_condition = measured <= c%value
            case (REL_GT);  check_condition = measured >  c%value
            case (REL_GE);  check_condition = measured >= c%value
            case default;   check_condition = .false.
        end select
    end function check_condition

    subroutine apply_action(act, link_settings)
        type(Action), intent(in) :: act
        real(8), intent(inout) :: link_settings(:)
        link_settings(act%link_index) = act%setting
    end subroutine apply_action

    subroutine evaluate(rules, n, node_depths, &
                        link_flows, link_settings)
        type(ControlRule), intent(in) :: rules(:)
        integer, intent(in) :: n
        real(8), intent(in) :: node_depths(:), link_flows(:)
        real(8), intent(inout) :: link_settings(:)
        integer :: i

        do i = 1, n
            if (check_condition(rules(i)%cond, &
                    node_depths, link_flows)) then
                call apply_action(rules(i)%act, &
                    link_settings)
            end if
        end do
    end subroutine evaluate

end module controls_module`,
    julia: `# controls.jl — Rule-Based Controls
# SWMM5 Engine in Julia — Rule-Based Control System
# Evaluates conditional rules each timestep to
# operate pumps, gates, orifices, and weirs

@enum Relation REL_EQ REL_NEQ REL_LT REL_LE REL_GT REL_GE
@enum ObjectType OBJ_NODE OBJ_LINK

struct Condition
    object_type::ObjectType
    object_index::Int
    attribute::Int        # 0=depth, 1=head, 2=flow
    relation::Relation
    value::Float64
end

struct Action
    link_index::Int
    setting::Float64      # 0=off, 1=on, fraction
end

struct ControlRule
    condition::Condition
    action::Action
    priority::Int
end

function check_condition(c::Condition,
        node_depths::Vector{Float64},
        link_flows::Vector{Float64})::Bool
    measured = if c.object_type == OBJ_NODE
        node_depths[c.object_index]
    else
        link_flows[c.object_index]
    end

    c.relation == REL_EQ  && return measured == c.value
    c.relation == REL_NEQ && return measured != c.value
    c.relation == REL_LT  && return measured <  c.value
    c.relation == REL_LE  && return measured <= c.value
    c.relation == REL_GT  && return measured >  c.value
    c.relation == REL_GE  && return measured >= c.value
    return false
end

function apply_action!(act::Action,
        link_settings::Vector{Float64})
    link_settings[act.link_index] = act.setting
end

function evaluate!(rules::Vector{ControlRule},
        node_depths::Vector{Float64},
        link_flows::Vector{Float64},
        link_settings::Vector{Float64})
    sorted = sort(rules, by=r -> -r.priority)
    for rule in sorted
        if check_condition(rule.condition,
                node_depths, link_flows)
            apply_action!(rule.action, link_settings)
        end
    end
end`,
    javascript: `// controls.js — Rule-Based Controls
// SWMM5 Engine in JavaScript — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

const Relation = Object.freeze({
    EQ: 0, NEQ: 1, LT: 2, LE: 3, GT: 4, GE: 5
});

const ObjectType = Object.freeze({
    NODE: 0, LINK: 1
});

class Condition {
    constructor(objectType, objectIndex, attribute,
                relation, value) {
        this.objectType = objectType;
        this.objectIndex = objectIndex;
        this.attribute = attribute;
        this.relation = relation;
        this.value = value;
    }

    check(nodeDepths, linkFlows) {
        const measured = this.objectType === ObjectType.NODE
            ? nodeDepths[this.objectIndex]
            : linkFlows[this.objectIndex];

        switch (this.relation) {
            case Relation.EQ:  return measured === this.value;
            case Relation.NEQ: return measured !== this.value;
            case Relation.LT:  return measured <  this.value;
            case Relation.LE:  return measured <= this.value;
            case Relation.GT:  return measured >  this.value;
            case Relation.GE:  return measured >= this.value;
            default: return false;
        }
    }
}

class Action {
    constructor(linkIndex, setting) {
        this.linkIndex = linkIndex;
        this.setting = setting;
    }

    apply(linkSettings) {
        linkSettings[this.linkIndex] = this.setting;
    }
}

class ControlRule {
    constructor(condition, action, priority = 0) {
        this.condition = condition;
        this.action = action;
        this.priority = priority;
    }
}

function evaluate(rules, nodeDepths, linkFlows,
                  linkSettings) {
    const sorted = [...rules].sort(
        (a, b) => b.priority - a.priority);
    for (const rule of sorted) {
        if (rule.condition.check(nodeDepths, linkFlows)) {
            rule.action.apply(linkSettings);
        }
    }
}

export { Condition, Action, ControlRule, evaluate };`,
    go: `// controls.go — Rule-Based Controls
// SWMM5 Engine in Go — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

package swmm

import "sort"

const (
    RelEq  = 0; RelNeq = 1; RelLt = 2
    RelLe  = 3; RelGt  = 4; RelGe = 5
    ObjNode = 0; ObjLink = 1
)

type Condition struct {
    ObjectType  int
    ObjectIndex int
    Attribute   int
    Relation    int
    Value       float64
}

type Action struct {
    LinkIndex int
    Setting   float64
}

type ControlRule struct {
    Cond     Condition
    Act      Action
    Priority int
}

func (c *Condition) Check(nodeDepths, linkFlows []float64) bool {
    var measured float64
    if c.ObjectType == ObjNode {
        measured = nodeDepths[c.ObjectIndex]
    } else {
        measured = linkFlows[c.ObjectIndex]
    }

    switch c.Relation {
    case RelEq:  return measured == c.Value
    case RelNeq: return measured != c.Value
    case RelLt:  return measured <  c.Value
    case RelLe:  return measured <= c.Value
    case RelGt:  return measured >  c.Value
    case RelGe:  return measured >= c.Value
    default:     return false
    }
}

func ApplyAction(act *Action, linkSettings []float64) {
    linkSettings[act.LinkIndex] = act.Setting
}

func Evaluate(rules []ControlRule, nodeDepths,
    linkFlows, linkSettings []float64) {
    sort.Slice(rules, func(i, j int) bool {
        return rules[i].Priority > rules[j].Priority
    })
    for _, rule := range rules {
        if rule.Cond.Check(nodeDepths, linkFlows) {
            ApplyAction(&rule.Act, linkSettings)
        }
    }
}`,
    zig: `// controls.zig — Rule-Based Controls
// SWMM5 Engine in Zig — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

const std = @import("std");

const Relation = enum { eq, neq, lt, le, gt, ge };
const ObjectType = enum { node, link };

const Condition = struct {
    object_type: ObjectType,
    object_index: usize,
    attribute: u8,
    relation: Relation,
    value: f64,

    pub fn check(self: Condition, node_depths: []const f64,
                 link_flows: []const f64) bool {
        const measured = switch (self.object_type) {
            .node => node_depths[self.object_index],
            .link => link_flows[self.object_index],
        };
        return switch (self.relation) {
            .eq  => measured == self.value,
            .neq => measured != self.value,
            .lt  => measured <  self.value,
            .le  => measured <= self.value,
            .gt  => measured >  self.value,
            .ge  => measured >= self.value,
        };
    }
};

const Action = struct {
    link_index: usize,
    setting: f64,

    pub fn apply(self: Action, link_settings: []f64) void {
        link_settings[self.link_index] = self.setting;
    }
};

const ControlRule = struct {
    condition: Condition,
    action: Action,
    priority: i32,
};

pub fn evaluate(rules: []const ControlRule,
    node_depths: []const f64, link_flows: []const f64,
    link_settings: []f64) void {
    for (rules) |rule| {
        if (rule.condition.check(node_depths, link_flows)) {
            rule.action.apply(link_settings);
        }
    }
}`,
    cpp: `// controls.cpp — Rule-Based Controls
// SWMM5 Engine in C++ — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

#include <vector>
#include <algorithm>

namespace swmm {

enum class Relation { Eq, Neq, Lt, Le, Gt, Ge };
enum class ObjectType { Node, Link };

struct Condition {
    ObjectType objectType;
    int objectIndex;
    int attribute;
    Relation relation;
    double value;

    bool check(const std::vector<double>& nodeDepths,
               const std::vector<double>& linkFlows) const {
        double measured = (objectType == ObjectType::Node)
            ? nodeDepths[objectIndex]
            : linkFlows[objectIndex];

        switch (relation) {
            case Relation::Eq:  return measured == value;
            case Relation::Neq: return measured != value;
            case Relation::Lt:  return measured <  value;
            case Relation::Le:  return measured <= value;
            case Relation::Gt:  return measured >  value;
            case Relation::Ge:  return measured >= value;
            default: return false;
        }
    }
};

struct Action {
    int linkIndex;
    double setting;

    void apply(std::vector<double>& linkSettings) const {
        linkSettings[linkIndex] = setting;
    }
};

struct ControlRule {
    Condition condition;
    Action action;
    int priority;
};

void evaluate(std::vector<ControlRule>& rules,
    const std::vector<double>& nodeDepths,
    const std::vector<double>& linkFlows,
    std::vector<double>& linkSettings) {
    std::sort(rules.begin(), rules.end(),
        [](const auto& a, const auto& b) {
            return a.priority > b.priority;
        });
    for (const auto& rule : rules) {
        if (rule.condition.check(nodeDepths, linkFlows)) {
            rule.action.apply(linkSettings);
        }
    }
}

} // namespace swmm`,
    csharp: `// Controls.cs — Rule-Based Controls
// SWMM5 Engine in C# — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

using System;
using System.Collections.Generic;
using System.Linq;

namespace Swmm
{
    public enum Relation { Eq, Neq, Lt, Le, Gt, Ge }
    public enum ObjectType { Node, Link }

    public class Condition
    {
        public ObjectType ObjectType { get; set; }
        public int ObjectIndex { get; set; }
        public int Attribute { get; set; }
        public Relation Relation { get; set; }
        public double Value { get; set; }

        public bool Check(double[] nodeDepths,
                          double[] linkFlows)
        {
            double measured = ObjectType == ObjectType.Node
                ? nodeDepths[ObjectIndex]
                : linkFlows[ObjectIndex];

            return Relation switch {
                Relation.Eq  => measured == Value,
                Relation.Neq => measured != Value,
                Relation.Lt  => measured <  Value,
                Relation.Le  => measured <= Value,
                Relation.Gt  => measured >  Value,
                Relation.Ge  => measured >= Value,
                _ => false,
            };
        }
    }

    public class Action
    {
        public int LinkIndex { get; set; }
        public double Setting { get; set; }

        public void Apply(double[] linkSettings)
        {
            linkSettings[LinkIndex] = Setting;
        }
    }

    public class ControlRule
    {
        public Condition Condition { get; set; }
        public Action Action { get; set; }
        public int Priority { get; set; }
    }

    public static class Controls
    {
        public static void Evaluate(List<ControlRule> rules,
            double[] nodeDepths, double[] linkFlows,
            double[] linkSettings)
        {
            foreach (var rule in rules
                .OrderByDescending(r => r.Priority))
            {
                if (rule.Condition.Check(nodeDepths,
                        linkFlows))
                    rule.Action.Apply(linkSettings);
            }
        }
    }
}`,
    matlab: `% controls.m — Rule-Based Controls
% SWMM5 Engine in MATLAB — Rule-Based Control System
% Evaluates conditional rules each timestep to
% operate pumps, gates, orifices, and weirs

function rule = create_rule(obj_type, obj_index, ...
        attribute, relation, value, ...
        link_index, setting, priority)
    rule.obj_type   = obj_type;    % 0=node, 1=link
    rule.obj_index  = obj_index;
    rule.attribute  = attribute;
    rule.relation   = relation;    % 0-5: eq,neq,lt,le,gt,ge
    rule.value      = value;
    rule.link_index = link_index;
    rule.setting    = setting;
    rule.priority   = priority;
end

function result = check_condition(rule, node_depths, ...
                                   link_flows)
    if rule.obj_type == 0
        measured = node_depths(rule.obj_index);
    else
        measured = link_flows(rule.obj_index);
    end

    switch rule.relation
        case 0; result = measured == rule.value;
        case 1; result = measured ~= rule.value;
        case 2; result = measured <  rule.value;
        case 3; result = measured <= rule.value;
        case 4; result = measured >  rule.value;
        case 5; result = measured >= rule.value;
        otherwise; result = false;
    end
end

function link_settings = apply_action(rule, link_settings)
    link_settings(rule.link_index) = rule.setting;
end

function link_settings = evaluate(rules, node_depths, ...
                                   link_flows, link_settings)
    priorities = [rules.priority];
    [~, idx] = sort(priorities, 'descend');
    for i = 1:length(idx)
        rule = rules(idx(i));
        if check_condition(rule, node_depths, link_flows)
            link_settings = apply_action(rule, ...
                link_settings);
        end
    end
end`,
    r: `# controls.R — Rule-Based Controls
# SWMM5 Engine in R — Rule-Based Control System
# Evaluates conditional rules each timestep to
# operate pumps, gates, orifices, and weirs

create_rule <- function(obj_type, obj_index, attribute,
                        relation, value, link_index,
                        setting, priority = 0) {
    list(
        obj_type   = obj_type,    # 0=node, 1=link
        obj_index  = obj_index,
        attribute  = attribute,
        relation   = relation,    # 0-5: eq,neq,lt,le,gt,ge
        value      = value,
        link_index = link_index,
        setting    = setting,
        priority   = priority
    )
}

check_condition <- function(rule, node_depths,
                             link_flows) {
    if (rule$obj_type == 0)
        measured <- node_depths[rule$obj_index]
    else
        measured <- link_flows[rule$obj_index]

    switch(as.character(rule$relation),
        "0" = measured == rule$value,
        "1" = measured != rule$value,
        "2" = measured <  rule$value,
        "3" = measured <= rule$value,
        "4" = measured >  rule$value,
        "5" = measured >= rule$value,
        FALSE
    )
}

apply_action <- function(rule, link_settings) {
    link_settings[rule$link_index] <- rule$setting
    link_settings
}

evaluate_controls <- function(rules, node_depths,
                               link_flows, link_settings) {
    priorities <- sapply(rules, function(r) r$priority)
    idx <- order(priorities, decreasing = TRUE)
    for (i in idx) {
        if (check_condition(rules[[i]], node_depths,
                link_flows)) {
            link_settings <- apply_action(rules[[i]],
                link_settings)
        }
    }
    link_settings
}`,
    delphi: `{ controls.pas — Rule-Based Controls }
{ SWMM5 Engine in Delphi — Rule-Based Control System }
{ Evaluates conditional rules each timestep to }
{ operate pumps, gates, orifices, and weirs }

unit Controls;

interface

type
  TRelation = (relEq, relNeq, relLt, relLe, relGt, relGe);
  TObjectType = (otNode, otLink);

  TCondition = record
    ObjectType:  TObjectType;
    ObjectIndex: Integer;
    Attribute:   Integer;
    Relation:    TRelation;
    Value:       Double;
  end;

  TAction = record
    LinkIndex: Integer;
    Setting:   Double;
  end;

  TControlRule = record
    Condition: TCondition;
    Action:    TAction;
    Priority:  Integer;
  end;

  TControls = class
  public
    class function CheckCondition(
        const Cond: TCondition;
        const NodeDepths: array of Double;
        const LinkFlows: array of Double): Boolean;
    class procedure ApplyAction(
        const Act: TAction;
        var LinkSettings: array of Double);
    class procedure Evaluate(
        var Rules: array of TControlRule;
        const NodeDepths: array of Double;
        const LinkFlows: array of Double;
        var LinkSettings: array of Double);
  end;

implementation

class function TControls.CheckCondition(
    const Cond: TCondition;
    const NodeDepths: array of Double;
    const LinkFlows: array of Double): Boolean;
var
  Measured: Double;
begin
  if Cond.ObjectType = otNode then
    Measured := NodeDepths[Cond.ObjectIndex]
  else
    Measured := LinkFlows[Cond.ObjectIndex];

  case Cond.Relation of
    relEq:  Result := Measured = Cond.Value;
    relNeq: Result := Measured <> Cond.Value;
    relLt:  Result := Measured < Cond.Value;
    relLe:  Result := Measured <= Cond.Value;
    relGt:  Result := Measured > Cond.Value;
    relGe:  Result := Measured >= Cond.Value;
  else
    Result := False;
  end;
end;

class procedure TControls.ApplyAction(
    const Act: TAction;
    var LinkSettings: array of Double);
begin
  LinkSettings[Act.LinkIndex] := Act.Setting;
end;

class procedure TControls.Evaluate(
    var Rules: array of TControlRule;
    const NodeDepths: array of Double;
    const LinkFlows: array of Double;
    var LinkSettings: array of Double);
var
  I: Integer;
begin
  for I := Low(Rules) to High(Rules) do
    if CheckCondition(Rules[I].Condition,
        NodeDepths, LinkFlows) then
      ApplyAction(Rules[I].Action, LinkSettings);
end;

end.`,
    typescript: `// controls.ts — Rule-Based Controls
// SWMM5 Engine in TypeScript — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

enum Relation { Eq, Neq, Lt, Le, Gt, Ge }
enum ObjectType { Node, Link }

interface ICondition {
    objectType: ObjectType;
    objectIndex: number;
    attribute: number;
    relation: Relation;
    value: number;
}

interface IAction {
    linkIndex: number;
    setting: number;
}

interface IControlRule {
    condition: ICondition;
    action: IAction;
    priority: number;
}

class Condition implements ICondition {
    constructor(
        public objectType: ObjectType,
        public objectIndex: number,
        public attribute: number,
        public relation: Relation,
        public value: number
    ) {}

    check(nodeDepths: number[],
          linkFlows: number[]): boolean {
        const measured: number =
            this.objectType === ObjectType.Node
                ? nodeDepths[this.objectIndex]
                : linkFlows[this.objectIndex];

        switch (this.relation) {
            case Relation.Eq:  return measured === this.value;
            case Relation.Neq: return measured !== this.value;
            case Relation.Lt:  return measured <  this.value;
            case Relation.Le:  return measured <= this.value;
            case Relation.Gt:  return measured >  this.value;
            case Relation.Ge:  return measured >= this.value;
            default: return false;
        }
    }
}

function applyAction(action: IAction,
                     linkSettings: number[]): void {
    linkSettings[action.linkIndex] = action.setting;
}

function evaluate(rules: IControlRule[],
                  nodeDepths: number[],
                  linkFlows: number[],
                  linkSettings: number[]): void {
    const sorted = [...rules].sort(
        (a, b) => b.priority - a.priority);
    for (const rule of sorted) {
        const cond = new Condition(
            rule.condition.objectType,
            rule.condition.objectIndex,
            rule.condition.attribute,
            rule.condition.relation,
            rule.condition.value);
        if (cond.check(nodeDepths, linkFlows)) {
            applyAction(rule.action, linkSettings);
        }
    }
}

export { Condition, evaluate, Relation, ObjectType };`,
    cuda: `// controls.cu — Rule-Based Controls
// SWMM5 Engine in CUDA — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

#define REL_EQ  0
#define REL_NEQ 1
#define REL_LT  2
#define REL_LE  3
#define REL_GT  4
#define REL_GE  5

#define OBJ_NODE 0
#define OBJ_LINK 1

struct Condition {
    int objectType;
    int objectIndex;
    int attribute;
    int relation;
    float value;
};

struct Action {
    int linkIndex;
    float setting;
};

struct ControlRule {
    Condition condition;
    Action action;
    int priority;
};

__device__ bool checkCondition(const Condition* cond,
    const float* nodeDepths, const float* linkFlows)
{
    float measured;
    if (cond->objectType == OBJ_NODE)
        measured = nodeDepths[cond->objectIndex];
    else
        measured = linkFlows[cond->objectIndex];

    switch (cond->relation) {
        case REL_EQ:  return measured == cond->value;
        case REL_NEQ: return measured != cond->value;
        case REL_LT:  return measured <  cond->value;
        case REL_LE:  return measured <= cond->value;
        case REL_GT:  return measured >  cond->value;
        case REL_GE:  return measured >= cond->value;
        default:      return false;
    }
}

__global__ void evaluateKernel(ControlRule* rules,
    int nRules, float* nodeDepths, float* linkFlows,
    float* linkSettings)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= nRules) return;

    if (checkCondition(&rules[idx].condition,
            nodeDepths, linkFlows)) {
        linkSettings[rules[idx].action.linkIndex] =
            rules[idx].action.setting;
    }
}`,
    wasm: `;; controls.wat — Rule-Based Controls
;; SWMM5 Engine in WebAssembly — Rule-Based Control System
;; Evaluates conditional rules each timestep to
;; operate pumps, gates, orifices, and weirs

(module
  ;; Memory layout: node_depths at 0, link_flows at 1024,
  ;; link_settings at 2048
  (memory (export "memory") 1)

  ;; check_condition: relation, measured, value -> 0 or 1
  (func $checkCondition
    (param $relation i32) (param $measured f64)
    (param $value f64) (result i32)
    (if (i32.eq (local.get $relation) (i32.const 0))
      (then (return (f64.eq (local.get $measured)
                            (local.get $value)))))
    (if (i32.eq (local.get $relation) (i32.const 1))
      (then (return (f64.ne (local.get $measured)
                            (local.get $value)))))
    (if (i32.eq (local.get $relation) (i32.const 2))
      (then (return (f64.lt (local.get $measured)
                            (local.get $value)))))
    (if (i32.eq (local.get $relation) (i32.const 3))
      (then (return (f64.le (local.get $measured)
                            (local.get $value)))))
    (if (i32.eq (local.get $relation) (i32.const 4))
      (then (return (f64.gt (local.get $measured)
                            (local.get $value)))))
    (if (i32.eq (local.get $relation) (i32.const 5))
      (then (return (f64.ge (local.get $measured)
                            (local.get $value)))))
    (i32.const 0)
  )

  ;; apply_action: write setting to link_settings[index]
  (func $applyAction
    (param $linkIndex i32) (param $setting f64)
    (f64.store
      (i32.add (i32.const 2048)
        (i32.mul (local.get $linkIndex) (i32.const 8)))
      (local.get $setting))
  )

  (export "checkCondition" (func $checkCondition))
  (export "applyAction" (func $applyAction))
)`,
    mojo: `# controls.mojo — Rule-Based Controls
# SWMM5 Engine in Mojo — Rule-Based Control System
# Evaluates conditional rules each timestep to
# operate pumps, gates, orifices, and weirs

@value
struct Condition:
    var object_type: Int     # 0=node, 1=link
    var object_index: Int
    var attribute: Int
    var relation: Int        # 0-5: eq,neq,lt,le,gt,ge
    var value: Float64

    fn check(self, node_depths: DynamicVector[Float64],
             link_flows: DynamicVector[Float64]) -> Bool:
        var measured: Float64
        if self.object_type == 0:
            measured = node_depths[self.object_index]
        else:
            measured = link_flows[self.object_index]

        if self.relation == 0: return measured == self.value
        if self.relation == 1: return measured != self.value
        if self.relation == 2: return measured <  self.value
        if self.relation == 3: return measured <= self.value
        if self.relation == 4: return measured >  self.value
        if self.relation == 5: return measured >= self.value
        return False

@value
struct Action:
    var link_index: Int
    var setting: Float64

    fn apply(self, inout link_settings: DynamicVector[Float64]):
        link_settings[self.link_index] = self.setting

@value
struct ControlRule:
    var condition: Condition
    var action: Action
    var priority: Int

fn evaluate(rules: DynamicVector[ControlRule],
            node_depths: DynamicVector[Float64],
            link_flows: DynamicVector[Float64],
            inout link_settings: DynamicVector[Float64]):
    for i in range(len(rules)):
        let rule = rules[i]
        if rule.condition.check(node_depths, link_flows):
            rule.action.apply(link_settings)`,
    java: `// Controls.java — Rule-Based Controls
// SWMM5 Engine in Java — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

package swmm;

import java.util.Arrays;
import java.util.Comparator;

enum Relation { EQ, NEQ, LT, LE, GT, GE }
enum ObjectType { NODE, LINK }

class Condition {
    ObjectType objectType;
    int objectIndex;
    int attribute;
    Relation relation;
    double value;

    Condition(ObjectType objectType, int objectIndex,
              int attribute, Relation relation, double value) {
        this.objectType = objectType;
        this.objectIndex = objectIndex;
        this.attribute = attribute;
        this.relation = relation;
        this.value = value;
    }

    boolean check(double[] nodeDepths, double[] linkFlows) {
        double measured = objectType == ObjectType.NODE
            ? nodeDepths[objectIndex]
            : linkFlows[objectIndex];

        switch (relation) {
            case EQ:  return measured == value;
            case NEQ: return measured != value;
            case LT:  return measured <  value;
            case LE:  return measured <= value;
            case GT:  return measured >  value;
            case GE:  return measured >= value;
            default:  return false;
        }
    }
}

class Action {
    int linkIndex;
    double setting;

    Action(int linkIndex, double setting) {
        this.linkIndex = linkIndex;
        this.setting = setting;
    }

    void apply(double[] linkSettings) {
        linkSettings[linkIndex] = setting;
    }
}

class ControlRule {
    Condition condition;
    Action action;
    int priority;

    ControlRule(Condition condition, Action action,
                int priority) {
        this.condition = condition;
        this.action = action;
        this.priority = priority;
    }
}

public class Controls {
    public static void evaluate(ControlRule[] rules,
            double[] nodeDepths, double[] linkFlows,
            double[] linkSettings) {
        Arrays.sort(rules,
            Comparator.comparingInt(
                (ControlRule r) -> -r.priority));
        for (ControlRule rule : rules) {
            if (rule.condition.check(nodeDepths, linkFlows))
                rule.action.apply(linkSettings);
        }
    }
}`,
    nim: `# controls.nim — Rule-Based Controls
# SWMM5 Engine in Nim — Rule-Based Control System
# Evaluates conditional rules each timestep to
# operate pumps, gates, orifices, and weirs

import algorithm

type
  Relation = enum
    relEq, relNeq, relLt, relLe, relGt, relGe

  ObjectType = enum
    otNode, otLink

  Condition = object
    objectType: ObjectType
    objectIndex: int
    attribute: int
    relation: Relation
    value: float

  Action = object
    linkIndex: int
    setting: float

  ControlRule = object
    condition: Condition
    action: Action
    priority: int

proc checkCondition(cond: Condition,
    nodeDepths: seq[float],
    linkFlows: seq[float]): bool =
  let measured =
    if cond.objectType == otNode:
      nodeDepths[cond.objectIndex]
    else:
      linkFlows[cond.objectIndex]

  case cond.relation
  of relEq:  result = measured == cond.value
  of relNeq: result = measured != cond.value
  of relLt:  result = measured <  cond.value
  of relLe:  result = measured <= cond.value
  of relGt:  result = measured >  cond.value
  of relGe:  result = measured >= cond.value

proc applyAction(action: Action,
    linkSettings: var seq[float]) =
  linkSettings[action.linkIndex] = action.setting

proc evaluate(rules: var seq[ControlRule],
    nodeDepths: seq[float], linkFlows: seq[float],
    linkSettings: var seq[float]) =
  rules.sort(proc(a, b: ControlRule): int =
    b.priority - a.priority)
  for rule in rules:
    if checkCondition(rule.condition,
        nodeDepths, linkFlows):
      applyAction(rule.action, linkSettings)`,
    ada: `-- controls.adb — Rule-Based Controls
-- SWMM5 Engine in Ada — Rule-Based Control System
-- Evaluates conditional rules each timestep to
-- operate pumps, gates, orifices, and weirs

with Ada.Containers.Vectors;

package Controls is

   type Relation is (Eq, Neq, Lt, Le, Gt, Ge);
   type Object_Kind is (Node, Link);

   type Condition is record
      Object_Type  : Object_Kind;
      Object_Index : Integer;
      Attribute    : Integer;
      Rel          : Relation;
      Value        : Long_Float;
   end record;

   type Action is record
      Link_Index : Integer;
      Setting    : Long_Float;
   end record;

   type Control_Rule is record
      Cond     : Condition;
      Act      : Action;
      Priority : Integer;
   end record;

   type Float_Array is array (Natural range <>)
      of Long_Float;

   function Check_Condition
      (C           : Condition;
       Node_Depths : Float_Array;
       Link_Flows  : Float_Array) return Boolean is
      Measured : Long_Float;
   begin
      if C.Object_Type = Node then
         Measured := Node_Depths (C.Object_Index);
      else
         Measured := Link_Flows (C.Object_Index);
      end if;

      case C.Rel is
         when Eq  => return Measured = C.Value;
         when Neq => return Measured /= C.Value;
         when Lt  => return Measured < C.Value;
         when Le  => return Measured <= C.Value;
         when Gt  => return Measured > C.Value;
         when Ge  => return Measured >= C.Value;
      end case;
   end Check_Condition;

   procedure Apply_Action
      (Act           : Action;
       Link_Settings : in out Float_Array) is
   begin
      Link_Settings (Act.Link_Index) := Act.Setting;
   end Apply_Action;

   procedure Evaluate
      (Rules         : in out array of Control_Rule;
       Node_Depths   : Float_Array;
       Link_Flows    : Float_Array;
       Link_Settings : in out Float_Array) is
   begin
      for I in Rules'Range loop
         if Check_Condition (Rules (I).Cond,
               Node_Depths, Link_Flows) then
            Apply_Action (Rules (I).Act,
               Link_Settings);
         end if;
      end loop;
   end Evaluate;

end Controls;`,
    chapel: `// controls.chpl — Rule-Based Controls
// SWMM5 Engine in Chapel — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

enum Relation { eq, neq, lt, le, gt, ge }
enum ObjectType { node, link }

record Condition {
    var objectType: ObjectType;
    var objectIndex: int;
    var attribute: int;
    var relation: Relation;
    var value: real;

    proc check(nodeDepths: [] real,
               linkFlows: [] real): bool {
        var measured: real;
        if objectType == ObjectType.node then
            measured = nodeDepths[objectIndex];
        else
            measured = linkFlows[objectIndex];

        select relation {
            when Relation.eq  do return measured == value;
            when Relation.neq do return measured != value;
            when Relation.lt  do return measured <  value;
            when Relation.le  do return measured <= value;
            when Relation.gt  do return measured >  value;
            when Relation.ge  do return measured >= value;
        }
        return false;
    }
}

record Action {
    var linkIndex: int;
    var setting: real;

    proc apply(ref linkSettings: [] real) {
        linkSettings[linkIndex] = setting;
    }
}

record ControlRule {
    var condition: Condition;
    var action: Action;
    var priority: int;
}

proc evaluate(rules: [] ControlRule,
              nodeDepths: [] real,
              linkFlows: [] real,
              ref linkSettings: [] real) {
    for rule in rules {
        if rule.condition.check(nodeDepths, linkFlows) {
            rule.action.apply(linkSettings);
        }
    }
}`,
    swift: `// controls.swift — Rule-Based Controls
// SWMM5 Engine in Swift — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

enum Relation { case eq, neq, lt, le, gt, ge }
enum ObjectType { case node, link }

struct Condition {
    let objectType: ObjectType
    let objectIndex: Int
    let attribute: Int
    let relation: Relation
    let value: Double

    func check(nodeDepths: [Double],
               linkFlows: [Double]) -> Bool {
        let measured: Double
        switch objectType {
        case .node: measured = nodeDepths[objectIndex]
        case .link: measured = linkFlows[objectIndex]
        }

        switch relation {
        case .eq:  return measured == value
        case .neq: return measured != value
        case .lt:  return measured <  value
        case .le:  return measured <= value
        case .gt:  return measured >  value
        case .ge:  return measured >= value
        }
    }
}

struct Action {
    let linkIndex: Int
    let setting: Double

    func apply(linkSettings: inout [Double]) {
        linkSettings[linkIndex] = setting
    }
}

struct ControlRule {
    let condition: Condition
    let action: Action
    let priority: Int
}

func evaluate(rules: [ControlRule],
              nodeDepths: [Double],
              linkFlows: [Double],
              linkSettings: inout [Double]) {
    let sorted = rules.sorted { $0.priority > $1.priority }
    for rule in sorted {
        if rule.condition.check(nodeDepths: nodeDepths,
                                linkFlows: linkFlows) {
            rule.action.apply(linkSettings: &linkSettings)
        }
    }
}`,
    kotlin: `// Controls.kt — Rule-Based Controls
// SWMM5 Engine in Kotlin — Rule-Based Control System
// Evaluates conditional rules each timestep to
// operate pumps, gates, orifices, and weirs

package swmm

enum class Relation { EQ, NEQ, LT, LE, GT, GE }
enum class ObjectType { NODE, LINK }

data class Condition(
    val objectType: ObjectType,
    val objectIndex: Int,
    val attribute: Int,
    val relation: Relation,
    val value: Double
) {
    fun check(nodeDepths: DoubleArray,
              linkFlows: DoubleArray): Boolean {
        val measured = when (objectType) {
            ObjectType.NODE -> nodeDepths[objectIndex]
            ObjectType.LINK -> linkFlows[objectIndex]
        }
        return when (relation) {
            Relation.EQ  -> measured == value
            Relation.NEQ -> measured != value
            Relation.LT  -> measured <  value
            Relation.LE  -> measured <= value
            Relation.GT  -> measured >  value
            Relation.GE  -> measured >= value
        }
    }
}

data class Action(
    val linkIndex: Int,
    val setting: Double
) {
    fun apply(linkSettings: DoubleArray) {
        linkSettings[linkIndex] = setting
    }
}

data class ControlRule(
    val condition: Condition,
    val action: Action,
    val priority: Int = 0
)

fun evaluate(rules: List<ControlRule>,
             nodeDepths: DoubleArray,
             linkFlows: DoubleArray,
             linkSettings: DoubleArray) {
    rules.sortedByDescending { it.priority }.forEach { rule ->
        if (rule.condition.check(nodeDepths, linkFlows)) {
            rule.action.apply(linkSettings)
        }
    }
}`,
  },
  "qualrout.c — Water Quality Routing": {
    category: "Water Quality",
    difficulty: "advanced",
    tags: ["water quality", "pollutant", "routing", "concentration", "CSTR", "decay", "first-order", "advection", "mixing"],
    description: "Routes pollutant concentrations through the drainage network. Nodes use complete mixing (CSTR) — the outflow concentration equals the fully-mixed node concentration. Links use a Lagrangian approach or CSTR depending on flow regime. First-order decay (C = C0·exp(-k·dt)) reduces pollutant mass during transport. Handles multiple pollutants simultaneously.",
    equations: "C_node = (ΣQ_in·C_in + V·C_old/dt) / (ΣQ_in + V/dt) (CSTR mixing); C_decay = C·exp(-k·dt) (first-order decay); Mass_out = Q_out·C_node·dt",
    inputs: "Upstream pollutant concentrations, node volumes, link flows, decay coefficients",
    outputs: "Pollutant concentrations at each node and link, mass loads",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// qualrout.c — Water Quality Routing
// EPA SWMM5 Engine — Pollutant Transport through Drainage Network
// CSTR mixing at nodes, first-order decay, mass balance

#include <math.h>

typedef struct {
    double decayRate;    // first-order decay coeff (1/s)
    double concen;       // current concentration (mg/L)
} TPollutant;

double qualrout_getDecay(double conc, double k, double dt)
{
    if (k <= 0.0 || dt <= 0.0) return conc;
    return conc * exp(-k * dt);
}

double qualrout_findNodeQual(double* qIn, double* cIn,
                              int nInflows, double volume,
                              double cOld, double dt)
{
    double massIn = 0.0, totalQ = 0.0;
    int i;

    for (i = 0; i < nInflows; i++) {
        massIn += qIn[i] * cIn[i];
        totalQ += qIn[i];
    }

    if (totalQ + volume / dt <= 0.0) return 0.0;

    return (massIn + volume * cOld / dt)
           / (totalQ + volume / dt);
}

double qualrout_findLinkQual(double cUp, double cLink,
                              double flow, double vol,
                              double dt)
{
    if (vol <= 0.0) return cUp;
    double fraction = flow * dt / vol;
    if (fraction > 1.0) fraction = 1.0;
    return cLink + fraction * (cUp - cLink);
}

double qualrout_getMassFlow(double conc, double flow,
                             double dt)
{
    return conc * fabs(flow) * dt;
}`,
    rust: `// qualrout.rs — Water Quality Routing
// SWMM5 Engine in Rust — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

pub struct Pollutant {
    pub decay_rate: f64,
    pub concen: f64,
}

pub fn get_decay(conc: f64, k: f64, dt: f64) -> f64 {
    if k <= 0.0 || dt <= 0.0 { return conc; }
    conc * (-k * dt).exp()
}

pub fn find_node_qual(q_in: &[f64], c_in: &[f64],
                      volume: f64, c_old: f64,
                      dt: f64) -> f64 {
    let mass_in: f64 = q_in.iter().zip(c_in.iter())
        .map(|(q, c)| q * c).sum();
    let total_q: f64 = q_in.iter().sum();

    let denom = total_q + volume / dt;
    if denom <= 0.0 { return 0.0; }

    (mass_in + volume * c_old / dt) / denom
}

pub fn find_link_qual(c_up: f64, c_link: f64, flow: f64,
                      vol: f64, dt: f64) -> f64 {
    if vol <= 0.0 { return c_up; }
    let fraction = (flow * dt / vol).min(1.0);
    c_link + fraction * (c_up - c_link)
}

pub fn get_mass_flow(conc: f64, flow: f64,
                     dt: f64) -> f64 {
    conc * flow.abs() * dt
}`,
    python: `# qualrout.py — Water Quality Routing
# SWMM5 Engine in Python — Pollutant Transport
# CSTR mixing at nodes, first-order decay, mass balance

import math
from dataclasses import dataclass

@dataclass
class Pollutant:
    decay_rate: float
    concen: float

def get_decay(conc: float, k: float, dt: float) -> float:
    if k <= 0.0 or dt <= 0.0:
        return conc
    return conc * math.exp(-k * dt)

def find_node_qual(q_in: list, c_in: list,
                   volume: float, c_old: float,
                   dt: float) -> float:
    mass_in = sum(q * c for q, c in zip(q_in, c_in))
    total_q = sum(q_in)

    denom = total_q + volume / dt
    if denom <= 0.0:
        return 0.0

    return (mass_in + volume * c_old / dt) / denom

def find_link_qual(c_up: float, c_link: float,
                   flow: float, vol: float,
                   dt: float) -> float:
    if vol <= 0.0:
        return c_up
    fraction = min(flow * dt / vol, 1.0)
    return c_link + fraction * (c_up - c_link)

def get_mass_flow(conc: float, flow: float,
                  dt: float) -> float:
    return conc * abs(flow) * dt`,
    fortran: `! qualrout.f90 — Water Quality Routing
! SWMM5 Engine in Fortran — Pollutant Transport
! CSTR mixing at nodes, first-order decay, mass balance

module qualrout_module
    implicit none

    type :: Pollutant
        real(8) :: decay_rate
        real(8) :: concen
    end type Pollutant

contains

    function get_decay(conc, k, dt) result(c_out)
        real(8), intent(in) :: conc, k, dt
        real(8) :: c_out
        if (k <= 0.0d0 .or. dt <= 0.0d0) then
            c_out = conc
            return
        end if
        c_out = conc * exp(-k * dt)
    end function get_decay

    function find_node_qual(q_in, c_in, n, volume, &
                            c_old, dt) result(c_node)
        integer, intent(in) :: n
        real(8), intent(in) :: q_in(n), c_in(n)
        real(8), intent(in) :: volume, c_old, dt
        real(8) :: c_node, mass_in, total_q, denom
        integer :: i

        mass_in = 0.0d0
        total_q = 0.0d0
        do i = 1, n
            mass_in = mass_in + q_in(i) * c_in(i)
            total_q = total_q + q_in(i)
        end do

        denom = total_q + volume / dt
        if (denom <= 0.0d0) then
            c_node = 0.0d0
            return
        end if
        c_node = (mass_in + volume * c_old / dt) / denom
    end function find_node_qual

    function find_link_qual(c_up, c_link, flow, vol, &
                            dt) result(c_out)
        real(8), intent(in) :: c_up, c_link, flow, vol, dt
        real(8) :: c_out, fraction
        if (vol <= 0.0d0) then
            c_out = c_up
            return
        end if
        fraction = flow * dt / vol
        if (fraction > 1.0d0) fraction = 1.0d0
        c_out = c_link + fraction * (c_up - c_link)
    end function find_link_qual

    function get_mass_flow(conc, flow, dt) result(mass)
        real(8), intent(in) :: conc, flow, dt
        real(8) :: mass
        mass = conc * abs(flow) * dt
    end function get_mass_flow

end module qualrout_module`,
    julia: `# qualrout.jl — Water Quality Routing
# SWMM5 Engine in Julia — Pollutant Transport
# CSTR mixing at nodes, first-order decay, mass balance

mutable struct Pollutant
    decay_rate::Float64
    concen::Float64
end

function get_decay(conc::Float64, k::Float64,
                   dt::Float64)::Float64
    (k ≤ 0.0 || dt ≤ 0.0) && return conc
    conc * exp(-k * dt)
end

function find_node_qual(q_in::Vector{Float64},
                        c_in::Vector{Float64},
                        volume::Float64, c_old::Float64,
                        dt::Float64)::Float64
    mass_in = sum(q_in .* c_in)
    total_q = sum(q_in)

    denom = total_q + volume / dt
    denom ≤ 0.0 && return 0.0

    (mass_in + volume * c_old / dt) / denom
end

function find_link_qual(c_up::Float64, c_link::Float64,
                        flow::Float64, vol::Float64,
                        dt::Float64)::Float64
    vol ≤ 0.0 && return c_up
    fraction = clamp(flow * dt / vol, 0.0, 1.0)
    c_link + fraction * (c_up - c_link)
end

function get_mass_flow(conc::Float64, flow::Float64,
                       dt::Float64)::Float64
    conc * abs(flow) * dt
end`,
    javascript: `// qualrout.js — Water Quality Routing
// SWMM5 Engine in JavaScript — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

class Pollutant {
    constructor(decayRate, concen) {
        this.decayRate = decayRate;
        this.concen = concen;
    }
}

function getDecay(conc, k, dt) {
    if (k <= 0.0 || dt <= 0.0) return conc;
    return conc * Math.exp(-k * dt);
}

function findNodeQual(qIn, cIn, volume, cOld, dt) {
    let massIn = 0.0, totalQ = 0.0;
    for (let i = 0; i < qIn.length; i++) {
        massIn += qIn[i] * cIn[i];
        totalQ += qIn[i];
    }

    const denom = totalQ + volume / dt;
    if (denom <= 0.0) return 0.0;

    return (massIn + volume * cOld / dt) / denom;
}

function findLinkQual(cUp, cLink, flow, vol, dt) {
    if (vol <= 0.0) return cUp;
    const fraction = Math.min(flow * dt / vol, 1.0);
    return cLink + fraction * (cUp - cLink);
}

function getMassFlow(conc, flow, dt) {
    return conc * Math.abs(flow) * dt;
}

export { Pollutant, getDecay, findNodeQual,
         findLinkQual, getMassFlow };`,
    go: `// qualrout.go — Water Quality Routing
// SWMM5 Engine in Go — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

package swmm

import "math"

type Pollutant struct {
    DecayRate float64
    Concen    float64
}

func GetDecay(conc, k, dt float64) float64 {
    if k <= 0.0 || dt <= 0.0 {
        return conc
    }
    return conc * math.Exp(-k*dt)
}

func FindNodeQual(qIn, cIn []float64, volume,
    cOld, dt float64) float64 {

    massIn := 0.0
    totalQ := 0.0
    for i := range qIn {
        massIn += qIn[i] * cIn[i]
        totalQ += qIn[i]
    }

    denom := totalQ + volume/dt
    if denom <= 0.0 {
        return 0.0
    }
    return (massIn + volume*cOld/dt) / denom
}

func FindLinkQual(cUp, cLink, flow, vol,
    dt float64) float64 {

    if vol <= 0.0 {
        return cUp
    }
    fraction := flow * dt / vol
    if fraction > 1.0 {
        fraction = 1.0
    }
    return cLink + fraction*(cUp-cLink)
}

func GetMassFlow(conc, flow, dt float64) float64 {
    return conc * math.Abs(flow) * dt
}`,
    zig: `// qualrout.zig — Water Quality Routing
// SWMM5 Engine in Zig — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

const std = @import("std");
const math = std.math;

const Pollutant = struct {
    decay_rate: f64,
    concen: f64,
};

pub fn getDecay(conc: f64, k: f64, dt: f64) f64 {
    if (k <= 0.0 or dt <= 0.0) return conc;
    return conc * @exp(-k * dt);
}

pub fn findNodeQual(q_in: []const f64, c_in: []const f64,
                    volume: f64, c_old: f64, dt: f64) f64 {
    var mass_in: f64 = 0.0;
    var total_q: f64 = 0.0;
    for (q_in, c_in) |q, c| {
        mass_in += q * c;
        total_q += q;
    }

    const denom = total_q + volume / dt;
    if (denom <= 0.0) return 0.0;

    return (mass_in + volume * c_old / dt) / denom;
}

pub fn findLinkQual(c_up: f64, c_link: f64, flow: f64,
                    vol: f64, dt: f64) f64 {
    if (vol <= 0.0) return c_up;
    const fraction = @min(flow * dt / vol, 1.0);
    return c_link + fraction * (c_up - c_link);
}

pub fn getMassFlow(conc: f64, flow: f64, dt: f64) f64 {
    return conc * @fabs(flow) * dt;
}`,
    cpp: `// qualrout.cpp — Water Quality Routing
// SWMM5 Engine in C++ — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

#include <cmath>
#include <vector>
#include <algorithm>

namespace swmm {

struct Pollutant {
    double decayRate;
    double concen;
};

double getDecay(double conc, double k, double dt) {
    if (k <= 0.0 || dt <= 0.0) return conc;
    return conc * std::exp(-k * dt);
}

double findNodeQual(const std::vector<double>& qIn,
                    const std::vector<double>& cIn,
                    double volume, double cOld,
                    double dt) {
    double massIn = 0.0, totalQ = 0.0;
    for (size_t i = 0; i < qIn.size(); ++i) {
        massIn += qIn[i] * cIn[i];
        totalQ += qIn[i];
    }

    double denom = totalQ + volume / dt;
    if (denom <= 0.0) return 0.0;

    return (massIn + volume * cOld / dt) / denom;
}

double findLinkQual(double cUp, double cLink,
                    double flow, double vol,
                    double dt) {
    if (vol <= 0.0) return cUp;
    double fraction = std::min(flow * dt / vol, 1.0);
    return cLink + fraction * (cUp - cLink);
}

double getMassFlow(double conc, double flow,
                   double dt) {
    return conc * std::abs(flow) * dt;
}

} // namespace swmm`,
    csharp: `// QualRout.cs — Water Quality Routing
// SWMM5 Engine in C# — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

using System;

namespace Swmm
{
    public class Pollutant
    {
        public double DecayRate { get; set; }
        public double Concen { get; set; }

        public Pollutant(double decayRate, double concen)
        {
            DecayRate = decayRate;
            Concen = concen;
        }
    }

    public static class QualRout
    {
        public static double GetDecay(double conc,
                                       double k, double dt)
        {
            if (k <= 0.0 || dt <= 0.0) return conc;
            return conc * Math.Exp(-k * dt);
        }

        public static double FindNodeQual(double[] qIn,
            double[] cIn, double volume, double cOld,
            double dt)
        {
            double massIn = 0.0, totalQ = 0.0;
            for (int i = 0; i < qIn.Length; i++)
            {
                massIn += qIn[i] * cIn[i];
                totalQ += qIn[i];
            }

            double denom = totalQ + volume / dt;
            if (denom <= 0.0) return 0.0;

            return (massIn + volume * cOld / dt) / denom;
        }

        public static double FindLinkQual(double cUp,
            double cLink, double flow, double vol,
            double dt)
        {
            if (vol <= 0.0) return cUp;
            double fraction = Math.Min(
                flow * dt / vol, 1.0);
            return cLink + fraction * (cUp - cLink);
        }

        public static double GetMassFlow(double conc,
            double flow, double dt)
        {
            return conc * Math.Abs(flow) * dt;
        }
    }
}`,
    matlab: `% qualrout.m — Water Quality Routing
% SWMM5 Engine in MATLAB — Pollutant Transport
% CSTR mixing at nodes, first-order decay, mass balance

function c_out = get_decay(conc, k, dt)
    if k <= 0.0 || dt <= 0.0
        c_out = conc;
        return;
    end
    c_out = conc * exp(-k * dt);
end

function c_node = find_node_qual(q_in, c_in, ...
                                  volume, c_old, dt)
    mass_in = sum(q_in .* c_in);
    total_q = sum(q_in);

    denom = total_q + volume / dt;
    if denom <= 0.0
        c_node = 0.0;
        return;
    end
    c_node = (mass_in + volume * c_old / dt) / denom;
end

function c_out = find_link_qual(c_up, c_link, ...
                                 flow, vol, dt)
    if vol <= 0.0
        c_out = c_up;
        return;
    end
    fraction = min(flow * dt / vol, 1.0);
    c_out = c_link + fraction * (c_up - c_link);
end

function mass = get_mass_flow(conc, flow, dt)
    mass = conc * abs(flow) * dt;
end`,
    r: `# qualrout.R — Water Quality Routing
# SWMM5 Engine in R — Pollutant Transport
# CSTR mixing at nodes, first-order decay, mass balance

create_pollutant <- function(decay_rate, concen) {
    list(decay_rate = decay_rate, concen = concen)
}

get_decay <- function(conc, k, dt) {
    if (k <= 0.0 || dt <= 0.0) return(conc)
    conc * exp(-k * dt)
}

find_node_qual <- function(q_in, c_in, volume,
                            c_old, dt) {
    mass_in <- sum(q_in * c_in)
    total_q <- sum(q_in)

    denom <- total_q + volume / dt
    if (denom <= 0.0) return(0.0)

    (mass_in + volume * c_old / dt) / denom
}

find_link_qual <- function(c_up, c_link, flow,
                            vol, dt) {
    if (vol <= 0.0) return(c_up)
    fraction <- min(flow * dt / vol, 1.0)
    c_link + fraction * (c_up - c_link)
}

get_mass_flow <- function(conc, flow, dt) {
    conc * abs(flow) * dt
}`,
    delphi: `{ qualrout.pas — Water Quality Routing }
{ SWMM5 Engine in Delphi — Pollutant Transport }
{ CSTR mixing at nodes, first-order decay, mass balance }

unit QualRout;

interface

type
  TPollutant = class
  private
    FDecayRate: Double;
    FConcen: Double;
  public
    constructor Create(ADecayRate, AConcen: Double);
    property DecayRate: Double read FDecayRate;
    property Concen: Double read FConcen write FConcen;
  end;

function GetDecay(Conc, K, Dt: Double): Double;
function FindNodeQual(const QIn, CIn: array of Double;
                      Volume, COld, Dt: Double): Double;
function FindLinkQual(CUp, CLink, Flow,
                      Vol, Dt: Double): Double;
function GetMassFlow(Conc, Flow, Dt: Double): Double;

implementation

uses Math;

constructor TPollutant.Create(ADecayRate, AConcen: Double);
begin
  FDecayRate := ADecayRate;
  FConcen := AConcen;
end;

function GetDecay(Conc, K, Dt: Double): Double;
begin
  if (K <= 0.0) or (Dt <= 0.0) then
    Exit(Conc);
  Result := Conc * Exp(-K * Dt);
end;

function FindNodeQual(const QIn, CIn: array of Double;
                      Volume, COld, Dt: Double): Double;
var
  MassIn, TotalQ, Denom: Double;
  I: Integer;
begin
  MassIn := 0.0;
  TotalQ := 0.0;
  for I := Low(QIn) to High(QIn) do
  begin
    MassIn := MassIn + QIn[I] * CIn[I];
    TotalQ := TotalQ + QIn[I];
  end;

  Denom := TotalQ + Volume / Dt;
  if Denom <= 0.0 then
    Exit(0.0);
  Result := (MassIn + Volume * COld / Dt) / Denom;
end;

function FindLinkQual(CUp, CLink, Flow,
                      Vol, Dt: Double): Double;
var
  Fraction: Double;
begin
  if Vol <= 0.0 then
    Exit(CUp);
  Fraction := Min(Flow * Dt / Vol, 1.0);
  Result := CLink + Fraction * (CUp - CLink);
end;

function GetMassFlow(Conc, Flow, Dt: Double): Double;
begin
  Result := Conc * Abs(Flow) * Dt;
end;

end.`,
    typescript: `// qualrout.ts — Water Quality Routing
// SWMM5 Engine in TypeScript — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

interface PollutantParams {
    decayRate: number;
    concen: number;
}

class Pollutant {
    readonly decayRate: number;
    concen: number;

    constructor(params: PollutantParams) {
        this.decayRate = params.decayRate;
        this.concen = params.concen;
    }
}

function getDecay(conc: number, k: number,
                  dt: number): number {
    if (k <= 0.0 || dt <= 0.0) return conc;
    return conc * Math.exp(-k * dt);
}

function findNodeQual(qIn: number[], cIn: number[],
                      volume: number, cOld: number,
                      dt: number): number {
    let massIn = 0.0, totalQ = 0.0;
    for (let i = 0; i < qIn.length; i++) {
        massIn += qIn[i] * cIn[i];
        totalQ += qIn[i];
    }

    const denom: number = totalQ + volume / dt;
    if (denom <= 0.0) return 0.0;

    return (massIn + volume * cOld / dt) / denom;
}

function findLinkQual(cUp: number, cLink: number,
                      flow: number, vol: number,
                      dt: number): number {
    if (vol <= 0.0) return cUp;
    const fraction: number = Math.min(
        flow * dt / vol, 1.0);
    return cLink + fraction * (cUp - cLink);
}

function getMassFlow(conc: number, flow: number,
                     dt: number): number {
    return conc * Math.abs(flow) * dt;
}

export { Pollutant, getDecay, findNodeQual,
         findLinkQual, getMassFlow };`,
    cuda: `// qualrout.cu — Water Quality Routing
// SWMM5 Engine in CUDA — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

#include <math.h>

struct Pollutant {
    float decayRate;
    float concen;
};

__device__ float getDecay(float conc, float k, float dt)
{
    if (k <= 0.0f || dt <= 0.0f) return conc;
    return conc * expf(-k * dt);
}

__global__ void findNodeQualKernel(
    float* qIn, float* cIn, int* nInflows,
    float* volumes, float* cOld, float dt,
    float* cNode, int nNodes)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= nNodes) return;

    float massIn = 0.0f, totalQ = 0.0f;
    int start = 0;
    for (int j = 0; j < idx; j++) start += nInflows[j];

    for (int i = 0; i < nInflows[idx]; i++) {
        massIn += qIn[start + i] * cIn[start + i];
        totalQ += qIn[start + i];
    }

    float denom = totalQ + volumes[idx] / dt;
    if (denom <= 0.0f) {
        cNode[idx] = 0.0f;
        return;
    }
    cNode[idx] = (massIn + volumes[idx] * cOld[idx] / dt)
                 / denom;
}

__device__ float findLinkQual(float cUp, float cLink,
                               float flow, float vol,
                               float dt)
{
    if (vol <= 0.0f) return cUp;
    float fraction = fminf(flow * dt / vol, 1.0f);
    return cLink + fraction * (cUp - cLink);
}

__device__ float getMassFlow(float conc, float flow,
                              float dt)
{
    return conc * fabsf(flow) * dt;
}`,
    wasm: `;; qualrout.wat — Water Quality Routing
;; SWMM5 Engine in WebAssembly — Pollutant Transport
;; CSTR mixing at nodes, first-order decay, mass balance

(module
  (func $getDecay
    (param $conc f64) (param $k f64) (param $dt f64)
    (result f64)
    (if (result f64)
      (i32.or
        (f64.le (local.get $k) (f64.const 0.0))
        (f64.le (local.get $dt) (f64.const 0.0)))
      (then (local.get $conc))
      (else
        (f64.mul
          (local.get $conc)
          (call $exp
            (f64.mul
              (f64.neg (local.get $k))
              (local.get $dt)))))))

  (func $findLinkQual
    (param $cUp f64) (param $cLink f64)
    (param $flow f64) (param $vol f64)
    (param $dt f64)
    (result f64)
    (local $fraction f64)
    (if (result f64)
      (f64.le (local.get $vol) (f64.const 0.0))
      (then (local.get $cUp))
      (else
        (local.set $fraction
          (f64.min
            (f64.div
              (f64.mul (local.get $flow) (local.get $dt))
              (local.get $vol))
            (f64.const 1.0)))
        (f64.add
          (local.get $cLink)
          (f64.mul
            (local.get $fraction)
            (f64.sub
              (local.get $cUp)
              (local.get $cLink)))))))

  (func $getMassFlow
    (param $conc f64) (param $flow f64)
    (param $dt f64)
    (result f64)
    (f64.mul
      (f64.mul (local.get $conc)
               (f64.abs (local.get $flow)))
      (local.get $dt)))

  (func $exp (param f64) (result f64)
    (f64.const 0.0))
  (export "getDecay" (func $getDecay))
  (export "findLinkQual" (func $findLinkQual))
  (export "getMassFlow" (func $getMassFlow)))`,
    mojo: `# qualrout.mojo — Water Quality Routing
# SWMM5 Engine in Mojo — Pollutant Transport
# CSTR mixing at nodes, first-order decay, mass balance

from math import exp, abs

struct Pollutant:
    var decay_rate: Float64
    var concen: Float64

    fn __init__(inout self, decay_rate: Float64,
                concen: Float64):
        self.decay_rate = decay_rate
        self.concen = concen

fn get_decay(conc: Float64, k: Float64,
             dt: Float64) -> Float64:
    if k <= 0.0 or dt <= 0.0:
        return conc
    return conc * exp(-k * dt)

fn find_node_qual(q_in: DynamicVector[Float64],
                  c_in: DynamicVector[Float64],
                  volume: Float64, c_old: Float64,
                  dt: Float64) -> Float64:
    var mass_in: Float64 = 0.0
    var total_q: Float64 = 0.0
    for i in range(len(q_in)):
        mass_in += q_in[i] * c_in[i]
        total_q += q_in[i]

    let denom = total_q + volume / dt
    if denom <= 0.0:
        return 0.0
    return (mass_in + volume * c_old / dt) / denom

fn find_link_qual(c_up: Float64, c_link: Float64,
                  flow: Float64, vol: Float64,
                  dt: Float64) -> Float64:
    if vol <= 0.0:
        return c_up
    var fraction = flow * dt / vol
    if fraction > 1.0:
        fraction = 1.0
    return c_link + fraction * (c_up - c_link)

fn get_mass_flow(conc: Float64, flow: Float64,
                 dt: Float64) -> Float64:
    return conc * abs(flow) * dt`,
    java: `// QualRout.java — Water Quality Routing
// SWMM5 Engine in Java — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

package swmm;

public class QualRout {

    public static class Pollutant {
        public double decayRate;
        public double concen;

        public Pollutant(double decayRate, double concen) {
            this.decayRate = decayRate;
            this.concen = concen;
        }
    }

    public static double getDecay(double conc,
                                   double k, double dt) {
        if (k <= 0.0 || dt <= 0.0) return conc;
        return conc * Math.exp(-k * dt);
    }

    public static double findNodeQual(double[] qIn,
            double[] cIn, double volume,
            double cOld, double dt) {
        double massIn = 0.0, totalQ = 0.0;
        for (int i = 0; i < qIn.length; i++) {
            massIn += qIn[i] * cIn[i];
            totalQ += qIn[i];
        }

        double denom = totalQ + volume / dt;
        if (denom <= 0.0) return 0.0;

        return (massIn + volume * cOld / dt) / denom;
    }

    public static double findLinkQual(double cUp,
            double cLink, double flow,
            double vol, double dt) {
        if (vol <= 0.0) return cUp;
        double fraction = Math.min(
            flow * dt / vol, 1.0);
        return cLink + fraction * (cUp - cLink);
    }

    public static double getMassFlow(double conc,
            double flow, double dt) {
        return conc * Math.abs(flow) * dt;
    }
}`,
    nim: `# qualrout.nim — Water Quality Routing
# SWMM5 Engine in Nim — Pollutant Transport
# CSTR mixing at nodes, first-order decay, mass balance

import math

type
  Pollutant = object
    decayRate: float64
    concen: float64

proc getDecay(conc, k, dt: float64): float64 =
  if k <= 0.0 or dt <= 0.0:
    return conc
  result = conc * exp(-k * dt)

proc findNodeQual(qIn, cIn: seq[float64],
                  volume, cOld, dt: float64): float64 =
  var massIn = 0.0
  var totalQ = 0.0
  for i in 0 ..< qIn.len:
    massIn += qIn[i] * cIn[i]
    totalQ += qIn[i]

  let denom = totalQ + volume / dt
  if denom <= 0.0:
    return 0.0
  result = (massIn + volume * cOld / dt) / denom

proc findLinkQual(cUp, cLink, flow,
                  vol, dt: float64): float64 =
  if vol <= 0.0:
    return cUp
  let fraction = min(flow * dt / vol, 1.0)
  result = cLink + fraction * (cUp - cLink)

proc getMassFlow(conc, flow, dt: float64): float64 =
  result = conc * abs(flow) * dt`,
    ada: `-- qualrout.adb — Water Quality Routing
-- SWMM5 Engine in Ada — Pollutant Transport
-- CSTR mixing at nodes, first-order decay, mass balance

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body QualRout is

   type Pollutant is record
      Decay_Rate : Long_Float := 0.0;
      Concen     : Long_Float := 0.0;
   end record;

   type Float_Array is array (Positive range <>)
      of Long_Float;

   function Get_Decay (Conc, K, Dt : Long_Float)
      return Long_Float is
   begin
      if K <= 0.0 or else Dt <= 0.0 then
         return Conc;
      end if;
      return Conc * Exp (-K * Dt);
   end Get_Decay;

   function Find_Node_Qual
      (Q_In, C_In : Float_Array;
       Volume, C_Old, Dt : Long_Float)
      return Long_Float is
      Mass_In : Long_Float := 0.0;
      Total_Q : Long_Float := 0.0;
      Denom   : Long_Float;
   begin
      for I in Q_In'Range loop
         Mass_In := Mass_In + Q_In (I) * C_In (I);
         Total_Q := Total_Q + Q_In (I);
      end loop;

      Denom := Total_Q + Volume / Dt;
      if Denom <= 0.0 then
         return 0.0;
      end if;
      return (Mass_In + Volume * C_Old / Dt) / Denom;
   end Find_Node_Qual;

   function Find_Link_Qual
      (C_Up, C_Link, Flow, Vol, Dt : Long_Float)
      return Long_Float is
      Fraction : Long_Float;
   begin
      if Vol <= 0.0 then
         return C_Up;
      end if;
      Fraction := Long_Float'Min (Flow * Dt / Vol, 1.0);
      return C_Link + Fraction * (C_Up - C_Link);
   end Find_Link_Qual;

   function Get_Mass_Flow
      (Conc, Flow, Dt : Long_Float)
      return Long_Float is
   begin
      return Conc * abs (Flow) * Dt;
   end Get_Mass_Flow;

end QualRout;`,
    chapel: `// qualrout.chpl — Water Quality Routing
// SWMM5 Engine in Chapel — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

record Pollutant {
    var decayRate: real;
    var concen: real;
}

proc getDecay(conc: real, k: real, dt: real): real {
    if k <= 0.0 || dt <= 0.0 then return conc;
    return conc * exp(-k * dt);
}

proc findNodeQual(qIn: [] real, cIn: [] real,
                  volume: real, cOld: real,
                  dt: real): real {
    var massIn: real = 0.0;
    var totalQ: real = 0.0;
    for i in qIn.domain {
        massIn += qIn[i] * cIn[i];
        totalQ += qIn[i];
    }

    const denom = totalQ + volume / dt;
    if denom <= 0.0 then return 0.0;

    return (massIn + volume * cOld / dt) / denom;
}

proc findLinkQual(cUp: real, cLink: real,
                  flow: real, vol: real,
                  dt: real): real {
    if vol <= 0.0 then return cUp;
    const fraction = min(flow * dt / vol, 1.0);
    return cLink + fraction * (cUp - cLink);
}

proc getMassFlow(conc: real, flow: real,
                 dt: real): real {
    return conc * abs(flow) * dt;
}`,
    swift: `// qualrout.swift — Water Quality Routing
// SWMM5 Engine in Swift — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

import Foundation

struct Pollutant {
    var decayRate: Double
    var concen: Double
}

func getDecay(conc: Double, k: Double,
              dt: Double) -> Double {
    guard k > 0.0, dt > 0.0 else { return conc }
    return conc * exp(-k * dt)
}

func findNodeQual(qIn: [Double], cIn: [Double],
                  volume: Double, cOld: Double,
                  dt: Double) -> Double {
    var massIn = 0.0, totalQ = 0.0
    for i in 0..<qIn.count {
        massIn += qIn[i] * cIn[i]
        totalQ += qIn[i]
    }

    let denom = totalQ + volume / dt
    guard denom > 0.0 else { return 0.0 }

    return (massIn + volume * cOld / dt) / denom
}

func findLinkQual(cUp: Double, cLink: Double,
                  flow: Double, vol: Double,
                  dt: Double) -> Double {
    guard vol > 0.0 else { return cUp }
    let fraction = min(flow * dt / vol, 1.0)
    return cLink + fraction * (cUp - cLink)
}

func getMassFlow(conc: Double, flow: Double,
                 dt: Double) -> Double {
    return conc * abs(flow) * dt
}`,
    kotlin: `// QualRout.kt — Water Quality Routing
// SWMM5 Engine in Kotlin — Pollutant Transport
// CSTR mixing at nodes, first-order decay, mass balance

package swmm

import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.min

data class Pollutant(
    val decayRate: Double,
    var concen: Double
)

fun getDecay(conc: Double, k: Double,
             dt: Double): Double {
    if (k <= 0.0 || dt <= 0.0) return conc
    return conc * exp(-k * dt)
}

fun findNodeQual(qIn: DoubleArray, cIn: DoubleArray,
                 volume: Double, cOld: Double,
                 dt: Double): Double {
    var massIn = 0.0
    var totalQ = 0.0
    for (i in qIn.indices) {
        massIn += qIn[i] * cIn[i]
        totalQ += qIn[i]
    }

    val denom = totalQ + volume / dt
    if (denom <= 0.0) return 0.0

    return (massIn + volume * cOld / dt) / denom
}

fun findLinkQual(cUp: Double, cLink: Double,
                 flow: Double, vol: Double,
                 dt: Double): Double {
    if (vol <= 0.0) return cUp
    val fraction = min(flow * dt / vol, 1.0)
    return cLink + fraction * (cUp - cLink)
}

fun getMassFlow(conc: Double, flow: Double,
                dt: Double): Double {
    return conc * abs(flow) * dt
}`,
  },
  "kinwave.c — Kinematic Wave Routing": {
    category: "Hydraulics",
    difficulty: "intermediate",
    tags: ["kinematic wave", "routing", "simplified", "manning", "normal depth", "overland flow", "gravity-driven"],
    description: "Simplified flow routing that assumes friction slope equals bed slope (Sf = S0). Much simpler than dynamic wave — ignores backwater effects, surcharging, and reverse flow. Uses Manning's equation with a Courant-limited explicit scheme. Appropriate for steep conduits where gravity dominates and backwater effects are negligible. Often used for overland flow routing.",
    equations: "Q = (1/n)·A·R^(2/3)·S0^(1/2) (Manning's equation with Sf=S0); A_new = A_old + (dt/dx)·(Q_in - Q_out) (continuity); CFL: dt ≤ dx/c_wave (Courant condition)",
    inputs: "Conduit geometry, bed slope, Manning's n, upstream inflow, time step",
    outputs: "Outflow rate, flow depth, Courant number",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// kinwave.c — Kinematic Wave Routing
// EPA SWMM5 Engine — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

#include <math.h>

typedef struct {
    double length;    // conduit length (ft)
    double slope;     // bed slope (ft/ft)
    double roughness; // Manning's n
    double width;     // channel width (ft)
    double area;      // current flow area (ft²)
    double qOut;      // current outflow (cfs)
} TKinWave;

double kinwave_getNormalFlow(TKinWave* kw, double area)
{
    double hRadius, qNorm;

    if (area <= 0.0 || kw->slope <= 0.0) return 0.0;

    hRadius = area / kw->width;
    qNorm = (1.0 / kw->roughness) * area
            * pow(hRadius, 2.0/3.0)
            * sqrt(kw->slope);
    return qNorm;
}

double kinwave_getWaveCelerity(TKinWave* kw, double area)
{
    double hRadius, celerity;

    if (area <= 0.0) return 0.0;

    hRadius = area / kw->width;
    celerity = (5.0 / 3.0) * (1.0 / kw->roughness)
               * pow(hRadius, 2.0/3.0)
               * sqrt(kw->slope);
    return celerity;
}

double kinwave_execute(TKinWave* kw, double qIn, double dt)
{
    double celerity, courant, aNew;

    celerity = kinwave_getWaveCelerity(kw, kw->area);
    courant = (celerity * dt) / kw->length;

    if (courant > 1.0) courant = 1.0;

    aNew = kw->area
           + (dt / kw->length) * (qIn - kw->qOut);
    if (aNew < 0.0) aNew = 0.0;

    kw->area = aNew;
    kw->qOut = kinwave_getNormalFlow(kw, aNew);
    return kw->qOut;
}`,
    rust: `// kinwave.rs — Kinematic Wave Routing
// SWMM5 Engine in Rust — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

pub struct KinWave {
    pub length: f64,    // conduit length (ft)
    pub slope: f64,     // bed slope (ft/ft)
    pub roughness: f64, // Manning's n
    pub width: f64,     // channel width (ft)
    pub area: f64,      // current flow area (ft²)
    pub q_out: f64,     // current outflow (cfs)
}

impl KinWave {
    pub fn get_normal_flow(&self, area: f64) -> f64 {
        if area <= 0.0 || self.slope <= 0.0 { return 0.0; }

        let h_radius = area / self.width;
        (1.0 / self.roughness) * area
            * h_radius.powf(2.0 / 3.0)
            * self.slope.sqrt()
    }

    pub fn get_wave_celerity(&self, area: f64) -> f64 {
        if area <= 0.0 { return 0.0; }

        let h_radius = area / self.width;
        (5.0 / 3.0) * (1.0 / self.roughness)
            * h_radius.powf(2.0 / 3.0)
            * self.slope.sqrt()
    }

    pub fn execute(&mut self, q_in: f64, dt: f64) -> f64 {
        let celerity = self.get_wave_celerity(self.area);
        let courant = (celerity * dt / self.length).min(1.0);

        let a_new = (self.area
            + (dt / self.length) * (q_in - self.q_out))
            .max(0.0);

        self.area = a_new;
        self.q_out = self.get_normal_flow(a_new);
        self.q_out
    }
}`,
    python: `# kinwave.py — Kinematic Wave Routing
# SWMM5 Engine in Python — Simplified Flow Routing
# Manning's equation with Sf = S0 assumption
# Courant-limited explicit finite-difference scheme

import math
from dataclasses import dataclass

@dataclass
class KinWave:
    length: float    # conduit length (ft)
    slope: float     # bed slope (ft/ft)
    roughness: float # Manning's n
    width: float     # channel width (ft)
    area: float      # current flow area (ft²)
    q_out: float     # current outflow (cfs)

    def get_normal_flow(self, area: float) -> float:
        if area <= 0.0 or self.slope <= 0.0:
            return 0.0
        h_radius = area / self.width
        return ((1.0 / self.roughness) * area
                * h_radius ** (2.0 / 3.0)
                * math.sqrt(self.slope))

    def get_wave_celerity(self, area: float) -> float:
        if area <= 0.0:
            return 0.0
        h_radius = area / self.width
        return ((5.0 / 3.0) * (1.0 / self.roughness)
                * h_radius ** (2.0 / 3.0)
                * math.sqrt(self.slope))

    def execute(self, q_in: float, dt: float) -> float:
        celerity = self.get_wave_celerity(self.area)
        courant = min(celerity * dt / self.length, 1.0)

        a_new = max(self.area
                    + (dt / self.length)
                    * (q_in - self.q_out), 0.0)

        self.area = a_new
        self.q_out = self.get_normal_flow(a_new)
        return self.q_out`,
    fortran: `! kinwave.f90 — Kinematic Wave Routing
! SWMM5 Engine in Fortran — Simplified Flow Routing
! Manning's equation with Sf = S0 assumption
! Courant-limited explicit finite-difference scheme

module kinwave_module
    implicit none

    type :: KinWave
        real(8) :: length    ! conduit length (ft)
        real(8) :: slope     ! bed slope (ft/ft)
        real(8) :: roughness ! Manning's n
        real(8) :: width     ! channel width (ft)
        real(8) :: area      ! current flow area (ft²)
        real(8) :: q_out     ! current outflow (cfs)
    end type KinWave

contains

    function get_normal_flow(kw, area) result(q)
        type(KinWave), intent(in) :: kw
        real(8), intent(in) :: area
        real(8) :: q, h_radius

        if (area <= 0.0d0 .or. kw%slope <= 0.0d0) then
            q = 0.0d0
            return
        end if

        h_radius = area / kw%width
        q = (1.0d0 / kw%roughness) * area &
            * h_radius**(2.0d0/3.0d0) &
            * sqrt(kw%slope)
    end function get_normal_flow

    function get_wave_celerity(kw, area) result(c)
        type(KinWave), intent(in) :: kw
        real(8), intent(in) :: area
        real(8) :: c, h_radius

        if (area <= 0.0d0) then
            c = 0.0d0
            return
        end if

        h_radius = area / kw%width
        c = (5.0d0 / 3.0d0) * (1.0d0 / kw%roughness) &
            * h_radius**(2.0d0/3.0d0) &
            * sqrt(kw%slope)
    end function get_wave_celerity

    subroutine execute(kw, q_in, dt)
        type(KinWave), intent(inout) :: kw
        real(8), intent(in) :: q_in, dt
        real(8) :: celerity, courant, a_new

        celerity = get_wave_celerity(kw, kw%area)
        courant = celerity * dt / kw%length
        if (courant > 1.0d0) courant = 1.0d0

        a_new = kw%area + (dt / kw%length) &
                * (q_in - kw%q_out)
        if (a_new < 0.0d0) a_new = 0.0d0

        kw%area = a_new
        kw%q_out = get_normal_flow(kw, a_new)
    end subroutine execute

end module kinwave_module`,
    julia: `# kinwave.jl — Kinematic Wave Routing
# SWMM5 Engine in Julia — Simplified Flow Routing
# Manning's equation with Sf = S0 assumption
# Courant-limited explicit finite-difference scheme

mutable struct KinWave
    length::Float64    # conduit length (ft)
    slope::Float64     # bed slope (ft/ft)
    roughness::Float64 # Manning's n
    width::Float64     # channel width (ft)
    area::Float64      # current flow area (ft²)
    q_out::Float64     # current outflow (cfs)
end

function get_normal_flow(kw::KinWave, area::Float64)::Float64
    (area ≤ 0.0 || kw.slope ≤ 0.0) && return 0.0

    h_radius = area / kw.width
    return (1.0 / kw.roughness) * area *
           h_radius^(2.0/3.0) * sqrt(kw.slope)
end

function get_wave_celerity(kw::KinWave, area::Float64)::Float64
    area ≤ 0.0 && return 0.0

    h_radius = area / kw.width
    return (5.0 / 3.0) * (1.0 / kw.roughness) *
           h_radius^(2.0/3.0) * sqrt(kw.slope)
end

function execute!(kw::KinWave, q_in::Float64,
                  dt::Float64)::Float64
    celerity = get_wave_celerity(kw, kw.area)
    courant = clamp(celerity * dt / kw.length, 0.0, 1.0)

    a_new = max(kw.area + (dt / kw.length) *
                (q_in - kw.q_out), 0.0)

    kw.area = a_new
    kw.q_out = get_normal_flow(kw, a_new)
    return kw.q_out
end`,
    javascript: `// kinwave.js — Kinematic Wave Routing
// SWMM5 Engine in JavaScript — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

class KinWave {
    constructor(length, slope, roughness, width,
                area, qOut) {
        this.length = length;
        this.slope = slope;
        this.roughness = roughness;
        this.width = width;
        this.area = area;
        this.qOut = qOut;
    }

    getNormalFlow(area) {
        if (area <= 0.0 || this.slope <= 0.0) return 0.0;

        const hRadius = area / this.width;
        return (1.0 / this.roughness) * area
               * Math.pow(hRadius, 2.0 / 3.0)
               * Math.sqrt(this.slope);
    }

    getWaveCelerity(area) {
        if (area <= 0.0) return 0.0;

        const hRadius = area / this.width;
        return (5.0 / 3.0) * (1.0 / this.roughness)
               * Math.pow(hRadius, 2.0 / 3.0)
               * Math.sqrt(this.slope);
    }

    execute(qIn, dt) {
        const celerity = this.getWaveCelerity(this.area);
        const courant = Math.min(
            celerity * dt / this.length, 1.0);

        const aNew = Math.max(this.area
            + (dt / this.length) * (qIn - this.qOut), 0.0);

        this.area = aNew;
        this.qOut = this.getNormalFlow(aNew);
        return this.qOut;
    }
}

export { KinWave };`,
    go: `// kinwave.go — Kinematic Wave Routing
// SWMM5 Engine in Go — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

package swmm

import "math"

type KinWave struct {
    Length    float64 // conduit length (ft)
    Slope    float64 // bed slope (ft/ft)
    Roughness float64 // Manning's n
    Width    float64 // channel width (ft)
    Area     float64 // current flow area (ft²)
    QOut     float64 // current outflow (cfs)
}

func (kw *KinWave) GetNormalFlow(area float64) float64 {
    if area <= 0.0 || kw.Slope <= 0.0 {
        return 0.0
    }

    hRadius := area / kw.Width
    return (1.0 / kw.Roughness) * area *
        math.Pow(hRadius, 2.0/3.0) *
        math.Sqrt(kw.Slope)
}

func (kw *KinWave) GetWaveCelerity(area float64) float64 {
    if area <= 0.0 {
        return 0.0
    }

    hRadius := area / kw.Width
    return (5.0 / 3.0) * (1.0 / kw.Roughness) *
        math.Pow(hRadius, 2.0/3.0) *
        math.Sqrt(kw.Slope)
}

func (kw *KinWave) Execute(qIn, dt float64) float64 {
    celerity := kw.GetWaveCelerity(kw.Area)
    courant := celerity * dt / kw.Length
    if courant > 1.0 {
        courant = 1.0
    }

    aNew := kw.Area + (dt/kw.Length)*(qIn-kw.QOut)
    if aNew < 0.0 {
        aNew = 0.0
    }

    kw.Area = aNew
    kw.QOut = kw.GetNormalFlow(aNew)
    return kw.QOut
}`,
    zig: `// kinwave.zig — Kinematic Wave Routing
// SWMM5 Engine in Zig — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

const std = @import("std");
const math = std.math;

const KinWave = struct {
    length: f64,    // conduit length (ft)
    slope: f64,     // bed slope (ft/ft)
    roughness: f64, // Manning's n
    width: f64,     // channel width (ft)
    area: f64,      // current flow area (ft²)
    q_out: f64,     // current outflow (cfs)

    pub fn getNormalFlow(self: KinWave, area: f64) f64 {
        if (area <= 0.0 or self.slope <= 0.0) return 0.0;

        const h_radius = area / self.width;
        return (1.0 / self.roughness) * area *
            math.pow(f64, h_radius, 2.0 / 3.0) *
            @sqrt(self.slope);
    }

    pub fn getWaveCelerity(self: KinWave, area: f64) f64 {
        if (area <= 0.0) return 0.0;

        const h_radius = area / self.width;
        return (5.0 / 3.0) * (1.0 / self.roughness) *
            math.pow(f64, h_radius, 2.0 / 3.0) *
            @sqrt(self.slope);
    }

    pub fn execute(self: *KinWave, q_in: f64, dt: f64) f64 {
        const celerity = self.getWaveCelerity(self.area);
        _ = math.clamp(celerity * dt / self.length,
                       0.0, 1.0);

        var a_new = self.area +
            (dt / self.length) * (q_in - self.q_out);
        if (a_new < 0.0) a_new = 0.0;

        self.area = a_new;
        self.q_out = self.getNormalFlow(a_new);
        return self.q_out;
    }
};`,
    cpp: `// kinwave.cpp — Kinematic Wave Routing
// SWMM5 Engine in C++ — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

#include <cmath>
#include <algorithm>

namespace swmm {

struct KinWave {
    double length;    // conduit length (ft)
    double slope;     // bed slope (ft/ft)
    double roughness; // Manning's n
    double width;     // channel width (ft)
    double area;      // current flow area (ft²)
    double qOut;      // current outflow (cfs)

    double getNormalFlow(double area) const {
        if (area <= 0.0 || slope <= 0.0) return 0.0;

        double hRadius = area / width;
        return (1.0 / roughness) * area
               * std::pow(hRadius, 2.0 / 3.0)
               * std::sqrt(slope);
    }

    double getWaveCelerity(double area) const {
        if (area <= 0.0) return 0.0;

        double hRadius = area / width;
        return (5.0 / 3.0) * (1.0 / roughness)
               * std::pow(hRadius, 2.0 / 3.0)
               * std::sqrt(slope);
    }

    double execute(double qIn, double dt) {
        double celerity = getWaveCelerity(area);
        double courant = std::min(
            celerity * dt / length, 1.0);

        double aNew = std::max(area
            + (dt / length) * (qIn - qOut), 0.0);

        area = aNew;
        qOut = getNormalFlow(aNew);
        return qOut;
    }
};

} // namespace swmm`,
    csharp: `// KinWave.cs — Kinematic Wave Routing
// SWMM5 Engine in C# — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

using System;

namespace Swmm
{
    public class KinWave
    {
        public double Length { get; set; }
        public double Slope { get; set; }
        public double Roughness { get; set; }
        public double Width { get; set; }
        public double Area { get; set; }
        public double QOut { get; set; }

        public KinWave(double length, double slope,
                       double roughness, double width,
                       double area, double qOut)
        {
            Length = length;
            Slope = slope;
            Roughness = roughness;
            Width = width;
            Area = area;
            QOut = qOut;
        }

        public double GetNormalFlow(double area)
        {
            if (area <= 0.0 || Slope <= 0.0) return 0.0;

            double hRadius = area / Width;
            return (1.0 / Roughness) * area
                * Math.Pow(hRadius, 2.0 / 3.0)
                * Math.Sqrt(Slope);
        }

        public double GetWaveCelerity(double area)
        {
            if (area <= 0.0) return 0.0;

            double hRadius = area / Width;
            return (5.0 / 3.0) * (1.0 / Roughness)
                * Math.Pow(hRadius, 2.0 / 3.0)
                * Math.Sqrt(Slope);
        }

        public double Execute(double qIn, double dt)
        {
            double celerity = GetWaveCelerity(Area);
            double courant = Math.Min(
                celerity * dt / Length, 1.0);

            double aNew = Math.Max(Area
                + (dt / Length) * (qIn - QOut), 0.0);

            Area = aNew;
            QOut = GetNormalFlow(aNew);
            return QOut;
        }
    }
}`,
    matlab: `% kinwave.m — Kinematic Wave Routing
% SWMM5 Engine in MATLAB — Simplified Flow Routing
% Manning's equation with Sf = S0 assumption
% Courant-limited explicit finite-difference scheme

function kw = create_kinwave(len, slope, roughness, ...
                              width, area, q_out)
    kw.length    = len;
    kw.slope     = slope;
    kw.roughness = roughness;
    kw.width     = width;
    kw.area      = area;
    kw.q_out     = q_out;
end

function q = get_normal_flow(kw, area)
    if area <= 0.0 || kw.slope <= 0.0
        q = 0.0;
        return;
    end

    h_radius = area / kw.width;
    q = (1.0 / kw.roughness) * area ...
        * h_radius^(2.0/3.0) ...
        * sqrt(kw.slope);
end

function c = get_wave_celerity(kw, area)
    if area <= 0.0
        c = 0.0;
        return;
    end

    h_radius = area / kw.width;
    c = (5.0/3.0) * (1.0 / kw.roughness) ...
        * h_radius^(2.0/3.0) ...
        * sqrt(kw.slope);
end

function kw = execute(kw, q_in, dt)
    celerity = get_wave_celerity(kw, kw.area);
    courant = min(celerity * dt / kw.length, 1.0);

    a_new = max(kw.area ...
        + (dt / kw.length) * (q_in - kw.q_out), 0.0);

    kw.area  = a_new;
    kw.q_out = get_normal_flow(kw, a_new);
end`,
    r: `# kinwave.R — Kinematic Wave Routing
# SWMM5 Engine in R — Simplified Flow Routing
# Manning's equation with Sf = S0 assumption
# Courant-limited explicit finite-difference scheme

create_kinwave <- function(length, slope, roughness,
                            width, area, q_out) {
    list(
        length    = length,
        slope     = slope,
        roughness = roughness,
        width     = width,
        area      = area,
        q_out     = q_out
    )
}

get_normal_flow <- function(kw, area) {
    if (area <= 0.0 || kw$slope <= 0.0) return(0.0)

    h_radius <- area / kw$width
    (1.0 / kw$roughness) * area *
        h_radius^(2.0 / 3.0) * sqrt(kw$slope)
}

get_wave_celerity <- function(kw, area) {
    if (area <= 0.0) return(0.0)

    h_radius <- area / kw$width
    (5.0 / 3.0) * (1.0 / kw$roughness) *
        h_radius^(2.0 / 3.0) * sqrt(kw$slope)
}

execute <- function(kw, q_in, dt) {
    celerity <- get_wave_celerity(kw, kw$area)
    courant <- min(celerity * dt / kw$length, 1.0)

    a_new <- max(kw$area +
        (dt / kw$length) * (q_in - kw$q_out), 0.0)

    kw$area  <- a_new
    kw$q_out <- get_normal_flow(kw, a_new)
    kw
}`,
    delphi: `{ kinwave.pas — Kinematic Wave Routing }
{ SWMM5 Engine in Delphi — Simplified Flow Routing }
{ Manning's equation with Sf = S0 assumption }
{ Courant-limited explicit finite-difference scheme }

unit KinWave;

interface

type
  TKinWave = class
  private
    FLength: Double;
    FSlope: Double;
    FRoughness: Double;
    FWidth: Double;
    FArea: Double;
    FQOut: Double;
  public
    constructor Create(ALength, ASlope, ARoughness,
                       AWidth, AArea, AQOut: Double);
    function GetNormalFlow(Area: Double): Double;
    function GetWaveCelerity(Area: Double): Double;
    function Execute(QIn, Dt: Double): Double;
    property Area: Double read FArea;
    property QOut: Double read FQOut;
  end;

implementation

uses Math;

constructor TKinWave.Create(ALength, ASlope, ARoughness,
                             AWidth, AArea, AQOut: Double);
begin
  FLength    := ALength;
  FSlope     := ASlope;
  FRoughness := ARoughness;
  FWidth     := AWidth;
  FArea      := AArea;
  FQOut      := AQOut;
end;

function TKinWave.GetNormalFlow(Area: Double): Double;
var
  HRadius: Double;
begin
  if (Area <= 0.0) or (FSlope <= 0.0) then
    Exit(0.0);

  HRadius := Area / FWidth;
  Result := (1.0 / FRoughness) * Area
            * Power(HRadius, 2.0/3.0)
            * Sqrt(FSlope);
end;

function TKinWave.GetWaveCelerity(Area: Double): Double;
var
  HRadius: Double;
begin
  if Area <= 0.0 then
    Exit(0.0);

  HRadius := Area / FWidth;
  Result := (5.0/3.0) * (1.0 / FRoughness)
            * Power(HRadius, 2.0/3.0)
            * Sqrt(FSlope);
end;

function TKinWave.Execute(QIn, Dt: Double): Double;
var
  Celerity, Courant, ANew: Double;
begin
  Celerity := GetWaveCelerity(FArea);
  Courant := Min(Celerity * Dt / FLength, 1.0);

  ANew := Max(FArea + (Dt / FLength)
              * (QIn - FQOut), 0.0);

  FArea := ANew;
  FQOut := GetNormalFlow(ANew);
  Result := FQOut;
end;

end.`,
    typescript: `// kinwave.ts — Kinematic Wave Routing
// SWMM5 Engine in TypeScript — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

interface KinWaveParams {
    length: number;
    slope: number;
    roughness: number;
    width: number;
    area: number;
    qOut: number;
}

class KinWave {
    length: number;
    slope: number;
    roughness: number;
    width: number;
    area: number;
    qOut: number;

    constructor(params: KinWaveParams) {
        this.length = params.length;
        this.slope = params.slope;
        this.roughness = params.roughness;
        this.width = params.width;
        this.area = params.area;
        this.qOut = params.qOut;
    }

    getNormalFlow(area: number): number {
        if (area <= 0.0 || this.slope <= 0.0) return 0.0;

        const hRadius: number = area / this.width;
        return (1.0 / this.roughness) * area
            * Math.pow(hRadius, 2.0 / 3.0)
            * Math.sqrt(this.slope);
    }

    getWaveCelerity(area: number): number {
        if (area <= 0.0) return 0.0;

        const hRadius: number = area / this.width;
        return (5.0 / 3.0) * (1.0 / this.roughness)
            * Math.pow(hRadius, 2.0 / 3.0)
            * Math.sqrt(this.slope);
    }

    execute(qIn: number, dt: number): number {
        const celerity: number =
            this.getWaveCelerity(this.area);
        const courant: number = Math.min(
            celerity * dt / this.length, 1.0);

        const aNew: number = Math.max(this.area
            + (dt / this.length)
            * (qIn - this.qOut), 0.0);

        this.area = aNew;
        this.qOut = this.getNormalFlow(aNew);
        return this.qOut;
    }
}

export { KinWave };`,
    cuda: `// kinwave.cu — Kinematic Wave Routing
// SWMM5 Engine in CUDA — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

#include <math.h>

struct KinWave {
    float length;
    float slope;
    float roughness;
    float width;
    float area;
    float qOut;
};

__device__ float getNormalFlow(const KinWave* kw,
                               float area)
{
    if (area <= 0.0f || kw->slope <= 0.0f) return 0.0f;

    float hRadius = area / kw->width;
    return (1.0f / kw->roughness) * area
           * powf(hRadius, 2.0f/3.0f)
           * sqrtf(kw->slope);
}

__device__ float getWaveCelerity(const KinWave* kw,
                                  float area)
{
    if (area <= 0.0f) return 0.0f;

    float hRadius = area / kw->width;
    return (5.0f/3.0f) * (1.0f / kw->roughness)
           * powf(hRadius, 2.0f/3.0f)
           * sqrtf(kw->slope);
}

__global__ void kinwaveKernel(KinWave* conduits,
    float* qIn, float dt, int n)
{
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= n) return;

    KinWave kw = conduits[idx];
    float celerity = getWaveCelerity(&kw, kw.area);
    float courant = fminf(
        celerity * dt / kw.length, 1.0f);

    float aNew = kw.area
        + (dt / kw.length) * (qIn[idx] - kw.qOut);
    if (aNew < 0.0f) aNew = 0.0f;

    conduits[idx].area = aNew;
    conduits[idx].qOut = getNormalFlow(&kw, aNew);
}`,
    wasm: `;; kinwave.wat — Kinematic Wave Routing
;; SWMM5 Engine in WebAssembly — Simplified Flow Routing
;; Manning's equation with Sf = S0 assumption
;; Courant-limited explicit finite-difference scheme

(module
  (func $getNormalFlow
    (param $roughness f64) (param $width f64)
    (param $slope f64) (param $area f64)
    (result f64)

    (if (result f64) (f64.le (local.get $area)
                              (f64.const 0.0))
      (then (f64.const 0.0))
      (else
        (f64.mul
          (f64.mul
            (f64.div (f64.const 1.0)
                     (local.get $roughness))
            (local.get $area))
          (f64.mul
            (call $pow
              (f64.div (local.get $area)
                       (local.get $width))
              (f64.div (f64.const 2.0)
                       (f64.const 3.0)))
            (f64.sqrt (local.get $slope)))))))

  (func $getWaveCelerity
    (param $roughness f64) (param $width f64)
    (param $slope f64) (param $area f64)
    (result f64)

    (if (result f64) (f64.le (local.get $area)
                              (f64.const 0.0))
      (then (f64.const 0.0))
      (else
        (f64.mul
          (f64.mul
            (f64.div (f64.const 5.0) (f64.const 3.0))
            (f64.div (f64.const 1.0)
                     (local.get $roughness)))
          (f64.mul
            (call $pow
              (f64.div (local.get $area)
                       (local.get $width))
              (f64.div (f64.const 2.0)
                       (f64.const 3.0)))
            (f64.sqrt (local.get $slope)))))))

  (func $pow (param f64) (param f64) (result f64)
    f64.const 0.0)
)`,
    mojo: `# kinwave.mojo — Kinematic Wave Routing
# SWMM5 Engine in Mojo — Simplified Flow Routing
# Manning's equation with Sf = S0 assumption
# Courant-limited explicit finite-difference scheme

from math import sqrt, pow

struct KinWave:
    var length: Float64
    var slope: Float64
    var roughness: Float64
    var width: Float64
    var area: Float64
    var q_out: Float64

    fn __init__(inout self, length: Float64,
                slope: Float64, roughness: Float64,
                width: Float64, area: Float64,
                q_out: Float64):
        self.length = length
        self.slope = slope
        self.roughness = roughness
        self.width = width
        self.area = area
        self.q_out = q_out

    fn get_normal_flow(self, area: Float64) -> Float64:
        if area <= 0.0 or self.slope <= 0.0:
            return 0.0

        let h_radius = area / self.width
        return ((1.0 / self.roughness) * area
                * pow(h_radius, 2.0 / 3.0)
                * sqrt(self.slope))

    fn get_wave_celerity(self, area: Float64) -> Float64:
        if area <= 0.0:
            return 0.0

        let h_radius = area / self.width
        return ((5.0 / 3.0) * (1.0 / self.roughness)
                * pow(h_radius, 2.0 / 3.0)
                * sqrt(self.slope))

    fn execute(inout self, q_in: Float64,
               dt: Float64) -> Float64:
        let celerity = self.get_wave_celerity(self.area)
        let courant = min(
            celerity * dt / self.length, 1.0)

        var a_new = self.area + (dt / self.length) \
                    * (q_in - self.q_out)
        if a_new < 0.0:
            a_new = 0.0

        self.area = a_new
        self.q_out = self.get_normal_flow(a_new)
        return self.q_out`,
    java: `// KinWave.java — Kinematic Wave Routing
// SWMM5 Engine in Java — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

package swmm;

public class KinWave {
    private double length;
    private double slope;
    private double roughness;
    private double width;
    private double area;
    private double qOut;

    public KinWave(double length, double slope,
                   double roughness, double width,
                   double area, double qOut) {
        this.length = length;
        this.slope = slope;
        this.roughness = roughness;
        this.width = width;
        this.area = area;
        this.qOut = qOut;
    }

    public double getNormalFlow(double area) {
        if (area <= 0.0 || slope <= 0.0) return 0.0;

        double hRadius = area / width;
        return (1.0 / roughness) * area
            * Math.pow(hRadius, 2.0 / 3.0)
            * Math.sqrt(slope);
    }

    public double getWaveCelerity(double area) {
        if (area <= 0.0) return 0.0;

        double hRadius = area / width;
        return (5.0 / 3.0) * (1.0 / roughness)
            * Math.pow(hRadius, 2.0 / 3.0)
            * Math.sqrt(slope);
    }

    public double execute(double qIn, double dt) {
        double celerity = getWaveCelerity(area);
        double courant = Math.min(
            celerity * dt / length, 1.0);

        double aNew = Math.max(area
            + (dt / length) * (qIn - qOut), 0.0);

        area = aNew;
        qOut = getNormalFlow(aNew);
        return qOut;
    }

    public double getArea() { return area; }
    public double getQOut() { return qOut; }
}`,
    nim: `# kinwave.nim — Kinematic Wave Routing
# SWMM5 Engine in Nim — Simplified Flow Routing
# Manning's equation with Sf = S0 assumption
# Courant-limited explicit finite-difference scheme

import math

type
  KinWave = object
    length: float64
    slope: float64
    roughness: float64
    width: float64
    area: float64
    qOut: float64

proc getNormalFlow(kw: KinWave, area: float64): float64 =
  if area <= 0.0 or kw.slope <= 0.0:
    return 0.0

  let hRadius = area / kw.width
  result = (1.0 / kw.roughness) * area *
           pow(hRadius, 2.0 / 3.0) *
           sqrt(kw.slope)

proc getWaveCelerity(kw: KinWave, area: float64): float64 =
  if area <= 0.0:
    return 0.0

  let hRadius = area / kw.width
  result = (5.0 / 3.0) * (1.0 / kw.roughness) *
           pow(hRadius, 2.0 / 3.0) *
           sqrt(kw.slope)

proc execute(kw: var KinWave, qIn, dt: float64): float64 =
  let celerity = kw.getWaveCelerity(kw.area)
  let courant = min(celerity * dt / kw.length, 1.0)

  var aNew = kw.area +
    (dt / kw.length) * (qIn - kw.qOut)
  if aNew < 0.0: aNew = 0.0

  kw.area = aNew
  kw.qOut = kw.getNormalFlow(aNew)
  result = kw.qOut`,
    ada: `-- kinwave.adb — Kinematic Wave Routing
-- SWMM5 Engine in Ada — Simplified Flow Routing
-- Manning's equation with Sf = S0 assumption
-- Courant-limited explicit finite-difference scheme

with Ada.Numerics.Elementary_Functions;
use  Ada.Numerics.Elementary_Functions;

package body KinWave is

   type KinWave_Record is record
      Length    : Long_Float;
      Slope    : Long_Float;
      Roughness: Long_Float;
      Width    : Long_Float;
      Area     : Long_Float;
      Q_Out    : Long_Float;
   end record;

   function Get_Normal_Flow
     (KW : KinWave_Record; Area : Long_Float)
      return Long_Float
   is
      H_Radius : Long_Float;
   begin
      if Area <= 0.0 or else KW.Slope <= 0.0 then
         return 0.0;
      end if;

      H_Radius := Area / KW.Width;
      return (1.0 / KW.Roughness) * Area
         * H_Radius ** (2.0 / 3.0)
         * Sqrt(KW.Slope);
   end Get_Normal_Flow;

   function Get_Wave_Celerity
     (KW : KinWave_Record; Area : Long_Float)
      return Long_Float
   is
      H_Radius : Long_Float;
   begin
      if Area <= 0.0 then
         return 0.0;
      end if;

      H_Radius := Area / KW.Width;
      return (5.0 / 3.0) * (1.0 / KW.Roughness)
         * H_Radius ** (2.0 / 3.0)
         * Sqrt(KW.Slope);
   end Get_Wave_Celerity;

   procedure Execute
     (KW : in out KinWave_Record;
      Q_In : Long_Float; Dt : Long_Float)
   is
      Celerity, Courant, A_New : Long_Float;
   begin
      Celerity := Get_Wave_Celerity(KW, KW.Area);
      Courant := Long_Float'Min(
         Celerity * Dt / KW.Length, 1.0);

      A_New := Long_Float'Max(KW.Area
         + (Dt / KW.Length) * (Q_In - KW.Q_Out), 0.0);

      KW.Area  := A_New;
      KW.Q_Out := Get_Normal_Flow(KW, A_New);
   end Execute;

end KinWave;`,
    chapel: `// kinwave.chpl — Kinematic Wave Routing
// SWMM5 Engine in Chapel — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

record KinWave {
    var length: real;
    var slope: real;
    var roughness: real;
    var width: real;
    var area: real;
    var qOut: real;

    proc getNormalFlow(area: real): real {
        if area <= 0.0 || slope <= 0.0 then return 0.0;

        const hRadius = area / width;
        return (1.0 / roughness) * area
            * hRadius ** (2.0 / 3.0)
            * sqrt(slope);
    }

    proc getWaveCelerity(area: real): real {
        if area <= 0.0 then return 0.0;

        const hRadius = area / width;
        return (5.0 / 3.0) * (1.0 / roughness)
            * hRadius ** (2.0 / 3.0)
            * sqrt(slope);
    }

    proc ref execute(qIn: real, dt: real): real {
        const celerity = getWaveCelerity(area);
        const courant = min(
            celerity * dt / length, 1.0);

        var aNew = area
            + (dt / length) * (qIn - qOut);
        if aNew < 0.0 then aNew = 0.0;

        area = aNew;
        qOut = getNormalFlow(aNew);
        return qOut;
    }
}`,
    swift: `// kinwave.swift — Kinematic Wave Routing
// SWMM5 Engine in Swift — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

import Foundation

struct KinWave {
    let length: Double
    let slope: Double
    let roughness: Double
    let width: Double
    var area: Double
    var qOut: Double

    func getNormalFlow(area: Double) -> Double {
        guard area > 0.0, slope > 0.0 else { return 0.0 }

        let hRadius = area / width
        return (1.0 / roughness) * area
            * pow(hRadius, 2.0 / 3.0)
            * sqrt(slope)
    }

    func getWaveCelerity(area: Double) -> Double {
        guard area > 0.0 else { return 0.0 }

        let hRadius = area / width
        return (5.0 / 3.0) * (1.0 / roughness)
            * pow(hRadius, 2.0 / 3.0)
            * sqrt(slope)
    }

    mutating func execute(qIn: Double,
                          dt: Double) -> Double {
        let celerity = getWaveCelerity(area: area)
        let courant = min(
            celerity * dt / length, 1.0)

        let aNew = max(area
            + (dt / length) * (qIn - qOut), 0.0)

        area = aNew
        qOut = getNormalFlow(area: aNew)
        return qOut
    }
}`,
    kotlin: `// KinWave.kt — Kinematic Wave Routing
// SWMM5 Engine in Kotlin — Simplified Flow Routing
// Manning's equation with Sf = S0 assumption
// Courant-limited explicit finite-difference scheme

package swmm

import kotlin.math.*

data class KinWave(
    val length: Double,
    val slope: Double,
    val roughness: Double,
    val width: Double,
    var area: Double,
    var qOut: Double
) {
    fun getNormalFlow(area: Double): Double {
        if (area <= 0.0 || slope <= 0.0) return 0.0

        val hRadius = area / width
        return (1.0 / roughness) * area *
            hRadius.pow(2.0 / 3.0) * sqrt(slope)
    }

    fun getWaveCelerity(area: Double): Double {
        if (area <= 0.0) return 0.0

        val hRadius = area / width
        return (5.0 / 3.0) * (1.0 / roughness) *
            hRadius.pow(2.0 / 3.0) * sqrt(slope)
    }

    fun execute(qIn: Double, dt: Double): Double {
        val celerity = getWaveCelerity(area)
        val courant = min(
            celerity * dt / length, 1.0)

        val aNew = max(area +
            (dt / length) * (qIn - qOut), 0.0)

        area = aNew
        qOut = getNormalFlow(aNew)
        return qOut
    }
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
  { id: "zig", label: "Zig", ext: ".zig", color: "#F7A41D" },
  { id: "cpp", label: "C++", ext: ".cpp", color: "#f34b7d" },
  { id: "csharp", label: "C#", ext: ".cs", color: "#178600" },
  { id: "matlab", label: "MATLAB", ext: ".m", color: "#e16737" },
  { id: "r", label: "R", ext: ".R", color: "#198CE7" },
  { id: "delphi", label: "Delphi", ext: ".pas", color: "#E3F171" },
  { id: "typescript", label: "TypeScript", ext: ".ts", color: "#3178C6" },
  { id: "cuda", label: "CUDA", ext: ".cu", color: "#76B900" },
  { id: "wasm", label: "WAT/WASM", ext: ".wat", color: "#654FF0" },
  { id: "mojo", label: "Mojo", ext: ".mojo", color: "#FF4F00" },
  { id: "java", label: "Java", ext: ".java", color: "#B07219" },
  { id: "nim", label: "Nim", ext: ".nim", color: "#FFE953" },
  { id: "ada", label: "Ada", ext: ".adb", color: "#02F88C" },
  { id: "chapel", label: "Chapel", ext: ".chpl", color: "#8DC63F" },
  { id: "swift", label: "Swift", ext: ".swift", color: "#F05138" },
  { id: "kotlin", label: "Kotlin", ext: ".kt", color: "#A97BFF" },
];

const translationNotes = {
  "ada-c": "C's typedef struct becomes Ada's record type. math.h functions (pow, sqrt, fabs) maps to Ada.Numerics functions. C's manual malloc/free memory contrasts with Ada's stack with controlled types approach. static, weak typing meets static, very strong typing.",
  "ada-chapel": "Both emphasize safety and correctness for critical systems. Ada's strong typing and in/out parameters vs Chapel's domain-based parallelism. Ada targets safety-critical infrastructure; Chapel targets HPC clusters. Both would serve large-scale drainage network modeling — Ada for reliability, Chapel for scalability.",
  "ada-cpp": "C++'s class/struct with methods becomes Ada's record type. std::pow, std::sqrt maps to Ada.Numerics functions. C++'s manual or smart pointers memory contrasts with Ada's stack with controlled types approach. static with templates typing meets static, very strong typing.",
  "ada-csharp": "C#'s class with properties becomes Ada's record type. Math class maps to Ada.Numerics functions. C#'s garbage collected (.NET) memory contrasts with Ada's stack with controlled types approach. static, strong typing meets static, very strong typing.",
  "ada-cuda": "CUDA's struct with __device__ functions becomes Ada's record type. device math (sqrtf, powf) maps to Ada.Numerics functions. CUDA's explicit GPU allocation memory contrasts with Ada's stack with controlled types approach. static (C-based) typing meets static, very strong typing.",
  "ada-delphi": "Delphi/Pascal's class (TMyClass) becomes Ada's record type. Math unit maps to Ada.Numerics functions. Delphi/Pascal's manual or ARC memory contrasts with Ada's stack with controlled types approach. static, strong typing meets static, very strong typing.",
  "ada-fortran": "Fortran's derived type becomes Ada's record type. intrinsic functions maps to Ada.Numerics functions. Fortran's stack/allocatable memory contrasts with Ada's stack with controlled types approach. static with intent typing meets static, very strong typing.",
  "ada-go": "Go's struct with methods becomes Ada's record type. math package maps to Ada.Numerics functions. Go's garbage collected memory contrasts with Ada's stack with controlled types approach. static, simple typing meets static, very strong typing.",
  "ada-java": "Java's class with getters/setters becomes Ada's record type. Math class maps to Ada.Numerics functions. Java's garbage collected (JVM) memory contrasts with Ada's stack with controlled types approach. static, strong typing meets static, very strong typing.",
  "ada-javascript": "JavaScript's class with constructor becomes Ada's record type. Math object maps to Ada.Numerics functions. JavaScript's garbage collected memory contrasts with Ada's stack with controlled types approach. dynamic typing meets static, very strong typing.",
  "ada-julia": "Julia's mutable struct becomes Ada's record type. built-in Unicode operators maps to Ada.Numerics functions. Julia's garbage collected memory contrasts with Ada's stack with controlled types approach. dynamic with multiple dispatch typing meets static, very strong typing.",
  "ada-kotlin": "Ada's record type becomes Kotlin's data class. Ada.Numerics functions maps to kotlin.math. Ada's stack with controlled types memory contrasts with Kotlin's garbage collected (JVM) approach. static, very strong typing meets static, null-safe typing.",
  "ada-matlab": "MATLAB's struct or classdef becomes Ada's record type. built-in functions maps to Ada.Numerics functions. MATLAB's automatic memory contrasts with Ada's stack with controlled types approach. dynamic, matrix-native typing meets static, very strong typing.",
  "ada-mojo": "Mojo's struct with fn becomes Ada's record type. built-in or math module maps to Ada.Numerics functions. Mojo's ownership model memory contrasts with Ada's stack with controlled types approach. static, Python-compatible typing meets static, very strong typing.",
  "ada-nim": "Nim's type = object becomes Ada's record type. math module maps to Ada.Numerics functions. Nim's garbage collected memory contrasts with Ada's stack with controlled types approach. static, inferred typing meets static, very strong typing.",
  "ada-python": "Python's @dataclass becomes Ada's record type. math module maps to Ada.Numerics functions. Python's garbage collected memory contrasts with Ada's stack with controlled types approach. dynamic with optional hints typing meets static, very strong typing.",
  "ada-r": "R's list or R6 class becomes Ada's record type. built-in functions maps to Ada.Numerics functions. R's garbage collected memory contrasts with Ada's stack with controlled types approach. dynamic, vector-native typing meets static, very strong typing.",
  "ada-rust": "Rust's struct with impl blocks becomes Ada's record type. .powf(), .sqrt(), .abs() maps to Ada.Numerics functions. Rust's ownership/borrowing system memory contrasts with Ada's stack with controlled types approach. static, strong with lifetimes typing meets static, very strong typing.",
  "ada-swift": "Ada's record type becomes Swift's struct with mutating func. Ada.Numerics functions maps to Foundation/Darwin math. Ada's stack with controlled types memory contrasts with Swift's ARC (automatic reference counting) approach. static, very strong typing meets static, strong with optionals typing.",
  "ada-typescript": "TypeScript's class with interface becomes Ada's record type. Math object maps to Ada.Numerics functions. TypeScript's garbage collected memory contrasts with Ada's stack with controlled types approach. static (structural) typing meets static, very strong typing.",
  "ada-wasm": "WebAssembly/WAT's linear memory layout becomes Ada's record type. f64.mul, f64.sqrt maps to Ada.Numerics functions. WebAssembly/WAT's linear memory (manual) memory contrasts with Ada's stack with controlled types approach. static (i32/i64/f32/f64) typing meets static, very strong typing.",
  "ada-zig": "Zig's struct with namespaced fn becomes Ada's record type. @sqrt, std.math.pow maps to Ada.Numerics functions. Zig's manual with allocator interface memory contrasts with Ada's stack with controlled types approach. static with comptime typing meets static, very strong typing.",
  "c-ada": "Both prioritize explicit, safety-critical code. C's typedef struct becomes Ada's record type. Pointer parameters become Ada's in/out/in out parameter modes. C's #define becomes Ada's constant declarations. Ada's stronger type system prevents the implicit conversions that cause bugs in C. Ada is used in safety-critical infrastructure modeling.",
  "c-chapel": "C's sequential loops become Chapel's parallel forall/coforall. The struct becomes a Chapel record. C's manual memory management becomes Chapel's automatic memory. Chapel's domain-based arrays replace C's pointer-indexed arrays. This translation shows how drainage network computations could scale to HPC systems.",
  "c-cpp": "The most natural translation. C's typedef struct becomes a C++ class with member functions. Pointer dereferences (c->field) become this->field or direct member access. C's #define constants become constexpr. Manual function naming (conduit_getFlow) becomes method namespacing (Conduit::getFlow). C++ adds RAII, std::clamp, and type safety while maintaining C's performance. Most SWMM extensions and the OWA rewrite effort use C++.",
  "c-csharp": "C's low-level pointer manipulation becomes C#'s managed, garbage-collected objects. The typedef struct becomes a class with properties and auto-implemented getters/setters. pow() and sqrt() become Math.Pow() and Math.Sqrt(). C's header files become C# namespaces. The .NET ecosystem is heavily used in EPA's Windows-based tools, and several SWMM wrappers exist in C#.",
  "c-cuda": "C's sequential algorithms become CUDA's massively parallel kernels. The struct is preserved but functions gain __global__/__device__ qualifiers. Each conduit/node computation maps to a GPU thread via threadIdx/blockIdx. C's single-threaded loops become parallel grid launches. This translation shows how hydraulic solvers can be GPU-accelerated — an active research frontier.",
  "c-delphi": "Historical connection — the original SWMM5 GUI was written in Delphi. C's typedef struct becomes a Delphi class (TConduit). Pointer access becomes Self.Field. C's {} blocks become begin/end. Function return values use Result := instead of return. Delphi's strong typing and RAD capabilities made it ideal for the SWMM5 graphical interface.",
  "c-fortran": "Full circle \u2014 SWMM3 was originally Fortran! The pointer dereference uh->t becomes uh%t using Fortran's derived type syntax. Arrays use 1-based indexing (rainfall(j+1) vs rainfall[j]). The explicit intent(in/inout) declarations make data flow clearer than C's pointer-based approach. The module/contains pattern replaces C's header files. real(8) provides double precision. Subroutines replace functions when modifying arguments in-place.",
  "c-go": "Go uses exported names (capitalized: GetRunoff vs get_runoff) instead of public/private keywords. Methods are defined outside the struct with receiver syntax (func (s *Subcatch) GetRunoff()). Pointer receivers (*Type) indicate mutation, value receivers indicate pure computation. The math package provides numerical functions. Error handling would typically use multiple returns (result, error). Simple, readable, and fast \u2014 Go's philosophy matches C's directness.",
  "c-java": "C's procedural structs become Java's class hierarchy. Pointer access becomes getter/setter methods. C's #include becomes Java's import/package system. Math functions move to the Math class. Java's enterprise patterns (encapsulation, inheritance) add structure but verbosity. Many water utility SCADA and GIS systems use Java.",
  "c-javascript": "The typedef struct becomes a JavaScript class with constructor. C's sqrt() and pow() become Math.sqrt() and Math.pow(). Computed properties use getter syntax (get tBase()). ES module exports make the code ready for browser-based SWMM implementations and WebAssembly integration. Math.max/Math.min replace manual bounds checking. No pointer arithmetic \u2014 everything is reference-based.",
  "c-julia": "Julia's multiple dispatch replaces C's function naming conventions \u2014 get_runoff(sc, depth) instead of subcatch_getRunoff(sc, depth). The \u2264 operator is native Unicode syntax. Julia uses 1-based indexing like Fortran. Short-circuit returns (expr && return val) are idiomatic. Structs are immutable by default; use mutable struct when state changes are needed. The ! convention (update_level!) signals mutation to callers.",
  "c-kotlin": "C's typedef struct becomes Kotlin's data class. Pointer access becomes property access. C's switch becomes Kotlin's when expression. Null safety (?.) prevents the null pointer bugs common in C. Extension functions can add SWMM-specific operations to standard types. Kotlin runs on the JVM alongside Java-based water utility systems.",
  "c-matlab": "C's struct becomes a MATLAB struct or classdef. Pointer access (c->field) becomes dot notation (c.field). C's for loops can often become vectorized MATLAB operations. pow() and sqrt() are built-in MATLAB functions. MATLAB's 1-based indexing requires careful translation from C's 0-based arrays. MATLAB is the dominant prototyping language in hydraulic engineering education.",
  "c-mojo": "Mojo bridges C's performance with Python's syntax. C's typedef struct becomes a Mojo struct with fn methods. Pointer semantics map to Mojo's borrowed/owned/inout parameters. C's pow() and sqrt() become built-in Mojo functions. Mojo promises C-like speed with Python-like readability — directly relevant to the PySWMM community.",
  "c-nim": "Nim compiles to C, making this translation particularly interesting. C's typedef struct becomes Nim's type object. Pointer dereferences become dot notation. C's explicit types become Nim's type inference. The result variable replaces return statements. Nim's Python-like syntax with C's performance makes it a fascinating middle ground.",
  "c-python": "The typedef struct becomes a Python @dataclass with type hints. C's pointer-based access (sc->width) becomes simple dot notation (self.width). Manual memory management disappears entirely. The nested for loops can be replaced with list comprehensions or numpy operations (np.convolve). Python's readability makes the algorithm's intent clearer, though at the cost of runtime performance. Enum classes replace C's #define or enum constants.",
  "c-r": "C's typedef struct becomes an R list or R6 class. Pointer access becomes $ notation (obj$field). C's math.h functions are built-in R functions. R's vectorized operations can replace many C loops. The swmmr package already bridges C SWMM5 with R for calibration and analysis. R excels at statistical post-processing of SWMM results.",
  "c-rust": "Rust enforces memory safety at compile time. The C typedef struct becomes a Rust struct with pub fields. Pointer dereferences (uh->t) become owned references (&self). Manual bounds checking is replaced by .clamp(). C's pow() becomes .powf(), and sqrt() becomes .sqrt(). The nested for loops can be replaced with iterator chains (.iter().map().sum()). No null pointers possible \u2014 the type system prevents it. Mutable state uses &mut self instead of pointer modification.",
  "c-swift": "C's typedef struct becomes Swift's struct with methods. Pointer dereferences become self.field. C's manual memory becomes Swift's ARC. Optional types (Double?) replace null pointer checks. guard/let statements provide safe unwrapping. Swift enables mobile SWMM tools for field engineers on iOS.",
  "c-typescript": "Like C-to-JavaScript but with static type annotations. C's typedef struct becomes a TypeScript interface + class. Type safety is enforced at compile time (number, string, boolean). C's pointer arithmetic disappears. TypeScript's structural typing provides a middle ground between C's weak typing and full static typing.",
  "c-wasm": "C's high-level constructs become WebAssembly's low-level stack machine instructions. Structs become linear memory layouts with offset-based access. Variables become local.get/local.set operations. Math functions become f64.mul, f64.sqrt, etc. This translation connects to compiling SWMM5 to WASM via Emscripten for browser-based simulation.",
  "c-zig": "Zig replaces C's preprocessor macros and typedefs with comptime and explicit struct definitions. C's pointer dereference (c->width) becomes Zig's dot access on pointer (c.width). malloc/free are replaced by Zig's allocator interface or stack allocation. C's pow() and sqrt() become @sqrt() and std.math.pow(). Zig's explicit error handling via error unions (!T) replaces C's error-code-return convention. No hidden control flow — Zig's philosophy aligns with C's directness while adding safety.",
  "chapel-cpp": "C++'s class/struct with methods becomes Chapel's record or class. std::pow, std::sqrt maps to built-in math. C++'s manual or smart pointers memory contrasts with Chapel's automatic/managed approach. static with templates typing meets static, inferred typing.",
  "chapel-csharp": "C#'s class with properties becomes Chapel's record or class. Math class maps to built-in math. C#'s garbage collected (.NET) memory contrasts with Chapel's automatic/managed approach. static, strong typing meets static, inferred typing.",
  "chapel-cuda": "CUDA's struct with __device__ functions becomes Chapel's record or class. device math (sqrtf, powf) maps to built-in math. CUDA's explicit GPU allocation memory contrasts with Chapel's automatic/managed approach. static (C-based) typing meets static, inferred typing.",
  "chapel-delphi": "Delphi/Pascal's class (TMyClass) becomes Chapel's record or class. Math unit maps to built-in math. Delphi/Pascal's manual or ARC memory contrasts with Chapel's automatic/managed approach. static, strong typing meets static, inferred typing.",
  "chapel-fortran": "Fortran's derived type becomes Chapel's record or class. intrinsic functions maps to built-in math. Fortran's stack/allocatable memory contrasts with Chapel's automatic/managed approach. static with intent typing meets static, inferred typing.",
  "chapel-go": "Go's struct with methods becomes Chapel's record or class. math package maps to built-in math. Go's garbage collected memory contrasts with Chapel's automatic/managed approach. static, simple typing meets static, inferred typing.",
  "chapel-java": "Java's class with getters/setters becomes Chapel's record or class. Math class maps to built-in math. Java's garbage collected (JVM) memory contrasts with Chapel's automatic/managed approach. static, strong typing meets static, inferred typing.",
  "chapel-javascript": "JavaScript's class with constructor becomes Chapel's record or class. Math object maps to built-in math. JavaScript's garbage collected memory contrasts with Chapel's automatic/managed approach. dynamic typing meets static, inferred typing.",
  "chapel-julia": "Julia's mutable struct becomes Chapel's record or class. built-in Unicode operators maps to built-in math. Julia's garbage collected memory contrasts with Chapel's automatic/managed approach. dynamic with multiple dispatch typing meets static, inferred typing.",
  "chapel-kotlin": "Chapel's record or class becomes Kotlin's data class. built-in math maps to kotlin.math. Chapel's automatic/managed memory contrasts with Kotlin's garbage collected (JVM) approach. static, inferred typing meets static, null-safe typing.",
  "chapel-matlab": "MATLAB's struct or classdef becomes Chapel's record or class. built-in functions maps to built-in math. MATLAB's automatic memory contrasts with Chapel's automatic/managed approach. dynamic, matrix-native typing meets static, inferred typing.",
  "chapel-mojo": "Mojo's struct with fn becomes Chapel's record or class. built-in or math module maps to built-in math. Mojo's ownership model memory contrasts with Chapel's automatic/managed approach. static, Python-compatible typing meets static, inferred typing.",
  "chapel-nim": "Nim's type = object becomes Chapel's record or class. math module maps to built-in math. Nim's garbage collected memory contrasts with Chapel's automatic/managed approach. Nim's result variable, compiles to C, UFCS vs Chapel's forall/coforall parallelism, domains/ranges.",
  "chapel-python": "Python's @dataclass becomes Chapel's record or class. math module maps to built-in math. Python's garbage collected memory contrasts with Chapel's automatic/managed approach. dynamic with optional hints typing meets static, inferred typing.",
  "chapel-r": "R's list or R6 class becomes Chapel's record or class. built-in functions maps to built-in math. R's garbage collected memory contrasts with Chapel's automatic/managed approach. dynamic, vector-native typing meets static, inferred typing.",
  "chapel-rust": "Rust's struct with impl blocks becomes Chapel's record or class. .powf(), .sqrt(), .abs() maps to built-in math. Rust's ownership/borrowing system memory contrasts with Chapel's automatic/managed approach. static, strong with lifetimes typing meets static, inferred typing.",
  "chapel-swift": "Chapel's record or class becomes Swift's struct with mutating func. built-in math maps to Foundation/Darwin math. Chapel's automatic/managed memory contrasts with Swift's ARC (automatic reference counting) approach. static, inferred typing meets static, strong with optionals typing.",
  "chapel-typescript": "TypeScript's class with interface becomes Chapel's record or class. Math object maps to built-in math. TypeScript's garbage collected memory contrasts with Chapel's automatic/managed approach. static (structural) typing meets static, inferred typing.",
  "chapel-wasm": "WebAssembly/WAT's linear memory layout becomes Chapel's record or class. f64.mul, f64.sqrt maps to built-in math. WebAssembly/WAT's linear memory (manual) memory contrasts with Chapel's automatic/managed approach. static (i32/i64/f32/f64) typing meets static, inferred typing.",
  "chapel-zig": "Zig's struct with namespaced fn becomes Chapel's record or class. @sqrt, std.math.pow maps to built-in math. Zig's manual with allocator interface memory contrasts with Chapel's automatic/managed approach. static with comptime typing meets static, inferred typing.",
  "cpp-csharp": "Both are OOP languages with similar class syntax. C++'s manual memory management becomes C#'s garbage collection. std::clamp becomes Math.Clamp. C++'s namespaces map directly to C# namespaces. C++'s templates become C# generics. C# adds properties, LINQ, and async/await — trading some performance for developer productivity in the .NET ecosystem.",
  "cpp-cuda": "C++'s class/struct with methods becomes CUDA's struct with __device__ functions. std::pow, std::sqrt maps to device math (sqrtf, powf). C++'s manual or smart pointers memory contrasts with CUDA's explicit GPU allocation approach. static with templates typing meets static (C-based) typing.",
  "cpp-delphi": "C++'s class/struct with methods becomes Delphi/Pascal's class (TMyClass). std::pow, std::sqrt maps to Math unit. C++'s manual or smart pointers memory contrasts with Delphi/Pascal's manual or ARC approach. static with templates typing meets static, strong typing.",
  "cpp-fortran": "Fortran's derived type becomes C++'s class/struct with methods. intrinsic functions maps to std::pow, std::sqrt. Fortran's stack/allocatable memory contrasts with C++'s manual or smart pointers approach. static with intent typing meets static with templates typing.",
  "cpp-go": "Go's struct with methods becomes C++'s class/struct with methods. math package maps to std::pow, std::sqrt. Go's garbage collected memory contrasts with C++'s manual or smart pointers approach. static, simple typing meets static with templates typing.",
  "cpp-java": "Both are class-based OOP languages. C++'s multiple inheritance becomes Java's single inheritance + interfaces. C++'s destructors disappear with Java's GC. std::printf becomes System.out.printf. C++'s header/source split becomes Java's single-file classes. Both are widely used in computational engineering and enterprise systems.",
  "cpp-javascript": "JavaScript's class with constructor becomes C++'s class/struct with methods. Math object maps to std::pow, std::sqrt. JavaScript's garbage collected memory contrasts with C++'s manual or smart pointers approach. dynamic typing meets static with templates typing.",
  "cpp-julia": "Julia's mutable struct becomes C++'s class/struct with methods. built-in Unicode operators maps to std::pow, std::sqrt. Julia's garbage collected memory contrasts with C++'s manual or smart pointers approach. dynamic with multiple dispatch typing meets static with templates typing.",
  "cpp-kotlin": "C++'s class/struct with methods becomes Kotlin's data class. std::pow, std::sqrt maps to kotlin.math. C++'s manual or smart pointers memory contrasts with Kotlin's garbage collected (JVM) approach. static with templates typing meets static, null-safe typing.",
  "cpp-matlab": "C++'s class/struct with methods becomes MATLAB's struct or classdef. std::pow, std::sqrt maps to built-in functions. C++'s manual or smart pointers memory contrasts with MATLAB's automatic approach. static with templates typing meets dynamic, matrix-native typing.",
  "cpp-mojo": "C++'s class/struct with methods becomes Mojo's struct with fn. std::pow, std::sqrt maps to built-in or math module. C++'s manual or smart pointers memory contrasts with Mojo's ownership model approach. static with templates typing meets static, Python-compatible typing.",
  "cpp-nim": "C++'s class/struct with methods becomes Nim's type = object. std::pow, std::sqrt maps to math module. C++'s manual or smart pointers memory contrasts with Nim's garbage collected approach. static with templates typing meets static, inferred typing.",
  "cpp-python": "Python's @dataclass becomes C++'s class/struct with methods. math module maps to std::pow, std::sqrt. Python's garbage collected memory contrasts with C++'s manual or smart pointers approach. dynamic with optional hints typing meets static with templates typing.",
  "cpp-r": "C++'s class/struct with methods becomes R's list or R6 class. std::pow, std::sqrt maps to built-in functions. C++'s manual or smart pointers memory contrasts with R's garbage collected approach. static with templates typing meets dynamic, vector-native typing.",
  "cpp-rust": "Rust's struct with impl blocks becomes C++'s class/struct with methods. .powf(), .sqrt(), .abs() maps to std::pow, std::sqrt. Rust's ownership/borrowing system memory contrasts with C++'s manual or smart pointers approach. static, strong with lifetimes typing meets static with templates typing.",
  "cpp-swift": "C++'s class/struct with methods becomes Swift's struct with mutating func. std::pow, std::sqrt maps to Foundation/Darwin math. C++'s manual or smart pointers memory contrasts with Swift's ARC (automatic reference counting) approach. static with templates typing meets static, strong with optionals typing.",
  "cpp-typescript": "C++'s class/struct with methods becomes TypeScript's class with interface. std::pow, std::sqrt maps to Math object. C++'s manual or smart pointers memory contrasts with TypeScript's garbage collected approach. static with templates typing meets static (structural) typing.",
  "cpp-wasm": "C++'s class/struct with methods becomes WebAssembly/WAT's linear memory layout. std::pow, std::sqrt maps to f64.mul, f64.sqrt. C++'s manual or smart pointers memory contrasts with WebAssembly/WAT's linear memory (manual) approach. static with templates typing meets static (i32/i64/f32/f64) typing.",
  "cpp-zig": "Zig's struct with namespaced fn becomes C++'s class/struct with methods. @sqrt, std.math.pow maps to std::pow, std::sqrt. Zig's manual with allocator interface memory contrasts with C++'s manual or smart pointers approach. static with comptime typing meets static with templates typing.",
  "csharp-cuda": "C#'s class with properties becomes CUDA's struct with __device__ functions. Math class maps to device math (sqrtf, powf). C#'s garbage collected (.NET) memory contrasts with CUDA's explicit GPU allocation approach. static, strong typing meets static (C-based) typing.",
  "csharp-delphi": "C#'s class with properties becomes Delphi/Pascal's class (TMyClass). Math class maps to Math unit. C#'s garbage collected (.NET) memory contrasts with Delphi/Pascal's manual or ARC approach. C#'s properties, namespaces, async/await vs Delphi/Pascal's begin/end blocks, Result := value, units.",
  "csharp-fortran": "Fortran's derived type becomes C#'s class with properties. intrinsic functions maps to Math class. Fortran's stack/allocatable memory contrasts with C#'s garbage collected (.NET) approach. static with intent typing meets static, strong typing.",
  "csharp-go": "Go's struct with methods becomes C#'s class with properties. math package maps to Math class. Go's garbage collected memory contrasts with C#'s garbage collected (.NET) approach. static, simple typing meets static, strong typing.",
  "csharp-java": "C#'s class with properties becomes Java's class with getters/setters. C#'s garbage collected (.NET) memory contrasts with Java's garbage collected (JVM) approach. C#'s properties, namespaces, async/await vs Java's packages, checked exceptions, enterprise patterns.",
  "csharp-javascript": "JavaScript's class with constructor becomes C#'s class with properties. Math object maps to Math class. JavaScript's garbage collected memory contrasts with C#'s garbage collected (.NET) approach. dynamic typing meets static, strong typing.",
  "csharp-julia": "Julia's mutable struct becomes C#'s class with properties. built-in Unicode operators maps to Math class. Julia's garbage collected memory contrasts with C#'s garbage collected (.NET) approach. dynamic with multiple dispatch typing meets static, strong typing.",
  "csharp-kotlin": "C#'s class with properties becomes Kotlin's data class. Math class maps to kotlin.math. C#'s garbage collected (.NET) memory contrasts with Kotlin's garbage collected (JVM) approach. static, strong typing meets static, null-safe typing.",
  "csharp-matlab": "C#'s class with properties becomes MATLAB's struct or classdef. Math class maps to built-in functions. C#'s garbage collected (.NET) memory contrasts with MATLAB's automatic approach. static, strong typing meets dynamic, matrix-native typing.",
  "csharp-mojo": "C#'s class with properties becomes Mojo's struct with fn. Math class maps to built-in or math module. C#'s garbage collected (.NET) memory contrasts with Mojo's ownership model approach. static, strong typing meets static, Python-compatible typing.",
  "csharp-nim": "C#'s class with properties becomes Nim's type = object. Math class maps to math module. C#'s garbage collected (.NET) memory contrasts with Nim's garbage collected approach. static, strong typing meets static, inferred typing.",
  "csharp-python": "Python's @dataclass becomes C#'s class with properties. math module maps to Math class. Python's garbage collected memory contrasts with C#'s garbage collected (.NET) approach. dynamic with optional hints typing meets static, strong typing.",
  "csharp-r": "C#'s class with properties becomes R's list or R6 class. Math class maps to built-in functions. C#'s garbage collected (.NET) memory contrasts with R's garbage collected approach. static, strong typing meets dynamic, vector-native typing.",
  "csharp-rust": "Rust's struct with impl blocks becomes C#'s class with properties. .powf(), .sqrt(), .abs() maps to Math class. Rust's ownership/borrowing system memory contrasts with C#'s garbage collected (.NET) approach. static, strong with lifetimes typing meets static, strong typing.",
  "csharp-swift": "C#'s class with properties becomes Swift's struct with mutating func. Math class maps to Foundation/Darwin math. C#'s garbage collected (.NET) memory contrasts with Swift's ARC (automatic reference counting) approach. static, strong typing meets static, strong with optionals typing.",
  "csharp-typescript": "C#'s class with properties becomes TypeScript's class with interface. Math class maps to Math object. C#'s garbage collected (.NET) memory contrasts with TypeScript's garbage collected approach. static, strong typing meets static (structural) typing.",
  "csharp-wasm": "C#'s class with properties becomes WebAssembly/WAT's linear memory layout. Math class maps to f64.mul, f64.sqrt. C#'s garbage collected (.NET) memory contrasts with WebAssembly/WAT's linear memory (manual) approach. static, strong typing meets static (i32/i64/f32/f64) typing.",
  "csharp-zig": "Zig's struct with namespaced fn becomes C#'s class with properties. @sqrt, std.math.pow maps to Math class. Zig's manual with allocator interface memory contrasts with C#'s garbage collected (.NET) approach. static with comptime typing meets static, strong typing.",
  "cuda-delphi": "Delphi/Pascal's class (TMyClass) becomes CUDA's struct with __device__ functions. Math unit maps to device math (sqrtf, powf). Delphi/Pascal's manual or ARC memory contrasts with CUDA's explicit GPU allocation approach. static, strong typing meets static (C-based) typing.",
  "cuda-fortran": "Fortran's derived type becomes CUDA's struct with __device__ functions. intrinsic functions maps to device math (sqrtf, powf). Fortran's stack/allocatable memory contrasts with CUDA's explicit GPU allocation approach. static with intent typing meets static (C-based) typing.",
  "cuda-go": "Go's struct with methods becomes CUDA's struct with __device__ functions. math package maps to device math (sqrtf, powf). Go's garbage collected memory contrasts with CUDA's explicit GPU allocation approach. static, simple typing meets static (C-based) typing.",
  "cuda-java": "CUDA's struct with __device__ functions becomes Java's class with getters/setters. device math (sqrtf, powf) maps to Math class. CUDA's explicit GPU allocation memory contrasts with Java's garbage collected (JVM) approach. static (C-based) typing meets static, strong typing.",
  "cuda-javascript": "JavaScript's class with constructor becomes CUDA's struct with __device__ functions. Math object maps to device math (sqrtf, powf). JavaScript's garbage collected memory contrasts with CUDA's explicit GPU allocation approach. dynamic typing meets static (C-based) typing.",
  "cuda-julia": "Julia's mutable struct becomes CUDA's struct with __device__ functions. built-in Unicode operators maps to device math (sqrtf, powf). Julia's garbage collected memory contrasts with CUDA's explicit GPU allocation approach. dynamic with multiple dispatch typing meets static (C-based) typing.",
  "cuda-kotlin": "CUDA's struct with __device__ functions becomes Kotlin's data class. device math (sqrtf, powf) maps to kotlin.math. CUDA's explicit GPU allocation memory contrasts with Kotlin's garbage collected (JVM) approach. static (C-based) typing meets static, null-safe typing.",
  "cuda-matlab": "MATLAB's struct or classdef becomes CUDA's struct with __device__ functions. built-in functions maps to device math (sqrtf, powf). MATLAB's automatic memory contrasts with CUDA's explicit GPU allocation approach. dynamic, matrix-native typing meets static (C-based) typing.",
  "cuda-mojo": "CUDA's struct with __device__ functions becomes Mojo's struct with fn. device math (sqrtf, powf) maps to built-in or math module. CUDA's explicit GPU allocation memory contrasts with Mojo's ownership model approach. static (C-based) typing meets static, Python-compatible typing.",
  "cuda-nim": "CUDA's struct with __device__ functions becomes Nim's type = object. device math (sqrtf, powf) maps to math module. CUDA's explicit GPU allocation memory contrasts with Nim's garbage collected approach. static (C-based) typing meets static, inferred typing.",
  "cuda-python": "Python's @dataclass becomes CUDA's struct with __device__ functions. math module maps to device math (sqrtf, powf). Python's garbage collected memory contrasts with CUDA's explicit GPU allocation approach. dynamic with optional hints typing meets static (C-based) typing.",
  "cuda-r": "R's list or R6 class becomes CUDA's struct with __device__ functions. built-in functions maps to device math (sqrtf, powf). R's garbage collected memory contrasts with CUDA's explicit GPU allocation approach. dynamic, vector-native typing meets static (C-based) typing.",
  "cuda-rust": "Rust's struct with impl blocks becomes CUDA's struct with __device__ functions. .powf(), .sqrt(), .abs() maps to device math (sqrtf, powf). Rust's ownership/borrowing system memory contrasts with CUDA's explicit GPU allocation approach. static, strong with lifetimes typing meets static (C-based) typing.",
  "cuda-swift": "CUDA's struct with __device__ functions becomes Swift's struct with mutating func. device math (sqrtf, powf) maps to Foundation/Darwin math. CUDA's explicit GPU allocation memory contrasts with Swift's ARC (automatic reference counting) approach. static (C-based) typing meets static, strong with optionals typing.",
  "cuda-typescript": "TypeScript's class with interface becomes CUDA's struct with __device__ functions. Math object maps to device math (sqrtf, powf). TypeScript's garbage collected memory contrasts with CUDA's explicit GPU allocation approach. static (structural) typing meets static (C-based) typing.",
  "cuda-wasm": "Two non-traditional targets: GPU and browser. CUDA's thread-parallel model (thousands of threads) contrasts with WASM's single-threaded stack machine. CUDA uses __global__/__device__ qualifiers; WASM uses S-expression syntax. Both represent the future of SWMM computation — GPU for massive simulations, WASM for browser-based tools.",
  "cuda-zig": "Zig's struct with namespaced fn becomes CUDA's struct with __device__ functions. @sqrt, std.math.pow maps to device math (sqrtf, powf). Zig's manual with allocator interface memory contrasts with CUDA's explicit GPU allocation approach. static with comptime typing meets static (C-based) typing.",
  "delphi-fortran": "Fortran's derived type becomes Delphi/Pascal's class (TMyClass). intrinsic functions maps to Math unit. Fortran's stack/allocatable memory contrasts with Delphi/Pascal's manual or ARC approach. static with intent typing meets static, strong typing.",
  "delphi-go": "Go's struct with methods becomes Delphi/Pascal's class (TMyClass). math package maps to Math unit. Go's garbage collected memory contrasts with Delphi/Pascal's manual or ARC approach. static, simple typing meets static, strong typing.",
  "delphi-java": "Delphi/Pascal's class (TMyClass) becomes Java's class with getters/setters. Math unit maps to Math class. Delphi/Pascal's manual or ARC memory contrasts with Java's garbage collected (JVM) approach. Delphi/Pascal's begin/end blocks, Result := value, units vs Java's packages, checked exceptions, enterprise patterns.",
  "delphi-javascript": "JavaScript's class with constructor becomes Delphi/Pascal's class (TMyClass). Math object maps to Math unit. JavaScript's garbage collected memory contrasts with Delphi/Pascal's manual or ARC approach. dynamic typing meets static, strong typing.",
  "delphi-julia": "Julia's mutable struct becomes Delphi/Pascal's class (TMyClass). built-in Unicode operators maps to Math unit. Julia's garbage collected memory contrasts with Delphi/Pascal's manual or ARC approach. dynamic with multiple dispatch typing meets static, strong typing.",
  "delphi-kotlin": "Delphi/Pascal's class (TMyClass) becomes Kotlin's data class. Math unit maps to kotlin.math. Delphi/Pascal's manual or ARC memory contrasts with Kotlin's garbage collected (JVM) approach. static, strong typing meets static, null-safe typing.",
  "delphi-matlab": "MATLAB's struct or classdef becomes Delphi/Pascal's class (TMyClass). built-in functions maps to Math unit. MATLAB's automatic memory contrasts with Delphi/Pascal's manual or ARC approach. dynamic, matrix-native typing meets static, strong typing.",
  "delphi-mojo": "Delphi/Pascal's class (TMyClass) becomes Mojo's struct with fn. Math unit maps to built-in or math module. Delphi/Pascal's manual or ARC memory contrasts with Mojo's ownership model approach. static, strong typing meets static, Python-compatible typing.",
  "delphi-nim": "Delphi/Pascal's class (TMyClass) becomes Nim's type = object. Math unit maps to math module. Delphi/Pascal's manual or ARC memory contrasts with Nim's garbage collected approach. static, strong typing meets static, inferred typing.",
  "delphi-python": "Python's @dataclass becomes Delphi/Pascal's class (TMyClass). math module maps to Math unit. Python's garbage collected memory contrasts with Delphi/Pascal's manual or ARC approach. dynamic with optional hints typing meets static, strong typing.",
  "delphi-r": "R's list or R6 class becomes Delphi/Pascal's class (TMyClass). built-in functions maps to Math unit. R's garbage collected memory contrasts with Delphi/Pascal's manual or ARC approach. dynamic, vector-native typing meets static, strong typing.",
  "delphi-rust": "Rust's struct with impl blocks becomes Delphi/Pascal's class (TMyClass). .powf(), .sqrt(), .abs() maps to Math unit. Rust's ownership/borrowing system memory contrasts with Delphi/Pascal's manual or ARC approach. static, strong with lifetimes typing meets static, strong typing.",
  "delphi-swift": "Delphi/Pascal's class (TMyClass) becomes Swift's struct with mutating func. Math unit maps to Foundation/Darwin math. Delphi/Pascal's manual or ARC memory contrasts with Swift's ARC (automatic reference counting) approach. static, strong typing meets static, strong with optionals typing.",
  "delphi-typescript": "Delphi/Pascal's class (TMyClass) becomes TypeScript's class with interface. Math unit maps to Math object. Delphi/Pascal's manual or ARC memory contrasts with TypeScript's garbage collected approach. static, strong typing meets static (structural) typing.",
  "delphi-wasm": "Delphi/Pascal's class (TMyClass) becomes WebAssembly/WAT's linear memory layout. Math unit maps to f64.mul, f64.sqrt. Delphi/Pascal's manual or ARC memory contrasts with WebAssembly/WAT's linear memory (manual) approach. static, strong typing meets static (i32/i64/f32/f64) typing.",
  "delphi-zig": "Zig's struct with namespaced fn becomes Delphi/Pascal's class (TMyClass). @sqrt, std.math.pow maps to Math unit. Zig's manual with allocator interface memory contrasts with Delphi/Pascal's manual or ARC approach. static with comptime typing meets static, strong typing.",
  "fortran-chapel": "Both target high-performance numerical computing. Fortran's do loops become Chapel's forall for automatic parallelism. Fortran's derived types become Chapel records. Fortran's array syntax maps to Chapel's domain-based arrays. Chapel adds modern parallelism to Fortran's proven numerical computing model.",
  "fortran-go": "Both are statically typed compiled languages focused on clarity. Fortran's derived types become Go's structs. Fortran's module procedures become Go's package-level functions with receivers. Fortran's intent(in) becomes Go's value vs pointer receiver convention. Both produce fast binaries, but Go adds built-in concurrency and modern tooling.",
  "fortran-java": "Fortran's derived type becomes Java's class with getters/setters. intrinsic functions maps to Math class. Fortran's stack/allocatable memory contrasts with Java's garbage collected (JVM) approach. static with intent typing meets static, strong typing.",
  "fortran-javascript": "The oldest and newest languages in our set. Fortran's real(8) becomes JavaScript's native Number (all floats). Fortran's module system becomes ES module exports. do loops become for loops. The mathematical algorithms translate directly, but the language idioms are worlds apart \u2014 Fortran optimizes for numerical arrays, JavaScript for event-driven interactions.",
  "fortran-julia": "Both are 1-based indexing languages with strong numerical computing heritage. Fortran's derived types become Julia's structs. Fortran's module/contains becomes Julia's module/function pattern. Julia's multiple dispatch offers more flexibility than Fortran's module procedures. Both compile to efficient machine code, but Julia adds interactivity through its REPL and JIT compilation.",
  "fortran-kotlin": "Fortran's derived type becomes Kotlin's data class. intrinsic functions maps to kotlin.math. Fortran's stack/allocatable memory contrasts with Kotlin's garbage collected (JVM) approach. static with intent typing meets static, null-safe typing.",
  "fortran-matlab": "Both are 1-based indexing languages dominant in engineering. Fortran's derived types become MATLAB structs. Fortran's do loops become MATLAB for loops (or vectorized ops). Both compile/run efficiently for numerical work. Fortran is the legacy HPC standard; MATLAB is the modern prototyping standard. SWMM3 was originally Fortran.",
  "fortran-mojo": "Fortran's derived type becomes Mojo's struct with fn. intrinsic functions maps to built-in or math module. Fortran's stack/allocatable memory contrasts with Mojo's ownership model approach. static with intent typing meets static, Python-compatible typing.",
  "fortran-nim": "Fortran's derived type becomes Nim's type = object. intrinsic functions maps to math module. Fortran's stack/allocatable memory contrasts with Nim's garbage collected approach. static with intent typing meets static, inferred typing.",
  "fortran-python": "Python's @dataclass becomes Fortran's derived type. math module maps to intrinsic functions. Python's garbage collected memory contrasts with Fortran's stack/allocatable approach. dynamic with optional hints typing meets static with intent typing.",
  "fortran-r": "Fortran's derived type becomes R's list or R6 class. intrinsic functions maps to built-in functions. Fortran's stack/allocatable memory contrasts with R's garbage collected approach. static with intent typing meets dynamic, vector-native typing.",
  "fortran-rust": "Rust's struct with impl blocks becomes Fortran's derived type. .powf(), .sqrt(), .abs() maps to intrinsic functions. Rust's ownership/borrowing system memory contrasts with Fortran's stack/allocatable approach. static, strong with lifetimes typing meets static with intent typing.",
  "fortran-swift": "Fortran's derived type becomes Swift's struct with mutating func. intrinsic functions maps to Foundation/Darwin math. Fortran's stack/allocatable memory contrasts with Swift's ARC (automatic reference counting) approach. static with intent typing meets static, strong with optionals typing.",
  "fortran-typescript": "Fortran's derived type becomes TypeScript's class with interface. intrinsic functions maps to Math object. Fortran's stack/allocatable memory contrasts with TypeScript's garbage collected approach. static with intent typing meets static (structural) typing.",
  "fortran-wasm": "Fortran's derived type becomes WebAssembly/WAT's linear memory layout. intrinsic functions maps to f64.mul, f64.sqrt. Fortran's stack/allocatable memory contrasts with WebAssembly/WAT's linear memory (manual) approach. static with intent typing meets static (i32/i64/f32/f64) typing.",
  "fortran-zig": "Fortran's derived types (type :: Conduit) become Zig's struct definitions. Fortran's module/contains pattern becomes Zig's namespaced struct with pub fn methods. Fortran's 1-based array indexing contrasts with Zig's 0-based slices. real(8) maps to Zig's f64. Fortran's intent(in/inout) is replaced by Zig's const vs mutable pointer parameters. Fortran's implicit none finds a kindred spirit in Zig's explicit-everything philosophy — no implicit conversions, no hidden allocations.",
  "go-java": "Go's struct with methods becomes Java's class with getters/setters. math package maps to Math class. Go's garbage collected memory contrasts with Java's garbage collected (JVM) approach. static, simple typing meets static, strong typing.",
  "go-javascript": "JavaScript's class with constructor becomes Go's struct with methods. Math object maps to math package. dynamic typing meets static, simple typing. JavaScript's getters/setters, template literals vs Go's exported names (capitalized), multiple returns.",
  "go-julia": "Julia's mutable struct becomes Go's struct with methods. built-in Unicode operators maps to math package. dynamic with multiple dispatch typing meets static, simple typing. Julia's 1-based indexing, JIT compilation vs Go's exported names (capitalized), multiple returns.",
  "go-kotlin": "Go's struct with methods becomes Kotlin's data class. math package maps to kotlin.math. Go's garbage collected memory contrasts with Kotlin's garbage collected (JVM) approach. static, simple typing meets static, null-safe typing.",
  "go-matlab": "Go's struct with methods becomes MATLAB's struct or classdef. math package maps to built-in functions. Go's garbage collected memory contrasts with MATLAB's automatic approach. static, simple typing meets dynamic, matrix-native typing.",
  "go-mojo": "Go's struct with methods becomes Mojo's struct with fn. math package maps to built-in or math module. Go's garbage collected memory contrasts with Mojo's ownership model approach. static, simple typing meets static, Python-compatible typing.",
  "go-nim": "Go's struct with methods becomes Nim's type = object. math package maps to math module. static, simple typing meets static, inferred typing. Go's exported names (capitalized), multiple returns vs Nim's result variable, compiles to C, UFCS.",
  "go-python": "Python's @dataclass becomes Go's struct with methods. math module maps to math package. dynamic with optional hints typing meets static, simple typing. Python's list comprehensions, duck typing vs Go's exported names (capitalized), multiple returns.",
  "go-r": "Go's struct with methods becomes R's list or R6 class. math package maps to built-in functions. static, simple typing meets dynamic, vector-native typing. Go's exported names (capitalized), multiple returns vs R's <- assignment, vectorized operations.",
  "go-rust": "Rust's struct with impl blocks becomes Go's struct with methods. .powf(), .sqrt(), .abs() maps to math package. Rust's ownership/borrowing system memory contrasts with Go's garbage collected approach. static, strong with lifetimes typing meets static, simple typing.",
  "go-swift": "Go's struct with methods becomes Swift's struct with mutating func. math package maps to Foundation/Darwin math. Go's garbage collected memory contrasts with Swift's ARC (automatic reference counting) approach. static, simple typing meets static, strong with optionals typing.",
  "go-typescript": "Go's struct with methods becomes TypeScript's class with interface. math package maps to Math object. static, simple typing meets static (structural) typing. Go's exported names (capitalized), multiple returns vs TypeScript's type annotations, interfaces, generics.",
  "go-wasm": "Go's struct with methods becomes WebAssembly/WAT's linear memory layout. math package maps to f64.mul, f64.sqrt. Go's garbage collected memory contrasts with WebAssembly/WAT's linear memory (manual) approach. static, simple typing meets static (i32/i64/f32/f64) typing.",
  "go-zig": "Go's garbage-collected runtime contrasts with Zig's manual memory management and comptime allocator model. Go's method receivers (func (c *Conduit) GetFlow()) become Zig's namespaced functions (pub fn getFlow(self: *Conduit)). Go's math.Pow() becomes std.math.pow(). Go's multiple-return error handling (val, err) maps to Zig's error unions (val !ErrorType). Go's exported names (capitalized) become Zig's pub keyword. Both prioritize simplicity and readability over abstraction.",
  "java-javascript": "JavaScript's class with constructor becomes Java's class with getters/setters. Math object maps to Math class. JavaScript's garbage collected memory contrasts with Java's garbage collected (JVM) approach. dynamic typing meets static, strong typing.",
  "java-julia": "Julia's mutable struct becomes Java's class with getters/setters. built-in Unicode operators maps to Math class. Julia's garbage collected memory contrasts with Java's garbage collected (JVM) approach. dynamic with multiple dispatch typing meets static, strong typing.",
  "java-kotlin": "Kotlin is designed as a better Java. Java's verbose class declarations become Kotlin's concise data classes. Java's null checks become Kotlin's null-safe operators (?., ?:). Java's switch becomes Kotlin's powerful when expression. Both run on the JVM and interoperate seamlessly. Kotlin's modern syntax reduces boilerplate significantly.",
  "java-matlab": "MATLAB's struct or classdef becomes Java's class with getters/setters. built-in functions maps to Math class. MATLAB's automatic memory contrasts with Java's garbage collected (JVM) approach. dynamic, matrix-native typing meets static, strong typing.",
  "java-mojo": "Mojo's struct with fn becomes Java's class with getters/setters. built-in or math module maps to Math class. Mojo's ownership model memory contrasts with Java's garbage collected (JVM) approach. static, Python-compatible typing meets static, strong typing.",
  "java-nim": "Java's class with getters/setters becomes Nim's type = object. Math class maps to math module. Java's garbage collected (JVM) memory contrasts with Nim's garbage collected approach. static, strong typing meets static, inferred typing.",
  "java-python": "Python's @dataclass becomes Java's class with getters/setters. math module maps to Math class. Python's garbage collected memory contrasts with Java's garbage collected (JVM) approach. dynamic with optional hints typing meets static, strong typing.",
  "java-r": "R's list or R6 class becomes Java's class with getters/setters. built-in functions maps to Math class. R's garbage collected memory contrasts with Java's garbage collected (JVM) approach. dynamic, vector-native typing meets static, strong typing.",
  "java-rust": "Rust's struct with impl blocks becomes Java's class with getters/setters. .powf(), .sqrt(), .abs() maps to Math class. Rust's ownership/borrowing system memory contrasts with Java's garbage collected (JVM) approach. static, strong with lifetimes typing meets static, strong typing.",
  "java-swift": "Java's class with getters/setters becomes Swift's struct with mutating func. Math class maps to Foundation/Darwin math. Java's garbage collected (JVM) memory contrasts with Swift's ARC (automatic reference counting) approach. static, strong typing meets static, strong with optionals typing.",
  "java-typescript": "TypeScript's class with interface becomes Java's class with getters/setters. Math object maps to Math class. TypeScript's garbage collected memory contrasts with Java's garbage collected (JVM) approach. static (structural) typing meets static, strong typing.",
  "java-wasm": "WebAssembly/WAT's linear memory layout becomes Java's class with getters/setters. f64.mul, f64.sqrt maps to Math class. WebAssembly/WAT's linear memory (manual) memory contrasts with Java's garbage collected (JVM) approach. static (i32/i64/f32/f64) typing meets static, strong typing.",
  "java-zig": "Zig's struct with namespaced fn becomes Java's class with getters/setters. @sqrt, std.math.pow maps to Math class. Zig's manual with allocator interface memory contrasts with Java's garbage collected (JVM) approach. static with comptime typing meets static, strong typing.",
  "javascript-go": "Both are modern languages with C-family syntax. JavaScript's class becomes Go's struct + methods. JavaScript's Math.sqrt() becomes Go's math.Sqrt(). JavaScript's dynamic typing becomes Go's static type declarations. JavaScript runs in the browser or Node.js; Go produces standalone binaries. Both have strong ecosystems for web services, making them natural choices for SWMM5 web tools.",
  "javascript-julia": "Julia's mutable struct becomes JavaScript's class with constructor. built-in Unicode operators maps to Math object. dynamic with multiple dispatch typing meets dynamic typing. Julia's 1-based indexing, JIT compilation vs JavaScript's getters/setters, template literals.",
  "javascript-kotlin": "JavaScript's class with constructor becomes Kotlin's data class. Math object maps to kotlin.math. JavaScript's garbage collected memory contrasts with Kotlin's garbage collected (JVM) approach. dynamic typing meets static, null-safe typing.",
  "javascript-matlab": "JavaScript's class with constructor becomes MATLAB's struct or classdef. Math object maps to built-in functions. JavaScript's garbage collected memory contrasts with MATLAB's automatic approach. dynamic typing meets dynamic, matrix-native typing.",
  "javascript-mojo": "JavaScript's class with constructor becomes Mojo's struct with fn. Math object maps to built-in or math module. JavaScript's garbage collected memory contrasts with Mojo's ownership model approach. dynamic typing meets static, Python-compatible typing.",
  "javascript-nim": "JavaScript's class with constructor becomes Nim's type = object. Math object maps to math module. dynamic typing meets static, inferred typing. JavaScript's getters/setters, template literals vs Nim's result variable, compiles to C, UFCS.",
  "javascript-python": "Python's @dataclass becomes JavaScript's class with constructor. math module maps to Math object. dynamic with optional hints typing meets dynamic typing. Python's list comprehensions, duck typing vs JavaScript's getters/setters, template literals.",
  "javascript-r": "JavaScript's class with constructor becomes R's list or R6 class. Math object maps to built-in functions. dynamic typing meets dynamic, vector-native typing. JavaScript's getters/setters, template literals vs R's <- assignment, vectorized operations.",
  "javascript-rust": "Rust's struct with impl blocks becomes JavaScript's class with constructor. .powf(), .sqrt(), .abs() maps to Math object. Rust's ownership/borrowing system memory contrasts with JavaScript's garbage collected approach. static, strong with lifetimes typing meets dynamic typing.",
  "javascript-swift": "JavaScript's class with constructor becomes Swift's struct with mutating func. Math object maps to Foundation/Darwin math. JavaScript's garbage collected memory contrasts with Swift's ARC (automatic reference counting) approach. dynamic typing meets static, strong with optionals typing.",
  "javascript-typescript": "TypeScript adds static types to JavaScript with minimal code changes. JavaScript's dynamic typing becomes explicit : number, : string annotations. Classes gain interface definitions. The runtime behavior is identical — TypeScript compiles to JavaScript. This is the lowest-effort, highest-instructional-value translation in the collection.",
  "javascript-wasm": "JavaScript's class with constructor becomes WebAssembly/WAT's linear memory layout. Math object maps to f64.mul, f64.sqrt. JavaScript's garbage collected memory contrasts with WebAssembly/WAT's linear memory (manual) approach. dynamic typing meets static (i32/i64/f32/f64) typing.",
  "javascript-zig": "JavaScript's dynamic typing becomes Zig's strict static typing with comptime generics. JavaScript's class and constructor become Zig's struct with an init function. Math.sqrt() and Math.pow() become @sqrt() and std.math.pow(). JavaScript's garbage collection is replaced by Zig's explicit memory control. JavaScript's try/catch becomes Zig's try/catch with error unions. Zig compiles to WebAssembly just like JavaScript runs natively in the browser, making them complementary for web-based SWMM tools.",
  "julia-go": "Julia's expressive scientific syntax vs Go's minimalist engineering approach. Julia's mutable struct becomes Go's struct with pointer receivers. Julia's multiple dispatch becomes Go's explicit method definitions. Julia uses 1-based indexing; Go uses 0-based. Julia's ! convention for mutation becomes Go's pointer receiver convention. Both compile to fast native code.",
  "julia-javascript": "Julia's scientific computing focus vs JavaScript's web platform. Julia's struct becomes JavaScript's class. Julia's multiple dispatch becomes JavaScript's class methods. Julia's 1-based indexing requires adjustments for JavaScript's 0-based arrays. Julia excels at numerical computation; JavaScript excels at interactive visualization \u2014 combining both via web APIs creates powerful engineering tools.",
  "julia-kotlin": "Julia's mutable struct becomes Kotlin's data class. built-in Unicode operators maps to kotlin.math. Julia's garbage collected memory contrasts with Kotlin's garbage collected (JVM) approach. dynamic with multiple dispatch typing meets static, null-safe typing.",
  "julia-matlab": "Julia's mutable struct becomes MATLAB's struct or classdef. built-in Unicode operators maps to built-in functions. Julia's garbage collected memory contrasts with MATLAB's automatic approach. dynamic with multiple dispatch typing meets dynamic, matrix-native typing.",
  "julia-mojo": "Julia's mutable struct becomes Mojo's struct with fn. built-in Unicode operators maps to built-in or math module. Julia's garbage collected memory contrasts with Mojo's ownership model approach. dynamic with multiple dispatch typing meets static, Python-compatible typing.",
  "julia-nim": "Julia's mutable struct becomes Nim's type = object. built-in Unicode operators maps to math module. dynamic with multiple dispatch typing meets static, inferred typing. Julia's 1-based indexing, JIT compilation vs Nim's result variable, compiles to C, UFCS.",
  "julia-python": "Python's @dataclass becomes Julia's mutable struct. math module maps to built-in Unicode operators. dynamic with optional hints typing meets dynamic with multiple dispatch typing. Python's list comprehensions, duck typing vs Julia's 1-based indexing, JIT compilation.",
  "julia-r": "Julia's mutable struct becomes R's list or R6 class. built-in Unicode operators maps to built-in functions. dynamic with multiple dispatch typing meets dynamic, vector-native typing. Julia's 1-based indexing, JIT compilation vs R's <- assignment, vectorized operations.",
  "julia-rust": "Rust's struct with impl blocks becomes Julia's mutable struct. .powf(), .sqrt(), .abs() maps to built-in Unicode operators. Rust's ownership/borrowing system memory contrasts with Julia's garbage collected approach. static, strong with lifetimes typing meets dynamic with multiple dispatch typing.",
  "julia-swift": "Julia's mutable struct becomes Swift's struct with mutating func. built-in Unicode operators maps to Foundation/Darwin math. Julia's garbage collected memory contrasts with Swift's ARC (automatic reference counting) approach. dynamic with multiple dispatch typing meets static, strong with optionals typing.",
  "julia-typescript": "Julia's mutable struct becomes TypeScript's class with interface. built-in Unicode operators maps to Math object. dynamic with multiple dispatch typing meets static (structural) typing. Julia's 1-based indexing, JIT compilation vs TypeScript's type annotations, interfaces, generics.",
  "julia-wasm": "Julia's mutable struct becomes WebAssembly/WAT's linear memory layout. built-in Unicode operators maps to f64.mul, f64.sqrt. Julia's garbage collected memory contrasts with WebAssembly/WAT's linear memory (manual) approach. dynamic with multiple dispatch typing meets static (i32/i64/f32/f64) typing.",
  "julia-zig": "Julia's high-level multiple dispatch (function friction_slope(c::Conduit)) becomes Zig's namespaced struct methods (pub fn frictionSlope(self: *const Conduit)). Julia's mutable struct maps directly to Zig's struct (all mutable by default). Julia's 1-based indexing contrasts with Zig's 0-based. Julia's JIT compilation vs Zig's ahead-of-time compilation represents different performance philosophies. Julia's Unicode operators (≤) become standard comparisons (<=). Both produce fast code, but Zig gives deterministic performance without a runtime.",
  "kotlin-matlab": "MATLAB's struct or classdef becomes Kotlin's data class. built-in functions maps to kotlin.math. MATLAB's automatic memory contrasts with Kotlin's garbage collected (JVM) approach. dynamic, matrix-native typing meets static, null-safe typing.",
  "kotlin-mojo": "Mojo's struct with fn becomes Kotlin's data class. built-in or math module maps to kotlin.math. Mojo's ownership model memory contrasts with Kotlin's garbage collected (JVM) approach. static, Python-compatible typing meets static, null-safe typing.",
  "kotlin-nim": "Nim's type = object becomes Kotlin's data class. math module maps to kotlin.math. Nim's garbage collected memory contrasts with Kotlin's garbage collected (JVM) approach. static, inferred typing meets static, null-safe typing.",
  "kotlin-python": "Python's @dataclass becomes Kotlin's data class. math module maps to kotlin.math. Python's garbage collected memory contrasts with Kotlin's garbage collected (JVM) approach. dynamic with optional hints typing meets static, null-safe typing.",
  "kotlin-r": "R's list or R6 class becomes Kotlin's data class. built-in functions maps to kotlin.math. R's garbage collected memory contrasts with Kotlin's garbage collected (JVM) approach. dynamic, vector-native typing meets static, null-safe typing.",
  "kotlin-rust": "Rust's struct with impl blocks becomes Kotlin's data class. .powf(), .sqrt(), .abs() maps to kotlin.math. Rust's ownership/borrowing system memory contrasts with Kotlin's garbage collected (JVM) approach. static, strong with lifetimes typing meets static, null-safe typing.",
  "kotlin-swift": "Swift's struct with mutating func becomes Kotlin's data class. Foundation/Darwin math maps to kotlin.math. Swift's ARC (automatic reference counting) memory contrasts with Kotlin's garbage collected (JVM) approach. static, strong with optionals typing meets static, null-safe typing.",
  "kotlin-typescript": "TypeScript's class with interface becomes Kotlin's data class. Math object maps to kotlin.math. TypeScript's garbage collected memory contrasts with Kotlin's garbage collected (JVM) approach. static (structural) typing meets static, null-safe typing.",
  "kotlin-wasm": "WebAssembly/WAT's linear memory layout becomes Kotlin's data class. f64.mul, f64.sqrt maps to kotlin.math. WebAssembly/WAT's linear memory (manual) memory contrasts with Kotlin's garbage collected (JVM) approach. static (i32/i64/f32/f64) typing meets static, null-safe typing.",
  "kotlin-zig": "Zig's struct with namespaced fn becomes Kotlin's data class. @sqrt, std.math.pow maps to kotlin.math. Zig's manual with allocator interface memory contrasts with Kotlin's garbage collected (JVM) approach. static with comptime typing meets static, null-safe typing.",
  "matlab-mojo": "MATLAB's struct or classdef becomes Mojo's struct with fn. built-in functions maps to built-in or math module. MATLAB's automatic memory contrasts with Mojo's ownership model approach. dynamic, matrix-native typing meets static, Python-compatible typing.",
  "matlab-nim": "MATLAB's struct or classdef becomes Nim's type = object. built-in functions maps to math module. MATLAB's automatic memory contrasts with Nim's garbage collected approach. dynamic, matrix-native typing meets static, inferred typing.",
  "matlab-python": "Two dominant languages in engineering education. MATLAB's 1-based indexing vs Python's 0-based. MATLAB's built-in matrix operations vs Python's numpy. MATLAB's struct becomes Python's @dataclass. Both support interactive development, but Python's open-source ecosystem (PySWMM) has grown rapidly while MATLAB remains dominant in academia.",
  "matlab-r": "Both are domain-specific numerical languages. MATLAB's 1-based indexing matches R's 1-based vectors. MATLAB's struct becomes R's list. Both excel at vectorized operations and plotting. MATLAB dominates in engineering; R dominates in statistical hydrology and calibration. The swmmr package makes R particularly relevant for SWMM analysis.",
  "matlab-rust": "Rust's struct with impl blocks becomes MATLAB's struct or classdef. .powf(), .sqrt(), .abs() maps to built-in functions. Rust's ownership/borrowing system memory contrasts with MATLAB's automatic approach. static, strong with lifetimes typing meets dynamic, matrix-native typing.",
  "matlab-swift": "MATLAB's struct or classdef becomes Swift's struct with mutating func. built-in functions maps to Foundation/Darwin math. MATLAB's automatic memory contrasts with Swift's ARC (automatic reference counting) approach. dynamic, matrix-native typing meets static, strong with optionals typing.",
  "matlab-typescript": "MATLAB's struct or classdef becomes TypeScript's class with interface. built-in functions maps to Math object. MATLAB's automatic memory contrasts with TypeScript's garbage collected approach. dynamic, matrix-native typing meets static (structural) typing.",
  "matlab-wasm": "MATLAB's struct or classdef becomes WebAssembly/WAT's linear memory layout. built-in functions maps to f64.mul, f64.sqrt. MATLAB's automatic memory contrasts with WebAssembly/WAT's linear memory (manual) approach. dynamic, matrix-native typing meets static (i32/i64/f32/f64) typing.",
  "matlab-zig": "Zig's struct with namespaced fn becomes MATLAB's struct or classdef. @sqrt, std.math.pow maps to built-in functions. Zig's manual with allocator interface memory contrasts with MATLAB's automatic approach. static with comptime typing meets dynamic, matrix-native typing.",
  "mojo-nim": "Mojo's struct with fn becomes Nim's type = object. built-in or math module maps to math module. Mojo's ownership model memory contrasts with Nim's garbage collected approach. static, Python-compatible typing meets static, inferred typing.",
  "mojo-python": "Python's @dataclass becomes Mojo's struct with fn. math module maps to built-in or math module. Python's garbage collected memory contrasts with Mojo's ownership model approach. dynamic with optional hints typing meets static, Python-compatible typing.",
  "mojo-r": "R's list or R6 class becomes Mojo's struct with fn. built-in functions maps to built-in or math module. R's garbage collected memory contrasts with Mojo's ownership model approach. dynamic, vector-native typing meets static, Python-compatible typing.",
  "mojo-rust": "Rust's struct with impl blocks becomes Mojo's struct with fn. .powf(), .sqrt(), .abs() maps to built-in or math module. Rust's ownership/borrowing system memory contrasts with Mojo's ownership model approach. static, strong with lifetimes typing meets static, Python-compatible typing.",
  "mojo-swift": "Mojo's struct with fn becomes Swift's struct with mutating func. built-in or math module maps to Foundation/Darwin math. Mojo's ownership model memory contrasts with Swift's ARC (automatic reference counting) approach. static, Python-compatible typing meets static, strong with optionals typing.",
  "mojo-typescript": "TypeScript's class with interface becomes Mojo's struct with fn. Math object maps to built-in or math module. TypeScript's garbage collected memory contrasts with Mojo's ownership model approach. static (structural) typing meets static, Python-compatible typing.",
  "mojo-wasm": "WebAssembly/WAT's linear memory layout becomes Mojo's struct with fn. f64.mul, f64.sqrt maps to built-in or math module. WebAssembly/WAT's linear memory (manual) memory contrasts with Mojo's ownership model approach. static (i32/i64/f32/f64) typing meets static, Python-compatible typing.",
  "mojo-zig": "Zig's struct with namespaced fn becomes Mojo's struct with fn. @sqrt, std.math.pow maps to built-in or math module. Zig's manual with allocator interface memory contrasts with Mojo's ownership model approach. static with comptime typing meets static, Python-compatible typing.",
  "nim-mojo": "Both bridge high-level syntax with low-level performance. Nim compiles to C with Python-like syntax; Mojo compiles to native code with Python-compatible syntax. Nim's type object becomes Mojo's struct. Both aim to give Python users systems-level performance. Nim's result variable vs Mojo's return statement.",
  "nim-python": "Python's @dataclass becomes Nim's type = object. dynamic with optional hints typing meets static, inferred typing. Python's list comprehensions, duck typing vs Nim's result variable, compiles to C, UFCS.",
  "nim-r": "R's list or R6 class becomes Nim's type = object. built-in functions maps to math module. dynamic, vector-native typing meets static, inferred typing. R's <- assignment, vectorized operations vs Nim's result variable, compiles to C, UFCS.",
  "nim-rust": "Rust's struct with impl blocks becomes Nim's type = object. .powf(), .sqrt(), .abs() maps to math module. Rust's ownership/borrowing system memory contrasts with Nim's garbage collected approach. static, strong with lifetimes typing meets static, inferred typing.",
  "nim-swift": "Nim's type = object becomes Swift's struct with mutating func. math module maps to Foundation/Darwin math. Nim's garbage collected memory contrasts with Swift's ARC (automatic reference counting) approach. static, inferred typing meets static, strong with optionals typing.",
  "nim-typescript": "TypeScript's class with interface becomes Nim's type = object. Math object maps to math module. static (structural) typing meets static, inferred typing. TypeScript's type annotations, interfaces, generics vs Nim's result variable, compiles to C, UFCS.",
  "nim-wasm": "WebAssembly/WAT's linear memory layout becomes Nim's type = object. f64.mul, f64.sqrt maps to math module. WebAssembly/WAT's linear memory (manual) memory contrasts with Nim's garbage collected approach. static (i32/i64/f32/f64) typing meets static, inferred typing.",
  "nim-zig": "Zig's struct with namespaced fn becomes Nim's type = object. @sqrt, std.math.pow maps to math module. Zig's manual with allocator interface memory contrasts with Nim's garbage collected approach. static with comptime typing meets static, inferred typing.",
  "python-fortran": "Python's dynamic typing meets Fortran's static declarations. Python's @dataclass becomes Fortran's derived type. List comprehensions become do loops. Python's 0-based indexing vs Fortran's 1-based arrays requires index adjustments. Both are widely used in scientific computing, but Fortran's raw numerical performance is typically 10-100x faster. Many engineers use Python for prototyping and Fortran for production.",
  "python-go": "Python's dynamic elegance vs Go's static simplicity. Python's @dataclass becomes Go's struct with exported fields. Python's self becomes Go's receiver parameter. Type hints that Python ignores become Go's enforced static types. Go's explicit error handling (if err != nil) replaces Python's try/except. Go typically runs 10-50x faster than Python for numerical work.",
  "python-javascript": "Python's @dataclass becomes JavaScript's class with constructor. Python's math module maps to JavaScript's Math object. f-strings become template literals. Both are dynamically typed, but JavaScript's === vs == gotchas don't exist in Python. Python dominates server-side scientific computing; JavaScript enables browser-based visualization and interactive tools.",
  "python-julia": "Two high-level scientific computing languages. Python's @dataclass becomes Julia's struct. Both support Unicode, type hints, and clean mathematical syntax. Julia's multiple dispatch provides a unique alternative to Python's class-based OOP. Julia is compiled (JIT) while Python is interpreted, giving Julia significant speed advantages for numerical work. Both have rich ecosystems for water resources computing.",
  "python-mojo": "Mojo is a Python superset designed for performance. Python's def becomes Mojo's fn for strict typing. Python's @dataclass becomes Mojo's struct. Python's float becomes Mojo's Float64. The syntax is nearly identical but Mojo adds ownership (borrowed/owned/inout) and compiles to native code. Directly relevant to PySWMM users wanting C-like speed.",
  "python-r": "Python's @dataclass becomes R's list or R6 class. math module maps to built-in functions. dynamic with optional hints typing meets dynamic, vector-native typing. Python's list comprehensions, duck typing vs R's <- assignment, vectorized operations.",
  "python-rust": "Rust's struct with impl blocks becomes Python's @dataclass. .powf(), .sqrt(), .abs() maps to math module. Rust's ownership/borrowing system memory contrasts with Python's garbage collected approach. static, strong with lifetimes typing meets dynamic with optional hints typing.",
  "python-swift": "Python's @dataclass becomes Swift's struct with mutating func. math module maps to Foundation/Darwin math. Python's garbage collected memory contrasts with Swift's ARC (automatic reference counting) approach. dynamic with optional hints typing meets static, strong with optionals typing.",
  "python-typescript": "Python's @dataclass becomes TypeScript's class with interface. math module maps to Math object. dynamic with optional hints typing meets static (structural) typing. Python's list comprehensions, duck typing vs TypeScript's type annotations, interfaces, generics.",
  "python-wasm": "Python's @dataclass becomes WebAssembly/WAT's linear memory layout. math module maps to f64.mul, f64.sqrt. Python's garbage collected memory contrasts with WebAssembly/WAT's linear memory (manual) approach. dynamic with optional hints typing meets static (i32/i64/f32/f64) typing.",
  "python-zig": "Python's @dataclass becomes Zig's struct with explicit field types (f64 instead of float hints). Python's self.width becomes self.width via pointer access. Python's dynamic typing is replaced by Zig's compile-time type checking. math.sqrt() becomes @sqrt(), and ** exponentiation becomes std.math.pow(). Python's list comprehensions become explicit loops in Zig. The development speed trade-off is stark — Python's rapid prototyping vs Zig's zero-overhead performance with compile-time safety guarantees.",
  "r-rust": "Rust's struct with impl blocks becomes R's list or R6 class. .powf(), .sqrt(), .abs() maps to built-in functions. Rust's ownership/borrowing system memory contrasts with R's garbage collected approach. static, strong with lifetimes typing meets dynamic, vector-native typing.",
  "r-swift": "R's list or R6 class becomes Swift's struct with mutating func. built-in functions maps to Foundation/Darwin math. R's garbage collected memory contrasts with Swift's ARC (automatic reference counting) approach. dynamic, vector-native typing meets static, strong with optionals typing.",
  "r-typescript": "R's list or R6 class becomes TypeScript's class with interface. built-in functions maps to Math object. dynamic, vector-native typing meets static (structural) typing. R's <- assignment, vectorized operations vs TypeScript's type annotations, interfaces, generics.",
  "r-wasm": "R's list or R6 class becomes WebAssembly/WAT's linear memory layout. built-in functions maps to f64.mul, f64.sqrt. R's garbage collected memory contrasts with WebAssembly/WAT's linear memory (manual) approach. dynamic, vector-native typing meets static (i32/i64/f32/f64) typing.",
  "r-zig": "Zig's struct with namespaced fn becomes R's list or R6 class. @sqrt, std.math.pow maps to built-in functions. Zig's manual with allocator interface memory contrasts with R's garbage collected approach. static with comptime typing meets dynamic, vector-native typing.",
  "rust-cpp": "Both are systems languages with zero-cost abstractions. Rust's ownership/borrowing replaces C++'s manual memory management and smart pointers. Rust's impl becomes C++'s class methods. Rust's match becomes C++'s switch. Rust guarantees memory safety at compile time; C++ relies on programmer discipline. Both compile to highly optimized native code.",
  "rust-fortran": "Two high-performance languages with different eras. Rust's ownership/borrowing model replaces Fortran's intent(in/inout) system for controlling data flow. Rust's .iter().map().sum() becomes Fortran's explicit do loops. Both excel at numerical computation, but Rust adds memory safety guarantees that Fortran lacks. Fortran's 1-based arrays vs Rust's 0-based indexing requires careful translation.",
  "rust-go": "Both are modern compiled languages, but with different philosophies. Rust's ownership model vs Go's garbage collector. Rust's impl blocks vs Go's methods defined outside the struct. Both use explicit error handling, but Rust uses Result<T,E> while Go uses multiple returns. Go's simplicity trades some of Rust's safety guarantees for faster development speed.",
  "rust-javascript": "Rust's strict type system and ownership model contrast sharply with JavaScript's dynamic typing. Rust's struct + impl becomes JavaScript's class. Rust's Result/Option types become JavaScript's try/catch or null checks. The .powf() and .sqrt() methods become Math.pow() and Math.sqrt(). Rust compiles to WebAssembly, so these two languages can actually work together in the browser.",
  "rust-julia": "Both are modern systems languages with expressive type systems. Rust's impl blocks become Julia's multiple dispatch functions. Rust's match becomes Julia's if/elseif. Both use Unicode support, but Julia embraces it more fully. Rust guarantees memory safety at compile time; Julia uses garbage collection. Julia's JIT compilation vs Rust's ahead-of-time compilation represents different performance trade-offs.",
  "rust-python": "Rust's strict ownership model relaxes into Python's garbage-collected simplicity. Rust's &self/&mut self distinction disappears \u2014 Python methods freely mutate self. Type annotations (f64 \u2192 float) become optional hints rather than compiler-enforced. Pattern matching and Result types become try/except. The performance gap is significant, but Python's readability and ecosystem (numpy, scipy) often compensate.",
  "rust-swift": "Rust's struct with impl blocks becomes Swift's struct with mutating func. .powf(), .sqrt(), .abs() maps to Foundation/Darwin math. Rust's ownership/borrowing system memory contrasts with Swift's ARC (automatic reference counting) approach. static, strong with lifetimes typing meets static, strong with optionals typing.",
  "rust-typescript": "Rust's struct with impl blocks becomes TypeScript's class with interface. .powf(), .sqrt(), .abs() maps to Math object. Rust's ownership/borrowing system memory contrasts with TypeScript's garbage collected approach. static, strong with lifetimes typing meets static (structural) typing.",
  "rust-wasm": "Rust's struct with impl blocks becomes WebAssembly/WAT's linear memory layout. .powf(), .sqrt(), .abs() maps to f64.mul, f64.sqrt. Rust's ownership/borrowing system memory contrasts with WebAssembly/WAT's linear memory (manual) approach. static, strong with lifetimes typing meets static (i32/i64/f32/f64) typing.",
  "rust-zig": "Two modern systems languages with different safety strategies. Rust's ownership/borrowing model is replaced by Zig's simpler pointer semantics with optional safety checks. Rust's impl blocks become Zig's namespaced struct functions. Rust's .powf() and .sqrt() become std.math.pow() and @sqrt(). Rust's match becomes Zig's switch. Rust's Result<T,E> maps to Zig's error unions (!T). Rust enforces safety through the type system; Zig trusts the programmer but provides runtime safety checks in debug mode.",
  "swift-kotlin": "Modern mobile-platform languages with similar philosophies. Swift's struct becomes Kotlin's data class. Swift's guard/let becomes Kotlin's let/require. Swift's optionals (Double?) match Kotlin's nullable types (Double?). Swift targets Apple/iOS; Kotlin targets Android/JVM. Both enable mobile SWMM tools for field engineers.",
  "swift-typescript": "TypeScript's class with interface becomes Swift's struct with mutating func. Math object maps to Foundation/Darwin math. TypeScript's garbage collected memory contrasts with Swift's ARC (automatic reference counting) approach. static (structural) typing meets static, strong with optionals typing.",
  "swift-wasm": "WebAssembly/WAT's linear memory layout becomes Swift's struct with mutating func. f64.mul, f64.sqrt maps to Foundation/Darwin math. WebAssembly/WAT's linear memory (manual) memory contrasts with Swift's ARC (automatic reference counting) approach. static (i32/i64/f32/f64) typing meets static, strong with optionals typing.",
  "swift-zig": "Zig's struct with namespaced fn becomes Swift's struct with mutating func. @sqrt, std.math.pow maps to Foundation/Darwin math. Zig's manual with allocator interface memory contrasts with Swift's ARC (automatic reference counting) approach. static with comptime typing meets static, strong with optionals typing.",
  "typescript-wasm": "TypeScript's class with interface becomes WebAssembly/WAT's linear memory layout. Math object maps to f64.mul, f64.sqrt. TypeScript's garbage collected memory contrasts with WebAssembly/WAT's linear memory (manual) approach. static (structural) typing meets static (i32/i64/f32/f64) typing.",
  "typescript-zig": "Zig's struct with namespaced fn becomes TypeScript's class with interface. @sqrt, std.math.pow maps to Math object. Zig's manual with allocator interface memory contrasts with TypeScript's garbage collected approach. static with comptime typing meets static (structural) typing.",
  "wasm-zig": "Zig's struct with namespaced fn becomes WebAssembly/WAT's linear memory layout. @sqrt, std.math.pow maps to f64.mul, f64.sqrt. Zig's manual with allocator interface memory contrasts with WebAssembly/WAT's linear memory (manual) approach. static with comptime typing meets static (i32/i64/f32/f64) typing."
};

export { modules, languages, translationNotes };
