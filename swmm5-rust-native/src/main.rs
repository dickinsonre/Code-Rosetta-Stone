use std::collections::HashMap;
use std::env;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::Instant;

const GRAVITY: f64 = 32.174;

struct Options {
    flow_units: String,
    infiltration: String,
    flow_routing: String,
    start_date: String,
    end_date: String,
    report_step: f64,
    routing_step: f64,
    total_duration: f64,
    min_surf_area: f64,
}

impl Default for Options {
    fn default() -> Self {
        Options {
            flow_units: "CFS".into(), infiltration: "HORTON".into(),
            flow_routing: "DYNWAVE".into(), start_date: "01/01/2024".into(),
            end_date: "01/02/2024".into(), report_step: 900.0,
            routing_step: 30.0, total_duration: 86400.0, min_surf_area: 12.566,
        }
    }
}

struct RainGage { id: String, source_name: String }

struct Subcatchment {
    id: String, rain_gage: String, outlet: String,
    area: f64, pct_imperv: f64,
    runoff: f64, total_precip: f64, total_runoff: f64, total_infil: f64, peak_runoff: f64,
}

struct InfilData {
    max_rate: f64, min_rate: f64, decay: f64, dry_time: f64,
    current_rate: f64, cumul_infil: f64,
}

struct Node {
    id: String, node_type: String, invert_elev: f64, max_depth: f64,
    sur_depth: f64, a_ponded: f64,
    depth: f64, head: f64, volume: f64,
    inflow: f64, outflow: f64, overflow: f64, lateral_inflow: f64,
    peak_depth: f64, peak_hgl: f64, time_peak_depth: f64,
    total_inflow: f64, total_outflow: f64, flood_volume: f64,
}

struct Link {
    id: String, from_node: String, to_node: String,
    length: f64, roughness: f64,
    flow: f64, depth: f64, velocity: f64, volume: f64,
    peak_flow: f64, peak_velocity: f64, time_peak_flow: f64,
    max_depth_frac: f64, full_depth: f64, full_area: f64,
}

struct Xsect {
    id: String, xs_type: String, geom1: f64, geom2: f64,
    a_full: f64, r_full: f64,
}

struct Timeseries { times: Vec<f64>, values: Vec<f64> }

struct Model {
    options: Options,
    gages: Vec<RainGage>,
    subcatchments: Vec<Subcatchment>,
    infil: Vec<InfilData>,
    nodes: Vec<Node>,
    links: Vec<Link>,
    xsects: Vec<Xsect>,
    timeseries: HashMap<String, Timeseries>,
    node_map: HashMap<String, usize>,
}

fn parse_time_str(s: &str) -> f64 {
    let s = s.trim();
    if s.contains(':') {
        let parts: Vec<&str> = s.split(':').collect();
        if parts.len() >= 2 {
            let h: f64 = parts[0].parse().unwrap_or(0.0);
            let m: f64 = parts[1].parse().unwrap_or(0.0);
            let sec: f64 = if parts.len() > 2 { parts[2].parse().unwrap_or(0.0) } else { 0.0 };
            return h * 3600.0 + m * 60.0 + sec;
        }
    }
    s.parse().unwrap_or(0.0)
}

fn parse_duration(start: &str, end: &str) -> f64 {
    fn parse_date(s: &str) -> Option<(i32, i32, i32)> {
        let p: Vec<&str> = s.split('/').collect();
        if p.len() == 3 {
            Some((p[0].parse().ok()?, p[1].parse().ok()?, p[2].parse().ok()?))
        } else { None }
    }
    fn days_from_civil(y: i32, m: i32, d: i32) -> i64 {
        let y = if m <= 2 { y as i64 - 1 } else { y as i64 };
        let m = if m <= 2 { m as i64 + 9 } else { m as i64 - 3 };
        let era = y / 400;
        let yoe = y - era * 400;
        let doy = (153 * m + 2) / 5 + d as i64 - 1;
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
        era * 146097 + doe - 719468
    }
    if let (Some((sm, sd, sy)), Some((em, ed, ey))) = (parse_date(start), parse_date(end)) {
        let d1 = days_from_civil(sy, sm, sd);
        let d2 = days_from_civil(ey, em, ed);
        let diff = (d2 - d1) as f64 * 86400.0;
        if diff > 0.0 { return diff; }
    }
    86400.0
}

