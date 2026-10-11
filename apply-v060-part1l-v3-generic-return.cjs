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

function findMatchingBrace(text, openIndex) {
  let depth = 0;
  let mode = 'code';
  let quote = '';
  let templateDepth = 0;

  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (mode === 'lineComment') {
      if (ch === '\n') {
        mode = 'code';
      }
      continue;
    }

    if (mode === 'blockComment') {
      if (ch === '*' && next === '/') {
        mode = 'code';
        i++;
      }
      continue;
    }

    if (mode === 'string') {
      if (ch === '\\') {
        i++;
        continue;
      }

      if (ch === quote) {
        mode = 'code';
      }

      continue;
    }

    if (mode === 'template') {
      if (ch === '\\') {
        i++;
        continue;
      }

      if (ch === '`' && templateDepth === 0) {
        mode = 'code';
        continue;
      }

      if (ch === '$' && next === '{') {
        templateDepth++;
        i++;
        continue;
      }

      if (ch === '}' && templateDepth > 0) {
        templateDepth--;
        continue;
      }

      continue;
    }

    if (ch === '/' && next === '/') {
      mode = 'lineComment';
      i++;
      continue;
    }

    if (ch === '/' && next === '*') {
      mode = 'blockComment';
      i++;
      continue;
    }

    if (
      ch === "'" ||
      ch === '"'
    ) {
      mode = 'string';
      quote = ch;
      continue;
    }

    if (ch === '`') {
      mode = 'template';
      templateDepth = 0;
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

      continue;
    }
  }

  return -1;
}

function findMatchingParen(
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
      ch === '('
    ) {

      depth++;

      continue;
    }


    if (
      ch === ')'
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


function findMethodRange(
  text,
  methodName
) {

  const signatureRegex =
    new RegExp(
      '\\b(?:async\\s+)?' +
      methodName +
      '\\s*\\('
    );


  const match =
    signatureRegex.exec(
      text
    );


  if (!match) {
    return null;
  }


  const start =
    match.index;


  const openParen =
    text.indexOf(
      '(',
      start
    );


  if (
    openParen < 0
  ) {
    return null;
  }


  const closeParen =
    findMatchingParen(
      text,
      openParen
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
    findMatchingBrace(
      text,
      openBrace
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
    end:
      closeBrace + 1,

    text:
      text.slice(
        start,
        closeBrace + 1
      ),
  };
}

function findClassRange(text, className) {
  const classRegex =
    new RegExp(
      'export\\s+class\\s+' +
      className +
      '\\b'
    );

  const match =
    classRegex.exec(text);

  if (!match) {
    return null;
  }

  const openBrace =
    text.indexOf(
      '{',
      match.index + match[0].length
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
    start: match.index,
    openBrace,
    closeBrace,
    end: closeBrace + 1,
  };
}

let controller =
  read(controllerPath);

let service =
  read(servicePath);

let api =
  read(apiPath);


/*
 * 1. Existing invoice return:
 * same task, but assign it back to deal.managerId.
 *
 * We deliberately do not rewrite the existing task query.
 * Instead we resolve managerId from task.dealId immediately
 * before the existing task.update().
 */

if (
  service.includes(
    'returnInvoiceRequest'
  ) &&
  !service.includes(
    'INVOICE_RETURN_MANAGER_FIX_V2'
  )
) {
  const range =
    findMethodRange(
      service,
      'returnInvoiceRequest'
    );

  if (!range) {
    fail(
      'Не удалось разобрать returnInvoiceRequest().'
    );
  }

  let method =
    range.text;

  if (
    !method.includes(
      'dealManagerForReturn'
    )
  ) {
    const updatedRegex =
      /(\s*)(const\s+updated\s*=\s*)/;

    const updatedMatch =
      method.match(
        updatedRegex
      );

    if (!updatedMatch) {
      fail(
        'В returnInvoiceRequest() не найден const updated.'
      );
    }

    const indent =
      updatedMatch[1];

    const managerLookup =
      `${indent}const dealManagerForReturn =
${indent}  await tx.deal
${indent}    .findUniqueOrThrow({
${indent}      where: {
${indent}        id:
${indent}          task.dealId,
${indent}      },
${indent}
${indent}      select: {
${indent}        managerId:
${indent}          true,
${indent}      },
${indent}    });
${indent}
`;

    method =
      method.replace(
        updatedRegex,
        managerLookup +
          updatedMatch[1] +
          updatedMatch[2]
      );
  }

  const actorAssigneeRegex =
    /assigneeId\s*:\s*body\.actorId\s*,?/;

  if (
    actorAssigneeRegex.test(
      method
    )
  ) {
    method =
      method.replace(
        actorAssigneeRegex,
        `assigneeId:
                dealManagerForReturn.managerId,`
      );
  } else if (
    !method.includes(
      'dealManagerForReturn.managerId'
    )
  ) {
    fail(
      'В returnInvoiceRequest() не найден assigneeId: body.actorId.'
    );
  }

  method =
    `// INVOICE_RETURN_MANAGER_FIX_V2
  ` +
    method;

  service =
    service.slice(
      0,
      range.start
    ) +
    method +
    service.slice(
      range.end
    );
}


/*
 * 2. Generic returnToManager method.
 * Insert before final TasksService class brace.
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
 * 3. Controller endpoint.
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
 * 4. Frontend helper.
 * Appending to api.ts is intentionally structure-independent.
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
    api.trimEnd() +
    helper +
    '\n';
}


console.log('');
console.log(
  'Проверка Part 1L v2:'
);
console.log(
  '  returnInvoiceRequest(): найден и разобран'
);
console.log(
  '  Старый возврат -> managerId сделки: OK'
);
console.log(
  '  Общий returnToManager(): OK'
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
      '.before-part1l-v2-' +
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
  'Part 1L v2 применён.'
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
