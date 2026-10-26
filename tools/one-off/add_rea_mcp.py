from pathlib import Path
import shutil, datetime, sys

P = Path(r'C:\Users\admin\.dsh\profiles\desktop\cordis.patch.yml')
NODE = r'C:\Program Files\nodejs\node.exe'
SCRIPT = r'C:\Users\admin\AppData\Roaming\npm\node_modules\rea-agents\scripts\rea.mjs'

for p in (NODE, SCRIPT):
    assert Path(p).exists(), 'missing prerequisite: ' + p

stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
bak = P.with_name(P.name + '.bak-rea-' + stamp)
shutil.copy2(P, bak)
print('BACKUP:', bak)

s = P.read_text(encoding='utf-8')
assert 'mcp-rea' not in s, 'an mcp-rea entry already exists; refusing to duplicate'
assert not s.startswith('\ufeff'), 'unexpected BOM'

entry = '''
# ---------------------------------------------------------------------------
# REA (Reverse Engineer Anything) MCP 桥接 — 2026-10-12 添加
#
# 用户明确授权绕过插件管理器后手工添加。使用 DSH 自带的
# @deepseek-ai/dsh-mcp-client（app.asar 内 0.2.0-rc.2，与客户端 0.2.0 配套），
# 因此不新增任何 npm 依赖。
# REA 以 stdio 方式启动，工具以 mcp__rea__<名称> 出现在模型工具列表中。
# REA 6.4.0 提供 170 个工具 + 6 个 prompt —— 这会增加每次请求的上下文开销。
# 超时放宽到 10 分钟：反编译与二进制分析通常远超默认的 60 秒。
#
# 回滚：删除本条目并重启 DSH。彻底卸载客户端：npm.cmd uninstall --global rea-agents
# 改前备份：cordis.patch.yml.bak-rea-<时间戳>
# ---------------------------------------------------------------------------
- id: mcp-rea
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: rea
    transport: stdio
    command: "%(node)s"
    args:
      - "%(script)s"
      - "mcp"
    toolCallTimeoutMs: 600000
''' % {'node': NODE.replace('\\', '\\\\'), 'script': SCRIPT.replace('\\', '\\\\')}

if not s.endswith('\n'):
    s += '\n'
P.write_text(s + entry, encoding='utf-8')
print('appended mcp-rea entry')

# ---- validate: the whole file must still parse, and the new entry must be a TOP-LEVEL item ----
try:
    import yaml
except ImportError:
    print('PyYAML unavailable; skipping parse check')
    sys.exit(0)

class Loose(yaml.SafeLoader):
    pass

# The profile legitimately uses !!js expressions; keep them as opaque strings.
Loose.add_multi_constructor('!', lambda loader, suffix, node: '!!js ' + str(node.value)[:120])

doc = yaml.load(P.read_text(encoding='utf-8'), Loader=Loose)
assert isinstance(doc, list), 'top level must be a list'
ids = [item.get('id') for item in doc if isinstance(item, dict)]
print('top-level entries:', len(doc))
last = doc[-1]
assert isinstance(last, dict) and last.get('id') == 'mcp-rea', 'mcp-rea is not the last top-level entry'
assert last.get('name') == '@deepseek-ai/dsh-mcp-client'
cfg = last.get('config') or {}
assert cfg.get('serverName') == 'rea' and cfg.get('transport') == 'stdio'
assert cfg.get('command').endswith('node.exe')
assert cfg.get('args') == [SCRIPT, 'mcp']
assert 'mcp-rea' not in ids[:-1], 'duplicate id'
print('VALIDATED: parses cleanly; mcp-rea is a top-level entry with a well-formed config')
print('entry ids after change:', ids[-4:])
