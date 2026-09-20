export type UserRole = 'MANAGER' | 'ACCOUNTANT' | 'LEADER' | 'ADMIN';
export type SellerType = 'ST' | 'MSM' | 'IP';

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName?: string;
  telegramUsername?: string;
  role: UserRole;
};

export type Deal = {
  id: string;
  internalNumber: number;
  sellerType: SellerType;
  clientName: string;
  clientPhone?: string;
  managerComment?: string;
  accountingComment?: string;
  requestText?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  plannedShipmentAt?: string;
  invoices: Array<{ number: string; amount?: string; status: string }>;
  tasks: Array<{ id: string; title: string; urgent: boolean; status: string }>;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        ready: () => void;
        expand: () => void;
        colorScheme?: 'light' | 'dark';
      };
    };
  }
}
