'use strict';
// Everything specific to the Switch build of Repentance (US title IDs) and to the
// English "EID for Switch" texture mod that provides the item art and anm2 files.
const fs = require('fs');
const path = require('path');
const pcx = require('./pcx');
const { LAYOUT } = require('./layout');

const TITLE = { base: '010021C000B6A000', dlc: '010021C000B6B001' }; // Afterbirth+ base / Repentance DLC (US)
const SPRITE_DIRS = [[TITLE.dlc, 'romfs/resources/gfx/items'], [TITLE.base, 'romfs/rp_patch/resources/gfx/items']];
const ANM2_DIR = path.join(TITLE.base, 'romfs', 'rp_patch', 'resources', 'gfx');
const ANM2 = { collectible: '005.100_collectible.anm2', trinket: '005.350_trinket.anm2' };
// Curse of the Blind / hidden pedestals swap the sprite sheet to this file.
const QUESTIONMARK = [
  path.join(TITLE.dlc, 'romfs', 'resources', 'gfx', 'items', 'collectibles', 'questionmark.pcx'),
  path.join(TITLE.base, 'romfs', 'resources', 'gfx', 'items', 'collectibles', 'questionmark.pcx'),
  path.join(TITLE.base, 'romfs', 'rp_patch', 'resources', 'gfx', 'items', 'collectibles', 'questionmark.pcx'),
];

/** Locate `atmosphere/contents` inside an extracted mod archive (or accept it directly). */
function contentsDir(root) {
  const c = path.join(root, 'atmosphere', 'contents');
  return fs.existsSync(c) ? c : root;
}

/** List the reference sprites: [{kind: 'col'|'tri', id, file, rel}]. */
function listSprites(contents) {
  const out = [];
  for (const [tid, sub] of SPRITE_DIRS) {
    for (const kind of ['collectibles', 'trinkets']) {
      const dir = path.join(contents, tid, sub, kind);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        const m = /^(?:collectibles|trinket)_(\d+)_/.exec(f);
        if (m) out.push({ kind: kind === 'collectibles' ? 'col' : 'tri', id: +m[1], file: path.join(dir, f), rel: path.join(tid, sub, kind, f) });
      }
    }
  }
  return out;
}

/** Lazily decoded sprites plus an art provider for {{CollectibleN}} / {{TrinketN}} inline icons. */
function spriteStore(sprites) {
  const cache = new Map();
  const get = s => cache.get(s.file) || cache.set(s.file, pcx.decode(fs.readFileSync(s.file))).get(s.file);
  const byKey = new Map(sprites.map(s => [s.kind + s.id, s]));
  const itemArt = (kind, id) => { const s = byKey.get(kind + id); return s ? { img: get(s), x: 0, y: 0 } : null; };
  return { get, byKey, itemArt };
}

/**
 * Patch an anm2 so that the item layer shows region B (art copy + text) at LAYOUT.scale % in the
 * idle/shop animations, and only the 36x36 art (region A) in pickup animations.
 * Must stay a single layer: the game calls ReplaceSpritesheet per LAYER, so an extra layer
 * would keep showing the anm2's default sheet (every item would read "The Sad Onion").
 */
function patchAnm2(xml, { itemLayerId, regionAnims, pickupAnims, pivotY, cropH, fixAppearCrop }) {
  const sc = v => Math.round(Number(v) * LAYOUT.scale / 100);
  return xml.replace(/<Animation Name="([^"]+)"[\s\S]*?<\/Animation>/g, (anim, name) => {
    anim = anim.replace(new RegExp(`(<LayerAnimation LayerId="${itemLayerId}"[^>]*>)([\\s\\S]*?)(</LayerAnimation>)`), (m, open, body, close) => {
      if (regionAnims.includes(name)) {
        body = body.replace(/<Frame ([^>]*)\/>/g, (fm, attrs) => '<Frame ' + attrs
          .replace(/XPivot="-?[\d.]+"/, `XPivot="${LAYOUT.BW / 2}"`)
          .replace(/YPivot="-?[\d.]+"/, `YPivot="${Math.round(pivotY * LAYOUT.up)}"`)
          .replace(/XCrop="\d+"/, 'XCrop="0"').replace(/YCrop="\d+"/, `YCrop="${LAYOUT.TOP}"`)
          .replace(/Width="\d+"/, `Width="${LAYOUT.BW}"`).replace(/Height="\d+"/, `Height="${cropH}"`)
          .replace(/XScale="(-?[\d.]+)"/, (m2, v) => `XScale="${sc(v)}"`)
          .replace(/YScale="(-?[\d.]+)"/, (m2, v) => `YScale="${sc(v)}"`) + '/>');
      } else if (pickupAnims.includes(name)) {
        body = body.replace(/Width="320" Height="320"/g, 'Width="36" Height="36"');
      }
      return open + body + close;
    });
    // The trinket "Appear" animation crops (64,32), which is blank in a vanilla 32x32 sheet;
    // point it at an always-empty area of our layout instead of the text.
    if (fixAppearCrop && name === 'Appear') anim = anim.replace(/XCrop="64" YCrop="32"/g, 'XCrop="40" YCrop="0"');
    return anim;
  });
}

/** A hand-drawn "?" (white, grey shade, black outline) for hidden items. */
function questionArt() {
  const pat = [
    '...XXXXXX...', '..XXXXXXXX..', '.XXXX..XXXX.', '.XXX....XXX.', '.XXX....XXX.', '........XXX.',
    '.......XXXX.', '......XXXX..', '.....XXXX...', '.....XXX....', '.....XXX....', '.....XXX....',
    '............', '.....XXX....', '.....XXX....', '.....XXX....',
  ];
  const w = 36, h = 36, rgba = Buffer.alloc(w * h * 4), ox = 10, oy = 10;
  const fill = new Set();
  pat.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X') fill.add((ox + x) + ',' + (oy + y)); }));
  const set = (x, y, r, g, b) => { const p = (y * w + x) * 4; rgba[p] = r; rgba[p + 1] = g; rgba[p + 2] = b; rgba[p + 3] = 255; };
  for (const k of fill) {
    const [x, y] = k.split(',').map(Number);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!fill.has((x + dx) + ',' + (y + dy))) set(x + dx, y + dy, 0, 0, 0);
  }
  for (const k of fill) {
    const [x, y] = k.split(',').map(Number);
    const shade = !fill.has((x + 1) + ',' + y) || !fill.has(x + ',' + (y + 1));
    if (shade) set(x, y, 190, 190, 200); else set(x, y, 255, 255, 255);
  }
  return { w, h, rgba };
}

module.exports = { TITLE, ANM2_DIR, ANM2, QUESTIONMARK, contentsDir, listSprites, spriteStore, patchAnm2, questionArt };
