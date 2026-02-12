import { useState, useEffect, useRef } from "react";

// ─── Code Samples ────────────────────────────────────────────────────
const modules = {
  "rdii.c — RTK Unit Hydrograph": {
    category: "Hydrology",
    difficulty: "intermediate",
    description: "Computes how rainfall enters the sewer system through cracked pipes, deteriorated manholes, and illegal connections. Uses three triangular unit hydrographs (R, T, K) representing short-term, medium-term, and long-term rainfall response. This is SWMM5's method for modeling \"wet weather\" inflow — the extra flow that overwhelms sewers during storms.",
    equations: "Q(t) = R * P(t) * UH(t), where UH is triangular with peak = 2/T_base at time T, base = T*(1+K)",
    inputs: "Rainfall time series, R/T/K parameters per unit hydrograph, subcatchment area",
    outputs: "RDII flow time series (added to dry weather flow at each node)",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "PySWMM Wrapper", url: "https://github.com/pyswmm/pyswmm" },
    ],
    c: `// rdii.c — RTK Unit Hydrograph Response
// EPA SWMM5 Engine — Rain-Dependent Infiltration/Inflow
// Computes RDII flow from rainfall using three
// triangular unit hydrographs (short, medium, long term)

typedef struct {
    double r;        // fraction of rainfall volume
    double t;        // time to peak (hours)
    double k;        // ratio of recession to time-to-peak
    double tBase;    // total base time = t * (1 + k)
} TUnitHyd;

double rdii_getUnitHydOrd(TUnitHyd* uh, double t)
{
    // Returns unit hydrograph ordinate at time t (hours)
    double qPeak, tBase;

    // Compute peak flow rate (area = 1.0)
    tBase = uh->t * (1.0 + uh->k);
    if (tBase <= 0.0) return 0.0;
    qPeak = 2.0 / tBase;

    // Rising limb
    if (t <= uh->t)
    {
        if (uh->t <= 0.0) return 0.0;
        return qPeak * t / uh->t;
    }

    // Recession limb
    if (t <= tBase)
    {
        double tRecession = uh->k * uh->t;
        if (tRecession <= 0.0) return 0.0;
        return qPeak * (tBase - t) / tRecession;
    }

    return 0.0;
}

double rdii_getRdiiFlow(TUnitHyd uh[3], double* rainfall,
                        int nPeriods, int period, double area)
{
    // Convolve rainfall with three unit hydrographs
    double flow = 0.0;
    int i, j;

    for (i = 0; i < 3; i++)
    {
        if (uh[i].r <= 0.0) continue;
        for (j = 0; j <= period; j++)
        {
            double t = (period - j) * 1.0; // time in hours
            double uhOrd = rdii_getUnitHydOrd(&uh[i], t);
            flow += uh[i].r * rainfall[j] * uhOrd * area;
        }
    }
    return flow;
}`,
    rust: `// rdii.rs — RTK Unit Hydrograph Response
// SWMM5 Engine in Rust — Rain-Dependent Infiltration/Inflow
// Computes RDII flow from rainfall using three
// triangular unit hydrographs (short, medium, long term)

#[derive(Clone, Debug)]
pub struct UnitHyd {
    pub r: f64,       // fraction of rainfall volume
    pub t: f64,       // time to peak (hours)
    pub k: f64,       // ratio of recession to time-to-peak
    pub t_base: f64,  // total base time = t * (1 + k)
}

impl UnitHyd {
    /// Returns unit hydrograph ordinate at time t (hours)
    pub fn get_ordinate(&self, t: f64) -> f64 {
        let t_base = self.t * (1.0 + self.k);
        if t_base <= 0.0 { return 0.0; }

        let q_peak = 2.0 / t_base;

        // Rising limb
        if t <= self.t {
            if self.t <= 0.0 { return 0.0; }
            return q_peak * t / self.t;
        }

        // Recession limb
        if t <= t_base {
            let t_recession = self.k * self.t;
            if t_recession <= 0.0 { return 0.0; }
            return q_peak * (t_base - t) / t_recession;
        }

        0.0
    }
}

/// Convolve rainfall with three RTK unit hydrographs
pub fn get_rdii_flow(
    uh: &[UnitHyd; 3],
    rainfall: &[f64],
    period: usize,
    area: f64,
) -> f64 {
    uh.iter()
        .filter(|u| u.r > 0.0)
        .map(|u| {
            (0..=period)
                .map(|j| {
                    let t = (period - j) as f64;
                    u.r * rainfall[j] * u.get_ordinate(t) * area
                })
                .sum::<f64>()
        })
        .sum()
}`,
    python: `# rdii.py — RTK Unit Hydrograph Response
# SWMM5 Engine in Python — Rain-Dependent Infiltration/Inflow
# Computes RDII flow from rainfall using three
# triangular unit hydrographs (short, medium, long term)

from dataclasses import dataclass

@dataclass
class UnitHyd:
    r: float       # fraction of rainfall volume
    t: float       # time to peak (hours)
    k: float       # ratio of recession to time-to-peak

    @property
    def t_base(self) -> float:
        """Total base time = t * (1 + k)"""
        return self.t * (1.0 + self.k)

    def get_ordinate(self, time: float) -> float:
        """Returns unit hydrograph ordinate at given time (hours)."""
        t_base = self.t_base
        if t_base <= 0.0:
            return 0.0

        q_peak = 2.0 / t_base

        # Rising limb
        if time <= self.t:
            if self.t <= 0.0:
                return 0.0
            return q_peak * time / self.t

        # Recession limb
        if time <= t_base:
            t_recession = self.k * self.t
            if t_recession <= 0.0:
                return 0.0
            return q_peak * (t_base - time) / t_recession

        return 0.0


def get_rdii_flow(
    unit_hyds: list[UnitHyd],
    rainfall: list[float],
    period: int,
    area: float,
) -> float:
    """Convolve rainfall with three RTK unit hydrographs."""
    flow = 0.0
    for uh in unit_hyds:
        if uh.r <= 0.0:
            continue
        for j in range(period + 1):
            t = float(period - j)
            uh_ord = uh.get_ordinate(t)
            flow += uh.r * rainfall[j] * uh_ord * area
    return flow`,
    fortran: `! rdii.f90 — RTK Unit Hydrograph Response
! SWMM5 Engine in Fortran — Rain-Dependent Infiltration/Inflow
! Computes RDII flow from rainfall using three
! triangular unit hydrographs (short, medium, long term)

module rdii_module
    implicit none

    type :: UnitHyd
        real(8) :: r       ! fraction of rainfall volume
        real(8) :: t       ! time to peak (hours)
        real(8) :: k       ! ratio of recession to time-to-peak
    end type UnitHyd

contains

    function get_unit_hyd_ord(uh, time) result(ord)
        ! Returns unit hydrograph ordinate at given time
        type(UnitHyd), intent(in) :: uh
        real(8), intent(in) :: time
        real(8) :: ord, t_base, q_peak, t_recession

        t_base = uh%t * (1.0d0 + uh%k)
        if (t_base <= 0.0d0) then
            ord = 0.0d0
            return
        end if

        q_peak = 2.0d0 / t_base

        ! Rising limb
        if (time <= uh%t) then
            if (uh%t <= 0.0d0) then
                ord = 0.0d0
            else
                ord = q_peak * time / uh%t
            end if
            return
        end if

        ! Recession limb
        if (time <= t_base) then
            t_recession = uh%k * uh%t
            if (t_recession <= 0.0d0) then
                ord = 0.0d0
            else
                ord = q_peak * (t_base - time) / t_recession
            end if
            return
        end if

        ord = 0.0d0
    end function get_unit_hyd_ord

    function get_rdii_flow(uh, rainfall, n_periods, &
                           period, area) result(flow)
        ! Convolve rainfall with three RTK unit hydrographs
        type(UnitHyd), intent(in) :: uh(3)
        real(8), intent(in) :: rainfall(:)
        integer, intent(in) :: n_periods, period
        real(8), intent(in) :: area
        real(8) :: flow, t, uh_ord
        integer :: i, j

        flow = 0.0d0
        do i = 1, 3
            if (uh(i)%r <= 0.0d0) cycle
            do j = 0, period
                t = dble(period - j)
                uh_ord = get_unit_hyd_ord(uh(i), t)
                flow = flow + uh(i)%r * rainfall(j+1) &
                       * uh_ord * area
            end do
        end do
    end function get_rdii_flow

end module rdii_module`,
    julia: `# rdii.jl — RTK Unit Hydrograph Response
# SWMM5 Engine in Julia — Rain-Dependent Infiltration/Inflow
# Computes RDII flow from rainfall using three
# triangular unit hydrographs (short, medium, long term)

struct UnitHyd
    r::Float64       # fraction of rainfall volume
    t::Float64       # time to peak (hours)
    k::Float64       # ratio of recession to time-to-peak
end

# Total base time
t_base(uh::UnitHyd) = uh.t * (1.0 + uh.k)

function get_ordinate(uh::UnitHyd, time::Float64)::Float64
    """Returns unit hydrograph ordinate at given time (hours)."""
    tb = t_base(uh)
    tb ≤ 0.0 && return 0.0

    q_peak = 2.0 / tb

    # Rising limb
    if time ≤ uh.t
        uh.t ≤ 0.0 && return 0.0
        return q_peak * time / uh.t
    end

    # Recession limb
    if time ≤ tb
        t_recession = uh.k * uh.t
        t_recession ≤ 0.0 && return 0.0
        return q_peak * (tb - time) / t_recession
    end

    return 0.0
end

function get_rdii_flow(
    unit_hyds::Vector{UnitHyd},
    rainfall::Vector{Float64},
    period::Int,
    area::Float64
)::Float64
    """Convolve rainfall with three RTK unit hydrographs."""
    flow = 0.0
    for uh in unit_hyds
        uh.r ≤ 0.0 && continue
        for j in 0:period
            t = Float64(period - j)
            flow += uh.r * rainfall[j+1] * get_ordinate(uh, t) * area
        end
    end
    return flow
end`,
    javascript: `// rdii.js — RTK Unit Hydrograph Response
// SWMM5 Engine in JavaScript — Rain-Dependent Infiltration/Inflow
// Computes RDII flow from rainfall using three
// triangular unit hydrographs (short, medium, long term)

class UnitHyd {
    constructor(r, t, k) {
        this.r = r;       // fraction of rainfall volume
        this.t = t;       // time to peak (hours)
        this.k = k;       // ratio of recession to time-to-peak
    }

    get tBase() {
        return this.t * (1.0 + this.k);
    }

    /** Returns unit hydrograph ordinate at time t (hours) */
    getOrdinate(time) {
        const tBase = this.tBase;
        if (tBase <= 0.0) return 0.0;

        const qPeak = 2.0 / tBase;

        // Rising limb
        if (time <= this.t) {
            if (this.t <= 0.0) return 0.0;
            return qPeak * time / this.t;
        }

        // Recession limb
        if (time <= tBase) {
            const tRecession = this.k * this.t;
            if (tRecession <= 0.0) return 0.0;
            return qPeak * (tBase - time) / tRecession;
        }

        return 0.0;
    }
}

/** Convolve rainfall with three RTK unit hydrographs */
function getRdiiFlow(unitHyds, rainfall, period, area) {
    let flow = 0.0;

    for (const uh of unitHyds) {
        if (uh.r <= 0.0) continue;
        for (let j = 0; j <= period; j++) {
            const t = period - j;
            const uhOrd = uh.getOrdinate(t);
            flow += uh.r * rainfall[j] * uhOrd * area;
        }
    }

    return flow;
}

export { UnitHyd, getRdiiFlow };`,
    go: `// rdii.go — RTK Unit Hydrograph Response
// SWMM5 Engine in Go — Rain-Dependent Infiltration/Inflow
// Computes RDII flow from rainfall using three
// triangular unit hydrographs (short, medium, long term)

package swmm

// UnitHyd represents a single RTK triangular unit hydrograph
type UnitHyd struct {
    R float64 // fraction of rainfall volume
    T float64 // time to peak (hours)
    K float64 // ratio of recession to time-to-peak
}

// TBase returns total base time = T * (1 + K)
func (uh *UnitHyd) TBase() float64 {
    return uh.T * (1.0 + uh.K)
}

// GetOrdinate returns unit hydrograph ordinate at time t
func (uh *UnitHyd) GetOrdinate(t float64) float64 {
    tBase := uh.TBase()
    if tBase <= 0.0 {
        return 0.0
    }

    qPeak := 2.0 / tBase

    // Rising limb
    if t <= uh.T {
        if uh.T <= 0.0 {
            return 0.0
        }
        return qPeak * t / uh.T
    }

    // Recession limb
    if t <= tBase {
        tRecession := uh.K * uh.T
        if tRecession <= 0.0 {
            return 0.0
        }
        return qPeak * (tBase - t) / tRecession
    }

    return 0.0
}

// GetRdiiFlow convolves rainfall with three unit hydrographs
func GetRdiiFlow(uh [3]UnitHyd, rainfall []float64,
    period int, area float64) float64 {

    flow := 0.0
    for i := 0; i < 3; i++ {
        if uh[i].R <= 0.0 {
            continue
        }
        for j := 0; j <= period; j++ {
            t := float64(period - j)
            uhOrd := uh[i].GetOrdinate(t)
            flow += uh[i].R * rainfall[j] * uhOrd * area
        }
    }
    return flow
}`,
  },
  "runoff.c — Surface Runoff": {
    category: "Hydrology",
    difficulty: "intermediate",
    description: "Computes how rainwater flows across the land surface into the drainage system. Uses Manning's equation with a nonlinear reservoir approach — water pools on the surface (depression storage) and only runs off once the depth exceeds what the ground can hold. Also includes Green-Ampt infiltration to determine how much rainfall soaks into the soil versus becoming runoff.",
    equations: "Q = (W * S^0.5 / n) * (d - d_store)^(5/3) / A (Manning's); f = Ks * (1 + psi * deficit / F) (Green-Ampt)",
    inputs: "Subcatchment area, width, slope, Manning's n, depression storage, soil properties",
    outputs: "Surface runoff flow rate, infiltration rate",
    links: [
      { label: "EPA SWMM5 Source", url: "https://github.com/USEPA/Stormwater-Management-Model" },
      { label: "SWMM5+ Fortran Engine", url: "https://github.com/CIMM-ORG/SWMM5plus" },
    ],
    c: `// runoff.c — Nonlinear Reservoir Surface Runoff
// EPA SWMM5 Engine — Subcatchment Overland Flow
// Uses Manning's equation with depth-based nonlinear
// reservoir routing for subcatchment runoff

typedef struct {
    double area;        // subcatchment area (ft2)
    double width;       // characteristic width (ft)
    double slope;       // average surface slope
    double nPerv;       // Manning's n for pervious area
    double nImperv;     // Manning's n for impervious area
    double dStorePerv;  // depression storage, pervious (ft)
    double dStoreImperv;// depression storage, impervious (ft)
} TSubcatch;

double runoff_getRunoff(TSubcatch* sc, double depth,
                        double nMannings, double dStore)
{
    // Computes outflow from a subcatchment using
    // Manning's equation for nonlinear reservoir
    double excess, alpha, outflow;

    // Depth must exceed depression storage
    excess = depth - dStore;
    if (excess <= 0.0) return 0.0;

    // Manning's discharge coefficient
    // alpha = W * S^0.5 / n  (per unit area)
    alpha = sc->width * sqrt(sc->slope) / nMannings;
    if (alpha <= 0.0) return 0.0;

    // Q = alpha * (d - dStore)^(5/3) / Area
    outflow = alpha * pow(excess, 5.0 / 3.0) / sc->area;

    return outflow;
}

double runoff_getInfiltration(double rainfall,
    double upperMoist, double ks, double psi)
{
    // Green-Ampt infiltration estimate
    // f = Ks * (1 + psi * (porosity - moisture) / F)
    double deficit, infil;

    deficit = 1.0 - upperMoist;
    if (deficit <= 0.0) return 0.0;

    infil = ks * (1.0 + psi * deficit / rainfall);
    if (infil > rainfall) infil = rainfall;

    return infil;
}`,
    rust: `// runoff.rs — Nonlinear Reservoir Surface Runoff
// SWMM5 Engine in Rust — Subcatchment Overland Flow
// Uses Manning's equation with depth-based nonlinear
// reservoir routing for subcatchment runoff

pub struct Subcatch {
    pub area: f64,          // subcatchment area (ft²)
    pub width: f64,         // characteristic width (ft)
    pub slope: f64,         // average surface slope
    pub n_perv: f64,        // Manning's n for pervious
    pub n_imperv: f64,      // Manning's n for impervious
    pub d_store_perv: f64,  // depression storage, perv (ft)
    pub d_store_imperv: f64,// depression storage, imperv
}

impl Subcatch {
    /// Computes outflow using Manning's nonlinear reservoir
    pub fn get_runoff(&self, depth: f64, n_mannings: f64,
                      d_store: f64) -> f64 {
        // Depth must exceed depression storage
        let excess = depth - d_store;
        if excess <= 0.0 { return 0.0; }

        // Manning's discharge coefficient
        // alpha = W * S^0.5 / n
        let alpha = self.width * self.slope.sqrt()
                    / n_mannings;
        if alpha <= 0.0 { return 0.0; }

        // Q = alpha * (d - dStore)^(5/3) / Area
        alpha * excess.powf(5.0 / 3.0) / self.area
    }
}

/// Green-Ampt infiltration estimate
pub fn get_infiltration(rainfall: f64, upper_moist: f64,
                        ks: f64, psi: f64) -> f64 {
    let deficit = 1.0 - upper_moist;
    if deficit <= 0.0 { return 0.0; }

    let infil = ks * (1.0 + psi * deficit / rainfall);
    infil.min(rainfall)
}`,
    python: `# runoff.py — Nonlinear Reservoir Surface Runoff
# SWMM5 Engine in Python — Subcatchment Overland Flow
# Uses Manning's equation with depth-based nonlinear
# reservoir routing for subcatchment runoff

import math
from dataclasses import dataclass

@dataclass
class Subcatch:
    area: float          # subcatchment area (ft²)
    width: float         # characteristic width (ft)
    slope: float         # average surface slope
    n_perv: float        # Manning's n for pervious
    n_imperv: float      # Manning's n for impervious
    d_store_perv: float  # depression storage, perv (ft)
    d_store_imperv: float# depression storage, imperv

    def get_runoff(self, depth: float, n_mannings: float,
                   d_store: float) -> float:
        """Computes outflow using Manning's nonlinear reservoir."""
        # Depth must exceed depression storage
        excess = depth - d_store
        if excess <= 0.0:
            return 0.0

        # Manning's discharge coefficient
        alpha = (self.width * math.sqrt(self.slope)
                 / n_mannings)
        if alpha <= 0.0:
            return 0.0

        # Q = alpha * (d - dStore)^(5/3) / Area
        return alpha * excess ** (5.0 / 3.0) / self.area


def get_infiltration(rainfall: float, upper_moist: float,
                     ks: float, psi: float) -> float:
    """Green-Ampt infiltration estimate."""
    deficit = 1.0 - upper_moist
    if deficit <= 0.0:
        return 0.0

    infil = ks * (1.0 + psi * deficit / rainfall)
    return min(infil, rainfall)`,
    fortran: `! runoff.f90 — Nonlinear Reservoir Surface Runoff
! SWMM5 Engine in Fortran — Subcatchment Overland Flow
! Uses Manning's equation with depth-based nonlinear
! reservoir routing for subcatchment runoff

module runoff_module
    implicit none

    type :: Subcatch
        real(8) :: area          ! subcatchment area (ft²)
        real(8) :: width         ! characteristic width (ft)
        real(8) :: slope         ! average surface slope
        real(8) :: n_perv        ! Manning's n for pervious
        real(8) :: n_imperv      ! Manning's n for impervious
        real(8) :: d_store_perv  ! depression storage (ft)
        real(8) :: d_store_imperv
    end type Subcatch

contains

    function get_runoff(sc, depth, n_mannings, &
                        d_store) result(outflow)
        type(Subcatch), intent(in) :: sc
        real(8), intent(in) :: depth, n_mannings, d_store
        real(8) :: outflow, excess, alpha

        excess = depth - d_store
        if (excess <= 0.0d0) then
            outflow = 0.0d0
            return
        end if

        alpha = sc%width * sqrt(sc%slope) / n_mannings
        if (alpha <= 0.0d0) then
            outflow = 0.0d0
            return
        end if

        outflow = alpha * excess**(5.0d0/3.0d0) / sc%area
    end function get_runoff

    function get_infiltration(rainfall, upper_moist, &
                              ks, psi) result(infil)
        real(8), intent(in) :: rainfall, upper_moist
        real(8), intent(in) :: ks, psi
        real(8) :: infil, deficit

        deficit = 1.0d0 - upper_moist
        if (deficit <= 0.0d0) then
            infil = 0.0d0
            return
        end if

        infil = ks * (1.0d0 + psi * deficit / rainfall)
        if (infil > rainfall) infil = rainfall
    end function get_infiltration

end module runoff_module`,
    julia: `# runoff.jl — Nonlinear Reservoir Surface Runoff
# SWMM5 Engine in Julia — Subcatchment Overland Flow
# Uses Manning's equation with depth-based nonlinear
# reservoir routing for subcatchment runoff

struct Subcatch
    area::Float64          # subcatchment area (ft²)
    width::Float64         # characteristic width (ft)
    slope::Float64         # average surface slope
    n_perv::Float64        # Manning's n for pervious
    n_imperv::Float64      # Manning's n for impervious
    d_store_perv::Float64  # depression storage (ft)
    d_store_imperv::Float64
end

function get_runoff(sc::Subcatch, depth::Float64,
                    n_mannings::Float64,
                    d_store::Float64)::Float64
    # Depth must exceed depression storage
    excess = depth - d_store
    excess ≤ 0.0 && return 0.0

    # Manning's discharge coefficient
    alpha = sc.width * sqrt(sc.slope) / n_mannings
    alpha ≤ 0.0 && return 0.0

    # Q = alpha * (d - dStore)^(5/3) / Area
    return alpha * excess^(5.0/3.0) / sc.area
end

function get_infiltration(rainfall::Float64,
    upper_moist::Float64, ks::Float64,
    psi::Float64)::Float64
    """Green-Ampt infiltration estimate."""
    deficit = 1.0 - upper_moist
    deficit ≤ 0.0 && return 0.0

    infil = ks * (1.0 + psi * deficit / rainfall)
    return min(infil, rainfall)
end`,
    javascript: `// runoff.js — Nonlinear Reservoir Surface Runoff
// SWMM5 Engine in JavaScript — Subcatchment Overland Flow
// Uses Manning's equation with depth-based nonlinear
// reservoir routing for subcatchment runoff

class Subcatch {
    constructor({ area, width, slope, nPerv, nImperv,
                  dStorePerv, dStoreImperv }) {
        this.area = area;
        this.width = width;
        this.slope = slope;
        this.nPerv = nPerv;
        this.nImperv = nImperv;
        this.dStorePerv = dStorePerv;
        this.dStoreImperv = dStoreImperv;
    }

    /** Computes outflow using Manning's nonlinear reservoir */
    getRunoff(depth, nMannings, dStore) {
        const excess = depth - dStore;
        if (excess <= 0.0) return 0.0;

        const alpha = this.width * Math.sqrt(this.slope)
                      / nMannings;
        if (alpha <= 0.0) return 0.0;

        return alpha * Math.pow(excess, 5.0 / 3.0)
               / this.area;
    }
}

/** Green-Ampt infiltration estimate */
function getInfiltration(rainfall, upperMoist, ks, psi) {
    const deficit = 1.0 - upperMoist;
    if (deficit <= 0.0) return 0.0;

    const infil = ks * (1.0 + psi * deficit / rainfall);
    return Math.min(infil, rainfall);
}

export { Subcatch, getInfiltration };`,
    go: `// runoff.go — Nonlinear Reservoir Surface Runoff
// SWMM5 Engine in Go — Subcatchment Overland Flow
// Uses Manning's equation with depth-based nonlinear
// reservoir routing for subcatchment runoff

package swmm

import "math"

type Subcatch struct {
    Area         float64 // subcatchment area (ft²)
    Width        float64 // characteristic width (ft)
    Slope        float64 // average surface slope
    NPerv        float64 // Manning's n for pervious
    NImperv      float64 // Manning's n for impervious
    DStorePerv   float64 // depression storage (ft)
    DStoreImperv float64
}

// GetRunoff computes outflow using Manning's nonlinear
// reservoir equation
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

    return alpha * math.Pow(excess, 5.0/3.0) / sc.Area
}

// GetInfiltration computes Green-Ampt infiltration
func GetInfiltration(rainfall, upperMoist,
    ks, psi float64) float64 {

    deficit := 1.0 - upperMoist
    if deficit <= 0.0 {
        return 0.0
    }

    infil := ks * (1.0 + psi*deficit/rainfall)
    if infil > rainfall {
        infil = rainfall
    }
    return infil
}`,
  },
};

