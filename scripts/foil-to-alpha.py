#!/usr/bin/env python3
"""Convert a black-background iridescent texture into a transparent-background
film layer.

Why: compositing a black-backed texture with `screen`/`lighten` over a bright
orange base is additive, so every colour drifts toward white ("milky"). Treating
black as transparent and using plain alpha compositing keeps the generated hue
and saturation intact: cyan stays cyan, violet stays violet, and the black gaps
become pure orange base.

alpha = max(R,G,B) raised to `gamma`; RGB optionally saturation-boosted and
luminance-capped so specular whites do not bleach the base.
"""
import sys
import numpy as np
from PIL import Image


def convert(src, dst, gamma=1.0, sat=1.0, white_cap=255, alpha_scale=1.0):
    img = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    rgb = img / 255.0

    # Saturation boost around per-pixel luma.
    if sat != 1.0:
        luma = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        rgb = np.clip(luma[..., None] + (rgb - luma[..., None]) * sat, 0.0, 1.0)

    mx = rgb.max(axis=2)
    # Cap near-whites so highlights stay tinted instead of bleaching the base.
    if white_cap < 255:
        cap = white_cap / 255.0
        scale = np.where(mx > cap, cap / np.maximum(mx, 1e-6), 1.0)
        rgb = rgb * scale[..., None]
        mx = rgb.max(axis=2)

    alpha = np.clip((mx ** gamma) * alpha_scale, 0.0, 1.0)
    out = np.dstack([(rgb * 255).astype(np.uint8), alpha[..., None].astype(np.uint8) if False else (alpha * 255).astype(np.uint8)])
    Image.fromarray(out, "RGBA").save(dst)

    cover = float((alpha > 0.02).mean())
    print(f"{dst}: alpha>2% covers {cover:.1%}, mean alpha {alpha.mean():.3f}")


if __name__ == "__main__":
    convert(sys.argv[1], sys.argv[2],
            gamma=float(sys.argv[3]) if len(sys.argv) > 3 else 1.0,
            sat=float(sys.argv[4]) if len(sys.argv) > 4 else 1.0,
            white_cap=int(sys.argv[5]) if len(sys.argv) > 5 else 255,
            alpha_scale=float(sys.argv[6]) if len(sys.argv) > 6 else 1.0)
