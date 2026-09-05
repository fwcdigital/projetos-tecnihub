CREATE TABLE comment_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentioned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    start_offset INTEGER NOT NULL CHECK (start_offset >= 0),
    end_offset INTEGER NOT NULL CHECK (end_offset > start_offset),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT comment_mentions_comment_user_unique UNIQUE (comment_id, mentioned_user_id)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ,
    CONSTRAINT notifications_comment_recipient_unique UNIQUE (user_id, comment_id)
);

CREATE INDEX idx_comment_mentions_comment ON comment_mentions(comment_id, start_offset);
CREATE INDEX idx_comment_mentions_user ON comment_mentions(mentioned_user_id, created_at DESC);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_project ON notifications(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_notifications_task ON notifications(task_id) WHERE task_id IS NOT NULL;

ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE comment_mentions, notifications FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE comment_mentions, notifications FROM authenticated;
    END IF;
END;
$$;
