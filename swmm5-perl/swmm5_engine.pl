#!/usr/bin/perl
use strict;
use warnings;
use IO::Socket::INET;
use POSIX qw(strftime);
use Time::HiRes qw(gettimeofday tv_interval);
use Encode qw(encode);

my $PORT = $ENV{PERL_ENGINE_PORT} || 3008;

my $PI = 3.14159265358979323846;

sub parse_time_str {
    my ($s) = @_;
    $s =~ s/^\s+|\s+$//g;
    if ($s =~ /^(\d+):(\d+):?([\d.]*)?$/) {
        return $1 * 3600 + $2 * 60 + ($3 || 0);
    }
    return $s + 0;
}

sub parse_duration {
    my ($start, $end) = @_;
    my ($sm, $sd, $sy) = split /\//, $start;
    my ($em, $ed, $ey) = split /\//, $end;
    return 86400 unless defined $sy && defined $ey;
    use POSIX qw(mktime);
    my $t1 = mktime(0, 0, 0, $sd, $sm - 1, $sy - 1900);
    my $t2 = mktime(0, 0, 0, $ed, $em - 1, $ey - 1900);
    my $diff = $t2 - $t1;
    return $diff > 0 ? $diff : 86400;
}

sub parse_inp {
    my ($text) = @_;
    my %model = (
        options => {
            flow_units => "CFS", infiltration => "HORTON", flow_routing => "DYNWAVE",
            start_date => "01/01/2024", end_date => "01/02/2024",
            report_step => 900, wet_step => 300, dry_step => 3600,
            routing_step => 30, total_duration => 86400, min_surf_area => 12.566,
        },
        gages => [], subcatchments => [], infil => [],
        nodes => [], links => [], xsects => [], timeseries => {},
        node_map => {}, title => "",
    );

    my $section = "";
    for my $line (split /\n/, $text) {
        $line =~ s/^\s+|\s+$//g;
        next if !$line || $line =~ /^;/;
        if ($line =~ /^\[(\w+)\]/) {
            $section = uc $1;
            next;
        }
        my @t = split /\s+/, $line;
        next unless @t;

        if ($section eq "TITLE") {
            $model{title} = $line;
        } elsif ($section eq "OPTIONS" && @t >= 2) {
            my $key = uc $t[0];
            my $val = $t[1];
            if ($key eq "FLOW_UNITS") { $model{options}{flow_units} = $val; }
            elsif ($key eq "INFILTRATION") { $model{options}{infiltration} = $val; }
            elsif ($key eq "FLOW_ROUTING") { $model{options}{flow_routing} = $val; }
            elsif ($key eq "START_DATE") { $model{options}{start_date} = $val; }
            elsif ($key eq "END_DATE") { $model{options}{end_date} = $val; }
            elsif ($key eq "REPORT_STEP") { $model{options}{report_step} = parse_time_str($val); }
            elsif ($key eq "WET_STEP") { $model{options}{wet_step} = parse_time_str($val); }
            elsif ($key eq "DRY_STEP") { $model{options}{dry_step} = parse_time_str($val); }
            elsif ($key eq "ROUTING_STEP") { $model{options}{routing_step} = parse_time_str($val); }
        } elsif ($section eq "RAINGAGES" && @t >= 6) {
            push @{$model{gages}}, {
                id => $t[0], format => $t[1], interval => parse_time_str($t[2]) / 60,
                scf => $t[3] + 0, source_type => $t[4], source_name => $t[5],
            };
        } elsif ($section eq "SUBCATCHMENTS" && @t >= 7) {
            push @{$model{subcatchments}}, {
                id => $t[0], rain_gage => $t[1], outlet => $t[2],
                area => $t[3] + 0, pct_imperv => $t[4] + 0,
                width => $t[5] + 0, slope => $t[6] + 0,
                runoff => 0, rainfall => 0, total_precip => 0, total_runoff => 0, total_infil => 0, peak_runoff => 0,
            };
            push @{$model{infil}}, {
                max_rate => 3, min_rate => 0.5, decay => 4, dry_time => 7, current_rate => 3, cumul_infil => 0,
            };
        } elsif ($section eq "INFILTRATION" && @t >= 4) {
            for my $i (0 .. $#{$model{subcatchments}}) {
                if ($model{subcatchments}[$i]{id} eq $t[0]) {
                    $model{infil}[$i]{max_rate} = $t[1] + 0;
                    $model{infil}[$i]{min_rate} = $t[2] + 0;
                    $model{infil}[$i]{decay} = $t[3] + 0;
                    $model{infil}[$i]{dry_time} = ($t[4] || 7) + 0;
                    $model{infil}[$i]{current_rate} = $model{infil}[$i]{max_rate};
                    last;
                }
            }
        } elsif ($section eq "JUNCTIONS" && @t >= 2) {
            my $n = {
                id => $t[0], type => "JUNCTION", invert_elev => $t[1] + 0,
                max_depth => ($t[2] || 0) + 0, init_depth => ($t[3] || 0) + 0,
                sur_depth => ($t[4] || 0) + 0, a_ponded => ($t[5] || 0) + 0,
                depth => ($t[3] || 0) + 0, head => ($t[1] + 0) + (($t[3] || 0) + 0),
                volume => 0, inflow => 0, outflow => 0, overflow => 0, lateral_inflow => 0,
                peak_depth => 0, peak_hgl => 0, time_peak_depth => 0,
                total_inflow => 0, total_outflow => 0, flood_volume => 0,
            };
            $model{node_map}{$n->{id}} = scalar @{$model{nodes}};
            push @{$model{nodes}}, $n;
        } elsif ($section eq "OUTFALLS" && @t >= 3) {
            my $n = {
                id => $t[0], type => "OUTFALL", invert_elev => $t[1] + 0,
                max_depth => 0, init_depth => 0, sur_depth => 0, a_ponded => 0,
                depth => 0, head => $t[1] + 0,
                volume => 0, inflow => 0, outflow => 0, overflow => 0, lateral_inflow => 0,
                peak_depth => 0, peak_hgl => 0, time_peak_depth => 0,
                total_inflow => 0, total_outflow => 0, flood_volume => 0,
            };
            $model{node_map}{$n->{id}} = scalar @{$model{nodes}};
            push @{$model{nodes}}, $n;
        } elsif ($section eq "CONDUITS" && @t >= 6) {
            push @{$model{links}}, {
                id => $t[0], from_node => $t[1], to_node => $t[2],
                length => $t[3] + 0, roughness => $t[4] + 0,
                in_offset => $t[5] + 0, out_offset => ($t[6] || 0) + 0,
                flow => 0, depth => 0, velocity => 0, volume => 0,
                peak_flow => 0, peak_velocity => 0, time_peak_flow => 0,
                max_depth_frac => 0, full_depth => 0, full_area => 0,
            };
        } elsif ($section eq "XSECTIONS" && @t >= 3) {
            my $tp = uc($t[1]);
            my ($g1, $g2);
            if ($tp eq "IRREGULAR") {
                $g1 = 1.0; $g2 = 0;
            } else {
                $g1 = $t[2] + 0; $g2 = ($t[3] || 0) + 0;
            }
            my $xs = {
                id => $t[0], type => $tp, geom1 => $g1, geom2 => $g2,
                a_full => 0, r_full => 0,
            };
            if ($xs->{type} eq "CIRCULAR") {
                $xs->{a_full} = $PI * ($xs->{geom1} / 2) ** 2;
                $xs->{r_full} = $xs->{geom1} / 4;
            } else {
                my $w = $xs->{geom2} > 0 ? $xs->{geom2} : $xs->{geom1};
                $xs->{a_full} = $xs->{geom1} * $w;
                my $p = 2 * $xs->{geom1} + 2 * $w;
                $xs->{r_full} = $p > 0 ? $xs->{a_full} / $p : 0;
            }
            for my $lk (@{$model{links}}) {
                if ($lk->{id} eq $xs->{id}) {
                    $lk->{full_depth} = $xs->{geom1};
                    $lk->{full_area} = $xs->{a_full};
                    last;
                }
            }
            push @{$model{xsects}}, $xs;
        } elsif ($section eq "TIMESERIES" && @t >= 3) {
            my $tsid = $t[0];
            $model{timeseries}{$tsid} ||= { id => $tsid, times => [], values => [] };
            for (my $k = 1; $k + 1 < @t; $k += 2) {
                my $tval = $t[$k];
                if ($tval =~ /^(\d+):(\d+)$/) {
                    $tval = $1 + $2 / 60.0;
                }
                push @{$model{timeseries}{$tsid}{times}}, $tval + 0;
                push @{$model{timeseries}{$tsid}{values}}, $t[$k + 1] + 0;
            }
        }
    }
    $model{options}{total_duration} = parse_duration($model{options}{start_date}, $model{options}{end_date});
    return \%model;
}

