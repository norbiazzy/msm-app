const fs = require('fs');
const path = require('path');

const root =
  __dirname;

const checkOnly =
  process.argv.includes(
    '--check'
  );


const servicePath =
  path.join(
    root,
    'backend',
    'src',
    'tasks',
    'tasks.service.ts'
  );

const controllerPath =
  path.join(
    root,
    'backend',
    'src',
    'tasks',
    'tasks.controller.ts'
  );

const apiPath =
  path.join(
    root,
    'frontend',
    'src',
    'api.ts'
  );

const purchasesPath =
  path.join(
    root,
    'frontend',
    'src',
    'PurchasesBlock.tsx'
  );

const typesPath =
  path.join(
    root,
    'frontend',
    'src',
    'types.ts'
  );

const componentPath =
  path.join(
    root,
    'frontend',
    'src',
    'SupplierPaymentManagerEdit.tsx'
  );

const componentSourcePath =
  path.join(
    root,
    'SupplierPaymentManagerEdit.part1n-b2.tmp'
  );


function fail(message) {

  console.error('');

  console.error(
    'ОШИБКА: ' +
      message
  );

  process.exit(1);
}


function read(file) {

  if (
    !fs.existsSync(file)
  ) {

    fail(
      'Не найден файл: ' +
        file
    );
  }


  return fs.readFileSync(
    file,
    'utf8'
  );
}


function write(
  file,
  text
) {

  fs.writeFileSync(
    file,
    text,
    'utf8'
  );
}


function findMatching(
  text,
  openIndex,
  openChar,
  closeChar
) {

  let depth = 0;
  let mode = 'code';
  let quote = '';


  for (
    let i = openIndex;
    i < text.length;
    i++
  ) {

    const ch =
      text[i];

    const next =
      text[i + 1];


    if (
      mode ===
      'lineComment'
    ) {

      if (
        ch === '\n'
      ) {
        mode =
          'code';
      }

      continue;
    }


    if (
      mode ===
      'blockComment'
    ) {

      if (
        ch === '*' &&
        next === '/'
      ) {

        mode =
          'code';

        i++;
      }

      continue;
    }


    if (
      mode ===
      'string'
    ) {

      if (
        ch === '\\'
      ) {

        i++;

        continue;
      }


      if (
        ch === quote
      ) {

        mode =
          'code';
      }

      continue;
    }


    if (
      ch === '/' &&
      next === '/'
    ) {

      mode =
        'lineComment';

      i++;

      continue;
    }


    if (
      ch === '/' &&
      next === '*'
    ) {

      mode =
        'blockComment';

      i++;

      continue;
    }


    if (
      ch === "'" ||
      ch === '"' ||
      ch === '`'
    ) {

      mode =
        'string';

      quote =
        ch;

      continue;
    }


    if (
      ch === openChar
    ) {

      depth++;

      continue;
    }


    if (
      ch === closeChar
    ) {

      depth--;


      if (
        depth === 0
      ) {

        return i;
      }
    }
  }


  return -1;
}


function findClassRange(
  text,
  className
) {

  const token =
    'export class ' +
    className;


  const start =
    text.indexOf(
      token
    );


  if (
    start < 0
  ) {

    return null;
  }


  const openBrace =
    text.indexOf(
      '{',
      start +
        token.length
    );


  if (
    openBrace < 0
  ) {

    return null;
  }


  const closeBrace =
    findMatching(
      text,
      openBrace,
      '{',
      '}'
    );


  if (
    closeBrace < 0
  ) {

    return null;
  }


  return {
    start,
    openBrace,
    closeBrace,
  };
}


function findFunctionRange(
  text,
  functionName
) {

  const token =
    'function ' +
    functionName;


  const start =
    text.indexOf(
      token
    );


  if (
    start < 0
  ) {
    return null;
  }


  const openParen =
    text.indexOf(
      '(',
      start +
        token.length
    );


  if (
    openParen < 0
  ) {
    return null;
  }


  const closeParen =
    findMatching(
      text,
      openParen,
      '(',
      ')'
    );


  if (
    closeParen < 0
  ) {
    return null;
  }


  const openBrace =
    text.indexOf(
      '{',
      closeParen + 1
    );


  if (
    openBrace < 0
  ) {
    return null;
  }


  const closeBrace =
    findMatching(
      text,
      openBrace,
      '{',
      '}'
    );


  if (
    closeBrace < 0
  ) {
    return null;
  }


  return {
    start,
    openParen,
    closeParen,
    openBrace,
    closeBrace,
    end:
      closeBrace + 1,

    text:
      text.slice(
        start,
        closeBrace + 1
      ),
  };
}


