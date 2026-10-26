from pathlib import Path
import subprocess,xml.etree.ElementTree as ET,re
root=Path(r'D:\AI\health-android');adb=str(root/'toolchain/platform-tools/adb.exe')
def run(*args):
 p=subprocess.run([adb,*args],capture_output=True,text=True,encoding='utf-8',errors='replace')
 if p.returncode: raise RuntimeError('ADB command failed: '+args[0])
 return p.stdout

def front():
 x=run('shell','dumpsys','window');m=re.search(r'mCurrentFocus=.*',x);return m.group(0) if m else ''
def nodes():
 run('shell','uiautomator','dump','/sdcard/qh-diag.xml')
 run('pull','/sdcard/qh-diag.xml',str(root/'artifacts/device/diag-ui.xml'))
 return list(ET.parse(root/'artifacts/device/diag-ui.xml').getroot().iter('node'))
def center(n):
 nums=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
 if len(nums)!=4 or nums[3]-nums[1]<5 or nums[3]>2320:return None
 return ((nums[0]+nums[2])//2,(nums[1]+nums[3])//2)
if 'cn.qingheng.health/' not in front():raise RuntimeError('App is not foreground; no clicks sent')
run('shell','input','tap','1002','2412')
found=None
for i in range(9):
 if 'cn.qingheng.health/' not in front():raise RuntimeError('Foreground changed; stopped')
 for n in nodes():
  if n.get('text')=='检查已保存的连接' and center(n):found=center(n);break
 if found:break
 run('shell','input','swipe','1050','1900','1050','650','350')
if not found:raise RuntimeError('Connection button not visible after bounded scrolling; no request sent')
run('shell','input','tap',str(found[0]),str(found[1]))
confirmed=False
for n in nodes():
 if n.get('text') in ('确定','继续','OK') and n.get('package')=='cn.qingheng.health':
  c=center(n)
  if c:
   run('shell','input','tap',str(c[0]),str(c[1]));confirmed=True;break
print('Connection request consent confirmed:',confirmed)
print('No health/image payload; diagnostic result will be inspected separately.')