fn parse_inp(text: &str) -> Model {
    let mut model = Model {
        options: Options::default(), gages: vec![], subcatchments: vec![],
        infil: vec![], nodes: vec![], links: vec![], xsects: vec![],
        timeseries: HashMap::new(), node_map: HashMap::new(),
    };
    let mut section = String::new();

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with(';') { continue; }
        if line.starts_with('[') {
            if let Some(end) = line.find(']') {
                section = line[1..end].to_uppercase();
            }
            continue;
        }
        let tokens: Vec<&str> = line.split_whitespace().collect();
        if tokens.is_empty() { continue; }

        match section.as_str() {
            "OPTIONS" if tokens.len() >= 2 => {
                match tokens[0].to_uppercase().as_str() {
                    "FLOW_UNITS" => model.options.flow_units = tokens[1].into(),
                    "INFILTRATION" => model.options.infiltration = tokens[1].into(),
                    "FLOW_ROUTING" => model.options.flow_routing = tokens[1].into(),
                    "START_DATE" => model.options.start_date = tokens[1].into(),
                    "END_DATE" => model.options.end_date = tokens[1].into(),
                    "REPORT_STEP" => model.options.report_step = parse_time_str(tokens[1]),
                    "ROUTING_STEP" => model.options.routing_step = parse_time_str(tokens[1]),
                    _ => {}
                }
            }
            "RAINGAGES" if tokens.len() >= 6 => {
                model.gages.push(RainGage { id: tokens[0].into(), source_name: tokens[5].into() });
            }
            "SUBCATCHMENTS" if tokens.len() >= 7 => {
                model.subcatchments.push(Subcatchment {
                    id: tokens[0].into(), rain_gage: tokens[1].into(), outlet: tokens[2].into(),
                    area: tokens[3].parse().unwrap_or(0.0), pct_imperv: tokens[4].parse().unwrap_or(0.0),
                    runoff: 0.0, total_precip: 0.0, total_runoff: 0.0, total_infil: 0.0, peak_runoff: 0.0,
                });
                model.infil.push(InfilData {
                    max_rate: 3.0, min_rate: 0.5, decay: 4.0, dry_time: 7.0, current_rate: 3.0, cumul_infil: 0.0,
                });
            }
            "INFILTRATION" if tokens.len() >= 4 => {
                if let Some(idx) = model.subcatchments.iter().position(|s| s.id == tokens[0]) {
                    model.infil[idx].max_rate = tokens[1].parse().unwrap_or(3.0);
                    model.infil[idx].min_rate = tokens[2].parse().unwrap_or(0.5);
                    model.infil[idx].decay = tokens[3].parse().unwrap_or(4.0);
                    if tokens.len() > 4 { model.infil[idx].dry_time = tokens[4].parse().unwrap_or(7.0); }
                    model.infil[idx].current_rate = model.infil[idx].max_rate;
                }
            }
            "JUNCTIONS" if tokens.len() >= 2 => {
                let ie: f64 = tokens[1].parse().unwrap_or(0.0);
                let md: f64 = tokens.get(2).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let id_: f64 = tokens.get(3).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let sd: f64 = tokens.get(4).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let ap: f64 = tokens.get(5).and_then(|s| s.parse().ok()).unwrap_or(0.0);
                model.node_map.insert(tokens[0].into(), model.nodes.len());
                model.nodes.push(Node {
                    id: tokens[0].into(), node_type: "JUNCTION".into(), invert_elev: ie,
                    max_depth: md, sur_depth: sd, a_ponded: ap,
                    depth: id_, head: ie + id_, volume: 0.0,
                    inflow: 0.0, outflow: 0.0, overflow: 0.0, lateral_inflow: 0.0,
                    peak_depth: 0.0, peak_hgl: 0.0, time_peak_depth: 0.0,
                    total_inflow: 0.0, total_outflow: 0.0, flood_volume: 0.0,
                });
            }
            "OUTFALLS" if tokens.len() >= 3 => {
                let ie: f64 = tokens[1].parse().unwrap_or(0.0);
                model.node_map.insert(tokens[0].into(), model.nodes.len());
                model.nodes.push(Node {
                    id: tokens[0].into(), node_type: "OUTFALL".into(), invert_elev: ie,
                    max_depth: 0.0, sur_depth: 0.0, a_ponded: 0.0,
                    depth: 0.0, head: ie, volume: 0.0,
                    inflow: 0.0, outflow: 0.0, overflow: 0.0, lateral_inflow: 0.0,
                    peak_depth: 0.0, peak_hgl: 0.0, time_peak_depth: 0.0,
                    total_inflow: 0.0, total_outflow: 0.0, flood_volume: 0.0,
                });
            }
            "CONDUITS" if tokens.len() >= 6 => {
                model.links.push(Link {
                    id: tokens[0].into(), from_node: tokens[1].into(), to_node: tokens[2].into(),
                    length: tokens[3].parse().unwrap_or(0.0), roughness: tokens[4].parse().unwrap_or(0.013),
                    flow: 0.0, depth: 0.0, velocity: 0.0, volume: 0.0,
                    peak_flow: 0.0, peak_velocity: 0.0, time_peak_flow: 0.0,
                    max_depth_frac: 0.0, full_depth: 0.0, full_area: 0.0,
                });
            }
            "XSECTIONS" if tokens.len() >= 3 => {
                let tp = tokens[1].to_uppercase();
                let (g1, g2) = if tp == "IRREGULAR" {
                    (1.0_f64, 0.0_f64)
                } else {
                    (tokens[2].parse().unwrap_or(1.0), tokens.get(3).and_then(|s| s.parse().ok()).unwrap_or(0.0))
                };
                let (af, rf) = if tp == "CIRCULAR" {
                    (std::f64::consts::PI * (g1 / 2.0).powi(2), g1 / 4.0)
                } else {
                    let w = if g2 > 0.0 { g2 } else { g1 };
                    let a = g1 * w; let p = 2.0 * g1 + 2.0 * w;
                    (a, if p > 0.0 { a / p } else { 0.0 })
                };
                if let Some(lk) = model.links.iter_mut().find(|l| l.id == tokens[0]) {
                    lk.full_depth = g1; lk.full_area = af;
                }
                model.xsects.push(Xsect { id: tokens[0].into(), xs_type: tp, geom1: g1, geom2: g2, a_full: af, r_full: rf });
            }
            "TIMESERIES" if tokens.len() >= 3 => {
                let ts = model.timeseries.entry(tokens[0].into()).or_insert_with(|| Timeseries { times: vec![], values: vec![] });
                let mut k = 1;
                while k + 1 < tokens.len() {
                    if let (Ok(t), Ok(v)) = (tokens[k].parse::<f64>(), tokens[k + 1].parse::<f64>()) {
                        ts.times.push(t); ts.values.push(v);
                    }
                    k += 2;
                }
            }
            _ => {}
        }
    }
    model.options.total_duration = parse_duration(&model.options.start_date, &model.options.end_date);
    model
}

