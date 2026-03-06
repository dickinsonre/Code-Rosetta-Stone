package main

import (
        "encoding/json"
        "fmt"
        "io"
        "log"
        "math"
        "net/http"
        "os"
        "strconv"
        "strings"
        "time"
)

const GRAVITY = 32.174

type Options struct {
        FlowUnits      string
        Infiltration   string
        FlowRouting    string
        StartDate      time.Time
        EndDate        time.Time
        StartTime      float64
        EndTime        float64
        ReportStep     float64
        WetStep        float64
        DryStep        float64
        RoutingStep    float64
        VariableStep   float64
        MaxTrials      int
        HeadTolerance  float64
        MinSurfArea    float64
        TotalDuration  float64
        AllowPonding   bool
}

type RainGage struct {
        ID         string
        Format     string
        Interval   float64
        SCF        float64
        SourceType string
        SourceName string
}

type Subcatchment struct {
        ID          string
        RainGage    string
        Outlet      string
        Area        float64
        PctImperv   float64
        Width       float64
        Slope       float64
        Runoff      float64
        Rainfall    float64
        TotalPrecip float64
        TotalRunoff float64
        TotalInfil  float64
        PeakRunoff  float64
}

type SubArea struct {
        NImperv float64
        NPerv   float64
        SImperv float64
        SPerv   float64
        PctZero float64
        RouteTo string
}

type InfilData struct {
        MaxRate     float64
        MinRate     float64
        Decay       float64
        DryTime     float64
        CurrentRate float64
        CumulInfil  float64
}

type Node struct {
        ID            string
        Type          string
        InvertElev    float64
        MaxDepth      float64
        InitDepth     float64
        SurDepth      float64
        APonded       float64
        Depth         float64
        Head          float64
        Volume        float64
        Inflow        float64
        Outflow       float64
        Overflow      float64
        LateralInflow float64
        PeakDepth     float64
        PeakHead      float64
        PeakHGL       float64
        TimePeakDepth float64
        TotalInflow   float64
        TotalOverflow float64
        PeakInflow    float64
        TimeFlooded   float64
        OutfallType   string
}

type XSection struct {
        Shape   string
        Geom1   float64
        Geom2   float64
        Geom3   float64
        Geom4   float64
        Barrels int
}

type Link struct {
        ID              string
        FromNode        string
        ToNode          string
        Length          float64
        Roughness      float64
        InOffset       float64
        OutOffset      float64
        InitFlow       float64
        Flow           float64
        Depth          float64
        Velocity       float64
        Area           float64
        XSect          *XSection
        FullArea       float64
        FullPerimeter  float64
        FullHydRadius  float64
        FullFlow       float64
        PeakFlow       float64
        PeakVelocity   float64
        PeakDepth      float64
        TimePeakFlow   float64
        TotalFlow      float64
        CapacityLimited float64
}

type TSPoint struct {
        Time  float64
        Value float64
}

type NodeResult struct {
        Time     float64
        Depth    float64
        Head     float64
        Inflow   float64
        Overflow float64
}

type LinkResult struct {
        Time     float64
        Flow     float64
        Velocity float64
        Depth    float64
        Capacity float64
}

type Results struct {
        NodeResults map[string][]NodeResult
        LinkResults map[string][]LinkResult
        ReportTimes []float64
}

type Project struct {
        Title         string
        Options       Options
        RainGages     map[string]*RainGage
        Subcatchments map[string]*Subcatchment
        SubAreas      map[string]*SubArea
        Infiltration  map[string]*InfilData
        Nodes         map[string]*Node
        Links         map[string]*Link
        XSections     map[string]*XSection
        TimeSeries    map[string][]TSPoint
}

func parseTimeStr(s string) float64 {
        parts := strings.Split(strings.TrimSpace(s), ":")
        h, _ := strconv.ParseFloat(parts[0], 64)
        result := h * 3600
        if len(parts) >= 2 {
                m, _ := strconv.ParseFloat(parts[1], 64)
                result += m * 60
        }
        if len(parts) >= 3 {
                sec, _ := strconv.ParseFloat(parts[2], 64)
                result += sec
        }
        return result
}

func parseDateStr(s string) time.Time {
        parts := strings.Split(strings.TrimSpace(s), "/")
        if len(parts) < 3 {
                return time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
        }
        month, _ := strconv.Atoi(parts[0])
        day, _ := strconv.Atoi(parts[1])
        year, _ := strconv.Atoi(parts[2])
        return time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
}

func fmtTime(seconds float64) string {
        h := int(seconds) / 3600
        m := (int(seconds) % 3600) / 60
        s := int(seconds) % 60
        return fmt.Sprintf("%02d:%02d:%02d", h, m, s)
}

