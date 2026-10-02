using System.Text.Json;
using SharpAstrology.DataModels;
using SharpAstrology.Enums;
using SharpAstrology.Ephemerides;
using SharpAstrology.ExtensionMethods;
using SharpAstrology.Utility;
using SharpChartEngine;

var epheRoot = Environment.GetEnvironmentVariable("TD_OHD_DE441") ?? throw new ArgumentException("Set TD_OHD_DE441 to the pinned ephemeris directory");
var auditOutput = Environment.GetEnvironmentVariable("TD_OHD_AUDIT_OUTPUT") ?? throw new ArgumentException("Set TD_OHD_AUDIT_OUTPUT to an external output directory");
Directory.CreateDirectory(auditOutput);
using var eph = new SwissEphemeridesService(rootPathToEph: epheRoot,
    ephType: EphType.Swiss, allowMoshierFallback: false).CreateContext();
var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
double Sun(DateTime utc) => eph.PlanetsPosition(Planets.Sun, utc).Longitude;
double Normalize(double degrees) => ((degrees % 360) + 360) % 360;
object Activation(double lon, double offset)
{
    if (offset == 3.875)
    {
        var a = HumanDesignUtility.ActivationOf(lon);
        return new { gate = a.Gate.ToNumber(), line = a.Line.ToNumber(), color = a.Color.ToNumber(),
            tone = a.Tone.ToNumber(), @base = a.Base.ToNumber(), longitude = lon };
    }
    var x = Normalize(lon - offset);
    return new { gate = ((Gates)(int)Math.Floor(x / 5.625)).ToNumber(),
        line = (int)Math.Floor((x % 5.625) / 0.9375) + 1, longitude = lon,
        diagnosticOnlyOffset = offset };
}
object Sample(DateTime utc, string id, string position, DateTime? transition = null)
{
    var london = TimeZoneInfo.FindSystemTimeZoneById("Europe/London");
    var local = TimeZoneInfo.ConvertTimeFromUtc(utc,london);
    var p = Sun(utc);
    var design = eph.DesignJulianDay(utc);
    var d = Sun(design);
    var chart = new HumanDesignChart(utc, design, eph);
    using var fullChart = JsonDocument.Parse(TransitCore.SerializeBirth(chart, utc, design));
    return new {
        id, position, city = "London", country = "United Kingdom", timezone = "Europe/London",
        localDate = local.ToString("yyyy-MM-dd"), localTime = local.ToString("HH:mm"), localTimeWithSeconds = local.ToString("HH:mm:ss.fffffff"),
        timezoneOffsetMinutes = london.GetUtcOffset(utc).TotalMinutes,
        utc = utc.ToString("O"), boundaryUtc = transition?.ToString("O"),
        boundaryDistanceSeconds = transition is null ? (double?)null : (utc - transition.Value).TotalSeconds,
        personalitySun = Activation(p, 3.875), designSun = Activation(d, 3.875),
        diagnosticFloat32Longitude = new {
            personalitySun = Activation((double)(float)p, 3.875), designSun = Activation((double)(float)d, 3.875),
            personalityLongitudeQuantizationDegrees = (double)(float)p-p, designLongitudeQuantizationDegrees = (double)(float)d-d,
            note = "Diagnostic hypothetical float32 narrowing; production output remains original double." },
        diagnosticOffset39375 = new { personalitySun = Activation(p, 3.9375), designSun = Activation(d, 3.9375) },
        designUtc = design.ToString("O"), solarArcDegrees = Normalize(p - d),
        solarArcResidualDegrees = Normalize(p - d) - 88,
        chart = fullChart.RootElement.Clone()
    };
}
DateTime Root(DateTime lo, DateTime hi, double target)
{
    double Error(DateTime utc) => AstrologyUtility.DifferenceDegreesSigned(Sun(utc), target);
    if (!(Error(lo) < 0 && Error(hi) >= 0)) throw new Exception($"Unbracketed target {target}: {lo:o} {hi:o}");
    while ((hi - lo).TotalSeconds > 0.0001)
    {
        var middle = new DateTime(lo.Ticks + (hi.Ticks - lo.Ticks) / 2, DateTimeKind.Utc);
        if (Error(middle) >= 0) hi = middle; else lo = middle;
    }
    return hi;
}

