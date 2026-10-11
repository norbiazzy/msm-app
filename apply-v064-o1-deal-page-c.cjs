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

const purchasesPath =
  path.join(
    root,
    'frontend',
    'src',
    'PurchasesBlock.tsx'
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
      '.before-v064-o1-' +
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

function replaceOnce(
  text,
  oldValue,
  newValue,
  label,
) {
  const count =
    text.split(oldValue).length -
    1;

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
const purchasesSource =
  read(purchasesPath);
const stylesSource =
  read(stylesPath);

let app =
  appSource.text;

let purchases =
  purchasesSource.text;

let styles =
  stylesSource.text;

/* =========================================================
   REQUIRE CURRENT DEAL PAGE / N2
   ========================================================= */

if (
  !app.includes(
    'function DealDetail('
  )
) {
  fail(
    'Не найден DealDetail'
  );
}

if (
  !app.includes(
    '<PurchasesBlock'
  ) ||
  !app.includes(
    '<PowerOfAttorneyBlock'
  ) ||
  !app.includes(
    '<PaymentBlock'
  )
) {
  fail(
    'Структура текущей страницы сделки отличается от аудита'
  );
}

/* =========================================================
   DEAL DETAIL REGION
   ========================================================= */

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
    'Не удалось определить границы DealDetail'
  );
}

let deal =
  app.slice(
    dealStart,
    dealEnd
  );

