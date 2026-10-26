import fs from 'node:fs';
const m = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
console.log('reconciledKcal calls:', (m.match(/reconciledKcal/g)||[]).length);
console.log('manual comment:', m.includes('manual entry only supplies totals'));
const nm = fs.readFileSync('app/src/main/java/cn/qingheng/health/store/NutritionMath.java','utf8');
console.log('fiber overload:', nm.includes('double protein, double carbs, double fat, double fiber'));
const prompt = fs.readFileSync('app/src/main/java/cn/qingheng/health/ai/Prompts.java','utf8');
console.log('prompt fiber:', prompt.includes('fiber'));