sub get_rainfall {
    my ($model, $gage_id, $elapsed) = @_;
    for my $g (@{$model->{gages}}) {
        if ($g->{id} eq $gage_id) {
            my $ts = $model->{timeseries}{$g->{source_name}};
            return 0 unless $ts && @{$ts->{times}};
            my $t_hr = $elapsed / 3600;
            for (my $i = $#{$ts->{times}}; $i >= 0; $i--) {
                return $ts->{values}[$i] if $t_hr >= $ts->{times}[$i];
            }
            return 0;
        }
    }
    return 0;
}

sub horton_infil {
    my ($inf, $rainfall, $dt) = @_;
    if ($rainfall <= 0) {
        my $rec = $inf->{dry_time} > 0 ? $dt / ($inf->{dry_time} * 86400) : 0;
        $inf->{current_rate} += ($inf->{max_rate} - $inf->{current_rate}) * $rec;
        return 0;
    }
    my $rate = $inf->{current_rate} < $rainfall ? $inf->{current_rate} : $rainfall;
    $inf->{current_rate} = $inf->{min_rate} + ($inf->{current_rate} - $inf->{min_rate}) * exp(-$inf->{decay} * $dt / 3600);
    $inf->{cumul_infil} += $rate * $dt / 3600;
    return $rate;
}

