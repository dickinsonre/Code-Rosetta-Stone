let pi = 3.14159265358979323846

let safe_float s = try float_of_string s with _ -> 0.0

let parse_time_str s =
  let s = String.trim s in
  match String.split_on_char ':' s with
  | [h; m] -> safe_float h *. 3600.0 +. safe_float m *. 60.0
  | [h; m; sec] -> safe_float h *. 3600.0 +. safe_float m *. 60.0 +. safe_float sec
  | _ -> safe_float s

let parse_duration start_d end_d =
  try
    let sp = String.split_on_char '/' start_d in
    let ep = String.split_on_char '/' end_d in
    if List.length sp < 3 || List.length ep < 3 then 86400.0
    else
      let diff = (safe_float (List.nth ep 2) -. safe_float (List.nth sp 2)) *. 365.0 *. 86400.0
        +. (safe_float (List.nth ep 0) -. safe_float (List.nth sp 0)) *. 30.0 *. 86400.0
        +. (safe_float (List.nth ep 1) -. safe_float (List.nth sp 1)) *. 86400.0 in
      if diff > 0.0 then diff else 86400.0
  with _ -> 86400.0

type options = {
  mutable flow_units: string; mutable infiltration: string; mutable flow_routing: string;
  mutable start_date: string; mutable end_date: string;
  mutable report_step: float; mutable wet_step: float; mutable dry_step: float;
  mutable routing_step: float; mutable total_duration: float; mutable min_surf_area: float;
}

type gage = { g_id: string; g_source_name: string }

type subcatch = {
  sc_id: string; sc_rain_gage: string; sc_outlet: string;
  sc_area: float; sc_pct_imperv: float; sc_width: float; sc_slope: float;
  mutable sc_runoff: float; mutable sc_total_precip: float; mutable sc_total_runoff: float;
  mutable sc_total_infil: float; mutable sc_peak_runoff: float;
}

type infil = {
  max_rate: float; min_rate: float; decay: float; dry_time: float;
  mutable current_rate: float; mutable cumul_infil: float;
}

type node = {
  n_id: string; n_type: string; n_invert_elev: float;
  mutable n_max_depth: float; n_sur_depth: float; n_a_ponded: float;
  mutable n_depth: float; mutable n_head: float; mutable n_volume: float;
  mutable n_inflow: float; mutable n_outflow: float; mutable n_overflow: float;
  mutable n_lateral_inflow: float;
  mutable n_peak_depth: float; mutable n_peak_hgl: float;
  mutable n_total_inflow: float; mutable n_total_outflow: float; mutable n_flood_volume: float;
}

type link = {
  l_id: string; l_from_node: string; l_to_node: string;
  l_length: float; l_roughness: float; l_in_offset: float; l_out_offset: float;
  mutable l_flow: float; mutable l_depth: float; mutable l_velocity: float; mutable l_volume: float;
  mutable l_peak_flow: float; mutable l_peak_velocity: float; mutable l_time_peak_flow: float;
  mutable l_max_depth_frac: float; mutable l_full_depth: float; mutable l_full_area: float;
}

type xsect = { x_id: string; x_type: string; x_geom1: float; x_geom2: float; x_a_full: float; x_r_full: float }

type tseries = { ts_id: string; mutable ts_times: float list; mutable ts_values: float list }

type model = {
  opts: options;
  mutable gages: gage list; mutable subcatchments: subcatch list; mutable infils: infil list;
  mutable nodes: node list; mutable links: link list; mutable xsects: xsect list;
  mutable timeseries: (string * tseries) list;
  mutable node_map: (string * int) list;
  mutable title: string;
}

let new_options () = { flow_units="CFS"; infiltration="HORTON"; flow_routing="DYNWAVE";
  start_date="01/01/2024"; end_date="01/02/2024"; report_step=900.0; wet_step=300.0;
  dry_step=3600.0; routing_step=30.0; total_duration=86400.0; min_surf_area=12.566 }

let new_infil () = { max_rate=3.0; min_rate=0.5; decay=4.0; dry_time=7.0; current_rate=3.0; cumul_infil=0.0 }

let new_model () = { opts=new_options (); gages=[]; subcatchments=[]; infils=[]; nodes=[]; links=[];
  xsects=[]; timeseries=[]; node_map=[]; title="" }

