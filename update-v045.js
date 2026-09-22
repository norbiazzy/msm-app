const fs = require('fs');

const appPath =
  'frontend/src/App.tsx';

const apiPath =
  'frontend/src/api.ts';

const invoiceControllerPath =
  'backend/src/invoices/invoices.controller.ts';

const invoiceServicePath =
  'backend/src/invoices/invoices.service.ts';

const purchasesPath =
  'frontend/src/PurchasesBlock.tsx';

const activityPath =
  'frontend/src/RecentActivityPanel.tsx';

const cssPath =
  'frontend/src/styles.css';


for (const file of [
  appPath,
  apiPath,
  invoiceControllerPath,
  invoiceServicePath,
  purchasesPath,
  cssPath,
]) {

  if (!fs.existsSync(file)) {

    console.error(
      'Missing: ' + file
    );

    process.exit(1);
  }


  const backup =
    file + '.bak-v045';


  if (!fs.existsSync(backup)) {

    fs.copyFileSync(
      file,
      backup
    );
  }
}


// ======================================================
// BACKEND: MANAGER CAN CHANGE CURRENT INVOICE AMOUNT
// ======================================================

let controller =
  fs.readFileSync(
    invoiceControllerPath,
    'utf8'
  );


if (
  !controller.includes(
    "':invoiceId/amount'"
  )
) {

  const confirmMarker =
    "  @Patch(':invoiceId/confirm')";


  const endpoint =
`  @Patch(':invoiceId/amount')
  updateAmount(
    @Param('dealId')
    dealId: string,

    @Param('invoiceId')
    invoiceId: string,

    @Body()
    body: {
      amount?: number;
      actorId: string;
    },
  ) {

    return this.invoices
      .updateAmount(
        dealId,
        invoiceId,
        body,
      );
  }


`;


  if (
    !controller.includes(
      confirmMarker
    )
  ) {

    console.error(
      'Invoice confirm endpoint not found'
    );

    process.exit(1);
  }


  controller =
    controller.replace(
      confirmMarker,
      endpoint +
      confirmMarker
    );
}


fs.writeFileSync(
  invoiceControllerPath,
  controller,
  'utf8'
);


// ======================================================
// INVOICE SERVICE
// ======================================================

let invoiceService =
  fs.readFileSync(
    invoiceServicePath,
    'utf8'
  );


if (
  !invoiceService.includes(
    'async updateAmount('
  )
) {

  const confirmMarker =
    '  async confirm(';


  const method =
`  async updateAmount(
    dealId: string,
    invoiceId: string,

    body: {
      amount?: number;
      actorId: string;
    },
  ) {

    const invoice =
      await this.prisma
        .clientInvoice
        .findFirstOrThrow({

          where: {
            id: invoiceId,
            dealId,
          },
        });


    if (!invoice.isCurrent) {

      throw new BadRequestException(
        'Изменить сумму можно только у актуальной версии счёта',
      );
    }


    const updated =
      await this.prisma
        .clientInvoice
        .update({

          where: {
            id: invoiceId,
          },

          data: {
            amount:
              body.amount ??
              null,
          },
        });


    await this.prisma
      .auditEvent
      .create({

        data: {

          dealId,

          actorId:
            body.actorId,

          action:
            'INVOICE_AMOUNT_CHANGED',

          entityType:
            'ClientInvoice',

          entityId:
            invoiceId,

          oldValue: {
            amount:
              invoice.amount
                ?.toString() ??
              null,
          },

          newValue: {
            amount:
              updated.amount
                ?.toString() ??
              null,

            number:
              invoice.number,

            version:
              invoice.version,
          },
        },
      });


    return updated;
  }


`;


  if (
    !invoiceService.includes(
      confirmMarker
    )
  ) {

    console.error(
      'InvoicesService confirm() not found'
    );

    process.exit(1);
  }


  invoiceService =
    invoiceService.replace(
      confirmMarker,
      method +
      confirmMarker
    );
}


fs.writeFileSync(
  invoiceServicePath,
  invoiceService,
  'utf8'
);


// ======================================================
// FRONTEND API
// ======================================================

let api =
  fs.readFileSync(
    apiPath,
    'utf8'
  );


