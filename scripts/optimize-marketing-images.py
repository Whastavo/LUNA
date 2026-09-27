"""DEPRECATED: superseded by the automatic asset pipeline.

`pnpm dev` / `pnpm build` now run scripts/optimize-assets.mjs (via the Vite
plugin in vite.config.assets.ts) on every boot and file change, producing the
same manifest (src/lib/data/marketing-images.json) and same derivatives. Only
run this script if you must reproduce the exact legacy output without Node.

Legacy: generate marketing image variants and their manifest. Requires Python 3 and Pillow."""

import json
from pathlib import Path

from PIL import Image, ImageSequence

root = Path(__file__).resolve().parents[1]
static = root / 'static'
sources = [
    *static.joinpath('blog').glob('*'),
    *static.joinpath('marketing').glob('*.webp'),
    *static.joinpath('luna/visuals').glob('luna-*.webp'),
    # Renders fuente en PNG (hero cast, error page, avatar): entran al
    # pipeline igual que los webp — el guardia anti-PNG-crudo de abajo
    # garantiza que el original NUNCA vuelva a un srcset (el hero pesaba
    # 1.4MB en PNG crudo frente a 172KB en webp q85).
    *static.joinpath('luna/visuals').glob('luna-*.png'),
    *static.joinpath('luna/visuals').glob('gustavo.png'),
]
manifest = {}

# Destination for optimized variants: shared marketing/blog folders keep their
# layout; Luna's own visuals live inside static/luna/optimized.
def destination_for(source: Path) -> Path:
    if source.parent.name == 'visuals':
        return static / 'luna' / 'optimized'
    return static / 'optimized' / source.parent.name

for source in sorted(sources):
    if source.suffix not in ('.webp', '.png', '.jpg', '.gif'):
        continue
    with Image.open(source) as original:
        url = '/' + source.relative_to(static).as_posix()
        group = 'luna' if source.parent.name == 'visuals' else source.parent.name
        destination = destination_for(source)
        destination.mkdir(parents=True, exist_ok=True)
        widths = {
            'luna': [480, 640, 960],
            'marketing': [768, 1440],
            'blog': [96, 480, 960, 1920],
        }[group]
        variants = []
        for width in sorted({min(width, original.width) for width in widths}):
            resized = original.convert('RGBA' if 'A' in original.getbands() else 'RGB')
            resized.thumbnail(
                (width, round(width * original.height / original.width)),
                Image.Resampling.LANCZOS,
            )
            target = destination / f'{source.stem}-{resized.width}.webp'
            resized.save(target, 'WEBP', quality=85, method=6)
            variants.append((resized.width, '/' + target.relative_to(static).as_posix()))

        entry = {
            'src': variants[-1][1],
            'srcset': ', '.join(f'{path} {width}w' for width, path in variants),
            'width': original.width,
            'height': original.height,
        }
        # The existing WebP originals retain detail on large, dense displays.
        # PNG sources NEVER get their original appended: a raw PNG render can
        # weigh 8-20x its q85 webp variant (luna-grace: 1.4MB vs 172KB), and
        # one desktop viewport would re-download megabytes for zero visible
        # gain. Their src stays the original URL (svelte img src fallback)
        # but the srcset ceiling is the largest variant.
        if group in ('marketing', 'luna') and source.suffix != '.png':
            entry['src'] = url
            if original.width > variants[-1][0]:
                entry['srcset'] += f', {url} {original.width}w'

        if getattr(original, 'is_animated', False):
            entry['poster'] = {'src': entry['src'], 'srcset': entry['srcset']}
            frames = [frame.convert('RGB') for frame in ImageSequence.Iterator(original)]
            durations = [frame.info.get('duration', 100) for frame in ImageSequence.Iterator(original)]
            target = destination / f'{source.stem}-animated.webp'
            frames[0].save(
                target, 'WEBP', save_all=True, append_images=frames[1:],
                duration=durations, loop=original.info.get('loop', 0), quality=80, method=6,
            )
            entry['src'] = '/' + target.relative_to(static).as_posix()
            entry['srcset'] = ''

        manifest[url] = entry
        print(f'{url}: {source.stat().st_size // 1024} KiB -> '
              f'{static.joinpath(entry["src"].lstrip("/")).stat().st_size // 1024} KiB')

(root / 'src/lib/data/marketing-images.json').write_text(json.dumps(manifest, indent=2) + '\n')
