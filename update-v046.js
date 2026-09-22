const fs = require('fs');

const appPath =
  'frontend/src/App.tsx';

const typesPath =
  'frontend/src/types.ts';

const apiPath =
  'frontend/src/api.ts';

const dealsControllerPath =
  'backend/src/deals/deals.controller.ts';

const dealsServicePath =
  'backend/src/deals/deals.service.ts';

const activityPath =
  'frontend/src/RecentActivityPanel.tsx';

const cssPath =
  'frontend/src/styles.css';


for (const file of [
  appPath,
  typesPath,
  apiPath,
  dealsControllerPath,
  dealsServicePath,
  cssPath,
]) {

  if (!fs.existsSync(file)) {
    console.error(
      'Missing: ' + file
    );
    process.exit(1);
  }


  const backup =
    file + '.bak-v046';


  if (!fs.existsSync(backup)) {
    fs.copyFileSync(
      file,
      backup
    );
  }
}


function findDivEnd(
  source,
  start,
) {

  const re =
    /<div\b|<\/div>/g;

  re.lastIndex =
    start;


  let depth = 0;
  let match;


  while (
    (
      match =
        re.exec(source)
    )
  ) {

    if (
      match[0] ===
      '</div>'
    ) {
      depth--;
    } else {
      depth++;
    }


    if (
      depth === 0
    ) {
      return re.lastIndex;
    }
  }


  return -1;
}


// ======================================================
// TYPES
// ======================================================

let types =
  fs.readFileSync(
    typesPath,
    'utf8'
  );


const auditStart =
  types.indexOf(
    'export type AuditEvent = {'
  );


if (
  auditStart !== -1
) {

  const auditEnd =
    types.indexOf(
      '\n};',
      auditStart
    );


  let auditBlock =
    types.slice(
      auditStart,
      auditEnd + 3
    );


  if (
    !auditBlock.includes(
      'oldValue?:'
    )
  ) {

    auditBlock =
      auditBlock.replace(
        '  createdAt: string;',

`  createdAt: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;`
      );


    types =
      types.slice(
        0,
        auditStart
      ) +
      auditBlock +
      types.slice(
        auditEnd + 3
      );
  }
}


const dealTypeStart =
  types.indexOf(
    'export type Deal = {'
  );


if (
  dealTypeStart !== -1
) {

  const dealTypeEnd =
    types.indexOf(
      '\n};',
      dealTypeStart
    );


  let dealBlock =
    types.slice(
      dealTypeStart,
      dealTypeEnd + 3
    );


  if (
    !dealBlock.includes(
      'createdAt?: string;'
    )
  ) {

    dealBlock =
      dealBlock.replace(
        '  internalNumber: number;',

`  internalNumber: number;
  createdAt?: string;`
      );


    types =
      types.slice(
        0,
        dealTypeStart
      ) +
      dealBlock +
      types.slice(
        dealTypeEnd + 3
      );
  }
}


fs.writeFileSync(
  typesPath,
  types,
  'utf8'
);


// ======================================================
// BACKEND: SHIPMENT DATE
// ======================================================

let dealsController =
  fs.readFileSync(
    dealsControllerPath,
    'utf8'
  );


if (
  !dealsController.includes(
    'Patch'
  )
) {

  dealsController =
    dealsController.replace(
      'Body, Controller,',
      'Body, Controller, Patch,'
    );
}


if (
  !dealsController.includes(
    "shipment-date"
  )
) {

  const marker =
    "  @Get(':id')";


  const endpoint =
`  @Patch(':id/shipment-date')
  updateShipmentDate(
    @Param('id')
    id: string,

    @Body()
    body: {
      plannedShipmentAt?: string;
      actorId: string;
    },
  ) {

    return this.deals
      .updateShipmentDate(
        id,
        body,
      );
  }


`;


  if (
    !dealsController.includes(
      marker
    )
  ) {

    console.error(
      'DealsController GET id not found'
    );

    process.exit(1);
  }


  dealsController =
    dealsController.replace(
      marker,
      endpoint +
      marker
    );
}


fs.writeFileSync(
  dealsControllerPath,
  dealsController,
  'utf8'
);


// ======================================================
// DEALS SERVICE
// ======================================================

let dealsService =
  fs.readFileSync(
    dealsServicePath,
    'utf8'
  );


