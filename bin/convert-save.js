#!/usr/bin/env node
'use strict';
// Inspect and convert The Binding of Isaac persistent saves.
//
//   node bin/convert-save.js info <file>                    format, checksum, unlock counts
//   node bin/convert-save.js to-repentance <in> <out>       Repentance+ (PC) -> Repentance (Switch)
//
// PC Repentance+:  <Steam>/userdata/<id>/250900/remote/rep+persistentgamedata1.dat
// Switch:          rep_gamedata1.dat inside the game's save (JKSV backup or DBI "Saves" over MTP)
const fs = require('fs');
const save = require('../src/isaac-save');

const [cmd, input, output] = process.argv.slice(2);

function info(file) {
  const s = save.summary(save.parse(fs.readFileSync(file)));
  console.log(`${file}
  layout:        ${s.version}
  checksum:      ${s.checksumValid ? 'OK' : 'INVALID'}
  achievements:  ${s.achievementsUnlocked} / ${s.achievementSlots}
  counters set:  ${s.nonZeroCounters}
  sections:      ${s.sectionCounts.join(' / ')}`);
}

try {
  if (cmd === 'info' && input) info(input);
  else if (cmd === 'to-repentance' && input && output) {
    const src = fs.readFileSync(input);
    const version = save.detectVersion(save.parse(src));
    if (version !== 'repentancePlus') throw new Error(`input layout is "${version}", expected repentancePlus`);
    fs.writeFileSync(output, save.toRepentance(src));
    info(output);
    console.log('Lost in conversion: the 4 Repentance+-only achievements and 27 Repentance+-only counters.');
  } else {
    console.log('usage:\n  node bin/convert-save.js info <file>\n  node bin/convert-save.js to-repentance <rep+persistentgamedata1.dat> <rep_gamedata1.dat>');
    process.exit(cmd ? 2 : 0);
  }
} catch (e) {
  console.error(`${input}: ${e.message}`);
  process.exit(1);
}
