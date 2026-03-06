use std::f64::consts::PI;

pub fn circular_area(diameter: f64, depth: f64) -> f64 {
    if depth <= 0.0 { return 0.0; }
    if depth >= diameter { return PI * diameter * diameter / 4.0; }
    let r = diameter / 2.0;
    let theta = 2.0 * ((r - depth) / r).acos();
    r * r * (theta - theta.sin()) / 2.0
}

pub fn circular_perimeter(diameter: f64, depth: f64) -> f64 {
    if depth <= 0.0 { return 0.0; }
    if depth >= diameter { return PI * diameter; }
    let r = diameter / 2.0;
    let theta = 2.0 * ((r - depth) / r).acos();
    r * theta
}

pub fn circular_hyd_radius(diameter: f64, depth: f64) -> f64 {
    let a = circular_area(diameter, depth);
    let p = circular_perimeter(diameter, depth);
    if p > 0.0 { a / p } else { 0.0 }
}

pub fn circular_width(diameter: f64, depth: f64) -> f64 {
    if depth <= 0.0 || depth >= diameter { return 0.0; }
    2.0 * (depth * (diameter - depth)).max(0.0).sqrt()
}
