# Third-party notices for the birth chart engine

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
