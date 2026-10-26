import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
patch('app/src/main/assets/index.html', [
  ['a visible render-error bar',
   '<main id="main" tabindex="-1">',
   '<div id="render-error" class="render-error" role="alert" hidden><span id="render-error-text">页面渲染出错</span><button type="button" class="button subtle" id="render-error-retry">重新加载</button></div><main id="main" tabindex="-1">'],
]);
console.log('html bar added');
