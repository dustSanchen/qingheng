# 轻衡 · 宣传片交接（2026-11-20）

> 给新会话读。读完这一份就知道：App 是哪个版本、片子出到哪、接下来该做什么。
> 权威路径与命令见仓库根 `AGENTS.md`；本文只管"宣传片这件事"。

## 一、一句话现状

轻衡 **1.4.69**（639 KB / 82 项测试 / 源码公开）现在有**三支成片**：v5 动态稿 84.8s（当前主投放）、产品片 89s、趋势观点片 113.8s（旧版，仅留档）；下一步是投 v5、补竖版、接收益路径。

## 二、权威事实（改动前先核）

| 项 | 值 | 怎么核 |
|---|---|---|
| App 版本 | 1.4.69 / versionCode 469 | `app/src/fragments/70-rest.fragment.js` 的 `APP_VERSION`；README 徽章 |
| APK | `dist/qingheng-1.4.69.apk`（654,560 B ≈ 639 KB） | `dist/` 目录 |
| 测试 | 82 项 | `node tools/test-all.mjs` |
| 仓库 | `D:\AI\health-android`（单 Activity + WebView） | — |
| 物料目录 | `artifacts/promo/`（被 gitignore，不进仓库） | — |
| 文稿目录 | `docs/promo-*.md` | — |

## 三、成片（按可用度排）

| 片 | 文件 | 规格 | 配音 | BGM | 定位 |
|---|---|---|---|---|---|
| **v5 动态稿** | `artifacts/promo/qingheng-v5-85s.mp4` | 84.82s / 18 镜 / 1080p60 / 11.1 MB / −16.4 LUFS | MiMo 白桦（男，113Hz） | 《phonk-gym》129.2BPM + 29 个程序化音效 | **B 站主投放** |
| 产品片 v4.2 | `artifacts/promo/qingheng-promo-v4.mp4` | 89.02s / 15 镜 / 1080p60 / 11.1 MB | MiMo 茉莉（女，190Hz） | 《追光》Future Bass 129BPM | 主页/Release/展示页 |
| 趋势观点片 v2 | `artifacts/promo/qingheng-trend-113s.mp4` | 113.83s / 15 镜 / 1080p60 / 10.8 MB | MiMo 白桦（男，132Hz） | 同上 | 留档，被 v5 取代 |

三支都有 `-vo.mp4` 纯人声版（自配乐或平台静音风险时用）。

**v5 验收数字**：切点 19 / 中位 4.20s（旧片 7.40s）；平均帧差 1.97/255（旧片 0.12）；`freezedetect n=0.001 d=1.0` 1 段 1.05s（旧片 18 段 20.8s）；−16.4 LUFS。脚本与验收表见 `docs/promo-video-v5-85s.md`。

## 四、文稿（八份，按平台）

| 平台 | 文件 | 时长 | 要点 |
|---|---|---|---|
| B 站 | `promo-video-bilibili-trend-95s-v2.md` | 95s（实出 113.8s） | **当前主稿**：练大→练薄 → 算比练难 → AI 三毛病 → 长在系统里；结尾免费承诺 + 关注/star/说功能 |
| B 站 | `promo-video-bilibili-95s.md` | 95s | 早一版：带人名（孙宇晨/邵艾伦）引述 |
| B 站 | `promo-video-bilibili-35s.md` | 35s | 投流短版 |
| 抖音 | `promo-video-douyin-v3-alan.md` | 30s | 借 Alan×孙宇晨对谈爆点（引述公开言论） |
| 抖音 | `promo-video-douyin-v2-traffic.md` | 30s | 只挂关键词、不点人 |
| 抖音 | `promo-video-douyin-30s.md` | 30s | 无流量词版 |
| 发布 | `publish-kit.md` | — | B 站标题/简介/10 标签/投稿参数/封面 |
| 收益 | `promo-revenue-and-cta.md` | — | 免费承诺 + 三档 CTA + 变现路径（先赞赏、不做云端付费） |

历史稿（v2/v3/v4 方案、旧 76s 稿）保留在 `docs/promo-video-v*.md`，**不要当现状用**。

## 五、封面

