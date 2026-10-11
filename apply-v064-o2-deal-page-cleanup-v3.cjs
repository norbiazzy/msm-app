const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

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

function read(file) {
  if (!fs.existsSync(file)) {
    fail(
      'Не найден файл: ' +
      file
    );
  }

  const raw =
    fs.readFileSync(
      file,
      'utf8'
    );

  return {
    raw,
    crlf:
      raw.includes('\r\n'),
    text:
      raw.replace(
        /\r\n/g,
        '\n'
      ),
  };
}

function save(
  file,
  source,
  next,
) {
  if (
    source.text === next
  ) {
    return false;
  }

  const stamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      );

  fs.copyFileSync(
    file,
    file +
      '.before-v064-o2-' +
      stamp
  );

  fs.writeFileSync(
    file,
    source.crlf
      ? next.replace(
          /\n/g,
          '\r\n'
        )
      : next,
    'utf8'
  );

  return true;
}

function findMatchingDivEnd(
  text,
  start,
) {
  const tagRegex =
    /<div\b[^>]*>|<\/div>/g;

  tagRegex.lastIndex =
    start;

  let depth = 0;
  let seen = false;
  let match;

  while (
    (match =
      tagRegex.exec(text))
  ) {
    if (
      match[0].startsWith(
        '</div'
      )
    ) {
      depth--;

      if (
        seen &&
        depth === 0
      ) {
        return tagRegex
          .lastIndex;
      }
    } else {
      seen = true;
      depth++;
    }
  }

  return -1;
}

function replaceOnce(
  text,
  oldValue,
  newValue,
  label,
) {
  const count =
    text.split(
      oldValue
    ).length - 1;

  if (count !== 1) {
    fail(
      label +
      ': ожидалось 1 совпадение, найдено ' +
      count
    );
  }

  return text.replace(
    oldValue,
    newValue
  );
}

const appSource =
  read(appPath);

const stylesSource =
  read(stylesPath);

let app =
  appSource.text;

let styles =
  stylesSource.text;

/* =========================================================
   REQUIRE O1
   ========================================================= */

if (
  !app.includes(
    'PART_V064_O1_DEAL_WORKSPACE_C'
  ) ||
  !styles.includes(
    'PART_V064_O1_DEAL_WORKSPACE_C'
  )
) {
  fail(
    'Не найден v064-O1. Сначала должен быть установлен вариант C.'
  );
}

/* =========================================================
   1. OLD OVERVIEW -> COLLAPSIBLE PARAMETERS
   ========================================================= */

if (
  !app.includes(
    'PART_V064_O2_COMPACT_OVERVIEW'
  )
) {
  const dealStart =
    app.indexOf(
      'function DealDetail('
    );

  const dealEnd =
    app.indexOf(
      '\nfunction InvoiceBlock(',
      dealStart
    );

  if (
    dealStart < 0 ||
    dealEnd < 0
  ) {
    fail(
      'Не удалось определить DealDetail.'
    );
  }

  const overviewStart =
    app.indexOf(
      '<div className="dealOverview">',
      dealStart
    );

  if (
    overviewStart < 0 ||
    overviewStart >
      dealEnd
  ) {
    fail(
      'Не найден текущий dealOverview.'
    );
  }

  const overviewEnd =
    findMatchingDivEnd(
      app,
      overviewStart
    );

  if (
    overviewEnd < 0 ||
    overviewEnd >
      dealEnd
  ) {
    fail(
      'Не удалось определить конец dealOverview.'
    );
  }

  const overview =
    app.slice(
      overviewStart,
      overviewEnd
    );

  const wrapped =
`{/* PART_V064_O2_COMPACT_OVERVIEW */}
      <details className="dealWorkspaceCOverviewFold">

        <summary>
          <div>
            <strong>
              Параметры сделки
            </strong>

            <span>
              Счёт · поставщики · доставка
            </span>
          </div>

          <b className="dealWorkspaceCFoldArrow">
            ›
          </b>
        </summary>

        <div className="dealWorkspaceCOverviewBody">
          ${overview}
        </div>

      </details>`;

  app =
    app.slice(
      0,
      overviewStart
    ) +
    wrapped +
    app.slice(
      overviewEnd
    );
}

/* =========================================================
   2. CLIENT EDITOR LABEL
   ========================================================= */