if (
  !api.includes(
    'updateInvoiceAmount'
  )
) {

  const marker =
    'export async function confirmInvoice(';


  const fn =
`export async function updateInvoiceAmount(
  dealId: string,
  invoiceId: string,

  payload: {
    amount?: number;
    actorId: string;
  },
) {

  return json(
    \`/deals/\${dealId}/invoices/\${invoiceId}/amount\`,
    {
      method: 'PATCH',
      body: JSON.stringify(
        payload
      ),
    },
  );
}


`;


  if (
    !api.includes(marker)
  ) {

    console.error(
      'confirmInvoice() not found'
    );

    process.exit(1);
  }


  api =
    api.replace(
      marker,
      fn +
      marker
    );
}


fs.writeFileSync(
  apiPath,
  api,
  'utf8'
);


// ======================================================
// APP IMPORTS
// ======================================================

let app =
  fs.readFileSync(
    appPath,
    'utf8'
  );


if (
  !app.includes(
    "import { updateInvoiceAmount } from './api';"
  ) &&
  !app.includes(
    'updateInvoiceAmount,'
  )
) {

  app =
`import {
  updateInvoiceAmount,
} from './api';

` +
    app;
}


if (
  !app.includes(
    "from './MultiFilePicker'"
  )
) {

  app =
`import {
  MultiFilePicker,
} from './MultiFilePicker';

` +
    app;
}


// ======================================================
// DEAL DETAIL
// ======================================================

const dealStart =
  app.indexOf(
    'function DealDetail('
  );

const invoiceBlockStart =
  app.indexOf(
    'function InvoiceBlock(',
    dealStart
  );


if (
  dealStart === -1 ||
  invoiceBlockStart === -1
) {

  console.error(
    'DealDetail not found'
  );

  process.exit(1);
}