- B 站：`artifacts/promo/cover/cover-bili-16x9-1146x645.png`（2292×1290，钩子 112px 单行「只会站跑步机？」）
- 必须落 4:3 安全区（x 143–1003），自检图 `cover-bili-43裁切预览.png`、`cover-bili-16x9-预览360.png`
- 旧文件 `cover-bili-1146x717.png` 是 16:10，**B 站会裁，别用**

## 六、怎么重出一支片（管线）

```
① 写文案 → 改 vo_mimo.py 的 LINES（导演笔记 + 正文）
② 出配音 → python artifacts/promo/vo_mimo.py --voice <茉莉|白桦> --tag <名字> --notrack
③ 排时间轴 → python artifacts/promo/timeline_trend.py（按 129BPM/0.465s 量化，产出 cam_trend.json + vo-*.wav）
④ 改画面 → artifacts/promo/film_trend.html（CAM/SUBT 由 ③ 的 json 注入；场景 id 与 ids 列表一一对应）
⑤ 渲染 → python artifacts/promo/render_trend.py --all   （总长 × 60 帧，Playwright 逐帧）
⑥ 编码 → python artifacts/promo/encode_trend.py        （H.264 + 混入人声与 BGM，sidechain 避让）
```

产品片用 `film75.html` + `render_film75.py` + `encode_v4.py`；两者结构相同，只是场景不同。

## 七、已踩过的坑（别重踩）

1. **ffmpeg / Chromium 写不进 `D:\AI\health-android\**`**（目录 ACL 有 `Everyone DENY(DC)`，报 Permission denied）。所有产物先落 `D:\AI\tmp\promo\`，再用 python `shutil.copy2` 复制进仓库。
2. **渲染脚本别写死时间轴路径**：曾读旧 `vo-tight/cam.json`（81s）去渲 89s 的片，只出 4877 帧、后 7.7 秒缺失且不报错。渲染前必须打印「总长 × fps = 需要帧数」。
3. **片长由语速决定**：同一份 305 字稿，茉莉 76s、白桦 105s。分镜预算要先用选定音色试读。
4. **>6 秒的静态镜必须有三拍事件**（入镜文字 / 第二层信息 / 收束动作），否则观众说"卡住了"。
5. **验收靠数字不靠眼**：`ffmpeg -vf freezedetect=n=0.001:d=1.0`（≥2s 应为 0 段）、`ebur128` 量 LUFS、`bbox` 量拍点误差。
6. **封面先查平台规格再排版**：B 站要 16:9，且同一张图会按 4:3 展示。

## 八、口径（写文稿必须守）

- 数字只在证据表：增肌 14~20 组/周、蛋白 1.6~2.2 g/kg、每周 +0.25~0.5%；缺口上限 20%
- 版本/体积只上画面不念；「十几秒压到几秒」这类未实测的数不要写死
- 蹭热点：人名只放标题/话题，正文只写"我看到了什么"；不伪造代言、不编造言论、不用肖像
- 文风：不写"加油/坚持"，不诊断不开处方；薄肌立场是"不是饿出来的，两件事都得有数"

## 九、待办（按优先级）

1. **投 v5**（84.8s），产品片放主页；旧 113.8s 片留档不再用。
2. **竖版**：抖音 30s 与 B 站 35s 都还是文稿，没有画面；竖版需重排 T1 版式（1080×1920）。v5 的镜头表可直接竖屏重排。
3. **建议提速的准确数字**：真机跑一次「从点生成到出结论」的耗时，再决定要不要上屏。
4. **收益落地**：B 站充电开通、README 加 Sponsor 一行、简介固定那段话。
5. **清理**：`artifacts/promo/` 里有 60/65/75/76s 的旧成片与旧配音，可移到 `backups/`。

## 十、一句话给接手的自己

**这支片子最贵的不是渲染，是口径**——版本号要读仓库、时长要试读、数字要有出处、人名要能证明。以上任何一条松了，片子会很好看，但你会在评论区被问住。

补一条 2026-11-20 的新教训：**「没有死帧」不等于「有动感」**。旧片只验 `freezedetect`（18 段冻结、合计 20.8s 却仍报"≥2s 冻结 0 段"），
观众的感受是"PPT"。验收要同时看帧差能量与切点密度，见 `docs/promo-video-v5-85s.md` 第七节。
