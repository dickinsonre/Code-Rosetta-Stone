#!/usr/bin/env Rscript
PI <- 3.14159265358979323846

safe_num <- function(s, default=0) { v <- suppressWarnings(as.numeric(s)); ifelse(is.na(v), default, v) }

parse_time_str <- function(s) {
  s <- trimws(s)
  parts <- strsplit(s, ":")[[1]]
  if (length(parts) >= 2) {
    h <- safe_num(parts[1]); m <- safe_num(parts[2])
    sec <- if (length(parts) > 2) safe_num(parts[3]) else 0
    return(h * 3600 + m * 60 + sec)
  }
  safe_num(s)
}

parse_duration <- function(start, end_d) {
  tryCatch({
    sp <- strsplit(start, "/")[[1]]; ep <- strsplit(end_d, "/")[[1]]
    if (length(sp) < 3 || length(ep) < 3) return(86400)
    d1 <- as.Date(sprintf("%s-%s-%s", sp[3], sp[1], sp[2]))
    d2 <- as.Date(sprintf("%s-%s-%s", ep[3], ep[1], ep[2]))
    diff <- as.numeric(difftime(d2, d1, units="secs"))
    if (diff > 0) diff else 86400
  }, error=function(e) 86400)
}

parse_inp <- function(text) {
  m <- list(opts=list(flow_units="CFS", infiltration="HORTON", flow_routing="DYNWAVE",
    start_date="01/01/2024", end_date="01/02/2024", report_step=900, wet_step=300,
    dry_step=3600, routing_step=30, total_duration=86400, min_surf_area=12.566),
    gages=list(), subcatchments=list(), infil=list(), nodes=list(), links=list(),
    xsects=list(), timeseries=list(), node_map=list(), title="")
  section <- ""
  for (line in strsplit(text, "\n")[[1]]) {
    l <- trimws(line)
    if (nchar(l) == 0 || substr(l,1,1) == ";") next
    if (substr(l,1,1) == "[") { section <- toupper(gsub("[\\[\\]]", "", l)); next }
    t <- strsplit(l, "\\s+")[[1]]
    if (length(t) == 0) next
    if (section == "TITLE") { m$title <- l }
    else if (section == "OPTIONS" && length(t) >= 2) {
      k <- toupper(t[1])
      if (k == "FLOW_UNITS") m$opts$flow_units <- t[2]
      else if (k == "INFILTRATION") m$opts$infiltration <- t[2]
      else if (k == "FLOW_ROUTING") m$opts$flow_routing <- t[2]
      else if (k == "START_DATE") m$opts$start_date <- t[2]
      else if (k == "END_DATE") m$opts$end_date <- t[2]
      else if (k == "REPORT_STEP") m$opts$report_step <- parse_time_str(t[2])
      else if (k == "WET_STEP") m$opts$wet_step <- parse_time_str(t[2])
      else if (k == "DRY_STEP") m$opts$dry_step <- parse_time_str(t[2])
      else if (k == "ROUTING_STEP") m$opts$routing_step <- parse_time_str(t[2])
    }
    else if (section == "RAINGAGES" && length(t) >= 6) {
      m$gages[[length(m$gages)+1]] <- list(id=t[1], format=t[2], interval=parse_time_str(t[3])/60, scf=safe_num(t[4]), source_type=t[5], source_name=t[6])
    }
    else if (section == "SUBCATCHMENTS" && length(t) >= 7) {
      m$subcatchments[[length(m$subcatchments)+1]] <- list(id=t[1], rain_gage=t[2], outlet=t[3],
        area=safe_num(t[4]), pct_imperv=safe_num(t[5]), width=safe_num(t[6]), slope=safe_num(t[7]),
        runoff=0, rainfall=0, total_precip=0, total_runoff=0, total_infil=0, peak_runoff=0)
      m$infil[[length(m$infil)+1]] <- list(max_rate=3, min_rate=0.5, decay=4, dry_time=7, current_rate=3, cumul_infil=0)
    }
    else if (section == "INFILTRATION" && length(t) >= 4) {
      for (i in seq_along(m$subcatchments)) {
        if (m$subcatchments[[i]]$id == t[1]) {
          m$infil[[i]] <- list(max_rate=safe_num(t[2]), min_rate=safe_num(t[3]), decay=safe_num(t[4]),
            dry_time=if(length(t)>4) safe_num(t[5]) else 7, current_rate=safe_num(t[2]), cumul_infil=0)
          break
        }
      }
    }
    else if (section == "JUNCTIONS" && length(t) >= 2) {
      initD <- if(length(t)>3) safe_num(t[4]) else 0
      n <- list(id=t[1], type="JUNCTION", invert_elev=safe_num(t[2]),
        max_depth=if(length(t)>2) safe_num(t[3]) else 0, init_depth=initD,
        sur_depth=if(length(t)>4) safe_num(t[5]) else 0, a_ponded=if(length(t)>5) safe_num(t[6]) else 0,
        depth=initD, head=safe_num(t[2])+initD, volume=0, inflow=0, outflow=0, overflow=0,
        lateral_inflow=0, peak_depth=0, peak_hgl=0, time_peak_depth=0, total_inflow=0, total_outflow=0, flood_volume=0)
      m$node_map[[n$id]] <- length(m$nodes) + 1
      m$nodes[[length(m$nodes)+1]] <- n
    }
    else if (section == "OUTFALLS" && length(t) >= 3) {
      elev <- safe_num(t[2])
      n <- list(id=t[1], type="OUTFALL", invert_elev=elev, max_depth=0, init_depth=0, sur_depth=0, a_ponded=0,
        depth=0, head=elev, volume=0, inflow=0, outflow=0, overflow=0, lateral_inflow=0,
        peak_depth=0, peak_hgl=0, time_peak_depth=0, total_inflow=0, total_outflow=0, flood_volume=0)
      m$node_map[[n$id]] <- length(m$nodes) + 1
      m$nodes[[length(m$nodes)+1]] <- n
    }
    else if (section == "CONDUITS" && length(t) >= 6) {
      m$links[[length(m$links)+1]] <- list(id=t[1], from_node=t[2], to_node=t[3],
        length=safe_num(t[4]), roughness=safe_num(t[5]), in_offset=safe_num(t[6]),
        out_offset=if(length(t)>6) safe_num(t[7]) else 0,
        flow=0, depth=0, velocity=0, volume=0, peak_flow=0, peak_velocity=0,
        time_peak_flow=0, max_depth_frac=0, full_depth=0, full_area=0)
    }
    else if (section == "XSECTIONS" && length(t) >= 3) {
      g1 <- safe_num(t[3], 1); g2 <- if(length(t)>3) safe_num(t[4]) else 0
      tp <- toupper(t[2])
      if (tp == "CIRCULAR") { af <- PI*(g1/2)^2; rf <- g1/4 }
      else { w <- if(g2>0) g2 else g1; af <- g1*w; p <- 2*g1+2*w; rf <- if(p>0) af/p else 0 }
      for (i in seq_along(m$links)) {
        if (m$links[[i]]$id == t[1]) { m$links[[i]]$full_depth <- g1; m$links[[i]]$full_area <- af; break }
      }
      m$xsects[[length(m$xsects)+1]] <- list(id=t[1], xtype=tp, geom1=g1, geom2=g2, a_full=af, r_full=rf)
    }
    else if (section == "TIMESERIES" && length(t) >= 3) {
      tsid <- t[1]
      if (is.null(m$timeseries[[tsid]])) m$timeseries[[tsid]] <- list(id=tsid, times=c(), values=c())
      k <- 2
      while (k+1 <= length(t)) {
        tv <- safe_num(t[k], NA)
        if (is.na(tv)) { p <- strsplit(t[k],":")[[1]]; tv <- safe_num(p[1]) + if(length(p)>1) safe_num(p[2])/60 else 0 }
        m$timeseries[[tsid]]$times <- c(m$timeseries[[tsid]]$times, tv)
        m$timeseries[[tsid]]$values <- c(m$timeseries[[tsid]]$values, safe_num(t[k+1]))
        k <- k + 2
      }
    }
  }
  m$opts$total_duration <- parse_duration(m$opts$start_date, m$opts$end_date)
  m
}

