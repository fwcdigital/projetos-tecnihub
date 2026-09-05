import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Project, Task } from '../types';
import { TaskRow } from './TaskRow';

interface CompletedTasksSectionProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onSelectProject?: (project: Project) => void;
  onToggleComplete: (taskId: string, event: React.MouseEvent) => void;
  onUpdateTask?: (task: Task) => void;
  contextKey?: string;
  projects?: Project[];
  taskLayout?: 'DEFAULT' | 'STACKED';
  containerNavigationTarget?: 'PROJECT' | 'TASK';
}

export const CompletedTasksSection: React.FC<CompletedTasksSectionProps> = ({
  tasks,
  onSelectTask,
  onSelectProject,
  onToggleComplete,
  onUpdateTask,
  contextKey,
  projects = [],
  taskLayout = 'DEFAULT',
  containerNavigationTarget = 'PROJECT'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [contextKey]);

  useEffect(() => {
    if (tasks.length === 0) setIsOpen(false);
  }, [tasks.length]);

  if (tasks.length === 0) return null;

  return (
    <div className="pt-2 space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(previous => !previous)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {isOpen ? 'Ocultar tarefas concluídas' : 'Ver tarefas concluídas'}
        <span className="font-mono text-zinc-600">({tasks.length})</span>
      </button>

      {isOpen && (
        <div className="space-y-2 border-t border-zinc-800/70 pt-2">
          {tasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onSelectTask={onSelectTask}
              onSelectProject={onSelectProject}
              onToggleComplete={onToggleComplete}
              onUpdateTask={onUpdateTask}
              projects={projects}
              layout={taskLayout}
              containerNavigationTarget={containerNavigationTarget}
            />
          ))}
        </div>
      )}
    </div>
  );
};
