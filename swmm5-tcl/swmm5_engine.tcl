#!/usr/bin/env tclsh

set PI 3.14159265358979323846

proc parseTimeStr {s} {
    set s [string trim $s]
    if {[regexp {^(\d+):(\d+):?([\d.]*)?$} $s _ h m sec]} {
        if {$sec eq ""} {set sec 0}
        return [expr {$h * 3600 + $m * 60 + $sec}]
    }
    if {[string is double $s]} {return [expr {double($s)}]}
    return 0.0
}

proc parseDuration {start end} {
    set sp [split $start "/"]; set ep [split $end "/"]
    if {[llength $sp] < 3 || [llength $ep] < 3} {return 86400.0}
    set t1 [clock scan "[lindex $sp 0]/[lindex $sp 1]/[lindex $sp 2]" -format "%m/%d/%Y"]
    set t2 [clock scan "[lindex $ep 0]/[lindex $ep 1]/[lindex $ep 2]" -format "%m/%d/%Y"]
    set diff [expr {$t2 - $t1}]
    return [expr {$diff > 0 ? double($diff) : 86400.0}]
}

proc safeDouble {s {default 0.0}} {
    if {$s eq "" || ![string is double $s]} {return $default}
    return [expr {double($s)}]
}

proc parseInp {text modelVar} {
    upvar $modelVar M
    set M(opts,flow_units) CFS; set M(opts,infiltration) HORTON; set M(opts,flow_routing) DYNWAVE
    set M(opts,start_date) "01/01/2024"; set M(opts,end_date) "01/02/2024"
    set M(opts,report_step) 900; set M(opts,wet_step) 300; set M(opts,dry_step) 3600
    set M(opts,routing_step) 30; set M(opts,total_duration) 86400; set M(opts,min_surf_area) 12.566
    set M(gages) {}; set M(subcatchments) {}; set M(infil) {}
    set M(nodes) {}; set M(links) {}; set M(xsects) {}; set M(title) ""
    array set nodeMap {}; array set tsData {}
    set section ""
    foreach line [split $text "\n"] {
        set l [string trim $line]
        if {$l eq "" || [string index $l 0] eq ";"} continue
        if {[regexp {^\[(\w+)\]} $l _ sec]} {set section [string toupper $sec]; continue}
        set t [regexp -all -inline {\S+} $l]
        if {[llength $t] == 0} continue
        switch $section {
            TITLE {set M(title) $l}
            OPTIONS {
                if {[llength $t] >= 2} {
                    set k [string toupper [lindex $t 0]]; set v [lindex $t 1]
                    switch $k {
                        FLOW_UNITS {set M(opts,flow_units) $v}
                        INFILTRATION {set M(opts,infiltration) $v}
                        FLOW_ROUTING {set M(opts,flow_routing) $v}
                        START_DATE {set M(opts,start_date) $v}
                        END_DATE {set M(opts,end_date) $v}
                        REPORT_STEP {set M(opts,report_step) [parseTimeStr $v]}
                        WET_STEP {set M(opts,wet_step) [parseTimeStr $v]}
                        DRY_STEP {set M(opts,dry_step) [parseTimeStr $v]}
                        ROUTING_STEP {set M(opts,routing_step) [parseTimeStr $v]}
                    }
                }
            }
            RAINGAGES {
                if {[llength $t] >= 6} {
                    lappend M(gages) [list [lindex $t 0] [lindex $t 1] [expr {[parseTimeStr [lindex $t 2]] / 60.0}] [safeDouble [lindex $t 3]] [lindex $t 4] [lindex $t 5]]
                }
            }
            SUBCATCHMENTS {
                if {[llength $t] >= 7} {
                    lappend M(subcatchments) [list [lindex $t 0] [lindex $t 1] [lindex $t 2] [safeDouble [lindex $t 3]] [safeDouble [lindex $t 4]] [safeDouble [lindex $t 5]] [safeDouble [lindex $t 6]] 0 0 0 0 0 0]
                    lappend M(infil) [list 3.0 0.5 4.0 7.0 3.0 0.0]
                }
            }
            INFILTRATION {
                if {[llength $t] >= 4} {
                    set idx 0
                    foreach sc $M(subcatchments) {
                        if {[lindex $sc 0] eq [lindex $t 0]} {
                            set dt_val [expr {[llength $t] > 4 ? [safeDouble [lindex $t 4] 7.0] : 7.0}]
                            lset M(infil) $idx [list [safeDouble [lindex $t 1]] [safeDouble [lindex $t 2]] [safeDouble [lindex $t 3]] $dt_val [safeDouble [lindex $t 1]] 0.0]
                            break
                        }
                        incr idx
                    }
                }
            }
            JUNCTIONS {
                if {[llength $t] >= 2} {
                    set initD [expr {[llength $t] > 3 ? [safeDouble [lindex $t 3]] : 0.0}]
                    set n [list [lindex $t 0] JUNCTION [safeDouble [lindex $t 1]] [expr {[llength $t] > 2 ? [safeDouble [lindex $t 2]] : 0.0}] $initD [expr {[llength $t] > 4 ? [safeDouble [lindex $t 4]] : 0.0}] [expr {[llength $t] > 5 ? [safeDouble [lindex $t 5]] : 0.0}] $initD [expr {[safeDouble [lindex $t 1]] + $initD}] 0 0 0 0 0 0 0 0 0 0 0]
                    set nodeMap([lindex $n 0]) [llength $M(nodes)]
                    lappend M(nodes) $n
                }
            }
            OUTFALLS {
                if {[llength $t] >= 3} {
                    set elev [safeDouble [lindex $t 1]]
                    set n [list [lindex $t 0] OUTFALL $elev 0 0 0 0 0 $elev 0 0 0 0 0 0 0 0 0 0 0]
                    set nodeMap([lindex $n 0]) [llength $M(nodes)]
                    lappend M(nodes) $n
                }
            }
            CONDUITS {
                if {[llength $t] >= 6} {
                    lappend M(links) [list [lindex $t 0] [lindex $t 1] [lindex $t 2] [safeDouble [lindex $t 3]] [safeDouble [lindex $t 4]] [safeDouble [lindex $t 5]] [expr {[llength $t] > 6 ? [safeDouble [lindex $t 6]] : 0.0}] 0 0 0 0 0 0 0 0 0 0]
                }
            }
            XSECTIONS {
                if {[llength $t] >= 3} {
                    set g1 [safeDouble [lindex $t 2] 1.0]
                    set g2 [expr {[llength $t] > 3 ? [safeDouble [lindex $t 3]] : 0.0}]
                    set tp [string toupper [lindex $t 1]]
                    if {$tp eq "CIRCULAR"} {
                        set af [expr {$::PI * pow($g1 / 2.0, 2)}]; set rf [expr {$g1 / 4.0}]
                    } else {
                        set w [expr {$g2 > 0 ? $g2 : $g1}]; set af [expr {$g1 * $w}]
                        set p [expr {2.0 * $g1 + 2.0 * $w}]; set rf [expr {$p > 0 ? $af / $p : 0.0}]
                    }
                    set lidx 0
                    foreach lk $M(links) {
                        if {[lindex $lk 0] eq [lindex $t 0]} {
                            lset M(links) $lidx 15 $g1; lset M(links) $lidx 16 $af; break
                        }
                        incr lidx
                    }
                    lappend M(xsects) [list [lindex $t 0] $tp $g1 $g2 $af $rf]
                }
            }
            TIMESERIES {
                if {[llength $t] >= 3} {
                    set tsid [lindex $t 0]
                    if {![info exists tsData($tsid,times)]} {set tsData($tsid,times) {}; set tsData($tsid,values) {}}
                    set k 1
                    while {$k + 1 < [llength $t]} {
                        set tval [lindex $t $k]
                        if {[regexp {^(\d+):(\d+)$} $tval _ h m]} {set tval [expr {double($h) + double($m) / 60.0}]}
                        lappend tsData($tsid,times) [safeDouble $tval]
                        lappend tsData($tsid,values) [safeDouble [lindex $t [expr {$k + 1}]]]
                        incr k 2
                    }
                }
            }
        }
    }
    set M(opts,total_duration) [parseDuration $M(opts,start_date) $M(opts,end_date)]
    array set M [array get nodeMap]
    array set M [array get tsData]
}

