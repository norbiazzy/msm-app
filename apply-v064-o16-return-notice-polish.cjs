const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const stylesPath = path.join(
  root,
  'frontend',
  'src',
  'styles.css'
);

const marker =
  'PART_V064_O16_RETURN_NOTICE_POLISH';

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

if (!fs.existsSync(stylesPath)) {
  fail('Не найден frontend/src/styles.css');
}

const raw = fs.readFileSync(stylesPath, 'utf8');
const crlf = raw.includes('\r\n');
let styles = raw.replace(/\r\n/g, '\n');

if (styles.includes(marker)) {
  console.log('');
  console.log('v064-O1.6 уже установлен.');
  process.exit(0);
}

/* Проверяем, что предыдущий функциональный патч уже стоит. */
const required = [
  'PART_V064_O15_V3_ACCOUNTANT_RETURN_MESSAGE',
  '.taskReturnNoticeV3',
  '.taskReturnNoticeTop',
  '.taskReturnNoticeField',
  '.invoiceManagerReturnCard',
];

for (const item of required) {
  if (!styles.includes(item)) {
    fail(
      'Не найден ожидаемый CSS после O1.5 v3: ' +
      item
    );
  }
}

styles = styles.replace(/\s*$/, '') + `

/* ${marker}
   Компактное аккуратное отображение возврата бухгалтером.
   Только визуал. Логика и JSX не меняются.
*/

/* ---------- список задач / desktop ---------- */

.boView-tasks .taskReturnNoticeV3 {
  position: relative !important;
  display: grid !important;
  grid-template-columns:
    minmax(160px, .62fr)
    minmax(260px, 1.38fr)
    auto !important;
  column-gap: 22px !important;
  row-gap: 9px !important;
  align-items: end !important;

  width: 100% !important;
  margin: 13px 0 0 !important;
  padding: 12px 14px 11px !important;

  border: 1px solid
    rgba(220, 120, 106, .24) !important;
  border-left: 3px solid
    #dc786a !important;
  border-radius: 9px !important;

  background:
    rgba(220, 120, 106, .045) !important;
  box-shadow: none !important;

  text-align: left !important;
}

/* У старого taskReturnNotice была своя декоративная иконка.
   Отключаем её, чтобы остался только один ! */
.boView-tasks .taskReturnNoticeV3::before,
.boView-tasks .taskReturnNoticeV3::after {
  content: none !important;
  display: none !important;
}

.boView-tasks .taskReturnNoticeV3
.taskReturnNoticeTop {
  grid-column: 1 / -1 !important;

  display: flex !important;
  align-items: center !important;
  gap: 8px !important;

  min-height: 28px !important;
  margin: 0 !important;
  padding: 0 0 9px !important;

  border-bottom: 1px solid
    rgba(255, 255, 255, .07) !important;
}

.boView-tasks .taskReturnNoticeV3
.taskReturnNoticeIcon {
  display: inline-grid !important;
  width: 24px !important;
  height: 24px !important;
  flex: 0 0 24px !important;
  place-items: center !important;

  margin: 0 !important;
  padding: 0 !important;

  border: 0 !important;
  border-radius: 6px !important;

  background:
    rgba(220, 120, 106, .14) !important;
  color: #ef8172 !important;

  font-size: 13px !important;
  font-weight: 900 !important;
  line-height: 1 !important;
}

.boView-tasks .taskReturnNoticeV3
.taskReturnNoticeTop strong {
  margin: 0 !important;
  padding: 0 !important;

  color: #ef8172 !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  line-height: 1.25 !important;
}

.boView-tasks .taskReturnNoticeV3
.taskReturnNoticeField {
  display: grid !important;
  gap: 4px !important;

  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;

  border: 0 !important;
  background: transparent !important;
}

.boView-tasks .taskReturnNoticeV3
.taskReturnNoticeField > span {
  margin: 0 !important;

  color: #94a0ad !important;
  font-size: 11px !important;
  font-weight: 650 !important;
  line-height: 1.2 !important;
}

.boView-tasks .taskReturnNoticeV3
.taskReturnNoticeField > b {
  margin: 0 !important;

  color: var(--bo-text, #f2f4f6) !important;
  font-size: 14px !important;
  font-weight: 750 !important;
  line-height: 1.35 !important;
}

.boView-tasks .taskReturnNoticeV3
.taskReturnNoticeCommentField {
  grid-column: 2 !important;
  grid-row: 2 !important;

  padding: 0 !important;
  border: 0 !important;
}

.boView-tasks .taskReturnNoticeV3
.taskReturnNoticeCommentField p {
  margin: 0 !important;

  color: #c5cdd5 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;

  white-space: pre-wrap !important;
}

.boView-tasks .taskReturnNoticeV3 > em {
  grid-column: 3 !important;
  grid-row: 2 !important;

  align-self: end !important;
  justify-self: end !important;

  margin: 0 !important;
  padding: 0 0 1px !important;

  color: #93a9bf !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  font-style: normal !important;
  line-height: 1.3 !important;

  white-space: nowrap !important;
}

/* ---------- открытая задача ---------- */

.boView-tasks .invoiceManagerReturnCard {
  gap: 12px !important;

  margin: 0 0 14px !important;
  padding: 13px 15px !important;

  border: 1px solid
    rgba(220, 120, 106, .24) !important;
  border-left: 3px solid
    #dc786a !important;
  border-radius: 9px !important;

  background:
    rgba(220, 120, 106, .045) !important;
  box-shadow: none !important;
}

.boView-tasks .invoiceManagerReturnHead {
  padding-bottom: 9px !important;
  border-bottom: 1px solid
    rgba(255, 255, 255, .07) !important;
}

.boView-tasks .invoiceManagerReturnIcon {
  width: 24px !important;
  height: 24px !important;
  flex-basis: 24px !important;

  border-radius: 6px !important;
  background:
    rgba(220, 120, 106, .14) !important;
  color: #ef8172 !important;

  font-size: 13px !important;
}

.boView-tasks .invoiceManagerReturnHead strong {
  color: #ef8172 !important;
  font-size: 14px !important;
}

.boView-tasks .invoiceManagerReturnHead small,
.boView-tasks .invoiceManagerReturnField > span {
  color: #94a0ad !important;
}

.boView-tasks .invoiceManagerReturnField > b {
  font-size: 14px !important;
}

.boView-tasks .invoiceManagerReturnComment {
  padding-top: 9px !important;
}

.boView-tasks .invoiceManagerReturnComment p {
  color: #c5cdd5 !important;
  font-size: 13px !important;
}

/* ---------- tablet / phone ---------- */

@media (max-width: 760px) {
  .boView-tasks .taskReturnNoticeV3 {
    grid-template-columns: 1fr !important;
    gap: 9px !important;
    padding: 11px 12px !important;
  }

  .boView-tasks .taskReturnNoticeV3
  .taskReturnNoticeTop,
  .boView-tasks .taskReturnNoticeV3
  .taskReturnNoticeField,
  .boView-tasks .taskReturnNoticeV3
  .taskReturnNoticeCommentField,
  .boView-tasks .taskReturnNoticeV3 > em {
    grid-column: 1 !important;
    grid-row: auto !important;
  }

  .boView-tasks .taskReturnNoticeV3
  .taskReturnNoticeCommentField {
    padding-top: 8px !important;
    border-top: 1px solid
      rgba(255, 255, 255, .06) !important;
  }

  .boView-tasks .taskReturnNoticeV3 > em {
    justify-self: end !important;
    padding-top: 2px !important;
  }

  .boView-tasks .invoiceManagerReturnCard {
    padding: 12px !important;
  }
}
/* END_${marker} */
`;

const checks = [
  [
    styles.includes(marker),
    'visual polish добавлен'
  ],
  [
    styles.includes(
      '.taskReturnNoticeV3::before'
    ),
    'старая лишняя иконка отключена'
  ],
  [
    styles.includes(
      'grid-template-columns:'
    ),
    'desktop сетка'
  ],
  [
    styles.includes(
      '@media (max-width: 760px)'
    ),
    'mobile layout'
  ],
  [
    styles.includes(
      '.invoiceManagerReturnCard'
    ),
    'открытая задача оформлена'
  ],
];

console.log('');
console.log(
  'v064-O1.6 — аккуратный блок возврата'
);
console.log(
  '==================================='
);

for (const [ok, label] of checks) {
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
  'Меняется только frontend/src/styles.css'
);
console.log(
  'JSX, данные и backend не меняются.'
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

const backup =
  stylesPath +
  '.before-v064-o16-' +
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
  'v064-O1.6 применён.'
);
console.log(
  'Backup: ' +
  path.relative(root, backup)
);
