const fs = require('fs');
const path = require('path');

const root = __dirname;

const styles = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'styles.css'),
  'utf8'
);

const resubmit = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'ManagerResubmitPanel.tsx'),
  'utf8'
);

const checks = [
  [styles.includes('PART_V064_H_TASK_DETAIL_RETURN_REBUILD'), 'v064-H установлен'],
  [styles.includes('.boView-tasks .detailHero'), 'новая шапка задачи'],
  [styles.includes('.boView-tasks .taskDetailDealLink'), 'ссылка на сделку'],
  [styles.includes('.boView-tasks .invoiceTaskDataCard'), 'блок данных менеджера'],
  [styles.includes('.boView-tasks .invoiceTaskDocs'), 'блок документов'],
  [styles.includes('.boView-tasks .invoiceTaskStartActions'), 'действия бухгалтера'],
  [styles.includes('[class*="returnToManager"]'), 'возврат менеджеру'],
  [styles.includes('.boView-tasks .managerResubmitPanel'), 'исправление и повторная отправка'],
  [styles.includes('.managerResubmitHead::before'), 'статус Нужно исправить'],
  [styles.includes('@media (max-width: 720px)'), 'mobile'],
  [resubmit.includes('managerResubmitPanel'), 'логика ManagerResubmitPanel сохранена'],
];

console.log('');
console.log('MSM — аудит v064-H');
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
  'ИТОГ: OK — задача и возврат менеджеру пересобраны визуально.'
);
