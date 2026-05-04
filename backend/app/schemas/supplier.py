from marshmallow import Schema, fields, validate


class SupplierSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    type = fields.Str(validate=validate.Length(max=50), load_default=None)
    contact = fields.Str(validate=validate.Length(max=100), load_default=None)
