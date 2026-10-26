import fs from 'node:fs';
let t=fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
// Search results are model-visible text too: a JSON null title must not become the word "null".
const pairs=[
 ['String text = row.optString("title", "") + " " + row.optString("snippet", "");',
  'String text = ChatCompletion.text(row, "title") + " " + ChatCompletion.text(row, "snippet");'],
 ['refs.append("\\n").append(i + 1).append(". ").append(row.optString("title")).append("\\uff08").append(row.optString("source")).append("\\uff09 ").append(row.optString("url"));',
  'refs.append("\\n").append(i + 1).append(". ").append(ChatCompletion.text(row, "title")).append("\\uff08").append(ChatCompletion.text(row, "source")).append("\\uff09 ").append(ChatCompletion.text(row, "url"));'],
 ['sources.put(new JSONObject().put("title", row.optString("title")).put("url", row.optString("url")).put("source", row.optString("source")));',
  'sources.put(new JSONObject().put("title", ChatCompletion.text(row, "title")).put("url", ChatCompletion.text(row, "url")).put("source", ChatCompletion.text(row, "source")));'],
];
for(const [from,to] of pairs){
  const n=t.split(from).length-1;
  if(n===0 && t.includes(to)) continue;
  if(n!==1) throw new Error(`anchor ${n}x -> ${from.slice(0,60)}`);
  t=t.replace(from,to);
}
fs.writeFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', t);
console.log('search-result nulls hardened');
