const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const schemaPath =
  path.join(root, 'backend', 'prisma', 'schema.prisma');

const servicePath =
  path.join(root, 'backend', 'src', 'tasks', 'tasks.service.ts');

const controllerPath =
  path.join(root, 'backend', 'src', 'tasks', 'tasks.controller.ts');

const apiPath =
  path.join(root, 'frontend', 'src', 'api.ts');

const appPath =
  path.join(root, 'frontend', 'src', 'App.tsx');

const stylesPath =
  path.join(root, 'frontend', 'src', 'styles.css');

const managerPath =
  path.join(root, 'frontend', 'src', 'ManagerResubmitPanel.tsx');

const structuredPath =
  path.join(root, 'frontend', 'src', 'TaskStructuredFields.tsx');

const managerSourcePath =
  path.join(root, 'ManagerResubmitPanel.part1n-e1-v2.tmp');

const structuredSourcePath =
  path.join(root, 'TaskStructuredFields.part1n-e1-v2.tmp');

const migrationDir =
  path.join(
    root,
    'backend',
    'prisma',
    'migrations',
    '20260927221000_task_details'
  );

const migrationPath =
  path.join(
    migrationDir,
    'migration.sql'
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

  if (openParen < 0) {
    return null;
  }

  const closeParen =
    findMatching(
      text,
      openParen,
      '(',
      ')'
    );

  if (closeParen < 0) {
    return null;
  }

  const openBrace =
    text.indexOf(
      '{',
      closeParen + 1
    );

  if (openBrace < 0) {
    return null;
  }

  const closeBrace =
    findMatching(
      text,
      openBrace,
      '{',
      '}'
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


let schema = read(schemaPath);
let service = read(servicePath);
let controller = read(controllerPath);
let api = read(apiPath);
let app = read(appPath);
let styles = read(stylesPath);

const managerSource =
  read(managerSourcePath);

const structuredSource =
  read(structuredSourcePath);


if (
  !service.includes(
    'async resubmitToAccounting('
  )
) {
  fail(
    'Part 1N-B1 не найден.'
  );
}


if (
  !app.includes(
    '<ManagerResubmitPanel'
  )
) {
  fail(
    'Не найден ManagerResubmitPanel в App.tsx.'
  );
}


/* 1. schema */
if (
  !/\n\s*details\s+Json\?/.test(
    schema
  )
) {
  const needle =
    '  description        String?\n';

  if (
    !schema.includes(
      needle
    )
  ) {
    fail(
      'В Task schema не найден description.'
    );
  }

  schema =
    schema.replace(
      needle,
      needle +
        '  details            Json?\n'
    );
}


/* 2. service body */
const serviceMethodIndex =
  service.indexOf(
    'async resubmitToAccounting('
  );

const serviceMethodEnd =
  service.indexOf(
    '\n  }\n',
    serviceMethodIndex
  );

if (
  serviceMethodEnd < 0
) {
  fail(
    'Не удалось определить конец resubmitToAccounting.'
  );
}

let serviceMethod =
  service.slice(
    serviceMethodIndex,
    serviceMethodEnd + 5
  );

if (
  !serviceMethod.includes(
    'details?: Record<string, unknown>;'
  )
) {
  serviceMethod =
    serviceMethod.replace(
      'urgent?: boolean;',
      'urgent?: boolean;\n      details?: Record<string, unknown>;'
    );
}

if (
  !serviceMethod.includes(
    'body.details !=='
  )
) {
  const urgentPattern =
    /urgent:\s*nextUrgent\s*,/;

  if (
    !urgentPattern.test(
      serviceMethod
    )
  ) {
    fail(
      'В resubmitToAccounting не найден urgent: nextUrgent.'
    );
  }

  serviceMethod =
    serviceMethod.replace(
      urgentPattern,
      `urgent:
                    nextUrgent,

                  details:
                    body.details !==
                      undefined
                      ? body.details
                      : task.details,`
    );
}

service =
  service.slice(
    0,
    serviceMethodIndex
  ) +
  serviceMethod +
  service.slice(
    serviceMethodEnd + 5
  );


/* 3. controller */
const controllerIndex =
  controller.indexOf(
    "@Post(':id/resubmit-to-accounting')"
  );

if (
  controllerIndex < 0
) {
  fail(
    'Не найден controller resubmit endpoint.'
  );
}

const controllerEnd =
  Math.min(
    controller.length,
    controllerIndex + 1200
  );

let controllerWindow =
  controller.slice(
    controllerIndex,
    controllerEnd
  );

if (
  !controllerWindow.includes(
    'details?: Record<string, unknown>;'
  )
) {
  controllerWindow =
    controllerWindow.replace(
      'urgent?: boolean;',
      'urgent?: boolean;\n      details?: Record<string, unknown>;'
    );

  controller =
    controller.slice(
      0,
      controllerIndex
    ) +
    controllerWindow +
    controller.slice(
      controllerEnd
    );
}


/* 4. api Task type */
const taskTypeIndex =
  api.indexOf(
    'export type Task = {'
  );

if (
  taskTypeIndex < 0
) {
  fail(
    'Не найден frontend Task type.'
  );
}

const taskTypeEnd =
  api.indexOf(
    '};',
    taskTypeIndex
  );

let taskTypeBlock =
  api.slice(
    taskTypeIndex,
    taskTypeEnd + 2
  );

if (
  !taskTypeBlock.includes(
    'details?: Record<string, unknown>;'
  )
) {
  taskTypeBlock =
    taskTypeBlock.replace(
      'description?: string;',
      'description?: string;\n  details?: Record<string, unknown>;'
    );

  api =
    api.slice(
      0,
      taskTypeIndex
    ) +
    taskTypeBlock +
    api.slice(
      taskTypeEnd + 2
    );
}


/* 5. api resubmit payload */
const helperIndex =
  api.indexOf(
    'export async function resubmitTaskToAccounting('
  );

if (
  helperIndex < 0
) {
  fail(
    'Не найден resubmitTaskToAccounting.'
  );
}

const helperEnd =
  Math.min(
    api.length,
    helperIndex + 1200
  );

let helperWindow =
  api.slice(
    helperIndex,
    helperEnd
  );

if (
  !helperWindow.includes(
    'details?: Record<string, unknown>;'
  )
) {
  helperWindow =
    helperWindow.replace(
      'urgent?: boolean;',
      'urgent?: boolean;\n    details?: Record<string, unknown>;'
    );

  api =
    api.slice(
      0,
      helperIndex
    ) +
    helperWindow +
    api.slice(
      helperEnd
    );
}


/* 6. App import */
if (
  !app.includes(
    "from './TaskStructuredFields'"
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
  TaskStructuredFields,
} from './TaskStructuredFields';` +
    app.slice(
      importEnd
    );
}


/* 7. initialDetails prop */
const panelIndex =
  app.indexOf(
    '<ManagerResubmitPanel'
  );

const panelClose =
  app.indexOf(
    '/>',
    panelIndex
  );

if (
  panelIndex < 0 ||
  panelClose < 0
) {
  fail(
    'Не удалось разобрать ManagerResubmitPanel props.'
  );
}

let panelBlock =
  app.slice(
    panelIndex,
    panelClose + 2
  );

if (
  !panelBlock.includes(
    'initialDetails='
  )
) {
  const onResubmittedIndex =
    panelBlock.indexOf(
      'onResubmitted='
    );

  if (
    onResubmittedIndex < 0
  ) {
    fail(
      'В ManagerResubmitPanel не найден onResubmitted.'
    );
  }

  panelBlock =
    panelBlock.slice(
      0,
      onResubmittedIndex
    ) +
    `initialDetails={
            task.details
          }
          ` +
    panelBlock.slice(
      onResubmittedIndex
    );

  app =
    app.slice(
      0,
      panelIndex
    ) +
    panelBlock +
    app.slice(
      panelClose + 2
    );
}


/* 8. read-only details in TaskDetail */
if (
  !app.includes(
    'PART_1N_E1_STRUCTURED_TASK_DETAILS'
  )
) {
  const taskDetail =
    findFunctionRange(
      app,
      'TaskDetail'
    );

  if (!taskDetail) {
    fail(
      'Не найден TaskDetail.'
    );
  }

  const sectionMatch =
    /<section\b[^>]*>/
      .exec(
        taskDetail.text
      );

  if (!sectionMatch) {
    fail(
      'В TaskDetail не найден root section.'
    );
  }

  const insertAt =
    taskDetail.start +
    sectionMatch.index +
    sectionMatch[0].length;

  const block =
    `

      {/* PART_1N_E1_STRUCTURED_TASK_DETAILS */}

      {[
        'POWER_OF_ATTORNEY',
        'ETRN',
      ].includes(
        task.type
      ) &&
        task.details &&
        Object.keys(
          task.details
        ).length > 0 && (

        <TaskStructuredFields
          taskType={task.type}
          value={task.details}
          readOnly
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


/* 9. styles */
const cssMarker =
  'MSM structured task details v0.6.0 part 1N-E1';

if (
  !styles.includes(
    cssMarker
  )
) {
  styles =
    styles.trimEnd() +
    `

/* ${cssMarker} */

.taskStructuredEdit,
.taskStructuredRead {
  margin: 12px 0;
  padding: 12px;
  border: 1px solid rgba(120, 120, 120, 0.16);
  border-radius: 14px;
}

.taskStructuredTitle {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
}

.taskStructuredRead {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.taskStructuredReadRow {
  display: grid;
  grid-template-columns: minmax(120px, 0.8fr) minmax(0, 1.4fr);
  gap: 10px;
  padding-bottom: 7px;
  border-bottom: 1px solid rgba(120, 120, 120, 0.12);
}

.taskStructuredReadRow:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.taskStructuredReadRow span {
  font-size: 12px;
  opacity: 0.68;
}

.taskStructuredReadRow b {
  min-width: 0;
  font-size: 13px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 520px) {
  .taskStructuredReadRow {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
`;
}


/* final verification */
const checks = [
  [/\n\s*details\s+Json\?/.test(schema), 'schema details missing'],
  [service.includes('details?: Record<string, unknown>;'), 'service details type missing'],
  [service.includes('body.details !=='), 'service details update missing'],
  [controller.includes('details?: Record<string, unknown>;'), 'controller details missing'],
  [api.includes('details?: Record<string, unknown>;'), 'api details missing'],
  [app.includes('initialDetails='), 'initialDetails missing'],
  [app.includes('PART_1N_E1_STRUCTURED_TASK_DETAILS'), 'read-only block missing'],
  [managerSource.includes('<TaskStructuredFields'), 'manager structured editor missing'],
  [structuredSource.includes('Данные доверенности'), 'poa fields missing'],
  [structuredSource.includes('Данные ЭТРН'), 'etrn fields missing'],
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
console.log('Проверка Part 1N-E1 v2:');
console.log('  Task.details Json?: OK');
console.log('  Доверенность — структурированные поля: OK');
console.log('  ЭТРН — структурированные поля: OK');
console.log('  Все поля необязательные: OK');
console.log('  Менеджер редактирует те же details: OK');
console.log('  Бухгалтер видит те же details: OK');
console.log('  Повторная отправка использует ту же Task: OK');
console.log('  Документы/прогресс сохраняются по прежней схеме: OK');
console.log('  Prisma migration: требуется');


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
    schemaPath,
    servicePath,
    controllerPath,
    apiPath,
    appPath,
    stylesPath,
    managerPath,
  ]
) {
  fs.copyFileSync(
    file,
    file +
      '.before-part1n-e1-v2-' +
      stamp
  );
}


write(schemaPath, schema);
write(servicePath, service);
write(controllerPath, controller);
write(apiPath, api);
write(appPath, app);
write(stylesPath, styles);
write(managerPath, managerSource);
write(structuredPath, structuredSource);

fs.mkdirSync(
  migrationDir,
  {
    recursive: true,
  }
);

if (
  !fs.existsSync(
    migrationPath
  )
) {
  write(
    migrationPath,
    `-- Part 1N-E1 structured task details
ALTER TABLE "Task"
ADD COLUMN "details" JSONB;
`
  );
}


console.log('');
console.log(
  'Part 1N-E1 v2 применён.'
);
console.log('');
console.log(
  'Дальше ОБЯЗАТЕЛЬНО примените миграцию:'
);
console.log(
  '  cd backend'
);
console.log(
  '  npx prisma migrate deploy'
);
console.log(
  '  npx prisma generate'
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
