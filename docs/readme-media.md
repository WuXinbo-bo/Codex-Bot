# README 图鉴制作

README 精选区、完整分页图鉴和动图均使用项目当前渲染器。不会连接真实 Codex、读取用户任务或改动运行中的桌面程序。

## 内容来源

- `scripts/readme-catalog.cjs`：精选条目、中文标题、代表帧选择与完整注册表分类。
- `test/fixtures/readme-atlas.html`：固定四列的导出画布，同时最多 12 个机器人，换页销毁。
- `scripts/readme-gallery.pw.js`：逐页生成截图。
- `scripts/readme-motion.pw.js`：使用生产面板集成演示和真实渲染器录制动图帧。Playwright 时钟以 100 ms 推进，不以截图耗时改变动画速度。
- `scripts/readme-hero.pw.js`：以两倍浏览器渲染比例截取主图，不放大低分辨率位图。
- `scripts/readme-media.cjs`：WebP 压缩、GIF 编码与媒体清单。
- `scripts/readme-check.cjs`：Markdown 链接、图片、计数、体积与本地预览检查。

完整图鉴按唯一活动编号分类，不重复计数。每页最多 12 套，并提供前后页与目录导航。静态图片只是代表性关键帧，不替代完整活动播放。

## 重新生成

在项目根目录执行，需要 Node.js 22、npm、Chromium，以及文档工具依赖 `sharp` 和 `marked`。这些依赖不进入应用安装包。

```powershell
npm install --prefix .runtime/docs-tools --no-save sharp marked
$env:NODE_PATH = (Resolve-Path .runtime/docs-tools/node_modules).Path
node scripts/readme-catalog.cjs
node scripts/build-tauri.cjs
npx --yes http-server . -p 4187 -c-1 -a 127.0.0.1
```

保持静态服务器运行，在另一个终端中执行：

```powershell
$env:NODE_PATH = (Resolve-Path .runtime/docs-tools/node_modules).Path
npx --yes --package @playwright/cli playwright-cli -s=readme open http://127.0.0.1:4187/test/fixtures/readme-atlas.html
npx --yes --package @playwright/cli playwright-cli -s=readme run-code --filename scripts/readme-gallery.pw.js
npx --yes --package @playwright/cli playwright-cli -s=readme run-code --filename scripts/readme-motion.pw.js
npx --yes --package @playwright/cli playwright-cli -s=readme run-code --filename scripts/readme-hero.pw.js
node scripts/readme-media.cjs
node scripts/readme-check.cjs
npx --yes --package @playwright/cli playwright-cli -s=readme run-code --filename test/readme-review.pw.js
npx --yes --package @playwright/cli playwright-cli -s=readme close
npm test
```

截图中间文件位于已忽略的 `output/playwright/readme/`。提交最终 `docs/assets/readme/`、`docs/assets/atlas/`、`docs/gallery/` 和更新后的 README；不要提交中间帧或文档工具的 node_modules。

## 验收要求

1. 图鉴中活动编号与源码完全一致；不得用旧截图补位，也不重新引入已删除资源。
2. 每个导出画面有中文名称，身体、道具、面具不裁切，面具处于实际佩戴状态。
3. 完成动图在确认前保留提醒，确认后才收起。循环重播须在 README 中说明。
4. 三段动图总时长分别为 8、12、15 秒；编码器允许合并静止帧，但不改变总时长。
5. README 的本地图片总量不超过 5 MiB；单张静态图不超过 250 KiB；完整媒体不超过 8 MiB。
6. 所有本地链接、片段锚点和图片可解析，桌面与 390 px 手机宽度不出现整体横向溢出。
7. 图鉴页使用静态图片和 Markdown，不依赖 GitHub 不支持的脚本、折叠懒加载或自定义分页。

外链可另外执行 `node scripts/readme-check.cjs --remote` 检查。网络不可达应明确记录，不视为本地链接验证通过。

本轮仅更新文档、图片和制作工具，不升级版本、不替换桌面程序、不自动发布 GitHub Pages 或远程 Release。

## 本轮检查结果

2026-09-10：23 张精选图展示 207 个画面；完整活动图鉴 38 页，435 个活动编号均覆盖且不重复。61 张分类静态图、1 张高分辨率主图和 3 段动图全部可解码。

README 本地媒体约 2.5 MiB，包含分页图鉴的全部媒体约 4.2 MiB。41 份文档中的 406 处链接引用检查通过，6 个去重外链返回成功。桌面与 390 px 手机宽度检查通过，276 项单元测试通过。

这些结果对应当前源码；本地 GitHub 风格预览不等于已经推送或在线发布。
