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
  const UNI = { '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8', '⅐': '1/7', '⅑': '1/9', '⅒': '1/10' };
  // Accept the many ways people type math: unicode fractions, ×, ·, −, →, ->, "times", "by"
  const norm = s => String(s || '')
    .replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞⅐⅑⅒]/g, c => ' ' + UNI[c])
    .replace(/(\d)\s+(?=\d+\/\d)/g, '$1 ')
    .replace(/→|⟶|⇒|->|=>/g, '>')
    .replace(/[−–—]/g, '-').replace(/[×✕·•∙]/g, 'x').replace(/÷/g, '/')
    .replace(/\btimes\b/gi, 'x').replace(/(\d|\))\s+by\s+(?=[\d(])/gi, '$1 x ');
  const round = v => Math.round(v * 1e9) / 1e9;
  function fmt(v) {
    v = round(v);
    if (Number.isInteger(v)) return String(v);
    return String(parseFloat(v.toFixed(4)));
  }
  // 0.75 -> "3/4", 1.25 -> "1 1/4" (denominators up to 100)
  function toFrac(v) {
    v = round(v);
    if (Number.isInteger(v)) return String(v);
    for (let d = 2; d <= 100; d++) {
      const n = Math.round(v * d);
      if (Math.abs(n / d - v) < 1e-9) {
        const sign = n < 0 ? '-' : '', an = Math.abs(n), w = Math.floor(an / d), r = an % d;
        return sign + (w ? w + ' ' : '') + r + '/' + d;
      }
    }
    return fmt(v);
  }
  const signed = (d, lbl) => (d < 0 ? '−' : '+') + (lbl || fmt(Math.abs(d)));
  const minus = s => String(s).replace(/^-/, '−');

  // "3/4" -> {v:.75,label:'3/4'}; "2.5" -> {v:2.5,label:'2.5'}
  function parseVal(t) {
    t = String(t).replace(/\s+/g, '').replace(/^\$|%$/g, '');
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
    let s = norm(input).trim();
    if (!s) return { empty: true };
    // "38 + 9 = 38 + 10 - 1" or "38 +10 -1 = 47": use the last part that has jumps, ignore a bare answer
    if (s.includes('=')) {
      const parts = s.split('=').map(p => p.trim()).filter(p => p && !/^-?[\d.\/\s]+$/.test(p) || /\s[+-]/.test(p));
      const withJumps = parts.filter(p => /[+\->~@]\s*\d|\d\s+\d|[a-z]/i.test(p.replace(/^-/, '')));
      s = (withJumps.length ? withJumps[withJumps.length - 1] : parts[parts.length - 1] || s.split('=')[0]).trim();
    }
    // words: "start at 38, jump 10, back 1", "38 to 48", "89 gap 100", "mark 100"
    s = s.replace(/\b(start(ing)?( at)?|begin( at)?|from|then|and|land(ed|s)?( on| at)?|so)\b/gi, ' ')
      .replace(/\b(gap|distance|how far)( to)?\s*(?=-?[\d.])/gi, ' ~')
      .replace(/\b(jump(ed)?|went|go|up|down|back)?\s*to\s*(?=-?[\d.])/gi, ' >')
      .replace(/\b(back|minus|subtract(ed)?|take( away| back)?|took( away| back)?|down|less)\s*(?=[\d.])/gi, ' -')
      .replace(/\b(jump(ed)?|add(ed)?|plus|up|forward|over)\s*(?=[\d.])/gi, ' +')
      .replace(/\b(mark|at|point)\s*(?=-?[\d.])/gi, ' @')
      .replace(/[a-z]+/gi, w => (w.toLowerCase() === 'x' ? 'x' : ' '));
    const toks = s.match(/[>@~]\s*-?\s*\d*\.?\d+(?:\s*\/\s*\d+)?|[+-]?\s*\d*\.?\d+(?:\s*\/\s*\d+)?(?:\s*x\s*\d+)?/g);
    if (!toks) return { error: 'Start with a number, e.g. 38 +10 -1' };
    const fracMode = /\d\/\d/.test(s);
    const ptLabel = v => fracMode ? toFrac(v) : fmt(v);
    const pts = new Map();
    const addPt = (v, label, start) => {
      const k = round(v);
      const p = pts.get(k) || { v: k, label, start: false };
      if (start) p.start = true;
      if (label && !p.label) p.label = label;
      pts.set(k, p);
    };
    const arcs = [];
    let cur = null;
    toks.forEach((raw, i) => {
      const t = raw.replace(/\s+/g, '');
      const op = /^[>@~+-]/.test(t) ? t[0] : '';
      if (i === 0) { const pv = parseVal(t); if (pv) { cur = pv.v; addPt(pv.v, fracMode ? ptLabel(pv.v) : pv.label, true); } return; }
      if (op === '+' || op === '-') {
        const [amt, times] = t.slice(1).split('x');
        const pv = parseVal(amt); if (!pv || cur == null) return;
        const reps = Math.min(Math.max(parseInt(times || '1', 10) || 1, 1), 40);
        const d = op === '+' ? pv.v : -pv.v;
        for (let k = 0; k < reps; k++) {
          const from = cur; cur = round(cur + d);
          addPt(cur, ptLabel(cur));
          arcs.push({ from, to: cur, label: signed(d, pv.label), kind: d >= 0 ? 'fwd' : 'back' });
        }
      } else {
        const pv = parseVal(op ? t.slice(1) : t); if (!pv) return;
        if (op === '@') { addPt(pv.v, fracMode ? ptLabel(pv.v) : pv.label); cur = pv.v; }
        else if (op === '>' || !op) { const from = cur; if (from == null) return; if (round(pv.v) === round(from)) return; addPt(pv.v, fracMode ? ptLabel(pv.v) : pv.label); cur = pv.v; const d = round(pv.v - from); arcs.push({ from, to: pv.v, label: signed(Math.abs(d) < 1e-12 ? 0 : d, fracMode ? toFrac(Math.abs(d)) : null), kind: d >= 0 ? 'fwd' : 'back' }); }
        else if (op === '~') { const from = cur; if (from == null) return; addPt(pv.v, fracMode ? ptLabel(pv.v) : pv.label); cur = pv.v; arcs.push({ from, to: pv.v, label: ptLabel(Math.abs(pv.v - from)), kind: 'gap' }); }
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
  // "1:7, 10:70" · "1:7 10:70" · "1 to 7, 10 to 70" · "1|7" · "bags:apples, ..."
  function pairsOf(s) {
    s = s.replace(/\s+to\s+/gi, ':').replace(/\s*=\s*/g, ':');
    return [...s.matchAll(/([^\s,;:|]+)\s*[:|]\s*([^\s,;:|]+)/g)].map(m => [m[1], m[2]]);
  }
  function ratio(input, labels) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const pairs = pairsOf(s);
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

  const C_ = C;
  // "30+8 x 7", "40-2 x 20", or "40x20 - 2x20" -> [[terms of left factor], [terms of right factor]]
  // Each term: {v, label, neg}. The first term of a side is always positive.
  function parseFactors(input) {
    const all = norm(input).replace(/\*/g, 'x').replace(/\)\s*\(/g, ') x (').trim();
    // "38 x 20 = 40 x 20 - 2 x 20": try each side, most detailed first
    const parts = all.split('=').map(p => p.trim()).filter(Boolean);
    let best = null;
    parts.forEach(p => {
      const r = parseFactorsOne(p);
      if (r && (!best || r[0].length + r[1].length >= best[0].length + best[1].length)) best = r;
    });
    return best;
  }
  // "30x20 + 8x20 + 30x3 + 8x3" -> "30+8 x 20+3"; "30x7 + 8x7" -> "30+8 x 7"
  function groupProducts(s) {
    const re = /([+-]?)\s*([\d.\/]+)\s*x\s*([\d.\/]+)/g;
    if (s.replace(re, '').trim()) return null;
    const prods = [...s.matchAll(re)].map(m => ({ neg: m[1] === '-', a: m[2], b: m[3] }));
    if (prods.length < 2 || prods[0].neg) return null;
    const join = xs => xs.map((x, i) => (i ? (x.neg ? '-' : '+') : '') + x.v).join('');
    if (prods.every(p => p.b === prods[0].b)) return `${join(prods.map(p => ({ v: p.a, neg: p.neg })))} x ${prods[0].b}`;
    if (prods.every(p => p.a === prods[0].a)) return `${prods[0].a} x ${join(prods.map(p => ({ v: p.b, neg: p.neg })))}`;
    if (prods.every(p => p.b === prods[0].a) || prods.every(p => p.a === prods[0].b)) return null;
    // mixed shared factor: 40x20 - 20x2
    const swap = prods.map(p => ({ ...p }));
    for (let i = 1; i < swap.length; i++) if (swap[i].a === swap[0].b && swap[i].b !== swap[0].b) [swap[i].a, swap[i].b] = [swap[i].b, swap[i].a];
    if (swap.every(p => p.b === swap[0].b)) return `${join(swap.map(p => ({ v: p.a, neg: p.neg })))} x ${swap[0].b}`;
    // full grid of partial products, all added
    if (prods.some(p => p.neg)) return null;
    const A = [...new Set(prods.map(p => p.a))], B = [...new Set(prods.map(p => p.b))];
    if (A.length * B.length !== prods.length || !A.every(a => B.every(b => prods.some(p => p.a === a && p.b === b)))) return null;
    return `${A.join('+')} x ${B.join('+')}`;
  }
  function parseFactorsOne(input) {
    let s = input.replace(/[()]/g, ' ').trim();
    if ((s.match(/x/gi) || []).length >= 2) { const g = groupProducts(s); if (!g) return null; s = g; }
    const sides = s.split(/\s*x\s*/i).map(t => t.trim()).filter(Boolean);
    if (sides.length !== 2) return null;
    const parts = sides.map(side => {
      const terms = []; const re = /([+-]?)\s*([\d.]+(?:\/[\d.]+)?)/g; let m;
      const leftover = side.replace(re, '').trim();
      if (leftover) return null;
      while ((m = re.exec(side))) { const pv = parseVal(m[2]); if (!pv || pv.v <= 0) return null; terms.push({ v: pv.v, label: pv.label, neg: m[1] === '-' }); }
      if (!terms.length || terms[0].neg) return null;
      const pos = terms.filter(t => !t.neg).reduce((a, t) => a + t.v, 0), neg = terms.filter(t => t.neg).reduce((a, t) => a + t.v, 0);
      if (neg >= pos) return null;
      return terms;
    });
    if (parts.some(p => !p)) return null;
    return parts;
  }
  // Lay out the terms of one side: positive parts side by side, subtracted parts carved from the far end.
  function layoutSide(terms, scale, minPos, minNeg) {
    const pos = terms.filter(t => !t.neg), neg = terms.filter(t => t.neg);
    const sizes = pos.map(t => Math.max(t.v * scale, minPos));
    const out = []; let x = 0;
    pos.forEach((t, i) => { out.push({ t, a: x, b: x + sizes[i] }); x += sizes[i]; });
    let end = x;
    const negOut = neg.map(t => { const w = Math.max(t.v * scale, minNeg); const r = { t, a: end - w, b: end }; end -= w; return r; });
    return { pos: out, neg: negOut, total: x };
  }

  /* ---------- Area model ----------  30+8 x 7   ·   20+3 x 10+4   ·   40-2 x 20 */
  function area(input, labels, model) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const f = parseFactors(s);
    if (!f) return { error: 'Type it like 30+8 x 7, or 40-2 x 20 to take a strip away' };
    const [colsT, rowsT] = f; // left factor runs across the top
    const posSum = ts => ts.filter(t => !t.neg).reduce((a, t) => a + t.v, 0);
    const k0 = Math.min(720 / posSum(colsT), 300 / posSum(rowsT));
    let C = layoutSide(colsT, k0, 74, 40), R = layoutSide(rowsT, k0, 58, 34);
    const sc = Math.min(1, 720 / C.total, 300 / R.total);
    if (sc < 1) { C = layoutSide(colsT, k0 * sc, 74 * sc, 34), R = layoutSide(rowsT, k0 * sc, 58 * sc, 30); }
    const hasNegC = C.neg.length > 0, hasNegR = R.neg.length > 0;
    const x0 = (W - C.total) / 2 + 20 - (hasNegR ? 30 : 0), y0 = 44;
    const hidden = new Set((model && model.hidden) || []);
    const num = v => fmt(v);
    let body = '';
    C.pos.forEach(c => (body += text(x0 + (c.a + c.b) / 2, y0 - 14, c.t.label, { size: 24, weight: 700, fill: C_.fwd })));
    R.pos.forEach(r => (body += text(x0 - 14, y0 + (r.a + r.b) / 2 + 8, r.t.label, { size: 24, weight: 700, fill: C_.fwd, anchor: 'end' })));
    R.pos.forEach((r, j) => C.pos.forEach((c, i) => {
      const key = i + '_' + j, fill = C_.fills[(i + j * C.pos.length) % C_.fills.length];
      const w = c.b - c.a, hh = r.b - r.a;
      body += `<rect class="cell-toggle" data-cell="${key}" x="${x0 + c.a}" y="${y0 + r.a}" width="${w}" height="${hh}" fill="${fill}" fill-opacity=".22" stroke="${C_.ink}" stroke-width="2.5"/>`;
      // keep the product clear of any strip being taken away
      let cx = c.a + w / 2, cy = r.a + hh / 2, avW = w, avH = hh;
      const cut = C.neg.length ? Math.min(...C.neg.map(n => n.a)) : Infinity, cutR = R.neg.length ? Math.min(...R.neg.map(n => n.a)) : Infinity;
      if (c.b > cut) { avW = Math.max(30, cut - c.a); cx = c.a + avW / 2; }
      if (r.b > cutR) { avH = Math.max(30, cutR - r.a); cy = r.a + avH / 2; }
      const fs = Math.max(15, Math.min(30, Math.min(avW, avH) / 2.6));
      const l = editable('c' + key, labels, hidden.has(key) ? '?' : num(c.t.v * r.t.v));
      body += text(x0 + cx, y0 + cy + fs / 3, l.text, { size: fs, weight: 700, edit: 'c' + key, custom: l.custom });
    }));
    const H = R.total, Wd = C.total;
    const strip = (x, y, w, hh, key, val) => {
      body += `<rect class="cell-toggle" data-cell="${key}" x="${x}" y="${y}" width="${w}" height="${hh}" fill="url(#hatch)" fill-opacity=".85" stroke="${C_.back}" stroke-width="3" stroke-dasharray="7 4"/>`;
      const fs = Math.max(14, Math.min(26, Math.min(w, hh) / 2.2));
      const l = editable('c' + key, labels, hidden.has(key) ? '?' : '−' + num(val));
      body += `<text x="${x + w / 2}" y="${y + hh / 2 + fs / 3}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${C_.back}" paint-order="stroke" stroke="#fff" stroke-width="5" class="editable${l.custom ? ' custom' : ''}" data-edit="c${key}">${esc(l.text)}</text>`;
    };
    C.neg.forEach((n, i) => {
      R.pos.forEach((r, j) => strip(x0 + n.a, y0 + r.a, n.b - n.a, r.b - r.a, `n${i}_${j}`, n.t.v * r.t.v));
      body += text(x0 + (n.a + n.b) / 2, y0 + H + 30, '−' + n.t.label, { size: 24, weight: 700, fill: C_.back });
      body += `<line x1="${x0 + n.a}" y1="${y0 + H + 6}" x2="${x0 + n.b}" y2="${y0 + H + 6}" stroke="${C_.back}" stroke-width="3"/>`;
    });
    R.neg.forEach((n, j) => {
      C.pos.forEach((c, i) => strip(x0 + c.a, y0 + n.a, c.b - c.a, n.b - n.a, `m${i}_${j}`, n.t.v * c.t.v));
      body += text(x0 + Wd + 14, y0 + (n.a + n.b) / 2 + 8, '−' + n.t.label, { size: 24, weight: 700, fill: C_.back, anchor: 'start' });
      body += `<line x1="${x0 + Wd + 6}" y1="${y0 + n.a}" x2="${x0 + Wd + 6}" y2="${y0 + n.b}" stroke="${C_.back}" stroke-width="3"/>`;
    });
    return { svg: svg(y0 + H + (hasNegC ? 48 : 20), body) };
  }

  /* ---------- Array (dots) ----------  6 x 8  ·  6 x 5+3  ·  10-1 x 12 */
  function array(input) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const f = parseFactors(s);
    if (!f) return { error: 'Type it like 6 x 8, 6 x 5+3, or 10-1 x 12' };
    let [rowsT, colsT] = f;
    const pos = ts => ts.filter(t => !t.neg), neg = ts => ts.filter(t => t.neg);
    const sum = ts => ts.reduce((a, t) => a + t.v, 0);
    if ([...rowsT, ...colsT].some(t => !Number.isInteger(t.v))) return { error: 'Dots need whole numbers. Try the Area model.' };
    let flipped = false;
    // a tall, skinny array reads better turned on its side
    if (sum(pos(rowsT)) > 14 && sum(pos(rowsT)) > sum(pos(colsT)) * 1.3) { [rowsT, colsT] = [colsT, rowsT]; flipped = true; }
    const R = sum(pos(rowsT)), Cc = sum(pos(colsT));
    if (R > 40 || Cc > 80) return { error: 'Too many dots to see (keep it within 40 × 80). Try the Area model.' };
    const gapU = 0.9;
    const sp = Math.min(34, 820 / (Cc + gapU * (pos(colsT).length - 1)), 330 / (R + gapU * (pos(rowsT).length - 1)));
    const r = Math.max(1.6, sp * 0.32);
    const tw = sp * (Cc + gapU * (pos(colsT).length - 1)), x0 = (W - tw) / 2 + sp / 2, y0 = 50;
    const place = (terms, base) => { const out = []; terms.forEach((t, gi) => { const start = out.length ? out[out.length - 1].p + sp * (1 + gapU) : base; for (let i = 0; i < t.v; i++) out.push({ p: start + i * sp, g: gi }); }); return out; };
    const colX = place(pos(colsT), x0), rowY = place(pos(rowsT), y0);
    const negCols = sum(neg(colsT)), negRows = sum(neg(rowsT));
    let body = '', ci = 0, ri = 0;
    pos(colsT).forEach(t => { const a = colX[ci].p, b = colX[ci + t.v - 1].p; body += text((a + b) / 2, y0 - sp / 2 - 12, t.label, { size: 22, weight: 700, fill: C_.fwd }); ci += t.v; });
    pos(rowsT).forEach(t => { const a = rowY[ri].p, b = rowY[ri + t.v - 1].p; body += text(x0 - sp / 2 - 14, (a + b) / 2 + 8, t.label, { size: 22, weight: 700, fill: C_.fwd, anchor: 'end' }); ri += t.v; });
    rowY.forEach((ry, i) => colX.forEach((cx, j) => {
      const gone = j >= colX.length - negCols || i >= rowY.length - negRows;
      body += gone
        ? `<circle cx="${cx.p}" cy="${ry.p}" r="${r}" fill="#fff" stroke="${C_.back}" stroke-width="${Math.max(1.2, r * 0.35)}"/>`
        : `<circle cx="${cx.p}" cy="${ry.p}" r="${r}" fill="${C_.fills[(cx.g + ry.g * 2) % C_.fills.length]}"/>`;
    }));
    const lastY = rowY[rowY.length - 1].p, lastX = colX[colX.length - 1].p;
    if (negCols) {
      const a = colX[colX.length - negCols].p - sp / 2, b = lastX + sp / 2;
      body += `<rect x="${a}" y="${y0 - sp / 2}" width="${b - a}" height="${lastY - y0 + sp}" fill="none" stroke="${C_.back}" stroke-width="3" stroke-dasharray="7 4" rx="6"/>`;
      body += text((a + b) / 2, lastY + sp / 2 + 28, '−' + neg(colsT).map(t => t.label).join(' − '), { size: 22, weight: 700, fill: C_.back });
    }
    if (negRows) {
      const a = rowY[rowY.length - negRows].p - sp / 2, b = lastY + sp / 2;
      body += `<rect x="${x0 - sp / 2}" y="${a}" width="${lastX - x0 + sp}" height="${b - a}" fill="none" stroke="${C_.back}" stroke-width="3" stroke-dasharray="7 4" rx="6"/>`;
      body += text(lastX + sp / 2 + 12, (a + b) / 2 + 8, '−' + neg(rowsT).map(t => t.label).join(' − '), { size: 22, weight: 700, fill: C_.back, anchor: 'start' });
    }
    return { svg: svg(lastY + sp / 2 + (negCols ? 44 : 14), body) };
  }

  /* ---------- Double number line ----------  miles:hours, 0:0, 60:1, 30:0.5, 150:2.5 */
  function doubleline(input, labels) {
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const pairs = pairsOf(s);
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
    const s = norm(input).trim();
    if (!s) return { empty: true };
    const terms = [];
    const re = /([+-]?)\s*(?:(\d+)\s+(?=\d+\s*\/))?(\d+(?:\s*\/\s*\d+)?)/g; let m;
    while ((m = re.exec(s))) {
      const pv = parseVal(m[3]); if (!pv) continue;
      const whole = m[2] ? +m[2] : 0;
      terms.push({ sign: m[1] === '-' ? -1 : 1, v: whole + pv.v, label: (whole ? whole + ' ' : '') + pv.label });
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
        // label the part that is still showing (subtractions take minutes off the end)
        let la = a, lb = b;
        if (sct.kind === 'add') sectors.forEach(o => { if (o.kind === 'sub') { const oa = Math.max(o.a, k * 60) - k * 60, ob = Math.min(o.b, (k + 1) * 60) - k * 60; if (oa < lb && ob >= lb - 0.0001 && oa > la) lb = oa; } });
        if (lb - la >= 4) { const [lx, ly] = pt(cx, (la + lb) / 2, R * 0.5); body += `<text x="${lx}" y="${ly + 7}" text-anchor="middle" font-size="${b - a >= 8 ? 20 : 15}" font-weight="700" fill="${C.ink}" paint-order="stroke" stroke="#fff" stroke-width="4">${fmt(b - a)}</text>`; }
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
      let m = line.match(/^(\d+)\s*\/\s*(\d+)\s*(?:of|x)\s*(.+)$/i);
      if (m) { const tot = parseVal(m[3]); return { name, kind: 'frac', a: +m[1], b: +m[2], total: tot ? tot.v : null, totalLabel: m[3].trim() }; }
      let total = null, totalLabel = null;
      m = line.match(/^(.+?)\s*=\s*(.+)$/);
      if (m && /\+/.test(m[1]) && !/\+/.test(m[2])) m = [m[0], m[2], m[1]]; // "10 + 14 = 24"
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

  /* ---------- shared: chains like "62 - 49 = 63 - 50" or "62 - 49 > +1" ---------- */
  function parseChain(input, opRe, shorthand) {
    let s = norm(input).replace(/\*/g, 'x').trim();
    if (!s) return { empty: true };
    s = s.replace(/\b(slide|slid|both|each|by|numbers?)\b/gi, ' ')
      .replace(/\b(up|give|gave|move|moved|add|added|plus)\s*(?=[\d.])/gi, ' > +')
      .replace(/\b(down|take|took|minus)\s*(?=[\d.])/gi, ' > -');
    const parts = s.split(/\s*(?:=|>|,|;|\bto\b|\bthen\b)\s*/i);
    const pairs = [];
    const re = new RegExp('^(-?[\\d.]+(?:/[\\d.]+)?)\\s*' + opRe + '\\s*(-?[\\d.]+(?:/[\\d.]+)?)$', 'i');
    parts.forEach(p => {
      p = p.trim(); if (!p) return;
      const m = p.match(re);
      if (m) { const a = parseVal(m[1]), b = parseVal(m[2]); if (a && b) pairs.push([a, b]); return; }
      const sh = p.match(/^([+-])\s*([\d.]+(?:\/[\d.]+)?)$/);
      if (sh && pairs.length && shorthand) { const n = parseVal(sh[2]); if (n) pairs.push(shorthand(pairs[pairs.length - 1], (sh[1] === '-' ? -1 : 1) * n.v)); }
    });
    return { pairs };
  }
  const mk = v => ({ v: round(v), label: fmt(v) });

  /* ---------- Slide (constant difference) ----------  62 - 49 = 63 - 50   ·   62 - 49 > +1 */
  function slide(input, labels) {
    const r = parseChain(input, '-', (p, n) => [mk(p[0].v + n), mk(p[1].v + n)]);
    if (r.empty) return { empty: true };
    const P = r.pairs.slice(0, 4);
    if (!P.length) return { error: 'Type it like 62 - 49 = 63 - 50, or 62 - 49 > +1' };
    const vals = P.flat().map(p => p.v);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const span = Math.max(hi - lo, 1), pad = span * 0.08;
    lo -= pad; hi += pad;
    const longest = Math.max(...P.map(([a, b]) => (a.label + b.label).length + 3));
    const xl = Math.max(170, 46 + longest * 14), xr = W - 40;
    const X = v => xl + ((v - lo) / (hi - lo)) * (xr - xl);
    const gapY = 160, top = 64;
    let body = '';
    P.forEach(([a, b], i) => {
      const y = top + i * gapY;
      body += text(20, y + 8, `${minus(a.label)} − ${minus(b.label)}`, { anchor: 'start', size: 24, weight: 700, fill: C.soft });
      body += `<line x1="${xl - 20}" y1="${y}" x2="${xr + 20}" y2="${y}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
      const x1 = X(Math.min(a.v, b.v)), x2 = X(Math.max(a.v, b.v));
      body += `<rect x="${x1}" y="${y - 7}" width="${x2 - x1}" height="14" fill="${C.gap}" opacity=".18"/>`;
      body += `<path d="M${x1} ${y - 18} L${x1} ${y - 26} L${x2} ${y - 26} L${x2} ${y - 18}" fill="none" stroke="${C.gap}" stroke-width="3"/>`;
      const l = editable('d' + i, labels, fmt(Math.abs(a.v - b.v)));
      body += text((x1 + x2) / 2, y - 34, l.text, { size: 24, weight: 700, fill: C.gap, edit: 'd' + i, custom: l.custom });
      [a, b].forEach(p => {
        const x = X(p.v);
        body += `<line x1="${x}" y1="${y - 11}" x2="${x}" y2="${y + 11}" stroke="${C.ink}" stroke-width="3"/>`;
        body += text(x, y + 36, minus(p.label), { size: 22, weight: 700 });
      });
      if (i > 0) {
        const [pa, pb] = P[i - 1], py = top + (i - 1) * gapY;
        [[pa, a, 'sa'], [pb, b, 'sb']].forEach(([from, to, k]) => {
          const fx = X(from.v), tx = X(to.v), d = round(to.v - from.v);
          body += `<path d="M${fx} ${py + 46} L${tx} ${y - 52}" fill="none" stroke="${C.back}" stroke-width="2.5" stroke-dasharray="6 5" marker-end="url(#ah-back)"/>`;
          const lb = editable(k + i, labels, signed(d));
          body += text((fx + tx) / 2 + 12, (py + y) / 2 + 2, lb.text, { anchor: 'start', size: 20, weight: 700, fill: C.back, edit: k + i, custom: lb.custom });
        });
      }
    });
    return { svg: svg(top + (P.length - 1) * gapY + 56, body) };
  }

  /* ---------- Give & take ----------  49 + 26 = 50 + 25   ·   49 + 26 > +1 */
  function givetake(input, labels) {
    const r = parseChain(input, '\\+', (p, n) => [mk(p[0].v + n), mk(p[1].v - n)]);
    if (r.empty) return { empty: true };
    const P = r.pairs.slice(0, 4);
    if (!P.length) return { error: 'Type it like 49 + 26 = 50 + 25, or 49 + 26 > +1' };
    if (P.some(([a, b]) => a.v < 0 || b.v < 0)) return { error: 'Give & take needs positive numbers' };
    const maxT = Math.max(...P.map(([a, b]) => a.v + b.v)) || 1;
    const x0 = 190, k = (W - x0 - 110) / maxT, barH = 54, gap = 76, top = 20;
    let body = '';
    P.forEach(([a, b], i) => {
      const y = top + i * (barH + gap);
      const wa = a.v * k, wb = b.v * k;
      body += text(20, y + barH / 2 + 8, `${a.label} + ${b.label}`, { anchor: 'start', size: 24, weight: 700, fill: C.soft });
      body += `<rect x="${x0}" y="${y}" width="${wa}" height="${barH}" fill="${C.fills[0]}" fill-opacity=".4" stroke="${C.ink}" stroke-width="2.5"/>`;
      body += `<rect x="${x0 + wa}" y="${y}" width="${wb}" height="${barH}" fill="${C.fills[1]}" fill-opacity=".4" stroke="${C.ink}" stroke-width="2.5"/>`;
      if (wa > 34) body += text(x0 + wa / 2, y + barH / 2 + 9, a.label, { size: 26, weight: 700 });
      if (wb > 34) body += text(x0 + wa + wb / 2, y + barH / 2 + 9, b.label, { size: 26, weight: 700 });
      body += text(x0 + wa + wb + 14, y + barH / 2 + 8, '= ' + fmt(a.v + b.v), { anchor: 'start', size: 24, weight: 700, fill: C.gap });
    });
    for (let i = 1; i < P.length; i++) {
      const [pa] = P[i - 1], [a] = P[i];
      const n = round(a.v - pa.v); if (!n) continue;
      const yPrev = top + (i - 1) * (barH + gap), y = top + i * (barH + gap);
      let sx = x0 + Math.min(pa.v, a.v) * k, sw = Math.abs(n) * k;
      if (sw < 12) { sx -= (12 - sw) / 2; sw = 12; }
      body += `<rect x="${sx}" y="${yPrev}" width="${sw}" height="${barH}" fill="url(#hatch)" stroke="${C.back}" stroke-width="3"/>`;
      body += `<rect x="${sx}" y="${y}" width="${sw}" height="${barH}" fill="${C.back}" fill-opacity=".55" stroke="${C.back}" stroke-width="3"/>`;
      const mx = sx + sw / 2;
      body += `<path d="M${mx} ${yPrev + barH + 4} C ${mx + 40} ${yPrev + barH + 30}, ${mx + 40} ${y - 30}, ${mx + 2} ${y - 6}" fill="none" stroke="${C.back}" stroke-width="2.5" marker-end="url(#ah-back)"/>`;
      const giver = n > 0 ? P[i - 1][1].label : P[i - 1][0].label, getter = n > 0 ? P[i - 1][0].label : P[i - 1][1].label;
      const l = editable('g' + i, labels, `${fmt(Math.abs(n))} moves from ${giver} to ${getter}`);
      const fits = mx + 50 + l.text.length * 11.5 < W - 6;
      body += text(fits ? mx + 50 : mx - 14, (yPrev + barH + y) / 2 + 8, l.text, { anchor: fits ? 'start' : 'end', size: 21, weight: 700, fill: C.back, edit: 'g' + i, custom: l.custom });
    }
    return { svg: svg(top + P.length * (barH + gap) - gap + 16, body) };
  }

  /* ---------- Doubling & halving ----------  16 x 25 = 8 x 50 = 4 x 100 */
  function halve(input, labels) {
    const r = parseChain(input, 'x', null);
    if (r.empty) return { empty: true };
    const P = r.pairs.slice(0, 4);
    if (!P.length) return { error: 'Type it like 16 x 25 = 8 x 50 = 4 x 100' };
    if (P.some(([a, b]) => a.v <= 0 || b.v <= 0)) return { error: 'Use positive numbers' };
    // the factor that grows from the first to the second step runs across
    let wi = P.length > 1 ? (P[1][0].v > P[0][0].v ? 0 : 1) : (P[0][0].v >= P[0][1].v ? 0 : 1);
    const rows = P.map(p => ({ w: p[wi], h: p[1 - wi] }));
    const maxW = Math.max(...rows.map(r => r.w.v)), sumH = rows.reduce((s, r) => s + r.h.v, 0);
    const gap = 80, top = 40, x0 = 120;
    const k = Math.min((W - x0 - 60) / maxW, Math.max(60, 560 - gap * rows.length) / sumH);
    let y = top, body = '';
    rows.forEach((r, i) => {
      const w = Math.max(30, r.w.v * k), h = Math.max(20, r.h.v * k);
      r.px = { y, w, h };
      body += text(x0 + w / 2, y - 10, r.w.label, { size: 22, weight: 700, fill: C.fwd });
      body += text(x0 - 12, y + h / 2 + 8, r.h.label, { size: 22, weight: 700, fill: C.fwd, anchor: 'end' });
      y += h + gap;
    });
    rows.forEach((r, i) => {
      const { y: ry, w, h } = r.px;
      const next = rows[i + 1], prev = rows[i - 1];
      // how this rectangle is cut (going down) and how it was rebuilt (coming from above)
      const cut = next ? next.w.v / r.w.v : 1, built = prev ? r.w.v / prev.w.v : 1;
      const nCut = Math.round(cut >= 1 ? cut : 1 / cut), nBuilt = Math.round(built >= 1 ? built : 1 / built);
      const okCut = next && nCut >= 2 && Math.abs((cut >= 1 ? cut : 1 / cut) - nCut) < 1e-9 && nCut <= 12;
      const okBuilt = prev && nBuilt >= 2 && Math.abs((built >= 1 ? built : 1 / built) - nBuilt) < 1e-9 && nBuilt <= 12;
      body += `<rect x="${x0}" y="${ry}" width="${w}" height="${h}" fill="${C.fills[0]}" fill-opacity=".28" stroke="${C.ink}" stroke-width="2.5"/>`;
      if (okBuilt) {
        // pieces now side by side (or stacked) — tint the moved ones
        for (let j = 1; j < nBuilt; j++) {
          if (built >= 1) body += `<rect x="${x0 + (w * j) / nBuilt}" y="${ry}" width="${w / nBuilt}" height="${h}" fill="${C.fills[1]}" fill-opacity=".45" stroke="${C.back}" stroke-width="2" stroke-dasharray="6 4"/>`;
          else body += `<rect x="${x0}" y="${ry + (h * j) / nBuilt}" width="${w}" height="${h / nBuilt}" fill="${C.fills[1]}" fill-opacity=".45" stroke="${C.back}" stroke-width="2" stroke-dasharray="6 4"/>`;
        }
      }
      if (okCut) {
        for (let j = 1; j < nCut; j++) {
          if (cut >= 1) body += `<line x1="${x0 - 6}" y1="${ry + (h * j) / nCut}" x2="${x0 + w + 6}" y2="${ry + (h * j) / nCut}" stroke="${C.back}" stroke-width="3" stroke-dasharray="8 5"/>`;
          else body += `<line x1="${x0 + (w * j) / nCut}" y1="${ry - 6}" x2="${x0 + (w * j) / nCut}" y2="${ry + h + 6}" stroke="${C.back}" stroke-width="3" stroke-dasharray="8 5"/>`;
        }
      }
      if (next) {
        const f = cut >= 1 ? cut : 1 / cut, fl = fmt(f);
        const grow = cut >= 1 ? r.w.label : r.h.label, shrink = cut >= 1 ? r.h.label : r.w.label;
        const def = f === 2 ? `halve ${shrink}, double ${grow}` : `÷${fl} ${shrink}, ×${fl} ${grow}`;
        const l = editable('h' + i, labels, def);
        const ly = ry + h + 28;
        body += `<path d="M${x0 + 20} ${ry + h + 10} L${x0 + 20} ${ry + h + gap - 14}" stroke="${C.back}" stroke-width="2.5" marker-end="url(#ah-back)"/>`;
        body += text(x0 + 36, ly + 2, l.text, { anchor: 'start', size: 20, weight: 700, fill: C.back, edit: 'h' + i, custom: l.custom });
      }
    });
    return { svg: svg(y - gap + 18, body) };
  }

  /* ---------- Standard algorithm (column method) ----------
     38 + 9   ·   2.5 + 1.9   ·   100 - 76   ·   38 x 7   ·   24 x 13   ·   38 + 9 = 48 (show a student's answer) */
  function column(input, labels, model) {
    let s = norm(input).replace(/\*/g, 'x').trim();
    if (!s) return { empty: true };
    let typed = null;
    const eq = s.split('=').map(t => t.trim());
    if (eq.length > 1) { s = eq[0]; if (/^-?[\d.]+$/.test(eq[eq.length - 1])) typed = eq[eq.length - 1]; }
    s = s.replace(/\s+/g, '');
    let op, parts;
    if (/x/i.test(s)) { op = 'x'; parts = s.split(/x/i); }
    else if (/\d\+/.test(s)) { op = '+'; parts = s.split('+'); }
    else if (/\d-/.test(s)) { op = '-'; parts = s.split(/(?<=\d)-/); }
    else return { error: 'Type a problem like 38 + 9, 100 - 76, or 38 x 7' };
    if (parts.some(p => !/^\d*\.?\d+$/.test(p))) return { error: 'Use whole numbers or decimals, like 38 + 9 or 2.5 + 1.9' };
    if ((op === '-' || op === 'x') && parts.length !== 2) return { error: op === '-' ? 'Subtract one number from another, like 100 - 76' : 'Multiply two numbers, like 38 x 7' };
    if (parts.length > 5) return { error: 'Up to 5 numbers at a time' };
    const decOf = p => (p.split('.')[1] || '').length;
    const hidden = new Set((model && model.hidden) || []);
    const cw = 46, fs = 42, small = 22, dw = 14;
    const ink = C.ink, carryC = C.back, soft = '#9aa3b2';

    // shared drawing: rows of digit strings right-aligned on a grid (with an optional decimal point)
    let body = '';
    const draw = (rows, d, extra) => {
      // rows: [{ digits: [{ch, gray, cross}], prefix, y, dot }]; column k counts from the right
      const width = Math.max(...rows.map(r => r.digits.length));
      const xRight = W / 2 + ((width * cw + (d ? dw : 0)) / 2) + 30;
      const colX = k => xRight - k * cw - (d && k >= d ? dw : 0) - cw / 2;
      rows.forEach(r => {
        const n = r.digits.length;
        r.digits.forEach((g, i) => {
          const k = n - 1 - i, x = colX(k);
          body += `<text x="${x}" y="${r.y}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${g.gray ? soft : r.color || ink}"${r.cls ? ` class="${r.cls}" data-cell="ans"` : ''}>${esc(g.ch)}</text>`;
          if (g.cross) body += `<line x1="${x - 14}" y1="${r.y + 2}" x2="${x + 14}" y2="${r.y - 30}" stroke="${carryC}" stroke-width="3"/>`;
          if (g.above != null) body += `<text x="${x}" y="${r.y - 40}" text-anchor="middle" font-size="${small + 4}" font-weight="700" fill="${carryC}">${esc(g.above)}</text>`;
        });
        if (r.dot && d) body += `<text x="${xRight - d * cw - dw / 2}" y="${r.y}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${r.color || ink}">.</text>`;
        if (r.prefix) body += `<text x="${colX(width - 1) - cw - 6}" y="${r.y}" text-anchor="middle" font-size="${fs}" font-weight="400" fill="${C.soft}">${esc(r.prefix)}</text>`;
      });
      (extra || []).forEach(e => {
        if (e.line) body += `<line x1="${colX(width - 1) - cw * 1.6}" y1="${e.line}" x2="${xRight + 6}" y2="${e.line}" stroke="${ink}" stroke-width="3"/>`;
        if (e.carry) e.carry.forEach(([k, v]) => (body += `<text x="${colX(k)}" y="${e.y}" text-anchor="middle" font-size="${small}" font-weight="700" fill="${carryC}">${esc(v)}</text>`));
      });
    };
    const digitsOf = (str, len, d, padTo) => {
      // str is the scaled integer as text; show leading zeros only to reach one digit before the point
      let t = str.padStart(d + 1, '0');
      const own = padTo;
      return t.split('').map((ch, i) => ({ ch, gray: i >= t.length - d + own }));
    };
    const answerRow = (str, d, y, correct) => {
      const shown = typed != null ? typed.replace('.', '') : str;
      const td = typed != null ? decOf(typed) : d;
      if (hidden.has('ans')) return { digits: [{ ch: '?' }], y, cls: 'cell-toggle', color: C.fwd };
      let t = (typed != null ? shown.replace(/^0+(?=\d)/, '') : shown);
      t = t.padStart(td + 1, '0');
      // re-scale a typed answer to the grid's decimals
      if (td < d) t = t + '0'.repeat(d - td);
      return { digits: t.split('').map((ch, i) => ({ ch, gray: typed != null && td < d && i >= t.length - (d - td) })), y, dot: true, cls: 'cell-toggle', color: C.fwd };
    };

    if (op === '+' || op === '-') {
      const d = Math.max(...parts.map(decOf));
      const nums = parts.map(p => BigInt(Math.round(parseFloat(p) * 10 ** d)));
      if (op === '-' && nums[0] < nums[1]) return { error: 'Put the larger number first, like 100 - 76' };
      const strs = nums.map(n => n.toString());
      const res = op === '+' ? nums.reduce((a, b) => a + b, 0n) : nums[0] - nums[1];
      const L = Math.max(...strs.map(x => Math.max(x.length, d + 1)), res.toString().length);
      const y0 = 70, rowH = 62;
      const rows = strs.map((str, i) => ({ digits: digitsOf(str, L, d, decOf(parts[i])), y: y0 + i * rowH, dot: true, prefix: i === strs.length - 1 ? (op === '+' ? '+' : '−') : '' }));
      const extra = [];
      if (op === '+') {
        // carries above the top row
        const cols = strs.map(x => x.split('').reverse().map(Number));
        let carry = 0; const marks = [];
        for (let k = 0; k < L; k++) {
          const sum = cols.reduce((a, c) => a + (c[k] || 0), 0) + carry;
          carry = Math.floor(sum / 10);
          if (carry && k + 1 < L + 1) marks.push([k + 1, String(carry)]);
        }
        extra.push({ y: y0 - 42, carry: marks.filter(([k]) => k < Math.max(L, res.toString().length)) });
      } else {
        // regrouping: cross out digits and write the new values above
        const top = strs[0].padStart(L, '0').split('').reverse().map(Number), bot = strs[1].split('').reverse().map(Number);
        const t = top.slice(), changed = new Set();
        for (let k = 0; k < L; k++) {
          if (t[k] < (bot[k] || 0)) {
            let j = k + 1; while (j < L && t[j] === 0) j++;
            if (j >= L) break;
            t[j] -= 1; changed.add(j);
            for (let m = j - 1; m > k; m--) { t[m] = 9; changed.add(m); }
            t[k] += 10; changed.add(k);
          }
        }
        const r0 = rows[0], n0 = r0.digits.length;
        r0.digits.forEach((g, i) => { const k = n0 - 1 - i; if (changed.has(k)) { g.cross = true; g.above = String(t[k]); } });
      }
      const lineY = y0 + (strs.length - 1) * rowH + 22;
      extra.push({ line: lineY });
      rows.push(answerRow(res.toString(), d, lineY + 56));
      draw(rows, d, extra);
      return { svg: svg(lineY + 80, body) };
    }

    // multiplication: partial products under the line, then their sum
    const [a, b] = parts;
    const da = decOf(a), db = decOf(b), dTot = da + db;
    const A = BigInt(a.replace('.', '')), B = BigInt(b.replace('.', ''));
    const bDigits = B.toString().split('').reverse().map(Number);
    if (A.toString().length + B.toString().length > 12) return { error: 'Those numbers are too long to show neatly' };
    const y0 = 70, rowH = 58;
    const rows = [
      { digits: a.split('').map(ch => ({ ch })), y: y0 },
      { digits: b.split('').map(ch => ({ ch })), y: y0 + rowH, prefix: '×' },
    ];
    const extra = [];
    if (bDigits.length === 1 && !dTot) {
      let carry = 0; const marks = []; const ad = A.toString().split('').reverse().map(Number);
      ad.forEach((dg, k) => { const p = dg * bDigits[0] + carry; carry = Math.floor(p / 10); if (carry && k + 1 < ad.length) marks.push([k + 1, String(carry)]); });
      extra.push({ y: y0 - 42, carry: marks });
    }
    let y = y0 + rowH + 22; extra.push({ line: y });
    const prod = A * B;
    if (bDigits.length > 1) {
      bDigits.forEach((dg, r) => {
        const pp = (A * BigInt(dg)).toString();
        y += 56;
        rows.push({ digits: [...pp.split('').map(ch => ({ ch })), ...Array(r).fill(0).map(() => ({ ch: '0', gray: true }))], y, prefix: r === bDigits.length - 1 ? '+' : '' });
      });
      y += 22; extra.push({ line: y });
    }
    // answer: whole-number product with the decimal point put back
    let ansStr = prod.toString();
    if (dTot) { ansStr = ansStr.padStart(dTot + 1, '0'); ansStr = ansStr.slice(0, -dTot) + '.' + ansStr.slice(-dTot); }
    if (typed != null) ansStr = typed;
    rows.push(hidden.has('ans')
      ? { digits: [{ ch: '?' }], y: y + 56, cls: 'cell-toggle', color: C.fwd }
      : { digits: ansStr.split('').map(ch => ({ ch })), y: y + 56, cls: 'cell-toggle', color: C.fwd });
    draw(rows, 0, extra);
    return { svg: svg(y + 80, body) };
  }

  const TOOLS = [
    { id: 'numberline', name: 'Number line', key: '1', icon: '⟷', render: numberline, help: '38 +10 -1  ·  38 to 48 to 47  ·  start 38, jump 10, back 1  ·  0 +20x3  ·  89 gap 100' },
    { id: 'slide', name: 'Slide (same difference)', short: 'Slide', key: '9', icon: '⇉', render: slide, help: '62 - 49 = 63 - 50  ·  62 - 49 up 1  ·  add more: = 73 - 60' },
    { id: 'givetake', name: 'Give & take', key: '0', icon: '⇄', render: givetake, help: '49 + 26 = 50 + 25  ·  49 + 26 give 1' },
    { id: 'ratio', name: 'Ratio table', short: 'Ratio', key: '2', icon: '▦', render: ratio, help: '1:7, 10:70, 5:35  ·  1 to 7, 10 to 70  ·  names first: bags:apples, 1:7' },
    { id: 'area', name: 'Area model', short: 'Area', key: '3', icon: '▣', render: area, help: '30+8 x 7  ·  40x20 - 2x20  ·  30x20 + 8x20 + 30x3 + 8x3  ·  click a box to hide its product' },
    { id: 'array', name: 'Array', key: '4', icon: '⁘', render: array, help: '6 x 8  ·  6 x 5+3 (split)  ·  10-1 x 12 (take a row away)  ·  40x20 - 2x20' },
    { id: 'halve', name: 'Doubling & halving', short: 'Halving', key: '', icon: '◫', render: halve, help: '16 x 25 = 8 x 50 = 4 x 100  ·  also ×3 ÷3: 12 x 15 = 4 x 45' },
    { id: 'doubleline', name: 'Double number line', short: 'Dbl. line', key: '5', icon: '☰', render: doubleline, help: 'miles:hours, 0:0, 60:1, 30:0.5, 150:2.5' },
    { id: 'clock', name: 'Clock', key: '6', icon: '◷', render: clock, help: '1/4 + 1/3  ·  3/4 - 1/6  ·  1 1/2 - 1/4  (minutes of an hour)' },
    { id: 'bar', name: 'Bar model', short: 'Bar', key: '7', icon: '▭', render: bar, help: '3/4 of 24  ·  24 = 10 + ?  ·  Ana: 12; Ben: 12 + 5' },
    { id: 'column', name: 'Standard algorithm', short: 'Algorithm', key: '', icon: '▤', render: column, help: '38 + 9  ·  100 - 76  ·  2.5 + 1.9  ·  38 x 7  ·  24 x 13  ·  click the answer to hide it' },
    { id: 'text', name: 'Words & equations', short: 'Words', key: '8', icon: '✎', render: null, help: 'Words or math, ; for a new line, e.g. 38 x 20 = 40 x 20 - 2 x 20 ; = 800 - 40' },
  ];


  window.MSModels = { TOOLS, esc, norm, parseVal, fmt };
})();
