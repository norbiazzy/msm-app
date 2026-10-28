import { useEffect, useState } from 'react';
import { getDocumentRecognition } from './api';
import { RecognitionDetails } from './RecognitionDetails';
import './recognition-audit.css';

type RecognitionResult = {
  kind?: string;
  status?: string;
  result?: Record<string, unknown> | null;
};

type AuditProps = {
  fileId: string;
  expectedNumber?: string | null;
  expectedAmount?: string | number | null;
  expectedRecipient?: string | null;
};

function cleanNumber(value: unknown) {
  return String(value ?? '').trim().toUpperCase()
    .replace(/№/g, '')
    .replace(/[^0-9A-ZА-ЯЁ]/g, '');
}

function cleanCompany(value: unknown) {
  return String(value ?? '').trim().toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/^(?:ООО|АО|ПАО|ЗАО|ОАО|ИП)\s*/u, '')
    .replace(/[^0-9A-ZА-Я]/g, '');
}

function numericAmount(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).replace(/[\s\u00a0\u202f₽]/g, '')
    .replace(/,(?=\d{1,2}$)/, '.');
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function formatMoney(value: unknown) {
  const n = numericAmount(value);
  return n === null ? String(value ?? '—') : n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₽';
}

/** Read-only comparison. Never changes a deal, payment status or document. */
export function RecognitionAudit({ fileId, expectedNumber, expectedAmount, expectedRecipient }: AuditProps) {
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null);
  const shouldCompare = Boolean(expectedNumber || expectedRecipient || expectedAmount !== undefined && expectedAmount !== null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setRecognition(null);
    if (!shouldCompare) return () => { active = false; };

    const load = async () => {
      try {
        const result = await getDocumentRecognition(fileId) as RecognitionResult | null;
        if (!active) return;
        setRecognition(result);
        if (result && (result.status === 'PENDING' || result.status === 'PROCESSING')) {
          timer = setTimeout(() => { void load(); }, 3500);
        }
      } catch {
        if (active) setRecognition(null);
      }
    };
    void load();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [fileId, shouldCompare]);

  const warnings: string[] = [];
  if (recognition?.status === 'DONE' || recognition?.status === 'COMPLETED' || recognition?.status === 'SUCCESS') {
    const d = recognition.result ?? {};
    const number = cleanNumber(d.number);
    const expected = expectedNumber?.trim().toLowerCase() === 'ожидает проверки' ? '' : cleanNumber(expectedNumber);
    // Only compare when both values were actually read; missing data isn't a mismatch.
    if (number && expected && number !== expected) {
      warnings.push(`Номер документа: в карточке «${expectedNumber}», в файле «${String(d.number)}».`);
    }
    if (recognition.kind === 'invoice' && expectedAmount !== undefined && expectedAmount !== null) {
      const foundAmount = numericAmount(d.amount);
      const cardAmount = numericAmount(expectedAmount);
      if (foundAmount !== null && cardAmount !== null && Math.abs(foundAmount - cardAmount) > 0.011) {
        warnings.push(`Сумма счёта: в карточке ${formatMoney(cardAmount)}, в файле ${formatMoney(foundAmount)}.`);
      }
    }
    if (recognition.kind === 'payment' && expectedRecipient) {
      const recipient = d.recipient as { name?: string } | null | undefined;
      const actual = cleanCompany(recipient?.name);
      const intended = cleanCompany(expectedRecipient);
      // Loose matching avoids false warnings for a shortened legal company name.
      if (actual.length >= 4 && intended.length >= 4 &&
          !actual.includes(intended) && !intended.includes(actual)) {
        warnings.push(`Проверьте получателя: по закупке «${expectedRecipient}», в платёжке «${recipient?.name}».`);
      }
    }
  }

  return <div className="msmRecognitionAudit">
    <RecognitionDetails fileId={fileId} />
    {warnings.length > 0 && <div className="msmRecognitionAuditWarnings" role="alert">
      <strong>Обнаружены расхождения с карточкой сделки</strong>
      {warnings.map((warning, index) => <p key={index}>{warning}</p>)}
      <small>Сведения не изменены автоматически. Проверьте оригинал перед дальнейшими действиями.</small>
    </div>}
  </div>;
}
