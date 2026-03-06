program swmm5_engine
  implicit none
  integer, parameter :: MAX_NODES = 500, MAX_LINKS = 500, MAX_SC = 200
  integer, parameter :: MAX_GAGES = 50, MAX_XS = 500, MAX_TS = 50, MAX_TV = 200
  double precision, parameter :: PI = 3.14159265358979323846d0
  character(len=1048576) :: inp_text
  character(len=32) :: flow_units, infiltration, flow_routing
  character(len=16) :: start_date, end_date
  double precision :: report_step, wet_step, dry_step, routing_step, total_dur, min_surf
  character(len=64) :: node_ids(MAX_NODES), link_ids(MAX_LINKS), sc_ids(MAX_SC)
  character(len=16) :: node_types(MAX_NODES)
  double precision :: n_ie(MAX_NODES), n_md(MAX_NODES), n_id(MAX_NODES), n_sd(MAX_NODES)
  double precision :: n_ap(MAX_NODES), n_depth(MAX_NODES), n_head(MAX_NODES)
  double precision :: n_vol(MAX_NODES), n_inf(MAX_NODES), n_outf(MAX_NODES)
  double precision :: n_ovf(MAX_NODES), n_li(MAX_NODES)
  double precision :: n_pd(MAX_NODES), n_phgl(MAX_NODES), n_ti(MAX_NODES), n_to(MAX_NODES)
  double precision :: n_fv(MAX_NODES)
  integer :: num_nodes, num_links, num_sc, num_gages, num_xs
  character(len=64) :: l_fn(MAX_LINKS), l_tn(MAX_LINKS)
  double precision :: l_len(MAX_LINKS), l_rough(MAX_LINKS), l_io(MAX_LINKS), l_oo(MAX_LINKS)
  double precision :: l_flow(MAX_LINKS), l_depth(MAX_LINKS), l_vel(MAX_LINKS), l_vol(MAX_LINKS)
  double precision :: l_pf(MAX_LINKS), l_pv(MAX_LINKS), l_tpf(MAX_LINKS), l_mdf(MAX_LINKS)
  double precision :: l_fd(MAX_LINKS), l_fa(MAX_LINKS)
  character(len=64) :: xs_ids(MAX_XS)
  character(len=16) :: xs_types(MAX_XS)
  double precision :: xs_g1(MAX_XS), xs_g2(MAX_XS), xs_af(MAX_XS), xs_rf(MAX_XS)
  character(len=64) :: sc_rg(MAX_SC), sc_out(MAX_SC)
  double precision :: sc_area(MAX_SC), sc_pi(MAX_SC), sc_w(MAX_SC), sc_sl(MAX_SC)
  double precision :: sc_ro(MAX_SC), sc_tp(MAX_SC), sc_tr(MAX_SC), sc_tif(MAX_SC), sc_pr(MAX_SC)
  double precision :: inf_mr(MAX_SC), inf_mnr(MAX_SC), inf_dc(MAX_SC), inf_dt(MAX_SC)
  double precision :: inf_cr(MAX_SC), inf_ci(MAX_SC)
  character(len=64) :: g_ids(MAX_GAGES), g_sn(MAX_GAGES)
  character(len=64) :: ts_ids(MAX_TS)
  double precision :: ts_times(MAX_TS, MAX_TV), ts_vals(MAX_TS, MAX_TV)
  integer :: ts_cnt(MAX_TS), num_ts
  integer :: i, n, steps, ios, text_len
  double precision :: elapsed, wall_ms, t0, t1
  character(len=131072) :: rpt_text
  character(len=262144) :: json_out

  num_nodes = 0; num_links = 0; num_sc = 0; num_gages = 0; num_xs = 0; num_ts = 0
  flow_units = "CFS"; infiltration = "HORTON"; flow_routing = "DYNWAVE"
  start_date = "01/01/2024"; end_date = "01/02/2024"
  report_step = 900; wet_step = 300; dry_step = 3600; routing_step = 30
  total_dur = 86400; min_surf = 12.566
  l_flow = 0; l_depth = 0; l_vel = 0; l_vol = 0; l_pf = 0; l_pv = 0; l_tpf = 0; l_mdf = 0
  l_fd = 0; l_fa = 0
  n_depth = 0; n_head = 0; n_vol = 0; n_inf = 0; n_outf = 0; n_ovf = 0; n_li = 0
  n_pd = 0; n_phgl = 0; n_ti = 0; n_to = 0; n_fv = 0
  sc_ro = 0; sc_tp = 0; sc_tr = 0; sc_tif = 0; sc_pr = 0

  text_len = 0
  inp_text = ''
  do
    read(*, '(A)', iostat=ios) rpt_text
    if (ios /= 0) exit
    n = len_trim(rpt_text)
    if (text_len + n + 1 > len(inp_text)) exit
    inp_text(text_len+1:text_len+n) = rpt_text(1:n)
    text_len = text_len + n
    inp_text(text_len+1:text_len+1) = char(10)
    text_len = text_len + 1
  end do

  call parse_inp(inp_text(1:text_len))
  call calc_duration()

  call cpu_time(t0)
  call simulate(steps, elapsed)
  call cpu_time(t1)
  wall_ms = (t1 - t0) * 1000.0d0

  call gen_rpt(steps, wall_ms, rpt_text)
  call make_json(rpt_text, json_out)
  write(*, '(A)', advance='no') trim(json_out)

