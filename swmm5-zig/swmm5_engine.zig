const std = @import("std");
const net = std.net;
const mem = std.mem;
const math = std.math;
const fmt = std.fmt;
const Allocator = std.mem.Allocator;

const PI: f64 = 3.14159265358979323846;
const MAX_NODES = 500;
const MAX_LINKS = 500;
const MAX_SC = 200;
const MAX_GAGES = 50;
const MAX_XS = 500;
const MAX_TS = 50;
const MAX_TV = 200;

const Options = struct {
    flow_units: [32]u8 = [_]u8{0} ** 32,
    infiltration: [32]u8 = [_]u8{0} ** 32,
    flow_routing: [32]u8 = [_]u8{0} ** 32,
    start_date: [16]u8 = [_]u8{0} ** 16,
    end_date: [16]u8 = [_]u8{0} ** 16,
    report_step: f64 = 900,
    wet_step: f64 = 300,
    dry_step: f64 = 3600,
    routing_step: f64 = 30,
    total_duration: f64 = 86400,
    min_surf_area: f64 = 12.566,
};

const Node = struct {
    id: [64]u8 = [_]u8{0} ** 64,
    node_type: [16]u8 = [_]u8{0} ** 16,
    invert_elev: f64 = 0, max_depth: f64 = 0, init_depth: f64 = 0,
    sur_depth: f64 = 0, a_ponded: f64 = 0,
    depth: f64 = 0, head: f64 = 0, volume: f64 = 0,
    inflow: f64 = 0, outflow: f64 = 0, overflow: f64 = 0, lateral_inflow: f64 = 0,
    peak_depth: f64 = 0, peak_hgl: f64 = 0,
    total_inflow: f64 = 0, total_outflow: f64 = 0, flood_volume: f64 = 0,
};

const Link = struct {
    id: [64]u8 = [_]u8{0} ** 64,
    from_node: [64]u8 = [_]u8{0} ** 64,
    to_node: [64]u8 = [_]u8{0} ** 64,
    length: f64 = 0, roughness: f64 = 0, in_offset: f64 = 0, out_offset: f64 = 0,
    flow: f64 = 0, depth: f64 = 0, velocity: f64 = 0, volume: f64 = 0,
    peak_flow: f64 = 0, peak_velocity: f64 = 0, time_peak_flow: f64 = 0,
    max_depth_frac: f64 = 0, full_depth: f64 = 0, full_area: f64 = 0,
};

const Xsect = struct {
    id: [64]u8 = [_]u8{0} ** 64,
    xtype: [16]u8 = [_]u8{0} ** 16,
    geom1: f64 = 0, geom2: f64 = 0, a_full: f64 = 0, r_full: f64 = 0,
};

const Subcatch = struct {
    id: [64]u8 = [_]u8{0} ** 64,
    rain_gage: [64]u8 = [_]u8{0} ** 64,
    outlet: [64]u8 = [_]u8{0} ** 64,
    area: f64 = 0, pct_imperv: f64 = 0, width: f64 = 0, slope: f64 = 0,
    runoff: f64 = 0, total_precip: f64 = 0, total_runoff: f64 = 0,
    total_infil: f64 = 0, peak_runoff: f64 = 0,
};

const Infil = struct {
    max_rate: f64 = 3, min_rate: f64 = 0.5, decay: f64 = 4,
    dry_time: f64 = 7, current_rate: f64 = 3, cumul_infil: f64 = 0,
};

const Gage = struct {
    id: [64]u8 = [_]u8{0} ** 64,
    source_name: [64]u8 = [_]u8{0} ** 64,
};

const TSeries = struct {
    id: [64]u8 = [_]u8{0} ** 64,
    times: [MAX_TV]f64 = [_]f64{0} ** MAX_TV,
    values: [MAX_TV]f64 = [_]f64{0} ** MAX_TV,
    count: usize = 0,
};

