# Game Assets

Sprite art for the game. The player-provided **32rogues** pack is
extracted into `assets/32rogues/32rogues/*.png` and the game reads cells
straight off those sheets — no per-sprite cropping needed.

If a sheet is missing, every sprite falls back to a coloured emoji so
the UI still renders.

## 32rogues pack (`assets/32rogues/32rogues/`)

Dropped in by extracting `32rogues-0.5.0.zip` from
https://sethbb.itch.io/32rogues. The files used by the game are:

| File           | Used for                                                   |
|----------------|------------------------------------------------------------|
| `rogues.png`   | The hero (Knight) portrait                                 |
| `monsters.png` | Goblin Warrior, Giant Spider, Goblin Mage, Witch, Dragon   |
| `tiles.png`    | Reserved for future tile art                               |
| `*.txt`        | Index files — list of which sprite is at each row / column |

Which exact cell a character uses is defined in
`client/src/constants/sprites.js`. If a sprite doesn't feel right for
its role, change the `col, row` pair passed to `sheetCell(...)` in that
file and the game picks up the new sprite on reload.

> **License note (from the pack's own `LICENSE.txt`):** the pack may be
> used in commercial/non-commercial projects but not in conjunction
> with generative AI or machine learning projects. You accepted this
> trade-off when you asked for 32rogues specifically.

## Overriding with your own PNGs

You can skip a sheet cell and provide a single PNG instead by editing
`sprites.js` to use `{ image: '/assets/sprites/xxx.png', … }` for a
character. Individual PNGs go under `assets/sprites/`. Any size works —
`image-rendering: pixelated` keeps small pixel art crisp when scaled.
