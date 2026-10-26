import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/fragments/70-rest.fragment.js', [
  ['the trends bar must live inside its own view',
   `    const cards = [...view.querySelectorAll('article.card')];
    const cardFor = heading => cards.find(card => $('h2', card)?.textContent.trim() === heading);
    const host = $('.record-grid', view) || view;
    const panels = [
      {key: 'weight', label: '体重', headings: ['体重变化', '身体成分对照', '身体记录明细']},`,
   `    const cards = [...view.querySelectorAll('article.card')];
    const cardFor = heading => cards.find(card => $('h2', card)?.textContent.trim() === heading);
    const host = $('.record-grid', view) || view;
    const panels = [
      {key: 'weight', label: '体重', headings: ['体重变化', '身体成分对照', '身体记录明细']},`],
  ['insert into the view, not beside it',
   `    host.parentNode.insertBefore(bar, host);
    for (const panel of panels) {
      const container = document.createElement('div');
      container.className = 'record-panel';
      container.id = 'trend-panel-' + panel.key;`,
   `    // The trends view has no .record-grid wrapper, so the bar goes inside the view itself; inserting it
    // beside the section put a stray segmented bar at the bottom of the records page.
    const heading = $('.page-heading', view);
    if (heading) heading.after(bar); else view.prepend(bar);
    for (const panel of panels) {
      const container = document.createElement('div');
      container.className = 'record-panel';
      container.id = 'trend-panel-' + panel.key;`],
]);
console.log('trends bar placement fixed');