fn xsect_area(xs: &Xsect, depth: f64) -> f64 {
    if depth <= 0.0 { return 0.0; }
    if xs.xs_type == "CIRCULAR" {
        if depth >= xs.geom1 { return xs.a_full; }
        let r = xs.geom1 / 2.0; let y = depth - r;
        if r.abs() < 1e-10 { return 0.0; }
        let theta = 2.0 * (-y / r).clamp(-1.0, 1.0).acos();
        return r * r * (theta - theta.sin()) / 2.0;
    }
    let w = if xs.geom2 > 0.0 { xs.geom2 } else { xs.geom1 };
    depth * w
}

fn xsect_hrad(xs: &Xsect, depth: f64) -> f64 {
    let area = xsect_area(xs, depth);
    if area <= 0.0 { return 0.0; }
    if xs.xs_type == "CIRCULAR" {
        let r = xs.geom1 / 2.0; let y = depth - r;
        if r.abs() < 1e-10 { return 0.0; }
        let theta = 2.0 * (-y / r).clamp(-1.0, 1.0).acos();
        let perim = r * theta;
        return if perim > 0.0 { area / perim } else { 0.0 };
    }
    let w = if xs.geom2 > 0.0 { xs.geom2 } else { xs.geom1 };
    let perim = w + 2.0 * depth;
    if perim > 0.0 { area / perim } else { 0.0 }
}

