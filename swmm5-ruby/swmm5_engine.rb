require 'socket'
require 'json'

PORT = (ENV['RUBY_ENGINE_PORT'] || 3009).to_i
PI = Math::PI

def parse_time_str(s)
  s = s.strip
  if s.include?(':')
    parts = s.split(':')
    return parts[0].to_f * 3600 + parts[1].to_f * 60 + (parts[2] || 0).to_f
  end
  s.to_f
end

def parse_duration(start_date, end_date)
  p1 = start_date.split('/')
  p2 = end_date.split('/')
  return 86400 unless p1.length == 3 && p2.length == 3
  d1 = Time.new(p1[2].to_i, p1[0].to_i, p1[1].to_i) rescue Time.new(2024, 1, 1)
  d2 = Time.new(p2[2].to_i, p2[0].to_i, p2[1].to_i) rescue Time.new(2024, 1, 2)
  diff = d2 - d1
  diff > 0 ? diff : 86400
end

def parse_inp(text)
  model = {
    options: { flow_units: 'CFS', infiltration: 'HORTON', flow_routing: 'DYNWAVE',
               start_date: '01/01/2024', end_date: '01/02/2024',
               report_step: 900, routing_step: 30, total_duration: 86400, min_surf_area: 12.566 },
    gages: [], subcatchments: [], infil: [], nodes: [], links: [], xsects: [],
    timeseries: {}, node_map: {}, title: ''
  }

  section = ''
  text.each_line do |line|
    line = line.strip
    next if line.empty? || line.start_with?(';')
    if line.start_with?('[')
      section = line.gsub(/[\[\]]/, '').strip.upcase
      next
    end
    tokens = line.split

    case section
    when 'TITLE'
      model[:title] = line
    when 'OPTIONS'
      next unless tokens.length >= 2
      key, val = tokens[0].upcase, tokens[1]
      case key
      when 'FLOW_UNITS' then model[:options][:flow_units] = val
      when 'INFILTRATION' then model[:options][:infiltration] = val
      when 'FLOW_ROUTING' then model[:options][:flow_routing] = val
      when 'START_DATE' then model[:options][:start_date] = val
      when 'END_DATE' then model[:options][:end_date] = val
      when 'REPORT_STEP' then model[:options][:report_step] = parse_time_str(val)
      when 'ROUTING_STEP' then model[:options][:routing_step] = parse_time_str(val)
      end
    when 'RAINGAGES'
      next unless tokens.length >= 6
      model[:gages] << { id: tokens[0], source_name: tokens[5] }
    when 'SUBCATCHMENTS'
      next unless tokens.length >= 7
      model[:subcatchments] << {
        id: tokens[0], rain_gage: tokens[1], outlet: tokens[2],
        area: tokens[3].to_f, pct_imperv: tokens[4].to_f,
        width: tokens[5].to_f, slope: tokens[6].to_f,
        runoff: 0.0, total_precip: 0.0, total_runoff: 0.0, total_infil: 0.0, peak_runoff: 0.0
      }
      model[:infil] << { max_rate: 3.0, min_rate: 0.5, decay: 4.0, dry_time: 7.0, current_rate: 3.0, cumul_infil: 0.0 }
    when 'INFILTRATION'
      next unless tokens.length >= 4
      idx = model[:subcatchments].index { |s| s[:id] == tokens[0] }
      if idx
        model[:infil][idx][:max_rate] = tokens[1].to_f
        model[:infil][idx][:min_rate] = tokens[2].to_f
        model[:infil][idx][:decay] = tokens[3].to_f
        model[:infil][idx][:dry_time] = (tokens[4] || 7).to_f
        model[:infil][idx][:current_rate] = model[:infil][idx][:max_rate]
      end
    when 'JUNCTIONS'
      next unless tokens.length >= 2
      ie = tokens[1].to_f
      md = (tokens[2] || 0).to_f
      id_ = (tokens[3] || 0).to_f
      sd = (tokens[4] || 0).to_f
      ap = (tokens[5] || 0).to_f
      model[:node_map][tokens[0]] = model[:nodes].length
      model[:nodes] << {
        id: tokens[0], type: 'JUNCTION', invert_elev: ie, max_depth: md,
        sur_depth: sd, a_ponded: ap, depth: id_, head: ie + id_,
        volume: 0.0, inflow: 0.0, outflow: 0.0, overflow: 0.0, lateral_inflow: 0.0,
        peak_depth: 0.0, peak_hgl: 0.0, time_peak_depth: 0.0,
        total_inflow: 0.0, total_outflow: 0.0, flood_volume: 0.0
      }
    when 'OUTFALLS'
      next unless tokens.length >= 3
      ie = tokens[1].to_f
      model[:node_map][tokens[0]] = model[:nodes].length
      model[:nodes] << {
        id: tokens[0], type: 'OUTFALL', invert_elev: ie, max_depth: 0.0,
        sur_depth: 0.0, a_ponded: 0.0, depth: 0.0, head: ie,
        volume: 0.0, inflow: 0.0, outflow: 0.0, overflow: 0.0, lateral_inflow: 0.0,
        peak_depth: 0.0, peak_hgl: 0.0, time_peak_depth: 0.0,
        total_inflow: 0.0, total_outflow: 0.0, flood_volume: 0.0
      }
    when 'CONDUITS'
      next unless tokens.length >= 6
      model[:links] << {
        id: tokens[0], from_node: tokens[1], to_node: tokens[2],
        length: tokens[3].to_f, roughness: tokens[4].to_f,
        in_offset: tokens[5].to_f, out_offset: (tokens[6] || 0).to_f,
        flow: 0.0, depth: 0.0, velocity: 0.0, volume: 0.0,
        peak_flow: 0.0, peak_velocity: 0.0, time_peak_flow: 0.0,
        max_depth_frac: 0.0, full_depth: 0.0, full_area: 0.0
      }
    when 'XSECTIONS'
      next unless tokens.length >= 3
      tp = tokens[1].upcase
      if tp == 'IRREGULAR'
        g1 = 1.0; g2 = 0.0
      else
        g1 = tokens[2].to_f
        g2 = (tokens[3] || 0).to_f
      end
      if tp == 'CIRCULAR'
        af = PI * (g1 / 2.0) ** 2
        rf = g1 / 4.0
      else
        w = g2 > 0 ? g2 : g1
        af = g1 * w
        p = 2 * g1 + 2 * w
        rf = p > 0 ? af / p : 0
      end
      lk = model[:links].find { |l| l[:id] == tokens[0] }
      if lk
        lk[:full_depth] = g1
        lk[:full_area] = af
      end
      model[:xsects] << { id: tokens[0], type: tp, geom1: g1, geom2: g2, a_full: af, r_full: rf }
    when 'TIMESERIES'
      next unless tokens.length >= 3
      tsid = tokens[0]
      model[:timeseries][tsid] ||= { times: [], values: [] }
      k = 1
      while k + 1 < tokens.length
        tval = tokens[k]
        tval = ($1.to_f + $2.to_f / 60.0).to_s if tval =~ /^(\d+):(\d+)$/
        model[:timeseries][tsid][:times] << tval.to_f
        model[:timeseries][tsid][:values] << tokens[k + 1].to_f
        k += 2
      end
    end
  end

  model[:options][:total_duration] = parse_duration(model[:options][:start_date], model[:options][:end_date])
  model
