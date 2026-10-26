import fs from 'node:fs';
let t=fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
// anchorInstruction is now only used by nothing: Prompts.withAnchors owns the framing.
const re=/\n    \/\*\* Appends the caller's anchor table to a system prompt, bounded and clearly framed as data\. \*\/\n    private static String anchorInstruction\(String anchors\) \{[\s\S]*?\n    \}\n/;
const m=t.match(re);
if(!m){ console.log('anchorInstruction block not found (already removed?)'); }
else if((t.match(/anchorInstruction/g)||[]).length===1){
  t=t.replace(re,'\n');
  fs.writeFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java',t);
  console.log('removed the now-unused anchorInstruction helper');
} else {
  console.log('anchorInstruction still referenced elsewhere:', (t.match(/anchorInstruction/g)||[]).length, 'occurrences');
}
