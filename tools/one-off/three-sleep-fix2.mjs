import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/70-rest.fragment.js', [
  ['read sleep', "    const oilSpoons = number(form.elements.oilSpoons.value);\n    const weight = number(form.elements.weight.value);\n    if (trainingValue === '' && oilSpoons === null && weight === null) {feedback(message, '三样都空着，没有可保存的内容。', true); return;}",
   "    const sleep = number(form.elements.sleep.value);\n    const weight = number(form.elements.weight.value);\n    if (trainingValue === '' && sleep === null && weight === null) {feedback(message, '三样都空着，没有可保存的内容。', true); return;}"],
  ['guard on sleep', "      if (trainingValue !== '' || oilSpoons !== null) {", "      if (trainingValue !== '' || sleep !== null) {"],
]);
console.log('daily three handler now uses sleep');
