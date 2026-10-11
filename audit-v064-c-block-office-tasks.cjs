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
  [app.includes('boShell boView-'), 'v064-A+B активен'],
  [styles.includes('PART_V064_C_BLOCK_OFFICE_TASKS'), 'CSS v064-C установлен'],
  [styles.includes('.boView-tasks .taskQueue'), 'список задач'],
  [styles.includes('.boView-tasks .taskGroupWorking'), 'группа В работе'],
  [styles.includes('.boView-tasks .taskGroupNew'), 'группа Новые'],
  [styles.includes('.boView-tasks .taskGroupNeedData'), 'группа Нужно исправить'],
  [styles.includes('.boView-tasks .taskCardUploadState'), 'прогресс отправки'],
  [styles.includes('.boView-tasks .detailHero'), 'открытая задача'],
  [styles.includes('.boView-tasks .versionRow'), 'документы задачи'],
  [styles.includes('@media (max-width: 720px)'), 'mobile адаптация'],
];

console.log('');
console.log('MSM — аудит v064-C');
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

console.log('ИТОГ: OK — задачи переведены в Block Office.');
