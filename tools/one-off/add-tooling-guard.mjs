import { patch } from '../lib/patch.mjs';
patch('tests/ci-and-versions.test.mjs', [
  ['dev tooling guard',
   "console.log('\\nFAIL total: '",
   `check('the one-command dev loop exists', fs.existsSync('tools/dev-loop.ps1') && fs.readFileSync('tools/dev-loop.ps1', 'utf8').includes('install + smoke'));
check('the patcher library exists', fs.existsSync('tools/lib/patch.mjs'));
check('the device helper converts preview coordinates', fs.readFileSync('tools/device.mjs', 'utf8').includes('fromPreview'));
check('the tools are documented', fs.readFileSync('tools/README.md', 'utf8').includes('dev-loop.ps1'));

console.log('\\nFAIL total: '`],
]);
