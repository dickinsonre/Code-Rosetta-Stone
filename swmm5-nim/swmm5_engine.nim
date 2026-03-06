import std/[net, strutils, strformat, math, tables, times, os, parseutils]

const PI = 3.14159265358979323846

type
  Options = object
    flowUnits, infiltration, flowRouting, startDate, endDate: string
    reportStep, wetStep, dryStep, routingStep, totalDuration, minSurfArea: float

  Gage = object
    id, format, sourceType, sourceName: string
    interval, scf: float

  Subcatch = object
    id, rainGage, outlet: string
    area, pctImperv, width, slope: float
    runoff, rainfall, totalPrecip, totalRunoff, totalInfil, peakRunoff: float

  Infil = object
    maxRate, minRate, decay, dryTime, currentRate, cumulInfil: float

  Node = object
    id, nodeType: string
    invertElev, maxDepth, initDepth, surDepth, aPonded: float
    depth, head, volume, inflow, outflow, overflow, lateralInflow: float
    peakDepth, peakHgl, timePeakDepth, totalInflow, totalOutflow, floodVolume: float

  Link = object
    id, fromNode, toNode: string
    length, roughness, inOffset, outOffset: float
    flow, depth, velocity, volume, peakFlow, peakVelocity: float
    timePeakFlow, maxDepthFrac, fullDepth, fullArea: float

  Xsect = object
    id, xtype: string
    geom1, geom2, aFull, rFull: float

  TS = object
    id: string
    times, values: seq[float]

  Model = object
    options: Options
    gages: seq[Gage]
    subcatchments: seq[Subcatch]
    infil: seq[Infil]
    nodes: seq[Node]
    links: seq[Link]
    xsects: seq[Xsect]
    timeseries: Table[string, TS]
    nodeMap: Table[string, int]
    title: string

proc safeFloat(s: string, default: float = 0.0): float =
  try: parseFloat(s)
  except: default

proc parseTimeStr(s: string): float =
  let parts = s.strip().split(':')
  if parts.len >= 2:
    let h = safeFloat(parts[0])
    let m = safeFloat(parts[1])
    let sec = if parts.len > 2: safeFloat(parts[2]) else: 0.0
    return h * 3600 + m * 60 + sec
  return safeFloat(s)

proc parseDuration(startD, endD: string): float =
  try:
    let sp = startD.split('/'); let ep = endD.split('/')
    if sp.len < 3 or ep.len < 3: return 86400.0
    let d1 = dateTime(parseInt(sp[2]), Month(parseInt(sp[0])), MonthdayRange(parseInt(sp[1])))
    let d2 = dateTime(parseInt(ep[2]), Month(parseInt(ep[0])), MonthdayRange(parseInt(ep[1])))
    let diff = (d2.toTime - d1.toTime).inSeconds.float
    if diff > 0: diff else: 86400.0
  except: 86400.0

proc newOptions(): Options =
  Options(flowUnits: "CFS", infiltration: "HORTON", flowRouting: "DYNWAVE",
    startDate: "01/01/2024", endDate: "01/02/2024", reportStep: 900, wetStep: 300,
    dryStep: 3600, routingStep: 30, totalDuration: 86400, minSurfArea: 12.566)

proc newInfil(): Infil = Infil(maxRate: 3, minRate: 0.5, decay: 4, dryTime: 7, currentRate: 3)

