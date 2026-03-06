defmodule SwmmEngine do
  @pi 3.14159265358979323846

  def safe_float(s, default \\ 0.0) do
    case Float.parse(to_string(s)) do
      {v, _} -> v
      :error -> case Integer.parse(to_string(s)) do
        {v, _} -> v * 1.0
        :error -> default
      end
    end
  end

  def parse_time_str(s) do
    s = String.trim(s)
    case String.split(s, ":") do
      [h, m | rest] ->
        sec = if length(rest) > 0, do: safe_float(hd(rest)), else: 0.0
        safe_float(h) * 3600 + safe_float(m) * 60 + sec
      _ -> safe_float(s)
    end
  end

  def parse_duration(start_d, end_d) do
    try do
      [sm, sd, sy] = String.split(start_d, "/")
      [em, ed, ey] = String.split(end_d, "/")
      d1 = Date.new!(String.to_integer(sy), String.to_integer(sm), String.to_integer(sd))
      d2 = Date.new!(String.to_integer(ey), String.to_integer(em), String.to_integer(ed))
      diff = Date.diff(d2, d1) * 86400.0
      if diff > 0, do: diff, else: 86400.0
    rescue
      _ -> 86400.0
    end
  end

  def parse_inp(text) do
    m = %{opts: %{flow_units: "CFS", infiltration: "HORTON", flow_routing: "DYNWAVE",
      start_date: "01/01/2024", end_date: "01/02/2024", report_step: 900.0, wet_step: 300.0,
      dry_step: 3600.0, routing_step: 30.0, total_duration: 86400.0, min_surf_area: 12.566},
      gages: [], subcatchments: [], infil: [], nodes: [], links: [], xsects: [],
      timeseries: %{}, node_map: %{}, title: ""}

    lines = String.split(text, "\n")
    {m, _} = Enum.reduce(lines, {m, ""}, fn line, {m, section} ->
      l = String.trim(line)
      cond do
        l == "" or String.starts_with?(l, ";") -> {m, section}
        String.starts_with?(l, "[") ->
          sec = l |> String.replace("[", "") |> String.replace("]", "") |> String.upcase()
          {m, sec}
        true ->
          t = String.split(l)
          if length(t) == 0, do: {m, section}, else: parse_section(m, section, t, l)
      end
    end)
    put_in(m, [:opts, :total_duration], parse_duration(m.opts.start_date, m.opts.end_date))
  end

  defp parse_section(m, "TITLE", _t, l), do: {%{m | title: l}, "TITLE"}
  defp parse_section(m, "OPTIONS", t, _l) when length(t) >= 2 do
    k = String.upcase(hd(t)); v = Enum.at(t, 1)
    opts = case k do
      "FLOW_UNITS" -> %{m.opts | flow_units: v}
      "INFILTRATION" -> %{m.opts | infiltration: v}
      "FLOW_ROUTING" -> %{m.opts | flow_routing: v}
      "START_DATE" -> %{m.opts | start_date: v}
      "END_DATE" -> %{m.opts | end_date: v}
      "REPORT_STEP" -> %{m.opts | report_step: parse_time_str(v)}
      "WET_STEP" -> %{m.opts | wet_step: parse_time_str(v)}
      "DRY_STEP" -> %{m.opts | dry_step: parse_time_str(v)}
      "ROUTING_STEP" -> %{m.opts | routing_step: parse_time_str(v)}
      _ -> m.opts
    end
    {%{m | opts: opts}, "OPTIONS"}
  end
  defp parse_section(m, "RAINGAGES", t, _l) when length(t) >= 6 do
    g = %{id: Enum.at(t,0), format: Enum.at(t,1), interval: parse_time_str(Enum.at(t,2))/60,
      scf: safe_float(Enum.at(t,3)), source_type: Enum.at(t,4), source_name: Enum.at(t,5)}
    {%{m | gages: m.gages ++ [g]}, "RAINGAGES"}
  end
  defp parse_section(m, "SUBCATCHMENTS", t, _l) when length(t) >= 7 do
    sc = %{id: Enum.at(t,0), rain_gage: Enum.at(t,1), outlet: Enum.at(t,2),
      area: safe_float(Enum.at(t,3)), pct_imperv: safe_float(Enum.at(t,4)),
      width: safe_float(Enum.at(t,5)), slope: safe_float(Enum.at(t,6)),
      runoff: 0.0, rainfall: 0.0, total_precip: 0.0, total_runoff: 0.0, total_infil: 0.0, peak_runoff: 0.0}
    inf = %{max_rate: 3.0, min_rate: 0.5, decay: 4.0, dry_time: 7.0, current_rate: 3.0, cumul_infil: 0.0}
    {%{m | subcatchments: m.subcatchments ++ [sc], infil: m.infil ++ [inf]}, "SUBCATCHMENTS"}
  end
  defp parse_section(m, "INFILTRATION", t, _l) when length(t) >= 4 do
    idx = Enum.find_index(m.subcatchments, &(&1.id == Enum.at(t,0)))
    if idx do
      inf = %{max_rate: safe_float(Enum.at(t,1)), min_rate: safe_float(Enum.at(t,2)),
        decay: safe_float(Enum.at(t,3)), dry_time: if(length(t)>4, do: safe_float(Enum.at(t,4)), else: 7.0),
        current_rate: safe_float(Enum.at(t,1)), cumul_infil: 0.0}
      {%{m | infil: List.replace_at(m.infil, idx, inf)}, "INFILTRATION"}
    else
      {m, "INFILTRATION"}
    end
  end
  defp parse_section(m, "JUNCTIONS", t, _l) when length(t) >= 2 do
    init_d = if(length(t) > 3, do: safe_float(Enum.at(t,3)), else: 0.0)
    n = %{id: Enum.at(t,0), type: "JUNCTION", invert_elev: safe_float(Enum.at(t,1)),
      max_depth: if(length(t)>2, do: safe_float(Enum.at(t,2)), else: 0.0), init_depth: init_d,
      sur_depth: if(length(t)>4, do: safe_float(Enum.at(t,4)), else: 0.0),
      a_ponded: if(length(t)>5, do: safe_float(Enum.at(t,5)), else: 0.0),
      depth: init_d, head: safe_float(Enum.at(t,1)) + init_d,
      volume: 0.0, inflow: 0.0, outflow: 0.0, overflow: 0.0, lateral_inflow: 0.0,
      peak_depth: 0.0, peak_hgl: 0.0, total_inflow: 0.0, total_outflow: 0.0, flood_volume: 0.0}
    nm = Map.put(m.node_map, n.id, length(m.nodes))
    {%{m | nodes: m.nodes ++ [n], node_map: nm}, "JUNCTIONS"}
  end
  defp parse_section(m, "OUTFALLS", t, _l) when length(t) >= 3 do
    elev = safe_float(Enum.at(t,1))
    n = %{id: Enum.at(t,0), type: "OUTFALL", invert_elev: elev, max_depth: 0.0, init_depth: 0.0,
      sur_depth: 0.0, a_ponded: 0.0, depth: 0.0, head: elev,
      volume: 0.0, inflow: 0.0, outflow: 0.0, overflow: 0.0, lateral_inflow: 0.0,
      peak_depth: 0.0, peak_hgl: 0.0, total_inflow: 0.0, total_outflow: 0.0, flood_volume: 0.0}
    nm = Map.put(m.node_map, n.id, length(m.nodes))
    {%{m | nodes: m.nodes ++ [n], node_map: nm}, "OUTFALLS"}
  end
  defp parse_section(m, "CONDUITS", t, _l) when length(t) >= 6 do
    lk = %{id: Enum.at(t,0), from_node: Enum.at(t,1), to_node: Enum.at(t,2),
      length: safe_float(Enum.at(t,3)), roughness: safe_float(Enum.at(t,4)),
      in_offset: safe_float(Enum.at(t,5)), out_offset: if(length(t)>6, do: safe_float(Enum.at(t,6)), else: 0.0),
      flow: 0.0, depth: 0.0, velocity: 0.0, volume: 0.0, peak_flow: 0.0, peak_velocity: 0.0,
      time_peak_flow: 0.0, max_depth_frac: 0.0, full_depth: 0.0, full_area: 0.0}
    {%{m | links: m.links ++ [lk]}, "CONDUITS"}
  end
  defp parse_section(m, "XSECTIONS", t, _l) when length(t) >= 3 do
    g1 = safe_float(Enum.at(t,2), 1.0)
    g2 = if(length(t)>3, do: safe_float(Enum.at(t,3)), else: 0.0)
    tp = String.upcase(Enum.at(t,1))
    {af, rf} = if tp == "CIRCULAR" do
      {@pi * :math.pow(g1/2, 2), g1/4}
    else
      w = if(g2 > 0, do: g2, else: g1); a = g1*w; p = 2*g1+2*w
      {a, if(p > 0, do: a/p, else: 0.0)}
    end
    links = Enum.map(m.links, fn lk ->
      if lk.id == Enum.at(t,0), do: %{lk | full_depth: g1, full_area: af}, else: lk
    end)
    xs = %{id: Enum.at(t,0), xtype: tp, geom1: g1, geom2: g2, a_full: af, r_full: rf}
    {%{m | links: links, xsects: m.xsects ++ [xs]}, "XSECTIONS"}
  end
  defp parse_section(m, "TIMESERIES", t, _l) when length(t) >= 3 do
    tsid = Enum.at(t, 0)
    ts = Map.get(m.timeseries, tsid, %{id: tsid, times: [], values: []})
    ts = parse_ts_values(ts, t, 1)
    {%{m | timeseries: Map.put(m.timeseries, tsid, ts)}, "TIMESERIES"}
  end
  defp parse_section(m, section, _t, _l), do: {m, section}

  defp parse_ts_values(ts, t, k) when k + 1 < length(t) do
    tv = case Float.parse(Enum.at(t, k)) do
      {v, _} -> v
      :error ->
        parts = String.split(Enum.at(t, k), ":")
        safe_float(hd(parts)) + if(length(parts)>1, do: safe_float(Enum.at(parts,1))/60, else: 0.0)
    end
    ts = %{ts | times: ts.times ++ [tv], values: ts.values ++ [safe_float(Enum.at(t, k+1))]}
    parse_ts_values(ts, t, k + 2)
  end
  defp parse_ts_values(ts, _t, _k), do: ts

  def get_rainfall(m, gage_id, elapsed) do
    case Enum.find(m.gages, &(&1.id == gage_id)) do
      nil -> 0.0
      g -> case Map.get(m.timeseries, g.source_name) do
        nil -> 0.0
        ts -> t_hr = elapsed / 3600.0
          case Enum.reverse(ts.times) |> Enum.zip(Enum.reverse(ts.values)) |> Enum.find(fn {t, _} -> t_hr >= t end) do
            nil -> 0.0
            {_, v} -> v
          end
      end
    end
  end

  def horton_infil(inf, rainfall, dt) do
    if rainfall <= 0 do
      rec = if(inf.dry_time > 0, do: dt / (inf.dry_time * 86400), else: 0.0)
      {0.0, %{inf | current_rate: inf.current_rate + (inf.max_rate - inf.current_rate) * rec}}
    else
      rate = min(inf.current_rate, rainfall)
      cr = inf.min_rate + (inf.current_rate - inf.min_rate) * :math.exp(-inf.decay * dt / 3600)
      {rate, %{inf | current_rate: cr, cumul_infil: inf.cumul_infil + rate * dt / 3600}}
    end
  end

  def xsect_area(xs, depth) do
    cond do
      depth <= 0 -> 0.0
      xs.xtype == "CIRCULAR" ->
        if depth >= xs.geom1, do: xs.a_full,
        else: (
          r = xs.geom1 / 2; y = depth - r
          if abs(r) < 1.0e-10, do: 0.0,
          else: (
            arg = max(-1.0, min(1.0, -y / r))
            theta = 2 * :math.acos(arg)
            r * r * (theta - :math.sin(theta)) / 2
          )
        )
      true -> w = if(xs.geom2 > 0, do: xs.geom2, else: xs.geom1); depth * w
    end
  end

  def xsect_hrad(xs, depth) do
    area = xsect_area(xs, depth)
    if area <= 0 do
      0.0
    else
      if xs.xtype == "CIRCULAR" do
        r = xs.geom1 / 2; y = depth - r
        if abs(r) < 1.0e-10 do
          0.0
        else
          arg = max(-1.0, min(1.0, -y / r))
          theta = 2 * :math.acos(arg); perim = r * theta
          if(perim > 0, do: area / perim, else: 0.0)
        end
      else
        w = if(xs.geom2 > 0, do: xs.geom2, else: xs.geom1); perim = w + 2 * depth
        if(perim > 0, do: area / perim, else: 0.0)
      end
    end
  end

  def find_xsect(m, link_id), do: Enum.find(m.xsects, &(&1.id == link_id))

  def simulate(m) do
    dt = m.opts.routing_step; total = m.opts.total_duration
    do_step(m, dt, total, 0.0, 0)
  end

  defp do_step(m, dt, total, elapsed, steps) when elapsed >= total, do: {steps, elapsed, m}
  defp do_step(m, dt, total, elapsed, steps) do
    {m, _} = Enum.reduce(0..max(0, length(m.subcatchments)-1)//1, {m, nil}, fn i, {m, _} ->
      sc = Enum.at(m.subcatchments, i)
      rain = get_rainfall(m, sc.rain_gage, elapsed)
      sc = %{sc | rainfall: rain, total_precip: sc.total_precip + rain * dt / 3600}
      {infil_rate, inf} = horton_infil(Enum.at(m.infil, i), rain * (1 - sc.pct_imperv / 100), dt)
      sc = %{sc | total_infil: sc.total_infil + infil_rate * dt / 3600}
      runoff_in = rain * sc.area * 43560 / 12 / 3600
      infil_vol = infil_rate * sc.area * (1 - sc.pct_imperv / 100) * 43560 / 12 / 3600
      runoff = max(0.0, runoff_in - infil_vol)
      sc = %{sc | runoff: runoff, total_runoff: sc.total_runoff + runoff * dt, peak_runoff: max(sc.peak_runoff, runoff)}
      nodes = case Map.get(m.node_map, sc.outlet) do
        nil -> m.nodes
        ni -> List.update_at(m.nodes, ni, &(%{&1 | lateral_inflow: &1.lateral_inflow + runoff}))
      end
      {%{m | subcatchments: List.replace_at(m.subcatchments, i, sc), infil: List.replace_at(m.infil, i, inf), nodes: nodes}, nil}
    end)
    nodes = Enum.map(m.nodes, &(%{&1 | inflow: &1.lateral_inflow}))
    m = %{m | nodes: nodes}
    {links, nodes} = Enum.reduce(0..max(0, length(m.links)-1)//1, {m.links, m.nodes}, fn j, {links, nodes} ->
      lk = Enum.at(links, j)
      fi = Map.get(m.node_map, lk.from_node); ti = Map.get(m.node_map, lk.to_node)
      xs = find_xsect(m, lk.id)
      if fi == nil or ti == nil or xs == nil do
        {links, nodes}
      else
          n1 = Enum.at(nodes, fi); n2 = Enum.at(nodes, ti)
          slope = if(lk.length > 0, do: (n1.head - n2.head) / lk.length, else: 0.0)
          avg_d = max(0.0, min(xs.geom1, (n1.depth + n2.depth) / 2))
          area = xsect_area(xs, avg_d); hrad = xsect_hrad(xs, avg_d)
          mq = if area > 0 and hrad > 0 and abs(slope) > 1.0e-12 do
            sgn = if(slope > 0, do: 1.0, else: -1.0)
            sgn * (1.49 / lk.roughness) * area * :math.pow(hrad, 2/3) * :math.sqrt(abs(slope))
          else 0.0 end
          flow = lk.flow * 0.5 + mq * 0.5
          flow = if xs.a_full > 0 do
            sl = max(abs(slope), 0.001)
            qf = (1.49 / lk.roughness) * xs.a_full * :math.pow(xs.r_full, 2/3) * :math.sqrt(sl)
            if(abs(flow) > qf * 1.5, do: (if(flow > 0, do: 1.0, else: -1.0)) * qf * 1.5, else: flow)
          else flow end
          vel = if(area > 0, do: abs(flow) / area, else: 0.0)
          {pf, tpf} = if(abs(flow) > lk.peak_flow, do: {abs(flow), elapsed}, else: {lk.peak_flow, lk.time_peak_flow})
          mdf = if(xs.geom1 > 0, do: max(lk.max_depth_frac, avg_d / xs.geom1), else: lk.max_depth_frac)
          lk = %{lk | flow: flow, depth: avg_d, velocity: vel, volume: area * lk.length,
            peak_flow: pf, time_peak_flow: tpf, peak_velocity: max(lk.peak_velocity, vel), max_depth_frac: mdf}
          nodes = if flow > 0 do
            nodes |> List.update_at(fi, &(%{&1 | outflow: &1.outflow + flow}))
                  |> List.update_at(ti, &(%{&1 | inflow: &1.inflow + flow}))
          else nodes end
          {List.replace_at(links, j, lk), nodes}
      end
    end)

    nodes = Enum.with_index(nodes) |> Enum.map(fn {n, _i} ->
      if n.type != "OUTFALL" do
        sa = if(n.a_ponded > 0, do: n.a_ponded, else: m.opts.min_surf_area)
        net = n.inflow - n.outflow + n.lateral_inflow
        depth = max(0.0, n.depth + net * dt / sa)
        {depth, fv} = if n.max_depth > 0 and depth > n.max_depth + n.sur_depth do
          {n.max_depth, n.flood_volume + (depth - n.max_depth) * dt}
        else {depth, n.flood_volume} end
        head = n.invert_elev + depth
        %{n | depth: depth, head: head, volume: depth * sa,
          peak_depth: max(n.peak_depth, depth), peak_hgl: max(n.peak_hgl, head),
          total_inflow: n.total_inflow + n.inflow * dt, total_outflow: n.total_outflow + n.outflow * dt,
          flood_volume: fv, lateral_inflow: 0.0, inflow: 0.0, outflow: 0.0, overflow: 0.0}
      else %{n | lateral_inflow: 0.0, inflow: 0.0, outflow: 0.0, overflow: 0.0} end
    end)
    do_step(%{m | links: links, nodes: nodes}, dt, total, elapsed + dt, steps + 1)
  end

  def fmt_peak_time(secs) do
    if secs <= 0, do: "0  00:00",
    else: (
      days = trunc(secs / 86400); rem = secs - days * 86400
      hrs = trunc(rem / 3600); mins = trunc((rem - hrs * 3600) / 60)
      "#{days}  #{String.pad_leading("#{hrs}", 2, "0")}:#{String.pad_leading("#{mins}", 2, "0")}"
    )
  end

  def generate_rpt(m, steps, wall_ms) do
    lines = ["  EPA STORM WATER MANAGEMENT MODEL -- ELIXIR ENGINE",
      "  SWMM5-Elixir v1.0 -- SWMM5 Rosetta Stone Project",
      "  " <> String.duplicate("=", 60), "",
      "  ****************", "  Analysis Options", "  ****************",
      "  Flow Units ............... #{m.opts.flow_units}",
      "  Flow Routing Method ...... #{m.opts.flow_routing}",
      "  Infiltration Method ...... #{m.opts.infiltration}",
      "  Starting Date ............ #{m.opts.start_date}",
      "  Ending Date .............. #{m.opts.end_date}",
      "  Routing Time Step ........ #{:erlang.float_to_binary(m.opts.routing_step, decimals: 2)} sec", "",
      "  ******************", "  Node Depth Summary", "  ******************", "",
      "  " <> String.duplicate("-", 95)]
    lines = lines ++ Enum.map(m.nodes, fn n ->
      :io_lib.format("  ~-30s ~10.3f ~10.3f ~12.3f", [n.id, n.peak_depth*0.4, n.peak_depth, n.peak_hgl]) |> to_string()
    end)
    lines = lines ++ ["", "  *************************", "  Conduit Flow Summary", "  *************************", "",
      "  " <> String.duplicate("-", 95)]
    lines = lines ++ Enum.map(m.links, fn lk ->
      xs = find_xsect(m, lk.id)
      fq = if xs && xs.a_full > 0 && xs.r_full > 0, do: (1.49/lk.roughness)*xs.a_full*:math.pow(xs.r_full,2/3)*:math.sqrt(0.01), else: 1.0
      mff = if(fq > 0, do: lk.peak_flow / fq, else: 0.0)
      :io_lib.format("  ~-30s ~10.3f ~12s ~10.3f ~8.2f ~8.2f", [lk.id, lk.peak_flow, fmt_peak_time(lk.time_peak_flow), lk.peak_velocity, mff, lk.max_depth_frac]) |> to_string()
    end)
    lines = lines ++ ["", "  *********************", "  Simulation Summary", "  *********************", "",
      "  Engine ................... SWMM5-Elixir v1.0",
      "  Total Steps .............. #{steps}",
      "  Simulation Duration ...... #{:erlang.float_to_binary(m.opts.total_duration, decimals: 1)} seconds (#{:erlang.float_to_binary(m.opts.total_duration/3600, decimals: 2)} hours)",
      "  Wall-Clock Time .......... #{:erlang.float_to_binary(wall_ms, decimals: 1)} ms",
      "  Nodes .................... #{length(m.nodes)}",
      "  Links .................... #{length(m.links)}",
      "  Subcatchments ............ #{length(m.subcatchments)}", ""]
    Enum.join(lines, "\n")
  end

  def escape_json(s) do
    s |> String.replace("\\", "\\\\") |> String.replace("\"", "\\\"")
      |> String.replace("\n", "\\n") |> String.replace("\r", "\\r") |> String.replace("\t", "\\t")
  end

  defp read_http(socket) do
    read_http(socket, <<>>)
  end
  defp read_http(socket, buf) do
    case :gen_tcp.recv(socket, 0, 5000) do
      {:ok, data} ->
        buf = buf <> data
        case String.split(buf, "\r\n\r\n", parts: 2) do
          [headers, body] ->
            cl = case Regex.run(~r/[Cc]ontent-[Ll]ength:\s*(\d+)/, headers) do
              [_, n] -> String.to_integer(n)
              _ -> 0
            end
            if byte_size(body) >= cl, do: buf,
            else: read_http_body(socket, buf, cl - byte_size(body))
          _ -> read_http(socket, buf)
        end
      _ -> buf
    end
  end
  defp read_http_body(socket, buf, remaining) when remaining <= 0, do: buf
  defp read_http_body(socket, buf, remaining) do
    case :gen_tcp.recv(socket, min(remaining, 65536), 30000) do
      {:ok, data} -> read_http_body(socket, buf <> data, remaining - byte_size(data))
      _ -> buf
    end
  end

  def handle_client(socket) do
    data = read_http(socket)
    req = to_string(data)
    resp = cond do
      String.starts_with?(req, "GET /health") ->
        json = ~s({"engine":"SWMM5-Elixir","status":"ok","version":"v1.0","language":"Elixir"})
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: #{byte_size(json)}\r\n\r\n#{json}"
      String.starts_with?(req, "POST /simulate") ->
        [_headers, body] = String.split(req, "\r\n\r\n", parts: 2)
        t0 = :os.system_time(:millisecond)
        m = parse_inp(body)
        {steps, _elapsed, m} = simulate(m)
        wall_ms = :os.system_time(:millisecond) - t0
        rpt = generate_rpt(m, steps, wall_ms / 1.0)
        json = ~s({"success":true,"rpt":"#{escape_json(rpt)}"})
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: #{byte_size(json)}\r\n\r\n#{json}"
      true -> "HTTP/1.1 404 Not Found\r\n\r\n"
    end
    :gen_tcp.send(socket, resp)
    :gen_tcp.close(socket)
  end

  def start(port) do
    {:ok, listen} = :gen_tcp.listen(port, [:binary, active: false, reuseaddr: true, packet: :raw, buffer: 2_000_000])
    IO.puts("SWMM5-Elixir engine listening on port #{port}")
    accept_loop(listen)
  end

  defp accept_loop(listen) do
    {:ok, socket} = :gen_tcp.accept(listen)
    try do handle_client(socket) rescue _ -> :ok end
    accept_loop(listen)
  end
end

port = String.to_integer(System.get_env("ELIXIR_ENGINE_PORT") || "3019")
SwmmEngine.start(port)
