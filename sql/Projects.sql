CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'finished')),

    professional_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    budget_total NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);