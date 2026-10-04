'use strict';
// EID text markup: shortcut replacement, {{Icon}} tokens, word wrap and line drawing.
// Follows EID's own rules: icons are inline sprites, a "¤" placeholder is 1px wide,
// the default font is eid_default and the line height is 11px.
const fs = require('fs');
const path = require('path');
const png = require('./png');
const { loadFont, strWidth, drawString } = require('./bmfont');
const { parseAnm2, frameAt } = require('./anm2');
const { loadInlineIcons } = require('./eid-data');

const SHORTCUTS = [
  ['!!!', '{{Warning}}'], ['↑', '{{ArrowUp}}'], ['↓', '{{ArrowDown}}'], ['\x01', '{{ArrowUp}}'], ['\x02', '{{ArrowDown}}'],
  ['\x03', '{{Warning}}'], ['\x06', '{{Heart}}'], ['\x05', '{{Key}}'], ['\x0f', '{{Coin}}'], ['\t', ''],
  ['{{Hashtag}}', 'ǂ'], ['{{CR}}', '{{ColorReset}}'], ['{{EthernalHeart}}', '{{EternalHeart}}'],
  ['{{MimicChest}}', '{{TrapChest}}'], ['{{EternalChest}}', '{{HolyChest}}'], ['{{BombChest}}', '{{StoneChest}}'],
  ['{{OldChest}}', '{{DirtyChest}}'], ['{{CurseRoom}}', '{{CursedRoom}}'], ['{{Crawlspace}}', '{{LadderRoom}}'],
  ['{{GoldHeart}}', '{{GoldenHeart}}'], ['{{IND}}', '{{Indent}}'],
];

/**
 * @param {object} opts
 * @param {string} opts.eidDir       installed EID mod folder (fonts, icon sheets, eid_data.lua)
 * @param {function} [opts.itemArt]  (kind, id) => {img, x, y} source of item art for {{CollectibleN}} icons
 */
