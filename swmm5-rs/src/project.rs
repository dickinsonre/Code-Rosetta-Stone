use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct Options {
    pub flow_units: String,
    pub infiltration: String,
    pub flow_routing: String,
    pub start_date: String,
    pub start_time: f64,
    pub end_date: String,
    pub end_time: f64,
    pub report_step: f64,
    pub wet_step: f64,
    pub dry_step: f64,
    pub routing_step: f64,
    pub total_duration: f64,
    pub allow_ponding: bool,
    pub inertial_damping: String,
    pub normal_flow_limited: String,
    pub variable_step: f64,
    pub max_trials: u32,
    pub head_tolerance: f64,
    pub min_surf_area: f64,
    pub lengthening_step: f64,
    pub minimum_step: f64,
}

impl Default for Options {
    fn default() -> Self {
        Options {
            flow_units: "CFS".into(),
            infiltration: "HORTON".into(),
            flow_routing: "DYNWAVE".into(),
            start_date: "01/01/2024".into(),
            start_time: 0.0,
            end_date: "01/01/2024".into(),
            end_time: 21600.0,
            report_step: 900.0,
            wet_step: 300.0,
            dry_step: 3600.0,
            routing_step: 30.0,
            total_duration: 21600.0,
            allow_ponding: false,
            inertial_damping: "PARTIAL".into(),
            normal_flow_limited: "BOTH".into(),
            variable_step: 0.75,
            max_trials: 8,
            head_tolerance: 0.005,
            min_surf_area: 12.566,
            lengthening_step: 0.0,
            minimum_step: 0.5,
        }
    }
}

#[derive(Clone, Debug)]
pub struct Node {
    pub id: String,
    pub node_type: NodeType,
    pub invert_elev: f64,
    pub max_depth: f64,
    pub init_depth: f64,
    pub sur_depth: f64,
    pub a_ponded: f64,
    pub depth: f64,
    pub head: f64,
    pub volume: f64,
    pub inflow: f64,
    pub outflow: f64,
    pub overflow: f64,
    pub lateral_inflow: f64,
    pub peak_depth: f64,
    pub peak_hgl: f64,
    pub time_peak_depth: f64,
    pub total_inflow: f64,
    pub total_overflow: f64,
    pub peak_inflow: f64,
    pub time_flooded: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub enum NodeType {
    Junction,
    Outfall,
}

impl Node {
    pub fn new_junction(id: String, invert: f64, max_depth: f64, init_depth: f64, sur_depth: f64, a_ponded: f64) -> Self {
        Node {
            id, node_type: NodeType::Junction,
            invert_elev: invert, max_depth, init_depth, sur_depth, a_ponded,
            depth: init_depth, head: invert + init_depth,
            volume: 0.0, inflow: 0.0, outflow: 0.0, overflow: 0.0,
            lateral_inflow: 0.0, peak_depth: 0.0, peak_hgl: 0.0,
            time_peak_depth: 0.0, total_inflow: 0.0, total_overflow: 0.0,
            peak_inflow: 0.0, time_flooded: 0.0,
        }
    }