if (args.Length > 0 && args[0] == "--birth")
{
    foreach (var iso in args.Skip(1))
    {
        var utc = TransitCore.ParseUtc(iso);
        Console.WriteLine(JsonSerializer.Serialize(Sample(utc, iso, "requested")));
    }
    return;
}
if (args.Length > 0 && args[0] == "--year-scan")
{
    var output = auditOutput;
    var roots = new List<object>();
    var candidates = new List<object>();
    foreach (var year in new[]{1985,1995,2005,2015,2025})
    {
        var start = new DateTime(year,1,1,0,0,0,DateTimeKind.Utc);
        var end = start.AddYears(1);
        var nearCount = 0;
        for (var lo=start;lo<end;lo=lo.AddHours(6))
        {
            var hi=lo.AddHours(6);
            var segmentLow=(int)Math.Floor(Normalize(Sun(lo)-3.875)/0.9375);
            var segmentHigh=(int)Math.Floor(Normalize(Sun(hi)-3.875)/0.9375);
            if(segmentLow==segmentHigh)continue;
            var target=Normalize(3.875+segmentHigh*0.9375);
            var utc=Root(lo,hi,target);
            var from=HumanDesignUtility.ActivationOf(Sun(utc.AddSeconds(-1)));
            var to=HumanDesignUtility.ActivationOf(Sun(utc.AddSeconds(1)));
            var id=$"{year}-P{from.Gate.ToNumber()}.{from.Line.ToNumber()}-to-{to.Gate.ToNumber()}.{to.Line.ToNumber()}";
            var utcSeconds=utc.Second+utc.Millisecond/1000.0+((utc.Ticks%10000)/10000000.0);
            roots.Add(new {id,year,utc=utc.ToString("O"),targetLongitude=target,secondInMinute=utcSeconds,
                fromGate=from.Gate.ToNumber(),fromLine=from.Line.ToNumber(),toGate=to.Gate.ToNumber(),toLine=to.Line.ToNumber(),
                side="personality",kind=from.Gate==to.Gate?"line":"gate"});
            if(utcSeconds>=0.5)continue;
            nearCount++;
            var floor=new DateTime(utc.Year,utc.Month,utc.Day,utc.Hour,utc.Minute,0,DateTimeKind.Utc);
            candidates.Add(Sample(floor,id+"-minute-zero","boundary-minute-at-zero-seconds",utc));
            candidates.Add(Sample(floor.AddMinutes(1),id+"-minute-next","next-minute",utc));
            candidates.Add(Sample(floor.AddSeconds(1),id+"-second-one","boundary-minute-at-one-second",utc));
        }
        Console.Error.WriteLine($"{year}: {nearCount} full-year roots less than0.5sec after minute.");
    }
    File.WriteAllText(Path.Combine(output,"full-year-personality-boundaries.json"),JsonSerializer.Serialize(new {boundaries=roots},jsonOptions));
    File.WriteAllText(Path.Combine(output,"full-year-personality-near-half-second-candidates.json"),JsonSerializer.Serialize(new {candidates},jsonOptions));
    Console.WriteLine(JsonSerializer.Serialize(new {boundaryCount=roots.Count,candidateCount=candidates.Count}));
    return;
}
if (args.Length > 0 && args[0] == "--scan-windows")
{
    var output = auditOutput;
    foreach(var iso in args.Skip(1))
    {
        var center=TransitCore.ParseUtc(iso);
        var nextSegment=(int)Math.Floor(Normalize(Sun(center)-3.875)/0.9375)+1;
        var target=Normalize(3.875+nextSegment*0.9375);
        var boundary=Root(center.AddMinutes(-5),center.AddMinutes(5),target);
        var key=center.ToString("yyyy-MM-dd-HH-mm-ss");
        using var minutes=new StreamWriter(Path.Combine(output,$"window-{key}-minutes.jsonl"));
        for(var n=-60;n<=60;n++)minutes.WriteLine(JsonSerializer.Serialize(Sample(center.AddMinutes(n),key+$"-minute-{n}","minute-window",boundary)));
        using var seconds=new StreamWriter(Path.Combine(output,$"window-{key}-seconds.jsonl"));
        for(var n=-300;n<=300;n++)seconds.WriteLine(JsonSerializer.Serialize(Sample(center.AddSeconds(n),key+$"-second-{n}","second-window",boundary)));
        Console.Error.WriteLine($"{iso}: 121 minute rows + 601 second rows; boundary {boundary:O}");
    }
    return;
}
if (args.Length > 0 && args[0] == "--precision-boundaries")
{
    var output=auditOutput;
    using var file=JsonDocument.Parse(File.ReadAllText(Path.Combine(output,"full-year-personality-boundaries.json")));
    var records=new List<object>();
    foreach(var b in file.RootElement.GetProperty("boundaries").EnumerateArray())
    {
        var second=b.GetProperty("secondInMinute").GetDouble();
        if(second>=0.5)continue;
        var target=b.GetProperty("targetLongitude").GetDouble();
        var root=TransitCore.ParseUtc(b.GetProperty("utc").GetString()!);
        var previousFloat=(double)MathF.BitDecrement((float)target);
        var midpoint=(target+previousFloat)/2;
        var floatRoot=Root(root.AddSeconds(-5),root.AddSeconds(1),midpoint);
        var utcMinute=new DateTime(root.Year,root.Month,root.Day,root.Hour,root.Minute,0,DateTimeKind.Utc);
        var minuteLon=Sun(utcMinute);
        var speedPerSecond=AstrologyUtility.DifferenceDegreesSigned(Sun(root.AddSeconds(60)),Sun(root.AddSeconds(-60)))/120;
        records.Add(new {id=b.GetProperty("id").GetString(),nativeRootUtc=root.ToString("O"),
            targetLongitude=target,previousFloat32Longitude=previousFloat,
            float32EffectiveTargetLongitude=midpoint,float32UlpDegrees=target-previousFloat,
            diagnosticFloat32RootUtc=floatRoot.ToString("O"),diagnosticFloat32AdvanceSeconds=(root-floatRoot).TotalSeconds,
            solarLongitudeSpeedDegreesPerSecond=speedPerSecond,
            firstOrderAdvanceSeconds=(target-previousFloat)/(2*speedPerSecond),
            minuteUtc=utcMinute.ToString("O"),minuteDoubleLongitude=minuteLon,minuteFloat32Longitude=(double)(float)minuteLon,
            minuteDoubleActivation=Activation(minuteLon,3.875),minuteFloat32Activation=Activation((double)(float)minuteLon,3.875)});
    }
    File.WriteAllText(Path.Combine(output,"float32-boundary-diagnostics.json"),JsonSerializer.Serialize(new {
        formula="For a binary-exact HD target L, hypothetical nearest float32 reaches L when double Sun longitude >= (L + BitDecrementFloat32(L))/2; advance approximately ULP(L)/(2 * dLongitude/dSeconds). Tie rounding can choose either neighboring float based on even significand, so this is a diagnostic threshold, never a production correction.",records},jsonOptions));
    Console.WriteLine(JsonSerializer.Serialize(new {count=records.Count}));
    return;
}
if (args.Length > 0 && args[0] == "--design-scan")
{
    var output = auditOutput;
    var designBoundaries = new List<object>();
    var designCandidates = new List<object>();
    var lineCandidates = new List<object>();
    var lineBoundaries = new List<object>();
    foreach (var year in new[] {1985,1995,2005,2015,2025})
    {
        var start = new DateTime(year,1,1,0,0,0,DateTimeKind.Utc);
        var end = start.AddMonths(1);
        foreach (var side in new[] {"design","personality"})
        {
            double Shifted(double lon) => Normalize(lon - (side == "design" ? 88 : 0));
            for (var lo = start; lo < end; lo = lo.AddHours(6))
            {
                var hi = lo.AddHours(6);
                var segmentLow = (int)Math.Floor(Normalize(Shifted(Sun(lo))-3.875)/0.9375);
                var segmentHigh = (int)Math.Floor(Normalize(Shifted(Sun(hi))-3.875)/0.9375);
                if (segmentLow == segmentHigh) continue;
                var sideTarget = Normalize(3.875+segmentHigh*0.9375);
                var birthTarget = Normalize(sideTarget + (side == "design" ? 88 : 0));
                var utc = Root(lo,hi,birthTarget);
                var alternate = Root(utc.AddSeconds(-5),utc.AddHours(3),Normalize(birthTarget+0.0625));
                double SideSun(DateTime t) => side == "design" ? Sun(eph.DesignJulianDay(t)) : Sun(t);
                var from = HumanDesignUtility.ActivationOf(SideSun(utc.AddSeconds(-1)));
                var to = HumanDesignUtility.ActivationOf(SideSun(utc.AddSeconds(1)));
                var id = $"{year}-{(side == "design" ? "D" : "P")}{from.Gate.ToNumber()}.{from.Line.ToNumber()}-to-{to.Gate.ToNumber()}.{to.Line.ToNumber()}";
                var boundary = new { id, year, side, kind = from.Gate == to.Gate ? "line" : "gate", utc = utc.ToString("O"),
                    designUtcAtBoundary = eph.DesignJulianDay(utc).ToString("O"),
                    sideTargetLongitude = sideTarget, personalityTargetLongitude = birthTarget,
                    boundarySideLongitude = SideSun(utc),
                    fromGate = from.Gate.ToNumber(), fromLine = from.Line.ToNumber(), toGate = to.Gate.ToNumber(), toLine = to.Line.ToNumber(),
                    diagnosticOffset39375Utc = alternate.ToString("O"), offsetDelaySeconds = (alternate-utc).TotalSeconds,
                    beforeSecond = new {utc=utc.AddSeconds(-1).ToString("O"), activation=Activation(SideSun(utc.AddSeconds(-1)),3.875)},
                    afterSecond = new {utc=utc.AddSeconds(1).ToString("O"), activation=Activation(SideSun(utc.AddSeconds(1)),3.875)} };
                if (side == "design") designBoundaries.Add(boundary); else if (from.Gate == to.Gate) lineBoundaries.Add(boundary);
                var gate = to.Gate.ToNumber(); var line = to.Line.ToNumber();
                bool selected = side == "design" ? ((gate is 57 or 32 or 50 or 28 or 44) && (line is 1 or 2))
                    : (gate is 54 or 61 or 60 or 41) && (line is 2 or 4);
                if (!selected) continue;
                var floor = new DateTime(utc.Year,utc.Month,utc.Day,utc.Hour,utc.Minute,0,DateTimeKind.Utc);
                var before = Sample(floor.AddMinutes(-1),id+"-before",side+"-before",utc);
                var after = Sample(floor.AddMinutes(2),id+"-after",side+"-after",utc);
                var mid = new DateTime(utc.Ticks + (alternate.Ticks-utc.Ticks)/2,DateTimeKind.Utc);
                mid = new DateTime(mid.Year,mid.Month,mid.Day,mid.Hour,mid.Minute,0,DateTimeKind.Utc);
                var midpoint = Sample(mid,id+"-offset-midpoint",side+"-offset-discriminating-midpoint",utc);
                var collection = side == "design" ? designCandidates : lineCandidates;
                collection.Add(before); collection.Add(after); collection.Add(midpoint);
            }
        }
        Console.Error.WriteLine($"Additional {year} Design and pure Line candidates ready.");
    }
    File.WriteAllText(Path.Combine(output,"design-sun-boundaries.json"),JsonSerializer.Serialize(new {boundaries=designBoundaries},jsonOptions));
    File.WriteAllText(Path.Combine(output,"design-sun-candidates.json"),JsonSerializer.Serialize(new {candidates=designCandidates},jsonOptions));
    File.WriteAllText(Path.Combine(output,"personality-pure-line-boundaries.json"),JsonSerializer.Serialize(new {boundaries=lineBoundaries},jsonOptions));
    File.WriteAllText(Path.Combine(output,"personality-pure-line-candidates.json"),JsonSerializer.Serialize(new {candidates=lineCandidates},jsonOptions));
    Console.WriteLine(JsonSerializer.Serialize(new {designBoundaryCount=designBoundaries.Count,designCandidateCount=designCandidates.Count,pureLineCandidateCount=lineCandidates.Count}));
    return;
}
var outputRoot = args.Length > 0 ? args[0] : auditOutput;
Directory.CreateDirectory(outputRoot);
var boundaries = new List<object>();
var allCandidates = new List<object>();
var shortlist = new List<object>();
var exactProbes = new List<object>();
foreach (var year in new[] {1985, 1995, 2005, 2015, 2025})
{
    var previousBoundaryCount = boundaries.Count;
    var start = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    var end = start.AddMonths(1);
    var yearBoundaries = new List<(DateTime utc, DateTime otherUtc, int fromGate, int fromLine, int gate, int line, double target)>();
    for (var lo = start; lo < end; lo = lo.AddHours(6))
    {
        var hi = lo.AddHours(6);
        var lowerLon = Sun(lo);
        var upperLon = Sun(hi);
        var xLow = Normalize(lowerLon - 3.875);
        var xHigh = Normalize(upperLon - 3.875);
        var segmentLow = (int)Math.Floor(xLow / 0.9375);
        var segmentHigh = (int)Math.Floor(xHigh / 0.9375);
        if (segmentLow == segmentHigh) continue;
        var target = Normalize(3.875 + segmentHigh * 0.9375);
        var instant = Root(lo, hi, target);
        var alternate = Root(instant.AddSeconds(-5), instant.AddHours(3), Normalize(target + 0.0625));
        var from = HumanDesignUtility.ActivationOf(Sun(instant.AddSeconds(-1)));
        var to = HumanDesignUtility.ActivationOf(Sun(instant.AddSeconds(1)));
        yearBoundaries.Add((instant, alternate, from.Gate.ToNumber(), from.Line.ToNumber(), to.Gate.ToNumber(), to.Line.ToNumber(), target));
    }
    // Spread across several gates and include within-gate line transitions.
    var selected = yearBoundaries.Where(b => (b.gate == 54 && b.line is 1 or 2) ||
        (b.gate == 61 && b.line == 1) || (b.gate == 60 && b.line is 1 or 4) ||
        (b.gate == 41 && b.line == 1)).ToArray();
    foreach (var b in yearBoundaries)
    {
        var id = $"{year}-P{b.fromGate}.{b.fromLine}-to-{b.gate}.{b.line}";
        boundaries.Add(new { id, year, side = "personality", kind = b.fromGate == b.gate ? "line" : "gate",
            utc = b.utc.ToString("O"), rootBracketToleranceSeconds = 0.0001, targetLongitude = b.target,
            fromGate = b.fromGate, fromLine = b.fromLine, toGate = b.gate, toLine = b.line,
            diagnosticOffset39375Utc = b.otherUtc.ToString("O"),
            diagnosticOffsetDelaySeconds = (b.otherUtc-b.utc).TotalSeconds });
        exactProbes.Add(new { id, before = new { utc = b.utc.AddSeconds(-1).ToString("O"), activation = Activation(Sun(b.utc.AddSeconds(-1)), 3.875) },
            after = new { utc = b.utc.AddSeconds(1).ToString("O"), activation = Activation(Sun(b.utc.AddSeconds(1)), 3.875) } });
    }
    foreach (var b in selected)
    {
        var id = $"{year}-P{b.fromGate}.{b.fromLine}-to-{b.gate}.{b.line}";
        var floor = new DateTime(b.utc.Year, b.utc.Month, b.utc.Day, b.utc.Hour, b.utc.Minute, 0, DateTimeKind.Utc);
        var before = Sample(floor.AddMinutes(-1), id+"-before", "before", b.utc);
        var after = Sample(floor.AddMinutes(2), id+"-after", "after", b.utc);
        var midpoint = new DateTime(b.utc.Ticks + (b.otherUtc.Ticks-b.utc.Ticks)/2, DateTimeKind.Utc);
        midpoint = new DateTime(midpoint.Year, midpoint.Month, midpoint.Day, midpoint.Hour, midpoint.Minute, 0, DateTimeKind.Utc);
        var diagnostic = Sample(midpoint, id+"-offset-midpoint", "offset-discriminating-midpoint", b.utc);
        allCandidates.Add(before); allCandidates.Add(after); allCandidates.Add(diagnostic);
        if ((year == 1985 && b.gate == 54 && b.line == 1) ||
            (year == 1995 && b.gate == 61 && b.line == 1) ||
            (year == 2005 && b.gate == 60 && b.line == 4) ||
            (year == 2015 && b.gate == 60 && b.line == 1) ||
            (year == 2025 && b.gate == 41 && b.line == 1))
        { shortlist.Add(before); shortlist.Add(after); shortlist.Add(diagnostic); }
    }
    File.WriteAllText(Path.Combine(outputRoot, $"sun-boundaries-{year}.json"), JsonSerializer.Serialize(boundaries.Skip(previousBoundaryCount), jsonOptions));
    Console.Error.WriteLine($"{year}: {yearBoundaries.Count} boundaries; {selected.Length*3} selected minute candidates.");
}
var metadata = new { generatedUtc = DateTime.UtcNow.ToString("O"), repoHead = "a2314f74e84293f88c6df232d643618556496c26",
    engine = "SharpAstrology.HumanDesign 1.2.0 + SharpAstrology.SwissEph 0.5.1", hdOffsetDegrees = 3.875,
    diagnosticOnlyOffsetDegrees = 3.9375, ephemerisRoot = epheRoot,
    note = "London January GMT; minute inputs, exact native Sharp Sun boundaries; alternate offset is diagnostic only." };
File.WriteAllText(Path.Combine(outputRoot, "sun-boundaries.json"), JsonSerializer.Serialize(new {metadata, boundaries, exactProbes}, jsonOptions));
File.WriteAllText(Path.Combine(outputRoot, "sun-candidates.json"), JsonSerializer.Serialize(new {metadata, candidates = allCandidates}, jsonOptions));
File.WriteAllText(Path.Combine(outputRoot, "sun-candidates-shortlist.json"), JsonSerializer.Serialize(new {metadata, candidates = shortlist}, jsonOptions));
Console.WriteLine(JsonSerializer.Serialize(new {metadata, boundaryCount = boundaries.Count, candidateCount = allCandidates.Count, shortlistCount = shortlist.Count}));
