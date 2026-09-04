import React, { createContext, ReactNode, useContext, useState } from 'react';
import { OperationalViewMode } from '../types';
import { isAdministrator } from '../permissions';
import { useAuth } from './AuthContext';

interface OperationalViewContextValue {
  mode: OperationalViewMode;
  setMode: (mode: OperationalViewMode) => void;
}

const OperationalViewContext = createContext<OperationalViewContextValue | undefined>(undefined);

export const OperationalViewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, OperationalViewMode>>({});
  const storedMode = user && isAdministrator(user.role)
    ? window.localStorage.getItem(`tecnihub:operational-view:${user.id}`) || window.localStorage.getItem(`tecnihub:dashboard-mode:${user.id}`)
    : null;
  const mode: OperationalViewMode = user && isAdministrator(user.role)
    ? preferences[user.id] || (storedMode === 'operator' ? 'operator' : 'admin')
    : 'admin';

  const setMode = (nextMode: OperationalViewMode) => {
    if (!user || !isAdministrator(user.role)) return;
    window.localStorage.setItem(`tecnihub:operational-view:${user.id}`, nextMode);
    setPreferences(previous => ({ ...previous, [user.id]: nextMode }));
  };

  return <OperationalViewContext.Provider value={{ mode, setMode }}>{children}</OperationalViewContext.Provider>;
};

export function useOperationalView(): OperationalViewContextValue {
  const context = useContext(OperationalViewContext);
  if (!context) throw new Error('useOperationalView deve ser utilizado dentro de OperationalViewProvider');
  return context;
}