if (
  !app.includes(
    'PART_V064_O2_CLIENT_EDITOR_LABEL'
  )
) {
  const clientAnchor =
    app.indexOf(
      'id="dealCClient"'
    );

  if (
    clientAnchor < 0
  ) {
    fail(
      'Не найден dealCClient из O1.'
    );
  }

  const nextClientAnchor =
    app.indexOf(
      '<strong>',
      clientAnchor
    );

  const clientStrongEnd =
    app.indexOf(
      '</strong>',
      nextClientAnchor
    );

  if (
    nextClientAnchor < 0 ||
    clientStrongEnd < 0
  ) {
    fail(
      'Не найден заголовок блока клиента.'
    );
  }

  const strongBlock =
    app.slice(
      nextClientAnchor,
      clientStrongEnd +
        '</strong>'.length
    );

  if (
    !strongBlock.includes(
      'Клиент'
    )
  ) {
    fail(
      'Заголовок блока клиента отличается от ожидаемого.'
    );
  }

  const nextStrong =
`<strong>
            {/* PART_V064_O2_CLIENT_EDITOR_LABEL */}
            Редактирование сделки
          </strong>`;

  app =
    app.slice(
      0,
      nextClientAnchor
    ) +
    nextStrong +
    app.slice(
      clientStrongEnd +
        '</strong>'.length
    );
}

/* =========================================================
   3. SECTION TITLES FOR WORK BLOCKS
   ========================================================= */

function addSectionTitle(
  source,
  id,
  marker,
  title,
) {
  if (
    source.includes(marker)
  ) {
    return source;
  }

  const regex =
    new RegExp(
      '(<div\\s+' +
      'id="' + id + '"' +
      '\\s+' +
      'className="dealCAnchor"' +
      '\\s*>)',
      'g'
    );

  const matches =
    [
      ...source.matchAll(
        regex
      ),
    ];

  if (
    matches.length !== 1
  ) {
    fail(
      'Контейнер ' +
      id +
      ': ожидалось 1 совпадение, найдено ' +
      matches.length
    );
  }

  return source.replace(
    regex,
`$1
        {/* ${marker} */}
        <div className="dealWorkspaceCSectionHead">
          <strong>
            ${title}
          </strong>
        </div>`
  );
}

app =
  addSectionTitle(
    app,
    'dealCInvoice',
    'PART_V064_O2_INVOICE_SECTION_TITLE',
    'Счёт клиенту'
  );

app =
  addSectionTitle(
    app,
    'dealCPayments',
    'PART_V064_O2_PAYMENT_SECTION_TITLE',
    'Оплата клиента'
  );

app =
  addSectionTitle(
    app,
    'dealCIncoming',
    'PART_V064_O2_INCOMING_SECTION_TITLE',
    'Входящие счета'
  );

app =
  addSectionTitle(
    app,
    'dealCDocuments',
    'PART_V064_O2_DOCUMENTS_SECTION_TITLE',
    'Документы сделки'
  );

/* =========================================================
   4. CSS
   ========================================================= */

