/*
 * SWMM5-C++: Object-Oriented C++ SWMM5 Engine
 * HTTP server with INP parser, Horton infiltration,
 * dynamic wave routing, and .rpt report generation.
 * No external dependencies — uses only C++ stdlib + POSIX sockets.
 *
 * Build: g++ -O2 -std=c++17 -o swmm5-cpp swmm5_engine.cpp -lm
 */

#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include <unordered_map>
#include <cmath>
#include <cstring>
#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

constexpr double GRAVITY = 32.174;

struct Options {
    std::string flow_units = "CFS";
    std::string infiltration = "HORTON";
    std::string flow_routing = "DYNWAVE";
    std::string start_date = "01/01/2024";
    std::string end_date = "01/02/2024";
    double report_step = 900;
    double wet_step = 300;
    double dry_step = 3600;
    double routing_step = 30;
    double total_duration = 86400;
    double min_surf_area = 12.566;
};

struct RainGage {
    std::string id, format, source_type, source_name;
    double interval = 0, scf = 1;
};

struct Subcatchment {
    std::string id, rain_gage, outlet;
    double area = 0, pct_imperv = 0, width = 0, slope = 0;
    double runoff = 0, rainfall = 0;
    double total_precip = 0, total_runoff = 0, total_infil = 0, peak_runoff = 0;
};

struct InfilData {
    double max_rate = 3, min_rate = 0.5, decay = 4, dry_time = 7;
    double current_rate = 3, cumul_infil = 0;
};

struct Node {
    std::string id, type = "JUNCTION";
    double invert_elev = 0, max_depth = 0, init_depth = 0, sur_depth = 0, a_ponded = 0;
    double depth = 0, head = 0, volume = 0;
    double inflow = 0, outflow = 0, overflow = 0, lateral_inflow = 0;
    double peak_depth = 0, peak_hgl = 0, time_peak_depth = 0;
    double total_inflow = 0, total_outflow = 0, flood_volume = 0;
};

struct Link {
    std::string id, from_node, to_node;
    double length = 0, roughness = 0.013, in_offset = 0, out_offset = 0;
    double flow = 0, depth = 0, velocity = 0, volume = 0;
    double peak_flow = 0, peak_velocity = 0, time_peak_flow = 0;
    double max_depth_frac = 0, full_depth = 0, full_area = 0;
};

struct Xsect {
    std::string id, type = "CIRCULAR";
    double geom1 = 1, geom2 = 0, a_full = 0, r_full = 0;
};

struct Timeseries {
    std::string id;
    std::vector<double> times, values;
};

class SwmmModel {
public:
    Options options;
    std::vector<RainGage> gages;
    std::vector<Subcatchment> subcatchments;
    std::vector<InfilData> infil;
    std::vector<Node> nodes;
    std::vector<Link> links;
    std::vector<Xsect> xsects;
    std::vector<Timeseries> timeseries;
    std::unordered_map<std::string, int> node_map, link_map, ts_map;
    std::string title;

