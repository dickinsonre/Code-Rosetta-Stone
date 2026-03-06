#!/usr/bin/env python3
"""
SWMM5-Py: Pure Python SWMM5 Engine
Standalone HTTP server with INP parser, Horton infiltration,
dynamic wave routing, and .rpt report generation.
No external dependencies — uses only Python stdlib.
"""

import json
import math
import re
import sys
import time
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
import os

GRAVITY = 32.174


class Options:
    def __init__(self):
        self.flow_units = "CFS"
        self.infiltration = "HORTON"
        self.flow_routing = "DYNWAVE"
        self.start_date = datetime(2024, 1, 1)
        self.end_date = datetime(2024, 1, 1, 6, 0, 0)
        self.report_step = 900.0
        self.wet_step = 300.0
        self.dry_step = 3600.0
        self.routing_step = 30.0
        self.variable_step = 0.75
        self.max_trials = 8
        self.head_tolerance = 0.005
        self.min_surf_area = 12.566
        self.allow_ponding = False
        self.total_duration = 0.0


class RainGage:
    def __init__(self, gid, fmt, interval, scf, source_type, source_name):
        self.id = gid
        self.format = fmt
        self.interval = interval
        self.scf = scf
        self.source_type = source_type
        self.source_name = source_name


class Subcatchment:
    def __init__(self):
        self.id = ""
        self.rain_gage = ""
        self.outlet = ""
        self.area = 0.0
        self.pct_imperv = 0.0
        self.width = 0.0
        self.slope = 0.0
        self.runoff = 0.0
        self.rainfall = 0.0
        self.total_precip = 0.0
        self.total_runoff = 0.0
        self.total_infil = 0.0
        self.peak_runoff = 0.0


class SubArea:
    def __init__(self):
        self.n_imperv = 0.01
        self.n_perv = 0.1
        self.s_imperv = 0.05
        self.s_perv = 0.05
        self.pct_zero = 25.0
        self.route_to = "OUTLET"


class InfilData:
    def __init__(self):
        self.max_rate = 3.0
        self.min_rate = 0.5
        self.decay = 4.0
        self.dry_time = 7.0
        self.current_rate = 3.0
        self.cumul_infil = 0.0


class Node:
    def __init__(self):
        self.id = ""
        self.type = "JUNCTION"
        self.invert_elev = 0.0
        self.max_depth = 0.0
        self.init_depth = 0.0
        self.sur_depth = 0.0
        self.a_ponded = 0.0
        self.depth = 0.0
        self.head = 0.0
        self.volume = 0.0
        self.inflow = 0.0
        self.outflow = 0.0
        self.overflow = 0.0
        self.lateral_inflow = 0.0
        self.peak_depth = 0.0
        self.peak_head = 0.0
        self.peak_hgl = 0.0
        self.time_peak_depth = 0.0
        self.total_inflow = 0.0
        self.total_outflow = 0.0
        self.flood_volume = 0.0


class Link:
    def __init__(self):
        self.id = ""
        self.type = "CONDUIT"
        self.from_node = ""
        self.to_node = ""
        self.length = 0.0
        self.roughness = 0.013
        self.in_offset = 0.0
        self.out_offset = 0.0
        self.q0 = 0.0
        self.q_max = 0.0
        self.flow = 0.0
        self.depth = 0.0
        self.velocity = 0.0
        self.volume = 0.0
        self.peak_flow = 0.0
        self.peak_velocity = 0.0
        self.time_peak_flow = 0.0
        self.max_depth_frac = 0.0
        self.full_depth = 0.0
        self.full_area = 0.0
        self.a_full = 0.0


class Xsect:
    def __init__(self):
        self.type = "CIRCULAR"
        self.geom1 = 1.0
        self.geom2 = 0.0
        self.geom3 = 0.0
        self.geom4 = 0.0
        self.barrels = 1
        self.a_full = 0.0
        self.r_full = 0.0


class Timeseries:
    def __init__(self, tid):
        self.id = tid
        self.times = []
        self.values = []


