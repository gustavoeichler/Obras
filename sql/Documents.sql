CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    file_path TEXT NOT NULL,
    name TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
