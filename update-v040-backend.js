const fs = require('fs');
const path = require('path');

const root = process.cwd();

const schemaPath = path.join(
  root,
  'backend',
  'prisma',
  'schema.prisma'
);

const appModulePath = path.join(
  root,
  'backend',
  'src',
  'app.module.ts'
);

const tasksServicePath = path.join(
  root,
  'backend',
  'src',
  'tasks',
  'tasks.service.ts'
);

const purchasesDir = path.join(
  root,
  'backend',
  'src',
  'purchases'
);

for (const file of [
  schemaPath,
  appModulePath,
  tasksServicePath,
]) {
  if (!fs.existsSync(file)) {
    console.error('Не найден: ' + file);
    process.exit(1);
  }
}

function backup(file) {
  const backup = file + '.bak-v040';

  if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
  }
}

backup(schemaPath);
backup(appModulePath);
backup(tasksServicePath);

fs.mkdirSync(
  purchasesDir,
  { recursive: true }
);


// ======================================================
// PRISMA
// ======================================================

let schema =
  fs.readFileSync(
    schemaPath,
    'utf8'
  );


if (
  !schema.includes(
    'enum SupplierPurchaseStatus'
  )
) {

  const marker =
`enum ClientPaymentMethod {
  NONCASH
  CASH
  CARD
  ADVANCE
}`;

  if (!schema.includes(marker)) {
    console.error(
      'Не найден ClientPaymentMethod'
    );
    process.exit(1);
  }


  schema = schema.replace(
    marker,

`${marker}

enum SupplierPurchaseStatus {
  DRAFT
  PAYMENT_REQUESTED
  PARTIALLY_PAID
  PAID
  CANCELLED
}`
  );
}


// User -> SupplierPayment

if (
  !schema.includes(
    'supplierPayments  SupplierPayment[]'
  )
) {

  schema = schema.replace(

    /(\s+clientPayments\s+ClientPayment\[\]\s+@relation\("ClientPaymentActor"\))/,

`$1
  supplierPayments  SupplierPayment[] @relation("SupplierPaymentActor")`

  );
}


// Deal -> SupplierPurchase

if (
  !schema.includes(
    'supplierPurchases  SupplierPurchase[]'
  )
) {

  schema = schema.replace(

    /(\s+clientPayments\s+ClientPayment\[\])/,

`$1
  supplierPurchases  SupplierPurchase[]`

  );
}


// Task -> SupplierPurchase

if (
  !schema.includes(
    'supplierPurchaseId String?'
  )
) {

  schema = schema.replace(

    /(\s+assignee\s+User\?\s+@relation\("TaskAssignee", fields: \[assigneeId\], references: \[id\]\))/,

`$1
  supplierPurchaseId String?
  supplierPurchase   SupplierPurchase? @relation(fields: [supplierPurchaseId], references: [id], onDelete: SetNull)`

  );


  schema = schema.replace(

    /(\s+@@index\(\[assigneeId, status\]\))/,

`$1
  @@index([supplierPurchaseId, status])`

  );
}


// Новые таблицы

if (
  !schema.includes(
    'model SupplierPurchase {'
  )
) {

  const newModels = `

model SupplierPurchase {
  id                    String                 @id @default(cuid())
  dealId                String
  deal                  Deal                   @relation(fields: [dealId], references: [id], onDelete: Cascade)

  supplierName          String
  incomingInvoiceNumber String?
  incomingInvoiceAmount Decimal?               @db.Decimal(14, 2)
  comment               String?
  requestedAmount       Decimal?               @db.Decimal(14, 2)

  status                SupplierPurchaseStatus @default(DRAFT)

  createdById           String

  tasks                 Task[]
  payments              SupplierPayment[]

  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@index([dealId, status])
  @@index([supplierName])
}


model SupplierPayment {
  id                  String           @id @default(cuid())

  purchaseId          String
  purchase            SupplierPurchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  amount              Decimal          @db.Decimal(14, 2)
  paidAt              DateTime

  paymentOrderStamped Boolean          @default(false)

  comment             String?

  actorId             String
  actor               User             @relation("SupplierPaymentActor", fields: [actorId], references: [id])

  createdAt           DateTime         @default(now())

  @@index([purchaseId, paidAt])
}
`;


  const auditIndex =
    schema.indexOf(
      'model AuditEvent {'
    );


  if (auditIndex === -1) {
    console.error(
      'Не найден AuditEvent'
    );
    process.exit(1);
  }


  schema =
    schema.slice(
      0,
      auditIndex
    ) +

    newModels +

    '\n' +

    schema.slice(
      auditIndex
    );
}


