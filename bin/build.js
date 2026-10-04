#!/usr/bin/env node
'use strict';
// Build the localized "EID for Switch" texture mod.
//
//   node bin/build.js --eid <EID mod folder> --switch-mod <extracted English EID-for-Switch mod>
//                     [--metadata items_metadata.xml] [--lang ru] [--out dist]
//
// Output: <out>/atmosphere/contents/... — copy the "atmosphere" folder to the root of the SD card.
const fs = require('fs');
const path = require('path');
const pcx = require('../src/pcx');
const { loadOptions, requireOption, writeFile } = require('../src/cli');
const { loadDescriptions, loadQualities } = require('../src/eid-data');
const { createMarkup } = require('../src/markup');
const { LAYOUT, KINDS, compose } = require('../src/layout');
const sw = require('../src/switch-mod');

const opts = loadOptions(process.argv.slice(2), { lang: 'ru', out: 'dist' });
const eidDir = requireOption(opts, 'eid', 'path to the External Item Descriptions mod folder (Steam Workshop or GitHub copy)');
const modRoot = requireOption(opts, 'switchMod', 'path to the extracted English "EID for Switch" mod (folder containing atmosphere/)');
const outRoot = path.join(path.resolve(opts.out), 'atmosphere', 'contents');

const contents = sw.contentsDir(modRoot);
const sprites = sw.listSprites(contents);
if (!sprites.length) { console.error('No item sprites found under ' + contents); process.exit(1); }
const store = sw.spriteStore(sprites);
const markup = createMarkup({ eidDir, itemArt: store.itemArt });

const lang = opts.lang;
const desc = loadDescriptions(eidDir, lang);
const fallback = lang === 'en_us' ? desc : loadDescriptions(eidDir, 'en_us');
const overridesFile = path.join(__dirname, '..', 'src', `overrides.${lang}.json`);
if (fs.existsSync(overridesFile)) {
  for (const [key, text] of Object.entries(JSON.parse(fs.readFileSync(overridesFile, 'utf8')))) {
    const m = /^(col|tri)(\d+)$/.exec(key);
    if (!m) continue;
    const map = m[1] === 'col' ? desc.col : desc.tri, id = +m[2];
    if (map.has(id)) map.set(id, { ...map.get(id), desc: text });
  }
}
const quality = loadQualities(opts.metadata && path.resolve(opts.metadata));

let maxH = 0;
const fallbacks = [], missing = [];
for (const s of sprites) {
  const art = store.get(s);
  const own = (s.kind === 'col' ? desc.col : desc.tri).get(s.id);
  const d = own || (s.kind === 'col' ? fallback.col : fallback.tri).get(s.id);
  if (!own && d) fallbacks.push(s.kind + s.id);
  if (!d) missing.push(s.kind + s.id);
  const q = s.kind === 'col' && quality.has(s.id) ? quality.get(s.id) : null;
  const r = compose(markup, { art, name: d ? d.name : null, desc: d ? d.desc : null, quality: q, ...KINDS[s.kind] });
  maxH = Math.max(maxH, r.cv.h);
  writeFile(path.join(outRoot, s.rel), pcx.encode(r.cv.w, r.cv.h, r.cv.rgba, art.header));
}

const blind = compose(markup, { art: sw.questionArt(), name: null, desc: null, ...KINDS.col });
for (const rel of sw.QUESTIONMARK) writeFile(path.join(outRoot, rel), pcx.encode(blind.cv.w, blind.cv.h, blind.cv.rgba, store.get(sprites[0]).header));

const cropH = Math.ceil((maxH - LAYOUT.TOP + 8) / 4) * 4;
const anmSrc = path.join(contents, sw.ANM2_DIR), anmOut = path.join(outRoot, sw.ANM2_DIR);
writeFile(path.join(anmOut, sw.ANM2.collectible), sw.patchAnm2(fs.readFileSync(path.join(anmSrc, sw.ANM2.collectible), 'utf8'), {
  itemLayerId: 1, regionAnims: ['Idle', 'ShopIdle'], pickupAnims: ['PlayerPickup', 'PlayerPickupSparkle'], pivotY: KINDS.col.pivotY, cropH,
}));
writeFile(path.join(anmOut, sw.ANM2.trinket), sw.patchAnm2(fs.readFileSync(path.join(anmSrc, sw.ANM2.trinket), 'utf8'), {
  itemLayerId: 0, regionAnims: ['Idle'], pickupAnims: [], pivotY: KINDS.tri.pivotY, cropH, fixAppearCrop: true,
}));

console.log(`Built ${sprites.length} item sprites + ${sw.QUESTIONMARK.length} hidden-item sprites + 2 anm2 files`);
console.log(`Language: ${lang}; English fallback: ${fallbacks.length}; without description: ${missing.length}; tallest sprite: ${maxH}px`);
if (!quality.size) console.log('Note: no --metadata given, quality badges are omitted.');
console.log('Output: ' + path.join(path.resolve(opts.out), 'atmosphere') + '  ->  copy to the root of the SD card');
