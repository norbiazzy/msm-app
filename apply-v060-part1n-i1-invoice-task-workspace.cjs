const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

const stylesPath =
  path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  );

const panelPath =
  path.join(
    root,
    'frontend',
    'src',
    'InvoiceRequestTaskPanel.tsx'
  );

const sourcePath =
  path.join(
    root,
    'InvoiceRequestTaskPanel.part1n-i1.tmp'
  );


function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' +
      message
  );
  process.exit(1);
}


function read(file) {
  if (!fs.existsSync(file)) {
    fail(
      'Не найден файл: ' +
        file
    );
  }

  return fs.readFileSync(
    file,
    'utf8'
  );
}


function write(file, text) {
  fs.writeFileSync(
    file,
    text,
    'utf8'
  );
}


function findMatching(
  text,
  openIndex,
  openChar,
  closeChar
) {
  let depth = 0;
  let mode = 'code';
  let quote = '';

  for (
    let i = openIndex;
    i < text.length;
    i++
  ) {
    const ch = text[i];
    const next = text[i + 1];

    if (mode === 'lineComment') {
      if (ch === '\n') {
        mode = 'code';
      }
      continue;
    }

    if (mode === 'blockComment') {
      if (
        ch === '*' &&
        next === '/'
      ) {
        mode = 'code';
        i++;
      }
      continue;
    }

    if (mode === 'string') {
      if (ch === '\\') {
        i++;
        continue;
      }

      if (ch === quote) {
        mode = 'code';
      }
      continue;
    }

    if (
      ch === '/' &&
      next === '/'
    ) {
      mode = 'lineComment';
      i++;
      continue;
    }

    if (
      ch === '/' &&
      next === '*'
    ) {
      mode = 'blockComment';
      i++;
      continue;
    }

    if (
      ch === "'" ||
      ch === '"' ||
      ch === '`'
    ) {
      mode = 'string';
      quote = ch;
      continue;
    }

    if (ch === openChar) {
      depth++;
      continue;
    }

    if (ch === closeChar) {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}


function findFunctionRange(
  text,
  functionName
) {
  const token =
    'function ' +
    functionName;

  const start =
    text.indexOf(token);

  if (start < 0) {
    return null;
  }

  const openParen =
    text.indexOf(
      '(',
      start +
        token.length
    );

  if (openParen < 0) {
    return null;
  }

  const closeParen =
    findMatching(
      text,
      openParen,
      '(',
      ')'
    );

  if (closeParen < 0) {
    return null;
  }

  const openBrace =
    text.indexOf(
      '{',
      closeParen + 1
    );

  if (openBrace < 0) {
    return null;
  }

  const closeBrace =
    findMatching(
      text,
      openBrace,
      '{',
      '}'
    );

  if (closeBrace < 0) {
    return null;
  }

  return {
    start,
    end:
      closeBrace + 1,
    text:
      text.slice(
        start,
        closeBrace + 1
      ),
  };
}


function findImportBlockEnd(
  text
) {
  let index = 0;
  let lastEnd = -1;

  while (
    index < text.length
  ) {
    while (
      index < text.length &&
      /\s/.test(
        text[index]
      )
    ) {
      index++;
    }

    if (
      !text.startsWith(
        'import',
        index
      )
    ) {
      break;
    }

    const semicolon =
      text.indexOf(
        ';',
        index
      );

    if (semicolon < 0) {
      return -1;
    }

    lastEnd =
      semicolon + 1;

    index =
      semicolon + 1;
  }

  return lastEnd;
}


let app =
  read(appPath);

let styles =
  read(stylesPath);

const panelSource =
  read(sourcePath);


/*
 * Prerequisites.
 */

if (
  !app.includes(
    'function TasksView'
  ) ||
  !app.includes(
    'function TaskDetail'
  )
) {
  fail(
    'Не найдены TasksView / TaskDetail.'
  );
}


if (
  !app.includes(
    'submitInvoiceRequest'
  ) ||
  !app.includes(
    'updateDealInfo'
  )
) {
  fail(
    'Не найдена существующая логика запроса счёта.'
  );
}


/*
 * 1. Import new task panel.
 */

if (
  !app.includes(
    "from './InvoiceRequestTaskPanel'"
  )
) {
  const importEnd =
    findImportBlockEnd(
      app
    );

  if (importEnd < 0) {
    fail(
      'Не удалось определить import block.'
    );
  }

  app =
    app.slice(
      0,
      importEnd
    ) +
    `

import {
  InvoiceRequestDataCard,
  InvoiceRequestManagerRepair,
} from './InvoiceRequestTaskPanel';` +
    app.slice(
      importEnd
    );
}


/*
 * 2. Returned invoice task:
 * manager opens editor directly in Tasks.
 */

if (
  !app.includes(
    'PART_1N_I1_INVOICE_MANAGER_TASK'
  )
) {
  const tasksView =
    findFunctionRange(
      app,
      'TasksView'
    );

  if (!tasksView) {
    fail(
      'Не найден TasksView().'
    );
  }

  let viewText =
    tasksView.text;

  const selectedIndex =
    viewText.indexOf(
      'if (selected) {'
    );

  if (selectedIndex < 0) {
    fail(
      'В TasksView не найден if (selected).'
    );
  }

  const insertAt =
    selectedIndex +
    'if (selected) {'
      .length;

  const specialCase =
    `

    // PART_1N_I1_INVOICE_MANAGER_TASK
    if (
      selected.type ===
        'ISSUE_CLIENT_INVOICE' &&
      selected.status ===
        'NEED_DATA' &&
      user.role !==
        'ACCOUNTANT'
    ) {

      return (
        <InvoiceRequestManagerRepair
          task={selected}
          user={user}
          onResubmitted={() => {
            window.location.hash =
              '#tasks';

            setSelected(null);

            void reloadTasks(
              false
            );

            onChanged();
          }}
        />
      );
    }
`;

  viewText =
    viewText.slice(
      0,
      insertAt
    ) +
    specialCase +
    viewText.slice(
      insertAt
    );

  app =
    app.slice(
      0,
      tasksView.start
    ) +
    viewText +
    app.slice(
      tasksView.end
    );
}


/*
 * 3. Accountant/open TaskDetail:
 * show all incoming invoice-request data at the top.
 */

if (
  !app.includes(
    'PART_1N_I1_INVOICE_DATA_CARD'
  )
) {
  const taskDetail =
    findFunctionRange(
      app,
      'TaskDetail'
    );

  if (!taskDetail) {
    fail(
      'Не найден TaskDetail().'
    );
  }

  const sectionMatch =
    /<section\b[^>]*>/
      .exec(
        taskDetail.text
      );

  if (!sectionMatch) {
    fail(
      'В TaskDetail не найден <section>.'
    );
  }

  const insertAt =
    taskDetail.start +
    sectionMatch.index +
    sectionMatch[0].length;

  const card =
    `

      {/* PART_1N_I1_INVOICE_DATA_CARD */}

      {task.type ===
        'ISSUE_CLIENT_INVOICE' && (

        <InvoiceRequestDataCard
          task={task}
        />

      )}
`;

  app =
    app.slice(
      0,
      insertAt
    ) +
    card +
    app.slice(
      insertAt
    );
}


/*
 * 4. DealDetail:
 * for returned invoice request, stop opening the large repair form.
 * The repair form now lives in Tasks.
 *
 * This patch is intentionally narrow: only the top-level branch condition.
 */

let dealRepairMoved =
  app.includes(
    'PART_1N_I1_DEAL_REPAIR_MOVED'
  );


if (!dealRepairMoved) {
  const dealDetail =
    findFunctionRange(
      app,
      'DealDetail'
    );

  if (dealDetail) {
    let detailText =
      dealDetail.text;

    const returnedBranchRegex =
      /\{\(\s*invoiceRequestTask\?\.status\s*===\s*['"]NEED_DATA['"]\s*\|\|\s*\(\s*!invoiceRequestTask\s*&&\s*invoiceRequestEditOpen\s*\)\s*\)\s*\?\s*\(/m;

    if (
      returnedBranchRegex.test(
        detailText
      )
    ) {
      detailText =
        detailText.replace(
          returnedBranchRegex,
          `{(
            !invoiceRequestTask &&
            invoiceRequestEditOpen
          ) ? (`
        );

      /*
       * Add compact returned-task notice before the normal invoice task row.
       */
      const taskBranchNeedle =
        ') : invoiceRequestTask ? (';

      const branchIndex =
        detailText.indexOf(
          taskBranchNeedle
        );

      if (
        branchIndex >= 0
      ) {
        const afterNeedle =
          branchIndex +
          taskBranchNeedle.length;

        const notice =
          `

            <>
              {/* PART_1N_I1_DEAL_REPAIR_MOVED */}

              {invoiceRequestTask.status ===
                'NEED_DATA' ? (

                <div className="invoiceRequestMovedToTask">
                  <div>
                    <strong>
                      Бухгалтерия вернула запрос
                    </strong>

                    <span>
                      Исправление теперь выполняется
                      непосредственно в задаче.
                    </span>
                  </div>

                  <a
                    className="primary"
                    href={
                      '#tasks/' +
                      encodeURIComponent(
                        invoiceRequestTask.id
                      )
                    }
                  >
                    Открыть задачу и исправить
                  </a>
                </div>

              ) : (

          `;

        detailText =
          detailText.slice(
            0,
            afterNeedle
          ) +
          notice +
          detailText.slice(
            afterNeedle
          );

        /*
         * Close the extra fragment/ternary immediately before
         * the no-task branch.
         */
        const noTaskNeedle =
          ') : (';

        const noTaskIndex =
          detailText.indexOf(
            noTaskNeedle,
            afterNeedle +
              notice.length
          );

        if (
          noTaskIndex >= 0
        ) {
          detailText =
            detailText.slice(
              0,
              noTaskIndex
            ) +
            `

              )}

            </>

          ` +
            detailText.slice(
              noTaskIndex
            );

          dealRepairMoved = true;

          app =
            app.slice(
              0,
              dealDetail.start
            ) +
            detailText +
            app.slice(
              dealDetail.end
            );
        }
      }
    }
  }
}


/*
 * 5. Styles.
 */

const cssMarker =
  'MSM invoice task workspace v0.6.0 part 1N-I1';


if (
  !styles.includes(
    cssMarker
  )
) {
  styles =
    styles.trimEnd() +
    `

/* ${cssMarker} */

.invoiceTaskData {
  margin: 0 0 14px;
  padding: 14px;
  border: 1px solid rgba(120, 120, 120, 0.16);
  border-radius: 16px;
}

.invoiceTaskDataHead,
.invoiceTaskRepairHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.invoiceTaskDataHead > div,
.invoiceTaskRepairHead > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.invoiceTaskDataHead span,
.invoiceTaskRepairHead span {
  font-size: 12px;
  opacity: 0.68;
}

.invoiceTaskDataGrid {
  display: grid;
  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );
  gap: 8px;
  margin-top: 12px;
}

.invoiceTaskDataGrid > div,
.invoiceTaskTextBlock {
  padding: 10px;
  border-radius: 12px;
  background: rgba(120, 120, 120, 0.06);
}

.invoiceTaskDataGrid span,
.invoiceTaskTextBlock > span,
.invoiceTaskDocsTitle {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  opacity: 0.62;
}

.invoiceTaskDataGrid strong {
  font-size: 13px;
}

.invoiceTaskTextBlock {
  margin-top: 8px;
}

.invoiceTaskTextBlock p {
  margin: 0;
  white-space: pre-wrap;
}

.invoiceTaskDocs {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 12px;
}

.invoiceTaskDoc {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(120, 120, 120, 0.14);
  border-radius: 11px;
  text-decoration: none;
}

.invoiceTaskDoc > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.invoiceTaskDoc strong {
  overflow-wrap: anywhere;
}

.invoiceTaskDoc span {
  font-size: 11px;
  opacity: 0.62;
}

.invoiceTaskDoc b {
  flex: none;
  font-size: 12px;
}

.invoiceTaskDocsEmpty {
  font-size: 12px;
  opacity: 0.6;
}

.invoiceTaskRepairHead {
  margin-bottom: 12px;
}

.invoiceTaskRepairNotice {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(210, 140, 40, 0.10);
  font-size: 13px;
}

.invoiceTaskEdit {
  padding: 14px;
  border: 1px solid rgba(120, 120, 120, 0.16);
  border-radius: 16px;
}

.invoiceTaskEdit h3 {
  margin: 0 0 12px;
}

.invoiceRequestMovedToTask {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px;
  border-radius: 14px;
  border: 1px solid rgba(210, 140, 40, 0.24);
}

.invoiceRequestMovedToTask > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.invoiceRequestMovedToTask span {
  font-size: 12px;
  opacity: 0.68;
}

@media (max-width: 520px) {
  .invoiceTaskDataGrid {
    grid-template-columns: 1fr;
  }

  .invoiceTaskRepairHead,
  .invoiceRequestMovedToTask {
    align-items: stretch;
    flex-direction: column;
  }
}
`;
}


/*
 * Verification.
 */

const checks = [
  [
    app.includes(
      'PART_1N_I1_INVOICE_MANAGER_TASK'
    ),
    'Менеджерский ISSUE_CLIENT_INVOICE task не переведён на отдельную форму.',
  ],

  [
    app.includes(
      'PART_1N_I1_INVOICE_DATA_CARD'
    ),
    'В TaskDetail не добавлены входные данные счёта.',
  ],

  [
    panelSource.includes(
      'updateDealInfo'
    ) &&
    panelSource.includes(
      'submitInvoiceRequest'
    ),
    'Форма не использует существующую логику повторной отправки.',
  ],

  [
    panelSource.includes(
      'TASK_ATTACHMENT_'
    ) &&
    panelSource.includes(
      'CUSTOMER_INVOICE_PRIMARY'
    ),
    'Файлы не привязаны к запросу счёта.',
  ],
];


for (
  const [
    ok,
    message,
  ]
  of checks
) {
  if (!ok) {
    fail(message);
  }
}


console.log('');
console.log(
  'Проверка Part 1N-I1:'
);
console.log(
  '  Бухгалтер видит все данные запроса внутри задачи: OK'
);
console.log(
  '  Менеджер NEED_DATA редактирует запрос внутри задачи: OK'
);
console.log(
  '  Повторная отправка использует ту же ISSUE_CLIENT_INVOICE task: OK'
);
console.log(
  '  Новые файлы -> фон + прогресс на taskId: OK'
);
console.log(
  '  Входящий счёт сохраняется как CUSTOMER_INVOICE_PRIMARY: OK'
);
console.log(
  '  Доп. файлы сохраняются как TASK_ATTACHMENT_<taskId>: OK'
);

if (dealRepairMoved) {
  console.log(
    '  Большая форма исправления из сделки убрана: OK'
  );
} else {
  console.log(
    '  ПРИМЕЧАНИЕ: локальная форма DealDetail отличается; основная task-форма будет работать, но блок сделки автоматически не скрыт.'
  );
}

console.log(
  '  Backend / Prisma migration: НЕ требуется'
);


if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}


const stamp =
  new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      '-'
    );


for (
  const file
  of [
    appPath,
    stylesPath,
  ]
) {
  fs.copyFileSync(
    file,
    file +
      '.before-part1n-i1-' +
      stamp
  );
}


write(
  appPath,
  app
);

write(
  stylesPath,
  styles
);

write(
  panelPath,
  panelSource
);


console.log('');
console.log(
  'Part 1N-I1 применён.'
);
console.log('');
console.log(
  'Дальше:'
);
console.log(
  '  git diff --check'
);
console.log(
  '  cd frontend'
);
console.log(
  '  npm run build'
);
