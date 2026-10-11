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
    /auditEvents:\s*\{[\s\S]*?INVOICE_REQUEST_RETURNED/.test(
      backend
    ),
    'backend отдаёт возврат'
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
      'Вернул бухгалтер'
    ),
    'список: «Вернул бухгалтер»'
  ],
  [
    repair.includes(
      'accountantReturnReason'
    ),
    'задача: причина'
  ],
  [
    repair.includes(
      'Комментарий бухгалтера'
    ),
    'задача: комментарий'
  ],
  [
    styles.includes(
      'invoiceManagerReturnCard'
    ),
    'CSS'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O1.5 v2'
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
