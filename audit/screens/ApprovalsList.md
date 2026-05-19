# Approvals (list)

**Route**: `Tabs > More > ApprovalsList`
**Source**: [mobile/src/screens/ApprovalsListScreen.tsx](../../mobile/src/screens/ApprovalsListScreen.tsx)
**Backend**: [backend/app/api/approvals.py](../../backend/app/api/approvals.py)
**Screenshot**: [../images/20_approvals.png](../images/20_approvals.png)

## What it shows
- Header "Approvals" + back link.
- Empty state: "No pending approvals. When an agent tries an external AI call with sensitive data, it will appear here for your review."

## Controls
- (When non-empty) row tap → ApprovalDetail modal.

## API calls
- `GET /api/approvals?user_id=…&status=pending`

## Bugs / broken / TODO
- Empty until externalAI is enabled in Settings — empty state should link there.
- DEV_USER_ID scope.