let nth_opt lst n = try Some (List.nth lst n) with _ -> None
let nth_float lst n d = match nth_opt lst n with Some s -> safe_float s | None -> d

let upper s = String.uppercase_ascii s

let split_ws s =
  let words = ref [] in
  let buf = Buffer.create 64 in
  String.iter (fun c ->
    if c = ' ' || c = '\t' || c = '\r' then begin
      if Buffer.length buf > 0 then begin words := Buffer.contents buf :: !words; Buffer.clear buf end
    end else Buffer.add_char buf c
  ) s;
  if Buffer.length buf > 0 then words := Buffer.contents buf :: !words;
  List.rev !words

let find_node_idx m id = List.assoc_opt id m.node_map
let find_xsect m id = List.find_opt (fun xs -> xs.x_id = id) m.xsects

let parse_inp text =
  let m = new_model () in
  let section = ref "" in
  List.iter (fun line ->
    let l = String.trim line in
    if l = "" || (String.length l > 0 && l.[0] = ';') then ()
    else if String.length l > 0 && l.[0] = '[' then begin
      let s = Str.global_replace (Str.regexp "[\\[\\]]") "" l in
      section := upper s
    end else begin
      let t = split_ws l in
      let n = List.length t in
      match !section with
      | "TITLE" -> m.title <- l
      | "OPTIONS" when n >= 2 -> begin
        match upper (List.nth t 0) with
        | "FLOW_UNITS" -> m.opts.flow_units <- List.nth t 1
        | "INFILTRATION" -> m.opts.infiltration <- List.nth t 1
        | "FLOW_ROUTING" -> m.opts.flow_routing <- List.nth t 1
        | "START_DATE" -> m.opts.start_date <- List.nth t 1
        | "END_DATE" -> m.opts.end_date <- List.nth t 1
        | "REPORT_STEP" -> m.opts.report_step <- parse_time_str (List.nth t 1)
        | "WET_STEP" -> m.opts.wet_step <- parse_time_str (List.nth t 1)
        | "DRY_STEP" -> m.opts.dry_step <- parse_time_str (List.nth t 1)
        | "ROUTING_STEP" -> m.opts.routing_step <- parse_time_str (List.nth t 1)
        | _ -> () end
      | "RAINGAGES" when n >= 6 ->
        m.gages <- m.gages @ [{ g_id=List.nth t 0; g_source_name=List.nth t 5 }]
      | "SUBCATCHMENTS" when n >= 7 ->
        m.subcatchments <- m.subcatchments @ [{ sc_id=List.nth t 0; sc_rain_gage=List.nth t 1; sc_outlet=List.nth t 2;
          sc_area=safe_float(List.nth t 3); sc_pct_imperv=safe_float(List.nth t 4);
          sc_width=safe_float(List.nth t 5); sc_slope=safe_float(List.nth t 6);
          sc_runoff=0.0; sc_total_precip=0.0; sc_total_runoff=0.0; sc_total_infil=0.0; sc_peak_runoff=0.0 }];
        m.infils <- m.infils @ [new_infil ()]
      | "INFILTRATION" when n >= 4 ->
        let id = List.nth t 0 in
        m.infils <- List.mapi (fun i inf ->
          if i < List.length m.subcatchments && (List.nth m.subcatchments i).sc_id = id then
            { max_rate=safe_float(List.nth t 1); min_rate=safe_float(List.nth t 2);
              decay=safe_float(List.nth t 3); dry_time=(if n>4 then safe_float(List.nth t 4) else 7.0);
              current_rate=safe_float(List.nth t 1); cumul_infil=0.0 }
          else inf) m.infils
      | "JUNCTIONS" when n >= 2 ->
        let init_d = nth_float t 3 0.0 in
        let nd = { n_id=List.nth t 0; n_type="JUNCTION"; n_invert_elev=safe_float(List.nth t 1);
          n_max_depth=nth_float t 2 0.0; n_sur_depth=nth_float t 4 0.0; n_a_ponded=nth_float t 5 0.0;
          n_depth=init_d; n_head=safe_float(List.nth t 1) +. init_d; n_volume=0.0;
          n_inflow=0.0; n_outflow=0.0; n_overflow=0.0; n_lateral_inflow=0.0;
          n_peak_depth=0.0; n_peak_hgl=0.0; n_total_inflow=0.0; n_total_outflow=0.0; n_flood_volume=0.0 } in
        m.node_map <- m.node_map @ [(nd.n_id, List.length m.nodes)];
        m.nodes <- m.nodes @ [nd]
      | "OUTFALLS" when n >= 3 ->
        let elev = safe_float(List.nth t 1) in
        let nd = { n_id=List.nth t 0; n_type="OUTFALL"; n_invert_elev=elev;
          n_max_depth=0.0; n_sur_depth=0.0; n_a_ponded=0.0;
          n_depth=0.0; n_head=elev; n_volume=0.0;
          n_inflow=0.0; n_outflow=0.0; n_overflow=0.0; n_lateral_inflow=0.0;
          n_peak_depth=0.0; n_peak_hgl=0.0; n_total_inflow=0.0; n_total_outflow=0.0; n_flood_volume=0.0 } in
        m.node_map <- m.node_map @ [(nd.n_id, List.length m.nodes)];
        m.nodes <- m.nodes @ [nd]
      | "CONDUITS" when n >= 6 ->
        m.links <- m.links @ [{ l_id=List.nth t 0; l_from_node=List.nth t 1; l_to_node=List.nth t 2;
          l_length=safe_float(List.nth t 3); l_roughness=safe_float(List.nth t 4);
          l_in_offset=safe_float(List.nth t 5); l_out_offset=nth_float t 6 0.0;
          l_flow=0.0; l_depth=0.0; l_velocity=0.0; l_volume=0.0;
          l_peak_flow=0.0; l_peak_velocity=0.0; l_time_peak_flow=0.0;
          l_max_depth_frac=0.0; l_full_depth=0.0; l_full_area=0.0 }]
      | "XSECTIONS" when n >= 3 ->
        let g1 = safe_float(List.nth t 2) in let g1 = if g1 = 0.0 then 1.0 else g1 in
        let g2 = nth_float t 3 0.0 in
        let tp = upper (List.nth t 1) in
        let af, rf = if tp = "CIRCULAR" then (pi *. (g1 /. 2.0) ** 2.0, g1 /. 4.0)
          else let w = if g2 > 0.0 then g2 else g1 in let a = g1 *. w in let p = 2.0 *. g1 +. 2.0 *. w in
            (a, if p > 0.0 then a /. p else 0.0) in
        m.links <- List.map (fun lk -> if lk.l_id = List.nth t 0 then begin lk.l_full_depth <- g1; lk.l_full_area <- af; lk end else lk) m.links;
        m.xsects <- m.xsects @ [{ x_id=List.nth t 0; x_type=tp; x_geom1=g1; x_geom2=g2; x_a_full=af; x_r_full=rf }]
      | "TIMESERIES" when n >= 3 ->
        let tsid = List.nth t 0 in
        let ts = match List.assoc_opt tsid m.timeseries with
          | Some x -> x | None -> { ts_id=tsid; ts_times=[]; ts_values=[] } in
        let rec parse_vals k = if k+1 < n then begin
          let tv = match String.split_on_char ':' (List.nth t k) with
            | [h;mi] -> safe_float h +. safe_float mi /. 60.0 | _ -> safe_float (List.nth t k) in
          ts.ts_times <- ts.ts_times @ [tv];
          ts.ts_values <- ts.ts_values @ [safe_float (List.nth t (k+1))];
          parse_vals (k+2)
        end in
        parse_vals 1;
        m.timeseries <- List.filter (fun (k,_) -> k <> tsid) m.timeseries @ [(tsid, ts)]
      | _ -> ()
    end
  ) (String.split_on_char '\n' text);
  m.opts.total_duration <- parse_duration m.opts.start_date m.opts.end_date;
  m

