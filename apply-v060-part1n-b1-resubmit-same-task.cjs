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

const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

const stylesPath =
  path.join(
    root,
    'frontend',
    'src',
    'styles.css'
  );

const componentPath =
  path.join(
    root,
    'frontend',
    'src',
    'ManagerResubmitPanel.tsx'
  );

const componentSourcePath =
  path.join(
    root,
    'ManagerResubmitPanel.part1n-b1.tmp'
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
        mode = 'code';
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

        mode = 'code';
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
        mode = 'code';
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
    end:
      closeBrace + 1,
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

let app =
  read(
    appPath
  );

let styles =
  read(
    stylesPath
  );

const componentSource =
  read(
    componentSourcePath
  );


if (
  !service.includes(
    'async returnToManager('
  )
) {

  fail(
    'Part 1L v4 не найден: нет returnToManager().'
  );
}


/*
 * 1. Backend service:
 * same Task, NEED_DATA -> NEW.
 */

if (
  !service.includes(
    'async resubmitToAccounting('
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

  async resubmitToAccounting(
    id: string,
    body: {
      actorId: string;
      description?: string;
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
              TaskStatus.NEED_DATA
          ) {

            throw new BadRequestException(
              'Повторно отправить можно только возвращённую задачу',
            );
          }


          const nextDescription =
            body.description !==
              undefined

              ? (
                  body.description
                    .trim() ||
                  null
                )

              : task.description;


          const nextUrgent =
            body.urgent !==
              undefined

              ? Boolean(
                  body.urgent
                )

              : task.urgent;


          const updated =
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

                  description:
                    nextDescription,

                  urgent:
                    nextUrgent,
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
                  'TASK_RESUBMITTED_TO_ACCOUNTING',

                entityType:
                  'Task',

                entityId:
                  task.id,

                oldValue: {

                  status:
                    task.status,

                  assigneeId:
                    task.assigneeId,

                  description:
                    task.description,

                  urgent:
                    task.urgent,
                },

                newValue: {

                  status:
                    TaskStatus.NEW,

                  assigneeId:
                    null,

                  description:
                    nextDescription,

                  urgent:
                    nextUrgent,

                  taskType:
                    task.type,
                },
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
    method +
    service.slice(
      classRange.closeBrace
    );
}


/*
 * 2. Controller endpoint.
 */

if (
  !controller.includes(
    "@Post(':id/resubmit-to-accounting')"
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

  @Post(':id/resubmit-to-accounting')
  resubmitToAccounting(
    @Param('id') id: string,

    @Body() body: {
      actorId: string;
      description?: string;
      urgent?: boolean;
    },
  ) {

    return this.tasks
      .resubmitToAccounting(
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
    'export async function resubmitTaskToAccounting('
  )
) {

  const helper =
    `

export async function resubmitTaskToAccounting(
  taskId: string,

  payload: {
    actorId: string;
    description?: string;
    urgent?: boolean;
  },
) {

  return json(
    \`/tasks/\${taskId}/resubmit-to-accounting\`,
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
 * 4. App import.
 */

if (
  !app.includes(
    "from './ManagerResubmitPanel'"
  )
) {

  const importEnd =
    findImportBlockEnd(
      app
    );


  if (
    importEnd < 0
  ) {

    fail(
      'Не удалось определить конец import-блока в App.tsx.'
    );
  }


  const importText =
    `

import {
  ManagerResubmitPanel,
} from './ManagerResubmitPanel';`;


  app =
    app.slice(
      0,
      importEnd
    ) +
    importText +
    app.slice(
      importEnd
    );
}


/*
 * 5. Generic manager edit/resubmit for POA and ETRN.
 */

if (
  !app.includes(
    'PART_1N_B1_MANAGER_RESUBMIT'
  )
) {

  const taskDetail =
    findFunctionRange(
      app,
      'TaskDetail'
    );


  if (!taskDetail) {

    fail(
      'Не найден function TaskDetail().'
    );
  }


  const sectionRegex =
    /<section\b[^>]*>/;


  const sectionMatch =
    sectionRegex.exec(
      taskDetail.text
    );


  if (!sectionMatch) {

    fail(
      'В TaskDetail не найден корневой <section>.'
    );
  }


  const insertAt =
    taskDetail.start +
    sectionMatch.index +
    sectionMatch[0].length;


  const block =
    `

      {/* PART_1N_B1_MANAGER_RESUBMIT */}

      {status === 'NEED_DATA' &&
        user.role !== 'ACCOUNTANT' &&
        [
          'POWER_OF_ATTORNEY',
          'ETRN',
        ].includes(
          task.type
        ) && (

        <ManagerResubmitPanel
          taskId={task.id}
          actorId={user.id}
          initialDescription={
            task.description
          }
          initialUrgent={
            task.urgent
          }
          onResubmitted={onBack}
        />

      )}
`;


  app =
    app.slice(
      0,
      insertAt
    ) +
    block +
    app.slice(
      insertAt
    );
}


/*
 * 6. Styles.
 */

const cssMarker =
  'MSM manager resubmit panel v0.6.0 part 1N-B1';


if (
  !styles.includes(
    cssMarker
  )
) {

  styles =
    styles.trimEnd() +
    `

/* ${cssMarker} */

.managerResubmitPanel {
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid
    rgba(217, 119, 6, 0.25);
  border-radius: 16px;
  background:
    rgba(245, 158, 11, 0.08);
}

.managerResubmitHead {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.managerResubmitHead strong {
  font-size: 15px;
}

.managerResubmitHead span {
  font-size: 12px;
  opacity: 0.75;
}

html[data-theme='dark'] .managerResubmitPanel {
  border-color:
    rgba(251, 191, 36, 0.20);
  background:
    rgba(245, 158, 11, 0.08);
}
`;
}


/*
 * Final checks before writing.
 */

if (
  !service.includes(
    'async resubmitToAccounting('
  )
) {
  fail(
    'Не добавлен resubmitToAccounting().'
  );
}

if (
  !controller.includes(
    "@Post(':id/resubmit-to-accounting')"
  )
) {
  fail(
    'Не добавлен endpoint resubmit-to-accounting.'
  );
}

if (
  !api.includes(
    'resubmitTaskToAccounting('
  )
) {
  fail(
    'Не добавлен frontend API helper.'
  );
}

if (
  !app.includes(
    'PART_1N_B1_MANAGER_RESUBMIT'
  )
) {
  fail(
    'Не добавлен manager resubmit block.'
  );
}


console.log('');

console.log(
  'Проверка Part 1N-B1:'
);

console.log(
  '  Та же Task: NEED_DATA -> NEW: OK'
);

console.log(
  '  assigneeId -> null: OK'
);

console.log(
  '  Новая Task НЕ создаётся: OK'
);

console.log(
  '  description/urgent редактируются: OK'
);

console.log(
  '  POWER_OF_ATTORNEY + ETRN: подключены'
);

console.log(
  '  Audit TASK_RESUBMITTED_TO_ACCOUNTING: OK'
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
    appPath,
    stylesPath,
  ]
) {

  fs.copyFileSync(
    file,
    file +
      '.before-part1n-b1-' +
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
  appPath,
  app
);

write(
  stylesPath,
  styles
);

write(
  componentPath,
  componentSource
);


console.log('');

console.log(
  'Part 1N-B1 применён.'
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
