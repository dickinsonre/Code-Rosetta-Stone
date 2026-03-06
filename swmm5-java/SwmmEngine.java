import java.io.*;
import java.net.*;
import java.util.*;

public class SwmmEngine {
    static final double PI = Math.PI;

    static class Options {
        String flowUnits = "CFS", infiltration = "HORTON", flowRouting = "DYNWAVE";
        String startDate = "01/01/2024", endDate = "01/02/2024";
        double reportStep = 900, routingStep = 30, totalDuration = 86400, minSurfArea = 12.566;
    }

    static class Gage { String id, sourceName; }
    static class Subcatch {
        String id, rainGage, outlet;
        double area, pctImperv, runoff, totalPrecip, totalRunoff, totalInfil, peakRunoff;
    }
    static class InfilData {
        double maxRate = 3, minRate = 0.5, decay = 4, dryTime = 7, currentRate = 3, cumulInfil;
    }
    static class Node {
        String id, type;
        double invertElev, maxDepth, surDepth, aPonded;
        double depth, head, volume, inflow, outflow, overflow, lateralInflow;
        double peakDepth, peakHgl, totalInflow, totalOutflow, floodVolume;
    }
    static class Link {
        String id, fromNode, toNode;
        double length, roughness, flow, depth, velocity, volume;
        double peakFlow, peakVelocity, timePeakFlow, maxDepthFrac, fullDepth, fullArea;
    }
    static class Xsect {
        String id, type;
        double geom1, geom2, aFull, rFull;
    }
    static class Timeseries {
        List<Double> times = new ArrayList<>(), values = new ArrayList<>();
    }

    static class Model {
        Options options = new Options();
        List<Gage> gages = new ArrayList<>();
        List<Subcatch> subcatchments = new ArrayList<>();
        List<InfilData> infil = new ArrayList<>();
        List<Node> nodes = new ArrayList<>();
        List<Link> links = new ArrayList<>();
        List<Xsect> xsects = new ArrayList<>();
        Map<String, Timeseries> timeseries = new HashMap<>();
        Map<String, Integer> nodeMap = new HashMap<>();
    }

    static double parseTimeStr(String s) {
        s = s.trim();
        if (s.contains(":")) {
            String[] p = s.split(":");
            double h = Double.parseDouble(p[0]);
            double m = p.length > 1 ? Double.parseDouble(p[1]) : 0;
            double sec = p.length > 2 ? Double.parseDouble(p[2]) : 0;
            return h * 3600 + m * 60 + sec;
        }
        return Double.parseDouble(s);
    }

    static double parseDuration(String start, String end) {
        try {
            String[] p1 = start.split("/"), p2 = end.split("/");
            Calendar c1 = new GregorianCalendar(Integer.parseInt(p1[2]), Integer.parseInt(p1[0]) - 1, Integer.parseInt(p1[1]));
            Calendar c2 = new GregorianCalendar(Integer.parseInt(p2[2]), Integer.parseInt(p2[0]) - 1, Integer.parseInt(p2[1]));
            double diff = (c2.getTimeInMillis() - c1.getTimeInMillis()) / 1000.0;
            return diff > 0 ? diff : 86400;
        } catch (Exception e) { return 86400; }
    }

    static double dbl(String s) { try { return Double.parseDouble(s); } catch (Exception e) { return 0; } }

