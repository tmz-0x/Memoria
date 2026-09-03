import math
import os
from PIL import Image, ImageDraw, ImageFilter

os.makedirs('public/assets', exist_ok=True)
os.makedirs('src/assets', exist_ok=True)

# 1. hero-stage-scene.jpg (1920x1080)
# Deep violet concert stage, theatrical wooden floor boards, velvet curtains, rim light haze
def create_stage_scene():
    w, h = 1920, 1080
    img = Image.new('RGB', (w, h), (13, 5, 24))
    draw = ImageDraw.Draw(img)
    
    # Stage floor perspective (bottom third)
    horizon = int(h * 0.65)
    for y in range(horizon, h):
        factor = (y - horizon) / (h - horizon)
        # Deep wood gradient with purple tint
        r = int(18 + 15 * factor)
        g = int(10 + 8 * factor)
        b = int(32 + 20 * factor)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    
    # Perspective plank lines
    center_x = w // 2
    for i in range(-20, 21):
        x_bottom = center_x + i * 85
        x_top = center_x + int(i * 22)
        draw.line([(x_top, horizon), (x_bottom, h)], fill=(35, 20, 55), width=2)

    # Velvet drape arches at edges
    curtain_overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(curtain_overlay)
    # Left drape
    cdraw.polygon([
        (0, 0), (int(w*0.22), 0), (int(w*0.14), int(h*0.7)), (0, h)
    ], fill=(22, 9, 38, 220))
    # Right drape
    cdraw.polygon([
        (w, 0), (w - int(w*0.22), 0), (w - int(w*0.14), int(h*0.7)), (w, h)
    ], fill=(22, 9, 38, 220))
    # Proscenium top border
    cdraw.rectangle([(0, 0), (w, int(h*0.08))], fill=(18, 7, 30, 240))
    
    # Backdrop ambient glow in center
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    for rad in range(500, 50, -30):
        alpha = int(25 * (1 - rad/500))
        gdraw.ellipse([
            (center_x - rad, int(h*0.45) - int(rad*0.7)),
            (center_x + rad, int(h*0.45) + int(rad*0.7))
        ], fill=(192, 78, 207, alpha))
        
    img = Image.alpha_composite(img.convert('RGBA'), curtain_overlay)
    img = Image.alpha_composite(img, glow)
    img = img.filter(ImageFilter.GaussianBlur(1.5)).convert('RGB')
    
    img.save('public/assets/hero-stage-scene.jpg', quality=95)
    img.save('src/assets/hero-stage-scene.jpg', quality=95)

# 2. spotlight-beam.png (800x1200, transparent volumetric beam)
def create_spotlight_beam():
    w, h = 800, 1200
    beam = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(beam)
    
    apex_x = w // 2
    apex_y = 0
    
    # Layered volumetric cone with magenta/white gradient
    for step in range(60, 0, -2):
        spread = int(step * 6)
        alpha = int(70 * (1 - step/60))
        pts = [
            (apex_x, apex_y),
            (apex_x - spread, h),
            (apex_x + spread, h)
        ]
        draw.polygon(pts, fill=(224, 102, 255, alpha))
        
    # Bright inner core
    for step in range(25, 0, -1):
        spread = int(step * 3)
        alpha = int(110 * (1 - step/25))
        pts = [
            (apex_x, apex_y),
            (apex_x - spread, h),
            (apex_x + spread, h)
        ]
        draw.polygon(pts, fill=(245, 230, 255, alpha))
        
    beam = beam.filter(ImageFilter.GaussianBlur(18))
    beam.save('public/assets/spotlight-beam.png')
    beam.save('src/assets/spotlight-beam.png')

# 3. moon-starfield.png (1000x1000, transparent starfield with luminous moon)
def create_moon_starfield():
    w, h = 1000, 1000
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cx, cy = w // 2, h // 2
    
    # Atmospheric moon outer glow
    for rad in range(360, 180, -10):
        alpha = int(45 * ((360 - rad) / 180))
        draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(192, 78, 207, alpha))
    for rad in range(250, 180, -5):
        alpha = int(75 * ((250 - rad) / 70))
        draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(255, 179, 217, alpha))
        
    # Moon disc
    moon_rad = 180
    draw.ellipse([cx - moon_rad, cy - moon_rad, cx + moon_rad, cy + moon_rad], fill=(245, 240, 255, 250))
    
    # Subtle lunar craters and textures
    craters = [
        (cx - 50, cy - 40, 35, (220, 210, 238, 180)),
        (cx + 60, cy + 30, 45, (215, 200, 235, 170)),
        (cx - 20, cy + 70, 28, (225, 215, 242, 190)),
        (cx + 40, cy - 80, 22, (218, 205, 236, 160)),
        (cx + 80, cy - 20, 18, (222, 212, 240, 170)),
        (cx - 90, cy + 20, 30, (215, 205, 235, 160)),
    ]
    for x, y, r, color in craters:
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)
        
    # Golden coronal rim on outer perimeter
    for angle in range(0, 360, 3):
        rad = math.radians(angle)
        px = cx + math.cos(rad) * moon_rad
        py = cy + math.sin(rad) * moon_rad
        draw.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(212, 175, 55, 120))
        
    img = img.filter(ImageFilter.GaussianBlur(2))
    img.save('public/assets/moon-starfield.png')
    img.save('src/assets/moon-starfield.png')

