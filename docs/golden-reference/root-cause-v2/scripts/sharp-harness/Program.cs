// Diagnostic only. Run outside the application checkout and installation.
using System.Globalization;
using System.Reflection;
using System.Text.Json;
using SharpAstrology.Enums;
using SharpAstrology.Ephemerides;
using SharpAstrology.ExtensionMethods;
using SharpAstrology.SwissEphemerides;
using SharpAstrology.SwissEphemerides.Application.Bodies;
using SharpAstrology.SwissEphemerides.Domain.Time;
using SharpAstrology.Utility;

var mode = args[0];
var ephe = args[1];
var bias = args.Length > 2 && args[2] == "bias";
var flags = (mode == "jpl" ? EphemerisFlags.JplEph : EphemerisFlags.SwissEph) | EphemerisFlags.Speed;
using var eph = new SwissEphemeridesService(ephe, mode == "jpl" ? EphType.Jpl : EphType.Swiss,
    allowMoshierFallback: false).CreateContext();
const BindingFlags bf = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;
object Field(object x, string name) => x.GetType().GetField(name,bf)!.GetValue(x)!;
object Property(object x, string name) => x.GetType().GetProperty(name,bf)!.GetValue(x)!;
var ctx = (EphemerisContext)Field(eph,"_ctx");
var router = Field(ctx.Bodies,"_router");
var source = Field(router,mode == "jpl" ? "_jpl" : "_swissEph");
var firstInput = Console.ReadLine() ?? throw new ArgumentException("No frozen inputs provided");
using var firstDoc = JsonDocument.Parse(firstInput);
var firstUtc=DateTime.Parse(firstDoc.RootElement.GetProperty("birthUtc").GetString()!,CultureInfo.InvariantCulture,DateTimeStyles.AdjustToUniversal|DateTimeStyles.AssumeUniversal);
var firstJd=ctx.Calendar.UtcToJulianDay(firstUtc);
object header;
if(mode == "jpl") header = Property(Field(source,"_reader"),"Header");
else {
    // Ask the registered source for its own actual Sun reader at the first
    // frozen input's ET; no separately opened reader and no file-name guess.
    var ft=typeof(EphemerisContext).Assembly.GetType("SharpAstrology.SwissEphemerides.Infrastructure.SwissEph.Se1FileFormat")!;
    var seiSun=(int)ft.GetField("SeiSunBary",BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Static)!.GetValue(null)!;
    var reader=source.GetType().GetMethod("GetReaderForBlock",bf)!.Invoke(source,new object[]{seiSun,new JulianDay(firstJd.Value+ctx.Calendar.DeltaT(firstJd))})!;
    header=Property(reader,"Header");
}
var de = (int)Property(header,mode == "jpl" ? "DeNumber" : "JplDeNumber");
if(de != 441) throw new InvalidOperationException($"This diagnostic requires actual DE441 header, got {de}");
var actualSourceHeader=new {fileName=(string)Property(header,"FileName"),deNumber=de,
    julianDayStart=(double)Property(header,"JdStart"),julianDayEnd=(double)Property(header,"JdEnd"),fileLength=(long)Property(header,"FileLength")};
