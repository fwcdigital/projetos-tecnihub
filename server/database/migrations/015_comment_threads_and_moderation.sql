ALTER TABLE task_comments
    ADD COLUMN parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN deleted_at TIMESTAMPTZ,
    ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT task_comments_parent_not_self CHECK (parent_comment_id IS NULL OR parent_comment_id <> id);

UPDATE task_comments SET updated_at = created_at;

CREATE INDEX idx_task_comments_parent_created
    ON task_comments(parent_comment_id, created_at)
    WHERE parent_comment_id IS NOT NULL;

CREATE INDEX idx_task_comments_task_active
    ON task_comments(task_id, created_at DESC)
    WHERE deleted_at IS NULL;
