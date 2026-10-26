from pathlib import Path
import shutil
r=Path(r'D:\AI\health-android');assets=r/'app/src/main/assets'
# aapt2 on Windows writes asset sub-directory entries with a backslash, which Android's
# AssetManager cannot look up. Keep every web asset flat in assets/.
for name in ['camera','gallery']:
    src=assets/'icons'/(name+'.svg');dst=assets/('icon-'+name+'.svg')
    shutil.copy2(src,dst);print('flattened ->',dst.name)
p=assets/'index.html';s=p.read_text(encoding='utf-8')
s=s.replace('./icons/camera.svg','./icon-camera.svg').replace('./icons/gallery.svg','./icon-gallery.svg')
p.write_text(s,encoding='utf-8')
shutil.rmtree(assets/'icons')
left=[d.name for d in assets.iterdir() if d.is_dir()]
print('remaining asset sub-directories:',left or 'none')
assert not left,'web assets must stay flat'
