'use strict';
// Tiny argument parser shared by the bin/ scripts: --key value, --flag, and an optional
// --config <file.json> whose keys provide defaults (eid, switchMod, metadata, lang, out).
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const key = a.slice(2).replace(/-([a-z])/g, (m, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i++; }
  }
  return args;
}

function loadOptions(argv, defaults = {}) {
  const args = parseArgs(argv);
  let fileOpts = {};
  const configPath = args.config || (fs.existsSync('config.json') ? 'config.json' : null);
  if (configPath) fileOpts = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return { ...defaults, ...fileOpts, ...args };
}

function requireOption(opts, key, hint) {
  if (!opts[key]) {
    console.error(`Missing --${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}: ${hint}`);
    process.exit(2);
  }
  return path.resolve(opts[key]);
}

function writeFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

module.exports = { parseArgs, loadOptions, requireOption, writeFile };
