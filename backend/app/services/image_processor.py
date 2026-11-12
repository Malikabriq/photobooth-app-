import os
import base64
import uuid
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "demo"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "demo"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "demo"),
)

# ── Helpers ────────────────────────────────────────────────────────────────────

def _decode(b64_str: str) -> Image.Image:
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]
    return Image.open(BytesIO(base64.b64decode(b64_str))).convert("RGBA")


def _fit(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Resize + center-crop to exactly (target_w, target_h)."""
    img_ratio = img.width / img.height
    tgt_ratio  = target_w / target_h

    if img_ratio > tgt_ratio:                         # wider → crop sides
        new_h = target_h
        new_w = int(new_h * img_ratio)
    else:                                              # taller → crop top/bottom
        new_w = target_w
        new_h = int(new_w / img_ratio)

    img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - target_w) // 2
    top  = (new_h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


def _round_corners(img: Image.Image, radius: int) -> Image.Image:
    """Apply rounded corners via alpha mask."""
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (img.width - 1, img.height - 1)],
                            radius=radius, fill=255)
    result = img.copy()
    result.putalpha(mask)
    return result


def _gradient_bg(w: int, h: int) -> Image.Image:
    """Dark vertical gradient (deep navy → dark purple)."""
    bg = Image.new("RGBA", (w, h))
    draw = ImageDraw.Draw(bg)
    top_color    = (10, 10, 30, 255)
    bottom_color = (30, 10, 50, 255)
    for y in range(h):
        t = y / h
        r = int(top_color[0] + (bottom_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bottom_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bottom_color[2] - top_color[2]) * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
    return bg


# ── Main function ──────────────────────────────────────────────────────────────

def process_and_upload_image(img_data_1: str, img_data_2: str) -> str:
    """
    Merges two images into a premium photo-strip layout:
    ┌──────────────────────────────────────────────┐
    │  dark gradient bg                            │
    │  ┌─────────────┐  💕  ┌─────────────┐       │
    │  │   Photo 1   │      │   Photo 2   │       │
    │  └─────────────┘      └─────────────┘       │
    │         Together Booth  •  {date}            │
    └──────────────────────────────────────────────┘
    """
    image1 = _decode(img_data_1)
    image2 = _decode(img_data_2)

    # ── Layout constants ──────────────────────────────────────────────────────
    PHOTO_W   = 900
    PHOTO_H   = 506            # 16:9
    PADDING   = 48             # outer margin
    GAP       = 64             # gap between photos
    HEART_SZ  = 40
    WATERMARK_H = 64
    CORNER_R  = 20

    TOTAL_W = PADDING + PHOTO_W + GAP + PHOTO_W + PADDING
    TOTAL_H = PADDING + PHOTO_H + PADDING + WATERMARK_H

    # ── Canvas ────────────────────────────────────────────────────────────────
    canvas = _gradient_bg(TOTAL_W, TOTAL_H)

    # ── Prepare photos ────────────────────────────────────────────────────────
    p1 = _round_corners(_fit(image1, PHOTO_W, PHOTO_H), CORNER_R)
    p2 = _round_corners(_fit(image2, PHOTO_W, PHOTO_H), CORNER_R)

    x1 = PADDING
    x2 = PADDING + PHOTO_W + GAP
    y  = PADDING

    canvas.paste(p1, (x1, y), mask=p1)
    canvas.paste(p2, (x2, y), mask=p2)

    # ── Heart between photos ──────────────────────────────────────────────────
    draw = ImageDraw.Draw(canvas)
    heart_x = PADDING + PHOTO_W + GAP // 2
    heart_y = y + PHOTO_H // 2
    # Draw a simple pink circle as "heart" placeholder (PIL has no emoji support)
    r = HEART_SZ // 2
    draw.ellipse(
        [(heart_x - r, heart_y - r), (heart_x + r, heart_y + r)],
        fill=(244, 63, 94, 200),
    )

    # ── Watermark text ────────────────────────────────────────────────────────
    from datetime import date
    wm_text = f"Together Booth  •  {date.today().strftime('%b %Y')}"

    # Try to load a nicer font; fall back gracefully
    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except Exception:
        font = ImageFont.load_default()

    bbox  = draw.textbbox((0, 0), wm_text, font=font)
    tw    = bbox[2] - bbox[0]
    tx    = (TOTAL_W - tw) // 2
    ty    = PADDING + PHOTO_H + (WATERMARK_H - (bbox[3] - bbox[1])) // 2

    # Subtle glow
    for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        draw.text((tx + dx, ty + dy), wm_text, font=font, fill=(244, 63, 94, 80))
    draw.text((tx, ty), wm_text, font=font, fill=(255, 255, 255, 200))

    # ── Thin decorative border on each photo ─────────────────────────────────
    border_draw = ImageDraw.Draw(canvas)
    border_col  = (244, 63, 94, 120)
    bw = 3  # border width
    for bx in [x1, x2]:
        border_draw.rounded_rectangle(
            [(bx - bw, y - bw), (bx + PHOTO_W + bw, y + PHOTO_H + bw)],
            radius=CORNER_R + bw, outline=border_col, width=bw,
        )

    # ── Convert & upload ──────────────────────────────────────────────────────
    output = BytesIO()
    canvas.convert("RGB").save(output, format="JPEG", quality=92)
    output.seek(0)

    result = cloudinary.uploader.upload(
        output,
        folder="photobooth",
        public_id=f"merged_{uuid.uuid4().hex}",
    )
    return result.get("secure_url")
