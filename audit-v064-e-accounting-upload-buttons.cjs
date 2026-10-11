const fs = require('fs');
const path = require('path');

const root = __dirname;

const app = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'App.tsx'),
  'utf8'
);

const styles = fs.readFileSync(
  path.join(root, 'frontend', 'src', 'styles.css'),
  'utf8'
);

const checks = [
  [app.includes('boShell boView-'), 'Block Office shell активен'],
  [styles.includes('PART_V064_E_BLOCK_OFFICE_ACCOUNTING'), 'CSS v064-E установлен'],
  [styles.includes('.field:has(input[type="file"])'), 'единый вид кнопок прикрепления'],
  [styles.includes('min-height: 54px !important'), 'кнопки загрузки крупные'],
  [styles.includes('.invoiceTaskDataGrid'), 'данные запроса'],
  [styles.includes('.invoiceTaskTextBlock'), 'текстовые данные'],
  [styles.includes('.invoiceTaskDocs'), 'документы менеджера'],
  [styles.includes('.invoiceTaskStartActions'), 'старт задачи'],
  [styles.includes('.invoiceTaskInWorkBox'), 'задача в работе'],
  [styles.includes('[class*="returnToManager"]'), 'возврат менеджеру'],
  [styles.includes('.powerTaskGrid'), 'доверенность бухгалтерии'],
  [styles.includes('@media (max-width: 720px)'), 'mobile'],
];

console.log('');
console.log('MSM — аудит v064-E');
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
  'ИТОГ: OK — бухгалтерия и кнопки загрузки переведены в Block Office.'
);
