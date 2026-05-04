from marshmallow import Schema, fields, validate
from app.models.document import DOC_TYPES


class DocumentSchema(Schema):
    id                = fields.Int(dump_only=True)
    name              = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    type              = fields.Str(validate=validate.OneOf(DOC_TYPES), load_default="other")
    original_filename = fields.Str(dump_only=True)
    file_size         = fields.Int(dump_only=True)
    mime_type         = fields.Str(dump_only=True)
    uploaded_at       = fields.DateTime(dump_only=True)
    file_url          = fields.Str(dump_only=True)
