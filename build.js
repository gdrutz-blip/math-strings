// Combines every .json file in the strings/ folder into strings.json, which the app loads.
// Netlify runs this on every deploy, so uploading a file to strings/ on GitHub is all it takes.
// A file with a mistake in it is skipped (and named in the Netlify log); the rest still publish.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'strings');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.json')).sort() : [];
const byId = new Map();
const problems = [];

for (const file of files) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8').replace(/^﻿/, ''));
  } catch (e) {
    problems.push(`SKIPPED ${file}: not valid JSON (${e.message})`);
    continue;
  }
  const list = Array.isArray(data) ? data : Array.isArray(data.strings) ? data.strings : data && data.problems ? [data] : null;
  if (!list) { problems.push(`SKIPPED ${file}: no "strings" list found`); continue; }
  list.forEach((s, i) => {
    if (!s || !Array.isArray(s.problems) || !s.title) { problems.push(`SKIPPED string #${i + 1} in ${file}: needs a title and problems`); return; }
    if (!s.id) s.id = (file.replace(/\.json$/i, '') + '-' + s.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (byId.has(s.id)) problems.push(`NOTE ${file}: "${s.id}" also appears in ${byId.get(s.id).file}; using the one in ${file}`);
    byId.set(s.id, { file, s });
  });
}

const strings = [...byId.values()].map(x => x.s);
fs.writeFileSync(path.join(__dirname, 'strings.json'), JSON.stringify({ version: 1, strings }, null, 2) + '\n');
console.log(`Math Strings: ${strings.length} strings from ${files.length} file(s): ${files.join(', ')}`);
problems.forEach(p => console.log('  ' + p));
