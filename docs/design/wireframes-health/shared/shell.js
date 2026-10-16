/* Shared chrome for the Health-style wireframes: icon sprite, status bar, tab bar. */
(function () {
  const icons = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    bed: '<path d="M3 18V6M3 14h18v4M21 14v-1.5A3.5 3.5 0 0 0 17.5 9H11v5"/><circle cx="7" cy="11" r="1.6"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.3" fill="#fff"/><circle cx="15" cy="17" r="2.3" fill="#fff"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.8-3.3 3-5 6-5s5.2 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14.5c2 .3 3.4 1.8 4 4.5"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 7l3 3"/>',
    layers: '<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>',
    board: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 8v8M15.5 8v4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
  };

  const sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
    Object.entries(icons).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('') +
    '</svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);

  document.querySelectorAll('[data-status]').forEach((el) => {
    el.className = 'status';
    el.innerHTML = '<span>9:41</span><span class="sys"><svg class="i sm"><use href="#i-activity"/></svg><span class="bat"></span></span>';
  });

  const tabs = [
    ['today', 'Today', 'sun', 'today.html'],
    ['log', 'Log', 'activity', 'log-sleep.html'],
    ['you', 'You', 'user', 'you-progress.html'],
  ];
  document.querySelectorAll('[data-tabbar]').forEach((el) => {
    const active = el.getAttribute('data-tabbar');
    el.className = 'tabbar';
    el.innerHTML = tabs.map(([key, label, icon, href]) =>
      `<a href="${href}" class="${key === active ? 'on' : ''}"><svg class="i"><use href="#i-${icon}"/></svg>${label}</a>`).join('');
  });

  // Route: camps sit at their frozen return thresholds (0, 3, 9) on a 0–15 line; Steady is the self-claimed end.
  const CAMPS = [[0, 'Watching'], [3, 'Doing'], [9, 'Under pressure']];
  document.querySelectorAll('[data-route]').forEach((el) => {
    const n = Number(el.dataset.route);
    const hue = el.dataset.hue;
    const big = el.dataset.size === 'big';
    const W = big ? 326 : 150, H = big ? 76 : 16, y = big ? 36 : 8, x0 = big ? 14 : 5, x1 = W - x0;
    const X = (r) => x0 + (Math.min(r, 15) / 15) * (x1 - x0);
    const c = `var(--${hue})`, faint = `color-mix(in oklab, var(--${hue}) 30%, #fff)`;
    const wx = X(n);
    const nr = big ? 6 : 3.5;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${big ? '100%' : W}" height="${H}" aria-label="${n} returns" style="display:block;overflow:visible">`;
    s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${faint}" stroke-width="${big ? 3 : 2}" stroke-dasharray="${big ? '4 5' : '3 3'}" stroke-linecap="round"/>`;
    s += `<line x1="${x0}" y1="${y}" x2="${wx}" y2="${y}" stroke="${c}" stroke-width="${big ? 4 : 3}" stroke-linecap="round"/>`;
    CAMPS.forEach(([t]) => {
      const reached = n >= t;
      s += `<circle cx="${X(t)}" cy="${y}" r="${nr}" fill="${reached ? c : '#fff'}" stroke="${reached ? '#fff' : faint}" stroke-width="${big ? 2.5 : 1.5}"/>`;
    });
    s += `<circle cx="${x1}" cy="${y}" r="${big ? 8 : 4}" fill="#fff" stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="${big ? '2.5 2.5' : '1.5 1.5'}"/>`;
    if (big) s += `<circle cx="${wx}" cy="${y}" r="13" fill="var(--${hue}-soft)"/>`;
    s += `<circle cx="${wx}" cy="${y}" r="${big ? 7 : 5}" fill="${c}" stroke="#fff" stroke-width="${big ? 3 : 2}"/>`;
    if (big) {
      const stage = n >= 9 ? 2 : n >= 3 ? 1 : 0;
      s += `<text x="${wx}" y="12" text-anchor="middle" font-size="11" font-weight="700" fill="var(--${hue}-deep)">You · ${n}</text>`;
      // Each stage name sits under its own stretch of the route.
      const ends = [0, 3, 9, 15];
      CAMPS.forEach(([, label], i) => {
        const mid = (X(ends[i]) + X(ends[i + 1])) / 2;
        s += `<text x="${mid}" y="${H - 4}" text-anchor="middle" font-size="11" font-weight="${i === stage ? 700 : 500}" fill="${i === stage ? 'var(--ink)' : 'var(--ink-2)'}">${label}</text>`;
      });
      if (n < 13) s += `<text x="${x1}" y="12" text-anchor="end" font-size="11" fill="var(--ink-2)">Steady</text>`;
    }
    el.innerHTML = s + '</svg>';
  });

  // Returns line: only days with a return get a mark; gaps are rest, never empty cells.
  document.querySelectorAll('[data-marks]').forEach((el) => {
    const hue = el.dataset.hue;
    const marks = el.dataset.marks.split(',').map(Number);
    el.innerHTML = `<div class="marks"><div class="mline"></div>${marks.map((p) =>
      `<i style="left:${p}%;background:var(--${hue})"></i>`).join('')}</div>
      <div class="mlabels"><span>${el.dataset.from}</span><span>${el.dataset.to}</span></div>`;
  });

  // Large title collapses into the nav bar on scroll, as in Health.
  const nav = document.querySelector('.nav');
  const big = document.querySelector('h1.title');
  if (nav && big && !nav.querySelector('.center')) {
    nav.insertAdjacentHTML('beforeend', `<span class="nav-title">${big.textContent}</span>`);
    const sync = () => document.body.classList.toggle('scrolled', window.scrollY > big.offsetTop + 10);
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  document.querySelectorAll('[data-more]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.more);
      const open = target.classList.toggle('open');
      btn.textContent = open ? 'Show less' : 'Show more';
    });
  });
})();
