'use strict';
// Sprite layouts.
//
// compose()        — the final "centered" layout used by this mod (one anm2 layer):
//   region A (0,0)-(35,35)  original item art, untouched: HUD icons, the "held over head"
//                           animation and the collection page crop 0,0,32,32 from here;
//   region B (from y = 36)  a 4/3-upscaled copy of the art centred at BW/2 with the name,
//                           quality and description below it. The patched anm2 shows region B
//                           at 75% scale, so the art comes back to its original size and every
//                           font pixel lands on exactly 2x2 screen pixels in 720p handheld mode.
//
// composeClassic() — the layout of the original English Switch mod (text to the right of the art,
//                    170px wide). Only used by bin/calibrate.js to prove the text engine is pixel-exact.
const { Canvas } = require('./canvas');

const LAYOUT = { BW: 100, TOP: 36, up: 4 / 3, artX: 29, lineH: 11, gap: 2, padBottom: 2, scale: 75 };
// pivotY: anm2 pivot of the vanilla sprite; gapImg: distance (image px) from the art's pivot line
// to the first text line — clears the altar on pedestals and the price tag in shops.
const KINDS = { col: { pivotY: 32, gapImg: 33 }, tri: { pivotY: 25, gapImg: 36 } };
const YELLOW = [255, 255, 100], WHITE = [255, 255, 255];

function copyArt(cv, art, upscale, dx, dy) {
  const n = upscale === 1 ? 36 : Math.ceil(36 * upscale);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const sx = Math.floor(x / upscale), sy = Math.floor(y / upscale);
      if (sx >= art.w || sy >= art.h || sx >= 36 || sy >= 36) continue;
      const s = (sy * art.w + sx) * 4;
      if (art.rgba[s + 3]) cv.over(dx + x, dy + y, art.rgba[s], art.rgba[s + 1], art.rgba[s + 2], art.rgba[s + 3]);
    }
  }
}

function compose(m, { art, name, desc, quality = null, pivotY, gapImg, layout = LAYOUT }) {
  const o = layout;
  const nameLines = name === null ? [] : m.wrap(m.tokenize(name + (quality !== null ? ' {{Quality' + quality + '}}' : '')), o.BW);
  const lines = desc ? m.layoutLines(desc, o.BW) : [];
  const descW = lines.length ? Math.max(...lines.map(m.lineWidth)) : 0;
  const pivotImgY = Math.round(pivotY * o.up);
  const textTop = o.TOP + pivotImgY + gapImg;
  const textH = nameLines.length * o.lineH + (lines.length ? o.gap + lines.length * o.lineH : 0);
  const H = Math.max(o.TOP + Math.ceil(36 * o.up), textTop + textH + o.padBottom);
  const cv = new Canvas(o.BW, H);
  if (art) {
    copyArt(cv, art, 1, 0, 0);            // region A
    copyArt(cv, art, o.up, o.artX, o.TOP); // region B
  }
  let y = textTop;
  for (const l of nameLines) { m.drawLine(cv, l, Math.floor((o.BW - m.lineWidth(l)) / 2), y, YELLOW); y += o.lineH; }
  if (lines.length) y += o.gap;
  const dx = Math.floor((o.BW - descW) / 2);
  for (const l of lines) { m.drawLine(cv, l, dx, y, WHITE); y += o.lineH; }
  return { cv, lines: lines.length, pivotX: o.artX + Math.round(16 * o.up), pivotImgY };
}

const CLASSIC = { W: 170, nameX: 39, nameY: 2, descX: 3, descY: 37, wrapW: 165, nameMaxW: 130, lineH: 11, padBottom: 3 };

function composeClassic(m, { art, name, desc, opts = {} }) {
  const o = { ...CLASSIC, ...opts };
  const nameLines = m.wrap(m.tokenize(name), o.nameMaxW);
  const lines = m.layoutLines(desc, o.wrapW);
  const descY = Math.max(o.descY, o.nameY + nameLines.length * o.lineH + 4);
  const H = descY - o.descY + 36 + lines.length * o.lineH + o.padBottom;
  const cv = new Canvas(o.W, Math.max(H, 36));
  if (art) copyArt(cv, art, 1, 0, 0);
  nameLines.forEach((l, i) => m.drawLine(cv, l, o.nameX, o.nameY + i * o.lineH, YELLOW));
  lines.forEach((l, i) => m.drawLine(cv, l, o.descX, descY + i * o.lineH, WHITE));
  return { cv, lines: lines.length };
}

module.exports = { LAYOUT, KINDS, CLASSIC, compose, composeClassic };
