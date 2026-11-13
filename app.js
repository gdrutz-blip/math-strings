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
  const saveLibrary = () => { store.set('library', library); store.set('deleted', [...deleted]); };

  const uid = () => Math.random().toString(36).slice(2, 9);
  const slug = s => String(s || 'string').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'string';
  const clean = s => { const o = {}; Object.keys(s).forEach(k => { if (k[0] !== '_') o[k] = s[k]; }); return o; };
  const same = (a, b) => JSON.stringify(clean(a)) === JSON.stringify(clean(b));

  function normalizeString(s) {
    const o = Object.assign({ title: 'Untitled string', group: '', label: '', tool: 'numberline', strategy: '', problems: [] }, s);
    if (!o.id) o.id = slug((o.label ? o.label + '-' : '') + o.title) + '-' + uid();
    if (!TOOL[o.tool]) o.tool = 'numberline';
    o.problems = (o.problems || []).map(p => typeof p === 'string' ? splitProblem(p) : ({ q: String(p.q || ''), a: p.a == null ? '' : String(p.a), optional: !!p.optional, notes: p.notes || '' }));
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
    // Add new strings from the site; refresh ones you haven't edited yourself.
    bundled.forEach(b => {
      const i = library.findIndex(s => s.id === b.id);
      if (i < 0) { if (!deleted.has(b.id)) library.push(b); }
      else if (!library[i]._edited && !same(library[i], b)) library[i] = b;
    });
    library = library.map(normalizeString).map((s, i) => Object.assign(s, { _edited: library[i]._edited }));
    saveLibrary();
  }
  const findString = id => library.find(s => s.id === id);

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
  const today = () => new Date().toISOString().slice(0, 10);

  // Pretty math: 3/4 -> stacked fraction, 2^3 -> superscript, - -> −, * -> ×
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
        if (m) { out += op(m[1]); i += m[0].length; continue; }
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
  function route() {
    stopTimerUI();
    const hash = location.hash.replace(/^#\/?/, '');
    const [view, id] = hash.split('/');
    document.onkeydown = null;
    if (view === 'present' && id) return presenter(decodeURIComponent(id));
    if (view === 'quick') return presenter('__quick');
    if (view === 'start') return startPage();
    if (view === 'edit' && id) return editor(decodeURIComponent(id));
    libraryView();
  }
  window.addEventListener('hashchange', route);
  const go = path => { location.hash = '#/' + path; };

  /* ================= library ================= */
  let searchText = '';
  function libraryView() {
    document.title = 'Math Strings';
    const q = searchText.toLowerCase();
    const list = library.filter(s => !q || [s.title, s.label, s.group, s.strategy, ...s.problems.map(p => p.q)].join(' ').toLowerCase().includes(q));
    const groups = [];
    list.forEach(s => { const g = s.group || 'Other strings'; let G = groups.find(x => x.name === g); if (!G) groups.push(G = { name: g, items: [] }); G.items.push(s); });
    app.innerHTML = `
      <div class="lib">
        <div class="lib-head">
          <div class="brand">
            <div class="brand-mark"><svg width="26" height="26" viewBox="0 0 64 64"><path d="M6 46h52" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M12 44 Q24 10 36 44" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M36 44 Q44 28 52 44" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg></div>
            <div><h1>Math Strings</h1><small>${library.length} string${library.length === 1 ? '' : 's'} in your library</small></div>
          </div>
          <div class="lib-tools">
            <button class="btn primary" data-act="new">＋ New string</button>
            <button class="btn" data-act="quick" title="Make up problems as you go">⚡ Quick board</button>
            <button class="btn" data-act="import">⤓ Import</button>
            <button class="btn" data-act="export">⤒ Export</button>
            <button class="btn" data-act="classes">🎲 Classes</button>
            <button class="btn ghost" data-act="settings" title="Settings">⚙︎</button>
            <a class="btn" href="#/start" title="A quick guide for first-time users">📘 Getting started</a>
            <button class="btn ghost" data-act="help" title="Help">?</button>
          </div>
        </div>
        ${store.get('welcomed', false) ? '' : `<div class="welcome"><div><b>Welcome!</b> New to Math Strings? Take 2 minutes with the quick guide before your first string.</div><div class="welcome-btns"><a class="btn primary" href="#/start" data-act="seen">Show me how</a><button class="btn ghost" data-act="dismiss">Hide</button></div></div>`}
        <div class="searchbar"><input id="search" placeholder="Search strings, e.g. “subtraction” or “38 +”" value="${esc(searchText)}"></div>
        <div id="groups">
          ${groups.length ? groups.map(G => `
            <div class="group-title">${esc(G.name)}</div>
            <div class="cards">${G.items.map(cardHTML).join('')}</div>`).join('')
            : `<div class="empty">${library.length ? 'No strings match your search.' : 'Your library is empty. Click <b>New string</b> or <b>Import</b> to add some.'}</div>`}
        </div>
        <a class="guide-card" href="#/start"><span class="gc-ico">📘</span><span><b>New to number strings or this site?</b><br>Read the 5-minute getting started guide: what to do before class, the routine in class, and how to type models.</span><span class="gc-go">Open guide →</span></a>
        <div class="lib-foot">Your edits are saved in this browser. Use <b>Export</b> to take them to another computer.</div>
      </div>`;
    const search = $('#search');
    search.oninput = () => { searchText = search.value; const pos = search.selectionStart; libraryView(); const s2 = $('#search'); s2.focus(); s2.setSelectionRange(pos, pos); };
    app.onclick = e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const id = b.dataset.id, act = b.dataset.act;
      if (act === 'new') { const s = normalizeString({ title: 'New string', problems: [{ q: '', a: '' }] }); s._edited = true; library.unshift(s); saveLibrary(); go('edit/' + encodeURIComponent(s.id)); }
      if (act === 'quick') go('quick');
      if (act === 'import') importModal();
      if (act === 'export') exportAll();
      if (act === 'classes') pickerOverlay(true);
      if (act === 'settings') settingsModal();
      if (act === 'help') helpModal();
      if (act === 'seen') store.set('welcomed', true);
      if (act === 'dismiss') { store.set('welcomed', true); libraryView(); }
      if (act === 'present') go('present/' + encodeURIComponent(id));
      if (act === 'edit') go('edit/' + encodeURIComponent(id));
      if (act === 'dup') { const s = findString(id); const c = normalizeString(JSON.parse(JSON.stringify(clean(s)))); c.id = slug(s.title) + '-' + uid(); c.title = s.title + ' (copy)'; c._edited = true; library.splice(library.indexOf(s) + 1, 0, c); saveLibrary(); libraryView(); toast('Duplicated'); }
      if (act === 'del') { const s = findString(id); if (confirm(`Delete “${s.title}”?`)) { library = library.filter(x => x !== s); deleted.add(id); saveLibrary(); libraryView(); } }
      if (act === 'revert') { const b2 = bundled.find(x => x.id === id); if (b2 && confirm('Replace your edits with the version on the website?')) { library[library.findIndex(x => x.id === id)] = normalizeString(JSON.parse(JSON.stringify(b2))); saveLibrary(); libraryView(); toast('Restored the website version'); } }
    };
  }
  function cardHTML(s) {
    const site = bundled.find(b => b.id === s.id);
    const edited = s._edited && site && !same(s, site);
    return `<div class="card">
      <div class="card-top">${s.label ? `<span class="card-label">${esc(s.label)}</span>` : ''}<h3>${esc(s.title)}</h3></div>
      ${s.strategy ? `<p class="strategy">${esc(s.strategy)}</p>` : ''}
      <div class="chips">${s.problems.map(p => `<span class="chip${p.optional ? ' opt' : ''}" title="${p.optional ? 'Optional' : ''}">${esc(p.q.replace(/-/g, '−'))}</span>`).join('')}</div>
      <div class="card-actions">
        <button class="btn primary" data-act="present" data-id="${esc(s.id)}">▶ Present</button>
        <button class="btn" data-act="edit" data-id="${esc(s.id)}">Edit</button>
        <span class="spacer"></span>
        ${edited ? `<button class="btn small ghost" data-act="revert" data-id="${esc(s.id)}" title="Your copy differs from the website. Click to restore the website version.">↺ site version</button>` : ''}
        <button class="icon-btn" data-act="dup" data-id="${esc(s.id)}" title="Duplicate">⧉</button>
        <button class="icon-btn" data-act="del" data-id="${esc(s.id)}" title="Delete">🗑</button>
      </div>
    </div>`;
  }

  /* ================= editor ================= */
  function editor(id) {
    const s = findString(id);
    if (!s) return go('');
    document.title = 'Edit · ' + s.title;
    let saveT;
    const save = () => { s._edited = true; clearTimeout(saveT); saveT = setTimeout(() => { saveLibrary(); const el = $('#saved'); if (el) { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1200); } }, 300); };
    const groups = [...new Set(library.map(x => x.group).filter(Boolean))];
    const render = () => {
      app.innerHTML = `
      <div class="editor">
        <div class="ed-head">
          <button class="btn ghost" data-act="back">← Library</button>
          <h2>Edit string</h2>
          <span class="saved" id="saved">✓ Saved</span>
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
        s[t.dataset.f] = t.dataset.f === 'watchFor' ? t.value.split('\n').map(x => x.trim()).filter(Boolean) : t.value;
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
          <li><b>Pick a string</b> from the library. They're grouped by grade and week.</li>
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
        <p>Click any label on a drawing (like <b>+10</b>) to replace it with the student's own words. Every other tool (ratio table, area model, array, integer tiles, standard algorithm, and more) shows grey example hints under the typing box.</p>
      </section>

      <section class="panel"><h2>4 · Handy tips</h2>
        <ul class="steps">
          <li><b>Click a model</b> to show it full-screen. Hover over it to ✎ change or ✕ remove it.</li>
          <li><b>🎲 Pick</b> chooses a random student. Add your class list the first time; names stay only on your computer.</li>
          <li><b>⏱ Timer:</b> click it (or press <kbd>T</kbd>) to start or pause think time.</li>
          <li><b>✏️ Pen</b> draws on top of anything. <kbd>Esc</kbd> stops.</li>
          <li><kbd>L</kbd> hides the problem list on the left for more room. <kbd>O</kbd> shows the whole string.</li>
          <li>Everything is saved <b>in this browser on this computer</b>. There are no accounts and nothing is uploaded.</li>
        </ul>
      </section>

      <section class="panel"><h2>Keyboard</h2>
        <div class="keys">
          <kbd>→</kbd><span>next problem</span><kbd>←</kbd><span>back</span><kbd>A</kbd><span>add a student answer</span>
          <kbd>1</kbd><span>number line (other number keys add other tools)</span><kbd>Enter</kbd><span>finish the model you're typing</span>
          <kbd>T</kbd><span>timer</span><kbd>R</kbd><span>random name</span><kbd>O</kbd><span>whole string</span><kbd>L</kbd><span>problem list</span>
          <kbd>P</kbd><span>pen</span><kbd>Esc</kbd><span>stop / close</span><kbd>?</kbd><span>all keys</span>
        </div>
      </section>

      <p class="hint">Need a different string? Ask the teacher who shared this site with you. New strings can be added to the library for everyone.</p>
      <div class="no-print" style="text-align:center;margin:26px 0"><a class="btn primary" href="#/">Go to the library and try a string →</a></div>
    </div>`;
    window.scrollTo(0, 0);
  }

  function helpModal() {
    modal('How it works', `
      <div><b>Presenting.</b> Click <b>▶ Present</b> on a string. Problems appear one at a time and earlier ones shrink into the column on the left so the whole string stays visible.</div>
      <div><b>Recording answers.</b> Click <b>＋ answer</b> (or press <kbd>A</kbd>) and type what a student says, even if it is wrong. Click an answer to circle it, click again to cross it out.</div>
      <div><b>Modeling.</b> Pick a tool at the bottom and type in the box there. The drawing appears big while you type; press <kbd>Enter</kbd> and it shrinks into the grid so every student's model fits on one screen. Click a model to spotlight it; ✎ changes it. Click any label on a drawing to use the student's words. ⚙ chooses which tools show. Press <kbd>P</kbd> for the pen.</div>
      <div class="keys">
        <kbd>→</kbd><span>Next problem (also Page Down, so a presentation clicker works)</span>
        <kbd>←</kbd><span>Back</span>
        <kbd>T</kbd><span>Start / pause the timer</span>
        <kbd>R</kbd><span>Random name picker</span>
        <kbd>A</kbd><span>Add a student answer</span>
        <kbd>1</kbd>–<kbd>0</kbd><span>Add a model: 1 number line, 2 ratio, 3 area, 4 array, 5 double line, 6 clock, 7 bar, 8 words, 9 slide, 0 give &amp; take</span>
        <kbd>P</kbd> / <kbd>E</kbd><span>Pen / eraser</span>
        <kbd>L</kbd><span>Show / hide the list of problems on the left</span>
        <kbd>O</kbd><span>Overview of the whole string (for the wrap-up). At the end, Next becomes Wrap-up, then Finish takes you back to the library.</span>
        <kbd>Esc</kbd><span>Stop typing or drawing</span>
      </div>
      <div><b>Adding strings with Claude.</b> Copy the instructions below into your planning chat. Claude will make a <code>.json</code> file you can bring in with <b>Import</b>.</div>
      <button class="btn" id="copy-fmt">📋 Copy instructions for Claude</button>`, [], { wide: true });
    $('#copy-fmt').onclick = () => { navigator.clipboard.writeText(CLAUDE_FORMAT).then(() => toast('Copied. Paste it into your planning chat.'), () => toast('Copy failed')); };
  }

  function exportAll() {
    download(`math-strings-${today()}.json`, JSON.stringify({ version: 1, exported: today(), strings: library.map(clean) }, null, 2));
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
        s._edited = true; deleted.delete(s.id);
        const i = library.findIndex(x => x.id === s.id);
        if (i >= 0) { library[i] = s; updated++; } else { library.push(s); added++; }
      });
      saveLibrary(); libraryView();
      m.close();
      toast(`Imported: ${added} new${updated ? `, ${updated} updated` : ''}`);
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
  function loadSession(id, s) {
    const saved = store.get('session', null);
    const fresh = saved && saved.id === id && Date.now() - saved.at < 8 * 3600e3;
    if (fresh && (id === '__quick' || JSON.stringify(saved.problems.map(p => p.q)) === JSON.stringify(s.problems.map(p => p.q)))) return saved;
    return newSession(id, s);
  }
  let sessT;
  const saveSession = () => { clearTimeout(sessT); sessT = setTimeout(() => { if (P) { P.sess.at = Date.now(); store.set('session', P.sess); } }, 250); };
  const pdata = idx => (P.sess.data[idx] = P.sess.data[idx] || { answers: [], models: [], strokes: [] });

  function presenter(id) {
    const quick = id === '__quick';
    const s = quick ? { id, title: 'Quick board', label: '', tool: 'numberline', problems: [] } : findString(id);
    if (!s) return go('');
    document.title = (s.label ? s.label + ' · ' : '') + s.title;
    P = { s, quick, sess: loadSession(id, s), pen: null, penColor: '#1d2433', overview: false, activeM: null, spot: null };
    if (quick && !P.sess.problems.length) { P.sess.problems.push({ q: '' }); }
    const firstRun = !P.sess.shown.length;
    if (firstRun) revealNext(true);
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    app.innerHTML = `
      <div class="pres">
        <div class="topbar">
          <button class="icon-btn" data-a="home" title="Back to library">⌂</button>
          <button class="icon-btn" data-a="rail" id="rail-btn" title="Show / hide the list of problems (L)">☰</button>
          <div class="title">${s.label ? esc(s.label) + ' · ' : ''}<b>${esc(s.title)}</b></div>
          <div class="timer idle" id="timer" title="Click to start or pause (T)"><div class="fill"></div><span class="phase"></span><span class="time"></span><button class="tbtn" data-t="play" title="Start / pause">▶</button><button class="tbtn" data-t="skip" title="Skip ahead">⏭</button><button class="tbtn" data-t="reset" title="Reset">↺</button></div>
          <span class="sep"></span>
          <button class="btn ghost" data-a="pick" title="Random name (R)">🎲 Pick</button>
          <button class="btn ghost" data-a="pen" id="pen-btn" title="Pen (P)">✏️ Pen</button>
          <span class="pen-tools hidden" id="pen-tools">
            ${['#1d2433', '#1f5fd1', '#d0461a', '#0d8a55'].map(c => `<button class="swatch" data-color="${c}" style="background:${c}"></button>`).join('')}
            <button class="icon-btn" data-a="erase" id="erase-btn" title="Eraser (E)">⌫</button>
            <button class="icon-btn" data-a="undo" title="Undo (Ctrl+Z)">↶</button>
            <button class="icon-btn" data-a="clear" title="Clear drawing on this problem">🗑</button>
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
      </div>`;
    timer.draw();
    renderAll();
    window.onresize = () => { if (P) renderAll(); };
    $('.topbar').onclick = topbarClick;
    $('#stage').addEventListener('click', stageClick);
    $('#stage').addEventListener('input', stageInput);
    $('#stage').addEventListener('keydown', stageKey);
    $('#rail').onclick = e => { const c = e.target.closest('[data-pos]'); if (c) { finishActive(true); P.sess.active = +c.dataset.pos; P.overview = false; P.spot = null; saveSession(); renderAll(); } };
    document.onkeydown = presKeys;
    if (firstRun && !quick) timer.autoStart(); else timer.reset();
  }

  function revealNext(silent) {
    const S = P.sess;
    if (S.active < S.shown.length - 1) { S.active++; }
    else if (S.cursor < S.problems.length) { S.shown.push(S.cursor++); S.active = S.shown.length - 1; if (!silent) timer.autoStart(); }
    else if (P.quick) { S.problems.push({ q: '' }); S.shown.push(S.cursor++); S.active = S.shown.length - 1; if (!silent) timer.reset(); }
    else { P.overview = true; }
    saveSession();
  }
  function goPrev() { finishActive(true); P.spot = null; if (P.overview) { P.overview = false; } else if (P.sess.active > 0) P.sess.active--; saveSession(); renderAll(); }
  function goNext() { finishActive(true); P.spot = null; if (!P.quick && P.overview && P.sess.active >= P.sess.shown.length - 1 && P.sess.cursor >= P.sess.problems.length) { P = null; window.onresize = null; go(''); return; } P.overview = false; revealNext(); renderAll(); }
  function skipNext() { finishActive(true); const S = P.sess; if (S.cursor < S.problems.length) { S.cursor++; S.active = S.shown.length - 1; revealNext(); renderAll(); toast('Skipped the optional problem'); } }

  /* ---- tools shown in the bar (teacher can hide the ones they don't use) ---- */
  const visibleTools = () => TOOLS.filter(t => !Array.isArray(settings.tools) || settings.tools.includes(t.id) || (P && t.id === P.s.tool));
  function toolsModal(after) {
    const on = id => !Array.isArray(settings.tools) || settings.tools.includes(id);
    modal('Choose your tools', `
      <p class="hint" style="margin:0">Only the tools you tick show up under the problem. A string's starting tool always shows.</p>
      <div class="tool-pick">${TOOLS.map(t => `<label><input type="checkbox" value="${t.id}"${on(t.id) ? ' checked' : ''}> <span class="ico">${t.icon}</span> ${esc(t.name)}</label>`).join('')}</div>
      <div style="display:flex;gap:8px"><button class="btn small" id="tp-all">Tick all</button><button class="btn small" id="tp-none">Untick all</button></div>`,
      [{ label: 'Save', primary: true, run: () => {
        const ids = $$('.tool-pick input:checked').map(i => i.value);
        settings.tools = ids.length === TOOLS.length ? null : ids; saveSettings(); if (after) after(); toast('Tools updated');
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

  function headHTML(idx, d) {
    const prob = P.sess.problems[idx];
    const exprPart = P.quick
      ? `<input class="quick-input" id="quick-q" value="${esc(prob.q)}" placeholder="Type a problem…">`
      : `<span class="expr">${exprHTML(prob.q) || '<span style="color:var(--faint)">…</span>'}</span>`;
    const answers = d.answers.map((a, i) => `<span class="ans ${a.mark || ''}" data-ans="${i}" title="Click: circle → cross out → plain">${exprHTML(a.t)}</span>`).join('');
    return `${exprPart}<span class="eq-mark">=</span><span class="answers">${answers}</span><span id="ans-slot"></span><button class="add-ans" data-a="addans" title="Add a student answer (A)">＋ answer</button>`;
  }
  function barHTML(d) {
    const am = P.activeM != null ? d.models[P.activeM] : null;
    const tools = visibleTools();
    const t = am && TOOL[am.type];
    return `<div class="bar-tools">${tools.map(x => `<button class="tool-btn${x.id === P.s.tool ? ' default' : ''}${am && am.type === x.id ? ' on' : ''}" data-tool="${x.id}" title="${esc(x.name)}${x.key ? ` (${x.key})` : ''}"><span class="ico">${x.icon}</span>${esc(x.short || x.name)}</button>`).join('')}<button class="tool-btn gear" data-a="choosetools" title="Choose which tools show here">⚙</button></div>
      ${am ? `<div class="typer"><span class="typer-name">${t.icon} ${esc(t.short || t.name)}</span><input id="typer" value="${esc(am.input || '')}" placeholder="${esc(t.help.split('  ·  ')[0])}" autocomplete="off" spellcheck="false"><button class="btn primary" data-a="donem" title="Finish (Enter)">Done ✓</button><button class="icon-btn" data-a="rmactive" title="Remove this model">🗑</button></div>
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
    $('[data-a=prev]').disabled = S.active <= 0 && !P.overview;
    const nextOpt = S.active >= S.shown.length - 1 && S.cursor < S.problems.length && S.problems[S.cursor].optional;
    const sb = $('#skip-btn'); sb.classList.toggle('hidden', !nextOpt); sb.textContent = `Skip #${S.cursor + 1} (optional)`;
    $('#ov-btn').classList.toggle('on', P.overview);
    $('#rail-btn').classList.toggle('on', settings.rail !== false);
    $('#pen-btn').classList.toggle('on', !!P.pen);
    $('#pen-tools').classList.toggle('hidden', !P.pen);
    $('#erase-btn').classList.toggle('on', P.pen === 'erase');
    $$('.swatch').forEach(b => b.classList.toggle('sel', P.pen === 'draw' && b.dataset.color === P.penColor));
  }
  // The left column: a slim, readable list of the string so far
  function renderRail() {
    const rail = $('#rail'), S = P.sess;
    $('.pres-body').classList.toggle('no-rail', settings.rail === false);
    rail.innerHTML = S.shown.map((idx, pos) => {
      const d = pdata(idx);
      const circled = d.answers.find(a => a.mark === 'circled');
      const show = circled ? [circled] : d.answers.filter(a => a.mark !== 'crossed');
      return `<div class="rail-item${pos === S.active && !P.overview ? ' active' : ''}" data-pos="${pos}">
        <span class="ri-q">${exprHTML(S.problems[idx].q) || '…'}</span><span class="ri-eq">=</span><span class="ri-a">${show.map(a => `<span class="${a.mark || ''}">${exprHTML(a.t)}</span>`).join('<span class="ri-sep">,</span>')}</span>
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
        ${!d.models.length ? `<div class="area-hint">Pick a tool below to model a student's thinking</div>` : ''}
        ${P.spot != null ? `<div class="spot" data-spot="1">${tileHTML(d.models[P.spot], P.spot, 'spotlit')}<span class="spot-close">Click anywhere to close · Esc</span></div>` : ''}
        <svg class="ink" id="ink" viewBox="0 0 1000 1000" preserveAspectRatio="none">${strokes}</svg>
      </div>
      <div class="bar" id="bar">${barHTML(d)}</div>`;
    layoutArea();
    setupInk();
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
          <div class="ov-head"><span class="expr">${exprHTML(S.problems[idx].q) || '…'}</span><span class="eq-mark">=</span><span class="answers">${d.answers.map(a => `<span class="ans ${a.mark || ''}">${exprHTML(a.t)}</span>`).join('')}</span></div>
          ${ms.length ? `<div class="ov-models" style="grid-template-columns:repeat(${Math.min(2, ms.length)},minmax(0,1fr))">${ms.map(m => `<div class="ov-tile">${modelSVG(m).html}</div>`).join('')}</div>` : ''}
        </div>`;
      }).join('')}</div>
      <p class="end-note">What did you notice?</p>`;
  }

  /* ---- working with models ---- */
  function addModel(type) {
    if (P.overview) return;
    finishActive(true);
    const S = P.sess, idx = S.shown[S.active], d = pdata(idx), q = S.problems[idx].q || '';
    let input = '';
    // number line starts blank: students start from different numbers
    if ((type === 'area' || type === 'array') && /[x×*]/.test(q)) input = q.replace(/×|\*/g, 'x');
    if (type === 'clock' && /\d\/\d/.test(q)) input = q;
    const qx = q.replace(/[×*]/g, 'x').replace(/[−–]/g, '-').trim();
    if (type === 'slide' && /^\S+\s*-\s*\S+$/.test(qx)) input = qx + ' = ';
    if (type === 'givetake' && /^\S+\s*\+\s*\S+$/.test(qx)) input = qx + ' = ';
    if (type === 'halve' && /^\S+\s*x\s*\S+$/i.test(qx)) input = qx + ' = ';
    if (type === 'column' && /\d\s*[+\-x×*−]\s*\d/.test(q)) input = qx;
    if ((type === 'split' || type === 'estimate') && /^\d+\s*[+\-]\s*\d+/.test(qx)) input = qx;
    if (type === 'tiles' && /^-?\d+\s*[+\-x]\s*\(?-?\d+\)?$/.test(qx)) input = qx;
    if (type === 'text' && /[x×*]|\d\/\d/.test(q)) input = q + ' = ';
    d.models.push({ type, input, labels: {} });
    P.activeM = d.models.length - 1; P.spot = null; P.focusTyper = true;
    saveSession(); renderStage(); renderRail();
  }
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
        case 'donem': return finishActive();
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
    if (t.id === 'quick-q') { S.problems[S.shown[S.active]].q = t.value; saveSession(); renderRail(); }
  }
  function stageKey(e) {
    if (e.target.id === 'typer' && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); e.stopPropagation(); finishActive(); return; }
    if (e.key === 'Escape') { e.target.blur(); e.stopPropagation(); }
    if (e.key === 'Enter' && e.target.id === 'quick-q') e.target.blur();
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
      cur().strokes.push(curS); curS = null; path = null; saveSession();
    };
  }
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
      case 'home': P = null; window.onresize = null; go(''); break;
      case 'next': goNext(); break;
      case 'prev': goPrev(); break;
      case 'skipnext': skipNext(); break;
      case 'pick': pickerOverlay(false); break;
      case 'pen': setPen('draw'); break;
      case 'erase': setPen('erase'); break;
      case 'undo': undoStroke(); break;
      case 'clear': { const d = cur(); if (d.strokes.length && confirm('Clear the drawing on this problem?')) { d.strokes = []; saveSession(); renderStage(); } break; }
      case 'rail': settings.rail = settings.rail === false; saveSettings(); renderAll(); break;
      case 'print': printView(); break;
      case 'overview': finishActive(true); P.overview = !P.overview; renderAll(); break;
      case 'restart': if (confirm('Start this string over? Answers and models from this run will be cleared.')) { P.sess = newSession(P.s.id, P.s); P.activeM = null; P.spot = null; if (P.quick) P.sess.problems.push({ q: '' }); revealNext(true); timer.reset(); saveSession(); renderAll(); } break;
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
    else if (k === 'e' || k === 'E') setPen('erase');
    else if (k === 'o' || k === 'O') { finishActive(true); P.overview = !P.overview; renderAll(); }
    else if (k === 'l' || k === 'L') { settings.rail = settings.rail === false; saveSettings(); renderAll(); }
    else if (k === 'a' || k === 'A') { e.preventDefault(); openAnswerInput(); }
    else if (k === 'Escape') { if (P.spot != null) { P.spot = null; renderStage(); } else if (P.pen) setPen(P.pen); else if (P.activeM != null) finishActive(); else if (P.overview) { P.overview = false; renderAll(); } }
    else if (k === '?') helpModal();
    else { const t = visibleTools().find(x => x.key === k); if (t) { e.preventDefault(); addModel(t.id); } }
  }

  /* ================= start ================= */
  loadLibrary().then(route);
})();
