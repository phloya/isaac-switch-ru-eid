'use strict';
// Binary BMFont (v3) loader and renderer. EID's fonts store the outline in the alpha
// channel and the glyph in RGB, so tinting RGB colours the glyph and keeps a black outline.
const fs = require('fs');
const path = require('path');
const png = require('./png');

function loadFont(fontDir, name) {
  const b = fs.readFileSync(path.join(fontDir, name + '.fnt'));
  if (b.toString('latin1', 0, 3) !== 'BMF') throw new Error(name + '.fnt is not a binary BMFont');
  const font = { chars: new Map(), kern: new Map(), pages: [] };
  let o = 4;
  while (o < b.length) {
    const type = b[o], size = b.readUInt32LE(o + 1), s = o + 5;
    if (type === 2) { font.lineHeight = b.readUInt16LE(s); font.base = b.readUInt16LE(s + 2); }
    if (type === 3) {
      let q = s;
      while (q < s + size) { const e = b.indexOf(0, q); font.pages.push(b.toString('latin1', q, e)); q = e + 1; }
    }
    if (type === 4) {
      for (let q = s; q < s + size; q += 20) {
        font.chars.set(b.readUInt32LE(q), {
          x: b.readUInt16LE(q + 4), y: b.readUInt16LE(q + 6), w: b.readUInt16LE(q + 8), h: b.readUInt16LE(q + 10),
          xo: b.readInt16LE(q + 12), yo: b.readInt16LE(q + 14), xa: b.readInt16LE(q + 16), page: b[q + 18],
        });
      }
    }
    if (type === 5) for (let q = s; q < s + size; q += 10) font.kern.set(b.readUInt32LE(q) + ':' + b.readUInt32LE(q + 4), b.readInt16LE(q + 8));
    o = s + size;
  }
  font.pageImgs = font.pages.map(p => png.decode(fs.readFileSync(path.join(fontDir, p))));
  return font;
}

const glyph = (font, id) => font.chars.get(id) || font.chars.get(63); // fallback '?'

/** Advance width of a string in pixels (EID uses "¤" placeholders, 1px each, for inline icons). */
function strWidth(font, s) {
  let w = 0, prev = null;
  for (const ch of s) {
    const id = ch.codePointAt(0), g = glyph(font, id);
    if (prev !== null) w += font.kern.get(prev + ':' + id) || 0;
    w += g ? g.xa : 0;
    prev = id;
  }
  return w;
}

/** Draw a string at (x, y) in the given [r, g, b] colour; returns the advance width. */
function drawString(cv, font, s, x, y, color) {
  let cx = x, prev = null;
  for (const ch of s) {
    const id = ch.codePointAt(0), g = glyph(font, id);
    if (prev !== null) cx += font.kern.get(prev + ':' + id) || 0;
    if (g && ch !== '¤' && ch !== ' ') {
      const img = font.pageImgs[g.page];
      for (let yy = 0; yy < g.h; yy++) {
        for (let xx = 0; xx < g.w; xx++) {
          const s0 = ((g.y + yy) * img.w + g.x + xx) * 4, a = img.rgba[s0 + 3];
          if (!a) continue;
          cv.over(cx + g.xo + xx, y + g.yo + yy,
            img.rgba[s0] * color[0] / 255, img.rgba[s0 + 1] * color[1] / 255, img.rgba[s0 + 2] * color[2] / 255, a);
        }
      }
    }
    cx += g ? g.xa : 0;
    prev = id;
  }
  return cx - x;
}

module.exports = { loadFont, strWidth, drawString };
