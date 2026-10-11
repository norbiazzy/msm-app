const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appFile =
  path.join(root, 'frontend', 'src', 'App.tsx');

const stylesFile =
  path.join(root, 'frontend', 'src', 'styles.css');

const navFile =
  path.join(root, 'frontend', 'src', 'BlockOfficeMobileNav.tsx');

const cssContent = "/* PART_V064_K_TASK_SEARCH */\n\n.boView-tasks .taskSearch {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 44px;\n  margin-bottom: 8px;\n  border: 1px solid var(--bo-line);\n  border-radius: 8px;\n  background: var(--bo-panel);\n  color: var(--bo-muted);\n  padding: 0 11px;\n}\n\n.boView-tasks .taskSearch > span {\n  flex: 0 0 auto;\n  color: var(--bo-muted);\n  font-size: 18px;\n}\n\n.boView-tasks .taskSearch input {\n  width: 100%;\n  min-width: 0;\n  min-height: 42px;\n  border: 0 !important;\n  background: transparent !important;\n  color: var(--bo-text);\n  outline: 0;\n  box-shadow: none !important;\n  padding: 8px 0;\n}\n\n.boView-tasks .taskSearch input::placeholder {\n  color: var(--bo-muted);\n  opacity: .8;\n}\n\n.boView-tasks .taskSearch:focus-within {\n  border-color: var(--bo-accent);\n  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bo-accent) 12%, transparent);\n}\n\n.boView-tasks .taskSearchClear {\n  flex: 0 0 auto;\n  min-width: 32px;\n  min-height: 32px !important;\n  border: 0;\n  border-radius: 5px;\n  background: var(--bo-panel-2);\n  color: var(--bo-muted);\n  font-weight: 900;\n  padding: 4px 8px;\n}\n\n@media (max-width: 720px) {\n  .boView-tasks .taskSearch {\n    min-height: 46px;\n  }\n\n  .boView-tasks .taskSearch input {\n    font-size: 16px !important;\n  }\n}\n\n/* END_PART_V064_K_TASK_SEARCH */";

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file, required = true) {
  if (!fs.existsSync(file)) {
    if (required) {
      fail('Не найден файл: ' + file);
    }
    return null;
  }

  const raw = fs.readFileSync(file, 'utf8');

  return {
    raw,
    crlf: raw.includes('\r\n'),
    text: raw.replace(/\r\n/g, '\n'),
  };
}