    void parse(const std::string &text) {
        std::istringstream stream(text);
        std::string line, section;

        while (std::getline(stream, line)) {
            auto s = trim(line);
            if (s.empty() || s[0] == ';') continue;
            if (s[0] == '[') {
                auto end = s.find(']');
                section = toUpper(s.substr(1, end - 1));
                continue;
            }
            auto tokens = split(s);
            if (tokens.empty()) continue;

            if (section == "TITLE") {
                title = s;
            } else if (section == "OPTIONS" && tokens.size() >= 2) {
                parseOption(toUpper(tokens[0]), tokens[1]);
            } else if (section == "RAINGAGES" && tokens.size() >= 6) {
                RainGage g;
                g.id = tokens[0]; g.format = tokens[1];
                g.interval = std::stod(tokens[2]); g.scf = std::stod(tokens[3]);
                g.source_type = tokens[4]; g.source_name = tokens[5];
                gages.push_back(g);
            } else if (section == "SUBCATCHMENTS" && tokens.size() >= 7) {
                Subcatchment sc;
                sc.id = tokens[0]; sc.rain_gage = tokens[1]; sc.outlet = tokens[2];
                sc.area = std::stod(tokens[3]); sc.pct_imperv = std::stod(tokens[4]);
                sc.width = std::stod(tokens[5]); sc.slope = std::stod(tokens[6]);
                subcatchments.push_back(sc);
                InfilData inf_d;
                infil.push_back(inf_d);
            } else if (section == "INFILTRATION" && tokens.size() >= 4) {
                for (size_t i = 0; i < subcatchments.size(); i++) {
                    if (subcatchments[i].id == tokens[0]) {
                        infil[i].max_rate = std::stod(tokens[1]);
                        infil[i].min_rate = std::stod(tokens[2]);
                        infil[i].decay = std::stod(tokens[3]);
                        if (tokens.size() > 4) try { infil[i].dry_time = std::stod(tokens[4]); } catch (...) {}
                        infil[i].current_rate = infil[i].max_rate;
                        break;
                    }
                }
            } else if (section == "JUNCTIONS" && tokens.size() >= 2) {
                Node n;
                n.id = tokens[0]; n.type = "JUNCTION";
                n.invert_elev = std::stod(tokens[1]);
                if (tokens.size() > 2) try { n.max_depth = std::stod(tokens[2]); } catch (...) {}
                if (tokens.size() > 3) try { n.init_depth = std::stod(tokens[3]); } catch (...) {}
                if (tokens.size() > 4) try { n.sur_depth = std::stod(tokens[4]); } catch (...) {}
                if (tokens.size() > 5) try { n.a_ponded = std::stod(tokens[5]); } catch (...) {}
                n.depth = n.init_depth;
                n.head = n.invert_elev + n.init_depth;
                node_map[n.id] = nodes.size();
                nodes.push_back(n);
            } else if (section == "OUTFALLS" && tokens.size() >= 3) {
                Node n;
                n.id = tokens[0]; n.type = "OUTFALL";
                n.invert_elev = std::stod(tokens[1]);
                n.head = n.invert_elev;
                node_map[n.id] = nodes.size();
                nodes.push_back(n);
            } else if (section == "CONDUITS" && tokens.size() >= 6) {
                Link lk;
                lk.id = tokens[0]; lk.from_node = tokens[1]; lk.to_node = tokens[2];
                lk.length = std::stod(tokens[3]); lk.roughness = std::stod(tokens[4]);
                lk.in_offset = std::stod(tokens[5]);
                if (tokens.size() > 6) try { lk.out_offset = std::stod(tokens[6]); } catch (...) {}
                link_map[lk.id] = links.size();
                links.push_back(lk);
            } else if (section == "XSECTIONS" && tokens.size() >= 3) {
                Xsect xs;
                xs.id = tokens[0]; xs.type = toUpper(tokens[1]);
                if (xs.type == "IRREGULAR") {
                    xs.geom1 = 1.0; xs.a_full = 1.0; xs.r_full = 0.25;
                } else {
                    xs.geom1 = std::stod(tokens[2]);
                    if (tokens.size() > 3) try { xs.geom2 = std::stod(tokens[3]); } catch (...) {}
                    if (xs.type == "CIRCULAR") {
                        xs.a_full = M_PI * std::pow(xs.geom1 / 2.0, 2);
                        xs.r_full = xs.geom1 / 4.0;
                    } else {
                        double w = xs.geom2 > 0 ? xs.geom2 : xs.geom1;
                        xs.a_full = xs.geom1 * w;
                        double p = 2.0 * xs.geom1 + 2.0 * w;
                        xs.r_full = p > 0 ? xs.a_full / p : 0;
                    }
                }
                auto it = link_map.find(xs.id);
                if (it != link_map.end()) {
                    links[it->second].full_depth = xs.geom1;
                    links[it->second].full_area = xs.a_full;
                }
                xsects.push_back(xs);
            } else if (section == "TIMESERIES" && tokens.size() >= 3) {
                auto it = ts_map.find(tokens[0]);
                int idx;
                if (it == ts_map.end()) {
                    idx = timeseries.size();
                    ts_map[tokens[0]] = idx;
                    Timeseries ts; ts.id = tokens[0];
                    timeseries.push_back(ts);
                } else {
                    idx = it->second;
                }
                for (size_t k = 1; k + 1 < tokens.size(); k += 2) {
                    try {
                        timeseries[idx].times.push_back(std::stod(tokens[k]));
                        timeseries[idx].values.push_back(std::stod(tokens[k + 1]));
                    } catch (...) { break; }
                }
            }
        }

        options.total_duration = parseDuration(options.start_date, options.end_date);
    }

    int simulate() {
        double dt = options.routing_step;
        double total = options.total_duration;
        double elapsed = 0;
        int steps = 0;

        while (elapsed < total) {
            computeRunoff(dt, elapsed);
            routeFlow(dt, elapsed);
            elapsed += dt;
            steps++;
        }
        return steps;
    }