const newDealDetail =
`function DealDetail({
  dealId,
  user,
  onBack,
}: {
  dealId: string;
  user: CurrentUser;
  onBack: () => void;
}) {

  const [deal, setDeal] =
    useState<Deal | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    correctionOpen,
    setCorrectionOpen,
  ] = useState(false);

  const [
    correction,
    setCorrection,
  ] = useState('');

  const [
    correctionFiles,
    setCorrectionFiles,
  ] = useState<File[]>([]);

  const [urgent, setUrgent] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    managerAmount,
    setManagerAmount,
  ] = useState('');


  async function reload(
    showLoading = true,
  ) {

    if (showLoading) {
      setLoading(true);
    }


    try {

      const next =
        await getDeal(
          dealId
        );


      setDeal(next);
      setError('');


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      if (showLoading) {
        setLoading(false);
      }
    }
  }


  useEffect(
    () => {

      void reload(true);

    },
    [dealId],
  );


  useEffect(
    () => {

      if (!deal) {
        return;
      }


      const currentInvoice =
        deal.invoices.find(
          (invoice) =>
            invoice.isCurrent
        ) ??
        deal.invoices[0];


      setManagerAmount(
        currentInvoice?.amount
          ? String(
              currentInvoice.amount
            )
          : ''
      );

    },
    [deal],
  );


  if (loading) {

    return (

      <section className="content">

        <div className="empty">
          Загрузка сделки…
        </div>

      </section>
    );
  }


  if (!deal) {

    return (

      <section className="content">

        <div className="error">
          {
            error ||
            'Сделка не найдена'
          }
        </div>

      </section>
    );
  }


  const current =
    deal.invoices.find(
      (invoice) =>
        invoice.isCurrent
    ) ??
    deal.invoices[0];


  const canManageInvoice =
    Boolean(current) &&
    [
      'MANAGER',
      'LEADER',
      'ADMIN',
    ].includes(
      user.role
    );


  const canConfirm =
    canManageInvoice &&
    current?.status ===
      'WAITING_MANAGER_REVIEW';


  const canCorrect =
    canManageInvoice &&
    (
      current?.status ===
        'WAITING_MANAGER_REVIEW' ||

      current?.status ===
        'CONFIRMED'
    );


  function parsedManagerAmount() {

    return parseMoneyInput(
      managerAmount
    );
  }


  async function saveAmount() {

    if (!current) {
      return;
    }


    const parsed =
      parsedManagerAmount();


    if (
      managerAmount.trim() &&
      parsed === undefined
    ) {

      setError(
        'Проверьте сумму счёта'
      );

      return;
    }


    setSaving(true);
    setError('');


    try {

      await updateInvoiceAmount(
        dealId,
        current.id,
        {
          amount: parsed,
          actorId: user.id,
        },
      );


      await reload(false);


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  async function confirm() {

    if (!current) {
      return;
    }


    const parsed =
      parsedManagerAmount();


    if (
      managerAmount.trim() &&
      parsed === undefined
    ) {

      setError(
        'Проверьте сумму счёта'
      );

      return;
    }


    setSaving(true);
    setError('');


    try {

      const currentAmount =
        current.amount ===
          undefined ||
        current.amount === null

          ? undefined

          : Number(
              current.amount
            );


      if (
        parsed !== undefined &&
        (
          currentAmount ===
            undefined ||

          Math.abs(
            currentAmount -
            parsed
          ) > 0.001
        )
      ) {

        await updateInvoiceAmount(
          dealId,
          current.id,
          {
            amount: parsed,
            actorId: user.id,
          },
        );
      }


      await confirmInvoice(
        dealId,
        current.id,
        user.id,
      );


      await reload(false);


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  async function sendCorrection() {

    if (!current) {
      return;
    }


    const correctionText =
      correction.trim() ||
      (
        correctionFiles.length > 0
          ? 'Приложен новый входящий счёт'
          : ''
      );


    if (!correctionText) {
      return;
    }


    setSaving(true);
    setError('');


    try {

      const task:
        any =
        await requestInvoiceCorrection(
          dealId,
          current.id,
          {
            actorId:
              user.id,

            comment:
              correctionText,

            urgent,
          },
        );


      const filesToUpload =
        [...correctionFiles];


      if (
        filesToUpload.length > 0
      ) {

        startBackgroundUploadJob({

          taskId:
            task.id,

          title:
            'Отправляем документы на корректировку',

          subtitle:
            deal.clientName,

          files:
            filesToUpload,


          run:
            async ({
              upload,
              setProgress,
            }) => {

              for (
                let index = 0;
                index <
                  filesToUpload.length;
                index++
              ) {

                await upload(
                  deal.id,

                  filesToUpload[
                    index
                  ],

                  'CORRECTION_TASK_' +
                  task.id,

                  index,

                  filesToUpload.length,
                );
              }


              setProgress(99);
            },
        });
      }


      setCorrection('');
      setCorrectionFiles([]);
      setUrgent(false);
      setCorrectionOpen(false);


      await reload(false);


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  return (

    <section className="content form">

      <button
        className="backLink"
        onClick={onBack}
      >
        ← К сделкам
      </button>


      <div className="detailHero">

        <div className="eyebrow">
          ЗК-{deal.internalNumber}
        </div>


        <h2>

          {
            current
              ? sellerLabels[
                  deal.sellerType
                ] +
                '-' +
                current.number

              : 'ЗК-' +
                deal.internalNumber
          }

        </h2>


        <p>
          {deal.clientName}
        </p>


        <div className="statusPill">

          {
            current
              ? statusLabel(
                  current.status
                )
              : 'Ожидаем счёт'
          }

        </div>

      </div>


      {current ? (

        <InvoiceBlock
          invoice={current}
          sellerType={
            deal.sellerType
          }
        />

      ) : (

        <div className="infoBox">

          <strong>
            Счёт ещё не готов
          </strong>

          <p>
            Бухгалтерия пока не
            загрузила клиентский счёт.
          </p>

        </div>

      )}


      {canManageInvoice &&
        current && (

        <div className="managerInvoiceAmount">

          <div>

            <span>
              Сумма счёта
            </span>

            <strong>
              {
                current.amount
                  ? money(
                      current.amount
                    )
                  : 'Бухгалтерия не указала'
              }
            </strong>

          </div>


          <div className="managerAmountEdit">

            <input
              inputMode="decimal"

              value={managerAmount}

              onChange={(e) =>
                setManagerAmount(
                  e.target.value
                )
              }

              placeholder="Введите сумму"
            />


            <button
              type="button"
              className="secondary"

              disabled={saving}

              onClick={saveAmount}
            >
              Сохранить сумму
            </button>

          </div>

        </div>

      )}


      {canCorrect &&
        current && (

        <div className="reviewBox">

          <strong>

            {
              current.status ===
                'CONFIRMED'

                ? 'Счёт подтверждён'
                : 'Проверьте готовый счёт'
            }

          </strong>


          <p>

            {
              current.status ===
                'CONFIRMED'

                ? 'Если позже обнаружилась ошибка, счёт всё равно можно отправить на корректировку.'

                : current.amount

                  ? 'Проверьте счёт и сумму. При необходимости сумму можно изменить самостоятельно.'

                  : 'Бухгалтерия не указала сумму. Введите её выше самостоятельно либо отправьте счёт на корректировку.'
            }

          </p>


          <div
            className={
              canConfirm
                ? 'actions'
                : 'actions singleAction'
            }
          >

            <button
              className="secondary"

              disabled={saving}

              onClick={() =>
                setCorrectionOpen(
                  (value) =>
                    !value
                )
              }
            >
              Скорректировать
            </button>


            {canConfirm && (

              <button
                className="primary"

                disabled={saving}

                onClick={confirm}
              >

                {
                  saving
                    ? 'Сохраняем…'
                    : 'Всё верно'
                }

              </button>

            )}

          </div>

        </div>

      )}


      {current?.status ===
        'CORRECTION_REQUESTED' && (

        <div className="infoBox correctionPending">

          <strong>
            Счёт отправлен на корректировку
          </strong>

          <p>
            Текущая версия остаётся
            видна в истории, но после
            загрузки новой версии станет
            неактуальной.
          </p>

        </div>

      )}


      {correctionOpen &&
        current && (

        <div className="correctionBox">

          <Field title="Что нужно изменить">

            <textarea
              rows={4}

              value={correction}

              onChange={(e) =>
                setCorrection(
                  e.target.value
                )
              }

              placeholder="Например: изменить количество или стоимость"
            />

          </Field>


          <Field title="Новый входящий счёт / документы">

            <MultiFilePicker
              files={correctionFiles}
              onChange={
                setCorrectionFiles
              }
              title="+ Прикрепить документы"
            />

          </Field>


          <label className="urgentToggle">

            <input
              type="checkbox"

              checked={urgent}

              onChange={(e) =>
                setUrgent(
                  e.target.checked
                )
              }
            />

            <span>
              Срочная корректировка
            </span>

          </label>


          <button
            className="primary wide"
            disabled={
              saving ||
              (
                !correction.trim() &&
                correctionFiles.length ===
                  0
              )
            }

            onClick={sendCorrection}
          >

            {
              saving
                ? 'Отправляем…'
                : 'Отправить бухгалтерии'
            }

          </button>

        </div>

      )}


      <PaymentBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />


      <PurchasesBlock
        deal={deal}
        user={user}
        onChanged={() =>
          reload(false)
        }
      />


      <div className="infoBox">

        <strong>
          Исходный запрос
        </strong>

        <p>
          {
            deal.requestText ||
            'Не указан'
          }
        </p>

        {deal.accountingComment && (

          <p>

            <b>
              Комментарий бухгалтерии:
            </b>

            {' '}

            {deal.accountingComment}

          </p>

        )}

      </div>


      {deal.invoices.length > 0 && (

        <div className="infoBox">

          <strong>
            Версии счёта
          </strong>


          <div className="versionList">

            {[...deal.invoices]
              .sort(
                (a, b) =>
                  Number(
                    b.version || 0
                  ) -
                  Number(
                    a.version || 0
                  )
              )
              .map(
                (invoice) => (

                <InvoiceVersion
                  key={invoice.id}
                  invoice={invoice}
                  sellerType={
                    deal.sellerType
                  }
                />

              ))}

          </div>

        </div>

      )}


      {deal.auditEvents &&
        deal.auditEvents.length >
          0 && (

        <div className="infoBox">

          <strong>
            Последние события
          </strong>


          <div className="historyList">

            {deal.auditEvents
              .slice(0, 12)
              .map(
                (event) => (

                <div key={event.id}>

                  <span>
                    {
                      new Date(
                        event.createdAt
                      )
                        .toLocaleString(
                          'ru-RU'
                        )
                    }
                  </span>


                  <b>
                    {
                      auditLabel(
                        event.action
                      )
                    }
                  </b>


                  {event.reason && (

                    <em>
                      {event.reason}
                    </em>

                  )}

                </div>

              ))}

          </div>

        </div>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </section>
  );
}


`;


