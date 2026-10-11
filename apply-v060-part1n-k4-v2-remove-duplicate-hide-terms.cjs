const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const purchasesPath =
  path.join(
    root,
    'frontend',
    'src',
    'PurchasesBlock.tsx'
  );

const invoicePanelPath =
  path.join(
    root,
    'frontend',
    'src',
    'InvoiceRequestTaskPanel.tsx'
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


function findMatchingDiv(
  text,
  startIndex
) {
  const openRegex =
    /<div\b[^>]*>/g;

  const closeRegex =
    /<\/div>/g;

  let depth = 0;
  let cursor = startIndex;

  while (
    cursor < text.length
  ) {
    openRegex.lastIndex =
      cursor;

    closeRegex.lastIndex =
      cursor;

    const open =
      openRegex.exec(text);

    const close =
      closeRegex.exec(text);

    if (!close) {
      return -1;
    }

    if (
      open &&
      open.index <
        close.index
    ) {
      depth++;

      cursor =
        openRegex.lastIndex;

      continue;
    }

    depth--;

    const closeEnd =
      closeRegex.lastIndex;

    if (depth === 0) {
      return closeEnd;
    }

    cursor =
      closeEnd;
  }

  return -1;
}


let purchases =
  read(
    purchasesPath
  );

let invoicePanel =
  read(
    invoicePanelPath
  );


/*
 * ======================================================
 * 1. PAY_SUPPLIER:
 * disable the OLD upper return block only.
 * ======================================================
 */

const oldSupplierMarker =
  'PART_1M_A_SUPPLIER_RETURN';

const oldSupplierIndex =
  purchases.indexOf(
    oldSupplierMarker
  );


if (
  oldSupplierIndex < 0
) {
  fail(
    'Не найден PART_1M_A_SUPPLIER_RETURN.'
  );
}


const newSupplierReturnExists =
  purchases.includes(
    'PART_1N_K2_V3_SUPPLIER_RETURN'
  ) ||
  purchases.includes(
    'PART_1N_K2_SUPPLIER_RETURN'
  );


if (
  !newSupplierReturnExists
) {
  fail(
    'Новый нижний возврат PAY_SUPPLIER не найден.'
  );
}


const supplierWindowEnd =
  Math.min(
    purchases.length,
    oldSupplierIndex +
      1500
  );

let supplierWindow =
  purchases.slice(
    oldSupplierIndex,
    supplierWindowEnd
  );


if (
  !supplierWindow.includes(
    '<ReturnToManagerPanel'
  )
) {
  fail(
    'В старом supplier-блоке не найден ReturnToManagerPanel.'
  );
}


if (
  !supplierWindow.includes(
    'PART_1N_K4_V2_DISABLE_OLD_SUPPLIER_RETURN'
  )
) {

  const conditionStart =
    supplierWindow.indexOf(
      '{('
    );


  if (
    conditionStart < 0
  ) {
    fail(
      'Не найдено начало условия старого supplier return.'
    );
  }


  const absoluteStart =
    oldSupplierIndex +
    conditionStart;


  purchases =
    purchases.slice(
      0,
      absoluteStart
    ) +
    `{/* PART_1N_K4_V2_DISABLE_OLD_SUPPLIER_RETURN */}
      {false && (` +
    purchases.slice(
      absoluteStart + 2
    );
}


/*
 * ======================================================
 * 2. Invoice manager repair:
 * hide WHOLE "Условия + Значение" inline block.
 * ======================================================
 */

if (
  !invoicePanel.includes(
    'PART_1N_K4_V2_HIDE_TERMS_BLOCK'
  )
) {

  const termsTextIndex =
    invoicePanel.indexOf(
      'Условия'
    );


  if (
    termsTextIndex < 0
  ) {
    fail(
      'Не найден текст «Условия» в InvoiceRequestTaskPanel.tsx.'
    );
  }


  const inlineStart =
    invoicePanel.lastIndexOf(
      '<div className="inline">',
      termsTextIndex
    );


  if (
    inlineStart < 0
  ) {
    fail(
      'Не найден родительский inline-блок поля «Условия».'
    );
  }


  const blockEnd =
    findMatchingDiv(
      invoicePanel,
      inlineStart
    );


  if (
    blockEnd < 0
  ) {
    fail(
      'Не удалось определить конец inline-блока «Условия».'
    );
  }


  const termsBlock =
    invoicePanel.slice(
      inlineStart,
      blockEnd
    );


  if (
    !termsBlock.includes(
      'marginMode'
    ) ||
    !termsBlock.includes(
      'marginValue'
    ) ||
    !termsBlock.includes(
      'Значение'
    )
  ) {
    fail(
      'Найденный inline-блок не похож на «Условия + Значение».'
    );
  }


  invoicePanel =
    invoicePanel.slice(
      0,
      inlineStart
    ) +
    `{/* PART_1N_K4_V2_HIDE_TERMS_BLOCK */}
        {false && (
` +
    termsBlock +
    `
        )}
` +
    invoicePanel.slice(
      blockEnd
    );
}


/*
 * ======================================================
 * Verification
 * ======================================================
 */

const verifySupplierStart =
  purchases.indexOf(
    oldSupplierMarker
  );

const verifySupplierWindow =
  purchases.slice(
    verifySupplierStart,
    Math.min(
      purchases.length,
      verifySupplierStart +
        1700
    )
  );


if (
  !verifySupplierWindow.includes(
    'PART_1N_K4_V2_DISABLE_OLD_SUPPLIER_RETURN'
  ) ||
  !verifySupplierWindow.includes(
    'false &&'
  )
) {
  fail(
    'Старый верхний PAY_SUPPLIER return не отключён.'
  );
}


if (
  !(
    purchases.includes(
      'PART_1N_K2_V3_SUPPLIER_RETURN'
    ) ||
    purchases.includes(
      'PART_1N_K2_SUPPLIER_RETURN'
    )
  )
) {
  fail(
    'Нижний новый PAY_SUPPLIER return пропал.'
  );
}


if (
  !invoicePanel.includes(
    'PART_1N_K4_V2_HIDE_TERMS_BLOCK'
  )
) {
  fail(
    'Блок «Условия + Значение» не скрыт.'
  );
}


console.log('');
console.log(
  'Проверка Part 1N-K4 v2:'
);

console.log(
  '  PAY_SUPPLIER: верхний старый возврат отключён: OK'
);

console.log(
  '  PAY_SUPPLIER: нижний возврат сохранён: OK'
);

console.log(
  '  Исправление счёта: блок «Условия + Значение» скрыт: OK'
);

console.log(
  '  marginMode / marginValue в данных не удаляются'
);

console.log(
  '  TaskDetail / доверенность / ЭТРН не меняются'
);

console.log(
  '  Backend / Prisma не меняются'
);


if (
  checkOnly
) {
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
    purchasesPath,
    invoicePanelPath,
  ]
) {
  fs.copyFileSync(
    file,
    file +
      '.before-part1n-k4-v2-' +
      stamp
  );
}


write(
  purchasesPath,
  purchases
);

write(
  invoicePanelPath,
  invoicePanel
);


console.log('');
console.log(
  'Part 1N-K4 v2 применён.'
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
  '  node .\\audit-v060-return-manager-duplicates-v3.cjs'
);
