from pathlib import Path

p = Path(r'D:\AI\health-android\README.md')
s = p.read_text(encoding='utf-8')

section = """
### 构建平台陷阱：assets 不能有子目录

Windows 上 aapt2 会把子目录资源打成 `assets/icons` + 反斜杠 + `camera.svg` 的条目名，
而 Android 的 AssetManager 按正斜杠查找，运行时静默 404。
真机表现为图标变成破图占位符，而同目录的 `icon.svg` 却正常，极具迷惑性。

因此：**`app/src/main/assets/` 只放平铺文件，不放任何子目录**。
`tests/apk-food-assets.test.mjs` 会解包 APK 断言没有任何反斜杠条目，
`tests/auth-food-integration.test.mjs` 会在源码层断言 assets 下没有子目录。

### 最终验证清单（2026-10-11）

| 项目 | 结果 |
| --- | --- |
| 测试套件 | **12 组全部通过**（新增 auth-food-integration、apk-food-assets、food-models） |
| 打包产物校验 | 解包 APK 断言：无反斜杠条目、图标平铺、食品库随包发布且行为与测试一致 |
| 授权诊断 | 用户同意后真机执行一次 /models，返回 HTTP 401；未发送图片、问题或健康数据 |
| 拍照/相册图标 | 真机截图确认按设计渲染（薄荷绿底、圆角、细线图形） |
| 食品参考库 | 真机确认卡片与免责声明在 DOM 中；行为由打包级测试覆盖 |
| 启动与崩溃 | 覆盖安装后冷启动正常，crash 缓冲区无本应用记录 |
| 覆盖安装 | 构建 12:59:27 到安装 12:59:35，未卸载、数据保留 |

**仍不可用**：真实图片自动识别。原因是被服务商拒绝的密钥（HTTP 401），
属账号凭据问题，代码无法绕过；更换有效 Key 后请先点「检查已保存的连接」。

**未做真机滑动验证**：盲滑动两次误触系统功能（微信扫码、MIUI 超级小爱），
已停止该做法；界面部分改由打包级测试与无障碍树证据支撑。
"""

if '构建平台陷阱' not in s:
    s = s.rstrip() + '\n' + section
    p.write_text(s, encoding='utf-8')
    print('README finalized')
else:
    print('already documented')
