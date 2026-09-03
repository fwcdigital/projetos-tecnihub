import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Building2, Plus, Search } from 'lucide-react';
import { Client, Project, ProjectStatusDefinition, ProjectType, Task, User } from '../types';
import { PriorityPicker } from '../components/PriorityPicker';
import { StatusPicker } from '../components/StatusPicker';
import { ViewMode, ViewModeSwitcher } from '../components/ViewModeSwitcher';
import { AssigneePicker } from '../components/AssigneePicker';
import { DateRangePicker } from '../components/DateRangePicker';
import { InlineSelectPicker } from '../components/InlineSelectPicker';
import { canEditProjectDates, canManageProjectOperations, isAdministrator } from '../permissions';
import { getProjectStatusOptions } from '../components/visualTokens';

interface ProjectsViewProps {
  projects: Project[];
  clients: Client[];
  tasks: Task[];
  onSelectProject: (project: Project) => void;
  onOpenNewProject?: () => void;
  projectStatuses: ProjectStatusDefinition[];
  users: User[];
  currentUser: User;
  onUpdateProject: (project: Project, updates: Partial<Project>, teamUserIds?: string[]) => Promise<void>;
}

const projectTypeLabels: Record<ProjectType, string> = {
  SITE: 'Site institucional', LANDING_PAGE: 'Landing page', ECOMMERCE: 'E-commerce',
  GOOGLE_ADS: 'Google Ads', META_ADS: 'Meta Ads', SEO: 'SEO', SOCIAL_MEDIA: 'Social media',
  MANUTENCAO: 'Manutenção', INTERNO: 'Interno', OUTRO: 'Outro'
};

const projectTypeOptions = Object.entries(projectTypeLabels).map(([value, label]) => ({ value, label }));

