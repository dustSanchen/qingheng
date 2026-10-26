from pathlib import Path
p = Path(r'D:\AI\health-android\app\src\main\assets\index.html')
s = p.read_text(encoding='utf-8')

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:90])
    s = s.replace(a, b)

# 1) Mic button inside the meal description field (mainstream health-app pattern: mic lives in the field).
rep('<label>吃了什么？<textarea id="meal-text" name="text" rows="3" maxlength="4000" placeholder="例如：米饭 100g、鸡胸肉 150g、西兰花 100g"></textarea></label>',
    '<label>吃了什么？<span class="field-with-action"><textarea id="meal-text" name="text" rows="3" maxlength="4000" placeholder="例如：米饭 100g、鸡胸肉 150g、西兰花 100g"></textarea>'
    '<button type="button" class="mic-button" data-voice-target="meal" aria-label="用语音说出吃了什么"><span class="mic-icon" aria-hidden="true">🎙</span><small>语音</small></button></span>'
    '<span class="fine-print">可以说「米饭 100 克、鸡胸肉 150 克」，也可以直接打字。语音只在本机识别，不上传录音。</span></label>')

# 2) Meal time in the confirmation preview, right after date + meal type.
rep('<p id="estimate-photo-time" class="fine-print"></p><p class="fine-print">拍摄时间不等于进餐日期；请核对上方饮食日期，确认后才会计入该日。</p>',
    '<label>进餐时间<input id="estimate-meal-time" type="time" required></label></div>'
    '<p id="estimate-meal-time-note" class="fine-print"></p>'
    '<p id="estimate-photo-time" class="fine-print"></p><p class="fine-print">拍摄时间不等于进餐日期与进餐时间；有照片时默认取拍摄时刻，特殊情况可在上方改。</p>')

# 3) Draft box becomes a list so several unconfirmed estimates can be picked from.
rep('<div class="notice draft-box" id="draft-box" hidden><p id="draft-box-text"></p><div class="button-row"><button type="button" class="button subtle" id="draft-restore">恢复这份估算</button><button type="button" class="text-button" id="draft-discard">丢弃</button></div></div>',
    '<div class="notice draft-box" id="draft-box" hidden><p id="draft-box-text"></p><div class="list-stack" id="draft-list" role="list" aria-label="未确认的估算草稿"></div></div>')

# 4) Stale-advice hint: the advice is tied to the exact records it was made from.
rep('<div id="advice-content" class="muted">',
    '<p class="fine-print notice" id="advice-stale" hidden></p><div id="advice-content" class="muted">')

# 5) Accessible names for the record lists.
rep('<div id="record-meals"></div>', '<div id="record-meals" role="list" aria-label="最近的餐食记录"></div>')
rep('<div id="today-meals"></div>', '<div id="today-meals" role="list" aria-label="今天已记录的餐食"></div>')
rep('<div id="food-search-results"></div>', '<div id="food-search-results" role="list" aria-label="食品参考库搜索结果"></div>')
rep('<div id="off-results"></div>', '<div id="off-results" role="list" aria-label="包装食品搜索结果"></div>')

# 6) Voice sheet: own listening UI instead of the restyled-by-nobody system activity.
rep('<div class="app-dialog" id="item-recalc-dialog" hidden role="presentation">',
    '<div class="voice-sheet" id="voice-sheet" hidden role="presentation"><div class="voice-panel" role="dialog" aria-modal="true" aria-labelledby="voice-title" aria-describedby="voice-status">'
    '<p class="eyebrow" id="voice-title">语音输入</p>'
    '<div class="voice-bars" id="voice-bars" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>'
    '<p class="voice-status" id="voice-status" role="status" aria-live="polite">正在聆听…</p>'
    '<p class="voice-text" id="voice-text"></p>'
    '<p class="fine-print">录音只在本机转成文字，不会保存或上传音频；识别结果会追加到输入框，可再修改。</p>'
    '<div class="button-row"><button type="button" class="button subtle" id="voice-cancel">取消</button><button type="button" class="button primary" id="voice-done">完成</button></div>'
    '</div></div>'
    '<div class="app-dialog" id="item-recalc-dialog" hidden role="presentation">')

p.write_text(s, encoding='utf-8')
print('index.html patched: mic button, meal time, draft list, advice stale hint, aria labels, voice sheet')
