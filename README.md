# TD Open Human Design (TD-OHD)

[English](README.md) · [简体中文](README.zh-CN.md)

**A personal fork of [Open Human Design](https://github.com/Unforced-Dev/open-human-design), with more precise transit controls, an interactive timeline, and English, Simplified Chinese, and Traditional Chinese interfaces.** TD Open Human Design (TD-OHD) is the current working name.

**[Open the GitHub Pages app](https://nothingnessvoid.github.io/TD-OHD/)**

The original project provides interactive Human Design charts, including the bodygraph, planetary activations, Type, Strategy, Authority, Profile, Variable/PHS, Incarnation Cross, transits, relationship charts, and team analysis. This fork builds on that foundation rather than claiming those features as new work.

## What this fork adds

- **Precise transits:** choose a date, time down to seconds, and timezone; handle historical offsets and daylight-saving transitions.
- **More ways to explore transits:** natal-plus-transit and transit-only views, channel and center interactions, and an interactive [transit timeline](docs/transit-timeline.md).
- **Bodygraph interaction fixes:** improved connection paths, hover behavior, tooltip clipping, and gate/channel detail navigation.
- **Localization:** switch between English, Simplified Chinese, and Traditional Chinese. A saved language choice takes priority; otherwise the app follows a supported browser language and falls back to English. See the [localization guide](docs/localization.md) and [Chinese terminology glossary](docs/术语对照表.zh-CN.md).

## Privacy and hosting

The [GitHub Pages version](https://nothingnessvoid.github.io/TD-OHD/) is a static build. Chart calculations run in the browser, saved people stay in that browser's local storage, and this deployment has no sign-in or cross-browser sync service. Shareable chart links contain birth data in the URL, so share them deliberately. The upstream project's optional hosted MCP and account services are separate from this deployment.

## Run locally

Requires Node.js 20 or newer.

```bash
git clone https://github.com/NothingnessVOID/TD-OHD.git
cd TD-OHD
npm install
npm run dev
```

```bash
npm test
npm run build -- --mode static
```

`npm install` applies a version-checked patch to NatalEngine 1.6.0 so transit calculations preserve seconds. If install scripts are disabled, run `node scripts/patch-natalengine-seconds.mjs` before building. The chart engine is [NatalEngine](https://github.com/Unforced-Dev/natalengine).

Transit time uses minutes by default. Enable **Seconds** for `HH:mm:ss`; turning it off resets seconds to `00`. The **Now** button respects the selected precision. After changing the NatalEngine patch, restart Vite with `npm run dev -- --force` to refresh its dependency cache. Browser smoke tests can be run with `npm run e2e` while the dev server is running.

The transit palette lives in [`src/styles.css`](src/styles.css), in `:root` and `[data-theme="dark"]`. `--transit-source`, `--transit-source-soft`, `--transit-source-contrast`, and `--transit-source-text` control transit paths, backgrounds, gate numbers, and labels in both SVG and HTML. Override all four for a new skin and check contrast in both themes. The default accent is `#1aadb7` in light mode and `#66c7cc` in dark mode; circuit badges retain their category colors.

## Project relationship

This repository is a fork of **[Unforced-Dev/open-human-design](https://github.com/Unforced-Dev/open-human-design)**. The original authors created the core application and chart experience; the changes listed above were developed on top of it. This personal fork keeps its own deployment and documentation. For upstream contributions, review changes against the original repository and submit focused pull requests.

The repository is named **TD-OHD**. The original project remains credited and linked above; this working name can be revised later without changing the project's provenance.
