"""
Generate 5 PNG collages from Compass wireframe screens.
Groups: Today, Log, Plan, Money, You
"""

import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
import io

BASE = Path(__file__).parent
OUT = BASE / "collages"
OUT.mkdir(exist_ok=True)

GROUPS = {
    "1-today": {
        "title": "Today",
        "screens": [
            ("nav-modular.html", "Shell / Nav"),
            ("screens/today.html", "Today"),
        ],
    },
    "2-log": {
        "title": "Log",
        "screens": [
            ("screens/log-sleep.html", "Log · Sleep"),
            ("screens/log-habits.html", "Log · Habits"),
            ("screens/log-body.html", "Log · Body"),
            ("screens/log-energy.html", "Log · Energy"),
        ],
    },
    "3-plan": {
        "title": "Plan",
        "screens": [
            ("screens/plan-flow.html", "Plan · Flow"),
            ("screens/plan-goals.html", "Plan · Goals"),
            ("screens/plan-map.html", "Plan · Map"),
            ("screens/plan-trails.html", "Paths"),
        ],
    },
    "4-money": {
        "title": "Money",
        "screens": [
            ("screens/money-overview.html", "Money · Overview"),
            ("screens/money-add.html", "Money · Add"),
            ("screens/money-trans.html", "Money · Transactions"),
            ("screens/money-budget.html", "Money · Budget"),
            ("screens/money-worth.html", "Money · Worth"),
        ],
    },
    "5-you": {
        "title": "You",
        "screens": [
            ("screens/you-progress.html", "You · Progress"),
            ("screens/you-discover.html", "You · Discover"),
            ("screens/you-identity.html", "You · Self"),
            ("screens/foundations.html", "Foundations"),
            ("screens/settings.html", "Settings"),
        ],
    },
}

SCREEN_W = 390
SCREEN_H = 844
PADDING = 20
LABEL_H = 36
TITLE_H = 60
COLS = 4          # max columns per row
BG = (15, 15, 20)
LABEL_BG = (30, 30, 40)
LABEL_FG = (200, 200, 210)
TITLE_FG = (255, 255, 255)


def make_label(text: str, width: int, height: int) -> Image.Image:
    img = Image.new("RGB", (width, height), LABEL_BG)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 14)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((width - tw) / 2, (height - th) / 2), text, fill=LABEL_FG, font=font)
    return img


def make_title(text: str, width: int) -> Image.Image:
    img = Image.new("RGB", (width, TITLE_H), BG)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 28)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((width - tw) / 2, (TITLE_H - th) / 2), text, fill=TITLE_FG, font=font)
    return img


def screenshot_screen(page, html_path: str) -> Image.Image:
    file_url = "file:///" + (BASE / html_path).as_posix()
    page.goto(file_url, wait_until="networkidle")
    page.set_viewport_size({"width": SCREEN_W, "height": SCREEN_H})
    data = page.screenshot(type="png")
    return Image.open(io.BytesIO(data)).convert("RGB")


def build_collage(group_key: str, group: dict, page) -> Path:
    screens = group["screens"]
    n = len(screens)
    cols = min(n, COLS)
    rows = (n + cols - 1) // cols

    cell_w = SCREEN_W
    cell_h = SCREEN_H + LABEL_H

    total_w = cols * cell_w + (cols + 1) * PADDING
    total_h = TITLE_H + rows * cell_h + (rows + 1) * PADDING

    canvas = Image.new("RGB", (total_w, total_h), BG)

    # Title
    title_img = make_title(group["title"], total_w)
    canvas.paste(title_img, (0, 0))

    for idx, (html_path, label) in enumerate(screens):
        col = idx % cols
        row = idx // cols
        x = PADDING + col * (cell_w + PADDING)
        y = TITLE_H + PADDING + row * (cell_h + PADDING)

        # Screenshot
        shot = screenshot_screen(page, html_path)
        canvas.paste(shot, (x, y))

        # Label bar below screenshot
        lbl = make_label(label, cell_w, LABEL_H)
        canvas.paste(lbl, (x, y + SCREEN_H))

    out_path = OUT / f"compass-{group_key}.png"
    canvas.save(out_path, "PNG", optimize=True)
    print(f"  Saved: {out_path.name}")
    return out_path


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        for key, group in GROUPS.items():
            print(f"Rendering {group['title']}...")
            build_collage(key, group, page)
        browser.close()
    print("\nDone. Collages saved to:", OUT)


if __name__ == "__main__":
    main()
