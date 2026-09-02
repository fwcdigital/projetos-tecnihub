import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PROJECT_MANAGER' | 'COLLABORATOR';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar: string;
  role: UserRole;
  job_title: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface DbClient {
  id: string;
  name: string;
  company_name: string;
  logo: string;
  contact_name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  lead_manager_id?: string;
  notes?: string;
  monthly_services?: string[];
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 
  | 'PLANNING'
  | 'WAITING_TO_START'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'IN_REVIEW'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ProjectType = 
  | 'WEBSITE'
  | 'LANDING_PAGE'
  | 'ECOMMERCE'
  | 'GOOGLE_ADS'
  | 'META_ADS'
  | 'SEO'
  | 'SOCIAL_MEDIA'
  | 'MAINTENANCE'
  | 'INTERNAL'
  | 'OTHER';

export type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

export interface DbProject {
  id: string;
  name: string;
  description?: string;
  client_id: string;
  project_type: ProjectType;
  manager_id: string;
  status: ProjectStatus;
  priority: Priority;
  start_date?: string;
  due_date?: string;
  progress: number;
  is_recurring: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DbProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  member_role: 'MANAGER' | 'COLLABORATOR';
  created_at: string;
}

export type TaskStatus = 
  | 'BACKLOG'
  | 'A_FAZER'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_CLIENTE'
  | 'EM_REVISAO'
  | 'CONCLUIDO'
  | 'BLOQUEADO';

export type RecurrenceFrequency = 'DIARIO' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL';

export interface DbSubtask {
  id: string;
  title: string;
  completed: boolean;
  is_recurring?: boolean;
  recurrence_frequency?: RecurrenceFrequency;
  recurrence_rule?: string;
  assignee_name?: string;
  due_date?: string;
  due_time?: string;
}

export interface DbChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface DbComment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  created_at: string;
}

