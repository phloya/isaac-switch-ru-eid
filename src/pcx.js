'use strict';
// ZSoft PCX codec as used by the Switch port of The Binding of Isaac:
// 128-byte header, 8 bits per channel, 4 planes (R, G, B, A) per scanline, RLE compressed.

/** Decode a PCX file into {w, h, rgba, planes, header}. Supports 1-plane (palette), 3- and 4-plane images. */
function decode(buf) {
  const bpp = buf[3], planes = buf[65], bpl = buf.readUInt16LE(66);
  const w = buf.readUInt16LE(8) - buf.readUInt16LE(4) + 1;
  const h = buf.readUInt16LE(10) - buf.readUInt16LE(6) + 1;
  if (bpp !== 8) throw new Error('only 8 bits per plane are supported, got ' + bpp);
  const scan = bpl * planes;
  const raw = Buffer.alloc(scan * h);
  let i = 128, o = 0;
  while (o < raw.length && i < buf.length) {
    const c = buf[i++];
    if ((c & 0xC0) === 0xC0) {
      const n = c & 0x3F, v = buf[i++];
      for (let k = 0; k < n && o < raw.length; k++) raw[o++] = v;
    } else raw[o++] = c;
  }
  const rgba = Buffer.alloc(w * h * 4);
  const pal = planes === 1 && buf.length >= 769 && buf[buf.length - 769] === 0x0C ? buf.subarray(buf.length - 768) : null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4, row = y * scan;
      if (planes === 1) {
        const idx = raw[row + x];
        rgba[p] = pal[idx * 3]; rgba[p + 1] = pal[idx * 3 + 1]; rgba[p + 2] = pal[idx * 3 + 2]; rgba[p + 3] = 255;
      } else {
        for (let c = 0; c < planes; c++) rgba[p + c] = raw[row + c * bpl + x];
        if (planes === 3) rgba[p + 3] = 255;
      }
    }
  }
  return { w, h, rgba, planes, header: buf.subarray(0, 128) };
}

/**
 * Encode RGBA pixels as a 4-plane PCX. The optional header template keeps the original
 * file's unrelated header fields (DPI, palette info) so output matches the game's assets.
 */
function encode(w, h, rgba, headerTemplate) {
  const planes = 4, bpl = w + (w & 1); // bytes per line must be even
  const hdr = Buffer.alloc(128);
  if (headerTemplate) headerTemplate.copy(hdr, 0, 0, 128);
  hdr[0] = 10; hdr[1] = 5; hdr[2] = 1; hdr[3] = 8;
  hdr.writeUInt16LE(0, 4); hdr.writeUInt16LE(0, 6); hdr.writeUInt16LE(w - 1, 8); hdr.writeUInt16LE(h - 1, 10);
  hdr[65] = planes;
  hdr.writeUInt16LE(bpl, 66);
  const out = [hdr];
  for (let y = 0; y < h; y++) {
    const line = Buffer.alloc(bpl * planes);
    for (let c = 0; c < planes; c++) for (let x = 0; x < w; x++) line[c * bpl + x] = rgba[(y * w + x) * 4 + c];
    const enc = [];
    for (let c = 0; c < planes; c++) { // runs never cross a plane boundary
      const seg = line.subarray(c * bpl, (c + 1) * bpl);
      let i = 0;
      while (i < seg.length) {
        const v = seg[i];
        let n = 1;
        while (i + n < seg.length && seg[i + n] === v && n < 63) n++;
        if (n > 1 || (v & 0xC0) === 0xC0) enc.push(0xC0 | n, v); else enc.push(v);
        i += n;
      }
    }
    out.push(Buffer.from(enc));
  }
  return Buffer.concat(out);
}

module.exports = { decode, encode };
