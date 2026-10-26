/**
 * Two exact-count assertions changed with this round:
 *  - the training window adds one more localStorage key (its consent),
 *  - the today-advice list reuses the same row markup, so there are four row builders now.
 */
import {patch} from '../lib/patch.mjs';

patch('tests/meal-date-context.test.mjs', [
  [
    'row builder count',
    `assert.equal((app.match(/class="meal-row list-row"/g) || []).length, 3, 'today, records and push history all use it');`,
    `assert.equal((app.match(/class="meal-row list-row"/g) || []).length, 4, 'today, records, push history and today-advice all use it');`,
  ],
]);

patch('tests/adapter.test.mjs', [
  [
    'localStorage key list',
    `['qingheng.tab','qingheng.tab','qingheng.chat.web'`,
    `['qingheng.tab','qingheng.tab','qingheng.chat.web','qingheng.training.consent'`,
  ],
]);

console.log('count assertions updated');
