<div align="center">

# Codex Bot

一个会看 Codex 任务、递提醒、陪伴工作的轻量桌面机器人。

[![Windows x64](https://img.shields.io/badge/Windows-10%20%2F%2011-249AD9)](https://github.com/WuXinbo-bo/Codex-Bot/releases/latest)
[![License](https://img.shields.io/badge/License-Apache%202.0-399767)](LICENSE)
[![Checks](https://github.com/WuXinbo-bo/Codex-Bot/actions/workflows/ci.yml/badge.svg)](https://github.com/WuXinbo-bo/Codex-Bot/actions/workflows/ci.yml)

[下载](https://github.com/WuXinbo-bo/Codex-Bot/releases/latest) · [任务提醒](#陪你完成一次任务) · [角色图鉴](#它不止一种表情) · [全部活动](docs/gallery/README.md) · [安装](#安装与首次使用)

</div>

![Codex Bot 与完成任务提醒，真实界面、演示任务数据](docs/assets/readme/hero.webp)

你专心做事，它在桌面一角看着任务进展。开始时递来提醒，完成后把结果留给你；没确认的完成条，不会因为展开面板、拖动机器人或查看任务而消失。

基于 **Tauri 2 + 系统 WebView2**，正式安装包不捆绑 Electron 或 Node.js。

## 陪你完成一次任务

### 接到任务，进入状态

感知 Codex 的进行中、排队和等待处理状态。提醒先到，机器人随后接单、看资料、准备工作，不让动画拖慢通知。

![任务开始：实际状态事件驱动机器人与通知面板](docs/assets/readme/start.gif)

### 做完之后，等你回应

完成条默认保留，仍可查看任务；确认后再收起或交接下一项。需要处理与失败会明确提醒，未知或断线状态不会被当作成功。

![任务完成：递交、保留完成条、用户确认后收起](docs/assets/readme/complete.gif)

以上为真实生产界面录制，使用演示任务数据；动图会循环播放，循环重播不代表通知自动消失。

## 它不止一种表情

**257 个表情与姿态 · 435 套活动 · 45 件道具 · 24 张整脸面具**

下面是 23 张分类图中的 207 个精选画面。图片来自当前渲染器，可点击查看原图；完整活动在[分页图鉴](docs/gallery/README.md)中浏览，不在这里一次加载。

### 情绪全景

从平静、专注、好奇到犹豫、害羞和困倦，24 个情绪家族各有多种基础表达。眼神、身体重心和小动作一起变化，不只是换一个图标。

![平静、信任、专注、思考、好奇、怀疑、期待、开心、满足、自信、得意、惊讶](docs/assets/readme/emotions-1.webp)

![警觉、担心、犹豫、害羞、尴尬、失落、挫败、不满、无聊、困倦、关怀、顽皮](docs/assets/readme/emotions-2.webp)

### 没有说出口的小心思

开心又想收住，被夸却有点害羞，想靠近又怕打扰。12 套复合神态，让同一件事情不只有一种回应。

![12 种复合小心思](docs/assets/readme/thoughts.webp)

### 工作中的它

70 套任务表演覆盖开始、执行中、完成、待处理、失败与停止。不同状态使用不同活动池，不把工作中的随机活动演成任务成功。

![开始与执行中的任务表演](docs/assets/readme/work-1.webp)

![完成交付与等待处理](docs/assets/readme/work-2.webp)

![遇到问题与暂停整理](docs/assets/readme/work-3.webp)

[浏览全部任务表演](docs/gallery/task-01.md)

### 会使用的道具

翻开文件夹、重新量一遍、顺着线索检查，或者把悠悠球收回来。道具有准备、使用和收尾，不会一直挂在脸上。

![文具、资料和检查工具的实际活动](docs/assets/readme/props-1.webp)

![风车、悠悠球、毯子、盆栽等日常活动](docs/assets/readme/props-2.webp)

### 戴上一张完整面具

偶尔从身后拿出面具，举起、戴上，再摘下来。24 张面具搭配 6 种佩戴动作；面具是完整表情道具，基础机器人仍没有嘴巴。

![整脸面具图鉴，上半部](docs/assets/readme/masks-1.webp)

![整脸面具图鉴，下半部](docs/assets/readme/masks-2.webp)

### 一段有起伏的小故事

48 套约 15 秒的连续编排，包含 44 套自主剧场和 4 套情境接续。它会尝试、迟疑、改主意，也会把刚才没做完的小事接着做完。

![连续剧情：展示画作，得意之后又害羞地藏起来](docs/assets/readme/story.gif)

![端稳托盘之前与之后的六个片段](docs/assets/readme/story-1.webp)

![展示画作后害羞藏起的六个片段](docs/assets/readme/story-2.webp)

[浏览全部连续剧场与接续](docs/gallery/story-01.md)

## 它会回应你

靠近时看向你，点击时换一种回应，长按时等待松手，拖动时跟随惯性。鼠标只是经过，不会打断正在表演的连续活动。

![靠近、点击、长按、松手的精选回应](docs/assets/readme/mouse.webp)

面板也参与表演：抽出、托住、换卡、移动后扶稳、确认后接回。任务面板与完成条各自保留，动画不替你确认任务。

![面板进入、切换、确认和移动的互动姿态](docs/assets/readme/panels.webp)

## 选一种陪伴方式

画风、眼睛和身体形态可以自动变化，也可以固定喜欢的组合。皮肤默认柠檬黄，支持固定颜色或随机换色；设置先预览，再应用。

### 颜色与画风

![八套皮肤预设，柠檬黄为默认](docs/assets/readme/skins.webp)

![经典、无声默剧、黏土软团、橡皮管四种画风](docs/assets/readme/styles.webp)

### 圆润的身体

18 种形状保留柔和轮廓，连方形、三角形和星星也带着圆角。

![圆团、软方块、圆角多边形、星星、水滴等形状](docs/assets/readme/shapes-1.webp)

![扁饼、豆形、铃铛、风筝、软垫和弹力团](docs/assets/readme/shapes-2.webp)

### 不同的眼睛，同样有情绪

15 套眼部方案，包括 8 套常驻眼型与 7 套情境眼神。画风可以变，眨眼、视线和情绪表达仍然连贯。

![八种常驻眼型](docs/assets/readme/eyes-1.webp)

![七种情境眼神](docs/assets/readme/eyes-2.webp)

![八种保留的特殊眼睛](docs/assets/readme/symbols.webp)

### 细节也会表达心情

不只有腮红：眼底水光、迟疑线、细汗、暖色、疲态和灵光，都能成为一点情绪变化。

![情绪装饰：红晕、水光、高光、汗滴、迟疑与压力](docs/assets/readme/accents-1.webp)

![情绪装饰：冷色、疲态、暖色、灵光、问号与停顿](docs/assets/readme/accents-2.webp)

安静、自然、活泼三种陪伴模式统一控制节奏，也可开启减少动态。随机调度兼顾场景、近期重复和道具曝光，让它有变化，也留得住安静。

### 完整规模

| 内容 | 当前数量 |
| --- | ---: |
| 表情与姿态 | 257，含 108 套基础表达 |
| 活动编排 | 435 |
| 其中：任务表演 | 70 |
| 其中：约 15 秒连续剧场与接续 | 48 |
| 道具与配件 / 整脸面具 | 45 / 24 |
| 眼部方案 / 特殊眼睛 / 情绪装饰 | 15 / 8 / 18 |
| 皮肤 / 画风 / 身体形状 | 8 / 4 / 18 |

数量来自源码注册表。任务表演和连续剧场包含在 435 套活动中；关键帧、演出变体和配色组合不额外计数。图鉴对应当前源码，已发布安装包以 Releases 说明为准。

**[进入完整活动图鉴：435 套，按类别分页浏览](docs/gallery/README.md)**

## 安装与首次使用

1. 安装并登录 Codex 桌面端，确认可以运行任务。
2. 在 [Releases](https://github.com/WuXinbo-bo/Codex-Bot/releases/latest) 下载 Windows x64 安装包。
3. 打开 Codex Bot，完成连接检测；必要时在设置中选择 Codex 程序与数据目录。
4. 运行一个任务，体验开始提醒、完成提醒、查看与确认。

需要 Windows 10/11 x64 和 WebView2。缺少 WebView2 时，安装器会请求联网下载。Windows 可能显示应用信誉提示，请确认下载来源。

已有 Meta Bot 用户的设置与未确认提醒保留在原有 `.metabot` 数据目录中。

## 开发与预览

需要 Node.js 22、Rust stable、Windows C++ Build Tools 和 WebView2。

```powershell
npm ci
npm test
npm run dev:native
```

本地交互图鉴使用同一套渲染器，按页加载，不会代替桌面程序连接 Codex。

```powershell
npx --yes http-server . -p 4187 -c-1 -a 127.0.0.1
# 浏览器打开 http://127.0.0.1:4187/test/fixtures/m1-visual.html
```

[活动体系](docs/activity-system.md) · [图鉴制作与检查](docs/readme-media.md) · [提交问题](https://github.com/WuXinbo-bo/Codex-Bot/issues)

## 许可

本项目自有代码与素材采用 [Apache License 2.0](LICENSE)。第三方依赖保留原许可，见 [NOTICE](NOTICE) 与 [第三方说明](THIRD_PARTY_NOTICES.md)。
