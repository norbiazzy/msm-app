/*
 * Common lifecycle of MSM tasks.
 * The task remains the same during return/resubmit; the backend is responsible
 * for status/assignment/audit events. Specialized form validation and actions
 * (invoice, supplier payment, ETRN, POA) remain in their feature handlers.
 */
import { returnInvoiceRequest, returnTaskToManager, resubmitTaskToAccounting } from './api';

export type TaskReturnReasonCode =
  | 'MISSING_DATA'
  | 'INCORRECT_DATA'
  | 'NEED_CLARIFICATION'
  | 'NO_INCOMING_INVOICE'
  | 'NO_TERMS'
  | 'NO_DETAILS'
  | 'OTHER';

export const TASK_RETURN_REASONS: ReadonlyArray<{value: TaskReturnReasonCode;label: string}> = [
  {value:'MISSING_DATA',label:'Не хватает данных'},
  {value:'INCORRECT_DATA',label:'Данные заполнены неверно'},
  {value:'NEED_CLARIFICATION',label:'Требуется уточнение'},
  {value:'NO_INCOMING_INVOICE',label:'Нет входящего счёта'},
  {value:'NO_TERMS',label:'Нет условий'},
  {value:'NO_DETAILS',label:'Нет реквизитов / непонятно, на кого делать'},
  {value:'OTHER',label:'Другое'},
];

export type TaskResubmitKind = 'invoice' | 'supplier-payment' | 'structured';
export type TaskFormKind = 'invoice' | 'supplier-payment' | 'power-of-attorney' | 'etrn' | 'structured';
export type TaskWorkflowPolicy = {
  form: TaskFormKind;
  resubmit: TaskResubmitKind;
  returnEndpoint: 'invoice' | 'generic';
  title: string;
};

// Only form specifics vary. Shared status lifecycle, task identity, return reason,
// attachment history and progress-in-task-list are invariant.
const policies: Readonly<Record<string, TaskWorkflowPolicy>> = {
  ISSUE_CLIENT_INVOICE: {form:'invoice',resubmit:'invoice',returnEndpoint:'invoice',title:'Выставить счёт'},
  CORRECT_CLIENT_INVOICE: {form:'invoice',resubmit:'structured',returnEndpoint:'generic',title:'Корректировка счёта'},
  PAY_SUPPLIER: {form:'supplier-payment',resubmit:'supplier-payment',returnEndpoint:'generic',title:'Оплата поставщику'},
  POWER_OF_ATTORNEY: {form:'power-of-attorney',resubmit:'structured',returnEndpoint:'generic',title:'Доверенность'},
  ETRN: {form:'etrn',resubmit:'structured',returnEndpoint:'generic',title:'ЭТрН'},
  OTHER: {form:'structured',resubmit:'structured',returnEndpoint:'generic',title:'Другая задача'},
};

const fallback: TaskWorkflowPolicy = {
  form:'structured',resubmit:'structured',returnEndpoint:'generic',title:'Задача',
};

export function taskWorkflowPolicy(taskType: string): TaskWorkflowPolicy {
  return policies[taskType] || fallback;
}

export function taskAttachmentCategory(taskId: string): string {
  return 'TASK_ATTACHMENT_' + taskId;
}

export function taskResubmitTitle(taskType: string): string {
  switch(taskType){
    case 'POWER_OF_ATTORNEY': return 'Повторно отправляем доверенность';
    case 'ETRN': return 'Повторно отправляем ЭТрН';
    default: return 'Повторно отправляем задачу';
  }
}

export function validateTaskReturnReason(reasonCode: TaskReturnReasonCode, comment: string): string | null {
  if (!TASK_RETURN_REASONS.some(reason => reason.value === reasonCode)) {
    return 'Выберите причину возврата';
  }
  if (reasonCode === 'OTHER' && !comment.trim()) {
    return 'Для причины «Другое» добавьте комментарий.';
  }
  return null;
}

export async function returnTaskForCorrection(input: {
  taskId: string;
  taskType: string;
  actorId: string;
  reasonCode: TaskReturnReasonCode;
  comment?: string;
}) {
  const err=validateTaskReturnReason(input.reasonCode,input.comment||'');
  if(err)throw new Error(err);
  const payload={actorId:input.actorId,reasonCode:input.reasonCode,comment:input.comment?.trim()||undefined};
  if(taskWorkflowPolicy(input.taskType).returnEndpoint==='invoice'){
    return returnInvoiceRequest(input.taskId,payload);
  }
  return returnTaskToManager(input.taskId,payload);
}

// Generic adapter. Invoices and supplier payments have specialized persistence
// contracts and MUST use their own feature-specific resubmit handler for now.
export async function resubmitStructuredTask(input: {
  taskId: string;
  taskType: string;
  actorId: string;
  description?: string;
  urgent: boolean;
  details?: Record<string, unknown>;
}) {
  if(taskWorkflowPolicy(input.taskType).resubmit!=='structured') {
    throw new Error('Для этого типа задачи предусмотрена специальная форма повторной отправки');
  }
  return resubmitTaskToAccounting(input.taskId,{
    actorId:input.actorId,
    description:input.description,
    urgent:input.urgent,
    details:input.details,
  });
}