if (
  !deal.includes(
    'PART_V064_O1_DEAL_WORKSPACE_C'
  )
) {
  /* Root class */
  deal =
    replaceOnce(
      deal,
      '<section className="content form">',
      '<section className="content form dealWorkspaceCPage">',
      'корневой section DealDetail'
    );

  /*
   * Start layout immediately after the Back button.
   * Existing business blocks stay untouched inside main column.
   */
  const backAnchor =
`      </button>


      <div className="dealOverview">`;

  const layoutStart =
`      </button>

      {/* PART_V064_O1_DEAL_WORKSPACE_C */}
      <div className="dealWorkspaceCLayout">

        <aside className="dealWorkspaceCSidebar">
          <div className="dealWorkspaceCSideCard">

            <div className="dealWorkspaceCDealNo">
              ЗК-{deal.internalNumber}
            </div>

            <div className="dealWorkspaceCClient">
              {deal.clientName}
            </div>

            <div className="dealWorkspaceCAddress">
              {
                deal.deliveryAddresses?.[0] ||
                'Адрес доставки не указан'
              }
            </div>

            <div className="dealWorkspaceCPills">
              {current && (
                <span className="dealWorkspaceCPill dealWorkspaceCPillBlue">
                  {
                    sellerLabels[
                      current.sellerType ||
                      deal.sellerType
                    ]
                  }
                  {' - '}
                  {current.number}
                </span>
              )}

              <span className="dealWorkspaceCPill dealWorkspaceCPillGreen">
                {
                  paymentStatusLabel(
                    deal.paymentStatus
                  )
                }
              </span>

              {
                deal.tasks.filter(
                  (task) =>
                    ![
                      'DONE',
                      'CANCELLED',
                    ].includes(
                      task.status
                    )
                ).length > 0 && (
                  <span className="dealWorkspaceCPill dealWorkspaceCPillYellow">
                    {
                      deal.tasks.filter(
                        (task) =>
                          ![
                            'DONE',
                            'CANCELLED',
                          ].includes(
                            task.status
                          )
                      ).length
                    }
                    {' '}
                    {
                      deal.tasks.filter(
                        (task) =>
                          ![
                            'DONE',
                            'CANCELLED',
                          ].includes(
                            task.status
                          )
                      ).length === 1
                        ? 'задача'
                        : 'задачи'
                    }
                  </span>
                )
              }
            </div>

            <div className="dealWorkspaceCActions">

              <button
                type="button"
                className="primary"
                onClick={() =>
                  document
                    .getElementById(
                      'dealCInvoice'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                }
              >
                Счёт
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  document
                    .getElementById(
                      'dealCPayments'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                }
              >
                Оплата клиента
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  document
                    .getElementById(
                      'dealCIncoming'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                }
              >
                Входящие счета
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  document
                    .getElementById(
                      'dealCDocuments'
                    )
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                }
              >
                Доверенность / ЭТРН
              </button>

              {canManageDeal && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setDealInfoOpen(true);

                    window.setTimeout(
                      () =>
                        document
                          .getElementById(
                            'dealCClient'
                          )
                          ?.scrollIntoView({
                            behavior:
                              'smooth',
                            block:
                              'start',
                          }),
                      0
                    );
                  }}
                >
                  Редактировать сделку
                </button>
              )}

            </div>

            <div className="dealWorkspaceCSubhead">
              Контакт на объекте
            </div>

            <div className="dealWorkspaceCContact">
              <strong>
                {
                  deal.contactName ||
                  'Не указан'
                }
              </strong>

              <span>
                {
                  deal.clientPhone ||
                  'Телефон не указан'
                }
              </span>
            </div>

            <div className="dealWorkspaceCSubhead">
              Финансы
            </div>

            <div className="dealWorkspaceCFinance">

              <div>
                <span>
                  Сумма сделки
                </span>
                <b>
                  {
                    current?.amount
                      ? money(
                          current.amount
                        )
                      : '—'
                  }
                </b>
              </div>

              <div>
                <span>
                  Получено от клиента
                </span>
                <b>
                  {
                    money(
                      (
                        deal.clientPayments ||
                        []
                      ).reduce(
                        (
                          sum,
                          payment,
                        ) =>
                          sum +
                          Number(
                            payment.amount ||
                            0
                          ),
                        0
                      )
                    )
                  }
                </b>
              </div>

              <div>
                <span>
                  Входящие счета
                </span>
                <b>
                  {
                    incomingTotal > 0
                      ? money(
                          incomingTotal
                        )
                      : '—'
                  }
                </b>
              </div>

            </div>

          </div>
        </aside>

        <div className="dealWorkspaceCMain">

          <div className="dealWorkspaceCAttention">

            <div className="dealWorkspaceCSectionTitle">
              Сейчас требует внимания
            </div>

            {
              deal.tasks.filter(
                (task) =>
                  ![
                    'DONE',
                    'CANCELLED',
                  ].includes(
                    task.status
                  )
              ).length > 0 ? (

              <div className="dealWorkspaceCAttentionList">
                {
                  deal.tasks
                    .filter(
                      (task) =>
                        ![
                          'DONE',
                          'CANCELLED',
                        ].includes(
                          task.status
                        )
                    )
                    .slice(0, 3)
                    .map(
                      (task) => (
                        <a
                          className="dealWorkspaceCAttentionRow"
                          key={task.id}
                          href={
                            '#tasks/' +
                            encodeURIComponent(
                              task.id
                            )
                          }
                        >
                          <div>
                            <strong>
                              {task.title}
                            </strong>

                            <span>
                              {
                                task.status ===
                                  'NEED_DATA'
                                  ? 'Нужно исправить'
                                  : taskStatus(
                                      task.status
                                    )
                              }
                            </span>
                          </div>

                          <b>→</b>
                        </a>
                      )
                    )
                }
              </div>

            ) : (

              <div className="dealWorkspaceCQuiet">
                Активных задач нет
              </div>

            )}
          </div>


      <div className="dealOverview">`;

  deal =
    replaceOnce(
      deal,
      backAnchor,
      layoutStart,
      'начало layout варианта C'
    );

  /* Client edit anchor. */
  const clientLabel =
`          <strong>
            Клиент
          </strong>`;

  const clientLabelAt =
    deal.indexOf(
      clientLabel
    );

  if (clientLabelAt < 0) {
    fail(
      'Не найден блок Клиент'
    );
  }

  const clientBoxAt =
    deal.lastIndexOf(
      '<div className="dealInfoBox">',
      clientLabelAt
    );

  if (clientBoxAt < 0) {
    fail(
      'Не найден контейнер блока Клиент'
    );
  }

  deal =
    deal.slice(
      0,
      clientBoxAt
    ) +
    '<div id="dealCClient" className="dealInfoBox dealCAnchor">' +
    deal.slice(
      clientBoxAt +
      '<div className="dealInfoBox">'.length
    );

  /* Current invoice anchor. */
  const invoiceStart =
`      {current ? (

        <InvoiceBlock`;

  const invoiceEnd =
`      )}


      {!current &&
        canManageDeal && (`;

  if (
    !deal.includes(
      invoiceStart
    ) ||
    !deal.includes(
      invoiceEnd
    )
  ) {
    fail(
      'Не найден блок актуального счёта'
    );
  }

  deal =
    deal.replace(
      invoiceStart,
`      <div
        id="dealCInvoice"
        className="dealCAnchor"
      >
      {current ? (

        <InvoiceBlock`
    );

  deal =
    deal.replace(
      invoiceEnd,
`      )}
      </div>


      {!current &&
        canManageDeal && (`
    );

  /* Payment / incoming / documents anchors. */
  const paymentBlock =
`      <PaymentBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />`;

  deal =
    replaceOnce(
      deal,
      paymentBlock,
`      <div
        id="dealCPayments"
        className="dealCAnchor"
      >
${paymentBlock}
      </div>`,
      'PaymentBlock'
    );

  const purchasesBlock =
`      <PurchasesBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />`;

  deal =
    replaceOnce(
      deal,
      purchasesBlock,
`      <div
        id="dealCIncoming"
        className="dealCAnchor"
      >
${purchasesBlock}
      </div>`,
      'PurchasesBlock'
    );

  const poaBlock =
`      <PowerOfAttorneyBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />`;

  deal =
    replaceOnce(
      deal,
      poaBlock,
`      <div
        id="dealCDocuments"
        className="dealCAnchor"
      >
${poaBlock}
      </div>`,
      'PowerOfAttorneyBlock'
    );

  /* History title = approved wording. */
  if (
    deal.includes(
      '            Последние события'
    )
  ) {
    deal =
      deal.replace(
        '            Последние события',
        '            Лента сделки'
      );
  }

  /* Close main + layout before section. */
  const sectionClose =
`      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </section>`;

  const sectionCloseNext =
`      {error && (

        <div className="error">
          {error}
        </div>

      )}

        </div>
      </div>

    </section>`;

  deal =
    replaceOnce(
      deal,
      sectionClose,
      sectionCloseNext,
      'закрытие layout варианта C'
    );

  app =
    app.slice(
      0,
      dealStart
    ) +
    deal +
    app.slice(
      dealEnd
    );
}