contains

subroutine parse_inp(text)
  character(len=*), intent(in) :: text
  character(len=256) :: line
  character(len=64) :: tokens(20), section
  integer :: ntok, pos, lstart, lend, tlen
  section = ""
  lstart = 1
  do while (lstart <= len_trim(text))
    lend = index(text(lstart:), char(10))
    if (lend == 0) then; line = text(lstart:); lstart = len(text) + 1
    else; line = text(lstart:lstart+lend-2); lstart = lstart + lend; end if
    line = adjustl(line)
    tlen = len_trim(line)
    if (tlen == 0 .or. line(1:1) == ';') cycle
    if (line(1:1) == '[') then
      pos = index(line, ']')
      if (pos > 2) section = line(2:pos-1)
      call to_upper(section)
      cycle
    end if
    call tokenize(line, tokens, ntok)
    if (ntok == 0) cycle
    call to_upper(tokens(1))
    select case (trim(section))
    case ("OPTIONS")
      if (ntok >= 2) then
        select case (trim(tokens(1)))
        case ("FLOW_UNITS"); flow_units = tokens(2)
        case ("INFILTRATION"); infiltration = tokens(2)
        case ("FLOW_ROUTING"); flow_routing = tokens(2)
        case ("START_DATE"); start_date = tokens(2)
        case ("END_DATE"); end_date = tokens(2)
        case ("REPORT_STEP"); report_step = parse_time(tokens(2))
        case ("WET_STEP"); wet_step = parse_time(tokens(2))
        case ("DRY_STEP"); dry_step = parse_time(tokens(2))
        case ("ROUTING_STEP"); routing_step = parse_time(tokens(2))
        end select
      end if
    case ("RAINGAGES")
      if (ntok >= 6 .and. num_gages < MAX_GAGES) then
        num_gages = num_gages + 1
        g_ids(num_gages) = tokens(1); g_sn(num_gages) = tokens(6)
      end if
    case ("SUBCATCHMENTS")
      if (ntok >= 7 .and. num_sc < MAX_SC) then
        num_sc = num_sc + 1
        sc_ids(num_sc) = tokens(1); sc_rg(num_sc) = tokens(2); sc_out(num_sc) = tokens(3)
        read(tokens(4),*) sc_area(num_sc); read(tokens(5),*) sc_pi(num_sc)
        read(tokens(6),*) sc_w(num_sc); read(tokens(7),*) sc_sl(num_sc)
        inf_mr(num_sc) = 3; inf_mnr(num_sc) = 0.5; inf_dc(num_sc) = 4
        inf_dt(num_sc) = 7; inf_cr(num_sc) = 3; inf_ci(num_sc) = 0
      end if
    case ("INFILTRATION")
      if (ntok >= 4) then
        do i = 1, num_sc
          if (trim(sc_ids(i)) == trim(tokens(1))) then
            read(tokens(2),*) inf_mr(i); read(tokens(3),*) inf_mnr(i); read(tokens(4),*) inf_dc(i)
            if (ntok > 4) then; read(tokens(5),*) inf_dt(i); else; inf_dt(i) = 7; end if
            inf_cr(i) = inf_mr(i); exit
          end if
        end do
      end if
    case ("JUNCTIONS")
      if (ntok >= 2 .and. num_nodes < MAX_NODES) then
        num_nodes = num_nodes + 1
        node_ids(num_nodes) = tokens(1); node_types(num_nodes) = "JUNCTION"
        read(tokens(2),*) n_ie(num_nodes)
        n_md(num_nodes) = 0; n_id(num_nodes) = 0; n_sd(num_nodes) = 0; n_ap(num_nodes) = 0
        if (ntok > 2) read(tokens(3),*,iostat=ios) n_md(num_nodes)
        if (ntok > 3) read(tokens(4),*,iostat=ios) n_id(num_nodes)
        if (ntok > 4) read(tokens(5),*,iostat=ios) n_sd(num_nodes)
        if (ntok > 5) read(tokens(6),*,iostat=ios) n_ap(num_nodes)
        n_depth(num_nodes) = n_id(num_nodes)
        n_head(num_nodes) = n_ie(num_nodes) + n_id(num_nodes)
      end if
    case ("OUTFALLS")
      if (ntok >= 3 .and. num_nodes < MAX_NODES) then
        num_nodes = num_nodes + 1
        node_ids(num_nodes) = tokens(1); node_types(num_nodes) = "OUTFALL"
        read(tokens(2),*) n_ie(num_nodes)
        n_md(num_nodes) = 0; n_id(num_nodes) = 0; n_sd(num_nodes) = 0; n_ap(num_nodes) = 0
        n_depth(num_nodes) = 0; n_head(num_nodes) = n_ie(num_nodes)
      end if
    case ("CONDUITS")
      if (ntok >= 6 .and. num_links < MAX_LINKS) then
        num_links = num_links + 1
        link_ids(num_links) = tokens(1); l_fn(num_links) = tokens(2); l_tn(num_links) = tokens(3)
        read(tokens(4),*) l_len(num_links); read(tokens(5),*) l_rough(num_links)
        read(tokens(6),*) l_io(num_links)
        l_oo(num_links) = 0; if (ntok > 6) read(tokens(7),*,iostat=ios) l_oo(num_links)
      end if
    case ("XSECTIONS")
      if (ntok >= 3 .and. num_xs < MAX_XS) then
        num_xs = num_xs + 1
        xs_ids(num_xs) = tokens(1)
        xs_types(num_xs) = tokens(2); call to_upper(xs_types(num_xs))
        read(tokens(3),*,iostat=ios) xs_g1(num_xs); if (ios /= 0) xs_g1(num_xs) = 1.0d0
        xs_g2(num_xs) = 0; if (ntok > 3) read(tokens(4),*,iostat=ios) xs_g2(num_xs)
        if (ios /= 0) xs_g2(num_xs) = 0.0d0
        if (trim(xs_types(num_xs)) == "CIRCULAR") then
          xs_af(num_xs) = PI * (xs_g1(num_xs)/2)**2; xs_rf(num_xs) = xs_g1(num_xs)/4
        else
          block; double precision :: w, p
            w = xs_g2(num_xs); if (w <= 0) w = xs_g1(num_xs)
            xs_af(num_xs) = xs_g1(num_xs) * w; p = 2*xs_g1(num_xs) + 2*w
            xs_rf(num_xs) = 0; if (p > 0) xs_rf(num_xs) = xs_af(num_xs)/p
          end block
        end if
        do i = 1, num_links
          if (trim(link_ids(i)) == trim(tokens(1))) then
            l_fd(i) = xs_g1(num_xs); l_fa(i) = xs_af(num_xs); exit
          end if
        end do
      end if
    case ("TIMESERIES")
      if (ntok >= 3) then
        block; integer :: ti, k; double precision :: tv
          ti = find_ts(tokens(1))
          if (ti == 0) then; num_ts = num_ts + 1; ti = num_ts; ts_ids(ti) = tokens(1); ts_cnt(ti) = 0; end if
          k = 2
          do while (k + 1 <= ntok)
            read(tokens(k),*,iostat=ios) tv
            if (ios /= 0) then; tv = parse_time(tokens(k)) / 3600.0d0; end if
            ts_cnt(ti) = ts_cnt(ti) + 1
            ts_times(ti, ts_cnt(ti)) = tv
            read(tokens(k+1),*) ts_vals(ti, ts_cnt(ti))
            k = k + 2
          end do
        end block
      end if
    end select
  end do
