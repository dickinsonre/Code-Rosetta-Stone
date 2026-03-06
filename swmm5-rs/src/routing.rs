use crate::project::*;
use crate::xsect;
use crate::infil;
use crate::subcatch;

const GRAVITY: f64 = 32.174;

#[derive(Clone, Debug)]
pub struct NodeResult {
    pub time: f64,
    pub depth: f64,
    pub head: f64,
    pub inflow: f64,
    pub overflow: f64,
}

#[derive(Clone, Debug)]
pub struct LinkResult {
    pub time: f64,
    pub flow: f64,
    pub velocity: f64,
    pub depth: f64,
    pub capacity: f64,
}

pub struct SimResults {
    pub node_results: Vec<Vec<NodeResult>>,
    pub link_results: Vec<Vec<LinkResult>>,
    pub report_times: Vec<f64>,
    pub steps: u64,
    pub elapsed: f64,
}

fn get_timeseries(ts: &[TimeSeriesEntry], time: f64) -> f64 {
    if ts.is_empty() { return 0.0; }
    if time <= ts[0].time { return ts[0].value; }
    if time >= ts.last().unwrap().time { return ts.last().unwrap().value; }
    for i in 0..ts.len() - 1 {
        if time >= ts[i].time && time <= ts[i + 1].time {
            let frac = (time - ts[i].time) / (ts[i + 1].time - ts[i].time);
            return ts[i].value + frac * (ts[i + 1].value - ts[i].value);
        }
    }
    0.0
}