const Model = struct {
    options: Options = Options{},
    nodes: [MAX_NODES]Node = [_]Node{Node{}} ** MAX_NODES,
    links: [MAX_LINKS]Link = [_]Link{Link{}} ** MAX_LINKS,
    xsects: [MAX_XS]Xsect = [_]Xsect{Xsect{}} ** MAX_XS,
    subcatchments: [MAX_SC]Subcatch = [_]Subcatch{Subcatch{}} ** MAX_SC,
    infils: [MAX_SC]Infil = [_]Infil{Infil{}} ** MAX_SC,
    gages: [MAX_GAGES]Gage = [_]Gage{Gage{}} ** MAX_GAGES,
    tseries: [MAX_TS]TSeries = [_]TSeries{TSeries{}} ** MAX_TS,
    num_nodes: usize = 0, num_links: usize = 0, num_xs: usize = 0,
    num_sc: usize = 0, num_gages: usize = 0, num_ts: usize = 0,
};

fn copyStr(dest: []u8, src: []const u8) void {
    const len = @min(dest.len - 1, src.len);
    @memcpy(dest[0..len], src[0..len]);
    dest[len] = 0;
}

fn strSlice(buf: []const u8) []const u8 {
    for (buf, 0..) |c, i| {
        if (c == 0) return buf[0..i];
    }
    return buf;
}

fn streql(a: []const u8, b: []const u8) bool {
    return mem.eql(u8, strSlice(a), b);
}

fn safeFloat(s: []const u8) f64 {
    return fmt.parseFloat(f64, s) catch 0.0;
}

fn parseTimeStr(s: []const u8) f64 {
    if (mem.indexOf(u8, s, ":")) |col| {
        const h = safeFloat(s[0..col]);
        const rest = s[col + 1 ..];
        const m_val = safeFloat(rest);
        return h * 3600 + m_val * 60;
    }
    return safeFloat(s);
}

fn findNode(m: *Model, id: []const u8) ?usize {
    for (0..m.num_nodes) |i| {
        if (mem.eql(u8, strSlice(&m.nodes[i].id), id)) return i;
    }
    return null;
}

fn findXsect(m: *Model, id: []const u8) ?usize {
    for (0..m.num_xs) |i| {
        if (mem.eql(u8, strSlice(&m.xsects[i].id), id)) return i;
    }
    return null;
}

fn findTS(m: *Model, id: []const u8) ?usize {
    for (0..m.num_ts) |i| {
        if (mem.eql(u8, strSlice(&m.tseries[i].id), id)) return i;
    }
    return null;
}

fn getRainfall(m: *Model, gage_id: []const u8, elapsed: f64) f64 {
    for (0..m.num_gages) |gi| {
        if (mem.eql(u8, strSlice(&m.gages[gi].id), gage_id)) {
            const ti = findTS(m, strSlice(&m.gages[gi].source_name)) orelse return 0;
            const ts = &m.tseries[ti];
            const t_hr = elapsed / 3600.0;
            var i: usize = ts.count;
            while (i > 0) {
                i -= 1;
                if (t_hr >= ts.times[i]) return ts.values[i];
            }
            return 0;
        }
    }
    return 0;
}

fn hortonInfil(inf: *Infil, rainfall: f64, dt: f64) f64 {
    if (rainfall <= 0) {
        const rec = if (inf.dry_time > 0) dt / (inf.dry_time * 86400) else 0.0;
        inf.current_rate += (inf.max_rate - inf.current_rate) * rec;
        return 0;
    }
    const rate = @min(inf.current_rate, rainfall);
    inf.current_rate = inf.min_rate + (inf.current_rate - inf.min_rate) * @exp(-inf.decay * dt / 3600);
    inf.cumul_infil += rate * dt / 3600;
    return rate;
}

fn xsectArea(m: *Model, xi: usize, depth: f64) f64 {
    if (depth <= 0) return 0;
    const xs = &m.xsects[xi];
    if (streql(&xs.xtype, "CIRCULAR")) {
        if (depth >= xs.geom1) return xs.a_full;
        const r = xs.geom1 / 2;
        const y = depth - r;
        if (@abs(r) < 1e-10) return 0;
        var arg = -y / r;
        arg = @max(-1.0, @min(1.0, arg));
        const theta = 2 * math.acos(arg);
        return r * r * (theta - @sin(theta)) / 2;
    }
    const w = if (xs.geom2 > 0) xs.geom2 else xs.geom1;
    return depth * w;
}

