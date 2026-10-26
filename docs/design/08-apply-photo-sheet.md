# 执行单 · 照片入口改成底部弹层 + 今日顺序行式化

> 已被核实的现状（不要再重复调研，按此执行）：
> 1. `installPhotoEntry()` 定义在 `70-rest.fragment.js` L248，**调用点在 L443**，已有 `typeof` 保护，会执行。
> 2. 它找 `#photo-add` / `#photo-sheet`，而 `index.html` 里这两个节点不存在 → 函数第一行 `if (!open || !sheet) return;` 直接退出，是死代码。
> 3. 现有 `<label for="meal-image">` / `<label for="meal-gallery">` 靠原生 `for` 行为就能打开选择器，**所以"不能拍照"不是 bug**；本次是把它改成单一入口 + 弹层。
> 4. **不要给 label 再绑 `input.click()`**：原生 `for` 已经触发一次，再绑会弹两次选择器，`MainActivity.onShowFileChooser` 会作废第一个回调。
> 5. 竖排的元凶不是 `.upload-label`，而是 `label{flex-direction:column}`（L83 全局）被 `.ai-plan-row` 与 `.capture-card` 继承。

## 一、styles.css：删除

按**选择器文本**删，不要按行号删（行号是早期扫描结果，可能有偏移）。

```
/* 旧版 capture，已被后面的 v3 整组覆盖 */
.capture-actions{...}
.capture-card{...}
.capture-card:active{...}
.capture-card img{...}

/* HTML 与 fragments 里 0 处引用 */
.capture-button{...} .capture-button:active{...} .capture-button>span{...}
.capture-button strong{...} .capture-button small{...} .capture-sep{...}
```

**不要删任何 `.button{...}` 规则**——之前的扫描把带作用域的规则前缀截掉了（如 `@media(max-width:370px){.energy-detail .button{...}}`），盲删会改坏组件。提交按钮在 HTML 里已是 `button primary full-width`，无需改动。

## 二、styles.css：新增（追加到文件末尾）

```css
/* 这些 <label> 是横向一行，不能继承全局 label{flex-direction:column} */
.ai-plan-row,
.capture-card{flex-direction:row;margin:0}

/* 今日顺序：一行一个动作，序号用 CSS 计数器生成，不改 JS */
.ai-plan-list{counter-reset:ai-step}
.ai-plan-row{min-height:48px;padding:var(--space-2) 0}
.ai-plan-row::before{counter-increment:ai-step;content:counter(ai-step);flex:0 0 1.5em;
  color:var(--muted);font-variant-numeric:tabular-nums;font-size:var(--text-sm)}
.ai-plan-name{min-width:0;overflow-wrap:anywhere}
.ai-plan-dose{white-space:nowrap}

/* 「添加照片」入口按钮 */
.photo-add{min-height:var(--btn-h);color:var(--ink);font-size:var(--text-md)}
```

## 三、index.html：替换 `.capture-actions` 整块

```html
<!-- 删除 -->
<div class="capture-actions">
  <label for="meal-image" class="capture-card">…拍照…</label>
  <label for="meal-gallery" class="capture-card">…从相册选…</label>
</div>

<!-- 替换为 -->
<button type="button" class="photo-add" id="photo-add" aria-haspopup="dialog"
        aria-controls="photo-sheet" aria-expanded="false">
  <img class="photo-add-icon" src="./icon-camera-flat.svg" alt="" width="20" height="20">
  <span>添加照片</span>
</button>
<div class="sheet" id="photo-sheet" hidden>
  <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="photo-sheet-title">
    <h2 class="sheet-title" id="photo-sheet-title">添加照片</h2>
    <button type="button" class="sheet-option" id="photo-take">拍照</button>
    <button type="button" class="sheet-option" id="photo-pick">从相册选</button>
    <button type="button" class="button subtle full-width" id="photo-close">取消</button>
  </div>
</div>
```

两个 `<input type="file" id="meal-image">` 与 `#meal-gallery` **保持原样，不要删**。

## 四、70-rest.fragment.js：整体替换 `installPhotoEntry()`

补焦点进出与 Esc 关闭，对齐 B 组弹层规范：

```js
function installPhotoEntry() {
  const open = $("#photo-add"), sheet = $("#photo-sheet");
  if (!open || !sheet || sheet.dataset.wired) return;
  sheet.dataset.wired = "1";
  const show = () => { sheet.hidden = false; open.setAttribute("aria-expanded", "true"); $("#photo-take").focus(); };
  const hide = () => { sheet.hidden = true; open.setAttribute("aria-expanded", "false"); open.focus(); };
  const pickFile = id => () => { hide(); const input = $(id); if (input) input.click(); };
  open.addEventListener("click", show);
  $("#photo-close").addEventListener("click", hide);
  $("#photo-take").addEventListener("click", pickFile("#meal-image"));
  $("#photo-pick").addEventListener("click", pickFile("#meal-gallery"));
  sheet.addEventListener("click", e => { if (e.target === sheet) hide(); });
  sheet.addEventListener("keydown", e => { if (e.key === "Escape") hide(); });
}
```

## 五、取消选择时不要静默清空照片

`#meal-image` 的 change 处理里若为 `if(!file){clearImage();return;}`，改成保留原内容 + 一句提示：

```js
if (!file) { feedback($('#estimate-feedback'), '没有选择照片，原来的内容没动。'); return; }
```

`#meal-gallery` 的 change 处理若同样写法，一并改。它的位置：`10-rich-answer.fragment.js` L421 只绑了 `click`（declareImageTarget），change 处理需自行 grep 确认。

## 六、执行与验证

```powershell
# 1. 改文件（只改 styles.css / index.html / fragments）
# 2. 重新生成 app.js —— 绝对不要手改 app.js
powershell -NoProfile -ExecutionPolicy Bypass -File tools\assemble-app.ps1
# 3. 全套测试
Get-ChildItem tests\*.test.mjs | ForEach-Object { node $_.FullName }
```

已知会被影响的测试（失败先判断类型，不要为了变绿而改测试）：

| 文件 | 涉及 |
|---|---|
| `frontend-audit.mjs` L49 | capture-card / meal-image |
| `gallery.test.mjs` L12/L16/L27/L53 | 相册流程 |
| `layout-four.test.mjs` L17 | 今日布局 |
| `training-library.test.mjs` L261 | 训练相关 |

## 停止条件

改完只回三行：

```
assemble: ok/fail
tests: PASS n / FAIL m（列出失败文件名与失败项）
改动: styles.css 删 X 行 加 Y 行 / index.html 替换 1 块 / 70-rest 替换 1 函数
```

不要动 `03-components-d.md`，不要开始 05 卡。
