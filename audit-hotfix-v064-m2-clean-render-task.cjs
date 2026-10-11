const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(
  path.join(
    __dirname,
    'frontend',
    'src',
    'App.tsx'
  ),
  'utf8'
);

const start =
  app.indexOf(
    'PART_V064_M2_CLEAN_RENDER_TASK'
  );

const end =
  app.indexOf(
    '\n  function renderGroup(',
    start
  );

if (start < 0 || end < 0) {
  console.error(
    'FAIL renderTask v064-M2 не найден'
  );
  process.exit(1);
}

const block =
  app.slice(start, end);

const checks = [
  [block.includes('taskCardMain'), 'card main'],
  [block.includes('taskVariantAMeta'), 'Variant A meta'],
  [block.includes('taskVariantADeal'), 'ЗК'],
  [block.includes('taskVariantAInvoice'), 'счёт'],
  [block.includes('taskVariantAManager'), 'менеджер'],
  [block.includes('taskCreated'), 'дата/время'],
  [block.includes('taskState'), 'статус'],
  [block.includes('taskReturnNotice'), 'возврат'],
];

console.log('');
console.log('MSM — аудит v064-M2');
console.log('===================');

let failed = false;

for (const [ok, label] of checks) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );
  if (!ok) failed = true;
}

if (failed) process.exit(1);

console.log('');
console.log(
  'ИТОГ: OK — renderTask чистый.'
);
