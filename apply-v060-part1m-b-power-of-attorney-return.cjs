const fs = require('fs');
const path = require('path');

const root =
  __dirname;

const checkOnly =
  process.argv.includes(
    '--check'
  );


const appPath =
  path.join(
    root,
    'frontend',
    'src',
    'App.tsx'
  );

const panelPath =
  path.join(
    root,
    'frontend',
    'src',
    'ReturnToManagerPanel.tsx'
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


function findImportBlockEnd(
  text
) {

  let index = 0;
  let lastImportEnd = -1;


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


    lastImportEnd =
      semicolon + 1;


    index =
      semicolon + 1;
  }


  return lastImportEnd;
}


let app =
  read(
    appPath
  );

const panel =
  read(
    panelPath
  );


if (
  !panel.includes(
    'export function ReturnToManagerPanel'
  )
) {

  fail(
    'Part 1M-A не найден: нет ReturnToManagerPanel.tsx.'
  );
}


if (
  !app.includes(
    'function TaskDetail('
  )
) {

  fail(
    'Не найден function TaskDetail() в App.tsx.'
  );
}


/*
 * 1. Import panel into App.tsx.
 */

if (
  !app.includes(
    "from './ReturnToManagerPanel'"
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
      'Не удалось определить конец блока import в App.tsx.'
    );
  }


  const importText =
    `

import {
  ReturnToManagerPanel,
} from './ReturnToManagerPanel';`;


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
 * 2. Insert only inside TaskDetail.
 */

if (
  !app.includes(
    'PART_1M_B_POWER_OF_ATTORNEY_RETURN'
  )
) {

  const taskDetailStart =
    app.indexOf(
      'function TaskDetail('
    );


  const afterTaskDetail =
    app.slice(
      taskDetailStart + 20
    );


  const nextFunctionMatch =
    afterTaskDetail.match(
      /\nfunction\s+[A-Za-z0-9_]+\s*\(/
    );


  const taskDetailEnd =
    nextFunctionMatch &&
    nextFunctionMatch.index !== undefined

      ? taskDetailStart +
        20 +
        nextFunctionMatch.index

      : app.length;


  const taskDetailText =
    app.slice(
      taskDetailStart,
      taskDetailEnd
    );


  const newStatusRegex =
    /\{[\s\n]*status\s*===\s*['"]NEW['"]\s*&&/;


  const newStatusMatch =
    taskDetailText.match(
      newStatusRegex
    );


  if (
    !newStatusMatch ||
    newStatusMatch.index === undefined
  ) {

    fail(
      'В TaskDetail не найден блок status === NEW.'
    );
  }


  const insertAt =
    taskDetailStart +
    newStatusMatch.index;


  const returnBlock =
    `      {/* PART_1M_B_POWER_OF_ATTORNEY_RETURN */}

      {task.type === 'POWER_OF_ATTORNEY' &&
        (
          status === 'NEW' ||
          status === 'IN_PROGRESS'
        ) && (

        <ReturnToManagerPanel
          taskId={task.id}
          actorId={user.id}
          disabled={saving}
          onReturned={onBack}
        />

      )}


`;


  app =
    app.slice(
      0,
      insertAt
    ) +
    returnBlock +
    app.slice(
      insertAt
    );
}


console.log('');

console.log(
  'Проверка Part 1M-B:'
);

console.log(
  '  ReturnToManagerPanel: OK'
);

console.log(
  '  TaskDetail: OK'
);

console.log(
  '  POWER_OF_ATTORNEY: подключён'
);

console.log(
  '  Возврат доступен для NEW / IN_PROGRESS'
);

console.log(
  '  Остальные типы задач не изменяются'
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


fs.copyFileSync(
  appPath,
  appPath +
    '.before-part1m-b-' +
    stamp
);


write(
  appPath,
  app
);


console.log('');

console.log(
  'Part 1M-B применён.'
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
