const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly = process.argv.includes('--check');

const servicePath = path.join(
  root,
  'backend',
  'src',
  'tasks',
  'tasks.service.ts'
);

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const typesPath = path.join(
  root,
  'frontend',
  'src',
  'types.ts'
);

const stylesPath = path.join(
  root,
  'frontend',
  'src',
  'styles.css'
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


let service =
  read(servicePath);

let app =
  read(appPath);

let types =
  read(typesPath);

let styles =
  read(stylesPath);


/*
 * 1. Backend: include recent return audit events
 * in each task's deal.
 */

if (
  !service.includes(
    'PART_1N_RETURN_AUDIT_EVENTS'
  )
) {

  const listIndex =
    service.indexOf(
      'list()'
    );

  if (listIndex < 0) {
    fail(
      'Не найден TasksService.list().'
    );
  }


  const dealIndex =
    service.indexOf(
      'deal:',
      listIndex
    );

  if (dealIndex < 0) {
    fail(
      'В TasksService.list() не найден deal:.'
    );
  }


  const includeIndex =
    service.indexOf(
      'include:',
      dealIndex
    );

  if (includeIndex < 0) {
    fail(
      'В deal не найден include:.'
    );
  }


  const includeOpen =
    service.indexOf(
      '{',
      includeIndex
    );

  if (includeOpen < 0) {
    fail(
      'Не найден объект deal.include.'
    );
  }


  const auditInclude =
    `

              // PART_1N_RETURN_AUDIT_EVENTS
              auditEvents: {

                where: {

                  action: {
                    in: [
                      'TASK_RETURNED_TO_MANAGER',
                      'INVOICE_REQUEST_RETURNED',
                    ],
                  },
                },

                orderBy: {
                  createdAt:
                    'desc',
                },

                take: 20,
              },
`;


  service =
    service.slice(
      0,
      includeOpen + 1
    ) +
    auditInclude +
    service.slice(
      includeOpen + 1
    );
}


/*
 * 2. Frontend AuditEvent type.
 */

if (
  !types.includes(
    'entityId?: string;'
  )
) {

  const auditTypeIndex =
    types.indexOf(
      'export type AuditEvent = {'
    );

  if (auditTypeIndex < 0) {
    fail(
      'Не найден export type AuditEvent.'
    );
  }


  const entityTypeIndex =
    types.indexOf(
      'entityType: string;',
      auditTypeIndex
    );

  if (entityTypeIndex < 0) {
    fail(
      'В AuditEvent не найден entityType.'
    );
  }


  const lineEnd =
    types.indexOf(
      '\n',
      entityTypeIndex
    );


  types =
    types.slice(
      0,
      lineEnd + 1
    ) +
    '  entityId?: string;\n' +
    types.slice(
      lineEnd + 1
    );
}


/*
 * 3. renderTask(): return metadata.
 * No dependency on background upload variable names.
 */

if (
  !app.includes(
    'PART_1N_RETURN_INFO'
  )
) {

  const renderTask =
    findFunctionRange(
      app,
      'renderTask'
    );


  if (!renderTask) {
    fail(
      'Не найден function renderTask().'
    );
  }


  const returnInfo =
    `

    // PART_1N_RETURN_INFO
    const latestReturn =
      task.status === 'NEED_DATA'

        ? (
            task.deal.auditEvents ||
            []
          ).find(
            (event) =>

              event.entityId ===
                task.id &&

              [
                'TASK_RETURNED_TO_MANAGER',
                'INVOICE_REQUEST_RETURNED',
              ].includes(
                event.action
              )
          )

        : undefined;


    const returnReason =
      String(
        latestReturn
          ?.newValue
          ?.reasonLabel ||
        'Нужно уточнить данные'
      );


    const returnComment =
      latestReturn
        ?.reason;
`;


  app =
    app.slice(
      0,
      renderTask.openBrace + 1
    ) +
    returnInfo +
    app.slice(
      renderTask.openBrace + 1
    );
}


/*
 * 4. renderTask(): visible notice before taskState.
 */

if (
  !app.includes(
    'PART_1N_RETURN_NOTICE'
  )
) {

  const renderTask =
    findFunctionRange(
      app,
      'renderTask'
    );


  if (!renderTask) {
    fail(
      'После вставки данных не найден renderTask().'
    );
  }


  const taskStateRegex =
    /<div\s+className=['"]taskState['"]>/;


  const stateMatch =
    taskStateRegex.exec(
      renderTask.text
    );


  if (!stateMatch) {
    fail(
      'В renderTask не найден <div className="taskState">.'
    );
  }


  const insertAt =
    renderTask.start +
    stateMatch.index;


  const notice =
    `{/* PART_1N_RETURN_NOTICE */}

        {task.status === 'NEED_DATA' && (

          <div className="taskReturnNotice">

            <strong>
              Нужно исправить
            </strong>

            <span>
              {returnReason}
            </span>

            {returnComment && (

              <p>
                {returnComment}
              </p>

            )}

            <em>
              Открыть и исправить →
            </em>

          </div>

        )}


        `;


  app =
    app.slice(
      0,
      insertAt
    ) +
    notice +
    app.slice(
      insertAt
    );
}


/*
 * 5. Manager group title.
 */

if (
  !app.includes(
    'PART_1N_MANAGER_GROUP_LABEL'
  )
) {

  const tasksView =
    findFunctionRange(
      app,
      'TasksView'
    );


  if (!tasksView) {
    fail(
      'Не найден function TasksView().'
    );
  }


  let tasksText =
    tasksView.text;


  const exactGroupRegex =
    /renderGroup\(\s*['"]Нужны данные['"]\s*,\s*needData\s*,\s*['"]taskGroupNeedData['"]\s*\)/;


  if (
    exactGroupRegex.test(
      tasksText
    )
  ) {

    tasksText =
      tasksText.replace(
        exactGroupRegex,
        `/* PART_1N_MANAGER_GROUP_LABEL */
          renderGroup(
            user.role === 'MANAGER'
              ? 'Нужно исправить'
              : 'Нужны данные',
            needData,
            'taskGroupNeedData'
          )`
      );

  } else if (
    tasksText.includes(
      "'Нужны данные'"
    ) ||
    tasksText.includes(
      '"Нужны данные"'
    )
  ) {

    const labelRegex =
      /['"]Нужны данные['"]/;


    tasksText =
      tasksText.replace(
        labelRegex,
        `user.role === 'MANAGER'
              ? 'Нужно исправить'
              : 'Нужны данные'`
      );


    const returnIndex =
      tasksText.indexOf(
        'return ('
      );


    if (returnIndex >= 0) {
      tasksText =
        tasksText.slice(
          0,
          returnIndex
        ) +
        `// PART_1N_MANAGER_GROUP_LABEL
  ` +
        tasksText.slice(
          returnIndex
        );
    }

  } else {

    fail(
      'В TasksView не найден заголовок «Нужны данные».'
    );
  }


  app =
    app.slice(
      0,
      tasksView.start
    ) +
    tasksText +
    app.slice(
      tasksView.end
    );
}


/*
 * 6. Styles.
 */

const cssMarker =
  'MSM returned task manager notice v0.6.0 part 1N';


if (
  !styles.includes(
    cssMarker
  )
) {

  styles =
    styles.trimEnd() +
    `

/* ${cssMarker} */

.taskCardStatus-need-data {
  border-color:
    rgba(217, 119, 6, 0.38);
}

.taskReturnNotice {
  margin: 8px 12px 8px 0;
  padding: 10px 12px;
  min-width: 180px;
  border: 1px solid
    rgba(217, 119, 6, 0.22);
  border-radius: 12px;
  background:
    rgba(245, 158, 11, 0.09);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  text-align: left;
}

.taskReturnNotice strong {
  font-size: 13px;
  color: #b45309;
}

.taskReturnNotice span {
  font-size: 13px;
  font-weight: 600;
}

.taskReturnNotice p {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.4;
  opacity: 0.82;
}

.taskReturnNotice em {
  margin-top: 4px;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  color: #b45309;
}

html[data-theme='dark'] .taskCardStatus-need-data {
  border-color:
    rgba(251, 191, 36, 0.34);
}

html[data-theme='dark'] .taskReturnNotice {
  border-color:
    rgba(251, 191, 36, 0.20);
  background:
    rgba(245, 158, 11, 0.10);
}

html[data-theme='dark'] .taskReturnNotice strong,
html[data-theme='dark'] .taskReturnNotice em {
  color: #fbbf24;
}
`;
}


/*
 * Final in-memory verification before any write.
 */

if (
  !service.includes(
    'PART_1N_RETURN_AUDIT_EVENTS'
  )
) {
  fail(
    'Не добавлены auditEvents в listTasks.'
  );
}

if (
  !types.includes(
    'entityId?: string;'
  )
) {
  fail(
    'Не добавлен AuditEvent.entityId.'
  );
}

if (
  !app.includes(
    'PART_1N_RETURN_INFO'
  ) ||
  !app.includes(
    'PART_1N_RETURN_NOTICE'
  ) ||
  !app.includes(
    'taskReturnNotice'
  )
) {
  fail(
    'Не собрана карточка возвращённой задачи.'
  );
}

if (
  !app.includes(
    'Нужно исправить'
  )
) {
  fail(
    'Не добавлен текст «Нужно исправить».'
  );
}


console.log('');

console.log(
  'Проверка Part 1N-A v3:'
);

console.log(
  '  Backend auditEvents: OK'
);

console.log(
  '  AuditEvent.entityId: OK'
);

console.log(
  '  renderTask найден без привязки к background upload: OK'
);

console.log(
  '  Причина возврата: OK'
);

console.log(
  '  Комментарий бухгалтера: OK'
);

console.log(
  '  Карточка «Нужно исправить»: OK'
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
    servicePath,
    appPath,
    typesPath,
    stylesPath,
  ]
) {

  fs.copyFileSync(
    file,
    file +
      '.before-part1n-a-v3-' +
      stamp
  );
}


write(
  servicePath,
  service
);

write(
  appPath,
  app
);

write(
  typesPath,
  types
);

write(
  stylesPath,
  styles
);


console.log('');

console.log(
  'Part 1N-A v3 применён.'
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