func fmtDateTime(base time.Time, seconds float64) string {
        t := base.Add(time.Duration(seconds) * time.Second)
        return t.Format("01/02/2006 15:04:05")
}

func circularArea(diameter, depth float64) float64 {
        if depth <= 0 {
                return 0
        }
        if depth >= diameter {
                return math.Pi * diameter * diameter / 4
        }
        r := diameter / 2
        theta := 2 * math.Acos((r-depth)/r)
        return r * r * (theta - math.Sin(theta)) / 2
}

func circularPerimeter(diameter, depth float64) float64 {
        if depth <= 0 {
                return 0
        }
        if depth >= diameter {
                return math.Pi * diameter
        }
        r := diameter / 2
        theta := 2 * math.Acos((r-depth)/r)
        return r * theta
}

func circularHydRadius(diameter, depth float64) float64 {
        a := circularArea(diameter, depth)
        p := circularPerimeter(diameter, depth)
        if p > 0 {
                return a / p
        }
        return 0
}

func parseInp(text string) *Project {
        p := &Project{
                Options: Options{
                        FlowUnits:     "CFS",
                        Infiltration:  "HORTON",
                        FlowRouting:   "DYNWAVE",
                        StartDate:     time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
                        EndDate:       time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
                        StartTime:     0,
                        EndTime:       21600,
                        ReportStep:    900,
                        WetStep:       300,
                        DryStep:       3600,
                        RoutingStep:   30,
                        VariableStep:  0.75,
                        MaxTrials:     8,
                        HeadTolerance: 0.005,
                        MinSurfArea:   12.566,
                },
                RainGages:     make(map[string]*RainGage),
                Subcatchments: make(map[string]*Subcatchment),
                SubAreas:      make(map[string]*SubArea),
                Infiltration:  make(map[string]*InfilData),
                Nodes:         make(map[string]*Node),
                Links:         make(map[string]*Link),
                XSections:     make(map[string]*XSection),
                TimeSeries:    make(map[string][]TSPoint),
        }

        section := ""
        for _, rawLine := range strings.Split(text, "\n") {
                line := strings.TrimSpace(rawLine)
                if line == "" || strings.HasPrefix(line, ";;") {
                        continue
                }
                if strings.HasPrefix(line, "[") && strings.Contains(line, "]") {
                        section = strings.ToUpper(strings.Trim(line, "[] "))
                        continue
                }
                if strings.HasPrefix(line, ";") {
                        continue
                }

                tokens := strings.Fields(line)
                if len(tokens) == 0 {
                        continue
                }

                switch section {
                case "TITLE":
                        if p.Title != "" {
                                p.Title += "\n"
                        }
                        p.Title += line

                case "OPTIONS":
                        if len(tokens) < 2 {
                                continue
                        }
                        key := strings.ToUpper(tokens[0])
                        val := strings.Join(tokens[1:], " ")
                        switch key {
                        case "FLOW_UNITS":
                                p.Options.FlowUnits = val
                        case "INFILTRATION":
                                p.Options.Infiltration = val
                        case "FLOW_ROUTING":
                                p.Options.FlowRouting = val
                        case "START_DATE":
                                p.Options.StartDate = parseDateStr(val)
                        case "START_TIME":
                                p.Options.StartTime = parseTimeStr(val)
                        case "END_DATE":
                                p.Options.EndDate = parseDateStr(val)
                        case "END_TIME":
                                p.Options.EndTime = parseTimeStr(val)
                        case "REPORT_STEP":
                                p.Options.ReportStep = parseTimeStr(val)
                        case "WET_STEP":
                                p.Options.WetStep = parseTimeStr(val)
                        case "DRY_STEP":
                                p.Options.DryStep = parseTimeStr(val)
                        case "ROUTING_STEP":
                                if strings.Contains(val, ":") {
                                        p.Options.RoutingStep = parseTimeStr(val)
                                } else {
                                        v, _ := strconv.ParseFloat(strings.Fields(val)[0], 64)
                                        p.Options.RoutingStep = v
                                }
                                if p.Options.RoutingStep <= 0 {
                                        p.Options.RoutingStep = 30
                                }
                        case "VARIABLE_STEP":
                                v, _ := strconv.ParseFloat(val, 64)
                                p.Options.VariableStep = v
                        case "MAX_TRIALS":
                                v, _ := strconv.Atoi(val)
                                p.Options.MaxTrials = v
                        case "HEAD_TOLERANCE":
                                v, _ := strconv.ParseFloat(val, 64)
                                p.Options.HeadTolerance = v
                        case "MIN_SURFAREA":
                                v, _ := strconv.ParseFloat(val, 64)
                                p.Options.MinSurfArea = v
                        }

                case "RAINGAGES":
                        if len(tokens) >= 6 {
                                scf, _ := strconv.ParseFloat(tokens[3], 64)
                                p.RainGages[tokens[0]] = &RainGage{
                                        ID: tokens[0], Format: tokens[1],
                                        Interval: parseTimeStr(tokens[2]), SCF: scf,
                                        SourceType: strings.ToUpper(tokens[4]), SourceName: tokens[5],
                                }
                        }

                case "SUBCATCHMENTS":
                        if len(tokens) >= 7 {
                                area, _ := strconv.ParseFloat(tokens[3], 64)
                                pctImperv, _ := strconv.ParseFloat(tokens[4], 64)
                                width, _ := strconv.ParseFloat(tokens[5], 64)
                                slope, _ := strconv.ParseFloat(tokens[6], 64)
                                p.Subcatchments[tokens[0]] = &Subcatchment{
                                        ID: tokens[0], RainGage: tokens[1], Outlet: tokens[2],
                                        Area: area, PctImperv: pctImperv, Width: width, Slope: slope,
                                }
                        }

                case "SUBAREAS":
                        if len(tokens) >= 6 {
                                nI, _ := strconv.ParseFloat(tokens[1], 64)
                                nP, _ := strconv.ParseFloat(tokens[2], 64)
                                sI, _ := strconv.ParseFloat(tokens[3], 64)
                                sP, _ := strconv.ParseFloat(tokens[4], 64)
                                pZ, _ := strconv.ParseFloat(tokens[5], 64)
                                routeTo := "OUTLET"
                                if len(tokens) > 6 {
                                        routeTo = tokens[6]
                                }
                                p.SubAreas[tokens[0]] = &SubArea{
                                        NImperv: nI, NPerv: nP, SImperv: sI, SPerv: sP,
                                        PctZero: pZ, RouteTo: routeTo,
                                }
                        }

                case "INFILTRATION":
                        if len(tokens) >= 4 {
                                maxR, _ := strconv.ParseFloat(tokens[1], 64)
                                minR, _ := strconv.ParseFloat(tokens[2], 64)
                                decay, _ := strconv.ParseFloat(tokens[3], 64)
                                dryT := 7.0
                                if len(tokens) > 4 {
                                        dryT, _ = strconv.ParseFloat(tokens[4], 64)
                                }
                                p.Infiltration[tokens[0]] = &InfilData{
                                        MaxRate: maxR, MinRate: minR, Decay: decay,
                                        DryTime: dryT, CurrentRate: maxR,
                                }
                        }

                case "JUNCTIONS":
                        if len(tokens) >= 2 {
                                inv, _ := strconv.ParseFloat(tokens[1], 64)
                                n := &Node{
                                        ID: tokens[0], Type: "junction", InvertElev: inv,
                                }
                                if len(tokens) > 2 {
                                        n.MaxDepth, _ = strconv.ParseFloat(tokens[2], 64)
                                }
                                if len(tokens) > 3 {
                                        n.InitDepth, _ = strconv.ParseFloat(tokens[3], 64)
                                }
                                if len(tokens) > 4 {
                                        n.SurDepth, _ = strconv.ParseFloat(tokens[4], 64)
                                }
                                if len(tokens) > 5 {
                                        n.APonded, _ = strconv.ParseFloat(tokens[5], 64)
                                }
                                n.Depth = n.InitDepth
                                n.Head = n.InvertElev + n.Depth
                                p.Nodes[tokens[0]] = n
                        }

                case "OUTFALLS":
                        if len(tokens) >= 3 {
                                inv, _ := strconv.ParseFloat(tokens[1], 64)
                                n := &Node{
                                        ID: tokens[0], Type: "outfall", InvertElev: inv,
                                        OutfallType: tokens[2],
                                }
                                n.Head = n.InvertElev
                                p.Nodes[tokens[0]] = n
                        }

                case "STORAGE":
                        if len(tokens) >= 5 {
                                inv, _ := strconv.ParseFloat(tokens[1], 64)
                                maxD, _ := strconv.ParseFloat(tokens[2], 64)
                                initD, _ := strconv.ParseFloat(tokens[3], 64)
                                n := &Node{
                                        ID: tokens[0], Type: "storage", InvertElev: inv,
                                        MaxDepth: maxD, InitDepth: initD,
                                }
                                n.Depth = n.InitDepth
                                n.Head = n.InvertElev + n.Depth
                                p.Nodes[tokens[0]] = n
                        }

                case "CONDUITS":
                        if len(tokens) >= 5 {
                                length, _ := strconv.ParseFloat(tokens[3], 64)
                                rough, _ := strconv.ParseFloat(tokens[4], 64)
                                l := &Link{
                                        ID: tokens[0], FromNode: tokens[1], ToNode: tokens[2],
                                        Length: length, Roughness: rough,
                                }
                                if len(tokens) > 5 {
                                        l.InOffset, _ = strconv.ParseFloat(tokens[5], 64)
                                }
                                if len(tokens) > 6 {
                                        l.OutOffset, _ = strconv.ParseFloat(tokens[6], 64)
                                }
                                if len(tokens) > 7 {
                                        l.InitFlow, _ = strconv.ParseFloat(tokens[7], 64)
                                }
                                l.Flow = l.InitFlow
                                p.Links[tokens[0]] = l
                        }

                case "XSECTIONS":
                        if len(tokens) >= 3 {
                                shape := strings.ToUpper(tokens[1])
                                var geom1 float64
                                if shape == "IRREGULAR" {
                                        geom1 = 1.0
                                } else {
                                        geom1, _ = strconv.ParseFloat(tokens[2], 64)
                                }
                                xs := &XSection{Shape: shape, Geom1: geom1, Barrels: 1}
                                if len(tokens) > 3 {
                                        xs.Geom2, _ = strconv.ParseFloat(tokens[3], 64)
                                }
                                if len(tokens) > 4 {
                                        xs.Geom3, _ = strconv.ParseFloat(tokens[4], 64)
                                }
                                if len(tokens) > 5 {
                                        xs.Geom4, _ = strconv.ParseFloat(tokens[5], 64)
                                }
                                if len(tokens) > 6 {
                                        xs.Barrels, _ = strconv.Atoi(tokens[6])
                                }
                                p.XSections[tokens[0]] = xs
                                if link, ok := p.Links[tokens[0]]; ok {
                                        link.XSect = xs
                                }
                        }

                case "TIMESERIES":
                        if len(tokens) >= 2 {
                                name := tokens[0]
                                var tsTime float64
                                var tsVal float64
                                if len(tokens) >= 4 && strings.Contains(tokens[1], "/") {
                                        tsTime = parseTimeStr(tokens[2])
                                        tsVal, _ = strconv.ParseFloat(tokens[3], 64)
                                } else if len(tokens) >= 3 {
                                        tsTime = parseTimeStr(tokens[1])
                                        tsVal, _ = strconv.ParseFloat(tokens[2], 64)
                                }
                                p.TimeSeries[name] = append(p.TimeSeries[name], TSPoint{Time: tsTime, Value: tsVal})
                        }
                }
        }

        for id, link := range p.Links {
                if xs, ok := p.XSections[id]; ok && link.XSect == nil {
                        link.XSect = xs
                }
                if link.XSect != nil && link.XSect.Shape == "CIRCULAR" {
                        d := link.XSect.Geom1
                        link.FullArea = math.Pi * d * d / 4
                        link.FullPerimeter = math.Pi * d
                        link.FullHydRadius = d / 4
                        link.FullFlow = (1.49 / link.Roughness) * link.FullArea *
                                math.Pow(link.FullHydRadius, 2.0/3.0) * math.Pow(0.001, 0.5)
                }
        }

        totalSec := p.Options.EndDate.Sub(p.Options.StartDate).Seconds() +
                p.Options.EndTime - p.Options.StartTime
        p.Options.TotalDuration = totalSec

        return p
}

