const fs = require('fs');
const path = require('path');

const root = process.cwd();

const servicePath = path.join(
  root,
  'backend',
  'src',
  'purchases',
  'purchases.service.ts'
);

const controllerPath = path.join(
  root,
  'backend',
  'src',
  'purchases',
  'purchases.controller.ts'
);

const apiPath = path.join(
  root,
  'frontend',
  'src',
  'api.ts'
);

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const purchasesPath = path.join(
  root,
  'frontend',
  'src',
  'PurchasesBlock.tsx'
);

const cssPath = path.join(
  root,
  'frontend',
  'src',
  'styles.css'
);

const backgroundPath = path.join(
  root,
  'frontend',
  'src',
  'backgroundUploads.tsx'
);


for (const file of [
  servicePath,
  controllerPath,
  apiPath,
  appPath,
  purchasesPath,
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
    file + '.bak-v041';

  if (!fs.existsSync(target)) {

    fs.copyFileSync(
      file,
      target
    );
  }
}


[
  servicePath,
  controllerPath,
  apiPath,
  appPath,
  purchasesPath,
  cssPath,
].forEach(backup);


// ======================================================
// BACKEND CONTROLLER
// ======================================================

const controller = `
import {
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
    body: any,
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
    body: any,
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
    body: any,
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
    body: any,
  ) {

    return this.purchases
      .addPayment(
        dealId,
        purchaseId,
        body,
      );
  }


  @Patch(
    ':purchaseId/payments/:paymentId/stamped'
  )
  markStamped(
    @Param('dealId')
    dealId: string,

    @Param('purchaseId')
    purchaseId: string,

    @Param('paymentId')
    paymentId: string,

    @Body()
    body: {
      actorId: string;
    },
  ) {

    return this.purchases
      .markPaymentStamped(
        dealId,
        purchaseId,
        paymentId,
        body.actorId,
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

const service = `
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import {
  SupplierPurchaseStatus,
  TaskStatus,
  TaskType,
} from '@prisma/client';

import {
  PrismaService,
} from '../prisma/prisma.service';


@Injectable()
export class PurchasesService {

  constructor(
    private readonly prisma:
      PrismaService,
  ) {}


  async list(
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


  async create(
    dealId: string,
    body: any,
  ) {

    const purchase =
      await this.prisma
        .supplierPurchase
        .create({

          data: {

            dealId,

            supplierName:
              body.supplierName
                ?.trim() ||
              'Тестовый поставщик',

            incomingInvoiceNumber:
              body
                .incomingInvoiceNumber
                ?.trim() ||
              undefined,

            incomingInvoiceAmount:
              body
                .incomingInvoiceAmount,

            comment:
              body.comment
                ?.trim() ||
              undefined,

            createdById:
              body.createdById,
          },

          include: {
            payments: true,
          },
        });


    await this.prisma
      .auditEvent
      .create({

        data: {

          dealId,

          actorId:
            body.createdById,

          action:
            'SUPPLIER_PURCHASE_CREATED',

          entityType:
            'SupplierPurchase',

          entityId:
            purchase.id,

          newValue: {
            supplierName:
              purchase.supplierName,
          },
        },
      });


    return purchase;
  }


  async update(
    dealId: string,
    purchaseId: string,
    body: any,
  ) {

    return this.prisma
      .supplierPurchase
      .update({

        where: {
          id: purchaseId,
        },

        data: {

          supplierName:
            body.supplierName,

          incomingInvoiceNumber:
            body
              .incomingInvoiceNumber,

          incomingInvoiceAmount:
            body
              .incomingInvoiceAmount,

          comment:
            body.comment,
        },

        include: {
          payments: true,
        },
      });
  }


  async requestPayment(
    dealId: string,
    purchaseId: string,
    body: any,
  ) {

    const purchase =
      await this.prisma
        .supplierPurchase
        .findFirstOrThrow({

          where: {
            id: purchaseId,
            dealId,
          },
        });


    const existing =
      await this.prisma
        .task
        .findFirst({

          where: {

            supplierPurchaseId:
              purchaseId,

            type:
              TaskType.PAY_SUPPLIER,

            status: {

              notIn: [
                TaskStatus.DONE,
                TaskStatus.CANCELLED,
              ],
            },
          },
        });


    if (existing) {

      throw new BadRequestException(
        'По этому поставщику уже есть активная задача на оплату',
      );
    }


    return this.prisma
      .$transaction(
        async (tx) => {

          await tx
            .supplierPurchase
            .update({

              where: {
                id: purchaseId,
              },

              data: {

                requestedAmount:
                  body.amount,

                status:
                  SupplierPurchaseStatus
                    .PAYMENT_REQUESTED,
              },
            });


          const task =
            await tx.task.create({

              data: {

                dealId,

                supplierPurchaseId:
                  purchaseId,

                type:
                  TaskType.PAY_SUPPLIER,

                title:
                  'Оплатить поставщику: ' +
                  purchase.supplierName,

                description:
                  body.comment
                    ?.trim() ||
                  purchase.comment ||
                  undefined,

                urgent:
                  Boolean(
                    body.urgent
                  ),

                createdById:
                  body.actorId,
              },
            });


          await tx
            .auditEvent
            .create({

              data: {

                dealId,

                actorId:
                  body.actorId,

                action:
                  'SUPPLIER_PAYMENT_REQUESTED',

                entityType:
                  'SupplierPurchase',

                entityId:
                  purchaseId,

                newValue: {
                  amount:
                    body.amount,

                  supplierName:
                    purchase
                      .supplierName,
                },
              },
            });


          return task;
        },
      );
  }


  private paymentState(
    purchase: any,
    payments: any[],
  ) {

    const totalPaid =
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


    const financiallyComplete =
      target === null
        ? totalPaid > 0
        : totalPaid >= target;


    const allStamped =
      payments.length > 0 &&
      payments.every(
        (payment) =>
          payment
            .paymentOrderStamped
      );


    const complete =
      financiallyComplete &&
      allStamped;


    return {
      totalPaid,
      target,
      financiallyComplete,
      allStamped,
      complete,
    };
  }


  async addPayment(
    dealId: string,
    purchaseId: string,
    body: any,
  ) {

    const amount =
      Number(
        body.amount || 0
      );


    return this.prisma
      .$transaction(
        async (tx) => {

          const purchase =
            await tx
              .supplierPurchase
              .findFirstOrThrow({

                where: {
                  id: purchaseId,
                  dealId,
                },

                include: {
                  payments: true,
                },
              });


          const payment =
            await tx
              .supplierPayment
              .create({

                data: {

                  purchaseId,

                  amount,

                  paidAt:
                    body.paidAt
                      ? new Date(
                          body.paidAt
                        )
                      : new Date(),

                  paymentOrderStamped:
                    Boolean(
                      body
                        .paymentOrderStamped
                    ),

                  comment:
                    body.comment
                      ?.trim() ||
                    undefined,

                  actorId:
                    body.actorId,
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
              });


          const state =
            this.paymentState(
              purchase,
              [
                ...purchase.payments,
                payment,
              ],
            );


          const nextStatus =
            state.complete

              ? SupplierPurchaseStatus.PAID

              : state.totalPaid > 0

                ? SupplierPurchaseStatus
                    .PARTIALLY_PAID

                : SupplierPurchaseStatus
                    .PAYMENT_REQUESTED;


          await tx
            .supplierPurchase
            .update({

              where: {
                id: purchaseId,
              },

              data: {
                status:
                  nextStatus,
              },
            });


          if (
            state.complete
          ) {

            await tx.task
              .updateMany({

                where: {

                  supplierPurchaseId:
                    purchaseId,

                  type:
                    TaskType
                      .PAY_SUPPLIER,

                  status: {

                    notIn: [
                      TaskStatus.DONE,
                      TaskStatus.CANCELLED,
                    ],
                  },
                },

                data: {

                  status:
                    TaskStatus.DONE,

                  completedAt:
                    new Date(),
                },
              });
          }


          await tx
            .auditEvent
            .create({

              data: {

                dealId,

                actorId:
                  body.actorId,

                action:
                  'SUPPLIER_PAYMENT_ADDED',

                entityType:
                  'SupplierPayment',

                entityId:
                  payment.id,

                newValue: {

                  supplierName:
                    purchase
                      .supplierName,

                  amount,

                  paymentOrderStamped:
                    Boolean(
                      body
                        .paymentOrderStamped
                    ),

                  totalPaid:
                    state.totalPaid,
                },
              },
            });


          return payment;
        },
      );
  }


  async markPaymentStamped(
    dealId: string,
    purchaseId: string,
    paymentId: string,
    actorId: string,
  ) {

    return this.prisma
      .$transaction(
        async (tx) => {

          const purchase =
            await tx
              .supplierPurchase
              .findFirstOrThrow({

                where: {
                  id: purchaseId,
                  dealId,
                },
              });


          const existing =
            await tx
              .supplierPayment
              .findFirstOrThrow({

                where: {
                  id: paymentId,
                  purchaseId,
                },
              });


          const updated =
            await tx
              .supplierPayment
              .update({

                where: {
                  id: paymentId,
                },

                data: {
                  paymentOrderStamped:
                    true,
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
              });


          const payments =
            await tx
              .supplierPayment
              .findMany({

                where: {
                  purchaseId,
                },

                orderBy: {
                  paidAt: 'asc',
                },
              });


          const state =
            this.paymentState(
              purchase,
              payments,
            );


          await tx
            .supplierPurchase
            .update({

              where: {
                id: purchaseId,
              },

              data: {

                status:
                  state.complete

                    ? SupplierPurchaseStatus
                        .PAID

                    : state.totalPaid > 0

                      ? SupplierPurchaseStatus
                          .PARTIALLY_PAID

                      : SupplierPurchaseStatus
                          .PAYMENT_REQUESTED,
              },
            });


          if (
            state.complete
          ) {

            await tx.task
              .updateMany({

                where: {

                  supplierPurchaseId:
                    purchaseId,

                  type:
                    TaskType
                      .PAY_SUPPLIER,

                  status: {

                    notIn: [
                      TaskStatus.DONE,
                      TaskStatus.CANCELLED,
                    ],
                  },
                },

                data: {

                  status:
                    TaskStatus.DONE,

                  completedAt:
                    new Date(),
                },
              });
          }


          await tx
            .auditEvent
            .create({

              data: {

                dealId,

                actorId,

                action:
                  'SUPPLIER_PAYMENT_STAMPED',

                entityType:
                  'SupplierPayment',

                entityId:
                  paymentId,

                oldValue: {
                  paymentOrderStamped:
                    existing
                      .paymentOrderStamped,
                },

                newValue: {
                  paymentOrderStamped:
                    true,

                  supplierName:
                    purchase
                      .supplierName,
                },
              },
            });


          return updated;
        },
      );
  }
}
`;

fs.writeFileSync(
  servicePath,
  service,
  'utf8'
);


// ======================================================
// API: upload progress + stamp endpoint
// ======================================================

let api =
  fs.readFileSync(
    apiPath,
    'utf8'
  );


const uploadStart =
  api.indexOf(
    'export async function uploadDealFile('
  );

const fileUrlStart =
  api.indexOf(
    'export function dealFileUrl',
    uploadStart
  );


if (
  uploadStart === -1 ||
  fileUrlStart === -1
) {

  console.error(
    'Не найден uploadDealFile в api.ts'
  );

  process.exit(1);
}


const uploadFunctions = `
export function uploadDealFileWithProgress(
  dealId: string,
  file: File,
  category: string,
  onProgress?: (
    percent: number
  ) => void,
): Promise<{ id: string }> {

  return new Promise(
    (
      resolve,
      reject,
    ) => {

      const form =
        new FormData();

      form.append(
        'file',
        file
      );

      form.append(
        'category',
        category
      );


      const xhr =
        new XMLHttpRequest();


      xhr.open(
        'POST',
        \`\${API}/files/deal/\${dealId}\`
      );


      xhr.upload.onprogress =
        (event) => {

          if (
            !event.lengthComputable
          ) {
            return;
          }


          const percent =
            Math.round(
              (
                event.loaded /
                event.total
              ) *
              100
            );


          onProgress?.(
            percent
          );
        };


      xhr.onload = () => {

        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {

          try {

            resolve(
              JSON.parse(
                xhr.responseText
              )
            );

          } catch {

            reject(
              new Error(
                'Некорректный ответ сервера'
              )
            );
          }

          return;
        }


        reject(
          new Error(
            xhr.responseText ||
            'Ошибка загрузки файла'
          )
        );
      };


      xhr.onerror = () => {

        reject(
          new Error(
            'Ошибка соединения при загрузке файла'
          )
        );
      };


      xhr.send(form);
    }
  );
}


export async function uploadDealFile(
  dealId: string,
  file: File,
  category: string,
) {

  return uploadDealFileWithProgress(
    dealId,
    file,
    category,
  );
}


`;


api =
  api.slice(
    0,
    uploadStart
  ) +
  uploadFunctions +
  api.slice(
    fileUrlStart
  );


if (
  !api.includes(
    'markSupplierPaymentStamped'
  )
) {

  api += `


export async function markSupplierPaymentStamped(
  dealId: string,
  purchaseId: string,
  paymentId: string,
  actorId: string,
) {

  return json(
    \`/deals/\${dealId}/suppliers/\${purchaseId}/payments/\${paymentId}/stamped\`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        actorId,
      }),
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
// BACKGROUND UPLOAD QUEUE
// ======================================================

const background = `
import {
  useEffect,
  useState,
} from 'react';

import {
  uploadDealFileWithProgress,
} from './api';


export type BackgroundUploadJob = {

  id: string;

  taskId?: string;

  title: string;

  subtitle?: string;

  status:
    | 'RUNNING'
    | 'SUCCESS'
    | 'ERROR';

  progress: number;

  currentFile?: string;

  completedFiles: number;

  totalFiles: number;

  error?: string;
};


let jobs:
  BackgroundUploadJob[] = [];


const listeners =
  new Set<
    (
      jobs:
        BackgroundUploadJob[]
    ) => void
  >();


function emit() {

  const snapshot =
    [...jobs];


  for (
    const listener
    of listeners
  ) {

    listener(
      snapshot
    );
  }
}


function updateJob(
  id: string,
  patch:
    Partial<
      BackgroundUploadJob
    >,
) {

  jobs =
    jobs.map(
      (job) =>
        job.id === id
          ? {
              ...job,
              ...patch,
            }
          : job
    );


  emit();
}


export function dismissBackgroundUpload(
  id: string,
) {

  jobs =
    jobs.filter(
      (job) =>
        job.id !== id
    );


  emit();
}


export function useBackgroundUploads() {

  const [
    value,
    setValue,
  ] = useState<
    BackgroundUploadJob[]
  >([...jobs]);


  useEffect(
    () => {

      listeners.add(
        setValue
      );


      setValue(
        [...jobs]
      );


      return () => {

        listeners.delete(
          setValue
        );
      };
    },

    [],
  );


  return value;
}


export function startBackgroundUploadJob(
  options: {

    taskId?: string;

    title: string;

    subtitle?: string;

    files: File[];

    run: (
      helpers: {

        upload: (
          dealId: string,
          file: File,
          category: string,
          index: number,
          total: number,
        ) =>
          Promise<{
            id: string;
          }>;

        setProgress: (
          percent: number
        ) => void;
      },
    ) =>
      Promise<void>;
  },
) {

  const id =
    'upload-' +
    Date.now() +
    '-' +
    Math.random()
      .toString(36)
      .slice(2);


  const totalFiles =
    options.files.length;


  jobs = [
    {
      id,

      taskId:
        options.taskId,

      title:
        options.title,

      subtitle:
        options.subtitle,

      status:
        'RUNNING',

      progress:
        totalFiles
          ? 0
          : 15,

      completedFiles:
        0,

      totalFiles,
    },

    ...jobs,
  ];


  emit();


  void (
    async () => {

      try {

        await options.run({

          setProgress:
            (percent) => {

              updateJob(
                id,
                {
                  progress:
                    Math.max(
                      0,
                      Math.min(
                        99,
                        percent
                      )
                    ),
                }
              );
            },


          upload:
            async (
              dealId,
              file,
              category,
              index,
              total,
            ) => {

              updateJob(
                id,
                {
                  currentFile:
                    file.name,
                }
              );


              const uploaded =
                await uploadDealFileWithProgress(
                  dealId,
                  file,
                  category,

                  (
                    filePercent,
                  ) => {

                    const denominator =
                      Math.max(
                        total,
                        1
                      );


                    const overall =
                      (
                        (
                          index +
                          filePercent /
                            100
                        ) /
                        denominator
                      ) *
                      90;


                    updateJob(
                      id,
                      {
                        progress:
                          Math.round(
                            overall
                          ),
                      }
                    );
                  }
                );


              updateJob(
                id,
                {
                  completedFiles:
                    index + 1,

                  progress:
                    Math.round(
                      (
                        (
                          index + 1
                        ) /
                        Math.max(
                          total,
                          1
                        )
                      ) *
                      90
                    ),
                }
              );


              return uploaded;
            },
        });


        updateJob(
          id,
          {
            status:
              'SUCCESS',

            progress:
              100,

            currentFile:
              undefined,
          }
        );


        window.setTimeout(
          () => {

            dismissBackgroundUpload(
              id
            );
          },

          1800,
        );


      } catch (error) {

        updateJob(
          id,
          {
            status:
              'ERROR',

            error:
              error instanceof Error
                ? error.message
                : String(error),

            currentFile:
              undefined,
          }
        );
      }
    }
  )();


  return id;
}


export function BackgroundUploadList({
  jobs,
}: {
  jobs:
    BackgroundUploadJob[];
}) {

  if (
    jobs.length === 0
  ) {
    return null;
  }


  return (

    <div className="backgroundUploadList">

      {jobs.map(
        (job) => (

        <div
          key={job.id}

          className={
            'backgroundUploadCard ' +
            'backgroundUpload-' +
            job.status
              .toLowerCase()
          }
        >

          <div className="backgroundUploadTop">

            <div>

              <strong>
                {
                  job.status ===
                  'SUCCESS'

                    ? '✓ ' +
                      job.title

                    : job.status ===
                        'ERROR'

                      ? 'Ошибка загрузки'

                      : job.title
                }
              </strong>


              {job.subtitle && (

                <span>
                  {job.subtitle}
                </span>

              )}

            </div>


            <b>
              {job.progress}%
            </b>

          </div>


          <div className="backgroundUploadBar">

            <div
              style={{
                width:
                  job.progress +
                  '%',
              }}
            />

          </div>


          {job.status ===
            'RUNNING' && (

            <div className="backgroundUploadMeta">

              {job.totalFiles > 0
                ? (
                    job.completedFiles +
                    ' из ' +
                    job.totalFiles +
                    ' файлов'
                  )
                : 'Сохраняем данные…'}

              {job.currentFile &&
                ' · ' +
                job.currentFile}

            </div>

          )}


          {job.status ===
            'ERROR' && (

            <>

              <div className="backgroundUploadError">
                {job.error}
              </div>

              <button
                type="button"
                className="secondary compactButton"

                onClick={() =>
                  dismissBackgroundUpload(
                    job.id
                  )
                }
              >
                Скрыть
              </button>

            </>

          )}

        </div>

      ))}

    </div>
  );
}
`;

fs.writeFileSync(
  backgroundPath,
  background,
  'utf8'
);


// ======================================================
// PURCHASES BLOCK — imports
// ======================================================

let purchases =
  fs.readFileSync(
    purchasesPath,
    'utf8'
  );


if (
  !purchases.includes(
    'markSupplierPaymentStamped'
  )
) {

  purchases =
    purchases.replace(

      'addSupplierPayment,',

      `addSupplierPayment,
  markSupplierPaymentStamped,`
    );
}


if (
  !purchases.includes(
    "from './backgroundUploads'"
  )
) {

  purchases =
`import {
  startBackgroundUploadJob,
} from './backgroundUploads';

` +
    purchases;
}


// ======================================================
// Better supplier status
// ======================================================

if (
  !purchases.includes(
    'function waitingForStampedDocument'
  )
) {

  const marker =
    'function todayLocalDate()';


  const helper =
`function waitingForStampedDocument(
  purchase: SupplierPurchase,
) {

  const paid =
    purchase.payments.reduce(
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


  const financiallyPaid =
    target === null
      ? paid > 0
      : paid >= target;


  return (
    financiallyPaid &&
    purchase.payments.some(
      (payment) =>
        !payment
          .paymentOrderStamped
    )
  );
}


function purchaseDisplayStatus(
  purchase: SupplierPurchase,
) {

  if (
    waitingForStampedDocument(
      purchase
    )
  ) {

    return 'Оплачено · ждём платёжку с печатью';
  }


  return statusLabel(
    purchase.status
  );
}


`;


  if (
    !purchases.includes(marker)
  ) {

    console.error(
      'Не найден todayLocalDate в PurchasesBlock'
    );

    process.exit(1);
  }


  purchases =
    purchases.replace(
      marker,
      helper +
      marker
    );
}


purchases =
  purchases.replace(
    /statusLabel\(\s*purchase\.status\s*\)/g,

    'purchaseDisplayStatus(purchase)'
  );


// ======================================================
// Replace SupplierPaymentTask entirely
// ======================================================

const supplierTaskStart =
  purchases.indexOf(
    'export function SupplierPaymentTask('
  );


if (
  supplierTaskStart === -1
) {

  console.error(
    'Не найден SupplierPaymentTask'
  );

  process.exit(1);
}


const supplierTask = `
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


  const [
    stampPaymentId,
    setStampPaymentId,
  ] = useState<
    string | null
  >(null);


  const [
    stampFiles,
    setStampFiles,
  ] = useState<File[]>([]);


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


  const financiallyPaid =
    target === null
      ? paidAlready > 0
      : paidAlready >= target;


  const waitingStamp =
    financiallyPaid &&
    payments.some(
      (payment) =>
        !payment
          .paymentOrderStamped
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


  function savePayment() {

    setError('');


    if (
      stamped &&
      files.length === 0
    ) {

      setError(
        'Если ставите «с печатью», прикрепите платёжку.'
      );

      return;
    }


    const paymentAmount =
      amount
        ? Number(amount)
        : 0;


    const filesToUpload =
      [...files];


    const commentToSave =
      comment.trim() ||
      undefined;


    const stampedValue =
      stamped;


    setFiles([]);
    setAmount('');
    setComment('');
    setStamped(false);


    startBackgroundUploadJob({

      taskId:
        task.id,

      title:
        'Отправляем оплату',

      subtitle:
        purchase.supplierName,

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
              task.deal.id,

              filesToUpload[
                index
              ],

              'SUPPLIER_PAYMENT_' +
              purchase.id,

              index,

              filesToUpload.length,
            );
          }


          setProgress(94);


          await addSupplierPayment(
            task.deal.id,
            purchase.id,
            {

              amount:
                paymentAmount,

              paidAt:
                todayLocalDate(),

              paymentOrderStamped:
                stampedValue,

              comment:
                commentToSave,

              actorId:
                user.id,
            }
          );


          setProgress(99);
        },
    });


    onBack();
  }


  function sendStampedDocument(
    paymentId: string,
  ) {

    setError('');


    if (
      stampFiles.length === 0
    ) {

      setError(
        'Прикрепите платёжку с печатью.'
      );

      return;
    }


    const filesToUpload =
      [...stampFiles];


    setStampFiles([]);
    setStampPaymentId(null);


    startBackgroundUploadJob({

      taskId:
        task.id,

      title:
        'Загружаем платёжку с печатью',

      subtitle:
        purchase.supplierName,

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
              task.deal.id,

              filesToUpload[
                index
              ],

              'SUPPLIER_PAYMENT_STAMP_' +
              paymentId,

              index,

              filesToUpload.length,
            );
          }


          setProgress(94);


          await markSupplierPaymentStamped(
            task.deal.id,
            purchase.id,
            paymentId,
            user.id,
          );


          setProgress(99);
        },
    });


    onBack();
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
            waitingStamp
              ? 'Оплачено · ждём документ'

              : status === 'NEW'
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


          <div>

            <span>
              Документы
            </span>

            <b>
              {
                waitingStamp
                  ? 'Ждём печать'
                  : financiallyPaid
                    ? 'Готово'
                    : 'Оплата'
              }
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
        'IN_PROGRESS' &&
        !financiallyPaid && (

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
                Если печати пока нет —
                не отмечайте.
                Её можно добавить позже.
              </span>

            </div>

          </label>


          <button
            type="button"
            className="primary wide"

            onClick={savePayment}
          >
            Отправить оплату
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

              <div
                key={payment.id}
                className={
                  payment
                    .paymentOrderStamped
                    ? 'supplierPaymentStamped'
                    : 'supplierPaymentNoStamp'
                }
              >

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

                      ? '✓ Платёжка с печатью'
                      : '● Платёжка без печати'
                  }

                </span>


                {payment.comment && (

                  <em>
                    {payment.comment}
                  </em>

                )}


                {!payment
                  .paymentOrderStamped && (

                  <button
                    type="button"
                    className="stampAddButton"

                    onClick={() => {

                      setStampPaymentId(
                        stampPaymentId ===
                          payment.id
                          ? null
                          : payment.id
                      );

                      setStampFiles([]);
                    }}
                  >

                    + Добавить с печатью

                  </button>

                )}


                {stampPaymentId ===
                  payment.id && (

                  <div className="stampUploadBox">

                    <MultiFilePicker
                      files={stampFiles}
                      onChange={setStampFiles}
                      title="+ Выбрать платёжку с печатью"
                    />


                    <button
                      type="button"
                      className="primary wide"

                      disabled={
                        stampFiles.length ===
                        0
                      }

                      onClick={() =>
                        sendStampedDocument(
                          payment.id
                        )
                      }
                    >
                      Отправить документ
                    </button>

                  </div>

                )}

              </div>

            ))}

          </div>

        </div>

      )}


      {waitingStamp && (

        <div className="waitingStampBox">

          <strong>
            Оплата проведена
          </strong>

          <span>
            Осталось прикрепить
            платёжку с печатью.
            Задача пока остаётся
            в работе.
          </span>

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


purchases =
  purchases.slice(
    0,
    supplierTaskStart
  ) +
  supplierTask.trim() +
  '\n';


fs.writeFileSync(
  purchasesPath,
  purchases,
  'utf8'
);


// ======================================================
// APP: background queue
// ======================================================

let app =
  fs.readFileSync(
    appPath,
    'utf8'
  );


if (
  !app.includes(
    "from './backgroundUploads'"
  )
) {

  app =
`import {
  BackgroundUploadList,
  startBackgroundUploadJob,
  useBackgroundUploads,
} from './backgroundUploads';

` +
    app;
}


// ------------------------------------------------------
// TasksView hook
// ------------------------------------------------------

const tasksStart =
  app.indexOf(
    'function TasksView('
  );

const taskDetailStart =
  app.indexOf(
    'function TaskDetail(',
    tasksStart
  );


if (
  tasksStart === -1 ||
  taskDetailStart === -1
) {

  console.error(
    'Не найден TasksView'
  );

  process.exit(1);
}


let tasksSection =
  app.slice(
    tasksStart,
    taskDetailStart
  );


if (
  !tasksSection.includes(
    'const backgroundUploads'
  )
) {

  const firstNewLine =
    tasksSection.indexOf(
      '\n'
    );


  tasksSection =
    tasksSection.slice(
      0,
      firstNewLine + 1
    ) +

`  const backgroundUploads =
    useBackgroundUploads();

` +

    tasksSection.slice(
      firstNewLine + 1
    );
}


// hide original running task

if (
  !tasksSection.includes(
    'isBackgroundUploading'
  )
) {

  const renderIndex =
    tasksSection.indexOf(
      'function renderTask('
    );


  if (
    renderIndex !== -1
  ) {

    const returnIndex =
      tasksSection.indexOf(
        '\n    return (',
        renderIndex
      );


    if (
      returnIndex !== -1
    ) {

      const insert =
`

    const isBackgroundUploading =
      backgroundUploads.some(
        (job) =>
          job.taskId === task.id &&
          job.status === 'RUNNING'
      );


    if (
      isBackgroundUploading
    ) {
      return null;
    }
`;


      tasksSection =
        tasksSection.slice(
          0,
          returnIndex
        ) +
        insert +
        tasksSection.slice(
          returnIndex
        );
    }
  }
}


// display queue

if (
  !tasksSection.includes(
    '<BackgroundUploadList'
  )
) {

  const sectionMarker =
    '<section className="content">';


  tasksSection =
    tasksSection.replace(
      sectionMarker,

`${sectionMarker}

      <BackgroundUploadList
        jobs={backgroundUploads}
      />`
    );
}


app =
  app.slice(
    0,
    tasksStart
  ) +
  tasksSection +
  app.slice(
    taskDetailStart
  );


// ======================================================
// TaskDetail: client invoice also background
// ======================================================

const taskStart =
  app.indexOf(
    'function TaskDetail('
  );

const moneyStart =
  app.indexOf(
    'function money(',
    taskStart
  );


if (
  taskStart !== -1 &&
  moneyStart !== -1
) {

  let section =
    app.slice(
      taskStart,
      moneyStart
    );


  const finishStart =
    section.indexOf(
      'async function finishInvoice()'
    );


  const canStart =
    section.indexOf(
      'const canAttachInvoice',
      finishStart
    );


  if (
    finishStart !== -1 &&
    canStart !== -1
  ) {

    let replacement;


    if (
      section.includes(
        'invoiceFiles'
      )
    ) {

      replacement =
`function finishInvoice() {

    setError('');


    const filesToUpload =
      [...invoiceFiles];


    const numberToSave =
      number.trim();


    const amountToSave =
      amount
        ? Number(amount)
        : undefined;


    setInvoiceFiles([]);


    startBackgroundUploadJob({

      taskId:
        task.id,

      title:
        'Загружаем готовый счёт',

      subtitle:
        task.deal.clientName,

      files:
        filesToUpload,


      run:
        async ({
          upload,
          setProgress,
        }) => {

          const ids:
            string[] = [];


          for (
            let index = 0;
            index <
              filesToUpload.length;
            index++
          ) {

            const uploaded =
              await upload(

                task.deal.id,

                filesToUpload[
                  index
                ],

                'CLIENT_INVOICE_ATTACHMENT',

                index,

                filesToUpload.length,
              );


            ids.push(
              uploaded.id
            );
          }


          setProgress(94);


          await createInvoice(
            task.deal.id,
            {

              number:
                numberToSave,

              amount:
                amountToSave,

              invoiceDate:
                todayLocalDate(),

              fileId:
                ids[0],

              actorId:
                user.id,
            },
          );


          setProgress(99);
        },
    });


    onBack();
  }


  `;

    } else {

      replacement =
`function finishInvoice() {

    setError('');


    const fileToUpload =
      file;


    startBackgroundUploadJob({

      taskId:
        task.id,

      title:
        'Загружаем готовый счёт',

      subtitle:
        task.deal.clientName,

      files:
        fileToUpload
          ? [fileToUpload]
          : [],


      run:
        async ({
          upload,
          setProgress,
        }) => {

          let fileId:
            string | undefined;


          if (
            fileToUpload
          ) {

            const uploaded =
              await upload(
                task.deal.id,
                fileToUpload,
                'CLIENT_INVOICE_ATTACHMENT',
                0,
                1,
              );


            fileId =
              uploaded.id;
          }


          setProgress(94);


          await createInvoice(
            task.deal.id,
            {

              number:
                number.trim(),

              amount:
                amount
                  ? Number(amount)
                  : undefined,

              invoiceDate:
                todayLocalDate(),

              fileId,

              actorId:
                user.id,
            },
          );


          setProgress(99);
        },
    });


    onBack();
  }


  `;
    }


    section =
      section.slice(
        0,
        finishStart
      ) +
      replacement +
      section.slice(
        canStart
      );


    app =
      app.slice(
        0,
        taskStart
      ) +
      section +
      app.slice(
        moneyStart
      );
  }
}


// ======================================================
// Audit Russian
// ======================================================

if (
  !app.includes(
    'SUPPLIER_PAYMENT_STAMPED:'
  )
) {

  const auditNeedle =
`    SUPPLIER_PAYMENT_ADDED:
      'Добавлена оплата поставщику',`;


  if (
    app.includes(
      auditNeedle
    )
  ) {

    app =
      app.replace(
        auditNeedle,

`${auditNeedle}

    SUPPLIER_PAYMENT_STAMPED:
      'Добавлена платёжка с печатью',`
      );
  }
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
    '/* MSM background uploads v0.4.1 */'
  )
) {

  css += `

/* MSM background uploads v0.4.1 */

.backgroundUploadList {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.backgroundUploadCard {
  display: grid;
  gap: 9px;
  padding: 14px;
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  background: #eff6ff;
  animation: msmFadeUp 180ms ease-out both;
}

.backgroundUploadTop {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.backgroundUploadTop strong {
  display: block;
  font-size: 14px;
}

.backgroundUploadTop span {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 11px;
}

.backgroundUploadTop > b {
  color: #2563eb;
  font-size: 12px;
}

.backgroundUploadBar {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #dbeafe;
}

.backgroundUploadBar > div {
  height: 100%;
  border-radius: inherit;
  background: #3b82f6;
  transition: width 180ms ease;
}

.backgroundUploadMeta {
  color: #64748b;
  font-size: 11px;
}

.backgroundUpload-success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.backgroundUpload-success
.backgroundUploadBar > div {
  background: #22c55e;
}

.backgroundUpload-success
.backgroundUploadTop > b {
  color: #15803d;
}

.backgroundUpload-error {
  border-color: #fecaca;
  background: #fef2f2;
}

.backgroundUpload-error
.backgroundUploadBar > div {
  background: #ef4444;
}

.backgroundUpload-error
.backgroundUploadTop > b {
  color: #b91c1c;
}

.backgroundUploadError {
  color: #b91c1c;
  font-size: 11px;
  white-space: pre-wrap;
}


/* supplier stamp */

.supplierPaymentNoStamp {
  border: 1px solid #fde68a;
  background: #fffbeb !important;
}

.supplierPaymentStamped {
  border: 1px solid #bbf7d0;
  background: #f0fdf4 !important;
}

.stampAddButton {
  margin-top: 8px;
  border: 0;
  background: transparent;
  color: #92400e;
  padding: 0;
  font-size: 12px;
  font-weight: 800;
}

.stampUploadBox {
  display: grid;
  gap: 9px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #fde68a;
}

.waitingStampBox {
  display: grid;
  gap: 4px;
  padding: 13px;
  border: 1px solid #fde68a;
  border-radius: 14px;
  background: #fffbeb;
}

.waitingStampBox strong {
  color: #92400e;
}

.waitingStampBox span {
  color: #78716c;
  font-size: 12px;
}

.purchaseStatus-waiting_stamp {
  background: #fef3c7;
  color: #92400e !important;
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
  'ГОТОВО — MSM v0.4.1'
);

console.log('');
console.log(
  '✓ Файлы отправляются в фоне'
);

console.log(
  '✓ Бухгалтер сразу возвращается в список задач'
);

console.log(
  '✓ Исходная задача скрывается на время загрузки'
);

console.log(
  '✓ В списке виден прогресс'
);

console.log(
  '✓ При ошибке исходная задача снова доступна'
);

console.log(
  '✓ Полная оплата без печати больше не закрывает задачу'
);

console.log(
  '✓ Статус: Оплачено · ждём платёжку с печатью'
);

console.log(
  '✓ Платёжку с печатью можно добавить позже'
);

console.log(
  '✓ Повторная сумма оплаты при этом НЕ создаётся'
);

console.log(
  '✓ Новая миграция Prisma не нужна'
);