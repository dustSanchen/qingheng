import fs from 'node:fs';
const f='tools/device.mjs';
let t=fs.readFileSync(f,'utf8');
// Spawning node just to sleep is wasteful; Atomics.wait blocks synchronously with no child process.
t=t.replace("const adb = (args, options = {}) =>", "const sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);\n\nconst adb = (args, options = {}) =>");
t=t.replace("      execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},500)']);", "      sleep(500);");
t=t.replace("    execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},7000)']);", "    sleep(7000);");
fs.writeFileSync(f,t);
console.log('sleeps no longer spawn a process');