func getTimeSeries(ts []TSPoint, t float64) float64 {
        if len(ts) == 0 {
                return 0
        }
        if t <= ts[0].Time {
                return ts[0].Value
        }
        if t >= ts[len(ts)-1].Time {
                return ts[len(ts)-1].Value
        }
        for i := 0; i < len(ts)-1; i++ {
                if t >= ts[i].Time && t <= ts[i+1].Time {
                        frac := (t - ts[i].Time) / (ts[i+1].Time - ts[i].Time)
                        return ts[i].Value + frac*(ts[i+1].Value-ts[i].Value)
                }
        }
        return 0
}

func hortonInfil(infil *InfilData, rainfall, dt float64) float64 {
        if infil == nil {
                return 0
        }
        rate := infil.MinRate + (infil.CurrentRate-infil.MinRate)*math.Exp(-infil.Decay*dt/3600)
        avgRate := (infil.CurrentRate + rate) / 2
        actualRate := math.Min(avgRate, rainfall)
        infil.CurrentRate = rate
        infil.CumulInfil += actualRate * dt / 3600
        return actualRate
}

func computeRunoff(sc *Subcatchment, sa *SubArea, rainfall, infilRate, dt float64) float64 {
        pctImperv := sc.PctImperv / 100
        pctPerv := 1 - pctImperv
        areaFt2 := sc.Area * 43560

        nImperv := 0.01
        sImperv := 0.05
        sPerv := 0.05
        if sa != nil {
                nImperv = sa.NImperv
                sImperv = sa.SImperv
                sPerv = sa.SPerv
        }
        _ = nImperv

        rainfallDepth := rainfall * dt / 3600
        impervRunoff := 0.0
        if rainfall > 0 && rainfallDepth > sImperv {
                excess := rainfall - sImperv*3600/dt
                if excess > 0 {
                        impervRunoff = excess * pctImperv
                }
        }

        pervRunoff := 0.0
        if rainfall > infilRate {
                netRain := rainfall - infilRate
                if netRain > sPerv*3600/dt {
                        excess := netRain - sPerv*3600/dt
                        if excess > 0 {
                                pervRunoff = excess * pctPerv
                        }
                }
        }

        runoffCFS := (impervRunoff + pervRunoff) * areaFt2 / 43200
        return math.Max(0, runoffCFS)
}

