program SwmmEngine;
{$mode objfpc}{$H+}
uses SysUtils, Classes, Math;

const
  PI = 3.14159265358979323846;
  MAX_NODES = 500;
  MAX_LINKS = 500;
  MAX_SC = 200;
  MAX_XS = 500;
  MAX_GAGES = 50;
  MAX_TS = 50;
  MAX_TV = 200;

type
  TNode = record
    id, ntype: string;
    invert_elev, max_depth, sur_depth, a_ponded: Double;
    depth, head, volume, inflow, outflow, overflow, lateral_inflow: Double;
    peak_depth, peak_hgl, total_inflow, total_outflow, flood_volume: Double;
  end;
  TLink = record
    id, from_node, to_node: string;
    len, roughness, in_offset, out_offset: Double;
    flow, depth, velocity, volume: Double;
    peak_flow, peak_velocity, time_peak_flow, max_depth_frac: Double;
    full_depth, full_area: Double;
  end;
  TXsect = record id, xtype: string; geom1, geom2, a_full, r_full: Double; end;
  TSubcatch = record
    id, rain_gage, outlet: string;
    area, pct_imperv, width, slope: Double;
    runoff, total_precip, total_runoff, total_infil, peak_runoff: Double;
  end;
  TInfil = record max_rate, min_rate, decay, dry_time, current_rate, cumul_infil: Double; end;
  TGage = record id, source_name: string; end;
  TTSeries = record id: string; times, values: array[0..MAX_TV-1] of Double; count: Integer; end;

var
  nodes: array[0..MAX_NODES-1] of TNode;
  links: array[0..MAX_LINKS-1] of TLink;
  xsects: array[0..MAX_XS-1] of TXsect;
  subcatchments: array[0..MAX_SC-1] of TSubcatch;
  infils: array[0..MAX_SC-1] of TInfil;
  gages: array[0..MAX_GAGES-1] of TGage;
  tseries: array[0..MAX_TS-1] of TTSeries;
  num_nodes, num_links, num_xs, num_sc, num_gages, num_ts: Integer;
  flow_units, infiltration, flow_routing, start_date, end_date: string;
  routing_step, total_duration, min_surf_area: Double;

function SafeFloat(const s: string): Double;
begin
  try Result := StrToFloat(s) except Result := 0.0 end;
end;

function ParseTimeStr(const s: string): Double;
var p: Integer;
begin
  p := Pos(':', s);
  if p > 0 then
    Result := SafeFloat(Copy(s, 1, p-1)) * 3600 + SafeFloat(Copy(s, p+1, Length(s))) * 60
  else
    Result := SafeFloat(s);
end;

function ParseDuration(const s, e: string): Double;
var sp, ep: TStringList;
begin
  Result := 86400;
  sp := TStringList.Create; ep := TStringList.Create;
  try
    sp.Delimiter := '/'; sp.StrictDelimiter := True; sp.DelimitedText := s;
    ep.Delimiter := '/'; ep.StrictDelimiter := True; ep.DelimitedText := e;
    if (sp.Count >= 3) and (ep.Count >= 3) then begin
      Result := (SafeFloat(ep[2]) - SafeFloat(sp[2])) * 365 * 86400
        + (SafeFloat(ep[0]) - SafeFloat(sp[0])) * 30 * 86400
        + (SafeFloat(ep[1]) - SafeFloat(sp[1])) * 86400;
      if Result <= 0 then Result := 86400;
    end;
  finally sp.Free; ep.Free end;
end;

function FindNode(const id: string): Integer;
var i: Integer;
begin
  for i := 0 to num_nodes-1 do if nodes[i].id = id then Exit(i);
  Result := -1;
end;

function FindXsect(const id: string): Integer;
var i: Integer;
begin
  for i := 0 to num_xs-1 do if xsects[i].id = id then Exit(i);
  Result := -1;
end;

function FindTS(const id: string): Integer;
var i: Integer;
begin
  for i := 0 to num_ts-1 do if tseries[i].id = id then Exit(i);
  Result := -1;
end;