fn xsectHrad(m: *Model, xi: usize, depth: f64) f64 {
    const area = xsectArea(m, xi, depth);
    if (area <= 0) return 0;
    const xs = &m.xsects[xi];
    if (streql(&xs.xtype, "CIRCULAR")) {
        const r = xs.geom1 / 2;
        const y = depth - r;
        if (@abs(r) < 1e-10) return 0;
        var arg = -y / r;
        arg = @max(-1.0, @min(1.0, arg));
        const theta = 2 * math.acos(arg);
        const perim = r * theta;
        return if (perim > 0) area / perim else 0;
    }
    const w = if (xs.geom2 > 0) xs.geom2 else xs.geom1;
    const perim = w + 2 * depth;
    return if (perim > 0) area / perim else 0;
}

fn tokenize(line: []const u8, tokens: *[20][64]u8) usize {
    var ntok: usize = 0;
    var in_token = false;
    var start: usize = 0;
    for (line, 0..) |c, i| {
        if (c != ' ' and c != '\t' and c != '\r') {
            if (!in_token) {
                start = i;
                in_token = true;
            }
        } else {
            if (in_token) {
                if (ntok < 20) {
                    tokens[ntok] = [_]u8{0} ** 64;
                    copyStr(&tokens[ntok], line[start..i]);
                    ntok += 1;
                }
                in_token = false;
            }
        }
    }
    if (in_token and ntok < 20) {
        tokens[ntok] = [_]u8{0} ** 64;
        copyStr(&tokens[ntok], line[start..]);
        ntok += 1;
    }
    return ntok;
}

fn toUpper(buf: []u8) void {
    for (buf) |*c| {
        if (c.* >= 'a' and c.* <= 'z') c.* -= 32;
    }
}

