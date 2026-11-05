/* Math Strings – model renderers.
   Each tool turns a short typed input into an SVG (or HTML) drawing.
   All drawings are made for a 940px-wide space. */
(function () {
  const W = 940;
  const C = {
    ink: '#1d2433', soft: '#5b6475', line: '#1d2433',
    fwd: '#1f5fd1', back: '#d0461a', gap: '#0d8a55',
    fills: ['#5b8def', '#f2a33a', '#2fb37c', '#c264d6', '#e5534b', '#3bb3c9'],
  };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').replace(/[−–—]/g, '-').replace(/[×✕]/g, 'x').replace(/÷/g, '/');
  const round = v => Math.round(v * 1e9) / 1e9;
  function fmt(v) {
    v = round(v);
    if (Number.isInteger(v)) return String(v);
    return String(parseFloat(v.toFixed(4)));
  }
  const signed = (d, lbl) => (d < 0 ? '−' : '+') + (lbl || fmt(Math.abs(d)));
  const minus = s => String(s).replace(/^-/, '−');

  // "3/4" -> {v:.75,label:'3/4'}; "2.5" -> {v:2.5,label:'2.5'}
  function parseVal(t) {
    t = String(t).replace(/\s+/g, '');
    let m = t.match(/^(-?)(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) { const v = (+m[2] / +m[3]) * (m[1] ? -1 : 1); return isFinite(v) ? { v, label: (m[1] ? '-' : '') + m[2] + '/' + m[3], frac: true } : null; }
    m = t.match(/^-?\d*\.?\d+$/);
    if (m) return { v: +t, label: fmt(+t) };
    return null;
  }

  function editable(key, labels, fallback) {
    const has = labels && labels[key] != null && labels[key] !== '';
    return { text: has ? labels[key] : fallback, custom: has };
  }

  function svg(h, body, defs = '') {
    return `<svg class="model-svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ah-fwd" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.fwd}"/></marker>
        <marker id="ah-back" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.back}"/></marker>
        <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#fff"/><line x1="0" y1="0" x2="0" y2="10" stroke="${C.back}" stroke-width="4"/></pattern>
        ${defs}
      </defs>${body}</svg>`;
  }
  const text = (x, y, s, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.anchor || 'middle'}" font-size="${o.size || 20}" font-weight="${o.weight || 400}" fill="${o.fill || C.ink}"${o.edit ? ` class="editable${o.custom ? ' custom' : ''}" data-edit="${esc(o.edit)}"` : ''}>${esc(s)}</text>`;

  // Spread sorted values across a width; not to scale, but order and rough size are kept.
  function spread(vals, width, minGap) {
    const gaps = [];
    for (let i = 1; i < vals.length; i++) gaps.push(Math.pow(Math.max(vals[i] - vals[i - 1], 1e-9), 0.5));
    if (!gaps.length) return [width / 2];
    let fixed = new Array(gaps.length).fill(false), px = [];
    for (let it = 0; it < 4; it++) {
      const free = gaps.reduce((a, g, i) => a + (fixed[i] ? 0 : g), 0);
      const room = width - fixed.filter(Boolean).length * minGap;
      const k = room / (free || 1);
      px = gaps.map((g, i) => (fixed[i] ? minGap : g * k));
      let changed = false;
      px.forEach((p, i) => { if (!fixed[i] && p < minGap) { fixed[i] = true; changed = true; } });
      if (!changed) break;
    }
    const total = px.reduce((a, b) => a + b, 0);
    if (total > width) px = px.map(p => (p * width) / total);
    const out = [0];
    px.forEach(p => out.push(out[out.length - 1] + p));
    const off = (width - out[out.length - 1]) / 2;
    return out.map(x => x + off);
  }

  /* ---------- Open number line ----------
     38 +10 -1      start at 38, jump +10, jump back 1
     76 >80 >100    jump to 80, then to 100
     @100           mark a point (no jump)
     ~100           show the gap (distance) to 100            */
  function numberline(input, labels) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const toks = s.match(/[>@~]\s*-?\s*\d*\.?\d+(?:\s*\/\s*\d+)?|[+-]?\s*\d*\.?\d+(?:\s*\/\s*\d+)?/g);
    if (!toks) return { error: 'Start with a number, e.g. 38 +10 -1' };
    const pts = new Map();
    const addPt = (v, label, start) => {
      const k = round(v);
      const p = pts.get(k) || { v: k, label, start: false };
      if (start) p.start = true;
      if (label && (!p.label || label.includes('/'))) p.label = label;
      pts.set(k, p);
    };
    const arcs = [];
    let cur = null;
    toks.forEach((raw, i) => {
      const t = raw.replace(/\s+/g, '');
      const op = /^[>@~+-]/.test(t) ? t[0] : '';
      if (i === 0) { const pv = parseVal(t); if (pv) { cur = pv.v; addPt(pv.v, pv.label, true); } return; }
      if (op === '+' || op === '-') {
        const pv = parseVal(t.slice(1)); if (!pv || cur == null) return;
        const d = op === '+' ? pv.v : -pv.v;
        const from = cur; cur = round(cur + d);
        addPt(cur, pv.frac ? null : fmt(cur));
        arcs.push({ from, to: cur, label: signed(d, pv.label), kind: d >= 0 ? 'fwd' : 'back' });
      } else {
        const pv = parseVal(op ? t.slice(1) : t); if (!pv) return;
        if (op === '@' || !op) { addPt(pv.v, pv.label); cur = pv.v; }
        else if (op === '>') { const from = cur; if (from == null) return; addPt(pv.v, pv.label); cur = pv.v; const d = round(pv.v - from); arcs.push({ from, to: pv.v, label: signed(d), kind: d >= 0 ? 'fwd' : 'back' }); }
        else if (op === '~') { const from = cur; if (from == null) return; addPt(pv.v, pv.label); cur = pv.v; arcs.push({ from, to: pv.v, label: fmt(Math.abs(pv.v - from)), kind: 'gap' }); }
      }
    });
    if (!pts.size) return { error: 'Start with a number, e.g. 38 +10 -1' };
    const vals = [...pts.keys()].sort((a, b) => a - b);
    const xs = spread(vals, W - 120, 56).map(x => x + 60);
    const X = v => xs[vals.indexOf(round(v))];

    // stack arcs that overlap
    const placed = [];
    arcs.forEach((a, i) => {
      a.x1 = X(a.from); a.x2 = X(a.to);
      a.lo = Math.min(a.x1, a.x2); a.hi = Math.max(a.x1, a.x2);
      if (a.kind === 'gap') return;
      let level = 0;
      placed.forEach(b => { if (b.lo < a.hi - 2 && a.lo < b.hi - 2) level = Math.max(level, b.level + 1); });
      a.level = level;
      a.h = Math.min(Math.max((a.hi - a.lo) * 0.38, 30), 95) + level * 30;
      placed.push(a);
      a.i = i;
    });
    const maxH = Math.max(0, ...placed.map(a => a.h));
    const hasGap = arcs.some(a => a.kind === 'gap');
    const y0 = maxH + 46;
    const H = y0 + (hasGap ? 104 : 52);
    let body = `<line x1="16" y1="${y0}" x2="${W - 16}" y2="${y0}" stroke="${C.line}" stroke-width="3" stroke-linecap="round"/>`;
    arcs.forEach((a, i) => {
      if (a.kind === 'gap') {
        const y = y0 + 50;
        body += `<path d="M${a.lo} ${y - 10} L${a.lo} ${y} L${a.hi} ${y} L${a.hi} ${y - 10}" fill="none" stroke="${C.gap}" stroke-width="3"/>`;
        const l = editable('a' + i, labels, a.label);
        body += text((a.lo + a.hi) / 2, y + 28, l.text, { fill: C.gap, size: 22, weight: 700, edit: 'a' + i, custom: l.custom });
        return;
      }
      const col = C[a.kind], mid = (a.x1 + a.x2) / 2;
      body += `<path d="M${a.x1} ${y0 - 4} Q ${mid} ${y0 - 4 - 2 * a.h} ${a.x2} ${y0 - 4}" fill="none" stroke="${col}" stroke-width="3" marker-end="url(#ah-${a.kind})"/>`;
      const l = editable('a' + i, labels, a.label);
      const lw = Math.max(36, l.text.length * 11 + 14);
      body += `<rect x="${mid - lw / 2}" y="${y0 - 4 - a.h - 26}" width="${lw}" height="26" rx="6" fill="#fff" opacity=".9"/>`;
      body += text(mid, y0 - 4 - a.h - 6, l.text, { fill: col, size: 21, weight: 700, edit: 'a' + i, custom: l.custom });
    });
    vals.forEach(v => {
      const p = pts.get(v), x = X(v);
      body += `<line x1="${x}" y1="${y0 - 11}" x2="${x}" y2="${y0 + 11}" stroke="${C.line}" stroke-width="3"/>`;
      body += text(x, y0 + 36, minus(p.label || fmt(v)), { size: p.start ? 24 : 22, weight: p.start ? 700 : 500 });
    });
    return { svg: svg(H, body) };
  }

  /* ---------- Ratio table ----------  1:7, 10:70, 5:35   (first pair can be names: bags:apples) */
  function ratio(input, labels) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const pairs = s.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean).map(p => p.split(/\s*[:|]\s*/));
    let head = null;
    if (pairs.length && pairs[0].length === 2 && !parseVal(pairs[0][0]) && pairs[0][0] !== '?' && !parseVal(pairs[0][1]) && pairs[0][1] !== '?') head = pairs.shift();
    const cols = pairs.filter(p => p.length === 2);
    if (!cols.length) return { error: 'Type pairs like 1:7, 10:70' };
    const hw = head ? 130 : 0;
    const cw = Math.min(140, Math.max(72, (W - 40 - hw) / cols.length));
    const tw = hw + cw * cols.length, x0 = (W - tw) / 2, y0 = 92, rh = 60;
    let body = '';
    const rel = (a, b) => {
      const A = parseVal(a), B = parseVal(b);
      if (!A || !B) return '';
      if (A.v !== 0 && B.v / A.v > 1 && Number.isInteger(round(B.v / A.v))) return '×' + fmt(B.v / A.v);
      if (B.v !== 0 && A.v / B.v > 1 && Number.isInteger(round(A.v / B.v))) return '÷' + fmt(A.v / B.v);
      if (A.v !== 0 && B.v / A.v > 0 && Math.abs(round(B.v / A.v * 100) - B.v / A.v * 100) < 1e-6) return '×' + fmt(B.v / A.v);
      return signed(B.v - A.v);
    };
    for (let i = 1; i < cols.length; i++) {
      const xa = x0 + hw + cw * (i - 0.5), xb = x0 + hw + cw * (i + 0.5), mid = (xa + xb) / 2;
      const l = editable('r' + i, labels, rel(cols[i - 1][0], cols[i][0]));
      if (!l.text) continue;
      body += `<path d="M${xa + 6} ${y0 - 6} Q ${mid} ${y0 - 58} ${xb - 6} ${y0 - 6}" fill="none" stroke="${C.fwd}" stroke-width="2.5" marker-end="url(#ah-fwd)"/>`;
      body += text(mid, y0 - 38, l.text, { fill: C.fwd, size: 20, weight: 700, edit: 'r' + i, custom: l.custom });
    }
    body += `<rect x="${x0}" y="${y0}" width="${tw}" height="${rh * 2}" fill="#fff" stroke="${C.ink}" stroke-width="2.5" rx="4"/>`;
    body += `<line x1="${x0}" y1="${y0 + rh}" x2="${x0 + tw}" y2="${y0 + rh}" stroke="${C.ink}" stroke-width="2"/>`;
    if (head) {
      body += `<rect x="${x0}" y="${y0}" width="${hw}" height="${rh * 2}" fill="#eef2f8"/>`;
      body += text(x0 + hw / 2, y0 + 38, head[0], { size: 20, weight: 700 }) + text(x0 + hw / 2, y0 + rh + 38, head[1], { size: 20, weight: 700 });
    }
    cols.forEach((c, i) => {
      const x = x0 + hw + cw * i;
      if (i > 0 || head) body += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + rh * 2}" stroke="${C.ink}" stroke-width="2"/>`;
      body += text(x + cw / 2, y0 + 40, minus(c[0]), { size: 26, weight: 600 }) + text(x + cw / 2, y0 + rh + 40, minus(c[1]), { size: 26, weight: 600 });
    });
    return { svg: svg(y0 + rh * 2 + 16, body) };
  }

  function parseFactors(input) {
    const s = norm(input).replace(/\*/g, 'x').replace(/[()]/g, ' ');
    const sides = s.split(/\s*x\s*/i).map(t => t.trim()).filter(Boolean);
    if (sides.length !== 2) return null;
    const parts = sides.map(side => side.split('+').map(t => parseVal(t.trim())));
    if (parts.some(p => p.some(v => !v || v.v <= 0))) return null;
    return parts;
  }

  /* ---------- Area model ----------  30+8 x 7    or   20+3 x 10+4 */
  function area(input, labels, model) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const f = parseFactors(s);
    if (!f) return { error: 'Type it like 30+8 x 7 (split with +)' };
    const [rowsP, colsP] = [f[1], f[0]]; // left factor runs across the top
    const sumC = colsP.reduce((a, b) => a + b.v, 0), sumR = rowsP.reduce((a, b) => a + b.v, 0);
    let k = Math.min(720 / sumC, 300 / sumR);
    const ws = colsP.map(p => Math.max(p.v * k, 74)), hs = rowsP.map(p => Math.max(p.v * k, 58));
    const tw = ws.reduce((a, b) => a + b, 0), th = hs.reduce((a, b) => a + b, 0);
    const sc = Math.min(1, 760 / tw, 320 / th);
    const W2 = ws.map(w => w * sc), H2 = hs.map(h => h * sc);
    const x0 = (W - W2.reduce((a, b) => a + b, 0)) / 2 + 30, y0 = 44;
    const hidden = new Set((model && model.hidden) || []);
    let body = '', x = x0;
    colsP.forEach((c, i) => { body += text(x + W2[i] / 2, y0 - 14, c.label, { size: 24, weight: 700, fill: C.fwd }); x += W2[i]; });
    let y = y0;
    rowsP.forEach((r, j) => {
      body += text(x0 - 14, y + H2[j] / 2 + 8, r.label, { size: 24, weight: 700, fill: C.fwd, anchor: 'end' });
      let xx = x0;
      colsP.forEach((c, i) => {
        const key = i + '_' + j, fill = C.fills[(i + j * colsP.length) % C.fills.length];
        body += `<rect class="cell-toggle" data-cell="${key}" x="${xx}" y="${y}" width="${W2[i]}" height="${H2[j]}" fill="${fill}" fill-opacity=".22" stroke="${C.ink}" stroke-width="2.5"/>`;
        const fs = Math.max(15, Math.min(30, Math.min(W2[i], H2[j]) / 2.6));
        const prod = parseVal(r.label) && parseVal(c.label) ? fmt(r.v * c.v) : '';
        const l = editable('c' + key, labels, hidden.has(key) ? '?' : prod);
        body += text(xx + W2[i] / 2, y + H2[j] / 2 + fs / 3, l.text, { size: fs, weight: 700, edit: 'c' + key, custom: l.custom });
        xx += W2[i];
      });
      y += H2[j];
    });
    return { svg: svg(y + 20, body) };
  }

  /* ---------- Array (dots) ----------  6 x 8   or   6 x 5+3 */
  function array(input) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const f = parseFactors(s);
    if (!f) return { error: 'Type it like 6 x 8 or 6 x 5+3' };
    const rowsP = f[0].map(p => p.v), colsP = f[1].map(p => p.v);
    const R = rowsP.reduce((a, b) => a + b, 0), Cc = colsP.reduce((a, b) => a + b, 0);
    if ([...rowsP, ...colsP].some(v => !Number.isInteger(v)) || R > 40 || Cc > 60) return { error: 'Dots need whole numbers (up to 40 × 60). Try the Area model.' };
    const gapU = 0.9;
    const sp = Math.min(34, 820 / (Cc + gapU * (colsP.length - 1)), 330 / (R + gapU * (rowsP.length - 1)));
    const r = sp * 0.32;
    const tw = sp * (Cc + gapU * (colsP.length - 1)), x0 = (W - tw) / 2 + sp / 2 + 20, y0 = 50;
    let body = '';
    const colX = [], rowY = [];
    colsP.forEach((n, gi) => { const base = colX.length ? colX[colX.length - 1] + sp * (1 + gapU) : x0; for (let i = 0; i < n; i++) colX.push(base + i * sp); });
    rowsP.forEach((n, gi) => { const base = rowY.length ? rowY[rowY.length - 1] + sp * (1 + gapU) : y0; for (let i = 0; i < n; i++) rowY.push(base + i * sp); });
    let ci = 0;
    colsP.forEach((n, gi) => { const a = colX[ci], b = colX[ci + n - 1]; body += text((a + b) / 2, y0 - sp / 2 - 12, String(n), { size: 22, weight: 700, fill: C.fwd }); ci += n; });
    let ri = 0;
    rowsP.forEach((n, gi) => { const a = rowY[ri], b = rowY[ri + n - 1]; body += text(x0 - sp / 2 - 14, (a + b) / 2 + 8, String(n), { size: 22, weight: 700, fill: C.fwd, anchor: 'end' }); ri += n; });
    let rIdx = 0;
    rowsP.forEach((rn, rg) => {
      for (let i = 0; i < rn; i++, rIdx++) {
        let cIdx = 0;
        colsP.forEach((cn, cg) => {
          for (let j = 0; j < cn; j++, cIdx++) body += `<circle cx="${colX[cIdx]}" cy="${rowY[rIdx]}" r="${r}" fill="${C.fills[(cg + rg * colsP.length) % C.fills.length]}"/>`;
        });
      }
    });
    return { svg: svg(rowY[rowY.length - 1] + sp + 10, body) };
  }

  /* ---------- Double number line ----------  miles:hours, 0:0, 60:1, 30:0.5, 150:2.5 */
  function doubleline(input, labels) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const pairs = s.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean).map(p => p.split(/\s*[:|]\s*/));
    let head = null;
    if (pairs.length && pairs[0].length === 2 && !parseVal(pairs[0][0]) && !parseVal(pairs[0][1]) && pairs[0][0] !== '?') head = pairs.shift();
    const cols = pairs.filter(p => p.length === 2 && parseVal(p[0]));
    if (!cols.length) return { error: 'Type pairs like 0:0, 1:3.50, 4:14 (top value must be a number)' };
    const tv = cols.map(c => parseVal(c[0]).v);
    const lo = Math.min(0, ...tv), hi = Math.max(...tv);
    const xl = head ? 150 : 50, xr = W - 40;
    const X = v => (hi === lo ? (xl + xr) / 2 : xl + ((v - lo) / (hi - lo)) * (xr - xl));
    const y1 = 70, y2 = 170;
    let body = '';
    [y1, y2].forEach(y => (body += `<line x1="${xl - 20}" y1="${y}" x2="${xr + 20}" y2="${y}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`));
    if (head) body += text(xl - 34, y1 + 7, head[0], { size: 20, weight: 700, anchor: 'end', fill: C.fwd }) + text(xl - 34, y2 + 7, head[1], { size: 20, weight: 700, anchor: 'end', fill: C.back });
    cols.forEach((c, i) => {
      const x = X(tv[i]);
      body += `<line x1="${x}" y1="${y1 + 12}" x2="${x}" y2="${y2 - 12}" stroke="#c9cfdb" stroke-width="2" stroke-dasharray="4 5"/>`;
      body += `<line x1="${x}" y1="${y1 - 11}" x2="${x}" y2="${y1 + 11}" stroke="${C.ink}" stroke-width="3"/><line x1="${x}" y1="${y2 - 11}" x2="${x}" y2="${y2 + 11}" stroke="${C.ink}" stroke-width="3"/>`;
      body += text(x, y1 - 20, minus(c[0]), { size: 22, weight: 600, fill: C.fwd }) + text(x, y2 + 38, minus(c[1]), { size: 22, weight: 600, fill: C.back });
    });
    return { svg: svg(y2 + 56, body) };
  }

  /* ---------- Clock (fractions of an hour) ----------  1/4 + 1/3    3/4 - 1/6    5/12 */
  function clock(input, labels) {
    const s = norm(input).replace(/\s+/g, '');
    if (!s) return { empty: true };
    const terms = [];
    const re = /([+-]?)(\d+(?:\/\d+)?)/g; let m;
    while ((m = re.exec(s))) {
      const pv = parseVal(m[2]); if (!pv) continue;
      terms.push({ sign: m[1] === '-' ? -1 : 1, v: pv.v, label: pv.label });
    }
    if (!terms.length) return { error: 'Type fractions like 1/4 + 1/3' };
    const sectors = []; let cur = 0;
    terms.forEach((t, i) => {
      const mins = t.v * 60;
      if (t.sign > 0) { sectors.push({ a: cur, b: cur + mins, i, kind: 'add' }); cur += mins; }
      else { sectors.push({ a: Math.max(0, cur - mins), b: cur, i, kind: 'sub' }); cur = Math.max(0, cur - mins); }
    });
    const maxEnd = Math.max(60, ...sectors.map(x => x.b));
    const n = Math.min(4, Math.ceil(round(maxEnd / 60)));
    const R = n > 2 ? 108 : 128, gap = 40;
    const legendW = 230;
    const totalW = n * 2 * R + (n - 1) * gap;
    const startX = Math.max(20, (W - legendW - totalW) / 2);
    const cy = R + 24;
    const pt = (cx, mins, r) => { const a = (mins / 60) * 2 * Math.PI - Math.PI / 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    let body = '';
    for (let k = 0; k < n; k++) {
      const cx = startX + R + k * (2 * R + gap);
      body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="${C.ink}" stroke-width="3"/>`;
      sectors.forEach(sct => {
        const a = Math.max(sct.a, k * 60) - k * 60, b = Math.min(sct.b, (k + 1) * 60) - k * 60;
        if (b - a <= 0.0001) return;
        const fill = sct.kind === 'sub' ? 'url(#hatch)' : C.fills[sct.i % C.fills.length];
        const op = sct.kind === 'sub' ? 1 : 0.55;
        if (b - a >= 59.999) body += `<circle cx="${cx}" cy="${cy}" r="${R - 2}" fill="${fill}" fill-opacity="${op}"/>`;
        else {
          const [x1, y1] = pt(cx, a, R - 2), [x2, y2] = pt(cx, b, R - 2);
          body += `<path d="M${cx} ${cy} L${x1} ${y1} A${R - 2} ${R - 2} 0 ${b - a > 30 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${fill}" fill-opacity="${op}" stroke="${C.ink}" stroke-width="1.5"/>`;
        }
        if (b - a >= 4) { const [lx, ly] = pt(cx, (a + b) / 2, R * 0.5); body += `<text x="${lx}" y="${ly + 7}" text-anchor="middle" font-size="${b - a >= 8 ? 20 : 15}" font-weight="700" fill="${C.ink}" paint-order="stroke" stroke="#fff" stroke-width="4">${fmt(b - a)}</text>`; }
      });
      for (let t = 0; t < 60; t++) {
        const big = t % 5 === 0;
        const [x1, y1] = pt(cx, t, R - (big ? 14 : 7)), [x2, y2] = pt(cx, t, R - 2);
        body += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ink}" stroke-width="${big ? 2.5 : 1}"/>`;
      }
      for (let h = 1; h <= 12; h++) { const [x, y] = pt(cx, h * 5, R - 30); body += `<text x="${x}" y="${y + 6}" text-anchor="middle" font-size="16" fill="${C.soft}">${h}</text>`; }
      body += `<circle cx="${cx}" cy="${cy}" r="4" fill="${C.ink}"/>`;
    }
    const lx = startX + totalW + 36;
    terms.forEach((t, i) => {
      const y = 46 + i * 40;
      const fill = t.sign < 0 ? 'url(#hatch)' : C.fills[i % C.fills.length];
      body += `<rect x="${lx}" y="${y - 20}" width="26" height="26" rx="5" fill="${fill}" fill-opacity="${t.sign < 0 ? 1 : 0.7}" stroke="${C.ink}" stroke-width="1.5"/>`;
      const l = editable('t' + i, labels, `${t.sign < 0 ? '− ' : ''}${t.label} = ${fmt(t.v * 60)} min`);
      body += text(lx + 38, y, l.text, { anchor: 'start', size: 21, weight: 600, edit: 't' + i, custom: l.custom });
    });
    return { svg: svg(Math.max(cy + R + 24, 60 + terms.length * 40), body) };
  }

  /* ---------- Bar / tape model ----------
     3/4 of 24          24 = 10 + ?          Ana: 12; Ben: 12 + 5            */
  function bar(input, labels) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const lines = s.split(/[;\n]+/).map(t => t.trim()).filter(Boolean);
    const bars = lines.map(line => {
      let name = '';
      const nm = line.match(/^([A-Za-z][^:]*):\s*(.*)$/);
      if (nm) { name = nm[1].trim(); line = nm[2]; }
      let m = line.match(/^(\d+)\s*\/\s*(\d+)\s*of\s*(.+)$/i);
      if (m) { const tot = parseVal(m[3]); return { name, kind: 'frac', a: +m[1], b: +m[2], total: tot ? tot.v : null, totalLabel: m[3].trim() }; }
      let total = null, totalLabel = null;
      m = line.match(/^(.+?)\s*=\s*(.+)$/);
      if (m) { const pv = parseVal(m[1]); total = pv ? pv.v : null; totalLabel = m[1].trim(); line = m[2]; }
      const segs = line.split('+').map(t => t.trim()).filter(Boolean).map(t => { const pv = parseVal(t); return { label: t, v: pv ? pv.v : null }; });
      return { name, kind: 'segs', segs, total, totalLabel };
    });
    const sizeOf = b => b.kind === 'frac' ? (b.total || null) : (b.total != null ? b.total : b.segs.every(x => x.v != null) ? b.segs.reduce((a, x) => a + x.v, 0) : null);
    const known = bars.map(sizeOf).filter(v => v != null);
    const maxV = known.length ? Math.max(...known) : 1;
    const nameW = bars.some(b => b.name) ? 110 : 0;
    const full = W - 80 - nameW, x0 = 40 + nameW;
    let y = 50, body = '', bi = 0;
    bars.forEach((b, bIdx) => {
      const sz = sizeOf(b);
      const len = sz != null ? (sz / maxV) * full : full;
      if (bIdx > 0 && (b.kind === 'frac' || b.totalLabel)) y += 46;
      if (b.name) body += text(x0 - 14, y + 36, b.name, { anchor: 'end', size: 21, weight: 700 });
      const brace = (xa, xb, yy, up, lbl, key) => {
        const d = up ? -1 : 1;
        body += `<path d="M${xa} ${yy} q0 ${10 * d} 10 ${10 * d} L${(xa + xb) / 2 - 8} ${yy + 10 * d} q8 0 8 ${8 * d} q0 ${-8 * d} 8 ${-8 * d} L${xb - 10} ${yy + 10 * d} q10 0 10 ${-10 * d}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
        const l = editable(key, labels, lbl);
        body += text((xa + xb) / 2, yy + (up ? -26 : 42), l.text, { size: 22, weight: 700, edit: key, custom: l.custom });
      };
      if (b.kind === 'frac') {
        const pw = len / b.b;
        for (let i = 0; i < b.b; i++) body += `<rect x="${x0 + i * pw}" y="${y}" width="${pw}" height="56" fill="${i < b.a ? C.fills[0] : '#fff'}" fill-opacity="${i < b.a ? 0.45 : 1}" stroke="${C.ink}" stroke-width="2.5"/>`;
        brace(x0, x0 + len, y - 6, true, b.totalLabel, 'b' + bIdx + 't');
        if (b.a > 0) brace(x0, x0 + pw * b.a, y + 62, false, '?', 'b' + bIdx + 'p');
        y += 160;
      } else {
        const knownSum = b.segs.reduce((a, x) => a + (x.v || 0), 0);
        const unknown = b.segs.filter(x => x.v == null).length;
        const each = unknown ? Math.max((sz != null ? sz - knownSum : knownSum / Math.max(1, b.segs.length - unknown)) / unknown, maxV * 0.08) : 0;
        const tot = b.segs.reduce((a, x) => a + (x.v != null ? x.v : each), 0) || 1;
        let xx = x0;
        b.segs.forEach((sg, i) => {
          const w = (((sg.v != null ? sg.v : each) / tot) * len);
          body += `<rect x="${xx}" y="${y}" width="${Math.max(w, 30)}" height="56" fill="${sg.v == null ? '#fff' : C.fills[(i + bi) % C.fills.length]}" fill-opacity="${sg.v == null ? 1 : 0.4}" stroke="${C.ink}" stroke-width="2.5" ${sg.v == null ? 'stroke-dasharray="7 5"' : ''}/>`;
          const l = editable('b' + bIdx + 's' + i, labels, minus(sg.label));
          body += text(xx + Math.max(w, 30) / 2, y + 36, l.text, { size: 22, weight: 700, edit: 'b' + bIdx + 's' + i, custom: l.custom });
          xx += Math.max(w, 30);
        });
        bi += b.segs.length;
        if (b.totalLabel) brace(x0, xx, y - 6, true, b.totalLabel, 'b' + bIdx + 't');
        y += 90;
      }
    });
    return { svg: svg(y - 20, body) };
  }

  const TOOLS = [
    { id: 'numberline', name: 'Number line', key: '1', icon: '⟷', render: numberline, help: '38 +10 -1  ·  76 >80 >100 (jump to)  ·  @100 (mark)  ·  ~100 (show gap)' },
    { id: 'ratio', name: 'Ratio table', key: '2', icon: '▦', render: ratio, help: '1:7, 10:70, 5:35  ·  optional names first: bags:apples, 1:7' },
    { id: 'area', name: 'Area model', short: 'Area', key: '3', icon: '▣', render: area, help: '30+8 x 7  ·  20+3 x 10+4  ·  click a box to hide/show its product' },
    { id: 'array', name: 'Array', key: '4', icon: '⁘', render: array, help: '6 x 8  ·  6 x 5+3 (split the columns)' },
    { id: 'doubleline', name: 'Double number line', short: 'Double line', key: '5', icon: '☰', render: doubleline, help: 'miles:hours, 0:0, 60:1, 30:0.5, 150:2.5' },
    { id: 'clock', name: 'Clock', key: '6', icon: '◷', render: clock, help: '1/4 + 1/3  ·  3/4 - 1/6  ·  5/12  (minutes of an hour)' },
    { id: 'bar', name: 'Bar model', key: '7', icon: '▭', render: bar, help: '3/4 of 24  ·  24 = 10 + ?  ·  Ana: 12; Ben: 12 + 5' },
    { id: 'text', name: 'Words', key: '8', icon: '✎', render: null, help: 'Write a student’s words, e.g. “jump to 48, then back 1”' },
  ];

  window.MSModels = { TOOLS, esc, norm, parseVal, fmt };
})();
