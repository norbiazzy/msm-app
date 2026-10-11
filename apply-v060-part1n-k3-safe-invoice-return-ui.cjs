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
    'Не найден frontend/src/App.tsx.'
  );
}


let app =
  fs.readFileSync(
    appPath,
    'utf8'
  );


/*
 * Safety prerequisite:
 * new shared invoice return must already exist.
 */
if (
  !app.includes(
    'mode="invoice"'
  )
) {
  fail(
    'Не найден новый ReturnToManagerPanel mode="invoice".'
  );
}


/*
 * 1. Disable old buttons without deleting JSX.
 * Add hidden to buttons that:
 * - contain label "Отказать / вернуть"
 * - call setReturnModalOpen(...)
 */

let hiddenButtons = 0;
let searchFrom = 0;


while (true) {

  const labelIndex =
    app.indexOf(
      'Отказать / вернуть',
      searchFrom
    );


  if (labelIndex < 0) {
    break;
  }


  const buttonStart =
    app.lastIndexOf(
      '<button',
      labelIndex
    );


  const buttonEnd =
    app.indexOf(
      '>',
      buttonStart
    );


  const closingButton =
    app.indexOf(
      '</button>',
      labelIndex
    );


  if (
    buttonStart < 0 ||
    buttonEnd < 0 ||
    closingButton < 0
  ) {
    searchFrom =
      labelIndex + 1;
    continue;
  }


  const wholeButton =
    app.slice(
      buttonStart,
      closingButton +
        '</button>'.length
    );


  if (
    wholeButton.includes(
      'setReturnModalOpen'
    )
  ) {

    const openingTag =
      app.slice(
        buttonStart,
        buttonEnd + 1
      );


    if (
      !/\bhidden\b/.test(
        openingTag
      )
    ) {

      app =
        app.slice(
          0,
          buttonEnd
        ) +
        '\n              hidden' +
        app.slice(
          buttonEnd
        );

      hiddenButtons++;

      searchFrom =
        buttonEnd +
        '\n              hidden'.length +
        1;

      continue;
    }
  }


  searchFrom =
    labelIndex +
    'Отказать / вернуть'.length;
}


/*
 * 2. Disable old invoice modal condition without removing JSX.
 *
 * We only modify a returnModalOpen occurrence that is close to:
 * - ISSUE_CLIENT_INVOICE
 * - invoiceReturnModal
 */

let modalDisabled = false;


if (
  app.includes(
    'invoiceReturnModal'
  )
) {

  let modalIndex =
    app.indexOf(
      'invoiceReturnModal'
    );


  while (
    modalIndex >= 0
  ) {

    const start =
      Math.max(
        0,
        modalIndex - 1800
      );


    const chunk =
      app.slice(
        start,
        modalIndex
      );


    const conditionIndex =
      chunk.lastIndexOf(
        'returnModalOpen'
      );


    if (
      conditionIndex >= 0 &&
      chunk.includes(
        'ISSUE_CLIENT_INVOICE'
      )
    ) {

      const absoluteIndex =
        start +
        conditionIndex;


      const before =
        app.slice(
          Math.max(
            0,
            absoluteIndex - 40
          ),
          absoluteIndex
        );


      if (
        !before.includes(
          'false &&'
        )
      ) {

        app =
          app.slice(
            0,
            absoluteIndex
          ) +
          'false &&\n        ' +
          app.slice(
            absoluteIndex
          );

        modalDisabled = true;

      } else {

        modalDisabled = true;
      }


      break;
    }


    modalIndex =
      app.indexOf(
        'invoiceReturnModal',
        modalIndex + 1
      );
  }
}


/*
 * Verification:
 * all legacy invoice buttons that still call setReturnModalOpen
 * must be hidden.
 */

let unsafeButton = false;
searchFrom = 0;


while (true) {

  const labelIndex =
    app.indexOf(
      'Отказать / вернуть',
      searchFrom
    );


  if (labelIndex < 0) {
    break;
  }


  const buttonStart =
    app.lastIndexOf(
      '<button',
      labelIndex
    );


  const buttonEnd =
    app.indexOf(
      '>',
      buttonStart
    );


  const closingButton =
    app.indexOf(
      '</button>',
      labelIndex
    );


  if (
    buttonStart >= 0 &&
    buttonEnd >= 0 &&
    closingButton >= 0
  ) {

    const openingTag =
      app.slice(
        buttonStart,
        buttonEnd + 1
      );


    const wholeButton =
      app.slice(
        buttonStart,
        closingButton +
          '</button>'.length
      );


    if (
      wholeButton.includes(
        'setReturnModalOpen'
      ) &&
      !/\bhidden\b/.test(
        openingTag
      )
    ) {
      unsafeButton = true;
      break;
    }
  }


  searchFrom =
    labelIndex + 1;
}


if (unsafeButton) {
  fail(
    'Осталась активная старая кнопка возврата счёта.'
  );
}


/*
 * Modal verification:
 * if old modal exists, its nearest returnModalOpen must be guarded by false.
 */

if (
  app.includes(
    'invoiceReturnModal'
  ) &&
  !app.includes(
    'false &&\n        returnModalOpen'
  )
) {
  fail(
    'Старое invoiceReturnModal осталось активным.'
  );
}


console.log('');
console.log(
  'Проверка Part 1N-K3:'
);

console.log(
  '  Новый ReturnToManagerPanel mode="invoice": OK'
);

console.log(
  `  Старых кнопок счёта скрыто: ${hiddenButtons}`
);

console.log(
  '  Старое invoiceReturnModal отключено без удаления JSX: OK'
);

console.log(
  '  Структура JSX не вырезается: OK'
);

console.log(
  '  PurchasesBlock / Доверенность / ЭТРН не изменяются'
);

console.log(
  '  Backend / Prisma не изменяются'
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
    '.before-part1n-k3-' +
    stamp
);


fs.writeFileSync(
  appPath,
  app,
  'utf8'
);


console.log('');
console.log(
  'Part 1N-K3 применён.'
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
console.log(
  '  cd ..'
);
console.log(
  '  node .\\audit-v060-part1n-k3-return-flows.cjs'
);