const languages = [
  { id: "c", label: "C", ext: ".c", color: "#555555" },
  { id: "rust", label: "Rust", ext: ".rs", color: "#DEA584" },
  { id: "python", label: "Python", ext: ".py", color: "#3572A5" },
  { id: "fortran", label: "Fortran", ext: ".f90", color: "#4d41b1" },
  { id: "julia", label: "Julia", ext: ".jl", color: "#9558B2" },
  { id: "javascript", label: "JavaScript", ext: ".js", color: "#f1e05a" },
  { id: "go", label: "Go", ext: ".go", color: "#00ADD8" },
];

// ─── Syntax Highlighting ─────────────────────────────────────────────

const keywordSets = {
  c: /\b(typedef|struct|double|int|void|return|if|else|for|continue)\b/g,
  rust: /\b(pub|fn|struct|let|if|return|impl|self|use|mut|const|for|in|f64|usize|Self)\b/g,
  python: /\b(class|def|self|return|if|else|for|in|import|from|float|int|list|continue|property|min)\b/g,
  fortran: /\b(module|implicit|none|type|real|integer|function|result|end|if|then|return|do|contains|intent|in|cycle|use|subroutine|call)\b/g,
  julia: /\b(struct|function|end|return|if|for|in|Float64|Int|Vector|import|using|const|module|export)\b/g,
  javascript: /\b(class|constructor|this|const|let|var|function|return|if|else|for|of|export|new|get|Math)\b/g,
  go: /\b(package|import|type|struct|func|return|if|for|float64|int|var|range|continue)\b/g,
};

