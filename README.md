# 超级玛丽 3D · v0.1

使用 Three.js 和 Vite 制作的单关卡 3D 横版过关小游戏。所有角色与场景均由基础几何体组成，不依赖外部模型、贴图或物理引擎。

## 本地运行

```bash
npm install
npm run dev
```

打开终端给出的本地地址即可开始游戏。生产构建：

```bash
npm run build
npm run preview
```

## 操作

- `A` / `D` 或左右方向键：移动
- `Space` / `W` / 上方向键：跳跃；按住可跳得更高
- `R`：随时重新开始

## 目标

收集金币、踩掉或避开板栗仔，抵达关卡最右侧的旗杆。侧面碰到敌人或掉出地图会损失一条生命，生命归零则游戏结束。

## 技术栈

- Three.js `0.186.1`
- Vite `8.3.1`
- 原生 JavaScript ES Modules

