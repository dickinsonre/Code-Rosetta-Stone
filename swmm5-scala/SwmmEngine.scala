import java.io._
import java.net.ServerSocket
import java.net.Socket
import scala.math._
import scala.collection.mutable

object SwmmEngine {
  val PI = 3.14159265358979323846

  case class Options(var flowUnits: String = "CFS", var infiltration: String = "HORTON",
    var flowRouting: String = "DYNWAVE", var startDate: String = "01/01/2024",
    var endDate: String = "01/02/2024", var reportStep: Double = 900, var wetStep: Double = 300,
    var dryStep: Double = 3600, var routingStep: Double = 30, var totalDuration: Double = 86400,
    var minSurfArea: Double = 12.566)

  case class Gage(id: String, format: String, interval: Double, scf: Double, sourceType: String, sourceName: String)
  case class Subcatch(id: String, rainGage: String, outlet: String, area: Double, pctImperv: Double,
    width: Double, slope: Double, var runoff: Double = 0, var rainfall: Double = 0,
    var totalPrecip: Double = 0, var totalRunoff: Double = 0, var totalInfil: Double = 0, var peakRunoff: Double = 0)
  case class Infil(var maxRate: Double = 3, var minRate: Double = 0.5, var decay: Double = 4,
    var dryTime: Double = 7, var currentRate: Double = 3, var cumulInfil: Double = 0)
  case class Node(id: String, nodeType: String, invertElev: Double, var maxDepth: Double = 0,
    var initDepth: Double = 0, var surDepth: Double = 0, var aPonded: Double = 0,
    var depth: Double = 0, var head: Double = 0, var volume: Double = 0,
    var inflow: Double = 0, var outflow: Double = 0, var overflow: Double = 0,
    var lateralInflow: Double = 0, var peakDepth: Double = 0, var peakHgl: Double = 0,
    var timePeakDepth: Double = 0, var totalInflow: Double = 0, var totalOutflow: Double = 0, var floodVolume: Double = 0)
  case class SLink(id: String, fromNode: String, toNode: String, length: Double, roughness: Double,
    inOffset: Double, outOffset: Double, var flow: Double = 0, var depth: Double = 0,
    var velocity: Double = 0, var volume: Double = 0, var peakFlow: Double = 0,
    var peakVelocity: Double = 0, var timePeakFlow: Double = 0, var maxDepthFrac: Double = 0,
    var fullDepth: Double = 0, var fullArea: Double = 0)
  case class Xsect(id: String, xtype: String, geom1: Double, geom2: Double, aFull: Double, rFull: Double)
  case class TS(id: String, times: mutable.ArrayBuffer[Double] = mutable.ArrayBuffer(), values: mutable.ArrayBuffer[Double] = mutable.ArrayBuffer())

  case class Model(options: Options = Options(), gages: mutable.ArrayBuffer[Gage] = mutable.ArrayBuffer(),
    subcatchments: mutable.ArrayBuffer[Subcatch] = mutable.ArrayBuffer(), infil: mutable.ArrayBuffer[Infil] = mutable.ArrayBuffer(),
    nodes: mutable.ArrayBuffer[Node] = mutable.ArrayBuffer(), links: mutable.ArrayBuffer[SLink] = mutable.ArrayBuffer(),
    xsects: mutable.ArrayBuffer[Xsect] = mutable.ArrayBuffer(), timeseries: mutable.HashMap[String, TS] = mutable.HashMap(),
    nodeMap: mutable.HashMap[String, Int] = mutable.HashMap(), var title: String = "")

  def parseTimeStr(s: String): Double = {
    val parts = s.trim.split(":")
    if (parts.length >= 2) {
      val h = parts(0).toDoubleOption.getOrElse(0.0)
      val m = parts(1).toDoubleOption.getOrElse(0.0)
      val sec = if (parts.length > 2) parts(2).toDoubleOption.getOrElse(0.0) else 0.0
      h * 3600 + m * 60 + sec
    } else s.trim.toDoubleOption.getOrElse(0.0)
  }

