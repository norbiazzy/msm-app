const fs = require('fs');
const path = require('path');

const root = __dirname;

const stylesPath =
  path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  );

if (!fs.existsSync(stylesPath)) {
  console.error(
    'FAIL styles.css отсутствует'
  );
  process.exit(1);
}

const styles =
  fs.readFileSync(
    stylesPath,
    'utf8'
  );

const checks = [
  [
    styles.includes(
      'PART_V064_O1_DEAL_WORKSPACE_C'
    ),
    'вариант C'
  ],
  [
    styles.includes(
      'PART_V064_O11_COMPACT_OVERVIEW'
    ),
    'O1.1'
  ],
  [
    styles.includes(
      '.dealWorkspaceCMain > .dealOverview'
    ),
    'сводка компактная'
  ],
  [
    styles.includes(
      'min-height: 76px'
    ),
    'метрики уменьшены'
  ],
  [
    !styles.includes(
      'PART_V064_O2_DEAL_C_CLEANUP'
    ),
    'O2 отсутствует'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O1.1'
);
console.log(
  '======================'
);

let failed = false;

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
  'ИТОГ: OK — изменена только компактность верхней сводки.'
);
