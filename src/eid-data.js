'use strict';
// Reads item descriptions and inline-icon definitions straight from an installed
// External Item Descriptions (EID) mod folder. Nothing from EID is bundled here.
const fs = require('fs');
const path = require('path');
const { tableAfter } = require('./lua');

/** Convert EID entries ({"id", "name", "description"}) into Map<id, {name, desc}>. */
function entriesToMap(tbl) {
  const out = new Map();
  if (!tbl) return out;
  for (const e of [...tbl.arr, ...Object.values(tbl.map)]) {
    if (!e || !e.arr || e.arr.length < 3) continue;
    const [id, name, desc] = e.arr;
    if (typeof desc !== 'string') continue;
    out.set(Number(id), { name, desc });
  }
  return out;
}

function readTable(file, marker) {
  if (!fs.existsSync(file)) return null;
  return tableAfter(fs.readFileSync(file, 'utf8'), marker);
}

/**
 * Descriptions as the Repentance (non-plus) game sees them: Afterbirth+ tables overridden
 * by the Repentance tables. Repentance+ overrides are deliberately NOT applied, because the
 * Switch port is Repentance 1.7.9b.
 */
function loadDescriptions(eidDir, lang) {
  const d = path.join(eidDir, 'descriptions');
  const abCol = entriesToMap(readTable(path.join(d, 'ab+', lang + '.lua'), /EID\.descriptions\[languageCode\]\.collectibles\s*=\s*\{/));
  const abTri = entriesToMap(readTable(path.join(d, 'ab+', lang + '.lua'), /EID\.descriptions\[languageCode\]\.trinkets\s*=\s*\{/));
  const repCol = entriesToMap(readTable(path.join(d, 'rep', lang + '.lua'), /local repCollectibles\s*=\s*\{/));
  const repTri = entriesToMap(readTable(path.join(d, 'rep', lang + '.lua'), /local repTrinkets\s*=\s*\{/));
  const col = new Map(abCol), tri = new Map(abTri);
  for (const [k, v] of repCol) col.set(k, v);
  for (const [k, v] of repTri) tri.set(k, v);
  return { col, tri, counts: { abCol: abCol.size, repCol: repCol.size, abTri: abTri.size, repTri: repTri.size } };
}

const STATS = ['Damage', 'Speed', 'Tears', 'Range', 'Shotspeed', 'Luck', 'AngelChance', 'DevilChance', 'Tearsize'];

/**
 * Parse EID.InlineIcons from features/eid_data.lua:
 *   ["Name"] = {"Anim", frame, width, height, leftOffset = -1, topOffset = 0, sprite}
 */
function loadInlineIcons(eidDir) {
  const src = fs.readFileSync(path.join(eidDir, 'features', 'eid_data.lua'), 'utf8');
  const icons = {};
  const re = /\["([^"]+)"\]\s*=\s*\{"([^"]+)",\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)(?:,\s*(-?\d+))?(?:,\s*(-?\d+))?\s*(?:,\s*([^}]*?))?\s*,?\}/g;
  let m;
  while ((m = re.exec(src))) {
    const sprite = (m[8] || '').trim();
    let sheet = 'inline';
    if (sprite.includes('IconSprite') && !sprite.includes('InlineIconSprite')) sheet = 'transform';
    if (sprite.includes('PlayerSprite')) sheet = 'player';
    if (sprite.includes('CardPillSprite')) sheet = 'cardspills';
    icons[m[1]] = {
      anim: m[2], frame: +m[3], w: +m[4], h: +m[5],
      xo: m[6] !== undefined ? +m[6] : -1, yo: m[7] !== undefined ? +m[7] : 0, sheet,
    };
  }
  for (const s of STATS) icons[s] = icons[s + 'REP']; // {{Damage}} etc. resolve to the Repentance icons
  return icons;
}

/** Item qualities (0-4) from an items_metadata.xml of the Switch build. */
function loadQualities(file) {
  if (!file || !fs.existsSync(file)) return new Map();
  const xml = fs.readFileSync(file, 'utf8');
  return new Map([...xml.matchAll(/<item id="(\d+)" quality="(\d)"/g)].map(m => [+m[1], +m[2]]));
}

module.exports = { loadDescriptions, loadInlineIcons, loadQualities, entriesToMap };
