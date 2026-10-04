# Moving progress between PC and Switch

The PC version on Steam is now **Repentance+**. The Switch runs **Repentance 1.7.9b**.
Both use the same persistent-save format (`ISAACNGSAVE09R`), but Repentance+ has longer sections,
so a Repentance+ file has to be converted before the Switch can use it.

> **Always back up first.** Keep a copy of the PC files and a JKSV backup of the Switch save before replacing anything.

## Where the files are

| Platform | File | Location |
|---|---|---|
| PC, Repentance+ | `rep+persistentgamedata1.dat` (slot 1–3) | `<Steam>/userdata/<account id>/250900/remote/` (Steam Cloud) |
| PC, Repentance (before R+) | `rep_persistentgamedata1.dat` | same folder |
| PC, Afterbirth+ | `abp_persistentgamedata1.dat` | same folder |
| Switch, Repentance | `rep_gamedata1.dat` (slot 1–3) | the game's save: a JKSV backup, or DBI → *Run MTP responder* → `7: Saves` → *Installed games* → *The Binding of Isaac Afterbirth+* → *&lt;user&gt;* |

`rep_gamestate1.dat` and `rep+gamestate1.dat` hold a run in progress. They are not needed and should not be copied across versions.

## Format

| Section | Entry | Repentance | Repentance+ |
|---|---|---:|---:|
| 1 achievements | 1 byte | 638 | **642** |
| 2 counters | 4 bytes | 496 | **523** |
| 3 level counters | 4 bytes | 14 | 14 |
| 4 collectibles seen | 1 byte | 733 | 733 |
| 5 minibosses | 1 byte | 7 | 7 |
| 6 bosses | 1 byte | 104 | 104 |
| 7 challenges | 1 byte | 46 | 46 |
| 8 cutscene counters | 4 bytes | 27 | 27 |
| 9 game settings | 4 bytes | 2 | 2 |
| 10 special seeds | 1 byte | 80 | 80 |

Each section starts with `[id u32][size u32][count u32]`. The size field equals the count for section 1 and `4 × count` for the others.
After section 10 comes a variable-length bestiary section and a trailing `u32`. The last 4 bytes are the checksum.

**Checksum**: a CRC over bytes `[0x10, length − 4)` with a custom table, initial value `~0xFEDCBA76` and a final inversion
(algorithm from [isaac-save-edit-script](https://github.com/jamesthejellyfish/isaac-save-edit-script), MIT).
`node bin/convert-save.js info <file>` verifies it.

Repentance+ **appends** its 4 achievements and 27 counters at the end of their sections: indices below them are unchanged.
That was checked on real files. All 70 achievements of an old Repentance save sit at the same indices in the later Repentance+ save of the same profile.

## PC (Repentance+) → Switch

1. **Close the game.** Copy `rep+persistentgamedata1.dat` from the Steam folder.
2. **Convert:**
   ```bash
   node bin/convert-save.js to-repentance rep+persistentgamedata1.dat rep_gamedata1.dat
   ```
   The 4 Repentance+-only achievements and 27 Repentance+-only counters are dropped. Everything else is kept and the checksum is recomputed.
3. **On the Switch**, start the game once, choose slot 1 and quit it with *Home → X*, so the save exists.
4. **Replace the file**, either way works:
   - **DBI over MTP:** *Run MTP responder*, open `7: Saves → Installed games → The Binding of Isaac Afterbirth+ → <user>` and copy `rep_gamedata1.dat` over the existing one. In our test DBI accepted this replacement, and reading the file back gave identical bytes;
   - **JKSV:** create a backup, replace the file inside the backup folder on the SD card, then *Restore*.
5. Start the game. If something looks wrong, restore the backup.

## Switch → PC (Repentance+)

Repentance+ reads Repentance saves: on its first launch it imports `rep_persistentgamedata*.dat` automatically ([ardor.guru](https://isaac.ardor.guru/guides/repentance-to-repentance-plus/)).
To bring a Switch save back later:

1. Exit **Steam completely**. Otherwise Steam Cloud puts the old file back.
2. Back up `<Steam>/userdata/<id>/250900/remote/`.
3. Copy the Switch `rep_gamedata1.dat` there as `rep+persistentgamedata1.dat`. *Untested here.* The game's own import path, which uses the `rep_persistentgamedata1.dat` name, is the safer route when a profile has never been opened in Repentance+.
4. Clear `Documents/My Games/Binding of Isaac Repentance+/save_backups`, start the game and choose **Local** if Steam reports a cloud conflict.
5. Secrets that were lost can be restored from Steam achievements in-game with **Alt + F2** in *Stats → Secrets*.

A save always **replaces** a profile. Progress made on two devices in parallel cannot be merged.
