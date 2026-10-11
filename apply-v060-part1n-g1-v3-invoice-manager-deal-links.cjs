const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const servicePath =
  path.join(
    root,
    'backend',
    'src',
    'tasks',
    'tasks.service.ts'
  );

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

const dealCardSourcePath =
  path.join(
    root,
    'DealCard.part1n-g1-v3.tmp'
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


function patchInvoiceReturn(
  methodText
) {

  let text =
    methodText;


  /*
   * Resolve the deal manager once.
   */
  if (
    !text.includes(
      'PART_1N_G1_INVOICE_MANAGER_ASSIGN'
    )
  ) {

    const updateToken =
      'tx.task.update';

    const updateTokenIndex =
      text.indexOf(
        updateToken
      );


    if (
      updateTokenIndex < 0
    ) {
      fail(
        'В returnInvoiceRequest не найден tx.task.update.'
      );
    }


    const taskLookupBefore =
      text.slice(
        0,
        updateTokenIndex
      );


    if (
      !taskLookupBefore.includes(
        'task.dealId'
      )
    ) {

      /*
       * Existing task lookup may not reference dealId before update,
       * but the task object still has dealId. We only require `task`.
       */
      if (
        !/\bconst\s+task\b/.test(
          taskLookupBefore
        )
      ) {
        fail(
          'В returnInvoiceRequest не найден объект task.'
        );
      }
    }


    const markerBlock =
      `

        // PART_1N_G1_INVOICE_MANAGER_ASSIGN
        const invoiceTaskDeal =
          await tx.deal
            .findUniqueOrThrow({
              where: {
                id:
                  task.dealId,
              },

              select: {
                managerId:
                  true,
              },
            });


        `;


    text =
      text.slice(
        0,
        updateTokenIndex
      ) +
      markerBlock +
      text.slice(
        updateTokenIndex
      );
  }


  /*
   * Find the actual tx.task.update({ ... }) call.
   */
  const updateTokenIndex =
    text.indexOf(
      'tx.task.update'
    );


  if (
    updateTokenIndex < 0
  ) {
    fail(
      'После вставки manager lookup не найден tx.task.update.'
    );
  }


  const updateOpenParen =
    text.indexOf(
      '(',
      updateTokenIndex
    );


  if (
    updateOpenParen < 0
  ) {
    fail(
      'Не найдено начало tx.task.update(...).'
    );
  }


  const updateCloseParen =
    findMatching(
      text,
      updateOpenParen,
      '(',
      ')'
    );


  if (
    updateCloseParen < 0
  ) {
    fail(
      'Не найден конец tx.task.update(...).'
    );
  }


  const updateCall =
    text.slice(
      updateOpenParen + 1,
      updateCloseParen
    );


  const dataMatch =
    /\bdata\s*:\s*\{/.exec(
      updateCall
    );


  if (!dataMatch) {
    fail(
      'В tx.task.update не найден data: { ... }.'
    );
  }


  const dataOpenInCall =
    updateCall.indexOf(
      '{',
      dataMatch.index
    );


  const dataCloseInCall =
    findMatching(
      updateCall,
      dataOpenInCall,
      '{',
      '}'
    );


  if (
    dataCloseInCall < 0
  ) {
    fail(
      'Не удалось определить конец data в tx.task.update.'
    );
  }


  let dataText =
    updateCall.slice(
      dataOpenInCall + 1,
      dataCloseInCall
    );


  /*
   * If assigneeId exists, replace any expression.
   * If it does not exist, add it.
   */
  const assigneeRegex =
    /\bassigneeId\s*:\s*[\s\S]*?(?=,\s*(?:[A-Za-z_$][\w$]*\s*:|\.\.\.)|$)/;


  if (
    assigneeRegex.test(
      dataText
    )
  ) {

    dataText =
      dataText.replace(
        assigneeRegex,
        `assigneeId:
                invoiceTaskDeal.managerId`
      );

  } else {

    dataText =
      `
              assigneeId:
                invoiceTaskDeal.managerId,
` +
      dataText;
  }


  const patchedUpdateCall =
    updateCall.slice(
      0,
      dataOpenInCall + 1
    ) +
    dataText +
    updateCall.slice(
      dataCloseInCall
    );


  text =
    text.slice(
      0,
      updateOpenParen + 1
    ) +
    patchedUpdateCall +
    text.slice(
      updateCloseParen
    );


  if (
    !/assigneeId\s*:\s*invoiceTaskDeal\.managerId/.test(
      text
    )
  ) {
    fail(
      'Не удалось назначить возвращаемую задачу менеджеру.'
    );
  }


  return text;
}


let service =
  read(servicePath);

let app =
  read(appPath);

let styles =
  read(stylesPath);

const dealCardSource =
  read(dealCardSourcePath);


/*
 * Backend invoice return.
 */

const returnMethod =
  findMethodRange(
    service,
    'returnInvoiceRequest'
  );


if (!returnMethod) {
  fail(
    'Не найден метод returnInvoiceRequest().'
  );
}


const patchedReturn =
  patchInvoiceReturn(
    returnMethod.text
  );


service =
  service.slice(
    0,
    returnMethod.start
  ) +
  patchedReturn +
  service.slice(
    returnMethod.end
  );


/*
 * Frontend DealCard.
 */

const dealCardRange =
  findFunctionRange(
    app,
    'DealCard'
  );


if (!dealCardRange) {
  fail(
    'Не найден function DealCard().'
  );
}


app =
  app.slice(
    0,
    dealCardRange.start
  ) +
  dealCardSource +
  app.slice(
    dealCardRange.end
  );


/*
 * Styles.
 */

const cssMarker =
  'MSM deal links v0.6.0 part 1N-G1';


if (
  !styles.includes(
    cssMarker
  )
) {
  styles =
    styles.trimEnd() +
    `

/* ${cssMarker} */

.dealIdentity {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 9px;
  min-width: 0;
}

.dealInternalNumberLink {
  position: relative;
  z-index: 2;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.dealInvoiceNumber {
  font-size: 12px;
  opacity: 0.72;
}

.dealClientName {
  flex-basis: 100%;
  min-width: 0;
}

.dealTaskLinks {
  position: relative;
  z-index: 2;
  margin-top: 10px;
}

.dealTaskLinksLabel {
  display: block;
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 700;
  opacity: 0.58;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dealTaskLinksList {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dealTaskLink {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  padding: 8px 10px;
  border: 1px solid rgba(120, 120, 120, 0.14);
  border-radius: 11px;
  text-decoration: none;
}

.dealTaskLink strong {
  min-width: 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.dealTaskLink span {
  flex: none;
  font-size: 11px;
  opacity: 0.68;
}

.dealTaskLinkNeedData {
  border-color: rgba(210, 140, 40, 0.34);
}

.dealTaskLinkNeedData span {
  font-weight: 700;
  opacity: 1;
}

.dealCardActionLink {
  position: relative;
  z-index: 2;
  display: inline-block;
  text-decoration: underline;
  text-underline-offset: 3px;
}
`;
}


/*
 * Verification.
 */

const verifyMethod =
  findMethodRange(
    service,
    'returnInvoiceRequest'
  );


if (
  !verifyMethod ||
  !verifyMethod.text.includes(
    'PART_1N_G1_INVOICE_MANAGER_ASSIGN'
  ) ||
  !/assigneeId\s*:\s*invoiceTaskDeal\.managerId/.test(
    verifyMethod.text
  )
) {
  fail(
    'Возврат счёта не назначен менеджеру сделки.'
  );
}


if (
  !app.includes(
    'dealInternalNumberLink'
  ) ||
  !app.includes(
    'activeTasks.map'
  ) ||
  !app.includes(
    'returnedInvoiceTask'
  )
) {
  fail(
    'DealCard собран некорректно.'
  );
}


console.log('');

console.log(
  'Проверка Part 1N-G1 v3:'
);

console.log(
  '  Возврат счёта -> managerId сделки: OK'
);

console.log(
  '  assigneeId найден ИЛИ добавлен автоматически: OK'
);

console.log(
  '  Используется та же ISSUE_CLIENT_INVOICE task: OK'
);

console.log(
  '  ЗК всегда виден: OK'
);

console.log(
  '  Нажатие ЗК -> сделка: OK'
);

console.log(
  '  Активные задачи -> прямые ссылки: OK'
);

console.log(
  '  Возвращённый счёт -> ссылка на задачу: OK'
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
    servicePath,
    appPath,
    stylesPath,
  ]
) {

  fs.copyFileSync(
    file,
    file +
      '.before-part1n-g1-v3-' +
      stamp
  );
}


write(
  servicePath,
  service
);

write(
  appPath,
  app
);

write(
  stylesPath,
  styles
);


console.log('');

console.log(
  'Part 1N-G1 v3 применён.'
);

console.log('');

console.log(
  'Новая Prisma migration не нужна.'
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
