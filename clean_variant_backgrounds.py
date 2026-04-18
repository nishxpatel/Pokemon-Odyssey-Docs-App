"""Remove the solid green background from variant sprites.

Approach: flood-fill from every edge pixel inward, marking pixels within
TOLERANCE of the sampled background color as transparent. Internal pixels
of the same color (e.g. greens on a plant Pokemon's body) are untouched
because the flood is only seeded from the outer border.

Run from the project root:
    python3 clean_variant_backgrounds.py [path-or-dir]

With no args, processes every PNG in site/assets/variants/ in place.
"""
from __future__ import annotations

import sys
from collections import Counter, deque
from pathlib import Path

from PIL import Image

VARIANTS_DIR = Path(__file__).parent / "site" / "assets" / "variants"
TOLERANCE = 38          # max Euclidean RGB distance from sampled bg to count as background
EDGE_SAMPLE_PX = 2      # how deep into the image to look when picking seeds


def _sample_bg_color(im: Image.Image) -> tuple[int, int, int]:
    """Pick the dominant color of the four corners as the background."""
    w, h = im.size
    samples = []
    for x in (0, w - 1):
        for y in (0, h - 1):
            r, g, b, _ = im.getpixel((x, y))
            samples.append((r, g, b))
    return Counter(samples).most_common(1)[0][0]


def _close_enough(a: tuple[int, int, int], b: tuple[int, int, int], thresh_sq: int) -> bool:
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return dr * dr + dg * dg + db * db <= thresh_sq


def remove_background(path: Path) -> bool:
    """Replace the connected outer background with transparency. Returns True if changed."""
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()

    bg = _sample_bg_color(im)
    thresh_sq = TOLERANCE * TOLERANCE

    visited = bytearray(w * h)   # 0 = unvisited, 1 = already cleared
    queue: deque[tuple[int, int]] = deque()

    def maybe_seed(x: int, y: int) -> None:
        if 0 <= x < w and 0 <= y < h and not visited[y * w + x]:
            r, g, b, _a = px[x, y]
            if _close_enough((r, g, b), bg, thresh_sq):
                visited[y * w + x] = 1
                queue.append((x, y))

    # Seed from a thin strip along all four edges so we catch the bg even if
    # the very corner is off (e.g. JPEG-style fringe).
    for d in range(EDGE_SAMPLE_PX):
        for x in range(w):
            maybe_seed(x, d)
            maybe_seed(x, h - 1 - d)
        for y in range(h):
            maybe_seed(d, y)
            maybe_seed(w - 1 - d, y)

    cleared = 0
    while queue:
        x, y = queue.popleft()
        px[x, y] = (0, 0, 0, 0)
        cleared += 1
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx]:
                r, g, b, a = px[nx, ny]
                if a != 0 and _close_enough((r, g, b), bg, thresh_sq):
                    visited[ny * w + nx] = 1
                    queue.append((nx, ny))

    if cleared == 0:
        return False
    im.save(path, "PNG")
    return True


def main(argv: list[str]) -> int:
    targets: list[Path] = []
    if len(argv) > 1:
        for arg in argv[1:]:
            p = Path(arg)
            if p.is_dir():
                targets.extend(sorted(p.glob("*.png")))
            elif p.is_file():
                targets.append(p)
    else:
        targets = sorted(VARIANTS_DIR.glob("*.png"))

    if not targets:
        print(f"no PNGs found", file=sys.stderr)
        return 1

    changed = 0
    for p in targets:
        if remove_background(p):
            changed += 1
    print(f"processed {len(targets)} files, modified {changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
