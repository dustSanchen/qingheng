import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/00-head.fragment.js', [
  ['timeout helper',
   `  function photoMeta(value) {`,
   `  /**
   * Runs a promise with a hard time limit. Used for native permission checks: a route that never
   * returns must not leave a page waiting forever, which is what a frozen wizard looks like.
   */
  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        (window.__perfLog = window.__perfLog || []).push({label: label || 'timeout', ms, at: Date.now()});
        console.info('[timeout]', label, ms);
        resolve({timeout: true});
      }, ms);
      Promise.resolve(promise).then(value => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }, error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }
  function photoMeta(value) {`],
]);
patch('app/src/fragments/20-permissions-backup.fragment.js', [
  ['permission checks cannot hang the page',
   `    try {const s = await api('/api/notification-permission'); next.notifications = s?.granted === true;} catch {}
    try {const p = await api('/api/push'); next.exactAlarm = p?.canScheduleExact === true;} catch {}
    try {const h = await api('/api/health-connect/status'); next.health = h?.permissionsGranted === true; next.healthReason = h?.reason || '';} catch {}`,
   `    // Each check is capped: a native route that stops answering must not freeze the checklist.
    try {const s = await withTimeout(api('/api/notification-permission'), 3000, 'perm.notifications'); next.notifications = s?.granted === true;} catch {}
    try {const p = await withTimeout(api('/api/push'), 3000, 'perm.push'); next.exactAlarm = p?.canScheduleExact === true;} catch {}
    try {const h = await withTimeout(api('/api/health-connect/status'), 3000, 'perm.health'); next.health = h?.permissionsGranted === true; next.healthReason = h?.reason || '';} catch {}`],
  ['log how long the checklist takes',
   `    permissionState = next;
    return next;`,
   `    permissionState = next;
    console.info('[perm] checklist ready', JSON.stringify(next));
    return next;`],
]);
patch('app/src/fragments/50-onboarding.fragment.js', [
  ['instrument step start',
   `  function onboardingStep(step) {
    onboarding.step = Math.min(onboarding.total, Math.max(1, step));`,
   `  function onboardingStep(step) {
    const started = (window.performance && performance.now ? performance.now() : Date.now());
    onboarding.step = Math.min(onboarding.total, Math.max(1, step));`],
  ['log step end',
   `    $('#ob-finish').hidden = onboarding.step !== onboarding.total;`,
   `    $('#ob-finish').hidden = onboarding.step !== onboarding.total;
    const spent = ((window.performance && performance.now ? performance.now() : Date.now()) - started);
    (window.__perfLog = window.__perfLog || []).push({label: 'onboardingStep', step: onboarding.step, ms: Math.round(spent)});
    console.info('[ob] step', onboarding.step, 'in', Math.round(spent), 'ms');`],
  ['defer the permission refresh',
   `    if (onboarding.step === 4) refreshPermissionChecklist().catch(() => {});`,
   `    // Show step 4 first, then do the checks: a slow native route must not hold the transition.
    if (onboarding.step === 4) setTimeout(() => refreshPermissionChecklist().catch(() => {}), 30);`],
]);
console.log('instrumentation applied');