app =
  app.slice(
    0,
    dealStart
  ) +
  newDealDetail +
  app.slice(
    invoiceBlockStart
  );


// ======================================================
// INVOICE BLOCK
// ======================================================

const blockStart =
  app.indexOf(
    'function InvoiceBlock('
  );

const versionStart =
  app.indexOf(
    'function InvoiceVersion(',
    blockStart
  );


if (
  blockStart === -1 ||
  versionStart === -1
) {

  console.error(
    'InvoiceBlock not found'
  );

  process.exit(1);
}


const invoiceBlock =
`function InvoiceBlock({
  invoice,
  sellerType,
}: {
  invoice: Invoice;
  sellerType: SellerType;
}) {

  return (

    <div className="invoiceBlock">

      <div className="currentVersionLabel">
        Версия {invoice.version || 1}
        {' · '}
        Текущая
      </div>


      <div>

        <span>
          Счёт
        </span>

        <strong>
          {
            sellerLabels[
              sellerType
            ]
          }-{invoice.number}
        </strong>

      </div>


      <div>

        <span>
          Сумма
        </span>

        <strong>
          {
            invoice.amount
              ? money(
                  invoice.amount
                )
              : 'не указана'
          }
        </strong>

      </div>


      <div>

        <span>
          Дата
        </span>

        <strong>

          {
            invoice.invoiceDate

              ? new Date(
                  invoice.invoiceDate
                )
                  .toLocaleDateString(
                    'ru-RU'
                  )

              : 'не указана'
          }

        </strong>

      </div>


      {invoice.fileId && (

        <a
          className="fileButton"

          href={
            dealFileUrl(
              invoice.fileId
            )
          }

          target="_blank"
          rel="noreferrer"
        >
          Открыть PDF
        </a>

      )}

    </div>
  );
}


`;