sub xsect_area {
    my ($xs, $depth) = @_;
    return 0 if !$xs || $depth <= 0;
    if ($xs->{type} eq "CIRCULAR") {
        return $xs->{a_full} if $depth >= $xs->{geom1};
        my $r = $xs->{geom1} / 2; my $y = $depth - $r;
        return 0 if abs($r) < 1e-10;
        my $arg = -$y / $r; $arg = 1 if $arg > 1; $arg = -1 if $arg < -1;
        my $theta = 2 * atan2(sqrt(1 - $arg * $arg), $arg);
        return $r * $r * ($theta - sin($theta)) / 2;
    }
    my $w = $xs->{geom2} > 0 ? $xs->{geom2} : $xs->{geom1};
    return $depth * $w;
}

sub xsect_hrad {
    my ($xs, $depth) = @_;
    my $area = xsect_area($xs, $depth);
    return 0 if $area <= 0;
    if ($xs->{type} eq "CIRCULAR") {
        my $r = $xs->{geom1} / 2; my $y = $depth - $r;
        return 0 if abs($r) < 1e-10;
        my $arg = -$y / $r; $arg = 1 if $arg > 1; $arg = -1 if $arg < -1;
        my $theta = 2 * atan2(sqrt(1 - $arg * $arg), $arg);
        my $perim = $r * $theta;
        return $perim > 0 ? $area / $perim : 0;
    }
    my $w = $xs->{geom2} > 0 ? $xs->{geom2} : $xs->{geom1};
    my $perim = $w + 2 * $depth;
    return $perim > 0 ? $area / $perim : 0;
}

