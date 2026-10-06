# 字体与排版审计

## 控制路径

- `index.html:24-26` 加载 Google Fonts：Inter 300/400/500/600/700 与 Crimson Pro normal 300/400、italic 300，失败时落回本机 system-ui / Georgia。
- `src/styles.css:8-15` 定义 `--font`、`--font-serif`；html 16px、body line-height=1.6；没有全站正文/标题字号、字重、行高、字距 Token 分级。
- Header/导航/表单/公共 button 主要 Inter；结果大标题、若干 modal/Timeline 标题用 serif；Reference/Knowledge 的各层字号主要组件内 px/em。
- `src/bodygraph.js:469-471`：Gate 数字字号/字重读 HD Token，字体读 `--font`；不是独立“图表字体”Token。SVG 数字基线偏移另有 Token。
- Planet 标题 glyph 直接 Georgia, serif（desktop 38px / 34px mobile）；名称 26px / 23px，各自固定；与普通 body glyph/font 不同用途。
- Timeline 日期/数字使用 `font-variant-numeric: tabular-nums`，不是独立等宽字体。源文件中 monospace / system-ui / Inter 的额外直接调用列于下表。
- `src/lib/view-share.js:75`：Canvas 标题固定 `52px sans-serif`；SVG 分享图通过 fontFamily 参数（Worker 调用传 Inter）控制，不能读取浏览器 CSS。
- Worker SEO 单独加载 Inter 400/500/600、Crimson Pro 600/700；与 SPA 请求的字体 weight 集合不同。OAuth 与 MCP HTML 也有独立 font 声明。

## 全量运行排版命中

一行可以含多个声明，保留完整行；不把 CSS inherit、SVG 用户单位或 responsive override 当成同一全局等级。

