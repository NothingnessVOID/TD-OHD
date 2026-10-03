using System.Globalization;
using System.Reflection;
using System.Text.Json;
using SharpAstrology.DataModels;
using SharpAstrology.Enums;
using SharpAstrology.Ephemerides;
using SharpAstrology.ExtensionMethods;
using SharpAstrology.Interfaces;
using SharpAstrology.SwissEphemerides;
using SharpAstrology.SwissEphemerides.Application.Bodies;
using SharpAstrology.SwissEphemerides.Application.Calendar;
using SharpAstrology.SwissEphemerides.Domain.Frames;
using SharpAstrology.SwissEphemerides.Domain.Mathematics;
using SharpAstrology.SwissEphemerides.Domain.Time;
using SharpAstrology.Utility;
using SharpChartEngine;

using var eph = new SwissEphemeridesService(args[0], EphType.Swiss, allowMoshierFallback:false).CreateContext();
var calendar = new CalendarService();
var flags = EphemerisFlags.SwissEph | EphemerisFlags.Speed;
var points = new[]{Planets.Sun,Planets.Earth,Planets.Moon,Planets.NorthNode,Planets.SouthNode,Planets.Mercury,Planets.Venus,Planets.Mars,Planets.Jupiter,Planets.Saturn,Planets.Uranus,Planets.Neptune,Planets.Pluto};
string Name(Planets p)=>p.ToString()[..1].ToLowerInvariant()+p.ToString()[1..];
object Activation(PlanetPosition p){var a=HumanDesignUtility.ActivationOf(p.Longitude);return new {longitude=p.Longitude,speed=p.SpeedLongitude,gate=a.Gate.ToNumber(),line=a.Line.ToNumber(),color=a.Color.ToNumber(),tone=a.Tone.ToNumber(),@base=a.Base.ToNumber()};}
object Epoch(IPlanetPositionProvider provider,DateTime utc)=>points.ToDictionary(Name,p=>Activation(provider.PlanetsPosition(p,utc)));
JsonElement Chart(IPlanetPositionProvider provider,DateTime birth,DateTime design)=>JsonDocument.Parse(TransitCore.SerializeBirth(new HumanDesignChart(birth,design,provider),birth,design)).RootElement.Clone();
void Check(bool result,string label){if(!result)throw new Exception("Regression: "+label);}
// Synthetic raw state isolates the bias position/speed transform from every other correction.
var vector = new BodyState(new Vec3(1,.2,.3),new Vec3(.01,.02,.03),1,EphemerisSource.SwissEph,BodyStateFrame.BarycentricJ2000Equator,441);
var zero = vector with{Position=Vec3.Zero,Velocity=Vec3.Zero};
var guardFlags=flags|EphemerisFlags.TruePosition|EphemerisFlags.Barycentric|EphemerisFlags.Equatorial|EphemerisFlags.J2000Equinox|EphemerisFlags.NoNutation;
var pipe=new CorrectionPipeline();var fetcher=new NoFetch();
var biased=pipe.Apply(vector,zero,zero,zero,fetcher,CelestialBody.Mercury,JulianDay.J2000,guardFlags);
Span<double> expected=stackalloc double[]{1,.2,.3,.01,.02,.03};
CatalogFrameTransforms.IcrsBias(expected,true,false);
Check(biased.Position==new Vec3(expected[0],expected[1],expected[2]),"bias position/J2000");
Check(biased.Velocity==new Vec3(expected[3],expected[4],expected[5]),"bias speed");
var icrs=pipe.Apply(vector,zero,zero,zero,fetcher,CelestialBody.Mercury,JulianDay.J2000,guardFlags|EphemerisFlags.Icrs);
Check(icrs.Position==vector.Position && icrs.Velocity==vector.Velocity,"ICRS skip");
var old=pipe.Apply(vector with{DeNumber=402},zero,zero,zero,fetcher,CelestialBody.Mercury,JulianDay.J2000,guardFlags);
Check(old.Position==vector.Position && old.Velocity==vector.Velocity,"old DE skip");
Check(CorrectionPipeline.ShouldApplyFrameBias(EphemerisSource.Moshier,0,flags)==CorrectionPipeline.ShouldApplyFrameBias(EphemerisSource.Moshier,402,flags),"Moshier ignores JPL metadata");
Check(CorrectionPipeline.ShouldApplyFrameBias(EphemerisSource.Moshier,0,flags),"C Moshier effective DE403");
Check(!CorrectionPipeline.ShouldApplyFrameBias(EphemerisSource.Moshier,441,flags|EphemerisFlags.Icrs),"Moshier ICRS skip");
while(Console.ReadLine() is {} line){
 try{
  using var doc=JsonDocument.Parse(line);var r=doc.RootElement;
  var birth=TransitCore.ParseUtc(r.GetProperty("birthUtc").GetString()!);
  var design=eph.DesignJulianDay(birth);
  var jd=calendar.UtcToJulianDay(birth);var back=calendar.JulianDayToUtc(jd);
  var fraction=birth.AddTicks(1234567);var fractionJd=calendar.UtcToJulianDay(fraction);
  var pair=calendar.UtcToJulianDayPair(fraction.Year,fraction.Month,fraction.Day,fraction.Hour,fraction.Minute,fraction.Second+fraction.Ticks%TimeSpan.TicksPerSecond/(double)TimeSpan.TicksPerSecond);
  Check(fractionJd==pair.Ut1,"fractional ticks retained");
  Check(Math.Abs((calendar.JulianDayToUtc(fractionJd)-fraction).TotalSeconds)<.0001,"fractional inverse JD precision");
  var result=new Dictionary<string,object>{["id"]=r.GetProperty("id").GetString()!,["birthUtc"]=birth.ToString("O"),["designUtc"]=design.ToString("O"),["ut1"]=jd.Value,["roundTripUtc"]=back.ToString("O"),["fractionUtc"]=fraction.ToString("O"),["fractionUt1"]=fractionJd.Value,["guardsPassed"]=true,["personality"]=Epoch(eph,birth),["design"]=Epoch(eph,design),["chart"]=Chart(eph,birth,design)};
  if(r.TryGetProperty("oracle",out var oracle)){
   var cDesign=TransitCore.ParseUtc(oracle.GetProperty("designUtc").GetString()!);
   var provider=new FixtureProvider(oracle,birth,cDesign);
   result["oraclePersonality"]=Epoch(provider,birth);result["oracleDesign"]=Epoch(provider,cDesign);
   result["oracleChart"]=Chart(provider,birth,cDesign);
   result["sharpAtOracleDesign"]=Epoch(eph,cDesign);
  }
  Console.WriteLine(JsonSerializer.Serialize(result));
 }catch(Exception error){Console.WriteLine(JsonSerializer.Serialize(new{error=error.ToString()}));}
}
readonly struct NoFetch:CorrectionPipeline.IRefetchProvider{
 public bool HasEarthRefetch=>false;
 public BodyState RefetchBody(CelestialBody b,JulianDay jd,EphemerisFlags f)=>throw new Exception("unexpected refetch");
 public BodyState RefetchEarth(JulianDay jd,EphemerisFlags f)=>throw new Exception("unexpected refetch");
}
sealed class FixtureProvider(JsonElement oracle,DateTime birth,DateTime design):IPlanetPositionProvider{
 public PlanetPosition PlanetsPosition(Planets planet,DateTime utc,EphCalculationMode mode=EphCalculationMode.Tropic){
  if(utc!=birth && utc!=design)throw new Exception("unexpected fixture epoch");
  var key=planet.ToString()[..1].ToLowerInvariant()+planet.ToString()[1..];
  var p=oracle.GetProperty(utc==birth?"personality":"design").GetProperty(key);
  return new PlanetPosition{Longitude=p.GetProperty("longitude").GetDouble(),SpeedLongitude=p.GetProperty("speed").GetDouble()};
 }
}
