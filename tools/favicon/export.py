import sys, os, io; sys.path.insert(0, os.path.dirname(__file__)); from icon import *
from PIL import Image
out = sys.argv[1]
def save(im, name, quant=True):
    b1 = io.BytesIO(); im.save(b1, 'PNG', optimize=True); best = b1.getvalue()
    if quant:
        q = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
        b2 = io.BytesIO(); q.save(b2, 'PNG', optimize=True)
        if len(b2.getvalue()) < len(best): best = b2.getvalue()
    open(os.path.join(out, name), 'wb').write(best)
for s in (16, 32, 48, 96): save(render(s), f'favicon-{s}x{s}.png')
for s in (192, 512): save(render(s, pad=0.04), f'android-chrome-{s}x{s}.png')
for s in (192, 512): save(render(s, pad=0.22, bg='#FFFFFF'), f'maskable-icon-{s}x{s}.png')
save(render(180, pad=0.1, bg='#FFFFFF'), 'apple-touch-icon.png')
save(render(150, pad=0.18), 'mstile-150x150.png')
save(render(1024, pad=0.04, ss=4), 'icon-1024.png', quant=False)
ico = [render(s) for s in (16, 32, 48)]
ico[2].save(os.path.join(out, 'favicon.ico'), format='ICO', sizes=[(16,16),(32,32),(48,48)], append_images=ico[:2])
open(os.path.join(out, 'favicon.svg'), 'w').write(svg(False))
open(os.path.join(out, 'favicon-simple.svg'), 'w').write(svg(True))
