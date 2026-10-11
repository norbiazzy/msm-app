const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appFile =
  path.join(root, 'frontend', 'src', 'App.tsx');

const apiFile =
  path.join(root, 'frontend', 'src', 'api.ts');

const stylesFile =
  path.join(root, 'frontend', 'src', 'styles.css');

const tasksServiceFile =
  path.join(
    root,
    'backend',
    'src',
    'tasks',
    'tasks.service.ts'
  );

const cssContent = "/* PART_V064_M_TASK_LIST_A */\n\n/* =========================================================\n   APPROVED TASK LIST — VARIANT A\n   ========================================================= */\n\n.boView-tasks .taskFlatList,\n.boView-tasks .dealList {\n  gap: 7px;\n}\n\n.boView-tasks .taskFlatList .taskCard,\n.boView-tasks .taskCard {\n  position: relative;\n  overflow: hidden;\n  display: grid;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 8px 14px;\n  align-items: start;\n  width: 100%;\n  min-height: 106px;\n  border: 1px solid var(--bo-line);\n  border-radius: 9px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: var(--bo-shadow);\n  padding: 12px 13px 11px 16px;\n  text-align: left;\n}\n\n.boView-tasks .taskCard::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 4px;\n  background: var(--bo-blue);\n}\n\n.boView-tasks .taskCardStatus-new::before {\n  background: var(--bo-gold);\n}\n\n.boView-tasks .taskCardStatus-need_data::before,\n.boView-tasks .taskCardStatus-need-data::before {\n  background: var(--bo-red);\n}\n\n.boView-tasks .taskCardMain {\n  min-width: 0;\n}\n\n.boView-tasks .taskCardTitle {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 7px;\n  align-items: center;\n}\n\n.boView-tasks .taskCardTitle > strong {\n  color: var(--bo-text);\n  font-size: 15px;\n  font-weight: 900;\n  line-height: 1.23;\n}\n\n.boView-tasks .taskClient {\n  display: block;\n  margin-top: 3px;\n  color: var(--bo-muted);\n  font-size: 11px;\n  line-height: 1.35;\n}\n\n/* Main metadata line approved in Variant A */\n.boView-tasks .taskVariantAMeta {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 5px;\n  margin-top: 8px;\n}\n\n.boView-tasks .taskVariantADeal {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  color: var(--bo-text);\n  font-size: 14px;\n  font-weight: 950;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskVariantADeal::before {\n  content: '■';\n  color: var(--bo-accent);\n  font-size: 8px;\n}\n\n.boView-tasks .taskVariantAPill {\n  display: inline-flex;\n  align-items: center;\n  min-height: 24px;\n  border: 1px solid var(--bo-line);\n  border-radius: 999px;\n  background: var(--bo-panel-2);\n  color: var(--bo-muted);\n  font-size: 10px;\n  font-weight: 800;\n  padding: 4px 8px;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskVariantAInvoice,\n.boView-tasks .taskVariantAManager {\n  color: var(--bo-text);\n  font-weight: 900;\n}\n\n.boView-tasks .taskCreated {\n  display: block;\n  margin-top: 7px;\n  color: var(--bo-muted);\n  font-size: 10px;\n  line-height: 1.35;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskState {\n  align-self: start;\n  justify-self: end;\n}\n\n.boView-tasks .taskStatusBadge {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 29px;\n  border: 1px solid var(--bo-line);\n  border-radius: 5px;\n  background: var(--bo-panel-2);\n  color: var(--bo-blue);\n  font-size: 10px;\n  font-weight: 900;\n  padding: 5px 8px;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskStatus-new {\n  color: var(--bo-gold);\n}\n\n.boView-tasks .taskStatus-need_data,\n.boView-tasks .taskStatus-need-data {\n  color: #a38ad0;\n}\n\n/* Existing v064-J metadata is hidden once the approved A metadata exists. */\n.boView-tasks .taskCard:has(.taskVariantAMeta)\n  .taskCardInvoiceMeta {\n  display: none !important;\n}\n\n/* Return reason remains one compact line. */\n.boView-tasks .taskReturnNotice {\n  grid-column: 1 / -1;\n  margin-top: 1px;\n  border-top: 1px solid var(--bo-line);\n  background: transparent;\n}\n\n/* =========================================================\n   DESKTOP NAV — readable, not almost black on black\n   ========================================================= */\n\n@media (min-width: 721px) {\n  .bottomNav,\n  .boMobileNav {\n    left: 50% !important;\n    right: auto !important;\n    bottom: 14px !important;\n    transform: translateX(-50%);\n    width: min(720px, calc(100vw - 40px)) !important;\n    min-height: 56px;\n    display: grid !important;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 4px;\n    padding: 5px !important;\n    border: 1px solid #3e4752 !important;\n    border-radius: 11px !important;\n    background: #1b2026 !important;\n    box-shadow: 0 12px 30px rgba(0,0,0,.32) !important;\n    opacity: 1 !important;\n  }\n\n  .bottomNav button,\n  .boMobileNav button,\n  .boMobileNav a {\n    min-height: 44px !important;\n    border: 0 !important;\n    border-radius: 7px !important;\n    background: transparent !important;\n    color: #aab4be !important;\n    opacity: 1 !important;\n    font-size: 13px !important;\n    font-weight: 850 !important;\n  }\n\n  .bottomNav button.active,\n  .boMobileNav button.active,\n  .boMobileNav a.active {\n    background: #303944 !important;\n    color: #ffffff !important;\n  }\n\n  .bottomNav button:disabled,\n  .boMobileNav button:disabled {\n    color: #6f7b86 !important;\n    opacity: 1 !important;\n  }\n}\n\n@media (max-width: 720px) {\n  .boView-tasks .taskCard {\n    grid-template-columns: minmax(0, 1fr) auto;\n    min-height: 0;\n    gap: 7px 8px;\n    padding: 12px 10px 11px 14px;\n  }\n\n  .boView-tasks .taskCardTitle > strong {\n    font-size: 15px;\n  }\n\n  .boView-tasks .taskVariantAMeta {\n    gap: 5px;\n  }\n\n  .boView-tasks .taskVariantADeal {\n    font-size: 14px;\n  }\n\n  .boView-tasks .taskVariantAPill {\n    max-width: 100%;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n}\n\n/* END_PART_V064_M_TASK_LIST_A */";

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }

  const raw = fs.readFileSync(file, 'utf8');

  return {
    raw,
    crlf: raw.includes('\r\n'),
    text: raw.replace(/\r\n/g, '\n'),
  };
}

