'use strict';
// Reader for Isaac's .anm2 animation files (XML): spritesheets, layers and per-layer frames.
const fs = require('fs');
const path = require('path');

function attr(attrs, key) {
  const r = new RegExp('\\b' + key + '="(-?[0-9.]+)"').exec(attrs);
  return r ? Number(r[1]) : 0;
}

function parseAnm2(file) {
  const xml = fs.readFileSync(file, 'utf8');
  const sheets = {}, layers = {}, anims = {};
  for (const m of xml.matchAll(/<Spritesheet\s+([^>]*)\/>/g)) sheets[/Id="(\d+)"/.exec(m[1])[1]] = /Path="([^"]+)"/.exec(m[1])[1];
  for (const m of xml.matchAll(/<Layer\s+([^>]*)\/>/g)) layers[/Id="(\d+)"/.exec(m[1])[1]] = /SpritesheetId="(\d+)"/.exec(m[1])[1];
  for (const am of xml.matchAll(/<Animation Name="([^"]+)"[^>]*>([\s\S]*?)<\/Animation>/g)) {
    const anim = { layers: {} };
    for (const lm of am[2].matchAll(/<LayerAnimation LayerId="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/LayerAnimation>)/g)) {
      const frames = [];
      let t = 0;
      for (const fm of (lm[2] || '').matchAll(/<Frame\s+([^>]*)\/>/g)) {
        const a = fm[1], vis = /Visible="(\w+)"/.exec(a);
        const f = {
          x: attr(a, 'XPosition'), y: attr(a, 'YPosition'), px: attr(a, 'XPivot'), py: attr(a, 'YPivot'),
          cx: attr(a, 'XCrop'), cy: attr(a, 'YCrop'), w: attr(a, 'Width'), h: attr(a, 'Height'),
          sx: attr(a, 'XScale'), sy: attr(a, 'YScale'), delay: attr(a, 'Delay') || 1,
          visible: !vis || vis[1] === 'true', t0: t,
        };
        t += f.delay;
        frames.push(f);
      }
      anim.layers[lm[1]] = frames;
    }
    anims[am[1]] = anim;
  }
  return { sheets, layers, anims, dir: path.dirname(file) };
}

/** Frame shown at time n (frames are laid out by their Delay). */
function frameAt(frames, n) {
  for (const f of frames) if (n >= f.t0 && n < f.t0 + f.delay) return f;
  return frames[frames.length - 1];
}

module.exports = { parseAnm2, frameAt };