function GetRainfall(const gage_id: string; elapsed: Double): Double;
var i, ti, k: Integer; t_hr: Double;
begin
  Result := 0;
  for i := 0 to num_gages-1 do
    if gages[i].id = gage_id then begin
      ti := FindTS(gages[i].source_name); if ti < 0 then Exit;
      t_hr := elapsed / 3600.0;
      for k := tseries[ti].count-1 downto 0 do
        if t_hr >= tseries[ti].times[k] then Exit(tseries[ti].values[k]);
      Exit;
    end;
end;

function HortonInfil(var inf: TInfil; rainfall, dt: Double): Double;
var rec, rate: Double;
begin
  if rainfall <= 0 then begin
    rec := 0; if inf.dry_time > 0 then rec := dt / (inf.dry_time * 86400);
    inf.current_rate := inf.current_rate + (inf.max_rate - inf.current_rate) * rec;
    Result := 0; Exit;
  end;
  rate := Min(inf.current_rate, rainfall);
  inf.current_rate := inf.min_rate + (inf.current_rate - inf.min_rate) * Exp(-inf.decay * dt / 3600);
  inf.cumul_infil := inf.cumul_infil + rate * dt / 3600;
  Result := rate;
end;

function CalcArea(xi: Integer; depth: Double): Double;
var r, y, arg, theta, w: Double;
begin
  Result := 0; if depth <= 0 then Exit;
  if xsects[xi].xtype = 'CIRCULAR' then begin
    if depth >= xsects[xi].geom1 then Exit(xsects[xi].a_full);
    r := xsects[xi].geom1 / 2; y := depth - r;
    if Abs(r) < 1e-10 then Exit;
    arg := -y / r; arg := Max(-1, Min(1, arg));
    theta := 2 * ArcCos(arg); Result := r * r * (theta - Sin(theta)) / 2;
  end else begin
    w := xsects[xi].geom2; if w <= 0 then w := xsects[xi].geom1;
    Result := depth * w;
  end;
end;

function CalcHrad(xi: Integer; depth: Double): Double;
var area, r, y, arg, theta, perim, w: Double;
begin
  Result := 0; area := CalcArea(xi, depth); if area <= 0 then Exit;
  if xsects[xi].xtype = 'CIRCULAR' then begin
    r := xsects[xi].geom1 / 2; y := depth - r;
    if Abs(r) < 1e-10 then Exit;
    arg := -y / r; arg := Max(-1, Min(1, arg));
    theta := 2 * ArcCos(arg); perim := r * theta;
    if perim > 0 then Result := area / perim;
  end else begin
    w := xsects[xi].geom2; if w <= 0 then w := xsects[xi].geom1;
    perim := w + 2 * depth;
    if perim > 0 then Result := area / perim;
  end;
end;

procedure ParseInp(const text: string);
var lines: TStringList; i, ntok, k, idx, ti: Integer;
    line, section: string; tokens: array[0..19] of string;
    g1, g2, af, rf, w, p, tv: Double;
