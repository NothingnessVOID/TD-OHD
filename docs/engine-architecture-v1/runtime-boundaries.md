# Runtime boundaries

| Boundary | Files / implementation | Current role |
| --- | --- | --- |
| Contract | `src/lib/engine/contract.js`, `src/lib/engine/api.js` | Browser-safe interface, normalized input/result and provider registration; no native imports. |
| Browser Modern | `src/lib/chart-engine/`, `engine-wasm/`, checked-in patched Swiss C# | Production calculation path, .NET 10 WASM + compressed DE441 Swiss files. |
| Local Modern | `scripts/lib/sharp-native-client.mjs`, `engine-tools/` | Native .NET host for the same Modern astronomy and HD core. |
| Local Jovian | `scripts/lib/birth-engine-providers.mjs`, `jovian-engine/native_backend.py`, external prepared runtime | Node → Python ctypes → original Swiss 1.76.00 C + compressed DE406. Python bridge and Design root orchestration execute on every local calculation. |
| Shared HD mechanics | HD NuGet `1.2.0`, `engine-core/TransitCore.cs`, `src/lib/chart-engine/sharp-contract.js` | Same HD mapping/mechanics dependency and existing serializer/adapter; Jovian supplies astronomical positions through its C# host. |
| Jovian mechanics host | `jovian-engine/mechanics/Program.cs` and `.csproj` | Local C# host, HD package + source-linked serializer; no Modern Swiss project dependency. |
| Acquisition and native build tooling | `jovian-engine/prepare_native.py`, `native-assets.json`, `native_state.c` | Downloads/pins source/data, builds historical shared library outside Git, records hashes/build identity. |
| Modern build tooling | `scripts/build-sharp-engine.mjs`, identity generation | Generates browser assembly/assets; it is not a browser runtime dependency. |
| Validation | `scripts/jovian-compatible-validation.mjs`, `scripts/jovian-reference-worker.py`, tests | Fresh regression, C2 parity, negative and boundary controls, read-only oracle subprocess. |
| Research | Immutable discriminator/reference-model sources used by the oracle | Reference evidence; not imported by application providers. |

Python has several roles. `prepare_native.py` is tooling. The reference worker is validation that loads research code. `native_backend.py` is the current **local runtime bridge**, including integrity checks, native calls, delta-T and Design root orchestration. Classifying all Python as tooling would conceal a real execution dependency. Integrity validation also happens at runtime to prevent accidental source/data/fallback changes.

Future browser runtime cannot depend on Python, Node child processes, local filesystem access, an external native dynamic library or the local C# subprocess. A Jovian browser provider would require a separately scoped C/WASM host, asset/loading/integrity plan, equivalent time semantics and shared mechanics integration, numerical validation, and licensing/distribution review. This round builds none of that. Its contract module is safe to import in a browser; this fact alone does not make the local native providers browser executable.

Production `chart-engine/index.js` keeps `chartEngine = sharpProvider`. The website, worker/transit wiring and existing production cache are unchanged. The new dual-engine API is exercised by the isolated Node birth interface. There is no engine selector, Settings change or Jovian browser registration.

Historical Swiss uses process-global state. `native_backend.py:25,71-75,168` serializes native calls and prohibits changing the prepared runtime in the same process. Node providers must retain that isolation. A future deployment must decide concurrency deliberately; merely registering two providers must not imply shared native state or shared result caching.
