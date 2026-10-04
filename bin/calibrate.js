#!/usr/bin/env node
'use strict';
// Prove the text engine against the original English sprites: render the English EID text in the
// original mod's layout and compare with its PCX files.
//
//   node bin/calibrate.js --eid <EID> --switch-mod <English EID-for-Switch mod> [--items 1,105,534]
//
// 1) word-wrap width: which width reproduces the line count (sprite height) of every sprite;
// 2) pixel diff for a few items (text-only items match with 0 differing pixels).
const { loadOptions, requireOption } = require('../src/cli');
const { loadDescriptions } = require('../src/eid-data');
const { createMarkup } = require('../src/markup');
const { CLASSIC, composeClassic } = require('../src/layout');
const sw = require('../src/switch-mod');

const opts = loadOptions(process.argv.slice(2));
const eidDir = requireOption(opts, 'eid', 'path to the External Item Descriptions mod folder');
const modRoot = requireOption(opts, 'switchMod', 'path to the extracted English "EID for Switch" mod');
const sprites = sw.listSprites(sw.contentsDir(modRoot));
const store = sw.spriteStore(sprites);
const markup = createMarkup({ eidDir, itemArt: store.itemArt });
const en = loadDescriptions(eidDir, 'en_us');

let best = null;
for (let w = 150; w <= 172; w++) {
  let ok = 0, total = 0;
  for (const s of sprites) {
    const d = (s.kind === 'col' ? en.col : en.tri).get(s.id);
    if (!d) continue;
    total++;
    if (39 + 11 * markup.layoutLines(d.desc, w).length === store.get(s).h) ok++;
  }
  if (!best || ok > best.ok) best = { w, ok, total };
}
console.log(`wrap width ${best.w}px reproduces the height of ${best.ok}/${best.total} reference sprites (layout uses ${CLASSIC.wrapW}px)`);

function diff(a, b) {
  let bad = 0, total = 0;
  for (let y = 0; y < Math.min(a.h, b.h); y++) for (let x = 0; x < Math.min(a.w, b.w); x++) {
    const p = (y * a.w + x) * 4, q = (y * b.w + x) * 4;
    const va = a.rgba[p + 3] > 0, vb = b.rgba[q + 3] > 0;
    if (!va && !vb) continue;
    total++;
    if (va !== vb || Math.abs(a.rgba[p] - b.rgba[q]) > 40 || Math.abs(a.rgba[p + 1] - b.rgba[q + 1]) > 40 || Math.abs(a.rgba[p + 2] - b.rgba[q + 2]) > 40) bad++;
  }
  return { bad, total };
}

for (const id of String(opts.items || '1,105,118,182,534').split(',').map(Number)) {
  const s = store.byKey.get('col' + id), d = en.col.get(id);
  if (!s || !d) continue;
  const ref = store.get(s), { cv } = composeClassic(markup, { art: ref, name: d.name, desc: d.desc });
  const r = diff(cv, ref);
  console.log(`col${id} ${d.name.padEnd(18)} ${String(r.bad).padStart(5)} / ${r.total} pixels differ` + (r.bad ? '  (icon artwork differs between EID versions)' : '  (pixel-exact)'));
}
