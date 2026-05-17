# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-05-17

### Added

**Core Gameplay**
- 6 种武器系统：小刀(10dmg)、菜刀(15dmg)、大剑(25dmg+震屏)、鞭子(12dmg+弹飞)、毒水(5/秒可叠加)、炸弹(40dmg+爆炸)
- 点击装备 + 按住鼠标划过连续攻击（0.15秒冷却）
- 右键/ESC 取消装备

**Multi-Stickman System**
- 同屏最多 8 个火柴人，初始生成 6 个
- 4 种类型：普通(100HP)、僵尸(80HP/慢速/不吃不休)、装甲(200HP/伤害减半/头盔)、军人(150HP/高速/70%闪避/贝雷帽)
- 每个火柴人独立 AI：随机行走、受伤闪避、低血寻食、空闲休息
- 死亡后 2 秒自动重生随机类型
- 头顶独立血条（满血时隐藏）

**Item System**
- 武器/物品标签切换 UI
- 4 种食物：面包(+20HP)、苹果(+10HP)、水(+15HP)、果汁(+25HP) — 火柴人吃掉后消失
- 4 种家具：椅子(+30%速8秒)、沙发(+50%速10秒)、床(+80%速12秒)、桌子(障碍物)
- 火柴人 AI 自动寻找食物补血、走到家具休息获得加速 buff
- 桌子作为障碍物，火柴人绕行

**Visual & Effects**
- Canvas + DOM 混合渲染架构
- 卡通明亮风伪透视地面（地平线 + 纵深渐变 + 花朵 + 蝴蝶）
- 动态天空（旋转太阳光线 + 飘动云层 + 摇摆草叶）
- 粒子特效：打击火花、血滴、爆炸、毒雾气泡、治愈绿光
- 伤害/治愈飘字（Bangers 字体 + 弹出缩放动画）
- 金色灵魂升天动画（光环 + 翅膀扇动 + 外层光晕）
- 屏幕震动（大剑/炸弹）
- 毒药叠加显示（毒x层数）

**UI**
- "KILL MATCHMAN" 漫画风标题徽章
- 击杀计数器（骷髅 + 金色数字）
- 木质纹理武器栏 + 弹入动画
- 武器显示伤害数值、物品显示效果标签
- 手绘写字台桌子图标（工具栏与场地一致）
- 垃圾桶重置按钮
- 响应式布局（桌面 + 移动端触控）

**Infrastructure**
- Vercel 静态站点部署: https://kill-matchman.vercel.app
- GitHub 代码托管: https://github.com/lizhao86/Kill-Matchman
- 项目文档：README.md / CLAUDE.md / HANDOVER.md
