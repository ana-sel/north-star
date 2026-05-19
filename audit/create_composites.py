import os
from PIL import Image

BASE_DIR = r"d:\My Archive\north-star\audit\images"
OUTPUT_DIR = os.path.join(BASE_DIR, "composite")
TARGET_HEIGHT = 1200
PADDING = 20
BORDER = 30

composites = {
    "01_tabs.png": ["01_tab_chat.png", "02b_today.png", "03b_plan.png", "04b_track.png", "05_tab_more.png"],
    "02_plan_and_align.png": ["10_goals.png", "11_compass.png", "16_mission_editor.png", "21_review.png"],
    "03_privacy_and_ai.png": ["15_diary.png", "20_approvals.png", "17_audit_logs.png", "13_ai_budget.png"],
    "04_integrations.png": ["12_calendar.png", "19_wearables.png", "18_search.png"],
    "05_settings.png": ["14_settings.png"]
}

for output_name, source_files in composites.items():
    images = []
    for f in source_files:
        path = os.path.join(BASE_DIR, f)
        if not os.path.exists(path):
            print(f"File not found: {f}")
            continue
        try:
            img = Image.open(path)
            # Calculate new width to maintain aspect ratio with TARGET_HEIGHT
            aspect_ratio = img.width / img.height
            new_width = int(TARGET_HEIGHT * aspect_ratio)
            img = img.resize((new_width, TARGET_HEIGHT), Image.Resampling.LANCZOS)
            images.append(img)
        except Exception as e:
            print(f"Error opening {f}: {e}")

    if not images:
        print(f"No source images found for {output_name}")
        continue

    # Calculate total dimensions
    total_width = (2 * BORDER) + sum(img.width for img in images) + (len(images) - 1) * PADDING
    total_height = TARGET_HEIGHT + (2 * BORDER)

    # Create composite image with white background
    composite = Image.new("RGB", (total_width, total_height), (255, 255, 255))

    # Paste images
    current_x = BORDER
    for img in images:
        composite.paste(img, (current_x, BORDER))
        current_x += img.width + PADDING

    output_path = os.path.join(OUTPUT_DIR, output_name)
    composite.save(output_path)
    print(f"Saved {output_name} ({total_width}x{total_height})")
