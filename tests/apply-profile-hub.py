import re, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

html_path = pathlib.Path(r"D:\AI\health-android\app\src\main\assets\index.html")
s = html_path.read_text(encoding="utf-8")
TAG = re.compile(r'<(/?)(article|div|footer|section)\b[^>]*>')

def close_index(html, open_at):
    depth, pos = 0, open_at
    while True:
        m = TAG.search(html, pos)
        if not m:
            raise SystemExit('unbalanced markup')
        depth += 1 if m.group(1) == '' else -1
        if depth == 0:
            return m.end()
        pos = m.end()

def depth0_blocks(fragment):
    blocks, depth, start, pos = [], 0, 0, 0
    while True:
        m = TAG.search(fragment, pos)
        if not m:
            break
        if m.group(1) == '':
            if depth == 0:
                start = m.start()
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                blocks.append(fragment[start:m.end()])
        pos = m.end()
    return blocks

sec_start = s.index('<section id="view-profile"')
sec_end = s.index('</section>', sec_start) + len('</section>')
section = s[sec_start:sec_end]

head_open = section.index('<div class="page-heading">')
head_end = close_index(section, head_open)
heading = section[head_open:head_end]

grid_open = section.index('<div class="profile-grid">')
grid_end = close_index(section, grid_open)
grid_inner = section[grid_open + len('<div class="profile-grid">'): grid_end - len('</div>')]
grid_blocks = depth0_blocks(grid_inner)
assert len(grid_blocks) == 2, len(grid_blocks)
card_targets = grid_blocks[0]
stack = grid_blocks[1]
stack_inner = stack[stack.index('>') + 1: stack.rindex('<')]
stack_blocks = depth0_blocks(stack_inner)
assert len(stack_blocks) == 4, len(stack_blocks)
card_model, card_history, card_push, card_data = stack_blocks
footer_open = section.index('<footer class="page-footer">')
footer_end = close_index(section, footer_open)
footer = section[footer_open:footer_end]

def sub_head(title, eyebrow):
    return ('<div class="subpage-head"><button type="button" class="icon-button subtle subpage-back" data-subpage-back aria-label="返回我的">'
            '<span class="inline-icon" aria-hidden="true"><img src="./icon-nav-back.svg" alt="" width="19" height="19"></span></button>'
            f'<div><p class="eyebrow">{eyebrow}</p><h2 class="subpage-title">{title}</h2></div></div>')

def hub_row(sub, icon, title, summary, summary_id):
    return ('<button type="button" class="hub-row" role="listitem" data-subpage-open="' + sub + '">'
            '<span class="hub-icon" aria-hidden="true"><img src="./' + icon + '" alt="" width="22" height="22"></span>'
            '<span class="hub-text"><span class="hub-title">' + title + '</span>'
            '<span class="hub-summary" id="' + summary_id + '">' + summary + '</span></span>'
            '<span class="hub-arrow" aria-hidden="true">›</span></button>')

about_card = (
    '<article class="card"><div class="card-heading"><h2>关于轻衡</h2><span class="tag" id="about-version">—</span></div>'
    '<p class="fine-print">轻衡是一个个人健康记录工具：记录、趋势、本地估算与本地建议都能离线使用。'
    '只有在你勾选同意并点击时，才会把当次需要的数字发送给你自己配置的模型服务商。'
    '本应用不提供诊断或处方，任何结论都应以你自己的记录与专业意见为准。</p>'
    '<h3>本机存储</h3>'
    '<p class="fine-print" id="storage-status" role="status" aria-live="polite">正在读取存储状态…</p>'
    '<div class="button-row"><button type="button" class="button subtle" id="storage-refresh">刷新存储状态</button>'
    '<button type="button" class="button subtle" id="storage-remirror">立即镜像到 SQLite</button></div>'
    '<p class="fine-print">记录以 JSON（state.json）为唯一权威来源；SQLite 目前只是同步镜像，用于一致性校验与后续迁移。'
    '两者不一致时以 JSON 为准，点「立即镜像」即可重建。</p></article>'
)

hub = ('<div class="hub" id="profile-hub" role="list">'
       + hub_row('targets', 'icon-nav-profile.svg', '健康档案与目标', '正在读取…', 'hub-summary-targets')
       + hub_row('model', 'icon-sparkle.svg', '模型连接', '正在读取…', 'hub-summary-model')
       + hub_row('push', 'icon-tip.svg', '每日推送与建议', '正在读取…', 'hub-summary-push')
       + hub_row('data', 'icon-copy.svg', '数据管理', '导出、导入与手表同步', 'hub-summary-data')
       + hub_row('about', 'icon-check.svg', '关于轻衡', '版本与本机存储', 'hub-summary-about')
       + footer + '</div>')

subpages = (
    '<div class="subpage" id="subpage-targets" hidden>' + sub_head('健康档案与目标', 'PROFILE') + card_targets + '</div>'
    '<div class="subpage" id="subpage-model" hidden>' + sub_head('模型连接', 'MODEL') + card_model + '</div>'
    '<div class="subpage" id="subpage-push" hidden>' + sub_head('每日推送与建议', 'PUSH') + card_history + card_push + '</div>'
    '<div class="subpage" id="subpage-data" hidden>' + sub_head('数据管理', 'DATA') + card_data + '</div>'
    '<div class="subpage" id="subpage-about" hidden>' + sub_head('关于轻衡', 'ABOUT') + about_card + '</div>'
)

new_section = ('<section id="view-profile" class="view" aria-labelledby="profile-title" hidden>'
               + heading + hub + subpages + '</section>')
assert s.count(section) == 1
s = s.replace(section, new_section)
html_path.write_text(s, encoding='utf-8')
print('index.html patched: hub + 5 sub-pages')
for probe in ['profile-form', 'profile-goal', 'recalc-target', 'settings-form', 'api-provider', 'push-form',
              'push-history', 'export-data', 'export-markdown', 'import-data', 'data-feedback',
              'restart-onboarding', 'page-footer', 'subpage-about', 'storage-status']:
    assert probe in s, probe
    print('  kept:', probe)
print('subpage blocks:', s.count('class="subpage"'), 'hub rows:', s.count('data-subpage-open='))