export const ProjectsView: React.FC<ProjectsViewProps> = ({ projects, clients, tasks, onSelectProject, onOpenNewProject, projectStatuses, users, currentUser, onUpdateProject }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>(() => localStorage.getItem('tecnihub:projects-view') === 'TABLE' ? 'TABLE' : 'ROW');
  const canManage = canManageProjectOperations(currentUser.role);
  const canChangeManager = isAdministrator(currentUser.role);
  const canChangeDates = canEditProjectDates(currentUser.role);
  const activeUsers = users.filter(user => user.accountStatus !== 'INACTIVE');
  const managerOptions = activeUsers.filter(user => user.role !== 'COLABORADOR');
  const clientOptions = clients.map(client => ({ value: client.id, label: client.name }));

  useEffect(() => localStorage.setItem('tecnihub:projects-view', viewMode), [viewMode]);

  const filteredProjects = projects.filter(project => {
    const term = searchTerm.trim().toLocaleLowerCase('pt-BR');
    if (term && !`${project.name} ${project.clientName}`.toLocaleLowerCase('pt-BR').includes(term)) return false;
    if (selectedType !== 'ALL' && project.type !== selectedType) return false;
    if (selectedClient !== 'ALL' && project.clientId !== selectedClient) return false;
    if (selectedStatus !== 'ALL' && project.status !== selectedStatus) return false;
    return true;
  });

  const team = (project: Project) => (project.teamMemberDetails || []).filter(member => member.id !== project.managerId).map(member => ({ id: member.id, name: member.name, avatar: member.avatar, position: member.position }));
  const overdue = (project: Project) => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter(task => task.projectId === project.id && task.status !== 'CONCLUIDO' && task.dueDate < today).length;
  };
  const progress = (project: Project) => <div className="flex min-w-24 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${project.progress >= 80 ? 'bg-emerald-500' : project.progress >= 40 ? 'bg-sky-500' : 'bg-amber-500'}`} style={{ width: `${project.progress}%` }} /></div><span className="w-8 text-right font-mono text-[10px] font-bold text-zinc-300">{project.progress}%</span></div>;
  const statusControl = (project: Project) => {
    const options = getProjectStatusOptions(projectStatuses, { value: project.status, label: project.statusName, color: project.statusColor });
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
  const typeControl = (project: Project) => <InlineSelectPicker value={project.type} label={projectTypeLabels[project.type]} options={projectTypeOptions} onChange={canManage ? type => void onUpdateProject(project, { type: type as ProjectType }) : undefined} ariaLabel={`Alterar tipo de ${project.name}`} />;
  const dateControl = (project: Project) => <DateRangePicker startDate={project.startDate} dueDate={project.dueDate} title="Período do projeto" showTime={false} requireDueDate allowClearStart={false} onChange={canChangeDates ? range => void onUpdateProject(project, { startDate: range.startDate || project.startDate, dueDate: range.dueDate || project.dueDate }) : undefined} />;

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-3 sm:flex-row sm:items-end">
        <div><div className="flex items-center gap-2"><h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Projetos</h1><span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-xs font-bold text-zinc-300">{filteredProjects.length}</span></div><p className="mt-1 text-xs text-zinc-400">Progresso, prazos, responsáveis e equipe em uma visão operacional.</p></div>
        <div className="flex items-center gap-2"><ViewModeSwitcher value={viewMode} onChange={setViewMode} />{onOpenNewProject && <button type="button" onClick={onOpenNewProject} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-100"><Plus size={13} />Novo projeto</button>}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-[#121216] p-2.5 text-xs">
        <div className="relative min-w-[220px] flex-1"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar projeto ou cliente" className="w-full rounded-lg border border-zinc-700 bg-[#181820] py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500" /></div>
        <select value={selectedType} onChange={event => setSelectedType(event.target.value)} className="rounded-lg border border-zinc-700 bg-[#181820] px-2.5 py-1.5 text-zinc-200 outline-none [color-scheme:dark]"><option value="ALL">Todos os tipos</option>{Object.entries(projectTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={selectedClient} onChange={event => setSelectedClient(event.target.value)} className="rounded-lg border border-zinc-700 bg-[#181820] px-2.5 py-1.5 text-zinc-200 outline-none [color-scheme:dark]"><option value="ALL">Todos os clientes</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select>
        <select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value)} className="rounded-lg border border-zinc-700 bg-[#181820] px-2.5 py-1.5 text-zinc-200 outline-none [color-scheme:dark]"><option value="ALL">Todos os status</option>{projectStatuses.map(status => <option key={status.id} value={status.id}>{status.name}{status.active ? '' : ' (inativo)'}</option>)}</select>
      </div>

      {viewMode === 'ROW' ? (
        <div className="space-y-1.5">
          {filteredProjects.map(project => {
            const overdueCount = overdue(project);
            return <article key={project.id} className="grid items-center gap-x-3 gap-y-3 rounded-lg border border-zinc-800 bg-[#121216] px-3 py-2 transition-colors hover:border-zinc-700 hover:bg-[#16161c] md:grid-cols-2 xl:grid-cols-[minmax(190px,1.4fr)_minmax(125px,.85fr)_90px_90px_90px_120px_140px_110px_28px]">
              <div className="min-w-0"><button type="button" onClick={() => onSelectProject(project)} className="block max-w-full truncate text-left text-xs font-bold text-zinc-100 hover:text-sky-300">{project.name}</button><div className="mt-0.5 min-w-0">{clientControl(project)}</div></div>
              <div className="min-w-0">{managerControl(project)}</div>
              {teamControl(project)}
              {typeControl(project)}
              {priorityControl(project)}
              {statusControl(project)}
              {dateControl(project)}
              {progress(project)}
              <button type="button" onClick={() => onSelectProject(project)} className="relative rounded p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200" title="Abrir projeto">{overdueCount > 0 && <span className="absolute -left-5 top-2 flex items-center gap-0.5 text-[9px] text-rose-400"><AlertTriangle size={9} />{overdueCount}</span>}<ArrowRight size={13} /></button>
            </article>;
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#111115]"><table className="w-full min-w-[1180px] border-collapse text-left"><thead><tr className="border-b border-zinc-800 text-[9px] font-bold uppercase tracking-wider text-zinc-600"><th className="px-3 py-2">Projeto</th><th className="px-3 py-2">Cliente</th><th className="px-3 py-2">Responsável</th><th className="px-3 py-2">Equipe</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Prioridade</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Período</th><th className="px-3 py-2">Progresso</th></tr></thead><tbody className="divide-y divide-zinc-800">{filteredProjects.map(project => <tr key={project.id} className="text-[11px] text-zinc-400 hover:bg-zinc-900/60"><td className="px-3 py-2"><button type="button" onClick={() => onSelectProject(project)} className="max-w-52 truncate font-bold text-zinc-100 hover:text-sky-300">{project.name}</button></td><td className="px-3 py-2">{clientControl(project)}</td><td className="px-3 py-2">{managerControl(project)}</td><td className="px-3 py-2">{teamControl(project)}</td><td className="px-3 py-2">{typeControl(project)}</td><td className="px-3 py-2">{priorityControl(project)}</td><td className="px-3 py-2">{statusControl(project)}</td><td className="whitespace-nowrap px-3 py-2">{dateControl(project)}</td><td className="px-3 py-2">{progress(project)}</td></tr>)}</tbody></table></div>
      )}
      {filteredProjects.length === 0 && <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-10 text-center text-xs text-zinc-500">Nenhum projeto encontrado com os filtros selecionados.</div>}
    </div>
  );
};