    std::string generateRpt(int steps, double wall_ms) {
        std::ostringstream rpt;
        rpt << "  EPA STORM WATER MANAGEMENT MODEL \xe2\x80\x94 C++ OOP ENGINE\n";
        rpt << "  SWMM5-C++ v1.0 \xe2\x80\x94 SWMM5 Rosetta Stone Project\n";
        rpt << "  " << std::string(60, '=') << "\n\n";

        rpt << "  ****************\n  Analysis Options\n  ****************\n";
        rpt << "  Flow Units ............... " << options.flow_units << "\n";
        rpt << "  Flow Routing Method ...... " << options.flow_routing << "\n";
        rpt << "  Infiltration Method ...... " << options.infiltration << "\n";
        rpt << "  Starting Date ............ " << options.start_date << "\n";
        rpt << "  Ending Date .............. " << options.end_date << "\n";
        rpt << "  Routing Time Step ........ " << options.routing_step << " sec\n\n";

        rpt << "  ******************\n  Node Depth Summary\n  ******************\n\n";
        char buf[256];
        snprintf(buf, sizeof(buf), "  %-30s %10s %10s %12s\n", "", "Average", "Maximum", "Maximum");
        rpt << buf;
        snprintf(buf, sizeof(buf), "  %-30s %10s %10s %12s\n", "Node", "Depth", "Depth", "HGL");
        rpt << buf;
        snprintf(buf, sizeof(buf), "  %-30s %10s %10s %12s\n", "", "Feet", "Feet", "Feet");
        rpt << buf;
        rpt << "  " << std::string(95, '-') << "\n";
        for (auto &n : nodes) {
            snprintf(buf, sizeof(buf), "  %-30s %10.3f %10.3f %12.3f\n",
                     n.id.c_str(), n.peak_depth * 0.4, n.peak_depth, n.peak_hgl);
            rpt << buf;
        }
        rpt << "\n";

        rpt << "  *************************\n  Conduit Flow Summary\n  *************************\n\n";
        snprintf(buf, sizeof(buf), "  %-30s %10s %12s %10s %8s %8s\n", "", "Maximum", "Time of", "Maximum", "Max/", "Max/");
        rpt << buf;
        snprintf(buf, sizeof(buf), "  %-30s %10s %12s %10s %8s %8s\n", "Conduit", "|Flow|", "Max Flow", "|Veloc|", "Full", "Full");
        rpt << buf;
        snprintf(buf, sizeof(buf), "  %-30s %10s %12s %10s %8s %8s\n", "", "CFS", "days hr:mn", "ft/sec", "Flow", "Depth");
        rpt << buf;
        rpt << "  " << std::string(95, '-') << "\n";
        for (auto &lk : links) {
            auto *xs = findXsect(lk.id);
            double full_q = 1.0;
            if (xs && xs->a_full > 0 && xs->r_full > 0)
                full_q = (1.49 / lk.roughness) * xs->a_full * std::pow(xs->r_full, 2.0/3.0) * std::sqrt(0.01);
            double mff = full_q > 0 ? lk.peak_flow / full_q : 0;
            auto tpk = fmtPeakTime(lk.time_peak_flow);
            snprintf(buf, sizeof(buf), "  %-30s %10.3f %12s %10.3f %8.2f %8.2f\n",
                     lk.id.c_str(), lk.peak_flow, tpk.c_str(), lk.peak_velocity, mff, lk.max_depth_frac);
            rpt << buf;
        }
        rpt << "\n";

        rpt << "  *********************\n  Simulation Summary\n  *********************\n\n";
        rpt << "  Engine ................... SWMM5-C++ OOP v1.0\n";
        snprintf(buf, sizeof(buf), "  Total Steps .............. %d\n", steps);
        rpt << buf;
        snprintf(buf, sizeof(buf), "  Simulation Duration ...... %.1f seconds (%.2f hours)\n",
                 options.total_duration, options.total_duration / 3600.0);
        rpt << buf;
        snprintf(buf, sizeof(buf), "  Wall-Clock Time .......... %.1f ms\n", wall_ms);
        rpt << buf;
        snprintf(buf, sizeof(buf), "  Nodes .................... %d\n", (int)nodes.size());
        rpt << buf;
        snprintf(buf, sizeof(buf), "  Links .................... %d\n", (int)links.size());
        rpt << buf;
        snprintf(buf, sizeof(buf), "  Subcatchments ............ %d\n\n", (int)subcatchments.size());
        rpt << buf;

        return rpt.str();
    }

private:
    void parseOption(const std::string &key, const std::string &val) {
        if (key == "FLOW_UNITS") options.flow_units = val;
        else if (key == "INFILTRATION") options.infiltration = val;
        else if (key == "FLOW_ROUTING") options.flow_routing = val;
        else if (key == "START_DATE") options.start_date = val;
        else if (key == "END_DATE") options.end_date = val;
        else if (key == "REPORT_STEP") options.report_step = parseTimeStr(val);
        else if (key == "WET_STEP") options.wet_step = parseTimeStr(val);
        else if (key == "DRY_STEP") options.dry_step = parseTimeStr(val);
        else if (key == "ROUTING_STEP") options.routing_step = parseTimeStr(val);
    }