/* =========================================================
   RENAME PURCHASES -> INCOMING INVOICES
   ========================================================= */

if (
  !purchases.includes(
    'PART_V064_O1_INCOMING_TITLE'
  )
) {
  const titleOld =
`          <span>
            Закупка
          </span>

          <strong>
            Поставщики
          </strong>`;

  const titleNext =
`          {/* PART_V064_O1_INCOMING_TITLE */}
          <span>
            Входящие счета
          </span>

          <strong>
            Поставщики
          </strong>`;

  purchases =
    replaceOnce(
      purchases,
      titleOld,
      titleNext,
      'заголовок PurchasesBlock'
    );
}

/* Deal page wording. */
app =
  app
    .replace(
      "'Добавлена закупка'",
      "'Добавлен входящий счёт'"
    )
    .replace(
      "'Изменены данные закупки'",
      "'Изменены данные входящего счёта'"
    )
    .replace(
      'измените нужную закупку в блоке «Поставщики».',
      'измените нужный входящий счёт в блоке «Входящие счета».'
    )
    .replace(
      'Сначала добавьте поставщика и сумму закупки.',
      'Сначала добавьте поставщика и сумму входящего счёта.'
    );

/* =========================================================
   CSS — variant C
   ========================================================= */

if (
  !styles.includes(
    'PART_V064_O1_DEAL_WORKSPACE_C'
  )
) {
  styles =
    styles.replace(
      /\s*$/,
      ''
    ) +
`


/* PART_V064_O1_DEAL_WORKSPACE_C */

.boView-deal.boShell {
  max-width: 1180px !important;
}

.dealWorkspaceCPage {
  gap: 12px;
}

.dealWorkspaceCLayout {
  display: grid;
  grid-template-columns:
    320px
    minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.dealWorkspaceCSidebar {
  position: sticky;
  top: 88px;
  min-width: 0;
}

.dealWorkspaceCSideCard {
  display: grid;
  gap: 0;
  border:
    1px solid
    var(--bo-line, #d8dde3);
  border-radius: 12px;
  background:
    var(--bo-panel, #fff);
  padding: 14px;
  box-shadow:
    0 8px 22px
    rgba(0,0,0,.05);
}

.dealWorkspaceCDealNo {
  color:
    var(--bo-muted, #78828c);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .07em;
  text-transform: uppercase;
}

.dealWorkspaceCClient {
  margin-top: 4px;
  overflow-wrap: anywhere;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.15;
}

.dealWorkspaceCAddress {
  margin-top: 5px;
  color:
    var(--bo-muted, #78828c);
  font-size: 11px;
  line-height: 1.35;
}

.dealWorkspaceCPills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.dealWorkspaceCPill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border:
    1px solid
    var(--bo-line, #d8dde3);
  border-radius: 999px;
  background:
    var(--bo-panel-2, #f4f6f8);
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 900;
}

.dealWorkspaceCPillBlue {
  color:
    var(--bo-blue, #5e7f9f);
}

.dealWorkspaceCPillGreen {
  color:
    var(--bo-green, #62885a);
}

.dealWorkspaceCPillYellow {
  color:
    var(--bo-yellow, #9b7830);
}

.dealWorkspaceCActions {
  display: grid;
  gap: 6px;
  margin-top: 13px;
}

.dealWorkspaceCActions > button {
  width: 100%;
  min-height: 39px;
  border-radius: 7px;
  padding: 8px 10px;
  text-align: left;
  font-size: 11px;
}

.dealWorkspaceCSubhead {
  margin-top: 16px;
  padding-top: 13px;
  border-top:
    1px solid
    var(--bo-line, #d8dde3);
  font-size: 11px;
  font-weight: 950;
}

.dealWorkspaceCContact {
  display: grid;
  gap: 2px;
  margin-top: 7px;
}

.dealWorkspaceCContact strong {
  font-size: 12px;
}

.dealWorkspaceCContact span {
  color:
    var(--bo-muted, #78828c);
  font-size: 11px;
}

.dealWorkspaceCFinance {
  display: grid;
  margin-top: 5px;
}

.dealWorkspaceCFinance > div {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    auto;
  gap: 10px;
  align-items: center;
  min-height: 37px;
  border-bottom:
    1px solid
    var(--bo-line, #d8dde3);
}

.dealWorkspaceCFinance > div:last-child {
  border-bottom: 0;
}

.dealWorkspaceCFinance span {
  color:
    var(--bo-muted, #78828c);
  font-size: 10px;
}

.dealWorkspaceCFinance b {
  font-size: 11px;
  white-space: nowrap;
}

.dealWorkspaceCMain {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.dealWorkspaceCAttention {
  display: grid;
  gap: 8px;
  border:
    1px solid
    var(--bo-line, #d8dde3);
  border-radius: 12px;
  background:
    var(--bo-panel, #fff);
  padding: 13px;
}

.dealWorkspaceCSectionTitle {
  font-size: 12px;
  font-weight: 950;
}

.dealWorkspaceCAttentionList {
  display: grid;
  gap: 6px;
}

.dealWorkspaceCAttentionRow {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    auto;
  gap: 10px;
  align-items: center;
  border:
    1px solid
    var(--bo-line, #d8dde3);
  border-left:
    4px solid
    var(--bo-yellow, #b49247);
  border-radius: 8px;
  background:
    var(--bo-panel-2, #f4f6f8);
  color: inherit;
  padding: 9px 10px;
  text-decoration: none;
}

.dealWorkspaceCAttentionRow > div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.dealWorkspaceCAttentionRow strong {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dealWorkspaceCAttentionRow span {
  color:
    var(--bo-muted, #78828c);
  font-size: 10px;
}

.dealWorkspaceCAttentionRow > b {
  color:
    var(--bo-muted, #78828c);
}

.dealWorkspaceCQuiet {
  color:
    var(--bo-muted, #78828c);
  font-size: 11px;
}

.dealCAnchor {
  scroll-margin-top: 92px;
}

.dealWorkspaceCMain > .dealOverview,
.dealWorkspaceCMain > .dealIncomingInvoiceCard,
.dealWorkspaceCMain > .dealInfoBox,
.dealWorkspaceCMain > .invoiceBlock,
.dealWorkspaceCMain > .paymentBox,
.dealWorkspaceCMain > .purchaseBox,
.dealWorkspaceCMain > .powerBox,
.dealWorkspaceCMain > .infoBox,
.dealCAnchor > .paymentBox,
.dealCAnchor > .purchaseBox,
.dealCAnchor > .powerBox,
.dealCAnchor > .invoiceBlock {
  margin: 0;
}

.dealWorkspaceCMain .historyList {
  margin-top: 8px;
}

.dealWorkspaceCMain .historyList > div {
  grid-template-columns:
    115px
    minmax(0, 1fr);
}

@media (max-width: 820px) {
  .boView-deal.boShell {
    max-width: 760px !important;
  }

  .dealWorkspaceCLayout {
    grid-template-columns: 1fr;
  }

  .dealWorkspaceCSidebar {
    position: static;
  }

  .dealWorkspaceCSideCard {
    padding: 12px;
  }

  .dealWorkspaceCActions {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .dealWorkspaceCActions > button {
    text-align: center;
  }
}

@media (max-width: 520px) {
  .dealWorkspaceCActions {
    grid-template-columns: 1fr;
  }

  .dealWorkspaceCClient {
    font-size: 18px;
  }

  .dealWorkspaceCMain .historyList > div {
    grid-template-columns: 1fr;
  }
}

/* END_PART_V064_O1_DEAL_WORKSPACE_C */
`;
}

