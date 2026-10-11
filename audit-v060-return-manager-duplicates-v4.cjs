const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8')
    : '';
}

function status(label, ok) {
  console.log(
    `${ok ? 'OK' : 'WARN'}      ${label}`
  );
}

const app = read(
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  )
);

const purchases = read(
  path.join(
    root,
    'frontend',
    'src',
    'PurchasesBlock.tsx'
  )
);

const invoicePanel = read(
  path.join(
    root,
    'frontend',
    'src',
    'InvoiceRequestTaskPanel.tsx'
  )
);

const oldMarkerIndex =
  purchases.indexOf(
    'PART_1M_A_SUPPLIER_RETURN'
  );

const oldWindow =
  oldMarkerIndex >= 0
    ? purchases.slice(
        oldMarkerIndex,
        Math.min(
          purchases.length,
          oldMarkerIndex + 1800
        )
      )
    : '';

const oldSupplierDisabled =
  oldWindow.includes(
    'PART_1N_K4_V3_DISABLE_OLD_SUPPLIER_RETURN'
  ) &&
  oldWindow.includes('false &&');

const newSupplierReturn =
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

const termsUiHidden =
  invoicePanel.includes(
    'PART_1N_K4_V3_HIDE_TERMS_UI'
  );

const invoiceReturn =
  app.includes(
    'mode="invoice"'
  );

const genericReturn =
  app.includes(
    "task.type !== 'ISSUE_CLIENT_INVOICE'"
  ) &&
  app.includes(
    "task.type !== 'PAY_SUPPLIER'"
  );

console.log('');
console.log(
  'MSM — аудит возвратов v4'
);
console.log(
  '========================'
);
console.log('');

status(
  'PAY_SUPPLIER: верхний дубль отключён',
  oldSupplierDisabled
);

status(
  'PAY_SUPPLIER: нижний возврат сохранён',
  newSupplierReturn
);

status(
  'Исправление счёта: «Условия + Значение» скрыты',
  termsUiHidden
);

status(
  'Счёт: общий возврат сохранён',
  invoiceReturn
);

status(
  'Остальные задачи: общий возврат сохранён',
  genericReturn
);

console.log('');
console.log('ИТОГ');
console.log('=====');

const all =
  oldSupplierDisabled &&
  newSupplierReturn &&
  termsUiHidden &&
  invoiceReturn &&
  genericReturn;

console.log(
  all
    ? 'OK — дубль убран, условия скрыты.'
    : 'WARN — смотрите строки выше.'
);

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
