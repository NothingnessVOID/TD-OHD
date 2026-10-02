using System.Text.Json;
using SharpAstrology.Enums;
using SharpAstrology.Ephemerides;
using SharpAstrology.ExtensionMethods;
using SharpAstrology.SwissEphemerides;
using SharpAstrology.SwissEphemerides.Application.Bodies;
var ephe = args[0];
using var eph = new SwissEphemeridesService(ephe,EphType.Swiss,false).CreateContext();
using var raw = new EphemerisContextBuilder().UseSwissEphFiles(ephe).DisableMoshier().Build();
while(Console.ReadLine() is {} line){
 try{
  var utc=DateTime.Parse(line,null,System.Globalization.DateTimeStyles.AdjustToUniversal|System.Globalization.DateTimeStyles.AssumeUniversal);
  var design=eph.DesignJulianDay(utc);
  object Side(DateTime t){
   var jd=raw.Calendar.UtcToJulianDay(t);
   var flag=EphemerisFlags.SwissEph|EphemerisFlags.Speed;
   var state=raw.Bodies.ComputeUt(CelestialBody.Sun,jd,flag);
   var position=eph.PlanetsPosition(Planets.Sun,t);
   return new{utc=t.ToString("o"),jd=jd.Value,longitude=position.Longitude,source=state.Source.ToString(),frame=state.Frame.ToString(),flags=(int)flag};
  }
  Console.WriteLine(JsonSerializer.Serialize(new{personality=Side(utc),design=Side(design)}));
 }catch(Exception e){Console.WriteLine(JsonSerializer.Serialize(new{error=e.Message}));}
}
