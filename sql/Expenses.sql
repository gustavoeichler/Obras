CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    description TEXT,
    amount NUMERIC NOT NULL,
    category TEXT,
    supplier TEXT,

    date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);
