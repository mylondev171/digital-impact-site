import math, sys, os, json
from PIL import Image, ImageDraw

RED, WHITE, BLACK = "#E44443", "#FFFFFF", "#141414"  # brand red, as in the logo
ANG = math.radians(-45)  # dart points from upper-right into center

def dart_parts(simple):
    if simple:
        return [
            [(0,-1.8),(5,-3.8),(54,-3.8),(54,3.8),(5,3.8),(0,1.8)],
            [(36,-3),(46,-14),(60,-14),(53,-3)],
            [(36,3),(46,14),(60,14),(53,3)],
        ]
    return [
        [(0,-0.9),(8,-2.2),(8,2.2),(0,0.9)],                        # point
        [(8,-2.4),(10.5,-4.2),(21.5,-4.2),(24,-2.4),(24,2.4),(21.5,4.2),(10.5,4.2),(8,2.4)],  # barrel
        [(23,-1.9),(55,-1.9),(55,1.9),(23,1.9)],                    # shaft
        [(39,-1.8),(50,-12),(63,-12),(56,-1.8)],                    # flight
        [(39,1.8),(50,12),(63,12),(56,1.8)],                        # flight
    ]

def geometry(simple):
    # Logo pattern, outside in: red, white, red, white bullseye
    rings = [1, .69, .44, .19]
    R = 38 if simple else 39
    cx, cy = 0, 0
    parts = dart_parts(simple)
    def tf(p):
        u, v = p
        return (cx + u*math.cos(ANG) - v*math.sin(ANG), cy + u*math.sin(ANG) + v*math.cos(ANG))
    polys = [[tf(p) for p in poly] for poly in parts]
    stroke = 3.2 if simple else 2.6
    xs = [x for poly in polys for x,_ in poly] + [-R, R]
    ys = [y for poly in polys for _,y in poly] + [-R, R]
    minx, maxx = min(xs)-stroke/2, max(xs)+stroke/2
    miny, maxy = min(ys)-stroke/2, max(ys)+stroke/2
    w, h = maxx-minx, maxy-miny
    side = max(w, h)
    ox, oy = -minx + (side-w)/2, -miny + (side-h)/2
    sc = 100/side
    T = lambda p: ((p[0]+ox)*sc, (p[1]+oy)*sc)
    circles = [(T((0,0)), R*f*sc, RED if i % 2 == 0 else WHITE) for i, f in enumerate(rings)]
    polys = [[T(p) for p in poly] for poly in polys]
    return circles, polys, stroke*sc

def svg(simple, pad=0, bg=None):
    circles, polys, sw = geometry(simple)
    s = 100/(100-2*pad) if pad else 1
    vb = f"{-pad*s*100/100:.2f} {-pad*s*100/100:.2f} {100*s:.2f} {100*s:.2f}" if pad else "0 0 100 100"
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">']
    if bg: out.append(f'<rect x="-50" y="-50" width="200" height="200" fill="{bg}"/>')
    for (c, r, col) in circles:
        out.append(f'<circle cx="{c[0]:.2f}" cy="{c[1]:.2f}" r="{r:.2f}" fill="{col}"/>')
    pts = lambda poly: " ".join(f"{x:.2f},{y:.2f}" for x,y in poly)
    out.append(f'<g fill="{WHITE}" stroke="{WHITE}" stroke-width="{sw:.2f}" stroke-linejoin="round">' + "".join(f'<polygon points="{pts(p)}"/>' for p in polys) + '</g>')
    out.append(f'<g fill="{BLACK}">' + "".join(f'<polygon points="{pts(p)}"/>' for p in polys) + '</g>')
    out.append('</svg>')
    return "".join(out)

def render(size, simple=None, pad=0.0, bg=None, ss=8):
    """pad = fraction of canvas left empty on each side."""
    if simple is None: simple = size <= 24
    circles, polys, sw = geometry(simple)
    N = size*ss
    img = Image.new("RGBA", (N, N), bg or (0,0,0,0))
    d = ImageDraw.Draw(img)
    k = N*(1-2*pad)/100; o = N*pad
    P = lambda p: (o + p[0]*k, o + p[1]*k)
    for (c, r, col) in circles:
        (x, y) = P(c); rr = r*k
        d.ellipse([x-rr, y-rr, x+rr, y+rr], fill=col)
    hw = sw*k/2
    for poly in polys:   # white keyline = Minkowski sum with disk
        q = [P(p) for p in poly]
        d.polygon(q, fill=WHITE)
        for i in range(len(q)):
            a, b = q[i], q[(i+1) % len(q)]
            d.line([a, b], fill=WHITE, width=int(round(2*hw)))
            d.ellipse([a[0]-hw, a[1]-hw, a[0]+hw, a[1]+hw], fill=WHITE)
    for poly in polys:
        d.polygon([P(p) for p in poly], fill=BLACK)
    return img.resize((size, size), Image.LANCZOS)
