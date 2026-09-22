const fs = require('fs');
const path = require('path');

const root = process.cwd();

const controllerPath = path.join(
  root,
  'backend',
  'src',
  'purchases',
  'purchases.controller.ts'
);

const servicePath = path.join(
  root,
  'backend',
  'src',
  'purchases',
  'purchases.service.ts'
);

const apiPath = path.join(
  root,
  'frontend',
  'src',
  'api.ts'
);

const typesPath = path.join(
  root,
  'frontend',
  'src',
  'types.ts'
);

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const cssPath = path.join(
  root,
  'frontend',
  'src',
  'styles.css'
);

const pickerPath = path.join(
  root,
  'frontend',
  'src',
  'MultiFilePicker.tsx'
);

const purchasesUiPath = path.join(
  root,
  'frontend',
  'src',
  'PurchasesBlock.tsx'
);


for (const file of [
  controllerPath,
  servicePath,
  apiPath,
  typesPath,
  appPath,
  cssPath,
]) {

  if (!fs.existsSync(file)) {

    console.error(
      'Не найден файл: ' +
      file
    );

    process.exit(1);
  }
}


function backup(file) {

  const target =
    file + '.bak-v040-ui';

  if (
    !fs.existsSync(target)
  ) {

    fs.copyFileSync(
      file,
      target
    );
  }
}


[
  controllerPath,
  servicePath,
  apiPath,
  typesPath,
  appPath,
  cssPath,
].forEach(backup);


// ======================================================
// BACKEND CONTROLLER
// ======================================================

const controller =
`import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  PurchasesService,
} from './purchases.service';


@Controller('deals/:dealId/suppliers')
export class PurchasesController {

  constructor(
    private readonly purchases:
      PurchasesService,
  ) {}


  @Get()
  list(
    @Param('dealId')
    dealId: string,
  ) {

    return this.purchases.list(
      dealId,
    );
  }


  @Post()
  create(
    @Param('dealId')
    dealId: string,

    @Body()
    body: {
      supplierName?: string;
      incomingInvoiceNumber?: string;
      incomingInvoiceAmount?: number;
      comment?: string;
      createdById: string;
    },
  ) {

    return this.purchases.create(
      dealId,
      body,
    );
  }


  @Patch(':purchaseId')
  update(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Body()
    body: {
      supplierName?: string;
      incomingInvoiceNumber?: string;
      incomingInvoiceAmount?: number;
      comment?: string;
      actorId: string;
    },
  ) {

    return this.purchases.update(
      dealId,
      purchaseId,
      body,
    );
  }


  @Post(':purchaseId/request-payment')
  requestPayment(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Body()
    body: {
      amount?: number;
      comment?: string;
      urgent?: boolean;
      actorId: string;
    },
  ) {

    return this.purchases
      .requestPayment(
        dealId,
        purchaseId,
        body,
      );
  }


  @Post(':purchaseId/payments')
  addPayment(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Body()
    body: {
      amount?: number;
      paidAt?: string;
      paymentOrderStamped?: boolean;
      comment?: string;
      actorId: string;
    },
  ) {

    return this.purchases
      .addPayment(
        dealId,
        purchaseId,
        body,
      );
  }
}
`;


fs.writeFileSync(
  controllerPath,
  controller,
  'utf8'
);


// ======================================================
// BACKEND SERVICE
// ======================================================

let service =
  fs.readFileSync(
    servicePath,
    'utf8'
  );


if (
  !service.includes(
    'async list('
  )
) {

  const marker =
    '  async create(';


  const listMethod =
`  async list(
    dealId: string,
  ) {

    return this.prisma
      .supplierPurchase
      .findMany({

        where: {
          dealId,
        },

        orderBy: {
          createdAt: 'asc',
        },

        include: {

          payments: {

            orderBy: {
              paidAt: 'asc',
            },

            include: {

              actor: {

                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
          },
        },
      });
  }


`;


  if (
    !service.includes(marker)
  ) {

    console.error(
      'Не найден create() в PurchasesService'
    );

    process.exit(1);
  }


  service =
    service.replace(
      marker,
      listMethod +
      marker
    );
}


// Закрываем задачу только когда
// оплачена вся запрошенная сумма.

