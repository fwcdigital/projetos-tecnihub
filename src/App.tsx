import React, { useState, useEffect, useCallback } from 'react';
import { 
  Client, 
  NavView, 
  Notification, 
  Project, 
  ProductDefinition,
  RecurrenceRule,
  Task, 
  User 
} from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OperationalViewProvider, useOperationalView } from './context/OperationalViewContext';
import { LoginScreen } from './components/LoginScreen';
import { clientService } from './services/clientService';
import { projectService } from './services/projectService';
import { userService } from './services/userService';
import { taskService } from './services/taskService';
import { routineService } from './services/routineService';
import { productService } from './services/productService';
import { authService } from './services/authService';
import { isAdministrator } from './permissions';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { TaskDrawer } from './components/TaskDrawer';
import { NewTaskModal } from './components/NewTaskModal';
import { NewProjectModal } from './components/NewProjectModal';
import { EditProjectModal } from './components/EditProjectModal';
import { NewClientModal } from './components/NewClientModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ProductManager } from './components/ProductManager';
import { isProjectCompleted } from './components/visualTokens';

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
import { getCompletedWorkflowStatus, getOpenWorkflowStatus, isTaskCompleted } from './components/visualTokens';

const viewFromPath = (pathname: string): NavView => {
  if (pathname.startsWith('/routines')) return 'RECORRENCIAS';
  if (pathname.startsWith('/projects/')) return 'PROJETO_DETALHE';
  if (pathname === '/projects') return 'PROJETOS';
  if (pathname.startsWith('/clients/')) return 'CLIENTE_DETALHE';
  if (pathname === '/clients') return 'CLIENTES';
  if (pathname.startsWith('/team')) return 'EQUIPE';
  if (pathname.startsWith('/calendar')) return 'CALENDARIO';
  if (pathname.startsWith('/reports')) return 'RELATORIOS';
  if (pathname.startsWith('/settings')) return 'CONFIGURACOES';
  if (pathname.startsWith('/profile')) return 'PERFIL';
  if (pathname.startsWith('/dashboard')) return 'DASHBOARD';
  return 'MEU_TRABALHO';
};

