// Shared 24h sleep dial — drag the bed/wake handles around a clock face.
// One factory reused in 3 places: Today's sleep sheet, Log · Sleep's main dial,
// and the target-window picker. Options:
//   svg           id string or <svg> element to render into
//   sleep, wake   initial hours (decimal, 0–24)
//   showTargetArc draw the dashed target arc read from window._target
//   arcColor      colour of the sleep arc (default slate)
//   sectorColor   fill of the sleep sector
//   onUpdate(ctx) called on every change with {sleepH,wakeH,durHours,fmtTime,fmtDur}
// Returns { state(), refreshTarget() }.
function createSleepDial(opts) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = typeof opts.svg === 'string' ? document.getElementById(opts.svg) : opts.svg;
  if (!svg) return null;
  const SZ = 216, CX = 108, CY = 108, R = 76, R_TICKS = 85, R_LABELS = 99, HR = 12;
  const arcColor = opts.arcColor || '#7E8E9F';
  const sectorColor = opts.sectorColor || 'rgba(126,142,159,0.13)';
  let sleepH = opts.sleep != null ? opts.sleep : 50 / 60;
  let wakeH = opts.wake != null ? opts.wake : 6.5;
  let dragging = null;

  const mk = (tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const toAngle = h => (h / 24) * Math.PI * 2 - Math.PI / 2;
  const toTime = a => { let t = ((a + Math.PI / 2) / (Math.PI * 2)) * 24; return ((t % 24) + 24) % 24; };
  const polar = (h, r) => { const a = toAngle(h); return [+(CX + r * Math.cos(a)).toFixed(2), +(CY + r * Math.sin(a)).toFixed(2)]; };
  const arcD = (t1, t2, r) => { const [x1, y1] = polar(t1, r), [x2, y2] = polar(t2, r); const d = ((t2 - t1) + 24) % 24; return `M ${x1} ${y1} A ${r} ${r} 0 ${d > 12 ? 1 : 0} 1 ${x2} ${y2}`; };
  const sectorD = (t1, t2, r) => { const [x1, y1] = polar(t1, r), [x2, y2] = polar(t2, r); const d = ((t2 - t1) + 24) % 24; return `M ${CX} ${CY} L ${x1} ${y1} A ${r} ${r} 0 ${d > 12 ? 1 : 0} 1 ${x2} ${y2} Z`; };
  const fmtTime = h => { const tot = Math.round(((h % 24 + 24) % 24) * 60); return String(Math.floor(tot / 60) % 24).padStart(2, '0') + ':' + String(tot % 60).padStart(2, '0'); };
  const fmtDur = (t1, t2) => { const d = ((t2 - t1) + 24) % 24, h = Math.floor(d), m = Math.round((d - h) * 60); return m > 0 ? `${h}h ${m}m` : `${h}h`; };
  const snap10 = h => Math.round(h * 6) / 6;

  // Face
  svg.appendChild(mk('circle', { cx: CX, cy: CY, r: R + 22, fill: '#F0ECE5', stroke: 'none' }));
  svg.appendChild(mk('circle', { cx: CX, cy: CY, r: R, fill: 'none', stroke: '#DDD9D2', 'stroke-width': '1.5' }));
  // Hour ticks
  for (let h = 0; h < 24; h++) {
    const major = h % 6 === 0, medium = h % 3 === 0, a = toAngle(h);
    const r1 = R_TICKS - (major ? 10 : medium ? 5 : 3), r2 = R_TICKS, cos = Math.cos(a), sin = Math.sin(a);
    svg.appendChild(mk('line', { x1: +(CX + r1 * cos).toFixed(2), y1: +(CY + r1 * sin).toFixed(2), x2: +(CX + r2 * cos).toFixed(2), y2: +(CY + r2 * sin).toFixed(2), stroke: major ? '#65645F' : '#C4BFBA', 'stroke-width': major ? '1.5' : '0.75', 'stroke-linecap': 'round' }));
  }
  // Hour labels
  [{ h: 0, t: '0' }, { h: 6, t: '6' }, { h: 12, t: '12' }, { h: 18, t: '18' }].forEach(({ h, t }) => {
    const [x, y] = polar(h, R_LABELS);
    svg.appendChild(mk('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Inter, sans-serif', 'font-size': '9.5', 'font-weight': '600', fill: '#65645F' }, t));
  });
  // Optional dashed target arc
  let targetArc = null;
  if (opts.showTargetArc) {
    targetArc = mk('path', { fill: 'none', stroke: '#768471', 'stroke-width': '3.5', 'stroke-linecap': 'round', 'stroke-dasharray': '3 4.5', opacity: '0.45', d: arcD(window._target.sleep, window._target.wake, R) });
    svg.appendChild(targetArc);
  }
  // Sleep sector + arc
  const sector = mk('path', { fill: sectorColor, stroke: 'none', d: sectorD(sleepH, wakeH, R) });
  svg.appendChild(sector);
  const arc = mk('path', { fill: 'none', stroke: arcColor, 'stroke-width': '5.5', 'stroke-linecap': 'round', d: arcD(sleepH, wakeH, R) });
  svg.appendChild(arc);

  // Vector moon/sun icons (Feather)
  function iconG(type, color) {
    const g = mk('g', { fill: 'none', stroke: color, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'pointer-events': 'none' });
    if (type === 'moon') { g.appendChild(mk('path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' })); }
    else { g.appendChild(mk('circle', { cx: '12', cy: '12', r: '4' })); ['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].forEach(d => g.appendChild(mk('path', { d }))); }
    return g;
  }
  function placeIcon(g, cx, cy, size) { g.setAttribute('transform', 'translate(' + (cx - size / 2) + ' ' + (cy - size / 2) + ') scale(' + (size / 24).toFixed(3) + ')'); }
  const bedIcon = iconG('moon', '#24231F'); placeIcon(bedIcon, CX - 20, CY - 9, 13); svg.appendChild(bedIcon);
  const wakeIcon = iconG('sun', '#768471'); placeIcon(wakeIcon, CX - 20, CY + 11, 13); svg.appendChild(wakeIcon);
  const bedTxt = mk('text', { x: CX - 8, y: CY - 9, 'text-anchor': 'start', 'dominant-baseline': 'central', 'font-family': 'Inter, sans-serif', 'font-size': '14', 'font-weight': '800', fill: '#24231F' }, fmtTime(sleepH));
  const wakeTxt = mk('text', { x: CX - 8, y: CY + 11, 'text-anchor': 'start', 'dominant-baseline': 'central', 'font-family': 'Inter, sans-serif', 'font-size': '14', 'font-weight': '700', fill: '#65645F' }, fmtTime(wakeH));
  svg.appendChild(bedTxt); svg.appendChild(wakeTxt);

  // Draggable handles
  function makeHandle(type, fill) {
    const g = mk('g', { cursor: 'grab' });
    const c = mk('circle', { r: HR, fill, stroke: '#FFFEFC', 'stroke-width': '2.5' });
    const ic = iconG(type, '#FBFAF8');
    g.appendChild(c); g.appendChild(ic); svg.appendChild(g);
    return { g, c, ic };
  }
  const sh = makeHandle('moon', '#24231F'), wh = makeHandle('sun', '#768471');
  function posHandle({ c, ic }, h) { const [x, y] = polar(h, R); c.setAttribute('cx', x); c.setAttribute('cy', y); placeIcon(ic, x, y, 14); }

  function update() {
    posHandle(sh, sleepH); posHandle(wh, wakeH);
    arc.setAttribute('d', arcD(sleepH, wakeH, R));
    sector.setAttribute('d', sectorD(sleepH, wakeH, R));
    bedTxt.textContent = fmtTime(sleepH);
    wakeTxt.textContent = fmtTime(wakeH);
    if (opts.onUpdate) opts.onUpdate({ sleepH, wakeH, durHours: ((wakeH - sleepH) + 24) % 24, fmtTime, fmtDur });
  }
  update();

  function svgPt(e) {
    const rect = svg.getBoundingClientRect();
    const sx = SZ / rect.width, sy = SZ / rect.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return [(cx - rect.left) * sx, (cy - rect.top) * sy];
  }
  function near(px, py, h) { const [hx, hy] = polar(h, R); return Math.hypot(px - hx, py - hy) < HR * 2.4; }
  svg.addEventListener('mousedown', e => { const [px, py] = svgPt(e); if (near(px, py, sleepH)) { dragging = 'sleep'; svg.style.cursor = 'grabbing'; } else if (near(px, py, wakeH)) { dragging = 'wake'; svg.style.cursor = 'grabbing'; } });
  svg.addEventListener('touchstart', e => { e.preventDefault(); const [px, py] = svgPt(e); if (near(px, py, sleepH)) dragging = 'sleep'; else if (near(px, py, wakeH)) dragging = 'wake'; }, { passive: false });
  window.addEventListener('mousemove', e => { if (!dragging) return; const [px, py] = svgPt(e); const t = snap10(toTime(Math.atan2(py - CY, px - CX))); if (dragging === 'sleep') sleepH = t; else wakeH = t; update(); });
  window.addEventListener('touchmove', e => { if (!dragging) return; e.preventDefault(); const [px, py] = svgPt(e); const t = snap10(toTime(Math.atan2(py - CY, px - CX))); if (dragging === 'sleep') sleepH = t; else wakeH = t; update(); }, { passive: false });
  window.addEventListener('mouseup', () => { dragging = null; svg.style.cursor = 'default'; });
  window.addEventListener('touchend', () => { dragging = null; });

  return {
    state() { const dur = ((wakeH - sleepH) + 24) % 24, h = Math.floor(dur); return { h, m: Math.round((dur - h) * 60), bed: fmtTime(sleepH), wake: fmtTime(wakeH) }; },
    refreshTarget() { if (targetArc) targetArc.setAttribute('d', arcD(window._target.sleep, window._target.wake, R)); }
  };
}
