/**
 * Real behaviour test for the key sanitizer: compile SecretStore with the bundled android.jar and
 * run sanitize() on the pastes that used to reach the provider as HTTP 401 (BOM, NBSP, zero-width,
 * Bearer prefix, wrapping quotes). Pure static method, no Android runtime needed.
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
const platform = fs.readdirSync('toolchain/platform').map(name => path.join('toolchain/platform', name))[0];
const androidJar = path.join(platform, 'android.jar');
const work = path.join(os.tmpdir(), 'qingheng-secret-' + Date.now());
fs.mkdirSync(work, {recursive: true});

const harness = `import cn.qingheng.health.SecretStore;
public class Harness {
    static void out(String label, String value) {
        System.out.println(label + "=" + value);
    }
    public static void main(String[] args) {
        out("bom", SecretStore.sanitize("\\uFEFFsk-abc123"));
        out("nbsp", SecretStore.sanitize("\\u00A0sk-1\\u200B"));
        out("bearer", SecretStore.sanitize("  Bearer sk-9x  "));
        out("quotes", SecretStore.sanitize("\\"sk-2\\""));
        out("inner", SecretStore.sanitize("sk\\u00203\\u00204"));
        out("null", SecretStore.sanitize(null));
    }
}`;

fs.writeFileSync(path.join(work, 'Harness.java'), harness);
execFileSync(javac, ['-encoding', 'UTF-8', '-cp', androidJar, '-d', work,
  'app/src/main/java/cn/qingheng/health/SecretStore.java', 'app/src/main/java/cn/qingheng/health/PublicError.java', path.join(work, 'Harness.java')], {stdio: 'pipe'});
const out = execFileSync(java, ['-cp', work + path.delimiter + androidJar, 'Harness'], {encoding: 'utf8'});
const lines = Object.fromEntries(out.trim().split(/\r?\n/).map(line => line.trim().split('=')).map(([k, v]) => [k, v]));

check('a BOM is stripped', lines.bom === 'sk-abc123', lines.bom);
check('NBSP and zero-width joiners are stripped', lines.nbsp === 'sk-1', lines.nbsp);
check('a pasted Bearer prefix is removed', lines.bearer === 'sk-9x', lines.bearer);
check('wrapping quotes are removed', lines.quotes === 'sk-2', lines.quotes);
check('inner whitespace is removed', lines.inner === 'sk34', lines.inner);
check('null becomes an empty string', lines.null === '', lines.null);

console.log('\nFAIL total: ' + fail);
process.exitCode = fail ? 1 : 0;