# 4. star-sparkle-texture.png (600x600, transparent sparkling stars)
def create_star_sparkle():
    w, h = 600, 600
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    stars = [
        (300, 300, 45, (255, 255, 255, 255), (212, 175, 55, 180)),
        (120, 140, 28, (255, 240, 255, 240), (224, 102, 255, 160)),
        (480, 160, 34, (255, 250, 240, 240), (212, 175, 55, 160)),
        (180, 460, 32, (255, 255, 255, 230), (255, 179, 217, 160)),
        (440, 450, 26, (255, 240, 255, 230), (224, 102, 255, 150)),
        (80, 330, 18, (240, 240, 255, 200), (192, 78, 207, 130)),
        (520, 320, 20, (255, 245, 230, 210), (212, 175, 55, 140)),
    ]
    
    for sx, sy, size, core_c, glow_c in stars:
        # Glow circle
        draw.ellipse([sx - size, sy - size, sx + size, sy + size], fill=glow_c)
        # 4-point star cross
        draw.polygon([(sx, sy - size*1.5), (sx + size*0.2, sy), (sx, sy + size*1.5), (sx - size*0.2, sy)], fill=core_c)
        draw.polygon([(sx - size*1.5, sy), (sx, sy + size*0.2), (sx + size*1.5, sy), (sx, sy - size*0.2)], fill=core_c)
        # Diagonal sparks
        diag = size * 0.7
        draw.polygon([(sx - diag, sy - diag), (sx, sy), (sx + diag, sy + diag)], fill=core_c)
        draw.polygon([(sx + diag, sy - diag), (sx, sy), (sx - diag, sy + diag)], fill=core_c)

    img = img.filter(ImageFilter.GaussianBlur(1))
    img.save('public/assets/star-sparkle-texture.png')
    img.save('src/assets/star-sparkle-texture.png')

# 5. ticket-frame.png (800x1100, ornate gold filigree border with transparent center)
def create_ticket_frame():
    w, h = 800, 1100
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer gold border
    draw.rounded_rectangle([20, 20, w - 20, h - 20], radius=32, outline=(212, 175, 55, 240), width=3)
    # Inner thin gold border
    draw.rounded_rectangle([32, 32, w - 32, h - 32], radius=24, outline=(201, 162, 39, 140), width=1)
    
    # Side notch cutouts (classic concert ticket)
    notch_y = int(h * 0.72)
    notch_r = 30
    draw.ellipse([-notch_r, notch_y - notch_r, notch_r, notch_y + notch_r], fill=(0, 0, 0, 0))
    draw.ellipse([w - notch_r, notch_y - notch_r, w + notch_r, notch_y + notch_r], fill=(0, 0, 0, 0))
    # Dashed divider line across notch
    for x in range(50, w - 50, 24):
        draw.line([(x, notch_y), (x + 12, notch_y)], fill=(212, 175, 55, 160), width=2)
        
    # Corner ornaments
    corners = [(45, 45), (w - 45, 45), (45, h - 45), (w - 45, h - 45)]
    for cx, cy in corners:
        draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(255, 179, 217, 220))
        draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(212, 175, 55, 255))
        
    img.save('public/assets/ticket-frame.png')
    img.save('src/assets/ticket-frame.png')

# 6. gold-blossom-divider.png (1200x120, ornamental divider)
def create_gold_blossom_divider():
    w, h = 1200, 120
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    cy = h // 2
    cx = w // 2
    
    # Horizontal tapered gold line
    for x in range(100, w - 100):
        dist = abs(x - cx)
        alpha = int(220 * (1 - dist / (w/2 - 100)))
        if alpha > 0:
            draw.line([(x, cy), (x, cy + 1)], fill=(212, 175, 55, alpha))
            
    # Center crest: crescent moon & blossom
    draw.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], outline=(212, 175, 55, 230), width=2)
    draw.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], fill=(255, 143, 199, 210))
    draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(255, 255, 255, 250))
    
    # Symmetrical cherry blossoms along the line
    petals = [-280, -180, -90, 90, 180, 280]
    for offset in petals:
        px = cx + offset
        for angle in range(0, 360, 72):
            rad = math.radians(angle)
            lx = px + math.cos(rad) * 10
            ly = cy + math.sin(rad) * 10
            draw.ellipse([lx - 4, ly - 4, lx + 4, ly + 4], fill=(255, 179, 217, 190))
        draw.ellipse([px - 3, cy - 3, px + 3, cy + 3], fill=(212, 175, 55, 240))

    img = img.filter(ImageFilter.GaussianBlur(0.8))
    img.save('public/assets/gold-blossom-divider.png')
    img.save('src/assets/gold-blossom-divider.png')