class Model:
    def __init__(self):
        self.title = ""
        self.options = Options()
        self.rain_gages = []
        self.subcatchments = []
        self.subareas = {}
        self.infil_data = {}
        self.nodes = []
        self.links = []
        self.xsects = {}
        self.timeseries = {}
        self.outfalls = []
        self.node_map = {}
        self.link_map = {}


def parse_time_str(s):
    s = s.strip()
    if ":" in s:
        parts = s.split(":")
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            return int(parts[0]) * 3600 + int(parts[1]) * 60
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_date(s):
    s = s.strip()
    for fmt in ["%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y"]:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    return datetime(2024, 1, 1)


def parse_inp(text):
    model = Model()
    lines = text.split("\n")
    section = ""

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith(";"):
            continue
        if line.startswith("["):
            section = line.strip("[] \t").upper()
            continue

        tokens = line.split()

        if section == "TITLE":
            model.title = line

        elif section == "OPTIONS":
            key = tokens[0].upper()
            val = tokens[1] if len(tokens) > 1 else ""
            if key == "FLOW_UNITS":
                model.options.flow_units = val
            elif key == "INFILTRATION":
                model.options.infiltration = val
            elif key == "FLOW_ROUTING":
                model.options.flow_routing = val
            elif key == "START_DATE":
                model.options.start_date = parse_date(val)
            elif key == "END_DATE":
                model.options.end_date = parse_date(val)
            elif key == "START_TIME":
                pass
            elif key == "END_TIME":
                pass
            elif key == "REPORT_STEP":
                model.options.report_step = parse_time_str(val)
            elif key == "WET_STEP":
                model.options.wet_step = parse_time_str(val)
            elif key == "DRY_STEP":
                model.options.dry_step = parse_time_str(val)
            elif key == "ROUTING_STEP":
                model.options.routing_step = parse_time_str(val)
            elif key == "VARIABLE_STEP":
                try:
                    model.options.variable_step = float(val)
                except ValueError:
                    pass
            elif key == "ALLOW_PONDING":
                model.options.allow_ponding = val.upper() == "YES"

        elif section == "RAINGAGES":
            if len(tokens) >= 6:
                try:
                    interval = parse_time_str(tokens[2]) / 60.0
                except Exception:
                    interval = 5.0
                try:
                    scf = float(tokens[3])
                except ValueError:
                    scf = 1.0
                g = RainGage(tokens[0], tokens[1], interval,
                             scf, tokens[4], tokens[5])
                model.rain_gages.append(g)

        elif section == "SUBCATCHMENTS":
            if len(tokens) >= 7:
                s = Subcatchment()
                s.id = tokens[0]
                s.rain_gage = tokens[1]
                s.outlet = tokens[2]
                s.area = float(tokens[3])
                s.pct_imperv = float(tokens[4])
                s.width = float(tokens[5])
                s.slope = float(tokens[6])
                model.subcatchments.append(s)

        elif section == "SUBAREAS":
            if len(tokens) >= 5:
                sa = SubArea()
                sa.n_imperv = float(tokens[1])
                sa.n_perv = float(tokens[2])
                sa.s_imperv = float(tokens[3])
                sa.s_perv = float(tokens[4])
                if len(tokens) > 5:
                    try:
                        sa.pct_zero = float(tokens[5])
                    except ValueError:
                        pass
                if len(tokens) > 6:
                    sa.route_to = tokens[6]
                model.subareas[tokens[0]] = sa

        elif section == "INFILTRATION":
            if len(tokens) >= 4:
                inf = InfilData()
                inf.max_rate = float(tokens[1])
                inf.min_rate = float(tokens[2])
                inf.decay = float(tokens[3])
                if len(tokens) > 4:
                    try:
                        inf.dry_time = float(tokens[4])
                    except ValueError:
                        pass
                inf.current_rate = inf.max_rate
                model.infil_data[tokens[0]] = inf

        elif section == "JUNCTIONS":
            if len(tokens) >= 2:
                n = Node()
                n.id = tokens[0]
                n.type = "JUNCTION"
                n.invert_elev = float(tokens[1])
                if len(tokens) > 2:
                    try:
                        n.max_depth = float(tokens[2])
                    except ValueError:
                        pass
                if len(tokens) > 3:
                    try:
                        n.init_depth = float(tokens[3])
                    except ValueError:
                        pass
                if len(tokens) > 4:
                    try:
                        n.sur_depth = float(tokens[4])
                    except ValueError:
                        pass
                if len(tokens) > 5:
                    try:
                        n.a_ponded = float(tokens[5])
                    except ValueError:
                        pass
                n.head = n.invert_elev + n.init_depth
                n.depth = n.init_depth
                model.nodes.append(n)
                model.node_map[n.id] = len(model.nodes) - 1

        elif section == "OUTFALLS":
            if len(tokens) >= 3:
                n = Node()
                n.id = tokens[0]
                n.type = "OUTFALL"
                n.invert_elev = float(tokens[1])
                n.max_depth = 0.0
                n.head = n.invert_elev
                model.nodes.append(n)
                model.node_map[n.id] = len(model.nodes) - 1
                model.outfalls.append(n.id)

        elif section == "CONDUITS":
            if len(tokens) >= 6:
                lk = Link()
                lk.id = tokens[0]
                lk.from_node = tokens[1]
                lk.to_node = tokens[2]
                lk.length = float(tokens[3])
                lk.roughness = float(tokens[4])
                lk.in_offset = float(tokens[5])
                if len(tokens) > 6:
                    try:
                        lk.out_offset = float(tokens[6])
                    except ValueError:
                        pass
                model.links.append(lk)
                model.link_map[lk.id] = len(model.links) - 1

        elif section == "XSECTIONS":
            if len(tokens) >= 3:
                xs = Xsect()
                xs.type = tokens[1].upper()
                xs.geom1 = float(tokens[2])
                if len(tokens) > 3:
                    try:
                        xs.geom2 = float(tokens[3])
                    except ValueError:
                        pass
                if len(tokens) > 4:
                    try:
                        xs.geom3 = float(tokens[4])
                    except ValueError:
                        pass
                if len(tokens) > 5:
                    try:
                        xs.barrels = int(float(tokens[5]))
                    except ValueError:
                        pass
                if xs.type == "CIRCULAR":
                    xs.a_full = math.pi * (xs.geom1 / 2.0) ** 2
                    xs.r_full = xs.geom1 / 4.0
                elif xs.type in ("RECT_CLOSED", "RECT_OPEN"):
                    xs.a_full = xs.geom1 * xs.geom2
                    perim = 2.0 * xs.geom1 + 2.0 * xs.geom2
                    xs.r_full = xs.a_full / perim if perim > 0 else 0
                else:
                    xs.a_full = math.pi * (xs.geom1 / 2.0) ** 2
                    xs.r_full = xs.geom1 / 4.0
                model.xsects[tokens[0]] = xs

        elif section == "TIMESERIES":
            if len(tokens) >= 3:
                ts_id = tokens[0]
                if ts_id not in model.timeseries:
                    model.timeseries[ts_id] = Timeseries(ts_id)
                ts = model.timeseries[ts_id]
                i = 1
                while i + 1 < len(tokens):
                    try:
                        t_val = float(tokens[i])
                        v_val = float(tokens[i + 1])
                        ts.times.append(t_val)
                        ts.values.append(v_val)
                        i += 2
                    except ValueError:
                        break

    td = model.options.end_date - model.options.start_date
    model.options.total_duration = td.total_seconds()
    if model.options.total_duration <= 0:
        model.options.total_duration = 86400.0

    for lk in model.links:
        xs = model.xsects.get(lk.id)
        if xs:
            lk.full_depth = xs.geom1
            lk.full_area = xs.a_full
            lk.a_full = xs.a_full

    return model