begin
  num_nodes := 0; num_links := 0; num_xs := 0; num_sc := 0; num_gages := 0; num_ts := 0;
  flow_units := 'CFS'; infiltration := 'HORTON'; flow_routing := 'DYNWAVE';
  start_date := '01/01/2024'; end_date := '01/02/2024';
  routing_step := 30; total_duration := 86400; min_surf_area := 12.566;
  section := '';
  lines := TStringList.Create;
  try
    lines.Text := text;
    for i := 0 to lines.Count-1 do begin
      line := Trim(lines[i]);
      if (line = '') or (line[1] = ';') then Continue;
      if line[1] = '[' then begin
        section := UpperCase(Copy(line, 2, Pos(']', line)-2));
        Continue;
      end;
      ntok := 0;
      for k := 0 to 19 do tokens[k] := '';
      with TStringList.Create do try
        Delimiter := ' '; StrictDelimiter := False; DelimitedText := line;
        for k := 0 to Min(Count-1, 19) do begin tokens[k] := Strings[k]; Inc(ntok); end;
      finally Free end;
      if ntok = 0 then Continue;
      if section = 'OPTIONS' then begin
        if ntok >= 2 then case UpperCase(tokens[0]) of
          'FLOW_UNITS': flow_units := tokens[1];
          'INFILTRATION': infiltration := tokens[1];
          'FLOW_ROUTING': flow_routing := tokens[1];
          'START_DATE': start_date := tokens[1];
          'END_DATE': end_date := tokens[1];
          'ROUTING_STEP': routing_step := ParseTimeStr(tokens[1]);
        end;
      end
      else if (section = 'RAINGAGES') and (ntok >= 6) and (num_gages < MAX_GAGES) then begin
        gages[num_gages].id := tokens[0]; gages[num_gages].source_name := tokens[5]; Inc(num_gages);
      end
      else if (section = 'SUBCATCHMENTS') and (ntok >= 7) and (num_sc < MAX_SC) then begin
        with subcatchments[num_sc] do begin
          id := tokens[0]; rain_gage := tokens[1]; outlet := tokens[2];
          area := SafeFloat(tokens[3]); pct_imperv := SafeFloat(tokens[4]);
          width := SafeFloat(tokens[5]); slope := SafeFloat(tokens[6]);
          runoff := 0; total_precip := 0; total_runoff := 0; total_infil := 0; peak_runoff := 0;
        end;
        with infils[num_sc] do begin max_rate := 3; min_rate := 0.5; decay := 4; dry_time := 7; current_rate := 3; cumul_infil := 0; end;
        Inc(num_sc);
      end
      else if (section = 'INFILTRATION') and (ntok >= 4) then begin
        for idx := 0 to num_sc-1 do
          if subcatchments[idx].id = tokens[0] then begin
            infils[idx].max_rate := SafeFloat(tokens[1]); infils[idx].min_rate := SafeFloat(tokens[2]);
            infils[idx].decay := SafeFloat(tokens[3]);
            if ntok > 4 then infils[idx].dry_time := SafeFloat(tokens[4]) else infils[idx].dry_time := 7;
            infils[idx].current_rate := infils[idx].max_rate; Break;
          end;
      end
      else if (section = 'JUNCTIONS') and (ntok >= 2) and (num_nodes < MAX_NODES) then begin
        with nodes[num_nodes] do begin
          id := tokens[0]; ntype := 'JUNCTION'; invert_elev := SafeFloat(tokens[1]);
          max_depth := 0; if ntok > 2 then max_depth := SafeFloat(tokens[2]);
          depth := 0; if ntok > 3 then depth := SafeFloat(tokens[3]);
          sur_depth := 0; if ntok > 4 then sur_depth := SafeFloat(tokens[4]);
          a_ponded := 0; if ntok > 5 then a_ponded := SafeFloat(tokens[5]);
          head := invert_elev + depth; volume := 0; inflow := 0; outflow := 0; overflow := 0;
          lateral_inflow := 0; peak_depth := 0; peak_hgl := 0; total_inflow := 0; total_outflow := 0; flood_volume := 0;
        end;
        Inc(num_nodes);
      end
      else if (section = 'OUTFALLS') and (ntok >= 3) and (num_nodes < MAX_NODES) then begin
        with nodes[num_nodes] do begin
          id := tokens[0]; ntype := 'OUTFALL'; invert_elev := SafeFloat(tokens[1]);
          max_depth := 0; depth := 0; sur_depth := 0; a_ponded := 0;
          head := invert_elev; volume := 0; inflow := 0; outflow := 0; overflow := 0;
          lateral_inflow := 0; peak_depth := 0; peak_hgl := 0; total_inflow := 0; total_outflow := 0; flood_volume := 0;
        end;
        Inc(num_nodes);
      end
      else if (section = 'CONDUITS') and (ntok >= 6) and (num_links < MAX_LINKS) then begin
        with links[num_links] do begin
          id := tokens[0]; from_node := tokens[1]; to_node := tokens[2];
          len := SafeFloat(tokens[3]); roughness := SafeFloat(tokens[4]);
          in_offset := SafeFloat(tokens[5]); out_offset := 0; if ntok > 6 then out_offset := SafeFloat(tokens[6]);
          flow := 0; depth := 0; velocity := 0; volume := 0;
          peak_flow := 0; peak_velocity := 0; time_peak_flow := 0; max_depth_frac := 0;
          full_depth := 0; full_area := 0;
        end;
        Inc(num_links);
      end
      else if (section = 'XSECTIONS') and (ntok >= 3) and (num_xs < MAX_XS) then begin
        g1 := SafeFloat(tokens[2]); if g1 = 0 then g1 := 1;
        g2 := 0; if ntok > 3 then g2 := SafeFloat(tokens[3]);
        xsects[num_xs].id := tokens[0]; xsects[num_xs].xtype := UpperCase(tokens[1]);
        xsects[num_xs].geom1 := g1; xsects[num_xs].geom2 := g2;
        if xsects[num_xs].xtype = 'CIRCULAR' then begin
          af := PI * Sqr(g1/2); rf := g1/4;
        end else begin
          w := g2; if w <= 0 then w := g1; af := g1 * w; p := 2*g1+2*w;
          rf := 0; if p > 0 then rf := af / p;
        end;
        xsects[num_xs].a_full := af; xsects[num_xs].r_full := rf;
        for idx := 0 to num_links-1 do
          if links[idx].id = tokens[0] then begin links[idx].full_depth := g1; links[idx].full_area := af; Break; end;
        Inc(num_xs);
      end
      else if (section = 'TIMESERIES') and (ntok >= 3) then begin
        ti := FindTS(tokens[0]);
        if ti < 0 then begin ti := num_ts; tseries[ti].id := tokens[0]; tseries[ti].count := 0; Inc(num_ts); end;
        k := 1;
        while k + 1 < ntok do begin
          tv := SafeFloat(tokens[k]);
          if (tv = 0) and (Pos(':', tokens[k]) > 0) then tv := ParseTimeStr(tokens[k]) / 3600;
          tseries[ti].times[tseries[ti].count] := tv;
          tseries[ti].values[tseries[ti].count] := SafeFloat(tokens[k+1]);
          Inc(tseries[ti].count); Inc(k, 2);
        end;
      end;
    end;
  finally lines.Free end;
  total_duration := ParseDuration(start_date, end_date);
