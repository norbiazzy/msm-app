const fs = require('fs');
const path = require('path');

const root = __dirname;
const checkOnly =
  process.argv.includes('--check');

const srcDir =
  path.join(
    root,
    'frontend',
    'src'
  );

const appPath =
  path.join(
    srcDir,
    'App.tsx'
  );


function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' +
      message
  );
  process.exit(1);
}


if (!fs.existsSync(srcDir)) {
  fail(
    'Не найдена папка frontend/src.'
  );
}


if (!fs.existsSync(appPath)) {
  fail(
    'Не найден frontend/src/App.tsx.'
  );
}


const backups =
  fs.readdirSync(srcDir)
    .filter(
      (name) =>
        name.startsWith(
          'App.tsx.before-part1n-k2-v3-'
        )
    )
    .map(
      (name) => ({
        name,
        fullPath:
          path.join(
            srcDir,
            name
          ),
        mtime:
          fs.statSync(
            path.join(
              srcDir,
              name
            )
          ).mtimeMs,
      })
    )
    .sort(
      (a, b) =>
        b.mtime -
        a.mtime
    );


if (backups.length === 0) {
  fail(
    'Не найден backup App.tsx.before-part1n-k2-v3-*.'
  );
}


const backup =
  backups[0];


const backupText =
  fs.readFileSync(
    backup.fullPath,
    'utf8'
  );


const currentText =
  fs.readFileSync(
    appPath,
    'utf8'
  );


if (
  !backupText.includes(
    'function TaskDetail'
  ) ||
  !backupText.includes(
    'function DealDetail'
  )
) {
  fail(
    'Backup App.tsx выглядит неполным.'
  );
}


console.log('');
console.log(
  'Проверка rollback hotfix:'
);

console.log(
  '  Найден backup: ' +
    backup.name
);

console.log(
  '  App.tsx будет восстановлен только из backup перед K2 v3'
);

console.log(
  '  PurchasesBlock.tsx НЕ откатывается'
);

console.log(
  '  Backend НЕ меняется'
);

console.log(
  '  Prisma migration не нужна'
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


const brokenBackup =
  appPath +
    '.broken-after-k2-v3-' +
    stamp;


fs.copyFileSync(
  appPath,
  brokenBackup
);


fs.writeFileSync(
  appPath,
  backupText,
  'utf8'
);


console.log('');
console.log(
  'App.tsx восстановлен.'
);

console.log(
  'Копия сломанного файла сохранена:'
);

console.log(
  '  ' +
    path.basename(
      brokenBackup
    )
);

console.log('');
console.log(
  'Дальше:'
);

console.log(
  '  cd frontend'
);

console.log(
  '  npm run build'
);