fn parseInp(m: *Model, text: []const u8) void {
    copyStr(&m.options.flow_units, "CFS");
    copyStr(&m.options.infiltration, "HORTON");
    copyStr(&m.options.flow_routing, "DYNWAVE");
    copyStr(&m.options.start_date, "01/01/2024");
    copyStr(&m.options.end_date, "01/02/2024");

    var section: [32]u8 = [_]u8{0} ** 32;
    var line_start: usize = 0;
    var i: usize = 0;
    while (i <= text.len) : (i += 1) {
        if (i == text.len or text[i] == '\n') {
            const line = text[line_start..i];
            line_start = i + 1;
            if (line.len == 0) continue;
            var trimmed = line;
            while (trimmed.len > 0 and (trimmed[0] == ' ' or trimmed[0] == '\t' or trimmed[0] == '\r')) trimmed = trimmed[1..];
            while (trimmed.len > 0 and (trimmed[trimmed.len - 1] == ' ' or trimmed[trimmed.len - 1] == '\t' or trimmed[trimmed.len - 1] == '\r')) trimmed = trimmed[0 .. trimmed.len - 1];
            if (trimmed.len == 0 or trimmed[0] == ';') continue;
            if (trimmed[0] == '[') {
                if (mem.indexOf(u8, trimmed, "]")) |end_bracket| {
                    section = [_]u8{0} ** 32;
                    copyStr(&section, trimmed[1..end_bracket]);
                    toUpper(&section);
                }
                continue;
            }
            var tokens: [20][64]u8 = undefined;
            for (&tokens) |*t| t.* = [_]u8{0} ** 64;
            const ntok = tokenize(trimmed, &tokens);
            if (ntok == 0) continue;
            toUpper(&tokens[0]);

            if (streql(&section, "OPTIONS") and ntok >= 2) {
                if (streql(&tokens[0], "FLOW_UNITS")) copyStr(&m.options.flow_units, strSlice(&tokens[1]))
                else if (streql(&tokens[0], "INFILTRATION")) copyStr(&m.options.infiltration, strSlice(&tokens[1]))
                else if (streql(&tokens[0], "FLOW_ROUTING")) copyStr(&m.options.flow_routing, strSlice(&tokens[1]))
                else if (streql(&tokens[0], "START_DATE")) copyStr(&m.options.start_date, strSlice(&tokens[1]))
                else if (streql(&tokens[0], "END_DATE")) copyStr(&m.options.end_date, strSlice(&tokens[1]))
                else if (streql(&tokens[0], "REPORT_STEP")) { m.options.report_step = parseTimeStr(strSlice(&tokens[1])); }
                else if (streql(&tokens[0], "ROUTING_STEP")) { m.options.routing_step = parseTimeStr(strSlice(&tokens[1])); };
            } else if (streql(&section, "RAINGAGES") and ntok >= 6 and m.num_gages < MAX_GAGES) {
                copyStr(&m.gages[m.num_gages].id, strSlice(&tokens[0]));
                copyStr(&m.gages[m.num_gages].source_name, strSlice(&tokens[5]));
                m.num_gages += 1;
            } else if (streql(&section, "SUBCATCHMENTS") and ntok >= 7 and m.num_sc < MAX_SC) {
                const si = m.num_sc;
                copyStr(&m.subcatchments[si].id, strSlice(&tokens[0]));
                copyStr(&m.subcatchments[si].rain_gage, strSlice(&tokens[1]));
                copyStr(&m.subcatchments[si].outlet, strSlice(&tokens[2]));
                m.subcatchments[si].area = safeFloat(strSlice(&tokens[3]));
                m.subcatchments[si].pct_imperv = safeFloat(strSlice(&tokens[4]));
                m.subcatchments[si].width = safeFloat(strSlice(&tokens[5]));
                m.subcatchments[si].slope = safeFloat(strSlice(&tokens[6]));
                m.infils[si] = Infil{};
                m.num_sc += 1;
            } else if (streql(&section, "INFILTRATION") and ntok >= 4) {
                for (0..m.num_sc) |si| {
                    if (mem.eql(u8, strSlice(&m.subcatchments[si].id), strSlice(&tokens[0]))) {
                        m.infils[si].max_rate = safeFloat(strSlice(&tokens[1]));
                        m.infils[si].min_rate = safeFloat(strSlice(&tokens[2]));
                        m.infils[si].decay = safeFloat(strSlice(&tokens[3]));
                        m.infils[si].dry_time = if (ntok > 4) safeFloat(strSlice(&tokens[4])) else 7;
                        m.infils[si].current_rate = m.infils[si].max_rate;
                        break;
                    }
                }
            } else if (streql(&section, "JUNCTIONS") and ntok >= 2 and m.num_nodes < MAX_NODES) {
                const ni = m.num_nodes;
                copyStr(&m.nodes[ni].id, strSlice(&tokens[0]));
                copyStr(&m.nodes[ni].node_type, "JUNCTION");
                m.nodes[ni].invert_elev = safeFloat(strSlice(&tokens[1]));
                m.nodes[ni].max_depth = if (ntok > 2) safeFloat(strSlice(&tokens[2])) else 0;
                m.nodes[ni].init_depth = if (ntok > 3) safeFloat(strSlice(&tokens[3])) else 0;
                m.nodes[ni].sur_depth = if (ntok > 4) safeFloat(strSlice(&tokens[4])) else 0;
                m.nodes[ni].a_ponded = if (ntok > 5) safeFloat(strSlice(&tokens[5])) else 0;
                m.nodes[ni].depth = m.nodes[ni].init_depth;
                m.nodes[ni].head = m.nodes[ni].invert_elev + m.nodes[ni].init_depth;
                m.num_nodes += 1;
            } else if (streql(&section, "OUTFALLS") and ntok >= 3 and m.num_nodes < MAX_NODES) {
                const ni = m.num_nodes;
                copyStr(&m.nodes[ni].id, strSlice(&tokens[0]));
                copyStr(&m.nodes[ni].node_type, "OUTFALL");
                m.nodes[ni].invert_elev = safeFloat(strSlice(&tokens[1]));
                m.nodes[ni].head = m.nodes[ni].invert_elev;
                m.num_nodes += 1;
            } else if (streql(&section, "CONDUITS") and ntok >= 6 and m.num_links < MAX_LINKS) {
                const li = m.num_links;
                copyStr(&m.links[li].id, strSlice(&tokens[0]));
                copyStr(&m.links[li].from_node, strSlice(&tokens[1]));
                copyStr(&m.links[li].to_node, strSlice(&tokens[2]));
                m.links[li].length = safeFloat(strSlice(&tokens[3]));
                m.links[li].roughness = safeFloat(strSlice(&tokens[4]));
                m.links[li].in_offset = safeFloat(strSlice(&tokens[5]));
                m.links[li].out_offset = if (ntok > 6) safeFloat(strSlice(&tokens[6])) else 0;
                m.num_links += 1;
            } else if (streql(&section, "XSECTIONS") and ntok >= 3 and m.num_xs < MAX_XS) {
                const xi = m.num_xs;
                copyStr(&m.xsects[xi].id, strSlice(&tokens[0]));
                copyStr(&m.xsects[xi].xtype, strSlice(&tokens[1]));
                toUpper(&m.xsects[xi].xtype);
                m.xsects[xi].geom1 = safeFloat(strSlice(&tokens[2]));
                m.xsects[xi].geom2 = if (ntok > 3) safeFloat(strSlice(&tokens[3])) else 0;
                if (streql(&m.xsects[xi].xtype, "CIRCULAR")) {
                    m.xsects[xi].a_full = PI * std.math.pow(m.xsects[xi].geom1 / 2, 2);
                    m.xsects[xi].r_full = m.xsects[xi].geom1 / 4;
                } else {
                    const w = if (m.xsects[xi].geom2 > 0) m.xsects[xi].geom2 else m.xsects[xi].geom1;
                    m.xsects[xi].a_full = m.xsects[xi].geom1 * w;
                    const p = 2 * m.xsects[xi].geom1 + 2 * w;
                    m.xsects[xi].r_full = if (p > 0) m.xsects[xi].a_full / p else 0;
                }
                for (0..m.num_links) |li| {
                    if (mem.eql(u8, strSlice(&m.links[li].id), strSlice(&tokens[0]))) {
                        m.links[li].full_depth = m.xsects[xi].geom1;
                        m.links[li].full_area = m.xsects[xi].a_full;
                        break;
                    }
                }
                m.num_xs += 1;
            } else if (streql(&section, "TIMESERIES") and ntok >= 3) {
                var ti = findTS(m, strSlice(&tokens[0]));
                if (ti == null) {
                    if (m.num_ts < MAX_TS) {
                        ti = m.num_ts;
                        copyStr(&m.tseries[m.num_ts].id, strSlice(&tokens[0]));
                        m.num_ts += 1;
                    }
                }
                if (ti) |tsi| {
                    var k: usize = 1;
                    while (k + 1 < ntok) : (k += 2) {
                        if (m.tseries[tsi].count < MAX_TV) {
                            var tv = safeFloat(strSlice(&tokens[k]));
                            if (tv == 0 and mem.indexOf(u8, strSlice(&tokens[k]), ":") != null) {
                                tv = parseTimeStr(strSlice(&tokens[k])) / 3600.0;
                            }
                            m.tseries[tsi].times[m.tseries[tsi].count] = tv;
                            m.tseries[tsi].values[m.tseries[tsi].count] = safeFloat(strSlice(&tokens[k + 1]));
                            m.tseries[tsi].count += 1;
                        }
                    }
                }
            }
        }
    }
    m.options.total_duration = 86400;
}

