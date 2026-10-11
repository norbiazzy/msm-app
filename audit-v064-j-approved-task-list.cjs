const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(
  path.join(__dirname, 'frontend', 'src', 'App.tsx'),
  'utf8'
);

const styles = fs.readFileSync(
  path.join(__dirname, 'frontend', 'src', 'styles.css'),
  'utf8'
);

const checks = [
  [app.includes('PART_V064_J_TASK_FILTER_STATE'), 'фильтры подключены'],
  [app.includes('PART_V064_J_TASK_INVOICE_META'), 'организация и счёт подключены'],
  [app.includes('PART_V064_J_APPROVED_TASK_LIST'), 'плоский список подключён'],
  [app.includes("taskFilter === 'ALL'"), 'фильтр Все'],
  [app.includes("taskFilter === 'IN_PROGRESS'"), 'фильтр В работе'],
  [app.includes("taskFilter === 'NEW'"), 'фильтр Новые'],
  [app.includes("taskFilter === 'NEED_DATA'"), 'фильтр Нужно исправить'],
  [app.includes('task.deal.invoices.find'), 'используется текущий invoice сделки'],
  [app.includes('task.deal.sellerType'), 'есть fallback продавца сделки'],
  [styles.includes('.taskFlatList'), 'стили плоской ленты'],
  [styles.includes('.taskCardInvoiceMeta'), 'стили счёта и продавца'],
  [styles.includes('.taskReturnNotice'), 'компактный возврат'],
  [styles.includes('@media (max-width: 720px)'), 'mobile'],
];

console.log('');
console.log('MSM — аудит v064-J');
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
  'ИТОГ: OK — утверждённый список задач установлен.'
);
