import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../app/src/main/', import.meta.url);
const java = fs.readFileSync(new URL('java/cn/qingheng/health/MainActivity.java', root), 'utf8');
const store = fs.readFileSync(new URL('java/cn/qingheng/health/SecretStore.java', root), 'utf8');
const app = fs.readFileSync(new URL('assets/app.js', root), 'utf8');
const html = fs.readFileSync(new URL('assets/index.html', root), 'utf8');

// The 401 cause this fixes: keys copied from a web page carry NBSP/BOM/zero-width characters,
// which Java's \s does not match, so they were stored and then rejected by the provider.
// The Java source spells these as unicode escapes, so the patterns expect one literal backslash.
assert(/public static String sanitize\(String raw\)/.test(store), 'a sanitizer exists');
assert(store.includes('replace("\\u00A0", " ")'), 'NO-BREAK SPACE is handled');
assert(store.includes('replace("\\uFEFF", "")'), 'BOM is handled');
assert(store.includes('replace("\\u200B", "")'), 'zero-width space is handled');
assert(store.includes('replace("\\u3000", " ")'), 'ideographic space is handled');
assert(/regionMatches\(true, 0, "Bearer", 0, 6\)/.test(store), 'a pasted Bearer prefix is stripped');
assert(/Character\.isWhitespace\(c\) \|\| Character\.isSpaceChar\(c\)/.test(store), 'all Unicode space characters are removed');
assert(/public static boolean needsCleaning/.test(store), 'contaminated stored keys can be detected');
assert(!java.includes('\\s+.*"), "API Key'), 'the old ASCII-only whitespace check is gone');
assert(!java.includes('API Key 不能包含空白'), 'the misleading whitespace error message is gone');

// Normalisation happens on save and again on every use, so an already-stored key is repaired.
assert(java.includes('SecretStore.sanitize(patch.getString("apiKey"))'), 'model keys are sanitized on save');
assert(!java.includes('key.brave'), 'no Brave key slot remains after search removal');
assert(/private String apiKey\(String provider\) throws Exception/.test(java), 'one accessor produces every request key');
assert(java.includes('return SecretStore.sanitize(SecretStore.decrypt(this, provider));'), 'keys are sanitized again when read');
const decrypts = [...java.matchAll(/SecretStore\.decrypt\(this,/g)].length;
assert.equal(decrypts, 2, 'decrypt is called only from the request accessor and the self check');
const callSites = [...java.matchAll(/apiKey\((?:c\.optString\("provider", provider\(\)\)|provider\(\)|p)\)/g)];
assert(callSites.length >= 2, `every request path uses the accessor (found ${callSites.length})`);

// Self check: local only, and it must never return key material.
assert(/if \(get && path\.equals\("\/api\/key-info"\)\)/.test(java), 'the self check route is a GET');
const info = java.slice(java.indexOf('private JSONObject keyInfo'), java.indexOf('private JSONObject publicSettings'));
assert(/SecretStore\.decrypt/.test(info), 'the self check proves the stored key still decrypts');
assert(/substring\(0, 7\)/.test(info) && /substring\(clean\.length\(\) - 4\)/.test(info), 'only a masked preview is returned');
assert(!/put\("key"/.test(info) && !/put\("value"/.test(info) && !/put\("secret"/.test(info), 'no full key field is ever returned');
assert(/put\("cleaned", SecretStore\.needsCleaning\(raw\)\)/.test(info), 'the self check reports paste contamination');

assert(/id="key-info"/.test(html) && /id="key-info-result"/.test(html), 'the self check has UI');
assert(/api\('\/api\/key-info'\)/.test(app), 'the page calls the self check');
assert(/检测到粘贴时带入的不可见字符/.test(app), 'contamination is explained to the user in plain language');
assert(!/data\.model\.key|data\.brave\.key/.test(app), 'the page never handles raw key material');

console.log('PASS key hygiene: Unicode-safe sanitising, repair on read, masked self check, offline page reading');
