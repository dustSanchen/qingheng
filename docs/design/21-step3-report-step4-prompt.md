# 21 · Step 3 交付记录 + Step 4 评审提示词

执行时间：2026-10-29 19:49–19:53
版本：1.1.93 → 1.1.94 → 1.1.95（三次装机）
提交：`8d374ec`（1.1.93）、`42b7cfc`（1.1.94–1.1.95），均已双推

## 一、改了什么（逐条对应 20-audit-visual.md 的规格）

| 条目 | 文件 | 改动 |
|---|---|---|
| D1 能量环 | `10-rich-answer.fragment.js` L181–182、`styles.css` `.energy-ring` | `ratio*300` → `ratio*360`；`over*60` → `over*360`；conic 层去掉 `from 300deg`，删掉 300° 的两段刻度（它们编码旧映射） |
| G2 加载环 | `styles.css` `.busy-spinner` | 18px → 20px；`var(--dur-spin)` → `1.2s`；全局 `--dur-spin` 未动 |
| G3 完成态 | `styles.css` `.form-feedback.success::before` | 24px 叶，mask + `currentColor`，不新增资源 |
| G1 空态叶 | 无改动 | 1.1.89 已实现（40px、viewBox 24、stroke 1.5、无 fill），本轮只核对 |
| T1 点按取数 | `50-onboarding.fragment.js` `renderTrends()` | 每个点加 `r=22` 透明热区；点击在 SVG 内画浮层（日期 · 体重 / 较上次差值），3s 收起；热区 `fill:transparent` |
| T3 趋势空态 | 同上 `!points.length` 分支 | 叶 40px + 「记录第一笔体重，趋势从这里开始」+「去记录体重」按钮（切到记录页），不画坐标轴 |
| D2 数字层级 | `index.html` 目标行 + `styles.css` `.target-line` | 「每日目标 2,040 kcal」降为 `text-sm` + `muted`；一段只留 1,527 一个主数字 |
| D3 视线顺序 | `index.html` 能量卡结构 | 顺序改为 环 → 记录一餐/快速记录 → `details.advanced`「为什么是这个数」；基准/缺口/蛋白三句移入 details，默认收起；所有 id 保留 |

## 二、验证证据

- `node tools/test-all.mjs`：**56 / 0 failed**（三次改动后各跑一次）
- `node tools/aesthetic-audit.mjs`：**OK（无阻塞项）**，仅一条既有 WARN「11 处 accent token 声明」
- 装机冒烟：`installed 1.1.95 / js errors none`（dev-loop 自带）
- 截图（before → after）：
  - 今日页：`build/visual-before/01-today.png` → `build/visual-after/01-today-1195.png`
  - 趋势页：`build/visual-before/03-trends.png` → `build/visual-after/03-trends-tip-1194.png`（含点按浮层）
- 交互实测：趋势图最右点被点击后浮层出现并显示「2026-10-26 · 65 kg / 较上次 +0 kg」（截图 `03-trends-tip-1194.png`）

## 三、没做什么，以及原因

1. **T2 目标区间带**：全仓 grep `weightTarget|goalWeight|targetWeight` 无结果，`state.profile` 也没有体重目标字段。需要先决定「体重目标存哪里」，否则实现只能是空壳。
2. **G4/G5/G6**：是符号禁用规则（控件/数值/错误不加符号），已写进规格文档作为约束，无需代码。
3. **趋势点的键盘可达性**：热区是 SVG `<circle>`，可点不可聚焦。移动端可接受，但严格说违反「可交互即应可达」。若要补，需给每个点加 `tabindex` + 方向键切换，属于新增交互，未擅自加。
4. **能量环超出态的实机验证**：当前饮食 1,527 / 目标 2,040 没有超出，`--warn` 覆盖分支只验证了代码路径，没截到超出状态的图。

## 四、Step 4 评审提示词（复制给评审模型）

```
你是交付前的评审，不是作者。仓库 D:\AI\health-android，版本 1.1.95。

看这四样：
1) docs/design/20-audit-visual.md（诊断 + 12 条规格 + 本轮的交付记录在 docs/design/21-*）
2) 改动列表：git show --stat 42b7cfc 与 8d374ec
3) before/after 截图（下方附件）
4) node tools/aesthetic-audit.mjs 的输出

只回答一个问题：这版比上一版更像「有主张的品牌」了吗？

输出 ≤8 条意见，每条必须是可执行的判断。合格示例：
"能量卡里 1,527 与 2,040 仍相距 30px 同屏竞争，建议把目标行移到环下方同一基线"
不合格示例（不要写）：
"整体还可以再精致一点"

如果确实没有值得改的，直接写「无阻塞意见」，不要凑数。
不要重新设计，只指出问题。
```

**附件（按 before → after 成对给）**

- `build/visual-before/01-today.png` 与 `build/visual-after/01-today-1195.png`
- `build/visual-before/03-trends.png` 与 `build/visual-after/03-trends-tip-1194.png`
- 可选：`build/visual-before/07-records-ledger.png` 与账本对照（本轮未改记录页，用于判断风格是否被破坏）

## 五、下一轮建议顺序

1. 先补 T2 的字段决策（`weightTarget` 放 profile 还是复用目标测算），再实现区间带。
2. 能量环超出态：造一条超过目标的数据，实机截一张 `--warn` 覆盖的图。
3. 若评审提出「两数仍竞争」，D2 可能需要把目标行移到环的正下方（当前在右侧栏）。
