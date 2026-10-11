const fs = require('fs');
const path = require('path');

const root = __dirname;

const app = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'App.tsx'),
  'utf8'
);
const api = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'api.ts'),
  'utf8'
);
const styles = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'styles.css'),
  'utf8'
);
const service = fs.readFileSync(
  path.join(
    root,
    'backend',
    'src',
    'tasks',
    'tasks.service.ts'
  ),
  'utf8'
);

const checks = [
  [service.includes('PART_V064_M_TASK_CREATED_BY'), 'createdBy include'],
  [service.includes('firstName: true'), 'имя creator'],
  [api.includes('PART_V064_M_TASK_CREATED_BY_TYPE'), 'createdBy type'],
  [app.includes('PART_V064_M_TASK_LIST_A_META'), 'Variant A meta'],
  [app.includes('task.createdBy?.firstName'), 'менеджер'],
  [app.includes('currentInvoice?.number'), 'текущий счёт'],
  [app.includes("{' - '}"), 'формат продавец - счёт'],
  [app.includes("year: 'numeric'"), 'дата + год'],
  [styles.includes('.taskVariantADeal'), 'ЗК styled'],
  [styles.includes('.taskVariantAManager'), 'manager pill styled'],
  [styles.includes('@media (min-width: 721px)'), 'desktop nav'],
  [styles.includes('background: #1b2026'), 'контраст nav'],
];

console.log('');
console.log('MSM — аудит v064-M');
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
  'ИТОГ: OK — Variant A + manager + invoice + desktop nav.'
);
