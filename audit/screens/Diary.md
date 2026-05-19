# Diary

**Route**: `Tabs > More > Diary`
**Source**: [mobile/src/screens/DiaryScreen.tsx](../../mobile/src/screens/DiaryScreen.tsx)
**Backend**: [backend/app/api/diary.py](../../backend/app/api/diary.py)
**Screenshot**: [../images/15_diary.png](../images/15_diary.png)

## What it shows
- Header "Diary" + back link.
- Mood picker (😊 😐 😔 😤 😴 🙏).
- Reflection-prompt cards.
- Entry list (latest first).
- OCR / file pick via `expo-document-picker` for photo-of-journal capture.

## Controls
- Mood emojis (tap to select).
- "+ New entry" / large textarea.
- Picker button for OCR import.

## API calls
- `GET /api/diary?user_id=…`
- `POST /api/diary` (text, mood, prompts).
- `POST /api/diary/ocr` (image upload for OCR).

## Bugs / broken / TODO
- **PRIVACY-CRITICAL**: data must stay local. Confirm backend writes are encrypted at rest and never sent to external AI providers.
- DEV_USER_ID scope.
