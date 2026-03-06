use crate::project::Infiltration;

pub fn horton_infil(infil: &mut Infiltration, rainfall: f64, dt: f64) -> f64 {
    let rate = infil.min_rate
        + (infil.current_rate - infil.min_rate) * (-infil.decay * dt / 3600.0).exp();
    let avg_rate = (infil.current_rate + rate) / 2.0;
    let actual_rate = avg_rate.min(rainfall);
    infil.current_rate = rate;
    infil.cumul_infil += actual_rate * dt / 3600.0;
    actual_rate
}
