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


function fail(message) {
  console.error('');
  console.error(
    'ОШИБКА: ' +
      message
  );
  process.exit(1);
}


if (!fs.existsSync(appPath)) {
  fail(
    'Не найден frontend/src/App.tsx'
  );
}


let app =
  fs.readFileSync(
    appPath,
    'utf8'
  );


const marker =
  '// PART_1N_J1_TS_INVOICE_NEED_DATA';

const markerIndex =
  app.indexOf(marker);


if (markerIndex < 0) {
  fail(
    'Не найден helper invoiceRequestNeedsData из предыдущего hotfix.'
  );
}


const helperRegex =
  /const\s+invoiceRequestNeedsData(?:\s*:\s*boolean)?\s*=\s*Boolean\(\s*invoiceRequestTask\s*&&\s*(?:invoiceRequestNeedsData|invoiceRequestTask(?:\?\.|\.)status\s*===\s*['"]NEED_DATA['"])\s*\)\s*;/m;


if (
  !helperRegex.test(
    app
  )
) {
  fail(
    'Не удалось распознать текущий helper invoiceRequestNeedsData.'
  );
}


app =
  app.replace(
    helperRegex,
    `const invoiceRequestNeedsData: boolean =
    Boolean(
      invoiceRequestTask &&
      invoiceRequestTask.status ===
        'NEED_DATA'
    );`
  );


const helperStart =
  app.indexOf(
    'const invoiceRequestNeedsData'
  );

const helperEnd =
  app.indexOf(
    ';',
    helperStart
  );


if (
  helperStart < 0 ||
  helperEnd < 0
) {
  fail(
    'После исправления helper не найден.'
  );
}


const helperText =
  app.slice(
    helperStart,
    helperEnd + 1
  );


if (
  /invoiceRequestTask\s*&&\s*invoiceRequestNeedsData/.test(
    helperText
  )
) {
  fail(
    'Helper всё ещё ссылается сам на себя.'
  );
}


if (
  !/invoiceRequestTask\.status\s*===\s*['"]NEED_DATA['"]/.test(
    helperText
  )
) {
  fail(
    'В helper нет проверки task.status.'
  );
}


console.log('');
console.log(
  'Проверка TS hotfix v3:'
);
console.log(
  '  Самоссылка invoiceRequestNeedsData убрана: OK'
);
console.log(
  '  Явный тип boolean добавлен: OK'
);
console.log(
  '  Проверка invoiceRequestTask.status восстановлена: OK'
);
console.log(
  '  Повторный запуск поддерживается: OK'
);
console.log(
  '  Backend не меняется'
);


if (checkOnly) {
  console.log('');
  console.log(
    'CHECK ONLY — файл не изменён.'
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
    '.before-part1n-j1-ts-hotfix-v3-' +
    stamp
);


fs.writeFileSync(
  appPath,
  app,
  'utf8'
);


console.log('');
console.log(
  'TS hotfix v3 применён.'
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
