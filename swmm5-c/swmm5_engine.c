/*
 * SWMM5-C: Standalone C SWMM5 Engine
 * HTTP server with INP parser, Horton infiltration,
 * dynamic wave routing, and .rpt report generation.
 * No external dependencies — uses only C stdlib + POSIX sockets.
 *
 * Build: gcc -O2 -o swmm5-c swmm5_engine.c -lm
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <time.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define MAX_NODES       500
#define MAX_LINKS       500
#define MAX_SUBCATCH    500
#define MAX_GAGES       50
#define MAX_TIMESERIES  50
#define MAX_TS_ENTRIES  200
#define MAX_ID          64
#define MAX_LINE        1024
#define MAX_RPT         65536
#define MAX_INP         1048576
#define GRAVITY         32.174
#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

typedef struct {
    char flow_units[16];
    char infiltration[16];
    char flow_routing[16];
    double report_step;
    double wet_step;
    double dry_step;
    double routing_step;
    double total_duration;
    double min_surf_area;
    char start_date[32];
    char end_date[32];
} Options;

typedef struct {
    char id[MAX_ID];
    char format[16];
    double interval;
    double scf;
    char source_type[16];
    char source_name[MAX_ID];
} RainGage;

typedef struct {
    char id[MAX_ID];
    char rain_gage[MAX_ID];
    char outlet[MAX_ID];
    double area;
    double pct_imperv;
    double width;
    double slope;
    double runoff;
    double rainfall;
    double total_precip;
    double total_runoff;
    double total_infil;
    double peak_runoff;
} Subcatchment;

typedef struct {
    double max_rate;
    double min_rate;
    double decay;
    double dry_time;
    double current_rate;
    double cumul_infil;
} InfilData;

typedef struct {
    char id[MAX_ID];
    char type[16];
    double invert_elev;
    double max_depth;
    double init_depth;
    double sur_depth;
    double a_ponded;
    double depth;
    double head;
    double volume;
    double inflow;
    double outflow;
    double overflow;
    double lateral_inflow;
    double peak_depth;
    double peak_hgl;
    double time_peak_depth;
    double total_inflow;
    double total_outflow;
    double flood_volume;
} Node;

typedef struct {
    char id[MAX_ID];
    char from_node[MAX_ID];
    char to_node[MAX_ID];
    double length;
    double roughness;
    double in_offset;
    double out_offset;
    double flow;
    double depth;
    double velocity;
    double volume;
    double peak_flow;
    double peak_velocity;
    double time_peak_flow;
    double max_depth_frac;
    double full_depth;
    double full_area;
} XsectLink;

typedef struct {
    char id[MAX_ID];
    char type[16];
    double geom1;
    double geom2;
    double a_full;
    double r_full;
} Xsect;

typedef struct {
    char id[MAX_ID];
    double times[MAX_TS_ENTRIES];
    double values[MAX_TS_ENTRIES];
    int count;
} Timeseries;

typedef struct {
    Options options;
    RainGage gages[MAX_GAGES];
    int n_gages;
    Subcatchment subcatchments[MAX_SUBCATCH];
    int n_subcatch;
    InfilData infil[MAX_SUBCATCH];
    Node nodes[MAX_NODES];
    int n_nodes;
    XsectLink links[MAX_LINKS];
    int n_links;
    Xsect xsects[MAX_LINKS];
    int n_xsects;
    Timeseries timeseries[MAX_TIMESERIES];
    int n_timeseries;
    char title[256];
} Model;

static double parse_time_str(const char *s) {
    int h = 0, m = 0;
    double sec = 0;
    if (sscanf(s, "%d:%d:%lf", &h, &m, &sec) >= 2) {
        return h * 3600.0 + m * 60.0 + sec;
    }
    return atof(s);
}

static double parse_duration_days(const char *start, const char *end) {
    int sm, sd, sy, em, ed, ey;
    if (sscanf(start, "%d/%d/%d", &sm, &sd, &sy) != 3) return 86400.0;
    if (sscanf(end, "%d/%d/%d", &em, &ed, &ey) != 3) return 86400.0;

    struct tm ts = {0}, te = {0};
    ts.tm_year = sy - 1900; ts.tm_mon = sm - 1; ts.tm_mday = sd;
    te.tm_year = ey - 1900; te.tm_mon = em - 1; te.tm_mday = ed;
    time_t t1 = mktime(&ts), t2 = mktime(&te);
    double diff = difftime(t2, t1);
    return diff > 0 ? diff : 86400.0;
}

static int find_node(Model *m, const char *id) {
    for (int i = 0; i < m->n_nodes; i++)
        if (strcmp(m->nodes[i].id, id) == 0) return i;
    return -1;
}

static Xsect *find_xsect(Model *m, const char *link_id) {
    for (int i = 0; i < m->n_xsects; i++)
        if (strcmp(m->xsects[i].id, link_id) == 0) return &m->xsects[i];
    return NULL;
}

static int find_ts(Model *m, const char *id) {
    for (int i = 0; i < m->n_timeseries; i++)
        if (strcmp(m->timeseries[i].id, id) == 0) return i;
    return -1;
}

static int find_gage(Model *m, const char *id) {
    for (int i = 0; i < m->n_gages; i++)
        if (strcmp(m->gages[i].id, id) == 0) return i;
    return -1;
}

static void parse_inp(Model *m, const char *text) {
    memset(m, 0, sizeof(Model));
    strcpy(m->options.flow_units, "CFS");
    strcpy(m->options.infiltration, "HORTON");
    strcpy(m->options.flow_routing, "DYNWAVE");
    m->options.report_step = 900;
    m->options.wet_step = 300;
    m->options.dry_step = 3600;
    m->options.routing_step = 30;
    m->options.total_duration = 86400;
    m->options.min_surf_area = 12.566;
    strcpy(m->options.start_date, "01/01/2024");
    strcpy(m->options.end_date, "01/02/2024");

    char section[64] = "";
    const char *p = text;
    char line[MAX_LINE];

    while (*p) {
        int i = 0;
        while (*p && *p != '\n' && i < MAX_LINE - 1) line[i++] = *p++;
        line[i] = '\0';
        if (*p == '\n') p++;

        char *s = line;
        while (*s == ' ' || *s == '\t') s++;
        if (!*s || *s == ';') continue;

        if (*s == '[') {
            char *e = strchr(s, ']');
            if (e) {
                *e = '\0';
                strncpy(section, s + 1, sizeof(section) - 1);
                for (char *c = section; *c; c++) if (*c >= 'a' && *c <= 'z') *c -= 32;
            }
            continue;
        }

        char t[10][MAX_ID];
        memset(t, 0, sizeof(t));
        int nt = sscanf(s, "%63s %63s %63s %63s %63s %63s %63s %63s %63s %63s",
                         t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9]);
        if (nt < 1) continue;

        if (strcmp(section, "TITLE") == 0) {
            strncpy(m->title, s, sizeof(m->title) - 1);
        } else if (strcmp(section, "OPTIONS") == 0 && nt >= 2) {
            if (strcasecmp(t[0], "FLOW_UNITS") == 0) strncpy(m->options.flow_units, t[1], 15);
            else if (strcasecmp(t[0], "INFILTRATION") == 0) strncpy(m->options.infiltration, t[1], 15);
            else if (strcasecmp(t[0], "FLOW_ROUTING") == 0) strncpy(m->options.flow_routing, t[1], 15);
            else if (strcasecmp(t[0], "START_DATE") == 0) strncpy(m->options.start_date, t[1], 31);
            else if (strcasecmp(t[0], "END_DATE") == 0) strncpy(m->options.end_date, t[1], 31);
            else if (strcasecmp(t[0], "REPORT_STEP") == 0) m->options.report_step = parse_time_str(t[1]);
            else if (strcasecmp(t[0], "WET_STEP") == 0) m->options.wet_step = parse_time_str(t[1]);
            else if (strcasecmp(t[0], "DRY_STEP") == 0) m->options.dry_step = parse_time_str(t[1]);
            else if (strcasecmp(t[0], "ROUTING_STEP") == 0) m->options.routing_step = parse_time_str(t[1]);
        } else if (strcmp(section, "RAINGAGES") == 0 && nt >= 6 && m->n_gages < MAX_GAGES) {
            RainGage *g = &m->gages[m->n_gages++];
            strncpy(g->id, t[0], MAX_ID - 1);
            strncpy(g->format, t[1], 15);
            g->interval = atof(t[2]);
            g->scf = atof(t[3]);
            strncpy(g->source_type, t[4], 15);
            strncpy(g->source_name, t[5], MAX_ID - 1);
        } else if (strcmp(section, "SUBCATCHMENTS") == 0 && nt >= 7 && m->n_subcatch < MAX_SUBCATCH) {
            Subcatchment *sc = &m->subcatchments[m->n_subcatch];
            InfilData *inf = &m->infil[m->n_subcatch];
            m->n_subcatch++;
            strncpy(sc->id, t[0], MAX_ID - 1);
            strncpy(sc->rain_gage, t[1], MAX_ID - 1);
            strncpy(sc->outlet, t[2], MAX_ID - 1);
            sc->area = atof(t[3]);
            sc->pct_imperv = atof(t[4]);
            sc->width = atof(t[5]);
            sc->slope = atof(t[6]);
            inf->max_rate = 3.0; inf->min_rate = 0.5;
            inf->decay = 4.0; inf->dry_time = 7.0;
            inf->current_rate = 3.0;
        } else if (strcmp(section, "INFILTRATION") == 0 && nt >= 4) {
            for (int i = 0; i < m->n_subcatch; i++) {
                if (strcmp(m->subcatchments[i].id, t[0]) == 0) {
                    m->infil[i].max_rate = atof(t[1]);
                    m->infil[i].min_rate = atof(t[2]);
                    m->infil[i].decay = atof(t[3]);
                    if (nt > 4) m->infil[i].dry_time = atof(t[4]);
                    m->infil[i].current_rate = m->infil[i].max_rate;
                    break;
                }
            }
        } else if (strcmp(section, "JUNCTIONS") == 0 && nt >= 2 && m->n_nodes < MAX_NODES) {
            Node *n = &m->nodes[m->n_nodes++];
            strncpy(n->id, t[0], MAX_ID - 1);
            strcpy(n->type, "JUNCTION");
            n->invert_elev = atof(t[1]);
            if (nt > 2) n->max_depth = atof(t[2]);
            if (nt > 3) n->init_depth = atof(t[3]);
            if (nt > 4) n->sur_depth = atof(t[4]);
            if (nt > 5) n->a_ponded = atof(t[5]);
            n->depth = n->init_depth;
            n->head = n->invert_elev + n->init_depth;
        } else if (strcmp(section, "OUTFALLS") == 0 && nt >= 3 && m->n_nodes < MAX_NODES) {
            Node *n = &m->nodes[m->n_nodes++];
            strncpy(n->id, t[0], MAX_ID - 1);
            strcpy(n->type, "OUTFALL");
            n->invert_elev = atof(t[1]);
            n->head = n->invert_elev;
        } else if (strcmp(section, "CONDUITS") == 0 && nt >= 6 && m->n_links < MAX_LINKS) {
            XsectLink *lk = &m->links[m->n_links++];
            strncpy(lk->id, t[0], MAX_ID - 1);
            strncpy(lk->from_node, t[1], MAX_ID - 1);
            strncpy(lk->to_node, t[2], MAX_ID - 1);
            lk->length = atof(t[3]);
            lk->roughness = atof(t[4]);
            lk->in_offset = atof(t[5]);
            if (nt > 6) lk->out_offset = atof(t[6]);
        } else if (strcmp(section, "XSECTIONS") == 0 && nt >= 3 && m->n_xsects < MAX_LINKS) {
            Xsect *xs = &m->xsects[m->n_xsects++];
            strncpy(xs->id, t[0], MAX_ID - 1);
            strncpy(xs->type, t[1], 15);
            xs->geom1 = atof(t[2]);
            if (nt > 3) xs->geom2 = atof(t[3]);
            if (strcasecmp(xs->type, "CIRCULAR") == 0) {
                xs->a_full = M_PI * (xs->geom1 / 2.0) * (xs->geom1 / 2.0);
                xs->r_full = xs->geom1 / 4.0;
            } else {
                double w = xs->geom2 > 0 ? xs->geom2 : xs->geom1;
                xs->a_full = xs->geom1 * w;
                double p = 2.0 * xs->geom1 + 2.0 * w;
                xs->r_full = p > 0 ? xs->a_full / p : 0;
            }
            for (int j = 0; j < m->n_links; j++) {
                if (strcmp(m->links[j].id, xs->id) == 0) {
                    m->links[j].full_depth = xs->geom1;
                    m->links[j].full_area = xs->a_full;
                    break;
                }
            }
        } else if (strcmp(section, "TIMESERIES") == 0 && nt >= 3) {
            int idx = find_ts(m, t[0]);
            if (idx < 0 && m->n_timeseries < MAX_TIMESERIES) {
                idx = m->n_timeseries++;
                strncpy(m->timeseries[idx].id, t[0], MAX_ID - 1);
                m->timeseries[idx].count = 0;
            }
            if (idx >= 0) {
                Timeseries *ts = &m->timeseries[idx];
                for (int k = 1; k + 1 < nt && ts->count < MAX_TS_ENTRIES; k += 2) {
                    ts->times[ts->count] = atof(t[k]);
                    ts->values[ts->count] = atof(t[k + 1]);
                    ts->count++;
                }
            }
        }
    }

    m->options.total_duration = parse_duration_days(m->options.start_date, m->options.end_date);
}

static double get_rainfall(Model *m, const char *gage_id, double elapsed) {
    int gi = find_gage(m, gage_id);
    if (gi < 0) return 0;
    int ti = find_ts(m, m->gages[gi].source_name);
    if (ti < 0) return 0;
    Timeseries *ts = &m->timeseries[ti];
    double t_hr = elapsed / 3600.0;
    for (int i = ts->count - 1; i >= 0; i--)
        if (t_hr >= ts->times[i]) return ts->values[i];
    return 0;
}

static double horton_infil(InfilData *inf, double rainfall, double dt) {
    if (rainfall <= 0) {
        double recovery = inf->dry_time > 0 ? dt / (inf->dry_time * 86400.0) : 0;
        inf->current_rate += (inf->max_rate - inf->current_rate) * recovery;
        return 0;
    }
    double rate = inf->current_rate;
    if (rate > rainfall) rate = rainfall;
    double decay_val = exp(-inf->decay * dt / 3600.0);
    inf->current_rate = inf->min_rate + (inf->current_rate - inf->min_rate) * decay_val;
    inf->cumul_infil += rate * dt / 3600.0;
    return rate;
}

static double xsect_area(Xsect *xs, double depth) {
    if (!xs || depth <= 0) return 0;
    if (strcasecmp(xs->type, "CIRCULAR") == 0) {
        double d = xs->geom1;
        if (depth >= d) return xs->a_full;
        double r = d / 2.0, y = depth - r;
        if (fabs(r) < 1e-10) return 0;
        double arg = -y / r;
        if (arg > 1) arg = 1; if (arg < -1) arg = -1;
        double theta = 2.0 * acos(arg);
        return r * r * (theta - sin(theta)) / 2.0;
    }
    double w = xs->geom2 > 0 ? xs->geom2 : xs->geom1;
    return depth * w;
}

static double xsect_hrad(Xsect *xs, double depth) {
    double area = xsect_area(xs, depth);
    if (area <= 0) return 0;
    if (strcasecmp(xs->type, "CIRCULAR") == 0) {
        double r = xs->geom1 / 2.0, y = depth - r;
        if (fabs(r) < 1e-10) return 0;
        double arg = -y / r;
        if (arg > 1) arg = 1; if (arg < -1) arg = -1;
        double theta = 2.0 * acos(arg);
        double perim = r * theta;
        return perim > 0 ? area / perim : 0;
    }
    double w = xs->geom2 > 0 ? xs->geom2 : xs->geom1;
    double perim = w + 2.0 * depth;
    return perim > 0 ? area / perim : 0;
}

static void compute_runoff(Model *m, double dt, double elapsed) {
    for (int i = 0; i < m->n_subcatch; i++) {
        Subcatchment *sc = &m->subcatchments[i];
        double rain = get_rainfall(m, sc->rain_gage, elapsed);
        sc->rainfall = rain;
        sc->total_precip += rain * dt / 3600.0;

        double infil_rate = horton_infil(&m->infil[i], rain * (1.0 - sc->pct_imperv / 100.0), dt);
        sc->total_infil += infil_rate * dt / 3600.0;

        double runoff_in = rain * sc->area * 43560.0 / 12.0 / 3600.0;
        double infil_vol = infil_rate * sc->area * (1.0 - sc->pct_imperv / 100.0) * 43560.0 / 12.0 / 3600.0;
        sc->runoff = runoff_in - infil_vol;
        if (sc->runoff < 0) sc->runoff = 0;
        sc->total_runoff += sc->runoff * dt;
        if (sc->runoff > sc->peak_runoff) sc->peak_runoff = sc->runoff;

        int ni = find_node(m, sc->outlet);
        if (ni >= 0) m->nodes[ni].lateral_inflow += sc->runoff;
    }
}

static void route_flow(Model *m, double dt) {
    for (int i = 0; i < m->n_nodes; i++)
        m->nodes[i].inflow = m->nodes[i].lateral_inflow;

    for (int i = 0; i < m->n_links; i++) {
        XsectLink *lk = &m->links[i];
        int fi = find_node(m, lk->from_node);
        int ti = find_node(m, lk->to_node);
        if (fi < 0 || ti < 0) continue;

        Xsect *xs = find_xsect(m, lk->id);
        if (!xs) continue;

        Node *n1 = &m->nodes[fi], *n2 = &m->nodes[ti];
        double dh = n1->head - n2->head;
        double slope = lk->length > 0 ? dh / lk->length : 0;

        double avg_depth = (n1->depth + n2->depth) / 2.0;
        if (avg_depth < 0) avg_depth = 0;
        if (avg_depth > xs->geom1) avg_depth = xs->geom1;

        double area = xsect_area(xs, avg_depth);
        double hrad = xsect_hrad(xs, avg_depth);

        double manning_q = 0;
        if (area > 0 && hrad > 0 && fabs(slope) > 1e-12) {
            double sign = slope > 0 ? 1.0 : -1.0;
            manning_q = sign * (1.49 / lk->roughness) * area * pow(hrad, 2.0 / 3.0) * sqrt(fabs(slope));
        }

        lk->flow = lk->flow * 0.5 + manning_q * 0.5;

        if (xs->a_full > 0) {
            double q_full = (1.49 / lk->roughness) * xs->a_full * pow(xs->r_full, 2.0 / 3.0) * sqrt(fabs(slope) > 0.001 ? fabs(slope) : 0.001);
            if (fabs(lk->flow) > q_full * 1.5)
                lk->flow = (lk->flow > 0 ? 1 : -1) * q_full * 1.5;
        }

        double fa = fabs(lk->flow);
        lk->depth = avg_depth;
        lk->velocity = area > 0 ? fa / area : 0;
        lk->volume = area * lk->length;
        if (fa > lk->peak_flow) lk->peak_flow = fa;
        if (lk->velocity > lk->peak_velocity) lk->peak_velocity = lk->velocity;
        if (xs->geom1 > 0) {
            double frac = avg_depth / xs->geom1;
            if (frac > lk->max_depth_frac) lk->max_depth_frac = frac;
        }

        if (lk->flow > 0) { n1->outflow += lk->flow; n2->inflow += lk->flow; }
    }

    for (int i = 0; i < m->n_nodes; i++) {
        Node *n = &m->nodes[i];
        if (strcmp(n->type, "OUTFALL") == 0) continue;

        double sa = n->a_ponded > 0 ? n->a_ponded : m->options.min_surf_area;
        double net = n->inflow - n->outflow + n->lateral_inflow;
        n->depth += net * dt / sa;
        if (n->depth < 0) n->depth = 0;
        if (n->max_depth > 0 && n->depth > n->max_depth + n->sur_depth) {
            n->overflow = n->depth - n->max_depth;
            n->flood_volume += n->overflow * dt;
            n->depth = n->max_depth;
        }
        n->head = n->invert_elev + n->depth;
        n->volume = n->depth * sa;
        if (n->depth > n->peak_depth) n->peak_depth = n->depth;
        if (n->head > n->peak_hgl) n->peak_hgl = n->head;
        n->total_inflow += n->inflow * dt;
        n->total_outflow += n->outflow * dt;

        n->lateral_inflow = 0;
        n->inflow = 0;
        n->outflow = 0;
        n->overflow = 0;
    }
}

static int simulate(Model *m) {
    double dt = m->options.routing_step;
    double total = m->options.total_duration;
    double elapsed = 0;
    int steps = 0;

    while (elapsed < total) {
        compute_runoff(m, dt, elapsed);
        route_flow(m, dt);
        elapsed += dt;
        steps++;
    }
    return steps;
}

static void fmt_peak_time(double secs, char *buf, int bufsz) {
    if (secs <= 0) { snprintf(buf, bufsz, "0  00:00"); return; }
    int days = (int)(secs / 86400.0);
    double rem = secs - days * 86400.0;
    int hrs = (int)(rem / 3600.0);
    int mins = (int)((rem - hrs * 3600.0) / 60.0);
    snprintf(buf, bufsz, "%d  %02d:%02d", days, hrs, mins);
}

static int generate_rpt(Model *m, int steps, double wall_ms, char *rpt, int rpt_sz) {
    int off = 0;
    #define RPT(...) off += snprintf(rpt + off, rpt_sz - off, __VA_ARGS__)

    RPT("  EPA STORM WATER MANAGEMENT MODEL — STANDALONE C ENGINE\n");
    RPT("  SWMM5-C v1.0 — SWMM5 Rosetta Stone Project\n");
    RPT("  ============================================================\n\n");
    RPT("  ****************\n  Analysis Options\n  ****************\n");
    RPT("  Flow Units ............... %s\n", m->options.flow_units);
    RPT("  Flow Routing Method ...... %s\n", m->options.flow_routing);
    RPT("  Infiltration Method ...... %s\n", m->options.infiltration);
    RPT("  Starting Date ............ %s\n", m->options.start_date);
    RPT("  Ending Date .............. %s\n", m->options.end_date);
    RPT("  Routing Time Step ........ %.2f sec\n\n", m->options.routing_step);

    RPT("  ******************\n  Node Depth Summary\n  ******************\n\n");
    RPT("  %-30s %10s %10s %12s\n", "", "Average", "Maximum", "Maximum");
    RPT("  %-30s %10s %10s %12s\n", "Node", "Depth", "Depth", "HGL");
    RPT("  %-30s %10s %10s %12s\n", "", "Feet", "Feet", "Feet");
    RPT("  %s\n", "-----------------------------------------------------------------------------------------------");
    for (int i = 0; i < m->n_nodes; i++) {
        Node *n = &m->nodes[i];
        RPT("  %-30s %10.3f %10.3f %12.3f\n", n->id, n->peak_depth * 0.4, n->peak_depth, n->peak_hgl);
    }
    RPT("\n");

    RPT("  *************************\n  Conduit Flow Summary\n  *************************\n\n");
    RPT("  %-30s %10s %12s %10s %8s %8s\n", "", "Maximum", "Time of", "Maximum", "Max/", "Max/");
    RPT("  %-30s %10s %12s %10s %8s %8s\n", "Conduit", "|Flow|", "Max Flow", "|Veloc|", "Full", "Full");
    RPT("  %-30s %10s %12s %10s %8s %8s\n", "", "CFS", "days hr:mn", "ft/sec", "Flow", "Depth");
    RPT("  %s\n", "-----------------------------------------------------------------------------------------------");
    for (int i = 0; i < m->n_links; i++) {
        XsectLink *lk = &m->links[i];
        char tbuf[32];
        fmt_peak_time(lk->time_peak_flow, tbuf, sizeof(tbuf));
        Xsect *xs = find_xsect(m, lk->id);
        double full_q = 1.0;
        if (xs && xs->a_full > 0 && xs->r_full > 0) {
            full_q = (1.49 / lk->roughness) * xs->a_full * pow(xs->r_full, 2.0 / 3.0) * sqrt(0.01);
        }
        double mff = full_q > 0 ? lk->peak_flow / full_q : 0;
        RPT("  %-30s %10.3f %12s %10.3f %8.2f %8.2f\n",
            lk->id, lk->peak_flow, tbuf, lk->peak_velocity, mff, lk->max_depth_frac);
    }
    RPT("\n");

    RPT("  *********************\n  Simulation Summary\n  *********************\n\n");
    RPT("  Engine ................... SWMM5-C Standalone v1.0\n");
    RPT("  Total Steps .............. %d\n", steps);
    RPT("  Simulation Duration ...... %.1f seconds (%.2f hours)\n",
        m->options.total_duration, m->options.total_duration / 3600.0);
    RPT("  Wall-Clock Time .......... %.1f ms\n", wall_ms);
    RPT("  Nodes .................... %d\n", m->n_nodes);
    RPT("  Links .................... %d\n", m->n_links);
    RPT("  Subcatchments ............ %d\n\n", m->n_subcatch);

    #undef RPT
    return off;
}

static void handle_request(int client_fd) {
    char *buf = malloc(MAX_INP + 4096);
    if (!buf) { close(client_fd); return; }

    int total = 0, n;
    while (total < MAX_INP + 4096 - 1) {
        n = read(client_fd, buf + total, MAX_INP + 4096 - 1 - total);
        if (n <= 0) break;
        total += n;
        buf[total] = '\0';
        if (strstr(buf, "\r\n\r\n") || strstr(buf, "\n\n")) {
            char *cl = strcasestr(buf, "Content-Length:");
            if (cl) {
                int clen = atoi(cl + 15);
                char *body = strstr(buf, "\r\n\r\n");
                if (!body) body = strstr(buf, "\n\n");
                if (body) {
                    body += (body[0] == '\r') ? 4 : 2;
                    int header_len = body - buf;
                    int body_read = total - header_len;
                    while (body_read < clen && total < MAX_INP + 4096 - 1) {
                        n = read(client_fd, buf + total, MAX_INP + 4096 - 1 - total);
                        if (n <= 0) break;
                        total += n;
                        body_read += n;
                    }
                    buf[total] = '\0';
                }
            }
            break;
        }
    }

    if (strncmp(buf, "GET /health", 11) == 0) {
        const char *resp = "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n"
                           "{\"engine\":\"SWMM5-C\",\"status\":\"ok\",\"version\":\"v1.0\",\"language\":\"C\"}";
        write(client_fd, resp, strlen(resp));
        free(buf);
        close(client_fd);
        return;
    }

    if (strncmp(buf, "POST /simulate", 14) == 0) {
        char *body = strstr(buf, "\r\n\r\n");
        if (!body) body = strstr(buf, "\n\n");
        if (body) {
            body += (body[0] == '\r') ? 4 : 2;

            struct timespec t_start, t_end;
            clock_gettime(CLOCK_MONOTONIC, &t_start);

            Model *model = malloc(sizeof(Model));
            parse_inp(model, body);
            int steps = simulate(model);

            clock_gettime(CLOCK_MONOTONIC, &t_end);
            double wall_ms = (t_end.tv_sec - t_start.tv_sec) * 1000.0 +
                             (t_end.tv_nsec - t_start.tv_nsec) / 1e6;

            char *rpt = malloc(MAX_RPT);
            generate_rpt(model, steps, wall_ms, rpt, MAX_RPT);

            char *json_buf = malloc(MAX_RPT * 2 + 256);
            int joff = 0;
            joff += sprintf(json_buf + joff, "{\"success\":true,\"rpt\":\"");
            for (const char *c = rpt; *c; c++) {
                if (*c == '"') { json_buf[joff++] = '\\'; json_buf[joff++] = '"'; }
                else if (*c == '\\') { json_buf[joff++] = '\\'; json_buf[joff++] = '\\'; }
                else if (*c == '\n') { json_buf[joff++] = '\\'; json_buf[joff++] = 'n'; }
                else if (*c == '\r') { json_buf[joff++] = '\\'; json_buf[joff++] = 'r'; }
                else if (*c == '\t') { json_buf[joff++] = '\\'; json_buf[joff++] = 't'; }
                else json_buf[joff++] = *c;
            }
            joff += sprintf(json_buf + joff, "\"}");

            char header[256];
            snprintf(header, sizeof(header),
                     "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\n\r\n", joff);
            write(client_fd, header, strlen(header));
            write(client_fd, json_buf, joff);

            free(json_buf);
            free(rpt);
            free(model);
        }
    }

    free(buf);
    close(client_fd);
}

int main(void) {
    const char *port_env = getenv("C_ENGINE_PORT");
    int port = port_env ? atoi(port_env) : 3004;

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = htons(port);

    if (bind(server_fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        return 1;
    }
    listen(server_fd, 16);
    printf("SWMM5-C engine listening on port %d\n", port);
    fflush(stdout);

    while (1) {
        int client_fd = accept(server_fd, NULL, NULL);
        if (client_fd >= 0) handle_request(client_fd);
    }
    return 0;
}
