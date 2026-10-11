const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

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

const raw = fs.readFileSync(appPath, 'utf8');
const crlf = raw.includes('\r\n');
let app = raw.replace(/\r\n/g, '\n');

const marker =
  'PART_V064_O14_V2_CORRECTION_TAKE_BUTTON';

if (app.includes(marker)) {
  console.log('');
  console.log('v064-O1.4 v2 уже установлен.');
  process.exit(0);
}

const takeCheck =
  /async function take\(\)\s*\{[\s\S]*?updateTaskStatus\([\s\S]*?task\.id,[\s\S]*?'IN_PROGRESS',[\s\S]*?user\.id,[\s\S]*?\);[\s\S]*?setStatus\([\s\S]*?'IN_PROGRESS'[\s\S]*?\);/;

if (!takeCheck.test(app)) {
  fail(
    'Не найден ожидаемый take() для перевода задачи в IN_PROGRESS.'
  );
}

const anchor =
`      {task.type ===
        'CORRECT_CLIENT_INVOICE' &&
        currentTaskInvoice && (`;

const count =
  app.split(anchor).length - 1;

if (count !== 1) {
  fail(
    'Ожидался 1 блок CORRECT_CLIENT_INVOICE, найдено: ' +
    count
  );
}

const button =
`      {/* ${marker} */}
      {task.type ===
        'CORRECT_CLIENT_INVOICE' &&
        status === 'NEW' && (

        <div className="correctionTaskStartActions">

          <button
            type="button"
            className="primary wide"
            disabled={saving}
            onClick={take}
          >
            {
              saving
                ? 'Сохраняем…'
                : 'В работу'
            }
          </button>

        </div>

      )}


`;

app = app.replace(
  anchor,
  button + anchor
);

const checks = [
  [
    app.includes(marker),
    'кнопка добавлена'
  ],
  [
    app.includes(
      "task.type ===\n        'CORRECT_CLIENT_INVOICE' &&\n        status === 'NEW'"
    ),
    'только для новой корректировки'
  ],
  [
    app.includes(
      'onClick={take}'
    ),
    'используется текущий take()'
  ],
  [
    takeCheck.test(app),
    'переход в IN_PROGRESS сохранён'
  ],
];

console.log('');
console.log(
  'v064-O1.4 v2 — кнопка «В работу» для корректировки'
);
console.log(
  '================================================='
);

for (const [ok, label] of checks) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    fail(
      'Проверка не пройдена: ' +
      label
    );
  }
}

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

const backup =
  appPath +
  '.before-v064-o14-v2-' +
  stamp;

fs.copyFileSync(
  appPath,
  backup
);

fs.writeFileSync(
  appPath,
  crlf
    ? app.replace(/\n/g, '\r\n')
    : app,
  'utf8'
);

console.log('');
console.log('v064-O1.4 v2 применён.');
console.log(
  'Изменён только frontend/src/App.tsx'
);
console.log(
  'Backup: ' + backup
);
