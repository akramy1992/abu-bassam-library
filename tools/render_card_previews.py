#!/usr/bin/env python3
"""Render deterministic CR80 card previews from the app's approved design system."""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "design-previews"
FONTS = ROOT / "web" / "fonts"
LOGO = ROOT / "web" / "abu_bassam_icon.webp"
W, H = 1712, 1080

GREEN = "#075b4d"
GREEN_DARK = "#043e35"
GOLD = "#d5aa52"
CREAM = "#faf5e9"
BLUE = "#076bad"
BLUE_DARK = "#063a72"
SKY = "#eaf8ff"
BLACK = "#0b0b0c"
GOLD_LIGHT = "#efd08b"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(str(FONTS / ("Cairo-Bold.ttf" if bold else "Cairo-Regular.ttf")), size)


def rtl(draw: ImageDraw.ImageDraw, xy, text: str, size: int, fill, *, bold=False, anchor="ra"):
    draw.text(xy, text, font=font(size, bold), fill=fill, anchor=anchor, direction="rtl", language="ar")


def rounded_gradient(top: str, bottom: str, radius: int = 65):
    a = Image.new("RGB", (W, H), top)
    d = ImageDraw.Draw(a)
    from PIL import ImageColor
    c1, c2 = ImageColor.getrgb(top), ImageColor.getrgb(bottom)
    for y in range(H):
        t = y / max(1, H - 1)
        color = tuple(round(c1[i] * (1 - t) + c2[i] * t) for i in range(3))
        d.line((0, y, W, y), fill=color)
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((2, 2, W - 3, H - 3), radius=radius, fill=255)
    out = Image.new("RGB", (W, H), "white")
    out.paste(a, mask=mask)
    return out