    pub fn new_outfall(id: String, invert: f64) -> Self {
        Node {
            id, node_type: NodeType::Outfall,
            invert_elev: invert, max_depth: 0.0, init_depth: 0.0,
            sur_depth: 0.0, a_ponded: 0.0,
            depth: 0.0, head: invert,
            volume: 0.0, inflow: 0.0, outflow: 0.0, overflow: 0.0,
            lateral_inflow: 0.0, peak_depth: 0.0, peak_hgl: 0.0,
            time_peak_depth: 0.0, total_inflow: 0.0, total_overflow: 0.0,
            peak_inflow: 0.0, time_flooded: 0.0,
        }
    }
}

#[derive(Clone, Debug)]
pub struct XSection {
    pub shape: String,
    pub geom1: f64,
    pub geom2: f64,
    pub barrels: u32,
}

#[derive(Clone, Debug)]
pub struct Link {
    pub id: String,
    pub from_node: String,
    pub to_node: String,
    pub length: f64,
    pub roughness: f64,
    pub in_offset: f64,
    pub out_offset: f64,
    pub xsect: Option<XSection>,
    pub flow: f64,
    pub depth: f64,
    pub velocity: f64,
    pub area: f64,
    pub full_area: f64,
    pub full_hyd_radius: f64,
    pub full_flow: f64,
    pub peak_flow: f64,
    pub peak_velocity: f64,
    pub peak_depth: f64,
    pub time_peak_flow: f64,
    pub total_flow: f64,
    pub capacity_limited: f64,
}

impl Link {
    pub fn new(id: String, from: String, to: String, length: f64, roughness: f64, in_off: f64, out_off: f64) -> Self {
        Link {
            id, from_node: from, to_node: to, length, roughness,
            in_offset: in_off, out_offset: out_off,
            xsect: None, flow: 0.0, depth: 0.0, velocity: 0.0, area: 0.0,
            full_area: 0.0, full_hyd_radius: 0.0, full_flow: 0.0,
            peak_flow: 0.0, peak_velocity: 0.0, peak_depth: 0.0,
            time_peak_flow: 0.0, total_flow: 0.0, capacity_limited: 0.0,
        }
    }
}

#[derive(Clone, Debug)]
pub struct Subcatchment {
    pub id: String,
    pub rain_gage: String,
    pub outlet: String,
    pub area: f64,
    pub pct_imperv: f64,
    pub width: f64,
    pub slope: f64,
    pub n_imperv: f64,
    pub n_perv: f64,
    pub s_imperv: f64,
    pub s_perv: f64,
    pub pct_zero: f64,
    pub runoff: f64,
    pub rainfall: f64,
    pub total_precip: f64,
    pub total_runoff: f64,
    pub total_infil: f64,
    pub peak_runoff: f64,
}

#[derive(Clone, Debug)]
pub struct Infiltration {
    pub max_rate: f64,
    pub min_rate: f64,
    pub decay: f64,
    pub dry_time: f64,
    pub current_rate: f64,
    pub cumul_infil: f64,
}

#[derive(Clone, Debug)]
pub struct RainGage {
    pub id: String,
    pub format: String,
    pub interval: f64,
    pub scf: f64,
    pub source_name: String,
}

#[derive(Clone, Debug)]
pub struct TimeSeriesEntry {
    pub time: f64,
    pub value: f64,
}

#[derive(Clone, Debug)]
pub struct Project {
    pub title: String,
    pub options: Options,
    pub nodes: Vec<Node>,
    pub links: Vec<Link>,
    pub subcatchments: Vec<Subcatchment>,
    pub infiltration: HashMap<String, Infiltration>,
    pub raingages: HashMap<String, RainGage>,
    pub timeseries: HashMap<String, Vec<TimeSeriesEntry>>,
    pub node_index: HashMap<String, usize>,
    pub link_index: HashMap<String, usize>,
}

impl Project {
    pub fn new() -> Self {
        Project {
            title: String::new(),
            options: Options::default(),
            nodes: Vec::new(),
            links: Vec::new(),
            subcatchments: Vec::new(),
            infiltration: HashMap::new(),
            raingages: HashMap::new(),
            timeseries: HashMap::new(),
            node_index: HashMap::new(),
            link_index: HashMap::new(),
        }
    }

    pub fn add_node(&mut self, node: Node) {
        let id = node.id.clone();
        self.nodes.push(node);
        self.node_index.insert(id, self.nodes.len() - 1);
    }

    pub fn add_link(&mut self, link: Link) {
        let id = link.id.clone();
        self.links.push(link);
        self.link_index.insert(id, self.links.len() - 1);
    }

    pub fn get_node(&self, id: &str) -> Option<&Node> {
        self.node_index.get(id).map(|&i| &self.nodes[i])
    }

    pub fn get_node_mut(&mut self, id: &str) -> Option<&mut Node> {
        self.node_index.get(id).copied().map(move |i| &mut self.nodes[i])
    }
}
