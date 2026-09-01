import React, { useState } from 'react';
import { Client, Project, ProjectType, Task, User } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { 
  FolderKanban, 
  Search, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  Repeat, 
  Building2, 
  User as UserIcon, 
  Users, 
  ArrowRight,
  TrendingUp,
  Filter
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  clients: Client[];
  tasks: Task[];
  onSelectProject: (project: Project) => void;
  onOpenNewProject: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  clients,
  tasks,
  onSelectProject,
  onOpenNewProject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedClient, setSelectedClient] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredProjects = projects.filter(p => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      if (!p.name.toLowerCase().includes(term) && !p.clientName.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (selectedType !== 'ALL' && p.type !== selectedType) return false;
    if (selectedClient !== 'ALL' && p.clientId !== selectedClient) return false;
    if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
    return true;
  });

  const getProjectTypeLabel = (type: ProjectType) => {
    switch (type) {
      case 'SITE': return 'Site Institucional';
      case 'LANDING_PAGE': return 'Landing Page';
      case 'ECOMMERCE': return 'E-commerce';
      case 'GOOGLE_ADS': return 'Google Ads';
      case 'META_ADS': return 'Meta Ads';
      case 'SEO': return 'SEO';
      case 'SOCIAL_MEDIA': return 'Social Media';
      case 'MANUTENCAO': return 'Manutenção Web';
      case 'INTERNO': return 'Interno';
      default: return 'Geral';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Projetos & Demandas da Agência
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-700">
              {filteredProjects.length} ativos
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Acompanhe o progresso, prazos de entrega, gestores e tarefas de cada contrato.
          </p>
        </div>

        <button
          onClick={onOpenNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>+ Novo Projeto</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded-xl bg-[#121216] border border-zinc-800 flex flex-wrap items-center gap-2.5 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome do projeto ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#181820] border border-zinc-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-[#181820] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none"
        >
          <option value="ALL">📁 Todos os Tipos</option>
          <option value="SITE">Site Institucional</option>
          <option value="LANDING_PAGE">Landing Page</option>
          <option value="ECOMMERCE">E-commerce</option>
          <option value="GOOGLE_ADS">Google Ads</option>
          <option value="META_ADS">Meta Ads</option>
          <option value="SEO">SEO</option>
          <option value="MANUTENCAO">Manutenção</option>
        </select>

        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="bg-[#181820] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none"
        >
          <option value="ALL">🏢 Todos os Clientes</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-[#181820] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none"
        >
          <option value="ALL">⚡ Todos os Status</option>
          <option value="EM_ANDAMENTO">Em Andamento</option>
          <option value="PLANEJAMENTO">Planejamento</option>
          <option value="AGUARDANDO_CLIENTE">Aguardando Cliente</option>
          <option value="CONCLUIDO">Concluído</option>
        </select>
      </div>

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const projectTasks = tasks.filter(t => t.projectId === project.id);
          const overdueCount = projectTasks.filter(t => t.dueDate < '2026-09-01' && t.status !== 'CONCLUIDO').length;

          return (
            <div
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="p-4 rounded-xl bg-[#121216] border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all hover:bg-[#16161c] flex flex-col justify-between space-y-4 group"
            >
              {/* Top Card Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-semibold border border-zinc-700/50">
                      {getProjectTypeLabel(project.type)}
                    </span>
                    <h2 className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors">
                      {project.name}
                    </h2>
                  </div>
                  <StatusBadge status={project.status} size="sm" />
                </div>

                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <Building2 size={12} className="text-zinc-500" />
                  <span>{project.clientName}</span>
                </p>

                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>
              </div>

              {/* Middle: Progress Bar */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-400">Progresso</span>
                  <span className="font-mono font-bold text-zinc-200">{project.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      project.progress >= 80 ? 'bg-emerald-500' : project.progress >= 40 ? 'bg-sky-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Bottom Metadata & Footer */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-800/80">
                <div className="flex items-center gap-1">
                  <UserIcon size={12} className="text-zinc-500" />
                  <span>Gestor: <strong>{project.managerName.split(' ')[0]}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  {overdueCount > 0 && (
                    <span className="flex items-center gap-0.5 text-rose-400 font-semibold" title={`${overdueCount} tarefas atrasadas`}>
                      <AlertTriangle size={12} />
                      <span>{overdueCount}</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1 font-mono text-zinc-300">
                    <Calendar size={11} className="text-zinc-500" />
                    {project.dueDate.split('-').reverse().slice(0, 2).join('/')}
                  </span>

                  <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
