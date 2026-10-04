# Jovian-Compatible Engine V1 third-party license audit

Audit date: 2026-10-03. Scope: local developer prototype and the exact historical C2 inputs. This document records source evidence and engineering release boundaries; it does not grant a license or certify a future deployment.

## Decision for this prototype

Continue using pinned external acquisition and a separate local native build. Keep downloaded Swiss source, compressed ephemeris files, and native build products outside tracked repository content. Commit independently authored acquisition/bridge code, hashes, and reports only. Do not bundle the historical library or `.se1` files into the website, browser WASM, or public service during this stage. Preserve the downloaded original source and its notices in the external build cache.

This boundary permits the authorized local prototype work to proceed without changing the repository's overall licensing declaration. It does **not** establish that an IPC bridge or external download eliminates Swiss licensing obligations. Before distributing a combined product or activating a public service, the applicable copyleft or Professional License must be selected and satisfied.

## Exact historical source

The acquired archive is [Debian's Maitreya 7.0.7 original source](https://archive.debian.org/debian/pool/main/m/maitreya/maitreya_7.0.7.orig.tar.bz2), SHA256 `83a3414ab071958d1eb12768c36936074588c6eea87c4c35bb264f1602a589cc`. Its Swiss subdirectory is `maitreya-7.0.7/src/swe`; `swephexp.h` identifies version `1.76.00`.

The actual `sweph.c` and other Swiss source headers carry Astrodienst copyright and specify dual licensing: GNU GPL version 2 or later, or Swiss Ephemeris Professional License. They require selecting the license before distributing software containing Swiss code or activating a public service; the GPL route includes the whole-project GPL-compatible requirement. They require preserving copyright and license notices. The archive's short `debian/copyright` entry, `GPL`, is not a substitute for these detailed Swiss headers.

The [official version history](https://www.astro.com/swisseph-download/doc/swisseph.pdf) records the GPL/Professional dual-license transition at version 1.74. Current [official licensing text](https://www.astro.com/swisseph/sweph_e.htm) uses AGPL/Professional licensing. The current text must not be silently substituted for the exact historical source notice. A Professional License contract, if chosen later, must explicitly cover the intended historical stack and use.

## Compressed DE406 files

C2 uses Astrodienst's compressed Swiss-format DE406 files, not the raw JPL `.406` binary:

| File | Bytes | SHA256 |
| --- | ---: | --- |
| `sepl_18.se1` | 484065 | `20c69631d1e5d9af4a1eb7fca265bf777fe2d532bcd99e6b1660838edf5d0e11` |
| `semo_18.se1` | 1305686 | `fc8c8648b992c17408dfe572884e54c2e963410077222ccbd0e4b84f8312617c` |

Both acquired files contain an Astrodienst copyright header dated 1998. They were acquired from an immutable mirror commit `92ecd816bcec2816c2e794369acd7743e927ab1a`, at [planet file](https://raw.githubusercontent.com/arcanous/astrosonnet/92ecd816bcec2816c2e794369acd7743e927ab1a/eph/sepl_18.se1) and [Moon file](https://raw.githubusercontent.com/arcanous/astrosonnet/92ecd816bcec2816c2e794369acd7743e927ab1a/eph/semo_18.se1). The mirror supplies byte provenance, not independent permission to relicense the data. Header/runtime checks establish DE number 406.

The [official Professional License contract](https://forum.astro.com/swisseph/secont_e.pdf) explicitly includes compressed numerical data in the Swiss proprietary format among the licensed parts. NASA/JPL provenance of the underlying numerical ephemeris does not establish unrestricted redistribution of Astrodienst's compressed product. No independent permissive grant for these exact mirrored files was found in this audit. Retain them as external, license-bearing inputs; resolve the applicable data redistribution terms before bundling them.

The separately acquired [raw JPL DE406](https://ssd.jpl.nasa.gov/ftp/eph/planets/Linux/de406/lnxm3000p3000.406), SHA256 `b23009e208d625c5e830c4cb67e6313d7f9eadeffe17292a7471f33250c9342d`, is a research comparison artifact and is not substituted into C2.

## Compiled products and project impact

Compilation does not convert GPL Swiss source into MIT. Redistribution of a native library or a future legacy WASM module requires retaining the relevant notices and complying with the selected license, including corresponding-source requirements under the applicable GPL route. A complete source archive is retained externally so a later compliant release can be prepared; this prototype does not distribute a binary.

The baseline repository has no root `LICENSE` file. Its `THIRD_PARTY_NOTICES.md` already records SharpAstrology.HumanDesign 1.2.0 as MIT, SharpAstrology.SwissEph 0.5.1 as AGPL-3.0 with Swiss notices, and existing Modern `.se1` files with Astrodienst notices. Consequently there is no basis for a blanket claim that every TD-OHD component is MIT. This change does not rewrite those declarations or resolve every prior licensing question.

For a future release, choose a compatible copyleft release with complete required source and notices, or obtain an applicable Professional License and follow its terms. A process boundary is useful for dependency and runtime isolation, but must not be presented as a legal exemption. Future browser integration and public hosting remain release gates; they do not block the private local validation requested here.

## Verification provenance

The archive, DE406 files, and historical research binary were hashed again locally for this audit and matched the research acquisition/build manifests. Historical research binary SHA256: `1c7f7959b78c03d89fddde2ca88f4ea252e8f7c201d17e10cf84c712b234a0fc`. Build: Darwin arm64, Apple clang 17.0.0, `-dynamiclib -fPIC -O2 -lm`, original Swiss sources plus a read-only state instrumentation file. A new prototype build must record its own artifact hash rather than copy this reference hash.
