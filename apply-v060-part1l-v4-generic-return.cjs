const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const controllerPath = path.join(
  root,
  'backend',
  'src',
  'tasks',
  'tasks.controller.ts'
);

const servicePath = path.join(
  root,
  'backend',
  'src',
  'tasks',
  'tasks.service.ts'
);

const apiPath = path.join(
  root,
  'frontend',
  'src',
  'api.ts'
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
  if (!fs.existsSync(file)) {
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


function write(file, text) {
  fs.writeFileSync(
    file,
    text,
    'utf8'
  );
}


function findMatchingBrace(
  text,
  openIndex
) {
  let depth = 0;
  let mode = 'code';
  let quote = '';

  for (
    let i = openIndex;
    i < text.length;
    i++
  ) {
    const ch = text[i];
    const next = text[i + 1];

    if (
      mode === 'lineComment'
    ) {
      if (ch === '\n') {
        mode = 'code';
      }
      continue;
    }

    if (
      mode === 'blockComment'
    ) {
      if (
        ch === '*' &&
        next === '/'
      ) {
        mode = 'code';
        i++;
      }
      continue;
    }

    if (
      mode === 'string'
    ) {
      if (ch === '\\') {
        i++;
        continue;
      }

      if (ch === quote) {
        mode = 'code';
      }

      continue;
    }

    if (
      ch === '/' &&
      next === '/'
    ) {
      mode = 'lineComment';
      i++;
      continue;
    }

    if (
      ch === '/' &&
      next === '*'
    ) {
      mode = 'blockComment';
      i++;
      continue;
    }

    if (
      ch === "'" ||
      ch === '"' ||
      ch === '`'
    ) {
      mode = 'string';
      quote = ch;
      continue;
    }

    if (ch === '{') {
      depth++;
      continue;
    }

    if (ch === '}') {
      depth--;

      if (depth === 0) {
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
    text.indexOf(token);

  if (start < 0) {
    return null;
  }

  const openBrace =
    text.indexOf(
      '{',
      start +
        token.length
    );

  if (openBrace < 0) {
    return null;
  }

  const closeBrace =
    findMatchingBrace(
      text,
      openBrace
    );

  if (closeBrace < 0) {
    return null;
  }

  return {
    start,
    openBrace,
    closeBrace,
    end:
      closeBrace + 1,
  };
}


let controller =
  read(controllerPath);

let service =
  read(servicePath);

let api =
  read(apiPath);


/*
 * ВАЖНО:
 * существующий returnInvoiceRequest()
 * намеренно НЕ изменяем.
 *
 * Он уже кастомизирован локально
 * предыдущими этапами.
 */

if (
  !service.includes(
    'returnInvoiceRequest'
  )
) {
  fail(
    'Не найден существующий returnInvoiceRequest().'
  );
}


/*
 * 1. Общий backend method.
 */

if (
  !service.includes(
    'async returnToManager('
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


          const deal =
            await tx.deal
              .findUniqueOrThrow({

                where: {
                  id:
                    task.dealId,
                },

                select: {
                  managerId:
                    true,
                },
              });


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
                    deal.managerId,

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
                    deal.managerId,

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
  }
`;

  service =
    service.slice(
      0,
      classRange.closeBrace
    ) +
    genericMethod +
    service.slice(
      classRange.closeBrace
    );
}


/*
 * 2. Controller endpoint.
 */

if (
  !controller.includes(
    "@Post(':id/return-to-manager')"
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

  const endpoint = `

  @Post(':id/return-to-manager')
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
      classRange.closeBrace
    ) +
    endpoint +
    controller.slice(
      classRange.closeBrace
    );
}


/*
 * 3. Frontend API helper.
 */

if (
  !api.includes(
    'export async function returnTaskToManager('
  )
) {
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


console.log('');

console.log(
  'Проверка Part 1L v4:'
);

console.log(
  '  Существующий возврат счёта: оставлен без изменений'
);

console.log(
  '  TasksService.returnToManager(): OK'
);

console.log(
  '  POST /tasks/:id/return-to-manager: OK'
);

console.log(
  '  frontend returnTaskToManager(): OK'
);

console.log(
  '  Возврат -> deal.managerId: OK'
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
      '.before-part1l-v4-' +
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
  'Part 1L v4 применён.'
);

console.log('');

console.log(
  'Существующий returnInvoiceRequest() НЕ изменялся.'
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
