from flask import Blueprint, render_template, request, redirect, url_for
from app import db
from app.models import Expense, Category, Stage, Supplier
from datetime import datetime

main = Blueprint('main', __name__)

@main.route("/")
def dashboard():
    expenses = Expense.query.all()
    total = sum(e.amount for e in expenses)
    return render_template("dashboard.html", total=total)

# ------------------ EXPENSES ------------------

@main.route("/expenses", methods=["GET", "POST"])
def expenses():
    if request.method == "POST":
        try:
            amount = float(request.form.get("amount", 0))
            date_str = request.form.get("date")
            description = request.form.get("description", "")
            category_id = request.form.get("category_id")

            if not date_str:
                raise ValueError("Data é obrigatória")

            date = datetime.strptime(date_str, "%Y-%m-%d")

            expense = Expense(
                amount=amount,
                date=date,
                description=description,
                category_id=int(category_id) if category_id else None
            )

            db.session.add(expense)
            db.session.commit()

            return redirect(url_for("main.expenses"))

        except Exception as e:
            flash(f"Erro ao salvar: {str(e)}")

    expenses = Expense.query.all()
    categories = Category.query.all()
    return render_template("expenses.html", expenses=expenses, categories=categories)

# ------------------ STAGES ------------------

@main.route("/stages", methods=["GET", "POST"])
def stages():
    if request.method == "POST":
        stage = Stage(
            name=request.form["name"],
            status="Não iniciada"
        )
        db.session.add(stage)
        db.session.commit()
        return redirect(url_for("main.stages"))

    stages = Stage.query.all()
    return render_template("stages.html", stages=stages)

# ------------------ SUPPLIERS ------------------

@main.route("/suppliers", methods=["GET", "POST"])
def suppliers():
    if request.method == "POST":
        supplier = Supplier(
            name=request.form["name"],
            type=request.form["type"],
            contact=request.form["contact"]
        )
        db.session.add(supplier)
        db.session.commit()
        return redirect(url_for("main.suppliers"))

    suppliers = Supplier.query.all()
    return render_template("suppliers.html", suppliers=suppliers)