pub fn simulate(proj: &mut Project) -> SimResults {
    let dt = proj.options.routing_step;
    let total = proj.options.total_duration;
    let report_step = proj.options.report_step;
    let inertia_factor = if proj.options.inertial_damping == "PARTIAL" { 0.75 } else { 1.0 };

    let mut elapsed = 0.0_f64;
    let mut next_report = 0.0_f64;
    let mut steps = 0_u64;

    let n_nodes = proj.nodes.len();
    let n_links = proj.links.len();

    let mut node_results: Vec<Vec<NodeResult>> = vec![Vec::new(); n_nodes];
    let mut link_results: Vec<Vec<LinkResult>> = vec![Vec::new(); n_links];
    let mut report_times: Vec<f64> = Vec::new();

    while elapsed < total {
        for sc_i in 0..proj.subcatchments.len() {
            let gage_name = proj.subcatchments[sc_i].rain_gage.clone();
            let outlet = proj.subcatchments[sc_i].outlet.clone();
            let sc_id = proj.subcatchments[sc_i].id.clone();

            let mut rainfall = 0.0;
            if let Some(gage) = proj.raingages.get(&gage_name) {
                if let Some(ts) = proj.timeseries.get(&gage.source_name) {
                    rainfall = get_timeseries(ts, elapsed);
                }
            }

            let infil_rate = if let Some(inf) = proj.infiltration.get_mut(&sc_id) {
                infil::horton_infil(inf, rainfall, dt)
            } else {
                0.0
            };

            let sc = &proj.subcatchments[sc_i];
            let runoff = subcatch::compute_runoff(sc, rainfall, infil_rate, dt);

            proj.subcatchments[sc_i].rainfall = rainfall;
            proj.subcatchments[sc_i].runoff = runoff;
            proj.subcatchments[sc_i].total_precip += rainfall * dt / 3600.0;
            proj.subcatchments[sc_i].total_infil += infil_rate * dt / 3600.0;
            proj.subcatchments[sc_i].total_runoff += runoff * dt;
            if runoff > proj.subcatchments[sc_i].peak_runoff {
                proj.subcatchments[sc_i].peak_runoff = runoff;
            }

            if let Some(idx) = proj.node_index.get(&outlet).copied() {
                proj.nodes[idx].lateral_inflow += runoff;
            }
        }

        for i in 0..n_nodes {
            proj.nodes[i].inflow = proj.nodes[i].lateral_inflow;
            proj.nodes[i].outflow = 0.0;
        }

        for li in 0..n_links {
            let from_id = proj.links[li].from_node.clone();
            let to_id = proj.links[li].to_node.clone();
            let from_idx = match proj.node_index.get(&from_id) { Some(&i) => i, None => continue };
            let to_idx = match proj.node_index.get(&to_id) { Some(&i) => i, None => continue };

            let up_head = proj.nodes[from_idx].head;
            let dn_head = proj.nodes[to_idx].head;
            let up_invert = proj.nodes[from_idx].invert_elev + proj.links[li].in_offset;
            let dn_invert = proj.nodes[to_idx].invert_elev + proj.links[li].out_offset;

            let diameter = proj.links[li].xsect.as_ref().map_or(1.0, |xs| xs.geom1);
            let mid_depth = ((up_head + dn_head) / 2.0 - (up_invert + dn_invert) / 2.0).max(0.0);
            let link_depth = mid_depth.min(diameter);

            let area = xsect::circular_area(diameter, link_depth);
            let hyd_rad = xsect::circular_hyd_radius(diameter, link_depth);
            proj.links[li].area = area;
            proj.links[li].depth = link_depth;

            let dh = up_head - dn_head;
            let slope = dh / proj.links[li].length;
            let old_flow = proj.links[li].flow;
            let roughness = proj.links[li].roughness;

            let new_flow = if area < 1e-6 {
                0.0
            } else {
                let sf = roughness * roughness * old_flow * old_flow.abs()
                    / (area.powf(10.0 / 3.0) + 1e-30);
                let net_slope = slope - sf;
                let dq = GRAVITY * area * net_slope * dt;
                let candidate = old_flow + dq;

                let q_full = (1.49 / roughness)
                    * proj.links[li].full_area
                    * proj.links[li].full_hyd_radius.powf(2.0 / 3.0)
                    * (slope.abs() + 1e-6).sqrt();
                let max_q = (q_full * 1.5).max(proj.links[li].full_flow * 1.5);

                if candidate.abs() > max_q {
                    candidate.signum() * max_q
                } else {
                    candidate
                }
            };

            proj.links[li].flow = old_flow * (1.0 - inertia_factor) + new_flow * inertia_factor;
            proj.links[li].velocity = if area > 1e-6 {
                proj.links[li].flow / area
            } else {
                0.0
            };

            let flow = proj.links[li].flow;
            if flow > 0.0 {
                proj.nodes[to_idx].inflow += flow;
                proj.nodes[from_idx].outflow += flow;
            } else {
                proj.nodes[from_idx].inflow += flow.abs();
                proj.nodes[to_idx].outflow += flow.abs();
            }
        }

        let min_surf = proj.options.min_surf_area;
        for i in 0..n_nodes {
            if proj.nodes[i].node_type == NodeType::Outfall {
                proj.nodes[i].head = proj.nodes[i].invert_elev;
                proj.nodes[i].depth = 0.0;
                continue;
            }

            let net_flow = proj.nodes[i].inflow - proj.nodes[i].outflow;
            let surf_area = if proj.nodes[i].a_ponded > 0.0 {
                proj.nodes[i].a_ponded.max(min_surf)
            } else {
                min_surf
            };

            proj.nodes[i].depth += net_flow * dt / surf_area;
            if proj.nodes[i].depth < 0.0 { proj.nodes[i].depth = 0.0; }

            if proj.nodes[i].depth > proj.nodes[i].max_depth {
                proj.nodes[i].overflow =
                    (proj.nodes[i].depth - proj.nodes[i].max_depth) * surf_area / dt;
                proj.nodes[i].depth = proj.nodes[i].max_depth;
            } else {
                proj.nodes[i].overflow = 0.0;
            }

            proj.nodes[i].head = proj.nodes[i].invert_elev + proj.nodes[i].depth;
            proj.nodes[i].volume = proj.nodes[i].depth * surf_area;
        }

        for i in 0..n_nodes {
            let n = &mut proj.nodes[i];
            if n.depth > n.peak_depth {
                n.peak_depth = n.depth;
                n.time_peak_depth = elapsed;
                n.peak_hgl = n.head;
            }
            n.total_inflow += n.inflow * dt;
            if n.inflow > n.peak_inflow { n.peak_inflow = n.inflow; }
            n.total_overflow += n.overflow * dt;
            if n.overflow > 0.0 { n.time_flooded += dt; }
        }

        for li in 0..n_links {
            let c = &mut proj.links[li];
            if c.flow.abs() > c.peak_flow.abs() {
                c.peak_flow = c.flow;
                c.time_peak_flow = elapsed;
            }
            if c.velocity.abs() > c.peak_velocity.abs() {
                c.peak_velocity = c.velocity;
            }
            if c.depth > c.peak_depth { c.peak_depth = c.depth; }
            c.total_flow += c.flow * dt;
            if let Some(ref xs) = c.xsect {
                if c.depth >= xs.geom1 * 0.95 {
                    c.capacity_limited += dt;
                }
            }
        }

        if elapsed >= next_report {
            report_times.push(elapsed);
            for i in 0..n_nodes {
                node_results[i].push(NodeResult {
                    time: elapsed,
                    depth: proj.nodes[i].depth,
                    head: proj.nodes[i].head,
                    inflow: proj.nodes[i].inflow,
                    overflow: proj.nodes[i].overflow,
                });
            }
            for li in 0..n_links {
                let cap = proj.links[li].xsect.as_ref()
                    .map_or(0.0, |xs| proj.links[li].depth / xs.geom1);
                link_results[li].push(LinkResult {
                    time: elapsed,
                    flow: proj.links[li].flow,
                    velocity: proj.links[li].velocity,
                    depth: proj.links[li].depth,
                    capacity: cap,
                });
            }
            next_report += report_step;
        }

        for i in 0..n_nodes {
            proj.nodes[i].lateral_inflow = 0.0;
        }

        elapsed += dt;
        steps += 1;
    }

    SimResults {
        node_results,
        link_results,
        report_times,
        steps,
        elapsed,
    }
}
