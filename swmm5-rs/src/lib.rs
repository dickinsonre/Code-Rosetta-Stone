mod project;
mod input;
mod xsect;
mod infil;
mod subcatch;
mod routing;
mod report;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn run_simulation(inp_text: &str) -> String {
    let start = instant_now();
    let mut proj = match input::parse_inp(inp_text) {
        Ok(p) => p,
        Err(e) => return format!("Error parsing .inp file: {}", e),
    };
    let parse_ms = instant_now() - start;

    let sim_start = instant_now();
    let results = routing::simulate(&mut proj);
    let sim_ms = instant_now() - sim_start;

    report::generate_report(&proj, &results, parse_ms, sim_ms)
}

fn instant_now() -> f64 {
    #[cfg(target_arch = "wasm32")]
    {
        js_sys_performance_now()
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        0.0
    }
}

#[cfg(target_arch = "wasm32")]
fn js_sys_performance_now() -> f64 {
    web_sys_now()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = Date)]
    fn now() -> f64;
}

#[cfg(target_arch = "wasm32")]
fn web_sys_now() -> f64 {
    now()
}
