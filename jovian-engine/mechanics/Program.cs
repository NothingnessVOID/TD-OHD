using System.Text.Json;
using System.Text.Json.Nodes;
using SharpAstrology.DataModels;
using SharpAstrology.Enums;
using SharpAstrology.Interfaces;
using SharpChartEngine;

// Astronomy remains external. Reuse the exact production mapping and mechanics.
while (Console.ReadLine() is { } line)
{
    try
    {
        using var request = JsonDocument.Parse(line);
        var data = request.RootElement;
        var birth = TransitCore.ParseUtc(data.GetProperty("birthUtc").GetString()!);
        var design = TransitCore.ParseUtc(data.GetProperty("designUtc").GetString()!);
        var provider = new SuppliedPositions(data, birth);
        var chart = new HumanDesignChart(birth, design, provider);
        var result = JsonNode.Parse(TransitCore.SerializeBirth(chart, birth, design))!.AsObject();
        result["connectedComponents"] = JsonSerializer.SerializeToNode(chart.ConnectedComponents.ToDictionary(x => x.Key.ToString(), x => x.Value));
        Console.WriteLine(result.ToJsonString());
    }
    catch (Exception exception) { Console.WriteLine(JsonSerializer.Serialize(new { error = exception.Message })); }
}

sealed class SuppliedPositions(JsonElement data, DateTime birth) : IPlanetPositionProvider
{
    public PlanetPosition PlanetsPosition(Planets planet, DateTime instant, EphCalculationMode mode = EphCalculationMode.Tropic)
    {
        if (mode != EphCalculationMode.Tropic) throw new ArgumentException("Prototype is tropical only");
        var key = char.ToLowerInvariant(planet.ToString()[0]) + planet.ToString()[1..];
        var positions = data.GetProperty(instant == birth ? "personality" : "design");
        var value = positions.GetProperty(key);
        // DateTime is an identity label; it never resamples or rounds the supplied longitude.
        return new PlanetPosition { Longitude = value.GetProperty("longitude").GetDouble(),
            SpeedLongitude = value.TryGetProperty("speedDegreesPerDay", out var speed) ? speed.GetDouble() : 0 };
    }
}
