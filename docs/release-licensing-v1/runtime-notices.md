# Runtime distribution notices

This evidence applies to the .NET WASM runtime and related assets restored for the release baseline. It is a provenance and notice-preservation check, not a legal guarantee. Unknown or unproved license classifications remain `NOASSERTION`.

## Exact components

| Component | Version | Official source evidence |
| --- | --- | --- |
| .NET SDK used by the prior restored build | 10.0.401 | `SDK 10.0.401`; SDK version is distinct from the runtime version |
| Microsoft.NETCore.App.Runtime.Mono.browser-wasm | 10.0.12 | Package `.nuspec` and `Microsoft.NETCore.App.versions.txt`: dotnet/dotnet commit `95017c711e6afc1085133d440e42b4bd78155701` |
| System.Numerics.Tensors | 10.0.7 | Package `.nuspec`: dotnet/dotnet commit `b16286c2284fecf303dbc12a0bb152476d662e44`; NuGet license expression MIT |
| ICU used by this WASM runtime | 68.2.0.9; transport 10.0.0-rtm.26418.2 | Pinned runtime `eng/Version.Details.xml` references dotnet/icu commit `f3ce4639f5ad59da714912bb6209369d3fb2f5cd`; its `icu/icu4c/source/common/unicode/uvernum.h` declares 68.2.0.9 |

The inspected `engine-wasm/obj/project.assets.json` in the fresh licensing cleanup build pins runtime 10.0.12 and Tensors 10.0.7. The fresh build preserves these resolved versions.

## Preserve these official files unchanged

The exact source copies below were inspected on 2026-10-04. Hashes use SHA-256 of raw bytes, including original newlines. Local source paths are audit evidence; only destination filenames need to be shipped.

### `engine-wasm/licenses/dotnet-runtime-MIT.txt`

Copy from `$NUGET_PACKAGES/microsoft.netcore.app.runtime.mono.browser-wasm/10.0.12/LICENSE.TXT`.

