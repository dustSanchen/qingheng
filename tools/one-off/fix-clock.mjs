import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  ['use the fully qualified clock',
   "                    coldStartMs = SystemClock.uptimeMillis() - android.os.Process.getStartUptimeMillis();",
   "                    coldStartMs = android.os.SystemClock.uptimeMillis() - android.os.Process.getStartUptimeMillis();"],
]);
console.log('clock qualified');
