import { useEffect, useState } from 'react';
import { Field } from '../../../shared/Field';
import { formatMoneyInput, money, parseMoneyInput, paymentMethodLabel } from '../../../shared/formatters';
import { SingleFilePicker } from '../../../MultiFilePicker';
import { startBackgroundUploadJob } from '../../../backgroundUploads';
import { addClientPayment, dealFileUrl, updatePaymentStatus } from '../../../api';
import { clientPaymentSummary, paymentTermsStatus } from '../../../clientPaymentSummary';
import type { ClientPaymentMethod, CurrentUser, Deal, PaymentStatus } from '../../../types';

function localToday() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

type TermsStatus = ReturnType<typeof paymentTermsStatus>;

export function PaymentBlock({ deal, user, onChanged }: { deal: Deal; user: CurrentUser; onChanged: () => Promise<void> }) {
  const [editingStatus, setEditingStatus] = useState(false);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<TermsStatus>(paymentTermsStatus(deal.paymentStatus));
  const [deferralStartAt, setDeferralStartAt] = useState(deal.deferralStartAt?.slice(0, 10) || '');
  const [deferralEndAt, setDeferralEndAt] = useState(deal.deferralEndAt?.slice(0, 10) || '');
  const [deferralTerms, setDeferralTerms] = useState(deal.deferralTerms || '');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(localToday());
  const [method, setMethod] = useState<ClientPaymentMethod>('NONCASH');
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStatus(paymentTermsStatus(deal.paymentStatus));
    setDeferralStartAt(deal.deferralStartAt?.slice(0, 10) || '');
    setDeferralEndAt(deal.deferralEndAt?.slice(0, 10) || '');
    setDeferralTerms(deal.deferralTerms || '');
  }, [deal.paymentStatus, deal.deferralStartAt, deal.deferralEndAt, deal.deferralTerms]);

  const overview = clientPaymentSummary(deal);
  const payments = [...(deal.clientPayments || [])].sort((a, b) =>
    (b.paidAt || '').localeCompare(a.paidAt || ''));

  async function saveStatus() {
    setError('');
    if (status === 'DEFERRED' && !deferralEndAt) {
      setError('Укажите дату окончания отсрочки.'); return;
    }
    if (status === 'DEFERRED' && deferralStartAt && deferralEndAt < deferralStartAt) {
      setError('Дата окончания отсрочки не может быть раньше начала.'); return;
    }
    setSaving(true);
    try {
      await updatePaymentStatus(deal.id, {
        status: status as PaymentStatus,
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
    const amountToSave = parseMoneyInput(amount);
    if (typeof amountToSave !== 'number' || !Number.isFinite(amountToSave) || amountToSave <= 0) {
      setError('Введите сумму поступления больше нуля.'); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || Number.isNaN(Date.parse(paidAt))) {
      setError('Укажите корректную дату поступления.'); return;
    }
    const paidAtToSave = paidAt;
    const methodToSave = method;
    const commentToSave = comment.trim() || undefined;
    const fileToUpload = file;

    if (fileToUpload) {
      startBackgroundUploadJob({
        dealId: deal.id,
        scope: 'DEAL',
        title: 'Загружаем подтверждение оплаты',
        successTitle: 'Оплата клиента сохранена',
        subtitle: deal.clientName,
        files: [fileToUpload],
        run: async ({ upload, setProgress }) => {
          const uploaded = await upload(deal.id, fileToUpload, 'CLIENT_PAYMENT', 0, 1);
          setProgress(94);
          await addClientPayment(deal.id, {
            amount: amountToSave, paidAt: paidAtToSave, method: methodToSave,
            comment: commentToSave, actorId: user.id, fileId: uploaded.id,
          });
          setProgress(99);
          await onChanged();
        },
      });
      setAmount(''); setComment(''); setFile(null); setAdding(false); return;
    }

    setSaving(true);
    try {
      await addClientPayment(deal.id, {
        amount: amountToSave, paidAt: paidAtToSave, method: methodToSave,
        comment: commentToSave, actorId: user.id,
      });
      setAmount(''); setComment(''); setFile(null); setAdding(false);
      await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return (
    <section className="paymentBox clientPayBox" aria-label="Оплата клиента">
      <div className="clientPayHead">
        <div>
          <span className="clientPayEyebrow">Расчёты по сделке</span>
          <h3>Оплата клиента</h3>
          <p>Учёт поступлений и условий оплаты</p>
        </div>
        <span className={'clientPayStatus clientPayStatus--' + overview.tone}>{overview.label}</span>
      </div>

      <div className="clientPayStats">
        <div><span>Сумма текущего счёта</span><strong>{overview.target === null ? 'Не указана' : money(overview.target)}</strong></div>
        <div><span>Поступило</span><strong>{money(overview.received)}</strong></div>
        <div><span>Осталось получить</span><strong>{overview.remaining === null ? '—' : money(overview.remaining)}</strong></div>
      </div>
      {overview.progress !== null && (
        <div className="clientPayProgress" aria-label={'Оплачено ' + overview.progress + '%'}>
          <div className="clientPayProgressTrack"><span style={{ width: overview.progress + '%' }} /></div>
          <small>{overview.progress}% от суммы счёта</small>
        </div>
      )}
      {overview.excess > 0 && <p className="clientPayNotice">Переплата: {money(overview.excess)}. Проверьте назначение поступления.</p>}
      {overview.target === null && <p className="clientPayNotice">Сумма текущего счёта не указана. Статус «Оплачено полностью» будет определяться после её заполнения.</p>}
      {overview.stalePaidStatus && <p className="clientPayNotice clientPayNotice--warning">Ранее был установлен статус «Оплачен», но зарегистрированные поступления не покрывают счёт. Проверьте данные.</p>}

      {deal.paymentStatus === 'DEFERRED' && overview.remaining !== 0 && (
        <div className="clientPayDeferral">
          <strong>Условия отсрочки</strong>
          <span>{deal.deferralStartAt?.slice(0, 10) || 'Дата начала не указана'} → {deal.deferralEndAt?.slice(0, 10) || 'Дата окончания не указана'}</span>
          {deal.deferralTerms && <p>{deal.deferralTerms}</p>}
        </div>
      )}

      <div className="clientPayActions">
        <button type="button" className="secondary" disabled={saving} aria-expanded={editingStatus}
          onClick={() => { setEditingStatus((v) => !v); setAdding(false); setError(''); }}>Условия оплаты</button>
        <button type="button" className="primary" disabled={saving} aria-expanded={adding}
          onClick={() => { setAdding((v) => !v); setEditingStatus(false); setError(''); }}>+ Добавить поступление</button>
      </div>

      {editingStatus && (
        <div className="paymentForm clientPayEditor">
          <strong>Условия расчётов с клиентом</strong>
          <p>«Аванс», «Частично оплачено» и «Оплачено» определяются по зарегистрированным поступлениям.</p>
          <Field title="Условия оплаты">
            <select value={status} onChange={(e) => setStatus(e.target.value as TermsStatus)}>
              <option value="NO_PREPAYMENT">Без предоплаты</option>
              <option value="WAITING">Ожидаем оплату</option>
              <option value="DEFERRED">Отсрочка</option>
            </select>
          </Field>
          {status === 'DEFERRED' && (
            <>
              <div className="inline">
                <Field title="Дата начала"><input type="date" value={deferralStartAt} onChange={(e) => setDeferralStartAt(e.target.value)} /></Field>
                <Field title="Оплатить до"><input type="date" value={deferralEndAt} onChange={(e) => setDeferralEndAt(e.target.value)} /></Field>
              </div>
              <Field title="Условия отсрочки"><textarea rows={2} value={deferralTerms} onChange={(e) => setDeferralTerms(e.target.value)} placeholder="Например: 14 календарных дней после отгрузки" /></Field>
            </>
          )}
          <div className="clientPayEditorActions">
            <button className="secondary" type="button" disabled={saving} onClick={() => setEditingStatus(false)}>Отмена</button>
            <button className="primary" type="button" disabled={saving} onClick={saveStatus}>{saving ? 'Сохраняем…' : 'Сохранить условия'}</button>
          </div>
        </div>
      )}

      {adding && (
        <div className="paymentForm clientPayEditor">
          <strong>Новое поступление</strong>
          <div className="inline">
            <Field title="Сумма поступления, ₽"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(formatMoneyInput(e.target.value))} placeholder="100 000" /></Field>
            <Field title="Дата поступления"><input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></Field>
          </div>
          <Field title="Способ оплаты"><select value={method} onChange={(e) => setMethod(e.target.value as ClientPaymentMethod)}>
            <option value="NONCASH">Безналичный перевод</option><option value="CASH">Наличные</option>
            <option value="CARD">Карта</option><option value="ADVANCE">Авансовый платёж</option>
          </select></Field>
          <Field title="Комментарий"><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Например: частичная оплата по счёту" /></Field>
          <Field title="Подтверждение оплаты"><SingleFilePicker file={file} onChange={setFile} title="+ Прикрепить подтверждение" accept="application/pdf,image/*" /></Field>
          <div className="clientPayEditorActions">
            <button className="secondary" type="button" disabled={saving} onClick={() => setAdding(false)}>Отмена</button>
            <button className="primary" type="button" disabled={saving} onClick={addPayment}>{saving ? 'Сохраняем…' : 'Сохранить поступление'}</button>
          </div>
        </div>
      )}

      <div className="clientPayHistoryHead"><strong>История поступлений</strong><span>{payments.length} платежей</span></div>
      {payments.length === 0 ? <div className="clientPayEmpty">Поступлений по сделке пока нет</div> : (
        <div className="paymentList clientPayHistory">
          {payments.map((payment) => (
            <div className="paymentRow" key={payment.id}>
              <div><b>{money(payment.amount)}</b><span>{new Date(payment.paidAt).toLocaleDateString('ru-RU')} · {paymentMethodLabel(payment.method)}</span>{payment.comment && <em>{payment.comment}</em>}</div>
              {payment.fileId && <a href={dealFileUrl(payment.fileId)} target="_blank" rel="noreferrer">Подтверждение ↗</a>}
            </div>
          ))}
        </div>
      )}
      {error && <div className="error" role="alert">{error}</div>}
    </section>
  );
}
