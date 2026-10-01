# TD Open Human Design (TD-OHD)

[English](README.md) · [简体中文](README.zh-CN.md)

**A personal fork of [Open Human Design](https://github.com/Unforced-Dev/open-human-design), with a browser WASM birth-chart engine, precise transit controls, an interactive timeline, and English, Simplified Chinese, and Traditional Chinese interfaces.** TD Open Human Design (TD-OHD) is the current working name.

**[Official web app · Netlify](https://td-ohd.netlify.app/)** · [Older, separately published GitHub Pages version](https://nothingnessvoid.github.io/TD-OHD/)

The 2026-10-01 update changes the birth-chart engine and adds appearance controls and natal Variable arrows. See the [release notes (Chinese)](docs/releases/web-2026-10-01.md) for scope, data coverage, and limitations. GitHub Pages has not received this release.

The original project provides interactive Human Design charts, including the bodygraph, planetary activations, Type, Strategy, Authority, Profile, Variable/PHS, Incarnation Cross, transits, relationship charts, and team analysis. This fork builds on that foundation rather than claiming those features as new work.

## What this fork adds

- **Browser birth-chart engine:** SharpAstrology.HumanDesign 1.2.0 with SharpAstrology.SwissEph 0.5.1 and file-based Swiss Ephemeris, running in .NET 10 browser WebAssembly. NatalEngine 1.6.0 remains responsible for transits, the transit timeline, Gene Keys, and parts of the app data and interpretation layer. This update does not replace every calculation engine or certify calculation accuracy.
- **Appearance controls:** light/dark themes, Classic/Chakra center palettes, and six persistent global settings for accent, Personality, Design, Transit, graph background, and gate number size. Custom settings follow you across both themes and palettes; Classic/Chakra changes only center colors.
- **Natal Variable arrows:** Determination and Environment on the Design side, Motivation and Perspective on the Personality side, with direction taken from the calculation contract. Transit and relationship graphs do not receive natal arrows.

- **Precise transits:** choose a date, time down to seconds, and timezone; handle historical offsets and daylight-saving transitions.
- **More ways to explore transits:** natal-plus-transit and transit-only views, channel and center interactions, and an interactive [transit timeline](docs/transit-timeline.md).
- **Bodygraph interaction fixes:** improved connection paths, hover behavior, tooltip clipping, and gate/channel detail navigation.
- **Localization:** switch between English, Simplified Chinese, and Traditional Chinese. A saved language choice takes priority; otherwise the app follows a supported browser language and falls back to English. See the [localization guide](docs/localization.md) and [Chinese terminology glossary](docs/术语对照表.zh-CN.md).

## See it in action

These short recordings use an isolated browser and a synthetic chart named **Demo Chart**; they contain no saved personal profiles.

**Transit timeline:** drag across the activation tracks to change the selected instant, switch to a 24-hour range, and open an activation detail.

![Transit timeline demo showing scrubbing, range selection, and an activation detail](docs/assets/timeline-demo.gif)

**Transit modes:** switch between the birth-chart overlay and transits alone.

![Transit mode demo switching between birth-chart overlay and transit-only bodygraphs](docs/assets/transit-modes-demo.gif)

## Privacy and hosting

The [Netlify app](https://td-ohd.netlify.app/) and [GitHub Pages version](https://nothingnessvoid.github.io/TD-OHD/) are static deployments. Chart calculations run in the browser, saved people stay in that browser's local storage, and neither deployment has the local desktop password/SQLite service. Shareable chart links contain birth data in the URL, so share them deliberately. The upstream project's optional hosted MCP and account services are separate from these deployments.

The same source tree also has an **optional local desktop mode** with a password-protected SQLite library. It is included in the repository for maintainability but excluded from the Pages bundle. The database and credentials live outside the checkout on the user's computer. See [local desktop mode](docs/LOCAL_DESKTOP_OVERLAY.md) for the build boundary and update procedure.

## Run locally

Requires Node.js 20 or newer and the .NET 10 SDK (`dotnet` on PATH, or the `DOTNET` environment variable pointing to it). `dev`, `build`, `build:pages`, and `build:desktop` build the WASM engine first. The first build downloads two pinned Swiss Ephemeris files and verifies their SHA-256 checksums.

```bash
git clone https://github.com/NothingnessVOID/TD-OHD.git
cd TD-OHD
npm install
npm run dev
```

```bash
npm test
npm run build:pages
npm run check:pages-bundle
```

`npm install` applies a version-checked patch to NatalEngine 1.6.0 so transit calculations preserve seconds. If install scripts are disabled, run `node scripts/patch-natalengine-seconds.mjs` before building. Birth calculations use [SharpAstrology.HumanDesign](https://github.com/CReizner/SharpAstrology.HumanDesign) and [SharpAstrology.SwissEph](https://github.com/CReizner/SharpAstrology.SwissEph). [NatalEngine](https://github.com/Unforced-Dev/natalengine) remains in the transit and interpretation paths. The packaged ephemeris files cover 1800–2399. This describes the bundled data, not a newly defined product date policy or a certification of the full historical range. Missing files produce an error; Moshier fallback is disabled. The first birth calculation lazily loads the WASM runtime and ephemeris files from the same website. See the [third-party notices](THIRD_PARTY_NOTICES.md) for source and licenses.

Transit time uses minutes by default. Enable **Seconds** for `HH:mm:ss`; turning it off resets seconds to `00`. The **Now** button respects the selected precision. After changing the NatalEngine patch, restart Vite with `npm run dev -- --force` to refresh its dependency cache. Browser smoke tests can be run with `npm run e2e` while the dev server is running.

Appearance tokens live in [`src/styles/tokens/`](src/styles/tokens/). The Transit source is `#1af4ff`; the timeline derives a softer track color by mixing 75% of that source with `#445457`. Gate number size defaults to 22 SVG units and can be adjusted from 14 to 30. Source highlights use circles. These settings change presentation, not chart calculations.

## Publishing the website

The official website is [Netlify](https://td-ohd.netlify.app/). Its deployment is separate from GitHub Pages. The `main` branch holds ongoing source development. GitHub Pages is built only when the dedicated `pages` branch is pushed; merging into `main` does not publish a new website. Promote reviewed commits to `pages` when they are ready to go live. The [Pages workflow](.github/workflows/deploy.yml) runs tests and a static build, then deploys it without the account/sync backend. GitHub Pages remains configured for **GitHub Actions** because Vite must build the source; `pages` is the workflow's sole publishing branch.

## Project relationship

This repository is a fork of **[Unforced-Dev/open-human-design](https://github.com/Unforced-Dev/open-human-design)**. The original authors created the core application and chart experience; the changes listed above were developed on top of it. This personal fork keeps its own deployment and documentation. For upstream contributions, review changes against the original repository and submit focused pull requests.

The repository is named **TD-OHD**. The original project remains credited and linked above; this working name can be revised later without changing the project's provenance.