/* =========================================================
   CHECK
   ========================================================= */

const finalDealStart =
  app.indexOf(
    'function DealDetail('
  );

const finalDealEnd =
  app.indexOf(
    '\nfunction InvoiceBlock(',
    finalDealStart
  );

const finalDeal =
  app.slice(
    finalDealStart,
    finalDealEnd
  );

const checks = [
  [
    finalDeal.includes(
      'PART_V064_O1_DEAL_WORKSPACE_C'
    ),
    'layout C'
  ],
  [
    finalDeal.includes(
      'dealWorkspaceCSidebar'
    ),
    'левая карточка'
  ],
  [
    finalDeal.includes(
      'Сейчас требует внимания'
    ),
    'внимание'
  ],
  [
    finalDeal.includes(
      'Входящие счета'
    ),
    'входящие счета'
  ],
  [
    finalDeal.includes(
      'Получено от клиента'
    ),
    'получено от клиента'
  ],
  [
    !finalDeal.includes(
      '>Маржа<'
    ),
    'маржа не добавлена'
  ],
  [
    purchases.includes(
      'PART_V064_O1_INCOMING_TITLE'
    ),
    'PurchasesBlock переименован'
  ],
  [
    styles.includes(
      'PART_V064_O1_DEAL_WORKSPACE_C'
    ),
    'CSS'
  ],
];

console.log('');
console.log(
  'v064-O1 — страница сделки · вариант C'
);
console.log(
  '===================================='
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
) changed++;

if (
  save(
    purchasesPath,
    purchasesSource,
    purchases
  )
) changed++;

if (
  save(
    stylesPath,
    stylesSource,
    styles
  )
) changed++;

console.log('');
console.log(
  'v064-O1 применён. Изменено файлов: ' +
  changed
);
