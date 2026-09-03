ALTER TABLE tasks
ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE tasks
ADD CONSTRAINT tasks_parent_not_self CHECK (parent_task_id IS NULL OR parent_task_id <> id);

CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

CREATE TABLE task_assignees (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id)
);

INSERT INTO task_assignees (task_id, user_id)
SELECT id, responsible_user_id FROM tasks
ON CONFLICT DO NOTHING;

CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);

CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    due_date DATE,
    due_time TIME,
    responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checklist_items_task_id ON checklist_items(task_id, position);

CREATE TRIGGER checklist_items_set_updated_at
BEFORE UPDATE ON checklist_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE project_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('FILE', 'GOOGLE_DRIVE')),
    name VARCHAR(255) NOT NULL,
    url TEXT,
    storage_path TEXT,
    mime_type VARCHAR(160),
    size_bytes BIGINT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (kind = 'GOOGLE_DRIVE' AND url IS NOT NULL AND storage_path IS NULL)
        OR (kind = 'FILE' AND storage_path IS NOT NULL)
    )
);

CREATE INDEX idx_project_resources_project_id ON project_resources(project_id, created_at);

CREATE TABLE recurrence_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    frequency VARCHAR(24) NOT NULL CHECK (frequency IN ('DIARIO', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'PERSONALIZADO')),
    rule_text VARCHAR(255) NOT NULL,
    custom_interval_days INTEGER CHECK (custom_interval_days IS NULL OR custom_interval_days > 0),
    next_occurrence_date DATE NOT NULL,
    occurrence_time TIME,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'ENDED')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tasks
ADD COLUMN generated_by_rule_id UUID REFERENCES recurrence_rules(id) ON DELETE SET NULL;

CREATE INDEX idx_recurrence_rules_status_next ON recurrence_rules(status, next_occurrence_date);
CREATE INDEX idx_tasks_generated_by_rule_id ON tasks(generated_by_rule_id);
CREATE UNIQUE INDEX uq_tasks_rule_occurrence
ON tasks(generated_by_rule_id, due_date)
WHERE generated_by_rule_id IS NOT NULL;

CREATE TRIGGER recurrence_rules_set_updated_at
BEFORE UPDATE ON recurrence_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE task_assignees, checklist_items, project_resources, recurrence_rules FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE task_assignees, checklist_items, project_resources, recurrence_rules FROM authenticated;
    END IF;
END;
$$;
