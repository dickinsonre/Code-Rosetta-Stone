use crate::project::*;
use std::collections::HashMap;

fn parse_time(s: &str) -> f64 {
    let parts: Vec<&str> = s.split(':').collect();
    match parts.len() {
        3 => {
            parts[0].parse::<f64>().unwrap_or(0.0) * 3600.0
                + parts[1].parse::<f64>().unwrap_or(0.0) * 60.0
                + parts[2].parse::<f64>().unwrap_or(0.0)
        }
        2 => {
            parts[0].parse::<f64>().unwrap_or(0.0) * 3600.0
                + parts[1].parse::<f64>().unwrap_or(0.0) * 60.0
        }
        _ => parts[0].parse::<f64>().unwrap_or(0.0) * 3600.0,
    }
}

fn pf(s: &str) -> f64 {
    s.parse::<f64>().unwrap_or(0.0)
}

fn pu(s: &str) -> u32 {
    s.parse::<u32>().unwrap_or(0)
}

pub fn parse_inp(text: &str) -> Result<Project, String> {
    let mut proj = Project::new();
    let mut section = String::new();
    let mut subarea_data: HashMap<String, (f64, f64, f64, f64, f64)> = HashMap::new();

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with(";;") {
            continue;
        }
        if trimmed.starts_with('[') && trimmed.contains(']') {
            section = trimmed
                .trim_matches(|c| c == '[' || c == ']')
                .to_uppercase();
            continue;
        }
        if trimmed.starts_with(';') {
            continue;
        }

        let tokens: Vec<&str> = trimmed.split_whitespace().collect();
        if tokens.is_empty() {
            continue;
        }

        match section.as_str() {
            "TITLE" => {
                if !proj.title.is_empty() {
                    proj.title.push('\n');
                }
                proj.title.push_str(trimmed);
            }
            "OPTIONS" => {
                if tokens.len() >= 2 {
                    let key = tokens[0].to_uppercase();
                    let val = tokens[1..].join(" ");
                    match key.as_str() {
                        "FLOW_UNITS" => proj.options.flow_units = val,
                        "INFILTRATION" => proj.options.infiltration = val,
                        "FLOW_ROUTING" => proj.options.flow_routing = val,
                        "START_DATE" => proj.options.start_date = val,
                        "END_DATE" => proj.options.end_date = val,
                        "START_TIME" => proj.options.start_time = parse_time(&val),
                        "END_TIME" => proj.options.end_time = parse_time(&val),
                        "REPORT_STEP" => proj.options.report_step = parse_time(&val),
                        "WET_STEP" => proj.options.wet_step = parse_time(&val),
                        "DRY_STEP" => proj.options.dry_step = parse_time(&val),
                        "ROUTING_STEP" => proj.options.routing_step = parse_time(&val),
                        "VARIABLE_STEP" => proj.options.variable_step = pf(&val),
                        "MAX_TRIALS" => proj.options.max_trials = pu(&val),
                        "HEAD_TOLERANCE" => proj.options.head_tolerance = pf(&val),
                        "MIN_SURFAREA" => proj.options.min_surf_area = pf(&val),
                        "INERTIAL_DAMPING" => proj.options.inertial_damping = val,
                        "NORMAL_FLOW_LIMITED" => proj.options.normal_flow_limited = val,
                        "LENGTHENING_STEP" => proj.options.lengthening_step = pf(&val),
                        "MINIMUM_STEP" => proj.options.minimum_step = pf(&val),
                        _ => {}
                    }
                }
            }
            "RAINGAGES" => {
                if tokens.len() >= 6 {
                    proj.raingages.insert(
                        tokens[0].to_string(),
                        RainGage {
                            id: tokens[0].to_string(),
                            format: tokens[1].to_string(),
                            interval: parse_time(tokens[2]),
                            scf: pf(tokens[3]),
                            source_name: tokens[5].to_string(),
                        },
                    );
                }
            }
            "SUBCATCHMENTS" => {
                if tokens.len() >= 7 {
                    proj.subcatchments.push(Subcatchment {
                        id: tokens[0].to_string(),
                        rain_gage: tokens[1].to_string(),
                        outlet: tokens[2].to_string(),
                        area: pf(tokens[3]),
                        pct_imperv: pf(tokens[4]),
                        width: pf(tokens[5]),
                        slope: pf(tokens[6]),
                        n_imperv: 0.01,
                        n_perv: 0.1,
                        s_imperv: 0.05,
                        s_perv: 0.05,
                        pct_zero: 25.0,
                        runoff: 0.0,
                        rainfall: 0.0,
                        total_precip: 0.0,
                        total_runoff: 0.0,
                        total_infil: 0.0,
                        peak_runoff: 0.0,
                    });
                }
            }
            "SUBAREAS" => {
                if tokens.len() >= 6 {
                    subarea_data.insert(
                        tokens[0].to_string(),
                        (pf(tokens[1]), pf(tokens[2]), pf(tokens[3]), pf(tokens[4]), pf(tokens[5])),
                    );
                }
            }
            "INFILTRATION" => {
                if tokens.len() >= 4 {
                    proj.infiltration.insert(
                        tokens[0].to_string(),
                        Infiltration {
                            max_rate: pf(tokens[1]),
                            min_rate: pf(tokens[2]),
                            decay: pf(tokens[3]),
                            dry_time: if tokens.len() > 4 { pf(tokens[4]) } else { 7.0 },
                            current_rate: pf(tokens[1]),
                            cumul_infil: 0.0,
                        },
                    );
                }
            }
            "JUNCTIONS" => {
                if tokens.len() >= 2 {
                    let n = Node::new_junction(
                        tokens[0].to_string(),
                        pf(tokens[1]),
                        if tokens.len() > 2 { pf(tokens[2]) } else { 0.0 },
                        if tokens.len() > 3 { pf(tokens[3]) } else { 0.0 },
                        if tokens.len() > 4 { pf(tokens[4]) } else { 0.0 },
                        if tokens.len() > 5 { pf(tokens[5]) } else { 0.0 },
                    );
                    proj.add_node(n);
                }
            }
            "OUTFALLS" => {
                if tokens.len() >= 2 {
                    let n = Node::new_outfall(tokens[0].to_string(), pf(tokens[1]));
                    proj.add_node(n);
                }
            }
            "CONDUITS" => {
                if tokens.len() >= 5 {
                    let mut link = Link::new(
                        tokens[0].to_string(),
                        tokens[1].to_string(),
                        tokens[2].to_string(),
                        pf(tokens[3]),
                        pf(tokens[4]),
                        if tokens.len() > 5 { pf(tokens[5]) } else { 0.0 },
                        if tokens.len() > 6 { pf(tokens[6]) } else { 0.0 },
                    );
                    if tokens.len() > 7 {
                        link.flow = pf(tokens[7]);
                    }
                    proj.add_link(link);
                }
            }
            "XSECTIONS" => {
                if tokens.len() >= 3 {
                    let xs = XSection {
                        shape: tokens[1].to_uppercase(),
                        geom1: pf(tokens[2]),
                        geom2: if tokens.len() > 3 { pf(tokens[3]) } else { 0.0 },
                        barrels: if tokens.len() > 6 { pu(tokens[6]) } else { 1 },
                    };
                    if let Some(idx) = proj.link_index.get(tokens[0]) {
                        let idx = *idx;
                        let d = xs.geom1;
                        proj.links[idx].full_area = std::f64::consts::PI * d * d / 4.0;
                        proj.links[idx].full_hyd_radius = d / 4.0;
                        proj.links[idx].full_flow = (1.49 / proj.links[idx].roughness)
                            * proj.links[idx].full_area
                            * (d / 4.0_f64).powf(2.0 / 3.0)
                            * 0.001_f64.sqrt();
                        proj.links[idx].xsect = Some(xs);
                    }
                }
            }
            "TIMESERIES" => {
                if tokens.len() >= 2 {
                    let name = tokens[0].to_string();
                    let (time_str, value) = if tokens.len() >= 4 && tokens[1].contains('/') {
                        (tokens[2], pf(tokens[3]))
                    } else {
                        (tokens[1], pf(tokens[2]))
                    };
                    proj.timeseries
                        .entry(name)
                        .or_insert_with(Vec::new)
                        .push(TimeSeriesEntry {
                            time: parse_time(time_str),
                            value,
                        });
                }
            }
            _ => {}
        }
    }

    for sc in &mut proj.subcatchments {
        if let Some(&(ni, np, si, sp, pz)) = subarea_data.get(&sc.id) {
            sc.n_imperv = ni;
            sc.n_perv = np;
            sc.s_imperv = si;
            sc.s_perv = sp;
            sc.pct_zero = pz;
        }
    }

    let start_secs = parse_date_to_epoch(&proj.options.start_date) + proj.options.start_time;
    let end_secs = parse_date_to_epoch(&proj.options.end_date) + proj.options.end_time;
    proj.options.total_duration = end_secs - start_secs;

    if proj.nodes.is_empty() {
        return Err("No nodes found in .inp file".to_string());
    }
    if proj.links.is_empty() {
        return Err("No links found in .inp file".to_string());
    }

    Ok(proj)
}

fn parse_date_to_epoch(date_str: &str) -> f64 {
    let parts: Vec<&str> = date_str.split('/').collect();
    if parts.len() != 3 {
        return 0.0;
    }
    let month: f64 = parts[0].parse().unwrap_or(1.0);
    let day: f64 = parts[1].parse().unwrap_or(1.0);
    let year: f64 = parts[2].parse().unwrap_or(2024.0);
    (year - 2024.0) * 365.25 * 86400.0 + (month - 1.0) * 30.44 * 86400.0 + (day - 1.0) * 86400.0
}
