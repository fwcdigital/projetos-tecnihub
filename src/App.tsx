import React, { useState, useEffect } from 'react';
import { 
  mockClients, 
  mockProjects, 
  mockTasks, 
  mockUsers, 
  mockNotifications 
} from './data/mockData';
import { 
  Client, 
  NavView, 
  Notification, 
  Project, 
  Task, 
  User 
} from './types';
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

export default function App() {
  // Navigation & Entity State
  const [currentView, setCurrentView] = useState<NavView>('MEU_TRABALHO');
  const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]); // Caio Rocha (Gestor)
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [users] = useState<User[]>(mockUsers);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  // Responsive Navigation State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Selected Entities
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(mockProjects[0]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(mockClients[0]);

  // Modals & Drawers
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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

  // Handler: Update Task in state
  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
  };

  // Handler: Toggle Task Complete
  const handleToggleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'CONCLUIDO' ? 'A_FAZER' : 'CONCLUIDO';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  // Handler: Add New Task
  const handleAddTask = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
    // Notification
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title: 'Nova Tarefa Criada',
      message: `A tarefa "${newTask.title}" foi atribuída a ${newTask.assigneeName}`,
      timestamp: 'Agora mesmo',
      read: false,
      type: 'TASK'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Handler: Add New Project
  const handleAddProject = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
    setSelectedProject(newProject);
    setCurrentView('PROJETO_DETALHE');
  };

  // Handler: Add New Client
  const handleAddClient = (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
    setSelectedClient(newClient);
    setCurrentView('CLIENTE_DETALHE');
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

  // Calculate overdue and today counts for badge alerts
  const todayStr = '2026-09-01';
  const overdueCount = tasks.filter(t => t.dueDate < todayStr && t.status !== 'CONCLUIDO').length;
  const todayCount = tasks.filter(t => t.dueDate === todayStr && t.status !== 'CONCLUIDO').length;

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
          onSelectUser={setCurrentUser}
          onOpenGlobalSearch={() => setIsSearchModalOpen(true)}
          onOpenNewTask={() => setIsNewTaskModalOpen(true)}
          onOpenNewProject={() => setIsNewProjectModalOpen(true)}
          onOpenNewClient={() => setIsNewClientModalOpen(true)}
          overdueCount={overdueCount}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          notifications={notifications}
          onMarkAllNotificationsRead={() => {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          }}
        />

        {/* Dynamic Viewport Container (with pb-20 on mobile to not overlap bottom nav) */}
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
              onOpenNewProject={() => setIsNewProjectModalOpen(true)}
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
              onOpenNewProject={() => setIsNewProjectModalOpen(true)}
            />
          )}

          {currentView === 'PROJETO_DETALHE' && selectedProject && (
            <ProjectDetailView
              project={selectedProject}
              tasks={tasks}
              onBack={() => setCurrentView('PROJETOS')}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
            />
          )}

          {currentView === 'CLIENTES' && (
            <ClientsView
              clients={clients}
              projects={projects}
              tasks={tasks}
              onSelectClient={handleNavigateClientDetail}
              onOpenNewClient={() => setIsNewClientModalOpen(true)}
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
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
              onOpenNewProject={() => setIsNewProjectModalOpen(true)}
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
                <h1 className="text-xl sm:text-2xl font-bold text-white">Configurações do Workspace</h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">Gerencie regras operacionais da agência e integrações.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-200">Alertas de Prazos</h3>
                  <p className="text-xs text-zinc-400 mt-1">Disparar notificações automáticas quando tarefas atingirem 24h para o prazo.</p>
                  <span className="inline-block mt-3 px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">Ativo</span>
                </div>
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-200">Roteamento SPA & Deploy</h3>
                  <p className="text-xs text-zinc-400 mt-1">Ambiente Node.js / Express com fallback para roteamento React.</p>
                  <span className="inline-block mt-3 px-2 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold rounded">Pronto para Hostinger</span>
                </div>
              </div>
            </div>
          )}

          {currentView === 'RELATORIOS' && (
            <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in">
              <div className="border-b border-zinc-800 pb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Relatórios & Produtividade</h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">Visão analítica de entregas, SLA de clientes e gargalos.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <span className="text-xs text-zinc-400">Tarefas Concluídas no Mês</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    {tasks.filter(t => t.status === 'CONCLUIDO').length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <span className="text-xs text-zinc-400">Projetos em Andamento</span>
                  <p className="text-2xl font-black text-sky-400 mt-1">
                    {projects.filter(p => p.status === 'EM_ANDAMENTO').length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[#121216] border border-zinc-800">
                  <span className="text-xs text-zinc-400">Taxa de Pontualidade</span>
                  <p className="text-2xl font-black text-amber-400 mt-1">94.8%</p>
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

      {/* Task Detail Slide-over Drawer (Mobile Optimized) */}
      <TaskDrawer
        task={selectedTask}
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        onUpdateTask={handleUpdateTask}
        currentUser={currentUser}
      />

      {/* Creation Modals */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onAddTask={handleAddTask}
        clients={clients}
        projects={projects}
        users={users}
        currentUser={currentUser}
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
