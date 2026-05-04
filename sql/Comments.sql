CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()
);