if (
  !dealsService.includes(
    'async updateShipmentDate('
  )
) {

  const end =
    dealsService.lastIndexOf(
      '\n}'
    );


  if (end === -1) {

    console.error(
      'DealsService end not found'
    );

    process.exit(1);
  }


  const method =
`  async updateShipmentDate(
    id: string,

    body: {
      plannedShipmentAt?: string;
      actorId: string;
    },
  ) {

    const current =
      await this.prisma
        .deal
        .findUniqueOrThrow({

          where: {
            id,
          },
        });


    const nextDate =
      body.plannedShipmentAt

        ? new Date(
            body.plannedShipmentAt +
            'T12:00:00.000Z'
          )

        : null;


    const updated =
      await this.prisma
        .deal
        .update({

          where: {
            id,
          },

          data: {
            plannedShipmentAt:
              nextDate,
          },
        });


    const oldDate =
      current.plannedShipmentAt
        ?.toISOString()
        .slice(0, 10) ??
      null;


    const newDate =
      updated.plannedShipmentAt
        ?.toISOString()
        .slice(0, 10) ??
      null;


    if (
      oldDate !== newDate
    ) {

      await this.prisma
        .auditEvent
        .create({

          data: {

            dealId:
              id,

            actorId:
              body.actorId,

            action:
              'SHIPMENT_DATE_CHANGED',

            entityType:
              'Deal',

            entityId:
              id,

            oldValue: {
              plannedShipmentAt:
                oldDate,
            },

            newValue: {
              plannedShipmentAt:
                newDate,
            },
          },
        });
    }


    return updated;
  }


`;


  dealsService =
    dealsService.slice(
      0,
      end
    ) +
    method +
    dealsService.slice(end);
}


fs.writeFileSync(
  dealsServicePath,
  dealsService,
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
    'updateShipmentDate'
  )
) {

  api += `


export async function updateShipmentDate(
  dealId: string,

  payload: {
    plannedShipmentAt?: string;
    actorId: string;
  },
) {

  return json<Deal>(
    \`/deals/\${dealId}/shipment-date\`,
    {
      method: 'PATCH',
      body: JSON.stringify(
        payload
      ),
    },
  );
}
`;
}


// recent activity needs old values too

const recentTypeStart =
  api.indexOf(
    'export type RecentActivity = {'
  );


if (
  recentTypeStart !== -1
) {

  const recentTypeEnd =
    api.indexOf(
      '\n};',
      recentTypeStart
    );


  let recentBlock =
    api.slice(
      recentTypeStart,
      recentTypeEnd + 3
    );


  if (
    !recentBlock.includes(
      'oldValue?:'
    )
  ) {

    recentBlock =
      recentBlock.replace(
        '  createdAt: string;',

`  createdAt: string;
  oldValue?: Record<string, unknown>;`
      );


    api =
      api.slice(
        0,
        recentTypeStart
      ) +
      recentBlock +
      api.slice(
        recentTypeEnd + 3
      );
  }
}



// V046_RECENT_SHIPMENT_TYPE_FIX

const recentShipmentTypeStart =
  api.indexOf(
    'export type RecentActivity = {'
  );


if (
  recentShipmentTypeStart !== -1
) {

  const recentShipmentTypeEnd =
    api.indexOf(
      '\n};',
      recentShipmentTypeStart
    );


  if (
    recentShipmentTypeEnd !== -1
  ) {

    let recentShipmentBlock =
      api.slice(
        recentShipmentTypeStart,
        recentShipmentTypeEnd + 3
      );


    if (
      !recentShipmentBlock.includes(
        'plannedShipmentAt?: string;'
      )
    ) {

      const numberLine =
        '    number?: string;';


      if (
        recentShipmentBlock.includes(
          numberLine
        )
      ) {

        recentShipmentBlock =
          recentShipmentBlock.replace(
            numberLine,

            numberLine +
            '\n    plannedShipmentAt?: string;'
          );

      } else {

        const newValueStart =
          recentShipmentBlock.indexOf(
            '  newValue?: {'
          );

        const newValueEnd =
          recentShipmentBlock.indexOf(
            '  };',
            newValueStart
          );


        if (
          newValueStart !== -1 &&
          newValueEnd !== -1
        ) {

          recentShipmentBlock =
            recentShipmentBlock.slice(
              0,
              newValueEnd
            ) +

            '    plannedShipmentAt?: string;\n' +

            recentShipmentBlock.slice(
              newValueEnd
            );
        }
      }


      api =
        api.slice(
          0,
          recentShipmentTypeStart
        ) +
        recentShipmentBlock +
        api.slice(
          recentShipmentTypeEnd + 3
        );
    }
  }
}


