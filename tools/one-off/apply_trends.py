from pathlib import Path
import shutil, datetime

root = Path(r'D:\AI\health-android')
bak = root / 'backups' / ('trends-' + datetime.datetime.now().strftime('%Y%m%d-%H%M%S'))
for rel in ['app/src/main/assets/index.html', 'app/src/main/assets/app.js', 'app/src/main/assets/styles.css']:
    dest = bak / rel; dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(root / rel, dest)

html = root / 'app/src/main/assets/index.html'
s = html.read_text(encoding='utf-8')
old_range = '<select id="trend-range"><option value="30">最近 30 天</option><option value="90">最近 90 天</option><option value="all">全部记录</option></select>'
new_range = '<select id="trend-range"><option value="7">最近 7 天</option><option value="30" selected>最近 30 天</option><option value="90">最近 90 天</option><option value="all">全部记录</option></select>'
assert s.count(old_range) == 1, 'trend range option markup changed'
s = s.replace(old_range, new_range)

old_footer = '<p>所有信息仅供日常记录参考，不能替代医疗诊断与专业指导。</p></footer>'
new_footer = ('<p>所有信息仅供日常记录参考，不能替代医疗诊断与专业指导。</p>'
              '<p class="page-author">作者：散尘 · 邮箱：<a href="mailto:877638452@qq.com">877638452@qq.com</a></p></footer>')
assert s.count(old_footer) == 1, 'profile footer markup changed'
s = s.replace(old_footer, new_footer)
html.write_text(s, encoding='utf-8')

js = root / 'app/src/main/assets/app.js'
s = js.read_text(encoding='utf-8')

old_geo = 'const W=740,H=260,L=47,R=25,T=20,B=42,plotW=W-L-R,plotH=H-T-B;'
assert s.count(old_geo) == 1, 'chart geometry line changed'
s = s.replace(old_geo, '// View-box sized close to the rendered phone width so axis text stays legible after scaling.\n    const W=330,H=215,L=46,R=16,T=18,B=36,plotW=W-L-R,plotH=H-T-B;')

old_grid = '<text class="chart-text" x="${L-10}" y="${py+4}" text-anchor="end">'
assert s.count(old_grid) == 1, 'axis label markup changed'
s = s.replace(old_grid, '<text class="chart-text" x="${L-8}" y="${py+4.5}" text-anchor="end">')

old_labels = 'const labels = end===start ? `<text class="chart-text" x="${x(first.date)}" y="${H-13}" text-anchor="middle">${esc(first.date)}</text>` : `<text class="chart-text" x="${L}" y="${H-13}" text-anchor="start">${esc(first.date)}</text><text class="chart-text" x="${W-R}" y="${H-13}" text-anchor="end">${esc(last.date)}</text>`;'
assert s.count(old_labels) == 1, 'date label markup changed'
new_labels = ('const labels = end===start ? `<text class="chart-text" x="${x(first.date)}" y="${H-10}" text-anchor="middle">${esc(first.date)}</text>` '
              ': `<text class="chart-text" x="${L}" y="${H-10}" text-anchor="start">${esc(first.date)}</text><text class="chart-text" x="${W-R}" y="${H-10}" text-anchor="end">${esc(last.date)}</text>`;\n'
              '    // Few points are readable individually; many would collide, so only label short ranges.\n'
              '    const values = points.length<=7 ? points.map((item,i) => `<text class="chart-value" x="${coords[i][0]}" y="${coords[i][1]-12}" text-anchor="middle">${fmt(item.weight)}</text>`).join(\'\') : \'\';')
s = s.replace(old_labels, new_labels)

old_svg = '<circle class="chart-point" cx="${coords[i][0]}" cy="${coords[i][1]}" r="4">'
assert s.count(old_svg) == 1, 'point markup changed'
s = s.replace(old_svg, '<circle class="chart-point" cx="${coords[i][0]}" cy="${coords[i][1]}" r="5">')

old_tail = ').join(\'\')}${labels}</svg>`;'
assert s.count(old_tail) == 1, 'svg tail changed'
s = s.replace(old_tail, ').join(\'\')}${values}${labels}</svg>`;')

js.write_text(s, encoding='utf-8')

css = root / 'app/src/main/assets/styles.css'
s = css.read_text(encoding='utf-8')

pairs = [
    ('.chart-wrap{width:100%;overflow:hidden;min-height:180px}',
     '.chart-wrap{width:100%;overflow:hidden;min-height:180px;max-width:560px;margin:0 auto}'),
    ('.chart-text{fill:#7c897f;font-size:10px}',
     '.chart-text{fill:#67766c;font-size:13px;font-weight:600}.chart-value{fill:#3f6b53;font-size:12px;font-weight:650}'),
    ('.chart-line{stroke:#71937b;stroke-width:2.5;',
     '.chart-line{stroke:#71937b;stroke-width:3;'),
    ('.chart-point{fill:#fffefa;stroke:#71937b;stroke-width:2.5}',
     '.chart-point{fill:#fffefa;stroke:#71937b;stroke-width:3}'),
]
for old, new in pairs:
    assert s.count(old) == 1, 'missing CSS rule: ' + old[:40]
    s = s.replace(old, new)
s = s.rstrip() + '\n.page-footer .page-author{margin-top:8px;font-size:11.5px;color:var(--muted)}.page-footer .page-author a{color:var(--mint-dark);text-decoration:none;border-bottom:1px solid #cfe0d2}\n'
css.write_text(s, encoding='utf-8')

print('BACKUP:', bak)
print('Added author footer, 7-day range, larger legible axes and short-range value labels.')
