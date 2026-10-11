const fs = require('fs');
const path = require('path');

const root = __dirname;

const paths = {
  backend: path.join(
    root,
    'backend',
    'src',
    'tasks',
    'tasks.service.ts'
  ),
  app: path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  ),
  repair: path.join(
    root,
    'frontend',
    'src',
    'InvoiceRequestTaskPanel.tsx'
  ),
  styles: path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  ),
};

const marker =
  'PART_V064_O15_ACCOUNTANT_RETURN_MESSAGE';

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8')
    : '';
}

const backend = read(paths.backend);
const app = read(paths.app);
const repair = read(paths.repair);
const styles = read(paths.styles);

const checks = [
  [
    backend.includes(marker),
    'backend marker'
  ],
  [
    /auditEvents:\s*\{[\s\S]*?INVOICE_REQUEST_RETURNED[\s\S]*?createdAt:\s*'desc'/.test(
      backend
    ),
    'backend возвращает auditEvents'
  ],
  [
    app.includes(
      'taskReturnEvent'
    ),
    'список получает возврат'
  ],
  [
    app.includes(
      'taskReturnReason'
    ),
    'список показывает причину'
  ],
  [
    app.includes(
      'taskReturnComment'
    ),
    'список показывает комментарий'
  ],
  [
    repair.includes(
      'accountantReturnEvent'
    ),
    'экран получает возврат'
  ],
  [
    repair.includes(
      'Причина возврата'
    ),
    'экран показывает причину'
  ],
  [
    repair.includes(
      'Комментарий бухгалтера'
    ),
    'экран показывает комментарий'
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
  'MSM — аудит v064-O1.5'
);
console.log(
  '======================'
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
  'ИТОГ: OK — менеджер видит причину и комментарий бухгалтера.'
);
