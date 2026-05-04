from marshmallow import Schema, fields, validate


class BOMProductSchema(Schema):
    id       = fields.Int()
    name     = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    quantity = fields.Float(load_default=1.0)
    position = fields.Int(load_default=0)


class BOMStoreSchema(Schema):
    id            = fields.Int()
    name          = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    delivery_cost = fields.Float(load_default=0.0)
    position      = fields.Int(load_default=0)


class BOMPriceSchema(Schema):
    product_id = fields.Int(required=True)
    store_id   = fields.Int(required=True)
    price      = fields.Float(allow_none=True, load_default=None)


class BOMQuotationSchema(Schema):
    id         = fields.Int(dump_only=True)
    name       = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

    products = fields.List(fields.Nested(BOMProductSchema), load_default=list)
    stores   = fields.List(fields.Nested(BOMStoreSchema),   load_default=list)
    prices   = fields.List(fields.Nested(BOMPriceSchema),   load_default=list)


class _OptimizeProduct(Schema):
    key      = fields.Str(required=True)
    quantity = fields.Float(load_default=1.0)


class _OptimizeStore(Schema):
    key           = fields.Str(required=True)
    name          = fields.Str(required=True)
    delivery_cost = fields.Float(load_default=0.0)


class _OptimizePrice(Schema):
    product_key = fields.Str(required=True)
    store_key   = fields.Str(required=True)
    price       = fields.Float(allow_none=True, load_default=None)


class OptimizeRequestSchema(Schema):
    products = fields.List(fields.Nested(_OptimizeProduct), required=True)
    stores   = fields.List(fields.Nested(_OptimizeStore),   required=True)
    prices   = fields.List(fields.Nested(_OptimizePrice),   required=True)
    # Optional subset of strategies to run; omit/empty = run all.
    methods  = fields.List(fields.Str(), load_default=list)
