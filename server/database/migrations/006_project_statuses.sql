CREATE TABLE project_statuses (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(96) NOT NULL,
    color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    position INTEGER NOT NULL CHECK (position >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO project_statuses (id, name, color, position, active) VALUES
    ('PLANNING', 'Planejamento', '#818CF8', 0, TRUE),
    ('WAITING_TO_START', 'Aguardando início', '#60A5FA', 1, TRUE),
    ('IN_PROGRESS', 'Em andamento', '#34D399', 2, TRUE),
    ('WAITING_CLIENT', 'Aguardando cliente', '#FBBF24', 3, TRUE),
    ('IN_REVIEW', 'Em revisão', '#C084FC', 4, TRUE),
    ('PAUSED', 'Pausado', '#A1A1AA', 5, TRUE),
    ('COMPLETED', 'Concluído', '#2DD4BF', 6, TRUE),
    ('CANCELLED', 'Cancelado', '#FB7185', 7, TRUE);

ALTER TABLE projects DROP CONSTRAINT projects_status_check;
ALTER TABLE projects ALTER COLUMN status TYPE VARCHAR(64);
ALTER TABLE projects
    ADD CONSTRAINT projects_status_fkey
    FOREIGN KEY (status) REFERENCES project_statuses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX idx_project_statuses_active_position ON project_statuses(active, position);
CREATE UNIQUE INDEX uq_project_statuses_name_lower ON project_statuses(LOWER(name));

CREATE TRIGGER project_statuses_set_updated_at
BEFORE UPDATE ON project_statuses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE project_statuses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE project_statuses FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE project_statuses FROM authenticated;
    END IF;
END;
$$;
