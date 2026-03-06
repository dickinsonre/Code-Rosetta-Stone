import java.io.*
import java.net.ServerSocket
import java.net.Socket
import kotlin.math.*

val PI = 3.14159265358979323846

data class Options(var flowUnits: String = "CFS", var infiltration: String = "HORTON",
    var flowRouting: String = "DYNWAVE", var startDate: String = "01/01/2024",
    var endDate: String = "01/02/2024", var reportStep: Double = 900.0,
    var wetStep: Double = 300.0, var dryStep: Double = 3600.0,
    var routingStep: Double = 30.0, var totalDuration: Double = 86400.0,
    var minSurfArea: Double = 12.566)

data class Gage(val id: String, val format: String, val interval: Double, val scf: Double,
    val sourceType: String, val sourceName: String)

data class Subcatch(val id: String, val rainGage: String, val outlet: String,
    val area: Double, val pctImperv: Double, val width: Double, val slope: Double,
    var runoff: Double = 0.0, var rainfall: Double = 0.0, var totalPrecip: Double = 0.0,
    var totalRunoff: Double = 0.0, var totalInfil: Double = 0.0, var peakRunoff: Double = 0.0)

data class Infil(var maxRate: Double = 3.0, var minRate: Double = 0.5, var decay: Double = 4.0,
    var dryTime: Double = 7.0, var currentRate: Double = 3.0, var cumulInfil: Double = 0.0)

data class Node(val id: String, val type: String, val invertElev: Double,
    var maxDepth: Double = 0.0, var initDepth: Double = 0.0, var surDepth: Double = 0.0,
    var aPonded: Double = 0.0, var depth: Double = 0.0, var head: Double = 0.0,
    var volume: Double = 0.0, var inflow: Double = 0.0, var outflow: Double = 0.0,
    var overflow: Double = 0.0, var lateralInflow: Double = 0.0,
    var peakDepth: Double = 0.0, var peakHgl: Double = 0.0, var timePeakDepth: Double = 0.0,
    var totalInflow: Double = 0.0, var totalOutflow: Double = 0.0, var floodVolume: Double = 0.0)

data class Link(val id: String, val fromNode: String, val toNode: String,
    val length: Double, val roughness: Double, val inOffset: Double, val outOffset: Double,
    var flow: Double = 0.0, var depth: Double = 0.0, var velocity: Double = 0.0,
    var volume: Double = 0.0, var peakFlow: Double = 0.0, var peakVelocity: Double = 0.0,
    var timePeakFlow: Double = 0.0, var maxDepthFrac: Double = 0.0,
    var fullDepth: Double = 0.0, var fullArea: Double = 0.0)

data class Xsect(val id: String, val xtype: String, val geom1: Double, val geom2: Double,
    val aFull: Double, val rFull: Double)

data class Timeseries(val id: String, val times: MutableList<Double> = mutableListOf(),
    val values: MutableList<Double> = mutableListOf())

data class Model(val options: Options = Options(),
    val gages: MutableList<Gage> = mutableListOf(),
    val subcatchments: MutableList<Subcatch> = mutableListOf(),
    val infil: MutableList<Infil> = mutableListOf(),
    val nodes: MutableList<Node> = mutableListOf(),
    val links: MutableList<Link> = mutableListOf(),
    val xsects: MutableList<Xsect> = mutableListOf(),
    val timeseries: MutableMap<String, Timeseries> = mutableMapOf(),
    val nodeMap: MutableMap<String, Int> = mutableMapOf(),
    var title: String = "")

fun parseTimeStr(s: String): Double {
    val parts = s.trim().split(":")
    if (parts.size >= 2) {
        val h = parts[0].toDoubleOrNull() ?: 0.0
        val m = parts[1].toDoubleOrNull() ?: 0.0
        val sec = if (parts.size > 2) parts[2].toDoubleOrNull() ?: 0.0 else 0.0
        return h * 3600 + m * 60 + sec
    }
    return s.trim().toDoubleOrNull() ?: 0.0
}

fun parseDuration(start: String, end: String): Double {
    try {
        val sp = start.split("/"); val ep = end.split("/")
        if (sp.size < 3 || ep.size < 3) return 86400.0
        val d1 = java.util.GregorianCalendar(sp[2].toInt(), sp[0].toInt() - 1, sp[1].toInt())
        val d2 = java.util.GregorianCalendar(ep[2].toInt(), ep[0].toInt() - 1, ep[1].toInt())
        val diff = (d2.timeInMillis - d1.timeInMillis) / 1000.0
        return if (diff > 0) diff else 86400.0
    } catch (e: Exception) { return 86400.0 }
}

