const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const controllerPath = path.join(
  root, 'backend', 'src', 'tasks', 'tasks.controller.ts'
);
const servicePath = path.join(
  root, 'backend', 'src', 'tasks', 'tasks.service.ts'
);
const apiPath = path.join(
  root, 'frontend', 'src', 'api.ts'
);

function fail(message) {
  console.error('');
  console.error('ОШИБКА: ' + message);
  process.exit(1);
}

function read(file) {
  if (!fs.existsSync(file)) {
    fail('Не найден файл: ' + file);
  }
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}

let controller = read(controllerPath);
let service = read(servicePath);
let api = read(apiPath);


/*
 * 1. Fix old invoice return:
 * assign back to deal.managerId, not actorId.
 */

if (
  service.includes(
    'async returnInvoiceRequest('
  ) &&
  !service.includes(
    'INVOICE_RETURN_MANAGER_FIX_V1'
  )
) {
  const methodStart =
    service.indexOf(
      '  async returnInvoiceRequest('
    );

  const methodEnd =
    service.indexOf(
      '\n\n\n  async updateStatus(',
      methodStart
    );

  if (methodEnd < 0) {
    fail(
      'Не удалось определить конец returnInvoiceRequest.'
    );
  }

  let method =
    service.slice(
      methodStart,
      methodEnd
    );

  const findOld =
    `            .findUniqueOrThrow({
              where: { id },
            });`;

  const findNew =
    `            .findUniqueOrThrow({
              where: { id },

              include: {
                deal: {
                  select: {
                    managerId: true,
                  },
                },
              },
            });`;

  if (method.includes(findOld)) {
    method =
      method.replace(
        findOld,
        findNew
      );
  } else if (
    !method.includes(
      'managerId: true'
    )
  ) {
    fail(
      'В returnInvoiceRequest не найден findUniqueOrThrow ожидаемого вида.'
    );
  }

  const assigneeOld =
    `              assigneeId:
                body.actorId,`;

  const assigneeNew =
    `              assigneeId:
                task.deal.managerId,`;

  if (method.includes(assigneeOld)) {
    method =
      method.replace(
        assigneeOld,
        assigneeNew
      );
  } else if (
    !method.includes(
      'task.deal.managerId'
    )
  ) {
    fail(
      'В returnInvoiceRequest не найден assigneeId.'
    );
  }

  method =
    method.replace(
      `  async returnInvoiceRequest(`,
      `  // INVOICE_RETURN_MANAGER_FIX_V1
  async returnInvoiceRequest(`
    );

  service =
    service.slice(0, methodStart) +
    method +
    service.slice(methodEnd);
}


/*
 * 2. Generic service method:
 * same Task -> NEED_DATA -> deal.managerId.
 */

if (
  !service.includes(
    'async returnToManager('
  )
) {
  const insertBefore =
    service.indexOf(
      '\n\n\n  async updateStatus('
    );

  if (insertBefore < 0) {
    fail(
      'Не найден updateStatus в tasks.service.ts.'
    );
  }

  const genericMethod = `


  async returnToManager(
    id: string,
    body: {
      actorId: string;
      reasonCode: string;
      comment?: string;
    },
  ) {

    const reasons:
      Record<string, string> = {

      MISSING_DATA:
        'Не хватает данных',

      INCORRECT_DATA:
        'Данные заполнены неверно',

      NEED_CLARIFICATION:
        'Требуется уточнение',

      NO_INCOMING_INVOICE:
        'Нет входящего счёта',

      NO_TERMS:
        'Нет условий',

      NO_DETAILS:
        'Нет реквизитов / непонятно, на кого делать',

      OTHER:
        'Другое',
    };


    const reasonLabel =
      reasons[
        body.reasonCode
      ];


    if (!reasonLabel) {

      throw new BadRequestException(
        'Выберите причину возврата',
      );
    }


    const comment =
      body.comment?.trim() ||
      '';


    if (
      body.reasonCode ===
        'OTHER' &&
      !comment
    ) {

      throw new BadRequestException(
        'Для причины «Другое» добавьте комментарий',
      );
    }


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

                  deal: {

                    select: {
                      managerId:
                        true,
                    },
                  },
                },
              });


          if (
            task.status !==
              TaskStatus.NEW &&
            task.status !==
              TaskStatus.IN_PROGRESS
          ) {

            throw new BadRequestException(
              'Вернуть менеджеру можно только активную задачу',
            );
          }


          const updated =
            await tx.task
              .update({

                where: {
                  id,
                },

                data: {

                  status:
                    TaskStatus.NEED_DATA,

                  assigneeId:
                    task.deal
                      .managerId,

                  completedAt:
                    null,
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
                  'TASK_RETURNED_TO_MANAGER',

                entityType:
                  'Task',

                entityId:
                  task.id,

                oldValue: {

                  status:
                    task.status,

                  assigneeId:
                    task.assigneeId,
                },

                newValue: {

                  status:
                    TaskStatus.NEED_DATA,

                  assigneeId:
                    task.deal
                      .managerId,

                  taskType:
                    task.type,

                  reasonCode:
                    body.reasonCode,

                  reasonLabel,
                },

                reason:
                  comment ||
                  undefined,
              },
            });


          return updated;
        },
      );
  }`;

  service =
    service.slice(
      0,
      insertBefore
    ) +
    genericMethod +
    service.slice(
      insertBefore
    );
}