  def parseDuration(start: String, end: String): Double = {
    try {
      val sp = start.split("/"); val ep = end.split("/")
      if (sp.length < 3 || ep.length < 3) return 86400.0
      val d1 = new java.util.GregorianCalendar(sp(2).toInt, sp(0).toInt - 1, sp(1).toInt)
      val d2 = new java.util.GregorianCalendar(ep(2).toInt, ep(0).toInt - 1, ep(1).toInt)
      val diff = (d2.getTimeInMillis - d1.getTimeInMillis) / 1000.0
      if (diff > 0) diff else 86400.0
    } catch { case _: Exception => 86400.0 }
  }

  def parseInp(text: String): Model = {
    val m = Model()
    var section = ""
    for (line <- text.split("\n")) {
      val l = line.trim
      if (l.isEmpty || l.startsWith(";")) {}
      else if (l.startsWith("[")) { section = l.replaceAll("[\\[\\]]", "").toUpperCase; }
      else {
        val t = l.split("\\s+")
        if (t.nonEmpty) section match {
          case "TITLE" => m.title = l
          case "OPTIONS" if t.length >= 2 => t(0).toUpperCase match {
            case "FLOW_UNITS" => m.options.flowUnits = t(1)
            case "INFILTRATION" => m.options.infiltration = t(1)
            case "FLOW_ROUTING" => m.options.flowRouting = t(1)
            case "START_DATE" => m.options.startDate = t(1)
            case "END_DATE" => m.options.endDate = t(1)
            case "REPORT_STEP" => m.options.reportStep = parseTimeStr(t(1))
            case "WET_STEP" => m.options.wetStep = parseTimeStr(t(1))
            case "DRY_STEP" => m.options.dryStep = parseTimeStr(t(1))
            case "ROUTING_STEP" => m.options.routingStep = parseTimeStr(t(1))
            case _ =>
          }
          case "RAINGAGES" if t.length >= 6 => m.gages += Gage(t(0), t(1), parseTimeStr(t(2)) / 60, t(3).toDouble, t(4), t(5))
          case "SUBCATCHMENTS" if t.length >= 7 =>
            m.subcatchments += Subcatch(t(0), t(1), t(2), t(3).toDouble, t(4).toDouble, t(5).toDouble, t(6).toDouble)
            m.infil += Infil()
          case "INFILTRATION" if t.length >= 4 =>
            val idx = m.subcatchments.indexWhere(_.id == t(0))
            if (idx >= 0) m.infil(idx) = Infil(t(1).toDouble, t(2).toDouble, t(3).toDouble,
              if (t.length > 4) t(4).toDouble else 7.0, t(1).toDouble)
          case "JUNCTIONS" if t.length >= 2 =>
            val initD = if (t.length > 3) t(3).toDoubleOption.getOrElse(0.0) else 0.0
            val n = Node(t(0), "JUNCTION", t(1).toDouble,
              if (t.length > 2) t(2).toDoubleOption.getOrElse(0.0) else 0.0, initD,
              if (t.length > 4) t(4).toDoubleOption.getOrElse(0.0) else 0.0,
              if (t.length > 5) t(5).toDoubleOption.getOrElse(0.0) else 0.0,
              depth = initD, head = t(1).toDouble + initD)
            m.nodeMap(n.id) = m.nodes.size; m.nodes += n
          case "OUTFALLS" if t.length >= 3 =>
            val n = Node(t(0), "OUTFALL", t(1).toDouble, head = t(1).toDouble)
            m.nodeMap(n.id) = m.nodes.size; m.nodes += n
          case "CONDUITS" if t.length >= 6 =>
            m.links += SLink(t(0), t(1), t(2), t(3).toDouble, t(4).toDouble, t(5).toDouble,
              if (t.length > 6) t(6).toDoubleOption.getOrElse(0.0) else 0.0)
          case "XSECTIONS" if t.length >= 3 =>
            val g1 = t(2).toDoubleOption.getOrElse(1.0); val g2 = if (t.length > 3) t(3).toDoubleOption.getOrElse(0.0) else 0.0
            val tp = t(1).toUpperCase
            val (af, rf) = if (tp == "CIRCULAR") (PI * pow(g1 / 2, 2), g1 / 4.0)
              else { val w = if (g2 > 0) g2 else g1; val a = g1 * w; val p = 2 * g1 + 2 * w; (a, if (p > 0) a / p else 0.0) }
            m.links.find(_.id == t(0)).foreach { lk => lk.fullDepth = g1; lk.fullArea = af }
            m.xsects += Xsect(t(0), tp, g1, g2, af, rf)
          case "TIMESERIES" if t.length >= 3 =>
            val ts = m.timeseries.getOrElseUpdate(t(0), TS(t(0)))
            var k = 1; while (k + 1 < t.length) {
              var tv = t(k).toDoubleOption
              if (tv.isEmpty) { val p = t(k).split(":"); tv = Some(p(0).toDoubleOption.getOrElse(0.0) + p.lift(1).flatMap(_.toDoubleOption).getOrElse(0.0) / 60.0) }
              ts.times += tv.getOrElse(0.0); ts.values += t(k + 1).toDoubleOption.getOrElse(0.0); k += 2
            }
          case _ =>
        }
      }
    }
    m.options.totalDuration = parseDuration(m.options.startDate, m.options.endDate); m
  }