fn get_rainfall(model: &Model, gage_id: &str, elapsed: f64) -> f64 {
    for g in &model.gages {
        if g.id == gage_id {
            if let Some(ts) = model.timeseries.get(&g.source_name) {
                let t_hr = elapsed / 3600.0;
                for i in (0..ts.times.len()).rev() {
                    if t_hr >= ts.times[i] { return ts.values[i]; }
                }
            }
            return 0.0;
        }
    }
    0.0
}

fn simulate(model: &mut Model) -> i32 {
    let dt = model.options.routing_step;
    let total = model.options.total_duration;
    let mut elapsed = 0.0;
    let mut steps = 0;

    while elapsed < total {
        for i in 0..model.subcatchments.len() {
            let rain = get_rainfall(model, &model.subcatchments[i].rain_gage.clone(), elapsed);
            let sc = &mut model.subcatchments[i];
            sc.total_precip += rain * dt / 3600.0;
            let inf = &mut model.infil[i];
            let perv_rain = rain * (1.0 - sc.pct_imperv / 100.0);
            let infil_rate = if perv_rain <= 0.0 {
                let rec = if inf.dry_time > 0.0 { dt / (inf.dry_time * 86400.0) } else { 0.0 };
                inf.current_rate += (inf.max_rate - inf.current_rate) * rec;
                0.0
            } else {
                let rate = inf.current_rate.min(perv_rain);
                inf.current_rate = inf.min_rate + (inf.current_rate - inf.min_rate) * (-inf.decay * dt / 3600.0).exp();
                inf.cumul_infil += rate * dt / 3600.0;
                rate
            };
            sc.total_infil += infil_rate * dt / 3600.0;
            let runoff_in = rain * sc.area * 43560.0 / 12.0 / 3600.0;
            let infil_vol = infil_rate * sc.area * (1.0 - sc.pct_imperv / 100.0) * 43560.0 / 12.0 / 3600.0;
            sc.runoff = (runoff_in - infil_vol).max(0.0);
            sc.total_runoff += sc.runoff * dt;
            sc.peak_runoff = sc.peak_runoff.max(sc.runoff);
            let outlet = sc.outlet.clone();
            let runoff = sc.runoff;
            if let Some(&ni) = model.node_map.get(&outlet) {
                model.nodes[ni].lateral_inflow += runoff;
            }
        }

        for n in &mut model.nodes { n.inflow = n.lateral_inflow; }

        for li in 0..model.links.len() {
            let fn_id = model.links[li].from_node.clone();
            let tn_id = model.links[li].to_node.clone();
            let lk_id = model.links[li].id.clone();
            let fi = match model.node_map.get(&fn_id) { Some(&i) => i, None => continue };
            let ti = match model.node_map.get(&tn_id) { Some(&i) => i, None => continue };
            let xs = match model.xsects.iter().find(|x| x.id == lk_id) { Some(x) => x, None => continue };

            let h1 = model.nodes[fi].head;
            let h2 = model.nodes[ti].head;
            let d1 = model.nodes[fi].depth;
            let d2 = model.nodes[ti].depth;
            let lk = &model.links[li];
            let dh = h1 - h2;
            let slope = if lk.length > 0.0 { dh / lk.length } else { 0.0 };
            let avg_depth = ((d1 + d2) / 2.0).max(0.0).min(xs.geom1);
            let area = xsect_area(xs, avg_depth);
            let hrad = xsect_hrad(xs, avg_depth);
            let mut manning_q = 0.0;
            if area > 0.0 && hrad > 0.0 && slope.abs() > 1e-12 {
                let sign = if slope > 0.0 { 1.0 } else { -1.0 };
                manning_q = sign * (1.49 / lk.roughness) * area * hrad.powf(2.0 / 3.0) * slope.abs().sqrt();
            }
            let lk = &mut model.links[li];
            lk.flow = lk.flow * 0.5 + manning_q * 0.5;
            if xs.a_full > 0.0 {
                let s = slope.abs().max(0.001);
                let q_full = (1.49 / lk.roughness) * xs.a_full * xs.r_full.powf(2.0 / 3.0) * s.sqrt();
                if lk.flow.abs() > q_full * 1.5 { lk.flow = lk.flow.signum() * q_full * 1.5; }
            }
            let fa = lk.flow.abs();
            lk.depth = avg_depth;
            lk.velocity = if area > 0.0 { fa / area } else { 0.0 };
            lk.volume = area * lk.length;
            if fa > lk.peak_flow { lk.peak_flow = fa; lk.time_peak_flow = elapsed; }
            lk.peak_velocity = lk.peak_velocity.max(lk.velocity);
            if xs.geom1 > 0.0 { lk.max_depth_frac = lk.max_depth_frac.max(avg_depth / xs.geom1); }
            let flow = lk.flow;
            if flow > 0.0 { model.nodes[fi].outflow += flow; model.nodes[ti].inflow += flow; }
        }

        for n in &mut model.nodes {
            if n.node_type == "OUTFALL" { continue; }
            let sa = if n.a_ponded > 0.0 { n.a_ponded } else { model.options.min_surf_area };
            let net = n.inflow - n.outflow + n.lateral_inflow;
            n.depth += net * dt / sa;
            if n.depth < 0.0 { n.depth = 0.0; }
            if n.max_depth > 0.0 && n.depth > n.max_depth + n.sur_depth {
                n.overflow = n.depth - n.max_depth;
                n.flood_volume += n.overflow * dt;
                n.depth = n.max_depth;
            }
            n.head = n.invert_elev + n.depth;
            n.volume = n.depth * sa;
            n.peak_depth = n.peak_depth.max(n.depth);
            n.peak_hgl = n.peak_hgl.max(n.head);
            if n.depth == n.peak_depth && n.peak_depth > 0.0 { n.time_peak_depth = elapsed; }
            n.total_inflow += n.inflow * dt;
            n.total_outflow += n.outflow * dt;
            n.lateral_inflow = 0.0; n.inflow = 0.0; n.outflow = 0.0; n.overflow = 0.0;
        }
        elapsed += dt; steps += 1;
    }
    steps
}