func routeFlow(p *Project, dt float64) {
        for _, link := range p.Links {
                fromNode := p.Nodes[link.FromNode]
                toNode := p.Nodes[link.ToNode]
                if fromNode == nil || toNode == nil {
                        continue
                }

                hUp := fromNode.Head + link.InOffset
                hDown := toNode.Head + link.OutOffset
                dh := hUp - hDown

                depth := (fromNode.Depth + toNode.Depth) / 2
                if link.XSect != nil && link.XSect.Shape == "CIRCULAR" {
                        if depth > link.XSect.Geom1 {
                                depth = link.XSect.Geom1
                        }
                }

                area := 0.0
                hydRad := 0.0
                if link.XSect != nil && link.XSect.Shape == "CIRCULAR" {
                        area = circularArea(link.XSect.Geom1, depth)
                        hydRad = circularHydRadius(link.XSect.Geom1, depth)
                } else {
                        area = link.FullArea * depth / (link.XSect.Geom1 + 0.001)
                        if link.FullPerimeter > 0 {
                                hydRad = area / link.FullPerimeter
                        }
                }

                sf := 0.0
                if area > 0 && link.Flow != 0 {
                        vel := link.Flow / area
                        if hydRad > 0 {
                                sf = (link.Roughness * vel / (1.49 * math.Pow(hydRad, 2.0/3.0)))
                                sf = sf * math.Abs(sf)
                        }
                }

                if area > 0 {
                        dhdx := dh / link.Length
                        link.Flow = link.Flow + dt*GRAVITY*area*(dhdx-sf)
                        qMax := area * 50.0
                        if link.Flow > qMax {
                                link.Flow = qMax
                        }
                        if link.Flow < -qMax {
                                link.Flow = -qMax
                        }
                }

                if area > 0 {
                        link.Velocity = link.Flow / area
                } else {
                        link.Velocity = 0
                }
                link.Depth = depth
                link.Area = area

                fromNode.Outflow += math.Max(0, link.Flow)
                toNode.Inflow += math.Max(0, link.Flow)
                fromNode.Inflow += math.Max(0, -link.Flow)
                toNode.Outflow += math.Max(0, -link.Flow)
        }

        for _, n := range p.Nodes {
                if n.Type == "outfall" {
                        continue
                }
                surfArea := math.Max(p.Options.MinSurfArea, 12.566)
                dv := (n.Inflow + n.LateralInflow - n.Outflow) * dt
                n.Volume += dv
                if n.Volume < 0 {
                        n.Volume = 0
                }
                n.Depth = n.Volume / surfArea
                if n.Depth < 0 {
                        n.Depth = 0
                }
                if n.MaxDepth > 0 && n.Depth > n.MaxDepth {
                        n.Overflow = (n.Depth - n.MaxDepth) * surfArea / dt
                        n.Depth = n.MaxDepth
                } else {
                        n.Overflow = 0
                }
                n.Head = n.InvertElev + n.Depth
                n.Volume = n.Depth * surfArea
        }
}

