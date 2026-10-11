const fs = require('fs');
const path = require('path');

const root = __dirname;

function readMaybe(file) {
  if (!fs.existsSync(file)) {
    return null;
  }

  return fs.readFileSync(
    file,
    'utf8'
  );
}

function count(text, needle) {
  if (!text) return 0;

  let total = 0;
  let index = 0;

  while (true) {
    const found =
      text.indexOf(
        needle,
        index
      );

    if (found < 0) {
      return total;
    }

    total++;
    index =
      found +
      needle.length;
  }
}

function line(label, ok, details = '') {
  console.log(
    `${ok ? 'OK' : 'WARN'}      ${label}` +
    (
      details
        ? ` — ${details}`
        : ''
    )
  );
}

const app =
  readMaybe(
    path.join(
      root,
      'frontend',
      'src',
      'App.tsx'
    )
  );

const purchases =
  readMaybe(
    path.join(
      root,
      'frontend',
      'src',
      'PurchasesBlock.tsx'
    )
  );

const returnPanel =
  readMaybe(
    path.join(
      root,
      'frontend',
      'src',
      'ReturnToManagerPanel.tsx'
    )
  );

const invoicePanel =
  readMaybe(
    path.join(
      root,
      'frontend',
      'src',
      'InvoiceRequestTaskPanel.tsx'
    )
  );

console.log('');
console.log(
  'MSM Part 1N-K1 v2 — аудит возвратов'
);
console.log(
  '==================================='
);
console.log('');

line(
  'Общий ReturnToManagerPanel',
  Boolean(returnPanel)
);

line(
  'Единые причины возврата',
  Boolean(
    returnPanel &&
    returnPanel.includes(
      'Не хватает данных'
    ) &&
    returnPanel.includes(
      'Другое'
    )
  )
);

console.log('');
console.log(
  '1. ВЫСТАВЛЕНИЕ СЧЁТА'
);
console.log(
  '--------------------'
);

line(
  'InvoiceRequestManagerRepair',
  Boolean(
    invoicePanel &&
    invoicePanel.includes(
      'InvoiceRequestManagerRepair'
    )
  )
);

line(
  'task.details',
  Boolean(
    invoicePanel &&
    (
      invoicePanel.includes(
        'task.details'
      ) ||
      invoicePanel.includes(
        'typedTask.details'
      )
    )
  )
);

line(
  'Счёт использует общий ReturnToManagerPanel',
  Boolean(
    app &&
    app.includes(
      'mode="invoice"'
    )
  )
);

line(
  'Старый invoiceReturnModal удалён',
  count(
    app,
    'invoiceReturnModal'
  ) === 0,
  `найдено: ${count(
    app,
    'invoiceReturnModal'
  )}`
);

line(
  'Старые кнопки возврата удалены',
  count(
    app,
    'Отказать / вернуть'
  ) === 0,
  `найдено: ${count(
    app,
    'Отказать / вернуть'
  )}`
);

console.log('');
console.log(
  '2. ДОВЕРЕННОСТЬ / ЭТРН'
);
console.log(
  '----------------------'
);

line(
  'POWER_OF_ATTORNEY присутствует',
  Boolean(
    app &&
    app.includes(
      'POWER_OF_ATTORNEY'
    )
  )
);

line(
  'ETRN присутствует',
  Boolean(
    app &&
    app.includes(
      'ETRN'
    )
  )
);

console.log('');
console.log(
  '3. ОПЛАТА ПОСТАВЩИКУ'
);
console.log(
  '--------------------'
);

const supplierReturn =
  Boolean(
    purchases &&
    purchases.includes(
      'PART_1N_K2_SUPPLIER_RETURN'
    ) &&
    purchases.includes(
      '<ReturnToManagerPanel'
    )
  );

line(
  'PAY_SUPPLIER использует общий ReturnToManagerPanel',
  supplierReturn
);

line(
  'Окно отмены/удаления закупки сохранено',
  Boolean(
    purchases &&
    purchases.includes(
      'cancelConfirmOpen'
    ) &&
    purchases.includes(
      'Отменить запрос оплаты?'
    )
  )
);

console.log('');
console.log('ИТОГ');
console.log('=====');

const ok =
  Boolean(returnPanel) &&
  Boolean(
    app &&
    app.includes(
      'mode="invoice"'
    )
  ) &&
  count(
    app,
    'invoiceReturnModal'
  ) === 0 &&
  count(
    app,
    'Отказать / вернуть'
  ) === 0 &&
  supplierReturn;

console.log(
  ok
    ? 'OK — возвраты унифицированы.'
    : 'WARN — остались различия, смотрите строки выше.'
);

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
