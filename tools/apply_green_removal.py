"""Apply chroma-key-style green removal to sprites tagged 'remove' in
the JSON produced by tools/green_review.html.

Usage:
    python3 tools/apply_green_removal.py [path/to/green_tags.json]

Defaults to tools/green_tags.json (or ~/Downloads/green_tags.json) if
no path given. Unlike the edge-only flood-fill in
clean_variant_backgrounds.py, this pass globally erases any pixel within
TOLERANCE of the workbook's bg green — for sprites where leftover green
islands are clearly background, not body color.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent.parent
VARIANTS_DIR = ROOT / "site" / "assets" / "variants"
DEFAULT_TAGS = [
    Path(__file__).parent / "green_tags.json",
    Path.home() / "Downloads" / "green_tags.json",
]

BG_RGB = (156, 213, 164)
# Tight tolerance — chroma-key the exact bg color only. A wide tolerance
# without an edge-connectivity check would eat anti-aliased fringe pixels
# and any body pixel that's coincidentally close to the bg green.
TOLERANCE_SQ = 5 * 5


def strip_green(path: Path) -> int:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    cleared = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            dr, dg, db = r - BG_RGB[0], g - BG_RGB[1], b - BG_RGB[2]
            if dr * dr + dg * dg + db * db <= TOLERANCE_SQ:
                px[x, y] = (0, 0, 0, 0)
                cleared += 1
    if cleared:
        im.save(path, "PNG")
    return cleared


def main(argv: list[str]) -> int:
    if len(argv) > 1:
        tags_path = Path(argv[1])
    else:
        tags_path = next((p for p in DEFAULT_TAGS if p.exists()), DEFAULT_TAGS[0])

    if not tags_path.exists():
        print(f"tags file not found: {tags_path}", file=sys.stderr)
        return 1

    tags = json.loads(tags_path.read_text())
    to_remove = [f for f, v in tags.items() if v == "remove"]
    print(f"Loaded {len(tags)} tags; {len(to_remove)} marked for removal.")

    changed = 0
    for fname in to_remove:
        p = VARIANTS_DIR / fname
        if not p.exists():
            print(f"  skip (missing): {fname}")
            continue
        n = strip_green(p)
        if n:
            print(f"  cleared {n:5d} px from {fname}")
            changed += 1
    print(f"Done. Modified {changed}/{len(to_remove)} sprites.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