proc getRainfall {modelVar gageId elapsed} {
    upvar $modelVar M
    foreach g $M(gages) {
        if {[lindex $g 0] eq $gageId} {
            set sn [lindex $g 5]
            if {![info exists M($sn,times)]} {return 0.0}
            set tHr [expr {$elapsed / 3600.0}]
            set times $M($sn,times); set vals $M($sn,values)
            for {set i [expr {[llength $times] - 1}]} {$i >= 0} {incr i -1} {
                if {$tHr >= [lindex $times $i]} {return [lindex $vals $i]}
            }
            return 0.0
        }
    }
    return 0.0
}

proc hortonInfil {infilVar rainfall dt} {
    upvar $infilVar inf
    set maxR [lindex $inf 0]; set minR [lindex $inf 1]; set decay [lindex $inf 2]
    set dryT [lindex $inf 3]; set curR [lindex $inf 4]; set cumI [lindex $inf 5]
    if {$rainfall <= 0} {
        set rec [expr {$dryT > 0 ? $dt / ($dryT * 86400.0) : 0.0}]
        set curR [expr {$curR + ($maxR - $curR) * $rec}]
        set inf [list $maxR $minR $decay $dryT $curR $cumI]; return 0.0
    }
    set rate [expr {$curR < $rainfall ? $curR : $rainfall}]
    set curR [expr {$minR + ($curR - $minR) * exp(-$decay * $dt / 3600.0)}]
    set cumI [expr {$cumI + $rate * $dt / 3600.0}]
    set inf [list $maxR $minR $decay $dryT $curR $cumI]; return $rate
}

