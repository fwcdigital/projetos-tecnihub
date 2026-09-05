ALTER TABLE projects
ADD COLUMN account_status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
CHECK (account_status IN ('ACTIVE', 'INACTIVE'));

CREATE INDEX idx_projects_account_status ON projects(account_status);

CREATE TABLE deleted_project_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_project_id UUID NOT NULL,
    original_client_id UUID NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    snapshot JSONB NOT NULL
);

CREATE INDEX idx_deleted_project_snapshots_original_project_id
ON deleted_project_snapshots(original_project_id, deleted_at DESC);

CREATE INDEX idx_deleted_project_snapshots_deleted_by
ON deleted_project_snapshots(deleted_by, deleted_at DESC);

ALTER TABLE deleted_project_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE deleted_project_snapshots FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE deleted_project_snapshots FROM authenticated;
    END IF;
END;
$$;
