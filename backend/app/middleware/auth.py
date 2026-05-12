"""Centralised authentication & multi-tenant authorisation helpers.

Two usage patterns are provided:

1. Route decorator  — ``@authorize_project_access``
   Reads ``project_id`` from the URL kwargs and verifies the JWT.

2. Service function — ``check_project_access(project_id, user)``
   Call directly from a service layer function when you already have the
   authenticated user object.  Returns the project on success, aborts 403/404
   otherwise.

3. Query helper     — ``secure_query(query, user)``
   Narrows an ORM query so a professional only sees their own projects.
   Use for list endpoints that are not already scoped by project_id.
"""
from functools import wraps

from flask import abort, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request


# ── service-level helper (no HTTP dependency) ─────────────────────────────────

def check_project_access(project_id, user):
    """Return the project if *user* is allowed to access it.

    * Professional: must belong to the same organisation as the project (org_id == user.org_id).
    * Client: must have an explicit ProjectClient link.

    Raises HTTP 404 if the project does not exist, HTTP 403 if access is
    denied.  Never raises 401 — the caller is responsible for having already
    authenticated the user.
    """
    # Import here to avoid circular imports at module load time.
    from app.models.project import Project
    from app.models.project_client import ProjectClient

    project = Project.query.get_or_404(project_id)

    if user.role == "professional":
        if user.org_id is None or project.org_id != user.org_id:
            abort(403, "Acesso negado")

    elif user.role == "client":
        linked = ProjectClient.query.filter_by(
            project_id=project_id, client_id=user.id
        ).first()
        if not linked:
            abort(403, "Acesso negado")

    else:
        abort(403, "Role inválida")

    return project


def secure_query(query, user):
    """Filter an ORM query so only rows belonging to the user's projects are
    returned.

    Intended for professionals listing their own data (e.g. all expenses, all
    stages).  The query must already have the target model joined or be the
    target model itself; this helper joins ``Project`` and filters by owner.

    Example::

        expenses = secure_query(
            Expense.query.join(Stage, Expense.stage_id == Stage.id),
            user
        ).all()
    """
    from app.models.project import Project

    if user.role == "professional":
        if user.org_id is None:
            abort(403, "Acesso negado")
        return query.join(Project, Project.id == _project_id_col(query)).filter(
            Project.org_id == user.org_id
        )
    # Clients: per-project access is already enforced by check_project_access;
    # secure_query is not meaningful for client-level list queries.
    abort(403, "secure_query só é aplicável a profissionais")


def _project_id_col(query):
    """Extract the ``project_id`` column from the first entity in *query*."""
    entity = query.column_descriptions[0]["entity"]
    return entity.project_id


# ── route decorator ───────────────────────────────────────────────────────────

def authorize_project_access(fn):
    """Route decorator: verify JWT and check project ownership/membership.

    Reads ``project_id`` from URL kwargs.  Aborts 401 if no valid token is
    present, 403 if access is denied.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        from app.models.user import User

        try:
            verify_jwt_in_request()
        except Exception:
            return jsonify({"error": "Token inválido ou ausente"}), 401

        user_id    = int(get_jwt_identity())
        project_id = kwargs.get("project_id")

        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuário não encontrado"}), 401

        check_project_access(project_id, user)

        return fn(*args, **kwargs)
    return wrapper
