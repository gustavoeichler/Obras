"""Approval service for workflow stage sign-offs."""
from datetime import datetime
from app.extensions import db
from app.models.stage_approval import StageApproval, APPROVAL_ROLES
from app.models.stage import Stage
from app.models.user import User


class ApprovalService:
    """Service for managing stage approvals."""

    @staticmethod
    def create_approval(stage_id: int, required_role: str) -> dict:
        """Create an approval requirement for a stage."""
        if required_role not in APPROVAL_ROLES:
            raise ValueError(f"Invalid role: {required_role}")
        
        stage = Stage.query.get_or_404(stage_id)
        
        # Check if this approval already exists
        existing = StageApproval.query.filter_by(
            stage_id=stage_id,
            required_role=required_role
        ).first()
        if existing:
            return ApprovalService._approval_to_dict(existing)
        
        approval = StageApproval(
            stage_id=stage_id,
            required_role=required_role,
            status="pending"
        )
        db.session.add(approval)
        db.session.commit()
        return ApprovalService._approval_to_dict(approval)

    @staticmethod
    def submit_approval(approval_id: int, status: str, user_id: int = None, rejection_reason: str = None) -> dict:
        """Submit an approval decision (approve or reject)."""
        if status not in ('approved', 'rejected'):
            raise ValueError(f"Invalid status: {status}")
        
        approval = StageApproval.query.get_or_404(approval_id)
        approval.status = status
        approval.approved_by_user_id = user_id
        approval.approval_date = datetime.utcnow()
        
        if status == 'rejected' and rejection_reason:
            approval.rejection_reason = rejection_reason
        
        db.session.commit()
        return ApprovalService._approval_to_dict(approval)

    @staticmethod
    def delete_approval(approval_id: int) -> None:
        """Delete an approval requirement."""
        approval = StageApproval.query.get_or_404(approval_id)
        db.session.delete(approval)
        db.session.commit()

    @staticmethod
    def get_stage_approvals(stage_id: int) -> list:
        """Get all approvals for a stage."""
        approvals = StageApproval.query.filter_by(stage_id=stage_id).all()
        return [ApprovalService._approval_to_dict(a) for a in approvals]

    @staticmethod
    def can_complete_stage(stage_id: int) -> tuple[bool, list[str]]:
        """Check if a stage can be completed (all approvals approved, all checklists done).
        
        Returns:
            tuple: (can_complete: bool, reasons: list[str])
        """
        from app.services.checklist_service import ChecklistService
        
        stage = Stage.query.get_or_404(stage_id)
        reasons = []
        
        # Check checklist completion
        items = StageChecklistItem.query.filter_by(stage_id=stage_id).all()
        if items:
            incomplete_items = [item for item in items if not item.is_completed]
            if incomplete_items:
                reasons.append(f"{len(incomplete_items)} checklist items pending")
        
        # Check approvals
        approvals = StageApproval.query.filter_by(stage_id=stage_id).all()
        pending_approvals = [a for a in approvals if a.status == 'pending']
        if pending_approvals:
            roles = [a.required_role for a in pending_approvals]
            reasons.append(f"Awaiting approval from: {', '.join(roles)}")
        
        rejected_approvals = [a for a in approvals if a.status == 'rejected']
        if rejected_approvals:
            reasons.append(f"Stage has been rejected by: {', '.join([a.required_role for a in rejected_approvals])}")
        
        can_complete = len(reasons) == 0
        return can_complete, reasons

    @staticmethod
    def get_pending_approvals(project_id: int) -> list:
        """Get all pending approvals for a project's stages."""
        from app.models.stage import Stage
        
        stages = Stage.query.filter_by(project_id=project_id).all()
        stage_ids = [s.id for s in stages]
        
        pending = StageApproval.query.filter(
            StageApproval.stage_id.in_(stage_ids),
            StageApproval.status == 'pending'
        ).all()
        
        return [ApprovalService._approval_to_dict(a) for a in pending]

    @staticmethod
    def _approval_to_dict(approval: StageApproval) -> dict:
        """Convert approval to dictionary."""
        return {
            'id': approval.id,
            'stage_id': approval.stage_id,
            'required_role': approval.required_role,
            'status': approval.status,
            'approved_by_user_id': approval.approved_by_user_id,
            'approval_date': approval.approval_date.isoformat() if approval.approval_date else None,
            'rejection_reason': approval.rejection_reason,
            'created_at': approval.created_at.isoformat() if approval.created_at else None,
        }


# Import after class definition to avoid circular imports
from app.models.stage_checklist import StageChecklistItem
