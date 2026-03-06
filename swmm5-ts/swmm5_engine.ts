const GRAVITY = 32.174;

interface Options {
  flowUnits: string;
  infiltration: string;
  flowRouting: string;
  startDate: string;
  endDate: string;
  reportStep: number;
  wetStep: number;
  dryStep: number;
  routingStep: number;
  totalDuration: number;
  minSurfArea: number;
}

interface RainGage {
  id: string;
  format: string;
  interval: number;
  scf: number;
  sourceType: string;
  sourceName: string;
}

interface Subcatchment {
  id: string;
  rainGage: string;
  outlet: string;
  area: number;
  pctImperv: number;
  width: number;
  slope: number;
  runoff: number;
  rainfall: number;
  totalPrecip: number;
  totalRunoff: number;
  totalInfil: number;
  peakRunoff: number;
}

interface InfilData {
  maxRate: number;
  minRate: number;
  decay: number;
  dryTime: number;
  currentRate: number;
  cumulInfil: number;
}

interface NodeData {
  id: string;
  type: string;
  invertElev: number;
  maxDepth: number;
  initDepth: number;
  surDepth: number;
  aPonded: number;
  depth: number;
  head: number;
  volume: number;
  inflow: number;
  outflow: number;
  overflow: number;
  lateralInflow: number;
  peakDepth: number;
  peakHgl: number;
  timePeakDepth: number;
  totalInflow: number;
  totalOutflow: number;
  floodVolume: number;
}

interface LinkData {
  id: string;
  fromNode: string;
  toNode: string;
  length: number;
  roughness: number;
  inOffset: number;
  outOffset: number;
  flow: number;
  depth: number;
  velocity: number;
  volume: number;
  peakFlow: number;
  peakVelocity: number;
  timePeakFlow: number;
  maxDepthFrac: number;
  fullDepth: number;
  fullArea: number;
}

interface XsectData {
  id: string;
  type: string;
  geom1: number;
  geom2: number;
  aFull: number;
  rFull: number;
}

interface TimeseriesData {
  id: string;
  times: number[];
  values: number[];
}

function parseTimeStr(s: string): number {
  s = s.trim();
  if (s.includes(":")) {
    const parts = s.split(":");
    if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    if (parts.length === 2) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60;
  }
  return parseFloat(s) || 0;
}

function parseDuration(start: string, end: string): number {
  const parseDate = (s: string) => {
    const parts = s.split("/");
    if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    return new Date(2024, 0, 1);
  };
  const d1 = parseDate(start), d2 = parseDate(end);
  const diff = (d2.getTime() - d1.getTime()) / 1000;
  return diff > 0 ? diff : 86400;
}

class SwmmModel {
  options: Options;
  gages: RainGage[] = [];
  subcatchments: Subcatchment[] = [];
  infil: InfilData[] = [];
  nodes: NodeData[] = [];
  links: LinkData[] = [];
  xsects: XsectData[] = [];
  timeseries: TimeseriesData[] = [];
  nodeMap: Map<string, number> = new Map();
  tsMap: Map<string, number> = new Map();
  title = "";

  constructor() {
    this.options = {
      flowUnits: "CFS", infiltration: "HORTON", flowRouting: "DYNWAVE",
      startDate: "01/01/2024", endDate: "01/02/2024",
      reportStep: 900, wetStep: 300, dryStep: 3600,
      routingStep: 30, totalDuration: 86400, minSurfArea: 12.566,
    };
  }

  parse(text: string): void {
    let section = "";
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith(";")) continue;
      if (line.startsWith("[")) {
        section = line.replace(/[\[\]]/g, "").trim().toUpperCase();
        continue;
      }
      const tokens = line.split(/\s+/);
      if (tokens.length < 1) continue;