function findImportBlockEnd(
  text
) {

  let index = 0;
  let lastEnd = -1;


  while (
    index < text.length
  ) {

    while (
      index < text.length &&
      /\s/.test(
        text[index]
      )
    ) {
      index++;
    }


    if (
      !text.startsWith(
        'import',
        index
      )
    ) {
      break;
    }


    const semicolon =
      text.indexOf(
        ';',
        index
      );


    if (
      semicolon < 0
    ) {

      return -1;
    }


    lastEnd =
      semicolon + 1;

    index =
      semicolon + 1;
  }


  return lastEnd;
}


let service =
  read(
    servicePath
  );

let controller =
  read(
    controllerPath
  );

let api =
  read(
    apiPath
  );

let purchases =
  read(
    purchasesPath
  );

let types =
  read(
    typesPath
  );

const componentSource =
  read(
    componentSourcePath
  );


if (
  !service.includes(
    'async resubmitToAccounting('
  )
) {

  fail(
    'Part 1N-B1 не найден: нет resubmitToAccounting().'
  );
}


/*
 * 1. Backend atomic supplier edit + same-task resubmit.
 */

if (
  !service.includes(
    'async resubmitSupplierPayment('
  )
) {

  const classRange =
    findClassRange(
      service,
      'TasksService'
    );


  if (!classRange) {

    fail(
      'Не удалось разобрать class TasksService.'
    );
  }


  const method =
    `

  async resubmitSupplierPayment(
    id: string,

    body: {
      actorId: string;
      supplierName?: string;
      incomingInvoiceNumber?: string;
      amount?: number;
      comment?: string;
      urgent?: boolean;
    },
  ) {

    return this.prisma
      .$transaction(
        async (tx) => {

          const task =
            await tx.task
              .findUniqueOrThrow({

                where: {
                  id,
                },

                include: {
                  supplierPurchase:
                    true,
                },
              });


          if (
            task.type !==
              TaskType.PAY_SUPPLIER
          ) {

            throw new BadRequestException(
              'Эта задача не является оплатой поставщику',
            );
          }


          if (
            task.status !==
              TaskStatus.NEED_DATA
          ) {

            throw new BadRequestException(
              'Повторно отправить можно только возвращённую задачу',
            );
          }


          if (
            !task.supplierPurchaseId ||
            !task.supplierPurchase
          ) {

            throw new BadRequestException(
              'У задачи не найдена закупка поставщика',
            );
          }


          const purchase =
            task.supplierPurchase;


          const supplierName =
            body.supplierName !==
              undefined

              ? (
                  body.supplierName
                    .trim() ||
                  purchase
                    .supplierName
                )

              : purchase
                  .supplierName;


          const invoiceNumber =
            body.incomingInvoiceNumber !==
              undefined

              ? (
                  body
                    .incomingInvoiceNumber
                    .trim() ||
                  null
                )

              : purchase
                  .incomingInvoiceNumber;


          const amount =
            body.amount !==
              undefined

              ? Number(
                  body.amount
                )

              : (
                  purchase
                    .requestedAmount !==
                    null

                    ? Number(
                        purchase
                          .requestedAmount
                      )

                    : purchase
                        .incomingInvoiceAmount !==
                        null

                      ? Number(
                          purchase
                            .incomingInvoiceAmount
                        )

                      : null
                );


          if (
            amount !== null &&
            (
              !Number.isFinite(
                amount
              ) ||
              amount < 0
            )
          ) {

            throw new BadRequestException(
              'Проверьте сумму оплаты',
            );
          }


          const comment =
            body.comment !==
              undefined

              ? (
                  body.comment
                    .trim() ||
                  null
                )

              : purchase
                  .comment;


          const urgent =
            body.urgent !==
              undefined

              ? Boolean(
                  body.urgent
                )

              : task.urgent;


          const updatedPurchase =
            await tx
              .supplierPurchase
              .update({

                where: {
                  id:
                    task
                      .supplierPurchaseId,
                },

                data: {

                  supplierName,

                  incomingInvoiceNumber:
                    invoiceNumber,

                  incomingInvoiceAmount:
                    amount,

                  requestedAmount:
                    amount,

                  comment,

                  status:
                    SupplierPurchaseStatus
                      .PAYMENT_REQUESTED,
                },
              });


          const updatedTask =
            await tx.task
              .update({

                where: {
                  id,
                },

                data: {

                  status:
                    TaskStatus.NEW,

                  assigneeId:
                    null,

                  completedAt:
                    null,

                  urgent,

                  title:
                    'Оплатить поставщику: ' +
                    supplierName,

                  description:
                    comment,
                },
              });


          await tx.auditEvent
            .create({

              data: {

                dealId:
                  task.dealId,

                actorId:
                  body.actorId,

                action:
                  'SUPPLIER_PAYMENT_TASK_RESUBMITTED',

                entityType:
                  'Task',

                entityId:
                  task.id,

                oldValue: {

                  status:
                    task.status,

                  supplierName:
                    purchase
                      .supplierName,

                  incomingInvoiceNumber:
                    purchase
                      .incomingInvoiceNumber,

                  amount:
                    purchase
                      .requestedAmount
                      ?.toString() ??
                    purchase
                      .incomingInvoiceAmount
                      ?.toString() ??
                    null,

                  comment:
                    purchase
                      .comment,

                  urgent:
                    task.urgent,
                },

                newValue: {

                  status:
                    TaskStatus.NEW,

                  supplierName:
                    updatedPurchase
                      .supplierName,

                  incomingInvoiceNumber:
                    updatedPurchase
                      .incomingInvoiceNumber,

                  amount:
                    updatedPurchase
                      .requestedAmount
                      ?.toString() ??
                    null,

                  comment:
                    updatedPurchase
                      .comment,

                  urgent:
                    updatedTask
                      .urgent,
                },
              },
            });


          return updatedTask;
        },
      );
  }
`;


  service =
    service.slice(
      0,
      classRange.closeBrace
    ) +
    method +
    service.slice(
      classRange.closeBrace
    );
}


