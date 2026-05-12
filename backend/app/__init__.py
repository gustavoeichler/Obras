import os
import re
from flask import Flask
from flask_cors import CORS
from supabase import create_client

from config import Config
from app.extensions import db, migrate, jwt


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    if app.config["SUPABASE_URL"] and app.config["SUPABASE_SERVICE_KEY"]:
        app.supabase = create_client(
            app.config["SUPABASE_URL"],
            app.config["SUPABASE_SERVICE_KEY"],
        )
    else:
        app.supabase = None

    db.init_app(app)
    migrate.init_app(app, db, directory=os.path.join(os.path.dirname(__file__), '..', 'migrations'))
    jwt.init_app(app)

    from werkzeug.exceptions import HTTPException

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        from flask import jsonify
        return jsonify({"error": e.name, "message": e.description}), e.code

    # Production Netlify URL, deploy previews (deploy-preview-N--obra-saas.netlify.app),
    # branch deploys (branchname--obra-saas.netlify.app), and local dev.
    allowed_origins = [
        "https://obra-saas.netlify.app",
        re.compile(r"^https://[\w-]+--obra-saas\.netlify\.app$"),
        "http://localhost:5173",
    ]
    CORS(
        app,
        resources={
            r"/api/*":  {"origins": allowed_origins},
            r"/auth/*": {"origins": allowed_origins},
        },
    )

    from app.routes.auth               import bp as auth_bp
    from app.routes.me_branding        import bp as me_branding_bp
    from app.routes.projects           import bp as projects_bp
    from app.routes.invitations        import bp as invitations_bp
    from app.routes.photos             import bp as photos_bp
    from app.routes.project_stages     import bp as project_stages_bp
    from app.routes.project_tasks      import bp as project_tasks_bp
    from app.routes.project_metrics    import bp as project_metrics_bp
    from app.routes.project_expenses   import bp as project_expenses_bp
    from app.routes.project_budgets    import bp as project_budgets_bp
    from app.routes.project_categories import bp as project_categories_bp
    from app.routes.project_suppliers  import bp as project_suppliers_bp
    from app.routes.project_documents  import bp as project_documents_bp
    from app.routes.project_analytics  import bp as project_analytics_bp
    from app.routes.project_dashboard  import bp as project_dashboard_bp
    from app.routes.project_bom        import bp as project_bom_bp
    from app.routes.project_daily_reports import bp as project_daily_reports_bp
    from app.routes.project_health     import bp as project_health_bp
    from app.routes.price_intelligence import bp as price_intelligence_bp
    from app.routes.project_timeline   import bp as project_timeline_bp
    from app.routes.org   import bp as org_bp
    from app.routes.admin import bp as admin_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(me_branding_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(invitations_bp)
    app.register_blueprint(photos_bp)
    app.register_blueprint(project_stages_bp)
    app.register_blueprint(project_tasks_bp)
    app.register_blueprint(project_metrics_bp)
    app.register_blueprint(project_expenses_bp)
    app.register_blueprint(project_budgets_bp)
    app.register_blueprint(project_categories_bp)
    app.register_blueprint(project_suppliers_bp)
    app.register_blueprint(project_documents_bp)
    app.register_blueprint(project_analytics_bp)
    app.register_blueprint(project_dashboard_bp)
    app.register_blueprint(project_bom_bp)
    app.register_blueprint(project_daily_reports_bp)
    app.register_blueprint(project_health_bp)
    app.register_blueprint(price_intelligence_bp)
    app.register_blueprint(project_timeline_bp)
    app.register_blueprint(org_bp)
    app.register_blueprint(admin_bp)

    return app