end subroutine

integer function find_node(id)
  character(len=*), intent(in) :: id
  integer :: j
  find_node = 0
  do j = 1, num_nodes
    if (trim(node_ids(j)) == trim(id)) then; find_node = j; return; end if
  end do
end function

integer function find_xs(id)
  character(len=*), intent(in) :: id
  integer :: j
  find_xs = 0
  do j = 1, num_xs
    if (trim(xs_ids(j)) == trim(id)) then; find_xs = j; return; end if
  end do
end function

integer function find_ts(id)
  character(len=*), intent(in) :: id
  integer :: j
  find_ts = 0
  do j = 1, num_ts
    if (trim(ts_ids(j)) == trim(id)) then; find_ts = j; return; end if
  end do
end function

double precision function get_rain(gage_id, elapsed)
  character(len=*), intent(in) :: gage_id
  double precision, intent(in) :: elapsed
  integer :: j, ti, k
  double precision :: t_hr
  get_rain = 0
  do j = 1, num_gages
    if (trim(g_ids(j)) == trim(gage_id)) then
      ti = find_ts(g_sn(j)); if (ti == 0) return
      t_hr = elapsed / 3600.0d0
      do k = ts_cnt(ti), 1, -1
        if (t_hr >= ts_times(ti,k)) then; get_rain = ts_vals(ti,k); return; end if
      end do
      return
    end if
  end do