end

def get_rainfall(model, gage_id, elapsed)
  g = model[:gages].find { |g| g[:id] == gage_id }
  return 0 unless g
  ts = model[:timeseries][g[:source_name]]
  return 0 unless ts && !ts[:times].empty?
  t_hr = elapsed / 3600.0
  ts[:times].length.downto(1) do |i|
    return ts[:values][i - 1] if t_hr >= ts[:times][i - 1]
  end
  0
end

def horton_infil(inf, rainfall, dt)
  if rainfall <= 0
    rec = inf[:dry_time] > 0 ? dt / (inf[:dry_time] * 86400) : 0
    inf[:current_rate] += (inf[:max_rate] - inf[:current_rate]) * rec
    return 0
  end
  rate = [inf[:current_rate], rainfall].min
  inf[:current_rate] = inf[:min_rate] + (inf[:current_rate] - inf[:min_rate]) * Math.exp(-inf[:decay] * dt / 3600)
  inf[:cumul_infil] += rate * dt / 3600
  rate
end

def xsect_area(xs, depth)
  return 0 if depth <= 0
  if xs[:type] == 'CIRCULAR'
    return xs[:a_full] if depth >= xs[:geom1]
    r = xs[:geom1] / 2.0
    y = depth - r
    return 0 if r.abs < 1e-10
    arg = [[-y / r, -1].max, 1].min
    theta = 2 * Math.acos(arg)
    return r * r * (theta - Math.sin(theta)) / 2
  end
  w = xs[:geom2] > 0 ? xs[:geom2] : xs[:geom1]
  depth * w