let get_rainfall m gage_id elapsed =
  match List.find_opt (fun g -> g.g_id = gage_id) m.gages with
  | None -> 0.0
  | Some g -> match List.assoc_opt g.g_source_name m.timeseries with
    | None -> 0.0
    | Some ts ->
      let t_hr = elapsed /. 3600.0 in
      let rec find_val ts vs = match ts, vs with
        | [], _ | _, [] -> 0.0
        | [t], [v] -> if t_hr >= t then v else 0.0
        | t::_, v::_ when List.length ts = 1 -> if t_hr >= t then v else 0.0
        | _::trest, _::vrest ->
          let result = find_val trest vrest in
          if result > 0.0 then result
          else if t_hr >= List.hd ts then List.hd vs else 0.0
      in
      let rev_find times values =
        let pairs = List.combine times values in
        let rev_pairs = List.rev pairs in
        match List.find_opt (fun (t,_) -> t_hr >= t) rev_pairs with
        | Some (_,v) -> v | None -> 0.0
      in rev_find ts.ts_times ts.ts_values

let horton_infil inf rainfall dt =
  if rainfall <= 0.0 then begin
    let rec_ = if inf.dry_time > 0.0 then dt /. (inf.dry_time *. 86400.0) else 0.0 in
    inf.current_rate <- inf.current_rate +. (inf.max_rate -. inf.current_rate) *. rec_;
    0.0
  end else begin
    let rate = min inf.current_rate rainfall in
    inf.current_rate <- inf.min_rate +. (inf.current_rate -. inf.min_rate) *. exp (-. inf.decay *. dt /. 3600.0);
    inf.cumul_infil <- inf.cumul_infil +. rate *. dt /. 3600.0;
    rate
  end

