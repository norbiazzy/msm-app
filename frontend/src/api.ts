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

export async function getDeal(id: string): Promise<Deal> {
  return json(`/deals/${id}`);
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

export function dealFileUrl(fileId: string) {
  return `${API}/files/${encodeURIComponent(fileId)}/download`;
}

export async function createInvoice(dealId: string, payload: { number: string; invoiceDate?: string; amount?: number; fileId?: string; actorId: string }) {
  return json(`/deals/${dealId}/invoices`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function confirmInvoice(dealId: string, invoiceId: string, actorId: string) {
  return json(`/deals/${dealId}/invoices/${invoiceId}/confirm`, {
    method: 'PATCH',
    body: JSON.stringify({ actorId }),
  });
}

export async function requestInvoiceCorrection(
  dealId: string,
  invoiceId: string,
  payload: { actorId: string; comment: string; urgent?: boolean },
) {
  return json(`/deals/${dealId}/invoices/${invoiceId}/correction`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
