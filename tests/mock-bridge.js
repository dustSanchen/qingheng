/* Mock of the Android QinghengNative bridge, loaded before app.js in the DOM test. */
(function () {
  window.__mock = { measurementPosts: 0, profilePosts: [], settingsPosts: [], markdownCalls: 0 };
  var state = {
    version: 1, seedMigrated: 2, onboardingDone: false,
    profile: { sex: 'male', height: null, goal: null, calorieTarget: null, referenceCalories: null, proteinMin: null, proteinMax: null, fatMin: null, fatMax: null },
    measurements: [], meals: [], habits: [], chats: [], notes: []
  };
  var push = { enabled: false, morningTime: '07:00', eveningTime: '20:30', analysisEnabled: false, canScheduleExact: true, notificationsGranted: true };
  var settings = {
    provider: 'deepseek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash',
    visionModel: 'deepseek-flash', visionEnabled: true, apiConfigured: false, allowExternal: false,
    providers: {
      deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash', visionModel: 'deepseek-flash', visionEnabled: true, apiConfigured: false, allowExternal: false },
      bai: { baseUrl: 'https://api.b.ai/v1', model: '', visionModel: '', visionEnabled: false, apiConfigured: false, allowExternal: false }
    }
  };
  window.__mockState = state;
  window.QinghengNative = {
    request: function (raw) {
      var req = JSON.parse(raw);
      var out = null, err = null;
      try {
        if (req.path === '/api/state') out = JSON.parse(JSON.stringify(state));
        else if (req.path === '/api/profile') {
          Object.assign(state.profile, req.body);
          window.__mock.profilePosts.push(req.body);
          out = JSON.parse(JSON.stringify(state.profile));
        } else if (req.path === '/api/measurements') {
          state.measurements.push(Object.assign({ id: 'm' + state.measurements.length }, req.body));
          if (req.body.weight !== null && req.body.weight !== undefined) window.__mock.measurementPosts++;
          out = { ok: true };
        } else if (req.path === '/api/settings') {
          if (req.method !== 'GET') {
            var target = settings.providers[req.body.provider] || settings.providers.deepseek;
            Object.assign(target, req.body);
            if (req.body.apiKey) target.apiConfigured = true;
            settings.provider = req.body.provider;
            window.__mock.settingsPosts.push({ provider: req.body.provider, hasKey: !!req.body.apiKey });
          }
          out = JSON.parse(JSON.stringify(settings));
        } else if (req.path === '/api/push') out = Object.assign({}, push);
        else if (req.path === '/api/chatlog') out = [];
        else if (req.path === '/api/export-markdown') {
          window.__mock.markdownCalls++;
          out = { filename: 'qingheng-test.md', markdown: '# test\n' };
        } else if (req.path === '/api/advice') out = { source: 'local', messages: ['ok'], date: req.body && req.body.date };
        else out = { ok: true };
      } catch (e) { err = String((e && e.message) || e); }
      setTimeout(function () {
        window.__nativeReply({ id: req.id, ok: !err, data: err ? null : out, error: err });
      }, 0);
    }
  };
})();
