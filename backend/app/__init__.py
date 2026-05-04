import os
from flask import Flask
from flask_cors import CORS

from config import Config
from app.extensions import db, migrate, jwt


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db, directory=os.path.join(os.path.dirname(__file__), '..', 'migrations'))
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}, r"/auth/*": {"origins": "*"}})

    from app.routes.auth               import bp as auth_bp
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

    app.register_blueprint(auth_bp)
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

    return app
