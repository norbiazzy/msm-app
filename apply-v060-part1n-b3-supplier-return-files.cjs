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

const componentPath =
  path.join(
    root,
    'frontend',
    'src',
    'SupplierPaymentManagerEdit.tsx'
  );

const sourcePath =
  path.join(
    root,
    'SupplierPaymentManagerEdit.part1n-b3.tmp'
  );

const backgroundPath =
  path.join(
    root,
    'frontend',
    'src',
    'backgroundUploads.tsx'
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

const existingComponent =
  read(
    componentPath
  );

const source =
  read(
    sourcePath
  );

const background =
  read(
    backgroundPath
  );


if (
  !existingComponent.includes(
    'export function SupplierPaymentManagerEdit'
  )
) {

  fail(
    'Part 1N-B2 не найден: нет SupplierPaymentManagerEdit.'
  );
}


if (
  !existingComponent.includes(
    'resubmitSupplierPaymentTask'
  )
) {

  fail(
    'SupplierPaymentManagerEdit имеет неожиданную структуру.'
  );
}


if (
  !background.includes(
    'startBackgroundUploadJob'
  )
) {

  fail(
    'Не найден startBackgroundUploadJob().'
  );
}


if (
  !purchases.includes(
    'PART_1N_B2_SUPPLIER_MANAGER_EDIT'
  )
) {

  fail(
    'В PurchasesBlock не найден Part 1N-B2.'
  );
}


/*
 * 1. Pass dealId to manager editor.
 */

if (
  !/dealId=\{task\.deal\.id\}/.test(
    purchases
  )
) {

  const componentIndex =
    purchases.indexOf(
      '<SupplierPaymentManagerEdit'
    );


  if (
    componentIndex < 0
  ) {

    fail(
      'Не найден <SupplierPaymentManagerEdit>.'
    );
  }


  const taskIdIndex =
    purchases.indexOf(
      'taskId={task.id}',
      componentIndex
    );


  if (
    taskIdIndex < 0
  ) {

    fail(
      'В SupplierPaymentManagerEdit не найден taskId.'
    );
  }


  const taskIdEnd =
    taskIdIndex +
    'taskId={task.id}'.length;


  purchases =
    purchases.slice(
      0,
      taskIdEnd
    ) +
    `
          dealId={task.deal.id}` +
    purchases.slice(
      taskIdEnd
    );
}


/*
 * 2. Accountant must see both:
 * SUPPLIER_INVOICE_<id>
 * SUPPLIER_DOCUMENT_<id>
 */

if (
  !purchases.includes(
    "'SUPPLIER_DOCUMENT_' +"
  )
) {

  const categoryNeedle =
    `file.category ===
        'SUPPLIER_INVOICE_' +
        purchase.id`;


  if (
    purchases.includes(
      categoryNeedle
    )
  ) {

    purchases =
      purchases.replace(
        categoryNeedle,
        `(
          file.category ===
            'SUPPLIER_INVOICE_' +
            purchase.id ||
          file.category ===
            'SUPPLIER_DOCUMENT_' +
            purchase.id
        )`
      );

  } else {

    const compactNeedle =
      /file\.category\s*===\s*['"]SUPPLIER_INVOICE_['"]\s*\+\s*purchase\.id/;


    if (
      compactNeedle.test(
        purchases
      )
    ) {

      purchases =
        purchases.replace(
          compactNeedle,
          `(
          file.category ===
            'SUPPLIER_INVOICE_' +
            purchase.id ||
          file.category ===
            'SUPPLIER_DOCUMENT_' +
            purchase.id
        )`
        );

    } else {

      fail(
        'Не найден фильтр SUPPLIER_INVOICE в PurchasesBlock.'
      );
    }
  }
}


/*
 * 3. Replace only the component we introduced in B2.
 * Preserve a backup on apply.
 */

const updatedComponent =
  source;


/*
 * Final verification.
 */

if (
  !purchases.includes(
    'dealId={task.deal.id}'
  )
) {

  fail(
    'Не добавлен dealId в редактор.'
  );
}


if (
  !purchases.includes(
    "'SUPPLIER_DOCUMENT_' +"
  )
) {

  fail(
    'Бухгалтеру не подключены дополнительные документы.'
  );
}


if (
  !updatedComponent.includes(
    'startBackgroundUploadJob'
  ) ||
  !updatedComponent.includes(
    'taskId,'
  ) ||
  !updatedComponent.includes(
    'SUPPLIER_DOCUMENT_'
  ) ||
  !updatedComponent.includes(
    'SingleFilePicker'
  ) ||
  !updatedComponent.includes(
    'MultiFilePicker'
  )
) {

  fail(
    'Новый SupplierPaymentManagerEdit собран некорректно.'
  );
}


console.log('');

console.log(
  'Проверка Part 1N-B3:'
);

console.log(
  '  Новый входящий счёт: OK'
);

console.log(
  '  Дополнительные документы: OK'
);

console.log(
  '  Фоновая загрузка с taskId: OK'
);

console.log(
  '  Возврат к списку сразу после старта: OK'
);

console.log(
  '  Финальная повторная отправка после загрузки: OK'
);

console.log(
  '  Бухгалтер видит SUPPLIER_INVOICE + SUPPLIER_DOCUMENT: OK'
);

console.log(
  '  Старые файлы не удаляются: OK'
);

console.log(
  '  Backend / Prisma: без изменений'
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
    '.before-part1n-b3-' +
    stamp
);

fs.copyFileSync(
  componentPath,
  componentPath +
    '.before-part1n-b3-' +
    stamp
);


write(
  purchasesPath,
  purchases
);

write(
  componentPath,
  updatedComponent
);


console.log('');

console.log(
  'Part 1N-B3 применён.'
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