sub find_xsect {
    my ($model, $link_id) = @_;
    for my $xs (@{$model->{xsects}}) {
        return $xs if $xs->{id} eq $link_id;
    }
    return undef;
}

sub simulate {
    my ($model) = @_;
    my $dt = $model->{options}{routing_step};
    my $total = $model->{options}{total_duration};
    my $elapsed = 0;
    my $steps = 0;

    while ($elapsed < $total) {
        for my $i (0 .. $#{$model->{subcatchments}}) {
            my $sc = $model->{subcatchments}[$i];
            my $rain = get_rainfall($model, $sc->{rain_gage}, $elapsed);
            $sc->{rainfall} = $rain;
            $sc->{total_precip} += $rain * $dt / 3600;
            my $infil_rate = horton_infil($model->{infil}[$i], $rain * (1 - $sc->{pct_imperv} / 100), $dt);
            $sc->{total_infil} += $infil_rate * $dt / 3600;
            my $runoff_in = $rain * $sc->{area} * 43560 / 12 / 3600;
            my $infil_vol = $infil_rate * $sc->{area} * (1 - $sc->{pct_imperv} / 100) * 43560 / 12 / 3600;
            $sc->{runoff} = $runoff_in - $infil_vol;
            $sc->{runoff} = 0 if $sc->{runoff} < 0;
            $sc->{total_runoff} += $sc->{runoff} * $dt;
            $sc->{peak_runoff} = $sc->{runoff} if $sc->{runoff} > $sc->{peak_runoff};
            my $ni = $model->{node_map}{$sc->{outlet}};
            $model->{nodes}[$ni]{lateral_inflow} += $sc->{runoff} if defined $ni;
        }

        for my $n (@{$model->{nodes}}) { $n->{inflow} = $n->{lateral_inflow}; }

        for my $lk (@{$model->{links}}) {
            my $fi = $model->{node_map}{$lk->{from_node}};
            my $ti = $model->{node_map}{$lk->{to_node}};
            next unless defined $fi && defined $ti;
            my $xs = find_xsect($model, $lk->{id});
            next unless $xs;
            my $n1 = $model->{nodes}[$fi]; my $n2 = $model->{nodes}[$ti];
            my $dh = $n1->{head} - $n2->{head};
            my $slope = $lk->{length} > 0 ? $dh / $lk->{length} : 0;
            my $avg_depth = ($n1->{depth} + $n2->{depth}) / 2;
            $avg_depth = 0 if $avg_depth < 0;
            $avg_depth = $xs->{geom1} if $avg_depth > $xs->{geom1};
            my $area = xsect_area($xs, $avg_depth);
            my $hrad = xsect_hrad($xs, $avg_depth);
            my $manning_q = 0;
            if ($area > 0 && $hrad > 0 && abs($slope) > 1e-12) {
                my $sign = $slope > 0 ? 1 : -1;
                $manning_q = $sign * (1.49 / $lk->{roughness}) * $area * ($hrad ** (2/3)) * sqrt(abs($slope));
            }
            $lk->{flow} = $lk->{flow} * 0.5 + $manning_q * 0.5;
            if ($xs->{a_full} > 0) {
                my $sl = abs($slope) > 0.001 ? abs($slope) : 0.001;
                my $q_full = (1.49 / $lk->{roughness}) * $xs->{a_full} * ($xs->{r_full} ** (2/3)) * sqrt($sl);
                $lk->{flow} = ($lk->{flow} > 0 ? 1 : -1) * $q_full * 1.5 if abs($lk->{flow}) > $q_full * 1.5;
            }
            my $fa = abs($lk->{flow});
            $lk->{depth} = $avg_depth;
            $lk->{velocity} = $area > 0 ? $fa / $area : 0;
            $lk->{volume} = $area * $lk->{length};
            if ($fa > $lk->{peak_flow}) { $lk->{peak_flow} = $fa; $lk->{time_peak_flow} = $elapsed; }
            $lk->{peak_velocity} = $lk->{velocity} if $lk->{velocity} > $lk->{peak_velocity};
            $lk->{max_depth_frac} = $avg_depth / $xs->{geom1} if $xs->{geom1} > 0 && $avg_depth / $xs->{geom1} > $lk->{max_depth_frac};
            if ($lk->{flow} > 0) { $n1->{outflow} += $lk->{flow}; $n2->{inflow} += $lk->{flow}; }
        }

        for my $n (@{$model->{nodes}}) {
            next if $n->{type} eq "OUTFALL";
            my $sa = $n->{a_ponded} > 0 ? $n->{a_ponded} : $model->{options}{min_surf_area};
            my $net = $n->{inflow} - $n->{outflow} + $n->{lateral_inflow};
            $n->{depth} += $net * $dt / $sa;
            $n->{depth} = 0 if $n->{depth} < 0;
            if ($n->{max_depth} > 0 && $n->{depth} > $n->{max_depth} + $n->{sur_depth}) {
                $n->{overflow} = $n->{depth} - $n->{max_depth};
                $n->{flood_volume} += $n->{overflow} * $dt;
                $n->{depth} = $n->{max_depth};
            }
            $n->{head} = $n->{invert_elev} + $n->{depth};
            $n->{volume} = $n->{depth} * $sa;
            $n->{peak_depth} = $n->{depth} if $n->{depth} > $n->{peak_depth};
            $n->{peak_hgl} = $n->{head} if $n->{head} > $n->{peak_hgl};
            $n->{total_inflow} += $n->{inflow} * $dt;
            $n->{total_outflow} += $n->{outflow} * $dt;
            $n->{lateral_inflow} = 0; $n->{inflow} = 0; $n->{outflow} = 0; $n->{overflow} = 0;
        }
        $elapsed += $dt;
        $steps++;
    }
    return ($steps, $elapsed);
}

