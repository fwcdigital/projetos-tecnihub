import React, { useEffect, useState } from 'react';
import { Task, User } from '../types';
import { Plus, Pencil } from 'lucide-react';
import { TaskRow } from '../components/TaskRow';
import { UserAvatar } from '../components/UserAvatar';
import { UserManagementModal } from '../components/UserManagementModal';

interface TeamViewProps {
  users: User[];
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  currentUser: User;
  onCreateUser: (data: any) => Promise<void>;
  onUpdateUser: (id: string, data: any) => Promise<void>;
}

export const TeamView: React.FC<TeamViewProps> = ({
  users,
  tasks,
  onSelectTask,
  onToggleComplete,
  currentUser,
  onCreateUser,
  onUpdateUser
}) => {
  const [selectedUser, setSelectedUser] = useState<User>(users[0] || currentUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null | undefined>(undefined);
  const canManageUsers = currentUser.role === 'ADMIN_PRINCIPAL' || currentUser.role === 'ADMIN';
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const refreshed = users.find(user => user.id === selectedUser.id);
    if (refreshed && refreshed !== selectedUser) setSelectedUser(refreshed);
  }, [selectedUser, users]);

  const userTasks = tasks.filter(t => t.assigneeId === selectedUser.id);
  const overdueCount = userTasks.filter(t => t.dueDate < today && t.status !== 'CONCLUIDO').length;
  const todayCount = userTasks.filter(t => t.dueDate === today && t.status !== 'CONCLUIDO').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Equipe da Agência & Carga de Trabalho
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-700">
              {users.length} membros
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Acompanhe a distribuição de demandas operacionais e disponibilidade de cada colaborador.
          </p>
        </div>
        {canManageUsers && <button onClick={() => setEditingUser(null)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-zinc-950 text-xs font-bold"><Plus size={14} />Novo usuário</button>}
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {users.map(user => {
          const isSelected = selectedUser.id === user.id;
          const userTaskTotal = tasks.filter(t => t.assigneeId === user.id && t.status !== 'CONCLUIDO').length;

          return (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-zinc-800/90 border-emerald-500/60 shadow-lg shadow-emerald-950/20' 
                  : 'bg-[#121216] border-zinc-800 hover:border-zinc-700 hover:bg-[#16161c]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <UserAvatar name={user.name} src={user.avatar} className="w-10 h-10" />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${
                    user.status === 'ONLINE' ? 'bg-emerald-400' : user.status === 'FOCO' ? 'bg-purple-400' : 'bg-amber-400'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs font-bold text-zinc-100 truncate">{user.name}</h2>
                  <p className="text-[10px] text-zinc-400 truncate">{user.roleTitle}</p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Demandas ativas:</span>
                <span className="font-mono font-bold text-zinc-200">{userTaskTotal}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Member Details & Assigned Tasks */}
      <div className="space-y-4 pt-2">
        <div className="p-4 rounded-2xl bg-[#121216] border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserAvatar name={selectedUser.name} src={selectedUser.avatar} className="w-12 h-12" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{selectedUser.name}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {selectedUser.position}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{selectedUser.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {canManageUsers && (currentUser.role === 'ADMIN_PRINCIPAL' || selectedUser.role !== 'ADMIN_PRINCIPAL') && <button onClick={() => setEditingUser(selectedUser)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200"><Pencil size={12} />Editar</button>}
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block">Total Atribuídas</span>
              <strong className="text-white font-mono">{userTasks.length}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-amber-950/20 border border-amber-900/40">
              <span className="text-[10px] text-amber-400 block">Para Hoje</span>
              <strong className="text-amber-300 font-mono">{todayCount}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-rose-950/20 border border-rose-900/40">
              <span className="text-[10px] text-rose-400 block">Atrasadas</span>
              <strong className="text-rose-300 font-mono">{overdueCount}</strong>
            </div>
          </div>
        </div>

        {/* Tasks List of the Selected Member */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Fila de Tarefas de {selectedUser.name.split(' ')[0]} ({userTasks.length})
            </h3>
          </div>

          {userTasks.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#121216] border border-zinc-800 text-center text-xs text-zinc-500">
              Nenhuma tarefa atribuída a este colaborador no momento.
            </div>
          ) : (
            <div className="space-y-2">
              {userTasks.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onSelectTask={onSelectTask}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <UserManagementModal
        isOpen={editingUser !== undefined}
        onClose={() => setEditingUser(undefined)}
        currentUser={currentUser}
        user={editingUser || undefined}
        onSave={async data => editingUser ? onUpdateUser(editingUser.id, data) : onCreateUser(data)}
      />
    </div>
  );
};
