export type NavView = 
  | 'DASHBOARD'
  | 'MEU_TRABALHO'
  | 'PROJETOS'
  | 'PROJETO_DETALHE'
  | 'CLIENTES'
  | 'CLIENTE_DETALHE'
  | 'EQUIPE'
  | 'RECORRENCIAS'
  | 'CALENDARIO'
  | 'PERFIL';

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'TASK' | 'PROJECT' | 'CLIENT' | 'ALERT';
}

export type UserRole = 'ADMIN_PRINCIPAL' | 'ADMIN' | 'GESTOR_PROJETO' | 'COLABORADOR';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  email: string;
  avatar: string;
  position: string;
  activeProjectsCount: number;
  currentTasksCount: number;
  overdueTasksCount: number;
  next7DaysTasksCount: number;
  status: 'ONLINE' | 'EM_REUNIAO' | 'FOCO' | 'OFFLINE';
}

export type Priority = 'URGENTE' | 'ALTA' | 'NORMAL' | 'BAIXA';

export type TaskStatus = 
  | 'BACKLOG'
  | 'A_FAZER' 
  | 'EM_ANDAMENTO' 
  | 'AGUARDANDO_CLIENTE' 
  | 'EM_REVISAO' 
  | 'CONCLUIDO' 
  | 'BLOQUEADO';

export type ProjectStatus = 
  | 'PLANEJAMENTO'
  | 'AGUARDANDO_INICIO'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_CLIENTE'
  | 'EM_REVISAO'
  | 'PAUSADO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export type ProjectType = 
  | 'SITE'
  | 'LANDING_PAGE'
  | 'ECOMMERCE'
  | 'GOOGLE_ADS'
  | 'META_ADS'
  | 'SEO'
  | 'SOCIAL_MEDIA'
  | 'MANUTENCAO'
  | 'INTERNO'
  | 'OUTRO';

export type RecurrenceFrequency = 
  | 'NAO_REPETIR'
  | 'DIARIO'
  | 'SEMANAL'
  | 'QUINZENAL'
  | 'MENSAL'
  | 'PERSONALIZADO';

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  dueDate?: string;
  dueTime?: string;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceRule?: string;
  checklist?: ChecklistItem[];
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  uploadedAt: string;
}

export interface TaskHistory {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  participantIds: string[];
  priority: Priority;
  status: TaskStatus;
  startDate?: string;
  dueDate: string; // ISO or YYYY-MM-DD
  dueTime?: string; // HH:MM
  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceRule?: string;
  description: string;
  subtasks: Subtask[];
  checklist: ChecklistItem[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  history: TaskHistory[];
  createdBy: string;
  createdAt: string;
  tags?: string[];
}

export interface Client {
  id: string;
  name: string;
  company: string;
  logo: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  activeProjectsCount: number;
  completedProjectsCount: number;
  leadManagerId: string;
  leadManagerName: string;
  teamMembers: string[];
  statusRelationship: 'ATIVO' | 'ONBOARDING' | 'EM_RENOVACAO' | 'PAUSADO';
  notes: string;
  monthlyServices: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  managerId: string;
  managerName: string;
  teamMembers: string[];
  startDate: string;
  dueDate: string;
  progress: number; // 0 to 100
  status: ProjectStatus;
  priority: Priority;
  type: ProjectType;
  isRecurring: boolean;
  description: string;
  tasksCount: number;
  overdueTasksCount: number;
}