if (
  !styles.includes(
    'PART_V064_O2_DEAL_C_CLEANUP'
  )
) {
  styles =
    styles.replace(
      /\s*$/,
      ''
    ) +
`


/* PART_V064_O2_DEAL_C_CLEANUP */

.dealWorkspaceCPage {
  padding-bottom: 118px !important;
}

/* Old large dashboard remains available, but no longer duplicates the page. */
.dealWorkspaceCOverviewFold {
  overflow: hidden;
  border:
    1px solid
    var(--bo-line, #3a424b);
  border-radius: 11px;
  background:
    var(--bo-panel, #1b2026);
}

.dealWorkspaceCOverviewFold > summary {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    auto;
  gap: 12px;
  align-items: center;
  min-height: 58px;
  padding: 10px 14px;
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.dealWorkspaceCOverviewFold > summary::-webkit-details-marker {
  display: none;
}

.dealWorkspaceCOverviewFold > summary > div {
  display: grid;
  gap: 2px;
}

.dealWorkspaceCOverviewFold > summary strong {
  font-size: 12px;
  font-weight: 950;
}

.dealWorkspaceCOverviewFold > summary span {
  color:
    var(--bo-muted, #929ca6);
  font-size: 10px;
}

.dealWorkspaceCFoldArrow {
  color:
    var(--bo-muted, #929ca6);
  font-size: 22px;
  line-height: 1;
  transition:
    transform .16s ease;
}

.dealWorkspaceCOverviewFold[open]
.dealWorkspaceCFoldArrow {
  transform:
    rotate(90deg);
}

.dealWorkspaceCOverviewBody {
  border-top:
    1px solid
    var(--bo-line, #3a424b);
  padding: 10px;
}

.dealWorkspaceCOverviewBody
.dealOverview {
  margin: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
}

/* Compact the old metrics when the panel is intentionally opened. */
.dealWorkspaceCOverviewBody
.dealOverviewMetrics,
.dealWorkspaceCOverviewBody
.dealMetrics {
  gap: 7px !important;
}

.dealWorkspaceCOverviewBody
.dealMetric {
  min-height: 74px !important;
  border-radius: 8px !important;
  padding: 10px 11px !important;
}

.dealWorkspaceCOverviewBody
.dealMetric span {
  font-size: 10px !important;
}

.dealWorkspaceCOverviewBody
.dealMetric b {
  font-size: 13px !important;
}

/*
 * Client/address/contact are already visible in the left card.
 * Keep the original editor only when Edit deal is actually opened.
 */
#dealCClient:not(:has(.dealInfoForm)) {
  display: none !important;
}

#dealCClient:has(.dealInfoForm) {
  display: block !important;
  border:
    1px solid
    var(--bo-line, #3a424b);
  border-radius: 11px;
  background:
    var(--bo-panel, #1b2026);
  padding: 13px;
}

#dealCClient:has(.dealInfoForm)
.dealInfoView {
  display: none !important;
}

#dealCClient:has(.dealInfoForm)
.dealInfoHead {
  margin-bottom: 10px;
}

.dealCAnchor {
  display: grid;
  gap: 8px;
}

.dealWorkspaceCSectionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
  padding: 0 2px;
}

.dealWorkspaceCSectionHead strong {
  font-size: 12px;
  font-weight: 950;
}

.dealCAnchor >
.invoiceBlock,
.dealCAnchor >
.paymentBox,
.dealCAnchor >
.purchaseBox,
.dealCAnchor >
.powerBox {
  margin: 0 !important;
}

/* Incoming invoice file-card that already exists in the deal stays compact. */
.dealWorkspaceCMain >
.dealIncomingInvoiceCard {
  border-radius: 11px !important;
  padding: 12px !important;
}

.dealWorkspaceCMain
.dealIncomingSupplierRow {
  border-radius: 8px !important;
}

/* Secondary information should not visually compete with daily work. */
.dealWorkspaceCMain >
.infoBox {
  border-radius: 10px;
}

.dealWorkspaceCMain >
.infoBox > strong {
  font-size: 12px;
}

/* Desktop: give the working column a little more room. */
@media (min-width: 821px) {
  .dealWorkspaceCLayout {
    grid-template-columns:
      300px
      minmax(0, 1fr);
  }

  .dealWorkspaceCSideCard {
    padding: 13px;
  }
}

@media (max-width: 820px) {
  .dealWorkspaceCPage {
    padding-bottom: 98px !important;
  }

  .dealWorkspaceCOverviewFold > summary {
    min-height: 52px;
    padding:
      9px 11px;
  }

  #dealCClient:has(.dealInfoForm) {
    padding: 11px;
  }
}

/* END_PART_V064_O2_DEAL_C_CLEANUP */
`;
}

/* =========================================================
   CHECKS
   ========================================================= */

const checks = [
  [
    app.includes(
      'PART_V064_O2_COMPACT_OVERVIEW'
    ),
    'сводка сворачивается'
  ],
  [
    app.includes(
      'Параметры сделки'
    ),
    'Параметры сделки'
  ],
  [
    app.includes(
      'PART_V064_O2_CLIENT_EDITOR_LABEL'
    ),
    'редактор клиента'
  ],
  [
    app.includes(
      'PART_V064_O2_INVOICE_SECTION_TITLE'
    ),
    'Счёт клиенту'
  ],
  [
    app.includes(
      'PART_V064_O2_PAYMENT_SECTION_TITLE'
    ),
    'Оплата клиента'
  ],
  [
    app.includes(
      'PART_V064_O2_INCOMING_SECTION_TITLE'
    ),
    'Входящие счета'
  ],
  [
    app.includes(
      'PART_V064_O2_DOCUMENTS_SECTION_TITLE'
    ),
    'Документы сделки'
  ],
  [
    styles.includes(
      '#dealCClient:not(:has(.dealInfoForm))'
    ),
    'дубль клиента скрыт'
  ],
  [
    styles.includes(
      'PART_V064_O2_DEAL_C_CLEANUP'
    ),
    'CSS O2'
  ],
];

console.log('');
console.log(
  'v064-O2 — очистка страницы сделки C'
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

let changed = 0;

if (
  save(
    appPath,
    appSource,
    app
  )
) {
  changed++;
}

if (
  save(
    stylesPath,
    stylesSource,
    styles
  )
) {
  changed++;
}

console.log('');
console.log(
  'v064-O2 применён. Изменено файлов: ' +
  changed
);
