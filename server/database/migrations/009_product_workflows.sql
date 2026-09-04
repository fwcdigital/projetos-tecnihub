ALTER TABLE product_statuses
ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE product_statuses
SET is_completed = TRUE
WHERE id IN (
    'SITE_COMPLETED', 'LANDING_PAGE_COMPLETED', 'ECOMMERCE_COMPLETED',
    'PAID_TRAFFIC_ENDED', 'SEO_COMPLETED', 'MAINTENANCE_COMPLETED',
    'INTERNAL_COMPLETED', 'OTHER_COMPLETED'
);

UPDATE projects
SET product_status_id = CASE status
    WHEN 'PLANNING' THEN CASE product_id
        WHEN 'MAINTENANCE' THEN 'MAINTENANCE_WAITING_START'
        ELSE product_id || '_PLANNING'
    END
    WHEN 'WAITING_TO_START' THEN CASE product_id
        WHEN 'MAINTENANCE' THEN 'MAINTENANCE_WAITING_START'
        ELSE product_id || '_PLANNING'
    END
    WHEN 'IN_PROGRESS' THEN CASE product_id
        WHEN 'SITE' THEN 'SITE_DEVELOPMENT'
        WHEN 'LANDING_PAGE' THEN 'LANDING_PAGE_DEVELOPMENT'
        WHEN 'ECOMMERCE' THEN 'ECOMMERCE_DEVELOPMENT'
        WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_ACTIVE_CAMPAIGNS'
        WHEN 'SEO' THEN 'SEO_IMPLEMENTATION'
        WHEN 'MAINTENANCE' THEN 'MAINTENANCE_IN_PROGRESS'
        WHEN 'INTERNAL' THEN 'INTERNAL_IN_PROGRESS'
        ELSE 'OTHER_IN_PROGRESS'
    END
    WHEN 'WAITING_CLIENT' THEN CASE product_id
        WHEN 'INTERNAL' THEN 'INTERNAL_IN_REVIEW'
        ELSE product_id || '_WAITING_CLIENT'
    END
    WHEN 'IN_REVIEW' THEN CASE product_id
        WHEN 'SITE' THEN 'SITE_INTERNAL_REVIEW'
        WHEN 'LANDING_PAGE' THEN 'LANDING_PAGE_REVIEW'
        WHEN 'ECOMMERCE' THEN 'ECOMMERCE_TESTING'
        WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_OPTIMIZATION'
        WHEN 'SEO' THEN 'SEO_MONITORING'
        WHEN 'MAINTENANCE' THEN 'MAINTENANCE_IN_REVIEW'
        WHEN 'INTERNAL' THEN 'INTERNAL_IN_REVIEW'
        ELSE 'OTHER_IN_REVIEW'
    END
    WHEN 'PAUSED' THEN product_id || '_PAUSED'
    WHEN 'COMPLETED' THEN CASE product_id
        WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_ENDED'
        ELSE product_id || '_COMPLETED'
    END
    WHEN 'CANCELLED' THEN CASE product_id
        WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_ENDED'
        ELSE product_id || '_COMPLETED'
    END
    ELSE CASE product_id
        WHEN 'MAINTENANCE' THEN 'MAINTENANCE_WAITING_START'
        ELSE product_id || '_PLANNING'
    END
END;

ALTER TABLE projects ALTER COLUMN product_status_id SET NOT NULL;

CREATE OR REPLACE FUNCTION map_legacy_project_type_to_product()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.product_id IS NULL THEN
        NEW.product_id = CASE NEW.project_type
            WHEN 'WEBSITE' THEN 'SITE'
            WHEN 'LANDING_PAGE' THEN 'LANDING_PAGE'
            WHEN 'ECOMMERCE' THEN 'ECOMMERCE'
            WHEN 'GOOGLE_ADS' THEN 'PAID_TRAFFIC'
            WHEN 'META_ADS' THEN 'PAID_TRAFFIC'
            WHEN 'SEO' THEN 'SEO'
            WHEN 'MAINTENANCE' THEN 'MAINTENANCE'
            WHEN 'INTERNAL' THEN 'INTERNAL'
            ELSE 'OTHER'
        END;
    END IF;
    IF NEW.product_status_id IS NULL THEN
        SELECT status.id
        INTO NEW.product_status_id
        FROM product_statuses status
        WHERE status.product_id = NEW.product_id
          AND status.active = TRUE
        ORDER BY status.position, status.name
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

ALTER TABLE tasks DROP CONSTRAINT tasks_status_check;
ALTER TABLE tasks ALTER COLUMN status DROP DEFAULT;
ALTER TABLE tasks ALTER COLUMN status TYPE VARCHAR(96);

