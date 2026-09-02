ALTER TABLE projects
ADD COLUMN briefing JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    responsible_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'A_FAZER' CHECK (status IN (
        'BACKLOG', 'A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO_CLIENTE',
        'EM_REVISAO', 'CONCLUIDO', 'BLOQUEADO'
    )),
    priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('URGENTE', 'ALTA', 'NORMAL', 'BAIXA')),
    start_date DATE,
    due_date DATE NOT NULL,
    due_time TIME,
    completed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_responsible_user_id ON tasks(responsible_user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

CREATE TRIGGER tasks_set_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE tasks FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE tasks FROM authenticated;
    END IF;
END;
$$;