proc xsectArea {xs depth} {
    if {$depth <= 0} {return 0.0}
    set tp [lindex $xs 1]; set g1 [lindex $xs 2]; set g2 [lindex $xs 3]; set af [lindex $xs 4]
    if {$tp eq "CIRCULAR"} {
        if {$depth >= $g1} {return $af}
        set r [expr {$g1 / 2.0}]; set y [expr {$depth - $r}]
        if {abs($r) < 1e-10} {return 0.0}
        set arg [expr {-$y / $r}]; if {$arg > 1} {set arg 1}; if {$arg < -1} {set arg -1}
        set theta [expr {2.0 * acos($arg)}]; return [expr {$r * $r * ($theta - sin($theta)) / 2.0}]
    }
    set w [expr {$g2 > 0 ? $g2 : $g1}]; return [expr {$depth * $w}]
}

proc xsectHrad {xs depth} {
    set area [xsectArea $xs $depth]; if {$area <= 0} {return 0.0}
    set tp [lindex $xs 1]; set g1 [lindex $xs 2]; set g2 [lindex $xs 3]
    if {$tp eq "CIRCULAR"} {
        set r [expr {$g1 / 2.0}]; set y [expr {$depth - $r}]
        if {abs($r) < 1e-10} {return 0.0}
        set arg [expr {-$y / $r}]; if {$arg > 1} {set arg 1}; if {$arg < -1} {set arg -1}
        set theta [expr {2.0 * acos($arg)}]; set perim [expr {$r * $theta}]
        return [expr {$perim > 0 ? $area / $perim : 0.0}]
    }
    set w [expr {$g2 > 0 ? $g2 : $g1}]; set perim [expr {$w + 2.0 * $depth}]
    return [expr {$perim > 0 ? $area / $perim : 0.0}]
}

proc findXsect {modelVar linkId} {
    upvar $modelVar M
    foreach xs $M(xsects) {if {[lindex $xs 0] eq $linkId} {return $xs}}
    return {}
}