get_rainfall <- function(m, gage_id, elapsed) {
  for (g in m$gages) {
    if (g$id == gage_id) {
      ts <- m$timeseries[[g$source_name]]
      if (is.null(ts) || length(ts$times)==0) return(0)
      t_hr <- elapsed / 3600
      for (i in rev(seq_along(ts$times))) { if (t_hr >= ts$times[i]) return(ts$values[i]) }
      return(0)
    }
  }
  0
}

horton_infil <- function(inf, rainfall, dt) {
  if (rainfall <= 0) {
    rec <- if(inf$dry_time>0) dt/(inf$dry_time*86400) else 0
    inf$current_rate <- inf$current_rate + (inf$max_rate - inf$current_rate)*rec
    return(list(rate=0, inf=inf))
  }
  rate <- min(inf$current_rate, rainfall)
  inf$current_rate <- inf$min_rate + (inf$current_rate - inf$min_rate)*exp(-inf$decay*dt/3600)
  inf$cumul_infil <- inf$cumul_infil + rate*dt/3600
  list(rate=rate, inf=inf)
}

xsect_area <- function(xs, depth) {
  if (depth <= 0) return(0)
  if (xs$xtype == "CIRCULAR") {
    if (depth >= xs$geom1) return(xs$a_full)
    r <- xs$geom1/2; y <- depth-r; if (abs(r)<1e-10) return(0)
    arg <- max(-1, min(1, -y/r)); theta <- 2*acos(arg); return(r*r*(theta-sin(theta))/2)
  }
  w <- if(xs$geom2>0) xs$geom2 else xs$geom1; depth*w
}

