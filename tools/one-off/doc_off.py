from pathlib import Path
p = Path(r'D:\AI\health-android\README.md')
s = p.read_text(encoding='utf-8')

# Replace the now-removed manual URL reference section with the current design.
start = s.find('## 联网引用（2026-10-11）')
if start != -1:
    end = s.find('### 按问题联网检索（Brave Search）', start)
    if end == -1:
        end = len(s)
    s = s[:start] + s[end:]

section = """
## 联网能力现状（2026-10-11 修订）

### 已移除：手动引用网页

粘贴网址抓正文的方案**已整体删除**（源码、路由、界面、测试一并移除）。
原因：使用步骤太繁琐，且它依赖模型密钥可用，体验并不好。
删除后 `MainActivity`、`app.js`、`index.html`、`native-adapter.js` 中都不再出现
`fetch-page` / `webSource` / `WebPageFetch` / `page-text` 相关代码，
打包校验会断言这些字符串与类**不存在**于 APK 中。

### 保留：按问题自动联网检索（Brave，无需粘贴网址）

问答时由**模型自己决定**是否需要检索，App 执行检索并把结果回传给模型，
回答必须列出来源。用户不需要做任何额外操作。

### 新增：Open Food Facts 包装食品营养查询

「记录 → 食品热量参考库」新增**在线搜索包装食品**：输入品牌或产品名，
点一次按钮即可查到该产品的**每 100g** 热量、蛋白、脂肪、碳水，一键填入餐食描述。

| 项 | 值 | 依据 |
| --- | --- | --- |
| 端点 | `https://search.openfoodfacts.org/search` | 项目自带 OpenAPI：`https://search.openfoodfacts.org/openapi.json` |
| 鉴权 | **无需 Key**，只需标识性 User-Agent | [Open Food Facts API 文档](https://openfoodfacts.github.io/openfoodfacts-server/api/) |
| 许可 | **ODbL（开放数据）**，可自由复用，需署名 | 同上 |
| 限流 | 读取 15 次/分、搜索 10 次/分（按 IP） | 同上，官方明确反对逐字搜索 |

字段名经**真实请求验证**：`hits[]`、`product_name`、`brands[]`、
`nutriments.energy-kcal_100g / proteins_100g / fat_100g / carbohydrates_100g`。

实现要点：

- 主机名硬编码；**不发送任何健康记录、照片或密钥**，只发送搜索词
- 只在**点击按钮**时查询，不做逐字搜索，符合官方限流要求
- 缺失营养值显示 `—`，**不伪造 0**
- 产品名兼容字符串与多语言对象两种返回形式
- 界面明示数据来源与 ODbL 许可

### 关于「逆向薄荷健康」等商业 App 数据库

**本项目的立场：不做，也不会做。** 逆向或抓取商业健康 App 的食品数据库会违反其服务条款，
并可能违反《反不正当竞争法》与著作权相关法律；这类数据还常含错误，直接使用会污染记录。
食品营养数据有**合法且免费**的来源，Open Food Facts 即为其一（另有 USDA FoodData Central 等），
本项目只接入这类开放许可数据。

### 顺带修复：构建产物残留

`javac` 不会删除已移除源文件对应的 `.class`，导致**已删除的类仍被打进 dex 与 APK**。
`build.ps1` 现在每次构建前清理 `build\\classes`、`build\\dex`、`build\\rjava`，
并由 `tests/food-database.test.mjs` 断言已删除的类不出现在安装包中。

### 验证

- **15 组测试全部通过**（新增 `food-database.test.mjs`）
- `tests/verify-web-apk.mjs` 按原始字节解包 APK，13 项全过，含
  「Open Food Facts 主机/路由已打包」与「已删除的抓取功能不存在」
- 真机确认：`在线搜索包装食品` 与 `Open Food Facts` 已渲染，「引用网页」残留为空
"""

if '### 新增：Open Food Facts' not in s:
    s = s.rstrip() + '\n' + section
    p.write_text(s, encoding='utf-8')
    print('README updated for the removal and the open database')
else:
    print('already documented')
