// Times-table statistics as pure functions, so the hub can show every child's summary
// without opening the app. Colours come from each fact's last WINDOW cold attempts.

const NasobilkaStats = (() => {
  const N = 10;
  const WINDOW = 3;          // last "cold" attempts used to judge a fact (re-asks after a mistake don't count)
  const TIME_CAP = 30000;    // an answer slower than 30 s counts as 30 s
  const DEFAULTS = { fastSec: 3, slowSec: 6, sessionLen: 20, tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], showVisual: false };

  const key = (a, b) => `${a}x${b}`;
  const median = xs => { const s = [...xs].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  function judge(list, settings) {
    const win = list.slice(-WINDOW);
    if (!win.length) return { status: 'none', n: 0 };
    const errors = win.filter(x => !x.ok).length;
    const times = win.filter(x => x.ok && x.ms != null).map(x => Math.min(x.ms, TIME_CAP));
    const med = times.length ? median(times) : null;
    const { fastSec, slowSec } = settings;
    let status = 'warn';
    if (errors >= 2 || errors === win.length || med > slowSec * 1000) status = 'bad';
    else if (errors === 0 && med != null && med <= fastSec * 1000) status = 'good';
    return { status, n: win.length, errors, med, provisional: win.length < 2 };
  }

  // Typos happen: the first mistake ever made on each fact is left out of the statistics
  // (it is still stored and shown in the fact's detail). attempts must be sorted by time.
  function ignored(attempts) {
    const seen = new Set(), out = new Set();
    for (const at of attempts) {
      if (at.retry || at.ok) continue;
      const k = key(at.a, at.b);
      if (!seen.has(k)) { seen.add(k); out.add(at); }
    }
    return out;
  }

  // `until` restricts to attempts made before that moment
  function factStats(attempts, settings, until = Infinity) {
    const groups = {}, skip = ignored(attempts);
    for (const at of attempts) {
      if (at.t > until) break;
      if (!at.retry && !skip.has(at)) (groups[key(at.a, at.b)] ||= []).push(at);
    }
    const out = {};
    for (let a = 1; a <= N; a++) for (let b = 1; b <= N; b++) out[key(a, b)] = judge(groups[key(a, b)] || [], settings);
    return out;
  }

  function count(stats) {
    const c = { good: 0, warn: 0, bad: 0, none: 0 };
    Object.values(stats).forEach(s => c[s.status]++);
    return c;
  }

  // Summary of one stored data blob (as saved by the app), or null if the child never practised.
  function summarize(raw) {
    if (!raw || !(raw.attempts || []).length) return null;
    const settings = { ...DEFAULTS, ...raw.settings };
    const attempts = [...raw.attempts].sort((x, y) => x.t - y.t);
    return { counts: count(factStats(attempts, settings)), last: attempts[attempts.length - 1].t, rounds: (raw.sessions || []).length };
  }

  return { N, WINDOW, TIME_CAP, DEFAULTS, key, median, judge, ignored, factStats, count, summarize };
})();
