/**
 * P0-2 changed the de-duplication semantics on purpose: the gap rule now only applies once something
 * was actually posted today, because on a silent day it produced no advice at all. These two
 * assertions follow the new rule and gain one that proves the guard exists.
 */
import {patch} from '../lib/patch.mjs';

patch('tests/meal-date-java.test.mjs', [
  [
    'catch-up assertion',
    `check('catch-up is refused when the next slot is close', sched.includes('if (nextUpcomingTrigger(context) - now < MIN_GAP_MS)'));`,
    `check('catch-up is refused only after a reminder already went out today', sched.includes('postedToday(context) && nextUpcomingTrigger(context) - now < MIN_GAP_MS'));
check('a silent day still gets its catch-up reminder', sched.includes('public static boolean postedToday(Context context)') && sched.includes('KEY_LAST_POSTED_DAY'));`,
  ],
  [
    'receiver assertion',
    `check('the receiver refuses a second reminder in the same window', alarm.includes('if (AlarmScheduler.tooSoonAfterLastPost(context)) {') && alarm.includes('AlarmScheduler.markPosted(context);'));`,
    `check('the receiver refuses a second reminder only after one was posted', alarm.includes('if (AlarmScheduler.tooSoonAfterLastPost(context) && AlarmScheduler.postedToday(context)) {') && alarm.includes('AlarmScheduler.markPosted(context);'));`,
  ],
]);

console.log('de-duplication assertions updated');