proc parseInp(text: string): Model =
  var m = Model(options: newOptions())
  m.timeseries = initTable[string, TS]()
  m.nodeMap = initTable[string, int]()
  var section = ""
  for line in text.splitLines():
    let l = line.strip()
    if l.len == 0 or l[0] == ';': continue
    if l[0] == '[':
      section = l.replace("[", "").replace("]", "").toUpper()
      continue
    let t = l.splitWhitespace()
    if t.len == 0: continue
    case section
    of "TITLE": m.title = l
    of "OPTIONS":
      if t.len >= 2:
        case t[0].toUpper()
        of "FLOW_UNITS": m.options.flowUnits = t[1]
        of "INFILTRATION": m.options.infiltration = t[1]
        of "FLOW_ROUTING": m.options.flowRouting = t[1]
        of "START_DATE": m.options.startDate = t[1]
        of "END_DATE": m.options.endDate = t[1]
        of "REPORT_STEP": m.options.reportStep = parseTimeStr(t[1])
        of "WET_STEP": m.options.wetStep = parseTimeStr(t[1])
        of "DRY_STEP": m.options.dryStep = parseTimeStr(t[1])
        of "ROUTING_STEP": m.options.routingStep = parseTimeStr(t[1])
        else: discard
    of "RAINGAGES":
      if t.len >= 6:
        m.gages.add(Gage(id: t[0], format: t[1], interval: parseTimeStr(t[2]) / 60, scf: safeFloat(t[3]), sourceType: t[4], sourceName: t[5]))
    of "SUBCATCHMENTS":
      if t.len >= 7:
        m.subcatchments.add(Subcatch(id: t[0], rainGage: t[1], outlet: t[2], area: safeFloat(t[3]), pctImperv: safeFloat(t[4]), width: safeFloat(t[5]), slope: safeFloat(t[6])))
        m.infil.add(newInfil())
    of "INFILTRATION":
      if t.len >= 4:
        for i in 0 ..< m.subcatchments.len:
          if m.subcatchments[i].id == t[0]:
            m.infil[i] = Infil(maxRate: safeFloat(t[1]), minRate: safeFloat(t[2]), decay: safeFloat(t[3]),
              dryTime: (if t.len > 4: safeFloat(t[4]) else: 7.0), currentRate: safeFloat(t[1]))
            break
    of "JUNCTIONS":
      if t.len >= 2:
        let initD = if t.len > 3: safeFloat(t[3]) else: 0.0
        var n = Node(id: t[0], nodeType: "JUNCTION", invertElev: safeFloat(t[1]),
          maxDepth: (if t.len > 2: safeFloat(t[2]) else: 0.0), initDepth: initD,
          surDepth: (if t.len > 4: safeFloat(t[4]) else: 0.0),
          aPonded: (if t.len > 5: safeFloat(t[5]) else: 0.0),
          depth: initD, head: safeFloat(t[1]) + initD)
        m.nodeMap[n.id] = m.nodes.len
        m.nodes.add(n)
    of "OUTFALLS":
      if t.len >= 3:
        let elev = safeFloat(t[1])
        var n = Node(id: t[0], nodeType: "OUTFALL", invertElev: elev, head: elev)
        m.nodeMap[n.id] = m.nodes.len
        m.nodes.add(n)
    of "CONDUITS":
      if t.len >= 6:
        m.links.add(Link(id: t[0], fromNode: t[1], toNode: t[2], length: safeFloat(t[3]),
          roughness: safeFloat(t[4]), inOffset: safeFloat(t[5]),
          outOffset: (if t.len > 6: safeFloat(t[6]) else: 0.0)))
    of "XSECTIONS":
      if t.len >= 3:
        let g1 = safeFloat(t[2], 1.0)
        let g2 = if t.len > 3: safeFloat(t[3]) else: 0.0
        let tp = t[1].toUpper()
        var af, rf: float
        if tp == "CIRCULAR":
          af = PI * pow(g1 / 2, 2); rf = g1 / 4
        else:
          let w = if g2 > 0: g2 else: g1
          af = g1 * w; let p = 2 * g1 + 2 * w
          rf = if p > 0: af / p else: 0.0
        for i in 0 ..< m.links.len:
          if m.links[i].id == t[0]:
            m.links[i].fullDepth = g1; m.links[i].fullArea = af; break
        m.xsects.add(Xsect(id: t[0], xtype: tp, geom1: g1, geom2: g2, aFull: af, rFull: rf))
    of "TIMESERIES":
      if t.len >= 3:
        if t[0] notin m.timeseries:
          m.timeseries[t[0]] = TS(id: t[0])
        var k = 1
        while k + 1 < t.len:
          var tv = safeFloat(t[k], -999)
          if tv == -999:
            let p = t[k].split(':')
            tv = safeFloat(p[0]) + (if p.len > 1: safeFloat(p[1]) / 60 else: 0.0)
          m.timeseries[t[0]].times.add(tv)
          m.timeseries[t[0]].values.add(safeFloat(t[k + 1]))
          k += 2
    else: discard
  m.options.totalDuration = parseDuration(m.options.startDate, m.options.endDate)
  return m

proc getRainfall(m: Model, gageId: string, elapsed: float): float =
  for g in m.gages:
    if g.id == gageId:
      if g.sourceName notin m.timeseries: return 0
      let ts = m.timeseries[g.sourceName]
      let tHr = elapsed / 3600
      for i in countdown(ts.times.len - 1, 0):
        if tHr >= ts.times[i]: return ts.values[i]
      return 0
  return 0