func simulate(p *Project) (*Results, int, float64) {
        dt := p.Options.RoutingStep
        totalDuration := p.Options.TotalDuration
        reportStep := p.Options.ReportStep
        elapsed := 0.0
        nextReport := 0.0
        steps := 0

        results := &Results{
                NodeResults: make(map[string][]NodeResult),
                LinkResults: make(map[string][]LinkResult),
        }

        for id := range p.Nodes {
                results.NodeResults[id] = []NodeResult{}
        }
        for id := range p.Links {
                results.LinkResults[id] = []LinkResult{}
        }

        for elapsed < totalDuration {
                for scID, sc := range p.Subcatchments {
                        gage := p.RainGages[sc.RainGage]
                        rainfall := 0.0
                        if gage != nil {
                                if ts, ok := p.TimeSeries[gage.SourceName]; ok {
                                        rainfall = getTimeSeries(ts, elapsed)
                                }
                        }

                        infil := p.Infiltration[scID]
                        infilRate := hortonInfil(infil, rainfall, dt)
                        sa := p.SubAreas[scID]

                        sc.Rainfall = rainfall
                        runoff := computeRunoff(sc, sa, rainfall, infilRate, dt)
                        sc.Runoff = runoff

                        sc.TotalPrecip += rainfall * dt / 3600
                        sc.TotalInfil += infilRate * dt / 3600
                        sc.TotalRunoff += runoff * dt
                        if runoff > sc.PeakRunoff {
                                sc.PeakRunoff = runoff
                        }

                        if outNode, ok := p.Nodes[sc.Outlet]; ok {
                                outNode.LateralInflow += runoff
                        }
                }

                routeFlow(p, dt)

                for _, n := range p.Nodes {
                        if n.Depth > n.PeakDepth {
                                n.PeakDepth = n.Depth
                                n.TimePeakDepth = elapsed
                                n.PeakHGL = n.Head
                        }
                        n.TotalInflow += n.Inflow * dt
                        if n.Inflow > n.PeakInflow {
                                n.PeakInflow = n.Inflow
                        }
                        n.TotalOverflow += n.Overflow * dt
                        if n.Overflow > 0 {
                                n.TimeFlooded += dt
                        }
                }

                for _, c := range p.Links {
                        if math.Abs(c.Flow) > math.Abs(c.PeakFlow) {
                                c.PeakFlow = c.Flow
                                c.TimePeakFlow = elapsed
                        }
                        if math.Abs(c.Velocity) > math.Abs(c.PeakVelocity) {
                                c.PeakVelocity = c.Velocity
                        }
                        if c.Depth > c.PeakDepth {
                                c.PeakDepth = c.Depth
                        }
                        c.TotalFlow += c.Flow * dt
                        if c.XSect != nil && c.Depth >= c.XSect.Geom1*0.95 {
                                c.CapacityLimited += dt
                        }
                }

                if elapsed >= nextReport {
                        results.ReportTimes = append(results.ReportTimes, elapsed)
                        for id, n := range p.Nodes {
                                results.NodeResults[id] = append(results.NodeResults[id], NodeResult{
                                        Time: elapsed, Depth: n.Depth, Head: n.Head,
                                        Inflow: n.Inflow, Overflow: n.Overflow,
                                })
                        }
                        for id, c := range p.Links {
                                cap := 0.0
                                if c.XSect != nil && c.XSect.Geom1 > 0 {
                                        cap = c.Depth / c.XSect.Geom1
                                }
                                results.LinkResults[id] = append(results.LinkResults[id], LinkResult{
                                        Time: elapsed, Flow: c.Flow, Velocity: c.Velocity,
                                        Depth: c.Depth, Capacity: cap,
                                })
                        }
                        nextReport += reportStep
                }

                for _, n := range p.Nodes {
                        n.LateralInflow = 0
                        n.Inflow = 0
                        n.Outflow = 0
                }

                elapsed += dt
                steps++
        }

        return results, steps, elapsed
}