    static Model parseInp(String text) {
        Model m = new Model();
        String section = "";
        for (String raw : text.split("\n")) {
            String line = raw.trim();
            if (line.isEmpty() || line.startsWith(";")) continue;
            if (line.startsWith("[")) {
                int end = line.indexOf(']');
                section = end > 0 ? line.substring(1, end).toUpperCase() : "";
                continue;
            }
            String[] t = line.split("\\s+");
            if (t.length < 1) continue;

            switch (section) {
                case "OPTIONS":
                    if (t.length < 2) break;
                    switch (t[0].toUpperCase()) {
                        case "FLOW_UNITS": m.options.flowUnits = t[1]; break;
                        case "INFILTRATION": m.options.infiltration = t[1]; break;
                        case "FLOW_ROUTING": m.options.flowRouting = t[1]; break;
                        case "START_DATE": m.options.startDate = t[1]; break;
                        case "END_DATE": m.options.endDate = t[1]; break;
                        case "REPORT_STEP": m.options.reportStep = parseTimeStr(t[1]); break;
                        case "ROUTING_STEP": m.options.routingStep = parseTimeStr(t[1]); break;
                    } break;
                case "RAINGAGES":
                    if (t.length >= 6) { Gage g = new Gage(); g.id = t[0]; g.sourceName = t[5]; m.gages.add(g); } break;
                case "SUBCATCHMENTS":
                    if (t.length >= 7) {
                        Subcatch sc = new Subcatch();
                        sc.id = t[0]; sc.rainGage = t[1]; sc.outlet = t[2];
                        sc.area = dbl(t[3]); sc.pctImperv = dbl(t[4]);
                        m.subcatchments.add(sc);
                        m.infil.add(new InfilData());
                    } break;
                case "INFILTRATION":
                    if (t.length >= 4) {
                        for (int i = 0; i < m.subcatchments.size(); i++) {
                            if (m.subcatchments.get(i).id.equals(t[0])) {
                                m.infil.get(i).maxRate = dbl(t[1]);
                                m.infil.get(i).minRate = dbl(t[2]);
                                m.infil.get(i).decay = dbl(t[3]);
                                m.infil.get(i).dryTime = t.length > 4 ? dbl(t[4]) : 7;
                                m.infil.get(i).currentRate = m.infil.get(i).maxRate;
                                break;
                            }
                        }
                    } break;
                case "JUNCTIONS":
                    if (t.length >= 2) {
                        Node n = new Node();
                        n.id = t[0]; n.type = "JUNCTION"; n.invertElev = dbl(t[1]);
                        n.maxDepth = t.length > 2 ? dbl(t[2]) : 0; n.depth = t.length > 3 ? dbl(t[3]) : 0;
                        n.surDepth = t.length > 4 ? dbl(t[4]) : 0; n.aPonded = t.length > 5 ? dbl(t[5]) : 0;
                        n.head = n.invertElev + n.depth;
                        m.nodeMap.put(n.id, m.nodes.size());
                        m.nodes.add(n);
                    } break;
                case "OUTFALLS":
                    if (t.length >= 3) {
                        Node n = new Node();
                        n.id = t[0]; n.type = "OUTFALL"; n.invertElev = dbl(t[1]); n.head = n.invertElev;
                        m.nodeMap.put(n.id, m.nodes.size());
                        m.nodes.add(n);
                    } break;
                case "CONDUITS":
                    if (t.length >= 6) {
                        Link lk = new Link();
                        lk.id = t[0]; lk.fromNode = t[1]; lk.toNode = t[2];
                        lk.length = dbl(t[3]); lk.roughness = dbl(t[4]);
                        m.links.add(lk);
                    } break;
                case "XSECTIONS":
                    if (t.length >= 3) {
                        Xsect xs = new Xsect();
                        xs.id = t[0]; xs.type = t[1].toUpperCase();
                        if (xs.type.equals("IRREGULAR")) {
                            xs.geom1 = 1.0; xs.geom2 = 0; xs.aFull = 1.0; xs.rFull = 0.25;
                        } else {
                            xs.geom1 = dbl(t[2]);
                            xs.geom2 = t.length > 3 ? dbl(t[3]) : 0;
                            if (xs.type.equals("CIRCULAR")) {
                                xs.aFull = PI * Math.pow(xs.geom1 / 2, 2);
                                xs.rFull = xs.geom1 / 4;
                            } else {
                                double w = xs.geom2 > 0 ? xs.geom2 : xs.geom1;
                                xs.aFull = xs.geom1 * w;
                                double p = 2 * xs.geom1 + 2 * w;
                                xs.rFull = p > 0 ? xs.aFull / p : 0;
                            }
                        }
                        for (Link lk : m.links)
                            if (lk.id.equals(xs.id)) { lk.fullDepth = xs.geom1; lk.fullArea = xs.aFull; break; }
                        m.xsects.add(xs);
                    } break;
                case "TIMESERIES":
                    if (t.length >= 3) {
                        Timeseries ts = m.timeseries.computeIfAbsent(t[0], k -> new Timeseries());
                        for (int k = 1; k + 1 < t.length; k += 2) {
                            String tv = t[k];
                            double tval;
                            if (tv.contains(":")) {
                                String[] parts = tv.split(":");
                                tval = Double.parseDouble(parts[0]) + Double.parseDouble(parts[1]) / 60.0;
                            } else tval = dbl(tv);
                            ts.times.add(tval);
                            ts.values.add(dbl(t[k + 1]));
                        }
                    } break;
            }
        }
        m.options.totalDuration = parseDuration(m.options.startDate, m.options.endDate);
        return m;
    }

