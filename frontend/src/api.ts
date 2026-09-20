import type { CurrentUser, Deal, UserRole } from './types';

const API = import.meta.env.VITE_API_URL || '/api';

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function login(): Promise<CurrentUser> {
  const initData = window.Telegram?.WebApp?.initData || 'dev';
  const devRole = (new URLSearchParams(location.search).get('devRole') || 'MANAGER') as UserRole;
  return json('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ initData, devRole }),
  });
}

export async function listDeals(managerId?: string): Promise<Deal[]> {
  const q = managerId ? `?managerId=${encodeURIComponent(managerId)}` : '';
  return json(`/deals${q}`);
}

export async function createDeal(payload: Record<string, unknown>) {
  return json<Deal>('/deals', { method: 'POST', body: JSON.stringify(payload) });
}

export type Task = {
  id: string;
  type: string;
  status: string;
  urgent: boolean;
  title: string;
  description?: string;
  deal: Deal;
};

export async function listTasks(): Promise<Task[]> {
  return json('/tasks');
}

export async function updateTaskStatus(id: string, status: string, assigneeId?: string) {
  return json(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, assigneeId }) });
}

export async function uploadDealFile(dealId: string, file: File, category: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('category', category);
  const res = await fetch(`${API}/files/deal/${dealId}`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: string }>;
}

export async function createInvoice(dealId: string, payload: { number: string; invoiceDate?: string; amount?: number; fileId?: string; actorId: string }) {
  return json(`/deals/${dealId}/invoices`, { method: 'POST', body: JSON.stringify(payload) });
}
