from flask import abort

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.category import Category


def _get_scoped(project_id, category_id):
    cat = Category.query.get_or_404(category_id)
    if cat.project_id != project_id:
        abort(404)
    return cat


def list_categories(project_id, user):
    check_project_access(project_id, user)
    return Category.query.filter_by(project_id=project_id).order_by(Category.name).all()


def get_category(project_id, category_id, user):
    check_project_access(project_id, user)
    return _get_scoped(project_id, category_id)


def create_category(project_id, data, user):
    check_project_access(project_id, user)
    category = Category(project_id=project_id, name=data["name"])
    db.session.add(category)
    db.session.commit()
    return category


def update_category(project_id, category_id, data, user):
    category = get_category(project_id, category_id, user)
    category.name = data.get("name", category.name)
    db.session.commit()
    return category


def delete_category(project_id, category_id, user):
    category = get_category(project_id, category_id, user)
    db.session.delete(category)
    db.session.commit()
