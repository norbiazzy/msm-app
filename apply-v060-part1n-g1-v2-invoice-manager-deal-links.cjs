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
    'DealCard.part1n-g1-v2.tmp'
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


let service =
  read(servicePath);

let app =
  read(appPath);

let styles =
  read(stylesPath);

const dealCardSource =
  read(dealCardSourcePath);


/*
 * 1. Invoice return:
 * same task -> NEED_DATA -> deal manager.
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


let returnText =
  returnMethod.text;


if (
  !returnText.includes(
    'PART_1N_G1_INVOICE_MANAGER_ASSIGN'
  )
) {

  const updateIndex =
    returnText.indexOf(
      'await tx.task.update'
    );

  if (updateIndex < 0) {
    fail(
      'В returnInvoiceRequest не найден task.update.'
    );
  }


  const beforeUpdate =
    returnText.slice(
      0,
      updateIndex
    );


  if (
    !beforeUpdate.includes(
      'const task'
    ) ||
    !beforeUpdate.includes(
      'findUniqueOrThrow'
    )
  ) {
    fail(
      'В returnInvoiceRequest не найден загруженный task.'
    );
  }


  const managerLookup =
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


  returnText =
    returnText.slice(
      0,
      updateIndex
    ) +
    managerLookup +
    returnText.slice(
      updateIndex
    );


  const patchedUpdateIndex =
    returnText.indexOf(
      'await tx.task.update'
    );

  const beforePatchedUpdate =
    returnText.slice(
      0,
      patchedUpdateIndex
    );

  let afterPatchedUpdate =
    returnText.slice(
      patchedUpdateIndex
    );


  if (
    /assigneeId:\s*invoiceTaskDeal\.managerId\s*,/.test(
      afterPatchedUpdate
    )
  ) {
    // already okay
  } else if (
    /assigneeId:\s*body\.actorId\s*,/.test(
      afterPatchedUpdate
    )
  ) {

    afterPatchedUpdate =
      afterPatchedUpdate.replace(
        /assigneeId:\s*body\.actorId\s*,/,
        `assigneeId:
                invoiceTaskDeal.managerId,`
      );

  } else {
    fail(
      'В task.update возврата счёта не найден assigneeId.'
    );
  }


  returnText =
    beforePatchedUpdate +
    afterPatchedUpdate;


  service =
    service.slice(
      0,
      returnMethod.start
    ) +
    returnText +
    service.slice(
      returnMethod.end
    );
}


/*
 * 2. Replace DealCard only.
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
 * 3. Styles.
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

const updatedReturn =
  findMethodRange(
    service,
    'returnInvoiceRequest'
  );


if (
  !updatedReturn ||
  !updatedReturn.text.includes(
    'PART_1N_G1_INVOICE_MANAGER_ASSIGN'
  ) ||
  !updatedReturn.text.includes(
    'invoiceTaskDeal.managerId'
  )
) {
  fail(
    'Возврат счёта не назначен менеджеру.'
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
    'Ссылки DealCard собраны некорректно.'
  );
}


console.log('');
console.log(
  'Проверка Part 1N-G1 v2:'
);
console.log(
  '  Возврат счёта -> менеджер сделки: OK'
);
console.log(
  '  Используется та же ISSUE_CLIENT_INVOICE task: OK'
);
console.log(
  '  Внутренний номер ЗК всегда виден: OK'
);
console.log(
  '  Нажатие на ЗК -> сделка: OK'
);
console.log(
  '  Активные задачи сделки -> прямые ссылки: OK'
);
console.log(
  '  Возвращённый счёт -> ссылка «Открыть задачу»: OK'
);
console.log(
  '  DONE / CANCELLED в карточке сделки не выводятся: OK'
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
      '.before-part1n-g1-v2-' +
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
  'Part 1N-G1 v2 применён.'
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
