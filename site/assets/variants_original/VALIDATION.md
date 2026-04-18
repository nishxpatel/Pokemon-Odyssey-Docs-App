# Variant sprite re-extraction — validation report

## What was done

1. All 200 variant sprites were re-extracted from `Pokémon Stats, Learnset etc (v4.1.1).xlsx` and written to `site/assets/variants_original/` as untouched source-of-truth PNGs (plus 2 manually supplied Gorochu sprites = 202 total).
2. Each original was processed by `clean_variant_backgrounds.py` into `site/assets/variants/`. The cleaner:
   - samples the four corners of each image,
   - takes the most-common corner color as that image's background,
   - replaces every pixel that **exactly equals** that color with transparent,
   - touches no other pixel — no flood fill, no tolerance, no edge expansion.
3. Pre-extraction probe confirmed the workbook art is pure pixel art with no anti-aliasing: corner-color pixel counts at exact, ±3, and ±10 tolerances were identical (28,197 / 28,197 / 28,197 on a sample image), so strict equality cannot accidentally erase sprite pixels.

## Validation pass (202 files)

For each file the validator confirmed:

- output exists,
- zero pixels of the detected bg color remain in the cleaned image,
- the number of pixels turned transparent equals the number of bg-color pixels in the source.

**Result: 202/202 pass.** No mismatches, no leftover bg pixels, no missing outputs.

## Specifically requested: Dusclops / Dusknoir

Visually inspected post-clean:

| sprite | result |
|---|---|
| `dusclops.png` | intact — full body, cyan hand-flames preserved |
| `dusclops-shiny.png` | intact — pale grey body and green hand-flames preserved |
| `dusknoir.png` | intact — full body, cyan hand-flames preserved |
| `dusknoir-shiny.png` | intact — green hand-flames preserved |

The previous over-removal (edge-flood-fill with tolerance 38) is gone. The new cleaner only removes the exact bg color, so cyan/green body pixels close to but not equal to the bg green are untouched.

## Flagged for human review

The validator flagged 6 sprites where >85% of the image was cleared. These are all small sprites in large 192×192 frames — the high clear ratio is just the empty surrounding bg, not over-removal. Confirmed visually:

- `primevil.png`, `primevil-shiny.png` — small sprite, intact
- `sunflower.png`, `sunflower-shiny.png` — small sprite, intact
- `towering-ooze.png`, `towering-ooze-shiny.png` — small sprite, intact

No real anomalies.

## Re-running

```bash
python3 build_data.py                  # re-extracts originals + cleans
python3 clean_variant_backgrounds.py   # only re-clean originals -> variants
```

The originals dir is the stable source-of-truth; cleaning can be re-run without touching the workbook again.
