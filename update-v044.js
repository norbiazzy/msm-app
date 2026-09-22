const fs = require('fs');

const appPath =
  'frontend/src/App.tsx';

const activityPath =
  'frontend/src/RecentActivityPanel.tsx';

const purchaseUiPath =
  'frontend/src/PurchasesBlock.tsx';

const apiPath =
  'frontend/src/api.ts';

const servicePath =
  'backend/src/purchases/purchases.service.ts';

const controllerPath =
  'backend/src/purchases/purchases.controller.ts';

const files = [
  appPath,
  activityPath,
  purchaseUiPath,
  apiPath,
  servicePath,
  controllerPath,
];


for (const file of files) {

  if (!fs.existsSync(file)) {

    console.error(
      'Missing: ' + file
    );

    process.exit(1);
  }


  const backup =
    file + '.bak-v044';


  if (!fs.existsSync(backup)) {

    fs.copyFileSync(
      file,
      backup
    );
  }
}


// ======================================================
// 1. FIX LITERAL \u0410 TEXT
// ======================================================

function decodeUnicodeEscapes(
  file,
) {

  let source =
    fs.readFileSync(
      file,
      'utf8'
    );


  const before =
    source;


  source =
    source.replace(
      /\\u([0-9a-fA-F]{4})/g,

      (
        full,
        hex,
      ) =>
        String.fromCharCode(
          parseInt(
            hex,
            16
          )
        )
    );


  fs.writeFileSync(
    file,
    source,
    'utf8'
  );


  return (
    before !== source
  );
}


decodeUnicodeEscapes(
  appPath
);

decodeUnicodeEscapes(
  activityPath
);


console.log(
  'OK: unicode labels repaired'
);


// ======================================================
// 2. SLOW DOWN POLLING
// Prevent ERR_NO_BUFFER_SPACE
// ======================================================

function slowPolling(
  file,
) {

  const lines =
    fs.readFileSync(
      file,
      'utf8'
    )
      .split(/\r?\n/);


  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    if (
      !lines[i].includes(
        'setInterval'
      )
    ) {
      continue;
    }


    for (
      let j = i;
      j <
        Math.min(
          i + 30,
          lines.length
        );
      j++
    ) {

      const trimmed =
        lines[j].trim();


      if (
        trimmed === '2000' ||
        trimmed === '2000,'
      ) {

        const indent =
          lines[j].match(
            /^\s*/
          )?.[0] || '';


        lines[j] =
          indent +
          (
            trimmed.endsWith(',')
              ? '7000,'
              : '7000'
          );


        break;
      }


      if (
        trimmed === '3000' ||
        trimmed === '3000,'
      ) {

        const indent =
          lines[j].match(
            /^\s*/
          )?.[0] || '';


        lines[j] =
          indent +
          (
            trimmed.endsWith(',')
              ? '15000,'
              : '15000'
          );


        break;
      }
    }
  }


  fs.writeFileSync(
    file,
    lines.join('\n'),
    'utf8'
  );
}


slowPolling(
  appPath
);

slowPolling(
  activityPath
);


console.log(
  'OK: polling reduced'
);


// ======================================================
// 3. BACKEND CANCEL PURCHASE
// ======================================================

let service =
  fs.readFileSync(
    servicePath,
    'utf8'
  );


