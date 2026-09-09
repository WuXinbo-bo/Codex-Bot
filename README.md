<div align="center">

# Codex Bot

一个会看任务、递提醒、陪你工作的轻量桌面机器人。

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)
[![Windows x64](https://img.shields.io/badge/Windows-x64-blue)](https://github.com/WuXinbo-bo/Codex-Bot/releases/latest)
[![Checks](https://github.com/WuXinbo-bo/Codex-Bot/actions/workflows/ci.yml/badge.svg)](https://github.com/WuXinbo-bo/Codex-Bot/actions/workflows/ci.yml)

[下载安装](https://github.com/WuXinbo-bo/Codex-Bot/releases/latest) · [功能](#功能) · [开发与预览](#开发与预览) · [更新机制](#更新机制) · [许可](#许可)

</div>

![Codex Bot 动作预览](docs/assets/theaters.png)

> 非 OpenAI 官方产品。需要已安装并登录的 Windows Codex 桌面端。
> 首次公开版本建议先小范围试用；不同 Codex 版本及全新 Windows 环境仍需持续验证。

## 功能

- **任务感知**：读取本机 Codex 状态与增量日志，显示进行中、排队、等待处理的任务；断线时明确标记缓存或待核实，不把未知状态当作成功。
- **轻量提醒**：开始任务、完成任务与需要处理使用独立通知。完成条默认保留，查看任务不会清除，确认后才清除。
- **可交互桌面伙伴**：注视、点击、长按、拖拽、碰边、任务板交互；白色紧凑面板随机器人移动。
- **丰富但不抢戏**：134 个表情与姿态、164 套活动（含 20 套约 15 秒连续动作）、18 种形状、24 件道具、24 种整脸面具。
- **按场景调度**：工作与空闲使用不同动作池，冷却与近期去重避免重复；任务通知和鼠标操作优先于长表演。
- **自定义**：8 套皮肤，默认柠檬黄；面具、随机动作、动画强度和完成提醒均可设置。
- **签名更新**：检查新版、更新说明、下载进度、可选自动下载；确认后安装，不静默强制重启。
- **原生轻量**：Tauri 2 + 系统 WebView2，不把 Electron 或 Node.js 打进正式安装包。

数量来自当前源码注册表。连续动作是已有姿态与道具的完整编排，不等于新增同等数量的独立面部素材。

## 安装与首次使用

1. 安装并登录 Codex 桌面端，确认可以正常运行任务。
2. 在 [Releases](https://github.com/WuXinbo-bo/Codex-Bot/releases) 下载 Windows x64 安装包并运行。
3. 打开 Codex Bot，按连接向导检测。无法自动识别时，在连接设置选择可信的 Codex 程序和数据目录。
4. 在 Codex 运行一个任务，确认开始提醒、完成提醒、查看任务和确认清除均正常。

需要 Windows 10/11 x64 和 WebView2。缺少 WebView2 时安装器会请求下载，因此首次安装可能需要联网。
更新签名用于验证更新包，不代表已购买 Windows Authenticode 代码签名证书；Windows 可能显示信誉提示。

已有 Meta Bot 用户：保留原有内部应用标识与 `.metabot` 数据目录，避免丢失设置和未确认提醒。旧版没有更新入口时，请先手动安装本版本。

## 更新机制

在「设置 → 关于更新」中操作：

| 选项 | 默认 |
| --- | --- |
| 自动检查 | 开启，启动后 30～60 秒，之后约 12 小时一次 |
| 自动下载安装包 | 关闭，可自行开启 |
| 更新提醒 | 开启，可明天提醒或忽略此版 |
| 安装 | 必须明确确认，安装器退出并重启机器人 |

任务提醒优先于更新气泡。更新请求独立执行，不阻塞 Codex 状态轮询。
下载包由 Tauri 官方 updater 验签；签名错误、下载失败或发布源不可达时不会执行安装。
已验证的下载缓存在当前进程内存中，退出后需重新下载；暂不提供断点续传或自动回滚。

发布维护者请阅读 [签名发布指南](docs/releases.md)。没有正式 Release 时，检查会提示获取失败，而不是假称已是最新版。

## 数据与隐私

- 无需向机器人提供 Codex 密码、API Key 或 GitHub token。
- 本地读取 Codex 任务元数据与日志，状态缓存和用户偏好默认位于 `%USERPROFILE%\.metabot`，可用 `METABOT_HOME` 更改。
- 查询可能启动 Codex 自带的 app-server；Codex 本身可能记录运行日志。
- 更新功能只访问公开 GitHub Release 资源，不上传任务内容。可关闭自动检查。
- 任务检测依赖 Codex 当前的数据和日志格式，不是 OpenAI 提供的稳定跨进程订阅保证。
- 工作台接入只保留后端适配接口，当前不显示前端入口。

## 开发与预览

需要 Node.js 22、Rust stable、Windows C++ Build Tools 和 WebView2。

```powershell
npm ci
npm test
npm run check:native
npm run dev:native
```

动作展示页：在项目根目录启动静态文件服务器，打开 `test/fixtures/m1-visual.html`。该页面是视觉测试工具，不会代替桌面程序连接 Codex。

```powershell
npx --yes http-server . -p 4187 -c-1
# http://127.0.0.1:4187/test/fixtures/m1-visual.html
```

生产构建需要本项目的更新签名密钥；不要使用其他项目的密钥或提交私钥。开发调试不需要私钥。

## 项目结构

```text
src/             机器人、面板、表情、道具与更新界面
native/          原生窗口协调、Codex 连接与前后端桥接
shared/          任务、通知、布局和更新状态机
src-tauri/       Rust 原生能力、签名更新与安装器配置
test/            单元测试、视觉检查脚本及展示页
release/         公开发布仓库配置与验签公钥
.github/         持续检查和签名 Release 流程
docs/            设计、验收及发布说明
```

## 问题反馈与贡献

通过 [Issues](https://github.com/WuXinbo-bo/Codex-Bot/issues) 提交问题，附 Windows/Codex 版本、复现步骤和脱敏截图。不要上传 token、私钥、完整任务日志或个人目录内容。
提交 PR 前运行 `npm test`、`npm run check:native` 和 `npm run release:check`。

## 许可

本项目自有代码与素材采用 [Apache License 2.0](LICENSE)。第三方依赖保留原许可，见 [NOTICE](NOTICE) 与 [第三方说明](THIRD_PARTY_NOTICES.md)。

README 的栏目组织参考了 [sam70361/aora-bot](https://github.com/sam70361/aora-bot)，没有引入该项目的受限代码、角色图形或截图，也不对其内容进行 Apache 重新授权。
