import { useState, useMemo } from "react";
import { modules } from "../modules.js";

const quizQuestions = [
  {
    module: "routing.c",
    question: "In Manning's equation used for friction slope calculation, what does the roughness coefficient 'n' represent?",
    options: [
      "The pipe diameter in feet",
      "A dimensionless measure of surface roughness resistance to flow",
      "The gravitational acceleration constant",
      "The hydraulic radius of the cross-section"
    ],
    correct: 1,
    explanation: "Manning's n is a dimensionless coefficient that quantifies the resistance to flow caused by the roughness of the channel or pipe surface. Common values range from 0.010 (smooth PVC) to 0.025 (rough concrete).",
    codeC: `sf = c->roughness * Q / (area * pow(hRadius, 2.0/3.0));\nsf = sf * sf;`,
    codeAlt: `let sf_base = self.roughness * q\n  / (area * h_radius.powf(2.0 / 3.0));`,
    codeAltLang: "Rust"
  },
  {
    module: "routing.c",
    question: "In the dynamic wave routing solver, what happens when Q (flow) is negative?",
    options: [
      "The simulation stops with an error",
      "Flow is set to zero",
      "The friction slope sign is reversed to maintain correct directionality",
      "The conduit is removed from the network"
    ],
    correct: 2,
    explanation: "When Q < 0, it indicates reverse flow. The friction slope is negated (sf = -sf) so it always opposes the flow direction, which is physically correct behavior for backwater effects.",
    codeC: `if (Q < 0.0) sf = -sf;`,
    codeAlt: `if q < 0.0 { -sf } else { sf }`,
    codeAltLang: "Rust"
  },
  {
    module: "routing.c",
    question: "What is the purpose of the flow limiter (qMax = area * 50.0) in the dynamic wave solver?",
    options: [
      "To convert between metric and imperial units",
      "To prevent unrealistically high velocities (>50 ft/s) that could destabilize the numerical scheme",
      "To account for pipe friction losses",
      "To model pump capacity limits"
    ],
    correct: 1,
    explanation: "The limiter caps velocity at 50 ft/s (Qmax = A × 50). This prevents numerical instabilities from producing unrealistically large flows that could cause the explicit solver to diverge.",
    codeC: `double qMax = area * 50.0;\nreturn std::clamp(Qnew, -qMax, qMax);`,
    codeAlt: `q_max = area * 50.0\nreturn max(-q_max, min(q_new, q_max))`,
    codeAltLang: "Python"
  },
  {
    module: "infil.c",
    question: "In the Horton infiltration model, what does the parameter f0 represent?",
    options: [
      "The equilibrium (minimum) infiltration rate",
      "The initial (maximum) infiltration rate at the start of rainfall",
      "The decay constant for infiltration reduction",
      "The total cumulative infiltration volume"
    ],
    correct: 1,
    explanation: "f0 is the maximum infiltration rate at the beginning of a storm event, before the soil becomes saturated. Over time, the infiltration rate decays exponentially from f0 toward the minimum rate fInfin.",
    codeC: `f = fInfin + (f0 - fInfin) * exp(-k * t);`,
    codeAlt: `f = f_infin + (f0 - f_infin) * e^(-k * t)`,
    codeAltLang: "Math"
  },
  {
    module: "infil.c",
    question: "What are the three key parameters of the Horton infiltration equation?",
    options: [
      "Area, perimeter, and hydraulic radius",
      "f0 (max rate), fInfin (min rate), and k (decay constant)",
      "Slope, roughness, and velocity",
      "Depth, width, and length"
    ],
    correct: 1,
    explanation: "Horton's equation f(t) = fInfin + (f0 - fInfin)·e^(-kt) uses three parameters: f0 is the initial max infiltration rate, fInfin is the asymptotic minimum rate, and k is the exponential decay constant.",
    codeC: `typedef struct {\n    double f0;      // max infiltration rate\n    double fInfin;  // min infiltration rate\n    double k;       // decay constant\n} THorton;`,
    codeAlt: `pub struct Horton {\n    pub f0: f64,\n    pub f_infin: f64,\n    pub k: f64,\n}`,
    codeAltLang: "Rust"
  },
  {
    module: "infil.c",
    question: "In the Green-Ampt infiltration model, what does the parameter ψ (psi) represent?",
    options: [
      "The soil porosity",
      "The capillary suction head at the wetting front",
      "The surface runoff coefficient",
      "The pipe wall roughness"
    ],
    correct: 1,
    explanation: "ψ (psi) represents the capillary suction head at the wetting front in the Green-Ampt model. It drives water into the unsaturated soil zone ahead of the infiltration front.",
    codeC: `F = Ks * t + psi * dTheta * log(1 + F / (psi * dTheta));`,
    codeAlt: `f = ks * t + psi * d_theta * Math.log(1 + f / (psi * d_theta))`,
    codeAltLang: "JavaScript"
  },
  {
    module: "infil.c",
    question: "What is saturated hydraulic conductivity (Ks) in the Green-Ampt model?",
    options: [
      "The maximum flow velocity in a pipe",
      "The rate at which water moves through fully saturated soil",
      "The evaporation rate from the soil surface",
      "The slope of the ground surface"
    ],
    correct: 1,
    explanation: "Saturated hydraulic conductivity (Ks) is the rate at which water flows through soil when all pore spaces are filled with water. It represents the long-term steady-state infiltration rate for a given soil type.",
    codeC: `double infiltRate = Ks * (1.0 + psi * dTheta / F);`,
    codeAlt: `infilt_rate = ks * (1.0 + psi * d_theta / cumul_f)`,
    codeAltLang: "Python"
  },
  {
    module: "dynwave.c",
    question: "What is the Courant condition in the context of dynamic wave routing?",
    options: [
      "A requirement that pipe roughness must be below a threshold",
      "A stability criterion limiting the time step based on wave celerity and grid spacing",
      "A formula for computing water surface elevation",
      "A method for interpolating between junction nodes"
    ],
    correct: 1,
    explanation: "The Courant condition (CFL) requires Δt ≤ Δx / (V + c) where V is velocity and c is wave celerity. This ensures numerical stability by preventing information from traveling more than one grid cell per time step.",
    codeC: `// CFL: dt <= dx / (V + c)\ndouble cfl = dt * (velocity + celerity) / length;`,
    codeAlt: `cfl = dt * (velocity + celerity) / length\nif cfl > 1.0: dt = length / (velocity + celerity)`,
    codeAltLang: "Python"
  },
  {
    module: "dynwave.c",
    question: "What does the CFL (Courant-Friedrichs-Lewy) number indicate?",
    options: [
      "The ratio of pipe diameter to length",
      "The ratio of numerical wave speed to physical wave speed — must be ≤ 1 for stability",
      "The percentage of flow that is lost to infiltration",
      "The Manning's roughness value for a specific material"
    ],
    correct: 1,
    explanation: "The CFL number = Δt·(V+c)/Δx measures whether the numerical scheme can keep up with physical wave propagation. When CFL > 1, the explicit solver becomes unstable and produces oscillating or diverging results.",
    codeC: `double cfl = dt * (fabs(v) + sqrt(GRAVITY * depth)) / dx;\nif (cfl > 1.0) /* reduce time step */`,
    codeAlt: `let cfl = dt * (v.abs() + (GRAVITY * depth).sqrt()) / dx;`,
    codeAltLang: "Rust"
  },
  {
    module: "massbal.c",
    question: "What does the continuity error measure in a SWMM5 simulation?",
    options: [
      "The difference between pipe inlet and outlet velocities",
      "The percentage imbalance between total inflows, outflows, and storage change",
      "The error in Manning's equation calculation",
      "The difference between simulated and measured rainfall"
    ],
    correct: 1,
    explanation: "Continuity error = (Total Inflow - Total Outflow - Storage Change) / Total Inflow × 100%. A low continuity error (<1%) indicates the numerical solution is conserving mass properly.",
    codeC: `error = (totalInflow - totalOutflow - storageChange)\n        / totalInflow * 100.0;`,
    codeAlt: `error = (total_inflow - total_outflow - storage_change)\n        / total_inflow * 100.0`,
    codeAltLang: "Python"
  },
  {
    module: "massbal.c",
    question: "What is an acceptable range for flow continuity error in a SWMM5 simulation?",
    options: [
      "Less than 50%",
      "Less than 10%",
      "Less than 1% (ideally < 0.1%)",
      "Exactly 0% always"
    ],
    correct: 2,
    explanation: "Continuity errors below 1% are generally acceptable. Errors below 0.1% indicate excellent mass conservation. Large errors (>5%) suggest numerical instability, possibly from time steps that are too large.",
    codeC: `// Good: error < 0.1%\n// Acceptable: error < 1.0%\n// Warning: error > 5.0%`,
    codeAlt: `if abs(error) > 5.0:\n    print("WARNING: High continuity error")`,
    codeAltLang: "Python"
  },
  {
    module: "xsect.c",
    question: "How is the hydraulic radius computed for a cross-section?",
    options: [
      "Area divided by top width",
      "Area divided by wetted perimeter",
      "Diameter divided by 4",
      "Depth multiplied by width"
    ],
    correct: 1,
    explanation: "Hydraulic radius R = A/P where A is the cross-sectional flow area and P is the wetted perimeter. For a full circular pipe, R = D/4. The hydraulic radius is a key parameter in Manning's equation.",
    codeC: `double hRadius = area / wettedPerimeter;`,
    codeAlt: `h_radius = area / wetted_perimeter`,
    codeAltLang: "Python"
  },
  {
    module: "xsect.c",
    question: "For a circular pipe flowing partially full, which geometric parameter varies nonlinearly with depth?",
    options: [
      "The pipe material roughness",
      "The gravitational constant",
      "The flow area and wetted perimeter",
      "The pipe slope"
    ],
    correct: 2,
    explanation: "For a circular cross-section, both flow area and wetted perimeter are nonlinear functions of depth involving trigonometric calculations (arc angles). This is why SWMM5 uses lookup tables for partial-flow geometry.",
    codeC: `// Circular pipe geometry\ndouble theta = 2.0 * acos(1.0 - 2.0 * y/D);\ndouble area = D*D/8.0 * (theta - sin(theta));`,
    codeAlt: `theta = 2.0 * math.acos(1.0 - 2.0 * y / d)\narea = d**2 / 8.0 * (theta - math.sin(theta))`,
    codeAltLang: "Python"
  },
  {
    module: "lid.c",
    question: "Which of the following is NOT a type of LID (Low Impact Development) practice modeled in SWMM5?",
    options: [
      "Bio-retention cells",
      "Permeable pavement",
      "Nuclear cooling towers",
      "Green roofs"
    ],
    correct: 2,
    explanation: "SWMM5 models several LID types: bio-retention cells, rain gardens, permeable pavement, infiltration trenches, rain barrels, vegetative swales, and green roofs. Nuclear cooling towers are not stormwater management practices.",
    codeC: `enum LidTypes {\n    BIO_CELL, RAIN_GARDEN, GREEN_ROOF,\n    INFIL_TRENCH, PERM_PAVEMENT, RAIN_BARREL,\n    VEG_SWALE\n};`,
    codeAlt: `lid_types = ["bio_cell", "rain_garden",\n  "green_roof", "infil_trench",\n  "perm_pavement", "rain_barrel"]`,
    codeAltLang: "Python"
  },
  {
    module: "lid.c",
    question: "What is the primary hydrologic benefit of LID practices in urban stormwater management?",
    options: [
      "They increase peak flow rates for faster drainage",
      "They reduce runoff volume and peak flows through infiltration, storage, and evapotranspiration",
      "They increase impervious surface area",
      "They eliminate the need for storm sewers entirely"
    ],
    correct: 1,
    explanation: "LID practices mimic natural hydrology by promoting infiltration, providing storage, and enabling evapotranspiration. This reduces both the volume and peak rate of stormwater runoff from developed areas.",
    codeC: `// LID performance metrics\nrunoff_reduction = (baseline_runoff - lid_runoff)\n                   / baseline_runoff * 100;`,
    codeAlt: `runoff_reduction = (baseline - lid_runoff) / baseline * 100.0`,
    codeAltLang: "Python"
  },
  {
    module: "qualrout.c",
    question: "What transport method does SWMM5 use for water quality routing through conduits?",
    options: [
      "Finite element method",
      "Complete mixing (CSTR) at each node with advective transport through links",
      "Spectral analysis method",
      "Monte Carlo simulation"
    ],
    correct: 1,
    explanation: "SWMM5 uses a Continuously Stirred Tank Reactor (CSTR) model at nodes, where pollutant concentrations are fully mixed. Transport through conduits uses advection with the computed flow rates.",
    codeC: `// CSTR at node: C_out = (C_in * Q_in * dt + V * C_old)\n//               / (Q_in * dt + V)\nC_new = (massIn + volume * C_old) / (qIn * dt + volume);`,
    codeAlt: `c_new = (mass_in + volume * c_old) / (q_in * dt + volume)`,
    codeAltLang: "Python"
  },
  {
    module: "qualrout.c",
    question: "In SWMM5 water quality modeling, what does first-order decay represent?",
    options: [
      "The rate at which pipes corrode",
      "Pollutant concentration decreasing exponentially over time (C = C0·e^(-k·t))",
      "The speed of water flowing through the system",
      "The rate of rainfall increase during a storm"
    ],
    correct: 1,
    explanation: "First-order decay models pollutant degradation where the rate of decrease is proportional to the current concentration: dC/dt = -k·C. This applies to BOD decay, bacterial die-off, and similar processes.",
    codeC: `// First-order decay\nC_new = C_old * exp(-k_decay * dt);`,
    codeAlt: `c_new = c_old * math.exp(-k_decay * dt)`,
    codeAltLang: "Python"
  },
  {
    module: "pump.c",
    question: "In SWMM5, what does the pump curve equation H = A - B·Q^C describe?",
    options: [
      "The relationship between rainfall intensity and duration",
      "The relationship between pump head (H) and flow rate (Q) for a variable-speed pump",
      "The Manning's equation for open channel flow",
      "The Horton infiltration decay curve"
    ],
    correct: 1,
    explanation: "The pump curve H = A - B·Q^C relates the total dynamic head (H) a pump can deliver to the flow rate (Q). As flow increases, the available head decreases. A, B, C are pump-specific coefficients.",
    codeC: `// Pump curve: H = A - B * Q^C\ndouble head = A - B * pow(Q, C);`,
    codeAlt: `head = a - b * q ** c`,
    codeAltLang: "Python"
  },
  {
    module: "odesolve.c",
    question: "What is the Runge-Kutta method used for in SWMM5?",
    options: [
      "Parsing input files",
      "Numerically integrating ordinary differential equations over a time step",
      "Sorting network nodes by elevation",
      "Generating rainfall time series"
    ],
    correct: 1,
    explanation: "The 4th-order Runge-Kutta (RK4) method numerically integrates ODEs by evaluating the derivative at four points within each time step and combining them for an accurate solution with O(h^4) error.",
    codeC: `// RK4: y(t+h) = y(t) + h/6*(k1+2*k2+2*k3+k4)\nk1 = h * f(t, y);\nk2 = h * f(t+h/2, y+k1/2);\nk3 = h * f(t+h/2, y+k2/2);\nk4 = h * f(t+h, y+k3);`,
    codeAlt: `k1 = h * f(t, y)\nk2 = h * f(t + h/2, y + k1/2)\nk3 = h * f(t + h/2, y + k2/2)\nk4 = h * f(t + h, y + k3)`,
    codeAltLang: "Python"
  },
  {
    module: "findroot.c",
    question: "What is Ridder's method used for in SWMM5?",
    options: [
      "Finding the shortest path through the drainage network",
      "Finding roots of nonlinear equations (where f(x) = 0) with guaranteed convergence",
      "Computing rainfall statistics",
      "Optimizing pipe diameters"
    ],
    correct: 1,
    explanation: "Ridder's method is a root-finding algorithm that combines bisection reliability with superlinear convergence. SWMM5 uses it to solve implicit equations in infiltration and normal depth calculations.",
    codeC: `// Ridder's method: find x where f(x) = 0\nxm = 0.5 * (xl + xh);\nfm = f(xm);\ns = sqrt(fm*fm - fl*fh);\nxnew = xm + (xm-xl) * sign(fl-fh) * fm / s;`,
    codeAlt: `xm = 0.5 * (xl + xh)\nfm = f(xm)\ns = math.sqrt(fm*fm - fl*fh)\nxnew = xm + (xm - xl) * sign * fm / s`,
    codeAltLang: "Python"
  },
  {
    module: "subcatch.c",
    question: "In SWMM5's subcatchment model, what is the nonlinear reservoir equation used for?",
    options: [
      "Sizing detention ponds",
      "Computing overland flow from impervious and pervious sub-areas",
      "Calculating pipe capacity",
      "Determining pump schedules"
    ],
    correct: 1,
    explanation: "SWMM5 models each subcatchment sub-area as a nonlinear reservoir where outflow Q = W/n · (d-dp)^(5/3) · S^(1/2). Here d is ponded depth, dp is depression storage, W is width, n is roughness, and S is slope.",
    codeC: `// Nonlinear reservoir outflow\nQ = width / n * pow(depth - dStore, 5.0/3.0)\n    * sqrt(slope);`,
    codeAlt: `q = width / n * (depth - d_store) ** (5.0/3.0)\n    * math.sqrt(slope)`,
    codeAltLang: "Python"
  },
  {
    module: "subcatch.c",
    question: "What is depression storage in the subcatchment model?",
    options: [
      "The volume of water stored in underground pipes",
      "The depth of water retained in surface depressions before runoff begins",
      "The volume of a detention basin",
      "The amount of water lost to evaporation from reservoirs"
    ],
    correct: 1,
    explanation: "Depression storage represents small surface depressions, puddles, and surface wetting that must be filled before overland flow begins. Typical values are 0.05-0.1 inches for impervious areas and 0.1-0.3 inches for pervious areas.",
    codeC: `// No runoff until depression storage is filled\nif (depth <= dStore) return 0.0;`,
    codeAlt: `if depth <= d_store:\n    return 0.0`,
    codeAltLang: "Python"
  },
  {
    module: "rain.c",
    question: "What does SWMM5's RTK unit hydrograph method use to model rainfall-dependent infiltration/inflow (RDII)?",
    options: [
      "A single triangular hydrograph",
      "Three triangular unit hydrographs (R, T, K parameters) representing fast, medium, and slow responses",
      "A simple runoff coefficient",
      "The rational method formula Q = CiA"
    ],
    correct: 1,
    explanation: "SWMM5 uses three triangular unit hydrographs with parameters R (fraction of rainfall volume), T (time to peak), and K (ratio of recession to rise time) to capture fast surface response, medium interflow, and slow groundwater inflow.",
    codeC: `// RTK unit hydrograph\nfor (i = 0; i < 3; i++) {\n    volume[i] = R[i] * rainfall;\n    peak[i] = 2*volume[i] / (T[i] * (1+K[i]));\n}`,
    codeAlt: `for i in range(3):\n    volume[i] = r[i] * rainfall\n    peak[i] = 2*volume[i] / (t[i] * (1 + k[i]))`,
    codeAltLang: "Python"
  },
  {
    module: "gwater.c",
    question: "In SWMM5's groundwater module, what drives the lateral groundwater flow to the drainage system?",
    options: [
      "Pump suction pressure",
      "The difference between the groundwater table elevation and the node water surface elevation",
      "Wind speed at the surface",
      "The temperature of the soil"
    ],
    correct: 1,
    explanation: "Lateral groundwater flow is driven by the head difference between the water table and the drainage node. SWMM5 uses a power-law equation: Q = A1·(Hgw - Hcb)^B1 - A2·(Hsw - Hcb)^B2 + A3·Hgw·Hsw.",
    codeC: `// Groundwater lateral flow\nQ_gw = A1 * pow(hGW - hCB, B1)\n     - A2 * pow(hSW - hCB, B2)\n     + A3 * hGW * hSW;`,
    codeAlt: `q_gw = a1 * (h_gw - h_cb)**b1\n     - a2 * (h_sw - h_cb)**b2\n     + a3 * h_gw * h_sw`,
    codeAltLang: "Python"
  },
  {
    module: "controls.c",
    question: "What are SWMM5 control rules used for?",
    options: [
      "Defining the coordinate system of the model",
      "Dynamically adjusting link settings (pumps, orifices, weirs) based on simulation conditions",
      "Setting the output file format",
      "Specifying the map projection"
    ],
    correct: 1,
    explanation: "Control rules use IF-THEN-ELSE logic to change link settings during a simulation. For example: IF Node J1 depth > 5 THEN Pump P1 status = ON. This enables real-time control simulation.",
    codeC: `// Control rule evaluation\nif (node[j].depth > threshold)\n    link[k].setting = targetSetting;`,
    codeAlt: `if node[j].depth > threshold:\n    link[k].setting = target_setting`,
    codeAltLang: "Python"
  },
  {
    module: "link.c",
    question: "In SWMM5, what is the difference between a conduit and an orifice?",
    options: [
      "There is no difference; they are the same element",
      "A conduit routes flow using Saint-Venant equations while an orifice uses the orifice discharge equation Q = C·A·√(2gH)",
      "A conduit is always circular while an orifice is always rectangular",
      "Conduits can only carry water while orifices handle both water and sediment"
    ],
    correct: 1,
    explanation: "Conduits are channels/pipes where flow is routed using the momentum and continuity equations. Orifices are flow control structures using Q = Cd·A·√(2gH), where Cd is the discharge coefficient and H is the head across the orifice.",
    codeC: `// Orifice flow\nQ = Cd * area * sqrt(2.0 * GRAVITY * head);`,
    codeAlt: `q = cd * area * math.sqrt(2.0 * GRAVITY * head)`,
    codeAltLang: "Python"
  },
  {
    module: "node.c",
    question: "What happens at a junction node when the water level exceeds the maximum depth (surcharging)?",
    options: [
      "The node is removed from the simulation",
      "Water is lost from the system",
      "The node pressurizes and head can exceed the ground elevation, causing potential flooding",
      "All connected pipes are shut off"
    ],
    correct: 2,
    explanation: "When water level exceeds the maximum depth at a junction, the node becomes surcharged. If the water surface exceeds the ground elevation, flooding occurs and excess water is either lost or ponded on the surface depending on settings.",
    codeC: `if (node->depth > node->fullDepth) {\n    node->surcharge = true;\n    if (node->depth > node->crownElev)\n        flooding = node->depth - node->crownElev;\n}`,
    codeAlt: `if node.depth > node.full_depth:\n    node.surcharge = True`,
    codeAltLang: "Python"
  },
  {
    module: "climate.c",
    question: "Which evaporation estimation methods does SWMM5 support?",
    options: [
      "Only manual constant values",
      "Constant, monthly averages, time series, temperature-based (Hargreaves), and climate file",
      "Only the Penman-Monteith equation",
      "Only pan evaporation data"
    ],
    correct: 1,
    explanation: "SWMM5 supports multiple evaporation methods: constant rate, monthly average values, user-supplied time series, temperature-dependent methods (Hargreaves), and values read from external climate files.",
    codeC: `enum EvapType {\n    CONSTANT_EVAP, MONTHLY_EVAP,\n    TIMESERIES_EVAP, TEMP_EVAP,\n    FILE_EVAP\n};`,
    codeAlt: `evap_types = ["constant", "monthly",\n  "timeseries", "temperature", "file"]`,
    codeAltLang: "Python"
  },
  {
    module: "routing.c",
    question: "What is the gravitational constant used in SWMM5's US customary units?",
    options: [
      "9.81 m/s²",
      "32.2 ft/s²",
      "386 in/s²",
      "1.0 (dimensionless)"
    ],
    correct: 1,
    explanation: "SWMM5 uses 32.2 ft/s² for gravitational acceleration in US customary units (and 9.81 m/s² in SI units). This constant appears in the momentum equation and flow calculations throughout the engine.",
    codeC: `#define GRAVITY 32.2  // ft/s²`,
    codeAlt: `const GRAVITY: f64 = 32.2; // ft/s²`,
    codeAltLang: "Rust"
  },
  {
    module: "toposort.c",
    question: "Why does SWMM5 topologically sort the drainage network before simulation?",
    options: [
      "To alphabetize node names for the output report",
      "To process nodes in upstream-to-downstream order so inflows are computed before outflows",
      "To minimize memory usage",
      "To generate the graphical network map"
    ],
    correct: 1,
    explanation: "Topological sorting ensures that upstream nodes are processed before downstream nodes in each time step. This guarantees that all inflows to a node have been computed before calculating its outflow.",
    codeC: `// Process nodes in topological order\nfor (i = 0; i < nSorted; i++) {\n    j = sortedNodes[i];\n    node_route(j, dt);\n}`,
    codeAlt: `for j in sorted_nodes:\n    node_route(j, dt)`,
    codeAltLang: "Python"
  }
];

