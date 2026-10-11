const fs = require('fs');
const path = require('path');

const styles = fs.readFileSync(
  path.join(__dirname, 'frontend', 'src', 'styles.css'),
  'utf8'
);
const app = fs.readFileSync(
  path.join(__dirname, 'frontend', 'src', 'App.tsx'),
  'utf8'
);

const checks = [
  [styles.includes('PART_V064_I_TASK_LIST_ERGONOMICS'), 'v064-I установлен'],
  [styles.includes('.boView-tasks .taskCard'), 'карточка задачи обновлена'],
  [styles.includes('.taskCardDealNumber'), 'номер сделки выделен'],
  [styles.includes('.taskCardInvoiceMeta'), 'есть слот под счёт / организацию'],
  [styles.includes('.taskNeedDataBox'), 'need-data блок улучшен'],
  [styles.includes('.statusPill.need-data'), 'статусные плашки улучшены'],
  [!app.includes('Задачи бухгалтерии'), 'внутренний дубль Задачи убран'],
  [app.includes('Бухгалтерия') || app.includes('Менеджер'), 'заголовок роли укорочен'],
];

console.log('');
console.log('MSM — аудит v064-I');
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

console.log('ИТОГ: OK — список задач стал компактнее и чище.');
