import React, { useState } from 'react';
import { Task } from '../types';
import { Calendar, ChevronLeft, ChevronRight, Clock, Building2, Plus } from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onOpenNewTask: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onSelectTask,
  onOpenNewTask
}) => {
  const [currentMonth, setCurrentMonth] = useState('Setembro de 2026');

  // Days of September 2026 (starts on Tuesday 01)
  // Calendar grid: Sun (30 Aug) to Sat (03 Oct)
  const daysInSeptember = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-09-${dayNum < 10 ? `0${dayNum}` : dayNum}`;
    const dayTasks = tasks.filter(t => t.dueDate === dateStr);
    return {
      dayNum,
      dateStr,
      isCurrentMonth: true,
      tasks: dayTasks,
      isToday: dateStr === '2026-09-01'
    };
  });

  // Leading days (Sunday 30 Aug, Monday 31 Aug)
  const leadingDays = [
    { dayNum: 30, dateStr: '2026-08-30', isCurrentMonth: false, tasks: tasks.filter(t => t.dueDate === '2026-08-30'), isToday: false },
    { dayNum: 31, dateStr: '2026-08-31', isCurrentMonth: false, tasks: tasks.filter(t => t.dueDate === '2026-08-31'), isToday: false },
  ];

  // Trailing days to complete 35 grid cells
  const trailingDays = [
    { dayNum: 1, dateStr: '2026-10-01', isCurrentMonth: false, tasks: [], isToday: false },
    { dayNum: 2, dateStr: '2026-10-02', isCurrentMonth: false, tasks: [], isToday: false },
    { dayNum: 3, dateStr: '2026-10-03', isCurrentMonth: false, tasks: [], isToday: false },
  ];

  const allCalendarDays = [...leadingDays, ...daysInSeptember, ...trailingDays];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-150">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Calendar size={22} className="text-sky-400" />
              Calendário Operacional
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-700">
              Setembro / 2026
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Distribuição visual dos prazos e entregas da agência ao longo do mês.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
            <button className="p-1 rounded text-zinc-400 hover:text-white">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 font-bold text-zinc-200">{currentMonth}</span>
            <button className="p-1 rounded text-zinc-400 hover:text-white">
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>+ Tarefa</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-[#121216] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
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
              className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
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
                  <span className="text-[10px] font-mono text-zinc-500">
                    {day.tasks.length} {day.tasks.length === 1 ? 'item' : 'itens'}
                  </span>
                )}
              </div>

              {/* Tasks in this day */}
              <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                {day.tasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className={`p-1 rounded text-[10px] truncate cursor-pointer transition-all border flex items-center gap-1 ${
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

                {day.tasks.length > 3 && (
                  <span className="text-[9px] text-zinc-500 font-semibold block text-right">
                    +{day.tasks.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
