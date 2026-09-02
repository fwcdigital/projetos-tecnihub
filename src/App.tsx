import React, { useState, useEffect, useCallback } from 'react';
import { mockNotifications } from './data/mockData';
import { 
  Client, 
  NavView, 
  Notification, 
  Project, 
  Task, 
  User 
} from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { clientService } from './services/clientService';
import { projectService } from './services/projectService';
import { userService } from './services/userService';
import { taskService } from './services/taskService';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { TaskDrawer } from './components/TaskDrawer';
import { NewTaskModal } from './components/NewTaskModal';
import { NewProjectModal } from './components/NewProjectModal';
import { NewClientModal } from './components/NewClientModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';

// Views
import { DashboardView } from './views/DashboardView';
import { MyWorkView } from './views/MyWorkView';
import { ProjectsView } from './views/ProjectsView';
import { ProjectDetailView } from './views/ProjectDetailView';
import { ClientsView } from './views/ClientsView';
import { ClientDetailView } from './views/ClientDetailView';
import { TeamView } from './views/TeamView';
import { RecurrencesView } from './views/RecurrencesView';
import { CalendarView } from './views/CalendarView';
import { ProfileView } from './views/ProfileView';
import { Loader2 } from 'lucide-react';

function MainLayout() {
  const { user: authUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Navigation & Entity State
  const [currentView, setCurrentView] = useState<NavView>('MEU_TRABALHO');
  const [currentUser, setCurrentUser] = useState<User | null>(authUser);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Responsive Navigation State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Selected Entities
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Modals & Drawers
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskContext, setNewTaskContext] = useState<{ projectId?: string; clientId?: string } | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Sincronizar currentUser quando authUser mudar
  useEffect(() => {
    if (authUser) {
      setCurrentUser(authUser);
    }
  }, [authUser]);

  // Carregar dados reais da API
  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingData(true);
      const [fetchedClients, fetchedProjects, fetchedUsers, fetchedTasks] = await Promise.all([
        clientService.getAll(),
        projectService.getAll(),
        userService.getAll(),
        taskService.getAll()
      ]);

      setClients(fetchedClients);
      setSelectedClient(fetchedClients[0] || null);
      setProjects(fetchedProjects);
      setSelectedProject(fetchedProjects[0] || null);
      setUsers(fetchedUsers);
      setTasks(fetchedTasks);
    } catch (err) {
      console.error('Erro ao carregar dados do servidor:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcut for Cmd+K Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handler: Select Task to Open Drawer
  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDrawerOpen(true);
  };

  // Handler: Update Task in backend & state
  const handleUpdateTask = async (updatedTask: Task) => {
    // Atualização otimista imediata
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);

    try {
      const persisted = await taskService.update(updatedTask.id, updatedTask);
      if (persisted) {
        setTasks(prev => prev.map(t => t.id === persisted.id ? persisted : t));
        setSelectedTask(persisted);
      }
    } catch (err) {
      console.error('Erro ao persistir atualização de tarefa no backend:', err);
    }
  };

  // Handler: Toggle Task Complete
  const handleToggleComplete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const nextStatus = currentTask.status === 'CONCLUIDO' ? 'A_FAZER' : 'CONCLUIDO';
    const updated = { ...currentTask, status: nextStatus };

    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask(updated);
    }

    try {
      await taskService.update(taskId, { status: nextStatus });
    } catch (err) {
      console.error('Erro ao alternar status da tarefa:', err);
    }
  };

  // Handler: Add New Task
  const handleAddTask = async (newTaskData: Task) => {
    try {
      const created = await taskService.create(newTaskData).catch(() => newTaskData);
      setTasks(prev => [created, ...prev]);

      // Notification
      const newNotif: Notification = {
        id: `notif-${Date.now()}`,
        title: 'Nova Tarefa Criada',
        message: `A tarefa "${created.title}" foi atribuída a ${created.assigneeName}`,
        timestamp: 'Agora mesmo',
        read: false,
        type: 'TASK'
      };
      setNotifications(prev => [newNotif, ...prev]);
    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
    }
  };

  const handleOpenNewTaskModal = (context?: { projectId?: string; clientId?: string }) => {
    setNewTaskContext(context || null);
    setIsNewTaskModalOpen(true);
  };

  // Handler: Add New Project via Real API
  const handleAddProject = async (newProjectData: Partial<Project>, teamUserIds: string[]) => {
    const savedProject = await projectService.create(newProjectData, teamUserIds);
    setProjects(prev => [savedProject, ...prev]);
    setSelectedProject(savedProject);
    setCurrentView('PROJETO_DETALHE');

    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title: 'Novo Projeto Criado',
      message: `O projeto "${savedProject.name}" foi registrado com sucesso.`,
      timestamp: 'Agora mesmo',
      read: false,
      type: 'PROJECT'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Handler: Add New Client via Real API
  const handleAddClient = async (newClientData: Partial<Client>) => {
    const savedClient = await clientService.create(newClientData);
    setClients(prev => [savedClient, ...prev]);
    setSelectedClient(savedClient);
    setCurrentView('CLIENTE_DETALHE');

    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title: 'Novo Cliente Cadastrado',
      message: `O cliente "${savedClient.name}" foi registrado com sucesso.`,
      timestamp: 'Agora mesmo',
      read: false,
      type: 'CLIENT'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Handler: Navigate to Project Detail
  const handleNavigateProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('PROJETO_DETALHE');
  };

  // Handler: Navigate to Client Detail
  const handleNavigateClientDetail = (client: Client) => {
    setSelectedClient(client);
    setCurrentView('CLIENTE_DETALHE');
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-purple-400" />
          <span className="text-xs font-medium tracking-wider uppercase text-zinc-500">Iniciando Tecnihub...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginScreen />;
  }

  // Calculate overdue and today counts for badge alerts
  const todayStr = '2026-09-01';
  const overdueCount = tasks.filter(t => t.dueDate < todayStr && t.status !== 'CONCLUIDO').length;
  const todayCount = tasks.filter(t => t.dueDate === todayStr && t.status !== 'CONCLUIDO').length;
  const canManageCoreRecords = currentUser.role !== 'COLABORADOR';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Left Sidebar Navigation (Desktop + Mobile Drawer) */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setIsMobileSidebarOpen(false);
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        currentUser={currentUser}
        overdueCount={overdueCount}
        todayCount={todayCount}
        projectsCount={projects.length}
        clientsCount={clients.length}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenNewTask={() => setIsNewTaskModalOpen(true)}
      />

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Sticky Header */}
        <Header
          currentView={currentView}
          currentUser={currentUser}
          users={[currentUser]}
          onSelectUser={() => undefined}
          onOpenGlobalSearch={() => setIsSearchModalOpen(true)}
          onOpenNewTask={() => setIsNewTaskModalOpen(true)}
          onOpenNewProject={canManageCoreRecords ? () => setIsNewProjectModalOpen(true) : undefined}
          onOpenNewClient={canManageCoreRecords ? () => setIsNewClientModalOpen(true) : undefined}
          overdueCount={overdueCount}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          notifications={notifications}
          onMarkAllNotificationsRead={() => {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          }}
        />

        {/* Dynamic Viewport Container */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0e] relative pb-20 md:pb-6">
          {currentView === 'DASHBOARD' && (
            <DashboardView
              currentUser={currentUser}
              tasks={tasks}
              projects={projects}
              clients={clients}
              users={users}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onNavigate={(view) => setCurrentView(view)}
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
              onOpenNewProject={canManageCoreRecords ? () => setIsNewProjectModalOpen(true) : undefined}
            />
          )}

          {currentView === 'MEU_TRABALHO' && (
            <MyWorkView
              currentUser={currentUser}
              tasks={tasks}
              projects={projects}
              clients={clients}
              users={users}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
            />
          )}

          {currentView === 'PROJETOS' && (
            <ProjectsView
              projects={projects}
              clients={clients}
              tasks={tasks}
              onSelectProject={handleNavigateProjectDetail}
              onOpenNewProject={canManageCoreRecords ? () => setIsNewProjectModalOpen(true) : undefined}
            />
          )}

          {currentView === 'PROJETO_DETALHE' && selectedProject && (
            <ProjectDetailView
              project={selectedProject}
              tasks={tasks}
              onBack={() => setCurrentView('PROJETOS')}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onOpenNewTask={() => handleOpenNewTaskModal({ projectId: selectedProject.id, clientId: selectedProject.clientId })}
            />
          )}

          {currentView === 'CLIENTES' && (
            <ClientsView
              clients={clients}
              projects={projects}
              tasks={tasks}
              onSelectClient={handleNavigateClientDetail}
              onOpenNewClient={canManageCoreRecords ? () => setIsNewClientModalOpen(true) : undefined}
            />
          )}

          {currentView === 'CLIENTE_DETALHE' && selectedClient && (
            <ClientDetailView
              client={selectedClient}
              projects={projects}
              tasks={tasks}
              onBack={() => setCurrentView('CLIENTES')}
              onSelectProject={handleNavigateProjectDetail}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onOpenNewTask={() => handleOpenNewTaskModal({ clientId: selectedClient.id })}
              onOpenNewProject={canManageCoreRecords ? () => setIsNewProjectModalOpen(true) : undefined}
            />
          )}

          {currentView === 'EQUIPE' && (
            <TeamView
              users={users}
              tasks={tasks}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
            />
          )}

          {currentView === 'RECORRENCIAS' && (
            <RecurrencesView
              tasks={tasks}
              projects={projects}
              clients={clients}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
            />
          )}

          {currentView === 'CALENDARIO' && (
            <CalendarView
              tasks={tasks}
              onSelectTask={handleSelectTask}
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
            />
          )}

          {currentView === 'PERFIL' && (
            <ProfileView currentUser={currentUser} />
          )}

          {currentView === 'CONFIGURACOES' && (
            <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in">
              <div className="border-b border-zinc-800 pb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Configurações & Fundação do Sistema</h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">Gerencie a infraestrutura, banco relacional e segurança do Tecnihub.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-200">Banco de Dados Relacional</h3>
                  <p className="text-xs text-zinc-400 mt-1">Persistência relacional nativa e schema exportável para PostgreSQL / MySQL.</p>
                  <span className="inline-block mt-3 px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">Persistência Ativa</span>
                </div>
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-200">Autenticação & RBAC (JWT)</h3>
                  <p className="text-xs text-zinc-400 mt-1">Sessões seguras com bcrypt e permissões (Super Admin, Admin, Gestor, Colaborador).</p>
                  <span className="inline-block mt-3 px-2 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold rounded">Pronto para Produção / VPS</span>
                </div>
              </div>
            </div>
          )}

          {currentView === 'RELATORIOS' && (
            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in">
              <div className="border-b border-zinc-800 pb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Relatórios & Produtividade</h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">Visão analítica de entregas, SLA de clientes e contratos.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <span className="text-xs text-zinc-400">Total de Clientes Ativos</span>
                  <p className="text-2xl font-black text-purple-400 mt-1">
                    {clients.length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <span className="text-xs text-zinc-400">Projetos em Andamento</span>
                  <p className="text-2xl font-black text-sky-400 mt-1">
                    {projects.filter(p => p.status === 'EM_ANDAMENTO').length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <span className="text-xs text-zinc-400">Total de Projetos Registrados</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{projects.length}</p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile Bottom Quick Navigation Bar */}
        <MobileBottomNav
          currentView={currentView}
          onNavigate={(view) => setCurrentView(view)}
          onOpenNewMenu={() => setIsNewTaskModalOpen(true)}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          overdueCount={overdueCount}
        />
      </div>

      {/* Task Detail Slide-over Drawer */}
      <TaskDrawer
        task={selectedTask}
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        onUpdateTask={handleUpdateTask}
        currentUser={currentUser}
        users={users}
      />

      {/* Creation Modals */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => {
          setIsNewTaskModalOpen(false);
          setNewTaskContext(null);
        }}
        onAddTask={handleAddTask}
        clients={clients}
        projects={projects}
        users={users}
        currentUser={currentUser}
        defaultProjectId={newTaskContext?.projectId}
        defaultClientId={newTaskContext?.clientId}
      />

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onAddProject={handleAddProject}
        clients={clients}
        users={users}
        currentUser={currentUser}
      />

      <NewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        onAddClient={handleAddClient}
        users={users}
        currentUser={currentUser}
      />

      {/* Global Cmd+K Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        tasks={tasks}
        projects={projects}
        clients={clients}
        users={users}
        onSelectTask={handleSelectTask}
        onSelectProject={handleNavigateProjectDetail}
        onSelectClient={handleNavigateClientDetail}
        onSelectUser={() => {
          setCurrentView('EQUIPE');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