Official source: [https://raw.githubusercontent.com/dotnet/dotnet/95017c711e6afc1085133d440e42b4bd78155701/src/runtime/LICENSE.TXT](https://raw.githubusercontent.com/dotnet/dotnet/95017c711e6afc1085133d440e42b4bd78155701/src/runtime/LICENSE.TXT).

SHA-256: `cfc21f5e8bd655ae997eec916138b707b1d290b83272c02a95c9f821b8c87310`; 1116 bytes.

### `engine-wasm/licenses/dotnet-runtime-THIRD-PARTY-NOTICES.txt`

Copy from `$NUGET_PACKAGES/microsoft.netcore.app.runtime.mono.browser-wasm/10.0.12/THIRD-PARTY-NOTICES.TXT`.

Official source: [https://raw.githubusercontent.com/dotnet/dotnet/95017c711e6afc1085133d440e42b4bd78155701/src/runtime/THIRD-PARTY-NOTICES.TXT](https://raw.githubusercontent.com/dotnet/dotnet/95017c711e6afc1085133d440e42b4bd78155701/src/runtime/THIRD-PARTY-NOTICES.TXT).

SHA-256: `66f1d4e44973185519bb4aa8a9718eb22fc7af2cc532e3ae9cfc4c127ee7fc54`; 76623 bytes.

### `engine-wasm/licenses/System.Numerics.Tensors-MIT.txt`

Copy from `/tmp/td-release-license-runtime/b16286c2-LICENSE.TXT`.

Official source: [https://raw.githubusercontent.com/dotnet/dotnet/b16286c2284fecf303dbc12a0bb152476d662e44/src/runtime/LICENSE.TXT](https://raw.githubusercontent.com/dotnet/dotnet/b16286c2284fecf303dbc12a0bb152476d662e44/src/runtime/LICENSE.TXT).

SHA-256: `cfc21f5e8bd655ae997eec916138b707b1d290b83272c02a95c9f821b8c87310`; 1116 bytes.

### `engine-wasm/licenses/System.Numerics.Tensors-THIRD-PARTY-NOTICES.txt`

Copy from `$NUGET_PACKAGES/system.numerics.tensors/10.0.7/THIRD-PARTY-NOTICES.TXT`.

Official source: [https://api.nuget.org/v3-flatcontainer/system.numerics.tensors/10.0.7/system.numerics.tensors.10.0.7.nupkg](https://api.nuget.org/v3-flatcontainer/system.numerics.tensors/10.0.7/system.numerics.tensors.10.0.7.nupkg).

SHA-256: `6d15e10a101c6bfff2ab4429ed061bf76c456fc4b23ad6b03e0d0f8377148a21`; 78041 bytes.

### `engine-wasm/licenses/ICU-LICENSE.txt`

Copy from `/tmp/td-release-license-runtime/icu-icu-icu4c-LICENSE`.

Official source: [https://raw.githubusercontent.com/dotnet/icu/f3ce4639f5ad59da714912bb6209369d3fb2f5cd/icu/icu4c/LICENSE](https://raw.githubusercontent.com/dotnet/icu/f3ce4639f5ad59da714912bb6209369d3fb2f5cd/icu/icu4c/LICENSE).

SHA-256: `7915b19db903070778581ae05d8bf4ea241b34a05deb51ca4f5cbb15ea1cbba3`; 21025 bytes.

## Scope and verification

The runtime package contains its MIT license and the complete runtime third-party notices. Both byte-match the pinned runtime source files fetched through HTTPS GET. The Tensors NuGet package contains its complete third-party notices but no standalone MIT license text; its MIT declaration and copyright are in the package metadata. Use the pinned source MIT file above to preserve the applicable copyright and permission wording. The Tensors package notices match its pinned source notices after CRLF-to-LF normalization; distribute the package original without normalization.

The runtime notices include the Unicode data copyright and permission notice. The full pinned ICU `icu/icu4c/LICENSE` also includes ICU-specific third-party dictionary, time-zone and double-conversion notices; preserve the whole file. The fork root `LICENSE` differs from the nested ICU license in three Lao dictionary reference URLs; the selected nested file is the actual ICU source directory license and must not be replaced with a current upstream license.

The prior production `public/engine/_framework` includes three uncompressed ICU data shards whose bytes match this runtime package:

| Shard | SHA-256 |
| --- | --- |
| icudt_EFIGS.dat | f1f22d7ad618f24434c30ea8c704cb893de85e50701caba66de3f6a51178c937 |
| icudt_CJK.dat | 4992ed42745cd09930a8769bd155153fb4f7b813d2798cf1cc39e9c4fa549c79 |
| icudt_no_CJK.dat | 2fbb15ecd1183f7eff42bd853c278fa39709a918135d1c061eec05e50fb435fb |

The full icudt.dat has SHA-256 `b4ee4ee58ccc4d549a2816e8c40a9ecce40bf5ec26ba9cd5d89ac1e5191cf1ae`; it was present in the package but was not observed among the prior production output shards. Embedded names contain `icudt68l`, consistent with the pinned ICU version. This does not independently reproduce the upstream ICU build.

A broad official third-party notice file does not prove that every named third-party component is present in the published WASM. Keeping the complete publisher notice is the conservative preservation approach. This report does not assign every subcomponent a license expression or resolve all Emscripten/toolchain attribution obligations; unproved subcomponent presence or exact classifications remain `NOASSERTION`. Rebuilding with another SDK/runtime/package version requires renewing this evidence.

The final release check must verify that `public/engine/licenses` and the built static distribution contain these same five files, with the recorded hashes, and that a discoverable notice index links to them. Merely retaining the files in the source tree is insufficient evidence of distribution.

## Pinned provenance references

* Runtime dependency manifest: https://github.com/dotnet/dotnet/blob/95017c711e6afc1085133d440e42b4bd78155701/src/runtime/eng/Version.Details.xml
* ICU version header: https://github.com/dotnet/icu/blob/f3ce4639f5ad59da714912bb6209369d3fb2f5cd/icu/icu4c/source/common/unicode/uvernum.h
* Runtime package: https://api.nuget.org/v3-flatcontainer/microsoft.netcore.app.runtime.mono.browser-wasm/10.0.12/microsoft.netcore.app.runtime.mono.browser-wasm.10.0.12.nupkg
* Tensors package: https://api.nuget.org/v3-flatcontainer/system.numerics.tensors/10.0.7/system.numerics.tensors.10.0.7.nupkg

The local cached runtime package SHA-256 is `1467752acef8971a61a3f464992f16527c528dcd36ea5d15581f9c9e865ebf3b`; the local cached Tensors package SHA-256 is `0318ae8173c8a18a18865d19cad9c2c3b1cd45ea9e13c10950b090801fb5b6d3`. These package archives were inspected locally; this investigation did not redownload those large archives or validate their NuGet signatures. Their embedded pinned source files were verified against upstream where described above.