proc hortonInfil(inf: var Infil, rainfall, dt: float): float =
  if rainfall <= 0:
    let rec = if inf.dryTime > 0: dt / (inf.dryTime * 86400) else: 0.0
    inf.currentRate += (inf.maxRate - inf.currentRate) * rec
    return 0
  let rate = min(inf.currentRate, rainfall)
  inf.currentRate = inf.minRate + (inf.currentRate - inf.minRate) * exp(-inf.decay * dt / 3600)
  inf.cumulInfil += rate * dt / 3600
  return rate

proc xsectArea(xs: Xsect, depth: float): float =
  if depth <= 0: return 0
  if xs.xtype == "CIRCULAR":
    if depth >= xs.geom1: return xs.aFull
    let r = xs.geom1 / 2; let y = depth - r
    if abs(r) < 1e-10: return 0
    let arg = clamp(-y / r, -1.0, 1.0)
    let theta = 2 * arccos(arg)
    return r * r * (theta - sin(theta)) / 2
  let w = if xs.geom2 > 0: xs.geom2 else: xs.geom1
  return depth * w

proc xsectHrad(xs: Xsect, depth: float): float =
  let area = xsectArea(xs, depth)
  if area <= 0: return 0
  if xs.xtype == "CIRCULAR":
    let r = xs.geom1 / 2; let y = depth - r
    if abs(r) < 1e-10: return 0
    let arg = clamp(-y / r, -1.0, 1.0)
    let theta = 2 * arccos(arg); let perim = r * theta
    return if perim > 0: area / perim else: 0
  let w = if xs.geom2 > 0: xs.geom2 else: xs.geom1
  let perim = w + 2 * depth
  return if perim > 0: area / perim else: 0

proc findXsect(m: Model, linkId: string): int =
  for i in 0 ..< m.xsects.len:
    if m.xsects[i].id == linkId: return i
  return -1