export interface DbHistory {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface DbTask {
  id: string;
  title: string;
  description?: string;
  client_id: string;
  project_id: string;
  assignee_id: string;
  participant_ids: string[];
  priority: Priority;
  status: TaskStatus;
  start_date?: string;
  due_date: string;
  due_time?: string;
  is_recurring: boolean;
  recurrence_frequency?: RecurrenceFrequency;
  recurrence_rule?: string;
  subtasks: DbSubtask[];
  checklist: DbChecklistItem[];
  comments: DbComment[];
  attachments: string[];
  history: DbHistory[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSchema {
  version: number;
  users: DbUser[];
  clients: DbClient[];
  projects: DbProject[];
  project_members: DbProjectMember[];
  tasks: DbTask[];
}

const DB_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'app_database.json');

// Memória local sincronizada com arquivo
let dbData: DatabaseSchema = {
  version: 1,
  users: [],
  clients: [],
  projects: [],
  project_members: [],
  tasks: []
};

// Salvar banco no disco e propagar falhas para a rota chamadora.
function saveDb() {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (error) {
    console.error('Erro ao salvar banco de dados:', error);
    throw error;
  }
}

// Inicialização com Seed
export async function initDatabase(): Promise<void> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content) as Partial<DatabaseSchema>;
      dbData = {
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        users: Array.isArray(parsed.users) ? parsed.users : [],
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        project_members: Array.isArray(parsed.project_members) ? parsed.project_members : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : []
      };
      console.log(`[DB] Banco de dados carregado com sucesso (${dbData.users.length} usuários, ${dbData.clients.length} clientes, ${dbData.projects.length} projetos)`);
      return;
    }
  } catch (err) {
    console.warn('[DB] Erro ao ler arquivo do banco, recriando com seed inicial:', err);
  }

  console.log('[DB] Inicializando banco de dados com seed de teste...');
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('Admin@123', salt);

  const initialUsers: DbUser[] = [
    {
      id: 'usr-superadmin',
      name: 'Administrador Principal',
      email: 'admin@tecnihub.com',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: 'SUPER_ADMIN',
      job_title: 'Diretor de Operações',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'usr-admin-1',
      name: 'Mariana Duarte',
      email: 'mariana@tecnihub.com',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      role: 'ADMIN',
      job_title: 'Gerente Geral da Agência',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'usr-gestor-1',
      name: 'Caio Rocha',
      email: 'caio@tecnihub.com',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      role: 'PROJECT_MANAGER',
      job_title: 'Gestor de Contas & Mídia',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'usr-colab-1',
      name: 'Lucas Mendes',
      email: 'lucas@tecnihub.com',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      role: 'COLLABORATOR',
      job_title: 'Desenvolvedor Frontend & WordPress',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'usr-colab-2',
      name: 'Beatriz Lima',
      email: 'beatriz@tecnihub.com',
      password_hash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
      role: 'COLLABORATOR',
      job_title: 'Designer UI/UX & Criativos',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const initialClients: DbClient[] = [
    {
      id: 'cli-1',
      name: 'Clínica Horizonte',
      company_name: 'Horizonte Medicina Integrada Ltda',
      logo: 'CH',
      contact_name: 'Dra. Roberta Santos',
      email: 'roberta@clinicahorizonte.med.br',
      phone: '(11) 98765-4321',
      status: 'ACTIVE',
      lead_manager_id: 'usr-gestor-1',
      notes: 'Cliente de saúde com foco em agendamentos de consultas via Google Ads e captação local.',
      monthly_services: ['Google Ads', 'Meta Ads', 'Landing Page'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'cli-2',
      name: 'Indústria Atlas',
      company_name: 'Atlas Manufatura e Equipamentos S/A',
      logo: 'IA',
      contact_name: 'Ricardo Silveira',
      email: 'ricardo@industriaatlas.com.br',
      phone: '(19) 99887-1122',
      status: 'ACTIVE',
      lead_manager_id: 'usr-gestor-1',
      notes: 'Indústria B2B contratante de portal institucional e campanhas institucionais.',
      monthly_services: ['Manutenção Web', 'SEO Estratégico'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'cli-3',
      name: 'Imobiliária Prime',
      company_name: 'Prime Negócios Imobiliários',
      logo: 'IP',
      contact_name: 'Fernanda Martins',
      email: 'contato@imobprime.com.br',
      phone: '(21) 97654-3210',
      status: 'ACTIVE',
      lead_manager_id: 'usr-admin-1',
      notes: 'Imóveis de alto padrão e lançamentos residenciais.',
      monthly_services: ['Meta Ads', 'Criação de Conteúdo'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const initialProjects: DbProject[] = [
    {
      id: 'proj-1',
      name: 'Gestão Google Ads Q4',
      description: 'Estruturação de campanhas de pesquisa, display e performance max para captação de pacientes.',
      client_id: 'cli-1',
      project_type: 'GOOGLE_ADS',
      manager_id: 'usr-gestor-1',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      start_date: '2026-09-01',
      due_date: '2026-10-31',
      progress: 0,
      is_recurring: true,
      created_by: 'usr-superadmin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'proj-2',
      name: 'Manutenção WordPress & Otimização',
      description: 'Atualizações técnicas periódicas, segurança, velocidade de carregamento e backup mensal.',
      client_id: 'cli-2',
      project_type: 'MAINTENANCE',
      manager_id: 'usr-gestor-1',
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      start_date: '2026-08-15',
      due_date: '2026-11-30',
      progress: 0,
      is_recurring: true,
      created_by: 'usr-superadmin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'proj-3',
      name: 'Novo Site Institucional Responsivo',
      description: 'Redesenho completo do portal de imóveis com integração ao CRM imobiliário.',
      client_id: 'cli-3',
      project_type: 'WEBSITE',
      manager_id: 'usr-admin-1',
      status: 'PLANNING',
      priority: 'URGENT',
      start_date: '2026-09-05',
      due_date: '2026-10-15',
      progress: 0,
      is_recurring: false,
      created_by: 'usr-superadmin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const initialMembers: DbProjectMember[] = [
    {
      id: 'pm-1',
      project_id: 'proj-1',
      user_id: 'usr-gestor-1',
      member_role: 'MANAGER',
      created_at: new Date().toISOString()
    },
    {
      id: 'pm-2',
      project_id: 'proj-1',
      user_id: 'usr-colab-1',
      member_role: 'COLLABORATOR',
      created_at: new Date().toISOString()
    },
    {
      id: 'pm-3',
      project_id: 'proj-2',
      user_id: 'usr-gestor-1',
      member_role: 'MANAGER',
      created_at: new Date().toISOString()
    },
    {
      id: 'pm-4',
      project_id: 'proj-2',
      user_id: 'usr-colab-1',
      member_role: 'COLLABORATOR',
      created_at: new Date().toISOString()
    },
    {
      id: 'pm-5',
      project_id: 'proj-3',
      user_id: 'usr-admin-1',
      member_role: 'MANAGER',
      created_at: new Date().toISOString()
    },
    {
      id: 'pm-6',
      project_id: 'proj-3',
      user_id: 'usr-colab-2',
      member_role: 'COLLABORATOR',
      created_at: new Date().toISOString()
    }
  ];

  const initialTasks: DbTask[] = [
    {
      id: 'task-1',
      title: 'Otimização Semanal de Palavras-Chave Negativas',
      description: 'Análise de termos de busca da semana anterior, exclusão de tráfego desqualificado e refinamento de correspondências.',
      client_id: 'cli-1',
      project_id: 'proj-1',
      assignee_id: 'usr-gestor-1',
      participant_ids: ['usr-gestor-1'],
      priority: 'HIGH',
      status: 'A_FAZER',
      start_date: '2026-09-01',
      due_date: '2026-09-01',
      due_time: '11:00',
      is_recurring: true,
      recurrence_frequency: 'SEMANAL',
      recurrence_rule: 'Toda terça-feira às 11:00',
      subtasks: [
        {
          id: 'sub-1-1',
          title: 'Extrair relatório de termos de pesquisa da última semana',
          completed: false,
          is_recurring: true,
          recurrence_frequency: 'SEMANAL',
          recurrence_rule: 'Toda terça',
          assignee_name: 'Caio Rocha',
          due_date: '2026-09-01',
          due_time: '10:00'
        },
        {
          id: 'sub-1-2',
          title: 'Adicionar termos desqualificados à lista de negativas da conta',
          completed: false,
          is_recurring: true,
          recurrence_frequency: 'SEMANAL',
          recurrence_rule: 'Toda terça',
          assignee_name: 'Caio Rocha',
          due_date: '2026-09-01',
          due_time: '11:00'
        }
      ],
      checklist: [
        { id: 'chk-1', title: 'Verificar custo médio por clique (CPC)', completed: false },
        { id: 'chk-2', title: 'Validar conversões registradas no Google Analytics', completed: false }
      ],
      comments: [
        {
          id: 'c-1',
          user_id: 'usr-admin-1',
          user_name: 'Mariana Duarte',
          user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          content: 'Lembre-se de checar as novas campanhas de implante dentário.',
          created_at: 'Há 1 hora'
        }
      ],
      attachments: [],
      history: [
        { id: 'h-1', user: 'Caio Rocha', action: 'Criou a rotina semanal', timestamp: '2026-09-01 08:00' }
      ],
      created_by: 'Caio Rocha',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-2',
      title: 'Ajuste de Lance por Dispositivo & Geolocalização',
      description: 'Refinar os lances para mobile no raio de 15km da clínica para maximizar ligações telefônicas.',
      client_id: 'cli-1',
      project_id: 'proj-1',
      assignee_id: 'usr-colab-1',
      participant_ids: ['usr-colab-1'],
      priority: 'NORMAL',
      status: 'EM_ANDAMENTO',
      start_date: '2026-09-01',
      due_date: '2026-09-02',
      due_time: '16:00',
      is_recurring: false,
      subtasks: [],
      checklist: [],
      comments: [],
      attachments: [],
      history: [],
      created_by: 'Caio Rocha',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'task-3',
      title: 'Backup Completo do Banco de Dados e Plugins',
      description: 'Rotina semanal obrigatória de snapshot no servidor Hostinger e atualização de segurança do Core do WordPress.',
      client_id: 'cli-2',
      project_id: 'proj-2',
      assignee_id: 'usr-colab-1',
      participant_ids: ['usr-colab-1'],
      priority: 'URGENT',
      status: 'A_FAZER',
      start_date: '2026-09-01',
      due_date: '2026-09-01',
      due_time: '09:00',
      is_recurring: true,
      recurrence_frequency: 'SEMANAL',
      recurrence_rule: 'Toda terça-feira às 09:00',
      subtasks: [],
      checklist: [],
      comments: [],
      attachments: [],
      history: [],
      created_by: 'Caio Rocha',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  dbData = {
    version: 1,
    users: initialUsers,
    clients: initialClients,
    projects: initialProjects,
    project_members: initialMembers,
    tasks: initialTasks
  };

  saveDb();
  console.log('[DB] Banco de dados semeado com sucesso!');
}

// -------------------------------------------------------------
// REPOSITÓRIO DE USUÁRIOS
// -------------------------------------------------------------
export const userRepository = {
  findAll: (filter?: { role?: UserRole; status?: UserStatus; search?: string }) => {
    return dbData.users
      .filter(u => {
        if (filter?.role && u.role !== filter.role) return false;
        if (filter?.status && u.status !== filter.status) return false;
        if (filter?.search) {
          const s = filter.search.toLowerCase();
          return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
        }
        return true;
      })
      .map(({ password_hash, ...rest }) => rest);
  },

  findById: (id: string) => {
    const user = dbData.users.find(u => u.id === id);
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  },

  findByEmail: (email: string) => {
    return dbData.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  create: (data: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>) => {
    const newUser: DbUser = {
      ...data,
      id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dbData.users.push(newUser);
    saveDb();
    const { password_hash, ...safeUser } = newUser;
    return safeUser;
  },

  update: (id: string, updates: Partial<Omit<DbUser, 'id' | 'created_at'>>) => {
    const idx = dbData.users.findIndex(u => u.id === id);
    if (idx === -1) return null;

    dbData.users[idx] = {
      ...dbData.users[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveDb();
    const { password_hash, ...safeUser } = dbData.users[idx];
    return safeUser;
  }
};

// -------------------------------------------------------------
// REPOSITÓRIO DE CLIENTES
// -------------------------------------------------------------
export const clientRepository = {
  findAll: (filter?: { status?: ClientStatus; search?: string }) => {
    return dbData.clients.filter(c => {
      if (filter?.status && c.status !== filter.status) return false;
      if (filter?.search) {
        const s = filter.search.toLowerCase();
        return c.name.toLowerCase().includes(s) || 
               c.company_name.toLowerCase().includes(s) || 
               c.contact_name.toLowerCase().includes(s) ||
               c.email.toLowerCase().includes(s);
      }
      return true;
    });
  },

  findById: (id: string) => {
    return dbData.clients.find(c => c.id === id) || null;
  },

  create: (data: Omit<DbClient, 'id' | 'created_at' | 'updated_at'>) => {
    const newClient: DbClient = {
      ...data,
      id: `cli-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dbData.clients.unshift(newClient);
    saveDb();
    return newClient;
  },

  update: (id: string, updates: Partial<Omit<DbClient, 'id' | 'created_at'>>) => {
    const idx = dbData.clients.findIndex(c => c.id === id);
    if (idx === -1) return null;

    dbData.clients[idx] = {
      ...dbData.clients[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveDb();
    return dbData.clients[idx];
  },

  // Soft delete / alteração de status para arquivado
  archive: (id: string) => {
    return clientRepository.update(id, { status: 'ARCHIVED' });
  }
};

// -------------------------------------------------------------
// REPOSITÓRIO DE PROJETOS & MEMBROS
// -------------------------------------------------------------
export const projectRepository = {
  findAll: (user?: { id: string; role: UserRole }, filter?: { status?: ProjectStatus; clientId?: string; type?: ProjectType; search?: string }) => {
    let projects = dbData.projects;

    // Regras de Acesso Baseadas em Permissão:
    // SUPER_ADMIN e ADMIN vêem todos os projetos
    // PROJECT_MANAGER vê projetos que gerencia OU que é membro
    // COLLABORATOR vê SOMENTE projetos dos quais participa na tabela project_members
    if (user) {
      if (user.role === 'PROJECT_MANAGER') {
        const memberProjectIds = new Set(
          dbData.project_members.filter(pm => pm.user_id === user.id).map(pm => pm.project_id)
        );
        projects = projects.filter(p => p.manager_id === user.id || memberProjectIds.has(p.id));
      } else if (user.role === 'COLLABORATOR') {
        const memberProjectIds = new Set(
          dbData.project_members.filter(pm => pm.user_id === user.id).map(pm => pm.project_id)
        );
        projects = projects.filter(p => memberProjectIds.has(p.id));
      }
    }

    if (filter?.status) {
      projects = projects.filter(p => p.status === filter.status);
    }
    if (filter?.clientId) {
      projects = projects.filter(p => p.client_id === filter.clientId);
    }
    if (filter?.type) {
      projects = projects.filter(p => p.project_type === filter.type);
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      projects = projects.filter(p => p.name.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s)));
    }

    // Join com Client, Manager e Team Members
    return projects.map(p => {
      const client = dbData.clients.find(c => c.id === p.client_id);
      const manager = dbData.users.find(u => u.id === p.manager_id);
      const memberLinks = dbData.project_members.filter(pm => pm.project_id === p.id);
      const memberUsers = memberLinks
        .map(pm => dbData.users.find(u => u.id === pm.user_id))
        .filter((u): u is DbUser => Boolean(u))
        .map(u => ({
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          job_title: u.job_title,
          role: u.role
        }));

      return {
        ...p,
        clientName: client?.name || 'Cliente Desconhecido',
        clientCompany: client?.company_name || '',
        managerName: manager?.name || 'Gestor Não Atribuído',
        managerAvatar: manager?.avatar || '',
        teamMembers: memberUsers
      };
    });
  },

  findById: (id: string, user?: { id: string; role: UserRole }) => {
    const project = dbData.projects.find(p => p.id === id);
    if (!project) return null;

    // Checagem de permissão
    if (user && user.role === 'COLLABORATOR') {
      const isMember = dbData.project_members.some(pm => pm.project_id === id && pm.user_id === user.id);
      if (!isMember) return null;
    } else if (user && user.role === 'PROJECT_MANAGER') {
      const isManagerOrMember = project.manager_id === user.id || 
        dbData.project_members.some(pm => pm.project_id === id && pm.user_id === user.id);
      if (!isManagerOrMember) return null;
    }

    const client = dbData.clients.find(c => c.id === project.client_id);
    const manager = dbData.users.find(u => u.id === project.manager_id);
    const memberLinks = dbData.project_members.filter(pm => pm.project_id === id);
    const memberUsers = memberLinks
      .map(pm => dbData.users.find(u => u.id === pm.user_id))
      .filter((u): u is DbUser => Boolean(u))
      .map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        job_title: u.job_title,
        role: u.role
      }));

    return {
      ...project,
      clientName: client?.name || 'Cliente Desconhecido',
      clientCompany: client?.company_name || '',
      managerName: manager?.name || 'Gestor Não Atribuído',
      managerAvatar: manager?.avatar || '',
      teamMembers: memberUsers
    };
  },

  create: (data: Omit<DbProject, 'id' | 'created_at' | 'updated_at'>, teamUserIds: string[] = []) => {
    const newProject: DbProject = {
      ...data,
      id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    dbData.projects.unshift(newProject);

    // Garantir que o gestor esteja como membro
    const uniqueUserIds = Array.from(new Set([data.manager_id, ...teamUserIds]));

    for (const userId of uniqueUserIds) {
      dbData.project_members.push({
        id: `pm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        project_id: newProject.id,
        user_id: userId,
        member_role: userId === data.manager_id ? 'MANAGER' : 'COLLABORATOR',
        created_at: new Date().toISOString()
      });
    }

    saveDb();
    return projectRepository.findById(newProject.id);
  },

  update: (id: string, updates: Partial<Omit<DbProject, 'id' | 'created_at'>>, teamUserIds?: string[]) => {
    const idx = dbData.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const previousManagerId = dbData.projects[idx].manager_id;

    dbData.projects[idx] = {
      ...dbData.projects[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (teamUserIds !== undefined || updates.manager_id !== undefined) {
      // Atualizar membros
      const managerId = updates.manager_id || dbData.projects[idx].manager_id;
      const retainedTeamUserIds = teamUserIds !== undefined
        ? teamUserIds
        : dbData.project_members
            .filter(pm => pm.project_id === id && pm.user_id !== previousManagerId)
            .map(pm => pm.user_id);
      const allUserIds = Array.from(new Set([managerId, ...retainedTeamUserIds]));

      // Remover membros antigos do projeto
      dbData.project_members = dbData.project_members.filter(pm => pm.project_id !== id);

      // Adicionar novos membros
      for (const uid of allUserIds) {
        dbData.project_members.push({
          id: `pm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          project_id: id,
          user_id: uid,
          member_role: uid === managerId ? 'MANAGER' : 'COLLABORATOR',
          created_at: new Date().toISOString()
        });
      }
    }

    saveDb();
    return projectRepository.findById(id);
  }
};

// -------------------------------------------------------------
// REPOSITÓRIO DE TAREFAS
// -------------------------------------------------------------
export const taskRepository = {
  findAll: (
    filter?: { projectId?: string; clientId?: string; status?: TaskStatus; assigneeId?: string; search?: string },
    user?: { id: string; role: UserRole }
  ) => {
    let tasks = [...(dbData.tasks || [])];

    // RBAC: Colaboradores só veem tarefas de projetos em que são membros ou tarefas atribuídas a eles
    if (user && user.role === 'COLLABORATOR') {
      const userProjectIds = dbData.project_members.filter(pm => pm.user_id === user.id).map(pm => pm.project_id);
      tasks = tasks.filter(t => t.assignee_id === user.id || (t.participant_ids && t.participant_ids.includes(user.id)) || userProjectIds.includes(t.project_id));
    } else if (user && user.role === 'PROJECT_MANAGER') {
      const managerProjectIds = dbData.projects.filter(p => p.manager_id === user.id).map(p => p.id);
      const memberProjectIds = dbData.project_members.filter(pm => pm.user_id === user.id).map(pm => pm.project_id);
      const allowedProjectIds = Array.from(new Set([...managerProjectIds, ...memberProjectIds]));
      tasks = tasks.filter(t => t.assignee_id === user.id || allowedProjectIds.includes(t.project_id));
    }

    if (filter?.projectId) {
      tasks = tasks.filter(t => t.project_id === filter.projectId);
    }
    if (filter?.clientId) {
      tasks = tasks.filter(t => t.client_id === filter.clientId);
    }
    if (filter?.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }
    if (filter?.assigneeId) {
      tasks = tasks.filter(t => t.assignee_id === filter.assigneeId);
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(s) || (t.description && t.description.toLowerCase().includes(s)));
    }

    // Formatar e fazer join
    return tasks.map(t => {
      const client = dbData.clients.find(c => c.id === t.client_id);
      const project = dbData.projects.find(p => p.id === t.project_id);
      const assignee = dbData.users.find(u => u.id === t.assignee_id);

      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        clientId: t.client_id,
        clientName: client?.name || 'Cliente',
        projectId: t.project_id,
        projectName: project?.name || 'Projeto',
        assigneeId: t.assignee_id,
        assigneeName: assignee?.name || 'Não Atribuído',
        assigneeAvatar: assignee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        participantIds: t.participant_ids || [t.assignee_id],
        priority: t.priority,
        status: t.status,
        startDate: t.start_date || '2026-09-01',
        dueDate: t.due_date,
        dueTime: t.due_time || '18:00',
        isRecurring: t.is_recurring,
        recurrenceFrequency: t.recurrence_frequency,
        recurrenceRule: t.recurrence_rule,
        subtasks: (t.subtasks || []).map(s => ({
          id: s.id,
          title: s.title,
          completed: s.completed,
          isRecurring: s.is_recurring,
          recurrenceFrequency: s.recurrence_frequency,
          recurrenceRule: s.recurrence_rule,
          assigneeName: s.assignee_name || assignee?.name || 'Responsável',
          dueDate: s.due_date || t.due_date,
          dueTime: s.due_time || t.due_time
        })),
        checklist: t.checklist || [],
        comments: t.comments || [],
        attachments: t.attachments || [],
        history: t.history || [],
        createdBy: t.created_by,
        createdAt: t.created_at
      };
    });
  },

  findById: (id: string) => {
    const t = (dbData.tasks || []).find(task => task.id === id);
    if (!t) return null;

    const client = dbData.clients.find(c => c.id === t.client_id);
    const project = dbData.projects.find(p => p.id === t.project_id);
    const assignee = dbData.users.find(u => u.id === t.assignee_id);

    return {
      id: t.id,
      title: t.title,
      description: t.description || '',
      clientId: t.client_id,
      clientName: client?.name || 'Cliente',
      projectId: t.project_id,
      projectName: project?.name || 'Projeto',
      assigneeId: t.assignee_id,
      assigneeName: assignee?.name || 'Não Atribuído',
      assigneeAvatar: assignee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      participantIds: t.participant_ids || [t.assignee_id],
      priority: t.priority,
      status: t.status,
      startDate: t.start_date || '2026-09-01',
      dueDate: t.due_date,
      dueTime: t.due_time || '18:00',
      isRecurring: t.is_recurring,
      recurrenceFrequency: t.recurrence_frequency,
      recurrenceRule: t.recurrence_rule,
      subtasks: (t.subtasks || []).map(s => ({
        id: s.id,
        title: s.title,
        completed: s.completed,
        isRecurring: s.is_recurring,
        recurrenceFrequency: s.recurrence_frequency,
        recurrenceRule: s.recurrence_rule,
        assigneeName: s.assignee_name || assignee?.name || 'Responsável',
        dueDate: s.due_date || t.due_date,
        dueTime: s.due_time || t.due_time
      })),
      checklist: t.checklist || [],
      comments: t.comments || [],
      attachments: t.attachments || [],
      history: t.history || [],
      createdBy: t.created_by,
      createdAt: t.created_at
    };
  },

  create: (data: any, user?: { id: string; name: string; role: UserRole }) => {
    if (!dbData.tasks) dbData.tasks = [];

    const newTask: DbTask = {
      id: data.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: data.title,
      description: data.description || '',
      client_id: data.clientId || data.client_id,
      project_id: data.projectId || data.project_id,
      assignee_id: data.assigneeId || data.assignee_id || (user ? user.id : 'usr-gestor-1'),
      participant_ids: data.participantIds || data.participant_ids || [data.assigneeId || (user ? user.id : 'usr-gestor-1')],
      priority: data.priority || 'HIGH',
      status: data.status || 'A_FAZER',
      start_date: data.startDate || data.start_date || '2026-09-01',
      due_date: data.dueDate || data.due_date || '2026-09-01',
      due_time: data.dueTime || data.due_time || '18:00',
      is_recurring: Boolean(data.isRecurring || data.is_recurring),
      recurrence_frequency: data.recurrenceFrequency || data.recurrence_frequency,
      recurrence_rule: data.recurrenceRule || data.recurrence_rule,
      subtasks: (data.subtasks || []).map((s: any) => ({
        id: s.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: s.title,
        completed: Boolean(s.completed),
        is_recurring: Boolean(s.isRecurring || s.is_recurring),
        recurrence_frequency: s.recurrenceFrequency || s.recurrence_frequency,
        recurrence_rule: s.recurrenceRule || s.recurrence_rule,
        assignee_name: s.assigneeName || s.assignee_name,
        due_date: s.dueDate || s.due_date,
        due_time: s.dueTime || s.due_time
      })),
      checklist: data.checklist || [],
      comments: data.comments || [],
      attachments: data.attachments || [],
      history: [
        {
          id: `h-${Date.now()}`,
          user: user?.name || 'Administrador',
          action: 'Criou a demanda operacional',
          timestamp: new Date().toISOString()
        }
      ],
      created_by: user?.name || 'Sistema',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    dbData.tasks.unshift(newTask);
    saveDb();
    return taskRepository.findById(newTask.id);
  },

  update: (id: string, updates: any, user?: { id: string; name: string; role: UserRole }) => {
    if (!dbData.tasks) dbData.tasks = [];
    const idx = dbData.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;

    const curr = dbData.tasks[idx];

    // RBAC: Apenas SUPER_ADMIN ou ADMIN podem alterar o responsável principal (assignee_id)
    const newAssigneeId = updates.assigneeId || updates.assignee_id;
    let targetAssigneeId = curr.assignee_id;
    if (newAssigneeId && newAssigneeId !== curr.assignee_id) {
      if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
        // Ignora alteração de responsável se for colaborador
        targetAssigneeId = curr.assignee_id;
      } else {
        targetAssigneeId = newAssigneeId;
      }
    }

    dbData.tasks[idx] = {
      ...curr,
      title: updates.title !== undefined ? updates.title : curr.title,
      description: updates.description !== undefined ? updates.description : curr.description,
      client_id: (updates.clientId || updates.client_id) !== undefined ? (updates.clientId || updates.client_id) : curr.client_id,
      project_id: (updates.projectId || updates.project_id) !== undefined ? (updates.projectId || updates.project_id) : curr.project_id,
      assignee_id: targetAssigneeId,
      participant_ids: (updates.participantIds || updates.participant_ids) !== undefined ? (updates.participantIds || updates.participant_ids) : curr.participant_ids,
      priority: updates.priority !== undefined ? updates.priority : curr.priority,
      status: updates.status !== undefined ? updates.status : curr.status,
      start_date: (updates.startDate || updates.start_date) !== undefined ? (updates.startDate || updates.start_date) : curr.start_date,
      due_date: (updates.dueDate || updates.due_date) !== undefined ? (updates.dueDate || updates.due_date) : curr.due_date,
      due_time: (updates.dueTime || updates.due_time) !== undefined ? (updates.dueTime || updates.due_time) : curr.due_time,
      is_recurring: updates.isRecurring !== undefined ? updates.isRecurring : curr.is_recurring,
      recurrence_frequency: updates.recurrenceFrequency !== undefined ? updates.recurrenceFrequency : curr.recurrence_frequency,
      recurrence_rule: updates.recurrenceRule !== undefined ? updates.recurrenceRule : curr.recurrence_rule,
      subtasks: updates.subtasks !== undefined ? updates.subtasks.map((s: any) => ({
        id: s.id || `sub-${Date.now()}`,
        title: s.title,
        completed: Boolean(s.completed),
        is_recurring: Boolean(s.isRecurring || s.is_recurring),
        recurrence_frequency: s.recurrenceFrequency || s.recurrence_frequency,
        recurrence_rule: s.recurrenceRule || s.recurrence_rule,
        assignee_name: s.assigneeName || s.assignee_name,
        due_date: s.dueDate || s.due_date,
        due_time: s.dueTime || s.due_time
      })) : curr.subtasks,
      checklist: updates.checklist !== undefined ? updates.checklist : curr.checklist,
      comments: updates.comments !== undefined ? updates.comments : curr.comments,
      attachments: updates.attachments !== undefined ? updates.attachments : curr.attachments,
      history: updates.history !== undefined ? updates.history : curr.history,
      updated_at: new Date().toISOString()
    };

    saveDb();
    return taskRepository.findById(id);
  },

  delete: (id: string) => {
    if (!dbData.tasks) return false;
    const initialLen = dbData.tasks.length;
    dbData.tasks = dbData.tasks.filter(t => t.id !== id);
    if (dbData.tasks.length !== initialLen) {
      saveDb();
      return true;
    }
    return false;
  }
};