proc simulate {modelVar} {
    upvar $modelVar M
    set dt $M(opts,routing_step); set total $M(opts,total_duration)
    set elapsed 0.0; set steps 0
    while {$elapsed < $total} {
        set idx 0
        foreach sc $M(subcatchments) {
            set rain [getRainfall M [lindex $sc 1] $elapsed]
            lset M(subcatchments) $idx 7 $rain
            lset M(subcatchments) $idx 9 [expr {[lindex $sc 9] + $rain * $dt / 3600.0}]
            set inf [lindex $M(infil) $idx]
            set infilRate [hortonInfil inf [expr {$rain * (1.0 - [lindex $sc 4] / 100.0)}] $dt]
            lset M(infil) $idx $inf
            lset M(subcatchments) $idx 11 [expr {[lindex $sc 11] + $infilRate * $dt / 3600.0}]
            set area_ac [lindex $sc 3]
            set runoffIn [expr {$rain * $area_ac * 43560.0 / 12.0 / 3600.0}]
            set infilVol [expr {$infilRate * $area_ac * (1.0 - [lindex $sc 4] / 100.0) * 43560.0 / 12.0 / 3600.0}]
            set runoff [expr {max(0.0, $runoffIn - $infilVol)}]
            lset M(subcatchments) $idx 7 $runoff
            lset M(subcatchments) $idx 10 [expr {[lindex $sc 10] + $runoff * $dt}]
            if {$runoff > [lindex $sc 12]} {lset M(subcatchments) $idx 12 $runoff}
            set outlet [lindex $sc 2]
            if {[info exists M($outlet)]} {
                set ni $M($outlet)
                set n [lindex $M(nodes) $ni]
                lset M(nodes) $ni 13 [expr {[lindex $n 13] + $runoff}]
            }
            incr idx
        }
        set nidx 0
        foreach n $M(nodes) {lset M(nodes) $nidx 10 [lindex $n 13]; incr nidx}
        set lidx 0
        foreach lk $M(links) {
            set fn [lindex $lk 1]; set tn [lindex $lk 2]
            if {![info exists M($fn)] || ![info exists M($tn)]} {incr lidx; continue}
            set fi $M($fn); set ti $M($tn)
            set xs [findXsect M [lindex $lk 0]]
            if {$xs eq {}} {incr lidx; continue}
            set n1 [lindex $M(nodes) $fi]; set n2 [lindex $M(nodes) $ti]
            set head1 [lindex $n1 8]; set head2 [lindex $n2 8]
            set len [lindex $lk 3]; set rough [lindex $lk 4]
            set slope [expr {$len > 0 ? ($head1 - $head2) / $len : 0.0}]
            set d1 [lindex $n1 7]; set d2 [lindex $n2 7]; set g1 [lindex $xs 2]
            set avgD [expr {($d1 + $d2) / 2.0}]
            if {$avgD < 0} {set avgD 0.0}; if {$avgD > $g1} {set avgD $g1}
            set area [xsectArea $xs $avgD]; set hrad [xsectHrad $xs $avgD]
            set manQ 0.0
            if {$area > 0 && $hrad > 0 && abs($slope) > 1e-12} {
                set sign [expr {$slope > 0 ? 1.0 : -1.0}]
                set manQ [expr {$sign * (1.49 / $rough) * $area * pow($hrad, 2.0/3.0) * sqrt(abs($slope))}]
            }
            set oldFlow [lindex $lk 7]
            set flow [expr {$oldFlow * 0.5 + $manQ * 0.5}]
            set aFull [lindex $xs 4]; set rFull [lindex $xs 5]
            if {$aFull > 0} {
                set sl [expr {abs($slope) > 0.001 ? abs($slope) : 0.001}]
                set qFull [expr {(1.49 / $rough) * $aFull * pow($rFull, 2.0/3.0) * sqrt($sl)}]
                if {abs($flow) > $qFull * 1.5} {set flow [expr {($flow > 0 ? 1.0 : -1.0) * $qFull * 1.5}]}
            }
            lset M(links) $lidx 7 $flow
            lset M(links) $lidx 8 $avgD
            set vel [expr {$area > 0 ? abs($flow) / $area : 0.0}]
            lset M(links) $lidx 9 $vel
            lset M(links) $lidx 10 [expr {$area * $len}]
            if {abs($flow) > [lindex $lk 11]} {
                lset M(links) $lidx 11 [expr {abs($flow)}]
                lset M(links) $lidx 13 $elapsed
            }
            if {$vel > [lindex $lk 12]} {lset M(links) $lidx 12 $vel}
            if {$g1 > 0 && $avgD / $g1 > [lindex $lk 14]} {lset M(links) $lidx 14 [expr {$avgD / $g1}]}
            if {$flow > 0} {
                lset M(nodes) $fi 11 [expr {[lindex [lindex $M(nodes) $fi] 11] + $flow}]
                lset M(nodes) $ti 10 [expr {[lindex [lindex $M(nodes) $ti] 10] + $flow}]
            }
            incr lidx
        }
        set nidx 0
        foreach n $M(nodes) {
            if {[lindex $n 1] ne "OUTFALL"} {
                set ap [lindex $n 6]; set sa [expr {$ap > 0 ? $ap : $M(opts,min_surf_area)}]
                set net [expr {[lindex $n 10] - [lindex $n 11] + [lindex $n 13]}]
                set depth [expr {[lindex $n 7] + $net * $dt / $sa}]
                if {$depth < 0} {set depth 0.0}
                set maxD [lindex $n 3]; set surD [lindex $n 5]
                if {$maxD > 0 && $depth > $maxD + $surD} {
                    set ov [expr {$depth - $maxD}]
                    lset M(nodes) $nidx 19 [expr {[lindex $n 19] + $ov * $dt}]
                    set depth $maxD
                }
                lset M(nodes) $nidx 7 $depth
                set ie [lindex $n 2]
                lset M(nodes) $nidx 8 [expr {$ie + $depth}]
                lset M(nodes) $nidx 9 [expr {$depth * $sa}]
                if {$depth > [lindex $n 14]} {lset M(nodes) $nidx 14 $depth}
                set head [expr {$ie + $depth}]
                if {$head > [lindex $n 15]} {lset M(nodes) $nidx 15 $head}
                lset M(nodes) $nidx 17 [expr {[lindex $n 17] + [lindex $n 10] * $dt}]
                lset M(nodes) $nidx 18 [expr {[lindex $n 18] + [lindex $n 11] * $dt}]
            }
            lset M(nodes) $nidx 13 0; lset M(nodes) $nidx 10 0; lset M(nodes) $nidx 11 0; lset M(nodes) $nidx 12 0
            incr nidx
        }
        set elapsed [expr {$elapsed + $dt}]; incr steps
    }
    return [list $steps $elapsed]
}

