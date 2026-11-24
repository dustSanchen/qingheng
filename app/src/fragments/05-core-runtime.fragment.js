/* Fragment of assets/app.js -- assembled by tools/assemble-app.ps1 in filename order.
 * Edit this file, never the generated assets/app.js; tests/app-fragments.test.mjs fails on drift. */
  // ---------------------------------------------------------------------------------------------
  // 核心基座（00-09）：模块化命名空间 window.QH。
  // 之后每一片业务代码只认这三个入口，不再互相伸手：
  //   QH.define(name, api)  模块注册中心 —— 公开接口挂到 QH[name]；重复注册、未注册调用都是硬错误
  //   QH.bus                事件总线 —— 模块之间只发/收领域事件（QH.EVENTS），不互相调私有函数
  //   QH.select             只读聚合选择器 —— 读别人的数据只能拿到快照副本，改不到对方的 state
  // 这一片只用 window / console / 标准对象，不碰任何页面节点：tools/check-architecture.mjs 会把它
  // 单独放进 vm 里跑一遍，确认 QH.define / QH.bus / QH.select 在没有 DOM 的环境里也能用。
  // ---------------------------------------------------------------------------------------------
  if (!window.QH || typeof window.QH !== 'object') window.QH = {};
  const QH = window.QH;

  /** 模块名/选择器名：小写字母开头的小驼峰，避免 'Training' 与 'training' 各注册一份。 */
  const QH_NAME = /^[a-z][a-zA-Z0-9]{0,31}$/;
  /** 事件名：领域:动作，只收小写与连字符。 */
  const QH_EVENT_NAME = /^[a-z][a-z0-9]*:[a-z][a-z0-9-]*$/;
  /** 命名空间自己的入口，模块不许占用这些名字。 */
  const QH_RESERVED = new Set(['define', 'require', 'has', 'list', 'bus', 'select', 'storage', 'EVENTS', 'version', '_modules', '__registry']);
  /** 跨模块领域事件常量：业务代码只引用这些键，不要自己拼裸字符串。 */
  const QH_EVENTS = Object.freeze({
    TRAINING_SAVED: 'training:saved',
    DIET_SAVED: 'diet:saved',
    WEIGHT_SAVED: 'weight:saved',
    HABIT_UPDATED: 'habit:updated',
    PREFS_CHANGED: 'prefs:changed'
  });

  /**
   * 内部账本：模块表 / 监听器表 / 选择器表 / 存储键归属。
   * 挂在 QH 上但不进枚举（不污染调试时看到的 QH 结构）；同一份 QH 被二次装载时复用旧账本，
   * 不会把已经注册的模块和监听器清空。
   */
  const qhRegistry = (() => {
    const existing = Object.prototype.hasOwnProperty.call(QH, '__registry') ? QH.__registry : null;
    if (existing && existing.modules instanceof Map && existing.listeners instanceof Map
      && existing.selectors instanceof Map && existing.keys instanceof Map) return existing;
    const created = {modules: new Map(), listeners: new Map(), selectors: new Map(), keys: new Map()};
    Object.defineProperty(QH, '__registry', {value: created, enumerable: false, writable: false, configurable: false});
    return created;
  })();

  QH.version = QH.version || '1.0.0';
  QH.EVENTS = QH.EVENTS || QH_EVENTS;
  if (!QH._modules || typeof QH._modules !== 'object') QH._modules = Object.create(null);

  function qhName(value, kind) {
    const name = String(value ?? '');
    if (!QH_NAME.test(name)) throw new Error('[QH] ' + kind + '名不合法：' + name + '（只允许小写字母开头的字母数字）');
    return name;
  }

  function qhEventName(value) {
    const name = String(value ?? '');
    if (!QH_EVENT_NAME.test(name)) throw new Error('[QH.bus] 事件名不合法：' + name + '（形如 training:saved）');
    return name;
  }

  /**
   * 注册一个模块的公开接口。重复注册是硬错误——后一份静默覆盖前一份，正是「同名函数被吃掉」的老毛病。
   * 接口浅拷贝后冻结：调用方拿到的是只读契约，改不动模块的实现；开放数据只能由查询函数返回快照。
   */
  QH.define = function qhDefine(name, publicApi) {
    const moduleName = qhName(name, '模块');
    if (QH_RESERVED.has(moduleName)) throw new Error('[QH] 「' + moduleName + '」是命名空间保留名，不能当模块名');
    if (qhRegistry.modules.has(moduleName)) throw new Error('[QH] 模块重复注册：' + moduleName);
    if (!publicApi || (typeof publicApi !== 'object' && typeof publicApi !== 'function')) {
      throw new Error('[QH] 模块 ' + moduleName + ' 没有可挂载的公开接口');
    }
    for (const key of Object.keys(publicApi)) {
      const value = publicApi[key];
      const primitive = value === null || ['string', 'number', 'boolean', 'undefined'].includes(typeof value);
      if (typeof value !== 'function' && !primitive) {
        throw new Error('[QH] 模块 ' + moduleName + ' 的公开接口 ' + key + ' 只能是函数或原始值：数据请用查询函数返回快照');
      }
    }
    const api = Object.freeze(Object.assign({}, publicApi));
    qhRegistry.modules.set(moduleName, api);
    QH[moduleName] = api;
    QH._modules[moduleName] = Object.freeze({name: moduleName, methods: Object.freeze(Object.keys(api)), at: new Date().toISOString()});
    return api;
  };

  QH.has = name => qhRegistry.modules.has(String(name ?? ''));

  /** 取已注册模块；没注册就报错，避免「先调用后注册」的时序 bug 变成一堆 undefined is not a function。 */
  QH.require = function qhRequire(name) {
    const moduleName = String(name ?? '');
    const api = qhRegistry.modules.get(moduleName);
    if (!api) throw new Error('[QH] 模块未注册：' + moduleName + '（调用方必须等模块 define 之后再取）');
    return api;
  };

  QH.list = () => [...qhRegistry.modules.keys()];

  // ---- Event bus -------------------------------------------------------------------------------
  QH.bus = QH.bus || {};

  /** 订阅领域事件；返回退订句柄，页面卸载或模块重载时直接调它。 */
  QH.bus.on = function qhBusOn(event, handler) {
    const name = qhEventName(event);
    if (typeof handler !== 'function') throw new Error('[QH.bus] 监听器必须是函数：' + name);
    const list = qhRegistry.listeners.get(name) || [];
    list.push(handler);
    qhRegistry.listeners.set(name, list);
    return () => QH.bus.off(name, handler);
  };

  /** 退订：给 handler 只摘一个，不给 handler 就清空这个事件的整份订阅。 */
  QH.bus.off = function qhBusOff(event, handler) {
    const name = String(event ?? '');
    const list = qhRegistry.listeners.get(name);
    if (!list) return false;
    if (handler === undefined) { qhRegistry.listeners.delete(name); return true; }
    const at = list.indexOf(handler);
    if (at < 0) return false;
    list.splice(at, 1);
    if (!list.length) qhRegistry.listeners.delete(name);
    return true;
  };

  /**
   * 广播领域事件。单个监听器抛错只记日志、不向外抛：一个模块的分析逻辑炸了，不该连累保存动作。
   * 返回成功处理的监听器数；没人订阅时安静返回 0（这是正常状态，不是错误）。
   */
  QH.bus.emit = function qhBusEmit(event, payload) {
    const name = qhEventName(event);
    const list = qhRegistry.listeners.get(name);
    if (!list || !list.length) return 0;
    let delivered = 0;
    // 复制一份再派发：监听器内部退订/新增订阅不会打乱这一次遍历。
    for (const handler of list.slice()) {
      try { handler(payload); delivered += 1; }
      catch (error) {
        if (typeof console !== 'undefined' && console.error) console.error('[QH.bus] 监听器异常已隔离：' + name, error);
      }
    }
    return delivered;
  };

  QH.bus.count = event => (qhRegistry.listeners.get(String(event ?? '')) || []).length;

  // ---- Read-only selectors ---------------------------------------------------------------------
  /**
   * 快照克隆：普通对象与数组逐层复制并冻结，Date 转 ISO 字符串，循环引用与过深层级截断成 null。
   * 关键是「复制」——冻结别人的活 state 会让保存动作之后再也写不进去，那是比越界更糟的事故。
   */
  function qhSnapshot(value, depth, seen) {
    if (value === null || typeof value !== 'object') return value;
    if (depth > 6) return null;
    const path = seen || new Set();
    if (path.has(value)) return null;
    path.add(value);
    let out;
    if (Array.isArray(value)) out = value.map(item => qhSnapshot(item, depth + 1, path));
    else if (value instanceof Date) out = Number.isNaN(value.getTime()) ? null : value.toISOString();
    else {
      out = {};
      for (const key of Object.keys(value)) out[key] = qhSnapshot(value[key], depth + 1, path);
    }
    path.delete(value);
    return Object.freeze(out);
  }

  QH.select = QH.select || {};

  /** 注册一个只读选择器：reader 只在被读的时候求值，返回值一律走快照克隆。 */
  QH.select.define = function qhSelectDefine(name, reader) {
    const selectorName = qhName(name, '选择器');
    if (typeof reader !== 'function') throw new Error('[QH.select] 选择器必须是函数：' + selectorName);
    if (qhRegistry.selectors.has(selectorName)) throw new Error('[QH.select] 选择器重复注册：' + selectorName);
    qhRegistry.selectors.set(selectorName, reader);
    return selectorName;
  };

  QH.select.has = name => qhRegistry.selectors.has(String(name ?? ''));
  QH.select.list = () => [...qhRegistry.selectors.keys()];

  QH.select.get = function qhSelectGet(name) {
    const selectorName = String(name ?? '');
    const reader = qhRegistry.selectors.get(selectorName);
    if (!reader) throw new Error('[QH.select] 未注册的选择器：' + selectorName);
    return qhSnapshot(reader(), 0, null);
  };

  /** 一次取全部：任一个选择器抛错就记 null，不让一处坏数据拖垮整份快照。 */
  QH.select.snapshot = function qhSelectSnapshot() {
    const out = {};
    for (const [name, reader] of qhRegistry.selectors) {
      try { out[name] = qhSnapshot(reader(), 0, null); }
      catch (error) {
        out[name] = null;
        if (typeof console !== 'undefined' && console.error) console.error('[QH.select] 选择器异常已隔离：' + name, error);
      }
    }
    return Object.freeze(out);
  };

  // ---- Storage key ownership -------------------------------------------------------------------
  /**
   * localStorage 键归属：谁的键谁写。两个模块改同一个键，早晚变成「我保存你覆盖」。
   * 约定是 claim 声明归属、写之前 assertWrite；没被认领的键保持现状，不追溯历史代码。
   */
  QH.storage = QH.storage || {};

  QH.storage.claim = function qhStorageClaim(module, keys) {
    const owner = qhName(module, '模块');
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      const name = String(key ?? '');
      if (!name) throw new Error('[QH.storage] 键名不能为空（模块 ' + owner + '）');
      const current = qhRegistry.keys.get(name);
      if (current && current !== owner) throw new Error('[QH.storage] 键已被 ' + current + ' 认领：' + name);
      qhRegistry.keys.set(name, owner);
    }
    return list.length;
  };

  QH.storage.ownerOf = key => qhRegistry.keys.get(String(key ?? '')) || null;

  QH.storage.assertWrite = function qhStorageAssertWrite(module, key) {
    const owner = qhRegistry.keys.get(String(key ?? ''));
    if (owner && owner !== String(module ?? '')) throw new Error('[QH.storage] ' + module + ' 不能写 ' + owner + ' 的键：' + key);
    return true;
  };
