from flask import abort

from app.extensions import db
from app.middleware.auth import check_project_access
from app.models.supplier import Supplier


def _get_scoped(project_id, supplier_id):
    s = Supplier.query.get_or_404(supplier_id)
    if s.project_id != project_id:
        abort(404)
    return s


def list_suppliers(project_id, user):
    check_project_access(project_id, user)
    return Supplier.query.filter_by(project_id=project_id).order_by(Supplier.name).all()


def get_supplier(project_id, supplier_id, user):
    check_project_access(project_id, user)
    return _get_scoped(project_id, supplier_id)


def create_supplier(project_id, data, user):
    check_project_access(project_id, user)
    supplier = Supplier(
        project_id=project_id,
        name=data["name"],
        type=data.get("type"),
        contact=data.get("contact"),
    )
    db.session.add(supplier)
    db.session.commit()
    return supplier


def update_supplier(project_id, supplier_id, data, user):
    supplier = get_supplier(project_id, supplier_id, user)
    supplier.name    = data.get("name",    supplier.name)
    supplier.type    = data.get("type",    supplier.type)
    supplier.contact = data.get("contact", supplier.contact)
    db.session.commit()
    return supplier


def delete_supplier(project_id, supplier_id, user):
    supplier = get_supplier(project_id, supplier_id, user)
    db.session.delete(supplier)
    db.session.commit()
