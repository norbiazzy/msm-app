const fs = require('fs');
const path = require('path');

const root = __dirname;
const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

if (!fs.existsSync(appPath)) {
  fail('Не найден frontend/src/App.tsx');
}

const text = fs.readFileSync(
  appPath,
  'utf8'
);

const lines = text.split('\n');

function lineOf(index) {
  return text
    .slice(0, index)
    .split('\n')
    .length;
}

function printWindow(
  title,
  line,
  before = 35,
  after = 65
) {
  const start = Math.max(
    0,
    line - 1 - before
  );

  const end = Math.min(
    lines.length,
    line + after
  );

  console.log('');
  console.log('### ' + title);
  console.log('');

  for (
    let i = start;
    i < end;
    i++
  ) {
    console.log(
      String(i + 1)
        .padStart(5, ' ') +
      ' | ' +
      lines[i]
    );
  }
}

console.log('');
console.log(
  'MSM — контекст returned task / NEED_DATA'
);
console.log(
  '========================================'
);

let foundNeedFix = 0;
let cursor = 0;

while (true) {
  const idx = text.indexOf(
    'Нужно исправить',
    cursor
  );

  if (idx < 0) {
    break;
  }

  foundNeedFix++;

  printWindow(
    `«Нужно исправить» #${foundNeedFix}`,
    lineOf(idx),
    55,
    90
  );

  cursor =
    idx +
    'Нужно исправить'.length;
}

if (foundNeedFix === 0) {
  console.log('');
  console.log(
    'WARN: текст «Нужно исправить» не найден.'
  );
}

const detailIndex = text.search(
  /(?:export\s+)?function\s+TaskDetail\s*\(/
);

if (detailIndex >= 0) {
  printWindow(
    'Начало TaskDetail',
    lineOf(detailIndex),
    5,
    150
  );
} else {
  console.log('');
  console.log(
    'WARN: function TaskDetail не найден.'
  );
}

console.log('');
console.log('### Поля возврата, найденные в App.tsx');
console.log('');

const keys = [
  'returnReason',
  'returnComment',
  'returnNote',
  'returnMessage',
  'needDataReason',
  'needDataComment',
  'returnDetails',
];

for (const key of keys) {
  const count =
    text.split(key).length - 1;

  console.log(
    String(key).padEnd(20, ' ') +
    ': ' +
    count
  );
}

console.log('');
console.log(
  'Аудит ничего не изменяет.'
);