fun parseInp(text: String): Model {
    val m = Model()
    var section = ""
    for (line in text.lines()) {
        val l = line.trim()
        if (l.isEmpty() || l.startsWith(";")) continue
        if (l.startsWith("[")) { section = l.replace("[", "").replace("]", "").uppercase(); continue }
        val t = l.split("\\s+".toRegex())
        if (t.isEmpty()) continue
        when (section) {
            "TITLE" -> m.title = l
            "OPTIONS" -> if (t.size >= 2) {
                when (t[0].uppercase()) {
                    "FLOW_UNITS" -> m.options.flowUnits = t[1]
                    "INFILTRATION" -> m.options.infiltration = t[1]
                    "FLOW_ROUTING" -> m.options.flowRouting = t[1]
                    "START_DATE" -> m.options.startDate = t[1]
                    "END_DATE" -> m.options.endDate = t[1]
                    "REPORT_STEP" -> m.options.reportStep = parseTimeStr(t[1])
                    "WET_STEP" -> m.options.wetStep = parseTimeStr(t[1])
                    "DRY_STEP" -> m.options.dryStep = parseTimeStr(t[1])
                    "ROUTING_STEP" -> m.options.routingStep = parseTimeStr(t[1])
                }
            }
            "RAINGAGES" -> if (t.size >= 6) m.gages.add(Gage(t[0], t[1], parseTimeStr(t[2]) / 60, t[3].toDouble(), t[4], t[5]))
            "SUBCATCHMENTS" -> if (t.size >= 7) {
                m.subcatchments.add(Subcatch(t[0], t[1], t[2], t[3].toDouble(), t[4].toDouble(), t[5].toDouble(), t[6].toDouble()))
                m.infil.add(Infil())
            }
            "INFILTRATION" -> if (t.size >= 4) {
                val idx = m.subcatchments.indexOfFirst { it.id == t[0] }
                if (idx >= 0) {
                    m.infil[idx] = Infil(t[1].toDouble(), t[2].toDouble(), t[3].toDouble(),
                        if (t.size > 4) t[4].toDouble() else 7.0, t[1].toDouble())
                }
            }
            "JUNCTIONS" -> if (t.size >= 2) {
                val initD = if (t.size > 3) t[3].toDoubleOrNull() ?: 0.0 else 0.0
                val n = Node(t[0], "JUNCTION", t[1].toDouble(),
                    if (t.size > 2) t[2].toDoubleOrNull() ?: 0.0 else 0.0, initD,
                    if (t.size > 4) t[4].toDoubleOrNull() ?: 0.0 else 0.0,
                    if (t.size > 5) t[5].toDoubleOrNull() ?: 0.0 else 0.0,
                    initD, t[1].toDouble() + initD)
                m.nodeMap[n.id] = m.nodes.size; m.nodes.add(n)
            }
            "OUTFALLS" -> if (t.size >= 3) {
                val n = Node(t[0], "OUTFALL", t[1].toDouble(), head = t[1].toDouble())
                m.nodeMap[n.id] = m.nodes.size; m.nodes.add(n)
            }
            "CONDUITS" -> if (t.size >= 6) {
                m.links.add(Link(t[0], t[1], t[2], t[3].toDouble(), t[4].toDouble(),
                    t[5].toDouble(), if (t.size > 6) t[6].toDoubleOrNull() ?: 0.0 else 0.0))
            }
            "XSECTIONS" -> if (t.size >= 3) {
                val g1 = t[2].toDoubleOrNull() ?: 1.0
                val g2 = if (t.size > 3) t[3].toDoubleOrNull() ?: 0.0 else 0.0
                val tp = t[1].uppercase()
                val af: Double; val rf: Double
                if (tp == "CIRCULAR") { af = PI * (g1 / 2).pow(2); rf = g1 / 4 }
                else { val w = if (g2 > 0) g2 else g1; af = g1 * w; val p = 2 * g1 + 2 * w; rf = if (p > 0) af / p else 0.0 }
                m.links.find { it.id == t[0] }?.let { it.fullDepth = g1; it.fullArea = af }
                m.xsects.add(Xsect(t[0], tp, g1, g2, af, rf))
            }
            "TIMESERIES" -> if (t.size >= 3) {
                val ts = m.timeseries.getOrPut(t[0]) { Timeseries(t[0]) }
                var k = 1
                while (k + 1 < t.size) {
                    var tv = t[k].toDoubleOrNull()
                    if (tv == null) { val p = t[k].split(":"); tv = if (p.size == 2) (p[0].toDoubleOrNull() ?: 0.0) + (p[1].toDoubleOrNull() ?: 0.0) / 60.0 else 0.0 }
                    ts.times.add(tv); ts.values.add(t[k + 1].toDoubleOrNull() ?: 0.0); k += 2
                }
            }
        }
    }
    m.options.totalDuration = parseDuration(m.options.startDate, m.options.endDate)
    return m
}

