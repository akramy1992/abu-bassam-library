(() => {
  'use strict';

  const SUPABASE_URL = 'https://dlbxcqkbmvnrcrbhuttv.supabase.co';
  // This is a public client key. RLS and the authenticated user's JWT enforce access.
  const PUBLISHABLE_KEY = 'sb_publishable_Umb40YIAVf6YSYsncrBcjw_FhBGogw1';
  const TABLE = 'abu_bassam_sync_secure';
  const BUCKET = 'abu-bassam-private';
  const OPS_KEY = 'abuBassamOpsV4';
  const AUTH_KEY = 'abuBassamSecureAuthV1';
  const PENDING_SYNC_KEY = 'abuBassamPendingCloudSyncV1';
  const DEFAULT_EMAIL = 'akrama1992@gmail.com';
  const listeners = new Set();
  let session = null;
  let readyPromise = null;
  let authBusy = false;

  const client = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          storageKey: AUTH_KEY,
        },
      })
    : null;

  const $ = (id) => document.getElementById(id);
  const uuid = () => globalThis.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = () => session?.user || null;
  const connected = () => !!user();
  const networkAvailable = () => navigator.onLine !== false;
  const pendingSync = () => localStorage.getItem(PENDING_SYNC_KEY) === '1';
  const markPendingSync = (value = true) => { try { if (value) localStorage.setItem(PENDING_SYNC_KEY, '1'); else localStorage.removeItem(PENDING_SYNC_KEY); } catch (_) {} };
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

  function addStyle() {
    const style = document.createElement('style');
    style.textContent = `
.sync-login{position:fixed;z-index:28000;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:#17100fd9}.sync-login.hide{display:none}.sync-card{width:min(430px,100%);padding:20px;border-radius:23px;background:#fffaf3;color:#2b211d;text-align:center;box-shadow:0 20px 70px #0009}.sync-card img{width:78px;height:78px;border-radius:18px}.sync-card h2{margin:9px 0 3px;font-size:19px}.sync-card p{margin:0 0 9px;color:#70635b;font-size:10px;line-height:1.7}.sync-card input{width:100%;min-height:47px;margin:5px 0;padding:10px;border:1px solid #cbb8aa;border-radius:11px;text-align:center;background:#fff;color:#222}.sync-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.sync-card button{min-height:44px;border:0;border-radius:11px;background:#76533e;color:#fff;font-weight:900}.sync-card .create{background:#087f72}.sync-card .local{grid-column:1/-1;background:#e5f2ef;color:#075b4d;border:1px solid #087f7244}.sync-error{min-height:20px;margin-top:7px;color:#a52e3b;font-size:10px;line-height:1.6}.ops-sheet{position:fixed;z-index:17000;inset:0;display:none;align-items:flex-end;background:#0009}.ops-sheet.show{display:flex}.ops-panel{width:100%;max-height:91vh;overflow:auto;padding:13px;border-radius:22px 22px 0 0;background:#fffaf3;color:#2b211d}.ops-head,.ops-foot{display:flex;align-items:center;justify-content:space-between;gap:7px}.ops-head{position:sticky;top:0;z-index:2;padding-bottom:8px;background:#fffaf3}.ops-tools{display:flex;gap:5px;flex-wrap:wrap}.ops-tools button,.ops-foot button{border:0;border-radius:9px;padding:8px;background:#e8efe9;color:#244c43;font-weight:900}.ops-tools .danger{background:#ffe1e4;color:#9f2836}.ops-controls{display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px;margin:4px 0 9px}.ops-controls input,.ops-controls select{min-width:0;padding:9px;border:1px solid #d6c7bb;border-radius:9px;background:#fff;color:#222}.ops-list{display:grid;gap:7px}.op-card{display:grid;grid-template-columns:42px 1fr;gap:8px;padding:8px;border:1px solid #ddcfc4;border-radius:12px;background:#fff}.op-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:11px;background:#efe6de;font-size:21px}.op-title{font-size:11px;font-weight:900}.op-meta{font-size:8px;line-height:1.7;color:#6d625b}.ops-empty{padding:28px;text-align:center;color:#7e7169}.ops-status{font-size:8px;color:#6e625b}@media(max-width:430px){.sync-actions{grid-template-columns:1fr}.sync-card .local{grid-column:auto}.ops-controls{grid-template-columns:1fr 1fr}.ops-controls input{grid-column:1/-1}}`;
    document.head.appendChild(style);
  }

  function notify() {
    listeners.forEach((listener) => {
      try { listener(session); } catch (_) {}
    });
    document.dispatchEvent(new CustomEvent('abu-bassam-auth-changed', { detail: { connected: connected() } }));
    updateStatus();
  }

  async function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      if (!client) return null;
      const result = await client.auth.getSession();
      if (result.error) throw result.error;
      session = result.data.session || null;
      client.auth.onAuthStateChange((_event, nextSession) => {
        session = nextSession || null;
        notify();
        if (session) {
          $('syncLogin')?.classList.add('hide');
          setTimeout(() => syncOperations(false), 50);
        }
      });
      notify();
      return session;
    })().catch((error) => {
      readyPromise = null;
      throw error;
    });
    return readyPromise;
  }

  function requireUser() {
    const value = user();
    if (!value) throw new Error('اربط حساب المزامنة أولًا');
    return value;
  }

  async function upsert(kind, clientId, data) {
    await ready();
    const account = requireUser();
    const row = {
      user_id: account.id,
      kind: String(kind),
      client_id: String(clientId),
      data: data && typeof data === 'object' ? data : {},
      updated_at: new Date().toISOString(),
    };
    const result = await client.from(TABLE).upsert(row, { onConflict: 'user_id,kind,client_id' });
    if (result.error) throw result.error;
    return row;
  }

  async function list(kind, limit = 1000) {
    await ready();
    const account = requireUser();
    const result = await client.from(TABLE)
      .select('kind,client_id,data,updated_at')
      .eq('user_id', account.id)
      .eq('kind', String(kind))
      .order('updated_at', { ascending: true })
      .limit(Math.max(1, Math.min(1000, Number(limit) || 1000)));
    if (result.error) throw result.error;
    return result.data || [];
  }

  async function get(kind, clientId) {
    await ready();
    const account = requireUser();
    const result = await client.from(TABLE)
      .select('kind,client_id,data,updated_at')
      .eq('user_id', account.id)
      .eq('kind', String(kind))
      .eq('client_id', String(clientId))
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data || null;
  }

  async function removeKind(kind) {
    await ready();
    const account = requireUser();
    const result = await client.from(TABLE).delete().eq('user_id', account.id).eq('kind', String(kind));
    if (result.error) throw result.error;
  }

  function objectId(value) {
    return String(value || uuid()).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 180);
  }

  async function uploadVault(id, blob, mime) {
    await ready();
    const account = requireUser();
    const path = `${account.id}/vault/${objectId(id)}`;
    const result = await client.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: mime || blob?.type || 'application/octet-stream',
      cacheControl: '3600',
    });
    if (result.error) throw result.error;
    return result.data?.path || path;
  }

  async function downloadVault(path) {
    await ready();
    requireUser();
    const result = await client.storage.from(BUCKET).download(String(path));
    if (result.error) throw result.error;
    return result.data;
  }

  async function removeVault(path) {
    if (!path) return;
    await ready();
    requireUser();
    const result = await client.storage.from(BUCKET).remove([String(path)]);
    if (result.error) throw result.error;
  }

  function buildLogin() {
    const modal = document.createElement('div');
    modal.id = 'syncLogin';
    modal.className = 'sync-login hide';
    modal.innerHTML = `<div class="sync-card"><img src="abu_bassam_icon.webp" alt="شعار المكتبة"><h2>المزامنة الآمنة</h2><p>المصمم والمبرمج: أكرم حاتم الغزالي<br>تعمل الكاميرا والطباعة والحفظ المحلي دون حساب.</p><input id="syncEmail" type="email" inputmode="email" autocomplete="email" value="${DEFAULT_EMAIL}" placeholder="البريد الإلكتروني"><input id="syncPassword" type="password" autocomplete="current-password" placeholder="كلمة مرور الحساب"><div class="sync-actions"><button id="syncSignIn">تسجيل الدخول</button><button id="syncSignUp" class="create">إنشاء حساب</button><button id="syncLocal" class="local">متابعة محليًا</button></div><p>لا تُخزن كلمة المرور. الجلسة محصورة داخل مساحة التطبيق، والملفات في حاوية خاصة محمية بـ RLS.</p><div id="syncError" class="sync-error"></div></div>`;
    document.body.appendChild(modal);
    $('syncSignIn').onclick = () => authenticate(false);
    $('syncSignUp').onclick = () => authenticate(true);
    $('syncLocal').onclick = closeLogin;
    $('syncPassword').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') authenticate(false);
    });
  }

  function authMessage(error) {
    const message = String(error?.message || error || 'تعذر الاتصال');
    if (/invalid login credentials/i.test(message)) return 'البريد أو كلمة المرور غير صحيحة.';
    if (/email not confirmed/i.test(message)) return 'أكّد الحساب من الرسالة المرسلة إلى بريدك.';
    if (/already registered/i.test(message)) return 'الحساب موجود؛ استخدم تسجيل الدخول.';
    if (/password/i.test(message) && /short|least|characters/i.test(message)) return 'استخدم كلمة مرور لا تقل عن 8 أحرف.';
    if (/fetch|network/i.test(message)) return 'تعذر الاتصال. تحقق من الإنترنت.';
    return message;
  }

  async function authenticate(create) {
    if (authBusy) return;
    const email = String($('syncEmail')?.value || '').trim().toLowerCase();
    const password = String($('syncPassword')?.value || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return void ($('syncError').textContent = 'أدخل بريدًا صحيحًا.');
    if (password.length < 8) return void ($('syncError').textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
    if (!client) return void ($('syncError').textContent = 'وحدة المزامنة غير موجودة.');
    authBusy = true;
    $('syncError').textContent = create ? 'جاري إنشاء الحساب...' : 'جاري تسجيل الدخول...';
    try {
      const result = create
        ? await client.auth.signUp({ email, password })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      $('syncPassword').value = '';
      if (result.data?.session) {
        session = result.data.session;
        $('syncError').textContent = 'تم الربط بنجاح ✓';
        notify();
        setTimeout(closeLogin, 400);
        setTimeout(() => syncOperations(true), 500);
      } else {
        $('syncError').textContent = 'تم إنشاء الحساب. أكّده من بريدك ثم سجّل الدخول.';
      }
    } catch (error) {
      $('syncError').textContent = authMessage(error);
    } finally {
      authBusy = false;
    }
  }

  function openLogin() {
    if (!$('syncLogin')) return;
    $('syncError').textContent = connected() ? `متصل: ${user()?.email || ''}` : '';
    $('syncLogin').classList.remove('hide');
  }

  function closeLogin() {
    if ($('syncPassword')) $('syncPassword').value = '';
    $('syncLogin')?.classList.add('hide');
  }

  async function logout() {
    if (!connected()) return openLogin();
    if (!confirm('فصل حساب المزامنة؟ تبقى الملفات المحلية محفوظة.')) return;
    const result = await client.auth.signOut({ scope: 'local' });
    if (result.error) return alert(authMessage(result.error));
    session = null;
    notify();
    closeOps();
  }

  function cleanOperation(value) {
    const source = value && typeof value === 'object' ? value : {};
    const allowed = ['id', 'type', 'title', 'details', 'section', 'fileName', 'index', 'uploadedAt', 'printedAt', 'paper', 'photo', 'dpi', 'deviceName'];
    const result = {};
    allowed.forEach((key) => {
      if (source[key] !== undefined && source[key] !== null) result[key] = source[key];
    });
    ['title', 'details', 'section', 'fileName', 'paper', 'photo', 'deviceName'].forEach((key) => {
      if (result[key] !== undefined) result[key] = String(result[key]).replace(/(password|كلمة\s*السر|token|رمز\s*الدخول)\s*[:=]?\s*\S+/gi, '[محجوب]').slice(0, 240);
    });
    return result;
  }

  function loadOperations() {
    try {
      let raw = localStorage.getItem(OPS_KEY);
      if (!raw) raw = localStorage.getItem('abuBassamOpsV3') || localStorage.getItem('abuBassamOpsV2') || '[]';
      const operations = JSON.parse(raw).map(cleanOperation);
      localStorage.setItem(OPS_KEY, JSON.stringify(operations));
      localStorage.removeItem('abuBassamOpsV3');
      localStorage.removeItem('abuBassamOpsV2');
      return operations;
    } catch (_) { return []; }
  }

  function saveOperations(operations) {
    localStorage.setItem(OPS_KEY, JSON.stringify(operations.map(cleanOperation).slice(0, 500)));
  }

  function addOperation(input, push = true) {
    const operation = cleanOperation(input);
    operation.id ||= uuid();
    operation.uploadedAt ||= new Date().toISOString();
    operation.deviceName ||= typeof window.AbuBassamDeviceName === 'function' ? window.AbuBassamDeviceName() : 'أكرم';
    saveOperations([operation, ...loadOperations().filter((item) => item.id !== operation.id)]);
    renderOperations();
    markPendingSync(true);
    if (push && connected() && networkAvailable()) upsert('operation', operation.id, operation).catch(() => markPendingSync(true));
  }

  const labels = { print: 'طباعة', upload: 'تصوير / رفع', gallery: 'حفظ في المعرض', pdf: 'حفظ PDF', save: 'حفظ', open: 'فتح', rename: 'إعادة تسمية', delete: 'حذف', share: 'مشاركة', backup: 'نسخة احتياطية', restore: 'استعادة', sync: 'مزامنة', settings: 'إعدادات', crop: 'قص', failure: 'فشل معالجة', card: 'كارت' };
  const icons = { print: '🖨️', upload: '📥', gallery: '🖼️', pdf: '📕', save: '💾', open: '📂', rename: '✏️', delete: '🗑️', share: '↗️', backup: '☁️', restore: '♻️', sync: '↻', settings: '⚙️', crop: '✂️', failure: '⚠️', card: '🪪' };

  function filteredOperations() {
    let operations = loadOperations();
    const query = String($('opsSearch')?.value || '').trim().toLowerCase();
    const type = $('opsFilter')?.value || '';
    const sort = $('opsSort')?.value || 'new';
    if (type) operations = operations.filter((item) => item.type === type);
    if (query) operations = operations.filter((item) => [item.title, item.details, item.section, item.fileName, item.deviceName].some((value) => String(value || '').toLowerCase().includes(query)));
    operations.sort((left, right) => {
      if (sort === 'type') return String(left.type || '').localeCompare(String(right.type || ''), 'ar');
      const order = Date.parse(left.printedAt || left.uploadedAt || 0) - Date.parse(right.printedAt || right.uploadedAt || 0);
      return sort === 'old' ? order : -order;
    });
    return operations;
  }

  function renderOperations() {
    if (!$('opsList')) return;
    const operations = filteredOperations();
    $('opsList').innerHTML = operations.length
      ? operations.map((item) => `<div class="op-card"><div class="op-icon">${icons[item.type] || '•'}</div><div><div class="op-title">${safe(item.title || labels[item.type] || 'عملية')}</div><div class="op-meta">${new Date(item.printedAt || item.uploadedAt || Date.now()).toLocaleString('ar-IQ')}${item.section ? `<br>القسم: ${safe(item.section)}` : ''}${item.fileName ? `<br>الملف: ${safe(item.fileName)}` : ''}${item.details ? `<br>${safe(item.details)}` : ''}<br>الجهاز: ${safe(item.deviceName || 'أكرم')}</div></div></div>`).join('')
      : '<div class="ops-empty">لا توجد عمليات مطابقة.</div>';
  }

  function updateStatus(message) {
    if ($('opsStatus')) $('opsStatus').textContent = message || (connected() ? `متصل آمنًا: ${user()?.email || ''}` : 'الوضع المحلي • الحساب غير مربوط');
    if ($('opsAccount')) $('opsAccount').textContent = connected() ? 'فصل الحساب' : 'ربط الحساب';
  }

  function buildOperations() {
    const top = document.querySelector('.top-actions');
    if (top) {
      const button = document.createElement('button');
      button.className = 'icon-btn';
      button.textContent = '🧾';
      button.title = 'سجل العمليات';
      button.onclick = openOperations;
      top.appendChild(button);
    }
    const sheet = document.createElement('div');
    sheet.id = 'opsSheet';
    sheet.className = 'ops-sheet';
    sheet.innerHTML = `<div class="ops-panel"><div class="ops-head"><b>🧾 سجل العمليات</b><div class="ops-tools"><button id="opsSync">↻ مزامنة</button><button id="opsCsv">CSV</button><button id="opsTxt">TXT</button><button id="opsClear" class="danger">مسح</button><button id="opsClose">×</button></div></div><div class="ops-controls"><input id="opsSearch" type="search" placeholder="بحث بالعملية أو القسم أو الملف"><select id="opsFilter"><option value="">جميع العمليات</option>${Object.entries(labels).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select><select id="opsSort"><option value="new">الأحدث</option><option value="old">الأقدم</option><option value="type">حسب النوع</option></select></div><div id="opsList" class="ops-list"></div><div class="ops-foot"><span id="opsStatus" class="ops-status">الوضع المحلي</span><button id="opsAccount">ربط الحساب</button></div></div>`;
    document.body.appendChild(sheet);
    sheet.addEventListener('click', (event) => { if (event.target === sheet) closeOps(); });
    $('opsClose').onclick = closeOps;
    $('opsSync').onclick = () => syncOperations(true);
    $('opsClear').onclick = clearOperations;
    $('opsCsv').onclick = () => exportOperations('csv');
    $('opsTxt').onclick = () => exportOperations('txt');
    $('opsAccount').onclick = () => connected() ? logout() : openLogin();
    ['opsSearch', 'opsFilter', 'opsSort'].forEach((id) => $(id).addEventListener(id === 'opsSearch' ? 'input' : 'change', renderOperations));
    renderOperations();
    updateStatus();
  }

  function openOperations() {
    renderOperations();
    $('opsSheet')?.classList.add('show');
    if (connected()) syncOperations(false);
  }

  function closeOps() { $('opsSheet')?.classList.remove('show'); }

  function exportOperations(format) {
    const operations = filteredOperations();
    if (!operations.length) return alert('لا توجد عمليات للتصدير');
    const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const content = format === 'csv'
      ? `التاريخ,النوع,العنوان,القسم,الملف,التفاصيل,الجهاز\n${operations.map((item) => [item.printedAt || item.uploadedAt, item.type, item.title || labels[item.type], item.section, item.fileName, item.details, item.deviceName].map(quote).join(',')).join('\n')}`
      : operations.map((item) => `${item.printedAt || item.uploadedAt} | ${item.title || labels[item.type]} | ${item.section || '—'} | ${item.fileName || '—'} | ${item.details || ''} | ${item.deviceName || 'أكرم'}`).join('\n');
    const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
    const data = `data:${mime};base64,${btoa(unescape(encodeURIComponent(content)))}`;
    if (window.Android?.saveBase64) Android.saveBase64(`Abu_Bassam_Operations_${Date.now()}.${format}`, mime, data);
  }

  async function syncOperations(manual = true) {
    if (!networkAvailable()) {
      markPendingSync(true);
      updateStatus('دون إنترنت • الحفظ المحلي يعمل وستتم المزامنة عند عودة الاتصال');
      return false;
    }
    if (!connected()) {
      updateStatus('اربط الحساب لتفعيل المزامنة الآمنة');
      if (manual) openLogin();
      return false;
    }
    updateStatus('جاري مزامنة السجل والإعدادات...');
    try {
      const local = loadOperations();
      await Promise.all(local.map((operation) => upsert('operation', operation.id, operation)));
      const [rows, settings] = await Promise.all([list('operation', 500), list('settings', 10)]);
      const map = new Map(local.map((operation) => [operation.id, operation]));
      rows.forEach((row) => { if (row.data?.id) map.set(row.data.id, cleanOperation(row.data)); });
      saveOperations([...map.values()].sort((left, right) => Date.parse(right.printedAt || right.uploadedAt || 0) - Date.parse(left.printedAt || left.uploadedAt || 0)));
      const shared = settings.find((row) => row.client_id === 'shared');
      if (shared?.data) localStorage.setItem('abuBassamPrintSettingsV1', JSON.stringify(shared.data));
      renderOperations();
      markPendingSync(false);
      updateStatus('تمت المزامنة الآمنة الآن ✓');
      return true;
    } catch (error) {
      markPendingSync(true);
      updateStatus('تعذرت المزامنة الآن • التغييرات محفوظة محليًا');
      if (manual) alert(authMessage(error));
      return false;
    }
  }

  async function clearOperations() {
    if (!confirm(connected() ? 'مسح السجل المحلي والسحابي؟' : 'مسح السجل المحلي؟')) return;
    saveOperations([]);
    renderOperations();
    if (connected()) {
      try { await removeKind('operation'); updateStatus('تم مسح السجل المحلي والسحابي ✓'); }
      catch (_) { updateStatus('مُسح المحلي فقط؛ تعذر الوصول للسحابة'); }
    }
  }

  function wrapActions() {
    if (window.printDirectly && !window.printDirectly.__ops) {
      const original = window.printDirectly;
      window.printDirectly = function wrappedPrint() {
        addOperation({ type: 'print', title: 'طباعة صور المعاملات', section: 'الصور', details: `${window.pageCanvases?.length || 0} صفحة`, printedAt: new Date().toISOString() });
        return original.apply(this, arguments);
      };
      window.printDirectly.__ops = true;
    }
    if (window.downloadJPG && !window.downloadJPG.__ops) {
      const original = window.downloadJPG;
      window.downloadJPG = function wrappedGallery() { addOperation({ type: 'gallery', title: 'حفظ صور المعاملات في المعرض', section: 'الصور' }); return original.apply(this, arguments); };
      window.downloadJPG.__ops = true;
    }
    if (window.downloadPDF && !window.downloadPDF.__ops) {
      const original = window.downloadPDF;
      window.downloadPDF = function wrappedPdf() { addOperation({ type: 'pdf', title: 'حفظ صور المعاملات PDF', section: 'الصور' }); return original.apply(this, arguments); };
      window.downloadPDF.__ops = true;
    }
  }

  async function pushPrintSettings() {
    if (!connected() || !networkAvailable()) { markPendingSync(true); return; }
    try {
      const raw = localStorage.getItem('abuBassamPrintSettingsV1');
      if (raw) await upsert('settings', 'shared', JSON.parse(raw));
    } catch (_) {}
  }

  function init() {
    addStyle();
    buildLogin();
    buildOperations();
    wrapActions();
    localStorage.removeItem('abuBassamSessionV2');
    localStorage.removeItem('abuBassamLocalModeV1');
    ready().then(() => { if (connected()) syncOperations(false); }).catch(() => updateStatus('تعذر التحقق من جلسة المزامنة'));
    setInterval(() => {
      wrapActions();
      if (connected() && document.visibilityState !== 'hidden') syncOperations(false);
    }, 120000);
    window.addEventListener('online', () => { if (connected()) syncOperations(false); });
    window.addEventListener('offline', () => { markPendingSync(true); updateStatus('دون إنترنت • الحفظ المحلي مستمر'); });
  }

  window.AbuBassamCloud = {
    ready,
    client,
    isConnected: connected,
    session: () => session,
    user,
    openLogin,
    logout,
    onSession(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    isOffline: () => !networkAvailable(),
    hasPendingSync: pendingSync,
    upsert,
    list,
    get,
    removeKind,
    uploadVault,
    downloadVault,
    removeVault,
  };
  window.AbuBassamOps = { add: addOperation, open: openOperations, close: closeOps, sync: () => syncOperations(true), list: loadOperations, login: openLogin, logout, isConnected: connected, pushSettings: pushPrintSettings };
  window.openOps = openOperations;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
