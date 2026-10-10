# Self-hosted Chinese fonts

Only font resources, scripts and documentation are changed. No system font installation, npm dependency, UI or PNG changes. Integration must load the IPA stylesheet only when the user selects `ipa`; loading an @font-face stylesheet does not itself fetch all shards. No preload is supplied.

## Sources and license

- LXGW Neo ZhiSong standard v1.067, not Plus or Screen: https://github.com/lxgw/LxgwNeoZhiSong/releases/download/v1.067/LXGWNeoZhiSong.ttf
- Exact source SHA256: `32b398f9c6278c4ed34f413077add2c2f3c84034d463af2b9cb98f12c4c2c6cd`; 10,468,036 bytes.
- Official README read 2026-10-10: https://github.com/lxgw/LxgwNeoZhiSong/blob/main/README.md identifies both IPAex Mincho and IPAmj Mincho and explicitly permits restoration to either. We choose IPAmj Mincho, which its notes identify as the original authorized font.
- License read in full: https://github.com/lxgw/LxgwNeoZhiSong/blob/main/LICENSE.md ; copied verbatim to the LXGW directory. IPA Font License Agreement v1.0 applies to the derived WOFF2 files too.
- Embedding guidance read: https://github.com/lxgw/lxgw/blob/main/documents/xizhi_embedding_instructions.md . This guidance is CC BY-NC-SA 4.0 by lxgw; it is linked, not copied into this distribution.
- Original IPAmjMincho official page https://moji.or.jp/mojikiban/font/ lists Version 006.01 and directs downloads to https://forest.watch.impress.co.jp/library/software/ipamjfont/ . Its download page links https://dforest.watch.impress.co.jp/library/i/ipamjfont/10750/ipamjm00601.zip . This is an officially linked distribution channel, not a reconstructed or system substitute.
- Download archive SHA256: `35494e0f2896f38b3f7369a8421a895cea6440a42c0a66ac95eab47d6ed25b68`.
- Original `ipamjm.ttf`: 46,676,744 bytes, SHA256 `a3e84f495f3c388db7a1473bf1985c1c076d0c814100f10a027ca6853eb1e8cb`. Font name version confirms `Version 006.01`. TTF, archive Readme and license are copied unchanged. The CSS alias does not modify its binary or internal name.

Article 3.1 requires provision of derived files and useful development files, original-font restoration means, the same license and suitable derivative naming. Article 3.2 requires the original to retain its name and binary and be accompanied by the license. We supply the source TTF, exact script and requirements for further modification, the unchanged original IPAmjMincho and its license, and explain the distinct `ipa` restoration choice. The parent UI is responsible for making that choice functional; an `original` system-stack choice is not IPA restoration.

## Integration paths

- `./fonts/lxgw-neo-zhisong/v1.067/font.css`: family `TD LXGW Neo ZhiSong`.
- `./fonts/ipa-original/font.css`: family `TD IPA Original`, references the unchanged `ipamjm.ttf` using a Chinese/punctuation cmap intersection.
- `./fonts/README.html`: public license/restoration/download information.

Both stylesheets contain ordinary same-origin @font-face rules, weight 400, style normal and display swap. Browser synthetic bold remains possible. Paths inside CSS are relative to the stylesheet. Source TTF download links do not cause initial downloads. Selecting IPA loads one large original font; that preserves the original binary and is intentionally opt-in.

## Coverage and build

Use Python 3.11.9 (Unicode database 14.0.0) and pinned requirements:

```powershell
python -m venv .font-venv
.font-venv/Scripts/python.exe -m pip install -r docs/fonts/requirements.txt
.font-venv/Scripts/python.exe scripts/build-chinese-fonts.py
.font-venv/Scripts/python.exe scripts/build-chinese-fonts.py --verify
```

The script is offline, verifies source hashes, intersects the union of every Unicode cmap with explicit Han/compatibility/extension ranges and punctuation categories, and splits disjoint sets into at most 256 characters. Priority UI characters and Chinese hexagram names form the first shards. All remaining eligible characters are included, including rare extension Han. ASCII, Latin letters, numbers and symbol blocks (including U+4DC0–4DFF) stay with the existing fallback fonts. The selected policy does not claim to preserve the entire Latin/symbol cmap as web fonts; the complete original TTF is retained for that purpose. Punctuation variation selectors are passed to fontTools to retain applicable UVS mappings.

Each shard is reopened to verify its actual cmap equals its declared range. The selected union must match exactly with no overlap. The manifest records full source, selected and excluded ranges, source and shard hashes, bytes, maximum shard size, priority count and tool versions. `--verify` rebuilds into a fresh temporary directory and requires byte identity for all generated WOFF2/CSS/manifest files; timestamps are not recomputed. No npm changes or network access is needed to rebuild.

Standalone public rebuild downloads mirror these files under `public/fonts/rebuild/`. To use them outside the checkout, recreate the same `scripts/`, `docs/fonts/` and `public/fonts/` layout, placing the two source TTFs at their documented paths. The accompanying public SHA256SUMS covers every public font resource except itself.

## Third-party notices paragraph for parent integration

LXGW Neo ZhiSong standard v1.067 by lxgw, derived from IPAex Mincho and IPAmj Mincho, and the unchanged original IPAmjMincho 006.01 are distributed under IPA Font License 1.0. The app supplies self-hosted Chinese WOFF2 subsets, the full source TTF, reproducible build inputs and the original IPA font. License text, downloads and restoration instructions: `fonts/README.html`. Select the IPA original font option to replace the derived web font with the bundled unmodified IPAmjMincho. The ordinary original/system font option is separate. Upstream: https://github.com/lxgw/LxgwNeoZhiSong and https://moji.or.jp/mojikiban/font/ .
