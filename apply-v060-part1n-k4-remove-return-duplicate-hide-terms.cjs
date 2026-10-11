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

function findFunctionRange(text, functionName) {
  const token = 'function ' + functionName;
  const start = text.indexOf(token);

  if (start < 0) {
    return null;
  }

  const openParen = text.indexOf('(', start + token.length);
  if (openParen < 0) {
    return null;
  }

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

  if (closeParen < 0) {
    return null;
  }

  const openBrace = text.indexOf('{', closeParen + 1);
  if (openBrace < 0) {
    return null;
  }

  let depth = 0;
  let mode = 'code';
  let quote = '';
  let closeBrace = -1;

  for (let i = openBrace; i < text.length; i++) {
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

    if (ch === "'" || ch === '"' || ch === '`') {
      mode = 'string';
      quote = ch;
      continue;
    }

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;

      if (depth === 0) {
        closeBrace = i;
        break;
      }
    }
  }

  if (closeBrace < 0) {
    return null;
  }

  return {
    start,
    end: closeBrace + 1,
    text: text.slice(start, closeBrace + 1),
  };
}

function findMatchingTag(text, startIndex, tagName) {
  const openNeedle = '<' + tagName;
  const closeNeedle = '</' + tagName + '>';

  let depth = 0;
  let index = startIndex;

  while (index < text.length) {
    const nextOpen = text.indexOf(openNeedle, index);
    const nextClose = text.indexOf(closeNeedle, index);

    if (nextClose < 0) {
      return -1;
    }

    if (
      nextOpen >= 0 &&
      nextOpen < nextClose
    ) {
      const openEnd = text.indexOf('>', nextOpen);

      if (openEnd < 0) {
        return -1;
      }

      const selfClosing =
        text[openEnd - 1] === '/';

      if (!selfClosing) {
        depth++;
      }

      index = openEnd + 1;
      continue;
    }

    depth--;
    const closeEnd = nextClose + closeNeedle.length;

    if (depth === 0) {
      return closeEnd;
    }

    index = closeEnd;
  }

  return -1;
}

let purchases = read(purchasesPath);
let invoicePanel = read(invoicePanelPath);

/*
 * ------------------------------------------------------
 * 1. Supplier payment duplicate.
 * Disable ONLY the older Part 1M supplier return block.
 * Keep Part 1N K2 return block.
 * ------------------------------------------------------
 */

const oldMarker =
  'PART_1M_A_SUPPLIER_RETURN';

const newMarkerCandidates = [
  'PART_1N_K2_V3_SUPPLIER_RETURN',
  'PART_1N_K2_SUPPLIER_RETURN',
];

const oldMarkerIndex =
  purchases.indexOf(oldMarker);

if (oldMarkerIndex < 0) {
  fail(
    'Не найден старый блок PART_1M_A_SUPPLIER_RETURN в PurchasesBlock.tsx.'
  );
}

const hasNewSupplierReturn =
  newMarkerCandidates.some(
    (marker) =>
      purchases.includes(marker)
  );

if (!hasNewSupplierReturn) {
  fail(
    'Не найден новый блок возврата PAY_SUPPLIER. Старый блок отключать небезопасно.'
  );
}

const searchEnd =
  Math.min(
    purchases.length,
    oldMarkerIndex + 1200
  );

const oldChunk =
  purchases.slice(
    oldMarkerIndex,
    searchEnd
  );

if (
  !oldChunk.includes(
    '<ReturnToManagerPanel'
  )
) {
  fail(
    'После маркера PART_1M_A_SUPPLIER_RETURN не найден ReturnToManagerPanel.'
  );
}

if (
  !oldChunk.includes(
    'status ==='
  )
) {
  fail(
    'Не удалось подтвердить условие старого supplier return.'
  );
}

if (
  !oldChunk.includes(
    'false &&'
  )
) {
  const relativeCondition =
    oldChunk.indexOf('{(');

  if (relativeCondition < 0) {
    fail(
      'Не найдено начало условия старого supplier return.'
    );
  }

  const absoluteCondition =
    oldMarkerIndex +
    relativeCondition;

  purchases =
    purchases.slice(
      0,
      absoluteCondition + 1
    ) +
    'false && ' +
    purchases.slice(
      absoluteCondition + 1
    );
}

/*
 * Verify old block is disabled,
 * new block still exists.
 */

const verifyOldChunk =
  purchases.slice(
    oldMarkerIndex,
    Math.min(
      purchases.length,
      oldMarkerIndex + 1300
    )
  );

