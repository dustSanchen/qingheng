/**
 * Guard: in --preview mode, coordinates outside the preview image are almost always device pixels
 * passed by mistake, which taps off-screen and looks like "the button does nothing".
 */
import {patch} from '../lib/patch.mjs';

patch('tools/device.mjs', [
  [
    'preview bounds guard',
    `function fromPreview(x, y) {
  const size = deviceSize();`,
    `function fromPreview(x, y) {
  if (x < 0 || y < 0 || x > PREVIEW.width || y > PREVIEW.height) {
    throw new Error(\`--preview expects preview pixels (<= \${PREVIEW.width}x\${PREVIEW.height}), got \${x},\${y}; drop --preview if these are device pixels\`);
  }
  const size = deviceSize();`,
  ],
]);

console.log('preview bounds guard added');
