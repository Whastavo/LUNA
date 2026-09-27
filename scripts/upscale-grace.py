# Re-escalado de alta calidad para luna-grace.png.
# El render original mide 266x629 y el rail de Cuenta lo muestra a ~500px
# (el doble en pantallas Retina): la pixelación es falta de píxeles reales.
#
# Técnica (estándar para arte anime/cel-shading sin modelos de ML):
#   1. Lanczos x4  -> 1064x2516 (el Lanczos es el mejor interpolador
#      clásico para bordes nítidos de ilustración).
#   2. UnsharpMask -> recompone el micro-contraste de contornos que el
#      escalado suaviza (percent=110, radius=2 es suave, sin halos).
#   3. El alfa se procesa por el MISMO camino: la silueta queda limpia,
#      sin escalones.
#
# Reproducible:
#   python3.13 scripts/upscale-grace.py
from PIL import Image, ImageFilter
from pathlib import Path

SRC = Path("assets-private/luna/renders/pose.png")
# Maestros de visuales ahora en assets-src/ (el Asset Optimizer genera sus
# variantes en static/generated/). Renómbralo a static/ si necesitas servirlo.
OUT = Path("assets-src/luna/visuals/luna-grace.png")
ESCALA = 4  # 266x629 -> 1064x2516: cubre 2x Retina del rail (496x1360) con aire

img = Image.open(SRC).convert("RGBA")

# El original trae la figura centrada en un lienzo 848x696 con espacio
# sobrante: se recorta al contenido (con aire de 12px) antes de escalar,
# para no inflar píxeles vacíos.
bbox = img.getchannel("A").getbbox()
aire = 12
caja = (
    max(0, bbox[0] - aire),
    max(0, bbox[1] - aire),
    min(img.width, bbox[2] + aire),
    min(img.height, bbox[3] + aire),
)
recorte = img.crop(caja)

grande = recorte.resize((recorte.width * ESCALA, recorte.height * ESCALA), Image.LANCZOS)
grande = grande.filter(ImageFilter.UnsharpMask(radius=2, percent=110, threshold=2))
grande.save(OUT, optimize=True)
print(f"{OUT}: {recorte.width}x{recorte.height} -> {grande.width}x{grande.height}")