const moduleNames = [...new Set(quizQuestions.map(q => q.module))];

export default function ModuleQuiz({ theme: t }) {
  const [selectedModule, setSelectedModule] = useState("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());

  const filteredQuestions = useMemo(() => {
    if (selectedModule === "all") return quizQuestions;
    return quizQuestions.filter(q => q.module === selectedModule);
  }, [selectedModule]);

  const currentQuestion = filteredQuestions[currentIndex] || null;

  const handleCheckAnswer = () => {
    if (selectedAnswer === null || !currentQuestion) return;
    setShowResult(true);
    const qKey = `${currentQuestion.module}-${currentQuestion.question}`;
    if (!answeredQuestions.has(qKey)) {
      setAnsweredQuestions(prev => new Set(prev).add(qKey));
      setScore(prev => ({
        correct: prev.correct + (selectedAnswer === currentQuestion.correct ? 1 : 0),
        total: prev.total + 1
      }));
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setCurrentIndex(prev => (prev + 1) % filteredQuestions.length);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore({ correct: 0, total: 0 });
    setAnsweredQuestions(new Set());
  };

  const handleModuleChange = (mod) => {
    setSelectedModule(mod);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ color: t.text, margin: 0, fontSize: 22, fontWeight: 700 }}>
        SWMM5 Module Quiz
      </h2>
      <p style={{ color: t.textDim, fontSize: 13, margin: "6px 0 20px" }}>
        Test your knowledge of SWMM5 engine modules — {quizQuestions.length} questions across {moduleNames.length} modules
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ color: t.textDim, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
            MODULE FILTER
          </label>
          <select
            value={selectedModule}
            onChange={e => handleModuleChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: `1px solid ${t.border}`,
              background: t.panelBg || t.codeBg,
              color: t.text,
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              outline: "none",
            }}
          >
            <option value="all">All Modules (Random)</option>
            {moduleNames.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div style={{
          display: "flex", gap: 12, alignItems: "flex-end",
        }}>
          <div style={{
            padding: "8px 16px",
            borderRadius: 6,
            background: t.panelBg || t.codeBg,
            border: `1px solid ${t.border}`,
            textAlign: "center",
          }}>
            <div style={{ color: t.textDim, fontSize: 10, fontWeight: 600 }}>SCORE</div>
            <div style={{ color: t.accent, fontSize: 18, fontWeight: 700 }}>
              {score.correct}/{score.total}
            </div>
          </div>
          <div style={{
            padding: "8px 16px",
            borderRadius: 6,
            background: t.panelBg || t.codeBg,
            border: `1px solid ${t.border}`,
            textAlign: "center",
          }}>
            <div style={{ color: t.textDim, fontSize: 10, fontWeight: 600 }}>ACCURACY</div>
            <div style={{
              color: pct >= 70 ? "#50a14f" : pct >= 40 ? "#c18401" : t.textDim,
              fontSize: 18, fontWeight: 700,
            }}>
              {score.total > 0 ? `${pct}%` : "—"}
            </div>
          </div>
          <button
            onClick={handleReset}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: `1px solid ${t.border}`,
              background: "transparent",
              color: t.textDim,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              height: 52,
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {currentQuestion ? (
        <div style={{
          borderRadius: 8,
          border: `1px solid ${t.border}`,
          background: t.panelBg || t.codeBg,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 20px",
            background: t.panelHeader || t.hoverBg,
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: t.accent,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {currentQuestion.module}
            </span>
            <span style={{ fontSize: 11, color: t.textDim }}>
              Question {currentIndex + 1} of {filteredQuestions.length}
            </span>
          </div>

          <div style={{ padding: 20 }}>
            <p style={{
              color: t.text, fontSize: 15, fontWeight: 600,
              margin: "0 0 20px", lineHeight: 1.5,
            }}>
              {currentQuestion.question}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {currentQuestion.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                let bg = "transparent";
                let borderColor = t.border;
                let textColor = t.text;

                if (showResult) {
                  if (i === currentQuestion.correct) {
                    bg = "#50a14f22";
                    borderColor = "#50a14f";
                    textColor = "#50a14f";
                  } else if (i === selectedAnswer && i !== currentQuestion.correct) {
                    bg = "#e4564922";
                    borderColor = "#e45649";
                    textColor = "#e45649";
                  }
                } else if (i === selectedAnswer) {
                  bg = t.accent + "18";
                  borderColor = t.accent;
                }

                return (
                  <label
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 16px",
                      borderRadius: 6,
                      border: `1px solid ${borderColor}`,
                      background: bg,
                      cursor: showResult ? "default" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="radio"
                      name="quiz-answer"
                      checked={selectedAnswer === i}
                      onChange={() => !showResult && setSelectedAnswer(i)}
                      disabled={showResult}
                      style={{ accentColor: t.accent }}
                    />
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: textColor,
                      minWidth: 20,
                    }}>
                      {letter}.
                    </span>
                    <span style={{ fontSize: 13, color: textColor }}>
                      {opt}
                    </span>
                    {showResult && i === currentQuestion.correct && (
                      <span style={{ marginLeft: "auto", fontSize: 14 }}>✓</span>
                    )}
                    {showResult && i === selectedAnswer && i !== currentQuestion.correct && (
                      <span style={{ marginLeft: "auto", fontSize: 14 }}>✗</span>
                    )}
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {!showResult ? (
                <button
                  onClick={handleCheckAnswer}
                  disabled={selectedAnswer === null}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 6,
                    border: "none",
                    background: selectedAnswer !== null ? t.accent : t.border,
                    color: selectedAnswer !== null ? "#fff" : t.textDim,
                    cursor: selectedAnswer !== null ? "pointer" : "default",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Check Answer
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 6,
                    border: "none",
                    background: t.accent,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Next Question →
                </button>
              )}
            </div>

            {showResult && (
              <div style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 6,
                background: selectedAnswer === currentQuestion.correct ? "#50a14f12" : "#e4564912",
                border: `1px solid ${selectedAnswer === currentQuestion.correct ? "#50a14f33" : "#e4564933"}`,
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, marginBottom: 8,
                  color: selectedAnswer === currentQuestion.correct ? "#50a14f" : "#e45649",
                }}>
                  {selectedAnswer === currentQuestion.correct ? "Correct!" : "Incorrect"}
                </div>
                <p style={{ color: t.text, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
                  {currentQuestion.explanation}
                </p>

                {currentQuestion.codeC && (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 600, color: t.textDim,
                        marginBottom: 4, textTransform: "uppercase",
                      }}>C Reference</div>
                      <pre style={{
                        margin: 0,
                        padding: 12,
                        borderRadius: 6,
                        background: t.bg,
                        border: `1px solid ${t.border}`,
                        color: t.text,
                        fontSize: 11,
                        lineHeight: 1.5,
                        fontFamily: "'JetBrains Mono', monospace",
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                      }}>
                        {currentQuestion.codeC}
                      </pre>
                    </div>
                    {currentQuestion.codeAlt && (
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{
                          fontSize: 10, fontWeight: 600, color: t.textDim,
                          marginBottom: 4, textTransform: "uppercase",
                        }}>{currentQuestion.codeAltLang || "Alt"}</div>
                        <pre style={{
                          margin: 0,
                          padding: 12,
                          borderRadius: 6,
                          background: t.bg,
                          border: `1px solid ${t.border}`,
                          color: t.text,
                          fontSize: 11,
                          lineHeight: 1.5,
                          fontFamily: "'JetBrains Mono', monospace",
                          overflow: "auto",
                          whiteSpace: "pre-wrap",
                        }}>
                          {currentQuestion.codeAlt}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          padding: 40,
          textAlign: "center",
          color: t.textDim,
          borderRadius: 8,
          border: `1px solid ${t.border}`,
          background: t.panelBg || t.codeBg,
        }}>
          No questions available for the selected module.
        </div>
      )}

      {score.total > 0 && (
        <div style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 6,
          background: t.panelBg || t.codeBg,
          border: `1px solid ${t.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: t.border,
              overflow: "hidden",
            }}>
              <div style={{
                width: `${pct}%`,
                height: "100%",
                borderRadius: 3,
                background: pct >= 70 ? "#50a14f" : pct >= 40 ? "#c18401" : "#e45649",
                transition: "width 0.3s",
              }} />
            </div>
            <span style={{ color: t.textDim, fontSize: 11, minWidth: 80, textAlign: "right" }}>
              {score.correct} of {score.total} correct
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
