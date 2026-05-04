from app import db

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

class Supplier(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    type = db.Column(db.String(50))
    contact = db.Column(db.String(100))

class Stage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    status = db.Column(db.String(50))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float)
    date = db.Column(db.Date)
    description = db.Column(db.String(200))

    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))
    stage_id = db.Column(db.Integer, db.ForeignKey('stage.id'))
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'))

    category = db.relationship('Category')
    stage = db.relationship('Stage')
    supplier = db.relationship('Supplier')