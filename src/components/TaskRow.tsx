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
import { getWorkflowStatusOptions, isTaskCompleted } from './visualTokens';
import { isContainerNavigationClick, isContainerNavigationKey } from './containerNavigation';

interface TaskRowProps {
  task: Task;
  onSelectTask: (task: Task, initialTab?: 'DETAILS' | 'COMMENTS') => void;
  onSelectProject?: (project: Project) => void;
  onToggleComplete: (taskId: string, e: React.MouseEvent) => void;
  showDate?: boolean;
  onUpdateTask?: (task: Task) => void;
  projects?: Project[];
  layout?: 'DEFAULT' | 'STACKED';
  containerNavigationTarget?: 'PROJECT' | 'TASK';
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  onSelectTask,
  onSelectProject,
  onToggleComplete,
  showDate = true,
  onUpdateTask,
  projects = [],
  layout = 'DEFAULT',
  containerNavigationTarget = 'PROJECT',
}) => {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = isTaskCompleted(task);
  const statusOptions = getWorkflowStatusOptions(task.workflowStatuses || [], { value: task.status, label: task.statusName, color: task.statusColor });
  const changeStatus = (status: TaskStatus) => {
    const definition = task.workflowStatuses?.find(option => option.id === status);
    onUpdateTask?.({
      ...task,
      status,
      statusName: definition?.name || task.statusName,
      statusColor: definition?.color || task.statusColor,
      statusCompleted: definition?.isCompleted ?? task.statusCompleted
    });
  };
  const moveToProject = (project: Project) => {
    const nextStatus = project.workflowStatuses?.find(status => status.id === task.status)
      || project.workflowStatuses?.find(status => status.isCompleted === Boolean(task.statusCompleted))
      || project.workflowStatuses?.[0];
    onUpdateTask?.({
      ...task,
      projectId: project.id,
      projectName: project.name,
      clientId: project.clientId,
      clientName: project.clientName,
      productId: project.type,
      workflowStatuses: project.workflowStatuses,
      ...(nextStatus ? {
        status: nextStatus.id,
        statusName: nextStatus.name,
        statusColor: nextStatus.color,
        statusCompleted: nextStatus.isCompleted
      } : {})
    });
  };
  const assignees = task.assignees?.length ? task.assignees : [{ id: task.assigneeId, name: task.assigneeName, avatar: task.assigneeAvatar, position: 'Responsável' }];
  const hasChildren = task.subtasks.length > 0 || task.checklist.length > 0;
  
  // Calculate checklist progress
  const totalChecklist = task.checklist.length;
  const completedChecklist = task.checklist.filter(c => c.completed).length;
  const visibleCommentCount = task.commentCount ?? task.comments.filter(comment => !comment.deletedAt).length;

  const isOverdue = task.dueDate < new Date().toISOString().slice(0, 10) && !isCompleted;
  const stacked = layout === 'STACKED';
  const relatedProject = projects.find(project => project.id === task.projectId);
  const openRelatedProject = () => {
    if (relatedProject) onSelectProject?.(relatedProject);
  };
  const containerIsNavigable = containerNavigationTarget === 'TASK' || Boolean(relatedProject && onSelectProject);
  const openContainerTarget = () => {
    if (containerNavigationTarget === 'TASK') onSelectTask(task, 'DETAILS');
    else openRelatedProject();
  };
  const controls = () => <>
    <div className="flex flex-shrink-0 items-center gap-2 text-[11px] text-zinc-500">
      {totalChecklist > 0 && <span className={`flex items-center gap-1 ${completedChecklist === totalChecklist ? 'text-emerald-400' : 'text-zinc-400'}`} title={`Checklist: ${completedChecklist}/${totalChecklist} concluídos`}><CheckSquare size={12} className="flex-shrink-0" /><span>{completedChecklist}/{totalChecklist}</span></span>}
      {visibleCommentCount > 0 && <button type="button" onClick={event => { event.stopPropagation(); onSelectTask(task, 'COMMENTS'); }} className="flex items-center gap-1 rounded text-zinc-400 transition-colors hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60" title={`Abrir ${visibleCommentCount} comentários`} aria-label={`Abrir comentários de ${task.title}`}><MessageSquare size={12} className="flex-shrink-0" /><span>{visibleCommentCount}</span></button>}
      {task.attachments.length > 0 && <span className="flex items-center gap-1 text-zinc-400" title={`${task.attachments.length} arquivos`}><Paperclip size={12} className="flex-shrink-0" /><span>{task.attachments.length}</span></span>}
    </div>
    {showDate && <TaskDateRangePicker task={task} onChange={onUpdateTask} />}
    <div className="flex-shrink-0">
      {onUpdateTask && task.availableAssignees?.length ? <AssigneePicker users={task.availableAssignees} selectedIds={task.participantIds} selectedAssignees={assignees} onChange={participantIds => onUpdateTask({ ...task, participantIds })} label="" /> : <AvatarGroup assignees={assignees} />}
    </div>
    <div className="flex-shrink-0" onClick={event => event.stopPropagation()}>
      <StatusPicker value={task.status} options={statusOptions} onChange={onUpdateTask ? status => changeStatus(status as TaskStatus) : undefined} ariaLabel={`Alterar status de ${task.title}`} />
    </div>
    <TaskActionsMenu task={task} onOpen={() => onSelectTask(task)} onToggleComplete={event => onToggleComplete(task.id, event)} />
  </>;

  return (
    <div>
    <div
      role={containerIsNavigable ? 'link' : undefined}
      tabIndex={containerIsNavigable ? 0 : undefined}
      aria-label={containerIsNavigable ? (containerNavigationTarget === 'TASK' ? `Abrir tarefa ${task.title}` : `Abrir projeto ${relatedProject?.name}`) : undefined}
      onClick={event => { if (isContainerNavigationClick(event)) openContainerTarget(); }}
      onKeyDown={event => { if (isContainerNavigationKey(event)) { event.preventDefault(); openContainerTarget(); } }}
      className={`group relative flex justify-between overflow-visible rounded-lg border px-2.5 py-1.5 transition-all ${containerIsNavigable ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60' : ''} ${stacked ? 'flex-col items-stretch gap-2' : 'flex-col gap-1.5 md:flex-row md:items-center md:gap-2.5'} ${
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
        {!stacked && <div className="flex-shrink-0"><PriorityPicker value={task.priority} onChange={onUpdateTask ? priority => onUpdateTask({ ...task, priority }) : undefined} /></div>}

        {/* Title and Metadata */}
        <div className={`flex min-w-0 flex-1 flex-col gap-1 overflow-visible ${stacked ? '' : 'lg:flex-row lg:items-center lg:gap-2.5'}`}>
          <InlineTitleEditor value={task.title} completed={isCompleted} wrap={stacked} onOpen={() => onSelectTask(task)} onSave={onUpdateTask ? title => onUpdateTask({ ...task, title }) : undefined} />

          {/* Client & Project Badges */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-shrink">
            {stacked && <PriorityPicker value={task.priority} onChange={onUpdateTask ? priority => onUpdateTask({ ...task, priority }) : undefined} />}
            <TaskContextPicker task={task} projects={projects} mode="CLIENT" onChange={onUpdateTask ? moveToProject : undefined} />
            <TaskContextPicker task={task} projects={projects} mode="PROJECT" onChange={onUpdateTask ? moveToProject : undefined} />
            {task.isRecurring && task.recurrence && <RecurrencePopover task={task} onChange={onUpdateTask} />}
            {stacked && <div data-container-navigation="ignore" className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2.5 sm:gap-3">{controls()}</div>}
          </div>
        </div>
      </div>

      {!stacked && <div data-container-navigation="ignore" className="flex min-w-0 flex-shrink-0 items-center justify-between gap-2.5 border-t border-zinc-800/60 pt-2 sm:gap-3 md:justify-end md:border-t-0 md:pt-0">{controls()}</div>}
    </div>
    {expanded && onUpdateTask && <ExpandableTaskChildren task={task} users={task.availableAssignees || []} onUpdateTask={onUpdateTask} />}
    </div>
  );
};
