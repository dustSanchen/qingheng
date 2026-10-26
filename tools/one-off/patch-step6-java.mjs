import fs from 'node:fs';
// Native side: the habit rows now carry an exercises array; bound it so a typo cannot be stored.
let m=fs.readFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java','utf8');
const from='            if (value > max) throw fail("字段 " + key + " 超出合理范围（上限 " + trim(max) + "）");\n        }\n    }';
if(m.split(from).length-1!==1) throw new Error('anchor missing');
const to = `            if (value > max) throw fail("字段 " + key + " 超出合理范围（上限 " + trim(max) + "）");
        }
        // Training log: template plus up to 12 exercises with sets/reps/weight.
        Object rawTemplate = record.opt("template");
        if (rawTemplate != null && !JSONObject.NULL.equals(rawTemplate)) {
            if (!(rawTemplate instanceof String) || !((String)rawTemplate).matches("push|pull|legs|other"))
                throw fail("训练模板只能是推、拉、腿或其他");
        }
        JSONArray exercises = record.optJSONArray("exercises");
        if (exercises != null) {
            if (exercises.length() > 12) throw fail("一次最多记录 12 个动作");
            for (int i = 0; i < exercises.length(); i++) {
                JSONObject item = exercises.optJSONObject(i);
                if (item == null) throw fail("动作格式不正确");
                String name = item.optString("name", "").trim();
                if (name.isEmpty() || name.length() > 60) throw fail("动作名称不能为空且不超过 60 字");
                for (String key : new String[]{"sets", "reps", "weight"}) {
                    if (!item.has(key) || item.isNull(key)) continue;
                    double value = number(item, key);
                    double max = key.equals("sets") ? 30 : key.equals("reps") ? 200 : 500;
                    if (value > max) throw fail("动作的 " + key + " 超出合理范围（上限 " + trim(max) + "）");
                }
            }
        }
    }`;
m=m.replace(from,to);
fs.writeFileSync('app/src/main/java/cn/qingheng/health/MainActivity.java', m);
console.log('habit training validation added');
