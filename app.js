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
            <button class="btn ghost" data-act="help" title="Help">?</button>
          </div>
        </div>
        <div class="searchbar"><input id="search" placeholder="Search strings, e.g. “subtraction” or “38 +”" value="${esc(searchText)}"></div>
        <div id="groups">
          ${groups.length ? groups.map(G => `
            <div class="group-title">${esc(G.name)}</div>
            <div class="cards">${G.items.map(cardHTML).join('')}</div>`).join('')
            : `<div class="empty">${library.length ? 'No strings match your search.' : 'Your library is empty. Click <b>New string</b> or <b>Import</b> to add some.'}</div>`}
        </div>
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
      <label><input type="checkbox" id="st-chime"${settings.chime ? ' checked' : ''}> Soft chime when time is up</label>`,
      [{ label: 'Save', primary: true, run: () => {
        settings.think = Math.max(0, +$('#st-think').value || 0); settings.talk = Math.max(0, +$('#st-talk').value || 0);
        settings.autoTimer = $('#st-auto').checked; settings.chime = $('#st-chime').checked; saveSettings(); timer.reset(); toast('Settings saved');
      } }]);
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

  function helpModal() {
    modal('How it works', `
      <div><b>Presenting.</b> Click <b>▶ Present</b> on a string. Problems appear one at a time and earlier ones shrink into the column on the left so the whole string stays visible.</div>
      <div><b>Recording answers.</b> Click <b>＋ answer</b> (or press <kbd>A</kbd>) and type what a student says, even if it is wrong. Click an answer to circle it, click again to cross it out.</div>
      <div><b>Modeling.</b> Pick a tool under the problem and type into its box. The drawing updates as you type. Click any label on a drawing to replace it with the student's words. Press <kbd>P</kbd> for the pen to draw on top of anything.</div>
      <div class="keys">
        <kbd>→</kbd><span>Next problem (also Page Down, so a presentation clicker works)</span>
        <kbd>←</kbd><span>Back</span>
        <kbd>T</kbd><span>Start / pause the timer</span>
        <kbd>R</kbd><span>Random name picker</span>
        <kbd>A</kbd><span>Add a student answer</span>
        <kbd>1</kbd>–<kbd>0</kbd><span>Add a model: 1 number line, 2 ratio, 3 area, 4 array, 5 double line, 6 clock, 7 bar, 8 words, 9 slide, 0 give &amp; take</span>
        <kbd>P</kbd> / <kbd>E</kbd><span>Pen / eraser</span>
        <kbd>O</kbd><span>Overview of the whole string (for the wrap-up)</span>
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
    P = { s, quick, sess: loadSession(id, s), pen: null, penColor: '#1d2433', overview: false };
    if (quick && !P.sess.problems.length) { P.sess.problems.push({ q: '' }); }
    const firstRun = !P.sess.shown.length;
    if (firstRun) revealNext(true);
    app.onclick = app.oninput = app.onchange = app.onkeydown = null;
    app.innerHTML = `
      <div class="pres">
        <div class="topbar">
          <button class="icon-btn" data-a="home" title="Back to library">⌂</button>
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
    $('#stage').addEventListener('focusout', stageBlur);
    $('#rail').onclick = e => { const c = e.target.closest('[data-pos]'); if (c) { P.sess.active = +c.dataset.pos; P.overview = false; saveSession(); renderAll(); } };
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
  function goPrev() { if (P.overview) { P.overview = false; } else if (P.sess.active > 0) P.sess.active--; saveSession(); renderAll(); }
  function goNext() { if (P.overview && P.sess.active >= P.sess.shown.length - 1 && P.sess.cursor >= P.sess.problems.length) return; P.overview = false; revealNext(); renderAll(); }
  function skipNext() { const S = P.sess; if (S.cursor < S.problems.length) { S.cursor++; S.active = S.shown.length - 1; revealNext(); renderAll(); toast('Skipped the optional problem'); } }

  function boardHTML(pos, mode) {
    const S = P.sess, idx = S.shown[pos], prob = S.problems[idx], d = pdata(idx), main = mode === 'main';
    const exprPart = P.quick && main
      ? `<input class="quick-input" id="quick-q" value="${esc(prob.q)}" placeholder="Type a problem…">`
      : `<span class="expr">${exprHTML(prob.q) || '<span style="color:var(--faint)">…</span>'}</span>`;
    const answers = d.answers.map((a, i) => `<span class="ans ${a.mark || ''}" data-ans="${i}" title="Click: circle → cross out → plain">${exprHTML(a.t)}</span>`).join('');
    const strokes = d.strokes.map((st, i) => `<path data-s="${i}" d="${strokePath(st.pts)}" stroke="${st.c}" stroke-width="${st.w || 5}"/>`).join('');
    const maxY = d.strokes.reduce((m, st) => Math.max(m, ...st.pts.map(p => p[1])), 0);
    return `<div class="board ${main ? 'main' : 'thumb'}" data-idx="${idx}" style="${mode === 'thumb' && maxY ? `min-height:${maxY + 12}px` : ''}">
      <div class="prob-head">${exprPart}<span class="eq-mark${d.answers.length ? '' : ' wait'}">=</span><span class="answers">${answers}</span>${main ? `<span id="ans-slot"></span><button class="add-ans" data-a="addans" title="Add a student answer (A)">＋ answer</button>` : ''}</div>
      ${main ? `<div class="add-row"><span class="lbl">Model:</span>${TOOLS.map(t => `<button class="tool-btn${t.id === P.s.tool ? ' default' : ''}" data-tool="${t.id}" title="${t.name}${t.key ? ` (${t.key})` : ''}"><span class="ico">${t.icon}</span>${t.short || t.name}</button>`).join('')}</div>` : ''}
      <div class="models">${d.models.map((m, i) => modelHTML(m, i, main)).join('')}</div>
      <svg class="ink" id="${main ? 'ink' : ''}">${strokes}</svg>
    </div>`;
  }
  function modelHTML(m, i, main) {
    const t = TOOL[m.type];
    const empty = !String(m.input || '').trim();
    return `<div class="model${empty ? ' is-empty' : ''}" data-m="${i}">
      <div class="model-head"><span class="mname">${t.icon} ${t.name}</span><input data-min="${i}" value="${esc(m.input || '')}" placeholder="${esc(t.help.split('  ·  ')[0])}" autocomplete="off" spellcheck="false"><button class="icon-btn" data-a="rmmodel" title="Remove this model">✕</button></div>
      ${main ? `<div class="model-help">${esc(t.help)}</div>` : ''}
      <div class="model-out">${modelOut(m)}</div>
    </div>`;
  }
  function modelOut(m) {
    if (m.type === 'text') {
      const lines = String(m.input || '').split(';').map(l => l.trim()).filter(Boolean);
      return lines.length ? `<div class="words">${lines.map(l => `<div class="wline">${exprHTML(l)}</div>`).join('')}</div>` : `<div class="words empty placeholder">Type the student's words or equations above</div>`;
    }
    let r;
    try { r = TOOL[m.type].render(m.input || '', m.labels || {}, m); } catch (e) { r = { error: 'Could not draw that yet' }; }
    if (r.empty) return `<div class="placeholder">Type above to draw</div>`;
    if (r.error) return `<div class="err">${esc(r.error)}</div>`;
    return r.svg;
  }
  function strokePath(pts) {
    if (!pts.length) return '';
    if (pts.length < 3) return `M${pts[0][0]} ${pts[0][1]} L${pts[pts.length - 1][0] + 0.1} ${pts[pts.length - 1][1]}`;
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; d += ` Q${pts[i][0]} ${pts[i][1]} ${mx.toFixed(1)} ${my.toFixed(1)}`; }
    const l = pts[pts.length - 1]; return d + ` L${l[0]} ${l[1]}`;
  }

  function renderAll() {
    if (!P || !$('#stage')) return;
    renderRail(); renderStage(); renderNav();
  }
  function renderNav() {
    const S = P.sess;
    const atEnd = S.active >= S.shown.length - 1 && S.cursor >= S.problems.length;
    const nb = $('#next-btn');
    nb.textContent = P.quick && atEnd ? 'New problem ▶' : atEnd ? (P.overview ? 'Done' : 'Wrap-up ▶') : 'Next ▶';
    nb.disabled = atEnd && P.overview && !P.quick;
    $('[data-a=prev]').disabled = S.active <= 0 && !P.overview;
    const nextOpt = S.active >= S.shown.length - 1 && S.cursor < S.problems.length && S.problems[S.cursor].optional;
    const sb = $('#skip-btn'); sb.classList.toggle('hidden', !nextOpt); sb.textContent = `Skip #${S.cursor + 1} (optional)`;
    $('#ov-btn').classList.toggle('on', P.overview);
    $('#pen-btn').classList.toggle('on', !!P.pen);
    $('#pen-tools').classList.toggle('hidden', !P.pen);
    $('#erase-btn').classList.toggle('on', P.pen === 'erase');
    $$('.swatch').forEach(b => b.classList.toggle('sel', P.pen === 'draw' && b.dataset.color === P.penColor));
  }
  function renderRail() {
    const rail = $('#rail'), S = P.sess;
    const w = rail.clientWidth - 20 - 18;
    const z = Math.max(0.12, w / 1000);
    rail.innerHTML = S.shown.map((idx, pos) => `<div class="rail-card${pos === S.active && !P.overview ? ' active' : ''}" data-pos="${pos}"><span class="rnum">${idx + 1}</span><div style="zoom:${z}">${boardHTML(pos, 'thumb')}</div></div>`).join('')
      + (S.cursor < S.problems.length ? `<div class="rail-more">${S.problems.length - S.cursor} more to come</div>` : '');
    const act = $('.rail-card.active', rail); if (act) act.scrollIntoView({ block: 'nearest' });
  }
  function refreshRailCard(pos) {
    const card = $(`.rail-card[data-pos="${pos}"]`); if (!card) return;
    const holder = card.lastElementChild; holder.innerHTML = boardHTML(pos, 'thumb');
  }
  function renderStage() {
    const stage = $('#stage'), S = P.sess;
    const w = stage.clientWidth - 52;
    if (P.overview) {
      const cols = Math.max(1, Math.min(3, Math.floor(w / 380)));
      const cw = (w - (cols - 1) * 16) / cols - 30;
      stage.innerHTML = `<div class="over-title">${esc(P.s.title)}: the whole string</div><div class="overview" style="grid-template-columns:repeat(${cols},1fr)">${S.shown.map((idx, pos) => `<div class="rail-card" data-pos="${pos}"><span class="rnum">${idx + 1}</span><div style="zoom:${cw / 1000}">${boardHTML(pos, 'thumb')}</div></div>`).join('')}</div>
        <p class="end-note">What did you notice?</p>`;
      stage.onclick = e => { const c = e.target.closest('[data-pos]'); if (c) { S.active = +c.dataset.pos; P.overview = false; saveSession(); renderAll(); } };
      return;
    }
    stage.onclick = null;
    const z = Math.min(1.7, Math.max(0.5, w / 1000));
    stage.innerHTML = `<div class="stage-inner" style="zoom:${z}">${boardHTML(S.active, 'main')}</div>`;
    const board = $('.board.main', stage);
    board.style.minHeight = Math.max(300, (stage.clientHeight - 60) / z) + 'px';
    const head = $('.prob-head', board);
    stage.onscroll = () => head.classList.toggle('stuck', stage.scrollTop > 4);
    stage.onscroll();
    setupInk();
  }

  /* ---- stage interactions ---- */
  function stageClick(e) {
    if (P.overview || P.pen) return;
    const S = P.sess, idx = S.shown[S.active], d = pdata(idx);
    const tb = e.target.closest('[data-tool]');
    if (tb) return addModel(tb.dataset.tool);
    const a = e.target.closest('[data-a]');
    if (a && a.dataset.a === 'addans') return openAnswerInput();
    if (a && a.dataset.a === 'rmmodel') { const i = +a.closest('[data-m]').dataset.m; d.models.splice(i, 1); saveSession(); renderStage(); refreshRailCard(S.active); return; }
    const ans = e.target.closest('[data-ans]');
    if (ans) {
      const it = d.answers[+ans.dataset.ans];
      it.mark = !it.mark ? 'circled' : it.mark === 'circled' ? 'crossed' : '';
      if (it.mark === '' && e.altKey) d.answers.splice(+ans.dataset.ans, 1);
      saveSession(); renderStage(); refreshRailCard(S.active); return;
    }
    const cell = e.target.closest('.cell-toggle');
    if (cell) {
      const m = d.models[+cell.closest('[data-m]').dataset.m];
      m.hidden = m.hidden || []; const k = cell.dataset.cell;
      m.hidden = m.hidden.includes(k) ? m.hidden.filter(x => x !== k) : [...m.hidden, k];
      if (m.labels) delete m.labels['c' + k];
      redrawModel(+cell.closest('[data-m]').dataset.m); return;
    }
    const ed = e.target.closest('[data-edit]');
    if (ed) return editLabel(ed);
  }
  function stageInput(e) {
    const t = e.target, S = P.sess;
    if (t.dataset.min != null) {
      const i = +t.dataset.min, m = pdata(S.shown[S.active]).models[i];
      m.input = t.value; m.labels = {}; m.hidden = [];
      redrawModel(i);
    }
    if (t.id === 'quick-q') { S.problems[S.shown[S.active]].q = t.value; saveSession(); refreshRailCard(S.active); }
  }
  function stageBlur(e) { if (e.target.dataset && e.target.dataset.min != null && P) refreshRailCard(P.sess.active); }
  function stageKey(e) {
    if (e.key === 'Escape') { e.target.blur(); e.stopPropagation(); }
    if (e.key === 'Enter' && (e.target.dataset.min != null || e.target.id === 'quick-q')) e.target.blur();
  }
  function redrawModel(i) {
    const S = P.sess, m = pdata(S.shown[S.active]).models[i];
    const box = $(`.board.main [data-m="${i}"]`);
    if (box) { $('.model-out', box).innerHTML = modelOut(m); box.classList.toggle('is-empty', !String(m.input || '').trim()); }
    saveSession();
    clearTimeout(redrawModel.t); redrawModel.t = setTimeout(() => refreshRailCard(S.active), 200);
  }
  function addModel(type) {
    if (P.overview) return;
    const S = P.sess, idx = S.shown[S.active], d = pdata(idx), q = S.problems[idx].q || '';
    let input = '';
    // number line starts blank: students start from different numbers
    if ((type === 'area' || type === 'array') && /[x×*]/.test(q)) input = q.replace(/×|\*/g, 'x');
    if (type === 'clock' && /\d\/\d/.test(q)) input = q;
    const qx = q.replace(/[×*]/g, 'x').replace(/[−–]/g, '-').trim();
    if (type === 'slide' && /^\S+\s*-\s*\S+$/.test(qx)) input = qx + ' = ';
    if (type === 'givetake' && /^\S+\s*\+\s*\S+$/.test(qx)) input = qx + ' = ';
    if (type === 'halve' && /^\S+\s*x\s*\S+$/i.test(qx)) input = qx + ' = ';
    if (type === 'column' && /\d\s*[+\-x×*−]\s*\d/.test(q)) input = q.replace(/[×*]/g, 'x').replace(/[−–]/g, '-');
    if (type === 'text' && /[x×*]|\d\/\d/.test(q)) input = q + ' = ';
    d.models.push({ type, input, labels: {} });
    saveSession(); renderStage(); refreshRailCard(S.active);
    const inp = $$('.board.main [data-min]').pop();
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); inp.scrollIntoView({ block: 'nearest' }); }
  }
  function openAnswerInput() {
    if (P.overview || $('.ans-input')) { const ex = $('.ans-input'); if (ex) ex.focus(); return; }
    const slot = $('#ans-slot'); if (!slot) return;
    slot.innerHTML = `<input class="ans-input" placeholder="?" autocomplete="off">`;
    const inp = $('input', slot); inp.focus();
    const commit = () => {
      const v = inp.value.trim();
      if (v) { const S = P.sess; pdata(S.shown[S.active]).answers.push({ t: v.replace(/-/g, '−'), mark: '' }); saveSession(); }
      renderStage(); refreshRailCard(P.sess.active);
    };
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { e.stopPropagation(); renderStage(); } };
    inp.onblur = () => setTimeout(() => { if (document.activeElement !== inp && inp.isConnected) commit(); }, 50);
  }
  function editLabel(el) {
    const S = P.sess, mi = +el.closest('[data-m]').dataset.m, m = pdata(S.shown[S.active]).models[mi], key = el.dataset.edit;
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

  /* ---- pen ---- */
  function setupInk() {
    const ink = $('#ink'); if (!ink) return;
    ink.classList.toggle('drawing', P.pen === 'draw');
    ink.classList.toggle('erasing', P.pen === 'erase');
    const board = ink.parentElement;
    let cur = null, path = null;
    const pt = e => { const r = board.getBoundingClientRect(), k = 1000 / r.width; return [+((e.clientX - r.left) * k).toFixed(1), +((e.clientY - r.top) * k).toFixed(1)]; };
    const d = () => pdata(P.sess.shown[P.sess.active]);
    const eraseAt = e => { const t = document.elementFromPoint(e.clientX, e.clientY); if (t && t.dataset && t.dataset.s != null && ink.contains(t)) { d().strokes.splice(+t.dataset.s, 1); saveSession(); renderStage(); refreshRailCard(P.sess.active); } };
    ink.onpointerdown = e => {
      if (!P.pen) return;
      e.preventDefault(); ink.setPointerCapture(e.pointerId);
      if (P.pen === 'erase') { ink._erasing = true; return eraseAt(e); }
      cur = { c: P.penColor, w: 5, pts: [pt(e)] };
      path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('stroke', cur.c); path.setAttribute('stroke-width', cur.w); ink.appendChild(path);
      path.setAttribute('d', strokePath(cur.pts));
    };
    ink.onpointermove = e => {
      if (P.pen === 'erase' && ink._erasing) return eraseAt(e);
      if (!cur) return;
      const p = pt(e), l = cur.pts[cur.pts.length - 1];
      if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 2) return;
      cur.pts.push(p); path.setAttribute('d', strokePath(cur.pts));
    };
    ink.onpointerup = ink.onpointercancel = () => {
      ink._erasing = false;
      if (!cur) return;
      d().strokes.push(cur); cur = null; path = null; saveSession(); refreshRailCard(P.sess.active);
    };
  }
  function setPen(mode) {
    P.pen = P.pen === mode ? null : mode;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    renderNav(); setupInk();
  }
  function undoStroke() { const d = pdata(P.sess.shown[P.sess.active]); if (d.strokes.length) { d.strokes.pop(); saveSession(); renderStage(); refreshRailCard(P.sess.active); } }

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
      case 'clear': { const d = pdata(P.sess.shown[P.sess.active]); if (d.strokes.length && confirm('Clear the drawing on this problem?')) { d.strokes = []; saveSession(); renderStage(); refreshRailCard(P.sess.active); } break; }
      case 'overview': P.overview = !P.overview; renderAll(); break;
      case 'restart': if (confirm('Start this string over? Answers and models from this run will be cleared.')) { P.sess = newSession(P.s.id, P.s); if (P.quick) P.sess.problems.push({ q: '' }); revealNext(true); timer.reset(); saveSession(); renderAll(); } break;
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
    else if (k === 'o' || k === 'O') { P.overview = !P.overview; renderAll(); }
    else if (k === 'a' || k === 'A') { e.preventDefault(); openAnswerInput(); }
    else if (k === 'Escape') { if (P.pen) setPen(P.pen); else if (P.overview) { P.overview = false; renderAll(); } }
    else if (k === '?') helpModal();
    else { const t = TOOLS.find(x => x.key === k); if (t) { e.preventDefault(); addModel(t.id); } }
  }

  /* ================= start ================= */
  loadLibrary().then(route);
})();
