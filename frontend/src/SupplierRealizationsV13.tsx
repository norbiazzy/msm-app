/* MSM_REALIZATIONS_V13: Always-visible realizations; no "there will be none" toggle. */
import { useEffect, useState } from 'react';
import type { CurrentUser, SupplierPurchase } from './types';
import {
  addSupplierRealization,
  editSupplierRealization,
  deleteSupplierRealization,
  setSupplierNoRealizations,
} from './api';

type Props = {
  dealId: string;
  purchase: SupplierPurchase;
  user: CurrentUser;
  onChanged: () => void | Promise<void>;
};

export function SupplierRealizations({ dealId, purchase, user, onChanged }: Props) {
  const rows = purchase.realizations ?? [];
  const canEdit = ['MANAGER', 'ACCOUNTANT', 'LEADER', 'ADMIN'].includes(user.role);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDrafts(Object.fromEntries(rows.map(row => [row.id, row.number])));
  }, [purchase.id, purchase.realizations]);

  const filled = rows.filter(row => row.number.trim()).length;
  const label = !rows.length
    ? 'Не добавлены'
    : filled === rows.length
      ? `Заполнено ${filled} из ${rows.length}`
      : `Ожидаем номера · ${rows.length - filled}`;

  async function change(run: () => Promise<unknown>) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await run();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function addRow() {
    // Existing records may still have the old flag set by earlier versions.
    // Clear it only on an explicit Add click, then create the requested row.
    if (purchase.noRealizations) {
      await setSupplierNoRealizations(dealId, purchase.id, user.id, false);
    }
    await addSupplierRealization(dealId, purchase.id, user.id);
  }

  return <section className="msmSupplierRealizations msmSupplierRealizationsV13" aria-label="Реализации поставщика">
    <div className="msmSupplierRealizationsHead">
      <strong>Реализации</strong><span>{label}</span>
    </div>
    {rows.map((row, index) => {
      const next = drafts[row.id] ?? row.number;
      const changed = next.trim() !== row.number.trim();
      return <div className="msmSupplierRealizationRow" key={row.id}>
        <input
          aria-label={`Номер реализации ${index + 1}`}
          placeholder="Номер реализации"
          value={next}
          disabled={!canEdit || saving}
          onChange={e => setDrafts(prev => ({ ...prev, [row.id]: e.target.value }))}
        />
        {canEdit && <button type="button" className="secondary" disabled={saving || !changed}
          onClick={() => { void change(() => editSupplierRealization(dealId, purchase.id, row.id, user.id, next.trim())); }}>
          Сохранить
        </button>}
        {canEdit && <button type="button" className="secondary msmRealizationDeleteV13" disabled={saving}
          onClick={() => {
            if (row.number.trim() && !window.confirm(`Удалить реализацию №${row.number}? Изменение сохранится в истории.`)) return;
            void change(() => deleteSupplierRealization(dealId, purchase.id, row.id, user.id));
          }}>Удалить</button>}
      </div>;
    })}
    {canEdit && <button type="button" className="secondary msmRealizationAddV13" disabled={saving}
      onClick={() => { void change(addRow); }}>+ Реализация</button>}
    {error && <div className="error" role="alert">{error}</div>}
  </section>;
}
