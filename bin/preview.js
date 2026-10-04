#!/usr/bin/env node
'use strict';
// Preview the mod without a console.
//
//   --scene shop|pedestal   simulate the Switch Lite screen (1280x720): items placed like the game
//                           places them, region B drawn at 75% straight at screen resolution
//   --sheet col1,col118     the composed sprites on a checkerboard (2x)
//   --anatomy col118        one sprite at 4x with region A / region B outlined
//
// Same inputs as bin/build.js (--eid, --switch-mod, --metadata, --lang or a config.json). Writes --out (PNG).
const fs = require('fs');
const path = require('path');
const png = require('../src/png');
const { Canvas } = require('../src/canvas');
const { loadOptions, requireOption, writeFile } = require('../src/cli');
const { loadDescriptions, loadQualities } = require('../src/eid-data');
const { createMarkup } = require('../src/markup');
const { LAYOUT, KINDS, compose } = require('../src/layout');
const sw = require('../src/switch-mod');

const opts = loadOptions(process.argv.slice(2), { lang: 'ru' });
const eidDir = requireOption(opts, 'eid', 'path to the External Item Descriptions mod folder');
const modRoot = requireOption(opts, 'switchMod', 'path to the extracted English "EID for Switch" mod');
const sprites = sw.listSprites(sw.contentsDir(modRoot));
const store = sw.spriteStore(sprites);
const markup = createMarkup({ eidDir, itemArt: store.itemArt });
const desc = loadDescriptions(eidDir, opts.lang), fallback = loadDescriptions(eidDir, 'en_us');
const quality = loadQualities(opts.metadata && path.resolve(opts.metadata));

function sprite(key) {
  if (key === 'q') return compose(markup, { art: sw.questionArt(), name: null, desc: null, ...KINDS.col });
  const s = store.byKey.get(key);
  if (!s) throw new Error('unknown item ' + key + ' (use col<ID> or tri<ID>)');
  const d = (s.kind === 'col' ? desc.col : desc.tri).get(s.id) || (s.kind === 'col' ? fallback.col : fallback.tri).get(s.id);
  const q = s.kind === 'col' && quality.has(s.id) ? quality.get(s.id) : null;
  return compose(markup, { art: store.get(s), name: d.name, desc: d.desc, quality: q, ...KINDS[s.kind] });
}

const checker = (cv, cell, a, b) => {
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    const c = (Math.floor(x / cell) + Math.floor(y / cell)) & 1 ? a : b;
    cv.over(x, y, c[0], c[1], c[2], 255);
  }
};

function scene(kind, items) {
  const K = 720 / 270, cv = new Canvas(1280, 720); // Switch Lite: 480x270 game pixels on a 1280x720 panel
  for (let y = 0; y < cv.h; y++) for (let x = 0; x < cv.w; x++) {
    const c = ((Math.floor(x / K) >> 4) + (Math.floor(y / K) >> 5)) & 1 ? 120 : 110;
    cv.over(x, y, c + 40, c, c - 40, 255);
  }
  const blit = (img, cx, cy, cw, ch, px, py, gx, gy, scale) => { // pivot (px,py) lands on game point (gx,gy)
    const f = K * scale, ox = gx * K - px * f, oy = gy * K - py * f;
    for (let y = 0; y < Math.ceil(ch * f); y++) for (let x = 0; x < Math.ceil(cw * f); x++) {
      const sx = cx + Math.floor(x / f), sy = cy + Math.floor(y / f);
      if (sx >= img.w || sy >= img.h || sx >= cx + cw || sy >= cy + ch) continue;
      const s = (sy * img.w + sx) * 4;
      cv.over(Math.round(ox + x), Math.round(oy + y), img.rgba[s], img.rgba[s + 1], img.rgba[s + 2], img.rgba[s + 3]);
    }
  };
  const rect = (x0, y0, x1, y1, col, hatch) => {
    for (let y = Math.round(y0 * K); y < y1 * K; y++) for (let x = Math.round(x0 * K); x < x1 * K; x++) {
      cv.over(x, y, col[0], col[1], col[2], hatch && ((x + y) >> 2) & 1 ? 0 : 255);
    }
  };
  const regionB = (im, pivotY, x, y) => blit(im, 0, LAYOUT.TOP, im.w, im.h - LAYOUT.TOP, LAYOUT.BW / 2, Math.round(pivotY * LAYOUT.up), x, y, LAYOUT.scale / 100);
  items.forEach((key, i) => {
    const im = sprite(key).cv, x = 140 + i * 80, y = kind === 'shop' ? 80 : 70;
    if (key.startsWith('tri')) { rect(x - 7, y + 12, x + 7, y + 24, [235, 235, 235], true); regionB(im, KINDS.tri.pivotY, x, y); }
    else if (kind === 'shop') { regionB(im, KINDS.col.pivotY, x, y + 8); rect(x - 9, y + 11, x + 9, y + 19, [235, 235, 235], true); } // hatched box = price tag
    else { rect(x - 14, y - 14, x + 14, y + 16, [90, 90, 100]); regionB(im, KINDS.col.pivotY, x, y - 8); } // grey box = altar
  });
  return cv;
}

function sheet(keys) {
  const ims = keys.map(k => sprite(k).cv);
  const W = Math.max(...ims.map(i => i.w)) + 8, cv = new Canvas(W, ims.reduce((a, i) => a + i.h + 4, 0));
  checker(cv, 8, [60, 60, 80], [90, 90, 110]);
  let oy = 0;
  for (const im of ims) { cv.blit(im, 0, 0, im.w, im.h, 4, oy); oy += im.h + 4; }
  return { cv, scale: 2 };
}

function anatomy(key) {
  const im = sprite(key).cv, S = 4, pad = 12;
  const cv = new Canvas(im.w + pad * 2, im.h + pad * 2);
  checker(cv, 6, [55, 55, 70], [75, 75, 95]);
  cv.blit(im, 0, 0, im.w, im.h, pad, pad);
  const box = (x0, y0, x1, y1, col) => {
    for (let x = x0; x <= x1; x++) { cv.over(pad + x, pad + y0, ...col, 255); cv.over(pad + x, pad + y1, ...col, 255); }
    for (let y = y0; y <= y1; y++) { cv.over(pad + x0, pad + y, ...col, 255); cv.over(pad + x1, pad + y, ...col, 255); }
  };
  box(0, 0, 35, 35, [255, 80, 80]);                               // region A
  box(0, LAYOUT.TOP, LAYOUT.BW - 1, im.h - 1, [80, 200, 255]);     // region B
  return { cv, scale: S };
}

const out = path.resolve(opts.out || 'preview.png');
let result;
if (opts.scene) {
  const items = opts.items ? String(opts.items).split(',') : opts.scene === 'shop' ? ['col527', 'col71', 'col515', 'tri29'] : ['col182', 'col118', 'q'];
  result = { cv: scene(opts.scene, items), scale: 1 };
} else if (opts.anatomy) result = anatomy(String(opts.anatomy));
else result = sheet(String(opts.sheet || 'col1,col118,col182,tri1').split(','));
writeFile(out, png.encode(result.cv.w, result.cv.h, result.cv.rgba, result.scale));
console.log('Wrote ' + out);