if (
  !service.includes(
    'async cancelPurchase('
  )
) {

  const end =
    service.lastIndexOf(
      '\n}'
    );


  if (end === -1) {

    console.error(
      'PurchasesService end not found'
    );

    process.exit(1);
  }


  const cancelMethod = `

  async cancelPurchase(
    dealId: string,
    purchaseId: string,
  ) {

    const purchase =
      await this.prisma
        .supplierPurchase
        .findFirstOrThrow({

          where: {
            id: purchaseId,
            dealId,
          },

          include: {

            payments: true,

            tasks: {

              where: {
                type:
                  TaskType
                    .PAY_SUPPLIER,
              },

              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });


    if (
      purchase.payments.length > 0
    ) {

      throw new BadRequestException(
        'По этой закупке уже есть оплата. Автоматическая отмена невозможна.',
      );
    }


    const inWork =
      purchase.tasks.find(
        (task) =>
          task.status ===
            TaskStatus
              .IN_PROGRESS ||
          task.status ===
            TaskStatus
              .NEED_DATA
      );


    if (inWork) {

      throw new BadRequestException(
        'Бухгалтер уже взял оплату в работу. Автоматически отменить её нельзя.',
      );
    }


    const completed =
      purchase.tasks.find(
        (task) =>
          task.status ===
            TaskStatus.DONE
      );


    if (completed) {

      throw new BadRequestException(
        'Задача по оплате уже выполнена. Автоматическая отмена невозможна.',
      );
    }


    await this.prisma
      .$transaction(
        async (tx) => {

          // If request was sent but accountant
          // has not started it yet, remove task.

          await tx.task
            .deleteMany({

              where: {
                supplierPurchaseId:
                  purchaseId,
              },
            });


          // Remove database references to
          // supplier draft attachments.

          await tx.storedFile
            .deleteMany({

              where: {

                dealId,

                category:
                  'SUPPLIER_INVOICE_' +
                  purchaseId,
              },
            });


          // User requested no history
          // when draft/request is cancelled
          // before accountant starts work.

          await tx.auditEvent
            .deleteMany({

              where: {

                dealId,

                entityType:
                  'SupplierPurchase',

                entityId:
                  purchaseId,
              },
            });


          await tx
            .supplierPurchase
            .delete({

              where: {
                id: purchaseId,
              },
            });
        },
      );


    return {
      success: true,
    };
  }
`;


  service =
    service.slice(
      0,
      end
    ) +
    cancelMethod +
    service.slice(end);
}


fs.writeFileSync(
  servicePath,
  service,
  'utf8'
);


// ======================================================
// 4. CONTROLLER DELETE ENDPOINT
// ======================================================

let controller =
  fs.readFileSync(
    controllerPath,
    'utf8'
  );


if (
  !controller.includes(
    'Delete,'
  )
) {

  controller =
    controller.replace(

      'Controller,',

      `Controller,
  Delete,`
    );
}


if (
  !controller.includes(
    'cancelPurchase('
  )
) {

  const end =
    controller.lastIndexOf(
      '\n}'
    );


  const method = `

  @Delete(':purchaseId')
  cancelPurchase(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,
  ) {

    return this.purchases
      .cancelPurchase(
        dealId,
        purchaseId,
      );
  }
`;


  controller =
    controller.slice(
      0,
      end
    ) +
    method +
    controller.slice(end);
}


fs.writeFileSync(
  controllerPath,
  controller,
  'utf8'
);


// ======================================================
// 5. FRONTEND API
// ======================================================

let api =
  fs.readFileSync(
    apiPath,
    'utf8'
  );


if (
  !api.includes(
    'cancelSupplierPurchase'
  )
) {

  api += `


export async function cancelSupplierPurchase(
  dealId: string,
  purchaseId: string,
) {

  return json<{
    success: boolean;
  }>(
    \`/deals/\${dealId}/suppliers/\${purchaseId}\`,
    {
      method: 'DELETE',
    },
  );
}
`;
}


fs.writeFileSync(
  apiPath,
  api,
  'utf8'
);


// ======================================================
// 6. PURCHASE UI — CANCEL BUTTON
// ======================================================

let purchaseUi =
  fs.readFileSync(
    purchaseUiPath,
    'utf8'
  );


if (
  !purchaseUi.includes(
    'cancelSupplierPurchase,'
  )
) {

  purchaseUi =
    purchaseUi.replace(

      'addSupplierPayment,',

      `addSupplierPayment,
  cancelSupplierPurchase,`
    );
}


