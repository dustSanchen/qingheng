import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/70-rest.fragment.js', [
  ['install skin picker before render',
   "  switchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});",
   "  installSkinPicker();\n  switchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});"],
]);
console.log('boot hook added');
