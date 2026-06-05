from PIL import Image, ImageDraw, ImageFont
import os, re

FONT_DIR = r"C:\Windows\Fonts"
W, H = 1000, 700
BG = (248, 249, 250)
DARK_BLUE = (26, 58, 92)
MED_BLUE = (33, 97, 143)
LIGHT_BLUE = (66, 133, 184)
ACCENT = (212, 149, 106)
GREEN = (46, 125, 50)
PURPLE = (106, 27, 154)
WHITE = (255, 255, 255)
GRAY = (100, 100, 100)
LIGHT_GRAY = (220, 224, 228)
NEAR_WHITE = (245, 246, 248)
ORCH_BG = (232, 240, 254)
INFRA_BG = (240, 245, 240)

img = Image.new('RGB', (W, H), BG)
draw = ImageDraw.Draw(img)

try:
    font_title = ImageFont.truetype(os.path.join(FONT_DIR, 'calibrib.ttf'), 20)
    font_section = ImageFont.truetype(os.path.join(FONT_DIR, 'calibrib.ttf'), 14)
    font_label = ImageFont.truetype(os.path.join(FONT_DIR, 'calibri.ttf'), 11)
    font_small = ImageFont.truetype(os.path.join(FONT_DIR, 'calibri.ttf'), 9)
    font_bold_small = ImageFont.truetype(os.path.join(FONT_DIR, 'calibrib.ttf'), 10)
except:
    font_title = ImageFont.load_default()
    font_section = font_label = font_small = font_bold_small = font_title

def rbox(xy, r=8, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, r, fill=fill, outline=outline, width=width)