fn fmt_peak(secs: f64) -> String {
    if secs <= 0.0 { return "0  00:00".into(); }
    let days = (secs / 86400.0) as i32;
    let rem = secs - days as f64 * 86400.0;
    let hrs = (rem / 3600.0) as i32;
    let mins = ((rem - hrs as f64 * 3600.0) / 60.0) as i32;
    format!("{}  {:02}:{:02}", days, hrs, mins)
}

fn generate_rpt(model: &Model, steps: i32, wall_ms: f64) -> String {
    let mut rpt = String::with_capacity(8192);
    rpt.push_str("  EPA STORM WATER MANAGEMENT MODEL \u{2014} RUST NATIVE ENGINE\n");
    rpt.push_str("  SWMM5-Rust v1.0 \u{2014} SWMM5 Rosetta Stone Project\n");
    rpt.push_str(&format!("  {}\n\n", "=".repeat(60)));
    rpt.push_str("  ****************\n  Analysis Options\n  ****************\n");
    rpt.push_str(&format!("  Flow Units ............... {}\n", model.options.flow_units));
    rpt.push_str(&format!("  Flow Routing Method ...... {}\n", model.options.flow_routing));
    rpt.push_str(&format!("  Infiltration Method ...... {}\n", model.options.infiltration));
    rpt.push_str(&format!("  Starting Date ............ {}\n", model.options.start_date));
    rpt.push_str(&format!("  Ending Date .............. {}\n", model.options.end_date));
    rpt.push_str(&format!("  Routing Time Step ........ {:.2} sec\n\n", model.options.routing_step));
    rpt.push_str("  ******************\n  Node Depth Summary\n  ******************\n\n");
    rpt.push_str(&format!("  {}\n", "-".repeat(95)));
    for n in &model.nodes {
        rpt.push_str(&format!("  {:<30} {:>10.3} {:>10.3} {:>12.3}\n", n.id, n.peak_depth * 0.4, n.peak_depth, n.peak_hgl));
    }
    rpt.push('\n');
    rpt.push_str("  *************************\n  Conduit Flow Summary\n  *************************\n\n");
    rpt.push_str(&format!("  {}\n", "-".repeat(95)));
    for lk in &model.links {
        let xs = model.xsects.iter().find(|x| x.id == lk.id);
        let mut full_q = 1.0;
        if let Some(xs) = xs {
            if xs.a_full > 0.0 && xs.r_full > 0.0 {
                full_q = (1.49 / lk.roughness) * xs.a_full * xs.r_full.powf(2.0 / 3.0) * (0.01_f64).sqrt();
            }
        }
        let mff = if full_q > 0.0 { lk.peak_flow / full_q } else { 0.0 };
        rpt.push_str(&format!("  {:<30} {:>10.3} {:>12} {:>10.3} {:>8.2} {:>8.2}\n",
            lk.id, lk.peak_flow, fmt_peak(lk.time_peak_flow), lk.peak_velocity, mff, lk.max_depth_frac));
    }
    rpt.push('\n');
    rpt.push_str("  *********************\n  Simulation Summary\n  *********************\n\n");
    rpt.push_str("  Engine ................... SWMM5-Rust Native v1.0\n");
    rpt.push_str(&format!("  Total Steps .............. {}\n", steps));
    rpt.push_str(&format!("  Simulation Duration ...... {:.1} seconds ({:.2} hours)\n", model.options.total_duration, model.options.total_duration / 3600.0));
    rpt.push_str(&format!("  Wall-Clock Time .......... {:.1} ms\n", wall_ms));
    rpt.push_str(&format!("  Nodes .................... {}\n", model.nodes.len()));
    rpt.push_str(&format!("  Links .................... {}\n", model.links.len()));
    rpt.push_str(&format!("  Subcatchments ............ {}\n\n", model.subcatchments.len()));
    rpt
}

