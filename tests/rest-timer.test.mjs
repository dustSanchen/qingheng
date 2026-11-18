/**
 * 2026-11-18：组间休息到点要有提示音（合成，不打包音频文件），休息时长按动作与目标不同。
 */
import fs from 'node:fs';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const doc = fs.readFileSync('docs/design/27-evidence-requirements.md', 'utf8');

// --- 音效：合成器两枚短音，不依赖音频文件 --------------------------------------------------
check('a chime function exists', app.includes('function playRestChime()'));
check('it uses the Web Audio API, not an mp3', app.includes('window.AudioContext || window.webkitAudioContext') && !/rest.*\.(mp3|wav|ogg)/i.test(app));
check('the chime is two tones', app.includes('[[1318.5, 0], [1760, 0.15]]'));
check('it is primed on a user gesture so autoplay does not silence it', app.includes('function primeRestAudio()') && app.includes('primeRestAudio();'));
check('the prime happens when the timer starts', /function startRestTimer\([\s\S]{0,400}primeRestAudio\(\)/.test(app));
check('it plays exactly once when the clock hits zero', /if \(!left\) \{[\s\S]{0,160}playRestChime\(\);/.test(app));
check('a vibration rides along when supported', app.includes('navigator.vibrate(120)'));
check('it stays silent when audio is unavailable', app.includes('} catch { return null; }') && app.includes('} catch { return false; }'));

// --- 时长按动作与目标：复合 / 孤立 / 自重 / 有氧 ------------------------------------------
check('rest length is a function of the movement', app.includes('function restSecondsFor(name)'));
check('cardio gets no rest timer', app.includes('if (typeof isCardioName === \'function\' && isCardioName(name)) return 0;'));
check('compound lifts rest longer', app.includes('return longGoal ? 150 : 120;'));
check('bodyweight sits in the middle', app.includes('return longGoal ? 90 : 75;'));
check('isolation is the shortest', app.includes('return longGoal ? 90 : 60;'));
check('a gain/maintain goal uses the long tier', app.includes("const longGoal = goal === 'gain' || goal === 'maintain';"));
check('the timer takes seconds, not a hardcoded 90', app.includes('function startRestTimer(restart = false, seconds = REST_SECONDS)'));
check('restEnd follows the given length', app.includes('restEnd = Date.now() + length * 1000;'));
check('the pill label follows the start time', app.includes('`开始 ${restLength} 秒组间休息`'));
check('the ring progress follows the given length', app.includes('1 - left / Math.max(1, restLength)'));
check('marking a set starts the matching rest', app.includes("startRestTimer(true, restSecondsFor(name))"));
check('the row name is read before starting', app.includes("const name = row ? String($('[data-exercise=\"name\"]', row)?.value || '') : '';"));
check('compound and isolation are classified', app.includes('function isCompoundMove(name)') && app.includes('const ISOLATION_MOVES'));
check('isolation is excluded from compound', app.includes('if (ISOLATION_MOVES.test(text)) return false;'));
check('the pill still exists', html.includes('id="rest-timer"') && app.includes('function installRestDock()'));

// --- 行为：用假 AudioContext 跑一次，确认真的排了两个音、不是空函数 --------------------------
function grab(startMarker, endMarkers) {
  const start = app.indexOf(startMarker);
  if (start < 0) throw new Error('missing ' + startMarker);
  let end = app.length;
  for (const marker of endMarkers) {
    const i = app.indexOf(marker, start);
    if (i >= 0 && i < end) end = i;
  }
  return app.slice(start, end);
}
const audioSource = grab('let restAudio = null;', ['function syncRestDock(']) + '\nreturn {primeRestAudio, playRestChime};';
const madeOsc = [], madeGain = [], vibrations = [];
class FakeGain {
  constructor() { this.gain = {setValueAtTime() {}, exponentialRampToValueAtTime() {}}; madeGain.push(this); }
  connect(target) { return target || this; }
}
class FakeOsc {
  constructor() { this.type = ''; this.frequency = {setValueAtTime() {}}; madeOsc.push(this); }
  connect() {}
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
const fakeCtx = {currentTime: 5, state: 'running', destination: {}, createGain: () => new FakeGain(), createOscillator: () => new FakeOsc(), resume: () => Promise.resolve()};
const audioApi = new Function('window', 'navigator', audioSource)(
  {AudioContext: function () { return fakeCtx; }},
  {vibrate: ms => vibrations.push(ms)}
);
const played = audioApi.playRestChime();
check('the chime really schedules two tones', played === true && madeOsc.length === 2, `${played}/${madeOsc.length}`);
check('both tones are sine', madeOsc.every(osc => osc.type === 'sine'));
check('each tone starts and stops', madeOsc.every(osc => osc.started && osc.stopped));
check('a master gain ramps the envelope', madeGain.length >= 3);
check('it also vibrates once', vibrations.length === 1 && vibrations[0] === 120);
check('a missing AudioContext is a no-op, not a throw', (() => {
  const api = new Function('window', 'navigator', audioSource)({}, {});
  return api.playRestChime() === false;
})());

// --- 文档与证据 ---------------------------------------------------------------------------------
check('the doc records the rest ranges', doc.includes('## 4. 组间休息'));
check('the doc cites the rest-interval review', doc.includes('s40279-017-0788-x'));
check('the doc maps movement class to seconds', doc.includes('复合（卧推、深蹲、硬拉、划船、推举、引体、腿举…）') && doc.includes('| 150 s | 120 s |') && doc.includes('| 90 s | 60 s |'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
