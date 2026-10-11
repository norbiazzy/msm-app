const fs = require('fs');
const path = require('path');

const root = __dirname;

const files = {
  app: path.join(root, 'frontend', 'src', 'App.tsx'),
  purchases: path.join(root, 'frontend', 'src', 'PurchasesBlock.tsx'),
  returnPanel: path.join(root, 'frontend', 'src', 'ReturnToManagerPanel.tsx'),
  managerResubmit: path.join(root, 'frontend', 'src', 'ManagerResubmitPanel.tsx'),
  supplierEdit: path.join(root, 'frontend', 'src', 'SupplierPaymentManagerEdit.tsx'),
  invoicePanel: path.join(root, 'frontend', 'src', 'InvoiceRequestTaskPanel.tsx'),
  structured: path.join(root, 'frontend', 'src', 'TaskStructuredFields.tsx'),
  api: path.join(root, 'frontend', 'src', 'api.ts'),
};

function readMaybe(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function count(text, needle) {
  if (!text) return 0;
  let total = 0;
  let index = 0;

  while (true) {
    const found = text.indexOf(needle, index);
    if (found < 0) return total;
    total++;
    index = found + needle.length;
  }
}

function near(text, leftNeedle, rightNeedle, radius = 2200) {
  if (!text) return false;
  let index = 0;

  while (true) {
    const left = text.indexOf(leftNeedle, index);
    if (left < 0) return false;

    const start = Math.max(0, left - radius);
    const end = Math.min(text.length, left + radius);
    const chunk = text.slice(start, end);

    if (chunk.includes(rightNeedle)) return true;

    index = left + leftNeedle.length;
  }
}

function line(label, status, details = '') {
  const icon =
    status === 'OK'
      ? 'OK'
      : status === 'WARN'
        ? 'WARN'
        : 'MISSING';

  console.log(
    `${icon.padEnd(7)} ${label}` +
    (details ? ` — ${details}` : '')
  );
}

const app = readMaybe(files.app);
const purchases = readMaybe(files.purchases);
const returnPanel = readMaybe(files.returnPanel);
const managerResubmit = readMaybe(files.managerResubmit);
const supplierEdit = readMaybe(files.supplierEdit);
const invoicePanel = readMaybe(files.invoicePanel);
const structured = readMaybe(files.structured);
const api = readMaybe(files.api);

console.log('');
console.log('MSM Part 1N-K1 — аудит возвратов');
console.log('================================');
console.log('');

line(
  'Общий ReturnToManagerPanel',
  returnPanel ? 'OK' : 'MISSING'
);

if (returnPanel) {
  line(
    'Режим invoice в общем окне',
    returnPanel.includes("mode?: 'generic' | 'invoice'") ||
    returnPanel.includes('mode ===')
      ? 'OK'
      : 'WARN'
  );

  const reasonLabels = [
    'Не хватает данных',
    'Данные заполнены неверно',
    'Требуется уточнение',
    'Нет входящего счёта',
    'Нет условий',
    'Нет реквизитов',
    'Другое',
  ];

  const found = reasonLabels.filter(
    (label) => returnPanel.includes(label)
  );

  line(
    'Единые причины возврата',
    found.length >= 6 ? 'OK' : 'WARN',
    `${found.length}/7 найдено`
  );
}

console.log('');
console.log('1. ВЫСТАВЛЕНИЕ СЧЁТА');
console.log('--------------------');

line(
  'InvoiceRequestManagerRepair',
  invoicePanel?.includes('InvoiceRequestManagerRepair')
    ? 'OK'
    : 'MISSING'
);

line(
  'Снимок полей task.details читается',
  invoicePanel?.includes('task.details') ||
  invoicePanel?.includes('typedTask.details')
    ? 'OK'
    : 'WARN'
);

line(
  'Старые MANAGER_ATTACHMENT видны',
  invoicePanel?.includes('MANAGER_ATTACHMENT')
    ? 'OK'
    : 'WARN'
);

line(
  'Новые TASK_ATTACHMENT видны',
  invoicePanel?.includes('TASK_ATTACHMENT_')
    ? 'OK'
    : 'WARN'
);

line(
  'Счёт использует общий ReturnToManagerPanel',
  app?.includes('mode="invoice"')
    ? 'OK'
    : 'WARN'
);

line(
  'Старое invoiceReturnModal отсутствует',
  count(app, 'invoiceReturnModal') === 0
    ? 'OK'
    : 'WARN',
  `найдено: ${count(app, 'invoiceReturnModal')}`
);

line(
  'Старый текст «Отказать / вернуть» отсутствует',
  count(app, 'Отказать / вернуть') === 0
    ? 'OK'
    : 'WARN',
  `найдено: ${count(app, 'Отказать / вернуть')}`
);

console.log('');
console.log('2. ДОВЕРЕННОСТЬ');
console.log('---------------');

line(
  'POWER_OF_ATTORNEY существует в task flow',
  app?.includes('POWER_OF_ATTORNEY')
    ? 'OK'
    : 'MISSING'
);

line(
  'Возврат доверенности через общий panel',
  near(app, 'POWER_OF_ATTORNEY', 'ReturnToManagerPanel')
    ? 'OK'
    : 'WARN'
);

line(
  'Менеджер редактирует ту же task',
  near(app, 'POWER_OF_ATTORNEY', 'ManagerResubmitPanel') ||
  managerResubmit?.includes('POWER_OF_ATTORNEY')
    ? 'OK'
    : 'WARN'
);

console.log('');
console.log('3. ЭТРН');
console.log('-------');

line(
  'ETRN существует в task flow',
  app?.includes("'ETRN'") || app?.includes('"ETRN"')
    ? 'OK'
    : 'MISSING'
);

line(
  'Возврат ЭТРН через общий panel',
  near(app, 'ETRN', 'ReturnToManagerPanel')
    ? 'OK'
    : 'WARN'
);

line(
  'Менеджер редактирует ту же task',
  near(app, 'ETRN', 'ManagerResubmitPanel') ||
  managerResubmit?.includes('ETRN')
    ? 'OK'
    : 'WARN'
);

console.log('');
console.log('4. ОПЛАТА ПОСТАВЩИКУ');
console.log('--------------------');

line(
  'SupplierPaymentTask существует',
  purchases?.includes('SupplierPaymentTask')
    ? 'OK'
    : 'MISSING'
);

line(
  'SupplierPaymentManagerEdit существует',
  supplierEdit?.includes('SupplierPaymentManagerEdit')
    ? 'OK'
    : 'MISSING'
);

const supplierSharedReturn =
  near(
    purchases,
    'SupplierPaymentTask',
    'ReturnToManagerPanel',
    7000
  );

line(
  'Возврат оплаты через общий panel',
  supplierSharedReturn
    ? 'OK'
    : 'WARN'
);

line(
  'Старое отдельное supplier return UI',
  (
    count(purchases, 'returnModalOpen') === 0 &&
    count(purchases, 'appModalBackdrop') === 0
  )
    ? 'OK'
    : 'WARN',
  `returnModalOpen=${count(purchases, 'returnModalOpen')}, appModalBackdrop=${count(purchases, 'appModalBackdrop')}`
);

console.log('');
console.log('5. ОБЩИЕ ДАННЫЕ');
console.log('---------------');

line(
  'TaskStructuredFields существует',
  structured ? 'OK' : 'MISSING'
);

line(
  'Generic return API существует',
  api?.includes('returnTaskToManager')
    ? 'OK'
    : 'MISSING'
);

line(
  'Invoice return API существует',
  api?.includes('returnInvoiceRequest')
    ? 'OK'
    : 'MISSING'
);

console.log('');
console.log('ИТОГ');
console.log('=====');

const warnings = [];

if (!returnPanel) {
  warnings.push('Нет общего ReturnToManagerPanel');
}

if (!app?.includes('mode="invoice"')) {
  warnings.push('Счёт ещё не использует общий panel');
}

if (count(app, 'invoiceReturnModal') > 0) {
  warnings.push('Осталось старое окно возврата счёта');
}

if (!near(app, 'POWER_OF_ATTORNEY', 'ReturnToManagerPanel')) {
  warnings.push('Доверенность требует проверки возврата');
}

if (!near(app, 'ETRN', 'ReturnToManagerPanel')) {
  warnings.push('ЭТРН требует проверки возврата');
}

if (!supplierSharedReturn) {
  warnings.push('Оплата поставщику требует унификации возврата');
}

if (warnings.length === 0) {
  console.log(
    'OK — все 4 типа уже используют единый возврат.'
  );
} else {
  console.log('Нужно нормализовать:');
  warnings.forEach(
    (item) => console.log(' - ' + item)
  );
}

console.log('');
console.log('Этот аудит ничего не изменяет.');
