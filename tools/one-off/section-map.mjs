import fs from 'node:fs';

/** 输出每个 section 的起止位置与内部 div 平衡，用于「改前 / 改后」对比。 */
export function sectionMap(file) {
  const html = fs.readFileSync(file, 'utf8');
  const opens = [...html.matchAll(/<section\b[^>]*>/g)];
  const map = {};
  opens.forEach((m, i) => {
    const start = m.index;
    const end = i + 1 < opens.length ? opens[i + 1].index : html.length;
    const block = html.slice(start, end);
    const id = (m[0].match(/id="([^"]+)"/) || [])[1] || '(no id)';
    map[id] = {
      start,
      length: end - start,
      div: (block.match(/<div\b/g) || []).length - (block.match(/<\/div>/g) || []).length,
      article: (block.match(/<article\b/g) || []).length
    };
  });
  return map;
}

if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').replace(/^.*?\/tools/, '/tools'))) {
  const map = sectionMap(process.argv[2] || 'app/src/main/assets/index.html');
  for (const [id, info] of Object.entries(map)) {
    console.log(id.padEnd(18), 'len=' + String(info.length).padStart(6), 'div-balance=' + info.div, 'articles=' + info.article);
  }
}
