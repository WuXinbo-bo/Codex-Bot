# 首次连接验收记录 · 2026-09-09

基线：`9fb7661`，开始时工作区干净。

## 已通过

- `npm test`：172 / 172。
- `npm run check:native`：通过。
- Rust release 单元测试：1 / 1，涵盖原有存储/日志及新增路径验证、中文空格路径、目录检查、停用清空游标。
- `npm run build:native`：EXE 与 NSIS 安装器成功生成。
- `npm run test:native`：真实查询通道 connected，本机检测到 3 项活动任务，提醒、跟随、设置通过。
- `npm run test:native -- --dpi`：150% 缩放通过。
- `npm run test:native -- --onboarding`：缺少程序、缺少 Codex 数据目录时不误报连接，向导可显示、跳过可保存。
- Playwright 模拟 UI：零任务、路径编辑、取消选择、保存、人工确认、返回任务面板通过，无页面异常。
- Playwright 原生 CDP：实际程序和数据目录检测通过；清空覆盖路径后重新连接成功；跳过持久化；面板恢复 320 DIP（本机 480 物理像素）。
- `git diff --check`：通过。

首次并行测试遭遇共享 WebView2 目录冲突，造成调试端口不可用及冒烟超时；测试启动器已使用独立 WebView2 目录并重跑通过。早期 UI mock 缺少订阅函数、物理像素断言未考虑 DPI，均修正后重跑，不将失败结果计作通过。

## 体积

EXE 4,887,552 字节（4.661 MiB）；安装器 1,976,218 字节（1.885 MiB）。SHA256 见 `output/release/size-report.json`。不含系统 WebView2、用户 Codex、开发依赖和运行内存。

## 未验证，不可宣传为正式新机全通过

真实干净 Windows 安装/升级/卸载、无开发工具系统、缺失 WebView2 在线/离线安装、不同 Codex 版本兼容性、真实权限拒绝、多显示器实机、原生文件选择器人工点击闭环。当前机器未发现 Windows Sandbox 入口，本轮没有新建 VM 或改变 Windows 功能。

原生脚本验证了查询与合成提醒，但没有自动在 Codex 创建真实任务；真实任务开始→完成→查看正确落点→确认清除仍需首次向导中的用户验收。候选包可供受控测试，不等于完成公开发布认证。