proc fmtPeakTime {secs} {
    if {$secs <= 0} {return "0  00:00"}
    set days [expr {int($secs / 86400)}]; set rem [expr {$secs - $days * 86400}]
    set hrs [expr {int($rem / 3600)}]; set mins [expr {int(($rem - $hrs * 3600) / 60)}]
    return [format "%d  %02d:%02d" $days $hrs $mins]
}

proc generateRpt {modelVar steps wallMs} {
    upvar $modelVar M
    set lines {}
    lappend lines "  EPA STORM WATER MANAGEMENT MODEL -- TCL ENGINE"
    lappend lines "  SWMM5-Tcl v1.0 -- SWMM5 Rosetta Stone Project"
    lappend lines "  [string repeat = 60]"
    lappend lines ""
    lappend lines "  ****************" "  Analysis Options" "  ****************"
    lappend lines [format "  Flow Units ............... %s" $M(opts,flow_units)]
    lappend lines [format "  Flow Routing Method ...... %s" $M(opts,flow_routing)]
    lappend lines [format "  Infiltration Method ...... %s" $M(opts,infiltration)]
    lappend lines [format "  Starting Date ............ %s" $M(opts,start_date)]
    lappend lines [format "  Ending Date .............. %s" $M(opts,end_date)]
    lappend lines [format "  Routing Time Step ........ %.2f sec" $M(opts,routing_step)]
    lappend lines "" "  ******************" "  Node Depth Summary" "  ******************" ""
    lappend lines "  [string repeat - 95]"
    foreach n $M(nodes) {
        lappend lines [format "  %-30s %10.3f %10.3f %12.3f" [lindex $n 0] [expr {[lindex $n 14] * 0.4}] [lindex $n 14] [lindex $n 15]]
    }
    lappend lines "" "  *************************" "  Conduit Flow Summary" "  *************************" ""
    lappend lines "  [string repeat - 95]"
    foreach lk $M(links) {
        set xs [findXsect M [lindex $lk 0]]
        set fullQ 1.0
        if {$xs ne {}} {
            set af [lindex $xs 4]; set rf [lindex $xs 5]; set rough [lindex $lk 4]
            if {$af > 0 && $rf > 0} {set fullQ [expr {(1.49 / $rough) * $af * pow($rf, 2.0/3.0) * sqrt(0.01)}]}
        }
        set mff [expr {$fullQ > 0 ? [lindex $lk 11] / $fullQ : 0.0}]
        lappend lines [format "  %-30s %10.3f %12s %10.3f %8.2f %8.2f" [lindex $lk 0] [lindex $lk 11] [fmtPeakTime [lindex $lk 13]] [lindex $lk 12] $mff [lindex $lk 14]]
    }
    lappend lines "" "  *********************" "  Simulation Summary" "  *********************" ""
    lappend lines "  Engine ................... SWMM5-Tcl v1.0"
    lappend lines [format "  Total Steps .............. %d" $steps]
    lappend lines [format "  Simulation Duration ...... %.1f seconds (%.2f hours)" $M(opts,total_duration) [expr {$M(opts,total_duration) / 3600.0}]]
    lappend lines [format "  Wall-Clock Time .......... %.1f ms" $wallMs]
    lappend lines [format "  Nodes .................... %d" [llength $M(nodes)]]
    lappend lines [format "  Links .................... %d" [llength $M(links)]]
    lappend lines [format "  Subcatchments ............ %d" [llength $M(subcatchments)]]
    lappend lines ""
    return [join $lines "\n"]
}

