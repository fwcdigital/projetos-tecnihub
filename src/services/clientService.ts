import { api } from './api';
import { Client } from '../types';

export interface ClientFilter {
  status?: string;
  search?: string;
}

export const clientService = {
  getAll: async (filter?: ClientFilter): Promise<Client[]> => {
    const params = new URLSearchParams();
    if (filter?.status && filter.status !== 'ALL') params.append('status', filter.status);
    if (filter?.search) params.append('search', filter.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<{ clients: any[] }>(`/api/clients${query}`);

    return res.clients.map(c => ({
      id: c.id,
      name: c.name,
      company: c.company_name || c.name,
      logo: c.logo || 'CL',
      contactName: c.contact_name || '',
      contactEmail: c.email || '',
      contactPhone: c.phone || '',
      activeProjectsCount: c.activeProjectsCount || 0,
      completedProjectsCount: c.completedProjectsCount || 0,
      leadManagerId: c.lead_manager_id || '',
      leadManagerName: c.lead_manager_name || 'Gestor da Conta',
      teamMembers: c.team_members || [],
      statusRelationship: (c.status === 'ACTIVE' ? 'ATIVO' : c.status === 'ARCHIVED' ? 'PAUSADO' : 'ONBOARDING') as any,
      notes: c.notes || '',
      monthlyServices: c.monthly_services || [],
      createdAt: c.created_at || '2026-09-01'
    }));
  },

  getById: async (id: string): Promise<Client> => {
    const res = await api.get<{ client: any }>(`/api/clients/${id}`);
    const c = res.client;
    return {
      id: c.id,
      name: c.name,
      company: c.company_name || c.name,
      logo: c.logo || 'CL',
      contactName: c.contact_name || '',
      contactEmail: c.email || '',
      contactPhone: c.phone || '',
      activeProjectsCount: c.activeProjectsCount || 0,
      completedProjectsCount: c.completedProjectsCount || 0,
      leadManagerId: c.lead_manager_id || '',
      leadManagerName: c.lead_manager_name || 'Gestor da Conta',
      teamMembers: c.team_members || [],
      statusRelationship: (c.status === 'ACTIVE' ? 'ATIVO' : c.status === 'ARCHIVED' ? 'PAUSADO' : 'ONBOARDING') as any,
      notes: c.notes || '',
      monthlyServices: c.monthly_services || [],
      createdAt: c.created_at || '2026-09-01'
    };
  },

  create: async (data: Partial<Client>): Promise<Client> => {
    const payload = {
      name: data.name,
      company_name: data.company || data.name,
      logo: data.logo,
      contact_name: data.contactName,
      email: data.contactEmail,
      phone: data.contactPhone,
      status: 'ACTIVE',
      lead_manager_id: data.leadManagerId,
      notes: data.notes,
      monthly_services: data.monthlyServices
    };

    const res = await api.post<{ client: any }>('/api/clients', payload);
    const c = res.client;
    return {
      id: c.id,
      name: c.name,
      company: c.company_name || c.name,
      logo: c.logo || 'CL',
      contactName: c.contact_name || '',
      contactEmail: c.email || '',
      contactPhone: c.phone || '',
      activeProjectsCount: 0,
      completedProjectsCount: 0,
      leadManagerId: c.lead_manager_id || '',
      leadManagerName: data.leadManagerName || 'Gestor da Conta',
      teamMembers: data.teamMembers || [],
      statusRelationship: 'ATIVO',
      notes: c.notes || '',
      monthlyServices: c.monthly_services || [],
      createdAt: c.created_at || '2026-09-01'
    };
  },

  update: async (id: string, data: Partial<Client>): Promise<Client> => {
    const payload = {
      name: data.name,
      company_name: data.company,
      logo: data.logo,
      contact_name: data.contactName,
      email: data.contactEmail,
      phone: data.contactPhone,
      lead_manager_id: data.leadManagerId,
      notes: data.notes,
      monthly_services: data.monthlyServices
    };

    const res = await api.put<{ client: any }>(`/api/clients/${id}`, payload);
    const c = res.client;
    return {
      id: c.id,
      name: c.name,
      company: c.company_name || c.name,
      logo: c.logo || 'CL',
      contactName: c.contact_name || '',
      contactEmail: c.email || '',
      contactPhone: c.phone || '',
      activeProjectsCount: c.activeProjectsCount || 0,
      completedProjectsCount: c.completedProjectsCount || 0,
      leadManagerId: c.lead_manager_id || '',
      leadManagerName: data.leadManagerName || 'Gestor da Conta',
      teamMembers: data.teamMembers || [],
      statusRelationship: (c.status === 'ACTIVE' ? 'ATIVO' : 'PAUSADO') as any,
      notes: c.notes || '',
      monthlyServices: c.monthly_services || [],
      createdAt: c.created_at || '2026-09-01'
    };
  },

  archive: async (id: string): Promise<void> => {
    await api.delete(`/api/clients/${id}`);
  }
};