if (
  !service.includes(
    'const shouldCompleteTask'
  )
) {

  const statusMarker =
    `          const purchaseStatus =`;


  const statusIndex =
    service.indexOf(
      statusMarker
    );


  if (
    statusIndex === -1
  ) {

    console.error(
      'Не найден purchaseStatus'
    );

    process.exit(1);
  }


  const insert =
`          const paymentTarget =
            purchase.requestedAmount
              ? Number(
                  purchase
                    .requestedAmount
                )
              : invoiceAmount;


          const shouldCompleteTask =
            Boolean(
              body.paymentOrderStamped
            ) &&
            (
              paymentTarget === null ||
              totalPaid >=
                paymentTarget
            );


`;


  service =
    service.slice(
      0,
      statusIndex
    ) +
    insert +
    service.slice(
      statusIndex
    );


  service =
    service.replace(
      /if\s*\(\s*body\.paymentOrderStamped\s*\)\s*\{/,

      `if (
            shouldCompleteTask
          ) {`
    );
}


fs.writeFileSync(
  servicePath,
  service,
  'utf8'
);


// ======================================================
// FRONTEND TYPES
// ======================================================

let types =
  fs.readFileSync(
    typesPath,
    'utf8'
  );


if (
  !types.includes(
    'SupplierPurchaseStatus'
  )
) {

  types =
    `export type SupplierPurchaseStatus = 'DRAFT' | 'PAYMENT_REQUESTED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';\n` +
    types;
}


if (
  !types.includes(
    'export type SupplierPayment ='
  )
) {

  const block =
`export type SupplierPayment = {
  id: string;
  purchaseId: string;
  amount: string;
  paidAt: string;
  paymentOrderStamped: boolean;
  comment?: string;
  actor?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  createdAt: string;
};

export type SupplierPurchase = {
  id: string;
  dealId: string;
  supplierName: string;
  incomingInvoiceNumber?: string;
  incomingInvoiceAmount?: string;
  requestedAmount?: string;
  comment?: string;
  status: SupplierPurchaseStatus;
  payments: SupplierPayment[];
  createdAt: string;
  updatedAt: string;
};

`;


  const marker =
    'export type Deal = {';


  if (
    !types.includes(marker)
  ) {

    console.error(
      'Не найден type Deal'
    );

    process.exit(1);
  }


  types =
    types.replace(
      marker,
      block +
      marker
    );
}


if (
  !types.includes(
    'category?: string;'
  )
) {

  types =
    types.replace(

      /(\s+mimeType\?: string;)/,

      `$1
  category?: string;`
    );
}


if (
  !types.includes(
    'files?: StoredFile[];'
  )
) {

  types =
    types.replace(

      /(\s+tasks: DealTask\[\];)/,

      `$1
  files?: StoredFile[];`
    );
}


fs.writeFileSync(
  typesPath,
  types,
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
    "SupplierPurchase } from './types'"
  ) &&
  !api.includes(
    'SupplierPurchase,'
  )
) {

  api =
    `import type { SupplierPayment, SupplierPurchase } from './types';\n` +
    api;
}


// Task supplierPurchase

const taskMatch =
  api.match(
    /export type Task\s*=\s*\{[\s\S]*?\n\};/
  );


if (!taskMatch) {

  console.error(
    'Не найден type Task в api.ts'
  );

  process.exit(1);
}


let taskBlock =
  taskMatch[0];


if (
  !taskBlock.includes(
    'createdAt?: string;'
  )
) {

  taskBlock =
    taskBlock.replace(

      /(\s+description\?: string;)/,

      `$1
  createdAt?: string;
  updatedAt?: string;`
    );
}


if (
  !taskBlock.includes(
    'supplierPurchase?: SupplierPurchase;'
  )
) {

  taskBlock =
    taskBlock.replace(

      /(\s+deal: Deal;)/,

      `$1
  supplierPurchase?: SupplierPurchase;`
    );
}


api =
  api.replace(
    taskMatch[0],
    taskBlock
  );


