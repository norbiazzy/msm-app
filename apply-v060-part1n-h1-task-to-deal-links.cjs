const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

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
    end:
      closeBrace + 1,
    text:
      text.slice(
        start,
        closeBrace + 1
      ),
  };
}


let app =
  read(appPath);

let styles =
  read(stylesPath);


/*
 * 1. Task cards:
 * make the ZK number clickable without replacing local renderTask logic.
 */

if (
  !app.includes(
    'PART_1N_H1_TASK_DEAL_LINK'
  )
) {
  const tasksView =
    findFunctionRange(
      app,
      'TasksView'
    );

  if (!tasksView) {
    fail(
      'Не найден TasksView().'
    );
  }


  let viewText =
    tasksView.text;


  const taskClientRegex =
    /<span\s+className=["']taskClient["']>\s*\{task\.deal\.clientName\}\s*\{\s*['"`]\s*·\s*['"`]\s*\}\s*ЗК-\s*\{task\.deal\.internalNumber\}\s*<\/span>/m;


  const match =
    viewText.match(
      taskClientRegex
    );


  if (!match) {
    fail(
      'Не найден блок taskClient с ЗК в карточке задачи.'
    );
  }


  const replacement =
    `<span className="taskClient">
            <span>
              {task.deal.clientName}
            </span>

            {' · '}

            {/* PART_1N_H1_TASK_DEAL_LINK */}
            <a
              className="taskDealNumberLink"
              href={
                '#deal/' +
                encodeURIComponent(
                  task.deal.id
                )
              }
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              ЗК-
              {task.deal.internalNumber}
            </a>
          </span>`;


  viewText =
    viewText.replace(
      taskClientRegex,
      replacement
    );


  app =
    app.slice(
      0,
      tasksView.start
    ) +
    viewText +
    app.slice(
      tasksView.end
    );
}


/*
 * 2. Open TaskDetail:
 * add a compact direct deal link at the top.
 */

if (
  !app.includes(
    'PART_1N_H1_TASK_DETAIL_DEAL_LINK'
  )
) {
  const taskDetail =
    findFunctionRange(
      app,
      'TaskDetail'
    );

  if (!taskDetail) {
    fail(
      'Не найден TaskDetail().'
    );
  }


  const sectionMatch =
    /<section\b[^>]*>/
      .exec(
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


  const detailLink =
    `

      {/* PART_1N_H1_TASK_DETAIL_DEAL_LINK */}

      <a
        className="taskDetailDealLink"
        href={
          '#deal/' +
          encodeURIComponent(
            task.deal.id
          )
        }
      >
        <strong>
          ЗК-
          {task.deal.internalNumber}
        </strong>

        <span>
          {task.deal.clientName}
        </span>

        <b>
          Открыть сделку →
        </b>
      </a>
`;


  app =
    app.slice(
      0,
      insertAt
    ) +
    detailLink +
    app.slice(
      insertAt
    );
}


/*
 * 3. Styles.
 */

const cssMarker =
  'MSM task-to-deal links v0.6.0 part 1N-H1';


if (
  !styles.includes(
    cssMarker
  )
) {
  styles =
    styles.trimEnd() +
    `

/* ${cssMarker} */

.taskDealNumberLink {
  position: relative;
  z-index: 2;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.taskDetailDealLink {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(120, 120, 120, 0.16);
  border-radius: 12px;
  text-decoration: none;
}

.taskDetailDealLink strong {
  white-space: nowrap;
}

.taskDetailDealLink span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.72;
}

.taskDetailDealLink b {
  white-space: nowrap;
  font-size: 12px;
}

@media (max-width: 520px) {
  .taskDetailDealLink {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .taskDetailDealLink b {
    grid-column: 1 / -1;
  }
}
`;
}


/*
 * Verification.
 */

if (
  !app.includes(
    'PART_1N_H1_TASK_DEAL_LINK'
  ) ||
  !app.includes(
    'taskDealNumberLink'
  )
) {
  fail(
    'Ссылка ЗК в карточке задачи не добавлена.'
  );
}


if (
  !app.includes(
    'PART_1N_H1_TASK_DETAIL_DEAL_LINK'
  ) ||
  !app.includes(
    'taskDetailDealLink'
  )
) {
  fail(
    'Ссылка на сделку в TaskDetail не добавлена.'
  );
}


console.log('');
console.log(
  'Проверка Part 1N-H1:'
);
console.log(
  '  Карточка задачи: ЗК -> сделка: OK'
);
console.log(
  '  Открытая задача: ссылка на сделку: OK'
);
console.log(
  '  Клиент рядом с ЗК сохранён: OK'
);
console.log(
  '  Backend не меняется'
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
    appPath,
    stylesPath,
  ]
) {
  fs.copyFileSync(
    file,
    file +
      '.before-part1n-h1-' +
      stamp
  );
}


write(
  appPath,
  app
);

write(
  stylesPath,
  styles
);


console.log('');
console.log(
  'Part 1N-H1 применён.'
);
console.log('');
console.log(
  'Дальше:'
);
console.log(
  '  git diff --check'
);
console.log(
  '  cd frontend'
);
console.log(
  '  npm run build'
);