    static double xsectArea(Xsect xs, double depth) {
        if (depth <= 0) return 0;
        if (xs.type.equals("CIRCULAR")) {
            if (depth >= xs.geom1) return xs.aFull;
            double r = xs.geom1 / 2, y = depth - r;
            if (Math.abs(r) < 1e-10) return 0;
            double theta = 2 * Math.acos(Math.max(-1, Math.min(1, -y / r)));
            return r * r * (theta - Math.sin(theta)) / 2;
        }
        double w = xs.geom2 > 0 ? xs.geom2 : xs.geom1;
        return depth * w;
    }

    static double xsectHrad(Xsect xs, double depth) {
        double area = xsectArea(xs, depth);
        if (area <= 0) return 0;
        if (xs.type.equals("CIRCULAR")) {
            double r = xs.geom1 / 2, y = depth - r;
            if (Math.abs(r) < 1e-10) return 0;
            double theta = 2 * Math.acos(Math.max(-1, Math.min(1, -y / r)));
            double perim = r * theta;
            return perim > 0 ? area / perim : 0;
        }
        double w = xs.geom2 > 0 ? xs.geom2 : xs.geom1;
        return (w + 2 * depth) > 0 ? area / (w + 2 * depth) : 0;
    }

    static double getRainfall(Model m, String gageId, double elapsed) {
        for (Gage g : m.gages) {
            if (g.id.equals(gageId)) {
                Timeseries ts = m.timeseries.get(g.sourceName);
                if (ts == null || ts.times.isEmpty()) return 0;
                double tHr = elapsed / 3600;
                for (int i = ts.times.size() - 1; i >= 0; i--)
                    if (tHr >= ts.times.get(i)) return ts.values.get(i);
                return 0;
            }
        }
        return 0;
    }

