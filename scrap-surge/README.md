# 废潮 / SCRAP SURGE

一只小蟹，六把破烂，一整片怪潮。

**当前是 `expedition20` 的 20 波运行候选（源码身份 `db74a8c`），可进入用户
试玩。三方已完成仅限 PLAYTEST 的审查，但这不是最终目标完成或用户验收，也不是
已完成的 10–20 分钟肉鸽。**
普通入口默认进入 20 波远征；`?mode=slice` 保留已批准的两波手感切片。当前证据
包括 89/89 规则测试、干净构建、24/24 浏览器回归、
作者 7/7 接波输入回归、独立 DeepSeek 7/7（
`/tmp/astra-f7d-review.B5iCbP/f7/scrap-surge/artifacts/input-lifecycle-results.json`，
SHA-256 `241fea027757a430d2088b5f5776c1a1f9904738524c4853b82f434836f1a6f3`）、
相对已批准扩展前切片 `058951fc84994abb8ee24a2c587bb9232c1c1ccd` 的三个 seed
逐步骤等价检查（0 差异），以及只读的 19/19 接波回血追踪。普通远程跑法在第20波
约57.58秒、首领仍在登场时生命降至0；未观察到最终首领战，更未通关。这不是
胜利，也不是完整验收。以上是有限验证，不能替代用户试玩。

另有一次固定 seed 42、单局、无脚本闪避的配对诊断：40,860 步状态、事件与 RNG
全部一致，45 次实际掉血（接触 3、敌弹 42），在 W20 的 39.917 秒死亡，早于
该波约 57 秒的首领登场。该样本不能推断人类难度、子弹来源身份或首领平衡。
诊断方法与完整证据边界见 docs/testing.md；三方审查记录是仅限 PLAYTEST 的非最终
签核，见 docs/reviews.md。

用户实际试玩并否定了原先的折线游戏，因此另建本项目。仅借鉴《土豆兄弟》的
移动自动战斗、短波次和商店
构筑体验，不沿用其角色、世界观或美术。被否定的旧原型已按用户授权删除。

两波切片已通过三方 slice gate（冻结候选 `8cb0e8f`，逐方证据见
docs/reviews.md）。完整 10–20 分钟目标尚未完成；expedition20 的实现方案已获
三方批准。晚波恢复由 W1–W10 回 3 格、W11–W20 回 4 格统一处理，恢复不超过
10，切片仍回 3 格；恢复不会复活已失败或已胜利的战局。

用户试玩后的最新目标（最高优先级）：**至少 20 关**，build 要在 20 关里渐进成形，
把过快/过慢的成形节奏控制住（原因待测）。旧 12 波方案作废；短 4 波只是内部实验，
不是交付目标。
这条反馈只说明"关数/成形节奏不满意"，**不等于**对现有画面或手感的美术认可。

## 立即试玩

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:4188 。默认是 20 波远征；两波切片入口为
http://127.0.0.1:4188/?mode=slice 。远征包含 9 次枪店、6 次快速选择、
5/10/15/20 波首领和一次永久分支选择。

切片入口仍是第一波 20 秒，商店买武器并免费选 **两种** 改装，第二波 35 秒，
击败罐头大王后结束。商店时间不计入战斗时间。

- 电脑：WASD / 方向键移动。无需鼠标瞄准、无需按攻击键。
- 手机：拖动左下摇杆。是真正的触屏输入，不是仅做响应式排版。
- 靠近金色废料自动吸附；波次结束自动收回剩余掉落。
- P / Escape 暂停；切出窗口、隐藏页面或改变尺寸会自动暂停。
- 远征枪位从 2 个逐步开放到 6 个；Tier-II 强化有独立容量。
- 切片商店武器会同时工作，最多 6 个槽位；同种武器可以买多把。
- 推荐先选“废料爆米花 + 易爆垃圾”：拾取 → 喷弹 → 击杀 → 连爆 → 更多掉落。
- 界面上沿是细波次条，血量/槽位/废料在下方条带里；战斗区始终不被 HUD 遮挡。
- 首领波可在 15 秒加时内继续战斗，倒计时结束后仍未击杀则失败。
- 拳套打死的怪会留下 0.6 秒的残骸继续撞人；只有真实的次生连锁才会显示 ×N。
- `?seed=2a` 可复现种子；可与 `mode=slice` 组合。同种子重试重置本局。

