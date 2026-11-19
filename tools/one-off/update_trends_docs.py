from pathlib import Path
p = Path(r'D:\AI\health-android\README.md')
s = p.read_text(encoding='utf-8')
anchor = '## 升级不丢数据'
assert s.count(anchor) == 1
section = '''## 趋势与观察范围

「趋势」页按**真实测量日期**绘制体重曲线，不插值、不补点：

- 观察范围：**最近 7 天 / 最近 30 天 / 最近 90 天 / 全部记录**，默认 30 天
- 纵轴按当次范围自动缩放并留出余量，横轴只在首末两个真实日期打点，避免误读缺失日期
- 坐标轴数字按手机宽度重新设定，字号从 10px 提高到 13px 并加粗，点数与连线同步加粗，窄屏下也能看清
- 范围内测量点不超过 7 个时，会直接在点上标注体重数值，便于读取 7 天视图
- 曲线旁保留「最新已测体重 / 范围内首末变化 / 真实测量次数」，测量不足两次时明确显示「需至少两次测量」，不给结论

## 作者

作者：**散尘** · 邮箱：<已删除>

信息显示在「我的」页底部页脚，邮箱可点击直接发信。

'''
s = s.replace(anchor, section + anchor)
p.write_text(s, encoding='utf-8')
print('README updated with trends and author sections')
