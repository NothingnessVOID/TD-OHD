"""Read tracked source; regenerate audit evidence only. No app/runtime writes."""
from pathlib import Path
import subprocess, re, json, collections
from urllib.parse import unquote
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/skin-audit'
tracked = subprocess.check_output(['git','ls-files'], cwd=ROOT, text=True).splitlines()
texts = {}
for name in tracked:
    if name.startswith('docs/skin-audit/'): continue
    try:
        content = (ROOT/name).read_text()
        if '\x00' not in content: texts[name] = content
    except (UnicodeError, OSError): continue

def surface(name):
    if name=='src/lib/human-design/svg-renderer.js': return '服务端/本机'
    if name.startswith('src/') or name=='index.html': return 'SPA'
    if name.startswith(('worker/','local/')): return '服务端/本机'
    if name.startswith('public/'): return '静态资源'
    if name.startswith(('tests/','docs/','scripts/')): return '测试/文档/工具'
    return '配置/其他'

def line(text, pos): return text.count('\n',0,pos)+1

def location(file, ln): return f'[{file}:{ln}](../../{file}#L{ln})'

def cell(s): return str(s).replace('|','\\|').replace('\n',' ')

def code(s):
    s=cell(s)
    fence='`' * (max([len(x) for x in re.findall(r'`+',s)] or [0]) + 1)
    return fence+' '+s+' '+fence

def scope(text,pos):
    start=text.rfind('{',0,pos)
    prev=max(text.rfind('}',0,start),text.rfind('{',0,start))
    h=text[prev+1:start].strip()
    h=re.sub(r'/\*.*?\*/','',h,flags=re.S).strip()
    h=h.rsplit('<style>',1)[-1].strip()
    media=[]
    for m in re.finditer(r'@media[^{}]+\{',text[:pos]):
        depth=1; i=m.end()
        while i < pos and depth:
            depth += (text[i]=='{') - (text[i]=='}'); i+=1
        if depth:media.append(m[0][:-1].strip())
    return (' / '.join(media)+' / ' if media else '')+(h[-180:] if h else '运行时/内嵌')

color = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b|\b(?:rgba?|hsla?|color-mix|linear-gradient|radial-gradient)\([^;\n]*')
visual = re.compile(r'(?:--[\w-]+|(?<![\w-])(?:background(?:-color)?|color|fill(?:-opacity)?|stroke(?:-width|-opacity)?|stop-color|opacity|box-shadow|text-shadow|border(?:-[\w-]+)?|outline(?:-[\w-]+)?|filter|font(?:-family|-size|-weight)?|letter-spacing|line-height))\s*[:=]|[\"\'](?:fill|stroke|opacity|font-family|font-size|font-weight|stop-color|fill-opacity|stroke-width)[\"\']\s*:')
typo = re.compile(r'font-family|font-size|font-weight|font-variant-numeric|letter-spacing|line-height|\bfont\s*[:=]|\.font\s*=')
token_defs=collections.defaultdict(list);uses=collections.defaultdict(list)
all_hits=[];visual_lines=[];hard=[];typography=[]
for file,text in texts.items():
    prod=surface(file) in ('SPA','服务端/本机','静态资源')
    # CSS declarations, including CSS embedded in server-generated HTML.
    if prod and Path(file).suffix in {'.css','.js','.mjs','.html','.svg'}:
        clean=re.sub(r'/\*.*?\*/',lambda m:' '*len(m[0]),text,flags=re.S)
        for m in re.finditer(r'(--[a-z][\w-]*)\s*:\s*([^;{}<>\n]+)',clean):
            value=m[2].strip().rstrip('`"\'')
            token_defs[m[1]].append({'file':file,'line':line(text,m.start()),'scope':scope(clean,m.start()),'value':value,'kind':'declaration'})
        for m in re.finditer(r"setProperty\(\s*['\"](--[\w-]+)['\"]\s*,\s*([^\n]+)",text):
            token_defs[m[1]].append({'file':file,'line':line(text,m.start()),'scope':'JS 用户 override','value':m[2].rstrip(';').removesuffix(')'),'kind':'runtime'})
        for m in re.finditer(r'--[a-z][\w-]*',text):
            uses[m[0]].append({'file':file,'line':line(text,m.start())})
    for ln,s in enumerate(text.splitlines(),1):
        # Decode inline SVG URI solely for visual scanning; keep original evidence.
        scanline = unquote(s) if 'data:image/svg+xml' in s else s
        kinds=[]
        if color.search(scanline): kinds.append('颜色/色函数')
        if visual.search(s) or re.search(r'\b(?:fill|stroke|stopColor|fillOpacity|strokeOpacity|strokeWidth|fontFamily|fontSize|fontWeight|backgroundColor|borderColor)\b\s*[:=]',s): kinds.append('视觉属性')
        if typo.search(s): kinds.append('字体')
        if re.search(r'box-shadow|text-shadow|drop-shadow',s): kinds.append('阴影')
        if re.search(r'opacity|fill-opacity|stroke-opacity',s): kinds.append('透明度')
        if not kinds: continue
        hit={'file':file,'line':ln,'surface':surface(file),'kinds':kinds,'source':s.strip()}
        all_hits.append(hit)
        if prod: visual_lines.append(hit)
        if prod and '字体' in kinds: typography.append(hit)
        # One source line is one occurrence, not one color literal.
        if prod and re.search(r'#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[0-9.]|(?:color|fill|stroke|background)\s*[:=]\s*[\"\']?(?:white|black)\b', scanline) and '/tokens/' not in file and not re.match(r'^\s*(?:/\*|\*|//)',s):
            # Exclude HEX-looking Markdown titles, CSS ID selectors and URL anchors.
            if 'data:image/svg+xml' in s or visual.search(s) or (Path(file).suffix in {'.js','.mjs','.json','.svg'} and re.search(r"['\"]#[0-9a-fA-F]{3,8}['\"]",s)):
                hard.append(hit)
# Enumerated getPropertyValue patterns; record dynamic consumers rather than incorrectly calling centers unused.
for file,text in texts.items():
    if not file.startswith('src/'):continue
    for m in re.finditer(r'--hd-center-\$\{key\}(-core)?',text):
        for center in ['head','ajna','throat','g','heart','spleen','solar','sacral','root']:
            uses['--hd-center-'+center+(m[1] or '')].append({'file':file,'line':line(text,m.start()),'dynamic':True})
custom={'--accent':'accent','--hd-personality':'personality','--hd-design':'design','--hd-transit':'transit','--hd-graph-bg':'graphBackground','--hd-gate-number-size':'gateNumberSize'}
noncolor={'--tl-cursor','--tl-mobile-planet-scale','--tl-mobile-control-size','--tl-mobile-control-icon','--tl-mobile-arrow-size','--tl-mobile-arrow-font','--tl-mobile-range-height','--tl-mobile-range-width','--tl-mobile-range-font','--tl-mobile-edge','--tl-mobile-event-bottom','--tl-mobile-event-gap','--font','--font-serif','--max-width','--header-height','--radius','--radius-lg','--tl-label-width','--tl-row-height','--tl-canvas-height','--hd-gate-number-size','--hd-gate-number-baseline-offset','--hd-gate-active-weight','--hd-gate-inactive-weight','--hd-gate-circle-opacity','--hd-inactive-channel-opacity','--hd-center-stroke-width','--hd-transit-ring-width','--hd-transit-hatch-opacity'}
def category(t):
    if t.startswith('--hd-connection-') or t.startswith('--connection-'):return 'Relationship'
    if t.startswith('--tl-'):return 'Timeline'
    if t in ('--font','--font-serif'):return 'Typography'
    if t.startswith('--hd-') or t in ('--personality','--design','--both','--undefined','--electromagnetic','--generator','--manifestor','--projector','--reflector','--manifesting-generator') or t.startswith(('--graph-','--transit-source','--center-')):return 'Human Design/兼容'
    return '网站/局部作用域'
def semantic(t, group):
    names={
      '--bg':'全站页面底色；SEO 同名变量独立', '--bg-elevated':'卡片与浮层表面', '--bg-sunken':'下沉区/次级按钮底色',
      '--text':'主文字；SEO 同名变量独立', '--text-secondary':'次级正文/说明', '--text-tertiary':'弱提示/图标',
      '--border':'标准边框', '--border-subtle':'弱边框', '--accent':'站点强调色；SEO 同名变量独立', '--accent-strong':'强调文字/时间游标',
      '--accent-soft':'强调浅底', '--accent-hover':'强调交互 hover', '--accent-on':'强调底色上的文字', '--focus':'键盘聚焦轮廓',
      '--modal-backdrop':'dialog backdrop 遮罩', '--modal-overlay':'自建浮层遮罩', '--lens-active-shadow':'知识 Lens 选中项阴影',
      '--site-auth-glow':'本机登录页径向光晕', '--site-auth-shadow':'本机登录卡投影颜色',
      '--font':'全站无衬线/BodyGraph 字体栈', '--font-serif':'展示标题衬线栈',
      '--max-width':'页面最大宽度', '--header-height':'Header 高度', '--radius':'标准圆角', '--radius-lg':'大圆角',
      '--knowledge-color':'Knowledge Detail 局部强调色，默认 accent',
      '--card':'SEO 卡片', '--sunken':'SEO 下沉底色', '--soft':'SEO 次级文字', '--line':'SEO 分割线', '--accent2':'SEO 辅助强调色',
      '--tl-surface':'时间轴表面', '--tl-line':'时间轴边框', '--tl-transit':'时间条行运填色（与行运文字不同）',
      '--tl-transit-ink':'时间条行运底色上的字', '--tl-birth':'时间条本命来源', '--tl-cursor':'选定时刻的百分比位置（数据/布局，非色）',
      '--tl-cursor-color':'时间游标/focus 色', '--tl-date-even':'偶数日期格底色', '--tl-date-odd':'奇数日期格底色',
      '--tl-day-even':'偶数日覆盖层', '--tl-day-odd':'奇数日覆盖层', '--tl-day-divider':'日分隔线',
      '--tl-label-width':'时间轴标签宽度', '--tl-row-height':'时间轴行高', '--tl-canvas-height':'时间轴画布高度',
      '--hd-both':'本命双来源颜色', '--hd-both-on':'本命双来源字色', '--hd-undefined':'未定义概念/图例色',
      '--hd-undefined-center':'开放中心实际底色', '--hd-inactive':'未激活通道/闸门底色', '--hd-inactive-on':'未激活闸门字色',
      '--hd-center-stroke':'中心边线', '--hd-defined-fill':'通用已定义状态填色（accent 别名）', '--hd-undefined-fill':'通用未定义状态透明填色',
      '--hd-electromagnetic':'电磁关系强调', '--hd-selection-ring':'BodyGraph/Timeline 选择轮廓',
      '--hd-gate-number-size':'闸门数字字号', '--hd-gate-number-baseline-offset':'闸门数字 y 偏移',
      '--hd-gate-active-weight':'激活闸门字重', '--hd-gate-inactive-weight':'未激活闸门字重',
      '--hd-gate-circle-opacity':'激活闸门圆底透明度', '--hd-inactive-channel-opacity':'未激活通道透明度',
      '--hd-center-stroke-width':'中心边线宽', '--hd-transit-ring-width':'行运叠加外环宽', '--hd-transit-hatch-opacity':'行运斜线透明度',
      '--hd-transit-text':'行运列及临时 fixing 标记可读文字色', '--hd-transit-soft':'行运浅底',
      '--hd-graph-bg':'SVG 图内背景', '--hd-graph-panel-bg':'图表外层 panel 背景', '--hd-graph-panel-border':'图表 panel 边框',
      '--hd-planet-column-text':'行星列通用字色', '--hd-connection-both-on':'双方条纹上的闸门字色',
    }
    if t in names:return names[t]
    if t.startswith('--shadow'):return '网站投影规格 '+t.removeprefix('--shadow')
    if t.startswith('--status-'):return '独立网站状态语义：'+t.removeprefix('--status-')
    if t.startswith('--type-'):return '主页类型/策略产品 UI：'+t.removeprefix('--type-')
    if t.startswith('--ui-icon-'):return '共享圆形图标按钮局部 override：'+t.removeprefix('--ui-icon-')
    if t.startswith('--tl-mobile-'):return '手机时间轴尺寸/缩放/位置：'+t.removeprefix('--tl-mobile-')
    if t.startswith('--hd-center-'):return '九中心独立 palette：'+t.removeprefix('--hd-center-')+('（径向渐变高光）' if t.endswith('-core') else '')
    if t.startswith('--hd-connection-'):return '关系合图来源：'+t.removeprefix('--hd-connection-')+'（a/b/bridged；core 为高光，on 为字色）'
    if t.startswith('--hd-circuit-'):return '回路 palette/badge：'+t.removeprefix('--hd-circuit-')+'（与网站状态独立）'
    if t.startswith('--hd-type-'):return 'Human Design 类型颜色：'+t.removeprefix('--hd-type-')
    if t.startswith(('--hd-personality','--hd-design','--hd-transit')):return '激活来源及其 on 字色：'+t.removeprefix('--hd-')
    if t.startswith(('--hd-tooltip-','--hd-detail-','--hd-legend-','--hd-timeline-')):return '图表领域 surface/边框/字色：'+t.removeprefix('--hd-')
    return '旧组件兼容语义名；跟随右侧 var() 指向的 canonical Token（不是独立 palette）'
tokens=[]
for t,defs in sorted(token_defs.items()):
    refs=list({(r['file'],r['line']):r for r in uses[t]}.values())
    deps=sorted(set(re.findall(r'var\((--[\w-]+)', ' '.join(d['value'] for d in defs))))
    mixed=any('color-mix(' in d['value'] for d in defs)
    # A shadow embeds color but is not a color token.
    kind='shadow' if 'shadow' in t and t != '--site-auth-shadow' else ('non-color' if t in noncolor else 'color')
    tokens.append({'token':t,'kind':kind,'category':category(t),'definitions':defs,'references':refs,'dependencies':deps,'derivedColor':kind=='color' and (mixed or (t=='--accent-on' and any(d['kind']=='runtime' for d in defs))),'customKey':custom.get(t)})
stats={'baseline':subprocess.check_output(['git','merge-base','HEAD','origin/main'],cwd=ROOT,text=True).strip(),'trackedTextFiles':len(texts),'visualTokens':len(tokens),'colorTokens':sum(t['kind']=='color' for t in tokens),'shadowTokens':sum(t['kind']=='shadow' for t in tokens),'nonColorTokens':sum(t['kind']=='non-color' for t in tokens),'derivedColorTokens':sum(t['derivedColor'] for t in tokens),'aliasOrDependentColorTokens':sum(t['kind']=='color' and bool(t['dependencies']) for t in tokens),'hardcodedColorLines':len(hard),'visualPropertyLines':len(visual_lines),'typographyLines':len(typography),'allRepositoryHitLines':len(all_hits)}
OUT.mkdir(exist_ok=True)
(OUT/'scan-evidence.json').write_text(json.dumps({'stats':stats,'tokens':tokens,'hardcodedColorLines':hard,'visualLines':visual_lines,'allRepositoryHits':all_hits},ensure_ascii=False,indent=2)+'\n')
intro=f'''# Token 全量盘点\n\n基线 `{stats['baseline']}`。共 **{len(tokens)} 个唯一 custom property 名称**，含网站、HD、Timeline、布局字体、兼容别名与 Worker SEO 局部变量。不同 Theme/Skin 声明不重复计数；相同名称在 Worker 与 SPA 中各自独立，不能据名称推断共享。色 Token {stats['colorTokens']}，阴影 {stats['shadowTokens']}，其他 {stats['nonColorTokens']}。这是源码声明盘点，非当前页面 computed value 快照。\n\n使用位置包含声明、CSS 引用和 JS 读取的完整源码引用位置；动态中心读取已展开。`var()` 依赖不等于色彩计算：别名与 surface 映射单独记录。\n\n'''
for group in ['网站/局部作用域','Human Design/兼容','Relationship','Timeline','Typography']:
    intro+='## '+group+'\n\n| Token | 当前值及条件 | 使用位置 | 语义 | 是否派生 | 用户自定义 |\n|---|---|---|---|---|---|\n'
    for t in tokens:
        if t['category']!=group:continue
        values='<br>'.join(f"{code(d['scope'])} → {code(d['value'])} ({location(d['file'],d['line'])})" for d in t['definitions'])
        refs='<br>'.join(location(r['file'],r['line']) for r in t['references']) or '无静态引用'
        deriv='色运算/条件计算' if t['derivedColor'] else ('别名/依赖 '+', '.join(t['dependencies']) if t['dependencies'] else '否')
        intro+=f"| `{t['token']}` | {values} | {refs} | {semantic(t['token'], t['category'])} | {deriv} | {t['customKey'] or '无 UI 直接入口'} |\n"
    intro+='\n'
(OUT/'token-inventory.md').write_text(intro.rstrip()+'\n')
header='''# 硬编码视觉值\n\n## 统计口径\n\n下表穷举当前第一方 SPA、Worker/本机与静态资源中具有视觉语义的颜色字面量源码行，排除集中 Token 文件。**一行计一处**，一行多个色只算一处；包含内嵌色阶、派生公式锚点、fallback、skin swatch、分享图 palette，不声称每处都是缺陷或必须 Token 化。无语义的 URL fragment、Markdown 标题不计。集中 palette 字面量已在 Token 表中记录。内嵌 favicon 的 URL 编码在扫描时解码，证据保留原行。\n\n全仓文本扫描（含测试、文档、工具）的原始命中及所有运行视觉属性见 `scan-evidence.json`；测试期望、历史审计和演示指针不能混入生产缺陷数。CSS/HTML/JS/SVG 采取静态扫描，不执行代码；动态模板不把几何 `d` 或 SVG ID 当成颜色。\n\n## 运行时硬编码候选\n\n| 位置 | 表面 | 当前整行值 / 上下文 |\n|---|---|---|\n'''
for h in hard:header+=f"| {location(h['file'],h['line'])} | {h['surface']} | {code(h['source'])} |\n"
header+='''\n## 非颜色的固定视觉参数\n\n以下不计入硬编码颜色数，但仍与皮肤一致性有关；完整 opacity、阴影、focus、SVG 属性均有机器证据。\n\n- `src/bodygraph.js:247`：中心 radialGradient 的 cx=.5、cy=.36、r=.78；双方条纹 8×8 / 45°，行运条纹 10 与 4 的尺寸固定。\n- `src/bodygraph.js:389`：临时定义中心 fill-opacity=0.5，未接入独立 Token；其余 inactive channel、circle、hatch opacity 已有 Token。\n- `src/lib/human-design/svg-renderer.js`：分享 SVG 的 channel opacity=.4、stroke-width=1.5/1、字号 11/26 等独立于互动 BodyGraph。\n- `src/styles.css` 与 `src/features/transit-timeline/timeline.css`：hover/dim、阴影几何、border/outline 宽度、transition/keyframe alpha 与字号大量为局部规格。\n- `src/lib/view-share.js:60`：导出时强制 opacity=1 / animation=none，是截图确定性处理，不是 Skin 的常规值。\n\n## 候选性质\n\n- 分享图 palette、SEO/登录/邮件：独立模板确有视觉输出，当前不继承 SPA 用户设置。\n- swatch：preset 示意，而非随用户 override 重绘。\n- `color-mix()` 中的 white / #16130f / #445457 / #111516：固定计算锚点。\n- 对比色与 input fallback：仍属于字面量，但不能直接归并成一个“白色 Token”。\n- SVG none / transparent / currentColor：绘制/继承语义，不能作为缺失彩色 palette 自动修复。\n'''
(OUT/'hardcoded-visuals.md').write_text(header)
t='''# 字体与排版审计\n\n## 控制路径\n\n- `index.html:24-26` 加载 Google Fonts：Inter 300/400/500/600/700 与 Crimson Pro normal 300/400、italic 300，失败时落回本机 system-ui / Georgia。\n- `src/styles.css:8-15` 定义 `--font`、`--font-serif`；html 16px、body line-height=1.6；没有全站正文/标题字号、字重、行高、字距 Token 分级。\n- Header/导航/表单/公共 button 主要 Inter；结果大标题、若干 modal/Timeline 标题用 serif；Reference/Knowledge 的各层字号主要组件内 px/em。\n- `src/bodygraph.js:469-471`：Gate 数字字号/字重读 HD Token，字体读 `--font`；不是独立“图表字体”Token。SVG 数字基线偏移另有 Token。\n- Planet 标题 glyph 直接 Georgia, serif（desktop 38px / 34px mobile）；名称 26px / 23px，各自固定；与普通 body glyph/font 不同用途。\n- Timeline 日期/数字使用 `font-variant-numeric: tabular-nums`，不是独立等宽字体。源文件中 monospace / system-ui / Inter 的额外直接调用列于下表。\n- `src/lib/view-share.js:75`：Canvas 标题固定 `52px sans-serif`；SVG 分享图通过 fontFamily 参数（Worker 调用传 Inter）控制，不能读取浏览器 CSS。\n- Worker SEO 单独加载 Inter 400/500/600、Crimson Pro 600/700；与 SPA 请求的字体 weight 集合不同。OAuth 与 MCP HTML 也有独立 font 声明。\n\n## 全量运行排版命中\n\n一行可以含多个声明，保留完整行；不把 CSS inherit、SVG 用户单位或 responsive override 当成同一全局等级。\n\n| 位置 | 当前规格 |\n|---|---|\n'''
for h in typography:t+=f"| {location(h['file'],h['line'])} | {code(h['source'])} |\n"
(OUT/'typography.md').write_text(t)
print(json.dumps(stats,ensure_ascii=False,indent=2))
