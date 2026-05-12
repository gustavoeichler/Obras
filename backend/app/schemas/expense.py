from marshmallow import Schema, fields, validate


class _NestedCategory(Schema):
    id = fields.Int()
    name = fields.Str()


class _NestedStage(Schema):
    id = fields.Int()
    name = fields.Str()


class _NestedSupplier(Schema):
    id = fields.Int()
    name = fields.Str()


class _NestedUser(Schema):
    id    = fields.Int()
    email = fields.Str()


class ExpenseSchema(Schema):
    id = fields.Int(dump_only=True)
    amount = fields.Float(required=True, validate=validate.Range(min=0.01))
    date = fields.Date(required=True)
    description = fields.Str(validate=validate.Length(max=200), load_default=None)
    category_id = fields.Int(load_default=None)
    stage_id = fields.Int(load_default=None)
    supplier_id = fields.Int(load_default=None)
    quantity             = fields.Float(load_default=None, allow_none=True, validate=validate.Range(min=0))
    unit                 = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=20))
    responsible_user_id  = fields.Int(load_default=None, allow_none=True)

    # Read-only nested objects returned in GET responses
    category         = fields.Nested(_NestedCategory, dump_only=True)
    stage            = fields.Nested(_NestedStage,    dump_only=True)
    supplier         = fields.Nested(_NestedSupplier, dump_only=True)
    responsible_user = fields.Nested(_NestedUser,     dump_only=True)
