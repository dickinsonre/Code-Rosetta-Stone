import 'dart:io';
import 'dart:math';
import 'dart:convert';

const double PI = 3.14159265358979323846;

class Options {
  String flowUnits = "CFS", infiltration = "HORTON", flowRouting = "DYNWAVE";
  String startDate = "01/01/2024", endDate = "01/02/2024";
  double reportStep = 900, wetStep = 300, dryStep = 3600, routingStep = 30;
  double totalDuration = 86400, minSurfArea = 12.566;
}

class Gage { String id, format, sourceType, sourceName; double interval, scf;
  Gage(this.id, this.format, this.interval, this.scf, this.sourceType, this.sourceName); }

class Subcatch { String id, rainGage, outlet; double area, pctImperv, width, slope;
  double runoff = 0, rainfall = 0, totalPrecip = 0, totalRunoff = 0, totalInfil = 0, peakRunoff = 0;
  Subcatch(this.id, this.rainGage, this.outlet, this.area, this.pctImperv, this.width, this.slope); }

class Infil { double maxRate, minRate, decay, dryTime, currentRate, cumulInfil = 0;
  Infil([this.maxRate = 3, this.minRate = 0.5, this.decay = 4, this.dryTime = 7, this.currentRate = 3]); }

class Node { String id, type; double invertElev, maxDepth, initDepth, surDepth, aPonded;
  double depth, head, volume = 0, inflow = 0, outflow = 0, overflow = 0, lateralInflow = 0;
  double peakDepth = 0, peakHgl = 0, timePeakDepth = 0, totalInflow = 0, totalOutflow = 0, floodVolume = 0;
  Node(this.id, this.type, this.invertElev, {this.maxDepth = 0, this.initDepth = 0,
    this.surDepth = 0, this.aPonded = 0, double? depth, double? head})
    : depth = depth ?? initDepth, head = head ?? (invertElev + (depth ?? initDepth)); }

class Link { String id, fromNode, toNode; double length, roughness, inOffset, outOffset;
  double flow = 0, depth = 0, velocity = 0, volume = 0, peakFlow = 0, peakVelocity = 0;
  double timePeakFlow = 0, maxDepthFrac = 0, fullDepth = 0, fullArea = 0;
  Link(this.id, this.fromNode, this.toNode, this.length, this.roughness, this.inOffset, this.outOffset); }

class Xsect { String id, xtype; double geom1, geom2, aFull, rFull;
  Xsect(this.id, this.xtype, this.geom1, this.geom2, this.aFull, this.rFull); }

class TS { String id; List<double> times = [], values = []; TS(this.id); }

class Model {
  Options options = Options();
  List<Gage> gages = []; List<Subcatch> subcatchments = []; List<Infil> infil = [];
  List<Node> nodes = []; List<Link> links = []; List<Xsect> xsects = [];
  Map<String, TS> timeseries = {}; Map<String, int> nodeMap = {}; String title = "";
}

double parseTimeStr(String s) {
  s = s.trim();
  var parts = s.split(':');
  if (parts.length >= 2) {
    var h = double.tryParse(parts[0]) ?? 0;
    var m = double.tryParse(parts[1]) ?? 0;
    var sec = parts.length > 2 ? (double.tryParse(parts[2]) ?? 0) : 0.0;
    return h * 3600 + m * 60 + sec;
  }
  return double.tryParse(s) ?? 0;
}

double parseDuration(String start, String end) {
  try {
    var sp = start.split('/'), ep = end.split('/');
    if (sp.length < 3 || ep.length < 3) return 86400;
    var d1 = DateTime(int.parse(sp[2]), int.parse(sp[0]), int.parse(sp[1]));
    var d2 = DateTime(int.parse(ep[2]), int.parse(ep[0]), int.parse(ep[1]));
    var diff = d2.difference(d1).inSeconds.toDouble();
    return diff > 0 ? diff : 86400;
  } catch (_) { return 86400; }
}

double _d(String? s, [double def = 0]) => double.tryParse(s ?? '') ?? def;

