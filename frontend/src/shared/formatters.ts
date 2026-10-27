import type { ClientPaymentMethod, CurrentUser, PaymentStatus, SellerType } from '../types';

export const sellerLabels: Record<SellerType, string> = { ST: 'СТ', MSM: 'МСМ', IP: 'ИП' };

export function todayLocalDate() {

  const now =
    new Date();


  const local =
    new Date(

      now.getTime() -

      now.getTimezoneOffset() *
        60000
    );


  return local
    .toISOString()
    .slice(0, 10);
}


export function formatMoneyInput(
  value: string,
) {

  const normalized =
    value
      .replace(/\s+/g, '')
      .replace(',', '.')
      .replace(/[^0-9.]/g, '');


  if (!normalized) {
    return '';
  }


  const firstDot =
    normalized.indexOf('.');


  const integerPart =
    (
      firstDot >= 0
        ? normalized.slice(0, firstDot)
        : normalized
    ) || '0';


  const decimalPart =
    firstDot >= 0
      ? normalized
          .slice(firstDot + 1)
          .replace(/\./g, '')
          .slice(0, 2)
      : null;


  const formattedInteger =
    integerPart
      .replace(/^0+(?=\d)/, '')
      .replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ' '
      );


  return decimalPart !== null
    ? formattedInteger + ',' + decimalPart
    : formattedInteger;
}


export function parseMoneyInput(
  value: string,
) {

  const normalized =
    value
      .replace(/\s+/g, '')
      .replace(',', '.');


  if (!normalized) {
    return undefined;
  }


  const parsed =
    Number(normalized);


  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}


export function money(value: string | number) { return `${Number(value).toLocaleString('ru-RU')} ₽`; }

function auditMoney(
  value: unknown,
) {

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {

    return 'не указана';
  }


  const number =
    Number(value);


  if (
    !Number.isFinite(
      number
    )
  ) {

    return String(value);
  }


  return (
    number.toLocaleString(
      'ru-RU'
    ) +
    ' ₽'
  );
}


function auditDate(
  value: unknown,
) {

  if (!value) {
    return 'не указана';
  }


  const text =
    String(value);


  const parts =
    text.split('-');


  if (
    parts.length === 3
  ) {

    return (
      parts[2] +
      '.' +
      parts[1] +
      '.' +
      parts[0]
    );
  }


  return text;
}