proc simulate(m: var Model): (int, float) =
  let dt = m.options.routingStep; let total = m.options.totalDuration
  var elapsed = 0.0; var steps = 0
  while elapsed < total:
    for i in 0 ..< m.subcatchments.len:
      let rain = getRainfall(m, m.subcatchments[i].rainGage, elapsed)
      m.subcatchments[i].rainfall = rain
      m.subcatchments[i].totalPrecip += rain * dt / 3600
      let infilRate = hortonInfil(m.infil[i], rain * (1 - m.subcatchments[i].pctImperv / 100), dt)
      m.subcatchments[i].totalInfil += infilRate * dt / 3600
      let runoffIn = rain * m.subcatchments[i].area * 43560 / 12 / 3600
      let infilVol = infilRate * m.subcatchments[i].area * (1 - m.subcatchments[i].pctImperv / 100) * 43560 / 12 / 3600
      m.subcatchments[i].runoff = max(0.0, runoffIn - infilVol)
      m.subcatchments[i].totalRunoff += m.subcatchments[i].runoff * dt
      m.subcatchments[i].peakRunoff = max(m.subcatchments[i].peakRunoff, m.subcatchments[i].runoff)
      if m.subcatchments[i].outlet in m.nodeMap:
        let ni = m.nodeMap[m.subcatchments[i].outlet]
        m.nodes[ni].lateralInflow += m.subcatchments[i].runoff
    for i in 0 ..< m.nodes.len: m.nodes[i].inflow = m.nodes[i].lateralInflow
    for li in 0 ..< m.links.len:
      if m.links[li].fromNode notin m.nodeMap or m.links[li].toNode notin m.nodeMap: continue
      let fi = m.nodeMap[m.links[li].fromNode]; let ti = m.nodeMap[m.links[li].toNode]
      let xi = findXsect(m, m.links[li].id)
      if xi < 0: continue
      let xs = m.xsects[xi]
      let slope = if m.links[li].length > 0: (m.nodes[fi].head - m.nodes[ti].head) / m.links[li].length else: 0.0
      var avgDepth = (m.nodes[fi].depth + m.nodes[ti].depth) / 2
      avgDepth = clamp(avgDepth, 0.0, xs.geom1)
      let area = xsectArea(xs, avgDepth); let hrad = xsectHrad(xs, avgDepth)
      var manningQ = 0.0
      if area > 0 and hrad > 0 and abs(slope) > 1e-12:
        let sign = if slope > 0: 1.0 else: -1.0
        manningQ = sign * (1.49 / m.links[li].roughness) * area * pow(hrad, 2.0 / 3.0) * sqrt(abs(slope))
      m.links[li].flow = m.links[li].flow * 0.5 + manningQ * 0.5
      if xs.aFull > 0:
        let sl = max(abs(slope), 0.001)
        let qFull = (1.49 / m.links[li].roughness) * xs.aFull * pow(xs.rFull, 2.0 / 3.0) * sqrt(sl)
        if abs(m.links[li].flow) > qFull * 1.5:
          m.links[li].flow = (if m.links[li].flow > 0: 1.0 else: -1.0) * qFull * 1.5
      m.links[li].depth = avgDepth
      m.links[li].velocity = if area > 0: abs(m.links[li].flow) / area else: 0
      m.links[li].volume = area * m.links[li].length
      if abs(m.links[li].flow) > m.links[li].peakFlow:
        m.links[li].peakFlow = abs(m.links[li].flow); m.links[li].timePeakFlow = elapsed
      m.links[li].peakVelocity = max(m.links[li].peakVelocity, m.links[li].velocity)
      if xs.geom1 > 0: m.links[li].maxDepthFrac = max(m.links[li].maxDepthFrac, avgDepth / xs.geom1)
      if m.links[li].flow > 0:
        m.nodes[fi].outflow += m.links[li].flow
        m.nodes[ti].inflow += m.links[li].flow
    for i in 0 ..< m.nodes.len:
      if m.nodes[i].nodeType == "OUTFALL": continue
      let sa = if m.nodes[i].aPonded > 0: m.nodes[i].aPonded else: m.options.minSurfArea
      let net = m.nodes[i].inflow - m.nodes[i].outflow + m.nodes[i].lateralInflow
      m.nodes[i].depth += net * dt / sa
      m.nodes[i].depth = max(0.0, m.nodes[i].depth)
      if m.nodes[i].maxDepth > 0 and m.nodes[i].depth > m.nodes[i].maxDepth + m.nodes[i].surDepth:
        m.nodes[i].overflow = m.nodes[i].depth - m.nodes[i].maxDepth
        m.nodes[i].floodVolume += m.nodes[i].overflow * dt
        m.nodes[i].depth = m.nodes[i].maxDepth
      m.nodes[i].head = m.nodes[i].invertElev + m.nodes[i].depth
      m.nodes[i].volume = m.nodes[i].depth * sa
      m.nodes[i].peakDepth = max(m.nodes[i].peakDepth, m.nodes[i].depth)
      m.nodes[i].peakHgl = max(m.nodes[i].peakHgl, m.nodes[i].head)
      m.nodes[i].totalInflow += m.nodes[i].inflow * dt
      m.nodes[i].totalOutflow += m.nodes[i].outflow * dt
      m.nodes[i].lateralInflow = 0; m.nodes[i].inflow = 0; m.nodes[i].outflow = 0; m.nodes[i].overflow = 0
    elapsed += dt; steps += 1
  return (steps, elapsed)

proc fmtPeakTime(secs: float): string =
  if secs <= 0: return "0  00:00"
  let days = int(secs / 86400); let rem = secs - float(days) * 86400
  let hrs = int(rem / 3600); let mins = int((rem - float(hrs) * 3600) / 60)
  fmt"{days}  {hrs:02}:{mins:02}"

