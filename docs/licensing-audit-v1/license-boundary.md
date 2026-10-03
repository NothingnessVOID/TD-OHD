# 许可证边界

```text
TD-OHD application / own contributions (no project-wide grant chosen)
│
├── MIT pieces, retaining original copyright and notices
│   ├── Unforced Dev OpenHumanDesign inherited UI / worker
│   ├── NatalEngine 1.6.0 adapted data / graph / storage / timezone
│   ├── Jonah Dempcy hdkit SVG geometry
│   ├── SharpAstrology.HumanDesign 1.2.0
│   └── SharpAstrology.Base 0.14.0
│
├── Modern production astronomy
│   ├── SharpAstrology.SwissEph 0.5.1 (CReizner AGPL)
│   │   └── TD-OHD changes in 8 files retain AGPL-derived boundary
│   └── Astrodienst compressed Swiss DE441 .se1 (Swiss terms)
│
├── Jovian local-only prototype
│   ├── TD-OHD wrapper / Python tooling / native_state.c / C# mechanics bridge
│   ├── original Swiss 1.76.00 C (historical GPL-2.0-or-later / Professional)
│   ├── Astrodienst compressed DE406 .se1 (data rights need exact coverage)
│   └── HumanDesign 1.2.0 + Base 0.14.0 MIT mechanics
│
└── Other independent rights
    ├── Inter fonts OFL-1.1 (worker assets)
    ├── npm, .NET / ICU notices
    └── images, reference fixtures, copied text: provenance-specific / unknown
```

文件自己的许可，说明可以如何使用这份材料。最终组合发布许可，说明把这些材料连接起来后，整个程序如何向别人提供。比如自己写的 JS 可在确认版权后单独 MIT 发布；把它连到 AGPL 天文库后发布的产品，还需要满足该组合分发的相应要求。MIT 允许在保留声明的情况下组合，但不会把 AGPL 库转成 MIT。

Modern 的 C# ProjectReference 和浏览器加载证明技术上的组合关系；这不是法律范围的最终判决。动态加载、IPC、服务器拆分都不能仅凭目录或进程名称宣布豁免。历史 C 的 `GPL-2.0-or-later` 允许选择后来 GPL 版本；是否与现代 AGPL 组件组合以及如何提供源码，必须按实际版本和组合方式核定。两个引擎还未组成一个浏览器发行物。

本轮不授予许可、不改变 root LICENSE，也不为未知资料推断版权。OpenHumanDesign 的 MIT 依据是上游 README License section，当前 snapshot 没有独立 LICENSE；NatalEngine 和 hdkit 的完整 MIT 通知在现有 `THIRD_PARTY_NOTICES.md`。需要确认 OpenHumanDesign 项目级作者通知的适当格式。[上游 README](https://github.com/Unforced-Dev/open-human-design/blob/d2d55083caca6ee7da190bdf1d9a08064cf6410b/README.md)

SharpAstrology.Base 的 exact restored NuGet 0.14.0 metadata 写明 MIT，并记录源 commit `b029ea0a57fabf84b0d0209aa8d6871b6e64a41c`；当前仓库 Base 不经过 TD-OHD 修改。[Base 许可](https://github.com/CReizner/SharpAstrology.Base/blob/master/LICENSE.md)