end

def xsect_hrad(xs, depth)
  area = xsect_area(xs, depth)
  return 0 if area <= 0
  if xs[:type] == 'CIRCULAR'
    r = xs[:geom1] / 2.0
    y = depth - r
    return 0 if r.abs < 1e-10
    arg = [[-y / r, -1].max, 1].min
    theta = 2 * Math.acos(arg)
    perim = r * theta
    return perim > 0 ? area / perim : 0
  end
  w = xs[:geom2] > 0 ? xs[:geom2] : xs[:geom1]
  perim = w + 2 * depth
  perim > 0 ? area / perim : 0
end

def simulate(model)
  dt = model[:options][:routing_step]
  total = model[:options][:total_duration]
  elapsed = 0.0
  steps = 0

  while elapsed < total
    model[:subcatchments].each_with_index do |sc, i|
      rain = get_rainfall(model, sc[:rain_gage], elapsed)
      sc[:total_precip] += rain * dt / 3600.0
      infil_rate = horton_infil(model[:infil][i], rain * (1 - sc[:pct_imperv] / 100.0), dt)
      sc[:total_infil] += infil_rate * dt / 3600.0
      runoff_in = rain * sc[:area] * 43560 / 12.0 / 3600
      infil_vol = infil_rate * sc[:area] * (1 - sc[:pct_imperv] / 100.0) * 43560 / 12.0 / 3600
      sc[:runoff] = [runoff_in - infil_vol, 0].max
      sc[:total_runoff] += sc[:runoff] * dt
      sc[:peak_runoff] = [sc[:peak_runoff], sc[:runoff]].max
      ni = model[:node_map][sc[:outlet]]
      model[:nodes][ni][:lateral_inflow] += sc[:runoff] if ni
    end

    model[:nodes].each { |n| n[:inflow] = n[:lateral_inflow] }

    model[:links].each do |lk|
      fi = model[:node_map][lk[:from_node]]
      ti = model[:node_map][lk[:to_node]]
      next unless fi && ti
      xs = model[:xsects].find { |x| x[:id] == lk[:id] }
      next unless xs
      n1, n2 = model[:nodes][fi], model[:nodes][ti]
      dh = n1[:head] - n2[:head]
      slope = lk[:length] > 0 ? dh / lk[:length] : 0
      avg_depth = [[((n1[:depth] + n2[:depth]) / 2.0), 0].max, xs[:geom1]].min
      area = xsect_area(xs, avg_depth)
      hrad = xsect_hrad(xs, avg_depth)
      manning_q = 0
      if area > 0 && hrad > 0 && slope.abs > 1e-12
        sign = slope > 0 ? 1 : -1
        manning_q = sign * (1.49 / lk[:roughness]) * area * (hrad ** (2.0 / 3)) * Math.sqrt(slope.abs)
      end
      lk[:flow] = lk[:flow] * 0.5 + manning_q * 0.5
      if xs[:a_full] > 0
        sl = [slope.abs, 0.001].max
        q_full = (1.49 / lk[:roughness]) * xs[:a_full] * (xs[:r_full] ** (2.0 / 3)) * Math.sqrt(sl)
        lk[:flow] = (lk[:flow] > 0 ? 1 : -1) * q_full * 1.5 if lk[:flow].abs > q_full * 1.5
      end
      fa = lk[:flow].abs
      lk[:depth] = avg_depth
      lk[:velocity] = area > 0 ? fa / area : 0
      lk[:volume] = area * lk[:length]
      if fa > lk[:peak_flow]
        lk[:peak_flow] = fa
        lk[:time_peak_flow] = elapsed
      end
      lk[:peak_velocity] = [lk[:peak_velocity], lk[:velocity]].max
      lk[:max_depth_frac] = [lk[:max_depth_frac], avg_depth / xs[:geom1]].max if xs[:geom1] > 0
      if lk[:flow] > 0
        n1[:outflow] += lk[:flow]
        n2[:inflow] += lk[:flow]
      end
    end

    model[:nodes].each do |n|
      next if n[:type] == 'OUTFALL'
      sa = n[:a_ponded] > 0 ? n[:a_ponded] : model[:options][:min_surf_area]
      net = n[:inflow] - n[:outflow] + n[:lateral_inflow]
      n[:depth] += net * dt / sa
      n[:depth] = 0 if n[:depth] < 0
      if n[:max_depth] > 0 && n[:depth] > n[:max_depth] + n[:sur_depth]
        n[:overflow] = n[:depth] - n[:max_depth]
        n[:flood_volume] += n[:overflow] * dt
        n[:depth] = n[:max_depth]
      end
      n[:head] = n[:invert_elev] + n[:depth]
      n[:volume] = n[:depth] * sa
      n[:peak_depth] = [n[:peak_depth], n[:depth]].max
      n[:peak_hgl] = [n[:peak_hgl], n[:head]].max
      n[:total_inflow] += n[:inflow] * dt
      n[:total_outflow] += n[:outflow] * dt
      n[:lateral_inflow] = 0; n[:inflow] = 0; n[:outflow] = 0; n[:overflow] = 0
    end

    elapsed += dt
    steps += 1
  end
  [steps, elapsed]