var sourceKey = mode == "jpl" ? "Jpl" : "SwissEph";
// BodyState 0.5.1 does not carry DE metadata. Diagnostic patch alone receives
// source-specific metadata read above from the actual registered source header.
AppContext.SetData("SharpDiagnostic.DeNumber."+sourceKey, bias ? de : 0);
var asm = typeof(EphemerisContext).Assembly;
var assembly = new {
    swissAssembly = asm.GetName().FullName,
    swissInformationalVersion = asm.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
    baseAssembly = typeof(Planets).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
    hdAssembly = typeof(HumanDesignUtility).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion,
};
var names = new[]{"sun","earth","moon","northNode","southNode","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"};
var planets = new[]{Planets.Sun,Planets.Earth,Planets.Moon,Planets.NorthNode,Planets.SouthNode,Planets.Mercury,Planets.Venus,Planets.Mars,Planets.Jupiter,Planets.Saturn,Planets.Uranus,Planets.Neptune,Planets.Pluto};
string Gl(double lon) {var a=HumanDesignUtility.ActivationOf(lon);return $"{a.Gate.ToNumber()}.{a.Line.ToNumber()}";}
double Norm(double x)=>((x%360)+360)%360;
double Lon(BodyState s)=>Norm(Math.Atan2(s.Position.Y,s.Position.X)*180/Math.PI);
string? pending=firstInput;
while(pending is {} input){
    pending=Console.ReadLine();
    try {
        using var doc=JsonDocument.Parse(input);
        var id=doc.RootElement.GetProperty("id").GetString();
        var utc=DateTime.Parse(doc.RootElement.GetProperty("birthUtc").GetString()!,CultureInfo.InvariantCulture,DateTimeStyles.AdjustToUniversal|DateTimeStyles.AssumeUniversal);
        var jd=ctx.Calendar.UtcToJulianDay(utc);
        var dt=ctx.Calendar.DeltaT(jd);
        var et=new JulianDay(jd.Value+dt);
        var resolved=router.GetType().GetMethod("Resolve",bf)!.Invoke(router,new object[]{flags,CelestialBody.Sun,et})!;
        var routedSource=resolved.GetType().GetField("Item1")!.GetValue(resolved)!;
        var routedFlags=(EphemerisFlags)resolved.GetType().GetField("Item2")!.GetValue(resolved)!;
        var state=ctx.Bodies.ComputeUt(CelestialBody.Sun,jd,flags);
        var pos=eph.PlanetsPosition(Planets.Sun,utc);
        if(state.Source != (mode=="jpl" ? EphemerisSource.Jpl : EphemerisSource.SwissEph))throw new InvalidOperationException("Unexpected fallback source: "+state.Source);
        if(Math.Abs(Lon(state)-pos.Longitude)>1e-10)throw new InvalidOperationException("Adapter/direct mismatch");
        var acts=new Dictionary<string,string>();var raw=new Dictionary<string,object>();
        var sourceByPoint=new Dictionary<string,object>();
        for(var i=0;i<planets.Length;i++){
            var p=eph.PlanetsPosition(planets[i],utc);acts[names[i]]=Gl(p.Longitude);
            raw[names[i]]=new{longitude=p.Longitude,longitudeDecimal12=p.Longitude.ToString("F12",CultureInfo.InvariantCulture),speedLongitude=p.SpeedLongitude};
            var traceBody=planets[i] is Planets.Earth ? CelestialBody.Sun : planets[i] is Planets.NorthNode or Planets.SouthNode ? CelestialBody.TrueNode : Enum.Parse<CelestialBody>(planets[i].ToString());
            var traceFlags=flags;
            if(planets[i] is Planets.NorthNode or Planets.SouthNode){
                var nodeRequest=eph.GetType().GetMethod("ResolveNodeRequest",bf)!.Invoke(eph,new object[]{EphCalculationMode.Tropic})!;
                traceBody=(CelestialBody)nodeRequest.GetType().GetField("Item1")!.GetValue(nodeRequest)!;
                traceFlags=(EphemerisFlags)nodeRequest.GetType().GetField("Item2")!.GetValue(nodeRequest)!;
            }
            var trace=ctx.Bodies.ComputeUt(traceBody,jd,traceFlags);
            if(trace.Source!=state.Source)throw new InvalidOperationException("Unexpected point source: "+names[i]);
            sourceByPoint[names[i]]=new{source=trace.Source.ToString(),computedBody=traceBody.ToString(),flags=(int)traceFlags,derivedAntipode=planets[i] is Planets.Earth or Planets.SouthNode};
        }
        var guardTests=new Dictionary<string,object>();
        if(bias){
            var enabled=pos.Longitude;
            AppContext.SetData("SharpDiagnostic.DeNumber."+sourceKey,0);
            var skipped=Lon(ctx.Bodies.ComputeUt(CelestialBody.Sun,jd,flags));
            var icrsSkipped=Lon(ctx.Bodies.ComputeUt(CelestialBody.Sun,jd,flags|EphemerisFlags.Icrs));
            AppContext.SetData("SharpDiagnostic.DeNumber."+sourceKey,402);
            var de402=Lon(ctx.Bodies.ComputeUt(CelestialBody.Sun,jd,flags));
            AppContext.SetData("SharpDiagnostic.DeNumber."+sourceKey,de);
            var icrsEnabled=Lon(ctx.Bodies.ComputeUt(CelestialBody.Sun,jd,flags|EphemerisFlags.Icrs));
            using var moshier=new EphemerisContextBuilder().Build();
            var mosWithMetadata=Lon(moshier.Bodies.ComputeUt(CelestialBody.Sun,jd,EphemerisFlags.MoshierEph|EphemerisFlags.Speed));
            AppContext.SetData("SharpDiagnostic.DeNumber."+sourceKey,0);
            var mosWithoutMetadata=Lon(moshier.Bodies.ComputeUt(CelestialBody.Sun,jd,EphemerisFlags.MoshierEph|EphemerisFlags.Speed));
            AppContext.SetData("SharpDiagnostic.DeNumber."+sourceKey,de);
            guardTests["de402SkipIdenticalToUnpatched"]=de402==skipped;
            guardTests["icrsSkipIdentical"]=icrsSkipped==icrsEnabled;
            guardTests["moshierUnaffected"]=mosWithMetadata==mosWithoutMetadata;
            guardTests["nonIcrsDe441BiasApplied"]=enabled!=skipped;
            guardTests["enabledMinusUnpatchedMas"]=(enabled-skipped)*3600000;
            if(de402!=skipped || icrsSkipped!=icrsEnabled || mosWithMetadata!=mosWithoutMetadata || enabled==skipped)throw new InvalidOperationException("Bias guard regression");
        }
        Console.WriteLine(JsonSerializer.Serialize(new{
            id,birthUtc=utc.ToString("yyyy-MM-ddTHH:mm:ssZ"),mode,bias,assembly,
            julianDayUt=jd.Value,deltaTSeconds=dt*86400,julianDayEt=et.Value,
            sourceHeaderDeNumber=de,actualSourceHeader,requestedFlags=(int)flags,resolvedFlags=(int)routedFlags,
            runtimeSource=state.Source.ToString(),runtimeSourceType=routedSource.GetType().FullName,
            runtimePreferredSource=ctx.PreferredSource.ToString(),moshierEnabled=router.GetType().GetMethod("Has",bf)!.Invoke(router,new object[]{EphemerisSource.Moshier}),
            adapterEqualsActualDirectSource=Math.Abs(Lon(state)-pos.Longitude)<=1e-10,
            sunLongitude=pos.Longitude,sunLongitudeDecimal12=pos.Longitude.ToString("F12",CultureInfo.InvariantCulture),sunLongitudeSpeedDegreesPerDay=pos.SpeedLongitude,
            nativeSunGateLine=acts["sun"],nativeEarthGateLine=acts["earth"],
            nativePersonalityActivationOracle=acts,personalityRawPositions=raw,runtimeSourceByPoint=sourceByPoint,
            earthMethod="Sharp adapter apparent Sun antipode (+180 degrees); not zero-vector geocentric Earth",
            biasDeMetadataOrigin="verified actual registered source reader Header, injected only into diagnostic AppContext",
            biasGuardTests=guardTests,
            nativeMappingOracle="SharpAstrology.HumanDesign 1.2.0 HumanDesignUtility.ActivationOf unchanged; official output fields added by shared frozen_mapping.py"
        }));
    }catch(Exception e){Console.WriteLine(JsonSerializer.Serialize(new{error=e.ToString()}));}
}