function writeWithBackup(file, source, next, tag) {
  if (source.text === next) {
    return false;
  }

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  fs.copyFileSync(
    file,
    file + '.before-' + tag + '-' + stamp
  );

  const output =
    source.crlf
      ? next.replace(/\n/g, '\r\n')
      : next;

  fs.writeFileSync(file, output, 'utf8');
  return true;
}

const appSource = read(appFile);
const apiSource = read(apiFile);
const stylesSource = read(stylesFile);
const serviceSource = read(tasksServiceFile);

let app = appSource.text;
let api = apiSource.text;
let styles = stylesSource.text;
let service = serviceSource.text;

/* ---------------------------------------------------------
   1. Backend: expose task creator to accountant.
   No DB migration: relation already exists.
   --------------------------------------------------------- */
if (!service.includes('PART_V064_M_TASK_CREATED_BY')) {
  const assigneeMarker =
    service.indexOf(
      '          assignee: {'
    );

  if (assigneeMarker < 0) {
    fail(
      'Не найден include assignee в tasks.service.ts.'
    );
  }

  const createdByBlock =
`          // PART_V064_M_TASK_CREATED_BY
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },


`;

  service =
    service.slice(0, assigneeMarker) +
    createdByBlock +
    service.slice(assigneeMarker);
}

/* ---------------------------------------------------------
   2. Frontend Task type: createdBy.
   --------------------------------------------------------- */
if (!api.includes('PART_V064_M_TASK_CREATED_BY_TYPE')) {
  const taskDeal =
    api.indexOf('  deal: Deal;');

  if (taskDeal < 0) {
    fail('Не найден Task.deal в api.ts.');
  }

  const insertAt =
    api.indexOf('\n', taskDeal) + 1;

  const creatorType =
`  // PART_V064_M_TASK_CREATED_BY_TYPE
  createdBy?: {
    id: string;
    firstName: string;
    lastName?: string;
    role: string;
  };
`;

  api =
    api.slice(0, insertAt) +
    creatorType +
    api.slice(insertAt);
}

/* ---------------------------------------------------------
   3. Variant A card metadata.
   --------------------------------------------------------- */