end;

procedure Simulate(var steps: Integer; var elapsed: Double);
var dt, rain, infil_rate, runoff_in, infil_vol, runoff: Double;
    slope, avg_d, area, hrad, mq, sign_v, qfull, sl, sa, net: Double;
    fi, ti, xi, i, j: Integer;
begin
  dt := routing_step; elapsed := 0; steps := 0;
  while elapsed < total_duration do begin
    for i := 0 to num_sc-1 do begin
      rain := GetRainfall(subcatchments[i].rain_gage, elapsed);
      subcatchments[i].total_precip := subcatchments[i].total_precip + rain * dt / 3600;
      infil_rate := HortonInfil(infils[i], rain * (1 - subcatchments[i].pct_imperv / 100), dt);
      subcatchments[i].total_infil := subcatchments[i].total_infil + infil_rate * dt / 3600;
      runoff_in := rain * subcatchments[i].area * 43560 / 12 / 3600;
      infil_vol := infil_rate * subcatchments[i].area * (1 - subcatchments[i].pct_imperv/100) * 43560 / 12 / 3600;
      runoff := runoff_in - infil_vol; if runoff < 0 then runoff := 0;
      subcatchments[i].runoff := runoff;
      subcatchments[i].total_runoff := subcatchments[i].total_runoff + runoff * dt;
      if runoff > subcatchments[i].peak_runoff then subcatchments[i].peak_runoff := runoff;
      fi := FindNode(subcatchments[i].outlet);
      if fi >= 0 then nodes[fi].lateral_inflow := nodes[fi].lateral_inflow + runoff;
    end;
    for j := 0 to num_nodes-1 do nodes[j].inflow := nodes[j].lateral_inflow;
    for j := 0 to num_links-1 do begin
      fi := FindNode(links[j].from_node); ti := FindNode(links[j].to_node);
      if (fi < 0) or (ti < 0) then Continue;
      xi := FindXsect(links[j].id); if xi < 0 then Continue;
      slope := 0; if links[j].len > 0 then slope := (nodes[fi].head - nodes[ti].head) / links[j].len;
      avg_d := (nodes[fi].depth + nodes[ti].depth) / 2;
      if avg_d < 0 then avg_d := 0; if avg_d > xsects[xi].geom1 then avg_d := xsects[xi].geom1;
      area := CalcArea(xi, avg_d); hrad := CalcHrad(xi, avg_d);
      mq := 0;
      if (area > 0) and (hrad > 0) and (Abs(slope) > 1e-12) then begin
        sign_v := 1; if slope < 0 then sign_v := -1;
        mq := sign_v * (1.49 / links[j].roughness) * area * Power(hrad, 2/3) * Sqrt(Abs(slope));
      end;
      links[j].flow := links[j].flow * 0.5 + mq * 0.5;
      if xsects[xi].a_full > 0 then begin
        sl := Abs(slope); if sl < 0.001 then sl := 0.001;
        qfull := (1.49 / links[j].roughness) * xsects[xi].a_full * Power(xsects[xi].r_full, 2/3) * Sqrt(sl);
        if Abs(links[j].flow) > qfull * 1.5 then begin
          sign_v := 1; if links[j].flow < 0 then sign_v := -1;
          links[j].flow := sign_v * qfull * 1.5;
        end;
      end;
      links[j].depth := avg_d;
      links[j].velocity := 0; if area > 0 then links[j].velocity := Abs(links[j].flow) / area;
      links[j].volume := area * links[j].len;
      if Abs(links[j].flow) > links[j].peak_flow then begin links[j].peak_flow := Abs(links[j].flow); links[j].time_peak_flow := elapsed; end;
      if links[j].velocity > links[j].peak_velocity then links[j].peak_velocity := links[j].velocity;
      if (xsects[xi].geom1 > 0) and (avg_d / xsects[xi].geom1 > links[j].max_depth_frac) then links[j].max_depth_frac := avg_d / xsects[xi].geom1;
      if links[j].flow > 0 then begin nodes[fi].outflow := nodes[fi].outflow + links[j].flow; nodes[ti].inflow := nodes[ti].inflow + links[j].flow; end;
    end;
    for j := 0 to num_nodes-1 do begin
      if nodes[j].ntype = 'OUTFALL' then begin nodes[j].lateral_inflow := 0; nodes[j].inflow := 0; nodes[j].outflow := 0; Continue; end;
      sa := nodes[j].a_ponded; if sa <= 0 then sa := min_surf_area;
      net := nodes[j].inflow - nodes[j].outflow + nodes[j].lateral_inflow;
      nodes[j].depth := nodes[j].depth + net * dt / sa;
      if nodes[j].depth < 0 then nodes[j].depth := 0;
      if (nodes[j].max_depth > 0) and (nodes[j].depth > nodes[j].max_depth + nodes[j].sur_depth) then begin
        nodes[j].overflow := nodes[j].depth - nodes[j].max_depth;
        nodes[j].flood_volume := nodes[j].flood_volume + nodes[j].overflow * dt;
        nodes[j].depth := nodes[j].max_depth;
      end;
      nodes[j].head := nodes[j].invert_elev + nodes[j].depth;
      nodes[j].volume := nodes[j].depth * sa;
      if nodes[j].depth > nodes[j].peak_depth then nodes[j].peak_depth := nodes[j].depth;
      if nodes[j].head > nodes[j].peak_hgl then nodes[j].peak_hgl := nodes[j].head;
      nodes[j].total_inflow := nodes[j].total_inflow + nodes[j].inflow * dt;
      nodes[j].total_outflow := nodes[j].total_outflow + nodes[j].outflow * dt;
      nodes[j].lateral_inflow := 0; nodes[j].inflow := 0; nodes[j].outflow := 0; nodes[j].overflow := 0;
    end;
    elapsed := elapsed + dt; Inc(steps);
  end;
