/* PART_V064_L_TASK_CONTEXT_STRIP */
import type { Task } from './api';
import type { SellerType } from './types';

const sellerLabels: Record<SellerType, string> = {
  ST: 'СТ',
  MSM: 'МСМ',
  IP: 'ИП',
};

function money(value?: string) {
  if (!value) return '';

  const parsed = Number(
    String(value)
      .replace(/\s/g, '')
      .replace(',', '.')
  );

  if (!Number.isFinite(parsed)) {
    return String(value);
  }

  return new Intl.NumberFormat(
    'ru-RU',
    {
      maximumFractionDigits: 2,
    }
  ).format(parsed);
}

export function TaskContextStrip({
  task,
}: {
  task: Task;
}) {
  const currentInvoice =
    task.deal.invoices.find(
      (invoice) => invoice.isCurrent
    ) ?? task.deal.invoices[0];

  const sellerType =
    currentInvoice?.sellerType ||
    task.deal.sellerType;

  const sellerLabel =
    sellerLabels[sellerType] ||
    sellerType;

  return (
    <div className="taskContextStrip">
      <a
        className="taskContextDeal"
        href={
          '#deal/' +
          encodeURIComponent(
            task.deal.id
          )
        }
      >
        <span>Сделка</span>

        <strong>
          ЗК-{task.deal.internalNumber}
        </strong>

        <em>
          {task.deal.clientName}
        </em>
      </a>

      <div className="taskContextFacts">
        <span className="taskContextSeller">
          {sellerLabel}
        </span>

        {currentInvoice?.number && (
          <span>
            Счёт №{currentInvoice.number}
          </span>
        )}

        {currentInvoice?.amount && (
          <span>
            {money(currentInvoice.amount)} ₽
          </span>
        )}
      </div>

      <a
        className="taskContextOpen"
        href={
          '#deal/' +
          encodeURIComponent(
            task.deal.id
          )
        }
      >
        Открыть сделку →
      </a>
    </div>
  );
}

/* END_PART_V064_L_TASK_CONTEXT_STRIP */
