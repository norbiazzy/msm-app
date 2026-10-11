const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(rel) {
  const f =
    path.join(root, rel);

  return fs.existsSync(f)
    ? fs
        .readFileSync(
          f,
          'utf8'
        )
        .replace(/\r\n/g, '\n')
    : '';
}

const app =
  read('frontend/src/App.tsx');

const uploads =
  read(
    'frontend/src/backgroundUploads.tsx'
  );

const css =
  read('frontend/src/styles.css');

const tasksStart =
  app.indexOf(
    'function TasksView('
  );

const renderStart =
  app.indexOf(
    '  function renderTask(',
    tasksStart
  );

const renderEnd =
  app.indexOf(
    '\n  function renderGroup(',
    renderStart
  );

const render =
  app.slice(
    renderStart,
    renderEnd
  );

const checks = [
  [
    app.includes(
      'PART_V064_O23_TASK_UPLOAD_PROGRESS'
    ),
    'патч установлен'
  ],
  [
    uploads.includes(
      "scope?: 'TASK' | 'DEAL';"
    ),
    'upload origin хранится'
  ],
  [
    render.includes(
      'const taskUploadJob ='
    ),
    'task upload job'
  ],
  [
    render.includes(
      "job.scope === 'TASK'"
    ),
    'только upload из задачи'
  ],
  [
    render.includes(
      'taskUploadProgressCard'
    ),
    'progress на самой задаче'
  ],
  [
    !render.includes(
      'isBackgroundUploading'
    ),
    'карточка не исчезает во время upload'
  ],
  [
    css.includes(
      '.taskUploadProgressCard'
    ),
    'CSS'
  ],
];

console.log('');
console.log(
  'MSM — аудит v064-O2.3'
);
console.log(
  '======================'
);

let bad = false;

for (
  const [ok, label]
  of checks
) {
  console.log(
    (ok ? 'OK   ' : 'FAIL ') +
    label
  );

  if (!ok) {
    bad = true;
  }
}

console.log('');

if (bad) {
  console.log(
    'ИТОГ: есть ошибки.'
  );
  process.exit(1);
}

console.log(
  'ИТОГ: OK — upload из задачи показывается на этой задаче в списке.'
);
