/* Math Strings – app (library, editor, presenter, picker). No build step. */
(function () {
  'use strict';
  const { TOOLS, esc } = window.MSModels;
  const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const app = $('#app');
  const modalRoot = $('#modal-root');

  /* ================= storage ================= */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('ms.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ms.' + k, JSON.stringify(v)); } catch (e) { toast('Could not save in this browser'); } },
  };
  const settings = Object.assign({ think: 20, talk: 30, autoTimer: true, chime: true }, store.get('settings', {}));
  const saveSettings = () => store.set('settings', settings);

  let library = store.get('library', null);   // [{...string}]
  let bundled = [];                            // strings.json from the site
  const deleted = new Set(store.get('deleted', []));
  // Site strings that were given new ids (old -> new). Unedited copies of the old ones are removed; progress marks move over.
  const RENAMED = {
    'g8-prop-d05-speed-on-a-double-number-line': 'g8-prop-d06-speed-on-a-double-number-line',
    'g8-prop-d06-working-backward': 'g8-prop-d07-working-backward',
    'g8-prop-d07-across-the-table': 'g8-prop-d05-across-the-table',
    'g8-prop-d10-scale-maps': 'g8-bank-rat-01-scale-maps',
    'g8-prop-d11-converting-units': 'g8-bank-rat-02-converting-units',
    'g8-prop-d12-two-step-rates': 'g8-prop-d15-two-step-rates',
    'g8-prop-d13-comparing-mixtures': 'g8-bank-rat-03-comparing-mixtures',
    'g8-prop-d14-rates-with-parts-of-an-hour': 'g8-bank-rat-04-rates-with-parts-of-an-hour',
    'g8-prop-d15-tax-and-tip': 'g8-prop-d13-tax-and-tip',
  };
  const saveLibrary = () => { store.set('library', library); store.set('deleted', [...deleted]); };

  const uid = () => Math.random().toString(36).slice(2, 9);
  const slug = s => String(s || 'string').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'string';
  const clean = s => { const o = {}; Object.keys(s).forEach(k => { if (k[0] !== '_') o[k] = s[k]; }); return o; };
  const same = (a, b) => JSON.stringify(clean(a)) === JSON.stringify(clean(b));
  // A short fingerprint of a string, to notice when the website's copy changes after you edited yours
  const sig = s => { const t = JSON.stringify(clean(s)); let h = 5381; for (let i = 0; i < t.length; i++) h = (Math.imul(h, 33) ^ t.charCodeAt(i)) >>> 0; return h.toString(36) + t.length.toString(36); };
  const siteCopy = id => bundled.find(b => b.id === id);

  function normalizeString(s) {
    const o = Object.assign({ title: 'Untitled string', group: '', label: '', tool: 'numberline', strategy: '', problems: [] }, s);
    if (!o.id) o.id = slug((o.label ? o.label + '-' : '') + o.title) + '-' + uid();
    if (!TOOL[o.tool]) o.tool = 'numberline';
    o.problems = (o.problems || []).map(p => typeof p === 'string' ? splitProblem(p) : ({ q: String(p.q || ''), a: p.a == null ? '' : String(p.a), optional: !!p.optional, notes: p.notes || '', ...(Array.isArray(p.responses) && p.responses.length ? { responses: p.responses } : {}) }));
    return o;
  }
  function splitProblem(line) {
    let optional = /\((optional|skip[^)]*)\)/i.test(line);
    line = line.replace(/\((optional|skip[^)]*)\)/ig, '').trim();
    const i = line.lastIndexOf('=');
    return i > 0 ? { q: line.slice(0, i).trim(), a: line.slice(i + 1).trim(), optional, notes: '' } : { q: line, a: '', optional, notes: '' };
  }

  async function loadLibrary() {
    try {
      const r = await fetch('strings.json', { cache: 'no-cache' });
      if (r.ok) bundled = ((await r.json()).strings || []).map(normalizeString);
    } catch (e) { /* offline or opened as a file */ }
    if (!Array.isArray(library)) library = [];
    // Drop unedited copies of strings the site no longer has (renamed or retired). Your own and edited strings stay.
    if (bundled.length) {
      const now = new Set(bundled.map(b => b.id)), seen = new Set(store.get('siteIds', []));
      library = library.filter(s => s._edited || now.has(s.id) || !(seen.has(s.id) || s.id in RENAMED));
      store.set('siteIds', [...now]);
    }
    // Add new strings from the site; refresh ones you haven't edited yourself.
    bundled.forEach(b => {
      const i = library.findIndex(s => s.id === b.id);
      if (i < 0) { if (!deleted.has(b.id)) library.push(b); }
      else if (!library[i]._edited && !same(library[i], b)) library[i] = b;
    });
    library = library.map(normalizeString).map((s, i) => Object.assign(s, { _edited: library[i]._edited }));
    saveLibrary();
  }
  const findString = id => (library || []).find(s => s.id === id);

  /* ================= small helpers ================= */
  function toast(msg) {
    $$('.toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
  }
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const shortDate = ymd => { const [y, m, d] = String(ymd).split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

  // Pretty math: 3/4 -> stacked fraction, 2^3 -> superscript, - -> −, * -> ×
  // a problem that already has an = in it (like 2 : 3 = 8 : ?) gets an arrow before its answer
  const eqSym = q => /=/.test(String(q || '')) ? '→' : '=';
  function exprHTML(q) {
    const s = String(q || '').trim();
    let out = '', i = 0;
    const frac = (a, b) => `<span class="frac"><span>${esc(a)}</span><span>${esc(b)}</span></span>`;
    const op = c => `<span class="op">${({ x: '×', X: '×', '*': '×', '/': '÷', '-': '−' })[c] || esc(c)}</span>`;
    while (i < s.length) {
      const rest = s.slice(i);
      let m = rest.match(/^(\d+)\s+(\d+)\/(\d+)(?![\d.])/) ;
      if (m && (i === 0 || /[\s(]/.test(s[i - 1]))) { out += `<span class="whole">${m[1]}</span>${frac(m[2], m[3])}`; i += m[0].length; continue; }
      m = rest.match(/^([A-Za-z0-9.]+)\/([A-Za-z0-9.]+)/);
      if (m) { out += frac(m[1], m[2]); i += m[0].length; continue; }
      m = rest.match(/^\^\(?(-?[A-Za-z0-9.]+)\)?/);
      if (m) { out += `<sup>${esc(m[1].replace('-', '−'))}</sup>`; i += m[0].length; continue; }
      const c = s[i];
      if (/\s/.test(c)) {
        m = rest.match(/^\s+([xX×*\/÷:])\s+/);
        if (m && !(/[xX]/.test(m[1]) && !/[\d.)\]]/.test(s.slice(0, i).trim().slice(-1)))) { out += op(m[1]); i += m[0].length; continue; }
        out += ' '; i++; continue;
      }
      if ('+=×*÷<>≤≥'.includes(c)) { out += op(c); i++; continue; }
      if ('-−–'.includes(c)) {
        const prev = s.slice(0, i).trim().slice(-1);
        out += prev && /[\w)\]]/.test(prev) ? op('-') : '−'; i++; continue;
      }
      m = rest.match(/^[^\s+=×*÷<>≤≥\-−–^\/]+/) || [c];
      out += esc(m[0]); i += m[0].length;
    }
    return out;
  }

  /* ================= router ================= */
  let ready = false;
  function route() {
    if (!ready) return; // the first route runs once the library has loaded
    { const tp = document.getElementById('tcard-page'); if (tp) tp.remove(); }
    stopTimerUI();
    document.querySelectorAll('.modal-back [data-close]').forEach(b => b.click()); // close any open dialog when the page changes
    const hash = location.hash.replace(/^#\/?/, '');
    const [view, id, id2] = hash.split('/');
    document.onkeydown = null;
    document.documentElement.style.overscrollBehaviorX = '';
    if (view === 'present' && id) return presenter(decodeURIComponent(id), id2 === 'practice');
    if (view === 'quick') return presenter('__quick');
    if (view === 'board') return id ? (id2 === 'edit' ? boardsPage(decodeURIComponent(id)) : presenter('__board:' + decodeURIComponent(id))) : boardsPage();
    if (view === 'start') return startPage();
    if (view === 'pd') return pdPage(id ? decodeURIComponent(id) : store.get('pdGrade', null));
    if (view === 'practice' && id) return practicePage(decodeURIComponent(id));
    if (view === 'card' && id) return teacherCard(decodeURIComponent(id));
    if (view === 'runs') return runsPage(id ? decodeURIComponent(id) : null);
    if (view === 'run' && id) return runPage(decodeURIComponent(id));
    if (view === 'grade') { gradeFilter = id ? decodeURIComponent(id) : 'all'; store.set('grade', gradeFilter); }
    if (view === 'edit' && id) return editor(decodeURIComponent(id));
    libraryView();
  }
  window.addEventListener('hashchange', route);
  const go = path => { location.hash = '#/' + path; };

  /* ================= library ================= */
  let searchText = '';
  let gradeFilter = store.get('grade', 'all');
  const gradeOf = s => ((s.group || '').match(/^\s*Grade\s*(\w+)/i) || [])[1] || null;

  // Topics: from a string's "topic" field, or worked out from its unit name ("Grade 6 · Week 2 · Adding and Subtracting Fractions").
  const TOPICS = [
    { id: 'add', name: 'Addition & Subtraction', icon: '+ −', re: /add|subtract/i },
    { id: 'mult', name: 'Multiplication & Division', icon: '× ÷', re: /multipl|divi|times/i },
    { id: 'dec', name: 'Decimals', icon: '0.5', re: /decimal/i },
    { id: 'frac', name: 'Fractions', icon: '½', re: /fraction/i },
    { id: 'pct', name: 'Percents', icon: '%', re: /percent/i },
    { id: 'rat', name: 'Ratios & Rates', icon: '∶', re: /ratio|rate/i },
    { id: 'int', name: 'Integers', icon: '±', re: /integer/i },
    { id: 'pow', name: 'Powers & Roots', icon: 'x²', re: /power|square|root|scientific|exponent/i },
    { id: 'alg', name: 'Algebra', icon: 'n', re: /algebra|equation|expression|pattern|inequalit/i },
  ];
  const TOPIC_CHECK = ['alg', 'pow', 'int', 'frac', 'dec', 'pct', 'rat', 'mult', 'add'].map(id => TOPICS.find(t => t.id === id)); // most specific first
  function topicOf(s) {
    if (s.topic) { const k = String(s.topic).toLowerCase(); const t = TOPICS.find(t => t.id === k || t.name.toLowerCase() === k) || TOPIC_CHECK.find(t => t.re.test(k)); if (t) return t.id; }
    const unit = (s.group || '').replace(/^\s*Grade\s*\w+\s*·\s*/i, '').replace(/^Week\s*\d+\s*·\s*/i, '');
    const t = unit && TOPIC_CHECK.find(t => t.re.test(unit));
    return t ? t.id : 'other';
  }

  // Ontario Mathematics (2020), Strand B Number: wording of the expectations our strings cite, by grade
  const EXPECT = {
    4: { 'B1.1': 'read, represent, compose, and decompose whole numbers up to and including 10 000, using appropriate tools and strategies, and describe various ways they are used in everyday life',
      'B2.1': 'use the properties of operations, and the relationships between addition, subtraction, multiplication, and division, to solve problems involving whole numbers, including those requiring more than one operation, and check calculations',
      'B2.2': 'recall and demonstrate multiplication facts for 1 × 1 to 10 × 10, and related division facts',
      'B2.3': 'use mental math strategies to multiply whole numbers by 10, 100, and 1000, divide whole numbers by 10, and add and subtract decimal tenths, and explain the strategies used',
      'B2.4': 'represent and solve problems involving the addition and subtraction of whole numbers that add up to no more than 10 000 and of decimal tenths, using appropriate tools and strategies, including algorithms',
      'B2.5': 'represent and solve problems involving the multiplication of two- or three-digit whole numbers by one-digit whole numbers and by 10, 100, and 1000, using appropriate tools, including arrays',
      'B2.6': 'represent and solve problems involving the division of two- or three-digit whole numbers by one-digit whole numbers, expressing any remainder as a fraction when appropriate, using appropriate tools, including arrays',
      'B2.7': 'represent the relationship between the repeated addition of a unit fraction and the multiplication of that unit fraction by a whole number, using tools, drawings, and standard fractional notation',
      'B2.8': 'show simple multiplicative relationships involving whole-number rates, using various tools and drawings' },
    5: { 'B1.5': 'read, represent, compare, and order decimal numbers up to hundredths, in various contexts',
      'B2.1': 'use the properties of operations, and the relationships between operations, to solve problems involving whole numbers and decimal numbers, including those requiring more than one operation, and check calculations',
      'B2.2': 'recall and demonstrate multiplication facts from 0 × 0 to 12 × 12, and related division facts',
      'B2.3': 'use mental math strategies to multiply whole numbers by 0.1 and 0.01 and estimate sums and differences of decimal numbers up to hundredths, and explain the strategies used',
      'B2.4': 'represent and solve problems involving the addition and subtraction of whole numbers that add up to no more than 100 000, and of decimal numbers up to hundredths, using appropriate tools, strategies, and algorithms',
      'B2.5': 'add and subtract fractions with like denominators, in various contexts',
      'B2.6': 'represent and solve problems involving the multiplication of two-digit whole numbers by two-digit whole numbers using the area model and using algorithms, and make connections between the two methods',
      'B2.7': 'represent and solve problems involving the division of three-digit whole numbers by two-digit whole numbers using the area model and using algorithms, and make connections between the two methods, while expressing any remainder appropriately',
      'B2.8': 'multiply and divide one-digit whole numbers by unit fractions, using appropriate tools and drawings',
      'B2.9': 'represent and create equivalent ratios and rates, using a variety of tools and models, in various contexts' },
    6: { 'B1.3': 'compare and order integers, decimal numbers, and fractions, separately and in combination, in various contexts',
      'B1.6': 'describe relationships and show equivalences among fractions and decimal numbers up to thousandths, using appropriate tools and drawings, in various contexts',
      'B2.1': 'use the properties of operations, and the relationships between operations, to solve problems involving whole numbers, decimal numbers, fractions, ratios, rates, and whole number percents, including those requiring multiple steps or multiple operations',
      'B2.2': 'understand the divisibility rules and use them to determine whether numbers are divisible by 2, 3, 4, 5, 6, 8, 9, and 10',
      'B2.3': 'use mental math strategies to calculate percents of whole numbers, including 1%, 5%, 10%, 15%, 25%, and 50%, and explain the strategies used',
      'B2.4': 'represent and solve problems involving the addition and subtraction of whole numbers and decimal numbers, using estimation and algorithms',
      'B2.5': 'add and subtract fractions with like and unlike denominators, using appropriate tools, in various contexts',
      'B2.6': 'represent composite numbers as a product of their prime factors, including through the use of factor trees',
      'B2.7': 'represent and solve problems involving the multiplication of three-digit whole numbers by decimal tenths, using algorithms',
      'B2.8': 'represent and solve problems involving the division of three-digit whole numbers by decimal tenths, using appropriate tools, strategies, and algorithms, and expressing remainders as appropriate',
      'B2.9': 'multiply whole numbers by proper fractions, using appropriate tools and strategies',
      'B2.10': 'divide whole numbers by proper fractions, using appropriate tools and strategies',
      'B2.11': 'represent and solve problems involving the division of decimal numbers up to thousandths by whole numbers up to 10, using appropriate tools and strategies',
      'B2.12': 'solve problems involving ratios, including percents and rates, using appropriate tools and strategies' },
    7: { 'B1.3': 'read, represent, compare, and order rational numbers, including positive and negative fractions and decimal numbers to thousandths, in various contexts',
      'B1.7': 'convert between fractions, decimal numbers, and percents, in various contexts',
      'B2.1': 'use the properties and order of operations, and the relationships between operations, to solve problems involving whole numbers, decimal numbers, fractions, ratios, rates, and percents, including those requiring multiple steps or multiple operations',
      'B2.2': 'understand and recall commonly used percents, fractions, and decimal equivalents',
      'B2.3': 'use mental math strategies to increase and decrease a whole number by 1%, 5%, 10%, 25%, 50%, and 100%, and explain the strategies used',
      'B2.4': 'use objects, diagrams, and equations to represent, describe, and solve situations involving addition and subtraction of integers',
      'B2.5': 'add and subtract fractions, including by creating equivalent fractions, in various contexts',
      'B2.6': 'determine the greatest common factor for a variety of whole numbers up to 144 and the lowest common multiple for two and three whole numbers',
      'B2.7': 'evaluate and express repeated multiplication of whole numbers using exponential notation, in various contexts',
      'B2.8': 'multiply and divide fractions by fractions, using tools in various contexts',
      'B2.9': 'multiply and divide decimal numbers by decimal numbers, in various contexts',
      'B2.10': 'identify proportional and non-proportional situations and apply proportional reasoning to solve problems' },
    8: { 'B1.1': 'represent and compare very large and very small numbers, including through the use of scientific notation, and describe various ways they are used in everyday life',
      'B1.2': 'describe, compare, and order numbers in the real number system (rational and irrational numbers), separately and in combination, in various contexts',
      'B1.3': 'estimate and calculate square roots, in various contexts',
      'B1.4': 'use fractions, decimal numbers, and percents, including percents of more than 100% or less than 1%, interchangeably and flexibly to solve a variety of problems',
      'B2.1': 'use the properties and order of operations, and the relationships between operations, to solve problems involving rational numbers, ratios, rates, and percents, including those requiring multiple steps or multiple operations',
      'B2.2': 'understand and recall commonly used square numbers and their square roots',
      'B2.3': 'use mental math strategies to multiply and divide whole numbers and decimal numbers up to thousandths by powers of ten, and explain the strategies used',
      'B2.4': 'add and subtract integers, using appropriate strategies, in various contexts',
      'B2.5': 'add and subtract fractions, using appropriate strategies, in various contexts',
      'B2.6': 'multiply and divide fractions by fractions, as well as by whole numbers and mixed numbers, in various contexts',
      'B2.7': 'multiply and divide integers, using appropriate strategies, in various contexts',
      'B2.8': 'compare proportional situations and determine unknown values in proportional situations, and apply proportional reasoning to solve problems in various contexts',
      'C1.1': 'identify and compare a variety of repeating, growing, and shrinking patterns, including patterns found in real-life contexts, and compare linear growing and shrinking patterns on the basis of their constant rates and initial values',
      'C1.2': 'create and translate repeating, growing, and shrinking patterns involving rational numbers using various representations, including algebraic expressions and equations for linear growing and shrinking patterns',
      'C1.3': 'determine pattern rules and use them to extend patterns, make and justify predictions, and identify missing elements in growing and shrinking patterns involving rational numbers, and use algebraic representations of the pattern rules to solve for unknown values in linear growing and shrinking patterns',
      'C1.4': 'create and describe patterns to illustrate relationships among rational numbers',
      'C2.1': 'add and subtract monomials with a degree of 1, and add binomials with a degree of 1 that involve integers, using tools',
      'C2.2': 'evaluate algebraic expressions that involve rational numbers',
      'C2.3': 'solve equations that involve multiple terms, integers, and decimal numbers in various contexts, and verify solutions',
      'C2.4': 'solve inequalities that involve integers, and verify and graph the solutions' },
  };
  const currOf = s => (Array.isArray(s.curriculum) ? s.curriculum : String(s.curriculum || '').split(/[,;\s]+/)).map(c => c.trim().toUpperCase()).filter(c => /^[A-E]\d+\.\d+$/.test(c));
  const codeSort = (a, b) => a.localeCompare(b, undefined, { numeric: true });
  const expectText = (grade, code) => (EXPECT[grade] || {})[code] || '';
  const currBadges = (grade, codes) => codes.length ? `<span class="curr">${codes.map(c => `<span class="cbadge" title="${esc(grade ? `Grade ${grade} ${c}: ${expectText(grade, c) || 'Ontario Mathematics, Number strand'}` : c)}">${esc(c)}</span>`).join('')}</span>` : '';
  const unitCodes = list => [...new Set(list.flatMap(currOf))].sort(codeSort);

  // Your own progress, kept in this browser: { id: { done: ['2026-11-17', ...] } }
  const track = store.get('track', {});
  Object.entries(RENAMED).forEach(([a, b]) => { if (track[a]) { if (!track[b]) track[b] = track[a]; delete track[a]; store.set('track', track); } });
  const T_ = id => track[id] || {};
  const isDone = id => !!(T_(id).done || []).length;
  function setTrack(id, patch) {
    const t = Object.assign({}, track[id], patch);
    Object.keys(t).forEach(k => { if (!t[k] || (Array.isArray(t[k]) && !t[k].length)) delete t[k]; });
    if (Object.keys(t).length) track[id] = t; else delete track[id];
    store.set('track', track);
  }
  function markDone(id) {
    const d = (T_(id).done || []).slice();
    if (d[d.length - 1] !== today()) d.push(today());
    setTrack(id, { done: d });
  }
  function mergeTrack(other) {
    Object.entries(other || {}).forEach(([id, t]) => {
      if (!t || typeof t !== 'object') return;
      const mine = T_(id);
      const done = [...new Set([...(mine.done || []), ...(Array.isArray(t.done) ? t.done : [])])].sort();
      setTrack(id, { done });
    });
  }
  // Saved runs: a dated copy of a string as it was run in class (answers and models), kept in this browser.
  const getRuns = () => store.get('runs', []);
  const setRuns = runs => store.set('runs', runs);
  const runsOf = id => getRuns().filter(r => r.id === id);
  function mergeRuns(other) {
    if (!Array.isArray(other)) return 0;
    const runs = getRuns(); let n = 0;
    other.forEach(r => { if (r && r.rid && Array.isArray(r.problems) && !runs.some(x => x.rid === r.rid)) { runs.push(r); n++; } });
    runs.sort((a, b) => (b.at || 0) - (a.at || 0)); setRuns(runs); return n;
  }
  let topicFilter = store.get('topic', 'all');
  let listFilter = 'all', filtersOpen = false;
  function libraryView() {
    document.title = 'Math Strings';
    const q = searchText.toLowerCase();
    const grades = [...new Set(library.map(gradeOf).filter(Boolean))].sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0) || String(a).localeCompare(b));
    if (gradeFilter !== 'all' && !grades.includes(gradeFilter)) gradeFilter = 'all';
    const askGrade = store.get('grade', null) === null && grades.length > 1;
    const inGrade = library.filter(s => gradeFilter === 'all' || gradeOf(s) === gradeFilter);
    const topicsHere = [...TOPICS, { id: 'other', name: 'Other', icon: '…' }].filter(t => inGrade.some(s => topicOf(s) === t.id));
    if (topicFilter !== 'all' && !topicsHere.some(t => t.id === topicFilter)) topicFilter = 'all';
    const inTopic = inGrade.filter(s => topicFilter === 'all' || topicOf(s) === topicFilter);
    const LISTS = [
      { id: 'new', name: 'Not done yet', test: s => !isDone(s.id), empty: 'You have done every string here. 🎉' },
      { id: 'done', name: '✓ Done', test: s => isDone(s.id), empty: 'No strings done here yet. A string is marked done when you press Finish at the end (or tap ✓ on its card).' },
    ];
    const tf = topicsHere.find(t => t.id === topicFilter);
    const lf = LISTS.find(l => l.id === listFilter);
    const filtering = (topicFilter !== 'all' && tf) || lf;

    const list = inTopic.filter(s => (!lf || lf.test(s)) && (!q || [s.title, s.label, s.group, s.strategy, ...currOf(s), ...s.problems.map(p => p.q)].join(' ').toLowerCase().includes(q)));
    const groups = [];
    list.forEach(s => { const g = s.group || 'Other strings'; let G = groups.find(x => x.name === g); if (!G) groups.push(G = { name: g, items: [] }); G.items.push(s); });
    // within a grade, the weekly units come before the string bank
    const isBank = name => /·\s*Bank\s*·/i.test(name);
    const weekOf = name => { const w = name.match(/Week\s*(\d+)/i), u = name.match(/Unit\s*(\d+)/i); return w ? +w[1] : u ? 20 + +u[1] : 50; }; // weeks, then numbered units (15-20 days), then the rest
    groups.sort((a, b) => { const ga = parseInt(gradeOf(a.items[0])) || 99, gb = parseInt(gradeOf(b.items[0])) || 99; return ga - gb || (isBank(a.name) - isBank(b.name)) || weekOf(a.name) - weekOf(b.name); });
    const unitProgress = name => { const all = library.filter(s => (s.group || 'Other strings') === name); const n = all.filter(s => isDone(s.id)).length; return { n, of: all.length }; };
    app.innerHTML = `
      <div class="lib">
        <div class="lib-head">
          <div class="brand">
            <div class="brand-mark"><svg width="26" height="26" viewBox="0 0 64 64"><path d="M6 46h52" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M12 44 Q24 10 36 44" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M36 44 Q44 28 52 44" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg></div>
            <div><h1>Math Strings</h1><small>${library.length} string${library.length === 1 ? '' : 's'} in your library</small></div>
          </div>
          <div class="lib-tools">
            <a class="btn" href="#/pd" title="Our number strings PD: the timeline, the sessions and a suggested six weeks of strings">🎓 PD</a>
            <a class="btn" href="#/start" title="A quick guide for first-time users">📘 Getting started</a>
            <a class="btn" href="#/quick" title="A blank board: type or paste any problem, then model it">⚡ Quick board</a>
            <details class="menu-wrap"><summary class="btn" title="More: new strings, boards, saved runs, settings">☰ More</summary>
              <div class="menu">
                <button data-act="new">＋ New string</button>
                <a href="#/board">📋 Boards <small>saved lists of problems on a clean screen</small></a>
                <a href="#/runs">🗂 My runs${getRuns().length ? ` <span class="cnt">${getRuns().length}</span>` : ''} <small>strings you've finished in class</small></a>
                <button data-act="classes">🎲 Class lists <small>names for the random picker</small></button>
                <button data-act="settings">⚙︎ Settings</button>
                <button data-act="help">⌨ Keyboard shortcuts</button>
                <hr>
                <button data-act="export">⤒ Export <small>back up, or move to another computer</small></button>
                <button data-act="import">⤓ Import</button>
                <hr>
                <div class="menu-head">More teacher tools</div>
                <!-- Keep in step with https://gdrutz-blip.github.io/random/tools.json -->
                <a class="menu-tool" href="https://gdrutz-blip.github.io/random/" target="_blank" rel="noopener">Randomizer</a>
                <a class="menu-tool" href="https://gdrutz-blip.github.io/seatingplanner/" target="_blank" rel="noopener">Seating Planner</a>
              </div>
            </details>
          </div>
        </div>
        ${store.get('welcomed', false) ? '' : `<div class="welcome"><div><b>Welcome!</b> New to Math Strings? Take 2 minutes with the quick guide before your first string.</div><div class="welcome-btns"><a class="btn primary" href="#/start" data-act="seen">Show me how</a><button class="btn ghost" data-act="dismiss">Hide</button></div></div>`}
        ${askGrade ? `<div class="askgrade"><div><b>Which grade do you teach?</b> We'll show your grade's strings first. You can switch grades any time.</div>
          <div class="grade-chips">${grades.map(g => `<button class="gchip big" data-act="grade" data-g="${esc(g)}">Grade ${esc(g)}</button>`).join('')}<button class="gchip" data-act="grade" data-g="all">Show all grades</button></div></div>` : ''}
        <div class="filters">
          ${grades.length > 1 ? `<div class="frow"><span class="flabel">Grade</span><div class="grade-chips" role="group" aria-label="Show grade">${['all', ...grades].map(g => `<button class="gchip${g === gradeFilter ? ' on' : ''}" data-act="grade" data-g="${esc(g)}">${g === 'all' ? 'All grades' : 'Grade ' + esc(g)}</button>`).join('')}</div></div>` : ''}
          <div class="frow">
            <input id="search" placeholder="Search, e.g. “percent” or “38 +”" value="${esc(searchText)}">
            <button class="btn${filtersOpen || filtering ? ' on' : ''}" data-act="filters" aria-expanded="${filtersOpen}">⚙ Filter${filtering ? ': ' + esc([tf && topicFilter !== 'all' ? tf.name : '', lf ? lf.name : ''].filter(Boolean).join(' · ')) : ''}</button>
            ${filtering ? '<button class="btn ghost small" data-act="clearf">✕ Clear</button>' : ''}
          </div>
          ${filtersOpen ? `<div class="fpanel">
            ${topicsHere.length > 1 ? `<div class="frow"><span class="flabel">Topic</span><div class="grade-chips" role="group" aria-label="Show topic">${[{ id: 'all', name: 'All topics' }, ...topicsHere].map(t => `<button class="gchip tchip${t.id === topicFilter ? ' on' : ''}" data-act="topic" data-t="${t.id}">${t.icon ? `<span class="ticon">${esc(t.icon)}</span>` : ''}${esc(t.name)}</button>`).join('')}</div></div>` : ''}
            <div class="frow"><span class="flabel">Show</span><div class="grade-chips" role="group" aria-label="Show list">${[{ id: 'all', name: 'Everything' }, ...LISTS].map(l => { const n = l.test ? inTopic.filter(l.test).length : inTopic.length; return `<button class="gchip lchip${l.id === listFilter ? ' on' : ''}" data-act="list" data-l="${l.id}">${esc(l.name)} <span class="cnt">${n}</span></button>`; }).join('')}</div></div>
          </div>` : ''}
        </div>
        <div id="groups">
          ${groups.length ? groups.map(G => { const pr = unitProgress(G.name); return `
            <div class="group-title"><span>${esc(G.name)}</span>${currBadges(gradeOf(G.items[0]), unitCodes(library.filter(x => (x.group || 'Other strings') === G.name)))}${pr.of > 1 ? `<span class="unit-prog${pr.n === pr.of ? ' all' : ''}" title="Strings you've done in this unit"><span class="bar"><span style="width:${Math.round(100 * pr.n / pr.of)}%"></span></span>${pr.n} of ${pr.of} done</span>` : ''}</div>
            <div class="cards">${G.items.map(cardHTML).join('')}</div>`; }).join('')
            : `<div class="empty">${!library.length ? 'Your library is empty. Use <b>☰ More</b> to add a new string or import some.' : q ? 'No strings match your search.' : lf ? esc(lf.empty) : 'No strings here yet.'}</div>`}
        </div>
        <a class="guide-card" href="#/start"><span class="gc-ico">📘</span><span><b>New to number strings or this site?</b><br>Read the 5-minute getting started guide: what to do before class, the routine in class, and how to type models.</span><span class="gc-go">Open guide →</span></a>
        ${bundled.some(b => deleted.has(b.id)) ? `<div class="lib-foot"><button class="btn small ghost" data-act="unhide">↺ Show hidden strings (${bundled.filter(b => deleted.has(b.id)).length})</button></div>` : ''}
        <div class="lib-foot">Your ✓ progress and any edits are saved in this browser. To move them to another computer, use <b>☰ More → Export</b>.</div>
      </div>`;
    const search = $('#search');
    search.oninput = () => { searchText = search.value; const pos = search.selectionStart; libraryView(); const s2 = $('#search'); s2.focus(); s2.setSelectionRange(pos, pos); };
    app.onclick = e => {
      $$('details.menu-wrap[open]', app).forEach(d => { if (!d.contains(e.target)) d.open = false; });
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = b.dataset.id, act = b.dataset.act;
      if (b.closest('details.menu-wrap')) b.closest('details.menu-wrap').open = false;
      if (act === 'filters') { filtersOpen = !filtersOpen; libraryView(); }
      if (act === 'clearf') { topicFilter = 'all'; store.set('topic', 'all'); listFilter = 'all'; libraryView(); }
      if (act === 'new') { const s = normalizeString({ title: 'New string', problems: [{ q: '', a: '' }] }); s._edited = true; library.unshift(s); saveLibrary(); go('edit/' + encodeURIComponent(s.id)); }
      if (act === 'quick') go('quick');
      if (act === 'import') importModal();
      if (act === 'export') exportAll();
      if (act === 'classes') pickerOverlay(true);
      if (act === 'settings') settingsModal();
      if (act === 'help') helpModal();
      if (act === 'seen') store.set('welcomed', true);
      if (act === 'dismiss') { store.set('welcomed', true); libraryView(); }
      if (act === 'grade') { gradeFilter = b.dataset.g; store.set('grade', gradeFilter); history.replaceState(null, '', gradeFilter === 'all' ? '#/' : '#/grade/' + encodeURIComponent(gradeFilter)); libraryView(); }
      if (act === 'topic') { topicFilter = b.dataset.t; store.set('topic', topicFilter); libraryView(); }
      if (act === 'list') { listFilter = b.dataset.l; libraryView(); }
      if (act === 'done') {
        if (isDone(id)) { if (confirm('Clear the ✓ done record for this string?')) { setTrack(id, { done: [] }); libraryView(); } }
        else { markDone(id); libraryView(); toast('✓ Marked as done'); }
      }
      if (act === 'practice') go('practice/' + encodeURIComponent(id));
      if (act === 'present') go('present/' + encodeURIComponent(id));
      if (act === 'edit') go('edit/' + encodeURIComponent(id));
      if (act === 'dup') { const s = findString(id); const c = normalizeString(JSON.parse(JSON.stringify(clean(s)))); c.id = slug(s.title) + '-' + uid(); c.title = s.title + ' (copy)'; c._edited = true; library.splice(library.indexOf(s) + 1, 0, c); saveLibrary(); libraryView(); toast('Duplicated'); }
      if (act === 'del') {
        const s = findString(id), fromSite = !!siteCopy(id);
        if (confirm(fromSite ? `Hide “${s.title}” from your library?\n\nIt comes from the website, so you can bring it back any time with “Show hidden strings” at the bottom of the library.` : `Delete “${s.title}”? This can't be undone.`)) { library = library.filter(x => x !== s); deleted.add(id); saveLibrary(); libraryView(); toast(fromSite ? 'Hidden' : 'Deleted'); }
      }
      if (act === 'unhide') { const back = bundled.filter(b => deleted.has(b.id)); back.forEach(b => { deleted.delete(b.id); library.push(normalizeString(JSON.parse(JSON.stringify(b)))); }); saveLibrary(); libraryView(); toast(`Brought back ${back.length} string${back.length === 1 ? '' : 's'}`); }
      if (act === 'keepmine') { const s = findString(id), b2 = siteCopy(id); if (s && b2) { s._siteSig = sig(b2); saveLibrary(); libraryView(); toast('Keeping your version'); } }
      if (act === 'revert') { const b2 = bundled.find(x => x.id === id); if (b2 && confirm('Replace your edits with the version on the website?')) { library[library.findIndex(x => x.id === id)] = normalizeString(JSON.parse(JSON.stringify(b2))); saveLibrary(); libraryView(); toast('Restored the website version'); } }
    };
  }
  function cardHTML(s) {
    const site = bundled.find(b => b.id === s.id);
    const edited = s._edited && site && !same(s, site);
    const newer = edited && s._siteSig && s._siteSig !== sig(site);
    const t = T_(s.id), done = t.done || [];
    return `<div class="card${done.length ? ' is-done' : ''}">
      <div class="card-top">${s.label ? `<span class="card-label">${esc(s.label)}</span>` : ''}<h3>${esc(s.title)}</h3>
        <span class="marks"><button class="mark donemark${done.length ? ' on' : ''}" data-act="done" data-id="${esc(s.id)}" title="${done.length ? 'Done (click to clear)' : 'Mark as done'}" aria-pressed="${!!done.length}">✓</button></span></div>
      ${newer ? `<div class="site-newer"><span>🔄 <b>Updated on the website</b> since you edited your copy.</span><span class="sn-btns"><button class="btn small primary" data-act="revert" data-id="${esc(s.id)}">Use website version</button><button class="btn small ghost" data-act="keepmine" data-id="${esc(s.id)}">Keep mine</button></span></div>` : ''}
      ${done.length ? `<div class="done-line">✓ Done ${esc(shortDate(done[done.length - 1]))}${done.length > 1 ? ` · ${done.length} times` : ''}${(n => n ? ` · <a href="#/runs/${encodeURIComponent(s.id)}">${n} saved run${n === 1 ? '' : 's'}</a>` : '')(runsOf(s.id).length)}</div>` : ''}
      ${s.strategy ? `<p class="strategy">${esc(s.strategy)}</p>` : ''}
      <div class="chips">${s.problems.map(p => `<span class="chip${p.optional ? ' opt' : ''}" title="${p.optional ? 'Optional' : ''}">${esc(p.q.replace(/-/g, '−'))}</span>`).join('')}</div>
      <div class="card-actions">
        <button class="btn primary" data-act="present" data-id="${esc(s.id)}">▶ Present</button>
        <a class="btn" href="#/card/${encodeURIComponent(s.id)}" title="One printable page to read before class">🗒 Teacher card</a>
        ${s.problems.some(p => p.responses) ? `<button class="btn" data-act="practice" data-id="${esc(s.id)}" title="Likely student answers, and a board to practise on">📝 Practice</button>` : ''}
        <span class="spacer"></span>
        <details class="menu-wrap card-more"><summary class="icon-btn" title="More for this string">⋯</summary>
          <div class="menu">
            <button data-act="edit" data-id="${esc(s.id)}">✏️ Edit</button>
            <button data-act="dup" data-id="${esc(s.id)}">⧉ Make a copy</button>
            ${edited && !newer ? `<button data-act="revert" data-id="${esc(s.id)}">↺ Go back to the website version</button>` : ''}
            <button data-act="del" data-id="${esc(s.id)}">🗑 ${site ? 'Hide from my library' : 'Delete'}</button>
          </div>
        </details>
      </div>
    </div>`;
  }

  /* ================= editor ================= */
  function editor(id) {
    const s = findString(id);
    if (!s) return go('');
    document.title = 'Edit · ' + s.title;
    let saveT;
    const save = () => { if (!s._edited) { const b = siteCopy(s.id); if (b) s._siteSig = sig(b); } s._edited = true; clearTimeout(saveT); saveT = setTimeout(() => { saveLibrary(); const el = $('#saved'); if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1200); } }, 300); };
    const groups = [...new Set(library.map(x => x.group).filter(Boolean))];
    const render = () => {
      app.innerHTML = `
      <div class="editor">
        <div class="ed-head">
          <button class="btn ghost" data-act="back">← Library</button>
          <h2>Edit string</h2>
          <span class="saved" id="saved">✓ Saved</span>
          <a class="btn" href="#/card/${encodeURIComponent(s.id)}" title="One printable page to keep beside you">🗒 Teacher card</a>
          <button class="btn primary" data-act="present">▶ Present</button>
        </div>
        <div class="panel">
          <div class="grid3">
            <label class="field">Title<input data-f="title" value="${esc(s.title)}"></label>
            <label class="field">Label<input data-f="label" value="${esc(s.label)}" placeholder="e.g. Day 3"></label>
            <label class="field">Starting tool<select data-f="tool">${TOOLS.map(t => `<option value="${t.id}"${t.id === s.tool ? ' selected' : ''}>${t.name}</option>`).join('')}</select></label>
          </div>
          <div class="grid2" style="margin-top:12px">
            <label class="field">Group<input data-f="group" value="${esc(s.group)}" list="groups" placeholder="e.g. Week 2 · Decimals"><datalist id="groups">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist></label>
            <label class="field">Strategy (for you; not shown to students)<input data-f="strategy" value="${esc(s.strategy)}"></label>
          </div>
          <div class="grid2" style="margin-top:12px">
            <label class="field">Ontario curriculum codes (e.g. B2.3, B2.4)<input data-f="curriculum" value="${esc(currOf(s).join(', '))}" placeholder="B2.3, B2.4"></label>
            <div class="field curr-help">${currOf(s).map(c => `<span><b>${esc(c)}</b> ${esc(expectText(gradeOf(s), c))}</span>`).join('') || '<span class="hint">Number strand codes from the Ontario Mathematics curriculum (2020).</span>'}</div>
          </div>
        </div>
        <div class="panel">
          <h3>Problems</h3>
          <div id="probs">${s.problems.map((p, i) => `
            <div class="prob-row" data-i="${i}">
              <span class="num">${i + 1}</span>
              <input class="q" data-p="q" value="${esc(p.q)}" placeholder="e.g. 38 + 9">
              <input data-p="a" value="${esc(p.a)}" placeholder="answer" title="Only for you. Never shown to students.">
              <label class="opt-toggle"><input type="checkbox" data-p="optional"${p.optional ? ' checked' : ''}> optional</label>
              <span class="row-btns">
                <button class="icon-btn" data-act="up" title="Move up"${i === 0 ? ' disabled' : ''}>↑</button>
                <button class="icon-btn" data-act="down" title="Move down"${i === s.problems.length - 1 ? ' disabled' : ''}>↓</button>
                <button class="icon-btn" data-act="notes" title="Notes">🗒</button>
                <button class="icon-btn" data-act="rm" title="Remove">✕</button>
              </span>
              <div class="preview">Students see: <span class="expr" style="font-size:20px">${exprHTML(p.q) || '—'}</span></div>
              <div class="notes${p.notes ? '' : ' hidden'}"><textarea data-p="notes" placeholder="Look for / Ask / Word choice (for you only)">${esc(p.notes)}</textarea></div>
            </div>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <button class="btn" data-act="add">＋ Add problem</button>
            <button class="btn ghost" data-act="paste">Paste a list…</button>
          </div>
          <p class="hint">Type problems the way you'd write them: <b>38 + 9</b>, <b>3/4 + 1/3</b>, <b>2^3 × 2^4</b>, <b>1 1/2 × 4</b>. The answer column is only for you.</p>
        </div>
        <div class="panel">
          <details class="more"${s.keywords || s.connection || (s.watchFor || []).length ? '' : ''}>
            <summary>More planning notes (for you only)</summary>
            <div style="display:grid;gap:12px">
              <label class="field">Key words<input data-f="keywords" value="${esc(s.keywords || '')}"></label>
              <label class="field">Connection<textarea data-f="connection" rows="2">${esc(s.connection || '')}</textarea></label>
              <label class="field">Watch for (one per line)<textarea data-f="watchFor" rows="4">${esc((s.watchFor || []).join('\n'))}</textarea></label>
              <label class="field">Wrap-up<textarea data-f="wrapUp" rows="2">${esc(s.wrapUp || '')}</textarea></label>
            </div>
          </details>
        </div>
      </div>`;
    };
    render();
    app.oninput = app.onchange = e => {
      const t = e.target;
      if (t.dataset.f) {
        s[t.dataset.f] = t.dataset.f === 'watchFor' ? t.value.split('\n').map(x => x.trim()).filter(Boolean) : t.dataset.f === 'curriculum' ? currOf({ curriculum: t.value }) : t.value;
        if (t.dataset.f === 'title') document.title = 'Edit · ' + s.title;
        save();
      } else if (t.dataset.p) {
        const i = +t.closest('.prob-row').dataset.i;
        s.problems[i][t.dataset.p] = t.type === 'checkbox' ? t.checked : t.value;
        if (t.dataset.p === 'q') $('.preview .expr', t.closest('.prob-row')).innerHTML = exprHTML(t.value) || '—';
        save();
      }
    };
    app.onkeydown = e => {
      if (e.key === 'Enter' && e.target.dataset.p && e.target.tagName === 'INPUT') {
        const i = +e.target.closest('.prob-row').dataset.i;
        if (i === s.problems.length - 1 && e.target.value.trim()) { s.problems.push({ q: '', a: '', optional: false, notes: '' }); save(); render(); }
        const next = $$('.prob-row input.q')[i + 1]; if (next) next.focus();
      }
    };
    app.onclick = e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const row = b.closest('.prob-row'), i = row ? +row.dataset.i : -1, P = s.problems;
      switch (b.dataset.act) {
        case 'back': go(''); return;
        case 'present': saveLibrary(); go('present/' + encodeURIComponent(s.id)); return;
        case 'add': P.push({ q: '', a: '', optional: false, notes: '' }); save(); render(); $$('.prob-row input.q').pop().focus(); return;
        case 'rm': P.splice(i, 1); save(); render(); return;
        case 'up': [P[i - 1], P[i]] = [P[i], P[i - 1]]; save(); render(); return;
        case 'down': [P[i + 1], P[i]] = [P[i], P[i + 1]]; save(); render(); return;
        case 'notes': $('.notes', row).classList.toggle('hidden'); $('.notes textarea', row).focus(); return;
        case 'paste': {
          modal('Paste a list of problems', `<p class="hint" style="margin:0">One per line. Answers after “=” are optional. Add “(optional)” to mark a skippable problem.</p><textarea id="pl" rows="10" placeholder="38 + 10 = 48\n38 + 9 = 47\n38 + 19 = 57 (optional)"></textarea>`,
            [{ label: 'Add problems', primary: true, run: () => { const lines = $('#pl').value.split('\n').map(x => x.replace(/^\s*\d+[.)](?!\d)\s*/, '').trim()).filter(Boolean); if (P.length === 1 && !P[0].q) P.length = 0; lines.forEach(l => P.push(splitProblem(l))); save(); render(); return true; } }]);
          setTimeout(() => $('#pl').focus(), 30);
        }
      }
    };
  }

  /* ================= modals ================= */
  function modal(title, bodyHTML, buttons = [], opts = {}) {
    const el = h(`<div class="modal-back"><div class="modal" style="${opts.wide ? 'width:min(820px,100%)' : ''}">
      <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close>✕</button></div>
      <div class="modal-body">${bodyHTML}</div>
      ${buttons.length ? `<div class="modal-foot">${buttons.map((b, i) => `<button class="btn${b.primary ? ' primary' : ''}" data-b="${i}">${b.label}</button>`).join('')}</div>` : ''}
    </div></div>`);
    const close = () => { el.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    el.addEventListener('mousedown', e => { if (e.target === el) close(); });
    el.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) close();
      const b = e.target.closest('[data-b]'); if (b && buttons[+b.dataset.b].run() !== false) close();
    });
    modalRoot.appendChild(el);
    return { el, close };
  }

  function settingsModal() {
    const m = modal('Settings', `
      <div class="grid2">
        <label class="field">Think time (seconds)<input type="number" id="st-think" min="0" max="600" value="${settings.think}"></label>
        <label class="field">Partner talk (seconds, 0 = none)<input type="number" id="st-talk" min="0" max="600" value="${settings.talk}"></label>
      </div>
      <label><input type="checkbox" id="st-auto"${settings.autoTimer ? ' checked' : ''}> Start the think timer when a new problem appears</label>
      <label><input type="checkbox" id="st-chime"${settings.chime ? ' checked' : ''}> Soft chime when time is up</label>
      <div><button class="btn small" type="button" id="st-tools">Choose which modeling tools show…</button></div>`,
      [{ label: 'Save', primary: true, run: () => {
        settings.think = Math.max(0, +$('#st-think').value || 0); settings.talk = Math.max(0, +$('#st-talk').value || 0);
        settings.autoTimer = $('#st-auto').checked; settings.chime = $('#st-chime').checked; saveSettings(); timer.reset(); toast('Settings saved');
      } }]);
    $('#st-tools').onclick = () => toolsModal();
    return m;
  }

  const CLAUDE_FORMAT = `Please give me math strings as a JSON file I can import into my Math Strings app, in exactly this shape:

{
  "version": 1,
  "strings": [
    {
      "id": "w2-d1-decimals-near-a-whole",
      "title": "Decimals Near a Whole",
      "label": "Day 1",
      "group": "Week 2 · Decimals",
      "tool": "numberline",
      "strategy": "Add a friendly number, then take back the extra.",
      "keywords": "friendly number, take back",
      "connection": "Builds on Week 1 Day 1.",
      "watchFor": ["Lining up decimals by place: ask ..."],
      "wrapUp": "",
      "problems": [
        { "q": "2.5 + 1.5", "a": "4", "notes": "Look for: ... Ask: ..." },
        { "q": "2.5 + 1.9", "a": "4.4", "optional": true, "notes": "" }
      ]
    }
  ]
}

Rules:
- "id" must be unique and stay the same if you revise a string later (that's how the app knows to update it).
- "tool" is the model I'll start with: numberline, slide, givetake, halve, ratio, area, array, doubleline, clock, bar, or text.
- Write problems plainly: 38 + 9, 100 - 76, 3/4 + 1/3 (fractions), 1 1/2 (mixed numbers), 2^3 (exponents), 6 x 8 or 6 × 8.
- "a" (answer) and "notes" are for me only; students never see them.
- Mark skippable problems with "optional": true.`;

  // A printable practice card: likely student responses for each problem, and exactly what to type
  // Split a problem's notes into its parts: "Context: … Look for: … Ask: "…" Word choice: … Model: …"
  function noteParts(n) {
    const t = String(n || '').split(/\s*Model:/)[0];
    const grab = re => { const m = t.match(re); return m ? m[1].trim() : ''; };
    const stop = '(?=\\s*(?:Look for:|First ask:|Ask:|Word choice:|Context:|$))';
    return {
      look: grab(new RegExp('Look for:\\s*([\\s\\S]*?)' + stop, 'i')),
      ask: grab(new RegExp('(?:First )?ask:\\s*([\\s\\S]*?)' + stop, 'i')),
      ctx: grab(new RegExp('Context:\\s*([\\s\\S]*?)' + stop, 'i')),
      word: grab(new RegExp('Word choice:\\s*([\\s\\S]*?)' + stop, 'i')),
    };
  }
  // One printable page to keep beside you while running the string
  function teacherCard(id) {
    const s = findString(id);
    if (!s) return go('');
    document.title = 'Teacher card · ' + s.title;
    // the card prints upright on one page (the presenter prints sideways); this rule is removed when you leave
    document.head.insertAdjacentHTML('beforeend', '<style id="tcard-page">@page { size: portrait; margin: 12mm; }</style>');
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    const g = gradeOf(s), parts = s.problems.map(p => noteParts(p.notes));
    // three questions to ask: the string's own questions, skipping the warm-ups ("Hold on to this")
    const qs = [];
    parts.forEach((x, i) => { const q = x.ask.replace(/^"|"$/g, ''); if (i && q && !/hold on to this/i.test(q) && !qs.some(y => y.toLowerCase() === q.toLowerCase()) && qs.length < 3) qs.push(q); });
    const words = parts.map(x => x.word).filter(Boolean)[0];
    app.innerHTML = `
    <div class="guide tcard">
      <div class="ed-head no-print">
        <a class="btn ghost" href="#/">← Library</a>
        <span style="flex:1"></span>
        <button class="btn" onclick="window.print()">🖨 Print</button>
        ${s.problems.some(p => p.responses) ? `<a class="btn" href="#/practice/${encodeURIComponent(s.id)}">📝 Practice card</a>` : ''}
        <a class="btn primary" href="#/present/${encodeURIComponent(s.id)}">▶ Present</a>
      </div>
      <div class="tc-top">
        <div><div class="tc-eyebrow">${esc(s.group || '')} ${currBadges(g, currOf(s))}</div>
          <h1>${s.label ? esc(s.label) + ' · ' : ''}${esc(s.title)}</h1></div>
      </div>
      <div class="tc-goal"><b>Goal:</b> ${esc(s.strategy || '')}${s.keywords ? `<div class="tc-kw"><b>Key words:</b> ${esc(s.keywords)}</div>` : ''}${s.connection ? `<div class="tc-kw"><b>Builds on:</b> ${esc(s.connection)}</div>` : ''}</div>
      <table class="tc-table">
        <tr><th>#</th><th>Problem</th><th>Look for</th><th>Ask</th></tr>
        ${s.problems.map((p, i) => `<tr class="${p.optional ? 'opt' : ''}"><td class="tc-n">${i + 1}</td>
          <td class="tc-q"><span class="expr">${exprHTML(p.q)}</span> <span class="tc-a">${eqSym(p.q)} ${esc(p.a)}</span>${p.optional ? '<span class="tc-opt">optional</span>' : ''}</td>
          <td>${parts[i].ctx ? `<i>${esc(parts[i].ctx)}</i> ` : ''}${esc(parts[i].look)}</td><td>${esc(parts[i].ask)}</td></tr>`).join('')}
      </table>
      <div class="tc-cols">
        <div class="tc-box"><h3>3 questions to ask</h3><ol>${(qs.length ? qs : ['Can the last problem help?', "What's the same? What changed?", 'Who solved it a different way?']).map(q => `<li>${esc(q)}</li>`).join('')}</ol>
          <p class="tc-always">Any time: <i>"Can the last problem help?"</i> · <i>"Who did it differently?"</i></p></div>
        <div class="tc-box"><h3>Watch for</h3><ul>${(s.watchFor || []).slice(0, 3).map(w => `<li>${esc(w)}</li>`).join('') || '<li>Listen for how students start, and which earlier problem they use.</li>'}</ul></div>
      </div>
      ${s.wrapUp || words ? `<div class="tc-box tc-wrap">${s.wrapUp ? `<b>Wrap-up:</b> ${esc(s.wrapUp)}` : ''}${words ? `<div class="tc-kw"><b>Word choice:</b> ${esc(words)}</div>` : ''}</div>` : ''}
      <p class="tc-foot">Math Strings · ${esc(s.label ? s.label + ' · ' : '')}${esc(s.title)}</p>
    </div>`;
    window.scrollTo(0, 0);
  }
  function practicePage(id) {
    const s = findString(id);
    if (!s) return go('');
    document.title = 'Practice · ' + s.title;
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    const toolCell = t => { const x = TOOL[t]; return x ? `<span class="pt-tool">${x.icon} ${esc(x.short || x.name)}</span>` : esc(t || ''); };
    const split = store.get('practiceSplit', false) && innerWidth >= 1000;
    app.innerHTML = `
    <div class="${split ? 'pt-split' : ''}"><div class="guide practice">
      <div class="ed-head no-print">
        <a class="btn ghost" href="#/">← Library</a>
        <span style="flex:1"></span>
        <button class="btn" onclick="window.print()">🖨 Print</button>
        <a class="btn" href="#/card/${encodeURIComponent(s.id)}" title="One printable page to keep beside you">🗒 Teacher card</a>
        <button class="btn${split ? ' on' : ''}" id="pt-board" title="Practise beside a board: nothing you do there is saved">🧪 ${split ? 'Hide practice board' : 'Practise here'}</button>
        <a class="btn primary" href="#/present/${encodeURIComponent(s.id)}">▶ Present this string</a>
      </div>
      <h1>${s.label ? esc(s.label) + ' · ' : ''}${esc(s.title)} <span class="pt-sub">Practice card</span></h1>
      ${s.strategy ? `<p class="lead">${esc(s.strategy)}</p>` : ''}
      ${currOf(s).length ? `<p class="pt-curr">Ontario curriculum, Grade ${esc(gradeOf(s) || '')}: ${currOf(s).map(c => `<b>${esc(c)}</b>${expectText(gradeOf(s), c) ? ` ${esc(expectText(gradeOf(s), c))}` : ''}`).join(' · ')}</p>` : ''}
      <div class="pt-how"><b>How to practise in pairs:</b> one person presents the string; the other plays the class and reads a "student says" line. The presenter records the answer (<kbd>A</kbd>), picks the tool, types what's in the last column, and presses <kbd>Enter</kbd>. Swap after a few problems. Press <b>↺</b> in the top bar to start the string fresh.</div>
      ${s.problems.map((p, i) => `
        <section class="panel pt-prob">
          <div class="pt-head"><span class="pt-num">${i + 1}</span><span class="expr pt-q">${exprHTML(p.q)}</span><span class="pt-a">${eqSym(p.q)} ${esc(p.a)}</span>${p.optional ? '<span class="pt-opt">optional</span>' : ''}${split ? `<button class="btn small pt-go" data-go="${i}" title="Show this problem on the board">Show on board →</button>` : ''}</div>
          ${p.notes ? `<p class="pt-notes">${esc(p.notes.replace(/\s*Model:.*$/s, ''))}</p>` : ''}
          ${p.responses ? `<table class="gtable pt-table"><tr><th>Student says</th><th>Tool</th><th>Type this</th></tr>${p.responses.map(r => `<tr class="${r.kind === 'error' ? 'pt-err' : ''}"><td>${r.kind === 'error' ? '<span class="pt-flag">mistake</span> ' : ''}“${esc(r.say)}”</td><td>${toolCell(r.tool)}</td><td>${r.type ? `<code>${esc(r.type)}</code>` : ''}${r.tip ? `<div class="pt-tip">${esc(r.tip)}</div>` : ''}${split ? `<button class="btn small pt-draw" data-draw="${i}:${p.responses.indexOf(r)}" title="Draw this on the board">▶ Draw it</button>` : ''}</td></tr>`).join('')}</table>` : '<p class="hint">No practice responses for this problem yet.</p>'}
        </section>`).join('')}
      ${s.wrapUp ? `<section class="panel"><h2>Wrap-up</h2><p>${esc(s.wrapUp)}</p></section>` : ''}
    </div>${split ? `<div class="pt-boardpane no-print"><div class="pt-boardhead">🧪 <b>Practice board</b> · nothing here is saved or marked done. Use <b>▶ Draw it</b> on the card, or type your own.</div><iframe id="pt-frame" title="Practice board" src="${esc(location.pathname + '#/present/' + encodeURIComponent(s.id) + '/practice')}"></iframe></div>` : ''}</div>`;
    { const pb = $('#pt-board'); if (pb) pb.onclick = () => {
      if (innerWidth < 1000) { window.open(location.pathname + '#/present/' + encodeURIComponent(s.id) + '/practice', '_blank'); return; } // small screens: the board opens in its own tab
      store.set('practiceSplit', !split); practicePage(id);
    }; }
    if (split) {
      // the board is drawn at full presenter size and scaled down to fit its half of the screen
      const fit = () => {
        const pane = $('.pt-boardpane'), f = $('#pt-frame'), head = $('.pt-boardhead'); if (!pane || !f) return;
        const BW = 1280, w = pane.clientWidth, h = pane.clientHeight - (head ? head.offsetHeight : 0), sc = Math.min(1, w / BW);
        Object.assign(f.style, { width: BW + 'px', height: (h / sc) + 'px', transform: `scale(${sc})`, transformOrigin: '0 0', flex: 'none' });
      };
      fit(); window.onresize = fit;
      const send = msg => { const f = $('#pt-frame'); if (f && f.contentWindow) f.contentWindow.postMessage(msg, location.origin); };
      app.onclick = e => {
        const g = e.target.closest('[data-go]'), dr = e.target.closest('[data-draw]');
        if (g) send({ ms: 'goto', n: +g.dataset.go });
        if (dr) { const [pi, ri] = dr.dataset.draw.split(':').map(Number), r = s.problems[pi].responses[ri]; send({ ms: 'draw', n: pi, tool: r.tool, type: r.type, kind: r.kind, say: r.say }); }
      };
    }
    window.scrollTo(0, 0);
  }

  // School PD hub: the timeline, the sessions, and each grade's six weeks of addition and subtraction strings
  const PD = {
    title: 'Number strings PD · Grades 4–6',
    // exit: the session's 2-minute exit ticket (a Google Form); add the link when it's ready
    sessions: [
      { date: 'December 4, 2026', name: 'Session 1 · Launch', what: 'See what our students showed us, why additive reasoning matters, and get to know the app.',
        exit: 'https://docs.google.com/forms/d/e/1FAIpQLSdXow8jntjSn6yRDTUD6A0KwChNpLafDdQLNnyhr6y7Fr60Lg/viewform',
        plan: [['5 min', 'What our students showed us: Sheryl shares the results of the common task.'],
          ['5 min', 'Why additive reasoning: the two meanings of subtraction, the Big 4, and what each model shows.'],
          ['5 min', 'A string on the whiteboard with you as the students, then the same string in the app.'],
          ['15 min', 'Explore the app: open your grade\'s Week 1, present a string to a partner, and press Try to see what students might say. Then the exit ticket.']] },
      { date: 'February 1, 2027', name: 'Session 2 · Reflect', what: 'Compare your class\'s two common tasks, then plan your next strings in the app.', exit: '',
        plan: [['15 min', 'In small groups, put your December and January tasks side by side. What changed in how students model? More strategies? More number lines?'],
          ['10 min', 'Back in the app: plan what comes next for your class.'],
          ['5 min', 'Questions and the exit ticket.']] },
      { date: 'April 1, 2027', name: 'Session 3', what: 'Details to come.', exit: '', plan: [] },
    ],
    grades: ['4', '5', '6'],
    // six weeks, three strings a week; run two or three of them
    paths: {
      '4': [['g4-w01-d1-make-the-next-ten', 'g4-w01-d2-split-by-place-value', 'g4-w01-d3-over-the-hundred'],
        ['g4-w01-d4-add-a-friendly-number', 'g4-bank-add-01-give-and-take', 'g4-w01-d5-where-does-the-new-ten-go'],
        ['g4-bank-sub-03-back-to-a-ten', 'g4-bank-sub-04-up-to-a-hundred', 'g4-bank-sub-01-adding-up-to-subtract'],
        ['g4-bank-sub-05-take-too-much', 'g4-bank-sub-02-same-difference', 'g4-bank-sub-06-take-away-or-add-up'],
        ['g4-bank-sub-07-near-a-thousand', 'g4-bank-add-02-adding-four-digit-numbers', 'g4-bank-sub-08-zeros-in-the-way'],
        ['g4-bank-dec-01-tenths-make-a-whole', 'g4-bank-dec-02-subtracting-tenths', 'g4-bank-add-03-choosing-a-strategy']],
      '5': [['g5-w01-d1-make-the-next-whole', 'g5-w01-d2-add-a-friendly-number', 'g5-bank-sub-01-add-up-to-subtract'],
        ['g5-w01-d3-subtraction-as-distance', 'g5-w01-d4-constant-difference', 'g5-bank-sub-02-take-too-much'],
        ['g5-bank-dec-02-adding-decimals-by-place-value', 'g5-bank-dec-03-when-the-places-dont-match', 'g5-w01-d5-estimate-then-choose'],
        ['g5-bank-frac-01-like-fractions', 'g5-bank-frac-03-taking-from-a-whole', 'g5-bank-frac-04-count-up-with-fractions'],
        ['g5-bank-sub-03-big-numbers-same-difference', 'g5-bank-add-01-big-numbers-give-and-take', 'g5-bank-dec-04-making-change'],
        ['g5-bank-frac-05-adding-mixed-numbers', 'g5-bank-add-02-choose-a-strategy', 'g5-bank-frac-06-fractions-and-decimals-same-moves']],
      '6': [['g6-bank-sub-01-count-up-through-thousands', 'g6-bank-sub-02-take-too-much', 'g6-bank-add-01-give-and-take'],
        ['g6-bank-dec-05-same-difference-with-decimals', 'g6-bank-dec-06-count-up-with-decimals', 'g6-bank-dec-04-thousandths-make-a-whole'],
        ['g6-w02-d1-fractions-on-the-clock', 'g6-w02-d2-sixths-and-twelfths', 'g6-w02-d3-subtracting-on-the-clock'],
        ['g6-bank-frac-03-fifths-and-tenths', 'g6-w02-d4-mixed-numbers', 'g6-w02-d5-benchmark-fractions'],
        ['g6-bank-frac-04-count-up-with-fractions', 'g6-bank-frac-05-fractions-or-decimals', 'g6-bank-add-02-estimate-then-calculate'],
        ['g6-bank-add-03-choose-whole-and-decimal', 'g6-bank-frac-06-choose-a-fraction-strategy', 'g6-bank-add-04-undo-it']],
    },
    weekWhen: ['Before the break', 'Before the break', 'January', 'January', 'January', 'January, then the task again'],
  };
  function pdPage(grade) {
    document.title = 'PD · Math Strings';
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    if (grade && !PD.grades.includes(grade)) grade = null;
    if (grade) store.set('pdGrade', grade);
    const weeks = grade ? (PD.paths[grade] || []).map(w => w.map(findString).filter(Boolean)) : [];
    const inPath = new Set(weeks.flat().map(s => s.id));
    const row = s => `<div class="pd-day"><span class="pd-dt">${esc(s.title)}${isDone(s.id) ? ' <span class="pd-done" title="You have done this string">✓</span>' : ''}</span>
      <span class="pd-acts"><a class="btn small primary" href="#/present/${encodeURIComponent(s.id)}">▶ Present</a>${s.problems.some(p => p.responses) ? `<a class="btn small" href="#/practice/${encodeURIComponent(s.id)}">📝 Practice card</a>` : ''}<a class="btn small" href="#/card/${encodeURIComponent(s.id)}" title="One printable page to keep beside you">🗒 Teacher card</a></span></div>`;
    const codes = unitCodes(weeks.flat());
    app.innerHTML = `
    <div class="guide pd">
      <div class="ed-head no-print">
        <a class="btn ghost" href="#/">← Library</a>
        <span style="flex:1"></span>
        <a class="btn" href="#/start">📘 Getting started</a>
      </div>
      <h1>${esc(PD.title)}</h1>
      <p class="lead">This year we're using number strings to build additive reasoning: a short routine where students solve a set of related addition and subtraction problems in their heads and explain how they did it. Your class does a common task before and after, so we can see how their modelling changes.</p>

      <section class="panel pd-ask"><h2>How it works</h2>
        <ol class="steps pd-timeline">
          <li><b>Before December 4:</b> your class does the common task.</li>
          <li><b>December 4, Session 1:</b> we look at the results, talk about why additive reasoning matters, and get to know the app.</li>
          <li><b>Six weeks of strings.</b> Aim for 2–3 strings a week, 10–15 minutes each.</li>
          <li><b>Last week of January:</b> your class does the same common task again.</li>
          <li><b>February 1, Session 2:</b> we compare the two tasks and plan what's next.</li>
          <li><b>April 1, Session 3:</b> details to come.</li>
        </ol>
      </section>

      ${findString('g4-bank-sub-09-shift-both-numbers') ? `<section class="panel"><h2>The string from Session 1</h2>
        <div class="pd-days">${row(findString('g4-bank-sub-09-shift-both-numbers'))}</div>
      </section>` : ''}

      <section class="panel"><h2>Suggested six weeks of strings</h2>
        <div class="grade-chips">${PD.grades.map(g => `<a class="gchip${g === grade ? ' on' : ''}" href="#/pd/${g}">Grade ${g}</a>`).join('')}</div>
        ${!grade ? '<p class="hint">Pick your grade to see its suggested six weeks.</p>'
          : `<p>Press <b>Present</b> to run one with your class, or open the <b>Teacher card</b> to read it first.</p>
             ${codes.length ? `<details class="pd-curr"><summary>Ontario curriculum ${currBadges(grade, codes)}</summary><ul>${codes.map(c => `<li><b>${esc(c)}</b> ${esc(expectText(grade, c) || '')}</li>`).join('')}</ul></details>` : ''}
             ${weeks.map((w, i) => `<div class="pd-unit"><h3>Week ${i + 1} <span class="pd-when">${esc(PD.weekWhen[i] || '')}</span></h3><div class="pd-days">${w.map(row).join('')}</div></div>`).join('')}`}
      </section>

      <p class="hint">Based on the Ontario monograph <i>Making Space for Students to Think Mathematically</i>.</p>
    </div>`;
    window.scrollTo(0, 0);
  }

  /* ================= saved runs ================= */
  const longDate = r => new Date(r.at || Date.now()).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const runName = r => `${r.label ? r.label + ' · ' : ''}${r.title}`;
  function runCardsHTML(r) {
    return r.problems.map(p => `<div class="ov-card run-card"><span class="rnum">${p.n}</span>
      <div class="ov-head"><span class="expr">${exprHTML(p.q) || '…'}</span><span class="eq-mark">${eqSym(p.q)}</span><span class="answers">${p.answers.map(a => `<span class="ans ${esc(a.mark || '')}">${exprHTML(a.t)}</span>`).join('') || '<span class="hint">no answers recorded</span>'}</span></div>
      ${p.snap ? snapHTML(p.snap) : p.models.length ? `<div class="ov-models" style="grid-template-columns:repeat(${Math.min(2, p.models.length)},minmax(0,1fr))">${p.models.map(m => `<div class="ov-tile">${modelSVG(m).html}</div>`).join('')}</div>` : ''}
    </div>`).join('');
  }
  function runsPage(stringId) {
    document.title = 'My runs · Math Strings';
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    const all = getRuns(), runs = stringId ? all.filter(r => r.id === stringId) : all;
    const sFor = stringId && (findString(stringId) || all.find(r => r.id === stringId));
    app.innerHTML = `
    <div class="guide runs-page">
      <div class="ed-head no-print"><a class="btn ghost" href="#/">← Library</a><span style="flex:1"></span>${stringId ? '<a class="btn ghost" href="#/runs">All runs</a>' : ''}</div>
      <h1>🗂 My runs</h1>
      <p class="lead">Every time you press <b>Finish</b> at the end of a string, a dated copy is saved here with every student answer and model. Open one to look back at it, or print it.</p>
      ${stringId && sFor ? `<p><b>Showing runs of ${esc(runName(sFor))}.</b></p>` : ''}
      ${runs.length ? `<div class="run-list">${runs.map(r => { const n = all.filter(x => x.id === r.id).length; return `
        <div class="run-row">
          <a class="run-main" href="#/run/${encodeURIComponent(r.rid)}"><span class="run-date">${esc(longDate(r))}</span><span class="run-title">${esc(runName(r))}</span>
            <span class="run-meta">${r.cls ? `<b>${esc(r.cls)}</b> · ` : ''}${esc((r.group || '').replace(/\s*·\s*Week\s*\d+\s*·\s*/, ' · '))}${r.note ? ` · “${esc(r.note.length > 70 ? r.note.slice(0, 70) + '…' : r.note)}”` : ''}</span></a>
          <span class="run-acts">${n > 1 ? `<a class="btn small ghost" href="#/runs/${encodeURIComponent(r.id)}" title="Every run of this string">${n} runs</a>` : ''}<a class="btn small" href="#/run/${encodeURIComponent(r.rid)}">Open</a></span>
        </div>`; }).join('')}</div>`
        : `<div class="empty">No saved runs ${stringId ? 'of this string ' : ''}yet. Present a string and press <b>Finish</b> at the end, or click <b>💾 Save run</b> at the wrap-up.</div>`}
      <p class="hint">Runs are saved in this browser on this computer. <b>Export</b> (under ☰ More on the library page) includes them, so you can keep a copy or move them to another computer.</p>
    </div>`;
    window.scrollTo(0, 0);
  }
  function runPage(rid) {
    const r = getRuns().find(x => x.rid === rid);
    if (!r) return go('runs');
    document.title = runName(r) + ' · ' + longDate(r);
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    app.innerHTML = `
    <div class="guide run-page">
      <div class="ed-head no-print">
        <a class="btn ghost" href="#/runs">← My runs</a><span style="flex:1"></span>
        <button class="btn" data-r="print">🖨 Print / save PDF</button>
        ${findString(r.id) ? `<a class="btn" href="#/present/${encodeURIComponent(r.id)}">▶ Present again</a>` : ''}
        <button class="icon-btn" data-r="del" title="Delete this run">🗑</button>
      </div>
      <h1>${esc(runName(r))}</h1>
      <p class="run-sub">${esc(r.group || '')}</p>
      <div class="run-fields no-print">
        <label class="field">Date<input value="${esc(longDate(r))}" disabled></label>
        <label class="field">Class<input id="rf-cls" value="${esc(r.cls || '')}" placeholder="e.g. 6B"></label>
        <label class="field grow">What did you notice?<input id="rf-note" value="${esc(r.note || '')}" placeholder="A quick note for yourself"></label>
      </div>
      <p class="print-only"><b>${esc(longDate(r))}</b>${r.cls ? ` · ${esc(r.cls)}` : ''}${r.note ? `<br>${esc(r.note)}` : ''}</p>
      <div class="overview run-over">${runCardsHTML(r)}</div>
      ${r.of && r.problems.length < r.of ? `<p class="hint">${r.problems.length} of ${r.of} problems were reached in this run.</p>` : ''}
    </div>`;
    const upd = (k, v) => { const runs = getRuns(), x = runs.find(y => y.rid === rid); if (x) { x[k] = v; setRuns(runs); } };
    $('#rf-cls').oninput = e => upd('cls', e.target.value); $('#rf-note').oninput = e => upd('note', e.target.value);
    app.onclick = e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === 'print') window.print();
      if (b.dataset.r === 'del' && confirm('Delete this saved run? This can\'t be undone.')) { setRuns(getRuns().filter(x => x.rid !== rid)); go('runs'); toast('Run deleted'); }
    };
    window.scrollTo(0, 0);
  }

  function startPage() {
    store.set('welcomed', true);
    document.title = 'Getting started · Math Strings';
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    app.innerHTML = `
    <div class="guide">
      <div class="ed-head no-print">
        <a class="btn ghost" href="#/">← Library</a>
        <span style="flex:1"></span>
        <button class="btn" onclick="window.print()">🖨 Print</button>
        <a class="btn primary" href="#/">Try a string →</a>
      </div>
      <h1>Getting started with Math Strings</h1>
      <p class="lead">A <b>number string</b> is a short set of related problems, shown one at a time, that nudges students toward a mental-math strategy. This site is your board: it shows the problems, keeps the whole string visible, and draws students' thinking cleanly, so you aren't drawing on the whiteboard. <b>Students only see the problems and what you model.</b> Answers and teacher notes stay off the screen.</p>

      <section class="panel"><h2>1 · Before class <span>(5 minutes)</span></h2>
        <ol class="steps">
          <li><b>Pick a string</b> from the library. Choose your <b>grade</b> and a <b>topic</b> (like Fractions or Percents); strings are grouped into week-long units.</li>
          <li><b>Read the notes.</b> Click <b>Edit</b> on a string to see each problem's <i>Look for</i>, <i>Ask</i> and <i>Model</i> notes. Print that page and keep it beside you.</li>
          <li><b>Rehearse once.</b> Click <b>▶ Present</b>, try a few student answers and models, then press <b>↺</b> in the top bar to start fresh.</li>
          <li><b>Trim the tools</b> (optional). In Present, click <b>⚙</b> at the end of the tool bar and untick tools you won't use.</li>
        </ol>
      </section>

      <section class="panel"><h2>2 · The routine in class</h2>
        <table class="gtable">
          <tr><th>Step</th><th>What you do</th></tr>
          <tr><td>Show a problem</td><td>Press <kbd>→</kbd> (or click <b>Next</b>). The think timer starts.</td></tr>
          <tr><td>Collect answers</td><td>Press <kbd>A</kbd>, type what a student says, even a wrong answer, then press <kbd>Enter</kbd>. Don't confirm yet.</td></tr>
          <tr><td>Model a strategy</td><td>Pick a tool at the bottom (e.g. <b>Number line</b>), type the student's thinking, and press <kbd>Enter</kbd>. It shrinks into the grid so you can add another student's way.</td></tr>
          <tr><td>Check the answer</td><td>Click an answer to <b>circle</b> it; click again to <b>cross it out</b>.</td></tr>
          <tr><td>Next problem</td><td>Press <kbd>→</kbd>. Earlier problems stay listed on the left so students can use them.</td></tr>
          <tr><td>Wrap up</td><td>After the last problem, click <b>Wrap-up</b> to see the whole string, ask <i>"What did you notice?"</i>, then <b>Finish</b>.</td></tr>
        </table>
      </section>

      <section class="panel"><h2>3 · Typing models</h2>
        <p>Type it the way you'd say it. The drawing appears as you type.</p>
        <table class="gtable">
          <tr><th>Type this</th><th>Number line draws…</th></tr>
          <tr><td><code>38 +10 -1</code></td><td>start at 38, jump +10, back 1</td></tr>
          <tr><td><code>38 to 48 to 47</code></td><td>the same thing, as "jump to"</td></tr>
          <tr><td><code>76 +4 +20</code></td><td>adding up to a friendly number</td></tr>
          <tr><td><code>89 gap 100</code></td><td>a bracket showing the distance (11)</td></tr>
          <tr><td><code>5 jumps of 2</code></td><td>count by 2s from 0</td></tr>
        </table>
        <table class="gtable" style="margin-top:10px">
          <tr><th>Type this</th><th>in…</th><th>draws…</th></tr>
          <tr><td><code>84 / 7 = 70 + 14</code></td><td>Area</td><td>division as a missing side: 70 ÷ 7 = 10 and 14 ÷ 7 = 2, so 12</td></tr>
          <tr><td><code>2/3 x 3/4</code></td><td>Area</td><td>a square cut into thirds and quarters; the overlap (6/12 = 1/2) is the product</td></tr>
          <tr><td><code>100:60, 10:6, 5:3, 15:9</code></td><td>Ratio</td><td>a ratio table; 15% is marked as 10 + 5</td></tr>
          <tr><td><code>-8 +8 +7</code></td><td>Vertical</td><td>a thermometer-style number line</td></tr>
        </table>
        <p>Click any label on a drawing (like <b>+10</b>) to replace it with the student's own words. Every tool (ratio table, area model, array, integer tiles, standard algorithm, and more) shows grey example hints under the typing box.</p>
      </section>

      <section class="panel"><h2>4 · Handy tips</h2>
        <ul class="steps">
          <li><b>Click a model</b> to show it full-screen. Hover over it to ✎ change or ✕ remove it.</li>
          <li><b>🎲 Pick</b> chooses a random student. Add your class list the first time; names stay only on your computer.</li>
          <li><b>⏱ Timer:</b> click it (or press <kbd>T</kbd>) to start or pause think time.</li>
          <li><b>✏️ Pen</b> draws on top of anything. <kbd>Esc</kbd> stops.</li>
          <li><kbd>L</kbd> hides the problem list on the left for more room. <kbd>O</kbd> shows the whole string.</li>
          <li><b>🧪 Practise here</b> on a string's practice card opens a practice board beside the card. Tap <b>▶ Draw it</b> to see each likely response modelled, or type your own. Nothing there is saved or marked done.</li>
          <li><b>💡 Try</b> (or <kbd>Y</kbd>) lists likely student responses for the problem. Tap one to draw it: great for rehearsing at home, or as a backup in class.</li>
          <li><b>Keep track:</b> a string is marked <b>✓ done</b> when you press Finish. Pressing Finish also saves the run (every answer and model) in <b>🗂 My runs</b>, where you can look back at it or print it. You can also tap <b>✓</b> on a card yourself, and <b>Filter → Not done yet</b> hides the ones you've done.</li>
          <li>Everything is saved <b>in this browser on this computer</b>. There are no accounts and nothing is uploaded. <b>☰ More → Export</b> takes your progress to another computer.</li>
        </ul>
      </section>

      <section class="panel"><h2>Keyboard</h2>
        <div class="keys">
          <kbd>→</kbd><span>next problem (or Space)</span><kbd>←</kbd><span>back</span><kbd>A</kbd><span>add a student answer</span>
          <kbd>Enter</kbd><span>finish the model you're typing</span>
          <kbd>T</kbd><span>timer</span><kbd>R</kbd><span>random name</span><kbd>O</kbd><span>whole string</span><kbd>L</kbd><span>problem list</span><kbd>Y</kbd><span>try a likely response</span>
          <kbd>P</kbd><span>pen</span><kbd>E</kbd><span>eraser</span><span class="kc"><kbd>Ctrl</kbd> + <kbd>Z</kbd></span><span>undo a pen stroke</span><kbd>Esc</kbd><span>stop / close</span><kbd>?</kbd><span>all keys</span>
        </div>
        <p style="margin:10px 0 6px"><b>Number keys add a model</b> (the number also shows on each tool button):</p>
        <div class="keys">${toolKeysHTML()}</div>
      </section>

      <p class="hint">Need a different string? Ask the teacher who shared this site with you. New strings can be added to the library for everyone.</p>
      <div class="no-print" style="text-align:center;margin:26px 0"><a class="btn primary" href="#/">Go to the library and try a string →</a></div>
    </div>`;
    window.scrollTo(0, 0);
  }

  const toolKeysHTML = () => TOOLS.filter(t => t.key).sort((a, b) => (a.key === '0') - (b.key === '0') || a.key.localeCompare(b.key))
    .map(t => `<kbd>${t.key}</kbd><span>${esc(t.name)}</span>`).join('');
  function helpModal() {
    modal('How it works', `
      <div><b>Presenting.</b> Click <b>▶ Present</b> on a string. Problems appear one at a time and earlier ones shrink into the column on the left so the whole string stays visible.</div>
      <div><b>Recording answers.</b> Click <b>＋ answer</b> (or press <kbd>A</kbd>) and type what a student says, even if it is wrong. Click an answer to circle it, click again to cross it out.</div>
      <div><b>Modeling.</b> Pick a tool at the bottom and type in the box there. The drawing appears big while you type; press <kbd>Enter</kbd> and it shrinks into the grid so every student's model fits on one screen. Click a model to spotlight it; ✎ changes it. Click any label on a drawing to use the student's words. ⚙ chooses which tools show. Press <kbd>P</kbd> for the pen.</div>
      <div class="keys">
        <kbd>→</kbd><span>Next problem (also Space, N or Page Down, so a presentation clicker works)</span>
        <kbd>←</kbd><span>Back (also Page Up)</span>
        <kbd>T</kbd><span>Start / pause the timer</span>
        <kbd>M</kbd><span>Mute / unmute the chime</span>
        <kbd>R</kbd><span>Random name picker</span>
        <kbd>A</kbd><span>Add a student answer</span>
        <kbd>Y</kbd><span>💡 Try: likely student responses for this problem</span>
        <span class="kc"><kbd>P</kbd> / <kbd>E</kbd></span><span>Pen / eraser</span>
        <span class="kc"><kbd>Ctrl</kbd> + <kbd>Z</kbd></span><span>Undo the last pen stroke</span>
        <kbd>L</kbd><span>Show / hide the list of problems on the left</span>
        <kbd>O</kbd><span>Overview of the whole string (for the wrap-up). At the end, Next becomes Wrap-up, then Finish takes you back to the library.</span>
        <kbd>Enter</kbd><span>Finish the model you're typing</span>
        <kbd>Esc</kbd><span>Stop typing or drawing, or close a panel</span>
        <kbd>?</kbd><span>This help</span>
      </div>
      <div><b>Add a model</b> with a number key (also shown on each tool button). Tools without a number are under the tool bar or <b>More tools</b>.</div>
      <div class="keys">${toolKeysHTML()}</div>
      <div><b>Adding strings with Claude.</b> Copy the instructions below into your planning chat. Claude will make a <code>.json</code> file you can bring in with <b>☰ More → Import</b>.</div>
      <button class="btn" id="copy-fmt">📋 Copy instructions for Claude</button>`, [], { wide: true });
    $('#copy-fmt').onclick = () => { navigator.clipboard.writeText(CLAUDE_FORMAT).then(() => toast('Copied. Paste it into your planning chat.'), () => toast('Copy failed')); };
  }

  function exportAll() {
    download(`math-strings-${today()}.json`, JSON.stringify({ version: 1, exported: today(), strings: library.map(clean), track, runs: getRuns(), boards: getBoards() }, null, 2));
    toast(`Exported ${library.length} strings`);
  }

  // Accepts our JSON, a bare array of strings, or a plain-text list.
  function parseImport(text) {
    text = text.trim();
    if (!text) throw new Error('Nothing to import.');
    if (/^[\[{]/.test(text)) {
      let data;
      try { data = JSON.parse(text.replace(/^```(json)?|```$/g, '')); } catch (e) { throw new Error('That looks like JSON but has a mistake in it: ' + e.message); }
      const arr = Array.isArray(data) ? data : data.strings ? data.strings : data.problems ? [data] : null;
      if (!arr) throw new Error('Could not find any strings in that file.');
      return arr.map(normalizeString);
    }
    // plain text: "## Title" starts a string; "key: value" lines; problem lines contain "="
    const out = []; let cur = null, last = null;
    text.replace(/```[a-z]*|```/g, '').split('\n').forEach(raw => {
      const line = raw.trim();
      if (!line) return;
      const head = line.match(/^#{1,3}\s*(.+)$/);
      if (head || !cur) {
        cur = { title: head ? head[1] : 'Imported string', problems: [], watchFor: [] }; out.push(cur); last = null;
        const lm = cur.title.match(/^((?:Day|Lesson|String)\s*\d+[a-z]?)\s*[:\-–]\s*(.+)$/i);
        if (lm) { cur.label = lm[1]; cur.title = lm[2]; }
        if (head) return;
      }
      const kv = line.match(/^(group|tool|strategy|label|id|title|key words|keywords|connection|wrap-up|wrapup|watch for)\s*:\s*(.*)$/i);
      if (kv && !last) { const k = kv[1].toLowerCase().replace(/[\s-]/g, ''); const map = { keywords: 'keywords', wrapup: 'wrapUp', watchfor: 'watchFor' }; if (k === 'watchfor') cur.watchFor.push(kv[2]); else cur[map[k] || k] = kv[2]; return; }
      const pm = line.match(/^(?:\d+[.)](?![\d])\s*)?(.+=.+)$/);
      if (pm && /\d/.test(pm[1]) && !/^(look for|ask|word choice)/i.test(line)) { last = splitProblem(pm[1]); cur.problems.push(last); return; }
      if (/^watch for/i.test(line)) { last = null; return; }
      if (last) last.notes = (last.notes ? last.notes + ' ' : '') + line.replace(/^[-•*]\s*/, '');
      else if (cur) cur.watchFor.push(line.replace(/^[-•*]\s*/, ''));
    });
    const res = out.filter(s => s.problems.length).map(normalizeString);
    if (!res.length) throw new Error('No problems found. Each problem needs an “=”, like 38 + 9 = 47.');
    return res;
  }

  function importModal() {
    const m = modal('Import strings', `
      <div class="drop" id="drop"><b>Drop a .json file here</b> or <label style="color:var(--accent);cursor:pointer;font-weight:700"><input type="file" id="file" accept=".json,.txt,.md,application/json,text/plain" hidden>choose a file</label><br><span style="font-size:14px">Use a file from <b>Export</b> on another computer, or one Claude made for you.</span></div>
      <label class="field">…or paste it here (JSON or a plain list)<textarea id="paste" rows="8" placeholder="## Day 1: Adding Near a Ten&#10;group: Week 1&#10;38 + 10 = 48&#10;38 + 9 = 47&#10;38 + 19 = 57 (optional)"></textarea></label>
      <div id="imp-msg"></div>`,
      [{ label: 'Import', primary: true, run: () => doImport($('#paste').value) }]);
    const msg = (t, ok) => { $('#imp-msg').innerHTML = `<div class="msg ${ok ? 'ok' : 'err'}">${t}</div>`; };
    function doImport(text) {
      let arr;
      try { arr = parseImport(text); } catch (e) { msg(esc(e.message)); return false; }
      let added = 0, updated = 0;
      arr.forEach(s => {
        deleted.delete(s.id);
        { const b0 = siteCopy(s.id); if (b0 && same(s, b0)) s._edited = false; else { s._edited = true; if (b0) s._siteSig = sig(b0); } } // unchanged website strings keep getting updates
        const i = library.findIndex(x => x.id === s.id);
        if (i >= 0) { library[i] = s; updated++; } else { library.push(s); added++; }
      });
      let tracked = 0, boardsN = 0;
      try { const raw = JSON.parse(text.trim().replace(/^```(json)?|```$/g, '')); if (raw && raw.track && typeof raw.track === 'object') { mergeTrack(raw.track); tracked = Object.keys(raw.track).length; } if (raw && raw.runs) tracked += mergeRuns(raw.runs); if (raw && Array.isArray(raw.boards)) boardsN = mergeBoards(raw.boards); } catch (e) { /* plain text */ }
      saveLibrary(); libraryView();
      m.close();
      toast(`Imported: ${added} new${updated ? `, ${updated} updated` : ''}${tracked ? ', plus your progress and saved runs' : ''}${boardsN ? `, ${boardsN} board${boardsN === 1 ? '' : 's'}` : ''}`);
      return true;
    }
    const readFile = f => f.text().then(doImport);
    $('#file').onchange = e => e.target.files[0] && readFile(e.target.files[0]);
    const drop = $('#drop');
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) readFile(f); };
  }

  /* ================= timer ================= */
  const timer = {
    phase: 'idle', left: 0, total: 0, running: false, last: 0, iv: null,
    start() {
      if (this.phase === 'idle' || this.phase === 'done') this.begin('think');
      else this.running = !this.running;
      this.last = performance.now(); this.ensure(); this.draw();
    },
    begin(phase) {
      const secs = phase === 'think' ? settings.think : settings.talk;
      if (!secs) { if (phase === 'think') return this.begin('talk'); this.phase = 'done'; this.running = false; return; }
      this.phase = phase; this.total = this.left = secs; this.running = true; this.last = performance.now();
    },
    skip() { if (this.phase === 'think') this.begin('talk'); else { this.phase = 'done'; this.running = false; } this.ensure(); this.draw(); },
    reset() { this.phase = 'idle'; this.running = false; this.draw(); },
    autoStart() { if (settings.autoTimer) { this.begin('think'); this.ensure(); this.draw(); } else this.reset(); },
    ensure() {
      if (this.iv) return;
      this.iv = setInterval(() => {
        const now = performance.now();
        if (this.running) {
          this.left -= (now - this.last) / 1000;
          if (this.left <= 0) {
            chime(this.phase === 'think' ? 1 : 2);
            if (this.phase === 'think' && settings.talk) this.begin('talk');
            else { this.phase = 'done'; this.running = false; }
          }
        }
        this.last = now; this.draw();
      }, 200);
    },
    draw() {
      const el = $('#timer'); if (!el) return;
      el.className = 'timer ' + this.phase;
      const t = Math.max(0, Math.ceil(this.left));
      $('.phase', el).textContent = { idle: '⏱ Think time', think: this.running ? 'Think' : 'Paused', talk: this.running ? 'Talk' : 'Paused', done: '✓ Time' }[this.phase];
      $('.time', el).textContent = this.phase === 'idle' || this.phase === 'done' ? '' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
      $('.fill', el).style.width = this.phase === 'think' || this.phase === 'talk' ? `${(1 - this.left / this.total) * 100}%` : '0%';
      $('[data-t=play]', el).textContent = this.running ? '❚❚' : '▶';
      $('[data-t=skip]', el).classList.toggle('hidden', !(this.phase === 'think' || this.phase === 'talk'));
    },
  };
  function stopTimerUI() { /* timer keeps its state across views */ }
  let audioCtx;
  // The bell beside the timer: on = a soft chime when time is up
  function renderMute() {
    const b = $('#mute-btn'); if (!b) return;
    b.textContent = settings.chime ? '🔔' : '🔕';
    b.title = settings.chime ? 'Chime is on: click to mute (M)' : 'Chime is muted: click to turn it on (M)';
    b.setAttribute('aria-label', settings.chime ? 'Mute the chime' : 'Turn the chime on');
    b.classList.toggle('muted', !settings.chime);
  }
  function chime(n) {
    if (!settings.chime) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < n; i++) {
        const t0 = audioCtx.currentTime + i * 0.28, o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine'; o.frequency.value = i ? 784 : 659;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
        o.connect(g).connect(audioCtx.destination); o.start(t0); o.stop(t0 + 1.2);
      }
    } catch (e) { /* no audio */ }
  }

  /* ================= random picker ================= */
  const classes = Object.assign({ list: [], active: null, noRepeat: true }, store.get('classes', {}));
  const saveClasses = () => store.set('classes', classes);
  function pickerOverlay(editFirst) {
    let editing = editFirst || !classes.list.length;
    const el = h(`<div class="picker-back"></div>`);
    document.body.appendChild(el);
    let rolling = false, shown = '';
    const cls = () => classes.list.find(c => c.id === classes.active) || classes.list[0];
    const render = () => {
      const c = cls();
      if (editing) {
        el.innerHTML = `<div class="picker-top"><b style="font-size:20px">Class lists</b><span class="spacer"></span><button class="btn" data-a="close">Done</button></div>
          <div style="overflow:auto;padding:0 18px"><div class="panel" style="max-width:640px;margin:0 auto">
            <div class="class-list" style="margin-bottom:12px">${classes.list.map(x => `<button class="btn small${c && x.id === c.id ? ' on' : ''}" data-a="sel" data-id="${x.id}">${esc(x.name)}</button>`).join('')}<button class="btn small" data-a="addc">＋ Add class</button></div>
            ${c ? `<div class="class-edit">
              <label class="field">Class name<input id="cn" value="${esc(c.name)}"></label>
              <label class="field">Students (one per line)<textarea id="cnames" placeholder="Paste names here, one per line">${esc(c.names.join('\n'))}</textarea></label>
              <div style="display:flex;gap:8px"><button class="btn primary" data-a="savec">Save</button><span class="spacer" style="flex:1"></span><button class="btn danger" data-a="delc">Delete class</button></div>
              <p class="hint">Names are saved only in this browser. They are never put on the website.</p>
            </div>` : '<p class="hint">Add a class to start.</p>'}
          </div></div><div></div>`;
        return;
      }
      const left = c ? c.names.filter(n => !c.drawn.includes(n)) : [];
      el.innerHTML = `<div class="picker-top">
          <select id="csel">${classes.list.map(x => `<option value="${x.id}"${c && x.id === c.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
          <label style="font-size:15px;color:var(--soft)"><input type="checkbox" id="norep"${classes.noRepeat ? ' checked' : ''}> No repeats until everyone is picked</label>
          <span class="spacer"></span>
          <button class="btn ghost" data-a="edit">Edit classes</button>
          <button class="btn" data-a="close">Close <kbd>Esc</kbd></button>
        </div>
        <div class="picker-name"><div><div class="nm ${shown && !rolling ? 'landed' : ''}${rolling ? ' rolling' : ''}" id="nm">${esc(shown || (c && c.names.length ? 'Ready' : 'Add names to this class'))}</div>
          ${c && classes.noRepeat && c.names.length ? `<div class="sub">${left.length} of ${c.names.length} left in the jar</div>` : ''}</div></div>
        <div class="picker-bottom">
          <button class="btn primary big" data-a="pick"${c && c.names.length ? '' : ' disabled'}>🎲 Pick <kbd style="margin-left:6px">Space</kbd></button>
          ${c && classes.noRepeat ? `<button class="btn" data-a="refill">Put all names back</button>` : ''}
        </div>`;
    };
    const pick = () => {
      const c = cls(); if (!c || !c.names.length || rolling) return;
      if (classes.noRepeat && c.names.every(n => c.drawn.includes(n))) c.drawn = [];
      const pool = classes.noRepeat ? c.names.filter(n => !c.drawn.includes(n)) : c.names;
      const winner = pool[Math.floor(Math.random() * pool.length)];
      rolling = true; let k = 0;
      const steps = 14;
      const tick = () => {
        const nm = $('#nm', el); if (!nm) return;
        if (k < steps) { nm.textContent = c.names[Math.floor(Math.random() * c.names.length)]; nm.className = 'nm rolling'; k++; setTimeout(tick, 40 + k * 9); }
        else { rolling = false; shown = winner; if (classes.noRepeat) c.drawn.push(winner); saveClasses(); render(); }
      };
      tick();
    };
    const close = () => { el.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = e => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { if (e.key === 'Escape') e.target.blur(); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if ((e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'r') && !editing) { e.preventDefault(); e.stopPropagation(); pick(); }
      else e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);
    el.addEventListener('change', e => {
      if (e.target.id === 'csel') { classes.active = e.target.value; shown = ''; saveClasses(); render(); }
      if (e.target.id === 'norep') { classes.noRepeat = e.target.checked; saveClasses(); render(); }
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const c = cls();
      const a = b.dataset.a;
      if (a === 'close') { if (editing && !editFirst && classes.list.length) { editing = false; render(); } else close(); }
      if (a === 'edit') { editing = true; render(); }
      if (a === 'pick') pick();
      if (a === 'refill' && c) { c.drawn = []; shown = ''; saveClasses(); render(); }
      if (a === 'sel') { classes.active = b.dataset.id; render(); }
      if (a === 'addc') { const n = { id: uid(), name: 'Class ' + (classes.list.length + 1), names: [], drawn: [] }; classes.list.push(n); classes.active = n.id; saveClasses(); render(); $('#cn', el).select(); }
      if (a === 'savec' && c) {
        c.name = $('#cn', el).value.trim() || c.name;
        c.names = [...new Set($('#cnames', el).value.split('\n').map(x => x.trim()).filter(Boolean))];
        c.drawn = c.drawn.filter(n => c.names.includes(n)); saveClasses();
        if (editFirst) { render(); toast('Class saved'); } else { editing = false; render(); }
      }
      if (a === 'delc' && c && confirm(`Delete ${c.name}?`)) { classes.list = classes.list.filter(x => x !== c); classes.active = classes.list[0] && classes.list[0].id; saveClasses(); render(); }
    });
    render();
  }

  /* ================= presenter ================= */
  let P = null; // presenter state

  function newSession(id, s) {
    return { id, at: Date.now(), problems: s.problems.map(p => ({ q: p.q, optional: !!p.optional })), cursor: 0, shown: [], active: -1, data: {} };
  }
  const sessKey = sandbox => (sandbox ? 'practiceSession' : 'session');
  function loadSession(id, s, sandbox) {
    const saved = store.get(sessKey(sandbox), null);
    const fresh = saved && saved.id === id && Date.now() - saved.at < 8 * 3600e3;
    if (fresh && (id === '__quick' || JSON.stringify(saved.problems.map(p => p.q)) === JSON.stringify(s.problems.map(p => p.q)))) return saved;
    return newSession(id, s);
  }
  let sessT;
  const saveSession = () => { clearTimeout(sessT); sessT = setTimeout(() => { if (P) { P.sess.at = Date.now(); if (P.board) saveBoard(); else store.set(sessKey(P.sandbox), P.sess); } }, 250); };
  const pdata = idx => (P.sess.data[idx] = P.sess.data[idx] || { answers: [], models: [], strokes: [] });
  // Keep a dated copy of this run (answers and models; pen drawings aren't kept). Saving again updates the same run.
  function saveRun(quiet) {
    if (!P || P.quick || P.sandbox) return null;
    const S = P.sess;
    const problems = S.shown.map(idx => {
      const d = S.data[idx] || { answers: [], models: [] };
      return { n: idx + 1, q: S.problems[idx].q, answers: d.answers.map(a => ({ t: a.t, mark: a.mark || '' })),
        models: d.models.filter(m => String(m.input || '').trim()).map(m => ({ type: m.type, input: m.input, labels: m.labels || {}, hidden: m.hidden || [] })),
        ...(d.snap && (d.strokes || []).some(st => st.n) ? { snap: d.snap } : {}) };
    });
    if (!problems.some(p => p.answers.length || p.models.length)) { if (!quiet) toast('Nothing to save yet. Add an answer or a model first.'); return null; }
    const runs = getRuns();
    let r = S.runId && runs.find(x => x.rid === S.runId);
    if (!r) { r = { rid: Date.now().toString(36) + uid(), id: P.s.id, at: Date.now(), date: today() }; runs.unshift(r); S.runId = r.rid; saveSession(); }
    Object.assign(r, { title: P.s.title, label: P.s.label || '', group: P.s.group || '', cls: S.cls || '', note: S.note || '', of: S.problems.length, problems, updated: Date.now() });
    setRuns(runs);
    return r;
  }

  /* ================= boards: saved lists of problems shown on a clean screen ================= */
  const getBoards = () => { const b = store.get('boards', []); return Array.isArray(b) ? b : []; };
  const setBoards = b => store.set('boards', b);
  const newBoardId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  // Problems from pasted text: one per line, or separated by blank lines when a problem runs over several lines.
  function parseProblems(text, stripNumbers) {
    const t = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (!t) return [];
    const parts = /\n[ \t]*\n/.test(t) ? t.split(/\n[ \t]*\n/) : t.split('\n');
    return parts.map(p => p.split('\n').map(l => l.trim()).filter(Boolean).join('\n'))
      .map(p => (stripNumbers ? p.replace(/^(?:Q(?:uestion)?\s*\d{1,3}\s*[.):]?|\d{1,3}[.)])\s+/i, '') : p).trim()).filter(Boolean);
  }
  // A problem that is only a picture shows as this line when editing, so it keeps its place
  const PIC_LINE = '[picture]';
  const keepImg = (np, p) => { if (p && typeof p.img === 'string' && p.img.startsWith('data:image/')) np.img = p.img; return np; };
  const problemsText = probs => { const qs = probs.map(p => p.q || (p.img ? PIC_LINE : '')).filter(Boolean); return qs.join(qs.some(q => q.includes('\n')) ? '\n\n' : '\n'); };
  // Boards live in the browser's storage (about 5 MB in all), and pictures fill it fastest
  let spaceWarned = false;
  function boardSpaceCheck() {
    let n = 0; try { n = (localStorage.getItem('ms.boards') || '').length; } catch (e) { return; }
    if (n > 3500000 && !spaceWarned) { spaceWarned = true; toast('Your boards are nearly filling this browser\'s storage. Delete old boards or pictures you no longer need.'); }
  }
  function mergeBoards(list) {
    const all = getBoards(); let n = 0;
    (Array.isArray(list) ? list : []).forEach(b => {
      if (!b || typeof b.id !== 'string' || typeof b.name !== 'string' || !Array.isArray(b.problems)) return;
      const c = { id: b.id, name: b.name.slice(0, 80), created: +b.created || Date.now(), updated: +b.updated || Date.now(), problems: b.problems.map(p => keepImg({ q: String((p && p.q) || '') }, p)), data: b.data && typeof b.data === 'object' ? b.data : {}, active: +b.active || 0 };
      const i = all.findIndex(x => x.id === c.id); if (i >= 0) all[i] = c; else all.push(c); n++;
    });
    setBoards(all); return n;
  }
  function boardSession(b) {
    const n = b.problems.length;
    return { id: '__board:' + b.id, at: Date.now(), problems: b.problems.map(p => keepImg({ q: p.q || '' }, p)), cursor: n, shown: b.problems.map((_, i) => i), active: n ? Math.min(Math.max(+b.active || 0, 0), n - 1) : -1, data: b.data && typeof b.data === 'object' ? b.data : {} };
  }
  function saveBoard() {
    if (!P || !P.board) return;
    const all = getBoards(), b = all.find(x => x.id === P.board.id); if (!b) return;
    const data = {}; Object.keys(P.sess.data).forEach(k => { const d = Object.assign({}, P.sess.data[k]); delete d.snap; data[k] = d; });
    b.problems = P.sess.problems.map(p => keepImg({ q: p.q || '' }, p)); b.data = data; b.active = P.sess.active; b.updated = Date.now();
    setBoards(all); boardSpaceCheck();
  }
  function boardsPage(editId) {
    if (P && P.board) { clearTimeout(sessT); saveBoard(); }
    P = null; window.onresize = null; document.onkeydown = null;
    document.title = 'Boards · Math Strings';
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    const boards = getBoards().slice().sort((a, b) => (b.updated || b.created || 0) - (a.updated || a.created || 0));
    const dateOf = b => new Date(b.updated || b.created || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const rows = boards.map(b => b.id === editId ? `
        <div class="panel board-edit">
          <label class="field">Board name<input id="be-name" value="${esc(b.name)}" maxlength="60"></label>
          <label class="field">Problems<textarea id="be-text" rows="10">${esc(problemsText(b.problems))}</textarea></label>
          <p class="hint" id="be-count"></p>
          ${b.problems.some(p => p.img) ? `<p class="hint">Pictures stay with their problem when you move it. A problem that is only a picture shows as <b>${PIC_LINE}</b>. Add new pictures on the board itself with 📷.</p>` : ''}
          <div class="ed-head"><button class="btn primary" data-b="save" data-id="${esc(b.id)}">Save changes</button><a class="btn ghost" href="#/board">Cancel</a></div>
        </div>` : `
        <div class="run-row">
          <a class="run-main" href="#/board/${encodeURIComponent(b.id)}"><span class="run-title">${esc(b.name)}</span><span class="run-meta">${b.problems.length} problem${b.problems.length === 1 ? '' : 's'} · ${dateOf(b)}</span></a>
          <span class="run-acts"><a class="btn small primary" href="#/board/${encodeURIComponent(b.id)}">▶ Open</a><a class="btn small" href="#/board/${encodeURIComponent(b.id)}/edit">Edit</a><button class="icon-btn" data-b="del" data-id="${esc(b.id)}" title="Delete this board">🗑</button></span>
        </div>`).join('');
    app.innerHTML = `
    <div class="guide boards-page">
      <div class="ed-head no-print"><a class="btn ghost" href="#/">← Library</a></div>
      <h1>📋 Boards</h1>
      <p class="lead">A clean screen with just the problem and your tools. Paste in a list of problems ahead of time, like a unit test, then move through them in class.</p>
      <div class="panel board-new"${editId ? ' hidden' : ''}>
        <h2>New board</h2>
        <label class="field">Name<input id="nb-name" placeholder="e.g. Unit 2 test" maxlength="60"></label>
        <label class="field">Problems<textarea id="nb-text" rows="8" placeholder="Paste your problems here, one per line.&#10;For longer problems, leave a blank line between them."></textarea></label>
        <label class="board-check"><input type="checkbox" id="nb-strip" checked> Remove question numbers at the start (1.  2)  Q3:)</label>
        <p class="hint" id="nb-count"></p>
        <div class="ed-head"><button class="btn primary" data-b="create">Create and open</button><button class="btn" data-b="blank">Start with an empty board</button></div>
      </div>
      ${boards.length ? `<h2 class="boards-mine">My boards</h2><div class="run-list">${rows}</div>` : ''}
      <p class="hint">To add a picture (a diagram, or a screenshot of the question), open the board and use 📷 or paste it with Ctrl+V. Boards are saved in this browser on this computer. <b>Export</b> (under ☰ More on the library page) includes them. In a board, ← → or Space move between problems, and so does a two-finger swipe on the trackpad. The <b>⋯</b> in the top corner has the other options.</p>
    </div>`;
    window.scrollTo(0, 0);
    const count = (ta, out, strip) => { const el = $(out); if (!el) return; const n = parseProblems($(ta).value, strip).length; el.textContent = n ? `${n} problem${n === 1 ? '' : 's'} found` : ''; };
    if (editId) count('#be-text', '#be-count', false);
    app.oninput = e => { if (e.target.id === 'nb-text') count('#nb-text', '#nb-count', $('#nb-strip').checked); if (e.target.id === 'be-text') count('#be-text', '#be-count', false); };
    app.onchange = e => { if (e.target.id === 'nb-strip') count('#nb-text', '#nb-count', $('#nb-strip').checked); };
    app.onclick = e => {
      const b = e.target.closest('[data-b]'); if (!b) return;
      const all = getBoards();
      if (b.dataset.b === 'create' || b.dataset.b === 'blank') {
        const blank = b.dataset.b === 'blank';
        const qs = blank ? [''] : parseProblems($('#nb-text').value, $('#nb-strip').checked);
        if (!qs.length) { toast('Paste at least one problem first, or start with an empty board.'); return; }
        const nb = { id: newBoardId(), name: ($('#nb-name').value || '').trim() || ('Board ' + today()), created: Date.now(), updated: Date.now(), problems: qs.map(q => ({ q })), data: {}, active: 0 };
        all.push(nb); setBoards(all); go('board/' + encodeURIComponent(nb.id));
      } else if (b.dataset.b === 'del') {
        const t = all.find(x => x.id === b.dataset.id);
        if (t && confirm(`Delete the board “${t.name}”? This can't be undone.`)) { setBoards(all.filter(x => x.id !== t.id)); boardsPage(); toast('Board deleted'); }
      } else if (b.dataset.b === 'save') {
        const t = all.find(x => x.id === b.dataset.id); if (!t) return;
        const qs = parseProblems($('#be-text').value, false);
        if (!qs.length) { toast('A board needs at least one problem.'); return; }
        // keep the work and picture on each problem that is still there, even if it moved
        const old = {}; t.problems.forEach((p, i) => { const k = p.q || (p.img ? PIC_LINE : ''); (old[k] = old[k] || []).push(i); });
        const data = {}, probs = qs.map((q, i) => {
          const j = (old[q] || []).shift();
          if (j == null) return { q };
          if (t.data && t.data[j]) data[i] = t.data[j];
          return keepImg({ q: q === PIC_LINE && !t.problems[j].q ? '' : q }, t.problems[j]);
        });
        t.name = ($('#be-name').value || '').trim() || t.name; t.problems = probs; t.data = data; t.active = Math.min(+t.active || 0, qs.length - 1); t.updated = Date.now();
        setBoards(all); go('board'); toast('Saved');
      }
    };
  }

  function presenter(id, sandbox) {
    const isBoard = String(id).startsWith('__board:');
    const board = isBoard ? getBoards().find(b => b.id === String(id).slice(8)) : null;
    if (isBoard && !board) return go('board');
    const quick = id === '__quick' || !!board;
    sandbox = !!sandbox && !quick;
    const s = quick ? { id, title: board ? board.name : 'Quick board', label: '', tool: 'numberline', problems: [] } : findString(id);
    if (!s) return go('');
    document.title = (s.label ? s.label + ' · ' : '') + s.title;
    P = { s, quick, board, clean: quick && !sandbox && !store.get(board ? 'boardFull' : 'quickFull', false), railOpen: false, sandbox, sess: board ? boardSession(board) : loadSession(id, s, sandbox), pen: null, penColor: '#1d2433', overview: false, activeM: null, spot: null };
    if (quick && !P.sess.problems.length) { P.sess.problems.push({ q: '' }); }
    const firstRun = !P.sess.shown.length;
    if (firstRun) revealNext(true);
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    app.innerHTML = `
      <div class="pres${P.quick ? ' quick' : ''}${P.board ? ' board' : ''}${P.clean ? ' clean' : ''}">
        <div class="topbar">
          ${sandbox ? '<span class="sandbox-tag" title="Practice board: nothing here is saved or marked done">🧪 Practice</span>' : '<button class="icon-btn" data-a="home" title="Back to library">⌂</button>'}
          <button class="icon-btn" data-a="rail" id="rail-btn" title="Show / hide the list of problems (L)">☰</button>
          <div class="title">${s.label ? esc(s.label) + ' · ' : ''}<b>${esc(s.title)}</b></div>
          ${P.quick ? '<button class="btn ghost" data-a="clean" title="Hide this bar and the list: just the problem and your tools">🧼 Clean view</button>' : ''}
          <button class="icon-btn mute-btn" data-a="mute" id="mute-btn"></button>
          <div class="timer idle" id="timer" title="Click to start or pause (T)"><div class="fill"></div><span class="phase"></span><span class="time"></span><button class="tbtn" data-t="play" title="Start / pause">▶</button><button class="tbtn" data-t="skip" title="Skip ahead">⏭</button><button class="tbtn" data-t="reset" title="Reset">↺</button></div>
          <span class="sep"></span>
          <button class="btn ghost" data-a="pick" title="Random name (R)">🎲 Pick</button>
          ${s.problems && s.problems.some(p => p.responses) ? '<button class="btn ghost" data-a="try" id="try-btn" title="Likely student responses for this problem: tap one to draw it (Y)">💡 Try</button>' : ''}
          <button class="btn ghost" data-a="pen" id="pen-btn" title="Pen (P)">✏️ Pen</button>
          <span class="pen-tools hidden" id="pen-tools">
            ${['#1d2433', '#1f5fd1', '#d0461a', '#0d8a55'].map(c => `<button class="swatch" data-color="${c}" style="background:${c}"></button>`).join('')}
            <button class="icon-btn" data-a="erase" id="erase-btn" title="Eraser (E)">⌫</button>
            <button class="icon-btn" data-a="undo" title="Undo (Ctrl+Z)">↶</button>
            <button class="icon-btn" data-a="clear" title="Clear drawing on this problem">🗑</button>
            <button class="btn small" data-a="pen-done" title="Put the pen away (P or Esc)">✓ Done</button>
          </span>
          <button class="btn ghost" data-a="overview" id="ov-btn" title="See the whole string (O)">▦ All</button>
          <button class="btn ghost" data-a="print" title="Print or save as PDF what is on screen: this problem, a spotlighted model, or the whole string (in ▦ All)">🖨</button>
          <span class="sep"></span>
          <button class="btn ghost" data-a="restart" title="Start this string over">↺</button>
          <button class="btn" data-a="prev" title="Back (←)">◀</button>
          <button class="btn hidden" data-a="skipnext" id="skip-btn" title="Skip the next (optional) problem"></button>
          <button class="btn primary" data-a="next" id="next-btn" title="Next (→)">Next ▶</button>
        </div>
        <div class="pres-body">
          <aside class="rail" id="rail"></aside>
          <main class="stage" id="stage"></main>
        </div>
        ${P.quick ? cleanUIHTML() : ''}
      </div>`;
    timer.draw();
    renderAll();
    window.onresize = () => { if (P) renderAll(); };
    $('.topbar').onclick = topbarClick;
    renderMute();
    if (P.quick) {
      const pres = $('.pres');
      pres.addEventListener('click', cleanClick);
      pres.addEventListener('wheel', swipeWheel, { passive: false });
      document.documentElement.style.overscrollBehaviorX = 'none'; // so a two-finger swipe never triggers the browser's Back
    }
    $('#stage').addEventListener('click', stageClick);
    $('#stage').addEventListener('input', stageInput);
    $('#stage').addEventListener('keydown', stageKey);
    $('#rail').onclick = e => { const c = e.target.closest('[data-pos]'); if (c) { finishActive(true); P.sess.active = +c.dataset.pos; P.overview = false; P.spot = null; saveSession(); renderAll(); } };
    document.onkeydown = presKeys;
    if (firstRun && !quick) timer.autoStart(); else timer.reset();
  }

  // The clean screen: edge arrows, a position counter and one small menu. Everything else is hidden.
  function cleanUIHTML() {
    return `<div class="clean-ui">
      <button class="edge-btn edge-prev" data-c="prev" aria-label="Previous problem" title="Previous (←)">‹</button>
      <button class="edge-btn edge-next" data-c="next" aria-label="Next problem" title="Next (→)">›</button>
      <div class="clean-corner">
        <span class="clean-pos" id="clean-pos"></span>
        <button class="corner-btn" data-c="menu" aria-expanded="false" aria-label="Board menu" title="Menu">⋯</button>
        <div class="clean-menu" id="clean-menu" hidden>
          ${P.board ? `<a href="#/board">📋 All my boards</a>
          <a href="#/board/${encodeURIComponent(P.board.id)}/edit">✎ Edit this board's problems</a>
          <button data-c="add">＋ Add a problem</button>` : `<a href="#/">⌂ Back to the library</a>
          <button data-c="add">＋ New problem</button>
          <button data-c="saveboard">📋 Save these problems as a board</button>`}
          <button data-c="rail">☰ Problem list</button>
          <button data-c="pen">✏️ Pen</button>
          <hr>
          <button data-c="clear">${P.board ? '↺ Clear answers and models' : '↺ Clear the board (start fresh)'}</button>
          <button data-c="full">Show all the controls</button>
        </div>
      </div>
    </div>`;
  }
  function renderClean() {
    const S = P.sess, n = S.shown.length;
    const pv = $('.edge-prev'), nx = $('.edge-next'), pos = $('#clean-pos');
    if (pv) pv.hidden = S.active <= 0 || P.overview;
    if (nx) { const end = S.active >= n - 1; nx.hidden = (end && !!P.board) || P.overview; nx.title = end ? 'New problem (→)' : 'Next (→)'; }
    if (pos) pos.textContent = n > 1 ? `${S.active + 1} / ${n}${P.board && S.active === n - 1 ? ' · last one' : ''}` : '';
  }
  function setClean(on) {
    P.clean = on; store.set(P.board ? 'boardFull' : 'quickFull', !on);
    $('.pres').classList.toggle('clean', on);
    const m = $('#clean-menu'); if (m) { m.hidden = true; $('[data-c=menu]').setAttribute('aria-expanded', 'false'); }
    renderAll();
  }
  function quickToBoard() {
    finishActive(true);
    const S = P.sess, keep = S.shown.filter(i => S.problems[i].q || S.problems[i].img);
    if (!keep.length) { toast('Type or paste a problem first.'); return; }
    const name = prompt('Name for this board:', 'Board ' + today()); if (name == null) return;
    const data = {}; keep.forEach((i, j) => { if (S.data[i]) { const d = Object.assign({}, S.data[i]); delete d.snap; data[j] = d; } });
    const nb = { id: newBoardId(), name: name.trim().slice(0, 60) || ('Board ' + today()), created: Date.now(), updated: Date.now(), problems: keep.map(i => keepImg({ q: S.problems[i].q || '' }, S.problems[i])), data, active: 0 };
    const all = getBoards(); all.push(nb); setBoards(all); boardSpaceCheck();
    toast('Saved as a board. Find it under ☰ More → Boards.');
  }
  function addProblem() {
    finishActive(true);
    const S = P.sess; S.problems.push({ q: '' }); S.cursor = S.problems.length; S.shown.push(S.problems.length - 1); S.active = S.shown.length - 1; P.overview = false;
    saveSession(); renderAll(); const q = $('#quick-q'); if (q) q.focus();
  }
  function cleanClick(e) {
    const menu = $('#clean-menu'), mb = $('[data-c=menu]');
    const b = e.target.closest('[data-c]');
    if (!b) { if (menu && !menu.hidden && !e.target.closest('.clean-corner')) { menu.hidden = true; mb.setAttribute('aria-expanded', 'false'); } return; }
    const c = b.dataset.c;
    if (c === 'menu') { menu.hidden = !menu.hidden; mb.setAttribute('aria-expanded', String(!menu.hidden)); return; }
    menu.hidden = true; mb.setAttribute('aria-expanded', 'false');
    if (c === 'prev') goPrev();
    else if (c === 'next') goNext();
    else if (c === 'pen') setPen('draw');
    else if (c === 'rail') { P.railOpen = !P.railOpen; renderRail(); }
    else if (c === 'add') addProblem();
    else if (c === 'full') setClean(false);
    else if (c === 'clear') {
      if (P.board) { if (confirm('Clear all answers, models and drawings on this board? The problems stay.')) { P.sess.data = {}; P.activeM = null; P.spot = null; saveSession(); renderAll(); } }
      else if (confirm('Clear the Quick board? Its problems, models and drawings will be removed.')) { P.sess = newSession(P.s.id, P.s); P.activeM = null; P.spot = null; P.sess.problems.push({ q: '' }); revealNext(true); saveSession(); renderAll(); }
    }
    else if (c === 'saveboard') quickToBoard();
  }
  // A two-finger swipe left or right on the trackpad moves between problems (a swipe's momentum counts once)
  let wheelAcc = 0, wheelLock = false, wheelT = 0;
  function swipeWheel(e) {
    if (!P || !P.quick || P.overview || P.spot != null || $('.picker-back') || $('.modal-back')) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // up and down scrolling is left alone
    e.preventDefault();
    clearTimeout(wheelT); wheelT = setTimeout(() => { wheelLock = false; wheelAcc = 0; }, 180);
    if (wheelLock) return;
    wheelAcc += e.deltaX;
    if (Math.abs(wheelAcc) > 90) { wheelLock = true; const d = wheelAcc; wheelAcc = 0; if (d > 0) goNext(); else goPrev(); }
  }

  function revealNext(silent) {
    const S = P.sess;
    if (S.active < S.shown.length - 1) { S.active++; }
    else if (S.cursor < S.problems.length) { S.shown.push(S.cursor++); S.active = S.shown.length - 1; if (!silent) timer.autoStart(); }
    else if (P.board) { /* the last problem: stay here */ }
    else if (P.quick) { S.problems.push({ q: '' }); S.shown.push(S.cursor++); S.active = S.shown.length - 1; if (!silent) timer.reset(); }
    else { P.overview = true; }
    saveSession();
  }
  function goPrev() { finishActive(true); P.spot = null; if (P.overview) { P.overview = false; } else if (P.sess.active > 0) P.sess.active--; saveSession(); renderAll(); }
  function goNext() { finishActive(true); P.spot = null; if (P.sandbox && P.overview && P.sess.active >= P.sess.shown.length - 1 && P.sess.cursor >= P.sess.problems.length) { P.sess = newSession(P.s.id, P.s); P.overview = false; revealNext(true); store.set(sessKey(true), P.sess); renderAll(); toast('Practice finished. Nothing was saved, so start again any time.'); return; }
    if (!P.quick && P.overview && P.sess.active >= P.sess.shown.length - 1 && P.sess.cursor >= P.sess.problems.length) { markDone(P.s.id); const saved = saveRun(true); clearTimeout(sessT); store.set('session', null); P = null; window.onresize = null; go(''); toast(saved ? '✓ Done. This run is saved in 🗂 My runs' : '✓ Nice! Marked as done'); return; } P.overview = false; revealNext(); renderAll(); }
  function skipNext() { finishActive(true); const S = P.sess; if (S.cursor < S.problems.length) { S.cursor++; S.active = S.shown.length - 1; revealNext(); renderAll(); toast('Skipped the optional problem'); } }

  /* ---- tools shown in the bar (teacher can hide the ones they don't use) ---- */
  const visibleTools = () => TOOLS.filter(t => !Array.isArray(settings.tools) || settings.tools.includes(t.id) || (P && t.id === P.s.tool));
  // The tools a string plans to use: its starting tool, then the tools in its practice responses and "Model:" notes (most used first).
  function suggestedTools(s) {
    const count = {};
    const add = id => { if (TOOL[id]) count[id] = (count[id] || 0) + 1; };
    (s.problems || []).forEach(p => {
      (p.responses || []).forEach(r => add(r.tool));
      String(p.notes || '').split(/Model:/).slice(1).forEach(seg => { const m = seg.match(/^\s*(\w+)/); if (m) add(m[1]); });
    });
    return [s.tool, ...Object.keys(count).filter(id => id !== s.tool).sort((a, b) => count[b] - count[a])].filter(id => TOOL[id]);
  }
  function toolsModal(after) {
    const on = id => !Array.isArray(settings.tools) || settings.tools.includes(id);
    modal('Choose your tools', `
      <p class="hint" style="margin:0">Only the tools you tick show up under the problem. A string's starting tool always shows.</p>
      <label class="tool-sug"><input type="checkbox" id="tp-sug"${settings.suggestFirst === false ? '' : ' checked'}> Show each string's <b>suggested tools</b> first (the rest go under <b>More tools</b>)</label>
      <div class="tool-pick">${TOOLS.map(t => `<label><input type="checkbox" value="${t.id}"${on(t.id) ? ' checked' : ''}> <span class="ico">${t.icon}</span> ${esc(t.name)}</label>`).join('')}</div>
      <div style="display:flex;gap:8px"><button class="btn small" id="tp-all">Tick all</button><button class="btn small" id="tp-none">Untick all</button></div>`,
      [{ label: 'Save', primary: true, run: () => {
        const ids = $$('.tool-pick input:checked').map(i => i.value);
        settings.tools = ids.length === TOOLS.length ? null : ids; settings.suggestFirst = $('#tp-sug').checked; saveSettings(); if (after) after(); toast('Tools updated');
      } }]);
    $('#tp-all').onclick = () => $$('.tool-pick input').forEach(i => (i.checked = true));
    $('#tp-none').onclick = () => $$('.tool-pick input').forEach(i => (i.checked = false));
  }

  /* ---- drawing one model ---- */
  function modelSVG(m) {
    if (m.type === 'text') {
      const lines = String(m.input || '').split(';').map(l => l.trim()).filter(Boolean);
      if (!lines.length) return { html: `<div class="placeholder">Type the student's words or equations below</div>` };
      // long sentences get smaller type and wrap onto more lines instead of being cut off
      const longest = Math.max(...lines.map(l => l.length));
      const fs = longest > 90 ? 26 : longest > 60 ? 30 : longest > 38 ? 34 : 40;
      const perLine = Math.floor(900 / (fs * 0.56));
      const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
      const hgt = Math.ceil(rows * fs * 1.32 + (lines.length - 1) * 6 + 26);
      return { ok: true, w: 940, h: hgt, html: `<svg class="model-svg" viewBox="0 0 940 ${hgt}" xmlns="http://www.w3.org/2000/svg"><foreignObject x="0" y="0" width="940" height="${hgt}"><div xmlns="http://www.w3.org/1999/xhtml" class="words" style="font-size:${fs}px">${lines.map(l => `<div class="wline">${exprHTML(l)}</div>`).join('')}</div></foreignObject></svg>` };
    }
    let r;
    try { r = TOOL[m.type].render(m.input || '', m.labels || {}, m); } catch (e) { r = { error: 'Could not draw that yet' }; }
    if (r.empty) return { html: `<div class="placeholder">Type below to draw</div>` };
    if (r.error) return { html: `<div class="err">${esc(r.error)}</div>` };
    const vb = r.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    return { ok: true, w: vb ? +vb[1] : 940, h: vb ? +vb[2] : 200, html: r.svg };
  }
  function tileHTML(m, i, kind) {
    const r = modelSVG(m), t = TOOL[m.type];
    return `<div class="tile ${kind}${r.ok ? '' : ' msg'}" data-m="${i}" data-w="${r.w || 940}" data-h="${r.h || 120}" style="--mw:${r.w || 940};--mh:${r.h || 120}">
      <div class="tile-body">${r.html}</div>
      ${kind === 'active' ? `<span class="tile-tag now">${t.icon} Now modeling: ${esc(t.name)}</span>` : ''}
      ${kind === 'grid' ? `<span class="tile-tag">${t.icon}</span><span class="tile-btns"><button data-a="editm" title="Change this model">✎</button><button data-a="rmmodel" title="Remove this model">✕</button></span>` : ''}
    </div>`;
  }
  function strokePath(pts) {
    if (!pts.length) return '';
    if (pts.length < 3) return `M${pts[0][0]} ${pts[0][1]} L${pts[pts.length - 1][0] + 0.1} ${pts[pts.length - 1][1]}`;
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; d += ` Q${pts[i][0]} ${pts[i][1]} ${mx.toFixed(1)} ${my.toFixed(1)}`; }
    const l = pts[pts.length - 1]; return d + ` L${l[0]} ${l[1]}`;
  }
  const cur = () => pdata(P.sess.shown[P.sess.active]);

  // Quick board: a long or multi-line question (or one with a picture) gets the full width and smaller text
  const quickWide = prob => !!prob.img || String(prob.q || '').length > 28 || String(prob.q || '').includes('\n');
  function sizeQuickBox() {
    const el = $('#quick-q'); if (!el) return;
    const prob = P.sess.problems[P.sess.shown[P.sess.active]], wide = quickWide(prob);
    el.classList.toggle('long', wide); el.closest('.qbox').classList.toggle('wide', wide);
    const eq = $('#head .eq-mark'); if (eq) eq.hidden = wide;
    el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px';
  }
  // Pictures are shrunk before saving so they fit in the browser's storage
  function shrinkImage(file) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1200 / img.width, 900 / img.height), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        const png = c.toDataURL('image/png');
        res(png.length < 450000 ? png : c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = rej; img.src = URL.createObjectURL(file);
    });
  }
  function addQuickImage(file) {
    if (!P || !P.quick || !file || !/^image\//.test(file.type)) return;
    shrinkImage(file).then(url => { P.sess.problems[P.sess.shown[P.sess.active]].img = url; saveSession(); renderStage(); renderRail(); toast('Picture added'); })
      .catch(() => toast('That picture could not be opened'));
  }
  document.addEventListener('paste', e => {
    if (!P || !P.quick || P.overview || !/^#\/(quick|board\/)/.test(location.hash)) return;
    const f = [...(e.clipboardData ? e.clipboardData.files : [])].find(x => /^image\//.test(x.type));
    if (f) { e.preventDefault(); addQuickImage(f); }
  });
  function headHTML(idx, d) {
    const prob = P.sess.problems[idx];
    const wide = P.quick && quickWide(prob);
    const exprPart = P.quick
      ? `<div class="qbox${wide ? ' wide' : ''}"><textarea class="quick-input${wide ? ' long' : ''}" id="quick-q" rows="1" placeholder="${prob.img ? 'Add a note (optional)' : 'Type or paste a problem…'}">${esc(prob.q)}</textarea>
          ${prob.img ? `<div class="qimg"><img src="${prob.img}" alt="The problem"><button class="icon-btn" data-a="qimg-x" title="Remove the picture">✕</button></div>` : ''}
          <label class="qpic" title="${prob.img ? 'Change the picture' : 'Add a picture of the problem'} (or paste one with Ctrl+V)" aria-label="${prob.img ? 'Change the picture' : 'Add a picture'}">📷<input type="file" accept="image/*" id="quick-file" hidden></label></div>`
      : `<span class="expr">${exprHTML(prob.q) || '<span style="color:var(--faint)">…</span>'}</span>`;
    const answers = d.answers.map((a, i) => `<span class="ans ${a.mark || ''}" data-ans="${i}" title="Click: circle → cross out → plain">${exprHTML(a.t)}</span>`).join('');
    if (P.quick) return exprPart; // Quick board and Boards: just the problem, no = or answers
    return `${exprPart}<span class="eq-mark"${wide ? ' hidden' : ''}>${P.quick ? '=' : eqSym(prob.q)}</span><span class="answers">${answers}</span><span id="ans-slot"></span><button class="add-ans" data-a="addans" title="Add a student answer (A)">＋ answer</button>`;
  }
  function barHTML(d) {
    const am = P.activeM != null ? d.models[P.activeM] : null;
    const pq = P.quick ? '' : ((P.sess.problems[P.sess.shown[P.sess.active]] || {}).q || '');
    const all = visibleTools();
    const t = am && TOOL[am.type];
    // Show the string's suggested tools first and tuck the rest under "More" (only when the string suggests a few).
    const sug = P.quick || settings.suggestFirst === false ? [] : suggestedTools(P.s).map(id => TOOL[id]).filter(x => all.includes(x));
    let main = all, more = [];
    if (sug.length >= 3) { main = sug; if (t && !main.includes(t)) main = [...main, t]; more = all.filter(x => !main.includes(x)); }
    const btn = x => `<button class="tool-btn${x.id === P.s.tool ? ' default' : ''}${am && am.type === x.id ? ' on' : ''}" data-tool="${x.id}" title="${esc(x.name)}${x.key ? ` (${x.key})` : ''}"><span class="ico">${x.icon}</span>${esc(x.short || x.name)}${x.key ? `<kbd class="tk">${x.key}</kbd>` : ''}</button>`;
    const moreHTML = !more.length ? '' : P.moreTools
      ? `<span class="more-sep" title="Other tools"></span>${more.map(btn).join('')}<button class="tool-btn more" data-a="moretools" title="Show only this string's suggested tools">Fewer ▴</button>`
      : `<button class="tool-btn more" data-a="moretools" title="Show all the other tools: ${esc(more.map(x => x.short || x.name).join(', '))}">More tools ▾</button>`;
    return `<div class="bar-tools">${main.map(btn).join('')}${moreHTML}<button class="tool-btn gear" data-a="choosetools" title="Choose which tools show here">⚙</button></div>
      ${am ? `<div class="typer"><span class="typer-name">${t.icon} ${esc(t.short || t.name)}</span><input id="typer" value="${esc(am.input || '')}" placeholder="${esc('e.g. ' + t.help.split('  ·  ')[0].replace(/^Words or math, ; for a new line, e\.g\. /, ''))}" autocomplete="off" spellcheck="false">${am.type === 'text' && !String(am.input || '').trim() && pq ? `<button class="btn small ghost useq" data-a="useq" title="Start with the problem">＋ ${exprHTML(pq)} =</button>` : ''}<button class="btn primary" data-a="donem" title="Finish (Enter)">Done ✓</button><button class="icon-btn" data-a="rmactive" title="Remove this model">🗑</button></div>
      <div class="typer-help">${esc(t.help)}  ·  Enter when done</div>` : ''}`;
  }

  function renderAll() {
    if (!P || !$('#stage')) return;
    renderRail(); renderStage(); renderNav();
  }
  function renderNav() {
    const S = P.sess;
    const atEnd = S.active >= S.shown.length - 1 && S.cursor >= S.problems.length;
    const nb = $('#next-btn');
    nb.textContent = P.quick && atEnd ? 'New problem ▶' : atEnd ? (P.overview ? 'Finish ✓' : 'Wrap-up ▶') : 'Next ▶';
    nb.title = atEnd && P.overview && !P.quick ? 'Back to the library (this run is kept; ↺ starts it fresh)' : 'Next (→)';
    nb.disabled = false;
    if (P.board && atEnd) { nb.textContent = 'Last problem'; nb.disabled = true; }
    $('[data-a=prev]').disabled = S.active <= 0 && !P.overview;
    const nextOpt = S.active >= S.shown.length - 1 && S.cursor < S.problems.length && S.problems[S.cursor].optional;
    const sb = $('#skip-btn'); sb.classList.toggle('hidden', !nextOpt); sb.textContent = `Skip #${S.cursor + 1} (optional)`;
    $('#ov-btn').classList.toggle('on', P.overview);
    $('#rail-btn').classList.toggle('on', settings.rail !== false);
    $('#pen-btn').classList.toggle('on', !!P.pen);
    $('#pen-tools').classList.toggle('hidden', !P.pen);
    $('.pres').classList.toggle('pen-on', !!P.pen);
    if (P.quick) sizeQuickBox(); // the question's box gets narrower or wider with the pen
    $('#erase-btn').classList.toggle('on', P.pen === 'erase');
    $$('.swatch').forEach(b => b.classList.toggle('sel', P.pen === 'draw' && b.dataset.color === P.penColor));
    if (P.quick) renderClean();
  }
  // The left column: a slim, readable list of the string so far
  function renderRail() {
    const rail = $('#rail'), S = P.sess;
    $('.pres-body').classList.toggle('no-rail', P.clean ? !P.railOpen : settings.rail === false); // in the clean view, only the ⋯ menu (or L) opens the list
    rail.innerHTML = S.shown.map((idx, pos) => {
      const d = pdata(idx);
      const circled = d.answers.find(a => a.mark === 'circled');
      const show = circled ? [circled] : d.answers.filter(a => a.mark !== 'crossed');
      return `<div class="rail-item${pos === S.active && !P.overview ? ' active' : ''}" data-pos="${pos}">
        ${P.quick && quickWide(S.problems[idx]) ? `<span class="ri-q ri-text">${S.problems[idx].img && !S.problems[idx].q ? '📷 picture' : esc(String(S.problems[idx].q).replace(/\s+/g, ' ').slice(0, 34)) + (String(S.problems[idx].q).length > 34 ? '…' : '')}</span>` : `<span class="ri-q">${exprHTML(S.problems[idx].q) || '…'}</span>${P.quick ? '' : `<span class="ri-eq">${eqSym(S.problems[idx].q)}</span>`}`}<span class="ri-a">${show.map(a => `<span class="${a.mark || ''}">${exprHTML(a.t)}</span>`).join('<span class="ri-sep">,</span>')}</span>
        ${d.models.length ? `<span class="ri-m" title="${d.models.length} model${d.models.length === 1 ? '' : 's'}">${'•'.repeat(Math.min(d.models.length, 6))}</span>` : ''}
      </div>`;
    }).join('') + (S.cursor < S.problems.length ? `<div class="rail-more">${S.problems.length - S.cursor} more to come</div>` : '');
  }
  const refreshRailCard = () => renderRail();

  function renderStage() {
    const stage = $('#stage'), S = P.sess;
    if (P.overview) { stage.className = 'stage over-mode'; stage.innerHTML = overviewHTML(); return; }
    const idx = S.shown[S.active], d = pdata(idx);
    if (P.activeM != null && !d.models[P.activeM]) P.activeM = null;
    if (P.spot != null && !d.models[P.spot]) P.spot = null;
    const fin = d.models.map((m, i) => [m, i]).filter(([, i]) => i !== P.activeM);
    const strokes = (d.strokes || []).filter(st => st.n).map((st, i) => `<path data-s="${i}" d="${strokePath(st.pts)}" stroke="${st.c}" stroke-width="${st.w || 5}"/>`).join('');
    stage.className = 'stage';
    stage.innerHTML = `
      <div class="head${d.models.length ? ' compact' : ''}" id="head">${headHTML(idx, d)}</div>
      <div class="area" id="area">
        <div class="grid${fin.length ? '' : ' hidden'}" id="grid">${fin.map(([m, i]) => tileHTML(m, i, 'grid')).join('')}</div>
        ${P.activeM != null ? tileHTML(d.models[P.activeM], P.activeM, 'active') : ''}
        ${!d.models.length && !P.quick ? `<div class="area-hint">Pick a tool below to model a student's thinking</div>` : ''}
        ${P.spot != null ? `<div class="spot" data-spot="1">${tileHTML(d.models[P.spot], P.spot, 'spotlit')}<span class="spot-close">Click anywhere to close · Esc</span></div>` : ''}
        <svg class="ink" id="ink" viewBox="0 0 1000 1000" preserveAspectRatio="none">${strokes}</svg>
      </div>
      <div class="bar" id="bar">${barHTML(d)}</div>`;
    layoutArea();
    setupInk();
    if ((d.strokes && d.strokes.length) || d.snap) snapInk();
    renderTry();
    if (P.quick) { sizeQuickBox(); const qf = $('#quick-file'); if (qf) qf.onchange = e => addQuickImage(e.target.files[0]); }
    const ty = $('#typer');
    if (ty && P.focusTyper) { P.focusTyper = false; ty.focus(); ty.setSelectionRange(ty.value.length, ty.value.length); }
  }
  // Fit the finished models into a grid; the one being typed sits big underneath
  function layoutArea() {
    const area = $('#area'); if (!area) return;
    const W = area.clientWidth, H = area.clientHeight, GAP = 10;
    const grid = $('#grid'), act = $('.tile.active', area);
    const tiles = $$('.tile', grid);
    let gridH = H;
    if (act) {
      const aw = +act.dataset.w, ah = +act.dataset.h;
      const want = Math.min(H, (ah / aw) * W + 40);
      const actH = tiles.length ? Math.max(Math.min(want, H * 0.6), H * 0.42) : H;
      act.style.height = actH + 'px';
      gridH = H - actH - GAP;
    }
    if (!tiles.length) return;
    const dims = tiles.map(t => [+t.dataset.w, +t.dataset.h]);
    let best = null;
    for (let c = 1; c <= Math.min(3, tiles.length); c++) {
      const r = Math.ceil(tiles.length / c);
      const tw = (W - (c - 1) * GAP) / c, th = (gridH - (r - 1) * GAP) / r;
      const sc = Math.min(...dims.map(([w, h]) => Math.min((tw - 16) / w, (th - 16) / h)));
      if (!best || sc > best.sc + 0.02) best = { c, r, th, sc };
    }
    grid.style.height = gridH + 'px';
    grid.style.gridTemplateColumns = `repeat(${best.c}, minmax(0, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${best.r}, minmax(0, 1fr))`;
  }

  function overviewHTML() {
    const S = P.sess;
    return `<div class="over-title">${esc(P.s.title)}: the whole string</div>
      <div class="overview">${S.shown.map((idx, pos) => {
        const d = pdata(idx), ms = d.models.filter(m => String(m.input || '').trim());
        return `<div class="ov-card" data-pos="${pos}"><span class="rnum">${idx + 1}</span>
          <div class="ov-head"><span class="expr">${exprHTML(S.problems[idx].q) || '…'}</span><span class="eq-mark">${eqSym(S.problems[idx].q)}</span><span class="answers">${d.answers.map(a => `<span class="ans ${a.mark || ''}">${exprHTML(a.t)}</span>`).join('')}</span></div>
          ${d.snap && (d.strokes || []).some(st => st.n) ? snapHTML(d.snap) : ms.length ? `<div class="ov-models" style="grid-template-columns:repeat(${Math.min(2, ms.length)},minmax(0,1fr))">${ms.map(m => `<div class="ov-tile">${modelSVG(m).html}</div>`).join('')}</div>` : ''}
        </div>`;
      }).join('')}</div>
      <p class="end-note">What did you notice?</p>
      ${P.quick || P.sandbox ? '' : `<div class="run-box">
        <label class="field">Class<input id="run-cls" value="${esc(S.cls || '')}" placeholder="e.g. 6B or Period 2" autocomplete="off"></label>
        <label class="field grow">Your note (optional)<input id="run-note" value="${esc(S.note || '')}" placeholder="What did you notice? e.g. Many used the clock; two added the tops and bottoms" autocomplete="off"></label>
        <button class="btn" data-a="saverun" title="Save a copy now (Finish also saves it)">💾 Save run</button>
        <div class="hint run-hint">${S.runId ? '✓ Saved. Changes are saved again when you press Finish.' : '<b>Finish</b> saves this run automatically. Find it later in 🗂 My runs (on the library page).'}</div>
      </div>`}`;
  }

  /* ---- working with models ---- */
  const drawsOK = (type, input) => { try { const r = TOOL[type].render(input, {}, { input }); return !!r && !r.error; } catch (e) { return false; } };
  function addModel(type) {
    if (P.overview) return;
    finishActive(true);
    const S = P.sess, idx = S.shown[S.active], d = pdata(idx), q = S.problems[idx].q || '';
    let input = '';
    // number line starts blank: students start from different numbers
    if ((type === 'area' || type === 'array') && /[x×*]/.test(q)) input = q.replace(/×|\*/g, 'x');
    if (type === 'area' && /^\s*[\d.]+\s*[\/÷]\s*[\d.]+\s*$/.test(q) && !/^\s*\d+\/\d+\s*$/.test(q)) input = q.replace(/÷/g, '/') + ' = ';
    if (type === 'clock' && /\d\/\d/.test(q) && !/[x×*]|of/i.test(q)) input = q; // the clock adds and subtracts
    const qx = q.replace(/[×*]/g, 'x').replace(/[−–]/g, '-').trim();
    if (type === 'slide' && /^\S+\s*-\s*\S+$/.test(qx)) input = qx + ' = ';
    if (type === 'givetake' && /^\S+\s*\+\s*\S+$/.test(qx)) input = qx + ' = ';
    if (type === 'halve' && /^\d+\s*x\s*\d+$/i.test(qx)) input = qx + ' = ';
    if (type === 'column' && /\d\s*[+\-x×*−]\s*\d/.test(q)) input = qx;
    // Split starts blank, like the number line: filling in the problem drew the whole answer before a student spoke
    if (type === 'estimate' && /^[\d.]+\s*[+\-]\s*[\d.]+/.test(qx)) input = qx;
    // tiles only when negatives are involved; 47 positive tiles for 38 + 9 is no help
    if (type === 'tiles' && /^-?\d+\s*[+\-x]\s*\(?-?\d+\)?$/.test(qx) && /(^-\d)|([+\-x(]\s*-\d)/.test(qx)) input = qx;
    if (type === 'bar' && /^\s*\d+\s*\/\s*\d+\s+of\s+[\d.]+\s*$/i.test(q)) input = q.trim();
    // Words starts blank, so it doesn't suggest one way in; the "+ problem" button adds it in one tap
    // fill in the problem only if this tool can draw it, so a model never starts with an error
    if (input && !drawsOK(type, input)) input = '';
    d.models.push({ type, input, labels: {} });
    P.activeM = d.models.length - 1; P.spot = null; P.focusTyper = true;
    saveSession(); renderStage(); renderRail();
  }
  // "Try a response": the planned student responses for this problem; one tap draws that model.
  function renderTry() {
    const old = $('#try-pop'); if (old) old.remove();
    const btn = $('#try-btn'); if (btn) btn.classList.toggle('on', !!P.tryOpen);
    if (!P || !P.tryOpen || P.overview || P.quick) return;
    const idx = P.sess.shown[P.sess.active], prob = (P.s.problems || [])[idx] || {}, rs = prob.responses || [];
    const pop = h(`<div class="try-pop" id="try-pop" role="dialog" aria-label="Likely student responses">
      <div class="try-head"><b>💡 Likely responses</b><span class="try-q">${exprHTML(prob.q || '')}</span><button class="icon-btn" data-y="close" title="Close (Y or Esc)">✕</button></div>
      ${rs.length ? `<div class="try-list">${rs.map((r, i) => { const t = TOOL[r.tool]; return `<button class="try-item${r.kind === 'error' ? ' err' : ''}" data-y="${i}" title="Draw this with the ${esc(t ? t.name : r.tool)}">
          <span class="try-say">${r.kind === 'error' ? '<span class="tag-err">mistake</span> ' : ''}“${esc(r.say || '')}”</span>
          <span class="try-tool">${t ? t.icon + ' ' + esc(t.short || t.name) : esc(r.tool)} <code>${esc(r.type || '')}</code></span>
          ${r.tip ? `<span class="try-tip">${esc(r.tip)}</span>` : ''}</button>`; }).join('')}</div>`
        : '<p class="hint" style="margin:8px 0">No planned responses for this problem. Model what your students say.</p>'}
      <div class="try-foot">Tap one to draw it. This panel shows on the projector, so close it before students look.</div>
    </div>`);
    pop.onclick = e => {
      const b = e.target.closest('[data-y]'); if (!b) return;
      if (b.dataset.y === 'close') { P.tryOpen = false; renderTry(); return; }
      const r = rs[+b.dataset.y]; if (!r || !TOOL[r.tool]) return;
      finishActive(true);
      cur().models.push({ type: r.tool, input: r.type || '', labels: {} });
      // a planned mistake that is just a number ("3", "2/6") also goes in as a student answer, ready to cross out
      const said = String(r.say || '').trim().replace(/\.$/, '').replace(/-/g, '−');
      if (r.kind === 'error' && /^−?[\d\s.,\/]+$/.test(said) && !cur().answers.some(a => a.t === said)) cur().answers.push({ t: said, mark: '' });
      P.tryOpen = false; P.activeM = null; P.spot = null;
      saveSession(); renderStage(); renderRail();
    };
    $('.pres').appendChild(pop);
  }
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || !P || !P.sandbox || !e.data || !e.data.ms) return;
    const d = e.data, S = P.sess;
    if (typeof d.n === 'number' && d.n >= 0 && d.n < S.problems.length) {
      finishActive(true); P.overview = false; P.spot = null;
      while (!S.shown.includes(d.n) && S.cursor < S.problems.length) S.shown.push(S.cursor++);
      if (!S.shown.includes(d.n)) { S.shown.push(d.n); S.shown.sort((a, b) => a - b); }
      S.active = S.shown.indexOf(d.n);
    }
    if (d.ms === 'draw' && TOOL[d.tool]) {
      cur().models.push({ type: d.tool, input: d.type || '', labels: {} });
      const said = String(d.say || '').trim().replace(/\.$/, '').replace(/-/g, '−');
      if (d.kind === 'error' && /^−?[\d\s.,\/]+$/.test(said) && !cur().answers.some(a => a.t === said)) cur().answers.push({ t: said, mark: '' });
      P.activeM = null;
    }
    saveSession(); renderAll();
  });
  // Done typing: the model shrinks into the grid (an empty one is dropped)
  function finishActive(quiet) {
    if (!P || P.activeM == null) return;
    const d = cur(), m = d.models[P.activeM];
    if (m && !String(m.input || '').trim()) d.models.splice(P.activeM, 1);
    P.activeM = null;
    saveSession();
    if (!quiet) { renderStage(); renderRail(); }
  }
  function editModel(i) {
    const d = cur(), target = d.models[i];
    finishActive(true);
    P.activeM = d.models.indexOf(target); P.spot = null; P.focusTyper = true;
    renderStage();
  }
  function redrawModel(i) {
    saveSession();
    if (i === P.activeM && P.spot == null) {
      const act = $('.tile.active');
      if (act) {
        const r = modelSVG(cur().models[i]);
        $('.tile-body', act).innerHTML = r.html;
        act.dataset.w = r.w || 940; act.dataset.h = r.h || 120;
        act.style.setProperty('--mw', r.w || 940); act.style.setProperty('--mh', r.h || 120);
        act.classList.toggle('msg', !r.ok);
        layoutArea();
        return;
      }
    }
    renderStage();
  }

  /* ---- stage interactions ---- */
  function stageClick(e) {
    if (P.overview) { const c = e.target.closest('[data-pos]'); if (c) { P.sess.active = +c.dataset.pos; P.overview = false; P.activeM = null; saveSession(); renderAll(); } return; }
    if (P.pen) return;
    const d = cur();
    const tb = e.target.closest('[data-tool]');
    if (tb) return addModel(tb.dataset.tool);
    const a = e.target.closest('[data-a]');
    if (a) {
      const tileEl = a.closest('[data-m]'), i = tileEl ? +tileEl.dataset.m : null;
      switch (a.dataset.a) {
        case 'addans': return openAnswerInput();
        case 'choosetools': return toolsModal(() => renderStage());
        case 'moretools': P.moreTools = !P.moreTools; return renderStage();
        case 'qimg-x': { delete P.sess.problems[P.sess.shown[P.sess.active]].img; saveSession(); renderStage(); renderRail(); return; }
        case 'saverun': { const r = saveRun(false); if (r) { toast('💾 Saved in My runs'); renderStage(); } return; }
        case 'donem': return finishActive();
        case 'useq': { const m = cur().models[P.activeM], pq = (P.sess.problems[P.sess.shown[P.sess.active]] || {}).q || ''; if (m && pq) { m.input = pq + ' = ' + (m.input || ''); m.labels = {}; P.focusTyper = true; saveSession(); renderStage(); } return; }
        case 'rmactive': { if (P.activeM != null) { d.models.splice(P.activeM, 1); P.activeM = null; saveSession(); renderStage(); renderRail(); } return; }
        case 'editm': return editModel(i);
        case 'rmmodel': { d.models.splice(i, 1); if (P.activeM != null && P.activeM > i) P.activeM--; saveSession(); renderStage(); renderRail(); return; }
      }
    }
    const ans = e.target.closest('[data-ans]');
    if (ans) {
      const it = d.answers[+ans.dataset.ans];
      it.mark = !it.mark ? 'circled' : it.mark === 'circled' ? 'crossed' : '';
      if (it.mark === '' && e.altKey) d.answers.splice(+ans.dataset.ans, 1);
      saveSession(); renderStage(); renderRail(); return;
    }
    const cell = e.target.closest('.cell-toggle');
    if (cell) {
      const mi = +cell.closest('[data-m]').dataset.m, m = d.models[mi];
      m.hidden = m.hidden || []; const k = cell.dataset.cell;
      m.hidden = m.hidden.includes(k) ? m.hidden.filter(x => x !== k) : [...m.hidden, k];
      if (m.labels) delete m.labels['c' + k];
      return redrawModel(mi);
    }
    const ed = e.target.closest('[data-edit]');
    if (ed) return editLabel(ed);
    if (e.target.closest('[data-spot]')) { P.spot = null; return renderStage(); }
    const gt = e.target.closest('.tile.grid');
    if (gt) { P.spot = +gt.dataset.m; return renderStage(); }
  }
  function stageInput(e) {
    const t = e.target, S = P.sess;
    if (t.id === 'typer' && P.activeM != null) {
      const m = cur().models[P.activeM];
      m.input = t.value; m.labels = {}; m.hidden = [];
      redrawModel(P.activeM);
    }
    if (t.id === 'quick-q') { S.problems[S.shown[S.active]].q = t.value; saveSession(); renderRail(); sizeQuickBox(); }
    if (t.id === 'run-cls') { S.cls = t.value; saveSession(); }
    if (t.id === 'run-note') { S.note = t.value; saveSession(); }
  }
  function stageKey(e) {
    if (e.target.id === 'typer' && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); e.stopPropagation(); finishActive(); return; }
    if (e.key === 'Escape') { e.target.blur(); e.stopPropagation(); }
    if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'quick-q') { e.preventDefault(); e.target.blur(); }
  }
  function openAnswerInput() {
    if (P.overview || $('.ans-input')) { const ex = $('.ans-input'); if (ex) ex.focus(); return; }
    const slot = $('#ans-slot'); if (!slot) return;
    slot.innerHTML = `<input class="ans-input" placeholder="?" autocomplete="off">`;
    const inp = $('input', slot); inp.focus();
    const commit = () => {
      const v = inp.value.trim();
      if (v) { cur().answers.push({ t: v.replace(/-/g, '−'), mark: '' }); saveSession(); }
      renderStage(); renderRail();
    };
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { e.stopPropagation(); renderStage(); } };
    inp.onblur = () => setTimeout(() => { if (document.activeElement !== inp && inp.isConnected) commit(); }, 50);
  }
  function editLabel(el) {
    const mi = +el.closest('[data-m]').dataset.m, m = cur().models[mi], key = el.dataset.edit;
    const r = el.getBoundingClientRect();
    const inp = h(`<input class="label-edit" value="${esc(el.textContent)}">`);
    inp.style.left = Math.max(8, Math.min(window.innerWidth - 280, r.left + r.width / 2 - 130)) + 'px';
    inp.style.top = Math.max(8, r.top - 6) + 'px';
    document.body.appendChild(inp); inp.select();
    let done = false;
    const finish = save => {
      if (done) return; done = true;
      if (save) { m.labels = m.labels || {}; const v = inp.value.trim(); if (v) m.labels[key] = v; else delete m.labels[key]; redrawModel(mi); }
      inp.remove();
    };
    inp.onkeydown = e => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') { e.stopPropagation(); finish(false); } };
    inp.onblur = () => finish(true);
  }

  /* ---- pen: strokes are stored relative to the drawing area (0–1000 both ways) ---- */
  function setupInk() {
    const ink = $('#ink'); if (!ink) return;
    ink.classList.toggle('drawing', P.pen === 'draw');
    ink.classList.toggle('erasing', P.pen === 'erase');
    let curS = null, path = null;
    const pt = e => { const r = ink.getBoundingClientRect(); return [+(((e.clientX - r.left) / r.width) * 1000).toFixed(1), +(((e.clientY - r.top) / r.height) * 1000).toFixed(1)]; };
    const eraseAt = e => {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (t && t.dataset && t.dataset.s != null && ink.contains(t)) {
        const live = cur().strokes.filter(st => st.n), victim = live[+t.dataset.s];
        cur().strokes = cur().strokes.filter(st => st !== victim); saveSession(); renderStage();
      }
    };
    ink.onpointerdown = e => {
      if (!P.pen) return;
      e.preventDefault(); ink.setPointerCapture(e.pointerId);
      if (P.pen === 'erase') { ink._erasing = true; return eraseAt(e); }
      curS = { c: P.penColor, w: 5, n: 1, pts: [pt(e)] };
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('stroke', curS.c); path.setAttribute('stroke-width', curS.w); ink.appendChild(path);
      path.setAttribute('d', strokePath(curS.pts));
    };
    ink.onpointermove = e => {
      if (P.pen === 'erase' && ink._erasing) return eraseAt(e);
      if (!curS) return;
      const p = pt(e), l = curS.pts[curS.pts.length - 1];
      if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 2) return;
      curS.pts.push(p); path.setAttribute('d', strokePath(curS.pts));
    };
    ink.onpointerup = ink.onpointercancel = () => {
      ink._erasing = false;
      if (!curS) return;
      cur().strokes.push(curS); curS = null; path = null; saveSession(); snapInk();
    };
  }
  // A picture of this problem as it looks now (models where they sit, with the pen drawing on top), kept with the run
  function snapInk() {
    const area = $('#area'); if (!P || P.overview || !area) return;
    const d = cur(), live = (d.strokes || []).filter(st => st.n);
    if (!live.length) { if (d.snap) { delete d.snap; saveSession(); } return; }
    const A = area.getBoundingClientRect(); if (!A.width || !A.height) return;
    let inner = '';
    area.querySelectorAll('.tile').forEach(t => {
      if (t.closest('.spot')) return;
      const sv = t.querySelector('svg.model-svg'); if (!sv) return;
      const r = sv.getBoundingClientRect(), c = sv.cloneNode(true);
      [['x', r.left - A.left], ['y', r.top - A.top], ['width', r.width], ['height', r.height]].forEach(([k, v]) => c.setAttribute(k, v.toFixed(1)));
      c.querySelectorAll('[data-edit],[data-cell]').forEach(el => { el.removeAttribute('data-edit'); el.removeAttribute('data-cell'); });
      inner += c.outerHTML;
    });
    inner += `<svg x="0" y="0" width="${A.width.toFixed(1)}" height="${A.height.toFixed(1)}" viewBox="0 0 1000 1000" preserveAspectRatio="none">${live.map(st => `<path d="${strokePath(st.pts)}" stroke="${st.c}" stroke-width="${st.w || 5}" fill="none" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`;
    d.snap = { w: Math.round(A.width), h: Math.round(A.height), svg: inner };
    saveSession();
  }
  const snapHTML = snap => `<div class="snap-wrap"><svg class="snap" viewBox="0 0 ${snap.w} ${snap.h}" xmlns="http://www.w3.org/2000/svg">${snap.svg}</svg><span class="snap-tag">✏️ with pen drawing</span></div>`;
  function setPen(mode) {
    P.pen = P.pen === mode ? null : mode;
    if (P.pen) finishActive();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    renderNav(); setupInk();
  }
  // Print (or Save as PDF) exactly what is on screen, with the string's name and date on top
  function printView() {
    finishActive(true); renderStage();
    const S = P.sess, when = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const what = P.overview ? 'Whole string' : `Problem ${S.shown[S.active] + 1}`;
    const tag = document.createElement('div');
    tag.className = 'print-title';
    tag.textContent = `${P.s.label ? P.s.label + ' · ' : ''}${P.s.title} · ${what} · ${when}`;
    $('#stage').prepend(tag);
    setTimeout(() => { window.print(); tag.remove(); }, 50);
  }
  function undoStroke() { const d = cur(); if (d.strokes.length) { d.strokes.pop(); saveSession(); renderStage(); } }

  function topbarClick(e) {
    const sw = e.target.closest('[data-color]');
    if (sw) { P.penColor = sw.dataset.color; P.pen = 'draw'; renderNav(); setupInk(); return; }
    const t = e.target.closest('[data-t]');
    if (t) { e.stopPropagation(); if (t.dataset.t === 'play') timer.start(); if (t.dataset.t === 'skip') timer.skip(); if (t.dataset.t === 'reset') timer.reset(); return; }
    if (e.target.closest('#timer')) { timer.start(); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    switch (a.dataset.a) {
      case 'home': { const to = P.board ? 'board' : ''; if (P.board) { clearTimeout(sessT); saveBoard(); } P = null; window.onresize = null; go(to); break; }
      case 'clean': setClean(true); break;
      case 'next': goNext(); break;
      case 'prev': goPrev(); break;
      case 'skipnext': skipNext(); break;
      case 'pick': pickerOverlay(false); break;
      case 'pen': setPen('draw'); break;
      case 'mute': settings.chime = !settings.chime; saveSettings(); renderMute(); toast(settings.chime ? 'Chime on' : 'Chime muted'); break;
      case 'pen-done': if (P.pen) setPen(P.pen); break;
      case 'try': P.tryOpen = !P.tryOpen; renderTry(); break;
      case 'erase': setPen('erase'); break;
      case 'undo': undoStroke(); break;
      case 'clear': { const d = cur(); if (d.strokes.length && confirm('Clear the drawing on this problem?')) { d.strokes = []; saveSession(); renderStage(); } break; }
      case 'rail': settings.rail = settings.rail === false; saveSettings(); renderAll(); break;
      case 'print': printView(); break;
      case 'overview': finishActive(true); P.overview = !P.overview; renderAll(); break;
      case 'restart': if (P.board) { if (confirm('Clear all answers, models and drawings on this board? The problems stay.')) { P.sess.data = {}; P.activeM = null; P.spot = null; saveSession(); renderAll(); } break; } if (confirm('Start this string over? Answers and models from this run will be cleared.')) { P.sess = newSession(P.s.id, P.s); P.activeM = null; P.spot = null; if (P.quick) P.sess.problems.push({ q: '' }); revealNext(true); timer.reset(); saveSession(); renderAll(); } break;
    }
  }
  function presKeys(e) {
    if (!P || $('.picker-back') || $('.modal-back')) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoStroke(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === 'n' || k === 'N' || k === ' ') { e.preventDefault(); goNext(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); goPrev(); }
    else if (k === 't' || k === 'T') timer.start();
    else if (k === 'r' || k === 'R') pickerOverlay(false);
    else if (k === 'p' || k === 'P') setPen('draw');
    else if (k === 'm' || k === 'M') { settings.chime = !settings.chime; saveSettings(); renderMute(); toast(settings.chime ? 'Chime on' : 'Chime muted'); }
    else if (k === 'e' || k === 'E') setPen('erase');
    else if (k === 'o' || k === 'O') { finishActive(true); P.overview = !P.overview; renderAll(); }
    else if (k === 'l' || k === 'L') { if (P.clean) { P.railOpen = !P.railOpen; renderRail(); } else { settings.rail = settings.rail === false; saveSettings(); renderAll(); } }
    else if ((k === 'a' || k === 'A') && !P.quick) { e.preventDefault(); openAnswerInput(); }
    else if ((k === 'y' || k === 'Y') && $('#try-btn')) { P.tryOpen = !P.tryOpen; renderTry(); }
    else if (k === 'Escape') { if (P.quick && $('#clean-menu') && !$('#clean-menu').hidden) { $('#clean-menu').hidden = true; } else if (P.tryOpen) { P.tryOpen = false; renderTry(); } else if (P.spot != null) { P.spot = null; renderStage(); } else if (P.pen) setPen(P.pen); else if (P.activeM != null) finishActive(); else if (P.overview) { P.overview = false; renderAll(); } }
    else if (k === '?') helpModal();
    else { const t = visibleTools().find(x => x.key === k); if (t) { e.preventDefault(); addModel(t.id); } }
  }

  /* ================= start ================= */
  loadLibrary().then(() => { ready = true; route(); });
})();
