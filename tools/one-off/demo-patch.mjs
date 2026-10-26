import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/40-targets.fragment.js', [
  ['lean preset anchor', '    lean:     {deficitPercent: 12, proteinPerKgMin: 2.2, proteinPerKgMax: 2.4}', '    lean:     {deficitPercent: 12, proteinPerKgMin: 2.2, proteinPerKgMax: 2.4}'],
], {dry: true});