fs.writeFileSync(
  schemaPath,
  schema,
  'utf8'
);


// ======================================================
// PURCHASES MODULE
// ======================================================

const purchasesModule =
`import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [PrismaModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
`;


const purchasesController =
`import {
  Body,
  Controller,
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

    return this.purchases.requestPayment(
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

    return this.purchases.addPayment(
      dealId,
      purchaseId,
      body,
    );
  }
}
`;


const purchasesService =
`import {
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


  async create(
    dealId: string,
    body: {
      supplierName?: string;
      incomingInvoiceNumber?: string;
      incomingInvoiceAmount?: number;
      comment?: string;
      createdById: string;
    },
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
              body.incomingInvoiceNumber
                ?.trim() ||
              undefined,

            incomingInvoiceAmount:
              body.incomingInvoiceAmount,

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

            incomingInvoiceNumber:
              purchase.incomingInvoiceNumber,

            incomingInvoiceAmount:
              purchase
                .incomingInvoiceAmount
                ?.toString(),
          },
        },
      });


    return purchase;
  }


  async update(
    dealId: string,
    purchaseId: string,
    body: {
      supplierName?: string;
      incomingInvoiceNumber?: string;
      incomingInvoiceAmount?: number;
      comment?: string;
      actorId: string;
    },
  ) {

    const current =
      await this.prisma
        .supplierPurchase
        .findFirstOrThrow({

          where: {
            id: purchaseId,
            dealId,
          },
        });


    const updated =
      await this.prisma
        .supplierPurchase
        .update({

          where: {
            id: purchaseId,
          },

          data: {

            supplierName:
              body.supplierName
                ?.trim() ||
              current.supplierName,

            incomingInvoiceNumber:
              body.incomingInvoiceNumber ===
              undefined
                ? undefined
                : body
                    .incomingInvoiceNumber
                    .trim() ||
                  null,

            incomingInvoiceAmount:
              body.incomingInvoiceAmount,

            comment:
              body.comment ===
              undefined
                ? undefined
                : body.comment.trim() ||
                  null,
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
            body.actorId,

          action:
            'SUPPLIER_PURCHASE_UPDATED',

          entityType:
            'SupplierPurchase',

          entityId:
            purchaseId,

          oldValue: {

            supplierName:
              current.supplierName,

            incomingInvoiceNumber:
              current.incomingInvoiceNumber,

            incomingInvoiceAmount:
              current
                .incomingInvoiceAmount
                ?.toString(),

            comment:
              current.comment,
          },

          newValue: {

            supplierName:
              updated.supplierName,

            incomingInvoiceNumber:
              updated.incomingInvoiceNumber,

            incomingInvoiceAmount:
              updated
                .incomingInvoiceAmount
                ?.toString(),

            comment:
              updated.comment,
          },
        },
      });


    return updated;
  }


  async requestPayment(
    dealId: string,
    purchaseId: string,
    body: {
      amount?: number;
      comment?: string;
      urgent?: boolean;
      actorId: string;
    },
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
              TaskType
                .PAY_SUPPLIER,

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


          const amountLabel =
            body.amount
              ? ' · ' +
                Number(
                  body.amount
                ).toLocaleString(
                  'ru-RU'
                ) +
                ' ₽'
              : '';


          const task =
            await tx.task.create({

              data: {

                dealId,

                supplierPurchaseId:
                  purchaseId,

                type:
                  TaskType
                    .PAY_SUPPLIER,

                title:
                  'Оплатить поставщику: ' +
                  purchase
                    .supplierName +
                  amountLabel,

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

                  urgent:
                    Boolean(
                      body.urgent
                    ),
                },

                reason:
                  body.comment
                    ?.trim() ||
                  undefined,
              },
            });


          return task;
        },
      );
  }


  async addPayment(
    dealId: string,
    purchaseId: string,
    body: {
      amount?: number;
      paidAt?: string;
      paymentOrderStamped?: boolean;
      comment?: string;
      actorId: string;
    },
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


          const previousPaid =
            purchase.payments
              .reduce(
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


          const totalPaid =
            previousPaid +
            amount;


          const invoiceAmount =
            purchase
              .incomingInvoiceAmount
              ? Number(
                  purchase
                    .incomingInvoiceAmount
                )
              : null;


          const purchaseStatus =
            invoiceAmount !== null &&
            totalPaid >= invoiceAmount

              ? SupplierPurchaseStatus.PAID

              : totalPaid > 0

                ? SupplierPurchaseStatus
                    .PARTIALLY_PAID

                : purchase.status;


          await tx
            .supplierPurchase
            .update({

              where: {
                id: purchaseId,
              },

              data: {
                status:
                  purchaseStatus,
              },
            });


          if (
            body.paymentOrderStamped
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

                  purchaseId,

                  amount,

                  paymentOrderStamped:
                    Boolean(
                      body
                        .paymentOrderStamped
                    ),

                  totalPaid,
                },

                reason:
                  body.comment
                    ?.trim() ||
                  undefined,
              },
            });


          return payment;
        },
      );
  }
}
`;


