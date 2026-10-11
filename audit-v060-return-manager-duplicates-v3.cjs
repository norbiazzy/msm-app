const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(
        file,
        'utf8'
      )
    : '';
}

function status(
  label,
  ok
) {
  console.log(
    `${ok ? 'OK' : 'WARN'}      ${label}`
  );
}

const app =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'App.tsx'
    )
  );

const purchases =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'PurchasesBlock.tsx'
    )
  );

const invoicePanel =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'InvoiceRequestTaskPanel.tsx'
    )
  );


const oldSupplierIndex =
  purchases.indexOf(
    'PART_1M_A_SUPPLIER_RETURN'
  );

const oldSupplierWindow =
  oldSupplierIndex >= 0
    ? purchases.slice(
        oldSupplierIndex,
        Math.min(
          purchases.length,
          oldSupplierIndex +
            1700
        )
      )
    : '';


const oldSupplierDisabled =
  oldSupplierWindow.includes(
    'PART_1N_K4_V2_DISABLE_OLD_SUPPLIER_RETURN'
  ) &&
  oldSupplierWindow.includes(
    'false &&'
  );


const newSupplierExists =
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
    'PART_1N_K4_V2_HIDE_TERMS_BLOCK'
  );


const invoiceReturnExists =
  app.includes(
    'mode="invoice"'
  );


const genericReturnExists =
  app.includes(
    "task.type !== 'ISSUE_CLIENT_INVOICE'"
  ) &&
  app.includes(
    "task.type !== 'PAY_SUPPLIER'"
  );


console.log('');
console.log(
  'MSM — аудит возвратов v3'
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
  newSupplierExists
);

status(
  'Исправление счёта: «Условия + Значение» скрыты',
  termsHidden
);

status(
  'Счёт: общий возврат сохранён',
  invoiceReturnExists
);

status(
  'Остальные задачи: общий возврат сохранён',
  genericReturnExists
);


console.log('');
console.log(
  'ИТОГ'
);
console.log(
  '====='
);


const all =
  oldSupplierDisabled &&
  newSupplierExists &&
  termsHidden &&
  invoiceReturnExists &&
  genericReturnExists;


console.log(
  all
    ? 'OK — дубль убран, поле условий скрыто.'
    : 'WARN — смотрите строки выше.'
);


console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
