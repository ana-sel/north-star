# Audit Logs

**Route**: `Tabs > More > AuditLogs`
**Source**: [mobile/src/screens/AuditLogsScreen.tsx](../../mobile/src/screens/AuditLogsScreen.tsx)
**Backend**: `ai_audit_log` model + likely under [backend/app/api/agents.py](../../backend/app/api/agents.py)
**Screenshot**: [../images/17_audit_logs.png](../images/17_audit_logs.png)

## What it shows
- Header "🔍 Audit Logs" + back link.
- Filter pills + summary tile (calls today / month / total cost).
- Reverse-chronological list of every AI call: agent, provider, model, tokens, cost, redacted prompt preview, decision.

## Controls
- Filter by agent / provider / date.
- Row tap → expanded detail.

## API calls
- `GET /api/audit-logs?user_id=…`

## Bugs / broken / TODO
- DEV_USER_ID scope.
- Verify costs match the AI Budget screen totals.