proc escapeJson {s} {
    set s [string map {\\ \\\\ \" \\\" \n \\n \r \\r \t \\t} $s]
    return $s
}

set PORT [expr {[info exists ::env(TCL_ENGINE_PORT)] ? $::env(TCL_ENGINE_PORT) : 3017}]
set server [socket -server acceptConn $PORT]
puts "SWMM5-Tcl engine listening on port $PORT"

proc acceptConn {sock addr port} {
    fconfigure $sock -translation binary -buffering full -blocking 0
    fileevent $sock readable [list handleRequest $sock ""]
}

proc handleRequest {sock buf} {
    if {[eof $sock]} {close $sock; return}
    append buf [read $sock]
    if {$buf eq ""} return
    set headerEnd [string first "\r\n\r\n" $buf]
    if {$headerEnd < 0} {
        fileevent $sock readable [list handleRequest $sock $buf]
        return
    }
    set clIdx [string first "Content-Length: " $buf]
    if {$clIdx >= 0} {
        set clStart [expr {$clIdx + 16}]
        set clEnd [string first "\r\n" $buf $clStart]
        set cl [string trim [string range $buf $clStart [expr {$clEnd - 1}]]]
        set bodyStart [expr {$headerEnd + 4}]
        if {[string length $buf] - $bodyStart < $cl} {
            fileevent $sock readable [list handleRequest $sock $buf]
            return
        }
    }
    set data $buf
    if {[string match "GET /health*" $data]} {
        set json {{"engine":"SWMM5-Tcl","status":"ok","version":"v1.0","language":"Tcl"}}
        set resp "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: [string length $json]\r\n\r\n$json"
        puts -nonewline $sock $resp; flush $sock
    } elseif {[string match "POST /simulate*" $data]} {
        set headerEnd [string first "\r\n\r\n" $data]
        if {$headerEnd >= 0} {
            set body [string range $data [expr {$headerEnd + 4}] end]
            set t0 [clock microseconds]
            parseInp $body M
            set result [simulate M]
            set wallMs [expr {([clock microseconds] - $t0) / 1000.0}]
            set rpt [generateRpt M [lindex $result 0] $wallMs]
            set json "{\"success\":true,\"rpt\":\"[escapeJson $rpt]\"}"
            set resp "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: [string length $json]\r\n\r\n$json"
            puts -nonewline $sock $resp; flush $sock
        }
    } else {
        puts -nonewline $sock "HTTP/1.1 404 Not Found\r\n\r\n"; flush $sock
    }
    close $sock
}

vwait forever