end function

double precision function horton(idx, rainfall, dt)
  integer, intent(in) :: idx
  double precision, intent(in) :: rainfall, dt
  double precision :: rec, rate
  if (rainfall <= 0) then
    rec = 0; if (inf_dt(idx) > 0) rec = dt / (inf_dt(idx) * 86400)
    inf_cr(idx) = inf_cr(idx) + (inf_mr(idx) - inf_cr(idx)) * rec
    horton = 0; return
  end if
  rate = min(inf_cr(idx), rainfall)
  inf_cr(idx) = inf_mnr(idx) + (inf_cr(idx) - inf_mnr(idx)) * exp(-inf_dc(idx) * dt / 3600)
  inf_ci(idx) = inf_ci(idx) + rate * dt / 3600
  horton = rate
end function

double precision function calc_area(xi, depth)
  integer, intent(in) :: xi
  double precision, intent(in) :: depth
  double precision :: r, y, arg, theta, w
  calc_area = 0; if (depth <= 0) return
  if (trim(xs_types(xi)) == "CIRCULAR") then
    if (depth >= xs_g1(xi)) then; calc_area = xs_af(xi); return; end if
    r = xs_g1(xi)/2; y = depth - r; if (abs(r) < 1d-10) return
    arg = -y/r; arg = max(-1d0, min(1d0, arg))
    theta = 2*acos(arg); calc_area = r*r*(theta - sin(theta))/2
  else
    w = xs_g2(xi); if (w <= 0) w = xs_g1(xi); calc_area = depth * w
  end if
end function

double precision function calc_hrad(xi, depth)
  integer, intent(in) :: xi
  double precision, intent(in) :: depth
  double precision :: area, r, y, arg, theta, perim, w
  calc_hrad = 0; area = calc_area(xi, depth); if (area <= 0) return
  if (trim(xs_types(xi)) == "CIRCULAR") then
    r = xs_g1(xi)/2; y = depth - r; if (abs(r) < 1d-10) return
    arg = -y/r; arg = max(-1d0, min(1d0, arg))
    theta = 2*acos(arg); perim = r*theta
    if (perim > 0) calc_hrad = area/perim
  else
    w = xs_g2(xi); if (w <= 0) w = xs_g1(xi); perim = w + 2*depth
    if (perim > 0) calc_hrad = area/perim
  end if
