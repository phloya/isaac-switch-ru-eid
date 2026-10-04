# Third-party notices

## Included in this repository

### isaac-save-edit-script — save checksum table and algorithm

`src/isaac-save.js` contains the CRC table and checksum algorithm from
[isaac-save-edit-script](https://github.com/jamesthejellyfish/isaac-save-edit-script), re-implemented in JavaScript.

```text
MIT License

Copyright (c) 2023 jamesthejellyfish

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Used at build time, NOT included

These are read from the user's own local copies when `bin/build.js` runs. None of their files are part of this repository.

| Project | What is read | License |
|---|---|---|
| [External Item Descriptions](https://github.com/wofsauge/External-Item-Descriptions) by Wofsauge & contributors | `descriptions/*/<lang>.lua`, `features/eid_data.lua`, `resources/font/eid_default*`, `resources/gfx/eid_*` | no license file; all rights reserved by the authors |
| [EID for Switch (English)](https://gamebanana.com/mods/692797) by Sporoid | item and trinket `.pcx` sprites (item artwork © Nicalis / Edmund McMillen), `.anm2` files | not stated |
| [isaac-extended-icons-mod](https://codeberg.org/janAkali/isaac-extended-icons-mod) by janAkali | `items_metadata.xml` (item qualities of the Switch build) | see the repository |

The images in `assets/` are photos and simulated screenshots for documentation. They show game artwork and EID's font and icons
belonging to their respective owners.
