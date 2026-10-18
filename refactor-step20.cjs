/*
 * MSM step 20 — shared task workflow contracts (phase 1).
 * Exact reviewed baseline: main c3bc87230266cc53126f7a4083189653404f4571
 * Changes: taskWorkflow.ts, ReturnToManagerPanel.tsx, ManagerResubmitPanel.tsx.
 * Does NOT overwrite step 19 local changes in InvoiceRequestTaskPanel/TasksView.
 * Requires frontend TypeScript+Vite build before retaining any changes.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync}=require('node:child_process');
const root=__dirname;
const targets=[
  {name:'frontend/src/ReturnToManagerPanel.tsx',hash:'b55aa405'},
  {name:'frontend/src/ManagerResubmitPanel.tsx',hash:'7e2ab902'},
];
const newName='frontend/src/taskWorkflow.ts';
function digest(s){let v=2166136261;for(let i=0;i<s.length;i++)v=Math.imul(v^s.charCodeAt(i),16777619)>>>0;return v.toString(16).padStart(8,'0');}
function replaceOnce(source,from,to,label){const p=source.indexOf(from);if(p<0||source.indexOf(from,p+1)!==-1)throw new Error('No unique anchor for '+label);return source.slice(0,p)+to+source.slice(p+from.length);}
function rangeOnce(source,from,to,insert,label){const p=source.indexOf(from);const q=source.indexOf(to,p+from.length);if(p<0||q<0||source.indexOf(from,p+1)!==-1||source.indexOf(to,q+1)!==-1)throw new Error('No unique range for '+label);return source.slice(0,p)+insert+source.slice(q);}
const core=`/*
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
`;

function patchReturn(s){
  s=rangeOnce(s,"import {\n  returnInvoiceRequest,\n  returnTaskToManager,\n} from './api';",'export function ReturnToManagerPanel({',`import { TASK_RETURN_REASONS, returnTaskForCorrection, validateTaskReturnReason, type TaskReturnReasonCode } from './taskWorkflow';\n\n`, 'return panel imports/reason options');
  s=replaceOnce(s,"  mode = 'generic',\n  onReturned,","  mode = 'generic',\n  taskType,\n  onReturned,",'return panel arguments');
  s=replaceOnce(s,"  mode?: 'generic' | 'invoice';\n  onReturned:","  mode?: 'generic' | 'invoice';\n  taskType?: string;\n  onReturned:",'return panel props');
  s=replaceOnce(s,'    ReasonCode\n','    TaskReturnReasonCode\n','return panel reason type');
  s=replaceOnce(s,"    if (\n      reasonCode ===\n        'OTHER' &&\n      !normalizedComment\n    ) {\n\n      setError(\n        'Для причины «Другое» добавьте комментарий.'\n      );\n\n      return;\n    }", "    const validationError = validateTaskReturnReason(reasonCode,normalizedComment);\n    if (validationError) {\n      setError(validationError);\n      return;\n    }", 'return panel validation');
  s=rangeOnce(s,"      const payload = {\n        actorId,", "      setOpen(false);\n\n      setReasonCode(",`      await returnTaskForCorrection({\n        taskId,\n        taskType: taskType || (mode === 'invoice' ? 'ISSUE_CLIENT_INVOICE' : 'OTHER'),\n        actorId,\n        reasonCode,\n        comment: normalizedComment || undefined,\n      });\n\n`, 'return panel unified API adapter');
  s=replaceOnce(s,'{reasons.map(', '{TASK_RETURN_REASONS.map(', 'return panel reason options');
  return s;
}
function patchManager(s){
  s=replaceOnce(s,"import {\n  resubmitTaskToAccounting,\n} from './api';", "import { resubmitStructuredTask, taskAttachmentCategory, taskResubmitTitle } from './taskWorkflow';",'manager API adapter import');
  s=rangeOnce(s,'    /* PART_V062_POA_RESUBMIT_DETAILS */','    return {',`    // Retain every existing field, including type-specific metadata not\n    // represented by visible inputs. Never throw away task details.\n    const taskDetails = { ...(initialDetails || {}), ...details };\n\n`,'preserve existing task details');
  s=replaceOnce(s,`        await resubmitTaskToAccounting(\n          taskId,\n          data,\n        );`,`        await resubmitStructuredTask({ taskId, taskType, ...data });`,'manager no-file resubmit');
  s=rangeOnce(s,"      title:\n        taskType ===", "      successTitle:","      title: taskResubmitTitle(taskType),\n\n",'manager common title');
  s=replaceOnce(s, "      taskId,\n      dealId,\n\n      title:", "      taskId,\n      dealId,\n      scope: 'TASK',\n\n      title:", 'explicit task upload scope');
  s=replaceOnce(s,"              'TASK_ATTACHMENT_' +\n                taskId,", "              taskAttachmentCategory(taskId),",'shared task file category');
  s=replaceOnce(s,`          await resubmitTaskToAccounting(\n            taskId,\n            data,\n          );`,`          await resubmitStructuredTask({ taskId, taskType, ...data });`,'manager file resubmit');
  return s;
}

function run(){
  const newPath=path.join(root,newName);
  if(fs.existsSync(newPath)) throw new Error(newName+' already exists. No files changed.');
  const originals=new Map(); const outputs=new Map();
  for(const target of targets){
    const full=path.join(root,target.name);
    if(!fs.existsSync(full)) throw new Error('Missing '+target.name+'. Place script at repository root.');
    const raw=fs.readFileSync(full,'utf8');
    const normalized=raw.replace(/\r\n/g,'\n');
    if(digest(normalized)!==target.hash) throw new Error(`Local ${target.name} differs from reviewed GitHub version (${digest(normalized)} != ${target.hash}). No files changed.`);
    originals.set(full,raw);
    outputs.set(full,(target.name.includes('ReturnToManager')?patchReturn(normalized):patchManager(normalized)).replace(/\n/g,raw.includes('\r\n')?'\r\n':'\n'));
  }
  const createdDirs=[];
  try{
    for(const [full,source] of outputs)fs.writeFileSync(full,source,'utf8');
    fs.writeFileSync(newPath,core,'utf8');
    console.log('[MSM step20] Shared task lifecycle adapter created. Building frontend...');
    const cmd=process.platform==='win32'?'npm.cmd':'npm';
    const result=spawnSync(cmd,['run','build'],{cwd:path.join(root,'frontend'),stdio:'inherit',shell:process.platform==='win32'});
    if(result.status!==0||result.error)throw new Error('Frontend TypeScript/Vite build failed');
    const diff=spawnSync('git',['diff','--check'],{cwd:root,stdio:'inherit'});
    if(diff.status!==0||diff.error)throw new Error('git diff --check failed');
    console.log('SUCCESS: step 20 compiled. Check task returns and generic resubmission in browser. Do not commit yet.');
  }catch(e){
    for(const [full,source] of originals)fs.writeFileSync(full,source,'utf8');
    if(fs.existsSync(newPath))fs.unlinkSync(newPath);
    console.error('[MSM step20] Changes rolled back: '+e.message);process.exitCode=1;
  }
}
try{run()}catch(e){console.error('[MSM step20] '+e.message);process.exitCode=1;}
