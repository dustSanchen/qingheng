import fs from 'node:fs';
const f='tools/one-off/add-daily-advice-and-training-window.mjs';
let t=fs.readFileSync(f,'utf8');
t=t.replace("    `<button class=\"button primary full-width\" type=\"submit\">提问`,\n    `<div class=\"button-row\" id=\"chat-chips\" aria-label=\"常用问题\"></div><button class=\"button primary full-width\" type=\"submit\">提问`,",
            "    `</details><label>你的问题<textarea id=\"chat-question\"`,\n    `</details><div class=\"button-row\" id=\"chat-chips\" aria-label=\"常用问题\"></div><label>你的问题<textarea id=\"chat-question\"`,");
fs.writeFileSync(f,t);
console.log('chat chips anchor switched to the question label');