Model parseInp(String text) {
  var m = Model(); var section = '';
  for (var line in text.split('\n')) {
    var l = line.trim();
    if (l.isEmpty || l.startsWith(';')) continue;
    if (l.startsWith('[')) { section = l.replaceAll(RegExp(r'[\[\]]'), '').toUpperCase(); continue; }
    var t = l.split(RegExp(r'\s+')); if (t.isEmpty) continue;
    switch (section) {
      case 'TITLE': m.title = l; break;
      case 'OPTIONS': if (t.length >= 2) switch (t[0].toUpperCase()) {
        case 'FLOW_UNITS': m.options.flowUnits = t[1]; break;
        case 'INFILTRATION': m.options.infiltration = t[1]; break;
        case 'FLOW_ROUTING': m.options.flowRouting = t[1]; break;
        case 'START_DATE': m.options.startDate = t[1]; break;
        case 'END_DATE': m.options.endDate = t[1]; break;
        case 'REPORT_STEP': m.options.reportStep = parseTimeStr(t[1]); break;
        case 'WET_STEP': m.options.wetStep = parseTimeStr(t[1]); break;
        case 'DRY_STEP': m.options.dryStep = parseTimeStr(t[1]); break;
        case 'ROUTING_STEP': m.options.routingStep = parseTimeStr(t[1]); break;
      } break;
      case 'RAINGAGES': if (t.length >= 6) m.gages.add(Gage(t[0], t[1], parseTimeStr(t[2]) / 60, _d(t[3]), t[4], t[5])); break;
      case 'SUBCATCHMENTS': if (t.length >= 7) {
        m.subcatchments.add(Subcatch(t[0], t[1], t[2], _d(t[3]), _d(t[4]), _d(t[5]), _d(t[6])));
        m.infil.add(Infil());
      } break;
      case 'INFILTRATION': if (t.length >= 4) {
        var idx = m.subcatchments.indexWhere((s) => s.id == t[0]);
        if (idx >= 0) m.infil[idx] = Infil(_d(t[1]), _d(t[2]), _d(t[3]), t.length > 4 ? _d(t[4]) : 7, _d(t[1]));
      } break;
      case 'JUNCTIONS': if (t.length >= 2) {
        var initD = t.length > 3 ? _d(t[3]) : 0.0;
        var n = Node(t[0], 'JUNCTION', _d(t[1]), maxDepth: t.length > 2 ? _d(t[2]) : 0, initDepth: initD,
          surDepth: t.length > 4 ? _d(t[4]) : 0, aPonded: t.length > 5 ? _d(t[5]) : 0, depth: initD, head: _d(t[1]) + initD);
        m.nodeMap[n.id] = m.nodes.length; m.nodes.add(n);
      } break;
      case 'OUTFALLS': if (t.length >= 3) {
        var n = Node(t[0], 'OUTFALL', _d(t[1]), head: _d(t[1]));
        m.nodeMap[n.id] = m.nodes.length; m.nodes.add(n);
      } break;
      case 'CONDUITS': if (t.length >= 6) m.links.add(Link(t[0], t[1], t[2], _d(t[3]), _d(t[4]), _d(t[5]), t.length > 6 ? _d(t[6]) : 0)); break;
      case 'XSECTIONS': if (t.length >= 3) {
        var g1 = _d(t[2], 1), g2 = t.length > 3 ? _d(t[3]) : 0.0, tp = t[1].toUpperCase();
        double af, rf;
        if (tp == 'CIRCULAR') { af = PI * pow(g1 / 2, 2); rf = g1 / 4; }
        else { var w = g2 > 0 ? g2 : g1; af = g1 * w; var p = 2 * g1 + 2 * w; rf = p > 0 ? af / p : 0; }
        for (var lk in m.links) { if (lk.id == t[0]) { lk.fullDepth = g1; lk.fullArea = af; break; } }
        m.xsects.add(Xsect(t[0], tp, g1, g2, af, rf));
      } break;
      case 'TIMESERIES': if (t.length >= 3) {
        var ts = m.timeseries.putIfAbsent(t[0], () => TS(t[0]))!;
        var k = 1;
        while (k + 1 < t.length) {
          var tv = double.tryParse(t[k]);
          if (tv == null) { var p = t[k].split(':'); tv = (_d(p[0])) + (p.length > 1 ? _d(p[1]) / 60 : 0); }
          ts.times.add(tv); ts.values.add(_d(t[k + 1])); k += 2;
        }
      } break;
    }
  }
  m.options.totalDuration = parseDuration(m.options.startDate, m.options.endDate);
  return m;
}