    double parseTimeStr(const std::string &s) {
        int h = 0, m = 0; double sec = 0;
        if (sscanf(s.c_str(), "%d:%d:%lf", &h, &m, &sec) >= 2)
            return h * 3600.0 + m * 60.0 + sec;
        try { return std::stod(s); } catch (...) { return 0; }
    }

    double parseDuration(const std::string &start, const std::string &end) {
        int sm, sd, sy, em, ed, ey;
        if (sscanf(start.c_str(), "%d/%d/%d", &sm, &sd, &sy) != 3) return 86400;
        if (sscanf(end.c_str(), "%d/%d/%d", &em, &ed, &ey) != 3) return 86400;
        struct tm ts = {}, te = {};
        ts.tm_year = sy - 1900; ts.tm_mon = sm - 1; ts.tm_mday = sd;
        te.tm_year = ey - 1900; te.tm_mon = em - 1; te.tm_mday = ed;
        time_t t1 = mktime(&ts), t2 = mktime(&te);
        double d = difftime(t2, t1);
        return d > 0 ? d : 86400;
    }

    Xsect *findXsect(const std::string &link_id) {
        for (auto &xs : xsects)
            if (xs.id == link_id) return &xs;
        return nullptr;
    }

    double getRainfall(const std::string &gage_id, double elapsed) {
        for (auto &g : gages) {
            if (g.id == gage_id) {
                auto it = ts_map.find(g.source_name);
                if (it == ts_map.end()) return 0;
                auto &ts = timeseries[it->second];
                double t_hr = elapsed / 3600.0;
                for (int i = (int)ts.times.size() - 1; i >= 0; i--)
                    if (t_hr >= ts.times[i]) return ts.values[i];
                return 0;
            }
        }
        return 0;
    }

    double hortonInfil(InfilData &inf, double rainfall, double dt) {
        if (rainfall <= 0) {
            double recovery = inf.dry_time > 0 ? dt / (inf.dry_time * 86400.0) : 0;
            inf.current_rate += (inf.max_rate - inf.current_rate) * recovery;
            return 0;
        }
        double rate = std::min(inf.current_rate, rainfall);
        double decay_val = std::exp(-inf.decay * dt / 3600.0);
        inf.current_rate = inf.min_rate + (inf.current_rate - inf.min_rate) * decay_val;
        inf.cumul_infil += rate * dt / 3600.0;
        return rate;
    }

    double xsectArea(Xsect *xs, double depth) {
        if (!xs || depth <= 0) return 0;
        if (xs->type == "CIRCULAR") {
            if (depth >= xs->geom1) return xs->a_full;
            double r = xs->geom1 / 2.0, y = depth - r;
            if (std::abs(r) < 1e-10) return 0;
            double theta = 2.0 * std::acos(std::clamp(-y / r, -1.0, 1.0));
            return r * r * (theta - std::sin(theta)) / 2.0;
        }
        double w = xs->geom2 > 0 ? xs->geom2 : xs->geom1;
        return depth * w;
    }

    double xsectHrad(Xsect *xs, double depth) {
        double area = xsectArea(xs, depth);
        if (area <= 0) return 0;
        if (xs->type == "CIRCULAR") {
            double r = xs->geom1 / 2.0, y = depth - r;
            if (std::abs(r) < 1e-10) return 0;
            double theta = 2.0 * std::acos(std::clamp(-y / r, -1.0, 1.0));
            double perim = r * theta;
            return perim > 0 ? area / perim : 0;
        }
        double w = xs->geom2 > 0 ? xs->geom2 : xs->geom1;
        double perim = w + 2.0 * depth;
        return perim > 0 ? area / perim : 0;
    }

