const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const stylesPath =
  path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  );

function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' + message
  );
  process.exit(1);
}

if (!fs.existsSync(stylesPath)) {
  fail(
    'Не найден frontend/src/styles.css'
  );
}

const raw =
  fs.readFileSync(
    stylesPath,
    'utf8'
  );

const crlf =
  raw.includes('\r\n');

let styles =
  raw.replace(
    /\r\n/g,
    '\n'
  );

if (
  !styles.includes(
    'PART_V064_O1_DEAL_WORKSPACE_C'
  )
) {
  fail(
    'Не найден установленный v064-O1.'
  );
}

const marker =
  'PART_V064_O11_COMPACT_OVERVIEW';

if (
  !styles.includes(marker)
) {
  styles =
    styles.replace(
      /\s*$/,
      ''
    ) +
`


/* PART_V064_O11_COMPACT_OVERVIEW
   Только визуальная компактность верхней сводки сделки.
   Логику, JSX и остальные блоки не меняет.
*/

.dealWorkspaceCMain > .dealOverview {
  border-radius: 11px !important;
  padding: 12px !important;
}

.dealWorkspaceCMain
.dealOverviewHead {
  gap: 10px !important;
  margin-bottom: 10px !important;
}

.dealWorkspaceCMain
.dealOverviewHead h2 {
  margin:
    3px 0
    0 !important;
  font-size: 24px !important;
  line-height: 1.05 !important;
}

.dealWorkspaceCMain
.dealOverviewMeta {
  gap: 8px !important;
  font-size: 10px !important;
}

.dealWorkspaceCMain
.dealOverviewInvoiceStatus {
  min-width: 150px !important;
  min-height: 56px !important;
  padding:
    8px 12px !important;
  border-radius: 10px !important;
}

.dealWorkspaceCMain
.dealOverviewInvoiceStatus span {
  font-size: 9px !important;
}

.dealWorkspaceCMain
.dealOverviewInvoiceStatus b {
  font-size: 12px !important;
}

.dealWorkspaceCMain
.dealOverviewGrid {
  gap: 7px !important;
}

.dealWorkspaceCMain
.dealMetric {
  min-height: 76px !important;
  border-radius: 9px !important;
  padding: 9px 11px !important;
}

.dealWorkspaceCMain
.dealMetric > span {
  font-size: 9px !important;
}

.dealWorkspaceCMain
.dealMetric > b {
  margin-top: 3px !important;
  font-size: 13px !important;
  line-height: 1.1 !important;
}

.dealWorkspaceCMain
.dealMetric > em {
  margin-top: 4px !important;
  font-size: 9px !important;
}

.dealWorkspaceCMain
.supplierBadgeList {
  gap: 4px !important;
}

.dealWorkspaceCMain
.supplierBadge {
  padding:
    3px 7px !important;
  font-size: 10px !important;
}

.dealWorkspaceCMain
.dealQuickEditor {
  margin-top: 8px !important;
  padding: 10px !important;
  border-radius: 9px !important;
}

@media (max-width: 820px) {
  .dealWorkspaceCMain >
  .dealOverview {
    padding: 10px !important;
  }

  .dealWorkspaceCMain
  .dealOverviewHead {
    align-items: stretch !important;
  }

  .dealWorkspaceCMain
  .dealOverviewInvoiceStatus {
    min-width: 128px !important;
  }

  .dealWorkspaceCMain
  .dealMetric {
    min-height: 70px !important;
  }
}

/* END_PART_V064_O11_COMPACT_OVERVIEW */
`;
}

const checks = [
  [
    styles.includes(
      'PART_V064_O1_DEAL_WORKSPACE_C'
    ),
    'O1 установлен'
  ],
  [
    styles.includes(marker),
    'O1.1 CSS'
  ],
  [
    styles.includes(
      '.dealWorkspaceCMain > .dealOverview'
    ),
    'верхняя сводка'
  ],
  [
    styles.includes(
      '.dealWorkspaceCMain\n.dealMetric'
    ),
    'карточки метрик'
  ],
  [
    !styles.includes(
      'PART_V064_O2_DEAL_C_CLEANUP'
    ),
    'O2 не возвращён'
  ],
];

console.log('');
console.log(
  'v064-O1.1 — компактная сводка сделки'
);
console.log(
  '==================================='
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

if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файлы не изменены.'
  );
  process.exit(0);
}

if (
  raw.replace(/\r\n/g, '\n') === styles
) {
  console.log('');
  console.log(
    'Уже установлено — изменений нет.'
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
  stylesPath +
  '.before-v064-o11-' +
  stamp;

fs.copyFileSync(
  stylesPath,
  backup
);

fs.writeFileSync(
  stylesPath,
  crlf
    ? styles.replace(
        /\n/g,
        '\r\n'
      )
    : styles,
  'utf8'
);

console.log('');
console.log(
  'v064-O1.1 применён.'
);
console.log(
  'Изменён только: frontend/src/styles.css'
);
console.log(
  'Backup: ' + backup
);