let xsect_area xs depth =
  if depth <= 0.0 then 0.0
  else if xs.x_type = "CIRCULAR" then begin
    if depth >= xs.x_geom1 then xs.x_a_full
    else let r = xs.x_geom1 /. 2.0 in let y = depth -. r in
      if abs_float r < 1e-10 then 0.0
      else let arg = max (-1.0) (min 1.0 (-. y /. r)) in
        let theta = 2.0 *. acos arg in r *. r *. (theta -. sin theta) /. 2.0
  end else let w = if xs.x_geom2 > 0.0 then xs.x_geom2 else xs.x_geom1 in depth *. w

let xsect_hrad xs depth =
  let area = xsect_area xs depth in
  if area <= 0.0 then 0.0
  else if xs.x_type = "CIRCULAR" then
    let r = xs.x_geom1 /. 2.0 in let y = depth -. r in
    if abs_float r < 1e-10 then 0.0
    else let arg = max (-1.0) (min 1.0 (-. y /. r)) in
      let theta = 2.0 *. acos arg in let perim = r *. theta in
      if perim > 0.0 then area /. perim else 0.0
  else let w = if xs.x_geom2 > 0.0 then xs.x_geom2 else xs.x_geom1 in
    let perim = w +. 2.0 *. depth in if perim > 0.0 then area /. perim else 0.0