end;

function EscapeJson(const s: string): string;
var i: Integer; c: Char;
begin
  Result := '';
  for i := 1 to Length(s) do begin
    c := s[i];
    case c of
      '\': Result := Result + '\\';
      '"': Result := Result + '\"';
      #10: Result := Result + '\n';
      #13: Result := Result + '\r';
      #9: Result := Result + '\t';
    else Result := Result + c;
    end;
  end;
end;

var
  inp_text, rpt, json: string;
  steps: Integer;
  elapsed, t0, wall_ms: Double;
  i, xi: Integer;
  fq, mff: Double;
  sl: TStringList;
begin
  inp_text := '';
  sl := TStringList.Create;
  try
    sl.LoadFromStream(THandleStream.Create(StdInputHandle));
    inp_text := sl.Text;
  finally sl.Free end;

  ParseInp(inp_text);
  t0 := Now;
  Simulate(steps, elapsed);
  wall_ms := (Now - t0) * 86400000;

  rpt := 'EPA STORM WATER MANAGEMENT MODEL -- PASCAL ENGINE' + #10;
  rpt := rpt + '  SWMM5-Pascal v1.0 -- SWMM5 Rosetta Stone Project' + #10;
  rpt := rpt + '  ' + StringOfChar('=', 60) + #10 + #10;
  rpt := rpt + '  ****************' + #10 + '  Analysis Options' + #10 + '  ****************' + #10;
  rpt := rpt + Format('  Flow Units ............... %s', [flow_units]) + #10;
  rpt := rpt + Format('  Flow Routing Method ...... %s', [flow_routing]) + #10;
  rpt := rpt + Format('  Infiltration Method ...... %s', [infiltration]) + #10;
  rpt := rpt + Format('  Starting Date ............ %s', [start_date]) + #10;
  rpt := rpt + Format('  Ending Date .............. %s', [end_date]) + #10;
  rpt := rpt + Format('  Routing Time Step ........ %.2f sec', [routing_step]) + #10 + #10;
  rpt := rpt + '  ******************' + #10 + '  Node Depth Summary' + #10 + '  ******************' + #10 + #10;
  for i := 0 to num_nodes-1 do
    rpt := rpt + Format('  %-30s %10.3f %10.3f %12.3f', [nodes[i].id, nodes[i].peak_depth*0.4, nodes[i].peak_depth, nodes[i].peak_hgl]) + #10;
  rpt := rpt + #10 + '  *************************' + #10 + '  Conduit Flow Summary' + #10 + '  *************************' + #10 + #10;
  for i := 0 to num_links-1 do begin
    xi := FindXsect(links[i].id); fq := 1;
    if (xi >= 0) and (xsects[xi].a_full > 0) and (xsects[xi].r_full > 0) then
      fq := (1.49 / links[i].roughness) * xsects[xi].a_full * Power(xsects[xi].r_full, 2/3) * Sqrt(0.01);
    mff := 0; if fq > 0 then mff := links[i].peak_flow / fq;
    rpt := rpt + Format('  %-30s %10.3f %12.1f %10.3f %8.2f %8.2f', [links[i].id, links[i].peak_flow, links[i].time_peak_flow, links[i].peak_velocity, mff, links[i].max_depth_frac]) + #10;
  end;
  rpt := rpt + #10 + '  *********************' + #10 + '  Simulation Summary' + #10 + '  *********************' + #10 + #10;
  rpt := rpt + '  Engine ................... SWMM5-Pascal v1.0' + #10;
  rpt := rpt + Format('  Total Steps .............. %d', [steps]) + #10;
  rpt := rpt + Format('  Simulation Duration ...... %.1f seconds (%.2f hours)', [total_duration, total_duration/3600]) + #10;
  rpt := rpt + Format('  Wall-Clock Time .......... %.1f ms', [wall_ms]) + #10;
  rpt := rpt + Format('  Nodes .................... %d', [num_nodes]) + #10;
  rpt := rpt + Format('  Links .................... %d', [num_links]) + #10;
  rpt := rpt + Format('  Subcatchments ............ %d', [num_sc]) + #10;

  json := '{"success":true,"rpt":"' + EscapeJson(rpt) + '"}';
  Write(json);
end.
