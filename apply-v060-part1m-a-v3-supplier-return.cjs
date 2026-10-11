const fs = require('fs');
const path = require('path');

const root =
  __dirname;

const checkOnly =
  process.argv.includes(
    '--check'
  );


const purchasesPath =
  path.join(
    root,
    'frontend',
    'src',
    'PurchasesBlock.tsx'
  );

const apiPath =
  path.join(
    root,
    'frontend',
    'src',
    'api.ts'
  );

const componentPath =
  path.join(
    root,
    'frontend',
    'src',
    'ReturnToManagerPanel.tsx'
  );

const componentSourcePath =
  path.join(
    root,
    'ReturnToManagerPanel.part1m-a.tmp'
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


let purchases =
  read(
    purchasesPath
  );

const api =
  read(
    apiPath
  );

const componentSource =
  read(
    componentSourcePath
  );


if (
  !api.includes(
    'export async function returnTaskToManager('
  )
) {

  fail(
    'Part 1L v4 не найден: в api.ts нет returnTaskToManager().'
  );
}


if (
  !purchases.includes(
    'export function SupplierPaymentTask('
  )
) {

  fail(
    'Не найден SupplierPaymentTask в PurchasesBlock.tsx.'
  );
}


/*
 * 1. Import reusable panel.
 */

if (
  !purchases.includes(
    "from './ReturnToManagerPanel'"
  )
) {

  const importEnd =
    findImportBlockEnd(
      purchases
    );


  if (
    importEnd < 0
  ) {

    fail(
      'Не удалось определить конец блока import в PurchasesBlock.tsx.'
    );
  }


  const importText =
    `

import {
  ReturnToManagerPanel,
} from './ReturnToManagerPanel';`;


  purchases =
    purchases.slice(
      0,
      importEnd
    ) +
    importText +
    purchases.slice(
      importEnd
    );
}


/*
 * 2. Insert return panel inside SupplierPaymentTask.
 */

if (
  !purchases.includes(
    'PART_1M_A_SUPPLIER_RETURN'
  )
) {

  const functionStart =
    purchases.indexOf(
      'export function SupplierPaymentTask('
    );


  const searchTail =
    purchases.slice(
      functionStart
    );


  const actionRegex =
    /\{[\s\n]*status\s*===\s*['"]NEW['"]\s*&&\s*\(/;


  const actionMatch =
    searchTail.match(
      actionRegex
    );


  if (
    !actionMatch ||
    actionMatch.index === undefined
  ) {

    fail(
      'В SupplierPaymentTask не найден блок status === NEW.'
    );
  }


  const insertAt =
    functionStart +
    actionMatch.index;


  const panel =
    `      {/* PART_1M_A_SUPPLIER_RETURN */}

      {(
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


  purchases =
    purchases.slice(
      0,
      insertAt
    ) +
    panel +
    purchases.slice(
      insertAt
    );
}


console.log('');

console.log(
  'Проверка Part 1M-A v3:'
);

console.log(
  '  Part 1L returnTaskToManager(): OK'
);

console.log(
  '  SupplierPaymentTask: OK'
);

console.log(
  '  Import ReturnToManagerPanel: OK'
);

console.log(
  '  Возврат для NEW / IN_PROGRESS: OK'
);

console.log(
  '  Данные оплаты не очищаются'
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
  purchasesPath,
  purchasesPath +
    '.before-part1m-a-v3-' +
    stamp
);


write(
  purchasesPath,
  purchases
);

write(
  componentPath,
  componentSource
);


console.log('');

console.log(
  'Part 1M-A v3 применён.'
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