if (
  !verifyOldChunk.includes(
    'false &&'
  )
) {
  fail(
    'Старый supplier return не отключён.'
  );
}

if (
  !newMarkerCandidates.some(
    (marker) =>
      purchases.includes(marker)
  )
) {
  fail(
    'Новый supplier return пропал.'
  );
}

/*
 * ------------------------------------------------------
 * 2. Manager invoice repair:
 * hide/disable field "Условие".
 *
 * We only touch InvoiceRequestManagerRepair().
 * Supported local forms:
 * - <Field title="Условие">...</Field>
 * - <label ...><span>Условие</span>...</label>
 * ------------------------------------------------------
 */

const repairRange =
  findFunctionRange(
    invoicePanel,
    'InvoiceRequestManagerRepair'
  );

if (!repairRange) {
  fail(
    'Не найден InvoiceRequestManagerRepair().'
  );
}

let repair =
  repairRange.text;

if (
  !repair.includes(
    'PART_1N_K4_HIDE_TERMS_FIELD'
  )
) {
  let changed = false;

  /*
   * Case A: <Field title="Условие">...</Field>
   */
  const fieldTitleRegex =
    /<Field\b[^>]*title\s*=\s*["']Условие["'][^>]*>/m;

  const fieldMatch =
    fieldTitleRegex.exec(repair);

  if (fieldMatch) {
    const start =
      fieldMatch.index;

    const end =
      findMatchingTag(
        repair,
        start,
        'Field'
      );

    if (end < 0) {
      fail(
        'Не удалось определить конец Field «Условие».'
      );
    }

    const block =
      repair.slice(
        start,
        end
      );

    repair =
      repair.slice(0, start) +
      `{/* PART_1N_K4_HIDE_TERMS_FIELD */}\n      {false && (\n` +
      block +
      `\n      )}` +
      repair.slice(end);

    changed = true;
  }

  /*
   * Case B: label/span markup.
   */
  if (!changed) {
    const labelRegex =
      /<label\b[\s\S]{0,400}?<span\b[^>]*>\s*Условие\s*<\/span>/m;

    const labelMatch =
      labelRegex.exec(repair);

    if (labelMatch) {
      const labelStart =
        repair.lastIndexOf(
          '<label',
          labelMatch.index +
          labelMatch[0].length
        );

      if (labelStart < 0) {
        fail(
          'Не удалось определить начало label «Условие».'
        );
      }

      const labelEnd =
        findMatchingTag(
          repair,
          labelStart,
          'label'
        );

      if (labelEnd < 0) {
        fail(
          'Не удалось определить конец label «Условие».'
        );
      }

      const block =
        repair.slice(
          labelStart,
          labelEnd
        );

      repair =
        repair.slice(0, labelStart) +
        `{/* PART_1N_K4_HIDE_TERMS_FIELD */}\n      {false && (\n` +
        block +
        `\n      )}` +
        repair.slice(labelEnd);

      changed = true;
    }
  }

  if (!changed) {
    fail(
      'В InvoiceRequestManagerRepair не найдено поле с заголовком «Условие».'
    );
  }

  invoicePanel =
    invoicePanel.slice(
      0,
      repairRange.start
    ) +
    repair +
    invoicePanel.slice(
      repairRange.end
    );
}

/*
 * Final verification:
 * - old supplier block disabled;
 * - new supplier return remains;
 * - invoice repair contains hide marker.
 */

const finalRepair =
  findFunctionRange(
    invoicePanel,
    'InvoiceRequestManagerRepair'
  );

if (
  !finalRepair ||
  !finalRepair.text.includes(
    'PART_1N_K4_HIDE_TERMS_FIELD'
  )
) {
  fail(
    'Поле «Условие» не отключено.'
  );
}

console.log('');
console.log(
  'Проверка Part 1N-K4:'
);
console.log(
  '  PAY_SUPPLIER: верхний старый возврат отключён: OK'
);
console.log(
  '  PAY_SUPPLIER: нижний новый возврат сохранён: OK'
);
console.log(
  '  Счёт менеджеру: поле «Условие» скрыто: OK'
);
console.log(
  '  TaskDetail счёта / доверенности / ЭТРН не меняется'
);
console.log(
  '  Backend / Prisma не меняются'
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
    purchasesPath,
    invoicePanelPath,
  ]
) {
  fs.copyFileSync(
    file,
    file +
      '.before-part1n-k4-' +
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
  'Part 1N-K4 применён.'
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
  '  node .\\audit-v060-return-manager-duplicates-v2.cjs'
);
