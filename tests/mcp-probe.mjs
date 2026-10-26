// Speak MCP over stdio to REA exactly as the DSH mcp-client will, and measure the
// tool-catalog payload that would be added to every model request.
import { spawn } from 'node:child_process';

const [nodeExe, script] = process.argv.slice(2);
const child = spawn(nodeExe, [script, 'mcp'], { stdio: ['pipe', 'pipe', 'pipe'] });

let buffer = '';
const replies = new Map();
child.stdout.on('data', chunk => {
  buffer += chunk.toString('utf8');
  let index;
  while ((index = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined) replies.set(msg.id, msg);
    } catch { /* not a JSON line; ignore */ }
  }
});
let stderr = '';
child.stderr.on('data', d => { stderr += d.toString('utf8').slice(0, 400); });

const send = obj => child.stdin.write(JSON.stringify(obj) + '\n');
const waitFor = async (id, ms) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (replies.has(id)) return replies.get(id);
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
};

const fail = m => { console.error(m); child.kill(); process.exit(2); };

send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
  protocolVersion: '2025-11-25',
  capabilities: {},
  clientInfo: { name: 'dsh-preflight', version: '1.0.0' },
} });
const init = await waitFor(1, 60000);
if (!init) fail('no initialize response within 60s' + (stderr ? '\nstderr: ' + stderr : ''));
console.log('server:', init.result?.serverInfo?.name, init.result?.serverInfo?.version,
  '| protocol:', init.result?.protocolVersion);

send({ jsonrpc: '2.0', method: 'notifications/initialized' });
send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
const list = await waitFor(2, 90000);
if (!list) fail('no tools/list response within 90s');
const tools = list.result?.tools || [];

const catalog = JSON.stringify(tools);
// Rough but useful: English/JSON text runs about 4 characters per token.
console.log('tools:', tools.length);
console.log('catalog bytes:', catalog.length, '| approx tokens:', Math.round(catalog.length / 4));
const biggest = tools.map(t => ({ name: t.name, bytes: JSON.stringify(t).length }))
  .sort((a, b) => b.bytes - a.bytes).slice(0, 5);
console.log('largest tool definitions:');
for (const t of biggest) console.log('  ', t.name, t.bytes, 'bytes');
console.log('sample names:', tools.slice(0, 6).map(t => 'mcp__rea__' + t.name).join(', '));

child.kill();
