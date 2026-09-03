import React from 'react';
import { Task } from '../types';
import { DateRangePicker } from './DateRangePicker';

interface TaskDateRangePickerProps {
  task: Task;
  onChange?: (task: Task) => void;
}

export const TaskDateRangePicker: React.FC<TaskDateRangePickerProps> = ({ task, onChange }) => {
  return <DateRangePicker startDate={task.startDate} dueDate={task.dueDate} startTime={task.startTime} dueTime={task.dueTime} title="Período da tarefa" requireDueDate onChange={onChange ? range => onChange({ ...task, ...range, dueDate: range.dueDate || task.dueDate }) : undefined} />;
};
