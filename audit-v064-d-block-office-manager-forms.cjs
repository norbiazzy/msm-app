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
  [styles.includes('PART_V064_D_BLOCK_OFFICE_MANAGER_FORMS'), 'CSS v064-D установлен'],
  [styles.includes('.boView-new .content.form'), 'Новая сделка / запрос'],
  [styles.includes('.boView-new .segmented'), 'Переключатели формы'],
  [styles.includes('.boView-deal .powerBox'), 'Блок доверенностей'],
  [styles.includes('.boView-deal .powerForm'), 'Форма доверенности'],
  [styles.includes('[class*="purchaseForm"]'), 'Закупка'],
  [styles.includes('.taskStructuredEdit'), 'ETRN / structured edit'],
  [styles.includes('.managerResubmitPanel'), 'Повторная отправка'],
  [styles.includes('@media (max-width: 720px)'), 'Mobile'],
];

console.log('');
console.log('MSM — аудит v064-D');
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

console.log('ИТОГ: OK — формы менеджера переведены в Block Office.');
