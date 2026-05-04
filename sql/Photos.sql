CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES stages(id),

    file_path TEXT NOT NULL,
    description TEXT,

    type TEXT DEFAULT 'progress',
    visibility TEXT DEFAULT 'public',

    created_at TIMESTAMP DEFAULT NOW()
);
