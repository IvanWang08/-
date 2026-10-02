# 玄竹峡 · Three.js 国风动作精品小样 v0.4

在原有横版物理、固定轻俯侧视镜头与检查点体系上做的 96 米精品关卡。当前版本不再追求 800 米填充，而是集中完成峡谷吊桥、水雾、旧木、湿岩、原创东方侠客、冰蓝剑气和四组可预判机关。

## 运行

需要 Node.js 20.19 或更高版本。

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

## 操作

- `A` / `D` 或左右方向键：行走
- `Space` / `W` / 上方向键：跳跃；空中再按一次二段跳
- `J`：三段剑式；第三段发射半月剑气
- `L`：剑气纵横；扇面剑气与持续 2 秒的减速剑域
- `Shift` / `K`：短距离无敌闪避
- `Esc`：暂停或继续
- `F`：显示 FPS、draw call、三角形和 JS 内存
- `R`：重新开始

## 96 米节奏关卡

场景选择“重岩峡谷吊桥段”。`docs/ref/` 未提供参考图片，因此只从需求文字提取层叠山岩、旧绳吊桥、深绿水面和冷暖晨雾，不复制任何商业游戏资产。

四组机关遵循“示范/观察 → 加压 → 高潮 → 奖励”：

1. 13–22 米：三摆锤固定相位，先观察两拍再通过。
2. 31–40 米：三组伸缩刺以 0.75 秒预警窗口错峰升起。
3. 57–69 米：火焰与两次落石；落石前显示地裂提示。
4. 76–88 米：追逐滚石与双刺组成收尾高潮，之后进入开阔奖励台。

组间保留约 5–8 秒行走观察区。机关、周期、相位、预警和难度均来自 `src/world/levelData.js`，不是散落在渲染代码里的硬编码。

## 删除的旧内容

- 800 米、六区域与 32 个填充区块
- 弹簧、水管、纯上浮平台和无交互云阶
- 雪球式障碍、无状态板栗仔、飞刃/锯轮堆叠
- 只加血量的旧精英怪和“走过去就结束”的装饰段
- 金箍棒主动战斗；保留为背部传承物，主战斗已切换为原创青锋剑体系

## 渲染与材质

- ACES Filmic 色调映射，暖金主光、冷青环境光、指数雾、软边丁达尔光
- 克制的暗角、颗粒与色差；没有卡通描边，也没有额外 bloom
- 岩石、苔痕、旧木、竹子、绳索、金属均为程序化 BaseColor / Normal / ORM PBR
- 岩壁碰撞仍是稳定的 AABB，但正面覆盖两个 `InstancedMesh` 碎岩层，破除大平面方块感
- 水面使用深绿 PhysicalMaterial、法线流动、clearcoat 与高不透明度
- 贴地苔斑采用 0.009 米错层和 polygon offset；脚底与路面不共面
- 所有近路装饰先沿 `roadSpline` 取样，再调用 `groundHeightAt` 取得唯一碰撞地面高度

性能验收提供两个显式模式：`?quality=4k` 以真实 3840 × 2160 渲染完整后期，`?quality=4k&performance=1` 保留 ACES/阴影但跳过全屏颗粒、暗角与色差。实例化后 4K 统计由约 519 draw / 41.5 万三角形降至约 200 draw / 24.2 万三角形。Codex 内置浏览器在 1080p 与 4K 都被限制在约 20–23 FPS，因此本环境无法诚实确认“办公本 4K/60”；60 FPS 仍是目标值，需在目标显卡的 Chrome 中复测。

武器贴图与参数见 [`docs/materials/weapon-pbr.md`](docs/materials/weapon-pbr.md)。

## 代码结构

```text
src/
├── config/
│   └── combat.json              # 剑招、剑域与各类蘑菇数值
├── game/
│   ├── controls.js              # 可替换键位与输入边沿
│   └── simulation.js            # 固定 1/120s 步长、流程编排、事件发布
├── combat/
│   ├── damageBus.js             # 统一伤害事件总线
│   └── projectileSystem.js      # 剑气投射物、溅射、AoE 剑域
├── ai/
│   └── mushroomBrain.js         # 巡逻/发现/追击/攻击/受击/死亡 FSM
├── physics/                     # AABB、分轴解算、CCD、平台承载
├── player/
│   └── playerView.js            # 侠客、青锋剑、混合动画、衣摆/剑穗摆动
├── scene/
│   ├── createScene.js           # 固定镜头、灯光、ACES 和后期
│   └── effects.js               # 对象池粒子、剑气与剑域表现
└── world/
    ├── levelData.js             # 96 米关卡、道路样条、机关节拍组
    ├── layers.js                # 地面采样和 Z 层规范
    ├── pbrMaterials.js          # 场景程序化 PBR 贴图
    ├── premiumWorldView.js      # Road/Props 根节点和峡谷渲染
    └── trapView.js              # 数据驱动机关表现
```

新增敌人时只需增加配置与 `MushroomBrain` 子策略；新增剑气类型只需增加配置与 projectile factory，不修改伤害结算。视觉层只订阅模拟事件，不直接持有控制器或 AI 引用。

## 验收证据

同机位 4K 图位于 `docs/comparisons/`：

| 机位 | Before | After |
| --- | --- | --- |
| 峡谷入口 | [before-1.png](docs/comparisons/before-1.png) | [after-1.png](docs/comparisons/after-1.png) |
| 吊桥中段 | [before-2.png](docs/comparisons/before-2.png) | [after-2.png](docs/comparisons/after-2.png) |
| 收尾高台 | [before-3.png](docs/comparisons/before-3.png) | [after-3.png](docs/comparisons/after-3.png) |

`npm test` 当前为 31/31：覆盖 CCD、高速落地、墙角/台阶、移动平台、防挤压、检查点、三段剑式、隔墙遮挡、剑气/剑域、冲刺、二段跳、蘑菇状态机、四组节奏机关、追逐滚石，以及三次从起点到终点的完整行程。

## 画质边界

当前角色与场景均为 Three.js 程序化几何和一个轻量原创骨骼 GLB，已消除默认白盒、圆柱四肢和瞬切动作，但仍不是 DCC 软件制作的影视级扫描资产。发丝采用分组卡片、衣摆/袖口/剑穗为简化摆动，不是布料/毛发求解器。若继续迭代，优先在 Blender 制作高低模烘焙、4K UDIM、面部 rig、动作捕捉和真正的屏幕空间体积雾。

Three.js `0.186.1` · Vite `8.3.1` · 原生 JavaScript ES Modules
