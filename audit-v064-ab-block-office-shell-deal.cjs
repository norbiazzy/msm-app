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
  [app.includes('boShell boView-'), 'boShell подключён'],
  [styles.includes('PART_V064_AB_BLOCK_OFFICE_SHELL_DEAL'), 'CSS v064-A+B установлен'],
  [styles.includes('.boShell .topbar'), 'общая шапка Block Office'],
  [styles.includes('.boShell input'), 'общие поля Block Office'],
  [styles.includes('.boView-deal .detailHero'), 'hero карточки сделки'],
  [styles.includes('.boView-deal .panel'), 'секции карточки сделки'],
  [styles.includes('.boView-deal .versionRow'), 'файлы карточки сделки'],
  [styles.includes('.boView-deal .dealTaskLink'), 'задачи внутри сделки'],
  [styles.includes("@media (max-width: 720px)"), 'mobile стили'],
];

console.log('');
console.log('MSM — аудит v064-A+B');
console.log('====================');

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

console.log('ИТОГ: OK — v064-A+B установлен.');
