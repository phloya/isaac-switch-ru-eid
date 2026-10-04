# Notes for the Switch

Practical things learned while building and installing this mod on a Switch Lite with Atmosphère.

## Title IDs

| What | US title ID | Notes |
|---|---|---|
| *The Binding of Isaac: Afterbirth+* (base game) | `010021C000B6A000` | holds `rp_patch/` and the item animations |
| Update 1.7.9b | `010021C000B6A800` | base ID + `0x800` |
| *Repentance* DLC | `010021C000B6B001` | base ID + `0x1000` + 1; holds the Repentance item sprites |
| *Afterbirth+*, another regional release | `01005B9002312000` | its own update/DLC IDs; this mod's paths do not apply |

Updates and DLC are tied to one base title ID: a DLC made for `010021C000B6A000` never attaches to `01005B9002312000`, and the game then runs as plain Afterbirth+.
Save managers (DBI's `7: Saves`) still list the game as *The Binding of Isaac Afterbirth+* when Repentance is installed.

## Where the mod goes

```text
sd:/atmosphere/contents/
├── 010021C000B6A000/romfs/rp_patch/resources/gfx/
│   ├── 005.100_collectible.anm2        patched item animation
│   ├── 005.350_trinket.anm2            patched trinket animation
│   └── items/…                         5 items + 1 trinket that live in the base romfs
└── 010021C000B6B001/romfs/resources/gfx/items/
    ├── collectibles/*.pcx              714 items (+ questionmark.pcx)
    └── trinkets/*.pcx                  188 trinkets
```

Atmosphère writes a `romfs_metadata.bin` cache next to a title's `romfs` folder when the game starts with LayeredFS files.
After replacing a mod we rename the old cache file so it cannot hold stale data; Atmosphère creates a new one.

Remove the mod by deleting or moving the two title folders. The game then uses its own files again.

## Copying files: DBI MTP vs. hekate UMS

| | DBI → *Run MTP responder* | hekate → *Tools → USB Tools → SD Card* |
|---|---|---|
| Read files | ✔ | ✔ |
| Create new files and folders | ✔ (slow for ~900 small files: about 5 minutes) | ✔ (seconds) |
| **Overwrite** an existing file on `1: SD Card` | ✘ silently ignored | ✔ |
| Rename a folder on `1: SD Card` | ✘ (`0x80042009`) | ✔ |
| Delete a folder of ~900 files on `1: SD Card` | unreliable: Explorer reported a failure, the folder was gone later | ✔ |
| Replace a file inside `7: Saves` | ✔ worked for `rep_gamedata1.dat` | — |

**Use hekate's USB mass storage to update an installed mod.** The card appears as a normal drive.
Eject it in the OS, press *Close* in hekate, then *Home → Launch → (your Atmosphère config)*.

## Hardware notes

- **Screen:** 1280 × 720 for a 480 × 270 game frame (× 2.667). This is why the text block is shown at 75 %, see [how it works](how-it-works.md#3-why-75--and-43).
- **Save management:** JKSV and DBI both work. DBI's `7: Saves` view shows the files of the currently booted system (emuMMC in our case).
