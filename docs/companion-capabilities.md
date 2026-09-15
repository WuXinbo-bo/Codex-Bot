# Companion capabilities

Baseline: `5b611b0`. Work branch: `codex/companion-capabilities`.

## Delivery batches

1. Work companion and useful props: once-per-day preparation, task-type work,
   waiting/rest, completion review and recovery, explicit pack-up; per-turn notes,
   focus lamp, persistent hourglass timer, recent-task box, priority flag,
   connection magnifier and copy-link plane.
2. Mouse and living space: approach, head petting, repeated taps, orbit, fast
   pass, lift/land and edge reactions; stool, mat, lamp, box, plant and tray.
3. Twelve short playable activities: catch, hidden star, mirror, balance,
   stretch, trace, high five, rhythm, sorting, stacking, watering and paper plane.
   Task cards receive/stamp/file/fold in the existing panel lifecycle.

## Contracts

No mouth, new system windows, global keyboard monitoring, sound, remote service,
or autonomous task execution. Keep task status truthful. No interaction delays
opening or acknowledging tasks. Completed cards clear on acknowledgement or
successful open; failed actions retain them. Games last 15–30 seconds and yield
to task lifecycle events. Focus mode suppresses optional play, not notifications.
All controls have an entry in the companion tab, including keyboard alternatives.
Only one game, one countdown and a bounded local history are retained. Closing
the companion view ends its game. Reduced motion removes optional choreography.

## Verification

Pure state tests cover restart, expiry, task identity, note delivery, game rules,
bounded state and interruptions. Browser checks exercise production bridge,
controls, robot effects, game inputs and panel state. The gallery loads this
production integration in one bounded instance rather than mounting every game.

## 使用入口

点击任务板顶部的小房子，进入“陪伴”。陪工道具包含台灯、沙漏、
工作本、旗标、纸飞机、放大镜和收纳箱；生活物件可以选择六种布置；
短时互动提供十二种玩法和随机选择。也可点击机器人左下角生活物件进入。

完成便签绑定具体任务轮次，下一轮不会继承；到期计时和便签在任务板
生成独立可确认提醒。最近完成只保存二十条标题和任务标识，不保存对话全文。
专注到期后恢复普通陪伴；停止程序期间计时使用绝对截止时间，下次启动补提醒。
“收拾休息”只让机器人休息，不会停止 Codex 任务；新任务到来会唤醒它。

十二种玩法：你抛我接、星星藏哪边、镜像模仿、头顶平衡、一起伸展、
描一条小路、给我五、桌边节拍、卡片归位、软块叠高、一起浇花、纸飞机投递。
每局 18–25 秒，鼠标和键盘均有操作入口。关闭页面或切换分类会收好游戏。

自动陪工与生活动作遵守现有随机动作、故事和减少动态偏好；主动使用工具
仍会给出反馈。任务开始、需要处理与完成仍由现有任务系统优先呈现。

## 检查入口

- `test/companion-system.test.cjs`：计时、便签轮次、工作情境、十二种规则。
- `test/companion-integration.pw.js`：真实生产桥接、工具、保存失败与重启恢复。
- `test/companion-games.pw.js`：十二种玩法逐一执行鼠标或键盘操作并验证得分。
- `test/companion-mouse.pw.js`：原生鼠标事件、摸头、落地、物件入口与任务抢占。
- `test/fixtures/panel-system.html?companion=1`：完整交互演示，使用模拟任务。

## 本轮验收（2026-09-15）

- 290 项单元测试通过；35 个新增陪伴动作接入生产调度。
- 十二种游戏逐一实际输入并验证得分；六种生活物件及工具控制通过浏览器检查。
- 工具保存失败与任务完成并发时，完成记录仍能保存；自动计时保存失败后重试。
- 任务开始、完成有实际机器人画面变化，鼠标摸头、落地、物件入口与任务抢占通过。
- 原有任务板打开、确认、拖拽、保存失败与重启保留回归通过。
- 1、3、10 条任务下点击、动画、滚轮和键盘滚动稳定，无滑块抖动回归。
- 原生 release 构建通过；150% DPI 冒烟检测到实际 Codex 连接和两条任务，移动、设置、提醒保留通过。
- 未初始化 Codex 目录及缺失程序场景的首次启动、修复入口与跳过保存通过。

浏览器演示使用模拟任务；原生冒烟使用独立配置，不替换用户配置。
本轮更新本地开发程序，版本仍为 0.6.0，未推送远程或发布安装包。