/*
 * 3. Controller endpoint.
 */

if (
  !controller.includes(
    "@Post(':id/return-to-manager')"
  )
) {
  const statusMarker =
    `  @Patch(':id/status')`;

  const markerIndex =
    controller.indexOf(
      statusMarker
    );

  if (markerIndex < 0) {
    fail(
      'Не найден @Patch(:id/status) в tasks.controller.ts.'
    );
  }

  const endpoint = `  @Post(':id/return-to-manager')
  returnToManager(
    @Param('id') id: string,

    @Body() body: {
      actorId: string;
      reasonCode: string;
      comment?: string;
    },
  ) {

    return this.tasks
      .returnToManager(
        id,
        body,
      );
  }


`;

  controller =
    controller.slice(
      0,
      markerIndex
    ) +
    endpoint +
    controller.slice(
      markerIndex
    );
}


/*
 * 4. Frontend API helper.
 */

if (
  !api.includes(
    'export async function returnTaskToManager('
  )
) {
  const invoiceReturnStart =
    api.indexOf(
      'export async function returnInvoiceRequest('
    );

  if (invoiceReturnStart < 0) {
    fail(
      'Не найден returnInvoiceRequest в frontend/src/api.ts.'
    );
  }

  const nextExport =
    api.indexOf(
      '\nexport ',
      invoiceReturnStart + 10
    );

  if (nextExport < 0) {
    fail(
      'Не удалось определить конец returnInvoiceRequest в api.ts.'
    );
  }

  const helper = `

export async function returnTaskToManager(
  taskId: string,
  payload: {
    actorId: string;
    reasonCode: string;
    comment?: string;
  },
) {

  return json(
    \`/tasks/\${taskId}/return-to-manager\`,
    {
      method: 'POST',

      body:
        JSON.stringify(
          payload
        ),
    },
  );
}
`;

  api =
    api.slice(
      0,
      nextExport
    ) +
    helper +
    api.slice(
      nextExport
    );
}


console.log('');
console.log(
  'Проверка Part 1L:'
);
console.log(
  '  Старый возврат счёта -> deal.managerId: OK'
);
console.log(
  '  Общий TasksService.returnToManager: OK'
);
console.log(
  '  POST /tasks/:id/return-to-manager: OK'
);
console.log(
  '  frontend returnTaskToManager(): OK'
);
console.log(
  '  Prisma migration: не требуется'
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
    .replace(
      /[:.]/g,
      '-'
    );

for (
  const file
  of [
    controllerPath,
    servicePath,
    apiPath,
  ]
) {
  fs.copyFileSync(
    file,
    file +
      '.before-part1l-' +
      stamp
  );
}

write(
  controllerPath,
  controller
);

write(
  servicePath,
  service
);

write(
  apiPath,
  api
);

console.log('');
console.log(
  'Part 1L применён.'
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