const commentPatterns = {
  c: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  rust: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  python: /(#.*$|"""[\s\S]*?"""|'''[\s\S]*?''')/gm,
  fortran: /(!.*$)/gm,
  julia: /(#.*$|"""[\s\S]*?""")/gm,
  javascript: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
  go: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
};

const stringPattern = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
const numberPattern = /\b(\d+\.?\d*(?:[eE][+-]?\d+)?(?:d0|d\d)?)\b/g;

function highlightCode(code, langId) {
  let html = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const tokens = [];
  function stash(match) {
    const id = `%%TOK${tokens.length}%%`;
    tokens.push(match);
    return id;
  }

  const commentRe = commentPatterns[langId];
  if (commentRe) {
    html = html.replace(commentRe, (m) => stash(`<span class="cm">${m}</span>`));
  }

  html = html.replace(stringPattern, (m) => stash(`<span class="st">${m}</span>`));

  const kwRe = keywordSets[langId];
  if (kwRe) {
    html = html.replace(kwRe, (m) => stash(`<span class="kw">${m}</span>`));
  }

  html = html.replace(numberPattern, (m) => stash(`<span class="nu">${m}</span>`));

  html = html.replace(/%%TOK(\d+)%%/g, (_, i) => tokens[parseInt(i)]);

  return html;
}

// ─── Difficulty Badge ────────────────────────────────────────────────

const difficultyConfig = {
  accessible: { label: "Accessible", color: "#50a14f", icon: "\u{1F7E2}" },
  intermediate: { label: "Intermediate", color: "#c18401", icon: "\u{1F7E1}" },
  advanced: { label: "Advanced", color: "#e45649", icon: "\u{1F534}" },
};

// ─── Components ──────────────────────────────────────────────────────

function CodePanel({ code, langId, label, color, t, scrollRef, onScroll }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      borderRadius: 8,
      overflow: "hidden",
      border: `1px solid ${t.border}`,
      background: t.panelBg,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: t.panelHeader,
        borderBottom: `1px solid ${t.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: color, boxShadow: `0 0 6px ${color}55`,
        }} />
        <span style={{
          fontSize: 13, fontWeight: 600, color: t.text,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          letterSpacing: 0.5,
        }}>{label}</span>
        <button
          onClick={handleCopy}
          title="Copy code"
          style={{
            marginLeft: "auto",
            padding: "3px 8px",
            borderRadius: 4,
            border: `1px solid ${t.border}`,
            background: copied ? t.accent + "22" : "transparent",
            color: copied ? t.accent : t.textDim,
            cursor: "pointer",
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
            transition: "all 0.2s",
          }}
        >
          {copied ? "\u2713 Copied" : "Copy"}
        </button>
      </div>
      <div ref={scrollRef} onScroll={onScroll} style={{
        flex: 1,
        overflow: "auto",
        padding: "12px 0",
        fontSize: 12.5,
        lineHeight: 1.65,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Source Code Pro', monospace",
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            display: "flex",
            minHeight: 20,
            paddingRight: 16,
          }}>
            <span style={{
              width: 44,
              flexShrink: 0,
              textAlign: "right",
              paddingRight: 14,
              color: t.lineNum,
              userSelect: "none",
              fontSize: 11,
            }}>{i + 1}</span>
            <span
              style={{ color: t.text, whiteSpace: "pre" }}
              dangerouslySetInnerHTML={{
                __html: highlightCode(line, langId),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleInfoPanel({ mod, t, show, onToggle }) {
  if (!show) return null;

  const diff = difficultyConfig[mod.difficulty] || difficultyConfig.intermediate;

  return (
    <div style={{
      margin: "0 20px",
      padding: "16px 20px",
      background: t.notesBg,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.7,
      color: t.textMuted,
    }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <span style={{
          padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
          background: t.accent + "18", color: t.accent, border: `1px solid ${t.accent}33`,
        }}>{mod.category}</span>
        <span style={{
          padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
          background: diff.color + "18", color: diff.color, border: `1px solid ${diff.color}33`,
        }}>{diff.icon} {diff.label}</span>
      </div>

      {mod.equations && (
        <div style={{ marginBottom: 8 }}>
          <strong style={{ color: t.accentAlt }}>Equations: </strong>
          <code style={{
            fontSize: 12, background: t.panelBg, padding: "2px 6px",
            borderRadius: 4, fontFamily: "'JetBrains Mono', monospace",
          }}>{mod.equations}</code>
        </div>
      )}

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 8 }}>
        {mod.inputs && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: t.textBright, fontSize: 12 }}>Inputs: </strong>
            <span style={{ fontSize: 12 }}>{mod.inputs}</span>
          </div>
        )}
        {mod.outputs && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <strong style={{ color: t.textBright, fontSize: 12 }}>Outputs: </strong>
            <span style={{ fontSize: 12 }}>{mod.outputs}</span>
          </div>
        )}
      </div>

      {mod.links && mod.links.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          {mod.links.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: 11, color: t.accent, textDecoration: "none",
                padding: "3px 10px", borderRadius: 4,
                border: `1px solid ${t.accent}33`, background: t.accent + "08",
              }}
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Themes ──────────────────────────────────────────────────────────

const themes = {
  dark: {
    bg: "#0d0f17",
    text: "#c8ccd8",
    textBright: "#e8ecf4",
    textMuted: "#6b7185",
    textDim: "#5c6370",
    textFaint: "#3a3f52",
    panelBg: "#12141c",
    panelHeader: "#1a1d28",
    border: "#2a2e3a",
    borderLight: "#1e2130",
    borderSubtle: "#1a1d28",
    activeBg: "#1e2130",
    activeBorder: "#3a3f55",
    hoverBg: "#1a1d28",
    modActiveBg: "#1a1d2e",
    notesBg: "#141620",
    accent: "#61afef",
    accentAlt: "#c678dd",
    scrollThumb: "#2a2e3a",
    scrollThumbHover: "#3a3f55",
    lineNum: "#3a3f52",
    cm: "#5c6370",
    kw: "#c678dd",
    st: "#98c379",
    nu: "#d19a66",
    fn: "#61afef",
  },
  light: {
    bg: "#f5f6f8",
    text: "#383a42",
    textBright: "#1a1c23",
    textMuted: "#696d80",
    textDim: "#8a8e9c",
    textFaint: "#b0b4c0",
    panelBg: "#ffffff",
    panelHeader: "#f0f1f4",
    border: "#d5d8e0",
    borderLight: "#e4e6eb",
    borderSubtle: "#ecedf0",
    activeBg: "#e8eaf0",
    activeBorder: "#b0b4c8",
    hoverBg: "#ecedf2",
    modActiveBg: "#e6ecf8",
    notesBg: "#f0f4fc",
    accent: "#4078c0",
    accentAlt: "#a626a4",
    scrollThumb: "#c8ccd5",
    scrollThumbHover: "#a0a4b0",
    lineNum: "#b0b4c0",
    cm: "#8a8e9c",
    kw: "#a626a4",
    st: "#50a14f",
    nu: "#c18401",
    fn: "#4078c0",
  },
};

// ─── Main App ────────────────────────────────────────────────────────

export default function SWMM5CodeViewer() {
  const moduleKeys = Object.keys(modules);
  const [selectedModule, setSelectedModule] = useState(moduleKeys[0]);
  const [leftLang, setLeftLang] = useState("c");
  const [rightLang, setRightLang] = useState("rust");
  const [showNotes, setShowNotes] = useState(true);
  const [showModuleInfo, setShowModuleInfo] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [isMobile, setIsMobile] = useState(false);

  const leftScrollRef = useRef(null);
  const rightScrollRef = useRef(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleScrollSync = (source) => () => {
    if (isSyncing.current) return;
    const srcEl = source === "left" ? leftScrollRef.current : rightScrollRef.current;
    const tgtEl = source === "left" ? rightScrollRef.current : leftScrollRef.current;
    if (!srcEl || !tgtEl) return;
    const srcMax = srcEl.scrollHeight - srcEl.clientHeight;
    const tgtMax = tgtEl.scrollHeight - tgtEl.clientHeight;
    if (srcMax <= 0 || tgtMax <= 0) return;
    isSyncing.current = true;
    const ratio = srcEl.scrollTop / srcMax;
    tgtEl.scrollTop = Math.round(ratio * tgtMax);
    requestAnimationFrame(() => { isSyncing.current = false; });
  };

  const t = themes[theme];
  const mod = modules[selectedModule];
  const leftInfo = languages.find((l) => l.id === leftLang);
  const rightInfo = languages.find((l) => l.id === rightLang);
  const diff = difficultyConfig[mod.difficulty] || difficultyConfig.intermediate;

  const translationNotes = {
    rust: "Rust enforces memory safety at compile time. Notice how the C pointer-based struct access (&uh[i]) becomes Rust references with lifetime guarantees. The iterator chain in get_rdii_flow replaces the nested for loops with a more functional approach. No null pointers possible — the type system prevents it.",
    python: "Python uses @dataclass for clean struct-like definitions and @property for computed fields. The explicit type hints mirror C's type declarations but are optional. Notice how Python's readability makes the algorithm's intent clearer, though at the cost of runtime performance vs C.",
    fortran: "Full circle — SWMM3 was originally Fortran! Note the 1-based array indexing (rainfall(j+1) vs rainfall[j]), the explicit intent(in) declarations, and the real(8) double precision type. The module/contains pattern replaces C's header files. The % operator accesses struct members instead of -> or dot notation.",
    julia: "Julia's multiple dispatch replaces OOP methods — get_ordinate(uh, t) instead of uh.getOrdinate(t). The ≤ operator is native Unicode syntax. Julia uses 1-based indexing like Fortran. Short-circuit returns (expr && return val) are idiomatic. The struct is immutable by default.",
    javascript: "JavaScript uses class syntax with getters (get tBase) for computed properties. Math.pow and Math.sqrt replace C's pow() and sqrt(). ES module exports make this ready for browser-based SWMM implementations and WebAssembly integration.",
    go: "Go uses exported names (capitalized) instead of public/private keywords. Methods are defined outside the struct with receiver syntax. Error handling would typically use multiple returns. The math package provides numerical functions. Simple, readable, and fast.",
    c: "The original EPA SWMM5 C implementation. Pointer-based struct access, manual memory management, and direct mathematical operations. This code has been running in production since 2004, computing RDII for thousands of sewer systems worldwide.",
  };

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: t.bg,
      color: t.text,
      fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
      transition: "background 0.3s, color 0.3s",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .cm { color: ${t.cm} !important; font-style: italic; }
        .kw { color: ${t.kw} !important; }
        .st { color: ${t.st} !important; }
        .nu { color: ${t.nu} !important; }
        .fn { color: ${t.fn} !important; }
        .lang-tab { 
          padding: 7px 14px; border-radius: 6px; border: 1px solid transparent;
          background: transparent; color: ${t.textMuted}; cursor: pointer;
          font-size: 13px; font-weight: 500; transition: all 0.2s;
          font-family: 'JetBrains Mono', monospace;
          display: flex; align-items: center; gap: 6px;
        }
        .lang-tab:hover { color: ${t.text}; background: ${t.hoverBg}; }
        .lang-tab.active { 
          background: ${t.activeBg}; color: ${t.textBright}; 
          border-color: ${t.activeBorder}; 
        }
        .mod-btn {
          padding: 10px 16px; border-radius: 8px; border: 1px solid ${t.border};
          background: transparent; color: ${t.textMuted}; cursor: pointer;
          font-size: 13px; text-align: left; transition: all 0.2s;
          font-family: 'JetBrains Mono', monospace; width: 100%;
        }
        .mod-btn:hover { background: ${t.hoverBg}; color: ${t.text}; }
        .mod-btn.active {
          background: ${t.modActiveBg}; color: ${t.accent};
          border-color: ${t.accent}44;
        }
        .notes-box {
          margin: 0 20px 20px;
          padding: 16px 20px;
          background: ${t.notesBg};
          border: 1px solid ${t.border};
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.7;
          color: ${t.textMuted};
          border-left: 3px solid ${t.accent}44;
        }
        .theme-toggle {
          width: 36px; height: 36px; border-radius: 8px;
          border: 1px solid ${t.border}; background: ${t.panelHeader};
          color: ${t.textMuted}; cursor: pointer; font-size: 18;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .theme-toggle:hover { background: ${t.hoverBg}; color: ${t.text}; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${t.scrollThumbHover}; }
        @media (max-width: 899px) {
          .lang-tab { padding: 5px 8px !important; font-size: 11px !important; }
          .mod-btn { padding: 4px 8px !important; font-size: 11px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "20px 24px 16px",
        borderBottom: `1px solid ${t.borderLight}`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700, color: "#fff",
            fontFamily: "'JetBrains Mono', monospace",
          }}>S5</div>
          <div>
            <div style={{
              fontSize: 17, fontWeight: 700, color: t.textBright,
              letterSpacing: -0.3,
            }}>
              SWMM5 Rosetta Stone
            </div>
            <div style={{ fontSize: 11.5, color: t.textDim, marginTop: 1 }}>
              EPA SWMM5 Engine Code — Multi-Language Translation Viewer
            </div>
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: t.textDim, marginRight: 4 }}>MODULE:</span>
          {moduleKeys.map((key) => (
            <button
              key={key}
              className={`mod-btn ${selectedModule === key ? "active" : ""}`}
              onClick={() => setSelectedModule(key)}
              style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
            >
              {key.split("—")[0].trim()}
            </button>
          ))}
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "\u2600" : "\u263E"}
          </button>
        </div>
      </div>

      {/* Module Description */}
      <div style={{
        padding: "12px 24px",
        fontSize: 13,
        color: t.textMuted,
        borderBottom: `1px solid ${t.borderSubtle}`,
        lineHeight: 1.6,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{
                padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                background: t.accent + "18", color: t.accent, border: `1px solid ${t.accent}33`,
              }}>{mod.category}</span>
              <span style={{
                padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                background: diff.color + "18", color: diff.color, border: `1px solid ${diff.color}33`,
              }}>{diff.icon} {diff.label}</span>
            </div>
            {mod.description}
          </div>
          <button
            onClick={() => setShowModuleInfo(!showModuleInfo)}
            style={{
              padding: "4px 10px", borderRadius: 6, border: `1px solid ${t.border}`,
              background: showModuleInfo ? t.modActiveBg : "transparent",
              color: showModuleInfo ? t.accent : t.textDim,
              cursor: "pointer", fontSize: 11, whiteSpace: "nowrap",
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {showModuleInfo ? "▾" : "▸"} Details
          </button>
        </div>
      </div>

      {/* Module Info Panel */}
      {showModuleInfo && <ModuleInfoPanel mod={mod} t={t} show={showModuleInfo} />}

      {/* Language Selectors */}
      <div style={{
        padding: "12px 24px",
        display: "flex",
        gap: 24,
        borderBottom: `1px solid ${t.borderLight}`,
        flexWrap: "wrap",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, color: t.textDim, textTransform: "uppercase",
            letterSpacing: 1.5, fontWeight: 600,
          }}>LEFT</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {languages.map((lang) => (
              <button
                key={lang.id}
                className={`lang-tab ${leftLang === lang.id ? "active" : ""}`}
                onClick={() => setLeftLang(lang.id)}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: lang.color,
                }} />
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: t.border }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, color: t.textDim, textTransform: "uppercase",
            letterSpacing: 1.5, fontWeight: 600,
          }}>RIGHT</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {languages.map((lang) => (
              <button
                key={lang.id}
                className={`lang-tab ${rightLang === lang.id ? "active" : ""}`}
                onClick={() => setRightLang(lang.id)}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: lang.color,
                }} />
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <button
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            borderRadius: 6,
            border: `1px solid ${showNotes ? t.accent + "44" : t.border}`,
            background: showNotes ? t.modActiveBg : "transparent",
            color: showNotes ? t.accent : t.textMuted,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
          onClick={() => setShowNotes(!showNotes)}
        >
          {showNotes ? "▾" : "▸"} Translation Notes
        </button>
      </div>

      {/* Translation Notes */}
      {showNotes && rightLang !== leftLang && (
        <div className="notes-box" style={{ margin: "16px 20px 0" }}>
          <strong style={{ color: t.accentAlt }}>
            {leftInfo.label} → {rightInfo.label}:
          </strong>{" "}
          {translationNotes[rightLang]}
        </div>
      )}

      {/* Code Panels */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: 12,
        padding: "16px 20px 24px",
        height: isMobile ? "auto" : "calc(100vh - 280px)",
        minHeight: isMobile ? 0 : 400,
      }}>
        <div style={{ flex: 1, minHeight: isMobile ? 350 : 0, display: "flex", flexDirection: "column" }}>
          <CodePanel
            code={mod[leftLang]}
            langId={leftLang}
            label={`${leftInfo.label} ${leftInfo.ext}`}
            color={leftInfo.color}
            t={t}
            scrollRef={leftScrollRef}
            onScroll={handleScrollSync("left")}
          />
        </div>
        {!isMobile && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            flexShrink: 0,
            padding: "0 4px",
          }}>
            <div style={{ color: t.textFaint, fontSize: 18 }}>⇄</div>
          </div>
        )}
        <div style={{ flex: 1, minHeight: isMobile ? 350 : 0, display: "flex", flexDirection: "column" }}>
          <CodePanel
            code={mod[rightLang]}
            langId={rightLang}
            label={`${rightInfo.label} ${rightInfo.ext}`}
            color={rightInfo.color}
            t={t}
            scrollRef={rightScrollRef}
            onScroll={handleScrollSync("right")}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "12px 24px",
        borderTop: `1px solid ${t.borderSubtle}`,
        fontSize: 11,
        color: t.textFaint,
        textAlign: "center",
      }}>
        SWMM5 Rosetta Stone • EPA Storm Water Management Model • Engine Code Translations •{" "}
        <span style={{ color: t.textDim }}>swmm5.org</span>
      </div>
    </div>
  );
}
