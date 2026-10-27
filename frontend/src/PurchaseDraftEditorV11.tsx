/* MSM V11: manager can edit supplier and payment request amount only before any accounting payment task exists. */
import { useEffect, useState } from 'react';
import { updateSupplierPurchase } from './api';
import { formatMoneyInput, parseMoneyInput } from './shared/formatters';
import type { CurrentUser, SupplierPurchase } from './types';

type Props = {
  dealId: string;
  purchase: SupplierPurchase;
  user: CurrentUser;
  onChanged: () => void | Promise<void>;
};

function paymentTarget(purchase: SupplierPurchase): string {
  return String(purchase.requestedAmount ?? purchase.incomingInvoiceAmount ?? '');
}

export function PurchaseDraftEditorV11({ dealId, purchase, user, onChanged }: Props) {
  const canEdit = user.role !== 'ACCOUNTANT' &&
    purchase.status === 'DRAFT' &&
    (purchase.payments || []).length === 0 &&
    !(purchase.tasks || []).some(task => task.type === 'PAY_SUPPLIER');

  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState(purchase.supplierName);
  const [amount, setAmount] = useState(formatMoneyInput(paymentTarget(purchase)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSupplier(purchase.supplierName);
    setAmount(formatMoneyInput(paymentTarget(purchase)));
    setError('');
  }, [purchase.id, purchase.supplierName, purchase.requestedAmount, purchase.incomingInvoiceAmount]);

  if (!canEdit) return null;

  const parsedAmount = parseMoneyInput(amount);
  const initialAmount = Number(paymentTarget(purchase));
  const changed = supplier.trim() !== purchase.supplierName ||
    (parsedAmount !== undefined && Math.abs(parsedAmount - initialAmount) > 0.004);

  async function save() {
    setError('');
    const name = supplier.trim();
    const amountToSave = parseMoneyInput(amount);
    if (!name) { setError('Укажите завод или поставщика.'); return; }
    if (amountToSave === undefined || !Number.isFinite(amountToSave) || amountToSave <= 0) {
      setError('Сумма к оплате должна быть больше нуля.'); return;
    }
    setSaving(true);
    try {
      await updateSupplierPurchase(dealId, purchase.id, {
        supplierName: name,
        requestedAmount: amountToSave,
        actorId: user.id,
      });
      await onChanged();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return <div className="msmPurchaseDraftEditV11">
    <div className="msmPurchaseDraftEditBarV11">
      <span>До отправки бухгалтерии</span>
      <button type="button" className="secondary compactButton" aria-expanded={open}
        onClick={() => { setOpen(value => !value); setError(''); }}>
        {open ? 'Закрыть' : 'Изменить завод / сумму'}
      </button>
    </div>
    {open && <div className="msmPurchaseDraftEditBodyV11">
      <div className="msmPurchaseDraftEditGridV11">
        <label>Завод / поставщик
          <input value={supplier} disabled={saving} onChange={(e: { target: { value: string } }) => setSupplier(e.target.value)}
            placeholder="Например: ДЗГИ" />
        </label>
        <label>Сумма к оплате, ₽
          <input inputMode="decimal" value={amount} disabled={saving}
            onChange={(e: { target: { value: string } }) => setAmount(formatMoneyInput(e.target.value))}
            placeholder="194 400" />
        </label>
      </div>
      <p className="msmPurchaseDraftHintV11">Сумма входящего счёта не меняется. Эта сумма будет передана бухгалтерии при создании задачи на оплату.</p>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="msmPurchaseDraftEditActionsV11">
        <button type="button" className="secondary" disabled={saving} onClick={() => {
          setSupplier(purchase.supplierName);
          setAmount(formatMoneyInput(paymentTarget(purchase)));
          setError(''); setOpen(false);
        }}>Отмена</button>
        <button type="button" className="primary" disabled={saving || !changed}
          onClick={() => { void save(); }}>
          {saving ? 'Сохраняем…' : 'Сохранить изменения'}
        </button>
      </div>
    </div>}
  </div>;
}
