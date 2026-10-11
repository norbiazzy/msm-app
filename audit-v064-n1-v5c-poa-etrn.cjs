const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(...parts) {
  const file =
    path.join(
      root,
      ...parts
    );

  if (!fs.existsSync(file)) {
    console.error(
      'FAIL отсутствует: ' +
      file
    );
    process.exit(1);
  }

  return fs.readFileSync(
    file,
    'utf8'
  );
}

const controller =
  read(
    'backend',
    'src',
    'tasks',
    'tasks.controller.ts'
  );

const service =
  read(
    'backend',
    'src',
    'tasks',
    'tasks.service.ts'
  );

const api =
  read(
    'frontend',
    'src',
    'api.ts'
  );

const power =
  read(
    'frontend',
    'src',
    'PowerOfAttorneyBlock.tsx'
  );

const panel =
  read(
    'frontend',
    'src',
    'PoaEtrnPanel.tsx'
  );

const structured =
  read(
    'frontend',
    'src',
    'TaskStructuredFields.tsx'
  );

const checks = [
  [controller.includes("@Post('etrn')"), 'POST /tasks/etrn'],
  [service.includes('TaskType.ETRN'), 'TaskType.ETRN'],
  [service.includes('requestEtrn:'), 'requestEtrn saved'],
  [api.includes('createEtrnTask'), 'createEtrnTask API'],
  [power.includes('Доверенность + ЭТРН'), 'Доверенность + ЭТРН'],
  [power.includes('<PoaEtrnPanel'), 'panel in ready POA'],
  [panel.includes('+ Запросить ЭТРН'), '+ Запросить ЭТРН'],
  [panel.includes('Заполнить данные ЭТРН'), 'combined flow'],
  [structured.includes("'ETRN'"), 'existing ETRN fields'],
];

console.log('');
console.log(
  'MSM — аудит v064-N1 v5c'
);
console.log(
  '========================'
);

let failed = false;

for (
  const [ok, label]
  of checks
) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    failed = true;
  }
}

console.log('');

if (failed) {
  console.log(
    'ИТОГ: есть ошибки.'
  );
  process.exit(1);
}

console.log(
  'ИТОГ: OK — Доверенность → ЭТРН подключена.'
);
