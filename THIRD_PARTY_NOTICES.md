# Third-party notices for the Modern browser release

- SharpAstrology.Base 0.14.0, Christian Reizner. MIT. Exact NuGet repository commit: `b029ea0a57fabf84b0d0209aa8d6871b6e64a41c`. Source: https://github.com/CReizner/SharpAstrology.Base . Full notice: `engine-wasm/licenses/SharpAstrology.Base-MIT.txt`.
- SharpAstrology.HumanDesign 1.2.0, Christian Reizner. MIT. Source: https://github.com/CReizner/SharpAstrology.HumanDesign . License: `engine-wasm/licenses/SharpAstrology.HumanDesign-MIT.txt`.
- SharpAstrology.SwissEph 0.5.1, Christian Reizner. AGPL-3.0 with Swiss Ephemeris notices. Source: https://github.com/CReizner/SharpAstrology.SwissEph . Licenses: `engine-wasm/licenses/SharpAstrology.SwissEph-AGPL-3.0.txt` and `engine-wasm/licenses/SharpAstrology.SwissEph-SwissEph.txt`.
- Swiss Ephemeris `.se1` files, Astrodienst AG. Source snapshot: https://github.com/aloistr/swisseph/tree/3186eed405bd2b4ff520c91d0b27bb25e9d75106/ephe . The file manifest in `engine-wasm/ephemeris-manifest.json` records every redistributed file and checksum. Original notice: `engine-wasm/licenses/Swiss-Ephemeris-LICENSE.txt`.

The browser WASM bundle is built from these pinned packages and files. The notices above are part of the distributed source and should remain with any redistributed build.

## Local reference data and display catalogs

The local static modules in `src/lib/human-design/catalog.js`,
`english-readings.js`, and `bodygraph-geometry.js` preserve the topology,
vocabulary, English readings, and SVG geometry previously supplied by
Unforced Dev's NatalEngine 1.6.0 (MIT). They contain data only, not a retained
calculation engine. Local non-astronomical graph analysis and interpretive output
contracts in `src/lib/gene-keys.js`, `src/lib/transit-analysis.js`,
`src/lib/human-design/connection.js`, `src/lib/human-design/penta.js`,
`src/lib/human-design/svg-renderer.js`,
`src/lib/profile-storage.js`, and `src/lib/timezone.js`
are also adapted from this MIT source. The graph modules derive display and
relationship results from SharpAstrology positions and gates; the storage and
timezone modules preserve existing birth-data entry and persistence behavior.
They do not retain the old astronomical engine or its runtime dependency. The SVG geometry originates from jdempcy/hdkit (MIT),
whose attribution is retained below.

Source provenance: https://github.com/Unforced-Dev/natalengine and
https://github.com/jdempcy/hdkit .

### Unforced Dev data license

```text
MIT License

Copyright (c) 2024 unforced

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### hdkit geometry license

```text
MIT License

Copyright (c) 2023 Jonah Dempcy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## TD-OHD SwissEph parity patch

SwissEph 0.5.1 is built from the pinned repository-local snapshot in
`third_party/SharpAstrology.SwissEph`, upstream commit
`342a57997c1b987e7949acc98897c8b73d05939a`. Original AGPL-3.0 and
Swiss Ephemeris licenses are preserved there and distributed with the engine.
TD-OHD patch revision: `td-ohd-swiss-parity-v1-true-node-light-time`.
The production changes include UTC/UT1 conversion, DE-dependent ICRS to J2000
frame bias, apparent Moon emission-time Earth-center refetch, and True Node
apparent lunar light time. Engine signature: `59b90e629033cc7faf95`.
Patched source aggregate SHA-256:
`2af6f9b5773b3b157c533f7e0e0ba4295999723bb5ee8467d69ee2cb7363b1e7`.
Source hashes and the eight modified-file records are in
`third_party/SharpAstrology.SwissEph/patch-manifest.json`. HumanDesign 1.2.0 and Base 0.14.0
remain unmodified NuGet dependencies.


## Browser framework and image export

- .NET WebAssembly runtime and framework 10.0.12, .NET Foundation / Microsoft and contributors: MIT plus bundled third-party terms. Full package notices: `engine-wasm/licenses/dotnet-runtime-MIT.txt` and `engine-wasm/licenses/dotnet-runtime-THIRD-PARTY-NOTICES.txt`. The latter includes ICU/Unicode terms for the distributed globalization data; inclusion does not imply every listed upstream dependency survives trimming.
- ICU 68.2.0.9, pinned dotnet/icu source `f3ce4639f5ad59da714912bb6209369d3fb2f5cd`: complete ICU and nested third-party notices in `engine-wasm/licenses/ICU-LICENSE.txt`, in addition to the runtime notice above.
- System.Numerics.Tensors 10.0.7: MIT plus package third-party notices. Files: `engine-wasm/licenses/System.Numerics.Tensors-MIT.txt` and `engine-wasm/licenses/System.Numerics.Tensors-THIRD-PARTY-NOTICES.txt`.
- Vite-generated browser modulepreload helpers: MIT core, from the pinned Vite package. Complete original package license/notices: `engine-wasm/licenses/Vite-generated-helpers-LICENSE.txt`. The Vite build executable and its full dependency graph are not browser runtime components.
- html-to-image 1.11.13, W.Y.: MIT. Used by browser image export. Full installed-package notice: `engine-wasm/licenses/html-to-image-MIT.txt`.

The existing build copies this document to `/engine/THIRD_PARTY_NOTICES.md`
and the full license directory to `/engine/licenses/`. Release provenance and
build/source materials are recorded in `docs/release-licensing-v1/`.

OpenHumanDesign inherited application code is attributed to Unforced Dev:
https://github.com/Unforced-Dev/open-human-design . Its upstream README
declares MIT; the retained Unforced Dev and hdkit notices above identify the
known inherited material. This attribution does not establish ownership or
a blanket license for all later TD-OHD content.

This document preserves third-party notices. It does not select a license
for the combined TD-OHD release, establish full compliance, or relicense
third-party code. Jovian-Compatible native research is not included in this
Modern browser release.