sub fmt_peak_time {
    my ($secs) = @_;
    return "0  00:00" if $secs <= 0;
    my $days = int($secs / 86400);
    my $rem = $secs - $days * 86400;
    my $hrs = int($rem / 3600);
    my $mins = int(($rem - $hrs * 3600) / 60);
    return sprintf("%d  %02d:%02d", $days, $hrs, $mins);
}

sub generate_rpt {
    my ($model, $steps, $wall_ms) = @_;
    my @lines;
    push @lines, "  EPA STORM WATER MANAGEMENT MODEL -- PERL ENGINE";
    push @lines, "  SWMM5-Perl v1.0 -- SWMM5 Rosetta Stone Project";
    push @lines, "  " . ("=" x 60);
    push @lines, "";
    push @lines, "  ****************";
    push @lines, "  Analysis Options";
    push @lines, "  ****************";
    push @lines, sprintf("  Flow Units ............... %s", $model->{options}{flow_units});
    push @lines, sprintf("  Flow Routing Method ...... %s", $model->{options}{flow_routing});
    push @lines, sprintf("  Infiltration Method ...... %s", $model->{options}{infiltration});
    push @lines, sprintf("  Starting Date ............ %s", $model->{options}{start_date});
    push @lines, sprintf("  Ending Date .............. %s", $model->{options}{end_date});
    push @lines, sprintf("  Routing Time Step ........ %.2f sec", $model->{options}{routing_step});
    push @lines, "";
    push @lines, "  ******************";
    push @lines, "  Node Depth Summary";
    push @lines, "  ******************";
    push @lines, "";
    push @lines, "  " . ("-" x 95);
    for my $n (@{$model->{nodes}}) {
        push @lines, sprintf("  %-30s %10.3f %10.3f %12.3f", $n->{id}, $n->{peak_depth} * 0.4, $n->{peak_depth}, $n->{peak_hgl});
    }
    push @lines, "";
    push @lines, "  *************************";
    push @lines, "  Conduit Flow Summary";
    push @lines, "  *************************";
    push @lines, "";
    push @lines, "  " . ("-" x 95);
    for my $lk (@{$model->{links}}) {
        my $xs = find_xsect($model, $lk->{id});
        my $full_q = 1;
        if ($xs && $xs->{a_full} > 0 && $xs->{r_full} > 0) {
            $full_q = (1.49 / $lk->{roughness}) * $xs->{a_full} * ($xs->{r_full} ** (2/3)) * sqrt(0.01);
        }
        my $mff = $full_q > 0 ? $lk->{peak_flow} / $full_q : 0;
        push @lines, sprintf("  %-30s %10.3f %12s %10.3f %8.2f %8.2f",
            $lk->{id}, $lk->{peak_flow}, fmt_peak_time($lk->{time_peak_flow}),
            $lk->{peak_velocity}, $mff, $lk->{max_depth_frac});
    }
    push @lines, "";
    push @lines, "  *********************";
    push @lines, "  Simulation Summary";
    push @lines, "  *********************";
    push @lines, "";
    push @lines, "  Engine ................... SWMM5-Perl v1.0";
    push @lines, sprintf("  Total Steps .............. %d", $steps);
    push @lines, sprintf("  Simulation Duration ...... %.1f seconds (%.2f hours)", $model->{options}{total_duration}, $model->{options}{total_duration} / 3600);
    push @lines, sprintf("  Wall-Clock Time .......... %.1f ms", $wall_ms);
    push @lines, sprintf("  Nodes .................... %d", scalar @{$model->{nodes}});
    push @lines, sprintf("  Links .................... %d", scalar @{$model->{links}});
    push @lines, sprintf("  Subcatchments ............ %d", scalar @{$model->{subcatchments}});
    push @lines, "";
    return join("\n", @lines);
}