function MainLayout() {
  const { user: authUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { mode: operationalView, setMode: setOperationalView } = useOperationalView();

  // Navigation & Entity State
  const [currentView, setCurrentView] = useState<NavView>(() => viewFromPath(window.location.pathname));
  const [currentUser, setCurrentUser] = useState<User | null>(authUser);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [routines, setRoutines] = useState<RecurrenceRule[]>([]);
  const [products, setProducts] = useState<ProductDefinition[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mutationError, setMutationError] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [routeHydrated, setRouteHydrated] = useState(false);

  // Responsive Navigation State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Selected Entities
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [routedTaskId, setRoutedTaskId] = useState<string | null>(() => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[0] === 'tasks' && parts[1] ? parts[1] : null;
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Modals & Drawers
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskContext, setNewTaskContext] = useState<{ projectId?: string; clientId?: string } | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [newProjectClientId, setNewProjectClientId] = useState<string | undefined>();
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
      const scopedView = authUser && isAdministrator(authUser.role) ? operationalView : undefined;
      const [fetchedClients, fetchedProjects, fetchedUsers, activeTasks, completedTasks, fetchedRoutines, fetchedProducts] = await Promise.all([
        clientService.getAll(),
        projectService.getAll({ operationalView: scopedView }),
        userService.getAll(),
        taskService.getAll({ operationalView: scopedView }),
        taskService.getAll({ operationalView: scopedView, completedOnly: true }),
        routineService.getAll(scopedView),
        productService.getCatalog()
      ]);

      setClients(fetchedClients);
      setSelectedClient(previous => previous ? fetchedClients.find(client => client.id === previous.id) || fetchedClients[0] || null : fetchedClients[0] || null);
      setProjects(fetchedProjects);
      setSelectedProject(previous => previous ? fetchedProjects.find(project => project.id === previous.id) || null : fetchedProjects[0] || null);
      setUsers(fetchedUsers);
      const fetchedTasks = [...activeTasks, ...completedTasks];
      setTasks(fetchedTasks);
      setRoutines(fetchedRoutines);
      setProducts(fetchedProducts);

      const pathParts = window.location.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'projects' && pathParts[1]) {
        const routedProject = fetchedProjects.find(project => project.id === pathParts[1]) || null;
        setSelectedProject(routedProject);
        if (!routedProject) setCurrentView('PROJETOS');
      }
      if (pathParts[0] === 'clients' && pathParts[1]) setSelectedClient(fetchedClients.find(client => client.id === pathParts[1]) || fetchedClients[0] || null);
      if (pathParts[0] === 'tasks' && pathParts[1]) {
        const routedTask = fetchedTasks.find(task => task.id === pathParts[1]) || await taskService.getById(pathParts[1], scopedView);
        if (routedTask) { setSelectedTask(routedTask); setRoutedTaskId(routedTask.id); setIsTaskDrawerOpen(true); }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do servidor:', err);
    } finally {
      setRouteHydrated(true);
      setIsLoadingData(false);
    }
  }, [authUser, isAuthenticated, operationalView]);

  const refreshRoutines = useCallback(async () => {
    if (!isAuthenticated) return;
    const scopedView = authUser && isAdministrator(authUser.role) ? operationalView : undefined;
    setRoutines(await routineService.getAll(scopedView));
  }, [authUser, isAuthenticated, operationalView]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!mutationError) return;
    const timeout = window.setTimeout(() => setMutationError(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [mutationError]);

  useEffect(() => {
    const handlePopState = () => {
      setRouteHydrated(true);
      setCurrentView(viewFromPath(window.location.pathname));
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0] === 'tasks' && parts[1]) {
        const task = tasks.find(item => item.id === parts[1]);
        setRoutedTaskId(parts[1]);
        if (task) { setSelectedTask(task); setIsTaskDrawerOpen(true); }
      } else { setRoutedTaskId(null); setIsTaskDrawerOpen(false); }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tasks]);

  useEffect(() => {
    if (routeHydrated && routedTaskId && selectedTask?.id === routedTaskId) setIsTaskDrawerOpen(true);
  }, [routeHydrated, routedTaskId, selectedTask]);

  useEffect(() => {
    if (isLoadingData || !routeHydrated) return;
    let path = '/tasks';
    if (routedTaskId && selectedTask?.id === routedTaskId) path = `/tasks/${routedTaskId}`;
    else if (currentView === 'DASHBOARD') path = '/dashboard';
    else if (currentView === 'RECORRENCIAS') path = '/routines';
    else if (currentView === 'PROJETOS') path = '/projects';
    else if (currentView === 'PROJETO_DETALHE' && selectedProject) path = `/projects/${selectedProject.id}`;
    else if (currentView === 'CLIENTES') path = '/clients';
    else if (currentView === 'CLIENTE_DETALHE' && selectedClient) path = `/clients/${selectedClient.id}`;
    else if (currentView === 'EQUIPE') path = '/team';
    else if (currentView === 'CALENDARIO') path = '/calendar';
    else if (currentView === 'RELATORIOS') path = '/reports';
    else if (currentView === 'CONFIGURACOES') path = '/settings';
    else if (currentView === 'PERFIL') path = '/profile';
    if (window.location.pathname !== path) window.history.replaceState({}, '', path);
  }, [currentView, isLoadingData, routeHydrated, routedTaskId, selectedClient, selectedProject, selectedTask]);

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
    setRoutedTaskId(task.id);
    setIsTaskDrawerOpen(true);
  };

  const syncOperationalTask = (task: Task) => {
    if (!currentUser || operationalView !== 'operator') return;
    const isAssigned = task.assignees?.some(assignee => assignee.id === currentUser.id) === true;
    setTasks(previous => {
      const withoutTask = previous.filter(item => item.id !== task.id);
      return isAssigned ? [task, ...withoutTask] : withoutTask;
    });
  };

  // Handler: Update Task in backend & state
  const handleUpdateTask = async (updatedTask: Task) => {
    const previousTask = tasks.find(task => task.id === updatedTask.id);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    syncOperationalTask(updatedTask);
    setSelectedTask(updatedTask);

    try {
      const persisted = await taskService.update(updatedTask.id, updatedTask);
      if (persisted) {
        setTasks(prev => prev.map(t => t.id === persisted.id ? persisted : t));
        syncOperationalTask(persisted);
        setSelectedTask(persisted);
        await refreshRoutines();
      }
    } catch (err) {
      console.error('Erro ao persistir atualização de tarefa no backend:', err);
      setMutationError(err instanceof Error ? err.message : 'Não foi possível salvar a tarefa.');
      if (previousTask) {
        setTasks(prev => prev.map(t => t.id === previousTask.id ? previousTask : t));
        syncOperationalTask(previousTask);
        setSelectedTask(previousTask);
      }
    }
  };

  const handleUpdateRoutine = async (id: string, updates: Partial<RecurrenceRule>) => {
    const saved = await routineService.update(id, updates);
    setRoutines(previous => previous.map(routine => routine.id === id ? saved : routine));
  };

  const handleRemoveRoutine = async (id: string) => {
    await routineService.remove(id);
    setRoutines(previous => previous.filter(routine => routine.id !== id));
    setTasks(previous => previous.map(task => task.recurrence?.id === id
      ? { ...task, isRecurring: false, recurrence: undefined, recurrenceFrequency: 'NAO_REPETIR', recurrenceRule: undefined }
      : task));
  };

  // Handler: Toggle Task Complete
  const handleToggleComplete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    const nextDefinition = isTaskCompleted(currentTask)
      ? getOpenWorkflowStatus(currentTask.workflowStatuses)
      : getCompletedWorkflowStatus(currentTask.workflowStatuses);
    if (!nextDefinition) {
      setMutationError('O Produto deste projeto não possui um Status adequado para esta ação.');
      return;
    }
    const nextStatus = nextDefinition.id;
    const updated = {
      ...currentTask,
      status: nextStatus,
      statusName: nextDefinition.name,
      statusColor: nextDefinition.color,
      statusCompleted: nextDefinition.isCompleted,
      completedAt: nextDefinition.isCompleted ? new Date().toISOString() : undefined
    };

    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    syncOperationalTask(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask(updated);
    }

    try {
      const persisted = await taskService.update(taskId, { status: nextStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? persisted : t));
      syncOperationalTask(persisted);
      if (selectedTask?.id === taskId) setSelectedTask(persisted);
    } catch (err) {
      console.error('Erro ao alternar status da tarefa:', err);
      setMutationError(err instanceof Error ? err.message : 'Não foi possível alterar o status da tarefa.');
      setTasks(prev => prev.map(t => t.id === taskId ? currentTask : t));
      syncOperationalTask(currentTask);
      if (selectedTask?.id === taskId) setSelectedTask(currentTask);
    }
  };

  // Handler: Add New Task
  const handleAddTask = async (newTaskData: Task) => {
    const created = await taskService.create(newTaskData);
    setTasks(prev => [created, ...prev]);
    syncOperationalTask(created);
    if (created.isRecurring) await refreshRoutines();

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

  const handleDeleteTask = async (taskId: string) => {
    try {
      const deleted = await taskService.delete(taskId);
      if (!deleted) throw new Error('Não foi possível excluir a tarefa.');
      setTasks(previous => previous.filter(task => task.id !== taskId));
      setSelectedTask(null);
      setRoutedTaskId(null);
      setIsTaskDrawerOpen(false);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Não foi possível excluir a tarefa.');
    }
  };

  const persistProjectUpdate = async (project: Project, data: Partial<Project>, teamUserIds?: string[]) => {
    setMutationError('');
    const optimistic = { ...project, ...data };
    setProjects(previous => previous.map(item => item.id === project.id ? optimistic : item));
    setSelectedProject(previous => previous?.id === project.id ? optimistic : previous);

    try {
      const saved = await projectService.update(project.id, data, teamUserIds);
      setProjects(previous => previous.map(item => item.id === saved.id ? saved : item));
      setSelectedProject(previous => previous?.id === saved.id ? saved : previous);
      if (data.type && data.type !== project.type) {
        const scopedView = authUser && isAdministrator(authUser.role) ? operationalView : undefined;
        const [activeProjectTasks, completedProjectTasks] = await Promise.all([
          taskService.getAll({ operationalView: scopedView }),
          taskService.getAll({ operationalView: scopedView, completedOnly: true })
        ]);
        const refreshedTasks = [...activeProjectTasks, ...completedProjectTasks];
        setTasks(refreshedTasks);
        setSelectedTask(previous => previous ? refreshedTasks.find(task => task.id === previous.id) || null : null);
      }
    } catch (error) {
      setProjects(previous => previous.map(item => item.id === project.id ? project : item));
      setSelectedProject(previous => previous?.id === project.id ? project : previous);
      setMutationError(error instanceof Error ? error.message : 'Não foi possível salvar o projeto.');
      throw error;
    }
  };

  const handleUpdateProject = async (data: Partial<Project>, teamUserIds?: string[]) => {
    if (!selectedProject) return;
    await persistProjectUpdate(selectedProject, data, teamUserIds);
  };

  const handleInlineUpdateProject = async (project: Project, data: Partial<Project>, teamUserIds?: string[]) => {
    try {
      await persistProjectUpdate(project, data, teamUserIds);
    } catch {
      // A mensagem e o rollback já são tratados pela mutation compartilhada.
    }
  };

  const handleSaveBriefing = async (briefing: Record<string, string>) => {
    await handleUpdateProject({ briefing });
  };

  const handleRefreshSelectedProject = async () => {
    if (!selectedProject) return;
    const scopedView = authUser && isAdministrator(authUser.role) ? operationalView : undefined;
    const saved = await projectService.getById(selectedProject.id, scopedView);
    setProjects(previous => previous.map(project => project.id === saved.id ? saved : project));
    setSelectedProject(saved);
  };

  const refreshProductCatalog = async () => setProducts(await productService.getCatalog());

  const handleCreateUser = async (data: any) => {
    const created = await userService.create(data);
    const saved = data.status === 'INACTIVE'
      ? await userService.update(created.id, { status: 'INACTIVE' })
      : created;
    setUsers(previous => [...previous, saved].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleUpdateUser = async (id: string, data: any) => {
    const saved = await userService.update(id, data);
    setUsers(previous => previous.map(user => user.id === id ? saved : user));
    if (currentUser.id === id) setCurrentUser(saved);
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

  if (isLoadingData) {
    return <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-zinc-400"><Loader2 size={28} className="animate-spin text-emerald-400" /></div>;
  }

  // Calculate overdue and today counts for badge alerts
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeTasks = tasks.filter(task => !task.statusCompleted);
  const completedTasks = tasks.filter(task => task.statusCompleted);
  const workflowStatuses = products.flatMap(product => product.statuses || []);
  const overdueCount = activeTasks.filter(t => t.dueDate < todayStr).length;
  const todayCount = activeTasks.filter(t => t.dueDate === todayStr).length;
  const canCreateProject = currentUser.role !== 'COLABORADOR';
  const canCreateClient = currentUser.role === 'ADMIN_PRINCIPAL' || currentUser.role === 'ADMIN';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
      {mutationError && <div className="fixed bottom-5 right-5 z-[120] max-w-sm rounded-lg border border-rose-500/30 bg-[#211216] px-3 py-2 text-xs text-rose-200 shadow-2xl">{mutationError}</div>}
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
          onOpenNewProject={canCreateProject ? () => setIsNewProjectModalOpen(true) : undefined}
          onOpenNewClient={canCreateClient ? () => setIsNewClientModalOpen(true) : undefined}
          overdueCount={overdueCount}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          notifications={notifications}
          onMarkAllNotificationsRead={() => {
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          }}
          operationalView={operationalView}
          onOperationalViewChange={setOperationalView}
        />

        {/* Dynamic Viewport Container */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0e] relative pb-20 md:pb-6">
          {currentView === 'DASHBOARD' && (
            <DashboardView
              currentUser={currentUser}
              operationalView={operationalView}
              tasks={activeTasks}
              completedTasks={completedTasks}
              projects={projects}
              projectStatuses={workflowStatuses}
              clients={clients}
              users={users}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onNavigate={(view) => setCurrentView(view)}
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
              onOpenNewProject={canCreateProject ? () => setIsNewProjectModalOpen(true) : undefined}
              onUpdateProject={handleInlineUpdateProject}
            />
          )}

          {currentView === 'MEU_TRABALHO' && (
            <MyWorkView
              currentUser={currentUser}
              tasks={activeTasks}
              completedTasks={completedTasks}
              projects={projects}
              clients={clients}
              users={users}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
            />
          )}

          {currentView === 'PROJETOS' && (
            <ProjectsView
              projects={projects}
              clients={clients}
              tasks={activeTasks}
              users={users}
              currentUser={currentUser}
              onSelectProject={handleNavigateProjectDetail}
              onOpenNewProject={canCreateProject ? () => setIsNewProjectModalOpen(true) : undefined}
              projectStatuses={workflowStatuses}
              products={products}
              onUpdateProject={handleInlineUpdateProject}
            />
          )}

          {currentView === 'PROJETO_DETALHE' && selectedProject && (
            <ProjectDetailView
              project={selectedProject}
              projects={projects}
              tasks={activeTasks}
              completedTasks={completedTasks}
              currentUser={currentUser}
              onBack={() => setCurrentView('PROJETOS')}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onOpenNewTask={() => handleOpenNewTaskModal({ projectId: selectedProject.id, clientId: selectedProject.clientId })}
              onOpenEditProject={currentUser.role !== 'COLABORADOR' ? () => setIsEditProjectModalOpen(true) : undefined}
              onSaveBriefing={handleSaveBriefing}
              onProjectRefresh={handleRefreshSelectedProject}
              projectStatuses={workflowStatuses}
              onUpdateProject={handleInlineUpdateProject}
            />
          )}

          {currentView === 'CLIENTES' && (
            <ClientsView
              clients={clients}
              projects={projects}
              tasks={activeTasks}
              onSelectClient={handleNavigateClientDetail}
              onOpenNewClient={canCreateClient ? () => setIsNewClientModalOpen(true) : undefined}
            />
          )}

          {currentView === 'CLIENTE_DETALHE' && selectedClient && (
            <ClientDetailView
              client={selectedClient}
              currentUser={currentUser}
              projectStatuses={workflowStatuses}
              projects={projects}
              tasks={activeTasks}
              completedTasks={completedTasks}
              onBack={() => setCurrentView('CLIENTES')}
              onSelectProject={handleNavigateProjectDetail}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
              onOpenNewTask={() => handleOpenNewTaskModal({ clientId: selectedClient.id })}
              onOpenNewProject={canCreateProject ? () => {
                setNewProjectClientId(selectedClient.id);
                setIsNewProjectModalOpen(true);
              } : undefined}
              onUpdateProject={handleInlineUpdateProject}
            />
          )}

          {currentView === 'EQUIPE' && (
            <TeamView
              users={users}
              tasks={activeTasks}
              completedTasks={completedTasks}
              projects={projects}
              currentUser={currentUser}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onUpdateTask={handleUpdateTask}
            />
          )}

          {currentView === 'RECORRENCIAS' && (
            <RecurrencesView
              routines={routines}
              tasks={tasks}
              onSelectTask={handleSelectTask}
              onUpdateRoutine={handleUpdateRoutine}
              onRemoveRoutine={handleRemoveRoutine}
            />
          )}

          {currentView === 'CALENDARIO' && (
            <CalendarView
              tasks={activeTasks}
              completedTasks={completedTasks}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onOpenNewTask={() => setIsNewTaskModalOpen(true)}
            />
          )}

          {currentView === 'PERFIL' && (
            <ProfileView currentUser={currentUser} onChangePassword={authService.changePassword} />
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
              {isAdministrator(currentUser.role) && <ProductManager onCatalogChanged={refreshProductCatalog} />}
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
                    {projects.filter(project => !isProjectCompleted(project)).length}
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
      {selectedTask && isTaskDrawerOpen && <TaskDrawer
        task={selectedTask}
        isOpen={isTaskDrawerOpen}
        onClose={() => { setRoutedTaskId(null); setIsTaskDrawerOpen(false); }}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        currentUser={currentUser}
        users={users}
        projects={projects}
      />}

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
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setNewProjectClientId(undefined);
        }}
        onAddProject={handleAddProject}
        clients={clients}
        users={users}
        currentUser={currentUser}
        defaultClientId={newProjectClientId}
        products={products}
      />

      {selectedProject && <EditProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        onSave={handleUpdateProject}
        project={selectedProject}
        clients={clients}
        users={users}
        currentUser={currentUser}
        products={products}
      />}

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
        tasks={activeTasks}
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
      <OperationalViewProvider>
        <MainLayout />
      </OperationalViewProvider>
    </AuthProvider>
  );
}
