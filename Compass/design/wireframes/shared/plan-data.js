/* ─────────────────────────────────────────────────────────────
   Compass · Plan — single source of truth for the whole Plan universe.
   Every Plan lens (Month · Horizon · Map) reads and writes THIS model.
   Nothing stores its own copy of tasks.

   A node is the one primitive: dream / horizon / goal / task / step
   are all just nodes at different depths of a forest.

   Node {
     id, name, parentId,           // parentId null = a root Horizon
     pillar,                        // health|inner|admin|family|joy|money|contrib
     done,                          // leaves only; parents derive progress
     bucket,                        // schedule: backlog|month|week|today  (null = unscheduled, tree-only)
     horizon,                       // roots only: 'this' | a year string | 'someday'
     notes                          // brain-dump
   }

   Cross-view sync: mutations persist to localStorage AND broadcast on a
   BroadcastChannel, so every open lens (even in another iframe) re-renders.
   ───────────────────────────────────────────────────────────── */
(function (global) {
  const KEY = 'compass.plan.v2';
  const CH = 'compass-plan';
  const channel = ('BroadcastChannel' in global) ? new BroadcastChannel(CH) : null;
  const subs = [];

  // ── seed forest (flat list; parentId links it) ──
  const SEED = [
    // ═══ Horizon: Drive own car ═══
    { id: 'car', name: 'Drive own car', parentId: null, pillar: 'admin', horizon: 'this' },
    { id: 'car-test', name: 'Pass driving test', parentId: 'car', pillar: 'admin' },
    { id: 'car-theory', name: 'Theory test', parentId: 'car-test', pillar: 'admin' },
    { id: 'car-t1', name: 'Learn 10 signs', parentId: 'car-theory', pillar: 'admin', done: true },
    { id: 'car-t2', name: 'Learn next 10 signs', parentId: 'car-theory', pillar: 'admin', done: true },
    { id: 'car-t3', name: 'Learn next 10 signs', parentId: 'car-theory', pillar: 'admin', bucket: 'week' },
    { id: 'car-prac', name: 'Practical test', parentId: 'car-test', pillar: 'admin' },
    { id: 'car-p1', name: 'Learn to pull over', parentId: 'car-prac', pillar: 'admin', bucket: 'month' },
    { id: 'car-p2', name: 'Learn to park', parentId: 'car-prac', pillar: 'admin', bucket: 'month' },
    { id: 'car-buy', name: 'Buy a car', parentId: 'car', pillar: 'money' },
    { id: 'car-b1', name: 'Research a car', parentId: 'car-buy', pillar: 'money', bucket: 'backlog' },
    { id: 'car-b2', name: 'Buy the car', parentId: 'car-buy', pillar: 'money' },

    // ═══ Horizon: Buy land ═══
    { id: 'land', name: 'Buy land', parentId: null, pillar: 'money', horizon: 'this' },
    { id: 'land-mort', name: 'Sort financing', parentId: 'land', pillar: 'money' },
    { id: 'land-m1', name: 'Research mortgages', parentId: 'land-mort', pillar: 'admin', bucket: 'today' },
    { id: 'land-m2', name: 'Compare loan types', parentId: 'land-mort', pillar: 'money', bucket: 'backlog' },
    { id: 'land-m3', name: 'Check credit score', parentId: 'land-mort', pillar: 'money', done: true },
    { id: 'land-find', name: 'Find the plot', parentId: 'land', pillar: 'admin' },
    { id: 'land-f1', name: 'View 3 plots', parentId: 'land-find', pillar: 'admin', bucket: 'month' },
    { id: 'land-f2', name: 'Shortlist solicitors', parentId: 'land-find', pillar: 'admin', bucket: 'backlog' },

    // ═══ Horizon: Learn Spanish (someday) ═══
    { id: 'spanish', name: 'Learn Spanish', parentId: null, pillar: 'joy', horizon: 'someday' },
    { id: 'sp-1', name: 'Finish basics course', parentId: 'spanish', pillar: 'joy', done: true },
    { id: 'sp-2', name: 'Hold a 5-min conversation', parentId: 'spanish', pillar: 'joy', bucket: 'backlog' },

    // ═══ Horizon: Home renovation (later year) ═══
    { id: 'reno', name: 'Home renovation', parentId: null, pillar: 'admin', horizon: '2027' },
    { id: 'reno-1', name: 'Get 3 quotes', parentId: 'reno', pillar: 'admin', bucket: 'backlog' },
    { id: 'reno-2', name: 'Draw up plans', parentId: 'reno', pillar: 'admin' },
  ];

  let nodes = load();

  function load() {
    try {
      const raw = global.localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return SEED.map(n => Object.assign({}, n));
  }
  function persist() {
    try { global.localStorage.setItem(KEY, JSON.stringify(nodes)); } catch (e) { /* ignore */ }
  }
  function announce(local) {
    persist();
    subs.forEach(fn => { try { fn(); } catch (e) {} });
    if (local && channel) channel.postMessage('changed');
  }
  // another lens changed the model → reload + re-render here
  if (channel) channel.onmessage = () => { nodes = load(); subs.forEach(fn => { try { fn(); } catch (e) {} }); };
  global.addEventListener('storage', e => { if (e.key === KEY) { nodes = load(); subs.forEach(fn => { try { fn(); } catch (e) {} }); } });

  // ── reads ──
  const byId = id => nodes.find(n => n.id === id) || null;
  const children = id => nodes.filter(n => n.parentId === id);
  const roots = () => nodes.filter(n => n.parentId == null);
  const isLeaf = n => children(n.id).length === 0;

  function leaves(id) {
    const kids = children(id);
    if (!kids.length) { const n = byId(id); return n ? [n] : []; }
    return kids.flatMap(k => leaves(k.id));
  }
  function progress(id) {
    const ls = leaves(id);
    const done = ls.filter(l => l.done).length;
    return { done, total: ls.length, pct: ls.length ? done / ls.length : 0 };
  }
  // the root Horizon a node belongs to
  function rootOf(id) {
    let n = byId(id);
    while (n && n.parentId != null) n = byId(n.parentId);
    return n;
  }
  // leaves that are scheduled onto the Month board
  const scheduled = bucket => nodes.filter(n => isLeaf(n) && !n.done && n.bucket === bucket);
  const doneCards = () => nodes.filter(n => isLeaf(n) && n.done && n.bucket != null);

  // ── writes ──
  function toggleDone(id) {
    const n = byId(id); if (!n) return;
    n.done = !n.done;
    if (n.done && n.bucket == null) n.bucket = 'today'; // completing a tree-only leaf still records it
    announce(true);
  }
  function setBucket(id, bucket) { const n = byId(id); if (n) { n.bucket = bucket; announce(true); } }
  function setDone(id, v) { const n = byId(id); if (n) { n.done = !!v; announce(true); } }
  function rename(id, name) { const n = byId(id); if (n && name.trim()) { n.name = name.trim(); announce(true); } }
  function setNotes(id, notes) { const n = byId(id); if (n) { n.notes = notes; announce(true); } }
  function setHorizon(id, h) { const n = byId(id); if (n) { n.horizon = h; announce(true); } }
  function update(id, patch) { const n = byId(id); if (n) { Object.assign(n, patch); announce(true); } }

  let seq = 1;
  function addChild(parentId, name, extra) {
    const id = 'n' + Date.now().toString(36) + (seq++);
    const parent = byId(parentId);
    const node = Object.assign({ id, name: name || 'New step', parentId, pillar: parent ? parent.pillar : 'admin' }, extra || {});
    nodes.push(node); announce(true); return id;
  }
  function addRoot(name, extra) {
    const id = 'h' + Date.now().toString(36) + (seq++);
    nodes.push(Object.assign({ id, name: name || 'New horizon', parentId: null, pillar: 'admin', horizon: 'this' }, extra || {}));
    announce(true); return id;
  }
  function remove(id) {
    const kill = new Set([id]);
    let grew = true;
    while (grew) { grew = false; nodes.forEach(n => { if (n.parentId && kill.has(n.parentId) && !kill.has(n.id)) { kill.add(n.id); grew = true; } }); }
    nodes = nodes.filter(n => !kill.has(n.id));
    announce(true);
  }
  function reset() { nodes = SEED.map(n => Object.assign({}, n)); announce(true); }

  function subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }

  global.PlanData = {
    BUCKETS: ['backlog', 'month', 'week', 'today'],
    BUCKET_LABEL: { backlog: 'Backlog', month: 'This month', week: 'This week', today: 'Today', done: 'Done' },
    PILLAR_VAR: { health: '--p-health', inner: '--p-inner', admin: '--p-admin', family: '--p-family', joy: '--p-joy', money: '--p-money', contrib: '--p-contrib' },
    all: () => nodes, byId, children, roots, isLeaf, leaves, progress, rootOf,
    scheduled, doneCards,
    toggleDone, setDone, setBucket, rename, setNotes, setHorizon, update,
    addChild, addRoot, remove, reset, subscribe
  };
})(window);