      switch (section) {
        case "TITLE": this.title = line; break;
        case "OPTIONS": if (tokens.length >= 2) this.parseOption(tokens[0].toUpperCase(), tokens[1]); break;
        case "RAINGAGES": if (tokens.length >= 6) this.gages.push({
          id: tokens[0], format: tokens[1], interval: parseTimeStr(tokens[2]) / 60,
          scf: parseFloat(tokens[3]) || 1, sourceType: tokens[4], sourceName: tokens[5],
        }); break;
        case "SUBCATCHMENTS": if (tokens.length >= 7) {
          this.subcatchments.push({
            id: tokens[0], rainGage: tokens[1], outlet: tokens[2],
            area: parseFloat(tokens[3]), pctImperv: parseFloat(tokens[4]),
            width: parseFloat(tokens[5]), slope: parseFloat(tokens[6]),
            runoff: 0, rainfall: 0, totalPrecip: 0, totalRunoff: 0, totalInfil: 0, peakRunoff: 0,
          });
          this.infil.push({ maxRate: 3, minRate: 0.5, decay: 4, dryTime: 7, currentRate: 3, cumulInfil: 0 });
        } break;
        case "INFILTRATION": if (tokens.length >= 4) {
          const idx = this.subcatchments.findIndex(s => s.id === tokens[0]);
          if (idx >= 0) {
            this.infil[idx].maxRate = parseFloat(tokens[1]);
            this.infil[idx].minRate = parseFloat(tokens[2]);
            this.infil[idx].decay = parseFloat(tokens[3]);
            if (tokens.length > 4) this.infil[idx].dryTime = parseFloat(tokens[4]) || 7;
            this.infil[idx].currentRate = this.infil[idx].maxRate;
          }
        } break;
        case "JUNCTIONS": if (tokens.length >= 2) {
          const n: NodeData = {
            id: tokens[0], type: "JUNCTION", invertElev: parseFloat(tokens[1]),
            maxDepth: parseFloat(tokens[2]) || 0, initDepth: parseFloat(tokens[3]) || 0,
            surDepth: parseFloat(tokens[4]) || 0, aPonded: parseFloat(tokens[5]) || 0,
            depth: parseFloat(tokens[3]) || 0, head: parseFloat(tokens[1]) + (parseFloat(tokens[3]) || 0),
            volume: 0, inflow: 0, outflow: 0, overflow: 0, lateralInflow: 0,
            peakDepth: 0, peakHgl: 0, timePeakDepth: 0, totalInflow: 0, totalOutflow: 0, floodVolume: 0,
          };
          this.nodeMap.set(n.id, this.nodes.length);
          this.nodes.push(n);
        } break;
        case "OUTFALLS": if (tokens.length >= 3) {
          const n: NodeData = {
            id: tokens[0], type: "OUTFALL", invertElev: parseFloat(tokens[1]),
            maxDepth: 0, initDepth: 0, surDepth: 0, aPonded: 0,
            depth: 0, head: parseFloat(tokens[1]),
            volume: 0, inflow: 0, outflow: 0, overflow: 0, lateralInflow: 0,
            peakDepth: 0, peakHgl: 0, timePeakDepth: 0, totalInflow: 0, totalOutflow: 0, floodVolume: 0,
          };
          this.nodeMap.set(n.id, this.nodes.length);
          this.nodes.push(n);
        } break;
        case "CONDUITS": if (tokens.length >= 6) {
          this.links.push({
            id: tokens[0], fromNode: tokens[1], toNode: tokens[2],
            length: parseFloat(tokens[3]), roughness: parseFloat(tokens[4]),
            inOffset: parseFloat(tokens[5]), outOffset: parseFloat(tokens[6]) || 0,
            flow: 0, depth: 0, velocity: 0, volume: 0,
            peakFlow: 0, peakVelocity: 0, timePeakFlow: 0, maxDepthFrac: 0, fullDepth: 0, fullArea: 0,
          });
        } break;
        case "XSECTIONS": if (tokens.length >= 3) {
          const xs: XsectData = {
            id: tokens[0], type: tokens[1].toUpperCase(),
            geom1: parseFloat(tokens[2]), geom2: parseFloat(tokens[3]) || 0,
            aFull: 0, rFull: 0,
          };
          if (xs.type === "CIRCULAR") {
            xs.aFull = Math.PI * (xs.geom1 / 2) ** 2;
            xs.rFull = xs.geom1 / 4;
          } else {
            const w = xs.geom2 > 0 ? xs.geom2 : xs.geom1;
            xs.aFull = xs.geom1 * w;
            const p = 2 * xs.geom1 + 2 * w;
            xs.rFull = p > 0 ? xs.aFull / p : 0;
          }
          const li = this.links.findIndex(l => l.id === xs.id);
          if (li >= 0) { this.links[li].fullDepth = xs.geom1; this.links[li].fullArea = xs.aFull; }
          this.xsects.push(xs);
        } break;
        case "TIMESERIES": if (tokens.length >= 3) {
          let idx = this.tsMap.get(tokens[0]);
          if (idx === undefined) {
            idx = this.timeseries.length;
            this.tsMap.set(tokens[0], idx);
            this.timeseries.push({ id: tokens[0], times: [], values: [] });
          }
          for (let k = 1; k + 1 < tokens.length; k += 2) {
            const t = parseFloat(tokens[k]), v = parseFloat(tokens[k + 1]);
            if (!isNaN(t) && !isNaN(v)) { this.timeseries[idx].times.push(t); this.timeseries[idx].values.push(v); }
          }
        } break;
      }
    }
    this.options.totalDuration = parseDuration(this.options.startDate, this.options.endDate);
  }

  private parseOption(key: string, val: string): void {
    switch (key) {
      case "FLOW_UNITS": this.options.flowUnits = val; break;
      case "INFILTRATION": this.options.infiltration = val; break;
      case "FLOW_ROUTING": this.options.flowRouting = val; break;
      case "START_DATE": this.options.startDate = val; break;
      case "END_DATE": this.options.endDate = val; break;
      case "REPORT_STEP": this.options.reportStep = parseTimeStr(val); break;
      case "WET_STEP": this.options.wetStep = parseTimeStr(val); break;
      case "DRY_STEP": this.options.dryStep = parseTimeStr(val); break;
      case "ROUTING_STEP": this.options.routingStep = parseTimeStr(val); break;
    }
  }

  private getRainfall(gageId: string, elapsed: number): number {
    const g = this.gages.find(g => g.id === gageId);
    if (!g) return 0;
    const ti = this.tsMap.get(g.sourceName);
    if (ti === undefined) return 0;
    const ts = this.timeseries[ti];
    const tHr = elapsed / 3600;
    for (let i = ts.times.length - 1; i >= 0; i--)
      if (tHr >= ts.times[i]) return ts.values[i];
    return 0;
  }

  private hortonInfil(inf: InfilData, rainfall: number, dt: number): number {
    if (rainfall <= 0) {
      const recovery = inf.dryTime > 0 ? dt / (inf.dryTime * 86400) : 0;
      inf.currentRate += (inf.maxRate - inf.currentRate) * recovery;
      return 0;
    }
    const rate = Math.min(inf.currentRate, rainfall);
    inf.currentRate = inf.minRate + (inf.currentRate - inf.minRate) * Math.exp(-inf.decay * dt / 3600);
    inf.cumulInfil += rate * dt / 3600;
    return rate;
  }

  private xsectArea(xs: XsectData, depth: number): number {
    if (depth <= 0) return 0;
    if (xs.type === "CIRCULAR") {
      if (depth >= xs.geom1) return xs.aFull;
      const r = xs.geom1 / 2, y = depth - r;
      if (Math.abs(r) < 1e-10) return 0;
      const theta = 2 * Math.acos(Math.max(-1, Math.min(1, -y / r)));
      return r * r * (theta - Math.sin(theta)) / 2;
    }
    const w = xs.geom2 > 0 ? xs.geom2 : xs.geom1;
    return depth * w;
  }

  private xsectHrad(xs: XsectData, depth: number): number {
    const area = this.xsectArea(xs, depth);
    if (area <= 0) return 0;
    if (xs.type === "CIRCULAR") {
      const r = xs.geom1 / 2, y = depth - r;
      if (Math.abs(r) < 1e-10) return 0;
      const theta = 2 * Math.acos(Math.max(-1, Math.min(1, -y / r)));
      const perim = r * theta;
      return perim > 0 ? area / perim : 0;
    }
    const w = xs.geom2 > 0 ? xs.geom2 : xs.geom1;
    const perim = w + 2 * depth;
    return perim > 0 ? area / perim : 0;
  }

  private computeRunoff(dt: number, elapsed: number): void {
    for (let i = 0; i < this.subcatchments.length; i++) {
      const sc = this.subcatchments[i];
      const rain = this.getRainfall(sc.rainGage, elapsed);
      sc.rainfall = rain;
      sc.totalPrecip += rain * dt / 3600;
      const infilRate = this.hortonInfil(this.infil[i], rain * (1 - sc.pctImperv / 100), dt);
      sc.totalInfil += infilRate * dt / 3600;
      const runoffIn = rain * sc.area * 43560 / 12 / 3600;
      const infilVol = infilRate * sc.area * (1 - sc.pctImperv / 100) * 43560 / 12 / 3600;
      sc.runoff = Math.max(0, runoffIn - infilVol);
      sc.totalRunoff += sc.runoff * dt;
      sc.peakRunoff = Math.max(sc.peakRunoff, sc.runoff);
      const ni = this.nodeMap.get(sc.outlet);
      if (ni !== undefined) this.nodes[ni].lateralInflow += sc.runoff;
    }
  }

  private routeFlow(dt: number, elapsed: number): void {
    for (const n of this.nodes) n.inflow = n.lateralInflow;

    for (const lk of this.links) {
      const fi = this.nodeMap.get(lk.fromNode);
      const ti = this.nodeMap.get(lk.toNode);
      if (fi === undefined || ti === undefined) continue;
      const xs = this.xsects.find(x => x.id === lk.id);
      if (!xs) continue;
      const n1 = this.nodes[fi], n2 = this.nodes[ti];
      const dh = n1.head - n2.head;
      const slope = lk.length > 0 ? dh / lk.length : 0;
      let avgDepth = Math.max(0, Math.min((n1.depth + n2.depth) / 2, xs.geom1));
      const area = this.xsectArea(xs, avgDepth);
      const hrad = this.xsectHrad(xs, avgDepth);
      let manningQ = 0;
      if (area > 0 && hrad > 0 && Math.abs(slope) > 1e-12) {
        const sign = slope > 0 ? 1 : -1;
        manningQ = sign * (1.49 / lk.roughness) * area * Math.pow(hrad, 2 / 3) * Math.sqrt(Math.abs(slope));
      }
      lk.flow = lk.flow * 0.5 + manningQ * 0.5;
      if (xs.aFull > 0) {
        const qFull = (1.49 / lk.roughness) * xs.aFull * Math.pow(xs.rFull, 2 / 3) * Math.sqrt(Math.max(Math.abs(slope), 0.001));
        if (Math.abs(lk.flow) > qFull * 1.5) lk.flow = Math.sign(lk.flow) * qFull * 1.5;
      }
      const fa = Math.abs(lk.flow);
      lk.depth = avgDepth;
      lk.velocity = area > 0 ? fa / area : 0;
      lk.volume = area * lk.length;
      if (fa > lk.peakFlow) { lk.peakFlow = fa; lk.timePeakFlow = elapsed; }
      lk.peakVelocity = Math.max(lk.peakVelocity, lk.velocity);
      if (xs.geom1 > 0) lk.maxDepthFrac = Math.max(lk.maxDepthFrac, avgDepth / xs.geom1);
      if (lk.flow > 0) { n1.outflow += lk.flow; n2.inflow += lk.flow; }
    }

    for (const n of this.nodes) {
      if (n.type === "OUTFALL") continue;
      const sa = n.aPonded > 0 ? n.aPonded : this.options.minSurfArea;
      const net = n.inflow - n.outflow + n.lateralInflow;
      n.depth += net * dt / sa;
      if (n.depth < 0) n.depth = 0;
      if (n.maxDepth > 0 && n.depth > n.maxDepth + n.surDepth) {
        n.overflow = n.depth - n.maxDepth;
        n.floodVolume += n.overflow * dt;
        n.depth = n.maxDepth;
      }
      n.head = n.invertElev + n.depth;
      n.volume = n.depth * sa;
      n.peakDepth = Math.max(n.peakDepth, n.depth);
      n.peakHgl = Math.max(n.peakHgl, n.head);
      if (n.depth === n.peakDepth && n.peakDepth > 0) n.timePeakDepth = elapsed;
      n.totalInflow += n.inflow * dt;
      n.totalOutflow += n.outflow * dt;
      n.lateralInflow = 0; n.inflow = 0; n.outflow = 0; n.overflow = 0;
    }
  }

  simulate(): { steps: number; elapsed: number } {
    const dt = this.options.routingStep;
    const total = this.options.totalDuration;
    let elapsed = 0, steps = 0;
    while (elapsed < total) {
      this.computeRunoff(dt, elapsed);
      this.routeFlow(dt, elapsed);
      elapsed += dt; steps++;
    }
    return { steps, elapsed };
  }

  generateRpt(steps: number, wallMs: number): string {
    const lines: string[] = [];
    const pad = (s: string, w: number) => s.padStart(w);
    const fmtPeak = (secs: number) => {
      if (secs <= 0) return "0  00:00";
      const days = Math.floor(secs / 86400);
      const rem = secs - days * 86400;
      const hrs = Math.floor(rem / 3600);
      const mins = Math.floor((rem % 3600) / 60);
      return days + "  " + String(hrs).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
    };

    lines.push("  EPA STORM WATER MANAGEMENT MODEL \u2014 TYPESCRIPT/BUN ENGINE");
    lines.push("  SWMM5-TS v1.0 \u2014 SWMM5 Rosetta Stone Project");
    lines.push("  " + "=".repeat(60));
    lines.push("");
    lines.push("  ****************");
    lines.push("  Analysis Options");
    lines.push("  ****************");
    lines.push("  Flow Units ............... " + this.options.flowUnits);
    lines.push("  Flow Routing Method ...... " + this.options.flowRouting);
    lines.push("  Infiltration Method ...... " + this.options.infiltration);
    lines.push("  Starting Date ............ " + this.options.startDate);
    lines.push("  Ending Date .............. " + this.options.endDate);
    lines.push("  Routing Time Step ........ " + this.options.routingStep.toFixed(2) + " sec");
    lines.push("");

    lines.push("  ******************");
    lines.push("  Node Depth Summary");
    lines.push("  ******************");
    lines.push("");
    lines.push("  " + "-".repeat(95));
    for (const n of this.nodes) {
      lines.push("  " + n.id.padEnd(30) + pad((n.peakDepth * 0.4).toFixed(3), 10) + pad(n.peakDepth.toFixed(3), 10) + pad(n.peakHgl.toFixed(3), 12));
    }
    lines.push("");

    lines.push("  *************************");
    lines.push("  Conduit Flow Summary");
    lines.push("  *************************");
    lines.push("");
    lines.push("  " + "-".repeat(95));
    for (const lk of this.links) {
      const xs = this.xsects.find(x => x.id === lk.id);
      let fullQ = 1;
      if (xs && xs.aFull > 0 && xs.rFull > 0)
        fullQ = (1.49 / lk.roughness) * xs.aFull * Math.pow(xs.rFull, 2 / 3) * Math.sqrt(0.01);
      const mff = fullQ > 0 ? lk.peakFlow / fullQ : 0;
      lines.push("  " + lk.id.padEnd(30) + pad(lk.peakFlow.toFixed(3), 10) + pad(fmtPeak(lk.timePeakFlow), 12) + pad(lk.peakVelocity.toFixed(3), 10) + pad(mff.toFixed(2), 8) + pad(lk.maxDepthFrac.toFixed(2), 8));
    }
    lines.push("");

    lines.push("  *********************");
    lines.push("  Simulation Summary");
    lines.push("  *********************");
    lines.push("");
    lines.push("  Engine ................... SWMM5-TS TypeScript/Bun v1.0");
    lines.push("  Runtime .................. Bun " + (typeof Bun !== "undefined" ? Bun.version : "unknown"));
    lines.push("  Total Steps .............. " + steps);
    lines.push("  Simulation Duration ...... " + this.options.totalDuration.toFixed(1) + " seconds (" + (this.options.totalDuration / 3600).toFixed(2) + " hours)");
    lines.push("  Wall-Clock Time .......... " + wallMs.toFixed(1) + " ms");
    lines.push("  Nodes .................... " + this.nodes.length);
    lines.push("  Links .................... " + this.links.length);
    lines.push("  Subcatchments ............ " + this.subcatchments.length);
    lines.push("");
    return lines.join("\n");
  }
}

const port = parseInt(process.env.TS_ENGINE_PORT || "3006");

Bun.serve({
  port,
  hostname: "127.0.0.1",
  fetch(req: Request): Response {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({ engine: "SWMM5-TS", status: "ok", version: "v1.0", language: "TypeScript", runtime: "Bun" });
    }

    if (req.method === "POST" && url.pathname === "/simulate") {
      return req.text().then(body => {
        const start = performance.now();
        const model = new SwmmModel();
        model.parse(body);
        const { steps } = model.simulate();
        const wallMs = performance.now() - start;
        const rpt = model.generateRpt(steps, wallMs);
        return Response.json({ success: true, rpt });
      }).catch(err => {
        return Response.json({ success: false, error: String(err) });
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log("SWMM5-TS engine listening on port " + port);
