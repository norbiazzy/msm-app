const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appFile = path.join(root, 'frontend', 'src', 'App.tsx');
const stylesFile = path.join(root, 'frontend', 'src', 'styles.css');
const cssContent = "/* PART_V064_J_APPROVED_TASK_LIST */\n\n/* ===== Approved flat task list ===== */\n.boView-tasks .taskListIntro {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 12px;\n  margin: 2px 0 10px;\n}\n\n.boView-tasks .taskListIntro strong {\n  color: var(--bo-text);\n  font-size: 14px;\n  font-weight: 900;\n}\n\n.boView-tasks .taskListIntro span {\n  color: var(--bo-muted);\n  font-size: 12px;\n}\n\n.boView-tasks .taskFilterBar {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  margin-bottom: 12px;\n}\n\n.boView-tasks .taskFilterButton {\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  min-height: 36px;\n  border: 1px solid var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel);\n  color: var(--bo-muted);\n  font-size: 12px;\n  font-weight: 850;\n  padding: 7px 10px;\n  cursor: pointer;\n}\n\n.boView-tasks .taskFilterButton b {\n  display: inline-grid;\n  place-items: center;\n  min-width: 22px;\n  height: 22px;\n  border-radius: 5px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n  font-size: 11px;\n}\n\n.boView-tasks .taskFilterButton.active {\n  border-color: var(--bo-accent);\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n}\n\n.boView-tasks .taskFilterButton.active b {\n  background: var(--bo-panel);\n  color: var(--bo-accent);\n}\n\n.boView-tasks .taskFlatList {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n/* The old group wrappers are no longer rendered by v064-J. */\n.boView-tasks .taskFlatList .taskCard {\n  position: relative;\n  overflow: hidden;\n  display: grid !important;\n  grid-template-columns: minmax(0, 1fr) auto;\n  gap: 8px 14px;\n  align-items: start;\n  width: 100%;\n  min-height: 106px;\n  margin: 0;\n  border: 1px solid var(--bo-line);\n  border-radius: 9px;\n  background: var(--bo-panel);\n  color: var(--bo-text);\n  box-shadow: var(--bo-shadow);\n  padding: 13px 13px 12px 16px;\n  text-align: left;\n}\n\n.boView-tasks .taskFlatList .taskCard::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 4px;\n  background: var(--bo-blue);\n}\n\n.boView-tasks .taskFlatList .taskCard:has(.taskStatus-new)::before {\n  background: var(--bo-gold);\n}\n\n.boView-tasks .taskFlatList .taskCard:has(.taskStatus-need_data)::before,\n.boView-tasks .taskFlatList .taskCard:has(.taskStatus-need-data)::before,\n.boView-tasks .taskFlatList .taskCard:has(.taskReturnNotice)::before {\n  background: var(--bo-red);\n}\n\n.boView-tasks .taskFlatList .taskCard:has(.taskStatus-done)::before {\n  background: var(--bo-green);\n}\n\n/* Existing main text area */\n.boView-tasks .taskFlatList .taskCard > div:first-child {\n  min-width: 0;\n}\n\n.boView-tasks .taskFlatList .taskCard h3,\n.boView-tasks .taskFlatList .taskCard h4,\n.boView-tasks .taskFlatList .taskCard > div:first-child > strong {\n  margin: 0 0 4px;\n  color: var(--bo-text);\n  font-size: 16px;\n  font-weight: 900;\n  line-height: 1.22;\n  letter-spacing: -.01em;\n}\n\n.boView-tasks .taskFlatList .taskCard p {\n  margin: 3px 0;\n  color: var(--bo-muted);\n  font-size: 12px;\n  line-height: 1.4;\n}\n\n/* Deal number: deliberately stronger than secondary text */\n.boView-tasks .taskFlatList .taskDealNumberLink {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  color: var(--bo-text) !important;\n  font-size: 15px !important;\n  font-weight: 950 !important;\n  text-decoration: none;\n}\n\n.boView-tasks .taskFlatList .taskDealNumberLink::before {\n  content: '■';\n  color: var(--bo-accent);\n  font-size: 8px;\n}\n\n.boView-tasks .taskFlatList .taskDealNumberLink:hover {\n  color: var(--bo-accent) !important;\n}\n\n/* Real seller + current invoice data injected by v064-J */\n.boView-tasks .taskCardInvoiceMeta {\n  display: inline-flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 5px;\n  margin: 6px 0 0;\n}\n\n.boView-tasks .taskMetaPill {\n  display: inline-flex;\n  align-items: center;\n  min-height: 24px;\n  border: 1px solid var(--bo-line);\n  border-radius: 999px;\n  background: var(--bo-panel-2);\n  color: var(--bo-muted);\n  font-size: 11px;\n  font-weight: 800;\n  padding: 4px 8px;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskMetaSeller {\n  color: var(--bo-text);\n  font-weight: 950;\n}\n\n.boView-tasks .taskMetaPill strong {\n  margin-left: 4px;\n  color: var(--bo-text);\n  font-weight: 900;\n}\n\n/* Created timestamp is intentionally quiet */\n.boView-tasks .taskFlatList .taskCreated {\n  display: block;\n  margin-top: 7px;\n  color: var(--bo-muted);\n  font-size: 10px;\n  white-space: nowrap;\n}\n\n/* Status sits once, at the right */\n.boView-tasks .taskFlatList .taskState {\n  grid-column: 2;\n  grid-row: 1;\n  align-self: start;\n  justify-self: end;\n  margin: 0;\n}\n\n.boView-tasks .taskFlatList .taskStatusBadge {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 29px;\n  border: 1px solid var(--bo-line);\n  border-radius: 5px;\n  background: var(--bo-panel-2);\n  color: var(--bo-blue);\n  font-size: 11px;\n  font-weight: 900;\n  padding: 5px 8px;\n  white-space: nowrap;\n}\n\n.boView-tasks .taskFlatList .taskStatus-new {\n  color: var(--bo-gold);\n}\n\n.boView-tasks .taskFlatList .taskStatus-need_data,\n.boView-tasks .taskFlatList .taskStatus-need-data {\n  color: var(--bo-red);\n}\n\n.boView-tasks .taskFlatList .taskStatus-done {\n  color: var(--bo-green);\n}\n\n/* Returned task: a single compact line, not a large yellow box */\n.boView-tasks .taskFlatList .taskReturnNotice {\n  grid-column: 1 / -1;\n  display: grid;\n  grid-template-columns: auto minmax(0, 1fr) auto;\n  align-items: center;\n  gap: 8px;\n  width: 100%;\n  margin: 1px 0 0;\n  border: 0;\n  border-top: 1px solid var(--bo-line);\n  border-radius: 0;\n  background: transparent;\n  padding: 9px 0 0;\n}\n\n.boView-tasks .taskFlatList .taskReturnNotice::before {\n  content: '!';\n  display: grid;\n  place-items: center;\n  width: 22px;\n  height: 22px;\n  border-radius: 5px;\n  background: color-mix(in srgb, var(--bo-red) 12%, transparent);\n  color: var(--bo-red);\n  font-size: 12px;\n  font-weight: 950;\n}\n\n.boView-tasks .taskFlatList .taskReturnNotice strong {\n  display: block;\n  margin: 0;\n  color: var(--bo-red);\n  font-size: 12px;\n  font-weight: 900;\n}\n\n.boView-tasks .taskFlatList .taskReturnNotice span,\n.boView-tasks .taskFlatList .taskReturnNotice p {\n  grid-column: 2;\n  min-width: 0;\n  margin: 1px 0 0;\n  color: var(--bo-muted);\n  font-size: 11px;\n  line-height: 1.35;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.boView-tasks .taskFlatList .taskReturnNotice em {\n  grid-column: 3;\n  grid-row: 1 / span 2;\n  align-self: center;\n  color: var(--bo-accent);\n  font-size: 11px;\n  font-style: normal;\n  font-weight: 900;\n  white-space: nowrap;\n}\n\n/* Upload progress stays visible on the same task */\n.boView-tasks .taskFlatList .taskCardUploadState {\n  grid-column: 1 / -1;\n  width: 100%;\n  margin: 1px 0 0;\n}\n\n/* Completed list uses the same compact card language */\n.boView-tasks .completedTasksBlock {\n  margin-top: 14px;\n}\n\n.boView-tasks .completedToggle {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  width: 100%;\n  min-height: 42px;\n  border: 1px solid var(--bo-line);\n  border-radius: 7px;\n  background: var(--bo-panel);\n  color: var(--bo-muted);\n  font-weight: 800;\n  padding: 8px 10px;\n}\n\n.boView-tasks .completedToggle b {\n  display: grid;\n  place-items: center;\n  min-width: 24px;\n  height: 24px;\n  border-radius: 5px;\n  background: var(--bo-panel-2);\n  color: var(--bo-text);\n}\n\n.boView-tasks .completedTasksList {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  margin-top: 8px;\n}\n\n@media (max-width: 720px) {\n  .boView-tasks .taskFilterBar {\n    display: grid;\n    grid-template-columns: 1fr 1fr;\n  }\n\n  .boView-tasks .taskFilterButton {\n    width: 100%;\n    justify-content: space-between;\n  }\n\n  .boView-tasks .taskFlatList .taskCard {\n    grid-template-columns: minmax(0, 1fr) auto;\n    min-height: 0;\n    gap: 7px 8px;\n    padding: 12px 10px 11px 14px;\n  }\n\n  .boView-tasks .taskFlatList .taskCard h3,\n  .boView-tasks .taskFlatList .taskCard h4,\n  .boView-tasks .taskFlatList .taskCard > div:first-child > strong {\n    font-size: 15px;\n  }\n\n  .boView-tasks .taskFlatList .taskDealNumberLink {\n    font-size: 14px !important;\n  }\n\n  .boView-tasks .taskFlatList .taskStatusBadge {\n    min-height: 27px;\n    font-size: 10px;\n    padding: 5px 7px;\n  }\n\n  .boView-tasks .taskFlatList .taskReturnNotice {\n    grid-template-columns: auto minmax(0, 1fr);\n  }\n\n  .boView-tasks .taskFlatList .taskReturnNotice em {\n    grid-column: 2;\n    grid-row: auto;\n    justify-self: start;\n    margin-top: 3px;\n  }\n\n  .boView-tasks .taskListIntro {\n    margin-top: 0;\n  }\n}\n\n/* END_PART_V064_J_APPROVED_TASK_LIST */";

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
const stylesSource = read(stylesFile);

