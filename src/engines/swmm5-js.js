const GRAVITY = 32.174;
const CFS_TO_CMS = 0.02832;
const FT_TO_M = 0.3048;

function parseTime(str) {
  const parts = str.trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  return parts[0] * 3600;
}

function parseDate(str) {
  const parts = str.trim().split('/').map(Number);
  return new Date(parts[2], parts[0] - 1, parts[1]);
}

function fmtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function fmtDateTime(startDate, seconds) {
  const d = new Date(startDate.getTime() + seconds * 1000);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const yr = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${mo}/${da}/${yr} ${h}:${mi}:${s}`;
}

function circularArea(diameter, depth) {
  if (depth <= 0) return 0;
  if (depth >= diameter) return Math.PI * diameter * diameter / 4;
  const r = diameter / 2;
  const theta = 2 * Math.acos((r - depth) / r);
  return r * r * (theta - Math.sin(theta)) / 2;
}

function circularWidth(diameter, depth) {
  if (depth <= 0 || depth >= diameter) return 0;
  const r = diameter / 2;
  return 2 * Math.sqrt(Math.max(0, depth * (diameter - depth)));
}

function circularPerimeter(diameter, depth) {
  if (depth <= 0) return 0;
  if (depth >= diameter) return Math.PI * diameter;
  const r = diameter / 2;
  const theta = 2 * Math.acos((r - depth) / r);
  return r * theta;
}

function circularHydRadius(diameter, depth) {
  const A = circularArea(diameter, depth);
  const P = circularPerimeter(diameter, depth);
  return P > 0 ? A / P : 0;
}

function parseInp(text) {
  const project = {
    title: '',
    options: {
      flowUnits: 'CFS', infiltration: 'HORTON', flowRouting: 'DYNWAVE',
      startDate: new Date(2024, 0, 1), startTime: 0,
      endDate: new Date(2024, 0, 1), endTime: 21600,
      reportStep: 900, wetStep: 300, dryStep: 3600, routingStep: 30,
      minSlope: 0, allowPonding: false, inertialDamping: 'PARTIAL',
      normalFlowLimited: 'BOTH', variableStep: 0.75,
      maxTrials: 8, headTolerance: 0.005, minSurfArea: 12.566,
      lengtheningStep: 0, minimumStep: 0.5, threads: 1,
    },
    raingages: {},
    subcatchments: {},
    subareas: {},
    infiltration: {},
    junctions: {},
    outfalls: {},
    conduits: {},
    xsections: {},
    timeseries: {},
    nodes: {},
    links: {},
  };

  let section = '';
  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';;')) continue;

    if (line.startsWith('[') && line.includes(']')) {
      section = line.replace(/[\[\]]/g, '').trim().toUpperCase();
      continue;
    }

    if (line.startsWith(';')) continue;

    const tokens = line.split(/\s+/);

    switch (section) {
      case 'TITLE':
        project.title += (project.title ? '\n' : '') + line;
        break;

      case 'OPTIONS': {
        const key = tokens[0].toUpperCase();
        const val = tokens.slice(1).join(' ');
        switch (key) {
          case 'FLOW_UNITS': project.options.flowUnits = val; break;
          case 'INFILTRATION': project.options.infiltration = val; break;
          case 'FLOW_ROUTING': project.options.flowRouting = val; break;
          case 'START_DATE': project.options.startDate = parseDate(val); break;
          case 'START_TIME': project.options.startTime = parseTime(val); break;
          case 'END_DATE': project.options.endDate = parseDate(val); break;
          case 'END_TIME': project.options.endTime = parseTime(val); break;
          case 'REPORT_STEP': project.options.reportStep = parseTime(val); break;
          case 'WET_STEP': project.options.wetStep = parseTime(val); break;
          case 'DRY_STEP': project.options.dryStep = parseTime(val); break;
          case 'ROUTING_STEP': project.options.routingStep = parseTime(val); break;
          case 'VARIABLE_STEP': project.options.variableStep = parseFloat(val); break;
          case 'MAX_TRIALS': project.options.maxTrials = parseInt(val); break;
          case 'HEAD_TOLERANCE': project.options.headTolerance = parseFloat(val); break;
          case 'MIN_SURFAREA': project.options.minSurfArea = parseFloat(val); break;
          case 'INERTIAL_DAMPING': project.options.inertialDamping = val; break;
          case 'NORMAL_FLOW_LIMITED': project.options.normalFlowLimited = val; break;
          case 'LENGTHENING_STEP': project.options.lengtheningStep = parseFloat(val); break;
          case 'MINIMUM_STEP': project.options.minimumStep = parseFloat(val); break;
          case 'THREADS': project.options.threads = parseInt(val); break;
        }
        break;
      }

      case 'RAINGAGES':
        if (tokens.length >= 6) {
          const srcType = tokens[4].toUpperCase();
          project.raingages[tokens[0]] = {
            id: tokens[0], format: tokens[1],
            interval: parseTime(tokens[2]), scf: parseFloat(tokens[3]),
            sourceType: srcType, sourceName: tokens[5],
          };
        }
        break;

      case 'SUBCATCHMENTS':
        if (tokens.length >= 7) {
          project.subcatchments[tokens[0]] = {
            id: tokens[0], rainGage: tokens[1], outlet: tokens[2],
            area: parseFloat(tokens[3]), pctImperv: parseFloat(tokens[4]),
            width: parseFloat(tokens[5]), slope: parseFloat(tokens[6]),
            curbLen: tokens[7] ? parseFloat(tokens[7]) : 0,
            runoff: 0, rainfall: 0, losses: 0,
            totalPrecip: 0, totalRunoff: 0, totalInfil: 0,
            peakRunoff: 0,
          };
        }
        break;

      case 'SUBAREAS':
        if (tokens.length >= 6) {
          project.subareas[tokens[0]] = {
            nImperv: parseFloat(tokens[1]), nPerv: parseFloat(tokens[2]),
            sImperv: parseFloat(tokens[3]), sPerv: parseFloat(tokens[4]),
            pctZero: parseFloat(tokens[5]),
            routeTo: tokens[6] || 'OUTLET',
          };
        }
        break;

      case 'INFILTRATION':
        if (tokens.length >= 4) {
          project.infiltration[tokens[0]] = {
            maxRate: parseFloat(tokens[1]), minRate: parseFloat(tokens[2]),
            decay: parseFloat(tokens[3]),
            dryTime: tokens[4] ? parseFloat(tokens[4]) : 7,
            maxInfil: tokens[5] ? parseFloat(tokens[5]) : 0,
            currentRate: parseFloat(tokens[1]),
            cumulInfil: 0,
          };
        }
        break;

      case 'JUNCTIONS':
        if (tokens.length >= 2) {
          const n = {
            id: tokens[0], type: 'junction',
            invertElev: parseFloat(tokens[1]),
            maxDepth: tokens[2] ? parseFloat(tokens[2]) : 0,
            initDepth: tokens[3] ? parseFloat(tokens[3]) : 0,
            surDepth: tokens[4] ? parseFloat(tokens[4]) : 0,
            aPonded: tokens[5] ? parseFloat(tokens[5]) : 0,
            depth: 0, head: 0, volume: 0,
            inflow: 0, outflow: 0, overflow: 0, lateralInflow: 0,
            peakDepth: 0, peakHead: 0, peakHGL: 0,
            timePeakDepth: 0,
            totalInflow: 0, totalOverflow: 0,
            peakInflow: 0,
            timeFlooded: 0,
          };
          n.depth = n.initDepth;
          n.head = n.invertElev + n.depth;
          project.junctions[tokens[0]] = n;
          project.nodes[tokens[0]] = n;
        }
        break;

      case 'OUTFALLS':
        if (tokens.length >= 3) {
          const n = {
            id: tokens[0], type: 'outfall',
            invertElev: parseFloat(tokens[1]),
            outfallType: tokens[2] || 'FREE',
            maxDepth: 0, depth: 0, head: 0, volume: 0,
            inflow: 0, outflow: 0, overflow: 0, lateralInflow: 0,
            peakDepth: 0, peakHead: 0, peakHGL: 0,
            timePeakDepth: 0,
            totalInflow: 0, totalOverflow: 0,
            peakInflow: 0, timeFlooded: 0,
          };
          n.head = n.invertElev;
          project.outfalls[tokens[0]] = n;
          project.nodes[tokens[0]] = n;
        }
        break;

      case 'CONDUITS':
        if (tokens.length >= 5) {
          project.conduits[tokens[0]] = {
            id: tokens[0],
            fromNode: tokens[1], toNode: tokens[2],
            length: parseFloat(tokens[3]),
            roughness: parseFloat(tokens[4]),
            inOffset: tokens[5] ? parseFloat(tokens[5]) : 0,
            outOffset: tokens[6] ? parseFloat(tokens[6]) : 0,
            initFlow: tokens[7] ? parseFloat(tokens[7]) : 0,
            maxFlow: tokens[8] ? parseFloat(tokens[8]) : 0,
            flow: 0, depth: 0, velocity: 0, area: 0,
            peakFlow: 0, peakVelocity: 0, peakDepth: 0,
            timePeakFlow: 0,
            totalFlow: 0,
            timeMaxFlow: 0,
            capacityLimited: 0,
          };
          project.links[tokens[0]] = project.conduits[tokens[0]];
        }
        break;

      case 'XSECTIONS':
        if (tokens.length >= 3) {
          project.xsections[tokens[0]] = {
            shape: tokens[1].toUpperCase(),
            geom1: parseFloat(tokens[2]),
            geom2: tokens[3] ? parseFloat(tokens[3]) : 0,
            geom3: tokens[4] ? parseFloat(tokens[4]) : 0,
            geom4: tokens[5] ? parseFloat(tokens[5]) : 0,
            barrels: tokens[6] ? parseInt(tokens[6]) : 1,
          };
          if (project.conduits[tokens[0]]) {
            project.conduits[tokens[0]].xsect = project.xsections[tokens[0]];
          }
        }
        break;

      case 'TIMESERIES': {
        if (tokens.length >= 2) {
          const name = tokens[0];
          if (!project.timeseries[name]) project.timeseries[name] = [];
          let timeStr, value;
          if (tokens.length >= 4 && tokens[1].includes('/')) {
            timeStr = tokens[2]; value = parseFloat(tokens[3]);
          } else {
            timeStr = tokens[1]; value = parseFloat(tokens[2]);
          }
          project.timeseries[name].push({
            time: parseTime(timeStr), value,
          });
        }
        break;
      }
    }
  }

  for (const id of Object.keys(project.conduits)) {
    const c = project.conduits[id];
    c.flow = c.initFlow;
    if (c.xsect && c.xsect.shape === 'CIRCULAR') {
      c.fullArea = Math.PI * c.xsect.geom1 * c.xsect.geom1 / 4;
      c.fullPerimeter = Math.PI * c.xsect.geom1;
      c.fullHydRadius = c.xsect.geom1 / 4;
      c.fullFlow = (1.49 / c.roughness) * c.fullArea *
        Math.pow(c.fullHydRadius, 2/3) * Math.pow(0.001, 0.5);
    }
  }

  const totalSeconds =
    (project.options.endDate.getTime() - project.options.startDate.getTime()) / 1000 +
    project.options.endTime - project.options.startTime;
  project.options.totalDuration = totalSeconds;

  return project;
}

function getTimeSeries(ts, time) {
  if (!ts || ts.length === 0) return 0;
  if (time <= ts[0].time) return ts[0].value;
  if (time >= ts[ts.length - 1].time) return ts[ts.length - 1].value;
  for (let i = 0; i < ts.length - 1; i++) {
    if (time >= ts[i].time && time <= ts[i + 1].time) {
      const frac = (time - ts[i].time) / (ts[i + 1].time - ts[i].time);
      return ts[i].value + frac * (ts[i + 1].value - ts[i].value);
    }
  }
  return 0;
}

function hortonInfil(infil, rainfall, dt) {
  if (!infil) return 0;
  const rate = infil.minRate + (infil.currentRate - infil.minRate) *
    Math.exp(-infil.decay * dt / 3600);
  const avgRate = (infil.currentRate + rate) / 2;
  const actualRate = Math.min(avgRate, rainfall);
  infil.currentRate = rate;
  infil.cumulInfil += actualRate * dt / 3600;
  return actualRate;
}

function computeRunoff(sc, subarea, rainfall, infilRate, dt) {
  const area_ft2 = sc.area * 43560;
  const pctImperv = sc.pctImperv / 100;
  const pctPerv = 1 - pctImperv;

  const nImperv = subarea ? subarea.nImperv : 0.01;
  const nPerv = subarea ? subarea.nPerv : 0.1;
  const dsImperv = subarea ? subarea.sImperv : 0.05;
  const dsPerv = subarea ? subarea.sPerv : 0.05;

  const rainfallDepth = rainfall * dt / 3600;

  let impervRunoff = 0;
  if (rainfall > 0) {
    const netRainImperv = rainfall;
    if (rainfallDepth > dsImperv) {
      const excessImperv = netRainImperv - dsImperv * 3600 / dt;
      if (excessImperv > 0) {
        const alpha = 1.49 * Math.sqrt(sc.slope / 100) / (nImperv * sc.width);
        impervRunoff = excessImperv * pctImperv;
      }
    }
  }

  let pervRunoff = 0;
  if (rainfall > infilRate) {
    const netRainPerv = rainfall - infilRate;
    if (netRainPerv > dsPerv * 3600 / dt) {
      const excessPerv = netRainPerv - dsPerv * 3600 / dt;
      if (excessPerv > 0) {
        pervRunoff = excessPerv * pctPerv;
      }
    }
  }

  const runoff_in_per_hr = impervRunoff + pervRunoff;
  const runoff_cfs = runoff_in_per_hr * area_ft2 / 43200;
  return Math.max(0, runoff_cfs);
}

function routeFlow(project, dt) {
  for (const id of Object.keys(project.nodes)) {
    const n = project.nodes[id];
    n.inflow = n.lateralInflow;
    n.outflow = 0;
  }

  for (const id of Object.keys(project.conduits)) {
    const c = project.conduits[id];
    const xs = c.xsect;
    if (!xs) continue;
    const diameter = xs.geom1;

    const upNode = project.nodes[c.fromNode];
    const dnNode = project.nodes[c.toNode];
    if (!upNode || !dnNode) continue;

    const upInvert = upNode.invertElev + c.inOffset;
    const dnInvert = dnNode.invertElev + c.outOffset;

    const midDepth = Math.max(0,
      ((upNode.head + dnNode.head) / 2) - ((upInvert + dnInvert) / 2));
    const linkDepth = Math.min(midDepth, diameter);

    c.area = circularArea(diameter, linkDepth);
    c.depth = linkDepth;
    const hydRad = circularHydRadius(diameter, linkDepth);
    const width = circularWidth(diameter, linkDepth);

    const dh = upNode.head - dnNode.head;
    const slope = dh / c.length;

    let newFlow;
    if (c.area < 1e-6) {
      newFlow = 0;
    } else {
      const Sf = c.roughness * c.roughness * c.flow * Math.abs(c.flow) /
        (Math.pow(c.area, 10/3) + 1e-30);

      const netSlope = slope - Sf;
      const dQ = GRAVITY * c.area * netSlope * dt;

      newFlow = c.flow + dQ;

      const qFull = (1.49 / c.roughness) * c.fullArea *
        Math.pow(c.fullHydRadius, 2/3) * Math.pow(Math.abs(slope) + 1e-6, 0.5);

      const maxQ = Math.max(qFull * 1.5, c.fullFlow * 1.5);
      if (Math.abs(newFlow) > maxQ) {
        newFlow = Math.sign(newFlow) * maxQ;
      }
    }

    const inertiaFactor = project.options.inertialDamping === 'PARTIAL' ? 0.75 : 1.0;
    c.flow = c.flow * (1 - inertiaFactor) + newFlow * inertiaFactor;

    c.velocity = c.area > 1e-6 ? c.flow / c.area : 0;

    if (c.flow > 0) {
      dnNode.inflow += c.flow;
      upNode.outflow += c.flow;
    } else {
      upNode.inflow += Math.abs(c.flow);
      dnNode.outflow += Math.abs(c.flow);
    }
  }

  for (const id of Object.keys(project.nodes)) {
    const n = project.nodes[id];
    if (n.type === 'outfall') {
      n.head = n.invertElev;
      n.depth = 0;
      continue;
    }

    const netFlow = n.inflow - n.outflow;
    const surfArea = Math.max(n.aPonded > 0 ? n.aPonded : project.options.minSurfArea,
      project.options.minSurfArea);

    n.depth += netFlow * dt / surfArea;
    if (n.depth < 0) n.depth = 0;

    if (n.depth > n.maxDepth) {
      n.overflow = (n.depth - n.maxDepth) * surfArea / dt;
      n.depth = n.maxDepth;
    } else {
      n.overflow = 0;
    }

    n.head = n.invertElev + n.depth;
    n.volume = n.depth * surfArea;
  }
}

function simulate(project) {
  const dt = project.options.routingStep;
  const totalDuration = project.options.totalDuration;
  const reportStep = project.options.reportStep;
  let elapsed = 0;
  let nextReport = 0;
  let steps = 0;

  const results = {
    nodeResults: {},
    linkResults: {},
    reportTimes: [],
  };

  for (const id of Object.keys(project.nodes)) {
    results.nodeResults[id] = [];
  }
  for (const id of Object.keys(project.links)) {
    results.linkResults[id] = [];
  }

  while (elapsed < totalDuration) {
    for (const scId of Object.keys(project.subcatchments)) {
      const sc = project.subcatchments[scId];
      const gage = project.raingages[sc.rainGage];
      let rainfall = 0;
      if (gage) {
        const ts = project.timeseries[gage.sourceName];
        rainfall = getTimeSeries(ts, elapsed);
      }

      const infil = project.infiltration[scId];
      const infilRate = hortonInfil(infil, rainfall, dt);
      const subarea = project.subareas[scId];

      sc.rainfall = rainfall;
      const runoff = computeRunoff(sc, subarea, rainfall, infilRate, dt);
      sc.runoff = runoff;

      sc.totalPrecip += rainfall * dt / 3600;
      sc.totalInfil += infilRate * dt / 3600;
      sc.totalRunoff += runoff * dt;
      if (runoff > sc.peakRunoff) sc.peakRunoff = runoff;

      const outletNode = project.nodes[sc.outlet];
      if (outletNode) {
        outletNode.lateralInflow += runoff;
      }
    }

    routeFlow(project, dt);

    for (const id of Object.keys(project.nodes)) {
      const n = project.nodes[id];
      if (n.depth > n.peakDepth) {
        n.peakDepth = n.depth;
        n.timePeakDepth = elapsed;
        n.peakHGL = n.head;
      }
      n.totalInflow += n.inflow * dt;
      if (n.inflow > n.peakInflow) n.peakInflow = n.inflow;
      n.totalOverflow += n.overflow * dt;
      if (n.overflow > 0) n.timeFlooded += dt;
    }

    for (const id of Object.keys(project.links)) {
      const c = project.links[id];
      if (Math.abs(c.flow) > Math.abs(c.peakFlow)) {
        c.peakFlow = c.flow;
        c.timePeakFlow = elapsed;
      }
      if (Math.abs(c.velocity) > Math.abs(c.peakVelocity)) {
        c.peakVelocity = c.velocity;
      }
      if (c.depth > c.peakDepth) c.peakDepth = c.depth;
      c.totalFlow += c.flow * dt;
      if (c.xsect && c.depth >= c.xsect.geom1 * 0.95) {
        c.capacityLimited += dt;
      }
    }

    if (elapsed >= nextReport) {
      results.reportTimes.push(elapsed);
      for (const id of Object.keys(project.nodes)) {
        const n = project.nodes[id];
        results.nodeResults[id].push({
          time: elapsed, depth: n.depth, head: n.head,
          inflow: n.inflow, overflow: n.overflow,
        });
      }
      for (const id of Object.keys(project.links)) {
        const c = project.links[id];
        results.linkResults[id].push({
          time: elapsed, flow: c.flow, velocity: c.velocity,
          depth: c.depth, capacity: c.xsect ? c.depth / c.xsect.geom1 : 0,
        });
      }
      nextReport += reportStep;
    }

    for (const id of Object.keys(project.nodes)) {
      project.nodes[id].lateralInflow = 0;
    }

    elapsed += dt;
    steps++;
  }

  return { project, results, steps, elapsed };
}

function generateReport(project, results, steps, elapsed, parseTimeMs, simTimeMs) {
  const opt = project.options;
  const startDT = fmtDateTime(opt.startDate, opt.startTime);
  const endDT = fmtDateTime(opt.endDate, opt.endTime);
  const pad = (s, w) => String(s).padEnd(w);
  const padR = (s, w) => String(s).padStart(w);
  const fNum = (n, d = 3) => n.toFixed(d);

  let rpt = '';
  const ln = (s = '') => { rpt += s + '\n'; };

  ln('  **********************************************');
  ln('  *     SWMM5 JavaScript Engine                *');
  ln('  *     Browser-Native Simulation              *');
  ln('  *     Based on EPA SWMM 5.2                  *');
  ln('  **********************************************');
  ln();

  ln('  ****************');
  ln('  Analysis Options');
  ln('  ****************');
  ln(`  Flow Units ............... ${opt.flowUnits}`);
  ln(`  Process Models:`);
  ln(`    Rainfall/Runoff ........ YES`);
  ln(`    RDII ................... NO`);
  ln(`    Snowmelt ............... NO`);
  ln(`    Groundwater ............ NO`);
  ln(`    Flow Routing ........... YES`);
  ln(`    Ponding Allowed ........ ${opt.allowPonding ? 'YES' : 'NO'}`);
  ln(`    Water Quality .......... NO`);
  ln();
  ln(`  Infiltration Method ...... ${opt.infiltration}`);
  ln(`  Flow Routing Method ...... ${opt.flowRouting}`);
  ln(`  Starting Date ............ ${startDT}`);
  ln(`  Ending Date .............. ${endDT}`);
  ln(`  Report Step .............. ${fmtTime(opt.reportStep)}`);
  ln(`  Wet Weather Step ......... ${fmtTime(opt.wetStep)}`);
  ln(`  Dry Weather Step ......... ${fmtTime(opt.dryStep)}`);
  ln(`  Routing Step ............. ${fNum(opt.routingStep, 2)} sec`);
  ln();

  ln('  Engine Performance:');
  ln(`    Routing Steps .......... ${steps}`);
  ln(`    Parse Time ............. ${fNum(parseTimeMs, 1)} ms`);
  ln(`    Simulation Time ........ ${fNum(simTimeMs, 1)} ms`);
  ln(`    Total Time ............. ${fNum(parseTimeMs + simTimeMs, 1)} ms`);
  ln();

  const nodeIds = Object.keys(project.nodes);
  const linkIds = Object.keys(project.links);
  const scIds = Object.keys(project.subcatchments);

  ln('  **************************');
  ln('  Subcatchment Runoff Summary');
  ln('  **************************');
  ln();
  ln('  ' + pad('', 28) + padR('Total', 10) + padR('Total', 10) +
     padR('Total', 10) + padR('Peak', 12) + padR('Runoff', 10));
  ln('  ' + pad('Subcatchment', 28) + padR('Precip', 10) + padR('Runon', 10) +
     padR('Runoff', 10) + padR('Runoff', 12) + padR('Coeff', 10));
  ln('  ' + pad('', 28) + padR('in', 10) + padR('in', 10) +
     padR('in', 10) + padR(opt.flowUnits, 12) + padR('', 10));
  ln('  ' + '-'.repeat(88));

  for (const id of scIds) {
    const sc = project.subcatchments[id];
    const totalPrecipIn = sc.totalPrecip;
    const totalRunoffIn = sc.totalRunoff / (sc.area * 43560) * 12;
    const runoffCoeff = totalPrecipIn > 0 ? totalRunoffIn / totalPrecipIn : 0;
    ln('  ' + pad(id, 28) +
       padR(fNum(totalPrecipIn, 2), 10) +
       padR('0.00', 10) +
       padR(fNum(totalRunoffIn, 2), 10) +
       padR(fNum(sc.peakRunoff, 3), 12) +
       padR(fNum(runoffCoeff, 3), 10));
  }
  ln();

  ln('  ******************');
  ln('  Node Depth Summary');
  ln('  ******************');
  ln();
  ln('  ' + pad('', 28) + padR('Average', 10) + padR('Maximum', 10) +
     padR('Maximum', 12) + padR('Time of', 14));
  ln('  ' + pad('Node', 28) + padR('Depth', 10) + padR('Depth', 10) +
     padR('HGL', 12) + padR('Max Depth', 14));
  ln('  ' + pad('', 28) + padR('Feet', 10) + padR('Feet', 10) +
     padR('Feet', 12) + padR('', 14));
  ln('  ' + '-'.repeat(84));

  for (const id of nodeIds) {
    const n = project.nodes[id];
    const avgDepth = results.nodeResults[id].length > 0 ?
      results.nodeResults[id].reduce((s, r) => s + r.depth, 0) / results.nodeResults[id].length : 0;
    ln('  ' + pad(id, 28) +
       padR(fNum(avgDepth, 3), 10) +
       padR(fNum(n.peakDepth, 3), 10) +
       padR(fNum(n.peakHGL || (n.invertElev + n.peakDepth), 3), 12) +
       padR(fmtTime(n.timePeakDepth), 14));
  }
  ln();

  ln('  ********************');
  ln('  Node Inflow Summary');
  ln('  ********************');
  ln();
  ln('  ' + pad('', 28) + padR('Lateral', 12) + padR('Total', 12) +
     padR('Peak', 14));
  ln('  ' + pad('Node', 28) + padR('Inflow', 12) + padR('Inflow', 12) +
     padR('Inflow', 14));
  ln('  ' + pad('', 28) + padR('Vol (ft3)', 12) + padR('Vol (ft3)', 12) +
     padR(opt.flowUnits, 14));
  ln('  ' + '-'.repeat(66));

  for (const id of nodeIds) {
    const n = project.nodes[id];
    ln('  ' + pad(id, 28) +
       padR(fNum(n.totalInflow, 1), 12) +
       padR(fNum(n.totalInflow, 1), 12) +
       padR(fNum(n.peakInflow, 3), 14));
  }
  ln();

  ln('  *******************');
  ln('  Node Flood Summary');
  ln('  *******************');
  ln();

  const floodedNodes = nodeIds.filter(id => project.nodes[id].totalOverflow > 0);
  if (floodedNodes.length === 0) {
    ln('  No nodes were flooded.');
  } else {
    ln('  ' + pad('Node', 28) + padR('Hours', 10) + padR('Max Overflow', 14) +
       padR('Total Vol', 14));
    ln('  ' + pad('', 28) + padR('Flooded', 10) + padR(opt.flowUnits, 14) +
       padR('ft3', 14));
    ln('  ' + '-'.repeat(66));
    for (const id of floodedNodes) {
      const n = project.nodes[id];
      ln('  ' + pad(id, 28) +
         padR(fNum(n.timeFlooded / 3600, 2), 10) +
         padR(fNum(n.overflow, 3), 14) +
         padR(fNum(n.totalOverflow, 1), 14));
    }
  }
  ln();

  ln('  **********************');
  ln('  Link Flow Summary');
  ln('  **********************');
  ln();
  ln('  ' + pad('', 28) + padR('Maximum', 12) + padR('Time of', 14) +
     padR('Maximum', 12) + padR('Max/', 10));
  ln('  ' + pad('Link', 28) + padR('|Flow|', 12) + padR('Max Flow', 14) +
     padR('|Veloc|', 12) + padR('Full', 10));
  ln('  ' + pad('', 28) + padR(opt.flowUnits, 12) + padR('', 14) +
     padR('ft/sec', 12) + padR('', 10));
  ln('  ' + '-'.repeat(76));

  for (const id of linkIds) {
    const c = project.links[id];
    const maxFullRatio = c.xsect ? c.peakDepth / c.xsect.geom1 : 0;
    ln('  ' + pad(id, 28) +
       padR(fNum(Math.abs(c.peakFlow), 3), 12) +
       padR(fmtTime(c.timePeakFlow), 14) +
       padR(fNum(Math.abs(c.peakVelocity), 3), 12) +
       padR(fNum(maxFullRatio, 2), 10));
  }
  ln();

  ln('  **************************');
  ln('  Link Volume Summary');
  ln('  **************************');
  ln();
  ln('  ' + pad('Link', 28) + padR('Total Vol (ft3)', 18) + padR('Time Full (%)', 16));
  ln('  ' + '-'.repeat(62));

  for (const id of linkIds) {
    const c = project.links[id];
    const pctFull = elapsed > 0 ? c.capacityLimited / elapsed * 100 : 0;
    ln('  ' + pad(id, 28) +
       padR(fNum(c.totalFlow, 1), 18) +
       padR(fNum(pctFull, 2), 16));
  }
  ln();

  ln('  ***************');
  ln('  Routing Results');
  ln('  ***************');
  ln();

  const reportTimes = results.reportTimes;
  if (reportTimes.length > 0 && reportTimes.length <= 50) {
    ln('  <<< Node Results >>>');
    ln();
    for (const nid of nodeIds) {
      ln(`  <<< Node ${nid} >>>`);
      ln('  ' + pad('Date/Time', 22) + padR('Depth', 10) + padR('Head', 12) +
         padR('Inflow', 12) + padR('Overflow', 12));
      ln('  ' + pad('', 22) + padR('ft', 10) + padR('ft', 12) +
         padR(opt.flowUnits, 12) + padR(opt.flowUnits, 12));
      ln('  ' + '-'.repeat(68));
      for (const r of results.nodeResults[nid]) {
        ln('  ' + pad(fmtDateTime(opt.startDate, opt.startTime + r.time), 22) +
           padR(fNum(r.depth, 3), 10) +
           padR(fNum(r.head, 3), 12) +
           padR(fNum(r.inflow, 3), 12) +
           padR(fNum(r.overflow, 3), 12));
      }
      ln();
    }

    ln('  <<< Link Results >>>');
    ln();
    for (const lid of linkIds) {
      ln(`  <<< Link ${lid} >>>`);
      ln('  ' + pad('Date/Time', 22) + padR('Flow', 12) + padR('Velocity', 12) +
         padR('Depth', 10) + padR('Capacity', 10));
      ln('  ' + pad('', 22) + padR(opt.flowUnits, 12) + padR('ft/sec', 12) +
         padR('ft', 10) + padR('', 10));
      ln('  ' + '-'.repeat(66));
      for (const r of results.linkResults[lid]) {
        ln('  ' + pad(fmtDateTime(opt.startDate, opt.startTime + r.time), 22) +
           padR(fNum(r.flow, 3), 12) +
           padR(fNum(r.velocity, 3), 12) +
           padR(fNum(r.depth, 3), 10) +
           padR(fNum(r.capacity, 3), 10));
      }
      ln();
    }
  }

  ln('  Analysis begun on : ' + new Date().toISOString());
  ln('  Total elapsed time : ' + fNum((parseTimeMs + simTimeMs) / 1000, 3) + ' seconds');
  ln('  Engine: SWMM5-JS v1.0 (Browser-Native JavaScript)');

  return rpt;
}

export function runSwmm5JS(inpText) {
  try {
    const t0 = performance.now();
    const project = parseInp(inpText);
    const t1 = performance.now();
    const parseTimeMs = t1 - t0;

    const nodeCount = Object.keys(project.nodes).length;
    const linkCount = Object.keys(project.links).length;
    const scCount = Object.keys(project.subcatchments).length;

    if (nodeCount === 0) {
      return { success: false, rpt: '', error: 'No nodes found in .inp file' };
    }
    if (linkCount === 0) {
      return { success: false, rpt: '', error: 'No links found in .inp file' };
    }

    const t2 = performance.now();
    const { results, steps, elapsed } = simulate(project);
    const t3 = performance.now();
    const simTimeMs = t3 - t2;

    const rpt = generateReport(project, results, steps, elapsed, parseTimeMs, simTimeMs);

    return { success: true, rpt, error: '' };
  } catch (err) {
    return {
      success: false, rpt: '',
      error: 'JS Engine error: ' + err.message + '\n' + err.stack,
    };
  }
}