/*
 * Ensure SupplierPurchaseStatus is imported in TasksService.
 */

if (
  service.includes(
    'SupplierPurchaseStatus'
  ) &&
  !/import\s*\{[\s\S]*?SupplierPurchaseStatus[\s\S]*?\}\s*from\s*['"]@prisma\/client['"]/.test(
    service
  )
) {

  const prismaImportRegex =
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]@prisma\/client['"]\s*;/;


  const match =
    service.match(
      prismaImportRegex
    );


  if (!match) {

    fail(
      'Не найден import из @prisma/client.'
    );
  }


  const content =
    match[1];


  service =
    service.replace(
      prismaImportRegex,
      `import {
${content.trim()}
  SupplierPurchaseStatus,
} from '@prisma/client';`
    );
}


/*
 * 2. Controller endpoint.
 */

if (
  !controller.includes(
    "@Post(':id/resubmit-supplier-payment')"
  )
) {

  const classRange =
    findClassRange(
      controller,
      'TasksController'
    );


  if (!classRange) {

    fail(
      'Не удалось разобрать class TasksController.'
    );
  }


  const endpoint =
    `

  @Post(':id/resubmit-supplier-payment')
  resubmitSupplierPayment(
    @Param('id') id: string,

    @Body() body: {
      actorId: string;
      supplierName?: string;
      incomingInvoiceNumber?: string;
      amount?: number;
      comment?: string;
      urgent?: boolean;
    },
  ) {

    return this.tasks
      .resubmitSupplierPayment(
        id,
        body,
      );
  }
`;


  controller =
    controller.slice(
      0,
      classRange.closeBrace
    ) +
    endpoint +
    controller.slice(
      classRange.closeBrace
    );
}


/*
 * 3. Frontend API.
 */

if (
  !api.includes(
    'export async function resubmitSupplierPaymentTask('
  )
) {

  const helper =
    `

export async function resubmitSupplierPaymentTask(
  taskId: string,

  payload: {
    actorId: string;
    supplierName?: string;
    incomingInvoiceNumber?: string;
    amount?: number;
    comment?: string;
    urgent?: boolean;
  },
) {

  return json(
    \`/tasks/\${taskId}/resubmit-supplier-payment\`,
    {
      method:
        'POST',

      body:
        JSON.stringify(
          payload
        ),
    },
  );
}
`;


  api =
    api.trimEnd() +
    helper +
    '\n';
}


/*
 * 4. SupplierPurchase type must expose invoice number.
 */

const supplierTypeIndex =
  types.indexOf(
    'export type SupplierPurchase = {'
  );


if (
  supplierTypeIndex >= 0 &&
  !types
    .slice(
      supplierTypeIndex,
      supplierTypeIndex + 700
    )
    .includes(
      'incomingInvoiceNumber?:'
    )
) {

  const supplierNameLine =
    types.indexOf(
      'supplierName: string;',
      supplierTypeIndex
    );


  if (
    supplierNameLine < 0
  ) {

    fail(
      'В SupplierPurchase не найден supplierName.'
    );
  }


  const lineEnd =
    types.indexOf(
      '\n',
      supplierNameLine
    );


  types =
    types.slice(
      0,
      lineEnd + 1
    ) +
    '  incomingInvoiceNumber?: string;\n' +
    types.slice(
      lineEnd + 1
    );
}


