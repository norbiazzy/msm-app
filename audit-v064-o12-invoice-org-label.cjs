const fs = require('fs');
const path = require('path');

const root = __dirname;
const srcRoot =
  path.join(root, 'frontend', 'src');

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

const files = walk(srcRoot);

const target =
  files.find(
    (file) => {
      const text =
        fs.readFileSync(
          file,
          'utf8'
        );

      return text.includes(
        'PART_V064_O12_INVOICE_ORG_LABEL'
      );
    }
  );

console.log('');
console.log(
  'MSM — аудит v064-O1.2'
);
console.log(
  '======================'
);

if (!target) {
  console.log(
    'FAIL patch O1.2 не найден'
  );
  process.exit(1);
}

const text =
  fs.readFileSync(
    target,
    'utf8'
  );

const checks = [
  [
    text.includes(
      "return 'СТ';"
    ),
    'СТ'
  ],
  [
    text.includes(
      "return 'ИП';"
    ),
    'ИП'
  ],
  [
    text.includes(
      "return 'МСМ';"
    ),
    'МСМ'
  ],
  [
    text.includes(
      '.sellerType || deal.sellerType'
    ),
    'организация счёта'
  ],
  [
    text.includes(
      '}-{'
    ) ||
    text.includes(
      'dealSellerShortLabel'
    ),
    'номер счёта'
  ],
];

let failed = false;

console.log(
  'Файл: ' +
  path.relative(
    root,
    target
  )
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
    failed = true;
  }
}

console.log('');

if (failed) {
  console.log(
    'ИТОГ: есть ошибки.'
  );
  process.exit(1);
}

console.log(
  'ИТОГ: OK — в колонке «Счёт» выводится организация и номер.'
);