def ctext(cx, cy, text, fill, font):
    bb = draw.textbbox((0, 0), text, font=font)
    draw.text((cx - (bb[2]-bb[0])//2, cy), text, fill=fill, font=font)

def arrow(cx, y1, y2):
    draw.line([(cx, y1), (cx, y2)], fill=GRAY, width=2)
    draw.polygon([(cx - 5, y2 - 5), (cx + 5, y2 - 5), (cx, y2 + 3)], fill=GRAY)

def center_box_text(cx, cy, lines, fonts, colors, line_h=15):
    total = len(lines) * line_h
    sy = cy - total // 2
    for i, line in enumerate(lines):
        bb = draw.textbbox((0, 0), line, font=fonts[i] if isinstance(fonts, list) else fonts)
        draw.text((cx - (bb[2]-bb[0])//2, sy + i * line_h), line,
                  fill=colors[i] if isinstance(colors, list) else colors,
                  font=fonts[i] if isinstance(fonts, list) else fonts)

draw.text((30, 20), "Architettura del sistema \u2014 Piattaforma B2B Luis S.r.l.", fill=DARK_BLUE, font=font_title)
draw.line([(30, 48), (970, 48)], fill=LIGHT_GRAY, width=1)

# Layer 1: Client
cy = 85
rbox((W//2 - 120, cy - 19, W//2 + 120, cy + 19), 6, fill=NEAR_WHITE, outline=GRAY, width=2)
ctext(W//2, cy - 5, "Client Browser", GRAY, font_bold_small)
arrow(W//2, cy + 19, cy + 65)

# Layer 2: Next.js Frontend
cy = 150
rbox((W//2 - 140, cy - 19, W//2 + 140, cy + 19), 6, fill=LIGHT_BLUE, outline=(41, 98, 143), width=2)
ctext(W//2, cy - 7, "Next.js Frontend", WHITE, font_bold_small)
ctext(W//2, cy + 8, "App Router \u2014 Server-Side Rendering", (220, 235, 255), font_small)
arrow(W//2, cy + 19, cy + 65)

# Layer 3: API Routes
cy = 215
rbox((W//2 - 140, cy - 19, W//2 + 140, cy + 19), 6, fill=NEAR_WHITE, outline=MED_BLUE, width=2)
ctext(W//2, cy - 5, "API Routes (Next.js)", DARK_BLUE, font_bold_small)
arrow(W//2, cy + 19, cy + 65)

# Layer 4: Orchestrator
cy = 290
ow, oh = 700, 100
rbox((W//2 - ow//2, cy - oh//2, W//2 + ow//2, cy + oh//2), 8, fill=ORCH_BG, outline=MED_BLUE, width=2)
ctext(W//2, cy - oh//2 + 10, "AI Orchestration Layer", MED_BLUE, font_section)

subs = [
    (W//2 - 200, "Prompt Manager", "Gestione template prompt"),
    (W//2,      "Cache (Redis)",    "Caching embedding e risposte"),
    (W//2 + 200, "Rate Limiter",     "Controllo consumi API AI"),
]
sbw, sbh = 180, 44
for sx, sl, ss in subs:
    rbox((sx - sbw//2, cy - sbh//2, sx + sbw//2, cy + sbh//2), 5, fill=WHITE, outline=LIGHT_BLUE, width=1)
    ctext(sx, cy - 8, sl, MED_BLUE, font_bold_small)
    ctext(sx, cy + 8, ss, GRAY, font_small)

arrow(W//2, cy + oh//2, cy + 57)

# Layer 5: Infrastructure
cy = 448
iw, ih = 760, 190
rbox((W//2 - iw//2, cy - ih//2, W//2 + iw//2, cy + ih//2), 8, fill=INFRA_BG, outline=GREEN, width=2)
ctext(W//2, cy - ih//2 + 10, "Infrastruttura e servizi", GREEN, font_section)

infra = [
    (W//2 - 210, cy - 48, "RunPod Serverless", ["GPU Cloud a consumo", "Qwen 3.5 27B LLM", "da $0.34/h (RTX 4090)"], MED_BLUE),
    (W//2 + 210, cy - 48, "PostgreSQL + pgvector", ["Database principale", "Embedding vettoriali", "Catalogo, utenti, ordini"], PURPLE),
    (W//2 - 210, cy + 48, "Cloudflare R2 / S3", ["Storage immagini", "Foto sfondo bianco", "Immagini ambientate"], ACCENT),
    (W//2 + 210, cy + 48, "External AI APIs", ["Generazione immagini", "DALL-E 3 / Stable Diffusion", "Midjourney API"], (198, 40, 40)),
]
ibw, ibh = 240, 62
for ix, iy, il, iil, ic in infra:
    rbox((ix - ibw//2, iy - ibh//2, ix + ibw//2, iy + ibh//2), 6, fill=WHITE, outline=ic, width=2)
    ctext(ix, iy - ibh//2 + 7, il, ic, font_bold_small)
    for si, sline in enumerate(iil):
        ctext(ix, iy - ibh//2 + 25 + si * 12, sline, GRAY, font_small)

# Legend
leg_y = 665
legs = [
    (30, "Client / Browser", GRAY),
    (200, "Frontend / API", LIGHT_BLUE),
    (390, "AI Orchestration", MED_BLUE),
    (560, "Infrastructure", GREEN),
    (760, "External Services", (198, 40, 40)),
]
for lx, lt, lc in legs:
    draw.rectangle([lx, leg_y, lx + 14, leg_y + 14], fill=lc)
    ctext(lx + 22, leg_y - 1, lt, DARK_BLUE, font_small)

img.save("architettura.png")
print("Diagramma salvato: architettura.png")

# Update markdown
with open("specifiche-b2b-luis.md", "r", encoding="utf-8") as f:
    md = f.read()

# Find the arch section with the code block
# Search for the ### 15.4 Architettura marker
idx = md.find("### 15.4 Architettura")
if idx >= 0:
    # Find the code block after this
    cb_start = md.find("```", idx)
    if cb_start >= 0:
        cb_end = md.find("```", cb_start + 3)
        if cb_end >= 0:
            cb_end += 3  # include closing ```
        
        new_block = f"""### 15.4 Architettura

![Architettura del sistema](architettura.png)

*Schema architetturale della piattaforma B2B. Il browser client si connette al frontend Next.js (Server-Side Rendering), che instrada le richieste all\u2019AI Orchestration Layer via API Routes. Il layer di orchestrazione (FastAPI) gestisce prompt, cache Redis e rate limiting, e si interfaccia con RunPod Serverless (Qwen 27B LLM), PostgreSQL + pgvector (dati ed embedding vettoriali), Cloudflare R2/S3 (immagini) e API esterne per generazione immagini (DALL-E, Stable Diffusion).*
"""
        md = md[:idx] + new_block + md[cb_end:]
        with open("specifiche-b2b-luis.md", "w", encoding="utf-8") as f:
            f.write(md)
        print("Markdown aggiornato con riferimento all'immagine!")
    else:
        print("Code block start not found")
else:
    print("Section 15.4 not found")
    # search deeper
    for m in re.finditer(r'###\s+15\.4\s+Architettura', md):
        print(f"Found at {m.start()}")
