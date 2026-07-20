/* ─────────────────────────────────────────────────────────────
   Compass · Plan v4 — single source of truth for Flow, Goals, Map.

   Node {
     id, name, parentId         tree structure (null = root)
     pillars: string[]          life areas — replaces single `pillar`
     done: boolean              leaves only; parents derive from children
     bucket: string|null        scope: someday|year|month|week|today|null
     date: string|null          ISO date (optional)
     time: string|null          HH:MM (optional)
     notes: string|null
     postponed: number
     energyLevel: H|M|L|null
     doneWhen: string|null      completion criterion
     completedDate: string|null auto-set when done

     strategy: string|null      roots — line of behavior
     keyFactor: string|null     key success factor
     leverageNote: string|null  what single acquisition unlocks this
     controlFactor: string|null
     leverages: {knowledge,network,resources,time,reputation:bool}|null
   }

   Store { nodes, mission, reviews[] }
   Reviews { id, date, type:weekly|monthly, pillarsActive[], pillarsMissing[],
             doneCount, stalled, nextWeek, energy:1-5, insight }

   Cross-view sync: localStorage + BroadcastChannel.
   ───────────────────────────────────────────────────────────── */
(function (global) {
  const KEY = 'compass.plan.v4';
  const CH  = 'compass-plan';
  const channel = ('BroadcastChannel' in global) ? new BroadcastChannel(CH) : null;
  const subs = [];

  // ── constants ──────────────────────────────────────────────────
  const PILLARS      = ['health','inner','admin','family','joy','money','contrib'];
  const PILLAR_VAR   = { health:'--p-health', inner:'--p-inner', admin:'--p-admin', family:'--p-family', joy:'--p-joy', money:'--p-money', contrib:'--p-contrib' };
  const PILLAR_LABEL = { health:'Health', inner:'Inner', admin:'Admin', family:'Family', joy:'Joy', money:'Money', contrib:'Contrib' };
  const SCOPES       = ['someday','year','month','week','today'];
  const SCOPE_LABEL  = { someday:'Someday', year:'This Year', month:'This Month', week:'This Week', today:'Today', done:'Done' };

  // ── seed data ──────────────────────────────────────────────────
  // Spanish has 6 consecutive weeks of completions → triggers compound insight
  // Buy land last completed 25+ days ago → triggers stalled insight
  // "Review insurance" postponed 2× → triggers postponement insight
  // Reviews energy 5→4→3 → triggers declining energy insight
  const SEED_NODES = [
    // ═══ Goal: Drive own car ═══
    { id:'car',      name:'Drive own car',       parentId:null,     pillars:['admin'],
      strategy:'Pass the test before thinking about which car to buy.',
      keyFactor:'Consistent weekly lessons with the same instructor.',
      leverageNote:'Find an instructor who does intensive crash courses.',
      leverages:{ knowledge:true, time:true, network:false, resources:false, reputation:false } },
    { id:'car-test', name:'Pass driving test',   parentId:'car',      pillars:['admin'] },
    { id:'car-theory',name:'Theory test',        parentId:'car-test', pillars:['admin'] },
    { id:'car-t1',   name:'Learn 10 road signs', parentId:'car-theory',pillars:['admin'], done:true, completedDate:'2026-06-20', energyLevel:'L' },
    { id:'car-t2',   name:'Learn next 10 road signs',parentId:'car-theory',pillars:['admin'], done:true, completedDate:'2026-06-27', energyLevel:'L' },
    { id:'car-t3',   name:'Learn final 10 road signs',parentId:'car-theory',pillars:['admin'], bucket:'week', date:'2026-07-11', energyLevel:'L', doneWhen:'All 30 signs recalled without prompts' },
    { id:'car-prac', name:'Practical test',      parentId:'car-test', pillars:['admin'] },
    { id:'car-p1',   name:'Learn to pull over safely',parentId:'car-prac',pillars:['admin'], bucket:'month', date:'2026-07-18', energyLevel:'M' },
    { id:'car-p2',   name:'Learn to parallel park',   parentId:'car-prac',pillars:['admin'], bucket:'month', date:'2026-07-22', energyLevel:'M' },
    { id:'car-buy',  name:'Buy a car',           parentId:'car',      pillars:['money','admin'] },
    { id:'car-b1',   name:'Research car options',parentId:'car-buy',  pillars:['admin'], bucket:'month' },
    { id:'car-b2',   name:'Buy the car',         parentId:'car-buy',  pillars:['money'] },

    // ═══ Goal: Buy land ═══  (last completion 25+ days ago → stalled)
    { id:'land',     name:'Buy land',            parentId:null, pillars:['money'],
      strategy:'Secure financing before looking at any plots.',
      keyFactor:'A mortgage in principle from at least two lenders.',
      leverageNote:'A broker who specialises in rural or agricultural land.' },
    { id:'land-mort',name:'Sort financing',      parentId:'land',      pillars:['money','admin'] },
    { id:'land-m1',  name:'Research mortgage types',parentId:'land-mort',pillars:['admin'], done:true, completedDate:'2026-06-12' },
    { id:'land-m2',  name:'Compare loan options',parentId:'land-mort', pillars:['money'], bucket:'month', date:'2026-07-05', postponed:3, energyLevel:'H', doneWhen:'Compared at least 3 lenders on rate + fees' },
    { id:'land-m3',  name:'Check credit score',  parentId:'land-mort', pillars:['money'], done:true, completedDate:'2026-06-15' },
    { id:'land-find',name:'Find the plot',       parentId:'land',      pillars:['admin'] },
    { id:'land-f1',  name:'View 3 plots',        parentId:'land-find', pillars:['admin'], bucket:'year', date:'2026-08-15' },
    { id:'land-f2',  name:'Shortlist solicitors',parentId:'land-find', pillars:['admin'], bucket:'year' },

    // ═══ Goal: Learn Spanish ═══  (6 consecutive weeks → compound momentum)
    { id:'spanish',  name:'Learn Spanish',       parentId:null, pillars:['joy'],
      strategy:'Daily 20-min sessions beat weekly cramming every time.',
      keyFactor:'10 minutes every single morning before anything else.' },
    { id:'sp-1',     name:'Complete basics course',  parentId:'spanish',pillars:['joy'], done:true, completedDate:'2026-06-06' },
    { id:'sp-3',     name:'Learn 50 core words',     parentId:'spanish',pillars:['joy'], done:true, completedDate:'2026-06-13' },
    { id:'sp-4',     name:'Learn 50 more words',     parentId:'spanish',pillars:['joy'], done:true, completedDate:'2026-06-20' },
    { id:'sp-5',     name:'Complete lesson pack 2',  parentId:'spanish',pillars:['joy'], done:true, completedDate:'2026-06-27' },
    { id:'sp-6',     name:'Hold a 2-min conversation',parentId:'spanish',pillars:['joy'], done:true, completedDate:'2026-07-04' },
    { id:'sp-7',     name:'Learn past tense basics', parentId:'spanish',pillars:['joy'], done:true, completedDate:'2026-07-10' },
    { id:'sp-2',     name:'Hold a 5-min conversation',parentId:'spanish',pillars:['joy'], bucket:'week', energyLevel:'M' },

    // ═══ Goal: Better relationship with daughter ═══
    { id:'daughter', name:'Better relationship with daughter',parentId:null,pillars:['family'],
      strategy:'One uninterrupted hour every week, her choice of activity.' },
    { id:'dau-1',    name:'Weekly walk together', parentId:'daughter',pillars:['family'], done:true, completedDate:'2026-07-05' },
    { id:'dau-2',    name:'Cook a meal together', parentId:'daughter',pillars:['family'], bucket:'week', energyLevel:'L' },
    { id:'dau-3',    name:'Plan a day out',        parentId:'daughter',pillars:['family'], bucket:'month' },

    // ═══ Goal: Home renovation (2027) ═══
    { id:'reno',     name:'Home renovation',      parentId:null,pillars:['admin'] },
    { id:'reno-1',   name:'Get 3 quotes',          parentId:'reno',pillars:['admin'], bucket:'year', date:'2027-03-01' },
    { id:'reno-2',   name:'Draw up plans',         parentId:'reno',pillars:['admin'], date:'2027-05-01' },

    // ═══ Standalone tasks (no parent, no children — Flow only) ═══
    { id:'st-dentist', name:'Book dentist appointment', parentId:null,pillars:['health'], bucket:'week', energyLevel:'L', doneWhen:'Appointment confirmed in calendar' },
    { id:'st-insure',  name:'Review home insurance',    parentId:null,pillars:['money'], bucket:'month', postponed:2, energyLevel:'M' },
    { id:'st-birthday',name:'Order birthday card for mum',parentId:null,pillars:['family'], bucket:'today', energyLevel:'L' },

    // ═══ Completed historical goals ═══
    { id:'h2021',    name:'Graduate university',  parentId:null,pillars:['inner'] },
    { id:'h2021-1',  name:'Submit dissertation',  parentId:'h2021',pillars:['inner'], done:true, completedDate:'2021-06-15', date:'2021-06-15' },
    { id:'h2022',    name:'Start first job',       parentId:null,pillars:['admin'] },
    { id:'h2022-1',  name:'Pass probation',        parentId:'h2022',pillars:['admin'], done:true, completedDate:'2022-09-01', date:'2022-09-01' },
    { id:'h2023',    name:'Move to new city',      parentId:null,pillars:['family','admin'] },
    { id:'h2023-1',  name:'Find a flat',           parentId:'h2023',pillars:['admin'], done:true, completedDate:'2023-04-10', date:'2023-04-10' },
    { id:'h2024',    name:'Run a half marathon',   parentId:null,pillars:['health'] },
    { id:'h2024-1',  name:'Complete training plan',parentId:'h2024',pillars:['health'], done:true, completedDate:'2024-10-20', date:'2024-10-20' },
    { id:'h2025',    name:'Save emergency fund',   parentId:null,pillars:['money'] },
    { id:'h2025-1',  name:'Reach £5k saved',       parentId:'h2025',pillars:['money'], done:true, completedDate:'2025-12-01', date:'2025-12-01' },

    // ═══ Future goals ═══
    { id:'h2028',    name:'Start a family',        parentId:null,pillars:['family'] },
    { id:'h2028-1',  name:'Settle into family home',parentId:'h2028',pillars:['family'], date:'2028-06-01' },
    { id:'h2029',    name:'Build a workshop',      parentId:null,pillars:['joy'] },
    { id:'h2029-1',  name:'Design the layout',     parentId:'h2029',pillars:['joy'], date:'2029-03-01' },
  ];

  const SEED_MISSION = 'Build a quiet life rooted in land, craft and family.';

  // Energy 5→4→3 across 3 weeks → triggers declining energy insight
  const SEED_REVIEWS = [
    { id:'rev3', date:'2026-06-19', type:'weekly',
      pillarsActive:['joy','admin'], pillarsMissing:['health','inner','family','money','contrib'],
      doneCount:5, stalled:'', nextWeek:'Keep up Spanish, start mortgage research', energy:5, insight:'' },
    { id:'rev2', date:'2026-06-26', type:'weekly',
      pillarsActive:['admin','joy'], pillarsMissing:['health','inner','family','money','contrib'],
      doneCount:7, stalled:'Compare loan options keeps slipping', nextWeek:'Driving lesson, Spanish', energy:4, insight:'' },
    { id:'rev1', date:'2026-07-03', type:'weekly',
      pillarsActive:['admin','joy','family'], pillarsMissing:['health','inner','money','contrib'],
      doneCount:6, stalled:'Land stuff stalled — need to book a broker call', nextWeek:'Driving + daughter walk', energy:3, insight:'' },
  ];

  // ── load / persist / announce ──────────────────────────────────
  function freshStore() {
    return {
      nodes:   SEED_NODES.map(n => Object.assign({}, n)),
      mission: SEED_MISSION,
      reviews: SEED_REVIEWS.map(r => Object.assign({}, r)),
    };
  }
  function loadStore() {
    try {
      const raw = global.localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return freshStore();
  }
  function reloadAll() {
    const s = loadStore();
    nodes   = s.nodes   || freshStore().nodes;
    mission = s.mission != null ? s.mission : SEED_MISSION;
    reviews = s.reviews || [];
  }

  let s0      = loadStore();
  let nodes   = s0.nodes;
  let mission = s0.mission != null ? s0.mission : SEED_MISSION;
  let reviews = s0.reviews || [];

  function persist() {
    try { global.localStorage.setItem(KEY, JSON.stringify({ nodes, mission, reviews })); } catch (e) { /* ignore */ }
  }
  function announce(local) {
    persist();
    subs.forEach(fn => { try { fn(); } catch (e) {} });
    if (local && channel) channel.postMessage('changed');
  }
  if (channel) channel.onmessage = () => { reloadAll(); subs.forEach(fn => { try { fn(); } catch (e) {} }); };
  global.addEventListener('storage', e => { if (e.key === KEY) { reloadAll(); subs.forEach(fn => { try { fn(); } catch (e) {} }); } });

  // ── tree helpers ───────────────────────────────────────────────
  const byId     = id  => nodes.find(n => n.id === id) || null;
  const children = id  => nodes.filter(n => n.parentId === id);
  const roots    = ()  => nodes.filter(n => n.parentId == null);
  const isLeaf   = n   => children(n.id).length === 0;

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
  function rootOf(id) {
    let n = byId(id);
    while (n && n.parentId != null) n = byId(n.parentId);
    return n;
  }
  function latestDate(id) {
    const n = byId(id); if (!n) return null;
    const kids = children(id);
    if (!kids.length) return n.date || null;
    const dates = kids.map(k => latestDate(k.id)).filter(Boolean);
    if (n.date) dates.push(n.date);
    return dates.length ? dates.sort().pop() : null;
  }
  function timeBand(id) {
    // Returns 'this' for current year, 'someday' for undated, or year-string
    const root = byId(id); if (!root) return 'someday';
    // explicit someday horizon overrides date derivation
    if (root.horizon === 'someday') return 'someday';
    const d = latestDate(id);
    if (!d) return 'someday';
    const year = parseInt(d.split('-')[0]);
    const cur  = new Date().getFullYear();
    if (year === cur) return 'this';
    return String(year);
  }

  // ── queries ────────────────────────────────────────────────────
  const goals          = ()     => roots().filter(r => children(r.id).length > 0);
  const standalones    = ()     => roots().filter(r => children(r.id).length === 0);
  const completedGoals = ()     => goals().filter(g => { const p = progress(g.id); return p.total > 0 && p.pct === 1; });
  const activeGoals    = ()     => goals().filter(g => progress(g.id).pct < 1);
  const boardItems     = scope  => nodes.filter(n => isLeaf(n) && !n.done && n.bucket === scope);
  const laterItems     = ()     => nodes.filter(n => isLeaf(n) && !n.done && (n.bucket === 'year' || n.bucket === 'someday'));
  const doneCards      = ()     => nodes.filter(n => isLeaf(n) && n.done && n.bucket != null);

  // Completions per pillar within a date range (inclusive)
  function pillarActivity(startDate, endDate) {
    const counts = {};
    PILLARS.forEach(p => counts[p] = 0);
    nodes.forEach(n => {
      if (!n.done || !n.completedDate) return;
      if (startDate && n.completedDate < startDate) return;
      if (endDate   && n.completedDate > endDate)   return;
      (n.pillars || []).forEach(p => { if (counts[p] != null) counts[p]++; });
    });
    return counts;
  }

  // Goals with no leaf completion in 21+ days
  function stalledGoals() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 21);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return activeGoals().filter(g => {
      const done = leaves(g.id).filter(l => l.done && l.completedDate);
      if (!done.length) return true;
      return done.map(l => l.completedDate).sort().pop() < cutoffStr;
    });
  }

  // Monday-of-week for an ISO date string
  function weekStart(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d.toISOString().slice(0, 10);
  }

  // Number of consecutive calendar weeks (ending now) with ≥1 completion
  function consecutiveWeeks(goalId) {
    const done = leaves(goalId).filter(l => l.done && l.completedDate);
    if (!done.length) return 0;
    const weekSet = new Set(done.map(l => weekStart(l.completedDate)));
    const sorted  = [...weekSet].sort().reverse();
    let count = 1, prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(prev + 'T00:00:00') - new Date(sorted[i] + 'T00:00:00')) / (7 * 24 * 60 * 60 * 1000);
      if (Math.round(diff) === 1) { count++; prev = sorted[i]; } else break;
    }
    return count;
  }

  // Completions per leaf per week for the last N weeks (trend data)
  function weeklyCompletions(numWeeks) {
    const result = [];
    const now = new Date();
    for (let i = numWeeks - 1; i >= 0; i--) {
      const end   = new Date(now); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      const count = nodes.filter(n => n.done && n.completedDate >= s && n.completedDate <= e).length;
      result.push({ startStr: s, endStr: e, count });
    }
    return result;
  }

  // Completed items in a given year (for archive)
  const yearArchive = year => nodes.filter(n => n.done && n.completedDate && n.completedDate.startsWith(String(year)));

  // Pillars with zero activity all year (annual check)
  function annualPillarCoverage(year) {
    const counts = pillarActivity(year + '-01-01', year + '-12-31');
    return PILLARS.filter(p => counts[p] === 0);
  }

  // ── pattern detection engine ───────────────────────────────────
  // Returns array sorted red → amber → green, max 5 by default (caller can slice)
  function detectInsights() {
    const ins = [];
    const ORDER = { red: 0, amber: 1, green: 2 };

    // 1. Compound momentum: 4+ consecutive weeks
    activeGoals().forEach(g => {
      const wks = consecutiveWeeks(g.id);
      if (wks >= 4) {
        ins.push({ type:'compound', severity:'green',
          title:'Steady progress',
          body: `${g.name}: ${wks} week${wks > 1 ? 's' : ''} in a row. ` +
                (wks < 8 ? 'You\'re in the early phase — results are building even if they\'re not visible yet. Keep the line.'
                         : 'This is compounding. Each step adds to the last.'),
          actionLabel:'See in Goals', action:'goal', targetId: g.id, principle:'compound' });
      }
    });

    // 2. Consistency win: exactly 3 consecutive weeks
    activeGoals().forEach(g => {
      if (consecutiveWeeks(g.id) === 3) {
        ins.push({ type:'consistency', severity:'green',
          title:'3 weeks in a row',
          body: `${g.name}: three consecutive weeks with a step forward. Small + consistent beats big + sporadic — every time.`,
          actionLabel:'See in Goals', action:'goal', targetId: g.id, principle:'1percent' });
      }
    });

    // 3. Velocity trend: completions/week up 3 weeks running
    const wkData = weeklyCompletions(4);
    if (wkData.length >= 3) {
      const r = wkData.slice(-3).map(w => w.count);
      if (r[2] > r[1] && r[1] > r[0] && r[2] >= 4) {
        ins.push({ type:'velocity', severity:'green',
          title:'Rhythm building',
          body: `${r[2]} completions last week, up from ${r[1]}. Your rhythm is growing.`,
          actionLabel: null, action: null, targetId: null, principle:'kaizen' });
      }
    }

    // 4. Postponed 2+ times
    nodes.filter(n => isLeaf(n) && !n.done && (n.postponed || 0) >= 2).forEach(n => {
      ins.push({ type:'postponed', severity:'amber',
        title:'Needs a decision',
        body: `"${n.name}" postponed ${n.postponed}×. Options: shrink it to the smallest possible version, find the missing lever, or let it go for now.`,
        actionLabel:'Open task', action:'task', targetId: n.id, principle:'kaizen' });
    });

    // 5. Goal-pillar gap: active goal pillar with 0 completions in 14 days
    const cutoff14 = new Date(); cutoff14.setDate(cutoff14.getDate() - 14);
    const c14 = cutoff14.toISOString().slice(0, 10);
    const recentPillars = new Set(nodes.filter(n => n.done && n.completedDate >= c14).flatMap(n => n.pillars || []));
    const flaggedPillars = new Set();
    activeGoals().forEach(g => {
      (g.pillars || []).forEach(p => {
        if (!recentPillars.has(p) && !flaggedPillars.has(p)) {
          flaggedPillars.add(p);
          ins.push({ type:'pillarGap', severity:'amber',
            title:'Goal waiting for a step',
            body: `You have ${PILLAR_LABEL[p] || p} goals but nothing moved there in 2 weeks. One small step keeps the line alive.`,
            actionLabel:'Add a step', action:'addTask', targetId: g.id, principle:'kaizen' });
        }
      });
    });

    // 6. Stalled goals: 21+ days no movement
    stalledGoals().forEach(g => {
      ins.push({ type:'stalled', severity:'red',
        title:'This has been quiet',
        body: `"${g.name}" hasn't moved in a while. What would help it move? Which lever is missing — knowledge, a connection, resources, time, or reputation?`,
        actionLabel:'Open goal', action:'goal', targetId: g.id, principle:'leverage' });
    });

    // 7. Overload: 5+ today or 10+ this week
    const todayN = boardItems('today').length;
    const weekN  = boardItems('week').length + todayN;
    if (todayN >= 5) {
      ins.push({ type:'overload', severity:'amber',
        title:'Hands very full today',
        body: `You have ${todayN} items in Today. If you complete 3 meaningful things, that is an excellent day. Which 3?`,
        actionLabel:'Open Flow', action:'tab', targetId:'flow', principle:'wip' });
    } else if (weekN >= 10) {
      ins.push({ type:'overload', severity:'amber',
        title:'Heavy week planned',
        body: `${weekN} items across this week. Planning more than you can finish is self-deception. What can move to next month?`,
        actionLabel:'Open Flow', action:'tab', targetId:'flow', principle:'wip' });
    }

    // 8. Energy declining: 3 consecutive weekly reviews trending down
    const wkRevs = reviews.filter(r => r.type === 'weekly').sort((a, b) => a.date.localeCompare(b.date));
    if (wkRevs.length >= 3) {
      const l3 = wkRevs.slice(-3);
      if (l3[0].energy > l3[1].energy && l3[1].energy > l3[2].energy) {
        ins.push({ type:'energy', severity:'red',
          title:'Energy trending down',
          body: `Your energy has dropped 3 weeks in a row (${l3[0].energy}→${l3[1].energy}→${l3[2].energy}). What's draining you most?`,
          actionLabel:'Check in', action:'section', targetId:'checkin', principle:'energy' });
      }
    }

    ins.sort((a, b) => (ORDER[a.severity] || 0) - (ORDER[b.severity] || 0));
    return ins;
  }

  // ── writes ─────────────────────────────────────────────────────
  function toggleDone(id) {
    const n = byId(id); if (!n) return;
    n.done = !n.done;
    n.completedDate = n.done ? new Date().toISOString().slice(0, 10) : null;
    if (n.done && n.bucket == null) n.bucket = 'today';
    announce(true);
  }
  function update(id, patch)  { const n = byId(id); if (n) { Object.assign(n, patch); announce(true); } }
  function rename(id, name)   { const n = byId(id); if (n && name.trim()) { n.name = name.trim(); announce(true); } }
  function setNotes(id, notes){ const n = byId(id); if (n) { n.notes = notes; announce(true); } }

  let seq = 1;
  function addChild(parentId, name, extra) {
    const id  = 'n' + Date.now().toString(36) + (seq++);
    const par = byId(parentId);
    nodes.push(Object.assign({ id, name: name || 'New step', parentId, pillars: par ? [...(par.pillars || [])] : [], done: false }, extra || {}));
    announce(true); return id;
  }
  function addRoot(name, extra) {
    const id = 'h' + Date.now().toString(36) + (seq++);
    nodes.push(Object.assign({ id, name: name || 'New goal', parentId: null, pillars: [], done: false }, extra || {}));
    announce(true); return id;
  }
  function remove(id) {
    const kill = new Set([id]);
    let grew = true;
    while (grew) { grew = false; nodes.forEach(n => { if (n.parentId && kill.has(n.parentId) && !kill.has(n.id)) { kill.add(n.id); grew = true; } }); }
    nodes = nodes.filter(n => !kill.has(n.id));
    announce(true);
  }
  function reset() { nodes = freshStore().nodes; mission = SEED_MISSION; reviews = freshStore().reviews; announce(true); }
  function subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i > -1) subs.splice(i, 1); }; }

  // ── mission & reviews ──────────────────────────────────────────
  const getMission = ()       => mission;
  const setMission = text     => { mission = text || ''; announce(true); };
  const getReviews = ()       => reviews;
  function addReview(r) {
    reviews.push(Object.assign({ id: 'rv' + Date.now().toString(36) }, r));
    announce(true);
  }
  function reviewDue(type) {
    const days = type === 'weekly' ? 7 : 30;
    const rel  = reviews.filter(r => r.type === type).sort((a, b) => b.date.localeCompare(a.date));
    if (!rel.length) return true;
    return (Date.now() - new Date(rel[0].date + 'T00:00:00').getTime()) / 86400000 >= days;
  }

  // ── export ─────────────────────────────────────────────────────
  global.PlanData = {
    // constants
    PILLARS, PILLAR_VAR, PILLAR_LABEL, SCOPES, SCOPE_LABEL,
    // backward-compat aliases
    BUCKETS: SCOPES,
    BUCKET_LABEL: SCOPE_LABEL,
    // tree helpers
    all: () => nodes, byId, children, roots, isLeaf, leaves, progress, rootOf, latestDate, timeBand,
    // queries
    goals, standalones, completedGoals, activeGoals,
    boardItems, laterItems, doneCards,
    pillarActivity, stalledGoals, consecutiveWeeks,
    yearArchive, annualPillarCoverage, weeklyCompletions,
    detectInsights,
    // writes
    toggleDone, update, rename, setNotes, addChild, addRoot, remove, reset,
    // mission & reviews
    getMission, setMission, getReviews, addReview, reviewDue,
    subscribe,
    // backward-compat
    scheduled: boardItems,
    setDone: (id, v) => update(id, { done: !!v }),
    setBucket: (id, b) => update(id, { bucket: b }),
  };
})(window);