if (
  !api.includes(
    'listSupplierPurchases'
  )
) {

  api += `


export async function listSupplierPurchases(
  dealId: string,
) {

  return json<SupplierPurchase[]>(
    \`/deals/\${dealId}/suppliers\`
  );
}


export async function createSupplierPurchase(
  dealId: string,

  payload: {
    supplierName?: string;
    incomingInvoiceNumber?: string;
    incomingInvoiceAmount?: number;
    comment?: string;
    createdById: string;
  },
) {

  return json<SupplierPurchase>(
    \`/deals/\${dealId}/suppliers\`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}


export async function requestSupplierPayment(
  dealId: string,
  purchaseId: string,

  payload: {
    amount?: number;
    comment?: string;
    urgent?: boolean;
    actorId: string;
  },
) {

  return json(
    \`/deals/\${dealId}/suppliers/\${purchaseId}/request-payment\`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}


export async function addSupplierPayment(
  dealId: string,
  purchaseId: string,

  payload: {
    amount?: number;
    paidAt?: string;
    paymentOrderStamped?: boolean;
    comment?: string;
    actorId: string;
  },
) {

  return json<SupplierPayment>(
    \`/deals/\${dealId}/suppliers/\${purchaseId}/payments\`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
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
// UNIVERSAL MULTI FILE PICKER
// ======================================================

const picker =
`import {
  useRef,
} from 'react';


export function MultiFilePicker({
  files,
  onChange,
  title = '+ Прикрепить файлы',
}: {
  files: File[];
  onChange: (files: File[]) => void;
  title?: string;
}) {

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  function add(
    fileList:
      FileList | null,
  ) {

    if (!fileList) return;


    const combined = [
      ...files,
      ...Array.from(
        fileList
      ),
    ];


    const unique =
      combined.filter(
        (
          file,
          index,
          all,
        ) =>

          all.findIndex(
            (candidate) =>

              candidate.name ===
                file.name &&

              candidate.size ===
                file.size &&

              candidate.lastModified ===
                file.lastModified

          ) === index
      );


    onChange(unique);
  }


  return (

    <div className="multiFilePicker">

      <button
        type="button"
        className="fileButton"

        onClick={() =>
          inputRef.current
            ?.click()
        }
      >

        {
          files.length
            ? '+ Прикрепить ещё'
            : title
        }

      </button>


      <input
        ref={inputRef}
        type="file"
        multiple
        hidden

        onChange={(event) => {

          add(
            event.target.files
          );

          event.currentTarget.value =
            '';
        }}
      />


      {files.length > 0 && (

        <div className="versionList">

          {files.map(
            (
              file,
              index,
            ) => (

            <div
              className="versionRow"

              key={
                file.name +
                file.size +
                file.lastModified
              }
            >

              <div>

                <b>
                  {file.name}
                </b>

                <span>
                  {
                    (
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)
                  } МБ
                </span>

              </div>


              <button
                type="button"
                className="secondary compactButton"

                onClick={() =>
                  onChange(
                    files.filter(
                      (_, fileIndex) =>
                        fileIndex !==
                        index
                    )
                  )
                }
              >
                Удалить
              </button>

            </div>

          ))}

        </div>

      )}

    </div>
  );
}
`;


fs.writeFileSync(
  pickerPath,
  picker,
  'utf8'
);


// ======================================================
// PURCHASE UI
// ======================================================

const purchaseUi =
`import {
  useEffect,
  useState,
} from 'react';

import {
  addSupplierPayment,
  createSupplierPurchase,
  dealFileUrl,
  listSupplierPurchases,
  requestSupplierPayment,
  updateTaskStatus,
  uploadDealFile,
  type Task,
} from './api';

import type {
  CurrentUser,
  Deal,
  SupplierPurchase,
  SupplierPurchaseStatus,
} from './types';

import {
  MultiFilePicker,
} from './MultiFilePicker';


function money(
  value?: string | number,
) {

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return '—';
  }


  return (
    Number(value)
      .toLocaleString(
        'ru-RU'
      ) +
    ' ₽'
  );
}


function statusLabel(
  status:
    SupplierPurchaseStatus,
) {

  const map:
    Record<
      SupplierPurchaseStatus,
      string
    > = {

    DRAFT:
      'Черновик',

    PAYMENT_REQUESTED:
      'Ожидает оплаты',

    PARTIALLY_PAID:
      'Частично оплачен',

    PAID:
      'Оплачен',

    CANCELLED:
      'Отменён',
  };


  return map[status];
}


function todayLocalDate() {

  const now =
    new Date();


  const local =
    new Date(

      now.getTime() -

      now.getTimezoneOffset() *
        60000
    );


  return local
    .toISOString()
    .slice(0, 10);
}


// ======================================================
// BLOCK IN DEAL
// ======================================================

