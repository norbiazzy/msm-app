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

function ok(
  label,
  value
) {
  console.log(
    `${value ? 'OK' : 'WARN'}      ${label}`
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

const returnPanel =
  read(
    path.join(
      root,
      'frontend',
      'src',
      'ReturnToManagerPanel.tsx'
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

console.log('');
console.log(
  'MSM Part 1N-K1 v3 — аудит возвратов'
);
console.log(
  '==================================='
);
console.log('');

const commonPanel =
  Boolean(returnPanel);

const invoiceCommon =
  app.includes(
    'mode="invoice"'
  );

const invoiceLegacyActive =
  app.includes(
    'className="appModal invoiceReturnModal"'
  );

const invoiceRepair =
  invoicePanel.includes(
    'InvoiceRequestManagerRepair'
  );

const supplierCommon =
  purchases.includes(
    'PART_1N_K2_V3_SUPPLIER_RETURN'
  ) &&
  purchases.includes(
    '<ReturnToManagerPanel'
  );

const purchaseCancelStillThere =
  purchases.includes(
    'cancelConfirmOpen'
  ) &&
  purchases.includes(
    'Отменить запрос оплаты?'
  );

ok(
  'Общий ReturnToManagerPanel',
  commonPanel
);

ok(
  'Счёт: общий возврат',
  invoiceCommon
);

ok(
  'Счёт: старое окно неактивно',
  !invoiceLegacyActive
);

ok(
  'Счёт: manager repair task',
  invoiceRepair
);

ok(
  'Доверенность присутствует',
  app.includes(
    'POWER_OF_ATTORNEY'
  )
);

ok(
  'ЭТРН присутствует',
  app.includes(
    'ETRN'
  )
);

ok(
  'Оплата поставщику: общий возврат',
  supplierCommon
);

ok(
  'Окно отмены закупки сохранено',
  purchaseCancelStillThere
);

console.log('');
console.log('ИТОГ');
console.log('=====');

const all =
  commonPanel &&
  invoiceCommon &&
  !invoiceLegacyActive &&
  invoiceRepair &&
  supplierCommon &&
  purchaseCancelStillThere;

console.log(
  all
    ? 'OK — возвраты унифицированы.'
    : 'WARN — смотрите строки выше.'
);

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