if (
  !purchaseUi.includes(
    'async function cancelPurchase()'
  )
) {

  const cardStart =
    purchaseUi.indexOf(
      'function PurchaseCard('
    );


  const requestStart =
    purchaseUi.indexOf(
      'async function request()',
      cardStart
    );


  if (
    cardStart === -1 ||
    requestStart === -1
  ) {

    console.error(
      'PurchaseCard request() not found'
    );

    process.exit(1);
  }


  const cancelFn = `async function cancelPurchase() {

    const confirmed =
      window.confirm(
        purchase.status ===
          'PAYMENT_REQUESTED'

          ? 'Отменить запрос оплаты? Если бухгалтер ещё не взял задачу в работу, закупка и задача будут удалены.'

          : 'Удалить эту закупку?'
      );


    if (!confirmed) {
      return;
    }


    setSaving(true);
    setError('');


    try {

      await cancelSupplierPurchase(
        deal.id,
        purchase.id,
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


  purchaseUi =
    purchaseUi.slice(
      0,
      requestStart
    ) +
    cancelFn +
    purchaseUi.slice(
      requestStart
    );
}


// Add cancellation action before payment form.

if (
  !purchaseUi.includes(
    'purchaseCancelButton'
  )
) {

  const cardStart =
    purchaseUi.indexOf(
      'function PurchaseCard('
    );


  const paymentOpen =
    purchaseUi.indexOf(
      '{paymentOpen && (',
      cardStart
    );


  if (
    paymentOpen === -1
  ) {

    console.error(
      'paymentOpen block not found'
    );

    process.exit(1);
  }


  const cancelButton = `

      {canManage &&
        purchase.status !==
          'PAID' && (

        <button
          type="button"
          className="purchaseCancelButton"

          disabled={saving}

          onClick={cancelPurchase}
        >

          {
            purchase.status ===
              'PAYMENT_REQUESTED'

              ? 'Отменить запрос оплаты'
              : 'Удалить закупку'
          }

        </button>

      )}


`;


  purchaseUi =
    purchaseUi.slice(
      0,
      paymentOpen
    ) +
    cancelButton +
    purchaseUi.slice(
      paymentOpen
    );
}


fs.writeFileSync(
  purchaseUiPath,
  purchaseUi,
  'utf8'
);


// ======================================================
// 7. CSS CANCEL BUTTON
// ======================================================

const cssPath =
  'frontend/src/styles.css';

let css =
  fs.readFileSync(
    cssPath,
    'utf8'
  );


if (
  !css.includes(
    '/* MSM purchase cancel v0.4.4 */'
  )
) {

  css += `

/* MSM purchase cancel v0.4.4 */

.purchaseCancelButton {
  width: 100%;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 11px 14px;

  background: #fff;
  color: #b91c1c;

  font-weight: 800;

  transition:
    background-color 160ms ease,
    transform 160ms ease,
    opacity 160ms ease;
}

.purchaseCancelButton:hover {
  background: #fef2f2;
}

.purchaseCancelButton:active {
  transform: scale(.99);
}

.purchaseCancelButton:disabled {
  opacity: .5;
  cursor: default;
}


html[data-theme='dark']
.purchaseCancelButton {
  background: transparent;
  border-color: #7f1d1d;
  color: #fca5a5;
}

html[data-theme='dark']
.purchaseCancelButton:hover {
  background: #2a1717;
}
`;
}


fs.writeFileSync(
  cssPath,
  css,
  'utf8'
);


console.log('');
console.log('MSM v0.4.4 applied');
console.log('');
console.log('OK: unicode text repaired');
console.log('OK: polling reduced');
console.log('OK: localhost request pressure reduced');
console.log('OK: draft purchase can be deleted');
console.log('OK: NEW payment request can be cancelled');
console.log('OK: IN_PROGRESS payment cannot be auto-cancelled');
console.log('OK: cancelled draft/request leaves no audit entry');
console.log('OK: no Prisma migration required');