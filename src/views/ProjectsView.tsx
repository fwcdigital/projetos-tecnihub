import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Building2, Plus, Search } from 'lucide-react';
import { Client, ProductDefinition, ProductStatusDefinition, Project, Task, User } from '../types';
import { PriorityPicker } from '../components/PriorityPicker';
import { StatusPicker } from '../components/StatusPicker';
import { ViewMode, ViewModeSwitcher } from '../components/ViewModeSwitcher';
import { AssigneePicker } from '../components/AssigneePicker';
import { DateRangePicker } from '../components/DateRangePicker';
import { InlineSelectPicker } from '../components/InlineSelectPicker';
import { ProductPicker, ProductPickerOption } from '../components/ProductPicker';
import { canEditProjectDates, canManageProjectOperations, isAdministrator } from '../permissions';
import { getWorkflowStatusOptions } from '../components/visualTokens';
import { GroupHeader, GroupingSwitcher, groupProjects, usePersistentGrouping } from '../components/GroupingSwitcher';
import { ProjectLifecycleActions } from '../components/ProjectLifecycleActions';
import { isContainerNavigationClick, isContainerNavigationKey } from '../components/containerNavigation';

interface ProjectsViewProps {
  projects: Project[];
  clients: Client[];
  tasks: Task[];
  onSelectProject: (project: Project) => void;
  onOpenNewProject?: () => void;
  projectStatuses: ProductStatusDefinition[];
  products: ProductDefinition[];
  users: User[];
  currentUser: User;
  onUpdateProject: (project: Project, updates: Partial<Project>, teamUserIds?: string[]) => Promise<void>;
  onSetProjectStatus?: (project: Project, status: 'ACTIVE' | 'INACTIVE') => Promise<void>;
  onDeleteProject?: (project: Project, confirmationName: string) => Promise<void>;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, clients, tasks, onSelectProject, onOpenNewProject, projectStatuses, products, users, currentUser, onUpdateProject, onSetProjectStatus, onDeleteProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem('tecnihub:projects-view');
    return stored === 'TABLE' || stored === 'CARD' ? stored : 'ROW';
  });
  const [grouping, setGrouping] = usePersistentGrouping('tecnihub:grouping:projects', 'status');
  const canManage = canManageProjectOperations(currentUser.role);
  const canChangeManager = isAdministrator(currentUser.role);
  const canChangeDates = canEditProjectDates(currentUser.role);
  const activeUsers = users.filter(user => user.accountStatus !== 'INACTIVE');
  const managerOptions = activeUsers.filter(user => user.role !== 'COLABORADOR');
  const clientOptions = clients.map(client => ({ value: client.id, label: client.name }));
  const projectTypeOptions: ProductPickerOption[] = products.filter(product => product.active).map(product => ({ value: product.id, label: product.name, color: product.color }));
  const productFilters = Array.from(new Map([
    ...products.map(product => [product.id, product.name] as const),
    ...projects.map(project => [project.type, project.typeName || project.type] as const)
  ]));

  useEffect(() => localStorage.setItem('tecnihub:projects-view', viewMode), [viewMode]);

  const filteredProjects = projects.filter(project => {
    const term = searchTerm.trim().toLocaleLowerCase('pt-BR');
    if (term && !`${project.name} ${project.clientName}`.toLocaleLowerCase('pt-BR').includes(term)) return false;
    if (selectedType !== 'ALL' && project.type !== selectedType) return false;
    if (selectedClient !== 'ALL' && project.clientId !== selectedClient) return false;
    if (selectedStatus !== 'ALL' && project.status !== selectedStatus) return false;
    if (accountStatusFilter !== 'ALL' && (project.accountStatus || 'ACTIVE') !== accountStatusFilter) return false;
    return true;
  });
  const groupedProjects = useMemo(() => groupProjects(filteredProjects, grouping, projectStatuses), [filteredProjects, grouping, projectStatuses]);

  const team = (project: Project) => (project.teamMemberDetails || []).filter(member => member.id !== project.managerId).map(member => ({ id: member.id, name: member.name, avatar: member.avatar, position: member.position }));
  const overdue = (project: Project) => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter(task => task.projectId === project.id && !task.statusCompleted && task.dueDate < today).length;
  };
  const statusControl = (project: Project) => {
    const options = getWorkflowStatusOptions(project.workflowStatuses || [], { value: project.status, label: project.statusName, color: project.statusColor });
    return <StatusPicker value={project.status} options={options} onChange={canManage ? status => {
      const selected = options.find(option => option.value === status);
      void onUpdateProject(project, { status, statusName: selected?.label, statusColor: selected?.color });
    } : undefined} ariaLabel={`Alterar status de ${project.name}`} />;
  };
  const priorityControl = (project: Project) => <PriorityPicker value={project.priority} onChange={canManage ? priority => void onUpdateProject(project, { priority }) : undefined} />;
  const managerControl = (project: Project) => <AssigneePicker users={managerOptions} selectedIds={[project.managerId]} selectedAssignees={[{ id: project.managerId, name: project.managerName, avatar: project.managerAvatar || '', position: 'Responsável principal' }]} onChange={ids => {
    const manager = managerOptions.find(user => user.id === ids[0]);
    if (manager) void onUpdateProject(project, { managerId: manager.id, managerName: manager.name, managerAvatar: manager.avatar });
  }} disabled={!canChangeManager} label="" single displayMode="PERSON" />;
  const teamControl = (project: Project) => <AssigneePicker users={activeUsers.filter(user => user.id !== project.managerId)} selectedIds={team(project).map(member => member.id)} selectedAssignees={team(project)} onChange={teamUserIds => {
    const teamMemberDetails = activeUsers.filter(user => teamUserIds.includes(user.id)).map(user => ({ id: user.id, name: user.name, avatar: user.avatar, position: user.position, role: user.role }));
    void onUpdateProject(project, { teamMembers: teamMemberDetails.map(member => member.name), teamMemberDetails }, teamUserIds);
  }} disabled={!canManage} label="" />;
  const clientControl = (project: Project) => <InlineSelectPicker value={project.clientId} label={project.clientName} options={clientOptions} onChange={canManage ? clientId => {
    const client = clients.find(item => item.id === clientId);
    void onUpdateProject(project, { clientId, clientName: client?.name || project.clientName });
  } : undefined} icon={<Building2 size={10} className="shrink-0 text-zinc-600" />} ariaLabel={`Alterar cliente de ${project.name}`} />;
  const typeControl = (project: Project) => {
    const configuredProduct = products.find(product => product.id === project.type);
    const options = projectTypeOptions.some(option => option.value === project.type)
      ? projectTypeOptions
      : [{ value: project.type, label: project.typeName || project.type, color: configuredProduct?.color || project.typeColor }, ...projectTypeOptions];
    return <ProductPicker value={project.type} options={options} onChange={canManage ? type => {
      const product = products.find(item => item.id === type);
      const status = product?.statuses?.[0];
      if (status) void onUpdateProject(project, { type, status: status.id });
    } : undefined} ariaLabel={`Alterar tipo de ${project.name}`} />;
  };
  const dateControl = (project: Project) => <DateRangePicker startDate={project.startDate} dueDate={project.dueDate} title="Período do projeto" showTime={false} requireDueDate allowClearStart={false} onChange={canChangeDates ? range => void onUpdateProject(project, { startDate: range.startDate || project.startDate, dueDate: range.dueDate || project.dueDate }) : undefined} />;

  return (
    <div className="mx-auto max-w-[1800px] space-y-4 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-3 sm:flex-row sm:items-end">
        <div><div className="flex items-center gap-2"><h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Projetos</h1><span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-xs font-bold text-zinc-300">{filteredProjects.length}</span></div><p className="mt-1 text-xs text-zinc-400">Prazos, responsáveis e equipe em uma visão operacional.</p></div>
        <div className="flex flex-wrap items-center gap-2"><GroupingSwitcher value={grouping} onChange={setGrouping} /><ViewModeSwitcher value={viewMode} onChange={setViewMode} modes={['ROW', 'TABLE', 'CARD']} />{onOpenNewProject && <button type="button" onClick={onOpenNewProject} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-100"><Plus size={13} />Novo projeto</button>}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-[#121216] p-2.5 text-xs">
        <div className="relative min-w-[220px] flex-1"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar projeto ou cliente" className="w-full rounded-lg border border-zinc-700 bg-[#181820] py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500" /></div>
        <select value={selectedType} onChange={event => setSelectedType(event.target.value)} className="rounded-lg border border-zinc-700 bg-[#181820] px-2.5 py-1.5 text-zinc-200 outline-none [color-scheme:dark]"><option value="ALL">Todos os tipos</option>{productFilters.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <select value={selectedClient} onChange={event => setSelectedClient(event.target.value)} className="rounded-lg border border-zinc-700 bg-[#181820] px-2.5 py-1.5 text-zinc-200 outline-none [color-scheme:dark]"><option value="ALL">Todos os clientes</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
        <select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value)} className="rounded-lg border border-zinc-700 bg-[#181820] px-2.5 py-1.5 text-zinc-200 outline-none [color-scheme:dark]"><option value="ALL">Todos os status</option>{projectStatuses.map(status => <option key={status.id} value={status.id}>{status.name}{status.active ? '' : ' (inativo)'}</option>)}</select>
        <select value={accountStatusFilter} onChange={event => setAccountStatusFilter(event.target.value as 'ACTIVE' | 'INACTIVE' | 'ALL')} className="rounded-lg border border-zinc-700 bg-[#181820] px-2.5 py-1.5 text-zinc-200 outline-none [color-scheme:dark]"><option value="ACTIVE">Projetos ativos</option><option value="INACTIVE">Projetos arquivados</option><option value="ALL">Todos os projetos</option></select>
      </div>

      {viewMode === 'ROW' ? (
        <div className="space-y-5">
          {groupedProjects.map(group => <section key={group.key} className="space-y-1.5"><GroupHeader group={group} count={group.items.length} />{group.items.map(project => {
            const overdueCount = overdue(project);
            return <article key={project.id} role="link" tabIndex={0} aria-label={`Abrir projeto ${project.name}`} onClick={event => { if (isContainerNavigationClick(event)) onSelectProject(project); }} onKeyDown={event => { if (isContainerNavigationKey(event)) { event.preventDefault(); onSelectProject(project); } }} className={`grid cursor-pointer items-center gap-x-3 gap-y-3 rounded-lg border border-zinc-800 bg-[#121216] px-3 py-2 transition-colors hover:border-zinc-700 hover:bg-[#16161c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.65fr)_minmax(125px,.85fr)_minmax(130px,.9fr)_90px_120px_120px_140px_56px] ${project.accountStatus === 'INACTIVE' ? 'opacity-70' : ''}`}>
              <div className="flex min-w-0 items-center gap-2">{priorityControl(project)}<button type="button" onClick={() => onSelectProject(project)} className="block min-w-0 max-w-full truncate text-left text-xs font-bold text-zinc-100 hover:text-sky-300">{project.name}</button>{project.accountStatus === 'INACTIVE' && <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">Arquivado</span>}</div>
              <div className="min-w-0">{clientControl(project)}</div>
              <div className="min-w-0">{managerControl(project)}</div>
              {teamControl(project)}
              {typeControl(project)}
              {statusControl(project)}
              {dateControl(project)}
              <div className="flex items-center justify-end">{overdueCount > 0 && <span className="flex items-center gap-0.5 text-[9px] text-rose-400"><AlertTriangle size={9} />{overdueCount}</span>}{isAdministrator(currentUser.role) && onSetProjectStatus && onDeleteProject && <ProjectLifecycleActions project={project} onSetStatus={onSetProjectStatus} onDelete={onDeleteProject} />}<button type="button" onClick={() => onSelectProject(project)} className="rounded p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200" title="Abrir projeto"><ArrowRight size={13} /></button></div>
            </article>;
          })}</section>)}
        </div>
      ) : viewMode === 'TABLE' ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#111115]"><table className="w-full min-w-[1180px] border-collapse text-left"><thead><tr className="border-b border-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-600"><th className="px-3 py-2">Prioridade</th><th className="px-3 py-2">Projeto</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Responsável</th><th className="px-3 py-2">Equipe</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Período</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>{groupedProjects.map(group => <tbody key={group.key} className="divide-y divide-zinc-800"><tr><td colSpan={9} className="bg-zinc-950/60 px-3 py-2"><GroupHeader group={group} count={group.items.length} /></td></tr>{group.items.map(project => { const overdueCount = overdue(project); return <tr key={project.id} role="link" tabIndex={0} aria-label={`Abrir projeto ${project.name}`} onClick={event => { if (isContainerNavigationClick(event)) onSelectProject(project); }} onKeyDown={event => { if (isContainerNavigationKey(event)) { event.preventDefault(); onSelectProject(project); } }} className={`cursor-pointer text-[11px] text-zinc-400 hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/60 ${project.accountStatus === 'INACTIVE' ? 'opacity-70' : ''}`}><td className="px-3 py-2">{priorityControl(project)}</td><td className="px-3 py-2"><button type="button" onClick={() => onSelectProject(project)} className="max-w-52 truncate font-bold text-zinc-100 hover:text-sky-300">{project.name}</button>{project.accountStatus === 'INACTIVE' && <span className="ml-1.5 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">Arquivado</span>}</td><td className="px-3 py-2">{clientControl(project)}</td><td className="px-3 py-2">{managerControl(project)}</td><td className="px-3 py-2">{teamControl(project)}</td><td className="px-3 py-2">{typeControl(project)}</td><td className="px-3 py-2">{statusControl(project)}</td><td className="whitespace-nowrap px-3 py-2">{dateControl(project)}</td><td className="px-3 py-2"><div className="flex items-center justify-end">{overdueCount > 0 && <span className="flex items-center gap-0.5 text-[9px] text-rose-400"><AlertTriangle size={9} />{overdueCount}</span>}{isAdministrator(currentUser.role) && onSetProjectStatus && onDeleteProject && <ProjectLifecycleActions project={project} onSetStatus={onSetProjectStatus} onDelete={onDeleteProject} />}<button type="button" onClick={() => onSelectProject(project)} className="rounded p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200" title="Abrir projeto"><ArrowRight size={13} /></button></div></td></tr>; })}</tbody>)}</table></div>
      ) : (
        <div className="space-y-5">{groupedProjects.map(group => <section key={group.key} className="space-y-2"><GroupHeader group={group} count={group.items.length} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{group.items.map(project => <article key={project.id} role="link" tabIndex={0} aria-label={`Abrir projeto ${project.name}`} onClick={event => { if (isContainerNavigationClick(event)) onSelectProject(project); }} onKeyDown={event => { if (isContainerNavigationKey(event)) { event.preventDefault(); onSelectProject(project); } }} className={`cursor-pointer space-y-3 rounded-xl border border-zinc-800 bg-[#121216] p-4 transition-colors hover:border-zinc-700 hover:bg-[#16161c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${project.accountStatus === 'INACTIVE' ? 'opacity-70' : ''}`}><div className="flex min-w-0 items-start gap-2">{priorityControl(project)}<button type="button" onClick={() => onSelectProject(project)} className="min-w-0 flex-1 truncate text-left text-sm font-bold text-zinc-100 hover:text-sky-300">{project.name}</button>{project.accountStatus === 'INACTIVE' && <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400">Arquivado</span>}{isAdministrator(currentUser.role) && onSetProjectStatus && onDeleteProject && <ProjectLifecycleActions project={project} onSetStatus={onSetProjectStatus} onDelete={onDeleteProject} />}<button type="button" onClick={() => onSelectProject(project)} className="shrink-0 rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200" title="Abrir projeto"><ArrowRight size={13} /></button></div><div>{clientControl(project)}</div><div className="flex flex-wrap items-center gap-2">{typeControl(project)}{statusControl(project)}</div><div className="grid grid-cols-2 items-center gap-3 border-t border-zinc-800/80 pt-3"><div className="min-w-0">{managerControl(project)}</div><div>{teamControl(project)}</div></div><div>{dateControl(project)}</div></article>)}</div></section>)}</div>
      )}
      {filteredProjects.length === 0 && <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-10 text-center text-xs text-zinc-500">Nenhum projeto encontrado com os filtros selecionados.</div>}
    </div>
  );
};
