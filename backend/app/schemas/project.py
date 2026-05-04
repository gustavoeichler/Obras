from marshmallow import Schema, fields, validate


class ProjectSchema(Schema):
    id      = fields.Int(dump_only=True)
    name    = fields.Str(validate=validate.Length(min=1, max=200), load_default="Minha Obra")
    area_m2 = fields.Float(validate=validate.Range(min=0.01), load_default=None)