func generateReport(p *Project, results *Results, steps int, elapsed, parseMs, simMs float64) string {
        opt := p.Options
        startDT := fmtDateTime(opt.StartDate, opt.StartTime)
        endDT := fmtDateTime(opt.EndDate, opt.EndTime)

        var b strings.Builder
        ln := func(s string) { b.WriteString(s); b.WriteByte('\n') }
        lnf := func(format string, args ...interface{}) { b.WriteString(fmt.Sprintf(format, args...)); b.WriteByte('\n') }

        ln("  **********************************************")
        ln("  *     SWMM5 Go Engine                       *")
        ln("  *     Native Compiled Simulation             *")
        ln("  *     Based on EPA SWMM 5.2                  *")
        ln("  **********************************************")
        ln("")

        ln("  ****************")
        ln("  Analysis Options")
        ln("  ****************")
        lnf("  Flow Units ............... %s", opt.FlowUnits)
        ln("  Process Models:")
        ln("    Rainfall/Runoff ........ YES")
        ln("    RDII ................... NO")
        ln("    Snowmelt ............... NO")
        ln("    Groundwater ............ NO")
        ln("    Flow Routing ........... YES")
        ponding := "NO"
        if opt.AllowPonding {
                ponding = "YES"
        }
        lnf("    Ponding Allowed ........ %s", ponding)
        ln("    Water Quality .......... NO")
        ln("")
        lnf("  Infiltration Method ...... %s", opt.Infiltration)
        lnf("  Flow Routing Method ...... %s", opt.FlowRouting)
        lnf("  Starting Date ............ %s", startDT)
        lnf("  Ending Date .............. %s", endDT)
        lnf("  Report Step .............. %s", fmtTime(opt.ReportStep))
        lnf("  Wet Weather Step ......... %s", fmtTime(opt.WetStep))
        lnf("  Dry Weather Step ......... %s", fmtTime(opt.DryStep))
        lnf("  Routing Step ............. %.2f sec", opt.RoutingStep)
        ln("")

        lnf("  Engine Performance:")
        lnf("    Time Steps ............. %d", steps)
        lnf("    INP Parse Time ......... %.3f ms", parseMs)
        lnf("    Simulation Time ........ %.3f ms", simMs)
        lnf("    Total Time ............. %.3f ms", parseMs+simMs)
        ln("")

        nodeCount := len(p.Nodes)
        linkCount := len(p.Links)
        scCount := len(p.Subcatchments)

        lnf("  Model Size:")
        lnf("    Subcatchments .......... %d", scCount)
        lnf("    Nodes .................. %d", nodeCount)
        lnf("    Links .................. %d", linkCount)
        ln("")

        if scCount > 0 {
                ln("  ***********************")
                ln("  Subcatchment Runoff Summary")
                ln("  ***********************")
                ln("")
                ln("  " + padEnd("Subcatchment", 20) + padStart("Precip", 12) + padStart("Runoff", 12) + padStart("Infil", 12) + padStart("Peak Flow", 12))
                ln("  " + padEnd("", 20) + padStart("in", 12) + padStart("in", 12) + padStart("in", 12) + padStart("CFS", 12))
                ln("  " + strings.Repeat("-", 68))
                for _, sc := range p.Subcatchments {
                        lnf("  %s%s%s%s%s",
                                padEnd(sc.ID, 20),
                                padStart(fmt.Sprintf("%.3f", sc.TotalPrecip), 12),
                                padStart(fmt.Sprintf("%.3f", sc.TotalRunoff/sc.Area/43560*12), 12),
                                padStart(fmt.Sprintf("%.3f", sc.TotalInfil), 12),
                                padStart(fmt.Sprintf("%.3f", sc.PeakRunoff), 12))
                }
                ln("")
        }

        ln("  ******************")
        ln("  Node Summary")
        ln("  ******************")
        ln("")
        ln("  " + padEnd("Node", 20) + padStart("Type", 12) + padStart("Peak Depth", 12) + padStart("Peak HGL", 12) + padStart("Peak Inflow", 12))
        ln("  " + padEnd("", 20) + padStart("", 12) + padStart("ft", 12) + padStart("ft", 12) + padStart("CFS", 12))
        ln("  " + strings.Repeat("-", 68))
        for _, n := range p.Nodes {
                lnf("  %s%s%s%s%s",
                        padEnd(n.ID, 20),
                        padStart(n.Type, 12),
                        padStart(fmt.Sprintf("%.3f", n.PeakDepth), 12),
                        padStart(fmt.Sprintf("%.3f", n.PeakHGL), 12),
                        padStart(fmt.Sprintf("%.3f", n.PeakInflow), 12))
        }
        ln("")

        if linkCount > 0 {
                ln("  ******************")
                ln("  Link Summary")
                ln("  ******************")
                ln("")
                ln("  " + padEnd("Link", 20) + padStart("Peak Flow", 12) + padStart("Peak Vel", 12) + padStart("Peak Depth", 12))
                ln("  " + padEnd("", 20) + padStart("CFS", 12) + padStart("ft/s", 12) + padStart("ft", 12))
                ln("  " + strings.Repeat("-", 56))
                for _, c := range p.Links {
                        lnf("  %s%s%s%s",
                                padEnd(c.ID, 20),
                                padStart(fmt.Sprintf("%.3f", c.PeakFlow), 12),
                                padStart(fmt.Sprintf("%.3f", c.PeakVelocity), 12),
                                padStart(fmt.Sprintf("%.3f", c.PeakDepth), 12))
                }
                ln("")
        }

        if len(results.ReportTimes) > 0 {
                ln("  ********************")
                ln("  Node Results")
                ln("  ********************")
                for id, nodeRes := range results.NodeResults {
                        ln("")
                        lnf("  <<< Node %s >>>", id)
                        ln("  " + padEnd("Date/Time", 22) + padStart("Depth", 12) + padStart("Head", 12) + padStart("Inflow", 12) + padStart("Overflow", 12))
                        ln("  " + padEnd("", 22) + padStart("ft", 12) + padStart("ft", 12) + padStart("CFS", 12) + padStart("CFS", 12))
                        ln("  " + strings.Repeat("-", 70))
                        for _, r := range nodeRes {
                                lnf("  %s%s%s%s%s",
                                        padEnd(fmtDateTime(opt.StartDate, opt.StartTime+r.Time), 22),
                                        padStart(fmt.Sprintf("%.3f", r.Depth), 12),
                                        padStart(fmt.Sprintf("%.3f", r.Head), 12),
                                        padStart(fmt.Sprintf("%.3f", r.Inflow), 12),
                                        padStart(fmt.Sprintf("%.3f", r.Overflow), 12))
                        }
                }
                ln("")

                ln("  ********************")
                ln("  Link Results")
                ln("  ********************")
                for id, linkRes := range results.LinkResults {
                        ln("")
                        lnf("  <<< Link %s >>>", id)
                        ln("  " + padEnd("Date/Time", 22) + padStart("Flow", 12) + padStart("Velocity", 12) + padStart("Depth", 10) + padStart("Capacity", 10))
                        ln("  " + padEnd("", 22) + padStart("CFS", 12) + padStart("ft/s", 12) + padStart("ft", 10) + padStart("", 10))
                        ln("  " + strings.Repeat("-", 66))
                        for _, r := range linkRes {
                                lnf("  %s%s%s%s%s",
                                        padEnd(fmtDateTime(opt.StartDate, opt.StartTime+r.Time), 22),
                                        padStart(fmt.Sprintf("%.3f", r.Flow), 12),
                                        padStart(fmt.Sprintf("%.3f", r.Velocity), 12),
                                        padStart(fmt.Sprintf("%.3f", r.Depth), 10),
                                        padStart(fmt.Sprintf("%.3f", r.Capacity), 10))
                        }
                }
                ln("")
        }

        lnf("  Analysis begun on : %s", time.Now().Format(time.RFC3339))
        lnf("  Total elapsed time : %.3f seconds", (parseMs+simMs)/1000)
        ln("  Engine: SWMM5-Go v1.0 (Native Compiled Go)")

        return b.String()
}

