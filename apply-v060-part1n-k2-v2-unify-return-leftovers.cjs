const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const appPath = path.join(
  root, 'frontend', 'src', 'App.tsx'
);

const purchasesPath = path.join(
  root, 'frontend', 'src', 'PurchasesBlock.tsx'
);

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let mode = 'code';
  let quote = '';

  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (mode === 'lineComment') {
      if (ch === '\n') mode = 'code';
      continue;
    }

    if (mode === 'blockComment') {
      if (ch === '*' && next === '/') {
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
      if (ch === quote) mode = 'code';
      continue;
    }

    if (ch === '/' && next === '/') {
      mode = 'lineComment';
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
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
      if (depth === 0) return i;
    }
  }

  return -1;
}

function findFunctionRange(text, functionName) {
  const token = 'function ' + functionName;
  const start = text.indexOf(token);

  if (start < 0) return null;

  const openParen = text.indexOf('(', start + token.length);
  if (openParen < 0) return null;

  let parenDepth = 0;
  let closeParen = -1;

  for (let i = openParen; i < text.length; i++) {
    if (text[i] === '(') {
      parenDepth++;
    } else if (text[i] === ')') {
      parenDepth--;
      if (parenDepth === 0) {
        closeParen = i;
        break;
      }
    }
  }

  if (closeParen < 0) return null;

  const openBrace = text.indexOf('{', closeParen + 1);
  if (openBrace < 0) return null;

  const closeBrace = findMatchingBrace(text, openBrace);
  if (closeBrace < 0) return null;

  return {
    start,
    end: closeBrace + 1,
    text: text.slice(start, closeBrace + 1),
  };
}

function removeOldReturnButtons(app) {
  let removed = 0;
  let searchFrom = 0;

  while (true) {
    const labelIndex =
      app.indexOf(
        'Отказать / вернуть',
        searchFrom
      );

    if (labelIndex < 0) break;

    const buttonStart =
      app.lastIndexOf(
        '<button',
        labelIndex
      );

    const buttonEnd =
      app.indexOf(
        '</button>',
        labelIndex
      );

    if (
      buttonStart < 0 ||
      buttonEnd < 0
    ) {
      searchFrom =
        labelIndex +
        'Отказать / вернуть'.length;
      continue;
    }

    const end =
      buttonEnd +
      '</button>'.length;

    const block =
      app.slice(
        buttonStart,
        end
      );

    if (
      block.includes(
        'setReturnModalOpen'
      )
    ) {
      app =
        app.slice(0, buttonStart) +
        app.slice(end);

      removed++;
      searchFrom = buttonStart;
      continue;
    }

    searchFrom =
      labelIndex +
      'Отказать / вернуть'.length;
  }

  return {
    text: app,
    removed,
  };
}

function removeLegacyInvoiceModal(app) {
  if (!app.includes('invoiceReturnModal')) {
    return {
      text: app,
      removed: false,
    };
  }

  const startRegex =
    /\{\s*returnModalOpen\s*&&[\s\S]{0,300}?task\.type\s*===\s*['"]ISSUE_CLIENT_INVOICE['"]/m;

  const match =
    startRegex.exec(app);

  if (!match) {
    return {
      text: app,
      removed: false,
    };
  }

  const start =
    match.index;

  const close =
    findMatchingBrace(
      app,
      start
    );

  if (close < 0) {
    return {
      text: app,
      removed: false,
    };
  }

  const block =
    app.slice(
      start,
      close + 1
    );

  if (
    !block.includes(
      'invoiceReturnModal'
    )
  ) {
    return {
      text: app,
      removed: false,
    };
  }

  return {
    text:
      app.slice(0, start) +
      app.slice(close + 1),
    removed: true,
  };
}

let app = read(appPath);
let purchases = read(purchasesPath);

/*
 * 1. Invoice cleanup.
 */

if (
  !app.includes(
    'mode="invoice"'
  ) &&
  app.includes(
    'invoiceReturnModal'
  )
) {
  fail(
    'Новый общий возврат счёта не найден. Старую модалку удалять небезопасно.'
  );
}

const buttonResult =
  removeOldReturnButtons(app);

app =
  buttonResult.text;

const modalResult =
  removeLegacyInvoiceModal(app);

app =
  modalResult.text;

if (
  app.includes(
    'invoiceReturnModal'
  )
) {
  fail(
    'Не удалось безопасно удалить старый invoiceReturnModal.'
  );
}

if (
  app.includes(
    'Отказать / вернуть'
  )
) {
  fail(
    'В App.tsx осталась старая кнопка «Отказать / вернуть».'
  );
}

if (
  !app.includes(
    'mode="invoice"'
  )
) {
  fail(
    'После очистки пропал новый ReturnToManagerPanel счёта.'
  );
}

/*
 * 2. Supplier shared return.
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
    'PART_1N_K2_SUPPLIER_RETURN'
  )
) {
  const inProgressMatch =
    /\{status\s*===\s*['"]IN_PROGRESS['"]\s*&&\s*!financiallyPaid\s*&&\s*\(/m
      .exec(
        supplierTask
      );

  if (!inProgressMatch) {
    fail(
      'В SupplierPaymentTask не найдена ветка IN_PROGRESS.'
    );
  }

  const insertIndex =
    inProgressMatch.index;

  const returnBlock =
    `

      {/* PART_1N_K2_SUPPLIER_RETURN */}

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
    supplierTask.slice(0, insertIndex) +
    returnBlock +
    supplierTask.slice(insertIndex);

  purchases =
    purchases.slice(0, supplierRange.start) +
    supplierTask +
    purchases.slice(supplierRange.end);
}

/*
 * Verify supplier cancel/delete modal remains.
 */

const updatedSupplierRange =
  findFunctionRange(
    purchases,
    'SupplierPaymentTask'
  );

if (
  !updatedSupplierRange ||
  !updatedSupplierRange.text.includes(
    'PART_1N_K2_SUPPLIER_RETURN'
  ) ||
  !updatedSupplierRange.text.includes(
    '<ReturnToManagerPanel'
  )
) {
  fail(
    'Общий возврат не добавлен в SupplierPaymentTask.'
  );
}

if (
  !purchases.includes(
    'cancelConfirmOpen'
  ) ||
  !purchases.includes(
    'Отменить запрос оплаты?'
  )
) {
  fail(
    'Окно отмены/удаления закупки было затронуто.'
  );
}

console.log('');
console.log('Проверка Part 1N-K2 v2:');
console.log(
  '  Старый invoiceReturnModal удалён: OK'
);
console.log(
  '  Старые кнопки «Отказать / вернуть» удалены: OK'
);
console.log(
  '  Новый возврат счёта сохранён: OK'
);
console.log(
  '  PAY_SUPPLIER использует ReturnToManagerPanel: OK'
);
console.log(
  '  Return доступен в NEW / IN_PROGRESS: OK'
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
    .replace(/[:.]/g, '-');

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
      '.before-part1n-k2-v2-' +
      stamp
  );
}

write(appPath, app);
write(purchasesPath, purchases);

console.log('');
console.log(
  'Part 1N-K2 v2 применён.'
);
console.log('');
console.log('Дальше:');
console.log('  git diff --check');
console.log('  cd frontend');
console.log('  npm run build');
console.log('  cd ..');
console.log(
  '  node .\\audit-v060-part1n-k1-v2-return-flows.cjs'
);
