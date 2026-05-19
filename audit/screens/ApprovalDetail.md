# Approval detail (modal)

**Route**: `Tabs > More > ApprovalDetail` (modal-style, params `approvalId`)
**Source**: [mobile/src/screens/ApprovalDetailScreen.tsx](../../mobile/src/screens/ApprovalDetailScreen.tsx)

## What it shows
- Redacted prompt the agent wants to send.
- Provider / model / estimated cost / agent identity.
- Approve / Reject buttons.

## Controls
- **Approve** → `POST /api/approvals/{id}/approve` → unblocks the agent call.
- **Reject** → `POST /api/approvals/{id}/reject`.

## Bugs / broken / TODO
- Not exercised in the audit (no pending approvals existed).
- DEV_USER_ID scope.
