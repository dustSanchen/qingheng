/**
 * The profile page uses a <select id="profile-goal">, not the onboarding radio cards, so 薄肌 was
 * unreachable from the page the user actually edits. Add the option there too.
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/main/assets/index.html', [
  [
    'lean option in the profile select',
    '<label>饮食目标<select name="goal" id="profile-goal"><option value="gain">增肌</option><option value="cut">减脂</option><option value="recomp">增肌同时减脂</option><option value="maintain">保持身材</option></select></label>',
    '<label>饮食目标<select name="goal" id="profile-goal"><option value="gain">增肌</option><option value="cut">减脂</option><option value="recomp">增肌同时减脂</option><option value="lean">薄肌（线条）</option><option value="maintain">保持身材</option></select></label>',
  ],
]);

console.log('profile goal select now offers 薄肌');