sub escape_json {
    my ($s) = @_;
    $s =~ s/\\/\\\\/g;
    $s =~ s/"/\\"/g;
    $s =~ s/\n/\\n/g;
    $s =~ s/\r/\\r/g;
    $s =~ s/\t/\\t/g;
    return $s;
}

my $server = IO::Socket::INET->new(
    LocalAddr => '127.0.0.1',
    LocalPort => $PORT,
    Proto     => 'tcp',
    Listen    => 16,
    ReuseAddr => 1,
) or die "Cannot start server: $!\n";

print "SWMM5-Perl engine listening on port $PORT\n";
$| = 1;

while (my $client = $server->accept()) {
    my $buf = '';
    my $header_end = -1;

    while (my $bytes = sysread($client, my $chunk, 65536)) {
        $buf .= $chunk;
        if ($buf =~ /\r\n\r\n/) {
            $header_end = $+[0];
            if ($buf =~ /Content-Length:\s*(\d+)/i) {
                my $clen = $1;
                my $body_read = length($buf) - $header_end;
                while ($body_read < $clen) {
                    last unless sysread($client, $chunk, 65536);
                    $buf .= $chunk;
                    $body_read = length($buf) - $header_end;
                }
            }
            last;
        }
    }

    if ($buf =~ /^GET \/health/) {
        my $json = '{"engine":"SWMM5-Perl","status":"ok","version":"v1.0","language":"Perl"}';
        my $resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " . length($json) . "\r\n\r\n" . $json;
        print $client $resp;
    } elsif ($buf =~ /^POST \/simulate/) {
        my $body = substr($buf, $header_end);
        my $t0 = [gettimeofday()];
        my $model = parse_inp($body);
        my ($steps, $elapsed) = simulate($model);
        my $wall_ms = tv_interval($t0) * 1000;
        my $rpt = generate_rpt($model, $steps, $wall_ms);
        my $json = '{"success":true,"rpt":"' . escape_json($rpt) . '"}';
        my $resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: " . length($json) . "\r\n\r\n" . $json;
        print $client $resp;
    } else {
        print $client "HTTP/1.1 404 Not Found\r\n\r\n";
    }
    close $client;
}