fs.writeFileSync(
  apiPath,
  api,
  'utf8'
);


// ======================================================
// APP IMPORT
// ======================================================

let app =
  fs.readFileSync(
    appPath,
    'utf8'
  );


if (
  !app.includes(
    "import { updateShipmentDate } from './api';"
  ) &&
  !app.includes(
    'updateShipmentDate,'
  )
) {

  app =
`import {
  updateShipmentDate,
} from './api';

` +
    app;
}


// ======================================================
// DEAL DETAIL
// ======================================================

const detailStart =
  app.indexOf(
    'function DealDetail('
  );

const invoiceStart =
  app.indexOf(
    'function InvoiceBlock(',
    detailStart
  );


if (
  detailStart === -1 ||
  invoiceStart === -1
) {

  console.error(
    'DealDetail not found'
  );

  process.exit(1);
}


let detail =
  app.slice(
    detailStart,
    invoiceStart
  );


// States

if (
  !detail.includes(
    'invoiceMenuOpen'
  )
) {

  const marker =
`  const [
    managerAmount,
    setManagerAmount,
  ] = useState('');`;


  if (
    !detail.includes(marker)
  ) {

    console.error(
      'managerAmount state not found'
    );

    process.exit(1);
  }


  detail =
    detail.replace(
      marker,

`${marker}

  const [
    invoiceMenuOpen,
    setInvoiceMenuOpen,
  ] = useState(false);

  const [
    shipmentDate,
    setShipmentDate,
  ] = useState('');`
    );
}


// Separate shipment sync.

if (
  !detail.includes(
    'setShipmentDate('
  ) ||
  detail.indexOf(
    'setShipmentDate('
  ) ===
  detail.indexOf(
    'setShipmentDate,'
  )
) {

  const loadingMarker =
    '  if (loading) {';


  if (
    !detail.includes(
      loadingMarker
    )
  ) {

    console.error(
      'DealDetail loading marker not found'
    );

    process.exit(1);
  }


  const effect =
`  useEffect(
    () => {

      setShipmentDate(
        deal?.plannedShipmentAt
          ?.slice(0, 10) ||
        ''
      );

    },
    [
      deal?.plannedShipmentAt,
    ],
  );


`;


  detail =
    detail.replace(
      loadingMarker,
      effect +
      loadingMarker
    );
}


// Replace saveAmount with saveInvoiceData.

const saveAmountStart =
  detail.indexOf(
    '  async function saveAmount()'
  );

const confirmStart =
  detail.indexOf(
    '  async function confirm()',
    saveAmountStart
  );


if (
  saveAmountStart !== -1 &&
  confirmStart !== -1
) {

  const saveData =
`  async function saveInvoiceData() {

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
        '\u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0441\u0443\u043c\u043c\u0443 \u0441\u0447\u0451\u0442\u0430'
      );

      return;
    }


    setSaving(true);
    setError('');


    try {

      const currentAmount =
        current.amount ===
          undefined ||
        current.amount ===
          null

          ? undefined

          : Number(
              current.amount
            );


      if (
        (
          parsed !== undefined &&
          (
            currentAmount ===
              undefined ||

            Math.abs(
              currentAmount -
              parsed
            ) > 0.001
          )
        ) ||

        (
          parsed === undefined &&
          currentAmount !==
            undefined
        )
      ) {

        await updateInvoiceAmount(
          dealId,
          current.id,
          {
            amount:
              parsed,

            actorId:
              user.id,
          },
        );
      }


      const currentShipment =
        deal?.plannedShipmentAt
          ?.slice(0, 10) ||
        '';


      if (
        shipmentDate !==
        currentShipment
      ) {

        await updateShipmentDate(
          dealId,
          {
            plannedShipmentAt:
              shipmentDate ||
              undefined,

            actorId:
              user.id,
          },
        );
      }


      setInvoiceMenuOpen(
        false
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


`;


  detail =
    detail.slice(
      0,
      saveAmountStart
    ) +
    saveData +
    detail.slice(
      confirmStart
    );
}


