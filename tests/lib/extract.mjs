/**
 * 从拼接产物 / 片段里按名称取源码，供各套件在 vm / new Function 里跑真实函数。
 *
 * 为什么不用「startMarker → endMarker」切片：函数一换文件或换相邻函数，标记就失效，
 * 而且不同文件里会出现同名片段（`const postpone`、`generateWeekPlan({` 都中过招）。
 * 这里按「函数名 + 逐行编译校验」取整段：模板字符串里的 `}` 不会打乱边界。
 */

export function functionSource(source, name) {
  // async 函数要把 async 一起切进来，否则拿到的片段单独编译会报
  // 「await is only valid in async functions」。
  let marker = 'async function ' + name + '(';
  let start = source.indexOf(marker);
  if (start < 0) { marker = 'function ' + name + '('; start = source.indexOf(marker); }
  if (start < 0) throw new Error('missing function ' + name);
  let end = source.indexOf('\n  }', start);
  while (end >= 0) {
    const text = source.slice(start, end + 4);
    try {
      new Function(text);
      return text;
    } catch {
      end = source.indexOf('\n  }', end + 4);
    }
  }
  throw new Error('unterminated function ' + name);
}

/** 单行 const/let 声明（例如 `const ACWR_HIGH = 1.5;`）。 */
export function constLine(source, name) {
  const re = new RegExp('^\\s{0,2}(?:const|let)\\s+' + name + '\\s*=.*$', 'm');
  const hit = re.exec(source);
  if (!hit) throw new Error('missing const ' + name);
  return hit[0];
}

/** 多行 const（数组 / 对象 / 正则），按括号配平取到语句结尾。 */
export function constSource(source, name) {
  const re = new RegExp('^ {0,2}(?:const|let)\\s+' + name + '\\s*=', 'm');
  const line = re.exec(source);
  if (!line) throw new Error('missing const ' + name);
  const start = line.index;
  let depth = 0, end = -1;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if ('{[('.includes(ch)) depth++;
    else if ('}])'.includes(ch)) depth--;
    if (depth <= 0 && ch === ';') { end = i + 1; break; }
  }
  if (end < 0) throw new Error('unterminated const ' + name);
  return source.slice(start, end);
}