fn simulate(m: *Model) struct { steps: usize, elapsed: f64 } {
    const dt = m.options.routing_step;
    const total = m.options.total_duration;
    var elapsed: f64 = 0;
    var steps: usize = 0;
    while (elapsed < total) {
        for (0..m.num_sc) |si| {
            const rain = getRainfall(m, strSlice(&m.subcatchments[si].rain_gage), elapsed);
            m.subcatchments[si].total_precip += rain * dt / 3600;
            const infil_rate = hortonInfil(&m.infils[si], rain * (1 - m.subcatchments[si].pct_imperv / 100), dt);
            m.subcatchments[si].total_infil += infil_rate * dt / 3600;
            const runoff_in = rain * m.subcatchments[si].area * 43560 / 12 / 3600;
            const infil_vol = infil_rate * m.subcatchments[si].area * (1 - m.subcatchments[si].pct_imperv / 100) * 43560 / 12 / 3600;
            const runoff = @max(0.0, runoff_in - infil_vol);
            m.subcatchments[si].runoff = runoff;
            m.subcatchments[si].total_runoff += runoff * dt;
            m.subcatchments[si].peak_runoff = @max(m.subcatchments[si].peak_runoff, runoff);
            if (findNode(m, strSlice(&m.subcatchments[si].outlet))) |ni| {
                m.nodes[ni].lateral_inflow += runoff;
            }
        }
        for (0..m.num_nodes) |ni| m.nodes[ni].inflow = m.nodes[ni].lateral_inflow;
        for (0..m.num_links) |li| {
            const fi = findNode(m, strSlice(&m.links[li].from_node)) orelse continue;
            const ti = findNode(m, strSlice(&m.links[li].to_node)) orelse continue;
            const xi = findXsect(m, strSlice(&m.links[li].id)) orelse continue;
            const slope = if (m.links[li].length > 0) (m.nodes[fi].head - m.nodes[ti].head) / m.links[li].length else 0.0;
            var avg_d = (m.nodes[fi].depth + m.nodes[ti].depth) / 2;
            avg_d = @max(0.0, @min(m.xsects[xi].geom1, avg_d));
            const area = xsectArea(m, xi, avg_d);
            const hrad = xsectHrad(m, xi, avg_d);
            var manning_q: f64 = 0;
            if (area > 0 and hrad > 0 and @abs(slope) > 1e-12) {
                const sign: f64 = if (slope > 0) 1.0 else -1.0;
                manning_q = sign * (1.49 / m.links[li].roughness) * area * std.math.pow(hrad, 2.0 / 3.0) * @sqrt(@abs(slope));
            }
            m.links[li].flow = m.links[li].flow * 0.5 + manning_q * 0.5;
            if (m.xsects[xi].a_full > 0) {
                const sl = @max(@abs(slope), 0.001);
                const q_full = (1.49 / m.links[li].roughness) * m.xsects[xi].a_full * std.math.pow(m.xsects[xi].r_full, 2.0 / 3.0) * @sqrt(sl);
                if (@abs(m.links[li].flow) > q_full * 1.5) {
                    m.links[li].flow = (if (m.links[li].flow > 0) @as(f64, 1.0) else @as(f64, -1.0)) * q_full * 1.5;
                }
            }
            m.links[li].depth = avg_d;
            m.links[li].velocity = if (area > 0) @abs(m.links[li].flow) / area else 0;
            m.links[li].volume = area * m.links[li].length;
            if (@abs(m.links[li].flow) > m.links[li].peak_flow) {
                m.links[li].peak_flow = @abs(m.links[li].flow);
                m.links[li].time_peak_flow = elapsed;
            }
            m.links[li].peak_velocity = @max(m.links[li].peak_velocity, m.links[li].velocity);
            if (m.xsects[xi].geom1 > 0) m.links[li].max_depth_frac = @max(m.links[li].max_depth_frac, avg_d / m.xsects[xi].geom1);
            if (m.links[li].flow > 0) {
                m.nodes[fi].outflow += m.links[li].flow;
                m.nodes[ti].inflow += m.links[li].flow;
            }
        }
        for (0..m.num_nodes) |ni| {
            if (streql(&m.nodes[ni].node_type, "OUTFALL")) continue;
            const sa = if (m.nodes[ni].a_ponded > 0) m.nodes[ni].a_ponded else m.options.min_surf_area;
            const net_flow = m.nodes[ni].inflow - m.nodes[ni].outflow + m.nodes[ni].lateral_inflow;
            m.nodes[ni].depth += net_flow * dt / sa;
            m.nodes[ni].depth = @max(0.0, m.nodes[ni].depth);
            if (m.nodes[ni].max_depth > 0 and m.nodes[ni].depth > m.nodes[ni].max_depth + m.nodes[ni].sur_depth) {
                m.nodes[ni].overflow = m.nodes[ni].depth - m.nodes[ni].max_depth;
                m.nodes[ni].flood_volume += m.nodes[ni].overflow * dt;
                m.nodes[ni].depth = m.nodes[ni].max_depth;
            }
            m.nodes[ni].head = m.nodes[ni].invert_elev + m.nodes[ni].depth;
            m.nodes[ni].volume = m.nodes[ni].depth * sa;
            m.nodes[ni].peak_depth = @max(m.nodes[ni].peak_depth, m.nodes[ni].depth);
            m.nodes[ni].peak_hgl = @max(m.nodes[ni].peak_hgl, m.nodes[ni].head);
            m.nodes[ni].total_inflow += m.nodes[ni].inflow * dt;
            m.nodes[ni].total_outflow += m.nodes[ni].outflow * dt;
            m.nodes[ni].lateral_inflow = 0;
            m.nodes[ni].inflow = 0;
            m.nodes[ni].outflow = 0;
            m.nodes[ni].overflow = 0;
        }
        elapsed += dt;
        steps += 1;
    }
    return .{ .steps = steps, .elapsed = elapsed };
}

