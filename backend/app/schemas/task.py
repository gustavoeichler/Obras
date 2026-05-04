from marshmallow import Schema, fields, validate


class TaskSchema(Schema):
    id         = fields.Int(dump_only=True)
    stage_id   = fields.Int(dump_only=True)
    name       = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    is_done    = fields.Bool(load_default=False)
    created_at = fields.DateTime(dump_only=True)


class CreateTaskSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))


class UpdateTaskSchema(Schema):
    is_done = fields.Bool()
    name    = fields.Str(validate=validate.Length(min=1, max=200))
