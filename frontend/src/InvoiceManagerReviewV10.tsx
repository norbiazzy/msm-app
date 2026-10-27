/* MSM v10 — Accountant uploads; manager approves extracted or manually entered invoice details. */
import { useEffect, useState } from 'react';
import { getDocumentRecognition, retryDocumentRecognition, reviewInvoiceDetails } from './api';
import type { Invoice } from './types';

type Result = { number?: unknown; amount?: unknown; issues?: unknown[] };
type Rec = { status?: string; errorText?: string | null; result?: Result | null } | null;
const validAmount = (raw: string): number | null => {
  const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

export function InvoiceManagerReviewV10({ dealId, invoice, actorId, onChanged }: {
  dealId: string;
  invoice: Invoice;
  actorId: string;
  onChanged: () => Promise<void>;
}) {
  const fileId = invoice.fileId || invoice.file?.id;
  const [recognition, setRecognition] = useState<Rec>(null);
  const [version, setVersion] = useState(0);
  const [number, setNumber] = useState(invoice.number && invoice.number !== 'Ожидает проверки' ? invoice.number : '');
  const [amount, setAmount] = useState(invoice.amount == null ? '' : String(invoice.amount));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNumber(invoice.number && invoice.number !== 'Ожидает проверки' ? invoice.number : '');
    setAmount(invoice.amount == null ? '' : String(invoice.amount));
    setDirty(false); setSaved(false); setError('');
  }, [invoice.id]);
  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const next = await getDocumentRecognition(fileId) as Rec;
        if (cancelled) return;
        setRecognition(next);
        if (next?.status === 'PENDING' || next?.status === 'PROCESSING') timer = setTimeout(load, 3000);
      } catch { if (!cancelled) setRecognition(null); }
    };
    void load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [fileId, version]);
  useEffect(() => {
    if (dirty || recognition?.status !== 'DONE' || !recognition.result) return;
    const parsed = recognition.result;
    if (!invoice.number || invoice.number === 'Ожидает проверки') {
      if (typeof parsed.number === 'string') setNumber(parsed.number);
    }
    if (invoice.amount == null && parsed.amount != null) setAmount(String(parsed.amount));
  }, [recognition, dirty, invoice.number, invoice.amount]);

  const retry = async () => {
    if (!fileId) return;
    setBusy(true); setError('');
    try { await retryDocumentRecognition(fileId); setRecognition({status:'PENDING'}); setVersion(v => v + 1); }
    catch (e) {setError(e instanceof Error ? e.message : String(e));}
    finally {setBusy(false);}
  };
  const save = async () => {
    const parsedAmount = validAmount(amount);
    const trimmed = number.trim();
    if (!trimmed || trimmed === 'Ожидает проверки') {setError('Укажите номер счёта из документа.');return;}
    if (parsedAmount === null) {setError('Укажите корректную сумму счёта больше нуля.');return;}
    setBusy(true);setError('');
    try {
      await reviewInvoiceDetails(dealId, invoice.id, {number: trimmed, amount: parsedAmount, actorId});
      setSaved(true); setDirty(false);
      await onChanged();
    } catch(e) {setError(e instanceof Error ? e.message : String(e));}
    finally {setBusy(false);}
  };
  return <section className="msmInvoiceManagerReview" aria-label="Проверка реквизитов счёта менеджером">
    <div className="msmInvoiceManagerReviewHead"><strong>Проверка реквизитов менеджером</strong><span>Перед подтверждением счёта</span></div>
    {recognition?.status === 'FAILED' && <div className="msmInvoiceReviewWarning">Распознавание завершилось ошибкой. Откройте оригинал, заполните реквизиты вручную или повторите обработку. <button type="button" disabled={busy} onClick={() => void retry()}>Повторить распознавание</button></div>}
    {(recognition?.status === 'PENDING' || recognition?.status === 'PROCESSING') && <p>Распознаём счёт… Можно заполнить поля вручную.</p>}
    {recognition?.status === 'DONE' && <p>Распознанные значения предложены для проверки. Они не сохраняются без вашего подтверждения.</p>}
    <div className="msmInvoiceReviewFields">
      <label>Номер счёта<input value={number} onChange={e => {setNumber(e.target.value);setDirty(true);setSaved(false);}} placeholder="Например: 1548" /></label>
      <label>Сумма счёта, ₽<input inputMode="decimal" value={amount} onChange={e => {setAmount(e.target.value);setDirty(true);setSaved(false);}} placeholder="420 000,00" /></label>
    </div>
    {Array.isArray(recognition?.result?.issues) && recognition.result.issues.length > 0 && <p className="msmInvoiceReviewWarning">Проверьте: {recognition.result.issues.map(String).join(' · ')}</p>}
    <button className="secondary" type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Сохраняем…' : saved ? 'Реквизиты сохранены ✓' : 'Сохранить проверенные реквизиты'}</button>
    <small>Номер и сумма сохраняются менеджером. Только после этого можно нажать «Всё верно».</small>
    {error && <div className="error" role="alert">{error}</div>}
  </section>;
}
