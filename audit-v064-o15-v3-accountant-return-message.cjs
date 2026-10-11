const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(rel) {
  const file =
    path.join(
      root,
      rel
    );

  return fs.existsSync(file)
    ? fs.readFileSync(
        file,
        'utf8'
      )
    : '';
}

const backend =
  read(
    'backend/src/tasks/tasks.service.ts'
  );

const app =
  read(
    'frontend/src/App.tsx'
  );

const repair =
  read(
    'frontend/src/InvoiceRequestTaskPanel.tsx'
  );

const styles =
  read(
    'frontend/src/styles.css'
  );

const checks = [
  [
    backend.includes(
      'PART_1N_RETURN_AUDIT_EVENTS'
    ) &&
    backend.includes(
      "'INVOICE_REQUEST_RETURNED'"
    ),
    'backend возвраты'
  ],
  [
    app.includes(
      'PART_V064_O15_V3_ACCOUNTANT_RETURN_MESSAGE'
    ),
    'патч установлен'
  ],
  [
    app.includes(
      'accountantReturnReason'
    ),
    'список: причина'
  ],
  [
    app.includes(
      'accountantReturnComment'
    ),
    'список: комментарий'
  ],
  [
    app.includes(
      'Комментарий бухгалтера'
    ),
    'список: подпись комментария'
  ],
  [
    repair.includes(
      'Бухгалтер вернул задачу'
    ),
    'задача: заголовок'
  ],
  [
    repair.includes(
      'Что нужно исправить'
    ),
    'задача: пояснение'
  ],
  [
    repair.includes(
      'Комментарий бухгалтера'
    ),
    'задача: комментарий'
  ],
  [
    styles.includes(
      'taskReturnNoticeV3'
    ),
    'CSS списка'
  ],
  [
    styles.includes(
      'invoiceManagerReturnCard'
    ),
    'CSS задачи'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O1.5 v3'
);
console.log(
  '========================='
);

let failed = false;

for (const [ok, label] of checks) {
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
  'ИТОГ: OK — причина и комментарий бухгалтера видны менеджеру.'
);
