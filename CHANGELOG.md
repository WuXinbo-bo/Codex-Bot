# Changelog

## 0.7.0

- 同一 Codex 任务反复执行时复用一张任务卡；未确认的卡片原位切换为继续执行，完成后恢复淡绿色及确认、查看按钮。
- 合并旧版重复完成提醒，防止延迟消息和确认、打开任务期间的状态变化误清除新一轮提醒。
- 新增继续处理原卡片的动作，保留接卡、盖章和收纳联动；任务状态图标动态反馈，任务数量更清晰，列表滚动更稳定。
- 加入 30 套鼠标回应、连续抚摸与跟随反馈，以及拖拽停顿动作；任务提醒优先。
- 新增紧凑的机器人右键菜单，提供主动互动、安静时段、任务、设置与托盘收纳；移除独立小游戏。
- 精简 README，使用静态活动展示与自动版本徽章。
- 通过 308 项单元测试、任务卡与交互浏览器回归、150% DPI 原生连接检查及首次使用冒烟测试。

## 0.6.0

- Unify task start, discovery, resume, attention and completion notifications in one compact task board.
- Keep completed cards pale green and visible until explicitly acknowledged; viewing, settings, dragging and restart preserve pending records.
- Add visible-time notification budgets, inline copy/open controls, reliable resume detection, retryable errors and coordinated robot/card animation.
- Expand the activity system to 435 activities with contextual scheduling, 108 authored base emotions, varied props and automatic appearance rotation.
- Refresh the README with 23 featured image sheets, three motion previews and a paginated gallery covering all activities.
- Validate 284 unit tests, three unified-board browser suites, live Codex connectivity at 150% scaling and isolated first-use onboarding.

## 0.5.0

- Refresh the README with expression, skin and shape galleries.
- Integrate twenty long performances with fair rotation and completion-based cooldowns.
- Keep performances available while panels are open or the pointer is nearby.
- Resume after brief clicks; preserve task notification and drag priority.
- Coordinate masks, shapes and props, with three subtle acting variants per story.
- Unify the native launcher executable path.

## 0.3.0

- GitHub Releases signed updates with automatic checks and optional background downloads.
- Compact update notices, progress, release notes, postpone and ignore controls.
- Explicit installation confirmation; existing task state and settings preserved.
- Twenty fifteen-second theaters, context-aware scheduling and interrupt-safe masks.
- First public Codex Bot release; Windows x64 and system WebView2.
