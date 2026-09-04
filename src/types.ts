export type NavView = 
  | 'DASHBOARD'
  | 'MEU_TRABALHO'
  | 'PROJETOS'
  | 'PROJETO_DETALHE'
  | 'CLIENTES'
  | 'CLIENTE_DETALHE'
  | 'EQUIPE'
  | 'MEMBRO_DETALHE'
  | 'RECORRENCIAS'
  | 'CALENDARIO'
  | 'RELATORIOS'
  | 'CONFIGURACOES'
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

export type OperationalViewMode = 'admin' | 'operator';

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
  accountStatus?: 'ACTIVE' | 'INACTIVE';
}

export type Priority = 'URGENTE' | 'ALTA' | 'NORMAL' | 'BAIXA';

export type TaskStatus = string;

export type ProjectStatus = string;

export interface ProjectStatusDefinition {
  id: string;
  name: string;
  color: string;
  position: number;
  active: boolean;
  projectsCount: number;
}

export interface ProductDefinition {
  id: string;
  name: string;
  color: string;
  position: number;
  active: boolean;
  projectsCount: number;
  statusesCount: number;
  statuses?: ProductStatusDefinition[];
}

export interface ProductStatusDefinition {
  id: string;
  productId: string;
  name: string;
  color: string;
  position: number;
  active: boolean;
  isCompleted: boolean;
  projectsCount: number;
  tasksCount: number;
}

export type ProjectType = string;

export type RecurrenceFrequency = 
  | 'NAO_REPETIR'
  | 'DIARIO'
  | 'SEMANAL'
  | 'QUINZENAL'
  | 'MENSAL'
  | 'PERSONALIZADO';

export interface RecurrenceRule {
  id: string;
  sourceTaskId: string;
  title: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  frequency: Exclude<RecurrenceFrequency, 'NAO_REPETIR'>;
  ruleText: string;
  customIntervalDays?: number;
  nextOccurrenceDate: string;
  occurrenceTime?: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  assignees: Assignee[];
  priority: Priority;
  description: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  position?: number;
  dueDate?: string;
  dueTime?: string;
  assigneeId?: string;
}

export interface Assignee {
  id: string;
  name: string;
  avatar: string;
  position: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  participantIds?: string[];
  assignees?: Assignee[];
  availableAssignees?: Assignee[];
  status?: TaskStatus;
  statusName?: string;
  statusColor?: string;
  statusCompleted?: boolean;
  priority?: Priority;
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
  parentTaskId?: string;
  generatedByRuleId?: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  participantIds: string[];
  assignees?: Assignee[];
  priority: Priority;
  status: TaskStatus;
  statusName?: string;
  statusColor?: string;
  statusCompleted?: boolean;
  workflowStatuses?: ProductStatusDefinition[];
  productId?: string;
  startDate?: string | null;
  startTime?: string | null;
  dueDate: string; // ISO or YYYY-MM-DD
  dueTime?: string | null; // HH:MM
  isRecurring: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceRule?: string;
  recurrence?: Pick<RecurrenceRule, 'id' | 'frequency' | 'ruleText' | 'customIntervalDays' | 'nextOccurrenceDate' | 'occurrenceTime' | 'status'>;
  description: string;
  subtasks: Subtask[];
  checklist: ChecklistItem[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  history: TaskHistory[];
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
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
  managerAvatar?: string;
  teamMembers: string[];
  teamMemberDetails?: Array<{
    id: string;
    name: string;
    avatar: string;
    position: string;
    role: string;
  }>;
  startDate: string;
  dueDate: string;
  progress: number; // 0 to 100
  status: ProjectStatus;
  statusName?: string;
  statusColor?: string;
  statusActive?: boolean;
  statusCompleted?: boolean;
  priority: Priority;
  type: ProjectType;
  typeName?: string;
  typeColor?: string;
  workflowStatuses?: ProductStatusDefinition[];
  isRecurring: boolean;
  description: string;
  briefing?: Record<string, string>;
  resources?: ProjectResource[];
  tasksCount: number;
  overdueTasksCount: number;
}

export interface ProjectResource {
  id: string;
  projectId: string;
  kind: 'FILE' | 'GOOGLE_DRIVE';
  name: string;
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}
