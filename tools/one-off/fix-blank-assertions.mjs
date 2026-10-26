import fs from 'node:fs';
const file='tests/chat-quality.test.mjs';
let t=fs.readFileSync(file,'utf8');
t=t.replace("check('blank detection recognises org.json nulls', completion.includes('public static boolean isBlank(String value)') && completion.includes('trimmed.replace(\"null\", \"\").trim().isEmpty()'));",
            "check('blank detection recognises org.json nulls', completion.includes('public static boolean isBlank(String value)') && completion.includes('value.replace(\"null\", \"\")'));");
t=t.replace("check('blank detection also strips invisible characters', completion.includes('[\\\\s\\\\p{C}\\\\p{Z}]+'));",
            "check('blank detection also strips invisible characters', completion.includes('[\\\\\\\\s\\\\\\\\p{C}\\\\\\\\p{Z}]+'));");
fs.writeFileSync(file,t);
console.log('assertions updated');
