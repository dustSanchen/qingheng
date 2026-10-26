import fs from 'node:fs';
const f = 'app/src/main/assets/styles.css';
let css = fs.readFileSync(f, 'utf8');
if (!css.includes('.chat-day{')) {
  css += '\n/* Q&A history: search field + one date header per day. */\n' +
    '.chat-search{display:block;margin:0 0 var(--space-2)}\n' +
    '.chat-search input{width:100%}\n' +
    '.chat-day{display:flex;align-items:baseline;justify-content:space-between;gap:var(--space-2);margin:var(--space-3) 0 var(--space-1);padding-top:var(--space-2);border-top:1px solid var(--line);font-size:var(--text-sm);color:var(--muted);font-variant-numeric:tabular-nums}\n' +
    '.chat-day span{color:var(--muted);font-size:var(--text-xs)}\n' +
    '.chat-day:first-child{border-top:0;padding-top:0;margin-top:0}\n';
  fs.writeFileSync(f, css);
  console.log('ok  chat-day css');
} else console.log('already present');
