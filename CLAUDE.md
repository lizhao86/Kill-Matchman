# CLAUDE.md

本文件为 Claude Code 在本项目下的协作约定。

## 项目概述

Kill Matchman — 解压类网页游戏。玩家用武器攻击多个不同类型的火柴人，火柴人会利用场地物品自救。目标用户：休闲玩家。当前阶段：已上线 MVP。

## 目录约定

- `sourcecode/` — 游戏源代码（纯 HTML/CSS/JS，无构建工具，无依赖）
  - `index.html` — 入口页面
  - `css/style.css` — 样式（武器栏、标签切换、响应式）
  - `js/main.js` — 游戏主循环、背景渲染、多火柴人管理
  - `js/stickman.js` — 火柴人类：状态机、AI 行为、绘制（含 4 种类型外观）
  - `js/stickman-types.js` — 4 种火柴人类型定义（普通/僵尸/装甲/军人）
  - `js/weapons.js` — 武器管理器：装备、攻击、物品放置、标签切换
  - `js/items.js` — 物品系统：食物/家具定义、放置、Canvas 绘制
  - `js/particles.js` — 粒子系统：打击火花、血滴、爆炸、毒雾、治愈、伤害数字
- `01 Game Plan/` — 原始需求文档（手绘草图）

## 技术约定

- **纯静态项目** — 无构建工具、无 npm、无框架。所有 JS 用 ES Modules (`type="module"`)
- **Canvas + DOM 混合** — 火柴人和特效用 Canvas 绘制，UI 用 HTML DOM
- **本地开发** — `cd sourcecode && python3 -m http.server 8080`（ES Modules 需要 HTTP 服务器）
- **部署** — Vercel 静态站点，从 `sourcecode/` 目录部署：`cd sourcecode && vercel --prod`
- **字体** — Google Fonts: Bangers (标题/数字) + Quicksand (标签)
- **响应式** — 支持桌面鼠标和移动端触控

## 游戏架构关键点

- `stickmen[]` 数组管理多个火柴人实例，每个独立状态机
- 火柴人活动范围限制在屏幕下半部分（50% 以下），背景是伪透视地面
- 武器系统：点击装备 → 按住鼠标划过攻击（0.15 秒冷却），右键/ESC 取消
- 物品系统：切换到物品标签 → 点击地面放置，食物被消耗，家具永久
- 毒药可叠加：每层 +3 伤害/秒，持续时间累加
- 灵魂升天动画使用金色发光效果（与蓝天背景区分）

## 部署信息

- **Vercel 项目**: kill-matchman
- **线上地址**: https://kill-matchman.vercel.app
- **GitHub**: https://github.com/lizhao86/Kill-Matchman

## 当前阶段

已上线 MVP — 核心玩法完整（武器攻击 + 物品系统 + 多火柴人类型）
