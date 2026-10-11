const fs = require('fs');
const path = require('path');

const styles = fs.readFileSync(
  path.join(__dirname, 'frontend', 'src', 'styles.css'),
  'utf8'
);

const checks = [
  [styles.includes('PART_V064_G_DOC_ROWS_DARK_BG'), 'v064-G установлен'],
  [styles.includes('.invoiceTaskDoc > div > strong'), 'имя файла — отдельная строка'],
  [styles.includes('.invoiceTaskDoc > div > span'), 'тип файла — отдельная строка'],
  [styles.includes('.invoiceTaskDoc > b'), 'Открыть — отдельная правая колонка'],
  [styles.includes("html[data-theme='dark'] #root"), 'root закрашен в dark'],
  [styles.includes('min-height: 100dvh'), 'dark фон на всю высоту'],
];

console.log('');
console.log('MSM — аудит v064-G');
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

console.log('ИТОГ: OK — документы и тёмный фон исправлены.');
