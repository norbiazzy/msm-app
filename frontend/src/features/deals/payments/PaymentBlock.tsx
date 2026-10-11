import { useEffect, useState } from 'react';
import { Field } from '../../../shared/Field';
import { formatMoneyInput, money, parseMoneyInput, paymentMethodLabel, paymentStatusLabel } from '../../../shared/formatters';
import { SingleFilePicker } from '../../../MultiFilePicker';
import { startBackgroundUploadJob } from '../../../backgroundUploads';
import { addClientPayment, dealFileUrl, updatePaymentStatus } from '../../../api';
import type { ClientPaymentMethod, CurrentUser, Deal, PaymentStatus } from '../../../types';

export function PaymentBlock({ deal, user, onChanged }: { deal: Deal; user: CurrentUser; onChanged: () => Promise<void> }) {
  const [editingStatus, setEditingStatus] = useState(false);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>(deal.paymentStatus);
  const [deferralStartAt, setDeferralStartAt] = useState(deal.deferralStartAt?.slice(0, 10) || '');
  const [deferralEndAt, setDeferralEndAt] = useState(deal.deferralEndAt?.slice(0, 10) || '');
  const [deferralTerms, setDeferralTerms] = useState(deal.deferralTerms || '');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<ClientPaymentMethod>('NONCASH');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStatus(deal.paymentStatus);
    setDeferralStartAt(deal.deferralStartAt?.slice(0, 10) || '');
    setDeferralEndAt(deal.deferralEndAt?.slice(0, 10) || '');
    setDeferralTerms(deal.deferralTerms || '');
  }, [deal.paymentStatus, deal.deferralStartAt, deal.deferralEndAt, deal.deferralTerms]);

  const payments = deal.clientPayments || [];
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  async function saveStatus() {
    setSaving(true); setError('');
    try {
      await updatePaymentStatus(deal.id, {
        status,
        actorId: user.id,
        deferralStartAt: status === 'DEFERRED' ? deferralStartAt || undefined : undefined,
        deferralEndAt: status === 'DEFERRED' ? deferralEndAt || undefined : undefined,
        deferralTerms: status === 'DEFERRED' ? deferralTerms || undefined : undefined,
      });
      setEditingStatus(false);
      await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  async function addPayment() {
    setError('');

    const amountToSave =
      parseMoneyInput(amount) || 0;

    const paidAtToSave =
      paidAt;

    const methodToSave =
      method;

    const commentToSave =
      comment.trim() ||
      undefined;

    const fileToUpload =
      file;

    if (fileToUpload) {
      startBackgroundUploadJob({
        dealId: deal.id,
        scope: 'DEAL',
        title:
          'Загружаем подтверждение оплаты',
        successTitle:
          'Оплата клиента сохранена',
        subtitle:
          deal.clientName,
        files: [fileToUpload],

        run: async ({
          upload,
          setProgress,
        }) => {
          const uploaded =
            await upload(
              deal.id,
              fileToUpload,
              'CLIENT_PAYMENT',
              0,
              1,
            );

          setProgress(94);

          await addClientPayment(
            deal.id,
            {
              amount:
                amountToSave,
              paidAt:
                paidAtToSave,
              method:
                methodToSave,
              comment:
                commentToSave,
              actorId:
                user.id,
              fileId:
                uploaded.id,
            }
          );

          setProgress(99);
          await onChanged();
        },
      });

      setAmount('');
      setComment('');
      setFile(null);
      setAdding(false);
      return;
    }

    setSaving(true);

    try {
      await addClientPayment(
        deal.id,
        {
          amount:
            amountToSave,
          paidAt:
            paidAtToSave,
          method:
            methodToSave,
          comment:
            commentToSave,
          actorId:
            user.id,
        }
      );

      setAmount('');
      setComment('');
      setFile(null);
      setAdding(false);
      await onChanged();

    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );

    } finally {
      setSaving(false);
    }
  }

  return <div className="paymentBox">
    <div className="paymentHead">
      <div>
        <span>Оплата клиента</span>
        <strong>{paymentStatusLabel(deal.paymentStatus)}</strong>
      </div>
      {total > 0 && <b>{money(total)}</b>}
    </div>

    {deal.paymentStatus === 'DEFERRED' && <div className="deferralSummary">
      Отсрочка: {deal.deferralStartAt ? new Date(deal.deferralStartAt).toLocaleDateString('ru-RU') : '—'}
      {' → '}
      {deal.deferralEndAt ? new Date(deal.deferralEndAt).toLocaleDateString('ru-RU') : '—'}
      {deal.deferralTerms && <span>{deal.deferralTerms}</span>}
    </div>}

    <div className="paymentActions">
      <button className="secondary" type="button" onClick={() => setEditingStatus((v) => !v)}>Статус</button>
      <button className="primary" type="button" onClick={() => setAdding((v) => !v)}>+ Платёж</button>
    </div>

    {editingStatus && <div className="paymentForm">
      <Field title="Статус оплаты">
        <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
          <option value="NO_PREPAYMENT">Без предоплаты</option>
          <option value="WAITING">Ожидаем оплату</option>
          <option value="ADVANCE">Аванс</option>
          <option value="PAID">Оплачен</option>
          <option value="DEFERRED">Отсрочка</option>
        </select>
      </Field>
      {status === 'DEFERRED' && <>
        <div className="inline"><Field title="Начало"><input type="date" value={deferralStartAt} onChange={(e) => setDeferralStartAt(e.target.value)} /></Field><Field title="Окончание"><input type="date" value={deferralEndAt} onChange={(e) => setDeferralEndAt(e.target.value)} /></Field></div>
        <Field title="Условия отсрочки"><textarea rows={2} value={deferralTerms} onChange={(e) => setDeferralTerms(e.target.value)} placeholder="Например: 14 календарных дней после отгрузки" /></Field>
      </>}
      <button className="primary wide" type="button" disabled={saving} onClick={saveStatus}>Сохранить статус</button>
    </div>}

    {adding && <div className="paymentForm">
      <div className="inline"><Field title="Сумма"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(formatMoneyInput(e.target.value))} placeholder="100 000" /></Field><Field title="Дата"><input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></Field></div>
      <Field title="Способ"><select value={method} onChange={(e) => setMethod(e.target.value as ClientPaymentMethod)}><option value="NONCASH">Безнал</option><option value="CASH">Наличными</option><option value="CARD">Пластик</option><option value="ADVANCE">Аванс</option></select></Field>
      <Field title="Комментарий"><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: часть оплаты по счёту" /></Field>
      <Field title="Подтверждение оплаты">
        <SingleFilePicker
          file={file}
          onChange={setFile}
          title="+ Прикрепить подтверждение оплаты"
          accept="application/pdf,image/*"
        />
      </Field>
      <button className="primary wide" type="button" disabled={saving} onClick={addPayment}>Добавить платёж</button>
    </div>}

    {payments.length > 0 && <div className="paymentList">{payments.map((payment) => <div className="paymentRow" key={payment.id}><div><b>{money(payment.amount)}</b><span>{new Date(payment.paidAt).toLocaleDateString('ru-RU')} · {paymentMethodLabel(payment.method)}</span>{payment.comment && <em>{payment.comment}</em>}</div>{payment.fileId && <a href={dealFileUrl(payment.fileId)} target="_blank" rel="noreferrer">Файл</a>}</div>)}</div>}
    {error && <div className="error">{error}</div>}
  </div>;
}
