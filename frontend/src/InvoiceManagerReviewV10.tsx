import { useEffect, useRef, useState } from 'react';
import { getDocumentRecognition } from './api';
import type { Invoice } from './types';

export type InvoiceReviewDraft = {invoiceId: string; number: string; amount: string};

/** Display exactly the details the confirmation endpoint will accept. */
export function InvoiceManagerReviewV10({invoice, draft, onChange, disabled}: {invoice: Invoice; draft: InvoiceReviewDraft | null; onChange: (value: InvoiceReviewDraft) => void; disabled?: boolean}) {
  const [rec, setRec] = useState<{status?:string;result?:{number?:unknown;amount?:unknown}} | null>(null);
  const dirty = useRef({number:false,amount:false});
  const fileId = invoice.fileId || invoice.file?.id;
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setRec(null);
    dirty.current = {number:false,amount:false};
    const load = async () => {
      if (!fileId) return;
      try {
        const next = await getDocumentRecognition(fileId) as typeof rec;
        if (!live) return;
        setRec(next);
        if (next?.status === 'PENDING' || next?.status === 'PROCESSING') timer = setTimeout(load,3000);
      } catch { /* Confirmation reports unavailable details without mutating the invoice. */ }
    };
    void load();
    return () => {live=false;if(timer) clearTimeout(timer);};
  }, [fileId, invoice.id]);
  const result = rec?.status === 'DONE' ? rec.result : null;
  const number = invoice.number && invoice.number !== 'Ожидает проверки' ? invoice.number : String(result?.number ?? '—');
  const amount = invoice.amount ?? result?.amount;
  useEffect(() => {
    const next = {invoiceId: invoice.id,
      number: dirty.current.number && draft?.invoiceId === invoice.id ? draft.number : number === '—' ? '' : number,
      amount: dirty.current.amount && draft?.invoiceId === invoice.id ? draft.amount : amount == null ? '' : String(amount)};
    if (draft?.invoiceId !== next.invoiceId || draft.number !== next.number || draft.amount !== next.amount) onChange(next);
  }, [invoice.id, number, amount, draft, onChange]);
  const value = draft?.invoiceId === invoice.id ? draft : {invoiceId:invoice.id,number:'',amount:''};
  return <div className="msmInvoiceEditable" aria-label="Реквизиты счёта">
    <label className="field"><span>Номер счёта</span><input value={value.number} disabled={disabled} onChange={e => {dirty.current.number=true;onChange({...value,number:e.target.value});}} /></label>
    <label className="field"><span>Сумма счёта, ₽</span><input inputMode="decimal" value={value.amount} disabled={disabled} onChange={e => {dirty.current.amount=true;onChange({...value,amount:e.target.value});}} /></label>
    {(rec?.status === 'PENDING' || rec?.status === 'PROCESSING') && <small>Распознаём счёт… Реквизиты можно указать вручную.</small>}
    {rec?.status === 'FAILED' && <small>Не удалось распознать реквизиты. Укажите их по оригиналу счёта.</small>}
  </div>;
}
