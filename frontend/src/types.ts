export type SupplierPurchaseStatus = 'DRAFT' | 'PAYMENT_REQUESTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
export type UserRole = 'MANAGER' | 'ACCOUNTANT' | 'LEADER' | 'ADMIN';
export type SellerType = 'ST' | 'MSM' | 'IP';
export type PaymentStatus = 'NO_PREPAYMENT' | 'WAITING' | 'ADVANCE' | 'PAID' | 'DEFERRED';
export type ClientPaymentMethod = 'NONCASH' | 'CASH' | 'CARD' | 'ADVANCE';

export type CurrentUser = {
  id: string;
  firstName: string;
  lastName?: string;
  telegramUsername?: string;
  role: UserRole;
};

export type StoredFile = {
  id: string;
  originalName: string;
  mimeType?: string;
  category?: string;
  createdAt?: string;
};

export type Invoice = {
  id: string;
  sellerType?: SellerType;
  number: string;
  invoiceDate?: string;
  amount?: string;
  status: string;
  version?: number;
  isCurrent?: boolean;
  fileId?: string;
  file?: StoredFile;
  createdAt?: string;
};

export type DealTask = {
  id: string;
  title: string;
  urgent: boolean;
  status: string;
  description?: string;
  type?: string;
};

export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  reason?: string;
  createdAt: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  actor?: { firstName: string; lastName?: string };
};

export type ClientPayment = {
  id: string;
  amount: string;
  paidAt: string;
  method: ClientPaymentMethod;
  comment?: string;
  fileId?: string;
  file?: StoredFile;
  actor?: { id: string; firstName: string; lastName?: string };
  createdAt: string;
};

export type SupplierPayment = {
  id: string;
  purchaseId: string;
  amount: string;
  paidAt: string;
  paymentOrderStamped: boolean;
  paidFromBalance: boolean;
  comment?: string;
  actor?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  createdAt: string;
};

export type SupplierPurchase = {
  id: string;
  dealId: string;
  supplierName: string;
  incomingInvoiceNumber?: string;
  incomingInvoiceAmount?: string;
  requestedAmount?: string;
  comment?: string;
  status: SupplierPurchaseStatus;
  payments: SupplierPayment[];
  createdAt: string;
  updatedAt: string;
};

export type Deal = {
  id: string;
  internalNumber: number;
  createdAt?: string;
  sellerType: SellerType;
  clientName: string;
  contactName?: string;
  clientPhone?: string;
  managerComment?: string;
  accountingComment?: string;
  requestText?: string;
  marginMode?: string;
  marginValue?: string | number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  paymentStatus: PaymentStatus;
  deferralStartAt?: string;
  deferralEndAt?: string;
  deferralTerms?: string;
  plannedShipmentAt?: string;
  deliveryAddresses?: string[];
  invoices: Invoice[];
  tasks: DealTask[];
  files?: StoredFile[];
  clientPayments?: ClientPayment[];
  auditEvents?: AuditEvent[];
  supplierPurchases?: SupplierPurchase[];
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