  def getRainfall(m: Model, gageId: String, elapsed: Double): Double = {
    m.gages.find(_.id == gageId).flatMap(g => m.timeseries.get(g.sourceName)).map { ts =>
      val tHr = elapsed / 3600.0; ts.times.indices.reverse.find(i => tHr >= ts.times(i)).map(i => ts.values(i)).getOrElse(0.0)
    }.getOrElse(0.0)
  }

  def hortonInfil(inf: Infil, rainfall: Double, dt: Double): Double = {
    if (rainfall <= 0) { val rec = if (inf.dryTime > 0) dt / (inf.dryTime * 86400) else 0.0; inf.currentRate += (inf.maxRate - inf.currentRate) * rec; return 0 }
    val rate = min(inf.currentRate, rainfall)
    inf.currentRate = inf.minRate + (inf.currentRate - inf.minRate) * exp(-inf.decay * dt / 3600)
    inf.cumulInfil += rate * dt / 3600; rate
  }

  def xsectArea(xs: Xsect, depth: Double): Double = {
    if (depth <= 0) return 0
    if (xs.xtype == "CIRCULAR") {
      if (depth >= xs.geom1) return xs.aFull
      val r = xs.geom1 / 2; val y = depth - r; if (abs(r) < 1e-10) return 0
      val arg = max(-1.0, min(1.0, -y / r)); val theta = 2 * acos(arg); r * r * (theta - sin(theta)) / 2
    } else { val w = if (xs.geom2 > 0) xs.geom2 else xs.geom1; depth * w }
  }

  def xsectHrad(xs: Xsect, depth: Double): Double = {
    val area = xsectArea(xs, depth); if (area <= 0) return 0
    if (xs.xtype == "CIRCULAR") {
      val r = xs.geom1 / 2; val y = depth - r; if (abs(r) < 1e-10) return 0
      val arg = max(-1.0, min(1.0, -y / r)); val theta = 2 * acos(arg); val perim = r * theta; if (perim > 0) area / perim else 0
    } else { val w = if (xs.geom2 > 0) xs.geom2 else xs.geom1; val perim = w + 2 * depth; if (perim > 0) area / perim else 0 }
  }

