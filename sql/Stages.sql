CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    position INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);
