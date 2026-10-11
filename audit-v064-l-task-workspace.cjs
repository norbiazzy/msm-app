const fs = require('fs');
const path = require('path');

const root = __dirname;

const paths = {
  app: path.join(root, 'frontend', 'src', 'App.tsx'),
  poa: path.join(root, 'frontend', 'src', 'PowerOfAttorneyBlock.tsx'),
  purchases: path.join(root, 'frontend', 'src', 'PurchasesBlock.tsx'),
  styles: path.join(root, 'frontend', 'src', 'styles.css'),
  context: path.join(root, 'frontend', 'src', 'TaskContextStrip.tsx'),
};

for (const file of Object.values(paths)) {
  if (!fs.existsSync(file)) {
    console.error('FAIL отсутствует: ' + file);
    process.exit(1);
  }
}

const app = fs.readFileSync(paths.app, 'utf8');
const poa = fs.readFileSync(paths.poa, 'utf8');
const purchases = fs.readFileSync(paths.purchases, 'utf8');
const styles = fs.readFileSync(paths.styles, 'utf8');
const context = fs.readFileSync(paths.context, 'utf8');

const checks = [
  [context.includes('PART_V064_L_TASK_CONTEXT_STRIP'), 'TaskContextStrip'],
  [context.includes('invoice.isCurrent'), 'текущий счёт'],
  [context.includes('currentInvoice?.sellerType'), 'продавец счёта'],
  [context.includes('currentInvoice?.number'), 'номер счёта'],
  [context.includes('currentInvoice?.amount'), 'сумма счёта'],
  [app.includes('PART_V064_L_GENERIC_TASK_CONTEXT'), 'generic TaskDetail'],
  [poa.includes('PART_V064_L_POA_TASK_CONTEXT'), 'доверенность'],
  [purchases.includes('PART_V064_L_BALANCE_TASK_CONTEXT'), 'корректировка остатка'],
  [purchases.includes('PART_V064_L_SUPPLIER_PAYMENT_CONTEXT'), 'оплата поставщику'],
  [styles.includes('PART_V064_L_TASK_WORKSPACE'), 'CSS workspace'],
  [styles.includes('> .managerResubmitPanel'), 'возврат менеджеру выше контента'],
  [styles.includes("[data-task-status='NEED_DATA']"), 'цвет статуса NEED_DATA'],
  [styles.includes('.taskDetailDealLink'), 'старый дубль ссылки скрывается'],
];

console.log('');
console.log('MSM — аудит v064-L');
console.log('==================');

let failed = false;

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) failed = true;
}

console.log('');

if (failed) {
  console.log('ИТОГ: есть ошибки.');
  process.exit(1);
}

console.log(
  'ИТОГ: OK — экран открытой задачи приведён к новой системе.'
);