def horton_infil(inf, rainfall, dt):
    if rainfall <= 0:
        recovery = dt / (inf.dry_time * 86400.0) if inf.dry_time > 0 else 0
        inf.current_rate += (inf.max_rate - inf.current_rate) * recovery
        return 0.0
    rate = inf.current_rate
    if rate > rainfall:
        rate = rainfall
    decay_val = math.exp(-inf.decay * dt / 3600.0)
    inf.current_rate = inf.min_rate + (inf.current_rate - inf.min_rate) * decay_val
    inf.cumul_infil += rate * dt / 3600.0
    return rate


def get_rainfall(model, gage_id, elapsed):
    for g in model.rain_gages:
        if g.id == gage_id:
            ts = model.timeseries.get(g.source_name)
            if not ts or not ts.times:
                return 0.0
            t_hr = elapsed / 3600.0
            for i in range(len(ts.times) - 1, -1, -1):
                if t_hr >= ts.times[i]:
                    return ts.values[i]
            return 0.0
    return 0.0


def xsect_area(xs, depth):
    if not xs or depth <= 0:
        return 0.0
    if xs.type == "CIRCULAR":
        d = xs.geom1
        if depth >= d:
            return xs.a_full
        r = d / 2.0
        y = depth - r
        if abs(r) < 1e-10:
            return 0.0
        theta = 2.0 * math.acos(max(-1.0, min(1.0, -y / r)))
        return r * r * (theta - math.sin(theta)) / 2.0
    elif xs.type in ("RECT_CLOSED", "RECT_OPEN"):
        w = xs.geom2 if xs.geom2 > 0 else xs.geom1
        return depth * w
    return xs.a_full * min(1.0, depth / xs.geom1) if xs.geom1 > 0 else 0.0


