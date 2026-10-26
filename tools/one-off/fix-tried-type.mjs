import fs from 'node:fs';
const f='app/src/main/java/cn/qingheng/health/MainActivity.java';
let t=fs.readFileSync(f,'utf8');
const pairs=[
  ['        JSONObject tried = new JSONArray();','        JSONArray tried = new JSONArray();'],
  ['        for (int i = 0; i < queries.length() && i < 3; i++) {\n            String q = queries.optString(i, "").trim();\n            if (q.isEmpty()) continue;\n            JSONObject one = WebSearch.search(q);',
   '        for (int i = 0; i < queries.length() && i < 3; i++) {\n            String q = queries.optString(i, "").trim();\n            if (q.isEmpty()) continue;\n            JSONObject one = WebSearch.search(q);'],
];
for (const [from,to] of pairs){ const n=t.split(from).length-1; if(n===1) t=t.replace(from,to); }
fs.writeFileSync(f,t);
console.log('tried array type fixed');