end function

subroutine calc_duration()
  integer :: m1,d1,y1,m2,d2,y2,ios2
  read(start_date(1:2),*,iostat=ios2) m1; read(start_date(4:5),*,iostat=ios2) d1; read(start_date(7:10),*,iostat=ios2) y1
  read(end_date(1:2),*,iostat=ios2) m2; read(end_date(4:5),*,iostat=ios2) d2; read(end_date(7:10),*,iostat=ios2) y2
  if (ios2 /= 0) then; total_dur = 86400; return; end if
  total_dur = dble((y2-y1)*365 + (m2-m1)*30 + (d2-d1)) * 86400
  if (total_dur <= 0) total_dur = 86400
end subroutine

subroutine simulate(steps, elapsed)
  integer, intent(out) :: steps
  double precision, intent(out) :: elapsed
  double precision :: dt, rain, infil_rate, runoff_in, infil_vol, runoff
  double precision :: slope, avg_d, area, hrad, mq, sign_v, qfull, sl, sa, net
  integer :: fi, ti, xi, j
  dt = routing_step; elapsed = 0; steps = 0
  do while (elapsed < total_dur)
    do i = 1, num_sc
      rain = get_rain(sc_rg(i), elapsed)
      sc_tp(i) = sc_tp(i) + rain * dt / 3600
      infil_rate = horton(i, rain * (1 - sc_pi(i)/100), dt)
      sc_tif(i) = sc_tif(i) + infil_rate * dt / 3600
      runoff_in = rain * sc_area(i) * 43560 / 12 / 3600
      infil_vol = infil_rate * sc_area(i) * (1 - sc_pi(i)/100) * 43560 / 12 / 3600
      runoff = runoff_in - infil_vol; if (runoff < 0) runoff = 0
      sc_ro(i) = runoff; sc_tr(i) = sc_tr(i) + runoff * dt
      if (runoff > sc_pr(i)) sc_pr(i) = runoff
      fi = find_node(sc_out(i))
      if (fi > 0) n_li(fi) = n_li(fi) + runoff
    end do
    do j = 1, num_nodes; n_inf(j) = n_li(j); end do
    do j = 1, num_links
      fi = find_node(l_fn(j)); ti = find_node(l_tn(j))
      if (fi == 0 .or. ti == 0) cycle
      xi = find_xs(link_ids(j)); if (xi == 0) cycle
      slope = 0; if (l_len(j) > 0) slope = (n_head(fi) - n_head(ti)) / l_len(j)
      avg_d = (n_depth(fi) + n_depth(ti)) / 2
      avg_d = max(0d0, min(xs_g1(xi), avg_d))
      area = calc_area(xi, avg_d); hrad = calc_hrad(xi, avg_d)
      mq = 0
      if (area > 0 .and. hrad > 0 .and. abs(slope) > 1d-12) then
        sign_v = 1; if (slope < 0) sign_v = -1
        mq = sign_v * (1.49d0/l_rough(j)) * area * hrad**(2d0/3d0) * sqrt(abs(slope))
      end if
      l_flow(j) = l_flow(j)*0.5 + mq*0.5
      if (xs_af(xi) > 0) then
        sl = max(abs(slope), 0.001d0)
        qfull = (1.49d0/l_rough(j)) * xs_af(xi) * xs_rf(xi)**(2d0/3d0) * sqrt(sl)
        if (abs(l_flow(j)) > qfull*1.5) then
          sign_v = 1; if (l_flow(j) < 0) sign_v = -1
          l_flow(j) = sign_v * qfull * 1.5
        end if
      end if
      l_depth(j) = avg_d
      l_vel(j) = 0; if (area > 0) l_vel(j) = abs(l_flow(j)) / area
      l_vol(j) = area * l_len(j)
      if (abs(l_flow(j)) > l_pf(j)) then; l_pf(j) = abs(l_flow(j)); l_tpf(j) = elapsed; end if
      if (l_vel(j) > l_pv(j)) l_pv(j) = l_vel(j)
      if (xs_g1(xi) > 0 .and. avg_d/xs_g1(xi) > l_mdf(j)) l_mdf(j) = avg_d/xs_g1(xi)
      if (l_flow(j) > 0) then
        n_outf(fi) = n_outf(fi) + l_flow(j); n_inf(ti) = n_inf(ti) + l_flow(j)
      end if
    end do
    do j = 1, num_nodes
      if (trim(node_types(j)) == "OUTFALL") cycle
      sa = n_ap(j); if (sa <= 0) sa = min_surf
      net = n_inf(j) - n_outf(j) + n_li(j)
      n_depth(j) = n_depth(j) + net * dt / sa
      if (n_depth(j) < 0) n_depth(j) = 0
      if (n_md(j) > 0 .and. n_depth(j) > n_md(j) + n_sd(j)) then
        n_ovf(j) = n_depth(j) - n_md(j)
        n_fv(j) = n_fv(j) + n_ovf(j) * dt
        n_depth(j) = n_md(j)
      end if
      n_head(j) = n_ie(j) + n_depth(j); n_vol(j) = n_depth(j) * sa
      if (n_depth(j) > n_pd(j)) n_pd(j) = n_depth(j)
      if (n_head(j) > n_phgl(j)) n_phgl(j) = n_head(j)
      n_ti(j) = n_ti(j) + n_inf(j) * dt; n_to(j) = n_to(j) + n_outf(j) * dt
      n_li(j) = 0; n_inf(j) = 0; n_outf(j) = 0; n_ovf(j) = 0
    end do
    elapsed = elapsed + dt; steps = steps + 1
  end do
