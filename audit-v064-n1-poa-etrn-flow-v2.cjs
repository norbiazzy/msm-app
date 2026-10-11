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

const app =
  read(
    'frontend',
    'src',
    'App.tsx'
  );

const etrnTask =
  read(
    'frontend',
    'src',
    'EtrnTask.tsx'
  );

const poaEtrn =
  read(
    'frontend',
    'src',
    'PoaEtrnPanel.tsx'
  );

const styles =
  read(
    'frontend',
    'src',
    'styles.css'
  );

const checks = [
  [
    controller.includes(
      "@Post('etrn')"
    ),
    'POST /tasks/etrn'
  ],
  [
    controller.includes(
      'resubmit-etrn'
    ),
    'ETRN resubmit'
  ],
  [
    service.includes(
      'TaskType.ETRN'
    ),
    'ETRN type'
  ],
  [
    service.includes(
      "kind:\n                'ETRN'"
    ),
    'ETRN payload'
  ],
  [
    service.includes(
      'details: {'
    ),
    'ETRN details payload'
  ],
  [
    service.includes(
      'requestEtrn'
    ),
    'POA+ETRN flag'
  ],
  [
    service.includes(
      'normalizedPoaNumber'
    ),
    'POA number persisted'
  ],
  [
    api.includes(
      'createEtrnTask'
    ),
    'create API'
  ],
  [
    api.includes(
      'resubmitEtrnTask'
    ),
    'resubmit API'
  ],
  [
    power.includes(
      'Доверенность + ЭТРН'
    ),
    'POA+ETRN UI'
  ],
  [
    power.includes(
      '№ готовой доверенности'
    ),
    'POA number UI'
  ],
  [
    power.includes(
      '<PoaEtrnPanel'
    ),
    'ready POA action'
  ],
  [
    poaEtrn.includes(
      'Заполнить данные ЭТРН'
    ),
    'pending ETRN CTA'
  ],
  [
    poaEtrn.includes(
      '+ Запросить ЭТРН'
    ),
    'ready POA ETRN CTA'
  ],
  [
    etrnTask.includes(
      'ReturnToManagerPanel'
    ),
    'accountant return'
  ],
  [
    etrnTask.includes(
      'Повторно отправить бухгалтерии'
    ),
    'same-task manager resubmit'
  ],
  [
    etrnTask.includes(
      'ЭТРН создана'
    ),
    'ETRN complete'
  ],
  [
    app.includes(
      'PART_V064_N1_ETRN_DISPATCH'
    ),
    'ETRN route'
  ],
  [
    styles.includes(
      'PART_V064_N1_ETRN_FLOW'
    ),
    'styles'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-N1'
);
console.log(
  '===================='
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
  'ИТОГ: OK — доверенность → ЭТРН подключена.'
);
