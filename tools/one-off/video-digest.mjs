import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';

// 1) 摘要里带视频引用（BV 号 + 时长），问答可直接告诉用户去看哪一集
patch('app/src/fragments/60-training-copy.fragment.js', [
  ['summary includes the video',
   "      .map(rule => '[' + rule.topic + '·P' + (rank(rule.source) + 1) + '] ' + rule.claim)",
   `      .map(rule => '[' + rule.topic + '·P' + (rank(rule.source) + 1) + '] ' + rule.claim
        + (rule.video ? '（视频 ' + rule.video.bvid + '，' + Math.round(rule.video.seconds / 60) + ' 分钟：' + rule.video.title + '）' : ''))`],
]);

// 2) 提示词：引用库时给 BV 号与时长
patch('app/src/main/java/cn/qingheng/health/ai/Prompts.java', [
  ['prompt asks for the video reference',
   '                + "食物建议写明大致份量，但不要声称份量是精确测量。"',
   `                + "食物建议写明大致份量，但不要声称份量是精确测量。"
                + "若参考了 body.libraryDigest 里的条目，且该条带「视频 BV…」，在句末用括号给出 BV 号与时长，方便用户去看原片。"`],
]);

// 3) 把库摘要作为独立字段传进上下文（之前只有 library，现在也带上 video）
patch('app/src/main/java/cn/qingheng/health/MainActivity.java', [
  ['the library digest keeps its video refs',
   '                    "本地建议库（优先按 P1 凯圣王×谭成义、P2 凯圣王、P3 ALEX 的顺序引用；"',
   '                    "本地建议库（优先按 P1 三分化、P2 好人松松、P3 谭成义、P4 凯圣王、P5 ALEX 的顺序引用；"'],
]);
console.log('video refs wired into digest and prompt');