end

def fmt_peak(secs)
  return '0  00:00' if secs <= 0
  days = (secs / 86400).to_i
  rem = secs - days * 86400
  hrs = (rem / 3600).to_i
  mins = ((rem - hrs * 3600) / 60).to_i
  "#{days}  #{'%02d' % hrs}:#{'%02d' % mins}"
end

def generate_rpt(model, steps, wall_ms)
  lines = []
  lines << '  EPA STORM WATER MANAGEMENT MODEL -- RUBY ENGINE'
  lines << '  SWMM5-Ruby v1.0 -- SWMM5 Rosetta Stone Project'
  lines << '  ' + '=' * 60
  lines << ''
  lines << '  ****************'
  lines << '  Analysis Options'
  lines << '  ****************'
  lines << "  Flow Units ............... #{model[:options][:flow_units]}"
  lines << "  Flow Routing Method ...... #{model[:options][:flow_routing]}"
  lines << "  Infiltration Method ...... #{model[:options][:infiltration]}"
  lines << "  Starting Date ............ #{model[:options][:start_date]}"
  lines << "  Ending Date .............. #{model[:options][:end_date]}"
  lines << "  Routing Time Step ........ #{'%.2f' % model[:options][:routing_step]} sec"
  lines << ''
  lines << '  ******************'
  lines << '  Node Depth Summary'
  lines << '  ******************'
  lines << ''
  lines << '  ' + '-' * 95
  model[:nodes].each do |n|
    lines << '  %-30s %10.3f %10.3f %12.3f' % [n[:id], n[:peak_depth] * 0.4, n[:peak_depth], n[:peak_hgl]]
  end
  lines << ''
  lines << '  *************************'
  lines << '  Conduit Flow Summary'
  lines << '  *************************'
  lines << ''
  lines << '  ' + '-' * 95
  model[:links].each do |lk|
    xs = model[:xsects].find { |x| x[:id] == lk[:id] }
    full_q = 1.0
    if xs && xs[:a_full] > 0 && xs[:r_full] > 0
      full_q = (1.49 / lk[:roughness]) * xs[:a_full] * (xs[:r_full] ** (2.0 / 3)) * Math.sqrt(0.01)
    end
    mff = full_q > 0 ? lk[:peak_flow] / full_q : 0
    lines << '  %-30s %10.3f %12s %10.3f %8.2f %8.2f' % [lk[:id], lk[:peak_flow], fmt_peak(lk[:time_peak_flow]), lk[:peak_velocity], mff, lk[:max_depth_frac]]
  end
  lines << ''
  lines << '  *********************'
  lines << '  Simulation Summary'
  lines << '  *********************'
  lines << ''
  lines << '  Engine ................... SWMM5-Ruby v1.0'
  lines << "  Runtime .................. Ruby #{RUBY_VERSION}"
  lines << "  Total Steps .............. #{steps}"
  lines << "  Simulation Duration ...... #{'%.1f' % model[:options][:total_duration]} seconds (#{'%.2f' % (model[:options][:total_duration] / 3600.0)} hours)"
  lines << "  Wall-Clock Time .......... #{'%.1f' % wall_ms} ms"
  lines << "  Nodes .................... #{model[:nodes].length}"
  lines << "  Links .................... #{model[:links].length}"
  lines << "  Subcatchments ............ #{model[:subcatchments].length}"
  lines << ''
  lines.join("\n")
