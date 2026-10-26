from pathlib import Path
r=Path(r'D:\AI\health-android')
p=r/'app/src/main/assets/native-adapter.js';s=p.read_text(encoding='utf-8')
a=s.index('   const foods = [') if '   const foods = [' in s else s.index('  const foods = [');b=s.index('  function localEstimate(body)',a)
s=s[:a]+'''  // Real APK/demo pages load the shared food reference library before this adapter.
  // Retain the twelve original anchors as a compatibility fallback for isolated adapter tests.
'''+s[a:b]+s[b:]
s=s.replace("       const food=foods.find(row=>row[1].includes(name));","       const food=foods.find(row=>row[1].includes(name));") # actual spacing handled below
old="      const food=foods.find(row=>row[1].includes(name));"
new="""      if (window.QinghengFoods) {
        items.push(window.QinghengFoods.estimate(name, grams));
        continue;
      }
      const food=foods.find(row=>row[1].includes(name));"""
assert old in s;s=s.replace(old,new,1)
s=s.replace("          return response(await nativeRequest(path,method,{...body,allowExternal:true},options.signal));","          const result = await nativeRequest(path,method,{...body,allowExternal:true},options.signal);\n          return response(window.QinghengFoods ? window.QinghengFoods.calibrateDraft(result) : result);",1)
p.write_text(s,encoding='utf-8')
p=r/'app/src/main/assets/app.js';s=p.read_text(encoding='utf-8')
a=s.index('  function setDefaultDates()')
s=s[:a]+'''  $('#connection-check').addEventListener('click', async event => {
    if (!confirm('检查已保存的服务商连接：仅发送 API Key 到已配置的 HTTPS 服务商，不发送图片或健康记录，不生成收费回答。请先保存连接设置。继续吗？')) return;
    const button = event.currentTarget, message = $('#connection-check-feedback');
    button.disabled = true; feedback(message,'正在检查 /models…');
    try {
      const result = await api('/api/connection-check',{allowExternal:true});
      feedback(message, result.message + (result.visionModelListed ? ' 当前视觉模型在列表中。' : ' 当前视觉模型未在列表中，请核对名称。'));
    } catch (error) {feedback(message,error.message,true);} finally {button.disabled = false;}
  });
  function searchFoods() {
    const query = $('#food-search').value.trim(), library = window.QinghengFoods;
    const matches = library ? library.search(query,8) : [];
    $('#food-search-results').innerHTML = matches.map(row=>`<button type="button" class="food-result" data-food-name="${esc(row.name)}"><span>${esc(row.name)}<small>${esc(row.category)} · ${esc(row.basis)} · 每100g</small></span><strong>${fmt(row.per100.calories,0)} kcal</strong></button>`).join('') || '<p class="fine-print">未找到匹配项，请使用食品包装信息或手动记录，不会擅自猜测。</p>';
  }
  $('#food-search').addEventListener('input',searchFoods);
  $('#food-search-results').addEventListener('click',event=>{
    const button = event.target.closest('[data-food-name]'); if(!button) return;
    const name = button.dataset.foodName;
    $('#meal-text').value = ($('#meal-text').value.trim() ? $('#meal-text').value.trim() + '、' : '') + name + ' 100g';
    switchTab('records'); $('#meal-text').focus();
    notice('已填入 '+name+' 100g 作为占位量，请替换成实际克重后估算。');
  });
  $('#calibrate-foods').addEventListener('click',()=>{
    if (!window.QinghengFoods) return;
    try {
      const data = window.QinghengFoods.calibrateDraft({items:readItems(true),notes:[]});
      data.items.forEach((item,i)=>{
        const row = $$('.estimate-item')[i];
        for(const key of ['calories','protein','fat','carbs']) $('[data-item-field="'+key+'"]',row).value = item[key];
      });
      $('#estimate-notes').innerHTML = data.notes.map(note=>`<li>${esc(note)}</li>`).join('');
      updatePreviewTotals(); feedback($('#preview-feedback'),'已按本地模型校核。菜品配方、油量和图片估计克重仍需人工确认。');
    } catch(error){feedback($('#preview-feedback'),error.message,true);}
  });
'''+s[a:]
s=s.replace('  switchTab(restoreTab());render();connection();','  searchFoods();\n  switchTab(restoreTab());render();connection();',1)
p.write_text(s,encoding='utf-8')
print('Integrated food search, local estimate, API calibration, and explicit connection-check consent.')
