const fs=require('fs');
const t=fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const i=t.indexOf('private static String chatSystemPrompt()');
const j=t.indexOf('    }', i);
console.log(JSON.stringify(t.slice(i-40, j+8)).slice(0,700));