    static int simulate(Model m) {
        double dt = m.options.routingStep, total = m.options.totalDuration;
        double elapsed = 0; int steps = 0;
        while (elapsed < total) {
            for (int i = 0; i < m.subcatchments.size(); i++) {
                Subcatch sc = m.subcatchments.get(i);
                InfilData inf = m.infil.get(i);
                double rain = getRainfall(m, sc.rainGage, elapsed);
                sc.totalPrecip += rain * dt / 3600;
                double pervRain = rain * (1 - sc.pctImperv / 100);
                double infilRate;
                if (pervRain <= 0) {
                    double rec = inf.dryTime > 0 ? dt / (inf.dryTime * 86400) : 0;
                    inf.currentRate += (inf.maxRate - inf.currentRate) * rec;
                    infilRate = 0;
                } else {
                    infilRate = Math.min(inf.currentRate, pervRain);
                    inf.currentRate = inf.minRate + (inf.currentRate - inf.minRate) * Math.exp(-inf.decay * dt / 3600);
                    inf.cumulInfil += infilRate * dt / 3600;
                }
                sc.totalInfil += infilRate * dt / 3600;
                double runoffIn = rain * sc.area * 43560 / 12.0 / 3600;
                double infilVol = infilRate * sc.area * (1 - sc.pctImperv / 100) * 43560 / 12.0 / 3600;
                sc.runoff = Math.max(0, runoffIn - infilVol);
                sc.totalRunoff += sc.runoff * dt;
                sc.peakRunoff = Math.max(sc.peakRunoff, sc.runoff);
                Integer ni = m.nodeMap.get(sc.outlet);
                if (ni != null) m.nodes.get(ni).lateralInflow += sc.runoff;
            }
            for (Node n : m.nodes) n.inflow = n.lateralInflow;
            for (Link lk : m.links) {
                Integer fi = m.nodeMap.get(lk.fromNode), ti = m.nodeMap.get(lk.toNode);
                if (fi == null || ti == null) continue;
                Xsect xs = null;
                for (Xsect x : m.xsects) if (x.id.equals(lk.id)) { xs = x; break; }
                if (xs == null) continue;
                Node n1 = m.nodes.get(fi), n2 = m.nodes.get(ti);
                double dh = n1.head - n2.head;
                double slope = lk.length > 0 ? dh / lk.length : 0;
                double avgDepth = Math.max(0, Math.min((n1.depth + n2.depth) / 2, xs.geom1));
                double area = xsectArea(xs, avgDepth), hrad = xsectHrad(xs, avgDepth);
                double manningQ = 0;
                if (area > 0 && hrad > 0 && Math.abs(slope) > 1e-12) {
                    double sign = slope > 0 ? 1 : -1;
                    manningQ = sign * (1.49 / lk.roughness) * area * Math.pow(hrad, 2.0 / 3) * Math.sqrt(Math.abs(slope));
                }
                lk.flow = lk.flow * 0.5 + manningQ * 0.5;
                if (xs.aFull > 0) {
                    double sl = Math.max(Math.abs(slope), 0.001);
                    double qFull = (1.49 / lk.roughness) * xs.aFull * Math.pow(xs.rFull, 2.0 / 3) * Math.sqrt(sl);
                    if (Math.abs(lk.flow) > qFull * 1.5) lk.flow = Math.signum(lk.flow) * qFull * 1.5;
                }
                double fa = Math.abs(lk.flow);
                lk.depth = avgDepth; lk.velocity = area > 0 ? fa / area : 0; lk.volume = area * lk.length;
                if (fa > lk.peakFlow) { lk.peakFlow = fa; lk.timePeakFlow = elapsed; }
                lk.peakVelocity = Math.max(lk.peakVelocity, lk.velocity);
                if (xs.geom1 > 0) lk.maxDepthFrac = Math.max(lk.maxDepthFrac, avgDepth / xs.geom1);
                if (lk.flow > 0) { n1.outflow += lk.flow; n2.inflow += lk.flow; }
            }
            for (Node n : m.nodes) {
                if (n.type.equals("OUTFALL")) continue;
                double sa = n.aPonded > 0 ? n.aPonded : m.options.minSurfArea;
                double net = n.inflow - n.outflow + n.lateralInflow;
                n.depth += net * dt / sa;
                if (n.depth < 0) n.depth = 0;
                if (n.maxDepth > 0 && n.depth > n.maxDepth + n.surDepth) {
                    n.overflow = n.depth - n.maxDepth;
                    n.floodVolume += n.overflow * dt;
                    n.depth = n.maxDepth;
                }
                n.head = n.invertElev + n.depth; n.volume = n.depth * sa;
                n.peakDepth = Math.max(n.peakDepth, n.depth);
                n.peakHgl = Math.max(n.peakHgl, n.head);
                n.totalInflow += n.inflow * dt; n.totalOutflow += n.outflow * dt;
                n.lateralInflow = 0; n.inflow = 0; n.outflow = 0; n.overflow = 0;
            }
            elapsed += dt; steps++;
        }
        return steps;
    }

    static String fmtPeak(double secs) {
        if (secs <= 0) return "0  00:00";
        int days = (int)(secs / 86400);
        double rem = secs - days * 86400;
        int hrs = (int)(rem / 3600), mins = (int)((rem - hrs * 3600) / 60);
        return String.format("%d  %02d:%02d", days, hrs, mins);
    }

