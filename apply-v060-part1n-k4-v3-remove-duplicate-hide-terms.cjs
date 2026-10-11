const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const purchasesPath = path.join(
  root,
  'frontend',
  'src',
  'PurchasesBlock.tsx'
);

const invoicePanelPath = path.join(
  root,
  'frontend',
  'src',
  'InvoiceRequestTaskPanel.tsx'
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

let purchases = read(purchasesPath);
let invoicePanel = read(invoicePanelPath);

/*
 * ======================================================
 * 1. PAY_SUPPLIER — disable ONLY old upper return block.
 * ======================================================
 */

const oldMarker = 'PART_1M_A_SUPPLIER_RETURN';
const oldMarkerIndex = purchases.indexOf(oldMarker);

if (oldMarkerIndex < 0) {
  fail('Не найден PART_1M_A_SUPPLIER_RETURN.');
}

const newReturnExists =
  purchases.includes('PART_1N_K2_V3_SUPPLIER_RETURN') ||
  purchases.includes('PART_1N_K2_SUPPLIER_RETURN');

if (!newReturnExists) {
  fail('Новый нижний возврат PAY_SUPPLIER не найден.');
}

const oldWindowEnd = Math.min(
  purchases.length,
  oldMarkerIndex + 1600
);

let oldWindow = purchases.slice(
  oldMarkerIndex,
  oldWindowEnd
);

if (!oldWindow.includes('<ReturnToManagerPanel')) {
  fail('В старом supplier-блоке не найден ReturnToManagerPanel.');
}

if (
  !oldWindow.includes(
    'PART_1N_K4_V3_DISABLE_OLD_SUPPLIER_RETURN'
  )
) {
  const conditionIndex = oldWindow.indexOf('{(');

  if (conditionIndex < 0) {
    fail('Не найдено начало условия старого supplier return.');
  }

  const absoluteConditionIndex =
    oldMarkerIndex + conditionIndex;

  purchases =
    purchases.slice(0, absoluteConditionIndex) +
    `{/* PART_1N_K4_V3_DISABLE_OLD_SUPPLIER_RETURN */}
      {false && (` +
    purchases.slice(absoluteConditionIndex + 2);
}

/*
 * ======================================================
 * 2. Invoice repair — hide exact UI block "Условия + Значение".
 * Do not touch state/save logic.
 * ======================================================
 */

if (
  !invoicePanel.includes(
    'PART_1N_K4_V3_HIDE_TERMS_UI'
  )
) {
  const repairStart =
    invoicePanel.indexOf(
      'function InvoiceRequestManagerRepair'
    );

  if (repairStart < 0) {
    fail('Не найден InvoiceRequestManagerRepair().');
  }

  const repairEndCandidate =
    invoicePanel.indexOf(
      '\nexport function ',
      repairStart + 20
    );

  const repairEnd =
    repairEndCandidate >= 0
      ? repairEndCandidate
      : invoicePanel.length;

  const repairText =
    invoicePanel.slice(
      repairStart,
      repairEnd
    );

  const termsSpanRegex =
    /<span\b[^>]*>\s*Условия\s*<\/span>/m;

  const termsMatch =
    termsSpanRegex.exec(repairText);

  if (!termsMatch) {
    fail(
      'В InvoiceRequestManagerRepair не найден <span>Условия</span>.'
    );
  }

  const absoluteTermsIndex =
    repairStart + termsMatch.index;

  const divStart =
    invoicePanel.lastIndexOf(
      '<div',
      absoluteTermsIndex
    );

  if (divStart < repairStart) {
    fail(
      'Не найден родительский div для поля «Условия».'
    );
  }

  const divOpenEnd =
    invoicePanel.indexOf(
      '>',
      divStart
    );

  if (divOpenEnd < 0) {
    fail(
      'Не найден конец открывающего тега div поля «Условия».'
    );
  }

  const openingTag =
    invoicePanel.slice(
      divStart,
      divOpenEnd + 1
    );

  if (
    !/className\s*=\s*["']inline["']/.test(
      openingTag
    )
  ) {
    fail(
      'Родительский div поля «Условия» не является className="inline".'
    );
  }

  /*
   * Verify nearby block also contains "Значение", marginMode, marginValue.
   */
  const nearby =
    invoicePanel.slice(
      divStart,
      Math.min(
        invoicePanel.length,
        divStart + 2600
      )
    );

  if (
    !nearby.includes('Значение') ||
    !nearby.includes('marginMode') ||
    !nearby.includes('marginValue')
  ) {
    fail(
      'Найденный inline-блок не похож на «Условия + Значение».'
    );
  }

  const newOpeningTag =
    openingTag.replace(
      '<div',
      `<div
          /* PART_1N_K4_V3_HIDE_TERMS_UI */
          hidden`
    );

  invoicePanel =
    invoicePanel.slice(0, divStart) +
    newOpeningTag +
    invoicePanel.slice(divOpenEnd + 1);
}

/*
 * ======================================================
 * Verification
 * ======================================================
 */

const verifyOldWindow =
  purchases.slice(
    oldMarkerIndex,
    Math.min(
      purchases.length,
      oldMarkerIndex + 1800
    )
  );

if (
  !verifyOldWindow.includes(
    'PART_1N_K4_V3_DISABLE_OLD_SUPPLIER_RETURN'
  ) ||
  !verifyOldWindow.includes('false &&')
) {
  fail('Старый верхний PAY_SUPPLIER return не отключён.');
}

if (
  !(
    purchases.includes('PART_1N_K2_V3_SUPPLIER_RETURN') ||
    purchases.includes('PART_1N_K2_SUPPLIER_RETURN')
  )
) {
  fail('Новый нижний PAY_SUPPLIER return пропал.');
}

if (
  !invoicePanel.includes(
    'PART_1N_K4_V3_HIDE_TERMS_UI'
  )
) {
  fail('UI-блок «Условия + Значение» не скрыт.');
}

console.log('');
console.log('Проверка Part 1N-K4 v3:');
console.log(
  '  PAY_SUPPLIER: верхний старый возврат отключён: OK'
);
console.log(
  '  PAY_SUPPLIER: нижний возврат сохранён: OK'
);
console.log(
  '  Исправление счёта: блок «Условия + Значение» скрыт через hidden: OK'
);
console.log(
  '  Логика marginMode / marginValue не удаляется'
);
console.log(
  '  TaskDetail / доверенность / ЭТРН не меняются'
);
console.log(
  '  Backend / Prisma не меняются'
);

if (checkOnly) {
  console.log('');
  console.log('CHECK ONLY — файлы не изменены.');
  process.exit(0);
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-');

for (const file of [
  purchasesPath,
  invoicePanelPath,
]) {
  fs.copyFileSync(
    file,
    file +
      '.before-part1n-k4-v3-' +
      stamp
  );
}

write(purchasesPath, purchases);
write(invoicePanelPath, invoicePanel);

console.log('');
console.log('Part 1N-K4 v3 применён.');
console.log('');
console.log('Дальше:');
console.log('  git diff --check');
console.log('  cd frontend');
console.log('  npm run build');
console.log('  cd ..');
console.log(
  '  node .\\audit-v060-return-manager-duplicates-v4.cjs'
);