func padEnd(s string, w int) string {
        if len(s) >= w {
                return s
        }
        return s + strings.Repeat(" ", w-len(s))
}

func padStart(s string, w int) string {
        if len(s) >= w {
                return s
        }
        return strings.Repeat(" ", w-len(s)) + s
}

type SimResponse struct {
        Success bool   `json:"success"`
        Rpt     string `json:"rpt"`
        Error   string `json:"error"`
}

func handleSimulate(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
                http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
                return
        }

        body, err := io.ReadAll(r.Body)
        if err != nil {
                json.NewEncoder(w).Encode(SimResponse{Error: "Failed to read request body"})
                return
        }
        inpText := string(body)
        if len(inpText) == 0 {
                json.NewEncoder(w).Encode(SimResponse{Error: "Empty .inp file"})
                return
        }

        t0 := time.Now()
        project := parseInp(inpText)
        parseMs := float64(time.Since(t0).Microseconds()) / 1000.0

        nodeCount := len(project.Nodes)
        linkCount := len(project.Links)
        if nodeCount == 0 {
                json.NewEncoder(w).Encode(SimResponse{Error: "No nodes found in .inp file"})
                return
        }
        if linkCount == 0 {
                json.NewEncoder(w).Encode(SimResponse{Error: "No links found in .inp file"})
                return
        }

        t1 := time.Now()
        results, steps, elapsed := simulate(project)
        simMs := float64(time.Since(t1).Microseconds()) / 1000.0

        rpt := generateReport(project, results, steps, elapsed, parseMs, simMs)

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(SimResponse{Success: true, Rpt: rpt})
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
                "status":  "ok",
                "engine":  "SWMM5-Go",
                "version": "v1.0",
        })
}

func main() {
        port := os.Getenv("GO_ENGINE_PORT")
        if port == "" {
                port = "3002"
        }

        mux := http.NewServeMux()
        mux.HandleFunc("/simulate", handleSimulate)
        mux.HandleFunc("/health", handleHealth)

        fmt.Printf("SWMM5 Go Engine v1.0 listening on :%s\n", port)
        log.Fatal(http.ListenAndServe(":"+port, mux))
}
