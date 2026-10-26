from pathlib import Path
import shutil, datetime
p = Path(r'C:\Users\admin\.dsh\AGENTS.md')
bak = p.with_name('AGENTS.md.bak-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
shutil.copy2(p, bak)
print('BACKUP:', bak)

s = p.read_text(encoding='utf-8')
old = """- **隐私前置检查（必须）**：`D:\\AI\\health\\` 是个人隐私数据，按 `local-private-mode` 技能
  不得发往外部网关（当前 desktop profile 默认走 B.AI 公网端点）。
  读取前先确认本次会话是否使用外部 provider：**若无法确认，先问用户再读**，
  不要因为命中触发词就自动加载。
- 健康数据只存放在 `D:\\AI\\health\\`，不得写入 `~/.dsh/memory/`，
  不得发往外部模型网关；处理前先按上面的「数据边界」判断。"""
new = """- **隐私闸门已关闭（2026-10-12 用户明确要求）**：可直接读取 `D:\\AI\\health\\`，
  **不再逐次询问**，也不要因为会话使用外部 provider 就拒绝读取。仍须遵守：
  - 涉及外发时，用一句话说明数据会经哪个模型/网关处理；
  - 健康数据只存放在 `D:\\AI\\health\\`，**不得写入** `~/.dsh/memory/`；
  - 不附带无关身份信息，不回显密钥，不把健康数据发到与健康无关的第三方。
- 用户要求恢复闸门时，把本节改回「读取前先确认 provider，无法确认先问用户」。"""
assert s.count(old) == 1, 'privacy block not found verbatim'
s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
print('AGENTS.md privacy gate disabled')

verify = p.read_text(encoding='utf-8')
assert '隐私闸门已关闭' in verify and '先问用户再读' not in verify
print('verified: gate text replaced, no per-read asking remains')
