import fs from 'node:fs';
const app = fs.readFileSync('app/src/main/assets/app.js','utf8');
const html = fs.readFileSync('app/src/main/assets/index.html','utf8');
console.log('autofocus refs:', (app.match(/autofocus/g)||[]).length);
const longOnes = ['记录热量不等于实际全部摄入','训练、睡眠、体重 —— 每天 30 秒','记下今天练了什么：动作','昨天或最近吃过的同一餐','拍照后会先在手机本地压缩','逐项检查并修改克重','拍摄时间不等于进餐日期','尽量在相近条件下测量','我先用你本机记录的数据直接回答','这里只是预览，不会发送任何内容','连线只连接已测量点','BMI 仅用于一般参考','MNI','测算依据 Mifflin','下面这组阈值','无需登录，记录离线保存在手机','DeepSeek 的 deepseek-flash 同时支持'];
for (const s of longOnes) console.log((html.includes(s) ? 'STILL ' : 'gone  ') + s.slice(0, 18));