// InvoiceBlock onManage

const oldInvoiceCallRegex =
  /<InvoiceBlock\s+invoice=\{current\}\s+sellerType=\{\s*deal\.sellerType\s*\}\s*\/>/;


if (
  oldInvoiceCallRegex.test(
    detail
  )
) {

  detail =
    detail.replace(
      oldInvoiceCallRegex,

`<InvoiceBlock
          invoice={current}
          sellerType={
            deal.sellerType
          }

          onManage={
            canManageInvoice

              ? () =>
                  setInvoiceMenuOpen(
                    (value) =>
                      !value
                  )

              : undefined
          }
        />`
    );
}


// Add dates after hero.

if (
  !detail.includes(
    'className="dealDates"'
  )
) {

  const heroStart =
    detail.indexOf(
      '<div className="detailHero">'
    );


  const heroEnd =
    findDivEnd(
      detail,
      heroStart
    );


  if (
    heroStart !== -1 &&
    heroEnd !== -1
  ) {

    const dates =
`

      <div className="dealDates">

        <div>

          <span>
            \u0414\u0430\u0442\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f
          </span>

          <b>

            {
              deal.createdAt

                ? new Date(
                    deal.createdAt
                  )
                    .toLocaleString(
                      'ru-RU',
                      {
                        day:
                          '2-digit',

                        month:
                          '2-digit',

                        year:
                          'numeric',

                        hour:
                          '2-digit',

                        minute:
                          '2-digit',
                      }
                    )

                : '\u2014'
            }

          </b>

        </div>


        <div>

          <span>
            \u0414\u0430\u0442\u0430 \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u0438
          </span>

          <b>

            {
              deal?.plannedShipmentAt

                ? new Date(
                    deal?.plannedShipmentAt
                  )
                    .toLocaleDateString(
                      'ru-RU'
                    )

                : '\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430'
            }

          </b>

        </div>

      </div>
`;


    detail =
      detail.slice(
        0,
        heroEnd
      ) +
      dates +
      detail.slice(
        heroEnd
      );
  }
}


// Replace always-visible amount box.

const oldAmountDiv =
  detail.indexOf(
    '<div className="managerInvoiceAmount">'
  );


if (
  oldAmountDiv !== -1
) {

  const divEnd =
    findDivEnd(
      detail,
      oldAmountDiv
    );


  const conditionalStart =
    detail.lastIndexOf(
      '{canManageInvoice',
      oldAmountDiv
    );


  if (
    divEnd !== -1 &&
    conditionalStart !== -1
  ) {

    const afterDiv =
      detail.slice(
        divEnd
      );


    const closingMatch =
      afterDiv.match(
        /^\s*\)\}/
      );


    if (closingMatch) {

      const conditionalEnd =
        divEnd +
        closingMatch[0].length;


      const menu =
`{invoiceMenuOpen &&
        canManageInvoice &&
        current && (

        <div className="invoiceManageMenu">

          <div className="invoiceManageTitle">

            <div>

              <strong>
                \u0414\u0430\u043d\u043d\u044b\u0435 \u0441\u0447\u0451\u0442\u0430
              </strong>

              <span>
                \u042d\u0442\u0438 \u043f\u043e\u043b\u044f \u043c\u043e\u0436\u043d\u043e \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0431\u0435\u0437 \u0432\u043e\u0437\u0432\u0440\u0430\u0442\u0430 \u0431\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440\u0438\u0438
              </span>

            </div>


            <button
              type="button"
              className="invoiceMenuClose"

              onClick={() =>
                setInvoiceMenuOpen(
                  false
                )
              }
            >
              \u00d7
            </button>

          </div>


          <div className="invoiceManageFields">

            <Field title="\u0421\u0443\u043c\u043c\u0430 \u0441\u0447\u0451\u0442\u0430">

              <input
                inputMode="decimal"

                value={
                  managerAmount
                }

                onChange={(e) =>
                  setManagerAmount(
                    e.target.value
                  )
                }

                placeholder="\u041d\u0430\u043f\u0440\u0438\u043c\u0435\u0440: 210 000"
              />

            </Field>


            <Field title="\u0414\u0430\u0442\u0430 \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u0438">

              <input
                type="date"

                value={
                  shipmentDate
                }

                onChange={(e) =>
                  setShipmentDate(
                    e.target.value
                  )
                }
              />

            </Field>

          </div>


          <button
            type="button"
            className="primary wide"

            disabled={saving}

            onClick={
              saveInvoiceData
            }
          >
            {
              saving
                ? '\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c\u2026'
                : '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435'
            }
          </button>


          <div className="invoiceManageDivider" />


          <div className="invoiceAccountingCorrection">

            <div>

              <strong>
                \u041d\u0443\u0436\u043d\u043e \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0441\u0430\u043c \u0441\u0447\u0451\u0442?
              </strong>

              <span>
                PDF, \u043f\u043e\u0437\u0438\u0446\u0438\u0438, \u043a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0438\u043b\u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u0434\u0430\u043d\u043d\u044b\u0435, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u0434\u043e\u043b\u0436\u043d\u0430 \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0431\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440\u0438\u044f.
              </span>

            </div>


            <button
              type="button"
              className="secondary wide"

              onClick={() => {

                setInvoiceMenuOpen(
                  false
                );

                setCorrectionOpen(
                  true
                );
              }}
            >
              \u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0443
            </button>

          </div>

        </div>

      )}`;


      detail =
        detail.slice(
          0,
          conditionalStart
        ) +
        menu +
        detail.slice(
          conditionalEnd
        );
    }
  }
}