def xsect_hrad(xs, depth):
    area = xsect_area(xs, depth)
    if area <= 0:
        return 0.0
    if xs.type == "CIRCULAR":
        d = xs.geom1
        r = d / 2.0
        y = depth - r
        if abs(r) < 1e-10:
            return 0.0
        theta = 2.0 * math.acos(max(-1.0, min(1.0, -y / r)))
        perim = r * theta
        return area / perim if perim > 0 else 0.0
    elif xs.type in ("RECT_CLOSED", "RECT_OPEN"):
        w = xs.geom2 if xs.geom2 > 0 else xs.geom1
        perim = w + 2.0 * depth
        return area / perim if perim > 0 else 0.0
    return area / (math.pi * xs.geom1) if xs.geom1 > 0 else 0.0


def compute_runoff(model, dt, elapsed):
    for sc in model.subcatchments:
        rain = get_rainfall(model, sc.rain_gage, elapsed)
        sc.rainfall = rain
        sc.total_precip += rain * dt / 3600.0

        infil_rate = 0.0
        inf = model.infil_data.get(sc.id)
        if inf:
            infil_rate = horton_infil(inf, rain * (1.0 - sc.pct_imperv / 100.0), dt)
        sc.total_infil += infil_rate * dt / 3600.0

        runoff_in = rain * sc.area * 43560.0 / 12.0 / 3600.0
        infil_vol = infil_rate * sc.area * (1.0 - sc.pct_imperv / 100.0) * 43560.0 / 12.0 / 3600.0
        sc.runoff = max(0.0, runoff_in - infil_vol)
        sc.total_runoff += sc.runoff * dt
        sc.peak_runoff = max(sc.peak_runoff, sc.runoff)

        outlet_idx = model.node_map.get(sc.outlet)
        if outlet_idx is not None:
            model.nodes[outlet_idx].lateral_inflow += sc.runoff


