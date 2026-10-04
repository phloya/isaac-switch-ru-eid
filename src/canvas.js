'use strict';
// RGBA canvas with straight-alpha "over" compositing and nearest-neighbour blits.
// Images and canvases share the same shape: {w, h, rgba}.

class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.rgba = Buffer.alloc(w * h * 4);
  }

  /** Composite one source pixel over the canvas (Porter-Duff "over", straight alpha). */
  over(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const p = (y * this.w + x) * 4, d = this.rgba;
    const da = d[p + 3] / 255, sa = a / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) return;
    d[p] = Math.round((r * sa + d[p] * da * (1 - sa)) / oa);
    d[p + 1] = Math.round((g * sa + d[p + 1] * da * (1 - sa)) / oa);
    d[p + 2] = Math.round((b * sa + d[p + 2] * da * (1 - sa)) / oa);
    d[p + 3] = Math.round(oa * 255);
  }

  /** Draw a region of an image with nearest-neighbour scaling (scale given in percent, like anm2). */
  blit(img, cx, cy, cw, ch, dx, dy, scaleXPct = 100, scaleYPct = 100) {
    const sx = scaleXPct / 100, sy = scaleYPct / 100;
    const ow = Math.round(cw * sx), oh = Math.round(ch * sy);
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        const ix = cx + Math.floor(x / sx), iy = cy + Math.floor(y / sy);
        if (ix < 0 || iy < 0 || ix >= img.w || iy >= img.h) continue;
        const s = (iy * img.w + ix) * 4;
        this.over(dx + x, dy + y, img.rgba[s], img.rgba[s + 1], img.rgba[s + 2], img.rgba[s + 3]);
      }
    }
  }
}

module.exports = { Canvas };
