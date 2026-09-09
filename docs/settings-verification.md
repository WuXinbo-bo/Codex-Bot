# Settings View Verification

The settings view previously inherited the 154-pixel task window height and its repair button used browser-default styling. Settings now request a 280 x 380 native surface through a panel-only, boolean-validated IPC action. Returning to tasks restores 280 x 154; onboarding remains separate. Tabs stay visible within the scrolling settings region. Controls have explicit typography and bounded widths.

Verified: 183 unit tests; settings tabs, saving a shape and returning to tasks; panel retention during four-corner drag; no shadow/backdrop styles; task start/completion/acknowledgement and multiple-completion handoff; full asset inventory; 1280/390 viewport animation playback; 1080 emotion/shape path combinations; native smoke at 150% scaling with live Codex; missing-installation/missing-home onboarding behavior.

Browser settings checks run through the production bridge/coordinator with mocked OS calls and data. Native smoke checks actual windows and live source connection. These checks are not certification on every Windows machine and do not prove the absence of every possible defect.
