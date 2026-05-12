from flask import abort

from app.extensions import db
from app.models.organization import Organization
from app.models.user import User


def get_org_or_404(user):
    """Return the user's org or abort. Aborts 403 if org is inactive."""
    if not user.org_id:
        abort(404, "Usuário não pertence a nenhuma organização")
    org = Organization.query.get_or_404(user.org_id)
    if not org.is_active:
        abort(403, "Organização inativa")
    return org


def update_org(org, data):
    """Update org name. Returns updated org."""
    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            abort(422, "name não pode ser vazio")
        if len(name) > 120:
            abort(422, "name deve ter no máximo 120 caracteres")
        org.name = name
    db.session.commit()
    return org


def list_members(org):
    """Return all users belonging to this org."""
    return User.query.filter_by(org_id=org.id).order_by(User.created_at).all()


def create_member(org, email, password):
    """Create a new professional member account in the org."""
    email = (email or "").strip().lower()
    if not email or not password:
        abort(422, "email e password são obrigatórios")
    if len(password) < 6:
        abort(422, "password deve ter ao menos 6 caracteres")
    if User.query.filter_by(email=email).first():
        abort(409, "E-mail já cadastrado")

    user = User(email=email, role="professional", org_id=org.id, is_org_admin=False)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def remove_member(org, member_id, requesting_user):
    """Remove a member from the org. Guards: cannot remove self, cannot remove last admin."""
    if member_id == requesting_user.id:
        abort(400, "Você não pode remover a si mesmo")

    member = User.query.get_or_404(member_id)
    if member.org_id != org.id:
        abort(404, "Membro não encontrado nesta organização")

    if member.is_org_admin:
        admin_count = User.query.filter_by(org_id=org.id, is_org_admin=True).count()
        if admin_count <= 1:
            abort(400, "Não é possível remover o único administrador da organização")

    member.org_id = None
    member.is_org_admin = False
    db.session.commit()
