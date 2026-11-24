# One-command dev loop for 轻衡

Replaces the manual sequence this project used to need: backup -> assemble -> syntax check -> tests ->
build -> install -> device smoke check. Every step prints PASS/FAIL and its own duration, and the run
stops at the first failure with the exact step name.

```powershell
# normal change:
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1

# shipping a version bump:
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -Version 1.0.20 -VersionCode 21

# quick iteration without touching the phone:
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -SkipInstall

# tests already known good:
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\dev-loop.ps1 -SkipTests -SkipInstall
```

Supporting tools:

| Tool | What it removes |
| --- | --- |
| `tools/dev-loop.ps1` | the 8-command manual sequence and its ordering mistakes |
| `tools/publish-pages.ps1` | refreshing GitHub Pages by hand: rebuilds the gh-pages branch from site/index.html + .nojekyll and force-pushes it. Never touches master |
| `tools/lib/patch.mjs` | CRLF/anchor/idempotency boilerplate in one-off edit scripts (and their retry cycles) |
| `tools/device.mjs` | blind taps: `--preview` converts 877x1904 preview coordinates to device pixels; `smoke` checks version + JS errors + screenshot in one call |
| `tools/ai-flavor-audit.mjs` | 「AI 味」静态审计：装饰渐变、阴影、大圆角、chip/tag、背景模糊、居中、营销词；只报告不阻塞 |
| `tools/verify-all.ps1` | tests + build + packaging checks only (no device) |
| `tools/check-architecture.mjs` | 架构边境：片段分层编号、`*-domain` 零 DOM、app.js 与片段逐字节一致、`window.QH` 在无 DOM 的 vm 里可执行。`test-all` 每次先跑它；`--strict-bands` 供改名迁移验收 |

Remotes: `localmirror` (bare mirror) and `source` (private GitHub) take the full history;
`public` (public GitHub) mirrors master, and `publish-pages.ps1` refreshes its gh-pages branch.

Keep `backups/` and `.signing/` out of version control; they hold a full pre-change copy and the key.
