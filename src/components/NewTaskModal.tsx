import React, { useState } from 'react';
import { Client, Priority, Project, RecurrenceFrequency, Task, TaskStatus, User } from '../types';
import { X, Check, Plus, Calendar, Clock, Repeat, AlertCircle, Building2, FolderKanban, Trash2 } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (newTask: Task) => void;
  clients: Client[];
  projects: Project[];
  users: User[];
  currentUser: User;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  clients,
  projects,
  users,
  currentUser
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [assigneeId, setAssigneeId] = useState(currentUser.id);
  const [priority, setPriority] = useState<Priority>('ALTA');
  const [status, setStatus] = useState<TaskStatus>('A_FAZER');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [dueDate, setDueDate] = useState('2026-09-01');
  const [dueTime, setDueTime] = useState('14:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('SEMANAL');
  const [recurrenceRule, setRecurrenceRule] = useState('Toda semana');
  const [description, setDescription] = useState('');
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [subtaskItems, setSubtaskItems] = useState<Array<{
    title: string;
    isRecurring: boolean;
    frequency?: RecurrenceFrequency;
    rule?: string;
  }>>([]);
  const [currentChecklistInput, setCurrentChecklistInput] = useState('');
  const [currentSubtaskInput, setCurrentSubtaskInput] = useState('');
  const [newSubtaskIsRecurring, setNewSubtaskIsRecurring] = useState(false);
  const [newSubtaskFrequency, setNewSubtaskFrequency] = useState<RecurrenceFrequency>('SEMANAL');
  const [newSubtaskRule, setNewSubtaskRule] = useState('Toda segunda-feira');

  // Filter projects by selected client if applicable
  const clientProjects = projects.filter(p => p.clientId === clientId);
  const selectedClient = clients.find(c => c.id === clientId);
  const selectedProject = projects.find(p => p.id === projectId) || projects[0];
  const selectedAssignee = users.find(u => u.id === assigneeId) || currentUser;

  const handleAddChecklist = () => {
    if (currentChecklistInput.trim()) {
      setChecklistItems([...checklistItems, currentChecklistInput.trim()]);
      setCurrentChecklistInput('');
    }
  };

  const handleAddSubtask = () => {
    if (currentSubtaskInput.trim()) {
      setSubtaskItems([
        ...subtaskItems, 
        {
          title: currentSubtaskInput.trim(),
          isRecurring: newSubtaskIsRecurring,
          frequency: newSubtaskIsRecurring ? newSubtaskFrequency : undefined,
          rule: newSubtaskIsRecurring ? newSubtaskRule : undefined
        }
      ]);
      setCurrentSubtaskInput('');
      setNewSubtaskIsRecurring(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const hasRecurringSubtasks = subtaskItems.some(s => s.isRecurring);

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      clientId: selectedClient?.id || 'cli-1',
      clientName: selectedClient?.name || 'Cliente',
      projectId: selectedProject?.id || 'proj-1',
      projectName: selectedProject?.name || 'Projeto',
      assigneeId: selectedAssignee.id,
      assigneeName: selectedAssignee.name,
      assigneeAvatar: selectedAssignee.avatar,
      participantIds: [selectedAssignee.id],
      priority,
      status,
      startDate,
      dueDate,
      dueTime,
      isRecurring: isRecurring || hasRecurringSubtasks,
      recurrenceFrequency: isRecurring ? recurrenceFrequency : undefined,
      recurrenceRule: isRecurring ? recurrenceRule : undefined,
      description,
      subtasks: subtaskItems.map((s, idx) => ({
        id: `sub-${idx}-${Date.now()}`,
        title: s.title,
        completed: false,
        isRecurring: s.isRecurring,
        recurrenceFrequency: s.frequency,
        recurrenceRule: s.rule,
        assigneeName: selectedAssignee.name,
        dueDate: dueDate,
        dueTime: dueTime
      })),
      checklist: checklistItems.map((c, idx) => ({
        id: `chk-${idx}-${Date.now()}`,
        title: c,
        completed: false
      })),
      comments: [],
      attachments: [],
      history: [
        { id: `h-${Date.now()}`, user: currentUser.name, action: 'Criou a tarefa', timestamp: 'Agora' }
      ],
      createdBy: currentUser.name,
      createdAt: '2026-09-01',
    };

    onAddTask(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#121216] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#15151a]">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Criar Nova Tarefa / Demanda
            </h2>
            <p className="text-[11px] text-zinc-400">Preencha os detalhes da atividade operacional</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Nome da Tarefa *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Criar campanha Performance Max ou Finalizar Home"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2.5 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Client and Project row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                <Building2 size={12} className="text-zinc-500" />
                Cliente *
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  const firstProj = projects.find(p => p.clientId === e.target.value);
                  if (firstProj) setProjectId(firstProj.id);
                }}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                <FolderKanban size={12} className="text-zinc-500" />
                Projeto *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {(clientProjects.length > 0 ? clientProjects : projects).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee, Priority, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Responsável
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.position})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="URGENTE">Urgente</option>
                <option value="ALTA">Alta</option>
                <option value="NORMAL">Normal</option>
                <option value="BAIXA">Baixa</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Status Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="A_FAZER">A Fazer</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="AGUARDANDO_CLIENTE">Aguardando Cliente</option>
                <option value="EM_REVISAO">Em Revisão</option>
                <option value="BACKLOG">Backlog</option>
              </select>
            </div>
          </div>

          {/* Dates & Recurrence */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1 flex items-center gap-1">
                <Calendar size={11} /> Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#141419] border border-zinc-700 rounded-lg p-1.5 text-zinc-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1 flex items-center gap-1">
                <Calendar size={11} /> Prazo Final *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#141419] border border-zinc-700 rounded-lg p-1.5 text-zinc-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-zinc-400 mb-1 flex items-center gap-1">
                <Clock size={11} /> Horário Previsto
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full bg-[#141419] border border-zinc-700 rounded-lg p-1.5 text-zinc-200 text-xs"
              />
            </div>

            {/* Recurrence Switch */}
            <div className="sm:col-span-3 pt-2 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-800 border-zinc-700"
                />
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                  <Repeat size={12} className="text-emerald-400" />
                  Tarefa Recorrente (Serviço Contínuo)
                </span>
              </label>

              {isRecurring && (
                <div className="flex items-center gap-2">
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                    className="bg-[#141419] border border-zinc-700 rounded-lg p-1 text-zinc-200 text-xs"
                  >
                    <option value="DIARIO">Diariamente</option>
                    <option value="SEMANAL">Semanalmente</option>
                    <option value="QUINZENAL">Quinzenalmente</option>
                    <option value="MENSAL">Mensalmente</option>
                    <option value="PERSONALIZADO">Personalizado</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Regra (ex: Toda segunda)"
                    value={recurrenceRule}
                    onChange={(e) => setRecurrenceRule(e.target.value)}
                    className="bg-[#141419] border border-zinc-700 rounded-lg p-1 text-zinc-200 text-xs max-w-[140px]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Descrição e Instruções
            </label>
            <textarea
              rows={2}
              placeholder="Descreva detalhes, objetivos e links importantes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#181820] border border-zinc-700 rounded-xl p-2 text-zinc-200 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>

          {/* Subtasks with Recurrence Option */}
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Repeat size={12} className="text-emerald-400" />
                Subtarefas & Rotinas Iniciais
              </span>
              <span className="text-[10px] text-zinc-500">{subtaskItems.length} adicionadas</span>
            </div>

            {subtaskItems.map((sub, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-zinc-300 bg-zinc-800/60 px-2.5 py-1.5 rounded-lg border border-zinc-700/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{sub.title}</span>
                  {sub.isRecurring && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      <Repeat size={10} />
                      {sub.frequency}: {sub.rule}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSubtaskItems(subtaskItems.filter((_, i) => i !== idx))}
                  className="text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="+ Adicionar subtarefa (ex: Checagem de saldos, Backup semanal)..."
                  value={currentSubtaskInput}
                  onChange={(e) => setCurrentSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  className="flex-1 bg-[#141419] border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  + Subtarefa
                </button>
              </div>

              {/* Subtask recurrence toggle */}
              <div className="flex items-center gap-3 text-[11px] text-zinc-400 bg-[#141419]/80 p-2 rounded-lg border border-zinc-800">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSubtaskIsRecurring}
                    onChange={(e) => setNewSubtaskIsRecurring(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-800 border-zinc-700"
                  />
                  <span className="text-zinc-300 font-medium">Rotina Recorrente nesta subtarefa</span>
                </label>

                {newSubtaskIsRecurring && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <select
                      value={newSubtaskFrequency}
                      onChange={(e) => {
                        const freq = e.target.value as RecurrenceFrequency;
                        setNewSubtaskFrequency(freq);
                        if (freq === 'DIARIO') setNewSubtaskRule('Diariamente às 09:00');
                        if (freq === 'SEMANAL') setNewSubtaskRule('Toda segunda-feira');
                        if (freq === 'QUINZENAL') setNewSubtaskRule('A cada 15 dias');
                        if (freq === 'MENSAL') setNewSubtaskRule('Todo dia 01');
                      }}
                      className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-[11px]"
                    >
                      <option value="DIARIO">Diário</option>
                      <option value="SEMANAL">Semanal</option>
                      <option value="QUINZENAL">Quinzenal</option>
                      <option value="MENSAL">Mensal</option>
                    </select>
                    <input
                      type="text"
                      value={newSubtaskRule}
                      onChange={(e) => setNewSubtaskRule(e.target.value)}
                      placeholder="Regra"
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-zinc-200 text-[11px] flex-1 max-w-[150px]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Checklist Quick Add */}
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
              Checklist Inicial
            </span>
            {checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-zinc-300 bg-zinc-800/60 px-2 py-1 rounded">
                <span>☑ {item}</span>
                <button
                  type="button"
                  onClick={() => setChecklistItems(checklistItems.filter((_, i) => i !== idx))}
                  className="text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="+ Adicionar item de verificação..."
                value={currentChecklistInput}
                onChange={(e) => setCurrentChecklistInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklist();
                  }
                }}
                className="flex-1 bg-[#141419] border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200"
              />
              <button
                type="button"
                onClick={handleAddChecklist}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs"
              >
                + Item
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-[#15151a] flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 font-bold shadow-sm"
          >
            Salvar Tarefa
          </button>
        </div>
      </div>
    </div>
  );
};