# 7. candlelit-venue.jpg (1920x1080, warm intimate candlelit auditorium)
def create_candlelit_venue():
    w, h = 1920, 1080
    img = Image.new('RGB', (w, h), (13, 5, 24))
    draw = ImageDraw.Draw(img)
    
    # Deep warm gradient background
    for y in range(h):
        factor = y / h
        r = int(18 + 35 * factor)
        g = int(8 + 15 * factor)
        b = int(28 + 12 * factor)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
        
    # Warm candlelit bokeh circles
    bokeh = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(bokeh)
    
    import random
    random.seed(42)
    for _ in range(90):
        bx = random.randint(50, w - 50)
        by = random.randint(int(h * 0.35), h - 30)
        br = random.randint(15, 65)
        # Gold/amber candle glow
        alpha = random.randint(25, 80)
        bdraw.ellipse([bx - br, by - br, bx + br, by + br], fill=(212, 160, 45, alpha))
        # Inner warm flame
        bdraw.ellipse([bx - int(br*0.3), by - int(br*0.4), bx + int(br*0.3), by + int(br*0.2)], fill=(255, 240, 180, alpha + 50))
        
    img = Image.alpha_composite(img.convert('RGBA'), bokeh)
    img = img.filter(ImageFilter.GaussianBlur(3)).convert('RGB')
    img.save('public/assets/candlelit-venue.jpg', quality=95)
    img.save('src/assets/candlelit-venue.jpg', quality=95)

# 8. Icons: icon-music.png, icon-dance.png, icon-couple.png, icon-camera.png (128x128)
def create_icons():
    icons = [
        ('icon-music.png', 'music'),
        ('icon-dance.png', 'dance'),
        ('icon-couple.png', 'couple'),
        ('icon-camera.png', 'camera')
    ]
    
    for filename, icon_type in icons:
        size = 128
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Soft background glow
        draw.ellipse([8, 8, size - 8, size - 8], fill=(192, 78, 207, 40))
        draw.ellipse([16, 16, size - 16, size - 16], outline=(212, 175, 55, 180), width=2)
        
        cx, cy = size // 2, size // 2
        
        if icon_type == 'music':
            # Eighth notes
            draw.ellipse([cx - 24, cy + 10, cx - 8, cy + 24], fill=(255, 179, 217, 240))
            draw.ellipse([cx + 6, cy + 4, cx + 22, cy + 18], fill=(255, 179, 217, 240))
            draw.line([(cx - 8, cy + 16), (cx - 8, cy - 22)], fill=(212, 175, 55, 255), width=3)
            draw.line([(cx + 22, cy + 10), (cx + 22, cy - 28)], fill=(212, 175, 55, 255), width=3)
            draw.line([(cx - 8, cy - 20), (cx + 22, cy - 26)], fill=(212, 175, 55, 255), width=5)
        elif icon_type == 'dance':
            # Dancing silhouette ribbon
            draw.ellipse([cx - 6, cy - 26, cx + 6, cy - 14], fill=(212, 175, 55, 240))
            draw.line([(cx, cy - 14), (cx - 8, cy + 6)], fill=(255, 179, 217, 240), width=3)
            draw.line([(cx - 8, cy + 6), (cx - 22, cy + 26)], fill=(212, 175, 55, 240), width=3)
            draw.line([(cx - 8, cy + 6), (cx + 18, cy + 20)], fill=(212, 175, 55, 240), width=3)
            draw.arc([cx - 24, cy - 10, cx + 24, cy + 18], start=200, end=360, fill=(255, 143, 199, 220), width=3)
        elif icon_type == 'couple':
            # Two silhouettes / hearts
            draw.ellipse([cx - 16, cy - 18, cx - 2, cy - 4], fill=(212, 175, 55, 240))
            draw.ellipse([cx + 2, cy - 16, cx + 16, cy - 2], fill=(255, 179, 217, 240))
            draw.chord([cx - 24, cy - 4, cx + 4, cy + 24], start=180, end=360, fill=(212, 175, 55, 200))
            draw.chord([cx - 4, cy - 2, cx + 24, cy + 24], start=180, end=360, fill=(255, 179, 217, 200))
        elif icon_type == 'camera':
            # Vintage camera
            draw.rounded_rectangle([cx - 26, cy - 14, cx + 26, cy + 22], radius=6, outline=(212, 175, 55, 240), width=3)
            draw.rectangle([cx - 10, cy - 22, cx + 10, cy - 14], fill=(212, 175, 55, 220))
            draw.ellipse([cx - 12, cy - 4, cx + 12, cy + 14], outline=(255, 179, 217, 240), width=3)
            draw.ellipse([cx + 14, cy - 8, cx + 18, cy - 4], fill=(255, 255, 255, 230))
            
        img.save(f'public/assets/{filename}')
        img.save(f'src/assets/{filename}')

print("Generating stage scene...")
create_stage_scene()
print("Generating spotlight beam...")
create_spotlight_beam()
print("Generating moon starfield...")
create_moon_starfield()
print("Generating star sparkle...")
create_star_sparkle()
print("Generating ticket frame...")
create_ticket_frame()
print("Generating gold blossom divider...")
create_gold_blossom_divider()
print("Generating candlelit venue...")
create_candlelit_venue()
print("Generating icons...")
create_icons()
print("Asset generation complete!")
