const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const srcRoot =
  path.join(root, 'frontend', 'src');

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function walk(dir) {
  const result = [];

  for (const entry of fs.readdirSync(
    dir,
    { withFileTypes: true }
  )) {
    const full =
      path.join(dir, entry.name);

    if (
      entry.name.includes(
        '.before-'
      )
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      result.push(...walk(full));
      continue;
    }

    if (
      /\.(tsx|jsx)$/.test(
        entry.name
      )
    ) {
      result.push(full);
    }
  }

  return result;
}

if (!fs.existsSync(srcRoot)) {
  fail(
    'Не найден frontend/src'
  );
}

const marker =
  'PART_V064_O12_INVOICE_ORG_LABEL';

const helper =
`
// ${marker}
function dealSellerShortLabel(
  type?: string,
) {
  if (type === 'ST') {
    return 'СТ';
  }

  if (type === 'IP') {
    return 'ИП';
  }

  return 'МСМ';
}
// END_${marker}
`;

const files = walk(srcRoot);

const tableCandidates =
  files.filter(
    (file) => {
      const text =
        fs.readFileSync(
          file,
          'utf8'
        );

      return (
        text.includes('Счёт') &&
        text.includes('Сумма') &&
        text.includes('Статус') &&
        text.includes('Задачи') &&
        text.includes('Комментарий') &&
        text.includes('internalNumber')
      );
    }
  );

if (
  tableCandidates.length !== 1
) {
  console.log(
    'Найдено файлов-кандидатов: ' +
    tableCandidates.length
  );

  for (
    const file
    of tableCandidates
  ) {
    console.log(
      ' - ' +
      path.relative(
        root,
        file
      )
    );
  }

  fail(
    'Не удалось однозначно определить таблицу сделок.'
  );
}

const target =
  tableCandidates[0];

const raw =
  fs.readFileSync(
    target,
    'utf8'
  );

const crlf =
  raw.includes('\r\n');

let text =
  raw.replace(
    /\r\n/g,
    '\n'
  );

if (
  text.includes(marker)
) {
  console.log('');
  console.log(
    'v064-O1.2 уже установлен.'
  );
  console.log(
    'Файл: ' +
    path.relative(
      root,
      target
    )
  );
  process.exit(0);
}

/*
 * Current list prints the bill as:
 * №{invoice.number}
 *
 * Capture the local invoice variable name,
 * so this stays safe even if it isn't literally "invoice".
 */
const jsxPattern =
  /№\s*\{\s*([A-Za-z_$][\w$]*)\.number\s*\}/g;

const jsxMatches =
  [...text.matchAll(
    jsxPattern
  )];

const templatePattern =
  /`№\$\{\s*([A-Za-z_$][\w$]*)\.number\s*\}`/g;

const templateMatches =
  [...text.matchAll(
    templatePattern
  )];

const total =
  jsxMatches.length +
  templateMatches.length;

if (total !== 1) {
  console.log('');
  console.log(
    'Целевой файл: ' +
    path.relative(
      root,
      target
    )
  );
  console.log(
    'Совпадений №{...number}: ' +
    jsxMatches.length
  );
  console.log(
    'Совпадений `№${...number}`: ' +
    templateMatches.length
  );

  fail(
    'Формат ячейки счёта отличается от ожидаемого. Ничего не изменено.'
  );
}

let variable = '';

if (jsxMatches.length === 1) {
  variable =
    jsxMatches[0][1];

  text =
    text.replace(
      jsxPattern,
      `{dealSellerShortLabel(${variable}.sellerType || deal.sellerType)}-{${variable}.number}`
    );
} else {
  variable =
    templateMatches[0][1];

  text =
    text.replace(
      templatePattern,
      '`${dealSellerShortLabel(' +
        variable +
        '.sellerType || deal.sellerType)}-${' +
        variable +
        '.number}`'
    );
}

const firstFunction =
  text.search(
    /(?:export\s+)?function\s+[A-Za-z_$]/
  );

if (firstFunction < 0) {
  fail(
    'Не найдено место для helper-функции.'
  );
}

text =
  text.slice(
    0,
    firstFunction
  ) +
  helper +
  '\n' +
  text.slice(
    firstFunction
  );

const checks = [
  [
    text.includes(marker),
    'helper организации'
  ],
  [
    text.includes(
      'dealSellerShortLabel'
    ),
    'форматтер продавца'
  ],
  [
    text.includes(
      '.sellerType || deal.sellerType'
    ),
    'организация из счёта/сделки'
  ],
  [
    !jsxPattern.test(text),
    'старый формат №123 убран'
  ],
];

console.log('');
console.log(
  'v064-O1.2 — организация + номер счёта'
);
console.log(
  '===================================='
);
console.log(
  'Файл: ' +
  path.relative(
    root,
    target
  )
);
console.log(
  'Переменная счёта: ' +
  variable
);

for (
  const [ok, label]
  of checks
) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    fail(
      'Проверка не пройдена: ' +
      label
    );
  }
}

console.log('');
console.log(
  'Результат будет: МСМ-1560 / СТ-1560 / ИП-1560'
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

const backup =
  target +
  '.before-v064-o12-' +
  stamp;

fs.copyFileSync(
  target,
  backup
);

fs.writeFileSync(
  target,
  crlf
    ? text.replace(
        /\n/g,
        '\r\n'
      )
    : text,
  'utf8'
);

console.log('');
console.log(
  'v064-O1.2 применён.'
);
console.log(
  'Backup: ' + backup
);