app =
  app.slice(
    0,
    blockStart
  ) +
  invoiceBlock +
  app.slice(
    versionStart
  );


// ======================================================
// VERSION HISTORY
// ======================================================

const versionFunctionStart =
  app.indexOf(
    'function InvoiceVersion('
  );

const paymentBlockStart =
  app.indexOf(
    'function PaymentBlock(',
    versionFunctionStart
  );


if (
  versionFunctionStart === -1 ||
  paymentBlockStart === -1
) {

  console.error(
    'InvoiceVersion not found'
  );

  process.exit(1);
}


const invoiceVersion =
`function InvoiceVersion({
  invoice,
  sellerType,
}: {
  invoice: Invoice;
  sellerType: SellerType;
}) {

  let stateLabel =
    'Не актуален';


  if (invoice.isCurrent) {

    if (
      invoice.status ===
      'CONFIRMED'
    ) {

      stateLabel =
        'Текущая · подтверждён';

    } else if (
      invoice.status ===
      'CORRECTION_REQUESTED'
    ) {

      stateLabel =
        'Текущая · на корректировке';

    } else {

      stateLabel =
        'Текущая · ожидает проверки';
    }

  } else if (
    invoice.status ===
    'CORRECTION_REQUESTED'
  ) {

    stateLabel =
      'Скорректирован · не актуален';
  }


  return (

    <div
      className={
        'invoiceVersionRow ' +
        (
          invoice.isCurrent
            ? 'invoiceVersionCurrent'
            : 'invoiceVersionOld'
        )
      }
    >

      <div className="invoiceVersionMain">

        <div className="invoiceVersionTitle">

          <b>
            Версия {invoice.version || 1}
          </b>


          <span
            className={
              invoice.isCurrent
                ? 'invoiceVersionBadge current'
                : 'invoiceVersionBadge old'
            }
          >
            {stateLabel}
          </span>

        </div>


        <strong>
          {
            sellerLabels[
              sellerType
            ]
          }-{invoice.number}
        </strong>


        <span>

          {
            invoice.amount
              ? money(
                  invoice.amount
                )
              : 'Сумма не указана'
          }

          {' · '}

          {
            invoice.invoiceDate

              ? new Date(
                  invoice.invoiceDate
                )
                  .toLocaleDateString(
                    'ru-RU'
                  )

              : 'дата не указана'
          }

        </span>

      </div>


      {invoice.fileId && (

        <a
          href={
            dealFileUrl(
              invoice.fileId
            )
          }

          target="_blank"
          rel="noreferrer"
        >
          Открыть
        </a>

      )}

    </div>
  );
}


`;