fn generateRpt(m: *Model, steps: usize, wall_ms: f64, buf: []u8) usize {
    var fbs = std.io.fixedBufferStream(buf);
    const w = fbs.writer();
    w.print("  EPA STORM WATER MANAGEMENT MODEL -- ZIG ENGINE\n", .{}) catch {};
    w.print("  SWMM5-Zig v1.0 -- SWMM5 Rosetta Stone Project\n", .{}) catch {};
    w.print("  ============================================================\n\n", .{}) catch {};
    w.print("  ****************\n  Analysis Options\n  ****************\n", .{}) catch {};
    w.print("  Flow Units ............... {s}\n", .{strSlice(&m.options.flow_units)}) catch {};
    w.print("  Flow Routing Method ...... {s}\n", .{strSlice(&m.options.flow_routing)}) catch {};
    w.print("  Infiltration Method ...... {s}\n", .{strSlice(&m.options.infiltration)}) catch {};
    w.print("  Starting Date ............ {s}\n", .{strSlice(&m.options.start_date)}) catch {};
    w.print("  Ending Date .............. {s}\n", .{strSlice(&m.options.end_date)}) catch {};
    w.print("  Routing Time Step ........ {d:.2} sec\n\n", .{m.options.routing_step}) catch {};
    w.print("  ******************\n  Node Depth Summary\n  ******************\n\n", .{}) catch {};
    for (0..m.num_nodes) |ni| {
        w.print("  {s: <30} {d:10.3} {d:10.3} {d:12.3}\n", .{ strSlice(&m.nodes[ni].id), m.nodes[ni].peak_depth * 0.4, m.nodes[ni].peak_depth, m.nodes[ni].peak_hgl }) catch {};
    }
    w.print("\n  *************************\n  Conduit Flow Summary\n  *************************\n\n", .{}) catch {};
    for (0..m.num_links) |li| {
        const xi = findXsect(m, strSlice(&m.links[li].id));
        var full_q: f64 = 1;
        if (xi) |x| {
            if (m.xsects[x].a_full > 0 and m.xsects[x].r_full > 0)
                full_q = (1.49 / m.links[li].roughness) * m.xsects[x].a_full * std.math.pow(m.xsects[x].r_full, 2.0 / 3.0) * @sqrt(0.01);
        }
        const mff = if (full_q > 0) m.links[li].peak_flow / full_q else 0.0;
        w.print("  {s: <30} {d:10.3} {d:12.1} {d:10.3} {d:8.2} {d:8.2}\n", .{ strSlice(&m.links[li].id), m.links[li].peak_flow, m.links[li].time_peak_flow, m.links[li].peak_velocity, mff, m.links[li].max_depth_frac }) catch {};
    }
    w.print("\n  *********************\n  Simulation Summary\n  *********************\n\n", .{}) catch {};
    w.print("  Engine ................... SWMM5-Zig v1.0\n", .{}) catch {};
    w.print("  Total Steps .............. {d}\n", .{steps}) catch {};
    w.print("  Simulation Duration ...... {d:.1} seconds ({d:.2} hours)\n", .{ m.options.total_duration, m.options.total_duration / 3600 }) catch {};
    w.print("  Wall-Clock Time .......... {d:.1} ms\n", .{wall_ms}) catch {};
    w.print("  Nodes .................... {d}\n", .{m.num_nodes}) catch {};
    w.print("  Links .................... {d}\n", .{m.num_links}) catch {};
    w.print("  Subcatchments ............ {d}\n", .{m.num_sc}) catch {};
    return fbs.pos;
}

