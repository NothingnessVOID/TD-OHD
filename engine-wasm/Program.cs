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

        static void WriteSide(Utf8JsonWriter writer, string name, Dictionary<Planets, Activation> side)
        {
            writer.WriteStartObject(name);
            foreach (var (planet, activation) in side)
            {
                var key = planet.ToString();
                writer.WriteStartObject(char.ToLowerInvariant(key[0]) + key[1..]);
                writer.WriteNumber("gate", activation.Gate.ToNumber());
                writer.WriteNumber("line", activation.Line.ToNumber());
                writer.WriteNumber("color", activation.Color.ToNumber());
                writer.WriteNumber("tone", activation.Tone.ToNumber());
                writer.WriteNumber("base", activation.Base.ToNumber());
                writer.WriteNumber("longitude", activation.Longitude);
                writer.WriteEndObject();
            }
            writer.WriteEndObject();
        }

        var buffer = new ArrayBufferWriter<byte>();
        using var writer = new Utf8JsonWriter(buffer);
        writer.WriteStartObject();
        writer.WriteString("birthUtc", birth.ToString("O"));
        writer.WriteString("designUtc", designDate.ToString("O"));
        writer.WriteString("type", chart.Type.ToString());
        writer.WriteString("authority", chart.Authority.ToString());
        writer.WriteString("profile", chart.Profile.ToText());
        writer.WriteString("definition", chart.SplitDefinition.ToString());
        writer.WriteString("incarnationCross", chart.IncarnationCross.ToString());
        WriteSide(writer, "personality", chart.PersonalityActivation);
        WriteSide(writer, "design", chart.DesignActivation);
        writer.WriteStartArray("channels");
        foreach (var channel in chart.ActiveChannels) writer.WriteStringValue(channel.ToString());
        writer.WriteEndArray();
        writer.WriteStartObject("centers");
        foreach (var (center, activation) in chart.CenterActivations)
            writer.WriteString(center.ToString(), activation.ToString());
        writer.WriteEndObject();
        writer.WriteEndObject();
        writer.Flush();
        return System.Text.Encoding.UTF8.GetString(buffer.WrittenSpan);
    }

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