| 位置 | 当前规格 |
|---|---|
| [src/bodygraph.js:469](../../src/bodygraph.js#L469) | ` 'text-anchor': 'middle', 'font-size': colors.gateNumberSize, ` |
| [src/bodygraph.js:470](../../src/bodygraph.js#L470) | ` 'font-weight': isActive ? colors.gateActiveWeight : colors.gateInactiveWeight, ` |
| [src/bodygraph.js:471](../../src/bodygraph.js#L471) | ` 'font-family': skinToken(style, '--font'), ` |
| [src/features/transit-timeline/timeline.css:20](../../src/features/transit-timeline/timeline.css#L20) | ` .tl button, .tl input, .tl select { font: inherit; color: inherit; } ` |
| [src/features/transit-timeline/timeline.css:25](../../src/features/transit-timeline/timeline.css#L25) | ` min-height: 32px; padding: 4px 8px; font-size: 12px; max-width: 100%; ` |
| [src/features/transit-timeline/timeline.css:29](../../src/features/transit-timeline/timeline.css#L29) | ` .tl label { display: flex; flex-direction: column; gap: 3px; font-size: 10px; font-weight: 500; color: var(--text-secondary); } ` |
| [src/features/transit-timeline/timeline.css:31](../../src/features/transit-timeline/timeline.css#L31) | ` .tl h2 { font-family: var(--font-serif); font-size: 23px; line-height: 1.25; font-weight: 500; margin: 0; } ` |
| [src/features/transit-timeline/timeline.css:32](../../src/features/transit-timeline/timeline.css#L32) | ` .tl-person { font-size: 12px; overflow-wrap: anywhere; max-width: 30%; color: var(--text-secondary); } ` |
| [src/features/transit-timeline/timeline.css:36](../../src/features/transit-timeline/timeline.css#L36) | ` .tl-toolbar > label > input { width: 100%; min-width: 0; box-sizing: border-box; font-variant-numeric: tabular-nums; } ` |
| [src/features/transit-timeline/timeline.css:40](../../src/features/transit-timeline/timeline.css#L40) | ` .tl-advanced { position: relative; margin: 0; font-size: 12px; } ` |
| [src/features/transit-timeline/timeline.css:59](../../src/features/transit-timeline/timeline.css#L59) | ` .tl .tl-target-option { display: flex; flex-direction: row; align-items: center; gap: 8px; min-height: 34px; padding: 3px 5px; font-size: 12px; color: var(--text); cursor: pointer; } ` |
| [src/features/transit-timeline/timeline.css:62](../../src/features/transit-timeline/timeline.css#L62) | ` .tl-target-count { display: block; margin-top: 4px; text-align: right; color: var(--text-secondary); font-size: 10px; } ` |
| [src/features/transit-timeline/timeline.css:63](../../src/features/transit-timeline/timeline.css#L63) | ` .tl-query-status { color: var(--text-secondary); font-size: 11px; } ` |
| [src/features/transit-timeline/timeline.css:66](../../src/features/transit-timeline/timeline.css#L66) | ` .tl-query-navigation span { min-width: 42px; text-align: center; font-size: 11px; font-variant-numeric: tabular-nums; } ` |
| [src/features/transit-timeline/timeline.css:68](../../src/features/transit-timeline/timeline.css#L68) | ` .tl .tl-query-page .tl-query-interval { display: flex; align-items: center; gap: 8px; text-align: left; max-width: 100%; padding: 8px 10px; border: 1px solid var(--tl-line); border-radius: 7px; background: var(--tl-surface); box-shadow: var(--shadow-sm); font-size: 11px; } ` |
| [src/features/transit-timeline/timeline.css:72](../../src/features/transit-timeline/timeline.css#L72) | ` .tl-zone { display: inline-flex; align-items: center; gap: 5px; align-self: end; min-height: 32px; color: var(--text-secondary); font-size: 11px; } ` |
| [src/features/transit-timeline/timeline.css:74](../../src/features/transit-timeline/timeline.css#L74) | ` .tl-time-error { font-size: 12px; } ` |
| [src/features/transit-timeline/timeline.css:81](../../src/features/transit-timeline/timeline.css#L81) | ` .tl-moment { display: flex; flex-direction: column; font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums; } ` |
| [src/features/transit-timeline/timeline.css:82](../../src/features/transit-timeline/timeline.css#L82) | ` .tl-moment-date { font-weight: 600; } ` |
| [src/features/transit-timeline/timeline.css:83](../../src/features/transit-timeline/timeline.css#L83) | ` .tl-moment-time { font-size: 10px; color: var(--text-secondary); } ` |
| [src/features/transit-timeline/timeline.css:86](../../src/features/transit-timeline/timeline.css#L86) | ` .tl-legend-disclosure { position: absolute; top: 10px; right: 10px; z-index: 5; font-size: 10px; color: var(--hd-legend-text); } ` |
| [src/features/transit-timeline/timeline.css:89](../../src/features/transit-timeline/timeline.css#L89) | ` .tl-legend { position: absolute; right: 0; top: 22px; width: max-content; max-width: 240px; padding: 10px 12px; background: var(--hd-legend-bg); color: var(--hd-legend-text); box-shadow: var(--shadow-lg); border: 1px solid var(--hd-legend-border); border-radius: 5px; display: grid; gap: 7px; font-size: 10px; } ` |
| [src/features/transit-timeline/timeline.css:95](../../src/features/transit-timeline/timeline.css#L95) | ` .tl-planet-column { position: absolute; top: 62px; z-index: 2; font-variant-numeric: tabular-nums; } ` |
| [src/features/transit-timeline/timeline.css:102](../../src/features/transit-timeline/timeline.css#L102) | ` .tl-birth-head > span { min-width: 0; line-height: 18px; } ` |
| [src/features/transit-timeline/timeline.css:103](../../src/features/transit-timeline/timeline.css#L103) | ` .tl .tl-birth-head .bg-planets-head { display: block; margin-bottom: 4px; overflow: hidden; white-space: nowrap; text-transform: none; letter-spacing: 0; } ` |
| [src/features/transit-timeline/timeline.css:104](../../src/features/transit-timeline/timeline.css#L104) | ` .tl .tl-birth-head-en .bg-planets-head { font-size: 8px; } ` |
| [src/features/transit-timeline/timeline.css:111](../../src/features/transit-timeline/timeline.css#L111) | ` .tl-birth-glyph { width: 14px; justify-self: center; opacity: .75; text-align: center; line-height: 1; } ` |
| [src/features/transit-timeline/timeline.css:112](../../src/features/transit-timeline/timeline.css#L112) | ` .tl .bg-planets-head { font-size: 9px; letter-spacing: .02em; line-height: 18px; margin-bottom: 4px; } ` |
| [src/features/transit-timeline/timeline.css:115](../../src/features/transit-timeline/timeline.css#L115) | ` .tl .bg-planet-row { height: 17px; line-height: 17px; padding: 0 1px; gap: 2px; font-size: 11px; cursor: pointer; } ` |
| [src/features/transit-timeline/timeline.css:116](../../src/features/transit-timeline/timeline.css#L116) | ` .tl .bg-planet-glyph { flex: 0 0 12px; font-size: 12px; } ` |
| [src/features/transit-timeline/timeline.css:117](../../src/features/transit-timeline/timeline.css#L117) | ` .tl .bg-planet-act { min-width: 0; font-variant-numeric: tabular-nums; font-weight: 600; } ` |
| [src/features/transit-timeline/timeline.css:120](../../src/features/transit-timeline/timeline.css#L120) | ` .tl-fixing-mark { flex: 0 0 7px; width: 7px; font-size: 7px; line-height: 7px; white-space: normal; overflow-wrap: anywhere; text-align: center; color: var(--text-secondary); } ` |
| [src/features/transit-timeline/timeline.css:127](../../src/features/transit-timeline/timeline.css#L127) | ` .tl-event-nav button, .tl-mobile-event-nav button { min-width: 36px; font-size: 18px !important; line-height: 1; } ` |
| [src/features/transit-timeline/timeline.css:128](../../src/features/transit-timeline/timeline.css#L128) | ` .tl-event-status { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); font-size: 11px; } ` |
| [src/features/transit-timeline/timeline.css:134](../../src/features/transit-timeline/timeline.css#L134) | ` .tl .tl-kind select { appearance: none; width: 100%; height: 100%; min-width: 0; min-height: 30px; padding: 0 0 11px; border: 0; border-radius: 0; background: transparent; font-size: 9px; text-align: center; text-align-last: center; cursor: pointer; } ` |
| [src/features/transit-timeline/timeline.css:138](../../src/features/transit-timeline/timeline.css#L138) | ` .tl .tl-search input { width: 100%; min-width: 0; min-height: 28px; padding: 2px; border: 0; background: transparent; font-size: 11px; } ` |
| [src/features/transit-timeline/timeline.css:139](../../src/features/transit-timeline/timeline.css#L139) | ` .tl .tl-compact-controls select { text-align: right; text-align-last: right; width: 64px; min-height: 28px; padding: 2px 3px; border: 0; background: transparent; font-size: 11px; } ` |
| [src/features/transit-timeline/timeline.css:143](../../src/features/transit-timeline/timeline.css#L143) | ` .tl button.tl-changes[data-action] { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; min-height: 28px; padding: 2px 5px; font-size: 10px; border: 0; background: transparent; color: var(--text-secondary); } ` |
| [src/features/transit-timeline/timeline.css:146](../../src/features/transit-timeline/timeline.css#L146) | ` .tl-channel-symbol { font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; } ` |
| [src/features/transit-timeline/timeline.css:156](../../src/features/transit-timeline/timeline.css#L156) | ` .tl-line-symbol { font-size: 11px; font-variant-numeric: tabular-nums; } ` |
| [src/features/transit-timeline/timeline.css:160](../../src/features/transit-timeline/timeline.css#L160) | ` .tl-gate-symbol { font-size: 11px; font-weight: 600; border: 1px solid var(--tl-line); border-radius: 50%; min-width: 22px; height: 22px; line-height: 20px; text-align: center; } ` |
| [src/features/transit-timeline/timeline.css:199](../../src/features/transit-timeline/timeline.css#L199) | ` .tl-date-cell { position: absolute; z-index: 2; top: 0; height: 20px; line-height: 20px; font-size: 9px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; color: var(--text-secondary); pointer-events: none; background: var(--tl-date-even); } ` |
| [src/features/transit-timeline/timeline.css:201](../../src/features/transit-timeline/timeline.css#L201) | ` .tl-date-cell[data-granularity="hour"] { font-size: 9px; font-weight: 600; color: var(--text); } ` |
| [src/features/transit-timeline/timeline.css:203](../../src/features/transit-timeline/timeline.css#L203) | ` .tl-hour-label { position: absolute; top: 1px; z-index: 3; transform: translateX(-50%); pointer-events: none; white-space: nowrap; font-size: 10px; line-height: 20px; font-variant-numeric: tabular-nums; color: var(--text-secondary); } ` |
| [src/features/transit-timeline/timeline.css:207](../../src/features/transit-timeline/timeline.css#L207) | ` .tl .tl-bar { position: absolute; top: 0; height: 100%; display: flex; align-items: center; min-width: 2px; overflow: hidden; border: 0 solid transparent; border-radius: 0; background: var(--tl-transit); color: var(--tl-transit-ink); font-size: 11px; line-height: 1.2; padding: 0; cursor: pointer; white-space: nowrap; text-align: left; } ` |
| [src/features/transit-timeline/timeline.css:217](../../src/features/transit-timeline/timeline.css#L217) | ` .tl-empty { padding: 24px; color: var(--text-secondary); font-size: 13px; } ` |
| [src/features/transit-timeline/timeline.css:221](../../src/features/transit-timeline/timeline.css#L221) | ` .tl-load-status { display: block; font-size: 20px; font-weight: 500; color: var(--text); line-height: 1.4; } ` |
| [src/features/transit-timeline/timeline.css:222](../../src/features/transit-timeline/timeline.css#L222) | ` .tl-loading-percent { display: block; margin: 12px 0; font-size: 44px; font-weight: 600; line-height: 1.1; font-variant-numeric: tabular-nums; color: var(--hd-transit-text); } ` |
| [src/features/transit-timeline/timeline.css:227](../../src/features/transit-timeline/timeline.css#L227) | ` .tl-loading-note { margin: 14px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 1.5; } ` |
| [src/features/transit-timeline/timeline.css:236](../../src/features/transit-timeline/timeline.css#L236) | ` .tl .bg-planet-row { font-size: 10px; height: 16px; line-height: 16px; gap: 2px; } ` |
| [src/features/transit-timeline/timeline.css:256](../../src/features/transit-timeline/timeline.css#L256) | ` .tl h2 { font-size: 21px; } ` |
| [src/features/transit-timeline/timeline.css:272](../../src/features/transit-timeline/timeline.css#L272) | ` .tl .bg-planet-row { height: 15px; line-height: 15px; } ` |
| [src/features/transit-timeline/timeline.css:274](../../src/features/transit-timeline/timeline.css#L274) | ` .tl .bg-planet-glyph { flex-basis: 12px; font-size: 11px; } ` |
| [src/features/transit-timeline/timeline.css:276](../../src/features/transit-timeline/timeline.css#L276) | ` .tl-bar > span { font-size: 10px; } ` |
| [src/features/transit-timeline/timeline.css:308](../../src/features/transit-timeline/timeline.css#L308) | ` --tl-mobile-arrow-font: 18px; ` |
| [src/features/transit-timeline/timeline.css:311](../../src/features/transit-timeline/timeline.css#L311) | ` --tl-mobile-range-font: 11px; ` |
| [src/features/transit-timeline/timeline.css:351](../../src/features/transit-timeline/timeline.css#L351) | ` box-shadow: var(--shadow-lg); color: var(--text); font-size: 22px; ` |
| [src/features/transit-timeline/timeline.css:360](../../src/features/transit-timeline/timeline.css#L360) | ` padding: 0; font-size: var(--tl-mobile-arrow-font) !important; ` |
| [src/features/transit-timeline/timeline.css:372](../../src/features/transit-timeline/timeline.css#L372) | ` padding: 1px 2px; border: 0; font-size: var(--tl-mobile-range-font); ` |
| [src/features/transit-timeline/timeline.css:381](../../src/features/transit-timeline/timeline.css#L381) | ` font-size: 17px; box-shadow: none; ` |
| [src/features/transit-timeline/timeline.css:419](../../src/features/transit-timeline/timeline.css#L419) | ` border: 1px solid var(--tl-line); border-radius: 5px; background: var(--tl-surface); font-size: 12px; ` |
| [src/features/transit-timeline/timeline.css:445](../../src/features/transit-timeline/timeline.css#L445) | ` --tl-mobile-arrow-font: 17px; ` |
| [src/features/transit-timeline/timeline.css:455](../../src/features/transit-timeline/timeline.css#L455) | ` --tl-mobile-arrow-font: 16px; ` |
| [src/features/transit-timeline/timeline.css:458](../../src/features/transit-timeline/timeline.css#L458) | ` --tl-mobile-range-font: 10.5px; ` |
| [src/features/transit-timeline/timeline.css:469](../../src/features/transit-timeline/timeline.css#L469) | ` --tl-mobile-arrow-font: 15px; ` |
| [src/features/transit-timeline/timeline.css:471](../../src/features/transit-timeline/timeline.css#L471) | ` --tl-mobile-range-font: 10px; ` |
| [src/lib/human-design/svg-renderer.js:93](../../src/lib/human-design/svg-renderer.js#L93) | ` const font = opts.fontFamily \|\| 'Inter, system-ui, sans-serif'; ` |
| [src/lib/human-design/svg-renderer.js:155](../../src/lib/human-design/svg-renderer.js#L155) | `` parts.push(`<text x="${c.cx}" y="${c.cy + 4}" text-anchor="middle" font-size="11" ` + `` |
| [src/lib/human-design/svg-renderer.js:156](../../src/lib/human-design/svg-renderer.js#L156) | `` `font-weight="${isActive ? 700 : 400}" font-family="${escAttr(font)}" fill="${textColor}">${g}</text>`); `` |
| [src/lib/human-design/svg-renderer.js:173](../../src/lib/human-design/svg-renderer.js#L173) | `` parts.push(`<text x="${x}" y="440" font-size="26" font-weight="700" letter-spacing="2" ` + `` |
| [src/lib/human-design/svg-renderer.js:174](../../src/lib/human-design/svg-renderer.js#L174) | `` `font-family="${escAttr(font)}" fill="${color}">${title.toUpperCase()}</text>`); `` |
| [src/lib/human-design/svg-renderer.js:176](../../src/lib/human-design/svg-renderer.js#L176) | `` parts.push(`<text x="${x}" y="472" font-size="20" font-family="${escAttr(font)}" fill="${theme.gateTextInactive}">${escAttr(date)}</text>`); `` |
| [src/lib/human-design/svg-renderer.js:181](../../src/lib/human-design/svg-renderer.js#L181) | `` parts.push(`<text x="${x}" y="${y}" font-size="26" font-family="${escAttr(font)}" fill="${theme.gateTextInactive}">${PLANET_GLYPHS[planet]}</text>`); `` |
| [src/lib/human-design/svg-renderer.js:182](../../src/lib/human-design/svg-renderer.js#L182) | `` parts.push(`<text x="${x + 38}" y="${y}" font-size="26" font-weight="600" font-family="${escAttr(font)}" ` + `` |
| [src/lib/human-design/svg-renderer.js:218](../../src/lib/human-design/svg-renderer.js#L218) | ` const font = opts.fontFamily \|\| 'Inter, system-ui, sans-serif'; ` |
| [src/lib/human-design/svg-renderer.js:246](../../src/lib/human-design/svg-renderer.js#L246) | ` <g font-family="${escAttr(font)}"> ` |
| [src/lib/human-design/svg-renderer.js:247](../../src/lib/human-design/svg-renderer.js#L247) | `` ${name ? `<text x="470" y="170" font-size="40" fill="${subtext}">${name}</text>` : ''} `` |
| [src/lib/human-design/svg-renderer.js:248](../../src/lib/human-design/svg-renderer.js#L248) | ` <text x="470" y="${name ? 248 : 220}" font-size="68" font-weight="700" fill="${typeColor}">${escAttr(chart.type?.name \|\| 'Human Design')}</text> ` |
| [src/lib/human-design/svg-renderer.js:249](../../src/lib/human-design/svg-renderer.js#L249) | `` ${lines.map((l, i) => `<text x="470" y="${(name ? 318 : 290) + i * 54}" font-size="34" fill="${text}">${escAttr(l)}</text>`).join('\n    ')} `` |
| [src/lib/human-design/svg-renderer.js:250](../../src/lib/human-design/svg-renderer.js#L250) | `` ${chart.incarnationCross?.name ? `<text x="470" y="${(name ? 318 : 290) + lines.length * 54 + 14}" font-size="26" fill="${subtext}">Cross of ${escAttr(chart.incarnationCross.name.replace(/^The /, ''))}</text>` : ''} `` |
| [src/lib/human-design/svg-renderer.js:251](../../src/lib/human-design/svg-renderer.js#L251) | `` ${footer ? `<text x="470" y="560" font-size="28" font-weight="600" fill="${accent}">${escAttr(footer)}</text>` : ''} `` |
| [src/lib/human-design/svg-renderer.js:276](../../src/lib/human-design/svg-renderer.js#L276) | ` const font = opts.fontFamily \|\| 'Inter, system-ui, sans-serif'; ` |
| [src/lib/human-design/svg-renderer.js:308](../../src/lib/human-design/svg-renderer.js#L308) | `` if (name) { header.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="46" fill="${subtext}">${name}</text>`); y += square ? 80 : 104; } `` |
| [src/lib/human-design/svg-renderer.js:309](../../src/lib/human-design/svg-renderer.js#L309) | `` header.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="${square ? 76 : 92}" font-weight="700" fill="${typeColor}">${escAttr(chart.type?.name \|\| 'Human Design')}</text>`); `` |
| [src/lib/human-design/svg-renderer.js:311](../../src/lib/human-design/svg-renderer.js#L311) | `` for (const l of lines) { header.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="40" fill="${text}">${escAttr(l)}</text>`); y += 56; } `` |
| [src/lib/human-design/svg-renderer.js:325](../../src/lib/human-design/svg-renderer.js#L325) | `` ? `<text x="${cx}" y="${crossY}" text-anchor="middle" font-size="32" fill="${subtext}">Cross of ${escAttr(chart.incarnationCross.name.replace(/^The /, ''))}</text>` : ''; `` |
| [src/lib/human-design/svg-renderer.js:327](../../src/lib/human-design/svg-renderer.js#L327) | `` ? `<text x="${cx}" y="${footY}" text-anchor="middle" font-size="36" font-weight="600" fill="${accent}">${escAttr(footer)}</text>` : ''; `` |
| [src/lib/human-design/svg-renderer.js:331](../../src/lib/human-design/svg-renderer.js#L331) | ` <g font-family="${escAttr(font)}">${header.join('')}</g> ` |
| [src/lib/human-design/svg-renderer.js:333](../../src/lib/human-design/svg-renderer.js#L333) | ` <g font-family="${escAttr(font)}">${cross}${brand}</g> ` |
| [src/lib/knowledge/detail-access.css:8](../../src/lib/knowledge/detail-access.css#L8) | ` .reference-detail .knowledge-detail .detail-name { font-size: 22px; margin: 0 0 10px; } ` |
| [src/lib/knowledge/detail-access.css:11](../../src/lib/knowledge/detail-access.css#L11) | ` .knowledge-summary { color: var(--text-secondary); line-height: 1.7; margin-bottom: 16px; } ` |
| [src/lib/knowledge/detail-access.css:12](../../src/lib/knowledge/detail-access.css#L12) | ` .knowledge-type-properties { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 16px; margin: 0 0 20px; font-size: 0.875rem; line-height: 1.6; } ` |
| [src/lib/knowledge/detail-access.css:15](../../src/lib/knowledge/detail-access.css#L15) | ` .knowledge-secondary { font-size: 0.875rem; line-height: 1.7; margin: 0 0 16px; } ` |
| [src/lib/knowledge/detail-access.css:17](../../src/lib/knowledge/detail-access.css#L17) | ` .knowledge-body p { font-size: 0.875rem; line-height: 1.8; margin: 0 0 14px; } ` |
| [src/lib/knowledge/detail-access.css:18](../../src/lib/knowledge/detail-access.css#L18) | ` .knowledge-term { font-weight: 600; } ` |
| [src/lib/knowledge/detail-access.css:19](../../src/lib/knowledge/detail-access.css#L19) | ` .knowledge-context { font-size: 0.8125rem; line-height: 1.7; color: var(--text-secondary); margin-bottom: 16px; } ` |
| [src/lib/knowledge/detail-access.css:21](../../src/lib/knowledge/detail-access.css#L21) | ` .knowledge-result-summary { color: var(--text-secondary); font-size: 0.75rem; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } ` |
| [src/lib/knowledge/detail-access.css:23](../../src/lib/knowledge/detail-access.css#L23) | ` .knowledge-section h3 { font-size: 0.9375rem; line-height: 1.6; margin: 20px 0 10px; } ` |
| [src/lib/knowledge/detail-access.css:24](../../src/lib/knowledge/detail-access.css#L24) | ` .knowledge-yours { display: inline-block; margin-inline-start: 10px; font-size: 0.75rem; font-weight: 400; color: var(--accent); } ` |
| [src/lib/knowledge/detail-access.css:25](../../src/lib/knowledge/detail-access.css#L25) | ` .knowledge-value { font-weight: 600; } ` |
| [src/lib/knowledge/detail-access.css:30](../../src/lib/knowledge/detail-access.css#L30) | ` .knowledge-summary-label { margin-bottom: 7px; font-size: 11px; font-weight: 700; letter-spacing: .04em; color: var(--knowledge-color); } ` |
| [src/lib/knowledge/detail-access.css:31](../../src/lib/knowledge/detail-access.css#L31) | ` .knowledge-summary-callout .knowledge-summary { margin: 0; font-size: 14px; line-height: 1.75; } ` |
| [src/lib/knowledge/detail-access.css:33](../../src/lib/knowledge/detail-access.css#L33) | ` .knowledge-surface h3, .knowledge-section h3 { margin: 0 0 10px; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; } ` |
| [src/lib/knowledge/detail-access.css:37](../../src/lib/knowledge/detail-access.css#L37) | ` .knowledge-chip, .knowledge-badge { display: inline-block; max-width: 100%; border: 1px solid var(--border-subtle); border-radius: var(--radius); padding: 4px 9px; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; } ` |
| [src/lib/knowledge/detail-access.css:45](../../src/lib/knowledge/detail-access.css#L45) | ` .knowledge-meta dd { font-weight: 600; } ` |
| [src/lib/knowledge/detail-access.css:48](../../src/lib/knowledge/detail-access.css#L48) | ` .knowledge-yours { margin-inline-start: 8px; padding: 2px 7px; border: 1px solid var(--knowledge-color); border-radius: var(--radius); color: var(--knowledge-color); font-weight: 600; font-size: 11px; background: var(--bg-elevated); } ` |
| [src/lib/knowledge/detail-access.css:53](../../src/lib/knowledge/detail-access.css#L53) | ` .knowledge-deviation-term { margin-bottom: 14px; color: var(--text-secondary); font-size: 12px; line-height: 1.6; } ` |
| [src/lib/knowledge/detail-access.css:56](../../src/lib/knowledge/detail-access.css#L56) | ` .knowledge-deviation-label { color: var(--text-secondary); font-size: 12px; line-height: 1.6; } ` |
| [src/lib/knowledge/detail-access.css:57](../../src/lib/knowledge/detail-access.css#L57) | ` .knowledge-deviation-node strong { font-size: 14px; line-height: 1.6; } ` |
| [src/lib/knowledge/detail-access.css:59](../../src/lib/knowledge/detail-access.css#L59) | ` .knowledge-deviation-arrow { color: var(--accent); font-size: 20px; line-height: 1; } ` |
| [src/lib/knowledge/detail-access.css:61](../../src/lib/knowledge/detail-access.css#L61) | ` .knowledge-process-step { flex: 1; min-width: 0; padding: 13px; border: 1px solid var(--border-subtle); border-radius: var(--radius); background: var(--bg-sunken); font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; } ` |
| [src/lib/knowledge/detail-access.css:67](../../src/lib/knowledge/detail-access.css#L67) | ` .knowledge-timeline-stage h3 { font-size: 13px; line-height: 1.6; margin: 0 0 7px; color: var(--knowledge-color); } ` |
| [src/lib/knowledge/detail-access.css:70](../../src/lib/knowledge/detail-access.css#L70) | ` .knowledge-activation-label { color: var(--text-secondary); font-size: 11px; line-height: 1.6; margin-bottom: 8px; overflow-wrap: anywhere; } ` |
| [src/lib/knowledge/detail-access.css:72](../../src/lib/knowledge/detail-access.css#L72) | ` .knowledge-library-link { border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-sunken); color: var(--text); padding: 10px 14px; font-size: 13px; text-decoration: none; } ` |
| [src/lib/knowledge/detail-access.css:91](../../src/lib/knowledge/detail-access.css#L91) | ` .knowledge-line-identity strong { font-size: 14px; overflow-wrap: anywhere; } ` |
| [src/lib/knowledge/detail-access.css:95](../../src/lib/knowledge/detail-access.css#L95) | ` .knowledge-island-card h3 { margin: 0; font-size: 13px; color: var(--knowledge-color); } ` |
| [src/lib/knowledge/detail-access.css:108](../../src/lib/knowledge/detail-access.css#L108) | ` .knowledge-activation-link { color: inherit; font: inherit; text-align: left; cursor: pointer; transition: background-color 120ms ease, border-color 120ms ease; } ` |
| [src/lib/knowledge/detail-access.css:113](../../src/lib/knowledge/detail-access.css#L113) | ` .knowledge-prose-list { padding-inline-start: 22px; margin: 0 0 18px; font-size: 14px; line-height: 1.8; overflow-wrap: anywhere; } ` |
| [src/lib/language-switcher.css:10](../../src/lib/language-switcher.css#L10) | ` font: inherit; ` |
| [src/lib/language-switcher.css:11](../../src/lib/language-switcher.css#L11) | ` font-size: 12px; ` |
| [src/lib/language-switcher.css:33](../../src/lib/language-switcher.css#L33) | ` .language-switcher { max-width: 82px; font-size: 11px; padding-inline: 3px; } ` |
| [src/lib/local-account.css:5](../../src/lib/local-account.css#L5) | ` .local-auth-brand { display: flex; gap: 10px; align-items: center; margin-bottom: 36px; font-weight: 600; } ` |
| [src/lib/local-account.css:6](../../src/lib/local-account.css#L6) | ` .local-auth-brand > span { color: var(--accent); font-size: 27px; } ` |
| [src/lib/local-account.css:7](../../src/lib/local-account.css#L7) | ` .local-auth-brand small { margin-left: auto; font-weight: 400; color: var(--text-secondary); } ` |
| [src/lib/local-account.css:8](../../src/lib/local-account.css#L8) | ` .local-auth h1 { font-size: 26px; font-weight: 500; margin-bottom: 12px; } ` |
| [src/lib/local-account.css:9](../../src/lib/local-account.css#L9) | ` .local-auth p { color: var(--text-secondary); font-size: 14px; line-height: 1.8; } ` |
| [src/lib/local-account.css:11](../../src/lib/local-account.css#L11) | ` .local-auth form > label, #local-confirm-wrap > label { display: block; margin: 16px 0 7px; font-size: 13px; } ` |
| [src/lib/local-account.css:12](../../src/lib/local-account.css#L12) | ` .local-auth input[type=password], .local-password-settings input { display: block; width: 100%; padding: 12px 14px; border: 1px solid var(--border); border-radius: 9px; background: var(--bg); color: var(--text); font: inherit; } ` |
| [src/lib/local-account.css:17](../../src/lib/local-account.css#L17) | ` .local-auth-foot { padding-top: 22px; margin-top: 14px; border-top: 1px solid var(--border); text-align: center; font-size: 12px; color: var(--text-tertiary); } ` |
| [src/lib/local-account.css:18](../../src/lib/local-account.css#L18) | ` .local-storage-status { color: var(--text-secondary); font-size: 12px; } ` |
| [src/lib/local-account.css:24](../../src/lib/local-account.css#L24) | ` .local-password-settings label { display: block; margin: 14px 0; font-size: 13px; } ` |
| [src/lib/local-account.css:26](../../src/lib/local-account.css#L26) | ` #local-account-message { font-size: 13px; line-height: 1.6; } ` |
| [src/lib/view-share.js:51](../../src/lib/view-share.js#L51) | ` for (const property of ['fill', 'stroke', 'stroke-width', 'opacity', 'color', 'font-family', 'font-size', 'font-weight', 'display']) { ` |
| [src/lib/view-share.js:75](../../src/lib/view-share.js#L75) | ` context.font = '52px sans-serif'; ` |
| [src/main.js:538](../../src/main.js#L538) | `` <button id="make-own" class="link-button" style="display:inline;margin:0;font-size:inherit" data-i18n="make your own free chart →">${t('make your own free chart →')}</button>`; `` |
| [src/styles.css:13](../../src/styles.css#L13) | ` --font: 'Inter', system-ui, -apple-system, sans-serif; ` |
| [src/styles.css:31](../../src/styles.css#L31) | ` html { font-size: 16px; scroll-behavior: smooth; } ` |
| [src/styles.css:35](../../src/styles.css#L35) | ` font-family: var(--font); ` |
| [src/styles.css:38](../../src/styles.css#L38) | ` line-height: 1.6; ` |
| [src/styles.css:77](../../src/styles.css#L77) | ` font-size: 20px; ` |
| [src/styles.css:82](../../src/styles.css#L82) | ` font-weight: 600; ` |
| [src/styles.css:83](../../src/styles.css#L83) | ` font-size: 17px; ` |
| [src/styles.css:84](../../src/styles.css#L84) | ` letter-spacing: -0.3px; ` |
| [src/styles.css:98](../../src/styles.css#L98) | ` font-size: 13px; ` |
| [src/styles.css:99](../../src/styles.css#L99) | ` font-weight: 500; ` |
| [src/styles.css:103](../../src/styles.css#L103) | ` font-family: var(--font); ` |
| [src/styles.css:119](../../src/styles.css#L119) | ` font-size: 16px; ` |
| [src/styles.css:138](../../src/styles.css#L138) | ` .chart-required-card h2 { font-family: var(--font-serif); font-weight: 500; margin-bottom: 12px; } ` |
| [src/styles.css:149](../../src/styles.css#L149) | ` font-family: var(--font-serif); ` |
| [src/styles.css:150](../../src/styles.css#L150) | ` font-size: 36px; ` |
| [src/styles.css:151](../../src/styles.css#L151) | ` font-weight: 300; ` |
| [src/styles.css:152](../../src/styles.css#L152) | ` letter-spacing: -0.5px; ` |
| [src/styles.css:158](../../src/styles.css#L158) | ` font-size: 15px; ` |
| [src/styles.css:180](../../src/styles.css#L180) | ` font-size: 12px; ` |
| [src/styles.css:181](../../src/styles.css#L181) | ` font-weight: 500; ` |
| [src/styles.css:184](../../src/styles.css#L184) | ` letter-spacing: 0.5px; ` |
| [src/styles.css:192](../../src/styles.css#L192) | ` font-size: 14px; ` |
| [src/styles.css:193](../../src/styles.css#L193) | ` font-family: var(--font); ` |
| [src/styles.css:211](../../src/styles.css#L211) | ` font-size: 14px; ` |
| [src/styles.css:212](../../src/styles.css#L212) | ` font-weight: 600; ` |
| [src/styles.css:213](../../src/styles.css#L213) | ` font-family: var(--font); ` |
| [src/styles.css:226](../../src/styles.css#L226) | ` font-size: 13px; ` |
| [src/styles.css:227](../../src/styles.css#L227) | ` font-weight: 500; ` |
| [src/styles.css:228](../../src/styles.css#L228) | ` font-family: var(--font); ` |
| [src/styles.css:246](../../src/styles.css#L246) | ` font-family: var(--font-serif); ` |
| [src/styles.css:247](../../src/styles.css#L247) | ` font-size: 32px; ` |
| [src/styles.css:248](../../src/styles.css#L248) | ` font-weight: 300; ` |
| [src/styles.css:255](../../src/styles.css#L255) | ` font-size: 11px; ` |
| [src/styles.css:256](../../src/styles.css#L256) | ` font-weight: 500; ` |
| [src/styles.css:257](../../src/styles.css#L257) | ` letter-spacing: 0.06em; ` |
| [src/styles.css:269](../../src/styles.css#L269) | ` font-size: 14px; ` |
| [src/styles.css:279](../../src/styles.css#L279) | ` font-size: 13px; ` |
| [src/styles.css:280](../../src/styles.css#L280) | ` font-weight: 500; ` |
| [src/styles.css:335](../../src/styles.css#L335) | ` #bodygraph-container .bg-planet-row { padding: 2px 0; gap: 1px; font-size: 10px; } ` |
| [src/styles.css:358](../../src/styles.css#L358) | ` font-size: 11px; ` |
| [src/styles.css:359](../../src/styles.css#L359) | ` font-weight: 600; ` |
| [src/styles.css:361](../../src/styles.css#L361) | ` letter-spacing: 0.8px; ` |
| [src/styles.css:367](../../src/styles.css#L367) | ` font-family: var(--font-serif); ` |
| [src/styles.css:368](../../src/styles.css#L368) | ` font-size: 22px; ` |
| [src/styles.css:369](../../src/styles.css#L369) | ` font-weight: 400; ` |
| [src/styles.css:375](../../src/styles.css#L375) | ` font-size: 14px; ` |
| [src/styles.css:376](../../src/styles.css#L376) | ` line-height: 1.65; ` |
| [src/styles.css:394](../../src/styles.css#L394) | ` font-size: 12px; ` |
| [src/styles.css:395](../../src/styles.css#L395) | ` font-weight: 500; ` |
| [src/styles.css:398](../../src/styles.css#L398) | ` font-family: var(--font); ` |
| [src/styles.css:432](../../src/styles.css#L432) | ` font-size: 11px; ` |
| [src/styles.css:433](../../src/styles.css#L433) | ` font-weight: 600; ` |
| [src/styles.css:435](../../src/styles.css#L435) | ` letter-spacing: 0.6px; ` |
| [src/styles.css:441](../../src/styles.css#L441) | ` font-size: 16px; ` |
| [src/styles.css:442](../../src/styles.css#L442) | ` font-weight: 500; ` |
| [src/styles.css:446](../../src/styles.css#L446) | ` font-size: 12px; ` |
| [src/styles.css:471](../../src/styles.css#L471) | ` font-weight: 600; ` |
| [src/styles.css:472](../../src/styles.css#L472) | ` font-size: 14px; ` |
| [src/styles.css:477](../../src/styles.css#L477) | ` font-size: 11px; ` |
| [src/styles.css:478](../../src/styles.css#L478) | ` font-weight: 600; ` |
| [src/styles.css:480](../../src/styles.css#L480) | ` letter-spacing: 0.5px; ` |
| [src/styles.css:489](../../src/styles.css#L489) | ` font-size: 13px; ` |
| [src/styles.css:491](../../src/styles.css#L491) | ` line-height: 1.5; ` |
| [src/styles.css:510](../../src/styles.css#L510) | ` font-weight: 600; ` |
| [src/styles.css:511](../../src/styles.css#L511) | ` font-size: 14px; ` |
| [src/styles.css:515](../../src/styles.css#L515) | ` font-size: 12px; ` |
| [src/styles.css:522](../../src/styles.css#L522) | ` line-height: 1.6; ` |
| [src/styles.css:524](../../src/styles.css#L524) | ` font-size: 10px; ` |
| [src/styles.css:525](../../src/styles.css#L525) | ` font-weight: 600; ` |
| [src/styles.css:527](../../src/styles.css#L527) | ` letter-spacing: 0.5px; ` |
| [src/styles.css:539](../../src/styles.css#L539) | ` font-size: 13px; ` |
| [src/styles.css:542](../../src/styles.css#L542) | ` line-height: 1.5; ` |
| [src/styles.css:566](../../src/styles.css#L566) | ` font-size: 20px; ` |
| [src/styles.css:571](../../src/styles.css#L571) | ` font-size: 11px; ` |
| [src/styles.css:572](../../src/styles.css#L572) | ` font-weight: 600; ` |
| [src/styles.css:574](../../src/styles.css#L574) | ` letter-spacing: 0.5px; ` |
| [src/styles.css:580](../../src/styles.css#L580) | ` font-size: 16px; ` |
| [src/styles.css:581](../../src/styles.css#L581) | ` font-weight: 600; ` |
| [src/styles.css:586](../../src/styles.css#L586) | ` font-size: 12px; ` |
| [src/styles.css:588](../../src/styles.css#L588) | ` line-height: 1.5; ` |
| [src/styles.css:604](../../src/styles.css#L604) | ` font-family: var(--font-serif); ` |
| [src/styles.css:605](../../src/styles.css#L605) | ` font-size: 28px; ` |
| [src/styles.css:606](../../src/styles.css#L606) | ` font-weight: 300; ` |
| [src/styles.css:612](../../src/styles.css#L612) | ` font-size: 14px; ` |
| [src/styles.css:628](../../src/styles.css#L628) | ` font-size: 12px; ` |
| [src/styles.css:629](../../src/styles.css#L629) | ` font-weight: 500; ` |
| [src/styles.css:638](../../src/styles.css#L638) | ` line-height: 20px; ` |
| [src/styles.css:646](../../src/styles.css#L646) | ` font-size: 14px; ` |
| [src/styles.css:647](../../src/styles.css#L647) | ` font-family: var(--font); ` |
| [src/styles.css:652](../../src/styles.css#L652) | ` .transit-zone-label { display: inline-flex; gap: 5px; align-items: center; height: 40px; color: var(--text-secondary); font-size: 12px; } ` |
| [src/styles.css:653](../../src/styles.css#L653) | ` #transit-timezone { color: var(--text); font-size: 13px; } ` |
| [src/styles.css:677](../../src/styles.css#L677) | ` #transit-choice-label { font-size: 12px; color: var(--text-secondary); } ` |
| [src/styles.css:693](../../src/styles.css#L693) | ` font-weight: 600; ` |
| [src/styles.css:694](../../src/styles.css#L694) | ` font-size: 14px; ` |
| [src/styles.css:698](../../src/styles.css#L698) | ` font-size: 13px; ` |
| [src/styles.css:712](../../src/styles.css#L712) | ` font-size: 14px; ` |
| [src/styles.css:713](../../src/styles.css#L713) | ` font-weight: 600; ` |
| [src/styles.css:725](../../src/styles.css#L725) | ` font-size: 11px; ` |
| [src/styles.css:726](../../src/styles.css#L726) | ` font-weight: 600; ` |
| [src/styles.css:728](../../src/styles.css#L728) | ` letter-spacing: 0.5px; ` |
| [src/styles.css:733](../../src/styles.css#L733) | ` font-weight: 600; ` |
| [src/styles.css:734](../../src/styles.css#L734) | ` font-size: 14px; ` |
| [src/styles.css:738](../../src/styles.css#L738) | ` font-size: 13px; ` |
| [src/styles.css:742](../../src/styles.css#L742) | ` .conn-channel .conn-gates { font-weight: 400; color: var(--text-tertiary); font-size: 13px; } ` |
| [src/styles.css:751](../../src/styles.css#L751) | ` .conn-dynamic-sub { font-size: 13px; color: var(--text-tertiary); margin: 2px 0 10px; } ` |
| [src/styles.css:752](../../src/styles.css#L752) | ` .conn-dynamic p { font-size: 13.5px; margin: 6px 0; } ` |
| [src/styles.css:756](../../src/styles.css#L756) | ` font-size: 12px; font-weight: 600; color: var(--text-tertiary); ` |
| [src/styles.css:759](../../src/styles.css#L759) | ` .conn-empty { font-size: 13px; color: var(--text-tertiary); font-style: italic; padding: 2px 0 4px; } ` |
| [src/styles.css:761](../../src/styles.css#L761) | ` font-size: 13.5px; padding: 7px 0; border-bottom: 1px solid var(--border-subtle); ` |
| [src/styles.css:764](../../src/styles.css#L764) | ` .conn-center-theme { color: var(--text-tertiary); font-size: 12.5px; } ` |
| [src/styles.css:765](../../src/styles.css#L765) | ` .conn-note { font-size: 13px; color: var(--text-secondary); margin: 8px 0 0; } ` |
| [src/styles.css:791](../../src/styles.css#L791) | ` font-size: 13px; ` |
| [src/styles.css:792](../../src/styles.css#L792) | ` font-family: var(--font); ` |
| [src/styles.css:802](../../src/styles.css#L802) | ` font-size: 18px; ` |
| [src/styles.css:821](../../src/styles.css#L821) | ` .role-card .role-name { font-weight: 600; font-size: 14px; } ` |
| [src/styles.css:822](../../src/styles.css#L822) | ` .role-card .role-detail { font-size: 13px; color: var(--text-secondary); margin-top: 2px; } ` |
| [src/styles.css:832](../../src/styles.css#L832) | ` font-size: 11px; ` |
| [src/styles.css:833](../../src/styles.css#L833) | ` font-weight: 600; ` |
| [src/styles.css:835](../../src/styles.css#L835) | ` letter-spacing: 0.5px; ` |
| [src/styles.css:841](../../src/styles.css#L841) | ` font-size: 13px; ` |
| [src/styles.css:843](../../src/styles.css#L843) | ` line-height: 1.5; ` |
| [src/styles.css:866](../../src/styles.css#L866) | ` font-variant-numeric: tabular-nums; ` |
| [src/styles.css:871](../../src/styles.css#L871) | ` font-size: 10px; ` |
| [src/styles.css:872](../../src/styles.css#L872) | ` font-weight: 700; ` |
| [src/styles.css:874](../../src/styles.css#L874) | ` letter-spacing: 0.8px; ` |
| [src/styles.css:882](../../src/styles.css#L882) | ` font-size: 9px; ` |
| [src/styles.css:893](../../src/styles.css#L893) | ` font-size: 11px; ` |
| [src/styles.css:896](../../src/styles.css#L896) | ` font-family: var(--font); ` |
| [src/styles.css:908](../../src/styles.css#L908) | ` font-size: 12px; ` |
| [src/styles.css:912](../../src/styles.css#L912) | ` .bg-planets-design .bg-planet-act { color: var(--hd-design); font-weight: 600; } ` |
| [src/styles.css:913](../../src/styles.css#L913) | ` .bg-planets-personality .bg-planet-act { color: var(--hd-personality); font-weight: 600; } ` |
| [src/styles.css:942](../../src/styles.css#L942) | ` font-size: 12px; ` |
| [src/styles.css:943](../../src/styles.css#L943) | ` line-height: 1.45; ` |
| [src/styles.css:947](../../src/styles.css#L947) | ` .bg-tooltip strong { font-size: 12.5px; } ` |
| [src/styles.css:955](../../src/styles.css#L955) | ` .bg-tt-design { color: var(--hd-design); font-weight: 600; } ` |
| [src/styles.css:956](../../src/styles.css#L956) | ` .bg-tt-personality { color: var(--hd-personality); font-weight: 600; } ` |
| [src/styles.css:957](../../src/styles.css#L957) | ` .bg-tt-channel { margin-top: 3px; color: var(--text-secondary); font-size: 11px; } ` |
| [src/styles.css:1022](../../src/styles.css#L1022) | ` letter-spacing: 0; ` |
| [src/styles.css:1023](../../src/styles.css#L1023) | ` font-weight: 400; ` |
| [src/styles.css:1031](../../src/styles.css#L1031) | ` font-size: 12px; ` |
| [src/styles.css:1032](../../src/styles.css#L1032) | ` font-weight: 400; ` |
| [src/styles.css:1036](../../src/styles.css#L1036) | ` letter-spacing: 0; ` |
| [src/styles.css:1065](../../src/styles.css#L1065) | ` font-size: 13px; ` |
| [src/styles.css:1066](../../src/styles.css#L1066) | ` font-family: var(--font); ` |
| [src/styles.css:1081](../../src/styles.css#L1081) | ` font-size: 12px; ` |
| [src/styles.css:1082](../../src/styles.css#L1082) | ` font-weight: 500; ` |
| [src/styles.css:1095](../../src/styles.css#L1095) | ` font-size: 13px; ` |
| [src/styles.css:1096](../../src/styles.css#L1096) | ` font-family: var(--font); ` |
| [src/styles.css:1124](../../src/styles.css#L1124) | ` font-size: 13px; ` |
| [src/styles.css:1125](../../src/styles.css#L1125) | ` font-family: var(--font); ` |
| [src/styles.css:1138](../../src/styles.css#L1138) | ` font-size: 11.5px; ` |
| [src/styles.css:1149](../../src/styles.css#L1149) | ` font-size: 11.5px; ` |
| [src/styles.css:1150](../../src/styles.css#L1150) | ` font-weight: 500; ` |
| [src/styles.css:1173](../../src/styles.css#L1173) | ` .modal-title { font-family: var(--font-serif); font-size: 19px; margin-bottom: 16px; } ` |
| [src/styles.css:1174](../../src/styles.css#L1174) | ` .modal-field { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; } ` |
| [src/styles.css:1183](../../src/styles.css#L1183) | ` font-size: 14px; ` |
| [src/styles.css:1184](../../src/styles.css#L1184) | ` font-family: var(--font); ` |
| [src/styles.css:1192](../../src/styles.css#L1192) | ` font-size: 13px; ` |
| [src/styles.css:1205](../../src/styles.css#L1205) | ` font-size: 12px; ` |
| [src/styles.css:1206](../../src/styles.css#L1206) | ` font-family: var(--font); ` |
| [src/styles.css:1219](../../src/styles.css#L1219) | ` font-size: 11px; ` |
| [src/styles.css:1220](../../src/styles.css#L1220) | ` font-weight: 600; ` |
| [src/styles.css:1222](../../src/styles.css#L1222) | ` letter-spacing: 0.8px; ` |
| [src/styles.css:1239](../../src/styles.css#L1239) | ` font-size: 13px; ` |
| [src/styles.css:1240](../../src/styles.css#L1240) | ` font-weight: 500; ` |
| [src/styles.css:1241](../../src/styles.css#L1241) | ` font-family: var(--font); ` |
| [src/styles.css:1267](../../src/styles.css#L1267) | ` font-size: 12px; ` |
| [src/styles.css:1268](../../src/styles.css#L1268) | ` font-family: var(--font); ` |
| [src/styles.css:1279](../../src/styles.css#L1279) | ` font-size: 12px; ` |
| [src/styles.css:1286](../../src/styles.css#L1286) | ` font-size: 14px; ` |
| [src/styles.css:1288](../../src/styles.css#L1288) | ` line-height: 1.6; ` |
| [src/styles.css:1293](../../src/styles.css#L1293) | ` .btn-small { font-size: 12px; padding: 6px 12px; } ` |
| [src/styles.css:1302](../../src/styles.css#L1302) | ` font-size: 14px; ` |
| [src/styles.css:1303](../../src/styles.css#L1303) | ` line-height: 1.5; ` |
| [src/styles.css:1321](../../src/styles.css#L1321) | ` font-size: 0.875rem; ` |
| [src/styles.css:1398](../../src/styles.css#L1398) | ` font-size: 13px; ` |
| [src/styles.css:1399](../../src/styles.css#L1399) | ` font-family: var(--font); ` |
| [src/styles.css:1412](../../src/styles.css#L1412) | ` font-size: 17px; ` |
| [src/styles.css:1413](../../src/styles.css#L1413) | ` line-height: 1; ` |
| [src/styles.css:1424](../../src/styles.css#L1424) | ` font-size: 11px; ` |
| [src/styles.css:1425](../../src/styles.css#L1425) | ` font-weight: 500; ` |
| [src/styles.css:1426](../../src/styles.css#L1426) | ` letter-spacing: 0.08em; ` |
| [src/styles.css:1433](../../src/styles.css#L1433) | ` font-size: 22px; ` |
| [src/styles.css:1434](../../src/styles.css#L1434) | ` font-weight: 500; ` |
| [src/styles.css:1436](../../src/styles.css#L1436) | ` line-height: 1.2; ` |
| [src/styles.css:1439](../../src/styles.css#L1439) | ` .detail-hexagram { font-size: 1em; font-weight: inherit; color: inherit; } ` |
| [src/styles.css:1452](../../src/styles.css#L1452) | ` font-family: var(--font-serif); ` |
| [src/styles.css:1453](../../src/styles.css#L1453) | ` font-size: 18px; ` |
| [src/styles.css:1457](../../src/styles.css#L1457) | ` .gate-detail-acts { font-size: 13px; margin-bottom: 8px; line-height: 1.7; } ` |
| [src/styles.css:1458](../../src/styles.css#L1458) | ` .gate-detail-desc { font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; } ` |
| [src/styles.css:1466](../../src/styles.css#L1466) | ` font-size: 12px; ` |
| [src/styles.css:1468](../../src/styles.css#L1468) | ` line-height: 1.5; ` |
| [src/styles.css:1470](../../src/styles.css#L1470) | ` .gate-detail-inactive { font-size: 13px; color: var(--text-tertiary); font-style: italic; } ` |
| [src/styles.css:1482](../../src/styles.css#L1482) | ` .tl-detail-source.gate-detail-acts, .tl-detail-source.gate-detail-transits { padding: 0; margin: 0; border: 0; font-size: 13px; line-height: 1.65; } ` |
| [src/styles.css:1483](../../src/styles.css#L1483) | ` .tl-activation-label { color: var(--text-secondary); font-size: 12px; font-weight: 600; line-height: 1.5; } ` |
| [src/styles.css:1492](../../src/styles.css#L1492) | ` font-weight: 600; ` |
| [src/styles.css:1494](../../src/styles.css#L1494) | ` .tl-activation-glyph { align-self: start; text-align: center; font-size: 1em; line-height: inherit; } ` |
| [src/styles.css:1496](../../src/styles.css#L1496) | ` .tl-activation-value { font-variant-numeric: tabular-nums; } ` |
| [src/styles.css:1498](../../src/styles.css#L1498) | ` .tl-detail-statuses .gate-detail-inactive { margin: 0; font-size: 12px; font-weight: 600; line-height: 1.5; font-style: normal; } ` |
| [src/styles.css:1499](../../src/styles.css#L1499) | ` .gate-detail-body .transit-source-badge.tl-detail-channel-status { display: block; align-self: start; width: fit-content; padding: 0; margin: 0; border-radius: 0; background: none; font-size: 12px; font-weight: 600; line-height: 1.5; text-transform: none; letter-spacing: normal; } ` |
| [src/styles.css:1504](../../src/styles.css#L1504) | ` .tl-detail-timing { position: relative; min-width: 0; display: flex; flex-direction: column; padding: 42px 0 0 10px; font-size: 10px; line-height: 1.4; } ` |
| [src/styles.css:1510](../../src/styles.css#L1510) | ` .tl-timing-values dd { margin: 0; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; } ` |
| [src/styles.css:1512](../../src/styles.css#L1512) | ` .tl-timing-duration dd { font-size: 14px; font-weight: 500; } ` |
| [src/styles.css:1514](../../src/styles.css#L1514) | ` .tl-timing-full-range .tl-timing-duration dd { display: inline-flex; align-items: center; height: 18px; font-size: 18px; line-height: 1; } ` |
| [src/styles.css:1515](../../src/styles.css#L1515) | ` .tl-timing-range-note { margin: auto 0 0; color: var(--text-secondary); line-height: 1.5; } ` |
| [src/styles.css:1555](../../src/styles.css#L1555) | ` line-height: 1.45; ` |
| [src/styles.css:1574](../../src/styles.css#L1574) | ` .tl-gate-detail-header .tl-timing-duration dd { font-weight: 600; } ` |
| [src/styles.css:1617](../../src/styles.css#L1617) | ` .gate-detail-line strong { display: block; font-size: 13px; margin-bottom: 3px; } ` |
| [src/styles.css:1618](../../src/styles.css#L1618) | ` .gate-detail-line p { font-size: 12.5px; color: var(--text-secondary); line-height: 1.55; } ` |
| [src/styles.css:1620](../../src/styles.css#L1620) | ` .selected-activation { font-weight: 700; text-decoration: underline; text-underline-offset: 3px; } ` |
| [src/styles.css:1623](../../src/styles.css#L1623) | ` .reference-heading h1 { margin: 0 0 5px; font-size: 25px; } ` |
| [src/styles.css:1624](../../src/styles.css#L1624) | ` .reference-heading p { color: var(--text-secondary); margin: 0; font-size: 12px; text-align: right; } ` |
| [src/styles.css:1629](../../src/styles.css#L1629) | ` .reference-sidebar label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; } ` |
| [src/styles.css:1631](../../src/styles.css#L1631) | ` .reference-filter-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 13px; padding: 8px 0; border: 0; border-bottom: 1px solid var(--border); background: transparent; color: var(--text-secondary); font: inherit; cursor: pointer; } ` |
| [src/styles.css:1633](../../src/styles.css#L1633) | ` .reference-filter-current { margin: 8px 0 13px; color: var(--text-secondary); font-size: 13px; } ` |
| [src/styles.css:1638](../../src/styles.css#L1638) | ` #reference-count { color: var(--text-tertiary); font-size: 12px; margin: 8px 0; } ` |
| [src/styles.css:1642](../../src/styles.css#L1642) | ` .reference-result small { display: block; color: var(--text-tertiary); font-size: 11px; } ` |
| [src/styles.css:1643](../../src/styles.css#L1643) | ` .reference-result strong { display: block; font-weight: 600; font-size: 13px; } ` |
| [src/styles.css:1645](../../src/styles.css#L1645) | ` .reference-detail h2 { font-size: 24px; margin: 7px 0 12px; } ` |
| [src/styles.css:1646](../../src/styles.css#L1646) | ` .reference-detail h3 { font-size: 15px; margin: 22px 0 9px; } ` |
| [src/styles.css:1691](../../src/styles.css#L1691) | ` font-size: 12.5px; ` |
| [src/styles.css:1692](../../src/styles.css#L1692) | ` font-weight: 600; ` |
| [src/styles.css:1693](../../src/styles.css#L1693) | ` font-family: var(--font); ` |
| [src/styles.css:1703](../../src/styles.css#L1703) | ` .gate-lens-switch button { min-width: 0; min-height: 40px; line-height: 1.3; white-space: normal; overflow-wrap: break-word; } ` |
| [src/styles.css:1719](../../src/styles.css#L1719) | ` .meridian-label { display: block; margin-bottom: 4px; color: var(--text-tertiary); font-size: 11px; font-weight: 600; line-height: 1.4; } ` |
| [src/styles.css:1720](../../src/styles.css#L1720) | ` .meridian-value { display: block; color: var(--text); font-size: 14px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; } ` |
| [src/styles.css:1721](../../src/styles.css#L1721) | ` .meridian-core-item--point .meridian-value { font-size: 16px; } ` |
| [src/styles.css:1722](../../src/styles.css#L1722) | ` .meridian-location { grid-column: 1 / -1; color: var(--text-secondary); font-size: 12.5px; line-height: 1.55; overflow-wrap: anywhere; } ` |
| [src/styles.css:1725](../../src/styles.css#L1725) | ` .meridian-relation-main { display: block; color: var(--text); font-size: 13px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; } ` |
| [src/styles.css:1726](../../src/styles.css#L1726) | ` .meridian-relation-sub { display: block; margin-top: 3px; color: var(--text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; } ` |
| [src/styles.css:1734](../../src/styles.css#L1734) | ` font-size: 12.5px; ` |
| [src/styles.css:1735](../../src/styles.css#L1735) | ` line-height: 1.6; ` |
| [src/styles.css:1740](../../src/styles.css#L1740) | ` .lens-note { font-size: 12px; color: var(--text-tertiary); font-style: italic; margin-top: 10px; } ` |
| [src/styles.css:1746](../../src/styles.css#L1746) | ` font-family: var(--font-serif); ` |
| [src/styles.css:1747](../../src/styles.css#L1747) | ` font-size: 18px; ` |
| [src/styles.css:1752](../../src/styles.css#L1752) | ` .gk-siddhi { color: var(--accent-strong); font-weight: 700; } ` |
| [src/styles.css:1753](../../src/styles.css#L1753) | ` .gk-arrow { color: var(--text-tertiary); font-size: 14px; } ` |
| [src/styles.css:1760](../../src/styles.css#L1760) | ` font-size: 13px; ` |
| [src/styles.css:1763](../../src/styles.css#L1763) | ` .gate-detail-channel p { margin-top: 4px; font-size: 12.5px; } ` |
| [src/styles.css:1765](../../src/styles.css#L1765) | ` .gate-detail-harmonic { margin-top: 10px; font-size: 12.5px; color: var(--text-secondary); } ` |
| [src/styles.css:1771](../../src/styles.css#L1771) | ` font-size: inherit; ` |
| [src/styles.css:1772](../../src/styles.css#L1772) | ` font-family: inherit; ` |
| [src/styles.css:1788](../../src/styles.css#L1788) | ` font-size: 11px; ` |
| [src/styles.css:1789](../../src/styles.css#L1789) | ` font-weight: 700; ` |
| [src/styles.css:1791](../../src/styles.css#L1791) | ` letter-spacing: 0.5px; ` |
| [src/styles.css:1796](../../src/styles.css#L1796) | ` .center-detail-theme { font-size: 12px; color: var(--text-tertiary); } ` |
| [src/styles.css:1798](../../src/styles.css#L1798) | ` .center-reading-label { margin-bottom: 8px; font-size: 11px; font-weight: 700; letter-spacing: .04em; color: var(--accent-hover); } ` |
| [src/styles.css:1800](../../src/styles.css#L1800) | ` .center-reading-state > strong { display: block; margin-bottom: 5px; font-size: 12px; color: var(--text); } ` |
| [src/styles.css:1801](../../src/styles.css#L1801) | ` .center-reading .gate-detail-desc { margin: 0 0 8px; font-size: 14px; line-height: 1.7; } ` |
| [src/styles.css:1806](../../src/styles.css#L1806) | ` font-size: 11px; ` |
| [src/styles.css:1807](../../src/styles.css#L1807) | ` font-weight: 600; ` |
| [src/styles.css:1809](../../src/styles.css#L1809) | ` letter-spacing: 0.6px; ` |
| [src/styles.css:1821](../../src/styles.css#L1821) | ` font-family: var(--font); ` |
| [src/styles.css:1822](../../src/styles.css#L1822) | ` font-size: 12.5px; ` |
| [src/styles.css:1823](../../src/styles.css#L1823) | ` font-variant-numeric: tabular-nums; ` |
| [src/styles.css:1832](../../src/styles.css#L1832) | ` font-weight: 600; ` |
| [src/styles.css:1846](../../src/styles.css#L1846) | ` font-size: 12.5px; ` |
| [src/styles.css:1847](../../src/styles.css#L1847) | ` line-height: 1.5; ` |
| [src/styles.css:1872](../../src/styles.css#L1872) | ` font-size: 13.5px; ` |
| [src/styles.css:1881](../../src/styles.css#L1881) | ` font-size: 13px; ` |
| [src/styles.css:1883](../../src/styles.css#L1883) | ` line-height: 1.55; ` |
| [src/styles.css:1890](../../src/styles.css#L1890) | ` font-size: 12px; ` |
| [src/styles.css:1894](../../src/styles.css#L1894) | ` .act-design { color: var(--hd-design); font-weight: 600; } ` |
| [src/styles.css:1895](../../src/styles.css#L1895) | ` .act-personality { color: var(--hd-personality); font-weight: 600; } ` |
| [src/styles.css:1904](../../src/styles.css#L1904) | ` font-size: 12.5px; ` |
| [src/styles.css:1905](../../src/styles.css#L1905) | ` font-weight: 600; ` |
| [src/styles.css:1906](../../src/styles.css#L1906) | ` font-family: var(--font); ` |
| [src/styles.css:1914](../../src/styles.css#L1914) | ` .gate-pill-partner { font-weight: 400; color: var(--text-tertiary); } ` |
| [src/styles.css:1916](../../src/styles.css#L1916) | ` .planet-table { font-variant-numeric: tabular-nums; } ` |
| [src/styles.css:1925](../../src/styles.css#L1925) | ` font-size: 13.5px; ` |
| [src/styles.css:1929](../../src/styles.css#L1929) | ` font-size: 10.5px; ` |
| [src/styles.css:1931](../../src/styles.css#L1931) | ` font-variant-numeric: tabular-nums; ` |
| [src/styles.css:1935](../../src/styles.css#L1935) | ` .planet-table-head { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; } ` |
| [src/styles.css:1939](../../src/styles.css#L1939) | ` .planet-cell-name { color: var(--text-secondary); font-size: 12.5px; } ` |
| [src/styles.css:1942](../../src/styles.css#L1942) | ` font-size: 11px; ` |
| [src/styles.css:1943](../../src/styles.css#L1943) | ` font-weight: 500; ` |
| [src/styles.css:1945](../../src/styles.css#L1945) | ` letter-spacing: 0.3px; ` |
| [src/styles.css:1950](../../src/styles.css#L1950) | ` font-size: 11px; ` |
| [src/styles.css:1977](../../src/styles.css#L1977) | ` .planet-table-row { grid-template-columns: auto minmax(0, 1fr) auto; gap: 5px; font-size: 12.5px; } ` |
| [src/styles.css:1999](../../src/styles.css#L1999) | ` .transit-birth-pair { position: absolute; top: 38px; right: 0; z-index: 2; width: 130px; min-width: 0; font-variant-numeric: tabular-nums; } ` |
| [src/styles.css:2001](../../src/styles.css#L2001) | ` .transit-graph .bg-planet-row { height: 17px; line-height: 17px; padding: 0 1px; gap: 1px; font-size: 10px; } ` |
| [src/styles.css:2005](../../src/styles.css#L2005) | ` .transit-birth-head .bg-planets-head { font-size: 9px; letter-spacing: 0; margin: 0; white-space: nowrap; } ` |
| [src/styles.css:2009](../../src/styles.css#L2009) | ` .transit-birth-row .transit-birth-value { min-width: 0; height: 17px; line-height: 17px; } ` |
| [src/styles.css:2041](../../src/styles.css#L2041) | ` font-size: 14px; ` |
| [src/styles.css:2042](../../src/styles.css#L2042) | ` font-family: var(--font); ` |
| [src/styles.css:2066](../../src/styles.css#L2066) | ` .connection-graph-name { font-weight: 600; font-size: 14px; } ` |
| [src/styles.css:2069](../../src/styles.css#L2069) | ` font-size: 12px; ` |
| [src/styles.css:2092](../../src/styles.css#L2092) | ` font-size: 12.5px; ` |
| [src/styles.css:2102](../../src/styles.css#L2102) | ` font-size: 13px; ` |
| [src/styles.css:2110](../../src/styles.css#L2110) | ` .conn-detail-who { font-size: 13.5px; margin-bottom: 10px; } ` |
| [src/styles.css:2123](../../src/styles.css#L2123) | ` font-size: 10.5px; font-weight: 700; text-transform: uppercase; ` |
| [src/styles.css:2124](../../src/styles.css#L2124) | ` letter-spacing: 0.6px; color: var(--text-tertiary); margin-bottom: 3px; ` |
| [src/styles.css:2126](../../src/styles.css#L2126) | ` .cdc-name { font-weight: 600; font-size: 13.5px; } ` |
| [src/styles.css:2127](../../src/styles.css#L2127) | ` .cdc-name .conn-gates { color: var(--text-tertiary); font-weight: 400; } ` |
| [src/styles.css:2128](../../src/styles.css#L2128) | ` .cdc-bring { font-size: 12.5px; color: var(--text-secondary); margin-top: 3px; } ` |
| [src/styles.css:2129](../../src/styles.css#L2129) | ` .cdc-blurb { font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; margin-top: 5px; } ` |
| [src/styles.css:2131](../../src/styles.css#L2131) | ` font-size: 11px; font-weight: 700; text-transform: uppercase; ` |
| [src/styles.css:2132](../../src/styles.css#L2132) | ` letter-spacing: 0.5px; color: var(--accent); ` |
| [src/styles.css:2155](../../src/styles.css#L2155) | ` font-size: 13px; ` |
| [src/styles.css:2186](../../src/styles.css#L2186) | ` font-size: 13px; ` |
| [src/styles.css:2187](../../src/styles.css#L2187) | ` font-family: var(--font); ` |
| [src/styles.css:2193](../../src/styles.css#L2193) | ` .sync-popover .btn-primary { width: 100%; padding: 9px; font-size: 13px; } ` |
| [src/styles.css:2196](../../src/styles.css#L2196) | ` font-size: 12px; ` |
| [src/styles.css:2215](../../src/styles.css#L2215) | ` font-size: 11.5px; ` |
| [src/styles.css:2223](../../src/styles.css#L2223) | ` font-size: 12.5px; ` |
| [src/styles.css:2225](../../src/styles.css#L2225) | ` line-height: 1.65; ` |
| [src/styles.css:2242](../../src/styles.css#L2242) | ` font-size: 12px; ` |
| [src/styles.css:2279](../../src/styles.css#L2279) | ` font-size: 13px; ` |
| [src/styles.css:2338](../../src/styles.css#L2338) | ` .nav-link { font-size: 12px; } ` |
| [src/styles.css:2367](../../src/styles.css#L2367) | ` width: 100%; min-height: 40px; padding: 8px 12px; text-align: left; font-size: 14px; ` |
| [src/styles.css:2371](../../src/styles.css#L2371) | ` .people-switcher { width: 96px; min-width: 96px; max-width: 96px; font-size: 11px; } ` |
| [src/styles.css:2377](../../src/styles.css#L2377) | ` #bodygraph-container .bg-planet-row { font-size: 9px; } ` |
| [src/styles.css:2383](../../src/styles.css#L2383) | ` .transit-graph .bg-planet-row { font-size: 10px; } ` |
| [src/styles.css:2389](../../src/styles.css#L2389) | ` .logo-text { font-size: 15px; } ` |
| [src/styles.css:2397](../../src/styles.css#L2397) | ` .logo-mark { font-size: 17px; } ` |
| [src/styles.css:2398](../../src/styles.css#L2398) | ` .logo-text { font-size: 12px; } ` |
| [src/styles.css:2417](../../src/styles.css#L2417) | ` font-size: 13.5px; ` |
| [src/styles.css:2418](../../src/styles.css#L2418) | ` line-height: 1.6; ` |
| [src/styles.css:2424](../../src/styles.css#L2424) | ` font-size: 12px; ` |
| [src/styles.css:2432](../../src/styles.css#L2432) | ` .transit-graph-legend { display:flex; flex-wrap:wrap; gap:10px 20px; font-size:12px; margin-bottom:10px; color:var(--hd-legend-text); } ` |
| [src/styles.css:2451](../../src/styles.css#L2451) | ` .transit-summary-button { display:block; width:100%; text-align:left; font:inherit; color:var(--text); cursor:pointer; } ` |
| [src/styles.css:2455](../../src/styles.css#L2455) | ` .transit-detail-link { display:grid; gap:10px; text-align:left; background:var(--bg); color:var(--text); border:1px solid var(--border); border-radius:8px; padding:16px; font:inherit; cursor:pointer; } ` |
| [src/styles.css:2457](../../src/styles.css#L2457) | ` .transit-detail-action { font-size:12px; color:var(--accent); text-decoration:underline; } ` |
| [src/styles.css:2480](../../src/styles.css#L2480) | ` font-family: Georgia, serif; ` |
| [src/styles.css:2481](../../src/styles.css#L2481) | ` font-size: 38px; ` |
| [src/styles.css:2482](../../src/styles.css#L2482) | ` font-weight: 400; ` |
| [src/styles.css:2483](../../src/styles.css#L2483) | ` line-height: 1; ` |
| [src/styles.css:2485](../../src/styles.css#L2485) | ` .planet-detail-name { min-width: 0; font-size: 26px; font-weight: 600; letter-spacing: -.025em; } ` |
| [src/styles.css:2497](../../src/styles.css#L2497) | ` .planet-detail-gate strong { font-size: 12.5px; font-weight: 600; line-height: 1.5; } ` |
| [src/styles.css:2498](../../src/styles.css#L2498) | ` .planet-detail-gate .transit-detail-action { white-space: nowrap; font-size: 12px; font-weight: 400; color: var(--accent); text-decoration: underline; text-underline-offset: 2px; } ` |
| [src/styles.css:2509](../../src/styles.css#L2509) | ` .planet-detail-substructure dt { color: var(--text-secondary); font-size: 11px; font-weight: 600; line-height: 1.3; } ` |
| [src/styles.css:2510](../../src/styles.css#L2510) | ` .planet-detail-substructure dd { margin: 2px 0 0; color: var(--text); font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.3; } ` |
| [src/styles.css:2513](../../src/styles.css#L2513) | ` .planet-detail-glyph { width: 30px; flex-basis: 30px; font-size: 34px; } ` |
| [src/styles.css:2514](../../src/styles.css#L2514) | ` .planet-detail-name { font-size: 23px; } ` |
| [src/styles.css:2524](../../src/styles.css#L2524) | ` .planet-reading-lead { margin: 16px 0 20px; padding: 12px 15px; border-left: 3px solid var(--accent); border-radius: var(--radius); background: var(--bg-sunken); color: var(--text-secondary); font-size: 14px; font-weight: 400; line-height: 1.7; } ` |
| [src/styles.css:2525](../../src/styles.css#L2525) | ` .planet-reading-body { color: var(--text-secondary); font-size: 14px; line-height: 1.75; } ` |
| [src/styles.css:2531](../../src/styles.css#L2531) | ` .planet-activation-label { margin-bottom: 10px; color: var(--text-secondary); font-size: 11px; font-weight: 600; } ` |
| [src/styles.css:2533](../../src/styles.css#L2533) | ` .channel-analysis-label { margin-bottom: 12px; color: var(--accent-hover); font-size: 11px; font-weight: 600; letter-spacing: .04em; } ` |
| [src/styles.css:2535](../../src/styles.css#L2535) | ` .channel-archetype-label, .channel-state-label { margin-bottom: 6px; font-size: 12px; font-weight: 600; color: var(--text-secondary); } ` |
| [src/styles.css:2536](../../src/styles.css#L2536) | ` .channel-archetype strong { display: block; font-size: 14px; line-height: 1.6; color: var(--text); } ` |
| [src/styles.css:2537](../../src/styles.css#L2537) | ` .channel-archetype-english { display: block; margin-top: 3px; color: var(--text-tertiary); font-size: 12px; line-height: 1.6; } ` |
| [src/styles.css:2539](../../src/styles.css#L2539) | ` .channel-mechanism-label { margin-bottom: 8px; font-size: 14px; font-weight: 600; color: var(--text); } ` |
| [src/styles.css:2542](../../src/styles.css#L2542) | ` .channel-analysis .gate-detail-desc { margin: 0; font-size: 14px; line-height: 1.7; } ` |
| [src/styles.css:2545](../../src/styles.css#L2545) | ` .center-insight-label { margin-bottom: 8px; font-size: 12px; font-weight: 600; color: var(--text); } ` |
| [src/styles.css:2546](../../src/styles.css#L2546) | ` .center-insight .gate-detail-desc { margin: 0; font-size: 14px; line-height: 1.7; } ` |
| [src/styles/appearance-controls.css:14](../../src/styles/appearance-controls.css#L14) | ` .skin-settings-header h2 { font-size: 24px; font-weight: 600; margin-top: 3px; } ` |
| [src/styles/appearance-controls.css:15](../../src/styles/appearance-controls.css#L15) | ` .skin-eyebrow { font-size: 11px; letter-spacing: .08em; color: var(--text-secondary); } ` |
| [src/styles/appearance-controls.css:17](../../src/styles/appearance-controls.css#L17) | ` .skin-presets button { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; padding: 16px; border: 1px solid var(--border); border-radius: 12px; color: var(--text); background: var(--bg); font: inherit; font-size: 14px; cursor: pointer; } ` |
| [src/styles/appearance-controls.css:22](../../src/styles/appearance-controls.css#L22) | ` .skin-custom-note { margin: 22px 0 8px; color: var(--text-secondary); font-size: 12px; } ` |
| [src/styles/appearance-controls.css:23](../../src/styles/appearance-controls.css#L23) | ` .skin-custom-fields label { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); font-size: 13px; } ` |
| [src/styles/appearance-controls.css:27](../../src/styles/appearance-controls.css#L27) | ` .skin-size-control output { width: 32px; font-size: 11px; color: var(--text-secondary); } ` |
| [src/styles/appearance-controls.css:29](../../src/styles/appearance-controls.css#L29) | ` .skin-settings-footer button { font-size: 12px; } ` |
| [src/styles/variable-arrows.css:17](../../src/styles/variable-arrows.css#L17) | ` .bg-variable-label { font-size: clamp(9px, 1.1vw, 11px); line-height: 1.3; text-align: center; overflow-wrap: anywhere; } ` |
| [src/styles/variable-arrows.css:18](../../src/styles/variable-arrows.css#L18) | ` .bg-variable-symbol { font-size: clamp(24px, 3vw, 32px); line-height: 1; font-weight: 500; } ` |
| [src/styles/variable-arrows.css:19](../../src/styles/variable-arrows.css#L19) | ` .variable-grid .arrow-card .arrow-label { color: var(--text); font-size: 14px; text-transform: none; letter-spacing: 0; } ` |
| [src/styles/variable-arrows.css:27](../../src/styles/variable-arrows.css#L27) | ` .foundation-variable-card .foundation-variable-notation { font-size: 10px; color: var(--text-secondary); margin-bottom: 8px; overflow-wrap: anywhere; } ` |
| [src/styles/variable-arrows.css:28](../../src/styles/variable-arrows.css#L28) | ` .foundation-variable-arrows { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; line-height: 1.3; } ` |
| [src/styles/variable-arrows.css:30](../../src/styles/variable-arrows.css#L30) | ` .foundation-variable-heading { text-align: center; font-size: 11px; margin-bottom: 5px; color: var(--hd-personality); } ` |
| [src/styles/variable-arrows.css:32](../../src/styles/variable-arrows.css#L32) | ` .foundation-variable-heading small, .foundation-variable-caption small { display: block; font-size: 9px; overflow-wrap: anywhere; } ` |
| [src/styles/variable-arrows.css:35](../../src/styles/variable-arrows.css#L35) | ` .foundation-variable-slot > span { font-size: 24px; } ` |
| [src/styles/variable-arrows.css:36](../../src/styles/variable-arrows.css#L36) | ` .foundation-variable-caption { font-size: 10px; line-height: 1.4; color: var(--text-secondary); overflow-wrap: anywhere; hyphens: auto; } ` |
| [src/styles/variable-arrows.css:43](../../src/styles/variable-arrows.css#L43) | ` .bg-natal-fixing { flex: 0 0 7px; width: 7px; font-size: 7px; line-height: 7px; overflow-wrap: anywhere; text-align: center; color: var(--text-secondary); } ` |
| [src/styles/variable-arrows.css:48](../../src/styles/variable-arrows.css#L48) | ` .planet-cell-fixing { position: absolute; inset-inline-start: calc(100% + 2px); top: 50%; transform: translateY(-50%); font-size: 8px; line-height: 1; white-space: nowrap; color: var(--text-secondary); } ` |
| [worker/auth.js:45](../../worker/auth.js#L45) | ` '<div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">', ` |
| [worker/auth.js:46](../../worker/auth.js#L46) | ` '<h2 style="font-weight:500">Sign in to Open Human Design</h2>', ` |
| [worker/auth.js:48](../../worker/auth.js#L48) | ` '<p style="color:#777;font-size:13px">This link works once and expires soon. If you didn’t request it, you can safely ignore this email.</p>', ` |
| [worker/mcp.js:322](../../worker/mcp.js#L322) | ` .ph{font:14px/1.5 system-ui,-apple-system,sans-serif;color:#8a8a8a;padding:28px;text-align:center} ` |
| [worker/oauth-ui.js:20](../../worker/oauth-ui.js#L20) | ` body{font-family:Inter,system-ui,sans-serif;background:#faf8f5;color:#1a1714;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0} ` |
| [worker/oauth-ui.js:22](../../worker/oauth-ui.js#L22) | ` h1{font-size:20px;font-weight:600;margin:0 0 6px} p{color:#6b6560;font-size:14px;line-height:1.55} ` |
| [worker/oauth-ui.js:23](../../worker/oauth-ui.js#L23) | ` input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #e5e0da;border-radius:8px;font-size:14px;margin:10px 0} ` |
| [worker/oauth-ui.js:24](../../worker/oauth-ui.js#L24) | ` button{width:100%;padding:11px;background:#c47a2a;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer} ` |
| [worker/oauth-ui.js:26](../../worker/oauth-ui.js#L26) | ` .scopes{background:#faf8f5;border-radius:8px;padding:12px 16px;margin:14px 0;font-size:13.5px} ` |
| [worker/oauth-ui.js:28](../../worker/oauth-ui.js#L28) | ` .muted{font-size:12px;color:#9e9790;margin-top:14px} ` |
| [worker/oauth-ui.js:29](../../worker/oauth-ui.js#L29) | ` .ok{color:#27ae60;font-size:13.5px;display:none} ` |
| [worker/oauth-ui.js:91](../../worker/oauth-ui.js#L91) | ` <a href="${esc(verifyHref)}" style="display:block;text-align:center;text-decoration:none;padding:11px;background:#c47a2a;color:#fff;border-radius:8px;font-size:14px;font-weight:600">Sign in to Open Human Design</a> ` |
| [worker/render.js:34](../../worker/render.js#L34) | ` font: { ` |
| [worker/seo.js:102](../../worker/seo.js#L102) | ` body{margin:0;background:var(--bg);color:var(--text);font:16px/1.7 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased} ` |
| [worker/seo.js:106](../../worker/seo.js#L106) | ` .logo{font-family:'Crimson Pro',serif;font-weight:700;font-size:20px;color:var(--text)} ` |
| [worker/seo.js:107](../../worker/seo.js#L107) | ` .cta-top{font-size:14px;font-weight:600} ` |
| [worker/seo.js:109](../../worker/seo.js#L109) | ` nav.crumb{font-size:13px;color:var(--soft);margin-bottom:18px} ` |
| [worker/seo.js:111](../../worker/seo.js#L111) | ` h1{font-family:'Crimson Pro',serif;font-weight:700;font-size:38px;line-height:1.15;margin:0 0 6px} ` |
| [worker/seo.js:112](../../worker/seo.js#L112) | ` .kicker{color:var(--accent);font-weight:600;font-size:15px;margin-bottom:20px} ` |
| [worker/seo.js:113](../../worker/seo.js#L113) | ` h2{font-family:'Crimson Pro',serif;font-weight:600;font-size:25px;margin:36px 0 12px} ` |
| [worker/seo.js:115](../../worker/seo.js#L115) | ` .lede{font-size:18px;color:var(--text)} ` |
| [worker/seo.js:118](../../worker/seo.js#L118) | ` .card h3{margin:0 0 4px;font-size:16px;font-family:Inter} ` |
| [worker/seo.js:119](../../worker/seo.js#L119) | ` .card p{margin:0;color:var(--soft);font-size:15px} ` |
| [worker/seo.js:121](../../worker/seo.js#L121) | ` .pill{display:inline-block;padding:6px 12px;background:var(--sunken);border-radius:999px;font-size:14px;font-weight:500} ` |
| [worker/seo.js:123](../../worker/seo.js#L123) | ` .grid a{padding:9px 12px;background:var(--card);border:1px solid var(--line);border-radius:10px;font-size:14px} ` |
| [worker/seo.js:124](../../worker/seo.js#L124) | ` .factrow{display:flex;flex-wrap:wrap;gap:8px 24px;margin:14px 0;font-size:15px} ` |
| [worker/seo.js:125](../../worker/seo.js#L125) | ` .factrow b{color:var(--soft);font-weight:600} ` |
| [worker/seo.js:127](../../worker/seo.js#L127) | ` .cta a{display:inline-block;margin-top:10px;padding:11px 20px;background:var(--accent);color:#fff;border-radius:10px;font-weight:600} ` |
| [worker/seo.js:129](../../worker/seo.js#L129) | ` footer.site{border-top:1px solid var(--line);color:var(--soft);font-size:13px} ` |
| [worker/seo.js:364](../../worker/seo.js#L364) | `` <p style="font-size:14px;color:var(--soft)">Birth data Rodden-rated <b>${esc(c.rodden)}</b>${srcUrl ? ` · <a href="${esc(srcUrl)}" rel="nofollow noopener" target="_blank">source</a>` : ''}. Human Design is time-sensitive — this chart reflects the recorded birth time above.</p> `` |
