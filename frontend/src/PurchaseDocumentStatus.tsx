import { useEffect, useMemo, useState } from 'react';
import type { Deal, SupplierPurchase } from './types';
import { dealFileUrl } from './api';
import { assessPurchaseDocuments, type DocumentCheckState } from './purchaseDocumentRules';
import './purchase-document-status.css';

const API = import.meta.env.VITE_API_URL || '/api';
const stateLabels: Record<DocumentCheckState, string> = {
  ready: 'Приложено',
  review: 'Проверить',
  waiting: 'Ожидаем',
  missing: 'Нет подтверждения',
  'not-needed': 'Пока не требуется',
};

/** Compact, read-only manager overview, safely based on existing deal and task data. */
export function PurchaseDocumentStatus({ deal, purchase }: { deal: Deal; purchase: SupplierPurchase }) {
  const taskIds = useMemo(() => {
    const fromDeal = (deal.tasks || []).filter(task =>
      task.type === 'PAY_SUPPLIER' &&
      (task as typeof task & { supplierPurchaseId?: string | null }).supplierPurchaseId === purchase.id,
    ).map(task => task.id);
    const fromPurchase = (purchase.tasks || []).filter(task => task.type === 'PAY_SUPPLIER').map(task => task.id);
    return [...new Set([...fromDeal, ...fromPurchase])].sort();
  }, [deal.tasks, purchase.tasks, purchase.id]);
  const taskKey = taskIds.join('|');
  const [library, setLibrary] = useState<{ count: number | null; error: boolean }>({ count: null, error: false });
  useEffect(() => {
    let current = true;
    setLibrary({ count: null, error: false });
    if (!taskKey) {
      setLibrary({ count: 0, error: false });
      return () => { current = false; };
    }
    const load = async () => {
      try {
        // A small bounded batch; do not infer a file's type from a task link alone.
        const batches = await Promise.all(taskKey.split('|').slice(0, 20).map(async id => {
          const r = await fetch(`${API}/file-library/task/${encodeURIComponent(id)}`);
          if (!r.ok) throw new Error('library unavailable');
          const data: unknown = await r.json();
          return Array.isArray(data) ? data as Array<{ id?: string }> : [];
        }));
        if (current) setLibrary({ count: new Set(batches.flat().map(item => item.id).filter(Boolean)).size, error: false });
      } catch {
        if (current) setLibrary({ count: null, error: true });
      }
    };
    void load();
    return () => { current = false; };
  }, [taskKey]);
  const status = assessPurchaseDocuments(deal, purchase, library.count);
  const warning = status.attentionCount > 0;
  return (
    <details className="msmPurchaseDocControlV5" open>
      <summary>
        <span className="msmDocV5Heading">Документы и контроль</span>
        <span className={'msmDocV5Summary ' + (warning ? 'msmDocV5Attention' : '')}>
          {warning ? `${status.attentionCount} требуют внимания` : status.task.state === 'waiting' ? 'Ожидаем бухгалтерию' : 'Проверка документов'}
        </span>
      </summary>
      <div className="msmDocV5Grid">
        {status.checks.map(check => (
          <div className="msmDocV5Item" key={check.title}>
            <div className="msmDocV5Label">
              <span>{check.title}</span>
              <span className={'msmDocV5State state-' + check.state}>{stateLabels[check.state]}</span>
            </div>
            <small>{check.description}</small>
          </div>
        ))}
        <div className="msmDocV5Item msmDocV5Accounting">
          <div className="msmDocV5Label">
            <span>Задача бухгалтерии</span>
            <span className={'msmDocV5State state-' + status.task.state}>
              {status.task.state === 'ready' ? 'Нет активных' : status.task.state === 'review' ? 'Уточнение' : 'В работе'}
            </span>
          </div>
          <small>{status.task.description}</small>
          {status.task.state !== 'ready' && <a href="#tasks">Открыть задачи ↗</a>}
        </div>
      </div>
      {library.error && <p className="msmDocV5Notice" role="status">Не удалось проверить файлы из библиотеки. Это не означает, что документ отсутствует.</p>}
      {(status.sourceFiles.length > 0 || status.paymentFiles.length > 0) && (
        <div className="msmDocV5Files" aria-label="Документы закупки">
          {[...status.sourceFiles, ...status.paymentFiles].map(file => (
            <a key={file.id} href={dealFileUrl(file.id)} target="_blank" rel="noreferrer" title={file.originalName}>
              {file.originalName}
            </a>
          ))}
        </div>
      )}
      <p className="msmDocV5Footnote">Отметка «с печатью» в учёте не заменяет подтверждение исполнения банком. Этот блок не меняет оплату и статусы задач.</p>
    </details>
  );
}
