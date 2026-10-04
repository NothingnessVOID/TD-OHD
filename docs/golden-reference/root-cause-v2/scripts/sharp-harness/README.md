# Sharp current / frame-bias diagnostic harness

This harness never installs or changes TD-OHD. Its input is the nine frozen `birthUtc` values; it does not reconvert local birth time. All build output and temporary patched source must remain outside the repository.

## Reproduce

Run the parent `sharp-run.py` with .NET SDK 10 and a source checkout containing SwissEph commit `342a57997c1b987e7949acc98897c8b73d05939a`:

```sh
python3 docs/golden-reference/root-cause-v2/scripts/sharp-run.py \
  --dotnet /path/to/dotnet \
  --source-checkout /path/to/SharpAstrology.SwissEph \
  --swiss-dir /path/to/frozen-DE441-se1 \
  --jpl441-dir /path/to/raw-JPL-kernels \
  --workdir /path/to/fresh-external-build-directory \
  --output /path/to/audit-output
```

The runner checks the exact bytes and SHA-256 of both `.se1` files and `de441.eph` before calculating. The expected assets and provenance are recorded in `../../asset-hashes-c.json`. The raw kernel remains a local asset. It is not committed.

The original assembly is NuGet SwissEph 0.5.1. The diagnostic assembly is built from an archive of that package's exact source commit with only the patch in `../sharp-frame-bias-diagnostic.patch`. Base 0.14.0 and HumanDesign 1.2.0 are pinned in both paths. `environment-sharp.json` records the source, package, and assembly fingerprints.

## Runtime source proof

`EphType.Jpl` is the actual high-level adapter configuration. The harness inspects that same adapter's context and registered reader, verifies DE441 and the actual reader header file name/range/length, resolves Sun flags, calculates Sun through `ComputeUt`, and checks equality with the adapter longitude. Each of the 13 Personality points also records its actual returned `BodyState.Source` and the adapter flags. The Moshier source is disabled. The JPL group returns `Jpl`, not a silently substituted Swiss or Moshier value.

Earth is the adapter's apparent Sun antipode. South Node is the True North Node antipode. The True Node flags intentionally reflect the unchanged adapter's geometric node route rather than forcing the Sun/planet flags onto it.

## Diagnostic bias metadata

Version 0.5.1's `BodyState` does not carry a DE number. The harness reads DE from the registered source reader and injects source-specific `AppContext` metadata solely for this diagnostic. Missing metadata means no bias. The insertion is after annual aberration and before precession. It calls the existing IAU-model-aware `CatalogFrameTransforms.IcrsBias` with `backward:false` and rotates speed when requested.

Its guards require non-ICRS output and DE >= 403. Moshier and unknown sources map to DE 0 and skip the call. No other path, already-biased node calculation, raw source frame, Human Design offset/floor, or Design calculation is changed.

For each of 18 biased samples, guard tests check DE402 skip, ICRS skip, Moshier unchanged, and DE441 bias applied. The ordinary correction pipeline has no corrected-state cache; cached source coefficients remain reusable. Rebuilt frozen-source output with bias metadata disabled is also compared with the original NuGet assembly for all 9 × 13 longitude/speed pairs for each source, with exact equality required.

## Mapping and scope

The raw C# output includes the unmodified HD 1.2.0 `ActivationOf` result as an oracle. Formal Gate.Line and numerical boundary fields are produced by the shared `../frozen_mapping.py`, with every oracle value checked for equality. No epsilon or alternate offset is used. Next-line distance and signed distance past the Jovian expected line start are different fields.

The recorded values cover all 13 Personality activations. The experiment does not claim a full Design/Profile/Cross golden repair. In particular, longitude parity after bias does not prove speed parity: small Sun-speed residuals against Swiss C remain separately visible in the numerical comparison.
