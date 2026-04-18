"""Find variant sprites that still have leftover green pixels and emit
an HTML review page where each candidate can be tagged Remove / Keep.

Workflow:
    python3 tools/find_green_leftovers.py
    open tools/green_review.html        # tag sprites in the browser
    # ... the page lets you download green_tags.json
    python3 tools/apply_green_removal.py tools/green_tags.json

The detector flags pixels close to the workbook's solid green background
color; the prior flood-fill cleared the connected outer blob, but small
disconnected islands or anti-aliased fringes can survive. This script
only surfaces *candidates* — the human decides per sprite whether to
strip the leftover or leave it (e.g. the sprite is genuinely greenish).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).parent.parent
VARIANTS_DIR = ROOT / "site" / "assets" / "variants"
OUT_HTML = Path(__file__).parent / "green_review.html"

BG_RGB = (156, 213, 164)   # the workbook's background green
# Tight tolerance: this detector has no edge-connectivity check, so a wide
# tolerance would flag any "greenish" body pixel. We only want pixels that
# are essentially the exact bg color and survived the flood fill — i.e.
# disconnected islands of true background.
TOLERANCE_SQ = 5 * 5
MIN_PIXELS = 1             # surface anything with even one surviving bg pixel


def scan(path: Path) -> int:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    count = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            dr, dg, db = r - BG_RGB[0], g - BG_RGB[1], b - BG_RGB[2]
            if dr * dr + dg * dg + db * db <= TOLERANCE_SQ:
                count += 1
    return count


def main() -> int:
    candidates = []
    for p in sorted(VARIANTS_DIR.glob("*.png")):
        n = scan(p)
        if n >= MIN_PIXELS:
            candidates.append({"file": p.name, "leftover": n})

    print(f"Scanned {len(list(VARIANTS_DIR.glob('*.png')))} sprites; "
          f"{len(candidates)} have >={MIN_PIXELS} greenish pixels left.")

    cards = "\n".join(f"""
    <div class="card" data-file="{c['file']}">
      <img src="../site/assets/variants/{c['file']}" alt="{c['file']}">
      <div class="meta">
        <div class="name">{c['file']}</div>
        <div class="count">{c['leftover']} greenish px</div>
      </div>
      <div class="actions">
        <button class="btn-remove" type="button">Remove</button>
        <button class="btn-keep"   type="button">Keep</button>
      </div>
    </div>""" for c in candidates)

    html = f"""<!doctype html>
<html><head><meta charset="utf-8">
<title>Green-leftover review ({len(candidates)})</title>
<style>
  body {{ background:#1a1d22; color:#e6e6e6; font-family:system-ui,sans-serif; margin:0; padding:1.5rem; }}
  header {{ display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:1rem; flex-wrap:wrap; }}
  h1 {{ margin:0; font-size:1.2rem; }}
  .summary {{ font-size:.85rem; color:#9aa; }}
  button {{ cursor:pointer; padding:.4rem .8rem; border-radius:6px; border:1px solid #444; background:#2a2e36; color:#eee; font-weight:600; }}
  button:hover {{ background:#363b45; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill, minmax(200px,1fr)); gap:1rem; }}
  .card {{ background:#23262d; border:2px solid #2a2e36; border-radius:8px; padding:.75rem; display:flex; flex-direction:column; align-items:center; gap:.4rem; }}
  .card.remove {{ border-color:#b94a48; background:#3a1f1f; }}
  .card.keep   {{ border-color:#3a8a3a; background:#1f2f1f; }}
  .card img {{ width:128px; height:128px; object-fit:contain; image-rendering:pixelated; background:#11141a; border-radius:4px; padding:4px; }}
  .meta {{ text-align:center; font-size:.75rem; line-height:1.3; }}
  .name {{ font-family:monospace; font-size:.7rem; color:#bbb; word-break:break-all; }}
  .count {{ color:#b6c8e0; }}
  .actions {{ display:flex; gap:.4rem; width:100%; }}
  .actions button {{ flex:1; }}
  .btn-remove {{ background:#5a2a2a; }}
  .btn-keep   {{ background:#2a5a2a; }}
  .save-bar {{ position:sticky; top:0; background:#1a1d22; padding:.6rem 0; z-index:10; display:flex; gap:.6rem; align-items:center; }}
</style>
</head><body>
<header>
  <h1>Green-leftover review</h1>
  <div class="summary">{len(candidates)} candidates · click Remove or Keep on each, then Save</div>
</header>
<div class="save-bar">
  <button id="save">Download green_tags.json</button>
  <button id="select-all-remove">Mark all as Remove</button>
  <button id="reset">Clear tags</button>
  <span id="status" class="summary"></span>
</div>
<div class="grid">{cards}</div>
<script>
  const STORAGE_KEY = "greenReviewTags";
  const tags = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{{}}");
  const status = document.getElementById("status");

  function paint() {{
    document.querySelectorAll(".card").forEach(c => {{
      const f = c.dataset.file;
      c.classList.remove("remove","keep");
      if (tags[f] === "remove") c.classList.add("remove");
      else if (tags[f] === "keep") c.classList.add("keep");
    }});
    const r = Object.values(tags).filter(v => v === "remove").length;
    const k = Object.values(tags).filter(v => v === "keep").length;
    const total = document.querySelectorAll(".card").length;
    status.textContent = `${{r}} remove · ${{k}} keep · ${{total - r - k}} untagged`;
  }}

  document.querySelectorAll(".card").forEach(c => {{
    const f = c.dataset.file;
    c.querySelector(".btn-remove").addEventListener("click", () => {{
      tags[f] = "remove"; localStorage.setItem(STORAGE_KEY, JSON.stringify(tags)); paint();
    }});
    c.querySelector(".btn-keep").addEventListener("click", () => {{
      tags[f] = "keep"; localStorage.setItem(STORAGE_KEY, JSON.stringify(tags)); paint();
    }});
  }});

  document.getElementById("save").addEventListener("click", () => {{
    const blob = new Blob([JSON.stringify(tags, null, 2)], {{type:"application/json"}});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "green_tags.json"; a.click();
    URL.revokeObjectURL(url);
  }});
  document.getElementById("select-all-remove").addEventListener("click", () => {{
    document.querySelectorAll(".card").forEach(c => tags[c.dataset.file] = "remove");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags)); paint();
  }});
  document.getElementById("reset").addEventListener("click", () => {{
    if (!confirm("Clear all tags?")) return;
    localStorage.removeItem(STORAGE_KEY);
    for (const k in tags) delete tags[k];
    paint();
  }});

  paint();
</script>
</body></html>"""
    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT_HTML}")
    print("Open it in a browser, click Remove/Keep on each, then Download green_tags.json.")
    print("Then run: python3 tools/apply_green_removal.py tools/green_tags.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
