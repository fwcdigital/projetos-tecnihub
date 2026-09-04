CREATE TABLE products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(96) NOT NULL,
    color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    position INTEGER NOT NULL CHECK (position >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_statuses (
    id VARCHAR(96) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    name VARCHAR(96) NOT NULL,
    color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    position INTEGER NOT NULL CHECK (position >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_statuses_product_id_id_unique UNIQUE (product_id, id)
);

INSERT INTO products (id, name, color, position, active) VALUES
    ('SITE', 'Site', '#38BDF8', 0, TRUE),
    ('LANDING_PAGE', 'Landing Page', '#A78BFA', 1, TRUE),
    ('ECOMMERCE', 'E-commerce', '#34D399', 2, TRUE),
    ('PAID_TRAFFIC', 'Tráfego Pago', '#F59E0B', 3, TRUE),
    ('SEO', 'SEO', '#2DD4BF', 4, TRUE),
    ('MAINTENANCE', 'Manutenção', '#FB923C', 5, TRUE),
    ('INTERNAL', 'Interno', '#818CF8', 6, TRUE),
    ('OTHER', 'Outro', '#A1A1AA', 7, TRUE);

INSERT INTO product_statuses (id, product_id, name, color, position, active) VALUES
    ('SITE_PLANNING', 'SITE', 'Planejamento', '#818CF8', 0, TRUE),
    ('SITE_WAITING_CONTENT', 'SITE', 'Aguardando conteúdo', '#FBBF24', 1, TRUE),
    ('SITE_DESIGN_LAYOUT', 'SITE', 'Design / Layout', '#C084FC', 2, TRUE),
    ('SITE_DEVELOPMENT', 'SITE', 'Desenvolvimento', '#38BDF8', 3, TRUE),
    ('SITE_INTERNAL_REVIEW', 'SITE', 'Revisão interna', '#A78BFA', 4, TRUE),
    ('SITE_WAITING_CLIENT', 'SITE', 'Aguardando cliente', '#F59E0B', 5, TRUE),
    ('SITE_ADJUSTMENTS', 'SITE', 'Ajustes', '#FB7185', 6, TRUE),
    ('SITE_PUBLICATION', 'SITE', 'Publicação', '#22D3EE', 7, TRUE),
    ('SITE_COMPLETED', 'SITE', 'Concluído', '#2DD4BF', 8, TRUE),
    ('SITE_PAUSED', 'SITE', 'Pausado', '#A1A1AA', 9, TRUE),

    ('LANDING_PAGE_PLANNING', 'LANDING_PAGE', 'Planejamento', '#818CF8', 0, TRUE),
    ('LANDING_PAGE_WAITING_CONTENT', 'LANDING_PAGE', 'Aguardando conteúdo', '#FBBF24', 1, TRUE),
    ('LANDING_PAGE_DESIGN_LAYOUT', 'LANDING_PAGE', 'Design / Layout', '#C084FC', 2, TRUE),
    ('LANDING_PAGE_DEVELOPMENT', 'LANDING_PAGE', 'Desenvolvimento', '#38BDF8', 3, TRUE),
    ('LANDING_PAGE_REVIEW', 'LANDING_PAGE', 'Revisão', '#A78BFA', 4, TRUE),
    ('LANDING_PAGE_WAITING_CLIENT', 'LANDING_PAGE', 'Aguardando cliente', '#F59E0B', 5, TRUE),
    ('LANDING_PAGE_ADJUSTMENTS', 'LANDING_PAGE', 'Ajustes', '#FB7185', 6, TRUE),
    ('LANDING_PAGE_PUBLICATION', 'LANDING_PAGE', 'Publicação', '#22D3EE', 7, TRUE),
    ('LANDING_PAGE_COMPLETED', 'LANDING_PAGE', 'Concluído', '#2DD4BF', 8, TRUE),
    ('LANDING_PAGE_PAUSED', 'LANDING_PAGE', 'Pausado', '#A1A1AA', 9, TRUE),

    ('ECOMMERCE_PLANNING', 'ECOMMERCE', 'Planejamento', '#818CF8', 0, TRUE),
    ('ECOMMERCE_WAITING_CONTENT', 'ECOMMERCE', 'Aguardando conteúdo', '#FBBF24', 1, TRUE),
    ('ECOMMERCE_STRUCTURING', 'ECOMMERCE', 'Estruturação', '#60A5FA', 2, TRUE),
    ('ECOMMERCE_DESIGN_LAYOUT', 'ECOMMERCE', 'Design / Layout', '#C084FC', 3, TRUE),
    ('ECOMMERCE_DEVELOPMENT', 'ECOMMERCE', 'Desenvolvimento', '#38BDF8', 4, TRUE),
    ('ECOMMERCE_CATALOG_INTEGRATIONS', 'ECOMMERCE', 'Cadastro / Integrações', '#14B8A6', 5, TRUE),
    ('ECOMMERCE_TESTING', 'ECOMMERCE', 'Testes', '#A78BFA', 6, TRUE),
    ('ECOMMERCE_WAITING_CLIENT', 'ECOMMERCE', 'Aguardando cliente', '#F59E0B', 7, TRUE),
    ('ECOMMERCE_ADJUSTMENTS', 'ECOMMERCE', 'Ajustes', '#FB7185', 8, TRUE),
    ('ECOMMERCE_PUBLICATION', 'ECOMMERCE', 'Publicação', '#22D3EE', 9, TRUE),
    ('ECOMMERCE_COMPLETED', 'ECOMMERCE', 'Concluído', '#2DD4BF', 10, TRUE),
    ('ECOMMERCE_PAUSED', 'ECOMMERCE', 'Pausado', '#A1A1AA', 11, TRUE),

    ('PAID_TRAFFIC_PLANNING', 'PAID_TRAFFIC', 'Planejamento', '#818CF8', 0, TRUE),
    ('PAID_TRAFFIC_WAITING_ACCESS', 'PAID_TRAFFIC', 'Aguardando acessos', '#FBBF24', 1, TRUE),
    ('PAID_TRAFFIC_CONFIGURATION', 'PAID_TRAFFIC', 'Configuração', '#38BDF8', 2, TRUE),
    ('PAID_TRAFFIC_WAITING_APPROVAL', 'PAID_TRAFFIC', 'Aguardando aprovação', '#F59E0B', 3, TRUE),
    ('PAID_TRAFFIC_ACTIVE_CAMPAIGNS', 'PAID_TRAFFIC', 'Campanhas ativas', '#34D399', 4, TRUE),
    ('PAID_TRAFFIC_OPTIMIZATION', 'PAID_TRAFFIC', 'Otimização', '#2DD4BF', 5, TRUE),
    ('PAID_TRAFFIC_WAITING_CLIENT', 'PAID_TRAFFIC', 'Aguardando cliente', '#F59E0B', 6, TRUE),
    ('PAID_TRAFFIC_PAUSED', 'PAID_TRAFFIC', 'Pausado', '#A1A1AA', 7, TRUE),
    ('PAID_TRAFFIC_ENDED', 'PAID_TRAFFIC', 'Encerrado', '#FB7185', 8, TRUE),

    ('SEO_PLANNING', 'SEO', 'Planejamento', '#818CF8', 0, TRUE),
    ('SEO_AUDIT', 'SEO', 'Auditoria', '#60A5FA', 1, TRUE),
    ('SEO_IMPLEMENTATION', 'SEO', 'Implementação', '#38BDF8', 2, TRUE),
    ('SEO_OPTIMIZATION', 'SEO', 'Otimização', '#2DD4BF', 3, TRUE),
    ('SEO_MONITORING', 'SEO', 'Monitoramento', '#34D399', 4, TRUE),
    ('SEO_WAITING_CLIENT', 'SEO', 'Aguardando cliente', '#F59E0B', 5, TRUE),
    ('SEO_PAUSED', 'SEO', 'Pausado', '#A1A1AA', 6, TRUE),
    ('SEO_COMPLETED', 'SEO', 'Concluído', '#2DD4BF', 7, TRUE),

    ('MAINTENANCE_WAITING_START', 'MAINTENANCE', 'Aguardando início', '#60A5FA', 0, TRUE),
    ('MAINTENANCE_IN_PROGRESS', 'MAINTENANCE', 'Em andamento', '#34D399', 1, TRUE),
    ('MAINTENANCE_WAITING_CLIENT', 'MAINTENANCE', 'Aguardando cliente', '#F59E0B', 2, TRUE),
    ('MAINTENANCE_IN_REVIEW', 'MAINTENANCE', 'Em revisão', '#C084FC', 3, TRUE),
    ('MAINTENANCE_RESOLVED', 'MAINTENANCE', 'Resolvido', '#22D3EE', 4, TRUE),
    ('MAINTENANCE_PAUSED', 'MAINTENANCE', 'Pausado', '#A1A1AA', 5, TRUE),
    ('MAINTENANCE_COMPLETED', 'MAINTENANCE', 'Concluído', '#2DD4BF', 6, TRUE),

    ('INTERNAL_PLANNING', 'INTERNAL', 'Planejamento', '#818CF8', 0, TRUE),
    ('INTERNAL_TODO', 'INTERNAL', 'A fazer', '#60A5FA', 1, TRUE),
    ('INTERNAL_IN_PROGRESS', 'INTERNAL', 'Em andamento', '#34D399', 2, TRUE),
    ('INTERNAL_IN_REVIEW', 'INTERNAL', 'Em revisão', '#C084FC', 3, TRUE),
    ('INTERNAL_PAUSED', 'INTERNAL', 'Pausado', '#A1A1AA', 4, TRUE),
    ('INTERNAL_COMPLETED', 'INTERNAL', 'Concluído', '#2DD4BF', 5, TRUE),

    ('OTHER_PLANNING', 'OTHER', 'Planejamento', '#818CF8', 0, TRUE),
    ('OTHER_TODO', 'OTHER', 'A fazer', '#60A5FA', 1, TRUE),
    ('OTHER_IN_PROGRESS', 'OTHER', 'Em andamento', '#34D399', 2, TRUE),
    ('OTHER_WAITING_CLIENT', 'OTHER', 'Aguardando cliente', '#F59E0B', 3, TRUE),
    ('OTHER_IN_REVIEW', 'OTHER', 'Em revisão', '#C084FC', 4, TRUE),
    ('OTHER_PAUSED', 'OTHER', 'Pausado', '#A1A1AA', 5, TRUE),
    ('OTHER_COMPLETED', 'OTHER', 'Concluído', '#2DD4BF', 6, TRUE);

CREATE UNIQUE INDEX uq_products_name_lower ON products(LOWER(name));
CREATE UNIQUE INDEX uq_product_statuses_product_name_lower ON product_statuses(product_id, LOWER(name));
CREATE INDEX idx_products_active_position ON products(active, position);
CREATE INDEX idx_product_statuses_product_active_position ON product_statuses(product_id, active, position);

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER product_statuses_set_updated_at
BEFORE UPDATE ON product_statuses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE projects ADD COLUMN product_id VARCHAR(64);
ALTER TABLE projects ADD COLUMN product_status_id VARCHAR(96);

UPDATE projects
SET product_id = CASE project_type
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

ALTER TABLE projects ALTER COLUMN product_id SET NOT NULL;
ALTER TABLE projects
    ADD CONSTRAINT projects_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE projects
    ADD CONSTRAINT projects_product_status_fkey
    FOREIGN KEY (product_id, product_status_id)
    REFERENCES product_statuses(product_id, id) ON UPDATE RESTRICT ON DELETE RESTRICT;

CREATE INDEX idx_projects_product_id ON projects(product_id);
CREATE INDEX idx_projects_product_status_id ON projects(product_status_id);

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
    ELSIF TG_OP = 'UPDATE' AND NEW.project_type IS DISTINCT FROM OLD.project_type AND NEW.product_id = OLD.product_id THEN
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
        NEW.product_status_id = NULL;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER projects_map_legacy_product
BEFORE INSERT OR UPDATE OF project_type, product_id ON projects
FOR EACH ROW EXECUTE FUNCTION map_legacy_project_type_to_product();

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_statuses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE products FROM anon;
        REVOKE ALL ON TABLE product_statuses FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE products FROM authenticated;
        REVOKE ALL ON TABLE product_statuses FROM authenticated;
    END IF;
END;
$$;
