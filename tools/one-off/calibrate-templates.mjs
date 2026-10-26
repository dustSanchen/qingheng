/**
 * 第 2 步：用解剖手册（第 1~3 集）的口述结论校准日模板。
 * 只加「执行提示」字段，不改组数与次数——组次来自三分化整理图，两者不冲突。
 */
import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

const lib = 'app/src/main/assets/training-principles.js';

patch(lib, [
  ['calibrate the push template',
   "      label: '推日 · 胸 / 三角肌中束 / 肱三头肌',\n      source: 'community-digest',",
   `      label: '推日 · 胸 / 三角肌中束 / 肱三头肌',
      source: 'community-digest',
      cues: [
        '卧推握距略窄于肩 → 大臂偏矢状面，吃前束与上胸；宽握 → 水平内收，更偏胸',
        '想练上胸要开肘更大（接近水平），开肘不够大就落回中胸',
        '别把屁股往前挪、别狠狠挺胸——那是人造下斜板，会把上斜练成中下胸'
      ],`],
]);

patch(lib, [
  ['calibrate the pull template',
   "      label: '拉日 · 背 / 三角肌后束 / 肱二头肌',\n      source: 'community-digest',",
   `      label: '拉日 · 背 / 三角肌后束 / 肱二头肌',
      source: 'community-digest',
      cues: [
        '开肘划船练后束必须近乎水平开肘，半开肘、假肘都练不到',
        '别用过度肩胛后缩代替发力，可刻意做一点肩胛前引来抑制',
        '下拉/划船第一个动作第 4 组做到力竭，其余留 1~2 次余量'
      ],`],
]);

patch(lib, [
  ['calibrate the legs template',
   "      label: '腿日 · 臀 / 股四头肌 / 腘绳肌',\n      source: 'community-digest',",
   `      label: '腿日 · 臀 / 股四头肌 / 腘绳肌',
      source: 'community-digest',
      cues: [
        '热身 6 个动作、每边 45 秒：髋开合 / 内收肌 / 前脚踝+后侧链 / 髋激活 / 踝+大腿内侧 / 踝背屈',
        '深蹲时脚跟容易抬高的人，重点做最后一个踝背屈动作',
        '单腿动作以骨盆稳定为前提，加旋转前先把大腿固定住'
      ],`],
]);

// 模板上的「为什么」也带口述依据
patch(lib, [
  ['day rules mention the calibration',
   "      plan: {order: ['卧推', '上斜哑铃卧推', '双杠臂屈伸', '仰卧臂屈伸', 'Y 字侧平举']},",
   "      plan: {order: ['卧推', '上斜哑铃卧推', '双杠臂屈伸', '仰卧臂屈伸', 'Y 字侧平举'], cuesFrom: 'BV1YgcdeqE7y'},"],
  ['pull rule mentions the row cue',
   "      plan: {order: ['单手钢线下拉', '对握高位下拉', '单手器械划船', '坐姿开肘划船', '钢线弯举']},",
   "      plan: {order: ['单手钢线下拉', '对握高位下拉', '单手器械划船', '坐姿开肘划船', '钢线弯举'], cuesFrom: 'BV167LAzaE14'},"],
  ['legs rule mentions the warmup',
   "      plan: {order: ['单腿硬拉', '单腿保加利亚蹲', '高脚杯深蹲', '杠铃罗马尼亚硬拉', '山羊挺身']},",
   "      plan: {order: ['单腿硬拉', '单腿保加利亚蹲', '高脚杯深蹲', '杠铃罗马尼亚硬拉', '山羊挺身'], cuesFrom: 'BV1ncdUBGEbS'},"],
]);

const loaded = new Function('window', fs.readFileSync(lib, 'utf8') + '\nreturn window.TRAINING_PRINCIPLES;')({});
console.log('templates with cues:', Object.values(loaded.dayTemplates).filter(day => Array.isArray(day.cues)).length);
console.log('push cues:', loaded.dayTemplates.push.cues.length, '| pull:', loaded.dayTemplates.pull.cues.length, '| legs:', loaded.dayTemplates.legs.cues.length);
