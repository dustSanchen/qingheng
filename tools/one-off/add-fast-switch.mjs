import fs from 'node:fs';
const f = 'tools/dev-loop.ps1';
let t = fs.readFileSync(f, 'utf8');
if (!t.includes('[switch]$Fast')) {
  t = t.replace('  [switch]$SkipBuild\n)', '  [switch]$SkipBuild,\n  [switch]$Fast\n)');
  t = t.replace("$ErrorActionPreference = 'Continue'", "# -Fast: skip the full suite and the device smoke; keep assemble + build + install (~15 s).\nif ($Fast) { $SkipTests = $true; $SkipSmoke = $true }\n$ErrorActionPreference = 'Continue'");
  t = t.replace("if (-not $SkipInstall) {\n  Step 'install + smoke' {", "if (-not $SkipInstall) {\n  Step 'install + smoke' {");
  t = t.replace(`    $code = Run 'device smoke' ("& '" + $node + "' tools\\device.mjs smoke") 180
    if ($code -ne 0) { $global:LASTEXITCODE = $code; return }`, `    if (-not $SkipSmoke) {
      $code = Run 'device smoke' ("& '" + $node + "' tools\\device.mjs smoke") 180
      if ($code -ne 0) { $global:LASTEXITCODE = $code; return }
    }`);
  fs.writeFileSync(f, t);
  console.log('Fast switch added');
} else console.log('already has Fast');
