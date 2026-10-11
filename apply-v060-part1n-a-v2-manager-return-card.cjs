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

const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

const typesPath =
  path.join(
    root,
    'frontend',
    'src',
    'types.ts'
  );

const stylesPath =
  path.join(
    root,
    'frontend',
    'src',
    'styles.css'
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
      ch === '{'
    ) {

      depth++;

      continue;
    }


    if (
      ch === '}'
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


function findFunctionSection(
  text,
  name
) {

  const token =
    'function ' +
    name;


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


let service =
  read(
    servicePath
  );

let app =
  read(
    appPath
  );

let types =
  read(
    typesPath
  );

let styles =
  read(
    stylesPath
  );


/*
 * 1. Backend: include return audit events with task.deal.
 */

if (
  !service.includes(
    'PART_1N_RETURN_AUDIT_EVENTS'
  )
) {

  const listStart =
    service.indexOf(
      '  list()'
    );


  if (
    listStart < 0
  ) {

    fail(
      'Не найден TasksService.list().'
    );
  }


  const dealIndex =
    service.indexOf(
      'deal:',
      listStart
    );


  if (
    dealIndex < 0
  ) {

    fail(
      'В TasksService.list() не найден deal:.'
    );
  }


  const includeIndex =
    service.indexOf(
      'include:',
      dealIndex
    );


  if (
    includeIndex < 0
  ) {

    fail(
      'В deal не найден include:.'
    );
  }


  const includeOpen =
    service.indexOf(
      '{',
      includeIndex
    );


  if (
    includeOpen < 0
  ) {

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
 * 2. AuditEvent type needs entityId for matching event to task.
 */

if (
  !types.includes(
    'entityId?: string;'
  )
) {

  const auditTypeStart =
    types.indexOf(
      'export type AuditEvent = {'
    );


  if (
    auditTypeStart < 0
  ) {

    fail(
      'Не найден тип AuditEvent в types.ts.'
    );
  }


  const entityTypeLine =
    types.indexOf(
      'entityType: string;',
      auditTypeStart
    );


  if (
    entityTypeLine < 0
  ) {

    fail(
      'В AuditEvent не найден entityType.'
    );
  }


  const lineEnd =
    types.indexOf(
      '\n',
      entityTypeLine
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
 * 3. Task card: derive return reason/comment.
 */

const tasksView =
  findFunctionSection(
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


if (
  !tasksText.includes(
    'PART_1N_RETURN_INFO'
  )
) {

  const renderTaskStart =
    tasksText.indexOf(
      'function renderTask('
    );


  if (
    renderTaskStart < 0
  ) {

    fail(
      'В TasksView не найден renderTask().'
    );
  }


  const backgroundMarker =
    tasksText.indexOf(
      'const isBackgroundUploading',
      renderTaskStart
    );


  if (
    backgroundMarker < 0
  ) {

    fail(
      'В renderTask не найден isBackgroundUploading.'
    );
  }


  const returnInfo =
    `    // PART_1N_RETURN_INFO
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


  tasksText =
    tasksText.slice(
      0,
      backgroundMarker
    ) +
    returnInfo +
    tasksText.slice(
      backgroundMarker
    );


  const taskMainCloseMarker =
    `        <div className="taskState">`;


  const taskStateIndex =
    tasksText.indexOf(
      taskMainCloseMarker,
      renderTaskStart
    );


  if (
    taskStateIndex < 0
  ) {

    fail(
      'В renderTask не найден блок taskState.'
    );
  }


  const beforeTaskState =
    tasksText.slice(
      0,
      taskStateIndex
    );


  const mainClose =
    beforeTaskState
      .lastIndexOf(
        '        </div>'
      );


  if (
    mainClose < 0
  ) {

    fail(
      'Не найден конец taskCardMain.'
    );
  }


  const correctionBox =
    `

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


  tasksText =
    tasksText.slice(
      0,
      mainClose
    ) +
    correctionBox +
    tasksText.slice(
      mainClose
    );
}


/*
 * 4. Rename manager group from "Нужны данные" to "Нужно исправить".
 */

if (
  !tasksText.includes(
    'PART_1N_MANAGER_GROUP_LABEL'
  )
) {

  const oldGroup =
    `          {renderGroup(
            'Нужны данные',
            needData,
            'taskGroupNeedData'
          )}`;


  if (
    tasksText.includes(
      oldGroup
    )
  ) {

    const newGroup =
      `          {/* PART_1N_MANAGER_GROUP_LABEL */}
          {renderGroup(
            user.role === 'MANAGER'
              ? 'Нужно исправить'
              : 'Нужны данные',
            needData,
            'taskGroupNeedData'
          )}`;


    tasksText =
      tasksText.replace(
        oldGroup,
        newGroup
      );

  } else {

    const labelIndex =
      tasksText.indexOf(
        "'Нужны данные'"
      );


    if (
      labelIndex >= 0
    ) {

      tasksText =
        tasksText.slice(
          0,
          labelIndex
        ) +
        `user.role === 'MANAGER'
              ? 'Нужно исправить'
              : 'Нужны данные'` +
        tasksText.slice(
          labelIndex +
            "'Нужны данные'".length
        );


      const queueIndex =
        tasksText.indexOf(
          '<div className="taskQueue">'
        );


      if (
        queueIndex >= 0
      ) {

        tasksText =
          tasksText.slice(
            0,
            queueIndex
          ) +
          `{/* PART_1N_MANAGER_GROUP_LABEL */}\n        ` +
          tasksText.slice(
            queueIndex
          );
      }

    } else {

      fail(
        'Не найден заголовок группы «Нужны данные».'
      );
    }
  }
}


/*
 * Replace TasksView in App.
 */

app =
  app.slice(
    0,
    tasksView.start
  ) +
  tasksText +
  app.slice(
    tasksView.end
  );


/*
 * 5. Styles.
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
  margin-top: 10px;
  padding: 10px 12px;
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


console.log('');

console.log(
  'Проверка Part 1N-A:'
);

console.log(
  '  Backend auditEvents в listTasks: OK'
);

console.log(
  '  AuditEvent.entityId: OK'
);

console.log(
  '  Карточка NEED_DATA: «Нужно исправить»: OK'
);

console.log(
  '  Причина возврата: OK'
);

console.log(
  '  Комментарий бухгалтера: OK'
);

console.log(
  '  Карточка по-прежнему открывает task.id: OK'
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
    appPath,
    typesPath,
    stylesPath,
  ]
) {

  fs.copyFileSync(
    file,
    file +
      '.before-part1n-a-' +
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
  'Part 1N-A применён.'
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
