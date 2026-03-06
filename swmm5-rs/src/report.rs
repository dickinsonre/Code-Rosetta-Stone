use crate::project::*;
use crate::routing::SimResults;

fn fmt_time(seconds: f64) -> String {
    let h = (seconds / 3600.0) as u32;
    let m = ((seconds % 3600.0) / 60.0) as u32;
    let s = (seconds % 60.0) as u32;
    format!("{:02}:{:02}:{:02}", h, m, s)
}

pub fn generate_report(proj: &Project, results: &SimResults, parse_ms: f64, sim_ms: f64) -> String {
    let opt = &proj.options;
    let mut rpt = String::with_capacity(8192);

    rpt.push_str("  **********************************************\n");
    rpt.push_str("  *     SWMM5 Rust/WASM Engine                *\n");
    rpt.push_str("  *     Memory-Safe Simulation                 *\n");
    rpt.push_str("  *     Based on EPA SWMM 5.2                 *\n");
    rpt.push_str("  **********************************************\n\n");

    rpt.push_str("  ****************\n");
    rpt.push_str("  Analysis Options\n");
    rpt.push_str("  ****************\n");
    rpt.push_str(&format!("  Flow Units ............... {}\n", opt.flow_units));
    rpt.push_str("  Process Models:\n");
    rpt.push_str("    Rainfall/Runoff ........ YES\n");
    rpt.push_str("    RDII ................... NO\n");
    rpt.push_str("    Snowmelt ............... NO\n");
    rpt.push_str("    Groundwater ............ NO\n");
    rpt.push_str("    Flow Routing ........... YES\n");
    rpt.push_str(&format!("    Ponding Allowed ........ {}\n", if opt.allow_ponding { "YES" } else { "NO" }));
    rpt.push_str("    Water Quality .......... NO\n\n");
    rpt.push_str(&format!("  Infiltration Method ...... {}\n", opt.infiltration));
    rpt.push_str(&format!("  Flow Routing Method ...... {}\n", opt.flow_routing));
    rpt.push_str(&format!("  Starting Date ............ {} {}\n", opt.start_date, fmt_time(opt.start_time)));
    rpt.push_str(&format!("  Ending Date .............. {} {}\n", opt.end_date, fmt_time(opt.end_time)));
    rpt.push_str(&format!("  Report Step .............. {}\n", fmt_time(opt.report_step)));
    rpt.push_str(&format!("  Routing Step ............. {:.2} sec\n\n", opt.routing_step));

    rpt.push_str("  Engine Performance:\n");
    rpt.push_str(&format!("    Routing Steps .......... {}\n", results.steps));
    rpt.push_str(&format!("    Parse Time ............. {:.1} ms\n", parse_ms));
    rpt.push_str(&format!("    Simulation Time ........ {:.1} ms\n", sim_ms));
    rpt.push_str(&format!("    Total Time ............. {:.1} ms\n\n", parse_ms + sim_ms));

    rpt.push_str("  **************************\n");
    rpt.push_str("  Subcatchment Runoff Summary\n");
    rpt.push_str("  **************************\n\n");
    rpt.push_str(&format!("  {:28}{:>10}{:>10}{:>10}{:>12}{:>10}\n",
        "", "Total", "Total", "Total", "Peak", "Runoff"));
    rpt.push_str(&format!("  {:28}{:>10}{:>10}{:>10}{:>12}{:>10}\n",
        "Subcatchment", "Precip", "Runon", "Runoff", "Runoff", "Coeff"));
    rpt.push_str(&format!("  {:28}{:>10}{:>10}{:>10}{:>12}{:>10}\n",
        "", "in", "in", "in", &opt.flow_units, ""));
    rpt.push_str(&format!("  {}\n", "-".repeat(88)));
    for sc in &proj.subcatchments {
        let total_precip = sc.total_precip;
        let total_runoff_in = sc.total_runoff / (sc.area * 43560.0) * 12.0;
        let coeff = if total_precip > 0.0 { total_runoff_in / total_precip } else { 0.0 };
        rpt.push_str(&format!("  {:28}{:>10.2}{:>10}{:>10.2}{:>12.3}{:>10.3}\n",
            sc.id, total_precip, "0.00", total_runoff_in, sc.peak_runoff, coeff));
    }
    rpt.push('\n');

    rpt.push_str("  ******************\n");
    rpt.push_str("  Node Depth Summary\n");
    rpt.push_str("  ******************\n\n");
    rpt.push_str(&format!("  {:28}{:>10}{:>10}{:>12}{:>14}\n",
        "", "Average", "Maximum", "Maximum", "Time of"));
    rpt.push_str(&format!("  {:28}{:>10}{:>10}{:>12}{:>14}\n",
        "Node", "Depth", "Depth", "HGL", "Max Depth"));
    rpt.push_str(&format!("  {:28}{:>10}{:>10}{:>12}{:>14}\n",
        "", "Feet", "Feet", "Feet", ""));
    rpt.push_str(&format!("  {}\n", "-".repeat(84)));
    for (i, n) in proj.nodes.iter().enumerate() {
        let avg_depth = if !results.node_results[i].is_empty() {
            results.node_results[i].iter().map(|r| r.depth).sum::<f64>()
                / results.node_results[i].len() as f64
        } else { 0.0 };
        let hgl = if n.peak_hgl > 0.0 { n.peak_hgl } else { n.invert_elev + n.peak_depth };
        rpt.push_str(&format!("  {:28}{:>10.3}{:>10.3}{:>12.3}{:>14}\n",
            n.id, avg_depth, n.peak_depth, hgl, fmt_time(n.time_peak_depth)));
    }
    rpt.push('\n');

    rpt.push_str("  ********************\n");
    rpt.push_str("  Node Inflow Summary\n");
    rpt.push_str("  ********************\n\n");
    rpt.push_str(&format!("  {:28}{:>12}{:>12}{:>14}\n",
        "", "Lateral", "Total", "Peak"));
    rpt.push_str(&format!("  {:28}{:>12}{:>12}{:>14}\n",
        "Node", "Inflow", "Inflow", "Inflow"));
    rpt.push_str(&format!("  {:28}{:>12}{:>12}{:>14}\n",
        "", "Vol (ft3)", "Vol (ft3)", &opt.flow_units));
    rpt.push_str(&format!("  {}\n", "-".repeat(66)));
    for n in &proj.nodes {
        rpt.push_str(&format!("  {:28}{:>12.1}{:>12.1}{:>14.3}\n",
            n.id, n.total_inflow, n.total_inflow, n.peak_inflow));
    }
    rpt.push('\n');

    rpt.push_str("  **********************\n");
    rpt.push_str("  Link Flow Summary\n");
    rpt.push_str("  **********************\n\n");
    rpt.push_str(&format!("  {:28}{:>12}{:>14}{:>12}{:>10}\n",
        "", "Maximum", "Time of", "Maximum", "Max/"));
    rpt.push_str(&format!("  {:28}{:>12}{:>14}{:>12}{:>10}\n",
        "Link", "|Flow|", "Max Flow", "|Veloc|", "Full"));
    rpt.push_str(&format!("  {:28}{:>12}{:>14}{:>12}{:>10}\n",
        "", &opt.flow_units, "", "ft/sec", ""));
    rpt.push_str(&format!("  {}\n", "-".repeat(76)));
    for c in &proj.links {
        let max_full = c.xsect.as_ref().map_or(0.0, |xs| c.peak_depth / xs.geom1);
        rpt.push_str(&format!("  {:28}{:>12.3}{:>14}{:>12.3}{:>10.2}\n",
            c.id, c.peak_flow.abs(), fmt_time(c.time_peak_flow),
            c.peak_velocity.abs(), max_full));
    }
    rpt.push('\n');

    if !results.report_times.is_empty() && results.report_times.len() <= 50 {
        rpt.push_str("  ***************\n");
        rpt.push_str("  Routing Results\n");
        rpt.push_str("  ***************\n\n");

        rpt.push_str("  <<< Node Results >>>\n\n");
        for (ni, n) in proj.nodes.iter().enumerate() {
            rpt.push_str(&format!("  <<< Node {} >>>\n", n.id));
            rpt.push_str(&format!("  {:22}{:>10}{:>12}{:>12}{:>12}\n",
                "Time", "Depth", "Head", "Inflow", "Overflow"));
            rpt.push_str(&format!("  {:22}{:>10}{:>12}{:>12}{:>12}\n",
                "", "ft", "ft", &opt.flow_units, &opt.flow_units));
            rpt.push_str(&format!("  {}\n", "-".repeat(68)));
            for r in &results.node_results[ni] {
                rpt.push_str(&format!("  {:22}{:>10.3}{:>12.3}{:>12.3}{:>12.3}\n",
                    fmt_time(r.time), r.depth, r.head, r.inflow, r.overflow));
            }
            rpt.push('\n');
        }

        rpt.push_str("  <<< Link Results >>>\n\n");
        for (li, c) in proj.links.iter().enumerate() {
            rpt.push_str(&format!("  <<< Link {} >>>\n", c.id));
            rpt.push_str(&format!("  {:22}{:>12}{:>12}{:>10}{:>10}\n",
                "Time", "Flow", "Velocity", "Depth", "Capacity"));
            rpt.push_str(&format!("  {:22}{:>12}{:>12}{:>10}{:>10}\n",
                "", &opt.flow_units, "ft/sec", "ft", ""));
            rpt.push_str(&format!("  {}\n", "-".repeat(66)));
            for r in &results.link_results[li] {
                rpt.push_str(&format!("  {:22}{:>12.3}{:>12.3}{:>10.3}{:>10.3}\n",
                    fmt_time(r.time), r.flow, r.velocity, r.depth, r.capacity));
            }
            rpt.push('\n');
        }
    }

    rpt.push_str(&format!("  Total elapsed time : {:.3} seconds\n", (parse_ms + sim_ms) / 1000.0));
    rpt.push_str("  Engine: SWMM5-RS v1.0 (Rust/WASM Memory-Safe Engine)\n");

    rpt
}
