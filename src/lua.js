'use strict';
// A small Lua table-constructor parser. It reads the data tables of the EID mod
// (strings, numbers, nested tables, `..` concatenation) without running any Lua.
// Anything that is not plain data (function calls, references) evaluates to null.

function lex(src) {
  const toks = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '-' && src[i + 1] === '-') { // comments: --[[ ... ]] or -- to end of line
      const m = /^--\[(=*)\[/.exec(src.slice(i, i + 20));
      if (m) {
        const close = ']' + m[1] + ']';
        const e = src.indexOf(close, i);
        i = e < 0 ? n : e + close.length;
      } else {
        const e = src.indexOf('\n', i);
        i = e < 0 ? n : e + 1;
      }
      continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") {
      let s = '';
      i++;
      while (i < n && src[i] !== c) {
        if (src[i] === '\\') {
          const d = src[i + 1];
          if (/[0-9]/.test(d)) { // \ddd decimal escape
            const m = /^[0-9]{1,3}/.exec(src.slice(i + 1));
            s += String.fromCharCode(parseInt(m[0], 10));
            i += 1 + m[0].length;
            continue;
          }
          s += { n: '\n', t: '\t', r: '\r', '"': '"', "'": "'", '\\': '\\', a: '\x07', b: '\b', '\n': '\n' }[d] ?? d;
          i += 2;
          continue;
        }
        s += src[i++];
      }
      i++;
      toks.push({ t: 'str', v: s });
      continue;
    }
    if (c === '[' && /^\[=*\[/.test(src.slice(i, i + 10))) { // long string [[ ... ]]
      const m = /^\[(=*)\[/.exec(src.slice(i));
      const close = ']' + m[1] + ']';
      const e = src.indexOf(close, i);
      let s = src.slice(i + m[0].length, e);
      if (s[0] === '\n') s = s.slice(1);
      toks.push({ t: 'str', v: s });
      i = e + close.length;
      continue;
    }
    if (/[0-9]/.test(c)) {
      const m = /^(0x[0-9a-fA-F]+|[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?)/.exec(src.slice(i));
      toks.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      toks.push({ t: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    if (src.startsWith('..', i)) { toks.push({ t: 'op', v: '..' }); i += 2; continue; }
    toks.push({ t: 'op', v: c });
    i++;
  }
  return toks;
}

const isOp = (tk, v) => tk && tk.t === 'op' && tk.v === v;

/** Parse a table constructor starting at toks[p] === '{'. Returns [{arr, map}, nextPos]. */
function parseTable(toks, p) {
  const arr = [], map = {};
  p++;
  while (toks[p] && !isOp(toks[p], '}')) {
    let key = null;
    if (isOp(toks[p], '[')) {
      const [k, q] = parseExpr(toks, p + 1);
      key = k;
      p = q + 2; // skip ']' and '='
    } else if (toks[p].t === 'id' && isOp(toks[p + 1], '=') && !isOp(toks[p + 2], '=')) {
      key = toks[p].v;
      p += 2;
    }
    const [v, q] = parseExpr(toks, p);
    p = q;
    if (key === null) arr.push(v); else map[key] = v;
    if (isOp(toks[p], ',') || isOp(toks[p], ';')) p++;
  }
  return [{ arr, map }, p + 1];
}

function parseExpr(toks, p) {
  let [v, q] = parsePrimary(toks, p);
  while (isOp(toks[q], '..')) {
    const [v2, q2] = parsePrimary(toks, q + 1);
    const plain = x => typeof x === 'string' || typeof x === 'number';
    v = plain(v) && plain(v2) ? String(v) + String(v2) : null;
    q = q2;
  }
  return [v, q];
}

function parsePrimary(toks, p) {
  const t = toks[p];
  if (!t) return [null, p];
  if (t.t === 'str' || t.t === 'num') return [t.v, p + 1];
  if (isOp(t, '{')) return parseTable(toks, p);
  if (isOp(t, '-') && toks[p + 1] && toks[p + 1].t === 'num') return [-toks[p + 1].v, p + 2];
  if (t.t === 'id' && (t.v === 'true' || t.v === 'false' || t.v === 'nil')) return [t.v === 'true' ? true : t.v === 'false' ? false : null, p + 1];
  if (t.t === 'id' && t.v === 'function') { // skip a function body up to its matching 'end'
    let depth = 0, q = p;
    for (; q < toks.length; q++) {
      const v = toks[q].t === 'id' ? toks[q].v : null;
      if (v === 'function' || v === 'do' || v === 'if') depth++;
      if (v === 'end') { depth--; if (depth === 0) return [null, q + 1]; }
    }
    return [null, q];
  }
  // Any other expression (references, calls): skip to the next separator at depth 0.
  let depth = 0, q = p;
  for (; q < toks.length; q++) {
    const tk = toks[q];
    if (tk.t === 'op' && (tk.v === '(' || tk.v === '[' || tk.v === '{')) depth++;
    else if (tk.t === 'op' && (tk.v === ')' || tk.v === ']' || tk.v === '}')) { if (depth === 0) break; depth--; }
    else if (depth === 0 && tk.t === 'op' && (tk.v === ',' || tk.v === ';')) break;
  }
  return [null, q];
}

/** Find `marker` (a RegExp ending at an opening brace) in Lua source and parse that table. */
function tableAfter(src, marker) {
  const m = marker.exec(src);
  if (!m) return null;
  const brace = src.indexOf('{', m.index + m[0].length - 1);
  return parseTable(lex(src.slice(brace)), 0)[0];
}

module.exports = { lex, parseTable, tableAfter };
