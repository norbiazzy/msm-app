const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(
  path.join(__dirname, 'frontend', 'src', 'App.tsx'),
  'utf8'
);

const start = app.indexOf('function renderTask(');
const end = app.indexOf('\n  function renderGroup(', start);

if (start < 0 || end < 0) {
  console.error('FAIL renderTask не найден');
  process.exit(1);
}

const block = app.slice(start, end);

const checks = [
  [block.includes('PART_V064_M1_TASK_CARD_REPAIR'), 'hotfix установлен'],
  [block.includes('<span className="taskClient">'), 'клиент'],
  [block.includes('taskVariantADeal'), 'ЗК'],
  [block.includes('taskVariantAInvoice'), 'МСМ/СТ/ИП - номер счёта'],
  [block.includes('taskVariantAManager'), 'менеджер'],
  [block.includes("year: 'numeric'"), 'дата и время'],
  [block.includes('<div className="taskState">'), 'статус'],
];

console.log('');
console.log('MSM — аудит hotfix v064-M1');
console.log('============================');

let failed = false;
for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
console.log('');
console.log('ИТОГ: OK — JSX карточки задачи восстановлен.');
