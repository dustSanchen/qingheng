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
| `tools/verify-all.ps1` | tests + build + packaging checks only (no device) |

Remotes: `localmirror` (bare mirror) and `source` (private GitHub) take the full history;
`public` (public GitHub) mirrors master, and `publish-pages.ps1` refreshes its gh-pages branch.

Keep `backups/` and `.signing/` out of version control; they hold a full pre-change copy and the key.
