
import { IisSite, AppPool } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const iisService = {
  getTopology: async (filter?: string): Promise<IisSite[]> => {
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    const response = await fetch(`${API_BASE}/iis${query}`);
    if (!response.ok) {
      throw new Error(await response.text() || 'Failed to fetch topology');
    }
    return response.json();
  },

  getPools: async (filter?: string): Promise<AppPool[]> => {
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    const response = await fetch(`${API_BASE}/pools${query}`);
    if (!response.ok) {
      throw new Error(await response.text() || 'Failed to fetch pools');
    }
    return response.json();
  },

  restartSite: async (name: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/sites/${encodeURIComponent(name)}/restart`, {
      method: 'POST',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `Failed to restart site ${name}`);
    }
  },

  recyclePool: async (name: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/pools/${encodeURIComponent(name)}/recycle`, {
      method: 'POST',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `Failed to recycle pool ${name}`);
    }
  },

  getAuditLogs: async (params?: { action?: string; target?: string; dateFrom?: string; dateTo?: string; limit?: number }): Promise<import('../types').AuditLog[]> => {
    const searchParams = new URLSearchParams();
    if (params?.action) searchParams.append('action', params.action);
    if (params?.target) searchParams.append('target', params.target);
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE}/audit?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error(await response.text() || 'Failed to fetch audit logs');
    }
    return response.json();
  }
};
