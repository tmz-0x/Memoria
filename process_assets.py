import os
from PIL import Image

os.makedirs('public/assets', exist_ok=True)
os.makedirs('src/assets', exist_ok=True)

def black_to_alpha(img, threshold=15, boost=1.2):
    """Converts black/dark background to transparent alpha while preserving bright glow."""
    img = img.convert('RGBA')
    datas = img.getdata()
    new_data = []
    for item in datas:
        r, g, b, _ = item
        # Luminance
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        if lum <= threshold:
            new_data.append((0, 0, 0, 0))
        else:
            # Scale alpha smoothly from threshold to 255
            alpha = min(255, int(((lum - threshold) / (255 - threshold)) * 255 * boost))
            new_data.append((r, g, b, alpha))
    img.putdata(new_data)
    return img

print("1. Processing screen.png -> hero-stage-scene.jpg")
im_stage = Image.open('Assets/screen.png')
im_stage.convert('RGB').save('public/assets/hero-stage-scene.jpg', quality=95)
im_stage.convert('RGB').save('src/assets/hero-stage-scene.jpg', quality=95)

print("2. Processing screen1.png -> star-sparkle-texture.png")
im_stars = Image.open('Assets/screen1.png')
im_stars.save('public/assets/star-sparkle-texture.png')
im_stars.save('src/assets/star-sparkle-texture.png')

print("3. Processing screen3.png -> spotlight-beam.png with transparency")
im_beam = Image.open('Assets/screen3.png')
im_beam_alpha = black_to_alpha(im_beam, threshold=12, boost=1.25)
im_beam_alpha.save('public/assets/spotlight-beam.png')
im_beam_alpha.save('src/assets/spotlight-beam.png')

print("4. Processing screen4.png -> ticket-frame.png")
im_ticket = Image.open('Assets/screen4.png')
im_ticket.save('public/assets/ticket-frame.png')
im_ticket.save('src/assets/ticket-frame.png')

print("5. Processing screen7.png -> moon-starfield.png & isolated crescent moon")
im_moonfield = Image.open('Assets/screen7.png')
im_moonfield.save('public/assets/moon-starfield.png')
im_moonfield.save('src/assets/moon-starfield.png')

# Crop crescent moon from screen7
# The moon is located on the left side: approx x in [100, 750], y in [150, 750]
moon_crop = im_moonfield.crop((80, 160, 780, 768))
moon_alpha = black_to_alpha(moon_crop, threshold=15, boost=1.15)
moon_alpha.save('public/assets/moon-crescent.png')
moon_alpha.save('src/assets/moon-crescent.png')

print("6. Processing screen8.png -> candlelit-venue.jpg")
im_venue = Image.open('Assets/screen8.png')
im_venue.convert('RGB').save('public/assets/candlelit-venue.jpg', quality=95)
im_venue.convert('RGB').save('src/assets/candlelit-venue.jpg', quality=95)

print("7. Extracting 4 individual icons from screen9.png with alpha transparency")
im_icons = Image.open('Assets/screen9.png')
w, h = im_icons.size

# The 4 icons are horizontally arranged:
# 1. Music note: ~ [50, 320]
# 2. Dancing couple: ~ [350, 680]
# 3. Couple with heart: ~ [700, 1000]
# 4. Camera: ~ [1020, 1340]
icon_boxes = [
    ('icon-music.png', (40, 200, 310, 660)),
    ('icon-dance.png', (360, 200, 670, 660)),
    ('icon-couple.png', (700, 200, 990, 660)),
    ('icon-camera.png', (1020, 200, 1340, 660)),
]

for name, box in icon_boxes:
    cropped = im_icons.crop(box)
    alpha_icon = black_to_alpha(cropped, threshold=12, boost=1.3)
    # Trim empty borders
    bbox = alpha_icon.getbbox()
    if bbox:
        # Add a little padding
        pad = 12
        left = max(0, bbox[0] - pad)
        top = max(0, bbox[1] - pad)
        right = min(alpha_icon.width, bbox[2] + pad)
        bottom = min(alpha_icon.height, bbox[3] + pad)
        alpha_icon = alpha_icon.crop((left, top, right, bottom))
    alpha_icon.save(f'public/assets/{name}')
    alpha_icon.save(f'src/assets/{name}')
    print(f"  Extracted {name} (size: {alpha_icon.size})")

print("All asset elements extracted successfully!")
