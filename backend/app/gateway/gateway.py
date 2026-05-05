"""LocalAIGateway — the single controlled gate for every AI call.

No agent or service may instantiate a provider directly.  Every AI request
must go through `LocalAIGateway.process_request`, which performs the full
13-step flow defined in spec §10.2:

    1. Receive agent request.
    2. Classify privacy.
    3. Check agent permission.
    4. Decide local vs external.
    5. Minimise context.            (kept simple in Phase 3)
    6. Redact PII.                  (Phase 3 — HybridRedactor)
    7. Scan input.                  (Phase 3 — currently always clean)
    8. Estimate cost.
    9. Request approval if needed.  (Phase 4 — currently auto-blocks)
   10. Call model.
   11. Scan output.                 (Phase 3 — currently always clean)
   12. Write audit log.
   13. Return response.

Phase 2 deliverables:
  * Wire the full flow end-to-end with stubs for redaction / scanning /
    approval (Phases 3 & 4).
  * Strict permission and routing rules using `agent_policies`.
  * Complete `ai_audit_logs` write on every call.
  * Working Ollama provider; external providers raise.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import PrivacyLevel
from app.gateway.cost import estimate_cost_gbp
from app.gateway.providers import (
    BaseProvider,
    ClaudeProvider,
    OllamaProvider,
    OpenAIProvider,
    ProviderError,
)
from app.config import settings
from app.gateway.redactor import (
    HybridRedactor,
    OllamaSemanticRedactor,
    RegexRedactor,
    VocabularyRedactor,
)
from app.gateway.scanner import StubScanner
from app.gateway.schemas import (
    ApprovalPreview,
    FinalStatus,
    GatewayRequest,
    GatewayResponse,
    Provider,
    ProviderResult,
)
from app.models.agent_policy import AgentPolicy
from app.models.ai_audit_log import AIAuditLog
from app.models.pending_approval import PendingApproval


logger = logging.getLogger(__name__)


# How long a pending approval stays valid before auto-expiry.
_APPROVAL_TTL = timedelta(minutes=15)


class GatewayPolicyError(RuntimeError):
    """Raised internally when the gateway must refuse a call. Never surfaces
    to the agent as an exception — it is converted into a structured
    `GatewayResponse` with `final_status='blocked_by_policy'`."""


# Privacy levels that are *never* allowed on an external call, no matter
# what an agent's policy says. The gateway is the last line of defence.
_NEVER_EXTERNAL: set[PrivacyLevel] = {PrivacyLevel.NEVER_EXTERNAL}

# Default model per provider. Agents may override via `preferred_model`.
_DEFAULT_MODELS: dict[Provider, str] = {
    "ollama": "llama3.2",
    "openai": "gpt-4o-mini",
    "claude": "claude-3-5-sonnet-latest",
    "grok": "grok-2",
    "groq": "llama-3.1-70b-versatile",
}


class LocalAIGateway:
    """The only door between agents and AI models."""

    def __init__(
        self,
        db: Session,
        *,
        ollama: BaseProvider | None = None,
        openai: BaseProvider | None = None,
        claude: BaseProvider | None = None,
        redactor: HybridRedactor | None = None,
    ) -> None:
        self.db = db
        self._providers: dict[Provider, BaseProvider] = {
            "ollama": ollama or OllamaProvider(),
            "openai": openai or OpenAIProvider(),
            "claude": claude or ClaudeProvider(),
        }
        self._redactor = redactor or HybridRedactor(
            regex=RegexRedactor(),
            vocabulary=VocabularyRedactor(settings.redactor_vocab_path),
            semantic=OllamaSemanticRedactor(
                enabled=settings.redactor_semantic_enabled,
                model=settings.redactor_semantic_model,
            ),
        )
        self._scanner = StubScanner()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    async def process_request(self, request: GatewayRequest) -> GatewayResponse:
        """Run the full gateway flow for one agent request."""
        audit_id = uuid.uuid4()

        # 3. Permission check (against DB policy).
        policy = self._load_policy(request.agent_id)
        if policy is None:
            return self._finalise_blocked(
                audit_id=audit_id,
                request=request,
                provider="ollama",
                model=_DEFAULT_MODELS["ollama"],
                reason=f"unknown agent_id '{request.agent_id}'",
            )

        forbidden = _intersect(request.declared_fields, list(policy.cannot_read))
        if forbidden:
            return self._finalise_blocked(
                audit_id=audit_id,
                request=request,
                provider="ollama",
                model=_DEFAULT_MODELS["ollama"],
                reason=(
                    f"agent '{policy.agent_id}' is not allowed to read "
                    f"fields {forbidden}"
                ),
            )

        # 4. Routing decision.
        provider_name, model, external_call = self._route(request, policy)

        # 5/6. Minimise + redact.  Done BEFORE any approval check so the
        # human sees the exact bytes that would leave the machine.
        redaction = await self._redactor.redact(request.prompt)
        prompt_for_provider = redaction.redacted_text
        redaction_map = redaction.map_for_audit  # placeholder → category only

        # 7. Input scan.
        input_scan = self._scanner.scan_input(prompt_for_provider)
        if input_scan.status == "blocked":
            return self._finalise_blocked(
                audit_id=audit_id,
                request=request,
                provider=provider_name,
                model=model,
                reason=f"input scan blocked: {input_scan.reason}",
                input_scan_status=input_scan.status,
                redacted_prompt=prompt_for_provider,
                redaction_map=redaction_map,
            )

        # 8. Cost + budget gate (external calls only).
        if external_call:
            planned_cost = estimate_cost_gbp(
                provider=provider_name,
                model=model,
                input_chars=len(prompt_for_provider),
                max_output_tokens=request.max_output_tokens,
            )
            budget_block = self._check_budget(policy, planned_cost)
            if budget_block is not None:
                return self._finalise_blocked(
                    audit_id=audit_id,
                    request=request,
                    provider=provider_name,
                    model=model,
                    reason=budget_block,
                    final_status="blocked_by_budget",
                    input_scan_status=input_scan.status,
                    redacted_prompt=prompt_for_provider,
                    redaction_map=redaction_map,
                )

        # 9. Approval gate.
        # External call + privacy level in policy.requires_approval_for
        # ⇒ enqueue and return preview; do NOT call provider yet.
        approval_required = (
            external_call
            and request.privacy_level.value in list(policy.requires_approval_for)
        )
        if approval_required:
            return self._enqueue_for_approval(
                audit_id=audit_id,
                request=request,
                provider=provider_name,
                model=model,
                redacted_prompt=prompt_for_provider,
                redaction_map=redaction_map,
                input_scan_status=input_scan.status,
            )

        # 10. Provider call.
        provider = self._providers.get(provider_name)
        if provider is None:
            return self._finalise_blocked(
                audit_id=audit_id,
                request=request,
                provider=provider_name,
                model=model,
                reason=f"provider '{provider_name}' is not configured",
                final_status="provider_error",
                redacted_prompt=prompt_for_provider,
                redaction_map=redaction_map,
            )

        try:
            result = await provider.generate(
                prompt=prompt_for_provider,
                model=model,
                max_output_tokens=request.max_output_tokens,
            )
        except ProviderError as exc:
            return self._finalise_provider_error(
                audit_id=audit_id,
                request=request,
                provider=provider_name,
                model=model,
                external_call=external_call,
                error=str(exc),
                input_scan_status=input_scan.status,
                redacted_prompt=prompt_for_provider,
                redaction_map=redaction_map,
            )

        # 11. Output scan.
        output_scan = self._scanner.scan_output(result.text)

        # 12. Audit log + 13. Response.
        return self._finalise_success(
            audit_id=audit_id,
            request=request,
            provider=provider_name,
            model=model,
            external_call=external_call,
            result=result,
            input_scan_status=input_scan.status,
            output_scan_status=output_scan.status,
            redacted_prompt=prompt_for_provider,
            redaction_map=redaction_map,
        )

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    def _load_policy(self, agent_id: str) -> AgentPolicy | None:
        return self.db.execute(
            select(AgentPolicy).where(AgentPolicy.agent_id == agent_id)
        ).scalar_one_or_none()

    # -- budget -------------------------------------------------------------
    def _check_budget(
        self,
        policy: AgentPolicy,
        planned_cost: Decimal,
    ) -> str | None:
        """Return a human-readable reason if the call would exceed the
        agent's monthly budget; else None.

        Counts both completed external calls and currently-pending
        approvals against the cap so users cannot stack approvals to
        overshoot.
        """
        cap = policy.monthly_budget_limit_gbp
        if cap is None:
            return None

        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        from sqlalchemy import func as _func  # local import to keep top tidy

        spent = self.db.execute(
            select(_func.coalesce(_func.sum(AIAuditLog.estimated_cost_gbp), 0))
            .where(AIAuditLog.agent_id == policy.agent_id)
            .where(AIAuditLog.external_call.is_(True))
            .where(AIAuditLog.created_at >= month_start)
            .where(AIAuditLog.final_status.in_(("completed", "awaiting_approval")))
        ).scalar_one()
        spent = Decimal(spent or 0)

        if spent + planned_cost > cap:
            return (
                f"agent '{policy.agent_id}' would exceed monthly budget "
                f"(spent £{spent}, planned £{planned_cost}, cap £{cap})"
            )
        return None

    # -- approval queue -----------------------------------------------------
    def _enqueue_for_approval(
        self,
        *,
        audit_id: uuid.UUID,
        request: GatewayRequest,
        provider: Provider,
        model: str,
        redacted_prompt: str,
        redaction_map: dict[str, str],
        input_scan_status: str,
    ) -> GatewayResponse:
        """Persist the planned external call and return a preview."""
        cost = estimate_cost_gbp(
            provider=provider,
            model=model,
            input_chars=len(redacted_prompt),
            max_output_tokens=request.max_output_tokens,
        )
        expires_at = datetime.now(timezone.utc) + _APPROVAL_TTL

        # 1. Audit row first (the FK target).
        self._write_audit(
            audit_id=audit_id,
            request=request,
            provider=provider,
            model=model,
            external_call=True,
            input_tokens=0,
            output_tokens=0,
            estimated_cost_gbp=cost,
            input_scan_status=input_scan_status,
            output_scan_status="not_scanned",
            final_status="awaiting_approval",
            approval_required=True,
            approved_by_user=False,
            redacted_prompt=redacted_prompt,
            redaction_map=redaction_map,
        )

        # 2. Pending row pointing at the audit log.
        pending_id = uuid.uuid4()
        pending = PendingApproval(
            id=pending_id,
            user_id=request.user_id,
            agent_id=request.agent_id,
            audit_log_id=audit_id,
            request_type=request.request_type,
            privacy_level=request.privacy_level.value,
            provider=provider,
            model=model,
            redacted_prompt=redacted_prompt,
            redaction_map=redaction_map or {},
            max_output_tokens=request.max_output_tokens,
            estimated_cost_gbp=cost,
            status="pending",
            expires_at=expires_at,
        )
        self.db.add(pending)
        self.db.commit()

        preview = ApprovalPreview(
            pending_approval_id=pending_id,
            agent_id=request.agent_id,
            request_type=request.request_type,
            privacy_level=request.privacy_level,
            provider=provider,
            model=model,
            redacted_prompt=redacted_prompt,
            redaction_map=redaction_map,
            estimated_cost_gbp=cost,
            expires_at=expires_at,
        )
        return GatewayResponse(
            audit_log_id=audit_id,
            final_status="awaiting_approval",
            provider=provider,
            model=model,
            external_call=True,
            text=None,
            estimated_cost_gbp=cost,
            pending_approval_id=pending_id,
            approval_preview=preview,
        )

    async def execute_approved(self, pending_id: uuid.UUID) -> GatewayResponse:
        """Run the queued external call after a human approval.

        The redacted prompt and all parameters are loaded from the pending
        row — the gateway does not trust any user-supplied text here.
        """
        pending = self.db.get(PendingApproval, pending_id)
        if pending is None:
            raise GatewayPolicyError(f"pending approval '{pending_id}' not found")
        if pending.status != "pending":
            raise GatewayPolicyError(
                f"pending approval '{pending_id}' is in status '{pending.status}'"
            )
        if pending.expires_at <= datetime.now(timezone.utc):
            pending.status = "expired"
            pending.decided_at = datetime.now(timezone.utc)
            pending.decided_outcome = "expired"
            self._mark_audit(pending.audit_log_id, final_status="rejected_by_user")
            self.db.commit()
            raise GatewayPolicyError(f"pending approval '{pending_id}' has expired")

        provider = self._providers.get(pending.provider)  # type: ignore[arg-type]
        if provider is None:
            raise GatewayPolicyError(
                f"provider '{pending.provider}' is not configured"
            )

        try:
            result = await provider.generate(
                prompt=pending.redacted_prompt,
                model=pending.model,
                max_output_tokens=pending.max_output_tokens,
            )
        except ProviderError as exc:
            self._mark_audit(
                pending.audit_log_id,
                final_status="provider_error",
                approved_by_user=True,
            )
            pending.status = "executed"
            pending.decided_at = datetime.now(timezone.utc)
            pending.decided_outcome = "approved"
            self.db.commit()
            return GatewayResponse(
                audit_log_id=pending.audit_log_id,
                final_status="provider_error",
                provider=pending.provider,  # type: ignore[arg-type]
                model=pending.model,
                external_call=True,
                error=str(exc),
            )

        # Output scan + finalise.
        output_scan = self._scanner.scan_output(result.text)
        self._mark_audit(
            pending.audit_log_id,
            final_status="completed",
            approved_by_user=True,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            estimated_cost_gbp=result.estimated_cost_gbp or pending.estimated_cost_gbp,
            output_scan_status=output_scan.status,
        )
        pending.status = "executed"
        pending.decided_at = datetime.now(timezone.utc)
        pending.decided_outcome = "approved"
        self.db.commit()

        return GatewayResponse(
            audit_log_id=pending.audit_log_id,
            final_status="completed",
            provider=pending.provider,  # type: ignore[arg-type]
            model=pending.model,
            external_call=True,
            text=result.text,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            estimated_cost_gbp=
                result.estimated_cost_gbp or pending.estimated_cost_gbp,
        )

    def reject_pending(self, pending_id: uuid.UUID) -> None:
        """Reject a queued external call. Audit log is updated; nothing is sent."""
        pending = self.db.get(PendingApproval, pending_id)
        if pending is None:
            raise GatewayPolicyError(f"pending approval '{pending_id}' not found")
        if pending.status != "pending":
            return  # idempotent
        pending.status = "rejected"
        pending.decided_at = datetime.now(timezone.utc)
        pending.decided_outcome = "rejected"
        self._mark_audit(pending.audit_log_id, final_status="rejected_by_user")
        self.db.commit()

    def _mark_audit(
        self,
        audit_id: uuid.UUID,
        *,
        final_status: FinalStatus,
        approved_by_user: bool = False,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        estimated_cost_gbp: Decimal | None = None,
        output_scan_status: str | None = None,
    ) -> None:
        log = self.db.get(AIAuditLog, audit_id)
        if log is None:
            return
        log.final_status = final_status
        if approved_by_user:
            log.approved_by_user = True
            log.approved_at = datetime.now(timezone.utc)
        if input_tokens is not None:
            log.input_tokens = input_tokens
        if output_tokens is not None:
            log.output_tokens = output_tokens
        if estimated_cost_gbp is not None:
            log.estimated_cost_gbp = estimated_cost_gbp
        if output_scan_status is not None:
            log.output_scan_status = output_scan_status

    def _route(
        self,
        request: GatewayRequest,
        policy: AgentPolicy,
    ) -> tuple[Provider, str, bool]:
        """Decide (provider, model, external_call) for this request.

        Rules, hardest-first:
          * `never_external` privacy → always local.
          * `force_local=True` → always local.
          * Agent policy `can_use_external_ai=False` → always local.
          * Otherwise honour the agent's `preferred_provider`.
          * Default to the policy's `default_model` provider (ollama).
        """
        privacy = request.privacy_level

        if privacy in _NEVER_EXTERNAL or request.force_local:
            model = request.preferred_model or _DEFAULT_MODELS["ollama"]
            return "ollama", model, False

        if not policy.can_use_external_ai:
            model = request.preferred_model or _DEFAULT_MODELS["ollama"]
            return "ollama", model, False

        provider: Provider = request.preferred_provider or _provider_from_default_model(
            policy.default_model
        )
        external = provider != "ollama"
        model = request.preferred_model or _DEFAULT_MODELS.get(
            provider, policy.default_model
        )
        return provider, model, external

    # ----- audit-log writers -----------------------------------------------
    def _finalise_success(
        self,
        *,
        audit_id: uuid.UUID,
        request: GatewayRequest,
        provider: Provider,
        model: str,
        external_call: bool,
        result: ProviderResult,
        input_scan_status: str,
        output_scan_status: str,
        redacted_prompt: str,
        redaction_map: dict[str, str],
    ) -> GatewayResponse:
        self._write_audit(
            audit_id=audit_id,
            request=request,
            provider=provider,
            model=model,
            external_call=external_call,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            estimated_cost_gbp=result.estimated_cost_gbp,
            input_scan_status=input_scan_status,
            output_scan_status=output_scan_status,
            final_status="completed",
            approval_required=False,
            approved_by_user=False,
            redacted_prompt=redacted_prompt,
            redaction_map=redaction_map,
        )
        return GatewayResponse(
            audit_log_id=audit_id,
            final_status="completed",
            provider=provider,
            model=model,
            external_call=external_call,
            text=result.text,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            estimated_cost_gbp=result.estimated_cost_gbp,
        )

    def _finalise_blocked(
        self,
        *,
        audit_id: uuid.UUID,
        request: GatewayRequest,
        provider: Provider,
        model: str,
        reason: str,
        final_status: FinalStatus = "blocked_by_policy",
        approval_required: bool = False,
        input_scan_status: str = "not_scanned",
        redacted_prompt: str | None = None,
        redaction_map: dict[str, str] | None = None,
    ) -> GatewayResponse:
        logger.info("Gateway blocked: %s", reason)
        self._write_audit(
            audit_id=audit_id,
            request=request,
            provider=provider,
            model=model,
            external_call=False,
            input_tokens=0,
            output_tokens=0,
            estimated_cost_gbp=Decimal("0"),
            input_scan_status=input_scan_status,
            output_scan_status="not_scanned",
            final_status=final_status,
            approval_required=approval_required,
            approved_by_user=False,
            redacted_prompt=redacted_prompt,
            redaction_map=redaction_map,
        )
        return GatewayResponse(
            audit_log_id=audit_id,
            final_status=final_status,
            provider=provider,
            model=model,
            external_call=False,
            text=None,
            error=reason,
        )

    def _finalise_provider_error(
        self,
        *,
        audit_id: uuid.UUID,
        request: GatewayRequest,
        provider: Provider,
        model: str,
        external_call: bool,
        error: str,
        input_scan_status: str,
        redacted_prompt: str | None = None,
        redaction_map: dict[str, str] | None = None,
    ) -> GatewayResponse:
        self._write_audit(
            audit_id=audit_id,
            request=request,
            provider=provider,
            model=model,
            external_call=external_call,
            input_tokens=0,
            output_tokens=0,
            estimated_cost_gbp=Decimal("0"),
            input_scan_status=input_scan_status,
            output_scan_status="not_scanned",
            final_status="provider_error",
            approval_required=False,
            approved_by_user=False,
            redacted_prompt=redacted_prompt,
            redaction_map=redaction_map,
        )
        return GatewayResponse(
            audit_log_id=audit_id,
            final_status="provider_error",
            provider=provider,
            model=model,
            external_call=external_call,
            text=None,
            error=error,
        )

    def _write_audit(
        self,
        *,
        audit_id: uuid.UUID,
        request: GatewayRequest,
        provider: Provider,
        model: str,
        external_call: bool,
        input_tokens: int,
        output_tokens: int,
        estimated_cost_gbp: Decimal,
        input_scan_status: str,
        output_scan_status: str,
        final_status: FinalStatus,
        approval_required: bool,
        approved_by_user: bool,
        redacted_prompt: str | None,
        redaction_map: dict[str, str] | None,
    ) -> None:
        """Insert an `ai_audit_logs` row. Raw prompts are NEVER written."""
        log = AIAuditLog(
            id=audit_id,
            user_id=request.user_id,
            agent_id=request.agent_id,
            privacy_level=request.privacy_level.value,
            provider=provider,
            model=model,
            request_type=request.request_type,
            external_call=external_call,
            original_prompt_stored=False,
            redacted_prompt=(
                {"text": redacted_prompt} if redacted_prompt is not None else None
            ),
            redaction_map=redaction_map or None,
            approval_required=approval_required,
            approved_by_user=approved_by_user,
            approved_at=datetime.now(timezone.utc) if approved_by_user else None,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost_gbp=estimated_cost_gbp,
            input_scan_status=input_scan_status,
            output_scan_status=output_scan_status,
            final_status=final_status,
        )
        self.db.add(log)
        self.db.commit()


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def _intersect(a: list[str], b: list[str]) -> list[str]:
    bs = set(b)
    return [x for x in a if x in bs]


def _provider_from_default_model(default_model: str) -> Provider:
    """Map the policy's `default_model` string to a provider name."""
    m = (default_model or "").lower()
    if m == "ollama" or m.startswith("llama") or m.startswith("ollama"):
        return "ollama"
    if m.startswith("gpt") or m.startswith("openai"):
        return "openai"
    if m.startswith("claude"):
        return "claude"
    if m.startswith("grok"):
        return "grok"
    if m.startswith("groq") or "groq" in m:
        return "groq"
    return "ollama"