if (!app.includes('PART_V064_M_TASK_LIST_A_META')) {
  const functionMarker =
    app.indexOf('function renderTask(');

  if (functionMarker < 0) {
    fail('Не найден renderTask() в App.tsx.');
  }

  const functionEnd =
    app.indexOf(
      '\n  function renderGroup(',
      functionMarker
    );

  const rangeEnd =
    functionEnd >= 0
      ? functionEnd
      : app.length;

  let taskClientStart =
    app.indexOf(
      '<span className="taskClient">',
      functionMarker
    );

  if (
    taskClientStart < 0 ||
    taskClientStart > rangeEnd
  ) {
    fail(
      'Не найден taskClient внутри renderTask().'
    );
  }

  const taskClientEnd =
    app.indexOf(
      '</span>',
      taskClientStart
    );

  if (
    taskClientEnd < 0 ||
    taskClientEnd > rangeEnd
  ) {
    fail('Не найден конец taskClient.');
  }

  const oldClient =
    app.slice(
      taskClientStart,
      taskClientEnd + '</span>'.length
    );

  let newClient =
`<span className="taskClient">
            {task.deal.clientName}
          </span>`;

  app =
    app.slice(0, taskClientStart) +
    newClient +
    app.slice(
      taskClientEnd + '</span>'.length
    );

  /* re-locate after replacement */
  taskClientStart =
    app.indexOf(
      '<span className="taskClient">',
      functionMarker
    );

  const newClientEnd =
    app.indexOf(
      '</span>',
      taskClientStart
    ) +
    '</span>'.length;

  const metaCode =
`

          {/* PART_V064_M_TASK_LIST_A_META */}
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
`;

  app =
    app.slice(0, newClientEnd) +
    metaCode +
    app.slice(newClientEnd);
}

/* ---------------------------------------------------------
   4. Full task creation timestamp:
      01.10.2026 · 18:41
   --------------------------------------------------------- */
if (!app.includes('PART_V064_M_FULL_TASK_TIME')) {
  const renderTaskStart =
    app.indexOf('function renderTask(');

  const createdBlockStart =
    app.indexOf(
      '{task.createdAt && (',
      renderTaskStart
    );

  if (createdBlockStart < 0) {
    fail(
      'Не найден вывод task.createdAt в карточке.'
    );
  }

  const localeStart =
    app.indexOf(
      ".toLocaleString(",
      createdBlockStart
    );

  const dateOptionsStart =
    app.indexOf(
      '{',
      localeStart
    );

  const dateOptionsEnd =
    app.indexOf(
      '}',
      dateOptionsStart
    );

  if (
    localeStart < 0 ||
    dateOptionsStart < 0 ||
    dateOptionsEnd < 0
  ) {
    fail('Не удалось найти настройки даты задачи.');
  }

  const options =
`{
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }`;

  app =
    app.slice(0, dateOptionsStart) +
    options +
    app.slice(dateOptionsEnd + 1);

  const createdSpan =
    app.indexOf(
      '<span className="taskCreated">',
      createdBlockStart
    );

  if (createdSpan >= 0) {
    app =
      app.slice(0, createdSpan) +
      '{/* PART_V064_M_FULL_TASK_TIME */}\n            ' +
      app.slice(createdSpan);
  }
}

/* ---------------------------------------------------------
   5. CSS
   --------------------------------------------------------- */
if (!styles.includes('PART_V064_M_TASK_LIST_A')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [
    service.includes('PART_V064_M_TASK_CREATED_BY'),
    'backend возвращает createdBy'
  ],
  [
    api.includes('PART_V064_M_TASK_CREATED_BY_TYPE'),
    'Task type содержит createdBy'
  ],
  [
    app.includes('PART_V064_M_TASK_LIST_A_META'),
    'вариант A установлен'
  ],
  [
    app.includes('Менеджер: {managerName}'),
    'имя менеджера выводится'
  ],
  [
    app.includes("{' - '}"),
    'формат МСМ - ХХХ'
  ],
  [
    app.includes("year: 'numeric'"),
    'полная дата с годом'
  ],
  [
    styles.includes('PART_V064_M_TASK_LIST_A'),
    'CSS варианта A'
  ],
];

console.log('');
console.log('v064-M — Task List Variant A');
console.log('============================');

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);

  if (!ok) {
    fail('Проверка не пройдена: ' + label);
  }
}

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

let changed = 0;

if (
  writeWithBackup(
    tasksServiceFile,
    serviceSource,
    service,
    'v064-m'
  )
) changed++;

if (
  writeWithBackup(
    apiFile,
    apiSource,
    api,
    'v064-m'
  )
) changed++;

if (
  writeWithBackup(
    appFile,
    appSource,
    app,
    'v064-m'
  )
) changed++;

if (
  writeWithBackup(
    stylesFile,
    stylesSource,
    styles,
    'v064-m'
  )
) changed++;

console.log('');
console.log(
  'v064-M применён. Изменено файлов: ' + changed
);
