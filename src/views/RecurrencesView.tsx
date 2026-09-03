import React, { useState } from 'react';
import { Task, Project, Client, Subtask, RecurrenceFrequency, User } from '../types';
import { 
  Repeat, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Building2, 
  FolderKanban, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  Search, 
  Filter, 
  Layers, 
  ListTree, 
  User as UserIcon, 
  Trash2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  X
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { CompletedTasksSection } from '../components/CompletedTasksSection';
import { mockUsers } from '../data/mockData';

interface RecurrencesViewProps {
  tasks: Task[];
  completedTasks: Task[];
  projects: Project[];
  clients: Client[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  onUpdateTask?: (task: Task) => void;
  onOpenNewTask: () => void;
}

export const RecurrencesView: React.FC<RecurrencesViewProps> = ({
  tasks,
  completedTasks,
  projects,
  clients,
  onSelectTask,
  onToggleComplete,
  onUpdateTask,
  onOpenNewTask
}) => {
  const [selectedFrequency, setSelectedFrequency] = useState<string>('ALL');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'CONTAINERS' | 'MATRIX'>('CONTAINERS');
  
  // Modal for quick adding a recurring subtask to any task
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [targetTaskId, setTargetTaskId] = useState<string>(tasks[0]?.id || '');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskFrequency, setNewSubtaskFrequency] = useState<RecurrenceFrequency>('SEMANAL');
  const [newSubtaskRule, setNewSubtaskRule] = useState('Toda segunda-feira às 09:00');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('Caio Rocha');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('2026-09-01');
  const [newSubtaskDueTime, setNewSubtaskDueTime] = useState('10:00');

  // Inline quick add per task container
  const [inlineAddingTaskId, setInlineAddingTaskId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineFrequency, setInlineFrequency] = useState<RecurrenceFrequency>('SEMANAL');
  const [inlineRule, setInlineRule] = useState('Toda semana');

  // Extract all recurring subtasks across all tasks
  interface RecurringSubtaskItem {
    parentTask: Task;
    subtask: Subtask;
  }

  const allRecurringSubtaskItems: RecurringSubtaskItem[] = [];
  tasks.forEach(task => {
    task.subtasks.forEach(sub => {
      if (sub.isRecurring) {
        allRecurringSubtaskItems.push({
          parentTask: task,
          subtask: sub
        });
      }
    });
  });

  // Filter tasks that have recurring subtasks
  const tasksWithRecurringSubtasks = tasks.filter(task => 
    task.subtasks.some(s => s.isRecurring)
  );

  // Counters
  const totalRecurringSubtasks = allRecurringSubtaskItems.length;
  const weeklyCount = allRecurringSubtaskItems.filter(item => item.subtask.recurrenceFrequency === 'SEMANAL').length;
  const monthlyCount = allRecurringSubtaskItems.filter(item => item.subtask.recurrenceFrequency === 'MENSAL').length;
  const biweeklyCount = allRecurringSubtaskItems.filter(item => item.subtask.recurrenceFrequency === 'QUINZENAL').length;
  const dailyCount = allRecurringSubtaskItems.filter(item => item.subtask.recurrenceFrequency === 'DIARIO').length;

  // Filter matrix items
  const filteredSubtaskItems = allRecurringSubtaskItems.filter(item => {
    if (selectedFrequency !== 'ALL' && item.subtask.recurrenceFrequency !== selectedFrequency) return false;
    if (selectedClientId !== 'ALL' && item.parentTask.clientId !== selectedClientId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSub = item.subtask.title.toLowerCase().includes(q);
      const matchParent = item.parentTask.title.toLowerCase().includes(q);
      const matchClient = item.parentTask.clientName.toLowerCase().includes(q);
      const matchRule = (item.subtask.recurrenceRule || '').toLowerCase().includes(q);
      if (!matchSub && !matchParent && !matchClient && !matchRule) return false;
    }
    return true;
  });

  // Filter tasks for container view
  const filteredTasksForContainers = tasksWithRecurringSubtasks.filter(task => {
    if (selectedClientId !== 'ALL' && task.clientId !== selectedClientId) return false;
    const recurringSubs = task.subtasks.filter(s => s.isRecurring);
    if (selectedFrequency !== 'ALL' && !recurringSubs.some(s => s.recurrenceFrequency === selectedFrequency)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchParent = task.title.toLowerCase().includes(q);
      const matchClient = task.clientName.toLowerCase().includes(q);
      const matchSub = recurringSubs.some(s => s.title.toLowerCase().includes(q) || (s.recurrenceRule || '').toLowerCase().includes(q));
      if (!matchParent && !matchClient && !matchSub) return false;
    }
    return true;
  });

  // Toggle Subtask Completion Handler
  const handleToggleSubtask = (parentTask: Task, subtaskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!onUpdateTask) return;

    const updatedSubtasks = parentTask.subtasks.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );

    onUpdateTask({
      ...parentTask,
      subtasks: updatedSubtasks
    });
  };

  // Submit Quick Add Recurring Subtask
  const handleSaveQuickSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !onUpdateTask) return;

    const parent = tasks.find(t => t.id === targetTaskId);
    if (!parent) return;

    const newSub: Subtask = {
      id: `sub-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
      isRecurring: true,
      recurrenceFrequency: newSubtaskFrequency,
      recurrenceRule: newSubtaskRule.trim() || 'Recorrente',
      assigneeName: newSubtaskAssignee,
      dueDate: newSubtaskDueDate,
      dueTime: newSubtaskDueTime,
      checklist: []
    };

    onUpdateTask({
      ...parent,
      isRecurring: true,
      subtasks: [...parent.subtasks, newSub]
    });

    setNewSubtaskTitle('');
    setIsQuickAddModalOpen(false);
  };

  // Submit Inline Quick Subtask
  const handleSaveInlineSubtask = (parentTask: Task, e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTitle.trim() || !onUpdateTask) return;

    const newSub: Subtask = {
      id: `sub-${Date.now()}`,
      title: inlineTitle.trim(),
      completed: false,
      isRecurring: true,
      recurrenceFrequency: inlineFrequency,
      recurrenceRule: inlineRule.trim() || 'Recorrente',
      assigneeName: parentTask.assigneeName,
      dueDate: parentTask.dueDate,
      dueTime: parentTask.dueTime,
      checklist: []
    };

    onUpdateTask({
      ...parentTask,
      isRecurring: true,
      subtasks: [...parentTask.subtasks, newSub]
    });

    setInlineTitle('');
    setInlineAddingTaskId(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Repeat size={22} className="text-emerald-400" />
              Rotinas & Subtarefas Recorrentes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
              {totalRecurringSubtasks} rotinas ativas
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Visualização centralizada de todas as rotinas e subtarefas operacionais com repetição automática (Google Ads, Meta Ads, SEO, Manutenções e Relatórios).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setIsQuickAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>+ Nova Subtarefa Recorrente</span>
          </button>
        </div>
      </div>

      {/* Recurrence Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Semanais (Ads & Reviews)</span>
          <p className="text-2xl font-black text-white font-mono">{weeklyCount}</p>
          <span className="text-[10px] text-zinc-400">Negativações, lances e cópias</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Mensais (Relatórios & ROI)</span>
          <p className="text-2xl font-black text-white font-mono">{monthlyCount}</p>
          <span className="text-[10px] text-zinc-400">Looker Studio e alinhamentos</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Quinzenais (Manutenção)</span>
          <p className="text-2xl font-black text-white font-mono">{biweeklyCount}</p>
          <span className="text-[10px] text-zinc-400">Backups de BD, plugins e criativos</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Diárias (Monitoramento)</span>
          <p className="text-2xl font-black text-white font-mono">{dailyCount}</p>
          <span className="text-[10px] text-zinc-400">Checagem de saldo e orçamentos</span>
        </div>
      </div>

      {/* Filter and View Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#131318] border border-zinc-800">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Frequency Filters */}
          <div className="flex items-center gap-1 bg-[#181820] p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setSelectedFrequency('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedFrequency === 'ALL' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todas ({totalRecurringSubtasks})
            </button>
            <button
              onClick={() => setSelectedFrequency('SEMANAL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedFrequency === 'SEMANAL' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Semanais ({weeklyCount})
            </button>
            <button
              onClick={() => setSelectedFrequency('MENSAL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedFrequency === 'MENSAL' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mensais ({monthlyCount})
            </button>
            <button
              onClick={() => setSelectedFrequency('QUINZENAL')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedFrequency === 'QUINZENAL' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Quinzenais ({biweeklyCount})
            </button>
            <button
              onClick={() => setSelectedFrequency('DIARIO')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                selectedFrequency === 'DIARIO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Diárias ({dailyCount})
            </button>
          </div>

          {/* Client Filter Dropdown */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="bg-[#181820] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-zinc-700"
          >
            <option value="ALL">Todos os Clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar rotina..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#181820] p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode('CONTAINERS')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'CONTAINERS' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualizar por Tarefa Principal (Containers)"
            >
              <Layers size={13} />
              <span className="hidden md:inline">Por Tarefa</span>
            </button>
            <button
              onClick={() => setViewMode('MATRIX')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'MATRIX' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualizar Matriz Geral de Subtarefas"
            >
              <ListTree size={13} />
              <span className="hidden md:inline">Tabela Geral</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: CONTAINERS (GROUPED BY PARENT TASK) */}
      {viewMode === 'CONTAINERS' && (
        <div className="space-y-4">
          {filteredTasksForContainers.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#121216] border border-dashed border-zinc-800 space-y-3">
              <Repeat size={32} className="mx-auto text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-300">Nenhuma tarefa com subtarefa recorrente encontrada</p>
              <p className="text-xs text-zinc-500 max-w-md mx-auto">
                Crie ou abra uma tarefa existente e configure a recorrência diretamente na aba de subtarefas.
              </p>
              <button
                onClick={() => setIsQuickAddModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors"
              >
                + Configurar Primeira Subtarefa Recorrente
              </button>
            </div>
          ) : (
            filteredTasksForContainers.map(parentTask => {
              const recurringSubs = parentTask.subtasks.filter(s => s.isRecurring);
              const completedSubs = recurringSubs.filter(s => s.completed).length;

              return (
                <div
                  key={parentTask.id}
                  className="p-4 rounded-2xl bg-[#131319] border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3.5 shadow-sm"
                >
                  {/* Parent Task Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-800/60">
                    <div className="flex items-start sm:items-center gap-3">
                      <button
                        onClick={(e) => onToggleComplete(parentTask.id, e)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 mt-0.5 sm:mt-0 ${
                          parentTask.status === 'CONCLUIDO'
                            ? 'bg-emerald-500 border-emerald-500 text-black'
                            : 'border-zinc-600 hover:border-emerald-400 bg-zinc-900'
                        }`}
                      >
                        {parentTask.status === 'CONCLUIDO' && <Check size={13} strokeWidth={3} />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => onSelectTask(parentTask)}
                            className="font-bold text-sm text-zinc-100 hover:text-emerald-400 text-left transition-colors flex items-center gap-1.5 group"
                          >
                            <span>{parentTask.title}</span>
                            <ExternalLink size={12} className="text-zinc-500 group-hover:text-emerald-400" />
                          </button>

                          <span className="px-2 py-0.5 rounded bg-zinc-800/90 text-zinc-300 text-[10px] font-medium flex items-center gap-1">
                            <Building2 size={11} className="text-zinc-500" />
                            {parentTask.clientName}
                          </span>

                          <span className="px-2 py-0.5 rounded bg-zinc-800/90 text-zinc-400 text-[10px] font-medium flex items-center gap-1">
                            <FolderKanban size={11} className="text-zinc-500" />
                            {parentTask.projectName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                      <StatusBadge status={parentTask.status} />
                      <PriorityBadge priority={parentTask.priority} />
                      <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md">
                        {completedSubs}/{recurringSubs.length} rotinas concluídas
                      </span>
                    </div>
                  </div>

                  {/* Recurring Subtasks Nested List */}
                  <div className="space-y-2.5 pl-0 sm:pl-7">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Repeat size={12} className="text-emerald-400" />
                      <span>Subtarefas com Recorrência neste Escopo:</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {recurringSubs.map(sub => (
                        <div
                          key={sub.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 rounded-xl bg-[#171722] border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Checkbox for current routine cycle */}
                            <button
                              onClick={(e) => handleToggleSubtask(parentTask, sub.id, e)}
                              className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                                sub.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-black'
                                  : 'border-zinc-600 bg-zinc-900 hover:border-emerald-400'
                              }`}
                            >
                              {sub.completed && <Check size={11} strokeWidth={3} />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold leading-snug break-words ${sub.completed ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                                {sub.title}
                              </p>

                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                  <Repeat size={10} className="flex-shrink-0" />
                                  <span>{sub.recurrenceFrequency}: {sub.recurrenceRule || 'Recorrente'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2.5 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60 pl-6 sm:pl-0 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              {sub.assigneeName && (
                                <span className="text-[11px] text-zinc-300 flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/50">
                                  <UserIcon size={11} className="text-zinc-500" />
                                  {sub.assigneeName}
                                </span>
                              )}

                              {sub.dueDate && (
                                <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1 bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-800">
                                  <Calendar size={11} className="text-zinc-500" />
                                  {sub.dueDate.split('-').reverse().join('/')}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => onSelectTask(parentTask)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-auto sm:ml-0"
                              title="Abrir tarefa e editar subtarefa"
                            >
                              <ChevronRight size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Inline Quick Add form for this parent task */}
                    {inlineAddingTaskId === parentTask.id ? (
                      <form onSubmit={(e) => handleSaveInlineSubtask(parentTask, e)} className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-700 space-y-2 mt-2 animate-in fade-in-50">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Nome da subtarefa recorrente..."
                            value={inlineTitle}
                            onChange={(e) => setInlineTitle(e.target.value)}
                            autoFocus
                            className="flex-1 bg-[#121216] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                          />
                          <select
                            value={inlineFrequency}
                            onChange={(e) => setInlineFrequency(e.target.value as RecurrenceFrequency)}
                            className="bg-[#121216] border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200"
                          >
                            <option value="DIARIO">Diário</option>
                            <option value="SEMANAL">Semanal</option>
                            <option value="QUINZENAL">Quinzenal</option>
                            <option value="MENSAL">Mensal</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Regra (ex: Toda terça)"
                            value={inlineRule}
                            onChange={(e) => setInlineRule(e.target.value)}
                            className="bg-[#121216] border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 max-w-[140px]"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setInlineAddingTaskId(null)}
                            className="px-2 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:text-zinc-200"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setInlineAddingTaskId(parentTask.id);
                          setInlineTitle('');
                          setInlineFrequency('SEMANAL');
                          setInlineRule('Toda semana');
                        }}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-2 transition-colors py-1"
                      >
                        <Plus size={13} />
                        <span>+ Adicionar rotina recorrente nesta tarefa</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: MATRIX TABLE (ALL SUBTASKS IN ONE LIST) */}
      {viewMode === 'MATRIX' && (
        <div className="rounded-2xl bg-[#131319] border border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181822] text-zinc-400 border-b border-zinc-800 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-10">Status</th>
                  <th className="py-3 px-4">Subtarefa / Rotina</th>
                  <th className="py-3 px-4">Frequência & Regra</th>
                  <th className="py-3 px-4">Tarefa Principal</th>
                  <th className="py-3 px-4">Cliente / Projeto</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredSubtaskItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 italic">
                      Nenhuma rotina encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredSubtaskItems.map(({ parentTask, subtask }) => (
                    <tr 
                      key={`${parentTask.id}-${subtask.id}`}
                      className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                      onClick={() => onSelectTask(parentTask)}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleSubtask(parentTask, subtask.id, e)}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            subtask.completed
                              ? 'bg-emerald-500 border-emerald-500 text-black'
                              : 'border-zinc-600 bg-zinc-900 hover:border-emerald-400'
                          }`}
                        >
                          {subtask.completed && <Check size={11} strokeWidth={3} />}
                        </button>
                      </td>

                      {/* Subtask Title */}
                      <td className="py-3 px-4 font-semibold text-zinc-200">
                        <span className={subtask.completed ? 'line-through text-zinc-500' : 'text-zinc-100'}>
                          {subtask.title}
                        </span>
                      </td>

                      {/* Frequency Badge */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <Repeat size={10} />
                          {subtask.recurrenceFrequency}: {subtask.recurrenceRule || 'Recorrente'}
                        </span>
                      </td>

                      {/* Parent Task Title */}
                      <td className="py-3 px-4 text-zinc-300 font-medium max-w-[200px] truncate">
                        {parentTask.title}
                      </td>

                      {/* Client / Project */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                          <Building2 size={12} className="text-zinc-500" />
                          <span className="text-zinc-300 font-medium">{parentTask.clientName}</span>
                          <span>•</span>
                          <span className="truncate max-w-[100px]">{parentTask.projectName}</span>
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-zinc-300">
                          <UserIcon size={12} className="text-zinc-500" />
                          {subtask.assigneeName || parentTask.assigneeName}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectTask(parentTask)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition-colors"
                        >
                          Ver Tarefa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK ADD MODAL: ATTACH RECURRING SUBTASK TO PARENT TASK */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#14141a] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#181822]">
              <div className="flex items-center gap-2">
                <Repeat size={16} className="text-emerald-400" />
                <h3 className="font-bold text-sm text-zinc-100">Criar Nova Subtarefa Recorrente</h3>
              </div>
              <button
                onClick={() => setIsQuickAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickSubtask} className="p-5 space-y-4 text-xs">
              {/* Target Parent Task Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Tarefa Principal (Container da Recorrência) *
                </label>
                <select
                  value={targetTaskId}
                  onChange={(e) => setTargetTaskId(e.target.value)}
                  required
                  className="w-full bg-[#181822] border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.clientName}] {t.title}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  A recorrência será vinculada dentro do escopo desta tarefa mãe.
                </span>
              </div>

              {/* Subtask Title */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Nome da Subtarefa / Rotina *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Exportar relatório de termos Google Ads, Backup MySQL..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="w-full bg-[#181822] border border-zinc-700 rounded-xl p-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Frequency & Rule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Frequência
                  </label>
                  <select
                    value={newSubtaskFrequency}
                    onChange={(e) => {
                      const freq = e.target.value as RecurrenceFrequency;
                      setNewSubtaskFrequency(freq);
                      if (freq === 'DIARIO') setNewSubtaskRule('Diariamente às 09:00');
                      if (freq === 'SEMANAL') setNewSubtaskRule('Toda segunda-feira');
                      if (freq === 'QUINZENAL') setNewSubtaskRule('A cada 15 dias');
                      if (freq === 'MENSAL') setNewSubtaskRule('Todo dia 01 do mês');
                    }}
                    className="w-full bg-[#181822] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="DIARIO">Diário</option>
                    <option value="SEMANAL">Semanal</option>
                    <option value="QUINZENAL">Quinzenal</option>
                    <option value="MENSAL">Mensal</option>
                    <option value="PERSONALIZADO">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Regra / Agendamento
                  </label>
                  <input
                    type="text"
                    value={newSubtaskRule}
                    onChange={(e) => setNewSubtaskRule(e.target.value)}
                    placeholder="Ex: Toda terça-feira às 10:00"
                    className="w-full bg-[#181822] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Assignee & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Responsável
                  </label>
                  <select
                    value={newSubtaskAssignee}
                    onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                    className="w-full bg-[#181822] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    {mockUsers.map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Próxima Data
                  </label>
                  <input
                    type="date"
                    value={newSubtaskDueDate}
                    onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                    className="w-full bg-[#181822] border border-zinc-700 rounded-xl p-1.5 text-zinc-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    Horário Previsto
                  </label>
                  <input
                    type="time"
                    value={newSubtaskDueTime}
                    onChange={(e) => setNewSubtaskDueTime(e.target.value)}
                    className="w-full bg-[#181822] border border-zinc-700 rounded-xl p-1.5 text-zinc-200"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsQuickAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-sm"
                >
                  Criar Rotina na Subtarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <CompletedTasksSection
        tasks={completedTasks.filter(task => task.isRecurring)}
        onSelectTask={onSelectTask}
        onToggleComplete={onToggleComplete}
        contextKey="recurrences"
      />
    </div>
  );
};
