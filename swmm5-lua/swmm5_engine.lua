local PI = math.pi

local function parse_time_str(s)
  s = s:match("^%s*(.-)%s*$")
  local h, m, sec = s:match("^(%d+):(%d+):?(%d*%.?%d*)$")
  if h then return tonumber(h) * 3600 + tonumber(m) * 60 + (tonumber(sec) or 0) end
  return tonumber(s) or 0
end

local function parse_duration(start_date, end_date)
  local sm, sd, sy = start_date:match("(%d+)/(%d+)/(%d+)")
  local em, ed, ey = end_date:match("(%d+)/(%d+)/(%d+)")
  if not (sm and em) then return 86400 end
  local t1 = os.time({year=tonumber(sy), month=tonumber(sm), day=tonumber(sd)})
  local t2 = os.time({year=tonumber(ey), month=tonumber(em), day=tonumber(ed)})
  local diff = t2 - t1
  return diff > 0 and diff or 86400
end

local function split(s)
  local t = {}
  for w in s:gmatch("%S+") do t[#t + 1] = w end
  return t
end

local function parse_inp(text)
  local model = {
    options = {
      flow_units = "CFS", infiltration = "HORTON", flow_routing = "DYNWAVE",
      start_date = "01/01/2024", end_date = "01/02/2024",
      report_step = 900, routing_step = 30, total_duration = 86400, min_surf_area = 12.566,
    },
    gages = {}, subcatchments = {}, infil = {}, nodes = {}, links = {}, xsects = {},
    timeseries = {}, node_map = {}, title = "",
  }

  local section = ""
  for line in text:gmatch("[^\n]+") do
    line = line:match("^%s*(.-)%s*$")
    if line == "" or line:sub(1, 1) == ";" then goto continue end
    if line:sub(1, 1) == "[" then
      section = line:match("%[(%w+)%]") or ""
      section = section:upper()
      goto continue
    end
    local t = split(line)
    if #t < 1 then goto continue end

    if section == "TITLE" then
      model.title = line
    elseif section == "OPTIONS" and #t >= 2 then
      local key = t[1]:upper()
      if key == "FLOW_UNITS" then model.options.flow_units = t[2]
      elseif key == "INFILTRATION" then model.options.infiltration = t[2]
      elseif key == "FLOW_ROUTING" then model.options.flow_routing = t[2]
      elseif key == "START_DATE" then model.options.start_date = t[2]
      elseif key == "END_DATE" then model.options.end_date = t[2]
      elseif key == "REPORT_STEP" then model.options.report_step = parse_time_str(t[2])
      elseif key == "ROUTING_STEP" then model.options.routing_step = parse_time_str(t[2])
      end
    elseif section == "RAINGAGES" and #t >= 6 then
      model.gages[#model.gages + 1] = { id = t[1], source_name = t[6] }
    elseif section == "SUBCATCHMENTS" and #t >= 7 then
      model.subcatchments[#model.subcatchments + 1] = {
        id = t[1], rain_gage = t[2], outlet = t[3],
        area = tonumber(t[4]), pct_imperv = tonumber(t[5]),
        width = tonumber(t[6]), slope = tonumber(t[7]),
        runoff = 0, total_precip = 0, total_runoff = 0, total_infil = 0, peak_runoff = 0,
      }
      model.infil[#model.infil + 1] = {
        max_rate = 3, min_rate = 0.5, decay = 4, dry_time = 7, current_rate = 3, cumul_infil = 0,
      }
    elseif section == "INFILTRATION" and #t >= 4 then
      for i, sc in ipairs(model.subcatchments) do
        if sc.id == t[1] then
          model.infil[i].max_rate = tonumber(t[2])
          model.infil[i].min_rate = tonumber(t[3])
          model.infil[i].decay = tonumber(t[4])
          model.infil[i].dry_time = tonumber(t[5] or "7")
          model.infil[i].current_rate = model.infil[i].max_rate
          break
        end
      end
    elseif section == "JUNCTIONS" and #t >= 2 then
      local ie = tonumber(t[2])
      local md = tonumber(t[3] or "0")
      local id_ = tonumber(t[4] or "0")
      local sd = tonumber(t[5] or "0")
      local ap = tonumber(t[6] or "0")
      model.node_map[t[1]] = #model.nodes + 1
      model.nodes[#model.nodes + 1] = {
        id = t[1], ntype = "JUNCTION", invert_elev = ie, max_depth = md,
        sur_depth = sd, a_ponded = ap, depth = id_, head = ie + id_,
        volume = 0, inflow = 0, outflow = 0, overflow = 0, lateral_inflow = 0,
        peak_depth = 0, peak_hgl = 0, total_inflow = 0, total_outflow = 0, flood_volume = 0,
      }
    elseif section == "OUTFALLS" and #t >= 3 then
      local ie = tonumber(t[2])
      model.node_map[t[1]] = #model.nodes + 1
      model.nodes[#model.nodes + 1] = {
        id = t[1], ntype = "OUTFALL", invert_elev = ie, max_depth = 0,
        sur_depth = 0, a_ponded = 0, depth = 0, head = ie,
        volume = 0, inflow = 0, outflow = 0, overflow = 0, lateral_inflow = 0,
        peak_depth = 0, peak_hgl = 0, total_inflow = 0, total_outflow = 0, flood_volume = 0,
      }
    elseif section == "CONDUITS" and #t >= 6 then
      model.links[#model.links + 1] = {
        id = t[1], from_node = t[2], to_node = t[3],
        length = tonumber(t[4]), roughness = tonumber(t[5]),
        in_offset = tonumber(t[6]), out_offset = tonumber(t[7] or "0"),
        flow = 0, depth = 0, velocity = 0, volume = 0,
        peak_flow = 0, peak_velocity = 0, time_peak_flow = 0,
        max_depth_frac = 0, full_depth = 0, full_area = 0,
      }
    elseif section == "XSECTIONS" and #t >= 3 then
      local g1 = tonumber(t[3])
      local g2 = tonumber(t[4] or "0")
      local tp = t[2]:upper()
      if not g1 then g1 = 1.0 end
      if not g2 then g2 = 0 end
      local af, rf
      if tp == "CIRCULAR" then
        af = PI * (g1 / 2) ^ 2
        rf = g1 / 4
      else
        local w = g2 > 0 and g2 or g1
        af = g1 * w
        local p = 2 * g1 + 2 * w
        rf = p > 0 and af / p or 0
      end
      for _, lk in ipairs(model.links) do
        if lk.id == t[1] then lk.full_depth = g1; lk.full_area = af; break end
      end
      model.xsects[#model.xsects + 1] = { id = t[1], xtype = tp, geom1 = g1, geom2 = g2, a_full = af, r_full = rf }
    elseif section == "TIMESERIES" and #t >= 3 then
      local tsid = t[1]
      if not model.timeseries[tsid] then model.timeseries[tsid] = { times = {}, values = {} } end
      local ts = model.timeseries[tsid]
      local k = 2
      while k + 1 <= #t do
        local tval = t[k]
        local hh, mm = tval:match("^(%d+):(%d+)$")
        if hh then tval = tonumber(hh) + tonumber(mm) / 60.0 else tval = tonumber(tval) end
        ts.times[#ts.times + 1] = tval
        ts.values[#ts.values + 1] = tonumber(t[k + 1])
        k = k + 2
      end
    end
    ::continue::
  end

  model.options.total_duration = parse_duration(model.options.start_date, model.options.end_date)
  return model
end

local function get_rainfall(model, gage_id, elapsed)
  for _, g in ipairs(model.gages) do
    if g.id == gage_id then
      local ts = model.timeseries[g.source_name]
      if not ts or #ts.times == 0 then return 0 end
      local t_hr = elapsed / 3600
      for i = #ts.times, 1, -1 do
        if t_hr >= ts.times[i] then return ts.values[i] end
      end
      return 0
    end
  end
  return 0
end

local function horton_infil(inf, rainfall, dt)
  if rainfall <= 0 then
    local rec = inf.dry_time > 0 and dt / (inf.dry_time * 86400) or 0
    inf.current_rate = inf.current_rate + (inf.max_rate - inf.current_rate) * rec
    return 0
  end
  local rate = math.min(inf.current_rate, rainfall)
  inf.current_rate = inf.min_rate + (inf.current_rate - inf.min_rate) * math.exp(-inf.decay * dt / 3600)
  inf.cumul_infil = inf.cumul_infil + rate * dt / 3600
  return rate
end

local function xsect_area(xs, depth)
  if depth <= 0 then return 0 end
  if xs.xtype == "CIRCULAR" then
    if depth >= xs.geom1 then return xs.a_full end
    local r = xs.geom1 / 2
    local y = depth - r
    if math.abs(r) < 1e-10 then return 0 end
    local arg = math.max(-1, math.min(1, -y / r))
    local theta = 2 * math.acos(arg)
    return r * r * (theta - math.sin(theta)) / 2
  end
  local w = xs.geom2 > 0 and xs.geom2 or xs.geom1
  return depth * w
end

local function xsect_hrad(xs, depth)
  local area = xsect_area(xs, depth)
  if area <= 0 then return 0 end
  if xs.xtype == "CIRCULAR" then
    local r = xs.geom1 / 2
    local y = depth - r
    if math.abs(r) < 1e-10 then return 0 end
    local arg = math.max(-1, math.min(1, -y / r))
    local theta = 2 * math.acos(arg)
    local perim = r * theta
    return perim > 0 and area / perim or 0
  end
  local w = xs.geom2 > 0 and xs.geom2 or xs.geom1
  local perim = w + 2 * depth
  return perim > 0 and area / perim or 0
end

local function find_xsect(model, link_id)
  for _, xs in ipairs(model.xsects) do
    if xs.id == link_id then return xs end
  end
  return nil
end

local function simulate(model)
  local dt = model.options.routing_step
  local total = model.options.total_duration
  local elapsed = 0
  local steps = 0

  while elapsed < total do
    for i, sc in ipairs(model.subcatchments) do
      local rain = get_rainfall(model, sc.rain_gage, elapsed)
      sc.total_precip = sc.total_precip + rain * dt / 3600
      local infil_rate = horton_infil(model.infil[i], rain * (1 - sc.pct_imperv / 100), dt)
      sc.total_infil = sc.total_infil + infil_rate * dt / 3600
      local runoff_in = rain * sc.area * 43560 / 12 / 3600
      local infil_vol = infil_rate * sc.area * (1 - sc.pct_imperv / 100) * 43560 / 12 / 3600
      sc.runoff = math.max(0, runoff_in - infil_vol)
      sc.total_runoff = sc.total_runoff + sc.runoff * dt
      sc.peak_runoff = math.max(sc.peak_runoff, sc.runoff)
      local ni = model.node_map[sc.outlet]
      if ni then model.nodes[ni].lateral_inflow = model.nodes[ni].lateral_inflow + sc.runoff end
    end

    for _, n in ipairs(model.nodes) do n.inflow = n.lateral_inflow end

    for _, lk in ipairs(model.links) do
      local fi = model.node_map[lk.from_node]
      local ti = model.node_map[lk.to_node]
      if not fi or not ti then goto next_link end
      local xs = find_xsect(model, lk.id)
      if not xs then goto next_link end
      local n1, n2 = model.nodes[fi], model.nodes[ti]
      local dh = n1.head - n2.head
      local slope = lk.length > 0 and dh / lk.length or 0
      local avg_depth = math.max(0, math.min((n1.depth + n2.depth) / 2, xs.geom1))
      local area = xsect_area(xs, avg_depth)
      local hrad = xsect_hrad(xs, avg_depth)
      local manning_q = 0
      if area > 0 and hrad > 0 and math.abs(slope) > 1e-12 then
        local sign = slope > 0 and 1 or -1
        manning_q = sign * (1.49 / lk.roughness) * area * (hrad ^ (2 / 3)) * math.sqrt(math.abs(slope))
      end
      lk.flow = lk.flow * 0.5 + manning_q * 0.5
      if xs.a_full > 0 then
        local sl = math.max(math.abs(slope), 0.001)
        local q_full = (1.49 / lk.roughness) * xs.a_full * (xs.r_full ^ (2 / 3)) * math.sqrt(sl)
        if math.abs(lk.flow) > q_full * 1.5 then
          lk.flow = (lk.flow > 0 and 1 or -1) * q_full * 1.5
        end
      end
      local fa = math.abs(lk.flow)
      lk.depth = avg_depth
      lk.velocity = area > 0 and fa / area or 0
      lk.volume = area * lk.length
      if fa > lk.peak_flow then lk.peak_flow = fa; lk.time_peak_flow = elapsed end
      lk.peak_velocity = math.max(lk.peak_velocity, lk.velocity)
      if xs.geom1 > 0 then lk.max_depth_frac = math.max(lk.max_depth_frac, avg_depth / xs.geom1) end
      if lk.flow > 0 then n1.outflow = n1.outflow + lk.flow; n2.inflow = n2.inflow + lk.flow end
      ::next_link::
    end

    for _, n in ipairs(model.nodes) do
      if n.ntype == "OUTFALL" then goto next_node end
      local sa = n.a_ponded > 0 and n.a_ponded or model.options.min_surf_area
      local net = n.inflow - n.outflow + n.lateral_inflow
      n.depth = n.depth + net * dt / sa
      if n.depth < 0 then n.depth = 0 end
      if n.max_depth > 0 and n.depth > n.max_depth + n.sur_depth then
        n.overflow = n.depth - n.max_depth
        n.flood_volume = n.flood_volume + n.overflow * dt
        n.depth = n.max_depth
      end
      n.head = n.invert_elev + n.depth
      n.volume = n.depth * sa
      n.peak_depth = math.max(n.peak_depth, n.depth)
      n.peak_hgl = math.max(n.peak_hgl, n.head)
      n.total_inflow = n.total_inflow + n.inflow * dt
      n.total_outflow = n.total_outflow + n.outflow * dt
      n.lateral_inflow = 0; n.inflow = 0; n.outflow = 0; n.overflow = 0
      ::next_node::
    end

    elapsed = elapsed + dt
    steps = steps + 1
  end
  return steps, elapsed
end

local function fmt_peak(secs)
  if secs <= 0 then return "0  00:00" end
  local days = math.floor(secs / 86400)
  local rem = secs - days * 86400
  local hrs = math.floor(rem / 3600)
  local mins = math.floor((rem - hrs * 3600) / 60)
  return string.format("%d  %02d:%02d", days, hrs, mins)
end

local function generate_rpt(model, steps, wall_ms)
  local lines = {}
  lines[#lines + 1] = "  EPA STORM WATER MANAGEMENT MODEL -- LUA ENGINE"
  lines[#lines + 1] = "  SWMM5-Lua v1.0 -- SWMM5 Rosetta Stone Project"
  lines[#lines + 1] = "  " .. string.rep("=", 60)
  lines[#lines + 1] = ""
  lines[#lines + 1] = "  ****************"
  lines[#lines + 1] = "  Analysis Options"
  lines[#lines + 1] = "  ****************"
  lines[#lines + 1] = "  Flow Units ............... " .. model.options.flow_units
  lines[#lines + 1] = "  Flow Routing Method ...... " .. model.options.flow_routing
  lines[#lines + 1] = "  Infiltration Method ...... " .. model.options.infiltration
  lines[#lines + 1] = "  Starting Date ............ " .. model.options.start_date
  lines[#lines + 1] = "  Ending Date .............. " .. model.options.end_date
  lines[#lines + 1] = string.format("  Routing Time Step ........ %.2f sec", model.options.routing_step)
  lines[#lines + 1] = ""
  lines[#lines + 1] = "  ******************"
  lines[#lines + 1] = "  Node Depth Summary"
  lines[#lines + 1] = "  ******************"
  lines[#lines + 1] = ""
  lines[#lines + 1] = "  " .. string.rep("-", 95)
  for _, n in ipairs(model.nodes) do
    lines[#lines + 1] = string.format("  %-30s %10.3f %10.3f %12.3f", n.id, n.peak_depth * 0.4, n.peak_depth, n.peak_hgl)
  end
  lines[#lines + 1] = ""
  lines[#lines + 1] = "  *************************"
  lines[#lines + 1] = "  Conduit Flow Summary"
  lines[#lines + 1] = "  *************************"
  lines[#lines + 1] = ""
  lines[#lines + 1] = "  " .. string.rep("-", 95)
  for _, lk in ipairs(model.links) do
    local xs = find_xsect(model, lk.id)
    local full_q = 1
    if xs and xs.a_full > 0 and xs.r_full > 0 then
      full_q = (1.49 / lk.roughness) * xs.a_full * (xs.r_full ^ (2 / 3)) * math.sqrt(0.01)
    end
    local mff = full_q > 0 and lk.peak_flow / full_q or 0
    lines[#lines + 1] = string.format("  %-30s %10.3f %12s %10.3f %8.2f %8.2f", lk.id, lk.peak_flow, fmt_peak(lk.time_peak_flow), lk.peak_velocity, mff, lk.max_depth_frac)
  end
  lines[#lines + 1] = ""
  lines[#lines + 1] = "  *********************"
  lines[#lines + 1] = "  Simulation Summary"
  lines[#lines + 1] = "  *********************"
  lines[#lines + 1] = ""
  lines[#lines + 1] = "  Engine ................... SWMM5-Lua v1.0"
  lines[#lines + 1] = string.format("  Total Steps .............. %d", steps)
  lines[#lines + 1] = string.format("  Simulation Duration ...... %.1f seconds (%.2f hours)", model.options.total_duration, model.options.total_duration / 3600)
  lines[#lines + 1] = string.format("  Wall-Clock Time .......... %.1f ms", wall_ms)
  lines[#lines + 1] = string.format("  Nodes .................... %d", #model.nodes)
  lines[#lines + 1] = string.format("  Links .................... %d", #model.links)
  lines[#lines + 1] = string.format("  Subcatchments ............ %d", #model.subcatchments)
  lines[#lines + 1] = ""
  return table.concat(lines, "\n")
end

local function escape_json(s)
  s = s:gsub("\\", "\\\\")
  s = s:gsub('"', '\\"')
  s = s:gsub("\n", "\\n")
  s = s:gsub("\r", "\\r")
  s = s:gsub("\t", "\\t")
  return s
end

local input = io.read("*a")
local t0 = os.clock()
local model = parse_inp(input)
local steps = simulate(model)
local wall_ms = (os.clock() - t0) * 1000
local rpt = generate_rpt(model, steps, wall_ms)
local json = '{"success":true,"rpt":"' .. escape_json(rpt) .. '"}'
io.write(json)
