const fs = require('fs');

// ---------- Source: RTM item-rate snapshot (DP / TP / MRP + channel) ----------
const raw = JSON.parse(fs.readFileSync('alel-products-clean.json', 'utf8'));

const CHANNEL_MAP = {
  'Electrical': 'Electrical',
  'Electrical-L': 'Electrical',   // lighting range -> same channel
  'Home Appliances': 'Home Appliances',
  'Hardware Tools': 'Pump & Tools'
};

// channel -> category -> subcategory -> items
const catalog = {};
let count = 0;

for (const r of raw) {
  const channel = CHANNEL_MAP[r.ch];
  if (!channel) continue;                    // drops 'Electrical-L'
  if (!r.mrp || !r.dp || !r.tp) continue;    // need all three price tiers

  const cat = (r.cat || 'General').trim();
  const sub = (r.sub || 'General').trim();

  catalog[channel] = catalog[channel] || {};
  catalog[channel][cat] = catalog[channel][cat] || {};
  catalog[channel][cat][sub] = catalog[channel][cat][sub] || [];

  catalog[channel][cat][sub].push({
    code: String(r.code),
    name: String(r.name).trim(),
    dp: Number(r.dp),
    tp: Number(r.tp),
    mrp: Number(r.mrp)
  });
  count++;
}

// sort everything
const out = {};
for (const ch of Object.keys(catalog).sort()) {
  out[ch] = {};
  for (const cat of Object.keys(catalog[ch]).sort()) {
    out[ch][cat] = {};
    for (const sub of Object.keys(catalog[ch][cat]).sort()) {
      out[ch][cat][sub] = catalog[ch][cat][sub].sort((a, b) => a.name.localeCompare(b.name));
    }
  }
}

fs.writeFileSync('alel-catalog.json', JSON.stringify(out));

const summary = Object.entries(out).map(([ch, cats]) => {
  const n = Object.values(cats).reduce((a, subs) => a + Object.values(subs).reduce((x, arr) => x + arr.length, 0), 0);
  return ch + ': ' + Object.keys(cats).length + ' categories, ' + n + ' items';
});
console.log('Total items:', count);
console.log(summary.join('\n'));

// ---------- Letterhead images ----------
const tmp = 'C:/Users/USER/AppData/Local/Temp/opencode/';
const headerB64 = fs.readFileSync(tmp + 'head4-b64.txt', 'utf8').trim();
const footerB64 = fs.readFileSync(tmp + 'foot4-b64.txt', 'utf8').trim();

let tpl = fs.readFileSync('quotation-template.html', 'utf8');
tpl = tpl
  .replace('__HEADER_B64__', () => headerB64)
  .replace('__FOOTER_B64__', () => footerB64)
  .replace('__CATALOG_JSON__', () => JSON.stringify(out));

fs.writeFileSync('index.html', tpl);
fs.writeFileSync('alel-quotation.html', tpl);
console.log('Built index.html (' + (tpl.length / 1024).toFixed(0) + ' KB)');

