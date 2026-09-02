import React from 'react';
import { Task } from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { 
  Check, 
  MessageSquare, 
  CheckSquare, 
  Repeat, 
  Paperclip, 
  Clock, 
  AlertTriangle,
  MoreHorizontal,
  FolderKanban,
  Building2,
  Calendar
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface TaskRowProps {
  task: Task;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  showDate?: boolean;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  onSelectTask,
  onToggleComplete,
  showDate = true,
}) => {
  const isCompleted = task.status === 'CONCLUIDO';
  
  // Calculate checklist progress
  const totalChecklist = task.checklist.length;
  const completedChecklist = task.checklist.filter(c => c.completed).length;

  // Format date helper and alert condition
  const getDueDateDisplay = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const isOverdue = task.dueDate < todayStr && !isCompleted;
    const isToday = task.dueDate === todayStr;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = task.dueDate === tomorrow.toISOString().slice(0, 10);

    let dateText = task.dueDate.split('-').reverse().slice(0, 2).join('/');
    if (isToday) dateText = 'Hoje';
    else if (isTomorrow) dateText = 'Amanhã';

    if (task.dueTime) {
      dateText += ` ${task.dueTime}`;
    }

    return {
      text: dateText,
      isOverdue,
      isToday,
      isTomorrow,
    };
  };

  const dueInfo = getDueDateDisplay();

  return (
    <div
      onClick={() => onSelectTask(task)}
      className={`group relative flex flex-col md:flex-row md:items-center justify-between p-2.5 sm:px-3.5 sm:py-2.5 rounded-lg border transition-all cursor-pointer select-none gap-2 md:gap-3.5 overflow-hidden ${
        isCompleted 
          ? 'bg-[#101014]/60 border-zinc-800/40 opacity-70 hover:opacity-100' 
          : dueInfo.isOverdue
            ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-700/50 hover:bg-rose-950/20'
            : 'bg-[#121216] border-[#22222a] hover:border-zinc-700 hover:bg-[#18181f]'
      }`}
    >
      {/* Left section: Checkbox + Priority + Task Title + Client & Project tags */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
        {/* ClickUp-style Checkbox */}
        <button
          onClick={(e) => onToggleComplete(task.id, e)}
          className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
            isCompleted 
              ? 'bg-emerald-500 border-emerald-500 text-black' 
              : 'border-zinc-600 hover:border-emerald-400 bg-zinc-900'
          }`}
          title={isCompleted ? 'Desmarcar tarefa' : 'Concluir tarefa'}
        >
          {isCompleted && <Check size={11} strokeWidth={3} />}
        </button>

        {/* Priority Badge */}
        <div className="flex-shrink-0">
          <PriorityBadge priority={task.priority} size="sm" showLabel={false} />
        </div>

        {/* Title and Metadata */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-2.5 min-w-0 flex-1 overflow-hidden">
          <span 
            className={`text-xs font-semibold text-zinc-100 truncate flex-shrink min-w-0 ${
              isCompleted ? 'line-through text-zinc-400 font-normal' : ''
            }`}
            title={task.title}
          >
            {task.title}
          </span>

          {/* Client & Project Badges */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-shrink">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-300 text-[10px] font-medium border border-zinc-700/60 max-w-[120px] truncate">
              <Building2 size={10} className="text-zinc-400 flex-shrink-0" />
              <span className="truncate">{task.clientName}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 text-[10px] font-medium border border-zinc-800 max-w-[120px] truncate">
              <FolderKanban size={10} className="text-zinc-500 flex-shrink-0" />
              <span className="truncate">{task.projectName}</span>
            </span>

            {task.isRecurring && (
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-medium flex-shrink-0"
                title={`Recorrência: ${task.recurrenceRule || 'Recorrente'}`}
              >
                <Repeat size={10} className="flex-shrink-0" />
                <span>Recorrente</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right section: Indicators, Due Date, Assignee, Status, Action Menu */}
      <div className="flex items-center justify-between md:justify-end gap-2.5 sm:gap-3 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/60 min-w-0">
        {/* Indicators (Checklist, Comments, Attachments) */}
        <div className="flex items-center gap-2 text-zinc-500 text-[11px] flex-shrink-0">
          {totalChecklist > 0 && (
            <span 
              className={`flex items-center gap-1 ${
                completedChecklist === totalChecklist ? 'text-emerald-400' : 'text-zinc-400'
              }`}
              title={`Checklist: ${completedChecklist}/${totalChecklist} concluídos`}
            >
              <CheckSquare size={12} className="flex-shrink-0" />
              <span>{completedChecklist}/{totalChecklist}</span>
            </span>
          )}

          {task.comments.length > 0 && (
            <span className="flex items-center gap-1 text-zinc-400" title={`${task.comments.length} comentários`}>
              <MessageSquare size={12} className="flex-shrink-0" />
              <span>{task.comments.length}</span>
            </span>
          )}

          {task.attachments.length > 0 && (
            <span className="flex items-center gap-1 text-zinc-400" title={`${task.attachments.length} arquivos`}>
              <Paperclip size={12} className="flex-shrink-0" />
              <span>{task.attachments.length}</span>
            </span>
          )}
        </div>

        {/* Due Date & Time indicator with intelligent color coding */}
        {showDate && (
          <div 
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-mono font-medium flex-shrink-0 ${
              dueInfo.isOverdue
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : dueInfo.isToday
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : dueInfo.isTomorrow
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    : 'text-zinc-400 bg-zinc-900 border border-zinc-800'
            }`}
            title={`Prazo: ${task.dueDate} ${task.dueTime || ''}`}
          >
            {dueInfo.isOverdue ? (
              <AlertTriangle size={11} className="text-rose-400 flex-shrink-0" />
            ) : (
              <Clock size={11} className="flex-shrink-0" />
            )}
            <span className="whitespace-nowrap">{dueInfo.text}</span>
          </div>
        )}

        {/* Assignee Avatar & Tooltip */}
        <div className="flex items-center gap-1.5 flex-shrink-0" title={`Responsável: ${task.assigneeName}`}>
          <UserAvatar name={task.assigneeName} src={task.assigneeAvatar} className="w-5 h-5" />
          <span className="text-[11px] text-zinc-300 font-medium hidden lg:inline max-w-[80px] truncate">
            {task.assigneeName.split(' ')[0]}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <StatusBadge status={task.status} size="sm" />
        </div>

        {/* Quick Row Action */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSelectTask(task);
          }}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block flex-shrink-0"
          title="Opções da tarefa"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  );
};
