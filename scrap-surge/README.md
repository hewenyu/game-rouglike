# 废潮 / SCRAP SURGE

一只小蟹，六把破烂，一整片怪潮。

网页自动战斗肉鸽：只负责走位，武器自动瞄准开火。一局 20 波，波与波之间整备。
核心是“左脚踩右脚上天”的真实连锁：击杀掉废料，拾取废料喷弹，喷弹击杀引发爆炸，
爆炸又掉出更多废料。本作只借鉴《土豆兄弟》的体验，不沿用它的角色、世界观或美术。

当前状态：可试玩的反馈版（`master`，2026-10-20）。还没有得到用户对手感、美术和
平衡的认可，也从未验证过普通输入的 20 波通关。详细状态和下一步见
[memory/status.md](memory/status.md)。

## 立即试玩

```sh
npm ci
npm run dev        # http://127.0.0.1:4188 （strictPort）
```

- 默认进入 20 波远征。`/?mode=slice` 是已冻结的两波手感切片。
- `?seed=2a` 可以复现种子（**十六进制**，`2a` = 42），能和 `mode=slice` 组合使用。
- 电脑用 WASD 或方向键移动。手机拖动左下摇杆（真触屏输入）。不需要瞄准，也不需要攻击键。
- 按 P 或 Escape 暂停。切出窗口、隐藏页面、改变尺寸都会自动暂停。

### 远征规则概览

- **武器**：W1 起开放 6 个枪位，送一把免费的罐头快枪。同名同阶的两把会自动合成，
  I→II→III→IV，伤害倍率 1/2/4/8（暂定值）。共 6 种：快枪、散弹、餐叉、电池、
  火箭、拳套。
- **物品**：共 20 件，分速度、连锁、生命/接触、火力、拾取五个家族，可以自由混搭。
  稀有度（普通/罕见/稀有）和能否叠加是两个独立属性，唯一物品拥有后不再出现。
- **整备**：每波结束进入一次整备，可以选 3 把枪、3 件物品，再从属性和奖励里选一项。
  刷新时枪和物品一起刷。越到后期，商店出高稀有度的概率越高。
- **精英与首领**：精英在 W3/7/11/14/17/19 出现，击杀后掉实体宝箱，宝箱只出物品。
  首领在 W5/10/15/20 出现，W5/10/15 的首领宝箱稀有度更高。首领波有 15 秒加时，
  加时结束还没击杀就失败。
- **回血**：进入 W1–W10 回 3 点，进入 W11–W20 回 4 点，上限 10。
- **已知问题**：6 个枪位全是 II 阶以上时，商店里只有 I 阶武器，买什么都会被拒。
  修复方案（满槽自动补件）已设计，但还没实现，见
  [docs/p3b-fullslot-bundle.md](docs/p3b-fullslot-bundle.md)。

只在本地记录完成次数、胜场、最高击败数和声音设置。刷新页面不会续接进行中的对局。
游戏不联网、不收费，也不请求任何外部素材或字体。

## 构建与部署

```sh
npm run build      # tsc --noEmit && vite build -> dist/
```

`dist/` 使用相对路径，可以托管在任意 HTTP 静态服务的根目录或子目录下，不支持 `file://`。
Cloudflare Pages 的配置：Root directory 填 `scrap-surge`，Build 命令 `npm run build`，
Output 目录 `dist`，环境变量 `NODE_VERSION=22`。

## 开发与验证

| 命令 | 用途 |
| --- | --- |
| `npm test` | 单元测试（`tsx --test tests/*.test.ts`，当前 178 个） |
| `npm run build` | 类型检查和生产构建 |
| `npm run typecheck` / `npm run format:check` | 只做类型检查 / 只检查格式 |
| `npm run test:golden` | 确定性回放指纹（重构前后对比输出，必须完全一致） |
| `npm run format` | prettier 格式化 src、tests |
| `npm run test:browser:first-shop` | 首商店可达性（键盘和触屏各 3 个 seed） |
| `npm run test:browser:lifecycle` | 自动接波时的输入生命周期 |
| `npm run test:browser:p2-items` | W1 领取核心、W2 实际触发、购买物品 |
| `npm run test:browser:p2-visuals` | W3 精英、实体宝箱、领取 |
| `npm run test:browser:p2-lifecycle` | 暂停、缩放、刷新、W3 真实失败、重试 |
| `npm run test:browser:regression` | 24 项普通输入回归（会写入仓库的 `artifacts/`） |
| `npm run test:browser:expedition` | 普通输入跑完整 20 波（约 10 分钟） |
| `npm run test:p3:measure` / `test:p3:report` | P3 自然模拟测量和报告（源码冻结守卫） |
| `SOURCE_SHA=<sha> npm run test:astra:perf` | 固定步模拟的 CPU 诊断 |
| `SOURCE_SHA=<sha> npm run test:astra:ranged` | 普通远程跑法的完整诊断 |

浏览器测试要先启动 dev server，并用本机的 Google Chrome（可以用 `CHROME_PATH`
指定其他路径）。各脚本的默认端口不一致，**请始终显式传入 `BASE_URL`**，例如：
`BASE_URL=http://127.0.0.1:4188 npm run test:browser:p2-items`。测试只用普通键盘和
真实 CDP 触屏输入，只读 `window.scrapMetrics`，不注入任何状态，也不开无敌。

代码结构：
- `src/sim.ts`：规则和状态（`Game` 类；`step()` 按 tick 顺序调用各子步骤）
- `src/sim-types.ts`：模拟数据形状（Enemy、Bullet、Event 等），sim.ts 原样再导出
- `src/economy.ts`：远征购枪与合成规划（纯函数 `planGunPurchase`）
- `src/render.ts`：Canvas 表现层（只读）
- `src/input.ts`：输入
- `src/audio.ts`：Web Audio 程序化音效
- `src/main.ts`：生命周期、HUD 和整备界面
- `src/ui-cards.ts`：卡面 SVG、标签和武器数值摘要（纯标记，不碰 Game/DOM）
- `src/math.ts`：向量、种子随机数（`rng`、`SeededStream`）
- `src/data.ts`：武器、切片改装、场地与玩家常量（`ARENA_W/H`、`PLAYER_START` 等）
- `src/expedition.ts`：波次表、价格、首领、合成倍率
- `src/items.ts`：物品目录、稀有度、触发预览

模拟固定 60 Hz，与渲染分辨率无关。所有图形和音效都在本项目内生成。

## 文档

- [memory/status.md](memory/status.md)：当前状态、下一步、未通过的门槛
- [memory/goal.md](memory/goal.md)：用户的产品目标和设计约定
- [docs/lessons.md](docs/lessons.md)：首轮开发的复盘、坑点和不变量
- [docs/design.md](docs/design.md)：切片规则和美术方向
- [docs/p2-items-contract.md](docs/p2-items-contract.md)：物品数值合同
- [docs/p3b-fullslot-bundle.md](docs/p3b-fullslot-bundle.md)：下一项待实现的设计
- [docs/testing.md](docs/testing.md)：测试方法和各阶段证据
- [docs/reviews.md](docs/reviews.md)、[docs/status-history.md](docs/status-history.md)：历史记录
- [docs/archive/](docs/archive/README.md)：已被取代的一次性文档