app =
  app.slice(
    0,
    versionFunctionStart
  ) +
  invoiceVersion +
  app.slice(
    paymentBlockStart
  );


// ======================================================
// CORRECTION ATTACHMENTS FOR ACCOUNTANT
// ======================================================

app =
  app.replace(

    /const incomingFiles\s*=\s*task\.deal\.files\s*\|\|\s*\[\];/,

`const incomingFiles =
    (
      task.deal.files || []
    ).filter(
      (file) => {

        if (
          task.type ===
          'CORRECT_CLIENT_INVOICE'
        ) {

          return (
            file.category ===
              'CORRECTION_TASK_' +
              task.id ||

            file.category ===
              'MANAGER_ATTACHMENT'
          );
        }


        return (
          file.category ===
            'MANAGER_ATTACHMENT' ||

          file.category ===
            'INCOMING_SUPPLIER_INVOICE'
        );
      }
    );`
  );


// ======================================================
// AUDIT LABEL
// ======================================================

const auditStart =
  app.indexOf(
    'function auditLabel('
  );

const auditEnd =
  app.indexOf(
    'function paymentStatusLabel(',
    auditStart
  );


if (
  auditStart !== -1 &&
  auditEnd !== -1
) {

  let audit =
    app.slice(
      auditStart,
      auditEnd
    );


  if (
    !audit.includes(
      'INVOICE_AMOUNT_CHANGED'
    )
  ) {

    audit =
      audit.replace(

        /SUPPLIER_PAYMENT_STAMPED:[\s\S]*?'[^']*',/,

        (match) =>
          match +
          `

    INVOICE_AMOUNT_CHANGED:
      'Изменена сумма счёта',`
      );


    app =
      app.slice(
        0,
        auditStart
      ) +
      audit +
      app.slice(
        auditEnd
      );
  }
}


fs.writeFileSync(
  appPath,
  app,
  'utf8'
);


// ======================================================
// CUSTOM APP MODAL INSTEAD OF window.confirm
// ======================================================

let purchases =
  fs.readFileSync(
    purchasesPath,
    'utf8'
  );


const cardStart =
  purchases.indexOf(
    'function PurchaseCard('
  );