    static String generateRpt(Model m, int steps, double wallMs) {
        StringBuilder sb = new StringBuilder(8192);
        sb.append("  EPA STORM WATER MANAGEMENT MODEL -- JAVA ENGINE\n");
        sb.append("  SWMM5-Java v1.0 -- SWMM5 Rosetta Stone Project\n");
        sb.append("  ").append("=".repeat(60)).append("\n\n");
        sb.append("  ****************\n  Analysis Options\n  ****************\n");
        sb.append("  Flow Units ............... ").append(m.options.flowUnits).append("\n");
        sb.append("  Flow Routing Method ...... ").append(m.options.flowRouting).append("\n");
        sb.append("  Infiltration Method ...... ").append(m.options.infiltration).append("\n");
        sb.append("  Starting Date ............ ").append(m.options.startDate).append("\n");
        sb.append("  Ending Date .............. ").append(m.options.endDate).append("\n");
        sb.append(String.format("  Routing Time Step ........ %.2f sec\n\n", m.options.routingStep));
        sb.append("  ******************\n  Node Depth Summary\n  ******************\n\n");
        sb.append("  ").append("-".repeat(95)).append("\n");
        for (Node n : m.nodes)
            sb.append(String.format("  %-30s %10.3f %10.3f %12.3f\n", n.id, n.peakDepth * 0.4, n.peakDepth, n.peakHgl));
        sb.append("\n  *************************\n  Conduit Flow Summary\n  *************************\n\n");
        sb.append("  ").append("-".repeat(95)).append("\n");
        for (Link lk : m.links) {
            Xsect xs = null;
            for (Xsect x : m.xsects) if (x.id.equals(lk.id)) { xs = x; break; }
            double fullQ = 1;
            if (xs != null && xs.aFull > 0 && xs.rFull > 0)
                fullQ = (1.49 / lk.roughness) * xs.aFull * Math.pow(xs.rFull, 2.0 / 3) * Math.sqrt(0.01);
            double mff = fullQ > 0 ? lk.peakFlow / fullQ : 0;
            sb.append(String.format("  %-30s %10.3f %12s %10.3f %8.2f %8.2f\n", lk.id, lk.peakFlow, fmtPeak(lk.timePeakFlow), lk.peakVelocity, mff, lk.maxDepthFrac));
        }
        sb.append("\n  *********************\n  Simulation Summary\n  *********************\n\n");
        sb.append("  Engine ................... SWMM5-Java v1.0\n");
        sb.append(String.format("  Total Steps .............. %d\n", steps));
        sb.append(String.format("  Simulation Duration ...... %.1f seconds (%.2f hours)\n", m.options.totalDuration, m.options.totalDuration / 3600));
        sb.append(String.format("  Wall-Clock Time .......... %.1f ms\n", wallMs));
        sb.append(String.format("  Nodes .................... %d\n", m.nodes.size()));
        sb.append(String.format("  Links .................... %d\n", m.links.size()));
        sb.append(String.format("  Subcatchments ............ %d\n\n", m.subcatchments.size()));
        return sb.toString();
    }

    static String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(System.getenv().getOrDefault("JAVA_ENGINE_PORT", "3011"));
        ServerSocket server = new ServerSocket(port, 16, InetAddress.getByName("127.0.0.1"));
        System.out.println("SWMM5-Java engine listening on port " + port);
        System.out.flush();

        while (true) {
            Socket client = server.accept();
            try {
                InputStream is = client.getInputStream();
                OutputStream os = client.getOutputStream();
                byte[] buf = new byte[1048576 + 4096];
                int total = 0;
                while (true) {
                    int n = is.read(buf, total, buf.length - total);
                    if (n <= 0) break;
                    total += n;
                    String s = new String(buf, 0, total);
                    if (s.contains("\r\n\r\n")) {
                        int clIdx = s.toLowerCase().indexOf("content-length:");
                        if (clIdx >= 0) {
                            String rest = s.substring(clIdx + 15).trim();
                            int clen = Integer.parseInt(rest.split("[^0-9]")[0]);
                            int hdrEnd = s.indexOf("\r\n\r\n") + 4;
                            while (total - hdrEnd < clen) {
                                n = is.read(buf, total, buf.length - total);
                                if (n <= 0) break;
                                total += n;
                            }
                        }
                        break;
                    }
                }
                String request = new String(buf, 0, total);
                if (request.startsWith("GET /health")) {
                    String json = "{\"engine\":\"SWMM5-Java\",\"status\":\"ok\",\"version\":\"v1.0\",\"language\":\"Java\"}";
                    String resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + json.length() + "\r\n\r\n" + json;
                    os.write(resp.getBytes()); os.flush();
                } else if (request.startsWith("POST /simulate")) {
                    int hdrEnd = request.indexOf("\r\n\r\n") + 4;
                    String body = request.substring(hdrEnd);
                    long t0 = System.nanoTime();
                    Model model = parseInp(body);
                    int steps = simulate(model);
                    double wallMs = (System.nanoTime() - t0) / 1e6;
                    String rpt = generateRpt(model, steps, wallMs);
                    String json = "{\"success\":true,\"rpt\":\"" + escapeJson(rpt) + "\"}";
                    String resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " + json.length() + "\r\n\r\n" + json;
                    os.write(resp.getBytes()); os.flush();
                }
            } catch (Exception e) { System.err.println("Java engine error: " + e.getMessage()); }
            finally { client.close(); }
        }
    }
}