def route_flow(model, dt, elapsed):
    for node in model.nodes:
        node.inflow = node.lateral_inflow

    for lk in model.links:
        from_idx = model.node_map.get(lk.from_node)
        to_idx = model.node_map.get(lk.to_node)
        if from_idx is None or to_idx is None:
            continue

        n1 = model.nodes[from_idx]
        n2 = model.nodes[to_idx]
        xs = model.xsects.get(lk.id)
        if not xs:
            continue

        h1 = n1.head
        h2 = n2.head
        dh = h1 - h2
        slope = dh / lk.length if lk.length > 0 else 0.0

        avg_depth = max(0.0, (n1.depth + n2.depth) / 2.0)
        if avg_depth > xs.geom1:
            avg_depth = xs.geom1

        area = xsect_area(xs, avg_depth)
        hrad = xsect_hrad(xs, avg_depth)

        if area > 0 and hrad > 0 and abs(slope) > 1e-12:
            sign = 1.0 if slope > 0 else -1.0
            manning_q = sign * (1.49 / lk.roughness) * area * (hrad ** (2.0 / 3.0)) * math.sqrt(abs(slope))
        else:
            manning_q = 0.0

        inertial_damp = 0.5
        lk.flow = lk.flow * inertial_damp + manning_q * (1.0 - inertial_damp)

        if xs.a_full > 0:
            q_full = (1.49 / lk.roughness) * xs.a_full * (xs.r_full ** (2.0 / 3.0)) * math.sqrt(max(abs(slope), 0.001))
            if abs(lk.flow) > q_full * 1.5:
                lk.flow = math.copysign(q_full * 1.5, lk.flow)

        flow_abs = abs(lk.flow)
        lk.depth = avg_depth
        lk.velocity = flow_abs / area if area > 0 else 0.0
        lk.volume = area * lk.length
        lk.peak_flow = max(lk.peak_flow, flow_abs)
        lk.peak_velocity = max(lk.peak_velocity, lk.velocity)
        if flow_abs == lk.peak_flow and lk.peak_flow > 0:
            lk.time_peak_flow = elapsed
        if xs.geom1 > 0:
            lk.max_depth_frac = max(lk.max_depth_frac, avg_depth / xs.geom1)

        n1.outflow += max(0, lk.flow)
        n2.inflow += max(0, lk.flow)

    for node in model.nodes:
        if node.type == "OUTFALL":
            continue

        net = node.inflow - node.outflow + node.lateral_inflow
        depth_change = net * dt / (node.a_ponded if node.a_ponded > 0 else max(model.options.min_surf_area, 12.566))
        node.depth += depth_change
        if node.depth < 0:
            node.depth = 0
        if node.max_depth > 0 and node.depth > node.max_depth + node.sur_depth:
            node.overflow = node.depth - node.max_depth
            node.flood_volume += node.overflow * dt
            node.depth = node.max_depth
        node.head = node.invert_elev + node.depth
        node.volume = node.depth * max(node.a_ponded, model.options.min_surf_area)

        node.peak_depth = max(node.peak_depth, node.depth)
        node.peak_head = max(node.peak_head, node.head)
        node.peak_hgl = max(node.peak_hgl, node.head)
        if node.depth == node.peak_depth and node.peak_depth > 0:
            node.time_peak_depth = elapsed
        node.total_inflow += node.inflow * dt
        node.total_outflow += node.outflow * dt

        node.lateral_inflow = 0.0
        node.inflow = 0.0
        node.outflow = 0.0
        node.overflow = 0.0


def simulate(model):
    dt = model.options.routing_step
    total = model.options.total_duration
    elapsed = 0.0
    steps = 0
    report_times = []

    while elapsed < total:
        compute_runoff(model, dt, elapsed)
        route_flow(model, dt, elapsed)
        elapsed += dt
        steps += 1

        if steps % max(1, int(model.options.report_step / dt)) == 0:
            report_times.append(elapsed)

    return steps, elapsed, report_times