function createMarkup({ eidDir, itemArt = () => null }) {
  const gfx = path.join(eidDir, 'resources', 'gfx');
  const font = loadFont(path.join(eidDir, 'resources', 'font'), 'eid_default');
  const icons = loadInlineIcons(eidDir);
  const sheets = {
    inline: parseAnm2(path.join(gfx, 'eid_inline_icons.anm2')),
    transform: parseAnm2(path.join(gfx, 'eid_transform_icons.anm2')),
    player: parseAnm2(path.join(gfx, 'eid_player_icons.anm2')),
    cardspills: parseAnm2(path.join(gfx, 'eid_cardspills.anm2')),
  };
  const images = {};
  const image = p => images[p] || (images[p] = png.decode(fs.readFileSync(p)));
  const spaceW = strWidth(font, ' ');

  function resolveIcon(name) {
    let m;
    if ((m = /^Collectible(\d+)$/.exec(name)) || (m = /^Trinket(\d+)$/.exec(name))) {
      return { item: name.startsWith('C') ? 'col' : 'tri', id: +m[1], w: 11, h: 8, xo: -2, yo: -2 };
    }
    if ((m = /^Card(\d+)$/.exec(name))) return { anim: 'Cards', frame: +m[1] - 1, w: 8, h: 8, xo: 0, yo: 1, sheet: 'cardspills' };
    if ((m = /^Pill(\d+)$/.exec(name))) return { anim: 'Pills', frame: (+m[1] % 2048) - 1, w: 9, h: 8, xo: 0, yo: 1, sheet: 'cardspills' };
    return icons[name] || null;
  }

  function drawIcon(cv, ic, x, y) {
    if (ic.item) { // EID's "ItemIcon": the item's 32x32 sprite at 50%
      const art = itemArt(ic.item, ic.id);
      if (art) cv.blit(art.img, art.x, art.y, 32, 32, Math.round(x), Math.round(y), 50, 50);
      return;
    }
    const sh = sheets[ic.sheet || 'inline'], an = sh.anims[ic.anim];
    if (!an) return;
    for (const [lid, frames] of Object.entries(an.layers)) {
      if (!frames.length) continue;
      const f = frameAt(frames, Math.max(0, ic.frame));
      if (!f || !f.visible || !f.w) continue;
      const img = image(path.join(sh.dir, sh.sheets[sh.layers[lid]]));
      cv.blit(img, f.cx, f.cy, f.w, f.h, Math.round(x + f.x - f.px * f.sx / 100), Math.round(y + f.y - f.py * f.sy / 100), f.sx, f.sy);
    }
  }

  /** Split one description line into [{t: 'text', s} | {t: 'icon', ic, name}]. Colour markup is dropped. */
  function tokenize(line) {
    for (const [a, b] of SHORTCUTS) line = line.split(a).join(b);
    const out = [];
    let rest = line;
    while (rest.length) {
      const i = rest.indexOf('{{');
      if (i < 0) { out.push({ t: 'text', s: rest }); break; }
      if (i > 0) out.push({ t: 'text', s: rest.slice(0, i) });
      const j = rest.indexOf('}}', i);
      if (j < 0) { out.push({ t: 'text', s: rest.slice(i) }); break; }
      const name = rest.slice(i + 2, j);
      rest = rest.slice(j + 2);
      if (/^Color/.test(name) || name === 'Indent' || name === 'NoLineBreak' || name === 'NoLB') continue;
      const ic = resolveIcon(name);
      if (ic) out.push({ t: 'icon', ic, name });
    }
    return out;
  }

  /** Greedy word wrap; icons are words of their own width. Returns lines of words. */
  function wrap(tokens, maxW) {
    const words = [];
    for (const tk of tokens) {
      if (tk.t === 'icon') { words.push({ parts: [tk], w: tk.ic.w, space: false }); continue; }
      for (const p of tk.s.split(/( )/)) {
        if (p === '') continue;
        if (p === ' ') { if (words.length) words[words.length - 1].space = true; continue; }
        const prev = words[words.length - 1];
        if (prev && !prev.space && prev.parts[prev.parts.length - 1].t === 'text') { // glue to an adjacent word
          prev.parts.push({ t: 'text', s: p });
          prev.w += strWidth(font, p);
        } else words.push({ parts: [{ t: 'text', s: p }], w: strWidth(font, p), space: false });
      }
    }
    const lines = [];
    let cur = [], curW = 0;
    for (const w of words) {
      const gap = cur.length && cur[cur.length - 1].space ? spaceW : 0;
      if (cur.length && curW + gap + w.w > maxW) { lines.push(cur); cur = []; curW = 0; }
      curW += (cur.length && cur[cur.length - 1].space ? spaceW : 0) + w.w;
      cur.push(w);
    }
    if (cur.length) lines.push(cur);
    return lines;
  }

  function lineWidth(words) {
    let w = 0;
    words.forEach((wd, i) => { w += wd.w; if (wd.space && i < words.length - 1) w += spaceW; });
    return w;
  }

  function drawLine(cv, words, x, y, color) {
    let cx = x;
    words.forEach((w, i) => {
      for (const p of w.parts) {
        if (p.t === 'icon') { drawIcon(cv, p.ic, cx + (p.ic.xo ?? -1), y + (p.ic.yo ?? 0)); cx += p.ic.w; }
        else cx += drawString(cv, font, p.s, cx, y, color);
      }
      if (w.space && i < words.length - 1) cx += spaceW;
    });
  }

  /** Split an EID description on '#' into wrapped lines. */
  function layoutLines(desc, wrapW) {
    const lines = [];
    for (const raw of desc.split('#')) {
      if (!raw.trim()) continue;
      for (const l of wrap(tokenize(raw.trim()), wrapW)) lines.push(l);
    }
    return lines;
  }

  return { font, icons, tokenize, wrap, lineWidth, drawLine, layoutLines };
}

module.exports = { createMarkup };
