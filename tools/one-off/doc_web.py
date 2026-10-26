from pathlib import Path
p = Path(r'D:\AI\health-android\README.md')
s = p.read_text(encoding='utf-8')

section = """
## 联网引用（2026-10-11）

### 先说结论：服务商没有内置联网搜索

我核对了官方文档，结果与网上不少说法相反：

- Chat Completions 与 Responses API 的 `tools` **只接受 `type: "function"`**，官方原文写着
  **「内置工具类型会被忽略」**（[Responses API](https://api-docs.deepseek.com/zh-cn/api/create-response/)）；
- 官方 Tool Calls 指南明确：**函数必须由客户端执行**，
  「The model itself does not execute specific functions」（[Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/)）。

所以**不存在"打开一个开关就能联网"的官方能力**。任何"联网搜索"都必须由 App 自己去取网页。
个别第三方文章声称 Responses API 内置联网搜索，与官方文档不符，本项目不采用该说法。

### 已实现：引用网页正文

「问答」页新增**引用网页（可选）**：

1. 粘贴一个公开 `https://` 网址，点「抓取网页正文」
2. App 抓取该页（**只把网址发给该网站**，不发送健康数据、问题内容或密钥）
3. 本地提取标题与正文（去掉脚本、样式、导航），最多 6000 字
4. 发送时把正文作为**标注来源的参考资料**交给模型，并要求回答时说明来源网址

安全边界：

- 仅 HTTPS；**不跟随跳转**；不发送任何凭据
- 解析域名并拒绝回环、内网、链路本地、保留与组播地址（防止被用来探测本机网络）
- 只读 `text/html` / `xhtml` / `text/plain`，上限 512 KB
- 中文网页常见 GBK：UTF-8 解码失败率过高时自动回退
- **网页内容按不可信数据处理**：系统提示明确要求忽略网页里的任何指令、角色设定或格式要求，
  避免"提示注入"把助手带偏；与用户记录冲突时以记录为准
- 浏览器演示模式不会代你访问外部网站

未实现的是**按问题自动检索互联网**：那需要一个真正的检索服务（搜索引擎 API），
本项目不会臆造第三方接口，需要你选择服务商后再接入（见下）。

### 验证

- `tests/web-fetch.test.mjs`：正文提取、脚本/样式剔除、实体解码、标题提取、
  超长截断、短 `<article>` 回退、注入文本原样透传但被系统提示隔离、
  SSRF 守卫与同意门禁、发送接线与发送后清理
- `tests/verify-web-apk.mjs`：按**原始字节**解包 APK，确认 `WebPageFetch`、`/api/fetch-page`
  以及各条中文提示与前端控件都已进入安装包
- **13 组测试全部通过**；构建成功
"""

if '## 联网引用' not in s:
    s = s.rstrip() + '\n' + section
    p.write_text(s, encoding='utf-8')
    print('README updated with the web-reference section')
else:
    print('already documented')