double getRainfall(Model m, String gageId, double elapsed) {
  for (var g in m.gages) {
    if (g.id == gageId) {
      var ts = m.timeseries[g.sourceName]; if (ts == null || ts.times.isEmpty) return 0;
      var tHr = elapsed / 3600;
      for (var i = ts.times.length - 1; i >= 0; i--) { if (tHr >= ts.times[i]) return ts.values[i]; }
      return 0;
    }
  }
  return 0;
}

double hortonInfil(Infil inf, double rainfall, double dt) {
  if (rainfall <= 0) {
    var rec = inf.dryTime > 0 ? dt / (inf.dryTime * 86400) : 0.0;
    inf.currentRate += (inf.maxRate - inf.currentRate) * rec; return 0;
  }
  var rate = min(inf.currentRate, rainfall);
  inf.currentRate = inf.minRate + (inf.currentRate - inf.minRate) * exp(-inf.decay * dt / 3600);
  inf.cumulInfil += rate * dt / 3600; return rate;
}

double xsectArea(Xsect xs, double depth) {
  if (depth <= 0) return 0;
  if (xs.xtype == 'CIRCULAR') {
    if (depth >= xs.geom1) return xs.aFull;
    var r = xs.geom1 / 2, y = depth - r; if (r.abs() < 1e-10) return 0;
    var arg = (-y / r).clamp(-1.0, 1.0); var theta = 2 * acos(arg); return r * r * (theta - sin(theta)) / 2;
  }
  var w = xs.geom2 > 0 ? xs.geom2 : xs.geom1; return depth * w;
}

double xsectHrad(Xsect xs, double depth) {
  var area = xsectArea(xs, depth); if (area <= 0) return 0;
  if (xs.xtype == 'CIRCULAR') {
    var r = xs.geom1 / 2, y = depth - r; if (r.abs() < 1e-10) return 0;
    var arg = (-y / r).clamp(-1.0, 1.0); var theta = 2 * acos(arg); var perim = r * theta; return perim > 0 ? area / perim : 0;
  }
  var w = xs.geom2 > 0 ? xs.geom2 : xs.geom1; var perim = w + 2 * depth; return perim > 0 ? area / perim : 0;
}

Xsect? findXsect(Model m, String linkId) { for (var xs in m.xsects) { if (xs.id == linkId) return xs; } return null; }

