const fs = require('fs');
const path = require('path');

const root = __dirname;

const targets = [
  {
    file: 'backend/src/tasks/tasks.controller.ts',
    patterns: [
      "@Post('power-of-attorney')",
      "@Post(':id/complete-power-of-attorney')",
      'completePowerOfAttorney(',
    ],
  },
  {
    file: 'backend/src/tasks/tasks.service.ts',
    patterns: [
      'async createPowerOfAttorney(',
      'async completePowerOfAttorney(',
      'TaskType.POWER_OF_ATTORNEY',
    ],
  },
  {
    file: 'frontend/src/api.ts',
    patterns: [
      'export type Task = {',
      'createPowerOfAttorneyTask(',
      'completePowerOfAttorneyTask(',
    ],
  },
  {
    file: 'frontend/src/PowerOfAttorneyBlock.tsx',
    patterns: [
      'export function PowerOfAttorneyBlock(',
      'async function createTask(',
      'async function submit(',
      'sourceFiles.length > 0',
      'resultFiles.length > 0',
      'export function PowerOfAttorneyTask(',
      'const [files, setFiles]',
      'function finish()',
      'Готовая доверенность',
    ],
  },
  {
    file: 'frontend/src/App.tsx',
    patterns: [
      'if (selected) {',
      "selected.type === 'POWER_OF_ATTORNEY'",
      'PowerOfAttorneyTask',
    ],
  },
  {
    file: 'frontend/src/TaskStructuredFields.tsx',
    patterns: [
      'type TaskDetails',
      'export type TaskDetails',
      "taskType ===\n    'ETRN'",
      '№ доверенности',
    ],
  },
];

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function printAround(file, text, pattern, before=28, after=90) {
  const index = text.indexOf(pattern);
  console.log('\n------------------------------------------------------------');
  console.log('FILE:', file);
  console.log('PATTERN:', JSON.stringify(pattern));

  if (index < 0) {
    console.log('NOT FOUND');
    return;
  }

  const lines = text.split('\n');
  const line = lineNumber(text, index);
  const from = Math.max(1, line-before);
  const to = Math.min(lines.length, line+after);
  console.log(`LINES ${from}-${to} (match at ${line})`);

  for (let n=from; n<=to; n++) {
    const mark = n===line ? '>>' : '  ';
    console.log(mark + String(n).padStart(5,' ') + ' | ' + lines[n-1]);
  }
}

console.log('MSM v064-N1 — EXACT LOCAL AUDIT');
console.log('READ ONLY — НИЧЕГО НЕ ИЗМЕНЯЕТ');
console.log('ROOT:', root);

for (const target of targets) {
  const full = path.join(root, target.file);

  if (!fs.existsSync(full)) {
    console.log('\n============================================================');
    console.log('MISSING FILE:', target.file);
    continue;
  }

  const text = fs.readFileSync(full,'utf8').replace(/\r\n/g,'\n');

  for (const pattern of target.patterns) {
    printAround(target.file,text,pattern);
  }
}

console.log('\n============================================================');
console.log('ГОТОВО. Пришли весь вывод от начала до конца.');
console.log('Скрипт ничего не записывал и не менял.');
