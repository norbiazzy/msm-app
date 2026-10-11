const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');
const appFile = path.join(root, 'frontend', 'src', 'App.tsx');

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

if (!fs.existsSync(appFile)) {
  fail('Не найден frontend/src/App.tsx');
}

const raw = fs.readFileSync(appFile, 'utf8');
const crlf = raw.includes('\r\n');
let app = raw.replace(/\r\n/g, '\n');

const renderStart = app.indexOf('function renderTask(');
const renderEnd = app.indexOf('\n  function renderGroup(', renderStart);

if (renderStart < 0 || renderEnd < 0) {
  fail('Не удалось найти renderTask()/renderGroup(). Ничего не изменено.');
}

const clientStart = app.indexOf(
  '<span className="taskClient">',
  renderStart
);

const stateStart = app.indexOf(
  '<div className="taskState">',
  clientStart
);

if (
  clientStart < 0 ||
  stateStart < 0 ||
  clientStart > renderEnd ||
  stateStart > renderEnd
) {
  fail('Не найден повреждённый блок карточки задачи. Ничего не изменено.');
}

/*
  taskCardMain closes immediately before taskState.
  We replace ONLY the area inside taskCardMain after the title.
*/
const mainClose = app.lastIndexOf('</div>', stateStart);

if (mainClose < clientStart) {
  fail('Не удалось найти конец taskCardMain. Ничего не изменено.');
}

const cleanBlock = `          <span className="taskClient">
            {task.deal.clientName}
          </span>

          {/* PART_V064_M1_TASK_CARD_REPAIR */}
          {(() => {
            const currentInvoice =
              task.deal.invoices.find(
                (invoice) =>
                  invoice.isCurrent
              ) ??
              task.deal.invoices[0];

            const sellerType =
              currentInvoice?.sellerType ||
              task.deal.sellerType;

            const managerName =
              [
                task.createdBy?.firstName,
                task.createdBy?.lastName,
              ]
                .filter(Boolean)
                .join(' ');

            return (
              <div className="taskVariantAMeta">
                <span className="taskVariantADeal">
                  ЗК-{task.deal.internalNumber}
                </span>

                {currentInvoice?.number && (
                  <span className="taskVariantAPill taskVariantAInvoice">
                    {sellerLabels[sellerType] || sellerType}
                    {' - '}
                    {currentInvoice.number}
                  </span>
                )}

                {managerName && (
                  <span className="taskVariantAPill taskVariantAManager">
                    Менеджер: {managerName}
                  </span>
                )}
              </div>
            );
          })()}

          {task.createdAt && (
            <span className="taskCreated">
              {new Date(
                task.createdAt
              )
                .toLocaleString(
                  'ru-RU',
                  {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )
                .replace(',', ' ·')}
            </span>
          )}

`;

const next =
  app.slice(0, clientStart) +
  cleanBlock +
  app.slice(mainClose);

const verifyStart = next.indexOf('function renderTask(');
const verifyEnd = next.indexOf('\n  function renderGroup(', verifyStart);
const verify = next.slice(verifyStart, verifyEnd);

const checks = [
  [verify.includes('PART_V064_M1_TASK_CARD_REPAIR'), 'исправленный JSX вставлен'],
  [verify.includes('taskVariantAMeta'), 'Variant A meta сохранён'],
  [verify.includes('task.createdBy?.firstName'), 'менеджер сохранён'],
  [verify.includes("{' - '}"), 'формат МСМ - ХХХ сохранён'],
  [verify.includes("year: 'numeric'"), 'дата + время сохранены'],
  [verify.includes(".replace(',', ' ·')"), 'формат даты аккуратный'],
];

console.log('');
console.log('hotfix v064-M1 — repair TaskCard JSX');
console.log('===================================');

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);
  if (!ok) fail('Проверка не пройдена: ' + label);
}

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файл не изменён.');
  process.exit(0);
}

if (next === app) {
  console.log('');
  console.log('Изменений нет.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

fs.copyFileSync(
  appFile,
  appFile + '.before-v064-m1-' + stamp
);

fs.writeFileSync(
  appFile,
  crlf ? next.replace(/\n/g, '\r\n') : next,
  'utf8'
);

console.log('');
console.log('HOTFIX применён: frontend/src/App.tsx');
