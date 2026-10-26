import fs from 'node:fs';

const f = 'app/src/fragments/70-rest.fragment.js';
let t = fs.readFileSync(f, 'utf8');

const from = "finally{estimateBusy=false;button.disabled=false;if($('#estimate-consent').checked)acceptConsent('estimate');}";
const to = "finally{estimateBusy=false;button.disabled=false;if(typeof hideBusy==='function')hideBusy();if($('#estimate-consent').checked)acceptConsent('estimate');}";

if (t.includes(from)) {
  t = t.replace(from, to);
  fs.writeFileSync(f, t);
  console.log('estimate finally now hides the busy row');
} else {
  console.log('anchor missing — searching for a close variant');
  const alt = "estimateBusy=false;button.disabled=false;";
  const i = t.indexOf(alt);
  if (i > 0) {
    t = t.slice(0, i + alt.length) + "if(typeof hideBusy==='function')hideBusy();" + t.slice(i + alt.length);
    fs.writeFileSync(f, t);
    console.log('inserted hideBusy after estimateBusy=false');
  }
}
