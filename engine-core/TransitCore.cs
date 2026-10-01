using System.Buffers;
using System.Globalization;
using System.Text.Json;
using SharpAstrology.DataModels;
using SharpAstrology.Definitions;
using SharpAstrology.Enums;
using SharpAstrology.ExtensionMethods;
using SharpAstrology.Interfaces;
using SharpAstrology.Utility;

namespace SharpChartEngine;

/// <summary>Official SharpAstrology activation calculation shared by browser and native generator.</summary>
public static class TransitCore
{
    public static DateTime ParseUtc(string utcIso)
    {
        if (!(utcIso.EndsWith("Z", StringComparison.OrdinalIgnoreCase) || utcIso.EndsWith("+00:00", StringComparison.Ordinal)))
            throw new ArgumentException("Instant must include a UTC timezone suffix");
        return DateTime.Parse(utcIso, CultureInfo.InvariantCulture,
            DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
    }

    public static string Calculate(DateTime utc, IPlanetPositionProvider eph)
    {
        var buffer = new ArrayBufferWriter<byte>();
        using var writer = new Utf8JsonWriter(buffer);
        WriteTransit(writer, utc, eph);
        writer.Flush();
        return System.Text.Encoding.UTF8.GetString(buffer.WrittenSpan);
    }

    public static string CalculateBatch(IEnumerable<DateTime> instants, IPlanetPositionProvider eph)
    {
        var buffer = new ArrayBufferWriter<byte>();
        using var writer = new Utf8JsonWriter(buffer);
        writer.WriteStartArray();
        foreach (var instant in instants) WriteTransit(writer, instant, eph);
        writer.WriteEndArray();
        writer.Flush();
        return System.Text.Encoding.UTF8.GetString(buffer.WrittenSpan);
    }

    private static void WriteTransit(Utf8JsonWriter writer, DateTime utc, IPlanetPositionProvider eph)
    {
        if (utc.Kind != DateTimeKind.Utc) throw new ArgumentException("Transit instant must be UTC");
        writer.WriteStartObject();
        writer.WriteString("utc", utc.ToString("O"));
        writer.WriteStartObject("activations");
        foreach (var planet in HumanDesignDefaults.HumanDesignPlanets)
        {
            // Use the library conversion rather than maintaining a parallel gate wheel.
            var activation = HumanDesignUtility.ActivationOf(eph.PlanetsPosition(planet, utc).Longitude);
            var name = planet.ToString();
            writer.WriteStartObject(char.ToLowerInvariant(name[0]) + name[1..]);
            WriteActivation(writer, activation);
            writer.WriteEndObject();
        }
        writer.WriteEndObject();
        writer.WriteEndObject();
    }

    private static void WriteActivation(Utf8JsonWriter writer, Activation activation)
    {
        writer.WriteNumber("gate", activation.Gate.ToNumber());
        writer.WriteNumber("line", activation.Line.ToNumber());
        writer.WriteNumber("color", activation.Color.ToNumber());
        writer.WriteNumber("tone", activation.Tone.ToNumber());
        writer.WriteNumber("base", activation.Base.ToNumber());
        writer.WriteNumber("longitude", activation.Longitude);
    }

    // Existing birth serialization is shared unchanged so native audits can use the browser contract.
    public static string SerializeBirth(HumanDesignChart chart, DateTime birth, DateTime designDate)
    {
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
}