def add_texture(im: Image.Image, color, step=88, alpha=18):
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for x in range(-H, W + H, step):
        d.line((x, 0, x - H, H), fill=(*color, alpha), width=3)
        d.line((x + 30, 0, x - H + 30, H), fill=(*color, alpha // 2), width=2)
    im.paste(layer, (0, 0), layer)


def logo(im: Image.Image, box):
    icon = Image.open(LOGO).convert("RGBA")
    icon.thumbnail((box[2] - box[0], box[3] - box[1]), Image.Resampling.LANCZOS)
    x = box[0] + (box[2] - box[0] - icon.width) // 2
    y = box[1] + (box[3] - box[1] - icon.height) // 2
    im.paste(icon, (x, y), icon)


def qr_matrix(payload: str):
    raw = subprocess.check_output(["node", str(ROOT / "tools" / "qr_matrix.js"), payload, "M"], text=True)
    return json.loads(raw)


def qr(im: Image.Image, payload: str, box, ink="#050505", border="#075b4d", quiet=4):
    data = qr_matrix(payload)
    count = data["count"]
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(box, radius=22, fill="white", outline=border, width=8)
    inset = 22
    usable = min(x1 - x0, y1 - y0) - 2 * inset
    cell = max(1, usable // (count + quiet * 2))
    size = cell * (count + quiet * 2)
    ox = x0 + (x1 - x0 - size) // 2 + quiet * cell
    oy = y0 + (y1 - y0 - size) // 2 + quiet * cell
    for r, row in enumerate(data["rows"]):
        for c, value in enumerate(row):
            if value == "1":
                d.rectangle((ox + c * cell, oy + r * cell, ox + (c + 1) * cell - 1, oy + (r + 1) * cell - 1), fill=ink)


def footer(im: Image.Image, color=GREEN, fg="white"):
    d = ImageDraw.Draw(im)
    d.rectangle((0, H - 105, W, H), fill=color)
    rtl(d, (W // 2, H - 53), "مكتبة أبو بسام للتصوير والقرطاسية | 07829667521", 34, fg, bold=True, anchor="mm")


def avatar(im: Image.Image, box, child=False):
    x0, y0, x1, y1 = box
    d = ImageDraw.Draw(im)
    d.ellipse(box, fill="#fffdf8", outline=GOLD, width=13)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    skin = "#f3b597"
    d.ellipse((cx - 110, cy - 155, cx + 110, cy + 75), fill=skin)
    hair = "#6b402d" if child else "#29282a"
    d.pieslice((cx - 125, cy - 175, cx + 125, cy + 65), 180, 360, fill=hair)
    d.ellipse((cx - 74, cy - 25, cx - 58, cy - 9), fill="#343238")
    d.ellipse((cx + 58, cy - 25, cx + 74, cy - 9), fill="#343238")
    d.arc((cx - 38, cy + 8, cx + 38, cy + 55), 10, 170, fill="#a75c4c", width=5)
    if child:
        d.rounded_rectangle((cx - 145, cy + 80, cx + 145, y1 - 18), radius=90, fill="#1b5b92")
        d.polygon([(cx - 70, cy + 76), (cx, cy + 135), (cx + 70, cy + 76)], fill="white")
    else:
        d.polygon([(cx - 145, cy + 80), (cx - 35, cy + 65), (cx, cy + 120), (cx + 35, cy + 65), (cx + 145, cy + 80), (cx + 160, y1 - 18), (cx - 160, y1 - 18)], fill="#172b3f")
        d.polygon([(cx - 40, cy + 68), (cx, cy + 120), (cx + 40, cy + 68)], fill="white")


def info_row(d, y, label, value, color=GREEN, value_color="#263b36"):
    rtl(d, (1625, y), label, 41, color, bold=True)
    d.rounded_rectangle((585, y - 40, 1180, y + 34), radius=18, fill="#dfe9e2")
    rtl(d, (1152, y), value, 34, value_color, bold=True)


def personal_front():
    im = rounded_gradient("#fffef9", "#f2eadc")
    add_texture(im, (7, 91, 77))
    d = ImageDraw.Draw(im)
    d.pieslice((-520, -610, 860, 770), 0, 360, fill=GREEN, outline=GOLD, width=18)
    avatar(im, (55, 65, 630, 790))
    logo(im, (920, 55, 1325, 350))
    rtl(d, (1310, 365), "مكتبة أبو بسام", 56, "#4e301f", bold=True, anchor="rm")
    rtl(d, (1310, 435), "للتصوير والقرطاسية", 43, "#4e301f", bold=True, anchor="rm")
    d.rounded_rectangle((515, 640, W + 35, 960), radius=95, fill=GREEN, outline=GOLD, width=12)
    rtl(d, (1160, 765), "الباج التعريفي", 96, "white", bold=True, anchor="mm")
    rtl(d, (1160, 865), "أكرم حاتم الغزالي", 47, GOLD_LIGHT, bold=True, anchor="mm")
    footer(im)
    return im


def personal_back():
    im = rounded_gradient("#fffef9", "#f2eadc")
    add_texture(im, (7, 91, 77))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((560, -20, 1200, 120), radius=55, fill=GREEN, outline=GOLD, width=8)
    rtl(d, (880, 62), "بطاقة معلومات", 48, GOLD_LIGHT, bold=True, anchor="mm")
    qr(im, "BEGIN:VCARD\nVERSION:3.0\nFN:أكرم حاتم الغزالي\nTEL:07829667521\nEMAIL:AKRAMA1992@GMAIL.COM\nADR:العراق\nEND:VCARD", (55, 135, 535, 615))
    d.rounded_rectangle((55, 615, 535, 700), radius=22, fill=GREEN)
    rtl(d, (295, 657), "حفظ في جهات الاتصال", 30, "white", bold=True, anchor="mm")
    info_row(d, 195, "الاسم:", "أكرم حاتم الغزالي")
    info_row(d, 315, "السكن:", "العراق")
    info_row(d, 435, "رقم الهاتف:", "07829667521")
    info_row(d, 555, "الإيميل:", "AKRAMA1992@GMAIL.COM")
    info_row(d, 675, "معرّف تيليجرام:", "@akram")
    info_row(d, 795, "الملاحظات:", "بطاقة معلومات شخصية")
    footer(im)
    return im


def child_front():
    im = rounded_gradient("#f9fdff", "#e3f5ff")
    d = ImageDraw.Draw(im)
    for cx, cy, r in [(140, 130, 85), (560, 120, 100), (1360, 130, 115), (1120, 470, 95), (1550, 520, 80)]:
        d.ellipse((cx-r, cy-r//2, cx+r, cy+r//2), fill="#bfeaff")
    avatar(im, (50, 60, 620, 790), child=True)
    logo(im, (900, 45, 1310, 335))
    rtl(d, (1320, 350), "مكتبة أبو بسام", 55, "#5a331f", bold=True, anchor="rm")
    rtl(d, (1320, 417), "للتصوير والقرطاسية", 40, "#5a331f", bold=True, anchor="rm")
    rtl(d, (1320, 505), "روضة أطفال القادسية", 43, BLUE_DARK, bold=True, anchor="rm")
    d.polygon([(520, 620), (1555, 620), (1685, 760), (1555, 900), (520, 900), (650, 760)], fill=BLUE_DARK)
    rtl(d, (1120, 755), "باج الروضة", 94, "white", bold=True, anchor="mm")
    footer(im, BLUE)
    return im


def child_back():
    im = rounded_gradient("#f9fdff", "#e3f5ff")
    d = ImageDraw.Draw(im)
    for cx, cy, r in [(260, 90, 80), (900, 105, 95), (1450, 100, 110)]:
        d.ellipse((cx-r, cy-r//2, cx+r, cy+r//2), fill="#c9edff")
    qr(im, "الاسم: زهراء أكرم\nرقم خط النقل: 12\nالسكن: حي القادسية\nرقم هاتف ولي الأمر: 07829667521", (55, 120, 535, 600), border=BLUE)
    qr(im, "tel:07829667521", (120, 635, 400, 915), border=BLUE)
    rtl(d, (470, 745), "اتصال طارئ", 36, BLUE_DARK, bold=True, anchor="la")
    info_row(d, 210, "اسم الطفل:", "زهراء أكرم", BLUE_DARK, "#163c59")
    info_row(d, 355, "رقم خط النقل:", "12", BLUE_DARK, "#163c59")
    info_row(d, 500, "السكن:", "حي القادسية", BLUE_DARK, "#163c59")
    info_row(d, 645, "هاتف ولي الأمر:", "07829667521", BLUE_DARK, "#163c59")
    rtl(d, (1620, 800), "الباركود يضم جميع المعلومات ويتيح الاتصال المباشر", 32, BLUE_DARK, bold=True)
    footer(im, BLUE)
    return im


def cap_text(d, x, y, value, size=43):
    cursor = x
    f = font(size, True)
    for ch in value:
        color = "#d52a2a" if ch.isalpha() and ch.isupper() else "#171717"
        d.text((cursor, y), ch, font=f, fill=color, anchor="la")
        cursor += d.textlength(ch, font=f)


def login_front():
    im = rounded_gradient("#181818", "#050506")
    add_texture(im, (213, 170, 82), step=105, alpha=20)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((18, 18, W-18, H-18), radius=60, outline=GOLD, width=10)
    logo(im, (610, 35, 950, 300))
    rtl(d, (1310, 170), "مكتبة أبو بسام", 73, GOLD_LIGHT, bold=True, anchor="rm")
    d.rounded_rectangle((70, 335, 575, 885), radius=35, outline=GOLD, width=5)
    rtl(d, (540, 400), "نوع الحساب", 46, GOLD_LIGHT, bold=True)
    services = [("f", "فيسبوك"), ("G", "سوق بلي"), ("A", "أبل ستور"), ("@", "إيميل")]
    for i, (icon, text) in enumerate(services):
        y = 500 + i*88
        if i == 0:
            d.rounded_rectangle((105, y-34, 535, y+38), radius=20, fill="#caa76228", outline=GOLD, width=3)
        rtl(d, (500, y), text, 38, GOLD_LIGHT, bold=True)
        d.ellipse((112, y-28, 168, y+28), outline=GOLD_LIGHT, width=3)
        d.text((140, y), icon, font=font(27, True), fill=GOLD_LIGHT, anchor="mm")
    d.rounded_rectangle((650, 335, 1630, 885), radius=35, outline=GOLD, width=5)
    d.rounded_rectangle((900, 300, 1390, 385), radius=24, fill=GOLD)
    rtl(d, (1145, 343), "معلومات تسجيل الدخول", 39, "#111", bold=True, anchor="mm")
    rtl(d, (1555, 465), "البريد الإلكتروني", 35, GOLD_LIGHT, bold=True)
    d.rounded_rectangle((720, 495, 1560, 585), radius=22, fill="#fffdf5", outline=GOLD, width=4)
    cap_text(d, 755, 513, "AkramA1992@gmail.com", 38)
    rtl(d, (1555, 675), "كلمة السر", 35, GOLD_LIGHT, bold=True)
    d.rounded_rectangle((720, 705, 1560, 795), radius=22, fill="#fffdf5", outline=GOLD, width=4)
    cap_text(d, 755, 723, "AbuBassam2026", 42)
    footer(im, "#2b2117", GOLD_LIGHT)
    return im


def login_back():
    im = rounded_gradient("#181818", "#050506")
    add_texture(im, (213, 170, 82), step=105, alpha=20)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((18, 18, W-18, H-18), radius=60, outline=GOLD, width=10)
    logo(im, (70, 50, 405, 305))
    rtl(d, (1550, 145), "معلوماتك لتسجيل الدخول إلى فيسبوك", 58, GOLD_LIGHT, bold=True)
    qr(im, "الخدمة: Facebook\nالبريد: AkramA1992@gmail.com\nكلمة السر: AbuBassam2026\nملاحظات: حساب شخصي", (85, 355, 640, 910), ink="#050505", border=GOLD)
    d.rounded_rectangle((705, 345, 1605, 840), radius=38, outline=GOLD, width=5)
    rtl(d, (1530, 450), "الخدمة:", 38, GOLD_LIGHT, bold=True)
    rtl(d, (1190, 450), "Facebook", 42, "white", bold=True, anchor="ra")
    rtl(d, (1530, 585), "البريد:", 38, GOLD_LIGHT, bold=True)
    d.text((760, 585), "AkramA1992@gmail.com", font=font(34, True), fill="white", anchor="la")
    rtl(d, (1530, 720), "كلمة السر:", 38, GOLD_LIGHT, bold=True)
    d.text((760, 720), "AbuBassam2026", font=font(38, True), fill="white", anchor="la")
    rtl(d, (1150, 810), "الحروف الكبيرة تظهر بالأحمر في الوجه الأمامي", 28, "#ff9a9a", bold=True, anchor="mm")
    footer(im, "#2b2117", GOLD_LIGHT)
    return im


def contact_sheet(files):
    thumb_w, thumb_h = 900, 568
    canvas = Image.new("RGB", (1960, 2210), "#ece8df")
    d = ImageDraw.Draw(canvas)
    rtl(d, (980, 78), "معاينة تصاميم كروت مكتبة أبو بسام — CR80", 54, GREEN_DARK, bold=True, anchor="mm")
    labels = ["الباج التعريفي — الأمامي", "الباج التعريفي — الخلفي", "باج الروضة — الأمامي", "باج الروضة — الخلفي", "بطاقة تسجيل الدخول — الأمامي", "بطاقة تسجيل الدخول — الخلفي"]
    for i, (path, label) in enumerate(zip(files, labels)):
        col, row = i % 2, i // 2
        x, y = 55 + col * 970, 145 + row * 690
        card = Image.open(path).convert("RGB")
        card.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        shadow = Image.new("RGBA", (thumb_w + 30, thumb_h + 30), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle((12, 12, thumb_w+12, thumb_h+12), radius=42, fill=(0,0,0,65))
        shadow = shadow.filter(ImageFilter.GaussianBlur(12))
        canvas.paste(shadow, (x-15, y-15), shadow)
        canvas.paste(card, (x, y))
        rtl(d, (x + thumb_w//2, y + thumb_h + 35), label, 34, "#3d322b", bold=True, anchor="ma")
    path = OUT / "00_all_card_designs_preview.png"
    canvas.save(path, optimize=True)
    return path


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    renders = [
        ("01_personal_front.png", personal_front),
        ("02_personal_back.png", personal_back),
        ("03_child_front.png", child_front),
        ("04_child_back.png", child_back),
        ("05_login_front.png", login_front),
        ("06_login_back.png", login_back),
    ]
    files = []
    for name, renderer in renders:
        path = OUT / name
        renderer().save(path, optimize=True)
        files.append(path)
    sheet = contact_sheet(files)
    print(sheet)
    for path in files:
        print(path)


if __name__ == "__main__":
    main()
