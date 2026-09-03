import React, { useState } from 'react';
import { Project, Task, TaskStatus } from '../types';
import { 
  Check, 
  MessageSquare, 
  CheckSquare, 
  Paperclip
} from 'lucide-react';
import { AvatarGroup } from './AvatarGroup';
import { AssigneePicker } from './AssigneePicker';
import { ExpandableTaskChildren } from './ExpandableTaskChildren';
import { HierarchyExpandButton } from './HierarchyExpandButton';
import { InlineTitleEditor } from './InlineTitleEditor';
import { PriorityPicker } from './PriorityPicker';
import { RecurrencePopover } from './RecurrencePopover';
import { TaskContextPicker } from './TaskContextPicker';
import { TaskDateRangePicker } from './TaskDateRangePicker';
import { TaskActionsMenu } from './TaskActionsMenu';
import { StatusPicker } from './StatusPicker';
import { TASK_STATUS_OPTIONS } from './visualTokens';

interface TaskRowProps {
  task: Task;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  showDate?: boolean;
  onUpdateTask?: (task: Task) => void;
  projects?: Project[];
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  onSelectTask,
  onToggleComplete,
  showDate = true,
  onUpdateTask,
  projects = [],
}) => {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = task.status === 'CONCLUIDO';
  const assignees = task.assignees?.length ? task.assignees : [{ id: task.assigneeId, name: task.assigneeName, avatar: task.assigneeAvatar, position: 'Responsável' }];
  const hasChildren = task.subtasks.length > 0 || task.checklist.length > 0;
  
  // Calculate checklist progress
  const totalChecklist = task.checklist.length;
  const completedChecklist = task.checklist.filter(c => c.completed).length;

  const isOverdue = task.dueDate < new Date().toISOString().slice(0, 10) && !isCompleted;

  return (
    <div>
    <div
      className={`group relative flex flex-col justify-between gap-1.5 overflow-visible rounded-lg border px-2.5 py-1.5 transition-all md:flex-row md:items-center md:gap-2.5 ${
        isCompleted 
          ? 'bg-[#101014]/60 border-zinc-800/40 opacity-70 hover:opacity-100' 
          : isOverdue
            ? 'bg-rose-950/10 border-rose-900/30 hover:border-rose-700/50 hover:bg-rose-950/20'
            : 'bg-[#121216] border-[#22222a] hover:border-zinc-700 hover:bg-[#18181f]'
      }`}
    >
      {/* Left section: Checkbox + Priority + Task Title + Client & Project tags */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-visible">
        {hasChildren ? (
          <HierarchyExpandButton expanded={expanded} count={task.subtasks.length + task.checklist.length} onToggle={() => setExpanded(value => !value)} />
        ) : <span className="w-4" />}
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
        <div className="flex-shrink-0"><PriorityPicker value={task.priority} onChange={onUpdateTask ? priority => onUpdateTask({ ...task, priority }) : undefined} /></div>

        {/* Title and Metadata */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-visible lg:flex-row lg:items-center lg:gap-2.5">
          <InlineTitleEditor value={task.title} completed={isCompleted} onOpen={() => onSelectTask(task)} onSave={onUpdateTask ? title => onUpdateTask({ ...task, title }) : undefined} />

          {/* Client & Project Badges */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-shrink">
            <TaskContextPicker task={task} projects={projects} mode="CLIENT" onChange={onUpdateTask ? project => onUpdateTask({ ...task, projectId: project.id, projectName: project.name, clientId: project.clientId, clientName: project.clientName }) : undefined} />
            <TaskContextPicker task={task} projects={projects} mode="PROJECT" onChange={onUpdateTask ? project => onUpdateTask({ ...task, projectId: project.id, projectName: project.name, clientId: project.clientId, clientName: project.clientName }) : undefined} />
            {task.isRecurring && task.recurrence && <RecurrencePopover task={task} onChange={onUpdateTask} />}
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
        {showDate && <TaskDateRangePicker task={task} onChange={onUpdateTask} />}

        {/* Assignee Avatar & Tooltip */}
        <div className="flex-shrink-0">
          {onUpdateTask && task.availableAssignees?.length ? <AssigneePicker users={task.availableAssignees} selectedIds={task.participantIds} selectedAssignees={assignees} onChange={participantIds => onUpdateTask({ ...task, participantIds })} label="" /> : <AvatarGroup assignees={assignees} />}
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0" onClick={event => event.stopPropagation()}>
          <StatusPicker value={task.status} options={TASK_STATUS_OPTIONS} onChange={onUpdateTask ? status => onUpdateTask({ ...task, status: status as TaskStatus }) : undefined} ariaLabel={`Alterar status de ${task.title}`} />
        </div>

        {/* Quick Row Action */}
        <TaskActionsMenu task={task} onOpen={() => onSelectTask(task)} onToggleComplete={event => onToggleComplete(task.id, event)} />
      </div>
    </div>
    {expanded && onUpdateTask && <ExpandableTaskChildren task={task} users={task.availableAssignees || []} onUpdateTask={onUpdateTask} />}
    </div>
  );
};
