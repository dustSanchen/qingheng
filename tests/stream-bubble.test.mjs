/**
 * Behavioural test for the streaming bubble: runs the shipped beginChatStream / pushChatThinking /
 * pushChatStream / endChatStream against a minimal fake DOM.
 *
 * Worth doing at this level because the interesting behaviour is a sequence: thinking arrives first,
 * then collapses to a one-line summary the moment the answer starts, and the two streams must never
 * mix — exactly the bug class that produced "nullnull…" answers before.
 */
import fs from 'node:fs';
import vm from 'node:vm';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const source = fs.readFileSync('app/src/fragments/10-rich-answer.fragment.js', 'utf8').replace(/\r\n/g, '\n');
const slice = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${startMarker} not found`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`end marker for ${startMarker} not found`);
  return source.slice(start, end);
};
const code = slice('  function beginChatStream(', '  function renderChat()');

// --- minimal fake DOM --------------------------------------------------------------------------------
const CLASS_RE = /class="([^"]+)"([^>]*)>/g;
class El {
  constructor(tag, className) {
    this.tag = tag;
    this.className = className || '';
    this.children = [];
    this.textContent = '';
    this.hidden = false;
    this.attrs = {};
    this.parentNode = null;
    this.classList = {add: name => { this.className = `${this.className} ${name}`.trim(); }};
    this._html = '';
  }
  set innerHTML(value) {
    this._html = value;
    this.children = [];
    for (const match of value.matchAll(CLASS_RE)) {
      const child = new El('span', match[1]);
      // A browser honours a bare `hidden` attribute; the fake DOM must too or the test lies.
      if (/\bhidden\b/.test(match[2] || '')) child.hidden = true;
      this.children.push(child);
    }
    if (value.includes('<strong>')) this.children.push(new El('strong'));
  }
  get innerHTML() { return this._html; }
  setAttribute(key, value) { this.attrs[key] = value; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  prepend(child) { child.parentNode = this; this.children.unshift(child); return child; }
  removeChild(child) { this.children = this.children.filter(row => row !== child); child.parentNode = null; }
  querySelector(selector) {
    if (selector === 'strong') return this.children.find(row => row.tag === 'strong') || null;
    const wanted = selector.replace(/^\./, '');
    return this.children.find(row => String(row.className).split(/\s+/).includes(wanted)) || null;
  }
}
const log = new El('div');
const sandbox = {
  document: {createElement: tag => new El(tag)},
  $: (selector, root) => selector === '#chat-log' ? log : (root ? root.querySelector(selector) : null),
  esc: value => String(value ?? ''),
  setTimeout: () => 0,
  clearTimeout: () => {},
  // 片段里用 nextFrame/cancelFrame 把逐 token 的写入合批；这里用同步桩（返回 0 表示「已在下一帧刷过」），
  // 于是每个 delta 立刻落到 DOM，测试断言看到的始终是累积后的文本。
  nextFrame: fn => {fn(); return 0;},
  cancelFrame: () => {},
  Math, String, Array, Boolean, RegExp, Number,
};
vm.createContext(sandbox);
vm.runInContext(code + '\nthis.beginChatStream = beginChatStream; this.pushChatStream = pushChatStream; this.pushChatThinking = pushChatThinking; this.endChatStream = endChatStream;', sandbox);
const {beginChatStream, pushChatStream, pushChatThinking, endChatStream} = sandbox;

// --- the sequence ------------------------------------------------------------------------------------
const box = beginChatStream('汉堡王的大皇堡多少热量', false);
check('a bubble is created and prepended', log.children.length === 1 && box.box.parentNode === log);
check('it shows the question', box.box.querySelector('strong').textContent === '汉堡王的大皇堡多少热量');
check('it starts with the thinking hint', box.body.textContent.includes('模型正在思考'));
check('the thinking block starts hidden', box.think.hidden === true);

pushChatThinking(box, '先看品牌营养表');
check('thinking becomes visible', box.think.hidden === false);
check('thinking text is shown as-is', box.think.textContent === '先看品牌营养表', box.think.textContent);
check('the hint is still the answer area', box.body.textContent.includes('模型正在思考'));

pushChatThinking(box, '，一份皇堡约 660 kcal');
check('thinking accumulates', box.think.textContent.length > 6);

pushChatStream(box, '约 660');
check('the answer starts filling the answer area', box.body.textContent === '约 660');
check('thinking collapses to a one-line summary', box.think.textContent.startsWith('已思考 ') && box.think.textContent.includes('字（点击展开）'), box.think.textContent);
check('thinking is NOT merged into the answer', !box.body.textContent.includes('品牌营养表') && !box.body.textContent.includes('已思考'));

pushChatStream(box, ' kcal（±15%）');
check('the answer accumulates', box.body.textContent === '约 660 kcal（±15%）', box.body.textContent);

pushChatThinking(box, '迟到的思考片段');
check('late thinking is ignored once the answer started', !box.think.textContent.includes('迟到的思考片段'), box.think.textContent);

endChatStream(box);
check('the bubble is removed on completion', log.children.length === 0);

// --- long reasoning is bounded -------------------------------------------------------------------------
const second = beginChatStream('测试', true);
pushChatThinking(second, 'x'.repeat(900));
check('very long thinking is truncated to the tail', second.think.textContent.length <= 601 && second.think.textContent.startsWith('…'), String(second.think.textContent.length));
endChatStream(second);
check('the log is empty again', log.children.length === 0);

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
