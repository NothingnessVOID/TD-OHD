using System.Text.Json;
using SharpAstrology.DataModels;
using SharpAstrology.Enums;
using SharpAstrology.Ephemerides;
using SharpAstrology.ExtensionMethods;
using SharpChartEngine;

var epheIndex = Array.IndexOf(args, "--ephe");
if (epheIndex < 0 || epheIndex + 1 >= args.Length)
{
    Console.Error.WriteLine("Usage: SharpTransitGenerator --ephe /absolute/path/to/ephe");
    return 2;
}
var epheRoot = Path.GetFullPath(args[epheIndex + 1]);
using var eph = new SwissEphemeridesService(rootPathToEph: epheRoot,
    ephType: EphType.Swiss, allowMoshierFallback: false).CreateContext();
// One shared file-based context for the entire JSON-lines process; stdout is protocol only.
while (Console.ReadLine() is { } line)
{
    try
    {
        using var request = JsonDocument.Parse(line);
        var root = request.RootElement;
        if (root.TryGetProperty("birthUtc", out var birthValue))
        {
            var birth = TransitCore.ParseUtc(birthValue.GetString()!);
            var design = eph.DesignJulianDay(birth);
            var chart = new HumanDesignChart(birth, design, eph);
            Console.WriteLine(TransitCore.SerializeBirth(chart, birth, design));
        }
        else
        {
            var instants = root.GetProperty("utcInstants").EnumerateArray()
                .Select(value => TransitCore.ParseUtc(value.GetString()!)).ToArray();
            Console.WriteLine(TransitCore.CalculateBatch(instants, eph));
        }
    }
    catch (Exception exception)
    {
        Console.WriteLine(JsonSerializer.Serialize(new { error = exception.Message }));
    }
}
return 0;