fun getRainfall(m: Model, gageId: String, elapsed: Double): Double {
    val g = m.gages.find { it.id == gageId } ?: return 0.0
    val ts = m.timeseries[g.sourceName] ?: return 0.0
    val tHr = elapsed / 3600.0
    for (i in ts.times.indices.reversed()) { if (tHr >= ts.times[i]) return ts.values[i] }
    return 0.0
}

fun hortonInfil(inf: Infil, rainfall: Double, dt: Double): Double {
    if (rainfall <= 0) {
        val rec = if (inf.dryTime > 0) dt / (inf.dryTime * 86400) else 0.0
        inf.currentRate += (inf.maxRate - inf.currentRate) * rec; return 0.0
    }
    val rate = minOf(inf.currentRate, rainfall)
    inf.currentRate = inf.minRate + (inf.currentRate - inf.minRate) * exp(-inf.decay * dt / 3600)
    inf.cumulInfil += rate * dt / 3600; return rate
}

fun xsectArea(xs: Xsect?, depth: Double): Double {
    if (xs == null || depth <= 0) return 0.0
    if (xs.xtype == "CIRCULAR") {
        if (depth >= xs.geom1) return xs.aFull
        val r = xs.geom1 / 2; val y = depth - r; if (abs(r) < 1e-10) return 0.0
        val arg = (-y / r).coerceIn(-1.0, 1.0)
        val theta = 2 * acos(arg); return r * r * (theta - sin(theta)) / 2
    }
    val w = if (xs.geom2 > 0) xs.geom2 else xs.geom1; return depth * w
}

fun xsectHrad(xs: Xsect?, depth: Double): Double {
    val area = xsectArea(xs, depth); if (area <= 0) return 0.0
    if (xs!!.xtype == "CIRCULAR") {
        val r = xs.geom1 / 2; val y = depth - r; if (abs(r) < 1e-10) return 0.0
        val arg = (-y / r).coerceIn(-1.0, 1.0)
        val theta = 2 * acos(arg); val perim = r * theta; return if (perim > 0) area / perim else 0.0
    }
    val w = if (xs.geom2 > 0) xs.geom2 else xs.geom1; val perim = w + 2 * depth
    return if (perim > 0) area / perim else 0.0
}