if (cardStart !== -1) {

  const nextFunction =
    purchases.indexOf(
      'export function SupplierPaymentTask(',
      cardStart
    );


  let card =
    purchases.slice(
      cardStart,
      nextFunction
    );


  if (
    !card.includes(
      'cancelConfirmOpen'
    )
  ) {

    const errorState =
      `  const [error, setError] =
    useState('');`;


    if (
      card.includes(
        errorState
      )
    ) {

      card =
        card.replace(

          errorState,

`${errorState}

  const [
    cancelConfirmOpen,
    setCancelConfirmOpen,
  ] = useState(false);`
        );
    }
  }


  const cancelStart =
    card.indexOf(
      'async function cancelPurchase()'
    );

  const requestStart =
    card.indexOf(
      'async function request()',
      cancelStart
    );


  if (
    cancelStart !== -1 &&
    requestStart !== -1
  ) {

    const cancelFunction =
`async function cancelPurchase() {

    setSaving(true);
    setError('');


    try {

      await cancelSupplierPurchase(
        deal.id,
        purchase.id,
      );


      setCancelConfirmOpen(
        false
      );


      await onChanged();


    } catch (e) {

      setError(
        e instanceof Error
          ? e.message
          : String(e)
      );


    } finally {

      setSaving(false);
    }
  }


  `;


    card =
      card.slice(
        0,
        cancelStart
      ) +
      cancelFunction +
      card.slice(
        requestStart
      );
  }


  card =
    card.replace(
      /onClick=\{cancelPurchase\}/g,

      `onClick={() =>
            setCancelConfirmOpen(
              true
            )
          }`
    );


  if (
    !card.includes(
      'className="appModalBackdrop"'
    )
  ) {

    const errorMarker =
      `{error && (`;


    const modal =
`{cancelConfirmOpen && (

        <div
          className="appModalBackdrop"

          onClick={() =>
            setCancelConfirmOpen(
              false
            )
          }
        >

          <div
            className="appModal"

            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <strong>

              {
                purchase.status ===
                  'PAYMENT_REQUESTED'

                  ? 'Отменить запрос оплаты?'
                  : 'Удалить закупку?'
              }

            </strong>


            <p>

              {
                purchase.status ===
                  'PAYMENT_REQUESTED'

                  ? 'Если бухгалтер ещё не взял задачу в работу, запрос и закупка будут удалены.'

                  : 'Закупка ещё не передана бухгалтерии и будет удалена без записи в историю.'
              }

            </p>


            <div className="appModalActions">

              <button
                type="button"
                className="secondary"

                disabled={saving}

                onClick={() =>
                  setCancelConfirmOpen(
                    false
                  )
                }
              >
                Не удалять
              </button>


              <button
                type="button"
                className="dangerButton"

                disabled={saving}

                onClick={cancelPurchase}
              >

                {
                  saving
                    ? 'Удаляем…'
                    : purchase.status ===
                        'PAYMENT_REQUESTED'
                      ? 'Отменить запрос'
                      : 'Удалить'
                }

              </button>

            </div>

          </div>

        </div>

      )}


      `;


    if (
      card.includes(
        errorMarker
      )
    ) {

      card =
        card.replace(
          errorMarker,
          modal +
          errorMarker
        );
    }
  }


  purchases =
    purchases.slice(
      0,
      cardStart
    ) +
    card +
    purchases.slice(
      nextFunction
    );
}


fs.writeFileSync(
  purchasesPath,
  purchases,
  'utf8'
);


// ======================================================
// RECENT ACTIVITY
// ======================================================

if (
  fs.existsSync(
    activityPath
  )
) {

  let activity =
    fs.readFileSync(
      activityPath,
      'utf8'
    );


  if (
    !activity.includes(
      'INVOICE_AMOUNT_CHANGED:'
    )
  ) {

    const marker =
      `    PAYMENT_STATUS_CHANGED:`;


    const index =
      activity.indexOf(
        marker
      );


    if (index !== -1) {

      activity =
        activity.slice(
          0,
          index
        ) +

`    INVOICE_AMOUNT_CHANGED:
      'Изменил сумму счёта',

` +

        activity.slice(
          index
        );
    }
  }


  fs.writeFileSync(
    activityPath,
    activity,
    'utf8'
  );
}


// ======================================================
// CSS
// ======================================================

let css =
  fs.readFileSync(
    cssPath,
    'utf8'
  );


