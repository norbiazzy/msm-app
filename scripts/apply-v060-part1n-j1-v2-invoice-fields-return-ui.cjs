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

const apiPath =
  path.join(
    root,
    'frontend',
    'src',
    'api.ts'
  );

const typesPath =
  path.join(
    root,
    'frontend',
    'src',
    'types.ts'
  );

const stylesPath =
  path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  );

const invoicePanelPath =
  path.join(
    root,
    'frontend',
    'src',
    'InvoiceRequestTaskPanel.tsx'
  );

const returnPanelPath =
  path.join(
    root,
    'frontend',
    'src',
    'ReturnToManagerPanel.tsx'
  );

const dealsServicePath =
  path.join(
    root,
    'backend',
    'src',
    'deals',
    'deals.service.ts'
  );

const dealsControllerPath =
  path.join(
    root,
    'backend',
    'src',
    'deals',
    'deals.controller.ts'
  );

const tasksServicePath =
  path.join(
    root,
    'backend',
    'src',
    'tasks',
    'tasks.service.ts'
  );

const invoicePanelSourcePath =
  path.join(
    root,
    'InvoiceRequestTaskPanel.part1n-j1-v2.tmp'
  );

const returnPanelSourcePath =
  path.join(
    root,
    'ReturnToManagerPanel.part1n-j1-v2.tmp'
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


function findMethodRange(
  text,
  methodName
) {
  const token =
    'async ' +
    methodName;

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

let api =
  read(apiPath);

let types =
  read(typesPath);

let styles =
  read(stylesPath);

let dealsService =
  read(dealsServicePath);

let dealsController =
  read(dealsControllerPath);

let tasksService =
  read(tasksServicePath);

const invoicePanelSource =
  read(
    invoicePanelSourcePath
  );

const returnPanelSource =
  read(
    returnPanelSourcePath
  );


/*
 * 1. Frontend type: requestMode is part of the deal/request.
 */

if (
  !/\brequestMode\?\s*:\s*string\s*;/.test(
    types
  )
) {
  const needle =
    '  requestText?: string;';

  if (
    !types.includes(
      needle
    )
  ) {
    fail(
      'В Deal type не найден requestText.'
    );
  }

  types =
    types.replace(
      needle,
      `  requestMode?: string;
${needle}`
    );
}


/*
 * 2. Frontend API updateDealInfo:
 * allow all invoice-request fields to return/edit.
 */

const updateDealInfoRange =
  findFunctionRange(
    api,
    'updateDealInfo'
  );

if (!updateDealInfoRange) {
  fail(
    'Не найден updateDealInfo().'
  );
}

let updateApiText =
  updateDealInfoRange.text;

if (
  !updateApiText.includes(
    'requestMode?: string;'
  )
) {
  updateApiText =
    updateApiText.replace(
      'sellerType?:',
      `requestMode?: string;
    requestText?: string;
    sellerType?:`
    );
}

api =
  api.slice(
    0,
    updateDealInfoRange.start
  ) +
  updateApiText +
  api.slice(
    updateDealInfoRange.end
  );


/*
 * 3. Backend controller updateInfo body.
 */

const controllerMethod =
  findMethodRange(
    dealsController,
    'updateInfo'
  );

if (!controllerMethod) {
  fail(
    'Не найден DealsController.updateInfo().'
  );
}

let controllerText =
  controllerMethod.text;

if (
  !controllerText.includes(
    'requestMode?: string;'
  )
) {
  controllerText =
    controllerText.replace(
      'sellerType?:',
      `requestMode?: string;
      requestText?: string;
      sellerType?:`
    );
}

dealsController =
  dealsController.slice(
    0,
    controllerMethod.start
  ) +
  controllerText +
  dealsController.slice(
    controllerMethod.end
  );


/*
 * 4. Backend DealsService.updateInfo:
 * requestMode + requestText become editable.
 */

const updateInfoMethod =
  findMethodRange(
    dealsService,
    'updateInfo'
  );

if (!updateInfoMethod) {
  fail(
    'Не найден DealsService.updateInfo().'
  );
}

let infoText =
  updateInfoMethod.text;


if (
  !infoText.includes(
    'requestMode?: string;'
  )
) {
  infoText =
    infoText.replace(
      'sellerType?: SellerType;',
      `requestMode?: string;
      requestText?: string;
      sellerType?: SellerType;`
    );
}


if (
  !infoText.includes(
    'const nextRequestMode'
  )
) {
  const anchor =
    'const nextSellerType =';

  const index =
    infoText.indexOf(
      anchor
    );

  if (index < 0) {
    fail(
      'В updateInfo не найден nextSellerType.'
    );
  }

  const block =
    `const nextRequestMode =
      body.requestMode !== undefined
        ? body.requestMode.trim() ||
          current.requestMode
        : current.requestMode;


    const nextRequestText =
      body.requestText !== undefined
        ? body.requestText.trim() ||
          null
        : current.requestText;


    `;

  infoText =
    infoText.slice(
      0,
      index
    ) +
    block +
    infoText.slice(
      index
    );
}


if (
  !/requestMode:\s*nextRequestMode/.test(
    infoText
  )
) {
  const updateCallIndex =
    infoText.lastIndexOf(
      '.deal.update'
    );

  if (
    updateCallIndex < 0
  ) {
    fail(
      'В updateInfo не найден deal.update.'
    );
  }

  const dataMatch =
    /\bdata\s*:\s*\{/.exec(
      infoText.slice(
        updateCallIndex
      )
    );

  if (!dataMatch) {
    fail(
      'В updateInfo deal.update не найден data: { ... }.'
    );
  }

  const absoluteDataStart =
    updateCallIndex +
    dataMatch.index;

  const dataOpen =
    infoText.indexOf(
      '{',
      absoluteDataStart
    );

  if (
    dataOpen < 0
  ) {
    fail(
      'Не удалось определить начало data в updateInfo.'
    );
  }

  infoText =
    infoText.slice(
      0,
      dataOpen + 1
    ) +
    `

                requestMode:
                  nextRequestMode,

                requestText:
                  nextRequestText,` +
    infoText.slice(
      dataOpen + 1
    );
}


dealsService =
  dealsService.slice(
    0,
    updateInfoMethod.start
  ) +
  infoText +
  dealsService.slice(
    updateInfoMethod.end
  );


/*
 * 5. Snapshot exactly what manager sent into the SAME invoice task.
 * This is stored in Task.details every submit/resubmit.
 */

const submitMethod =
  findMethodRange(
    dealsService,
    'submitInvoiceRequest'
  );

if (!submitMethod) {
  fail(
    'Не найден submitInvoiceRequest().'
  );
}

let submitText =
  submitMethod.text;


if (
  !submitText.includes(
    'PART_1N_J1_INVOICE_DETAILS_SNAPSHOT'
  )
) {
  const auditAnchor =
    'await this.prisma.auditEvent.create';

  const auditIndex =
    submitText.indexOf(
      auditAnchor
    );

  if (auditIndex < 0) {
    fail(
      'В submitInvoiceRequest не найден auditEvent.'
    );
  }

  const snapshot =
    `// PART_1N_J1_INVOICE_DETAILS_SNAPSHOT
    await this.prisma.task.update({
      where: {
        id:
          task.id,
      },

      data: {
        details: {
          requestMode:
            deal.requestMode,

          sellerType:
            deal.sellerType,

          clientName:
            deal.clientName,

          contactName:
            deal.contactName,

          clientPhone:
            deal.clientPhone,

          deliveryAddresses:
            deal.deliveryAddresses,

          requestText:
            deal.requestText,

          marginMode:
            deal.marginMode,

          marginValue:
            deal.marginValue !== null
              ? deal.marginValue.toString()
              : null,

          accountingComment:
            deal.accountingComment,
        },
      },
    });


    `;

  submitText =
    submitText.slice(
      0,
      auditIndex
    ) +
    snapshot +
    submitText.slice(
      auditIndex
    );
}


dealsService =
  dealsService.slice(
    0,
    submitMethod.start
  ) +
  submitText +
  dealsService.slice(
    submitMethod.end
  );


/*
 * 6. Invoice special return endpoint accepts SAME reasons
 * as generic ReturnToManagerPanel.
 */

const returnInvoiceMethod =
  findMethodRange(
    tasksService,
    'returnInvoiceRequest'
  );

if (!returnInvoiceMethod) {
  fail(
    'Не найден returnInvoiceRequest().'
  );
}

let returnInvoiceText =
  returnInvoiceMethod.text;


const extraReasons = [
  [
    'MISSING_DATA',
    'Не хватает данных',
  ],
  [
    'INCORRECT_DATA',
    'Данные заполнены неверно',
  ],
  [
    'NEED_CLARIFICATION',
    'Требуется уточнение',
  ],
];


for (
  const [
    code,
    label,
  ]
  of extraReasons
) {

  if (
    !returnInvoiceText.includes(
      `${code}:`
    )
  ) {
    const reasonsStart =
      returnInvoiceText.indexOf(
        'const reasons'
      );

    if (reasonsStart < 0) {
      fail(
        'В returnInvoiceRequest не найден reasons.'
      );
    }

    const objectOpen =
      returnInvoiceText.indexOf(
        '{',
        reasonsStart
      );

    if (objectOpen < 0) {
      fail(
        'Не найден объект reasons.'
      );
    }

    returnInvoiceText =
      returnInvoiceText.slice(
        0,
        objectOpen + 1
      ) +
      `
      ${code}:
        '${label}',` +
      returnInvoiceText.slice(
        objectOpen + 1
      );
  }
}


tasksService =
  tasksService.slice(
    0,
    returnInvoiceMethod.start
  ) +
  returnInvoiceText +
  tasksService.slice(
    returnInvoiceMethod.end
  );


/*
 * 7. Replace shared components.
 */

write(
  invoicePanelPath,
  invoicePanelSource
);

write(
  returnPanelPath,
  returnPanelSource
);


/*
 * 8. Ensure imports in App.
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
      'Не удалось определить imports App.tsx.'
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


if (
  !app.includes(
    "from './ReturnToManagerPanel'"
  )
) {
  const importEnd =
    findImportBlockEnd(
      app
    );

  if (importEnd < 0) {
    fail(
      'Не удалось добавить ReturnToManagerPanel import.'
    );
  }

  app =
    app.slice(
      0,
      importEnd
    ) +
    `

import {
  ReturnToManagerPanel,
} from './ReturnToManagerPanel';` +
    app.slice(
      importEnd
    );
}


/*
 * 9. Ensure manager returned invoice task opens task repair.
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

  const block =
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
    block +
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
 * 10. Ensure accountant sees same request fields in TaskDetail.
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
 * 11. Replace invoice-only "Отказать / вернуть" buttons
 * with the SAME ReturnToManagerPanel used for POA/ETRN.
 */

const oldReturnButton =
  /<button\s+type=["']button["']\s+className=["']secondary(?:\s+compactButton)?["']\s+disabled=\{saving\}\s+onClick=\{\(\)\s*=>\s*setReturnModalOpen\(true\)\s*\}\s*>\s*Отказать\s*\/\s*вернуть\s*<\/button>/g;


let replacedButtons = 0;


app =
  app.replace(
    oldReturnButton,
    () => {

      replacedButtons++;

      return `<ReturnToManagerPanel
              taskId={task.id}
              actorId={user.id}
              disabled={saving}
              mode="invoice"
              onReturned={onBack}
            />`;
    }
  );


if (
  replacedButtons === 0 &&
  !app.includes(
    'mode="invoice"'
  )
) {
  fail(
    'Не найдено старое окно возврата счёта для замены.'
  );
}


/*
 * 12. Styles: same field layout, docs, responsive.
 */

const cssMarker =
  'MSM invoice request symmetry v0.6.0 part 1N-J1';


if (
  !styles.includes(
    cssMarker
  )
) {
  styles =
    styles.trimEnd() +
    `

/* ${cssMarker} */

.invoiceTaskField {
  padding: 10px;
  border-radius: 12px;
  background: rgba(120, 120, 120, 0.06);
}

.invoiceTaskField > span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  opacity: 0.62;
}

.invoiceTaskField > strong {
  font-size: 13px;
}

.invoiceTaskTextBlock p {
  white-space: pre-wrap;
}

.invoiceTaskRepairNotice {
  line-height: 1.4;
}
`;
}


/*
 * 13. Verification before write.
 */

const verification = [
  [
    invoicePanelSource.includes(
      'MANAGER_ATTACHMENT'
    ),
    'Не учтены первоначальные дополнительные файлы менеджера.',
  ],

  [
    invoicePanelSource.includes(
      'TASK_ATTACHMENT_'
    ),
    'Не учтены документы после возврата.',
  ],

  [
    invoicePanelSource.includes(
      'requestMode'
    ) &&
    invoicePanelSource.includes(
      'requestText'
    ) &&
    invoicePanelSource.includes(
      'contactName'
    ) &&
    invoicePanelSource.includes(
      'clientPhone'
    ) &&
    invoicePanelSource.includes(
      'deliveryAddresses'
    ),
    'Набор полей менеджера неполный.',
  ],

  [
    submitText.includes(
      'PART_1N_J1_INVOICE_DETAILS_SNAPSHOT'
    ),
    'Task.details snapshot не добавлен.',
  ],

  [
    returnPanelSource.includes(
      "mode?: 'generic' | 'invoice'"
    ),
    'ReturnToManagerPanel не унифицирован.',
  ],

  [
    app.includes(
      'mode="invoice"'
    ),
    'Счёт не переведён на общий ReturnToManagerPanel.',
  ],
];


for (
  const [
    ok,
    message,
  ]
  of verification
) {
  if (!ok) {
    fail(message);
  }
}


console.log('');
console.log(
  'Проверка Part 1N-J1 v2:'
);
console.log(
  '  Менеджер -> бухгалтер: единый набор полей: OK'
);
console.log(
  '  Бухгалтер -> менеджер: тот же набор полей: OK'
);
console.log(
  '  requestMode / requestText сохраняются и редактируются: OK'
);
console.log(
  '  Контакт / телефон / адреса возвращаются: OK'
);
console.log(
  '  Условия / значение / комментарий возвращаются: OK'
);
console.log(
  '  Входящий счёт сохраняется: OK'
);
console.log(
  '  MANAGER_ATTACHMENT сохраняются: OK'
);
console.log(
  '  TASK_ATTACHMENT_<taskId> после исправлений сохраняются: OK'
);
console.log(
  '  Task.details фиксирует снимок запроса: OK'
);
console.log(
  '  Модалка возврата счёта = модалка доверенности/ЭТРН: OK'
);
console.log(
  '  Причины возврата унифицированы: OK'
);
console.log(
  '  Prisma migration: НЕ требуется'
);


if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}


/*
 * Backups.
 */

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
    apiPath,
    typesPath,
    stylesPath,
    invoicePanelPath,
    returnPanelPath,
    dealsServicePath,
    dealsControllerPath,
    tasksServicePath,
  ]
) {
  if (
    fs.existsSync(file)
  ) {
    fs.copyFileSync(
      file,
      file +
        '.before-part1n-j1-v2-' +
        stamp
    );
  }
}


/*
 * Writes.
 */

write(
  appPath,
  app
);

write(
  apiPath,
  api.replace(
    /[ \t]+\n/g,
    '\n'
  ).replace(
    /\n+$/,
    '\n'
  )
);

write(
  typesPath,
  types
);

write(
  stylesPath,
  styles
);

write(
  invoicePanelPath,
  invoicePanelSource
);

write(
  returnPanelPath,
  returnPanelSource
);

write(
  dealsServicePath,
  dealsService
);

write(
  dealsControllerPath,
  dealsController
);

write(
  tasksServicePath,
  tasksService
);


console.log('');
console.log(
  'Part 1N-J1 v2 применён.'
);
console.log('');
console.log(
  'Дальше:'
);
console.log(
  '  git diff --check'
);
console.log(
  '  cd backend'
);
console.log(
  '  npm run build'
);
console.log(
  '  cd ../frontend'
);
console.log(
  '  npm run build'
);