fun simulate(m: Model): Pair<Int, Double> {
    val dt = m.options.routingStep; val total = m.options.totalDuration
    var elapsed = 0.0; var steps = 0
    while (elapsed < total) {
        for (i in m.subcatchments.indices) {
            val sc = m.subcatchments[i]; val rain = getRainfall(m, sc.rainGage, elapsed)
            sc.rainfall = rain; sc.totalPrecip += rain * dt / 3600
            val infilRate = hortonInfil(m.infil[i], rain * (1 - sc.pctImperv / 100), dt)
            sc.totalInfil += infilRate * dt / 3600
            val runoffIn = rain * sc.area * 43560 / 12 / 3600
            val infilVol = infilRate * sc.area * (1 - sc.pctImperv / 100) * 43560 / 12 / 3600
            sc.runoff = maxOf(0.0, runoffIn - infilVol)
            sc.totalRunoff += sc.runoff * dt; sc.peakRunoff = maxOf(sc.peakRunoff, sc.runoff)
            m.nodeMap[sc.outlet]?.let { m.nodes[it].lateralInflow += sc.runoff }
        }
        for (n in m.nodes) n.inflow = n.lateralInflow
        for (lk in m.links) {
            val fi = m.nodeMap[lk.fromNode] ?: continue; val ti = m.nodeMap[lk.toNode] ?: continue
            val xs = m.xsects.find { it.id == lk.id } ?: continue
            val n1 = m.nodes[fi]; val n2 = m.nodes[ti]
            val slope = if (lk.length > 0) (n1.head - n2.head) / lk.length else 0.0
            var avgDepth = ((n1.depth + n2.depth) / 2).coerceIn(0.0, xs.geom1)
            val area = xsectArea(xs, avgDepth); val hrad = xsectHrad(xs, avgDepth)
            var manningQ = 0.0
            if (area > 0 && hrad > 0 && abs(slope) > 1e-12) {
                val sign = if (slope > 0) 1.0 else -1.0
                manningQ = sign * (1.49 / lk.roughness) * area * hrad.pow(2.0 / 3.0) * sqrt(abs(slope))
            }
            lk.flow = lk.flow * 0.5 + manningQ * 0.5
            if (xs.aFull > 0) {
                val sl = maxOf(abs(slope), 0.001)
                val qFull = (1.49 / lk.roughness) * xs.aFull * xs.rFull.pow(2.0 / 3.0) * sqrt(sl)
                if (abs(lk.flow) > qFull * 1.5) lk.flow = (if (lk.flow > 0) 1.0 else -1.0) * qFull * 1.5
            }
            lk.depth = avgDepth; lk.velocity = if (area > 0) abs(lk.flow) / area else 0.0
            lk.volume = area * lk.length
            if (abs(lk.flow) > lk.peakFlow) { lk.peakFlow = abs(lk.flow); lk.timePeakFlow = elapsed }
            lk.peakVelocity = maxOf(lk.peakVelocity, lk.velocity)
            if (xs.geom1 > 0) lk.maxDepthFrac = maxOf(lk.maxDepthFrac, avgDepth / xs.geom1)
            if (lk.flow > 0) { n1.outflow += lk.flow; n2.inflow += lk.flow }
        }
        for (n in m.nodes) {
            if (n.type == "OUTFALL") continue
            val sa = if (n.aPonded > 0) n.aPonded else m.options.minSurfArea
            val net = n.inflow - n.outflow + n.lateralInflow
            n.depth += net * dt / sa; n.depth = maxOf(0.0, n.depth)
            if (n.maxDepth > 0 && n.depth > n.maxDepth + n.surDepth) {
                n.overflow = n.depth - n.maxDepth; n.floodVolume += n.overflow * dt; n.depth = n.maxDepth
            }
            n.head = n.invertElev + n.depth; n.volume = n.depth * sa
            n.peakDepth = maxOf(n.peakDepth, n.depth); n.peakHgl = maxOf(n.peakHgl, n.head)
            n.totalInflow += n.inflow * dt; n.totalOutflow += n.outflow * dt
            n.lateralInflow = 0.0; n.inflow = 0.0; n.outflow = 0.0; n.overflow = 0.0
        }
        elapsed += dt; steps++
    }
    return Pair(steps, elapsed)
}

fun fmtPeakTime(secs: Double): String {
    if (secs <= 0) return "0  00:00"
    val days = (secs / 86400).toInt(); val rem = secs - days * 86400
    val hrs = (rem / 3600).toInt(); val mins = ((rem - hrs * 3600) / 60).toInt()
    return "%d  %02d:%02d".format(days, hrs, mins)
}