List<int> simulate(Model m) {
  var dt = m.options.routingStep, total = m.options.totalDuration;
  var elapsed = 0.0; var steps = 0;
  while (elapsed < total) {
    for (var i = 0; i < m.subcatchments.length; i++) {
      var sc = m.subcatchments[i]; var rain = getRainfall(m, sc.rainGage, elapsed);
      sc.rainfall = rain; sc.totalPrecip += rain * dt / 3600;
      var infilRate = hortonInfil(m.infil[i], rain * (1 - sc.pctImperv / 100), dt);
      sc.totalInfil += infilRate * dt / 3600;
      var runoffIn = rain * sc.area * 43560 / 12 / 3600;
      var infilVol = infilRate * sc.area * (1 - sc.pctImperv / 100) * 43560 / 12 / 3600;
      sc.runoff = max(0.0, runoffIn - infilVol); sc.totalRunoff += sc.runoff * dt;
      sc.peakRunoff = max(sc.peakRunoff, sc.runoff);
      var ni = m.nodeMap[sc.outlet]; if (ni != null) m.nodes[ni].lateralInflow += sc.runoff;
    }
    for (var n in m.nodes) n.inflow = n.lateralInflow;
    for (var lk in m.links) {
      var fi = m.nodeMap[lk.fromNode], ti = m.nodeMap[lk.toNode];
      if (fi == null || ti == null) continue;
      var xs = findXsect(m, lk.id); if (xs == null) continue;
      var n1 = m.nodes[fi], n2 = m.nodes[ti];
      var slope = lk.length > 0 ? (n1.head - n2.head) / lk.length : 0.0;
      var avgDepth = ((n1.depth + n2.depth) / 2).clamp(0.0, xs.geom1);
      var area = xsectArea(xs, avgDepth), hrad = xsectHrad(xs, avgDepth);
      var manningQ = 0.0;
      if (area > 0 && hrad > 0 && slope.abs() > 1e-12) {
        var sign = slope > 0 ? 1.0 : -1.0;
        manningQ = sign * (1.49 / lk.roughness) * area * pow(hrad, 2.0 / 3.0) * sqrt(slope.abs());
      }
      lk.flow = lk.flow * 0.5 + manningQ * 0.5;
      if (xs.aFull > 0) {
        var sl = max(slope.abs(), 0.001);
        var qFull = (1.49 / lk.roughness) * xs.aFull * pow(xs.rFull, 2.0 / 3.0) * sqrt(sl);
        if (lk.flow.abs() > qFull * 1.5) lk.flow = (lk.flow > 0 ? 1.0 : -1.0) * qFull * 1.5;
      }
      lk.depth = avgDepth; lk.velocity = area > 0 ? lk.flow.abs() / area : 0;
      lk.volume = area * lk.length;
      if (lk.flow.abs() > lk.peakFlow) { lk.peakFlow = lk.flow.abs(); lk.timePeakFlow = elapsed; }
      lk.peakVelocity = max(lk.peakVelocity, lk.velocity);
      if (xs.geom1 > 0) lk.maxDepthFrac = max(lk.maxDepthFrac, avgDepth / xs.geom1);
      if (lk.flow > 0) { n1.outflow += lk.flow; n2.inflow += lk.flow; }
    }
    for (var n in m.nodes) {
      if (n.type == 'OUTFALL') continue;
      var sa = n.aPonded > 0 ? n.aPonded : m.options.minSurfArea;
      var net = n.inflow - n.outflow + n.lateralInflow;
      n.depth += net * dt / sa; n.depth = max(0.0, n.depth);
      if (n.maxDepth > 0 && n.depth > n.maxDepth + n.surDepth) {
        n.overflow = n.depth - n.maxDepth; n.floodVolume += n.overflow * dt; n.depth = n.maxDepth;
      }
      n.head = n.invertElev + n.depth; n.volume = n.depth * sa;
      n.peakDepth = max(n.peakDepth, n.depth); n.peakHgl = max(n.peakHgl, n.head);
      n.totalInflow += n.inflow * dt; n.totalOutflow += n.outflow * dt;
      n.lateralInflow = 0; n.inflow = 0; n.outflow = 0; n.overflow = 0;
    }
    elapsed += dt; steps++;
  }
  return [steps, elapsed.toInt()];
}

String fmtPeakTime(double secs) {
  if (secs <= 0) return '0  00:00';
  var days = (secs / 86400).floor(), rem = secs - days * 86400;
  var hrs = (rem / 3600).floor(), mins = ((rem - hrs * 3600) / 60).floor();
  return '$days  ${hrs.toString().padLeft(2, '0')}:${mins.toString().padLeft(2, '0')}';
}

