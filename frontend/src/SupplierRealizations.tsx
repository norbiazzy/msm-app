import { useEffect, useState } from 'react';
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
