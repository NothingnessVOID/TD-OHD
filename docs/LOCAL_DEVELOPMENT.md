# 本地开发、测试人物与异地同步

## 固定预览端口与局域网

开发和构建预览固定使用 **9961**，监听 `0.0.0.0`。本机可用 **http://127.0.0.1:9961/**；同一局域网的另一台电脑使用 **http://本机局域网IP:9961/**。

每个浏览器固定使用同一地址，避免混用 `localhost`、IP与旧端口。人物资料按浏览器和地址分别保存，不会因访问同一开发服务器而自动同步。开发服务器只用于可信局域网，不做公网端口映射；Windows放行应限制为专用网络、本地子网和TCP9961，不关闭整个防火墙。`docs/handoff/`及环境文件不通过开发服务器开放。

在项目目录运行（Windows PowerShell）：

```powershell
npm.cmd ci              # 首次安装或需要重装依赖时
npm.cmd run dev         # 日常开发，前端修改会热更新
```

构建产物预览：先停止开发服务，再运行：

```powershell
npm.cmd run build:pages
npm.cmd run preview
```

两个服务都使用 9961，端口占用时会报错，不自动换地址。先确认占用进程，再停止本项目旧服务；不要盲目结束无关进程。C# 引擎修改后需要重新构建引擎并刷新页面。Vite 不监听 .NET 的 `bin/`、`obj/` 编译目录，避免 Windows 文件锁导致 `EBUSY`；源码和最终 `public/engine` 文件仍保持监听。

浏览器端到端脚本的旧默认端口各不相同；在 PowerShell 运行这些脚本前，显式指定目标地址。并行工作树使用协调者分配的独立回环测试端口，只有验证后的共享预览占用9961：

```powershell
$env:E2E_URL = 'http://127.0.0.1:9961'
```

局域网开发冒烟测试（需要已安装Playwright Chromium；此测试在本机浏览器访问LAN地址，不能替代另一台电脑实测防火墙）：

```powershell
$env:CHROME_CHANNEL = 'chromium'
$env:E2E_URL = 'http://开发主机局域网IP:9961'
node tests/lan-preview-e2e.mjs
```

若另一台电脑无法连接，先核对地址和是否同网。新增Windows防火墙规则需要管理员PowerShell；普通进程即使账号名为Administrator也可能没有提升令牌。仅在用户确认下添加专用网络、本地子网、TCP9961及Node程序的规则，不关闭防火墙。

## 十位虚构测试人物

1. 使用 `npm.cmd run dev` 启动。
2. 在要测试的浏览器打开 **http://127.0.0.1:9961/dev/test-people.html**；另一台电脑将 `127.0.0.1` 替换为开发主机的局域网IP。
3. 点击“导入十位虚构测试人物”，然后点击“返回 TD-OHD”。
4. 在已保存人物下拉框或团队选人列表中使用这些资料。

姓名统一标为 `测试01` 至 `测试10` 并带“虚构”。资料含出生日期、当地时间、历史 UTC 时差、IANA 时区及地点坐标；包含 UTC 0、负时差、南半球和闰日样本。

- 数据文件：`fixtures/dev-test-people.json`。这是此开发导入页的版本化格式，不声称兼容其他应用的导入格式。
- 固定 ID 使重复导入跳过已有记录，保留用户对测试人物的修改。
- 不覆盖、不删除已有真实资料，也不会自动创建团队或变更分组。
- 人物库上限为 50；空间不足会在写入前报错。浏览器写入中断后可重试，已保存的编号会跳过。
- Team 成员池没有设定人数上限，十位人物可以加入同一团队。每个 Penta 分组最多 5 人，分析要求 3～5 人；十人可分为两个五人 Penta。本次没有新增 WA 功能，也不将两个 Penta 分组等同于 WA 图。
- 导入页仅在 Vite 开发模式可用；`dev/`、`fixtures/` 不进入正式构建，不会向正式站点默认添加测试人物。
- 浏览器保存状态不随 Git 同步。在另一台电脑或另一款浏览器再次打开导入页，即可创建同一批测试人物。

这些记录完全虚构，只用于操作与功能测试，不是精度认证或真人档案。

## 开发分支同步

当前约定的共享开发分支：`dev/windows-development`。每轮完成并验证后，提交并推送开发分支，核对远端提交；不自动合并或推送到 `main`，避免触发正式部署。

另一台电脑首次获取：

```powershell
git clone -c core.autocrlf=false --branch dev/windows-development https://github.com/NothingnessVOID/TD-OHD.git
cd TD-OHD
npm.cmd ci
npm.cmd run dev
```

已有仓库：先确认没有未提交的工作，再执行：

```powershell
git fetch origin
git switch dev/windows-development
git pull --ff-only
```

若存在未提交修改或分支分叉，先处理差异，不执行强制覆盖或强推。后续工作约定见根目录 `AGENTS.md`。不要提交凭据、私人出生资料、本机数据库或浏览器存储快照。
