from pathlib import Path
p = Path(r'D:\AI\health-android\README.md')
s = p.read_text(encoding='utf-8')
anchor = '## 升级不丢数据'
assert s.count(anchor) == 1
section = '''## 图片识别为什么曾经失效（2026-10-11 修复）

**现象**：相机能打开、照片能预览，但点「生成估算预览」始终得不到结果。

**根因**：`app.js` 的 `loadState()` 里写了

```js
state = {...data, settings: data.settings || {}};
```

而 `/api/state` 只返回 profile / measurements / meals / habits，**从不包含 settings**。
于是每一次记录刷新都会把 `state.settings` 清成 `{}`，`apiConfigured`、`visionEnabled`、
`visionModel` 全部变成 `undefined`，图片校验随即失败：

- 先命中 `if(!loaded || !settingsKnown)` → 「尚未加载手机模型配置，请重新打开应用后再估算。」
- 或命中视觉模型校验 → 「照片需要已启用的视觉模型……」

**最容易触发的操作**：在「我的」保存 API Key 后，`submitForm` 紧接着调用 `loadState`，
配置当场被清空；之后再拍照分析一律被拦，只有重启应用才能恢复一次。
记一餐、确认草稿、网络恢复（`online` 事件）同样会触发。

**修复**：

1. `loadState` 改为保留已有配置：payload 没带 settings 时沿用 `state.settings`，
   只有 payload 明确携带 settings 时才覆盖。
2. 新增独立的 `refreshSettings()`，启动时与**保存模型配置后**各调用一次，
   与记录刷新解耦，避免相互清除。
3. `ChatCompletion` 对 HTTP 400 给出可操作提示：
   「API 拒绝了本次请求（HTTP 400）：请确认「视觉模型」名称正确，且该模型确实支持图片输入」，
   而不是只回一个状态码。

**真机验证**（REDMI K90 / Android 16）：手机上确认 DeepSeek + 视觉模型 `deepseek-flash` +
「我已确认此视觉模型支持图片」复选框为勾选状态；点「保存连接设置」触发 `loadState` 后，
记录页仍显示「已配置外部文字模型」，配置不再丢失。

'''
s = s.replace(anchor, section + anchor)
s = s.replace('- 本次六组测试通过（含 camera-lifecycle）', '- 本次八组测试通过（含 camera-lifecycle、trends-ui、image-analysis）')
p.write_text(s, encoding='utf-8')
print('README updated with the image-analysis root cause and fix')
