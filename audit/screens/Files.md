# Files

**Route**: `Tabs > More > Files`
**Source**: [mobile/src/screens/FilesScreen.tsx](../../mobile/src/screens/FilesScreen.tsx)
**Backend**: [backend/app/api/files.py](../../backend/app/api/files.py)

## What it shows
- Private file storage — list of uploaded files with metadata.
- Upload via `expo-document-picker`.

## Controls
- "Pick file & upload" button.
- Per-file: open / delete.

## API calls
- `GET /api/files?user_id=…`
- `POST /api/files/upload`
- `DELETE /api/files/{id}`

## Bugs / broken / TODO
- **PRIVATE** — must never leave device per More description.
- DEV_USER_ID scope.