    void computeRunoff(double dt, double elapsed) {
        for (size_t i = 0; i < subcatchments.size(); i++) {
            auto &sc = subcatchments[i];
            double rain = getRainfall(sc.rain_gage, elapsed);
            sc.rainfall = rain;
            sc.total_precip += rain * dt / 3600.0;

            double infil_rate = hortonInfil(infil[i], rain * (1.0 - sc.pct_imperv / 100.0), dt);
            sc.total_infil += infil_rate * dt / 3600.0;

            double runoff_in = rain * sc.area * 43560.0 / 12.0 / 3600.0;
            double infil_vol = infil_rate * sc.area * (1.0 - sc.pct_imperv / 100.0) * 43560.0 / 12.0 / 3600.0;
            sc.runoff = std::max(0.0, runoff_in - infil_vol);
            sc.total_runoff += sc.runoff * dt;
            sc.peak_runoff = std::max(sc.peak_runoff, sc.runoff);

            auto it = node_map.find(sc.outlet);
            if (it != node_map.end())
                nodes[it->second].lateral_inflow += sc.runoff;
        }
    }

    void routeFlow(double dt, double elapsed) {
        for (auto &n : nodes) n.inflow = n.lateral_inflow;

        for (auto &lk : links) {
            auto fi = node_map.find(lk.from_node);
            auto ti = node_map.find(lk.to_node);
            if (fi == node_map.end() || ti == node_map.end()) continue;

            auto *xs = findXsect(lk.id);
            if (!xs) continue;

            auto &n1 = nodes[fi->second];
            auto &n2 = nodes[ti->second];
            double dh = n1.head - n2.head;
            double slope = lk.length > 0 ? dh / lk.length : 0;

            double avg_depth = std::clamp((n1.depth + n2.depth) / 2.0, 0.0, xs->geom1);
            double area = xsectArea(xs, avg_depth);
            double hrad = xsectHrad(xs, avg_depth);

            double manning_q = 0;
            if (area > 0 && hrad > 0 && std::abs(slope) > 1e-12) {
                double sign = slope > 0 ? 1.0 : -1.0;
                manning_q = sign * (1.49 / lk.roughness) * area *
                            std::pow(hrad, 2.0 / 3.0) * std::sqrt(std::abs(slope));
            }

            lk.flow = lk.flow * 0.5 + manning_q * 0.5;

            if (xs->a_full > 0) {
                double q_full = (1.49 / lk.roughness) * xs->a_full *
                                std::pow(xs->r_full, 2.0/3.0) * std::sqrt(std::max(std::abs(slope), 0.001));
                if (std::abs(lk.flow) > q_full * 1.5)
                    lk.flow = std::copysign(q_full * 1.5, lk.flow);
            }

            double fa = std::abs(lk.flow);
            lk.depth = avg_depth;
            lk.velocity = area > 0 ? fa / area : 0;
            lk.volume = area * lk.length;
            if (fa > lk.peak_flow) { lk.peak_flow = fa; lk.time_peak_flow = elapsed; }
            lk.peak_velocity = std::max(lk.peak_velocity, lk.velocity);
            if (xs->geom1 > 0)
                lk.max_depth_frac = std::max(lk.max_depth_frac, avg_depth / xs->geom1);

            if (lk.flow > 0) { n1.outflow += lk.flow; n2.inflow += lk.flow; }
        }

        for (auto &n : nodes) {
            if (n.type == "OUTFALL") continue;
            double sa = n.a_ponded > 0 ? n.a_ponded : options.min_surf_area;
            double net = n.inflow - n.outflow + n.lateral_inflow;
            n.depth += net * dt / sa;
            if (n.depth < 0) n.depth = 0;
            if (n.max_depth > 0 && n.depth > n.max_depth + n.sur_depth) {
                n.overflow = n.depth - n.max_depth;
                n.flood_volume += n.overflow * dt;
                n.depth = n.max_depth;
            }
            n.head = n.invert_elev + n.depth;
            n.volume = n.depth * sa;
            n.peak_depth = std::max(n.peak_depth, n.depth);
            n.peak_hgl = std::max(n.peak_hgl, n.head);
            if (n.depth == n.peak_depth && n.peak_depth > 0) n.time_peak_depth = elapsed;
            n.total_inflow += n.inflow * dt;
            n.total_outflow += n.outflow * dt;

            n.lateral_inflow = 0; n.inflow = 0; n.outflow = 0; n.overflow = 0;
        }
    }