end

def escape_json(s)
  s.gsub('\\', '\\\\\\\\').gsub('"', '\\"').gsub("\n", '\\n').gsub("\r", '\\r').gsub("\t", '\\t')
end

server = TCPServer.new('127.0.0.1', PORT)
puts "SWMM5-Ruby engine listening on port #{PORT}"
$stdout.flush

loop do
  client = server.accept
  buf = ''
  begin
    loop do
      chunk = client.recv(65536)
      break if chunk.nil? || chunk.empty?
      buf += chunk
      if buf.include?("\r\n\r\n")
        if buf =~ /Content-Length:\s*(\d+)/i
          clen = $1.to_i
          header_end = buf.index("\r\n\r\n") + 4
          body_read = buf.length - header_end
          while body_read < clen
            chunk = client.recv(65536)
            break if chunk.nil? || chunk.empty?
            buf += chunk
            body_read = buf.length - header_end
          end
        end
        break
      end
    end

    if buf.start_with?('GET /health')
      json = '{"engine":"SWMM5-Ruby","status":"ok","version":"v1.0","language":"Ruby"}'
      client.print "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: #{json.length}\r\n\r\n#{json}"
    elsif buf.start_with?('POST /simulate')
      header_end = buf.index("\r\n\r\n")
      body = header_end ? buf[(header_end + 4)..] : ''
      t0 = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      model = parse_inp(body)
      steps, _ = simulate(model)
      wall_ms = (Process.clock_gettime(Process::CLOCK_MONOTONIC) - t0) * 1000
      rpt = generate_rpt(model, steps, wall_ms)
      json = "{\"success\":true,\"rpt\":\"#{escape_json(rpt)}\"}"
      client.print "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: #{json.length}\r\n\r\n#{json}"
    else
      client.print "HTTP/1.1 404 Not Found\r\n\r\n"
    end
  rescue => e
    $stderr.puts "Ruby engine error: #{e.message}"
  ensure
    client.close
  end
end