end subroutine

subroutine gen_rpt(steps, wall_ms, rpt)
  integer, intent(in) :: steps
  double precision, intent(in) :: wall_ms
  character(len=*), intent(out) :: rpt
  character(len=256) :: tmp
  integer :: j, xi
  double precision :: fullq, mff
  rpt = ""
  call add_line(rpt, "  EPA STORM WATER MANAGEMENT MODEL -- FORTRAN ENGINE")
  call add_line(rpt, "  SWMM5-Fortran v1.0 -- SWMM5 Rosetta Stone Project")
  call add_line(rpt, "  ============================================================")
  call add_line(rpt, "")
  call add_line(rpt, "  ****************"); call add_line(rpt, "  Analysis Options"); call add_line(rpt, "  ****************")
  write(tmp,'(A,A)') "  Flow Units ............... ", trim(flow_units); call add_line(rpt, tmp)
  write(tmp,'(A,A)') "  Flow Routing Method ...... ", trim(flow_routing); call add_line(rpt, tmp)
  write(tmp,'(A,A)') "  Infiltration Method ...... ", trim(infiltration); call add_line(rpt, tmp)
  write(tmp,'(A,A)') "  Starting Date ............ ", trim(start_date); call add_line(rpt, tmp)
  write(tmp,'(A,A)') "  Ending Date .............. ", trim(end_date); call add_line(rpt, tmp)
  write(tmp,'(A,F8.2,A)') "  Routing Time Step ........ ", routing_step, " sec"; call add_line(rpt, tmp)
  call add_line(rpt, ""); call add_line(rpt, "  ******************"); call add_line(rpt, "  Node Depth Summary")
  call add_line(rpt, "  ******************"); call add_line(rpt, "")
  do j = 1, num_nodes
    write(tmp,'(A2,A30,F10.3,F10.3,F12.3)') "  ", adjustl(node_ids(j)), n_pd(j)*0.4, n_pd(j), n_phgl(j)
    call add_line(rpt, tmp)
  end do
  call add_line(rpt, ""); call add_line(rpt, "  *************************"); call add_line(rpt, "  Conduit Flow Summary")
  call add_line(rpt, "  *************************"); call add_line(rpt, "")
  do j = 1, num_links
    xi = find_xs(link_ids(j)); fullq = 1
    if (xi > 0 .and. xs_af(xi) > 0 .and. xs_rf(xi) > 0) fullq = (1.49d0/l_rough(j))*xs_af(xi)*xs_rf(xi)**(2d0/3d0)*sqrt(0.01d0)
    mff = 0; if (fullq > 0) mff = l_pf(j)/fullq
    write(tmp,'(A2,A30,F10.3,F12.1,F10.3,F8.2,F8.2)') "  ", adjustl(link_ids(j)), l_pf(j), l_tpf(j), l_pv(j), mff, l_mdf(j)
    call add_line(rpt, tmp)
  end do
  call add_line(rpt, ""); call add_line(rpt, "  *********************"); call add_line(rpt, "  Simulation Summary")
  call add_line(rpt, "  *********************"); call add_line(rpt, "")
  call add_line(rpt, "  Engine ................... SWMM5-Fortran v1.0")
  write(tmp,'(A,I0)') "  Total Steps .............. ", steps; call add_line(rpt, tmp)
  write(tmp,'(A,F10.1,A,F8.2,A)') "  Simulation Duration ...... ", total_dur, " seconds (", total_dur/3600, " hours)"
  call add_line(rpt, tmp)
  write(tmp,'(A,F10.1,A)') "  Wall-Clock Time .......... ", wall_ms, " ms"; call add_line(rpt, tmp)
  write(tmp,'(A,I0)') "  Nodes .................... ", num_nodes; call add_line(rpt, tmp)
  write(tmp,'(A,I0)') "  Links .................... ", num_links; call add_line(rpt, tmp)
  write(tmp,'(A,I0)') "  Subcatchments ............ ", num_sc; call add_line(rpt, tmp)
