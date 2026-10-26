/**
 * 保存档案漏字段的真 bug：提交处理只发 sex/height/age/calorieTarget/referenceCalories/
 * proteinMin/Max/fatMin/Max，**没有 goal、training 和整块口径**。
 * 结果是「改了训练次数、点了保存、显示已保存」，但值根本没写进去。
 *
 * 现在按表单实际拥有的字段发：基础信息 + 目标 + 训练次数（含 none）+ 数值 + 口径覆盖。
 */
import {patch} from '../lib/patch.mjs';

patch('app/src/fragments/70-rest.fragment.js', [
  [
    'the profile save sends goal, training and the 口径 block',
    `  $('#profile-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/profile',form=>{const values=numericForm(form,['height','age','calorieTarget','referenceCalories','proteinMin','proteinMax','fatMin','fatMax']);if(values.proteinMin>values.proteinMax || values.fatMin>values.fatMax) throw new Error('目标下限不能高于上限。');return {sex:form.elements.sex.value,...values};});});`,
    `  $('#profile-form').addEventListener('submit',event=>{event.preventDefault();submitForm(event.currentTarget,'/api/profile',form=>{
    const values=numericForm(form,['height','age','calorieTarget','referenceCalories','proteinMin','proteinMax','fatMin','fatMax']);
    if(values.proteinMin>values.proteinMax || values.fatMin>values.fatMax) throw new Error('目标下限不能高于上限。');
    // goal / training / 口径 used to be dropped here, so a saved profile silently kept the old values.
    const rawTraining=form.elements.training.value;
    const training=rawTraining==='none' ? 'none' : (rawTraining==='' ? null : number(rawTraining));
    const goal=form.elements.goal.value || 'recomp';
    const payload={sex:form.elements.sex.value,goal,...values,...ruleOverridesFrom(form)};
    if(training!==null) payload.training=training;
    if(goal==='lean' && !(state.profile && state.profile.leanPhaseStartedAt)) payload.leanPhaseStartedAt=localDate();
    return payload;
  });});`,
  ],
]);

console.log('profile save payload fixed');
