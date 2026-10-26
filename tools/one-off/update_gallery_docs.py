from pathlib import Path
p = Path(r'D:\AI\health-android\README.md')
s = p.read_text(encoding='utf-8')

old_start = '## 拍照记录一餐（相机优先）'
assert s.count(old_start) == 1
i = s.index(old_start)
j = s.index('## 真机验证结果', i)
new = '''## 记录一餐：拍照或从相册选择

「记录 → 轻松记一餐」提供**两个并列入口**，都进入同一套预览与估算流程：

| 入口 | 打开 | 说明 |
| --- | --- | --- |
| **⊕ 拍照** | 系统后置相机 | 一次成像，拍完确认即回应用 |
| **▣ 从相册选择** | 系统照片选择器 | 复用已有照片；Android 13+ 为「安全访问」模式，只能读取你主动选中的那一张 |

「问答」页同样提供这两个入口（拍照提问 / 从相册选择）。

**分流依据**：页面上的 `<input type="file">` 是否带 `capture` 属性。
`onShowFileChooser` 读取 `FileChooserParams.isCaptureEnabled()`：带 `capture` → 相机；
不带 → 相册选择器（且 MIME 限定为 `image/*`）。「导入 JSON」不受影响，仍走文件选择器。

**统一处理**（相册与相机一致）：

1. 图片在**手机本地**缩放并重新编码；先按 EXIF 校正方向，再写为 JPEG，顺带移除元数据
2. 结果交给页面预览，确认同意后才参与外部估算
3. 未确认接收前图片不会丢失：即使拍照/选图期间 WebView 被系统回收，照片仍会在页面重新加载后送回
4. **HEIC / PNG / WebP 都能读**：走原生解码，不依赖浏览器画布

**相册原图安全**：临时文件清理带归属标记（`pending_image_owned`）。
相机照片是本应用创建的临时文件，取消或读取失败时删除；
**从相册选中的照片属于你的相册，任何路径都不会删除它**。

'''
s = s[:i] + new + s[j:]

s = s.replace('| 照片入口界面 | ✅ 原生「选择文件 未选择任何文件」控件已隐藏，改为统一的「拍照记录这一餐」卡片 |',
              '| 照片入口界面 | ✅ 原生「选择文件 未选择任何文件」控件已隐藏，改为并列的「拍照 / 从相册选择」两个按钮 |\n'
              '| 相册选择 | ✅ 点「从相册选择」打开系统照片选择器（`com.android.photopicker/HyperMainActivity`，安全访问模式）；取消后干净返回 |\n'
              '| 拍照入口（回归） | ✅ 点「拍照」仍直接进入系统相机（`com.android.camera/OneShotImageCapture`）；取消后干净返回 |')
s = s.replace('- 本次八组测试通过（含 camera-lifecycle、trends-ui、image-analysis）',
              '- 本次九组测试通过（含 camera-lifecycle、trends-ui、image-analysis、gallery）')
p.write_text(s, encoding='utf-8')
print('README updated with the gallery workflow')
