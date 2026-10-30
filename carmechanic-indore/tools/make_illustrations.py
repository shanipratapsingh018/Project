#!/usr/bin/env python3
"""Generates the ILLUSTRATIVE before/after images (SVG) used until real workshop photos exist.

Run:  python3 tools/make_illustrations.py
Output: public/assets/img/gallery/illustrative/<case>-before.svg / -after.svg
        public/assets/img/hero-workshop.svg

Every image carries an "ILLUSTRATION" watermark so it can never be mistaken for a photo
of a real customer car. Each pair is the same drawing, before and after, never two vehicles.
"""
import os, random

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "img")
GAL = os.path.join(OUT, "gallery", "illustrative")
os.makedirs(GAL, exist_ok=True)
W, H = 800, 600

def svg(body, title, defs=""):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{title}">
<title>{title}</title>
<defs>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3036"/><stop offset="1" stop-color="#181b1f"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f46"/><stop offset="1" stop-color="#22262b"/></linearGradient>
<radialGradient id="spot" cx="0.5" cy="0.25" r="0.7"><stop offset="0" stop-color="#ffffff" stop-opacity=".14"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fb6c8"/><stop offset="1" stop-color="#4b5f70"/></linearGradient>
{defs}
</defs>
{body}
<g font-family="Arial, Helvetica, sans-serif" font-weight="700" letter-spacing="2">
<rect x="18" y="18" width="300" height="30" rx="6" fill="#141619" fill-opacity=".72"/>
<text x="32" y="38" font-size="14" fill="#ffb27f">ILLUSTRATION · NOT A PHOTO</text>
</g>
</svg>'''

def studio():
    return f'<rect width="{W}" height="{H}" fill="url(#wall)"/><rect y="440" width="{W}" height="160" fill="url(#floor)"/><rect width="{W}" height="{H}" fill="url(#spot)"/><path d="M0 440H{W}" stroke="#4b525b" stroke-width="2"/>'

# ---------- Side-view car ----------
BODY = "M78 402 L78 345 Q84 316 122 308 L232 290 Q292 226 362 212 L522 208 Q584 214 634 280 L702 298 Q730 307 730 342 L730 402 Z"
def car(color, extra_body="", gloss=True, front_override=None, dull=False, tilt=0):
    body = front_override or BODY
    g = []
    g.append(f'<g transform="rotate({tilt} 400 400)">')
    g.append('<ellipse cx="404" cy="470" rx="350" ry="20" fill="#000" opacity=".45"/>')
    g.append(f'<path d="{body}" fill="{color}"/>')
    # windows
    g.append('<path d="M262 292 Q306 240 366 230 L436 228 L436 292 Z" fill="url(#glass)"/>')
    g.append('<path d="M450 228 L515 228 Q560 232 600 292 L450 292 Z" fill="url(#glass)"/>')
    # lines
    g.append('<path d="M443 230 V398 M262 292 H604 M300 300 V396" stroke="#000" stroke-opacity=".28" stroke-width="2.5" fill="none"/>')
    g.append('<path d="M84 352 H726" stroke="#000" stroke-opacity=".18" stroke-width="2"/>')
    g.append('<rect x="372" y="312" width="28" height="6" rx="3" fill="#000" opacity=".35"/><rect x="512" y="312" width="28" height="6" rx="3" fill="#000" opacity=".35"/>')
    # lights
    g.append('<path d="M700 312 Q722 314 726 330 L700 330 Z" fill="#fff4cf"/>')
    g.append('<rect x="80" y="320" width="18" height="18" rx="4" fill="#c0262b"/>')
    if gloss and not dull:
        g.append('<path d="M120 318 L250 300 Q300 248 362 236 L520 232 Q560 236 600 285 L640 300 L620 306 L240 312 Z" fill="url(#gloss)" opacity=".35"/>')
        g.append('<path d="M160 336 H690" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/>')
    g.append(extra_body)
    # wheels
    for cx in (232, 576):
        g.append(f'<circle cx="{cx}" cy="408" r="66" fill="#141619"/>')
        g.append(f'<circle cx="{cx}" cy="408" r="60" fill="#22262b"/>')
        g.append(f'<circle cx="{cx}" cy="408" r="34" fill="#8a929b"/>')
        g.append(f'<circle cx="{cx}" cy="408" r="10" fill="#3a3f46"/>')
        for a in range(5):
            g.append(f'<rect x="{cx-3}" y="378" width="6" height="26" rx="3" fill="#5b636c" transform="rotate({a*72} {cx} 408)"/>')
    g.append('</g>')
    return "".join(g)

def dust(n, seed, box, color="#c9b89a", rmax=3.5, op=.55):
    r = random.Random(seed); x0, y0, x1, y1 = box
    return "".join(f'<circle cx="{r.uniform(x0,x1):.0f}" cy="{r.uniform(y0,y1):.0f}" r="{r.uniform(.8,rmax):.1f}" fill="{color}" opacity="{r.uniform(op*.5,op):.2f}"/>' for _ in range(n))

def sparkles(pts):
    return "".join(f'<path d="M{x} {y-14} L{x+3} {y-3} L{x+14} {y} L{x+3} {y+3} L{x} {y+14} L{x-3} {y+3} L{x-14} {y} L{x-3} {y-3} Z" fill="#fff" opacity=".9"/>' for x, y in pts)

CASES = {}
def case(slug):
    def deco(fn): CASES[slug] = fn; return fn
    return deco

@case("dent-repair")
def _(after):
    dent = '' if after else ('<ellipse cx="528" cy="352" rx="62" ry="34" fill="#000" opacity=".35"/>'
        '<ellipse cx="520" cy="346" rx="40" ry="20" fill="#000" opacity=".3"/>'
        '<path d="M470 340 Q500 360 528 350 Q556 342 586 362 M486 368 Q520 378 560 370" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/>')
    return studio() + car("#2f6db5", dent, gloss=after) + (sparkles([(520, 330)]) if after else "")

@case("bumper-repair")
def _(after):
    if after:
        extra = '<path d="M690 362 L732 362 Q736 384 726 400 L690 400 Z" fill="#b8bec5" opacity=".25"/>'
        return studio() + car("#d9dde2", extra)
    extra = ('<path d="M684 366 L740 378 Q742 400 728 418 L676 404 Z" fill="#c7ccd2" stroke="#7d848c" stroke-width="2"/>'
             '<path d="M700 372 L708 384 L700 392 L712 404" stroke="#3a3f46" stroke-width="3" fill="none"/>'
             '<path d="M690 330 L726 332" stroke="#000" stroke-opacity=".4" stroke-width="2"/>'
             + "".join(f'<path d="M{x} 360 l14 -6" stroke="#5b636c" stroke-width="2"/>' for x in range(640, 690, 9)))
    return studio() + car("#d9dde2", extra, gloss=False)

@case("scratch-painting")
def _(after):
    if after:
        return studio() + car("#b3261e", "") + sparkles([(470, 338), (610, 320)])
    r = random.Random(3)
    lines = "".join(f'<path d="M{x} {y} q{r.randint(40,90)} {r.randint(-12,12)} {r.randint(90,170)} {r.randint(-8,20)}" stroke="#f3e9e7" stroke-opacity=".8" stroke-width="{r.choice([1.2,1.8,2.4])}" fill="none"/>'
                    for x, y in [(r.randint(310, 520), r.randint(318, 392)) for _ in range(9)])
    return studio() + car("#b3261e", lines + '<rect x="560" y="356" width="70" height="26" rx="6" fill="#8d1d17" opacity=".7"/>', gloss=False)

@case("interior-cleaning")
def _(after):
    seat = ('<rect width="800" height="600" fill="#1f2328"/>'
            '<path d="M0 470 H800 V600 H0 Z" fill="#2b2f35"/>'
            '<path d="M80 120 Q400 70 720 120 L720 210 Q400 180 80 210 Z" fill="#2f343b"/>'
            '<circle cx="250" cy="170" r="54" fill="#15181b" stroke="#4b525b" stroke-width="10"/>'
            '<rect x="430" y="140" width="190" height="56" rx="10" fill="#0e1012"/>'
            '<path d="M140 240 Q170 220 300 226 Q330 230 330 270 L330 470 L130 470 L130 270 Q130 246 140 240 Z" fill="#5a4636"/>'
            '<path d="M470 240 Q500 220 630 226 Q660 230 660 270 L660 470 L460 470 L460 270 Q460 246 470 240 Z" fill="#5a4636"/>'
            '<path d="M150 360 H320 M480 360 H650" stroke="#000" stroke-opacity=".25" stroke-width="3"/>'
            '<rect x="350" y="300" width="100" height="170" rx="12" fill="#25292e"/>')
    if after:
        return seat + ('<path d="M150 250 Q220 238 300 244" stroke="#fff" stroke-opacity=".3" stroke-width="6" stroke-linecap="round"/>'
                       '<path d="M480 250 Q550 238 630 244" stroke="#fff" stroke-opacity=".3" stroke-width="6" stroke-linecap="round"/>'
                       '<path d="M450 160 L600 160" stroke="#4dd0ff" stroke-width="3" opacity=".7"/>') + sparkles([(300, 300), (620, 290), (540, 160)])
    stains = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#2e2015" opacity=".55"/>' for x, y, rx, ry in [(210, 320, 38, 22), (560, 400, 46, 26), (270, 420, 22, 14), (600, 300, 20, 12)])
    return seat + stains + dust(260, 7, (40, 470, 760, 590), "#a08a6a", 4, .8) + dust(120, 9, (120, 230, 680, 470), "#cbb89a", 3, .6) + dust(90, 11, (80, 110, 720, 210), "#9a9a9a", 2.5, .5)

@case("headlight-restoration")
def _(after):
    base = ('<rect width="800" height="600" fill="#9aa3ad"/>'
            '<path d="M0 0 H800 V600 H0 Z" fill="#2f6db5"/>'
            '<path d="M0 420 Q400 360 800 430 V600 H0 Z" fill="#245a96"/>'
            '<path d="M90 230 Q140 120 420 110 Q660 108 720 200 Q740 300 640 360 Q420 420 170 380 Q80 350 90 230 Z" fill="#1d2024"/>'
            '<path d="M110 236 Q156 136 420 128 Q648 128 700 206 Q716 292 630 344 Q420 400 180 362 Q100 334 110 236 Z" fill="#3a3f46"/>'
            '<circle cx="290" cy="248" r="86" fill="#cfd5dc"/><circle cx="290" cy="248" r="52" fill="#f2f4f6"/>'
            '<circle cx="520" cy="250" r="64" fill="#cfd5dc"/><circle cx="520" cy="250" r="36" fill="#f2f4f6"/>'
            '<path d="M170 340 Q420 372 640 316" stroke="#ffb27f" stroke-width="6" fill="none"/>')
    if after:
        return base + '<path d="M140 210 Q300 140 520 150" stroke="#fff" stroke-opacity=".65" stroke-width="12" stroke-linecap="round" fill="none"/>' + sparkles([(560, 170), (240, 200)])
    haze = ('<path d="M110 236 Q156 136 420 128 Q648 128 700 206 Q716 292 630 344 Q420 400 180 362 Q100 334 110 236 Z" fill="#c9a046" opacity=".62"/>'
            '<path d="M110 236 Q156 136 420 128 Q648 128 700 206 Q716 292 630 344 Q420 400 180 362 Q100 334 110 236 Z" fill="#e8e2d0" opacity=".35"/>')
    return base + haze + dust(220, 4, (120, 140, 700, 360), "#8a6a2a", 3, .5) + ''.join(f'<path d="M{x} {y} l{l} 4" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>' for x, y, l in [(200, 200, 60), (420, 180, 80), (520, 300, 50), (300, 320, 70)])

@case("ac-service")
def _(after):
    base = ('<rect width="800" height="600" fill="#1f2328"/>'
            '<path d="M60 160 Q400 110 740 160 L740 470 Q400 440 60 470 Z" fill="#2b2f35"/>'
            '<rect x="140" y="210" width="220" height="130" rx="22" fill="#0e1012"/>'
            '<rect x="440" y="210" width="220" height="130" rx="22" fill="#0e1012"/>'
            + ''.join(f'<rect x="156" y="{y}" width="188" height="10" rx="5" fill="#3a3f46"/><rect x="456" y="{y}" width="188" height="10" rx="5" fill="#3a3f46"/>' for y in (232, 256, 280, 304))
            + '<rect x="300" y="380" width="200" height="60" rx="10" fill="#0a0c0e" stroke="#3a3f46" stroke-width="3"/>')
    if after:
        flow = ''.join(f'<path d="M{x} 350 q-20 40 0 80 q20 40 0 80" stroke="#7fd3ff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>' for x in (200, 250, 300, 500, 550, 600))
        return base + flow + '<text x="400" y="424" text-anchor="middle" font-family="Courier New, monospace" font-size="36" font-weight="700" fill="#4dd0ff">18°C</text>' + '<path d="M690 110 v60 M664 125 l52 30 M664 155 l52 -30" stroke="#7fd3ff" stroke-width="5" stroke-linecap="round"/>'
    flow = ''.join(f'<path d="M{x} 350 q-14 26 0 52" stroke="#ff9a5a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55" stroke-dasharray="6 8"/>' for x in (220, 300, 520, 600))
    return base + flow + '<text x="400" y="424" text-anchor="middle" font-family="Courier New, monospace" font-size="36" font-weight="700" fill="#ff6b1a">31°C</text>' + dust(140, 5, (140, 210, 660, 340), "#8b8b8b", 2.5, .6)

@case("engine-bay")
def _(after):
    metal = "#9aa3ad" if after else "#6b6256"
    base = (f'<rect width="800" height="600" fill="#15181b"/>'
            f'<path d="M40 120 H760 L720 560 H80 Z" fill="#23272c"/>'
            f'<rect x="220" y="190" width="360" height="200" rx="18" fill="{metal}"/>'
            f'<rect x="250" y="160" width="300" height="56" rx="12" fill="#2f343b"/>'
            + ''.join(f'<rect x="{x}" y="230" width="44" height="120" rx="8" fill="#3a3f46"/>' for x in (262, 330, 398, 466))
            + f'<rect x="90" y="190" width="100" height="140" rx="10" fill="#1d2024" stroke="#3a3f46" stroke-width="4"/>'
            f'<circle cx="140" cy="230" r="16" fill="{"#ffd25a" if after else "#7a6430"}"/>'
            f'<rect x="610" y="200" width="110" height="80" rx="10" fill="#141619"/><rect x="622" y="186" width="20" height="16" fill="#c0262b"/><rect x="688" y="186" width="20" height="16" fill="#3a3f46"/>'
            f'<path d="M190 420 Q300 470 420 430 T640 440" stroke="#111" stroke-width="16" fill="none" stroke-linecap="round"/>'
            f'<circle cx="640" cy="420" r="46" fill="#2b2f35" stroke="#3a3f46" stroke-width="6"/>')
    if after:
        return base + '<path d="M240 206 H560" stroke="#fff" stroke-opacity=".45" stroke-width="8" stroke-linecap="round"/>' + sparkles([(560, 200), (300, 380), (680, 230)])
    grime = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#0b0a08" opacity=".6"/>' for x, y, rx, ry in [(300, 370, 60, 18), (500, 220, 50, 16), (420, 380, 40, 12), (150, 300, 30, 40), (660, 260, 40, 16)])
    drips = ''.join(f'<path d="M{x} 390 q4 20 0 34 q-4 -14 0 -34" fill="#0b0a08"/>' for x in (290, 340, 470))
    return base + grime + drips + dust(300, 12, (60, 140, 740, 540), "#a18f74", 3.5, .55)

@case("suspension-repair")
def _(after):
    spring = "#b8c0c8" if after else "#8a5a2b"
    shock = "#1d2024" if after else "#4a4038"
    base = ('<rect width="800" height="600" fill="url(#wall)"/>'
            '<circle cx="400" cy="470" r="200" fill="#141619"/><circle cx="400" cy="470" r="180" fill="#22262b"/><circle cx="400" cy="470" r="100" fill="#8a929b"/>'
            f'<rect x="370" y="60" width="60" height="300" rx="14" fill="{shock}"/>'
            f'<rect x="384" y="40" width="32" height="60" rx="8" fill="#5b636c"/>'
            + ''.join(f'<path d="M330 {y} Q400 {y-22} 470 {y} Q400 {y+22} 330 {y}" stroke="{spring}" stroke-width="16" fill="none"/>' for y in range(110, 340, 36))
            + '<rect x="320" y="340" width="160" height="34" rx="8" fill="#3a3f46"/>')
    if after:
        return base + '<path d="M385 70 V340" stroke="#fff" stroke-opacity=".3" stroke-width="6"/>' + sparkles([(480, 140), (320, 250)])
    rust = dust(220, 21, (320, 90, 480, 360), "#b4581c", 5, .75)
    leak = '<path d="M372 300 q-8 30 -4 70 q4 20 10 -10 q-2 -30 -6 -60 Z" fill="#0b0a08" opacity=".8"/>'
    crack = '<path d="M330 352 l20 10 l-10 8 l18 6" stroke="#0e1012" stroke-width="3" fill="none"/>'
    return base + rust + leak + crack

@case("accident-restoration")
def _(after):
    if after:
        return studio() + car("#e9edf1", "") + sparkles([(650, 300)])
    crushed = "M78 402 L78 345 Q84 316 122 308 L232 290 Q292 226 362 212 L522 208 Q560 214 584 252 L606 270 L640 262 L652 296 L676 312 L668 336 L690 352 L672 372 L684 402 Z"
    extra = ('<path d="M584 252 L612 286 L640 262 M606 270 L650 318 M640 300 L676 312" stroke="#000" stroke-opacity=".5" stroke-width="3" fill="none"/>'
             '<path d="M450 230 L500 270 L470 290 M500 270 L560 250 M500 270 L540 292" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none"/>'
             '<path d="M660 320 l18 6 l-12 10" fill="#fff4cf" stroke="#3a3f46"/>'
             + dust(40, 31, (600, 380, 760, 470), "#c7ccd2", 4, .8))
    return studio() + car("#e9edf1", extra, gloss=False, front_override=crushed, tilt=1.2)

@case("exterior-detailing")
def _(after):
    if after:
        refl = ('<path d="M130 330 Q400 300 690 324" stroke="#fff" stroke-opacity=".7" stroke-width="7" fill="none" stroke-linecap="round"/>'
                '<path d="M280 378 Q420 368 560 376" stroke="#fff" stroke-opacity=".35" stroke-width="4" fill="none"/>')
        return studio() + car("#141619", refl) + sparkles([(250, 300), (520, 230), (660, 318), (400, 360)])
    film = f'<path d="{BODY}" fill="#c9c2b4" opacity=".28"/>'
    spots = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="#d8d3c8" stroke-opacity=".55" stroke-width="1.5"/>' for x, y, r in [(180, 340, 9), (320, 360, 7), (520, 330, 10), (610, 372, 8), (420, 384, 6), (260, 376, 11)])
    return studio() + car("#141619", film + spots + dust(320, 41, (90, 220, 720, 400), "#c9b89a", 2.4, .7), gloss=False, dull=True)

TITLES = {
    "dent-repair": ("Illustration: blue car with a deep dent in the rear door before repair", "Illustration: the same blue car with the door panel smooth after dent repair"),
    "bumper-repair": ("Illustration: silver car with a cracked, hanging front bumper before repair", "Illustration: the same silver car with the front bumper refitted after repair"),
    "scratch-painting": ("Illustration: red car door covered in scratches before painting", "Illustration: the same red car door glossy and scratch-free after painting"),
    "interior-cleaning": ("Illustration: dirty car interior with stained seats and dusty floor before cleaning", "Illustration: the same car interior with clean seats and floor after deep cleaning"),
    "headlight-restoration": ("Illustration: yellowed, hazy headlight lens before restoration", "Illustration: the same headlight with a clear lens after restoration"),
    "ac-service": ("Illustration: car AC vents blowing warm air at 31 degrees before service", "Illustration: the same car AC vents blowing cold air at 18 degrees after service"),
    "engine-bay": ("Illustration: greasy, dusty engine bay with oil stains before cleaning", "Illustration: the same engine bay clean after cleaning and maintenance"),
    "suspension-repair": ("Illustration: rusty coil spring and leaking shock absorber before repair", "Illustration: the same suspension with a new spring and shock absorber after repair"),
    "accident-restoration": ("Illustration: white car with a crushed front and cracked windscreen after an accident", "Illustration: the same white car fully restored after accident repair"),
    "exterior-detailing": ("Illustration: black car with dull, dusty paint and water spots before detailing", "Illustration: the same black car with glossy, reflective paint after detailing"),
}

if __name__ == "__main__":
    for slug, fn in CASES.items():
        for after in (False, True):
            name = f"{slug}-{'after' if after else 'before'}.svg"
            with open(os.path.join(GAL, name), "w") as f:
                f.write(svg(fn(after), TITLES[slug][after]))
    # Hero / workshop banner: car on a two-post lift
    lift = ('<rect x="70" y="150" width="34" height="320" rx="6" fill="#ff6b1a"/><rect x="696" y="150" width="34" height="320" rx="6" fill="#ff6b1a"/>'
            '<rect x="56" y="140" width="62" height="18" rx="4" fill="#d9530a"/><rect x="682" y="140" width="62" height="18" rx="4" fill="#d9530a"/>'
            '<path d="M104 430 H250 M696 430 H550" stroke="#9aa3ad" stroke-width="12" stroke-linecap="round"/>')
    hero = studio() + lift + f'<g transform="translate(0 -40)">{car("#2f6db5", "")}</g>' + \
        '<g fill="#9aa3ad"><rect x="300" y="500" width="200" height="16" rx="8"/><rect x="560" y="490" width="90" height="34" rx="6" fill="#c0262b"/></g>'
    with open(os.path.join(OUT, "hero-workshop.svg"), "w") as f:
        f.write(svg(hero, "Illustration: a car raised on a two-post lift in a workshop"))
    print("Wrote", len(CASES) * 2, "gallery illustrations + hero-workshop.svg")
