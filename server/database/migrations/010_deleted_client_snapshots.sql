CREATE TABLE deleted_client_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_client_id UUID NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    snapshot JSONB NOT NULL
);

CREATE INDEX idx_deleted_client_snapshots_original_client_id
ON deleted_client_snapshots(original_client_id, deleted_at DESC);

CREATE INDEX idx_deleted_client_snapshots_deleted_by
ON deleted_client_snapshots(deleted_by, deleted_at DESC);

ALTER TABLE deleted_client_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE deleted_client_snapshots FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE deleted_client_snapshots FROM authenticated;
    END IF;
END;
$$;
