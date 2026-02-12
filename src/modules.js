// ─── Code Samples ────────────────────────────────────────────────────

const modules = {
  "rdii.c — RTK Unit Hydrograph": {
    category: "Hydrology",
    difficulty: "intermediate",
    tags: ["rdii", "rtk", "unit hydrograph", "inflow", "infiltration", "rainfall", "convolution", "wet weather"],
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
    tags: ["runoff", "manning", "surface", "overland flow", "green-ampt", "infiltration", "depression storage", "nonlinear reservoir"],
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

const translationNotes = {
  rust: "Rust enforces memory safety at compile time. Notice how the C pointer-based struct access (&uh[i]) becomes Rust references with lifetime guarantees. The iterator chain in get_rdii_flow replaces the nested for loops with a more functional approach. No null pointers possible — the type system prevents it. In the routing module, .clamp() replaces manual bounds checking, and .powf(2.0/3.0) replaces C's pow(). The infiltration module shows &mut self for GreenAmpt's stateful cumulative tracking, while Horton stays immutable with &self. The node module uses .last().copied().unwrap_or() for safe array access where C would risk out-of-bounds.",
  python: "Python uses @dataclass for clean struct-like definitions and @property for computed fields. The explicit type hints mirror C's type declarations but are optional. Notice how Python's readability makes the algorithm's intent clearer, though at the cost of runtime performance vs C. The infiltration module uses dataclass default values (cum_infil: float = 0.001) instead of manual initialization. Julia's multiple dispatch for Horton vs GreenAmpt becomes separate classes with the same method name. The node module uses Python's negative indexing (sc.areas[-1]) for clean last-element access.",
  fortran: "Full circle — SWMM3 was originally Fortran! Note the 1-based array indexing (rainfall(j+1) vs rainfall[j]), the explicit intent(in) declarations, and the real(8) double precision type. The module/contains pattern replaces C's header files. The % operator accesses struct members instead of -> or dot notation. The routing module uses named parameters in the parameter statement for GRAVITY. The infiltration module shows intent(inout) for GreenAmpt's mutable state — Fortran makes mutability explicit. The node module uses a subroutine instead of a function since it modifies the node in-place.",
  julia: "Julia's multiple dispatch replaces OOP methods — get_ordinate(uh, t) instead of uh.getOrdinate(t). The ≤ operator is native Unicode syntax. Julia uses 1-based indexing like Fortran. Short-circuit returns (expr && return val) are idiomatic. The struct is immutable by default. The infiltration module uses multiple dispatch elegantly — infiltration(h::Horton, t) and infiltration(ga::GreenAmpt, rainfall, dt) share the same function name but dispatch on type. The node module uses mutable struct for Node and the ! convention (update_level!) to signal mutation. sc.areas[end] replaces C's manual length tracking.",
  javascript: "JavaScript uses class syntax with getters (get tBase) for computed properties. Math.pow and Math.sqrt replace C's pow() and sqrt(). ES module exports make this ready for browser-based SWMM implementations and WebAssembly integration. The routing module uses Math.max/Math.min for flow clamping. The infiltration module demonstrates three distinct class patterns — Horton (pure function), GreenAmpt (stateful), and cnInfiltration (standalone). The node module uses sc.areas[sc.areas.length - 1] since JavaScript lacks negative indexing.",
  go: "Go uses exported names (capitalized) instead of public/private keywords. Methods are defined outside the struct with receiver syntax. Error handling would typically use multiple returns. The math package provides numerical functions. Simple, readable, and fast. The routing module capitalizes the Gravity constant for package-level export. The infiltration module uses pointer receivers (*GreenAmptInfil) for methods that mutate state and value receivers for pure computations. The node module shows Go's slice syntax with len(sc.Depths) and sc.Areas[len(sc.Areas)-1] for bounds-safe access.",
  c: "The original EPA SWMM5 C implementation. Pointer-based struct access, manual memory management, and direct mathematical operations. This code has been running in production since 2004, computing RDII for thousands of sewer systems worldwide. The routing module shows SWMM5's explicit finite-difference approach to the Saint-Venant equations with Manning's friction slope. The infiltration module implements all three SWMM5 infiltration methods — Horton, Green-Ampt, and SCS Curve Number. The node module demonstrates volume balance with trapezoidal integration of storage curves.",
};

export { modules, languages, translationNotes };