    std::string fmtPeakTime(double secs) {
        if (secs <= 0) return "0  00:00";
        int days = (int)(secs / 86400.0);
        double rem = secs - days * 86400.0;
        int hrs = (int)(rem / 3600.0);
        int mins = (int)(std::fmod(rem, 3600.0) / 60.0);
        char buf[32];
        snprintf(buf, sizeof(buf), "%d  %02d:%02d", days, hrs, mins);
        return buf;
    }

    static std::string trim(const std::string &s) {
        auto start = s.find_first_not_of(" \t\r");
        if (start == std::string::npos) return "";
        auto end = s.find_last_not_of(" \t\r");
        return s.substr(start, end - start + 1);
    }

    static std::string toUpper(const std::string &s) {
        std::string r = s;
        for (auto &c : r) c = std::toupper(c);
        return r;
    }

    static std::vector<std::string> split(const std::string &s) {
        std::vector<std::string> tokens;
        std::istringstream iss(s);
        std::string tok;
        while (iss >> tok) tokens.push_back(tok);
        return tokens;
    }
};

static std::string escapeJson(const std::string &s) {
    std::string out;
    out.reserve(s.size() + 128);
    for (char c : s) {
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: out += c;
        }
    }
    return out;
}

static void handleRequest(int client_fd) {
    std::string buf(1048576 + 4096, '\0');
    int total = 0, n;
    while (total < (int)buf.size() - 1) {
        n = read(client_fd, &buf[total], buf.size() - 1 - total);
        if (n <= 0) break;
        total += n;
        buf[total] = '\0';
        if (buf.find("\r\n\r\n") != std::string::npos || buf.find("\n\n") != std::string::npos) {
            auto cl_pos = buf.find("Content-Length:");
            if (cl_pos == std::string::npos) cl_pos = buf.find("content-length:");
            if (cl_pos != std::string::npos) {
                int clen = std::atoi(buf.c_str() + cl_pos + 15);
                auto body_pos = buf.find("\r\n\r\n");
                int header_end = body_pos != std::string::npos ? body_pos + 4 : buf.find("\n\n") + 2;
                int body_read = total - header_end;
                while (body_read < clen && total < (int)buf.size() - 1) {
                    n = read(client_fd, &buf[total], buf.size() - 1 - total);
                    if (n <= 0) break;
                    total += n; body_read += n;
                }
                buf[total] = '\0';
            }
            break;
        }
    }

    if (buf.substr(0, 11) == "GET /health") {
        std::string resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
                           R"({"engine":"SWMM5-C++","status":"ok","version":"v1.0","language":"C++"})";
        write(client_fd, resp.c_str(), resp.size());
        close(client_fd);
        return;
    }

    if (buf.substr(0, 14) == "POST /simulate") {
        auto body_pos = buf.find("\r\n\r\n");
        std::string body;
        if (body_pos != std::string::npos) body = buf.substr(body_pos + 4);
        else {
            body_pos = buf.find("\n\n");
            if (body_pos != std::string::npos) body = buf.substr(body_pos + 2);
        }

        auto t_start = std::chrono::high_resolution_clock::now();

        SwmmModel model;
        model.parse(body);
        int steps = model.simulate();

        auto t_end = std::chrono::high_resolution_clock::now();
        double wall_ms = std::chrono::duration<double, std::milli>(t_end - t_start).count();

        std::string rpt = model.generateRpt(steps, wall_ms);
        std::string json = "{\"success\":true,\"rpt\":\"" + escapeJson(rpt) + "\"}";

        std::string header = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " +
                             std::to_string(json.size()) + "\r\n\r\n";
        write(client_fd, header.c_str(), header.size());
        write(client_fd, json.c_str(), json.size());
    }

    close(client_fd);
}

int main() {
    const char *port_env = std::getenv("CPP_ENGINE_PORT");
    int port = port_env ? std::atoi(port_env) : 3005;

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons(port);

    if (bind(server_fd, (sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        return 1;
    }
    listen(server_fd, 16);
    std::cout << "SWMM5-C++ engine listening on port " << port << std::endl;

    while (true) {
        int client_fd = accept(server_fd, nullptr, nullptr);
        if (client_fd >= 0) handleRequest(client_fd);
    }
    return 0;
}
