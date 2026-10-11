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

  const functionMarker =
    '\n\nfunction money(';


  const insertAt =
    purchases.indexOf(
      functionMarker
    );


  if (
    insertAt < 0
  ) {

    fail(
      'Не найден function money() — место для import.'
    );
  }


  const importText =
    `

import {
  ReturnToManagerPanel,
} from './ReturnToManagerPanel';
`;


  purchases =
    purchases.slice(
      0,
      insertAt
    ) +
    importText +
    purchases.slice(
      insertAt
    );
}


/*
 * 2. Insert return panel only inside SupplierPaymentTask.
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


  const nextSection =
    purchases.indexOf(
      '// ======================================================',
      functionStart + 40
    );


  const functionEnd =
    nextSection >= 0
      ? nextSection
      : purchases.length;


  const functionText =
    purchases.slice(
      functionStart,
      functionEnd
    );


  const actionMarker =
    `      {status === 'NEW' && (`;


  const localIndex =
    functionText.indexOf(
      actionMarker
    );


  if (
    localIndex < 0
  ) {

    fail(
      'В SupplierPaymentTask не найден блок status === NEW.'
    );
  }


  const insertAt =
    functionStart +
    localIndex;


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
  'Проверка Part 1M-A:'
);

console.log(
  '  Part 1L returnTaskToManager(): OK'
);

console.log(
  '  SupplierPaymentTask: OK'
);

console.log(
  '  ReturnToManagerPanel: OK'
);

console.log(
  '  Возврат доступен для NEW и IN_PROGRESS'
);

console.log(
  '  Существующие данные оплаты не изменяются'
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
    '.before-part1m-a-' +
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
  'Part 1M-A применён.'
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