let app = appSource.text;
let styles = stylesSource.text;

if (!app.includes('function TasksView(')) {
  fail('Не найден function TasksView() в App.tsx. Ничего не изменено.');
}

/* 1. Filter state */
if (!app.includes('PART_V064_J_TASK_FILTER_STATE')) {
  const showIndex = app.indexOf('showCompleted');

  if (showIndex < 0) {
    fail('Не найден state showCompleted в TasksView.');
  }

  const stateEnd = app.indexOf('] = useState(false);', showIndex);

  if (stateEnd < 0) {
    fail('Не удалось определить конец state showCompleted.');
  }

  const insertAt = stateEnd + '] = useState(false);'.length;

  const stateCode = `

  // PART_V064_J_TASK_FILTER_STATE
  const [
    taskFilter,
    setTaskFilter,
  ] = useState<
    'ALL' |
    'IN_PROGRESS' |
    'NEW' |
    'NEED_DATA'
  >('ALL');
`;

  app =
    app.slice(0, insertAt) +
    stateCode +
    app.slice(insertAt);
}

/* 2. Seller + current customer invoice on every task card */
if (!app.includes('PART_V064_J_TASK_INVOICE_META')) {
  const dealMarker =
    app.indexOf('PART_1N_H1_TASK_DEAL_LINK');

  if (dealMarker < 0) {
    fail(
      'Не найден маркер ссылки на сделку в карточке задачи. ' +
      'Ничего не изменено.'
    );
  }

  const closeLink =
    app.indexOf('</a>', dealMarker);

  const closeMetaSpan =
    closeLink >= 0
      ? app.indexOf('</span>', closeLink)
      : -1;

  if (closeLink < 0 || closeMetaSpan < 0) {
    fail('Не удалось найти конец meta-блока карточки задачи.');
  }

  const insertAt =
    closeMetaSpan + '</span>'.length;

  const invoiceMeta = `

          {/* PART_V064_J_TASK_INVOICE_META */}
          {(() => {
            const currentInvoice =
              task.deal.invoices.find(
                (invoice) =>
                  invoice.isCurrent
              ) ??
              task.deal.invoices[0];

            const taskSellerType =
              currentInvoice?.sellerType ||
              task.deal.sellerType;

            return (
              <span className="taskCardInvoiceMeta">
                <span className="taskMetaPill taskMetaSeller">
                  {
                    sellerLabels[
                      taskSellerType
                    ] ||
                    taskSellerType
                  }
                </span>

                {currentInvoice?.number && (
                  <span className="taskMetaPill">
                    Счёт
                    <strong>
                      №{currentInvoice.number}
                    </strong>
                  </span>
                )}
              </span>
            );
          })()}
`;

  app =
    app.slice(0, insertAt) +
    invoiceMeta +
    app.slice(insertAt);
}

