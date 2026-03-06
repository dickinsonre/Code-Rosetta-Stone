use crate::project::Subcatchment;

pub fn compute_runoff(sc: &Subcatchment, rainfall: f64, infil_rate: f64, dt: f64) -> f64 {
    let area_ft2 = sc.area * 43560.0;
    let pct_imperv = sc.pct_imperv / 100.0;
    let pct_perv = 1.0 - pct_imperv;
    let rainfall_depth = rainfall * dt / 3600.0;

    let mut imperv_runoff = 0.0;
    if rainfall > 0.0 && rainfall_depth > sc.s_imperv {
        let excess = rainfall - sc.s_imperv * 3600.0 / dt;
        if excess > 0.0 {
            imperv_runoff = excess * pct_imperv;
        }
    }

    let mut perv_runoff = 0.0;
    if rainfall > infil_rate {
        let net_rain = rainfall - infil_rate;
        if net_rain > sc.s_perv * 3600.0 / dt {
            let excess = net_rain - sc.s_perv * 3600.0 / dt;
            if excess > 0.0 {
                perv_runoff = excess * pct_perv;
            }
        }
    }

    let runoff_in_per_hr = imperv_runoff + perv_runoff;
    let runoff_cfs = runoff_in_per_hr * area_ft2 / 43200.0;
    runoff_cfs.max(0.0)
}
