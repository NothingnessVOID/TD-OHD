using System.Text.Json;
using SharpAstrology.SwissEphemerides;
using SharpAstrology.SwissEphemerides.Application.Bodies;
using SharpAstrology.SwissEphemerides.Domain.Mathematics;
using SharpAstrology.SwissEphemerides.Domain.Frames;
using SharpAstrology.SwissEphemerides.Domain.Time;

// Distinct center/observer callbacks make accidental topocentric lifting fail.
var flags=EphemerisFlags.Speed|EphemerisFlags.Topocentric|EphemerisFlags.Equatorial|EphemerisFlags.J2000Equinox|EphemerisFlags.NoNutation|EphemerisFlags.Icrs|EphemerisFlags.NoAberration;
var moon=new BodyState(new Vec3(.002,.001,.0001),Vec3.Zero,.002,EphemerisSource.SwissEph,BodyStateFrame.GeocentricJ2000Equator,441);
var center=moon with {Position=new Vec3(1,0,0),Frame=BodyStateFrame.BarycentricJ2000Equator};
var observer=center with{Position=new Vec3(1,.00003,0)};
var emissionCenter=center with {Position=new Vec3(1-.0000002,0,0)};
var fetcher=new GuardFetch(moon,emissionCenter,observer);
var pipe=new CorrectionPipeline();
var result=pipe.Apply(moon,observer,center,center with{Position=Vec3.Zero},fetcher,CelestialBody.Moon,JulianDay.J2000,flags);
var expected=moon.Position+emissionCenter.Position-observer.Position;
if ((result.Position-expected).Length>1e-16)throw new Exception("Earth center vs observer lift/double parallax regression");
var trueResult=pipe.Apply(moon,observer,center,center with{Position=Vec3.Zero},new NoFetch(),CelestialBody.Moon,JulianDay.J2000,flags|EphemerisFlags.TruePosition);
if ((trueResult.Position-(moon.Position+center.Position-observer.Position)).Length>1e-16)throw new Exception("true position should not refetch");
using var swiss=new EphemerisContextBuilder().UseSwissEphFiles(args[0]).DisableMoshier().Build();
using var jpl=args.Length>1?new EphemerisContextBuilder().UseJplFile(args[1]).DisableMoshier().Build():null;
using var moshier=new EphemerisContextBuilder().Build();
while(Console.ReadLine() is {} line){
 try{
  using var doc=JsonDocument.Parse(line);var r=doc.RootElement;
  var f=(EphemerisFlags)r.GetProperty("flags").GetInt32();
  ObserverLocation? obs=r.TryGetProperty("observer",out var o)?new(o[0].GetDouble(),o[1].GetDouble(),o[2].GetDouble()):null;
  var ctx=(f&EphemerisFlags.JplEph)!=0?jpl!:(f&EphemerisFlags.MoshierEph)!=0?moshier:swiss;
  var s=ctx.Bodies.Compute(CelestialBody.Moon,new JulianDay(r.GetProperty("tt").GetDouble()),f,obs);
  var x=s.Position;var v=s.Velocity;
  var lon=Math.Atan2(x.Y,x.X)*180/Math.PI;if(lon<0)lon+=360;
  var speed=(x.X*v.Y-x.Y*v.X)/(x.X*x.X+x.Y*x.Y)*180/Math.PI;
  Console.WriteLine(JsonSerializer.Serialize(new{vector=new[]{x.X,x.Y,x.Z,v.X,v.Y,v.Z},longitude=lon,speed,guardsPassed=true}));
 }catch(Exception error){Console.WriteLine(JsonSerializer.Serialize(new{error=error.ToString()}));}
}
readonly struct GuardFetch(BodyState moon,BodyState center,BodyState observer):CorrectionPipeline.IRefetchProvider{
 public bool HasEarthRefetch=>true;
 public BodyState RefetchBody(CelestialBody b,JulianDay jd,EphemerisFlags f)=>moon;
 public BodyState RefetchEarthCenter(JulianDay jd,EphemerisFlags f)=>center;
 public BodyState RefetchEarth(JulianDay jd,EphemerisFlags f)=>observer;
}
readonly struct NoFetch:CorrectionPipeline.IRefetchProvider{
 public bool HasEarthRefetch=>false;
 public BodyState RefetchBody(CelestialBody b,JulianDay jd,EphemerisFlags f)=>throw new Exception("unexpected refetch");
 public BodyState RefetchEarthCenter(JulianDay jd,EphemerisFlags f)=>throw new Exception("unexpected center refetch");
 public BodyState RefetchEarth(JulianDay jd,EphemerisFlags f)=>throw new Exception("unexpected observer refetch");
}