fn escapeJson(src: []const u8, dst: []u8) usize {
    var j: usize = 0;
    for (src) |c| {
        if (j + 2 >= dst.len) break;
        switch (c) {
            '\\' => { dst[j] = '\\'; dst[j + 1] = '\\'; j += 2; },
            '"' => { dst[j] = '\\'; dst[j + 1] = '"'; j += 2; },
            '\n' => { dst[j] = '\\'; dst[j + 1] = 'n'; j += 2; },
            '\r' => { dst[j] = '\\'; dst[j + 1] = 'r'; j += 2; },
            '\t' => { dst[j] = '\\'; dst[j + 1] = 't'; j += 2; },
            else => { dst[j] = c; j += 1; },
        }
    }
    return j;
}

pub fn main() !void {
    const port_str = std.posix.getenv("ZIG_ENGINE_PORT") orelse "3015";
    const port: u16 = fmt.parseInt(u16, port_str, 10) catch 3015;

    var server = try net.Address.resolveIp("127.0.0.1", port);
    const listener = try server.listen(.{ .reuse_address = true });

    const stdout = std.io.getStdOut().writer();
    try stdout.print("SWMM5-Zig engine listening on port {d}\n", .{port});

    while (true) {
        const conn = listener.accept() catch continue;
        defer conn.stream.close();

        var req_buf: [2 * 1024 * 1024]u8 = undefined;
        var total: usize = 0;
        while (total < req_buf.len) {
            const n = conn.stream.read(req_buf[total..]) catch break;
            if (n == 0) break;
            total += n;
            if (mem.indexOf(u8, req_buf[0..total], "\r\n\r\n")) |header_end| {
                if (mem.indexOf(u8, req_buf[0..total], "Content-Length: ")) |cl_pos| {
                    const cl_start = cl_pos + 16;
                    var cl_end = cl_start;
                    while (cl_end < total and req_buf[cl_end] >= '0' and req_buf[cl_end] <= '9') cl_end += 1;
                    const cl = fmt.parseInt(usize, req_buf[cl_start..cl_end], 10) catch 0;
                    if (total - (header_end + 4) >= cl) break;
                } else break;
            }
        }

        const req = req_buf[0..total];
        if (mem.startsWith(u8, req, "GET /health")) {
            const json = "{\"engine\":\"SWMM5-Zig\",\"status\":\"ok\",\"version\":\"v1.0\",\"language\":\"Zig\"}";
            var resp_buf: [512]u8 = undefined;
            const resp_len = (fmt.bufPrint(&resp_buf, "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {d}\r\n\r\n{s}", .{ json.len, json }) catch continue).len;
            _ = conn.stream.write(resp_buf[0..resp_len]) catch {};
        } else if (mem.startsWith(u8, req, "POST /simulate")) {
            const header_end = (mem.indexOf(u8, req, "\r\n\r\n") orelse continue) + 4;
            const body = req[header_end..];
            const timer = std.time.Timer.start() catch continue;
            var model = Model{};
            parseInp(&model, body);
            const result = simulate(&model);
            const wall_ms = @as(f64, @floatFromInt(timer.read())) / 1_000_000.0;

            var rpt_buf: [131072]u8 = undefined;
            const rpt_len = generateRpt(&model, result.steps, wall_ms, &rpt_buf);

            var json_buf: [262144]u8 = undefined;
            const prefix = "{\"success\":true,\"rpt\":\"";
            @memcpy(json_buf[0..prefix.len], prefix);
            var j = prefix.len;
            j += escapeJson(rpt_buf[0..rpt_len], json_buf[j..]);
            json_buf[j] = '"';
            json_buf[j + 1] = '}';
            j += 2;

            var header_buf: [256]u8 = undefined;
            const header = fmt.bufPrint(&header_buf, "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {d}\r\n\r\n", .{j}) catch continue;
            _ = conn.stream.write(header) catch {};
            _ = conn.stream.write(json_buf[0..j]) catch {};
        } else {
            _ = conn.stream.write("HTTP/1.1 404 Not Found\r\n\r\n") catch {};
        }
    }
}