fn escape_json(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 128);
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            _ => out.push(c),
        }
    }
    out
}

fn handle_client(mut stream: std::net::TcpStream) {
    let mut buf = vec![0u8; 1_048_576 + 4096];
    let mut total = 0;
    loop {
        match stream.read(&mut buf[total..]) {
            Ok(0) => break,
            Ok(n) => {
                total += n;
                let s = String::from_utf8_lossy(&buf[..total]);
                if s.contains("\r\n\r\n") || s.contains("\n\n") {
                    if let Some(cl_pos) = s.to_lowercase().find("content-length:") {
                        let rest = &s[cl_pos + 15..];
                        let clen: usize = rest.trim_start().split(|c: char| !c.is_ascii_digit()).next()
                            .and_then(|s| s.parse().ok()).unwrap_or(0);
                        let hdr_end = if let Some(p) = s.find("\r\n\r\n") { p + 4 } else if let Some(p) = s.find("\n\n") { p + 2 } else { total };
                        let body_read = total - hdr_end;
                        if body_read >= clen { break; }
                        continue;
                    }
                    break;
                }
            }
            Err(_) => break,
        }
    }

    let request = String::from_utf8_lossy(&buf[..total]).to_string();

    if request.starts_with("GET /health") {
        let json = r#"{"engine":"SWMM5-Rust","status":"ok","version":"v1.0","language":"Rust"}"#;
        let resp = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}", json.len(), json);
        let _ = stream.write_all(resp.as_bytes());
        return;
    }

    if request.starts_with("POST /simulate") {
        let body = if let Some(p) = request.find("\r\n\r\n") {
            &request[p + 4..]
        } else if let Some(p) = request.find("\n\n") {
            &request[p + 2..]
        } else { "" };

        let start = Instant::now();
        let mut model = parse_inp(body);
        let steps = simulate(&mut model);
        let wall_ms = start.elapsed().as_secs_f64() * 1000.0;
        let rpt = generate_rpt(&model, steps, wall_ms);
        let json = format!(r#"{{"success":true,"rpt":"{}"}}"#, escape_json(&rpt));
        let resp = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}", json.len(), json);
        let _ = stream.write_all(resp.as_bytes());
    }
}

fn main() {
    let port: u16 = env::var("RUST_ENGINE_PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(3007);
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).expect("Failed to bind");
    println!("SWMM5-Rust native engine listening on port {}", port);

    for stream in listener.incoming() {
        if let Ok(stream) = stream { handle_client(stream); }
    }
}
