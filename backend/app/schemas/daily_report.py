import os

from marshmallow import Schema, fields, validate

from app.models.daily_report_occurrence import OCCURRENCE_KINDS


class DailyReportOccurrenceSchema(Schema):
    id              = fields.Int(dump_only=True)
    daily_report_id = fields.Int(dump_only=True)
    kind            = fields.Str(required=True, validate=validate.OneOf(OCCURRENCE_KINDS))
    description     = fields.Str(required=True, validate=validate.Length(min=1, max=2000))
    stage_id        = fields.Int(load_default=None, allow_none=True)
    task_id         = fields.Int(load_default=None, allow_none=True)
    created_at      = fields.DateTime(dump_only=True)


class DailyReportNoteSchema(Schema):
    id              = fields.Int(dump_only=True)
    daily_report_id = fields.Int(dump_only=True)
    stage_id        = fields.Int(load_default=None, allow_none=True)
    task_id         = fields.Int(load_default=None, allow_none=True)
    comment         = fields.Str(required=True, validate=validate.Length(min=1, max=2000))
    created_at      = fields.DateTime(dump_only=True)


class DailyReportPhotoSchema(Schema):
    id          = fields.Int(dump_only=True)
    description = fields.Str(dump_only=True)
    url         = fields.Method("get_url", dump_only=True)
    created_at  = fields.DateTime(dump_only=True)

    def get_url(self, obj):
        print("Getting URL for photo:", obj.id, "filename:", obj.filename)
        base = os.environ.get("BACKEND_URL", "").rstrip("/")
        return f"{base}/api/photos/{obj.id}/file" if obj.filename else None


class DailyReportSchema(Schema):
    id                 = fields.Int(dump_only=True)
    project_id         = fields.Int(dump_only=True)
    report_date        = fields.Date(required=True)
    weather            = fields.Str(allow_none=True, load_default=None)
    weather_temp_c     = fields.Float(allow_none=True, load_default=None)
    headcount_json     = fields.List(fields.Dict(), allow_none=True, load_default=None)
    notes              = fields.Str(allow_none=True, load_default=None)
    created_by_user_id = fields.Int(dump_only=True)
    pdf_document_id    = fields.Int(dump_only=True)
    created_at         = fields.DateTime(dump_only=True)
    updated_at         = fields.DateTime(dump_only=True)

    occurrences = fields.List(fields.Nested(DailyReportOccurrenceSchema), dump_only=True)
    photos      = fields.List(fields.Nested(DailyReportPhotoSchema),      dump_only=True)
    rdo_notes   = fields.List(fields.Nested(DailyReportNoteSchema),       dump_only=True)
