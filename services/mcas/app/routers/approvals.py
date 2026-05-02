"""Approval inbox router (HITL gates)."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Approval, ApprovalStatus, Matter
from app.schemas import ApprovalItemResponse

router = APIRouter(tags=["approvals"])


def _approval_to_response(approval: Approval) -> ApprovalItemResponse:
    matter = approval.matter
    return ApprovalItemResponse(
        id=approval.id,
        matter_id=approval.matter_id,
        matter_display_id=matter.display_id if matter else "",
        matter_title=matter.title if matter else "",
        gate_type=approval.gate_type,
        summary=approval.summary,
        requested_by=approval.requested_by,
        created_at=approval.created_at,
        deadline=approval.deadline,
        status=approval.status,
    )


@router.get("/approvals", response_model=list[ApprovalItemResponse])
async def list_approvals(db: AsyncSession = Depends(get_db)) -> list[ApprovalItemResponse]:
    result = await db.execute(
        select(Approval).order_by(Approval.created_at.desc())
    )
    approvals = result.scalars().all()
    return [_approval_to_response(a) for a in approvals]


@router.post("/approvals/{approval_id}/approve")
async def approve_approval(
    approval_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalar_one_or_none()
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != ApprovalStatus.PENDING.value:
        raise HTTPException(status_code=409, detail="Approval already decided")

    approval.status = ApprovalStatus.APPROVED.value
    approval.decided_at = datetime.now(UTC)
    approval.decided_by = "portal-user"  # TODO: replace with authenticated user
    await db.commit()
    return {"status": "approved", "approval_id": str(approval_id)}


@router.post("/approvals/{approval_id}/reject")
async def reject_approval(
    approval_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    result = await db.execute(select(Approval).where(Approval.id == approval_id))
    approval = result.scalar_one_or_none()
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != ApprovalStatus.PENDING.value:
        raise HTTPException(status_code=409, detail="Approval already decided")

    approval.status = ApprovalStatus.REJECTED.value
    approval.decided_at = datetime.now(UTC)
    approval.decided_by = "portal-user"  # TODO: replace with authenticated user
    await db.commit()
    return {"status": "rejected", "approval_id": str(approval_id)}
