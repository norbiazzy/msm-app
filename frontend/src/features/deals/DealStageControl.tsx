import { AutoTextarea } from '../../AutoTextarea';
import { useEffect, useState } from 'react';
import type { CurrentUser, Deal } from '../../types';
import { updateDealWorkflowStage } from '../../api';
import { dealStageOptions, visibleDealStage } from './dealStages';
import type { DealStage } from './dealStages';

export function DealStageControl({ deal, user, onChanged }: { deal: Deal; user: CurrentUser; onChanged: () => Promise<void> }) {
  const [manual, setManual] = useState(deal.workflowMode === 'MANUAL');
  const [stage, setStage] = useState<DealStage>(visibleDealStage(deal));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [msmStageExpanded, setMsmStageExpanded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setManual(deal.workflowMode === 'MANUAL'); setStage(visibleDealStage(deal)); setReason(''); }, [deal.workflowMode, deal.workflowStage, deal.invoices, deal.tasks]);
  const allowed = user.role === 'ADMIN' || user.role === 'LEADER' || (user.role === 'MANAGER' && deal.managerId === user.id);
  async function save(mode: 'AUTO' | 'MANUAL', next: DealStage) {
    if (!allowed) return;
    setSaving(true); setError('');
    try {
      await updateDealWorkflowStage(deal.id, { actorId: user.id, mode, stage: mode === 'MANUAL' ? next : undefined, reason: reason.trim() || undefined });
      await onChanged();
      setMsmStageExpanded(false);
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }
  const current = visibleDealStage(deal);
  return (
    <section className="msmDealStage" aria-label="Этап сделки">
      <div className="msmDealStageTop"><div><small>Этап сделки</small><strong>{dealStageOptions.find(s => s.value === current)?.label}</strong></div>
        <span>{deal.workflowMode === 'MANUAL' ? 'Вручную' : 'Авто'}</span>
        {allowed && <button type="button" className="msmStageToggle" aria-expanded={msmStageExpanded} onClick={() => setMsmStageExpanded(value => !value)}>{msmStageExpanded ? 'Скрыть настройки' : 'Изменить этап'}</button>}</div>
      {allowed && msmStageExpanded && <div className="msmDealStageControls">
        <label><input type="checkbox" checked={!manual} onChange={e => { setManual(!e.target.checked); setReason(''); }} /> Автоматический режим</label>
        {manual && <label>Установить этап
          <select value={stage} onChange={e => {setStage(e.target.value as DealStage);setReason('');}}>
            {dealStageOptions.map(s => <option value={s.value} key={s.value}>{s.label}</option>)}
          </select></label>}
        {manual && (stage === 'CANCELLED' || stage === 'SHIPPED') && <label>{stage === 'SHIPPED' ? 'Подтверждение фактической отгрузки' : 'Причина отмены'}
          <AutoTextarea value={reason} onChange={e => setReason(e.target.value)} placeholder={stage === 'SHIPPED' ? 'Номер реализации / дата / подтверждение менеджера' : 'Почему отменили сделку'} /></label>}
        <button className="secondary" disabled={saving || (!manual && deal.workflowMode !== 'MANUAL') || (manual && ['CANCELLED','SHIPPED'].includes(stage) && stage !== deal.workflowStage && !reason.trim())} type="button" onClick={() => save(manual ? 'MANUAL' : 'AUTO', stage)}>{saving ? 'Сохраняем…' : 'Сохранить этап'}</button>
      </div>}
      {deal.workflowReason && (deal.workflowStage === 'CANCELLED' || deal.workflowStage === 'SHIPPED') && <small>Основание: {deal.workflowReason}</small>}
      {current === 'DELIVERY' && <small>Назначен транспорт: подготовка к отгрузке. Отгрузку подтверждает менеджер.</small>}
      {error && <div className="error">{error}</div>}
    </section>
  );
}
