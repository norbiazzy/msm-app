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

const controllerPath = path.join(
  root,
  'backend',
  'src',
  'tasks',
  'tasks.controller.ts'
);

const appPath = path.join(
  root,
  'frontend',
  'src',
  'App.tsx'
);

const apiPath = path.join(
  root,
  'frontend',
  'src',
  'api.ts'
);

const backgroundPath = path.join(
  root,
  'frontend',
  'src',
  'backgroundUploads.tsx'
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


function ensurePrismaImport(text) {

  if (
    /\bPrisma\b/.test(
      text.match(
        /import\s*\{[\s\S]*?\}\s*from\s*['"]@prisma\/client['"]\s*;/
      )?.[0] || ''
    )
  ) {
    return text;
  }


  const regex =
    /import\s*\{([\s\S]*?)\}\s*from\s*['"]@prisma\/client['"]\s*;/;


  const match =
    text.match(regex);


  if (!match) {
    fail(
      'Не найден import из @prisma/client.'
    );
  }


  let inner =
    match[1]
      .trim();


  if (
    inner &&
    !inner.endsWith(',')
  ) {
    inner += ',';
  }


  const replacement =
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
} from '@prisma/client';`;


  return text.replace(
    regex,
    replacement
  );
}


let service =
  read(servicePath);

let controller =
  read(controllerPath);

let app =
  read(appPath);

let api =
  read(apiPath);

let background =
  read(backgroundPath);


/*
 * 1. Backend:
 * Use Prisma.InputJsonValue and do not reassign nullable task.details.
 * If body.details is undefined Prisma simply leaves the field unchanged.
 */

if (
  !service.includes(
    'async resubmitToAccounting('
  )
) {
  fail(
    'Не найден resubmitToAccounting().'
  );
}


service =
  ensurePrismaImport(
    service
  );


service =
  service.replace(
    /details\?\s*:\s*Record<string,\s*unknown>\s*;/g,
    'details?: Prisma.InputJsonValue;'
  );


const detailsUpdateRegex =
  /details:\s*body\.details\s*!==\s*undefined\s*\?\s*body\.details\s*:\s*task\.details\s*,/g;


if (
  detailsUpdateRegex.test(
    service
  )
) {

  service =
    service.replace(
      detailsUpdateRegex,
      `details:
                    body.details,`
    );

} else if (
  !/details:\s*body\.details\s*,/.test(
    service
  )
) {

  fail(
    'В resubmitToAccounting не найден блок обновления details.'
  );
}


/*
 * 2. Controller:
 * Match service payload type.
 */

controller =
  ensurePrismaImport(
    controller
  );


controller =
  controller.replace(
    /details\?\s*:\s*Record<string,\s*unknown>\s*;/g,
    'details?: Prisma.InputJsonValue;'
  );


/*
 * 3. Frontend:
 * Every ManagerResubmitPanel for a task must receive dealId and taskType.
 */

const panelRegex =
  /<ManagerResubmitPanel\b[\s\S]*?\/>/g;


const panels =
  app.match(
    panelRegex
  ) || [];


if (
  panels.length === 0
) {
  fail(
    'В App.tsx не найден ManagerResubmitPanel.'
  );
}


let patchedPanels = 0;


app =
  app.replace(
    panelRegex,
    (panel) => {

      if (
        !panel.includes(
          'taskId={task.id}'
        )
      ) {
        return panel;
      }


      let next =
        panel;


      if (
        !next.includes(
          'dealId={task.deal.id}'
        )
      ) {

        next =
          next.replace(
            'taskId={task.id}',
            `taskId={task.id}
          dealId={task.deal.id}`
          );

        patchedPanels++;
      }


      if (
        !next.includes(
          'taskType={task.type}'
        )
      ) {

        next =
          next.replace(
            'dealId={task.deal.id}',
            `dealId={task.deal.id}
          taskType={task.type}`
          );

        patchedPanels++;
      }


      return next;
    }
  );


const remainingBadPanels =
  (
    app.match(
      panelRegex
    ) || []
  ).filter(
    (panel) =>
      panel.includes(
        'taskId={task.id}'
      ) &&
      (
        !panel.includes(
          'dealId={task.deal.id}'
        ) ||
        !panel.includes(
          'taskType={task.type}'
        )
      )
  );


if (
  remainingBadPanels.length > 0
) {
  fail(
    'Не удалось добавить dealId/taskType во все ManagerResubmitPanel.'
  );
}


/*
 * 4. Clean the exact git diff --check warnings already reported.
 */

api =
  api
    .replace(
      /[ \t]+\n/g,
      '\n'
    )
    .replace(
      /\n+$/,
      '\n'
    );


background =
  background
    .replace(
      /[ \t]+\n/g,
      '\n'
    )
    .replace(
      /\n+$/,
      '\n'
    );


/*
 * Verification.
 */

if (
  !service.includes(
    'details?: Prisma.InputJsonValue;'
  )
) {
  fail(
    'Backend details type не исправлен.'
  );
}


if (
  !/details:\s*body\.details\s*,/.test(
    service
  )
) {
  fail(
    'Backend details update не исправлен.'
  );
}


if (
  service.includes(
    '? body.details' +
    '\n' +
    '                      : task.details'
  )
) {
  fail(
    'В backend остался старый nullable details update.'
  );
}


if (
  !controller.includes(
    'details?: Prisma.InputJsonValue;'
  )
) {
  fail(
    'Controller details type не исправлен.'
  );
}


console.log('');
console.log(
  'Проверка Part 1N-E1 hotfix 1:'
);
console.log(
  '  Prisma JSON nullable update: OK'
);
console.log(
  '  Service details = body.details | undefined: OK'
);
console.log(
  '  Controller Prisma.InputJsonValue: OK'
);
console.log(
  '  Все ManagerResubmitPanel имеют dealId: OK'
);
console.log(
  '  Все ManagerResubmitPanel имеют taskType: OK'
);
console.log(
  '  api.ts blank EOF cleanup: OK'
);
console.log(
  '  backgroundUploads trailing spaces cleanup: OK'
);
console.log(
  '  Новая Prisma migration НЕ нужна'
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
    appPath,
    apiPath,
    backgroundPath,
  ]
) {

  fs.copyFileSync(
    file,
    file +
      '.before-part1n-e1-hotfix1-' +
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
  appPath,
  app
);

write(
  apiPath,
  api
);

write(
  backgroundPath,
  background
);


console.log('');
console.log(
  'Part 1N-E1 hotfix 1 применён.'
);
console.log('');
console.log(
  'Миграцию повторно запускать не нужно.'
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
