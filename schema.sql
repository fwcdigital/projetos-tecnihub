-- ==============================================================================
-- TECNIHUB CRM & GESTÃO DE PROJETOS - SCHEMA RELACIONAL (POSTGRESQL / MYSQL / SQLITE)
-- ==============================================================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar TEXT,
    role VARCHAR(32) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'COLLABORATOR')),
    job_title VARCHAR(128) NOT NULL DEFAULT 'Especialista',
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. TABELA DE CLIENTES (CONTAS DA AGÊNCIA)
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    logo VARCHAR(64) DEFAULT 'CL',
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(64),
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    lead_manager_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- 3. TABELA DE PROJETOS & ESCOPOS
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    project_type VARCHAR(32) NOT NULL DEFAULT 'WEBSITE' CHECK (project_type IN (
        'WEBSITE', 'LANDING_PAGE', 'ECOMMERCE', 'GOOGLE_ADS', 'META_ADS', 
        'SEO', 'SOCIAL_MEDIA', 'MAINTENANCE', 'INTERNAL', 'OTHER'
    )),
    manager_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'PLANNING' CHECK (status IN (
        'PLANNING', 'WAITING_TO_START', 'IN_PROGRESS', 'WAITING_CLIENT', 
        'IN_REVIEW', 'PAUSED', 'COMPLETED', 'CANCELLED'
    )),
    priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN (
        'URGENT', 'HIGH', 'NORMAL', 'LOW'
    )),
    start_date DATE,
    due_date DATE,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 4. TABELA DE MEMBROS E COLABORADORES DO PROJETO (RELAÇÃO N:N)
CREATE TABLE IF NOT EXISTS project_members (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_role VARCHAR(32) NOT NULL DEFAULT 'COLLABORATOR' CHECK (member_role IN ('MANAGER', 'COLLABORATOR')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- ==============================================================================
-- ESTRUTURAS RESERVADAS PARA ETAPAS POSTERIORES (NÃO USADAS AGORA):
-- ==============================================================================
-- - tasks
-- - subtasks
-- - checklist_items
-- - comments
-- - attachments
-- - recurrences
-- - activity_logs
-- - notifications