let simulate m =
  let dt = m.opts.routing_step in
  let total = m.opts.total_duration in
  let elapsed = ref 0.0 in
  let steps = ref 0 in
  let nodes = Array.of_list m.nodes in
  let links = Array.of_list m.links in
  let scs = Array.of_list m.subcatchments in
  let infs = Array.of_list m.infils in
  let num_n = Array.length nodes in
  let num_l = Array.length links in
  let num_s = Array.length scs in
  while !elapsed < total do
    for i = 0 to num_s - 1 do
      let sc = scs.(i) in
      let rain = get_rainfall m sc.sc_rain_gage !elapsed in
      sc.sc_total_precip <- sc.sc_total_precip +. rain *. dt /. 3600.0;
      let infil_rate = horton_infil infs.(i) (rain *. (1.0 -. sc.sc_pct_imperv /. 100.0)) dt in
      sc.sc_total_infil <- sc.sc_total_infil +. infil_rate *. dt /. 3600.0;
      let runoff_in = rain *. sc.sc_area *. 43560.0 /. 12.0 /. 3600.0 in
      let infil_vol = infil_rate *. sc.sc_area *. (1.0 -. sc.sc_pct_imperv /. 100.0) *. 43560.0 /. 12.0 /. 3600.0 in
      let runoff = max 0.0 (runoff_in -. infil_vol) in
      sc.sc_runoff <- runoff;
      sc.sc_total_runoff <- sc.sc_total_runoff +. runoff *. dt;
      sc.sc_peak_runoff <- max sc.sc_peak_runoff runoff;
      match find_node_idx m sc.sc_outlet with
      | Some ni -> nodes.(ni).n_lateral_inflow <- nodes.(ni).n_lateral_inflow +. runoff
      | None -> ()
    done;
    for i = 0 to num_n - 1 do nodes.(i).n_inflow <- nodes.(i).n_lateral_inflow done;
    for j = 0 to num_l - 1 do
      let lk = links.(j) in
      match find_node_idx m lk.l_from_node, find_node_idx m lk.l_to_node, find_xsect m lk.l_id with
      | Some fi, Some ti, Some xs ->
        let n1 = nodes.(fi) in let n2 = nodes.(ti) in
        let slope = if lk.l_length > 0.0 then (n1.n_head -. n2.n_head) /. lk.l_length else 0.0 in
        let avg_d = max 0.0 (min xs.x_geom1 ((n1.n_depth +. n2.n_depth) /. 2.0)) in
        let area = xsect_area xs avg_d in let hrad = xsect_hrad xs avg_d in
        let mq = if area > 0.0 && hrad > 0.0 && abs_float slope > 1e-12 then
          let sign = if slope > 0.0 then 1.0 else -1.0 in
          sign *. (1.49 /. lk.l_roughness) *. area *. (hrad ** (2.0 /. 3.0)) *. sqrt (abs_float slope)
        else 0.0 in
        lk.l_flow <- lk.l_flow *. 0.5 +. mq *. 0.5;
        if xs.x_a_full > 0.0 then begin
          let sl = max (abs_float slope) 0.001 in
          let qf = (1.49 /. lk.l_roughness) *. xs.x_a_full *. (xs.x_r_full ** (2.0 /. 3.0)) *. sqrt sl in
          if abs_float lk.l_flow > qf *. 1.5 then
            lk.l_flow <- (if lk.l_flow > 0.0 then 1.0 else -1.0) *. qf *. 1.5
        end;
        lk.l_depth <- avg_d;
        lk.l_velocity <- if area > 0.0 then abs_float lk.l_flow /. area else 0.0;
        lk.l_volume <- area *. lk.l_length;
        if abs_float lk.l_flow > lk.l_peak_flow then begin
          lk.l_peak_flow <- abs_float lk.l_flow; lk.l_time_peak_flow <- !elapsed end;
        lk.l_peak_velocity <- max lk.l_peak_velocity lk.l_velocity;
        if xs.x_geom1 > 0.0 then lk.l_max_depth_frac <- max lk.l_max_depth_frac (avg_d /. xs.x_geom1);
        if lk.l_flow > 0.0 then begin
          n1.n_outflow <- n1.n_outflow +. lk.l_flow;
          n2.n_inflow <- n2.n_inflow +. lk.l_flow end
      | _ -> ()
    done;
    for i = 0 to num_n - 1 do
      let n = nodes.(i) in
      if n.n_type <> "OUTFALL" then begin
        let sa = if n.n_a_ponded > 0.0 then n.n_a_ponded else m.opts.min_surf_area in
        let net = n.n_inflow -. n.n_outflow +. n.n_lateral_inflow in
        n.n_depth <- max 0.0 (n.n_depth +. net *. dt /. sa);
        if n.n_max_depth > 0.0 && n.n_depth > n.n_max_depth +. n.n_sur_depth then begin
          n.n_overflow <- n.n_depth -. n.n_max_depth;
          n.n_flood_volume <- n.n_flood_volume +. n.n_overflow *. dt;
          n.n_depth <- n.n_max_depth end;
        n.n_head <- n.n_invert_elev +. n.n_depth;
        n.n_volume <- n.n_depth *. sa;
        n.n_peak_depth <- max n.n_peak_depth n.n_depth;
        n.n_peak_hgl <- max n.n_peak_hgl n.n_head;
        n.n_total_inflow <- n.n_total_inflow +. n.n_inflow *. dt;
        n.n_total_outflow <- n.n_total_outflow +. n.n_outflow *. dt
      end;
      n.n_lateral_inflow <- 0.0; n.n_inflow <- 0.0; n.n_outflow <- 0.0; n.n_overflow <- 0.0
    done;
    elapsed := !elapsed +. dt;
    incr steps
  done;
  m.nodes <- Array.to_list nodes;
  m.links <- Array.to_list links;
  m.subcatchments <- Array.to_list scs;
  m.infils <- Array.to_list infs;
  (!steps, !elapsed)