proc generateRpt(m: Model, steps: int, wallMs: float): string =
  var lines: seq[string]
  lines.add("  EPA STORM WATER MANAGEMENT MODEL -- NIM ENGINE")
  lines.add("  SWMM5-Nim v1.0 -- SWMM5 Rosetta Stone Project")
  lines.add("  " & "=".repeat(60))
  lines.add(""); lines.add("  ****************"); lines.add("  Analysis Options"); lines.add("  ****************")
  lines.add(fmt"  Flow Units ............... {m.options.flowUnits}")
  lines.add(fmt"  Flow Routing Method ...... {m.options.flowRouting}")
  lines.add(fmt"  Infiltration Method ...... {m.options.infiltration}")
  lines.add(fmt"  Starting Date ............ {m.options.startDate}")
  lines.add(fmt"  Ending Date .............. {m.options.endDate}")
  lines.add(fmt"  Routing Time Step ........ {m.options.routingStep:.2f} sec")
  lines.add(""); lines.add("  ******************"); lines.add("  Node Depth Summary"); lines.add("  ******************")
  lines.add(""); lines.add("  " & "-".repeat(95))
  for n in m.nodes:
    lines.add(fmt"  {n.id:<30} {n.peakDepth * 0.4:10.3f} {n.peakDepth:10.3f} {n.peakHgl:12.3f}")
  lines.add(""); lines.add("  *************************"); lines.add("  Conduit Flow Summary"); lines.add("  *************************")
  lines.add(""); lines.add("  " & "-".repeat(95))
  for lk in m.links:
    let xi = findXsect(m, lk.id)
    var fullQ = 1.0
    if xi >= 0:
      let xs = m.xsects[xi]
      if xs.aFull > 0 and xs.rFull > 0: fullQ = (1.49 / lk.roughness) * xs.aFull * pow(xs.rFull, 2.0 / 3.0) * sqrt(0.01)
    let mff = if fullQ > 0: lk.peakFlow / fullQ else: 0.0
    let pt = fmtPeakTime(lk.timePeakFlow)
    lines.add(fmt"  {lk.id:<30} {lk.peakFlow:10.3f} {pt:>12} {lk.peakVelocity:10.3f} {mff:8.2f} {lk.maxDepthFrac:8.2f}")
  lines.add(""); lines.add("  *********************"); lines.add("  Simulation Summary"); lines.add("  *********************"); lines.add("")
  lines.add("  Engine ................... SWMM5-Nim v1.0")
  lines.add(fmt"  Total Steps .............. {steps}")
  lines.add(fmt"  Simulation Duration ...... {m.options.totalDuration:.1f} seconds ({m.options.totalDuration / 3600:.2f} hours)")
  lines.add(fmt"  Wall-Clock Time .......... {wallMs:.1f} ms")
  lines.add(fmt"  Nodes .................... {m.nodes.len}")
  lines.add(fmt"  Links .................... {m.links.len}")
  lines.add(fmt"  Subcatchments ............ {m.subcatchments.len}")
  lines.add("")
  return lines.join("\n")

proc escapeJson(s: string): string =
  result = s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")

proc main() =
  let port = Port(parseInt(getEnv("NIM_ENGINE_PORT", "3014")))
  var server = newSocket()
  server.setSockOpt(OptReuseAddr, true)
  server.bindAddr(port)
  server.listen()
  echo fmt"SWMM5-Nim engine listening on port {port.int}"
  while true:
    var client: Socket
    var address: string
    server.acceptAddr(client, address)
    try:
      var buf = ""
      var headerEnd = -1
      while true:
        var chunk = ""
        let n = client.recv(chunk, 65536)
        if n <= 0: break
        buf.add(chunk)
        let pos = buf.find("\r\n\r\n")
        if pos >= 0:
          headerEnd = pos + 4
          let clIdx = buf.toLower().find("content-length:")
          if clIdx >= 0:
            let rest = buf[clIdx + 15 ..< buf.len].strip()
            var clStr = ""
            for c in rest:
              if c.isDigit: clStr.add(c) else: break
            let cl = parseInt(clStr)
            while buf.len - headerEnd < cl:
              let n2 = client.recv(chunk, 65536)
              if n2 <= 0: break
              buf.add(chunk)
          break
      if buf.startsWith("GET /health"):
        let json = """{"engine":"SWMM5-Nim","status":"ok","version":"v1.0","language":"Nim"}"""
        client.send("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " & $json.len & "\r\n\r\n" & json)
      elif buf.startsWith("POST /simulate"):
        let body = buf[headerEnd ..< buf.len]
        let t0 = cpuTime()
        var model = parseInp(body)
        let (steps, _) = simulate(model)
        let wallMs = (cpuTime() - t0) * 1000
        let rpt = generateRpt(model, steps, wallMs)
        let json = "{\"success\":true,\"rpt\":\"" & escapeJson(rpt) & "\"}"
        client.send("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " & $json.len & "\r\n\r\n" & json)
      else:
        client.send("HTTP/1.1 404 Not Found\r\n\r\n")
    except:
      stderr.writeLine("Error: " & getCurrentExceptionMsg())
    finally:
      client.close()

main()