fun generateRpt(m: Model, steps: Int, wallMs: Double): String {
    val sb = StringBuilder()
    sb.appendLine("  EPA STORM WATER MANAGEMENT MODEL -- KOTLIN ENGINE")
    sb.appendLine("  SWMM5-Kotlin v1.0 -- SWMM5 Rosetta Stone Project")
    sb.appendLine("  ${"=".repeat(60)}")
    sb.appendLine(); sb.appendLine("  ****************"); sb.appendLine("  Analysis Options"); sb.appendLine("  ****************")
    sb.appendLine("  Flow Units ............... ${m.options.flowUnits}")
    sb.appendLine("  Flow Routing Method ...... ${m.options.flowRouting}")
    sb.appendLine("  Infiltration Method ...... ${m.options.infiltration}")
    sb.appendLine("  Starting Date ............ ${m.options.startDate}")
    sb.appendLine("  Ending Date .............. ${m.options.endDate}")
    sb.appendLine("  Routing Time Step ........ ${"%.2f".format(m.options.routingStep)} sec")
    sb.appendLine(); sb.appendLine("  ******************"); sb.appendLine("  Node Depth Summary"); sb.appendLine("  ******************")
    sb.appendLine(); sb.appendLine("  ${"-".repeat(95)}")
    for (n in m.nodes) sb.appendLine("  %-30s %10.3f %10.3f %12.3f".format(n.id, n.peakDepth * 0.4, n.peakDepth, n.peakHgl))
    sb.appendLine(); sb.appendLine("  *************************"); sb.appendLine("  Conduit Flow Summary"); sb.appendLine("  *************************")
    sb.appendLine(); sb.appendLine("  ${"-".repeat(95)}")
    for (lk in m.links) {
        val xs = m.xsects.find { it.id == lk.id }
        var fullQ = 1.0
        if (xs != null && xs.aFull > 0 && xs.rFull > 0) fullQ = (1.49 / lk.roughness) * xs.aFull * xs.rFull.pow(2.0 / 3.0) * sqrt(0.01)
        val mff = if (fullQ > 0) lk.peakFlow / fullQ else 0.0
        sb.appendLine("  %-30s %10.3f %12s %10.3f %8.2f %8.2f".format(lk.id, lk.peakFlow, fmtPeakTime(lk.timePeakFlow), lk.peakVelocity, mff, lk.maxDepthFrac))
    }
    sb.appendLine(); sb.appendLine("  *********************"); sb.appendLine("  Simulation Summary"); sb.appendLine("  *********************")
    sb.appendLine(); sb.appendLine("  Engine ................... SWMM5-Kotlin v1.0")
    sb.appendLine("  Total Steps .............. $steps")
    sb.appendLine("  Simulation Duration ...... ${"%.1f".format(m.options.totalDuration)} seconds (${"%.2f".format(m.options.totalDuration / 3600)} hours)")
    sb.appendLine("  Wall-Clock Time .......... ${"%.1f".format(wallMs)} ms")
    sb.appendLine("  Nodes .................... ${m.nodes.size}")
    sb.appendLine("  Links .................... ${m.links.size}")
    sb.appendLine("  Subcatchments ............ ${m.subcatchments.size}")
    return sb.toString()
}

fun escapeJson(s: String): String = s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")

fun handleClient(client: Socket) {
    try {
        val input = client.getInputStream(); val output = client.getOutputStream()
        val buf = ByteArray(2 * 1024 * 1024); var total = 0
        while (true) {
            val n = input.read(buf, total, buf.size - total); if (n <= 0) break; total += n
            val s = String(buf, 0, total)
            if (s.contains("\r\n\r\n")) {
                val headerEnd = s.indexOf("\r\n\r\n") + 4
                val clMatch = Regex("Content-Length:\\s*(\\d+)", RegexOption.IGNORE_CASE).find(s)
                if (clMatch != null) {
                    val cl = clMatch.groupValues[1].toInt()
                    while (total - headerEnd < cl) { val r = input.read(buf, total, buf.size - total); if (r <= 0) break; total += r }
                }
                break
            }
        }
        val req = String(buf, 0, total)
        val resp: String
        if (req.startsWith("GET /health")) {
            val json = """{"engine":"SWMM5-Kotlin","status":"ok","version":"v1.0","language":"Kotlin"}"""
            resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n$json"
        } else if (req.startsWith("POST /simulate")) {
            val headerEnd = req.indexOf("\r\n\r\n") + 4
            val body = req.substring(headerEnd)
            val t0 = System.nanoTime()
            val model = parseInp(body)
            val (steps, _) = simulate(model)
            val wallMs = (System.nanoTime() - t0) / 1_000_000.0
            val rpt = generateRpt(model, steps, wallMs)
            val json = """{"success":true,"rpt":"${escapeJson(rpt)}"}"""
            resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${json.toByteArray().size}\r\n\r\n$json"
        } else {
            resp = "HTTP/1.1 404 Not Found\r\n\r\n"
        }
        output.write(resp.toByteArray()); output.flush()
    } catch (e: Exception) { System.err.println("Error: ${e.message}") }
    finally { client.close() }
}

fun main() {
    val port = System.getenv("KOTLIN_ENGINE_PORT")?.toIntOrNull() ?: 3012
    val server = ServerSocket(port)
    println("SWMM5-Kotlin engine listening on port $port")
    while (true) { val client = server.accept(); handleClient(client) }
}
