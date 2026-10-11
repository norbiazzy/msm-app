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

const purchasesPath =
  path.join(
    root,
    'frontend',
    'src',
    'PurchasesBlock.tsx'
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


function findMatchingBrace(
  text,
  openIndex
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

    if (ch === '{') {
      depth++;
      continue;
    }

    if (ch === '}') {
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

  let parenDepth = 0;
  let closeParen = -1;

  for (
    let i = openParen;
    i < text.length;
    i++
  ) {
    if (text[i] === '(') {
      parenDepth++;
    } else if (
      text[i] === ')'
    ) {
      parenDepth--;

      if (parenDepth === 0) {
        closeParen = i;
        break;
      }
    }
  }

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
    findMatchingBrace(
      text,
      openBrace
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


function removeLegacyReturnButtons(
  text
) {
  let removed = 0;
  let changed = true;

  while (changed) {
    changed = false;

    let searchFrom = 0;

    while (true) {
      const labelIndex =
        text.indexOf(
          'Отказать / вернуть',
          searchFrom
        );

      if (labelIndex < 0) {
        break;
      }

      const buttonStart =
        text.lastIndexOf(
          '<button',
          labelIndex
        );

      const buttonClose =
        text.indexOf(
          '</button>',
          labelIndex
        );

      if (
        buttonStart < 0 ||
        buttonClose < 0
      ) {
        searchFrom =
          labelIndex + 1;
        continue;
      }

      const buttonEnd =
        buttonClose +
        '</button>'.length;

      const block =
        text.slice(
          buttonStart,
          buttonEnd
        );

      if (
        block.includes(
          'setReturnModalOpen'
        )
      ) {
        text =
          text.slice(
            0,
            buttonStart
          ) +
          text.slice(
            buttonEnd
          );

        removed++;
        changed = true;
        break;
      }

      searchFrom =
        labelIndex +
        'Отказать / вернуть'.length;
    }
  }

  return {
    text,
    removed,
  };
}


function disableLegacyInvoiceModal(
  text
) {
  if (
    text.includes(
      'legacyInvoiceReturnModalDisabled'
    )
  ) {
    return {
      text,
      changed: false,
    };
  }

  const classNeedle =
    'className="appModal invoiceReturnModal"';

  const classIndex =
    text.indexOf(
      classNeedle
    );

  if (classIndex < 0) {
    return {
      text,
      changed: false,
    };
  }

  const searchStart =
    Math.max(
      0,
      classIndex - 1400
    );

  const prefix =
    text.slice(
      searchStart,
      classIndex
    );

  const conditionMatch =
    /\{\s*returnModalOpen\s*&&[\s\S]*?task\.type\s*===\s*['"]ISSUE_CLIENT_INVOICE['"]/m
      .exec(
        prefix
      );

  if (!conditionMatch) {
    fail(
      'Найден invoiceReturnModal, но не удалось подтвердить его условие ISSUE_CLIENT_INVOICE.'
    );
  }

  const absoluteConditionStart =
    searchStart +
    conditionMatch.index;

  const returnModalIndex =
    text.indexOf(
      'returnModalOpen',
      absoluteConditionStart
    );

  if (
    returnModalIndex < 0 ||
    returnModalIndex >
      classIndex
  ) {
    fail(
      'Не удалось определить старое условие returnModalOpen.'
    );
  }

  text =
    text.slice(
      0,
      returnModalIndex
    ) +
    'false &&\n        ' +
    text.slice(
      returnModalIndex
    );

  text =
    text.replace(
      classNeedle,
      'className="appModal legacyInvoiceReturnModalDisabled"'
    );

  return {
    text,
    changed: true,
  };
}


let app =
  read(appPath);

let purchases =
  read(purchasesPath);


/*
 * 1. Invoice.
 * New common return MUST already exist.
 */
if (
  !app.includes(
    'mode="invoice"'
  )
) {
  fail(
    'Не найден новый ReturnToManagerPanel mode="invoice".'
  );
}


const buttonResult =
  removeLegacyReturnButtons(
    app
  );

app =
  buttonResult.text;


const modalResult =
  disableLegacyInvoiceModal(
    app
  );

app =
  modalResult.text;


/*
 * Verify no ACTIVE old invoice modal.
 */
if (
  app.includes(
    'className="appModal invoiceReturnModal"'
  )
) {
  fail(
    'Старый активный invoiceReturnModal остался.'
  );
}


/*
 * Verify no old return button still controls returnModalOpen.
 * Other same-label UI is allowed and untouched.
 */
let legacyButtonStillActive = false;
let searchFrom = 0;

while (true) {
  const labelIndex =
    app.indexOf(
      'Отказать / вернуть',
      searchFrom
    );

  if (labelIndex < 0) {
    break;
  }

  const buttonStart =
    app.lastIndexOf(
      '<button',
      labelIndex
    );

  const buttonClose =
    app.indexOf(
      '</button>',
      labelIndex
    );

  if (
    buttonStart >= 0 &&
    buttonClose >= 0
  ) {
    const block =
      app.slice(
        buttonStart,
        buttonClose +
          '</button>'.length
      );

    if (
      block.includes(
        'setReturnModalOpen'
      )
    ) {
      legacyButtonStillActive =
        true;
      break;
    }
  }

  searchFrom =
    labelIndex + 1;
}


if (
  legacyButtonStillActive
) {
  fail(
    'Осталась старая кнопка счёта, управляющая returnModalOpen.'
  );
}


/*
 * 2. Supplier payment.
 */
if (
  !purchases.includes(
    "from './ReturnToManagerPanel'"
  )
) {
  const importAnchor =
    "import {\n  MultiFilePicker,\n} from './MultiFilePicker';";

  if (
    !purchases.includes(
      importAnchor
    )
  ) {
    fail(
      'Не найден импорт MultiFilePicker в PurchasesBlock.tsx.'
    );
  }

  purchases =
    purchases.replace(
      importAnchor,
      `${importAnchor}

import {
  ReturnToManagerPanel,
} from './ReturnToManagerPanel';`
    );
}


const supplierRange =
  findFunctionRange(
    purchases,
    'SupplierPaymentTask'
  );


if (!supplierRange) {
  fail(
    'Не найден SupplierPaymentTask().'
  );
}


let supplierTask =
  supplierRange.text;


if (
  !supplierTask.includes(
    'PART_1N_K2_V3_SUPPLIER_RETURN'
  )
) {
  const match =
    /\{status\s*===\s*['"]IN_PROGRESS['"]\s*&&\s*!financiallyPaid\s*&&\s*\(/m
      .exec(
        supplierTask
      );

  if (!match) {
    fail(
      'В SupplierPaymentTask не найдена ветка IN_PROGRESS.'
    );
  }

  const block =
    `

      {/* PART_1N_K2_V3_SUPPLIER_RETURN */}

      {(
        status === 'NEW' ||
        status === 'IN_PROGRESS'
      ) &&
        !financiallyPaid && (

        <ReturnToManagerPanel
          taskId={task.id}
          actorId={user.id}
          disabled={saving}
          onReturned={onBack}
        />

      )}


`;

  supplierTask =
    supplierTask.slice(
      0,
      match.index
    ) +
    block +
    supplierTask.slice(
      match.index
    );

  purchases =
    purchases.slice(
      0,
      supplierRange.start
    ) +
    supplierTask +
    purchases.slice(
      supplierRange.end
    );
}


/*
 * Supplier cancel/delete modal must remain.
 */
if (
  !purchases.includes(
    'cancelConfirmOpen'
  ) ||
  !purchases.includes(
    'Отменить запрос оплаты?'
  )
) {
  fail(
    'Окно удаления/отмены закупки было затронуто.'
  );
}


const supplierAfter =
  findFunctionRange(
    purchases,
    'SupplierPaymentTask'
  );


if (
  !supplierAfter ||
  !supplierAfter.text.includes(
    'PART_1N_K2_V3_SUPPLIER_RETURN'
  ) ||
  !supplierAfter.text.includes(
    '<ReturnToManagerPanel'
  )
) {
  fail(
    'Общий возврат PAY_SUPPLIER не добавлен.'
  );
}


console.log('');
console.log(
  'Проверка Part 1N-K2 v3:'
);

console.log(
  '  Новый возврат счёта mode="invoice": OK'
);

console.log(
  `  Старых invoice-кнопок удалено: ${buttonResult.removed}`
);

console.log(
  '  Старое invoice-окно больше не может открыться: OK'
);

console.log(
  '  Другие одноимённые кнопки не затрагиваются: OK'
);

console.log(
  '  PAY_SUPPLIER -> общий ReturnToManagerPanel: OK'
);

console.log(
  '  Окно удаления/отмены закупки сохранено: OK'
);

console.log(
  '  Доверенность / ЭТРН не изменяются'
);

console.log(
  '  Backend / Prisma не изменяются'
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
    purchasesPath,
  ]
) {
  fs.copyFileSync(
    file,
    file +
      '.before-part1n-k2-v3-' +
      stamp
  );
}


write(
  appPath,
  app
);

write(
  purchasesPath,
  purchases
);


console.log('');
console.log(
  'Part 1N-K2 v3 применён.'
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
console.log(
  '  cd ..'
);
console.log(
  '  node .\\audit-v060-part1n-k1-v3-return-flows.cjs'
);
