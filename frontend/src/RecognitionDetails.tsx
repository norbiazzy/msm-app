import { useEffect, useState } from 'react';
import { getDocumentRecognition } from './api';

type ExtractedItem = { row?:number;name:string;quantity?:string;unit?:string;price?:string;amount?:string };
type Recognition = { kind: 'invoice'|'poa'|'payment';status:string;errorText?:string|null;result?:Record<string,unknown>|null };
// MSM_V13_NUMBER_FORMAT: display-only localization, source values stay unchanged.
const amount = (v: unknown, currency = false): string => {
  if (v === null || v === undefined || v === '') return '—';
  const original = String(v).trim();
  const normalized = original.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return original;
  const number = Number(normalized);
  if (!Number.isFinite(number)) return original;
  const decimals = normalized.split('.')[1]?.length ?? 0;
  const places = currency ? 2 : Math.min(decimals, 8);
  return number.toLocaleString('ru-RU', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
};

/** Display only to MANAGER/LEADER/ADMIN; never shown in accounting task forms. */
export function RecognitionDetails({ fileId, compact = false }: { fileId:string;compact?:boolean }) {
  const [rec,setRec] = useState<Recognition|null>(null);
  useEffect(() => {
    let cancelled=false;let timer:ReturnType<typeof setTimeout>|undefined;
    async function load() {
      try {
        const value = await getDocumentRecognition(fileId) as Recognition|null;
        if (cancelled)return;
        setRec(value);
        if (value && ['PENDING','PROCESSING'].includes(value.status)) timer=setTimeout(load,3500);
      } catch { if (!cancelled) setRec(null); }
    }
    void load();
    return ()=>{ cancelled=true;if(timer)clearTimeout(timer); };
  },[fileId]);
  if (!rec) return null;
  if(rec.status==='PENDING'||rec.status==='PROCESSING')
    return <div className="msmRecognitionPending">Распознаём документ…</div>;
  if(rec.status==='FAILED')
    return <div className="msmRecognitionWarning">Не удалось распознать: {rec.errorText || 'Ошибка обработки'}. Оригинал доступен.</div>;
  const d=rec.result || {};
  const issues=(Array.isArray(d.issues)?d.issues:[]) as string[];
  if(rec.kind==='invoice') {
    const items=(Array.isArray(d.items)?d.items:[]) as ExtractedItem[];
    return <section className="msmRecognition" aria-label="Позиции из счёта">
      <div className="msmRecognitionHeading"><strong>Позиции из счёта</strong><span>{items.length} поз.</span></div>
      <div className="msmRecognitionScroll"><table><thead><tr><th>Наименование</th><th>Кол-во</th><th>Ед.</th><th>Цена, ₽</th><th>Сумма, ₽</th></tr></thead><tbody>
        {items.map((p,i)=><tr key={i}><td>{p.name}</td><td>{amount(p.quantity)}</td><td>{p.unit||'—'}</td><td>{amount(p.price, true)}</td><td>{amount(p.amount, true)}</td></tr>)}
      </tbody></table></div>
      <div className="msmRecognitionTotal">Всего к оплате: <strong>{amount(d.amount, true)} ₽</strong></div>
      {issues.length>0 && <div className="msmRecognitionWarning">Проверьте результат: {issues.join(' · ')}</div>}
    </section>;
  }
  if(rec.kind==='poa') {
    const hasSeal=d.round_seal_detected===true,hasEdo=d.edo_mark_detected===true;
    return <div className="msmRecognitionCompact">
      <div className={hasSeal||hasEdo?'msmRecognitionOk':'msmRecognitionWarning'}>{hasSeal?'Круглая печать обнаружена':''}{hasSeal&&hasEdo?' · ':''}{hasEdo?'Отметка ЭДО обнаружена':''}{!hasSeal&&!hasEdo?'Внимание: не найдена круглая печать или отметка ЭДО':''}</div>
      <div>Доверенность № {String(d.number||'—')} · до {String(d.valid_until||'—')} · {String(d.recipient_name||'ФИО не распознано')}</div>
      {issues.filter(x=>!x.startsWith('Не обнаружены')).map((x,i)=><div className="msmRecognitionWarning" key={i}>{x}</div>)}
      <small>Это визуальная проверка PDF, а не проверка подлинности электронной подписи.</small>
    </div>;
  }
  return <div className="msmRecognitionCompact">
    <div className={d.executed_mark_detected?'msmRecognitionOk':'msmRecognitionWarning'}>{d.executed_mark_detected?'Отметка «ИСПОЛНЕНО» обнаружена':'Нет отметки «ИСПОЛНЕНО» в приложенном PDF'}</div>
    <div>ПП № {String(d.number||'—')} · {amount(d.amount, true)} ₽ · получатель: {String((d.recipient as {name?:string}|null)?.name||'не распознан')}</div>
    <small>Фактическое проведение платежа банком не проверено.</small>
  </div>;
}
