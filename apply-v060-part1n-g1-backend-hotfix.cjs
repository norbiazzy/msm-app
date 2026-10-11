const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const servicePath = path.join(
  root,
  'backend',
  'src',
  'tasks',
  'tasks.service.ts'
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

function findMatching(
  text,
  openIndex,
  openChar,
  closeChar
) {
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

    if (ch === openChar) {
      depth++;
      continue;
    }

    if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function findMethodRange(
  text,
  methodName
) {
  const token = 'async ' + methodName;
  const start = text.indexOf(token);

  if (start < 0) return null;

  const openParen = text.indexOf(
    '(',
    start + token.length
  );

  const closeParen = findMatching(
    text,
    openParen,
    '(',
    ')'
  );

  const openBrace = text.indexOf(
    '{',
    closeParen + 1
  );

  const closeBrace = findMatching(
    text,
    openBrace,
    '{',
    '}'
  );

  if (
    openParen < 0 ||
    closeParen < 0 ||
    openBrace < 0 ||
    closeBrace < 0
  ) {
    return null;
  }

  return {
    start,
    end: closeBrace + 1,
    text: text.slice(
      start,
      closeBrace + 1
    ),
  };
}

let service = read(servicePath);

const range = findMethodRange(
  service,
  'returnInvoiceRequest'
);

if (!range) {
  fail(
    'Не найден returnInvoiceRequest().'
  );
}

let method = range.text;

const marker =
  '// PART_1N_G1_INVOICE_MANAGER_ASSIGN';

const markerIndex =
  method.indexOf(marker);

if (markerIndex < 0) {
  fail(
    'Не найден блок PART_1N_G1_INVOICE_MANAGER_ASSIGN.'
  );
}

/*
 * Capture the whole manager lookup block.
 */
const lookupStart =
  method.lastIndexOf(
    '\n',
    markerIndex
  ) + 1;

const constIndex =
  method.indexOf(
    'const invoiceTaskDeal',
    markerIndex
  );

if (constIndex < 0) {
  fail(
    'Не найден const invoiceTaskDeal.'
  );
}

const findUniqueIndex =
  method.indexOf(
    'findUniqueOrThrow',
    constIndex
  );

if (findUniqueIndex < 0) {
  fail(
    'Не найден findUniqueOrThrow для invoiceTaskDeal.'
  );
}

const callOpen =
  method.indexOf(
    '(',
    findUniqueIndex
  );

const callClose =
  findMatching(
    method,
    callOpen,
    '(',
    ')'
  );

if (callOpen < 0 || callClose < 0) {
  fail(
    'Не удалось разобрать invoiceTaskDeal lookup.'
  );
}

/* Include trailing semicolon and whitespace. */
let lookupEnd =
  method.indexOf(
    ';',
    callClose
  );

if (lookupEnd < 0) {
  fail(
    'Не найден конец invoiceTaskDeal lookup.'
  );
}

lookupEnd += 1;

while (
  lookupEnd < method.length &&
  (
    method[lookupEnd] === '\n' ||
    method[lookupEnd] === '\r' ||
    method[lookupEnd] === ' ' ||
    method[lookupEnd] === '\t'
  )
) {
  lookupEnd++;
}

const lookupBlock =
  method.slice(
    lookupStart,
    lookupEnd
  ).trimEnd();

/*
 * Remove lookup from its current location.
 */
method =
  method.slice(
    0,
    lookupStart
  ) +
  method.slice(
    lookupEnd
  );

/*
 * If v3 inserted inside:
 *
 * const updated =
 *
 *   const invoiceTaskDeal = ...
 *
 * await tx.task.update(...)
 *
 * then after removal there is:
 *
 * const updated =
 * await tx.task.update(...)
 *
 * which is valid, but we want manager lookup before const updated.
 */

const updatedIndex =
  method.indexOf(
    'const updated'
  );

if (updatedIndex < 0) {
  fail(
    'Не найден const updated в returnInvoiceRequest.'
  );
}

/*
 * Insert manager lookup immediately before const updated.
 */
method =
  method.slice(
    0,
    updatedIndex
  ) +
  lookupBlock +
  '\n\n        ' +
  method.slice(
    updatedIndex
  );

/*
 * Normalize accidental duplicated indentation around const updated.
 */
method =
  method.replace(
    /\n[ \t]+const updated\s*=\s*\n[ \t]*await tx\.task\.update/,
    '\n        const updated =\n          await tx.task.update'
  );

/*
 * Validate ordering:
 * manager lookup MUST appear before const updated / task.update.
 */
const managerPos =
  method.indexOf(
    'const invoiceTaskDeal'
  );

const updatedPos =
  method.indexOf(
    'const updated'
  );

const taskUpdatePos =
  method.indexOf(
    'tx.task.update'
  );

if (
  managerPos < 0 ||
  updatedPos < 0 ||
  taskUpdatePos < 0 ||
  !(
    managerPos < updatedPos &&
    updatedPos < taskUpdatePos
  )
) {
  fail(
    'Порядок блоков после исправления некорректен.'
  );
}

if (
  !/assigneeId\s*:\s*invoiceTaskDeal\.managerId/.test(
    method
  )
) {
  fail(
    'Назначение assigneeId менеджеру не найдено.'
  );
}

/*
 * Put method back.
 */
service =
  service.slice(
    0,
    range.start
  ) +
  method +
  service.slice(
    range.end
  );

console.log('');
console.log(
  'Проверка Part 1N-G1 backend hotfix:'
);
console.log(
  '  invoiceTaskDeal вынесен перед const updated: OK'
);
console.log(
  '  tx.task.update остаётся выражением const updated: OK'
);
console.log(
  '  assigneeId = managerId сделки: OK'
);
console.log(
  '  Frontend не изменяется'
);
console.log(
  '  Prisma migration не нужна'
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

fs.copyFileSync(
  servicePath,
  servicePath +
    '.before-part1n-g1-backend-hotfix-' +
    stamp
);

write(
  servicePath,
  service
);

console.log('');
console.log(
  'Backend hotfix применён.'
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