export function auditLabel(
  action: string,

  oldValue?: Record<
    string,
    unknown
  >,

  newValue?: Record<
    string,
    unknown
  >,
) {

  if (
    action ===
    'INVOICE_AMOUNT_CHANGED'
  ) {

    return (
      'Изменена сумма счёта: ' +
      auditMoney(
        oldValue?.amount
      ) +
      ' → ' +
      auditMoney(
        newValue?.amount
      )
    );
  }


  if (
    action ===
    'DEAL_SELLER_CHANGED'
  ) {

    const oldSeller =
      String(
        oldValue?.sellerType ||
        '—'
      ) as SellerType;

    const newSeller =
      String(
        newValue?.sellerType ||
        '—'
      ) as SellerType;


    return (
      'Изменено, от кого выставляем: ' +
      (sellerLabels[oldSeller] || oldSeller) +
      ' → ' +
      (sellerLabels[newSeller] || newSeller)
    );
  }


  if (
    action ===
    'SHIPMENT_DATE_CHANGED'
  ) {

    return (
      'Изменена дата отгрузки: ' +
      auditDate(
        oldValue
          ?.plannedShipmentAt
      ) +
      ' → ' +
      auditDate(
        newValue
          ?.plannedShipmentAt
      )
    );
  }


  if (
    action ===
    'DEAL_PHONE_CHANGED'
  ) {

    return (
      'Изменён телефон: ' +
      String(
        oldValue?.clientPhone ||
        'не указан'
      ) +
      ' → ' +
      String(
        newValue?.clientPhone ||
        'не указан'
      )
    );
  }


  const labels:
    Record<string, string> = {

    CREATE:
      'Создана сделка',

    UPLOAD:
      'Загружен счёт',

    CONFIRM:
      'Счёт проверен менеджером',

    CUSTOMER_APPROVED:
      'Счёт готов',

    REQUEST_CORRECTION:
      'Запрошена корректировка',

    INVOICE_REQUEST_SUBMITTED:
      'Запрос на счёт отправлен бухгалтерии',

    INVOICE_REQUEST_RESUBMITTED:
      'Запрос на счёт отправлен повторно',

    INVOICE_REQUEST_RETURNED:
      'Бухгалтерия вернула запрос менеджеру',

    INVOICE_REQUEST_WITHDRAWN:
      'Запрос на счёт отозван менеджером',

    CLIENT_PAYMENT_ADDED:
      'Добавлена оплата клиента',

    PAYMENT_STATUS_CHANGED:
      'Изменён статус оплаты',

    SUPPLIER_PURCHASE_CREATED:
      'Добавлен входящий счёт',

    SUPPLIER_PURCHASE_UPDATED:
      'Изменены данные входящего счёта',

    SUPPLIER_PAYMENT_DRAFT_EDITED:
      'Изменены завод или сумма к оплате до отправки бухгалтерии',

    SUPPLIER_INVOICE_CHANGED:
      'Изменён входящий счёт поставщика',

    SUPPLIER_PAYMENT_REQUESTED:
      'Запрошена оплата поставщику',

    SUPPLIER_PAYMENT_ADDED:
      newValue?.paidFromBalance
        ? 'Оплата поставщику с остатка'
        : 'Добавлена оплата поставщику',

    SUPPLIER_PAYMENT_STAMPED:
      'Добавлена платёжка с печатью',

    SUPPLIER_STAMP_REQUESTED:
      'Запрошена платёжка с печатью',

    SUPPLIER_BALANCE_CORRECTION_REQUESTED:
      'Запрошена корректировка оплаты с остатка',

    SUPPLIER_BALANCE_CORRECTED:
      'Скорректирована оплата с остатка',

    POWER_OF_ATTORNEY_REQUESTED:
      'Запрошена доверенность',

    POWER_OF_ATTORNEY_READY:
      'Доверенность готова',

    CORRECTION_WITHDRAWN:
      'Корректировка счёта отозвана',

    MANAGER_COMMENT_CHANGED:
      'Изменён комментарий менеджера',

    DELIVERY_ADDRESSES_CHANGED:
      'Изменены адреса доставки',

    DEAL_CONTACT_CHANGED:
      'Изменено контактное лицо',
  };


  return (
    labels[action] ||
    'Изменение по сделке'
  );
}


export function paymentStatusLabel(status: PaymentStatus) { return ({ NO_PREPAYMENT: 'Без предоплаты', WAITING: 'Ожидаем оплату', ADVANCE: 'Аванс / частичная оплата', PAID: 'Оплачен', DEFERRED: 'Отсрочка' } as Record<PaymentStatus,string>)[status]; }
export function paymentMethodLabel(method: ClientPaymentMethod) { return ({ NONCASH: 'Безнал', CASH: 'Наличные', CARD: 'Пластик', ADVANCE: 'Аванс' } as Record<ClientPaymentMethod,string>)[method]; }
export function taskStatus(status: string) { return ({ NEW: 'Новая', IN_PROGRESS: 'В работе', NEED_DATA: 'Нужно исправить', DONE: 'Выполнена', CANCELLED: 'Отменена' } as Record<string,string>)[status] || status; }

export function roleName(role: CurrentUser['role']) { return ({ MANAGER: 'Менеджер', ACCOUNTANT: 'Бухгалтер', LEADER: 'Руководитель', ADMIN: 'Админ' } as const)[role]; }
export function statusLabel(status: string) { return ({ WAITING_MANAGER_REVIEW: 'Счёт ожидает проверку', CONFIRMED: 'Счёт готов', AGREED: 'Счёт готов', CORRECTION_REQUESTED: 'Счёт на корректировке', WAITING_ACCOUNTING: 'Счёт на создании' } as Record<string, string>)[status] || status; }