let fmt_peak_time secs =
  if secs <= 0.0 then "0  00:00"
  else let days = int_of_float (secs /. 86400.0) in
    let rem = secs -. float_of_int days *. 86400.0 in
    let hrs = int_of_float (rem /. 3600.0) in
    let mins = int_of_float ((rem -. float_of_int hrs *. 3600.0) /. 60.0) in
    Printf.sprintf "%d  %02d:%02d" days hrs mins

let generate_rpt m steps wall_ms =
  let buf = Buffer.create 8192 in
  let add s = Buffer.add_string buf s; Buffer.add_char buf '\n' in
  add "  EPA STORM WATER MANAGEMENT MODEL -- OCAML ENGINE";
  add "  SWMM5-OCaml v1.0 -- SWMM5 Rosetta Stone Project";
  add ("  " ^ String.make 60 '='); add "";
  add "  ****************"; add "  Analysis Options"; add "  ****************";
  add (Printf.sprintf "  Flow Units ............... %s" m.opts.flow_units);
  add (Printf.sprintf "  Flow Routing Method ...... %s" m.opts.flow_routing);
  add (Printf.sprintf "  Infiltration Method ...... %s" m.opts.infiltration);
  add (Printf.sprintf "  Starting Date ............ %s" m.opts.start_date);
  add (Printf.sprintf "  Ending Date .............. %s" m.opts.end_date);
  add (Printf.sprintf "  Routing Time Step ........ %.2f sec" m.opts.routing_step); add "";
  add "  ******************"; add "  Node Depth Summary"; add "  ******************"; add "";
  add ("  " ^ String.make 95 '-');
  List.iter (fun n ->
    add (Printf.sprintf "  %-30s %10.3f %10.3f %12.3f" n.n_id (n.n_peak_depth *. 0.4) n.n_peak_depth n.n_peak_hgl)
  ) m.nodes;
  add ""; add "  *************************"; add "  Conduit Flow Summary"; add "  *************************"; add "";
  add ("  " ^ String.make 95 '-');
  List.iter (fun lk ->
    let fq = match find_xsect m lk.l_id with
      | Some xs when xs.x_a_full > 0.0 && xs.x_r_full > 0.0 ->
        (1.49 /. lk.l_roughness) *. xs.x_a_full *. (xs.x_r_full ** (2.0/.3.0)) *. sqrt 0.01
      | _ -> 1.0 in
    let mff = if fq > 0.0 then lk.l_peak_flow /. fq else 0.0 in
    add (Printf.sprintf "  %-30s %10.3f %12s %10.3f %8.2f %8.2f" lk.l_id lk.l_peak_flow (fmt_peak_time lk.l_time_peak_flow) lk.l_peak_velocity mff lk.l_max_depth_frac)
  ) m.links;
  add ""; add "  *********************"; add "  Simulation Summary"; add "  *********************"; add "";
  add "  Engine ................... SWMM5-OCaml v1.0";
  add (Printf.sprintf "  Total Steps .............. %d" steps);
  add (Printf.sprintf "  Simulation Duration ...... %.1f seconds (%.2f hours)" m.opts.total_duration (m.opts.total_duration /. 3600.0));
  add (Printf.sprintf "  Wall-Clock Time .......... %.1f ms" wall_ms);
  add (Printf.sprintf "  Nodes .................... %d" (List.length m.nodes));
  add (Printf.sprintf "  Links .................... %d" (List.length m.links));
  add (Printf.sprintf "  Subcatchments ............ %d" (List.length m.subcatchments)); add "";
  Buffer.contents buf

let escape_json s =
  let buf = Buffer.create (String.length s * 2) in
  String.iter (fun c -> match c with
    | '\\' -> Buffer.add_string buf "\\\\"
    | '"' -> Buffer.add_string buf "\\\""
    | '\n' -> Buffer.add_string buf "\\n"
    | '\r' -> Buffer.add_string buf "\\r"
    | '\t' -> Buffer.add_string buf "\\t"
    | c -> Buffer.add_char buf c) s;
  Buffer.contents buf

let () =
  let inp = In_channel.input_all stdin in
  let t0 = Sys.time () in
  let m = parse_inp inp in
  let (steps, _) = simulate m in
  let wall_ms = (Sys.time () -. t0) *. 1000.0 in
  let rpt = generate_rpt m steps wall_ms in
  Printf.printf "{\"success\":true,\"rpt\":\"%s\"}" (escape_json rpt)
