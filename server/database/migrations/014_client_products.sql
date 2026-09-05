CREATE TABLE client_products (
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (client_id, product_id)
);

CREATE INDEX idx_client_products_product ON client_products(product_id, client_id);

-- Migração conservadora: somente nomes legados com correspondência exata e única
-- no catálogo são vinculados. monthly_services permanece intacto para auditoria.
INSERT INTO client_products (client_id, product_id)
SELECT DISTINCT client.id, product.id
FROM clients client
CROSS JOIN LATERAL unnest(client.monthly_services) AS legacy_service(name)
INNER JOIN products product
    ON LOWER(BTRIM(product.name)) = LOWER(BTRIM(legacy_service.name))
WHERE (
    SELECT COUNT(*)
    FROM products candidate
    WHERE LOWER(BTRIM(candidate.name)) = LOWER(BTRIM(legacy_service.name))
) = 1
ON CONFLICT DO NOTHING;

ALTER TABLE client_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE client_products FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE client_products FROM authenticated;
    END IF;
END;
$$;
