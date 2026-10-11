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

const start = app.indexOf('  function renderTask(');
const end = app.indexOf('\n  function renderGroup(', start);

if (start < 0 || end < 0) {
  fail(
    'Не удалось найти границы renderTask(). ' +
    'Ничего не изменено.'
  );
}

const cleanRenderTask = `  function renderTask(
    task: Task,
    completedTask = false
  ) {

    // PART_V064_M2_CLEAN_RENDER_TASK
    const statusClass =
      task.status
        .toLowerCase()
        .replace(
          /_/g,
          '-'
        );

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

    const returnText =
      task.status === 'NEED_DATA'
        ? String(
            task.payload?.returnComment ||
            task.payload?.returnReason ||
            task.description ||
            ''
          )
        : '';

    const createdLabel =
      task.createdAt
        ? new Date(
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
            .replace(',', ' ·')
        : '';

    return (
      <button
        key={task.id}
        type="button"
        className={
          'taskCard taskCardStatus-' +
          statusClass +
          (
            task.urgent &&
            !completedTask
              ? ' taskCardUrgent'
              : ''
          ) +
          (
            completedTask
              ? ' taskCardCompleted'
              : ''
          )
        }
        onClick={() =>
          openTask(task)
        }
      >
        <div className="taskCardMain">
          <div className="taskCardTitle">
            <strong>
              {task.title}
            </strong>

            {task.urgent &&
              !completedTask && (
              <b className="urgent">
                СРОЧНО
              </b>
            )}
          </div>

          <span className="taskClient">
            {task.deal.clientName}
          </span>

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

          {createdLabel && (
            <span className="taskCreated">
              {createdLabel}
            </span>
          )}
        </div>

        <div className="taskState">
          <span
            className={
              'taskStatusBadge taskStatus-' +
              statusClass
            }
          >
            {
              taskStatus(
                task.status
              )
            }
          </span>
        </div>

        {task.status === 'NEED_DATA' && (
          <div className="taskReturnNotice">
            <strong>
              Вернул бухгалтер
            </strong>

            {returnText && (
              <span>
                {returnText}
              </span>
            )}

            <em>
              Открыть и исправить →
            </em>
          </div>
        )}
      </button>
    );
  }
`;

const next =
  app.slice(0, start) +
  cleanRenderTask +
  app.slice(end);

const verifyStart =
  next.indexOf(
    'PART_V064_M2_CLEAN_RENDER_TASK'
  );

const verifyEnd =
  next.indexOf(
    '\n  function renderGroup(',
    verifyStart
  );

const verify =
  next.slice(
    verifyStart,
    verifyEnd
  );

const checks = [
  [
    verify.includes('taskVariantAMeta'),
    'Variant A'
  ],
  [
    verify.includes('task.createdBy?.firstName'),
    'менеджер'
  ],
  [
    verify.includes("year: 'numeric'"),
    'дата и время'
  ],
  [
    verify.includes("{' - '}"),
    'формат МСМ - ХХХ'
  ],
  [
    verify.includes("task.status === 'NEED_DATA'"),
    'возврат'
  ],
  [
    verify.includes('taskStatus('),
    'статус'
  ],
];

console.log('');
console.log('hotfix v064-M2 — clean renderTask');
console.log('================================');

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
    'CHECK ONLY — файл не изменён.'
  );
  process.exit(0);
}

const stamp =
  new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

fs.copyFileSync(
  appFile,
  appFile +
    '.before-v064-m2-' +
    stamp
);

fs.writeFileSync(
  appFile,
  crlf
    ? next.replace(/\n/g, '\r\n')
    : next,
  'utf8'
);

console.log('');
console.log(
  'HOTFIX v064-M2 применён.'
);