  def simulate(m: Model): (Int, Double) = {
    val dt = m.options.routingStep; val total = m.options.totalDuration
    var elapsed = 0.0; var steps = 0
    while (elapsed < total) {
      for (i <- m.subcatchments.indices) {
        val sc = m.subcatchments(i); val rain = getRainfall(m, sc.rainGage, elapsed)
        sc.rainfall = rain; sc.totalPrecip += rain * dt / 3600
        val infilRate = hortonInfil(m.infil(i), rain * (1 - sc.pctImperv / 100), dt)
        sc.totalInfil += infilRate * dt / 3600
        val runoffIn = rain * sc.area * 43560 / 12.0 / 3600; val infilVol = infilRate * sc.area * (1 - sc.pctImperv / 100) * 43560 / 12.0 / 3600
        sc.runoff = max(0.0, runoffIn - infilVol); sc.totalRunoff += sc.runoff * dt; sc.peakRunoff = max(sc.peakRunoff, sc.runoff)
        m.nodeMap.get(sc.outlet).foreach(i => m.nodes(i).lateralInflow += sc.runoff)
      }
      for (n <- m.nodes) n.inflow = n.lateralInflow
      for (lk <- m.links) {
        (m.nodeMap.get(lk.fromNode), m.nodeMap.get(lk.toNode)) match {
          case (Some(fi), Some(ti)) => m.xsects.find(_.id == lk.id).foreach { xs =>
            val n1 = m.nodes(fi); val n2 = m.nodes(ti)
            val slope = if (lk.length > 0) (n1.head - n2.head) / lk.length else 0.0
            val avgDepth = max(0.0, min(xs.geom1, (n1.depth + n2.depth) / 2))
            val area = xsectArea(xs, avgDepth); val hrad = xsectHrad(xs, avgDepth)
            var manningQ = 0.0
            if (area > 0 && hrad > 0 && abs(slope) > 1e-12) {
              val sign = if (slope > 0) 1.0 else -1.0
              manningQ = sign * (1.49 / lk.roughness) * area * pow(hrad, 2.0 / 3.0) * sqrt(abs(slope))
            }
            lk.flow = lk.flow * 0.5 + manningQ * 0.5
            if (xs.aFull > 0) { val sl = max(abs(slope), 0.001)
              val qFull = (1.49 / lk.roughness) * xs.aFull * pow(xs.rFull, 2.0 / 3.0) * sqrt(sl)
              if (abs(lk.flow) > qFull * 1.5) lk.flow = (if (lk.flow > 0) 1.0 else -1.0) * qFull * 1.5
            }
            lk.depth = avgDepth; lk.velocity = if (area > 0) abs(lk.flow) / area else 0
            lk.volume = area * lk.length
            if (abs(lk.flow) > lk.peakFlow) { lk.peakFlow = abs(lk.flow); lk.timePeakFlow = elapsed }
            lk.peakVelocity = max(lk.peakVelocity, lk.velocity)
            if (xs.geom1 > 0) lk.maxDepthFrac = max(lk.maxDepthFrac, avgDepth / xs.geom1)
            if (lk.flow > 0) { n1.outflow += lk.flow; n2.inflow += lk.flow }
          }
          case _ =>
        }
      }
      for (n <- m.nodes) {
        if (n.nodeType != "OUTFALL") {
          val sa = if (n.aPonded > 0) n.aPonded else m.options.minSurfArea
          val net = n.inflow - n.outflow + n.lateralInflow
          n.depth += net * dt / sa; n.depth = max(0.0, n.depth)
          if (n.maxDepth > 0 && n.depth > n.maxDepth + n.surDepth) {
            n.overflow = n.depth - n.maxDepth; n.floodVolume += n.overflow * dt; n.depth = n.maxDepth
          }
          n.head = n.invertElev + n.depth; n.volume = n.depth * sa
          n.peakDepth = max(n.peakDepth, n.depth); n.peakHgl = max(n.peakHgl, n.head)
          n.totalInflow += n.inflow * dt; n.totalOutflow += n.outflow * dt
          n.lateralInflow = 0; n.inflow = 0; n.outflow = 0; n.overflow = 0
        }
      }
      elapsed += dt; steps += 1
    }
    (steps, elapsed)
  }

  def fmtPeakTime(secs: Double): String = {
    if (secs <= 0) return "0  00:00"
    val days = (secs / 86400).toInt; val rem = secs - days * 86400
    val hrs = (rem / 3600).toInt; val mins = ((rem - hrs * 3600) / 60).toInt
    f"$days  $hrs%02d:$mins%02d"
  }

