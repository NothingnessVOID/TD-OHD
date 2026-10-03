using System.Text.Json;
using SharpAstrology.SwissEphemerides;
using SharpAstrology.SwissEphemerides.Application.Bodies;
using SharpAstrology.SwissEphemerides.Application.Calendar;
using SharpAstrology.SwissEphemerides.Domain.Constants;
using SharpAstrology.SwissEphemerides.Domain.Mathematics;
using SharpAstrology.SwissEphemerides.Domain.Time;

// Source-spy tests verify emission epochs and raw velocity fetching for
// every speed/nutation/source branch. No production trace hooks required.
var guardCount=0;
foreach(var source in new[]{EphemerisSource.SwissEph,EphemerisSource.Jpl,EphemerisSource.Moshier})
foreach(var truth in new[]{false,true})
foreach(var speed in new[]{false,true})
foreach(var nutation in new[]{false,true}) {
 var fake=new SpySource(source);var bodies=new BodyService(new SourceRouter(new[]{fake}),new CalendarService());
 var flags=source switch {EphemerisSource.SwissEph=>EphemerisFlags.SwissEph,EphemerisSource.Jpl=>EphemerisFlags.JplEph,_=>EphemerisFlags.MoshierEph};
 if(truth)flags|=EphemerisFlags.TruePosition;if(speed)flags|=EphemerisFlags.Speed;if(!nutation)flags|=EphemerisFlags.NoNutation;
 var r=bodies.Compute(CelestialBody.TrueNode,new JulianDay(2457057.7896664813),flags);
 var samples=speed?3:1;var retard=source!=EphemerisSource.Moshier&&!truth;
 if(fake.Calls.Count!=samples*(retard?2:1))throw new Exception("Unexpected lunar fetch count");
 for(var i=0;i<fake.Calls.Count;i++) {
  var c=fake.Calls[i];if((c.flags&EphemerisFlags.Speed)==0)throw new Exception("Raw lunar velocity missing");
  if(retard&&i%2==1) {
   var t=fake.Calls[i-1].jd;var expected=t-SpySource.Position(t).Length*AstronomicalConstants.LightTimeAuPerDay;
   if(c.jd!=expected)throw new Exception("Incorrect light-time epoch");
  }
 }
 if(!speed&&r.Velocity!=Vec3.Zero)throw new Exception("No-speed API leaked velocity");
 guardCount++;
}
using var swiss=new EphemerisContextBuilder().UseSwissEphFiles(args[0]).DisableMoshier().Build();
using var jpl=args.Length>1?new EphemerisContextBuilder().UseJplFile(args[1]).DisableMoshier().Build():null;
using var moshier=new EphemerisContextBuilder().Build();
while(Console.ReadLine() is {} line) {
 using var doc=JsonDocument.Parse(line);var q=doc.RootElement;var f=(EphemerisFlags)q.GetProperty("flags").GetInt32();
 var context=(f&EphemerisFlags.JplEph)!=0?jpl!:(f&EphemerisFlags.MoshierEph)!=0?moshier:swiss;
 var s=context.Bodies.Compute((CelestialBody)q.GetProperty("body").GetInt32(),new JulianDay(q.GetProperty("tt").GetDouble()),f);
 var p=s.Position;var v=s.Velocity;var lon=Math.Atan2(p.Y,p.X)*180/Math.PI;if(lon<0)lon+=360;
 var speed=(p.X*v.Y-p.Y*v.X)/(p.X*p.X+p.Y*p.Y)*180/Math.PI;
 Console.WriteLine(JsonSerializer.Serialize(new{longitude=lon,speed,source=s.Source.ToString(),vector=new[]{p.X,p.Y,p.Z,v.X,v.Y,v.Z},syntheticGuards=guardCount}));
}
sealed class SpySource(EphemerisSource kind):IBodyPositionSource {
 public EphemerisSource Kind=>kind;
 public List<(double jd,EphemerisFlags flags)> Calls=new();
 public bool CanProvide(CelestialBody body)=>body==CelestialBody.Moon;
 public static Vec3 Position(double t)=>new(.002+.0001*(t-2457057.7896664813),.001,.0002);
 public BodyState Compute(CelestialBody body,JulianDay jd,EphemerisFlags flags) {
  Calls.Add((jd.Value,flags));var p=Position(jd.Value);
  return new BodyState(p,new Vec3(.0001,.0002,-.00004),p.Length,Kind,Kind==EphemerisSource.Moshier?BodyStateFrame.GeocentricEclipticOfDate:BodyStateFrame.GeocentricJ2000Equator,441);
 }
}