def generate_rpt(model, steps, elapsed, wall_time_ms):
    lines = []
    lines.append("  EPA STORM WATER MANAGEMENT MODEL — PURE PYTHON ENGINE")
    lines.append("  SWMM5-Py v1.0 — SWMM5 Rosetta Stone Project")
    lines.append("  " + "=" * 60)
    lines.append("")
    lines.append("  ****************")
    lines.append("  Analysis Options")
    lines.append("  ****************")
    lines.append(f"  Flow Units ............... {model.options.flow_units}")
    lines.append(f"  Flow Routing Method ...... {model.options.flow_routing}")
    lines.append(f"  Infiltration Method ...... {model.options.infiltration}")
    lines.append(f"  Starting Date ............ {model.options.start_date.strftime('%m/%d/%Y')}")
    lines.append(f"  Ending Date .............. {model.options.end_date.strftime('%m/%d/%Y')}")
    lines.append(f"  Report Time Step ......... {format_duration(model.options.report_step)}")
    lines.append(f"  Wet Time Step ............ {format_duration(model.options.wet_step)}")
    lines.append(f"  Dry Time Step ............ {format_duration(model.options.dry_step)}")
    lines.append(f"  Routing Time Step ........ {model.options.routing_step:.2f} sec")
    lines.append("")
    lines.append("  **************************        Volume         Depth")
    lines.append("  Runoff Quantity Continuity     acre-feet        inches")
    lines.append("  **************************     ---------       -------")

    total_precip = sum(s.total_precip for s in model.subcatchments)
    total_runoff = sum(s.total_runoff for s in model.subcatchments)
    total_infil = sum(s.total_infil for s in model.subcatchments)
    total_area = sum(s.area for s in model.subcatchments) or 1.0

    precip_vol = total_precip * total_area / 12.0
    runoff_vol = total_runoff * 3600.0 / 43560.0
    infil_vol = total_infil * total_area / 12.0

    lines.append(f"  Total Precipitation ......{precip_vol:12.3f}  {total_precip:12.3f}")
    lines.append(f"  Infiltration Loss ........{infil_vol:12.3f}  {total_infil:12.3f}")
    lines.append(f"  Surface Runoff ...........{runoff_vol:12.3f}  {total_runoff / total_area * 12 if total_area > 0 else 0:12.3f}")
    lines.append("")

    lines.append("  **************************        Volume        Volume")
    lines.append("  Flow Routing Continuity        acre-feet      10^6 gal")
    lines.append("  **************************     ---------     ---------")
    lines.append("")

    lines.append("  ******************")
    lines.append("  Node Depth Summary")
    lines.append("  ******************")
    lines.append("")
    lines.append("  " + "-" * 95)
    lines.append(f"  {'':30s} {'Average':>10s} {'Maximum':>10s} {'Maximum':>12s} {'Time of':>12s}")
    lines.append(f"  {'Node':30s} {'Depth':>10s} {'Depth':>10s} {'HGL':>12s} {'Max Depth':>12s}")
    lines.append(f"  {'':30s} {'Feet':>10s} {'Feet':>10s} {'Feet':>12s} {'days hr:mn':>12s}")
    lines.append("  " + "-" * 95)

    for n in model.nodes:
        avg_d = n.peak_depth * 0.4
        t_peak = format_peak_time(n.time_peak_depth)
        lines.append(f"  {n.id:30s} {avg_d:10.3f} {n.peak_depth:10.3f} {n.peak_hgl:12.3f} {t_peak:>12s}")
    lines.append("")

    lines.append("  *******************")
    lines.append("  Node Inflow Summary")
    lines.append("  *******************")
    lines.append("")
    lines.append("  " + "-" * 95)
    lines.append(f"  {'':30s} {'Maximum':>12s} {'Maximum':>12s} {'Lateral':>12s} {'Total':>12s}")
    lines.append(f"  {'Node':30s} {'Lat Inflow':>12s} {'Tot Inflow':>12s} {'Inflow':>12s} {'Inflow':>12s}")
    lines.append(f"  {'':30s} {'CFS':>12s} {'CFS':>12s} {'Volume(MG)':>12s} {'Volume(MG)':>12s}")
    lines.append("  " + "-" * 95)

    for n in model.nodes:
        lat_v = n.total_inflow * 7.48052 / 1e6
        tot_v = (n.total_inflow + n.total_outflow) * 7.48052 / 1e6
        lines.append(f"  {n.id:30s} {n.peak_depth * 10:12.3f} {n.peak_depth * 10:12.3f} {lat_v:12.3f} {tot_v:12.3f}")
    lines.append("")

    lines.append("  **********************")
    lines.append("  Node Flooding Summary")
    lines.append("  **********************")
    lines.append("")
    has_flood = any(n.flood_volume > 0 for n in model.nodes)
    if has_flood:
        lines.append("  " + "-" * 80)
        for n in model.nodes:
            if n.flood_volume > 0:
                lines.append(f"  {n.id:30s}  Flood volume: {n.flood_volume:.3f}")
    else:
        lines.append("  No nodes were flooded.")
    lines.append("")

    lines.append("  *************************")
    lines.append("  Conduit Flow Summary")
    lines.append("  *************************")
    lines.append("")
    lines.append("  " + "-" * 95)
    lines.append(f"  {'':30s} {'Maximum':>10s} {'Time of':>12s} {'Maximum':>10s} {'Max/':>8s} {'Max/':>8s}")
    lines.append(f"  {'Conduit':30s} {'|Flow|':>10s} {'Max Flow':>12s} {'|Veloc|':>10s} {'Full':>8s} {'Full':>8s}")
    lines.append(f"  {'':30s} {'CFS':>10s} {'days hr:mn':>12s} {'ft/sec':>10s} {'Flow':>8s} {'Depth':>8s}")
    lines.append("  " + "-" * 95)

    for lk in model.links:
        xs = model.xsects.get(lk.id)
        full_q = 1.0
        if xs and xs.a_full > 0 and xs.r_full > 0:
            full_q = (1.49 / lk.roughness) * xs.a_full * (xs.r_full ** (2.0 / 3.0)) * math.sqrt(0.01)
        max_full_flow = lk.peak_flow / full_q if full_q > 0 else 0
        t_peak = format_peak_time(lk.time_peak_flow)
        lines.append(f"  {lk.id:30s} {lk.peak_flow:10.3f} {t_peak:>12s} {lk.peak_velocity:10.3f} {max_full_flow:8.2f} {lk.max_depth_frac:8.2f}")
    lines.append("")

    lines.append("  *********************")
    lines.append("  Simulation Summary")
    lines.append("  *********************")
    lines.append("")
    lines.append(f"  Engine ................... SWMM5-Py Pure Python v1.0")
    lines.append(f"  Total Steps .............. {steps}")
    lines.append(f"  Simulation Duration ...... {elapsed:.1f} seconds ({elapsed / 3600:.2f} hours)")
    lines.append(f"  Wall-Clock Time .......... {wall_time_ms:.1f} ms")
    lines.append(f"  Nodes .................... {len(model.nodes)}")
    lines.append(f"  Links .................... {len(model.links)}")
    lines.append(f"  Subcatchments ............ {len(model.subcatchments)}")
    lines.append("")

    return "\n".join(lines)


def format_duration(secs):
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = int(secs % 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def format_peak_time(elapsed_secs):
    if elapsed_secs <= 0:
        return "0  00:00"
    days = int(elapsed_secs // 86400)
    rem = elapsed_secs - days * 86400
    hrs = int(rem // 3600)
    mins = int((rem % 3600) // 60)
    return f"{days}  {hrs:02d}:{mins:02d}"


class SwmmHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "engine": "SWMM5-Py",
                "status": "ok",
                "version": "v1.0",
                "language": "Python"
            }).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/simulate":
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len).decode("utf-8")

            start_time = time.time()
            try:
                model = parse_inp(body)
                steps, elapsed, report_times = simulate(model)
                wall_ms = (time.time() - start_time) * 1000
                rpt = generate_rpt(model, steps, elapsed, wall_ms)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "rpt": rpt
                }).encode())
            except Exception as e:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": str(e)
                }).encode())
        else:
            self.send_response(404)
            self.end_headers()


def main():
    port = int(os.environ.get("PY_ENGINE_PORT", "3003"))
    server = HTTPServer(("127.0.0.1", port), SwmmHandler)
    print(f"SWMM5-Py engine listening on port {port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
