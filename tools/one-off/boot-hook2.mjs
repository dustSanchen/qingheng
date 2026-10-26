import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/80-boot.fragment.js', [
  ['install skin picker before render',
   "switchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});",
   "installSkinPicker();\nswitchTab(restoreTab());render();connection();syncAnchors().catch(()=>{});"],
]);
console.log('boot hook added in 80-boot');