function writeWithBackup(file, source, next, tag) {
  if (!source || source.text === next) {
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
const navSource = read(navFile, false);

let app = appSource.text;
let styles = stylesSource.text;
let nav = navSource ? navSource.text : '';

if (!app.includes('PART_V064_J_APPROVED_TASK_LIST')) {
  fail(
    'Сначала примените v064-J: ' +
    'не найден утверждённый список задач.'
  );
}

/* Search state */
if (!app.includes('PART_V064_K_TASK_SEARCH_STATE')) {
  const filterStateMarker =
    app.indexOf('PART_V064_J_TASK_FILTER_STATE');

  if (filterStateMarker < 0) {
    fail('Не найден state фильтра v064-J.');
  }

  const filterEnd =
    app.indexOf(">('ALL');", filterStateMarker);

  if (filterEnd < 0) {
    fail('Не удалось определить конец state taskFilter.');
  }

  const insertAt =
    filterEnd + ">('ALL');".length;

  const searchState = `

  // PART_V064_K_TASK_SEARCH_STATE
  const [
    taskSearch,
    setTaskSearch,
  ] = useState('');
`;

  app =
    app.slice(0, insertAt) +
    searchState +
    app.slice(insertAt);
}

/* Search field before filters */
if (!app.includes('PART_V064_K_TASK_SEARCH_UI')) {
  const marker =
    app.indexOf('className="taskFilterBar"');

  if (marker < 0) {
    fail('Не найден taskFilterBar v064-J.');
  }

  const divStart =
    app.lastIndexOf('<div', marker);

  const lineStart =
    app.lastIndexOf('\n', divStart) + 1;

  const searchUi = `      {/* PART_V064_K_TASK_SEARCH_UI */}
      <label className="taskSearch">
        <span>⌕</span>

        <input
          id="bo-task-search"
          value={taskSearch}
          onChange={(event) =>
            setTaskSearch(
              event.target.value
            )
          }
          placeholder="Поиск: ЗК, клиент, задача, МСМ/СТ/ИП, № счёта..."
        />

        {taskSearch && (
          <button
            type="button"
            className="taskSearchClear"
            aria-label="Очистить поиск"
            onClick={() =>
              setTaskSearch('')
            }
          >
            ×
          </button>
        )}
      </label>

`;

  app =
    app.slice(0, lineStart) +
    searchUi +
    app.slice(lineStart);
}

/* Apply text search after status filter */
if (!app.includes('PART_V064_K_TASK_SEARCH_FILTER')) {
  const oldBlock = `        const visibleTasks = [
          ...inProgress,
          ...newTasks,
          ...needData,
          ...otherActive,
        ].filter(
          (task) =>
            taskFilter === 'ALL' ||
            task.status === taskFilter
        );`;

  if (!app.includes(oldBlock)) {
    fail(
      'Не найден вычисляемый visibleTasks из v064-J.'
    );
  }

  const newBlock = `        // PART_V064_K_TASK_SEARCH_FILTER
        const normalizedTaskSearch =
          taskSearch
            .trim()
            .toLowerCase();

        const visibleTasks = [
          ...inProgress,
          ...newTasks,
          ...needData,
          ...otherActive,
        ]
          .filter(
            (task) =>
              taskFilter === 'ALL' ||
              task.status === taskFilter
          )
          .filter((task) => {
            if (!normalizedTaskSearch) {
              return true;
            }

            const currentInvoice =
              task.deal.invoices.find(
                (invoice) =>
                  invoice.isCurrent
              ) ??
              task.deal.invoices[0];

            const taskSellerType =
              currentInvoice?.sellerType ||
              task.deal.sellerType;

            const haystack = [
              task.title,
              task.description,
              task.deal.clientName,
              'ЗК-' +
                task.deal.internalNumber,
              sellerLabels[
                taskSellerType
              ] ||
                taskSellerType,
              currentInvoice?.number,
              task.supplierPurchase
                ?.supplierName,
              task.payload
                ?.supplierName,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            return haystack.includes(
              normalizedTaskSearch
            );
          });`;

  app =
    app.replace(
      oldBlock,
      newBlock
    );
}

/* Bottom mobile Search now searches the current section. */
if (
  navSource &&
  !nav.includes('PART_V064_K_CONTEXT_SEARCH')
) {
  const fnStart =
    nav.indexOf('  function goSearch() {');

  if (fnStart >= 0) {
    let cursor =
      fnStart +
      '  function goSearch() {'.length;

    let depth = 1;

    while (
      cursor < nav.length &&
      depth > 0
    ) {
      const char = nav[cursor];

      if (char === '{') depth++;
      if (char === '}') depth--;

      cursor++;
    }

    if (depth === 0) {
      const oldFunction =
        nav.slice(
          fnStart,
          cursor
        );

      const newFunction = `  function goSearch() {
    // PART_V064_K_CONTEXT_SEARCH
    const onTasks =
      window.location.hash.startsWith(
        '#tasks'
      );

    const targetId =
      onTasks
        ? 'bo-task-search'
        : 'bo-deal-search';

    if (
      !onTasks &&
      !window.location.hash.startsWith(
        '#home'
      )
    ) {
      window.location.hash =
        '#home';
    }

    window.setTimeout(
      () => {
        const input =
          document.getElementById(
            targetId,
          ) as HTMLInputElement | null;

        if (input) {
          input.focus();

          input.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      },
      80,
    );
  }`;

      nav =
        nav.slice(0, fnStart) +
        newFunction +
        nav.slice(cursor);
    }
  }
}

if (!styles.includes('PART_V064_K_TASK_SEARCH')) {
  styles =
    styles.replace(/\s*$/, '') +
    '\n\n' +
    cssContent +
    '\n';
}

const checks = [
  [
    app.includes('PART_V064_K_TASK_SEARCH_STATE'),
    'state поиска добавлен'
  ],
  [
    app.includes('PART_V064_K_TASK_SEARCH_UI'),
    'поле поиска добавлено'
  ],
  [
    app.includes('PART_V064_K_TASK_SEARCH_FILTER'),
    'поиск применяется к задачам'
  ],
  [
    app.includes("'ЗК-' +"),
    'поиск по ЗК есть'
  ],
  [
    app.includes('currentInvoice?.number'),
    'поиск по номеру счёта есть'
  ],
  [
    styles.includes('PART_V064_K_TASK_SEARCH'),
    'CSS поиска добавлен'
  ],
];

console.log('');
console.log('v064-K — Task Search');
console.log('====================');

for (const [ok, label] of checks) {
  console.log((ok ? 'OK   ' : 'FAIL ') + label);

  if (!ok) {
    fail('Проверка не пройдена: ' + label);
  }
}

if (navSource) {
  console.log(
    nav.includes('PART_V064_K_CONTEXT_SEARCH')
      ? 'OK   мобильный Поиск стал контекстным'
      : 'WARN мобильный Поиск не изменён автоматически'
  );
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
    'v064-k'
  )
) changed++;

if (
  writeWithBackup(
    stylesFile,
    stylesSource,
    styles,
    'v064-k'
  )
) changed++;

if (
  navSource &&
  writeWithBackup(
    navFile,
    navSource,
    nav,
    'v064-k'
  )
) changed++;

console.log('');
console.log(
  'v064-K применён. Изменено файлов: ' + changed
);