if (
  !css.includes(
    '/* MSM invoice workflow v0.4.5 */'
  )
) {

  css += `

/* MSM invoice workflow v0.4.5 */

.managerInvoiceAmount {
  display: grid;
  gap: 12px;

  padding: 14px;

  border: 1px solid #e7e5e4;
  border-radius: 18px;

  background: #fff;
}

.managerInvoiceAmount > div:first-child span,
.managerInvoiceAmount > div:first-child strong {
  display: block;
}

.managerInvoiceAmount > div:first-child span {
  color: #78716c;
  font-size: 11px;
}

.managerInvoiceAmount > div:first-child strong {
  margin-top: 3px;
  font-size: 16px;
}

.managerAmountEdit {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    auto;

  gap: 8px;
}

.managerAmountEdit input {
  width: 100%;
  min-width: 0;

  padding: 12px;

  border: 1px solid #d6d3d1;
  border-radius: 12px;

  background: #fff;
  color: #171717;

  outline: none;
}

.currentVersionLabel {
  grid-column: 1 / -1;

  color: #2563eb;

  font-size: 11px;
  font-weight: 800;
}


/* Invoice version history */

.invoiceVersionRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  padding: 12px;

  border: 1px solid #e7e5e4;
  border-radius: 13px;

  background: #fafaf9;
}

.invoiceVersionMain {
  min-width: 0;

  display: grid;
  gap: 3px;
}

.invoiceVersionTitle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.invoiceVersionMain > span {
  color: #78716c;
  font-size: 11px;
}

.invoiceVersionRow > a {
  flex-shrink: 0;

  color: #171717;

  font-size: 12px;
  font-weight: 800;
}

.invoiceVersionBadge {
  display: inline-flex;

  padding: 4px 7px;

  border-radius: 999px;

  font-size: 10px;
  font-weight: 800;
}

.invoiceVersionBadge.current {
  background: #dbeafe;
  color: #1d4ed8;
}

.invoiceVersionBadge.old {
  background: #e7e5e4;
  color: #78716c;
}

.invoiceVersionCurrent {
  border-left: 4px solid #3b82f6;
}

.invoiceVersionOld {
  border-left: 4px solid #d6d3d1;
  opacity: .62;
}

.invoiceVersionOld:hover {
  opacity: .82;
}

.correctionPending {
  border-color: #fde68a;
  background: #fffbeb;
}


/* Custom modal */

.appModalBackdrop {
  position: fixed;
  inset: 0;
  z-index: 100;

  display: grid;
  place-items: center;

  padding: 20px;

  background:
    rgba(0,0,0,.48);

  backdrop-filter:
    blur(4px);

  animation:
    msmFade
    140ms
    ease-out
    both;
}

.appModal {
  width: min(
    430px,
    100%
  );

  display: grid;
  gap: 10px;

  padding: 20px;

  border: 1px solid #e7e5e4;
  border-radius: 20px;

  background: #fff;

  box-shadow:
    0 24px 70px
    rgba(0,0,0,.22);

  animation:
    msmFadeUp
    170ms
    ease-out
    both;
}

.appModal > strong {
  font-size: 19px;
}

.appModal > p {
  margin: 0;

  color: #57534e;

  font-size: 13px;
  line-height: 1.45;
}

.appModalActions {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 8px;

  margin-top: 6px;
}

.dangerButton {
  border: 0;
  border-radius: 14px;

  padding: 13px 16px;

  background: #b91c1c;
  color: #fff;

  font-weight: 800;
}


/* Dark */

html[data-theme='dark']
.managerInvoiceAmount,
html[data-theme='dark']
.appModal {
  background: #1d1d1f;
  border-color: #343437;
}

html[data-theme='dark']
.managerAmountEdit input {
  background: #19191b;
  border-color: #3f3f42;
  color: #f5f5f4;
}

html[data-theme='dark']
.invoiceVersionRow {
  background: #242426;
  border-color: #343437;
}

html[data-theme='dark']
.invoiceVersionRow > a {
  color: #f5f5f4;
}

html[data-theme='dark']
.correctionPending {
  background: #292317;
  border-color: #854d0e;
}

html[data-theme='dark']
.appModal > p {
  color: #a8a29e;
}


@media (max-width: 520px) {

  .managerAmountEdit {
    grid-template-columns: 1fr;
  }

  .invoiceVersionRow {
    align-items: flex-start;
  }
}
`;
}


fs.writeFileSync(
  cssPath,
  css,
  'utf8'
);


console.log('');
console.log('MSM v0.4.5 applied');
console.log('');
console.log('OK: custom confirmation modal');
console.log('OK: manager can enter invoice amount');
console.log('OK: amount can be changed after correction');
console.log('OK: confirm saves changed amount first');
console.log('OK: correction can include new incoming files');
console.log('OK: accountant sees correction files');
console.log('OK: current invoice version clearly marked');
console.log('OK: old corrected versions marked not current');
console.log('OK: invoice amount change added to audit');
console.log('OK: no Prisma migration');