end subroutine

subroutine add_line(rpt, line)
  character(len=*), intent(inout) :: rpt
  character(len=*), intent(in) :: line
  integer :: n
  n = len_trim(rpt)
  rpt(n+1:) = trim(line) // char(10)
end subroutine

subroutine make_json(rpt, json)
  character(len=*), intent(in) :: rpt
  character(len=*), intent(out) :: json
  integer :: i, j, n
  character(len=1) :: c
  json = '{"success":true,"rpt":"'
  j = len_trim(json)
  n = len_trim(rpt)
  do i = 1, n
    c = rpt(i:i)
    if (c == '\') then; json(j+1:j+2) = '\\'; j = j + 2
    else if (c == '"') then; json(j+1:j+2) = '\"'; j = j + 2
    else if (c == char(10)) then; json(j+1:j+2) = '\n'; j = j + 2
    else if (c == char(13)) then; json(j+1:j+2) = '\r'; j = j + 2
    else if (c == char(9)) then; json(j+1:j+2) = '\t'; j = j + 2
    else; json(j+1:j+1) = c; j = j + 1
    end if
  end do
  json(j+1:j+2) = '"}'
end subroutine

subroutine tokenize(line, tokens, ntok)
  character(len=*), intent(in) :: line
  character(len=64), intent(out) :: tokens(20)
  integer, intent(out) :: ntok
  integer :: i, s, n
  logical :: in_token
  ntok = 0; in_token = .false.; n = len_trim(line)
  do i = 1, n
    if (line(i:i) /= ' ' .and. line(i:i) /= char(9)) then
      if (.not. in_token) then; s = i; in_token = .true.; end if
    else
      if (in_token) then
        ntok = ntok + 1; if (ntok > 20) then; ntok = 20; return; end if
        tokens(ntok) = line(s:i-1); in_token = .false.
      end if
    end if
  end do
  if (in_token) then; ntok = ntok + 1; if (ntok <= 20) tokens(ntok) = line(s:n); end if
end subroutine

subroutine to_upper(s)
  character(len=*), intent(inout) :: s
  integer :: i, ic
  do i = 1, len_trim(s)
    ic = iachar(s(i:i))
    if (ic >= 97 .and. ic <= 122) s(i:i) = achar(ic - 32)
  end do
end subroutine

double precision function parse_time(s)
  character(len=*), intent(in) :: s
  integer :: h, m, ios2
  double precision :: sec
  integer :: cpos
  parse_time = 0
  cpos = index(s, ':')
  if (cpos > 0) then
    read(s(1:cpos-1),*,iostat=ios2) h; if (ios2 /= 0) h = 0
    read(s(cpos+1:),*,iostat=ios2) m; if (ios2 /= 0) m = 0
    parse_time = dble(h)*3600 + dble(m)*60
  else
    read(s,*,iostat=ios2) sec; if (ios2 == 0) parse_time = sec
  end if
end function

end program