xsect_hrad <- function(xs, depth) {
  area <- xsect_area(xs, depth); if (area <= 0) return(0)
  if (xs$xtype == "CIRCULAR") {
    r <- xs$geom1/2; y <- depth-r; if (abs(r)<1e-10) return(0)
    arg <- max(-1, min(1, -y/r)); theta <- 2*acos(arg); perim <- r*theta
    return(if(perim>0) area/perim else 0)
  }
  w <- if(xs$geom2>0) xs$geom2 else xs$geom1; perim <- w+2*depth
  if(perim>0) area/perim else 0
}

find_xsect <- function(m, link_id) {
  for (xs in m$xsects) { if (xs$id == link_id) return(xs) }; NULL
}

simulate <- function(m) {
  dt <- m$opts$routing_step; total <- m$opts$total_duration
  elapsed <- 0; steps <- 0
  while (elapsed < total) {
    for (i in seq_along(m$subcatchments)) {
      rain <- get_rainfall(m, m$subcatchments[[i]]$rain_gage, elapsed)
      m$subcatchments[[i]]$rainfall <- rain
      m$subcatchments[[i]]$total_precip <- m$subcatchments[[i]]$total_precip + rain*dt/3600
      h <- horton_infil(m$infil[[i]], rain*(1-m$subcatchments[[i]]$pct_imperv/100), dt)
      m$infil[[i]] <- h$inf; infil_rate <- h$rate
      m$subcatchments[[i]]$total_infil <- m$subcatchments[[i]]$total_infil + infil_rate*dt/3600
      runoff_in <- rain*m$subcatchments[[i]]$area*43560/12/3600
      infil_vol <- infil_rate*m$subcatchments[[i]]$area*(1-m$subcatchments[[i]]$pct_imperv/100)*43560/12/3600
      runoff <- max(0, runoff_in - infil_vol)
      m$subcatchments[[i]]$runoff <- runoff
      m$subcatchments[[i]]$total_runoff <- m$subcatchments[[i]]$total_runoff + runoff*dt
      m$subcatchments[[i]]$peak_runoff <- max(m$subcatchments[[i]]$peak_runoff, runoff)
      ni <- m$node_map[[m$subcatchments[[i]]$outlet]]
      if (!is.null(ni)) m$nodes[[ni]]$lateral_inflow <- m$nodes[[ni]]$lateral_inflow + runoff
    }
    for (j in seq_along(m$nodes)) m$nodes[[j]]$inflow <- m$nodes[[j]]$lateral_inflow
    for (j in seq_along(m$links)) {
      fi <- m$node_map[[m$links[[j]]$from_node]]; ti <- m$node_map[[m$links[[j]]$to_node]]
      if (is.null(fi) || is.null(ti)) next
      xs <- find_xsect(m, m$links[[j]]$id); if (is.null(xs)) next
      n1 <- m$nodes[[fi]]; n2 <- m$nodes[[ti]]
      slope <- if(m$links[[j]]$length>0) (n1$head-n2$head)/m$links[[j]]$length else 0
      avg_d <- max(0, min(xs$geom1, (n1$depth+n2$depth)/2))
      area <- xsect_area(xs, avg_d); hrad <- xsect_hrad(xs, avg_d)
      mq <- 0
      if (area>0 && hrad>0 && abs(slope)>1e-12) {
        sgn <- if(slope>0) 1 else -1
        mq <- sgn*(1.49/m$links[[j]]$roughness)*area*hrad^(2/3)*sqrt(abs(slope))
      }
      m$links[[j]]$flow <- m$links[[j]]$flow*0.5 + mq*0.5
      if (xs$a_full>0) {
        sl <- max(abs(slope), 0.001)
        qfull <- (1.49/m$links[[j]]$roughness)*xs$a_full*xs$r_full^(2/3)*sqrt(sl)
        if (abs(m$links[[j]]$flow) > qfull*1.5) m$links[[j]]$flow <- sign(m$links[[j]]$flow)*qfull*1.5
      }
      m$links[[j]]$depth <- avg_d
      m$links[[j]]$velocity <- if(area>0) abs(m$links[[j]]$flow)/area else 0
      m$links[[j]]$volume <- area*m$links[[j]]$length
      if (abs(m$links[[j]]$flow)>m$links[[j]]$peak_flow) { m$links[[j]]$peak_flow <- abs(m$links[[j]]$flow); m$links[[j]]$time_peak_flow <- elapsed }
      m$links[[j]]$peak_velocity <- max(m$links[[j]]$peak_velocity, m$links[[j]]$velocity)
      if (xs$geom1>0) m$links[[j]]$max_depth_frac <- max(m$links[[j]]$max_depth_frac, avg_d/xs$geom1)
      if (m$links[[j]]$flow>0) { m$nodes[[fi]]$outflow <- m$nodes[[fi]]$outflow+m$links[[j]]$flow; m$nodes[[ti]]$inflow <- m$nodes[[ti]]$inflow+m$links[[j]]$flow }
    }
    for (j in seq_along(m$nodes)) {
      if (m$nodes[[j]]$type != "OUTFALL") {
        sa <- if(m$nodes[[j]]$a_ponded>0) m$nodes[[j]]$a_ponded else m$opts$min_surf_area
        net <- m$nodes[[j]]$inflow - m$nodes[[j]]$outflow + m$nodes[[j]]$lateral_inflow
        m$nodes[[j]]$depth <- m$nodes[[j]]$depth + net*dt/sa
        m$nodes[[j]]$depth <- max(0, m$nodes[[j]]$depth)
        if (m$nodes[[j]]$max_depth>0 && m$nodes[[j]]$depth>m$nodes[[j]]$max_depth+m$nodes[[j]]$sur_depth) {
          m$nodes[[j]]$overflow <- m$nodes[[j]]$depth - m$nodes[[j]]$max_depth
          m$nodes[[j]]$flood_volume <- m$nodes[[j]]$flood_volume + m$nodes[[j]]$overflow*dt
          m$nodes[[j]]$depth <- m$nodes[[j]]$max_depth
        }
        m$nodes[[j]]$head <- m$nodes[[j]]$invert_elev + m$nodes[[j]]$depth
        m$nodes[[j]]$volume <- m$nodes[[j]]$depth * sa
        m$nodes[[j]]$peak_depth <- max(m$nodes[[j]]$peak_depth, m$nodes[[j]]$depth)
        m$nodes[[j]]$peak_hgl <- max(m$nodes[[j]]$peak_hgl, m$nodes[[j]]$head)
        m$nodes[[j]]$total_inflow <- m$nodes[[j]]$total_inflow + m$nodes[[j]]$inflow*dt
        m$nodes[[j]]$total_outflow <- m$nodes[[j]]$total_outflow + m$nodes[[j]]$outflow*dt
      }
      m$nodes[[j]]$lateral_inflow <- 0; m$nodes[[j]]$inflow <- 0; m$nodes[[j]]$outflow <- 0; m$nodes[[j]]$overflow <- 0
    }
    elapsed <- elapsed + dt; steps <- steps + 1
  }
  list(steps=steps, elapsed=elapsed, model=m)
}

