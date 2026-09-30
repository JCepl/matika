// Shared core for the Matika app collection: storage, profiles, language, backup, sync.
// Every app loads this first and keeps its data under the current profile.
//
// Convention for app data (needed by sync): arrays hold append-only records (never edited),
// each with a unique `id` or time `t`, and a time `t` or `end`; other fields are per-device settings.
// App names contain no "_".

const Matika = (() => {
  'use strict';
  const NS = 'matika:v1:';

  // ---- storage (localStorage can be blocked or full, so never throw) ----
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(NS + key);
        return v == null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(NS + key, JSON.stringify(value)); return true; }
      catch { return false; }
    },
    remove(key) { try { localStorage.removeItem(NS + key); } catch { /* ignore */ } },
    keys() {
      try { return Object.keys(localStorage).filter(k => k.startsWith(NS)).map(k => k.slice(NS.length)); }
      catch { return []; }
    },
  };

  // ---- profiles (one per child) ----
  const profiles = () => store.get('profiles', []);
  const current = () => profiles().find(p => p.id === store.get('current', null)) || null;
  const setCurrent = id => store.set('current', id);

  function addProfile(name) {
    const p = { id: 'p' + Date.now().toString(36), name: name.trim(), created: Date.now() };
    store.set('profiles', [...profiles(), p]);
    setCurrent(p.id);
    return p;
  }

  function removeProfile(id) {
    store.set('profiles', profiles().filter(p => p.id !== id));
    store.set('ignored', [...store.get('ignored', []), id]);   // don't let sync bring it back
    store.keys().filter(k => k.startsWith(`data:${id}:`)).forEach(store.remove);
    if (store.get('current', null) === id) setCurrent(profiles()[0]?.id ?? null);
  }

  // Apps call this on load; without a chosen profile they send the user to the hub.
  function requireProfile(hubUrl) {
    const p = current();
    if (!p) location.href = hubUrl;
    return p;
  }

  // ---- per-profile app data ----
  const load = (app, fallback) => {
    const p = current();
    return p ? store.get(`data:${p.id}:${app}`, fallback) : fallback;
  };
  const save = (app, data) => {
    const p = current();
    return p ? store.set(`data:${p.id}:${app}`, data) : false;
  };
  const clear = app => { const p = current(); if (p) store.remove(`data:${p.id}:${app}`); };

  // ---- language ----
  const dict = { cs: {}, en: {} };
  const addStrings = d => { for (const l in d) Object.assign(dict[l] ||= {}, d[l]); };
  const lang = () => store.get('lang', 'cs');
  const setLang = l => { store.set('lang', l); document.documentElement.lang = l; };

  function t(key, vars) {
    let s = dict[lang()]?.[key] ?? dict.cs[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    return s;
  }

  function applyI18n(root = document) {
    document.documentElement.lang = lang();
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  }

  // Czech uses a decimal comma; toLocaleString handles it.
  const fmt = (n, digits = 1) => n.toLocaleString(lang() === 'cs' ? 'cs-CZ' : 'en-GB',
    { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const fmtDate = ts => new Date(ts).toLocaleDateString(lang() === 'cs' ? 'cs-CZ' : 'en-GB',
    { day: 'numeric', month: 'numeric' });

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- backup: everything (all profiles, all apps) in one JSON file ----
  function exportAll() {
    const data = {};
    store.keys().filter(k => !DEVICE_ONLY.includes(k)).forEach(k => { data[k] = store.get(k); });
    const blob = new Blob([JSON.stringify({ app: 'matika', version: 1, exported: new Date().toISOString(), data }, null, 1)],
      { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `matika-zaloha-${new Date().toISOString().slice(0, 10)}.json`,
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function importAll(text) {
    const parsed = JSON.parse(text);
    if (parsed?.app !== 'matika' || typeof parsed.data !== 'object') throw new Error('not a Matika backup');
    store.keys().filter(k => !DEVICE_ONLY.includes(k)).forEach(store.remove);
    for (const [k, v] of Object.entries(parsed.data)) if (!DEVICE_ONLY.includes(k)) store.set(k, v);
  }

  // ---- sync: records go to a Google Sheet through a small Apps Script web app (sheets/Code.gs) ----
  // Sync = pull everything, merge, push what the sheet lacks. Records are only ever added, so
  // merging is a union keyed by `id` or `t`; every device ends up with everything.
  // Sheet tab per record type: "<app>_<array name>", e.g. nasobilka_attempts.
  const DEVICE_ONLY = ['sync'];   // the sheet link stays on this device, never in backups
  const syncConfig = () => store.get('sync', null);
  const setSyncConfig = cfg => (cfg ? store.set('sync', cfg) : store.remove('sync'));

  const recId = x => x.id ?? x.t;
  const when = x => x.t ?? x.end ?? 0;

  function mergeRecords(mine = [], theirs = [], resetAt = 0) {
    const all = new Map();
    [...theirs, ...mine].forEach(x => all.set(recId(x), x));
    return [...all.values()].filter(x => when(x) > resetAt).sort((x, y) => when(x) - when(y));
  }

  async function sheetFetch(url, body) {
    // text/plain keeps it a "simple" request: Apps Script can't answer CORS preflights
    const res = await fetch(url, body
      ? { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }
      : { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json().catch(() => { throw new Error('not the Matika script'); });
    if (json.ok === false) throw new Error(json.error || 'sheet error');
    return json;
  }

  let running = null;
  const sync = () => (running ||= runSync().finally(() => { running = null; }));

  async function runSync() {
    const cfg = syncConfig();
    if (!cfg?.url) return { ok: false, skipped: true };
    try {
      const remote = await sheetFetch(cfg.url);
      const rProfiles = remote.profiles || [];
      const rRecords = remote.records || {};
      const ignored = store.get('ignored', []);

      for (const rp of rProfiles) {               // children set up on another device
        if (ignored.includes(rp.id) || profiles().some(p => p.id === rp.id)) continue;
        store.set('profiles', [...profiles(), { id: rp.id, name: rp.name, created: rp.created }]);
        if (!current()) setCurrent(rp.id);
      }

      for (const p of profiles()) {
        const rp = rProfiles.find(x => x.id === p.id);
        const resets = { ...rp?.resets };
        const push = {};
        const localApps = store.keys().filter(k => k.startsWith(`data:${p.id}:`)).map(k => k.split(':')[2]);
        const sheetApps = Object.keys(rRecords).map(n => n.slice(0, n.indexOf('_')));

        for (const app of new Set([...localApps, ...sheetApps])) {
          const local = store.get(`data:${p.id}:${app}`, null);
          const merged = { ...local };
          const resetAt = Math.max(local?.resetAt || 0, resets[app] || 0);
          if (resetAt) merged.resetAt = resets[app] = resetAt;
          const kinds = new Set([
            ...Object.keys(local || {}).filter(k => Array.isArray(local[k])),
            ...Object.keys(rRecords).filter(n => n.startsWith(app + '_')).map(n => n.slice(app.length + 1)),
          ]);
          for (const kind of kinds) {
            const theirs = (rRecords[`${app}_${kind}`] || []).filter(r => r._p === p.id).map(({ _p, ...r }) => r);
            const have = new Set(theirs.map(recId));
            const mine = local?.[kind] || [];
            const missing = mine.filter(r => !have.has(recId(r)) && when(r) > resetAt);
            if (missing.length) push[`${app}_${kind}`] = missing;
            merged[kind] = mergeRecords(mine, theirs, resetAt);
          }
          if (kinds.size && JSON.stringify(merged) !== JSON.stringify(local)) store.set(`data:${p.id}:${app}`, merged);
        }

        const profileChanged = !rp || rp.name !== p.name || JSON.stringify(rp.resets || {}) !== JSON.stringify(resets);
        if (Object.keys(push).length || profileChanged) {
          await sheetFetch(cfg.url, { profile: { id: p.id, name: p.name, created: p.created }, resets, records: push });
        }
      }
      setSyncConfig({ ...syncConfig(), last: Date.now(), error: null });
      return { ok: true };
    } catch (e) {
      if (syncConfig()) setSyncConfig({ ...syncConfig(), error: String(e.message || e) });
      return { ok: false, error: e };
    }
  }

  // A setup link (…/index.html#sheet=<script url>) connects a new device in one tap; the hash never reaches a server.
  function syncFromHash() {
    const url = new URLSearchParams(location.hash.slice(1)).get('sheet');
    if (!url) return false;
    setSyncConfig({ url });
    history.replaceState(null, '', location.pathname);
    return true;
  }
  const setupLink = () => {
    const cfg = syncConfig();
    return cfg && `${new URL('index.html', root)}#${new URLSearchParams({ sheet: cfg.url })}`;
  };

  // ---- installable app (PWA): offline cache, and ask the browser not to evict our data ----
  const root = new URL('../', document.currentScript.src);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register(new URL('sw.js', root), { scope: root.pathname }).catch(() => {});
  }
  navigator.storage?.persist?.().catch(() => {});

  return {
    profiles, current, setCurrent, addProfile, removeProfile, requireProfile,
    load, save, clear, addStrings, lang, setLang, t, applyI18n, fmt, fmtDate, esc,
    exportAll, importAll, syncConfig, setSyncConfig, sync, syncFromHash, setupLink,
  };
})();