String generateRpt(Model m, int steps, double wallMs) {
  var sb = StringBuffer();
  sb.writeln('  EPA STORM WATER MANAGEMENT MODEL -- DART ENGINE');
  sb.writeln('  SWMM5-Dart v1.0 -- SWMM5 Rosetta Stone Project');
  sb.writeln('  ${'=' * 60}'); sb.writeln();
  sb.writeln('  ****************'); sb.writeln('  Analysis Options'); sb.writeln('  ****************');
  sb.writeln('  Flow Units ............... ${m.options.flowUnits}');
  sb.writeln('  Flow Routing Method ...... ${m.options.flowRouting}');
  sb.writeln('  Infiltration Method ...... ${m.options.infiltration}');
  sb.writeln('  Starting Date ............ ${m.options.startDate}');
  sb.writeln('  Ending Date .............. ${m.options.endDate}');
  sb.writeln('  Routing Time Step ........ ${m.options.routingStep.toStringAsFixed(2)} sec');
  sb.writeln(); sb.writeln('  ******************'); sb.writeln('  Node Depth Summary'); sb.writeln('  ******************');
  sb.writeln(); sb.writeln('  ${'-' * 95}');
  for (var n in m.nodes) sb.writeln('  ${n.id.padRight(30)} ${(n.peakDepth * 0.4).toStringAsFixed(3).padLeft(10)} ${n.peakDepth.toStringAsFixed(3).padLeft(10)} ${n.peakHgl.toStringAsFixed(3).padLeft(12)}');
  sb.writeln(); sb.writeln('  *************************'); sb.writeln('  Conduit Flow Summary'); sb.writeln('  *************************');
  sb.writeln(); sb.writeln('  ${'-' * 95}');
  for (var lk in m.links) {
    var xs = findXsect(m, lk.id); var fullQ = 1.0;
    if (xs != null && xs.aFull > 0 && xs.rFull > 0) fullQ = (1.49 / lk.roughness) * xs.aFull * pow(xs.rFull, 2.0 / 3.0) * sqrt(0.01);
    var mff = fullQ > 0 ? lk.peakFlow / fullQ : 0.0;
    sb.writeln('  ${lk.id.padRight(30)} ${lk.peakFlow.toStringAsFixed(3).padLeft(10)} ${fmtPeakTime(lk.timePeakFlow).padLeft(12)} ${lk.peakVelocity.toStringAsFixed(3).padLeft(10)} ${mff.toStringAsFixed(2).padLeft(8)} ${lk.maxDepthFrac.toStringAsFixed(2).padLeft(8)}');
  }
  sb.writeln(); sb.writeln('  *********************'); sb.writeln('  Simulation Summary'); sb.writeln('  *********************');
  sb.writeln(); sb.writeln('  Engine ................... SWMM5-Dart v1.0');
  sb.writeln('  Total Steps .............. $steps');
  sb.writeln('  Simulation Duration ...... ${m.options.totalDuration.toStringAsFixed(1)} seconds (${(m.options.totalDuration / 3600).toStringAsFixed(2)} hours)');
  sb.writeln('  Wall-Clock Time .......... ${wallMs.toStringAsFixed(1)} ms');
  sb.writeln('  Nodes .................... ${m.nodes.length}');
  sb.writeln('  Links .................... ${m.links.length}');
  sb.writeln('  Subcatchments ............ ${m.subcatchments.length}');
  return sb.toString();
}

String escapeJson(String s) => s.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n').replaceAll('\r', '\\r').replaceAll('\t', '\\t');

void main() async {
  var port = int.tryParse(Platform.environment['DART_ENGINE_PORT'] ?? '') ?? 3016;
  var server = await ServerSocket.bind('127.0.0.1', port);
  print('SWMM5-Dart engine listening on port $port');
  await for (var sock in server) {
    try {
      var data = <int>[];
      await for (var chunk in sock) {
        data.addAll(chunk);
        var s = utf8.decode(data, allowMalformed: true);
        if (s.contains('\r\n\r\n')) {
          var headerEnd = s.indexOf('\r\n\r\n') + 4;
          var clMatch = RegExp(r'Content-Length:\s*(\d+)', caseSensitive: false).firstMatch(s);
          if (clMatch != null) {
            var cl = int.parse(clMatch.group(1)!);
            if (data.length - headerEnd >= cl) break;
          } else break;
        }
      }
      var req = utf8.decode(data, allowMalformed: true);
      String resp;
      if (req.startsWith('GET /health')) {
        var json = '{"engine":"SWMM5-Dart","status":"ok","version":"v1.0","language":"Dart"}';
        resp = 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n$json';
      } else if (req.startsWith('POST /simulate')) {
        var headerEnd = req.indexOf('\r\n\r\n') + 4;
        var body = req.substring(headerEnd);
        var sw = Stopwatch()..start();
        var model = parseInp(body);
        var result = simulate(model);
        sw.stop();
        var rpt = generateRpt(model, result[0], sw.elapsedMicroseconds / 1000.0);
        var json = '{"success":true,"rpt":"${escapeJson(rpt)}"}';
        resp = 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${utf8.encode(json).length}\r\n\r\n$json';
      } else {
        resp = 'HTTP/1.1 404 Not Found\r\n\r\n';
      }
      sock.write(resp); await sock.flush(); await sock.close();
    } catch (e) { stderr.writeln('Error: $e'); try { await sock.close(); } catch(_) {} }
  }
}