UPDATE tasks task
SET status = CASE task.status
    WHEN 'BACKLOG' THEN CASE project.product_id
        WHEN 'MAINTENANCE' THEN 'MAINTENANCE_WAITING_START'
        ELSE project.product_id || '_PLANNING'
    END
    WHEN 'A_FAZER' THEN CASE project.product_id
        WHEN 'MAINTENANCE' THEN 'MAINTENANCE_WAITING_START'
        WHEN 'INTERNAL' THEN 'INTERNAL_TODO'
        WHEN 'OTHER' THEN 'OTHER_TODO'
        ELSE project.product_id || '_PLANNING'
    END
    WHEN 'EM_ANDAMENTO' THEN CASE project.product_id
        WHEN 'SITE' THEN 'SITE_DEVELOPMENT'
        WHEN 'LANDING_PAGE' THEN 'LANDING_PAGE_DEVELOPMENT'
        WHEN 'ECOMMERCE' THEN 'ECOMMERCE_DEVELOPMENT'
        WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_ACTIVE_CAMPAIGNS'
        WHEN 'SEO' THEN 'SEO_IMPLEMENTATION'
        WHEN 'MAINTENANCE' THEN 'MAINTENANCE_IN_PROGRESS'
        WHEN 'INTERNAL' THEN 'INTERNAL_IN_PROGRESS'
        ELSE 'OTHER_IN_PROGRESS'
    END
    WHEN 'AGUARDANDO_CLIENTE' THEN CASE project.product_id
        WHEN 'INTERNAL' THEN 'INTERNAL_IN_REVIEW'
        ELSE project.product_id || '_WAITING_CLIENT'
    END
    WHEN 'EM_REVISAO' THEN CASE project.product_id
        WHEN 'SITE' THEN 'SITE_INTERNAL_REVIEW'
        WHEN 'LANDING_PAGE' THEN 'LANDING_PAGE_REVIEW'
        WHEN 'ECOMMERCE' THEN 'ECOMMERCE_TESTING'
        WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_OPTIMIZATION'
        WHEN 'SEO' THEN 'SEO_MONITORING'
        WHEN 'MAINTENANCE' THEN 'MAINTENANCE_IN_REVIEW'
        WHEN 'INTERNAL' THEN 'INTERNAL_IN_REVIEW'
        ELSE 'OTHER_IN_REVIEW'
    END
    WHEN 'BLOQUEADO' THEN project.product_id || '_PAUSED'
    WHEN 'CONCLUIDO' THEN CASE project.product_id
        WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_ENDED'
        ELSE project.product_id || '_COMPLETED'
    END
    ELSE project.product_status_id
END
FROM projects project
WHERE project.id = task.project_id;

ALTER TABLE tasks
ADD CONSTRAINT tasks_product_status_fkey
FOREIGN KEY (status) REFERENCES product_statuses(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION map_legacy_task_status(product_key VARCHAR, legacy_status VARCHAR)
RETURNS VARCHAR
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE legacy_status
        WHEN 'BACKLOG' THEN CASE product_key
            WHEN 'MAINTENANCE' THEN 'MAINTENANCE_WAITING_START'
            ELSE product_key || '_PLANNING'
        END
        WHEN 'A_FAZER' THEN CASE product_key
            WHEN 'MAINTENANCE' THEN 'MAINTENANCE_WAITING_START'
            WHEN 'INTERNAL' THEN 'INTERNAL_TODO'
            WHEN 'OTHER' THEN 'OTHER_TODO'
            ELSE product_key || '_PLANNING'
        END
        WHEN 'EM_ANDAMENTO' THEN CASE product_key
            WHEN 'SITE' THEN 'SITE_DEVELOPMENT'
            WHEN 'LANDING_PAGE' THEN 'LANDING_PAGE_DEVELOPMENT'
            WHEN 'ECOMMERCE' THEN 'ECOMMERCE_DEVELOPMENT'
            WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_ACTIVE_CAMPAIGNS'
            WHEN 'SEO' THEN 'SEO_IMPLEMENTATION'
            WHEN 'MAINTENANCE' THEN 'MAINTENANCE_IN_PROGRESS'
            WHEN 'INTERNAL' THEN 'INTERNAL_IN_PROGRESS'
            ELSE 'OTHER_IN_PROGRESS'
        END
        WHEN 'AGUARDANDO_CLIENTE' THEN CASE product_key
            WHEN 'INTERNAL' THEN 'INTERNAL_IN_REVIEW'
            ELSE product_key || '_WAITING_CLIENT'
        END
        WHEN 'EM_REVISAO' THEN CASE product_key
            WHEN 'SITE' THEN 'SITE_INTERNAL_REVIEW'
            WHEN 'LANDING_PAGE' THEN 'LANDING_PAGE_REVIEW'
            WHEN 'ECOMMERCE' THEN 'ECOMMERCE_TESTING'
            WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_OPTIMIZATION'
            WHEN 'SEO' THEN 'SEO_MONITORING'
            WHEN 'MAINTENANCE' THEN 'MAINTENANCE_IN_REVIEW'
            WHEN 'INTERNAL' THEN 'INTERNAL_IN_REVIEW'
            ELSE 'OTHER_IN_REVIEW'
        END
        WHEN 'BLOQUEADO' THEN product_key || '_PAUSED'
        WHEN 'CONCLUIDO' THEN CASE product_key
            WHEN 'PAID_TRAFFIC' THEN 'PAID_TRAFFIC_ENDED'
            ELSE product_key || '_COMPLETED'
        END
        ELSE legacy_status
    END;
$$;

CREATE OR REPLACE FUNCTION validate_task_product_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    project_product_id VARCHAR;
BEGIN
    SELECT project.product_id
    INTO project_product_id
    FROM projects project
    WHERE project.id = NEW.project_id;

    IF NEW.status IN ('BACKLOG', 'A_FAZER', 'EM_ANDAMENTO', 'AGUARDANDO_CLIENTE', 'EM_REVISAO', 'BLOQUEADO', 'CONCLUIDO') THEN
        NEW.status = map_legacy_task_status(project_product_id, NEW.status);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM projects project
        INNER JOIN product_statuses product_status
            ON product_status.product_id = project.product_id
           AND product_status.id = NEW.status
        WHERE project.id = NEW.project_id
    ) THEN
        RAISE EXCEPTION 'Status da tarefa incompatível com o produto do projeto.'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_validate_product_status
BEFORE INSERT OR UPDATE OF project_id, status ON tasks
FOR EACH ROW EXECUTE FUNCTION validate_task_product_status();
