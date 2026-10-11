const fs = require('fs');
const path = require('path');

const root = __dirname;

const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

const purchasesPath =
  path.join(
    root,
    'frontend',
    'src',
    'PurchasesBlock.tsx'
  );

const invoicePanelPath =
  path.join(
    root,
    'frontend',
    'src',
    'InvoiceRequestTaskPanel.tsx'
  );

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(
        file,
        'utf8'
      )
    : '';
}

function status(label, ok) {
  console.log(
    `${ok ? 'OK' : 'WARN'}      ${label}`
  );
}

const app =
  read(appPath);

const purchases =
  read(purchasesPath);

const invoicePanel =
  read(invoicePanelPath);

console.log('');
console.log(
  'MSM — аудит возвратов v2'
);
console.log(
  '========================'
);
console.log('');

const supplierOldMarker =
  purchases.indexOf(
    'PART_1M_A_SUPPLIER_RETURN'
  );

let supplierOldInactive = false;

if (supplierOldMarker >= 0) {
  const chunk =
    purchases.slice(
      supplierOldMarker,
      Math.min(
        purchases.length,
        supplierOldMarker + 1300
      )
    );

  supplierOldInactive =
    chunk.includes(
      'false &&'
    );
}

const supplierNewActive =
  (
    purchases.includes(
      'PART_1N_K2_V3_SUPPLIER_RETURN'
    ) ||
    purchases.includes(
      'PART_1N_K2_SUPPLIER_RETURN'
    )
  ) &&
  purchases.includes(
    '<ReturnToManagerPanel'
  );

const termsHidden =
  invoicePanel.includes(
    'PART_1N_K4_HIDE_TERMS_FIELD'
  );

const genericTaskReturn =
  app.includes(
    "task.type !== 'ISSUE_CLIENT_INVOICE'"
  ) &&
  app.includes(
    "task.type !== 'PAY_SUPPLIER'"
  );

const invoiceNewReturn =
  app.includes(
    'mode="invoice"'
  );

const oldInvoiceModalInactive =
  !app.includes(
    'invoiceReturnModal'
  ) ||
  app.includes(
    'false &&\n        returnModalOpen'
  );

status(
  'PAY_SUPPLIER: верхний дубль отключён',
  supplierOldInactive
);

status(
  'PAY_SUPPLIER: один новый возврат оставлен',
  supplierNewActive
);

status(
  'Исправление счёта: поле «Условие» скрыто',
  termsHidden
);

status(
  'Общий возврат остальных задач сохранён',
  genericTaskReturn
);

status(
  'Счёт: общий ReturnToManagerPanel сохранён',
  invoiceNewReturn
);

status(
  'Счёт: старая модалка неактивна',
  oldInvoiceModalInactive
);

console.log('');
console.log(
  'ИТОГ'
);
console.log(
  '====='
);

const all =
  supplierOldInactive &&
  supplierNewActive &&
  termsHidden &&
  genericTaskReturn &&
  invoiceNewReturn &&
  oldInvoiceModalInactive;

console.log(
  all
    ? 'OK — дубли активных возвратов устранены.'
    : 'WARN — смотрите строки выше.'
);

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