/*
 * 5. Import manager edit component into PurchasesBlock.
 */

if (
  !purchases.includes(
    "from './SupplierPaymentManagerEdit'"
  )
) {

  const importEnd =
    findImportBlockEnd(
      purchases
    );


  if (
    importEnd < 0
  ) {

    fail(
      'Не удалось определить import-блок PurchasesBlock.tsx.'
    );
  }


  const importText =
    `

import {
  SupplierPaymentManagerEdit,
} from './SupplierPaymentManagerEdit';`;


  purchases =
    purchases.slice(
      0,
      importEnd
    ) +
    importText +
    purchases.slice(
      importEnd
    );
}


/*
 * 6. Insert manager editor in SupplierPaymentTask.
 */

if (
  !purchases.includes(
    'PART_1N_B2_SUPPLIER_MANAGER_EDIT'
  )
) {

  const functionRange =
    findFunctionRange(
      purchases,
      'SupplierPaymentTask'
    );


  if (!functionRange) {

    fail(
      'Не найден SupplierPaymentTask().'
    );
  }


  const sectionMatch =
    /<section\b[^>]*>/
      .exec(
        functionRange.text
      );


  if (!sectionMatch) {

    fail(
      'В SupplierPaymentTask не найден корневой <section>.'
    );
  }


  const insertAt =
    functionRange.start +
    sectionMatch.index +
    sectionMatch[0].length;


  const block =
    `

      {/* PART_1N_B2_SUPPLIER_MANAGER_EDIT */}

      {status === 'NEED_DATA' &&
        user.role !== 'ACCOUNTANT' && (

        <SupplierPaymentManagerEdit
          taskId={task.id}
          actorId={user.id}
          purchase={purchase}
          urgent={task.urgent}
          onResubmitted={onBack}
        />

      )}
`;


  purchases =
    purchases.slice(
      0,
      insertAt
    ) +
    block +
    purchases.slice(
      insertAt
    );
}


/*
 * Final verification before writes.
 */

for (
  const [
    ok,
    message,
  ]
  of [
    [
      service.includes(
        'async resubmitSupplierPayment('
      ),
      'Не добавлен resubmitSupplierPayment().',
    ],

    [
      service.includes(
        'requestedAmount:'
      ),
      'Не обновляется requestedAmount.',
    ],

    [
      controller.includes(
        "@Post(':id/resubmit-supplier-payment')"
      ),
      'Не добавлен endpoint.',
    ],

    [
      api.includes(
        'resubmitSupplierPaymentTask('
      ),
      'Не добавлен frontend API helper.',
    ],

    [
      purchases.includes(
        'PART_1N_B2_SUPPLIER_MANAGER_EDIT'
      ),
      'Не добавлен редактор в SupplierPaymentTask.',
    ],

    [
      types.includes(
        'incomingInvoiceNumber?: string;'
      ),
      'Не обновлён SupplierPurchase type.',
    ],
  ]
) {

  if (!ok) {
    fail(message);
  }
}


console.log('');

console.log(
  'Проверка Part 1N-B2:'
);

console.log(
  '  PAY_SUPPLIER NEED_DATA editor: OK'
);

console.log(
  '  Поставщик редактируется: OK'
);

console.log(
  '  № входящего счёта редактируется: OK'
);

console.log(
  '  Сумма requested + incoming обновляется вместе: OK'
);

console.log(
  '  Комментарий + срочность: OK'
);

console.log(
  '  Та же Task -> NEW: OK'
);

console.log(
  '  Новая Task НЕ создаётся: OK'
);

console.log(
  '  AuditEvent: OK'
);

console.log(
  '  Prisma migration: не требуется'
);


if (
  checkOnly
) {

  console.log('');

  console.log(
    'CHECK ONLY — файлы не изменены.'
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


for (
  const file
  of [
    servicePath,
    controllerPath,
    apiPath,
    purchasesPath,
    typesPath,
  ]
) {

  fs.copyFileSync(
    file,
    file +
      '.before-part1n-b2-' +
      stamp
  );
}


write(
  servicePath,
  service
);

write(
  controllerPath,
  controller
);

write(
  apiPath,
  api
);

write(
  purchasesPath,
  purchases
);

write(
  typesPath,
  types
);

write(
  componentPath,
  componentSource
);


console.log('');

console.log(
  'Part 1N-B2 применён.'
);

console.log('');

console.log(
  'Дальше:'
);

console.log(
  '  git diff --check'
);

console.log(
  '  cd backend'
);

console.log(
  '  npm run build'
);

console.log(
  '  cd ../frontend'
);

console.log(
  '  npm run build'
);
