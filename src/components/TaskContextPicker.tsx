import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, FolderKanban, Search } from 'lucide-react';
import { Project, Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { canManageTaskAssignments } from '../permissions';

interface TaskContextPickerProps {
  task: Task;
  projects: Project[];
  mode: 'CLIENT' | 'PROJECT';
  onChange?: (project: Project) => void;
}

function supportsAssignees(project: Project, task: Task): boolean {
  if (project.id !== task.projectId && (task.parentTaskId || task.subtasks.length > 0)) return false;
  const memberIds = new Set([project.managerId, ...(project.teamMemberDetails || []).map(member => member.id)]);
  return task.participantIds.every(id => memberIds.has(id));
}

export const TaskContextPicker: React.FC<TaskContextPickerProps> = ({ task, projects, mode, onChange }) => {
  const { user } = useAuth();
  const allowedOnChange = user && canManageTaskAssignments(user.role) ? onChange : undefined;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState(task.clientId);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setClientId(task.clientId), [task.clientId]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const clients = useMemo(() => Array.from(new Map(projects.map(project => [project.clientId, { id: project.clientId, name: project.clientName }])).values()), [projects]);
  const candidates = projects.filter(project => {
    if (mode === 'CLIENT' && project.clientId !== clientId) return false;
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return !term || `${project.name} ${project.clientName}`.toLocaleLowerCase('pt-BR').includes(term);
  });
  const Icon = mode === 'CLIENT' ? Building2 : FolderKanban;
  const label = mode === 'CLIENT' ? task.clientName : task.projectName;

  const choose = (project: Project) => {
    if (!allowedOnChange || !supportsAssignees(project, task) || project.id === task.projectId) return;
    allowedOnChange(project);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative" onClick={event => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => allowedOnChange && setOpen(previous => !previous)}
        className={`inline-flex max-w-[132px] items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${mode === 'CLIENT' ? 'border-zinc-700/60 bg-zinc-800/90 text-zinc-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400'} ${allowedOnChange ? 'hover:border-zinc-600 hover:text-white' : ''}`}
        title={`${mode === 'CLIENT' ? 'Cliente' : 'Projeto'}: ${label}`}
      >
        <Icon size={10} className="shrink-0 text-zinc-500" />
        <span className="truncate">{label}</span>
      </button>
      {open && allowedOnChange && (
        <div className="absolute left-0 top-7 z-[90] w-72 overflow-hidden rounded-xl border border-zinc-700 bg-[#18181b] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
            <Search size={12} className="text-zinc-500" />
            <input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar projeto ou cliente" className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600" />
          </div>
          {mode === 'CLIENT' && (
            <div className="flex max-h-24 gap-1 overflow-x-auto border-b border-zinc-800 p-2">
              {clients.map(client => <button key={client.id} type="button" onClick={() => setClientId(client.id)} className={`shrink-0 rounded-md px-2 py-1 text-[10px] ${client.id === clientId ? 'bg-sky-500/15 text-sky-300' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}>{client.name}</button>)}
            </div>
          )}
          <div className="max-h-64 overflow-y-auto p-1.5">
            {mode === 'CLIENT' && <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-zinc-600">Escolha o projeto no cliente</p>}
            {candidates.map(project => {
              const compatible = supportsAssignees(project, task);
              const selected = project.id === task.projectId;
              const hierarchyBlocked = project.id !== task.projectId && Boolean(task.parentTaskId || task.subtasks.length > 0);
              return <button key={project.id} type="button" disabled={!compatible} onClick={() => choose(project)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"><FolderKanban size={12} className="text-zinc-500" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{project.name}</span>{mode === 'PROJECT' && <span className="block truncate text-[9px] text-zinc-600">{project.clientName}</span>}{!compatible && <span className="block text-[9px] text-amber-500">{hierarchyBlocked ? 'Tarefa vinculada a subtarefas' : 'Responsáveis fora da equipe'}</span>}</span>{selected && <Check size={11} className="text-sky-400" />}</button>;
            })}
            {candidates.length === 0 && <p className="px-3 py-6 text-center text-xs text-zinc-600">Nenhum projeto acessível.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
