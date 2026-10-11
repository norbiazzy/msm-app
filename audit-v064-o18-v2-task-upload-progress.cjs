const fs = require('fs');
const path = require('path');
const root = __dirname;

function read(rel) {
  const file = path.join(root, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

const app = read('frontend/src/App.tsx');
const poa = read('frontend/src/PowerOfAttorneyBlock.tsx');
const uploads = read('frontend/src/backgroundUploads.tsx');
const css = read('frontend/src/styles.css');

const checks = [
  [app.includes('PART_V064_O18_V2_TASK_UPLOAD_PROGRESS'), 'патч установлен'],
  [app.includes('taskUploadJob'), 'progress существующей задачи'],
  [app.includes('taskUploadGhost'), 'progress новой задачи'],
  [app.includes('completedFiles') && app.includes('currentFile'), 'файл и количество'],
  [poa.includes("window.location.hash =\n        '#tasks';"), 'после доверенности → Задачи'],
  [uploads.includes('dealId?: string;'), 'background job содержит dealId'],
  [css.includes('.taskUploadBar'), 'progress bar CSS'],
];

console.log('');
console.log('MSM — аудит v064-O1.8 v2');
console.log('======================');

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

console.log('ИТОГ: OK — процесс загрузки виден прямо в списке задач.');