/* 3. Approved flat list replaces the grouped list UI */
if (!app.includes('PART_V064_J_APPROVED_TASK_LIST')) {
  const completedMatch =
    /\n\s*\{completed\.length\s*>\s*0\s*&&\s*\(/g;

  let match;
  let completedIndex = -1;

  while ((match = completedMatch.exec(app)) !== null) {
    completedIndex = match.index;
  }

  if (completedIndex < 0) {
    fail('Не найден блок completed.length в TasksView.');
  }

  const sectionHeadIndex =
    app.lastIndexOf(
      '<div className="sectionHead">',
      completedIndex
    );

  if (sectionHeadIndex < 0) {
    fail('Не найден sectionHead списка задач.');
  }

  const lineStart =
    app.lastIndexOf('\n', sectionHeadIndex) + 1;

  const newList = `      {/* PART_V064_J_APPROVED_TASK_LIST */}
      <div className="taskListIntro">
        <strong>
          {
            user.role === 'ACCOUNTANT'
              ? 'Бухгалтерия'
              : user.role === 'MANAGER'
                ? 'Менеджер'
                : user.role === 'LEADER'
                  ? 'Руководитель'
                  : 'Все роли'
          }
        </strong>

        <span>
          {activeCount} активных
        </span>
      </div>

      <div
        className="taskFilterBar"
        role="tablist"
        aria-label="Фильтр задач"
      >
        <button
          type="button"
          className={
            'taskFilterButton' +
            (
              taskFilter === 'ALL'
                ? ' active'
                : ''
            )
          }
          onClick={() =>
            setTaskFilter('ALL')
          }
        >
          Все
          <b>{activeCount}</b>
        </button>

        <button
          type="button"
          className={
            'taskFilterButton' +
            (
              taskFilter === 'IN_PROGRESS'
                ? ' active'
                : ''
            )
          }
          onClick={() =>
            setTaskFilter('IN_PROGRESS')
          }
        >
          В работе
          <b>{inProgress.length}</b>
        </button>

        <button
          type="button"
          className={
            'taskFilterButton' +
            (
              taskFilter === 'NEW'
                ? ' active'
                : ''
            )
          }
          onClick={() =>
            setTaskFilter('NEW')
          }
        >
          Новые
          <b>{newTasks.length}</b>
        </button>

        <button
          type="button"
          className={
            'taskFilterButton' +
            (
              taskFilter === 'NEED_DATA'
                ? ' active'
                : ''
            )
          }
          onClick={() =>
            setTaskFilter('NEED_DATA')
          }
        >
          Нужно исправить
          <b>{needData.length}</b>
        </button>
      </div>

      {loading ? (
        <div className="empty">
          Загрузка…
        </div>
      ) : activeCount === 0 ? (
        <div className="empty">
          Активных задач нет
        </div>
      ) : (() => {
        const visibleTasks = [
          ...inProgress,
          ...newTasks,
          ...needData,
          ...otherActive,
        ].filter(
          (task) =>
            taskFilter === 'ALL' ||
            task.status === taskFilter
        );

        return visibleTasks.length > 0 ? (
          <div className="taskFlatList">
            {visibleTasks.map(
              (task) =>
                renderTask(task)
            )}
          </div>
        ) : (
          <div className="empty">
            В этой категории задач нет
          </div>
        );
      })()}

`;

  app =
    app.slice(0, lineStart) +
    newList +
    app.slice(completedIndex);
}

/* User-approved wording */
app = app.replace(
  "NEED_DATA: 'Нужны данные'",
  "NEED_DATA: 'Нужно исправить'"
);

if (!styles.includes('PART_V064_J_APPROVED_TASK_LIST')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [
    app.includes('PART_V064_J_TASK_FILTER_STATE'),
    'state фильтра добавлен'
  ],
  [
    app.includes('PART_V064_J_TASK_INVOICE_META'),
    'МСМ/СТ/ИП + текущий счёт добавлены'
  ],
  [
    app.includes('PART_V064_J_APPROVED_TASK_LIST'),
    'старые группы заменены плоским списком'
  ],
  [
    app.includes("setTaskFilter('NEED_DATA')"),
    'фильтр Нужно исправить есть'
  ],
  [
    app.includes('currentInvoice?.number'),
    'номер текущего счёта выводится'
  ],
  [
    styles.includes('PART_V064_J_APPROVED_TASK_LIST'),
    'CSS утверждённого списка добавлен'
  ],
];

console.log('');
console.log('v064-J — Approved Task List');
console.log('===========================');

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
    appFile,
    appSource,
    app,
    'v064-j'
  )
) changed++;

if (
  writeWithBackup(
    stylesFile,
    stylesSource,
    styles,
    'v064-j'
  )
) changed++;

console.log('');
console.log(
  'v064-J применён. Изменено файлов: ' + changed
);
