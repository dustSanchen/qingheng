import fs from 'node:fs';
let t = fs.readFileSync('tests/training-draft.test.mjs','utf8');
const from = "const parse = new Function('return ' + source)();";
const to = "const movesStart = app.indexOf('const DRAFT_MOVES = [');\nconst movesEnd = app.indexOf('];', movesStart) + 2;\nconst movesSource = app.slice(movesStart, movesEnd);\nconst parse = new Function(movesSource + '\\nreturn ' + source)();";
if (!t.includes(from)) throw new Error('anchor missing');
fs.writeFileSync('tests/training-draft.test.mjs', t.replace(from, to));
console.log('test evaluates the moves table too');
