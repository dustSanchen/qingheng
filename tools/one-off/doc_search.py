from pathlib import Path
p = Path(r'D:\AI\health-android\README.md')
s = p.read_text(encoding='utf-8')

section = """
### 按问题联网检索（Brave Search）

用户选择接入 **Brave Search API**。实现为**工具调用回路**：模型可以主动要求检索，
检索由 App 执行，结果再回传给模型，最后作答。

接口契约经三个独立来源交叉确认（Brave 官方文档站在本环境不可达，如实标注）：

| 项 | 值 | 来源 |
| --- | --- | --- |
| 端点 | `https://api.search.brave.com/res/v1/web/search` | dltHub、pub.dev `mcp_browser` 实际源码 |
| 鉴权 | 请求头 `X-Subscription-Token` | dltHub、pub.dev |
| 参数 | `q`、`count`(1–20)、`offset`、`search_lang`、`country` | pub.dev、Microsoft Learn Brave 连接器 |
| 响应 | `web.results[]` → `title` / `url` / `description` / `page_age` | Microsoft Learn、pub.dev |

来源链接：
[Brave Web Search API](https://api.search.brave.com/app/documentation/web-search/get-started)（当前不可达）、
[dltHub Brave 说明](https://dlthub.com/context/source/brave-search)、
[pub.dev BraveSearchAdapter](https://pub.dev/documentation/mcp_browser/latest/mcp_browser/BraveSearchAdapter/search.html)、
[Microsoft Learn Brave 连接器](https://learn.microsoft.com/hu-hu/connectors/bravesearch/)、
[官方 Tool Calls 指南](https://api-docs.deepseek.com/guides/tool_calls/)。

实现要点：

- **主机名硬编码**在 `BraveSearch.java`：检索密钥绝不会被发往调用方指定的地址
- Brave 密钥**单独加密存放**（`key.brave`），与模型密钥完全分开；留空保留原密钥，可显式清除
- 检索开关需**同时**具备开关与密钥才生效，缺任一项都会明确提示
- 工具回路**最多 2 轮检索**、单轮最多 3 次调用，避免失控消耗
- 未知工具名一律拒绝执行，不猜测
- 回答必须**列出所依据的来源网址**，来源会追加到回答并随问答记录保存
- 检索结果与网页正文同样按**不可信数据**处理，其中的指令一律忽略
- 「我的 → 联网检索」提供**测试检索**按钮：只调用 Brave，不消耗模型 token

费用与额度：Brave 免费档约每秒 1 次请求；额度不足、限流、密钥无效分别给出不同提示。
检索词会发送给 Brave；**不会**发送健康记录、照片或任何模型密钥。

### 验证

- `tests/web-search.test.mjs`：固定主机、独立密钥槽、同意门禁、结果条数钳制、
  HTTP 401/402/422/429 分别处理、不记录日志、工具回路有界、未知工具拒绝、来源引用规则
- `tests/verify-web-apk.mjs`：按原始字节解包 APK，确认 `BraveSearch`、
  `/api/search-settings`、`/api/search-test`、`web_search` 与中文规则文本都已打入
- **14 组测试全部通过**；构建成功

**未在真机验证**：本轮手机未连接（`adb devices` 为空），因此新版本未安装；
真实检索需要你自己在手机上填入 Brave API Key 后点「测试检索」。
"""

if '### 按问题联网检索' not in s:
    s = s.rstrip() + '\n' + section
    p.write_text(s, encoding='utf-8')
    print('README updated with the Brave search section')
else:
    print('already documented')
