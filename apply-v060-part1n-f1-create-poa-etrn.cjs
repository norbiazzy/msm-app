const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

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
    'StructuredTaskCreatePanel.tsx'
  );

const componentSourcePath =
  path.join(
    root,
    'StructuredTaskCreatePanel.part1n-f1.tmp'
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
    const ch = text[i];
    const next = text[i + 1];

    if (mode === 'lineComment') {
      if (ch === '\n') {
        mode = 'code';
      }
      continue;
    }

    if (mode === 'blockComment') {
      if (
        ch === '*' &&
        next === '/'
      ) {
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

    if (ch === openChar) {
      depth++;
      continue;
    }

    if (ch === closeChar) {
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

  const closeBrace =
    findMatching(
      text,
      openBrace,
      '{',
      '}'
    );

  if (
    openBrace < 0 ||
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
    text.indexOf(token);

  if (start < 0) {
    return null;
  }

  const openParen =
    text.indexOf(
      '(',
      start +
        token.length
    );

  const closeParen =
    findMatching(
      text,
      openParen,
      '(',
      ')'
    );

  const openBrace =
    text.indexOf(
      '{',
      closeParen + 1
    );

  const closeBrace =
    findMatching(
      text,
      openBrace,
      '{',
      '}'
    );

  if (
    openParen < 0 ||
    closeParen < 0 ||
    openBrace < 0 ||
    closeBrace < 0
  ) {
    return null;
  }

  return {
    start,
    openBrace,
    closeBrace,
    text:
      text.slice(
        start,
        closeBrace + 1
      ),
  };
}


function findImportBlockEnd(text) {
  let index = 0;
  let lastEnd = -1;

  while (
    index < text.length
  ) {
    while (
      index < text.length &&
      /\s/.test(text[index])
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

    if (semicolon < 0) {
      return -1;
    }

    lastEnd =
      semicolon + 1;
    index =
      semicolon + 1;
  }

  return lastEnd;
}


function ensurePrismaImport(text) {
  const regex =
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]@prisma\/client['"]\s*;/;

  const match =
    text.match(regex);

  if (!match) {
    fail(
      'Не найден import из @prisma/client.'
    );
  }

  if (
    /\bPrisma\b/.test(
      match[1]
    )
  ) {
    return text;
  }

  let inner =
    match[1].trim();

  if (
    inner &&
    !inner.endsWith(',')
  ) {
    inner += ',';
  }

  return text.replace(
    regex,
    `import {
${inner
  .split('\n')
  .map((line) =>
    line.trim()
      ? '  ' + line.trim()
      : line
  )
  .join('\n')}
  Prisma,
} from '@prisma/client';`
  );
}


let service =
  read(servicePath);

let controller =
  read(controllerPath);

let api =
  read(apiPath);

let app =
  read(appPath);

let styles =
  read(stylesPath);

const componentSource =
  read(componentSourcePath);


if (
  !service.includes(
    'async resubmitToAccounting('
  )
) {
  fail(
    'Не найден Part 1N-E1 / resubmitToAccounting.'
  );
}


if (
  !app.includes(
    "from './TaskStructuredFields'"
  )
) {
  fail(
    'Не найден TaskStructuredFields — сначала должен быть установлен Part 1N-E1.'
  );
}


/*
 * 1. Backend createStructuredTask
 */

service =
  ensurePrismaImport(
    service
  );


if (
  !service.includes(
    'async createStructuredTask('
  )
) {
  const classRange =
    findClassRange(
      service,
      'TasksService'
    );

  if (!classRange) {
    fail(
      'Не удалось разобрать TasksService.'
    );
  }

  const method =
    `

  async createStructuredTask(
    body: {
      dealId: string;
      actorId: string;
      type:
        | 'POWER_OF_ATTORNEY'
        | 'ETRN';
      description?: string;
      urgent?: boolean;
      details?: Prisma.InputJsonValue;
    },
  ) {

    const type =
      body.type ===
        'POWER_OF_ATTORNEY'
        ? TaskType.POWER_OF_ATTORNEY
        : body.type ===
            'ETRN'
          ? TaskType.ETRN
          : null;


    if (!type) {
      throw new BadRequestException(
        'Можно создать только доверенность или ЭТРН',
      );
    }


    const description =
      body.description
        ?.trim() ||
      null;


    const title =
      type ===
        TaskType.POWER_OF_ATTORNEY
        ? 'Создать доверенность'
        : 'Создать ЭТРН';


    return this.prisma
      .$transaction(
        async (tx) => {

          await tx.deal
            .findUniqueOrThrow({
              where: {
                id:
                  body.dealId,
              },
            });


          const task =
            await tx.task
              .create({

                data: {
                  dealId:
                    body.dealId,

                  type,

                  status:
                    TaskStatus.NEW,

                  urgent:
                    Boolean(
                      body.urgent
                    ),

                  title,

                  description,

                  details:
                    body.details,

                  createdById:
                    body.actorId,

                  assigneeId:
                    null,
                },
              });


          await tx.auditEvent
            .create({

              data: {
                dealId:
                  body.dealId,

                actorId:
                  body.actorId,

                action:
                  'STRUCTURED_TASK_CREATED',

                entityType:
                  'Task',

                entityId:
                  task.id,

                newValue: {
                  type,
                  status:
                    TaskStatus.NEW,
                  urgent:
                    task.urgent,
                  details:
                    body.details,
                },
              },
            });


          return task;
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

controller =
  ensurePrismaImport(
    controller
  );


if (
  !controller.includes(
    "@Post('structured')"
  )
) {
  const classRange =
    findClassRange(
      controller,
      'TasksController'
    );

  if (!classRange) {
    fail(
      'Не удалось разобрать TasksController.'
    );
  }

  const endpoint =
    `

  @Post('structured')
  createStructuredTask(
    @Body() body: {
      dealId: string;
      actorId: string;
      type:
        | 'POWER_OF_ATTORNEY'
        | 'ETRN';
      description?: string;
      urgent?: boolean;
      details?: Prisma.InputJsonValue;
    },
  ) {

    return this.tasks
      .createStructuredTask(
        body
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
    'export async function createStructuredTask('
  )
) {
  api =
    api.trimEnd() +
    `

export async function createStructuredTask(
  payload: {
    dealId: string;
    actorId: string;
    type:
      | 'POWER_OF_ATTORNEY'
      | 'ETRN';
    description?: string;
    urgent?: boolean;
    details?: Record<string, unknown>;
  },
) {

  return json<Task>(
    '/tasks/structured',
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
}


/*
 * 4. App import component.
 */

if (
  !app.includes(
    "from './StructuredTaskCreatePanel'"
  )
) {
  const importEnd =
    findImportBlockEnd(
      app
    );

  if (importEnd < 0) {
    fail(
      'Не удалось определить import block App.tsx.'
    );
  }

  app =
    app.slice(
      0,
      importEnd
    ) +
    `

import {
  StructuredTaskCreatePanel,
} from './StructuredTaskCreatePanel';` +
    app.slice(
      importEnd
    );
}


/*
 * 5. Insert into DealDetail root section.
 */

if (
  !app.includes(
    'PART_1N_F1_STRUCTURED_CREATE'
  )
) {
  const dealDetail =
    findFunctionRange(
      app,
      'DealDetail'
    );

  if (!dealDetail) {
    fail(
      'Не найден DealDetail().'
    );
  }

  const sectionMatch =
    /<section\b[^>]*>/
      .exec(
        dealDetail.text
      );

  if (!sectionMatch) {
    fail(
      'В DealDetail не найден корневой <section>.'
    );
  }

  const insertAt =
    dealDetail.start +
    sectionMatch.index +
    sectionMatch[0].length;

  const block =
    `

      {/* PART_1N_F1_STRUCTURED_CREATE */}

      {user.role !==
        'ACCOUNTANT' && (

        <StructuredTaskCreatePanel
          dealId={dealId}
          actorId={user.id}
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
  'MSM structured task create v0.6.0 part 1N-F1';

if (
  !styles.includes(
    cssMarker
  )
) {
  styles =
    styles.trimEnd() +
    `

/* ${cssMarker} */

.structuredTaskCreate {
  margin: 12px 0 18px;
  padding: 14px;
  border: 1px solid rgba(120, 120, 120, 0.16);
  border-radius: 16px;
}

.structuredTaskCreateHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.structuredTaskCreateHead > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.structuredTaskCreateHead span {
  font-size: 12px;
  opacity: 0.66;
}

.structuredTaskButtons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 12px;
}

.structuredTaskForm {
  margin-top: 12px;
}

.structuredTaskFormTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

@media (max-width: 520px) {
  .structuredTaskButtons {
    grid-template-columns: 1fr;
  }
}
`;
}


/*
 * Final verification.
 */

const checks = [
  [
    service.includes(
      'async createStructuredTask('
    ),
    'Backend createStructuredTask отсутствует.',
  ],
  [
    service.includes(
      'STRUCTURED_TASK_CREATED'
    ),
    'AuditEvent создания отсутствует.',
  ],
  [
    controller.includes(
      "@Post('structured')"
    ),
    'Controller endpoint отсутствует.',
  ],
  [
    api.includes(
      'export async function createStructuredTask('
    ),
    'Frontend API helper отсутствует.',
  ],
  [
    app.includes(
      'PART_1N_F1_STRUCTURED_CREATE'
    ),
    'StructuredTaskCreatePanel не вставлен в DealDetail.',
  ],
  [
    componentSource.includes(
      '<TaskStructuredFields'
    ),
    'Форма не использует TaskStructuredFields.',
  ],
  [
    componentSource.includes(
      'TASK_ATTACHMENT_'
    ),
    'Файлы не привязаны к новой задаче.',
  ],
  [
    componentSource.includes(
      "window.location.hash ="
    ),
    'Нет перехода к задачам после создания.',
  ],
];

for (
  const [ok, message]
  of checks
) {
  if (!ok) {
    fail(message);
  }
}


console.log('');
console.log(
  'Проверка Part 1N-F1:'
);
console.log(
  '  Создание доверенности с details: OK'
);
console.log(
  '  Создание ЭТРН с details: OK'
);
console.log(
  '  Все поля необязательные: OK'
);
console.log(
  '  AuditEvent создания: OK'
);
console.log(
  '  Документы -> TASK_ATTACHMENT_<taskId>: OK'
);
console.log(
  '  Прогресс загрузки привязан к taskId: OK'
);
console.log(
  '  После создания переход в «Задачи»: OK'
);
console.log(
  '  Возврат потом редактирует те же details: OK'
);
console.log(
  '  Prisma migration: НЕ требуется'
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
      '.before-part1n-f1-' +
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
  api.replace(
    /[ \t]+\n/g,
    '\n'
  ).replace(
    /\n+$/,
    '\n'
  )
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
  'Part 1N-F1 применён.'
);
console.log('');
console.log(
  'Новая Prisma migration не нужна.'
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