  def generateRpt(m: Model, steps: Int, wallMs: Double): String = {
    val sb = new StringBuilder
    sb ++= "  EPA STORM WATER MANAGEMENT MODEL -- SCALA ENGINE\n"
    sb ++= "  SWMM5-Scala v1.0 -- SWMM5 Rosetta Stone Project\n"
    sb ++= "  " + "=" * 60 + "\n\n"
    sb ++= "  ****************\n  Analysis Options\n  ****************\n"
    sb ++= f"  Flow Units ............... ${m.options.flowUnits}\n"
    sb ++= f"  Flow Routing Method ...... ${m.options.flowRouting}\n"
    sb ++= f"  Infiltration Method ...... ${m.options.infiltration}\n"
    sb ++= f"  Starting Date ............ ${m.options.startDate}\n"
    sb ++= f"  Ending Date .............. ${m.options.endDate}\n"
    sb ++= f"  Routing Time Step ........ ${m.options.routingStep}%.2f sec\n\n"
    sb ++= "  ******************\n  Node Depth Summary\n  ******************\n\n"
    sb ++= "  " + "-" * 95 + "\n"
    for (n <- m.nodes) sb ++= f"  ${n.id}%-30s ${n.peakDepth * 0.4}%10.3f ${n.peakDepth}%10.3f ${n.peakHgl}%12.3f\n"
    sb ++= "\n  *************************\n  Conduit Flow Summary\n  *************************\n\n"
    sb ++= "  " + "-" * 95 + "\n"
    for (lk <- m.links) {
      val xs = m.xsects.find(_.id == lk.id)
      var fullQ = 1.0
      xs.foreach { x => if (x.aFull > 0 && x.rFull > 0) fullQ = (1.49 / lk.roughness) * x.aFull * pow(x.rFull, 2.0 / 3.0) * sqrt(0.01) }
      val mff = if (fullQ > 0) lk.peakFlow / fullQ else 0.0
      sb ++= f"  ${lk.id}%-30s ${lk.peakFlow}%10.3f ${fmtPeakTime(lk.timePeakFlow)}%12s ${lk.peakVelocity}%10.3f $mff%8.2f ${lk.maxDepthFrac}%8.2f\n"
    }
    sb ++= "\n  *********************\n  Simulation Summary\n  *********************\n\n"
    sb ++= "  Engine ................... SWMM5-Scala v1.0\n"
    sb ++= f"  Total Steps .............. $steps\n"
    sb ++= f"  Simulation Duration ...... ${m.options.totalDuration}%.1f seconds (${m.options.totalDuration / 3600}%.2f hours)\n"
    sb ++= f"  Wall-Clock Time .......... $wallMs%.1f ms\n"
    sb ++= f"  Nodes .................... ${m.nodes.size}\n"
    sb ++= f"  Links .................... ${m.links.size}\n"
    sb ++= f"  Subcatchments ............ ${m.subcatchments.size}\n"
    sb.toString
  }

  def escapeJson(s: String): String = s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")

  def handleClient(client: Socket): Unit = {
    try {
      val in_ = client.getInputStream; val out = client.getOutputStream
      val buf = new Array[Byte](2 * 1024 * 1024); var total = 0
      var done = false
      while (!done) {
        val n = in_.read(buf, total, buf.length - total); if (n <= 0) { done = true } else {
          total += n; val s = new String(buf, 0, total)
          if (s.contains("\r\n\r\n")) {
            val headerEnd = s.indexOf("\r\n\r\n") + 4
            val clMatch = "(?i)Content-Length:\\s*(\\d+)".r.findFirstMatchIn(s)
            clMatch.foreach { m => val cl = m.group(1).toInt
              while (total - headerEnd < cl) { val r = in_.read(buf, total, buf.length - total); if (r <= 0) { done = true; return }; total += r }
            }
            done = true
          }
        }
      }
      val req = new String(buf, 0, total)
      val resp = if (req.startsWith("GET /health")) {
        val json = """{"engine":"SWMM5-Scala","status":"ok","version":"v1.0","language":"Scala"}"""
        s"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n$json"
      } else if (req.startsWith("POST /simulate")) {
        val headerEnd = req.indexOf("\r\n\r\n") + 4; val body = req.substring(headerEnd)
        val t0 = System.nanoTime; val model = parseInp(body); val (steps, _) = simulate(model)
        val wallMs = (System.nanoTime - t0) / 1e6; val rpt = generateRpt(model, steps, wallMs)
        val json = s"""{"success":true,"rpt":"${escapeJson(rpt)}"}"""
        s"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${json.getBytes.length}\r\n\r\n$json"
      } else "HTTP/1.1 404 Not Found\r\n\r\n"
      out.write(resp.getBytes); out.flush()
    } catch { case e: Exception => System.err.println(s"Error: ${e.getMessage}") }
    finally client.close()
  }

  def main(args: Array[String]): Unit = {
    val port = sys.env.getOrElse("SCALA_ENGINE_PORT", "3013").toInt
    val server = new ServerSocket(port)
    println(s"SWMM5-Scala engine listening on port $port")
    while (true) { val client = server.accept(); handleClient(client) }
  }
}
