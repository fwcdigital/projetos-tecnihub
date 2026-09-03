import React, { useState } from 'react';
import { Task } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Clock, Building2, Plus, ListFilter, LayoutGrid, AlertCircle, Check } from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { CompletedTasksSection } from '../components/CompletedTasksSection';

interface CalendarViewProps {
  tasks: Task[];
  completedTasks: Task[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (taskId: string, event: React.MouseEvent) => void;
  onOpenNewTask: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  completedTasks,
  onSelectTask,
  onToggleComplete,
  onOpenNewTask
}) => {
  const [monthDate, setMonthDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const todayKey = dateKey(new Date());
  const currentMonth = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const currentMonthKey = dateKey(monthDate).slice(0, 7);
  const firstGridDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 - monthDate.getDay());
  const allCalendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate.getFullYear(), firstGridDate.getMonth(), firstGridDate.getDate() + index);
    const dateStr = dateKey(date);
    return {
      dayNum: date.getDate(),
      date,
      dateStr,
      isCurrentMonth: date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear(),
      tasks: tasks.filter(task => task.dueDate === dateStr),
      isToday: dateStr === todayKey
    };
  });

  // Days with active tasks for Agenda / List view
  const daysWithTasks = allCalendarDays.filter(day => day.isCurrentMonth && day.tasks.length > 0);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5 animate-in fade-in duration-150">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Calendar size={22} className="text-sky-400" />
              Calendário Operacional
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-700">
              {monthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Distribuição visual dos prazos e entregas ao longo do mês.
          </p>
        </div>

        {/* Controls & View Mode */}
        <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
          {/* Toggle Grid / List on Mobile */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'GRID' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visão Grade Mensal"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Grade</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'LIST' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visão Lista / Agenda"
            >
              <ListFilter size={15} />
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
            <button type="button" onClick={() => setMonthDate(previous => new Date(previous.getFullYear(), previous.getMonth() - 1, 1))} className="p-1 rounded text-zinc-400 hover:text-white" aria-label="Mês anterior">
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 sm:px-3 font-bold text-zinc-200">{currentMonth}</span>
            <button type="button" onClick={() => setMonthDate(previous => new Date(previous.getFullYear(), previous.getMonth() + 1, 1))} className="p-1 rounded text-zinc-400 hover:text-white" aria-label="Próximo mês">
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold shadow-sm transition-colors min-h-[36px]"
          >
            <Plus size={15} />
            <span>+ Tarefa</span>
          </button>
        </div>
      </div>

      {/* 1. LIST / AGENDA VIEW (Ideal for mobile screens) */}
      {viewMode === 'LIST' ? (
        <div className="space-y-4">
          {daysWithTasks.map((day) => (
            <div key={day.dateStr} className="p-3.5 rounded-xl bg-[#121216] border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-black ${
                    day.isToday ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-200'
                  }`}>
                    {day.dayNum < 10 ? `0${day.dayNum}` : day.dayNum} / {String(day.date.getMonth() + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-bold text-zinc-300">
                    {day.isToday ? `Hoje (${day.date.toLocaleDateString('pt-BR', { weekday: 'long' })})` : day.date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {day.tasks.length} {day.tasks.length === 1 ? 'entrega' : 'entregas'}
                </span>
              </div>

              <div className="space-y-2">
                {day.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 active:bg-zinc-800 flex items-center justify-between gap-3 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PriorityBadge priority={task.priority} size="sm" />
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold text-zinc-200 truncate ${
                          task.status === 'CONCLUIDO' ? 'line-through text-zinc-500' : ''
                        }`}>
                          {task.title}
                        </p>
                        <span className="text-[10px] text-zinc-400 truncate block">
                          {task.clientName} • {task.projectName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.dueTime && (
                        <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                          <Clock size={11} />
                          {task.dueTime}
                        </span>
                      )}
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 2. GRID VIEW (Scrollable/Responsive) */
        <div className="bg-[#121216] border border-zinc-800 rounded-2xl overflow-x-auto shadow-xl">
          <div className="min-w-[640px]">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 bg-[#15151b] border-b border-zinc-800 text-center text-[11px] font-bold text-zinc-400 py-2.5 uppercase tracking-wider">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Month Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-zinc-800/80">
              {allCalendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors ${
                    !day.isCurrentMonth
                      ? 'bg-zinc-950/40 opacity-40'
                      : day.isToday
                        ? 'bg-amber-950/10 hover:bg-amber-950/20'
                        : 'bg-[#121216] hover:bg-[#16161c]'
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                        day.isToday 
                          ? 'bg-amber-400 text-black font-black' 
                          : day.isCurrentMonth ? 'text-zinc-300' : 'text-zinc-600'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    {day.tasks.length > 0 && (
                      <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500">
                        {day.tasks.length}
                      </span>
                    )}
                  </div>

                  {/* Tasks in this day */}
                  <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                    {day.tasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className={`p-1 rounded text-[9px] sm:text-[10px] truncate cursor-pointer transition-all border flex items-center gap-1 ${
                          task.status === 'CONCLUIDO'
                            ? 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40 line-through'
                            : task.priority === 'URGENTE'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                              : 'bg-zinc-800/90 text-zinc-200 border-zinc-700/80 hover:border-zinc-500'
                        }`}
                        title={`${task.title} (${task.clientName})`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}

                    {day.tasks.length > 2 && (
                      <span className="text-[8px] sm:text-[9px] text-zinc-500 font-semibold block text-right">
                        +{day.tasks.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <CompletedTasksSection
        tasks={completedTasks.filter(task => task.dueDate.startsWith(currentMonthKey))}
        onSelectTask={onSelectTask}
        onToggleComplete={onToggleComplete}
        contextKey={currentMonth}
      />
    </div>
  );
};