// Update review text.

detail =
  detail.replace(

    '\u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440\u0438\u044f \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043b\u0430 \u0441\u0443\u043c\u043c\u0443. \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0435\u0451 \u0432\u044b\u0448\u0435 \u0441\u0430\u043c\u043e\u0441\u0442\u043e\u044f\u0442\u0435\u043b\u044c\u043d\u043e \u043b\u0438\u0431\u043e \u043e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u0441\u0447\u0451\u0442 \u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0443.',

    '\u0411\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440\u0438\u044f \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043b\u0430 \u0441\u0443\u043c\u043c\u0443. \u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043c\u0435\u043d\u044e \u2022\u2022\u2022 \u0443 \u0441\u0447\u0451\u0442\u0430 \u0438 \u0443\u043a\u0430\u0436\u0438\u0442\u0435 \u0435\u0451 \u043b\u0438\u0431\u043e \u043e\u0442\u043f\u0440\u0430\u0432\u044c\u0442\u0435 \u0441\u0447\u0451\u0442 \u0431\u0443\u0445\u0433\u0430\u043b\u0442\u0435\u0440\u0438\u0438 \u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0443.'
  );


app =
  app.slice(
    0,
    detailStart
  ) +
  detail +
  app.slice(
    invoiceStart
  );


// ======================================================
// INVOICE BLOCK WITH SMALL MENU BUTTON
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
  onManage,
}: {
  invoice: Invoice;
  sellerType: SellerType;
  onManage?: () => void;
}) {

  return (

    <div className="invoiceBlock invoiceBlockWithMenu">

      {onManage && (

        <button
          type="button"
          className="invoiceMenuButton"

          onClick={onManage}

          aria-label="\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f \u0441\u043e \u0441\u0447\u0451\u0442\u043e\u043c"
        >
          \u2022\u2022\u2022
        </button>

      )}


      <div className="currentVersionLabel">
        \u0412\u0435\u0440\u0441\u0438\u044f {invoice.version || 1}
        {' \u00b7 '}
        \u0422\u0435\u043a\u0443\u0449\u0430\u044f
      </div>


      <div>

        <span>
          \u0421\u0447\u0451\u0442
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
          \u0421\u0443\u043c\u043c\u0430
        </span>

        <strong>
          {
            invoice.amount
              ? money(
                  invoice.amount
                )
              : '\u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430'
          }
        </strong>

      </div>


      <div>

        <span>
          \u0414\u0430\u0442\u0430 \u0441\u0447\u0451\u0442\u0430
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

              : '\u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430'
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
          \u041e\u0442\u043a\u0440\u044b\u0442\u044c PDF
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
// DETAILED AUDIT LABELS
// ======================================================

// Render full old -> new values.

app =
  app.replace(
    /auditLabel\(\s*event\.action\s*\)/g,

    `auditLabel(
                        event.action,
                        event.oldValue,
                        event.newValue
                      )`
  );


const appAuditStart =
  app.indexOf(
    'function auditLabel('
  );

const appAuditEnd =
  app.indexOf(
    'function paymentStatusLabel(',
    appAuditStart
  );


if (
  appAuditStart === -1 ||
  appAuditEnd === -1
) {

  console.error(
    'auditLabel not found'
  );

  process.exit(1);
}


const auditFunctions =
`function auditMoney(
  value: unknown,
) {

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {

    return '\u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430';
  }


  const number =
    Number(value);


  if (
    !Number.isFinite(
      number
    )
  ) {

    return String(value);
  }


  return (
    number.toLocaleString(
      'ru-RU'
    ) +
    ' \u20bd'
  );
}


function auditDate(
  value: unknown,
) {

  if (!value) {
    return '\u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430';
  }


  const text =
    String(value);


  const parts =
    text.split('-');


  if (
    parts.length === 3
  ) {

    return (
      parts[2] +
      '.' +
      parts[1] +
      '.' +
      parts[0]
    );
  }


  return text;
}


function auditLabel(
  action: string,

  oldValue?: Record<
    string,
    unknown
  >,

  newValue?: Record<
    string,
    unknown
  >,
) {

  if (
    action ===
    'INVOICE_AMOUNT_CHANGED'
  ) {

    return (
      '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0430 \u0441\u0443\u043c\u043c\u0430 \u0441\u0447\u0451\u0442\u0430: ' +
      auditMoney(
        oldValue?.amount
      ) +
      ' \u2192 ' +
      auditMoney(
        newValue?.amount
      )
    );
  }


  if (
    action ===
    'SHIPMENT_DATE_CHANGED'
  ) {

    return (
      '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0430 \u0434\u0430\u0442\u0430 \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u0438: ' +
      auditDate(
        oldValue
          ?.plannedShipmentAt
      ) +
      ' \u2192 ' +
      auditDate(
        newValue
          ?.plannedShipmentAt
      )
    );
  }


  const labels:
    Record<string, string> = {

    CREATE:
      '\u0421\u043e\u0437\u0434\u0430\u043d\u0430 \u0441\u0434\u0435\u043b\u043a\u0430',

    UPLOAD:
      '\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043d \u0441\u0447\u0451\u0442',

    CONFIRM:
      '\u0421\u0447\u0451\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d',

    REQUEST_CORRECTION:
      '\u0417\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0430',

    CLIENT_PAYMENT_ADDED:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',

    PAYMENT_STATUS_CHANGED:
      '\u0418\u0437\u043c\u0435\u043d\u0451\u043d \u0441\u0442\u0430\u0442\u0443\u0441 \u043e\u043f\u043b\u0430\u0442\u044b',

    SUPPLIER_PURCHASE_CREATED:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u0437\u0430\u043a\u0443\u043f\u043a\u0430',

    SUPPLIER_PURCHASE_UPDATED:
      '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u044b \u0434\u0430\u043d\u043d\u044b\u0435 \u0437\u0430\u043a\u0443\u043f\u043a\u0438',

    SUPPLIER_PAYMENT_REQUESTED:
      '\u0417\u0430\u043f\u0440\u043e\u0448\u0435\u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443',

    SUPPLIER_PAYMENT_ADDED:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443',

    SUPPLIER_PAYMENT_STAMPED:
      '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u043f\u043b\u0430\u0442\u0451\u0436\u043a\u0430 \u0441 \u043f\u0435\u0447\u0430\u0442\u044c\u044e',
  };


  return (
    labels[action] ||
    '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u043f\u043e \u0441\u0434\u0435\u043b\u043a\u0435'
  );
}


`;


app =
  app.slice(
    0,
    appAuditStart
  ) +
  auditFunctions +
  app.slice(
    appAuditEnd
  );


fs.writeFileSync(
  appPath,
  app,
  'utf8'
);


// ======================================================
// RECENT ACTIVITY: old -> new too
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


  const actionStart =
    activity.indexOf(
      'function actionLabel('
    );

  const dealLabelStart =
    activity.indexOf(
      'function dealLabel(',
      actionStart
    );


  if (
    actionStart !== -1 &&
    dealLabelStart !== -1
  ) {

    const actionLabel =
`function activityMoney(
  value: unknown,
) {

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '\u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430';
  }


  const number =
    Number(value);


  return Number.isFinite(
    number
  )
    ? number.toLocaleString(
        'ru-RU'
      ) +
      ' \u20bd'

    : String(value);
}


function activityDate(
  value: unknown,
) {

  if (!value) {
    return '\u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430';
  }


  const parts =
    String(value)
      .split('-');


  return parts.length === 3

    ? parts[2] +
      '.' +
      parts[1] +
      '.' +
      parts[0]

    : String(value);
}


function actionLabel(
  event: RecentActivity,
) {

  if (
    event.action ===
    'INVOICE_AMOUNT_CHANGED'
  ) {

    return (
      '\u0421\u0443\u043c\u043c\u0430 \u0441\u0447\u0451\u0442\u0430: ' +
      activityMoney(
        event.oldValue
          ?.amount
      ) +
      ' \u2192 ' +
      activityMoney(
        event.newValue
          ?.amount
      )
    );
  }


  if (
    event.action ===
    'SHIPMENT_DATE_CHANGED'
  ) {

    return (
      '\u0414\u0430\u0442\u0430 \u043e\u0442\u0433\u0440\u0443\u0437\u043a\u0438: ' +
      activityDate(
        event.oldValue
          ?.plannedShipmentAt
      ) +
      ' \u2192 ' +
      activityDate(
        event.newValue
          ?.plannedShipmentAt
      )
    );
  }


  const supplier =
    event.newValue
      ?.supplierName;


  const amount =
    event.newValue
      ?.amount;


  if (
    event.action ===
    'SUPPLIER_PAYMENT_ADDED'
  ) {

    return supplier

      ? '\u041e\u043f\u043b\u0430\u0442\u0430 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443 ' +
        supplier +
        (
          amount
            ? ' \u00b7 ' +
              Number(amount)
                .toLocaleString(
                  'ru-RU'
                ) +
              ' \u20bd'
            : ''
        )

      : '\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u043e\u043f\u043b\u0430\u0442\u0430 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443';
  }


  const labels:
    Record<string, string> = {

    CREATE:
      '\u0421\u043e\u0437\u0434\u0430\u043b \u0441\u0434\u0435\u043b\u043a\u0443',

    UPLOAD:
      '\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u043b \u0441\u0447\u0451\u0442',

    CONFIRM:
      '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043b \u0441\u0447\u0451\u0442',

    REQUEST_CORRECTION:
      '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u043b \u0441\u0447\u0451\u0442 \u043d\u0430 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u0438\u0440\u043e\u0432\u043a\u0443',

    CLIENT_PAYMENT_ADDED:
      '\u0414\u043e\u0431\u0430\u0432\u0438\u043b \u043e\u043f\u043b\u0430\u0442\u0443 \u043a\u043b\u0438\u0435\u043d\u0442\u0430',

    PAYMENT_STATUS_CHANGED:
      '\u0418\u0437\u043c\u0435\u043d\u0438\u043b \u0441\u0442\u0430\u0442\u0443\u0441 \u043e\u043f\u043b\u0430\u0442\u044b',

    SUPPLIER_PURCHASE_CREATED:
      '\u0414\u043e\u0431\u0430\u0432\u0438\u043b \u0437\u0430\u043a\u0443\u043f\u043a\u0443',

    SUPPLIER_PURCHASE_UPDATED:
      '\u0418\u0437\u043c\u0435\u043d\u0438\u043b \u0437\u0430\u043a\u0443\u043f\u043a\u0443',

    SUPPLIER_PAYMENT_REQUESTED:
      '\u0417\u0430\u043f\u0440\u043e\u0441\u0438\u043b \u043e\u043f\u043b\u0430\u0442\u0443 \u043f\u043e\u0441\u0442\u0430\u0432\u0449\u0438\u043a\u0443',

    SUPPLIER_PAYMENT_STAMPED:
      '\u0414\u043e\u0431\u0430\u0432\u0438\u043b \u043f\u043b\u0430\u0442\u0451\u0436\u043a\u0443 \u0441 \u043f\u0435\u0447\u0430\u0442\u044c\u044e',
  };


  return (
    labels[event.action] ||
    '\u0418\u0437\u043c\u0435\u043d\u0438\u043b \u0441\u0434\u0435\u043b\u043a\u0443'
  );
}


`;


    activity =
      activity.slice(
        0,
        actionStart
      ) +
      actionLabel +
      activity.slice(
        dealLabelStart
      );


    fs.writeFileSync(
      activityPath,
      activity,
      'utf8'
    );
  }
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
    '/* MSM invoice menu v0.4.6 */'
  )
) {

  css += `

/* MSM invoice menu v0.4.6 */

.invoiceBlockWithMenu {
  position: relative;
  padding-top: 44px;
}

.invoiceMenuButton {
  position: absolute;
  top: 12px;
  right: 12px;

  width: 38px;
  height: 32px;

  display: grid;
  place-items: center;

  padding: 0;

  border: 1px solid #e7e5e4;
  border-radius: 10px;

  background: #f5f5f4;
  color: #171717;

  font-size: 16px;
  font-weight: 900;

  letter-spacing: 1px;
}

.invoiceMenuButton:hover {
  background: #e7e5e4;
}


/* Created / shipment */

.dealDates {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 10px;

  padding: 12px 14px;

  border: 1px solid #e7e5e4;
  border-radius: 16px;

  background: #fff;
}

.dealDates span,
.dealDates b {
  display: block;
}

.dealDates span {
  color: #78716c;
  font-size: 11px;
}

.dealDates b {
  margin-top: 3px;
  font-size: 13px;
}


/* Invoice manage popup/card */

.invoiceManageMenu {
  display: grid;
  gap: 13px;

  padding: 16px;

  border: 1px solid #d6d3d1;
  border-radius: 18px;

  background: #fff;

  animation:
    msmFadeUp
    160ms
    ease-out
    both;
}

.invoiceManageTitle {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.invoiceManageTitle strong,
.invoiceManageTitle span {
  display: block;
}

.invoiceManageTitle strong {
  font-size: 16px;
}

.invoiceManageTitle span {
  margin-top: 3px;

  color: #78716c;

  font-size: 11px;
  line-height: 1.4;
}

.invoiceMenuClose {
  width: 32px;
  height: 32px;

  flex: 0 0 32px;

  border: 0;
  border-radius: 9px;

  background: #f5f5f4;

  color: #57534e;

  font-size: 20px;
  line-height: 1;
}

.invoiceManageFields {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    minmax(0, 1fr);

  gap: 10px;
}

.invoiceManageDivider {
  height: 1px;
  background: #e7e5e4;
}

.invoiceAccountingCorrection {
  display: grid;
  gap: 10px;
}

.invoiceAccountingCorrection strong,
.invoiceAccountingCorrection span {
  display: block;
}

.invoiceAccountingCorrection span {
  margin-top: 3px;

  color: #78716c;

  font-size: 11px;
  line-height: 1.4;
}


/* Attachment spacing */

.multiFilePicker {
  gap: 10px;
}

.multiFilePicker > .versionList {
  margin-top: 3px;
}

.field .versionList {
  margin-top: 9px;
}

.field .fileButton {
  margin-bottom: 3px;
}

.versionList {
  gap: 8px;
}

.versionRow {
  padding-top: 12px;
  padding-bottom: 12px;
}

.microcopy {
  display: block;

  margin-top: 10px;

  line-height: 1.45;
}

.field > .multiFilePicker {
  margin-top: 4px;
}


/* Dark */

html[data-theme='dark']
.dealDates,
html[data-theme='dark']
.invoiceManageMenu {
  background: #1d1d1f;
  border-color: #343437;
}

html[data-theme='dark']
.invoiceMenuButton,
html[data-theme='dark']
.invoiceMenuClose {
  background: #303033;
  border-color: #444447;
  color: #f5f5f4;
}

html[data-theme='dark']
.invoiceManageDivider {
  background: #343437;
}


@media (max-width: 520px) {

  .dealDates {
    grid-template-columns: 1fr 1fr;
  }

  .invoiceManageFields {
    grid-template-columns: 1fr;
  }

  .invoiceBlockWithMenu {
    padding-top: 48px;
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
console.log('MSM v0.4.6 applied');
console.log('');
console.log('OK: invoice amount moved to small menu');
console.log('OK: shipment date added');
console.log('OK: deal creation date displayed automatically');
console.log('OK: shipment date accepts any date');
console.log('OK: local invoice data can be edited without accounting task');
console.log('OK: PDF/content corrections still go to accounting');
console.log('OK: audit shows old value -> new value');
console.log('OK: recent activity shows old value -> new value');
console.log('OK: attachment spacing improved');
console.log('OK: no Prisma migration');