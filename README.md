<div align="center">

# Codex Bot

### 让等待任务完成的时间，多一点陪伴。

一个会看 Codex 任务、递提醒、陪你工作的轻量桌面机器人。

[![Windows x64](https://img.shields.io/badge/Windows-10%20%2F%2011-249AD9)](https://github.com/WuXinbo-bo/Codex-Bot/releases/latest)
[![License](https://img.shields.io/badge/License-Apache%202.0-399767)](LICENSE)
[![最新版本](https://img.shields.io/github/v/release/WuXinbo-bo/Codex-Bot?label=version)](https://github.com/WuXinbo-bo/Codex-Bot/releases/latest)

**[下载安装](https://github.com/WuXinbo-bo/Codex-Bot/releases/latest)** · [看看它的小活动](#有动作也有小心思) · [完整图鉴](docs/gallery/README.md) · [反馈与建议](https://github.com/WuXinbo-bo/Codex-Bot/issues)

</div>

![Codex Bot 桌面机器人与任务提醒，使用演示任务数据](docs/assets/readme/hero.webp)

Codex 在忙，你可以继续做自己的事。桌面一角的小机器人会留意任务进展，在需要你处理或任务完成时递来提醒，也会回应你的靠近、抚摸和轻点。

## 看着任务，也陪着你

- **任务有回音**：开始、继续、等待处理、失败和完成，用任务卡呈现状态变化，支持复制链接、查看任务。
- **完成后等你确认**：完成提醒默认保留，点击确认或成功打开任务后清除；展开面板、拖动机器人不会误清除。
- **鼠标就是互动方式**：摸摸头、轻点脸颊、绕个圈，或碰一下它伸出的手。任务提醒优先，互动适时让路。
- **每次见面有点不同**：眼神、神态、道具和动作按情境变化；外观可以随机，也可以固定成你喜欢的样子。
- **陪伴的分寸由你定**：右键打开常用菜单，打个招呼、安静一会儿，或收到托盘。安静时段仍保留任务提醒。

基于 **Tauri 2 + 系统 WebView2**，安装包无需捆绑 Electron 或 Node.js。

## 有动作，也有小心思

摆弄小风车，被弹簧玩具吓一跳，捧着暖手袋眯起眼睛，再把自己的画举给你看。它有自己的小活动，也有想让你注意到的小心思。

![摆弄风车、牵气球、捧暖手袋、照看盆栽和展示画作等日常活动](docs/assets/readme/props-2.webp)

认真起来也很有戏：抱着笔记逐行核对，拿起放大镜找线索，拼图转了个方向，又停下来想一想。道具会被拿起、使用、收好，每个活动都有过程。

![写笔记、整理文件、拿手电检查、转动拼图和端稳托盘等道具活动](docs/assets/readme/props-1.webp)

默认柠檬黄；喜欢别的样子，也可以固定配色、眼睛与身体形态，或让它随机变化。

[浏览完整静态图鉴 →](docs/gallery/README.md)

图鉴展示开发版的代表性画面，安装包功能以对应 Release 说明为准。

## 安装与首次使用

1. 安装并登录 **Codex 桌面端**，确认可以运行任务。
2. 前往 **[Releases](https://github.com/WuXinbo-bo/Codex-Bot/releases/latest)** 下载 Windows x64 安装包。
3. 打开 Codex Bot，按引导完成连接检测，然后运行一次任务。

需要 Windows 10/11 x64 与 WebView2；缺少 WebView2 时，安装器会引导联网安装。若未自动找到 Codex，可在设置中选择程序与数据目录。

## 开发与贡献

欢迎带着真实使用场景提建议：一次没出现的提醒、一个更自然的动作，或一种更舒服的交互，都值得一起完善。

开发需要 Node.js 22、Rust stable、Windows C++ Build Tools 和 WebView2。

```powershell
npm ci
npm test
npm run dev:native
```

[提交问题或创意](https://github.com/WuXinbo-bo/Codex-Bot/issues) · [活动体系](docs/activity-system.md) · [鼠标互动](docs/mouse-interactions.md)

如果你也想让桌面多一个会看任务的小伙伴，欢迎点一颗 **Star**，让更多人遇见它。

## 许可

本项目自有代码与素材采用 [Apache License 2.0](LICENSE)。第三方依赖保留原许可，见 [NOTICE](NOTICE) 与 [第三方说明](THIRD_PARTY_NOTICES.md)。
