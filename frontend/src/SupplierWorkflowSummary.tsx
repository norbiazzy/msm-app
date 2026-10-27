import { useMemo } from 'react';

/* MSM_SUPPLIER_WORKFLOW_V6: display only; never changes payment/status. */
function displayMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 2,
  }).format(value);
}

function readAmount(raw: string): number | null {
  const text = raw.replace(/[\s\u00a0]/g, '').replace(',', '.');
  if (!text || !/^\d+(?:\.\d{0,2})?$/.test(text)) return null;
  const result = Number(text);
  return Number.isFinite(result) && result >= 0 ? result : null;
}

export function PurchaseRequestSummary({
  supplierName,
  amountInput,
  mainFileName,
  attachmentCount,
  urgent,
}: {
  supplierName: string;
  amountInput: string;
  mainFileName: string | null;
  attachmentCount: number;
  urgent: boolean;
}) {
  const amount = useMemo(() => readAmount(amountInput), [amountInput]);
  const hasSupplier = supplierName.trim().length > 0;
  return (
    <section className="msmWorkflowV6" aria-label="Проверка заявки поставщику">
      <div className="msmWorkflowV6Head">
        <strong>Проверка перед сохранением</strong>
        {urgent && <span className="msmWorkflowV6Urgent">Срочно</span>}
      </div>
      <dl className="msmWorkflowV6Facts">
        <div><dt>Поставщик</dt><dd>{hasSupplier ? supplierName.trim() : 'Не указан'}</dd></div>
        <div><dt>Сумма закупки</dt><dd>{amount !== null ? displayMoney(amount) : 'Не указана'}</dd></div>
        <div className="msmWorkflowV6Wide"><dt>Основной входящий счёт</dt><dd>{mainFileName || 'Не приложен'}</dd></div>
        <div><dt>Дополнительные файлы</dt><dd>{attachmentCount}</dd></div>
      </dl>
      {!mainFileName && (
        <p className="msmWorkflowV6Notice">
          Основной счёт не выбран. Убедитесь, что бухгалтерии достаточно данных для оплаты.
        </p>
      )}
      <p className="msmWorkflowV6Help">
        «Сохранить» оставит закупку без новой задачи. «Отправить в оплату» создаст задачу бухгалтерии.
      </p>
    </section>
  );
}

export function SupplierPaymentSummary({
  amountInput,
  requestedAmount,
  paidAlready,
  purchaseTarget,
  paidFromBalance,
  fileCount,
  stamped,
}: {
  amountInput: string;
  requestedAmount: number;
  paidAlready: number;
  purchaseTarget: number | null;
  paidFromBalance: boolean;
  fileCount: number;
  stamped: boolean;
}) {
  const amount = useMemo(() => readAmount(amountInput), [amountInput]);
  const remaining = purchaseTarget === null ? null : Math.max(0, purchaseTarget - paidAlready);
  const exceeds = amount !== null && remaining !== null && amount > remaining + 0.005;
  return (
    <section className="msmWorkflowV6 msmWorkflowV6Payment" aria-label="Проверка оплаты поставщику">
      <div className="msmWorkflowV6Head"><strong>Сверка перед отправкой оплаты</strong></div>
      <dl className="msmWorkflowV6Facts">
        <div><dt>В запросе</dt><dd>{displayMoney(requestedAmount)}</dd></div>
        <div><dt>Уже оплачено</dt><dd>{displayMoney(paidAlready)}</dd></div>
        {remaining !== null && <div><dt>Остаток по закупке</dt><dd>{displayMoney(remaining)}</dd></div>}
        <div><dt>Текущая оплата</dt><dd>{amount !== null ? displayMoney(amount) : 'Укажите сумму'}</dd></div>
      </dl>
      {exceeds && <p className="msmWorkflowV6Notice" role="status">Сумма больше расчётного остатка по закупке. Проверьте оплату перед отправкой.</p>}
      <p className="msmWorkflowV6Help">
        {paidFromBalance
          ? 'Выбрана оплата с остатка — платёжное поручение не требуется.'
          : `Выбрано файлов: ${fileCount}. ${stamped ? 'Отметка банка указана бухгалтером — её наличие проверяйте в самом документе.' : 'Если банковской отметки нет, менеджер увидит предупреждение.'}`}
      </p>
    </section>
  );
}
