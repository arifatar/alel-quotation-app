const fs = require('fs');
const path = require('path');

// ---------- Parse live catalog TSV ----------
const parts = ['live-catalog-part1.tsv', 'live-catalog-part2.tsv', 'live-catalog-part3.tsv'];
let lines = [];
for (const f of parts) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const raw of txt.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    lines.push(raw);
  }
}

const CHANNELS = {
  '140': 'Distributor',
  '149': 'Electrical',
  '153': 'Home Appliances',
  '184': 'Electrical-L',
};

const catalog = {};   // cat -> sub -> [items]
const seen = new Set();
let dups = 0;

for (const line of lines) {
  const cols = line.split('\t');
  if (cols.length < 4) continue;
  const [code, name, cat, sub, p140, p149, p153, p184] = cols;
  if (seen.has(code)) { dups++; continue; }
  seen.add(code);

  const prices = {};
  for (const [k, v] of [['140', p140], ['149', p149], ['153', p153], ['184', p184]]) {
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0) prices[k] = Math.round(n * 100) / 100;
  }
  if (!Object.keys(prices).length) continue;

  const c = (cat || 'General').trim();
  const s = (sub || 'General').trim();
  catalog[c] = catalog[c] || {};
  catalog[c][s] = catalog[c][s] || [];
  catalog[c][s].push({ code: code.trim(), name: name.trim(), prices });
}

// sort
const sortCats = {};
for (const c of Object.keys(catalog).sort()) {
  sortCats[c] = {};
  for (const s of Object.keys(catalog[c]).sort()) {
    sortCats[c][s] = catalog[c][s].sort((a, b) => a.name.localeCompare(b.name));
  }
}

const itemCount = Object.values(sortCats).reduce((n, subs) =>
  n + Object.values(subs).reduce((m, arr) => m + arr.length, 0), 0);

fs.writeFileSync('alel-live-catalog.json', JSON.stringify(sortCats));
console.log('Catalog: ' + Object.keys(sortCats).length + ' categories, ' + itemCount + ' items (dups skipped: ' + dups + ')');

// ---------- Load letterhead images ----------
const tmp = 'C:/Users/USER/AppData/Local/Temp/opencode/';
const headerB64 = fs.readFileSync(tmp + 'head3-b64.txt', 'utf8').trim();
const footerB64 = fs.readFileSync(tmp + 'foot3-b64.txt', 'utf8').trim();

// ---------- Render template ----------
let tpl = fs.readFileSync('quotation-template.html', 'utf8');
tpl = tpl
  .replace('__HEADER_B64__', () => headerB64)
  .replace('__FOOTER_B64__', () => footerB64)
  .replace('__CATALOG_JSON__', () => JSON.stringify(sortCats))
  .replace('__CHANNELS_JSON__', () => JSON.stringify(CHANNELS))
  .replace('__ITEM_COUNT__', () => String(itemCount));

fs.writeFileSync('alel-quotation.html', tpl);
console.log('Wrote alel-quotation.html (' + (tpl.length / 1024).toFixed(0) + ' KB)');
