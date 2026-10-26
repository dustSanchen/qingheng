import fs from 'node:fs';
import { patch } from '../lib/patch.mjs';
// DatedData 才是接收器里能拿到档案的地方：给它一个 trainingOff() 访问器。
patch('app/src/main/java/cn/qingheng/health/AlarmReceiver.java', [
  ['dated data exposes the training mode',
   `        /** Meals recorded on one day; weight and habit rows are not meals and never enter the meal list. */`,
   `        /** True when the profile says the user does not train, so no training advice should be produced. */
        boolean trainingOff() {
            JSONObject profile = state == null ? null : state.optJSONObject("profile");
            return profile != null && "none".equals(profile.optString("training", ""));
        }

        /** Meals recorded on one day; weight and habit rows are not meals and never enter the meal list. */`],
  ['use the accessor',
   `        JSONObject profileForPush = state == null ? null : state.optJSONObject("profile");
        boolean trainingOff = profileForPush != null && "none".equals(profileForPush.optString("training", ""));
        if (trainingOff) user.put("trainingDisabled", true);`,
   `        if (data != null && data.trainingOff()) user.put("trainingDisabled", true);`],
]);
console.log('trainingOff accessor added');