fs.writeFileSync(
  path.join(
    purchasesDir,
    'purchases.module.ts'
  ),
  purchasesModule,
  'utf8'
);

fs.writeFileSync(
  path.join(
    purchasesDir,
    'purchases.controller.ts'
  ),
  purchasesController,
  'utf8'
);

fs.writeFileSync(
  path.join(
    purchasesDir,
    'purchases.service.ts'
  ),
  purchasesService,
  'utf8'
);


// ======================================================
// APP MODULE
// ======================================================

let appModule =
  fs.readFileSync(
    appModulePath,
    'utf8'
  );


if (
  !appModule.includes(
    "./purchases/purchases.module"
  )
) {

  appModule =
    appModule.replace(

      "import { PrismaModule } from './prisma/prisma.module';",

      "import { PrismaModule } from './prisma/prisma.module';\n" +
      "import { PurchasesModule } from './purchases/purchases.module';"

    );
}


if (
  !/imports:\s*\[[^\]]*\bPurchasesModule\b/s
    .test(
      appModule
    )
) {

  appModule =
    appModule.replace(

      /imports:\s*\[([\s\S]*?)\]/,

      (
        full,
        inner,
      ) =>
        'imports: [' +
        inner
          .trim()
          .replace(
            /,\s*$/,
            ''
          ) +
        ', PurchasesModule]'
    );
}


fs.writeFileSync(
  appModulePath,
  appModule,
  'utf8'
);


// ======================================================
// TASKS SERVICE
// ======================================================

const tasksService =
`import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {

  constructor(
    private readonly prisma:
      PrismaService
  ) {}


  list() {

    return this.prisma
      .task
      .findMany({

        orderBy: [
          {
            urgent: 'desc',
          },

          {
            createdAt: 'asc',
          },
        ],


        include: {

          deal: {

            include: {

              invoices: {
                where: {
                  isCurrent: true,
                },

                take: 1,
              },


              files: {
                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
          },


          supplierPurchase: {

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
          },


          assignee: {

            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });
  }


  async updateStatus(
    id: string,
    status: TaskStatus,
    assigneeId?: string,
  ) {

    return this.prisma
      .task
      .update({

        where: {
          id,
        },

        data: {

          status,

          assigneeId,

          completedAt:
            status ===
            TaskStatus.DONE
              ? new Date()
              : null,
        },
      });
  }
}
`;


fs.writeFileSync(
  tasksServicePath,
  tasksService,
  'utf8'
);


console.log('');
console.log('ГОТОВО — v0.4.0 backend');
console.log('');
console.log('Добавлено:');
console.log('✓ поставщики');
console.log('✓ несколько поставщиков на сделку');
console.log('✓ входящий счёт и сумма');
console.log('✓ задача PAY_SUPPLIER');
console.log('✓ несколько оплат');
console.log('✓ частичная оплата');
console.log('✓ платёжка с печатью');
console.log('✓ история оплат');
console.log('');
console.log('Теперь нужна Prisma migration.');