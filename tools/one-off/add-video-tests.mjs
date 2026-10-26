import fs from 'node:fs';
let t = fs.readFileSync('tests/training-library.test.mjs','utf8');
t = t.replace("check('every source is in the priority list', lib.sources.every(s => lib.priority.includes(s.id)));",
`check('every source is in the priority list', lib.sources.every(s => lib.priority.includes(s.id)));
const withVideo = lib.rules.filter(r => r.video);
check('most rules cite a video', withVideo.length >= 15, String(withVideo.length));
check('video refs look like bvids', withVideo.every(r => /^BV[0-9A-Za-z]{10}$/.test(r.video.bvid)), JSON.stringify(withVideo.slice(0, 2).map(r => r.video.bvid)));
check('video refs carry a duration', withVideo.every(r => Number(r.video.seconds) > 0));
check('digest includes the video reference', app.includes("'（视频 ' + rule.video.bvid"));
check('the prompt asks for the BV number', (function(){const p=fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java','utf8'); return p.includes('BV 号与时长')})());`);
fs.writeFileSync('tests/training-library.test.mjs', t);
console.log('video assertions added');
