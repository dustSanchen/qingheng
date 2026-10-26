import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('tests/onboarding-backup.test.mjs', [
  ['step four refresh is deferred, not blocking',
   "check('entering step four refreshes the states', app.includes('if (onboarding.step === 4) refreshPermissionChecklist().catch(() => {});'));",
   "check('entering step four refreshes the states', app.includes('if (onboarding.step === 4) setTimeout(() => refreshPermissionChecklist().catch(() => {}), 30);'));\ncheck('the permission refresh never blocks the step change', app.includes(\"setTimeout(() => refreshPermissionChecklist()\"));"],
]);
console.log('assertion updated');