export function PurchasesBlock({
  deal,
  user,
  onChanged,
}: {
  deal: Deal;
  user: CurrentUser;
  onChanged:
    () =>
      void |
      Promise<void>;
}) {

  const [
    purchases,
    setPurchases,
  ] = useState<
    SupplierPurchase[]
  >([]);


  const [adding, setAdding] =
    useState(false);

  const [
    supplierName,
    setSupplierName,
  ] = useState('');

  const [
    invoiceNumber,
    setInvoiceNumber,
  ] = useState('');

  const [
    invoiceAmount,
    setInvoiceAmount,
  ] = useState('');

  const [comment, setComment] =
    useState('');

  const [files, setFiles] =
    useState<File[]>([]);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  const canManage =
    user.role !==
    'ACCOUNTANT';


  async function reload() {

    setPurchases(
      await listSupplierPurchases(
        deal.id
      )
    );
  }


  useEffect(() => {

    void reload();

  }, [
    deal.id,
  ]);


  async function refreshAll() {

    await reload();
    await onChanged();
  }


  async function create() {

    setSaving(true);
    setError('');


    try {

      const purchase =
        await createSupplierPurchase(
          deal.id,
          {

            supplierName:
              supplierName
                .trim() ||
              undefined,

            incomingInvoiceNumber:
              invoiceNumber
                .trim() ||
              undefined,

            incomingInvoiceAmount:
              invoiceAmount
                ? Number(
                    invoiceAmount
                  )
                : undefined,

            comment:
              comment.trim() ||
              undefined,

            createdById:
              user.id,
          }
        );


      for (
        const file
        of files
      ) {

        await uploadDealFile(
          deal.id,
          file,

          'SUPPLIER_INVOICE_' +
          purchase.id
        );
      }


      setSupplierName('');
      setInvoiceNumber('');
      setInvoiceAmount('');
      setComment('');
      setFiles([]);
      setAdding(false);


      await refreshAll();


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

    <div className="purchaseBox">

      <div className="purchaseHead">

        <div>

          <span>
            Закупка
          </span>

          <strong>
            Поставщики
          </strong>

        </div>


        <b>
          {purchases.length}
        </b>

      </div>


      {purchases.length === 0 && (

        <div className="empty purchaseEmpty">
          Поставщики ещё не добавлены
        </div>

      )}


      {purchases.length > 0 && (

        <div className="purchaseList">

          {purchases.map(
            (purchase) => (

            <PurchaseCard
              key={purchase.id}
              deal={deal}
              purchase={purchase}
              user={user}
              canManage={canManage}
              onChanged={refreshAll}
            />

          ))}

        </div>

      )}


      {canManage && (

        <button
          type="button"

          className={
            adding
              ? 'secondary wide'
              : 'primary wide'
          }

          onClick={() =>
            setAdding(
              (value) =>
                !value
            )
          }
        >

          {
            adding
              ? 'Отменить'
              : '+ Добавить поставщика'
          }

        </button>

      )}


      {adding && (

        <div className="purchaseForm">

          <label className="field">

            <span>
              Поставщик
            </span>

            <input
              value={supplierName}

              onChange={(e) =>
                setSupplierName(
                  e.target.value
                )
              }

              placeholder="Например: Bonolit"
            />

          </label>


          <div className="inline">

            <label className="field">

              <span>
                № входящего счёта
              </span>

              <input
                value={invoiceNumber}

                onChange={(e) =>
                  setInvoiceNumber(
                    e.target.value
                  )
                }

                placeholder="14170"
              />

            </label>


            <label className="field">

              <span>
                Сумма входящего
              </span>

              <input
                inputMode="decimal"

                value={invoiceAmount}

                onChange={(e) =>
                  setInvoiceAmount(
                    e.target.value
                  )
                }

                placeholder="250000"
              />

            </label>

          </div>


          <label className="field">

            <span>
              Комментарий
            </span>

            <textarea
              rows={2}

              value={comment}

              onChange={(e) =>
                setComment(
                  e.target.value
                )
              }

              placeholder="Например: Калуга — предоплата"
            />

          </label>


          <label className="field">

            <span>
              Входящие документы
            </span>

            <MultiFilePicker
              files={files}
              onChange={setFiles}
              title="+ Прикрепить счета"
            />

          </label>


          <button
            type="button"
            className="primary wide"

            disabled={saving}

            onClick={create}
          >

            {
              saving
                ? 'Сохраняем…'
                : 'Добавить поставщика'
            }

          </button>

        </div>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </div>
  );
}


// ======================================================
// PURCHASE CARD
// ======================================================

function PurchaseCard({
  deal,
  purchase,
  user,
  canManage,
  onChanged,
}: {
  deal: Deal;
  purchase: SupplierPurchase;
  user: CurrentUser;
  canManage: boolean;
  onChanged:
    () =>
      void |
      Promise<void>;
}) {

  const [
    paymentOpen,
    setPaymentOpen,
  ] = useState(false);


  const [amount, setAmount] =
    useState(
      purchase.requestedAmount ||
      purchase
        .incomingInvoiceAmount ||
      ''
    );


  const [comment, setComment] =
    useState('');

  const [urgent, setUrgent] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  const paid =
    purchase.payments
      .reduce(
        (
          sum,
          payment,
        ) =>
          sum +
          Number(
            payment.amount
          ),
        0,
      );


  const incomingFiles =
    (
      deal.files || []
    ).filter(
      (file) =>

        file.category ===
        'SUPPLIER_INVOICE_' +
        purchase.id
    );


  const paymentFiles =
    (
      deal.files || []
    ).filter(
      (file) =>

        file.category ===
        'SUPPLIER_PAYMENT_' +
        purchase.id
    );


  async function request() {

    setSaving(true);
    setError('');


    try {

      await requestSupplierPayment(
        deal.id,
        purchase.id,
        {

          amount:
            amount
              ? Number(amount)
              : undefined,

          comment:
            comment.trim() ||
            undefined,

          urgent,

          actorId:
            user.id,
        }
      );


      setPaymentOpen(false);
      setComment('');
      setUrgent(false);

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


  return (

    <div className="purchaseCard">

      <div className="purchaseCardTop">

        <div>

          <strong>
            {purchase.supplierName}
          </strong>

          <span>

            {
              purchase
                .incomingInvoiceNumber

                ? 'Счёт № ' +
                  purchase
                    .incomingInvoiceNumber

                : 'Счёт не указан'
            }

          </span>

        </div>


        <span
          className={
            'purchaseStatus ' +
            'purchaseStatus-' +
            purchase.status
              .toLowerCase()
          }
        >

          {
            statusLabel(
              purchase.status
            )
          }

        </span>

      </div>


      <div className="purchaseNumbers">

        <div>

          <span>
            Входящий
          </span>

          <b>
            {
              money(
                purchase
                  .incomingInvoiceAmount
              )
            }
          </b>

        </div>


        <div>

          <span>
            Оплачено
          </span>

          <b>
            {money(paid)}
          </b>

        </div>

      </div>


      {purchase.comment && (

        <div className="note">
          {purchase.comment}
        </div>

      )}


      {incomingFiles.length > 0 && (

        <div className="purchaseFiles">

          <span>
            Входящие документы
          </span>

          {incomingFiles.map(
            (file) => (

            <a
              key={file.id}

              href={
                dealFileUrl(
                  file.id
                )
              }

              target="_blank"
              rel="noreferrer"
            >
              {file.originalName}
            </a>

          ))}

        </div>

      )}


      {purchase.payments.length > 0 && (

        <div className="supplierPaymentHistory">

          {purchase.payments.map(
            (payment) => (

            <div key={payment.id}>

              <b>
                {
                  money(
                    payment.amount
                  )
                }
              </b>

              <span>

                {
                  new Date(
                    payment.paidAt
                  )
                    .toLocaleDateString(
                      'ru-RU'
                    )
                }

                {' · '}

                {
                  payment
                    .paymentOrderStamped

                    ? 'с печатью'
                    : 'без печати'
                }

              </span>


              {payment.comment && (

                <em>
                  {payment.comment}
                </em>

              )}

            </div>

          ))}

        </div>

      )}


      {paymentFiles.length > 0 && (

        <div className="purchaseFiles">

          <span>
            Платёжные документы
          </span>

          {paymentFiles.map(
            (file) => (

            <a
              key={file.id}

              href={
                dealFileUrl(
                  file.id
                )
              }

              target="_blank"
              rel="noreferrer"
            >
              {file.originalName}
            </a>

          ))}

        </div>

      )}


      {canManage &&
        purchase.status !==
          'PAID' && (

        <button
          type="button"
          className="secondary wide"

          onClick={() =>
            setPaymentOpen(
              (value) =>
                !value
            )
          }
        >

          Оплатить поставщику

        </button>

      )}


      {paymentOpen && (

        <div className="purchaseForm">

          <label className="field">

            <span>
              Сколько оплатить
            </span>

            <input
              inputMode="decimal"

              value={amount}

              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }

              placeholder="Сумма"
            />

          </label>


          <label className="field">

            <span>
              Комментарий бухгалтерии
            </span>

            <textarea
              rows={2}

              value={comment}

              onChange={(e) =>
                setComment(
                  e.target.value
                )
              }
            />

          </label>


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
              Срочно
            </span>

          </label>


          <button
            type="button"
            className="primary wide"

            disabled={saving}

            onClick={request}
          >

            {
              saving
                ? 'Отправляем…'
                : 'Создать задачу бухгалтеру'
            }

          </button>

        </div>

      )}


      {error && (

        <div className="error">
          {error}
        </div>

      )}

    </div>
  );
}


// ======================================================
// ACCOUNTANT TASK
// ======================================================

export function SupplierPaymentTask({
  task,
  user,
  onBack,
}: {
  task: Task;
  user: CurrentUser;
  onBack: () => void;
}) {

  const purchase =
    task.supplierPurchase!;


  const [status, setStatus] =
    useState(task.status);


  const [amount, setAmount] =
    useState(
      purchase.requestedAmount ||
      ''
    );


  const [comment, setComment] =
    useState('');


  const [stamped, setStamped] =
    useState(false);


  const [files, setFiles] =
    useState<File[]>([]);


  const [
    payments,
    setPayments,
  ] = useState(
    purchase.payments || []
  );


  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');


  const incomingFiles =
    (
      task.deal.files || []
    ).filter(
      (file) =>

        file.category ===
        'SUPPLIER_INVOICE_' +
        purchase.id
    );


  const paidAlready =
    payments.reduce(
      (
        sum,
        payment,
      ) =>
        sum +
        Number(
          payment.amount
        ),
      0,
    );


  async function take() {

    setSaving(true);
    setError('');


    try {

      await updateTaskStatus(
        task.id,
        'IN_PROGRESS',
        user.id
      );


      setStatus(
        'IN_PROGRESS'
      );


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


  async function savePayment() {

    setSaving(true);
    setError('');


    try {

      for (
        const file
        of files
      ) {

        await uploadDealFile(
          task.deal.id,
          file,

          'SUPPLIER_PAYMENT_' +
          purchase.id
        );
      }


      const payment =
        await addSupplierPayment(
          task.deal.id,
          purchase.id,
          {

            amount:
              amount
                ? Number(amount)
                : 0,

            paidAt:
              todayLocalDate(),

            paymentOrderStamped:
              stamped,

            comment:
              comment.trim() ||
              undefined,

            actorId:
              user.id,
          }
        );


      const nextPayments = [
        ...payments,
        payment,
      ];


      setPayments(
        nextPayments
      );

      setAmount('');
      setComment('');
      setFiles([]);


      const target =
        purchase.requestedAmount
          ? Number(
              purchase
                .requestedAmount
            )
          : purchase
              .incomingInvoiceAmount
            ? Number(
                purchase
                  .incomingInvoiceAmount
              )
            : null;


      const nextPaid =
        nextPayments.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            Number(
              item.amount
            ),
          0,
        );


      if (
        stamped &&
        (
          target === null ||
          nextPaid >= target
        )
      ) {

        onBack();

      } else {

        setStamped(false);
      }


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
        ← К задачам
      </button>


      <div className="detailHero">

        <div className="eyebrow">
          ЗК-
          {task.deal.internalNumber}
        </div>


        <h2>
          Оплатить поставщику
        </h2>


        <p>
          {purchase.supplierName}
        </p>


        <div className="statusPill">

          {
            status === 'NEW'
              ? 'Новая'
              : status ===
                  'IN_PROGRESS'
                ? 'В работе'
                : status
          }

        </div>


        {task.urgent && (

          <b className="urgent">
            СРОЧНО
          </b>

        )}

      </div>


      <div className="infoBox">

        <strong>
          Данные закупки
        </strong>

        <div className="supplierTaskNumbers">

          <div>

            <span>
              Входящий счёт
            </span>

            <b>
              {
                purchase
                  .incomingInvoiceNumber ||
                '—'
              }
            </b>

          </div>


          <div>

            <span>
              Сумма входящего
            </span>

            <b>
              {
                money(
                  purchase
                    .incomingInvoiceAmount
                )
              }
            </b>

          </div>


          <div>

            <span>
              Нужно оплатить
            </span>

            <b>
              {
                money(
                  purchase
                    .requestedAmount
                )
              }
            </b>

          </div>


          <div>

            <span>
              Уже оплачено
            </span>

            <b>
              {money(paidAlready)}
            </b>

          </div>

        </div>

      </div>


      {task.description && (

        <div className="infoBox">

          <strong>
            Комментарий менеджера
          </strong>

          <p>
            {task.description}
          </p>

        </div>

      )}


      {incomingFiles.length > 0 && (

        <div className="infoBox">

          <strong>
            Входящие документы
          </strong>

          <div className="versionList">

            {incomingFiles.map(
              (file) => (

              <div
                className="versionRow"
                key={file.id}
              >

                <div>
                  <b>
                    {file.originalName}
                  </b>
                </div>

                <a
                  href={
                    dealFileUrl(
                      file.id
                    )
                  }

                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>

              </div>

            ))}

          </div>

        </div>

      )}


      {status === 'NEW' && (

        <button
          className="primary wide"

          disabled={saving}

          onClick={take}
        >

          {
            saving
              ? 'Сохраняем…'
              : 'В работу'
          }

        </button>

      )}


      {status ===
        'IN_PROGRESS' && (

        <>

          <label className="field">

            <span>
              Сумма этой оплаты
            </span>

            <input
              inputMode="decimal"

              value={amount}

              onChange={(e) =>
                setAmount(
                  e.target.value
                )
              }

              placeholder="Сумма"
            />

          </label>


          <label className="field">

            <span>
              Платёжные документы
            </span>

            <MultiFilePicker
              files={files}
              onChange={setFiles}
              title="+ Прикрепить платёжки"
            />

          </label>


          <label className="field">

            <span>
              Комментарий
            </span>

            <textarea
              rows={2}

              value={comment}

              onChange={(e) =>
                setComment(
                  e.target.value
                )
              }
            />

          </label>


          <label className="stampToggle">

            <input
              type="checkbox"

              checked={stamped}

              onChange={(e) =>
                setStamped(
                  e.target.checked
                )
              }
            />


            <div>

              <strong>
                Платёжка с печатью
              </strong>

              <span>
                При частичной оплате
                задача останется
                в работе.
              </span>

            </div>

          </label>


          <button
            type="button"
            className="primary wide"

            disabled={saving}

            onClick={savePayment}
          >

            {
              saving
                ? 'Сохраняем…'
                : 'Сохранить оплату'
            }

          </button>

        </>

      )}


      {payments.length > 0 && (

        <div className="infoBox">

          <strong>
            История оплат
          </strong>

          <div className="supplierPaymentHistory">

            {payments.map(
              (payment) => (

              <div key={payment.id}>

                <b>
                  {
                    money(
                      payment.amount
                    )
                  }
                </b>

                <span>

                  {
                    new Date(
                      payment.paidAt
                    )
                      .toLocaleDateString(
                        'ru-RU'
                      )
                  }

                  {' · '}

                  {
                    payment
                      .paymentOrderStamped

                      ? 'с печатью'
                      : 'без печати'
                  }

                </span>


                {payment.comment && (

                  <em>
                    {payment.comment}
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


fs.writeFileSync(
  purchasesUiPath,
  purchaseUi,
  'utf8'
);


// ======================================================
// APP.TSX
// ======================================================

let app =
  fs.readFileSync(
    appPath,
    'utf8'
  );


if (
  !app.includes(
    "from './PurchasesBlock'"
  )
) {

  app =
`import {
  PurchasesBlock,
  SupplierPaymentTask,
} from './PurchasesBlock';
` +
    app;
}


// Добавляем закупку после PaymentBlock.

if (
  !app.includes(
    '<PurchasesBlock'
  )
) {

  const paymentRegex =
    /<PaymentBlock[\s\S]*?\/>/;


  const paymentMatch =
    app.match(
      paymentRegex
    );


  if (!paymentMatch) {

    console.error(
      'Не найден <PaymentBlock /> в App.tsx'
    );

    process.exit(1);
  }


  const purchasesBlock =
`${paymentMatch[0]}

    <PurchasesBlock
      deal={deal}
      user={user}
      onChanged={() =>
        reload(false)
      }
    />`;


  app =
    app.replace(
      paymentMatch[0],
      purchasesBlock
    );
}


// В TasksView PAY_SUPPLIER
// открывается отдельным экраном.

if (
  !app.includes(
    "selected.type === 'PAY_SUPPLIER'"
  )
) {

  const tasksStart =
    app.indexOf(
      'function TasksView('
    );

  const detailStart =
    app.indexOf(
      'function TaskDetail(',
      tasksStart
    );


  if (
    tasksStart === -1 ||
    detailStart === -1
  ) {

    console.error(
      'Не найден TasksView'
    );

    process.exit(1);
  }


  let tasksSection =
    app.slice(
      tasksStart,
      detailStart
    );


  const detailRegex =
    /<TaskDetail[\s\S]*?\/>/;


  const match =
    tasksSection.match(
      detailRegex
    );


  if (!match) {

    console.error(
      'Не найден <TaskDetail /> внутри TasksView'
    );

    process.exit(1);
  }


  const replacement =
`{selected.type === 'PAY_SUPPLIER' &&
  selected.supplierPurchase ? (

    <SupplierPaymentTask
      task={selected}
      user={user}

      onBack={() => {

        window.location.hash =
          '#tasks';

        setSelected(null);

        void reloadTasks(
          false
        );

        onChanged();
      }}
    />

  ) : (

    ${match[0]}

  )}`;


  tasksSection =
    tasksSection.replace(
      match[0],
      replacement
    );


  app =
    app.slice(
      0,
      tasksStart
    ) +
    tasksSection +
    app.slice(
      detailStart
    );
}


fs.writeFileSync(
  appPath,
  app,
  'utf8'
);


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
    '/* MSM purchases v0.4.0 */'
  )
) {

  css += `

/* MSM purchases v0.4.0 */

.purchaseBox {
  display: grid;
  gap: 12px;
  background: #fff;
  border: 1px solid #e7e5e4;
  border-radius: 18px;
  padding: 14px;
}

.purchaseHead,
.purchaseCardTop {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.purchaseHead span,
.purchaseCardTop span {
  display: block;
  color: #78716c;
  font-size: 11px;
}

.purchaseHead strong,
.purchaseCardTop strong {
  display: block;
  margin-top: 2px;
  font-size: 16px;
}

.purchaseEmpty {
  padding: 12px 4px;
}

.purchaseList {
  display: grid;
  gap: 10px;
}

.purchaseCard {
  display: grid;
  gap: 11px;
  padding: 13px;
  border: 1px solid #e7e5e4;
  border-radius: 14px;
  background: #fafaf9;
  animation: msmFadeUp 180ms ease-out both;
}

.purchaseNumbers {
  display: flex;
  gap: 24px;
}

.purchaseNumbers div {
  min-width: 105px;
}

.purchaseNumbers span,
.supplierTaskNumbers span {
  display: block;
  color: #78716c;
  font-size: 11px;
}

.purchaseNumbers b,
.supplierTaskNumbers b {
  display: block;
  margin-top: 3px;
}

.purchaseStatus {
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 11px !important;
  font-weight: 800;
  white-space: nowrap;
}

.purchaseStatus-draft {
  background: #e7e5e4;
  color: #57534e !important;
}

.purchaseStatus-payment_requested {
  background: #fef3c7;
  color: #92400e !important;
}

.purchaseStatus-partially_paid {
  background: #dbeafe;
  color: #1d4ed8 !important;
}

.purchaseStatus-paid {
  background: #dcfce7;
  color: #166534 !important;
}

.purchaseStatus-cancelled {
  background: #e7e5e4;
  color: #78716c !important;
}

.purchaseForm {
  display: grid;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #f0efed;
  animation: msmFadeUp 180ms ease-out both;
}

.purchaseFiles {
  display: grid;
  gap: 5px;
}

.purchaseFiles > span {
  color: #78716c;
  font-size: 11px;
  font-weight: 700;
}

.purchaseFiles a {
  color: #171717;
  font-size: 12px;
  font-weight: 800;
}

.supplierPaymentHistory {
  display: grid;
  gap: 7px;
}

.supplierPaymentHistory > div {
  padding: 9px 10px;
  border-radius: 11px;
  background: #fff;
}

.supplierPaymentHistory b,
.supplierPaymentHistory span,
.supplierPaymentHistory em {
  display: block;
}

.supplierPaymentHistory span {
  margin-top: 2px;
  color: #78716c;
  font-size: 11px;
}

.supplierPaymentHistory em {
  margin-top: 3px;
  color: #57534e;
  font-size: 11px;
  font-style: normal;
}

.multiFilePicker {
  display: grid;
  gap: 8px;
}

.compactButton {
  padding: 7px 10px;
  border-radius: 10px;
  font-size: 11px;
}

.stampToggle {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #d6d3d1;
  border-radius: 12px;
  background: #fafaf9;
}

.stampToggle input {
  margin-top: 3px;
}

.stampToggle strong,
.stampToggle span {
  display: block;
}

.stampToggle span {
  margin-top: 3px;
  color: #78716c;
  font-size: 11px;
}

.supplierTaskNumbers {
  display: grid;
  grid-template-columns:
    1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

@media (max-width: 520px) {

  .purchaseNumbers {
    gap: 14px;
  }

  .supplierTaskNumbers {
    grid-template-columns:
      1fr 1fr;
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
console.log(
  'ГОТОВО — MSM v0.4.0 UI'
);

console.log('');
console.log(
  '✓ Блок Закупка в сделке'
);

console.log(
  '✓ Несколько поставщиков'
);

console.log(
  '✓ Несколько входящих файлов'
);

console.log(
  '✓ Оплатить поставщику'
);

console.log(
  '✓ Задача бухгалтеру'
);

console.log(
  '✓ В работу без выхода'
);

console.log(
  '✓ Несколько платёжек'
);

console.log(
  '✓ Частичные оплаты'
);

console.log(
  '✓ История оплат'
);

console.log(
  '✓ Полная сумма закрывает задачу'
);