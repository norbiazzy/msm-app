
'use strict';
/** Step35 revised: stages and per-purchase realization rows (manager/accountant). */
const fs=require('node:fs'), path=require('node:path'), {spawnSync}=require('node:child_process');
const root=process.cwd(), drafts=new Map(), created=[];
function rd(p){return fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n')}
function put(p,s){const f=path.join(root,p);if(!drafts.has(p))drafts.set(p,fs.existsSync(f)?fs.readFileSync(f):null);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s)}
function rep(p,from,to,label){let s=rd(p);if(s.split(from).length!==2)throw Error((label||p)+': ожидаемый фрагмент не найден однозначно');put(p,s.replace(from,to))}
function add(p,s){if(fs.existsSync(path.join(root,p)))throw Error('Файл уже существует: '+p);put(p,s)}
function run(cmd,args,cwd=root){const x=spawnSync(cmd,args,{cwd,shell:process.platform==='win32',stdio:'inherit',timeout:240000});if(x.error)throw x.error;if(x.status!==0)throw Error(cmd+' '+args.join(' ')+' failed with '+x.status)}
if(!fs.existsSync('backend/prisma/schema.prisma')||!fs.existsSync('frontend/src/features/deals/DealDetail.tsx'))throw Error('Запустите из корня msm-app');
try {
if(rd('backend/prisma/schema.prisma').includes('enum DealWorkflowStage'))throw Error('Этап 35 уже применён');
rep("backend/prisma/schema.prisma","enum DealStatus {","enum DealWorkflowStage {\n  PREPARING_QUOTE\n  REVIEW\n  AGREED\n  CANCELLED\n  PREPARING_SHIPMENT\n  DELIVERY\n  SHIPPED\n}\n\nenum DealWorkflowMode {\n  AUTO\n  MANUAL\n}\n\nenum DealStatus {");
rep("backend/prisma/schema.prisma","  status            DealStatus         @default(ACTIVE)","  status            DealStatus         @default(ACTIVE)\n  workflowMode      DealWorkflowMode   @default(AUTO)\n  workflowStage     DealWorkflowStage?\n  workflowReason    String?");
add("backend/prisma/migrations/20261015224500_deal_workflow_stages/migration.sql","-- MSM workflow stages independent of technical deal status.\nCREATE TYPE \"DealWorkflowMode\" AS ENUM ('AUTO', 'MANUAL');\nCREATE TYPE \"DealWorkflowStage\" AS ENUM ('PREPARING_QUOTE','REVIEW','AGREED','CANCELLED','PREPARING_SHIPMENT','DELIVERY','SHIPPED');\nALTER TABLE \"Deal\" ADD COLUMN \"workflowMode\" \"DealWorkflowMode\" NOT NULL DEFAULT 'AUTO';\nALTER TABLE \"Deal\" ADD COLUMN \"workflowStage\" \"DealWorkflowStage\";\nALTER TABLE \"Deal\" ADD COLUMN \"workflowReason\" TEXT;\n");
rep("backend/src/deals/deals.controller.ts","import { SellerType } from '@prisma/client';","import { SellerType, DealWorkflowStage, DealWorkflowMode } from '@prisma/client';");
rep("backend/src/deals/deals.controller.ts","  @Get(':id')","  @Patch(':id/workflow-stage')\n  changeWorkflowStage(\n    @Param('id') id: string,\n    @Body() body: { actorId: string; mode: DealWorkflowMode; stage?: DealWorkflowStage; reason?: string },\n  ) {\n    return this.deals.changeWorkflowStage(id, body);\n  }\n\n  @Get(':id')");
rep("backend/src/deals/deals.service.ts","  SellerType,\n  TaskStatus,","  SellerType,\n  DealWorkflowStage,\n  DealWorkflowMode,\n  TaskStatus,");
rep("backend/src/deals/deals.service.ts","  async create(\n    dto: CreateDealDto,","  async changeWorkflowStage(\n    id: string,\n    body: { actorId: string; mode: DealWorkflowMode; stage?: DealWorkflowStage; reason?: string },\n  ) {\n    if (!Object.values(DealWorkflowMode).includes(body.mode)) throw new BadRequestException('Неверный режим статусов');\n    if (body.mode === DealWorkflowMode.MANUAL && (!body.stage || !Object.values(DealWorkflowStage).includes(body.stage))) {\n      throw new BadRequestException('Укажите этап сделки');\n    }\n    const actor = await this.prisma.user.findUnique({ where: { id: body.actorId } });\n    const current = await this.prisma.deal.findUniqueOrThrow({ where: { id } });\n    if (!actor || !['MANAGER', 'LEADER', 'ADMIN'].includes(actor.role) ||\n      (actor.role === 'MANAGER' && current.managerId !== actor.id)) {\n      throw new BadRequestException('Изменить этап может только ответственный менеджер или руководитель');\n    }\n    if (body.mode === DealWorkflowMode.MANUAL && body.stage === DealWorkflowStage.SHIPPED && actor.role !== 'MANAGER') {\n      throw new BadRequestException('Отгрузку подтверждает только менеджер');\n    }\n    const protectedStage = current.workflowStage === DealWorkflowStage.CANCELLED ||\n      current.workflowStage === DealWorkflowStage.SHIPPED;\n    let stage = body.mode === DealWorkflowMode.MANUAL ? body.stage! : null;\n    if (body.mode === DealWorkflowMode.AUTO && protectedStage) stage = current.workflowStage;\n    const reason = body.reason?.trim() || '';\n    if (body.mode === DealWorkflowMode.MANUAL &&\n      (stage === DealWorkflowStage.CANCELLED || stage === DealWorkflowStage.SHIPPED) &&\n      current.workflowStage !== stage && !reason) {\n      throw new BadRequestException('Укажите подтверждение отгрузки или причину отмены');\n    }\n    return this.prisma.$transaction(async tx => {\n      const updated = await tx.deal.update({ where: { id }, data: {\n        workflowMode: body.mode, workflowStage: stage,\n        workflowReason: reason || (stage === current.workflowStage ? current.workflowReason : null),\n      } });\n      await tx.auditEvent.create({ data: {\n        dealId: id, actorId: body.actorId, action: 'DEAL_WORKFLOW_STAGE_CHANGED',\n        entityType: 'Deal', entityId: id,\n        oldValue: { mode: current.workflowMode, stage: current.workflowStage },\n        newValue: { mode: updated.workflowMode, stage: updated.workflowStage },\n        reason: reason || undefined,\n      } });\n      return updated;\n    });\n  }\n\n  async create(\n    dto: CreateDealDto,");
rep("frontend/src/types.ts","  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';","  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';\n  managerId?: string;\n  workflowMode?: 'AUTO' | 'MANUAL';\n  workflowStage?: 'PREPARING_QUOTE' | 'REVIEW' | 'AGREED' | 'CANCELLED' | 'PREPARING_SHIPMENT' | 'DELIVERY' | 'SHIPPED' | null;\n  workflowReason?: string | null;");
add("frontend/src/features/deals/dealStages.ts","import type { Deal } from '../../types';\nexport type DealStage = NonNullable<Deal['workflowStage']>;\nexport const dealStageOptions: { value: DealStage; label: string }[] = [\n  { value: 'PREPARING_QUOTE', label: 'Готовим КП' },\n  { value: 'REVIEW', label: 'На согласовании' },\n  { value: 'AGREED', label: 'Согласован' },\n  { value: 'CANCELLED', label: 'Отменён' },\n  { value: 'PREPARING_SHIPMENT', label: 'Оформляется' },\n  { value: 'DELIVERY', label: 'Доставка' },\n  { value: 'SHIPPED', label: 'Отгружен' },\n];\nexport function automaticDealStage(deal: Deal): DealStage {\n  const invoice = deal.invoices.find(i => i.isCurrent) || deal.invoices[0];\n  const activeCorrection = deal.tasks.some(t => t.type === 'CORRECT_CLIENT_INVOICE' && !['DONE','CANCELLED'].includes(t.status));\n  const started = deal.tasks.some(t => ['PAY_SUPPLIER','POWER_OF_ATTORNEY','ETRN'].includes(t.type || '') && t.status !== 'CANCELLED');\n  if (!invoice || activeCorrection || invoice.status === 'CORRECTION_REQUESTED' || invoice.status === 'WAITING_ACCOUNTING') {\n    // Once logistics has begun, a correction does not roll the deal back.\n    if (started) return 'PREPARING_SHIPMENT';\n    return 'PREPARING_QUOTE';\n  }\n  if (started) return 'PREPARING_SHIPMENT';\n  if (invoice.status === 'WAITING_MANAGER_REVIEW') return 'REVIEW';\n  if (invoice.status === 'CONFIRMED' || invoice.status === 'AGREED') return 'AGREED';\n  return 'PREPARING_QUOTE';\n}\nexport function visibleDealStage(deal: Deal): DealStage {\n  if (deal.workflowStage === 'SHIPPED' || deal.workflowStage === 'CANCELLED') return deal.workflowStage;\n  if (deal.workflowMode === 'MANUAL' && deal.workflowStage) return deal.workflowStage;\n  return automaticDealStage(deal);\n}\n");
add("frontend/src/features/deals/DealStageControl.tsx","import { useEffect, useState } from 'react';\nimport type { CurrentUser, Deal } from '../../types';\nimport { updateDealWorkflowStage } from '../../api';\nimport { dealStageOptions, visibleDealStage } from './dealStages';\nimport type { DealStage } from './dealStages';\n\nexport function DealStageControl({ deal, user, onChanged }: { deal: Deal; user: CurrentUser; onChanged: () => Promise<void> }) {\n  const [manual, setManual] = useState(deal.workflowMode === 'MANUAL');\n  const [stage, setStage] = useState<DealStage>(visibleDealStage(deal));\n  const [reason, setReason] = useState('');\n  const [saving, setSaving] = useState(false);\n  const [error, setError] = useState('');\n  useEffect(() => { setManual(deal.workflowMode === 'MANUAL'); setStage(visibleDealStage(deal)); setReason(''); }, [deal.workflowMode, deal.workflowStage, deal.invoices, deal.tasks]);\n  const allowed = user.role === 'ADMIN' || user.role === 'LEADER' || (user.role === 'MANAGER' && deal.managerId === user.id);\n  async function save(mode: 'AUTO' | 'MANUAL', next: DealStage) {\n    if (!allowed) return;\n    setSaving(true); setError('');\n    try {\n      await updateDealWorkflowStage(deal.id, { actorId: user.id, mode, stage: mode === 'MANUAL' ? next : undefined, reason: reason.trim() || undefined });\n      await onChanged();\n    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }\n    finally { setSaving(false); }\n  }\n  const current = visibleDealStage(deal);\n  return (\n    <section className=\"msmDealStage\" aria-label=\"Этап сделки\">\n      <div className=\"msmDealStageTop\"><div><small>Этап сделки</small><strong>{dealStageOptions.find(s => s.value === current)?.label}</strong></div>\n        <span>{deal.workflowMode === 'MANUAL' ? 'Вручную' : 'Авто'}</span></div>\n      {allowed && <div className=\"msmDealStageControls\">\n        <label><input type=\"checkbox\" checked={!manual} onChange={e => { setManual(!e.target.checked); setReason(''); }} /> Автоматический режим</label>\n        {manual && <label>Установить этап\n          <select value={stage} onChange={e => {setStage(e.target.value as DealStage);setReason('');}}>\n            {dealStageOptions.map(s => <option value={s.value} key={s.value}>{s.label}</option>)}\n          </select></label>}\n        {manual && (stage === 'CANCELLED' || stage === 'SHIPPED') && <label>{stage === 'SHIPPED' ? 'Подтверждение фактической отгрузки' : 'Причина отмены'}\n          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={stage === 'SHIPPED' ? 'Номер реализации / дата / подтверждение менеджера' : 'Почему отменили сделку'} /></label>}\n        <button className=\"secondary\" disabled={saving || (!manual && deal.workflowMode !== 'MANUAL') || (manual && ['CANCELLED','SHIPPED'].includes(stage) && stage !== deal.workflowStage && !reason.trim())} type=\"button\" onClick={() => save(manual ? 'MANUAL' : 'AUTO', stage)}>{saving ? 'Сохраняем…' : 'Сохранить этап'}</button>\n      </div>}\n      {deal.workflowReason && (deal.workflowStage === 'CANCELLED' || deal.workflowStage === 'SHIPPED') && <small>Основание: {deal.workflowReason}</small>}\n      {current === 'DELIVERY' && <small>Назначен транспорт: подготовка к отгрузке. Отгрузку подтверждает менеджер.</small>}\n      {error && <div className=\"error\">{error}</div>}\n    </section>\n  );\n}\n");
rep("frontend/src/api.ts","export async function getDeal(id: string): Promise<Deal> {","export async function updateDealWorkflowStage(dealId: string, body: {\n  actorId: string; mode: 'AUTO' | 'MANUAL'; stage?: NonNullable<Deal['workflowStage']>; reason?: string;\n}) {\n  return json<Deal>(`/deals/${dealId}/workflow-stage`, { method: 'PATCH', body: JSON.stringify(body) });\n}\n\nexport async function getDeal(id: string): Promise<Deal> {");
rep("frontend/src/features/deals/DealDetail.tsx","import { updateDealInfo, getDeal } from '../../api';","import { updateDealInfo, getDeal } from '../../api';\nimport { DealStageControl } from './DealStageControl';");
rep("frontend/src/features/deals/DealDetail.tsx","          <DealAttention deal={deal} />","          <DealAttention deal={deal} />\n          <DealStageControl deal={deal} user={user} onChanged={() => reload(false)} />");

// MSM_STEP35_REVISED_REALIZATIONS
rep('backend/prisma/schema.prisma','  payments SupplierPayment[]','  payments SupplierPayment[]\n  realizations SupplierRealization[]');
rep('backend/prisma/schema.prisma','model SupplierPayment {',`model SupplierRealization {
  id String @id @default(cuid())
  purchaseId String
  purchase SupplierPurchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  number String @default("")
  createdById String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([purchaseId, createdAt])
}

model SupplierPayment {`);
rep('backend/prisma/schema.prisma','  status SupplierPurchaseStatus @default(DRAFT)','  noRealizations Boolean @default(false)\n  status SupplierPurchaseStatus @default(DRAFT)');
add('backend/prisma/migrations/20261015224600_supplier_realizations/migration.sql',`ALTER TABLE "SupplierPurchase" ADD COLUMN "noRealizations" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "SupplierRealization" (
 "id" TEXT NOT NULL,
 "purchaseId" TEXT NOT NULL,
 "number" TEXT NOT NULL DEFAULT '',
 "createdById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "SupplierRealization_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierRealization_purchaseId_createdAt_idx" ON "SupplierRealization"("purchaseId", "createdAt");
ALTER TABLE "SupplierRealization" ADD CONSTRAINT "SupplierRealization_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "SupplierPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`);
rep('backend/src/purchases/purchases.service.ts','import {\n  BadRequestException,','import {\n  BadRequestException,');
rep('backend/src/purchases/purchases.service.ts','        include: {\n\n          payments: {','        include: {\n          realizations: { orderBy: { createdAt: \'asc\' } },\n\n          payments: {');
rep('backend/src/deals/deals.service.ts',"          supplierPurchases: {\n            orderBy: {\n              createdAt: 'asc',\n            },\n          },","          supplierPurchases: {\n            orderBy: {\n              createdAt: 'asc',\n            },\n            include: { realizations: { orderBy: { createdAt: 'asc' } } },\n          },");
rep('backend/src/purchases/purchases.service.ts','  async list(\n    dealId: string,',`  private async realizationAccess(dealId: string, purchaseId: string, actorId: string) {
    const purchase = await this.prisma.supplierPurchase.findFirstOrThrow({ where: { id: purchaseId, dealId } });
    const user = await this.prisma.user.findUnique({ where: { id: actorId } });
    if (!user || !['MANAGER','ACCOUNTANT','LEADER','ADMIN'].includes(user.role)) {
      throw new BadRequestException('Нет прав на изменение реализаций');
    }
    return purchase;
  }

  async addRealization(dealId: string, purchaseId: string, actorId: string) {
    const purchase = await this.realizationAccess(dealId, purchaseId, actorId);
    if (purchase.noRealizations) throw new BadRequestException('Сначала отмените отметку «Реализаций не будет»');
    return this.prisma.$transaction(async tx => {
      const row = await tx.supplierRealization.create({ data: { purchaseId, number: '', createdById: actorId } });
      await tx.auditEvent.create({ data: { dealId, actorId, action: 'SUPPLIER_REALIZATION_ADDED', entityType: 'SupplierRealization', entityId: row.id, newValue: { purchaseId, number: '' } } });
      return row;
    });
  }

  async editRealization(dealId: string, purchaseId: string, rowId: string, actorId: string, number: string) {
    await this.realizationAccess(dealId, purchaseId, actorId);
    const previous = await this.prisma.supplierRealization.findFirstOrThrow({ where: { id: rowId, purchaseId } });
    const nextNumber = typeof number === 'string' ? number.trim().slice(0, 120) : '';
    return this.prisma.$transaction(async tx => {
      const row = await tx.supplierRealization.update({ where: { id: previous.id }, data: { number: nextNumber } });
      await tx.auditEvent.create({ data: { dealId, actorId, action: 'SUPPLIER_REALIZATION_EDITED', entityType: 'SupplierRealization', entityId: row.id, oldValue: { number: previous.number }, newValue: { number: nextNumber } } });
      return row;
    });
  }

  async deleteRealization(dealId: string, purchaseId: string, rowId: string, actorId: string) {
    await this.realizationAccess(dealId, purchaseId, actorId);
    const previous = await this.prisma.supplierRealization.findFirstOrThrow({ where: { id: rowId, purchaseId } });
    return this.prisma.$transaction(async tx => {
      await tx.supplierRealization.delete({ where: { id: rowId } });
      await tx.auditEvent.create({ data: { dealId, actorId, action: 'SUPPLIER_REALIZATION_DELETED', entityType: 'SupplierRealization', entityId: rowId, oldValue: { number: previous.number, purchaseId } } });
      return { ok: true };
    });
  }

  async setNoRealizations(dealId: string, purchaseId: string, actorId: string, value: boolean) {
    const purchase = await this.realizationAccess(dealId, purchaseId, actorId);
    if (value) {
      const count = await this.prisma.supplierRealization.count({ where: { purchaseId } });
      if (count) throw new BadRequestException('Перед отметкой «Реализаций не будет» удалите строки реализаций');
    }
    return this.prisma.$transaction(async tx => {
      const updated = await tx.supplierPurchase.update({ where: { id: purchaseId }, data: { noRealizations: Boolean(value) } });
      await tx.auditEvent.create({ data: { dealId, actorId, action: 'SUPPLIER_REALIZATION_NONE_CHANGED', entityType: 'SupplierPurchase', entityId: purchaseId, oldValue: { noRealizations: purchase.noRealizations }, newValue: { noRealizations: Boolean(value) } } });
      return updated;
    });
  }

  async list(
    dealId: string,`);
rep('backend/src/purchases/purchases.controller.ts','  @Get()\n  list(',`  @Post(':purchaseId/realizations')
  addRealization(@Param('dealId') dealId: string, @Param('purchaseId') purchaseId: string, @Body() body: { actorId: string }) {
    return this.purchases.addRealization(dealId, purchaseId, body.actorId);
  }

  @Patch(':purchaseId/realizations/:realizationId')
  editRealization(@Param('dealId') dealId: string, @Param('purchaseId') purchaseId: string,
    @Param('realizationId') realizationId: string, @Body() body: { actorId: string; number: string }) {
    return this.purchases.editRealization(dealId, purchaseId, realizationId, body.actorId, body.number);
  }

  @Delete(':purchaseId/realizations/:realizationId')
  deleteRealization(@Param('dealId') dealId: string, @Param('purchaseId') purchaseId: string,
    @Param('realizationId') realizationId: string, @Body() body: { actorId: string }) {
    return this.purchases.deleteRealization(dealId, purchaseId, realizationId, body.actorId);
  }

  @Patch(':purchaseId/realizations-none')
  setNoRealizations(@Param('dealId') dealId: string, @Param('purchaseId') purchaseId: string,
    @Body() body: { actorId: string; value: boolean }) {
    return this.purchases.setNoRealizations(dealId, purchaseId, body.actorId, body.value);
  }

  @Get()
  list(`);
rep('frontend/src/types.ts','  payments: SupplierPayment[];','  payments: SupplierPayment[];\n  noRealizations?: boolean;\n  realizations?: { id: string; number: string; createdAt: string }[];');
rep('frontend/src/api.ts','export async function listDeals(managerId?: string): Promise<Deal[]> {',`export async function addSupplierRealization(dealId: string, purchaseId: string, actorId: string) {
 return json('/deals/'+dealId+'/suppliers/'+purchaseId+'/realizations', { method:'POST', body: JSON.stringify({actorId}) });
}
export async function editSupplierRealization(dealId: string, purchaseId: string, id: string, actorId: string, number: string) {
 return json('/deals/'+dealId+'/suppliers/'+purchaseId+'/realizations/'+id, { method:'PATCH', body:JSON.stringify({actorId,number}) });
}
export async function deleteSupplierRealization(dealId: string, purchaseId: string, id: string, actorId: string) {
 return json('/deals/'+dealId+'/suppliers/'+purchaseId+'/realizations/'+id, { method:'DELETE', body:JSON.stringify({actorId}) });
}
export async function setSupplierNoRealizations(dealId: string, purchaseId: string, actorId: string, value: boolean) {
 return json('/deals/'+dealId+'/suppliers/'+purchaseId+'/realizations-none', { method:'PATCH', body:JSON.stringify({actorId,value}) });
}

export async function listDeals(managerId?: string): Promise<Deal[]> {`);
add('frontend/src/SupplierRealizations.tsx',`import { useEffect, useState } from 'react';
import type { CurrentUser, SupplierPurchase } from './types';
import { addSupplierRealization, editSupplierRealization, deleteSupplierRealization, setSupplierNoRealizations } from './api';

export function SupplierRealizations({ dealId, purchase, user, onChanged }: {
  dealId: string; purchase: SupplierPurchase; user: CurrentUser; onChanged: () => void | Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const rows = purchase.realizations || [];
  const canEdit = ['MANAGER','ACCOUNTANT','LEADER','ADMIN'].includes(user.role);
  useEffect(() => { setDrafts(Object.fromEntries(rows.map(r => [r.id,r.number]))); }, [purchase.realizations]);
  const filled = rows.filter(r => r.number.trim()).length;
  const isTargetSupplier = /(?:ДЗГИ|БСР|БК)/i.test(purchase.supplierName);
  if (!isTargetSupplier && !rows.length && !purchase.noRealizations) return null;
  async function change(run: () => Promise<unknown>) {
    setSaving(true); setError('');
    try { await run(); await onChanged(); }
    catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }
  return <section className="msmSupplierRealizations">
    <div className="msmSupplierRealizationsHead"><strong>Реализации</strong><span>{purchase.noRealizations ? 'Реализаций не будет' : !rows.length ? 'Не добавлены' : filled === rows.length ? 'Реализация есть' : 'Ожидаем реализацию · '+(rows.length-filled)}</span></div>
    {!purchase.noRealizations && rows.map(row => <div className="msmSupplierRealizationRow" key={row.id}>
      <input aria-label="Номер реализации" placeholder="Ожидаем номер реализации" value={drafts[row.id] ?? row.number} disabled={!canEdit || saving}
        onChange={e => setDrafts(p => ({...p,[row.id]:e.target.value}))}
        onBlur={() => { const val=(drafts[row.id] ?? row.number).trim(); if(val!==row.number) void change(()=>editSupplierRealization(dealId,purchase.id,row.id,user.id,val)); }} />
      {canEdit && <button type="button" className="secondary" disabled={saving || (drafts[row.id] ?? row.number) === row.number} onClick={()=>change(()=>editSupplierRealization(dealId,purchase.id,row.id,user.id,drafts[row.id] ?? row.number))}>Сохранить</button>}
      {canEdit && <button type="button" className="secondary" disabled={saving} onClick={()=>{
        if(row.number.trim() && !window.confirm('Удалить реализацию №'+row.number+'? Изменение сохранится в истории.')) return;
        void change(()=>deleteSupplierRealization(dealId,purchase.id,row.id,user.id));
      }}>Удалить</button>}
    </div>)}
    {!purchase.noRealizations && canEdit && <button type="button" className="secondary" disabled={saving} onClick={()=>change(()=>addSupplierRealization(dealId,purchase.id,user.id))}>+ Реализация</button>}
    {canEdit && <label className="msmRealizationNone"><input type="checkbox" checked={Boolean(purchase.noRealizations)} disabled={saving || (!purchase.noRealizations && rows.length>0)} onChange={e=>change(()=>setSupplierNoRealizations(dealId,purchase.id,user.id,e.target.checked))} /> Реализаций не будет</label>}
    {!purchase.noRealizations && rows.some(r=>!r.number.trim()) && <small>Пустые строки сохраняются: требуется вписать номер реализации.</small>}
    {rows.length>0 && !purchase.noRealizations && <small>Заполнено {filled} из {rows.length}. Поля доступны менеджеру и бухгалтерии.</small>}
    {error && <div className="error">{error}</div>}
  </section>;
}
`);
rep('frontend/src/PurchasesBlock.tsx',"import { TaskContextStrip } from './TaskContextStrip';","import { TaskContextStrip } from './TaskContextStrip';\nimport { SupplierRealizations } from './SupplierRealizations';");
rep('frontend/src/PurchasesBlock.tsx','      <div className="purchaseCardTop">','      <div className="purchaseCardTop">');
// Insert in the purchase card after its status summary, before the optional comment.
rep('frontend/src/PurchasesBlock.tsx','      {purchase.comment && (\n\n        <div className="purchaseComment">',`      <SupplierRealizations dealId={deal.id} purchase={purchase} user={user} onChanged={onChanged} />

      {purchase.comment && (

        <div className="purchaseComment">`);
rep('frontend/src/styles.css','/* MSM_STEP29_UNIFIED_TASK_LAYOUT */',`/* MSM_STEP29_UNIFIED_TASK_LAYOUT */
/* MSM_STEP35_REVISED_REALIZATIONS */
.msmSupplierRealizations { margin: 12px 0; padding: 13px; border: 1px solid var(--bo-line,#ddd); border-radius: 12px; display: grid; gap: 10px; }
.msmSupplierRealizationsHead { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.msmSupplierRealizationsHead span,.msmSupplierRealizations small { opacity:.75; font-size: 12px; }
.msmSupplierRealizationRow { display:grid; grid-template-columns: minmax(100px,1fr) auto auto; gap: 6px; align-items: center; }
.msmSupplierRealizationRow input { min-width:0; }
.msmRealizationNone { display:flex; align-items:center; gap:7px; }
@media(max-width:520px){.msmSupplierRealizationRow {grid-template-columns:minmax(80px,1fr) auto auto;}}
/* END_MSM_STEP35_REVISED_REALIZATIONS */`);
console.log('[MSM step35 revised] Проверяем Prisma и сборку. Миграции не применяются.');
run('npx',['prisma','generate'],path.join(root,'backend'));
run('npm',['run','build'],path.join(root,'backend'));
run('npm',['run','build'],path.join(root,'frontend'));
run('git',['diff','--check']);
console.log('SUCCESS: подготовлены статусы сделки и реализации закупок. База не менялась.');
} catch(e) {
 console.error('ERROR:',e.message);
 for(const [name,b] of [...drafts.entries()].reverse()){
   const dest=path.join(root,name);if(b===null){if(fs.existsSync(dest))fs.unlinkSync(dest);}else fs.writeFileSync(dest,b);
 }
 if(drafts.size)console.error('ROLLBACK: исходные файлы восстановлены');
 process.exitCode=1;
}
