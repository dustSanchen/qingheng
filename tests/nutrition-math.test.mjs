/**
 * 真实数值测试：直接编译并运行 NutritionMath（纯 Java，可在桌面 JVM 上跑），
 * 覆盖这次「总量 vs 明细」bug 的三种情形。
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let fail = 0;
const check = (label, ok, detail) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + label + (detail === undefined ? '' : '  -> ' + detail)); if (!ok) fail++; };

const jdk = fs.readdirSync('toolchain/jdk').map(name => path.join('toolchain/jdk', name))[0];
const javac = path.join(jdk, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac');
const java = path.join(jdk, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
const work = path.join(os.tmpdir(), 'qingheng-nutrition-' + Date.now());
fs.mkdirSync(work, {recursive: true});

const harness = `import cn.qingheng.health.store.NutritionMath;
public class Harness {
    static String fmt(double[] v) {
        return String.format("%.1f/%.1f/%.1f/%.1f", v[0], v[1], v[2], v[3]);
    }
    public static void main(String[] args) {
        double[][] items = {{600, 30, 50, 20}};
        // 1) oil 10 g: totals include 90 kcal and 10 g fat
        double[] base = NutritionMath.totals(items, 0);
        double[] withOil = NutritionMath.totals(items, 10);
        System.out.println("base=" + fmt(base));
        System.out.println("oil=" + fmt(withOil));
        // 2) the model's totals (oil already inside) agree with the canonical total
        System.out.println("agree=" + !NutritionMath.differs(690, withOil[0]) + "," + !NutritionMath.differs(30, withOil[3]));
        // 3) totals without the oil is exactly what used to be rejected
        System.out.println("oldReject=" + NutritionMath.differs(600, withOil[0]));
        // 4) rounding keeps one decimal
        System.out.println("rounded=" + fmt(NutritionMath.rounded(new double[]{690.04, 30.06, 50.0, 30.0})));
        System.out.println("note=" + NutritionMath.mismatchNote(10).contains("10 g"));
        // carbs fallback when a food omits carbohydrate
        System.out.println("carbsMissing=" + NutritionMath.carbsMissing(400, 30, 0, 20) + "," + NutritionMath.carbsMissing(400, 30, 40, 20));
        System.out.println("inferred=" + String.format("%.1f", NutritionMath.inferredCarbs(400, 30, 20)) + "," + String.format("%.1f", NutritionMath.inferredCarbs(200, 30, 20)));
        // 4/4/9 energy checks
        System.out.println("macro=" + String.format("%.0f", NutritionMath.caloriesFromMacros(30, 50, 20)));
        System.out.println("tight=" + !NutritionMath.energyMismatch(500, 500) + "," + !NutritionMath.energyMismatch(530, 500));
        System.out.println("loose=" + NutritionMath.energyMismatch(800, 500));
        System.out.println("fiberAware=" + String.format("%.0f", NutritionMath.caloriesFromMacros(10, 60, 5, 20)) + "," + String.format("%.0f", NutritionMath.caloriesFromMacros(10, 60, 5)));
        System.out.println("fiberClamp=" + String.format("%.0f", NutritionMath.caloriesFromMacros(0, 10, 0, 30)));
        System.out.println("fixed=" + String.format("%.0f", NutritionMath.reconciledKcal(800, 30, 50, 20)) + "," + String.format("%.0f", NutritionMath.reconciledKcal(530, 30, 50, 20)));
    }
}`;

const source = 'app/src/main/java/cn/qingheng/health/store/NutritionMath.java';
fs.writeFileSync(path.join(work, 'Harness.java'), harness);
execFileSync(javac, ['-encoding', 'UTF-8', '-d', work, source, path.join(work, 'Harness.java')], {stdio: 'pipe'});
const out = execFileSync(java, ['-cp', work, 'Harness'], {encoding: 'utf8'});
const lines = Object.fromEntries(out.trim().split(/\r?\n/).map(line => line.trim().split('=')).map(([key, value]) => [key, value]));

check('items alone are unchanged', lines.base === '600.0/30.0/50.0/20.0', lines.base);
check('oil adds 90 kcal and 10 g fat', lines.oil === '690.0/30.0/50.0/30.0', lines.oil);
check('a model total that includes oil now agrees', lines.agree === 'true,true', lines.agree);
check('a total without the oil is the case that used to throw', lines.oldReject === 'true', lines.oldReject);
check('totals are stored at one decimal place', lines.rounded === '690.0/30.1/50.0/30.0', lines.rounded);
check('the note names the oil amount', lines.note === 'true', lines.note);
check('missing carbs are detected', lines.carbsMissing === 'true,false', lines.carbsMissing);
check('carbs are inferred from the rest', lines.inferred === '25.0,0.0', lines.inferred);
check('4/4/9 energy is computed', lines.macro === '500', lines.macro);
check('small rounding differences pass', lines.tight === 'true,true', lines.tight);
check('a 300 kcal gap is caught', lines.loose === 'true', lines.loose);
check('fiber counts 2 kcal/g', lines.fiberAware === '285,325', lines.fiberAware);
check('fiber is clamped to carbs', lines.fiberClamp === '20', lines.fiberClamp);
check('bad values are replaced, near misses kept', lines.fixed === '500,530', lines.fixed);

// 源码层面：不再抛错，而是走同一口径
const main = fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', 'utf8');
const app = fs.readFileSync('app/src/main/assets/app.js', 'utf8');
check('the hard failure is gone', !main.includes('API 营养总量与明细不一致'));
check('the estimate uses the canonical totals', main.includes('NutritionMath.totals(itemValues, oilToAdd)'));
check('a mismatch becomes a note', main.includes('NutritionMath.mismatchNote(oilToAdd)'));
check('the preview adds the oil too', app.includes('totals.calories = (totals.calories ?? 0) + oil * 9;'));
check('the save path uses the same helper', app.includes('const totals=estimateTotals(items);'));

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