仅记录完成次数、胜利次数、最高击败数和声音设置。刷新不续接正在进行的战局。
存储不可用仍能玩。不联网、不收费、不包含外部素材或外部字体请求。

## 开发与验证

```sh
npm test
npm run build
npm run test:browser    # 先启动 dev server；默认本机 macOS Google Chrome
npm run test:browser:regression   # 独立正常输入回归，同样先启动 dev server
npm run test:browser:lifecycle    # W7 自动接波的键盘/触屏输入生命周期回归
npm run test:browser:first-shop   # 首商店可达性烟测（键盘/触屏各 3 seed）
npm run test:browser:expedition    # expedition 普通输入全程；每次独立 attempt 留证
SOURCE_SHA=<sha> npm run test:astra:perf    # 固定步模拟 CPU 诊断，输出 JSON
SOURCE_SHA=<sha> npm run test:astra:ranged  # Astra 固定普通输入远程战术，可能约 10 分钟
npm run test:astra:heal-trace -- <trace-dir> # 只读核对逐波回血
npm run format
```

浏览器测试可用 `CHROME_PATH` 指定 Chromium 可执行文件、`TEST_URL` 指定站点。
回归脚本另支持 `BASE_URL` 与 `DIST_DIR`（默认使用仓库内 `dist/`）。
它使用普通键鼠、实际触屏事件和只读观察数据；没有修改战斗状态或开启无敌。
自动接波回归单独运行键盘与触屏两局：在 W7 过渡中新按方向并保持到 W8，
同时验证商店、快速选择和暂停期间不会收集移动输入。它不计入 24 项回归分母。
失败路径由普通键盘朝最近敌人冲的独立 fixture 覆盖（固定 seed 2a/17/91，各一局）；
`window.scrapMetrics.enemyPositions` 每次返回全新的 `{x,y}` 副本，不泄漏敌人引用。
`tests/browser-expedition-review.mjs` 是独立的 20 波普通输入审查脚本，必须显式提供
`REVIEW_SHA` 和新的 `OUTPUT_DIR`（例如 `BASE_URL=http://127.0.0.1:4190`）；它未纳入
`npm test`，一个尚未执行的副本不算胜利证据。
`test:astra:ranged` 可用 `BASE_URL`、`CHROME_PATH`、`OUTPUT_DIR` 配置；未指定时
在系统临时目录下创建唯一目录。失败会保留 JSON、trace、截图和终止状态，并以
断言失败退出，不会为追求绿色结果而重跑。`test:astra:perf` 可用
`OUTPUT_FILE` 指定唯一结果文件，只测固定步模拟 CPU，不是 FPS、手机、渲染、
音频或 GPU 证据。
`dist/` 使用相对路径，可由任意 HTTP 静态服务托管在根目录或子目录。不支持 file://。
没有公开部署。文档与审查见 docs/testing.md、docs/reviews.md。

工程分离：src/sim.ts 规则、src/render.ts 表现、src/input.ts 输入、src/audio.ts 声音、
src/main.ts 生命周期和界面、src/data.ts 内容。60 Hz 固定模拟与渲染分辨率分开。
程序化矢量角色、武器、敌人和 Web Audio 音效均为本项目生成，无素材授权依赖。

## 当前边界

6 种武器、3 种可叠加改装、3 种普通小怪加 splitter/chip/spitter、4 个首领阶段；
两波切片完整保留，20 波远征待完整验证。
还没有角色池、局外养成或已验收的成熟十分钟难度曲线。
物理手机、Safari、音效主观混音与真实玩家的爽感尚未验收。模型批准不能替代用户试玩。
