// 2026-10-19: icon delivery + motion contract.
// Semantic (currentColor) icons must NEVER be loaded through <img> — an external SVG resource
// cannot inherit the page colour and renders black. They must be inlined so the surrounding
// CSS colour (mint-dark, danger, tone colours) applies. Skeleton icons keep their baked mint.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
const html = fs.readFileSync('app/src/main/assets/index.html', 'utf8');
const css = fs.readFileSync('app/src/main/assets/styles.css', 'utf8');

// --- inline delivery of semantic icons ---------------------------------------------------------
const SEMANTIC = ['tip', 'copy', 'check', 'bookmark', 'select', 'trash',
  'nutrient-protein', 'nutrient-fat', 'nutrient-carb', 'energy', 'meal',
  'habit-steps', 'habit-sleep', 'water', 'warn'];
assert(app.includes('const SVG_ICONS = {'), 'app.js carries the inline icon map');
assert(app.includes('const iconMarkup = name =>'), 'app.js renders icons through iconMarkup()');
for (const name of SEMANTIC) {
  assert(!app.includes(`<img src="./icon-${name}.svg`), `app.js must not load icon-${name}.svg via <img>`);
  assert(!html.includes(`<img src="./icon-${name}.svg`), `index.html must not load icon-${name}.svg via <img>`);
}
for (const name of ['copy', 'select', 'bookmark', 'trash', 'check', 'meal', 'glyph-balance', 'glyph-training', 'habit-steps', 'habit-sleep']) {
  assert(app.includes(`'icon-${name}.svg': svgIcon(`), `SVG_ICONS defines icon-${name}.svg`);
}
// Today quick-action chips carry the line-icon family, never emoji glyphs.
for (const emoji of ['🍜', '🏋', '⚖', '📷', '＋ 记一餐']) assert(!app.includes(emoji), `quick chips must not use the glyph ${emoji}`);
assert(/class="quick-chip-icon" aria-hidden="true">\$\{iconMarkup\(icon\)\}/.test(app), 'chips render icons through iconMarkup');
assert(css.includes('.quick-chip .quick-chip-icon{'), 'chip icons are sized and tinted mint');
assert(/class="hub-icon" aria-hidden="true"><svg /.test(html), 'the hub icons are inline SVG');
assert(!/icon-(tip|copy|check)\.svg" alt/.test(html), 'no black currentColor icons remain in the hub');

// --- skeleton icons stay file-loaded and tintable ----------------------------------------------
assert(html.includes('icon-glyph-ring.svg') && html.includes('icon-nav-back.svg'), 'navigation reuses the ring glyph and keeps the back icon file');
assert(css.includes('.bottom-nav button:not([aria-current=page]) .nav-icon img{opacity:.55'), 'inactive nav icons are dimmed');
for (const rule of ['.hub-icon svg{width:21px', '.sheet-option-icon svg{width:19px', '.fav-badge svg{width:14px']) {
  assert(css.includes(rule), `CSS sizes the inline icon: ${rule}`);
}

// --- habit icon files obey the shared drawing contract -----------------------------------------
for (const name of ['icon-glyph-training.svg', 'icon-habit-steps.svg', 'icon-habit-sleep.svg', 'icon-water.svg']) {
  const text = fs.readFileSync(`app/src/main/assets/${name}`, 'utf8');
  assert(text.includes('stroke-width="1.5"'), `${name} uses the shared 1.5 stroke`);
  assert(text.includes('stroke-linecap="round"') && text.includes('stroke-linejoin="round"'), `${name} uses round joins`);
  assert(!/(^|[\s"'<>])width="/.test(text), `${name} sets no width attribute`);
  assert(!text.includes('#4b6b52'), `${name} left the off-palette colour`);
}

// --- motion: direction-aware tab switch, dialog rise, collapsible unfold, list stagger ---------
assert(css.includes('@keyframes viewInRight') && css.includes('@keyframes viewInLeft'), 'direction-aware view keyframes exist');
assert(css.includes('.view{animation:viewIn var(--dur-slow) cubic-bezier(.22,.8,.3,1)'), 'views animate on compositor-friendly properties');
assert(/const dir = lastShownTab \? TAB_ORDER\.indexOf\(tab\) - TAB_ORDER\.indexOf\(lastShownTab\) : 0;/.test(app), 'switchTab derives the travel direction');
assert(/view\.classList\.add\(dir > 0 \? 'from-right' : 'from-left'\)/.test(app), 'the incoming view gets the direction class');
assert(/lastShownTab = tab;/.test(app), 'switchTab remembers the previous tab');
assert(css.includes('@keyframes dialogRise') && css.includes('.app-dialog-panel{animation:dialogRise'), 'dialogs rise in');
assert(css.includes('.app-dialog{animation:scrimIn'), 'dialog scrim fades in');
assert(css.includes('.collapsible-body{animation:unfoldIn'), 'collapsible bodies unfold');
assert(css.includes('.food-result{animation:rowIn var(--dur-base) ease-out both'), 'search results enter as rows');
assert(css.includes('{animation-delay:.21s}'), 'rows are staggered');
// Everything animates transform/opacity only — no layout properties in the new keyframes.
for (const kf of ['viewIn', 'viewInRight', 'viewInLeft', 'dialogRise', 'scrimIn', 'unfoldIn', 'rowIn']) {
  const body = css.match(new RegExp(`@keyframes ${kf}\\{[\\s\\S]*?\\}(?:\\}|,|@|/|$)`));
  assert(body, `@keyframes ${kf} exists`);
  assert(!/[,{;]width:|[,{;]height:|[,{;]margin|[,{;]padding|[,{;]top:|[,{;]left:/.test(body[0].replace('@keyframes ' + kf, '')), `${kf} animates only transform/opacity`);
}

console.log('PASS icons-motion: reusable symbols inline (colour inherits), SVG assets on 1.5 round-stroke contract, direction-aware tab motion, dialog/collapsible/list transitions on transform+opacity');
