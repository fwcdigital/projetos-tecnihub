ALTER TABLE projects
ADD COLUMN creation_request_id UUID;

CREATE UNIQUE INDEX uq_projects_creation_request_id
ON projects(creation_request_id)
WHERE creation_request_id IS NOT NULL;

CREATE TABLE product_task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(64) NOT NULL UNIQUE REFERENCES products(id) ON UPDATE RESTRICT ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_task_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES product_task_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL CHECK (LENGTH(BTRIM(title)) > 0),
    status_id VARCHAR(96) REFERENCES product_statuses(id) ON UPDATE RESTRICT ON DELETE SET NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('URGENTE', 'ALTA', 'NORMAL', 'BAIXA')),
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (template_id, position)
);

CREATE INDEX idx_product_task_template_items_template
ON product_task_template_items(template_id, position);

CREATE TRIGGER product_task_templates_set_updated_at
BEFORE UPDATE ON product_task_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER product_task_template_items_set_updated_at
BEFORE UPDATE ON product_task_template_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO product_task_templates (product_id)
SELECT id FROM products
ON CONFLICT (product_id) DO NOTHING;

WITH seed(product_id, title, position) AS (VALUES
    ('SITE', 'Planejamento do projeto', 0),
    ('SITE', 'Solicitar conteúdos e materiais', 1),
    ('SITE', 'Organizar estrutura e páginas', 2),
    ('SITE', 'Criar layout', 3),
    ('SITE', 'Aprovar layout', 4),
    ('SITE', 'Desenvolver o site', 5),
    ('SITE', 'Inserir conteúdos', 6),
    ('SITE', 'Revisão interna', 7),
    ('SITE', 'Enviar para aprovação do cliente', 8),
    ('SITE', 'Realizar ajustes finais', 9),
    ('SITE', 'Configurar domínio/publicação', 10),
    ('SITE', 'Publicar site', 11),
    ('SITE', 'Revisão pós-publicação', 12),
    ('LANDING_PAGE', 'Planejamento da landing page', 0),
    ('LANDING_PAGE', 'Solicitar conteúdos e materiais', 1),
    ('LANDING_PAGE', 'Definir estrutura e objetivo de conversão', 2),
    ('LANDING_PAGE', 'Criar layout', 3),
    ('LANDING_PAGE', 'Aprovar layout', 4),
    ('LANDING_PAGE', 'Desenvolver landing page', 5),
    ('LANDING_PAGE', 'Configurar formulários e CTAs', 6),
    ('LANDING_PAGE', 'Configurar rastreamento/conversões', 7),
    ('LANDING_PAGE', 'Revisão interna', 8),
    ('LANDING_PAGE', 'Enviar para aprovação', 9),
    ('LANDING_PAGE', 'Realizar ajustes', 10),
    ('LANDING_PAGE', 'Publicar', 11),
    ('LANDING_PAGE', 'Testar versão publicada', 12),
    ('ECOMMERCE', 'Planejamento do projeto', 0),
    ('ECOMMERCE', 'Solicitar conteúdos, produtos e materiais', 1),
    ('ECOMMERCE', 'Definir estrutura da loja', 2),
    ('ECOMMERCE', 'Criar layout', 3),
    ('ECOMMERCE', 'Aprovar layout', 4),
    ('ECOMMERCE', 'Desenvolver loja', 5),
    ('ECOMMERCE', 'Configurar catálogo de produtos', 6),
    ('ECOMMERCE', 'Configurar pagamentos', 7),
    ('ECOMMERCE', 'Configurar frete/entrega', 8),
    ('ECOMMERCE', 'Configurar integrações necessárias', 9),
    ('ECOMMERCE', 'Configurar e-mails/transacionais', 10),
    ('ECOMMERCE', 'Revisar carrinho e checkout', 11),
    ('ECOMMERCE', 'Realizar testes de compra', 12),
    ('ECOMMERCE', 'Revisão interna', 13),
    ('ECOMMERCE', 'Enviar para aprovação', 14),
    ('ECOMMERCE', 'Realizar ajustes finais', 15),
    ('ECOMMERCE', 'Publicar loja', 16),
    ('ECOMMERCE', 'Realizar teste pós-publicação', 17),
    ('PAID_TRAFFIC', 'Planejamento da estratégia', 0),
    ('PAID_TRAFFIC', 'Solicitar acessos', 1),
    ('PAID_TRAFFIC', 'Validar contas e permissões', 2),
    ('PAID_TRAFFIC', 'Analisar estrutura atual', 3),
    ('PAID_TRAFFIC', 'Configurar rastreamento e conversões', 4),
    ('PAID_TRAFFIC', 'Definir campanhas e públicos/palavras-chave', 5),
    ('PAID_TRAFFIC', 'Criar campanhas', 6),
    ('PAID_TRAFFIC', 'Criar/configurar anúncios', 7),
    ('PAID_TRAFFIC', 'Revisar orçamento e segmentação', 8),
    ('PAID_TRAFFIC', 'Revisão interna', 9),
    ('PAID_TRAFFIC', 'Enviar para aprovação quando necessário', 10),
    ('PAID_TRAFFIC', 'Publicar campanhas', 11),
    ('PAID_TRAFFIC', 'Validar campanhas publicadas', 12),
    ('PAID_TRAFFIC', 'Realizar otimização inicial', 13),
    ('PAID_TRAFFIC', 'Analisar primeiros resultados', 14),
    ('SEO', 'Planejamento de SEO', 0),
    ('SEO', 'Auditoria inicial', 1),
    ('SEO', 'Analisar palavras-chave', 2),
    ('SEO', 'Analisar concorrentes', 3),
    ('SEO', 'Revisar estrutura técnica do site', 4),
    ('SEO', 'Revisar indexação', 5),
    ('SEO', 'Otimizar páginas prioritárias', 6),
    ('SEO', 'Ajustar títulos e meta descriptions', 7),
    ('SEO', 'Revisar conteúdo', 8),
    ('SEO', 'Implementar melhorias técnicas', 9),
    ('SEO', 'Validar Search Console e Analytics', 10),
    ('SEO', 'Revisar indexação após ajustes', 11),
    ('SEO', 'Monitorar resultados iniciais', 12),
    ('MAINTENANCE', 'Analisar solicitação', 0),
    ('MAINTENANCE', 'Identificar causa/problema', 1),
    ('MAINTENANCE', 'Executar ajuste', 2),
    ('MAINTENANCE', 'Realizar testes', 3),
    ('MAINTENANCE', 'Revisão interna', 4),
    ('MAINTENANCE', 'Validar com cliente quando necessário', 5),
    ('MAINTENANCE', 'Concluir atendimento', 6),
    ('INTERNAL', 'Definir objetivo', 0),
    ('INTERNAL', 'Planejar execução', 1),
    ('INTERNAL', 'Preparar estrutura necessária', 2),
    ('INTERNAL', 'Executar', 3),
    ('INTERNAL', 'Revisar', 4),
    ('INTERNAL', 'Realizar ajustes', 5),
    ('INTERNAL', 'Validar resultado', 6),
    ('INTERNAL', 'Concluir projeto', 7),
    ('OTHER', 'Planejamento', 0),
    ('OTHER', 'Levantamento de informações', 1),
    ('OTHER', 'Preparação', 2),
    ('OTHER', 'Execução', 3),
    ('OTHER', 'Revisão', 4),
    ('OTHER', 'Ajustes', 5),
    ('OTHER', 'Aprovação', 6),
    ('OTHER', 'Conclusão', 7)
)
INSERT INTO product_task_template_items (template_id, title, position)
SELECT template.id, seed.title, seed.position
FROM seed
INNER JOIN product_task_templates template ON template.product_id = seed.product_id;

ALTER TABLE product_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_task_template_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE product_task_templates, product_task_template_items FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE product_task_templates, product_task_template_items FROM authenticated;
    END IF;
END;
$$;
