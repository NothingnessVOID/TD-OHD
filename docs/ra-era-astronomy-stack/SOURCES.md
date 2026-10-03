# 来源、源码证据与未取得资料

读取/下载日期：2026-10-03。这里只归档来源记录、定位与哈希，第三方文献全文、源代码与二进制均不重新分发。`CONFIRMED`需注明是公开说明、源码事实还是本地数值实验；三者不互相替代。

## 历史源代码的身份

1. [Maitreya 7.0.7 original source tarball](https://archive.debian.org/debian/pool/main/m/maitreya/maitreya_7.0.7.orig.tar.bz2) 内 `src/swe` 宏为1.76.00，原生返回同版本。[DSC](https://archive.debian.org/debian/pool/main/m/maitreya/maitreya_7.0.7-1.dsc) 公布的SHA-256一致。Debian打包年代晚于库版号；没有把包装日期当Swiss发行日期。
2. [libswe 1.77.00.0005 original source](https://archive.debian.org/debian/pool/main/libs/libswe/libswe_1.77.00.0005.orig.tar.bz2) 内 `astrodienst/src` 宏和运行均为1.77.00，`.0005`是wrapper版本。[DSC](https://archive.debian.org/debian/pool/main/libs/libswe/libswe_1.77.00.0005-2.dsc) 的SHA-256一致。只构建original archive中的C文件，没有应用Debian patch。
3. [swe4r独立归档固定提交](https://github.com/aakara/swe4r/tree/455b7f220aaf96ad417c8fe864f2f1b5b6c30456/ext/swe4r) 与1.77归档的八个核心文件逐字节一致。`swemplan.c`不同，明确保留差异；它负责Moshier路径，本研究请求/返回flags严格相同，禁止fallback。
4. [Modern 2.10.03固定源码提交](https://github.com/aloistr/swisseph/tree/175e1fcb3108bcd5c0d146c803f51dcf23508012) 用作参考，版本宏/运行再验证。

完整archive/file哈希：[acquisition-manifest.json](acquisition-manifest.json)、[build-manifest.json](results/build-manifest.json)、[source-evidence.json](source-evidence.json)。**DSC核对不是PGP验签**；不能声称已验证Astrodienst官方发行签名或准确复原Jovian部署二进制。

### 标签陷阱和1.70覆盖缺口

[官方仓库](https://github.com/aloistr/swisseph) 的`v1.76.02`、`v1.77`在此次实际解析到的提交中，根文件为1998年代源码，缺失需要的SE_VERSION和对应模型。递归树仅一份根`sweph.h`，没有隐藏的新版本子目录。排除的commit/header哈希在source-evidence中，可独立核验。

1.70真实存在及其模型变化，可由2006年的官方文档/发布说明确认。但没有取得能验证的1.70发行源码；检索官方tags、Debian旧归档、历史PySwiss/Zope发行入口及独立旧mirror后仍未补齐。失效或错版入口没有进入计算矩阵。Maitreya6.0.5归档中的版本也为1.76，不能冒充1.70。1.70必须保留为未测试版本，而不是从现代old-model设置推测其结果。

## 实际旧源码定位

`source-evidence.json` 对每条列出版本、原文件名、精确行号及完整文件SHA-256。关键位置：

| 事实 | 1.77原文件 / 定位 | 证据状态 |
|---|---|---|
| P03岁差默认 | `swephlib.h:76–85` | CONFIRMED source |
| IAU2000B章动默认，1980/2000A关闭 | 同上 | CONFIRMED source |
| 1987章动改正关闭 | `swephlib.h:65` | CONFIRMED source |
| native UT接口加ΔT | `sweph.c:397–402` | CONFIRMED source + native check |
| DE≥403且非ICRS时应用bias | `sweph.c:2303–2304`及其他天体路径 | CONFIRMED source |
| 闰秒表最后2008-12-31 | `swedate.c:308` | CONFIRMED source |
| 旧UTC转换回退UT1条件 | `swedate.c:437–440` | CONFIRMED source + measured cases |
| ΔT表终年2017 | `swephlib.c:1487` | CONFIRMED source |
| frame rotation函数 | `swephlib.c` 的 `swi_bias` | CONFIRMED source |

没有只引用现代说明反推旧版行为。编译时未提供外部`seleapsec.txt`/`sedeltat.txt`，也清除子进程`SE_EPHE_PATH`变量，避免运行环境隐式覆盖默认值。

## 星历来源

- **DE406 compressed Swiss**：[固定历史mirror目录](https://github.com/arcanous/astrosonnet/tree/92ecd816bcec2816c2e794369acd7743e927ab1a/eph)，Astrodienst版权头。文件头DE406及原生加载元数据均确认。它证明取到真实DE406格式数据，不证明字节与2011年Jovian安装文件相同。
- **DE431**：[官方固定提交](https://github.com/aloistr/swisseph/tree/b51a083390bf3cdc93a6ba466cbc83b846c4cfc4/ephe)，同样核实实际DE number。
- **DE441**：[官方固定提交](https://github.com/aloistr/swisseph/tree/cae9ecd4b201544d85e411aced17660932514d43/ephe)，与本轮读取的TD-OHD文件哈希相同，是2026-05-26的数据构建。不能泛称“所有DE441都一样”。
- **直接JPL DE406**：[NASA Linux目录](https://ssd.jpl.nasa.gov/ftp/eph/planets/Linux/de406/)，`lnxm3000p3000.406`，[header](https://ssd.jpl.nasa.gov/ftp/eph/planets/Linux/de406/header.406)。MD5为`39e63b24f3540b92ec83be008f20d70e`，不同于Astro.com另一个端序文件名`de406e.eph`的公布MD5，不声称两者二进制相同。

数据的获取日期、bytes、SHA-256、DE标识均集中登记在acquisition manifest。所有源数据留在仓库外，Git只含元数据和输出值。

## 原始文献与公开说明

| 来源 | 实际支持的结论 | 不能推出什么 / 归档方式 |
|---|---|---|
| [Swiss官方2006技术手册](https://www.astro.com/swisseph/swisseph_acrobat.pdf)，第5、7–8页 | DE406压缩精度说明；当年Horizons1976/1980与Swiss1.70 P03/2000B/bias差异 | 不是Jovian代码证据；实际PDF已下载、阅读，SHA-256在manifest，全文留本地 |
| [Swiss changelog](https://www.astro.com/swisseph/swephprg.htm) / [PDF](https://www.astro.com/swisseph-download/doc/swephprg.pdf) | 1.70/1.76/1.77模型和发行时间线 | 旧默认以实际源码为准；概览和明细日期存在差别，不取页面日期替代源码身份 |
| [Swiss publisher readme](https://github.com/aloistr/swisseph/blob/master/readme.md) | 当前数据重建与版本兼容说明 | 不证明旧网站的数据构建 |
| [2006 Swiss发布记录](https://groups.io/g/swisseph/topics?after=1152719775000000000&page=119) | 当年1.70和frame bias/P03/2000B已存在 | 不复制邮件地址或无关列表正文；不是可构建源码包 |
| [Standish 1998 DE405/DE406 memo](https://ssd.jpl.nasa.gov/ftp/eph/planets/ioms/de405.iom.pdf)，第1页和§VII第5页 | DE405 ICRF；DE406长时段低阶插值，省略nutation/libration数据 | DE406不单独定义apparent/ecliptic pipeline；扫描PDF已渲染核读，哈希在manifest |
| [JPL DE export文档](https://ssd.jpl.nasa.gov/planets/eph_export.html) | DE405/406、430/431、440/441各代定义与参考论文 | 不推出任一HD网站实际使用版本 |
| [Lieske 1979 IAU1976 precession matrix](https://adsabs.harvard.edu/full/1979A%26A....73..282L)，A&A 73,282–284 | 1976岁差矩阵的原始文献身份；JPL官方参考文献同样列出 | 本轮数值使用已取得旧Swiss源码的实现，不声称独立重写本文全部公式 |
| [Wahr 1981 forced nutations](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1365-246X.1981.tb02691.x)，GJRAS64,705–727 | IAU1980相关原始nutation研究 | 公开文献记录；没有绕过全文权限，也未假称已获得历史Horizons的实际系数/EOP |
| [Mathews/Herring/Buffett 2002 nutation/precession](https://doi.org/10.1029/2001JB000390) | 2000模型与此前1980模型的原研究背景 | 模型背景，不能代替项目具体运行配置证据 |
| [Capitaine等2003 P03论文](https://www.aanda.org/articles/aa/pdf/2003/48/aa4068.pdf) | 岁差模型本身 | 不证明官方HD模型；web可读取，直接下载403，因此未伪造本地PDF归档或哈希 |
| [Capitaine/Wallace/Chapront 2005](https://www.aanda.org/articles/aa/pdf/2005/10/aa1908.pdf) / [Observatory P03 tables](https://syrte.obspm.fr/iau2006/P03_Tables.html) | P03的后续表式与标准化背景 | 同上，模型存在不等于官方采用 |
| [IAU resolutions原文入口](https://syrte.obspm.fr/IAU_resolutions/Resol-UAI.htm) / [IAU列表](https://www.iau.org/Iau/Iau/Publications/List-of-Resolutions.aspx) | 1976/1980以及2000/2006标准演进 | 标准颁布时间不等于某商业产品迁移时间 |
| [SOFA 2009-12-31发布公告](https://iauarchive.eso.org/news/announcements/detail/ann10005/) | 2009 SOFA release存在 | 历史SOFA源码未取得；[archive](https://www.iausofa.org/archive)当前未提供该包，不声称已运行 |
| [IERS 2010 conventions版本](https://iers-conventions.obspm.fr/conventions_versions.php) / [chapter5](https://iers-conventions.obspm.fr/chapter5.php) | 惯性/地球坐标转换与CPO/EOP背景 | 未使用历史EOP数据，不冒称完整2010标准实现 |
| [IERS IAU1980 EOP series元数据](https://datacenter.iers.org/discontinued/www.iers.org/SharedDocs/Metadaten/EN/22_EOP_C04_1980/614_EOP_C04_XX_IAU1980.html) | 历史1980模型pole-offset序列存在 | 未按数据重建Horizons |
| [IERS leap second table](https://hpiers.obspm.fr/iers/bul/bulc/Leap_Second.dat) | 本测试时间域1972–2017闰秒变化，当前最后2017；用于独立UTC→TT | web实际核查；直接curl403，没有把错误页伪装成已归档表格 |
| [Jovian MMI产品页](https://jovianarchive.com/products/maia-mechanics-imaging-mmi)，Chart Creation & Accuracy | **CONFIRMED公开声明**：MMI使用JPL planetary database | 未披露具体DE、Swiss、2010/2011实现；当前页面也介绍2025重构，不假定各代同算法 |
| [JPL Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html)，Precession / Nutation / EOP / Time-scale | 当前1976/1980+EOP和TDB转换政策 | 当前文档v4.98e，不能直接作为2011运行源码或Jovian配置 |

来源只使用原作者、机构、官方归档或实际历史源码。没有新采集私人账号资料。上述公开网页是本次读取时间的证据；PDF/源码/星历中已实际下载的资产有hash锁定，未下载网页不冒称不可变快照。外部网页未来可能改变。

## 尚未知、下一轮需要的证据

- 可验证Swiss1.70原发行包及默认源码，补一行真实结果。
- 官方精确longitude、秒级boundary transition、Color/Tone/Base。离散Gate.Line只限制区间。
- 2010/2011 JPL/Horizons源代码或完整文档、EOP文件和时间调用证据。
- Jovian/MMI/myBodyGraph是否共用某具体引擎的直接公开证据。
- 现有40个唯一时刻之外，更宽年代、非Sun/Design与True Node/Moon边界对照。当前无推广为全图通用兼容算法的依据。