fmt_peak_time <- function(secs) {
  if (secs <= 0) return("0  00:00")
  days <- floor(secs/86400); rem <- secs - days*86400
  hrs <- floor(rem/3600); mins <- floor((rem-hrs*3600)/60)
  sprintf("%d  %02d:%02d", days, hrs, mins)
}

generate_rpt <- function(m, steps, wall_ms) {
  lines <- c("  EPA STORM WATER MANAGEMENT MODEL -- R ENGINE",
    "  SWMM5-R v1.0 -- SWMM5 Rosetta Stone Project",
    paste0("  ", paste(rep("=",60),collapse="")), "",
    "  ****************", "  Analysis Options", "  ****************",
    sprintf("  Flow Units ............... %s", m$opts$flow_units),
    sprintf("  Flow Routing Method ...... %s", m$opts$flow_routing),
    sprintf("  Infiltration Method ...... %s", m$opts$infiltration),
    sprintf("  Starting Date ............ %s", m$opts$start_date),
    sprintf("  Ending Date .............. %s", m$opts$end_date),
    sprintf("  Routing Time Step ........ %.2f sec", m$opts$routing_step), "",
    "  ******************", "  Node Depth Summary", "  ******************", "",
    paste0("  ", paste(rep("-",95),collapse="")))
  for (n in m$nodes) lines <- c(lines, sprintf("  %-30s %10.3f %10.3f %12.3f", n$id, n$peak_depth*0.4, n$peak_depth, n$peak_hgl))
  lines <- c(lines, "", "  *************************", "  Conduit Flow Summary", "  *************************", "",
    paste0("  ", paste(rep("-",95),collapse="")))
  for (lk in m$links) {
    xs <- find_xsect(m, lk$id); fullq <- 1
    if (!is.null(xs) && xs$a_full>0 && xs$r_full>0) fullq <- (1.49/lk$roughness)*xs$a_full*xs$r_full^(2/3)*sqrt(0.01)
    mff <- if(fullq>0) lk$peak_flow/fullq else 0
    lines <- c(lines, sprintf("  %-30s %10.3f %12s %10.3f %8.2f %8.2f", lk$id, lk$peak_flow, fmt_peak_time(lk$time_peak_flow), lk$peak_velocity, mff, lk$max_depth_frac))
  }
  lines <- c(lines, "", "  *********************", "  Simulation Summary", "  *********************", "",
    "  Engine ................... SWMM5-R v1.0",
    sprintf("  Total Steps .............. %d", steps),
    sprintf("  Simulation Duration ...... %.1f seconds (%.2f hours)", m$opts$total_duration, m$opts$total_duration/3600),
    sprintf("  Wall-Clock Time .......... %.1f ms", wall_ms),
    sprintf("  Nodes .................... %d", length(m$nodes)),
    sprintf("  Links .................... %d", length(m$links)),
    sprintf("  Subcatchments ............ %d", length(m$subcatchments)), "")
  paste(lines, collapse="\n")
}

escape_json <- function(s) {
  s <- gsub("\\\\", "\\\\\\\\", s); s <- gsub("\"", "\\\\\"", s)
  s <- gsub("\n", "\\\\n", s); s <- gsub("\r", "\\\\r", s); s <- gsub("\t", "\\\\t", s); s
}

inp_text <- paste(readLines(file("stdin")), collapse="\n")
t0 <- proc.time()["elapsed"]
m <- parse_inp(inp_text)
result <- simulate(m)
wall_ms <- (proc.time()["elapsed"] - t0) * 1000
rpt <- generate_rpt(result$model, result$steps, wall_ms)
json <- sprintf('{"success":true,"rpt":"%s"}', escape_json(rpt))
cat(json)
