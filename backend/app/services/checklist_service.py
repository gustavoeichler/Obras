"""Checklist item service for workflow management."""
from datetime import datetime
from app.extensions import db
from app.models.stage_checklist import StageChecklistItem
from app.models.stage import Stage
from app.models.user import User


class ChecklistService:
    """Service for managing stage checklist items."""

    @staticmethod
    def create_item(stage_id: int, description: str) -> dict:
        """Create a new checklist item for a stage."""
        stage = Stage.query.get_or_404(stage_id)
        
        item = StageChecklistItem(
            stage_id=stage_id,
            description=description,
            is_completed=False
        )
        db.session.add(item)
        db.session.commit()
        return ChecklistService._item_to_dict(item)

    @staticmethod
    def toggle_item(item_id: int, is_completed: bool, user_id: int = None) -> dict:
        """Toggle checklist item completion status."""
        item = StageChecklistItem.query.get_or_404(item_id)
        
        item.is_completed = is_completed
        if is_completed:
            item.completed_by_user_id = user_id
            item.completed_at = datetime.utcnow()
        else:
            item.completed_by_user_id = None
            item.completed_at = None
        
        db.session.commit()
        ChecklistService._update_stage_completion(item.stage_id)
        return ChecklistService._item_to_dict(item)

    @staticmethod
    def delete_item(item_id: int) -> None:
        """Delete a checklist item."""
        item = StageChecklistItem.query.get_or_404(item_id)
        stage_id = item.stage_id
        db.session.delete(item)
        db.session.commit()
        ChecklistService._update_stage_completion(stage_id)

    @staticmethod
    def get_stage_items(stage_id: int) -> list:
        """Get all checklist items for a stage."""
        items = StageChecklistItem.query.filter_by(stage_id=stage_id).all()
        return [ChecklistService._item_to_dict(item) for item in items]

    @staticmethod
    def get_stage_completion_pct(stage_id: int) -> int:
        """Calculate completion percentage for a stage based on checklist items."""
        items = StageChecklistItem.query.filter_by(stage_id=stage_id).all()
        if not items:
            return 0
        completed = sum(1 for item in items if item.is_completed)
        return int((completed / len(items)) * 100)

    @staticmethod
    def _update_stage_completion(stage_id: int) -> None:
        """Update stage completion percentage based on checklist items."""
        stage = Stage.query.get(stage_id)
        if stage:
            stage.completion_pct = ChecklistService.get_stage_completion_pct(stage_id)
            db.session.commit()

    @staticmethod
    def _item_to_dict(item: StageChecklistItem) -> dict:
        """Convert checklist item to dictionary."""
        return {
            'id': item.id,
            'stage_id': item.stage_id,
            'description': item.description,
            'is_completed': item.is_completed,
            'completed_by_user_id': item.completed_by_user_id,
            'completed_at': item.completed_at.isoformat() if item.completed_at else None,
            'created_at': item.created_at.isoformat() if item.created_at else None,
        }
