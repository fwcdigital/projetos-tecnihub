import { api } from './api';
import type { ProductDefinition, ProductStatusDefinition } from '../types';

function normalizeProduct(product: any): ProductDefinition {
  return {
    id: product.id,
    name: product.name,
    color: product.color,
    position: Number(product.position),
    active: Boolean(product.active),
    projectsCount: Number(product.projectsCount ?? product.projects_count ?? 0),
    statusesCount: Number(product.statusesCount ?? product.statuses_count ?? 0)
  };
}

function normalizeStatus(status: any): ProductStatusDefinition {
  return {
    id: status.id,
    productId: status.productId ?? status.product_id,
    name: status.name,
    color: status.color,
    position: Number(status.position),
    active: Boolean(status.active),
    isCompleted: Boolean(status.isCompleted ?? status.is_completed),
    projectsCount: Number(status.projectsCount ?? status.projects_count ?? 0),
    tasksCount: Number(status.tasksCount ?? status.tasks_count ?? 0)
  };
}

export const productService = {
  getAll: async (includeInactive = false): Promise<ProductDefinition[]> => {
    const response = await api.get<{ products: any[] }>(`/api/products${includeInactive ? '?includeInactive=true' : ''}`);
    return response.products.map(normalizeProduct);
  },

  create: async (name: string, color: string): Promise<ProductDefinition> => {
    const response = await api.post<{ product: any }>('/api/products', { name, color });
    return normalizeProduct(response.product);
  },

  update: async (id: string, updates: Partial<Pick<ProductDefinition, 'name' | 'color' | 'active'>>): Promise<ProductDefinition> => {
    const response = await api.put<{ product: any }>(`/api/products/${id}`, updates);
    return normalizeProduct(response.product);
  },

  remove: (id: string): Promise<{ removed: boolean; deactivated: boolean }> => api.delete(`/api/products/${id}`),

  reorder: async (ids: string[]): Promise<ProductDefinition[]> => {
    const response = await api.put<{ products: any[] }>('/api/products/reorder', { ids });
    return response.products.map(normalizeProduct);
  },

  getStatuses: async (productId: string, includeInactive = false): Promise<ProductStatusDefinition[]> => {
    const response = await api.get<{ statuses: any[] }>(`/api/products/${productId}/statuses${includeInactive ? '?includeInactive=true' : ''}`);
    return response.statuses.map(normalizeStatus);
  },

  createStatus: async (productId: string, name: string, color: string): Promise<ProductStatusDefinition> => {
    const response = await api.post<{ status: any }>(`/api/products/${productId}/statuses`, { name, color });
    return normalizeStatus(response.status);
  },

  updateStatus: async (
    productId: string,
    statusId: string,
    updates: Partial<Pick<ProductStatusDefinition, 'name' | 'color' | 'active' | 'isCompleted'>>
  ): Promise<ProductStatusDefinition> => {
    const response = await api.put<{ status: any }>(`/api/products/${productId}/statuses/${statusId}`, updates);
    return normalizeStatus(response.status);
  },

  removeStatus: (productId: string, statusId: string): Promise<{ removed: boolean; deactivated: boolean }> => (
    api.delete(`/api/products/${productId}/statuses/${statusId}`)
  ),

  reorderStatuses: async (productId: string, ids: string[]): Promise<ProductStatusDefinition[]> => {
    const response = await api.put<{ statuses: any[] }>(`/api/products/${productId}/statuses/reorder`, { ids });
    return response.statuses.map(normalizeStatus);
  },

  getCatalog: async (): Promise<ProductDefinition[]> => {
    const products = await productService.getAll(false);
    return Promise.all(products.map(async product => ({
      ...product,
      statuses: await productService.getStatuses(product.id, false)
    })));
  }
};
