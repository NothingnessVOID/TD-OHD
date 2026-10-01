using System.Runtime.InteropServices.JavaScript;
using System.Runtime.Versioning;
using System.Buffers;
using System.Text.Json;
using SharpAstrology.DataModels;
using SharpAstrology.Enums;
using SharpAstrology.Ephemerides;
using SharpAstrology.ExtensionMethods;

namespace SharpChartEngine;

public static class Program
{
    public static void Main() { }
}

[SupportedOSPlatform("browser")]
public static partial class Bridge
{
    private const string EphemerisRoot = "/ephe";
    private static readonly Dictionary<string, Task> LoadedFiles = [];
    private static readonly HttpClient Http = new();

    [JSExport]
    public static async Task<string> CalculateBirthChart(string utcIso, string assetBase)
    {
        var birth = DateTime.Parse(utcIso, System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal);
        if (birth.Kind != DateTimeKind.Utc) throw new ArgumentException("Birth instant must be UTC");
        // Design is the exact 88-degree solar arc, calculated by SharpAstrology.
        // The preceding ephemeris block is needed when the birth is close to a block edge.
        var blocks = new[] { BlockFor(birth.Year), BlockFor(birth.Year - 1) }.Distinct();
        foreach (var block in blocks) await EnsureBlock(block, assetBase);

        using var eph = new SwissEphemeridesService(
            rootPathToEph: EphemerisRoot,
            ephType: EphType.Swiss,
            allowMoshierFallback: false).CreateContext();
        var designDate = eph.DesignJulianDay(birth);
        await EnsureBlock(BlockFor(designDate.Year), assetBase);
        var chart = new HumanDesignChart(birth, designDate, eph);

        return TransitCore.SerializeBirth(chart, birth, designDate);
    }

    [JSExport]
    public static async Task<string> CalculateTransit(string utcIso, string assetBase)
    {
        var utc = TransitCore.ParseUtc(utcIso);
        await EnsureBlock(BlockFor(utc.Year), assetBase);
        using var eph = CreateTransitContext();
        return TransitCore.Calculate(utc, eph);
    }

    [JSExport]
    public static async Task<string> CalculateTransitBatch(string utcInstantsJson, string assetBase)
    {
        using var values = JsonDocument.Parse(utcInstantsJson);
        if (values.RootElement.ValueKind != JsonValueKind.Array)
            throw new ArgumentException("UTC instants must be a JSON array");
        var instants = values.RootElement.EnumerateArray()
            .Select(value => TransitCore.ParseUtc(value.GetString()!)).ToArray();
        foreach (var block in instants.Select(utc => BlockFor(utc.Year)).Distinct())
            await EnsureBlock(block, assetBase);
        using var eph = CreateTransitContext();
        return TransitCore.CalculateBatch(instants, eph);
    }

    private static SharpAstrology.Interfaces.IEphemerides CreateTransitContext() =>
        new SwissEphemeridesService(rootPathToEph: EphemerisRoot,
            ephType: EphType.Swiss, allowMoshierFallback: false).CreateContext();

    private static int BlockFor(int year) => year / 600 * 6;

    private static async Task EnsureBlock(int block, string assetBase)
    {
        Directory.CreateDirectory(EphemerisRoot);
        foreach (var prefix in new[] { "sepl", "semo" })
        {
            var name = $"{prefix}_{block:00}.se1";
            Task download;
            lock (LoadedFiles)
            {
                if (!LoadedFiles.TryGetValue(name, out download!))
                    LoadedFiles[name] = download = DownloadFile(name, assetBase);
            }
            await download;
        }
    }

    private static async Task DownloadFile(string name, string assetBase)
    {
        try
        {
            var bytes = await Http.GetByteArrayAsync($"{assetBase.TrimEnd('/')}/ephe/{name}");
            await File.WriteAllBytesAsync(Path.Combine(EphemerisRoot, name), bytes);
        }
        catch (Exception exception)
        {
            lock (LoadedFiles) LoadedFiles.Remove(name);
            throw new FileNotFoundException($"Swiss ephemeris file unavailable: {name}", exception);
        }
    }
}
