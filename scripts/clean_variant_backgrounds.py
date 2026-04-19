"""Strict bg removal for variant sprites.

Reads PNGs from `site/assets/variants_original/` (the never-modified raw
extracts from the workbook) and writes cleaned PNGs to `site/assets/variants/`.

Algorithm:
  1. Per-image, sample the four corners. The most common corner color is
     the background.
  2. Replace EVERY pixel that exactly equals that color with transparent.
  3. Do not touch any other pixel — no flood fill, no tolerance, no edge
     expansion. The Odyssey artwork is pixel art with no anti-aliasing
     (verified: corner-color pixels always have zero near-misses), so an
     exact match is sound and cannot accidentally erase sprite pixels.

If the corner is already transparent (a manually-supplied PNG like
Gorochu's), the file is copied through unchanged.

Usage:
    python3 clean_variant_backgrounds.py
        # cleans variants_original/ -> variants/

    python3 clean_variant_backgrounds.py <src.png> <dst.png>
        # one-shot single-file clean
"""
from __future__ import annotations

import shutil
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

HERE = Path(__file__).parent
ROOT = HERE.parent
ORIGINALS_DIR = ROOT / "site" / "assets" / "variants_original"
VARIANTS_DIR  = ROOT / "site" / "assets" / "variants"


def _detect_bg(im: Image.Image) -> tuple[int, int, int, int] | None:
    """Return the bg pixel value (RGBA) or None if the image is already transparent."""
    w, h = im.size
    px = im.load()
    samples = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    common, _ = Counter(samples).most_common(1)[0]
    if common[3] == 0:
        return None   # already transparent — nothing to clean
    return common


def clean_image(src: Path, dst: Path) -> tuple[int, tuple[int, int, int] | None]:
    """Strip the bg from `src` and write to `dst`. Returns (pixels_cleared, bg_rgb_or_None)."""
    im = Image.open(src).convert("RGBA")
    bg = _detect_bg(im)
    if bg is None:
        # Pass through unchanged.
        if src.resolve() != dst.resolve():
            shutil.copyfile(src, dst)
        return (0, None)

    w, h = im.size
    px = im.load()
    cleared = 0
    for y in range(h):
        for x in range(w):
            if px[x, y] == bg:
                px[x, y] = (0, 0, 0, 0)
                cleared += 1
    im.save(dst, "PNG")
    return (cleared, bg[:3])


def clean_dir(src_dir: Path, dst_dir: Path) -> dict[str, dict]:
    """Clean every PNG in src_dir into dst_dir. Returns per-file stats."""
    dst_dir.mkdir(parents=True, exist_ok=True)
    stats: dict[str, dict] = {}
    for src in sorted(src_dir.glob("*.png")):
        dst = dst_dir / src.name
        cleared, bg = clean_image(src, dst)
        stats[src.name] = {"cleared": cleared, "bg": bg}
    return stats


def main(argv: list[str]) -> int:
    if len(argv) == 3:
        src = Path(argv[1]); dst = Path(argv[2])
        cleared, bg = clean_image(src, dst)
        print(f"{src.name}: cleared {cleared} px (bg={bg})")
        return 0

    if not ORIGINALS_DIR.exists() or not any(ORIGINALS_DIR.glob("*.png")):
        print(f"no PNGs in {ORIGINALS_DIR} — run build_data.py first to extract originals",
              file=sys.stderr)
        return 1

    stats = clean_dir(ORIGINALS_DIR, VARIANTS_DIR)
    total = sum(s["cleared"] for s in stats.values())
    bg_counts = Counter(s["bg"] for s in stats.values() if s["bg"])
    print(f"Cleaned {len(stats)} files; cleared {total:,} background px total.")
    print(f"Background colors detected:")
    for bg, n in bg_counts.most_common():
        print(f"  {bg}: {n} files")
    pass_through = [n for n, s in stats.items() if s["bg"] is None]
    if pass_through:
        print(f"{len(pass_through)} files passed through unchanged (already transparent): "
              f"{', '.join(pass_through[:5])}{'...' if len(pass_through) > 5 else ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
